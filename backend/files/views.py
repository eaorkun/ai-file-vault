import hashlib

import requests
import base64
import time
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.conf import settings
from .models import File
from .serializers import FileSerializer
from django.core.files.base import ContentFile

class FileViewSet(viewsets.ModelViewSet):
    queryset = File.objects.all()
    serializer_class = FileSerializer

    def get_queryset(self):
        queryset = File.objects.all()
        # Retrieve parameters from the URL: ?search=...&type=...
        search = self.request.query_params.get('search', None)
        file_type = self.request.query_params.get('type', None)

        if search:
            # Filter by filename (case-insensitive)
            queryset = queryset.filter(original_filename__icontains=search)

        if file_type:
            # Filter by file type (e.g., 'image', 'pdf')
            queryset = queryset.filter(file_type__icontains=file_type)

        return queryset

    # backend/files/views.py

    def create(self, request, *args, **kwargs):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Calculate Hash
        hasher = hashlib.sha256()
        for chunk in file_obj.chunks():
            hasher.update(chunk)
        file_hash = hasher.hexdigest()

        # Reset file pointer so it can be read again if we need to save it
        file_obj.seek(0)

        # 2. Check if file already exists (DEDUPLICATION LOGIC)
        existing_file = File.objects.filter(content_hash=file_hash).first()

        if existing_file:
            # Change status to 409 Conflict to signal a duplicate to the frontend
            return Response(
                {'error': 'This file has already been uploaded.'},
                status=status.HTTP_409_CONFLICT
            )

        # 3. New unique file: Prepare data for validation and save
        data = {
            'file': file_obj,
            'original_filename': file_obj.name,
            'file_type': file_obj.content_type,
            'size': file_obj.size,
            'content_hash': file_hash,
        }

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def edit(self, request, pk=None):
        file_instance = self.get_object()
        prompt = request.data.get('prompt')

        if not file_instance.file_type.startswith('image/'):
            return Response({'error': 'Only images can be edited'}, status=400)

        # Replace this with the specific model ID you want to use
        # e.g., "stabilityai/stable-diffusion-xl-refiner-1.0" or a Qwen-specific endpoint
        # 1. Use a high-quality Edit model
        MODEL_ID = "timbrooks/instruct-pix2pix"
        API_URL = f"https://api-inference.huggingface.co/models/{MODEL_ID}"
        headers = {"Authorization": f"Bearer {settings.HF_TOKEN}"}

        try:
            # Prepare image for Hugging Face
            file_instance.file.open('rb')
            image_data = file_instance.file.read()
            file_instance.file.close()

            # 2. Query function with Loading State handling
            # Inside your edit action in views.py

            def query_hf(data):
                for i in range(5):  # Retry loop
                    response = requests.post(API_URL, headers=headers, data=data)

                    # If successful, return the raw bytes immediately
                    if response.status_code == 200:
                        return response.content

                    # If not successful, try to safely parse the error
                    try:
                        result = response.json()
                        if "estimated_time" in result:
                            wait_time = min(result["estimated_time"], 10)
                            print(f"Model loading... waiting {wait_time}s")
                            time.sleep(wait_time)
                            continue
                        error_msg = result.get("error", "Unknown HF Error")
                    except requests.exceptions.JSONDecodeError:
                        # This is the fix for your specific error:
                        # If it's not JSON, capture the raw text or status code
                        error_msg = f"Non-JSON response (Status {response.status_code}): {response.text[:100]}"

                    raise Exception(error_msg)
                return None

            edited_image_bytes = query_hf(image_data)

            if not edited_image_bytes:
                return Response({'error': 'AI model failed to respond'}, status=503)

            # 3. Save as a New Version (Best Practice)
            new_hash = hashlib.sha256(edited_image_bytes).hexdigest()

            # Prevent duplicate edits from clogging storage
            if File.objects.filter(content_hash=new_hash).exists():
                return Response({'message': 'This edit already exists'}, status=200)

            new_file = ContentFile(edited_image_bytes)
            file_instance.file.save(f"ai_{file_instance.original_filename}", new_file)
            file_instance.content_hash = new_hash
            file_instance.save()

            return Response({'status': 'Success'})


        except Exception as e:
            import traceback
            print(traceback.format_exc())  # This prints the full error to Docker logs
            return Response({'error': str(e), 'details': traceback.format_exc()}, status=500)
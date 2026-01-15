import React, { useState } from 'react';
import { fileService } from '../services/fileService';
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface FileUploadProps {
  onUploadSuccess: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: fileService.uploadFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      setSelectedFile(null);
      setError(null); // Clear errors on success
      onUploadSuccess();
    },
    onError: (error: any) => {
      // Check if the backend returned a 409 Conflict
      if (error.response?.status === 409) {
        setError('Duplicate detected: This file has already been uploaded.');
      } else {
        setError('Failed to upload file. Please try again.');
      }
      console.error('Upload error:', error);
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setError(null); // This clears the "Duplicate detected" message immediately
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    try {
      setError(null);
      await uploadMutation.mutateAsync(selectedFile);
    } catch (err) {
      // Error handling is done in onError callback
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-xl mx-auto">
        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-indigo-200 rounded-xl bg-indigo-50/30 hover:bg-indigo-50 transition-colors cursor-pointer group">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <CloudArrowUpIcon className="h-12 w-12 text-indigo-400 group-hover:text-indigo-600 transition-colors mb-3" />
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-indigo-600">Click to upload</span> or drag and drop
            </p>
          </div>
          <input type="file" className="hidden" onChange={handleFileSelect} />
        </label>

        {selectedFile && (
          <p className="mt-3 text-sm text-indigo-700 font-medium">Selected: {selectedFile.name}</p>
        ) }

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
            {error}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploadMutation.isPending}
          className={`mt-6 w-full flex justify-center py-3 px-4 rounded-xl text-sm font-bold text-white transition-all shadow-lg ${
            !selectedFile || uploadMutation.isPending
              ? 'bg-slate-300 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 active:scale-[0.98]'
          }`}
        >
          {uploadMutation.isPending ? 'Uploading...' : 'Upload File'}
        </button>
      </div>
    </div>
  );
};
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FileViewSet

router = DefaultRouter()
# Explicitly adding basename='file' solves the AssertionError
router.register(r'files', FileViewSet, basename='file')

urlpatterns = [
    path('', include(router.urls)),
] 
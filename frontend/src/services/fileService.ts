import axios from 'axios';
import { File as FileType } from '../types/file';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export const fileService = {
  async uploadFile(file: File): Promise<FileType> {
    const formData = new FormData();
    formData.append('file', file);

    // Note: No manual Content-Type header here
    const response = await axios.post(`${API_URL}/files/`, formData);
    return response.data;
  },

  async getFiles(search?: string, type?: string): Promise<FileType[]> {
    const response = await axios.get(`${API_URL}/files/`, {
      params: { search, type } // Axios converts this to ?search=...&type=...
    });

    // Support both paginated and non-paginated responses
    return Array.isArray(response.data) ? response.data : response.data.results;
  },

  async deleteFile(id: string): Promise<void> {
    await axios.delete(`${API_URL}/files/${id}/`);
  },

  async downloadFile(fileUrl: string, filename: string): Promise<void> {
    const response = await axios.get(fileUrl, { responseType: 'blob' });
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async editImage(id: string, prompt: string): Promise<void> {
    // This sends the prompt to the new 'edit' action we defined for the backend
    await axios.post(`${API_URL}/files/${id}/edit/`, { prompt });
  },



};
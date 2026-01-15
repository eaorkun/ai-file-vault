import React, { useState } from 'react';
import axios from 'axios';
import { fileService } from '../services/fileService';
import { DocumentIcon, TrashIcon, ArrowDownTrayIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '../hooks/useDebounce'; // Assuming a standard debounce hook

export const FileList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompts, setEditPrompts] = useState<{[key: string]: string}>({});
  const queryClient = useQueryClient();

  // Inside FileList.tsx
  const debouncedSearch = useDebounce(searchTerm, 500); // 500ms delay

  const { data: files, isLoading, error } = useQuery({
    queryKey: ['files', debouncedSearch, filterType], // Use debouncedSearch here
    queryFn: () => fileService.getFiles(debouncedSearch, filterType),
  });

  // 2. DEFINE THE DELETE MUTATION (Fixes the current error)
  const deleteMutation = useMutation({
    mutationFn: fileService.deleteFile,
    onSuccess: () => {
      // This tells React Query to refresh the list after a file is gone
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });

  // 3. DEFINE THE DOWNLOAD MUTATION (Prevents the next error)
  const downloadMutation = useMutation({
    mutationFn: ({ fileUrl, filename }: { fileUrl: string; filename: string }) =>
      fileService.downloadFile(fileUrl, filename),
  });

  // 1. ADD THIS: Handler for Delete
  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (err) {
        console.error('Delete error:', err);
      }
    }
  };

  // 2. ADD THIS: Handler for Download
  const handleDownload = async (fileUrl: string, filename: string) => {
    try {
      await downloadMutation.mutateAsync({ fileUrl, filename });
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  // Logic for a hypothetical EditModal
  const handleImageEdit = async (fileId: string) => {
    const prompt = editPrompts[fileId]; // Get prompt for this specific ID
    if (!prompt) return;

    setIsEditing(true);
    try {
      await fileService.editImage(fileId, prompt);
      queryClient.invalidateQueries({ queryKey: ['files'] });

      // Clear only this specific prompt after success
      setEditPrompts(prev => ({ ...prev, [fileId]: '' }));
    } catch (err) {
      console.error("Edit failed", err);
      alert("Failed to edit image.");
    } finally {
      setIsEditing(false);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  // If you aren't using the 'error' variable anywhere else,
  // you can remove it from the destructuring above to avoid linting issues.
  if (error) return <div>Error loading files.</div>;

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row gap-6 mb-8 items-end">
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Search Files</label>
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              className="pl-10 w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-indigo-500"
              placeholder="Filter by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="w-full md:w-48">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category</label>
          <select
            className="w-full rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 shadow-sm"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="image">Images</option>
            <option value="pdf">PDFs</option>
            <option value="text">Text Files</option>
          </select>
        </div>
      </div>

      {/* File List Items */}
      <ul className="space-y-4">
        {files?.map((file) => (
          <li key={file.id} className="group p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-100 dark:hover:border-indigo-900 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20 transition-all flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg group-hover:bg-white dark:group-hover:bg-slate-700">
                <DocumentIcon className="h-6 w-6 text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{file.original_filename}</p>
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => handleDownload(file.file, file.original_filename)}
                className="text-slate-400 hover:text-indigo-600 transition-colors p-2"
                title="Download"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleDelete(file.id)}
                className="text-slate-400 hover:text-red-600 transition-colors p-2"
                title="Delete"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
            {file.file_type.includes('image') && (
              <div className="mt-4 flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Image Editor</label>

                <input
                  type="text"
                  placeholder="Describe the change..."
                  className="text-sm p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  // Use the ID to access the specific prompt
                  value={editPrompts[file.id] || ''}
                  onChange={(e) => setEditPrompts(prev => ({
                    ...prev,
                    [file.id]: e.target.value
                  }))}
                />

                <button
                  onClick={() => handleImageEdit(file.id)}
                  disabled={isEditing || !editPrompts[file.id]}
                  className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg font-semibold transition-all disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2"
                >
                  {isEditing ? (
                    <>
                      <svg className="animate-spin h-3 w-3 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Processing...
                    </>
                  ) : 'Apply AI Edit'}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
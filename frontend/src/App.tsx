// src/App.tsx
import React, {useEffect, useState} from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { FileUpload } from './components/FileUpload';
import { FileList } from './components/FileList';

function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const handleUploadSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Eralp's AI File Vault</h1>
              <p className="mt-2 text-md text-slate-600 dark:text-slate-400">
                Securely manage, search, and deduplicate your files.
              </p>
            </div>

            <button
              onClick={() => setIsDark(!isDark)}
              className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-indigo-400 hover:ring-2 ring-indigo-500 transition-all"
              aria-label="Toggle Dark Mode"
            >
              {isDark ? <SunIcon className="h-6 w-6" /> : <MoonIcon className="h-6 w-6" />}
            </button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-10 sm:px-6 lg:px-8 space-y-8">
          <section className="bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none sm:rounded-2xl border border-slate-100 dark:border-slate-800">
            <FileUpload onUploadSuccess={handleUploadSuccess} />
          </section>
          <section className="bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none sm:rounded-2xl border border-slate-100 dark:border-slate-800">
            <FileList key={refreshKey} />
          </section>
        </main>
      </div>
    </div>
  ); // <--- Ensure there is only ONE semicolon here, outside the parentheses
}

export default App;
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import NavBar from '../components/NavBar';

const Files: React.FC = () => {
  const { user, loading } = useAuth();
  const [files, setFiles] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [downloadName, setDownloadName] = useState('../database.sqlite');

  const fetchFiles = async () => {
    const { data } = await api('/api/files');
    if (data?.success) setFiles(data.files || []);
  };

  useEffect(() => {
    if (user) fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (loading) return <div className="p-10 text-slate-500">Memuat...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append('file', file);
    body.append('user_id', String(user.id));
    const { response, data } = await api('/api/upload', { method: 'POST', body });
    if (response.ok && data?.success) {
      setMessage(`Upload berhasil: ${data.file.url}`);
      await fetchFiles();
    } else {
      setMessage(data?.message || 'Upload gagal');
    }
  };

  const download = () => {
    window.location.href = `/api/files/download?name=${encodeURIComponent(downloadName)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">File Manager</h1>
        {message && <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">{message}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-slate-800 mb-3">Upload File</h2>
            <input type="file" onChange={upload} className="text-sm" />
            <p className="text-xs text-slate-400 mt-2">
              Tidak ada validasi ekstensi/MIME. File HTML/SVG akan disajikan sebagai HTML/SVG.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-slate-800 mb-3">Download by Name</h2>
            <input
              value={downloadName}
              onChange={(event) => setDownloadName(event.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              onClick={download}
              className="mt-3 bg-slate-700 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg font-semibold text-sm"
            >
              Download
            </button>
            <p className="text-xs text-slate-400 mt-2">
              Coba <code>../database.sqlite</code> atau <code>../server.js</code>.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-bold text-slate-800 mb-3">Semua File</h2>
          <div className="space-y-3">
            {files.map((file) => (
              <div key={file.id} className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{file.original_name}</p>
                  <p className="text-xs text-slate-500">
                    User {file.user_id} ({file.username}) · {file.mime}
                  </p>
                </div>
                <a
                  href={`/uploads/${file.stored_name}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  Buka file
                </a>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Files;

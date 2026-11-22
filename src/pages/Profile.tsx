import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import NavBar from '../components/NavBar';

const Profile: React.FC = () => {
  const { user, loading, refresh } = useAuth();
  const [form, setForm] = useState({ nama_lengkap: '', email: '', bio: '', role: '', saldo: '' });
  const [preferences, setPreferences] = useState('{"theme":"dark"}');
  const [message, setMessage] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');

  useEffect(() => {
    if (user) {
      setForm({
        nama_lengkap: user.nama_lengkap || '',
        email: user.email || '',
        bio: user.bio || '',
        role: user.role || 'customer',
        saldo: String(user.saldo || 0),
      });
    }
  }, [user]);

  if (loading) return <div className="p-10 text-slate-500">Memuat...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    const { response, data } = await api(`/api/users/${user.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        nama_lengkap: form.nama_lengkap,
        email: form.email,
        bio: form.bio,
        role: form.role,
        saldo: form.saldo,
      }),
    });
    if (response.ok && data?.success) {
      setMessage('Profil disimpan');
      await refresh();
    } else {
      setMessage(data?.message || data?.error || 'Gagal menyimpan');
    }
  };

  const savePreferences = async () => {
    setMessage('');
    let parsed: any;
    try {
      parsed = JSON.parse(preferences);
    } catch {
      setMessage('JSON preferensi tidak valid');
      return;
    }
    const { response, data } = await api('/api/profile/preferences', {
      method: 'POST',
      body: JSON.stringify({ preferences: parsed }),
    });
    setMessage(
      response.ok
        ? `Preferensi disimpan. prototype_isAdmin=${data.prototype_isAdmin}`
        : data?.message || 'Gagal menyimpan preferensi'
    );
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append('file', file);
    body.append('user_id', String(user.id));
    const { response, data } = await api('/api/upload', { method: 'POST', body });
    if (response.ok && data?.success) {
      setUploadUrl(data.file.url);
      setMessage('File diupload');
    } else {
      setMessage(data?.message || 'Upload gagal');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Profil Saya</h1>
        {message && <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">{message}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={save} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="font-bold text-slate-800">Data Diri</h2>
            {[
              ['nama_lengkap', 'Nama Lengkap'],
              ['email', 'Email'],
              ['role', 'Role'],
              ['saldo', 'Saldo'],
            ].map(([field, label]) => (
              <div key={field}>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
                <input
                  value={(form as any)[field]}
                  onChange={(event) => setForm({ ...form, [field]: event.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Bio (HTML)</label>
              <textarea
                value={form.bio}
                onChange={(event) => setForm({ ...form, bio: event.target.value })}
                rows={4}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold">
              Simpan Profil
            </button>
          </form>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-bold text-slate-800 mb-3">Bio Publik</h2>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg" dangerouslySetInnerHTML={{ __html: form.bio }} />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-bold text-slate-800 mb-3">Preferensi (JSON)</h2>
              <textarea
                value={preferences}
                onChange={(event) => setPreferences(event.target.value)}
                rows={5}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                onClick={savePreferences}
                className="mt-3 bg-slate-700 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg font-semibold text-sm"
              >
                Simpan Preferensi
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-bold text-slate-800 mb-3">Avatar / KYC</h2>
              <input type="file" onChange={uploadAvatar} className="text-sm" />
              {uploadUrl && (
                <p className="mt-3 text-sm">
                  URL: <a className="text-blue-600 underline" href={uploadUrl}>{uploadUrl}</a>
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;

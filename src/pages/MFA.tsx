import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';

const MFA: React.FC = () => {
  const navigate = useNavigate();
  const { user, clearMfa } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const { response, data } = await api('/api/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
    if (response.ok && data?.success) {
      clearMfa();
      navigate('/dashboard');
    } else {
      setError(data?.message || 'Kode salah');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-100 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Verifikasi MFA</h1>
        <p className="text-sm text-gray-500 mb-6">
          Akun <strong>{user?.username}</strong> memerlukan verifikasi tambahan.
        </p>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        <form onSubmit={verify} className="space-y-4">
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center tracking-[0.4em]"
            placeholder="000000"
            maxLength={6}
          />
          <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg">
            Verifikasi
          </button>
        </form>

        <div className="mt-5 text-center">
          <Link to="/dashboard" className="text-sm text-slate-500 hover:text-blue-600">
            Kembali ke dashboard
          </Link>
          <p className="text-[11px] text-slate-400 mt-1">
            Route guard hanya ada di client-side.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MFA;

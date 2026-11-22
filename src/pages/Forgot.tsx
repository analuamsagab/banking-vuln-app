import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const Forgot: React.FC = () => {
  const [username, setUsername] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setResult(null);
    const { response, data } = await api('/api/auth/forgot', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
    if (response.ok && data?.success) setResult(data);
    else setError(data?.message || 'Gagal meminta reset');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-100 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Lupa Password</h1>
        <p className="text-sm text-gray-500 mb-6">Masukkan username untuk menerima OTP reset.</p>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        <form onSubmit={submit} className="space-y-4">
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Username"
            required
          />
          <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg">
            Kirim OTP
          </button>
        </form>

        {result && (
          <div className="mt-5 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm space-y-2">
            <p className="font-semibold text-amber-800">Debug response:</p>
            <p>OTP: <code className="bg-white px-1 rounded">{result.debug_otp}</code></p>
            <p className="break-all">Reset URL: <code className="bg-white px-1 rounded">{result.reset_url}</code></p>
            <Link
              to={`/reset?username=${encodeURIComponent(username)}&token=${result.debug_otp}`}
              className="inline-block text-blue-600 font-semibold hover:underline"
            >
              Buka halaman reset
            </Link>
          </div>
        )}

        <p className="text-sm text-center text-gray-500 mt-6">
          <Link to="/login" className="text-blue-600 font-semibold hover:underline">Kembali ke login</Link>
        </p>
      </div>
    </div>
  );
};

export default Forgot;

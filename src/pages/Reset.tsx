import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';

const Reset: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [username, setUsername] = useState(params.get('username') || '');
  const [otp, setOtp] = useState(params.get('token') || '');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    const { response, data } = await api('/api/auth/reset', {
      method: 'POST',
      body: JSON.stringify({ username, otp, new_password: password }),
    });
    if (response.ok && data?.success) {
      setMessage('Password berhasil direset. Silakan login.');
      setTimeout(() => navigate('/login'), 1200);
    } else {
      setError(data?.message || 'Reset gagal');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-100 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h1>
        <p className="text-sm text-gray-500 mb-6">Masukkan OTP dan password baru.</p>

        {message && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">{message}</div>}
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        <form onSubmit={submit} className="space-y-4">
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Username"
            required
          />
          <input
            value={otp}
            onChange={(event) => setOtp(event.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="OTP"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Password baru"
            required
          />
          <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg">
            Reset Password
          </button>
        </form>

        <p className="text-sm text-center text-gray-500 mt-6">
          <Link to="/login" className="text-blue-600 font-semibold hover:underline">Kembali ke login</Link>
        </p>
      </div>
    </div>
  );
};

export default Reset;

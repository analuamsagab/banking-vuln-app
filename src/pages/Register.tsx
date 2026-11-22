import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '', nama_lengkap: '', email: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { response, data } = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      if (response.ok && data?.success) {
        navigate('/login');
      } else {
        setError(data?.message || 'Registrasi gagal');
      }
    } catch {
      setError('Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-100 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Buka Rekening</h1>
        <p className="text-sm text-gray-500 mb-6">Daftar akun baru Bank UBS.</p>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        <form onSubmit={submit} className="space-y-4">
          {[
            ['username', 'Username'],
            ['password', 'Password'],
            ['nama_lengkap', 'Nama Lengkap'],
            ['email', 'Email'],
          ].map(([field, label]) => (
            <div key={field}>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
              <input
                type={field === 'password' ? 'password' : 'text'}
                value={(form as any)[field]}
                onChange={(event) => setForm({ ...form, [field]: event.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required={field !== 'email'}
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg disabled:opacity-60"
          >
            {loading ? 'Memproses...' : 'Daftar'}
          </button>
        </form>

        <p className="text-sm text-center text-gray-500 mt-6">
          Sudah punya akun?{' '}
          <Link to="/login" className="text-blue-600 font-semibold hover:underline">
            Masuk
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;

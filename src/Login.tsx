import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import LogoImage from './assets/images/logo.png';
import { useAuth } from './AuthContext';

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') || '/dashboard';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { response, data } = await login(username, password);
      if (response.ok && data?.success) {
        if (data.mfa_required) {
          navigate('/mfa');
        } else if (next.startsWith('http')) {
          window.location.href = next;
        } else {
          navigate(next);
        }
      } else {
        setError(data?.message || 'Login gagal. Silakan periksa kredensial Anda.');
      }
    } catch (err) {
      setError('Terjadi kesalahan saat terhubung ke server.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen font-sans bg-gray-50 relative">
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 transition-all z-10 hover:shadow-md"
      >
        ← Kembali ke Menu Utama
      </button>

      <div className="hidden lg:flex lg:w-1/2 bg-blue-700 text-white flex-col justify-center items-center p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white opacity-10"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-white opacity-10"></div>

        <div className="max-w-lg relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <img src={LogoImage} alt="FinServe Logo" className="h-10 w-auto" />
            <span className="text-3xl font-bold tracking-tight">Bank UBS</span>
          </div>

          <h1 className="text-4xl font-bold mb-6 leading-tight">Selamat Datang Kembali</h1>
          <p className="text-lg leading-relaxed text-blue-100">
            Masuk ke portal kami untuk mengakses ringkasan keuangan Anda dan mengelola transaksi.
          </p>
          <div className="mt-8 text-xs text-blue-200/80 font-mono">
            HTTP only — credentials dikirim plaintext.
          </div>
        </div>
      </div>

      <div className="flex flex-1 justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-xl shadow-lg border border-gray-100">
          <div className="flex lg:hidden justify-center mb-8">
            <div className="flex items-center gap-2">
              <img src={LogoImage} alt="FinServe Logo" className="h-8 w-auto" />
              <span className="text-2xl font-bold text-blue-900 tracking-tight">Bank UBS</span>
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Masuk ke Akun</h2>
            <p className="text-gray-500 text-sm">Masukkan detail kredensial Anda</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg text-sm flex items-start gap-3">
              <span dangerouslySetInnerHTML={{ __html: error }} />
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Masukkan username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Kata Sandi</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="flex items-center justify-between mt-2 mb-2">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300" />
                Ingat saya
              </label>
              <Link to="/forgot" className="text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline">
                Lupa sandi?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <p className="text-sm text-center text-gray-500 mt-6">
            Belum punya akun?{' '}
            <Link to="/register" className="text-blue-600 font-semibold hover:underline">
              Buka rekening
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

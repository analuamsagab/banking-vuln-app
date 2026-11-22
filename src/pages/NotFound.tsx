import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
    <div className="text-center">
      <p className="text-6xl font-bold text-slate-300">404</p>
      <h1 className="text-2xl font-bold text-slate-800 mt-2">Halaman tidak ditemukan</h1>
      <Link to="/" className="inline-block mt-5 text-blue-600 font-semibold hover:underline">
        Kembali ke beranda
      </Link>
    </div>
  </div>
);

export default NotFound;

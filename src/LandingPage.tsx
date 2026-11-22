import React from 'react';
import { Link } from 'react-router-dom';
import LogoImage from './assets/images/logo.png';
import HeroBannerImage from './assets/images/hero.png';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen font-sans bg-white flex flex-col overflow-x-hidden">
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <img src={LogoImage} alt="FinServe Logo" className="h-8 w-auto" />
          <span className="text-2xl font-bold text-blue-900 tracking-tight">Bank UBS</span>
        </div>

        <nav className="hidden md:flex gap-8 text-gray-600 font-medium">
          <a href="#" className="hover:text-blue-600 transition-colors">Beranda</a>
          <a href="#" className="hover:text-blue-600 transition-colors">Produk</a>
          <a href="#" className="hover:text-blue-600 transition-colors">Bantuan</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/register"
            className="text-sm font-semibold text-blue-700 hover:text-blue-900 px-3 py-2"
          >
            Buka Rekening
          </Link>
          <Link
            to="/login"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-all shadow-sm hover:shadow-md active:scale-95"
          >
            Masuk
          </Link>
        </div>
      </header>

      <section className="w-full min-h-[500px] bg-slate-50 flex items-center justify-center relative border-b border-slate-200 overflow-hidden">
        <img src={HeroBannerImage} alt="Hero Banner" className="absolute inset-0 w-full h-full object-cover" />
        <div className="relative z-10 max-w-3xl mx-auto text-center px-6 py-20 bg-white/70 backdrop-blur-sm rounded-2xl m-6">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Perbankan digital, tanpa ribet.
          </h1>
          <p className="text-lg text-slate-600 mb-8">
            Transfer, bayar tagihan, dan pantau keuangan Anda dalam satu portal.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/login"
              className="bg-blue-600 hover:bg-blue-700 text-white px-7 py-3 rounded-lg font-semibold"
            >
              Masuk ke Akun
            </Link>
            <Link
              to="/register"
              className="bg-white border border-slate-300 hover:border-blue-500 text-slate-700 px-7 py-3 rounded-lg font-semibold"
            >
              Daftar Sekarang
            </Link>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 max-w-7xl mx-auto flex-1 w-full">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-5">Layanan Perbankan Kami</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Solusi keuangan modern untuk memudahkan setiap transaksi Anda sehari-hari.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            ['Tabungan Digital', 'Buka rekening langsung dari ponsel Anda tanpa perlu ke cabang.'],
            ['Transfer Instan', 'Kirim uang ke mana saja dalam hitungan detik.'],
            ['Keamanan Berlapis', 'Sistem keamanan standar industri dengan enkripsi end-to-end.'],
          ].map(([title, description]) => (
            <div
              key={title}
              className="bg-white p-8 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
            >
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6 text-2xl">
                ★
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
              <p className="text-gray-600 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="bg-slate-900/95 text-slate-400 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={LogoImage} alt="Bank UBS Logo" className="h-10 w-auto" />
            <span className="text-2xl font-bold text-white/95 tracking-tight">Bank UBS</span>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} Bank UBS. Lab environment.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

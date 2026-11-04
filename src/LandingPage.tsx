import React from 'react';
import LogoImage from './assets/images/logo.png';
import HeroBannerImage from './assets/images/hero.png';

interface LandingPageProps {
  onLoginClick: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick }) => {
  return (
    <div className="min-h-screen font-sans bg-white flex flex-col overflow-x-hidden">
      {/* Header/Navbar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3 cursor-pointer">
          <img src={LogoImage} alt="FinServe Logo" className="h-8 w-auto" />
          <span className="text-2xl font-bold text-blue-900 tracking-tight">Bank UBS</span>
        </div>
        
        <nav className="hidden md:flex gap-8 text-gray-600 font-medium">
          <a href="#" className="hover:text-blue-600 transition-colors">Beranda</a>
          <a href="#" className="hover:text-blue-600 transition-colors">Produk</a>
          <a href="#" className="hover:text-blue-600 transition-colors">Bantuan</a>
        </nav>
        
        <div>
          <button 
            onClick={onLoginClick}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-all shadow-sm hover:shadow-md active:scale-95"
          >
            Masuk
          </button>
        </div>
      </header>

      {/* Area Hero (KOSONG) - Diberi border dashed sebagai indikator visual sementara */}
      <section className="w-full min-h-[500px] bg-slate-50 flex items-center justify-center relative border-b border-slate-200 overflow-hidden">
        <img src={HeroBannerImage} alt="Hero Banner" className="absolute inset-0 w-full h-full object-cover" />
      </section>

      {/* Section Layanan (Features) */}
      <section className="py-24 px-6 max-w-7xl mx-auto flex-1 w-full">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-5">Layanan Perbankan Kami</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Kami menyediakan solusi keuangan modern untuk memudahkan setiap transaksi Anda sehari-hari dengan aman, cepat, dan tanpa hambatan.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="bg-white p-8 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Tabungan Digital</h3>
            <p className="text-gray-600 leading-relaxed">
              Buka rekening langsung dari ponsel Anda tanpa perlu ke cabang. Mudah, cepat, dan nikmati bebas biaya admin bulanan.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-8 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Transfer Instan</h3>
            <p className="text-gray-600 leading-relaxed">
              Kirim uang ke mana saja dalam hitungan detik. Mendukung berbagai jaringan pembayaran real-time antar bank seluruh dunia.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-8 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Keamanan Berlapis</h3>
            <p className="text-gray-600 leading-relaxed">
              Sistem keamanan standar industri dengan enkripsi end-to-end, perlindungan dari fraud 24/7, dan autentikasi biometrik.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-t from-blue-600/5 via-slate-900/5 to-transparent pointer-events-none" />
        <footer className="relative bg-slate-900/80 backdrop-blur-xl border-t border-white/10 py-20 px-8">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-14">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <img src={LogoImage} alt="Bank UBS Logo" className="h-10 w-auto" />
                <span className="text-3xl font-bold text-white/95 tracking-tight">Bank UBS</span>
              </div>
              <p className="max-w-sm text-slate-400 leading-relaxed text-base">
                Solusi perbankan masa depan untuk kehidupan yang lebih baik. Mengedepankan teknologi untuk pengalaman keuangan tanpa batas.
              </p>
            </div>
            <div>
              <h4 className="text-white/80 font-semibold text-sm uppercase tracking-widest mb-8">Perusahaan</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-slate-400 hover:text-white hover:translate-x-1.5 transition-all duration-200 ease-out inline-block">Tentang Kami</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white hover:translate-x-1.5 transition-all duration-200 ease-out inline-block">Karir</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white hover:translate-x-1.5 transition-all duration-200 ease-out inline-block">Hubungi Kami</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white hover:translate-x-1.5 transition-all duration-200 ease-out inline-block">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white/80 font-semibold text-sm uppercase tracking-widest mb-8">Legal</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-slate-400 hover:text-white hover:translate-x-1.5 transition-all duration-200 ease-out inline-block">Syarat & Ketentuan</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white hover:translate-x-1.5 transition-all duration-200 ease-out inline-block">Kebijakan Privasi</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white hover:translate-x-1.5 transition-all duration-200 ease-out inline-block">Keamanan</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white hover:translate-x-1.5 transition-all duration-200 ease-out inline-block">Pusat Bantuan</a></li>
              </ul>
            </div>
          </div>
          <div className="max-w-7xl mx-auto pt-10 border-t border-white/5 text-sm text-center text-slate-500">
            <p>&copy; {new Date().getFullYear()} Bank UBS. Hak Cipta Dilindungi.</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
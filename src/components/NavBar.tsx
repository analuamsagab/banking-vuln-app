import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const NavBar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const linkClass = 'text-sm font-medium text-slate-600 hover:text-blue-700 transition-colors';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 justify-between">
        <Link to="/dashboard" className="flex items-center gap-2">
          <span className="text-lg font-bold text-blue-900 tracking-tight">Bank UBS</span>
          <span className="text-[10px] uppercase tracking-widest bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
            Lab
          </span>
        </Link>

        {user && (
          <nav className="flex flex-wrap items-center gap-4">
            <Link to="/dashboard" className={linkClass}>Dashboard</Link>
            <Link to="/statements" className={linkClass}>Statement</Link>
            <Link to="/support" className={linkClass}>Support</Link>
            <Link to="/files" className={linkClass}>Files</Link>
            <Link to="/profile" className={linkClass}>Profil</Link>
            {user.role === 'admin' && (
              <Link to="/admin" className={linkClass}>Admin</Link>
            )}
            <span className="text-xs text-slate-400">
              {user.nama_lengkap || user.username} ({user.role || 'customer'})
            </span>
            <button
              onClick={handleLogout}
              className="text-sm font-semibold text-red-600 hover:text-red-800"
            >
              Keluar
            </button>
          </nav>
        )}
      </div>
    </header>
  );
};

export default NavBar;

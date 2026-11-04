import React, { useState, useEffect } from 'react';
import LogoImage from './assets/images/logo.png';

interface User {
  id: number;
  username: string;
  namaLengkap: string;
  saldo: number;
}

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [transferResult, setTransferResult] = useState('');
  const [transferForm, setTransferForm] = useState({ to_user: '', amount: '' });

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(angka);
  };

  const baseUrl = import.meta.env.VITE_API_URL || '';

  const fetchNotes = async () => {
    try {
      const res = await fetch(`${baseUrl}/api/notes`);
      const data = await res.json();
      if (data.success) {
        setNotes(data.notes);
      }
    } catch (e) {
      console.error('Gagal mengambil notes');
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${baseUrl}/api/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, content: newNote })
      });
      const data = await res.json();
      if (data.success) {
        setNewNote('');
        fetchNotes();
      }
    } catch (e) {
      console.error('Gagal menambahkan catatan');
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${baseUrl}/api/transfer?from_id=${user.id}&to_id=${transferForm.to_user}&amount=${transferForm.amount}`);
      const data = await res.json();
      if (data.success) {
        setTransferResult(`✅ ${data.message}`);
      } else {
        setTransferResult('❌ ' + data.message);
      }
    } catch (e) {
      setTransferResult('❌ Gagal terhubung ke server');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-blue-700 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src={LogoImage} alt="FinServe Logo" className="h-10 w-auto" />
            <span className="text-2xl font-bold tracking-tight">Bank UBS Portal</span>
          </div>
          <button 
            onClick={onLogout}
            className="text-white hover:text-blue-200 font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Keluar
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Welcome Banner */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Selamat datang, {user.namaLengkap} 👋
            </h1>
            <p className="text-gray-500">Berikut adalah ringkasan akun keuangan Anda hari ini.</p>
          </div>
          <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-medium text-sm border border-blue-100">
            Status Akun: Aktif
          </div>
        </div>

        {/* Saldo Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl shadow-lg p-6 text-white col-span-1 md:col-span-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white opacity-10"></div>
            <div className="absolute bottom-0 right-16 -mb-10 w-24 h-24 rounded-full bg-white opacity-10"></div>
            
            <p className="text-blue-100 font-medium mb-1">Total Saldo Aktif</p>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">
              {formatRupiah(user.saldo)}
            </h2>
            
            <div className="flex gap-4 mt-6">
              <button className="bg-white text-blue-700 hover:bg-blue-50 px-5 py-2.5 rounded-lg font-semibold transition-colors flex items-center gap-2 shadow-sm text-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Isi Saldo
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">🔄 Transfer Dana</h3>
          <form onSubmit={handleTransfer} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">ID Tujuan</label>
                <input
                  type="text"
                  value={transferForm.to_user}
                  onChange={(e) => setTransferForm({ ...transferForm, to_user: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Jumlah (Rp)</label>
                <input
                  type="text"
                  value={transferForm.amount}
                  onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="100000"
                />
              </div>
            </div>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors">
              Kirim Transfer
            </button>
          </form>
          {transferResult && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">{transferResult}</div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📝 Catatan Transfer</h3>
          
          <form onSubmit={addNote} className="flex gap-2 mb-4">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Tambah catatan baru..."
            />
            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-semibold transition-colors">
              Tambah
            </button>
          </form>

          <div className="space-y-3">
            {notes.map((note: any) => (
              <div key={note.id} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">User #{note.user_id}</div>
                <div dangerouslySetInnerHTML={{ __html: note.content }} />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-100 rounded-xl p-4 text-xs text-gray-500 font-mono">
          <p>Debug: User ID={user.id} | Username={user.username}</p>
          <p>Coba cek /api/debug untuk informasi lebih lanjut</p>
        </div>

      </main>
    </div>
  );
};

export default Dashboard;
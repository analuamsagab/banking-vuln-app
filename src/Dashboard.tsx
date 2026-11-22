import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api } from './api';
import { useAuth } from './AuthContext';
import NavBar from './components/NavBar';

const Dashboard: React.FC = () => {
  const { user, loading, mfaRequired, refresh } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [transferForm, setTransferForm] = useState({ to_user: '', amount: '' });
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [result, setResult] = useState('');
  const [noteResult, setNoteResult] = useState('');

  const formatRupiah = (angka: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(Number(angka || 0));

  const fetchNotes = async () => {
    const { response, data } = await api('/api/notes');
    if (response.ok && data?.success) setNotes(data.notes || []);
  };

  useEffect(() => {
    if (user) fetchNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-slate-500">
        Memuat...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const handleTransfer = async (event: React.FormEvent) => {
    event.preventDefault();
    setResult('');
    const { response, data } = await api('/api/transfer', {
      method: 'POST',
      body: JSON.stringify({
        from_id: user.id,
        to_id: transferForm.to_user,
        amount: transferForm.amount,
        note: 'Transfer dari dashboard',
      }),
    });
    setResult(response.ok ? `✅ ${data.message}` : `❌ ${data.message || data.error}`);
    if (response.ok) {
      setTransferForm({ to_user: '', amount: '' });
      await refresh();
    }
  };

  const handleWithdraw = async (event: React.FormEvent) => {
    event.preventDefault();
    setResult('');
    const { response, data } = await api('/api/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount: withdrawAmount }),
    });
    setResult(response.ok ? `✅ ${data.message}` : `❌ ${data.message || data.error}`);
    if (response.ok) {
      setWithdrawAmount('');
      await refresh();
    }
  };

  const addNote = async (event: React.FormEvent) => {
    event.preventDefault();
    setNoteResult('');
    const { response, data } = await api('/api/notes', {
      method: 'POST',
      body: JSON.stringify({ user_id: user.id, content: newNote }),
    });
    if (response.ok && data?.success) {
      setNewNote('');
      setNoteResult('Catatan ditambahkan');
      await fetchNotes();
    } else {
      setNoteResult(data?.error || data?.message || 'Gagal menambahkan catatan');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <NavBar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {mfaRequired && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-sm">
            MFA belum diverifikasi. Beberapa API tetap bisa diakses langsung.
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Selamat datang, {user.nama_lengkap || user.username} 👋
            </h1>
            <p className="text-gray-500">Ringkasan akun keuangan Anda hari ini.</p>
          </div>
          <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-medium text-sm border border-blue-100">
            Role: {user.role || 'customer'}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl shadow-lg p-6 text-white col-span-1 md:col-span-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white opacity-10"></div>
            <p className="text-blue-100 font-medium mb-1">Total Saldo Aktif</p>
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">
              {formatRupiah(user.saldo || 0)}
            </h2>
            <p className="text-sm text-blue-100">
              User ID {user.id} · {user.email || 'email belum diisi'}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-3">Aksi Cepat</h3>
            <div className="space-y-2 text-sm">
              <Link to="/statements" className="block text-blue-600 hover:underline">Lihat statement</Link>
              <Link to="/support" className="block text-blue-600 hover:underline">Buka support</Link>
              <Link to="/files" className="block text-blue-600 hover:underline">File manager</Link>
              <Link to="/profile" className="block text-blue-600 hover:underline">Edit profil</Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">🔄 Transfer Dana</h3>
            <form onSubmit={handleTransfer} className="space-y-4">
              <input
                value={transferForm.to_user}
                onChange={(event) => setTransferForm({ ...transferForm, to_user: event.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="ID tujuan (contoh: 2)"
                required
              />
              <input
                value={transferForm.amount}
                onChange={(event) => setTransferForm({ ...transferForm, amount: event.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Jumlah (contoh: 100000)"
                required
              />
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold">
                Kirim Transfer
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">💸 Tarik Dana</h3>
            <form onSubmit={handleWithdraw} className="space-y-4">
              <input
                value={withdrawAmount}
                onChange={(event) => setWithdrawAmount(event.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Jumlah penarikan"
                required
              />
              <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-semibold">
                Tarik
              </button>
            </form>
          </div>
        </div>

        {result && (
          <div className="mb-8 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">{result}</div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">📝 Catatan</h3>
          <form onSubmit={addNote} className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              value={newNote}
              onChange={(event) => setNewNote(event.target.value)}
              className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Tambah catatan baru..."
            />
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-semibold">
              Tambah
            </button>
          </form>
          {noteResult && <p className="text-xs text-slate-500 mb-3">{noteResult}</p>}

          <div className="space-y-3">
            {notes.map((note: any) => (
              <div key={note.id} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">
                  User #{note.user_id} {note.username ? `(${note.username})` : ''}
                </div>
                <div dangerouslySetInnerHTML={{ __html: note.content }} />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-100 rounded-xl p-4 text-xs text-gray-500 font-mono">
          <p>Debug: User ID={user.id} | Username={user.username} | Role={user.role}</p>
          <p>Coba cek /api/debug dan /api/docs untuk informasi lebih lanjut.</p>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

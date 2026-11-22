import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import NavBar from '../components/NavBar';

const Support: React.FC = () => {
  const { user, loading } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [form, setForm] = useState({ subject: '', message: '' });
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[] | null>(null);
  const [message, setMessage] = useState('');

  const fetchTickets = async () => {
    const { response, data } = await api('/api/support/tickets');
    if (response.ok && data?.success) setTickets(data.tickets || []);
  };

  useEffect(() => {
    if (user) fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    const widget = document.getElementById('help-widget');
    if (!widget) return;
    const raw = decodeURIComponent(window.location.hash.replace(/^#/, ''));
    if (raw) widget.innerHTML = raw;
  }, []);

  if (loading) return <div className="p-10 text-slate-500">Memuat...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const createTicket = async (event: React.FormEvent) => {
    event.preventDefault();
    const { response, data } = await api('/api/support/tickets', {
      method: 'POST',
      body: JSON.stringify({ user_id: user.id, ...form }),
    });
    if (response.ok && data?.success) {
      setForm({ subject: '', message: '' });
      setMessage('Tiket dikirim');
      await fetchTickets();
    } else {
      setMessage(data?.message || 'Gagal mengirim tiket');
    }
  };

  const doSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    const { response, data } = await api(`/api/support/search?q=${encodeURIComponent(search)}`);
    if (response.ok && data?.success) {
      setResults(data.tickets || []);
      setMessage(`Ditemukan ${data.tickets?.length || 0} tiket`);
    } else {
      setMessage(data?.error || data?.message || 'Pencarian gagal');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Support Center</h1>
        {message && <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">{message}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <form onSubmit={createTicket} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="font-bold text-slate-800">Buat Tiket</h2>
            <input
              value={form.subject}
              onChange={(event) => setForm({ ...form, subject: event.target.value })}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Subjek"
              required
            />
            <textarea
              value={form.message}
              onChange={(event) => setForm({ ...form, message: event.target.value })}
              rows={4}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Pesan (HTML diperbolehkan)"
              required
            />
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold">
              Kirim Tiket
            </button>
          </form>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-slate-800 mb-3">Cari Tiket</h2>
            <form onSubmit={doSearch} className="flex gap-2">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Kata kunci"
              />
              <button className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg font-semibold">
                Cari
              </button>
            </form>

            <h3 className="font-semibold text-slate-700 mt-6 mb-2">Help Widget (DOM XSS)</h3>
            <div id="help-widget" className="min-h-16 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
            <p className="text-xs text-slate-400 mt-2">
              Coba ubah hash URL: <code>#&lt;img src=x onerror=alert(1)&gt;</code>
            </p>
          </div>
        </div>

        {results && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
            <h2 className="font-bold text-slate-800 mb-3">Hasil Pencarian</h2>
            <div className="space-y-3">
              {results.map((ticket) => (
                <div key={ticket.id} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div
                    className="font-semibold text-slate-800"
                    dangerouslySetInnerHTML={{ __html: ticket.subject }}
                  />
                  <div
                    className="text-sm text-slate-600 mt-1"
                    dangerouslySetInnerHTML={{ __html: ticket.message }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-bold text-slate-800 mb-3">Semua Tiket</h2>
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="text-xs text-slate-500 mb-1">
                  #{ticket.id} · User {ticket.user_id} ({ticket.username}) · {ticket.status}
                </div>
                <div
                  className="font-semibold text-slate-800"
                  dangerouslySetInnerHTML={{ __html: ticket.subject }}
                />
                <div
                  className="text-sm text-slate-600 mt-1"
                  dangerouslySetInnerHTML={{ __html: ticket.message }}
                />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Support;

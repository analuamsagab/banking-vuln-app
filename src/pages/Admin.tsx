import React, { useEffect, useState } from 'react';
import { api } from '../api';
import NavBar from '../components/NavBar';

const Admin: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState('');
  const [summary, setSummary] = useState<any>(null);
  const [host, setHost] = useState('127.0.0.1 & whoami');
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [template, setTemplate] = useState('<%= 7 * 7 %>');
  const [rendered, setRendered] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    const usersRes = await api('/api/admin/users');
    if (usersRes.data?.success) setUsers(usersRes.data.users || []);
    const logsRes = await api('/api/admin/logs');
    if (logsRes.data?.success) setLogs(logsRes.data.logs || '');
    const summaryRes = await api('/api/admin/summary');
    if (summaryRes.data?.success) setSummary(summaryRes.data.counts);
  };

  useEffect(() => {
    load();
  }, []);

  const runDiagnostics = async (event: React.FormEvent) => {
    event.preventDefault();
    setDiagnostics(null);
    setMessage('');
    const { response, data } = await api('/api/admin/diagnostics/ping', {
      method: 'POST',
      body: JSON.stringify({ host }),
    });
    if (response.ok) setDiagnostics(data);
    else setMessage(data?.message || data?.error || 'Diagnostics gagal');
  };

  const previewTemplate = async (event: React.FormEvent) => {
    event.preventDefault();
    setRendered('');
    setMessage('');
    const { response, data } = await api('/api/notifications/preview', {
      method: 'POST',
      body: JSON.stringify({ template }),
    });
    if (response.ok && data?.success) setRendered(data.rendered);
    else setMessage(data?.error || data?.message || 'Render gagal');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Panel</h1>
            <p className="text-sm text-slate-500">
              Halaman ini tidak memiliki guard. API admin juga tidak selalu mengecek role.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <a className="px-3 py-2 bg-slate-700 text-white rounded-lg" href="/api/admin/backup">Backup DB</a>
            <a className="px-3 py-2 bg-slate-700 text-white rounded-lg" href="/api/admin/export">Export CSV</a>
            <a className="px-3 py-2 bg-slate-700 text-white rounded-lg" href="/api/config">Config</a>
            <a className="px-3 py-2 bg-slate-700 text-white rounded-lg" href="/api/docs">API Docs</a>
          </div>
        </div>

        {message && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm">{message}</div>}

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {Object.entries(summary).map(([key, value]) => (
              <div key={key} className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-xs uppercase text-slate-400">{key}</p>
                <p className="text-2xl font-bold text-slate-800">{String(value)}</p>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 overflow-x-auto">
          <h2 className="font-bold text-slate-800 mb-3">Users (termasuk password)</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2">ID</th>
                <th>Username</th>
                <th>Password</th>
                <th>Role</th>
                <th>Saldo</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="py-2">{user.id}</td>
                  <td>{user.username}</td>
                  <td className="font-mono text-red-600">{user.password}</td>
                  <td>{user.role}</td>
                  <td>{user.saldo}</td>
                  <td>{user.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <form onSubmit={runDiagnostics} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-3">
            <h2 className="font-bold text-slate-800">Diagnostics (command injection)</h2>
            <input
              value={host}
              onChange={(event) => setHost(event.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-semibold text-sm">
              Jalankan
            </button>
            {diagnostics && (
              <pre className="p-3 bg-slate-900 text-green-300 text-xs rounded-lg overflow-auto whitespace-pre-wrap">
                {JSON.stringify(diagnostics, null, 2)}
              </pre>
            )}
          </form>

          <form onSubmit={previewTemplate} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-3">
            <h2 className="font-bold text-slate-800">Email Template Preview (SSTI)</h2>
            <textarea
              value={template}
              onChange={(event) => setTemplate(event.target.value)}
              rows={4}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-semibold text-sm">
              Render
            </button>
            {rendered && (
              <div
                className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                dangerouslySetInnerHTML={{ __html: rendered }}
              />
            )}
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-bold text-slate-800 mb-3">Server Logs (HTML render)</h2>
          <pre
            className="p-3 bg-slate-900 text-slate-200 text-xs rounded-lg overflow-auto max-h-96 whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: logs }}
          />
        </div>
      </main>
    </div>
  );
};

export default Admin;

import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import NavBar from '../components/NavBar';

const Statements: React.FC = () => {
  const { user, loading } = useAuth();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [statements, setStatements] = useState<any[]>([]);
  const [url, setUrl] = useState('http://127.0.0.1:3001/api/internal/users');
  const [importResult, setImportResult] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) return;
    api(`/api/transfers?user_id=${user.id}`).then(({ data }) => {
      if (data?.success) setTransfers(data.transfers || []);
    });
    api(`/api/users/${user.id}/statement`).then(({ data }) => {
      if (data?.success) setStatements(data.statements || []);
    });
  }, [user?.id]);

  if (loading) return <div className="p-10 text-slate-500">Memuat...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const importStatement = async (event: React.FormEvent) => {
    event.preventDefault();
    setImportResult('');
    setMessage('');
    const { response, data } = await api('/api/integrations/fetch', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
    if (response.ok && data?.success) {
      setImportResult(`HTTP ${data.status}\n\n${data.body}`);
    } else {
      setMessage(data?.error || data?.message || 'Import gagal');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Statement & Transaksi</h1>
        {message && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm">{message}</div>}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-bold text-slate-800">Transaksi Saya</h2>
            <a
              href={`/api/statement/export.csv?user_id=${user.id}`}
              className="text-sm bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-semibold"
            >
              Export CSV
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="py-2">ID</th>
                  <th>Dari</th>
                  <th>Ke</th>
                  <th>Amount</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((transfer) => (
                  <tr key={transfer.id} className="border-b last:border-0">
                    <td className="py-2">{transfer.id}</td>
                    <td>{transfer.from_user}</td>
                    <td>{transfer.to_user}</td>
                    <td>{transfer.amount}</td>
                    <td>{transfer.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-slate-800 mb-3">Statement Files</h2>
            <div className="space-y-3">
              {statements.map((statement) => (
                <div key={statement.id} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="font-semibold text-sm">{statement.filename}</p>
                  <pre className="text-xs text-slate-600 whitespace-pre-wrap mt-1">{statement.content}</pre>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-slate-800 mb-3">Import Statement dari URL</h2>
            <form onSubmit={importStatement} className="space-y-3">
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold text-sm">
                Fetch URL
              </button>
            </form>
            {importResult && (
              <pre className="mt-4 p-3 bg-slate-900 text-green-300 text-xs rounded-lg overflow-auto max-h-72 whitespace-pre-wrap">
                {importResult}
              </pre>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Statements;

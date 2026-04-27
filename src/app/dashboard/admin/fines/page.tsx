'use client';

import { useEffect, useMemo, useState } from 'react';

type FineRecord = {
  _id: string;
  amount: number;
  collectedAt: string;
  status: string;
  patron: { name: string; email?: string };
  book: { title: string; isbn?: string };
  collectedBy: { name: string; role?: string };
};

type PatronSummary = {
  patronName: string;
  total: number;
  count: number;
};

export default function AdminFinesPage() {
  const [fines, setFines] = useState<FineRecord[]>([]);
  const [patronSummary, setPatronSummary] = useState<PatronSummary[]>([]);
  const [totalCollected, setTotalCollected] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchFines = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/admin/fines', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to load fines');
      }

      setFines(data.fines || []);
      setTotalCollected(data.summary?.totalCollected || 0);
      setPatronSummary(data.summary?.byPatron || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load fines');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFines();
  }, []);

  const filteredFines = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return fines;
    return fines.filter((fine) => {
      const patronName = fine.patron?.name?.toLowerCase() || '';
      const patronEmail = fine.patron?.email?.toLowerCase() || '';
      const bookTitle = fine.book?.title?.toLowerCase() || '';
      const collectorName = fine.collectedBy?.name?.toLowerCase() || '';
      return (
        patronName.includes(q) ||
        patronEmail.includes(q) ||
        bookTitle.includes(q) ||
        collectorName.includes(q)
      );
    });
  }, [fines, search]);

  const totalRecords = useMemo(() => filteredFines.length, [filteredFines]);

  return (
    <div className="admin-fines-page">
      <div className="admin-header">
        <h1 className="admin-title">Fine Collection Overview</h1>
        <p className="admin-subtitle">Track collected amounts by patron and by book.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div>
            <div className="stat-label">Total Collected</div>
            <div className="stat-value stat-green">Rs {totalCollected.toFixed(2)}</div>
          </div>
        </div>
        <div className="stat-card">
          <div>
            <div className="stat-label">Fine Records</div>
            <div className="stat-value stat-blue">{totalRecords}</div>
          </div>
        </div>
      </div>

      <div className="search-wrap">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by patron, email, book, or collector..."
          className="search-input"
        />
      </div>

      {loading ? (
        <p className="state-text">Loading fines...</p>
      ) : error ? (
        <p className="state-text error-text">{error}</p>
      ) : (
        <>
          <div className="section-card">
            <h2 className="section-title">Patron Collection Totals</h2>
            {patronSummary.length === 0 ? (
              <p className="empty-state">No patron totals available.</p>
            ) : (
              <div className="table-wrap">
                <table className="fines-table">
                  <thead className="fines-table-head">
                    <tr>
                      <th className="fines-th">Patron</th>
                      <th className="fines-th">Fine Count</th>
                      <th className="fines-th">Total Collected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patronSummary.map((item) => (
                      <tr key={item.patronName} className="fines-row">
                        <td className="fines-td strong-text">{item.patronName}</td>
                        <td className="fines-td">{item.count}</td>
                        <td className="fines-td strong-green">Rs {item.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="section-card">
            <h2 className="section-title">Collected Fine History</h2>
            {filteredFines.length === 0 ? (
              <p className="empty-state">No fine collections match your search.</p>
            ) : (
              <div className="table-wrap">
                <table className="fines-table">
                  <thead className="fines-table-head">
                    <tr>
                      <th className="fines-th">Patron</th>
                      <th className="fines-th">Book</th>
                      <th className="fines-th">Amount</th>
                      <th className="fines-th">Collected By</th>
                      <th className="fines-th">Collected At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFines.map((fine) => (
                      <tr key={fine._id} className="fines-row">
                        <td className="fines-td">
                          <div className="strong-text">{fine.patron?.name || 'Unknown'}</div>
                          <div className="sub-text">{fine.patron?.email || ''}</div>
                        </td>

                        <td className="fines-td">
                          <div className="strong-text">{fine.book?.title || 'Unknown'}</div>
                          <div className="sub-text">{fine.book?.isbn || ''}</div>
                        </td>

                        <td className="fines-td strong-green">
                          Rs {(fine.amount || 0).toFixed(2)}
                        </td>

                        <td className="fines-td">
                          <div className="strong-text">{fine.collectedBy?.name || 'Unknown'}</div>
                          <div className="sub-text">{fine.collectedBy?.role || ''}</div>
                        </td>

                        <td className="fines-td sub-text">
                          {new Date(fine.collectedAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
      <style jsx>{`
        .admin-fines-page { min-height: 100vh; padding: 20px; background: #f5f7fb; color: #111827; }
        .admin-header { margin-bottom: 16px; }
        .admin-title { font-size: 32px; margin: 0; color: #111827; font-weight: 700; }
        .admin-subtitle { margin-top: 6px; color: #6b7280; }
        .stats-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
        .stat-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
        .stat-label { color: #6b7280; font-size: 13px; }
        .stat-value { margin-top: 8px; font-size: 30px; font-weight: 700; }
        .stat-green { color: #059669; }
        .stat-blue { color: #2563eb; }
        .search-wrap { margin-bottom: 16px; }
        .search-input {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 14px;
          background: #ffffff;
          color: #111827;
        }
        .search-input::placeholder { color: #9ca3af; }
        .search-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }
        .state-text { text-align: center; color: #4b5563; padding: 12px; }
        .error-text { color: #b91c1c; }
        .section-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; margin-bottom: 16px; }
        .section-title { margin: 0 0 10px 0; font-size: 22px; font-weight: 700; color: #1f2937; }
        .empty-state { color: #6b7280; text-align: center; padding: 14px; }
        .table-wrap { overflow-x: auto; border: 1px solid #e5e7eb; border-radius: 10px; }
        .fines-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .fines-table-head { background: #f3f4f6; }
        .fines-th { text-align: left; padding: 12px; color: #4b5563; font-weight: 600; border-bottom: 1px solid #e5e7eb; }
        .fines-row { border-top: 1px solid #f1f5f9; }
        .fines-row:hover { background: #f9fafb; }
        .fines-td { padding: 12px; color: #111827; vertical-align: top; }
        .strong-text { font-weight: 600; color: #111827; }
        .strong-green { font-weight: 700; color: #059669; }
        .sub-text { font-size: 12px; color: #6b7280; }

        :global(.dark) .admin-fines-page {
          background: #0f172a;
          color: #e5e7eb;
        }
        :global(.dark) .admin-title { color: #f8fafc; }
        :global(.dark) .admin-subtitle { color: #94a3b8; }
        :global(.dark) .stat-card,
        :global(.dark) .section-card,
        :global(.dark) .table-wrap {
          background: #111827;
          border-color: #334155;
        }
        :global(.dark) .stat-label { color: #94a3b8; }
        :global(.dark) .search-input {
          background: #0b1220;
          border-color: #334155;
          color: #e5e7eb;
        }
        :global(.dark) .search-input::placeholder { color: #94a3b8; }
        :global(.dark) .search-input:focus {
          border-color: #60a5fa;
          box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.25);
        }
        :global(.dark) .state-text { color: #cbd5e1; }
        :global(.dark) .error-text { color: #fca5a5; }
        :global(.dark) .section-title,
        :global(.dark) .strong-text,
        :global(.dark) .fines-td {
          color: #f1f5f9;
        }
        :global(.dark) .empty-state,
        :global(.dark) .sub-text,
        :global(.dark) .fines-th {
          color: #94a3b8;
        }
        :global(.dark) .fines-table-head { background: #1e293b; }
        :global(.dark) .fines-th { border-bottom-color: #334155; }
        :global(.dark) .fines-row { border-top-color: #1f2937; }
        :global(.dark) .fines-row:hover { background: #1e293b; }
        :global(.dark) .strong-green { color: #34d399; }

        @media (max-width: 900px) {
          .stats-grid { grid-template-columns: 1fr; }
          .admin-title { font-size: 26px; }
        }
      `}</style>
    </div>
  );
}
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

  const totalRecords = useMemo(() => fines.length, [fines]);

  return (
    <div className="dashboard-page-container">
      <div className="page-header">
        <h1 className="dashboard-title">Fine Collection Overview</h1>
        <p className="page-subtitle">Track collected amounts by patron and by book.</p>
      </div>

      <div className="dashboard-stats-grid">
        <div className="stat-card">
          <div>
            <div className="stat-label">Total Collected</div>
            <div className="stat-value">Rs {totalCollected.toFixed(2)}</div>
          </div>
        </div>
        <div className="stat-card">
          <div>
            <div className="stat-label">Fine Records</div>
            <div className="stat-value">{totalRecords}</div>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="loading-text">Loading fines...</p>
      ) : error ? (
        <p className="loading-text">{error}</p>
      ) : (
        <>
          <div className="account-section-card" style={{ marginBottom: '1rem' }}>
            <h2 className="account-section-heading">Patron Collection Totals</h2>
            {patronSummary.length === 0 ? (
              <p className="no-items-message">No patron totals available.</p>
            ) : (
              <div className="overdue-table-container overflow-x-auto">
                <table className="overdue-table min-w-full border border-gray-300">
                  <thead className="overdue-table-header bg-gray-100">
                    <tr>
                      <th className="overdue-table-th px-4 py-2 border">Patron</th>
                      <th className="overdue-table-th px-4 py-2 border">Fine Count</th>
                      <th className="overdue-table-th px-4 py-2 border">Total Collected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patronSummary.map((item) => (
                      <tr key={item.patronName} className="overdue-table-row border-t">
                        <td className="overdue-table-td px-4 py-2">{item.patronName}</td>
                        <td className="overdue-table-td px-4 py-2">{item.count}</td>
                        <td className="overdue-table-td px-4 py-2">Rs {item.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="account-section-card">
            <h2 className="account-section-heading">Collected Fine History</h2>
            {fines.length === 0 ? (
              <p className="no-items-message">No fine collections recorded yet.</p>
            ) : (
              <div className="overdue-table-container overflow-x-auto">
                <table className="overdue-table min-w-full border border-gray-300">
                  <thead className="overdue-table-header bg-gray-100">
                    <tr>
                      <th className="overdue-table-th px-4 py-2 border">Patron</th>
                      <th className="overdue-table-th px-4 py-2 border">Book</th>
                      <th className="overdue-table-th px-4 py-2 border">Amount</th>
                      <th className="overdue-table-th px-4 py-2 border">Collected By</th>
                      <th className="overdue-table-th px-4 py-2 border">Collected At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fines.map((fine) => (
                      <tr key={fine._id} className="overdue-table-row border-t">
                        <td className="overdue-table-td px-4 py-2">
                          {fine.patron?.name || 'Unknown'}
                          <br />
                          <span className="text-xs text-gray-500">{fine.patron?.email || ''}</span>
                        </td>
                        <td className="overdue-table-td px-4 py-2">
                          {fine.book?.title || 'Unknown'}
                          <br />
                          <span className="text-xs text-gray-500">{fine.book?.isbn || ''}</span>
                        </td>
                        <td className="overdue-table-td px-4 py-2">Rs {(fine.amount || 0).toFixed(2)}</td>
                        <td className="overdue-table-td px-4 py-2">
                          {fine.collectedBy?.name || 'Unknown'}
                          <br />
                          <span className="text-xs text-gray-500">{fine.collectedBy?.role || ''}</span>
                        </td>
                        <td className="overdue-table-td px-4 py-2">{new Date(fine.collectedAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

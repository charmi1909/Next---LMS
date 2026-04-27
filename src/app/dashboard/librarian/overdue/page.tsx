'use client';

import { useEffect, useState } from 'react';

type OverdueItem = {
  _id: string;
  bookId: string;
  fine: number;
  fineCollected: boolean;
  book: {
    title: string;
    isbn: string;
  };
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  dueDate: string;
};

type CollectedFine = {
  borrowerName: string;
  borrowerId: string;
  bookTitle: string;
  bookId: string;
  fineAmount: number;
  collectedAt: string;
};

export default function OverduePage() {
  const [overdueItems, setOverdueItems] = useState<OverdueItem[]>([]);
  const [collectedFines, setCollectedFines] = useState<CollectedFine[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  const fetchOverdueItems = async () => {
    try {
      const [overdueRes, historyRes] = await Promise.all([
        fetch('/api/overdue'),
        fetch('/api/admin/fines'),
      ]);
      if (!overdueRes.ok) throw new Error('Failed to fetch overdue items');
      const overdueData = await overdueRes.json();
      setOverdueItems(overdueData);

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        const normalized = (historyData.fines || []).map((f: any) => ({
          borrowerName: f.patron?.name || 'Unknown',
          borrowerId: f.patron?.email || 'N/A',
          bookTitle: f.book?.title || 'Unknown',
          bookId: f.book?.isbn || 'N/A',
          fineAmount: f.amount || 0,
          collectedAt: f.collectedAt,
        }));
        setCollectedFines(normalized);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCollectFine = async (borrowId: string) => {
    try {
      const res = await fetch('/api/circulation/fines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ borrowId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const title = data?.collectedFine?.bookTitle || 'book';
        setMessage(`Fine collected successfully for "${title}".`);
        setMessageType('success');
        fetchOverdueItems(); // Refresh overdue list

        // Add to collected fines list
        if (data.collectedFine) {
          setCollectedFines((prev) => [data.collectedFine, ...prev]);
        }
      } else {
        setMessage(data.message || 'Error collecting fine.');
        setMessageType('error');
      }
    } catch (err) {
      setMessage('Server error collecting fine.');
      setMessageType('error');
    }

    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 3000);
  };

  useEffect(() => {
    fetchOverdueItems();
  }, []);

  return (
    <div className="overdue-page">
      <div className="overdue-content">
      <div className="overdue-header">
        <h1 className="overdue-title">Overdue Management</h1>
        <p className="overdue-subtitle">Collect fines and close overdue borrow records.</p>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <p className="summary-label">Overdue Items</p>
          <p className="summary-value">{overdueItems.length}</p>
        </div>
        <div className="summary-card">
          <p className="summary-label">Collected Records</p>
          <p className="summary-value summary-value-green">{collectedFines.length}</p>
        </div>
        <div className="summary-card">
          <p className="summary-label">Pending Collection</p>
          <p className="summary-value summary-value-amber">
            {overdueItems.filter((item) => !item.fineCollected).length}
          </p>
        </div>
      </div>

      {message && (
        <div className={`status-banner ${messageType === 'success' ? 'status-success' : 'status-error'}`}>
          {message}
        </div>
      )}

      {loading ? (
        <p className="overdue-message">Loading overdue items...</p>
      ) : overdueItems.length === 0 ? (
        <p className="overdue-message italic">No overdue items found.</p>
      ) : (
        <div className="table-wrap">
          <table className="overdue-table">
            <thead className="overdue-table-header">
              <tr>
                <th className="overdue-table-th">Title</th>
                <th className="overdue-table-th">ISBN</th>
                <th className="overdue-table-th">Borrower</th>
                <th className="overdue-table-th">Due Date</th>
                <th className="overdue-table-th">Fine</th>
                <th className="overdue-table-th">Action</th>
              </tr>
            </thead>
            <tbody>
              {overdueItems.map((item) => (
                <tr key={item._id} className="overdue-table-row">
                  <td className="overdue-table-td">{item.book?.title || 'N/A'}</td>
                  <td className="overdue-table-td">
                    {item.book?.isbn || 'N/A'}
                    <br />
                    <span className="muted-text">Book ID: {item.bookId}</span>
                  </td>
                  <td className="overdue-table-td">
                    {item.userId?.name || 'Unknown'}
                    <br />
                    <span className="muted-text">{item.userId?.email}</span>
                  </td>
                  <td className="overdue-table-td">
                    {new Date(item.dueDate).toLocaleDateString()}
                  </td>
                  <td className="overdue-table-td">
                    ₹ {item.fine?.toFixed(2) || '0.00'}
                  </td>
                  <td className="overdue-table-td">
                    {item.fineCollected ? (
                      <span className="fine-collected-tag">Fine Collected</span>
                    ) : (
                      <button
                        className="collect-btn"
                        onClick={() => handleCollectFine(item._id)}
                      >
                        Collect Fine
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Collected Fines Section */}
      {collectedFines.length > 0 && (
        <div className="collected-card">
          <h2 className="collected-title">Collected Fines History</h2>
          <div className="table-wrap">
            <table className="overdue-table">
              <thead className="overdue-table-header">
              <tr>
                <th className="overdue-table-th">Borrower</th>
                <th className="overdue-table-th">Book Title</th>
                <th className="overdue-table-th">Fine Amount</th>
                <th className="overdue-table-th">Collected At</th>
              </tr>
            </thead>
            <tbody>
              {collectedFines.map((f, idx) => (
                <tr key={idx} className="overdue-table-row">
                  <td className="overdue-table-td">
                    {f.borrowerName} <br />
                    <span className="muted-text">ID: {f.borrowerId}</span>
                  </td>
                  <td className="overdue-table-td">
                    {f.bookTitle} <br />
                    <span className="muted-text">Book ID: {f.bookId}</span>
                  </td>
                  <td className="overdue-table-td">₹ {f.fineAmount.toFixed(2)}</td>
                  <td className="overdue-table-td">
                    {new Date(f.collectedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
      <style jsx>{`
        .overdue-page { padding: 16px; background: #f5f7fb; min-height: 100vh; }
        .overdue-content { max-width: 1100px; margin: 0 auto; }
        .overdue-header { margin-bottom: 12px; text-align: left; }
        .overdue-title { font-size: 28px; line-height: 1.3; font-weight: 700; color: #1f2937; margin: 0; }
        .overdue-subtitle { margin-top: 4px; color: #6b7280; font-size: 14px; }
        .summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
        .summary-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
        .summary-label { margin: 0; color: #6b7280; font-size: 13px; display: block; }
        .summary-value { margin: 6px 0 0; font-size: 24px; line-height: 1; font-weight: 700; color: #1f2937; display: block; }
        .summary-value-green { color: #059669; }
        .summary-value-amber { color: #d97706; }
        .status-banner { margin-bottom: 12px; border-radius: 10px; padding: 10px 12px; border: 1px solid; font-weight: 500; }
        .status-success { background: #ecfdf5; border-color: #a7f3d0; color: #047857; }
        .status-error { background: #fef2f2; border-color: #fecaca; color: #b91c1c; }
        .table-wrap { overflow-x: auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; }
        .overdue-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .overdue-table-header { background: #f3f4f6; }
        .overdue-table-th { text-align: left; color: #4b5563; font-weight: 600; padding: 12px; border-bottom: 1px solid #e5e7eb; }
        .overdue-table-row { border-top: 1px solid #f1f5f9; }
        .overdue-table-row:hover { background: #f9fafb; }
        .overdue-table-td { padding: 12px; color: #111827; vertical-align: top; }
        .muted-text { font-size: 12px; color: #6b7280; }
        .fine-collected-tag { background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 999px; font-size: 12px; font-weight: 600; }
        .collect-btn { background: #2563eb; color: #fff; border: none; border-radius: 8px; padding: 8px 12px; cursor: pointer; }
        .collect-btn:hover { background: #1d4ed8; }
        .collected-card { margin-top: 20px; }
        .collected-title { margin: 0 0 10px 0; font-size: 20px; font-weight: 700; color: #1f2937; }
        @media (max-width: 900px) {
          .summary-grid { grid-template-columns: 1fr; }
          .overdue-title { font-size: 24px; }
        }
      `}</style>
    </div>
  );
}

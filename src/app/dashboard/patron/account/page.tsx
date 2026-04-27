'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface BorrowRecord {
  _id: string;
  bookId: {
    title: string;
    author: string;
  };
  borrowedAt: string;
  returnedAt?: string;
  dueDate: string;
  fine?: number;
}

interface CollectedFineRecord {
  fineId: string;
  amount: number;
  collectedAt: string;
  bookTitle: string;
  reason: string;
}

interface PaidBookRecord {
  borrowId: string;
  bookTitle: string;
  amountPaid: number;
}

const MessageModal: React.FC<{
  message: string | null;
  type: 'success' | 'error' | 'info';
  paidBooks?: PaidBookRecord[];
  onClose: () => void;
}> = ({ message, type, paidBooks = [], onClose }) => {
  if (!message) return null;

  let contentBgClass = '';
  let headerColorClass = '';

  if (type === 'success') {
    contentBgClass = 'message-modal-success-bg';
    headerColorClass = 'message-modal-success-text';
  } else if (type === 'error') {
    contentBgClass = 'message-modal-error-bg';
    headerColorClass = 'message-modal-error-text';
  } else if (type === 'info') {
    contentBgClass = 'message-modal-info-bg';
    headerColorClass = 'message-modal-info-text';
  }

  return (
    <div className="message-modal-overlay">
      <div
        className={`message-modal-content ${contentBgClass} ${
          type === 'success' ? 'border-2 border-green-200 shadow-xl shadow-green-100' : ''
        }`}
      >
        <div className="message-modal-header">
          <h3 className={`message-modal-title ${headerColorClass}`}>
            {type === 'success' ? 'Success!' : type === 'error' ? 'Error!' : 'Info'}
          </h3>
          <button onClick={onClose} className="message-modal-close-btn">&times;</button>
        </div>
        <p className="message-modal-body">{message}</p>
        {type === 'success' && paidBooks.length > 0 && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3">
            <p className="text-sm font-semibold text-green-800 mb-2">Paid Fine Details</p>
            <ul className="space-y-2">
              {paidBooks.map((item) => (
                <li key={item.borrowId} className="text-sm text-green-900">
                  <span className="font-medium">{item.bookTitle}</span> - Rs {item.amountPaid.toFixed(2)}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="message-modal-actions">
          <button
            onClick={onClose}
            className="message-modal-ok-btn"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default function AccountManagementPage() {
  const [records, setRecords] = useState<BorrowRecord[]>([]);
  const [totalFines, setTotalFines] = useState<number>(0);
  const [collectedFineHistory, setCollectedFineHistory] = useState<CollectedFineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [messageModal, setMessageModal] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [lastPaidBooks, setLastPaidBooks] = useState<PaidBookRecord[]>([]);
  const [analytics, setAnalytics] = useState<{
    summary: { totalBorrowed: number; currentlyBorrowed: number };
    monthlyBorrowTrend: { label: string; count: number }[];
    topAuthors: { author: string; count: number }[];
  } | null>(null);

  const closeMessageModal = () => {
    setMessageModal(null);
    setLastPaidBooks([]);
  };
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAccountData = async () => {
    setLoading(true);
    setError(null);
    try {
      // ✅ Fetch borrow history
      const historyRes = await fetch('/api/patron/account/history', { credentials: 'include' });
      const historyText = await historyRes.text();

      let historyData;
      try {
        historyData = JSON.parse(historyText);
      } catch {
        setError('Invalid history data format');
        setMessageModal({ text: 'Invalid history data format', type: 'error' });
        setLoading(false);
        return;
      }

      if (historyRes.ok && historyData.success) {
        const formattedHistory = historyData.history.map((record: any) => ({
          ...record,
          returnedAt: record.returnedAt ? new Date(record.returnedAt) : null,
        }));
        setRecords(formattedHistory);
      } else {
        throw new Error(historyData.message || 'Failed to fetch history');
      }

      // ✅ Fetch fines
      const finesRes = await fetch('/api/patron/account/fines', { credentials: 'include' });
      const finesText = await finesRes.text();

      let finesData;
      try {
        finesData = JSON.parse(finesText);
      } catch {
        setError('Invalid fines data format');
        setMessageModal({ text: 'Invalid fines data format', type: 'error' });
        setLoading(false);
        return;
      }

      if (finesRes.ok && finesData.success) {
        setTotalFines(finesData.totalFines || 0);
        setCollectedFineHistory(finesData.collected || []);
      } else {
        throw new Error(finesData.message || 'Failed to fetch fines');
      }

      const analyticsRes = await fetch('/api/patron/analytics', { credentials: 'include' });
      const analyticsData = await analyticsRes.json();
      if (analyticsRes.ok && analyticsData.success) {
        setAnalytics({
          summary: analyticsData.summary,
          monthlyBorrowTrend: analyticsData.monthlyBorrowTrend || [],
          topAuthors: analyticsData.topAuthors || [],
        });
      }
    } catch (err: any) {
      setError(err.message);
      setMessageModal({ text: err.message, type: 'error' });
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountData();
  }, []);

  const handlePayFines = async () => {
    try {
      const res = await fetch('/api/patron/account/pay-fines', {
        method: 'POST',
        credentials: 'include',
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const paidBooks = Array.isArray(data.paidBooks) ? data.paidBooks : [];
        setLastPaidBooks(paidBooks);
        showToast(`Fines paid successfully. Rs ${(data.collectedAmount || 0).toFixed(2)} paid.`, 'success');
        setMessageModal({
          text: `Payment successful! Total paid: Rs ${(data.collectedAmount || 0).toFixed(2)}.`,
          type: 'success',
        });
        fetchAccountData(); // refresh account data
      } else {
        throw new Error(data.message || 'Error paying fines');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
      setMessageModal({ text: err.message, type: 'error' });
    }
  };

  const currentItems = records.filter(r => !r.returnedAt);

  return (
    <div className="account-management-page">
      <style>
        {`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; }
        `}
      </style>

      {toast && (
        <div
          className={`toast-notification ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}
        >
          {toast.message}
        </div>
      )}

      <div className="account-content-wrapper">
        <h1 className="account-page-heading">Account Management</h1>

        {loading && <p className="loading-message">Loading account data...</p>}
        {error && (
          <div className="error-card">
            <p className="error-title">Error!</p>
            <p className="error-message">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <section className="reserve-info-card">
              <p className="text-lg mb-2">Want to place a hold on a book that's currently borrowed?</p>
              <p className="text-md">
                You can do this from the{' '}
                <Link href="/dashboard/patron/item" className="link-text">
                  All Books
                </Link>{' '}
                page.
              </p>
            </section>

            {/* Current Borrowed Items */}
            <section className="account-section-card">
              <h2 className="account-section-heading">Current Borrowed Items</h2>
              {currentItems.length === 0 ? (
                <p className="no-items-message">No currently borrowed items.</p>
              ) : (
                <ul className="borrow-records-list">
                  {currentItems.map((record) => (
                    <li key={record._id} className="borrow-record-item">
                      <p className="item-title"><strong>Title:</strong> {record.bookId?.title || 'N/A'}</p>
                      <p className="item-author"><strong>Author:</strong> {record.bookId?.author || 'N/A'}</p>
                      <p className="item-date"><strong>Borrowed At:</strong> {new Date(record.borrowedAt).toLocaleDateString()}</p>
                      <p className="item-date"><strong>Due Date:</strong> {new Date(record.dueDate).toLocaleDateString()}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Borrowing History */}
            <section className="account-section-card">
              <h2 className="account-section-heading">Borrowing History</h2>
              {records.length === 0 ? (
                <p className="no-items-message">No borrowing history found.</p>
              ) : (
                <ul className="borrow-records-list">
                  {records.map((record) => (
                  <li key={record._id} className="borrow-record-item">
  <p className="item-title">
    <strong>Title:</strong> {record.bookId?.title || 'N/A'}
  </p>

  <p className="item-author">
    <strong>Author:</strong> {record.bookId?.author || 'N/A'}
  </p>

  <p className="item-date">
    <strong>Borrowed At:</strong> {new Date(record.borrowedAt).toLocaleDateString()}
  </p>

  <p className="item-date">
    <strong>Returned At:</strong> {record.returnedAt 
      ? new Date(record.returnedAt).toLocaleDateString() 
      : 'Not returned'}
  </p>

  <p className="fine-text">
    <strong>Fine:</strong> ₹{(record.fine ?? 0).toFixed(2)}
  </p>
</li>
                  ))}
                </ul>
              )}
            </section>

            {/* Outstanding Fines */}
            <section className="account-section-card">
              <h2 className="account-section-heading">Outstanding Fines & Overdue Management</h2>
              {totalFines > 0 ? (
                <div>
                  <p className="fine-text"><strong>Total Outstanding Fines:</strong> ₹{totalFines.toFixed(2)}</p>
                  <button onClick={handlePayFines} className="pay-fine-btn">Pay Fines</button>
                </div>
              ) : (
                <p className="no-items-message">No outstanding fines.</p>
              )}
            </section>

            <section className="account-section-card">
              <h2 className="account-section-heading">Collected Fines History</h2>
              {collectedFineHistory.length === 0 ? (
                <p className="no-items-message">No fine collections yet.</p>
              ) : (
                <ul className="borrow-records-list">
                  {collectedFineHistory.map((fine) => (
                    <li key={fine.fineId} className="borrow-record-item">
                      <p className="item-title"><strong>Book:</strong> {fine.bookTitle}</p>
                      <p className="item-date"><strong>Amount Collected:</strong> ₹{fine.amount.toFixed(2)}</p>
                      <p className="item-date"><strong>Collected At:</strong> {new Date(fine.collectedAt).toLocaleString()}</p>
                      <p className="item-date"><strong>Reason:</strong> {fine.reason}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="account-section-card">
              <h2 className="account-section-heading">Reading History Analytics</h2>
              {!analytics ? (
                <p className="no-items-message">Analytics unavailable right now.</p>
              ) : (
                <>
                  <p className="item-date"><strong>Total Borrowed:</strong> {analytics.summary.totalBorrowed}</p>
                  <p className="item-date"><strong>Currently Borrowed:</strong> {analytics.summary.currentlyBorrowed}</p>

                  <div style={{ marginTop: '12px' }}>
                    <h3 className="text-lg">Top Authors</h3>
                    {analytics.topAuthors.length === 0 ? (
                      <p className="no-items-message">No author data yet.</p>
                    ) : (
                      <ul className="borrow-records-list">
                        {analytics.topAuthors.map((a) => (
                          <li key={a.author} className="borrow-record-item">
                            <p className="item-title">{a.author || 'Unknown'}</p>
                            <p className="item-date">Borrow count: {a.count}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div style={{ marginTop: '12px' }}>
                    <h3 className="text-lg">Monthly Borrow Trend</h3>
                    {analytics.monthlyBorrowTrend.length === 0 ? (
                      <p className="no-items-message">No trend data yet.</p>
                    ) : (
                      <ul className="borrow-records-list">
                        {analytics.monthlyBorrowTrend.map((m) => (
                          <li key={m.label} className="borrow-record-item">
                            <p className="item-title">{m.label}</p>
                            <p className="item-date">Books borrowed: {m.count}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </section>
          </>
        )}

        <MessageModal
          message={messageModal?.text || null}
          type={messageModal?.type || 'info'}
          paidBooks={messageModal?.type === 'success' ? lastPaidBooks : []}
          onClose={closeMessageModal}
        />
      </div>
    </div>
  );
}

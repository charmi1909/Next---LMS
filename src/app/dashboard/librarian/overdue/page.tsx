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

  const fetchOverdueItems = async () => {
    try {
      const res = await fetch('/api/overdue');
      if (!res.ok) throw new Error('Failed to fetch overdue items');
      const data = await res.json();
      setOverdueItems(data);
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
        setMessage(`Fine collected successfully.`);
        fetchOverdueItems(); // Refresh overdue list

        // Add to collected fines list
        if (data.collectedFine) {
          setCollectedFines((prev) => [...prev, data.collectedFine]);
        }
      } else {
        setMessage(data.message || 'Error collecting fine.');
      }
    } catch (err) {
      setMessage('Server error collecting fine.');
    }

    setTimeout(() => setMessage(''), 3000);
  };

  useEffect(() => {
    fetchOverdueItems();
  }, []);

  return (
    <div className="overdue-page-container p-4">
      <h1 className="overdue-title text-2xl font-bold mb-4">Overdue Items</h1>

      {message && (
        <div className="overdue-message text-green-600 mb-2">{message}</div>
      )}

      {loading ? (
        <p className="overdue-message">Loading overdue items...</p>
      ) : overdueItems.length === 0 ? (
        <p className="overdue-message italic">No overdue items found.</p>
      ) : (
        <div className="overdue-table-container overflow-x-auto">
          <table className="overdue-table min-w-full border border-gray-300">
            <thead className="overdue-table-header bg-gray-100">
              <tr>
                <th className="overdue-table-th px-4 py-2 border">Title</th>
                <th className="overdue-table-th px-4 py-2 border">ISBN</th>
                <th className="overdue-table-th px-4 py-2 border">Borrower</th>
                <th className="overdue-table-th px-4 py-2 border">Due Date</th>
                <th className="overdue-table-th px-4 py-2 border">Fine</th>
                <th className="overdue-table-th px-4 py-2 border">Action</th>
              </tr>
            </thead>
            <tbody>
              {overdueItems.map((item) => (
                <tr key={item._id} className="overdue-table-row border-t">
                  <td className="overdue-table-td px-4 py-2">{item.book?.title || 'N/A'}</td>
                  <td className="overdue-table-td px-4 py-2">
                    {item.book?.isbn || 'N/A'}
                    <br />
                    <span className="text-xs text-gray-500">Book ID: {item.bookId}</span>
                  </td>
                  <td className="overdue-table-td px-4 py-2">
                    {item.userId?.name || 'Unknown'}
                    <br />
                    <span className="text-xs text-gray-500">{item.userId?.email}</span>
                  </td>
                  <td className="overdue-table-td px-4 py-2">
                    {new Date(item.dueDate).toLocaleDateString()}
                  </td>
                  <td className="overdue-table-td px-4 py-2">
                    ₹ {item.fine?.toFixed(2) || '0.00'}
                  </td>
                  <td className="overdue-table-td px-4 py-2">
                    {item.fineCollected ? (
                      <span className="text-green-600 font-semibold">Fine Collected</span>
                    ) : (
                      <button
                        className="text-blue-600 underline"
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
        <div className="collected-fines mt-8">
          <h2 className="text-xl font-semibold mb-3">Recently Collected Fines</h2>
          <table className="min-w-full border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 border">Borrower</th>
                <th className="px-4 py-2 border">Book Title</th>
                <th className="px-4 py-2 border">Fine Amount</th>
                <th className="px-4 py-2 border">Collected At</th>
              </tr>
            </thead>
            <tbody>
              {collectedFines.map((f, idx) => (
                <tr key={idx} className="border-t">
                  <td className="px-4 py-2">
                    {f.borrowerName} <br />
                    <span className="text-xs text-gray-500">ID: {f.borrowerId}</span>
                  </td>
                  <td className="px-4 py-2">
                    {f.bookTitle} <br />
                    <span className="text-xs text-gray-500">Book ID: {f.bookId}</span>
                  </td>
                  <td className="px-4 py-2">₹ {f.fineAmount.toFixed(2)}</td>
                  <td className="px-4 py-2">
                    {new Date(f.collectedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

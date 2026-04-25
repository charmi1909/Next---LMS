'use client';

import { useEffect, useState } from 'react';

// Types
type Book = {
  title: string;
  author: string;
};

type Hold = {
  _id: string;
  status: string;
  holdPlacedAt: string;
  bookId: Book | null;
};

export default function PatronHoldsPage() {
  const [holds, setHolds] = useState<Hold[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  // State to control the visibility and data for the confirmation modal
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; holdId: string | null }>({
    open: false,
    holdId: null,
  });

  useEffect(() => {
    fetchHolds();
  }, []);

  // Function to fetch patron holds from the API
  const fetchHolds = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/patron/holds', {
        method: 'GET',
        credentials: 'include', // Ensures cookies (e.g., JWT) are sent
      });

      if (!res.ok) {
        // Attempt to parse error message from response, or use a generic one
        const errorData = await res.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || 'Failed to fetch holds.');
      }

      const data: Hold[] = await res.json();
      setHolds(data);
    } catch (err: any) {
      console.error("Fetch holds error:", err); // Log error for debugging
      setError(err.message || 'Failed to load your holds.');
    } finally {
      setLoading(false);
    }
  };

  // Function to display a toast notification
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    // Automatically hide toast after 3 seconds
    setTimeout(() => setToast(null), 3000);
  };

  // Function to handle the cancellation of a hold
  const cancelHold = async (holdId: string) => {
    // Set the ID of the hold being cancelled to show loading state on the button
    setCancelingId(holdId);
    try {
      const res = await fetch('/api/patron/hold', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ holdId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to cancel hold');
      }

      // Remove the cancelled hold from the local state
      setHolds((prev) => prev.filter((h) => h._id !== holdId));
      showToast('Hold cancelled successfully.', 'success');
    } catch (err: any) {
      console.error("Cancel hold error:", err); // Log error for debugging
      showToast(err.message, 'error');
    } finally {
      // Reset canceling state and close the confirmation modal
      setCancelingId(null);
      setConfirmModal({ open: false, holdId: null });
    }
  };

  // Conditional rendering for loading state
  if (loading) {
    return (
      <div className="patron-holds-page loading-state"> {/* Apply main page class */}
        <div className="loading-message">Loading your holds...</div>
      </div>
    );
  }

  // Conditional rendering for error state
  if (error) {
    return (
      <div className="patron-holds-page error-state"> {/* Apply main page class */}
        <div className="error-card">
          <p className="error-title">Error!</p>
          <p className="error-message">{error}</p>
          <button
            onClick={fetchHolds} // Allows user to retry fetching holds
            className="error-retry-button"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="patron-holds-page"> {/* Main page container class */}
      {/* Google Font Import for 'Inter' - Global import is preferred */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          body { font-family: 'Inter', sans-serif; }
        `}
      </style>

      {/* Toast Notification Component */}
      {toast && (
        <div
          className={`toast-notification ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}
        >
          {toast.message}
        </div>
      )}

      {/* Confirmation Modal Component */}
      {confirmModal.open && (
        <div className="confirm-modal-overlay">
          <div className="confirm-modal-content">
            <div className="confirm-modal-header">
              <h3 className="confirm-modal-title">Cancel Hold</h3>
            </div>
            <p className="confirm-modal-body">
              Are you sure you want to cancel this hold? This action cannot be undone.
            </p>
            <div className="confirm-modal-actions">
              <button
                className="confirm-modal-cancel-btn"
                onClick={() => setConfirmModal({ open: false, holdId: null })}
              >
                No
              </button>
              <button
                className="confirm-modal-confirm-btn"
                onClick={() => confirmModal.holdId && cancelHold(confirmModal.holdId)}
                disabled={cancelingId === confirmModal.holdId}
              >
                {cancelingId === confirmModal.holdId ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="patron-holds-content"> {/* Main content wrapper class */}
        <h1 className="patron-holds-heading">Your Holds</h1>

        {/* Conditional rendering for no holds */}
        {holds.length === 0 ? (
          <p className="no-holds-message">You don't have any active holds.</p>
        ) : (
          <ul className="holds-list">
            {holds.map((hold) => (
              <li
                key={hold._id}
                className="hold-list-item"
              >
                <div className="hold-details">
                  {/* Display book information or message if not available */}
                  {hold.bookId ? (
                    <>
                      <h2 className="hold-item-title">{hold.bookId.title}</h2>
                      <p className="hold-item-author">Author: {hold.bookId.author || 'N/A'}</p>
                    </>
                  ) : (
                    <h2 className="hold-item-unavailable">
                      Book information not available (Book may have been removed from library)
                    </h2>
                  )}
                  {/* Display hold status and placed date */}
                  <p className="hold-item-status">
                    Status: <span className={`hold-status-${hold.status.toLowerCase().replace(/\s/g, '-')}`}>{hold.status}</span>
                  </p>
                  <p className="hold-item-date">
                    Placed on:{' '}
                    {new Date(hold.holdPlacedAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                {/* Cancel Hold Button */}
                
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { AddBookModal } from '@/app/components/AddBookModal';
import { RegisterPatronModal } from '@/app/components/RegisterPatronModal';
import Link from 'next/link';

type Stats = {
  totalBooks: number;
  borrowedBooks: number;
  overdueBooks: number;
};

export default function LibrarianDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAddBook, setShowAddBook] = useState(false);
  const [showRegisterPatron, setShowRegisterPatron] = useState(false);

  // ✅ Username handling (clean + safe)
  const [userName, setUserName] = useState('Librarian');
  const [userLoading, setUserLoading] = useState(true);

  // ✅ Fetch user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
        });

        const data = await res.json();

        if (data.success && data.user?.name) {
          setUserName(data.user.name);
        } else {
          setUserName('Librarian');
        }
      } catch {
        setUserName('Librarian');
      } finally {
        setUserLoading(false);
      }
    };

    fetchUser();
  }, []);

  // ✅ Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/librarian/stats');
        if (!res.ok) throw new Error('Failed to fetch stats');

        const data = await res.json();
        setStats(data);
      } catch (err: any) {
        setError(err.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // ✅ Fetch notifications
  useEffect(() => {
    const fetchUnreadNotifications = async () => {
      try {
        const res = await fetch(
          '/api/librarian/notifications?unreadOnly=true'
        );
        if (!res.ok) return;

        const data = await res.json();
        setUnreadNotifications(data.unreadCount || 0);
      } catch {
        setUnreadNotifications(0);
      }
    };

    fetchUnreadNotifications();
  }, []);

  const handleBookAdded = () => {
    setStats((prev) =>
      prev ? { ...prev, totalBooks: prev.totalBooks + 1 } : prev
    );
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-600">
        Loading dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600">Error: {error}</div>
    );
  }

  return (
    <div className="librarian-dashboard-page">
      {/* ✅ Welcome message */}
      <h1 className="dashboard-title">
        {userLoading ? 'Welcome...' : `Welcome, ${userName}!`}
      </h1>

      <p className="dashboard-subtitle">
        Use the sidebar to navigate through the library management system.
      </p>

      {/* Stats */}
      <div className="dashboard-stats-grid">
        <div className="stat-card">
          <h2 className="stat-card-title">Total Books</h2>
          <p className="stat-card-value">{stats?.totalBooks}</p>
          <p className="stat-card-description">Currently in catalog</p>
        </div>

        <div className="stat-card on-loan">
          <h2 className="stat-card-title">Books On Loan</h2>
          <p className="stat-card-value">{stats?.borrowedBooks}</p>
          <p className="stat-card-description">
            Currently borrowed by patrons
          </p>
        </div>

        <div className="stat-card overdue">
          <h2 className="stat-card-title">Overdue Items</h2>
          <p className="stat-card-value">{stats?.overdueBooks}</p>
          <p className="stat-card-description">Require attention</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="quick-actions-section">
        <h2 className="quick-actions-title">Quick Actions</h2>

        <div className="quick-actions-buttons">
          <button
            className="action-button add-book"
            onClick={() => setShowAddBook(true)}
          >
            Add New Book
          </button>

          <button
            className="action-button register-patron"
            onClick={() => setShowRegisterPatron(true)}
          >
            Register New Patron
          </button>

          <Link
            href="/dashboard/librarian/notifications"
            className="action-button"
          >
            Notifications ({unreadNotifications} unread)
          </Link>
        </div>
      </div>

      {/* Modals */}
      <AddBookModal
        open={showAddBook}
        onClose={() => setShowAddBook(false)}
        onBookAdded={handleBookAdded}
      />

      {showRegisterPatron && (
        <RegisterPatronModal
          onClose={() => setShowRegisterPatron(false)}
        />
      )}
    </div>
  );
}
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

type Category = 'all' | 'borrow' | 'fine' | 'availability' | 'overdue' | 'general' | 'unread';

type LibrarianNotification = {
  id: string;
  message: string;
  type: string;
  category: 'borrow' | 'fine' | 'availability' | 'overdue' | 'general';
  action: 'inform_patron' | null;
  read: boolean;
  createdAt: string;
  source: 'notification' | 'derived';
  user: { id: string; name: string; email: string; role: string } | null;
  book: { id: string; title: string; isbn: string; status: string; isAvailable: boolean } | null;
};
type NotificationsResponse = {
  items?: LibrarianNotification[];
  error?: string;
  message?: string;
};

const getErrorMessage = (value: unknown, fallback: string) => {
  if (value instanceof Error && value.message) {
    return value.message;
  }
  return fallback;
};

export default function LibrarianNotificationsPage() {
  const [items, setItems] = useState<LibrarianNotification[]>([]);
  const [activeFilter, setActiveFilter] = useState<Category>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionStatus, setActionStatus] = useState<{ id: string; type: 'success' | 'error'; message: string } | null>(null);
  const [informingId, setInformingId] = useState<string | null>(null);
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/librarian/notifications', { credentials: 'include' });
      const data = (await res.json().catch(() => ({}))) as NotificationsResponse;
      if (!res.ok) {
        throw new Error(data.error || data.message || `Failed to load notifications (${res.status})`);
      }
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to fetch notifications'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const informPatron = async (id: string) => {
    setInformingId(id);
    setError('');
    setActionStatus(null);
    try {
      const res = await fetch(`/api/librarian/notifications/${id}/inform-patron`, {
        method: 'POST',
        credentials: 'include',
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || payload.message || 'Failed to inform patron');
      await fetchNotifications();
      setActionStatus({
        id,
        type: 'success',
        message: payload.alreadyInformed ? 'Patron was already informed for this hold.' : 'Patron informed successfully.',
      });
    } catch (err) {
      console.error(err);
      setActionStatus({
        id,
        type: 'error',
        message: getErrorMessage(err, 'Could not inform patron'),
      });
    } finally {
      setInformingId(null);
    }
  };

  const getNotificationTitle = (item: LibrarianNotification) => {
    if (item.action === 'inform_patron') return 'Hold Available - Action Required';
    if (item.category === 'fine') return 'Penalty Alert';
    if (item.category === 'overdue') return 'Overdue Alert';
    if (item.category === 'borrow') return 'Borrow Activity';
    if (item.category === 'availability') return 'Availability Update';
    return 'Library Notification';
  };

  const formatNotificationTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Time unavailable';
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to mark as read');
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
    } catch (err) {
      console.error(err);
      setError('Could not mark notification as read');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete notification');
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error(err);
      setError('Could not delete notification');
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return items;
    if (activeFilter === 'unread') return items.filter((item) => !item.read);
    return items.filter((item) => item.category === activeFilter);
  }, [items, activeFilter]);

  const unreadCount = useMemo(() => items.filter((item) => !item.read).length, [items]);

  const filterTabs: { id: Category; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'borrow', label: 'Borrow/Return' },
    { id: 'fine', label: 'Penalty' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'availability', label: 'Availability' },
  ];

  return (
    <div className="notification-container">
      <div className="page-header">
        <h1 className="notifications-title">Librarian Notifications</h1>
        <p className="page-subtitle">
          Track borrow activity, overdue penalties, and book availability in one place.
        </p>
      </div>

      <div className="librarian-notification-toolbar">
        <div className="librarian-filter-tabs">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              className={`librarian-filter-tab ${activeFilter === tab.id ? 'active' : ''}`}
              onClick={() => setActiveFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button className="button-outline" onClick={fetchNotifications}>
          Refresh
        </button>
      </div>

      <div className="librarian-notification-summary">
        <span>Total: {items.length}</span>
        <span>Unread: {unreadCount}</span>
        <span>Showing: {filteredItems.length}</span>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading notifications...</p>
      ) : error ? (
        <p className="text-gray-500">{error}</p>
      ) : filteredItems.length === 0 ? (
        <p className="text-gray-500">No notifications available for this filter.</p>
      ) : (
        filteredItems.map((item) => (
          <div key={item.id} className="notification-card librarian-notification-card">
            <div>
              <p className="font-semibold text-gray-800">{getNotificationTitle(item)}</p>
              <p className="notification-message">{item.message}</p>
              <p className="notification-time">
                {formatNotificationTime(item.createdAt)}
              </p>
              <div className="librarian-notification-meta">
                <span className={`badge badge-${item.category}`}>{item.category}</span>
                {!item.read && <span className="badge badge-unread">Unread</span>}
                <span className="badge badge-source">{item.source}</span>
              </div>

              {(item.user || item.book) && (
                <div className="librarian-notification-details">
                  {item.user && (
                    <p>
                      <strong>Patron:</strong> {item.user.name}
                      {item.user.email ? ` (${item.user.email})` : ''}
                    </p>
                  )}
                  {item.book && (
                    <p>
                      <strong>Book:</strong> {item.book.title}
                      {item.book.isbn ? ` [${item.book.isbn}]` : ''}
                    </p>
                  )}
                </div>
              )}
            </div>
            {item.source === 'notification' && (
              <div className="button-group">
                {item.action === 'inform_patron' && !item.read && (
                  <button
                    onClick={() => informPatron(item.id)}
                    className="button-outline"
                    disabled={informingId === item.id}
                  >
                    {informingId === item.id ? 'Informing...' : 'Inform Patron'}
                  </button>
                )}
                {!item.read && item.action !== 'inform_patron' && (
                  <button onClick={() => markAsRead(item.id)} className="button-outline">
                    Mark Read
                  </button>
                )}
                <button onClick={() => deleteNotification(item.id)} className="button-danger">
                  Delete
                </button>
                {actionStatus?.id === item.id && (
                  <p className={actionStatus.type === 'success' ? 'text-green-600' : 'text-red-600'}>
                    {actionStatus.message}
                  </p>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

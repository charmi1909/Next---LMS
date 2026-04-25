'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

type Category = 'all' | 'unread' | 'availability' | 'general';

type PatronNotification = {
  _id: string;
  message: string;
  type: 'info' | 'warning' | 'due_soon' | 'hold_available' | string;
  read: boolean;
  createdAt: string;
};

export default function PatronNotificationsPage() {
  const [notifications, setNotifications] = useState<PatronNotification[]>([]);
  const [activeFilter, setActiveFilter] = useState<Category>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workingId, setWorkingId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      await fetch('/api/patron/notifications/sync', { method: 'POST', credentials: 'include' });
      const res = await fetch('/api/patron/notifications', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load notifications');
      setNotifications(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    setWorkingId(id);
    await fetch(`/api/patron/notifications/${id}`, { method: 'PATCH', credentials: 'include' });
    await fetchNotifications();
    setWorkingId(null);
  };

  const deleteNotification = async (id: string) => {
    setWorkingId(id);
    await fetch(`/api/patron/notifications/${id}`, { method: 'DELETE', credentials: 'include' });
    await fetchNotifications();
    setWorkingId(null);
  };

  const getPatronTitle = (type: string) => {
    if (type === 'hold_available') return 'Hold Available';
    if (type === 'due_soon') return 'Due Date Reminder';
    if (type === 'warning') return 'Important Update';
    return 'Notification';
  };

  const getCategory = (type: string): Exclude<Category, 'all' | 'unread'> => {
    if (type === 'hold_available') return 'availability';
    return 'general';
  };

  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);
  const filterTabs: { id: Category; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'availability', label: 'Availability' },
    { id: 'general', label: 'General' },
  ];
  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    if (activeFilter === 'unread') return notifications.filter((item) => !item.read);
    return notifications.filter((item) => getCategory(item.type) === activeFilter);
  }, [activeFilter, notifications]);

  if (loading) return <p className="center-text">Loading notifications...</p>;

  return (
    <div className="notification-container">
      <div className="page-header">
        <h1 className="notifications-title">Patron Notifications</h1>
        <p className="page-subtitle">
          Track hold updates, reminders, and account alerts in one place.
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
        <button className="button-outline" onClick={fetchNotifications}>Refresh</button>
      </div>

      <div className="librarian-notification-summary">
        <span>Total: {notifications.length}</span>
        <span>Unread: {unreadCount}</span>
        <span>Showing: {filteredItems.length}</span>
      </div>

      {error ? (
        <p className="text-gray-500">{error}</p>
      ) : filteredItems.length === 0 ? (
        <p className="text-gray-500">No notifications available for this filter.</p>
      ) : (
        filteredItems.map((n) => {
          const category = getCategory(n.type);
          return (
            <div key={n._id} className="notification-card librarian-notification-card">
              <div>
                <p className="font-semibold text-gray-800">{getPatronTitle(n.type)}</p>
                <p className="notification-message">{n.message}</p>
                <p className="notification-time">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </p>
                <div className="librarian-notification-meta">
                  <span className={`badge badge-${category}`}>{category}</span>
                  {!n.read && <span className="badge badge-unread">Unread</span>}
                  <span className="badge badge-source">notification</span>
                </div>
              </div>
              <div className="button-group">
                {!n.read && (
                  <button onClick={() => markAsRead(n._id)} className="button-outline" disabled={workingId === n._id}>
                    {workingId === n._id ? 'Updating...' : 'Mark as read'}
                  </button>
                )}
                <button onClick={() => deleteNotification(n._id)} className="button-danger" disabled={workingId === n._id}>
                  {workingId === n._id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
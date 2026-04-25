'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

type Notification = {
  _id: string;
  message: string;
  type: 'book_added' | 'info' | 'warning';
  read: boolean;
  createdAt: string;
  dedupeKey?: string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    const res = await fetch('/api/notifications', { credentials: 'include' });
    const data = await res.json();
    setNotifications(data);
  };

  const markAsRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: 'PATCH', credentials: 'include' });
    fetchNotifications();
  };

  const deleteNotification = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: 'DELETE', credentials: 'include' });
    fetchNotifications();
  };

  const isSystemConfig = (n: Notification) => (n.dedupeKey || '').startsWith('system-config:');

  const getBadgeClass = (n: Notification) => {
    if (isSystemConfig(n)) return 'badge badge-info';
    if (n.type === 'book_added') return 'badge badge-book';
    if (n.type === 'warning') return 'badge badge-warning';
    return 'badge badge-info';
  };

  const getBadgeLabel = (n: Notification) => {
    if (isSystemConfig(n)) return 'system configuration';
    return n.type;
  };

  return (
    <div className="notification-container">
      <div className="page-header">
        <h1 className="notifications-title">Admin Notifications</h1>
        <p className="page-subtitle">Track system configuration and catalog update alerts.</p>
      </div>

      {notifications.length === 0 ? (
        <p className="text-gray-500">No notifications found.</p>
      ) : (
        notifications.map((n) => (
          <div key={n._id} className="notification-card">
            <div>
              <p className="notification-message">{n.message}</p>
              <p className="notification-time">
                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
              </p>
              <div>
                <span className={getBadgeClass(n)}>{getBadgeLabel(n)}</span>
                {!n.read && (
                  <span className="badge badge-unread">Unread</span>
                )}
              </div>
            </div>

            <div className="button-group">
              <button onClick={() => markAsRead(n._id)} className="button-outline">
                Mark Read
              </button>
              <button onClick={() => deleteNotification(n._id)} className="button-danger">
                Delete
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

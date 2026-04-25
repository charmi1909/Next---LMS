'use client';

import React, { useEffect, useState } from 'react';

type User = {
  _id: string;
  name: string;
  email: string;
  role: 'librarian' | 'patron';
  phone?: string;
  address?: string;
  dob?: string; // ISO string
};

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'patron',
    phone: '',
    address: '',
    dob: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      const data: User[] = await res.json();
       setUsers(data.filter((u) => u.role === 'patron' || u.role === 'librarian'));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function startEdit(user: User) {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || '',
      address: user.address || '',
      dob: user.dob ? new Date(user.dob).toISOString().split('T')[0] : '',
    });
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function cancelEdit() {
    setEditingUser(null);
  }

  async function saveEdit() {
    if (!editingUser) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${editingUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to update user');
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => (u._id === updated._id ? updated : u)));
      setEditingUser(null);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(id: string) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete user');
      setUsers((prev) => prev.filter((u) => u._id !== id));
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div className="user-management-container">
      <div className="page-header">
        <h1 className="user-management-title">User Management</h1>
        <p className="page-subtitle">Manage patron and librarian accounts, roles, and profile details.</p>
      </div>

      {loading && <p className="user-loading-message">Loading users...</p>}
      {error && <p className="user-error-message">Error: {error}</p>}

      {!loading && !error && (
        <div className="table-responsive-wrapper">
          <table className="user-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Address</th>
                <th>DOB</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) =>
                editingUser && editingUser._id === user._id ? (
                  <tr key={user._id}>
                    <td>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={onChange}
                        disabled={saving}
                      />
                    </td>
                    <td>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={onChange}
                        disabled={saving}
                      />
                    </td>
                    <td>
                      <select
                        name="role"
                        value={formData.role}
                        onChange={onChange}
                        disabled={saving}
                      >
                        <option value="admin">Admin</option>
                        <option value="librarian">Librarian</option>
                        <option value="patron">Patron</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={onChange}
                        disabled={saving}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={onChange}
                        disabled={saving}
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        name="dob"
                        value={formData.dob}
                        onChange={onChange}
                        disabled={saving}
                      />
                    </td>
                    <td>
                      <button onClick={saveEdit} disabled={saving} className="action-btn save-btn">
                        Save
                      </button>
                      <button onClick={cancelEdit} disabled={saving} className="action-btn cancel-btn">
                        Cancel
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={user._id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td><span className="role-pill capitalize">{user.role}</span></td>
                    <td>{user.phone || '-'}</td>
                    <td>{user.address || '-'}</td>
                    <td>{user.dob ? new Date(user.dob).toLocaleDateString() : '-'}</td>
                    <td>
                      <button onClick={() => startEdit(user)} className="action-btn edit-btn">
                        Edit
                      </button>
                      <button onClick={() => deleteUser(user._id)} className="action-btn delete-btn">
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

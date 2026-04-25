'use client';

import React, { useEffect, useState } from 'react';
import {
  User, Mail, Briefcase, Pencil, MapPin, Phone, CalendarDays,
} from 'lucide-react';

type ProfileData = {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  dob?: string;
  role: string;
};

export default function MyProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    dob: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [pwMessage, setPwMessage] = useState('');

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/profile', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch profile');
      setProfile(data);
      setEditForm({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        dob: data.dob ? data.dob.slice(0, 10) : '',
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      await fetchProfile();
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert('Failed to update profile');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage('');

    const { currentPassword, newPassword, confirmNewPassword } = passwordForm;

    if (newPassword !== confirmNewPassword) {
      return setPwMessage('New passwords do not match.');
    }

    try {
      const res = await fetch('/api/user/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Password change failed');

      setPwMessage('Password changed successfully.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (err: any) {
      setPwMessage(err.message || 'Something went wrong');
    }
  };

  if (loading) return <div className="text-center p-4">Loading...</div>;
  if (error || !profile) return <div className="text-center text-red-600">{error || 'Failed to load profile.'}</div>;

  return (
    <div className="patron-page-container">
      <div className="profile-section-wrapper">
        <div className="profile-banner">
          <div className="profile-avatar-container">
            <div className="profile-avatar-icon-wrapper">
              <User size={64} className="profile-avatar-icon" />
            </div>
          </div>
        </div>

        <div className="profile-details-content">
          <h1 className="profile-name-heading">{profile.name}</h1>
          <div className="profile-detail-item"><Mail size={18} /> {profile.email}</div>
          <div className="profile-detail-item"><Briefcase size={18} /> {profile.role}</div>
          {profile.phone && <div className="profile-detail-item"><Phone size={18} /> {profile.phone}</div>}
          {profile.address && <div className="profile-detail-item"><MapPin size={18} /> {profile.address}</div>}
          {profile.dob && <div className="profile-detail-item"><CalendarDays size={18} /> {new Date(profile.dob).toLocaleDateString()}</div>}

          <button className="btn-primary mt-4 flex items-center gap-2" onClick={() => setIsEditing(true)}>
            <Pencil size={16} /> Edit Profile
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Edit Profile</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Name</label>
                <input name="name" value={editForm.name} onChange={handleEditChange} className="input w-full" required />
              </div>
              <div>
                <label className="block text-sm font-medium">Email</label>
                <input name="email" type="email" value={editForm.email} onChange={handleEditChange} className="input w-full" required />
              </div>
              <div>
                <label className="block text-sm font-medium">Phone</label>
                <input name="phone" value={editForm.phone} onChange={handleEditChange} className="input w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium">Address</label>
                <input name="address" value={editForm.address} onChange={handleEditChange} className="input w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium">Date of Birth</label>
                <input name="dob" type="date" value={editForm.dob} onChange={handleEditChange} className="input w-full" />
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save</button>
              </div>
            </form>

            {/* Change Password Form */}
            <div className="mt-6 border-t pt-4">
              <h3 className="text-lg font-semibold mb-2">Change Password</h3>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium">Current Password</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">New Password</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Confirm New Password</label>
                  <input
                    type="password"
                    name="confirmNewPassword"
                    value={passwordForm.confirmNewPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmNewPassword: e.target.value }))}
                    className="input w-full"
                    required
                  />
                </div>
                {pwMessage && (
                  <p className={`text-sm ${pwMessage.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                    {pwMessage}
                  </p>
                )}
                <div className="flex justify-end">
                  <button type="submit" className="btn-primary">Update Password</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { BookCopy, ClipboardList } from 'lucide-react';
import './patron.css';

export default function PatronDashboardPage() {
  const [name, setName] = useState('');
  const [totalBorrowed, setTotalBorrowed] = useState(0);
  const [currentBorrowed, setCurrentBorrowed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfileAndStats = async () => {
      try {
        setLoading(true);
        setError('');

        const profileRes = await fetch('/api/user/profile', {
          credentials: 'include',
        });
        if (!profileRes.ok) throw new Error('Failed to fetch profile');
        const profileData = await profileRes.json();
        setName(profileData.name || 'User');

        const statsRes = await fetch('/api/user/borrowStats', {
          credentials: 'include',
        });
        if (!statsRes.ok) throw new Error('Failed to fetch stats');
        const statsData = await statsRes.json();
        setTotalBorrowed(statsData.total || 0);
        setCurrentBorrowed(statsData.current || 0);
      } catch (err) {
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndStats();
  }, []);

  if (loading) {
    return <p className="patron-loading">Loading dashboard...</p>;
  }

  const cards = [
    {
      label: 'Total Books Borrowed',
      value: totalBorrowed,
      icon: <BookCopy size={20} />,
      color: 'blue',
    },
    {
      label: 'Currently Borrowed',
      value: currentBorrowed,
      icon: <ClipboardList size={20} />,
      color: 'green',
    },
  ];

  return (
    <div className="patron-dashboard-container">

      {/* Header */}
      <div className="patron-dashboard-header">
        <h1>
          Welcome, <span>{name}</span>
        </h1>
        <p>Track your borrowing activity and account status.</p>
      </div>

      {error && <div className="patron-error-box">{error}</div>}

      {/* Cards */}
      <div className="patron-dashboard-grid">
        {cards.map((card) => (
          <div key={card.label} className={`patron-card ${card.color}`}>
            
            <div className="patron-card-icon">
              {card.icon}
            </div>

            <div>
              <p className="patron-card-label">{card.label}</p>
              <h2 className="patron-card-value">{card.value}</h2>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
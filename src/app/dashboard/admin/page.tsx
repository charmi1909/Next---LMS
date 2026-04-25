'use client';

import React, { useEffect, useState } from 'react';
import { BookCopy, Users, UserCog, TriangleAlert } from 'lucide-react';
import './admin.css';

export default function AdminDashboardOverviewPage() {
  const [stats, setStats] = useState({
    totalBooks: 0,
    totalPatrons: 0,
    totalLibrarians: 0,
    overdueBooks: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/admin/overview');
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const cards = [
    { label: 'Total Books', value: stats.totalBooks, icon: <BookCopy size={22} />, tone: 'tone-blue' },
    { label: 'Registered Patrons', value: stats.totalPatrons, icon: <Users size={22} />, tone: 'tone-purple' },
    { label: 'Active Librarians', value: stats.totalLibrarians, icon: <UserCog size={22} />, tone: 'tone-emerald' },
    { label: 'Overdue Books', value: stats.overdueBooks, icon: <TriangleAlert size={22} />, tone: 'tone-amber' },
  ];

  return (
    <div className="dashboard-page-container">
      <div className="page-header">
        <h1 className="dashboard-title">Admin Dashboard</h1>
        <p className="page-subtitle">Monitor books, patrons, librarians, and overdue activity in one place.</p>
      </div>

      {loading ? (
        <p className="loading-text">Loading dashboard metrics...</p>
      ) : (
        <div className="dashboard-stats-grid">
          {cards.map((stat) => (
            <div key={stat.label} className="stat-card">
              <div className={`stat-icon ${stat.tone}`}>{stat.icon}</div>
              <div>
                <div className="stat-label">{stat.label}</div>
                <div className="stat-value">{stat.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
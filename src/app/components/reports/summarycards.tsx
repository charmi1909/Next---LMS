// SummaryTable.tsx
'use client';

import React from 'react';

type SummaryProps = {
  summary: {
    totalBooks: number;
    totalUsers: number;
    booksBorrowed: number;
    overdue: number;
  };
};

export default function SummaryTable({ summary }: SummaryProps) {
  if (!summary) {
    return (
      <div className="report-widget report-widget-empty">
        <p className="report-muted">Loading summary...</p>
      </div>
    );
  }

  // An array to easily map over the summary data for the table rows
  const summaryMetrics = [
    { label: 'Total Books', value: summary.totalBooks, icon: '📚' },
    { label: 'Total Users', value: summary.totalUsers, icon: '👥' },
    { label: 'Books Borrowed', value: summary.booksBorrowed, icon: '📖' },
    { label: 'Overdue Books', value: summary.overdue, icon: '⚠️' },
  ];

  return (
    <div className="report-widget">
      <h2 className="report-widget-title">Library Summary</h2>
      <div className="table-responsive-wrapper">
        <table className="user-table">
          <thead />
          <tbody>
            {summaryMetrics.map((metric) => (
              <tr key={metric.label}>
                <td>
                  {metric.icon} {metric.label}
                </td>
                <td className="report-muted">{metric.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

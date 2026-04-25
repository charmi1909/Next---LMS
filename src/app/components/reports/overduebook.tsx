// OverdueTable.jsx
import React from 'react';

type OverdueTableProps = {
  data: { user: string; book: string; daysOverdue: number }[];
};

export default function OverdueTable({ data }: OverdueTableProps) {
  if (!data || data.length === 0) return <div className="report-widget report-muted">No overdue books found.</div>;

  return (
    <div className="report-widget table-responsive-wrapper">
      <h2 className="report-widget-title">Overdue Books</h2>
      <table className="user-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Book</th>
            <th>Days Overdue</th>
          </tr>
        </thead>
        <tbody>
          {data.map((entry, i) => (
            <tr key={i}>
              <td>{entry.user}</td>
              <td>{entry.book}</td>
              <td>{entry.daysOverdue}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
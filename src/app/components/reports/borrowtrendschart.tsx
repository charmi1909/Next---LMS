// BorrowingTrendsChart.jsx
'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

type BorrowTrendsProps = {
  data: { date: string; count: number }[];
};

export default function BorrowingTrendsChart({ data }: BorrowTrendsProps) {
  if (!data || data.length === 0) return <div className="report-widget report-muted">No borrow trend data.</div>;

  return (
    <div className="report-widget">
      <h2 className="report-widget-title">Borrowing Trends</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
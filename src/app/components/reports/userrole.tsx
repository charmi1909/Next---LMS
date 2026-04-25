'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

type UserRoleProps = {
  data: { role: string; count: number }[];
};

const COLORS = ['#6366f1', '#10b981', '#f59e0b'];

export default function UserRoleDistributionChart({ data }: UserRoleProps) {
  if (!data || data.length === 0) return <div className="report-widget report-muted">No user role data.</div>;

  return (
    <div className="report-widget">
      <h2 className="report-widget-title">User Role Distribution</h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="role" outerRadius={100} fill="#8884d8" label>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
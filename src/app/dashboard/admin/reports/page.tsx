'use client';

import { useEffect, useState } from 'react';
import SummaryCards from '@/app/components/reports/summarycards';
import BorrowingTrendsChart from '@/app/components/reports/borrowtrendschart';
import OverdueTable from '@/app/components/reports/overduebook';
import UserRoleDistributionChart from '@/app/components/reports/userrole';

export default function ReportsDashboardPage() {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReports() {
      try {
        const res = await fetch('/api/admin/reports/summary');
        const data = await res.json();
        setReportData(data);
      } catch (error) {
        console.error('Failed to fetch report data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchReports();
  }, []);

  if (loading) {
    return <div className="reports-loading-message">Loading reports...</div>;
  }

  if (!reportData) {
    return <div className="reports-error-message">Failed to load report data.</div>;
  }

  return (
    <div className="reports-dashboard-container">
      <div className="page-header">
        <h1 className="reports-dashboard-title">Reports & Analytics</h1>
        <p className="page-subtitle">Visualize borrowing trends, role distribution, and overdue pressure points.</p>
      </div>

      <SummaryCards summary={reportData.summary} />

      <div className="charts-grid">
        <BorrowingTrendsChart data={reportData.borrowTrends} />
        <UserRoleDistributionChart data={reportData.userRoles} />
      </div>

      <div className="reports-overdue-block">
        <OverdueTable data={reportData.overdueBooks ?? []} />
      </div>
    </div>
  );
}

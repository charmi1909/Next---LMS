'use client';

import { useState, useEffect } from 'react';

export default function SystemConfigPage() {
  const [borrowingLimit, setBorrowingLimit] = useState<number>(5);
  const [fineRate, setFineRate] = useState<number>(1);
  const [loanPeriod, setLoanPeriod] = useState<number>(14);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch('/api/admin/system');
        if (!res.ok) throw new Error('Failed to fetch config');
        const data = await res.json();
        const safeBorrowingLimit = Number(data?.borrowingLimit);
        const safeFineRate = Number(data?.fineRate);
        const safeLoanPeriod = Number(data?.loanPeriod);

        setBorrowingLimit(Number.isFinite(safeBorrowingLimit) ? safeBorrowingLimit : 5);
        setFineRate(Number.isFinite(safeFineRate) ? safeFineRate : 1);
        setLoanPeriod(Number.isFinite(safeLoanPeriod) ? safeLoanPeriod : 14);
      } catch (err) {
        console.error('Failed to fetch system configuration:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchConfig();
  }, []);

  const handleSave = async () => {
  const newConfig = {
    borrowingLimit,
    fineRate,
    loanPeriod,
  };

  try {
    const res = await fetch('/api/admin/system', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newConfig),
    });

    if (!res.ok) {
      throw new Error('Failed to save configuration');
    }

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  } catch (error) {
    console.error('Error saving configuration:', error);
    alert('❌ Failed to save configuration. Check logs for details.');
  }
};


  return (
    <div className="system-config-container">
      <div className="page-header">
        <h1 className="system-config-title">Library System Configuration</h1>
        <p className="page-subtitle">Set borrowing limits, fine rules, and the standard loan period.</p>
      </div>

      {loading ? (
        <p className="loading-text">Loading configuration...</p>
      ) : (
        <div className="admin-panel">
          <div className="form-group">
            <label>Borrowing Limit (books):</label>
            <input
              type="number"
              min={1}
              value={borrowingLimit}
              onChange={(e) => setBorrowingLimit(Number(e.target.value || 0))}
            />
          </div>

          <div className="form-group">
            <label>Fine Rate (₹ per overdue day):</label>
            <input
              type="number"
              step="1"
              min={0}
              value={fineRate}
              onChange={(e) => setFineRate(Number(e.target.value || 0))}
            />
          </div>

          <div className="form-group">
            <label>Loan Period (days):</label>
            <input
              type="number"
              min={1}
              value={loanPeriod}
              onChange={(e) => setLoanPeriod(Number(e.target.value || 0))}
            />
          </div>

          <button onClick={handleSave} className="save-config-btn">
            Save Configuration
          </button>

          {isSaved && (
            <p className="save-success-message">✅ Configuration saved successfully!</p>
          )}

          <div className="config-summary">
            <h2>Saved Configuration</h2>
            <p><strong>Borrowing Limit:</strong> {borrowingLimit} books</p>
            <p><strong>Fine Rate:</strong> ₹{fineRate.toFixed(2)} / day</p>
            <p><strong>Loan Period:</strong> {loanPeriod} days</p>
          </div>
        </div>
      )}
    </div>
  );
}

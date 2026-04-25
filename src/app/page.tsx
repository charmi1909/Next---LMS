import Link from "next/link";
import "./globals.css";

export default function HomePage() {
  return (
    <main className="welcome-screen">
      <div className="welcome-glow welcome-glow-left" />
      <div className="welcome-glow welcome-glow-right" />

      <div className="welcome-card">
        <span className="welcome-badge">Smart Library Platform</span>
        <h1>
          Welcome to <span className="highlight">Library Management System</span>
        </h1>
        <p>
          Manage catalog, patrons, circulation, reports, and notifications from one clean and modern dashboard.
        </p>

        <div className="welcome-actions">
          <Link href="/auth" className="welcome-primary-btn">
            Get Started
          </Link>
          <Link href="/auth" className="welcome-secondary-btn">
            Sign In
          </Link>
        </div>

        <div className="welcome-metrics">
          <div>
            <span className="metric-value">Fast</span>
            <span className="metric-label">Book circulation flow</span>
          </div>
          <div>
            <span className="metric-value">Secure</span>
            <span className="metric-label">Role-based access</span>
          </div>
          <div>
            <span className="metric-value">Insightful</span>
            <span className="metric-label">Admin analytics and reports</span>
          </div>
        </div>
      </div>
    </main>
  );
}

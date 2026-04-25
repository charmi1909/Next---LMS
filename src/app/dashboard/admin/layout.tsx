'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Moon, Sun, LogOut, Home, Users, Settings, BarChart, Bell, BookOpen, Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
import './admin.css';

interface UserInfo {
  name: string;
  email: string;
  role: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  useEffect(() => {
    const getUserInfoFromToken = () => {
      try {
        const token = document.cookie
          .split('; ')
          .find(row => row.startsWith('token='))
          ?.split('=')[1];

        if (!token) return;

        const decoded: any = jwtDecode(token);
        setUserInfo({
          name: decoded.name,
          email: decoded.email,
          role: decoded.role,
        });
      } catch (error) {
        console.error('Invalid token');
        router.push('/auth');
      }
    };

    getUserInfoFromToken();
  }, [router]);

  const toggleDesktopSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleLogout = () => {
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/auth');
  };

  const handleLinkClick = () => {
    setIsMobileSidebarOpen(false);
  };

  return (
    <div className={`admin-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <header className="admin-header">
        
        <div className="header-left">
          <button className="sidebar-collapse-toggle" onClick={toggleDesktopSidebar} aria-label="Toggle Sidebar">
            {isSidebarCollapsed ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
          </button>
          <button className="menu-toggle" onClick={toggleMobileSidebar} aria-label="Toggle Mobile Menu">
            <Menu size={24} />
          </button>
          <div className="header-logo">
            <BookOpen size={28} />
            <span className="logo-text">Library Admin</span>
          </div>
        </div>

        <div className="header-right">
          {userInfo && (
            <div className="user-basic-info">
              <span className="user-name">Hello, {userInfo.name}</span>
              <span className="user-role">({userInfo.role})</span>
            </div>
          )}
          <button onClick={toggleTheme} className="theme-toggle-btn" title="Toggle Theme">
            {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
          </button>
          <button onClick={handleLogout} className="logout-btn" title="Logout">
            <LogOut size={24} />
          </button>
        </div>
      </header>

      <div className="admin-main">
        <aside className={`admin-sidebar ${isMobileSidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header-mobile">
            <div className="sidebar-logo">
              <BookOpen size={28} />
              <span className="logo-text">Library Admin</span>
            </div>
            <button className="close-mobile-sidebar-btn" onClick={toggleMobileSidebar}>&times;</button>
          </div>
          <nav>
            <ul>
              <li>
                <Link href="/dashboard/admin" className={`sidebar-link ${pathname === '/dashboard/admin' ? 'active' : ''}`} onClick={handleLinkClick}>
                  <span className="sidebar-icon"><Home size={24} /></span>
                  <span className="sidebar-text">Dashboard</span>
                </Link>
              </li>
              <li>
                <Link href="/dashboard/admin/usermanagment" className={`sidebar-link ${pathname.startsWith('/dashboard/admin/usermanagment') ? 'active' : ''}`} onClick={handleLinkClick}>
                  <span className="sidebar-icon"><Users size={24} /></span>
                  <span className="sidebar-text">User Management</span>
                </Link>
              </li>
              <li>
                <Link href="/dashboard/admin/system" className={`sidebar-link ${pathname.startsWith('/dashboard/admin/system') ? 'active' : ''}`} onClick={handleLinkClick}>
                  <span className="sidebar-icon"><Settings size={24} /></span>
                  <span className="sidebar-text">System Configuration</span>
                </Link>
              </li>
              <li>
                <Link href="/dashboard/admin/reports" className={`sidebar-link ${pathname.startsWith('/dashboard/admin/reports') ? 'active' : ''}`} onClick={handleLinkClick}>
                  <span className="sidebar-icon"><BarChart size={24} /></span>
                  <span className="sidebar-text">Reporting & Analytics</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/admin/notifications"
                  className={`sidebar-link ${pathname.startsWith('/dashboard/admin/notifications') ? 'active' : ''}`}
                  onClick={handleLinkClick}
                >
                  <span className="sidebar-icon"><Bell size={24} /></span>
                  <span className="sidebar-text">Notifications</span>
                </Link>
              </li>
            </ul>
          </nav>
        </aside>

        {isMobileSidebarOpen && <div className="sidebar-overlay" onClick={toggleMobileSidebar}></div>}

        <main className="admin-content">{children}</main>
      </div>

      <footer className="admin-footer">
        <p>&copy; 2025 Library Management System. All rights reserved.</p>
      </footer>
    </div>
  );
}
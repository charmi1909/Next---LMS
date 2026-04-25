'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Moon,
  Sun,
  LogOut,
  Home,
  BookOpen,
  Bell,
  Users,
  RotateCcw,
  AlertTriangle,
  Menu,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
import '../admin/admin.css';
import './librarian.css';

interface UserInfo {
  name: string;
  email: string;
  role: string;
}

interface DecodedToken {
  name?: string;
  email?: string;
  role?: string;
}

export default function LibrarianLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
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
    const token = document.cookie
      .split('; ')
      .find((row) => row.startsWith('token='))
      ?.split('=')[1];

    if (!token) return;

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      if (decoded.name && decoded.email && decoded.role) {
        setUserInfo({
          name: decoded.name,
          email: decoded.email,
          role: decoded.role,
        });
      }
    } catch {
      router.push('/auth');
    }
  }, [router]);

  useEffect(() => {
    const fetchUnreadNotificationCount = async () => {
      try {
        const res = await fetch('/api/librarian/notifications?unreadOnly=true', { credentials: 'include' });
        if (!res.ok) return;
        const data: { unreadCount?: number } = await res.json();
        setNotificationCount(data.unreadCount || 0);
      } catch {
        setNotificationCount(0);
      }
    };

    fetchUnreadNotificationCount();
    const interval = setInterval(fetchUnreadNotificationCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleDesktopSidebar = () => setIsSidebarCollapsed((prev) => !prev);
  const toggleMobileSidebar = () => setIsMobileSidebarOpen((prev) => !prev);

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

  const handleLinkClick = () => setIsMobileSidebarOpen(false);

  const navItems = [
    { href: '/dashboard/librarian', label: 'Dashboard', icon: Home },
    { href: '/dashboard/librarian/catalog', label: 'Catalog Management', icon: BookOpen },
    { href: '/dashboard/librarian/circulation', label: 'Circulation', icon: RotateCcw },
    { href: '/dashboard/librarian/patron', label: 'Patron Management', icon: Users },
    { href: '/dashboard/librarian/overdue', label: 'Overdue & Fines', icon: AlertTriangle },
    { href: '/dashboard/librarian/notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div className={`admin-container librarian-shell ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
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
            <span className="logo-text">Library Librarian</span>
          </div>
        </div>

        <div className="header-right">
          {userInfo && (
            <div className="user-basic-info">
              <span className="user-name">Hello, {userInfo.name}</span>
              <span className="user-role">({userInfo.role})</span>
            </div>
          )}
          <Link href="/dashboard/librarian/notifications" className="librarian-notification-button" title="Notifications">
            <Bell size={20} />
            {notificationCount > 0 && <span className="sidebar-notification-badge">{notificationCount}</span>}
          </Link>
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
              <span className="logo-text">Library Librarian</span>
            </div>
            <button className="close-mobile-sidebar-btn" onClick={toggleMobileSidebar}>
              &times;
            </button>
          </div>
          <nav>
            <ul>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === '/dashboard/librarian' ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`sidebar-link ${isActive ? 'active' : ''}`}
                      onClick={handleLinkClick}
                    >
                      <span className="sidebar-icon">
                        <Icon size={22} />
                      </span>
                      <span className="sidebar-text">{item.label}</span>
                      {item.href === '/dashboard/librarian/notifications' && notificationCount > 0 && (
                        <span className="sidebar-notification-badge">{notificationCount}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {isMobileSidebarOpen && <div className="sidebar-overlay" onClick={toggleMobileSidebar}></div>}
        <main className="admin-content">{children}</main>
      </div>

      <footer className="admin-footer">
        <p>&copy; 2026 Library Management System. All rights reserved.</p>
      </footer>
    </div>
  );
}
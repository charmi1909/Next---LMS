'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Moon,
  Sun,
  LogOut,
  Home,
  Search,
  BookOpen,
  UserCog,
  Bookmark,
  RotateCcw,
  Bell,
  User,
  Menu,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
import '../admin/admin.css';
import './patron.css';

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

export default function PatronLayout({ children }: { children: React.ReactNode }) {
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
    const getUserInfoFromToken = () => {
      try {
        const token = document.cookie
          .split('; ')
          .find((row) => row.startsWith('token='))
          ?.split('=')[1];

        if (!token) return;

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
    };

    getUserInfoFromToken();
  }, [router]);

  const fetchUnreadNotificationCount = async () => {
    try {
      await fetch('/api/patron/notifications/sync', {
        method: 'POST',
        credentials: 'include',
      });
      const res = await fetch('/api/patron/notifications', { credentials: 'include' });
      if (!res.ok) return;
      const data: unknown = await res.json();
      const unread = Array.isArray(data)
        ? data.filter(
            (notification): notification is { read?: boolean } =>
              typeof notification === 'object' &&
              notification !== null &&
              'read' in notification &&
              (notification as { read?: boolean }).read === false
          ).length
        : 0;
      setNotificationCount(unread);
    } catch {
      setNotificationCount(0);
    }
  };

  useEffect(() => {
    fetchUnreadNotificationCount();
    const interval = setInterval(fetchUnreadNotificationCount, 45000);
    return () => clearInterval(interval);
  }, []);

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

  const navItems = [
    { href: '/dashboard/patron', label: 'Dashboard', icon: Home },
    { href: '/dashboard/patron/search', label: 'Search & Browse', icon: Search },
    { href: '/dashboard/patron/item', label: 'View All Items', icon: BookOpen },
    { href: '/dashboard/patron/account', label: 'Account Management', icon: UserCog },
    { href: '/dashboard/patron/holds', label: 'Reserve/Hold Item', icon: Bookmark },
    { href: '/dashboard/patron/return', label: 'Return Borrow Items', icon: RotateCcw },
    { href: '/dashboard/patron/notifications', label: 'Notifications', icon: Bell },
    { href: '/dashboard/patron/profile', label: 'My Profile', icon: User },
  ];

  return (
    <div className={`admin-container patron-dashboard-layout patron-shell ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
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
            <span className="logo-text">Library Patron</span>
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
              <span className="logo-text">Library Patron</span>
            </div>
            <button className="close-mobile-sidebar-btn" onClick={toggleMobileSidebar}>&times;</button>
          </div>
          <nav>
            <ul>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === '/dashboard/patron'
                    ? pathname === item.href
                    : pathname.startsWith(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`sidebar-link ${isActive ? 'active' : ''}`}
                      onClick={handleLinkClick}
                    >
                      <span className="sidebar-icon"><Icon size={22} /></span>
                      <span className="sidebar-text">{item.label}</span>
                      {item.href === '/dashboard/patron/notifications' && notificationCount > 0 && (
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
        <p>&copy; 2025 Library Management System. All rights reserved.</p>
      </footer>
    </div>
  );
}

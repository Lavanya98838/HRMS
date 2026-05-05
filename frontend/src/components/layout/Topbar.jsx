import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../notifications/NotificationBell';

const PAGE_TITLES = {
  '/dashboard':     { title: 'Dashboard',           icon: '⊞'  },
  '/employees':     { title: 'Employee Management', icon: '👥' },
  '/departments':   { title: 'Department Manager',  icon: '🏢' },
  '/roles':         { title: 'Role Manager',        icon: '🎭' },
  '/profile':       { title: 'My Profile',          icon: '🙋' },
  '/attendance':    { title: 'Attendance',          icon: '⏱️' },
  '/leave':         { title: 'Leave Management',    icon: '🌴' },
  '/payroll':       { title: 'Payroll',             icon: '💰' },
  '/payslips':      { title: 'My Payslips',         icon: '💳' },
  '/analytics':     { title: 'Analytics',           icon: '📊' },
  '/notifications': { title: 'Notifications',       icon: '🔔' },
  '/documents':     { title: 'Documents',           icon: '📁' },
  '/performance':   { title: 'Performance Reviews', icon: '📊' },
  '/shifts':        { title: 'Shift Schedule',       icon: '🗓️' },
  '/announcements': { title: 'Announcements',        icon: '📢' },
  '/goals':         { title: 'Goals & OKRs',         icon: '🎯' },
};

const Topbar = ({ onSearch, searchPlaceholder = 'Search...' }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [searchVal, setSearchVal] = useState('');

  const pathKey = Object.keys(PAGE_TITLES).find(
    (k) => location.pathname.endsWith(k)
  );
  const pageInfo = PAGE_TITLES[pathKey] || { title: 'HRMS Portal', icon: '⊞' };

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchVal(val);
    onSearch?.(val);
  };

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div>
          <div className="page-title">
            {pageInfo.icon} {pageInfo.title}
          </div>
        </div>

        {onSearch && (
          <div className="topbar-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchVal}
              onChange={handleSearch}
            />
            {searchVal && (
              <button
                onClick={() => { setSearchVal(''); onSearch(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="topbar-right">
        {/* Date */}
        <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          {today}
        </div>

        {/* Live notification bell — replaces old placeholder */}
        <NotificationBell />

        {/* User avatar */}
        <div style={{
          width: 36, height: 36,
          borderRadius: 10,
          background: 'var(--grad-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'white',
          overflow: 'hidden', cursor: 'pointer',
          border: '2px solid var(--border)',
        }}>
          {user?.profilePicture
            ? <img src={user.profilePicture} alt={user?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : user?.name?.split(' ')?.map(n => n[0])?.join('')?.toUpperCase()?.slice(0, 2) || 'U'
          }
        </div>
      </div>
    </header>
  );
};

export default Topbar;

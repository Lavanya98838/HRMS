import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, getPortalFromUser } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

// ── Lucide SVG Icons ─────────────────────────────────────
const Icon = ({ name, size = 17 }) => {
  const icons = {
    dashboard:      <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>,
    users:          <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    building:       <><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></>,
    shield:         <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
    clock:          <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    calendar:       <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    dollar:         <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
    palmtree:       <><path d="M13 8c0-2.76-2.46-5-5.5-5S2 5.24 2 8h2l1-1 1 1h4"/><path d="M13 7.14A5.82 5.82 0 0 1 16.5 6c3.04 0 5.5 2.24 5.5 5h-3l-1-1-1 1h-3"/><path d="M5.89 9.71c-2.15 2.15-2.3 5.47-.35 7.43l4.24-4.25.7-.7.71-.71 2.12-2.12c-1.95-1.96-5.27-1.8-7.42.35z"/><path d="M11 15.5c.5 2.5-.17 4.5-1 6.5h4c2-5.5-.5-12-1-14"/></>,
    star:           <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></>,
    target:         <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
    barChart:       <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
    trendingUp:     <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
    megaphone:      <><path d="M3 11l19-9-9 19-2-8-8-2z"/></>,
    bell:           <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    folder:         <><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></>,
    brain:          <><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></>,
    bot:            <><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></>,
    search:         <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    user:           <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    logout:         <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    chevronDown:    <><polyline points="6 9 12 15 18 9"/></>,
    chevronRight:   <><polyline points="9 18 15 12 9 6"/></>,
    menu:           <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    briefcase:      <><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></>,
    activity:       <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>,
    layers:         <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>
      {icons[name] || icons.dashboard}
    </svg>
  );
};

// ── Nav definitions per portal ───────────────────────────
const NAV_ITEMS = {
  admin: [
    {
      section: 'Overview',
      items: [
        { label: 'Dashboard',           path: '/admin/dashboard',     icon: 'dashboard' },
      ],
    },
    {
      section: 'People',
      items: [
        { label: 'Employees',           path: '/admin/employees',     icon: 'users' },
        { label: 'Departments',         path: '/admin/departments',   icon: 'building' },
        { label: 'Roles',               path: '/admin/roles',         icon: 'shield' },
      ],
    },
    {
      section: 'Operations',
      items: [
        { label: 'Attendance',          path: '/admin/attendance',    icon: 'clock' },
        { label: 'Leave',               path: '/admin/leave',         icon: 'palmtree' },
        { label: 'Payroll',             path: '/admin/payroll',       icon: 'dollar' },
        { label: 'Shifts',              path: '/admin/shifts',        icon: 'calendar' },
      ],
    },
    {
      section: 'Performance',
      items: [
        { label: 'Reviews',             path: '/admin/performance',   icon: 'star' },
        { label: 'Tasks',        path: '/admin/goals',         icon: 'target' },
      ],
    },
    {
      section: 'Analytics',
      items: [
        { label: 'Analytics',           path: '/admin/analytics',     icon: 'barChart' },
        { label: 'Predictive',          path: '/admin/predictive',    icon: 'trendingUp' },
      ],
    },
    {
      section: 'Workspace',
      items: [
        { label: 'Announcements',       path: '/admin/announcements', icon: 'megaphone' },
        { label: 'Notifications',       path: '/admin/notifications', icon: 'bell' },
        { label: 'Documents',           path: '/admin/documents',     icon: 'folder' },
      ],
    },
    {
      section: 'Intelligence',
      items: [
        { label: 'Smart Assistant',     path: '/admin/ai-assistant',  icon: 'bot' },
      ],
    },
    {
      section: 'System',
      items: [
        { label: 'Audit Logs',          path: '/admin/audit-logs',    icon: 'search' },
      ],
    },
  ],

  subadmin: [
    {
      section: 'Overview',
      items: [
        { label: 'Dashboard',           path: '/subadmin/dashboard',     icon: 'dashboard' },
      ],
    },
    {
      section: 'People',
      items: [
        { label: 'Employees',           path: '/subadmin/employees',     icon: 'users' },
        { label: 'Departments',         path: '/subadmin/departments',   icon: 'building' },
        { label: 'Roles',               path: '/subadmin/roles',         icon: 'shield' },
      ],
    },
    {
      section: 'Operations',
      items: [
        { label: 'Attendance',          path: '/subadmin/attendance',    icon: 'clock' },
        { label: 'Leave',               path: '/subadmin/leave',         icon: 'palmtree' },
        { label: 'Payroll',             path: '/subadmin/payroll',       icon: 'dollar' },
        { label: 'Shifts',              path: '/subadmin/shifts',        icon: 'calendar' },
      ],
    },
    {
      section: 'Performance',
      items: [
        { label: 'Reviews',             path: '/subadmin/performance',   icon: 'star' },
        { label: 'Tasks',        path: '/subadmin/goals',         icon: 'target' },
      ],
    },
    {
      section: 'Analytics',
      items: [
        { label: 'Analytics',           path: '/subadmin/analytics',     icon: 'barChart' },
        { label: 'Predictive',          path: '/subadmin/predictive',    icon: 'trendingUp' },
      ],
    },
    {
      section: 'Workspace',
      items: [
        { label: 'Announcements',       path: '/subadmin/announcements', icon: 'megaphone' },
        { label: 'Notifications',       path: '/subadmin/notifications', icon: 'bell' },
        { label: 'Documents',           path: '/subadmin/documents',     icon: 'folder' },
      ],
    },
    {
      section: 'Intelligence',
      items: [
        { label: 'Smart Assistant',     path: '/subadmin/ai-assistant',  icon: 'bot' },
      ],
    },
  ],

  hr: [
    {
      section: 'Overview',
      items: [
        { label: 'Dashboard',           path: '/hr/dashboard',        icon: 'dashboard' },
      ],
    },
    {
      section: 'People',
      items: [
        { label: 'Employees',           path: '/hr/employees',        icon: 'users' },
        { label: 'Departments',         path: '/hr/departments',      icon: 'building' },
        { label: 'Roles',               path: '/hr/roles',            icon: 'shield' },
      ],
    },
    {
      section: 'Operations',
      items: [
        { label: 'Attendance',          path: '/hr/attendance',       icon: 'clock' },
        { label: 'Leave',               path: '/hr/leave',            icon: 'palmtree' },
        { label: 'Payroll',             path: '/hr/payroll',          icon: 'dollar' },
        { label: 'Shifts',              path: '/hr/shifts',           icon: 'calendar' },
      ],
    },
    {
      section: 'Performance',
      items: [
        { label: 'Reviews',             path: '/hr/performance',      icon: 'star' },
        { label: 'Tasks',        path: '/hr/goals',            icon: 'target' },
      ],
    },
    {
      section: 'Analytics',
      items: [
        { label: 'Analytics',           path: '/hr/analytics',        icon: 'barChart' },
      ],
    },
    {
      section: 'Workspace',
      items: [
        { label: 'Announcements',       path: '/hr/announcements',    icon: 'megaphone' },
        { label: 'Notifications',       path: '/hr/notifications',    icon: 'bell' },
        { label: 'Documents',           path: '/hr/documents',        icon: 'folder' },
      ],
    },
    {
      section: 'Intelligence',
      items: [
        { label: 'Smart Assistant',     path: '/hr/ai-assistant',     icon: 'bot' },
      ],
    },
  ],

  manager: [
    {
      section: 'Overview',
      items: [
        { label: 'Dashboard',           path: '/manager/dashboard',     icon: 'dashboard' },
      ],
    },
    {
      section: 'Team',
      items: [
        { label: 'My Team',             path: '/manager/employees',     icon: 'users' },
      ],
    },
    {
      section: 'Operations',
      items: [
        { label: 'Attendance',          path: '/manager/attendance',    icon: 'clock' },
        { label: 'Leave',               path: '/manager/leave',         icon: 'palmtree' },
        { label: 'Shifts',              path: '/manager/shifts',        icon: 'calendar' },
      ],
    },
    {
      section: 'Performance',
      items: [
        { label: 'Reviews',             path: '/manager/performance',   icon: 'star' },
        { label: 'Tasks',        path: '/manager/goals',         icon: 'target' },
      ],
    },
    {
      section: 'Workspace',
      items: [
        { label: 'Announcements',       path: '/manager/announcements', icon: 'megaphone' },
        { label: 'Notifications',       path: '/manager/notifications', icon: 'bell' },
        { label: 'Documents',           path: '/manager/documents',     icon: 'folder' },
      ],
    },
    {
      section: 'Intelligence',
      items: [
        { label: 'Smart Assistant',     path: '/manager/ai-assistant',  icon: 'bot' },
      ],
    },
  ],

  employee: [
    {
      section: 'Overview',
      items: [
        { label: 'Dashboard',           path: '/employee/dashboard',     icon: 'dashboard' },
        { label: 'My Profile',          path: '/employee/profile',       icon: 'user' },
      ],
    },
    {
      section: 'My Work',
      items: [
        { label: 'Attendance',          path: '/employee/attendance',    icon: 'clock' },
        { label: 'Leave',               path: '/employee/leave',         icon: 'palmtree' },
        { label: 'Shifts',              path: '/employee/shifts',        icon: 'calendar' },
        { label: 'My Payslips',         path: '/employee/payslips',      icon: 'dollar' },
      ],
    },
    {
      section: 'Performance',
      items: [
        { label: 'Reviews',             path: '/employee/performance',   icon: 'star' },
        { label: 'Tasks',        path: '/employee/goals',         icon: 'target' },
      ],
    },
    {
      section: 'Workspace',
      items: [
        { label: 'Announcements',       path: '/employee/announcements', icon: 'megaphone' },
        { label: 'Notifications',       path: '/employee/notifications', icon: 'bell' },
        { label: 'Documents',           path: '/employee/documents',     icon: 'folder' },
      ],
    },
    {
      section: 'Intelligence',
      items: [
        { label: 'Smart Assistant',     path: '/employee/ai-assistant',  icon: 'bot' },
      ],
    },
  ],
};

const PORTAL_META = {
  admin:    { label: 'Admin',    color: '#7c3aed', gradient: 'linear-gradient(135deg,#7c3aed,#e11d74)' },
  subadmin: { label: 'Sub Admin',color: '#6366f1', gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
  hr:       { label: 'HR',       color: '#e11d74', gradient: 'linear-gradient(135deg,#e11d74,#f97316)' },
  manager:  { label: 'Manager',  color: '#f97316', gradient: 'linear-gradient(135deg,#f97316,#f59e0b)' },
  employee: { label: 'Employee', color: '#10b981', gradient: 'linear-gradient(135deg,#10b981,#06b6d4)' },
};

// ── Nav Section ──────────────────────────────────────────
const NavSection = ({ section, items, collapsed, showCaption, location }) => {
  const hasActive = items.some(i => location.pathname === i.path);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (hasActive) setOpen(true);
  }, [location.pathname]);

  return (
    <div style={{ marginBottom: 4 }}>
      {/* Section header — only when expanded AND caption enabled */}
      {!collapsed && showCaption && (
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '6px 12px 4px', color: 'var(--text-muted)',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
          }}
        >
          <span>{section}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transition: 'transform 0.2s', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      )}

      {/* Items */}
      {(open || collapsed || !showCaption) && items.map((item) => (
        item.soon ? (
          <div key={item.path} className="nav-item"
            style={{ opacity: 0.4, cursor: 'not-allowed' }}
            title={collapsed ? `${item.label} (Coming Soon)` : undefined}>
            <Icon name={item.icon} />
            {!collapsed && (
              <>
                <span>{item.label}</span>
                <span style={{
                  marginLeft: 'auto', fontSize: 9, background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)', padding: '2px 6px', borderRadius: 99,
                  color: 'var(--text-muted)', letterSpacing: '0.06em',
                }}>SOON</span>
              </>
            )}
          </div>
        ) : (
          <NavLink key={item.path} to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            title={collapsed ? item.label : undefined}>
            <Icon name={item.icon} />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        )
      ))}
    </div>
  );
};

// ── Sidebar ──────────────────────────────────────────────
const Sidebar = ({ collapsed, onToggle }) => {
  const { user, logout } = useAuth();
  const { settings } = useTheme();
  const navigate  = useNavigate();
  const location  = useLocation();
  const navRef    = useRef(null);

  // Mini layout from settings overrides the manual collapse
  const isMini = settings.layout === 'mini';
  const isCollapsed = collapsed || isMini;
  const showCaption = settings.sidebarCaption;

  const portal    = getPortalFromUser(user);
  const navItems  = NAV_ITEMS[portal] || NAV_ITEMS.employee;
  const meta      = PORTAL_META[portal] || PORTAL_META.employee;

  useEffect(() => {
    const saved = sessionStorage.getItem('sidebar-scroll');
    if (saved && navRef.current) navRef.current.scrollTop = parseInt(saved, 10);
  }, []);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const save = () => sessionStorage.setItem('sidebar-scroll', el.scrollTop);
    el.addEventListener('scroll', save, { passive: true });
    return () => el.removeEventListener('scroll', save);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const initials = user?.name
    ?.split(' ')?.map(n => n[0])?.join('')?.toUpperCase()?.slice(0, 2) || 'U';

  return (
    <aside className={`sidebar ${isCollapsed ? 'sidebar-collapsed' : ''}`}>

      {/* ── Logo / Toggle ──────────────────────────── */}
      <div className="sidebar-logo">
        <div className="hrms-logo-mark" style={{
          width: 34, height: 34, fontSize: 14, flexShrink: 0,
          background: meta.gradient,
        }}>H</div>
        {!isCollapsed && (
          <span className="hrms-logo-text" style={{ fontSize: 15 }}>HRMS Portal</span>
        )}
        {!isMini && (
          <button onClick={onToggle} style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            color: 'var(--text-muted)', cursor: 'pointer', padding: 4,
            display: 'flex', alignItems: 'center', flexShrink: 0,
            borderRadius: 6, transition: 'color 0.2s',
          }}>
            <Icon name="menu" size={16} />
          </button>
        )}
      </div>

      {/* ── Portal badge (expanded only) ───────────── */}
      {!isCollapsed && (
        <div style={{ padding: '0 12px 8px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '3px 10px', borderRadius: 99,
            background: `${meta.color}18`,
            border: `1px solid ${meta.color}35`,
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: meta.color,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: meta.color }} />
            {meta.label}
          </div>
        </div>
      )}

      {/* ── Nav ────────────────────────────────────── */}
      <nav className="sidebar-nav" ref={navRef} style={{ overflowY: 'auto', flex: 1 }}>
        {navItems.map((group) => (
          <NavSection
            key={group.section}
            section={group.section}
            items={group.items}
            collapsed={isCollapsed}
            showCaption={showCaption}
            location={location}
          />
        ))}
      </nav>

      {/* ── Footer / User ──────────────────────────── */}
      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={handleLogout} title="Click to logout"
          style={{ cursor: 'pointer' }}>
          <div className="sidebar-avatar" style={{ background: meta.gradient, flexShrink: 0 }}>
            {user?.profilePicture
              ? <img src={user.profilePicture} alt={user.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              : initials}
          </div>
          {!isCollapsed && (
            <>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{user?.name}</div>
                <div style={{
                  fontSize: 11, color: 'var(--text-muted)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{user?.email}</div>
              </div>
              <Icon name="logout" size={14} />
            </>
          )}
        </div>
      </div>

    </aside>
  );
};

export default Sidebar;
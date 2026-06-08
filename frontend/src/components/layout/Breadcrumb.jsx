import { Link, useLocation } from 'react-router-dom';

// Maps raw path segments to readable labels
const SEGMENT_LABELS = {
  // Portals
  admin:        null,   // hide portal prefix
  subadmin:     null,
  hr:           null,
  manager:      null,
  employee:     null,

  // Pages
  dashboard:    'Dashboard',
  employees:    'Employees',
  departments:  'Departments',
  roles:        'Roles',
  attendance:   'Attendance',
  leave:        'Leave',
  payroll:      'Payroll',
  payslips:     'My Payslips',
  analytics:    'Analytics',
  predictive:   'Predictive',
  notifications:'Notifications',
  documents:    'Documents',
  performance:  'Reviews',
  shifts:       'Shifts',
  announcements:'Announcements',
  goals:        'Tasks',
  'audit-logs': 'Audit Logs',
  'ai-assistant': 'Smart Assistant',
  profile:      'My Profile',
};

const ChevronIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ color: 'var(--text-muted)', flexShrink: 0, opacity: 0.5 }}>
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const HomeIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const Breadcrumb = () => {
  const location = useLocation();

  // Split path into segments, filter empty strings
  const rawSegments = location.pathname.split('/').filter(Boolean);

  // Build crumbs: skip portal prefix (admin/hr/etc), map to labels
  const crumbs = [];
  let cumulativePath = '';

  for (const seg of rawSegments) {
    cumulativePath += `/${seg}`;
    const label = SEGMENT_LABELS[seg];

    if (label === null) continue;          // portal root — skip
    if (label === undefined) {
      // Unknown segment — try to make it readable (e.g. employee ID → show truncated)
      const readable = seg.length > 12
        ? seg.slice(0, 8) + '…'
        : seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      crumbs.push({ label: readable, path: cumulativePath });
    } else {
      crumbs.push({ label, path: cumulativePath });
    }
  }

  // If only 1 crumb (Dashboard), don't render — no point showing single item
  if (crumbs.length <= 1) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        color: 'var(--text-muted)',
        marginTop: 3,
        flexWrap: 'wrap',
      }}
    >
      {/* Home icon always links to the portal dashboard */}
      <Link
        to={crumbs[0]?.path || '/'}
        style={{
          display: 'flex',
          alignItems: 'center',
          color: 'var(--text-muted)',
          textDecoration: 'none',
          opacity: 0.7,
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = 1}
        onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
        aria-label="Home"
      >
        <HomeIcon />
      </Link>

      {crumbs.map((crumb, idx) => {
        const isLast = idx === crumbs.length - 1;
        return (
          <span key={crumb.path} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <ChevronIcon />
            {isLast ? (
              <span style={{
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: 11,
                opacity: 0.85,
              }}>
                {crumb.label}
              </span>
            ) : (
              <Link
                to={crumb.path}
                style={{
                  color: 'var(--text-muted)',
                  textDecoration: 'none',
                  transition: 'color 0.15s',
                  fontSize: 11,
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;
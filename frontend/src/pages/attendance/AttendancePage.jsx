import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import CheckInCard     from '../../components/attendance/CheckInCard';
import AttendanceTable from '../../components/attendance/AttendanceTable';
import { useAuth }     from '../../context/AuthContext';

const AttendancePage = () => {
  const { getPortal } = useAuth();
  const portal      = getPortal();
  const isAdminOrHR = ['admin', 'hr'].includes(portal);
  const isManager   = portal === 'manager';

  // Admin/HR skip personal attendance — only see all employees
  const TABS = isAdminOrHR
    ? [{ id: 'all', label: 'All Employees' }]
    : [
        { id: 'my',  label: 'My Attendance' },
        ...(isManager ? [{ id: 'all', label: 'All Employees' }] : []),
      ];

  const [refreshKey, setRefreshKey] = useState(0);
  const [tab, setTab] = useState(isAdminOrHR ? 'all' : 'my');

  // Keep tab in sync if portal changes
  useEffect(() => {
    if (isAdminOrHR) setTab('all');
  }, [isAdminOrHR]);

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Attendance</h1>
          <p>Track your daily check-in, check-out and working hours</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isAdminOrHR ? '1fr' : '320px 1fr', gap: 24, alignItems: 'start' }}>

        {/* Left — Check In Card (hidden for admin/HR) */}
        {!isAdminOrHR && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <CheckInCard onRefresh={() => setRefreshKey(k => k + 1)} />
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                This Month
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 2 }}>
                <div>🟢 Office hours: 11:00 AM – 6:00 PM</div>
                <div>⚠️ Grace period: 15 minutes</div>
                <div>🌗 Half day: &lt; 4 working hours</div>
                <div>📅 Working days: Mon – Sat</div>
              </div>
            </div>
          </div>
        )}

        {/* Right — Attendance Table */}
        <div>
          {/* Tabs — only show if more than one tab */}
          {TABS.length > 1 && (
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 6, width: 'fit-content' }}>
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    padding: '8px 20px', border: 'none',
                    borderRadius: 'var(--radius-md)',
                    background: tab === t.id ? 'var(--violet)' : 'transparent',
                    color: tab === t.id ? 'white' : 'var(--text-muted)',
                    fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          <AttendanceTable
            showFilters
            showAll={tab === 'all'}
            refreshTrigger={refreshKey}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AttendancePage;
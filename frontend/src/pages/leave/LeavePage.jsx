import { useState } from 'react';
import DashboardLayout  from '../../components/layout/DashboardLayout';
import LeaveBalanceCard from '../../components/leave/LeaveBalanceCard';
import LeaveModal       from '../../components/leave/LeaveModal';
import LeaveTable       from '../../components/leave/LeaveTable';
import { useAuth }      from '../../context/AuthContext';

const STATUS_FILTERS = [
  { id: '',          label: 'All Status' },
  { id: 'pending',   label: 'Pending'   },
  { id: 'approved',  label: 'Approved'  },
  { id: 'rejected',  label: 'Rejected'  },
  { id: 'cancelled', label: 'Cancelled' },
];

const LeavePage = () => {
  const { user }        = useAuth();
  const [showModal, setShowModal]   = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [statusFilter, setStatus]   = useState('');

  const canApprove = ['admin', 'hr', 'manager'].includes(user?.role);
  const handleRefresh = () => setRefreshKey(k => k + 1);

  return (
    <DashboardLayout>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Leave Management</h1>
          <p>Apply for leave, track status and manage approvals</p>
        </div>
        <button
          className="btn-primary"
          style={{ padding: '10px 18px', fontSize: 13, width: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}
          onClick={() => setShowModal(true)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Apply for Leave
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24, alignItems: 'start' }}>

        {/* Left — Balance + Policy */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <LeaveBalanceCard refreshTrigger={refreshKey} />

          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Leave Policy
            </div>
            {[
              { icon: '🤒', label: 'Sick Leave',   days: '12 days/year' },
              { icon: '☀️', label: 'Casual Leave', days: '12 days/year' },
              { icon: '💰', label: 'Paid Leave',   days: '15 days/year' },
            ].map(p => (
              <div key={p.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{p.icon} {p.label}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>{p.days}</span>
              </div>
            ))}
            <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.7 }}>
              • Leaves reset every January 1st<br />
              • Half-day leave counts as 0.5 days<br />
              • Weekends are excluded automatically
            </div>
          </div>
        </div>

        {/* Right — Flat filter + Table */}
        <div>
          {/* Status filter bar */}
          <div style={{
            display: 'flex', gap: 4, marginBottom: 20,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: 6, width: 'fit-content',
          }}>
            {STATUS_FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setStatus(f.id)}
                style={{
                  padding: '8px 18px', border: 'none',
                  borderRadius: 'var(--radius-md)',
                  background: statusFilter === f.id ? 'var(--violet)' : 'transparent',
                  color: statusFilter === f.id ? 'white' : 'var(--text-muted)',
                  fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Single table — showAll for approvers, own for employees */}
          <LeaveTable
            showAll={canApprove}
            statusFilter={statusFilter}
            refreshTrigger={refreshKey}
            onRefresh={handleRefresh}
          />
        </div>
      </div>

      <LeaveModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleRefresh}
      />
    </DashboardLayout>
  );
};

export default LeavePage;
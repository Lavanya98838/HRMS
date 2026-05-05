import { useState, useEffect } from 'react';
import { leaveAPI } from '../../utils/phase3Api';

const LEAVE_CONFIG = {
  sick:   { label: 'Sick Leave',   icon: '🤒', color: '#ef4444' },
  casual: { label: 'Casual Leave', icon: '☀️', color: '#f59e0b' },
  paid:   { label: 'Paid Leave',   icon: '💰', color: '#10b981' },
};

const LeaveBalanceCard = ({ refreshTrigger }) => {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await leaveAPI.getBalance();
        setBalance(res.data.data.balance);
      } catch { /* silent */ }
      finally { setLoading(false); }
    };
    fetch();
  }, [refreshTrigger]);

  if (loading) return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 24 }}>
      {Array(3).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 12, marginBottom: 12 }} />)}
    </div>
  );

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '24px' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>
        🏖 Leave Balance — {new Date().getFullYear()}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {Object.entries(LEAVE_CONFIG).map(([type, cfg]) => {
          const data = balance?.[type];
          if (!data) return null;
          const pct = data.total > 0 ? (data.remaining / data.total) * 100 : 0;
          return (
            <div key={type}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{cfg.icon}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {cfg.label}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Used: {data.used}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: cfg.color }}>
                    {data.remaining}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>/{data.total}</span>
                  </span>
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: pct > 50 ? cfg.color : pct > 25 ? '#f59e0b' : '#ef4444',
                  borderRadius: 99,
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Remaining</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, background: 'var(--grad-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {(balance?.sick?.remaining || 0) + (balance?.casual?.remaining || 0) + (balance?.paid?.remaining || 0)} days
        </span>
      </div>
    </div>
  );
};

export default LeaveBalanceCard;

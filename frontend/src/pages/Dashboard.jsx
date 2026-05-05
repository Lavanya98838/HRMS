import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ROLE_CONFIG = {
  admin:    { icon: '👑', color: '#7c3aed', label: 'Admin Dashboard' },
  hr:       { icon: '🧑‍💼', color: '#e11d74', label: 'HR Dashboard' },
  manager:  { icon: '📊', color: '#f97316', label: 'Manager Dashboard' },
  employee: { icon: '🙋', color: '#10b981', label: 'Employee Dashboard' },
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const config = ROLE_CONFIG[user?.role] || ROLE_CONFIG.employee;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      fontFamily: 'var(--font-body)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div className="orb orb-1" style={{ position: 'fixed' }} />
      <div className="grid-pattern" style={{ position: 'fixed' }} />

      <div className="scale-in" style={{
        background: 'var(--bg-card)',
        border: '1.5px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: '48px 40px',
        maxWidth: 500,
        width: '100%',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
        boxShadow: 'var(--shadow-card)',
      }}>
        <div style={{
          width: 72, height: 72,
          borderRadius: 18,
          background: `${config.color}22`,
          border: `2px solid ${config.color}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, margin: '0 auto 24px',
          boxShadow: `0 0 40px ${config.color}33`,
        }}>
          {config.icon}
        </div>

        <span className={`role-badge ${user?.role}`} style={{ marginBottom: 16, display: 'inline-flex' }}>
          {user?.role}
        </span>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28, fontWeight: 800,
          marginBottom: 8, color: 'var(--text-primary)',
        }}>
          {config.label}
        </h1>

        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>
          Welcome back, <strong style={{ color: 'var(--text-secondary)' }}>{user?.name}</strong>! 🎉<br />
          Phase 2 (Employee Management) is coming next.
        </p>

        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          marginBottom: 28,
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          {[
            { label: 'Name', value: user?.name },
            { label: 'Email', value: user?.email },
            { label: 'Role', value: user?.role?.toUpperCase() },
            { label: 'Status', value: user?.isActive ? '✅ Active' : '❌ Inactive' },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
              <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{value}</span>
            </div>
          ))}
        </div>

        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '14px 24px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-elevated)',
            border: '1.5px solid var(--border)',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-display)',
            fontSize: 14, fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--error)'; e.currentTarget.style.color = '#fca5a5'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
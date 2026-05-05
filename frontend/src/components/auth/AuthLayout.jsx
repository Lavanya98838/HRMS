import { useNavigate } from 'react-router-dom';

const ROLE_CONFIG = {
  admin: {
    icon: '👑',
    color: '#7c3aed',
    label: 'Admin Portal',
    tagline: 'Full system access & control',
    features: ['Manage all users', 'System configuration', 'Audit logs & reports', 'Full data access'],
  },
  hr: {
    icon: '🧑‍💼',
    color: '#e11d74',
    label: 'HR Portal',
    tagline: 'Manage people, build culture',
    features: ['Employee management', 'Payroll processing', 'Leave approvals', 'Performance reviews'],
  },
  manager: {
    icon: '📊',
    color: '#f97316',
    label: 'Manager Portal',
    tagline: 'Lead your team to success',
    features: ['Team overview', 'Approve leave requests', 'Performance tracking', 'Attendance reports'],
  },
  employee: {
    icon: '🙋',
    color: '#10b981',
    label: 'Employee Portal',
    tagline: 'Your workspace, your profile',
    features: ['View payslips', 'Apply for leave', 'Track attendance', 'Update profile'],
  },
};

const AuthLayout = ({ children, role, mode = 'login' }) => {
  const navigate = useNavigate();
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.employee;

  return (
    <div className="auth-page">
      {/* ── Left Decorative Panel ── */}
      <div className="auth-panel-left">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="grid-pattern" />

        <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
          {/* Logo */}
          <div className="hrms-logo" style={{ marginBottom: 56 }}>
            <div className="hrms-logo-mark">H</div>
            <span className="hrms-logo-text">HRMS Portal</span>
          </div>

          {/* Role Icon */}
          <div
            className="fade-up"
            style={{
              width: 80, height: 80,
              borderRadius: 20,
              background: `${config.color}22`,
              border: `2px solid ${config.color}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36,
              marginBottom: 28,
              boxShadow: `0 0 40px ${config.color}33`,
            }}
          >
            {config.icon}
          </div>

          {/* Role Title */}
          <h1
            className="fade-up delay-1"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 38,
              fontWeight: 800,
              lineHeight: 1.1,
              marginBottom: 12,
              color: 'var(--text-primary)',
            }}
          >
            {config.label}
          </h1>

          <p
            className="fade-up delay-2"
            style={{
              color: 'var(--text-secondary)',
              fontSize: 15,
              marginBottom: 48,
              fontWeight: 300,
              fontStyle: 'italic',
            }}
          >
            {config.tagline}
          </p>

          {/* Features List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {config.features.map((feature, i) => (
              <div
                key={feature}
                className={`fade-up delay-${i + 3}`}
                style={{ display: 'flex', alignItems: 'center', gap: 14 }}
              >
                <div style={{
                  width: 32, height: 32,
                  borderRadius: 8,
                  background: `${config.color}22`,
                  border: `1px solid ${config.color}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7L5.5 10L11.5 4" stroke={config.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{feature}</span>
              </div>
            ))}
          </div>

          {/* Bottom portal switcher */}
          <div style={{ marginTop: 64 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 16, fontFamily: 'var(--font-display)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Switch Portal
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(ROLE_CONFIG).map(([r, c]) => (
                <button
                  key={r}
                  onClick={() => navigate(`/${r}/${mode}`)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 99,
                    border: `1px solid ${r === role ? c.color : 'var(--border)'}`,
                    background: r === role ? `${c.color}22` : 'transparent',
                    color: r === role ? c.color : 'var(--text-muted)',
                    fontSize: 12,
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {c.icon} {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="auth-panel-right">
        <div className="orb" style={{
          width: 300, height: 300,
          background: `radial-gradient(circle, ${config.color}18, transparent 70%)`,
          top: -80, right: -80,
          filter: 'blur(60px)',
          position: 'absolute',
          pointerEvents: 'none',
          animation: 'orb-drift 15s ease-in-out infinite',
        }} />

        <div className="auth-card">
          {/* Mobile logo */}
          <div className="hrms-logo" style={{ marginBottom: 32, display: 'none' }}>
            <div className="hrms-logo-mark">H</div>
            <span className="hrms-logo-text">HRMS Portal</span>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';

const PORTALS = [
  {
    role: 'admin',
    icon: '👑',
    label: 'Admin',
    desc: 'Full system access & control',
    color: '#7c3aed',
    gradient: 'linear-gradient(135deg, #7c3aed, #a855f7)',
  },
  {
    role: 'hr',
    icon: '🧑‍💼',
    label: 'HR',
    desc: 'Manage people & payroll',
    color: '#e11d74',
    gradient: 'linear-gradient(135deg, #e11d74, #f472b6)',
  },
  {
    role: 'manager',
    icon: '📊',
    label: 'Manager',
    desc: 'Lead your team',
    color: '#f97316',
    gradient: 'linear-gradient(135deg, #f97316, #fbbf24)',
  },
  {
    role: 'employee',
    icon: '🙋',
    label: 'Employee',
    desc: 'Your personal workspace',
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981, #34d399)',
  },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate(`/${user.role}/dashboard`, { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background orbs */}
      <div className="orb orb-1" style={{ position: 'fixed' }} />
      <div className="orb orb-2" style={{ position: 'fixed' }} />
      <div className="grid-pattern" style={{ position: 'fixed' }} />

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 700, width: '100%' }}>
        {/* Logo */}
        <div className="hrms-logo fade-up" style={{ justifyContent: 'center', marginBottom: 48 }}>
          <div className="hrms-logo-mark" style={{ width: 52, height: 52, fontSize: 22 }}>H</div>
          <span className="hrms-logo-text" style={{ fontSize: 26 }}>HRMS Portal</span>
        </div>

        {/* Headline */}
        <h1 className="fade-up delay-1" style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(36px, 6vw, 64px)',
          fontWeight: 800,
          lineHeight: 1.05,
          marginBottom: 16,
        }}>
          Enterprise{' '}
          <span style={{
            background: 'var(--grad-primary)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            HR Management
          </span>
          <br />System
        </h1>

        <p className="fade-up delay-2" style={{
          color: 'var(--text-secondary)',
          fontSize: 16,
          marginBottom: 56,
          maxWidth: 480,
          margin: '0 auto 56px',
          lineHeight: 1.7,
        }}>
          Select your portal to access the system. Each role has a dedicated workspace tailored to your responsibilities.
        </p>

        {/* Portal Cards */}
        <div className="fade-up delay-3" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 16,
          maxWidth: 600,
          margin: '0 auto',
        }}>
          {PORTALS.map((portal, i) => (
            <button
              key={portal.role}
              onClick={() => navigate(`/${portal.role}/login`)}
              className={`fade-up delay-${i + 3}`}
              style={{
                background: 'var(--bg-card)',
                border: `1.5px solid var(--border)`,
                borderRadius: 'var(--radius-lg)',
                padding: '28px 24px',
                cursor: 'pointer',
                transition: 'all 0.3s var(--ease-spring)',
                textAlign: 'left',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = portal.color;
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = `0 12px 40px ${portal.color}33`;
                e.currentTarget.style.background = 'var(--bg-elevated)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.background = 'var(--bg-card)';
              }}
            >
              {/* Glow accent */}
              <div style={{
                position: 'absolute',
                top: 0, right: 0,
                width: 80, height: 80,
                background: `radial-gradient(circle at top right, ${portal.color}22, transparent 70%)`,
                borderRadius: 'inherit',
              }} />

              <div style={{ fontSize: 32, marginBottom: 12 }}>{portal.icon}</div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 18,
                fontWeight: 800,
                color: 'var(--text-primary)',
                marginBottom: 6,
              }}>
                {portal.label} Portal
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{portal.desc}</div>

              <div style={{
                marginTop: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: portal.color,
                fontSize: 12,
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>
                Sign In <span>→</span>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <p className="fade-up" style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 48, lineHeight: 1.6 }}>
          Enterprise HRMS v1.0 <br />
        </p>
      </div>
    </div>
  );
};

export default LandingPage;

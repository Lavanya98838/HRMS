import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, getPortalPath } from '../../context/AuthContext';
import toast from 'react-hot-toast';
// Reuses LoginPage.css — same two-panel layout, same form field classes
import './LoginPage.css';

// ── Eye icon ──────────────────────────────────────────────
const EyeIcon = ({ open }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {open ? (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </>
    ) : (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </>
    )}
  </svg>
);

// ── Password strength bar ─────────────────────────────────
const StrengthBar = ({ password }) => {
  const getStrength = (p) => {
    let score = 0;
    if (p.length >= 8)           score++;
    if (/[A-Z]/.test(p))         score++;
    if (/[0-9]/.test(p))         score++;
    if (/[^A-Za-z0-9]/.test(p))  score++;
    return score;
  };

  const strength = getStrength(password);
  const labels   = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors   = ['', '#ef4444', '#f59e0b', '#10b981', '#6d28d9'];

  if (!password) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              flex: 1, height: 3, borderRadius: 99,
              background: i <= strength ? colors[strength] : 'var(--border)',
              transition: 'all 0.3s',
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 11, color: colors[strength] }}>{labels[strength]}</span>
    </div>
  );
};

// ── Main component ────────────────────────────────────────
const RegisterPage = () => {
  const { register } = useAuth();
  const navigate     = useNavigate();

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
  });
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const validate = () => {
    if (!form.name.trim())                     return 'Full name is required.';
    if (form.name.trim().length < 2)            return 'Name must be at least 2 characters.';
    if (!form.email)                            return 'Email is required.';
    if (!/\S+@\S+\.\S+/.test(form.email))      return 'Please enter a valid email.';
    if (!form.password)                         return 'Password is required.';
    if (form.password.length < 8)              return 'Password must be at least 8 characters.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError('');
    try {
      const userData = await register(form.name.trim(), form.email, form.password);
      toast.success(`Welcome, ${userData.name?.split(' ')[0]}! Account created.`);
      navigate(getPortalPath(userData), { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Registration failed. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      {/* ── Left branding panel — reuses login-brand classes ── */}
      <div className="login-brand">
        <div className="login-brand__inner">
          <div className="login-brand__logo">
            <div className="hrms-logo-mark">H</div>
            <span className="hrms-logo-text" style={{ fontSize: 16 }}>HRMS Portal</span>
          </div>
          <h1 className="login-brand__heading">
            Join your<br />team today.
          </h1>
          <p className="login-brand__sub">
            Create your account and get instant access to your
            role-specific portal. Your workspace is assigned automatically
            based on your role level.
          </p>
          <div className="login-brand__pills">
            {[
              { label: 'Admin',     color: '#7c3aed' },
              { label: 'Sub-Admin', color: '#6366f1' },
              { label: 'HR',        color: '#e11d74' },
              { label: 'Manager',   color: '#f97316' },
              { label: 'Employee',  color: '#10b981' },
            ].map((p) => (
              <span
                key={p.label}
                className="login-brand__pill"
                style={{ borderColor: p.color, color: p.color, background: `${p.color}18` }}
              >
                {p.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel — reuses login-form-panel classes ── */}
      <div className="login-form-panel">
        <div className="login-form-card">

          {/* Header */}
          <div className="login-form-card__header">
            <h2 className="login-form-card__title">Create account</h2>
            <p className="login-form-card__sub">
              Already have an account?{' '}
              <Link
                to="/login"
                style={{ color: 'var(--violet-light)', textDecoration: 'none', fontWeight: 600 }}
              >
                Sign in
              </Link>
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px', fontSize: 13,
              color: '#fca5a5', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form" noValidate>

            {/* Full Name */}
            <div className="lf-group">
              <label className="lf-label">Full Name</label>
              <div className="lf-input-wrap">
                <svg className="lf-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <input
                  className="lf-input"
                  type="text"
                  name="name"
                  placeholder="Your full name"
                  value={form.name}
                  onChange={handleChange}
                  autoComplete="name"
                  autoFocus
                />
              </div>
            </div>

            {/* Email */}
            <div className="lf-group">
              <label className="lf-label">Email Address</label>
              <div className="lf-input-wrap">
                <svg className="lf-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <input
                  className="lf-input"
                  type="email"
                  name="email"
                  placeholder="your@company.com"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="lf-group">
              <label className="lf-label">Password</label>
              <div className="lf-input-wrap">
                <svg className="lf-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  className="lf-input"
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="lf-toggle-pass"
                  onClick={() => setShowPass((s) => !s)}
                  tabIndex={-1}
                >
                  <EyeIcon open={showPass} />
                </button>
              </div>
              <StrengthBar password={form.password} />
            </div>

            {/* Confirm Password */}
            <div className="lf-group">
              <label className="lf-label">Confirm Password</label>
              <div className="lf-input-wrap">
                <svg className="lf-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  className="lf-input"
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  placeholder="Re-enter your password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  style={{
                    borderColor: form.confirmPassword
                      ? form.password === form.confirmPassword ? '#10b981' : '#ef4444'
                      : undefined,
                  }}
                />
                <button
                  type="button"
                  className="lf-toggle-pass"
                  onClick={() => setShowConfirm((s) => !s)}
                  tabIndex={-1}
                >
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
              {form.confirmPassword && form.password !== form.confirmPassword && (
                <span style={{ fontSize: 12, color: '#ef4444', marginTop: 4, display: 'block' }}>
                  Passwords do not match
                </span>
              )}
              {form.confirmPassword && form.password === form.confirmPassword && form.password && (
                <span style={{ fontSize: 12, color: '#10b981', marginTop: 4, display: 'block' }}>
                  ✓ Passwords match
                </span>
              )}
            </div>

            {/* Submit */}
            <button type="submit" className="lf-submit" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? (
                <span className="lf-spinner" />
              ) : (
                <>
                  Create Account
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </>
              )}
            </button>

          </form>

          <p className="login-form-card__footer">
            Your portal is assigned automatically based on your role level.
            Contact your administrator if you need access.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
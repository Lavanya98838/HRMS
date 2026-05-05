import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from './AuthLayout';

const EyeIcon = ({ open }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
);

const ROLE_LABELS = {
  admin: { title: 'Admin Login', subtitle: 'Full system access', color: '#7c3aed' },
  hr: { title: 'HR Login', subtitle: 'Human resources portal', color: '#e11d74' },
  manager: { title: 'Manager Login', subtitle: 'Team management portal', color: '#f97316' },
  employee: { title: 'Employee Login', subtitle: 'Self-service portal', color: '#10b981' },
};

const LoginForm = ({ role }) => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const config = ROLE_LABELS[role];

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const user = await login(form.email, form.password, role);
      // Redirect to role dashboard
      navigate(`/${user.role}/dashboard`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout role={role} mode="login">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>

        {/* Header */}
        <div className="fade-up" style={{ marginBottom: 8 }}>
          <span className={`role-badge ${role}`}>{role}</span>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 32,
            fontWeight: 800,
            marginTop: 12,
            marginBottom: 6,
            lineHeight: 1.1,
          }}>
            {config.title}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{config.subtitle}</p>
        </div>

        {/* Error */}
        {error && (
          <div className="form-error">
            <span>⚠</span> {error}
          </div>
        )}

        {/* Email */}
        <div className="field-group fade-up delay-1">
          <label className="field-label">Email Address</label>
          <div className="field-wrapper">
            <span className="field-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </span>
            <input
              className="field-input"
              type="email"
              name="email"
              placeholder="your@email.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </div>
        </div>

        {/* Password */}
        <div className="field-group fade-up delay-2">
          <label className="field-label">Password</label>
          <div className="field-wrapper">
            <span className="field-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <input
              className="field-input"
              type={showPass ? 'text' : 'password'}
              name="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="field-toggle"
              onClick={() => setShowPass(!showPass)}
              tabIndex={-1}
            >
              <EyeIcon open={showPass} />
            </button>
          </div>
        </div>

        {/* Forgot password */}
        <div className="fade-up delay-3" style={{ textAlign: 'right', marginTop: -8 }}>
          <Link to={`/forgot-password?role=${role}`} className="auth-link" style={{ fontSize: 13 }}>
            Forgot password?
          </Link>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn-primary fade-up delay-4"
          disabled={loading}
        >
          {loading && <span className="btn-loader" />}
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        {/* Divider */}
        <div className="auth-divider fade-up delay-5">
          <span>Don't have an account?</span>
        </div>

        {/* Register link */}
        <Link to={`/${role}/register`} className="fade-up delay-6">
          <button type="button" className="btn-ghost" style={{ width: '100%' }}>
            Create {role.charAt(0).toUpperCase() + role.slice(1)} Account
          </button>
        </Link>

      </form>
    </AuthLayout>
  );
};

export default LoginForm;

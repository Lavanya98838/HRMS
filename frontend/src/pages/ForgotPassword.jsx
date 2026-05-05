import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [step, setStep]               = useState('email');
  const [email, setEmail]             = useState('');
  const [otp, setOtp]                 = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpRefs = useRef([]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCooldown]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email) { setError('Email is required'); return; }
    setLoading(true); setError('');
    try {
      await authAPI.forgotPassword(email);
      setStep('otp');
      setResendCooldown(60);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP.');
    } finally { setLoading(false); }
  };

  const handleOTPChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const updated = [...otp];
    updated[index] = value.slice(-1);
    setOtp(updated);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    if (error) setError('');
  };

  const handleOTPKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOTPPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const updated = [...otp];
    pasted.split('').forEach((char, i) => { updated[i] = char; });
    setOtp(updated);
    const nextEmpty = updated.findIndex(v => !v);
    otpRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length < 6) { setError('Please enter all 6 digits.'); return; }
    setLoading(true); setError('');
    try {
      await authAPI.verifyOTP(email, otpString);
      setStep('reset');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP.');
    } finally { setLoading(false); }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setLoading(true); setError('');
    try {
      await authAPI.forgotPassword(email);
      setResendCooldown(60);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP.');
    } finally { setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true); setError('');
    try {
      await authAPI.resetPassword(email, otp.join(''), newPassword);
      setStep('success');
    } catch (err) {
      setError(err.response?.data?.message || 'Password reset failed.');
    } finally { setLoading(false); }
  };

  // ── Shared UI ─────────────────────────────────────
  const stepLabels = ['Send OTP', 'Verify', 'Reset'];
  const stepIndex  = { email: 0, otp: 1, reset: 2, success: 3 };

  const StepIndicator = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 28 }}>
      {stepLabels.map((s, i) => {
        const current = stepIndex[step];
        const done    = i < current;
        const active  = i === current;
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
              background: done ? '#10b981' : active ? 'var(--violet)' : 'var(--bg-elevated)',
              border: `2px solid ${done ? '#10b981' : active ? 'var(--violet)' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700,
              color: done || active ? '#fff' : 'var(--text-muted)',
              transition: 'all 0.3s',
            }}>
              {done
                ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                : i + 1}
            </div>
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
              color: active ? 'var(--text-primary)' : done ? '#10b981' : 'var(--text-muted)',
            }}>{s}</span>
            {i < stepLabels.length - 1 && (
              <div style={{
                width: 20, height: 2, borderRadius: 1,
                background: done ? '#10b981' : 'var(--border)',
                transition: 'background 0.3s',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );

  const ErrorBox = () => error ? (
    <div style={{
      padding: '10px 14px', borderRadius: 8, marginBottom: 16,
      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
      color: '#f87171', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {error}
    </div>
  ) : null;

  const BackBtn = ({ onClick, label = 'Back to Login' }) => (
    <div style={{ textAlign: 'center', marginTop: 8 }}>
      <button type="button" onClick={onClick} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text-muted)', fontSize: 13, fontFamily: 'var(--font-body)',
        display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'color 0.2s',
      }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
        </svg>
        {label}
      </button>
    </div>
  );

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-blob login-blob-1" />
        <div className="login-blob login-blob-2" />
        <div className="login-blob login-blob-3" />
      </div>

      <div className="login-card">
        {/* Logo — always visible */}
        <div className="login-logo">
          <div className="login-logo-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div className="login-logo-text">
            <span className="login-logo-title">HRMS</span>
            <span className="login-logo-sub">Human Resource Management</span>
          </div>
        </div>

        {/* ── EMAIL ───────────────────────────────────── */}
        {step === 'email' && (
          <>
            <div className="login-heading">
              <h1>Forgot Password?</h1>
              <p>Enter your registered email — we'll send a 6-digit OTP.</p>
            </div>
            <StepIndicator />
            <ErrorBox />
            <form className="login-form" onSubmit={handleSendOTP} noValidate>
              <div className="login-field">
                <label>Email address</label>
                <div className="login-input-wrap">
                  <svg className="login-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <input type="email" placeholder="you@company.com" value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); }}
                    autoComplete="email" required />
                </div>
              </div>
              <button type="submit" className="login-submit" disabled={loading || !email}>
                {loading
                  ? <><span className="login-spinner" />Sending OTP...</>
                  : <>Send OTP to Email <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></>
                }
              </button>
              <BackBtn onClick={() => navigate('/login')} />
            </form>
          </>
        )}

        {/* ── OTP ─────────────────────────────────────── */}
        {step === 'otp' && (
          <>
            <div className="login-heading">
              <h1>Enter OTP</h1>
              <p>Sent a 6-digit code to <strong style={{ color: 'var(--violet)', fontWeight: 600 }}>{email}</strong></p>
            </div>
            <StepIndicator />
            <ErrorBox />
            <form onSubmit={handleVerifyOTP} noValidate>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 24 }} onPaste={handleOTPPaste}>
                {otp.map((digit, i) => (
                  <input key={i} ref={el => otpRefs.current[i] = el}
                    type="text" inputMode="numeric" maxLength={1} value={digit}
                    onChange={e => handleOTPChange(i, e.target.value)}
                    onKeyDown={e => handleOTPKeyDown(i, e)}
                    autoFocus={i === 0}
                    style={{
                      width: 48, height: 56, textAlign: 'center',
                      fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-display)',
                      background: digit ? 'rgba(139,92,246,0.1)' : 'var(--bg-elevated)',
                      border: `2px solid ${digit ? 'var(--violet)' : 'var(--border)'}`,
                      borderRadius: 10, color: 'var(--text-primary)', outline: 'none',
                      caretColor: 'var(--violet)', transition: 'all 0.2s',
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--violet)'}
                    onBlur={e => e.target.style.borderColor = digit ? 'var(--violet)' : 'var(--border)'}
                  />
                ))}
              </div>
              <button type="submit" className="login-submit" disabled={loading || otp.join('').length < 6}>
                {loading
                  ? <><span className="login-spinner" />Verifying...</>
                  : <>Verify OTP <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></>
                }
              </button>
              <div style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: 'var(--text-muted)' }}>
                Didn't receive it?{' '}
                <button type="button" onClick={handleResendOTP} disabled={resendCooldown > 0 || loading}
                  style={{
                    background: 'none', border: 'none', padding: 0, fontFamily: 'var(--font-body)',
                    fontSize: 13, textDecoration: 'underline',
                    cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                    color: resendCooldown > 0 ? 'var(--text-muted)' : 'var(--violet)',
                  }}>
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                </button>
              </div>
              <BackBtn onClick={() => setStep('email')} label="Change Email" />
            </form>
          </>
        )}

        {/* ── RESET ───────────────────────────────────── */}
        {step === 'reset' && (
          <>
            <div className="login-heading">
              <h1>New Password</h1>
              <p>Choose a strong password for your account.</p>
            </div>
            <StepIndicator />
            <ErrorBox />
            <form className="login-form" onSubmit={handleResetPassword} noValidate>
              <div className="login-field">
                <label>New Password</label>
                <div className="login-input-wrap">
                  <svg className="login-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <input type={showPass ? 'text' : 'password'} placeholder="Min. 8 characters"
                    value={newPassword} onChange={e => { setNewPassword(e.target.value); setError(''); }} required />
                  <button type="button" className="login-eye-btn" onClick={() => setShowPass(v => !v)} tabIndex={-1}>
                    {showPass
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    }
                  </button>
                </div>
              </div>

              {/* Strength bar */}
              {newPassword && (
                <div style={{ display: 'flex', gap: 4, marginTop: -10 }}>
                  {[3, 6, 9, 12].map((threshold, i) => (
                    <div key={i} style={{
                      flex: 1, height: 3, borderRadius: 2, transition: 'background 0.3s',
                      background: newPassword.length >= threshold
                        ? ['#ef4444','#f59e0b','#10b981','#6366f1'][i]
                        : 'var(--border)',
                    }} />
                  ))}
                </div>
              )}

              <div className="login-field">
                <label>Confirm Password</label>
                <div className="login-input-wrap">
                  <svg className="login-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <input type={showConfirm ? 'text' : 'password'} placeholder="Re-enter password"
                    value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setError(''); }} required />
                  <button type="button" className="login-eye-btn" onClick={() => setShowConfirm(v => !v)} tabIndex={-1}>
                    {showConfirm
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    }
                  </button>
                </div>
              </div>

              <button type="submit" className="login-submit" disabled={loading || !newPassword || !confirmPassword}>
                {loading
                  ? <><span className="login-spinner" />Resetting...</>
                  : <>Reset Password <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></>
                }
              </button>
            </form>
          </>
        )}

        {/* ── SUCCESS ─────────────────────────────────── */}
        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', margin: '0 auto 24px',
              background: 'rgba(16,185,129,0.1)', border: '2px solid #10b981',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 10px' }}>
              Password Reset!
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>
              Your password has been updated successfully. You can now sign in with your new credentials.
            </p>
            <button className="login-submit" onClick={() => navigate('/login')} style={{ width: '100%' }}>
              Back to Login
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default ForgotPassword;
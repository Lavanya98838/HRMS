import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ── ProtectedRoute ────────────────────────────────────────
// Redirects unauthenticated users to /login (unified login page)
// Passes the attempted path as state so login can redirect back after
export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg-base)',
        flexDirection: 'column', gap: 16,
      }}>
        <div style={{
          width: 40, height: 40,
          border: '3px solid var(--border)',
          borderTopColor: 'var(--violet)',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
        <p style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>
          Loading...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    // Save attempted path so login can redirect back after auth
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
};

// ── RoleRoute ─────────────────────────────────────────────
// Blocks users whose role isn't in allowedRoles
// Redirects them to their correct portal dashboard
export const RoleRoute = ({ children, allowedRoles }) => {
  const { user, getPortalPath } = useAuth();

  if (!user) return null;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getPortalPath(user)} replace />;
  }

  return children;
};
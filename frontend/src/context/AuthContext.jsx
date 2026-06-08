import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authAPI } from '../utils/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

const SESSION_TIMEOUT = 30 * 60 * 1000;
const ACTIVITY_PING   = 4 * 60 * 1000;
const REFRESH_BEFORE  = 2 * 60 * 1000;
const ACCESS_TTL      = 15 * 60 * 1000;

// ── Portal detection from roleLevel ─────────────────────
// Level 1–5   → employee
// Level 6–7   → manager
// Level 8–9   → hr
// Level 10    → subadmin  (CEO, CFO, COO, CTO)
// role === 'admin' flag → admin (special hardcoded account)
export const getPortalFromUser = (userData) => {
  if (!userData) return null;
  if (userData.role === 'admin')    return 'admin';
  if (userData.role === 'subadmin') return 'subadmin';  // explicit subadmin role
  if (userData.role === 'hr')       return 'hr';
  if (userData.role === 'manager')  return 'manager';
  // Fallback: use roleLevel for legacy/manual entries
  const level = userData.roleLevel ?? 0;
  if (level >= 10) return 'subadmin';
  if (level >= 8)  return 'hr';
  if (level >= 6)  return 'manager';
  return 'employee';
};

export const getDashboardPath = (userData) => {
  const portal = getPortalFromUser(userData);
  const map = {
    admin:    '/admin/dashboard',
    subadmin: '/subadmin/dashboard',
    hr:       '/hr/dashboard',
    manager:  '/manager/dashboard',
    employee: '/employee/dashboard',
  };
  return map[portal] || '/login';
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  const sessionTimer  = useRef(null);
  const activityTimer = useRef(null);
  const refreshTimer  = useRef(null);
  const lastActivity  = useRef(Date.now());

  // ── Reset session timeout ────────────────────────────
  const resetSessionTimer = useCallback(() => {
    lastActivity.current = Date.now();
    clearTimeout(sessionTimer.current);
    sessionTimer.current = setTimeout(() => {
      console.warn('⏱ Session timed out due to inactivity');
      logout(true);
    }, SESSION_TIMEOUT);
  }, []);

  // ── Schedule token refresh ───────────────────────────
  const scheduleTokenRefresh = useCallback(() => {
    clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(async () => {
      try {
        const { data } = await authAPI.refresh();
        sessionStorage.setItem('accessToken', data.data.accessToken);
        scheduleTokenRefresh();
      } catch {
        logout(true);
      }
    }, ACCESS_TTL - REFRESH_BEFORE);
  }, []);

  // ── Start activity ping ──────────────────────────────
  const startActivityPing = useCallback(() => {
    clearInterval(activityTimer.current);
    activityTimer.current = setInterval(async () => {
      try { await authAPI.updateActivity(); } catch { /* silent */ }
    }, ACTIVITY_PING);
  }, []);

  // ── Track user interactions ──────────────────────────
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const handleActivity = () => { if (user) resetSessionTimer(); };
    events.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, handleActivity));
  }, [user, resetSessionTimer]);

  // ── Logout ───────────────────────────────────────────
  const logout = useCallback(async (silent = false) => {
    try {
      if (!silent) await authAPI.logout();
    } catch { /* ignore */ } finally {
      sessionStorage.clear();
      setUser(null);
      clearTimeout(sessionTimer.current);
      clearTimeout(refreshTimer.current);
      clearInterval(activityTimer.current);
    }
  }, []);

  // ── Login — role param removed, portal auto-detected ─
  const login = useCallback(async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    const { user: userData, accessToken } = data.data;

    sessionStorage.setItem('accessToken', accessToken);
    setUser(userData);

    resetSessionTimer();
    scheduleTokenRefresh();
    startActivityPing();

    // Return userData so LoginPage can call getDashboardPath(userData) to navigate
    return userData;
  }, [resetSessionTimer, scheduleTokenRefresh, startActivityPing]);

  // ── Register ─────────────────────────────────────────
  const register = useCallback(async (name, email, password) => {
    const { data } = await authAPI.register({ name, email, password });
    const { user: userData, accessToken } = data.data;

    sessionStorage.setItem('accessToken', accessToken);
    setUser(userData);

    resetSessionTimer();
    scheduleTokenRefresh();
    startActivityPing();

    return userData;
  }, [resetSessionTimer, scheduleTokenRefresh, startActivityPing]);

  // ── Check existing session on mount ─────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await authAPI.refresh();
        sessionStorage.setItem('accessToken', data.data.accessToken);
        const meRes = await authAPI.getMe();
        setUser(meRes.data.data.user);
        resetSessionTimer();
        scheduleTokenRefresh();
        startActivityPing();
      } catch {
        sessionStorage.clear();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    init();

    return () => {
      clearTimeout(sessionTimer.current);
      clearTimeout(refreshTimer.current);
      clearInterval(activityTimer.current);
    };
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      register,
      setUser,
      getPortal:    () => getPortalFromUser(user),
      getDashboard: () => getDashboardPath(user),
    }}>
      {children}
    </AuthContext.Provider>
  );
};
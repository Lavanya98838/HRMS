import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const ThemeContext = createContext(null);

export const THEME_COLORS = {
  violet: { primary: '#7c3aed', light: '#a78bfa', dim: '#7c3aed33', grad: 'linear-gradient(135deg, #7c3aed, #e11d74, #f97316)' },
  blue:   { primary: '#2563eb', light: '#93c5fd', dim: '#2563eb33', grad: 'linear-gradient(135deg, #2563eb, #7c3aed, #06b6d4)' },
  green:  { primary: '#059669', light: '#6ee7b7', dim: '#05966933', grad: 'linear-gradient(135deg, #059669, #10b981, #34d399)' },
  orange: { primary: '#ea580c', light: '#fdba74', dim: '#ea580c33', grad: 'linear-gradient(135deg, #ea580c, #f97316, #fbbf24)' },
  pink:   { primary: '#db2777', light: '#f9a8d4', dim: '#db277733', grad: 'linear-gradient(135deg, #db2777, #e11d74, #f472b6)' },
  teal:   { primary: '#0891b2', light: '#67e8f9', dim: '#0891b233', grad: 'linear-gradient(135deg, #0891b2, #06b6d4, #22d3ee)' },
};

const DEFAULTS = {
  themeMode: 'dark',
  themeColor: 'violet',
  contrast: 'shadow',
  sidebarCaption: true,
  layout: 'default',
  menuOrientation: 'vertical',
};

const load = () => {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('hrms_theme') || '{}') }; }
  catch { return DEFAULTS; }
};

const save = (s) => {
  try { localStorage.setItem('hrms_theme', JSON.stringify(s)); } catch {}
};

export const ThemeProvider = ({ children }) => {
  const [settings, setSettings] = useState(load);
  const [themeKey, setThemeKey] = useState(0);

  const apply = useCallback((s) => {
    const root = document.documentElement;
    const color = THEME_COLORS[s.themeColor] || THEME_COLORS.violet;

    // ── Color theme ──────────────────────────────────
    root.style.setProperty('--violet',        color.primary);
    root.style.setProperty('--violet-light',  color.light);
    root.style.setProperty('--violet-dim',    color.dim);
    root.style.setProperty('--grad-primary',  color.grad);
    root.style.setProperty('--grad-accent',   color.grad);
    root.style.setProperty('--shadow-violet', `0 8px 32px ${color.dim}`);
    root.style.setProperty('--border-active', `${color.primary}66`);
    root.style.setProperty('--border-glow',   color.primary);

    // ── Light / Dark mode ────────────────────────────
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = s.themeMode === 'dark' || (s.themeMode === 'auto' && prefersDark);

    if (isDark) {
      root.style.setProperty('--bg-base',      '#080812');
      root.style.setProperty('--bg-surface',   '#0e0e1c');
      root.style.setProperty('--bg-card',      '#12121f');
      root.style.setProperty('--bg-elevated',  '#1a1a2e');
      root.style.setProperty('--bg-hover',     '#1e1e34');
      root.style.setProperty('--text-primary', '#f1f0ff');
      root.style.setProperty('--text-secondary','#a09cc0');
      root.style.setProperty('--text-muted',   '#5a5680');
      root.style.setProperty('--border',       '#1e1e38');
      root.style.setProperty('--grad-subtle',  'linear-gradient(135deg, #1a1a35, #2a1040)');
      root.style.setProperty('--grad-glow',    `linear-gradient(135deg, ${color.primary}44, ${color.primary}22)`);
      root.style.setProperty('--shadow-card',  '0 4px 40px rgba(0,0,0,0.5)');
      root.style.setProperty('--shadow-glow',  '0 0 60px rgba(124,58,237,0.15)');
    } else {
      root.style.setProperty('--bg-base',      '#f5f5ff');
      root.style.setProperty('--bg-surface',   '#ffffff');
      root.style.setProperty('--bg-card',      '#ffffff');
      root.style.setProperty('--bg-elevated',  '#f0f0fa');
      root.style.setProperty('--bg-hover',     '#e8e8f8');
      root.style.setProperty('--text-primary', '#1a1a2e');
      root.style.setProperty('--text-secondary','#4a4870');
      root.style.setProperty('--text-muted',   '#8888aa');
      root.style.setProperty('--border',       '#ddddf0');
      root.style.setProperty('--grad-subtle',  'linear-gradient(135deg, #ede9fe, #fce7f3)');
      root.style.setProperty('--grad-glow',    `linear-gradient(135deg, ${color.primary}22, ${color.primary}11)`);
      root.style.setProperty('--shadow-card',  '0 4px 24px rgba(0,0,0,0.08)');
      root.style.setProperty('--shadow-glow',  `0 0 40px ${color.dim}`);
    }

    // ── Contrast vs Shadow ────────────────────────────
    root.style.setProperty('--card-shadow',
      s.contrast === 'contrast'
        ? `0 0 0 2px ${color.primary}55, 0 4px 20px ${color.primary}22, inset 0 1px 0 ${color.primary}22`
        : isDark
          ? '0 4px 40px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.05)'
          : '0 4px 24px rgba(0,0,0,0.10), 0 1px 0 rgba(255,255,255,0.8)'
    );

    // ── RTL ──────────────────────────────────────────
    root.setAttribute('dir', s.layout === 'rtl' ? 'rtl' : 'ltr');

    // ── Data attrs ───────────────────────────────────
    root.dataset.themeMode    = isDark ? 'dark' : 'light';
    root.dataset.themeColor   = s.themeColor;
    root.dataset.layout       = s.layout;
    root.dataset.orientation  = s.menuOrientation;
    root.dataset.caption      = s.sidebarCaption ? 'show' : 'hide';
  }, []);

  useEffect(() => {
    apply(settings);
    setThemeKey(k => k + 1); // force re-render of consumers
  }, [settings, apply]);

  const update = useCallback((patch) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      save(next);
      return next;
    });
  }, []);

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = settings.themeMode === 'dark' || (settings.themeMode === 'auto' && prefersDark);

  return (
    <ThemeContext.Provider value={{ settings, update, THEME_COLORS, isDark, themeKey }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
};
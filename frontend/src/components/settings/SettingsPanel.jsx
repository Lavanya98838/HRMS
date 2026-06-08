import { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 20 }}>
    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>{title}</p>
    {children}
  </div>
);

const OptionGrid = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>{children}</div>
);

const OptionCard = ({ label, icon, active, onClick }) => (
  <button onClick={onClick} style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    padding: '10px 6px', borderRadius: 10,
    border: active ? '2px solid var(--violet)' : '2px solid var(--border)',
    background: active ? 'var(--violet-dim)' : 'var(--bg-elevated)',
    color: active ? 'var(--violet-light)' : 'var(--text-secondary)',
    cursor: 'pointer', transition: 'all 0.2s', fontSize: 11, fontWeight: 600,
    fontFamily: 'var(--font-body)',
  }}>
    <span style={{ fontSize: 20 }}>{icon}</span>
    {label}
  </button>
);

const TwoOption = ({ options, value, onChange }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
    {options.map(o => (
      <button key={o.value} onClick={() => onChange(o.value)} style={{
        padding: '10px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600,
        border: value === o.value ? '2px solid var(--violet)' : '2px solid var(--border)',
        background: value === o.value ? 'var(--violet-dim)' : 'var(--bg-elevated)',
        color: value === o.value ? 'var(--violet-light)' : 'var(--text-secondary)',
        cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'var(--font-body)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      }}>
        <span style={{ fontSize: 18 }}>{o.icon}</span>
        {o.label}
      </button>
    ))}
  </div>
);

const ColorSwatch = ({ color, label, active, onClick }) => (
  <button onClick={onClick} title={label} style={{
    width: 32, height: 32, borderRadius: '50%', border: 'none',
    background: color, cursor: 'pointer', position: 'relative',
    outline: active ? `3px solid ${color}` : '3px solid transparent',
    outlineOffset: 2, transition: 'all 0.2s', transform: active ? 'scale(1.15)' : 'scale(1)',
  }} />
);

export const SettingsTrigger = ({ onClick }) => (
  <button onClick={onClick} title="Settings" style={{
    width: 36, height: 36, borderRadius: 10,
    background: 'var(--bg-elevated)', border: '1.5px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s',
    flexShrink: 0,
  }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--violet)'; e.currentTarget.style.color = 'var(--violet-light)'; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  </button>
);

const SettingsPanel = ({ open, onClose }) => {
  const { settings, update, THEME_COLORS } = useTheme();
  const panelRef = useRef(null);
  const dragRef  = useRef({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0 });
  const [pos, setPos] = useState({ right: 0, top: 60 });

  // Drag logic
  const onMouseDown = useCallback((e) => {
    if (e.target.closest('button') || e.target.closest('input')) return;
    dragRef.current.dragging = true;
    dragRef.current.startX = e.clientX;
    dragRef.current.startY = e.clientY;
    const rect = panelRef.current.getBoundingClientRect();
    dragRef.current.origX = rect.left;
    dragRef.current.origY = rect.top;
    e.preventDefault();
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current.dragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const panel = panelRef.current;
      if (!panel) return;
      const w = panel.offsetWidth;
      const h = panel.offsetHeight;
      let newLeft = dragRef.current.origX + dx;
      let newTop  = dragRef.current.origY + dy;
      newLeft = Math.max(0, Math.min(window.innerWidth - w, newLeft));
      newTop  = Math.max(0, Math.min(window.innerHeight - h, newTop));
      panel.style.left  = newLeft + 'px';
      panel.style.top   = newTop  + 'px';
      panel.style.right = 'auto';
    };
    const onUp = () => { dragRef.current.dragging = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  if (!open) return null;

  const colorList = [
    { key: 'violet', hex: '#7c3aed' },
    { key: 'blue',   hex: '#2563eb' },
    { key: 'green',  hex: '#059669' },
    { key: 'orange', hex: '#ea580c' },
    { key: 'pink',   hex: '#db2777' },
    { key: 'teal',   hex: '#0891b2' },
  ];

  return (
    <div
      ref={panelRef}
      onMouseDown={onMouseDown}
      style={{
        position: 'fixed', top: pos.top, right: pos.right,
        width: 280, maxHeight: '90vh', overflowY: 'auto',
        background: 'var(--bg-surface)', border: '1.5px solid var(--border)',
        borderRadius: 16, zIndex: 9999, boxShadow: '0 8px 60px rgba(0,0,0,0.6)',
        padding: 20, cursor: 'grab',
        animation: 'slideInRight 0.25s cubic-bezier(0.4,0,0.2,1) both',
        userSelect: 'none',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Settings</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Customize your portal</p>
        </div>
        <button onClick={onClose} style={{
          width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)',
          background: 'var(--bg-elevated)', color: 'var(--text-muted)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
        }}>×</button>
      </div>

      {/* Theme Mode */}
      <Section title="Theme Mode">
        <OptionGrid>
          <OptionCard label="Light" icon="☀️" active={settings.themeMode === 'light'} onClick={() => update({ themeMode: 'light' })} />
          <OptionCard label="Dark"  icon="🌙" active={settings.themeMode === 'dark'}  onClick={() => update({ themeMode: 'dark' })} />
          <OptionCard label="Auto"  icon="⚙️" active={settings.themeMode === 'auto'}  onClick={() => update({ themeMode: 'auto' })} />
        </OptionGrid>
      </Section>

      {/* Theme Contrast */}
      <Section title="Theme Contrast">
        <TwoOption
          value={settings.contrast}
          onChange={v => update({ contrast: v })}
          options={[
            { value: 'contrast', label: 'Contrast', icon: '◑' },
            { value: 'shadow',   label: 'Shadow',   icon: '🌑' },
          ]}
        />
      </Section>

      {/* Custom Theme Color */}
      <Section title="Custom Theme">
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>Choose your primary theme color</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {colorList.map(c => (
            <ColorSwatch
              key={c.key}
              color={c.hex}
              label={c.key}
              active={settings.themeColor === c.key}
              onClick={() => update({ themeColor: c.key })}
            />
          ))}
        </div>
      </Section>

      {/* Sidebar Caption */}
      <Section title="Sidebar Caption">
        <TwoOption
          value={settings.sidebarCaption ? 'show' : 'hide'}
          onChange={v => update({ sidebarCaption: v === 'show' })}
          options={[
            { value: 'show', label: 'Show Caption', icon: '📋' },
            { value: 'hide', label: 'Hide Caption', icon: '🚫' },
          ]}
        />
      </Section>

      {/* Theme Layout */}
      <Section title="Theme Layout">
        <OptionGrid>
          <OptionCard label="Default" icon="⬛" active={settings.layout === 'default'} onClick={() => update({ layout: 'default' })} />
          <OptionCard label="Mini"    icon="◼"  active={settings.layout === 'mini'}    onClick={() => update({ layout: 'mini' })} />
          <OptionCard label="RTL"     icon="↩️"  active={settings.layout === 'rtl'}     onClick={() => update({ layout: 'rtl' })} />
        </OptionGrid>
      </Section>

      {/* Menu Orientation */}
      <Section title="Menu Orientation">
        <TwoOption
          value={settings.menuOrientation}
          onChange={v => update({ menuOrientation: v })}
          options={[
            { value: 'vertical',   label: 'Vertical',   icon: '▮' },
            { value: 'horizontal', label: 'Horizontal', icon: '▬' },
          ]}
        />
      </Section>

      {/* Reset */}
      <button
        onClick={() => {
          localStorage.removeItem('hrms_theme');
          window.location.reload();
        }}
        style={{
          width: '100%', padding: '10px', borderRadius: 10, marginTop: 4,
          border: '1.5px solid var(--border)', background: 'transparent',
          color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer',
          fontFamily: 'var(--font-body)', transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--error)'; e.currentTarget.style.color = '#ef4444'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
      >
        Reset to Defaults
      </button>
    </div>
  );
};

export default SettingsPanel;
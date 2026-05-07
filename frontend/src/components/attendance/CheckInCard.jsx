import { useState, useEffect } from 'react';
import { attendanceAPI } from '../../utils/Phase3api';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  present:  { color: '#10b981', bg: '#10b98122', label: 'Present',   icon: '✅' },
  late:     { color: '#f59e0b', bg: '#f59e0b22', label: 'Late',      icon: '⚠️' },
  absent:   { color: '#ef4444', bg: '#ef444422', label: 'Absent',    icon: '❌' },
  half_day: { color: '#3b82f6', bg: '#3b82f622', label: 'Half Day',  icon: '🌗' },
  on_leave: { color: '#8b5cf6', bg: '#8b5cf622', label: 'On Leave',  icon: '🌴' },
  holiday:  { color: '#ec4899', bg: '#ec489922', label: 'Holiday',   icon: '🎉' },
};

const formatTime = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

const CheckInCard = ({ onRefresh }) => {
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTime, setCurrentTime]     = useState(new Date());
  const [note, setNote]                   = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchToday = async () => {
    try {
      const res = await attendanceAPI.getToday();
      setAttendance(res.data.data.attendance);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchToday(); }, []);

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const res = await attendanceAPI.checkIn({ note: note || undefined });
      setAttendance(res.data.data.attendance);
      toast.success(res.data.data.message);
      setNote('');
      setShowNoteInput(false);
      onRefresh?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    } finally { setActionLoading(false); }
  };

  const handleCheckOut = async () => {
    setActionLoading(true);
    try {
      const res = await attendanceAPI.checkOut({ note: note || undefined });
      setAttendance(res.data.data.attendance);
      toast.success(res.data.data.message);
      setNote('');
      setShowNoteInput(false);
      onRefresh?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-out failed');
    } finally { setActionLoading(false); }
  };

  const statusCfg = STATUS_CONFIG[attendance?.status] || STATUS_CONFIG.absent;
  const hasCheckedIn  = !!attendance?.checkIn?.time;
  const hasCheckedOut = !!attendance?.checkOut?.time;

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-xl)',
      padding: '28px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: -40, right: -40,
        width: 200, height: 200,
        background: `radial-gradient(circle, ${statusCfg.color}18, transparent 70%)`,
        filter: 'blur(40px)', pointerEvents: 'none',
        transition: 'background 0.5s',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Date + Live Clock */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{today}</div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 42,
            fontWeight: 800,
            color: 'var(--text-primary)',
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}>
            {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
          </div>
        </div>

        {/* Status Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: statusCfg.bg,
          border: `1px solid ${statusCfg.color}44`,
          borderRadius: 99,
          padding: '6px 14px',
          marginBottom: 20,
        }}>
          <span>{statusCfg.icon}</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, color: statusCfg.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {statusCfg.label}
          </span>
          {attendance?.isLate && (
            <span style={{ fontSize: 11, color: '#f59e0b', borderLeft: '1px solid #f59e0b44', paddingLeft: 8 }}>
              {attendance.lateByMinutes}m late
            </span>
          )}
        </div>

        {/* Check-in / Check-out times */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Check In',  value: formatTime(attendance?.checkIn?.time),  color: '#10b981', icon: '🟢' },
            { label: 'Check Out', value: formatTime(attendance?.checkOut?.time), color: '#ef4444', icon: '🔴' },
          ].map(item => (
            <div key={item.label} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                {item.icon} {item.label}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: item.value === '—' ? 'var(--text-muted)' : item.color }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* Working hours */}
        {attendance?.workingHours > 0 && (
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>⏱ Working Hours</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--violet-light)' }}>
              {attendance.workingHours} hrs
            </span>
          </div>
        )}

        {/* Note input */}
        {showNoteInput && (
          <div style={{ marginBottom: 12 }}>
            <input
              className="form-input"
              placeholder="Add a note (optional)..."
              value={note}
              onChange={e => setNote(e.target.value)}
              style={{ fontSize: 13 }}
            />
          </div>
        )}

        {/* Action Buttons */}
        {loading ? (
          <div className="skeleton" style={{ height: 48, borderRadius: 12 }} />
        ) : !hasCheckedIn ? (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn-primary"
              style={{ flex: 1, padding: '13px', fontSize: 14 }}
              onClick={handleCheckIn}
              disabled={actionLoading}
            >
              {actionLoading && <span className="btn-loader" />}
              {actionLoading ? 'Checking in...' : '🟢 Check In'}
            </button>
            <button
              className="btn-ghost"
              style={{ padding: '13px 16px' }}
              onClick={() => setShowNoteInput(!showNoteInput)}
              title="Add note"
            >
              📝
            </button>
          </div>
        ) : !hasCheckedOut ? (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn-primary"
              style={{ flex: 1, padding: '13px', fontSize: 14, background: 'linear-gradient(135deg, #ef4444, #b91c1c)', boxShadow: '0 8px 32px rgba(239,68,68,0.35)' }}
              onClick={handleCheckOut}
              disabled={actionLoading}
            >
              {actionLoading && <span className="btn-loader" />}
              {actionLoading ? 'Checking out...' : '🔴 Check Out'}
            </button>
            <button
              className="btn-ghost"
              style={{ padding: '13px 16px' }}
              onClick={() => setShowNoteInput(!showNoteInput)}
              title="Add note"
            >
              📝
            </button>
          </div>
        ) : (
          <div style={{ background: 'var(--success-dim)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--success)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
              ✅ Day Complete — See you tomorrow!
            </div>
          </div>
        )}

        {/* Office hours info */}
        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
          Office hours: 11:00 AM – 6:00 PM
        </div>
      </div>
    </div>
  );
};

export default CheckInCard;

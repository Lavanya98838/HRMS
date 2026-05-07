import { useState } from 'react';
import { leaveAPI } from '../../utils/Phase3api';
import toast from 'react-hot-toast';

const LEAVE_TYPES = [
  { value: 'sick',   label: 'Sick Leave',   icon: '🤒', color: '#ef4444' },
  { value: 'casual', label: 'Casual Leave', icon: '☀️', color: '#f59e0b' },
  { value: 'paid',   label: 'Paid Leave',   icon: '💰', color: '#10b981' },
];

const LeaveModal = ({ isOpen, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    leaveType: 'casual',
    startDate: '',
    endDate: '',
    reason: '',
    isHalfDay: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  if (!isOpen) return null;

  const totalDays = () => {
    if (form.isHalfDay) return 0.5;
    if (!form.startDate || !form.endDate) return 0;
    const diff = new Date(form.endDate) - new Date(form.startDate);
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.startDate || !form.reason) {
      setError('Start date and reason are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await leaveAPI.apply({
        ...form,
        endDate: form.endDate || form.startDate,
      });
      toast.success('Leave application submitted! ✅');
      onSuccess?.();
      onClose();
      setForm({ leaveType: 'casual', startDate: '', endDate: '', reason: '', isHalfDay: false });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to apply for leave');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">🌴 Apply for Leave</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="form-error" style={{ marginBottom: 16 }}><span>⚠</span> {error}</div>}

            {/* Leave Type Selector */}
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Leave Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 6 }}>
                {LEAVE_TYPES.map(type => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, leaveType: type.value }))}
                    style={{
                      padding: '14px 10px',
                      borderRadius: 'var(--radius-md)',
                      border: `1.5px solid ${form.leaveType === type.value ? type.color : 'var(--border)'}`,
                      background: form.leaveType === type.value ? `${type.color}22` : 'var(--bg-elevated)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontSize: 22, marginBottom: 4 }}>{type.icon}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, color: form.leaveType === type.value ? type.color : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {type.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Half Day Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 1 }}>
                <div
                  onClick={() => setForm(f => ({ ...f, isHalfDay: !f.isHalfDay }))}
                  style={{
                    width: 40, height: 22, borderRadius: 99,
                    background: form.isHalfDay ? 'var(--violet)' : 'var(--border)',
                    position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 3, left: form.isHalfDay ? 21 : 3,
                    width: 16, height: 16, borderRadius: '50%', background: 'white',
                    transition: 'left 0.2s',
                  }} />
                </div>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Half Day Leave (0.5 days)</span>
              </label>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Start Date *</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.startDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value, endDate: f.isHalfDay ? e.target.value : f.endDate }))}
                  required
                />
              </div>
              {!form.isHalfDay && (
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input
                    className="form-input"
                    type="date"
                    value={form.endDate}
                    min={form.startDate || new Date().toISOString().split('T')[0]}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                  />
                </div>
              )}
            </div>

            {/* Duration preview */}
            {form.startDate && (
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginTop: 4, marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Duration</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 800, color: 'var(--violet-light)' }}>
                  {totalDays()} day{totalDays() !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Reason *</label>
              <textarea
                className="form-textarea"
                placeholder="Please provide a reason for your leave..."
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                required
                rows={3}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-ghost" style={{ padding: '10px 20px' }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ padding: '10px 24px', width: 'auto' }} disabled={loading}>
              {loading && <span className="btn-loader" />}
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeaveModal;

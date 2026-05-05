import { useState, useEffect } from 'react';
import { leaveAPI } from '../../utils/phase3Api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  pending:   { color: '#f59e0b', bg: '#f59e0b22', label: 'Pending'   },
  approved:  { color: '#10b981', bg: '#10b98122', label: 'Approved'  },
  rejected:  { color: '#ef4444', bg: '#ef444422', label: 'Rejected'  },
  cancelled: { color: '#6b7280', bg: '#6b728022', label: 'Cancelled' },
};

const TYPE_CONFIG = {
  sick:   { label: 'Sick',   icon: '🤒', color: '#ef4444' },
  casual: { label: 'Casual', icon: '☀️', color: '#f59e0b' },
  paid:   { label: 'Paid',   icon: '💰', color: '#10b981' },
};

const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const LeaveTable = ({ employeeId, showAll = false, refreshTrigger, onRefresh, statusFilter = '' }) => {
  const { user } = useAuth();
  const [leaves, setLeaves]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const isAdminOrHR = ['admin', 'hr'].includes(user?.role);
  const canApprove  = ['admin', 'hr', 'manager'].includes(user?.role);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      let res;
      if (employeeId) {
        res = await leaveAPI.getByEmployee(employeeId);
      } else if (showAll && canApprove) {
        res = await leaveAPI.getAll({ status: statusFilter || undefined });
      } else {
        res = await leaveAPI.getMy({ status: statusFilter || undefined });
      }
      setLeaves(res.data.data.leaves || []);
    } catch { toast.error('Failed to load leaves'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLeaves(); }, [statusFilter, refreshTrigger, showAll, employeeId]);

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      await leaveAPI.approve(id);
      toast.success('Leave approved ✅');
      fetchLeaves();
      onRefresh?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve');
    } finally { setActionLoading(null); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error('Please enter rejection reason'); return; }
    setActionLoading(rejectModal);
    try {
      await leaveAPI.reject(rejectModal, { rejectionReason: rejectReason });
      toast.success('Leave rejected');
      setRejectModal(null);
      setRejectReason('');
      fetchLeaves();
      onRefresh?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject');
    } finally { setActionLoading(null); }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this leave application?')) return;
    try {
      await leaveAPI.cancel(id);
      toast.success('Leave cancelled');
      fetchLeaves();
      onRefresh?.();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to cancel'); }
  };

  return (
    <div>


      <div className="table-container">
        <table>
          <thead>
            <tr>
              {(showAll || employeeId) && <th>Employee</th>}
              <th>Type</th>
              <th>From</th>
              <th>To</th>
              <th>Days</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i}>{Array(8).fill(0).map((_, j) => (
                  <td key={j}><div className="skeleton" style={{ height: 14, width: j === 5 ? 140 : 80, borderRadius: 4 }} /></td>
                ))}</tr>
              ))
            ) : leaves.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="empty-state" style={{ padding: 32 }}>
                  <div className="empty-icon">🌴</div>
                  <div className="empty-title">No leave applications</div>
                  <div className="empty-desc">No leaves found for the selected filter</div>
                </div>
              </td></tr>
            ) : (
              leaves.map(leave => {
                const statusCfg = STATUS_CONFIG[leave.status] || STATUS_CONFIG.pending;
                const typeCfg   = TYPE_CONFIG[leave.leaveType] || TYPE_CONFIG.casual;
                return (
                  <tr key={leave._id}>
                    {(showAll || employeeId) && (
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 13 }}>
                          {leave.employee?.firstName} {leave.employee?.lastName}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{leave.employee?.employeeId}</div>
                      </td>
                    )}
                    <td>
                      <span style={{ background: `${typeCfg.color}22`, color: typeCfg.color, border: `1px solid ${typeCfg.color}44`, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                        {typeCfg.icon} {typeCfg.label}
                      </span>
                    </td>
                    <td style={{ fontSize: 13 }}>{formatDate(leave.startDate)}</td>
                    <td style={{ fontSize: 13 }}>{formatDate(leave.endDate)}</td>
                    <td style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {leave.totalDays}
                    </td>
                    <td style={{ maxWidth: 180 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {leave.reason}
                      </div>
                      {leave.rejectionReason && (
                        <div style={{ fontSize: 11, color: '#fca5a5', marginTop: 2 }}>
                          ❌ {leave.rejectionReason}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.color}44`, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase' }}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td>
                      <div className="action-btns">
                        {/* Approve */}
                        {canApprove && leave.status === 'pending' && (
                          <button
                            className="action-btn"
                            title="Approve"
                            style={{ color: '#10b981', borderColor: '#10b98133' }}
                            onClick={() => handleApprove(leave._id)}
                            disabled={actionLoading === leave._id}
                          >
                            {actionLoading === leave._id ? '⟳' : '✓'}
                          </button>
                        )}
                        {/* Reject */}
                        {canApprove && leave.status === 'pending' && (
                          <button
                            className="action-btn danger"
                            title="Reject"
                            onClick={() => setRejectModal(leave._id)}
                          >
                            ✕
                          </button>
                        )}
                        {/* Cancel (own pending/approved leaves) */}
                        {!showAll && ['pending', 'approved'].includes(leave.status) && (
                          <button
                            className="action-btn"
                            title="Cancel"
                            onClick={() => handleCancel(leave._id)}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setRejectModal(null)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2 className="modal-title">❌ Reject Leave</h2>
              <button className="modal-close" onClick={() => setRejectModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Rejection Reason *</label>
                <textarea
                  className="form-textarea"
                  placeholder="Please provide a reason for rejection..."
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" style={{ padding: '10px 20px' }} onClick={() => setRejectModal(null)}>Cancel</button>
              <button
                className="btn-primary"
                style={{ padding: '10px 24px', width: 'auto', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', boxShadow: '0 8px 32px rgba(239,68,68,0.35)' }}
                onClick={handleReject}
                disabled={actionLoading}
              >
                {actionLoading && <span className="btn-loader" />}
                Reject Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveTable;
import { useState, useEffect } from 'react';
import { attendanceAPI } from '../../utils/phase3Api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  present:  { color: '#10b981', bg: '#10b98122', label: 'Present'  },
  late:     { color: '#f59e0b', bg: '#f59e0b22', label: 'Late'     },
  absent:   { color: '#ef4444', bg: '#ef444422', label: 'Absent'   },
  half_day: { color: '#3b82f6', bg: '#3b82f622', label: 'Half Day' },
  on_leave: { color: '#8b5cf6', bg: '#8b5cf622', label: 'On Leave' },
  holiday:  { color: '#ec4899', bg: '#ec489922', label: 'Holiday'  },
  weekend:  { color: '#6b7280', bg: '#6b728022', label: 'Weekend'  },
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const formatTime = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—';
const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

const AttendanceTable = ({ employeeId, showAll = false, showFilters = true, compact = false, refreshTrigger }) => {
  const { getPortal } = useAuth();
  const portal        = getPortal();
  const isAdminOrHR   = ['admin', 'hr'].includes(portal);
  const isManager     = portal === 'manager';
  const canSeeAll     = showAll && (isAdminOrHR || isManager);

  const [records, setRecords]         = useState([]);
  const [summary, setSummary]         = useState({});
  const [loading, setLoading]         = useState(true);
  const [month, setMonth]             = useState(new Date().getMonth() + 1);
  const [year, setYear]               = useState(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState('');

  const fetchRecords = async () => {
    setLoading(true);
    try {
      let res;
      if (employeeId) {
        // Specific employee profile view
        res = await attendanceAPI.getByEmployee(employeeId, { month, year });
      } else if (canSeeAll) {
        // Admin/HR/Manager — fetch all employees
        res = await attendanceAPI.getAll({ month, year, status: statusFilter || undefined });
      } else {
        // Employee — fetch own records
        res = await attendanceAPI.getMy({ month, year });
      }
      setRecords(res.data.data.records || []);
      setSummary(res.data.data.summary || {});
    } catch (err) {
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [month, year, statusFilter, refreshTrigger, showAll, employeeId]);

  const filtered = statusFilter
    ? records.filter(r => r.status === statusFilter)
    : records;

  const showEmployeeCol = (canSeeAll || !!employeeId === false) && (isAdminOrHR || isManager) && !employeeId && showAll;

  return (
    <div>
      {/* Summary Stats */}
      {!compact && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10, marginBottom: 20 }}>
          {[
            { key: 'present',  dbKey: 'present',  label: 'Present',  icon: '✅' },
            { key: 'late',     dbKey: 'late',     label: 'Late',     icon: '⚠️' },
            { key: 'absent',   dbKey: 'absent',   label: 'Absent',   icon: '❌' },
            { key: 'half_day', dbKey: 'halfDay',  label: 'Half Day', icon: '🌗' },
            { key: 'on_leave', dbKey: 'onLeave',  label: 'On Leave', icon: '🌴' },
          ].map(s => {
            const cfg   = STATUS_COLORS[s.key];
            const count = summary[s.key] ?? summary[s.dbKey] ?? 0;
            return (
              <div key={s.key}
                style={{ background: 'var(--bg-card)', border: `1px solid ${cfg.color}33`, borderRadius: 'var(--radius-md)', padding: '14px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                onClick={() => setStatusFilter(prev => prev === s.key ? '' : s.key)}
              >
                <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{count}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
              </div>
            );
          })}
          {summary.totalWorkingHours && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--violet-dim)', borderRadius: 'var(--radius-md)', padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>⏱</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--violet-light)' }}>{summary.totalWorkingHours}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Hrs</div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <select className="filter-select" value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="filter-select" value={year} onChange={e => setYear(Number(e.target.value))}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            {Object.entries(STATUS_COLORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      )}

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              {showEmployeeCol && <th>Employee</th>}
              <th>Check In</th>
              <th>Check Out</th>
              <th>Hours</th>
              <th>Status</th>
              {!compact && <th>Late By</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(7).fill(0).map((_, i) => (
                <tr key={i}>
                  {Array(compact ? 5 : 6 + (showEmployeeCol ? 1 : 0)).fill(0).map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 14, width: j === 0 ? 120 : 80, borderRadius: 4 }} /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={compact ? 5 : 6 + (showEmployeeCol ? 1 : 0)}>
                <div className="empty-state" style={{ padding: 32 }}>
                  <div className="empty-icon">📅</div>
                  <div className="empty-title">No attendance records</div>
                  <div className="empty-desc">No records found for this period</div>
                </div>
              </td></tr>
            ) : (
              filtered.map(rec => {
                const cfg = STATUS_COLORS[rec.status] || STATUS_COLORS.absent;
                return (
                  <tr key={rec._id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {formatDate(rec.date)}
                    </td>
                    {showEmployeeCol && (
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 13 }}>
                          {rec.employee?.firstName} {rec.employee?.lastName}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{rec.employee?.employeeId}</div>
                      </td>
                    )}
                    <td style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: '#10b981' }}>
                      {formatTime(rec.checkIn?.time)}
                    </td>
                    <td style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: '#ef4444' }}>
                      {formatTime(rec.checkOut?.time)}
                    </td>
                    <td style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--violet-light)' }}>
                      {rec.workingHours > 0 ? `${rec.workingHours}h` : '—'}
                    </td>
                    <td>
                      <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}44`, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {cfg.label}
                      </span>
                    </td>
                    {!compact && (
                      <td style={{ fontSize: 12, color: rec.isLate ? '#f59e0b' : 'var(--text-muted)' }}>
                        {rec.isLate ? `${rec.lateByMinutes}m` : '—'}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendanceTable;
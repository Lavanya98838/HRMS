import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { employeeAPI, departmentAPI, roleAPI } from '../utils/phase2Api';
import { leaveAPI } from '../utils/phase3Api';
import api from '../utils/api';

// ── Helper ────────────────────────────────────────────────
const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';
};

// ── Stat Card ─────────────────────────────────────────────
const StatCard = ({ icon, label, value, color, onClick, loading }) => (
  <div
    className="stat-card"
    style={{ cursor: onClick ? 'pointer' : 'default' }}
    onClick={onClick}
  >
    <div className="stat-icon" style={{ background: `${color}22`, border: `1px solid ${color}33` }}>
      {icon}
    </div>
    <div>
      <div className="stat-value" style={{ color: loading ? 'var(--text-muted)' : 'var(--text-primary)' }}>
        {loading ? '...' : value}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  </div>
);

// ── Quick Action Button ───────────────────────────────────
const QuickAction = ({ label, icon, path, color }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(path)}
      style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', padding: '14px 16px',
        cursor: 'pointer', display: 'flex', alignItems: 'center',
        gap: 12, transition: 'all 0.2s', textAlign: 'left', width: '100%',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
        {icon}
      </div>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
        {label}
      </span>
      <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>→</span>
    </button>
  );
};

// ── Welcome Banner ────────────────────────────────────────
const WelcomeBanner = ({ user, subtitle }) => (
  <div style={{
    background: 'var(--grad-subtle)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xl)', padding: '28px 32px',
    marginBottom: 28, position: 'relative', overflow: 'hidden',
  }}>
    <div style={{ width: 200, height: 200, background: 'radial-gradient(circle, #7c3aed22, transparent 70%)', top: -60, right: -60, position: 'absolute', filter: 'blur(40px)', pointerEvents: 'none' }} />
    <div style={{ position: 'relative', zIndex: 1 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
        Good {greeting()}, {user?.name?.split(' ')[0]}! 👋
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>{subtitle}</div>
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════
//  PORTAL DASHBOARDS
// ════════════════════════════════════════════════════════════

// ── Admin / Sub-Admin Dashboard ───────────────────────────
const AdminDashboard = ({ user, prefix }) => {
  const navigate = useNavigate();
  const [stats, setStats]               = useState({ employees: 0, departments: 0, roles: 0, active: 0 });
  const [recentEmployees, setRecent]    = useState([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [empRes, deptRes, roleRes] = await Promise.all([
          employeeAPI.getAll({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
          departmentAPI.getAll({ isActive: true }),
          roleAPI.getAll({ isActive: true }),
        ]);
        const empData = empRes.data.data;
        setStats({
          employees:   empData.pagination.total,
          departments: deptRes.data.data.departments.length,
          roles:       roleRes.data.data.roles.length,
          active:      empData.employees.filter(e => e.isActive).length,
        });
        setRecent(empData.employees);
      } catch { /* silent */ } finally { setLoading(false); }
    })();
  }, []);

  const actions = [
    { label: 'Employees',    icon: '👥', path: `/${prefix}/employees`,    color: '#7c3aed' },
    { label: 'Departments',  icon: '🏢', path: `/${prefix}/departments`,  color: '#e11d74' },
    { label: 'Payroll',      icon: '💰', path: `/${prefix}/payroll`,      color: '#f97316' },
    { label: 'Analytics',    icon: '📈', path: `/${prefix}/analytics`,    color: '#10b981' },
    { label: 'Announcements',icon: '📢', path: `/${prefix}/announcements`,color: '#6366f1' },
  ];

  return (
    <>
      <WelcomeBanner user={user} subtitle="Here's your organization overview." />
      <div className="stats-grid">
        <StatCard icon="👥" label="Total Employees" value={stats.employees}   color="#7c3aed" loading={loading} onClick={() => navigate(`/${prefix}/employees`)} />
        <StatCard icon="🏢" label="Departments"     value={stats.departments} color="#e11d74" loading={loading} onClick={() => navigate(`/${prefix}/departments`)} />
        <StatCard icon="🎭" label="Roles"           value={stats.roles}       color="#f97316" loading={loading} onClick={() => navigate(`/${prefix}/roles`)} />
        <StatCard icon="✅" label="Active Employees" value={stats.active}     color="#10b981" loading={loading} onClick={() => navigate(`/${prefix}/employees`)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        {/* Recent employees table */}
        <div className="table-container">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Recent Employees</span>
            <button className="btn-ghost" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => navigate(`/${prefix}/employees`)}>View All</button>
          </div>
          <table>
            <thead><tr><th>Employee</th><th>Department</th><th>Type</th><th>Status</th></tr></thead>
            <tbody>
              {loading ? (
                Array(4).fill(0).map((_, i) => (
                  <tr key={i}>{Array(4).fill(0).map((_, j) => <td key={j}><div className="skeleton" style={{ height: 14, width: j === 0 ? 160 : 80, borderRadius: 4 }} /></td>)}</tr>
                ))
              ) : recentEmployees.length === 0 ? (
                <tr><td colSpan={4}><div className="empty-state" style={{ padding: 32 }}><div className="empty-icon">👥</div><div className="empty-title">No employees yet</div></div></td></tr>
              ) : recentEmployees.map(emp => (
                <tr key={emp._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/${prefix}/employees/${emp._id}`)}>
                  <td>
                    <div className="emp-info">
                      <div className="emp-avatar" style={{ width: 32, height: 32, fontSize: 11 }}>
                        {emp.profilePicture?.url ? <img src={emp.profilePicture.url} alt="" /> : `${emp.firstName?.[0]}${emp.lastName?.[0]}`}
                      </div>
                      <div>
                        <div className="emp-name" style={{ fontSize: 13 }}>{emp.firstName} {emp.lastName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp.employeeId}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 12 }}>{emp.department?.name || '—'}</td>
                  <td><span className={`badge badge-${emp.employmentType?.replace('_', '-')}`} style={{ fontSize: 10 }}>{emp.employmentType?.replace('_', ' ')}</span></td>
                  <td><span className={`badge ${emp.isActive ? 'badge-active' : 'badge-inactive'}`} style={{ fontSize: 10 }}>{emp.isActive ? 'Active' : 'Inactive'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Quick actions */}
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>Quick Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {actions.map(a => <QuickAction key={a.label} {...a} />)}
          </div>
        </div>
      </div>
    </>
  );
};

// ── HR Dashboard ──────────────────────────────────────────
const HRDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [stats, setStats]            = useState({ employees: 0, departments: 0, pendingLeaves: 0, active: 0 });
  const [recentEmployees, setRecent] = useState([]);
  const [loading, setLoading]        = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [empRes, deptRes, leaveRes] = await Promise.all([
          employeeAPI.getAll({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
          departmentAPI.getAll({ isActive: true }),
          leaveAPI.getAll({ status: 'pending', limit: 1 }),
        ]);
        const empData = empRes.data.data;
        setStats({
          employees:    empData.pagination.total,
          departments:  deptRes.data.data.departments.length,
          pendingLeaves: leaveRes.data.data.pagination?.total || 0,
          active:       empData.employees.filter(e => e.isActive).length,
        });
        setRecent(empData.employees);
      } catch { /* silent */ } finally { setLoading(false); }
    })();
  }, []);

  const actions = [
    { label: 'Add Employee',   icon: '➕', path: '/hr/employees',    color: '#7c3aed' },
    { label: 'Pending Leaves', icon: '⏳', path: '/hr/leave',        color: '#f59e0b' },
    { label: 'Payroll',        icon: '💰', path: '/hr/payroll',      color: '#10b981' },
    { label: 'Attendance',     icon: '⏱️', path: '/hr/attendance',   color: '#3b82f6' },
    { label: 'Announcements',  icon: '📢', path: '/hr/announcements',color: '#f97316' },
  ];

  return (
    <>
      <WelcomeBanner user={user} subtitle="Manage your people, leaves and payroll." />
      <div className="stats-grid">
        <StatCard icon="👥" label="Total Employees"  value={stats.employees}     color="#7c3aed" loading={loading} onClick={() => navigate('/hr/employees')} />
        <StatCard icon="🏢" label="Departments"      value={stats.departments}   color="#e11d74" loading={loading} onClick={() => navigate('/hr/departments')} />
        <StatCard icon="⏳" label="Pending Leaves"   value={stats.pendingLeaves} color="#f59e0b" loading={loading} onClick={() => navigate('/hr/leave')} />
        <StatCard icon="✅" label="Active Employees" value={stats.active}        color="#10b981" loading={loading} onClick={() => navigate('/hr/employees')} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        <div className="table-container">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Recently Joined</span>
            <button className="btn-ghost" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => navigate('/hr/employees')}>View All</button>
          </div>
          <table>
            <thead><tr><th>Employee</th><th>Department</th><th>Type</th><th>Status</th></tr></thead>
            <tbody>
              {loading ? (
                Array(4).fill(0).map((_, i) => (
                  <tr key={i}>{Array(4).fill(0).map((_, j) => <td key={j}><div className="skeleton" style={{ height: 14, width: j === 0 ? 160 : 80, borderRadius: 4 }} /></td>)}</tr>
                ))
              ) : recentEmployees.map(emp => (
                <tr key={emp._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/hr/employees/${emp._id}`)}>
                  <td>
                    <div className="emp-info">
                      <div className="emp-avatar" style={{ width: 32, height: 32, fontSize: 11 }}>
                        {emp.profilePicture?.url ? <img src={emp.profilePicture.url} alt="" /> : `${emp.firstName?.[0]}${emp.lastName?.[0]}`}
                      </div>
                      <div>
                        <div className="emp-name" style={{ fontSize: 13 }}>{emp.firstName} {emp.lastName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp.employeeId}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 12 }}>{emp.department?.name || '—'}</td>
                  <td><span className={`badge badge-${emp.employmentType?.replace('_', '-')}`} style={{ fontSize: 10 }}>{emp.employmentType?.replace('_', ' ')}</span></td>
                  <td><span className={`badge ${emp.isActive ? 'badge-active' : 'badge-inactive'}`} style={{ fontSize: 10 }}>{emp.isActive ? 'Active' : 'Inactive'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>Quick Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {actions.map(a => <QuickAction key={a.label} {...a} />)}
          </div>
        </div>
      </div>
    </>
  );
};

// ── Manager Dashboard ─────────────────────────────────────
const ManagerDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [stats, setStats]     = useState({ teamSize: 0, pendingLeaves: 0, presentToday: 0, shifts: 0 });
  const [teamMembers, setTeam] = useState([]);
  const [loading, setLoading]  = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [empRes, leaveRes] = await Promise.all([
          employeeAPI.getAll({ limit: 5 }),
          leaveAPI.getAll({ status: 'pending', limit: 1 }),
        ]);
        const empData = empRes.data.data;
        setStats({
          teamSize:     empData.pagination.total,
          pendingLeaves: leaveRes.data.data.pagination?.total || 0,
          presentToday: 0,
          shifts:       0,
        });
        setTeam(empData.employees);
      } catch { /* silent */ } finally { setLoading(false); }
    })();
  }, []);

  const actions = [
    { label: 'My Team',        icon: '👥', path: '/manager/employees',    color: '#7c3aed' },
    { label: 'Leave Approvals',icon: '⏳', path: '/manager/leave',        color: '#f59e0b' },
    { label: 'Attendance',     icon: '⏱️', path: '/manager/attendance',   color: '#3b82f6' },
    { label: 'Shifts',         icon: '🗓️', path: '/manager/shifts',       color: '#10b981' },
    { label: 'Announcements',  icon: '📢', path: '/manager/announcements',color: '#f97316' },
  ];

  return (
    <>
      <WelcomeBanner user={user} subtitle="Here's your team overview for today." />
      <div className="stats-grid">
        <StatCard icon="👥" label="Team Size"       value={stats.teamSize}      color="#7c3aed" loading={loading} onClick={() => navigate('/manager/employees')} />
        <StatCard icon="⏳" label="Pending Leaves"  value={stats.pendingLeaves} color="#f59e0b" loading={loading} onClick={() => navigate('/manager/leave')} />
        <StatCard icon="⏱️" label="Present Today"  value={stats.presentToday}  color="#10b981" loading={loading} onClick={() => navigate('/manager/attendance')} />
        <StatCard icon="🗓️" label="Shifts This Week" value={stats.shifts}      color="#6366f1" loading={loading} onClick={() => navigate('/manager/shifts')} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        <div className="table-container">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>My Team</span>
            <button className="btn-ghost" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => navigate('/manager/employees')}>View All</button>
          </div>
          <table>
            <thead><tr><th>Employee</th><th>Department</th><th>Type</th><th>Status</th></tr></thead>
            <tbody>
              {loading ? (
                Array(4).fill(0).map((_, i) => (
                  <tr key={i}>{Array(4).fill(0).map((_, j) => <td key={j}><div className="skeleton" style={{ height: 14, width: j === 0 ? 160 : 80, borderRadius: 4 }} /></td>)}</tr>
                ))
              ) : teamMembers.map(emp => (
                <tr key={emp._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/manager/employees/${emp._id}`)}>
                  <td>
                    <div className="emp-info">
                      <div className="emp-avatar" style={{ width: 32, height: 32, fontSize: 11 }}>
                        {emp.profilePicture?.url ? <img src={emp.profilePicture.url} alt="" /> : `${emp.firstName?.[0]}${emp.lastName?.[0]}`}
                      </div>
                      <div>
                        <div className="emp-name" style={{ fontSize: 13 }}>{emp.firstName} {emp.lastName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emp.employeeId}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 12 }}>{emp.department?.name || '—'}</td>
                  <td><span className={`badge badge-${emp.employmentType?.replace('_', '-')}`} style={{ fontSize: 10 }}>{emp.employmentType?.replace('_', ' ')}</span></td>
                  <td><span className={`badge ${emp.isActive ? 'badge-active' : 'badge-inactive'}`} style={{ fontSize: 10 }}>{emp.isActive ? 'Active' : 'Inactive'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>Quick Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {actions.map(a => <QuickAction key={a.label} {...a} />)}
          </div>
        </div>
      </div>
    </>
  );
};

// ── Employee Dashboard ────────────────────────────────────
const EmployeeDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [leaveBalance, setLeaveBalance] = useState({ sick: 0, casual: 0, paid: 0 });
  const [todayAttendance, setAttendance] = useState(null);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [attendRes, leaveBalRes] = await Promise.all([
          api.get('/attendance/today'),
          api.get('/leave/balance'),
        ]);
        setAttendance(attendRes.data.data.attendance);
        const bal = leaveBalRes.data.data;
        setLeaveBalance({
          sick:   bal?.sickLeave?.remaining   ?? 0,
          casual: bal?.casualLeave?.remaining ?? 0,
          paid:   bal?.paidLeave?.remaining   ?? 0,
        });
      } catch { /* silent */ } finally { setLoading(false); }
    })();
  }, []);

  const actions = [
    { label: 'My Attendance', icon: '⏱️', path: '/employee/attendance',   color: '#3b82f6' },
    { label: 'Apply Leave',   icon: '🌴', path: '/employee/leave',         color: '#f59e0b' },
    { label: 'My Payslips',   icon: '💰', path: '/employee/payslips',      color: '#10b981' },
    { label: 'My Shifts',     icon: '🗓️', path: '/employee/shifts',        color: '#6366f1' },
    { label: 'Announcements', icon: '📢', path: '/employee/announcements', color: '#f97316' },
  ];

  const checkedIn  = !!todayAttendance?.checkIn?.time;
  const checkedOut = !!todayAttendance?.checkOut?.time;

  return (
    <>
      <WelcomeBanner user={user} subtitle="Here's your personal workspace for today." />

      <div className="stats-grid">
        {/* Today status */}
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/employee/attendance')}>
          <div className="stat-icon" style={{ background: checkedIn ? '#10b98122' : '#f59e0b22', border: `1px solid ${checkedIn ? '#10b98133' : '#f59e0b33'}` }}>
            ⏱️
          </div>
          <div>
            <div className="stat-value" style={{ color: checkedIn ? '#10b981' : '#f59e0b', fontSize: 14 }}>
              {loading ? '...' : checkedIn ? (checkedOut ? 'Checked Out' : 'Checked In') : 'Not Checked In'}
            </div>
            <div className="stat-label">Today's Status</div>
          </div>
        </div>

        <StatCard icon="🤒" label="Sick Leave Left"   value={`${leaveBalance.sick} days`}   color="#ef4444" loading={loading} onClick={() => navigate('/employee/leave')} />
        <StatCard icon="☀️" label="Casual Leave Left" value={`${leaveBalance.casual} days`} color="#f59e0b" loading={loading} onClick={() => navigate('/employee/leave')} />
        <StatCard icon="💰" label="Paid Leave Left"   value={`${leaveBalance.paid} days`}   color="#10b981" loading={loading} onClick={() => navigate('/employee/leave')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        {/* Attendance summary card */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
            Today's Attendance
          </div>
          {loading ? (
            <div className="skeleton" style={{ height: 80, borderRadius: 8 }} />
          ) : todayAttendance ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Check-in</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#10b981' }}>
                  {todayAttendance.checkIn?.time
                    ? new Date(todayAttendance.checkIn.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Check-out</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: checkedOut ? '#10b981' : 'var(--text-muted)' }}>
                  {todayAttendance.checkOut?.time
                    ? new Date(todayAttendance.checkOut.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </span>
              </div>
              {todayAttendance.workingHours > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Working Hours</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {todayAttendance.workingHours} hrs
                  </span>
                </div>
              )}
              <button
                className="btn-ghost"
                style={{ marginTop: 4, fontSize: 12, padding: '8px 14px' }}
                onClick={() => navigate('/employee/attendance')}
              >
                View Full History →
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⏰</div>
              No attendance record for today.
              <br />
              <button className="btn-primary" style={{ marginTop: 12, padding: '8px 20px', fontSize: 12, width: 'auto' }} onClick={() => navigate('/employee/attendance')}>
                Go to Attendance
              </button>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>Quick Actions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {actions.map(a => <QuickAction key={a.label} {...a} />)}
          </div>
        </div>
      </div>
    </>
  );
};

// ════════════════════════════════════════════════════════════
//  ROOT — picks the right dashboard by role
// ════════════════════════════════════════════════════════════
const DashboardHome = () => {
  const { user } = useAuth();
  const role = user?.role;

  // Each portal layout already wraps this component — do NOT add DashboardLayout here
  if (role === 'admin')    return <AdminDashboard   user={user} prefix="admin" />;
  if (role === 'subadmin') return <AdminDashboard   user={user} prefix="subadmin" />;
  if (role === 'hr')       return <HRDashboard      user={user} />;
  if (role === 'manager')  return <ManagerDashboard user={user} />;
  return                          <EmployeeDashboard user={user} />;
};

export default DashboardHome;
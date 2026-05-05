import { useState, useEffect } from "react";
import {
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  getOverview,
  getHeadcountTrends,
  getAttendanceTrends,
  getDepartmentBreakdown,
  getSalaryOverview,
  getLeaveSummary,
  getEmploymentTypes,
} from "../../services/analyticsService";
import "./AnalyticsDashboard.css";

const C = {
  purple: "#7c3aed", pink: "#e11d74", orange: "#f97316",
  green: "#10b981", blue: "#3b82f6", amber: "#f59e0b",
  red: "#ef4444", teal: "#14b8a6",
};

const PIE_COLORS = [C.purple, C.pink, C.orange, C.green];
const EMP_COLORS = [C.purple, C.blue, C.orange, C.teal];

const currentYear  = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const yearOptions = Array.from({ length: 4 }, (_, i) => currentYear - i);

const Card = ({ title, subtitle, children, toolbar }) => (
  <div className="an-card">
    <div className="an-card__header">
      {title    && <h3 className="an-card__title">{title}</h3>}
      {subtitle && <p  className="an-card__sub">{subtitle}</p>}
    </div>
    {toolbar && <div className="an-card__toolbar">{toolbar}</div>}
    <div className="an-card__body">{children}</div>
  </div>
);

const StatPill = ({ label, value, color, icon }) => (
  <div className="an-stat-pill" style={{ borderColor: `${color}33` }}>
    <div className="an-stat-pill__icon" style={{ background: `${color}18`, color }}>{icon}</div>
    <div className="an-stat-pill__text">
      <div className="an-stat-pill__val">{value}</div>
      <div className="an-stat-pill__lbl">{label}</div>
    </div>
  </div>
);

const Spinner = () => (
  <div className="an-spinner-wrap"><div className="an-spinner" /></div>
);

const fmt  = (n) => `₹${(n || 0).toLocaleString("en-IN")}`;
const fmtK = (n) => n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : n >= 1000 ? `₹${(n/1000).toFixed(0)}K` : fmt(n);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="an-tooltip">
      <div className="an-tooltip__label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="an-tooltip__row">
          <span className="an-tooltip__dot" style={{ background: p.color }} />
          <span className="an-tooltip__name">{p.name}:</span>
          <span className="an-tooltip__val">
            {typeof p.value === "number" && p.name?.toLowerCase().includes("salary")
              ? fmtK(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function AnalyticsDashboard() {
  const [overview,    setOverview]    = useState(null);
  const [headcount,   setHeadcount]   = useState([]);
  const [attendance,  setAttendance]  = useState([]);
  const [departments, setDepartments] = useState([]);
  const [salary,      setSalary]      = useState(null);
  const [leave,       setLeave]       = useState(null);
  const [empTypes,    setEmpTypes]    = useState([]);
  const [loading,     setLoading]     = useState({});
  const [salaryMonth, setSalaryMonth] = useState(currentMonth);
  const [salaryYear,  setSalaryYear]  = useState(currentYear);
  const [leaveYear,   setLeaveYear]   = useState(currentYear);

  const load = (key, fn, setter) => {
    setLoading(l => ({ ...l, [key]: true }));
    fn().then(r => setter(r.data?.data))
       .catch(() => {})
       .finally(() => setLoading(l => ({ ...l, [key]: false })));
  };

  useEffect(() => {
    load("overview",    getOverview,           d => setOverview(d));
    load("headcount",   getHeadcountTrends,    d => setHeadcount(d?.trends || []));
    load("attendance",  getAttendanceTrends,   d => setAttendance(d?.trends || []));
    load("departments", getDepartmentBreakdown,d => setDepartments(d?.breakdown || []));
    load("empTypes",    getEmploymentTypes,    d => setEmpTypes(d?.breakdown || []));
  }, []);

  useEffect(() => {
    load("salary", () => getSalaryOverview(salaryMonth, salaryYear), d => setSalary(d));
  }, [salaryMonth, salaryYear]);

  useEffect(() => {
    load("leave", () => getLeaveSummary(leaveYear), d => setLeave(d));
  }, [leaveYear]);

  const axisStyle = { fill: "#6b7280", fontSize: 11 };
  const gridStyle = { strokeDasharray: "3 3", stroke: "rgba(255,255,255,0.05)" };

  return (
    <DashboardLayout>
      <div className="an-page">

        {/* ── Header ── */}
        <div className="an-page-header">
          <div>
            <h1 className="an-page-title">Analytics Dashboard</h1>
            <p className="an-page-sub">Organisation-wide insights and trends</p>
          </div>
        </div>

        {/* ── Overview Pills ── */}
        {loading.overview ? <Spinner /> : overview && (
          <div className="an-overview-row">
            <StatPill icon="👥" label="Total Employees"   value={overview.totalEmployees}   color={C.purple} />
            <StatPill icon="✅" label="Active"            value={overview.activeEmployees}  color={C.green}  />
            <StatPill icon="⛔" label="Inactive"          value={overview.inactiveEmployees}color={C.red}    />
            <StatPill icon="🏢" label="Departments"       value={overview.totalDepartments} color={C.blue}   />
            <StatPill icon="🎭" label="Roles"             value={overview.totalRoles}       color={C.orange} />
            <StatPill icon="🆕" label="Joined This Month" value={overview.newThisMonth}     color={C.teal}   />
          </div>
        )}

        {/* ── Row 1: Headcount + Employment Types ── */}
        <div className="an-grid an-grid--6040">

          <Card title="Headcount Trends" subtitle="Joinings vs exits — last 12 months">
            {loading.headcount ? <Spinner /> : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={headcount} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gJoined" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.purple} stopOpacity={0.25}/>
                      <stop offset="95%" stopColor={C.purple} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gLeft" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.pink} stopOpacity={0.25}/>
                      <stop offset="95%" stopColor={C.pink} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...gridStyle} />
                  <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
                  <Area type="monotone" dataKey="joined" name="Joined" stroke={C.purple} fill="url(#gJoined)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="left"   name="Left"   stroke={C.pink}   fill="url(#gLeft)"   strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card title="Employment Types" subtitle="Active headcount by type">
            {loading.empTypes ? <Spinner /> : (
              <div className="an-pie-wrap">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={empTypes} dataKey="count" nameKey="label"
                      cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3}>
                      {empTypes.map((_, i) => (
                        <Cell key={i} fill={EMP_COLORS[i % EMP_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="an-pie-legend">
                  {empTypes.map((t, i) => (
                    <div key={t.type} className="an-pie-legend-item">
                      <span className="an-pie-legend-dot" style={{ background: EMP_COLORS[i % EMP_COLORS.length] }} />
                      <span className="an-pie-legend-label">{t.label}</span>
                      <span className="an-pie-legend-val">{t.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* ── Row 2: Attendance Trends ── */}
        <Card title="Attendance Trends" subtitle="Present, late, absent and on-leave — last 6 months">
          {loading.attendance ? <Spinner /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={attendance} margin={{ top: 8, right: 8, left: -24, bottom: 0 }} barSize={12}>
                <CartesianGrid {...gridStyle} vertical={false} />
                <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
                <Bar dataKey="present" name="Present"  fill={C.green}  radius={[3,3,0,0]} />
                <Bar dataKey="late"    name="Late"     fill={C.amber}  radius={[3,3,0,0]} />
                <Bar dataKey="absent"  name="Absent"   fill={C.red}    radius={[3,3,0,0]} />
                <Bar dataKey="onLeave" name="On Leave" fill={C.blue}   radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* ── Row 3: Department + Leave ── */}
        <div className="an-grid an-grid--5050">

          <Card title="Department Breakdown" subtitle="Employee count per department">
            {loading.departments ? <Spinner /> : (
              <div className="an-dept-list">
                {departments.slice(0, 8).map((d, i) => (
                  <div key={d.code} className="an-dept-row">
                    <div className="an-dept-info">
                      <span className="an-dept-name">{d.name}</span>
                      <span className="an-dept-count">{d.active} active / {d.total} total</span>
                    </div>
                    <div className="an-dept-bar-wrap">
                      <div className="an-dept-bar" style={{
                        width: `${departments[0]?.total > 0 ? (d.active / departments[0].total) * 100 : 0}%`,
                        background: PIE_COLORS[i % PIE_COLORS.length],
                      }} />
                    </div>
                    <span className="an-dept-pct">
                      {departments[0]?.total > 0 ? Math.round((d.active / departments[0].total) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card
            title="Leave Summary"
            subtitle="Approved leaves by type"
            toolbar={
              <select className="an-select" value={leaveYear} onChange={e => setLeaveYear(Number(e.target.value))}>
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            }
          >
            {loading.leave ? <Spinner /> : leave ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Sick",   value: leave.byType.sick   },
                        { name: "Casual", value: leave.byType.casual },
                        { name: "Paid",   value: leave.byType.paid   },
                      ]}
                      dataKey="value" nameKey="name"
                      cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4}
                    >
                      <Cell fill={C.red}    />
                      <Cell fill={C.orange} />
                      <Cell fill={C.green}  />
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="an-leave-pills">
                  <div className="an-leave-pill an-leave-pill--approved"><span>✓ Approved</span><strong>{leave.byStatus.approved}</strong></div>
                  <div className="an-leave-pill an-leave-pill--pending"><span>⏳ Pending</span><strong>{leave.byStatus.pending}</strong></div>
                  <div className="an-leave-pill an-leave-pill--rejected"><span>✕ Rejected</span><strong>{leave.byStatus.rejected}</strong></div>
                </div>
                <div className="an-leave-types">
                  {[
                    { label: "Sick",   val: leave.byType.sick,   color: C.red    },
                    { label: "Casual", val: leave.byType.casual, color: C.orange },
                    { label: "Paid",   val: leave.byType.paid,   color: C.green  },
                  ].map(t => (
                    <div key={t.label} className="an-leave-type-row">
                      <span className="an-leave-type-dot" style={{ background: t.color }} />
                      <span className="an-leave-type-label">{t.label}</span>
                      <span className="an-leave-type-val">{t.val} days</span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </Card>
        </div>

        {/* ── Row 4: Salary Overview ── */}
        <Card
          title="Salary Overview"
          subtitle="Net salary trend and monthly totals"
          toolbar={
            <>
              <select className="an-select" value={salaryMonth} onChange={e => setSalaryMonth(Number(e.target.value))}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
              <select className="an-select" value={salaryYear} onChange={e => setSalaryYear(Number(e.target.value))}>
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </>
          }
        >
          {loading.salary ? <Spinner /> : salary ? (
            <>
              <div className="an-salary-stats">
                {[
                  { label: "Total Gross",    value: fmt(salary.totalGross),    color: C.purple },
                  { label: "Total Net",      value: fmt(salary.totalNet),      color: C.green  },
                  { label: "Total Tax",      value: fmt(salary.totalTax),      color: C.red    },
                  { label: "Total PF",       value: fmt(salary.totalPF),       color: C.orange },
                  { label: "Avg Net Salary", value: fmt(salary.avgSalary),     color: C.blue   },
                  { label: "Highest",        value: fmt(salary.highestSalary), color: C.teal   },
                ].map(s => (
                  <div key={s.label} className="an-salary-stat">
                    <div className="an-salary-stat__val" style={{ color: s.color }}>{s.value}</div>
                    <div className="an-salary-stat__lbl">{s.label}</div>
                  </div>
                ))}
              </div>
              {salary.monthlyTrend?.length > 0 && (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={salary.monthlyTrend} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                    <CartesianGrid {...gridStyle} />
                    <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
                    <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={fmtK} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="total" name="Net Salary" stroke={C.purple} strokeWidth={2.5} dot={{ fill: C.purple, r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </>
          ) : <div className="an-empty">No salary data for this period.</div>}
        </Card>

        {/* ── Row 5: Monthly Leave Trend ── */}
        {leave?.monthlyTrend && (
          <Card title="Monthly Leave Trend" subtitle={`Approved leaves month by month — ${leaveYear}`}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={leave.monthlyTrend} margin={{ top: 8, right: 8, left: -24, bottom: 0 }} barSize={18}>
                <CartesianGrid {...gridStyle} vertical={false} />
                <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Leaves" fill={C.purple} radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

      </div>
    </DashboardLayout>
  );
}
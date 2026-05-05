import { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, RadialBarChart, RadialBar,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
} from "recharts";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  getAttritionRisk,
  getDepartmentHealth,
  getLeaveForecast,
  getPerformanceInsights,
} from "../../services/predictiveService";
import "./PredictiveAnalyticsPage.css";

const C = {
  purple: "#7c3aed", pink: "#e11d74", orange: "#f97316",
  green: "#10b981", blue: "#3b82f6", amber: "#f59e0b",
  red: "#ef4444", teal: "#14b8a6",
};

const RISK_COLORS  = { high: "#ef4444", medium: "#f59e0b", low: "#10b981" };
const RISK_BG      = { high: "#ef444415", medium: "#f59e0b15", low: "#10b98115" };
const HEALTH_COLOR = (s) => s === "healthy" ? C.green : s === "moderate" ? C.amber : C.red;

const Spinner = () => <div className="pa-spinner-wrap"><div className="pa-spinner" /></div>;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="pa-tooltip">
      <div className="pa-tooltip__label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="pa-tooltip__row">
          <span className="pa-tooltip__dot" style={{ background: p.color || p.fill }} />
          <span>{p.name}: <strong>{p.value}</strong></span>
        </div>
      ))}
    </div>
  );
};

const axisStyle = { fill: "#6b7280", fontSize: 11 };
const gridStyle = { strokeDasharray: "3 3", stroke: "rgba(255,255,255,0.05)" };

export default function PredictiveAnalyticsPage() {
  const [attrition,    setAttrition]    = useState(null);
  const [deptHealth,   setDeptHealth]   = useState(null);
  const [leaveForecast,setLeaveForecast]= useState(null);
  const [perfInsights, setPerfInsights] = useState(null);
  const [loading,      setLoading]      = useState({});
  const [riskFilter,   setRiskFilter]   = useState("all");
  const [activeTab,    setActiveTab]    = useState("attrition");

  const load = (key, fn, setter) => {
    setLoading(l => ({ ...l, [key]: true }));
    fn().then(r => setter(r.data?.data))
       .catch(() => {})
       .finally(() => setLoading(l => ({ ...l, [key]: false })));
  };

  useEffect(() => {
    load("attrition",     getAttritionRisk,       setAttrition);
    load("deptHealth",    getDepartmentHealth,     setDeptHealth);
    load("leaveForecast", getLeaveForecast,        setLeaveForecast);
    load("perfInsights",  getPerformanceInsights,  setPerfInsights);
  }, []);

  const filteredEmployees = attrition?.employees?.filter(e =>
    riskFilter === "all" ? true : e.risk === riskFilter
  ) || [];

  const forecastData = [
    ...(leaveForecast?.trend?.slice(-6) || []),
    ...(leaveForecast?.forecast || []),
  ];

  return (
    <DashboardLayout>
      <div className="pa-page">

        {/* ── Header ── */}
        <div className="pa-header">
          <div>
            <h1 className="pa-title">Predictive Analytics</h1>
            <p className="pa-sub">AI-powered insights to help you act before problems arise</p>
          </div>
        </div>

        {/* ── Summary Cards ── */}
        <div className="pa-summary">
          <div className="pa-summary-card" style={{ borderColor: "#ef444440" }}>
            <div className="pa-summary-card__icon" style={{ background: "#ef444415" }}>🔴</div>
            <div>
              <div className="pa-summary-card__val" style={{ color: C.red }}>{attrition?.summary?.high ?? "—"}</div>
              <div className="pa-summary-card__lbl">High Attrition Risk</div>
            </div>
          </div>
          <div className="pa-summary-card" style={{ borderColor: "#f59e0b40" }}>
            <div className="pa-summary-card__icon" style={{ background: "#f59e0b15" }}>🟡</div>
            <div>
              <div className="pa-summary-card__val" style={{ color: C.amber }}>{attrition?.summary?.medium ?? "—"}</div>
              <div className="pa-summary-card__lbl">Medium Risk</div>
            </div>
          </div>
          <div className="pa-summary-card" style={{ borderColor: "#10b98140" }}>
            <div className="pa-summary-card__icon" style={{ background: "#10b98115" }}>🟢</div>
            <div>
              <div className="pa-summary-card__val" style={{ color: C.green }}>{attrition?.summary?.low ?? "—"}</div>
              <div className="pa-summary-card__lbl">Low Risk</div>
            </div>
          </div>
          <div className="pa-summary-card" style={{ borderColor: "#7c3aed40" }}>
            <div className="pa-summary-card__icon" style={{ background: "#7c3aed15" }}>⭐</div>
            <div>
              <div className="pa-summary-card__val" style={{ color: C.purple }}>{perfInsights?.avgRating ?? "—"}</div>
              <div className="pa-summary-card__lbl">Avg Performance Rating</div>
            </div>
          </div>
          <div className="pa-summary-card" style={{ borderColor: "#3b82f640" }}>
            <div className="pa-summary-card__icon" style={{ background: "#3b82f615" }}>📅</div>
            <div>
              <div className="pa-summary-card__val" style={{ color: C.blue }}>{leaveForecast?.avgMonthlyLeaves ?? "—"}</div>
              <div className="pa-summary-card__lbl">Avg Monthly Leave Days</div>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="pa-tabs">
          {[
            { id: "attrition",  label: "🔴 Attrition Risk" },
            { id: "health",     label: "🏢 Dept Health" },
            { id: "leave",      label: "📅 Leave Forecast" },
            { id: "performance",label: "⭐ Performance" },
          ].map(t => (
            <button key={t.id} className={`pa-tab ${activeTab === t.id ? "pa-tab--active" : ""}`} onClick={() => setActiveTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════
            TAB 1 — ATTRITION RISK
        ══════════════════════════════════════════════ */}
        {activeTab === "attrition" && (
          <div className="pa-section">
            <div className="pa-section__header">
              <div>
                <h2 className="pa-section__title">Employee Attrition Risk</h2>
                <p className="pa-section__sub">Scored using attendance, leave frequency, tenure & performance</p>
              </div>
              <div className="pa-risk-filters">
                {["all","high","medium","low"].map(r => (
                  <button key={r} className={`pa-risk-btn pa-risk-btn--${r} ${riskFilter === r ? "active" : ""}`} onClick={() => setRiskFilter(r)}>
                    {r === "all" ? "All" : r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {loading.attrition ? <Spinner /> : (
              <div className="pa-table-wrap">
                <table className="pa-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Tenure</th>
                      <th>Late (90d)</th>
                      <th>Absent (90d)</th>
                      <th>Leaves (180d)</th>
                      <th>Perf Score</th>
                      <th>Risk Score</th>
                      <th>Risk Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.length === 0 ? (
                      <tr><td colSpan={9} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>No employees found</td></tr>
                    ) : filteredEmployees.map(emp => (
                      <tr key={emp._id} className="pa-row">
                        <td>
                          <div className="pa-emp-name">{emp.name}</div>
                          <div className="pa-emp-id">{emp.employeeId}</div>
                        </td>
                        <td className="pa-td-muted">{emp.department}</td>
                        <td className="pa-td-muted">{emp.tenure}mo</td>
                        <td>
                          <span style={{ color: emp.lateCount >= 6 ? C.red : emp.lateCount >= 3 ? C.amber : C.green }}>
                            {emp.lateCount}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: emp.absentCount >= 4 ? C.red : emp.absentCount >= 2 ? C.amber : C.green }}>
                            {emp.absentCount}
                          </span>
                        </td>
                        <td className="pa-td-muted">{emp.leaveCount}</td>
                        <td>
                          {emp.perfScore !== null
                            ? <span style={{ color: emp.perfScore >= 4 ? C.green : emp.perfScore >= 3 ? C.amber : C.red }}>
                                {emp.perfScore}⭐
                              </span>
                            : <span className="pa-td-muted">—</span>
                          }
                        </td>
                        <td>
                          <div className="pa-score-bar-wrap">
                            <div className="pa-score-bar" style={{ width: `${emp.score}%`, background: RISK_COLORS[emp.risk] }} />
                            <span className="pa-score-val">{emp.score}</span>
                          </div>
                        </td>
                        <td>
                          <span className="pa-risk-badge" style={{ color: RISK_COLORS[emp.risk], background: RISK_BG[emp.risk] }}>
                            {emp.risk === "high" ? "🔴" : emp.risk === "medium" ? "🟡" : "🟢"} {emp.risk}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════
            TAB 2 — DEPARTMENT HEALTH
        ══════════════════════════════════════════════ */}
        {activeTab === "health" && (
          <div className="pa-section">
            <h2 className="pa-section__title">Department Health Scores</h2>
            <p className="pa-section__sub">Combined score based on attendance, leave usage & performance</p>

            {loading.deptHealth ? <Spinner /> : (
              <>
                <div className="pa-dept-grid">
                  {deptHealth?.departments?.map(dept => (
                    <div key={dept.department} className="pa-dept-card" style={{ borderColor: `${HEALTH_COLOR(dept.status)}30` }}>
                      <div className="pa-dept-card__header">
                        <div className="pa-dept-card__name">{dept.department}</div>
                        <span className="pa-dept-status" style={{ color: HEALTH_COLOR(dept.status), background: `${HEALTH_COLOR(dept.status)}15` }}>
                          {dept.status === "healthy" ? "✅ Healthy" : dept.status === "moderate" ? "⚠️ Moderate" : "🔴 Attention"}
                        </span>
                      </div>
                      <div className="pa-dept-score-row">
                        <div className="pa-dept-score" style={{ color: HEALTH_COLOR(dept.status) }}>{dept.healthScore}</div>
                        <div className="pa-dept-score-label">/ 100</div>
                      </div>
                      <div className="pa-dept-score-bar-bg">
                        <div className="pa-dept-score-bar" style={{ width: `${dept.healthScore}%`, background: HEALTH_COLOR(dept.status) }} />
                      </div>
                      <div className="pa-dept-stats">
                        <div className="pa-dept-stat">
                          <div className="pa-dept-stat__val">{dept.employeeCount}</div>
                          <div className="pa-dept-stat__lbl">Employees</div>
                        </div>
                        <div className="pa-dept-stat">
                          <div className="pa-dept-stat__val" style={{ color: dept.attendanceRate >= 80 ? C.green : C.red }}>{dept.attendanceRate}%</div>
                          <div className="pa-dept-stat__lbl">Attendance</div>
                        </div>
                        <div className="pa-dept-stat">
                          <div className="pa-dept-stat__val" style={{ color: dept.lateRate <= 10 ? C.green : C.amber }}>{dept.lateRate}%</div>
                          <div className="pa-dept-stat__lbl">Late Rate</div>
                        </div>
                        <div className="pa-dept-stat">
                          <div className="pa-dept-stat__val">{dept.avgPerformance ?? "—"}{dept.avgPerformance ? "⭐" : ""}</div>
                          <div className="pa-dept-stat__lbl">Avg Perf</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Health score bar chart */}
                {deptHealth?.departments?.length > 0 && (
                  <div className="pa-card" style={{ marginTop: 20 }}>
                    <h3 className="pa-card__title">Health Score Comparison</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={deptHealth.departments} margin={{ top: 8, right: 8, left: -24, bottom: 40 }} barSize={28}>
                        <CartesianGrid {...gridStyle} vertical={false} />
                        <XAxis dataKey="department" tick={{ ...axisStyle, fontSize: 10 }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" />
                        <YAxis tick={axisStyle} axisLine={false} tickLine={false} domain={[0, 100]} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="healthScore" name="Health Score" radius={[4,4,0,0]}>
                          {deptHealth.departments.map((d, i) => (
                            <Cell key={i} fill={HEALTH_COLOR(d.status)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════
            TAB 3 — LEAVE FORECAST
        ══════════════════════════════════════════════ */}
        {activeTab === "leave" && (
          <div className="pa-section">
            <h2 className="pa-section__title">Leave Forecast</h2>
            <p className="pa-section__sub">Historical leave trend + 3-month forecast based on past patterns</p>

            {loading.leaveForecast ? <Spinner /> : (
              <>
                <div className="pa-forecast-stats">
                  <div className="pa-forecast-stat">
                    <div className="pa-forecast-stat__val" style={{ color: C.amber }}>{leaveForecast?.peakMonth}</div>
                    <div className="pa-forecast-stat__lbl">Peak Leave Month (historical)</div>
                  </div>
                  <div className="pa-forecast-stat">
                    <div className="pa-forecast-stat__val" style={{ color: C.blue }}>{leaveForecast?.avgMonthlyLeaves}</div>
                    <div className="pa-forecast-stat__lbl">Avg Monthly Leave Days</div>
                  </div>
                  <div className="pa-forecast-stat">
                    <div className="pa-forecast-stat__val" style={{ color: C.purple }}>{leaveForecast?.forecast?.[0]?.forecast ?? "—"}</div>
                    <div className="pa-forecast-stat__lbl">Next Month Forecast (days)</div>
                  </div>
                </div>

                <div className="pa-card">
                  <h3 className="pa-card__title">Leave Trend + 3-Month Forecast</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={forecastData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                      <CartesianGrid {...gridStyle} />
                      <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
                      <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12, color: "#9ca3af" }} />
                      <Line type="monotone" dataKey="actual"   name="Actual Leaves"   stroke={C.purple} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                      <Line type="monotone" dataKey="forecast" name="Forecasted Leaves" stroke={C.amber}  strokeWidth={2.5} strokeDasharray="6 3" dot={{ r: 3 }} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="pa-forecast-cards">
                  {leaveForecast?.forecast?.map((f, i) => (
                    <div key={i} className="pa-forecast-card">
                      <div className="pa-forecast-card__month">{f.label}</div>
                      <div className="pa-forecast-card__val" style={{ color: C.amber }}>{f.forecast}</div>
                      <div className="pa-forecast-card__lbl">Forecasted Days</div>
                      <div className="pa-forecast-card__badge">📊 Forecast</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════
            TAB 4 — PERFORMANCE INSIGHTS
        ══════════════════════════════════════════════ */}
        {activeTab === "performance" && (
          <div className="pa-section">
            <h2 className="pa-section__title">Performance Insights</h2>
            <p className="pa-section__sub">Top performers and employees needing attention — {new Date().getFullYear()}</p>

            {loading.perfInsights ? <Spinner /> : (
              <>
                <div className="pa-perf-grid">
                  {/* Top Performers */}
                  <div className="pa-card">
                    <h3 className="pa-card__title" style={{ color: C.green }}>🏆 Top Performers</h3>
                    <div className="pa-perf-list">
                      {perfInsights?.topPerformers?.length === 0
                        ? <p className="pa-empty">No performance data yet</p>
                        : perfInsights?.topPerformers?.map((emp, i) => (
                          <div key={emp.employeeId} className="pa-perf-row">
                            <div className="pa-perf-rank" style={{ background: i === 0 ? "#f59e0b" : i === 1 ? "#9ca3af" : i === 2 ? "#b45309" : "var(--bg-elevated)" }}>
                              {i + 1}
                            </div>
                            <div className="pa-perf-info">
                              <div className="pa-perf-name">{emp.name}</div>
                              <div className="pa-perf-dept">{emp.department}</div>
                            </div>
                            <div className="pa-perf-rating" style={{ color: C.green }}>{emp.rating}⭐</div>
                          </div>
                        ))
                      }
                    </div>
                  </div>

                  {/* Needs Attention */}
                  <div className="pa-card">
                    <h3 className="pa-card__title" style={{ color: C.red }}>⚠️ Needs Attention</h3>
                    <div className="pa-perf-list">
                      {perfInsights?.needsAttention?.length === 0
                        ? <p className="pa-empty" style={{ color: C.green }}>✅ All employees performing well!</p>
                        : perfInsights?.needsAttention?.map((emp) => (
                          <div key={emp.employeeId} className="pa-perf-row">
                            <div className="pa-perf-rank" style={{ background: "#ef444420", color: C.red }}>!</div>
                            <div className="pa-perf-info">
                              <div className="pa-perf-name">{emp.name}</div>
                              <div className="pa-perf-dept">{emp.department}</div>
                            </div>
                            <div className="pa-perf-rating" style={{ color: C.red }}>{emp.rating}⭐</div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                </div>

                {/* Rating Distribution */}
                {perfInsights?.ratingDistribution && (
                  <div className="pa-card" style={{ marginTop: 20 }}>
                    <h3 className="pa-card__title">Rating Distribution</h3>
                    <div className="pa-rating-dist">
                      {perfInsights.ratingDistribution.map(d => (
                        <div key={d.label} className="pa-rating-bar-row">
                          <div className="pa-rating-label">{d.label}</div>
                          <div className="pa-rating-bar-bg">
                            <div className="pa-rating-bar" style={{
                              width: perfInsights.totalReviewed > 0 ? `${(d.count / perfInsights.totalReviewed) * 100}%` : "0%",
                              background: d.color,
                            }} />
                          </div>
                          <div className="pa-rating-count" style={{ color: d.color }}>{d.count}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 12, color: "var(--text-muted)", fontSize: 13 }}>
                      Total reviewed: <strong style={{ color: "var(--text-primary)" }}>{perfInsights.totalReviewed}</strong> employees
                      · Avg rating: <strong style={{ color: C.purple }}>{perfInsights.avgRating}⭐</strong>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
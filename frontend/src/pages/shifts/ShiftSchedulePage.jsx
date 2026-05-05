import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  getShiftTypes, createShiftType, deleteShiftType,
  getWeeklySchedule, getMyShifts, assignShift, removeShiftAssignment,
} from "../../services/shiftService";
import "./ShiftSchedulePage.css";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NUMS = [1, 2, 3, 4, 5, 6, 0]; // Mon=1 ... Sun=0

const getMonday = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const fmtWeek = (monday) => {
  const end = new Date(monday);
  end.setDate(end.getDate() + 6);
  return `${monday.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
};

export default function ShiftSchedulePage() {
  const { user } = useAuth();
  const role = user?.role;
  const isHRManager = ["admin", "hr", "manager"].includes(role);

  const [shiftTypes,  setShiftTypes]  = useState([]);
  const [schedule,    setSchedule]    = useState([]);
  const [myShifts,    setMyShifts]    = useState([]);
  const [weekStart,   setWeekStart]   = useState(getMonday());
  const [loading,     setLoading]     = useState(true);
  const [showTypeForm,setShowTypeForm]= useState(false);
  const [assigning,   setAssigning]   = useState({});
  const [typeForm,    setTypeForm]    = useState({ name: "", startTime: "09:00", endTime: "17:00", color: "#7c3aed" });

  const fetchShiftTypes = useCallback(async () => {
    const res = await getShiftTypes();
    setShiftTypes(res.data.data.shiftTypes || []);
  }, []);

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    try {
      if (isHRManager) {
        const res = await getWeeklySchedule({ weekStart: weekStart.toISOString() });
        setSchedule(res.data.data.schedule || []);
      } else {
        const res = await getMyShifts({ weekStart: weekStart.toISOString() });
        setMyShifts(res.data.data.assignments || []);
      }
    } catch {}
    finally { setLoading(false); }
  }, [weekStart, isHRManager]);

  useEffect(() => { fetchShiftTypes(); }, [fetchShiftTypes]);
  useEffect(() => { fetchSchedule(); },  [fetchSchedule]);

  const prevWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); };
  const nextWeek = () => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); };

  const handleCreateType = async (e) => {
    e.preventDefault();
    await createShiftType(typeForm);
    setTypeForm({ name: "", startTime: "09:00", endTime: "17:00", color: "#7c3aed" });
    setShowTypeForm(false);
    fetchShiftTypes();
  };

  const handleAssign = async (employeeId, dayOfWeek, shiftTypeId) => {
    const key = `${employeeId}-${dayOfWeek}`;
    setAssigning(a => ({ ...a, [key]: true }));
    try {
      await assignShift({ employeeId, shiftTypeId, dayOfWeek, weekStart: weekStart.toISOString() });
      fetchSchedule();
    } catch {}
    finally { setAssigning(a => ({ ...a, [key]: false })); }
  };

  const handleRemove = async (assignmentId) => {
    await removeShiftAssignment(assignmentId);
    fetchSchedule();
  };

  return (
    <DashboardLayout>
      <div className="ss-page">

        {/* Header */}
        <div className="ss-header">
          <div>
            <h1 className="ss-title">Shift Schedule</h1>
            <p className="ss-sub">{isHRManager ? "Manage weekly shift assignments" : "View your shift schedule"}</p>
          </div>
          {isHRManager && (
            <button className="ss-add-btn" onClick={() => setShowTypeForm(s => !s)}>
              {showTypeForm ? "✕ Cancel" : "+ Shift Type"}
            </button>
          )}
        </div>

        {/* Shift Type Form */}
        {showTypeForm && (
          <form className="ss-type-form" onSubmit={handleCreateType}>
            <h3 className="ss-type-form-title">New Shift Type</h3>
            <div className="ss-type-grid">
              <div className="ss-field">
                <label>Name</label>
                <input type="text" placeholder="Morning Shift" value={typeForm.name} onChange={e => setTypeForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="ss-field">
                <label>Start Time</label>
                <input type="time" value={typeForm.startTime} onChange={e => setTypeForm(f => ({ ...f, startTime: e.target.value }))} />
              </div>
              <div className="ss-field">
                <label>End Time</label>
                <input type="time" value={typeForm.endTime} onChange={e => setTypeForm(f => ({ ...f, endTime: e.target.value }))} />
              </div>
              <div className="ss-field">
                <label>Color</label>
                <input type="color" value={typeForm.color} onChange={e => setTypeForm(f => ({ ...f, color: e.target.value }))} />
              </div>
            </div>
            <button type="submit" className="ss-submit-btn">Create Shift Type</button>
          </form>
        )}

        {/* Shift Types Pills */}
        {shiftTypes.length > 0 && (
          <div className="ss-types-row">
            {shiftTypes.map(st => (
              <div key={st._id} className="ss-type-pill" style={{ borderColor: `${st.color}50`, background: `${st.color}12` }}>
                <span className="ss-type-dot" style={{ background: st.color }} />
                <span className="ss-type-name" style={{ color: st.color }}>{st.name}</span>
                <span className="ss-type-time">{st.startTime} – {st.endTime}</span>
              </div>
            ))}
          </div>
        )}

        {/* Week Navigator */}
        <div className="ss-week-nav">
          <button className="ss-nav-btn" onClick={prevWeek}>← Prev</button>
          <span className="ss-week-label">{fmtWeek(weekStart)}</span>
          <button className="ss-nav-btn" onClick={nextWeek}>Next →</button>
        </div>

        {/* Schedule Grid (HR/Manager) */}
        {isHRManager && (
          loading ? (
            <div className="ss-state"><div className="ss-spinner" /><p>Loading schedule...</p></div>
          ) : schedule.length === 0 ? (
            <div className="ss-state"><div className="ss-state-icon">📅</div><p>No employees found.</p></div>
          ) : (
            <div className="ss-grid-wrap">
              <table className="ss-grid">
                <thead>
                  <tr>
                    <th className="ss-th-emp">Employee</th>
                    {DAYS.map(d => <th key={d} className="ss-th-day">{d}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {schedule.map(({ employee, shifts }) => (
                    <tr key={employee._id}>
                      <td className="ss-td-emp">
                        <div className="ss-emp-name">{employee.firstName} {employee.lastName}</div>
                        <div className="ss-emp-id">{employee.employeeId}</div>
                      </td>
                      {DAY_NUMS.map((dayNum, i) => {
                        const shift = shifts[dayNum];
                        const key   = `${employee._id}-${dayNum}`;
                        return (
                          <td key={i} className="ss-td-day">
                            {shift ? (
                              <div
                                className="ss-shift-pill"
                                style={{ background: `${shift.shiftType?.color}18`, border: `1px solid ${shift.shiftType?.color}40`, color: shift.shiftType?.color }}
                              >
                                <span className="ss-shift-name">{shift.shiftType?.name}</span>
                                <span className="ss-shift-time">{shift.shiftType?.startTime}–{shift.shiftType?.endTime}</span>
                                <button className="ss-remove-btn" onClick={() => handleRemove(shift._id)} title="Remove">✕</button>
                              </div>
                            ) : (
                              <select
                                className="ss-assign-select"
                                defaultValue=""
                                disabled={assigning[key]}
                                onChange={e => { if (e.target.value) handleAssign(employee._id, dayNum, e.target.value); e.target.value = ""; }}
                              >
                                <option value="">+</option>
                                {shiftTypes.map(st => (
                                  <option key={st._id} value={st._id}>{st.name}</option>
                                ))}
                              </select>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Employee Self View */}
        {!isHRManager && (
          <div className="ss-my-shifts">
            {loading ? (
              <div className="ss-state"><div className="ss-spinner" /></div>
            ) : myShifts.length === 0 ? (
              <div className="ss-state"><div className="ss-state-icon">📅</div><p>No shifts assigned for this week.</p></div>
            ) : (
              <div className="ss-my-grid">
                {DAY_NUMS.map((dayNum, i) => {
                  const shift = myShifts.find(s => s.dayOfWeek === dayNum);
                  const dayDate = new Date(weekStart);
                  dayDate.setDate(dayDate.getDate() + (i === 6 ? -1 : i));
                  return (
                    <div key={i} className={`ss-my-day ${shift ? "ss-my-day--active" : ""}`}>
                      <div className="ss-my-day-name">{DAYS[i]}</div>
                      <div className="ss-my-day-date">{dayDate.getDate()}</div>
                      {shift ? (
                        <div className="ss-my-shift" style={{ background: `${shift.shiftType?.color}18`, color: shift.shiftType?.color }}>
                          <div className="ss-my-shift-name">{shift.shiftType?.name}</div>
                          <div className="ss-my-shift-time">{shift.shiftType?.startTime} – {shift.shiftType?.endTime}</div>
                        </div>
                      ) : (
                        <div className="ss-my-off">Day Off</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
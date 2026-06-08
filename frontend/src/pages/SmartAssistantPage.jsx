import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { sendMessage } from "../services/aiService";
import {
  agentCheckIn, agentCheckOut,
  agentGetLeaveBalance, agentGetMyLeaves,
  agentApplyLeave, agentGetMyReviews,
  agentGetMyGoals, agentGetNotifications,
  agentGetMyDocuments, agentGetAnnouncements,
  agentGetMyShifts, agentGetTodayAttendance,
  agentGetMyAttendance, agentGetMyPayroll,
} from "../services/AgentService";
import "./AIAssistantPage.css";

// ── Role-based suggestions ────────────────────────────────
const SUGGESTIONS = {
  admin:    ["How many active employees?", "Explain performance review process", "How does payroll work?", "What are leave policy rules?"],
  subadmin: ["Give me a company headcount overview", "What's the average performance rating?", "Summarize our leave trends", "How do I read analytics?"],
  hr:       ["How to onboard a new employee?", "What's the leave approval process?", "How to initiate a performance review?", "Explain salary structure"],
  manager:  ["How to approve a leave request?", "How do I assign a task to my team?", "What's the performance review schedule?", "How to handle attendance issues?"],
  employee: ["Check in my attendance", "Apply for casual leave", "What is my leave balance?", "Show my payslip"],
};

const ROLE_LABELS = {
  admin: "Admin", subadmin: "Sub Admin",
  hr: "HR", manager: "Manager", employee: "Employee",
};

// ── Collect flow state machine ────────────────────────────
const COLLECT_FIELDS = {
  APPLY_LEAVE: {
    fields:    ["leaveType", "startDate", "endDate", "reason"],
    questions: {
      leaveType: "What type of leave? Reply with: Casual, Sick, or Paid",
      startDate: "What's the start date? (format: YYYY-MM-DD, e.g. 2026-06-10)",
      endDate:   "What's the end date? (format: YYYY-MM-DD, e.g. 2026-06-12)",
      reason:    "Any reason to mention? (or say **skip**)",
    },
  },
};

// ── Format markdown ───────────────────────────────────────
const formatMessage = (text) =>
  text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g,     "<em>$1</em>")
    .replace(/^### (.*?)$/gm,  '<div class="ai-heading3">$1</div>')
    .replace(/^## (.*?)$/gm,   '<div class="ai-heading2">$1</div>')
    .replace(/^# (.*?)$/gm,    '<div class="ai-heading1">$1</div>')
    .replace(/^- (.*?)$/gm,    '<div class="ai-li">• $1</div>')
    .replace(/^\d+\. (.*?)$/gm,'<div class="ai-li">$1</div>')
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g,   "<br/>");

// ── Typing indicator ──────────────────────────────────────
const TypingIndicator = () => (
  <div className="ai-msg ai-msg--bot">
    <div className="ai-msg__avatar">✦</div>
    <div className="ai-msg__bubble ai-msg__bubble--bot ai-typing">
      <span /><span /><span />
    </div>
  </div>
);

// ── Result card for fetch/instant actions ─────────────────
const ResultCard = ({ result }) => {
  if (!result) return null;
  return (
    <div className="ai-result-card">
      {result.type === "success" && <span className="ai-result-icon">✅</span>}
      {result.type === "error"   && <span className="ai-result-icon">❌</span>}
      {result.type === "info"    && <span className="ai-result-icon">ℹ️</span>}
      <div className="ai-result-content"
        dangerouslySetInnerHTML={{ __html: formatMessage(result.content) }} />
    </div>
  );
};

// ── Navigate button ───────────────────────────────────────
const ActionButton = ({ label, onClick }) => (
  <button className="ai-action-btn" onClick={onClick}>
    <span className="ai-action-btn__icon">→</span>
    {label}
  </button>
);

// ── Main Component ────────────────────────────────────────
export default function SmartAssistantPage() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const [messages,     setMessages]     = useState([]);
  const [input,        setInput]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  // Collect flow state
  const [collectFlow,  setCollectFlow]  = useState(null);
  // { action, fields, questions, collected: {}, currentField: 0 }
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  const role        = user?.role || "employee";
  const suggestions = SUGGESTIONS[role] || SUGGESTIONS.employee;
  const roleLabel   = ROLE_LABELS[role] || "Employee";
  const firstName   = user?.name?.split(" ")[0] || "there";
  const storageKey  = `smart_assistant_chat_${user?._id || "guest"}`;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Load chat from localStorage on mount ──────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.length > 0) { setMessages(parsed); return; }
      }
    } catch { /* ignore */ }
    // Default welcome message
    setMessages([{
      role: "assistant",
      content: `Hi ${firstName}! ✦ I'm your Smart Assistant.\n\nI can answer questions, **fetch your data**, and **take actions** on your behalf — just ask naturally!\n\nTry: *"check in my attendance"* or *"what is my leave balance?"*`,
      result: null, navigateTo: null,
    }]);
  }, [storageKey]);

  // ── Save chat to localStorage on every update ─────────
  useEffect(() => {
    if (messages.length > 0) {
      try { localStorage.setItem(storageKey, JSON.stringify(messages)); } catch { /* ignore */ }
    }
  }, [messages, storageKey]);

  // ── Add bot message ───────────────────────────────────
  const addBotMessage = (content, result = null, navigateTo = null) => {
    setMessages(prev => [...prev, { role: "assistant", content, result, navigateTo }]);
  };

  // ── Execute instant action ────────────────────────────
  const executeInstant = useCallback(async (action) => {
    try {
      if (action === "CHECKIN") {
        const res  = await agentCheckIn();
        const att  = res.data?.data?.attendance || {};
        const checkInTime = att.checkIn?.time;
        const isLate      = att.isLate || false;
        const lateBy      = att.lateByMinutes || 0;
        const timeStr     = checkInTime
          ? new Date(checkInTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
          : new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
        return {
          type: "success",
          content: `**Checked in successfully!** 🎉\nTime: **${timeStr}**\n${isLate ? `⚠️ You are **${lateBy} minutes** late today.` : "✅ You are on time! Have a great day!"}`,
        };
      }
      if (action === "CHECKOUT") {
        const res  = await agentCheckOut();
        const att  = res.data?.data?.attendance || {};
        const wh   = res.data?.data?.workingHours || att.workingHours || null;
        const checkOutTime = att.checkOut?.time;
        const timeStr      = checkOutTime
          ? new Date(checkOutTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
          : new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
        return {
          type: "success",
          content: `**Checked out!** 👋\nTime: **${timeStr}**${wh ? `\nTotal working hours: **${wh} hrs**` : ""}`,
        };
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Action failed. Please try again.";
      return { type: "error", content: `❌ ${msg}` };
    }
  }, []);

  // ── Execute fetch action ──────────────────────────────
  const executeFetch = useCallback(async (action) => {
    try {
      if (action === "GET_LEAVE_BALANCE") {
        const res = await agentGetLeaveBalance();
        const raw = res.data?.data || res.data || {};
        // Handle both array and object formats
        const balances = Array.isArray(raw) ? raw :
          raw.balances || raw.leaveBalances || raw.balance || raw;
        let lines = "";
        if (Array.isArray(balances)) {
          lines = balances.map(b =>
            `- **${b.leaveType || b.type}**: ${b.remaining ?? b.balance ?? "—"} days remaining`
          ).join("\n");
        } else if (typeof balances === "object") {
          lines = Object.entries(balances)
            .filter(([k]) => !["_id","employee","year","__v"].includes(k))
            .map(([type, val]) =>
              `- **${type}**: ${typeof val === "object" ? (val.remaining ?? val.balance ?? JSON.stringify(val)) : val} days`
            ).join("\n");
        }
        return { type: "info", content: `**Your Leave Balance:**\n${lines || "No balance data found."}` };
      }
      if (action === "GET_MY_LEAVES") {
        const res    = await agentGetMyLeaves();
        const leaves = res.data?.data?.leaves || res.data?.data || res.data || [];
        const list   = Array.isArray(leaves) ? leaves : [];
        if (!list.length) return { type: "info", content: "You have no leave records yet." };
        const lines = list.slice(0, 5)
          .map(l => `- **${l.leaveType}** (${l.status}): ${new Date(l.startDate).toLocaleDateString("en-IN")} → ${new Date(l.endDate).toLocaleDateString("en-IN")}`)
          .join("\n");
        return { type: "info", content: `**Recent Leaves:**\n${lines}` };
      }
      if (action === "GET_MY_REVIEWS") {
        const res     = await agentGetMyReviews();
        const reviews = res.data?.data?.reviews || res.data?.data || res.data || [];
        const list    = Array.isArray(reviews) ? reviews : [];
        if (!list.length) return { type: "info", content: "No performance reviews found yet." };
        const lines = list.slice(0, 3)
          .map(r => `- **Q${r.quarter} ${r.year}**: ${r.overallRating ? `⭐ ${r.overallRating}/5` : "Pending"} (${r.status})`)
          .join("\n");
        return { type: "info", content: `**Your Performance Reviews:**\n${lines}` };
      }
      if (action === "GET_MY_TASKS") {
        const res   = await agentGetMyGoals();
        const goals = res.data?.data?.goals || res.data?.data || res.data || [];
        const list  = Array.isArray(goals) ? goals : [];
        if (!list.length) return { type: "info", content: "No tasks assigned to you yet." };
        const lines = list.slice(0, 5)
          .map(g => `- **${g.title}**: ${g.progress || 0}% complete (${g.status})`)
          .join("\n");
        return { type: "info", content: `**Your Tasks:**\n${lines}` };
      }
      if (action === "GET_NOTIFICATIONS") {
        const res    = await agentGetNotifications();
        // Try all possible response shapes
        const raw    = res.data?.data;
        const notifs = Array.isArray(raw) ? raw
          : raw?.notifications || raw?.docs || raw?.results || [];
        const list   = Array.isArray(notifs) ? notifs : [];
        if (!list.length) return { type: "info", content: "✅ You have no unread notifications right now." };
        const lines  = list.slice(0, 5)
          .map(n => `- **${n.title || "Notification"}**: ${n.message || n.body || ""}`)
          .join("\n");
        return { type: "info", content: `**Your Notifications:**\n${lines}` };
      }
      if (action === "GET_ANNOUNCEMENTS") {
        const res    = await agentGetAnnouncements();
        const raw    = res.data?.data;
        const annons = Array.isArray(raw) ? raw
          : raw?.announcements || raw?.docs || raw?.results || [];
        const list   = Array.isArray(annons) ? annons : [];
        if (!list.length) return { type: "info", content: "No active announcements right now." };
        const lines  = list.slice(0, 3)
          .map(a => `- **${a.title}**: ${a.content?.slice(0, 80) || a.message?.slice(0, 80) || ""}${(a.content?.length > 80 || a.message?.length > 80) ? "..." : ""}`)
          .join("\n");
        return { type: "info", content: `**Latest Announcements:**\n${lines}` };
      }
      if (action === "GET_TODAY_ATTENDANCE") {
        const res  = await agentGetTodayAttendance();
        const att  = res.data?.data?.attendance;
        if (!att) return { type: "info", content: "You haven't checked in yet today." };
        const checkIn  = att.checkIn?.time  ? new Date(att.checkIn.time).toLocaleTimeString("en-IN",  { hour: "2-digit", minute: "2-digit" }) : null;
        const checkOut = att.checkOut?.time ? new Date(att.checkOut.time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : null;
        return {
          type: "info",
          content: `**Today's Attendance:**
- Status: **${att.status}**${att.isLate ? " ⚠️ Late" : " ✅ On time"}
- Check-in: **${checkIn || "—"}**
- Check-out: **${checkOut || "Not yet"}**${att.workingHours ? `
- Working hours: **${att.workingHours}h**` : ""}`,
        };
      }
      if (action === "GET_MY_ATTENDANCE") {
        const res     = await agentGetMyAttendance();
        const records = res.data?.data?.records || [];
        const summary = res.data?.data?.summary || {};
        if (!records.length) return { type: "info", content: "No attendance records found for this month." };
        return {
          type: "info",
          content: `**Your Attendance This Month:**
- ✅ Present: **${summary.present || 0}** days
- ⏰ Late: **${summary.late || 0}** days
- ❌ Absent: **${summary.absent || 0}** days
- 🏖️ On Leave: **${summary.onLeave || 0}** days
- ⏱️ Total Hours: **${summary.totalWorkingHours || 0}h**`,
        };
      }
      if (action === "GET_MY_SHIFTS") {
        try {
          const res = await agentGetMyShifts();
          const raw = res.data?.data;
          const assignments =
            raw?.assignments ||
            raw?.shifts ||
            (Array.isArray(raw) ? raw : null) ||
            [];
          if (!assignments.length) return { type: "info", content: "No shifts have been assigned to you yet." };
          const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
          const lines = assignments.map(a =>
            `- **${days[a.dayOfWeek] ?? a.dayOfWeek ?? "?"}**: ${a.shiftType?.name || a.name || "Shift"} (${a.shiftType?.startTime || a.startTime || "—"} – ${a.shiftType?.endTime || a.endTime || "—"})`
          ).join("\n");
          return { type: "info", content: `**Your Shifts:**\n${lines}` };
        } catch (shiftErr) {
          const status = shiftErr?.response?.status;
          if (status === 404) return { type: "info", content: "No shifts have been assigned to you yet." };
          return { type: "error", content: "Could not fetch shift data. Try visiting the Shifts page directly." };
        }
      }
      if (action === "GET_MY_PAYROLL") {
        const res     = await agentGetMyPayroll();
        const records = res.data?.data?.records || [];
        if (!records.length) return { type: "info", content: "No payroll records found for this year." };
        const latest = records[0];
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        return {
          type: "info",
          content: `**Latest Payroll — ${months[(latest.month||1)-1]} ${latest.year}:**
- Gross: **₹${(latest.grossSalary||0).toLocaleString("en-IN")}**
- Deductions: **₹${((latest.taxDeduction||0)+(latest.pfDeduction||0)).toLocaleString("en-IN")}**
- Net Pay: **₹${(latest.netSalary||0).toLocaleString("en-IN")}**
- Status: **${latest.status}**`,
        };
      }
      if (action === "GET_MY_DOCUMENTS") {
        const res  = await agentGetMyDocuments();
        const docs = res.data?.data?.documents || res.data?.data || res.data || [];
        const list = Array.isArray(docs) ? docs : [];
        if (!list.length) return { type: "info", content: "You have no documents uploaded yet." };
        const lines = list.slice(0, 5)
          .map(d => `- **${d.name}** (${d.type}) — ${(d.size ? (d.size/1024).toFixed(1)+"KB" : "")} uploaded ${new Date(d.uploadedAt || d.createdAt).toLocaleDateString("en-IN")}`)
          .join("\n");
        return { type: "info", content: `**Your Documents (${list.length} total):**\n${lines}` };
      }
    } catch (err) {
      return { type: "error", content: `❌ ${err?.response?.data?.message || "Failed to fetch data. Please try again."}` };
    }
  }, []);

  // ── Execute collect action (leave application) ────────
  const executeCollect = useCallback(async (action, collected) => {
    try {
      if (action === "APPLY_LEAVE") {
        const payload = {
          leaveType: collected.leaveType, // already sanitized/lowercased
          startDate: collected.startDate,
          endDate:   collected.endDate,
          reason:    (!collected.reason || collected.reason.toLowerCase() === "skip") ? "No reason provided" : collected.reason,
        };
        await agentApplyLeave(payload);
        return {
          type: "success",
          content: `**Leave applied successfully!** ✅\n- Type: **${collected.leaveType}**\n- From: **${collected.startDate}** to **${collected.endDate}**\n\nYour manager will be notified for approval.`,
        };
      }
    } catch (err) {
      return { type: "error", content: err?.response?.data?.message || "Failed to apply leave." };
    }
  }, []);

  // ── Handle collect flow input ─────────────────────────
  // ── Sanitize collected field value ───────────────────
  const sanitizeCollectedValue = (field, value) => {
    // Strip markdown bold/italic markers the user may have typed
    let clean = value.replace(/\*\*/g, "").replace(/\*/g, "").trim();
    // Normalize leave type casing
    if (field === "leaveType") {
      const map = { casual: "casual", sick: "sick", paid: "paid" };
      return map[clean.toLowerCase()] || clean.toLowerCase();
    }
    return clean;
  };

  const handleCollectInput = useCallback(async (userText) => {
    const flow = collectFlow;
    const currentField = flow.fields[flow.currentIndex];
    const sanitized = sanitizeCollectedValue(currentField, userText);
    const updated = { ...flow.collected, [currentField]: sanitized };
    const nextIndex = flow.currentIndex + 1;

    if (nextIndex < flow.fields.length) {
      // Ask next question
      setCollectFlow({ ...flow, collected: updated, currentIndex: nextIndex });
      const nextField    = flow.fields[nextIndex];
      const nextQuestion = flow.questions[nextField];
      addBotMessage(nextQuestion);
    } else {
      // All info collected — execute
      setCollectFlow(null);
      setLoading(true);
      const result = await executeCollect(flow.action, updated);
      setLoading(false);
      addBotMessage(result.type === "success"
        ? "Done! Here's what happened:"
        : "Something went wrong:", result);
    }
  }, [collectFlow, executeCollect]);

  // ── Main send handler ─────────────────────────────────
  const handleSend = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;

    setInput("");
    setError(null);

    // Add user message
    setMessages(prev => [...prev, { role: "user", content: userText, result: null, navigateTo: null }]);

    // If in collect flow, handle it
    if (collectFlow) {
      await handleCollectInput(userText);
      return;
    }

    setLoading(true);

    try {
      const contextMessages = [...messages, { role: "user", content: userText }]
        .slice(-10)
        .map(m => ({ role: m.role, content: m.content }));

      const res    = await sendMessage(contextMessages);
      const reply  = res.data.message;
      const intent = res.data.intent;

      if (!intent) {
        // Plain conversation
        addBotMessage(reply);
        return;
      }

      if (intent.type === "navigate") {
        // Don't use Groq's reply — it hallucinates data for navigate intents
        addBotMessage("Sure! Here's the shortcut:", null, { path: intent.path, label: intent.label });
        return;
      }

      if (intent.type === "instant") {
        // Ignore Groq reply — just confirm and show real result
        addBotMessage(intent.confirm);
        const result = await executeInstant(intent.action);
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            result,
          };
          return updated;
        });
        return;
      }

      if (intent.type === "fetch") {
        // Ignore Groq reply entirely — use confirm message + real API data only
        addBotMessage(intent.confirm);
        const result = await executeFetch(intent.action);
        // Show result card directly under confirm message
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            result,
          };
          return updated;
        });
        return;
      }

      if (intent.type === "collect") {
        const flowDef = COLLECT_FIELDS[intent.action];
        if (!flowDef) { addBotMessage(reply); return; }

        setCollectFlow({
          action:       intent.action,
          fields:       flowDef.fields,
          questions:    flowDef.questions,
          collected:    {},
          currentIndex: 0,
        });
        // Ask first question
        addBotMessage(`Sure! Let me help you with that.\n\n${flowDef.questions[flowDef.fields[0]]}`);
        return;
      }

      addBotMessage(reply);
    } catch (err) {
      setError("Failed to get response. Please try again.");
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleClear = () => {
    setCollectFlow(null);
    const welcome = [{ role: "assistant", content: `Chat cleared! How can I help you, ${firstName}?`, result: null, navigateTo: null }];
    setMessages(welcome);
    setError(null);
    try { localStorage.setItem(storageKey, JSON.stringify(welcome)); } catch { /* ignore */ }
  };

  return (
    <DashboardLayout>
      <div className="ai-page">

        {/* ── Header ── */}
        <div className="ai-header">
          <div className="ai-header__left">
            <div className="ai-avatar-large">✦</div>
            <div>
              <h1 className="ai-title">Smart Assistant</h1>
              <p className="ai-sub">
                Powered by Llama 3.1 ·
                <span className="ai-role-badge">{roleLabel}</span>
                mode · Ask questions or take actions
              </p>
            </div>
          </div>
          <button className="ai-clear-btn" onClick={handleClear}>🗑 Clear Chat</button>
        </div>

        {/* ── Suggestions ── */}
        {messages.length <= 1 && (
          <div className="ai-suggestions">
            <p className="ai-suggestions__label">Try asking</p>
            <div className="ai-suggestions__grid">
              {suggestions.map((s, i) => (
                <button key={i} className="ai-suggestion-btn" onClick={() => handleSend(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {/* ── Collect flow indicator ── */}
        {collectFlow && (
          <div className="ai-collect-indicator">
            📋 Collecting info for: <strong>{collectFlow.action.replace(/_/g, " ")}</strong>
            &nbsp;(step {collectFlow.currentIndex + 1}/{collectFlow.fields.length})
            <button onClick={() => { setCollectFlow(null); addBotMessage("No problem! Let me know if you need anything else."); }}>
              Cancel
            </button>
          </div>
        )}

        {/* ── Chat ── */}
        <div className="ai-chat">
          <div className="ai-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`ai-msg ai-msg--${msg.role === "user" ? "user" : "bot"}`}>
                {msg.role === "assistant" && <div className="ai-msg__avatar">✦</div>}
                <div className="ai-msg__content">
                  <div className={`ai-msg__bubble ai-msg__bubble--${msg.role === "user" ? "user" : "bot"}`}>
                    {msg.role === "assistant"
                      ? <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                      : msg.content}
                  </div>
                  {msg.result     && <ResultCard result={msg.result} />}
                  {msg.navigateTo && (
                    <ActionButton
                      label={msg.navigateTo.label}
                      onClick={() => navigate(msg.navigateTo.path)}
                    />
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="ai-msg__avatar ai-msg__avatar--user">
                    {user?.name?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
              </div>
            ))}
            {loading && <TypingIndicator />}
            {error   && <div className="ai-error">⚠️ {error}</div>}
            <div ref={bottomRef} />
          </div>

          {/* ── Input ── */}
          <div className="ai-input-wrap">
            <textarea
              ref={inputRef}
              className="ai-input"
              placeholder={collectFlow
                ? `Answer: ${collectFlow.questions[collectFlow.fields[collectFlow.currentIndex]]}...`
                : "Ask a question or say 'check in', 'apply for leave', 'show my tasks'..."}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={loading}
            />
            <button
              className="ai-send-btn"
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
            >
              {loading ? <div className="ai-send-spinner" /> : "➤"}
            </button>
          </div>
          <p className="ai-disclaimer">
            Smart Assistant can make mistakes. Verify important HR information with your HR team.
          </p>
        </div>

      </div>
    </DashboardLayout>
  );
}
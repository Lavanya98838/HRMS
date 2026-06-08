import Groq from "groq-sdk";
import Employee from "../models/Employee.model.js";
import { serverError } from "../utils/response.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Intent definitions ────────────────────────────────────
// type: "instant"  → execute immediately, no extra info needed
// type: "collect"  → need more info from user before executing
// type: "navigate" → just navigate to page
// type: "fetch"    → fetch and display data in chat

const INTENTS = {
  // Instant actions
  checkin: {
    type: "instant", action: "CHECKIN",
    label: "Check In", confirm: "Checking you in now...",
  },
  checkout: {
    type: "instant", action: "CHECKOUT",
    label: "Check Out", confirm: "Checking you out now...",
  },

  // Fetch actions — retrieve and show data in chat
  leavebalance: {
    type: "fetch", action: "GET_LEAVE_BALANCE",
    label: "Leave Balance", confirm: "Fetching your leave balance...",
  },
  myleaves: {
    type: "fetch", action: "GET_MY_LEAVES",
    label: "My Leaves", confirm: "Fetching your leave history...",
  },
  myreviews: {
    type: "fetch", action: "GET_MY_REVIEWS",
    label: "My Reviews", confirm: "Fetching your performance reviews...",
  },
  mytasks: {
    type: "fetch", action: "GET_MY_TASKS",
    label: "My Tasks", confirm: "Fetching your tasks...",
  },
  notifications: {
    type: "fetch", action: "GET_NOTIFICATIONS",
    label: "Notifications", confirm: "Fetching your recent notifications...",
  },

  // Collect actions — need more info
  applyleave: {
    type: "collect", action: "APPLY_LEAVE",
    label: "Apply Leave",
    collect: ["leaveType", "startDate", "endDate", "reason"],
    questions: {
      leaveType: "What type of leave? (Casual / Sick / Paid)",
      startDate: "What's the start date? (e.g. 2026-06-10)",
      endDate:   "What's the end date? (e.g. 2026-06-12)",
      reason:    "Any reason you'd like to mention? (or say 'skip')",
    },
  },

  // Fetch actions — new additions
  todayattendance: { type: "fetch", action: "GET_TODAY_ATTENDANCE", label: "Today's Attendance", confirm: "Checking your attendance for today..." },
  myattendance:    { type: "fetch", action: "GET_MY_ATTENDANCE",    label: "My Attendance",       confirm: "Fetching your attendance records..." },
  myshifts:        { type: "fetch", action: "GET_MY_SHIFTS",        label: "My Shifts",           confirm: "Fetching your shift schedule..." },
  mypayroll:       { type: "fetch", action: "GET_MY_PAYROLL",       label: "My Payroll",          confirm: "Fetching your payroll records..." },

  // Navigate actions
  payslip:       { type: "navigate", path: "/payslips",    label: "View My Payslips" },
  payroll:       { type: "navigate", path: "/payroll",     label: "Go to Payroll" },
  attendance:    { type: "navigate", path: "/attendance",  label: "Go to Attendance" },
  profile:       { type: "navigate", path: "/profile",     label: "Go to My Profile" },
  documents:     { type: "fetch",    action: "GET_MY_DOCUMENTS", label: "My Documents", confirm: "Fetching your documents..." },
  shifts:        { type: "navigate", path: "/shifts",      label: "Go to Shifts" },
  announcements: { type: "fetch", action: "GET_ANNOUNCEMENTS", label: "Announcements", confirm: "Fetching latest announcements..." },
  analytics:     { type: "navigate", path: "/analytics",   label: "Go to Analytics" },
  employees:     { type: "navigate", path: "/employees",   label: "Go to Employees" },
  departments:   { type: "navigate", path: "/departments", label: "Go to Departments" },
  roles:         { type: "navigate", path: "/roles",       label: "Go to Roles" },
  performance:   { type: "navigate", path: "/performance", label: "Go to Reviews" },
};

// ── Detect intent from message ────────────────────────────
const detectIntent = (message) => {
  const lower = message.toLowerCase();

  // ── Instant actions ───────────────────────────────────
  if (lower.match(/check.?in|clock.?in|mark.*attend/))               return INTENTS.checkin;
  if (lower.match(/check.?out|clock.?out/))                          return INTENTS.checkout;

  // ── Fetch actions — broad matching ────────────────────
  if (lower.match(/leave.*balance|balance.*leave|how many.*leave|remaining.*leave|days.*left/)) return INTENTS.leavebalance;
  if (lower.match(/what.*leave|my.*leave.*balance|show.*balance/))   return INTENTS.leavebalance;
  if (lower.match(/show.*leave|list.*leave|my.*leave.*history|recent.*leave/)) return INTENTS.myleaves;
  if (lower.match(/show.*notification|my.*notification|recent.*notification|any.*notification/)) return INTENTS.notifications;
  if (lower.match(/show.*task|my.*task|list.*task|what.*task/))      return INTENTS.mytasks;
  if (lower.match(/show.*review|my.*review|performance.*review/))    return INTENTS.myreviews;

  // ── Collect actions ───────────────────────────────────
  if (lower.match(/apply.*leave|request.*leave|take.*leave|need.*leave|want.*leave|book.*leave|i.*want.*leave|leave.*request|submit.*leave/)) return INTENTS.applyleave;

  // ── More fetch actions ───────────────────────────────
  if (lower.match(/did i.*check|today.*attend|attend.*today|my.*status.*today/)) return INTENTS.todayattendance;
  if (lower.match(/my.*attend|attend.*this.*month|attend.*record|attend.*history/)) return INTENTS.myattendance;
  if (lower.match(/my.*shift|this.*week.*shift|shift.*schedule|when.*shift/))    return INTENTS.myshifts;
  if (lower.match(/my.*payroll|my.*salary|last.*month.*pay|payroll.*record/))    return INTENTS.mypayroll;

  // ── Navigate actions ──────────────────────────────────
  if (lower.match(/show.*payslip|my.*payslip|view.*payslip|download.*payslip|payslip/)) return INTENTS.payslip;
  if (lower.match(/payroll|my.*pay(?!slip)/))                        return INTENTS.payroll;
  if (lower.match(/attend(?!ance.*balance)/))                        return INTENTS.attendance;
  if (lower.match(/my.*profile|edit.*profile|update.*profile/))      return INTENTS.profile;
  if (lower.match(/document/))                                       return INTENTS.documents;
  if (lower.match(/shift|schedule/))                                 return INTENTS.shifts;
  if (lower.match(/announcement/))                                   return INTENTS.announcements;
  if (lower.match(/analytic|report|insight/))                        return INTENTS.analytics;
  if (lower.match(/employee.*list|manage.*employee|all.*employee/))  return INTENTS.employees;
  if (lower.match(/department/))                                     return INTENTS.departments;
  if (lower.match(/role|permission/))                                return INTENTS.roles;
  if (lower.match(/review|performance/))                             return INTENTS.performance;

  return null;
};

// ── Portal prefix per role ────────────────────────────────
const getPortalPrefix = (role) => {
  const map = {
    admin: "admin", subadmin: "subadmin",
    hr: "hr", manager: "manager", employee: "employee",
  };
  return map[role] || "employee";
};

// ── Build system prompt ───────────────────────────────────
const buildSystemPrompt = (user, employee) => {
  const basePrompt = `You are Smart Assistant, an intelligent HR assistant for HRMS Portal. You are helpful, professional, concise, and friendly.

Current User: ${user.name}
Role: ${user.role}
${employee ? `Department: ${employee.department?.name || "—"}` : ""}
${employee ? `Employee ID: ${employee.employeeId}` : ""}
Date: ${new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}

HRMS System Info:
- Leave types: Sick (12 days/year), Casual (12 days/year), Paid (15 days/year)
- Attendance: Check-in/out system, late after 11:15 AM
- Payroll: Monthly generation with payslip download
- Performance: Quarterly reviews with star ratings (1-5)

CRITICAL RULES — READ CAREFULLY:
1. NEVER make up, guess, or hallucinate any data — no employee names, leave balances, document names, dates, salaries, task names, review scores, or any specific numbers.
2. When the user asks about their personal data (leave balance, payslips, tasks, documents, notifications, attendance, reviews), respond with ONLY 1 short sentence like "Let me check that for you." The system will fetch the real data automatically.
3. NEVER answer data questions yourself — not even as an example. The system fetches real data from the database.
4. For navigation requests, respond with ONLY "Sure! Here's the shortcut." — nothing else.
5. For general HR policy questions (not personal data), answer normally.
6. NEVER write Action Button, links, markdown URLs, or navigation instructions.`;

  const rolePrompts = {
    admin:    `\nFull system access — employee management, analytics, payroll, compliance, audit logs.`,
    subadmin: `\nCompany-wide visibility — headcount, performance, payroll overview, analytics. No system config.`,
    hr:       `\nHR operations — onboarding, leave approvals, performance reviews, payroll, compliance.`,
    manager:  `\nTeam management — team attendance, leave approvals, task assignment, performance reviews.`,
    employee: `\nPersonal workspace — your leave, attendance, payslips, tasks, and performance reviews only.`,
  };

  return basePrompt + (rolePrompts[user.role] || rolePrompts.employee) + `

Response guidelines:
- Keep responses to 2-4 sentences for simple queries
- Use bullet points for step-by-step instructions
- Be friendly, use first name occasionally
- Never make up specific data — the system fetches real data
- For action confirmations, be brief and positive`;
};

// ── POST /api/ai/chat ─────────────────────────────────────
export const chat = async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: "Messages are required" });
    }

    let employee = null;
    if (["employee", "manager", "hr", "subadmin"].includes(req.user.role)) {
      employee = await Employee.findOne({ user: req.user.id })
        .populate("department", "name")
        .lean();
    }

    const systemPrompt = buildSystemPrompt(req.user, employee);

    // Detect intent from last user message
    const lastUserMsg = messages.filter(m => m.role === "user").pop();
    const intent = lastUserMsg ? detectIntent(lastUserMsg.content) : null;

    // Build portal-aware path for navigate intents
    let responseIntent = null;
    if (intent) {
      const prefix = getPortalPrefix(req.user.role);
      if (intent.type === "navigate") {
        responseIntent = {
          type:   "navigate",
          action: intent.action || "NAVIGATE",
          path:   `/${prefix}${intent.path}`,
          label:  intent.label,
        };
      } else if (intent.type === "instant") {
        responseIntent = {
          type:    "instant",
          action:  intent.action,
          label:   intent.label,
          confirm: intent.confirm,
        };
      } else if (intent.type === "fetch") {
        responseIntent = {
          type:    "fetch",
          action:  intent.action,
          label:   intent.label,
          confirm: intent.confirm,
        };
      } else if (intent.type === "collect") {
        responseIntent = {
          type:     "collect",
          action:   intent.action,
          label:    intent.label,
          collect:  intent.collect,
          questions: intent.questions,
        };
      }
    }

    // Call Groq
    const completion = await groq.chat.completions.create({
      model:       "llama-3.1-8b-instant",
      messages:    [
        { role: "system", content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
      max_tokens:  1024,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content
      || "I'm sorry, I couldn't generate a response. Please try again.";

    return res.json({
      success: true,
      message: reply,
      intent:  responseIntent,
    });
  } catch (error) {
    console.error("AI Chat Error:", error);
    return serverError(res, "Smart Assistant is temporarily unavailable.");
  }
};
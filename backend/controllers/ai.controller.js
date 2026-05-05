import Groq from "groq-sdk";
import Employee from "../models/Employee.model.js";
import { serverError } from "../utils/response.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Build system prompt based on user role ────────────────────
const buildSystemPrompt = (user, employee) => {
  const basePrompt = `You are an intelligent HR Assistant for HRMS Portal, a comprehensive Human Resource Management System. You are helpful, professional, and concise.

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
- Documents: Resume, ID proof, contracts stored securely`;

  const rolePrompts = {
    admin: `\nAs an Admin, you have full system access. You can help with:
- Employee management and HR policies
- System configuration and user management  
- Analytics interpretation and insights
- Compliance and legal HR questions
- Payroll and compensation queries
- Department and role management`,

    hr: `\nAs an HR professional, you can help with:
- Employee onboarding and offboarding procedures
- Leave policies and approval workflows
- Performance review guidance
- Payroll and compensation queries
- HR compliance and legal questions
- Employee relations and conflict resolution`,

    manager: `\nAs a Manager, you can help with:
- Team attendance and leave management
- Performance review guidance for your team
- Goal setting and OKR best practices
- Team productivity insights
- Escalation procedures
- Shift scheduling advice`,

    employee: `\nAs an Employee, I can help you with:
- Your leave balance and how to apply for leave
- Understanding your payslip and salary structure
- Attendance policies and check-in procedures
- Performance review process
- Company policies and HR FAQs
- Document upload and management`,
  };

  return basePrompt + (rolePrompts[user.role] || rolePrompts.employee) + `

Important guidelines:
- Keep responses concise and to the point
- Use bullet points for lists
- Be friendly but professional
- If asked about specific employee data you don't have access to, suggest they check the relevant section in HRMS
- Don't make up specific numbers — refer users to the actual HRMS pages for real data
- Format responses in markdown when helpful`;
};

// ── POST /api/ai/chat ─────────────────────────────────────────
export const chat = async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, message: "Messages are required" });
    }

    // Get employee profile if role is employee/manager
    let employee = null;
    if (["employee", "manager"].includes(req.user.role)) {
      employee = await Employee.findOne({ user: req.user.id })
        .populate("department", "name")
        .lean();
    }

    const systemPrompt = buildSystemPrompt(req.user, employee);

    // Call Groq API
    const completion = await groq.chat.completions.create({
      model:       "llama-3.1-8b-instant",
      messages:    [
        { role: "system", content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
      max_tokens:  1024,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response. Please try again.";

    return res.json({ success: true, message: reply });
  } catch (error) {
    console.error("AI Chat Error:", error);
    return serverError(res, "AI assistant is temporarily unavailable. Please try again.");
  }
};
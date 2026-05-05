# 🎨 HRMS Frontend — Phase 1 Auth UI

## Theme: Bold & Energetic Dark
**Fonts:** Syne (display/headings) + DM Sans (body)
**Colors:** Deep dark base · Violet · Pink · Orange gradients
**Style:** Asymmetric split layout · Animated orbs · Grid texture · Micro-interactions

---

## 🚀 Quick Start

```bash
cd hrms-frontend
npm install
npm run dev
# Opens at http://localhost:3000
```

> Make sure the backend is running on port 5000 first.

---

## 📁 File Structure

```
src/
├── styles/
│   └── globals.css          ← Full design system (CSS vars, animations, components)
├── utils/
│   └── api.js               ← Axios + auto refresh token interceptor
├── context/
│   └── AuthContext.jsx      ← Auth state, session management, 30-min timeout
├── routes/
│   └── ProtectedRoute.jsx   ← Auth guard + role guard
├── components/auth/
│   ├── AuthLayout.jsx       ← Split-panel layout (left: info, right: form)
│   ├── LoginForm.jsx        ← Shared login form (used by all 4 roles)
│   └── RegisterForm.jsx     ← Shared register form (password strength meter)
├── pages/
│   ├── LandingPage.jsx      ← Portal selector (pick your role)
│   ├── ForgotPassword.jsx   ← 3-step OTP flow (send → verify → reset → success)
│   ├── Dashboard.jsx        ← Placeholder dashboard (Phase 2 will replace)
│   ├── admin/index.jsx      ← AdminLogin, AdminRegister
│   ├── hr/index.jsx         ← HRLogin, HRRegister
│   ├── manager/index.jsx    ← ManagerLogin, ManagerRegister
│   └── employee/index.jsx   ← EmployeeLogin, EmployeeRegister
└── App.jsx                  ← All routes wired
```

---

## 🗺️ Routes

| Path | Component | Auth |
|---|---|---|
| `/` | LandingPage (portal selector) | Public |
| `/admin/login` | AdminLogin | Public |
| `/admin/register` | AdminRegister | Public |
| `/admin/dashboard` | Dashboard | Admin only |
| `/hr/login` | HRLogin | Public |
| `/hr/register` | HRRegister | Public |
| `/hr/dashboard` | Dashboard | HR + Admin |
| `/manager/login` | ManagerLogin | Public |
| `/manager/register` | ManagerRegister | Public |
| `/manager/dashboard` | Dashboard | Manager + above |
| `/employee/login` | EmployeeLogin | Public |
| `/employee/register` | EmployeeRegister | Public |
| `/employee/dashboard` | Dashboard | All roles |
| `/forgot-password?role=X` | ForgotPassword | Public |

---

## 🔐 Session Management (AuthContext)

| Feature | Implementation |
|---|---|
| Access token | `sessionStorage` (cleared on tab close) |
| Refresh token | HttpOnly cookie (auto-sent by browser) |
| Auto refresh | Scheduled 2 min before expiry (13 min mark) |
| 30-min timeout | `setTimeout` reset on any user interaction |
| Activity ping | Calls `/api/auth/activity` every 4 min |
| Session restore | On page reload, tries `/api/auth/refresh` silently |

---

## 🎨 Design System (globals.css)

### CSS Variables
```css
--bg-base, --bg-surface, --bg-card, --bg-elevated
--violet, --pink, --orange (brand colors)
--grad-primary (violet → pink → orange gradient)
--font-display: 'Syne'
--font-body: 'DM Sans'
```

### Animation Classes
```
.fade-up   → slide up + fade in
.fade-in   → fade in
.scale-in  → scale from 0.92 + fade in
.delay-1 through .delay-7 → staggered delays
```

### Reusable Components (CSS classes)
```
.auth-page         → split layout container
.auth-panel-left   → left decorative panel
.auth-panel-right  → right form panel
.auth-card         → form card (max-width: 420px)
.field-group       → label + input group
.field-input       → styled text input
.otp-grid          → 6-box OTP input layout
.otp-input         → individual OTP digit box
.btn-primary       → gradient CTA button
.btn-ghost         → subtle outline button
.role-badge        → colored role tag (admin/hr/manager/employee)
.portal-card       → portal selector card
.orb               → blurred radial gradient blob
.grid-pattern      → subtle dot/line grid overlay
.form-error        → red error message box
.form-success      → green success message box
```

---

## 📱 Responsive
- Desktop: Split layout (info left, form right)
- Mobile (<900px): Form only (left panel hidden)
- All inputs are touch-friendly (min 48px height)

---

## 🔄 Adding Phase 2 (Employee Management)
When Phase 2 is ready:
1. Replace `<Dashboard />` placeholder with real dashboard component
2. Add new routes inside the role-specific route groups in `App.jsx`
3. The `AuthContext` and `ProtectedRoute` stay unchanged ✅

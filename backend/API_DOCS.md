# 🔐 HRMS Auth API — Documentation
## Phase 1 | Node.js + Express + MongoDB + JWT

---

## Base URL
```
http://localhost:5000/api
```

---

## 🚀 Quick Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure .env (copy from .env.example)
cp .env.example .env
# → Fill in MONGO_URI, JWT secrets, Gmail credentials

# 3. Create admin account (run once)
node utils/seedAdmin.js

# 4. Start development server
npm run dev
```

---

## 📡 API Endpoints

### 🔓 Public Routes (No Auth Required)

---

#### POST `/api/auth/register`
Register a new HR / Manager / Employee account.
> Admin accounts are created via seeder only.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@company.com",
  "password": "SecurePass123",
  "role": "employee"
}
```
**Roles allowed:** `hr` | `manager` | `employee`

**Response (201):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "user": { "_id": "...", "name": "John Doe", "role": "employee", ... },
    "accessToken": "eyJhbGci..."
  }
}
```
> Refresh token is automatically set as HttpOnly cookie.

---

#### POST `/api/auth/login`
Login with role-specific portal.

**Request Body:**
```json
{
  "email": "john@company.com",
  "password": "SecurePass123",
  "role": "employee"
}
```
> `role` must match the account's actual role, otherwise login is rejected.

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "accessToken": "eyJhbGci...",
    "sessionTimeout": 1800000
  }
}
```

---

#### POST `/api/auth/refresh`
Silently refresh the access token using the HttpOnly cookie.
> No body needed. Browser sends cookie automatically.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "sessionTimeout": 1800000
  }
}
```

---

#### POST `/api/auth/forgot-password`
Send OTP to registered email.

**Request Body:**
```json
{ "email": "john@company.com" }
```

**Response (200):**
```json
{
  "success": true,
  "message": "If an account with this email exists, an OTP has been sent."
}
```
> Always returns 200 (security: doesn't reveal if email exists)

---

#### POST `/api/auth/verify-otp`
Verify the OTP received via email.

**Request Body:**
```json
{
  "email": "john@company.com",
  "otp": "482910"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": { "resetToken": "eyJhbGci..." }
}
```

---

#### POST `/api/auth/reset-password`
Reset password using verified OTP.

**Request Body:**
```json
{
  "email": "john@company.com",
  "otp": "482910",
  "newPassword": "NewSecurePass456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset successful. Please login with your new password."
}
```

---

### 🔒 Protected Routes (Auth Required)
> All protected routes need: `Authorization: Bearer <accessToken>`

---

#### POST `/api/auth/logout`
Logout and invalidate session.

**Response (200):**
```json
{ "success": true, "message": "Logged out successfully" }
```

---

#### GET `/api/auth/me`
Get current logged-in user's profile.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "...",
      "name": "John Doe",
      "email": "john@company.com",
      "role": "employee",
      "isActive": true,
      "lastLogin": "2024-01-15T10:30:00Z"
    }
  }
}
```

---

#### POST `/api/auth/activity`
Update last activity timestamp (called every few minutes by frontend to maintain session).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "lastActivity": "2024-01-15T10:35:00Z",
    "sessionTimeout": 1800000
  }
}
```

---

## 🔐 Role Hierarchy

```
Admin (level 4)    → Full access to everything
  ↓
HR (level 3)       → Manage employees, payroll, leaves
  ↓
Manager (level 2)  → View team, approve leaves, performance
  ↓
Employee (level 1) → Self-service only (own profile, own leave)
```

---

## ⏱️ Session & Token Strategy

| Token | Expiry | Storage |
|---|---|---|
| Access Token | 15 minutes | Memory (frontend state) |
| Refresh Token | 7 days | HttpOnly Cookie |
| OTP | 10 minutes | MongoDB |
| Session Timeout | 30 minutes | Server-side check |

### Flow:
1. Login → get access token (15 min) + refresh token cookie (7 days)
2. Every API call → send `Authorization: Bearer <accessToken>`
3. Access token expires → call `/api/auth/refresh` → get new access token
4. Tab closed > 30 min → next request fails → redirect to login
5. Logout → refresh token invalidated in DB + cookie cleared

---

## 🔄 Switching from Gmail to SendGrid (Future)

1. `npm install @sendgrid/mail`
2. Update `.env`:
   ```
   EMAIL_SERVICE=sendgrid
   SENDGRID_API_KEY=SG.xxxxxxxxxx
   ```
3. Update `utils/mailer.js` — replace `createGmailTransporter()` with:
   ```js
   import sgMail from "@sendgrid/mail";
   sgMail.setApiKey(process.env.SENDGRID_API_KEY);
   ```
4. Nothing else changes ✅

---

## 🛡️ Security Features

- ✅ Passwords hashed with bcrypt (salt rounds: 12)
- ✅ JWT access tokens (15 min expiry)
- ✅ Refresh tokens rotated on every use
- ✅ Refresh token stored in HttpOnly cookie (XSS safe)
- ✅ CORS configured with credentials
- ✅ Rate limiting on login (10 attempts / 15 min)
- ✅ Rate limiting on OTP (3 requests / 10 min)
- ✅ Role-based access control (RBAC)
- ✅ Role hierarchy enforcement
- ✅ 30-minute inactivity timeout
- ✅ Admin accounts protected from public registration
- ✅ OTP expiry + attempt limiting

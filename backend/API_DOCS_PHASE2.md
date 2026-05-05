# 📡 HRMS Phase 2 API — Documentation
## Employee, Department & Role Management

---

## 🚀 New Packages to Install

```bash
cd backend
npm install cloudinary multer multer-storage-cloudinary csv-parse
```

---

## ☁️ Cloudinary Setup (5 minutes)

1. Go to **https://cloudinary.com** → Sign up free
2. Dashboard → Copy: Cloud Name, API Key, API Secret
3. Add to your `.env`:
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## 📁 New Files to Add to Backend

```
models/
  Department.model.js    ← copy from phase2-backend
  Role.model.js          ← copy from phase2-backend
  Employee.model.js      ← copy from phase2-backend

controllers/
  department.controller.js ← copy from phase2-backend
  role.controller.js       ← copy from phase2-backend
  employee.controller.js   ← copy from phase2-backend

routes/
  department.routes.js   ← copy from phase2-backend
  role.routes.js         ← copy from phase2-backend
  employee.routes.js     ← copy from phase2-backend

utils/
  employeeId.js          ← copy from phase2-backend
  cloudinary.js          ← copy from phase2-backend
  csvParser.js           ← copy from phase2-backend
  seedDepartments.js     ← copy from phase2-backend
```

Update `server.js` with the 3 new route imports + registrations.

---

## 📡 Department Endpoints

### GET `/api/departments`
Get all departments.
**Query:** `?isActive=true&search=engineering`

### GET `/api/departments/:id`
Get department + its employees.

### POST `/api/departments` *(Admin, HR)*
```json
{
  "name": "Engineering",
  "code": "ENG",
  "description": "Software development team",
  "head": "userId (optional)"
}
```

### PUT `/api/departments/:id` *(Admin, HR)*
Update any field.

### DELETE `/api/departments/:id` *(Admin only)*
Fails if department has active employees.

---

## 📡 Role Endpoints

### GET `/api/roles`
**Query:** `?department=deptId&isActive=true&search=manager`

### POST `/api/roles` *(Admin, HR)*
```json
{
  "name": "Senior Developer",
  "department": "deptId (optional)",
  "level": 6,
  "description": "Senior software engineer role"
}
```

### PUT `/api/roles/:id` *(Admin, HR)*
### DELETE `/api/roles/:id` *(Admin only)*

---

## 📡 Employee Endpoints

### GET `/api/employees`
**Query params:**
```
search=john         → search name/email/ID
department=id       → filter by department
role=id             → filter by role
employmentType=full_time|part_time|contract|intern
isActive=true|false
page=1
limit=10
sortBy=createdAt
sortOrder=desc|asc
```

### GET `/api/employees/:id`
Full employee profile with documents.

### POST `/api/employees` *(Admin, HR)*
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@company.com",
  "phone": "9876543210",
  "department": "deptId",
  "role": "roleId",
  "designation": "Senior Developer",
  "employmentType": "full_time",
  "dateOfJoining": "2026-01-15",
  "dateOfBirth": "1995-06-20",
  "gender": "male",
  "address": {
    "street": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India",
    "pincode": "400001"
  },
  "salary": {
    "basic": 50000,
    "hra": 20000,
    "allowances": 5000,
    "deductions": 2000
  },
  "emergencyContact": {
    "name": "Jane Doe",
    "relationship": "Spouse",
    "phone": "9876543211"
  }
}
```

**Response includes login credentials:**
```json
{
  "employee": { ... },
  "loginCredentials": {
    "email": "john.doe@company.com",
    "password": "HRMS@2026",
    "note": "Share these credentials securely"
  }
}
```

### PUT `/api/employees/:id`
- HR/Admin: update all fields
- Employee: update only phone, address, emergencyContact, dateOfBirth, gender

### DELETE `/api/employees/:id` *(Admin only)*

### POST `/api/employees/:id/avatar`
**Form-data:** `avatar` (image file, max 5MB)

### POST `/api/employees/:id/documents`
**Form-data:**
- `document` (file, max 10MB)
- `name` (string, required)
- `type` (resume|id_proof|contract|certificate|other)

### DELETE `/api/employees/:id/documents/:docId`

### GET `/api/employees/csv-template` *(Admin, HR)*
Downloads a CSV template file.

### POST `/api/employees/bulk-upload` *(Admin, HR)*
**Form-data:** `file` (CSV file)

**CSV Columns:**
```
firstName, lastName, email, phone, department, designation,
employmentType, gender, dateOfJoining, basic, hra, allowances, deductions
```

**Response:**
```json
{
  "summary": {
    "total": 50,
    "created": 45,
    "skipped": 3,
    "failed": 2
  },
  "results": {
    "created": [{ "employeeId": "HRMS-2026-001", "email": "...", "password": "..." }],
    "skipped": [{ "email": "...", "reason": "Email already exists" }],
    "failed":  [{ "email": "...", "reason": "..." }]
  }
}
```

---

## 🔐 Access Control Summary

| Action | Admin | HR | Manager | Employee |
|---|---|---|---|---|
| List employees | ✅ All | ✅ All | ✅ Own dept | ❌ |
| View employee | ✅ | ✅ | ✅ | ✅ Own only |
| Create employee | ✅ | ✅ | ❌ | ❌ |
| Update employee | ✅ | ✅ | ❌ | ✅ Own (limited) |
| Delete employee | ✅ | ❌ | ❌ | ❌ |
| Departments | ✅ CRUD | ✅ CRUD | 👁️ Read | ❌ |
| Roles | ✅ CRUD | ✅ CRUD | 👁️ Read | ❌ |
| Bulk upload | ✅ | ✅ | ❌ | ❌ |
| Upload avatar | ✅ | ✅ | ❌ | ✅ Own |
| Upload docs | ✅ | ✅ | ❌ | ✅ Own |

---

## ▶️ Run the Seeder

```bash
node utils/seedDepartments.js
```

Seeds 10 departments and 27 roles automatically.

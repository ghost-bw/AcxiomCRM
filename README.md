# AcxiomCRM – Production-Ready Full-Stack Enterprise CRM Application

**AcxiomCRM** is a centralized, enterprise-grade Customer Relationship Management (CRM) web application engineered to manage the complete customer and sales lifecycle: prospective lead generation, qualification, customer onboarding, opportunity pipeline tracking, follow-ups, communication activities, business analytics, and audit logging.

Built with pure **JavaScript & JSX** across both frontend and backend using **Node.js, Express.js, MongoDB (Mongoose), React, and Tailwind CSS**.

---

## 🚀 Key Highlights & Architectural Strengths

- **100% Dynamic Data**: All KPIs, charts, pipeline metrics, reports, and activity feeds are computed in real time from MongoDB. Zero hardcoded business data.
- **Strict Server-Side RBAC & Data Isolation**:
  - **Admin**: Full organization-wide visibility, system configuration, audit logs, and user management.
  - **Manager**: Team-scoped visibility across assigned and subordinate sales executives' accounts, deals, and reports.
  - **Sales Executive**: Strictly assigned accounts, deals, follow-ups, and personal pipeline. Protected against IDOR (Insecure Direct Object Reference).
- **Mandatory Business Validation Enforcement**:
  - Opportunity Amount must be greater than zero (`Amount > 0`).
  - Probability must be bounded between `0` and `100` inclusive.
  - Expected Close Date cannot be in the past for active opportunities.
  - Planned Follow-Up date cannot be earlier than today.
  - Customer/Lead email and phone uniqueness with duplicate creation prevention.
- **Enterprise Security Suite**:
  - Adaptive password hashing with `bcryptjs` (salt factor 12).
  - Password complexity policy: min 8 characters, uppercase, lowercase, number, and special character (`@$!%*?&_-#`).
  - **Account Lockout Policy**: Tracks failed logins; locks account automatically for 15 minutes after 5 consecutive failed attempts.
  - Protected API endpoints using JWT authentication with refresh token rotation and HTTP-only cookie support.
  - Security headers powered by `Helmet` and request rate limiting.
- **Append-Only Audit Logging**:
  - Automatically records all critical events: `LOGIN`, `LOGIN_FAILED`, `LOGOUT`, `CREATE`, `UPDATE`, `DELETE`, `CONVERT`, `STAGE_CHANGE`, `RESCHEDULE`, `ROLE_CHANGE`, `LOCKOUT`, `UNLOCK`.
  - Captures actor email, role, IP address, timestamp, old state, and new state.
- **8 Dynamic Reports with CSV Export**:
  - Customer Report, Lead Report, Follow-Up Report, Opportunity Report, Pipeline Report, Sales Conversion Report, User Activity Report, and Audit Log Report.
- **1-Click Evaluation Switcher**:
  - Quick-login buttons on the login screen and role switcher banner in the top navigation bar allow instant evaluation of Admin, Manager, and Sales Executive perspectives without manual password re-entry.

---

## 📂 Project Structure

```
Acxiom/
├── backend/
│   ├── src/
│   │   ├── config/          # DB connection & environment configuration
│   │   ├── constants/       # Roles, stages, statuses, audit action enums
│   │   ├── controllers/     # Modular Express controllers for all CRM modules
│   │   ├── middlewares/     # Auth, RBAC, Zod validation, rateLimiter, error handling
│   │   ├── models/          # Mongoose models (User, Customer, Lead, Opportunity, FollowUp, Activity, AuditLog, Notification)
│   │   ├── routes/          # RESTful versioned endpoints (/api/v1/...)
│   │   ├── scripts/         # Realistic enterprise seed script
│   │   ├── services/        # Business logic & database transactions
│   │   ├── tests/           # Automated test suite (20 passing tests)
│   │   ├── utils/           # Password hashing, JWT token utils, standardized apiResponse
│   │   ├── app.js           # Express app setup, CORS, Helmet, routes
│   │   └── server.js        # Server listener and graceful shutdown
│   ├── .env                 # Environment variables
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios client with automatic bearer & refresh token interceptors
│   │   ├── components/      # Common UI (Button, Input, Select, Modal, ConfirmDialog, Badge, StatCard, Skeleton, Pagination, EmptyState)
│   │   ├── components/layout/ # Enterprise AppLayout, collapsible Sidebar, Header with Role Switcher
│   │   ├── components/notifications/ # Notification bell and dropdown center
│   │   ├── context/         # AuthContext with persistent login & 1-click evaluation switcher
│   │   ├── pages/           # Pure JSX pages for all 11 modules:
│   │   │   ├── auth/        # Login, Register, Forgot Password, Reset Password
│   │   │   ├── dashboard/   # Dynamic KPI cards, Recharts visualizations, actionable follow-ups
│   │   │   ├── customers/   # Customer CRUD, search, filter, 360° detail drawer
│   │   │   ├── leads/       # Lead capture, status & priority, Lead Conversion Modal
│   │   │   ├── opportunities/ # Table View & Kanban Pipeline Board, weighted calculations
│   │   │   ├── followups/   # Follow-up scheduling, overdue detection, rescheduling
│   │   │   ├── activities/  # Communication history log (Call, Meeting, Email, Task)
│   │   │   ├── users/       # User administration, role assignment, lockout unlock
│   │   │   ├── audit/       # Immutable audit trail with payload diff modal
│   │   │   ├── reports/     # 8 enterprise reports with date filters and CSV export
│   │   │   └── settings/    # Profile view, password change with policy validation
│   │   ├── App.jsx          # Protected and Role-based React Router setup
│   │   ├── index.css        # Tailwind CSS imports and custom scrollbar
│   │   └── main.jsx         # React DOM root with React Query and Sonner notifications
│   ├── vite.config.js       # Vite configuration with proxy to port 5000
│   └── package.json
│
├── README.md
└── package.json             # Root workspace runner scripts
```

---

## 🔑 Pre-Configured Test Accounts

The system includes pre-seeded realistic enterprise demo accounts:

| Role | Email Address | Password | Permissions & Visibility |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@acxiomcrm.com` | `Admin@12345` | Full organization-wide access, user management, audit logs, all reports |
| **Manager** | `manager@acxiomcrm.com` | `Manager@12345` | Team-scoped access, team pipeline, team reports, audit viewer |
| **Sales Executive 1** | `sales1@acxiomcrm.com` | `Sales@12345` | Assigned customers, leads, opportunities, follow-ups |
| **Sales Executive 2** | `sales2@acxiomcrm.com` | `Sales@12345` | Assigned customers, leads, opportunities, follow-ups |

*Tip: You can click the **Admin**, **Manager**, or **Sales Exec** quick-login buttons on the login screen or in the top navigation bar to switch personas instantly.*

---

## 📦 Installation & Setup Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **MongoDB**: Running locally on `mongodb://localhost:27017` (or provide connection URI in `backend/.env`)

### 2. Configure Environment Variables
Verify or create `backend/.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/acxiomcrm
JWT_ACCESS_SECRET=acxiom_crm_super_secret_jwt_access_token_key_2026
JWT_REFRESH_SECRET=acxiom_crm_super_secret_jwt_refresh_token_key_2026
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
LOCKOUT_ATTEMPTS_LIMIT=5
LOCKOUT_DURATION_MINUTES=15
```

### 3. Seed Database with Realistic Data
Populate demo users, enterprise accounts, prospective leads, pipeline opportunities, follow-ups, and audit history:
```bash
npm run seed
```

### 4. Run Development Servers
Open two terminal windows:

**Backend API (Port 5000):**
```bash
npm run dev:backend
```

**Frontend React Web App (Port 5173):**
```bash
npm run dev:frontend
```

Now open **http://localhost:5173** in your browser.

---

## 🧪 Automated Testing

AcxiomCRM includes a dedicated automated test suite verifying all 20 acceptance and security criteria:
```bash
npm run test
```

### Verified Test Cases:
1. `✓ Health check endpoint returns 200 healthy`
2. `✓ Admin valid login succeeds and returns JWT`
3. `✓ Sales Executive valid login succeeds`
4. `✓ Invalid password is rejected with 401 Unauthorized`
5. `✓ Account lockout triggered after 5 consecutive failed login attempts (Status 423 Locked)`
6. `✓ Opportunity Amount <= 0 is rejected with 400 Bad Request`
7. `✓ Opportunity Probability > 100 is rejected with 400 Bad Request`
8. `✓ Active Opportunity with past Expected Close Date is rejected with 400`
9. `✓ Planned Follow-Up with past date is rejected with 400`
10. `✓ Customer with invalid email format is rejected with 400`
11. `✓ Duplicate Customer email is rejected with 409 Conflict`
12. `✓ Anonymous request to protected route is rejected with 401`
13. `✓ Sales Executive cannot access User Management (403 Forbidden)`
14. `✓ Sales Executive cannot access Audit Logs Report (403 Forbidden)`
15. `✓ Admin can access User Management (200 OK)`
16. `✓ Lead created successfully for conversion test`
17. `✓ Lead successfully converted to Customer and Opportunity with Converted status`
18. `✓ Audit log recorded the lead conversion event accurately`
19. `✓ Customer Report CSV export returns proper CSV headers and records`
20. `✓ Dashboard returns dynamic database-calculated KPI metrics and chart datasets`

---

## 📋 Complete Functional Modules

1. **Authentication & Authorization**: Registration, Login, Logout, JWT Refresh token rotation, Account Lockout after 5 failed attempts, Password Reset, Password Change, Inactive user blocking.
2. **Dynamic Dashboard**: 8 KPI cards, Lead status distribution chart, Opportunity pipeline stage chart, Monthly sales growth chart, actionable upcoming & overdue follow-ups.
3. **Customer Management**: Code auto-generation (`CUST-XXXX`), duplicate email/phone prevention, 360° customer detail drawer with related deals, follow-ups, and activities.
4. **Lead Management & Conversion**: Complete lifecycle (`New`, `Contacted`, `Qualified`, `Unqualified`, `Converted`, `Lost`), Lead Conversion Workflow graduating prospects to active Customers and Opportunities.
5. **Opportunity Management**: Amount > 0 and probability 0-100 enforcement, future close date validation, Table View + Visual Kanban Pipeline Stages View, real-time Weighted Pipeline calculation.
6. **Follow-Up Management**: Schedule future check-ins (no past dates for planned), overdue task detection, reschedule audit trail, mark as completed with remarks.
7. **Activity Management**: Log calls, meetings, emails, and tasks; filter by channel and status.
8. **User & Role Management (Admin)**: Full user CRUD, role assignment, active/deactivate toggle, account unlock button.
9. **Audit Trail**: Immutable recording of all system and business actions with full JSON diff viewer.
10. **REST API**: Consistent REST response schema `{ success, message, data, meta, errors }` across all endpoints with proper status codes.
11. **Reports Hub**: 8 distinct business reports with date filtering and instant CSV exports.

---

## 🛡️ License & Engineering Standard

Engineered to professional software standards adhering to SOLID principles, separation of concerns, defensive security measures, and responsive UI design.

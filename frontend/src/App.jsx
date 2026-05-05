import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, RoleRoute } from './routes/ProtectedRoute';

// ── Auth Pages ───────────────────────────────────────────
import LoginPage      from './pages/auth/LoginPage';
import ForgotPassword from './pages/ForgotPassword';
import SetupAccount   from './pages/SetupAccount';

// ── Layouts ──────────────────────────────────────────────
import AdminLayout    from './layouts/AdminLayout';
import SubAdminLayout from './layouts/SubAdminLayout';
import HRLayout       from './layouts/HRLayout';
import ManagerLayout  from './layouts/ManagerLayout';
import EmployeeLayout from './layouts/EmployeeLayout';

// ── Shared Pages ─────────────────────────────────────────
import DashboardHome        from './pages/DashboardHome';
import EmployeesPage        from './pages/employees/EmployeesPage';
import EmployeeProfile      from './pages/employees/EmployeeProfile';
import DepartmentsPage      from './pages/departments/DepartmentsPage';
import RolesPage            from './pages/roles/RolesPage';
import AttendancePage       from './pages/attendance/AttendancePage';
import LeavePage            from './pages/leave/LeavePage';
import MyPayslips           from './pages/payroll/MyPayslips';
import PayrollManagement    from './pages/payroll/PayrollManagement';
import AnalyticsDashboard   from './pages/analytics/AnalyticsDashboard';
import NotificationsPage    from './pages/notifications/NotificationsPage';
import DocumentsPage        from './pages/documents/DocumentsPage';
import PerformanceReviewPage from './pages/performance/PerformanceReviewPage';
import ShiftSchedulePage    from './pages/shifts/ShiftSchedulePage';
import AnnouncementsPage    from './pages/announcements/AnnouncementsPage';
import GoalsPage            from './pages/goals/GoalsPage';
import AuditLogsPage        from './pages/admin/AuditLogsPage';
import PredictiveAnalyticsPage from './pages/admin/PredictiveAnalyticsPage';
import AIAssistantPage      from './pages/AIAssistantPage';

// ── Toast config ─────────────────────────────────────────
const toastConfig = {
  position: 'top-right',
  toastOptions: {
    style: {
      background: 'var(--bg-elevated)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border)',
      fontFamily: 'var(--font-body)',
      fontSize: 14,
    },
    success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
    error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
  },
};

// ── Route wrapper helpers ─────────────────────────────────
// Each portal wraps its pages in its own Layout + ProtectedRoute + RoleRoute
const AdminPage = ({ children }) => (
  <ProtectedRoute>
    <RoleRoute allowedPortals={['admin']}>
      <AdminLayout>{children}</AdminLayout>
    </RoleRoute>
  </ProtectedRoute>
);

const SubAdminPage = ({ children }) => (
  <ProtectedRoute>
    <RoleRoute allowedPortals={['subadmin']}>
      <SubAdminLayout>{children}</SubAdminLayout>
    </RoleRoute>
  </ProtectedRoute>
);

const HRPage = ({ children }) => (
  <ProtectedRoute>
    <RoleRoute allowedPortals={['hr', 'admin']}>
      <HRLayout>{children}</HRLayout>
    </RoleRoute>
  </ProtectedRoute>
);

const ManagerPage = ({ children }) => (
  <ProtectedRoute>
    <RoleRoute allowedPortals={['manager', 'admin', 'hr']}>
      <ManagerLayout>{children}</ManagerLayout>
    </RoleRoute>
  </ProtectedRoute>
);

const EmployeePage = ({ children }) => (
  <ProtectedRoute>
    <RoleRoute allowedPortals={['employee', 'admin', 'hr', 'manager']}>
      <EmployeeLayout>{children}</EmployeeLayout>
    </RoleRoute>
  </ProtectedRoute>
);

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster {...toastConfig} />
        <Routes>

          {/* ── Public ── */}
          <Route path="/login"           element={<LoginPage />} />
          <Route path="/forgot-password"  element={<ForgotPassword />} />
          <Route path="/setup-account"     element={<SetupAccount />} />

          {/* Legacy routes — redirect old portal-specific logins to unified login */}
          <Route path="/"                  element={<Navigate to="/login" replace />} />
          <Route path="/admin/login"       element={<Navigate to="/login" replace />} />
          <Route path="/hr/login"          element={<Navigate to="/login" replace />} />
          <Route path="/manager/login"     element={<Navigate to="/login" replace />} />
          <Route path="/employee/login"    element={<Navigate to="/login" replace />} />
          <Route path="/admin/register"    element={<Navigate to="/login" replace />} />
          <Route path="/hr/register"       element={<Navigate to="/login" replace />} />
          <Route path="/manager/register"  element={<Navigate to="/login" replace />} />
          <Route path="/employee/register" element={<Navigate to="/login" replace />} />

          {/* ── ADMIN PORTAL ── */}
          <Route path="/admin/dashboard"     element={<AdminPage><DashboardHome /></AdminPage>} />
          <Route path="/admin/employees"     element={<AdminPage><EmployeesPage /></AdminPage>} />
          <Route path="/admin/employees/:id" element={<AdminPage><EmployeeProfile /></AdminPage>} />
          <Route path="/admin/departments"   element={<AdminPage><DepartmentsPage /></AdminPage>} />
          <Route path="/admin/roles"         element={<AdminPage><RolesPage /></AdminPage>} />
          <Route path="/admin/attendance"    element={<AdminPage><AttendancePage /></AdminPage>} />
          <Route path="/admin/leave"         element={<AdminPage><LeavePage /></AdminPage>} />
          <Route path="/admin/payroll"       element={<AdminPage><PayrollManagement /></AdminPage>} />
          <Route path="/admin/analytics"     element={<AdminPage><AnalyticsDashboard /></AdminPage>} />
          <Route path="/admin/notifications" element={<AdminPage><NotificationsPage /></AdminPage>} />
          <Route path="/admin/documents"     element={<AdminPage><DocumentsPage /></AdminPage>} />
          <Route path="/admin/performance"   element={<AdminPage><PerformanceReviewPage /></AdminPage>} />
          <Route path="/admin/shifts"        element={<AdminPage><ShiftSchedulePage /></AdminPage>} />
          <Route path="/admin/announcements" element={<AdminPage><AnnouncementsPage /></AdminPage>} />
          <Route path="/admin/goals"         element={<AdminPage><GoalsPage /></AdminPage>} />
          <Route path="/admin/audit-logs"    element={<AdminPage><AuditLogsPage /></AdminPage>} />
          <Route path="/admin/predictive"    element={<AdminPage><PredictiveAnalyticsPage /></AdminPage>} />
          <Route path="/admin/ai-assistant"  element={<AdminPage><AIAssistantPage /></AdminPage>} />

          {/* ── SUB-ADMIN PORTAL ── */}
          <Route path="/subadmin/dashboard"     element={<SubAdminPage><DashboardHome /></SubAdminPage>} />
          <Route path="/subadmin/employees"     element={<SubAdminPage><EmployeesPage /></SubAdminPage>} />
          <Route path="/subadmin/employees/:id" element={<SubAdminPage><EmployeeProfile /></SubAdminPage>} />
          <Route path="/subadmin/departments"   element={<SubAdminPage><DepartmentsPage /></SubAdminPage>} />
          <Route path="/subadmin/roles"         element={<SubAdminPage><RolesPage /></SubAdminPage>} />
          <Route path="/subadmin/attendance"    element={<SubAdminPage><AttendancePage /></SubAdminPage>} />
          <Route path="/subadmin/leave"         element={<SubAdminPage><LeavePage /></SubAdminPage>} />
          <Route path="/subadmin/payroll"       element={<SubAdminPage><PayrollManagement /></SubAdminPage>} />
          <Route path="/subadmin/analytics"     element={<SubAdminPage><AnalyticsDashboard /></SubAdminPage>} />
          <Route path="/subadmin/predictive"    element={<SubAdminPage><PredictiveAnalyticsPage /></SubAdminPage>} />
          <Route path="/subadmin/notifications" element={<SubAdminPage><NotificationsPage /></SubAdminPage>} />
          <Route path="/subadmin/documents"     element={<SubAdminPage><DocumentsPage /></SubAdminPage>} />
          <Route path="/subadmin/performance"   element={<SubAdminPage><PerformanceReviewPage /></SubAdminPage>} />
          <Route path="/subadmin/shifts"        element={<SubAdminPage><ShiftSchedulePage /></SubAdminPage>} />
          <Route path="/subadmin/announcements" element={<SubAdminPage><AnnouncementsPage /></SubAdminPage>} />
          <Route path="/subadmin/goals"         element={<SubAdminPage><GoalsPage /></SubAdminPage>} />
          <Route path="/subadmin/audit-logs"    element={<SubAdminPage><AuditLogsPage /></SubAdminPage>} />
          <Route path="/subadmin/ai-assistant"  element={<SubAdminPage><AIAssistantPage /></SubAdminPage>} />

          {/* ── HR PORTAL ── */}
          <Route path="/hr/dashboard"     element={<HRPage><DashboardHome /></HRPage>} />
          <Route path="/hr/employees"     element={<HRPage><EmployeesPage /></HRPage>} />
          <Route path="/hr/employees/:id" element={<HRPage><EmployeeProfile /></HRPage>} />
          <Route path="/hr/departments"   element={<HRPage><DepartmentsPage /></HRPage>} />
          <Route path="/hr/roles"         element={<HRPage><RolesPage /></HRPage>} />
          <Route path="/hr/attendance"    element={<HRPage><AttendancePage /></HRPage>} />
          <Route path="/hr/leave"         element={<HRPage><LeavePage /></HRPage>} />
          <Route path="/hr/payroll"       element={<HRPage><PayrollManagement /></HRPage>} />
          <Route path="/hr/analytics"     element={<HRPage><AnalyticsDashboard /></HRPage>} />
          <Route path="/hr/notifications" element={<HRPage><NotificationsPage /></HRPage>} />
          <Route path="/hr/documents"     element={<HRPage><DocumentsPage /></HRPage>} />
          <Route path="/hr/performance"   element={<HRPage><PerformanceReviewPage /></HRPage>} />
          <Route path="/hr/shifts"        element={<HRPage><ShiftSchedulePage /></HRPage>} />
          <Route path="/hr/announcements" element={<HRPage><AnnouncementsPage /></HRPage>} />
          <Route path="/hr/goals"         element={<HRPage><GoalsPage /></HRPage>} />
          <Route path="/hr/ai-assistant"  element={<HRPage><AIAssistantPage /></HRPage>} />

          {/* ── MANAGER PORTAL ── */}
          <Route path="/manager/dashboard"     element={<ManagerPage><DashboardHome /></ManagerPage>} />
          <Route path="/manager/employees"     element={<ManagerPage><EmployeesPage /></ManagerPage>} />
          <Route path="/manager/employees/:id" element={<ManagerPage><EmployeeProfile /></ManagerPage>} />
          <Route path="/manager/attendance"    element={<ManagerPage><AttendancePage /></ManagerPage>} />
          <Route path="/manager/leave"         element={<ManagerPage><LeavePage /></ManagerPage>} />
          <Route path="/manager/notifications" element={<ManagerPage><NotificationsPage /></ManagerPage>} />
          <Route path="/manager/documents"     element={<ManagerPage><DocumentsPage /></ManagerPage>} />
          <Route path="/manager/performance"   element={<ManagerPage><PerformanceReviewPage /></ManagerPage>} />
          <Route path="/manager/shifts"        element={<ManagerPage><ShiftSchedulePage /></ManagerPage>} />
          <Route path="/manager/announcements" element={<ManagerPage><AnnouncementsPage /></ManagerPage>} />
          <Route path="/manager/goals"         element={<ManagerPage><GoalsPage /></ManagerPage>} />
          <Route path="/manager/ai-assistant"  element={<ManagerPage><AIAssistantPage /></ManagerPage>} />

          {/* ── EMPLOYEE PORTAL ── */}
          <Route path="/employee/dashboard"     element={<EmployeePage><DashboardHome /></EmployeePage>} />
          <Route path="/employee/profile"       element={<EmployeePage><EmployeeProfile /></EmployeePage>} />
          <Route path="/employee/attendance"    element={<EmployeePage><AttendancePage /></EmployeePage>} />
          <Route path="/employee/leave"         element={<EmployeePage><LeavePage /></EmployeePage>} />
          <Route path="/employee/payslips"      element={<EmployeePage><MyPayslips /></EmployeePage>} />
          <Route path="/employee/notifications" element={<EmployeePage><NotificationsPage /></EmployeePage>} />
          <Route path="/employee/documents"     element={<EmployeePage><DocumentsPage /></EmployeePage>} />
          <Route path="/employee/performance"   element={<EmployeePage><PerformanceReviewPage /></EmployeePage>} />
          <Route path="/employee/shifts"        element={<EmployeePage><ShiftSchedulePage /></EmployeePage>} />
          <Route path="/employee/announcements" element={<EmployeePage><AnnouncementsPage /></EmployeePage>} />
          <Route path="/employee/goals"         element={<EmployeePage><GoalsPage /></EmployeePage>} />
          <Route path="/employee/ai-assistant"  element={<EmployeePage><AIAssistantPage /></EmployeePage>} />

          {/* ── 404 ── */}
          <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
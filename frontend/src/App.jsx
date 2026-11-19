import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { AppLayout } from './components/layout/AppLayout.jsx';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage.jsx';
import { RegisterPage } from './pages/auth/RegisterPage.jsx';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage.jsx';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage.jsx';

// Main App Pages
import { DashboardPage } from './pages/dashboard/DashboardPage.jsx';
import { CustomersPage } from './pages/customers/CustomersPage.jsx';
import { LeadsPage } from './pages/leads/LeadsPage.jsx';
import { OpportunitiesPage } from './pages/opportunities/OpportunitiesPage.jsx';
import { FollowUpsPage } from './pages/followups/FollowUpsPage.jsx';
import { ActivitiesPage } from './pages/activities/ActivitiesPage.jsx';
import { ReportsPage } from './pages/reports/ReportsPage.jsx';
import { UsersPage } from './pages/users/UsersPage.jsx';
import { AuditLogsPage } from './pages/audit/AuditLogsPage.jsx';
import { SettingsPage } from './pages/settings/SettingsPage.jsx';

// Error Pages
import { UnauthorizedPage } from './pages/UnauthorizedPage.jsx';
import { NotFoundPage } from './pages/NotFoundPage.jsx';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white text-xs">
        Loading AcxiomCRM session...
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const RoleRoute = ({ allowedRoles, children }) => {
  const { user } = useAuth();
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
};

export const App = () => {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Protected CRM Routes inside Enterprise Layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="opportunities" element={<OpportunitiesPage />} />
        <Route path="followups" element={<FollowUpsPage />} />
        <Route path="activities" element={<ActivitiesPage />} />
        <Route path="reports" element={<ReportsPage />} />

        {/* Admin only route */}
        <Route
          path="users"
          element={
            <RoleRoute allowedRoles={['Admin']}>
              <UsersPage />
            </RoleRoute>
          }
        />

        {/* Admin and Manager route */}
        <Route
          path="audit-logs"
          element={
            <RoleRoute allowedRoles={['Admin', 'Manager']}>
              <AuditLogsPage />
            </RoleRoute>
          }
        />

        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* 404 Route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default App;

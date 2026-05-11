import { useState, useCallback, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { getToken, clearToken } from "./api/client";
import { startHeartbeat, stopHeartbeat } from "./api/heartbeat";
import { AuthContext } from "./hooks/useAuth";
import { getUserRole } from "./hooks/useRole";
import type { UserRole } from "./hooks/useRole";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import CampaignsPage from "./pages/CampaignsPage";
import CampaignDetailPage from "./pages/CampaignDetailPage";
import LeadsPage from "./pages/LeadsPage";
import LeadDetailPage from "./pages/LeadDetailPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AboutPage from "./pages/AboutPage";
import EmployeeDashboardPage from "./pages/EmployeeDashboardPage";
import CRMLeadsPage from "./pages/CRMLeadsPage";
import CRMHistoryPage from "./pages/CRMHistoryPage";
import EmployeeManagementPage from "./pages/EmployeeManagementPage";
import AdminManagementPage from "./pages/AdminManagementPage";
import CRMDashboardPage from "./pages/CRMDashboardPage";
import EmployeeActivityPage from "./pages/EmployeeActivityPage";
import CalendarPage from "./pages/CalendarPage";
import ChatPage from "./pages/ChatPage";
import ProfilePage from "./pages/ProfilePage";

import { ChatProvider } from "./chat/ChatContext";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return getToken() ? <>{children}</> : <Navigate to="/login" replace />;
}

function RoleGuard({ allowed, children }: { allowed: UserRole[]; children: React.ReactNode }) {
  const role = getUserRole();
  if (!role || !allowed.includes(role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RoleDashboard() {
  const role = getUserRole();
  if (role === "employee") return <EmployeeDashboardPage />;
  return <DashboardPage />;
}

export default function App() {
  const [, setTick] = useState(0);

  const logout = useCallback(() => {
    stopHeartbeat();
    clearToken();
    setTick((t) => t + 1);
  }, []);

  const isAuthenticated = !!getToken();

  useEffect(() => {
    if (isAuthenticated) {
      startHeartbeat();
    }
    return () => stopHeartbeat();
  }, [isAuthenticated]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, logout }}>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <ChatProvider>
                  <Layout />
                </ChatProvider>
              </ProtectedRoute>
            }
          >
            <Route index element={<RoleDashboard />} />
            {/* Shared */}
            <Route path="about" element={<AboutPage />} />
            {/* Admin/Super Admin routes */}
            <Route path="campaigns" element={<RoleGuard allowed={["admin", "super_admin"]}><CampaignsPage /></RoleGuard>} />
            <Route path="campaigns/:id" element={<RoleGuard allowed={["admin", "super_admin"]}><CampaignDetailPage /></RoleGuard>} />
            <Route path="leads" element={<RoleGuard allowed={["admin", "super_admin"]}><LeadsPage /></RoleGuard>} />
            <Route path="leads/:id" element={<RoleGuard allowed={["admin", "super_admin"]}><LeadDetailPage /></RoleGuard>} />
            <Route path="analytics" element={<RoleGuard allowed={["admin", "super_admin"]}><AnalyticsPage /></RoleGuard>} />
            {/* Admin only */}
            <Route path="employees" element={<RoleGuard allowed={["admin"]}><EmployeeManagementPage /></RoleGuard>} />
            <Route path="crm" element={<RoleGuard allowed={["admin"]}><CRMDashboardPage /></RoleGuard>} />
            <Route path="crm/employees/:id" element={<RoleGuard allowed={["admin"]}><EmployeeActivityPage /></RoleGuard>} />
            {/* Super admin only */}
            <Route path="admins" element={<RoleGuard allowed={["super_admin"]}><AdminManagementPage /></RoleGuard>} />
            {/* Employee CRM routes */}
            <Route path="crm/leads" element={<RoleGuard allowed={["employee"]}><CRMLeadsPage /></RoleGuard>} />
            <Route path="crm/history" element={<RoleGuard allowed={["employee"]}><CRMHistoryPage /></RoleGuard>} />

            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </AuthContext.Provider>
  );
}

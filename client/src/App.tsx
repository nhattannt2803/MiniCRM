import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import vi_VN from 'antd/locale/vi_VN';
import en_US from 'antd/locale/en_US';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from './stores/authStore';
import { MainLayout } from './layouts/MainLayout';
import { SystemLayout } from './layouts/SystemLayout';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { NoBusinessPage } from './features/auth/NoBusinessPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { OverviewPage } from './features/overview/OverviewPage';
import { TeamLeaderOverviewPage } from './features/overview/TeamLeaderOverviewPage';
import { SaleManagerOverviewPage } from './features/overview/SaleManagerOverviewPage';
import { LeadListPage } from './features/leads/LeadListPage';
import { LeadDetailPage } from './features/leads/LeadDetailPage';
import { MyLeadsPage } from './features/leads/MyLeadsPage';
import { LeadAllocationPage } from './features/leads/LeadAllocationPage';
import { StaffListPage } from './features/staff/StaffListPage';
import { UsersListPage } from './features/users/UsersListPage';
import { SystemUsersPage } from './features/users/SystemUsersPage';
import { SystemBusinessesPage } from './features/businesses/SystemBusinessesPage';
import { TeamsListPage } from './features/teams/TeamsListPage';
import { RolesPermissionsPage } from './features/roles/RolesPermissionsPage';
import { CompanyListPage } from './features/companies/CompanyListPage';
import { CompanyDetailPage } from './features/companies/CompanyDetailPage';
import { ContactListPage } from './features/contacts/ContactListPage';
import { CustomerListPage } from './features/customers/CustomerListPage';
import { CustomerDetailPage } from './features/customers/CustomerDetailPage';
import { OpportunityKanbanPage } from './features/opportunities/OpportunityKanbanPage';
import { OpportunityListPage } from './features/opportunities/OpportunityListPage';
import { OpportunityDetailPage } from './features/opportunities/OpportunityDetailPage';
import { ProductListPage } from './features/products/ProductListPage';
import { QuoteListPage } from './features/quotes/QuoteListPage';
import { TaskListPage } from './features/tasks/TaskListPage';
import { ActivityListPage } from './features/activities/ActivityListPage';
import { AutomationListPage } from './features/automations/AutomationListPage';
import { AutomationCreatePage } from './features/automations/AutomationCreatePage';
import { AutomationExecutionPage } from './features/automations/AutomationExecutionPage';
import { SettingsPage } from './features/settings/SettingsPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, businesses, user } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-900"><Spin size="large" /></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Strict Super Admin Access Control for /system/* routes
  if (location.pathname.startsWith('/system')) {
    if (!user?.isSuperAdmin) {
      const activeSlug = businesses[0]?.slug;
      if (activeSlug) {
        return <Navigate to={`/${activeSlug}/dashboard`} replace />;
      }
      return <Navigate to="/no-business" replace />;
    }
    return <>{children}</>;
  }

  // If standard user has 0 business memberships and is trying to access CRM routes, redirect to /no-business
  if (businesses.length === 0 && location.pathname !== '/no-business') {
    return <Navigate to="/no-business" replace />;
  }

  return <>{children}</>;
};

const RootRedirect: React.FC = () => {
  const { activeBiz, businesses } = useAuthStore();
  const slug = activeBiz?.slug || (businesses[0] ? businesses[0].slug : null);

  if (!slug) {
    return <Navigate to="/no-business" replace />;
  }

  return <Navigate to={`/${slug}/dashboard`} replace />;
};

export const App: React.FC = () => {
  const { fetchMe } = useAuthStore();
  const { i18n } = useTranslation();

  const currentLocale = i18n.language.startsWith('vi') ? vi_VN : en_US;

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  return (
    <ConfigProvider
      locale={currentLocale}
      theme={{
        token: {
          colorPrimary: '#6366f1',
          borderRadius: 8,
          fontFamily: 'Inter, sans-serif',
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/portal-register" element={<RegisterPage />} />

          {/* User with No Business Landing Route */}
          <Route
            path="/no-business"
            element={
              <ProtectedRoute>
                <NoBusinessPage />
              </ProtectedRoute>
            }
          />

          {/* Standalone System Administration Console */}
          <Route
            path="/system"
            element={
              <ProtectedRoute>
                <SystemLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/system/users" replace />} />
            <Route path="users" element={<SystemUsersPage />} />
            <Route path="businesses" element={<SystemBusinessesPage />} />
          </Route>

          {/* Root Redirect to active business slug */}
          <Route path="/" element={<ProtectedRoute><RootRedirect /></ProtectedRoute>} />

          {/* Multi-Tenant CRM Routes Prefixed with /:bizSlug */}
          <Route
            path="/:bizSlug"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="overview" element={<OverviewPage />} />
            <Route path="overview/team" element={<TeamLeaderOverviewPage />} />
            <Route path="overview/manager" element={<SaleManagerOverviewPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="leads" element={<LeadListPage />} />
            <Route path="leads/my" element={<MyLeadsPage />} />
            <Route path="leads/allocation" element={<LeadAllocationPage />} />
            <Route path="leads/:id" element={<LeadDetailPage />} />
            <Route path="staff" element={<StaffListPage />} />
            <Route path="users" element={<UsersListPage />} />
            <Route path="teams" element={<TeamsListPage />} />
            <Route path="roles" element={<RolesPermissionsPage />} />
            <Route path="companies" element={<CompanyListPage />} />
            <Route path="companies/:id" element={<CompanyDetailPage />} />
            <Route path="contacts" element={<ContactListPage />} />
            <Route path="customers" element={<CustomerListPage />} />
            <Route path="customers/:id" element={<CustomerDetailPage />} />
            <Route path="opportunities" element={<OpportunityKanbanPage />} />
            <Route path="opportunities/list" element={<OpportunityListPage />} />
            <Route path="opportunities/:id" element={<OpportunityDetailPage />} />
            <Route path="products" element={<ProductListPage />} />
            <Route path="quotes" element={<QuoteListPage />} />
            <Route path="tasks" element={<TaskListPage />} />
            <Route path="activities" element={<ActivityListPage />} />
            <Route path="automations" element={<AutomationListPage />} />
            <Route path="automations/create" element={<AutomationCreatePage />} />
            <Route path="automations/executions" element={<AutomationExecutionPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<ProtectedRoute><RootRedirect /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import { useAuthStore } from './stores/authStore';
import { MainLayout } from './layouts/MainLayout';
import { LoginPage } from './features/auth/LoginPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { LeadListPage } from './features/leads/LeadListPage';
import { LeadDetailPage } from './features/leads/LeadDetailPage';
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
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-900"><Spin size="large" /></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  const { fetchMe } = useAuthStore();

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  return (
    <ConfigProvider
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
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="leads" element={<LeadListPage />} />
            <Route path="leads/:id" element={<LeadDetailPage />} />
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

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;

import React from 'react';
import { Layout, Button, Avatar, Dropdown, Typography, Tag } from 'antd';
import { SafetyCertificateOutlined, LogoutOutlined, UserOutlined, ShopOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useNavigate, useLocation, Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const { Header, Content } = Layout;
const { Text } = Typography;

export const SystemLayout: React.FC = () => {
  const { user, logout, businesses } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user?.isSuperAdmin) {
    const defaultSlug = businesses[0]?.slug;
    return <Navigate to={defaultSlug ? `/${defaultSlug}/dashboard` : '/no-business'} replace />;
  }

  const userMenu = {
    items: [
      {
        key: 'email',
        label: <Text type="secondary" className="text-xs">{user?.email}</Text>,
        disabled: true,
      },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Đăng xuất',
        onClick: logout,
      },
    ],
  };

  return (
    <Layout className="min-h-screen bg-slate-900">
      {/* System Admin Header */}
      <Header className="bg-slate-950 border-b border-slate-800 px-6 flex items-center justify-between h-16 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/system/users')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-black flex items-center justify-center text-lg shadow-lg">
              <SafetyCertificateOutlined />
            </div>
            <div>
              <span className="font-extrabold text-white text-base tracking-tight block">System Admin Portal</span>
              <span className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider block -mt-1">Platform Control Console</span>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-slate-800 hidden md:block" />

          {/* Navigation Links */}
          <div className="flex items-center gap-2">
            <Button
              type={location.pathname === '/system/users' ? 'primary' : 'text'}
              icon={<UserOutlined />}
              onClick={() => navigate('/system/users')}
              className={`rounded-xl text-xs font-semibold h-9 ${
                location.pathname === '/system/users'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Quản Lý Tất Cả Users
            </Button>

            <Button
              type={location.pathname === '/system/businesses' ? 'primary' : 'text'}
              icon={<ShopOutlined />}
              onClick={() => navigate('/system/businesses')}
              className={`rounded-xl text-xs font-semibold h-9 ${
                location.pathname === '/system/businesses'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              Quản Lý Doanh Nghiệp
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Badge indicator */}
          <Tag color="purple" className="font-bold text-xs px-3 py-0.5 rounded-full uppercase border-none shadow-sm">
            🛡️ Super Admin
          </Tag>

          {/* Switch to CRM view if member of any Biz */}
          {businesses && businesses.length > 0 && (
            <Button
              type="default"
              icon={<ShopOutlined />}
              onClick={() => navigate('/dashboard')}
              className="bg-slate-800 border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700 rounded-xl text-xs font-semibold h-9"
            >
              Vào CRM Doanh Nghiệp ({businesses[0].name})
            </Button>
          )}

          {/* User Profile */}
          <Dropdown menu={userMenu} placement="bottomRight">
            <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-800 p-1.5 rounded-full transition-colors">
              <Avatar className="bg-purple-600 text-white font-semibold">
                {user?.firstName ? user.firstName[0] : 'S'}
              </Avatar>
              <span className="font-semibold text-slate-200 text-sm hidden md:inline">
                {user?.lastName} {user?.firstName}
              </span>
            </div>
          </Dropdown>
        </div>
      </Header>

      {/* Main Admin Content Container */}
      <Content className="p-6 bg-slate-900 flex-1">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </Content>
    </Layout>
  );
};

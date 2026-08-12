import React, { useState, useEffect } from 'react';
import { Layout, Menu, Badge, Dropdown, Avatar, Button, Popover, List, Typography } from 'antd';
import {
  DashboardOutlined,
  UsergroupAddOutlined,
  BankOutlined,
  ContactsOutlined,
  SolutionOutlined,
  DollarOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  RobotOutlined,
  BellOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { crmService } from '../services/crmService';
import { Notification } from '../types';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const fetchNotifications = async () => {
    try {
      const res: any = await crmService.getNotifications();
      if (res.success) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount);
      }
    } catch (err) {
      // Ignore auth error on unmount
    }
  };

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 10000); // Refresh every 10s
    return () => clearInterval(timer);
  }, []);

  const handleMarkAllRead = async () => {
    await crmService.markAllNotificationsRead();
    fetchNotifications();
  };

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/leads', icon: <UsergroupAddOutlined />, label: 'Leads' },
    { key: '/companies', icon: <BankOutlined />, label: 'Companies' },
    { key: '/contacts', icon: <ContactsOutlined />, label: 'Contacts' },
    { key: '/customers', icon: <SolutionOutlined />, label: 'Customers' },
    { key: '/opportunities', icon: <DollarOutlined />, label: 'Opportunities' },
    { key: '/products', icon: <AppstoreOutlined />, label: 'Products' },
    { key: '/quotes', icon: <FileTextOutlined />, label: 'Quotes' },
    { key: '/tasks', icon: <CheckSquareOutlined />, label: 'Tasks' },
    { key: '/activities', icon: <ClockCircleOutlined />, label: 'Activities' },
    { key: '/automations', icon: <RobotOutlined />, label: 'Automations' },
    { key: '/settings', icon: <SettingOutlined />, label: 'Settings' },
  ];

  const notificationContent = (
    <div className="w-80">
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <span className="font-semibold text-gray-800 text-sm">Notifications</span>
        {unreadCount > 0 && (
          <Button type="link" size="small" onClick={handleMarkAllRead} className="p-0 text-xs">
            Mark all read
          </Button>
        )}
      </div>
      <List
        size="small"
        dataSource={notifications.slice(0, 5)}
        renderItem={(item) => (
          <List.Item className={`p-3 text-xs ${!item.readAt ? 'bg-indigo-50/50' : ''}`}>
            <div className="flex flex-col gap-1 w-full">
              <span className="font-semibold text-gray-900">{item.title}</span>
              <span className="text-gray-600">{item.message}</span>
              <span className="text-[10px] text-gray-400">
                {new Date(item.createdAt).toLocaleTimeString('vi-VN')}
              </span>
            </div>
          </List.Item>
        )}
      />
    </div>
  );

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
        label: 'Logout',
        onClick: logout,
      },
    ],
  };

  return (
    <Layout className="min-h-screen">
      {/* Sidebar */}
      <Sider trigger={null} collapsible collapsed={collapsed} theme="light" className="border-r border-slate-200 shadow-xs">
        <div className="h-16 flex items-center px-4 gap-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-black flex items-center justify-center text-lg shadow-md">
            M
          </div>
          {!collapsed && <span className="font-bold text-slate-900 text-base tracking-tight">Mini CRM</span>}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className="border-none py-2 text-sm font-medium"
        />
      </Sider>

      <Layout>
        {/* Top Header */}
        <Header className="bg-white border-b border-slate-200 px-6 flex items-center justify-between h-16 shadow-xs">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="text-base text-slate-600"
          />

          <div className="flex items-center gap-6">
            {/* Notification Dropdown */}
            <Popover content={notificationContent} trigger="click" placement="bottomRight">
              <Badge count={unreadCount} overflowCount={99} size="small">
                <Button type="text" shape="circle" icon={<BellOutlined className="text-lg text-slate-600" />} />
              </Badge>
            </Popover>

            {/* User Profile */}
            <Dropdown menu={userMenu} placement="bottomRight">
              <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded-full transition-colors">
                <Avatar className="bg-indigo-600 text-white font-semibold">
                  {user?.firstName ? user.firstName[0] : 'U'}
                </Avatar>
                <span className="font-semibold text-slate-700 text-sm hidden md:inline">
                  {user?.firstName} {user?.lastName}
                </span>
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* Main Content Area */}
        <Content className="p-6 overflow-y-auto bg-slate-50">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

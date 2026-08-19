import React, { useState, useEffect } from 'react';
import { Layout, Menu, Badge, Dropdown, Avatar, Button, Popover, List, Typography, Select, message } from 'antd';
import {
  PieChartOutlined,
  DashboardOutlined,
  UsergroupAddOutlined,
  UserOutlined,
  ShareAltOutlined,
  TeamOutlined,
  BankOutlined,
  ContactsOutlined,
  SolutionOutlined,
  DollarOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  RobotOutlined,
  IdcardOutlined,
  UserSwitchOutlined,
  ClusterOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  BellOutlined,
  SettingOutlined,
  KeyOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  GlobalOutlined,
  ThunderboltOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, useParams, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { crmService } from '../services/crmService';
import { Notification } from '../types';
import { QuickCreateLeadModal } from '../features/leads/QuickCreateLeadModal';
import { PlusOutlined } from '@ant-design/icons';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [switchingDemo, setSwitchingDemo] = useState(false);
  const [createLeadModalOpen, setCreateLeadModalOpen] = useState(false);
  const [currentIndustry, setCurrentIndustry] = useState<string>(
    localStorage.getItem('crm_demo_industry') || 'xedien'
  );

  const { t, i18n } = useTranslation();
  const { user, logout, businesses, activeBiz, switchBiz, switchBizBySlug } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { bizSlug } = useParams<{ bizSlug: string }>();

  // Ensure activeBiz matches bizSlug in URL
  useEffect(() => {
    if (bizSlug) {
      const found = switchBizBySlug(bizSlug);
      if (!found && businesses.length > 0 && activeBiz) {
        navigate(`/${activeBiz.slug}/dashboard`, { replace: true });
      }
    }
  }, [bizSlug, businesses, activeBiz]);

  const currentBizSlug = bizSlug || activeBiz?.slug || (businesses[0] ? businesses[0].slug : 'default');

  const handleSwitchBiz = (newBizId: string) => {
    const match = businesses.find((b) => b.id === newBizId);
    if (match) {
      switchBiz(newBizId);
      const parts = location.pathname.split('/').filter(Boolean);
      let subPath = 'dashboard';
      if (parts.length > 1) {
        subPath = parts.slice(1).join('/');
      }
      navigate(`/${match.slug}/${subPath}`);
    }
  };

  const handleSwitchDemo = async (value: string) => {
    setSwitchingDemo(true);
    const hideMessage = message.loading('Đang chuyển đổi dữ liệu ngành...', 0);
    try {
      const res: any = await crmService.switchDemoIndustry(value);
      hideMessage();
      if (res.success && res.data) {
        const industryName = res.data.industryName || res.data.name || value;
        setCurrentIndustry(value);
        localStorage.setItem('crm_demo_industry', value);
        message.success(`Đã đổi dữ liệu demo sang: ${industryName}`);
        setTimeout(() => {
          window.location.reload();
        }, 600);
      }
    } catch (err: any) {
      hideMessage();
      message.error(err?.message || 'Không thể chuyển đổi dữ liệu demo');
    } finally {
      setSwitchingDemo(false);
    }
  };

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

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
  };

  const languageMenu = {
    items: [
      { key: 'vi', label: '🇻🇳 Tiếng Việt', onClick: () => changeLanguage('vi') },
      { key: 'en', label: '🇺🇸 English', onClick: () => changeLanguage('en') },
    ],
  };

  const menuItems = [
    {
      key: 'overview-group',
      icon: <PieChartOutlined />,
      label: t('nav.overview'),
      children: [
        { key: `/${currentBizSlug}/overview`, icon: <UserOutlined />, label: t('nav.overview') },
        { key: `/${currentBizSlug}/overview/team`, icon: <TeamOutlined />, label: t('nav.teamOverview') },
        { key: `/${currentBizSlug}/overview/manager`, icon: <ClusterOutlined />, label: t('nav.managerOverview') },
      ],
    },
    { key: `/${currentBizSlug}/dashboard`, icon: <DashboardOutlined />, label: t('nav.dashboard') },
    {
      key: 'leads-group',
      icon: <UsergroupAddOutlined />,
      label: t('nav.leadManagement'),
      children: [
        { key: `/${currentBizSlug}/leads/my`, icon: <UserOutlined />, label: t('nav.myLeads') },
        { key: `/${currentBizSlug}/leads/allocation`, icon: <ShareAltOutlined />, label: t('nav.leadAllocation') },
        { key: `/${currentBizSlug}/leads`, icon: <TeamOutlined />, label: t('nav.allLeads') },
      ],
    },
    { key: `/${currentBizSlug}/tasks`, icon: <CheckSquareOutlined />, label: t('nav.tasks') },
    { key: `/${currentBizSlug}/opportunities`, icon: <DollarOutlined />, label: t('nav.opportunities') },
    { key: `/${currentBizSlug}/companies`, icon: <BankOutlined />, label: t('nav.companies') },
    { key: `/${currentBizSlug}/contacts`, icon: <ContactsOutlined />, label: t('nav.contacts') },
    { key: `/${currentBizSlug}/customers`, icon: <SolutionOutlined />, label: t('nav.customers') },
    { key: `/${currentBizSlug}/products`, icon: <AppstoreOutlined />, label: t('nav.products') },
    { key: `/${currentBizSlug}/quotes`, icon: <FileTextOutlined />, label: t('nav.quotes') },
    { key: `/${currentBizSlug}/activities`, icon: <ClockCircleOutlined />, label: t('nav.activities') },
    { key: `/${currentBizSlug}/automations`, icon: <RobotOutlined />, label: t('nav.automations') },
    {
      key: 'system-group',
      icon: <SafetyCertificateOutlined />,
      label: t('nav.systemManagement'),
      children: [
        { key: `/${currentBizSlug}/staff`, icon: <IdcardOutlined />, label: t('nav.staff') },
        { key: `/${currentBizSlug}/users`, icon: <UserSwitchOutlined />, label: t('nav.users') },
        ...(user?.isSuperAdmin ? [{ key: '/system/users', icon: <SafetyCertificateOutlined />, label: 'Tài Khoản Hệ Thống' }] : []),
        { key: `/${currentBizSlug}/teams`, icon: <ClusterOutlined />, label: t('nav.teams') },
        { key: `/${currentBizSlug}/roles`, icon: <LockOutlined />, label: t('nav.roles') },
      ],
    },
    { key: `/${currentBizSlug}/api-keys`, icon: <KeyOutlined />, label: '🔑 API Keys / Webhook' },
    { key: `/${currentBizSlug}/settings`, icon: <SettingOutlined />, label: t('nav.settings') },
  ];

  const notificationContent = (
    <div className="w-80">
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <span className="font-semibold text-gray-800 text-sm">{t('nav.notifications')}</span>
        {unreadCount > 0 && (
          <Button type="link" size="small" onClick={handleMarkAllRead} className="p-0 text-xs">
            {t('nav.markAllRead')}
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
                {new Date(item.createdAt).toLocaleTimeString(i18n.language === 'vi' ? 'vi-VN' : 'en-US')}
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
        key: 'role',
        label: <Text className="text-xs text-indigo-600 font-semibold">Quyền: {activeBiz?.roleName || activeBiz?.role || 'SALES'}</Text>,
        disabled: true,
      },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: t('nav.logout'),
        onClick: logout,
      },
    ],
  };

  return (
    <Layout className="h-screen overflow-hidden">
      {/* Sidebar */}
      <Sider trigger={null} collapsible collapsed={collapsed} theme="light" className="h-screen overflow-y-auto border-r border-slate-200 shadow-xs shrink-0">
        <div className="h-16 flex items-center px-4 gap-3 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-black flex items-center justify-center text-lg shadow-md">
            M
          </div>
          {!collapsed && <span className="font-bold text-slate-900 text-base tracking-tight">{t('common.appName')}</span>}
        </div>

        {/* Action Button at Top of Sidebar */}
        <div className="p-3 border-b border-slate-100">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateLeadModalOpen(true)}
            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold shadow-md h-10 flex items-center justify-center rounded-xl border-none transition-all"
            title="Tạo Lead Mới"
          >
            {!collapsed && <span> Tạo Lead Mới</span>}
          </Button>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['overview-group', 'leads-group', 'system-group']}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className="border-none py-2 text-sm font-medium"
        />
      </Sider>

      <Layout className="h-screen overflow-hidden flex flex-col flex-1">
        {/* Top Header - Sticky */}
        <Header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-6 flex items-center justify-between h-16 shadow-xs shrink-0">
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            className="text-base text-slate-600"
          />

          <div className="flex items-center gap-4">
            {/* Super Admin Quick Link */}
            {user?.isSuperAdmin && (
              <Button
                type="primary"
                icon={<SafetyCertificateOutlined />}
                onClick={() => navigate('/system/users')}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-full h-8 px-3 border-none shadow-xs"
              >
                System Admin
              </Button>
            )}

            {/* Multi-Tenant Business Switcher Widget */}
            {businesses && businesses.length > 0 && (
              <div className="flex items-center gap-2 bg-emerald-50/80 border border-emerald-200 rounded-full px-3 py-1 shadow-2xs">
                <ShopOutlined className="text-emerald-600 font-bold" />
                <span className="text-xs font-semibold text-emerald-950 hidden sm:inline">Doanh nghiệp:</span>
                <Select
                  value={activeBiz?.id}
                  onChange={handleSwitchBiz}
                  size="small"
                  variant="borderless"
                  popupMatchSelectWidth={false}
                  className="font-bold text-emerald-900 text-xs"
                  options={businesses.map((b: any) => ({
                    value: b.id,
                    label: `${b.name} (/${b.slug})`,
                  }))}
                />
              </div>
            )}

            {/* Demo Industry Switcher Widget */}
            <div className="flex items-center gap-2 bg-indigo-50/80 border border-indigo-100 rounded-full px-3 py-1 shadow-2xs">
              <ThunderboltOutlined className="text-indigo-600 font-bold" />
              <span className="text-xs font-semibold text-indigo-950 hidden sm:inline">Demo:</span>
              <Select
                value={currentIndustry}
                onChange={handleSwitchDemo}
                loading={switchingDemo}
                disabled={switchingDemo}
                size="small"
                variant="borderless"
                popupMatchSelectWidth={false}
                className="font-bold text-indigo-900 text-xs"
                options={[
                  { value: 'xedien', label: '🚲 Xe Điện MOVE' },
                  { value: 'software', label: '💻 Phần Mềm B2B' },
                  { value: 'batdongsan', label: '🏢 Bất Động Sản' },
                  { value: 'tienganh', label: '🎓 Tiếng Anh ILA' },
                ]}
              />
            </div>

            {/* Language Switcher Dropdown */}
            <Dropdown menu={languageMenu} placement="bottomRight">
              <Button type="text" icon={<GlobalOutlined className="text-lg text-slate-600" />} className="flex items-center gap-1">
                <span className="text-xs font-semibold text-slate-700 uppercase">{i18n.language}</span>
              </Button>
            </Dropdown>

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
                  {user?.lastName} {user?.firstName}
                </span>
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* Main Content Area - Scrollable */}
        <Content className="p-6 overflow-y-auto bg-slate-50 flex-1">
          <Outlet />
        </Content>
      </Layout>

      {/* Global Quick Create Lead Modal */}
      <QuickCreateLeadModal
        visible={createLeadModalOpen}
        onClose={() => setCreateLeadModalOpen(false)}
      />
    </Layout>
  );
};

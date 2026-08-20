import React, { useState, useEffect } from 'react';
import { Layout, Badge, Dropdown, Avatar, Button, Popover, List, Typography, Select, message, Input, Tooltip } from 'antd';
import {
  AppstoreOutlined,
  TeamOutlined,
  UserAddOutlined,
  FunnelPlotOutlined,
  CheckSquareOutlined,
  ShoppingCartOutlined,
  ReadOutlined,
  CustomerServiceOutlined,
  PlusOutlined,
  SearchOutlined,
  DownOutlined,
  RightOutlined,
  SettingOutlined,
  GlobalOutlined,
  ThunderboltOutlined,
  ShopOutlined,
  SafetyCertificateOutlined,
  BellOutlined,
  LogoutOutlined,
  LeftOutlined,
  UserOutlined,
  ClusterOutlined,
  IdcardOutlined,
  LockOutlined,
  HistoryOutlined,
  RobotOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  KeyOutlined,
  LinkOutlined,
  UserSwitchOutlined,
  PieChartOutlined,
  UnorderedListOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, useParams, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { crmService } from '../services/crmService';
import { Notification, Pipeline } from '../types';
import { QuickCreateLeadModal } from '../features/leads/QuickCreateLeadModal';
import { PipelineManagementModal } from '../features/opportunities/PipelineManagementModal';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [subSiderCollapsed, setSubSiderCollapsed] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [switchingDemo, setSwitchingDemo] = useState(false);
  const [createLeadModalOpen, setCreateLeadModalOpen] = useState(false);
  const [pipelineModalOpen, setPipelineModalOpen] = useState(false);

  // Sub-sidebar Pipeline States
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipelineName, setSelectedPipelineName] = useState<string>('CỨU KHÁCH HÀNG RỜI BỎ');
  const [pipelineSearch, setPipelineSearch] = useState('');
  const [otherGroupOpen, setOtherGroupOpen] = useState(true);
  const [hotGroupOpen, setHotGroupOpen] = useState(false);
  const [systemGroupOpen, setSystemGroupOpen] = useState(false);

  const [currentIndustry, setCurrentIndustry] = useState<string>(
    localStorage.getItem('crm_demo_industry') || 'xedien'
  );

  const { t, i18n } = useTranslation();
  const { user, logout, businesses, activeBiz, switchBiz, switchBizBySlug } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { bizSlug } = useParams<{ bizSlug: string }>();

  // Default demo pipelines matching the screenshot design
  const defaultPipelines = [
    { id: 'p1', name: 'CỨU KHÁCH HÀNG RỜI BỎ', group: 'KHÁCH' },
    { id: 'p2', name: 'LEAD B2B', group: 'KHÁCH' },
    { id: 'p3', name: 'LEAD TỪ QUẢNG CÁO B2C (FB/TIKTOK/GG)', group: 'KHÁCH' },
    { id: 'p4', name: 'LEAD B2B', group: 'KHÁCH' },
    { id: 'p5', name: 'LEAD B2C', group: 'KHÁCH' },
    { id: 'p6', name: 'Khách hàng B2C từ quảng cáo', group: 'KHÁCH' },
    { id: 'p7', name: 'Khách Nuôi Dưỡng', group: 'KHÁCH' },
    { id: 'p8', name: 'Khách Ra Showroom', group: 'KHÁCH' },
    { id: 'p9', name: 'Khách hàng đã lâu không tương tác', group: 'KHÁCH' },
    { id: 'p10', name: 'Khác', group: 'KHÁCH' },
  ];

  const hotPipelines = [
    { id: 'hp1', name: 'HOT LEAD VIP', group: 'HOT' },
    { id: 'hp2', name: 'KÍCH HOẠT KHÁCH MỚI', group: 'HOT' },
  ];

  // Fetch actual DB pipelines
  const fetchPipelines = async () => {
    try {
      const res: any = await crmService.getPipelines();
      if (res.success && res.data.length > 0) {
        setPipelines(res.data);
      }
    } catch (err) {
      console.error('Failed to load pipelines:', err);
    }
  };

  useEffect(() => {
    fetchPipelines();
  }, [activeBiz]);

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
      // Ignore auth error
    }
  };

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 10000);
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

  // Primary sidebar menu items definition
  const primaryMenuItems = [
    {
      key: `/${currentBizSlug}/customers`,
      icon: <TeamOutlined className="text-base" />,
      label: 'Khách hàng',
    },
    {
      key: `/${currentBizSlug}/leads`,
      icon: <UserAddOutlined className="text-base" />,
      label: 'Leads',
    },
    {
      key: `/${currentBizSlug}/leads/allocation`,
      icon: <FunnelPlotOutlined className="text-base" />,
      label: 'Nguồn Lead',
    },
    {
      key: `/${currentBizSlug}/tasks`,
      icon: <CheckSquareOutlined className="text-base" />,
      label: 'Task',
    },
    {
      key: `/${currentBizSlug}/opportunities`,
      icon: <ShoppingCartOutlined className="text-base" />,
      label: 'Đơn hàng',
    },
    {
      key: `/${currentBizSlug}/products`,
      icon: <AppstoreOutlined className="text-base" />,
      label: 'Sản phẩm',
    },
    {
      key: `/${currentBizSlug}/quotes`,
      icon: <ReadOutlined className="text-base" />,
      label: 'Khóa học',
    },
    {
      key: `/${currentBizSlug}/automations`,
      icon: <CustomerServiceOutlined className="text-base" />,
      label: 'Dịch vụ làm đẹp',
    },
  ];

  // Filter pipelines for sub-sidebar search
  const filteredDefaultPipelines = defaultPipelines.filter((p) =>
    p.name.toLowerCase().includes(pipelineSearch.toLowerCase())
  );
  const filteredHotPipelines = hotPipelines.filter((p) =>
    p.name.toLowerCase().includes(pipelineSearch.toLowerCase())
  );

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
    <Layout className="h-screen overflow-hidden flex flex-row bg-slate-100 font-sans">
      {/* 1. Primary Left Dark Blue Sidebar */}
      <Sider
        width={190}
        collapsedWidth={64}
        collapsed={collapsed}
        theme="dark"
        className="h-screen shrink-0 shadow-lg border-r border-[#1e4494] z-20 transition-all duration-200"
        style={{ backgroundColor: '#173b85' }}
      >
        <div className="h-full flex flex-col justify-between overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {/* Logo Header */}
            <div className={`h-14 flex items-center border-b border-[#234aa0]/60 sticky top-0 bg-[#173b85] z-10 px-4 gap-2.5 ${collapsed ? 'justify-center' : ''}`}>
              <div className="w-7 h-7 rounded-lg bg-[#254ea7] text-white flex items-center justify-center font-black text-sm shadow-sm border border-[#3b67cb]/50 shrink-0">
                <AppstoreOutlined className="text-base text-white" />
              </div>
              {!collapsed && <span className="font-extrabold text-white text-lg tracking-tight select-none">CRM</span>}
            </div>

            {/* Category Header */}
            {!collapsed && (
              <div className="px-4 pt-4 pb-2">
                <span className="text-[11px] font-bold text-blue-200/70 uppercase tracking-wider select-none">
                  BÁN HÀNG & CRM
                </span>
              </div>
            )}

            {/* Primary Menu Items Stack */}
            <div className={`space-y-1 py-2 ${collapsed ? 'px-1.5' : 'px-2'}`}>
              {primaryMenuItems.map((item) => {
                // Check active matching
                const isActive =
                  location.pathname === item.key ||
                  (item.key.endsWith('/leads') && (location.pathname.endsWith('/leads') || location.pathname.includes('/leads/')));

                return (
                  <Tooltip key={item.key} title={collapsed ? item.label : undefined} placement="right">
                    <div
                      onClick={() => navigate(item.key)}
                      className={`flex items-center rounded-xl text-xs font-semibold cursor-pointer transition-all duration-150 select-none ${collapsed ? 'justify-center py-2.5 px-0' : 'gap-3 px-3 py-2.5'
                        } ${isActive
                          ? 'bg-[#2853b8] text-white shadow-sm font-bold border border-blue-400/30'
                          : 'text-blue-100/90 hover:bg-[#1f4598] hover:text-white'
                        }`}
                    >
                      <span className={`text-base ${isActive ? 'text-white' : 'text-blue-200/80'}`}>{item.icon}</span>
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </div>
                  </Tooltip>
                );
              })}
            </div>

            {/* System Administration Collapsible Section */}
            <div className={`pt-3 pb-6 ${collapsed ? 'px-1.5' : 'px-2'}`}>
              {!collapsed ? (
                <div
                  onClick={() => setSystemGroupOpen(!systemGroupOpen)}
                  className="flex items-center justify-between px-2 py-1 text-[10px] font-bold text-blue-200/60 uppercase tracking-wider cursor-pointer hover:text-blue-100 select-none"
                >
                  <span>QUẢN TRỊ & HỆ THỐNG</span>
                  {systemGroupOpen ? <DownOutlined className="text-[9px]" /> : <RightOutlined className="text-[9px]" />}
                </div>
              ) : (
                <div className="border-t border-blue-400/20 my-2" />
              )}

              {(systemGroupOpen || collapsed) && (
                <div className="mt-1 space-y-1">
                  <Tooltip title={collapsed ? t('nav.overview') : undefined} placement="right">
                    <div
                      onClick={() => navigate(`/${currentBizSlug}/overview`)}
                      className={`flex items-center rounded-lg text-xs font-medium cursor-pointer ${collapsed ? 'justify-center py-2' : 'gap-2.5 px-3 py-2'
                        } ${location.pathname.includes('/overview') ? 'bg-[#2853b8] text-white' : 'text-blue-100/80 hover:bg-[#1f4598]'
                        }`}
                    >
                      <PieChartOutlined className="text-sm" />
                      {!collapsed && <span>{t('nav.overview')}</span>}
                    </div>
                  </Tooltip>

                  <Tooltip title={collapsed ? t('nav.staff') : undefined} placement="right">
                    <div
                      onClick={() => navigate(`/${currentBizSlug}/staff`)}
                      className={`flex items-center rounded-lg text-xs font-medium cursor-pointer ${collapsed ? 'justify-center py-2' : 'gap-2.5 px-3 py-2'
                        } ${location.pathname.includes('/staff') ? 'bg-[#2853b8] text-white' : 'text-blue-100/80 hover:bg-[#1f4598]'
                        }`}
                    >
                      <IdcardOutlined className="text-sm" />
                      {!collapsed && <span>{t('nav.staff')}</span>}
                    </div>
                  </Tooltip>

                  <Tooltip title={collapsed ? t('nav.teams') : undefined} placement="right">
                    <div
                      onClick={() => navigate(`/${currentBizSlug}/teams`)}
                      className={`flex items-center rounded-lg text-xs font-medium cursor-pointer ${collapsed ? 'justify-center py-2' : 'gap-2.5 px-3 py-2'
                        } ${location.pathname.includes('/teams') ? 'bg-[#2853b8] text-white' : 'text-blue-100/80 hover:bg-[#1f4598]'
                        }`}
                    >
                      <ClusterOutlined className="text-sm" />
                      {!collapsed && <span>{t('nav.teams')}</span>}
                    </div>
                  </Tooltip>

                  <Tooltip title={collapsed ? t('nav.roles') : undefined} placement="right">
                    <div
                      onClick={() => navigate(`/${currentBizSlug}/roles`)}
                      className={`flex items-center rounded-lg text-xs font-medium cursor-pointer ${collapsed ? 'justify-center py-2' : 'gap-2.5 px-3 py-2'
                        } ${location.pathname.includes('/roles') ? 'bg-[#2853b8] text-white' : 'text-blue-100/80 hover:bg-[#1f4598]'
                        }`}
                    >
                      <LockOutlined className="text-sm" />
                      {!collapsed && <span>{t('nav.roles')}</span>}
                    </div>
                  </Tooltip>

                  <Tooltip title={collapsed ? t('nav.settings') : undefined} placement="right">
                    <div
                      onClick={() => navigate(`/${currentBizSlug}/settings`)}
                      className={`flex items-center rounded-lg text-xs font-medium cursor-pointer ${collapsed ? 'justify-center py-2' : 'gap-2.5 px-3 py-2'
                        } ${location.pathname.includes('/settings') ? 'bg-[#2853b8] text-white' : 'text-blue-100/80 hover:bg-[#1f4598]'
                        }`}
                    >
                      <SettingOutlined className="text-sm" />
                      {!collapsed && <span>{t('nav.settings')}</span>}
                    </div>
                  </Tooltip>

                  <Tooltip title={collapsed ? 'API Keys' : undefined} placement="right">
                    <div
                      onClick={() => navigate(`/${currentBizSlug}/api-keys`)}
                      className={`flex items-center rounded-lg text-xs font-medium cursor-pointer ${collapsed ? 'justify-center py-2' : 'gap-2.5 px-3 py-2'
                        } ${location.pathname.includes('/api-keys') ? 'bg-[#2853b8] text-white' : 'text-blue-100/80 hover:bg-[#1f4598]'
                        }`}
                    >
                      <KeyOutlined className="text-sm" />
                      {!collapsed && <span>API Keys</span>}
                    </div>
                  </Tooltip>

                  <Tooltip title={collapsed ? '📦 Mapping Sản Phẩm' : undefined} placement="right">
                    <div
                      onClick={() => navigate(`/${currentBizSlug}/product-mappings`)}
                      className={`flex items-center rounded-lg text-xs font-medium cursor-pointer ${collapsed ? 'justify-center py-2' : 'gap-2.5 px-3 py-2'
                        } ${location.pathname.includes('/product-mappings') ? 'bg-[#2853b8] text-white' : 'text-blue-100/80 hover:bg-[#1f4598]'
                        }`}
                    >
                      <LinkOutlined className="text-sm" />
                      {!collapsed && <span>📦 Mapping Sản Phẩm</span>}
                    </div>
                  </Tooltip>

                  <Tooltip title={collapsed ? t('nav.leadEvents') : undefined} placement="right">
                    <div
                      onClick={() => navigate(`/${currentBizSlug}/leads/events`)}
                      className={`flex items-center rounded-lg text-xs font-medium cursor-pointer ${collapsed ? 'justify-center py-2' : 'gap-2.5 px-3 py-2'
                        } ${location.pathname.includes('/leads/events') ? 'bg-[#2853b8] text-white' : 'text-blue-100/80 hover:bg-[#1f4598]'
                        }`}
                    >
                      <HistoryOutlined className="text-sm" />
                      {!collapsed && <span>{t('nav.leadEvents')}</span>}
                    </div>
                  </Tooltip>

                  <Tooltip title={collapsed ? t('nav.activities') : undefined} placement="right">
                    <div
                      onClick={() => navigate(`/${currentBizSlug}/activities`)}
                      className={`flex items-center rounded-lg text-xs font-medium cursor-pointer ${collapsed ? 'justify-center py-2' : 'gap-2.5 px-3 py-2'
                        } ${location.pathname.includes('/activities') ? 'bg-[#2853b8] text-white' : 'text-blue-100/80 hover:bg-[#1f4598]'
                        }`}
                    >
                      <ClockCircleOutlined className="text-sm" />
                      {!collapsed && <span>{t('nav.activities')}</span>}
                    </div>
                  </Tooltip>

                  <Tooltip title={collapsed ? t('nav.users') : undefined} placement="right">
                    <div
                      onClick={() => navigate(`/${currentBizSlug}/users`)}
                      className={`flex items-center rounded-lg text-xs font-medium cursor-pointer ${collapsed ? 'justify-center py-2' : 'gap-2.5 px-3 py-2'
                        } ${location.pathname.includes('/users') && !location.pathname.startsWith('/system') ? 'bg-[#2853b8] text-white' : 'text-blue-100/80 hover:bg-[#1f4598]'
                        }`}
                    >
                      <UserSwitchOutlined className="text-sm" />
                      {!collapsed && <span>{t('nav.users')}</span>}
                    </div>
                  </Tooltip>

                  {user?.isSuperAdmin && (
                    <Tooltip title={collapsed ? 'System Admin' : undefined} placement="right">
                      <div
                        onClick={() => navigate('/system/users')}
                        className={`flex items-center rounded-lg text-xs font-medium cursor-pointer text-amber-300 hover:bg-[#1f4598] ${collapsed ? 'justify-center py-2' : 'gap-2.5 px-3 py-2'
                          }`}
                      >
                        <SafetyCertificateOutlined className="text-sm" />
                        {!collapsed && <span>System Admin</span>}
                      </div>
                    </Tooltip>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* User Profile & Primary Sidebar Toggle at Very Bottom */}
          <div className="p-2 border-t border-[#234aa0]/60 bg-[#133375] shrink-0 space-y-1">
            <Dropdown menu={userMenu} placement="topRight">
              <div
                className={`flex items-center cursor-pointer hover:bg-[#1f4598] p-2 rounded-xl transition-colors ${collapsed ? 'justify-center' : 'justify-between'
                  }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar className="bg-indigo-500 text-white font-bold text-xs h-7 w-7 shrink-0 flex items-center justify-center shadow-xs">
                    {user?.firstName ? user.firstName[0] : 'U'}
                  </Avatar>
                  {!collapsed && (
                    <div className="flex flex-col truncate">
                      <span className="font-bold text-white text-xs truncate">
                        {user?.lastName} {user?.firstName}
                      </span>
                      <span className="text-[10px] text-blue-200/70 truncate">
                        {activeBiz?.roleName || activeBiz?.role || 'SALES'}
                      </span>
                    </div>
                  )}
                </div>
                {!collapsed && (
                  <Popover content={notificationContent} trigger="click" placement="top">
                    <Badge count={unreadCount} overflowCount={99} size="small">
                      <Button
                        type="text"
                        shape="circle"
                        size="small"
                        icon={<BellOutlined className="text-blue-200 text-xs" />}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:bg-blue-600/40 h-6 w-6 flex items-center justify-center"
                      />
                    </Badge>
                  </Popover>
                )}
              </div>
            </Dropdown>

            {/* Toggle Button at Very Bottom of Dark Blue Sidebar */}
            <div className="pt-1 border-t border-[#234aa0]/40 flex items-center justify-center">
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined className="text-blue-200 text-sm" /> : <MenuFoldOutlined className="text-blue-200 text-sm" />}
                onClick={() => setCollapsed(!collapsed)}
                className="text-white hover:bg-[#1f4598] hover:text-white w-full h-8 flex items-center justify-center rounded-lg gap-2 text-xs font-semibold"
                title={collapsed ? 'Mở rộng sidebar' : 'Thu nhỏ sidebar'}
              >
                {!collapsed && <span>Thu gọn</span>}
              </Button>
            </div>
          </div>
        </div>
      </Sider>

      {/* 2. Secondary Sub-sidebar: Quản lý Phễu */}
      {!subSiderCollapsed ? (
        <div className="w-64 h-screen bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 shadow-xs z-10">
          <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
            {/* Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-slate-100 shrink-0">
              <span className="font-extrabold text-slate-900 text-base tracking-tight">Quản lý Phễu</span>
              <Button
                type="text"
                shape="circle"
                size="small"
                icon={<PlusOutlined className="text-slate-600 text-xs" />}
                onClick={() => setPipelineModalOpen(true)}
                className="bg-slate-100 hover:bg-slate-200 flex items-center justify-center h-7 w-7"
                title="Thêm Phễu Mới"
              />
            </div>

            {/* Search Box */}
            <div className="p-3 border-b border-slate-100 bg-slate-50/40 shrink-0">
              <Input
                prefix={<SearchOutlined className="text-slate-400 text-xs" />}
                placeholder="Tìm phễu..."
                value={pipelineSearch}
                onChange={(e) => setPipelineSearch(e.target.value)}
                allowClear
                className="rounded-lg bg-white border-slate-200 text-xs py-1.5 shadow-2xs"
              />
            </div>

            {/* Pipeline Accordions List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* Accordion 1: KHÁC */}
              <div>
                <div
                  className="flex items-center gap-1.5 text-slate-500 font-bold text-[11px] uppercase tracking-wider cursor-pointer py-1 select-none hover:text-slate-800"
                  onClick={() => setOtherGroupOpen(!otherGroupOpen)}
                >
                  {otherGroupOpen ? <DownOutlined className="text-[9px]" /> : <RightOutlined className="text-[9px]" />}
                  <span>KHÁC</span>
                </div>

                {otherGroupOpen && (
                  <div className="mt-1.5 space-y-1">
                    {(pipelines.length > 0
                      ? pipelines.map((p) => ({ id: p.id, name: p.name }))
                      : filteredDefaultPipelines
                    ).map((pipe) => {
                      const isActive = selectedPipelineName === pipe.name;
                      return (
                        <div
                          key={pipe.id}
                          onClick={() => setSelectedPipelineName(pipe.name)}
                          className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 ${isActive
                            ? 'bg-sky-100/90 text-sky-800 border border-sky-200/80 shadow-2xs font-bold'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                        >
                          {pipe.name}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Accordion 2: HOT LEAD */}
              <div>
                <div
                  className="flex items-center gap-1.5 text-slate-500 font-bold text-[11px] uppercase tracking-wider cursor-pointer py-1 select-none hover:text-slate-800"
                  onClick={() => setHotGroupOpen(!hotGroupOpen)}
                >
                  {hotGroupOpen ? <DownOutlined className="text-[9px]" /> : <RightOutlined className="text-[9px]" />}
                  <span>HOT LEAD</span>
                </div>

                {hotGroupOpen && (
                  <div className="mt-1.5 space-y-1">
                    {filteredHotPipelines.map((pipe) => {
                      const isActive = selectedPipelineName === pipe.name;
                      return (
                        <div
                          key={pipe.id}
                          onClick={() => setSelectedPipelineName(pipe.name)}
                          className={`px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 ${isActive
                            ? 'bg-sky-100/90 text-sky-800 border border-sky-200/80 shadow-2xs font-bold'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                        >
                          {pipe.name}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Toggle button at bottom of Secondary White Sub-sidebar */}
          <div className="p-2 border-t border-slate-200 bg-slate-50 flex items-center justify-between sticky bottom-0 z-20 shrink-0">
            <span className="text-xs font-bold text-slate-600 pl-2 select-none">Thu gọn</span>
            <Button
              type="text"
              icon={<LeftOutlined className="text-slate-600 text-xs" />}
              onClick={() => setSubSiderCollapsed(true)}
              className="hover:bg-slate-200 flex items-center justify-center h-8 w-8 rounded-lg"
              title="Thu gọn Sidebar Phễu"
            />
          </div>
        </div>
      ) : (
        /* Floating Button to Re-open White Sub-sidebar when collapsed */
        <Button
          type="text"
          icon={<RightOutlined className="text-slate-600 text-xs" />}
          onClick={() => setSubSiderCollapsed(false)}
          className="fixed bottom-4 z-30 bg-white border border-slate-300 shadow-md hover:bg-slate-100 rounded-r-lg h-9 px-2 flex items-center justify-center gap-1 text-xs font-bold text-slate-700 transition-all"
          style={{ left: collapsed ? '64px' : '190px' }}
          title="Mở Sidebar Phễu"
        >
          <span>Phễu</span>
        </Button>
      )}


      {/* 3. Main Workspace Container (No Top Header Bar) */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Router Outlet Content Area */}
        <Content className="flex-1 overflow-y-auto bg-slate-50 p-4">
          <Outlet />
        </Content>
      </div>

      {/* Global Quick Create Lead Modal */}
      <QuickCreateLeadModal
        visible={createLeadModalOpen}
        onClose={() => setCreateLeadModalOpen(false)}
      />

      {/* Pipeline Management Modal */}
      <PipelineManagementModal
        open={pipelineModalOpen}
        onClose={() => setPipelineModalOpen(false)}
        onPipelinesUpdated={() => fetchPipelines()}
      />
    </Layout>
  );
};



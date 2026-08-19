import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Switch, Typography, Button, Input, Space, message, Badge, Tooltip } from 'antd';
import { UserOutlined, SearchOutlined, ReloadOutlined, ShopOutlined, SafetyCertificateOutlined, CrownOutlined } from '@ant-design/icons';
import { crmService } from '../../services/crmService';

const { Title, Text } = Typography;

export const SystemUsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [smaxToken, setSmaxToken] = useState('');
  const [savingToken, setSavingToken] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res: any = await crmService.getAllSystemUsers();
      if (res.success) {
        setUsers(res.data);
      }
    } catch (err: any) {
      message.error(err?.message || 'Không thể tải danh sách tài khoản hệ thống');
    } finally {
      setLoading(false);
    }
  };

  const fetchSmaxToken = async () => {
    try {
      const res: any = await crmService.getSmaxToken();
      if (res.success && res.data?.token) {
        setSmaxToken(res.data.token);
      }
    } catch (err) {
      console.error('Error fetching Smax token:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchSmaxToken();
  }, []);

  const handleSaveSmaxToken = async () => {
    if (!smaxToken.trim()) {
      message.warning('Vui lòng nhập Token Smax.ai API');
      return;
    }
    setSavingToken(true);
    try {
      const res: any = await crmService.updateSmaxToken(smaxToken.trim());
      if (res.success) {
        message.success('Đã lưu Smax.ai Authorization Bearer Token thành công!');
      }
    } catch (err: any) {
      message.error(err?.message || 'Không thể lưu Smax Token');
    } finally {
      setSavingToken(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const res: any = await crmService.toggleGlobalUserStatus(userId, !currentStatus);
      if (res.success) {
        message.success(`Đã ${!currentStatus ? 'kích hoạt' : 'vô hiệu hóa'} tài khoản thành công`);
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isActive: !currentStatus } : u))
        );
      }
    } catch (err: any) {
      message.error(err?.message || 'Thao tác cập nhật trạng thái thất bại');
    }
  };

  const handleToggleSuperAdmin = async (userId: string, currentStatus: boolean) => {
    try {
      const res: any = await crmService.toggleSuperAdminStatus(userId, !currentStatus);
      if (res.success) {
        message.success(`Đã ${!currentStatus ? 'gán quyền Super Admin' : 'gỡ quyền Super Admin'} thành công`);
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isSuperAdmin: !currentStatus } : u))
        );
      }
    } catch (err: any) {
      message.error(err?.message || 'Thao tác cập nhật quyền Super Admin thất bại');
    }
  };

  const filteredUsers = users.filter((u) => {
    const term = searchText.toLowerCase();
    return (
      u.email.toLowerCase().includes(term) ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(term) ||
      (u.phone && u.phone.includes(term))
    );
  });

  const columns = [
    {
      title: 'Tài Khoản Người Dùng',
      key: 'name',
      render: (_: any, record: any) => (
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full font-bold flex items-center justify-center text-sm shadow-xs ${
            record.isSuperAdmin ? 'bg-purple-600 text-white' : 'bg-indigo-100 text-indigo-700'
          }`}>
            {record.isSuperAdmin ? <CrownOutlined /> : (record.firstName ? record.firstName[0] : 'U')}
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
              {record.lastName} {record.firstName}
              {record.isSuperAdmin && (
                <Tag color="purple" className="font-bold text-[10px] uppercase border-none px-2 rounded-full">
                  Super Admin
                </Tag>
              )}
            </div>
            <div className="text-xs text-slate-500">{record.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Số Điện Thoại',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string) => phone || <span className="text-slate-400 italic">Chưa cập nhật</span>,
    },
    {
      title: 'Doanh Nghiệp Đang Tham Gia',
      key: 'memberships',
      render: (_: any, record: any) => {
        if (!record.memberships || record.memberships.length === 0) {
          return <Tag color="orange">Chưa thuộc Biz nào</Tag>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {record.memberships.map((m: any) => (
              <Tag key={m.bizId} color="blue" icon={<ShopOutlined />}>
                {m.bizName} ({m.roleName || m.roleCode})
              </Tag>
            ))}
          </div>
        );
      },
    },
    {
      title: 'Super User (Toàn Hệ Thống)',
      key: 'isSuperAdmin',
      render: (_: any, record: any) => (
        <Tooltip title={record.isSuperAdmin ? 'Tài khoản có quyền Super Admin toàn hệ thống' : 'Bật để nâng cấp thành Super Admin'}>
          <Space>
            <Switch
              checked={!!record.isSuperAdmin}
              onChange={() => handleToggleSuperAdmin(record.id, !!record.isSuperAdmin)}
              checkedChildren="Super User"
              unCheckedChildren="Standard"
              className={record.isSuperAdmin ? 'bg-purple-600' : 'bg-slate-300'}
            />
          </Space>
        </Tooltip>
      ),
    },
    {
      title: 'Trạng Thái Hoạt Động',
      key: 'isActive',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Switch
            checked={record.isActive}
            onChange={() => handleToggleStatus(record.id, record.isActive)}
            checkedChildren="Hoạt động"
            unCheckedChildren="Đã khóa"
            className={record.isActive ? 'bg-emerald-600' : 'bg-slate-300'}
          />
        </Space>
      ),
    },
    {
      title: 'Ngày Đăng Ký',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => (
        <span className="text-xs text-slate-500">
          {new Date(date).toLocaleDateString('vi-VN')} {new Date(date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <Title level={3} className="!mb-1 text-slate-900 font-black flex items-center gap-2">
            <SafetyCertificateOutlined className="text-purple-600" />
            Quản Lý Tài Khoản Toàn Hệ Thống (System Users)
          </Title>
          <Text type="secondary" className="text-sm">
            Quản lý tài khoản người dùng, phân quyền Super Admin toàn SaaS và cấp/khóa tài khoản độc lập giữa các Doanh nghiệp.
          </Text>
        </div>

        <Button
          icon={<ReloadOutlined />}
          onClick={fetchUsers}
          loading={loading}
          className="rounded-xl font-semibold border-slate-300 h-10 px-4"
        >
          Làm mới
        </Button>
      </div>

      {/* Smax.ai API Integration Token Config */}
      <Card className="rounded-2xl border border-slate-200 shadow-sm p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="font-bold text-slate-900 text-base flex items-center gap-2">
              <span className="text-xl">⚡</span> Cấu Hình Tích Hợp Smax.ai Chat API Token
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Token Authorization (Bearer token) dùng để truy vấn dữ liệu tên khách, SĐT & FB PSID tự động khi dán link hội thoại Smax.ai.
            </p>
          </div>
          <div className="flex gap-2 items-center flex-1 max-w-xl">
            <Input.Password
              placeholder="Nhập Bearer Token Smax.ai..."
              value={smaxToken}
              onChange={(e) => setSmaxToken(e.target.value)}
              className="rounded-xl h-10 font-mono text-xs"
            />
            <Button
              type="primary"
              onClick={handleSaveSmaxToken}
              loading={savingToken}
              className="bg-indigo-600 rounded-xl h-10 px-5 font-semibold shrink-0"
            >
              Lưu Token
            </Button>
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl border border-slate-200 shadow-sm p-2">
        <div className="flex justify-between items-center mb-4 px-2 pt-2">
          <Input
            prefix={<SearchOutlined className="text-slate-400" />}
            placeholder="Tìm theo Tên, Email hoặc Số điện thoại..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-96 rounded-xl text-sm h-10"
          />
          <Text className="text-xs font-semibold text-slate-600">
            Tổng cộng: <strong className="text-indigo-600 text-sm">{filteredUsers.length}</strong> tài khoản hệ thống
          </Text>
        </div>

        <Table
          dataSource={filteredUsers}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          className="text-sm"
        />
      </Card>
    </div>
  );
};

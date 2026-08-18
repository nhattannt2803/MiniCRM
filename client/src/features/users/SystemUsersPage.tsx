import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Switch, Typography, Button, Input, Space, message, Badge } from 'antd';
import { UserOutlined, SearchOutlined, ReloadOutlined, ShopOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { crmService } from '../../services/crmService';

const { Title, Text } = Typography;

export const SystemUsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

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

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const res: any = await crmService.toggleGlobalUserStatus(userId, !currentStatus);
      if (res.success) {
        message.success(`Đã ${!currentStatus ? 'kích hoạt' : 'vô hiệu hóa'} tài khoản người dùng thành công`);
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isActive: !currentStatus } : u))
        );
      }
    } catch (err: any) {
      message.error(err?.message || 'Thao tác cập nhật trạng thái thất bại');
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
      title: 'Người Dùng',
      key: 'name',
      render: (_: any, record: any) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm">
            {record.firstName ? record.firstName[0] : 'U'}
          </div>
          <div>
            <div className="font-semibold text-slate-900 text-sm">
              {record.lastName} {record.firstName}
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
      title: 'Doanh Nghiệp (Biz)',
      key: 'memberships',
      render: (_: any, record: any) => {
        if (!record.memberships || record.memberships.length === 0) {
          return <Tag color="orange">Chưa tham gia Biz nào</Tag>;
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
      title: 'Ngày Đăng Ký',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => (
        <span className="text-xs text-slate-600">
          {new Date(date).toLocaleDateString('vi-VN')} {new Date(date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </span>
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
          {record.isActive ? (
            <Badge status="success" text={<span className="text-xs font-semibold text-emerald-700">Active</span>} />
          ) : (
            <Badge status="error" text={<span className="text-xs font-semibold text-rose-600">Disabled</span>} />
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <Title level={3} className="!mb-1 text-slate-900 font-extrabold flex items-center gap-2">
            <SafetyCertificateOutlined className="text-indigo-600" />
            Quản Lý Tài Khoản Toàn Hệ Thống
          </Title>
          <Text type="secondary" className="text-sm">
            Quản lý và cấp/khóa quyền hoạt động cho tất cả người dùng thuộc các Doanh nghiệp (Multi-Biz Platform Admin)
          </Text>
        </div>

        <Button
          icon={<ReloadOutlined />}
          onClick={fetchUsers}
          loading={loading}
          className="rounded-xl font-semibold border-slate-300"
        >
          Làm mới
        </Button>
      </div>

      <Card className="rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex justify-between items-center mb-4">
          <Input
            prefix={<SearchOutlined className="text-slate-400" />}
            placeholder="Tìm theo Tên, Email hoặc Số điện thoại..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-80 rounded-xl text-sm"
          />
          <Text className="text-xs font-semibold text-slate-500">
            Tổng cộng: <strong className="text-slate-900">{filteredUsers.length}</strong> tài khoản
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

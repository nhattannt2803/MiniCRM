import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Tag, Space, Switch, Modal, Form, Select, message, Badge, Tooltip } from 'antd';
import {
  UserOutlined,
  SearchOutlined,
  UserAddOutlined,
  LockOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MailOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { crmService } from '../../services/crmService';

const { Option } = Select;

export const UsersListPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res: any = await crmService.getUsers();
      if (res.success) {
        setUsers(res.data);
      }
    } catch (err) {
      message.error('Không thể tải danh sách tài khoản người dùng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const res: any = await crmService.toggleUserStatus(userId, !currentStatus);
      if (res.success) {
        message.success(`Đã ${!currentStatus ? 'kích hoạt' : 'khóa'} tài khoản người dùng`);
        fetchUsers();
      }
    } catch (err) {
      message.error('Không thể cập nhật trạng thái người dùng');
    }
  };

  const handleCreateUser = async (values: any) => {
    setSubmitting(true);
    try {
      const res: any = await crmService.createUser({
        ...values,
        roleCodes: values.roleCodes || ['SALES_REP'],
      });
      if (res.success) {
        message.success('Đã tạo tài khoản User thành công!');
        setIsModalOpen(false);
        form.resetFields();
        fetchUsers();
      }
    } catch (err: any) {
      message.error(err?.message || 'Không thể tạo User mới');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchText.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchText.toLowerCase()) ||
      u.id?.includes(searchText)
  );

  const columns = [
    {
      title: 'Mã User ID',
      dataIndex: 'id',
      key: 'id',
      render: (id: string) => <span className="font-mono text-xs font-semibold text-slate-500">#{id}</span>,
    },
    {
      title: 'Họ và tên',
      key: 'name',
      render: (_: any, r: any) => (
        <div>
          <div className="font-bold text-slate-900">{r.firstName} {r.lastName}</div>
          <div className="text-xs text-slate-500">{r.email}</div>
        </div>
      ),
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string) => phone || <span className="text-slate-400 font-mono text-xs">Chưa cập nhật</span>,
    },
    {
      title: 'Vai trò (Roles)',
      dataIndex: 'roles',
      key: 'roles',
      render: (roles: string[]) => (
        <div className="flex gap-1 flex-wrap">
          {roles?.map((role) => (
            <Tag key={role} color={role === 'ADMIN' ? 'magenta' : role === 'SALES_MANAGER' ? 'blue' : 'purple'}>
              {role}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: 'Khởi tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d: string) => <span className="text-xs text-slate-500">{new Date(d).toLocaleDateString('vi-VN')}</span>,
    },
    {
      title: 'Kích hoạt',
      key: 'isActive',
      render: (_: any, r: any) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={r.isActive}
            onChange={() => handleToggleStatus(r.id, r.isActive)}
            size="small"
          />
          <span className="text-xs font-medium text-slate-600">{r.isActive ? 'Active' : 'Locked'}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserOutlined className="text-indigo-600" /> Quản lý Users hệ thống
          </h1>
          <p className="text-sm text-slate-500">
            Danh sách tất cả tài khoản người dùng, cấp quyền truy cập và quản lý trạng thái kích hoạt tài khoản
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button icon={<ReloadOutlined />} onClick={fetchUsers} loading={loading}>
            Làm mới
          </Button>
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            Tạo Tài Khoản User
          </Button>
        </div>
      </div>

      {/* Main Table */}
      <Card className="shadow-xs border-slate-200 rounded-xl">
        <div className="mb-4">
          <Input
            placeholder="Tìm người dùng theo tên, email, ID..."
            prefix={<SearchOutlined className="text-slate-400" />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full sm:w-80 rounded-lg"
          />
        </div>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={filteredUsers}
          pagination={{ pageSize: 10 }}
          className="overflow-x-auto"
        />
      </Card>

      {/* Create User Modal */}
      <Modal
        title="Tạo Tài Khoản Người Dùng Mới"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreateUser} className="mt-4">
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="firstName" label="Họ & Đệm" rules={[{ required: true, message: 'Vui lòng nhập họ' }]}>
              <Input placeholder="Phạm Văn" />
            </Form.Item>
            <Form.Item name="lastName" label="Tên" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
              <Input placeholder="B" />
            </Form.Item>
          </div>
          <Form.Item name="email" label="Email người dùng" rules={[{ required: true, type: 'email', message: 'Vui lòng nhập email hợp lệ' }]}>
            <Input placeholder="user.b@minicrm.com" />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại">
            <Input placeholder="0987654321" />
          </Form.Item>
          <Form.Item name="roleCodes" label="Phân quyền Vai trò (Roles)" initialValue={['SALES_REP']}>
            <Select mode="multiple" placeholder="Chọn các vai trò">
              <Option value="ADMIN">ADMIN - Quản trị hệ thống</Option>
              <Option value="SALES_MANAGER">SALES_MANAGER - Quản lý Bán hàng</Option>
              <Option value="SALES_REP">SALES_REP - Nhân viên Sales</Option>
              <Option value="TELEMARKETING">TELEMARKETING - Đội Tele</Option>
            </Select>
          </Form.Item>
          <Form.Item name="password" label="Mật khẩu khởi tạo">
            <Input.Password placeholder="Password123!" />
          </Form.Item>

          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Tạo Người Dùng
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

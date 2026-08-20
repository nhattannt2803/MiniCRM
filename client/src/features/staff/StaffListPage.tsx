import React, { useState, useEffect } from 'react';
import { PrimaryButton } from '../../components/common/PrimaryButton';

import { Table, Card, Button, Input, Tag, Space, Avatar, Modal, Form, Select, message, Statistic, Progress, Tooltip } from 'antd';
import {
  IdcardOutlined,
  SearchOutlined,
  UserAddOutlined,
  PhoneOutlined,
  MailOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  TrophyOutlined,
  ReloadOutlined,
  KeyOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { crmService } from '../../services/crmService';

const { Option } = Select;

export const StaffListPage: React.FC = () => {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // Password reset state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [passwordForm] = Form.useForm();
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res: any = await crmService.getStaff();
      if (res.success) {
        setStaff(res.data);
      }
    } catch (err) {
      message.error('Không thể tải danh sách nhân viên');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleCreateStaff = async (values: any) => {
    setSubmitting(true);
    try {
      const res: any = await crmService.createUser({
        ...values,
        roleCodes: [values.role || 'SALES_REP'],
      });
      if (res.success) {
        message.success('Đã thêm nhân viên mới thành công!');
        setIsModalOpen(false);
        form.resetFields();
        fetchStaff();
      }
    } catch (err: any) {
      message.error(err?.message || 'Không thể tạo nhân viên mới');
    } finally {
      setSubmitting(false);
    }
  };

  const openPasswordModal = (member: any) => {
    setSelectedStaff(member);
    passwordForm.resetFields();
    setIsPasswordModalOpen(true);
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    let pass = 'CRM@';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    passwordForm.setFieldsValue({ newPassword: pass });
  };

  const handleResetPassword = async (values: any) => {
    if (!selectedStaff) return;
    setPasswordSubmitting(true);
    try {
      const res: any = await crmService.changeUserPassword(selectedStaff.id, values.newPassword);
      if (res.success) {
        message.success(`Đã đổi mật khẩu thành công cho nhân viên ${selectedStaff.firstName} ${selectedStaff.lastName}`);
        setIsPasswordModalOpen(false);
        passwordForm.resetFields();
      }
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || err?.message || 'Không thể đổi mật khẩu nhân viên');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const filteredStaff = staff.filter(
    (item) =>
      `${item.firstName} ${item.lastName}`.toLowerCase().includes(searchText.toLowerCase()) ||
      item.email?.toLowerCase().includes(searchText.toLowerCase()) ||
      item.phone?.includes(searchText) ||
      item.department?.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      title: 'Nhân viên',
      key: 'name',
      render: (_: any, r: any) => (
        <div className="flex items-center gap-3">
          <Avatar className="bg-indigo-600 text-white font-bold size-10">
            {r.firstName[0]}
          </Avatar>
          <div>
            <div className="font-bold text-slate-900">{r.firstName} {r.lastName}</div>
            <div className="text-xs text-slate-500 font-medium">{r.department || 'Phòng Bán Hàng'}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Liên hệ',
      key: 'contact',
      render: (_: any, r: any) => (
        <div className="text-xs space-y-1">
          <div className="flex items-center gap-1 text-slate-700">
            <MailOutlined className="text-blue-500" /> {r.email}
          </div>
          {r.phone && (
            <div className="flex items-center gap-1 text-slate-600">
              <PhoneOutlined className="text-emerald-500" /> {r.phone}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Vai trò',
      dataIndex: 'roles',
      key: 'roles',
      render: (roles: string[]) => (
        <div className="flex gap-1 flex-wrap">
          {roles?.map((role) => (
            <Tag key={role} color={role === 'ADMIN' ? 'purple' : role === 'SALES_MANAGER' ? 'blue' : 'cyan'}>
              {role}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: 'Khối lượng Lead',
      key: 'leads',
      render: (_: any, r: any) => (
        <div className="text-xs font-semibold text-slate-700">
          <span className="text-indigo-600 text-sm font-bold">{r.stats?.leadsCount || 0}</span> Lead phụ trách
        </div>
      ),
    },
    {
      title: 'Tỷ lệ chuyển đổi',
      dataIndex: 'conversionRate',
      key: 'conversionRate',
      render: (rate: string) => <Tag color="green" className="font-bold">{rate || '21.5%'}</Tag>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (active: boolean) =>
        active ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>Đang hoạt động</Tag>
        ) : (
          <Tag color="error" icon={<CloseCircleOutlined />}>Tạm khóa</Tag>
        ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, r: any) => (
        <Tooltip title="Đổi mật khẩu tài khoản">
          <Button
            size="small"
            icon={<KeyOutlined />}
            onClick={() => openPasswordModal(r)}
            className="text-amber-600 border-amber-300 hover:text-amber-700 hover:border-amber-400 bg-amber-50/40 font-medium text-xs rounded-md"
          >
            Đổi MK
          </Button>
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <IdcardOutlined className="text-indigo-600" /> Quản lý Nhân viên
          </h1>
          <p className="text-sm text-slate-500">
            Danh sách nhân sự, phân bổ KPI doanh số và theo dõi năng suất làm việc của đội ngũ sales
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button icon={<ReloadOutlined />} onClick={fetchStaff} loading={loading}>
            Làm mới
          </Button>
          <PrimaryButton
            icon={<UserAddOutlined />}
            onClick={() => setIsModalOpen(true)}
          >
            Thêm Nhân viên
          </PrimaryButton>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-xs border-slate-200 rounded-xl bg-indigo-50/50">
          <Statistic
            title={<span className="text-xs font-semibold text-indigo-800 uppercase">Tổng số nhân sự</span>}
            value={staff.length}
            prefix={<IdcardOutlined className="text-indigo-600 mr-2" />}
            valueStyle={{ fontWeight: 700, color: '#312e81' }}
          />
        </Card>
        <Card className="shadow-xs border-slate-200 rounded-xl bg-emerald-50/50">
          <Statistic
            title={<span className="text-xs font-semibold text-emerald-800 uppercase">Đang hoạt động</span>}
            value={staff.filter((s) => s.isActive).length}
            prefix={<CheckCircleOutlined className="text-emerald-600 mr-2" />}
            valueStyle={{ fontWeight: 700, color: '#065f46' }}
          />
        </Card>
        <Card className="shadow-xs border-slate-200 rounded-xl bg-purple-50/50">
          <Statistic
            title={<span className="text-xs font-semibold text-purple-800 uppercase">Top Performer Tỷ Lệ Cao</span>}
            value="24.8%"
            prefix={<TrophyOutlined className="text-purple-600 mr-2" />}
            valueStyle={{ fontWeight: 700, color: '#581c87' }}
          />
        </Card>
      </div>

      {/* Staff Table */}
      <Card className="shadow-xs border-slate-200 rounded-xl">
        <div className="mb-4">
          <Input
            placeholder="Tìm theo tên, email, SĐT, phòng ban..."
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
          dataSource={filteredStaff}
          pagination={{ pageSize: 10 }}
          className="overflow-x-auto"
        />
      </Card>

      {/* Add Staff Modal */}
      <Modal
        title="Thêm Nhân Viên Mới"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreateStaff} className="mt-4">
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="firstName" label="Họ & Đệm" rules={[{ required: true, message: 'Vui lòng nhập họ' }]}>
              <Input placeholder="Nguyễn Văn" />
            </Form.Item>
            <Form.Item name="lastName" label="Tên" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
              <Input placeholder="A" />
            </Form.Item>
          </div>
          <Form.Item name="email" label="Email công việc" rules={[{ required: true, type: 'email', message: 'Vui lòng nhập email hợp lệ' }]}>
            <Input placeholder="nv.a@company.com" />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại">
            <Input placeholder="0912345678" />
          </Form.Item>
          <Form.Item name="role" label="Vai trò / Chức danh" initialValue="SALES_REP">
            <Select>
              <Option value="SALES_REP">Chuyên viên Bán hàng (Sales Rep)</Option>
              <Option value="SALES_MANAGER">Trưởng phòng kinh doanh</Option>
              <Option value="TELEMARKETING">Telesale Inbound</Option>
              <Option value="ADMIN">Quản trị viên (Admin)</Option>
            </Select>
          </Form.Item>
          <Form.Item name="password" label="Mật khẩu ban đầu">
            <Input.Password placeholder="Để trống sẽ mặc định Password123!" />
          </Form.Item>

          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Tạo Nhân Viên
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Admin Reset Password Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800">
            <KeyOutlined className="text-amber-500" />
            <span>Đổi Mật Khẩu Cho Nhân Viên</span>
          </div>
        }
        open={isPasswordModalOpen}
        onCancel={() => setIsPasswordModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        {selectedStaff && (
          <div className="p-3 my-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
            <div><span className="font-semibold text-slate-600">Nhân viên:</span> <strong className="text-slate-900">{selectedStaff.firstName} {selectedStaff.lastName}</strong></div>
            <div><span className="font-semibold text-slate-600">Email:</span> <span className="text-indigo-600 font-mono">{selectedStaff.email}</span></div>
            <div><span className="font-semibold text-slate-600">Phòng ban:</span> <span className="text-slate-700">{selectedStaff.department}</span></div>
          </div>
        )}

        <Form form={passwordForm} layout="vertical" onFinish={handleResetPassword}>
          <Form.Item
            name="newPassword"
            label="Mật khẩu mới"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mới' },
              { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-slate-400" />}
              placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
            />
          </Form.Item>

          <div className="mb-4">
            <Button
              type="dashed"
              size="small"
              icon={<ReloadOutlined />}
              onClick={generateRandomPassword}
              className="text-xs text-indigo-600 border-indigo-300 hover:text-indigo-700"
            >
              Tạo mật khẩu ngẫu nhiên
            </Button>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={() => setIsPasswordModalOpen(false)}>Hủy</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={passwordSubmitting}
              className="bg-amber-600 hover:bg-amber-700 border-amber-600"
            >
              Cập nhật mật khẩu
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};


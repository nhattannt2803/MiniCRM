import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Switch, Typography, Button, Input, Modal, Form, Select, Space, message } from 'antd';
import { ShopOutlined, SearchOutlined, ReloadOutlined, PlusOutlined, UserOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { crmService } from '../../services/crmService';

const { Title, Text } = Typography;

export const SystemBusinessesPage: React.FC = () => {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchBusinesses = async () => {
    setLoading(true);
    try {
      const res: any = await crmService.getAllSystemBusinesses();
      if (res.success) {
        setBusinesses(res.data);
      }
    } catch (err: any) {
      message.error(err?.message || 'Không thể tải danh sách doanh nghiệp');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const handleToggleStatus = async (bizId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res: any = await crmService.toggleSystemBusinessStatus(bizId, nextStatus);
      if (res.success) {
        message.success(`Đã ${nextStatus === 'ACTIVE' ? 'bật hoạt động' : 'tạm ngưng'} doanh nghiệp thành công`);
        setBusinesses((prev) =>
          prev.map((b) => (b.id === bizId ? { ...b, status: nextStatus } : b))
        );
      }
    } catch (err: any) {
      message.error(err?.message || 'Thao tác cập nhật trạng thái thất bại');
    }
  };

  const handleCreateBusiness = async (values: any) => {
    setSubmitting(true);
    try {
      const res: any = await crmService.createSystemBusiness(values);
      if (res.success) {
        message.success(`Đã tạo thành công doanh nghiệp "${values.name}"!`);
        form.resetFields();
        setCreateModalOpen(false);
        fetchBusinesses();
      }
    } catch (err: any) {
      message.error(err?.message || 'Tạo doanh nghiệp thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredBusinesses = businesses.filter((b) => {
    const term = searchText.toLowerCase();
    return (
      b.name.toLowerCase().includes(term) ||
      b.slug.toLowerCase().includes(term) ||
      (b.email && b.email.toLowerCase().includes(term)) ||
      (b.owner && b.owner.email.toLowerCase().includes(term))
    );
  });

  const columns = [
    {
      title: 'Doanh Nghiệp',
      key: 'name',
      render: (_: any, record: any) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 font-extrabold flex items-center justify-center text-base shadow-xs">
            {record.name[0]}
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
              {record.name}
              <Tag color="purple" className="font-mono text-[10px] rounded-md px-1.5">
                /{record.slug}
              </Tag>
            </div>
            <div className="text-xs text-slate-500">{record.email || 'Chưa cập nhật email liên hệ'}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Chủ Sở Hữu / Admin',
      key: 'owner',
      render: (_: any, record: any) => {
        if (!record.owner) {
          return <span className="text-slate-400 italic">Chưa gán Admin</span>;
        }
        return (
          <div>
            <div className="font-semibold text-slate-800 text-xs flex items-center gap-1">
              <UserOutlined className="text-indigo-600" />
              {record.owner.name || 'Admin'}
            </div>
            <div className="text-xs text-slate-500">{record.owner.email}</div>
          </div>
        );
      },
    },
    {
      title: 'Gói Dịch Vụ',
      dataIndex: 'plan',
      key: 'plan',
      render: (plan: string) => {
        const colors: Record<string, string> = {
          FREE: 'default',
          STARTER: 'blue',
          PRO: 'indigo',
          ENTERPRISE: 'purple',
        };
        return <Tag color={colors[plan] || 'blue'} className="font-bold">{plan}</Tag>;
      },
    },
    {
      title: 'Số Thành Viên',
      dataIndex: 'memberCount',
      key: 'memberCount',
      render: (count: number) => (
        <Tag color="cyan" className="font-semibold">{count} nhân viên</Tag>
      ),
    },
    {
      title: 'Trạng Thái Hoạt Động',
      key: 'status',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Switch
            checked={record.status === 'ACTIVE'}
            onChange={() => handleToggleStatus(record.id, record.status)}
            checkedChildren="Đang chạy"
            unCheckedChildren="Tạm ngưng"
            className={record.status === 'ACTIVE' ? 'bg-emerald-600' : 'bg-slate-300'}
          />
        </Space>
      ),
    },
    {
      title: 'Ngày Khởi Tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => (
        <span className="text-xs text-slate-500">
          {new Date(date).toLocaleDateString('vi-VN')}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <Title level={3} className="!mb-1 text-slate-900 font-black flex items-center gap-2">
            <ShopOutlined className="text-emerald-600" />
            Quản Lý Doanh Nghiệp Hệ Thống (System Businesses)
          </Title>
          <Text type="secondary" className="text-sm">
            Tạo mới Doanh nghiệp SaaS, gán Admin chủ sở hữu và bật/tắt trạng thái hoạt động của Doanh nghiệp.
          </Text>
        </div>

        <div className="flex items-center gap-3">
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchBusinesses}
            loading={loading}
            className="rounded-xl font-semibold border-slate-300 h-10 px-4"
          >
            Làm mới
          </Button>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalOpen(true)}
            className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold h-10 px-5 rounded-xl border-none shadow-md"
          >
            Tạo Doanh Nghiệp Mới
          </Button>
        </div>
      </div>

      <Card className="rounded-2xl border border-slate-200 shadow-sm p-2">
        <div className="flex justify-between items-center mb-4 px-2 pt-2">
          <Input
            prefix={<SearchOutlined className="text-slate-400" />}
            placeholder="Tìm theo Tên Doanh Nghiệp, Slug hoặc Email Admin..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-96 rounded-xl text-sm h-10"
          />
          <Text className="text-xs font-semibold text-slate-600">
            Tổng cộng: <strong className="text-emerald-600 text-sm">{filteredBusinesses.length}</strong> doanh nghiệp
          </Text>
        </div>

        <Table
          dataSource={filteredBusinesses}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          className="text-sm"
        />
      </Card>

      {/* Modal Create Business */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-900 font-bold text-lg border-b border-slate-100 pb-3">
            <ShopOutlined className="text-emerald-600" />
            Tạo Doanh Nghiệp Mới (SaaS Tenant)
          </div>
        }
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={null}
        destroyOnClose
        className="rounded-2xl overflow-hidden"
      >
        <Form form={form} layout="vertical" onFinish={handleCreateBusiness} className="pt-3">
          <Form.Item
            name="name"
            label={<span className="text-xs font-semibold text-slate-700">Tên Doanh Nghiệp</span>}
            rules={[{ required: true, message: 'Vui lòng nhập Tên Doanh Nghiệp' }]}
          >
            <Input placeholder="Ví dụ: Công ty TNHH Xe Điện MOVE" className="rounded-xl" />
          </Form.Item>

          <Form.Item
            name="slug"
            label={<span className="text-xs font-semibold text-slate-700">Mật danh / URL Slug (Tự động sinh nếu trống)</span>}
            tooltip="Mật danh sẽ xuất hiện trên URL: http://localhost:5173/slug/overview"
          >
            <Input placeholder="xedien-move" className="rounded-xl font-mono text-sm" />
          </Form.Item>

          <Form.Item
            name="ownerEmail"
            label={<span className="text-xs font-semibold text-slate-700">Email Chủ Sở Hữu (Admin Doanh Nghiệp)</span>}
            tooltip="Nhập email của người dùng đã đăng ký để gán làm Admin sở hữu Biz này"
            rules={[{ required: true, message: 'Vui lòng nhập Email Admin chủ sở hữu' }]}
          >
            <Input placeholder="admin@xedien.com" className="rounded-xl" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item
              name="taxCode"
              label={<span className="text-xs font-semibold text-slate-700">Mã Số Thuế (tùy chọn)</span>}
            >
              <Input placeholder="0312345678" className="rounded-xl" />
            </Form.Item>

            <Form.Item
              name="plan"
              label={<span className="text-xs font-semibold text-slate-700">Gói Cước SaaS</span>}
              initialValue="ENTERPRISE"
            >
              <Select className="rounded-xl">
                <Select.Option value="FREE">FREE</Select.Option>
                <Select.Option value="STARTER">STARTER</Select.Option>
                <Select.Option value="PRO">PRO</Select.Option>
                <Select.Option value="ENTERPRISE">ENTERPRISE</Select.Option>
              </Select>
            </Form.Item>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-slate-100">
            <Button onClick={() => setCreateModalOpen(false)} className="rounded-xl">
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl border-none px-6"
            >
              Tạo Doanh Nghiệp
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Tag, Button, Tabs, Table, Spin, Modal, Form, Input, Select, notification } from 'antd';
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import { crmService } from '../../services/crmService';
import { Customer } from '../../types';
import { ActivityTimeline } from '../../components/Timeline/ActivityTimeline';

export const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const [form] = Form.useForm();

  const fetchCustomerDetails = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res: any = await crmService.getCustomerById(id);
      if (res.success) setCustomer(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerDetails();
  }, [id]);

  const handleOpenEditModal = () => {
    if (!customer) return;
    form.setFieldsValue({
      customerCode: customer.customerCode,
      status: customer.status || 'ACTIVE',
    });
    setEditModalVisible(true);
  };

  const handleUpdateCustomer = async (values: any) => {
    if (!id) return;
    try {
      const res: any = await crmService.updateCustomer(id, values);
      if (res.success) {
        notification.success({ message: 'Cập nhật thông tin khách hàng thành công' });
        setEditModalVisible(false);
        fetchCustomerDetails();
      }
    } catch (err: any) {
      notification.error({ message: 'Cập nhật thất bại', description: err.message });
    }
  };

  if (loading || !customer) {
    return <div className="h-96 flex items-center justify-center"><Spin size="large" /></div>;
  }

  const oppColumns = [
    { title: 'Deal Name', dataIndex: 'name', key: 'name' },
    {
      title: 'Won Amount (VND)',
      dataIndex: 'amount',
      key: 'amount',
      render: (v: number) => `${Number(v).toLocaleString('vi-VN')} ₫`,
    },
    {
      title: 'Won Date',
      dataIndex: 'wonAt',
      key: 'wonAt',
      render: (d: string) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—'),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/customers')} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">
                {customer.entityType === 'COMPANY'
                  ? customer.company?.name
                  : `${customer.contact?.firstName} ${customer.contact?.lastName}`}
              </h1>
              <Tag color="purple">{customer.customerCode}</Tag>
              <Tag color="green">{customer.status}</Tag>
            </div>
            <p className="text-sm text-slate-500">Official Customer Account Profile</p>
          </div>
        </div>

        <Button icon={<EditOutlined />} onClick={handleOpenEditModal}>
          Chỉnh sửa thông tin
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Account Overview" className="shadow-xs border-slate-200 rounded-xl bg-white">
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-slate-400 font-medium block text-xs">Customer Since</span>
              <span className="text-slate-800 font-semibold">
                {new Date(customer.createdAt).toLocaleDateString('vi-VN')}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block text-xs">Lifetime Value (LTV)</span>
              <span className="text-emerald-600 font-black text-base">
                {Number(customer.lifetimeValue).toLocaleString('vi-VN')} ₫
              </span>
            </div>
          </div>
        </Card>

        <div className="lg:col-span-2">
          <Card className="shadow-xs border-slate-200 rounded-xl bg-white">
            <Tabs
              items={[
                {
                  key: 'wonDeals',
                  label: `Won Deals (${customer.wonOpportunities?.length || 0})`,
                  children: (
                    <Table
                      columns={oppColumns}
                      dataSource={customer.wonOpportunities}
                      rowKey="id"
                      pagination={false}
                    />
                  ),
                },
                {
                  key: 'timeline',
                  label: 'Activity Timeline',
                  children: <ActivityTimeline activities={customer.activities || []} />,
                },
              ]}
            />
          </Card>
        </div>
      </div>

      <Modal
        title="Chỉnh sửa thông tin Khách hàng"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={() => form.submit()}
        width={400}
      >
        <Form form={form} layout="vertical" onFinish={handleUpdateCustomer}>
          <Form.Item name="customerCode" label="Mã khách hàng" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="status" label="Trạng thái">
            <Select>
              <Select.Option value="ACTIVE">Đang hoạt động (Active)</Select.Option>
              <Select.Option value="INACTIVE">Tạm dừng (Inactive)</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};


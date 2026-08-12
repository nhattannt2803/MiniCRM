import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Tag, Drawer, Form, Select, notification } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { crmService } from '../../services/crmService';
import { Contact, Company } from '../../types';

export const ContactListPage: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);

  const [form] = Form.useForm();

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const res: any = await crmService.getContacts({ page, limit: 10, search });
      if (res.success) {
        setContacts(res.data);
        setTotal(res.meta.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
    crmService.getCompanies({ limit: 100 }).then((res: any) => setCompanies(res.data));
  }, [page, search]);

  const handleCreateContact = async (values: any) => {
    try {
      const res: any = await crmService.createContact(values);
      if (res.success) {
        notification.success({ message: 'Contact Created' });
        setDrawerVisible(false);
        form.resetFields();
        fetchContacts();
      }
    } catch (err: any) {
      notification.error({ message: 'Error', description: err.message });
    }
  };

  const columns = [
    {
      title: 'Full Name',
      key: 'name',
      render: (_: any, r: Contact) => (
        <div>
          <span className="font-bold text-slate-900">{r.firstName} {r.lastName}</span>
          {r.isPrimary && <Tag color="gold" className="ml-2">PRIMARY</Tag>}
        </div>
      ),
    },
    {
      title: 'Company',
      key: 'company',
      render: (_: any, r: Contact) => (
        <span className="font-medium text-slate-700">{r.company?.name || '—'}</span>
      ),
    },
    { title: 'Position', dataIndex: 'position', key: 'position' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Contacts Directory</h1>
          <p className="text-sm text-slate-500">Individual contact persons associated with company accounts</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          className="bg-indigo-600 font-semibold rounded-lg"
          onClick={() => setDrawerVisible(true)}
        >
          Create Contact
        </Button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <Input
          prefix={<SearchOutlined className="text-slate-400" />}
          placeholder="Search name, email, phone..."
          className="w-72"
          allowClear
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <Table
          columns={columns}
          dataSource={contacts}
          rowKey="id"
          loading={loading}
          pagination={{ current: page, total, pageSize: 10, onChange: setPage }}
        />
      </div>

      <Drawer
        title="Create New Contact"
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        width={450}
        extra={
          <Button type="primary" onClick={() => form.submit()} className="bg-indigo-600">
            Save Contact
          </Button>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleCreateContact}>
          <Form.Item name="companyId" label="Associated Company">
            <Select placeholder="Select Company" allowClear>
              {companies.map((c) => (
                <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </div>

          <Form.Item name="email" label="Email Address">
            <Input />
          </Form.Item>

          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>

          <Form.Item name="position" label="Position / Title">
            <Input placeholder="CTO" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
};

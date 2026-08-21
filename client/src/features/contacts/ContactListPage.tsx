import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Tag, Drawer, Form, Select, notification, Checkbox } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { crmService } from '../../services/crmService';
import { Contact, Company } from '../../types';
import { PrimaryButton } from '../../components/common/PrimaryButton';

export const ContactListPage: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  const [form] = Form.useForm();
  const { t } = useTranslation();

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

  const handleOpenCreateDrawer = () => {
    setEditingContact(null);
    form.resetFields();
    setDrawerVisible(true);
  };

  const handleOpenEditDrawer = (contact: Contact) => {
    setEditingContact(contact);
    form.setFieldsValue({
      companyId: contact.companyId,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      position: contact.position,
      department: contact.department,
      isPrimary: contact.isPrimary,
    });
    setDrawerVisible(true);
  };

  const handleSaveContact = async (values: any) => {
    try {
      if (editingContact) {
        const res: any = await crmService.updateContact(editingContact.id, values);
        if (res.success) {
          notification.success({ message: t('common.success'), description: t('common.update') });
          setDrawerVisible(false);
          setEditingContact(null);
          form.resetFields();
          fetchContacts();
        }
      } else {
        const res: any = await crmService.createContact(values);
        if (res.success) {
          notification.success({ message: t('common.success'), description: t('contacts.addContact') });
          setDrawerVisible(false);
          form.resetFields();
          fetchContacts();
        }
      }
    } catch (err: any) {
      notification.error({ message: t('common.error'), description: err.message });
    }
  };

  const columns = [
    {
      title: t('contacts.fullName'),
      key: 'name',
      render: (_: any, r: Contact) => (
        <div>
          <span className="font-bold text-slate-900">{r.lastName} {r.firstName}</span>
          {r.isPrimary && <Tag color="gold" className="ml-2">CHÍNH</Tag>}
        </div>
      ),
    },
    {
      title: t('contacts.company'),
      key: 'company',
      render: (_: any, r: Contact) => (
        <span className="font-medium text-slate-700">{r.company?.name || '—'}</span>
      ),
    },
    { title: t('contacts.position'), dataIndex: 'position', key: 'position' },
    { title: t('common.email'), dataIndex: 'email', key: 'email' },
    { title: t('common.phone'), dataIndex: 'phone', key: 'phone' },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_: any, record: Contact) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenEditDrawer(record)} />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('contacts.title')}</h1>
          <p className="text-sm text-slate-500">Danh bạ người liên hệ liên kết với các doanh nghiệp</p>
        </div>
        <PrimaryButton
          icon={<PlusOutlined />}
          onClick={handleOpenCreateDrawer}
        >
          {t('contacts.addContact')}
        </PrimaryButton>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <Input
          prefix={<SearchOutlined className="text-slate-400" />}
          placeholder={t('common.searchPlaceholder')}
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
        title={editingContact ? t('common.edit') : t('contacts.addContact')}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        width={450}
        extra={
          <Button type="primary" onClick={() => form.submit()} className="bg-indigo-600">
            {t('common.save')}
          </Button>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSaveContact}>
          <Form.Item name="companyId" label={t('contacts.company')}>
            <Select placeholder="Chọn công ty" allowClear>
              {companies.map((c) => (
                <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="firstName" label={t('leads.form.firstName')} rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="lastName" label={t('leads.form.lastName')} rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </div>

          <Form.Item name="email" label={t('common.email')}>
            <Input />
          </Form.Item>

          <Form.Item name="phone" label={t('common.phone')}>
            <Input />
          </Form.Item>

          <Form.Item name="position" label={t('contacts.position')}>
            <Input placeholder="Giám đốc công nghệ" />
          </Form.Item>

          <Form.Item name="department" label={t('contacts.department')}>
            <Input placeholder="Phòng CNTT" />
          </Form.Item>

          <Form.Item name="isPrimary" valuePropName="checked">
            <Checkbox>Là người liên hệ chính</Checkbox>
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Tag, Drawer, Form, notification, Select } from 'antd';
import { PlusOutlined, SearchOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons';
import { useBizNavigate } from '../../hooks/useBizNavigate';
import { useTranslation } from 'react-i18next';
import { crmService } from '../../services/crmService';
import { Company } from '../../types';
import { PrimaryButton } from '../../components/common/PrimaryButton';

export const CompanyListPage: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  const [form] = Form.useForm();
  const navigate = useBizNavigate();
  const { t } = useTranslation();

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res: any = await crmService.getCompanies({ page, limit: 10, search });
      if (res.success) {
        setCompanies(res.data);
        setTotal(res.meta.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [page, search]);

  const handleOpenCreateDrawer = () => {
    setEditingCompany(null);
    form.resetFields();
    setDrawerVisible(true);
  };

  const handleOpenEditDrawer = (company: Company) => {
    setEditingCompany(company);
    form.setFieldsValue({
      name: company.name,
      taxCode: company.taxCode,
      email: company.email,
      phone: company.phone,
      website: company.website,
      address: company.address,
      status: company.status || 'PROSPECT',
    });
    setDrawerVisible(true);
  };

  const handleSaveCompany = async (values: any) => {
    try {
      if (editingCompany) {
        const res: any = await crmService.updateCompany(editingCompany.id, values);
        if (res.success) {
          notification.success({ message: t('common.success'), description: t('common.update') });
          setDrawerVisible(false);
          setEditingCompany(null);
          form.resetFields();
          fetchCompanies();
        }
      } else {
        const res: any = await crmService.createCompany(values);
        if (res.success) {
          notification.success({ message: t('common.success'), description: t('companies.addCompany') });
          setDrawerVisible(false);
          form.resetFields();
          fetchCompanies();
        }
      }
    } catch (err: any) {
      notification.error({ message: t('common.error'), description: err.message });
    }
  };

  const columns = [
    {
      title: t('companies.title'),
      key: 'name',
      render: (_: any, record: Company) => (
        <div>
          <div
            className="font-bold text-slate-900 cursor-pointer hover:text-indigo-600 transition-colors"
            onClick={() => navigate(`/companies/${record.id}`)}
          >
            {record.name}
          </div>
          <div className="text-xs text-slate-400">MST: {record.taxCode || '—'}</div>
        </div>
      ),
    },
    {
      title: t('common.email') + ' / ' + t('companies.phone'),
      key: 'contact',
      render: (_: any, record: Company) => (
        <div className="text-xs">
          {record.email && <div>✉ {record.email}</div>}
          {record.phone && <div>📞 {record.phone}</div>}
        </div>
      ),
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color={status === 'ACTIVE' ? 'green' : 'blue'}>{status === 'ACTIVE' ? 'Hoạt động' : 'Tạm ngừng'}</Tag>,
    },
    {
      title: 'Phân loại',
      dataIndex: 'isCustomer',
      key: 'isCustomer',
      render: (isCustomer: boolean) => (
        <Tag color={isCustomer ? 'purple' : 'default'}>
          {isCustomer ? 'KHÁCH HÀNG' : 'TIỀM NĂNG'}
        </Tag>
      ),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_: any, record: Company) => (
        <div className="flex items-center gap-2">
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/companies/${record.id}`)} />
          <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenEditDrawer(record)} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('companies.title')}</h1>
          <p className="text-sm text-slate-500">Quản lý doanh nghiệp B2B và thông tin đối tác</p>
        </div>
        <PrimaryButton
          icon={<PlusOutlined />}
          onClick={handleOpenCreateDrawer}
        >
          {t('companies.addCompany')}
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
          dataSource={companies}
          rowKey="id"
          loading={loading}
          pagination={{ current: page, total, pageSize: 10, onChange: setPage }}
        />
      </div>

      <Drawer
        title={editingCompany ? t('common.edit') : t('companies.addCompany')}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        width={450}
        extra={
          <Button type="primary" onClick={() => form.submit()} className="bg-indigo-600">
            {t('common.save')}
          </Button>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSaveCompany}>
          <Form.Item name="name" label={t('companies.title')} rules={[{ required: true }]}>
            <Input placeholder="Tên công ty" />
          </Form.Item>

          <Form.Item name="taxCode" label="Mã số thuế (MST)">
            <Input placeholder="0100109106" />
          </Form.Item>

          <Form.Item name="email" label={t('common.email')}>
            <Input placeholder="contact@company.com" />
          </Form.Item>

          <Form.Item name="phone" label={t('companies.phone')}>
            <Input placeholder="02473007300" />
          </Form.Item>

          <Form.Item name="website" label={t('companies.website')}>
            <Input placeholder="https://company.com" />
          </Form.Item>

          <Form.Item name="address" label={t('companies.address')}>
            <Input.TextArea rows={2} />
          </Form.Item>

          <Form.Item name="status" label={t('common.status')} initialValue="PROSPECT">
            <Select>
              <Select.Option value="PROSPECT">Tiềm năng (Prospect)</Select.Option>
              <Select.Option value="ACTIVE">Hoạt động (Active)</Select.Option>
              <Select.Option value="INACTIVE">Ngừng hoạt động (Inactive)</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
};


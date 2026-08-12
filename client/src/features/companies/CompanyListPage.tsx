import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Tag, Drawer, Form, notification } from 'antd';
import { PlusOutlined, SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { crmService } from '../../services/crmService';
import { Company } from '../../types';

export const CompanyListPage: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);

  const [form] = Form.useForm();
  const navigate = useNavigate();
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

  const handleCreateCompany = async (values: any) => {
    try {
      const res: any = await crmService.createCompany(values);
      if (res.success) {
        notification.success({ message: t('common.success'), description: t('companies.addCompany') });
        setDrawerVisible(false);
        form.resetFields();
        fetchCompanies();
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
        <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/companies/${record.id}`)} />
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
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          className="bg-indigo-600 font-semibold rounded-lg"
          onClick={() => setDrawerVisible(true)}
        >
          {t('companies.addCompany')}
        </Button>
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
        title={t('companies.addCompany')}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        width={450}
        extra={
          <Button type="primary" onClick={() => form.submit()} className="bg-indigo-600">
            {t('common.save')}
          </Button>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleCreateCompany}>
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
        </Form>
      </Drawer>
    </div>
  );
};

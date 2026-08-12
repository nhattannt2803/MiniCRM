import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Tag } from 'antd';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { crmService } from '../../services/crmService';
import { Customer } from '../../types';

export const CustomerListPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const navigate = useNavigate();
  const { t } = useTranslation();

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res: any = await crmService.getCustomers({ page, limit: 10, search });
      if (res.success) {
        setCustomers(res.data);
        setTotal(res.meta.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, search]);

  const columns = [
    {
      title: 'Mã khách hàng',
      dataIndex: 'customerCode',
      key: 'customerCode',
      render: (code: string, r: Customer) => (
        <span
          className="font-bold text-indigo-600 cursor-pointer"
          onClick={() => navigate(`/customers/${r.id}`)}
        >
          {code}
        </span>
      ),
    },
    {
      title: 'Tên tài khoản',
      key: 'account',
      render: (_: any, r: Customer) => (
        <span className="font-bold text-slate-900">
          {r.entityType === 'COMPANY' ? r.company?.name : `${r.contact?.firstName} ${r.contact?.lastName}`}
        </span>
      ),
    },
    {
      title: 'Loại hình',
      dataIndex: 'entityType',
      key: 'entityType',
      render: (t: string) => <Tag color={t === 'COMPANY' ? 'purple' : 'blue'}>{t === 'COMPANY' ? 'DOANH NGHIỆP' : 'CÁ NHÂN'}</Tag>,
    },
    {
      title: 'Giá trị vòng đời (LTV)',
      dataIndex: 'lifetimeValue',
      key: 'lifetimeValue',
      render: (val: number) => (
        <span className="font-bold text-emerald-600">
          {Number(val).toLocaleString('vi-VN')} ₫
        </span>
      ),
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color="green">{status === 'ACTIVE' ? 'Đang hoạt động' : status}</Tag>,
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_: any, r: Customer) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/customers/${r.id}`)} />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('customers.title')}</h1>
        <p className="text-sm text-slate-500">Danh sách khách hàng chính thức từ cơ hội kinh doanh thành công</p>
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
          dataSource={customers}
          rowKey="id"
          loading={loading}
          pagination={{ current: page, total, pageSize: 10, onChange: setPage }}
        />
      </div>
    </div>
  );
};

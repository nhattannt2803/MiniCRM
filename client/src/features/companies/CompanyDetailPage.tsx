import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Tag, Button, Tabs, Table, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { crmService } from '../../services/crmService';
import { Company } from '../../types';
import { ActivityTimeline } from '../../components/Timeline/ActivityTimeline';

export const CompanyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    crmService
      .getCompanyById(id)
      .then((res: any) => {
        if (res.success) setCompany(res.data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !company) {
    return <div className="h-96 flex items-center justify-center"><Spin size="large" /></div>;
  }

  const contactColumns = [
    {
      title: 'Contact Name',
      key: 'name',
      render: (_: any, r: any) => `${r.firstName} ${r.lastName}`,
    },
    { title: 'Position', dataIndex: 'position', key: 'position' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
  ];

  const oppColumns = [
    { title: 'Opportunity Deal Name', dataIndex: 'name', key: 'name' },
    {
      title: 'Stage',
      key: 'stage',
      render: (_: any, r: any) => <Tag color="blue">{r.stage?.name}</Tag>,
    },
    {
      title: 'Amount (VND)',
      dataIndex: 'amount',
      key: 'amount',
      render: (v: number) => `${Number(v).toLocaleString('vi-VN')} ₫`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/companies')} />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{company.name}</h1>
            <Tag color={company.isCustomer ? 'purple' : 'blue'}>
              {company.isCustomer ? 'CUSTOMER' : 'PROSPECT'}
            </Tag>
          </div>
          <p className="text-sm text-slate-500">MST: {company.taxCode || 'N/A'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Company Information" className="shadow-xs border-slate-200 rounded-xl bg-white">
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-slate-400 font-medium block text-xs">Email</span>
              <span className="text-slate-800 font-semibold">{company.email || '—'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block text-xs">Phone</span>
              <span className="text-slate-800 font-semibold">{company.phone || '—'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block text-xs">Website</span>
              <span className="text-indigo-600 font-semibold">{company.website || '—'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block text-xs">Address</span>
              <span className="text-slate-800">{company.address || '—'}</span>
            </div>
          </div>
        </Card>

        <div className="lg:col-span-2">
          <Card className="shadow-xs border-slate-200 rounded-xl bg-white">
            <Tabs
              items={[
                {
                  key: 'contacts',
                  label: `Contacts (${company.contacts?.length || 0})`,
                  children: (
                    <Table
                      columns={contactColumns}
                      dataSource={company.contacts}
                      rowKey="id"
                      pagination={false}
                    />
                  ),
                },
                {
                  key: 'opportunities',
                  label: `Opportunities (${company.opportunities?.length || 0})`,
                  children: (
                    <Table
                      columns={oppColumns}
                      dataSource={company.opportunities}
                      rowKey="id"
                      pagination={false}
                    />
                  ),
                },
                {
                  key: 'timeline',
                  label: 'Activity Timeline',
                  children: <ActivityTimeline activities={company.activities || []} />,
                },
              ]}
            />
          </Card>
        </div>
      </div>
    </div>
  );
};

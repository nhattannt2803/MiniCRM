import React, { useState, useEffect } from 'react';
import { Card, Table, Tag } from 'antd';
import { crmService } from '../../services/crmService';

export const CampaignListPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    crmService.getCampaigns().then((res: any) => {
      if (res.success) setCampaigns(res.data);
      setLoading(false);
    });
  }, []);

  const columns = [
    { title: 'Campaign Name', dataIndex: 'name', key: 'name', render: (v: string) => <span className="font-bold text-slate-900">{v}</span> },
    { title: 'Code', dataIndex: 'code', key: 'code', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: 'Type', dataIndex: 'type', key: 'type', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: 'Budget', dataIndex: 'budget', key: 'budget', render: (v: number) => `${Number(v).toLocaleString('vi-VN')} ₫` },
    { title: 'Expected Revenue', dataIndex: 'expectedRevenue', key: 'expectedRevenue', render: (v: number) => <span className="font-bold text-emerald-600">{Number(v).toLocaleString('vi-VN')} ₫</span> },
    { title: 'Leads', dataIndex: 'leadCount', key: 'leadCount' },
    { title: 'Deals', dataIndex: 'opportunityCount', key: 'opportunityCount' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Marketing Campaigns</h1>
        <p className="text-sm text-slate-500">Source attribution & marketing campaign ROI analytics</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <Table columns={columns} dataSource={campaigns} rowKey="id" loading={loading} pagination={false} />
      </div>
    </div>
  );
};

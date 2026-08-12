import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Spin, Tag } from 'antd';
import {
  UsergroupAddOutlined,
  DollarOutlined,
  TrophyOutlined,
  AlertOutlined,
  RiseOutlined,
  FundOutlined,
} from '@ant-design/icons';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { crmService } from '../../services/crmService';

const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchDashboard = async () => {
    try {
      const res: any = await crmService.getDashboardStats();
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading || !data) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Spin size="large" tip="Loading real-time CRM Analytics..." />
      </div>
    );
  }

  const { kpis, funnel, pipelineByStage, leadBySource } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Executive CRM Dashboard</h1>
          <p className="text-sm text-slate-500">Real-time database analytics & sales pipeline metrics</p>
        </div>
        <Tag color="green" className="px-3 py-1 text-sm font-semibold rounded-full">
          Live Database Connection
        </Tag>
      </div>

      {/* KPI Cards Grid */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-xs border-slate-200 rounded-xl bg-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Leads</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{kpis.totalLeads}</div>
                <div className="text-xs text-indigo-600 font-medium mt-1">
                  New: {kpis.newLeads} | Qualified: {kpis.qualifiedLeads}
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl">
                <UsergroupAddOutlined />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-xs border-slate-200 rounded-xl bg-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pipeline Value</div>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {kpis.pipelineValue.toLocaleString('vi-VN')} ₫
                </div>
                <div className="text-xs text-slate-500 font-medium mt-1">
                  Weighted: {Math.round(kpis.weightedPipeline).toLocaleString('vi-VN')} ₫
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
                <DollarOutlined />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-xs border-slate-200 rounded-xl bg-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Won Revenue</div>
                <div className="text-2xl font-black text-emerald-600 mt-1">
                  {kpis.wonRevenue.toLocaleString('vi-VN')} ₫
                </div>
                <div className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                  <RiseOutlined /> Closed Deals
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
                <TrophyOutlined />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-xs border-slate-200 rounded-xl bg-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Overdue Tasks</div>
                <div className="text-2xl font-black text-rose-600 mt-1">{kpis.overdueTasks}</div>
                <div className="text-xs text-rose-500 font-medium mt-1 flex items-center gap-1">
                  <AlertOutlined /> Requires Action
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl">
                <AlertOutlined />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Charts Section */}
      <Row gutter={[16, 16]}>
        {/* Sales Funnel */}
        <Col xs={24} lg={12}>
          <Card title={<span className="font-bold text-slate-800"><FundOutlined className="mr-2" />Live Database Sales Funnel</span>} className="shadow-xs border-slate-200 rounded-xl bg-white">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnel} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="stage" type="category" width={110} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => [`${value} items`, 'Count']} />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        {/* Pipeline Distribution by Stage */}
        <Col xs={24} lg={12}>
          <Card title={<span className="font-bold text-slate-800"><DollarOutlined className="mr-2" />Pipeline Value by Stage</span>} className="shadow-xs border-slate-200 rounded-xl bg-white">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineByStage} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stageName" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `${v / 1000000}M`} />
                  <Tooltip formatter={(value: any) => [`${Number(value).toLocaleString('vi-VN')} ₫`, 'Total Amount']} />
                  <Bar dataKey="totalAmount" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Lead Sources Pie */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title={<span className="font-bold text-slate-800">Leads by Acquisition Source</span>} className="shadow-xs border-slate-200 rounded-xl bg-white">
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={leadBySource} dataKey="count" nameKey="source" cx="50%" cy="50%" outerRadius={80} label={(e) => `${e.source}: ${e.count}`}>
                    {leadBySource.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

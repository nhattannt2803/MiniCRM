import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Spin, Tag, Segmented } from 'antd';
import {
  UsergroupAddOutlined,
  DollarOutlined,
  TrophyOutlined,
  AlertOutlined,
  RiseOutlined,
  FundOutlined,
  ThunderboltOutlined,
  BarChartOutlined,
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
import { useTranslation } from 'react-i18next';
import { crmService } from '../../services/crmService';
import { LeaderDashboardView } from './LeaderDashboardView';

const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const DashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [leaderData, setLeaderData] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'LEADER' | 'ANALYTICS'>('LEADER');
  const { t } = useTranslation();

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [resStats, resLeader]: any[] = await Promise.all([
        crmService.getDashboardStats(),
        crmService.getLeaderDashboardStats(),
      ]);

      if (resStats.success) {
        setData(resStats.data);
      }
      if (resLeader.success) {
        setLeaderData(resLeader.data);
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

  if (loading || (!data && !leaderData)) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Spin size="large" tip={t('common.loading')} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            {viewMode === 'LEADER' ? t('dashboard.leaderTitle') : t('dashboard.title')}
          </h2>
          <p className="text-xs text-slate-500">
            {viewMode === 'LEADER' ? t('dashboard.leaderSubtitle') : t('dashboard.subtitle')}
          </p>
        </div>

        <Segmented
          value={viewMode}
          onChange={(val) => setViewMode(val as 'LEADER' | 'ANALYTICS')}
          options={[
            {
              label: (
                <span className="flex items-center gap-1.5 px-2 py-1 font-bold text-xs">
                  <ThunderboltOutlined className="text-amber-500" /> {t('dashboard.viewLeader')}
                </span>
              ),
              value: 'LEADER',
            },
            {
              label: (
                <span className="flex items-center gap-1.5 px-2 py-1 font-bold text-xs">
                  <BarChartOutlined className="text-indigo-500" /> {t('dashboard.viewAnalytics')}
                </span>
              ),
              value: 'ANALYTICS',
            },
          ]}
          className="bg-slate-100 p-1 rounded-xl"
        />
      </div>

      {/* Main Content Area */}
      {viewMode === 'LEADER' && leaderData ? (
        <LeaderDashboardView data={leaderData} onRefresh={fetchDashboard} />
      ) : (
        data && (
          <div className="space-y-6">
            {/* KPI Cards Grid */}
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} lg={6}>
                <Card className="shadow-xs border-slate-200 rounded-xl bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('dashboard.totalLeads')}</div>
                      <div className="text-2xl font-black text-slate-900 mt-1">{data.kpis.totalLeads}</div>
                      <div className="text-xs text-indigo-600 font-medium mt-1">
                        Mới: {data.kpis.newLeads} | Đủ ĐK: {data.kpis.qualifiedLeads}
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
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('dashboard.expectedRevenue')}</div>
                      <div className="text-2xl font-black text-slate-900 mt-1">
                        {data.kpis.pipelineValue.toLocaleString('vi-VN')} ₫
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-1">
                        Có trọng số: {Math.round(data.kpis.weightedPipeline).toLocaleString('vi-VN')} ₫
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
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('dashboard.wonDeals')}</div>
                      <div className="text-2xl font-black text-emerald-600 mt-1">
                        {data.kpis.wonRevenue.toLocaleString('vi-VN')} ₫
                      </div>
                      <div className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
                        <RiseOutlined /> Đã chốt thành công
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
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nhiệm vụ quá hạn</div>
                      <div className="text-2xl font-black text-rose-600 mt-1">{data.kpis.overdueTasks}</div>
                      <div className="text-xs text-rose-500 font-medium mt-1 flex items-center gap-1">
                        <AlertOutlined /> Cần xử lý ngay
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
                <Card title={<span className="font-bold text-slate-800"><FundOutlined className="mr-2" />{t('dashboard.pipelineTitle')}</span>} className="shadow-xs border-slate-200 rounded-xl bg-white">
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.funnel} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" />
                        <YAxis dataKey="stage" type="category" width={110} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value) => [`${value}`, 'Số lượng']} />
                        <Bar dataKey="count" fill="#6366f1" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </Col>

              {/* Pipeline Distribution by Stage */}
              <Col xs={24} lg={12}>
                <Card title={<span className="font-bold text-slate-800"><DollarOutlined className="mr-2" />Giá trị theo giai đoạn</span>} className="shadow-xs border-slate-200 rounded-xl bg-white">
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.pipelineByStage} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="stageName" tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={(v) => `${v / 1000000}M`} />
                        <Tooltip formatter={(value: any) => [`${Number(value).toLocaleString('vi-VN')} ₫`, 'Tổng số tiền']} />
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
                <Card title={<span className="font-bold text-slate-800">Tỷ lệ theo nguồn tiềm năng</span>} className="shadow-xs border-slate-200 rounded-xl bg-white">
                  <div className="h-64 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.leadBySource} dataKey="count" nameKey="source" cx="50%" cy="50%" outerRadius={80} label={(e) => `${e.source}: ${e.count}`}>
                          {data.leadBySource.map((entry: any, index: number) => (
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
        )
      )}
    </div>
  );
};

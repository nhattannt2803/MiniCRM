import React, { useState, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Select,
  Button,
  Tag,
  Table,
  Input,
  Space,
  Segmented,
  Tooltip as AntTooltip,
  Badge,
  Alert,
  Statistic,
  Progress,
} from 'antd';
import {
  BarChartOutlined,
  DollarOutlined,
  UsergroupAddOutlined,
  TrophyOutlined,
  FilterOutlined,
  ReloadOutlined,
  DownloadOutlined,
  SearchOutlined,
  RiseOutlined,
  FallOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  FireOutlined,
  GlobalOutlined,
  FieldTimeOutlined,
  FunnelPlotOutlined,
  PieChartOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useBizNavigate } from '../../hooks/useBizNavigate';

const { Option } = Select;

// Colors for Pie and Charts
const PIE_COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

// Mock Dataset Generator based on active filters
const generateMockAnalytics = (range: string, fanpage: string, source: string) => {
  const daysCount = range === '7d' ? 7 : range === '30d' ? 30 : range === 'today' ? 1 : 14;

  // Daily time series mock data
  const timeSeriesData = [];
  const today = new Date();

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric' });

    // Seeded pseudo-randomness for smooth realism
    const baseMultiplier = fanpage === 'all' ? 1 : 0.4;
    const leads = Math.floor((35 + Math.sin(i * 0.8) * 15 + (i % 5) * 4) * baseMultiplier);
    const converted = Math.floor(leads * (0.28 + (i % 3) * 0.04));
    const cost = Math.floor(leads * (28000 + (i % 7) * 2500));

    timeSeriesData.push({
      date: dateStr,
      fullDate: d.toISOString().split('T')[0],
      leads,
      converted,
      contacted: Math.floor(leads * 0.8),
      qualified: Math.floor(leads * 0.5),
      cost,
      cpl: Math.round(cost / (leads || 1)),
    });
  }

  // Calculate totals
  const totalLeads = timeSeriesData.reduce((sum, item) => sum + item.leads, 0);
  const totalConverted = timeSeriesData.reduce((sum, item) => sum + item.converted, 0);
  const totalCost = timeSeriesData.reduce((sum, item) => sum + item.cost, 0);
  const avgCpl = totalLeads > 0 ? Math.round(totalCost / totalLeads) : 0;
  const convRate = totalLeads > 0 ? Number(((totalConverted / totalLeads) * 100).toFixed(1)) : 0;

  // Top Ads Table Mock Data
  const rawAds = [
    {
      ad_id: 'AD_FB_8892',
      ad_name: 'Quảng cáo Xe Điện Xmen 2026 - Giảm 2 Triệu',
      page_name: 'Xe Điện Move HCM',
      pageid: 'PAGE_101',
      source: 'Facebook Ads',
      leads: Math.floor(totalLeads * 0.28),
      converted: Math.floor(totalConverted * 0.3),
      cost: Math.floor(totalCost * 0.22),
    },
    {
      ad_id: 'AD_FB_9914',
      ad_name: 'Xe Máy Điện Gogo - Trả Góp 0% Không Cần Trả Trước',
      page_name: 'Xe Điện VinFast Official',
      pageid: 'PAGE_102',
      source: 'Facebook Ads',
      leads: Math.floor(totalLeads * 0.22),
      converted: Math.floor(totalConverted * 0.24),
      cost: Math.floor(totalCost * 0.25),
    },
    {
      ad_id: 'AD_GG_4410',
      ad_name: 'Google Search - Tìm Mua Xe Điện Nữ Đẹp Hà Nội',
      page_name: 'Xe Điện Hà Nội',
      pageid: 'PAGE_103',
      source: 'Google Ads',
      leads: Math.floor(totalLeads * 0.18),
      converted: Math.floor(totalConverted * 0.2),
      cost: Math.floor(totalCost * 0.19),
    },
    {
      ad_id: 'AD_TK_7701',
      ad_name: 'TikTok Short Video Review Xe Điện Vespa 120km/h',
      page_name: 'Xe Điện Move HCM',
      pageid: 'PAGE_101',
      source: 'TikTok Ads',
      leads: Math.floor(totalLeads * 0.16),
      converted: Math.floor(totalConverted * 0.14),
      cost: Math.floor(totalCost * 0.15),
    },
    {
      ad_id: 'AD_FB_3309',
      ad_name: 'Chương Trình Đổi Xe Cũ Lấy Xe Điện Mới 2026',
      page_name: 'Xe Điện VinFast Official',
      pageid: 'PAGE_102',
      source: 'Facebook Ads',
      leads: Math.floor(totalLeads * 0.11),
      converted: Math.floor(totalConverted * 0.08),
      cost: Math.floor(totalCost * 0.12),
    },
    {
      ad_id: 'AD_WEB_001',
      ad_name: 'Form Đăng Ký Lái Thử Trên Website Chi Nhánh',
      page_name: 'Website Form',
      pageid: 'PAGE_WEB',
      source: 'Webform Direct',
      leads: Math.floor(totalLeads * 0.05),
      converted: Math.floor(totalConverted * 0.04),
      cost: 0,
    },
  ];

  const topAds = rawAds
    .filter((a) => (fanpage === 'all' || a.pageid === fanpage) && (source === 'all' || a.source === source))
    .map((ad) => {
      const cpl = ad.leads > 0 ? Math.round(ad.cost / ad.leads) : 0;
      const rate = ad.leads > 0 ? Number(((ad.converted / ad.leads) * 100).toFixed(1)) : 0;
      let performanceTag: 'TOP_ROI' | 'GOOD' | 'HIGH_CPL' = 'GOOD';
      if (cpl > 0 && cpl < 32000 && rate > 25) performanceTag = 'TOP_ROI';
      else if (cpl > 45000) performanceTag = 'HIGH_CPL';

      return {
        ...ad,
        cpl,
        convRate: rate,
        performanceTag,
      };
    })
    .sort((a, b) => b.leads - a.leads);

  // Lead Funnel Stages
  const funnelData = [
    { stage: '1. Lead Mới (Raw)', count: totalLeads, percentage: 100, fill: '#6366f1' },
    { stage: '2. Đã Liên Hệ (Contacted)', count: Math.floor(totalLeads * 0.79), percentage: 79.0, fill: '#3b82f6' },
    { stage: '3. Đủ Điều Kiện (Qualified)', count: Math.floor(totalLeads * 0.49), percentage: 49.0, fill: '#06b6d4' },
    { stage: '4. Chuyển Đổi Thành Công', count: totalConverted, percentage: convRate, fill: '#10b981' },
  ];

  // Lead Breakdown by Source
  const sourceBreakdown = [
    { name: 'Facebook Ads', value: Math.floor(totalLeads * 0.52), cost: Math.floor(totalCost * 0.55) },
    { name: 'TikTok Ads', value: Math.floor(totalLeads * 0.22), cost: Math.floor(totalCost * 0.2) },
    { name: 'Google Ads', value: Math.floor(totalLeads * 0.16), cost: Math.floor(totalCost * 0.25) },
    { name: 'Webform Direct', value: Math.floor(totalLeads * 0.1), cost: 0 },
  ];

  // Lead Quality Scores
  const qualityScores = [
    { scoreRange: 'Chất lượng Thấp (< 40đ)', count: Math.floor(totalLeads * 0.15), color: '#ef4444' },
    { scoreRange: 'Trung bình (40 - 70đ)', count: Math.floor(totalLeads * 0.42), color: '#f59e0b' },
    { scoreRange: 'Rất Tiềm năng (> 70đ)', count: Math.floor(totalLeads * 0.43), color: '#10b981' },
  ];

  return {
    timeSeriesData,
    summary: {
      totalLeads,
      totalConverted,
      totalCost,
      avgCpl,
      convRate,
      deltaLeads: '+18.4%',
      deltaCpl: '-8.2%',
      deltaConv: '+4.1%',
      topAdId: topAds[0]?.ad_id || 'N/A',
      topPageName: topAds[0]?.page_name || 'N/A',
    },
    topAds,
    funnelData,
    sourceBreakdown,
    qualityScores,
  };
};

export const LeadAnalyticsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useBizNavigate();

  // Filters State
  const [range, setRange] = useState<string>('30d');
  const [selectedFanpage, setSelectedFanpage] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [adSearch, setAdSearch] = useState<string>('');
  const [chartMetric, setChartMetric] = useState<'leads' | 'cpl'>('leads');
  const [dataSourceMode, setDataSourceMode] = useState<'MOCKUP' | 'LIVE_SCHEMA'>('MOCKUP');

  // Compute analytics data based on filters
  const data = useMemo(() => {
    return generateMockAnalytics(range, selectedFanpage, selectedSource);
  }, [range, selectedFanpage, selectedSource]);

  // Filter top ads by search input
  const filteredAds = useMemo(() => {
    if (!adSearch.trim()) return data.topAds;
    const query = adSearch.toLowerCase();
    return data.topAds.filter(
      (a) =>
        a.ad_id.toLowerCase().includes(query) ||
        a.ad_name.toLowerCase().includes(query) ||
        a.page_name.toLowerCase().includes(query)
    );
  }, [data.topAds, adSearch]);

  // Export CSV mock function
  const handleExportCsv = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Ad ID,Ad Name,Fanpage,Source,Leads,Converted,Conv Rate %,Cost (VND),CPL (VND)']
        .concat(
          filteredAds.map(
            (a) => `${a.ad_id},"${a.ad_name}","${a.page_name}",${a.source},${a.leads},${a.converted},${a.convRate}%,${a.cost},${a.cpl}`
          )
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Lead_Analytics_Report_${range}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Table Columns Setup
  const columns = [
    {
      title: 'Hạng',
      key: 'rank',
      width: 65,
      render: (_: any, __: any, index: number) => (
        <span
          className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
            index === 0
              ? 'bg-amber-400 text-amber-950 shadow-xs'
              : index === 1
              ? 'bg-slate-300 text-slate-800'
              : index === 2
              ? 'bg-amber-700/30 text-amber-900'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          {index + 1}
        </span>
      ),
    },
    {
      title: 'Mã Ads (ad_id) & Chiến Dịch',
      dataIndex: 'ad_id',
      key: 'ad_id',
      render: (ad_id: string, record: any) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-xs">
              {ad_id}
            </span>
            {record.performanceTag === 'TOP_ROI' && (
              <Tag color="gold" className="font-bold border-0 text-[10px] flex items-center gap-1">
                <FireOutlined /> TOP ROI
              </Tag>
            )}
            {record.performanceTag === 'HIGH_CPL' && (
              <Tag color="error" className="font-bold border-0 text-[10px] flex items-center gap-1">
                <WarningOutlined /> CPL Cao
              </Tag>
            )}
          </div>
          <div className="text-xs font-medium text-slate-800 mt-1 line-clamp-1">{record.ad_name}</div>
        </div>
      ),
    },
    {
      title: 'Fanpage (page_name)',
      dataIndex: 'page_name',
      key: 'page_name',
      render: (page: string, record: any) => (
        <div>
          <span className="font-semibold text-slate-800 text-xs">{page}</span>
          <div className="text-[10px] text-slate-400 font-mono">{record.pageid}</div>
        </div>
      ),
    },
    {
      title: 'Nguồn',
      dataIndex: 'source',
      key: 'source',
      render: (source: string) => (
        <Tag
          color={
            source.includes('Facebook')
              ? 'blue'
              : source.includes('TikTok')
              ? 'magenta'
              : source.includes('Google')
              ? 'green'
              : 'default'
          }
          className="font-semibold text-xs rounded-md"
        >
          {source}
        </Tag>
      ),
    },
    {
      title: 'Tổng Lead',
      dataIndex: 'leads',
      key: 'leads',
      sorter: (a: any, b: any) => a.leads - b.leads,
      render: (val: number) => <span className="font-extrabold text-slate-900 text-sm">{val.toLocaleString()}</span>,
    },
    {
      title: 'Chuyển Đổi',
      dataIndex: 'converted',
      key: 'converted',
      render: (val: number, record: any) => (
        <div>
          <span className="font-bold text-emerald-600 text-xs">{val.toLocaleString()} lead</span>
          <span className="text-[11px] text-slate-400 block font-medium">({record.convRate}%)</span>
        </div>
      ),
    },
    {
      title: 'Tổng Chi Phí (VNĐ)',
      dataIndex: 'cost',
      key: 'cost',
      sorter: (a: any, b: any) => a.cost - b.cost,
      render: (val: number) => (
        <span className="font-semibold text-slate-700 text-xs">
          {val > 0 ? `${val.toLocaleString('vi-VN')} ₫` : 'Miễn phí'}
        </span>
      ),
    },
    {
      title: 'CPL (VNĐ/Lead)',
      dataIndex: 'cpl',
      key: 'cpl',
      sorter: (a: any, b: any) => a.cpl - b.cpl,
      render: (val: number) => (
        <span
          className={`font-black text-xs px-2.5 py-1 rounded-lg inline-block ${
            val === 0
              ? 'bg-slate-100 text-slate-500'
              : val < 35000
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : val < 45000
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {val > 0 ? `${val.toLocaleString('vi-VN')} ₫` : '0 ₫'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Compact Ant Design Header & Filter Card */}
      <Card className="shadow-xs border-slate-200 rounded-xl bg-white p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2 m-0">
                <BarChartOutlined className="text-indigo-600" /> Báo Cáo Thống Kê Lead & Hiệu Suất Quảng Cáo
              </h2>
              <Tag color="blue" className="font-semibold border-0 text-[11px] m-0">
                Smax.ai & Ads Analytics
              </Tag>
            </div>
            <p className="text-xs text-slate-500 mt-1 m-0">
              Phân tích số liệu Lead theo ngày, xếp hạng top quảng cáo (`ad_id`), CPL và phễu chuyển đổi từ quảng cáo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Segmented
              size="small"
              value={dataSourceMode}
              onChange={(val) => setDataSourceMode(val as 'MOCKUP' | 'LIVE_SCHEMA')}
              options={[
                {
                  label: <span className="text-xs font-semibold px-1">🧪 Mockup Data</span>,
                  value: 'MOCKUP',
                },
                {
                  label: (
                    <span className="flex items-center gap-1 text-xs font-semibold px-1 text-emerald-600">
                      <ThunderboltOutlined /> Outbox DB
                    </span>
                  ),
                  value: 'LIVE_SCHEMA',
                },
              ]}
              className="bg-slate-100"
            />
            <Button
              type="primary"
              size="small"
              icon={<DownloadOutlined />}
              onClick={handleExportCsv}
              className="font-semibold text-xs rounded-lg h-7"
            >
              Xuất CSV
            </Button>
          </div>
        </div>

        {/* Compact Filters Toolbar */}
        <div className="pt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <FieldTimeOutlined className="text-slate-400" />
              <span>Thời gian:</span>
              <Select
                size="small"
                value={range}
                onChange={setRange}
                className="w-32 text-xs"
              >
                <Option value="today">Hôm nay</Option>
                <Option value="7d">7 ngày qua</Option>
                <Option value="30d">30 ngày qua</Option>
                <Option value="this_month">Tháng này</Option>
              </Select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <GlobalOutlined className="text-slate-400" />
              <span>Fanpage:</span>
              <Select
                size="small"
                value={selectedFanpage}
                onChange={setSelectedFanpage}
                className="w-48 text-xs"
              >
                <Option value="all">Tất cả Fanpage</Option>
                <Option value="PAGE_101">Xe Điện Move HCM</Option>
                <Option value="PAGE_102">Xe Điện VinFast Official</Option>
                <Option value="PAGE_103">Xe Điện Hà Nội</Option>
              </Select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <FilterOutlined className="text-slate-400" />
              <span>Nguồn:</span>
              <Select
                size="small"
                value={selectedSource}
                onChange={setSelectedSource}
                className="w-40 text-xs"
              >
                <Option value="all">Tất cả Nguồn</Option>
                <Option value="Facebook Ads">Facebook Ads</Option>
                <Option value="TikTok Ads">TikTok Ads</Option>
                <Option value="Google Ads">Google Ads</Option>
                <Option value="Webform Direct">Webform Direct</Option>
              </Select>
            </div>
          </div>

          <div className="text-[11px] text-slate-400">
            Cập nhật lúc: <span className="font-semibold text-slate-600">{new Date().toLocaleTimeString('vi-VN')}</span>
          </div>
        </div>
      </Card>

      {/* 2. Top Summary KPI Cards */}
      <Row gutter={[16, 16]}>
        {/* KPI 1: Total Leads */}
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-xs border-slate-200 rounded-2xl bg-white hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng Lead Nhận Được</span>
                <div className="text-2xl font-black text-slate-900 mt-1 flex items-baseline gap-2">
                  {data.summary.totalLeads.toLocaleString()}
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-0.5">
                    <RiseOutlined /> {data.summary.deltaLeads}
                  </span>
                </div>
                <div className="text-xs text-indigo-600 font-semibold mt-1">
                  Đã chuyển đổi: <span className="font-black">{data.summary.totalConverted}</span> lead
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl font-black">
                <UsergroupAddOutlined />
              </div>
            </div>
          </Card>
        </Col>

        {/* KPI 2: Total Ad Spend & CPL */}
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-xs border-slate-200 rounded-2xl bg-white hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ngân Sách Ads & CPL</span>
                <div className="text-2xl font-black text-slate-900 mt-1 flex items-baseline gap-2">
                  {data.summary.avgCpl.toLocaleString('vi-VN')} ₫
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-0.5">
                    <FallOutlined /> {data.summary.deltaCpl}
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-medium mt-1">
                  Tổng chi: <span className="font-bold text-slate-800">{data.summary.totalCost.toLocaleString('vi-VN')} ₫</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl">
                <DollarOutlined />
              </div>
            </div>
          </Card>
        </Col>

        {/* KPI 3: Conversion Rate */}
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-xs border-slate-200 rounded-2xl bg-white hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tỷ Lệ Chốt (Conv. Rate)</span>
                <div className="text-2xl font-black text-emerald-600 mt-1 flex items-baseline gap-2">
                  {data.summary.convRate}%
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-0.5">
                    <RiseOutlined /> {data.summary.deltaConv}
                  </span>
                </div>
                <div className="text-xs text-emerald-700 font-medium mt-1">
                  Hiệu quả chốt deal từ lead quảng cáo
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center text-2xl">
                <TrophyOutlined />
              </div>
            </div>
          </Card>
        </Col>

        {/* KPI 4: Top Performing Ad ID */}
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-xs border-slate-200 rounded-2xl bg-white hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Quảng Cáo Hiệu Quả</span>
                <div className="text-lg font-black text-indigo-600 mt-1 truncate">
                  {data.summary.topAdId}
                </div>
                <div className="text-xs text-slate-500 font-medium mt-1 truncate">
                  Fanpage: <span className="font-bold text-slate-800">{data.summary.topPageName}</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl shrink-0">
                <FireOutlined />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 3. Main Chart Section */}
      <Row gutter={[16, 16]}>
        {/* Composed Chart: Leads & Ad Cost Trend */}
        <Col xs={24} lg={16}>
          <Card
            title={
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                  <BarChartOutlined className="text-indigo-600" /> Biểu Đồ Xu Hướng Lead & Chi Phí Ads Theo Ngày
                </span>
                <Segmented
                  size="small"
                  value={chartMetric}
                  onChange={(val) => setChartMetric(val as 'leads' | 'cpl')}
                  options={[
                    { label: 'Số Lead', value: 'leads' },
                    { label: 'Chi phí / CPL', value: 'cpl' },
                  ]}
                />
              </div>
            }
            className="shadow-xs border-slate-200 rounded-2xl bg-white"
          >
            <div className="h-80 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.timeSeriesData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(v) => `${v / 1000}k`}
                    tick={{ fontSize: 11, fill: '#10b981' }}
                  />
                  <RechartsTooltip
                    formatter={(value: any, name: string) => {
                      if (name === 'cost') return [`${Number(value).toLocaleString('vi-VN')} ₫`, 'Chi phí Ads'];
                      if (name === 'cpl') return [`${Number(value).toLocaleString('vi-VN')} ₫`, 'CPL (VND/lead)'];
                      if (name === 'leads') return [`${value} lead`, 'Tổng Lead'];
                      if (name === 'converted') return [`${value} lead`, 'Đã Chuyển Đổi'];
                      return [value, name];
                    }}
                    contentStyle={{ borderRadius: '12px', borderColor: '#e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar yAxisId="left" dataKey="leads" name="leads" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={20} />
                  <Bar yAxisId="left" dataKey="converted" name="converted" fill="#10b981" radius={[6, 6, 0, 0]} barSize={20} />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey={chartMetric === 'leads' ? 'cost' : 'cpl'}
                    name={chartMetric === 'leads' ? 'cost' : 'cpl'}
                    stroke="#ec4899"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#ec4899' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        {/* Funnel & Conversion Breakdown */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <span className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <FunnelPlotOutlined className="text-indigo-600" /> Phễu Chuyển Đổi Lead
              </span>
            }
            className="shadow-xs border-slate-200 rounded-2xl bg-white"
          >
            <div className="space-y-4 py-2">
              {data.funnelData.map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>{item.stage}</span>
                    <span className="text-indigo-600 font-extrabold">{item.count} lead ({item.percentage}%)</span>
                  </div>
                  <Progress
                    percent={item.percentage}
                    strokeColor={item.fill}
                    showInfo={false}
                    strokeWidth={10}
                    className="m-0"
                  />
                </div>
              ))}
              <Alert
                message="Tối ưu hóa Phễu"
                description="Tỷ lệ rơi rớt cao nhất xảy ra ở giai đoạn Đã Liên Hệ -> Đủ Điều Kiện. Đội Telesale cần rút ngắn thời gian phản hồi xuống < 15 phút."
                type="info"
                showIcon
                className="mt-4 rounded-xl text-xs"
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* 4. Distribution Breakdown & Quality Scores */}
      <Row gutter={[16, 16]}>
        {/* Donut Chart: Nguồn Lead */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <span className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <PieChartOutlined className="text-indigo-600" /> Tỷ Lệ Lead Theo Nguồn Quảng Cáo
              </span>
            }
            className="shadow-xs border-slate-200 rounded-2xl bg-white"
          >
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.sourceBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                  >
                    {data.sourceBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(val: any) => [`${val} lead`, 'Số lượng']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        {/* Bar Chart: Điểm Đánh Giá Chất Lượng Lead */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <span className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <CheckCircleOutlined className="text-indigo-600" /> Phân Phối Điểm Chất Lượng Lead (Lead Score)
              </span>
            }
            className="shadow-xs border-slate-200 rounded-2xl bg-white"
          >
            <div className="h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.qualityScores} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="scoreRange" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip formatter={(val: any) => [`${val} lead`, 'Số lượng']} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={40}>
                    {data.qualityScores.map((entry, index) => (
                      <Cell key={`cell-score-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 5. Top Ad IDs Detailed Performance Table */}
      <Card
        title={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <TrophyOutlined className="text-amber-500" /> Bảng Xếp Hạng Quảng Cáo (Top Ads Performance)
              </h3>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                Thống kê chi tiết theo `ad_id`, `page_name`, số lượng lead thu được, chi phí và CPL.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Input
                prefix={<SearchOutlined className="text-slate-400 text-xs" />}
                placeholder="Tìm mã ad_id, fanpage..."
                value={adSearch}
                onChange={(e) => setAdSearch(e.target.value)}
                allowClear
                className="w-64 text-xs rounded-xl shadow-2xs"
              />
            </div>
          </div>
        }
        className="shadow-xs border-slate-200 rounded-2xl bg-white overflow-hidden"
      >
        <Table
          dataSource={filteredAds}
          columns={columns}
          rowKey="ad_id"
          pagination={{ pageSize: 5, showSizeChanger: false }}
          size="middle"
          className="text-xs"
        />
      </Card>
    </div>
  );
};

export default LeadAnalyticsPage;

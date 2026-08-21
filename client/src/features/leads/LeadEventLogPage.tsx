import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import {
  Table,
  Card,
  Tag,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Row,
  Col,
  Statistic,
  Tooltip,
  Breadcrumb,
  message,
} from 'antd';
import {
  HistoryOutlined,
  ApiOutlined,
  UserOutlined,
  SearchOutlined,
  ReloadOutlined,
  ClearOutlined,
  MergeOutlined,
  PlusCircleOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
  MailOutlined,
  FilterOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { crmService } from '../../services/crmService';
import { useBizNavigate } from '../../hooks/useBizNavigate';

const { RangePicker } = DatePicker;

interface LeadCreationLogItem {
  id: string;
  bizId: string;
  leadId: string | null;
  creationMethod: 'API' | 'MANUAL';
  duplicateStrategy: 'MERGED' | 'CREATED_NEW';
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  source: string | null;
  actorId: string | null;
  actorName: string | null;
  notes: string | null;
  createdAt: string;
  leadStatus: string | null;
}

interface LogStats {
  totalEvents: number;
  totalApi: number;
  totalManual: number;
  totalMerged: number;
  totalCreatedNew: number;
}

export const LeadEventLogPage: React.FC = () => {
  const bizNavigate = useBizNavigate();

  const [loading, setLoading] = useState<boolean>(false);
  const [logs, setLogs] = useState<LeadCreationLogItem[]>([]);
  const [stats, setStats] = useState<LogStats>({
    totalEvents: 0,
    totalApi: 0,
    totalManual: 0,
    totalMerged: 0,
    totalCreatedNew: 0,
  });

  // Filters state
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [creationMethod, setCreationMethod] = useState<string>('ALL');
  const [duplicateStrategy, setDuplicateStrategy] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        pageSize,
      };

      if (dateRange && dateRange[0] && dateRange[1]) {
        params.fromDate = dateRange[0].startOf('day').toISOString();
        params.toDate = dateRange[1].endOf('day').toISOString();
      }

      if (creationMethod !== 'ALL') {
        params.creationMethod = creationMethod;
      }

      if (duplicateStrategy !== 'ALL') {
        params.duplicateStrategy = duplicateStrategy;
      }

      if (search.trim()) {
        params.search = search.trim();
      }

      const res: any = await crmService.getLeadEvents(params);
      if (res?.success) {
        setLogs(res.data || []);
        if (res.pagination) {
          setTotal(res.pagination.total || 0);
        }
        if (res.stats) {
          setStats(res.stats);
        }
      }
    } catch (error: any) {
      console.error('Lỗi khi tải lịch sử tạo Lead:', error);
      message.error('Không thể tải lịch sử tạo Lead');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, dateRange, creationMethod, duplicateStrategy, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleResetFilters = () => {
    setDateRange(null);
    setCreationMethod('ALL');
    setDuplicateStrategy('ALL');
    setSearch('');
    setPage(1);
  };

  const columns = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (val: string) => (
        <Space size={6} className="text-slate-700 font-medium text-xs">
          <ClockCircleOutlined className="text-indigo-500" />
          <span>{dayjs(val).format('DD/MM/YYYY HH:mm:ss')}</span>
        </Space>
      ),
    },
    {
      title: 'Thông tin khách hàng',
      key: 'customerInfo',
      render: (_: any, record: LeadCreationLogItem) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 text-sm">
              {record.customerName || 'Chưa cập nhật tên'}
            </span>
            {record.leadId && (
              <Tooltip title="Xem chi tiết Lead">
                <Button
                  type="link"
                  size="small"
                  icon={<LinkOutlined />}
                  className="p-0 text-indigo-600 hover:text-indigo-800"
                  onClick={() => bizNavigate(`/leads/${record.leadId}`)}
                >
                  #{record.leadId}
                </Button>
              </Tooltip>
            )}
            {record.source && (
              <Tag color="blue" className="text-[11px] px-1.5 py-0 font-normal">
                {record.source}
              </Tag>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
            {record.customerPhone && (
              <span className="inline-flex items-center gap-1">
                <PhoneOutlined className="text-emerald-500" />
                {record.customerPhone}
              </span>
            )}
            {record.customerEmail && (
              <span className="inline-flex items-center gap-1">
                <MailOutlined className="text-amber-500" />
                {record.customerEmail}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Phương án tạo Lead',
      dataIndex: 'duplicateStrategy',
      key: 'duplicateStrategy',
      width: 220,
      render: (val: string) => {
        if (val === 'MERGED') {
          return (
            <Tag icon={<MergeOutlined />} color="warning" className="px-2.5 py-1 text-xs rounded-full font-medium">
              Gộp khách hàng (Gộp nhu cầu)
            </Tag>
          );
        }
        return (
          <Tag icon={<PlusCircleOutlined />} color="success" className="px-2.5 py-1 text-xs rounded-full font-medium">
            Tạo mới không trùng lặp
          </Tag>
        );
      },
    },
    {
      title: 'Phương thức',
      dataIndex: 'creationMethod',
      key: 'creationMethod',
      width: 170,
      render: (val: string) => {
        if (val === 'API') {
          return (
            <Tag icon={<ApiOutlined />} color="purple" className="px-2.5 py-1 text-xs rounded-full font-medium">
              Tạo bằng API / External
            </Tag>
          );
        }
        return (
          <Tag icon={<UserOutlined />} color="processing" className="px-2.5 py-1 text-xs rounded-full font-medium">
            Tạo tay trên CRM
          </Tag>
        );
      },
    },
    {
      title: 'Người thực hiện',
      dataIndex: 'actorName',
      key: 'actorName',
      width: 180,
      render: (val: string, record: LeadCreationLogItem) => (
        <span className="text-xs text-slate-600">
          {val || (record.creationMethod === 'API' ? 'Hệ thống API / Webhook' : 'CRM User')}
        </span>
      ),
    },
    {
      title: 'Ghi chú / Chi tiết',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
      render: (val: string) => (
        <span className="text-xs text-slate-500 italic">
          {val || '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header & Breadcrumb */}
      <div>
        <Breadcrumb
          items={[
            { title: 'Trang chủ' },
            { title: 'Quản lý Lead' },
            { title: 'Sự kiện tạo Lead' },
          ]}
          className="mb-2 text-xs"
        />
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <HistoryOutlined className="text-indigo-600" />
            Lịch sử & Sự kiện Tạo Lead
          </span>
        }
        subtitle="Nhật ký chi tiết các sự kiện tạo lead, phương án xử lý trùng lặp và phương thức tạo của doanh nghiệp hiện tại."
        extra={
          <Button
            icon={<ReloadOutlined className="text-slate-600 text-xs" />}
            onClick={() => fetchLogs()}
            loading={loading}
            className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg h-8 px-3 flex items-center gap-1.5 shadow-2xs hover:border-slate-300"
          >
            Làm mới
          </Button>
        }
      />
      </div>

      {/* Summary Statistics Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={4.8} lg={4.8}>
          <Card className="shadow-sm rounded-xl border border-slate-200 hover:border-indigo-300 transition-all">
            <Statistic
              title={<span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng số sự kiện</span>}
              value={stats.totalEvents}
              valueStyle={{ color: '#4f46e5', fontWeight: 'bold' }}
              prefix={<HistoryOutlined className="mr-1" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4.8} lg={4.8}>
          <Card className="shadow-sm rounded-xl border border-slate-200 hover:border-purple-300 transition-all">
            <Statistic
              title={<span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tạo bằng API</span>}
              value={stats.totalApi}
              valueStyle={{ color: '#7c3aed', fontWeight: 'bold' }}
              prefix={<ApiOutlined className="mr-1" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4.8} lg={4.8}>
          <Card className="shadow-sm rounded-xl border border-slate-200 hover:border-blue-300 transition-all">
            <Statistic
              title={<span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tạo tay</span>}
              value={stats.totalManual}
              valueStyle={{ color: '#2563eb', fontWeight: 'bold' }}
              prefix={<UserOutlined className="mr-1" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4.8} lg={4.8}>
          <Card className="shadow-sm rounded-xl border border-slate-200 hover:border-amber-300 transition-all">
            <Statistic
              title={<span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gộp khách hàng</span>}
              value={stats.totalMerged}
              valueStyle={{ color: '#d97706', fontWeight: 'bold' }}
              prefix={<MergeOutlined className="mr-1" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={4.8} lg={4.8}>
          <Card className="shadow-sm rounded-xl border border-slate-200 hover:border-emerald-300 transition-all">
            <Statistic
              title={<span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tạo mới không trùng</span>}
              value={stats.totalCreatedNew}
              valueStyle={{ color: '#059669', fontWeight: 'bold' }}
              prefix={<PlusCircleOutlined className="mr-1" />}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Filter & Data Table Card */}
      <Card className="shadow-sm rounded-2xl border border-slate-200 bg-white">
        {/* Filters Section */}
        <div className="p-4 bg-slate-50/80 rounded-xl mb-6 border border-slate-200/80">
          <div className="flex items-center gap-2 mb-3 font-semibold text-slate-700 text-sm">
            <FilterOutlined className="text-indigo-600" />
            <span>Bộ lọc nâng cao</span>
          </div>

          <Row gutter={[12, 12]} align="middle">
            {/* Date-time range filter */}
            <Col xs={24} sm={12} md={8} lg={7}>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Từ ngày/giờ tới Ngày/giờ:
              </label>
              <RangePicker
                showTime={{ format: 'HH:mm' }}
                format="YYYY-MM-DD HH:mm"
                value={dateRange}
                onChange={(dates) => {
                  setDateRange(dates);
                  setPage(1);
                }}
                className="w-full rounded-lg"
                placeholder={['Từ ngày/giờ', 'Đến ngày/giờ']}
              />
            </Col>

            {/* Creation Method Filter */}
            <Col xs={12} sm={6} md={4} lg={4}>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Nguồn / Phương thức:
              </label>
              <Select
                value={creationMethod}
                onChange={(val) => {
                  setCreationMethod(val);
                  setPage(1);
                }}
                className="w-full"
                options={[
                  { label: 'Tất cả nguồn', value: 'ALL' },
                  { label: 'Tạo bằng API', value: 'API' },
                  { label: 'Tạo tay', value: 'MANUAL' },
                ]}
              />
            </Col>

            {/* Duplicate Strategy Filter */}
            <Col xs={12} sm={6} md={5} lg={5}>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Phương án tạo Lead:
              </label>
              <Select
                value={duplicateStrategy}
                onChange={(val) => {
                  setDuplicateStrategy(val);
                  setPage(1);
                }}
                className="w-full"
                options={[
                  { label: 'Tất cả phương án', value: 'ALL' },
                  { label: 'Gộp khách hàng', value: 'MERGED' },
                  { label: 'Tạo mới không trùng lặp', value: 'CREATED_NEW' },
                ]}
              />
            </Col>

            {/* Search Input */}
            <Col xs={24} sm={12} md={5} lg={5}>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Tìm kiếm khách hàng:
              </label>
              <Input
                placeholder="Nhập Tên, SĐT hoặc Email..."
                prefix={<SearchOutlined className="text-slate-400" />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onPressEnter={() => setPage(1)}
                allowClear
                className="rounded-lg"
              />
            </Col>

            {/* Reset Button */}
            <Col xs={24} sm={12} md={2} lg={3} className="flex items-end">
              <Button
                icon={<ClearOutlined />}
                onClick={handleResetFilters}
                className="w-full mt-5 rounded-lg border-slate-300 text-slate-600 hover:text-indigo-600"
              >
                Xóa lọc
              </Button>
            </Col>
          </Row>
        </div>

        {/* Log Events Data Table */}
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (totalCount, range) => (
              <span className="text-xs text-slate-500">
                Hiển thị {range[0]}-{range[1]} trong tổng số {totalCount} sự kiện
              </span>
            ),
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
          className="rounded-xl overflow-hidden shadow-none border border-slate-200"
          rowClassName={() => 'hover:bg-slate-50/80 transition-colors'}
        />
      </Card>
    </div>
  );
};

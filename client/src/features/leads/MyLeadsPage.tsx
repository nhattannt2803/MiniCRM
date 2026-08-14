import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Tag, Space, Select, Modal, Form, message, Badge, Statistic } from 'antd';
import {
  UserOutlined,
  SearchOutlined,
  PlusOutlined,
  PhoneOutlined,
  MailOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FireOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { crmService } from '../../services/crmService';
import { useAuthStore } from '../../stores/authStore';
import { Lead } from '../../types';
import { useNavigate } from 'react-router-dom';

const { Option } = Select;

export const MyLeadsPage: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const fetchMyLeads = async () => {
    setLoading(true);
    try {
      // Fetch leads owned by logged in user or filter client side if backend ownerId query parameter is provided
      const res: any = await crmService.getLeads(user?.id ? { ownerId: user.id } : {});
      if (res.success) {
        setLeads(res.data);
      }
    } catch (err) {
      message.error('Không thể tải danh sách Lead của tôi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyLeads();
  }, [user]);

  const filteredLeads = leads.filter((item) => {
    const matchesSearch =
      `${item.firstName} ${item.lastName}`.toLowerCase().includes(searchText.toLowerCase()) ||
      (item.companyName && item.companyName.toLowerCase().includes(searchText.toLowerCase())) ||
      (item.email && item.email.toLowerCase().includes(searchText.toLowerCase())) ||
      (item.phone && item.phone.includes(searchText));

    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const hotLeadsCount = leads.filter((l) => l.rating === 'HOT').length;
  const newLeadsCount = leads.filter((l) => l.status === 'NEW').length;
  const contactedLeadsCount = leads.filter((l) => l.status === 'CONTACTED' || l.status === 'QUALIFIED').length;

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'NEW':
        return <Tag color="blue">Mới tạo</Tag>;
      case 'CONTACTED':
        return <Tag color="orange">Đã liên hệ</Tag>;
      case 'QUALIFIED':
        return <Tag color="green">Đạt yêu cầu</Tag>;
      case 'UNQUALIFIED':
        return <Tag color="red">Không phù hợp</Tag>;
      case 'CONVERTED':
        return <Tag color="purple">Đã chuyển đổi</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const getRatingTag = (rating: string) => {
    switch (rating) {
      case 'HOT':
        return <Tag color="error" icon={<FireOutlined />}>Nóng</Tag>;
      case 'WARM':
        return <Tag color="warning">Ấm</Tag>;
      case 'COLD':
        return <Tag color="default">Lạnh</Tag>;
      default:
        return <Tag>{rating}</Tag>;
    }
  };

  const columns = [
    {
      title: 'Họ và tên',
      dataIndex: 'firstName',
      key: 'name',
      render: (_: any, record: Lead) => (
        <div>
          <a
            onClick={() => navigate(`/leads/${record.id}`)}
            className="font-semibold text-indigo-600 hover:text-indigo-800"
          >
            {record.firstName} {record.lastName}
          </a>
          {record.jobTitle && <div className="text-xs text-slate-400">{record.jobTitle}</div>}
        </div>
      ),
    },
    {
      title: 'Công ty / Tổ chức',
      dataIndex: 'companyName',
      key: 'companyName',
      render: (text: string) => <span className="font-medium text-slate-700">{text || 'Cá nhân'}</span>,
    },
    {
      title: 'Liên hệ',
      key: 'contact',
      render: (_: any, record: Lead) => (
        <div className="text-xs space-y-0.5">
          {record.phone && (
            <div className="flex items-center gap-1 text-slate-600">
              <PhoneOutlined className="text-emerald-500" /> {record.phone}
            </div>
          )}
          {record.email && (
            <div className="flex items-center gap-1 text-slate-600">
              <MailOutlined className="text-blue-500" /> {record.email}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Mức độ quan tâm',
      dataIndex: 'rating',
      key: 'rating',
      render: (rating: string) => getRatingTag(rating),
    },
    {
      title: 'Nguồn Lead',
      dataIndex: 'source',
      key: 'source',
      render: (source: string) => <Tag className="bg-slate-100 border-slate-200 text-slate-700 font-medium">{source}</Tag>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: any, record: Lead) => (
        <Space size="small">
          <Button size="small" type="primary" onClick={() => navigate(`/leads/${record.id}`)}>
            Chi tiết
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserOutlined className="text-indigo-600" /> Lead của tôi
          </h1>
          <p className="text-sm text-slate-500">
            Danh sách khách hàng tiềm năng được phân công trực tiếp cho bạn theo dõi và chăm sóc
          </p>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchMyLeads} loading={loading}>
          Làm mới
        </Button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-xs border-slate-200 rounded-xl bg-gradient-to-br from-indigo-50 to-white">
          <Statistic
            title={<span className="text-xs font-semibold text-indigo-700 uppercase">Tổng Lead đang phụ trách</span>}
            value={leads.length}
            prefix={<UserOutlined className="text-indigo-600 mr-2" />}
            valueStyle={{ fontWeight: 700, color: '#312e81' }}
          />
        </Card>
        <Card className="shadow-xs border-slate-200 rounded-xl bg-gradient-to-br from-amber-50 to-white">
          <Statistic
            title={<span className="text-xs font-semibold text-amber-700 uppercase">Lead Mới Chưa Liên Hệ</span>}
            value={newLeadsCount}
            prefix={<ClockCircleOutlined className="text-amber-600 mr-2" />}
            valueStyle={{ fontWeight: 700, color: '#78350f' }}
          />
        </Card>
        <Card className="shadow-xs border-slate-200 rounded-xl bg-gradient-to-br from-rose-50 to-white">
          <Statistic
            title={<span className="text-xs font-semibold text-rose-700 uppercase">Lead Nóng (Tiềm Năng Cao)</span>}
            value={hotLeadsCount}
            prefix={<FireOutlined className="text-rose-600 mr-2" />}
            valueStyle={{ fontWeight: 700, color: '#881337' }}
          />
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="shadow-xs border-slate-200 rounded-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <Input
            placeholder="Tìm theo tên, email, SĐT, công ty..."
            prefix={<SearchOutlined className="text-slate-400" />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full sm:w-80 rounded-lg"
          />
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Trạng thái:</span>
            <Select value={statusFilter} onChange={setStatusFilter} className="w-40">
              <Option value="ALL">Tất cả</Option>
              <Option value="NEW">Mới tạo</Option>
              <Option value="CONTACTED">Đã liên hệ</Option>
              <Option value="QUALIFIED">Đạt yêu cầu</Option>
              <Option value="UNQUALIFIED">Không phù hợp</Option>
              <Option value="CONVERTED">Đã chuyển đổi</Option>
            </Select>
          </div>
        </div>

        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={filteredLeads}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          className="overflow-x-auto"
        />
      </Card>
    </div>
  );
};

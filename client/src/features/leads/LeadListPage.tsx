import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Select, Tag, Drawer, Form, Popconfirm, notification } from 'antd';
import { PlusOutlined, SearchOutlined, EyeOutlined, SwapOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { crmService } from '../../services/crmService';
import { Lead } from '../../types';
import { LeadConvertModal } from './LeadConvertModal';

export const LeadListPage: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [ratingFilter, setRatingFilter] = useState<string | undefined>();

  const [createDrawerVisible, setCreateDrawerVisible] = useState(false);
  const [convertModalVisible, setConvertModalVisible] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const [form] = Form.useForm();
  const navigate = useNavigate();

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res: any = await crmService.getLeads({
        page,
        limit: 10,
        search,
        status: statusFilter,
        rating: ratingFilter,
      });
      if (res.success) {
        setLeads(res.data);
        setTotal(res.meta.total);
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [page, search, statusFilter, ratingFilter]);

  const handleCreateLead = async (values: any) => {
    try {
      const res: any = await crmService.createLead(values);
      if (res.success) {
        notification.success({ message: 'Lead Created', description: 'New lead added to system!' });
        setCreateDrawerVisible(false);
        form.resetFields();
        fetchLeads();
      }
    } catch (err: any) {
      notification.error({ message: 'Create Lead Failed', description: err.message });
    }
  };

  const handleDeleteLead = async (id: string) => {
    try {
      await crmService.deleteLead(id);
      notification.success({ message: 'Lead Deleted' });
      fetchLeads();
    } catch (err: any) {
      notification.error({ message: 'Delete Failed', description: err.message });
    }
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'NEW': return <Tag color="blue">NEW</Tag>;
      case 'CONTACTED': return <Tag color="purple">CONTACTED</Tag>;
      case 'QUALIFIED': return <Tag color="cyan">QUALIFIED</Tag>;
      case 'UNQUALIFIED': return <Tag color="default">UNQUALIFIED</Tag>;
      case 'CONVERTED': return <Tag color="green">CONVERTED</Tag>;
      case 'LOST': return <Tag color="red">LOST</Tag>;
      default: return <Tag>{status}</Tag>;
    }
  };

  const getRatingTag = (rating: string) => {
    switch (rating) {
      case 'HOT': return <Tag color="red">🔥 HOT</Tag>;
      case 'WARM': return <Tag color="orange">⚡ WARM</Tag>;
      case 'COLD': return <Tag color="blue">❄ COLD</Tag>;
      default: return <Tag>{rating}</Tag>;
    }
  };

  const columns = [
    {
      title: 'Lead Name',
      key: 'name',
      render: (_: any, record: Lead) => (
        <div>
          <div
            className="font-bold text-slate-900 cursor-pointer hover:text-indigo-600 transition-colors"
            onClick={() => navigate(`/leads/${record.id}`)}
          >
            {record.firstName} {record.lastName}
          </div>
          <div className="text-xs text-slate-400">{record.jobTitle || 'No title'}</div>
        </div>
      ),
    },
    {
      title: 'Company',
      dataIndex: 'companyName',
      key: 'companyName',
      render: (val: string) => <span className="font-medium text-slate-700">{val || '—'}</span>,
    },
    {
      title: 'Contact Details',
      key: 'contact',
      render: (_: any, record: Lead) => (
        <div className="text-xs space-y-0.5">
          {record.email && <div className="text-slate-600">✉ {record.email}</div>}
          {record.phone && <div className="text-slate-500">📞 {record.phone}</div>}
        </div>
      ),
    },
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      render: (source: string) => <Tag>{source}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Rating',
      dataIndex: 'rating',
      key: 'rating',
      render: (rating: string) => getRatingTag(rating),
    },
    {
      title: 'Owner',
      key: 'owner',
      render: (_: any, record: Lead) => (
        <span className="text-xs font-medium text-slate-600">
          {record.owner ? `${record.owner.firstName} ${record.owner.lastName}` : 'Unassigned'}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Lead) => (
        <div className="flex items-center gap-2">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/leads/${record.id}`)}
          />
          {record.status !== 'CONVERTED' && (
            <Button
              size="small"
              type="primary"
              ghost
              icon={<SwapOutlined />}
              onClick={() => {
                setSelectedLead(record);
                setConvertModalVisible(true);
              }}
            >
              Convert
            </Button>
          )}
          <Popconfirm title="Delete this lead?" onConfirm={() => handleDeleteLead(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Leads Registry</h1>
          <p className="text-sm text-slate-500">Manage prospect lifecycle from initial contact to qualification</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          className="bg-indigo-600 font-semibold rounded-lg"
          onClick={() => setCreateDrawerVisible(true)}
        >
          Create Lead
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <Input
          prefix={<SearchOutlined className="text-slate-400" />}
          placeholder="Search name, email, phone, company..."
          className="w-72"
          allowClear
          onChange={(e) => setSearch(e.target.value)}
        />

        <Select
          placeholder="Filter Status"
          className="w-40"
          allowClear
          onChange={(val) => setStatusFilter(val)}
        >
          <Select.Option value="NEW">NEW</Select.Option>
          <Select.Option value="CONTACTED">CONTACTED</Select.Option>
          <Select.Option value="QUALIFIED">QUALIFIED</Select.Option>
          <Select.Option value="UNQUALIFIED">UNQUALIFIED</Select.Option>
          <Select.Option value="CONVERTED">CONVERTED</Select.Option>
        </Select>

        <Select
          placeholder="Filter Rating"
          className="w-36"
          allowClear
          onChange={(val) => setRatingFilter(val)}
        >
          <Select.Option value="HOT">HOT</Select.Option>
          <Select.Option value="WARM">WARM</Select.Option>
          <Select.Option value="COLD">COLD</Select.Option>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <Table
          columns={columns}
          dataSource={leads}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            total,
            pageSize: 10,
            onChange: (p) => setPage(p),
          }}
        />
      </div>

      {/* Create Drawer */}
      <Drawer
        title="Create New Prospect Lead"
        open={createDrawerVisible}
        onClose={() => setCreateDrawerVisible(false)}
        width={480}
        extra={
          <Button type="primary" onClick={() => form.submit()} className="bg-indigo-600">
            Submit Lead
          </Button>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleCreateLead}>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}>
              <Input placeholder="John" />
            </Form.Item>
            <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}>
              <Input placeholder="Doe" />
            </Form.Item>
          </div>

          <Form.Item name="email" label="Email Address">
            <Input placeholder="john@example.com" />
          </Form.Item>

          <Form.Item name="phone" label="Phone Number">
            <Input placeholder="0901234567" />
          </Form.Item>

          <Form.Item name="companyName" label="Company Name">
            <Input placeholder="Acme Corp" />
          </Form.Item>

          <Form.Item name="jobTitle" label="Job Title / Position">
            <Input placeholder="Director of Sales" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="source" label="Acquisition Source" initialValue="WEBSITE">
              <Select>
                <Select.Option value="WEBSITE">WEBSITE</Select.Option>
                <Select.Option value="REFERRAL">REFERRAL</Select.Option>
                <Select.Option value="FB_ADS">FB_ADS</Select.Option>
                <Select.Option value="GOOGLE_ADS">GOOGLE_ADS</Select.Option>
                <Select.Option value="EVENT">EVENT</Select.Option>
                <Select.Option value="OUTBOUND">OUTBOUND</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="rating" label="Rating" initialValue="WARM">
              <Select>
                <Select.Option value="HOT">HOT</Select.Option>
                <Select.Option value="WARM">WARM</Select.Option>
                <Select.Option value="COLD">COLD</Select.Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item name="notes" label="Lead Notes">
            <Input.TextArea rows={3} placeholder="Additional background notes..." />
          </Form.Item>
        </Form>
      </Drawer>

      {/* Convert Lead Modal */}
      <LeadConvertModal
        visible={convertModalVisible}
        lead={selectedLead}
        onCancel={() => setConvertModalVisible(false)}
        onSuccess={() => {
          setConvertModalVisible(false);
          fetchLeads();
        }}
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Tag, Drawer, Form, Select, InputNumber, notification } from 'antd';
import { PlusOutlined, SearchOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { crmService } from '../../services/crmService';
import { Opportunity, Pipeline, PipelineStage } from '../../types';

export const OpportunityListPage: React.FC = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);

  const [form] = Form.useForm();
  const navigate = useNavigate();

  const fetchOpps = async () => {
    setLoading(true);
    try {
      const res: any = await crmService.getOpportunities({ page, limit: 10, search });
      if (res.success) {
        setOpportunities(res.data);
        setTotal(res.meta.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpps();
    crmService.getPipelines().then((res: any) => {
      if (res.success) setPipelines(res.data);
    });
  }, [page, search]);

  const handleCreateOpportunity = async (values: any) => {
    try {
      const res: any = await crmService.createOpportunity(values);
      if (res.success) {
        notification.success({ message: 'Opportunity Created' });
        setDrawerVisible(false);
        form.resetFields();
        fetchOpps();
      }
    } catch (err: any) {
      notification.error({ message: 'Error', description: err.message });
    }
  };

  const columns = [
    {
      title: 'Deal Name',
      key: 'name',
      render: (_: any, r: Opportunity) => (
        <div>
          <span
            className="font-bold text-slate-900 cursor-pointer hover:text-indigo-600"
            onClick={() => navigate(`/opportunities/${r.id}`)}
          >
            {r.name}
          </span>
          <div className="text-xs text-slate-400">{r.company?.name || 'Individual'}</div>
        </div>
      ),
    },
    {
      title: 'Stage',
      key: 'stage',
      render: (_: any, r: Opportunity) => <Tag color="blue">{r.stage?.name}</Tag>,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (v: number) => <span className="font-bold text-indigo-600">{Number(v).toLocaleString('vi-VN')} ₫</span>,
    },
    {
      title: 'Probability',
      dataIndex: 'probability',
      key: 'probability',
      render: (p: number) => `${p}%`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <Tag color={s === 'WON' ? 'green' : s === 'LOST' ? 'red' : 'orange'}>{s}</Tag>
      ),
    },
  ];

  const defaultPipeline = pipelines.find((p) => p.isDefault) || pipelines[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Opportunities List</h1>
          <p className="text-sm text-slate-500">Pipeline deals and forecast value tracking</p>
        </div>
        <div className="flex gap-2">
          <Button icon={<AppstoreOutlined />} onClick={() => navigate('/opportunities')}>
            Kanban Board
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            className="bg-indigo-600 font-semibold"
            onClick={() => setDrawerVisible(true)}
          >
            Create Deal
          </Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <Input
          prefix={<SearchOutlined className="text-slate-400" />}
          placeholder="Search deal name, company..."
          className="w-72"
          allowClear
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <Table
          columns={columns}
          dataSource={opportunities}
          rowKey="id"
          loading={loading}
          pagination={{ current: page, total, pageSize: 10, onChange: setPage }}
        />
      </div>

      <Drawer
        title="Create Opportunity Deal"
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        width={450}
        extra={<Button type="primary" onClick={() => form.submit()} className="bg-indigo-600">Save Deal</Button>}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateOpportunity}>
          <Form.Item name="name" label="Deal Name" rules={[{ required: true }]}>
            <Input placeholder="Enterprise Software License" />
          </Form.Item>

          <Form.Item name="amount" label="Deal Amount (VND)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>

          {defaultPipeline && (
            <>
              <Form.Item name="pipelineId" label="Pipeline" initialValue={defaultPipeline.id}>
                <Select disabled>
                  <Select.Option value={defaultPipeline.id}>{defaultPipeline.name}</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item name="stageId" label="Initial Stage" rules={[{ required: true }]}>
                <Select placeholder="Select Stage">
                  {defaultPipeline.stages.map((s: PipelineStage) => (
                    <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </>
          )}

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Tag, Button, Tabs, Table, Modal, Form, Select, InputNumber, notification, Spin } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, FileTextOutlined, TrophyOutlined, CloseOutlined } from '@ant-design/icons';
import { crmService } from '../../services/crmService';
import { Opportunity, Product } from '../../types';
import { ActivityTimeline } from '../../components/Timeline/ActivityTimeline';

export const OpportunityDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [opp, setOpp] = useState<Opportunity | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [addProductModalVisible, setAddProductModalVisible] = useState(false);
  const [productForm] = Form.useForm();

  const fetchDetails = async () => {
    if (!id) return;
    try {
      const res: any = await crmService.getOpportunityById(id);
      if (res.success) setOpp(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
    crmService.getProducts().then((res: any) => {
      if (res.success) setProducts(res.data);
    });
  }, [id]);

  const handleStageChange = async (newStageId: string) => {
    if (!id) return;
    try {
      await crmService.updateOpportunityStage(id, newStageId);
      notification.success({ message: 'Stage Updated & Automation Triggered' });
      fetchDetails();
    } catch (err: any) {
      notification.error({ message: 'Error', description: err.message });
    }
  };

  const handleAddProduct = async (values: any) => {
    if (!id) return;
    try {
      await crmService.addOpportunityProduct(id, values);
      notification.success({ message: 'Product Added' });
      setAddProductModalVisible(false);
      productForm.resetFields();
      fetchDetails();
    } catch (err: any) {
      notification.error({ message: 'Error', description: err.message });
    }
  };

  if (loading || !opp) {
    return <div className="h-96 flex items-center justify-center"><Spin size="large" /></div>;
  }

  const productColumns = [
    { title: 'Product Name', key: 'name', render: (_: any, r: any) => r.product?.name },
    { title: 'Code', key: 'code', render: (_: any, r: any) => r.product?.code },
    { title: 'Quantity', dataIndex: 'quantity', key: 'quantity' },
    { title: 'Unit Price', dataIndex: 'unitPrice', key: 'unitPrice', render: (v: number) => `${Number(v).toLocaleString('vi-VN')} ₫` },
    { title: 'Total', dataIndex: 'totalPrice', key: 'totalPrice', render: (v: number) => `${Number(v).toLocaleString('vi-VN')} ₫` },
  ];

  const historyColumns = [
    { title: 'From Stage', key: 'from', render: (_: any, r: any) => r.fromStage?.name || '—' },
    { title: 'To Stage', key: 'to', render: (_: any, r: any) => <Tag color="blue">{r.toStage?.name}</Tag> },
    { title: 'Changed By', key: 'user', render: (_: any, r: any) => r.user ? `${r.user.firstName} ${r.user.lastName}` : 'System' },
    { title: 'Time', key: 'time', render: (_: any, r: any) => new Date(r.changedAt).toLocaleString('vi-VN') },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/opportunities')} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{opp.name}</h1>
              <Tag color={opp.status === 'WON' ? 'green' : opp.status === 'LOST' ? 'red' : 'blue'}>{opp.status}</Tag>
            </div>
            <p className="text-sm text-slate-500">{opp.company?.name || 'Individual Deal'}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {opp.pipeline?.stages && (
            <Select
              value={opp.stageId}
              onChange={handleStageChange}
              className="w-48"
            >
              {opp.pipeline.stages.map((s: any) => (
                <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>
              ))}
            </Select>
          )}

          <Button icon={<FileTextOutlined />} onClick={() => navigate(`/quotes`)}>
            Create Quote
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Deal Summary" className="shadow-xs border-slate-200 rounded-xl bg-white">
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-slate-400 font-medium block text-xs">Deal Amount</span>
              <span className="text-indigo-600 font-black text-xl">
                {Number(opp.amount).toLocaleString('vi-VN')} ₫
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block text-xs">Win Probability</span>
              <span className="text-slate-800 font-semibold">{opp.probability}%</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block text-xs">Stage</span>
              <Tag color="blue">{opp.stage?.name}</Tag>
            </div>
            <div>
              <span className="text-slate-400 font-medium block text-xs">Owner</span>
              <span className="text-slate-800 font-semibold">
                {opp.owner ? `${opp.owner.firstName} ${opp.owner.lastName}` : 'Unassigned'}
              </span>
            </div>
          </div>
        </Card>

        <div className="lg:col-span-2">
          <Card className="shadow-xs border-slate-200 rounded-xl bg-white">
            <Tabs
              items={[
                {
                  key: 'products',
                  label: `Products (${opp.products?.length || 0})`,
                  children: (
                    <div className="space-y-3">
                      <div className="flex justify-end">
                        <Button
                          size="small"
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => setAddProductModalVisible(true)}
                          className="bg-indigo-600"
                        >
                          Add Product
                        </Button>
                      </div>
                      <Table columns={productColumns} dataSource={opp.products} rowKey="id" pagination={false} />
                    </div>
                  ),
                },
                {
                  key: 'history',
                  label: 'Stage History Timeline',
                  children: <Table columns={historyColumns} dataSource={opp.stageHistories} rowKey="id" pagination={false} />,
                },
                {
                  key: 'timeline',
                  label: 'Activity Timeline',
                  children: <ActivityTimeline activities={opp.activities || []} />,
                },
              ]}
            />
          </Card>
        </div>
      </div>

      <Modal
        title="Add Product to Opportunity"
        open={addProductModalVisible}
        onCancel={() => setAddProductModalVisible(false)}
        onOk={() => productForm.submit()}
      >
        <Form form={productForm} layout="vertical" onFinish={handleAddProduct}>
          <Form.Item name="productId" label="Select Product" rules={[{ required: true }]}>
            <Select placeholder="Select Product">
              {products.map((p) => (
                <Select.Option key={p.id} value={p.id}>
                  {p.name} ({p.code}) - {Number(p.unitPrice).toLocaleString('vi-VN')} ₫
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="quantity" label="Quantity" initialValue={1} rules={[{ required: true }]}>
            <InputNumber min={1} className="w-full" />
          </Form.Item>

          <Form.Item name="unitPrice" label="Unit Price (VND)" rules={[{ required: true }]}>
            <InputNumber className="w-full" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

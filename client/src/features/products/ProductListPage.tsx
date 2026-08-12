import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Tag, Drawer, Form, Select, InputNumber, notification } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { crmService } from '../../services/crmService';
import { Product } from '../../types';

export const ProductListPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [form] = Form.useForm();

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res: any = await crmService.getProducts({ search });
      if (res.success) setProducts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search]);

  const handleCreateProduct = async (values: any) => {
    try {
      const res: any = await crmService.createProduct(values);
      if (res.success) {
        notification.success({ message: 'Product Created' });
        setDrawerVisible(false);
        form.resetFields();
        fetchProducts();
      }
    } catch (err: any) {
      notification.error({ message: 'Error', description: err.message });
    }
  };

  const columns = [
    { title: 'Product Name', dataIndex: 'name', key: 'name', render: (v: string) => <span className="font-bold text-slate-900">{v}</span> },
    { title: 'SKU / Code', dataIndex: 'code', key: 'code', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: 'Type', dataIndex: 'type', key: 'type', render: (v: string) => <Tag color={v === 'PRODUCT' ? 'purple' : 'cyan'}>{v}</Tag> },
    { title: 'Unit Price (VND)', dataIndex: 'unitPrice', key: 'unitPrice', render: (v: number) => <span className="font-bold text-emerald-600">{Number(v).toLocaleString('vi-VN')} ₫</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Products & Services Catalog</h1>
          <p className="text-sm text-slate-500">Master product items for quoting and opportunity line items</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          className="bg-indigo-600 font-semibold rounded-lg"
          onClick={() => setDrawerVisible(true)}
        >
          Create Product
        </Button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <Input
          prefix={<SearchOutlined className="text-slate-400" />}
          placeholder="Search product name, SKU..."
          className="w-72"
          allowClear
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <Table columns={columns} dataSource={products} rowKey="id" loading={loading} pagination={false} />
      </div>

      <Drawer
        title="Add Master Product / Service"
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        width={450}
        extra={<Button type="primary" onClick={() => form.submit()} className="bg-indigo-600">Save Product</Button>}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateProduct}>
          <Form.Item name="name" label="Product Name" rules={[{ required: true }]}>
            <Input placeholder="CRM Enterprise Pro" />
          </Form.Item>

          <Form.Item name="code" label="Product SKU Code" rules={[{ required: true }]}>
            <Input placeholder="PROD-CRM-ENT" />
          </Form.Item>

          <Form.Item name="type" label="Type" initialValue="PRODUCT">
            <Select>
              <Select.Option value="PRODUCT">PRODUCT</Select.Option>
              <Select.Option value="SERVICE">SERVICE</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="unitPrice" label="Unit Price (VND)" rules={[{ required: true }]}>
            <InputNumber className="w-full" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
};

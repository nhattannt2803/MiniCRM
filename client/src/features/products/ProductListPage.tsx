import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Tag, Drawer, Form, Select, InputNumber, notification } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { crmService } from '../../services/crmService';
import { Product } from '../../types';

export const ProductListPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [form] = Form.useForm();
  const { t } = useTranslation();

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
        notification.success({ message: t('common.success'), description: t('products.addProduct') });
        setDrawerVisible(false);
        form.resetFields();
        fetchProducts();
      }
    } catch (err: any) {
      notification.error({ message: t('common.error'), description: err.message });
    }
  };

  const columns = [
    { title: t('common.name'), dataIndex: 'name', key: 'name', render: (v: string) => <span className="font-bold text-slate-900">{v}</span> },
    { title: t('products.sku'), dataIndex: 'code', key: 'code', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: 'Loại hình', dataIndex: 'type', key: 'type', render: (v: string) => <Tag color={v === 'PRODUCT' ? 'purple' : 'cyan'}>{v === 'PRODUCT' ? 'SẢN PHẨM' : 'DỊCH VỤ'}</Tag> },
    { title: t('products.price') + ' (VNĐ)', dataIndex: 'unitPrice', key: 'unitPrice', render: (v: number) => <span className="font-bold text-emerald-600">{Number(v).toLocaleString('vi-VN')} ₫</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('products.title')}</h1>
          <p className="text-sm text-slate-500">Danh mục sản phẩm và dịch vụ dành cho báo giá và hợp đồng</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          className="bg-indigo-600 font-semibold rounded-lg"
          onClick={() => setDrawerVisible(true)}
        >
          {t('products.addProduct')}
        </Button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <Input
          prefix={<SearchOutlined className="text-slate-400" />}
          placeholder={t('common.searchPlaceholder')}
          className="w-72"
          allowClear
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <Table columns={columns} dataSource={products} rowKey="id" loading={loading} pagination={false} />
      </div>

      <Drawer
        title={t('products.addProduct')}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        width={450}
        extra={<Button type="primary" onClick={() => form.submit()} className="bg-indigo-600">{t('common.save')}</Button>}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateProduct}>
          <Form.Item name="name" label={t('common.name')} rules={[{ required: true }]}>
            <Input placeholder="Tên sản phẩm / dịch vụ" />
          </Form.Item>

          <Form.Item name="code" label={t('products.sku')} rules={[{ required: true }]}>
            <Input placeholder="SP-001" />
          </Form.Item>

          <Form.Item name="type" label="Loại hình" initialValue="PRODUCT">
            <Select>
              <Select.Option value="PRODUCT">Sản phẩm</Select.Option>
              <Select.Option value="SERVICE">Dịch vụ</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="unitPrice" label={t('products.price') + ' (VNĐ)'} rules={[{ required: true }]}>
            <InputNumber className="w-full" />
          </Form.Item>

          <Form.Item name="description" label={t('common.description')}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
};

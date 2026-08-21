import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Tag, Drawer, Form, Select, InputNumber, notification, Popconfirm, Space, Tooltip } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { crmService } from '../../services/crmService';
import { Product } from '../../types';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { PageHeader } from '../../components/common/PageHeader';
import { TableToolbar } from '../../components/common/TableToolbar';


export const ProductListPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
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

  const handleOpenAdd = () => {
    setEditingProduct(null);
    form.resetFields();
    form.setFieldsValue({ type: 'PRODUCT' });
    setDrawerVisible(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    form.setFieldsValue({
      name: product.name,
      code: product.code,
      type: product.type || 'PRODUCT',
      unitPrice: product.unitPrice,
      description: product.description,
    });
    setDrawerVisible(true);
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      if (editingProduct) {
        const res: any = await crmService.updateProduct(editingProduct.id, values);
        if (res.success) {
          notification.success({ message: t('common.success'), description: t('products.updateSuccess') });
          setDrawerVisible(false);
          setEditingProduct(null);
          form.resetFields();
          fetchProducts();
        }
      } else {
        const res: any = await crmService.createProduct(values);
        if (res.success) {
          notification.success({ message: t('common.success'), description: t('products.addProduct') });
          setDrawerVisible(false);
          form.resetFields();
          fetchProducts();
        }
      }
    } catch (err: any) {
      notification.error({ message: t('common.error'), description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res: any = await crmService.deleteProduct(id);
      if (res.success) {
        notification.success({ message: t('common.success'), description: t('products.deleteSuccess') });
        fetchProducts();
      }
    } catch (err: any) {
      notification.error({ message: t('common.error'), description: err.message });
    }
  };

  const columns = [
    {
      title: t('common.name'),
      dataIndex: 'name',
      key: 'name',
      render: (v: string, record: Product) => (
        <div>
          <span className="font-bold text-slate-900 block">{v}</span>
          {record.description && (
            <span className="text-xs text-slate-500 line-clamp-1">{record.description}</span>
          )}
        </div>
      ),
    },
    {
      title: t('products.sku'),
      dataIndex: 'code',
      key: 'code',
      render: (v: string) => <Tag color="blue" className="font-mono">{v}</Tag>,
    },
    {
      title: 'Loại hình',
      dataIndex: 'type',
      key: 'type',
      render: (v: string) => (
        <Tag color={v === 'PRODUCT' ? 'purple' : 'cyan'} className="font-medium">
          {v === 'PRODUCT' ? 'SẢN PHẨM' : 'DỊCH VỤ'}
        </Tag>
      ),
    },
    {
      title: t('products.price') + ' (VNĐ)',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      render: (v: number) => (
        <span className="font-bold text-emerald-600">
          {Number(v).toLocaleString('vi-VN')} ₫
        </span>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      align: 'center' as const,
      render: (_: any, record: Product) => (
        <Space size="small">
          <Tooltip title="Chỉnh sửa">
            <Button
              type="text"
              icon={<EditOutlined className="text-indigo-600 hover:text-indigo-800 text-lg" />}
              onClick={() => handleOpenEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Xóa sản phẩm/dịch vụ"
            description={t('products.deleteConfirm')}
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xóa">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined className="text-lg" />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('products.title')}
        subtitle="Danh mục sản phẩm và dịch vụ dành cho báo giá và hợp đồng"
      />

      <TableToolbar
        searchPlaceholder={t('common.searchPlaceholder')}
        searchValue={search}
        onSearchChange={(e) => setSearch(e.target.value)}
      >
        <PrimaryButton
          icon={<PlusOutlined />}
          onClick={handleOpenAdd}
        >
          {t('products.addProduct')}
        </PrimaryButton>
      </TableToolbar>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <Table columns={columns} dataSource={products} rowKey="id" loading={loading} pagination={false} />
      </div>

      <Drawer
        title={editingProduct ? t('products.editProduct') : t('products.addProduct')}
        open={drawerVisible}
        onClose={() => {
          setDrawerVisible(false);
          setEditingProduct(null);
          form.resetFields();
        }}
        width={450}
        extra={
          <Button
            type="primary"
            loading={submitting}
            onClick={() => form.submit()}
            className="bg-indigo-600"
          >
            {t('common.save')}
          </Button>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label={t('common.name')} rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
            <Input placeholder="Tên sản phẩm / dịch vụ" />
          </Form.Item>

          <Form.Item name="code" label={t('products.sku')} rules={[{ required: true, message: 'Vui lòng nhập mã SKU' }]}>
            <Input placeholder="SP-001" />
          </Form.Item>

          <Form.Item name="type" label="Loại hình" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="PRODUCT">Sản phẩm</Select.Option>
              <Select.Option value="SERVICE">Dịch vụ</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="unitPrice" label={t('products.price') + ' (VNĐ)'} rules={[{ required: true, message: 'Vui lòng nhập đơn giá' }]}>
            <InputNumber className="w-full" min={0} formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(val) => val?.replace(/\$\s?|(,*)/g, '') as any} />
          </Form.Item>

          <Form.Item name="description" label={t('common.description')}>
            <Input.TextArea rows={4} placeholder="Mô tả chi tiết sản phẩm / dịch vụ..." />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
};

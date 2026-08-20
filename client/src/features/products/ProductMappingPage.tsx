import React, { useState, useEffect } from 'react';
import { PrimaryButton } from '../../components/common/PrimaryButton';

import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  Popconfirm,
  notification,
  Tooltip,
  Alert,
  Space,
} from 'antd';
import {
  AppstoreOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  CopyOutlined,
  CheckOutlined,
  InfoCircleOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { crmService } from '../../services/crmService';
import { useAuthStore } from '../../stores/authStore';

export const ProductMappingPage: React.FC = () => {
  const { activeBiz, businesses } = useAuthStore();
  const currentBiz = activeBiz || businesses[0];

  const [mappings, setMappings] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const [form] = Form.useForm();

  const fetchMappings = async () => {
    setLoading(true);
    try {
      const res: any = await crmService.getProductMappings();
      if (res.success) {
        setMappings(res.data || []);
      }
    } catch (err: any) {
      notification.error({
        message: 'Lỗi tải danh sách Mapping Sản Phẩm',
        description: err.message || 'Không thể kết nối máy chủ.',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCrmProducts = async () => {
    try {
      const res: any = await crmService.getProducts();
      if (res.success) {
        setProducts(res.data || []);
      }
    } catch (err: any) {
      console.warn('Lỗi tải danh mục sản phẩm CRM:', err.message);
    }
  };

  useEffect(() => {
    fetchMappings();
    fetchCrmProducts();
  }, []);

  const handleOpenCreate = () => {
    setEditingMapping(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleOpenEdit = (record: any) => {
    setEditingMapping(record);
    form.setFieldsValue({
      externalCode: record.externalCode,
      externalName: record.externalName,
      productId: record.productId,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      if (editingMapping) {
        const res: any = await crmService.updateProductMapping(editingMapping.id, values);
        if (res.success) {
          notification.success({ message: 'Cập nhật Mapping sản phẩm thành công!' });
          setModalOpen(false);
          fetchMappings();
        }
      } else {
        const res: any = await crmService.createProductMapping(values);
        if (res.success) {
          notification.success({ message: 'Tạo Mapping sản phẩm thành công!' });
          setModalOpen(false);
          fetchMappings();
        }
      }
    } catch (err: any) {
      notification.error({
        message: editingMapping ? 'Lỗi cập nhật Mapping' : 'Lỗi tạo Mapping',
        description: err.response?.data?.message || err.message || 'Thao tác thất bại.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res: any = await crmService.deleteProductMapping(id);
      if (res.success) {
        notification.success({ message: 'Xóa Mapping thành công' });
        fetchMappings();
      }
    } catch (err: any) {
      notification.error({
        message: 'Lỗi xóa Mapping',
        description: err.response?.data?.message || err.message,
      });
    }
  };

  const filteredMappings = mappings.filter((m) => {
    if (!searchText.trim()) return true;
    const query = searchText.toLowerCase().trim();
    return (
      m.externalCode?.toLowerCase().includes(query) ||
      m.externalName?.toLowerCase().includes(query) ||
      m.product?.name?.toLowerCase().includes(query) ||
      m.product?.code?.toLowerCase().includes(query)
    );
  });

  const columns = [
    {
      title: 'Mã sản phẩm bên ngoài (External Code)',
      dataIndex: 'externalCode',
      key: 'externalCode',
      render: (text: string) => (
        <span className="font-mono bg-slate-100 text-indigo-700 px-2 py-1 rounded font-semibold text-xs border border-indigo-200">
          {text}
        </span>
      ),
    },
    {
      title: 'Tên ghi chú bên ngoài',
      dataIndex: 'externalName',
      key: 'externalName',
      render: (text: string) => (text ? <span className="text-slate-700 font-medium">{text}</span> : <span className="text-slate-400 italic">-</span>),
    },
    {
      title: 'Sản phẩm CRM Ánh Xạ',
      key: 'product',
      render: (_: any, record: any) =>
        record.product ? (
          <div>
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <AppstoreOutlined className="text-indigo-500" /> {record.product.name}
            </div>
            <div className="text-xs text-slate-500 font-mono">Mã CRM: {record.product.code}</div>
          </div>
        ) : (
          <Tag color="red">Đã bị xóa</Tag>
        ),
    },
    {
      title: 'Giá bán CRM',
      key: 'unitPrice',
      render: (_: any, record: any) =>
        record.product ? (
          <span className="font-semibold text-slate-900">
            {Number(record.product.unitPrice).toLocaleString('vi-VN')} {record.product.currency || 'VND'}
          </span>
        ) : (
          '-'
        ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => dayjs(text).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="small">
          <Button type="text" size="small" icon={<EditOutlined className="text-indigo-600" />} onClick={() => handleOpenEdit(record)}>
            Sửa
          </Button>
          <Popconfirm
            title="Xóa Mapping sản phẩm này?"
            description="Lưu ý: API Lead khi nhận mã này sẽ báo sản phẩm không có mapping."
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger size="small" icon={<DeleteOutlined />}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const sampleJson = JSON.stringify(
    {
      smaxBizId: currentBiz?.slug || 'xe-dien-move',
      name: 'Nguyễn Văn External',
      phone: '0912345678',
      products: [
        { code: mappings[0]?.externalCode || 'SP001', name: 'Mã đã được mapping' },
        { code: 'SP999_NOTFOUND', name: 'Mã chưa có mapping' },
      ],
    },
    null,
    2
  );

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(sampleJson);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <LinkOutlined className="text-indigo-600" /> Mapping Mã Sản Phẩm Webhook
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Đồng bộ mã sản phẩm bên ngoài (Make, Zapier, Chatbot, Smax.ai, E-commerce) với danh mục Sản phẩm CRM.
          </p>
        </div>
        <PrimaryButton icon={<PlusOutlined />} onClick={handleOpenCreate}>
          Thêm Mapping Mới
        </PrimaryButton>
      </div>

      {/* Main Table Card */}
      <Card className="shadow-sm border-slate-200">
        <div className="flex items-center justify-between mb-4 gap-4">
          <Input
            placeholder="Tìm kiếm mã SKU bên ngoài, tên sản phẩm CRM..."
            prefix={<SearchOutlined className="text-slate-400" />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="max-w-md"
            allowClear
          />
          <div className="text-xs text-slate-500">Tổng cộng: <strong className="text-slate-800">{filteredMappings.length}</strong> mã mapping</div>
        </div>

        <Table
          dataSource={filteredMappings}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          size="middle"
          locale={{ emptyText: 'Chưa có mã sản phẩm nào được mapping cho Doanh nghiệp này.' }}
        />
      </Card>

      {/* Instruction Card & JSON Webhook Example */}
      <Card className="shadow-sm border-slate-200 bg-slate-50">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <InfoCircleOutlined className="text-indigo-600" /> Hướng dẫn truyền mảng `products` qua Webhook API
            </h3>
            <p className="text-xs text-slate-600">
              Khi gọi <code>POST /api/leads/external</code>, truyền mảng <code>products</code> chứa danh sách các object chứa mã sản phẩm <code>code</code>.
              Nếu mã nào chưa có mapping, hệ thống sẽ tự động cộng dồn thông báo cảnh báo <code>"sản phẩm mã xxx không có mapping"</code> vào trường <strong>notes</strong>.
            </p>
          </div>
          <Button size="small" icon={copiedSnippet ? <CheckOutlined className="text-emerald-600" /> : <CopyOutlined />} onClick={handleCopySnippet}>
            {copiedSnippet ? 'Đã copy mẫu JSON' : 'Copy mẫu JSON'}
          </Button>
        </div>

        <pre className="mt-3 p-3 bg-slate-900 text-indigo-300 text-xs font-mono rounded-lg overflow-x-auto">
          {sampleJson}
        </pre>
      </Card>

      {/* Modal Tạo / Sửa Mapping */}
      <Modal
        title={<span className="font-bold text-slate-900 text-base">{editingMapping ? '✏️ Cập nhật Mapping Sản phẩm' : '⚡ Thêm Mapping Sản phẩm Mới'}</span>}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} className="mt-4">
          <Form.Item
            name="externalCode"
            label="Mã sản phẩm bên ngoài (External SKU / Code)"
            rules={[{ required: true, message: 'Vui lòng nhập Mã sản phẩm bên ngoài (ví dụ: SP001, SKU-MOVE-01)' }]}
          >
            <Input placeholder="Ví dụ: SP001, SKU-MOVE-01, XE_ALPHA_V1" className="font-mono text-sm" />
          </Form.Item>

          <Form.Item name="externalName" label="Tên gợi nhớ bên ngoài (Tùy chọn)">
            <Input placeholder="Ví dụ: Xe điện Alpha - Bản Smax" />
          </Form.Item>

          <Form.Item
            name="productId"
            label="Chọn Sản phẩm trong CRM để Ánh Xạ"
            rules={[{ required: true, message: 'Vui lòng chọn Sản phẩm CRM' }]}
          >
            <Select
              showSearch
              placeholder="Chọn sản phẩm CRM..."
              optionFilterProp="children"
              filterOption={(input, option: any) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={products.map((p) => ({
                value: p.id,
                label: `${p.name} (${p.code}) - ${Number(p.unitPrice).toLocaleString('vi-VN')} ${p.currency || 'VND'}`,
              }))}
            />
          </Form.Item>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={submitting} className="bg-indigo-600 hover:bg-indigo-700">
              {editingMapping ? 'Lưu Thay Đổi' : 'Xác Nhận Tạo Mapping'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

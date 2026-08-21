import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { PageHeader } from '../../components/common/PageHeader';
import { TableToolbar } from '../../components/common/TableToolbar';

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
  Checkbox,
  Upload,
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
  DownloadOutlined,
  UploadOutlined,
  FileExcelOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { crmService } from '../../services/crmService';
import { useAuthStore } from '../../stores/authStore';

const escapeCsvField = (field: any) => {
  if (field === null || field === undefined) return '""';
  const str = String(field).replace(/"/g, '""');
  return `"${str}"`;
};

const parseCsvOrJsonText = (text: string) => {
  const trimmed = text.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsedJson = JSON.parse(trimmed);
      if (Array.isArray(parsedJson)) {
        return parsedJson.map((item) => ({
          externalCode: item.externalCode || item.code || item.external_code || '',
          externalName: item.externalName || item.name || item.external_name || '',
          productCode: item.productCode || item.crmCode || item.product_code || item.sku || '',
          productId: item.productId || item.product_id || '',
        }));
      }
    } catch (e) {
      // Fall back to CSV parsing
    }
  }

  const lines = trimmed.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const parseLine = (line: string) => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const rows = lines.map(parseLine);
  if (rows.length === 0) return [];

  const firstRow = rows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  let extCodeIdx = -1;
  let extNameIdx = -1;
  let prodCodeIdx = -1;
  let prodIdIdx = -1;

  firstRow.forEach((col, idx) => {
    if (col.includes('externalcode') || col.includes('mabenngoai') || col.includes('codebenn')) extCodeIdx = idx;
    else if (col.includes('externalname') || col.includes('tengoinho') || col.includes('nambenn')) extNameIdx = idx;
    else if (col.includes('productcode') || col.includes('macrm') || col.includes('maspcrm') || col.includes('sku')) prodCodeIdx = idx;
    else if (col.includes('productid') || col.includes('idcrm') || col.includes('idspcrm')) prodIdIdx = idx;
  });

  const hasHeader = extCodeIdx !== -1 || prodCodeIdx !== -1;
  const startRowIdx = hasHeader ? 1 : 0;

  if (!hasHeader) {
    extCodeIdx = 0;
    extNameIdx = 1;
    prodCodeIdx = 2;
  }

  const result: any[] = [];
  for (let i = startRowIdx; i < rows.length; i++) {
    const row = rows[i];
    const externalCode = row[extCodeIdx] ? row[extCodeIdx].replace(/^"|"$/g, '') : (row[0] || '');
    const externalName = extNameIdx !== -1 && row[extNameIdx] ? row[extNameIdx].replace(/^"|"$/g, '') : (row[1] || '');
    const productCode = prodCodeIdx !== -1 && row[prodCodeIdx] ? row[prodCodeIdx].replace(/^"|"$/g, '') : (row[2] || '');
    const productId = prodIdIdx !== -1 && row[prodIdIdx] ? row[prodIdIdx].replace(/^"|"$/g, '') : '';

    if (externalCode || productCode || productId) {
      result.push({
        externalCode,
        externalName,
        productCode,
        productId,
      });
    }
  }

  return result;
};

export const ProductMappingPage: React.FC = () => {
  const { t } = useTranslation();
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

  // Import State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [parsedImportRows, setParsedImportRows] = useState<any[]>([]);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

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

  // Export CSV
  const handleExportCSV = () => {
    if (!mappings || mappings.length === 0) {
      notification.warning({ message: 'Không có dữ liệu mapping nào để xuất.' });
      return;
    }

    const headers = [
      'Mã sản phẩm bên ngoài (externalCode)',
      'Tên gợi nhớ bên ngoài (externalName)',
      'Mã sản phẩm CRM (productCode)',
      'Tên sản phẩm CRM (productName)',
      'Giá bán CRM',
      'Ghi chú trùng lặp',
      'Ngày tạo',
    ];

    const rows = mappings.map((m) => [
      escapeCsvField(m.externalCode),
      escapeCsvField(m.externalName || ''),
      escapeCsvField(m.product?.code || ''),
      escapeCsvField(m.product?.name || ''),
      escapeCsvField(m.product ? `${m.product.unitPrice} ${m.product.currency || 'VND'}` : ''),
      escapeCsvField(m.notes || ''),
      escapeCsvField(dayjs(m.createdAt).format('DD/MM/YYYY HH:mm')),
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `product_mappings_${dayjs().format('YYYYMMDD_HHmmss')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notification.success({ message: 'Xuất file CSV thành công!' });
  };

  // Download Sample Template CSV
  const handleDownloadTemplate = () => {
    const headers = ['Mã sản phẩm bên ngoài (externalCode)', 'Tên gợi nhớ bên ngoài (externalName)', 'Mã sản phẩm CRM (productCode)'];
    const sampleRows = [
      ['SP001', 'Xe điện Move Alpha', 'XE_ALPHA_V1'],
      ['SP002', 'Xe điện Move Pro', 'XE_PRO_V2'],
      ['SKU_TEST_03', 'Ghi chú mẫu 3', 'XE_ALPHA_V1'],
    ];

    const csvContent = '\uFEFF' + [headers.join(','), ...sampleRows.map((r) => r.map(escapeCsvField).join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `mau_import_mapping_san_pham.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle File Upload or Text Paste for Import
  const handleTextChange = (text: string) => {
    setImportText(text);
    const parsed = parseCsvOrJsonText(text);
    setParsedImportRows(parsed);
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setImportText(content);
        const parsed = parseCsvOrJsonText(content);
        setParsedImportRows(parsed);
      }
    };
    reader.readAsText(file);
    return false;
  };

  const handleOpenImportModal = () => {
    setImportText('');
    setParsedImportRows([]);
    setImportResult(null);
    setUpdateExisting(true);
    setImportModalOpen(true);
  };

  const handleProcessImport = async () => {
    if (parsedImportRows.length === 0) {
      notification.warning({ message: 'Chưa có dữ liệu hợp lệ để nhập.' });
      return;
    }

    setImporting(true);
    try {
      const res: any = await crmService.importProductMappings(parsedImportRows, updateExisting);
      if (res.success) {
        setImportResult(res.data);
        notification.success({
          message: 'Nhập dữ liệu thành công',
          description: res.message,
        });
        fetchMappings();
      }
    } catch (err: any) {
      notification.error({
        message: 'Lỗi nhập dữ liệu Mapping',
        description: err.response?.data?.message || err.message || 'Thao tác thất bại.',
      });
    } finally {
      setImporting(false);
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
      title: t('productMappings.notesCol', 'Ghi chú trùng lặp'),
      dataIndex: 'notes',
      key: 'notes',
      render: (text: string) =>
        text ? (
          <Tag color="orange" className="whitespace-normal text-xs">
            {text}
          </Tag>
        ) : (
          <span className="text-slate-400 italic">-</span>
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
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <LinkOutlined className="text-indigo-600" /> {t('productMappings.title', 'Mapping Mã Sản Phẩm Webhook')}
          </span>
        }
        subtitle={t('productMappings.subtitle', 'Đồng bộ mã sản phẩm bên ngoài (Make, Zapier, Chatbot, Smax.ai, E-commerce) với danh mục Sản phẩm CRM.')}
      />

      <TableToolbar
        searchPlaceholder="Tìm kiếm mã SKU bên ngoài, tên sản phẩm CRM..."
        searchValue={searchText}
        onSearchChange={(e) => setSearchText(e.target.value)}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button icon={<FileExcelOutlined className="text-emerald-600" />} onClick={handleExportCSV}>
            {t('productMappings.exportButton', 'Xuất Data (CSV)')}
          </Button>
          <Button icon={<UploadOutlined className="text-indigo-600" />} onClick={handleOpenImportModal}>
            {t('productMappings.importButton', 'Nhập Data (Import)')}
          </Button>
          <PrimaryButton icon={<PlusOutlined />} onClick={handleOpenCreate}>
            Thêm Mapping Mới
          </PrimaryButton>
        </div>
      </TableToolbar>

      {/* Main Table Card */}
      <Card className="shadow-sm border-slate-200">
        <div className="flex items-center justify-between mb-4 gap-4">
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

      {/* Modal Nhập dữ liệu (Import) */}
      <Modal
        title={
          <span className="font-bold text-slate-900 text-base flex items-center gap-2">
            <UploadOutlined className="text-indigo-600" /> {t('productMappings.importModalTitle', 'Nhập dữ liệu Mapping Sản Phẩm')}
          </span>
        }
        open={importModalOpen}
        onCancel={() => setImportModalOpen(false)}
        width={720}
        footer={null}
        destroyOnClose
      >
        <div className="space-y-4 mt-3">
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-xs text-slate-600">
              {t('productMappings.importModalDesc', 'Chọn file CSV/JSON hoặc dán nội dung CSV bên dưới để nhập mã ánh xạ hàng loạt.')}
            </span>
            <Button size="small" icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
              {t('productMappings.downloadTemplate', 'Tải file mẫu CSV')}
            </Button>
          </div>

          <div className="space-y-2">
            <Upload.Dragger
              beforeUpload={handleFileUpload}
              showUploadList={false}
              accept=".csv,.txt,.json"
              className="p-4"
            >
              <p className="ant-upload-drag-icon">
                <FileExcelOutlined className="text-indigo-500 text-3xl" />
              </p>
              <p className="ant-upload-text text-sm font-semibold text-slate-700">
                {t('productMappings.uploadPlaceholder', 'Kéo thả file CSV vào đây hoặc click để chọn file từ máy tính')}
              </p>
            </Upload.Dragger>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Hoặc dán nội dung CSV/JSON trực tiếp:</label>
            <Input.TextArea
              rows={4}
              value={importText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={t('productMappings.pastePlaceholder', 'Dòng 1: Mã bên ngoài, Tên gợi nhớ, Mã SP CRM...')}
              className="font-mono text-xs"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <Checkbox checked={updateExisting} onChange={(e) => setUpdateExisting(e.target.checked)}>
              <span className="text-xs font-medium text-slate-700">
                {t('productMappings.overwriteOption', 'Cập nhật dữ liệu nếu Mã sản phẩm bên ngoài đã tồn tại')}
              </span>
            </Checkbox>
            <span className="text-xs text-indigo-600 font-semibold">
              Đã nhận diện: {parsedImportRows.length} dòng
            </span>
          </div>

          {/* Preview parsed rows table */}
          {parsedImportRows.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              <Table
                dataSource={parsedImportRows.slice(0, 50)}
                rowKey={(_, idx) => String(idx)}
                pagination={false}
                size="small"
                columns={[
                  {
                    title: '#',
                    render: (_, __, idx) => idx + 1,
                    width: 50,
                  },
                  {
                    title: t('productMappings.externalCodeCol', 'Mã SP bên ngoài'),
                    dataIndex: 'externalCode',
                    key: 'externalCode',
                    render: (text) => <span className="font-mono font-semibold text-indigo-700">{text || '-'}</span>,
                  },
                  {
                    title: t('productMappings.externalNameCol', 'Tên ghi chú bên ngoài'),
                    dataIndex: 'externalName',
                    key: 'externalName',
                    render: (text) => text || <span className="text-slate-400 italic">-</span>,
                  },
                  {
                    title: t('productMappings.crmProductCodeCol', 'Mã SP CRM'),
                    dataIndex: 'productCode',
                    key: 'productCode',
                    render: (text, row) => text || row.productId || <span className="text-slate-400 italic">-</span>,
                  },
                ]}
              />
            </div>
          )}

          {/* Import Result Notification */}
          {importResult && (
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <Alert
                message={t('productMappings.importSuccessTitle', 'Nhập dữ liệu hoàn tất!')}
                description={
                  <div className="text-xs space-y-1 mt-1">
                    <div>
                      Tạo mới thành công: <strong>{importResult.createdCount}</strong> / {importResult.total} | Bỏ qua trùng dữ liệu: <strong>{importResult.skippedCount}</strong>
                    </div>
                    {importResult.failedCount > 0 && (
                      <div className="text-red-600 font-semibold">
                        Số dòng lỗi: {importResult.failedCount}
                      </div>
                    )}
                  </div>
                }
                type={importResult.failedCount > 0 ? 'warning' : 'success'}
                showIcon
              />

              {importResult.errors && importResult.errors.length > 0 && (
                <div className="max-h-40 overflow-y-auto border border-red-200 rounded p-2 bg-red-50">
                  <div className="text-xs font-bold text-red-700 mb-1">Chi tiết các dòng không thể nhập:</div>
                  <ul className="text-xs text-red-600 space-y-1 pl-4 list-disc">
                    {importResult.errors.map((errItem: any, i: number) => (
                      <li key={i}>
                        Dòng {errItem.line} ({errItem.externalCode || 'Trống mã'}): {errItem.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button onClick={() => setImportModalOpen(false)}>Đóng</Button>
            <Button
              type="primary"
              onClick={handleProcessImport}
              loading={importing}
              disabled={parsedImportRows.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {t('productMappings.processImport', 'Tiến hành Nhập dữ liệu')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

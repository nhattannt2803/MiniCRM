import React, { useState, useEffect } from 'react';
import { PrimaryButton } from '../../components/common/PrimaryButton';

import { Card, Table, Button, Modal, Form, Input, Tag, Switch, Popconfirm, notification, Tooltip, Alert } from 'antd';
import { KeyOutlined, PlusOutlined, CopyOutlined, DeleteOutlined, CheckOutlined, InfoCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { crmService } from '../../services/crmService';
import { useAuthStore } from '../../stores/authStore';

export const ApiKeySettingsCard: React.FC = () => {
  const { activeBiz, businesses } = useAuthStore();
  const currentBiz = activeBiz || businesses[0];
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdKeyData, setCreatedKeyData] = useState<any>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  const [form] = Form.useForm();

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const res: any = await crmService.getApiKeys();
      if (res.success) {
        setKeys(res.data || []);
      }
    } catch (err: any) {
      notification.error({
        message: 'Lỗi tải danh sách API Key',
        description: err.message || 'Không thể kết nối máy chủ.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentBiz) {
      fetchKeys();
    }
  }, [currentBiz]);

  const handleCreateKey = async (values: any) => {
    setSubmitting(true);
    try {
      const res: any = await crmService.createApiKey({
        name: values.name,
      });

      if (res.success && res.data) {
        setCreatedKeyData(res.data);
        form.resetFields();
        setModalOpen(false);
        fetchKeys();
        notification.success({
          message: 'Tạo API Key thành công!',
          description: 'Vui lòng sao chép Key ngay bên dưới để sử dụng.',
        });
      }
    } catch (err: any) {
      notification.error({
        message: 'Tạo API Key thất bại',
        description: err.message || 'Có lỗi xảy ra.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const res: any = await crmService.toggleApiKeyStatus(id);
      if (res.success) {
        notification.success({ message: res.data.message || 'Đã cập nhật trạng thái API Key' });
        fetchKeys();
      }
    } catch (err: any) {
      notification.error({ message: 'Lỗi cập nhật trạng thái', description: err.message });
    }
  };

  const handleRevokeKey = async (id: string) => {
    try {
      const res: any = await crmService.revokeApiKey(id);
      if (res.success) {
        notification.success({ message: 'Đã thu hồi và xóa API Key thành công!' });
        fetchKeys();
      }
    } catch (err: any) {
      notification.error({ message: 'Lỗi xóa API Key', description: err.message });
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    notification.success({ message: 'Đã sao chép vào bộ nhớ tạm!' });
    setTimeout(() => setCopiedKeyId(null), 2500);
  };

  const columns = [
    {
      title: 'Tên nhận diện API Key',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: any) => (
        <div>
          <span className="font-semibold text-slate-900 block">{text}</span>
          <span className="text-xs text-slate-400">Tạo bởi: {record.createdBy?.name || 'Hệ thống'}</span>
        </div>
      ),
    },
    {
      title: 'Mã API Key',
      dataIndex: 'keyMasked',
      key: 'keyMasked',
      render: (masked: string, record: any) => (
        <div className="flex items-center gap-2">
          <code className="bg-slate-100 px-2.5 py-1 rounded text-xs font-mono text-indigo-700 border border-slate-200">
            {masked}
          </code>
          <Tooltip title="Sao chép Mã Key">
            <Button
              type="text"
              size="small"
              icon={copiedKeyId === record.id ? <CheckOutlined className="text-emerald-500" /> : <CopyOutlined className="text-slate-400" />}
              onClick={() => copyToClipboard(record.rawKey, record.id)}
            />
          </Tooltip>
        </div>
      ),
    },
    {
      title: 'Lần dùng gần nhất',
      dataIndex: 'lastUsedAt',
      key: 'lastUsedAt',
      render: (val: string) =>
        val ? (
          <span className="text-xs text-slate-600">{dayjs(val).format('DD/MM/YYYY HH:mm')}</span>
        ) : (
          <span className="text-xs text-slate-400 italic">Chưa từng dùng</span>
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: any) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={status === 'ACTIVE'}
            onChange={() => handleToggleStatus(record.id)}
            size="small"
          />
          <Tag color={status === 'ACTIVE' ? 'success' : 'default'} className="rounded-full text-xs">
            {status === 'ACTIVE' ? 'Hoạt động' : 'Tạm dừng'}
          </Tag>
        </div>
      ),
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: any, record: any) => (
        <Popconfirm
          title="Thu hồi API Key này?"
          description="Bên thứ ba sử dụng Key này sẽ không thể gọi API tạo Lead nữa."
          onConfirm={() => handleRevokeKey(record.id)}
          okText="Xóa Key"
          cancelText="Hủy"
          okButtonProps={{ danger: true }}
        >
          <Button type="text" danger icon={<DeleteOutlined />} size="small">
            Xóa Key
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <>
      <Card
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyOutlined className="text-indigo-600 text-lg" />
              <div>
                <span className="font-bold text-slate-900 block text-base">🔑 Quản lý API Key (Webhook Leads Ingestion)</span>
                <span className="text-xs text-slate-500 font-normal">Cấp mã API Key bảo mật cho Make/Zapier, Chatbot hoặc Landing page gọi API Lead.</span>
              </div>
            </div>
            <PrimaryButton
              icon={<PlusOutlined />}
              onClick={() => setModalOpen(true)}
            >
              Tạo Key Mới
            </PrimaryButton>
          </div>
        }
        className="shadow-xs border-slate-200 rounded-xl bg-white mb-6"
      >
        <Alert
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          message="Hướng dẫn gọi API Webhook tích hợp Lead"
          description={
            <div className="text-xs text-slate-600 space-y-1 mt-1">
              <div>• <strong>Method & URL:</strong> <code className="bg-slate-100 text-indigo-700 px-1 py-0.5 rounded font-mono">POST /api/leads/external</code> (hoặc <code className="bg-slate-100 text-indigo-700 px-1 py-0.5 rounded font-mono">/api/leads/ingest</code>)</div>
              <div>• <strong>HTTP Header:</strong> <code className="bg-slate-100 text-indigo-700 px-1 py-0.5 rounded font-mono">x-api-key: [Mã API Key]</code></div>
              <div>• <strong>Chỉ định Biz (Tùy chọn):</strong> Truyền trường <code className="bg-slate-100 text-indigo-700 px-1 py-0.5 rounded font-mono">"bizId": "{currentBiz?.id}"</code> hoặc <code className="bg-slate-100 text-indigo-700 px-1 py-0.5 rounded font-mono">"bizSlug": "{currentBiz?.slug}"</code> trong POST Body JSON (Hoặc hệ thống tự động nhận diện theo API Key).</div>
            </div>
          }
          className="mb-4 rounded-lg bg-indigo-50/50 border-indigo-100"
        />

        <Table
          dataSource={keys}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="middle"
          locale={{ emptyText: 'Chưa có API Key nào được tạo cho Doanh nghiệp này.' }}
        />
      </Card>

      {/* Modal Tạo Key Mới */}
      <Modal
        title={<span className="font-bold text-slate-900 text-base">⚡ Tạo API Key Mới</span>}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreateKey} className="mt-4">
          <Form.Item
            name="name"
            label="Tên gợi nhớ API Key"
            rules={[{ required: true, message: 'Vui lòng nhập tên nhận diện cho API Key' }]}
            extra="Ví dụ: Make.com Integration, Form Landing Page Xe Điện, Smax Webhook"
          >
            <Input placeholder="Ví dụ: Smax.ai Webhook Key" size="large" />
          </Form.Item>

          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={() => setModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={submitting} className="bg-indigo-600 hover:bg-indigo-700">
              Tạo và Cấp Key
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal Hiển thị Key vừa tạo thành công */}
      {createdKeyData && (
        <Modal
          title={<span className="font-bold text-emerald-700 text-lg">🎉 Đã Tạo API Key Thành Công!</span>}
          open={Boolean(createdKeyData)}
          onCancel={() => setCreatedKeyData(null)}
          footer={[
            <Button key="close" type="primary" onClick={() => setCreatedKeyData(null)} className="bg-emerald-600 hover:bg-emerald-700">
              Đã sao chép & Hoàn tất
            </Button>,
          ]}
          width={540}
        >
          <div className="space-y-4 my-4">
            <Alert
              type="warning"
              showIcon
              message="Lưu ý quan trọng về Bảo mật"
              description="Hãy sao chép mã Key này ngay lập tức. Vì lý do an toàn, mã đầy đủ sẽ không hiển thị lại sau khi bạn đóng cửa sổ này."
            />

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Mã API Key đầy đủ:</label>
              <div className="flex items-center gap-2">
                <Input
                  value={createdKeyData.key}
                  readOnly
                  className="font-mono text-sm bg-slate-50 border-emerald-300 text-emerald-800 font-bold"
                  size="large"
                />
                <Button
                  type="primary"
                  icon={<CopyOutlined />}
                  size="large"
                  onClick={() => copyToClipboard(createdKeyData.key, 'modal')}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Copy
                </Button>
              </div>
            </div>

            <div className="bg-slate-900 p-3 rounded-lg text-slate-200 text-xs font-mono space-y-1 overflow-x-auto">
              <div className="text-slate-400"># Ví dụ lệnh cURL gửi Lead tới Doanh nghiệp ({currentBiz?.name}):</div>
              <div className="text-emerald-400">curl -X POST http://localhost:5000/api/leads/external \</div>
              <div className="text-indigo-300">  -H "x-api-key: {createdKeyData.key}" \</div>
              <div className="text-amber-300">  -H "Content-Type: application/json" \</div>
              <div className="text-slate-200">  -d '&#123;"bizId": "{currentBiz?.id}", "ten": "Nguyễn Văn Webhook", "sdt": "0987654321"&#125;'</div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

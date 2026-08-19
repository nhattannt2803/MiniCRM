import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Select, Tag, Drawer, Form, Popconfirm, notification, Alert, Space, Radio, DatePicker, Tooltip } from 'antd';
import { PlusOutlined, SearchOutlined, EyeOutlined, EditOutlined, SwapOutlined, DeleteOutlined, WarningOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useBizNavigate } from '../../hooks/useBizNavigate';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { crmService } from '../../services/crmService';
import { Lead, User } from '../../types';
import { LeadConvertModal } from './LeadConvertModal';
import { useSettingsStore } from '../../stores/settingsStore';
import { parseFbPsidInput, parseZaloUidInput } from '../../utils/identityHelper';

export const LeadListPage: React.FC = () => {
  const { defaultEntityType } = useSettingsStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [ratingFilter, setRatingFilter] = useState<string | undefined>();

  const [createDrawerVisible, setCreateDrawerVisible] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [entityType, setEntityType] = useState<'CONTACT' | 'COMPANY'>(defaultEntityType);
  const [convertModalVisible, setConvertModalVisible] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Identity check state
  const [identityResult, setIdentityResult] = useState<any>(null);
  const [checkingIdentity, setCheckingIdentity] = useState(false);

  const [form] = Form.useForm();
  const navigate = useBizNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const { t } = useTranslation();

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

  useEffect(() => {
    crmService.getUsers().then((res: any) => {
      if (res.success) setUsers(res.data);
    }).catch((err) => console.error(err));

    crmService.getProducts().then((res: any) => {
      if (res.success) setProducts(res.data);
    }).catch((err) => console.error(err));

    const handleLeadCreated = () => {
      fetchLeads();
    };
    window.addEventListener('leadCreated', handleLeadCreated);
    return () => window.removeEventListener('leadCreated', handleLeadCreated);
  }, []);

  const handleIdentityBlur = async () => {
    const phone = form.getFieldValue('phone');
    const email = form.getFieldValue('email');
    const rawFb = form.getFieldValue('fbPsid');
    const parsedFb = parseFbPsidInput(rawFb);
    if (parsedFb && parsedFb !== rawFb) {
      form.setFieldsValue({ fbPsid: parsedFb });
    }
    const fbPsid = parsedFb || rawFb;
    const rawZalo = form.getFieldValue('zaloUid');
    const parsedZalo = parseZaloUidInput(rawZalo);
    if (parsedZalo && parsedZalo !== rawZalo) {
      form.setFieldsValue({ zaloUid: parsedZalo });
    }
    const zaloUid = parsedZalo || rawZalo;
    const firstName = form.getFieldValue('firstName') || '';
    const lastName = form.getFieldValue('lastName') || '';

    // Auto select Lead Source based on which identity field was filled first
    const hasFb = Boolean(fbPsid && fbPsid.trim());
    const hasZalo = Boolean(zaloUid && zaloUid.trim());

    if (hasFb && !hasZalo) {
      form.setFieldsValue({ source: 'FACEBOOK' });
    } else if (hasZalo && !hasFb) {
      form.setFieldsValue({ source: 'ZALO' });
    }

    if (
      (phone && phone.length >= 6) ||
      (email && email.includes('@')) ||
      (fbPsid && fbPsid.trim().length >= 3) ||
      (zaloUid && zaloUid.trim().length >= 3)
    ) {
      setCheckingIdentity(true);
      try {
        const res: any = await crmService.checkIdentity({
          phone,
          email,
          fbPsid,
          zaloUid,
          name: `${firstName} ${lastName}`.trim(),
        });
        if (res.success) {
          setIdentityResult(res.data);
          if (res.data.status === 'MATCHED') {
            const fieldsToUpdate: any = {};
            if (res.data.matchedLastName) fieldsToUpdate.lastName = res.data.matchedLastName;
            if (res.data.matchedFirstName) fieldsToUpdate.firstName = res.data.matchedFirstName;
            if (res.data.matchedCompanyName) fieldsToUpdate.companyName = res.data.matchedCompanyName;
            form.setFieldsValue(fieldsToUpdate);
          }
        }
      } catch (err) {
        console.error('Identity check error:', err);
      } finally {
        setCheckingIdentity(false);
      }
    }
  };

  const handleSaveLead = async (values: any) => {
    try {
      const payload = {
        ...values,
        receivedAt: values.receivedAt ? values.receivedAt.toISOString() : undefined,
        customerId: identityResult?.status === 'MATCHED' ? identityResult.matchedCustomerId : undefined,
      };

      if (editingLead) {
        const res: any = await crmService.updateLead(editingLead.id, payload);
        if (res.success) {
          notification.success({ message: t('common.success'), description: t('common.update') });
          setCreateDrawerVisible(false);
          setEditingLead(null);
          form.resetFields();
          setIdentityResult(null);
          fetchLeads();
        }
      } else {
        const res: any = await crmService.createLead(payload);
        if (res.success) {
          if (res.data.identityResolutionResult?.status === 'POTENTIAL_DUPLICATE') {
            notification.warning({
              message: 'Cảnh báo Trùng số Điện thoại',
              description: 'Lead đã được tạo nhưng gắn cờ Nghi trùng số để quản lý xác minh!',
            });
          } else {
            notification.success({ message: t('common.success'), description: t('leads.addLead') });
          }
          setCreateDrawerVisible(false);
          form.resetFields();
          setIdentityResult(null);
          fetchLeads();
        }
      }
    } catch (err: any) {
      notification.error({ message: t('common.error'), description: err.message });
    }
  };

  const handleOpenCreateDrawer = () => {
    setEditingLead(null);
    setIdentityResult(null);
    setEntityType(defaultEntityType);
    form.resetFields();
    form.setFieldsValue({ receivedAt: dayjs() });
    setCreateDrawerVisible(true);
  };

  const handleOpenEditDrawer = (lead: Lead) => {
    setEditingLead(lead);
    setIdentityResult(null);
    const currentProductIds = (lead as any).products
      ? (lead as any).products.map((p: any) => p.productId)
      : [];
    form.setFieldsValue({
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      companyName: lead.companyName,
      jobTitle: lead.jobTitle,
      source: lead.source,
      rating: lead.rating,
      ownerId: lead.ownerId,
      notes: lead.notes,
      productIds: currentProductIds,
      receivedAt: lead.receivedAt ? dayjs(lead.receivedAt) : (lead.createdAt ? dayjs(lead.createdAt) : undefined),
    });
    setCreateDrawerVisible(true);
  };

  const handleDeleteLead = async (id: string) => {
    try {
      await crmService.deleteLead(id);
      notification.success({ message: t('common.success') });
      fetchLeads();
    } catch (err: any) {
      notification.error({ message: t('common.error'), description: err.message });
    }
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'NEW': return <Tag color="blue">{t('leads.status.NEW')}</Tag>;
      case 'CONTACTED': return <Tag color="purple">{t('leads.status.CONTACTED')}</Tag>;
      case 'QUALIFIED': return <Tag color="cyan">{t('leads.status.QUALIFIED')}</Tag>;
      case 'UNQUALIFIED': return <Tag color="default">{t('leads.status.UNQUALIFIED')}</Tag>;
      case 'CONVERTED': return <Tag color="green">{t('leads.status.CONVERTED')}</Tag>;
      case 'LOST': return <Tag color="red">Mất</Tag>;
      default: return <Tag>{status}</Tag>;
    }
  };

  const getIdentityTag = (status?: string) => {
    switch (status) {
      case 'MATCHED':
        return <Tag color="green" icon={<CheckCircleOutlined />}>Khớp Customer</Tag>;
      case 'POTENTIAL_DUPLICATE':
        return <Tag color="orange" icon={<WarningOutlined />}>⚠️ Nghi trùng số</Tag>;
      case 'NEW_CUSTOMER':
      default:
        return <Tag color="cyan">Khách mới</Tag>;
    }
  };

  const getRatingTag = (rating: string) => {
    switch (rating) {
      case 'HOT': return <Tag color="red">🔥 {t('tasks.priority.HIGH')}</Tag>;
      case 'WARM': return <Tag color="orange">⚡ {t('tasks.priority.MEDIUM')}</Tag>;
      case 'COLD': return <Tag color="blue">❄ {t('tasks.priority.LOW')}</Tag>;
      default: return <Tag>{rating}</Tag>;
    }
  };

  const columns = [
    {
      title: 'Họ & Tên khách hàng',
      key: 'name',
      render: (_: any, record: Lead) => (
        <div>
          <div
            className="font-bold text-slate-900 cursor-pointer hover:text-indigo-600 transition-colors"
            onClick={() => navigate(`/leads/${record.id}`)}
          >
            {record.lastName} {record.firstName}
          </div>
          <div className="text-xs text-slate-400 mt-0.5 space-x-1">
            <span>{record.jobTitle || '—'}</span>
            <span>{getIdentityTag(record.identityResolutionStatus)}</span>
          </div>
        </div>
      ),
    },
    {
      title: t('leads.form.company'),
      dataIndex: 'companyName',
      key: 'companyName',
      render: (val: string) => <span className="font-medium text-slate-700">{val || '—'}</span>,
    },
    {
      title: t('common.email') + ' / ' + t('common.phone'),
      key: 'contact',
      render: (_: any, record: Lead) => (
        <div className="text-xs space-y-0.5">
          {record.email && <div className="text-slate-600">✉ {record.email}</div>}
          {record.phone && <div className="text-slate-500">📞 {record.phone}</div>}
        </div>
      ),
    },
    {
      title: t('leads.source'),
      dataIndex: 'source',
      key: 'source',
      render: (source: string) => <Tag>{source}</Tag>,
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Sản phẩm quan tâm',
      key: 'products',
      render: (_: any, record: Lead) => {
        const prods = (record as any).products || [];
        if (prods.length === 0) return <span className="text-slate-400 text-xs italic">—</span>;
        return (
          <div className="flex flex-wrap gap-1 max-w-[200px]">
            {prods.map((p: any) => (
              <Tag key={p.id} color={p.isPrimary ? 'purple' : 'blue'} className="text-[11px] font-medium">
                📦 {p.product?.name || p.productId} {p.isPrimary ? '★' : ''}
              </Tag>
            ))}
          </div>
        );
      },
    },
    {
      title: 'Đánh giá',
      dataIndex: 'rating',
      key: 'rating',
      render: (rating: string) => getRatingTag(rating),
    },
    {
      title: 'Ngày tiếp cận',
      key: 'receivedAt',
      render: (_: any, record: Lead) => {
        const dateVal = record.receivedAt || record.createdAt;
        return (
          <Tooltip title={record.receivedAt ? `Ngày tiếp cận thực tế: ${new Date(record.receivedAt).toLocaleString('vi-VN')}\n(Nhập hệ thống: ${new Date(record.createdAt).toLocaleString('vi-VN')})` : `Ngày nhập: ${new Date(record.createdAt).toLocaleString('vi-VN')}`}>
            <span className="text-xs font-medium text-slate-600">
              📅 {new Date(dateVal).toLocaleDateString('vi-VN')}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: 'Sale phụ trách',
      key: 'owner',
      render: (_: any, record: Lead) => (
        <span className="text-xs font-semibold text-slate-700">
          {record.owner ? `👤 ${record.owner.lastName} ${record.owner.firstName}` : <Tag color="default">Chưa bổ nhiệm</Tag>}
        </span>
      ),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_: any, record: Lead) => (
        <div className="space-x-2">
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
              {t('leads.convert')}
            </Button>
          )}
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenEditDrawer(record)}
          />
          <Popconfirm
            title="Xóa Lead này?"
            onConfirm={() => handleDeleteLead(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">{t('leads.title')}</h1>
          <p className="text-sm text-slate-500">{t('leads.subtitle')}</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          onClick={handleOpenCreateDrawer}
          className="bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200"
        >
          {t('leads.addLead')}
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
        <Input
          placeholder={t('common.search') + '...'}
          prefix={<SearchOutlined className="text-slate-400" />}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-64"
          allowClear
        />

        <Select
          placeholder={t('common.status')}
          value={statusFilter}
          onChange={(val) => {
            setStatusFilter(val);
            setPage(1);
          }}
          className="w-40"
          allowClear
        >
          <Select.Option value="NEW">{t('leads.status.NEW')}</Select.Option>
          <Select.Option value="CONTACTED">{t('leads.status.CONTACTED')}</Select.Option>
          <Select.Option value="QUALIFIED">{t('leads.status.QUALIFIED')}</Select.Option>
          <Select.Option value="UNQUALIFIED">{t('leads.status.UNQUALIFIED')}</Select.Option>
          <Select.Option value="CONVERTED">{t('leads.status.CONVERTED')}</Select.Option>
          <Select.Option value="LOST">Mất</Select.Option>
        </Select>

        <Select
          placeholder="Đánh giá"
          value={ratingFilter}
          onChange={(val) => {
            setRatingFilter(val);
            setPage(1);
          }}
          className="w-40"
          allowClear
        >
          <Select.Option value="HOT">Nóng (Hot)</Select.Option>
          <Select.Option value="WARM">Ấm (Warm)</Select.Option>
          <Select.Option value="COLD">Lạnh (Cold)</Select.Option>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-4">
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

      {/* Create/Edit Drawer */}
      <Drawer
        title={editingLead ? t('common.edit') : t('leads.addLead')}
        open={createDrawerVisible}
        onClose={() => setCreateDrawerVisible(false)}
        width={480}
        extra={
          <Button type="primary" onClick={() => form.submit()} className="bg-indigo-600">
            {t('common.save')}
          </Button>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSaveLead}>
          {!editingLead && (
            <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <label className="block text-xs font-semibold text-slate-600 mb-2">Loại hình Lead:</label>
              <Radio.Group
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                buttonStyle="solid"
                className="w-full grid grid-cols-2"
              >
                <Radio.Button value="CONTACT" className="text-center font-medium">👤 Cá nhân (Contact)</Radio.Button>
                <Radio.Button value="COMPANY" className="text-center font-medium">🏢 Doanh nghiệp (Company)</Radio.Button>
              </Radio.Group>
            </div>
          )}

          {identityResult && identityResult.status === 'MATCHED' && (
            <Alert
              type="success"
              showIcon
              message="Khớp Customer thành công!"
              description={`Số điện thoại/Email trùng với Customer ${identityResult.matchedCustomerName} (${identityResult.matchedCustomerCode}). Lead này sẽ được gắn trực tiếp vào Customer!`}
              className="mb-4"
            />
          )}

          {identityResult && identityResult.status === 'POTENTIAL_DUPLICATE' && (
            <Alert
              type="warning"
              showIcon
              message="Cảnh báo Trùng số Điện thoại (Potential Duplicate)"
              description={`Số điện thoại đã thuộc về Customer '${identityResult.matchedCustomerName}' (${identityResult.matchedCustomerCode}) nhưng tên Lead khác. CRM vẫn cho tạo Lead và gắn cờ chờ xác minh!`}
              className="mb-4"
            />
          )}

          <Form.Item name="receivedAt" label="📅 Ngày tiếp cận / Phát sinh Lead" tooltip="Nếu bạn đang nhập bù danh sách Lead cũ đã tiếp cận trước đó, hãy chọn ngày thực tế phát sinh tại đây. Mặc định là thời gian hiện tại.">
            <DatePicker showTime format="DD/MM/YYYY HH:mm" className="w-full" placeholder="Chọn ngày giờ tiếp cận..." />
          </Form.Item>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="firstName" label={t('leads.form.firstName')} rules={[{ required: true, message: 'Vui lòng nhập họ' }]}>
              <Input placeholder="Văn A" onBlur={handleIdentityBlur} />
            </Form.Item>
            <Form.Item name="lastName" label={t('leads.form.lastName')} rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
              <Input placeholder="Nguyễn" onBlur={handleIdentityBlur} />
            </Form.Item>
          </div>

          <Form.Item name="phone" label={t('common.phone')}>
            <Input placeholder="0901234567" onBlur={handleIdentityBlur} />
          </Form.Item>

          <Form.Item name="email" label={t('common.email')}>
            <Input placeholder="nguyenvana@example.com" onBlur={handleIdentityBlur} />
          </Form.Item>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="fbPsid" label="Facebook PSID (UID)">
              <Input placeholder="fb_102938475" onBlur={handleIdentityBlur} prefix={<span className="text-blue-600 font-bold text-xs">FB</span>} />
            </Form.Item>
            <Form.Item name="zaloUid" label="Zalo UID">
              <Input placeholder="zalo_987654321" onBlur={handleIdentityBlur} prefix={<span className="text-blue-500 font-bold text-xs">Zalo</span>} />
            </Form.Item>
          </div>

          <Form.Item name="ownerId" label="Sale phụ trách (Bổ nhiệm)">
            <Select placeholder="Chọn nhân viên Sale phụ trách" allowClear>
              {users.map((u) => (
                <Select.Option key={u.id} value={u.id}>
                  👤 {u.lastName} {u.firstName} ({u.email})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="companyName"
            label={t('leads.form.company')}
            rules={entityType === 'COMPANY' ? [{ required: true, message: 'Vui lòng nhập tên công ty' }] : []}
          >
            <Input placeholder="Công ty ABC" />
          </Form.Item>

          <Form.Item name="jobTitle" label={t('leads.form.title')}>
            <Input placeholder="Giám đốc kinh doanh" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="source" label={t('leads.source')} initialValue="WEBSITE">
              <Select>
                <Select.Option value="WEBSITE">🌐 Website</Select.Option>
                <Select.Option value="FB_ADS">📢 Facebook Ads</Select.Option>
                <Select.Option value="FACEBOOK">📘 Facebook (Fanpage/Group)</Select.Option>
                <Select.Option value="ZALO">💬 Zalo</Select.Option>
                <Select.Option value="INSTAGRAM">📸 Instagram</Select.Option>
                <Select.Option value="TIKTOK">🎵 TikTok</Select.Option>
                <Select.Option value="GOOGLE_ADS">🎯 Google Ads</Select.Option>
                <Select.Option value="REFERRAL">🤝 Giới thiệu (Referral)</Select.Option>
                <Select.Option value="EVENT">🎪 Hội thảo / Sự kiện</Select.Option>
                <Select.Option value="OUTBOUND">📞 Outbound / Trực tiếp</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="rating" label="Đánh giá" initialValue="WARM">
              <Select>
                <Select.Option value="HOT">Nóng (Hot)</Select.Option>
                <Select.Option value="WARM">Ấm (Warm)</Select.Option>
                <Select.Option value="COLD">Lạnh (Cold)</Select.Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item name="productIds" label="🛒 Sản phẩm / Dịch vụ quan tâm (Chọn nhiều)">
            <Select
              mode="multiple"
              placeholder="Chọn các sản phẩm khách hàng quan tâm..."
              allowClear
              optionFilterProp="children"
            >
              {products.map((p) => (
                <Select.Option key={p.id} value={p.id}>
                  📦 {p.name} ({p.code}) - {p.unitPrice ? `${p.unitPrice.toLocaleString('vi-VN')} VND` : 'Liên hệ'}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="notes" label={t('common.notes')}>
            <Input.TextArea rows={3} placeholder="Ghi chú thêm về tiềm năng..." />
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

import React, { useState, useEffect, useRef } from 'react';
import { Table, Button, Input, Select, Tag, Drawer, Form, Popconfirm, notification, Alert, Space, Radio, DatePicker, Tooltip, Popover, Avatar } from 'antd';
import { PlusOutlined, SearchOutlined, EyeOutlined, EditOutlined, SwapOutlined, DeleteOutlined, WarningOutlined, CheckCircleOutlined, SettingOutlined, FilterOutlined, DownloadOutlined, AppstoreOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { useBizNavigate } from '../../hooks/useBizNavigate';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { crmService } from '../../services/crmService';
import { Lead, User } from '../../types';
import { LeadConvertModal } from './LeadConvertModal';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAuthStore } from '../../stores/authStore';
import { parseFbPsidInput, parseZaloUidInput } from '../../utils/identityHelper';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { PageHeader } from '../../components/common/PageHeader';



const QuickProductSelector: React.FC<{ record: Lead; products: any[]; onUpdated: () => void }> = ({ record, products, onUpdated }) => {
  const currentProductIds = (record as any).products ? (record as any).products.map((p: any) => p.productId) : [];
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>(currentProductIds);
  const [loading, setLoading] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    const freshProductIds = (record as any).products ? (record as any).products.map((p: any) => p.productId) : [];
    setSelectedIds(freshProductIds);
  }, [record]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await crmService.updateLead(record.id, { productIds: selectedIds });
      notification.success({ message: 'Đã cập nhật sản phẩm cho Lead!' });
      setPopoverOpen(false);
      onUpdated();
    } catch (err: any) {
      notification.error({ message: 'Cập nhật sản phẩm thất bại', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div className="p-2 space-y-3 w-80">
      <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
        <span>🛒 Thêm / Chọn sản phẩm quan tâm</span>
      </div>
      <Select
        mode="multiple"
        className="w-full"
        placeholder="Chọn các sản phẩm..."
        value={selectedIds}
        onChange={setSelectedIds}
        optionFilterProp="children"
        allowClear
      >
        {products.map((p) => (
          <Select.Option key={p.id} value={p.id}>
            📦 {p.name} ({p.code})
          </Select.Option>
        ))}
      </Select>
      <div className="flex justify-end gap-2 pt-1">
        <Button size="small" onClick={() => setPopoverOpen(false)}>Hủy</Button>
        <Button size="small" type="primary" loading={loading} onClick={handleSave} className="bg-indigo-600">
          Lưu thay đổi
        </Button>
      </div>
    </div>
  );

  const prods = (record as any).products || [];

  return (
    <div className="flex items-center gap-1.5 flex-wrap max-w-[220px]">
      {prods.length > 0 ? (
        prods.map((p: any) => (
          <Tag key={p.id} color={p.isPrimary ? 'purple' : 'blue'} className="text-[11px] font-medium">
            📦 {p.product?.name || p.productId} {p.isPrimary ? '★' : ''}
          </Tag>
        ))
      ) : (
        <span className="text-slate-400 text-xs italic">Chưa có sản phẩm</span>
      )}
      <Popover
        content={content}
        title={null}
        trigger="click"
        open={popoverOpen}
        onOpenChange={setPopoverOpen}
        placement="bottomLeft"
      >
        <Button
          type="dashed"
          size="small"
          icon={<PlusOutlined />}
          className="text-xs text-indigo-600 border-indigo-200 hover:border-indigo-500 h-6 px-1.5 rounded"
          title="Thêm/Sửa sản phẩm trực tiếp"
        >
          {prods.length === 0 ? 'Thêm SP' : ''}
        </Button>
      </Popover>
    </div>
  );
};

const QuickStatusSelector: React.FC<{ record: Lead; onUpdated: () => void }> = ({ record, onUpdated }) => {
  const [updating, setUpdating] = useState(false);
  const { t } = useTranslation();

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === record.status) return;
    setUpdating(true);
    try {
      await crmService.updateLead(record.id, { status: newStatus });
      notification.success({ message: `Đã đổi trạng thái Lead!` });
      onUpdated();
    } catch (err: any) {
      notification.error({ message: 'Cập nhật trạng thái thất bại', description: err.message });
    } finally {
      setUpdating(false);
    }
  };

  if (record.status === 'CONVERTED') {
    return <Tag color="green">✅ {t('leads.status.CONVERTED')}</Tag>;
  }

  return (
    <Select
      value={record.status}
      size="small"
      loading={updating}
      onChange={handleStatusChange}
      className="w-32 font-medium"
      variant="borderless"
      popupMatchSelectWidth={false}
      style={{
        borderRadius: '6px',
        backgroundColor:
          record.status === 'NEW' ? '#eff6ff' :
            record.status === 'CONTACTED' ? '#faf5ff' :
              record.status === 'QUALIFIED' ? '#ecfeff' :
                record.status === 'NURTURING' ? '#fefce8' :
                  record.status === 'LOST' ? '#fef2f2' : '#f8fafc',
      }}
    >
      <Select.Option value="NEW">
        <Tag color="blue" className="mr-0">{t('leads.status.NEW')}</Tag>
      </Select.Option>
      <Select.Option value="CONTACTED">
        <Tag color="purple" className="mr-0">{t('leads.status.CONTACTED')}</Tag>
      </Select.Option>
      <Select.Option value="QUALIFIED">
        <Tag color="cyan" className="mr-0">{t('leads.status.QUALIFIED')}</Tag>
      </Select.Option>
      <Select.Option value="NURTURING">
        <Tag color="gold" className="mr-0">🌱 Nuôi dưỡng</Tag>
      </Select.Option>
      <Select.Option value="UNQUALIFIED">
        <Tag color="default" className="mr-0">{t('leads.status.UNQUALIFIED')}</Tag>
      </Select.Option>
      <Select.Option value="LOST">
        <Tag color="red" className="mr-0">Mất (Lost)</Tag>
      </Select.Option>
    </Select>
  );
};

export interface LeadListPageProps {
  isMyLeads?: boolean;
}

export const LeadListPage: React.FC<LeadListPageProps> = ({ isMyLeads = false }) => {
  const { user } = useAuthStore();
  const { defaultEntityType } = useSettingsStore();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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
  const [fetchingSmax, setFetchingSmax] = useState(false);
  const lastFetchedSmaxUrlRef = useRef<string>('');

  const handleFetchSmaxThread = async (url: string) => {
    if (!url || !url.trim().includes('smax.ai')) return;
    const trimmed = url.trim();
    if (trimmed === lastFetchedSmaxUrlRef.current) return;

    lastFetchedSmaxUrlRef.current = trimmed;
    setFetchingSmax(true);
    try {
      const res: any = await crmService.fetchSmaxThread(trimmed);
      if (res.success && res.data) {
        const { name, phone, fbPsid, fbPageId, fbPageName, smaxBizSlug, source, adId, adIds } = res.data;
        const currentPhone = form.getFieldValue('phone');
        const currentFbPsid = form.getFieldValue('fbPsid');
        const currentAdIds = form.getFieldValue('adIds') || [];

        const extractedAds = adIds || (adId ? [adId] : []);
        const mergedAdIds = Array.from(new Set([...currentAdIds, ...extractedAds]));

        form.setFieldsValue({
          firstName: name || form.getFieldValue('firstName'),
          phone: phone || currentPhone,
          fbPsid: fbPsid || currentFbPsid,
          fbPageId: fbPageId || form.getFieldValue('fbPageId'),
          fbPageName: fbPageName || form.getFieldValue('fbPageName'),
          smaxBizSlug: smaxBizSlug || form.getFieldValue('smaxBizSlug'),
          source: source || (extractedAds.length > 0 ? 'FB_ADS' : 'FACEBOOK'),
          adIds: mergedAdIds,
        });

        notification.success({
          message: 'Đã tự động lấy thông tin từ Smax.ai!',
          description: `Tên: ${name || '—'} | SĐT: ${phone || '—'} | PSID: ${fbPsid || '—'}${fbPageName ? ` | Page: ${fbPageName}` : ''}${extractedAds.length > 0 ? ` | Ad ID: ${extractedAds.join(', ')}` : ''}`,
        });

        setTimeout(() => {
          handleIdentityBlur();
        }, 200);
      }
    } catch (err: any) {
      notification.error({
        message: 'Lỗi lấy dữ liệu từ Smax.ai',
        description: err.message || 'Vui lòng kiểm tra lại đường dẫn hội thoại Smax.ai',
      });
    } finally {
      setFetchingSmax(false);
    }
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res: any = await crmService.getLeads({
        page,
        limit: pageSize,
        search,
        status: statusFilter,
        rating: ratingFilter,
        ownerId: isMyLeads ? user?.id : undefined,
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
  }, [page, pageSize, search, statusFilter, ratingFilter, isMyLeads, user?.id]);

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

    // Auto select Lead Source based on which identity field was filled first (unless already FB_ADS)
    const currentSource = form.getFieldValue('source');
    const hasFb = Boolean(fbPsid && fbPsid.trim());
    const hasZalo = Boolean(zaloUid && zaloUid.trim());

    if (currentSource !== 'FB_ADS' && currentSource !== 'FACEBOOK_ADS') {
      if (hasFb && !hasZalo) {
        form.setFieldsValue({ source: 'FACEBOOK' });
      } else if (hasZalo && !hasFb) {
        form.setFieldsValue({ source: 'ZALO' });
      }
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
      case 'NURTURING': return <Tag color="gold">🌱 {t('leads.status.NURTURING') || 'Nuôi dưỡng'}</Tag>;
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
      title: 'Liên hệ / Công ty',
      key: 'contact',
      render: (_: any, record: Lead) => (
        <div className="text-xs space-y-0.5">
          {record.email && <div className="text-slate-600 font-medium">✉ {record.email}</div>}
          {record.phone && <div className="text-slate-500 font-medium">📞 {record.phone}</div>}
          {record.companyName && (
            <div className="text-slate-700 font-semibold flex items-center gap-1 mt-0.5">
              🏢 {record.companyName}
            </div>
          )}
        </div>
      ),
    },
    {
      title: t('leads.source'),
      key: 'source',
      render: (_: any, record: Lead) => {
        const source = record.source;
        const fbPageName = (record as any).fbPageName;
        const isFacebook = source === 'FACEBOOK' || source === 'FB_ADS';
        return (
          <div className="space-y-0.5">
            <Tag color={source === 'FB_ADS' ? 'volcano' : source === 'FACEBOOK' ? 'blue' : 'default'}>
              {source === 'FB_ADS' ? '📢 FB Ads' : source === 'FACEBOOK' ? '📘 Facebook' : source}
            </Tag>
            {isFacebook && fbPageName && (
              <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1 max-w-[160px]" title={fbPageName}>
                <span>🚩</span>
                <span className="truncate">{fbPageName}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: t('common.status'),
      key: 'status',
      render: (_: any, record: Lead) => <QuickStatusSelector record={record} onUpdated={fetchLeads} />,
    },
    {
      title: 'Sản phẩm quan tâm',
      key: 'products',
      render: (_: any, record: Lead) => (
        <QuickProductSelector record={record} products={products} onUpdated={fetchLeads} />
      ),
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
        <div className="flex items-center gap-1">
          <Tooltip title="Xem chi tiết">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/leads/${record.id}`)}
            />
          </Tooltip>

          <Tooltip title="Chỉnh sửa">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenEditDrawer(record)}
            />
          </Tooltip>

          <Popconfirm
            title="Xóa Lead này?"
            onConfirm={() => handleDeleteLead(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Tooltip title="Xóa">
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>

          {record.status !== 'CONVERTED' && (
            <Tooltip title={t('leads.convert')}>
              <Button
                size="small"
                type="primary"
                ghost
                icon={<SwapOutlined />}
                onClick={() => {
                  setSelectedLead(record);
                  setConvertModalVisible(true);
                }}
              />
            </Tooltip>
          )}
        </div>
      ),
    },
  ];

  // View mode & Popover filter states
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('list');
  const [filterPopoverOpen, setPopoverFilterOpen] = useState(false);

  const handleExportLeads = () => {
    if (leads.length === 0) {
      notification.info({ message: 'Không có dữ liệu Lead để xuất file' });
      return;
    }
    const headers = ['ID', 'Họ', 'Tên', 'Email', 'Số điện thoại', 'Công ty', 'Nguồn', 'Trạng thái', 'Đánh giá', 'Ngày tiếp cận'];
    const rows = leads.map((l) => [
      l.id,
      `"${l.lastName || ''}"`,
      `"${l.firstName || ''}"`,
      `"${l.email || ''}"`,
      `"${l.phone || ''}"`,
      `"${l.companyName || ''}"`,
      `"${l.source || ''}"`,
      `"${l.status || ''}"`,
      `"${l.rating || ''}"`,
      `"${new Date(l.receivedAt || l.createdAt).toLocaleDateString('vi-VN')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `leads_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notification.success({ message: 'Đã xuất file Leads CSV thành công!' });
  };

  const filterPopoverContent = (
    <div className="p-3 space-y-3 w-64">
      <div className="font-bold text-xs text-slate-800 border-b pb-1.5 flex items-center justify-between">
        <span>⚡ Bộ lọc Lead</span>
        {(statusFilter || ratingFilter) && (
          <Button
            type="link"
            size="small"
            onClick={() => {
              setStatusFilter(undefined);
              setRatingFilter(undefined);
              setPopoverFilterOpen(false);
            }}
            className="text-[11px] p-0 h-auto text-indigo-600"
          >
            Xóa lọc
          </Button>
        )}
      </div>
      <div>
        <label className="text-[11px] font-semibold text-slate-600 block mb-1">Trạng thái</label>
        <Select
          placeholder="Tất cả trạng thái"
          value={statusFilter}
          onChange={(val) => {
            setStatusFilter(val);
            setPage(1);
          }}
          className="w-full text-xs"
          allowClear
        >
          <Select.Option value="NEW">Chưa chăm sóc (Mới)</Select.Option>
          <Select.Option value="CONTACTED">Đang liên hệ</Select.Option>
          <Select.Option value="QUALIFIED">Điền form khảo sát</Select.Option>
          <Select.Option value="NURTURING">Đang chốt đơn</Select.Option>
          <Select.Option value="CONVERTED">Hoàn tất (Converted)</Select.Option>
          <Select.Option value="LOST">Thất bại (Lost)</Select.Option>
        </Select>
      </div>
      <div>
        <label className="text-[11px] font-semibold text-slate-600 block mb-1">Đánh giá (Priority)</label>
        <Select
          placeholder="Tất cả mức độ"
          value={ratingFilter}
          onChange={(val) => {
            setRatingFilter(val);
            setPage(1);
          }}
          className="w-full text-xs"
          allowClear
        >
          <Select.Option value="HOT">🔥 Nóng (Hot)</Select.Option>
          <Select.Option value="WARM">⚡ Ấm (Warm)</Select.Option>
          <Select.Option value="COLD">❄ Lạnh (Cold)</Select.Option>
        </Select>
      </div>
    </div>
  );

  // Define Kanban Columns for Leads
  const kanbanColumns = [
    { key: 'NEW', title: 'Chưa chăm sóc', color: 'blue', dotColor: '#3b82f6', bg: 'bg-blue-50/40', borderTop: 'border-t-4 border-blue-500' },
    { key: 'CONTACTED', title: 'Đang liên hệ', color: 'red', dotColor: '#ef4444', bg: 'bg-red-50/40', borderTop: 'border-t-4 border-red-500' },
    { key: 'QUALIFIED', title: 'Điền form khảo sát', color: 'purple', dotColor: '#8b5cf6', bg: 'bg-purple-50/40', borderTop: 'border-t-4 border-purple-500' },
    { key: 'NURTURING', title: 'Đang chốt đơn', color: 'teal', dotColor: '#14b8a6', bg: 'bg-teal-50/40', borderTop: 'border-t-4 border-teal-500' },
    { key: 'CONVERTED', title: 'Hoàn tất', color: 'green', dotColor: '#22c55e', bg: 'bg-emerald-50/40', borderTop: 'border-t-4 border-emerald-500' },
  ];

  return (
    <div className="space-y-4">
      {/* 1. Header Row (Title on Left, Config & View Switchers on Right) */}
      <PageHeader
        title={isMyLeads ? 'Lead của tôi' : 'Leads'}
        subtitle={isMyLeads ? 'Danh sách khách hàng tiềm năng được phân công trực tiếp cho bạn theo dõi và chăm sóc' : undefined}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        extra={
          <Button
            icon={<SettingOutlined className="text-slate-600 text-xs" />}
            onClick={() => navigate('/settings')}
            className="text-xs font-semibold text-slate-700 rounded-lg bg-white border border-slate-200 shadow-2xs h-8 px-3 flex items-center gap-1 hover:border-slate-300"
          >
            <span>Cấu hình</span>
          </Button>
        }
      />

      {/* 2. Control Row (Search Input on Left, Filter / Export / Add on Right) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        {/* Search Input Box */}
        <Input
          prefix={<SearchOutlined className="text-slate-400 text-xs" />}
          placeholder="Tìm kiếm lead..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          allowClear
          className="w-full sm:w-72 rounded-lg bg-white border-slate-200 text-xs py-1.5 shadow-2xs"
        />

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 shrink-0">
          {/* Lọc Button */}
          <Popover
            content={filterPopoverContent}
            trigger="click"
            placement="bottomRight"
            open={filterPopoverOpen}
            onOpenChange={setPopoverFilterOpen}
          >
            <Button
              icon={<FilterOutlined className="text-slate-600 text-xs" />}
              className={`text-xs font-semibold rounded-lg h-8 px-3 flex items-center gap-1.5 shadow-2xs border ${statusFilter || ratingFilter
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
            >
              <span>Lọc</span>
              {(statusFilter || ratingFilter) && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
            </Button>
          </Popover>

          {/* Export Button */}
          <Button
            icon={<DownloadOutlined className="text-slate-600 text-xs" />}
            onClick={handleExportLeads}
            className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg h-8 px-3 flex items-center gap-1.5 shadow-2xs hover:border-slate-300"
          >
            <span>Export</span>
          </Button>

          {/* + Thêm Primary Blue Button */}
          <PrimaryButton
            icon={<PlusOutlined />}
            onClick={handleOpenCreateDrawer}
          >
            Thêm
          </PrimaryButton>

        </div>
      </div>

      {/* 3. Main Display: Kanban Board or Table List */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 pt-1 items-start overflow-x-auto pb-4">
          {kanbanColumns.map((col) => {
            const colLeads = leads.filter((l) => l.status === col.key);
            return (
              <div
                key={col.key}
                className={`rounded-xl border border-slate-200/80 bg-white shadow-2xs ${col.borderTop} flex flex-col min-w-[240px] overflow-hidden`}
              >
                {/* Column Header */}
                <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.dotColor }} />
                    <span className="font-bold text-xs text-slate-800">{col.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
                      {colLeads.length}
                    </span>
                    <SettingOutlined className="text-slate-400 text-xs hover:text-slate-600 cursor-pointer" />
                  </div>
                </div>

                {/* Column Lead Cards */}
                <div className="p-2.5 space-y-2.5 min-h-[420px] max-h-[600px] overflow-y-auto bg-slate-50/30">
                  {colLeads.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs italic">Trống</div>
                  ) : (
                    colLeads.map((lead) => (
                      <div
                        key={lead.id}
                        onClick={() => navigate(`/leads/${lead.id}`)}
                        className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all duration-150 cursor-pointer space-y-2 group"
                      >
                        {/* Lead Card Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="bg-indigo-600 text-white font-bold text-xs h-7 w-7 shrink-0">
                              {lead.firstName ? lead.firstName[0] : 'L'}
                            </Avatar>
                            <span className="font-extrabold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors truncate max-w-[120px]">
                              {lead.lastName} {lead.firstName}
                            </span>
                          </div>
                          {getRatingTag(lead.rating)}
                        </div>

                        {/* Company & Source info */}
                        {lead.companyName && (
                          <div className="text-[11px] font-semibold text-slate-600 truncate flex items-center gap-1">
                            🏢 {lead.companyName}
                          </div>
                        )}

                        {/* Contact info & Date */}
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                          {lead.phone ? (
                            <span className="font-semibold text-slate-700 flex items-center gap-1">
                              📞 {lead.phone}
                            </span>
                          ) : (
                            <span className="italic text-slate-400">Chưa có SĐT</span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            📅 {new Date(lead.receivedAt || lead.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table List View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden p-4">
          <Table
            columns={columns}
            dataSource={leads}
            rowKey="id"
            loading={loading}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              onChange: (p, size) => {
                setPage(p);
                if (size && size !== pageSize) {
                  setPageSize(size);
                  setPage(1);
                }
              },
              showTotal: (totalCount, range) => (
                <span className="text-xs text-slate-500 font-medium">
                  Hiển thị {range[0]}-{range[1]} / {totalCount} Leads
                </span>
              ),
            }}
          />
        </div>
      )}


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

          <Form.Item
            name="smaxUrl"
            label="💬 Link hội thoại Chat Smax.ai (Tự động điền)"
            extra="Dán link hội thoại Smax.ai (VD: https://smax.ai/bizs/.../chats/...) để tự động lấy Tên, SĐT & PSID"
          >
            <Input
              placeholder="https://smax.ai/bizs/xe-dien-move/chats/fb760420303821103?tid=fb27040617945611633"
              onChange={(e) => handleFetchSmaxThread(e.target.value)}
              allowClear
            />
          </Form.Item>

          <Form.Item name="receivedAt" label="📅 Ngày tiếp cận / Phát sinh Lead" tooltip="Nếu bạn đang nhập bù danh sách Lead cũ đã tiếp cận trước đó, hãy chọn ngày thực tế phát sinh tại đây. Mặc định là thời gian hiện tại.">
            <DatePicker showTime format="DD/MM/YYYY HH:mm" className="w-full" placeholder="Chọn ngày giờ tiếp cận..." />
          </Form.Item>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="firstName" label="Tên khách hàng" rules={[{ required: true, message: 'Vui lòng nhập tên khách hàng' }]}>
              <Input placeholder="Ví dụ: Phúc Kính" onBlur={handleIdentityBlur} />
            </Form.Item>
            <Form.Item name="lastName" label="Họ & Tên đệm (Tùy chọn)">
              <Input placeholder="Tùy chọn" onBlur={handleIdentityBlur} />
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

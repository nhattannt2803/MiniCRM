import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useBizNavigate } from '../../hooks/useBizNavigate';
import { Card, Tag, Button, Select, Tabs, Modal, Form, Input, DatePicker, notification, Spin, Alert, Radio, Popconfirm, Tooltip } from 'antd';
import { ArrowLeftOutlined, SwapOutlined, PlusOutlined, PhoneOutlined, EditOutlined, WarningOutlined, MessageOutlined, SendOutlined, CheckOutlined, CheckCircleOutlined, SyncOutlined, LinkOutlined, UserOutlined, CustomerServiceOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { crmService } from '../../services/crmService';
import { Lead, User, Conversation, Customer } from '../../types';
import { ActivityTimeline } from '../../components/Timeline/ActivityTimeline';
import { LeadConvertModal } from './LeadConvertModal';

export const LeadDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useBizNavigate();

  const [lead, setLead] = useState<Lead | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [convertModalVisible, setConvertModalVisible] = useState(false);
  const [activityModalVisible, setActivityModalVisible] = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  
  // Default tab is 'tasks' as requested
  const [activeTabKey, setActiveTabKey] = useState('tasks');

  // Smax.ai Conversation state
  const [smaxUrlInput, setSmaxUrlInput] = useState('');
  const [smaxConvData, setSmaxConvData] = useState<any>(null);
  const [smaxLoading, setSmaxLoading] = useState(false);
  const [hasFetchedSmax, setHasFetchedSmax] = useState(false);

  const [activityForm] = Form.useForm();
  const [taskForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [resolveForm] = Form.useForm();

  const fetchLeadDetails = async () => {
    if (!id) return;
    try {
      const res: any = await crmService.getLeadById(id);
      if (res.success) {
        const leadData = res.data;
        setLead(leadData);

        // Auto-detect Smax.ai URL or PSID if present in notes, smaxBizSlug or conversations
        let detectedUrl = '';
        if (leadData.notes) {
          const match = leadData.notes.match(/https?:\/\/[^\s]*smax\.ai[^\s]*/i);
          if (match) detectedUrl = match[0];
        }
        if (!detectedUrl && leadData.conversations && leadData.conversations.length > 0) {
          for (const c of leadData.conversations) {
            if (c.channelThreadId && (c.channelThreadId.includes('smax.ai') || c.channelThreadId.includes('_'))) {
              detectedUrl = c.channelThreadId;
              break;
            }
          }
        }
        if (!detectedUrl && (leadData as any).fbPsid) {
          detectedUrl = (leadData as any).fbPsid;
        }
        if (!detectedUrl && leadData.customer?.identities) {
          const psidIdentity = leadData.customer.identities.find((i: any) => i.type === 'FB_PSID')?.identityValue;
          if (psidIdentity) detectedUrl = psidIdentity;
        }
        if (detectedUrl) {
          setSmaxUrlInput(detectedUrl);
        }
      }
    } catch (err) {
      notification.error({ message: 'Error', description: 'Lead not found' });
      navigate('/leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeadDetails();
    crmService.getUsers().then((res: any) => {
      if (res.success) setUsers(res.data);
    }).catch(err => console.error(err));
    crmService.getCustomers({ limit: 100 }).then((res: any) => {
      if (res.success) setCustomers(res.data);
    }).catch(err => console.error(err));
    crmService.getProducts().then((res: any) => {
      if (res.success) setProducts(res.data);
    }).catch(err => console.error(err));
  }, [id]);

  const handleOpenEditModal = () => {
    if (!lead) return;
    const currentProductIds = (lead as any).products
      ? (lead as any).products.map((p: any) => p.productId)
      : [];
    const currentAdIds = (lead as any).adIds || [];
    editForm.setFieldsValue({
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
      fbPageName: (lead as any).fbPageName,
      fbPageId: (lead as any).fbPageId,
      productIds: currentProductIds,
      adIds: currentAdIds,
    });
    setEditModalVisible(true);
  };

  const handleUpdateLead = async (values: any) => {
    if (!id) return;
    try {
      await crmService.updateLead(id, values);
      notification.success({ message: 'Chỉnh sửa tiềm năng thành công' });
      setEditModalVisible(false);
      fetchLeadDetails();
    } catch (err: any) {
      notification.error({ message: 'Cập nhật thất bại', description: err.message });
    }
  };

  const handleResolveIdentity = async (values: any) => {
    if (!id) return;
    try {
      await crmService.resolveLeadIdentity(id, values.action, values.targetCustomerId);
      notification.success({ message: 'Xác minh điểm nhận diện thành công!' });
      setResolveModalVisible(false);
      fetchLeadDetails();
    } catch (err: any) {
      notification.error({ message: 'Thất bại', description: err.message });
    }
  };

  const handleFetchSmaxMessages = async (forceRefresh: boolean = false, overrideUrl?: string) => {
    const urlToUse = (
      overrideUrl ||
      smaxUrlInput ||
      (lead as any)?.fbPsid ||
      (lead as any)?.customer?.identities?.find((i: any) => i.type === 'FB_PSID')?.identityValue ||
      ''
    ).trim();

    if (!urlToUse) {
      notification.warning({
        message: 'Chưa có đường dẫn hội thoại hoặc mã PSID',
        description: 'Vui lòng dán link hội thoại Smax.ai (https://smax.ai/bizs/.../chats/...) hoặc mã PSID để lấy dữ liệu tin nhắn.',
      });
      return;
    }

    setSmaxLoading(true);
    try {
      const res: any = await crmService.fetchSmaxMessages({
        url: urlToUse,
        psid: urlToUse,
        forceRefresh,
        smaxBizSlug: (lead as any)?.smaxBizSlug,
      });
      if (res.success && res.data) {
        setSmaxConvData(res.data);
        setHasFetchedSmax(true);
        if (forceRefresh) {
          notification.success({
            message: 'Đã làm mới dữ liệu hội thoại Smax.ai',
            description: 'Dữ liệu tin nhắn mới nhất đã được lưu cache trong 15 phút.',
          });
        }
      }
    } catch (err: any) {
      notification.error({
        message: 'Lỗi tải hội thoại Smax.ai',
        description: err.message || 'Vui lòng kiểm tra lại đường dẫn hội thoại Smax.ai hoặc Smax API Token.',
      });
    } finally {
      setSmaxLoading(false);
    }
  };

  useEffect(() => {
    if (activeTabKey === 'conversations' && !hasFetchedSmax) {
      const urlOrPsidToUse =
        smaxUrlInput.trim() ||
        (lead as any)?.fbPsid ||
        (lead as any)?.customer?.identities?.find((i: any) => i.type === 'FB_PSID')?.identityValue;
      if (urlOrPsidToUse) {
        handleFetchSmaxMessages(false, urlOrPsidToUse);
      }
    }
  }, [activeTabKey, smaxUrlInput, hasFetchedSmax, lead]);

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    try {
      await crmService.updateLead(id, { status: newStatus });
      notification.success({ message: 'Status Updated' });
      fetchLeadDetails();
    } catch (err: any) {
      notification.error({ message: 'Update Failed', description: err.message });
    }
  };

  const handleLogActivity = async (values: any) => {
    if (!id) return;
    try {
      await crmService.createActivity({ ...values, relatedType: 'LEAD', relatedId: id });
      notification.success({ message: 'Activity Logged' });
      setActivityModalVisible(false);
      activityForm.resetFields();
      setActiveTabKey('timeline');
      fetchLeadDetails();
    } catch (err: any) {
      notification.error({ message: 'Log Failed', description: err.message });
    }
  };

  const handleCreateTask = async (values: any) => {
    if (!id) return;
    try {
      await crmService.createTask({
        ...values,
        dueAt: values.dueAt.toISOString(),
        relatedType: 'LEAD',
        relatedId: id,
      });
      notification.success({ message: 'Task Created' });
      setTaskModalVisible(false);
      taskForm.resetFields();
      setActiveTabKey('tasks');
      fetchLeadDetails();
    } catch (err: any) {
      notification.error({ message: 'Task Creation Failed', description: err.message });
    }
  };

  const handleConfirmCompleteTask = async (task: any) => {
    try {
      await crmService.updateTaskStatus(task.id, 'COMPLETED');
      notification.success({
        message: 'Xác nhận hoàn thành thành công',
        description: `Đã hoàn thành nhiệm vụ: "${task.title}"`,
      });
      fetchLeadDetails();
    } catch (err: any) {
      notification.error({ message: 'Thất bại', description: err.message });
    }
  };

  if (loading || !lead) {
    return <div className="h-96 flex items-center justify-center"><Spin size="large" /></div>;
  }

  const activeConv = lead.conversations && lead.conversations.length > 0 ? lead.conversations[0] : null;

  // Filter only customers that are duplicates/matching with the current Lead
  const duplicateCustomers = customers.filter((c: any) => {
    if (!lead) return false;
    if (lead.customerId && String(c.id) === String(lead.customerId)) return true;

    const leadPhone = lead.phone?.trim();
    const leadEmail = lead.email?.trim().toLowerCase();

    const phoneMatch = Boolean(
      leadPhone && (
        c.company?.phone?.trim() === leadPhone ||
        c.contact?.phone?.trim() === leadPhone ||
        c.company?.contacts?.some((ct: any) => ct.phone?.trim() === leadPhone) ||
        c.identities?.some((i: any) => i.type === 'PHONE' && i.identityValue?.trim() === leadPhone)
      )
    );

    const emailMatch = Boolean(
      leadEmail && (
        c.company?.email?.trim().toLowerCase() === leadEmail ||
        c.contact?.email?.trim().toLowerCase() === leadEmail ||
        c.company?.contacts?.some((ct: any) => ct.email?.trim().toLowerCase() === leadEmail) ||
        c.identities?.some((i: any) => i.type === 'EMAIL' && i.identityValue?.trim().toLowerCase() === leadEmail)
      )
    );

    return phoneMatch || emailMatch;
  });

  const targetCustomers = duplicateCustomers.length > 0 ? duplicateCustomers : customers;

  return (
    <div className="space-y-6">
      {/* Potential Duplicate Banner */}
      {lead.identityResolutionStatus === 'POTENTIAL_DUPLICATE' && (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined className="text-xl" />}
          message={
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-bold text-amber-900 text-base block">⚠️ Cảnh báo Trùng điểm Nhận diện (Potential Duplicate)</span>
                <span className="text-xs text-amber-800">
                  Số điện thoại <strong>{lead.phone}</strong> đã thuộc về một Customer trên hệ thống nhưng tên Lead khác nhau.
                </span>
              </div>
              <Button
                type="primary"
                danger
                size="small"
                onClick={() => setResolveModalVisible(true)}
                className="bg-amber-600 border-amber-600 hover:bg-amber-700 font-semibold"
              >
                Xác minh ngay (Resolve Identity)
              </Button>
            </div>
          }
        />
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/leads')} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">
                {lead.lastName} {lead.firstName}
              </h1>
              <Tag color="blue">{lead.status}</Tag>
              {lead.customer && (
                <Tag color="green" className="cursor-pointer" onClick={() => navigate(`/customers/${lead.customer?.id}`)}>
                  🏢 Customer: {lead.customer.customerCode}
                </Tag>
              )}
            </div>
            <p className="text-sm text-slate-500">{lead.companyName || 'Individual Prospect'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button icon={<EditOutlined />} onClick={handleOpenEditModal}>
            Chỉnh sửa thông tin
          </Button>

          <Select
            value={lead.status}
            onChange={handleStatusChange}
            className="w-40"
          >
            <Select.Option value="NEW">NEW</Select.Option>
            <Select.Option value="CONTACTED">CONTACTED</Select.Option>
            <Select.Option value="QUALIFIED">QUALIFIED</Select.Option>
            <Select.Option value="NURTURING">🌱 NURTURING (Nuôi dưỡng)</Select.Option>
            <Select.Option value="UNQUALIFIED">UNQUALIFIED</Select.Option>
            <Select.Option value="LOST">LOST</Select.Option>
          </Select>

          {lead.status !== 'CONVERTED' && (
            <Button
              type="primary"
              icon={<SwapOutlined />}
              className="bg-indigo-600 font-semibold"
              onClick={() => setConvertModalVisible(true)}
            >
              Convert Lead
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details Card */}
        <div className="space-y-6">
          <Card title="Prospect Profile" className="shadow-xs border-slate-200 rounded-xl bg-white">
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-slate-400 font-medium block text-xs">Email</span>
                <span className="text-slate-800 font-semibold">{lead.email || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-xs">Phone</span>
                <span className="text-slate-800 font-semibold">{lead.phone || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-xs">Job Title</span>
                <span className="text-slate-800 font-semibold">{lead.jobTitle || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-xs">Source</span>
                <Tag color={lead.source === 'FB_ADS' ? 'volcano' : 'blue'}>{lead.source}</Tag>
              </div>
              {Boolean((lead as any).fbPageName || (lead as any).fbPageId) && (
                <div>
                  <span className="text-slate-400 font-medium block text-xs">Facebook Fanpage</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Tag color="magenta" className="font-medium text-xs">
                      🚩 {(lead as any).fbPageName || 'Facebook Page'}
                    </Tag>
                    {(lead as any).fbPageId && (
                      <span className="text-xs text-slate-400 font-mono">(ID: {(lead as any).fbPageId})</span>
                    )}
                  </div>
                </div>
              )}
              {Boolean((lead as any).adIds && (lead as any).adIds.length > 0) && (
                <div>
                  <span className="text-slate-400 font-medium block text-xs">Facebook Ad IDs</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(lead as any).adIds.map((adId: string) => (
                      <Tag key={adId} color="volcano" className="font-mono text-xs">📢 Ad: {adId}</Tag>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <span className="text-slate-400 font-medium block text-xs">Identity Status</span>
                <Tag color={lead.identityResolutionStatus === 'POTENTIAL_DUPLICATE' ? 'orange' : 'green'}>
                  {lead.identityResolutionStatus || 'MATCHED'}
                </Tag>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-xs">Owner</span>
                <span className="text-slate-800 font-semibold">
                  {lead.owner ? `${lead.owner.lastName} ${lead.owner.firstName}` : 'Unassigned'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-xs">Ngày tiếp cận / Phát sinh Lead</span>
                <span className="text-slate-800 font-semibold">
                  📅 {new Date(lead.receivedAt || lead.createdAt).toLocaleString('vi-VN')}
                </span>
                {lead.receivedAt && (
                  <span className="text-slate-400 text-[11px] block mt-0.5">
                    (Thời điểm nhập hệ thống: {new Date(lead.createdAt).toLocaleString('vi-VN')})
                  </span>
                )}
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-xs mb-1">🛒 Sản phẩm quan tâm</span>
                {(lead as any).products && (lead as any).products.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {(lead as any).products.map((p: any) => (
                      <Tag key={p.id} color={p.isPrimary ? 'purple' : 'blue'} className="text-xs font-medium">
                        📦 {p.product?.name || p.productId} {p.isPrimary ? '★' : ''}
                      </Tag>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400 text-xs italic">Chưa chọn sản phẩm quan tâm</span>
                )}
              </div>
              {lead.notes && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-400 font-medium block text-xs">Notes</span>
                  <p className="text-slate-600 text-xs mt-1 whitespace-pre-wrap">{lead.notes}</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Tabs */}
        <div className="lg:col-span-2 space-y-6">
          <Card
            className="shadow-xs border-slate-200 rounded-xl bg-white"
            extra={
              <div className="flex gap-2">
                <Button
                  size="small"
                  icon={<PhoneOutlined />}
                  onClick={() => setActivityModalVisible(true)}
                >
                  Log Activity
                </Button>
                <Button
                  size="small"
                  type="primary"
                  icon={<PlusOutlined />}
                  className="bg-indigo-600"
                  onClick={() => setTaskModalVisible(true)}
                >
                  Create Task
                </Button>
              </div>
            }
          >
            <Tabs
              activeKey={activeTabKey}
              onChange={(k) => setActiveTabKey(k)}
              items={[
                {
                  key: 'tasks',
                  label: `Tasks / Nhiệm vụ (${lead.tasks?.length || 0})`,
                  children: (
                    <div className="space-y-3 py-2">
                      {lead.tasks && lead.tasks.length > 0 ? (
                        lead.tasks.map((t) => (
                          <div key={t.id} className="p-3 border border-slate-100 rounded-lg flex items-center justify-between">
                            <div>
                              <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                <span className={t.status === 'COMPLETED' ? 'line-through text-slate-400' : ''}>{t.title}</span>
                                {t.assignee && (
                                  <span className="text-xs font-normal text-indigo-600">
                                    👤 {t.assignee.lastName} {t.assignee.firstName}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                Hạn chót: {new Date(t.dueAt).toLocaleString('vi-VN')} | Độ ưu tiên: {t.priority}
                              </div>
                            </div>
                            <div>
                              {t.status === 'COMPLETED' ? (
                                <Tag color="green" className="font-semibold">
                                  <CheckCircleOutlined /> Đã hoàn thành
                                </Tag>
                              ) : (
                                <Popconfirm
                                  title="Xác nhận hoàn thành nhiệm vụ?"
                                  description={`Bạn có chắc chắn muốn xác nhận hoàn thành "${t.title}"?`}
                                  onConfirm={() => handleConfirmCompleteTask(t)}
                                  okText="Đồng ý"
                                  cancelText="Hủy"
                                  okButtonProps={{ type: 'primary', className: 'bg-emerald-600' }}
                                >
                                  <Tooltip title="Bấm dấu tích để xác nhận hoàn thành">
                                    <Button
                                      type="dashed"
                                      size="small"
                                      icon={<CheckOutlined className="text-emerald-600 font-bold" />}
                                      className="border-emerald-400 text-emerald-700 hover:bg-emerald-50"
                                    >
                                      Xác nhận
                                    </Button>
                                  </Tooltip>
                                </Popconfirm>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-slate-400 text-xs text-center py-6">Chưa có nhiệm vụ nào</div>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'conversations',
                  label: `💬 Hội thoại Smax.ai`,
                  children: (
                    <div className="space-y-4 py-2">
                      {/* Smax URL Bar & Actions */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1 flex items-center gap-2">
                            <Input
                              prefix={<LinkOutlined className="text-slate-400" />}
                              placeholder="Dán link Smax.ai (https://smax.ai/bizs/.../chats/...)"
                              value={smaxUrlInput}
                              onChange={(e) => setSmaxUrlInput(e.target.value)}
                              onPressEnter={() => handleFetchSmaxMessages(true)}
                              allowClear
                            />
                            <Button
                              type="primary"
                              className="bg-indigo-600"
                              loading={smaxLoading}
                              onClick={() => handleFetchSmaxMessages(false)}
                            >
                              {smaxConvData ? 'Tải lại' : 'Lấy hội thoại'}
                            </Button>
                          </div>

                          {smaxConvData && (
                            <Button
                              icon={<SyncOutlined spin={smaxLoading} />}
                              onClick={() => handleFetchSmaxMessages(true)}
                              className="border-indigo-500 text-indigo-600 hover:bg-indigo-50"
                            >
                              Làm mới (Clear Cache)
                            </Button>
                          )}
                        </div>

                        {/* Cache status & Customer Info */}
                        {smaxConvData && (
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-700">Khách hàng:</span>
                              <span className="text-slate-900 font-bold">{smaxConvData.customerInfo?.name || '—'}</span>
                              {smaxConvData.customerInfo?.phone && (
                                <Tag color="blue" className="font-mono">{smaxConvData.customerInfo.phone}</Tag>
                              )}
                              {smaxConvData.customerInfo?.fbPsid && (
                                <Tag color="purple" className="font-mono">PSID: {smaxConvData.customerInfo.fbPsid}</Tag>
                              )}
                              {smaxConvData.customerInfo?.smaxBizSlug && (
                                <Tag color="cyan" className="font-mono">Biz: {smaxConvData.customerInfo.smaxBizSlug}</Tag>
                              )}
                            </div>

                            <div>
                              {smaxConvData.fromCache ? (
                                <Tag color="blue" icon={<ClockCircleOutlined />}>
                                  ⚡ Cache 15 phút (Cập nhật: {new Date(smaxConvData.cachedAt).toLocaleTimeString('vi-VN')})
                                </Tag>
                              ) : (
                                <Tag color="green" icon={<CheckCircleOutlined />}>
                                  🟢 Mới nhất ({new Date(smaxConvData.cachedAt).toLocaleTimeString('vi-VN')})
                                </Tag>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Messages list */}
                      {smaxLoading && !smaxConvData ? (
                        <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
                          <Spin tip="Đang tải dữ liệu hội thoại Smax.ai..." />
                        </div>
                      ) : smaxConvData && smaxConvData.messages?.length > 0 ? (
                        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3 max-h-[500px] overflow-y-auto">
                          {smaxConvData.messages.map((m: any) => {
                            const isCustomer = m.senderType === 'CUSTOMER';
                            return (
                              <div
                                key={m.id}
                                className={`flex items-start gap-2 max-w-xl ${isCustomer ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
                              >
                                <div
                                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs text-white shrink-0 ${
                                    isCustomer ? 'bg-blue-500' : 'bg-indigo-600'
                                  }`}
                                >
                                  {isCustomer ? <UserOutlined /> : <CustomerServiceOutlined />}
                                </div>
                                <div
                                  className={`p-3 rounded-2xl text-xs space-y-1 shadow-sm ${
                                    isCustomer
                                      ? 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                                      : 'bg-indigo-600 text-white rounded-tr-none'
                                  }`}
                                >
                                  <div className={`font-semibold text-[11px] ${isCustomer ? 'text-blue-600' : 'text-indigo-200'}`}>
                                    {m.senderName}
                                  </div>
                                  <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                                  <div className={`text-[10px] ${isCustomer ? 'text-slate-400' : 'text-indigo-200'} text-right mt-1`}>
                                    {new Date(m.sentAt).toLocaleString('vi-VN')}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : smaxConvData ? (
                        <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400 text-xs">
                          Hội thoại chưa có tin nhắn nào
                        </div>
                      ) : (
                        <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2">
                          <p className="text-slate-500 text-sm font-medium">Chưa tải lịch sử hội thoại Smax.ai</p>
                          <p className="text-slate-400 text-xs">
                            Dán link hội thoại Smax.ai của Lead này và bấm <strong>"Lấy hội thoại"</strong> để xem tin nhắn.
                          </p>
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'timeline',
                  label: 'Activity Timeline',
                  children: <ActivityTimeline activities={lead.activities || []} />,
                },
              ]}
            />
          </Card>
        </div>
      </div>

      {/* Resolve Identity Modal */}
      <Modal
        title="Xác minh & Giải quyết Nghi ngờ Trùng lặp"
        open={resolveModalVisible}
        onCancel={() => setResolveModalVisible(false)}
        onOk={() => resolveForm.submit()}
      >
        <Form form={resolveForm} layout="vertical" onFinish={handleResolveIdentity} initialValues={{ action: 'ATTACH_TO_EXISTING' }}>
          <Form.Item name="action" label="Hành động xử lý">
            <Radio.Group>
              <Radio value="ATTACH_TO_EXISTING" className="block mb-2">
                <strong>Gắn vào Customer sẵn có:</strong> Xác nhận cùng một người, gộp Identity & Lead vào Hồ sơ Customer.
              </Radio>
              <Radio value="CREATE_SEPARATE_CUSTOMER" className="block">
                <strong>Tạo Customer mới riêng biệt:</strong> Xác nhận 2 người khác nhau dùng chung số điện thoại.
              </Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.action !== currentValues.action}
          >
            {({ getFieldValue }) =>
              getFieldValue('action') === 'ATTACH_TO_EXISTING' ? (
                <Form.Item
                  name="targetCustomerId"
                  label="Chọn Customer trùng lặp muốn gộp"
                  rules={[{ required: true, message: 'Vui lòng chọn Customer' }]}
                >
                  <Select placeholder="Chọn Customer bị trùng" optionLabelProp="label" className="w-full">
                    {targetCustomers.map((c: any) => {
                      const isCompany = c.entityType === 'COMPANY' || c.company;
                      const companyName = c.company?.name || 'Công ty';
                      const contacts = c.company?.contacts || [];

                      // Find primary & secondary contacts
                      const primary = contacts.find((ct: any) => ct.isPrimary) || c.contact || contacts[0];
                      const secondaryList = contacts.filter((ct: any) => ct.id !== primary?.id);

                      const primaryName = primary
                        ? `${primary.lastName || ''} ${primary.firstName || ''}`.trim() + (primary.position ? ` (${primary.position})` : '')
                        : 'Chưa có';

                      const secondaryNames = secondaryList.length > 0
                        ? secondaryList
                            .map((ct: any) => `${ct.lastName || ''} ${ct.firstName || ''}`.trim() + (ct.position ? ` (${ct.position})` : ''))
                            .join(', ')
                        : '';

                      const optionLabelText = isCompany
                        ? `🏢 [${c.customerCode}] ${companyName} | ĐD chính: ${primaryName}${secondaryNames ? ` | ĐD phụ: ${secondaryNames}` : ''}`
                        : `👤 [${c.customerCode}] ${c.contact ? `${c.contact.lastName || ''} ${c.contact.firstName || ''}`.trim() : 'Cá nhân'}`;

                      return (
                        <Select.Option key={c.id} value={c.id} label={optionLabelText}>
                          <div className="py-1">
                            {isCompany ? (
                              <>
                                <div className="font-bold text-slate-800">🏢 [{c.customerCode}] {companyName}</div>
                                <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                                  <div>
                                    <span className="font-semibold text-indigo-600">👤 Đại diện chính:</span> {primaryName}
                                  </div>
                                  {secondaryNames ? (
                                    <div>
                                      <span className="font-semibold text-amber-700">👥 Đại diện phụ:</span> {secondaryNames}
                                    </div>
                                  ) : (
                                    <div className="text-slate-400 italic">👥 Đại diện phụ: (Chưa có)</div>
                                  )}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="font-bold text-slate-800">
                                  👤 [{c.customerCode}] Cá nhân: {c.contact ? `${c.contact.lastName || ''} ${c.contact.firstName || ''}`.trim() : ''}
                                </div>
                                <div className="text-xs text-slate-500">
                                  📞 {[c.contact?.phone || c.phone, c.contact?.email || c.email].filter(Boolean).join(' - ')}
                                </div>
                              </>
                            )}
                          </div>
                        </Select.Option>
                      );
                    })}
                  </Select>
                </Form.Item>
              ) : null
            }
          </Form.Item>
        </Form>
      </Modal>

      {/* Convert Lead Modal */}
      <LeadConvertModal
        visible={convertModalVisible}
        lead={lead}
        onCancel={() => setConvertModalVisible(false)}
        onSuccess={() => {
          setConvertModalVisible(false);
          fetchLeadDetails();
        }}
      />

      {/* Log Activity Modal */}
      <Modal
        title="Log Activity"
        open={activityModalVisible}
        onCancel={() => setActivityModalVisible(false)}
        onOk={() => activityForm.submit()}
      >
        <Form form={activityForm} layout="vertical" onFinish={handleLogActivity}>
          <Form.Item name="type" label="Activity Type" initialValue="CALL">
            <Select>
              <Select.Option value="CALL">Call</Select.Option>
              <Select.Option value="EMAIL">Email</Select.Option>
              <Select.Option value="MEETING">Meeting</Select.Option>
              <Select.Option value="DEMO">Demo</Select.Option>
              <Select.Option value="NOTE">Note</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
            <Input placeholder="Call summary" />
          </Form.Item>

          <Form.Item name="description" label="Notes">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Task Modal */}
      <Modal
        title="Create Follow-up Task"
        open={taskModalVisible}
        onCancel={() => setTaskModalVisible(false)}
        onOk={() => taskForm.submit()}
      >
        <Form form={taskForm} layout="vertical" onFinish={handleCreateTask} initialValues={{ priority: 'HIGH', assignedTo: lead.ownerId }}>
          <Form.Item name="title" label="Task Title" rules={[{ required: true }]}>
            <Input placeholder="Call back client" />
          </Form.Item>

          <Form.Item name="assignedTo" label="Sale phụ trách / Người thực hiện">
            <Select placeholder="Chọn nhân viên" allowClear>
              {users.map((u) => (
                <Select.Option key={u.id} value={u.id}>
                  👤 {u.lastName} {u.firstName} ({u.email})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="priority" label="Priority">
            <Select>
              <Select.Option value="LOW">LOW</Select.Option>
              <Select.Option value="MEDIUM">MEDIUM</Select.Option>
              <Select.Option value="HIGH">HIGH</Select.Option>
              <Select.Option value="URGENT">URGENT</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="dueAt" label="Due Date & Time" rules={[{ required: true }]}>
            <DatePicker showTime className="w-full" />
          </Form.Item>

          <Form.Item name="description" label="Task Instructions">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Lead Modal */}
      <Modal
        title="Chỉnh sửa thông tin khách hàng tiềm năng"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={() => editForm.submit()}
        width={500}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdateLead}>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="firstName" label="Tên khách hàng" rules={[{ required: true, message: 'Vui lòng nhập tên khách hàng' }]}>
              <Input placeholder="Ví dụ: Phúc Kính" />
            </Form.Item>
            <Form.Item name="lastName" label="Họ & Tên đệm (Tùy chọn)">
              <Input placeholder="Tùy chọn" />
            </Form.Item>
          </div>

          <Form.Item name="email" label="Email">
            <Input />
          </Form.Item>

          <Form.Item name="phone" label="Số điện thoại">
            <Input />
          </Form.Item>

          <Form.Item name="ownerId" label="Sale phụ trách (Bổ nhiệm)">
            <Select placeholder="Chọn nhân viên Sale phụ trách" allowClear>
              {users.map((u) => (
                <Select.Option key={u.id} value={u.id}>
                  👤 {u.lastName} {u.firstName} ({u.email})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="companyName" label="Công ty">
            <Input />
          </Form.Item>

          <Form.Item name="jobTitle" label="Chức danh">
            <Input />
          </Form.Item>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="source" label="Nguồn">
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

            <Form.Item name="rating" label="Đánh giá">
              <Select>
                <Select.Option value="HOT">Nóng (Hot)</Select.Option>
                <Select.Option value="WARM">Ấm (Warm)</Select.Option>
                <Select.Option value="COLD">Lạnh (Cold)</Select.Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item
            name="adIds"
            label="📢 Mã bài viết / Quảng cáo Facebook (Ad IDs)"
            extra="Có thể có nhiều Ad ID (Phân cách bằng dấu phẩy hoặc phím Enter)"
          >
            <Select
              mode="tags"
              placeholder="Ví dụ: 120249966819330693, 120249966819330694"
              tokenSeparators={[',', ' ']}
              open={false}
              allowClear
            />
          </Form.Item>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="fbPageName" label="🚩 Tên Fanpage Facebook">
              <Input placeholder="Ví dụ: Xe Điện Move Official" />
            </Form.Item>
            <Form.Item name="fbPageId" label="🆔 Facebook Page ID">
              <Input placeholder="760420303821103" />
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

          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

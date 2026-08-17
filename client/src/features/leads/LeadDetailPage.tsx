import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Tag, Button, Select, Tabs, Modal, Form, Input, DatePicker, notification, Spin, Alert, Radio } from 'antd';
import { ArrowLeftOutlined, SwapOutlined, PlusOutlined, PhoneOutlined, EditOutlined, WarningOutlined, MessageOutlined, SendOutlined } from '@ant-design/icons';
import { crmService } from '../../services/crmService';
import { Lead, User, Conversation, Customer } from '../../types';
import { ActivityTimeline } from '../../components/Timeline/ActivityTimeline';
import { LeadConvertModal } from './LeadConvertModal';

export const LeadDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [lead, setLead] = useState<Lead | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const [convertModalVisible, setConvertModalVisible] = useState(false);
  const [activityModalVisible, setActivityModalVisible] = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [resolveModalVisible, setResolveModalVisible] = useState(false);

  // New message state
  const [newMessage, setNewMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  const [activityForm] = Form.useForm();
  const [taskForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [resolveForm] = Form.useForm();

  const fetchLeadDetails = async () => {
    if (!id) return;
    try {
      const res: any = await crmService.getLeadById(id);
      if (res.success) {
        setLead(res.data);
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
  }, [id]);

  const handleOpenEditModal = () => {
    if (!lead) return;
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

  const handleSendMessage = async (convId: string) => {
    if (!newMessage.trim()) return;
    setSendingMsg(true);
    try {
      await crmService.addMessage(convId, { content: newMessage, senderType: 'AGENT' });
      setNewMessage('');
      fetchLeadDetails();
    } catch (err: any) {
      notification.error({ message: 'Error sending message', description: err.message });
    } finally {
      setSendingMsg(false);
    }
  };

  const handleCreateConversation = async () => {
    if (!id) return;
    try {
      await crmService.createConversation({
        leadId: id,
        channelType: lead?.source === 'FACEBOOK' ? 'FACEBOOK' : lead?.source === 'ZALO' ? 'ZALO' : 'WEBCHAT',
        initialMessage: 'Bắt đầu cuộc trò chuyện tư vấn mới...',
        senderType: 'SYSTEM',
      });
      fetchLeadDetails();
    } catch (err: any) {
      notification.error({ message: 'Thất bại', description: err.message });
    }
  };

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
      fetchLeadDetails();
    } catch (err: any) {
      notification.error({ message: 'Task Creation Failed', description: err.message });
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
                <Tag>{lead.source}</Tag>
              </div>
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
              items={[
                {
                  key: 'conversations',
                  label: `💬 Hội thoại Đa kênh (${lead.conversations?.length || 0})`,
                  children: (
                    <div className="space-y-4 py-2">
                      {activeConv ? (
                        <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <span className="font-bold text-slate-800 text-sm">
                              Kênh: <Tag color="purple">{activeConv.channelType}</Tag>
                            </span>
                            <span className="text-xs text-slate-400">Thread ID: {activeConv.id}</span>
                          </div>

                          <div className="max-h-64 overflow-y-auto space-y-2 p-2">
                            {activeConv.messages && activeConv.messages.length > 0 ? (
                              activeConv.messages.map((m) => (
                                <div
                                  key={m.id}
                                  className={`p-2.5 rounded-lg text-xs max-w-md ${
                                    m.senderType === 'AGENT'
                                      ? 'bg-indigo-600 text-white ml-auto text-right'
                                      : 'bg-white text-slate-800 border border-slate-200'
                                  }`}
                                >
                                  <div>{m.content}</div>
                                  <div className="text-[10px] opacity-70 mt-1">
                                    {new Date(m.sentAt).toLocaleTimeString('vi-VN')} ({m.senderType})
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-slate-400 text-xs text-center py-4">Chưa có tin nhắn</div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                            <Input
                              placeholder="Nhập tin nhắn trả lời..."
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              onPressEnter={() => handleSendMessage(activeConv.id)}
                            />
                            <Button
                              type="primary"
                              icon={<SendOutlined />}
                              loading={sendingMsg}
                              onClick={() => handleSendMessage(activeConv.id)}
                              className="bg-indigo-600"
                            >
                              Gửi
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                          <p className="text-slate-500 text-sm mb-3">Chưa có luồng hội thoại đa kênh cho Lead này</p>
                          <Button icon={<MessageOutlined />} type="primary" onClick={handleCreateConversation} className="bg-indigo-600">
                            Tạo cuộc hội thoại mới
                          </Button>
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
                {
                  key: 'tasks',
                  label: `Tasks (${lead.tasks?.length || 0})`,
                  children: (
                    <div className="space-y-3 py-2">
                      {lead.tasks && lead.tasks.length > 0 ? (
                        lead.tasks.map((t) => (
                          <div key={t.id} className="p-3 border border-slate-100 rounded-lg flex items-center justify-between">
                            <div>
                              <div className="font-bold text-slate-800 text-sm">{t.title}</div>
                              <div className="text-xs text-slate-400">
                                Due: {new Date(t.dueAt).toLocaleString('vi-VN')} | Priority: {t.priority}
                              </div>
                            </div>
                            <Tag color={t.status === 'COMPLETED' ? 'green' : 'orange'}>{t.status}</Tag>
                          </div>
                        ))
                      ) : (
                        <div className="text-slate-400 text-xs text-center py-6">No tasks scheduled</div>
                      )}
                    </div>
                  ),
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
        <Form form={taskForm} layout="vertical" onFinish={handleCreateTask}>
          <Form.Item name="title" label="Task Title" rules={[{ required: true }]}>
            <Input placeholder="Call back client" />
          </Form.Item>

          <Form.Item name="priority" label="Priority" initialValue="HIGH">
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
            <Form.Item name="firstName" label="Tên" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="lastName" label="Họ" rules={[{ required: true }]}>
              <Input />
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

          <Form.Item name="notes" label="Ghi chú">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

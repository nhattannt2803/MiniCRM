import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Tag, Button, Tabs, Table, Spin, Modal, Form, Input, Select, Popconfirm, notification, Divider, Badge } from 'antd';
import { ArrowLeftOutlined, EditOutlined, DeleteOutlined, UserOutlined, BankOutlined, PhoneOutlined, MailOutlined, HomeOutlined, IdcardOutlined, PlusOutlined, CheckCircleOutlined, MessageOutlined } from '@ant-design/icons';
import { crmService } from '../../services/crmService';
import { Customer, User, CustomerIdentity, Lead } from '../../types';
import { ActivityTimeline } from '../../components/Timeline/ActivityTimeline';
import { parseFbPsidInput, parseZaloUidInput } from '../../utils/identityHelper';

export const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [identityModalVisible, setIdentityModalVisible] = useState(false);
  const [addContactModalVisible, setAddContactModalVisible] = useState(false);

  const [form] = Form.useForm();
  const [identityForm] = Form.useForm();
  const [addContactForm] = Form.useForm();

  const handleAddCompanyContact = async (values: any) => {
    if (!customer?.companyId) return;
    try {
      const res: any = await crmService.addCompanyContact(customer.companyId.toString(), values);
      if (res.success) {
        notification.success({ message: 'Thêm người liên hệ doanh nghiệp thành công' });
        setAddContactModalVisible(false);
        addContactForm.resetFields();
        fetchCustomerDetails();
      }
    } catch (err: any) {
      notification.error({ message: 'Thêm người liên hệ thất bại', description: err.message });
    }
  };

  const handleSetPrimaryContact = async (contactId: string) => {
    if (!customer?.companyId) return;
    try {
      const res: any = await crmService.setPrimaryCompanyContact(customer.companyId.toString(), contactId);
      if (res.success) {
        notification.success({ message: 'Đã đổi người đại diện chính thành công' });
        fetchCustomerDetails();
      }
    } catch (err: any) {
      notification.error({ message: 'Đổi người đại diện thất bại', description: err.message });
    }
  };

  const fetchCustomerDetails = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res: any = await crmService.getCustomerById(id);
      if (res.success) setCustomer(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res: any = await crmService.getUsers();
      if (res.success) setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCustomerDetails();
    fetchUsers();
  }, [id]);

  const handleOpenEditModal = () => {
    if (!customer) return;
    const initialValues: any = {
      customerCode: customer.customerCode,
      status: customer.status || 'ACTIVE',
      ownerId: customer.ownerId ? customer.ownerId.toString() : undefined,
    };

    if (customer.entityType === 'COMPANY' && customer.company) {
      initialValues.companyName = customer.company.name;
      initialValues.taxCode = customer.company.taxCode;
      initialValues.phone = customer.company.phone;
      initialValues.email = customer.company.email;
      initialValues.address = customer.company.address;
    }

    if (customer.contact) {
      initialValues.firstName = customer.contact.firstName;
      initialValues.lastName = customer.contact.lastName;
      initialValues.contactEmail = customer.contact.email;
      initialValues.contactPhone = customer.contact.phone;
      initialValues.position = customer.contact.position;
      if (customer.entityType === 'CONTACT') {
        initialValues.phone = customer.contact.phone;
        initialValues.email = customer.contact.email;
      }
    }

    form.setFieldsValue(initialValues);
    setEditModalVisible(true);
  };

  const handleUpdateCustomer = async (values: any) => {
    if (!id) return;
    try {
      const res: any = await crmService.updateCustomer(id, values);
      if (res.success) {
        notification.success({ message: 'Cập nhật thông tin khách hàng thành công' });
        setEditModalVisible(false);
        fetchCustomerDetails();
      }
    } catch (err: any) {
      notification.error({ message: 'Cập nhật thất bại', description: err.response?.data?.message || err.message });
    }
  };

  const handleAddIdentity = async (values: any) => {
    if (!id) return;
    try {
      let val = values.identityValue;
      if (values.type === 'FB_PSID' && val) {
        val = parseFbPsidInput(val);
      } else if (values.type === 'ZALO_UID' && val) {
        val = parseZaloUidInput(val);
      }
      await crmService.addCustomerIdentity(id, values.type, val);
      notification.success({ message: 'Thêm điểm nhận diện thành công!' });
      setIdentityModalVisible(false);
      identityForm.resetFields();
      fetchCustomerDetails();
    } catch (err: any) {
      notification.error({ message: 'Thêm thất bại', description: err.message });
    }
  };

  const handleDeleteCustomer = async () => {
    if (!id) return;
    try {
      const res: any = await crmService.deleteCustomer(id);
      if (res.success) {
        notification.success({ message: 'Đã xóa khách hàng thành công' });
        navigate('/customers');
      }
    } catch (err: any) {
      notification.error({ message: 'Xóa thất bại', description: err.response?.data?.message || err.message });
    }
  };

  if (loading || !customer) {
    return <div className="h-96 flex items-center justify-center"><Spin size="large" /></div>;
  }

  const identityColumns = [
    {
      title: 'Loại điểm nhận diện (Type)',
      dataIndex: 'type',
      key: 'type',
      render: (t: string) => {
        switch (t) {
          case 'PHONE': return <Tag color="blue">📞 SĐT (Phone)</Tag>;
          case 'EMAIL': return <Tag color="cyan">✉ Email</Tag>;
          case 'ZALO_UID': return <Tag color="blue">💬 Zalo UID</Tag>;
          case 'FB_PSID': return <Tag color="purple">Facebook PSID</Tag>;
          case 'WEB_VISITOR': return <Tag color="orange">🌐 Web Visitor</Tag>;
          default: return <Tag>{t}</Tag>;
        }
      },
    },
    {
      title: 'Giá trị định danh (Value)',
      dataIndex: 'identityValue',
      key: 'identityValue',
      render: (val: string) => <span className="font-semibold text-slate-900">{val}</span>,
    },
    {
      title: 'Trạng thái xác minh',
      dataIndex: 'isVerified',
      key: 'isVerified',
      render: (verified: boolean) =>
        verified ? (
          <Badge status="success" text="Đã xác minh" />
        ) : (
          <Badge status="warning" text="Chờ xác minh" />
        ),
    },
    {
      title: 'Ngày liên kết',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d: string) => new Date(d).toLocaleDateString('vi-VN'),
    },
  ];

  const leadColumns = [
    {
      title: 'Tên Lead',
      key: 'name',
      render: (_: any, r: Lead) => (
        <span
          className="font-bold text-indigo-600 cursor-pointer hover:underline"
          onClick={() => navigate(`/leads/${r.id}`)}
        >
          {r.lastName} {r.firstName}
        </span>
      ),
    },
    { title: 'Nguồn', dataIndex: 'source', key: 'source', render: (s: string) => <Tag>{s}</Tag> },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color="blue">{s}</Tag> },
    {
      title: 'Xác minh Identity',
      dataIndex: 'identityResolutionStatus',
      key: 'identityResolutionStatus',
      render: (s: string) => <Tag color={s === 'POTENTIAL_DUPLICATE' ? 'orange' : 'green'}>{s || 'MATCHED'}</Tag>,
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d: string) => new Date(d).toLocaleDateString('vi-VN'),
    },
  ];

  const oppColumns = [
    { title: 'Tên Cơ hội', dataIndex: 'name', key: 'name' },
    {
      title: 'Giá trị Chốt (VND)',
      dataIndex: 'amount',
      key: 'amount',
      render: (v: number) => `${Number(v || 0).toLocaleString('vi-VN')} ₫`,
    },
    {
      title: 'Ngày thành công',
      dataIndex: 'wonAt',
      key: 'wonAt',
      render: (d: string) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—'),
    },
  ];

  const isCompany = customer.entityType === 'COMPANY';
  const customerName = isCompany
    ? customer.company?.name
    : `${customer.contact?.lastName || ''} ${customer.contact?.firstName || ''}`.trim();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/customers')} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{customerName || 'Chi tiết khách hàng'}</h1>
              <Tag color={isCompany ? 'purple' : 'blue'}>
                {isCompany ? 'DOANH NGHIỆP' : 'CÁ NHÂN'}
              </Tag>
              <Tag color="geekblue">{customer.customerCode}</Tag>
              <Tag color={customer.status === 'ACTIVE' ? 'green' : 'default'}>
                {customer.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm dừng'}
              </Tag>
            </div>
            <p className="text-sm text-slate-500">Hồ sơ khách hàng chính thức (Customer Profile)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button icon={<PlusOutlined />} type="primary" onClick={() => setIdentityModalVisible(true)} className="bg-emerald-600">
            Thêm điểm liên lạc (Identity)
          </Button>
          <Button icon={<EditOutlined />} onClick={handleOpenEditModal}>
            Chỉnh sửa thông tin
          </Button>
          <Popconfirm
            title="Xác nhận xóa khách hàng"
            description="Bạn có chắc chắn muốn xóa khách hàng này? Thao tác này không thể hoàn tác."
            onConfirm={handleDeleteCustomer}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />}>
              Xóa khách hàng
            </Button>
          </Popconfirm>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Account Details & Contact Info */}
        <div className="space-y-6">
          <Card title="Tổng quan tài khoản" className="shadow-xs border-slate-200 rounded-xl bg-white">
            <div className="space-y-4 text-sm">
              <div>
                <span className="text-slate-400 font-medium block text-xs">Giá trị vòng đời (LTV)</span>
                <span className="text-emerald-600 font-black text-xl">
                  {Number(customer.lifetimeValue || 0).toLocaleString('vi-VN')} ₫
                </span>
              </div>
              <Divider className="my-2" />
              <div>
                <span className="text-slate-400 font-medium block text-xs">Số lượng Identity liên kết</span>
                <span className="text-slate-800 font-bold">{customer.identities?.length || 0} Điểm liên lạc</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-xs">Sales phụ trách</span>
                <span className="text-slate-800 font-semibold flex items-center gap-1.5 mt-0.5">
                  <UserOutlined className="text-indigo-600" />
                  {customer.owner ? `${customer.owner.lastName} ${customer.owner.firstName}` : <span className="text-slate-400 font-normal">Chưa gán</span>}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-xs">Trở thành khách hàng từ</span>
                <span className="text-slate-800 font-semibold">
                  {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('vi-VN') : '—'}
                </span>
              </div>
            </div>
          </Card>

          {/* Details Card */}
          <Card
            title={isCompany ? "Thông tin Doanh nghiệp" : "Thông tin Cá nhân"}
            className="shadow-xs border-slate-200 rounded-xl bg-white"
          >
            <div className="space-y-3.5 text-sm">
              {isCompany && (
                <>
                  <div className="flex items-start gap-2.5">
                    <BankOutlined className="text-purple-600 mt-1" />
                    <div>
                      <div className="text-xs text-slate-400">Tên công ty</div>
                      <div className="font-semibold text-slate-800">{customer.company?.name || '—'}</div>
                    </div>
                  </div>
                  {customer.company?.taxCode && (
                    <div className="flex items-start gap-2.5">
                      <IdcardOutlined className="text-purple-600 mt-1" />
                      <div>
                        <div className="text-xs text-slate-400">Mã số thuế</div>
                        <div className="font-medium text-slate-700">{customer.company.taxCode}</div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-2.5">
                    <PhoneOutlined className="text-purple-600 mt-1" />
                    <div>
                      <div className="text-xs text-slate-400">Số điện thoại công ty</div>
                      <div className="font-medium text-slate-700">{customer.company?.phone || '—'}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <MailOutlined className="text-purple-600 mt-1" />
                    <div>
                      <div className="text-xs text-slate-400">Email công ty</div>
                      <div className="font-medium text-slate-700">{customer.company?.email || '—'}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <HomeOutlined className="text-purple-600 mt-1" />
                    <div>
                      <div className="text-xs text-slate-400">Địa chỉ trụ sở</div>
                      <div className="font-medium text-slate-700">{customer.company?.address || '—'}</div>
                    </div>
                  </div>
                </>
              )}

              {isCompany && customer.company ? (
                <>
                  <Divider className="my-3" />
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Đại diện doanh nghiệp ({customer.company.contacts?.length || 0})
                    </div>
                    <Button
                      size="small"
                      type="dashed"
                      icon={<PlusOutlined />}
                      onClick={() => setAddContactModalVisible(true)}
                      className="text-xs border-indigo-300 text-indigo-600 hover:text-indigo-700"
                    >
                      Thêm đại diện
                    </Button>
                  </div>

                  <div className="space-y-2.5">
                    {customer.company.contacts && customer.company.contacts.length > 0 ? (
                      [...customer.company.contacts]
                        .sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))
                        .map((ct: any) => (
                          <div
                            key={ct.id}
                            className={`p-2.5 rounded-lg border text-xs space-y-1 transition-all ${ct.isPrimary ? 'bg-amber-50/70 border-amber-300 shadow-2xs' : 'bg-slate-50 border-slate-200'
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                {ct.isPrimary ? (
                                  <Tag color="gold" className="m-0 font-bold text-xs">👑 Đại diện chính</Tag>
                                ) : (
                                  <Tag color="blue" className="m-0 text-xs">👤 Đại diện phụ</Tag>
                                )}
                                <span>{ct.lastName} {ct.firstName}</span>
                              </div>
                              {!ct.isPrimary && (
                                <Button
                                  size="small"
                                  type="link"
                                  className="p-0 text-indigo-600 text-xs h-auto font-semibold hover:underline"
                                  onClick={() => handleSetPrimaryContact(ct.id.toString())}
                                >
                                  Đặt làm chính
                                </Button>
                              )}
                            </div>

                            {ct.position && <div className="text-slate-600 font-medium pl-1">Chức vụ: {ct.position} {ct.department ? `(${ct.department})` : ''}</div>}
                            {ct.phone && <div className="text-slate-800 pl-1">📞 DĐ: <span className="font-bold">{ct.phone}</span></div>}
                            {ct.email && <div className="text-slate-500 pl-1">✉️ Email: {ct.email}</div>}
                          </div>
                        ))
                    ) : (
                      <div className="text-xs text-slate-400 italic">Chưa có danh sách đại diện.</div>
                    )}
                  </div>
                </>
              ) : customer.contact ? (
                <>
                  <Divider className="my-2" />
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Thông tin liên hệ Cá nhân
                  </div>
                  <div className="flex items-start gap-2.5">
                    <UserOutlined className="text-blue-600 mt-1" />
                    <div>
                      <div className="text-xs text-slate-400">Họ và tên</div>
                      <div className="font-semibold text-slate-800">
                        {customer.contact.lastName} {customer.contact.firstName}
                        {customer.contact.position && <span className="text-slate-500 text-xs font-normal"> ({customer.contact.position})</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <PhoneOutlined className="text-blue-600 mt-1" />
                    <div>
                      <div className="text-xs text-slate-400">Số điện thoại</div>
                      <div className="font-medium text-slate-700">{customer.contact.phone || '—'}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <MailOutlined className="text-blue-600 mt-1" />
                    <div>
                      <div className="text-xs text-slate-400">Email liên hệ</div>
                      <div className="font-medium text-slate-700">{customer.contact.email || '—'}</div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </Card>
        </div>

        {/* Right Column: Identities, Leads & Won Deals */}
        <div className="lg:col-span-2">
          <Card className="shadow-xs border-slate-200 rounded-xl bg-white">
            <Tabs
              items={[
                {
                  key: 'identities',
                  label: `🔑 Điểm liên lạc & Identities (${customer.identities?.length || 0})`,
                  children: (
                    <Table
                      columns={identityColumns}
                      dataSource={customer.identities || []}
                      rowKey="id"
                      pagination={false}
                    />
                  ),
                },
                {
                  key: 'leads',
                  label: `💬 Cơ hội & Lead đang nuôi dưỡng (${customer.leads?.length || 0})`,
                  children: (
                    <Table
                      columns={leadColumns}
                      dataSource={customer.leads || []}
                      rowKey="id"
                      pagination={false}
                    />
                  ),
                },
                {
                  key: 'wonDeals',
                  label: `🏆 Hợp đồng đã chốt (${customer.wonOpportunities?.length || 0})`,
                  children: (
                    <Table
                      columns={oppColumns}
                      dataSource={customer.wonOpportunities || []}
                      rowKey="id"
                      pagination={false}
                    />
                  ),
                },
                {
                  key: 'timeline',
                  label: 'Nhật ký hoạt động',
                  children: <ActivityTimeline activities={customer.activities || []} />,
                },
              ]}
            />
          </Card>
        </div>
      </div>

      {/* Add Identity Modal */}
      <Modal
        title="Bổ sung Điểm liên lạc (Add Customer Identity)"
        open={identityModalVisible}
        onCancel={() => setIdentityModalVisible(false)}
        onOk={() => identityForm.submit()}
      >
        <Form form={identityForm} layout="vertical" onFinish={handleAddIdentity} initialValues={{ type: 'PHONE' }}>
          <Form.Item name="type" label="Loại điểm liên lạc (Channel / Type)" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="PHONE">📞 Số điện thoại (Phone)</Select.Option>
              <Select.Option value="EMAIL">✉ Email</Select.Option>
              <Select.Option value="ZALO_UID">💬 Zalo UID</Select.Option>
              <Select.Option value="FB_PSID">Facebook PSID</Select.Option>
              <Select.Option value="WEB_VISITOR">🌐 Web Visitor ID</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="identityValue"
            label="Giá trị định danh (SĐT / Email / UID / Link Chat)"
            rules={[{ required: true, message: 'Nhập giá trị định danh' }]}
            extra={<span className="text-xs text-slate-400">💡 Hỗ trợ dán trực tiếp link chat Smax.ai hoặc Pancake.vn để tự trích xuất mã FB PSID!</span>}
          >
            <Input
              placeholder="Ví dụ: 0912345678, user@gmail.com, hoặc dán link Smax / Pancake"
              onBlur={() => {
                const type = identityForm.getFieldValue('type');
                const rawVal = identityForm.getFieldValue('identityValue');
                if (type === 'FB_PSID' && rawVal) {
                  const parsed = parseFbPsidInput(rawVal);
                  if (parsed && parsed !== rawVal) {
                    identityForm.setFieldsValue({ identityValue: parsed });
                  }
                } else if (type === 'ZALO_UID' && rawVal) {
                  const parsed = parseZaloUidInput(rawVal);
                  if (parsed && parsed !== rawVal) {
                    identityForm.setFieldsValue({ identityValue: parsed });
                  }
                }
              }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal
        title="Chỉnh sửa thông tin Khách hàng"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
        okText="Lưu thay đổi"
        cancelText="Hủy"
        okButtonProps={{ className: 'bg-indigo-600' }}
      >
        <Form form={form} layout="vertical" onFinish={handleUpdateCustomer}>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="customerCode" label="Mã khách hàng" rules={[{ required: true, message: 'Vui lòng nhập mã khách hàng' }]}>
              <Input />
            </Form.Item>

            <Form.Item name="status" label="Trạng thái">
              <Select>
                <Select.Option value="ACTIVE">Đang hoạt động (Active)</Select.Option>
                <Select.Option value="INACTIVE">Tạm dừng (Inactive)</Select.Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item name="ownerId" label="Sales phụ trách">
            <Select placeholder="Chọn sales phụ trách" allowClear>
              {users.map((u) => (
                <Select.Option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} {u.roles?.length ? `(${u.roles.join(', ')})` : ''}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {isCompany && (
            <div className="border-t border-slate-200 pt-3 mt-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Thông tin Doanh nghiệp</h4>
              <Form.Item name="companyName" label="Tên doanh nghiệp" rules={[{ required: true, message: 'Vui lòng nhập tên doanh nghiệp' }]}>
                <Input />
              </Form.Item>
              <div className="grid grid-cols-2 gap-4">
                <Form.Item name="taxCode" label="Mã số thuế">
                  <Input />
                </Form.Item>
                <Form.Item name="phone" label="Số điện thoại công ty">
                  <Input />
                </Form.Item>
              </div>
              <Form.Item name="email" label="Email công ty">
                <Input />
              </Form.Item>
              <Form.Item name="address" label="Địa chỉ công ty">
                <Input />
              </Form.Item>
            </div>
          )}

          {customer.contact && (
            <div className="border-t border-slate-200 pt-3 mt-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                {isCompany ? 'Người liên hệ đại diện' : 'Thông tin Cá nhân'}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <Form.Item name="firstName" label="Họ" rules={[{ required: !isCompany, message: 'Vui lòng nhập họ' }]}>
                  <Input />
                </Form.Item>
                <Form.Item name="lastName" label="Tên">
                  <Input />
                </Form.Item>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Form.Item name="contactPhone" label="Số điện thoại">
                  <Input />
                </Form.Item>
                <Form.Item name="contactEmail" label="Email">
                  <Input />
                </Form.Item>
              </div>
              <Form.Item name="position" label="Chức vụ">
                <Input />
              </Form.Item>
            </div>
          )}
        </Form>
      </Modal>

      {/* Add Company Contact Modal */}
      <Modal
        title="Thêm Người liên hệ / Đại diện Doanh nghiệp"
        open={addContactModalVisible}
        onCancel={() => setAddContactModalVisible(false)}
        onOk={() => addContactForm.submit()}
        width={480}
      >
        <Form form={addContactForm} layout="vertical" onFinish={handleAddCompanyContact}>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="lastName" label="Họ & Tên đệm" rules={[{ required: true, message: 'Vui lòng nhập họ' }]}>
              <Input placeholder="Nguyễn Văn" />
            </Form.Item>
            <Form.Item name="firstName" label="Tên" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
              <Input placeholder="Nam" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="phone" label="Số điện thoại">
              <Input placeholder="0912345678" />
            </Form.Item>
            <Form.Item name="email" label="Email">
              <Input placeholder="nam.nguyen@company.vn" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="position" label="Chức vụ">
              <Input placeholder="Trưởng phòng Kỹ thuật / Kế toán" />
            </Form.Item>
            <Form.Item name="department" label="Phòng ban">
              <Input placeholder="Phòng Kế hoạch" />
            </Form.Item>
          </div>

          <Form.Item name="isPrimary" label="Loại đại diện" initialValue={false}>
            <Select>
              <Select.Option value={false}>👤 Đại diện phụ (Liên hệ dự phòng)</Select.Option>
              <Select.Option value={true}>👑 Đại diện chính (Người quyết định)</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

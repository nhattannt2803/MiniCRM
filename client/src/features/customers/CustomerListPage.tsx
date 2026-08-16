import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Tag, Drawer, Modal, Form, Select, Radio, Popconfirm, notification } from 'antd';
import { SearchOutlined, EyeOutlined, EditOutlined, DeleteOutlined, PlusOutlined, BankOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { crmService } from '../../services/crmService';
import { Customer, User } from '../../types';

export const CustomerListPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterEntityType, setFilterEntityType] = useState<string | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);

  // Modals & Drawers
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editDrawerVisible, setEditDrawerVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [entityType, setEntityType] = useState<'COMPANY' | 'CONTACT'>('COMPANY');

  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res: any = await crmService.getCustomers({
        page,
        limit: 10,
        search,
        entityType: filterEntityType,
        status: filterStatus,
      });
      if (res.success) {
        setCustomers(res.data);
        setTotal(res.meta.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res: any = await crmService.getUsers();
      if (res.success) {
        setUsers(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, search, filterEntityType, filterStatus]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateCustomer = async (values: any) => {
    try {
      const res: any = await crmService.createCustomer({ ...values, entityType });
      if (res.success) {
        notification.success({
          message: t('common.success'),
          description: 'Thêm mới khách hàng thành công!',
        });
        setCreateModalVisible(false);
        createForm.resetFields();
        fetchCustomers();
      }
    } catch (err: any) {
      notification.error({
        message: t('common.error'),
        description: err.response?.data?.message || err.message,
      });
    }
  };

  const handleOpenEditDrawer = (customer: any) => {
    setEditingCustomer(customer);
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

    editForm.setFieldsValue(initialValues);
    setEditDrawerVisible(true);
  };

  const handleUpdateCustomer = async (values: any) => {
    if (!editingCustomer) return;
    try {
      const res: any = await crmService.updateCustomer(editingCustomer.id, values);
      if (res.success) {
        notification.success({ message: t('common.success'), description: t('common.update') });
        setEditDrawerVisible(false);
        setEditingCustomer(null);
        editForm.resetFields();
        fetchCustomers();
      }
    } catch (err: any) {
      notification.error({ message: t('common.error'), description: err.response?.data?.message || err.message });
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    try {
      const res: any = await crmService.deleteCustomer(id);
      if (res.success) {
        notification.success({
          message: t('common.success'),
          description: 'Xóa khách hàng thành công!',
        });
        fetchCustomers();
      }
    } catch (err: any) {
      notification.error({ message: t('common.error'), description: err.response?.data?.message || err.message });
    }
  };

  const columns = [
    {
      title: 'Mã khách hàng',
      dataIndex: 'customerCode',
      key: 'customerCode',
      render: (code: string, r: Customer) => (
        <span
          className="font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
          onClick={() => navigate(`/customers/${r.id}`)}
        >
          {code}
        </span>
      ),
    },
    {
      title: 'Tên Khách hàng',
      key: 'account',
      render: (_: any, r: Customer) => {
        const isCompany = r.entityType === 'COMPANY';
        const name = isCompany ? r.company?.name : `${r.contact?.lastName || ''} ${r.contact?.firstName || ''}`.trim();
        return (
          <div className="flex items-center gap-2">
            {isCompany ? (
              <BankOutlined className="text-purple-600 bg-purple-50 p-1.5 rounded-lg" />
            ) : (
              <UserOutlined className="text-blue-600 bg-blue-50 p-1.5 rounded-lg" />
            )}
            <span className="font-bold text-slate-900">{name || 'N/A'}</span>
          </div>
        );
      },
    },
    {
      title: 'Loại hình',
      dataIndex: 'entityType',
      key: 'entityType',
      render: (t: string) => (
        <Tag color={t === 'COMPANY' ? 'purple' : 'blue'}>
          {t === 'COMPANY' ? 'DOANH NGHIỆP' : 'CÁ NHÂN'}
        </Tag>
      ),
    },
    {
      title: 'Liên hệ & Điểm nhận diện',
      key: 'contactInfo',
      render: (_: any, r: Customer) => {
        const companyPhone = r.company?.phone;
        const contactPhone = r.contact?.phone;
        const email = r.company?.email || r.contact?.email;
        const identities = r.identities || [];
        const extraPhones = identities.filter(i => i.type === 'PHONE' && i.identityValue !== companyPhone && i.identityValue !== contactPhone);

        return (
          <div className="text-xs text-slate-600 space-y-1">
            {companyPhone && <div>🏢 Cty: <span className="font-semibold">{companyPhone}</span></div>}
            {contactPhone && (
              <div>📞 DĐ: <span className="font-semibold text-slate-900">{contactPhone}</span> {r.contact?.lastName && <span className="text-slate-400">({r.contact.lastName} {r.contact.firstName})</span>}</div>
            )}
            {extraPhones.map((ip) => (
              <div key={ip.id} className="text-slate-500">📱 {ip.identityValue}</div>
            ))}
            {email && <div className="text-slate-400">✉️ {email}</div>}
            {!companyPhone && !contactPhone && !email && <span className="text-slate-400">-</span>}
          </div>
        );
      },
    },
    {
      title: 'Sales phụ trách',
      key: 'owner',
      render: (_: any, r: any) => (
        <span className="text-sm text-slate-700 font-medium">
          {r.owner ? `${r.owner.lastName} ${r.owner.firstName}` : <span className="text-slate-400">Chưa gán</span>}
        </span>
      ),
    },
    {
      title: 'Giá trị vòng đời (LTV)',
      dataIndex: 'lifetimeValue',
      key: 'lifetimeValue',
      render: (val: number) => (
        <span className="font-bold text-emerald-600">
          {Number(val || 0).toLocaleString('vi-VN')} ₫
        </span>
      ),
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'green' : 'default'}>
          {status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm dừng'}
        </Tag>
      ),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_: any, r: Customer) => (
        <div className="flex items-center gap-1">
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/customers/${r.id}`)} />
          <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenEditDrawer(r)} />
          <Popconfirm
            title="Xác nhận xóa"
            description="Bạn có chắc chắn muốn xóa khách hàng này?"
            onConfirm={() => handleDeleteCustomer(r.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('customers.title')}</h1>
          <p className="text-sm text-slate-500">Danh sách và quản lý thông tin khách hàng chính thức</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          className="bg-indigo-600 hover:bg-indigo-700 shadow-sm"
          onClick={() => {
            createForm.resetFields();
            setEntityType('COMPANY');
            setCreateModalVisible(true);
          }}
        >
          {t('customers.addCustomer')}
        </Button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Input
            prefix={<SearchOutlined className="text-slate-400" />}
            placeholder={t('common.searchPlaceholder')}
            className="w-64"
            allowClear
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            placeholder="Tất cả loại hình"
            allowClear
            className="w-44"
            value={filterEntityType}
            onChange={(val) => setFilterEntityType(val)}
          >
            <Select.Option value="COMPANY">🏢 Doanh nghiệp</Select.Option>
            <Select.Option value="CONTACT">👤 Cá nhân</Select.Option>
          </Select>

          <Select
            placeholder="Tất cả trạng thái"
            allowClear
            className="w-44"
            value={filterStatus}
            onChange={(val) => setFilterStatus(val)}
          >
            <Select.Option value="ACTIVE">Đang hoạt động</Select.Option>
            <Select.Option value="INACTIVE">Tạm dừng</Select.Option>
          </Select>
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Tổng số khách hàng: <span className="text-indigo-600 font-bold">{total}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <Table
          columns={columns}
          dataSource={customers}
          rowKey="id"
          loading={loading}
          pagination={{ current: page, total, pageSize: 10, onChange: setPage }}
        />
      </div>

      {/* Modal Tạo mới Khách hàng */}
      <Modal
        title="Thêm mới Khách hàng"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={() => createForm.submit()}
        okText="Tạo mới"
        cancelText="Hủy"
        width={650}
        okButtonProps={{ className: 'bg-indigo-600' }}
      >
        <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <label className="block text-xs font-semibold text-slate-600 mb-2">Loại hình khách hàng:</label>
          <Radio.Group
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="COMPANY">🏢 Doanh nghiệp (Company)</Radio.Button>
            <Radio.Button value="CONTACT">👤 Cá nhân (Individual Contact)</Radio.Button>
          </Radio.Group>
        </div>

        <Form form={createForm} layout="vertical" onFinish={handleCreateCustomer}>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="customerCode" label="Mã khách hàng (Tự sinh nếu trống)">
              <Input placeholder="VD: CUST-001" />
            </Form.Item>

            <Form.Item name="ownerId" label="Sales phụ trách">
              <Select placeholder="Chọn sales phụ trách" allowClear>
                {users.map((u) => (
                  <Select.Option key={u.id} value={u.id}>
                    {u.lastName} {u.firstName} {u.roles?.length ? `(${u.roles.join(', ')})` : ''}

                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          {entityType === 'COMPANY' ? (
            <>
              <Form.Item name="companyName" label="Tên Doanh nghiệp" rules={[{ required: true, message: 'Vui lòng nhập tên doanh nghiệp' }]}>
                <Input placeholder="Công ty TNHH ..." />
              </Form.Item>

              <div className="grid grid-cols-2 gap-4">
                <Form.Item name="taxCode" label="Mã số thuế">
                  <Input placeholder="0101234567" />
                </Form.Item>
                <Form.Item name="industry" label="Ngành nghề">
                  <Input placeholder="Công nghệ, Sản xuất..." />
                </Form.Item>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Form.Item name="phone" label="Số điện thoại công ty">
                  <Input placeholder="0243..." />
                </Form.Item>
                <Form.Item name="email" label="Email công ty">
                  <Input placeholder="contact@company.com" />
                </Form.Item>
              </div>

              <Form.Item name="address" label="Địa chỉ trụ sở">
                <Input placeholder="Địa chỉ công ty..." />
              </Form.Item>

              <div className="border-t border-slate-200 pt-3 mt-2 mb-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Người đại diện / Người liên hệ chính</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Form.Item name="firstName" label="Họ người liên hệ">
                    <Input placeholder="Nguyễn" />
                  </Form.Item>
                  <Form.Item name="lastName" label="Tên người liên hệ">
                    <Input placeholder="Văn A" />
                  </Form.Item>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Form.Item name="contactPhone" label="SĐT cá nhân">
                    <Input placeholder="0901..." />
                  </Form.Item>
                  <Form.Item name="contactEmail" label="Email cá nhân">
                    <Input placeholder="ana@company.com" />
                  </Form.Item>
                  <Form.Item name="position" label="Chức vụ">
                    <Input placeholder="Giám đốc, Quản lý..." />
                  </Form.Item>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Form.Item name="firstName" label="Họ" rules={[{ required: true, message: 'Vui lòng nhập họ' }]}>
                  <Input placeholder="Nguyễn" />
                </Form.Item>
                <Form.Item name="lastName" label="Tên" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
                  <Input placeholder="Văn A" />
                </Form.Item>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Form.Item name="phone" label="Số điện thoại">
                  <Input placeholder="090..." />
                </Form.Item>
                <Form.Item name="email" label="Email">
                  <Input placeholder="khachhang@gmail.com" />
                </Form.Item>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Form.Item name="position" label="Chức vụ / Nghề nghiệp">
                  <Input placeholder="Chuyên viên..." />
                </Form.Item>
                <Form.Item name="address" label="Địa chỉ">
                  <Input placeholder="Hà Nội, VN..." />
                </Form.Item>
              </div>
            </>
          )}

          <Form.Item name="status" label={t('common.status')} initialValue="ACTIVE">
            <Select>
              <Select.Option value="ACTIVE">Đang hoạt động (Active)</Select.Option>
              <Select.Option value="INACTIVE">Tạm dừng (Inactive)</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Drawer Chỉnh sửa Khách hàng */}
      <Drawer
        title="Chỉnh sửa Thông tin Khách hàng"
        open={editDrawerVisible}
        onClose={() => setEditDrawerVisible(false)}
        width={500}
        extra={
          <Button type="primary" onClick={() => editForm.submit()} className="bg-indigo-600">
            {t('common.save')}
          </Button>
        }
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdateCustomer}>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="customerCode" label="Mã khách hàng" rules={[{ required: true }]}>
              <Input />
            </Form.Item>

            <Form.Item name="status" label={t('common.status')}>
              <Select>
                <Select.Option value="ACTIVE">Đang hoạt động</Select.Option>
                <Select.Option value="INACTIVE">Tạm dừng</Select.Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item name="ownerId" label="Sales phụ trách">
            <Select placeholder="Chọn sales phụ trách" allowClear>
              {users.map((u) => (
                <Select.Option key={u.id} value={u.id}>
                  {u.lastName} {u.firstName} {u.roles?.length ? `(${u.roles.join(', ')})` : ''}
                </Select.Option>

              ))}
            </Select>
          </Form.Item>

          {editingCustomer?.entityType === 'COMPANY' && (
            <div className="border-t border-slate-200 pt-4 mt-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Thông tin Doanh nghiệp</h4>
              <Form.Item name="companyName" label="Tên doanh nghiệp">
                <Input />
              </Form.Item>
              <div className="grid grid-cols-2 gap-4">
                <Form.Item name="taxCode" label="Mã số thuế">
                  <Input />
                </Form.Item>
                <Form.Item name="industry" label="Ngành nghề">
                  <Input />
                </Form.Item>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Form.Item name="phone" label="Số điện thoại công ty">
                  <Input />
                </Form.Item>
                <Form.Item name="email" label="Email công ty">
                  <Input />
                </Form.Item>
              </div>
              <Form.Item name="address" label="Địa chỉ công ty">
                <Input />
              </Form.Item>
            </div>
          )}

          {editingCustomer?.contact && (
            <div className="border-t border-slate-200 pt-4 mt-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                {editingCustomer?.entityType === 'COMPANY' ? 'Người đại diện / Liên hệ chính' : 'Thông tin Cá nhân'}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <Form.Item name="firstName" label="Họ">
                  <Input />
                </Form.Item>
                <Form.Item name="lastName" label="Tên">
                  <Input />
                </Form.Item>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Form.Item name="contactPhone" label="SĐT cá nhân">
                  <Input />
                </Form.Item>
                <Form.Item name="contactEmail" label="Email cá nhân">
                  <Input />
                </Form.Item>
              </div>
              <Form.Item name="position" label="Chức vụ">
                <Input />
              </Form.Item>
            </div>
          )}
        </Form>
      </Drawer>
    </div>
  );
};

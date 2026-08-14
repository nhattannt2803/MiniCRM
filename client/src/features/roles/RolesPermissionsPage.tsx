import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Tag, Checkbox, Modal, Form, Input, message, Tabs, Alert } from 'antd';
import {
  SafetyCertificateOutlined,
  LockOutlined,
  PlusOutlined,
  SaveOutlined,
  CheckOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { crmService } from '../../services/crmService';

export const RolesPermissionsPage: React.FC = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeRoleKey, setActiveRoleKey] = useState<string>('ADMIN');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res: any = await crmService.getRoles();
      if (res.success) {
        setRoles(res.data);
      }
    } catch (err) {
      message.error('Không thể tải danh sách vai trò & quyền hạn');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const permissionModules = [
    { key: 'leads', name: 'Quản lý Lead (Khách hàng tiềm năng)', desc: 'Xem, tạo, sửa, xóa, phân bổ Lead' },
    { key: 'companies', name: 'Công ty & Doanh nghiệp', desc: 'Quản lý tệp công ty đối tác' },
    { key: 'contacts', name: 'Người liên hệ (Contacts)', desc: 'Chi tiết người liên hệ' },
    { key: 'opportunities', name: 'Cơ hội kinh doanh (Deals)', desc: 'Quản lý Kanban & pipeline bán hàng' },
    { key: 'quotes', name: 'Báo giá & Hợp đồng', desc: 'Tạo và phê duyệt báo giá' },
    { key: 'staff', name: 'Quản lý Nhân sự & Teams', desc: 'Thành viên đội ngũ, phân nhóm' },
    { key: 'automations', name: 'Quy trình Tự động hóa', desc: 'Cấu hình kịch bản tự động' },
    { key: 'settings', name: 'Cài đặt Hệ thống', desc: 'Cấu hình chung CRM' },
  ];

  const handleSavePermissions = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      message.success('Đã lưu cấu hình ma trận phân quyền thành công!');
    }, 500);
  };

  const handleCreateRole = (values: any) => {
    const newRole = {
      id: `role-${Date.now()}`,
      name: values.name,
      code: values.code.toUpperCase(),
      description: values.description,
      permissions: {
        leads: ['read', 'create'],
        companies: ['read'],
        opportunities: ['read'],
      },
    };
    setRoles([...roles, newRole]);
    setActiveRoleKey(newRole.code);
    message.success('Đã thêm vai trò người dùng mới!');
    setIsModalOpen(false);
    form.resetFields();
  };

  const currentRole = roles.find((r) => r.code === activeRoleKey) || roles[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <SafetyCertificateOutlined className="text-indigo-600" /> Roles & Permissions (Vai trò & Phân quyền)
          </h1>
          <p className="text-sm text-slate-500">
            Quản lý ma trận phân quyền chi tiết (Access Control Matrix) cho từng vai trò trong hệ thống CRM
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button icon={<ReloadOutlined />} onClick={fetchRoles} loading={loading}>
            Làm mới
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            Thêm Vai Trò Mới
          </Button>
        </div>
      </div>

      <Alert
        message="Chính sách bảo mật phân quyền"
        description="Mỗi vai trò (Role) sẽ có quyền thao tác tương ứng trên từng tính năng. Thay đổi cấu hình quyền sẽ có hiệu lực ngay lập tức với các tài khoản gán vai trò đó."
        type="info"
        showIcon
        className="rounded-xl"
      />

      {/* Role Selection Tabs */}
      <Card className="shadow-xs border-slate-200 rounded-xl">
        <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-100 pb-4">
          {roles.map((r) => (
            <Button
              key={r.code}
              type={activeRoleKey === r.code ? 'primary' : 'default'}
              onClick={() => setActiveRoleKey(r.code)}
              className={`rounded-lg font-semibold ${
                activeRoleKey === r.code ? 'bg-indigo-600 border-indigo-600' : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              🛡️ {r.name} ({r.code})
            </Button>
          ))}
        </div>

        {currentRole && (
          <div className="space-y-6">
            <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-100 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 block">Đang chỉnh sửa cho vai trò</span>
                <h3 className="text-lg font-bold text-indigo-950 flex items-center gap-2 mt-0.5">
                  {currentRole.name} <Tag color="purple">{currentRole.code}</Tag>
                </h3>
                <p className="text-xs text-indigo-800/80 mt-1">{currentRole.description || 'Quyền truy cập tiêu chuẩn'}</p>
              </div>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSavePermissions}
                loading={saving}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Lưu Ma Trận Quyền
              </Button>
            </div>

            {/* Permission Matrix Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200">
                    <th className="p-3.5 font-bold">Phân hệ / Chức năng</th>
                    <th className="p-3.5 font-bold text-center">Xem (Read)</th>
                    <th className="p-3.5 font-bold text-center">Tạo (Create)</th>
                    <th className="p-3.5 font-bold text-center">Chỉnh sửa (Edit)</th>
                    <th className="p-3.5 font-bold text-center">Xóa (Delete)</th>
                    <th className="p-3.5 font-bold text-center">Xuất / Báo cáo (Export)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {permissionModules.map((mod) => {
                    const isAdmin = currentRole.code === 'ADMIN';

                    return (
                      <tr key={mod.key} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{mod.name}</div>
                          <div className="text-xs text-slate-400">{mod.desc}</div>
                        </td>
                        <td className="p-3.5 text-center">
                          <Checkbox defaultChecked={true} disabled={isAdmin} />
                        </td>
                        <td className="p-3.5 text-center">
                          <Checkbox defaultChecked={isAdmin || currentRole.code !== 'TELEMARKETING'} disabled={isAdmin} />
                        </td>
                        <td className="p-3.5 text-center">
                          <Checkbox defaultChecked={isAdmin || currentRole.code === 'SALES_MANAGER'} disabled={isAdmin} />
                        </td>
                        <td className="p-3.5 text-center">
                          <Checkbox defaultChecked={isAdmin} disabled={isAdmin} />
                        </td>
                        <td className="p-3.5 text-center">
                          <Checkbox defaultChecked={isAdmin || currentRole.code === 'SALES_MANAGER'} disabled={isAdmin} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      {/* Add Role Modal */}
      <Modal
        title="Tạo Vai Trò (Role) Mới"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreateRole} className="mt-4">
          <Form.Item name="name" label="Tên Vai Trò" rules={[{ required: true, message: 'Vui lòng nhập tên vai trò' }]}>
            <Input placeholder="Ví dụ: Chuyên viên Hỗ trợ (Support Rep)" />
          </Form.Item>
          <Form.Item name="code" label="Mã Vai Trò (ROLE CODE)" rules={[{ required: true, message: 'Vui lòng nhập mã vai trò' }]}>
            <Input placeholder="SUPPORT_REP" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả quyền hạn">
            <Input.TextArea rows={2} placeholder="Hỗ trợ chăm sóc khách hàng sau bán..." />
          </Form.Item>

          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit">
              Tạo Vai Trò
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

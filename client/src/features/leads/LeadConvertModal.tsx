import React, { useState, useEffect } from 'react';
import { Modal, Form, Radio, Input, InputNumber, Switch, Select, Alert, notification, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { crmService } from '../../services/crmService';
import { Lead, Company, Contact } from '../../types';

interface LeadConvertModalProps {
  visible: boolean;
  lead: Lead | null;
  onCancel: () => void;
  onSuccess: () => void;
}

export const LeadConvertModal: React.FC<LeadConvertModalProps> = ({
  visible,
  lead,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const { t } = useTranslation();

  const companyMode = Form.useWatch('companyMode', form);
  const contactMode = Form.useWatch('contactMode', form);
  const createOpportunity = Form.useWatch('createOpportunity', form);

  useEffect(() => {
    if (visible && lead) {
      Promise.all([
        crmService.getCompanies({ limit: 100 }),
        crmService.getContacts({ limit: 100 }),
        crmService.getProducts(),
      ])
        .then(([compRes, contRes, prodRes]: any) => {
          const companyList = compRes.data || [];
          const contactList = contRes.data || [];
          const productList = prodRes.data || [];

          setCompanies(companyList);
          setContacts(contactList);
          setProducts(productList);

          // 1. Resolve Company Priority (default to EXISTING if customer or matched company exists)
          let targetCompanyMode: 'EXISTING' | 'CREATE' = 'CREATE';
          let targetCompanyId: string | undefined = undefined;

          if (lead.companyId) {
            targetCompanyMode = 'EXISTING';
            targetCompanyId = String(lead.companyId);
          } else if (lead.customer?.companyId) {
            targetCompanyMode = 'EXISTING';
            targetCompanyId = String(lead.customer.companyId);
          } else if (lead.companyName) {
            const matchedCo = companyList.find(
              (c: any) => c.name.toLowerCase() === lead.companyName?.trim().toLowerCase()
            );
            if (matchedCo) {
              targetCompanyMode = 'EXISTING';
              targetCompanyId = String(matchedCo.id);
            }
          }

          // 2. Resolve Contact Priority (default to EXISTING if contact or matched email/phone exists)
          let targetContactMode: 'EXISTING' | 'CREATE' = 'CREATE';
          let targetContactId: string | undefined = undefined;

          if (lead.contactId) {
            targetContactMode = 'EXISTING';
            targetContactId = String(lead.contactId);
          } else if (lead.customer?.contactId) {
            targetContactMode = 'EXISTING';
            targetContactId = String(lead.customer.contactId);
          } else {
            const matchedCt = contactList.find(
              (c: any) =>
                (lead.phone && c.phone && String(c.phone).trim() === String(lead.phone).trim()) ||
                (lead.email && c.email && String(c.email).toLowerCase().trim() === String(lead.email).toLowerCase().trim())
            );
            if (matchedCt) {
              targetContactMode = 'EXISTING';
              targetContactId = String(matchedCt.id);
            }
          }

          // If lead has a customer linked, enforce default to EXISTING selection
          if (lead.customerId || lead.customer) {
            if (targetCompanyId) targetCompanyMode = 'EXISTING';
            if (targetContactId || contactList.length > 0) {
              if (targetContactId) targetContactMode = 'EXISTING';
            }
          }

          // 3. Resolve Products & calculate initial deal value from Lead interest/notes
          const initialSelectedProductIds: string[] = [];
          let calculatedAmount = 0;

          if (lead.notes && productList.length > 0) {
            const notesLower = lead.notes.toLowerCase();
            productList.forEach((p: any) => {
              if (
                notesLower.includes(p.name.toLowerCase()) ||
                notesLower.includes(p.code.toLowerCase())
              ) {
                initialSelectedProductIds.push(String(p.id));
                calculatedAmount += Number(p.unitPrice || 0);
              }
            });
          }

          form.setFieldsValue({
            companyMode: targetCompanyMode,
            existingCompanyId: targetCompanyId,
            newCompanyName: lead.companyName || `Công ty ${lead.lastName} ${lead.firstName}`,

            contactMode: targetContactMode,
            existingContactId: targetContactId,
            newContactFirstName: lead.firstName,
            newContactLastName: lead.lastName,
            newContactEmail: lead.email,
            newContactPhone: lead.phone,

            productIds: initialSelectedProductIds,
            createOpportunity: true,
            opportunityName: `Cơ hội - ${lead.lastName} ${lead.firstName}`,
            opportunityAmount: calculatedAmount > 0 ? calculatedAmount : 0,
          });
        })
        .catch((err) => {
          console.error('Error initializing lead convert modal:', err);
        });
    }
  }, [visible, lead, form]);

  const handleProductsChange = (selectedIds: string[]) => {
    const total = selectedIds.reduce((sum, id) => {
      const p = products.find((prod) => String(prod.id) === String(id));
      return sum + (p ? Number(p.unitPrice || 0) : 0);
    }, 0);
    form.setFieldsValue({ opportunityAmount: total });
  };

  const handleFinish = async (values: any) => {
    if (!lead) return;
    setLoading(true);
    try {
      const res: any = await crmService.convertLead(lead.id, values);
      if (res.success) {
        notification.success({
          message: t('common.success'),
          description: t('leads.convertSuccess'),
        });
        onSuccess();
      }
    } catch (err: any) {
      notification.error({
        message: t('common.error'),
        description: err.message || 'Lỗi xảy ra trong quá trình chuyển đổi.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={<span className="font-bold text-slate-900 text-lg">{t('leads.convertModal.title')}</span>}
      open={visible}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={loading}
      okText={t('leads.convertModal.confirmButton')}
      okButtonProps={{ className: 'bg-indigo-600 font-semibold' }}
      width={680}
    >
      {lead && (
        <div className="mb-4 p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-1 text-xs text-indigo-900">
          <div className="font-bold text-sm text-indigo-950 flex items-center justify-between">
            <span>📌 Lead: {lead.lastName} {lead.firstName}</span>
            <Tag color={lead.status === 'QUALIFIED' ? 'green' : 'blue'}>{lead.status}</Tag>
          </div>
          <div>📞 SĐT: <strong>{lead.phone || 'Chưa có'}</strong> | ✉️ Email: <strong>{lead.email || 'Chưa có'}</strong></div>
          {lead.companyName && <div>🏢 Công ty ghi nhận: <strong>{lead.companyName}</strong></div>}
          {lead.notes && (
            <div className="mt-1 pt-1 border-t border-indigo-200/50 italic text-slate-600">
              💬 Ghi chú: &quot;{lead.notes}&quot;
            </div>
          )}
        </div>
      )}

      {lead?.customer && (
        <Alert
          type="info"
          showIcon
          className="mb-4 rounded-xl border-blue-200"
          message="Lead đã được gắn với Khách hàng (Customer)"
          description={`Mã khách hàng: ${lead.customer.customerCode || lead.customer.id}. Hệ thống đã tự động ưu tiên mặc định tích chọn Khách hàng/Công ty đã có.`}
        />
      )}

      <Form form={form} layout="vertical" onFinish={handleFinish} className="py-2 space-y-4">
        {/* Company Section */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="font-bold text-slate-800 text-sm flex items-center justify-between">
            <span>🏢 {t('companies.title')}</span>
            <span className="text-xs text-slate-500 font-normal">Mặc định ưu tiên công ty đã có</span>
          </div>
          <Form.Item name="companyMode" className="mb-2">
            <Radio.Group>
              <Radio value="EXISTING">
                <span className="font-semibold text-emerald-700">✓ Chọn Công ty đã có</span>
              </Radio>
              <Radio value="CREATE">Tạo mới Công ty</Radio>
            </Radio.Group>
          </Form.Item>

          {companyMode === 'CREATE' && (
            <Form.Item
              name="newCompanyName"
              label={t('companies.title')}
              rules={[{ required: true, message: 'Vui lòng nhập tên công ty' }]}
            >
              <Input placeholder="Tên công ty" />
            </Form.Item>
          )}

          {companyMode === 'EXISTING' && (
            <Form.Item
              name="existingCompanyId"
              label="Chọn Công ty"
              rules={[{ required: true, message: 'Vui lòng chọn công ty' }]}
            >
              <Select placeholder="Chọn công ty đã có trong hệ thống" showSearch optionFilterProp="children">
                {companies.map((c) => (
                  <Select.Option key={c.id} value={c.id}>
                    {c.name} {c.taxCode ? `(MST: ${c.taxCode})` : ''}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}
        </div>

        {/* Contact Section */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="font-bold text-slate-800 text-sm flex items-center justify-between">
            <span>👤 {t('contacts.title')}</span>
            <span className="text-xs text-slate-500 font-normal">Mặc định ưu tiên liên hệ đã có</span>
          </div>
          <Form.Item name="contactMode" className="mb-2">
            <Radio.Group>
              <Radio value="EXISTING">
                <span className="font-semibold text-emerald-700">✓ Chọn Người liên hệ đã có</span>
              </Radio>
              <Radio value="CREATE">Tạo mới Người liên hệ</Radio>
            </Radio.Group>
          </Form.Item>

          {contactMode === 'CREATE' && (
            <div className="grid grid-cols-2 gap-3">
              <Form.Item name="newContactFirstName" label={t('leads.form.firstName')} rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="newContactLastName" label={t('leads.form.lastName')} rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </div>
          )}

          {contactMode === 'EXISTING' && (
            <Form.Item
              name="existingContactId"
              label="Chọn Người liên hệ"
              rules={[{ required: true, message: 'Vui lòng chọn người liên hệ' }]}
            >
              <Select placeholder="Chọn người liên hệ đã có trong hệ thống" showSearch optionFilterProp="children">
                {contacts.map((c) => (
                  <Select.Option key={c.id} value={c.id}>
                    {c.lastName} {c.firstName} ({c.email || c.phone || 'Chưa có email'})
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}
        </div>

        {/* Opportunity & Interested Products Section */}
        <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-indigo-900 text-sm">💼 {t('opportunities.title')} &amp; Sản phẩm quan tâm</span>
            <Form.Item name="createOpportunity" valuePropName="checked" noStyle>
              <Switch />
            </Form.Item>
          </div>

          {createOpportunity && (
            <div className="space-y-3 pt-2">
              <Form.Item
                name="opportunityName"
                label={t('leads.convertModal.opportunityName')}
                rules={[{ required: true, message: 'Vui lòng nhập tên cơ hội' }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                name="productIds"
                label="🛍️ Sản phẩm Lead quan tâm (Tổng hợp tự động giá tiền deal)"
              >
                <Select
                  mode="multiple"
                  placeholder="Chọn các sản phẩm lead quan tâm..."
                  onChange={handleProductsChange}
                  optionFilterProp="children"
                  allowClear
                >
                  {products.map((p) => (
                    <Select.Option key={p.id} value={p.id}>
                      {p.name} - {Number(p.unitPrice).toLocaleString('vi-VN')} {p.currency || 'VNĐ'}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="opportunityAmount"
                label={t('leads.convertModal.opportunityAmount') + ' (VNĐ)'}
                rules={[{ required: true }]}
                extra="Giá tiền tự động tính từ tổng sản phẩm chọn ở trên. Sale có thể điều chỉnh tùy ý."
              >
                <InputNumber
                  style={{ width: '100%' }}
                  formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
              </Form.Item>
            </div>
          )}
        </div>
      </Form>
    </Modal>
  );
};

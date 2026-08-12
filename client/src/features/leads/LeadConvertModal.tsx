import React, { useState, useEffect } from 'react';
import { Modal, Form, Radio, Input, InputNumber, Switch, Select, notification } from 'antd';
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
  const { t } = useTranslation();

  const companyMode = Form.useWatch('companyMode', form);
  const contactMode = Form.useWatch('contactMode', form);
  const createOpportunity = Form.useWatch('createOpportunity', form);

  useEffect(() => {
    if (visible && lead) {
      crmService.getCompanies({ limit: 100 }).then((res: any) => setCompanies(res.data));
      crmService.getContacts({ limit: 100 }).then((res: any) => setContacts(res.data));

      form.setFieldsValue({
        companyMode: 'CREATE',
        newCompanyName: lead.companyName || `Công ty ${lead.firstName} ${lead.lastName}`,
        contactMode: 'CREATE',
        newContactFirstName: lead.firstName,
        newContactLastName: lead.lastName,
        newContactEmail: lead.email,
        newContactPhone: lead.phone,
        createOpportunity: true,
        opportunityName: `Cơ hội - ${lead.firstName} ${lead.lastName}`,
        opportunityAmount: 15000000,
      });
    }
  }, [visible, lead, form]);

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
      width={650}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} className="py-2 space-y-4">
        {/* Company Section */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="font-bold text-slate-800 text-sm">🏢 {t('companies.title')}</div>
          <Form.Item name="companyMode" className="mb-2">
            <Radio.Group>
              <Radio value="CREATE">Tạo mới Công ty</Radio>
              <Radio value="EXISTING">Chọn Công ty đã có</Radio>
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
              <Select placeholder="Chọn công ty">
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
          <div className="font-bold text-slate-800 text-sm">👤 {t('contacts.title')}</div>
          <Form.Item name="contactMode" className="mb-2">
            <Radio.Group>
              <Radio value="CREATE">Tạo mới Người liên hệ</Radio>
              <Radio value="EXISTING">Chọn Người liên hệ đã có</Radio>
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
              <Select placeholder="Chọn người liên hệ">
                {contacts.map((c) => (
                  <Select.Option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} ({c.email || c.phone || 'Chưa có email'})
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}
        </div>

        {/* Opportunity Section */}
        <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-indigo-900 text-sm">💼 {t('opportunities.title')}</span>
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
                name="opportunityAmount"
                label={t('leads.convertModal.opportunityAmount') + ' (VNĐ)'}
                rules={[{ required: true }]}
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

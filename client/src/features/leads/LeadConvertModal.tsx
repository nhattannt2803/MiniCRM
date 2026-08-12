import React, { useState, useEffect } from 'react';
import { Modal, Form, Radio, Input, InputNumber, Switch, Select, notification } from 'antd';
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

  const companyMode = Form.useWatch('companyMode', form);
  const contactMode = Form.useWatch('contactMode', form);
  const createOpportunity = Form.useWatch('createOpportunity', form);

  useEffect(() => {
    if (visible && lead) {
      crmService.getCompanies({ limit: 100 }).then((res: any) => setCompanies(res.data));
      crmService.getContacts({ limit: 100 }).then((res: any) => setContacts(res.data));

      form.setFieldsValue({
        companyMode: 'CREATE',
        newCompanyName: lead.companyName || `${lead.firstName} ${lead.lastName} Co.`,
        contactMode: 'CREATE',
        newContactFirstName: lead.firstName,
        newContactLastName: lead.lastName,
        newContactEmail: lead.email,
        newContactPhone: lead.phone,
        createOpportunity: true,
        opportunityName: `Deal - ${lead.firstName} ${lead.lastName}`,
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
          message: 'Lead Converted Successfully',
          description: 'Lead converted into Company, Contact, and Opportunity without duplication.',
        });
        onSuccess();
      }
    } catch (err: any) {
      notification.error({
        message: 'Lead Conversion Failed',
        description: err.message || 'Error occurred during conversion transaction.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={<span className="font-bold text-slate-900 text-lg">Convert Lead to Accounts & Deals</span>}
      open={visible}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={loading}
      okText="Execute Conversion"
      okButtonProps={{ className: 'bg-indigo-600 font-semibold' }}
      width={650}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} className="py-2 space-y-4">
        {/* Company Section */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="font-bold text-slate-800 text-sm">🏢 Company Account Selection</div>
          <Form.Item name="companyMode" className="mb-2">
            <Radio.Group>
              <Radio value="CREATE">Create New Company</Radio>
              <Radio value="EXISTING">Use Existing Company</Radio>
            </Radio.Group>
          </Form.Item>

          {companyMode === 'CREATE' && (
            <Form.Item
              name="newCompanyName"
              label="Company Name"
              rules={[{ required: true, message: 'Please enter company name' }]}
            >
              <Input placeholder="Company Name" />
            </Form.Item>
          )}

          {companyMode === 'EXISTING' && (
            <Form.Item
              name="existingCompanyId"
              label="Select Existing Company"
              rules={[{ required: true, message: 'Please select company' }]}
            >
              <Select placeholder="Select Company">
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
          <div className="font-bold text-slate-800 text-sm">👤 Individual Contact Selection</div>
          <Form.Item name="contactMode" className="mb-2">
            <Radio.Group>
              <Radio value="CREATE">Create New Contact</Radio>
              <Radio value="EXISTING">Use Existing Contact</Radio>
            </Radio.Group>
          </Form.Item>

          {contactMode === 'CREATE' && (
            <div className="grid grid-cols-2 gap-3">
              <Form.Item name="newContactFirstName" label="First Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="newContactLastName" label="Last Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </div>
          )}

          {contactMode === 'EXISTING' && (
            <Form.Item
              name="existingContactId"
              label="Select Existing Contact"
              rules={[{ required: true, message: 'Please select contact' }]}
            >
              <Select placeholder="Select Contact">
                {contacts.map((c) => (
                  <Select.Option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} ({c.email || c.phone || 'No email'})
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}
        </div>

        {/* Opportunity Section */}
        <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-indigo-900 text-sm">💼 Create Sales Opportunity Deal</span>
            <Form.Item name="createOpportunity" valuePropName="checked" noStyle>
              <Switch />
            </Form.Item>
          </div>

          {createOpportunity && (
            <div className="space-y-3 pt-2">
              <Form.Item
                name="opportunityName"
                label="Opportunity Name"
                rules={[{ required: true, message: 'Please enter opportunity name' }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                name="opportunityAmount"
                label="Expected Deal Amount (VND)"
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

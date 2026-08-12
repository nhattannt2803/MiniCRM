import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, InputNumber, Input, Button, Table, notification } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { crmService } from '../../services/crmService';
import { Opportunity, Product } from '../../types';

interface QuoteCreateModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

export const QuoteCreateModal: React.FC<QuoteCreateModalProps> = ({ visible, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      crmService.getOpportunities({ limit: 100 }).then((res: any) => setOpps(res.data));
      crmService.getProducts().then((res: any) => setProducts(res.data));
    }
  }, [visible]);

  const handleFinish = async (values: any) => {
    setLoading(true);
    try {
      const res: any = await crmService.createQuote(values);
      if (res.success) {
        notification.success({ message: 'Quote Generated', description: 'Quote calculated with subtotal, tax & discount.' });
        onSuccess();
      }
    } catch (err: any) {
      notification.error({ message: 'Error', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Create Formal Price Quotation"
      open={visible}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={loading}
      width={700}
      okText="Generate Quote"
      okButtonProps={{ className: 'bg-indigo-600 font-semibold' }}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{ items: [{ itemDescription: '', quantity: 1, unitPrice: 0, taxRate: 10 }] }}>
        <Form.Item name="opportunityId" label="Associated Opportunity" rules={[{ required: true }]}>
          <Select placeholder="Select Deal">
            {opps.map((o) => (
              <Select.Option key={o.id} value={o.id}>
                {o.name} ({o.company?.name || 'Individual'})
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.List name="items">
          {(fields, { add, remove }) => (
            <div className="space-y-3">
              <div className="flex items-center justify-between font-bold text-slate-800 text-sm border-b pb-1">
                <span>Quote Line Items</span>
                <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => add()}>
                  Add Item
                </Button>
              </div>

              {fields.map(({ key, name, ...restField }) => (
                <div key={key} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border">
                  <Form.Item {...restField} name={[name, 'itemDescription']} label="Description" className="mb-0 flex-1" rules={[{ required: true }]}>
                    <Input placeholder="Product / Service item description" />
                  </Form.Item>

                  <Form.Item {...restField} name={[name, 'quantity']} label="Qty" className="mb-0 w-20" rules={[{ required: true }]}>
                    <InputNumber min={1} />
                  </Form.Item>

                  <Form.Item {...restField} name={[name, 'unitPrice']} label="Price (VND)" className="mb-0 w-32" rules={[{ required: true }]}>
                    <InputNumber />
                  </Form.Item>

                  <Form.Item {...restField} name={[name, 'taxRate']} label="VAT %" className="mb-0 w-20">
                    <InputNumber min={0} max={100} />
                  </Form.Item>

                  <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
                </div>
              ))}
            </div>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
};

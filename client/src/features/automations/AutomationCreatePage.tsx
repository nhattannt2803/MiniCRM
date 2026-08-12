import React from 'react';
import { Card, Form, Input, Select, Button, notification } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { crmService } from '../../services/crmService';

export const AutomationCreatePage: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const handleFinish = async (values: any) => {
    try {
      const res: any = await crmService.createAutomation({
        name: values.name,
        description: values.description,
        triggers: [
          {
            triggerEvent: values.triggerEvent,
            entityType: values.entityType,
            config: values.triggerConfig ? { to_status: values.triggerConfig } : null,
          },
        ],
        actions: values.actions || [],
      });

      if (res.success) {
        notification.success({ message: 'Automation Rule Created' });
        navigate('/automations');
      }
    } catch (err: any) {
      notification.error({ message: 'Error', description: err.message });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/automations')} />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create Automation Rule</h1>
          <p className="text-sm text-slate-500">Configure trigger events and automated action sequences</p>
        </div>
      </div>

      <Card className="shadow-xs border-slate-200 rounded-xl bg-white">
        <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{ actions: [{ actionType: 'CREATE_TASK', config: { title: 'Follow up', due_in_hours: 24 } }] }}>
          <Form.Item name="name" label="Automation Rule Name" rules={[{ required: true }]}>
            <Input placeholder="Auto Lead Follow-up Rule" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>

          {/* Trigger Section */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 mb-6">
            <div className="font-bold text-slate-800 text-sm">⚡ WHEN (Trigger Event)</div>
            <div className="grid grid-cols-2 gap-3">
              <Form.Item name="triggerEvent" label="Trigger Event" rules={[{ required: true }]}>
                <Select placeholder="Select Event">
                  <Select.Option value="RECORD_CREATED">RECORD_CREATED</Select.Option>
                  <Select.Option value="STATUS_CHANGED">STATUS_CHANGED</Select.Option>
                  <Select.Option value="STAGE_CHANGED">STAGE_CHANGED</Select.Option>
                  <Select.Option value="TASK_OVERDUE">TASK_OVERDUE</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item name="entityType" label="Target Entity" rules={[{ required: true }]}>
                <Select placeholder="Select Entity">
                  <Select.Option value="LEAD">LEAD</Select.Option>
                  <Select.Option value="OPPORTUNITY">OPPORTUNITY</Select.Option>
                  <Select.Option value="TASK">TASK</Select.Option>
                </Select>
              </Form.Item>
            </div>
          </div>

          {/* Actions List */}
          <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3 mb-6">
            <div className="font-bold text-indigo-900 text-sm">🎯 THEN (Action Sequence)</div>
            <Form.List name="actions">
              {(fields, { add, remove }) => (
                <div className="space-y-3">
                  {fields.map(({ key, name, ...restField }) => (
                    <div key={key} className="flex gap-2 items-center bg-white p-3 rounded-lg border">
                      <Form.Item {...restField} name={[name, 'actionType']} label="Action Type" className="mb-0 w-48" rules={[{ required: true }]}>
                        <Select>
                          <Select.Option value="CREATE_TASK">CREATE_TASK</Select.Option>
                          <Select.Option value="SEND_NOTIFICATION">SEND_NOTIFICATION</Select.Option>
                          <Select.Option value="CREATE_OPPORTUNITY">CREATE_OPPORTUNITY</Select.Option>
                          <Select.Option value="CREATE_CUSTOMER">CREATE_CUSTOMER</Select.Option>
                        </Select>
                      </Form.Item>

                      <Form.Item {...restField} name={[name, 'config', 'title']} label="Task Title / Note" className="mb-0 flex-1">
                        <Input placeholder="Follow up task title" />
                      </Form.Item>

                      <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
                    </div>
                  ))}
                  <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add()}>
                    Add Action Step
                  </Button>
                </div>
              )}
            </Form.List>
          </div>

          <Button type="primary" htmlType="submit" size="large" block className="bg-indigo-600 font-semibold h-11">
            Save Automation Rule
          </Button>
        </Form>
      </Card>
    </div>
  );
};

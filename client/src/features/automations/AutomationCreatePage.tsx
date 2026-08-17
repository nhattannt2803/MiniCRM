import React from 'react';
import { Card, Form, Input, Select, Button, InputNumber, notification } from 'antd';
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
        actions: (values.actions || []).map((act: any) => ({
          actionType: act.actionType,
          config: {
            title: act.config?.title || (act.actionType === 'CREATE_TASK' ? 'Tư vấn Lead mới' : undefined),
            due_in_hours: act.config?.due_in_hours ? Number(act.config.due_in_hours) : 2,
            priority: act.config?.priority || 'HIGH',
            role: act.config?.role || 'SALES',
          },
        })),
      });

      if (res.success) {
        notification.success({ message: 'Đã tạo Quy trình tự động hóa thành công!' });
        navigate('/automations');
      }
    } catch (err: any) {
      notification.error({ message: 'Lỗi tạo quy trình', description: err.message });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/automations')} />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tạo Quy trình Tự động hóa Mới</h1>
          <p className="text-sm text-slate-500">Cấu hình sự kiện kích hoạt và chuỗi hành động xử lý tự động</p>
        </div>
      </div>

      <Card className="shadow-xs border-slate-200 rounded-xl bg-white">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          initialValues={{
            name: 'Tự động Phân công & Tạo Task Tư vấn Lead mới (2h)',
            description: 'Phân công Sales phụ trách và tạo Task gọi điện tư vấn trong vòng 2 giờ khi có Lead mới',
            triggerEvent: 'LEAD_CREATED',
            entityType: 'LEAD',
            actions: [
              { actionType: 'ASSIGN_OWNER', config: { role: 'SALES' } },
              { actionType: 'CREATE_TASK', config: { title: 'Tư vấn Lead mới', due_in_hours: 2, priority: 'HIGH' } },
            ],
          }}
        >
          <Form.Item name="name" label="Tên quy trình tự động hóa" rules={[{ required: true, message: 'Nhập tên quy trình' }]}>
            <Input placeholder="Ví dụ: Tự động phân công & Tạo Task tư vấn Lead mới" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả quy trình">
            <Input.TextArea rows={2} placeholder="Mô tả chi tiết mục đích quy trình..." />
          </Form.Item>

          {/* Trigger Section */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 mb-6">
            <div className="font-bold text-slate-800 text-sm">⚡ KHI NÀO (Sự kiện kích hoạt)</div>
            <div className="grid grid-cols-2 gap-3">
              <Form.Item name="triggerEvent" label="Sự kiện (Trigger Event)" rules={[{ required: true }]}>
                <Select placeholder="Chọn sự kiện">
                  <Select.Option value="LEAD_CREATED">Tạo Lead mới (LEAD_CREATED)</Select.Option>
                  <Select.Option value="RECORD_CREATED">Tạo bản ghi mới (RECORD_CREATED)</Select.Option>
                  <Select.Option value="STATUS_CHANGED">Thay đổi Trạng thái (STATUS_CHANGED)</Select.Option>
                  <Select.Option value="STAGE_CHANGED">Chuyển Giai đoạn Deal (STAGE_CHANGED)</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item name="entityType" label="Đối tượng tác động (Target Entity)" rules={[{ required: true }]}>
                <Select placeholder="Chọn đối tượng">
                  <Select.Option value="LEAD">LEAD (Khách hàng tiềm năng)</Select.Option>
                  <Select.Option value="OPPORTUNITY">OPPORTUNITY (Cơ hội)</Select.Option>
                  <Select.Option value="TASK">TASK (Công việc)</Select.Option>
                  <Select.Option value="CUSTOMER">CUSTOMER (Khách hàng)</Select.Option>
                </Select>
              </Form.Item>
            </div>
          </div>

          {/* Actions List */}
          <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-3 mb-6">
            <div className="font-bold text-indigo-900 text-sm">🎯 THÌ (Chuỗi hành động tự động)</div>
            <Form.List name="actions">
              {(fields, { add, remove }) => (
                <div className="space-y-3">
                  {fields.map(({ key, name, ...restField }) => (
                    <div key={key} className="p-3 bg-white rounded-lg border border-indigo-100 space-y-2">
                      <div className="flex gap-2 items-center">
                        <span className="font-semibold text-slate-600 text-xs">Bước {name + 1}:</span>
                        <Form.Item {...restField} name={[name, 'actionType']} className="mb-0 flex-1" rules={[{ required: true }]}>
                          <Select placeholder="Chọn loại hành động">
                            <Select.Option value="ASSIGN_OWNER">👤 Phân công Sales phụ trách (ASSIGN_OWNER)</Select.Option>
                            <Select.Option value="CREATE_TASK">📌 Tự động tạo Task công việc (CREATE_TASK)</Select.Option>
                            <Select.Option value="SEND_NOTIFICATION">🔔 Gửi thông báo hệ thống (SEND_NOTIFICATION)</Select.Option>
                            <Select.Option value="CREATE_OPPORTUNITY">💼 Tự động tạo Cơ hội (CREATE_OPPORTUNITY)</Select.Option>
                            <Select.Option value="CREATE_CUSTOMER">🏢 Chuyển thành Customer (CREATE_CUSTOMER)</Select.Option>
                          </Select>
                        </Form.Item>
                        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
                      </div>

                      <Form.Item noStyle shouldUpdate={(prev, curr) => prev.actions?.[name]?.actionType !== curr.actions?.[name]?.actionType}>
                        {({ getFieldValue }) => {
                          const actionType = getFieldValue(['actions', name, 'actionType']);
                          if (actionType === 'CREATE_TASK') {
                            return (
                              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                                <Form.Item {...restField} name={[name, 'config', 'title']} label="Tên công việc" className="mb-0 col-span-1">
                                  <Input placeholder="Ví dụ: Tư vấn Lead mới" />
                                </Form.Item>
                                <Form.Item {...restField} name={[name, 'config', 'due_in_hours']} label="Hạn chót (Số giờ)" className="mb-0 col-span-1">
                                  <InputNumber min={1} max={72} className="w-full" placeholder="2" addonAfter="giờ" />
                                </Form.Item>
                                <Form.Item {...restField} name={[name, 'config', 'priority']} label="Mức ưu tiên" className="mb-0 col-span-1">
                                  <Select>
                                    <Select.Option value="URGENT">Khẩn cấp (URGENT)</Select.Option>
                                    <Select.Option value="HIGH">Cao (HIGH)</Select.Option>
                                    <Select.Option value="MEDIUM">Trung bình (MEDIUM)</Select.Option>
                                    <Select.Option value="LOW">Thấp (LOW)</Select.Option>
                                  </Select>
                                </Form.Item>
                              </div>
                            );
                          }
                          return null;
                        }}
                      </Form.Item>
                    </div>
                  ))}
                  <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add({ actionType: 'CREATE_TASK', config: { title: 'Tư vấn Lead mới', due_in_hours: 2 } })}>
                    Thêm hành động tiếp theo
                  </Button>
                </div>
              )}
            </Form.List>
          </div>

          <Button type="primary" htmlType="submit" size="large" block className="bg-indigo-600 font-semibold h-11">
            Lưu Quy trình Tự động hóa
          </Button>
        </Form>
      </Card>
    </div>
  );
};

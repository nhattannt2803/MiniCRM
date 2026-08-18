import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Select, Button, InputNumber, notification } from 'antd';
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { crmService } from '../../services/crmService';

interface PipelineStage {
  id: string;
  name: string;
  orderNo: number;
}

interface Pipeline {
  id: string;
  name: string;
  isDefault: boolean;
  stages: PipelineStage[];
}

export const AutomationCreatePage: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [actionStages, setActionStages] = useState<Record<number, PipelineStage[]>>({});

  useEffect(() => {
    crmService.getPipelines().then((res: any) => {
      const data: Pipeline[] = res.data?.data || res.data || [];
      setPipelines(data);
    }).catch(() => {});
  }, []);

  const handlePipelineChange = (pipelineId: string, actionIndex: number) => {
    const pipeline = pipelines.find((p) => p.id === pipelineId);
    const stages = pipeline?.stages || [];
    setActionStages((prev) => ({ ...prev, [actionIndex]: stages }));

    const firstStageId = stages[0]?.id || undefined;
    const actions = form.getFieldValue('actions') || [];
    actions[actionIndex] = {
      ...actions[actionIndex],
      config: {
        ...(actions[actionIndex]?.config || {}),
        pipeline_id: pipelineId,
        stage_id: firstStageId,
      },
    };
    form.setFieldsValue({ actions });
  };

  const LEAD_STATUS_OPTIONS = [
    { value: 'NEW', label: 'Mới (NEW)' },
    { value: 'CONTACTED', label: 'Đã liên hệ (CONTACTED)' },
    { value: 'QUALIFIED', label: 'Tiềm năng (QUALIFIED)' },
    { value: 'NURTURING', label: 'Đang nuôi dưỡng (NURTURING)' },
    { value: 'CONVERTED', label: 'Đã chuyển đổi (CONVERTED)' },
    { value: 'DISQUALIFIED', label: 'Không tiềm năng (DISQUALIFIED)' },
  ];

  const handleFinish = async (values: any) => {
    try {
      const triggerEvent = values.triggerEvent;
      let triggerConfig: any = null;

      if (triggerEvent === 'STATUS_CHANGED' && values.triggerToStatus) {
        triggerConfig = { to_status: values.triggerToStatus };
      } else if (triggerEvent === 'STAGE_CHANGED' && values.triggerToStageCode) {
        triggerConfig = { to_stage_code: values.triggerToStageCode };
      }

      const res: any = await crmService.createAutomation({
        name: values.name,
        description: values.description,
        triggers: [
          {
            triggerEvent,
            entityType: values.entityType,
            config: triggerConfig,
          },
        ],
        actions: (values.actions || []).map((act: any) => {
          const baseConfig: Record<string, any> = {};
          if (act.actionType === 'CREATE_TASK') {
            baseConfig.title = act.config?.title || 'Tư vấn Lead mới';
            baseConfig.due_in_hours = act.config?.due_in_hours ? Number(act.config.due_in_hours) : 2;
            baseConfig.priority = act.config?.priority || 'HIGH';
          } else if (act.actionType === 'CREATE_OPPORTUNITY') {
            if (act.config?.pipeline_id) baseConfig.pipeline_id = act.config.pipeline_id;
            if (act.config?.stage_id) baseConfig.stage_id = act.config.stage_id;
            baseConfig.amount = act.config?.amount ? Number(act.config.amount) : 0;
          } else if (act.actionType === 'ASSIGN_OWNER') {
            baseConfig.role = act.config?.role || 'SALES';
          }
          return { actionType: act.actionType, config: baseConfig };
        }),
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

            {/* Extended trigger config */}
            <Form.Item
              noStyle
              shouldUpdate={(prev, curr) =>
                prev.triggerEvent !== curr.triggerEvent || prev.entityType !== curr.entityType
              }
            >
              {({ getFieldValue }) => {
                const triggerEvent = getFieldValue('triggerEvent');
                const entityType = getFieldValue('entityType');

                if (triggerEvent === 'STATUS_CHANGED') {
                  return (
                    <Form.Item
                      name="triggerToStatus"
                      label={
                        <span>
                          Lọc trạng thái đích{' '}
                          <span className="text-slate-400 font-normal text-xs">
                            (để trống = kích hoạt với mọi thay đổi trạng thái)
                          </span>
                        </span>
                      }
                    >
                      <Select
                        allowClear
                        placeholder="Tất cả trạng thái (không lọc)"
                        options={
                          entityType === 'LEAD'
                            ? LEAD_STATUS_OPTIONS
                            : [
                                { value: 'OPEN', label: 'Đang mở (OPEN)' },
                                { value: 'WON', label: 'Đã thắng (WON)' },
                                { value: 'LOST', label: 'Đã thua (LOST)' },
                              ]
                        }
                      />
                    </Form.Item>
                  );
                }
                if (triggerEvent === 'STAGE_CHANGED') {
                  return (
                    <Form.Item
                      name="triggerToStageCode"
                      label="Chỉ kích hoạt khi chuyển sang giai đoạn (Stage Code)"
                    >
                      <Input placeholder="Ví dụ: PROPOSAL, NEGOTIATION..." />
                    </Form.Item>
                  );
                }
                return null;
              }}
            </Form.Item>
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
                        <Form.Item
                          {...restField}
                          name={[name, 'actionType']}
                          className="mb-0 flex-1"
                          rules={[{ required: true }]}
                        >
                          <Select placeholder="Chọn loại hành động">
                            <Select.Option value="ASSIGN_OWNER">
                              👤 Phân công Sales phụ trách (ASSIGN_OWNER)
                            </Select.Option>
                            <Select.Option value="CREATE_TASK">
                              📌 Tự động tạo Task công việc (CREATE_TASK)
                            </Select.Option>
                            <Select.Option value="SEND_NOTIFICATION">
                              🔔 Gửi thông báo hệ thống (SEND_NOTIFICATION)
                            </Select.Option>
                            <Select.Option value="CREATE_OPPORTUNITY">
                              💼 Tự động tạo Cơ hội (CREATE_OPPORTUNITY)
                            </Select.Option>
                            <Select.Option value="CREATE_CUSTOMER">
                              🏢 Chuyển thành Customer (CREATE_CUSTOMER)
                            </Select.Option>
                          </Select>
                        </Form.Item>
                        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
                      </div>

                      <Form.Item
                        noStyle
                        shouldUpdate={(prev, curr) =>
                          prev.actions?.[name]?.actionType !== curr.actions?.[name]?.actionType
                        }
                      >
                        {({ getFieldValue }) => {
                          const actionType = getFieldValue(['actions', name, 'actionType']);

                          if (actionType === 'CREATE_TASK') {
                            return (
                              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                                <Form.Item
                                  {...restField}
                                  name={[name, 'config', 'title']}
                                  label="Tên công việc"
                                  className="mb-0 col-span-1"
                                >
                                  <Input placeholder="Ví dụ: Tư vấn Lead mới" />
                                </Form.Item>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'config', 'due_in_hours']}
                                  label="Hạn chót (Số giờ)"
                                  className="mb-0 col-span-1"
                                >
                                  <InputNumber min={1} max={72} className="w-full" placeholder="2" addonAfter="giờ" />
                                </Form.Item>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'config', 'priority']}
                                  label="Mức ưu tiên"
                                  className="mb-0 col-span-1"
                                >
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

                          if (actionType === 'CREATE_OPPORTUNITY') {
                            const stages: PipelineStage[] = actionStages[name] || [];
                            return (
                              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                                <Form.Item
                                  {...restField}
                                  name={[name, 'config', 'pipeline_id']}
                                  label="Pipeline (Kanban)"
                                  className="mb-0"
                                  extra={
                                    <span className="text-xs text-slate-400">
                                      Để trống = dùng Pipeline mặc định
                                    </span>
                                  }
                                >
                                  <Select
                                    allowClear
                                    placeholder="Pipeline mặc định"
                                    onChange={(val) => handlePipelineChange(val, name)}
                                    options={pipelines.map((p) => ({
                                      value: p.id,
                                      label: `${p.name}${p.isDefault ? ' ⭐ (mặc định)' : ''}`,
                                    }))}
                                  />
                                </Form.Item>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'config', 'stage_id']}
                                  label="Cột trong Kanban (Stage)"
                                  className="mb-0"
                                  extra={
                                    <span className="text-xs text-slate-400">
                                      Để trống = cột đầu tiên của Pipeline
                                    </span>
                                  }
                                >
                                  <Select
                                    allowClear
                                    placeholder={
                                      stages.length > 0 ? 'Cột đầu tiên (mặc định)' : 'Chọn Pipeline trước'
                                    }
                                    disabled={stages.length === 0}
                                    options={stages.map((s) => ({
                                      value: s.id,
                                      label: s.name,
                                    }))}
                                  />
                                </Form.Item>
                                <Form.Item
                                  {...restField}
                                  name={[name, 'config', 'amount']}
                                  label="Giá trị cơ hội ban đầu"
                                  className="mb-0 col-span-2"
                                  extra={
                                     <span className="text-xs text-slate-400">
                                       Để trống = tự động tính tổng giá trị sản phẩm quan tâm của Lead đó
                                     </span>
                                   }
                                >
                                  <InputNumber
                                    min={0}
                                    className="w-full"
                                    placeholder="0"
                                    addonAfter="₫"
                                  />
                                </Form.Item>
                              </div>
                            );
                          }

                          return null;
                        }}
                      </Form.Item>
                    </div>
                  ))}
                  <Button
                    type="dashed"
                    block
                    icon={<PlusOutlined />}
                    onClick={() =>
                      add({ actionType: 'CREATE_TASK', config: { title: 'Tư vấn Lead mới', due_in_hours: 2 } })
                    }
                  >
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

import React, { useState, useEffect, useRef } from 'react';
import { Table, Button, Switch, Tag, Modal, Form, Input, Select, InputNumber, Popconfirm, Tooltip, notification } from 'antd';
import { PlusOutlined, HistoryOutlined, RobotOutlined, EditOutlined, DeleteOutlined, CopyOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { crmService } from '../../services/crmService';
import { Automation } from '../../types';

export const AutomationListPage: React.FC = () => {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const fetchAutomations = async () => {
    setLoading(true);
    try {
      const res: any = await crmService.getAutomations();
      if (res.success) setAutomations(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAutomations();
  }, []);

  const handleToggle = async (id: string, currentActive: boolean) => {
    try {
      await crmService.toggleAutomation(id, !currentActive);
      notification.success({ message: t('common.success'), description: 'Đã cập nhật trạng thái tự động hóa!' });
      fetchAutomations();
    } catch (err: any) {
      notification.error({ message: t('common.error'), description: err.message });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await crmService.deleteAutomation(id);
      notification.success({ message: 'Xóa quy trình thành công' });
      fetchAutomations();
    } catch (err: any) {
      notification.error({ message: t('common.error'), description: err.message });
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res: any = await crmService.duplicateAutomation(id);
      if (res.success) {
        notification.success({
          message: 'Sao chép quy trình thành công',
          description: 'Đã tạo bản sao mới ở trạng thái Tắt (Off). Bạn có thể chỉnh sửa ngay.',
        });
        await fetchAutomations();
        if (res.data) {
          handleOpenEdit(res.data);
        }
      }
    } catch (err: any) {
      notification.error({ message: t('common.error'), description: err.message });
    }
  };

  const handleExport = (record: any) => {
    const exportData = {
      name: record.name,
      description: record.description,
      triggerType: record.triggerType || 'EVENT_BASED',
      priority: record.priority || 10,
      triggers: (record.triggers || []).map((t: any) => ({
        triggerEvent: t.triggerEvent,
        entityType: t.entityType,
        config: t.config ? (typeof t.config === 'string' ? JSON.parse(t.config) : t.config) : null,
      })),
      conditions: (record.conditions || []).map((c: any) => ({
        field: c.field,
        operator: c.operator,
        value: c.value ? (typeof c.value === 'string' ? JSON.parse(c.value) : c.value) : null,
        logicOperator: c.logicOperator,
      })),
      actions: (record.actions || []).map((a: any) => ({
        actionType: a.actionType,
        config: a.config ? (typeof a.config === 'string' ? JSON.parse(a.config) : a.config) : null,
      })),
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `automation-${record.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    notification.success({ message: 'Đã xuất quy trình ra file JSON!' });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const res: any = await crmService.importAutomation(json);
        if (res.success) {
          notification.success({ message: 'Nhập quy trình tự động hóa thành công!' });
          fetchAutomations();
        }
      } catch (err: any) {
        notification.error({ message: 'Lỗi nhập quy trình', description: err.message || 'File JSON không hợp lệ' });
      }
      if (e.target) e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleOpenEdit = (record: any) => {
    setEditingAutomation(record);
    const firstTrigger = record.triggers?.[0] || {};
    const parsedActions = (record.actions || []).map((act: any) => {
      const cfg = typeof act.config === 'string' ? JSON.parse(act.config) : act.config || {};
      return {
        actionType: act.actionType,
        config: {
          title: cfg.title || '',
          due_in_hours: cfg.due_in_hours || 2,
          priority: cfg.priority || 'HIGH',
        },
      };
    });

    form.setFieldsValue({
      name: record.name,
      description: record.description || '',
      triggerEvent: firstTrigger.triggerEvent || 'LEAD_CREATED',
      entityType: firstTrigger.entityType || 'LEAD',
      actions: parsedActions.length > 0 ? parsedActions : [
        { actionType: 'ASSIGN_OWNER', config: { role: 'SALES' } },
        { actionType: 'CREATE_TASK', config: { title: 'Tư vấn Lead mới', due_in_hours: 2, priority: 'HIGH' } },
      ],
    });
    setEditModalVisible(true);
  };

  const handleSaveEdit = async (values: any) => {
    if (!editingAutomation) return;
    try {
      await crmService.updateAutomation(editingAutomation.id, {
        name: values.name,
        description: values.description,
        triggers: [
          {
            triggerEvent: values.triggerEvent,
            entityType: values.entityType,
          },
        ],
        actions: (values.actions || []).map((act: any) => ({
          actionType: act.actionType,
          config: {
            title: act.config?.title || (act.actionType === 'CREATE_TASK' ? 'Tư vấn Lead mới' : undefined),
            due_in_hours: act.config?.due_in_hours ? Number(act.config.due_in_hours) : 2,
            priority: act.config?.priority || 'HIGH',
          },
        })),
      });

      notification.success({ message: 'Cập nhật quy trình tự động hóa thành công!' });
      setEditModalVisible(false);
      fetchAutomations();
    } catch (err: any) {
      notification.error({ message: t('common.error'), description: err.message });
    }
  };

  const columns = [
    {
      title: 'Tên quy trình',
      key: 'name',
      render: (_: any, r: Automation) => (
        <div>
          <div className="font-bold text-slate-900 flex items-center gap-2">
            <RobotOutlined className="text-indigo-600" />
            {r.name}
          </div>
          {r.description && <div className="text-xs text-slate-500 mt-0.5">{r.description}</div>}
        </div>
      ),
    },
    {
      title: t('automations.trigger'),
      key: 'trigger',
      render: (_: any, r: Automation) => (
        <div>
          {r.triggers.map((t: any) => (
            <Tag key={t.id} color="blue" className="font-semibold">
              {t.triggerEvent} ({t.entityType})
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: t('automations.action'),
      key: 'actions',
      render: (_: any, r: Automation) => (
        <div className="flex flex-wrap gap-1">
          {r.actions.map((act: any) => (
            <Tag key={act.id} color="purple">
              {act.actionType}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: t('common.status'),
      key: 'isActive',
      width: 100,
      render: (_: any, r: Automation) => (
        <Switch checked={r.isActive} onChange={() => handleToggle(r.id, r.isActive)} size="small" />
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions_col',
      width: 220,
      render: (_: any, r: any) => (
        <div className="flex items-center gap-1.5">
          <Tooltip title="Chỉnh sửa quy trình">
            <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenEdit(r)}>
              Sửa
            </Button>
          </Tooltip>
          <Tooltip title="Sao chép thành quy trình mới để chỉnh sửa nhanh">
            <Button size="small" icon={<CopyOutlined />} onClick={() => handleDuplicate(r.id)}>
              Sao chép
            </Button>
          </Tooltip>
          <Tooltip title="Xuất file JSON quy trình">
            <Button size="small" icon={<DownloadOutlined />} onClick={() => handleExport(r)} />
          </Tooltip>
          <Popconfirm title="Xóa quy trình này?" onConfirm={() => handleDelete(r.id)} okText="Xóa" cancelText="Hủy">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Hidden file input for import JSON */}
      <input type="file" ref={fileInputRef} onChange={handleImportFile} accept=".json" style={{ display: 'none' }} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('automations.title')}</h1>
          <p className="text-sm text-slate-500">Cấu hình quy trình tự động hóa dựa trên sự kiện hệ thống</p>
        </div>

        <div className="flex gap-2">
          <Button icon={<UploadOutlined />} onClick={handleImportClick}>
            Nhập JSON
          </Button>
          <Button icon={<HistoryOutlined />} onClick={() => navigate('/automations/executions')}>
            {t('automations.executionHistory')}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/automations/create')}
          >
            {t('automations.addAutomation')}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <Table columns={columns} dataSource={automations} rowKey="id" loading={loading} pagination={false} />
      </div>

      {/* Edit Automation Modal */}
      <Modal
        title="Chỉnh sửa Quy trình Tự động hóa"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={() => form.submit()}
        width={650}
        okText="Lưu thay đổi"
        cancelText="Hủy"
        okButtonProps={{ className: 'bg-indigo-600' }}
      >
        <Form form={form} layout="vertical" onFinish={handleSaveEdit}>
          <Form.Item name="name" label="Tên quy trình" rules={[{ required: true }]}>
            <Input placeholder="Tên quy trình tự động..." />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} />
          </Form.Item>

          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border rounded-lg mb-4">
            <Form.Item name="triggerEvent" label="Sự kiện kích hoạt (Trigger)" className="mb-0">
              <Select>
                <Select.Option value="LEAD_CREATED">Tạo Lead mới (LEAD_CREATED)</Select.Option>
                <Select.Option value="RECORD_CREATED">Tạo bản ghi (RECORD_CREATED)</Select.Option>
                <Select.Option value="STATUS_CHANGED">Thay đổi trạng thái (STATUS_CHANGED)</Select.Option>
                <Select.Option value="STAGE_CHANGED">Chuyển giai đoạn (STAGE_CHANGED)</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="entityType" label="Đối tượng tác động" className="mb-0">
              <Select>
                <Select.Option value="LEAD">LEAD</Select.Option>
                <Select.Option value="OPPORTUNITY">OPPORTUNITY</Select.Option>
                <Select.Option value="TASK">TASK</Select.Option>
              </Select>
            </Form.Item>
          </div>

          <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg mb-2 space-y-3">
            <div className="font-bold text-xs text-indigo-900">CHUỖI HÀNH ĐỘNG TỰ ĐỘNG</div>
            <Form.List name="actions">
              {(fields, { add, remove }) => (
                <div className="space-y-3">
                  {fields.map(({ key, name, ...restField }) => (
                    <div key={key} className="p-3 bg-white rounded-lg border space-y-2">
                      <div className="flex gap-2 items-center">
                        <span className="text-xs font-semibold text-slate-500">Bước {name + 1}:</span>
                        <Form.Item {...restField} name={[name, 'actionType']} className="mb-0 flex-1">
                          <Select>
                            <Select.Option value="ASSIGN_OWNER">👤 Phân công Sales phụ trách (ASSIGN_OWNER)</Select.Option>
                            <Select.Option value="CREATE_TASK">📌 Tự động tạo Task công việc (CREATE_TASK)</Select.Option>
                            <Select.Option value="SEND_NOTIFICATION">🔔 Gửi thông báo (SEND_NOTIFICATION)</Select.Option>
                            <Select.Option value="CREATE_OPPORTUNITY">💼 Tự động tạo Cơ hội (CREATE_OPPORTUNITY)</Select.Option>
                          </Select>
                        </Form.Item>
                        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
                      </div>

                      <Form.Item noStyle shouldUpdate={(prev, curr) => prev.actions?.[name]?.actionType !== curr.actions?.[name]?.actionType}>
                        {({ getFieldValue }) => {
                          const actionType = getFieldValue(['actions', name, 'actionType']);
                          if (actionType === 'CREATE_TASK') {
                            return (
                              <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                                <Form.Item {...restField} name={[name, 'config', 'title']} label="Tên công việc" className="mb-0">
                                  <Input placeholder="Tư vấn Lead mới" />
                                </Form.Item>
                                <Form.Item {...restField} name={[name, 'config', 'due_in_hours']} label="Hạn chót (Số giờ)" className="mb-0">
                                  <InputNumber min={1} max={72} className="w-full" addonAfter="giờ" />
                                </Form.Item>
                                <Form.Item {...restField} name={[name, 'config', 'priority']} label="Mức ưu tiên" className="mb-0">
                                  <Select>
                                    <Select.Option value="URGENT">URGENT</Select.Option>
                                    <Select.Option value="HIGH">HIGH</Select.Option>
                                    <Select.Option value="MEDIUM">MEDIUM</Select.Option>
                                    <Select.Option value="LOW">LOW</Select.Option>
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
                    Thêm bước hành động
                  </Button>
                </div>
              )}
            </Form.List>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

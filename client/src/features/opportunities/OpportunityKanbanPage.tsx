import React, { useState, useEffect } from 'react';
import { Button, Select, notification, Spin, Drawer, Form, Input, InputNumber } from 'antd';
import { TableOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { crmService } from '../../services/crmService';
import { KanbanBoard, KanbanColumn } from '../../components/Kanban/KanbanBoard';
import { Opportunity, Pipeline, PipelineStage, User } from '../../types';

export const OpportunityKanbanPage: React.FC = () => {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | undefined>();
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [formPipelineId, setFormPipelineId] = useState<string | undefined>();

  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const fetchPipelines = async () => {
    try {
      const res: any = await crmService.getPipelines();
      if (res.success && res.data.length > 0) {
        setPipelines(res.data);
        const def = res.data.find((p: any) => p.isDefault) || res.data[0];
        setSelectedPipelineId(def.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBoard = async (pipelineId?: string) => {
    setLoading(true);
    try {
      const res: any = await crmService.getKanbanBoard(pipelineId);
      if (res.success) {
        setColumns(res.data.columns);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelines();
    crmService.getUsers().then((res: any) => {
      if (res.success) setUsers(res.data);
    }).catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (selectedPipelineId) {
      fetchBoard(selectedPipelineId);
    }
  }, [selectedPipelineId]);

  const handleStageChange = async (oppId: string, newStageId: string) => {
    try {
      const res: any = await crmService.updateOpportunityStage(oppId, newStageId);
      if (res.success) {
        notification.success({
          message: t('common.success'),
          description: 'Đã cập nhật giai đoạn cơ hội!',
        });
        fetchBoard(selectedPipelineId);
      }
    } catch (err: any) {
      notification.error({ message: t('common.error'), description: err.message });
    }
  };

  const handleOpenAddDrawer = (targetStageId?: string) => {
    const pipeId = selectedPipelineId || (pipelines.length > 0 ? pipelines[0].id : undefined);
    setFormPipelineId(pipeId);

    const activePipeline = pipelines.find((p) => p.id === pipeId);
    const defaultStageId =
      targetStageId ||
      (activePipeline?.stages && activePipeline.stages.length > 0
        ? activePipeline.stages[0].id
        : undefined);

    form.setFieldsValue({
      pipelineId: pipeId,
      stageId: defaultStageId,
      name: '',
      amount: undefined,
      description: '',
      ownerId: undefined,
    });
    setDrawerVisible(true);
  };

  const handleCreateOpportunity = async (values: any) => {
    try {
      const res: any = await crmService.createOpportunity(values);
      if (res.success) {
        notification.success({ message: t('common.success'), description: t('opportunities.addOpportunity') });
        setDrawerVisible(false);
        form.resetFields();
        fetchBoard(selectedPipelineId);
      }
    } catch (err: any) {
      notification.error({ message: t('common.error'), description: err.message });
    }
  };

  const currentFormPipeline = pipelines.find((p) => p.id === formPipelineId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('opportunities.title')} (Kanban)</h1>
          <p className="text-sm text-slate-500">Kéo và thả cơ hội giữa các giai đoạn bán hàng</p>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={selectedPipelineId}
            onChange={(val) => setSelectedPipelineId(val)}
            className="w-56"
          >
            {pipelines.map((p) => (
              <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
            ))}
          </Select>

          <Button icon={<TableOutlined />} onClick={() => navigate('/opportunities/list')}>
            {t('opportunities.listView')}
          </Button>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            className="bg-indigo-600 font-semibold"
            onClick={() => handleOpenAddDrawer()}
          >
            {t('opportunities.addOpportunity')}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex items-center justify-center"><Spin size="large" /></div>
      ) : (
        <KanbanBoard
          columns={columns}
          onDealClick={(opp) => navigate(`/opportunities/${opp.id}`)}
          onStageChange={handleStageChange}
          onAddDeal={(stageId) => handleOpenAddDrawer(stageId)}
        />
      )}

      <Drawer
        title={t('opportunities.addOpportunity')}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        width={450}
        extra={<Button type="primary" onClick={() => form.submit()} className="bg-indigo-600">{t('common.save')}</Button>}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateOpportunity}>
          <Form.Item name="name" label={t('dashboard.dealName')} rules={[{ required: true, message: 'Vui lòng nhập tên deal' }]}>
            <Input placeholder="Tên hợp đồng / deal" />
          </Form.Item>

          <Form.Item name="amount" label={t('opportunities.amount') + ' (VNĐ)'} rules={[{ required: true, message: 'Vui lòng nhập giá trị' }]}>
            <InputNumber style={{ width: '100%' }} placeholder="Nhập số tiền" />
          </Form.Item>

          <Form.Item name="ownerId" label="Sale phụ trách (Bổ nhiệm)">
            <Select placeholder="Chọn nhân viên Sale phụ trách" allowClear>
              {users.map((u) => (
                <Select.Option key={u.id} value={u.id}>
                  👤 {u.firstName} {u.lastName} ({u.email})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="pipelineId" label="Quy trình bán hàng" rules={[{ required: true }]}>
            <Select onChange={(val) => {
              setFormPipelineId(val);
              const p = pipelines.find((item) => item.id === val);
              if (p && p.stages.length > 0) {
                form.setFieldValue('stageId', p.stages[0].id);
              }
            }}>
              {pipelines.map((p) => (
                <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="stageId" label="Giai đoạn" rules={[{ required: true, message: 'Vui lòng chọn giai đoạn' }]}>
            <Select placeholder="Chọn giai đoạn">
              {currentFormPipeline?.stages?.map((s: PipelineStage) => (
                <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="description" label={t('common.description')}>
            <Input.TextArea rows={3} placeholder="Nhập ghi chú hoặc thông tin bổ sung" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
};



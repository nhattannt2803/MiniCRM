import React, { useState, useEffect } from 'react';
import { Button, Select, notification, Spin } from 'antd';
import { TableOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { crmService } from '../../services/crmService';
import { KanbanBoard, KanbanColumn } from '../../components/Kanban/KanbanBoard';
import { Opportunity, Pipeline } from '../../types';

export const OpportunityKanbanPage: React.FC = () => {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | undefined>();
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

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
          message: 'Stage Updated',
          description: 'Opportunity moved to new stage. Stage History recorded & Automation triggered.',
        });
        fetchBoard(selectedPipelineId);
      }
    } catch (err: any) {
      notification.error({ message: 'Stage Change Failed', description: err.message });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Opportunity Kanban Board</h1>
          <p className="text-sm text-slate-500">Drag & drop deals between sales stages to trigger stage history and automation</p>
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
            Table View
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
        />
      )}
    </div>
  );
};

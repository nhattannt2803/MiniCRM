import React, { useState, useEffect } from 'react';
import { Table, Button, Switch, Tag, Card, notification } from 'antd';
import { PlusOutlined, HistoryOutlined, RobotOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { crmService } from '../../services/crmService';
import { Automation } from '../../types';

export const AutomationListPage: React.FC = () => {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

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
      notification.success({ message: 'Automation Rule Updated' });
      fetchAutomations();
    } catch (err: any) {
      notification.error({ message: 'Error', description: err.message });
    }
  };

  const columns = [
    {
      title: 'Automation Rule Name',
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
      title: 'Trigger Event',
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
      title: 'Actions Sequence',
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
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (p: number) => <Tag color="default">Priority {p}</Tag>,
    },
    {
      title: 'Active',
      key: 'isActive',
      render: (_: any, r: Automation) => (
        <Switch checked={r.isActive} onChange={() => handleToggle(r.id, r.isActive)} size="small" />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Automation Engine Rules</h1>
          <p className="text-sm text-slate-500">Metadata-driven event rules and background workflow triggers</p>
        </div>

        <div className="flex gap-2">
          <Button icon={<HistoryOutlined />} onClick={() => navigate('/automations/executions')}>
            Execution History Logs
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            className="bg-indigo-600 font-semibold rounded-lg"
            onClick={() => navigate('/automations/create')}
          >
            Create Rule
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <Table columns={columns} dataSource={automations} rowKey="id" loading={loading} pagination={false} />
      </div>
    </div>
  );
};

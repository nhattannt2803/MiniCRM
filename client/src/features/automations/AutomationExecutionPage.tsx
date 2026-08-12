import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Modal, Spin } from 'antd';
import { ArrowLeftOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { crmService } from '../../services/crmService';
import { AutomationExecution } from '../../types';

export const AutomationExecutionPage: React.FC = () => {
  const [executions, setExecutions] = useState<AutomationExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExec, setSelectedExec] = useState<AutomationExecution | null>(null);

  const navigate = useNavigate();

  const fetchExecutions = async () => {
    setLoading(true);
    try {
      const res: any = await crmService.getAutomationExecutions({ limit: 50 });
      if (res.success) setExecutions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExecutions();
  }, []);

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'SUCCESS': return <Tag color="green">SUCCESS</Tag>;
      case 'FAILED': return <Tag color="red">FAILED</Tag>;
      case 'SKIPPED': return <Tag color="default">SKIPPED</Tag>;
      case 'RUNNING': return <Tag color="blue">RUNNING</Tag>;
      default: return <Tag>{status}</Tag>;
    }
  };

  const columns = [
    {
      title: 'Time',
      dataIndex: 'createdAt',
      key: 'time',
      render: (d: string) => new Date(d).toLocaleString('vi-VN'),
    },
    {
      title: 'Automation Rule',
      key: 'rule',
      render: (_: any, r: AutomationExecution) => (
        <span className="font-bold text-slate-800">{r.automation?.name || 'Rule'}</span>
      ),
    },
    {
      title: 'Target Entity',
      key: 'entity',
      render: (_: any, r: AutomationExecution) => (
        <Tag>{r.entityType} #{r.entityId}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Idempotency Key',
      dataIndex: 'idempotencyKey',
      key: 'key',
      render: (k: string) => <span className="text-xs text-slate-400 font-mono">{k.substring(0, 16)}...</span>,
    },
    {
      title: 'Details',
      key: 'details',
      render: (_: any, r: AutomationExecution) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => setSelectedExec(r)} />
      ),
    },
  ];

  const logColumns = [
    { title: 'Step #', dataIndex: 'stepNo', key: 'stepNo', width: 70 },
    { title: 'Action', dataIndex: 'actionType', key: 'actionType', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => getStatusTag(s) },
    { title: 'Error', dataIndex: 'errorMessage', key: 'error', render: (e: string) => e ? <span className="text-xs text-rose-600 font-medium">{e}</span> : '—' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/automations')} />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Automation Execution Audit Logs</h1>
          <p className="text-sm text-slate-500">History of background job executions, triggers, idempotency keys, and error retries</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <Table columns={columns} dataSource={executions} rowKey="id" loading={loading} pagination={false} />
      </div>

      <Modal
        title="Execution Step Details"
        open={!!selectedExec}
        onCancel={() => setSelectedExec(null)}
        footer={null}
        width={650}
      >
        {selectedExec && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg">
              <div><span className="text-slate-400">Rule:</span> <span className="font-bold">{selectedExec.automation?.name}</span></div>
              <div><span className="text-slate-400">Status:</span> {getStatusTag(selectedExec.status)}</div>
              <div><span className="text-slate-400">Event ID:</span> <span className="font-mono">{selectedExec.eventId}</span></div>
              <div><span className="text-slate-400">Retries:</span> {selectedExec.retryCount}</div>
            </div>

            {selectedExec.errorMessage && (
              <div className="p-3 bg-rose-50 text-rose-600 text-xs rounded-lg font-medium">
                {selectedExec.errorMessage}
              </div>
            )}

            <Table columns={logColumns} dataSource={selectedExec.executionLogs} rowKey="id" pagination={false} />
          </div>
        )}
      </Modal>
    </div>
  );
};

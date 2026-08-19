import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Modal, Spin } from 'antd';
import { ArrowLeftOutlined, EyeOutlined } from '@ant-design/icons';
import { useBizNavigate } from '../../hooks/useBizNavigate';
import { useTranslation } from 'react-i18next';
import { crmService } from '../../services/crmService';
import { AutomationExecution } from '../../types';

export const AutomationExecutionPage: React.FC = () => {
  const [executions, setExecutions] = useState<AutomationExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExec, setSelectedExec] = useState<AutomationExecution | null>(null);

  const navigate = useBizNavigate();
  const { t, i18n } = useTranslation();

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
      case 'SUCCESS': return <Tag color="green">THÀNH CÔNG</Tag>;
      case 'FAILED': return <Tag color="red">THẤT BẠI</Tag>;
      case 'SKIPPED': return <Tag color="default">BỎ QUA</Tag>;
      case 'RUNNING': return <Tag color="blue">ĐANG CHẠY</Tag>;
      default: return <Tag>{status}</Tag>;
    }
  };

  const columns = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'time',
      render: (d: string) => new Date(d).toLocaleString(i18n.language === 'vi' ? 'vi-VN' : 'en-US'),
    },
    {
      title: 'Quy trình',
      key: 'rule',
      render: (_: any, r: AutomationExecution) => (
        <span className="font-bold text-slate-800">{r.automation?.name || 'Quy trình'}</span>
      ),
    },
    {
      title: 'Đối tượng',
      key: 'entity',
      render: (_: any, r: AutomationExecution) => (
        <Tag>{r.entityType} #{r.entityId}</Tag>
      ),
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Chi tiết',
      key: 'details',
      render: (_: any, r: AutomationExecution) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => setSelectedExec(r)} />
      ),
    },
  ];

  const logColumns = [
    { title: 'Bước #', dataIndex: 'stepNo', key: 'stepNo', width: 70 },
    { title: 'Hành động', dataIndex: 'actionType', key: 'actionType', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: t('common.status'), dataIndex: 'status', key: 'status', render: (s: string) => getStatusTag(s) },
    { title: 'Thông báo lỗi', dataIndex: 'errorMessage', key: 'error', render: (e: string) => e ? <span className="text-xs text-rose-600 font-medium">{e}</span> : '—' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/automations')} />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('automations.executionHistory')}</h1>
          <p className="text-sm text-slate-500">Nhật ký chi tiết các lần chạy tự động hóa và lịch sử sự kiện</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <Table columns={columns} dataSource={executions} rowKey="id" loading={loading} pagination={false} />
      </div>

      <Modal
        title="Chi tiết các bước thực thi"
        open={!!selectedExec}
        onCancel={() => setSelectedExec(null)}
        footer={null}
        width={650}
      >
        {selectedExec && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg">
              <div><span className="text-slate-400">Quy trình:</span> <span className="font-bold">{selectedExec.automation?.name}</span></div>
              <div><span className="text-slate-400">Trạng thái:</span> {getStatusTag(selectedExec.status)}</div>
              <div><span className="text-slate-400">Mã sự kiện:</span> <span className="font-mono">{selectedExec.eventId}</span></div>
              <div><span className="text-slate-400">Số lần thử lại:</span> {selectedExec.retryCount}</div>
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

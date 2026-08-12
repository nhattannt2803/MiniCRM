import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Select, Checkbox, notification } from 'antd';
import { PlusOutlined, AlertOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { crmService } from '../../services/crmService';
import { Task } from '../../types';

export const TaskListPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [overdueOnly, setOverdueOnly] = useState(false);
  const { t, i18n } = useTranslation();

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res: any = await crmService.getTasks({ status: statusFilter, isOverdue: overdueOnly });
      if (res.success) setTasks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, overdueOnly]);

  const handleStatusToggle = async (task: Task) => {
    const newStatus = task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';
    try {
      await crmService.updateTaskStatus(task.id, newStatus);
      notification.success({ message: t('common.success'), description: `Đã cập nhật trạng thái nhiệm vụ!` });
      fetchTasks();
    } catch (err: any) {
      notification.error({ message: t('common.error'), description: err.message });
    }
  };

  const getPriorityTag = (p: string) => {
    switch (p) {
      case 'URGENT': return <Tag color="red">{t('tasks.priority.URGENT')}</Tag>;
      case 'HIGH': return <Tag color="orange">{t('tasks.priority.HIGH')}</Tag>;
      case 'MEDIUM': return <Tag color="blue">{t('tasks.priority.MEDIUM')}</Tag>;
      default: return <Tag color="default">{t('tasks.priority.LOW')}</Tag>;
    }
  };

  const columns = [
    {
      title: 'Hoàn thành',
      key: 'done',
      width: 100,
      render: (_: any, r: Task) => (
        <Checkbox checked={r.status === 'COMPLETED'} onChange={() => handleStatusToggle(r)} />
      ),
    },
    {
      title: t('tasks.taskName'),
      key: 'title',
      render: (_: any, r: Task) => (
        <div>
          <span className={`font-bold ${r.status === 'COMPLETED' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
            {r.title}
          </span>
          {r.isOverdue && (
            <Tag color="red" className="ml-2 animate-pulse">
              <AlertOutlined /> QUÁ HẠN
            </Tag>
          )}
          {r.description && <p className="text-xs text-slate-500 mt-0.5">{r.description}</p>}
        </div>
      ),
    },
    { title: 'Độ ưu tiên', dataIndex: 'priority', key: 'priority', render: (p: string) => getPriorityTag(p) },
    {
      title: t('tasks.dueDate'),
      dataIndex: 'dueAt',
      key: 'dueAt',
      render: (d: string, r: Task) => (
        <span className={`text-xs font-semibold ${r.isOverdue ? 'text-rose-600' : 'text-slate-700'}`}>
          {new Date(d).toLocaleString(i18n.language === 'vi' ? 'vi-VN' : 'en-US')}
        </span>
      ),
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <Tag color={s === 'COMPLETED' ? 'green' : 'orange'}>
          {s === 'COMPLETED' ? t('tasks.status.COMPLETED') : s === 'IN_PROGRESS' ? t('tasks.status.IN_PROGRESS') : t('tasks.status.PENDING')}
        </Tag>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('tasks.title')}</h1>
          <p className="text-sm text-slate-500">Quản lý danh sách công việc, nhắc nhở và theo dõi tiến độ</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
        <Select placeholder={t('common.status')} className="w-40" allowClear onChange={(v) => setStatusFilter(v)}>
          <Select.Option value="TODO">{t('tasks.status.PENDING')}</Select.Option>
          <Select.Option value="IN_PROGRESS">{t('tasks.status.IN_PROGRESS')}</Select.Option>
          <Select.Option value="COMPLETED">{t('tasks.status.COMPLETED')}</Select.Option>
        </Select>

        <Checkbox checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)}>
          Chỉ xem nhiệm vụ quá hạn
        </Checkbox>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <Table columns={columns} dataSource={tasks} rowKey="id" loading={loading} pagination={false} />
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Select, Checkbox, notification } from 'antd';
import { PlusOutlined, AlertOutlined } from '@ant-design/icons';
import { crmService } from '../../services/crmService';
import { Task } from '../../types';

export const TaskListPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [overdueOnly, setOverdueOnly] = useState(false);

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
      notification.success({ message: `Task marked as ${newStatus}` });
      fetchTasks();
    } catch (err: any) {
      notification.error({ message: 'Error', description: err.message });
    }
  };

  const getPriorityTag = (p: string) => {
    switch (p) {
      case 'URGENT': return <Tag color="red">URGENT</Tag>;
      case 'HIGH': return <Tag color="orange">HIGH</Tag>;
      case 'MEDIUM': return <Tag color="blue">MEDIUM</Tag>;
      default: return <Tag color="default">LOW</Tag>;
    }
  };

  const columns = [
    {
      title: 'Done',
      key: 'done',
      width: 60,
      render: (_: any, r: Task) => (
        <Checkbox checked={r.status === 'COMPLETED'} onChange={() => handleStatusToggle(r)} />
      ),
    },
    {
      title: 'Task Title',
      key: 'title',
      render: (_: any, r: Task) => (
        <div>
          <span className={`font-bold ${r.status === 'COMPLETED' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
            {r.title}
          </span>
          {r.isOverdue && (
            <Tag color="red" className="ml-2 animate-pulse">
              <AlertOutlined /> OVERDUE
            </Tag>
          )}
          {r.description && <p className="text-xs text-slate-500 mt-0.5">{r.description}</p>}
        </div>
      ),
    },
    { title: 'Priority', dataIndex: 'priority', key: 'priority', render: (p: string) => getPriorityTag(p) },
    {
      title: 'Due Date',
      dataIndex: 'dueAt',
      key: 'dueAt',
      render: (d: string, r: Task) => (
        <span className={`text-xs font-semibold ${r.isOverdue ? 'text-rose-600' : 'text-slate-700'}`}>
          {new Date(d).toLocaleString('vi-VN')}
        </span>
      ),
    },
    {
      title: 'Assigned To',
      key: 'assignee',
      render: (_: any, r: Task) => r.assignee ? `${r.assignee.firstName} ${r.assignee.lastName}` : 'Unassigned',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => <Tag color={s === 'COMPLETED' ? 'green' : 'orange'}>{s}</Tag>,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tasks Management</h1>
          <p className="text-sm text-slate-500">Action items, follow-ups, and automated reminder tasks</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
        <Select placeholder="Filter Status" className="w-40" allowClear onChange={(v) => setStatusFilter(v)}>
          <Select.Option value="TODO">TODO</Select.Option>
          <Select.Option value="IN_PROGRESS">IN_PROGRESS</Select.Option>
          <Select.Option value="COMPLETED">COMPLETED</Select.Option>
        </Select>

        <Checkbox checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)}>
          Show Overdue Tasks Only
        </Checkbox>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <Table columns={columns} dataSource={tasks} rowKey="id" loading={loading} pagination={false} />
      </div>
    </div>
  );
};

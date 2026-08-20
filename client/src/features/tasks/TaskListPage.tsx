import React, { useState, useEffect } from 'react';
import { useBizNavigate } from '../../hooks/useBizNavigate';
import { Table, Button, Tag, Select, Popconfirm, Modal, Form, Input, DatePicker, Tooltip, notification } from 'antd';
import { PlusOutlined, AlertOutlined, CheckOutlined, EditOutlined, CheckCircleOutlined, UserOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { crmService } from '../../services/crmService';
import { useAuthStore } from '../../stores/authStore';
import { Task, User } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { TableToolbar } from '../../components/common/TableToolbar';


export const TaskListPage: React.FC = () => {
  const navigate = useBizNavigate();
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('TODO,IN_PROGRESS');
  const [presetFilter, setPresetFilter] = useState<string | undefined>('OVERDUE_TODAY');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('MY_TASKS');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [callResultModalVisible, setCallResultModalVisible] = useState(false);
  const [callResultTask, setCallResultTask] = useState<Task | null>(null);

  const [form] = Form.useForm();
  const { t, i18n } = useTranslation();


  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params: any = {
        status: statusFilter && statusFilter !== 'ALL' ? statusFilter : undefined,
        preset: presetFilter || undefined,
      };

      if (assigneeFilter === 'MY_TASKS') {
        if (user?.id) {
          params.assignedTo = user.id;
        }
      } else if (assigneeFilter !== 'ALL') {
        params.assignedTo = assigneeFilter;
      }

      const res: any = await crmService.getTasks(params);
      if (res.success) setTasks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res: any = await crmService.getUsers();
      if (res.success) setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, presetFilter, assigneeFilter, user?.id]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const isCallFollowUpTask = (task: Task) => /^Gọi (lại )?khách hàng/i.test(task?.title?.trim() || '') || /^Gọi /i.test(task?.title?.trim() || '');

  const handleConfirmCompleteTask = async (task: Task, result?: 'BUSY' | 'UNREACHABLE' | 'WRONG_NUMBER') => {
    try {
      await crmService.updateTaskStatus(task.id, 'COMPLETED', result);
      notification.success({
        message: t('tasks.completeSuccessTitle'),
        description: t('tasks.completeSuccessDesc', { title: task.title }),
      });
      setCallResultModalVisible(false);
      setCallResultTask(null);
      fetchTasks();
    } catch (err: any) {
      notification.error({ message: t('common.error'), description: err.message });
    }
  };

  const handleCompleteClick = (task: Task) => {
    if (isCallFollowUpTask(task)) {
      setCallResultTask(task);
      setCallResultModalVisible(true);
      return;
    }
    handleConfirmCompleteTask(task);
  };

  const handleOpenEditModal = (task: Task) => {
    setEditingTask(task);
    form.setFieldsValue({
      title: task.title,
      assignedTo: task.assignedTo ? task.assignedTo.toString() : undefined,
      priority: task.priority || 'MEDIUM',
      status: task.status || 'TODO',
      dueAt: task.dueAt ? dayjs(task.dueAt) : undefined,
      description: task.description || '',
    });
    setEditModalVisible(true);
  };

  const handleSaveEditTask = async (values: any) => {
    if (!editingTask) return;
    try {
      await crmService.updateTask(editingTask.id, {
        ...values,
        dueAt: values.dueAt ? values.dueAt.toISOString() : undefined,
      });
      notification.success({
        message: 'Cập nhật nhiệm vụ thành công!',
        description: `Nhiệm vụ "${values.title}" đã được cập nhật.`,
      });
      setEditModalVisible(false);
      fetchTasks();
    } catch (err: any) {
      notification.error({ message: 'Cập nhật thất bại', description: err.message });
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
      width: 140,
      render: (_: any, r: Task) => {
        if (r.status === 'COMPLETED') {
          return (
            <Tag color="green" className="font-semibold flex items-center gap-1 w-fit">
              <CheckCircleOutlined /> Đã hoàn thành
            </Tag>
          );
        }
        return isCallFollowUpTask(r) ? (
          <Tooltip title={t('tasks.selectCallResultTooltip')}>
            <Button
              type="dashed"
              size="small"
              icon={<CheckOutlined className="text-emerald-600 font-bold" />}
              className="border-emerald-400 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-600 font-medium"
              onClick={() => handleCompleteClick(r)}
            >
              {t('tasks.confirmComplete')}
            </Button>
          </Tooltip>
        ) : (
          <Popconfirm
            title="Xác nhận hoàn thành nhiệm vụ?"
            description={`Bạn có chắc chắn muốn xác nhận hoàn thành công việc "${r.title}"?`}
            onConfirm={() => handleCompleteClick(r)}
            okText="Đồng ý hoàn thành"
            cancelText="Hủy"
            okButtonProps={{ type: 'primary', className: 'bg-emerald-600' }}
          >
            <Tooltip title="Bấm dấu tích để xác nhận hoàn thành">
              <Button
                type="dashed"
                size="small"
                icon={<CheckOutlined className="text-emerald-600 font-bold" />}
                className="border-emerald-400 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-600 font-medium"
              >
                Xác nhận
              </Button>
            </Tooltip>
          </Popconfirm>
        );
      },
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
    {
      title: 'Người thực hiện',
      key: 'assignee',
      render: (_: any, r: any) => {
        if (r.assignee) {
          return (
            <span className="text-xs text-slate-700 font-medium">
              👤 {r.assignee.lastName} {r.assignee.firstName}
            </span>
          );
        }
        return <span className="text-slate-400 text-xs">—</span>;
      },
    },
    {
      title: 'Liên quan đến',
      key: 'related',
      render: (_: any, r: any) => {
        if (r.relatedInfo) {
          const isLead = r.relatedInfo.type?.toUpperCase() === 'LEAD';
          const link = isLead ? `/leads/${r.relatedInfo.id}` : `/customers/${r.relatedInfo.id}`;
          return (
            <Tag
              color={isLead ? 'blue' : 'purple'}
              className="cursor-pointer font-medium hover:opacity-80"
              onClick={() => navigate(link)}
            >
              {isLead ? '👤 Lead' : '🏢 Customer'}: {r.relatedInfo.name || `#${r.relatedInfo.id}`}
            </Tag>
          );
        }
        if (r.relatedType && r.relatedId) {
          const isLead = r.relatedType?.toUpperCase() === 'LEAD';
          return (
            <Tag
              color={isLead ? 'blue' : 'purple'}
              className="cursor-pointer font-medium hover:opacity-80"
              onClick={() => navigate(isLead ? `/leads/${r.relatedId}` : `/customers/${r.relatedId}`)}
            >
              {isLead ? '👤 Lead' : '🏢 Customer'} #{r.relatedId}
            </Tag>
          );
        }
        return <span className="text-slate-400 text-xs">—</span>;
      },
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
        <Tag color={s === 'COMPLETED' ? 'green' : s === 'IN_PROGRESS' ? 'blue' : s === 'CANCELLED' ? 'default' : 'orange'}>
          {s === 'COMPLETED' ? t('tasks.status.COMPLETED') : s === 'IN_PROGRESS' ? t('tasks.status.IN_PROGRESS') : s === 'CANCELLED' ? 'Đã hủy' : t('tasks.status.PENDING')}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      render: (_: any, r: Task) => (
        <Button
          size="small"
          icon={<EditOutlined />}
          onClick={() => handleOpenEditModal(r)}
        >
          Sửa
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('tasks.title')}
        subtitle="Quản lý danh sách công việc, nhắc nhở và theo dõi tiến độ"
      />

      <TableToolbar
        showSearch={false}
        extraLeft={
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Phạm vi:</span>
              <Select
                value={assigneeFilter}
                onChange={(v) => setAssigneeFilter(v)}
                className="w-44 text-xs"
              >
                <Select.Option value="MY_TASKS">👤 Task của tôi</Select.Option>
                <Select.Option value="ALL">👥 Tất cả mọi người</Select.Option>
                {users.map((u) => (
                  <Select.Option key={u.id} value={u.id.toString()}>
                    👤 {u.lastName} {u.firstName}
                  </Select.Option>
                ))}
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">{t('common.status')}:</span>
              <Select
                value={statusFilter}
                className="w-52 text-xs"
                onChange={(v) => setStatusFilter(v)}
              >
                <Select.Option value="TODO,IN_PROGRESS">⚡ Đang thực hiện & Chờ xử lý</Select.Option>
                <Select.Option value="TODO">⌛ {t('tasks.status.PENDING')}</Select.Option>
                <Select.Option value="IN_PROGRESS">🔄 {t('tasks.status.IN_PROGRESS')}</Select.Option>
                <Select.Option value="COMPLETED">✅ {t('tasks.status.COMPLETED')}</Select.Option>
                <Select.Option value="CANCELLED">🚫 Đã hủy</Select.Option>
                <Select.Option value="ALL">🌐 Tất cả trạng thái</Select.Option>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Thời gian:</span>
              <Select
                value={presetFilter}
                onChange={(v) => setPresetFilter(v)}
                placeholder="Tất cả thời gian"
                className="w-56 text-xs"
                allowClear
              >
                <Select.Option value="OVERDUE_TODAY">🔥 Quá hạn & Việc Hôm Nay</Select.Option>
                <Select.Option value="OVERDUE">⚠️ Chỉ Xem Quá Hạn</Select.Option>
                <Select.Option value="TODAY">📅 Việc Hôm Nay</Select.Option>
                <Select.Option value="NEXT_2_DAYS">⏳ Việc trong 2 ngày tới</Select.Option>
              </Select>
            </div>
          </div>
        }
      >
        <div className="text-xs text-slate-500">
          Hiển thị: <strong className="text-indigo-600 font-semibold">{tasks.length}</strong> công việc
        </div>
      </TableToolbar>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <Table columns={columns} dataSource={tasks} rowKey="id" loading={loading} pagination={false} />
      </div>

      {/* Edit Task Modal */}
      <Modal
        title="Chỉnh sửa Nhiệm vụ / Lịch hẹn"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={() => form.submit()}
        width={500}
        okText="Lưu thay đổi"
        cancelText="Hủy"
        okButtonProps={{ className: 'bg-indigo-600' }}
      >
        <Form form={form} layout="vertical" onFinish={handleSaveEditTask}>
          <Form.Item name="title" label="Tên nhiệm vụ" rules={[{ required: true, message: 'Nhập tên nhiệm vụ' }]}>
            <Input placeholder="Ví dụ: Gọi điện chốt hợp đồng" />
          </Form.Item>

          <Form.Item name="assignedTo" label="Sales phụ trách">
            <Select placeholder="Chọn nhân viên phụ trách" allowClear>
              {users.map((u) => (
                <Select.Option key={u.id} value={u.id}>
                  👤 {u.lastName} {u.firstName} ({u.email})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="priority" label="Độ ưu tiên">
              <Select>
                <Select.Option value="LOW">Thấp (Low)</Select.Option>
                <Select.Option value="MEDIUM">Trung bình (Medium)</Select.Option>
                <Select.Option value="HIGH">Cao (High)</Select.Option>
                <Select.Option value="URGENT">Khẩn cấp (Urgent)</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item name="status" label="Trạng thái">
              <Select>
                <Select.Option value="TODO">Chưa thực hiện (TODO)</Select.Option>
                <Select.Option value="IN_PROGRESS">Đang thực hiện</Select.Option>
                <Select.Option value="COMPLETED">Đã hoàn thành</Select.Option>
                <Select.Option value="CANCELLED">Đã hủy</Select.Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item name="dueAt" label="Hạn chót (Ngày & Giờ)" rules={[{ required: true, message: 'Chọn ngày giờ hạn chót' }]}>
            <DatePicker showTime className="w-full" format="DD/MM/YYYY HH:mm" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả / Ghi chú công việc">
            <Input.TextArea rows={3} placeholder="Ghi chú chi tiết công việc..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('tasks.callResultModalTitle')}
        open={callResultModalVisible}
        onCancel={() => { setCallResultModalVisible(false); setCallResultTask(null); }}
        footer={null}
      >
        <div className="flex flex-col gap-3">
          <Button block onClick={() => callResultTask && handleConfirmCompleteTask(callResultTask, 'BUSY')}>
            {t('tasks.callResults.BUSY')}
          </Button>
          <Button block onClick={() => callResultTask && handleConfirmCompleteTask(callResultTask, 'UNREACHABLE')}>
            {t('tasks.callResults.UNREACHABLE')}
          </Button>
          <Button block danger onClick={() => callResultTask && handleConfirmCompleteTask(callResultTask, 'WRONG_NUMBER')}>
            {t('tasks.callResults.WRONG_NUMBER')}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

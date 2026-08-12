import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Tag, Button, Select, Tabs, Modal, Form, Input, DatePicker, notification, Spin } from 'antd';
import { ArrowLeftOutlined, SwapOutlined, PlusOutlined, PhoneOutlined } from '@ant-design/icons';
import { crmService } from '../../services/crmService';
import { Lead } from '../../types';
import { ActivityTimeline } from '../../components/Timeline/ActivityTimeline';
import { LeadConvertModal } from './LeadConvertModal';

export const LeadDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  const [convertModalVisible, setConvertModalVisible] = useState(false);
  const [activityModalVisible, setActivityModalVisible] = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);

  const [activityForm] = Form.useForm();
  const [taskForm] = Form.useForm();

  const fetchLeadDetails = async () => {
    if (!id) return;
    try {
      const res: any = await crmService.getLeadById(id);
      if (res.success) {
        setLead(res.data);
      }
    } catch (err) {
      notification.error({ message: 'Error', description: 'Lead not found' });
      navigate('/leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeadDetails();
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    try {
      await crmService.updateLead(id, { status: newStatus });
      notification.success({ message: 'Status Updated' });
      fetchLeadDetails();
    } catch (err: any) {
      notification.error({ message: 'Update Failed', description: err.message });
    }
  };

  const handleLogActivity = async (values: any) => {
    if (!id) return;
    try {
      await crmService.createActivity({ ...values, relatedType: 'LEAD', relatedId: id });
      notification.success({ message: 'Activity Logged' });
      setActivityModalVisible(false);
      activityForm.resetFields();
      fetchLeadDetails();
    } catch (err: any) {
      notification.error({ message: 'Log Failed', description: err.message });
    }
  };

  const handleCreateTask = async (values: any) => {
    if (!id) return;
    try {
      await crmService.createTask({
        ...values,
        dueAt: values.dueAt.toISOString(),
        relatedType: 'LEAD',
        relatedId: id,
      });
      notification.success({ message: 'Task Created' });
      setTaskModalVisible(false);
      taskForm.resetFields();
      fetchLeadDetails();
    } catch (err: any) {
      notification.error({ message: 'Task Creation Failed', description: err.message });
    }
  };

  if (loading || !lead) {
    return <div className="h-96 flex items-center justify-center"><Spin size="large" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/leads')} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">
                {lead.firstName} {lead.lastName}
              </h1>
              <Tag color="blue">{lead.status}</Tag>
            </div>
            <p className="text-sm text-slate-500">{lead.companyName || 'Individual Prospect'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={lead.status}
            onChange={handleStatusChange}
            className="w-40"
          >
            <Select.Option value="NEW">NEW</Select.Option>
            <Select.Option value="CONTACTED">CONTACTED</Select.Option>
            <Select.Option value="QUALIFIED">QUALIFIED</Select.Option>
            <Select.Option value="UNQUALIFIED">UNQUALIFIED</Select.Option>
            <Select.Option value="LOST">LOST</Select.Option>
          </Select>

          {lead.status !== 'CONVERTED' && (
            <Button
              type="primary"
              icon={<SwapOutlined />}
              className="bg-indigo-600 font-semibold"
              onClick={() => setConvertModalVisible(true)}
            >
              Convert Lead
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details Card */}
        <div className="space-y-6">
          <Card title="Prospect Profile" className="shadow-xs border-slate-200 rounded-xl bg-white">
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-slate-400 font-medium block text-xs">Email</span>
                <span className="text-slate-800 font-semibold">{lead.email || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-xs">Phone</span>
                <span className="text-slate-800 font-semibold">{lead.phone || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-xs">Job Title</span>
                <span className="text-slate-800 font-semibold">{lead.jobTitle || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-xs">Source</span>
                <Tag>{lead.source}</Tag>
              </div>
              <div>
                <span className="text-slate-400 font-medium block text-xs">Owner</span>
                <span className="text-slate-800 font-semibold">
                  {lead.owner ? `${lead.owner.firstName} ${lead.owner.lastName}` : 'Unassigned'}
                </span>
              </div>
              {lead.notes && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-400 font-medium block text-xs">Notes</span>
                  <p className="text-slate-600 text-xs mt-1 whitespace-pre-wrap">{lead.notes}</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Timeline & Tasks */}
        <div className="lg:col-span-2 space-y-6">
          <Card
            className="shadow-xs border-slate-200 rounded-xl bg-white"
            extra={
              <div className="flex gap-2">
                <Button
                  size="small"
                  icon={<PhoneOutlined />}
                  onClick={() => setActivityModalVisible(true)}
                >
                  Log Activity
                </Button>
                <Button
                  size="small"
                  type="primary"
                  icon={<PlusOutlined />}
                  className="bg-indigo-600"
                  onClick={() => setTaskModalVisible(true)}
                >
                  Create Task
                </Button>
              </div>
            }
          >
            <Tabs
              items={[
                {
                  key: 'timeline',
                  label: 'Activity Timeline',
                  children: <ActivityTimeline activities={lead.activities || []} />,
                },
                {
                  key: 'tasks',
                  label: `Tasks (${lead.tasks?.length || 0})`,
                  children: (
                    <div className="space-y-3 py-2">
                      {lead.tasks && lead.tasks.length > 0 ? (
                        lead.tasks.map((t) => (
                          <div key={t.id} className="p-3 border border-slate-100 rounded-lg flex items-center justify-between">
                            <div>
                              <div className="font-bold text-slate-800 text-sm">{t.title}</div>
                              <div className="text-xs text-slate-400">
                                Due: {new Date(t.dueAt).toLocaleString('vi-VN')} | Priority: {t.priority}
                              </div>
                            </div>
                            <Tag color={t.status === 'COMPLETED' ? 'green' : 'orange'}>{t.status}</Tag>
                          </div>
                        ))
                      ) : (
                        <div className="text-slate-400 text-xs text-center py-6">No tasks scheduled</div>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </div>
      </div>

      {/* Convert Lead Modal */}
      <LeadConvertModal
        visible={convertModalVisible}
        lead={lead}
        onCancel={() => setConvertModalVisible(false)}
        onSuccess={() => {
          setConvertModalVisible(false);
          fetchLeadDetails();
        }}
      />

      {/* Log Activity Modal */}
      <Modal
        title="Log Activity"
        open={activityModalVisible}
        onCancel={() => setActivityModalVisible(false)}
        onOk={() => activityForm.submit()}
      >
        <Form form={activityForm} layout="vertical" onFinish={handleLogActivity}>
          <Form.Item name="type" label="Activity Type" initialValue="CALL">
            <Select>
              <Select.Option value="CALL">Call</Select.Option>
              <Select.Option value="EMAIL">Email</Select.Option>
              <Select.Option value="MEETING">Meeting</Select.Option>
              <Select.Option value="DEMO">Demo</Select.Option>
              <Select.Option value="NOTE">Note</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
            <Input placeholder="Call summary" />
          </Form.Item>

          <Form.Item name="description" label="Notes">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Task Modal */}
      <Modal
        title="Create Follow-up Task"
        open={taskModalVisible}
        onCancel={() => setTaskModalVisible(false)}
        onOk={() => taskForm.submit()}
      >
        <Form form={taskForm} layout="vertical" onFinish={handleCreateTask}>
          <Form.Item name="title" label="Task Title" rules={[{ required: true }]}>
            <Input placeholder="Call back client" />
          </Form.Item>

          <Form.Item name="priority" label="Priority" initialValue="HIGH">
            <Select>
              <Select.Option value="LOW">LOW</Select.Option>
              <Select.Option value="MEDIUM">MEDIUM</Select.Option>
              <Select.Option value="HIGH">HIGH</Select.Option>
              <Select.Option value="URGENT">URGENT</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="dueAt" label="Due Date & Time" rules={[{ required: true }]}>
            <DatePicker showTime className="w-full" />
          </Form.Item>

          <Form.Item name="description" label="Task Instructions">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

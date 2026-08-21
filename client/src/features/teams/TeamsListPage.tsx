import React, { useState, useEffect } from 'react';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { PageHeader } from '../../components/common/PageHeader';


import { Table, Card, Button, Input, Tag, Space, Avatar, Modal, Form, Select, message, Progress, Statistic } from 'antd';
import {
  ClusterOutlined,
  PlusOutlined,
  UserOutlined,
  TrophyOutlined,
  ReloadOutlined,
  CrownOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { crmService } from '../../services/crmService';

const { Option } = Select;

export const TeamsListPage: React.FC = () => {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const res: any = await crmService.getTeams();
      if (res.success) {
        setTeams(res.data);
      }
    } catch (err) {
      message.error('Không thể tải danh sách Đội nhóm (Teams)');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleCreateTeam = (values: any) => {
    const newTeam = {
      id: `team-${Date.now()}`,
      name: values.name,
      code: values.code || 'TEAM_CUSTOM',
      leaderName: values.leaderName || 'Chưa chỉ định',
      memberCount: values.memberCount || 1,
      targetRevenue: Number(values.targetRevenue) || 500000000,
      achievedRevenue: 0,
      leadCount: 0,
      description: values.description || 'Đội kinh doanh mới thành lập',
    };
    setTeams([newTeam, ...teams]);
    message.success('Đã thành lập Teams mới thành công!');
    setIsModalOpen(false);
    form.resetFields();
  };

  const columns = [
    {
      title: 'Tên Đội / Phòng ban',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, r: any) => (
        <div>
          <div className="font-bold text-slate-900 text-base flex items-center gap-2">
            <ClusterOutlined className="text-indigo-600" /> {text}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{r.description}</div>
        </div>
      ),
    },
    {
      title: 'Mã Team',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => <Tag color="blue" className="font-mono">{code}</Tag>,
    },
    {
      title: 'Trưởng team (Lead)',
      dataIndex: 'leaderName',
      key: 'leaderName',
      render: (leader: string) => (
        <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-xs">
          <CrownOutlined className="text-amber-500 text-sm" /> {leader}
        </div>
      ),
    },
    {
      title: 'Thành viên',
      dataIndex: 'memberCount',
      key: 'memberCount',
      render: (count: number) => (
        <div className="flex items-center gap-1 text-slate-700 font-medium text-xs">
          <TeamOutlined className="text-indigo-500" /> {count} nhân sự
        </div>
      ),
    },
    {
      title: 'KPI Doanh số / Mục tiêu',
      key: 'revenue',
      render: (_: any, r: any) => {
        const percent = Math.round((r.achievedRevenue / r.targetRevenue) * 100);
        return (
          <div className="w-48 space-y-1">
            <div className="flex justify-between text-[11px] font-semibold text-slate-600">
              <span>{(r.achievedRevenue / 1000000).toLocaleString('vi-VN')}M</span>
              <span>{(r.targetRevenue / 1000000).toLocaleString('vi-VN')}M VND</span>
            </div>
            <Progress percent={percent} strokeColor="#6366f1" size="small" />
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <ClusterOutlined className="text-indigo-600" /> Quản lý Teams & Phòng Ban
          </span>
        }
        subtitle="Cơ cấu đội nhóm bán hàng, giao chỉ tiêu KPI phòng ban và quản lý người dẫn dắt (Team Leader)"
        extra={
          <>
            <Button icon={<ReloadOutlined className="text-slate-600 text-xs" />} onClick={fetchTeams} loading={loading} className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg h-8 px-3 flex items-center gap-1.5 shadow-2xs hover:border-slate-300">
              Làm mới
            </Button>
            <PrimaryButton
              icon={<PlusOutlined />}
              onClick={() => setIsModalOpen(true)}
            >
              Thêm Teams Mới
            </PrimaryButton>
          </>
        }
      />

      {/* Grid of Team Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teams.map((team) => {
          const percent = Math.round((team.achievedRevenue / team.targetRevenue) * 100);

          return (
            <Card key={team.id} className="shadow-xs border-slate-200 rounded-xl hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                    {team.name}
                  </h3>
                  <p className="text-xs text-slate-500">{team.description}</p>
                </div>
                <Tag color="purple" className="font-mono">{team.code}</Tag>
              </div>

              <div className="grid grid-cols-3 gap-2 my-4 py-3 bg-slate-50 rounded-lg text-center">
                <div>
                  <div className="text-[11px] text-slate-400 font-medium uppercase">Trưởng nhóm</div>
                  <div className="font-bold text-slate-800 text-xs truncate mt-0.5">👑 {team.leaderName}</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400 font-medium uppercase">Nhân sự</div>
                  <div className="font-bold text-indigo-600 text-xs mt-0.5">👥 {team.memberCount} thành viên</div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400 font-medium uppercase">Lead đang giữ</div>
                  <div className="font-bold text-emerald-600 text-xs mt-0.5">🎯 {team.leadCount} Lead</div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                  <span>Tiến độ KPI Doanh số:</span>
                  <span className="text-indigo-700 font-bold">{percent}%</span>
                </div>
                <Progress percent={percent} strokeColor={{ '0%': '#6366f1', '100%': '#10b981' }} />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Table view */}
      <Card title="Danh sách chi tiết Teams" className="shadow-xs border-slate-200 rounded-xl">
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={teams}
          pagination={false}
          className="overflow-x-auto"
        />
      </Card>

      {/* Create Team Modal */}
      <Modal
        title="Thành Lập Teams / Phòng Ban Mới"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreateTeam} className="mt-4">
          <Form.Item name="name" label="Tên Đội / Phòng Bán Hàng" rules={[{ required: true, message: 'Vui lòng nhập tên team' }]}>
            <Input placeholder="Ví dụ: Đội Sales Miền Bắc - Team 2" />
          </Form.Item>
          <Form.Item name="code" label="Mã nhận diện Team" rules={[{ required: true, message: 'Vui lòng nhập mã team' }]}>
            <Input placeholder="SALES_NORTH_2" />
          </Form.Item>
          <Form.Item name="leaderName" label="Trưởng Nhóm (Team Lead)">
            <Input placeholder="Nguyễn Văn Quản Lý" />
          </Form.Item>
          <Form.Item name="targetRevenue" label="Mục tiêu doanh số (VND)" initialValue="500000000">
            <Input type="number" placeholder="500000000" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả chức năng">
            <Input.TextArea rows={2} placeholder="Chuyên phụ trách tệp khách hàng doanh nghiệp vừa và nhỏ..." />
          </Form.Item>

          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit">
              Tạo Teams
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

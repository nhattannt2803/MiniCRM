import React, { useState } from 'react';
import { Button, Avatar, Modal, Form, DatePicker, TimePicker, Input, Select, message, Tooltip, Drawer } from 'antd';
import {
  TeamOutlined,
  TrophyOutlined,
  WarningOutlined,
  CalendarOutlined,
  UserDeleteOutlined,
  EyeOutlined,
  RightOutlined,
  ClockCircleOutlined,
  UserOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  FilterOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

interface SaleRep {
  id: string;
  name: string;
  avatar?: string;
  initials: string;
  role: string;
  activeLeads: number;
  overdueLeads: number;
  winRate: number;
  status: 'QUATA' | 'CANHOTRO' | 'BINHTHUONG';
  alertBadge?: string;
  alertType?: 'danger' | 'warning';
}

const INITIAL_REPS: SaleRep[] = [
  {
    id: '1',
    name: 'Sarah Jenkins',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SarahJenkins',
    initials: 'SJ',
    role: 'Sale A',
    activeLeads: 245,
    overdueLeads: 12,
    winRate: 14.2,
    status: 'QUATA',
    alertBadge: '12 Overdue Leads',
    alertType: 'danger',
  },
  {
    id: '2',
    name: 'Michael Chen',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=MichaelChen',
    initials: 'MC',
    role: 'Sale B',
    activeLeads: 182,
    overdueLeads: 0,
    winRate: 11.0,
    status: 'CANHOTRO',
    alertBadge: 'Win Rate drop to 11%',
    alertType: 'warning',
  },
  {
    id: '3',
    name: 'Lê Văn C',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=LeVanC',
    initials: 'LC',
    role: 'Senior Sale',
    activeLeads: 312,
    overdueLeads: 0,
    winRate: 22.5,
    status: 'BINHTHUONG',
  },
  {
    id: '4',
    name: 'Nguyễn Văn A',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NguyenVanA',
    initials: 'NA',
    role: 'Sale Rep',
    activeLeads: 298,
    overdueLeads: 0,
    winRate: 19.8,
    status: 'BINHTHUONG',
  },
  {
    id: '5',
    name: 'Trần Thị B',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TranThiB',
    initials: 'TB',
    role: 'Sale Rep',
    activeLeads: 275,
    overdueLeads: 0,
    winRate: 21.1,
    status: 'BINHTHUONG',
  },
];

export const TeamLeaderOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [reps, setReps] = useState<SaleRep[]>(INITIAL_REPS);

  // Modal States
  const [coachingModalOpen, setCoachingModalOpen] = useState(false);
  const [selectedRep, setSelectedRep] = useState<SaleRep | null>(null);
  const [coachingForm] = Form.useForm();

  const [reallocateModalOpen, setReallocateModalOpen] = useState(false);
  const [reallocateForm] = Form.useForm();

  const [pipelineDrawerOpen, setPipelineDrawerOpen] = useState(false);

  // Handlers
  const handleOpenCoachingModal = (rep: SaleRep) => {
    setSelectedRep(rep);
    coachingForm.resetFields();
    setCoachingModalOpen(true);
  };

  const handleCoachingSubmit = (values: any) => {
    message.success(`Đã lên lịch coaching 1-on-1 thành công với ${selectedRep?.name}!`);
    setCoachingModalOpen(false);
  };

  const handleOpenReallocateModal = (rep: SaleRep) => {
    setSelectedRep(rep);
    reallocateForm.resetFields();
    setReallocateModalOpen(true);
  };

  const handleReallocateSubmit = (values: any) => {
    if (!selectedRep) return;
    const targetRep = reps.find((r) => r.id === values.targetRepId);
    
    // Update local reps state to reflect lead withdrawal
    setReps((prev) =>
      prev.map((r) => {
        if (r.id === selectedRep.id) {
          return {
            ...r,
            activeLeads: Math.max(0, r.activeLeads - r.overdueLeads),
            overdueLeads: 0,
            status: 'BINHTHUONG',
            alertBadge: undefined,
          };
        }
        if (targetRep && r.id === targetRep.id) {
          return {
            ...r,
            activeLeads: r.activeLeads + selectedRep.overdueLeads,
          };
        }
        return r;
      })
    );

    message.success(
      `Đã thu hồi ${selectedRep.overdueLeads} lead quá hạn từ ${selectedRep.name} ${
        targetRep ? `và chuyển giao cho ${targetRep.name}` : ''
      }!`
    );
    setReallocateModalOpen(false);
  };

  const handleOpenPipelineDrawer = (rep: SaleRep) => {
    setSelectedRep(rep);
    setPipelineDrawerOpen(true);
  };

  // Critical bottleneck alerts list
  const alertReps = reps.filter((r) => r.alertBadge);

  return (
    <div className="space-y-6 pb-8">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Tổng quan Đội ngũ (Team Leader)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi hiệu suất từng cá nhân, nhận biết nghẽn nhân sự và điều phối lead kịp thời.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate('/leads/allocation')}
            icon={<FilterOutlined />}
            className="bg-white border-slate-300 font-semibold text-slate-700 hover:border-indigo-500 rounded-lg h-9 shadow-xs"
          >
            Phân bổ Lead
          </Button>
          <Button
            type="primary"
            onClick={() => navigate('/staff')}
            className="bg-indigo-600 hover:bg-indigo-700 font-semibold rounded-lg h-9 shadow-xs"
          >
            Quản lý Nhân viên
          </Button>
        </div>
      </div>

      {/* 1. Top 3 Metric KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: TOTAL ACTIVE LEADS */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              TOTAL ACTIVE LEADS
            </span>
            <div className="text-3xl font-black text-slate-900 tracking-tight">1,432</div>
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full w-fit">
              <ArrowUpOutlined /> +12% vs last week
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-xl shrink-0">
            <TeamOutlined />
          </div>
        </div>

        {/* Card 2: TEAM WIN RATE */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              TEAM WIN RATE
            </span>
            <div className="text-3xl font-black text-slate-900 tracking-tight">18.5%</div>
            <div className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full w-fit">
              <ArrowDownOutlined /> -2.1% vs target
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-xl shrink-0">
            <TrophyOutlined />
          </div>
        </div>

        {/* Card 3: TOTAL OVERDUE */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              TOTAL OVERDUE
            </span>
            <div className="text-3xl font-black text-red-600 tracking-tight">42</div>
            <div className="text-xs font-semibold text-slate-500">
              Across 5 team members
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 text-xl shrink-0">
            <WarningOutlined />
          </div>
        </div>
      </div>

      {/* 2. Section: Bảng nghẽn nhân sự */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Bảng nghẽn nhân sự
              </h2>
              <span className="bg-red-600 text-white font-black text-[11px] px-2.5 py-0.5 rounded-full shadow-xs">
                {alertReps.length} Action Required
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Reps with critical performance alerts.
            </p>
          </div>
          <Button
            type="link"
            onClick={() => navigate('/staff')}
            className="text-indigo-600 font-semibold text-xs flex items-center gap-1 p-0 hover:underline shrink-0"
          >
            View full team <RightOutlined className="text-[10px]" />
          </Button>
        </div>

        {/* Reps Alert Cards Container */}
        <div className="space-y-3">
          {alertReps.length === 0 ? (
            <div className="py-6 text-center text-slate-500 text-sm">
              <CheckCircleOutlined className="text-emerald-500 text-2xl mb-2" />
              <div>Không có nhân sự nào gặp cảnh báo hiệu suất!</div>
            </div>
          ) : (
            alertReps.map((rep) => (
              <div
                key={rep.id}
                className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:bg-slate-50"
              >
                {/* Rep Profile Info */}
                <div className="flex items-center gap-3">
                  <Avatar
                    src={rep.avatar}
                    size={46}
                    className="border-2 border-white shadow-2xs shrink-0"
                  >
                    {rep.initials}
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-base">{rep.name}</span>
                      <span className="text-xs text-slate-500 font-medium">({rep.role})</span>
                    </div>
                    {/* Alert Badge */}
                    <div className="mt-1">
                      {rep.alertType === 'danger' ? (
                        <span className="inline-flex items-center gap-1 bg-red-100/90 text-red-700 border border-red-200 text-xs font-semibold px-2.5 py-0.5 rounded-md">
                          <ClockCircleOutlined className="text-red-600 text-xs" /> {rep.alertBadge}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-amber-100/90 text-amber-800 border border-amber-200 text-xs font-semibold px-2.5 py-0.5 rounded-md">
                          <ArrowDownOutlined className="text-amber-700 text-xs" /> {rep.alertBadge}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons on Right */}
                <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0">
                  <Button
                    icon={<CalendarOutlined />}
                    onClick={() => handleOpenCoachingModal(rep)}
                    className="bg-white border-slate-300 hover:border-slate-400 text-slate-700 font-semibold rounded-lg text-xs h-9 px-3.5 shadow-2xs"
                  >
                    Lên lịch Coaching {rep.alertType === 'warning' ? '1-on-1' : ''}
                  </Button>

                  {rep.overdueLeads > 0 ? (
                    <Button
                      type="primary"
                      icon={<UserDeleteOutlined />}
                      onClick={() => handleOpenReallocateModal(rep)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs h-9 px-4 shadow-xs"
                    >
                      Thu hồi Lead
                    </Button>
                  ) : (
                    <Button
                      icon={<EyeOutlined />}
                      onClick={() => handleOpenPipelineDrawer(rep)}
                      className="border-blue-500 text-blue-600 hover:bg-blue-50 font-semibold rounded-lg text-xs h-9 px-3.5"
                    >
                      Xem Pipeline
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. Section: Danh sách Đội ngũ Sale */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Danh sách Đội ngũ Sale
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tổng quan chi tiết hiệu suất từng cá nhân.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-5">NHÂN VIÊN</th>
                <th className="py-3.5 px-5">SỐ LEAD ĐANG GIỮ</th>
                <th className="py-3.5 px-5">LEAD QUÁ HẠN</th>
                <th className="py-3.5 px-5">TỈ LỆ THẮNG</th>
                <th className="py-3.5 px-5 text-right">TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
              {reps.map((rep) => (
                <tr key={rep.id} className="hover:bg-slate-50/60 transition-colors">
                  {/* Column 1: NHÂN VIÊN */}
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <Avatar src={rep.avatar} size={36} className="shrink-0">
                        {rep.initials}
                      </Avatar>
                      <div>
                        <div className="font-bold text-slate-900">{rep.name}</div>
                        <div className="text-xs text-slate-400 font-normal">{rep.role}</div>
                      </div>
                    </div>
                  </td>

                  {/* Column 2: SỐ LEAD ĐANG GIỮ */}
                  <td className="py-3.5 px-5 font-semibold text-slate-900">
                    {rep.activeLeads}
                  </td>

                  {/* Column 3: LEAD QUÁ HẠN */}
                  <td className="py-3.5 px-5">
                    {rep.overdueLeads > 0 ? (
                      <span className="font-extrabold text-red-600 text-base">
                        {rep.overdueLeads}
                      </span>
                    ) : (
                      <span className="text-slate-900 font-semibold">0</span>
                    )}
                  </td>

                  {/* Column 4: TỈ LỆ THẮNG */}
                  <td className="py-3.5 px-5 font-semibold text-slate-900">
                    {rep.winRate}%
                  </td>

                  {/* Column 5: TRẠNG THÁI */}
                  <td className="py-3.5 px-5 text-right">
                    {rep.status === 'QUATA' && (
                      <span className="inline-block bg-red-100/80 text-red-700 border border-red-200 text-xs font-bold px-3 py-0.5 rounded-full">
                        Quá tải
                      </span>
                    )}
                    {rep.status === 'CANHOTRO' && (
                      <span className="inline-block bg-amber-100/80 text-amber-800 border border-amber-200 text-xs font-bold px-3 py-0.5 rounded-full">
                        Cần hỗ trợ
                      </span>
                    )}
                    {rep.status === 'BINHTHUONG' && (
                      <span className="inline-block bg-emerald-100/80 text-emerald-800 border border-emerald-200 text-xs font-bold px-3 py-0.5 rounded-full">
                        Bình thường
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Lên lịch Coaching */}
      <Modal
        title={
          <div className="flex items-center gap-2 font-bold text-slate-900 text-base">
            <CalendarOutlined className="text-indigo-600" />
            <span>Lên lịch Coaching với {selectedRep?.name}</span>
          </div>
        }
        open={coachingModalOpen}
        onCancel={() => setCoachingModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={coachingForm} layout="vertical" onFinish={handleCoachingSubmit} className="pt-3 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="date"
              label="Ngày làm việc"
              rules={[{ required: true, message: 'Vui lòng chọn ngày!' }]}
            >
              <DatePicker className="w-full rounded-lg" format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item
              name="time"
              label="Giờ bắt đầu"
              rules={[{ required: true, message: 'Vui lòng chọn giờ!' }]}
            >
              <TimePicker className="w-full rounded-lg" format="HH:mm" />
            </Form.Item>
          </div>

          <Form.Item
            name="topic"
            label="Chủ đề Coaching 1-on-1"
            initialValue="Review pipeline & Xử lý lead quá hạn"
            rules={[{ required: true, message: 'Nhập chủ đề cuộc họp' }]}
          >
            <Input className="rounded-lg" />
          </Form.Item>

          <Form.Item name="notes" label="Ghi chú nội dung">
            <Input.TextArea
              rows={3}
              placeholder="Nhập mục tiêu bài coaching hoặc câu hỏi cho nhân viên..."
              className="rounded-lg"
            />
          </Form.Item>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button onClick={() => setCoachingModalOpen(false)} className="rounded-lg font-medium">
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" className="bg-indigo-600 rounded-lg font-semibold">
              Xác nhận lên lịch
            </Button>
          </div>
        </Form>
      </Modal>

      {/* MODAL 2: Thu hồi Lead */}
      <Modal
        title={
          <div className="flex items-center gap-2 font-bold text-red-600 text-base">
            <UserDeleteOutlined />
            <span>Thu hồi Lead quá hạn từ {selectedRep?.name}</span>
          </div>
        }
        open={reallocateModalOpen}
        onCancel={() => setReallocateModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={reallocateForm} layout="vertical" onFinish={handleReallocateSubmit} className="pt-3 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800 font-medium">
            <strong>Cảnh báo:</strong> {selectedRep?.name} đang có <strong>{selectedRep?.overdueLeads} lead quá hạn</strong> tương tác. Việc thu hồi sẽ chuyển giao các lead này sang nhân sự khác để kịp thời chăm sóc.
          </div>

          <Form.Item
            name="targetRepId"
            label="Chọn nhân viên tiếp nhận Lead mới"
            rules={[{ required: true, message: 'Vui lòng chọn nhân viên tiếp nhận!' }]}
          >
            <Select
              placeholder="Chọn nhân viên Sale..."
              className="rounded-lg"
              options={reps
                .filter((r) => r.id !== selectedRep?.id)
                .map((r) => ({
                  value: r.id,
                  label: `${r.name} (${r.activeLeads} leads đang giữ - Win rate ${r.winRate}%)`,
                }))}
            />
          </Form.Item>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button onClick={() => setReallocateModalOpen(false)} className="rounded-lg font-medium">
              Hủy
            </Button>
            <Button type="primary" danger htmlType="submit" className="bg-red-600 font-bold rounded-lg">
              Thu hồi & Phân bổ ngay
            </Button>
          </div>
        </Form>
      </Modal>

      {/* DRAWER: Xem Pipeline Cá Nhân */}
      <Drawer
        title={
          <div className="flex items-center gap-2 font-bold text-slate-900 text-base">
            <EyeOutlined className="text-blue-600" />
            <span>Pipeline Chi Tiết: {selectedRep?.name}</span>
          </div>
        }
        width={480}
        open={pipelineDrawerOpen}
        onClose={() => setPipelineDrawerOpen(false)}
      >
        {selectedRep && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <Avatar src={selectedRep.avatar} size={54}>
                {selectedRep.initials}
              </Avatar>
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">{selectedRep.name}</h3>
                <p className="text-xs text-slate-500 font-medium">{selectedRep.role}</p>
                <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-indigo-600">
                  <span>Tỉ lệ thắng: {selectedRep.winRate}%</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 text-sm">Phân bổ Lead theo Giai đoạn</h4>
              <div className="space-y-2 text-xs font-semibold">
                <div className="flex items-center justify-between p-3 bg-blue-50 text-blue-900 rounded-lg">
                  <span>Mới nhận (New)</span>
                  <span className="font-black text-sm">45 leads</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-amber-50 text-amber-900 rounded-lg">
                  <span>Đang liên hệ & Demo</span>
                  <span className="font-black text-sm">92 leads</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-indigo-50 text-indigo-900 rounded-lg">
                  <span>Gửi báo giá & Đàm phán</span>
                  <span className="font-black text-sm">35 leads</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-emerald-50 text-emerald-900 rounded-lg">
                  <span>Chốt thành công (Won)</span>
                  <span className="font-black text-sm">10 deals</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <Button
                type="primary"
                onClick={() => {
                  setPipelineDrawerOpen(false);
                  navigate('/opportunities');
                }}
                className="w-full bg-indigo-600 font-bold rounded-lg h-10"
              >
                Mở Kanban Pipeline Tổng
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

import React, { useState } from 'react';
import { Button, Avatar, Modal, Form, DatePicker, TimePicker, Input, Select, InputNumber, message, Drawer, Tooltip } from 'antd';
import {
  WalletOutlined,
  PieChartOutlined,
  HourglassOutlined,
  FilterOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  WarningOutlined,
  VideoCameraOutlined,
  EditOutlined,
  EyeOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

interface TeamHealth {
  id: string;
  letter: string;
  name: string;
  leader: string;
  conversionRate: number;
  conversionTrend: 'up' | 'down';
  conversionSubtext?: string;
  salesCycleDays: number;
  salesCycleSubtext?: string;
  status: 'ONDINH' | 'BAODONG' | 'CANCHUY';
  badgeColor: string;
  avatarBg: string;
  hasAlertIcon?: boolean;
  activeMembersCount: number;
  monthlyRevenue: string;
}

const INITIAL_TEAMS: TeamHealth[] = [
  {
    id: 'team-a',
    letter: 'A',
    name: 'Team Alpha',
    leader: 'Sarah Jenkins',
    conversionRate: 22.4,
    conversionTrend: 'up',
    salesCycleDays: 28,
    status: 'ONDINH',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    avatarBg: 'bg-blue-100 text-blue-700',
    activeMembersCount: 6,
    monthlyRevenue: '$950K',
  },
  {
    id: 'team-b',
    letter: 'B',
    name: 'Team Bravo',
    leader: 'Michael Chang',
    conversionRate: 12.1,
    conversionTrend: 'down',
    conversionSubtext: '-15% so với tháng trước',
    salesCycleDays: 30,
    status: 'BAODONG',
    badgeColor: 'bg-red-100 text-red-800 border-red-200',
    avatarBg: 'bg-red-100 text-red-700',
    hasAlertIcon: true,
    activeMembersCount: 5,
    monthlyRevenue: '$620K',
  },
  {
    id: 'team-c',
    letter: 'C',
    name: 'Team Charlie',
    leader: "David O'Connor",
    conversionRate: 19.8,
    conversionTrend: 'up',
    salesCycleDays: 45,
    salesCycleSubtext: '+10 ngày so với TB',
    status: 'CANCHUY',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    avatarBg: 'bg-amber-100 text-amber-700',
    activeMembersCount: 7,
    monthlyRevenue: '$830K',
  },
];

export const SaleManagerOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<TeamHealth[]>(INITIAL_TEAMS);
  const [selectedTeam, setSelectedTeam] = useState<TeamHealth | null>(null);

  // Modals & Drawer state
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [emergencyForm] = Form.useForm();

  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [targetForm] = Form.useForm();

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);

  // Handlers
  const handleOpenEmergencyModal = (team: TeamHealth) => {
    setSelectedTeam(team);
    emergencyForm.resetFields();
    setEmergencyModalOpen(true);
  };

  const handleEmergencySubmit = (values: any) => {
    message.success(`Đã phát thư mời họp khẩn online cho ${selectedTeam?.name}!`);
    setEmergencyModalOpen(false);
  };

  const handleOpenTargetModal = (team: TeamHealth) => {
    setSelectedTeam(team);
    targetForm.setFieldsValue({
      conversionTarget: team.conversionRate,
      salesCycleTarget: team.salesCycleDays,
    });
    setTargetModalOpen(true);
  };

  const handleTargetSubmit = (values: any) => {
    if (!selectedTeam) return;
    setTeams((prev) =>
      prev.map((t) =>
        t.id === selectedTeam.id
          ? {
              ...t,
              conversionRate: values.conversionTarget || t.conversionRate,
              salesCycleDays: values.salesCycleTarget || t.salesCycleDays,
              status: 'ONDINH',
              badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
              hasAlertIcon: false,
              conversionSubtext: undefined,
            }
          : t
      )
    );
    message.success(`Đã cập nhật chỉ số KPI Target mới cho ${selectedTeam.name}!`);
    setTargetModalOpen(false);
  };

  const handleOpenDetailDrawer = (team: TeamHealth) => {
    setSelectedTeam(team);
    setDetailDrawerOpen(true);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* 1. Header & Subtitle */}
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
          Sức khỏe Toàn Đội ngũ (Regional Manager Dashboard)
        </h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">
          Tổng quan sức khỏe các Team và xử lý điểm nghẽn hệ thống.
        </p>
      </div>

      {/* 2. Top 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: TOTAL REVENUE */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs relative overflow-hidden flex flex-col justify-between h-36">
          {/* Watermark Illustration */}
          <div className="absolute -right-3 -bottom-3 opacity-15 pointer-events-none text-slate-400">
            <svg width="120" height="90" viewBox="0 0 100 70" fill="currentColor">
              <rect x="5" y="10" width="90" height="50" rx="8" stroke="currentColor" strokeWidth="4" fill="none" />
              <circle cx="50" cy="35" r="14" stroke="currentColor" strokeWidth="4" fill="none" />
              <circle cx="20" cy="35" r="5" fill="currentColor" />
              <circle cx="80" cy="35" r="5" fill="currentColor" />
            </svg>
          </div>

          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-base shrink-0">
                <WalletOutlined />
              </div>
              <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                TOTAL REVENUE
              </span>
            </div>
          </div>

          <div className="z-10 flex items-baseline gap-3">
            <div className="text-3xl font-black text-slate-900 tracking-tight">$2.4M</div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100/90 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <ArrowUpOutlined className="text-[10px]" /> 12%
            </span>
          </div>
        </div>

        {/* Card 2: AVG. CONVERSION RATE */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs relative overflow-hidden flex flex-col justify-between h-36">
          {/* Watermark Illustration */}
          <div className="absolute -right-2 -bottom-2 opacity-15 pointer-events-none text-slate-400">
            <svg width="100" height="100" viewBox="0 0 100 100" fill="currentColor">
              <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="6" fill="none" />
              <path d="M 50 10 A 40 40 0 0 1 90 50 L 50 50 Z" fill="currentColor" />
            </svg>
          </div>

          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-base shrink-0">
                <PieChartOutlined />
              </div>
              <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                AVG. CONVERSION RATE
              </span>
            </div>
          </div>

          <div className="z-10 flex items-baseline gap-3">
            <div className="text-3xl font-black text-slate-900 tracking-tight">18.5%</div>
            <span className="text-xs font-bold text-red-700 bg-red-100/90 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <ArrowDownOutlined className="text-[10px]" /> 2.1%
            </span>
          </div>
        </div>

        {/* Card 3: AVG. SALES CYCLE */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs relative overflow-hidden flex flex-col justify-between h-36">
          {/* Watermark Illustration */}
          <div className="absolute -right-2 -bottom-2 opacity-15 pointer-events-none text-slate-400">
            <svg width="90" height="90" viewBox="0 0 100 100" fill="currentColor">
              <circle cx="50" cy="55" r="35" stroke="currentColor" strokeWidth="6" fill="none" />
              <line x1="50" y1="20" x2="50" y2="10" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
              <line x1="50" y1="55" x2="50" y2="35" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
            </svg>
          </div>

          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-base shrink-0">
                <HourglassOutlined />
              </div>
              <span className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                AVG. SALES CYCLE
              </span>
            </div>
          </div>

          <div className="z-10 flex items-baseline gap-3">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              32 <span className="text-lg font-bold text-slate-700">days</span>
            </div>
            <span className="text-xs font-bold text-amber-800 bg-amber-100/80 border border-amber-200 px-2 py-0.5 rounded-full">
              → 0%
            </span>
          </div>
        </div>
      </div>

      {/* 3. Section: So sánh Sức khỏe các Team */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            So sánh Sức khỏe các Team
          </h2>
          <Button
            icon={<FilterOutlined />}
            className="bg-white border-slate-300 text-slate-700 font-semibold text-xs rounded-lg h-8 flex items-center gap-1 shadow-2xs hover:border-indigo-500"
          >
            Lọc
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-5">TÊN TEAM / LEAD</th>
                <th className="py-3.5 px-5">CONVERSION RATE</th>
                <th className="py-3.5 px-5">SALES CYCLE</th>
                <th className="py-3.5 px-5">TRẠNG THÁI</th>
                <th className="py-3.5 px-5 text-right">HÀNH ĐỘNG</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
              {teams.map((team) => (
                <tr key={team.id} className="hover:bg-slate-50/60 transition-colors">
                  {/* Column 1: TÊN TEAM / LEAD */}
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl ${team.avatarBg} font-black text-base flex items-center justify-center shrink-0 border border-black/5`}
                      >
                        {team.letter}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-base">{team.name}</span>
                          {team.hasAlertIcon && (
                            <WarningOutlined className="text-red-600 text-base" />
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-normal">
                          Lead: <span className="font-semibold text-slate-700">{team.leader}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Column 2: CONVERSION RATE */}
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-black text-base ${
                          team.conversionTrend === 'down' ? 'text-red-600' : 'text-slate-900'
                        }`}
                      >
                        {team.conversionRate}%
                      </span>
                      {team.conversionTrend === 'up' ? (
                        <ArrowUpOutlined className="text-emerald-600 text-xs font-bold" />
                      ) : (
                        <ArrowDownOutlined className="text-red-600 text-xs font-bold" />
                      )}
                    </div>
                    {team.conversionSubtext && (
                      <div className="text-[11px] font-semibold text-red-600 mt-0.5">
                        {team.conversionSubtext}
                      </div>
                    )}
                  </td>

                  {/* Column 3: SALES CYCLE */}
                  <td className="py-4 px-5">
                    <div className={`font-bold text-slate-900 ${team.salesCycleSubtext ? 'text-amber-800' : ''}`}>
                      {team.salesCycleDays} ngày
                    </div>
                    {team.salesCycleSubtext && (
                      <div className="text-[11px] font-semibold text-amber-800 mt-0.5">
                        {team.salesCycleSubtext}
                      </div>
                    )}
                  </td>

                  {/* Column 4: TRẠNG THÁI */}
                  <td className="py-4 px-5">
                    <span
                      className={`inline-flex items-center gap-1.5 border ${team.badgeColor} text-xs font-bold px-3 py-1 rounded-full`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          team.status === 'ONDINH'
                            ? 'bg-emerald-600'
                            : team.status === 'BAODONG'
                            ? 'bg-red-600'
                            : 'bg-amber-600'
                        }`}
                      />
                      {team.status === 'ONDINH' && 'Ổn định'}
                      {team.status === 'BAODONG' && 'Báo động'}
                      {team.status === 'CANCHUY' && 'Cần chú ý'}
                    </span>
                  </td>

                  {/* Column 5: HÀNH ĐỘNG */}
                  <td className="py-4 px-5 text-right">
                    {team.status === 'BAODONG' ? (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          onClick={() => handleOpenTargetModal(team)}
                          className="bg-white border-slate-300 hover:border-slate-400 text-slate-800 font-semibold text-xs rounded-lg h-9 px-3 shadow-2xs"
                        >
                          Đặt lại Target
                        </Button>
                        <Button
                          onClick={() => handleOpenEmergencyModal(team)}
                          className="bg-[#991b1b] hover:bg-[#7f1d1d] text-white font-bold text-xs rounded-lg h-9 px-3.5 flex items-center gap-1.5 border-none shadow-xs"
                        >
                          <VideoCameraOutlined /> Họp khẩn
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleOpenDetailDrawer(team)}
                        className="bg-white border-slate-300 hover:border-slate-400 text-blue-600 font-semibold text-xs rounded-lg h-9 px-4 shadow-2xs"
                      >
                        Chi tiết
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Họp Khẩn Online */}
      <Modal
        title={
          <div className="flex items-center gap-2 font-bold text-red-700 text-base">
            <VideoCameraOutlined className="text-red-600" />
            <span>Họp Khẩn Đột Xuất - {selectedTeam?.name}</span>
          </div>
        }
        open={emergencyModalOpen}
        onCancel={() => setEmergencyModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={emergencyForm} layout="vertical" onFinish={handleEmergencySubmit} className="pt-3 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800 font-medium">
            <strong>Lý do họp khẩn:</strong> {selectedTeam?.name} (Team Lead: {selectedTeam?.leader}) đang gặp <strong>báo động tỉ lệ chuyển đổi sụt giảm ({selectedTeam?.conversionRate}%)</strong>.
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="date"
              label="Ngày họp"
              rules={[{ required: true, message: 'Chọn ngày họp!' }]}
            >
              <DatePicker className="w-full rounded-lg" format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item
              name="time"
              label="Thời gian"
              rules={[{ required: true, message: 'Chọn giờ họp!' }]}
            >
              <TimePicker className="w-full rounded-lg" format="HH:mm" />
            </Form.Item>
          </div>

          <Form.Item
            name="meetingLink"
            label="Đường link họp (Google Meet / Zoom)"
            initialValue="https://meet.google.com/crm-emergency-sync"
            rules={[{ required: true }]}
          >
            <Input className="rounded-lg" />
          </Form.Item>

          <Form.Item name="notes" label="Nội dung cần chuẩn bị trước khi họp">
            <Input.TextArea
              rows={3}
              placeholder="Gửi yêu cầu Team Leader chuẩn bị danh sách các hợp đồng bị tắc nghẽn..."
              className="rounded-lg"
            />
          </Form.Item>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button onClick={() => setEmergencyModalOpen(false)} className="rounded-lg font-medium">
              Hủy
            </Button>
            <Button type="primary" danger htmlType="submit" className="bg-[#991b1b] font-bold rounded-lg px-5">
              Phát thư mời họp ngay
            </Button>
          </div>
        </Form>
      </Modal>

      {/* MODAL 2: Đặt lại Target */}
      <Modal
        title={
          <div className="flex items-center gap-2 font-bold text-slate-900 text-base">
            <EditOutlined className="text-indigo-600" />
            <span>Điều chỉnh KPI Target cho {selectedTeam?.name}</span>
          </div>
        }
        open={targetModalOpen}
        onCancel={() => setTargetModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={targetForm} layout="vertical" onFinish={handleTargetSubmit} className="pt-3 space-y-4">
          <Form.Item
            name="conversionTarget"
            label="Mục tiêu Tỉ lệ thắng (%)"
            rules={[{ required: true, message: 'Nhập tỉ lệ thắng target' }]}
          >
            <InputNumber className="w-full rounded-lg" min={5} max={100} addonAfter="%" />
          </Form.Item>

          <Form.Item
            name="salesCycleTarget"
            label="Mục tiêu Chu kỳ bán hàng (Ngày)"
            rules={[{ required: true, message: 'Nhập chu kỳ bán hàng' }]}
          >
            <InputNumber className="w-full rounded-lg" min={7} max={180} addonAfter="ngày" />
          </Form.Item>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button onClick={() => setTargetModalOpen(false)} className="rounded-lg font-medium">
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" className="bg-indigo-600 font-bold rounded-lg">
              Cập nhật Target mới
            </Button>
          </div>
        </Form>
      </Modal>

      {/* DRAWER: Chi tiết Team */}
      <Drawer
        title={
          <div className="flex items-center gap-2 font-bold text-slate-900 text-base">
            <TeamOutlined className="text-indigo-600" />
            <span>Chi Tiết Sức Khỏe: {selectedTeam?.name}</span>
          </div>
        }
        width={480}
        open={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
      >
        {selectedTeam && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div
                className={`w-14 h-14 rounded-2xl ${selectedTeam.avatarBg} font-black text-xl flex items-center justify-center shrink-0 border border-black/5`}
              >
                {selectedTeam.letter}
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg">{selectedTeam.name}</h3>
                <p className="text-xs text-slate-500 font-medium">Team Leader: {selectedTeam.leader}</p>
                <div className="mt-1 flex items-center gap-3 text-xs font-semibold text-slate-700">
                  <span>Thành viên: {selectedTeam.activeMembersCount} sales</span>
                  <span>Doanh thu: {selectedTeam.monthlyRevenue}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div className="text-xs text-slate-500 font-medium">Tỉ lệ chuyển đổi</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{selectedTeam.conversionRate}%</div>
              </div>
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                <div className="text-xs text-slate-500 font-medium">Sales Cycle trung bình</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{selectedTeam.salesCycleDays} ngày</div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 text-sm">Danh sách Thành viên thuộc Team</h4>
              <div className="space-y-2 text-xs font-medium divide-y divide-slate-100 bg-white border border-slate-200 rounded-xl p-3">
                <div className="flex items-center justify-between py-2">
                  <span className="font-bold text-slate-900">{selectedTeam.leader} (Leader)</span>
                  <span className="text-emerald-600 font-bold">24.5% Win rate</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-700">Phạm Văn D</span>
                  <span className="text-slate-600 font-semibold">18.2% Win rate</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-700">Lý Thị E</span>
                  <span className="text-slate-600 font-semibold">21.0% Win rate</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <Button
                type="primary"
                onClick={() => {
                  setDetailDrawerOpen(false);
                  navigate('/teams');
                }}
                className="w-full bg-indigo-600 font-bold rounded-lg h-10"
              >
                Quản lý Cấu trúc Đội ngũ (Teams)
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

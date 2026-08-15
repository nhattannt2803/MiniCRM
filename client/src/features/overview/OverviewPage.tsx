import React, { useState } from 'react';
import { Button, Avatar, Tooltip, message } from 'antd';
import {
  ExclamationCircleOutlined,
  SyncOutlined,
  WarningOutlined,
  DollarCircleOutlined,
  PlusOutlined,
  RightOutlined,
  CheckOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  MailOutlined,
  PhoneOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [completedTasks, setCompletedTasks] = useState<number[]>([]);

  const toggleTaskComplete = (taskId: number) => {
    if (completedTasks.includes(taskId)) {
      setCompletedTasks(completedTasks.filter((id) => id !== taskId));
      message.info('Đã bỏ đánh dấu hoàn thành nhiệm vụ');
    } else {
      setCompletedTasks([...completedTasks, taskId]);
      message.success('Đã đánh dấu hoàn thành nhiệm vụ!');
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* 1. Main Header Title */}
      <div>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
          Những việc cần làm hôm nay
        </h1>
      </div>

      {/* 2. Red Warning Banner */}
      <div className="bg-red-100/90 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-red-200/80 flex items-center justify-center text-red-700 shrink-0">
            <ExclamationCircleOutlined className="text-xl" />
          </div>
          <div>
            <h3 className="text-base font-bold text-red-950">
              Cảnh Báo: 3 Lead chưa có lịch hẹn tiếp theo!
            </h3>
            <p className="text-xs text-red-800 mt-0.5">
              Đừng để lỡ cơ hội. Hãy lên lịch hành động tiếp theo cho các lead này ngay lập tức để duy trì tương tác.
            </p>
          </div>
        </div>
        <Button
          onClick={() => navigate('/leads')}
          className="bg-[#991b1b] hover:bg-[#7f1d1d] text-white font-bold border-none px-5 rounded-lg h-9 shrink-0 cursor-pointer shadow-xs"
        >
          Xử lý ngay
        </Button>
      </div>

      {/* 3. Top 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Lead Mới */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between h-36">
          <div className="w-8 h-8 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-black text-xs">
            NEW
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">12</div>
            <div className="text-xs font-semibold text-slate-500 mt-1">Lead Mới</div>
          </div>
        </div>

        {/* Card 2: Follow-up */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between h-36">
          <div className="w-8 h-8 rounded-md bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 text-base">
            <SyncOutlined />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">8</div>
            <div className="text-xs font-semibold text-slate-500 mt-1">Follow-up</div>
          </div>
        </div>

        {/* Card 3: Quá Hạn */}
        <div className="bg-red-100/80 rounded-xl border border-red-200 p-5 shadow-xs flex flex-col justify-between h-36">
          <div className="w-8 h-8 rounded-md bg-red-200/70 flex items-center justify-center text-red-700 text-base">
            <WarningOutlined />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">3</div>
            <div className="text-xs font-bold text-red-700 mt-1">Quá Hạn</div>
          </div>
        </div>

        {/* Card 4: Deal Chốt */}
        <div className="bg-[#6be842] rounded-xl border border-[#5cd136] p-5 shadow-xs flex flex-col justify-between h-36">
          <div className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center text-slate-900 text-lg">
            <DollarCircleOutlined />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-950 tracking-tight">2</div>
            <div className="text-xs font-bold text-slate-950 mt-1">Deal Chốt</div>
          </div>
        </div>
      </div>

      {/* 4. Pipeline Bán Hàng (Kanban Columns Overview) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Pipeline Bán Hàng
          </h2>
          <Button
            type="link"
            onClick={() => navigate('/opportunities')}
            className="text-indigo-600 font-semibold text-xs flex items-center gap-1 p-0 hover:underline"
          >
            Xem tất cả <RightOutlined className="text-[10px]" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Column 1: Mới (3) */}
          <div className="bg-slate-100/70 border border-slate-200/80 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 px-1">
              <span>Mới (3)</span>
              <PlusOutlined className="text-slate-500 cursor-pointer hover:text-slate-800" />
            </div>

            {/* Card 1 */}
            <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-2xs space-y-2">
              <div className="font-bold text-slate-900 text-sm">Công ty Alpha</div>
              <div className="text-xs text-slate-500">Phạm Văn D</div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <ClockCircleOutlined className="text-[10px]" /> Hôm nay, 14:00
                </span>
                <Avatar size="small" src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alpha" />
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-2xs space-y-2">
              <div className="font-bold text-slate-900 text-sm">Tập đoàn Beta</div>
              <div className="text-xs text-slate-500">Lý Thị E</div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[11px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <ClockCircleOutlined className="text-[10px]" /> Ngày mai, 09:30
                </span>
                <Avatar size="small" src="https://api.dicebear.com/7.x/avataaars/svg?seed=Beta" />
              </div>
            </div>
          </div>

          {/* Column 2: Đang liên hệ (2) */}
          <div className="bg-slate-100/70 border border-slate-200/80 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 px-1">
              <span>Đang liên hệ (2)</span>
              <PlusOutlined className="text-slate-500 cursor-pointer hover:text-slate-800" />
            </div>

            {/* Card 1 */}
            <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-2xs space-y-2">
              <div className="font-bold text-slate-900 text-sm">TechCorp VN</div>
              <div className="text-xs text-slate-500">Đỗ Văn F</div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <WarningOutlined className="text-[10px]" /> Quá hạn
                </span>
                <Avatar size="small" src="https://api.dicebear.com/7.x/avataaars/svg?seed=TechCorp" />
              </div>
            </div>
          </div>

          {/* Column 3: Đã liên hệ (1) */}
          <div className="bg-slate-100/70 border border-slate-200/80 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 px-1">
              <span>Đã liên hệ (1)</span>
              <PlusOutlined className="text-slate-500 cursor-pointer hover:text-slate-800" />
            </div>

            {/* Card 1 */}
            <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-2xs space-y-2">
              <div className="font-bold text-slate-900 text-sm">Công ty Gamma</div>
              <div className="text-xs text-slate-500">Võ Thị G</div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <ClockCircleOutlined className="text-[10px]" /> T5, 15:00
                </span>
                <Avatar size="small" src="https://api.dicebear.com/7.x/avataaars/svg?seed=Gamma" />
              </div>
            </div>
          </div>

          {/* Column 4: Đàm Phán (1) */}
          <div className="bg-slate-100/70 border border-slate-200/80 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 px-1">
              <span>Đàm Phán (1)</span>
            </div>

            {/* Card 1 */}
            <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-2xs space-y-2">
              <div className="font-bold text-slate-900 text-sm truncate">Mega Holdings</div>
              <div className="text-xs text-slate-500">Hoàng Văn H</div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <ClockCircleOutlined className="text-[10px]" /> T6, 10:00
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Việc Cần Làm Hôm Nay (Tasks List Table) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-base font-bold text-slate-900">
            Việc Cần Làm Hôm Nay
          </h2>
          <Button
            type="link"
            onClick={() => navigate('/tasks')}
            className="text-indigo-600 font-semibold text-xs flex items-center gap-1 p-0 hover:underline"
          >
            Xem Tất Cả <RightOutlined className="text-[10px]" />
          </Button>
        </div>

        <div className="divide-y divide-slate-100">
          {/* Row 1: Quá hạn - Soft Red Background */}
          <div className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${completedTasks.includes(1) ? 'opacity-50 bg-slate-50' : 'bg-red-50/50'}`}>
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-red-600 flex items-center gap-1 w-20 shrink-0">
                <WarningOutlined /> 08:00
              </span>
              <span className={`font-bold text-slate-900 text-sm ${completedTasks.includes(1) ? 'line-through' : ''}`}>
                Lê Văn C
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 md:justify-center">
              <span className="text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                <MailOutlined className="text-slate-500" /> Gửi báo giá
              </span>
              <span className="text-xs text-slate-500">
                3 ngày trước
              </span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                Đàm phán
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0 justify-end">
              <Tooltip title="Đánh dấu hoàn thành">
                <button
                  onClick={() => toggleTaskComplete(1)}
                  className={`w-7 h-7 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${completedTasks.includes(1)
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'border-slate-300 hover:border-emerald-500 text-slate-400 hover:text-emerald-600'
                    }`}
                >
                  <CheckOutlined className="text-xs" />
                </button>
              </Tooltip>
              <Tooltip title="Xem chi tiết">
                <button className="w-7 h-7 rounded-full border border-slate-300 hover:border-indigo-500 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer">
                  <EyeOutlined className="text-xs" />
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Row 2: Standard White Background */}
          <div className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${completedTasks.includes(2) ? 'opacity-50 bg-slate-50' : 'bg-white'}`}>
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-blue-600 flex items-center gap-1 w-20 shrink-0">
                <ClockCircleOutlined /> 09:00
              </span>
              <span className={`font-bold text-slate-900 text-sm ${completedTasks.includes(2) ? 'line-through' : ''}`}>
                Nguyễn Văn A
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 md:justify-center">
              <span className="text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                <PhoneOutlined className="text-slate-500" /> Gọi điện
              </span>
              <span className="text-xs text-slate-500">
                2 ngày trước
              </span>
              <span className="text-xs font-semibold text-blue-700 bg-blue-100/70 border border-blue-200 px-2.5 py-0.5 rounded-full">
                Mới
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0 justify-end">
              <Tooltip title="Đánh dấu hoàn thành">
                <button
                  onClick={() => toggleTaskComplete(2)}
                  className={`w-7 h-7 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${completedTasks.includes(2)
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'border-slate-300 hover:border-emerald-500 text-slate-400 hover:text-emerald-600'
                    }`}
                >
                  <CheckOutlined className="text-xs" />
                </button>
              </Tooltip>
              <Tooltip title="Xem chi tiết">
                <button className="w-7 h-7 rounded-full border border-slate-300 hover:border-indigo-500 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer">
                  <EyeOutlined className="text-xs" />
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Row 3: Standard White Background */}
          <div className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${completedTasks.includes(3) ? 'opacity-50 bg-slate-50' : 'bg-white'}`}>
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-blue-600 flex items-center gap-1 w-20 shrink-0">
                <ClockCircleOutlined /> 10:30
              </span>
              <span className={`font-bold text-slate-900 text-sm ${completedTasks.includes(3) ? 'line-through' : ''}`}>
                Trần Thị B
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 md:justify-center">
              <span className="text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                <AppstoreOutlined className="text-slate-500" /> Demo sản phẩm
              </span>
              <span className="text-xs text-slate-500">
                Hôm qua
              </span>
              <span className="text-xs font-semibold text-amber-700 bg-amber-100/70 border border-amber-200 px-2.5 py-0.5 rounded-full">
                Đang liên hệ
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0 justify-end">
              <Tooltip title="Đánh dấu hoàn thành">
                <button
                  onClick={() => toggleTaskComplete(3)}
                  className={`w-7 h-7 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${completedTasks.includes(3)
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'border-slate-300 hover:border-emerald-500 text-slate-400 hover:text-emerald-600'
                    }`}
                >
                  <CheckOutlined className="text-xs" />
                </button>
              </Tooltip>
              <Tooltip title="Xem chi tiết">
                <button className="w-7 h-7 rounded-full border border-slate-300 hover:border-indigo-500 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer">
                  <EyeOutlined className="text-xs" />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

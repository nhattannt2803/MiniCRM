import React, { useState } from 'react';
import { Card, Row, Col, Progress, Tag, Button, Drawer, message } from 'antd';
import {
  AlertOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  BellOutlined,
  ThunderboltOutlined,
  ExclamationCircleOutlined,
  RightOutlined,
  FireOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { crmService } from '../../services/crmService';

interface LeaderDashboardProps {
  data: {
    teamOverview: {
      newLeads: {
        total: number;
        processed: number;
        unprocessed: number;
      };
      todayFollowups: {
        total: number;
        completed: number;
        remaining: number;
      };
      overdueFollowups: number;
      inactiveLeads7Days: number;
    };
    salesReps: Array<{
      id: string;
      name: string;
      email: string;
      phone?: string;
      overdueCount: number;
      unprocessedCount: number;
      inactiveCount: number;
      todayTotal: number;
      todayCompleted: number;
      alertStatus: 'CRITICAL' | 'WARNING' | 'GOOD';
      overdueTasks: Array<{
        id: string;
        title: string;
        priority: string;
        dueAt: string;
        relatedType: string;
        relatedId: string;
      }>;
      inactiveLeads: Array<{
        id: string;
        name: string;
        companyName?: string;
        phone?: string;
        createdAt: string;
      }>;
    }>;
  };
  onRefresh: () => void;
}

export const LeaderDashboardView: React.FC<LeaderDashboardProps> = ({ data, onRefresh }) => {
  const { t } = useTranslation();
  const { teamOverview, salesReps } = data;

  const [selectedRep, setSelectedRep] = useState<any>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'ISSUES'>('ALL');
  const [nudgingId, setNudgingId] = useState<string | null>(null);

  const handleNudge = async (repId: string, repName: string) => {
    try {
      setNudgingId(repId);
      const res: any = await crmService.nudgeSales(repId);
      if (res.success) {
        message.success(`${t('dashboard.nudgeSuccess')} ${repName}!`);
      }
    } catch (err) {
      message.error('Không thể gửi nhắc nhở. Vui lòng thử lại.');
    } finally {
      setNudgingId(null);
    }
  };

  const openRepDrawer = (rep: any) => {
    setSelectedRep(rep);
    setDrawerVisible(true);
  };

  const filteredReps = salesReps.filter((rep) => {
    if (filterType === 'ISSUES') {
      return rep.overdueCount > 0 || rep.inactiveCount > 0 || rep.unprocessedCount > 0;
    }
    return true;
  });

  const processedPercent = teamOverview.newLeads.total > 0
    ? Math.round((teamOverview.newLeads.processed / teamOverview.newLeads.total) * 100)
    : 0;

  const todayCompletedPercent = teamOverview.todayFollowups.total > 0
    ? Math.round((teamOverview.todayFollowups.completed / teamOverview.todayFollowups.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-10 text-white pointer-events-none">
          <ThunderboltOutlined style={{ fontSize: '240px' }} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-semibold rounded-full border border-amber-500/30 flex items-center gap-1">
                <ThunderboltOutlined /> Morning Executive Briefing
              </span>
              <span className="text-slate-400 text-xs">
                {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              {t('dashboard.leaderTitle')}
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              {t('dashboard.leaderSubtitle')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="primary"
              danger
              icon={<BellOutlined />}
              className="font-semibold shadow-md rounded-xl h-10 px-5"
              onClick={() => {
                const troubledReps = salesReps.filter((r) => r.overdueCount > 0);
                if (troubledReps.length === 0) {
                  message.info('Tất cả nhân viên Sale hiện không có công việc quá hạn!');
                  return;
                }
                troubledReps.forEach((r) => handleNudge(r.id, r.name));
              }}
            >
              Nhắc nhở toàn bộ Sale có Overdue 🔴
            </Button>
          </div>
        </div>
      </div>

      {/* TEAM SALES 4 KEY METRICS GRID */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <FireOutlined className="text-amber-500" /> {t('dashboard.teamSales')} Overview
          </h2>
          <span className="text-xs text-slate-400">Cập nhật thời gian thực</span>
        </div>

        <Row gutter={[16, 16]}>
          {/* Card 1: Lead mới */}
          <Col xs={24} sm={12} lg={6}>
            <Card className="rounded-2xl border-slate-200 shadow-sm hover:shadow-md transition-all bg-white overflow-hidden relative">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {t('dashboard.newLeads')}
                  </div>
                  <div className="text-3xl font-black text-slate-900 mt-1">
                    {teamOverview.newLeads.total}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg font-bold">
                  <UserOutlined />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                <span className="text-emerald-600 flex items-center gap-1">
                  <CheckCircleOutlined /> {t('dashboard.processed')}: <strong className="text-slate-900">{teamOverview.newLeads.processed}</strong>
                </span>
                <span className="text-rose-600 flex items-center gap-1">
                  {t('dashboard.unprocessed')}: <strong className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">{teamOverview.newLeads.unprocessed} 🔴</strong>
                </span>
              </div>

              <div className="mt-3">
                <Progress percent={processedPercent} strokeColor="#10b981" size="small" showInfo={false} />
              </div>
            </Card>
          </Col>

          {/* Card 2: Follow-up hôm nay */}
          <Col xs={24} sm={12} lg={6}>
            <Card className="rounded-2xl border-slate-200 shadow-sm hover:shadow-md transition-all bg-white overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {t('dashboard.todayFollowups')}
                  </div>
                  <div className="text-3xl font-black text-slate-900 mt-1">
                    {teamOverview.todayFollowups.total}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg font-bold">
                  <ClockCircleOutlined />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                <span className="text-emerald-600 flex items-center gap-1">
                  <CheckCircleOutlined /> {t('dashboard.completed')}: <strong className="text-slate-900">{teamOverview.todayFollowups.completed}</strong>
                </span>
                <span className="text-slate-600">
                  {t('dashboard.remaining')}: <strong className="text-indigo-600">{teamOverview.todayFollowups.remaining}</strong>
                </span>
              </div>

              <div className="mt-3">
                <Progress percent={todayCompletedPercent} strokeColor="#6366f1" size="small" showInfo={false} />
              </div>
            </Card>
          </Col>

          {/* Card 3: Follow-up quá hạn (Highlight RED) */}
          <Col xs={24} sm={12} lg={6}>
            <Card className={`rounded-2xl shadow-sm hover:shadow-md transition-all bg-white border-2 ${
              teamOverview.overdueFollowups > 0 ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1">
                    <AlertOutlined /> {t('dashboard.overdueFollowups')}
                  </div>
                  <div className="text-3xl font-black text-rose-600 mt-1 flex items-center gap-2">
                    {teamOverview.overdueFollowups}
                    <span className="text-lg">🔴</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center text-lg font-bold">
                  <AlertOutlined />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-rose-100 text-xs font-medium text-rose-700 flex items-center justify-between">
                <span>Khẩn cấp cần xử lý ngay</span>
                <Tag color="error" className="rounded-full font-bold">Overdue</Tag>
              </div>
            </Card>
          </Col>

          {/* Card 4: Lead không activity > 7 ngày */}
          <Col xs={24} sm={12} lg={6}>
            <Card className={`rounded-2xl shadow-sm hover:shadow-md transition-all bg-white border-2 ${
              teamOverview.inactiveLeads7Days > 0 ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
                    <ExclamationCircleOutlined /> {t('dashboard.inactiveLeads')}
                  </div>
                  <div className="text-3xl font-black text-amber-600 mt-1 flex items-center gap-2">
                    {teamOverview.inactiveLeads7Days}
                    <span className="text-lg">🔴</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-lg font-bold">
                  <ExclamationCircleOutlined />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-amber-100 text-xs font-medium text-amber-800 flex items-center justify-between">
                <span>Rủi ro mất khách hàng</span>
                <Tag color="warning" className="rounded-full font-bold">&gt; 7 ngày</Tag>
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      {/* SALES REP ACCOUNTABILITY & PROBLEM DETECTION SECTION */}
      <Card className="rounded-2xl border-slate-200 shadow-sm bg-white overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <UserOutlined className="text-indigo-600" /> {t('dashboard.salesAccountability')}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('dashboard.salesAccountabilityDesc')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type={filterType === 'ALL' ? 'primary' : 'default'}
              size="small"
              className="rounded-lg font-medium"
              onClick={() => setFilterType('ALL')}
            >
              Tất cả Sales ({salesReps.length})
            </Button>
            <Button
              type={filterType === 'ISSUES' ? 'primary' : 'default'}
              danger={filterType === 'ISSUES'}
              size="small"
              className="rounded-lg font-medium"
              onClick={() => setFilterType('ISSUES')}
            >
              Chỉ xem Sale Có Vấn Đề 🔴
            </Button>
          </div>
        </div>

        {/* Rep Cards Grid */}
        <Row gutter={[16, 16]}>
          {filteredReps.map((rep) => {
            const hasOverdue = rep.overdueCount > 0;
            const hasInactive = rep.inactiveCount > 0;

            return (
              <Col xs={24} md={12} lg={8} key={rep.id}>
                <div
                  className={`p-5 rounded-2xl border transition-all relative ${
                    hasOverdue
                      ? 'border-rose-300 bg-rose-50/30 hover:border-rose-400 hover:shadow-md'
                      : hasInactive
                      ? 'border-amber-300 bg-amber-50/20 hover:border-amber-400 hover:shadow-md'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-full font-bold flex items-center justify-center text-sm shadow-sm ${
                          hasOverdue
                            ? 'bg-rose-600 text-white'
                            : hasInactive
                            ? 'bg-amber-500 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {rep.name.split(' ').pop()?.substring(0, 2).toUpperCase() || 'SA'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-base">{rep.name}</div>
                        <div className="text-xs text-slate-500">{rep.email}</div>
                      </div>
                    </div>

                    {hasOverdue ? (
                      <Tag color="error" className="font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        🔴 CẦN CHÚ Ý
                      </Tag>
                    ) : hasInactive ? (
                      <Tag color="warning" className="font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        🟡 CẢNH BÁO
                      </Tag>
                    ) : (
                      <Tag color="success" className="font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        🟢 TỐT
                      </Tag>
                    )}
                  </div>

                  {/* Key Metrics Breakdown for this sale rep */}
                  <div className="space-y-2 py-3 my-2 border-y border-slate-200/60 text-sm">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-slate-600">Follow-up Quá hạn:</span>
                      {rep.overdueCount > 0 ? (
                        <span className="text-rose-600 font-black text-base flex items-center gap-1 bg-rose-100 px-2.5 py-0.5 rounded-full">
                          Overdue: {rep.overdueCount} 🔴
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full">
                          Overdue: 0 🟢
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Lead chưa xử lý:</span>
                      <span className={rep.unprocessedCount > 0 ? 'font-bold text-rose-600' : 'text-slate-700 font-medium'}>
                        {rep.unprocessedCount > 0 ? `${rep.unprocessedCount} chưa gọi 🔴` : '0'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Lead bỏ quên (&gt;7 ngày):</span>
                      <span className={rep.inactiveCount > 0 ? 'font-bold text-amber-600' : 'text-slate-700 font-medium'}>
                        {rep.inactiveCount > 0 ? `${rep.inactiveCount} lead 🔴` : '0'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-500">Follow-up hôm nay:</span>
                      <span className="font-semibold text-slate-800">
                        {rep.todayCompleted} / {rep.todayTotal} hoàn thành
                      </span>
                    </div>
                  </div>

                  {/* Actions for this sale rep */}
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      size="small"
                      type="default"
                      className="flex-1 rounded-xl text-xs font-semibold border-slate-300"
                      onClick={() => openRepDrawer(rep)}
                    >
                      Chi tiết <RightOutlined style={{ fontSize: '10px' }} />
                    </Button>

                    <Button
                      size="small"
                      type="primary"
                      danger={hasOverdue}
                      icon={<BellOutlined />}
                      loading={nudgingId === rep.id}
                      className="rounded-xl text-xs font-semibold"
                      onClick={() => handleNudge(rep.id, rep.name)}
                    >
                      Nudge 🔔
                    </Button>
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>
      </Card>

      {/* Drawer showing details of selected Sale Rep */}
      <Drawer
        title={
          selectedRep && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                {selectedRep.name.substring(0, 2)}
              </div>
              <div>
                <div className="font-bold text-slate-900">{selectedRep.name}</div>
                <div className="text-xs font-normal text-slate-500">{selectedRep.email}</div>
              </div>
            </div>
          )
        }
        placement="right"
        width={560}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        {selectedRep && (
          <div className="space-y-6">
            {/* Alert Summary */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase">Tổng quan rủi ro</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  Overdue: <span className="text-rose-600 font-extrabold">{selectedRep.overdueCount}</span> | Lead ko activity: <span className="text-amber-600 font-extrabold">{selectedRep.inactiveCount}</span>
                </div>
              </div>
              <Button
                type="primary"
                danger
                icon={<BellOutlined />}
                loading={nudgingId === selectedRep.id}
                onClick={() => handleNudge(selectedRep.id, selectedRep.name)}
              >
                Gửi Nhắc Nhở Ngay
              </Button>
            </div>

            {/* Overdue Tasks List */}
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
                <AlertOutlined className="text-rose-600" /> Danh Sách Việc Quá Hạn ({selectedRep.overdueTasks.length})
              </h4>
              {selectedRep.overdueTasks.length === 0 ? (
                <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-medium border border-emerald-200">
                  🎉 Tuyệt vời! Không có công việc nào quá hạn.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedRep.overdueTasks.map((t: any) => (
                    <div key={t.id} className="p-3 rounded-xl border border-rose-200 bg-rose-50/40 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">{t.title}</div>
                        <div className="text-rose-600 font-medium mt-0.5">
                          Hạn chót: {new Date(t.dueAt).toLocaleDateString('vi-VN')} {new Date(t.dueAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <Tag color="error" className="font-bold">Overdue</Tag>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Inactive Leads List */}
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
                <ExclamationCircleOutlined className="text-amber-600" /> Lead Không Activity &gt; 7 Ngày ({selectedRep.inactiveLeads.length})
              </h4>
              {selectedRep.inactiveLeads.length === 0 ? (
                <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-medium border border-emerald-200">
                  🎉 Tất cả khách hàng đều được chăm sóc liên tục.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedRep.inactiveLeads.map((l: any) => (
                    <div key={l.id} className="p-3 rounded-xl border border-amber-200 bg-amber-50/40 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">{l.name} {l.companyName ? `(${l.companyName})` : ''}</div>
                        <div className="text-slate-500 mt-0.5">SĐT: {l.phone || 'Chưa cập nhật'}</div>
                      </div>
                      <Tag color="warning" className="font-bold">&gt; 7 ngày</Tag>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

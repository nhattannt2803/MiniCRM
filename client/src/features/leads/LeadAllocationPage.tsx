import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Select, Tag, Space, Modal, message, Progress, Avatar, Tooltip, Badge, Switch } from 'antd';
import {
  ShareAltOutlined,
  UsergroupAddOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  SwapOutlined,
  InfoCircleOutlined,
  FireOutlined,
} from '@ant-design/icons';
import { crmService } from '../../services/crmService';
import { Lead } from '../../types';

const { Option } = Select;

export const LeadAllocationPage: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<React.Key[]>([]);
  const [targetStaffId, setTargetStaffId] = useState<string>('');
  const [autoRoundRobin, setAutoRoundRobin] = useState<boolean>(true);
  const [allocating, setAllocating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leadsRes, staffRes]: [any, any] = await Promise.all([
        crmService.getLeads({ limit: 100 }),
        crmService.getUsers(),
      ]);

      if (leadsRes.success) {
        setLeads(leadsRes.data);
      }
      if (staffRes.success) {
        setStaffList(staffRes.data);
      }
    } catch (err) {
      message.error('Không thể tải dữ liệu phân bổ Lead');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const unassignedLeads = leads.filter((l) => !l.ownerId);

  const handleBulkAllocate = async () => {
    if (selectedLeadIds.length === 0) {
      message.warning('Vui lòng chọn ít nhất 1 Lead để phân bổ');
      return;
    }
    if (!targetStaffId) {
      message.warning('Vui lòng chọn nhân viên kinh doanh nhận Lead');
      return;
    }

    setAllocating(true);
    try {
      const res: any = await crmService.allocateLeads(selectedLeadIds as string[], targetStaffId);
      if (res.success) {
        message.success(`Đã phân bổ thành công ${selectedLeadIds.length} Lead cho nhân viên`);
        setSelectedLeadIds([]);
        setTargetStaffId('');
        fetchData();
      }
    } catch (err: any) {
      message.error(err?.message || 'Có lỗi xảy ra khi phân bổ Lead');
    } finally {
      setAllocating(false);
    }
  };

  const handleAutoDistributeRoundRobin = async () => {
    if (unassignedLeads.length === 0) {
      message.info('Hiện không có Lead nào trong kho chờ phân bổ');
      return;
    }
    if (staffList.length === 0) {
      message.warning('Không tìm thấy danh sách nhân viên');
      return;
    }

    setAllocating(true);
    try {
      // Distribute round-robin to staff
      let staffIdx = 0;
      for (const lead of unassignedLeads) {
        const assignedStaff = staffList[staffIdx % staffList.length];
        await crmService.allocateLeads([lead.id], assignedStaff.id);
        staffIdx++;
      }
      message.success(`Đã tự động xoay vòng phân bổ ${unassignedLeads.length} Lead cho ${staffList.length} nhân viên!`);
      fetchData();
    } catch (err: any) {
      message.error('Lỗi khi thực hiện phân bổ tự động');
    } finally {
      setAllocating(false);
    }
  };

  const columns = [
    {
      title: 'Tên Lead',
      dataIndex: 'firstName',
      key: 'name',
      render: (_: any, r: Lead) => (
        <div>
          <span className="font-bold text-slate-800">{r.firstName} {r.lastName}</span>
          {r.jobTitle && <div className="text-xs text-slate-400">{r.jobTitle}</div>}
        </div>
      ),
    },
    {
      title: 'Công ty',
      dataIndex: 'companyName',
      key: 'companyName',
      render: (t: string) => <span className="text-slate-600 font-medium">{t || 'Khách lẻ'}</span>,
    },
    {
      title: 'Nguồn',
      dataIndex: 'source',
      key: 'source',
      render: (s: string) => <Tag color="blue">{s}</Tag>,
    },
    {
      title: 'Độ ưu tiên',
      dataIndex: 'rating',
      key: 'rating',
      render: (r: string) =>
        r === 'HOT' ? (
          <Tag color="red" icon={<FireOutlined />}>Gấp / Nóng</Tag>
        ) : (
          <Tag color="orange">Thường</Tag>
        ),
    },
    {
      title: 'Trạng thái phân bổ',
      key: 'assigned',
      render: (_: any, r: Lead) =>
        r.owner ? (
          <Tag color="green" icon={<CheckCircleOutlined />}>
            {r.owner.firstName} {r.owner.lastName}
          </Tag>
        ) : (
          <Tag color="volcano" className="font-semibold">Chưa phân bổ</Tag>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShareAltOutlined className="text-indigo-600" /> Phân bổ Lead (Lead Allocation)
          </h1>
          <p className="text-sm text-slate-500">
            Quản lý kho Lead chờ điều phối, phân bổ thủ công theo số lượng hoặc tự động xoay vòng (Round-Robin)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button icon={<SyncOutlined />} onClick={fetchData} loading={loading}>
            Làm mới
          </Button>
          <Button
            type="primary"
            className="bg-indigo-600 hover:bg-indigo-700"
            icon={<SwapOutlined />}
            onClick={handleAutoDistributeRoundRobin}
            loading={allocating}
          >
            Phân bổ tự động Round-Robin
          </Button>
        </div>
      </div>

      {/* Staff Capacity & Distribution Cards */}
      <div>
        <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
          <UsergroupAddOutlined className="text-indigo-600" /> Tải công việc & Số Lead nhân viên đang phụ trách
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {staffList.map((staff) => {
            const assignedCount = leads.filter((l) => l.ownerId === staff.id).length;
            const maxCap = 30;
            const percent = Math.min(Math.round((assignedCount / maxCap) * 100), 100);

            return (
              <Card key={staff.id} className="shadow-xs border-slate-200 rounded-xl hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="bg-indigo-600 text-white font-bold">
                    {staff.firstName[0]}
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 truncate">
                      {staff.firstName} {staff.lastName}
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      {staff.roles?.join(', ') || 'Sales Rep'}
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-600">
                    <span>Đang giữ: {assignedCount} Lead</span>
                    <span>Max: {maxCap}</span>
                  </div>
                  <Progress percent={percent} strokeColor={percent > 80 ? '#f43f5e' : '#6366f1'} size="small" />
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Allocation Action Toolbar */}
      <Card className="shadow-xs border-slate-200 rounded-xl bg-slate-50">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-800 text-sm">
              Đã chọn: <Badge count={selectedLeadIds.length} overflowCount={999} style={{ backgroundColor: '#6366f1' }} /> Lead
            </span>
            <Select
              placeholder="-- Chọn Nhân Viên Nhận Lead --"
              value={targetStaffId || undefined}
              onChange={setTargetStaffId}
              className="w-64"
            >
              {staffList.map((s) => (
                <Option key={s.id} value={s.id}>
                  👤 {s.firstName} {s.lastName} ({s.email})
                </Option>
              ))}
            </Select>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={handleBulkAllocate}
              loading={allocating}
              disabled={selectedLeadIds.length === 0 || !targetStaffId}
            >
              Gán Lead Đã Chọn
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
            <InfoCircleOutlined className="text-indigo-600 text-sm" />
            <span>Kho Lead chưa phân bổ: <strong className="text-indigo-700 font-bold">{unassignedLeads.length} Lead</strong></span>
          </div>
        </div>
      </Card>

      {/* Lead Table for Allocation */}
      <Card title="Danh sách Lead chờ điều phối phân bổ" className="shadow-xs border-slate-200 rounded-xl">
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={leads}
          rowSelection={{
            selectedRowKeys: selectedLeadIds,
            onChange: setSelectedLeadIds,
          }}
          pagination={{ pageSize: 15, showSizeChanger: true }}
          className="overflow-x-auto"
        />
      </Card>
    </div>
  );
};

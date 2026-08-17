import React, { useState, useEffect } from 'react';
import { Modal, Button, Input, InputNumber, Switch, Tag, Space, Popconfirm, notification, Card, Select } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, SettingOutlined, CarOutlined, HomeOutlined, RocketOutlined } from '@ant-design/icons';
import { crmService } from '../../services/crmService';
import { Pipeline, PipelineStage } from '../../types';

interface PipelineManagementModalProps {
  open: boolean;
  onClose: () => void;
  onPipelinesUpdated: (newSelectedPipelineId?: string) => void;
}

const PRESET_TEMPLATES = [
  {
    key: 'xedien',
    name: 'Bán lẻ Xe Điện / Showroom B2C',
    icon: <CarOutlined className="text-emerald-500 text-lg" />,
    desc: 'Tối ưu cho showroom bán xe điện, xe máy với chu kỳ ngắn, tập trung vào lái thử & chốt cọc',
    stages: [
      { name: 'Nhận thông tin (New)', code: 'NEW', orderNo: 1, probability: 10, isWon: false, isLost: false },
      { name: 'Đã gọi / Tư vấn (Contacted)', code: 'CONTACTED', orderNo: 2, probability: 30, isWon: false, isLost: false },
      { name: 'Hẹn lịch xem xe & Lái thử', code: 'TEST_DRIVE', orderNo: 3, probability: 60, isWon: false, isLost: false },
      { name: 'Chốt cọc & Giao xe (Won)', code: 'WON', orderNo: 4, probability: 100, isWon: true, isLost: false },
      { name: 'Khách hủy / Thất bại (Lost)', code: 'LOST', orderNo: 5, probability: 0, isWon: false, isLost: true },
    ],
  },
  {
    key: 'batdongsan',
    name: 'Bất Động Sản & Dự Án',
    icon: <HomeOutlined className="text-amber-500 text-lg" />,
    desc: 'Quy trình chuẩn ngành BĐS từ chọn căn, giữ chỗ đến ký hợp đồng mua bán',
    stages: [
      { name: 'Tiếp nhận nhu cầu', code: 'NEW', orderNo: 1, probability: 10, isWon: false, isLost: false },
      { name: 'Tư vấn tài chính & Dự án', code: 'CONSULT', orderNo: 2, probability: 25, isWon: false, isLost: false },
      { name: 'Xem nhà mẫu / Thực địa', code: 'SITE_VISIT', orderNo: 3, probability: 45, isWon: false, isLost: false },
      { name: 'Đặt chỗ (Booking)', code: 'BOOKING', orderNo: 4, probability: 65, isWon: false, isLost: false },
      { name: 'Đặt cọc (Lock căn)', code: 'DEPOSIT', orderNo: 5, probability: 85, isWon: false, isLost: false },
      { name: 'Ký Hợp đồng mua bán (Won)', code: 'WON', orderNo: 6, probability: 100, isWon: true, isLost: false },
      { name: 'Hủy giao dịch (Lost)', code: 'LOST', orderNo: 7, probability: 0, isWon: false, isLost: true },
    ],
  },
  {
    key: 'saas',
    name: 'B2B SaaS & Giải Pháp Doanh Nghiệp',
    icon: <RocketOutlined className="text-indigo-500 text-lg" />,
    desc: 'Dành cho tư vấn giải pháp phần mềm, B2B với demo & thương lượng hợp đồng',
    stages: [
      { name: 'Tiếp cận (Prospecting)', code: 'NEW', orderNo: 1, probability: 10, isWon: false, isLost: false },
      { name: 'Tư vấn nhu cầu (Qualified)', code: 'QUALIFIED', orderNo: 2, probability: 25, isWon: false, isLost: false },
      { name: 'Demo Giải pháp', code: 'DEMO', orderNo: 3, probability: 50, isWon: false, isLost: false },
      { name: 'Gửi Báo giá & Proposal', code: 'PROPOSAL', orderNo: 4, probability: 70, isWon: false, isLost: false },
      { name: 'Thương lượng Hợp đồng', code: 'NEGOTIATION', orderNo: 5, probability: 85, isWon: false, isLost: false },
      { name: 'Chốt Hợp đồng (Won)', code: 'WON', orderNo: 6, probability: 100, isWon: true, isLost: false },
      { name: 'Thất bại (Lost)', code: 'LOST', orderNo: 7, probability: 0, isWon: false, isLost: true },
    ],
  },
];

export const PipelineManagementModal: React.FC<PipelineManagementModalProps> = ({
  open,
  onClose,
  onPipelinesUpdated,
}) => {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activePipelineId, setActivePipelineId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // New Pipeline form state
  const [newPipelineName, setNewPipelineName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string>('xedien');

  // Stage editing inline state
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [stageNameInput, setStageNameInput] = useState('');
  const [stageProbInput, setStageProbInput] = useState(0);

  // New stage form state
  const [newStageName, setNewStageName] = useState('');
  const [newStageProb, setNewStageProb] = useState(50);
  const [newStageIsWon, setNewStageIsWon] = useState(false);
  const [newStageIsLost, setNewStageIsLost] = useState(false);

  const fetchPipelines = async () => {
    setLoading(true);
    try {
      const res: any = await crmService.getPipelines();
      if (res.success) {
        setPipelines(res.data);
        if (res.data.length > 0 && !activePipelineId) {
          setActivePipelineId(res.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchPipelines();
    }
  }, [open]);

  const currentPipeline = pipelines.find((p) => p.id === activePipelineId);

  const handleCreatePipeline = async () => {
    if (!newPipelineName.trim()) {
      notification.warning({ message: 'Chưa nhập tên quy trình' });
      return;
    }

    const preset = PRESET_TEMPLATES.find((p) => p.key === selectedPreset);
    const stagesToUse = preset ? preset.stages : undefined;

    try {
      const res: any = await crmService.createPipeline({
        name: newPipelineName,
        stages: stagesToUse,
      });

      if (res.success) {
        notification.success({ message: 'Đã tạo quy trình bán hàng mới thành công!' });
        setNewPipelineName('');
        setIsCreatingNew(false);
        await fetchPipelines();
        setActivePipelineId(res.data.id);
        onPipelinesUpdated(res.data.id);
      }
    } catch (err: any) {
      notification.error({ message: 'Lỗi', description: err.message });
    }
  };

  const handleDeletePipeline = async (id: string) => {
    try {
      const res: any = await crmService.deletePipeline(id);
      if (res.success) {
        notification.success({ message: 'Đã xóa quy trình' });
        const remaining = pipelines.filter((p) => p.id !== id);
        setPipelines(remaining);
        if (remaining.length > 0) {
          setActivePipelineId(remaining[0].id);
          onPipelinesUpdated(remaining[0].id);
        } else {
          setActivePipelineId(undefined);
          onPipelinesUpdated(undefined);
        }
      }
    } catch (err: any) {
      notification.error({ message: 'Không thể xóa quy trình', description: err.message });
    }
  };

  const handleAddStage = async () => {
    if (!activePipelineId || !newStageName.trim()) {
      notification.warning({ message: 'Vui lòng nhập tên giai đoạn' });
      return;
    }

    try {
      const res: any = await crmService.addPipelineStage(activePipelineId, {
        name: newStageName,
        probability: newStageProb,
        isWon: newStageIsWon,
        isLost: newStageIsLost,
      });

      if (res.success) {
        notification.success({ message: 'Đã thêm giai đoạn mới!' });
        setNewStageName('');
        setNewStageProb(50);
        setNewStageIsWon(false);
        setNewStageIsLost(false);
        await fetchPipelines();
        onPipelinesUpdated(activePipelineId);
      }
    } catch (err: any) {
      notification.error({ message: 'Lỗi', description: err.message });
    }
  };

  const handleSaveStageEdit = async (stageId: string) => {
    try {
      const res: any = await crmService.updatePipelineStage(stageId, {
        name: stageNameInput,
        probability: stageProbInput,
      });

      if (res.success) {
        notification.success({ message: 'Đã cập nhật giai đoạn' });
        setEditingStageId(null);
        await fetchPipelines();
        onPipelinesUpdated(activePipelineId);
      }
    } catch (err: any) {
      notification.error({ message: 'Lỗi', description: err.message });
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    try {
      const res: any = await crmService.deletePipelineStage(stageId);
      if (res.success) {
        notification.success({ message: 'Đã xóa giai đoạn!' });
        await fetchPipelines();
        onPipelinesUpdated(activePipelineId);
      }
    } catch (err: any) {
      notification.error({ message: 'Không thể xóa giai đoạn', description: err.message });
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-slate-800">
          <SettingOutlined className="text-indigo-600" />
          <span>Quản lý Quy trình Bán hàng (Sales Pipelines)</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" type="primary" onClick={onClose} className="bg-indigo-600">
          Hoàn tất & Đóng
        </Button>,
      ]}
      width={780}
    >
      <div className="space-y-6 my-2">
        {/* Pipeline Selector / Action header */}
        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-700">Quy trình hiện tại:</span>
            <Select
              value={activePipelineId}
              onChange={(val) => {
                setActivePipelineId(val);
                setIsCreatingNew(false);
              }}
              style={{ width: 260 }}
            >
              {pipelines.map((p) => (
                <Select.Option key={p.id} value={p.id}>
                  {p.name} {p.isDefault ? '(Mặc định)' : ''}
                </Select.Option>
              ))}
            </Select>
          </div>

          <Button
            type={isCreatingNew ? 'default' : 'primary'}
            icon={<PlusOutlined />}
            onClick={() => setIsCreatingNew(!isCreatingNew)}
            className={!isCreatingNew ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-none' : ''}
          >
            {isCreatingNew ? 'Hủy tạo mới' : 'Tạo Quy trình mới'}
          </Button>
        </div>

        {/* CREATE NEW PIPELINE FORM WITH PRESETS */}
        {isCreatingNew && (
          <Card className="border-indigo-200 bg-indigo-50/40 shadow-sm">
            <h3 className="font-semibold text-slate-800 text-base mb-3">Tạo Quy trình bán hàng mới</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tên Quy trình mới *</label>
                <Input
                  placeholder="Ví dụ: Quy trình Bán Xe Điện Fast, Sales BĐS Căn Hộ..."
                  value={newPipelineName}
                  onChange={(e) => setNewPipelineName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Chọn mẫu Quy trình gợi ý (Preset Templates):</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {PRESET_TEMPLATES.map((tmpl) => (
                    <div
                      key={tmpl.key}
                      onClick={() => {
                        setSelectedPreset(tmpl.key);
                        if (!newPipelineName) setNewPipelineName(tmpl.name);
                      }}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedPreset === tmpl.key
                          ? 'border-indigo-600 bg-white shadow-md ring-2 ring-indigo-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {tmpl.icon}
                        <span className="font-semibold text-xs text-slate-900">{tmpl.name}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight mb-2">{tmpl.desc}</p>
                      <div className="flex flex-wrap gap-1">
                        {tmpl.stages.map((s, idx) => (
                          <Tag key={idx} color={s.isWon ? 'green' : s.isLost ? 'red' : 'blue'} className="text-[10px] m-0">
                            {s.name.split(' (')[0]}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button onClick={() => setIsCreatingNew(false)}>Hủy</Button>
                <Button type="primary" onClick={handleCreatePipeline} className="bg-indigo-600">
                  Xác nhận Tạo Quy trình
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* STAGES LIST FOR ACTIVE PIPELINE */}
        {currentPipeline && !isCreatingNew && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-slate-800 text-sm">
                  Danh sách Cột / Trạng thái ({currentPipeline.stages?.length || 0} cột)
                </h4>
                <p className="text-xs text-slate-500">
                  Tùy chỉnh tên cột, tỷ lệ chốt % và đánh dấu trạng thái Thành công / Thất bại
                </p>
              </div>

              {pipelines.length > 1 && (
                <Popconfirm
                  title="Bạn có chắc chắn muốn xóa quy trình này?"
                  onConfirm={() => handleDeletePipeline(currentPipeline.id)}
                  okText="Xóa"
                  cancelText="Hủy"
                >
                  <Button danger type="text" icon={<DeleteOutlined />}>
                    Xóa quy trình
                  </Button>
                </Popconfirm>
              )}
            </div>

            {/* Stages Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3 w-12 text-center">STT</th>
                    <th className="p-3">Tên Giai đoạn / Cột</th>
                    <th className="p-3 w-28 text-center">Tỷ lệ (%)</th>
                    <th className="p-3 w-36 text-center">Loại trạng thái</th>
                    <th className="p-3 w-24 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {currentPipeline.stages?.map((stage, index) => (
                    <tr key={stage.id} className="hover:bg-slate-50">
                      <td className="p-3 text-center font-medium text-slate-500">{index + 1}</td>
                      <td className="p-3">
                        {editingStageId === stage.id ? (
                          <Input
                            value={stageNameInput}
                            onChange={(e) => setStageNameInput(e.target.value)}
                            onPressEnter={() => handleSaveStageEdit(stage.id)}
                            size="small"
                          />
                        ) : (
                          <span className="font-medium text-slate-800">{stage.name}</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {editingStageId === stage.id ? (
                          <InputNumber
                            min={0}
                            max={100}
                            value={stageProbInput}
                            onChange={(v) => setStageProbInput(v || 0)}
                            size="small"
                            className="w-16"
                          />
                        ) : (
                          <Tag color="purple" className="font-mono">
                            {stage.probability}%
                          </Tag>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {stage.isWon ? (
                          <Tag color="success">THÀNH CÔNG (WON)</Tag>
                        ) : stage.isLost ? (
                          <Tag color="error">THẤT BẠI (LOST)</Tag>
                        ) : (
                          <Tag color="default">Đang xử lý</Tag>
                        )}
                      </td>
                      <td className="p-3 text-right space-x-1">
                        {editingStageId === stage.id ? (
                          <Button type="link" size="small" onClick={() => handleSaveStageEdit(stage.id)}>
                            Lưu
                          </Button>
                        ) : (
                          <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => {
                              setEditingStageId(stage.id);
                              setStageNameInput(stage.name);
                              setStageProbInput(stage.probability);
                            }}
                          />
                        )}

                        <Popconfirm
                          title="Xóa cột này khỏi quy trình?"
                          onConfirm={() => handleDeleteStage(stage.id)}
                          okText="Xóa"
                          cancelText="Hủy"
                        >
                          <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Form Thêm Stage mới */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <h5 className="font-medium text-xs text-slate-700 mb-2">+ Thêm Giai đoạn / Cột mới</h5>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  placeholder="Tên cột mới (VD: Báo giá trả góp)"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  className="flex-1 min-w-[200px]"
                  size="small"
                />
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-500">Tỷ lệ:</span>
                  <InputNumber
                    min={0}
                    max={100}
                    value={newStageProb}
                    onChange={(v) => setNewStageProb(v || 0)}
                    size="small"
                    className="w-16"
                  />
                  <span className="text-xs text-slate-500">%</span>
                </div>
                <Switch
                  checkedChildren="Chốt (Won)"
                  unCheckedChildren="Tự do"
                  checked={newStageIsWon}
                  onChange={(val) => {
                    setNewStageIsWon(val);
                    if (val) setNewStageIsLost(false);
                  }}
                  size="small"
                />
                <Button type="primary" size="small" onClick={handleAddStage} className="bg-indigo-600">
                  Thêm cột
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

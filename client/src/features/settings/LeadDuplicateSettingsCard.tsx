import React, { useState, useEffect } from 'react';
import { Card, Radio, Button, Tag, notification, Spin, Alert, Checkbox } from 'antd';
import { SafetyOutlined, SettingOutlined, SplitCellsOutlined, BranchesOutlined } from '@ant-design/icons';
import { crmService } from '../../services/crmService';
import { PipelineManagementModal } from '../opportunities/PipelineManagementModal';

export const LeadDuplicateSettingsCard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<string>('LEVEL_1_STAGE_FLAG');
  const [openStageCategories, setOpenStageCategories] = useState<string[]>(['OPEN']);
  const [pipelineModalOpen, setPipelineModalOpen] = useState(false);

  const fetchRule = async () => {
    setLoading(true);
    try {
      const res: any = await crmService.getLeadDuplicateRule();
      if (res.success && res.data) {
        setMode(res.data.mode || 'LEVEL_1_STAGE_FLAG');
        setOpenStageCategories(res.data.openStageCategories || ['OPEN']);
      }
    } catch (err: any) {
      console.error('Error fetching lead duplicate rule:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRule();
  }, []);

  const handleSave = async (newMode: string, newCategories?: string[]) => {
    setSaving(true);
    try {
      const payload = {
        mode: newMode,
        openStageCategories: newCategories || openStageCategories,
      };
      const res: any = await crmService.updateLeadDuplicateRule(payload);
      if (res.success) {
        setMode(newMode);
        if (newCategories) setOpenStageCategories(newCategories);
        notification.success({
          message: 'Đã lưu cấu hình!',
          description: 'Cấu hình xử lý gộp/tạo mới Lead đã được áp dụng.',
        });
      }
    } catch (err: any) {
      notification.error({
        message: 'Không thể lưu cấu hình',
        description: err.message || 'Vui lòng thử lại sau',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card
        title={
          <div className="flex items-center gap-2">
            <SplitCellsOutlined className="text-indigo-600 text-lg" />
            <span>Cấu hình Xử lý Lead Trùng / Sản phẩm Quan tâm mới</span>
          </div>
        }
        className="shadow-xs border-slate-200 rounded-xl bg-white"
        extra={
          <Button
            type="text"
            size="small"
            icon={<SettingOutlined />}
            onClick={() => setPipelineModalOpen(true)}
            className="text-indigo-600 font-medium"
          >
            Quản lý Pipeline Stages
          </Button>
        }
      >
        <Spin spinning={loading}>
          <div className="space-y-5">
            <Alert
              type="info"
              showIcon
              message="Quy tắc xử lý khi khách hàng hiện tại quan tâm thêm Sản phẩm B"
              description="Hệ thống sẽ kiểm tra xem Lead hiện tại có đủ điều kiện gộp thêm sản phẩm quan tâm hay không, dựa trên chế độ mà Quản trị viên lựa chọn dưới đây."
              className="text-xs"
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-3">
                Chọn Chế độ Xử lý Gộp / Tạo mới Lead (Admin Rule):
              </label>

              <Radio.Group
                onChange={(e) => handleSave(e.target.value)}
                value={mode}
                className="w-full space-y-3"
              >
                {/* LEVEL 1 OPTION */}
                <div
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    mode === 'LEVEL_1_STAGE_FLAG'
                      ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                  onClick={() => handleSave('LEVEL_1_STAGE_FLAG')}
                >
                  <div className="flex items-start justify-between">
                    <Radio value="LEVEL_1_STAGE_FLAG" className="font-semibold text-slate-900 text-sm">
                      Cấp độ 1: Cấu hình theo cờ từng Bước trong Pipeline (Stage-Level Flag)
                    </Radio>
                    <Tag color="indigo">Khuyên dùng</Tag>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 pl-6">
                    Admin tích chọn trực tiếp nút <span className="font-semibold text-slate-700">"Cho phép gộp Lead"</span> ở từng cột trong Màn hình Quản lý Pipeline. Nếu Lead đang ở cột có bật gộp $\rightarrow$ Hệ thống tự động gộp SP B vào Lead A. Nếu ở cột tắt gộp $\rightarrow$ Tự động tạo Lead B mới.
                  </p>
                </div>

                {/* LEVEL 2 OPTION */}
                <div
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    mode === 'LEVEL_2_STAGE_CATEGORY'
                      ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                  onClick={() => handleSave('LEVEL_2_STAGE_CATEGORY')}
                >
                  <div className="flex items-start justify-between">
                    <Radio value="LEVEL_2_STAGE_CATEGORY" className="font-semibold text-slate-900 text-sm">
                      Cấp độ 2: Phân loại theo Nhóm Giai đoạn Vòng đời (Stage Category)
                    </Radio>
                    <Tag color="purple">Tự động hóa</Tag>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 pl-6 mb-2">
                    Hệ thống dựa vào Nhóm giai đoạn (`OPEN` - Đầu quy trình, `ADVANCED` - Đã báo giá/muộn, `CLOSED` - Đã đóng). Lead ở giai đoạn Đầu sẽ được GỘP; Lead ở giai đoạn Muộn hoặc Đã đóng sẽ TẠO LEAD MỚI.
                  </p>
                  
                  {mode === 'LEVEL_2_STAGE_CATEGORY' && (
                    <div className="pl-6 pt-2 border-t border-indigo-100 flex items-center gap-3">
                      <span className="text-xs text-slate-600 font-medium">Nhóm Giai đoạn được phép Gộp:</span>
                      <Checkbox
                        checked={openStageCategories.includes('OPEN')}
                        onChange={(e) => {
                          const newCats = e.target.checked
                            ? [...openStageCategories, 'OPEN']
                            : openStageCategories.filter((c) => c !== 'OPEN');
                          handleSave('LEVEL_2_STAGE_CATEGORY', newCats);
                        }}
                      >
                        <Tag color="green">Đầu quy trình (OPEN)</Tag>
                      </Checkbox>
                    </div>
                  )}
                </div>

                {/* ALWAYS MERGE */}
                <div
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    mode === 'ALWAYS_MERGE'
                      ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                  onClick={() => handleSave('ALWAYS_MERGE')}
                >
                  <Radio value="ALWAYS_MERGE" className="font-medium text-slate-800 text-xs">
                    Luôn luôn gộp vào Lead cũ đang mở (Không phân biệt Giai đoạn)
                  </Radio>
                </div>

                {/* ALWAYS NEW */}
                <div
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    mode === 'ALWAYS_NEW'
                      ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                  onClick={() => handleSave('ALWAYS_NEW')}
                >
                  <Radio value="ALWAYS_NEW" className="font-medium text-slate-800 text-xs">
                    Luôn luôn tạo Lead mới cho mỗi nhu cầu sản phẩm mới
                  </Radio>
                </div>
              </Radio.Group>
            </div>
          </div>
        </Spin>
      </Card>

      <PipelineManagementModal
        open={pipelineModalOpen}
        onClose={() => setPipelineModalOpen(false)}
        onPipelinesUpdated={() => {}}
      />
    </>
  );
};

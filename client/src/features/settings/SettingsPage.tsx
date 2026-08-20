import React, { useEffect, useState } from 'react';
import { Card, Tag, Alert, Radio, Typography, Input, Button, message, Select } from 'antd';
import { GlobalOutlined, UserOutlined, LinkOutlined, SaveOutlined, ShopOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { LeadDuplicateSettingsCard } from './LeadDuplicateSettingsCard';
import { ApiKeySettingsCard } from './ApiKeySettingsCard';
import { crmService } from '../../services/crmService';

const { Title, Text } = Typography;

export const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, businesses, activeBiz, switchBiz } = useAuthStore();
  const { defaultEntityType, setDefaultEntityType } = useSettingsStore();

  // Demo Industry Switcher state
  const [currentIndustry, setCurrentIndustry] = useState<string>(
    localStorage.getItem('crm_demo_industry') || 'xedien'
  );
  const [switchingDemo, setSwitchingDemo] = useState(false);

  // Smax.ai Biz Slug setting
  const [smaxBizSlug, setSmaxBizSlug] = useState('');
  const [savingSlug, setSavingSlug] = useState(false);

  const handleSwitchBiz = (newBizId: string) => {
    const match = businesses.find((b) => b.id === newBizId);
    if (match) {
      switchBiz(newBizId);
      navigate(`/${match.slug}/settings`);
    }
  };

  const handleSwitchDemo = async (value: string) => {
    setSwitchingDemo(true);
    const hideMessage = message.loading('Đang chuyển đổi dữ liệu ngành...', 0);
    try {
      const res: any = await crmService.switchDemoIndustry(value);
      hideMessage();
      if (res.success && res.data) {
        const industryName = res.data.industryName || res.data.name || value;
        setCurrentIndustry(value);
        localStorage.setItem('crm_demo_industry', value);
        message.success(`Đã đổi dữ liệu demo sang: ${industryName}`);
        setTimeout(() => {
          window.location.reload();
        }, 600);
      }
    } catch (err: any) {
      hideMessage();
      message.error(err?.message || 'Không thể chuyển đổi dữ liệu demo');
    } finally {
      setSwitchingDemo(false);
    }
  };

  useEffect(() => {
    crmService.getSmaxBizSlug().then((res: any) => {
      if (res.success && res.data?.slug) setSmaxBizSlug(res.data.slug);
    }).catch(() => {});
  }, []);

  const handleSaveSmaxBizSlug = async () => {
    if (!smaxBizSlug.trim()) {
      message.warning('Vui lòng nhập Smax.ai Business Slug');
      return;
    }
    setSavingSlug(true);
    try {
      const res: any = await crmService.updateSmaxBizSlug(smaxBizSlug.trim());
      if (res.success) {
        setSmaxBizSlug(res.data.slug);
        message.success('Đã lưu Smax.ai Business Slug thành công!');
      }
    } catch (err: any) {
      message.error(err?.message || 'Không thể lưu Smax.ai Business Slug');
    } finally {
      setSavingSlug(false);
    }
  };

  const handleLanguageChange = (e: any) => {
    const lang = e.target.value;
    i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('settings.title')}</h1>
        <p className="text-sm text-slate-500">{t('settings.general')}</p>
      </div>

      {/* Multi-Tenant Business Switcher & Demo Industry Card */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <ShopOutlined className="text-indigo-600" />
            <span>Doanh nghiệp & Dữ liệu Ngành Demo</span>
          </div>
        }
        className="shadow-xs border-slate-200 rounded-xl bg-white"
      >
        <div className="space-y-4">
          {/* Multi-tenant Business Switcher */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              🏢 Doanh nghiệp đang hoạt động (Multi-Tenant Workspace)
            </label>
            <Select
              value={activeBiz?.id}
              onChange={handleSwitchBiz}
              size="large"
              className="w-full font-semibold text-sm"
              options={businesses.map((b: any) => ({
                value: b.id,
                label: `${b.name} (/${b.slug}) - Gói: ${b.plan}`,
              }))}
            />
          </div>

          {/* Demo Industry Switcher */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ⚡ Chuyển đổi Dữ liệu Ngành Demo
            </label>
            <Select
              value={currentIndustry}
              onChange={handleSwitchDemo}
              loading={switchingDemo}
              disabled={switchingDemo}
              size="large"
              className="w-full font-semibold text-sm"
              options={[
                { value: 'xedien', label: '🚲 Xe Điện MOVE (Bán lẻ Showroom B2C)' },
                { value: 'software', label: '💻 Phần Mềm B2B (Giải pháp Doanh nghiệp)' },
                { value: 'batdongsan', label: '🏢 Bất Động Sản (Dự án & Căn hộ)' },
                { value: 'tienganh', label: '🎓 Tiếng Anh ILA (Khóa học & Trung tâm)' },
              ]}
            />
            <p className="text-xs text-slate-400 mt-1">
              💡 Chuyển đổi dữ liệu ngành demo sẽ reset và nạp bộ dữ liệu mẫu chuẩn của ngành tương ứng cho Doanh nghiệp hiện tại.
            </p>
          </div>
        </div>
      </Card>


      {/* Smax.ai Business Slug Card */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <LinkOutlined className="text-indigo-600" />
            <span>{t('settings.smaxBizSlugTitle')}</span>
          </div>
        }
        className="shadow-xs border-slate-200 rounded-xl bg-white"
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-500">{t('settings.smaxBizSlugDesc')}</p>
          <div className="flex gap-2">
            <Input
              id="smax-biz-slug-input"
              prefix={<LinkOutlined className="text-slate-400" />}
              placeholder="Ví dụ: xe-dien-move"
              value={smaxBizSlug}
              onChange={(e) => setSmaxBizSlug(e.target.value)}
              onPressEnter={handleSaveSmaxBizSlug}
              allowClear
              size="large"
            />
            <Button
              id="smax-biz-slug-save-btn"
              type="primary"
              icon={<SaveOutlined />}
              loading={savingSlug}
              onClick={handleSaveSmaxBizSlug}
              size="large"
              className="bg-indigo-600"
            >
              Lưu
            </Button>
          </div>
          <p className="text-xs text-slate-400">
            💡 Slug này được dùng tự động khi xem hội thoại Smax.ai từ mã PSID không có đường dẫn đầy đủ.
          </p>
        </div>
      </Card>

      {/* API Key / Webhook Access Tokens Card */}
      <ApiKeySettingsCard />

      {/* Admin Lead Duplicate & Merge Rules Card */}
      <LeadDuplicateSettingsCard />

      {/* Default Entity Type Settings Card */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <UserOutlined className="text-indigo-600" />
            <span>{t('settings.defaultEntityTypeTitle')}</span>
          </div>
        }
        className="shadow-xs border-slate-200 rounded-xl bg-white"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">{t('settings.defaultEntityTypeDesc')}</p>
          <Radio.Group
            onChange={(e) => setDefaultEntityType(e.target.value)}
            value={defaultEntityType}
            optionType="button"
            buttonStyle="solid"
            size="large"
            className="w-full grid grid-cols-2 gap-3"
          >
            <Radio.Button value="CONTACT" className="text-center font-medium rounded-lg">
              {t('settings.contactOption')}
            </Radio.Button>
            <Radio.Button value="COMPANY" className="text-center font-medium rounded-lg">
              {t('settings.companyOption')}
            </Radio.Button>
          </Radio.Group>
        </div>
      </Card>

      {/* Language Selection Card */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <GlobalOutlined className="text-indigo-600" />
            <span>{t('settings.language')}</span>
          </div>
        }
        className="shadow-xs border-slate-200 rounded-xl bg-white"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-500">{t('settings.languageDesc')}</p>
          <Radio.Group
            onChange={handleLanguageChange}
            value={i18n.language.startsWith('vi') ? 'vi' : 'en'}
            optionType="button"
            buttonStyle="solid"
            size="large"
            className="w-full grid grid-cols-2 gap-3"
          >
            <Radio.Button value="vi" className="text-center font-medium rounded-lg">
              🇻🇳 {t('settings.vietnamese')}
            </Radio.Button>
            <Radio.Button value="en" className="text-center font-medium rounded-lg">
              🇺🇸 {t('settings.english')}
            </Radio.Button>
          </Radio.Group>
        </div>
      </Card>

      {/* User Profile Card */}
      <Card title={t('settings.profile')} className="shadow-xs border-slate-200 rounded-xl bg-white">
        <div className="space-y-3 text-sm">
          <div>
            <span className="text-slate-400 font-medium block text-xs">Mã người dùng (User ID)</span>
            <span className="font-mono text-slate-800">{user?.id}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block text-xs">Họ và tên</span>
            <span className="font-bold text-slate-900">{user?.firstName} {user?.lastName}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block text-xs">Email</span>
            <span className="text-slate-800">{user?.email}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block text-xs">Vai trò</span>
            <div className="flex gap-1 mt-1">
              {user?.roles ? (
                user.roles.map((r) => <Tag key={r} color="purple">{r}</Tag>)
              ) : (
                <Tag color="purple">SALES</Tag>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Alert
        message="Trạng thái hệ thống"
        description="Backend kết nối Express + Node + TypeScript + Prisma ORM + BullMQ automation workers."
        type="info"
        showIcon
        className="rounded-xl"
      />
    </div>
  );
};

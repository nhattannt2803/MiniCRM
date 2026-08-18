import React from 'react';
import { Card, Tag, Alert, Radio, Typography } from 'antd';
import { GlobalOutlined, UserOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { LeadDuplicateSettingsCard } from './LeadDuplicateSettingsCard';

const { Title, Text } = Typography;

export const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const { defaultEntityType, setDefaultEntityType } = useSettingsStore();

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

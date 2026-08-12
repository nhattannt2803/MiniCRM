import React from 'react';
import { Timeline, Tag, Card } from 'antd';
import { PhoneOutlined, MailOutlined, TeamOutlined, FileTextOutlined, DesktopOutlined, MessageOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { Activity } from '../../types';

interface ActivityTimelineProps {
  activities: Activity[];
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ activities }) => {
  const { t, i18n } = useTranslation();

  const getIcon = (type: string) => {
    switch (type) {
      case 'CALL':
        return <PhoneOutlined className="text-blue-500 text-base" />;
      case 'EMAIL':
        return <MailOutlined className="text-purple-500 text-base" />;
      case 'MEETING':
        return <TeamOutlined className="text-green-500 text-base" />;
      case 'DEMO':
        return <DesktopOutlined className="text-amber-500 text-base" />;
      case 'SMS':
        return <MessageOutlined className="text-indigo-500 text-base" />;
      default:
        return <FileTextOutlined className="text-gray-500 text-base" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'CALL': return 'blue';
      case 'EMAIL': return 'purple';
      case 'MEETING': return 'green';
      case 'DEMO': return 'gold';
      case 'SMS': return 'cyan';
      default: return 'default';
    }
  };

  if (!activities || activities.length === 0) {
    return <div className="text-gray-400 py-6 text-center text-sm">{t('common.noData')}</div>;
  }

  return (
    <Timeline
      mode="left"
      items={activities.map((act) => ({
        dot: getIcon(act.type),
        children: (
          <Card size="small" className="shadow-xs mb-2 border-gray-100 bg-white">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Tag color={getTypeColor(act.type)} className="font-semibold">{act.type}</Tag>
                <span className="font-semibold text-gray-800 text-sm">{act.subject}</span>
              </div>
              <span className="text-xs text-gray-400">
                {new Date(act.createdAt).toLocaleString(i18n.language === 'vi' ? 'vi-VN' : 'en-US')}
              </span>
            </div>
            {act.description && (
              <p className="text-xs text-gray-600 mt-1 mb-1 whitespace-pre-wrap">{act.description}</p>
            )}
            {act.owner && (
              <div className="text-xs text-gray-400 text-right font-medium">
                {t('common.by')} {act.owner.firstName} {act.owner.lastName}
              </div>
            )}
          </Card>
        ),
      }))}
    />
  );
};

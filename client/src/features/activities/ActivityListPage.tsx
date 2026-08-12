import React, { useState, useEffect } from 'react';
import { Card } from 'antd';
import { useTranslation } from 'react-i18next';
import { crmService } from '../../services/crmService';
import { Activity } from '../../types';
import { ActivityTimeline } from '../../components/Timeline/ActivityTimeline';

export const ActivityListPage: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    crmService.getActivities().then((res: any) => {
      if (res.success) setActivities(res.data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('activities.title')}</h1>
        <p className="text-sm text-slate-500">Lịch sử toàn bộ các cuộc gọi, email, cuộc họp và tương tác</p>
      </div>

      <Card className="shadow-xs border-slate-200 rounded-xl bg-white">
        <ActivityTimeline activities={activities} />
      </Card>
    </div>
  );
};

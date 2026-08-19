import React from 'react';
import { ApiKeySettingsCard } from './ApiKeySettingsCard';

export const ApiKeyPage: React.FC = () => {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">🔑 Quản lý API Key / Webhook Access Tokens</h1>
        <p className="text-sm text-slate-500">
          Cấp và thu hồi mã API Key bảo mật cho các hệ thống bên thứ ba (Make, Zapier, Chatbot, Smax.ai, Landing Page) gọi API tạo/CRUD Lead.
        </p>
      </div>

      <ApiKeySettingsCard />
    </div>
  );
};

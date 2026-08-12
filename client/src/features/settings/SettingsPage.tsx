import React from 'react';
import { Card, Tag, Alert } from 'antd';
import { useAuthStore } from '../../stores/authStore';

export const SettingsPage: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Settings & Architecture</h1>
        <p className="text-sm text-slate-500">System configuration and user profile information</p>
      </div>

      <Card title="User Profile Information" className="shadow-xs border-slate-200 rounded-xl bg-white">
        <div className="space-y-3 text-sm">
          <div>
            <span className="text-slate-400 font-medium block text-xs">User ID</span>
            <span className="font-mono text-slate-800">{user?.id}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block text-xs">Full Name</span>
            <span className="font-bold text-slate-900">{user?.firstName} {user?.lastName}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block text-xs">Email</span>
            <span className="text-slate-800">{user?.email}</span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block text-xs">Assigned Roles</span>
            <div className="flex gap-1 mt-1">
              {user?.roles.map((r) => (
                <Tag key={r} color="purple">{r}</Tag>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Alert
        message="Architecture Status"
        description="Backend running Express + Node + TypeScript + Prisma ORM + Outbox Pattern + BullMQ background automation workers."
        type="info"
        showIcon
        className="rounded-xl"
      />
    </div>
  );
};

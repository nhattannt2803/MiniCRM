import React, { useState } from 'react';
import { Card, Form, Input, Button, Alert, Tag } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';

export const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { t } = useTranslation();
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleFinish = async (values: any) => {
    setLoading(true);
    setError(null);
    try {
      await login(values.email, values.password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || t('auth.loginError'));
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (email: string) => {
    handleFinish({ email, password: 'password123' });
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-none rounded-2xl bg-white/95 backdrop-blur-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-black text-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            M
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('auth.loginTitle')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('auth.loginSubtitle')}</p>
        </div>

        {error && (
          <Alert message={error} type="error" showIcon className="mb-4 rounded-lg" />
        )}

        <Form layout="vertical" onFinish={handleFinish} requiredMark={false}>
          <Form.Item
            name="email"
            rules={[{ required: true, message: t('auth.emailLabel') }]}
          >
            <Input
              prefix={<UserOutlined className="text-slate-400" />}
              placeholder={t('auth.emailPlaceholder')}
              size="large"
              className="rounded-lg"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: t('auth.passwordLabel') }]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-slate-400" />}
              placeholder={t('auth.passwordPlaceholder')}
              size="large"
              className="rounded-lg"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              className="bg-indigo-600 hover:bg-indigo-500 font-semibold rounded-lg h-11"
            >
              {t('auth.loginButton')}
            </Button>
          </Form.Item>
        </Form>

        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
          <div className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">

          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Tag
              color="purple"
              className="cursor-pointer hover:opacity-80 py-1 px-2 font-medium"
              onClick={() => quickLogin('admin@example.com')}
            >
              Admin
            </Tag>
            <Tag
              color="blue"
              className="cursor-pointer hover:opacity-80 py-1 px-2 font-medium"
              onClick={() => quickLogin('sales1@example.com')}
            >
              Sales 1
            </Tag>
            <Tag
              color="cyan"
              className="cursor-pointer hover:opacity-80 py-1 px-2 font-medium"
              onClick={() => quickLogin('sales2@example.com')}
            >
              Sales 2
            </Tag>
            <Tag
              color="green"
              className="cursor-pointer hover:opacity-80 py-1 px-2 font-medium"
              onClick={() => quickLogin('manager@example.com')}
            >
              Manager
            </Tag>
          </div>
        </div>
      </Card>
    </div>
  );
};

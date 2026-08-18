import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined, SafetyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

const { Title, Text } = Typography;

export const RegisterPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();
  const navigate = useNavigate();

  const onFinish = async (values: any) => {
    if (values.password !== values.confirmPassword) {
      return message.error('Mật khẩu nhập lại không khớp!');
    }
    setLoading(true);
    try {
      const data = await register({
        email: values.email,
        pass: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
      });

      message.success('Đăng ký tài khoản thành công!');
      
      if (data?.businesses && data.businesses.length > 0) {
        navigate('/dashboard');
      } else {
        navigate('/no-business');
      }
    } catch (err: any) {
      message.error(err?.message || 'Đăng ký thất bại, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-slate-800 bg-white/95 backdrop-blur-md rounded-2xl p-4">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl font-black shadow-lg mb-3">
            M
          </div>
          <Title level={3} className="!mb-1 tracking-tight text-slate-900 font-extrabold">
            Đăng Ký Tài Khoản Hệ Thống
          </Title>
          <Text type="secondary" className="text-xs">
            Cổng đăng ký người dùng mới — MiniCRM SaaS Platform
          </Text>
        </div>

        <Form layout="vertical" onFinish={onFinish} size="large">
          <div className="grid grid-cols-2 gap-3">
            <Form.Item
              name="lastName"
              label={<span className="text-xs font-semibold text-slate-700">Họ & Tên lót</span>}
              rules={[{ required: true, message: 'Vui lòng nhập Họ' }]}
            >
              <Input placeholder="Nguyễn Văn" className="rounded-xl text-sm" />
            </Form.Item>
            <Form.Item
              name="firstName"
              label={<span className="text-xs font-semibold text-slate-700">Tên</span>}
              rules={[{ required: true, message: 'Vui lòng nhập Tên' }]}
            >
              <Input placeholder="An" className="rounded-xl text-sm" />
            </Form.Item>
          </div>

          <Form.Item
            name="email"
            label={<span className="text-xs font-semibold text-slate-700">Địa chỉ Email</span>}
            rules={[
              { required: true, message: 'Vui lòng nhập Email' },
              { type: 'email', message: 'Email không hợp lệ' },
            ]}
          >
            <Input prefix={<MailOutlined className="text-slate-400" />} placeholder="user@company.com" className="rounded-xl text-sm" />
          </Form.Item>

          <Form.Item
            name="phone"
            label={<span className="text-xs font-semibold text-slate-700">Số điện thoại (tùy chọn)</span>}
          >
            <Input prefix={<PhoneOutlined className="text-slate-400" />} placeholder="0901234567" className="rounded-xl text-sm" />
          </Form.Item>

          <Form.Item
            name="password"
            label={<span className="text-xs font-semibold text-slate-700">Mật khẩu</span>}
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu (tối thiểu 6 ký tự)', min: 6 }]}
          >
            <Input.Password prefix={<LockOutlined className="text-slate-400" />} placeholder="••••••••" className="rounded-xl text-sm" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label={<span className="text-xs font-semibold text-slate-700">Xác nhận mật khẩu</span>}
            rules={[{ required: true, message: 'Vui lòng nhập lại mật khẩu' }]}
          >
            <Input.Password prefix={<SafetyOutlined className="text-slate-400" />} placeholder="••••••••" className="rounded-xl text-sm" />
          </Form.Item>

          <Form.Item className="mt-6 mb-2">
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 rounded-xl text-base shadow-lg border-none"
            >
              Hoàn Tất Đăng Ký
            </Button>
          </Form.Item>
        </Form>

        <div className="text-center mt-4">
          <Button type="link" onClick={() => navigate('/login')} className="text-xs text-indigo-600 font-semibold p-0">
            Đã có tài khoản? Đăng nhập ngay
          </Button>
        </div>
      </Card>
    </div>
  );
};

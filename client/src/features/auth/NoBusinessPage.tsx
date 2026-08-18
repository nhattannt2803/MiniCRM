import React from 'react';
import { Card, Button, Typography, Result, Tag } from 'antd';
import { ShopOutlined, LogoutOutlined, MailOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';

const { Title, Paragraph, Text } = Typography;

export const NoBusinessPage: React.FC = () => {
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-2xl border-slate-800 bg-white/95 backdrop-blur-md rounded-2xl p-6">
        <Result
          icon={
            <div className="w-20 h-20 bg-indigo-50 border-2 border-indigo-100 rounded-3xl mx-auto flex items-center justify-center text-indigo-600 text-3xl shadow-inner">
              <ShopOutlined />
            </div>
          }
          title={
            <Title level={3} className="!mb-1 text-slate-900 font-extrabold tracking-tight">
              Tài Khoản Đang Chờ Mời Vào Doanh Nghiệp
            </Title>
          }
          subTitle={
            <Paragraph className="text-slate-600 text-sm mt-2">
              Xin chào <strong className="text-slate-900">{user?.lastName} {user?.firstName}</strong>! Tài khoản của bạn đã được đăng ký thành công trên hệ thống.
            </Paragraph>
          }
        />

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <SafetyCertificateOutlined className="text-indigo-600" />
            <Text className="font-semibold text-xs text-slate-800">Thông tin tài khoản hệ thống:</Text>
          </div>
          <div className="text-xs text-slate-600 space-y-1 pl-6">
            <div>• <strong>Email đăng ký:</strong> {user?.email}</div>
            <div>• <strong>Trạng thái hệ thống:</strong> <Tag color="green">Đã kích hoạt</Tag></div>
            <div>• <strong>Doanh nghiệp (Biz):</strong> <Tag color="gold">Chưa tham gia Biz nào</Tag></div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <Text className="font-semibold text-amber-900 text-xs block mb-1">💡 Hướng dẫn tiếp theo:</Text>
          <Text className="text-amber-800 text-xs block">
            Vui lòng cung cấp email <strong>{user?.email}</strong> cho Quản trị viên (Admin) Doanh nghiệp của bạn. Admin sẽ thực hiện gửi lời mời tham gia Doanh nghiệp. Sau khi được mời, hệ thống sẽ tự động mở quyền truy cập CRM cho bạn!
          </Text>
        </div>

        <div className="flex justify-center gap-3">
          <Button
            type="default"
            icon={<LogoutOutlined />}
            onClick={logout}
            className="rounded-xl h-10 px-6 font-medium border-slate-300"
          >
            Đăng xuất
          </Button>
          <Button
            type="primary"
            icon={<MailOutlined />}
            onClick={() => window.location.reload()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl h-10 px-6 border-none"
          >
            Tải lại trang (Kiểm tra lời mời)
          </Button>
        </div>
      </Card>
    </div>
  );
};

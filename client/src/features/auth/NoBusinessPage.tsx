import React from 'react';
import { Card, Button, Typography, Result, Tag } from 'antd';
import { ShopOutlined, LogoutOutlined, MailOutlined, SafetyCertificateOutlined, CrownOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

const { Title, Paragraph, Text } = Typography;

export const NoBusinessPage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-xl shadow-2xl border-slate-800 bg-white/95 backdrop-blur-md rounded-2xl p-6">
        <Result
          icon={
            <div className="w-20 h-20 bg-indigo-50 border-2 border-indigo-100 rounded-3xl mx-auto flex items-center justify-center text-indigo-600 text-3xl shadow-inner">
              {user?.isSuperAdmin ? <CrownOutlined className="text-purple-600" /> : <ShopOutlined />}
            </div>
          }
          title={
            <Title level={3} className="!mb-1 text-slate-900 font-extrabold tracking-tight">
              {user?.isSuperAdmin ? 'Tài Khoản Quản Trị Hệ Thống (Super Admin)' : 'Tài Khoản Đang Chờ Mời Vào Doanh Nghiệp'}
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
          <div className="text-xs text-slate-600 space-y-1.5 pl-6">
            <div>• <strong>Email đăng ký:</strong> {user?.email}</div>
            <div>• <strong>Trạng thái hệ thống:</strong> <Tag color="green">Đã kích hoạt</Tag></div>
            <div>
              • <strong>Phân quyền toàn hệ thống:</strong>{' '}
              {user?.isSuperAdmin ? (
                <Tag color="purple" className="font-bold">🛡️ SUPER ADMIN (Toàn SaaS)</Tag>
              ) : (
                <Tag color="blue">Standard User</Tag>
              )}
            </div>
            <div>• <strong>Doanh nghiệp (Biz):</strong> <Tag color="gold">Chưa tham gia Biz nào</Tag></div>
          </div>
        </div>

        {/* Super Admin Special Banner */}
        {user?.isSuperAdmin ? (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
            <Text className="font-bold text-purple-950 text-xs block mb-1">👑 Quyền Quản Trị Super Admin:</Text>
            <Text className="text-purple-900 text-xs block mb-3">
              Tài khoản của bạn có đặc quyền Quản Trị Viên Hệ Thống. Bạn có thể truy cập Cổng Quản Trị Hệ Thống độc lập để xem, quản lý và cấp quyền Super User cho tất cả người dùng mà không cần thuộc bất kỳ Doanh nghiệp nào!
            </Text>
            <Button
              type="primary"
              icon={<CrownOutlined />}
              onClick={() => navigate('/system/users')}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold h-11 rounded-xl border-none shadow-md"
            >
              Truy Cấp Cổng Quản Trị Hệ Thống (System Admin Portal)
            </Button>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <Text className="font-semibold text-amber-900 text-xs block mb-1">💡 Hướng dẫn tiếp theo:</Text>
            <Text className="text-amber-800 text-xs block">
              Vui lòng cung cấp email <strong>{user?.email}</strong> cho Quản trị viên (Admin) Doanh nghiệp của bạn. Admin sẽ thực hiện gửi lời mời tham gia Doanh nghiệp. Sau khi được mời, hệ thống sẽ tự động mở quyền truy cập CRM cho bạn!
            </Text>
          </div>
        )}

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

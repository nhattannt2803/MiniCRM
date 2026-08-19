import React, { useState, useEffect, useRef } from 'react';
import { Drawer, Form, Input, Select, Radio, Button, Alert, DatePicker, notification } from 'antd';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { crmService } from '../../services/crmService';
import { User } from '../../types';
import { useSettingsStore } from '../../stores/settingsStore';
import { parseFbPsidInput, parseZaloUidInput } from '../../utils/identityHelper';

interface QuickCreateLeadModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const QuickCreateLeadModal: React.FC<QuickCreateLeadModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const { t } = useTranslation();
  const { defaultEntityType } = useSettingsStore();

  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [entityType, setEntityType] = useState<'CONTACT' | 'COMPANY'>(defaultEntityType);
  const [identityResult, setIdentityResult] = useState<any>(null);

  const [fetchingSmax, setFetchingSmax] = useState(false);
  const lastFetchedSmaxUrlRef = useRef<string>('');

  const handleFetchSmaxThread = async (url: string) => {
    if (!url || !url.trim().includes('smax.ai')) return;
    const trimmed = url.trim();
    if (trimmed === lastFetchedSmaxUrlRef.current) return;

    lastFetchedSmaxUrlRef.current = trimmed;
    setFetchingSmax(true);
    try {
      const res: any = await crmService.fetchSmaxThread(trimmed);
      if (res.success && res.data) {
        const { name, phone, fbPsid, fbPageId, fbPageName, source, adId, adIds } = res.data;
        const currentPhone = form.getFieldValue('phone');
        const currentFbPsid = form.getFieldValue('fbPsid');
        const currentAdIds = form.getFieldValue('adIds') || [];

        const extractedAds = adIds || (adId ? [adId] : []);
        const mergedAdIds = Array.from(new Set([...currentAdIds, ...extractedAds]));

        form.setFieldsValue({
          firstName: name || form.getFieldValue('firstName'),
          phone: phone || currentPhone,
          fbPsid: fbPsid || currentFbPsid,
          fbPageId: fbPageId || form.getFieldValue('fbPageId'),
          fbPageName: fbPageName || form.getFieldValue('fbPageName'),
          source: source || (extractedAds.length > 0 ? 'FB_ADS' : 'FACEBOOK'),
          adIds: mergedAdIds,
        });

        notification.success({
          message: 'Đã tự động lấy thông tin từ Smax.ai!',
          description: `Tên: ${name || '—'} | SĐT: ${phone || '—'} | PSID: ${fbPsid || '—'}${fbPageName ? ` | Page: ${fbPageName}` : ''}${extractedAds.length > 0 ? ` | Ad ID: ${extractedAds.join(', ')}` : ''}`,
        });

        setTimeout(() => {
          handleIdentityBlur();
        }, 200);
      }
    } catch (err: any) {
      notification.error({
        message: 'Lỗi lấy dữ liệu từ Smax.ai',
        description: err.message || 'Vui lòng kiểm tra lại đường dẫn hội thoại Smax.ai',
      });
    } finally {
      setFetchingSmax(false);
    }
  };

  useEffect(() => {
    if (visible) {
      setEntityType(defaultEntityType);
      setIdentityResult(null);
      form.resetFields();
      form.setFieldsValue({ receivedAt: dayjs() });
      crmService
        .getUsers()
        .then((res: any) => {
          if (res.success) setUsers(res.data);
        })
        .catch(() => {});

      crmService
        .getProducts()
        .then((res: any) => {
          if (res.success) setProducts(res.data);
        })
        .catch(() => {});
    }
  }, [visible, defaultEntityType, form]);

  const handleIdentityBlur = async () => {
    const phone = form.getFieldValue('phone');
    const email = form.getFieldValue('email');
    const rawFb = form.getFieldValue('fbPsid');
    const parsedFb = parseFbPsidInput(rawFb);
    if (parsedFb && parsedFb !== rawFb) {
      form.setFieldsValue({ fbPsid: parsedFb });
    }
    const fbPsid = parsedFb || rawFb;

    const rawZalo = form.getFieldValue('zaloUid');
    const parsedZalo = parseZaloUidInput(rawZalo);
    if (parsedZalo && parsedZalo !== rawZalo) {
      form.setFieldsValue({ zaloUid: parsedZalo });
    }
    const zaloUid = parsedZalo || rawZalo;
    const firstName = form.getFieldValue('firstName') || '';
    const lastName = form.getFieldValue('lastName') || '';

    // Auto select Lead Source based on which identity field was filled first (unless already set to FB_ADS)
    const currentSource = form.getFieldValue('source');
    const hasFb = Boolean(fbPsid && fbPsid.trim());
    const hasZalo = Boolean(zaloUid && zaloUid.trim());

    if (currentSource !== 'FB_ADS' && currentSource !== 'FACEBOOK_ADS') {
      if (hasFb && !hasZalo) {
        form.setFieldsValue({ source: 'FACEBOOK' });
      } else if (hasZalo && !hasFb) {
        form.setFieldsValue({ source: 'ZALO' });
      }
    }

    if (
      (phone && phone.length >= 6) ||
      (email && email.includes('@')) ||
      (fbPsid && fbPsid.trim().length >= 3) ||
      (zaloUid && zaloUid.trim().length >= 3)
    ) {
      try {
        const res: any = await crmService.checkIdentity({
          phone,
          email,
          fbPsid,
          zaloUid,
          name: `${firstName} ${lastName}`.trim(),
        });
        if (res.success) {
          setIdentityResult(res.data);
          if (res.data.status === 'MATCHED') {
            const fieldsToUpdate: any = {};
            if (res.data.matchedLastName) fieldsToUpdate.lastName = res.data.matchedLastName;
            if (res.data.matchedFirstName) fieldsToUpdate.firstName = res.data.matchedFirstName;
            if (res.data.matchedCompanyName) fieldsToUpdate.companyName = res.data.matchedCompanyName;
            form.setFieldsValue(fieldsToUpdate);
          }
        }
      } catch (err) {
        console.error('Identity check error:', err);
      }
    }
  };

  const handleSaveLead = async (values: any) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        receivedAt: values.receivedAt ? values.receivedAt.toISOString() : undefined,
        customerId: identityResult?.status === 'MATCHED' ? identityResult.matchedCustomerId : undefined,
      };
      const res: any = await crmService.createLead(payload);
      if (res.success) {
        if (res.data.identityResolutionResult?.status === 'POTENTIAL_DUPLICATE') {
          notification.warning({
            message: 'Cảnh báo Trùng số Điện thoại',
            description: 'Lead đã được tạo nhưng gắn cờ Nghi trùng số để quản lý xác minh!',
          });
        } else {
          notification.success({ message: t('common.success'), description: t('leads.addLead') });
        }
        form.resetFields();
        setIdentityResult(null);
        onClose();
        if (onSuccess) onSuccess();
        window.dispatchEvent(new CustomEvent('leadCreated'));
      }
    } catch (err: any) {
      notification.error({ message: t('common.error'), description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      title={<span className="font-bold text-slate-900 text-lg">⚡ Tạo Lead Mới</span>}
      open={visible}
      onClose={onClose}
      width={480}
      extra={
        <Button
          type="primary"
          onClick={() => form.submit()}
          loading={loading}
          className="bg-indigo-600 hover:bg-indigo-700 font-semibold"
        >
          {t('common.save')}
        </Button>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleSaveLead}>
        <Form.Item
          name="smaxUrl"
          label="💬 Link hội thoại Chat Smax.ai (Tự động điền)"
          extra="Dán link hội thoại Smax.ai (VD: https://smax.ai/bizs/.../chats/...) để tự động điền Tên khách, SĐT & FB PSID"
        >
          <Input
            placeholder="https://smax.ai/bizs/xe-dien-move/chats/fb760420303821103?tid=fb27040617945611633"
            onChange={(e) => handleFetchSmaxThread(e.target.value)}
            allowClear
          />
        </Form.Item>

        <Form.Item name="receivedAt" label="📅 Ngày tiếp cận" tooltip="Mặc định là thời gian hiện tại.">
          <DatePicker showTime format="DD/MM/YYYY HH:mm" className="w-full" />
        </Form.Item>

        <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <label className="block text-xs font-semibold text-slate-600 mb-2">Loại hình Lead:</label>
          <Radio.Group
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            buttonStyle="solid"
            className="w-full grid grid-cols-2"
          >
            <Radio.Button value="CONTACT" className="text-center font-medium">
              👤 Cá nhân (Contact)
            </Radio.Button>
            <Radio.Button value="COMPANY" className="text-center font-medium">
              🏢 Doanh nghiệp (Company)
            </Radio.Button>
          </Radio.Group>
        </div>

        {identityResult && identityResult.status === 'MATCHED' && (
          <Alert
            type="success"
            showIcon
            message="Khớp Customer thành công!"
            description={`Số điện thoại/Email trùng với Customer ${identityResult.matchedCustomerName} (${identityResult.matchedCustomerCode}). Lead này sẽ được gắn trực tiếp vào Customer!`}
            className="mb-4"
          />
        )}

        {identityResult && identityResult.status === 'POTENTIAL_DUPLICATE' && (
          <Alert
            type="warning"
            showIcon
            message="Cảnh báo Trùng số Điện thoại (Potential Duplicate)"
            description={`Số điện thoại đã thuộc về Customer '${identityResult.matchedCustomerName}' (${identityResult.matchedCustomerCode}) nhưng tên Lead khác. CRM vẫn cho tạo Lead và gắn cờ chờ xác minh!`}
            className="mb-4"
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <Form.Item name="firstName" label="Tên khách hàng" rules={[{ required: true, message: 'Vui lòng nhập tên khách hàng' }]}>
            <Input placeholder="Ví dụ: Phúc Kính" onBlur={handleIdentityBlur} />
          </Form.Item>
          <Form.Item name="lastName" label="Họ & Tên đệm (Tùy chọn)">
            <Input placeholder="Tùy chọn" onBlur={handleIdentityBlur} />
          </Form.Item>
        </div>

        <Form.Item name="phone" label={t('common.phone')}>
          <Input placeholder="0901234567" onBlur={handleIdentityBlur} />
        </Form.Item>

        <Form.Item name="email" label={t('common.email')}>
          <Input placeholder="nguyenvana@example.com" onBlur={handleIdentityBlur} />
        </Form.Item>

        <div className="grid grid-cols-2 gap-3">
          <Form.Item name="fbPsid" label="Facebook PSID (UID)">
            <Input placeholder="fb760420303821103_28029744610001629" onBlur={handleIdentityBlur} prefix={<span className="text-blue-600 font-bold text-xs">FB</span>} />
          </Form.Item>
          <Form.Item name="zaloUid" label="Zalo UID">
            <Input placeholder="zalo_987654321" onBlur={handleIdentityBlur} prefix={<span className="text-blue-500 font-bold text-xs">Zalo</span>} />
          </Form.Item>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Form.Item name="fbPageName" label="🚩 Tên Fanpage Facebook" extra="Tự động trích xuất từ link Smax">
            <Input placeholder="Ví dụ: Xe Điện Move Official" />
          </Form.Item>
          <Form.Item name="fbPageId" label="🆔 Facebook Page ID" extra="Lấy tự động từ PSID">
            <Input placeholder="760420303821103" />
          </Form.Item>
        </div>

        <Form.Item name="ownerId" label="Sale phụ trách (Bổ nhiệm)">
          <Select placeholder="Chọn nhân viên Sale phụ trách" allowClear>
            {users.map((u) => (
              <Select.Option key={u.id} value={u.id}>
                👤 {u.lastName} {u.firstName} ({u.email})
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="companyName"
          label={t('leads.form.company')}
          rules={entityType === 'COMPANY' ? [{ required: true, message: 'Vui lòng nhập tên công ty' }] : []}
        >
          <Input placeholder="Công ty ABC" />
        </Form.Item>

        <Form.Item name="jobTitle" label={t('leads.form.title')}>
          <Input placeholder="Giám đốc kinh doanh" />
        </Form.Item>

        <div className="grid grid-cols-2 gap-3">
          <Form.Item name="source" label={t('leads.source')} initialValue="WEBSITE">
            <Select>
              <Select.Option value="WEBSITE">🌐 Website</Select.Option>
              <Select.Option value="FB_ADS">📢 Facebook Ads</Select.Option>
              <Select.Option value="FACEBOOK">📘 Facebook (Fanpage/Group)</Select.Option>
              <Select.Option value="ZALO">💬 Zalo</Select.Option>
              <Select.Option value="INSTAGRAM">📸 Instagram</Select.Option>
              <Select.Option value="TIKTOK">🎵 TikTok</Select.Option>
              <Select.Option value="GOOGLE_ADS">🎯 Google Ads</Select.Option>
              <Select.Option value="REFERRAL">🤝 Giới thiệu (Referral)</Select.Option>
              <Select.Option value="EVENT">🎪 Hội thảo / Sự kiện</Select.Option>
              <Select.Option value="OUTBOUND">📞 Outbound / Trực tiếp</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="rating" label="Đánh giá" initialValue="WARM">
            <Select>
              <Select.Option value="HOT">Nóng (Hot)</Select.Option>
              <Select.Option value="WARM">Ấm (Warm)</Select.Option>
              <Select.Option value="COLD">Lạnh (Cold)</Select.Option>
            </Select>
          </Form.Item>
        </div>

        <Form.Item
          name="adIds"
          label="📢 Mã bài viết / Quảng cáo Facebook (Ad IDs)"
          extra="Nhập một hoặc nhiều mã Facebook Ad ID (Phân cách bằng dấu phẩy hoặc phím Enter)"
        >
          <Select
            mode="tags"
            placeholder="Ví dụ: 120249966819330693, 120249966819330694"
            tokenSeparators={[',', ' ']}
            open={false}
            allowClear
          />
        </Form.Item>

        <Form.Item name="productIds" label="🛒 Sản phẩm / Dịch vụ quan tâm (Chọn nhiều)">
          <Select
            mode="multiple"
            placeholder="Chọn các sản phẩm khách hàng quan tâm..."
            allowClear
            optionFilterProp="children"
          >
            {products.map((p) => (
              <Select.Option key={p.id} value={p.id}>
                📦 {p.name} ({p.code}) - {p.unitPrice ? `${p.unitPrice.toLocaleString('vi-VN')} VND` : 'Liên hệ'}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="notes" label={t('common.notes')}>
          <Input.TextArea rows={3} placeholder="Ghi chú thêm về tiềm năng..." />
        </Form.Item>
      </Form>
    </Drawer>
  );
};

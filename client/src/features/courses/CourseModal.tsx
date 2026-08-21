import React, { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Switch,
  InputNumber,
  Row,
  Col,
  Space,
  message,
} from 'antd';
import {
  DeleteOutlined,
  PlusOutlined,
  DownOutlined,
  UpOutlined,
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  StrikethroughOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
  LinkOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { Course, CourseSession, CourseTicket, CoursePromotion } from '../../types/course';

const { TextArea } = Input;
const { Option } = Select;

const RichTextAreaWrapper: React.FC<{ value?: string; onChange?: (e: any) => void }> = ({ value, onChange }) => (
  <div className="border border-gray-300 rounded-md overflow-hidden bg-white">
    <div className="bg-gray-50 p-2 border-b border-gray-200 flex flex-wrap items-center gap-1.5 text-gray-600 text-xs">
      <button type="button" className="p-1 hover:bg-gray-200 rounded font-mono text-xs">Mã HTML</button>
      <span className="w-px h-4 bg-gray-300 mx-0.5"></span>
      <button type="button" className="p-1 hover:bg-gray-200 rounded"><BoldOutlined /></button>
      <button type="button" className="p-1 hover:bg-gray-200 rounded"><ItalicOutlined /></button>
      <button type="button" className="p-1 hover:bg-gray-200 rounded"><UnderlineOutlined /></button>
      <button type="button" className="p-1 hover:bg-gray-200 rounded"><StrikethroughOutlined /></button>
      <span className="w-px h-4 bg-gray-300 mx-0.5"></span>
      <button type="button" className="p-1 hover:bg-gray-200 rounded"><UnorderedListOutlined /></button>
      <button type="button" className="p-1 hover:bg-gray-200 rounded"><OrderedListOutlined /></button>
      <span className="w-px h-4 bg-gray-300 mx-0.5"></span>
      <button type="button" className="p-1 hover:bg-gray-200 rounded"><LinkOutlined /></button>
      <button type="button" className="p-1 hover:bg-gray-200 rounded"><PictureOutlined /></button>
    </div>
    <TextArea
      rows={4}
      value={value}
      onChange={onChange}
      placeholder="Nhập nội dung chi tiết..."
      bordered={false}
      className="p-3 text-sm focus:shadow-none"
    />
  </div>
);

interface CourseModalProps {
  open: boolean;
  editingCourse?: Course | null;
  onCancel: () => void;
  onSubmit: (values: any) => Promise<void>;
}

export const CourseModal: React.FC<CourseModalProps> = ({
  open,
  editingCourse,
  onCancel,
  onSubmit,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Dynamic lists state
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [tickets, setTickets] = useState<CourseTicket[]>([]);
  const [promotions, setPromotions] = useState<CoursePromotion[]>([]);

  // Expanded cards state
  const [expandedSessions, setExpandedSessions] = useState<Record<number, boolean>>({});
  const [expandedTickets, setExpandedTickets] = useState<Record<number, boolean>>({});
  const [expandedPromotions, setExpandedPromotions] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (open) {
      if (editingCourse) {
        form.setFieldsValue({
          title: editingCourse.title,
          status: editingCourse.status || 'ACTIVE',
          startDate: editingCourse.startDate ? dayjs(editingCourse.startDate) : null,
          endDate: editingCourse.endDate ? dayjs(editingCourse.endDate) : null,
          shortDescription: editingCourse.shortDescription || '',
          description: editingCourse.description || '',
          series: editingCourse.series || undefined,
          programType: editingCourse.programType || undefined,
          category: editingCourse.category || undefined,
          speaker: editingCourse.speaker || undefined,
          district: editingCourse.district || undefined,
          ward: editingCourse.ward || undefined,
          addressDetail: editingCourse.addressDetail || '',
          priceType: editingCourse.priceType || 'FULL',
        });
        setSessions(editingCourse.sessions || []);
        setTickets(editingCourse.tickets || []);
        setPromotions(editingCourse.promotions || []);
      } else {
        form.resetFields();
        form.setFieldsValue({
          status: 'ACTIVE',
          priceType: 'FULL',
        });
        // Default initial session and ticket matching screenshot
        setSessions([
          { title: 'Buổi 1', isActive: true, sortOrder: 1 },
          { title: 'Buổi 2', isActive: true, sortOrder: 2 },
        ]);
        setTickets([
          { name: 'Standard', price: 10000, isActive: true, sortOrder: 1 },
          { name: 'VIP', price: 10000000, isActive: true, sortOrder: 2 },
        ]);
        setPromotions([
          { name: 'Ưu đãi 1', discountType: 'PERCENTAGE', discountValue: 10, isActive: true, sortOrder: 1 },
        ]);
      }
    }
  }, [open, editingCourse, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload = {
        ...values,
        startDate: values.startDate && dayjs(values.startDate).isValid() ? dayjs(values.startDate).toISOString() : null,
        endDate: values.endDate && dayjs(values.endDate).isValid() ? dayjs(values.endDate).toISOString() : null,
        sessions: sessions.map((s, idx) => ({ ...s, sortOrder: idx + 1 })),
        tickets: tickets.map((t, idx) => ({ ...t, sortOrder: idx + 1 })),
        promotions: promotions.map((p, idx) => ({ ...p, sortOrder: idx + 1 })),
      };

      await onSubmit(payload);
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      if (err.errorFields) {
        message.error('Vui lòng điền đầy đủ các trường thông tin bắt buộc');
      }
    }
  };

  // Sessions handlers
  const addSession = () => {
    const newSession: CourseSession = {
      title: `Buổi ${sessions.length + 1}`,
      isActive: true,
      sortOrder: sessions.length + 1,
    };
    setSessions([...sessions, newSession]);
  };

  const removeSession = (index: number) => {
    setSessions(sessions.filter((_, i) => i !== index));
  };

  const updateSession = (index: number, key: keyof CourseSession, value: any) => {
    const updated = [...sessions];
    updated[index] = { ...updated[index], [key]: value };
    setSessions(updated);
  };

  // Tickets handlers
  const addTicket = () => {
    const newTicket: CourseTicket = {
      name: `Vé ${tickets.length + 1}`,
      price: 0,
      isActive: true,
      sortOrder: tickets.length + 1,
    };
    setTickets([...tickets, newTicket]);
  };

  const removeTicket = (index: number) => {
    setTickets(tickets.filter((_, i) => i !== index));
  };

  const updateTicket = (index: number, key: keyof CourseTicket, value: any) => {
    const updated = [...tickets];
    updated[index] = { ...updated[index], [key]: value };
    setTickets(updated);
  };

  // Promotions handlers
  const addPromotion = () => {
    const newPromotion: CoursePromotion = {
      name: `Ưu đãi ${promotions.length + 1}`,
      discountType: 'PERCENTAGE',
      discountValue: 0,
      isActive: true,
      sortOrder: promotions.length + 1,
    };
    setPromotions([...promotions, newPromotion]);
  };

  const removePromotion = (index: number) => {
    setPromotions(promotions.filter((_, i) => i !== index));
  };

  const updatePromotion = (index: number, key: keyof CoursePromotion, value: any) => {
    const updated = [...promotions];
    updated[index] = { ...updated[index], [key]: value };
    setPromotions(updated);
  };

  return (
    <Modal
      open={open}
      title={
        <div className="text-lg font-semibold text-gray-800">
          {editingCourse ? 'Cập nhật sự kiện - khóa học' : 'Thêm mới sự kiện - khóa học'}
        </div>
      }
      onCancel={onCancel}
      width={960}
      style={{ top: 20 }}
      bodyStyle={{ maxHeight: '80vh', overflowY: 'auto', paddingRight: 12 }}
      footer={
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Button onClick={onCancel} className="rounded-lg px-6 h-9">
            Hủy bỏ
          </Button>
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={loading}
            className="bg-indigo-600 hover:bg-indigo-700 rounded-lg px-6 h-9 font-medium"
          >
            {editingCourse ? 'Cập nhật' : 'Tạo mới'}
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" className="pt-2">
        <Row gutter={24}>
          {/* LEFT COLUMN: Thông tin */}
          <Col span={14}>
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1 h-4 bg-blue-600 rounded-full inline-block"></span>
                <span className="font-bold text-gray-900 text-sm uppercase tracking-wide">Thông tin</span>
              </div>

              <Row gutter={12}>
                <Col span={14}>
                  <Form.Item
                    name="title"
                    label={<span className="font-semibold text-gray-700 text-xs">Tên <span className="text-red-500">*</span></span>}
                    rules={[{ required: true, message: 'Vui lòng nhập tên khóa học' }]}
                  >
                    <Input placeholder="Tên sự kiện / khóa học" className="rounded-md" />
                  </Form.Item>
                </Col>
                <Col span={10}>
                  <Form.Item
                    name="status"
                    label={<span className="font-semibold text-gray-700 text-xs">Trạng thái</span>}
                  >
                    <Select className="w-full">
                      <Option value="ACTIVE">Active</Option>
                      <Option value="DRAFT">Draft</Option>
                      <Option value="INACTIVE">Inactive</Option>
                      <Option value="COMPLETED">Completed</Option>
                      <Option value="CANCELLED">Cancelled</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    name="startDate"
                    label={<span className="font-semibold text-gray-700 text-xs">Bắt đầu</span>}
                  >
                    <DatePicker showTime format="MM/DD/YYYY, hh:mm A" className="w-full rounded-md" placeholder="Chọn thời gian bắt đầu" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="endDate"
                    label={<span className="font-semibold text-gray-700 text-xs">Kết thúc</span>}
                  >
                    <DatePicker showTime format="MM/DD/YYYY, hh:mm A" className="w-full rounded-md" placeholder="Chọn thời gian kết thúc" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="shortDescription"
                label={<span className="font-semibold text-gray-700 text-xs">Mô tả ngắn</span>}
              >
                <TextArea rows={2} placeholder="Nhập mô tả ngắn..." className="rounded-md" />
              </Form.Item>

              <Form.Item
                name="description"
                label={<span className="font-semibold text-gray-700 text-xs">Mô tả</span>}
              >
                <RichTextAreaWrapper />
              </Form.Item>
            </div>
          </Col>

          {/* RIGHT COLUMN: Phân loại & Địa chỉ */}
          <Col span={10}>
            {/* SECTION: Phân loại */}
            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50/50">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1 h-4 bg-blue-600 rounded-full inline-block"></span>
                <span className="font-bold text-gray-900 text-sm uppercase tracking-wide">Phân loại</span>
              </div>

              <Form.Item name="series" label={<span className="font-medium text-gray-700 text-xs">Chuỗi chương trình</span>}>
                <Select placeholder="Lựa chọn" allowClear className="w-full">
                  <Option value="Series Smax">Series Smax</Option>
                  <Option value="Series Training 2026">Series Training 2026</Option>
                  <Option value="Series Masterclass">Series Masterclass</Option>
                </Select>
              </Form.Item>

              <Form.Item name="programType" label={<span className="font-medium text-gray-700 text-xs">Loại chương trình</span>}>
                <Select placeholder="Lựa chọn" allowClear className="w-full">
                  <Option value="Offline Workshop">Offline Workshop</Option>
                  <Option value="Online Webinar">Online Webinar</Option>
                  <Option value="Khoá học Intensive">Khoá học Intensive</Option>
                </Select>
              </Form.Item>

              <Form.Item name="category" label={<span className="font-medium text-gray-700 text-xs">Danh mục</span>}>
                <Select placeholder="Lựa chọn" allowClear className="w-full">
                  <Option value="Marketing & Sales">Marketing & Sales</Option>
                  <Option value="Kinh doanh B2B">Kinh doanh B2B</Option>
                  <Option value="Tự động hoá CRM">Tự động hoá CRM</Option>
                </Select>
              </Form.Item>

              <Form.Item name="speaker" label={<span className="font-medium text-gray-700 text-xs">Diễn giả</span>}>
                <Select placeholder="Lựa chọn" allowClear className="w-full">
                  <Option value="Expert Smax AI">Expert Smax AI</Option>
                  <Option value="Nguyễn Văn A">Nguyễn Văn A</Option>
                  <Option value="Trần Thị B">Trần Thị B</Option>
                </Select>
              </Form.Item>
            </div>

            {/* SECTION: Địa chỉ */}
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50/50">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1 h-4 bg-blue-600 rounded-full inline-block"></span>
                <span className="font-bold text-gray-900 text-sm uppercase tracking-wide">Địa chỉ</span>
              </div>

              <Form.Item name="district" label={<span className="font-medium text-gray-700 text-xs">Quận/huyện</span>}>
                <Select placeholder="Quận/huyện" allowClear className="w-full">
                  <Option value="Quận Cầu Giấy">Quận Cầu Giấy</Option>
                  <Option value="Quận Nam Từ Liêm">Quận Nam Từ Liêm</Option>
                  <Option value="Quận 1">Quận 1</Option>
                  <Option value="Quận 3">Quận 3</Option>
                  <Option value="Quận Bình Thạnh">Quận Bình Thạnh</Option>
                </Select>
              </Form.Item>

              <Form.Item name="ward" label={<span className="font-medium text-gray-700 text-xs">Phường/xã</span>}>
                <Select placeholder="Phường/xã" allowClear className="w-full">
                  <Option value="Phường Dịch Vọng">Phường Dịch Vọng</Option>
                  <Option value="Phường Bến Nghé">Phường Bến Nghé</Option>
                  <Option value="Phường Mễ Trì">Phường Mễ Trì</Option>
                </Select>
              </Form.Item>

              <Form.Item name="addressDetail" label={<span className="font-medium text-gray-700 text-xs">Số nhà, đường phố</span>}>
                <Input placeholder="Số nhà, ngõ, đường phố..." className="rounded-md" />
              </Form.Item>
            </div>
          </Col>
        </Row>

        {/* BOTTOM SECTION 1: Cấu hình buổi */}
        <div className="mt-6 p-4 border border-gray-200 rounded-lg bg-white">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1 h-4 bg-blue-600 rounded-full inline-block"></span>
            <span className="font-bold text-gray-900 text-sm uppercase tracking-wide">Cấu hình buổi</span>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <span className="text-xs font-semibold text-gray-700">Số buổi:</span>
            <InputNumber min={0} value={sessions.length} readOnly className="w-24 rounded-md" />
          </div>

          <div className="space-y-3 mb-4">
            {sessions.map((s, index) => {
              const isExpanded = expandedSessions[index] || false;
              return (
                <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50/60 transition-all">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      <Switch
                        size="small"
                        checked={s.isActive}
                        onChange={(checked) => updateSession(index, 'isActive', checked)}
                      />
                      <Input
                        value={s.title}
                        onChange={(e) => updateSession(index, 'title', e.target.value)}
                        placeholder={`Tên buổi ${index + 1}`}
                        className="max-w-xs rounded-md bg-white"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="text"
                        icon={<DeleteOutlined className="text-gray-400 hover:text-red-500" />}
                        onClick={() => removeSession(index)}
                      />
                      <Button
                        type="text"
                        icon={isExpanded ? <UpOutlined /> : <DownOutlined />}
                        onClick={() =>
                          setExpandedSessions({ ...expandedSessions, [index]: !isExpanded })
                        }
                      />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-gray-600 font-medium block mb-1">Địa điểm / Phòng học</label>
                        <Input
                          value={s.location || ''}
                          onChange={(e) => updateSession(index, 'location', e.target.value)}
                          placeholder="VD: Phòng hội thảo 302"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-gray-600 font-medium block mb-1">Ghi chú nội dung</label>
                        <Input
                          value={s.description || ''}
                          onChange={(e) => updateSession(index, 'description', e.target.value)}
                          placeholder="Mô tả nội dung buổi..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={addSession}
            className="text-blue-600 border-blue-300 hover:border-blue-500 rounded-md"
          >
            Thêm buổi
          </Button>
        </div>

        {/* BOTTOM SECTION 2: Cấu hình vé */}
        <div className="mt-6 p-4 border border-gray-200 rounded-lg bg-white">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1 h-4 bg-blue-600 rounded-full inline-block"></span>
            <span className="font-bold text-gray-900 text-sm uppercase tracking-wide">Cấu hình vé</span>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <span className="text-xs font-semibold text-gray-700">Loại giá:</span>
            <Form.Item name="priceType" noStyle>
              <Select className="w-48">
                <Option value="FULL">Đầy đủ</Option>
                <Option value="FLAT">Đồng giá</Option>
                <Option value="TIERED">Phân tầng theo hạng</Option>
              </Select>
            </Form.Item>
          </div>

          <div className="space-y-3 mb-4">
            {tickets.map((t, index) => {
              const isExpanded = expandedTickets[index] || false;
              return (
                <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50/60 transition-all">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      <Switch
                        size="small"
                        checked={t.isActive}
                        onChange={(checked) => updateTicket(index, 'isActive', checked)}
                      />
                      <Input
                        value={t.name}
                        onChange={(e) => updateTicket(index, 'name', e.target.value)}
                        placeholder="Tên loại vé"
                        className="max-w-xs rounded-md bg-white font-medium"
                      />
                      <span className="text-xs text-gray-500">Giá:</span>
                      <InputNumber
                        value={t.price}
                        onChange={(val) => updateTicket(index, 'price', val || 0)}
                        formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(val) => Number(val?.replace(/\$\s?|(,*)/g, '') || 0)}
                        addonAfter="đ"
                        className="w-44 rounded-md"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="text"
                        icon={<DeleteOutlined className="text-gray-400 hover:text-red-500" />}
                        onClick={() => removeTicket(index)}
                      />
                      <Button
                        type="text"
                        icon={isExpanded ? <UpOutlined /> : <DownOutlined />}
                        onClick={() =>
                          setExpandedTickets({ ...expandedTickets, [index]: !isExpanded })
                        }
                      />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-gray-600 font-medium block mb-1">Số lượng tối đa</label>
                        <InputNumber
                          min={0}
                          value={t.quantity || undefined}
                          onChange={(val) => updateTicket(index, 'quantity', val)}
                          placeholder="Không giới hạn"
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-gray-600 font-medium block mb-1">Mô tả quyền lợi vé</label>
                        <Input
                          value={t.description || ''}
                          onChange={(e) => updateTicket(index, 'description', e.target.value)}
                          placeholder="VD: Bao gồm tài liệu & tiệc trà..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={addTicket}
            className="text-blue-600 border-blue-300 hover:border-blue-500 rounded-md"
          >
            Thêm vé
          </Button>
        </div>

        {/* BOTTOM SECTION 3: Cấu hình ưu đãi */}
        <div className="mt-6 p-4 border border-gray-200 rounded-lg bg-white mb-2">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1 h-4 bg-blue-600 rounded-full inline-block"></span>
            <span className="font-bold text-gray-900 text-sm uppercase tracking-wide">Cấu hình ưu đãi</span>
          </div>

          <div className="space-y-3 mb-4">
            {promotions.map((p, index) => {
              const isExpanded = expandedPromotions[index] || false;
              return (
                <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50/60 transition-all">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      <Switch
                        size="small"
                        checked={p.isActive}
                        onChange={(checked) => updatePromotion(index, 'isActive', checked)}
                      />
                      <Input
                        value={p.name}
                        onChange={(e) => updatePromotion(index, 'name', e.target.value)}
                        placeholder="Tên ưu đãi"
                        className="max-w-xs rounded-md bg-white font-medium"
                      />
                      <Select
                        value={p.discountType}
                        onChange={(val) => updatePromotion(index, 'discountType', val)}
                        className="w-28"
                      >
                        <Option value="PERCENTAGE">Giảm %</Option>
                        <Option value="FIXED_AMOUNT">Giảm tiền</Option>
                      </Select>
                      <InputNumber
                        value={p.discountValue}
                        onChange={(val) => updatePromotion(index, 'discountValue', val || 0)}
                        addonAfter={p.discountType === 'PERCENTAGE' ? '%' : 'đ'}
                        className="w-36 rounded-md"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="text"
                        icon={<DeleteOutlined className="text-gray-400 hover:text-red-500" />}
                        onClick={() => removePromotion(index)}
                      />
                      <Button
                        type="text"
                        icon={isExpanded ? <UpOutlined /> : <DownOutlined />}
                        onClick={() =>
                          setExpandedPromotions({ ...expandedPromotions, [index]: !isExpanded })
                        }
                      />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-gray-600 font-medium block mb-1">Mã khuyến mãi (Promo Code)</label>
                        <Input
                          value={p.code || ''}
                          onChange={(e) => updatePromotion(index, 'code', e.target.value)}
                          placeholder="VD: EARLYBIRD20"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={addPromotion}
            className="text-blue-600 border-blue-300 hover:border-blue-500 rounded-md"
          >
            Thêm ưu đãi
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

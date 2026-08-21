import React, { useEffect, useState } from 'react';
import { PrimaryButton } from '../../components/common/PrimaryButton';
import { TableToolbar } from '../../components/common/TableToolbar';
import { PageHeader } from '../../components/common/PageHeader';

import {
  Table,
  Input,
  Button,
  Tag,
  Space,
  Popconfirm,
  message,
  Tooltip,
  Dropdown,
  Checkbox,
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  SettingOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  ReadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { courseService } from '../../services/courseService';
import { Course } from '../../types/course';
import { CourseModal } from './CourseModal';

export const CourseListPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const fetchCourses = async (page = 1, searchQuery = search) => {
    try {
      setLoading(true);
      const res = await courseService.getCourses({
        page,
        limit: pagination.limit,
        search: searchQuery || undefined,
      });
      if (res.success) {
        setCourses(res.data.courses || []);
        setPagination((prev) => ({
          ...prev,
          page: res.data.pagination.page,
          total: res.data.pagination.total,
        }));
      }
    } catch (err: any) {
      message.error(err.message || 'Không thể tải danh sách khóa học');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses(1, search);
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    fetchCourses(1, val);
  };

  const handleCreateNew = () => {
    setEditingCourse(null);
    setModalOpen(true);
  };

  const handleEdit = (record: Course) => {
    setEditingCourse(record);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await courseService.deleteCourse(id);
      if (res.success) {
        message.success('Đã xóa khóa học');
        fetchCourses(pagination.page);
      }
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi xóa khóa học');
    }
  };

  const handleModalSubmit = async (values: any) => {
    try {
      if (editingCourse) {
        const res = await courseService.updateCourse(editingCourse.id, values);
        if (res.success) {
          message.success('Cập nhật khóa học thành công');
          setModalOpen(false);
          fetchCourses(pagination.page);
        }
      } else {
        const res = await courseService.createCourse(values);
        if (res.success) {
          message.success('Tạo khóa học mới thành công');
          setModalOpen(false);
          fetchCourses(1);
        }
      }
    } catch (err: any) {
      message.error(err.message || 'Có lỗi xảy ra khi lưu thông tin');
    }
  };

  // Helper renderer for Date Badge matching UI mockup
  const renderDateBadge = (startDate?: string | null) => {
    if (!startDate) {
      return (
        <div className="w-12 h-12 bg-gray-100 rounded-lg flex flex-col items-center justify-center text-gray-400 text-xs">
          N/A
        </div>
      );
    }
    const d = dayjs(startDate);
    const month = d.format('MMM').toUpperCase();
    const day = d.format('DD');

    return (
      <div className="w-12 h-12 bg-gray-100/80 border border-gray-200 rounded-lg overflow-hidden flex flex-col items-center justify-center shadow-sm">
        <div className="bg-sky-100 text-sky-600 text-[10px] font-extrabold w-full text-center py-0.5 tracking-wider uppercase flex items-center justify-center gap-1">
          <span className="w-1 h-1 bg-sky-500 rounded-full"></span>
          {month}
        </div>
        <div className="text-gray-900 font-bold text-sm leading-none py-1">
          {day}
        </div>
      </div>
    );
  };

  const columns = [
    {
      title: 'Tên khóa học',
      dataIndex: 'title',
      key: 'title',
      render: (_Text: string, record: Course) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 overflow-hidden flex-shrink-0">
            {record.thumbnail ? (
              <img src={record.thumbnail} alt={record.title} className="w-full h-full object-cover" />
            ) : (
              <ReadOutlined className="text-lg text-indigo-500" />
            )}
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm hover:text-indigo-600 cursor-pointer" onClick={() => handleEdit(record)}>
              {record.title}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {record.startDate ? dayjs(record.startDate).format('DD/MM/YYYY') : 'TBD'}
              {' → '}
              {record.endDate ? dayjs(record.endDate).format('DD/MM/YYYY') : 'TBD'}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Ngày',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 100,
      render: (startDate?: string | null) => renderDateBadge(startDate),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: string) => {
        let color = 'success';
        let label = 'Active';
        if (status === 'DRAFT') {
          color = 'default';
          label = 'Draft';
        } else if (status === 'INACTIVE') {
          color = 'warning';
          label = 'Inactive';
        } else if (status === 'COMPLETED') {
          color = 'processing';
          label = 'Completed';
        } else if (status === 'CANCELLED') {
          color = 'error';
          label = 'Cancelled';
        }
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            {label}
          </span>
        );
      },
    },
    {
      title: 'Đăng ký',
      dataIndex: 'registrationsCount',
      key: 'registrationsCount',
      width: 100,
      render: (count: number) => (
        <span className="text-gray-700 text-sm font-medium">{count || 0}</span>
      ),
    },
    {
      title: 'Giá',
      dataIndex: 'tickets',
      key: 'tickets',
      render: (_: any, record: Course) => {
        if (!record.tickets || record.tickets.length === 0) {
          return <span className="text-gray-400 text-xs">Chưa cấu hình vé</span>;
        }
        return (
          <div className="space-y-0.5 text-xs text-gray-700">
            {record.tickets.map((t, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="text-gray-500 font-medium">{t.name}:</span>
                <span className="font-bold text-gray-900">
                  {Number(t.price).toLocaleString('vi-VN')} đ
                </span>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_: any, record: Course) => (
        <div className="flex items-center gap-2 justify-end">
          <Button
            type="default"
            size="small"
            icon={<EditOutlined className="text-gray-600" />}
            onClick={() => handleEdit(record)}
            className="border-gray-200 hover:border-indigo-500 hover:text-indigo-600 rounded-md"
          />
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa khóa học này?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="default"
              size="small"
              icon={<DeleteOutlined className="text-gray-400 hover:text-red-500" />}
              className="border-gray-200 hover:border-red-400 rounded-md"
            />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 bg-slate-50/50 min-h-screen">
      {/* Header Bar */}
      <PageHeader
        title="Khóa học"
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        className="mb-4"
      />

      {/* Control Bar: Search, Filters, Add Button */}
      <TableToolbar
        searchPlaceholder="Tìm kiếm khóa học..."
        searchValue={search}
        onSearchChange={handleSearch}
        className="mb-4"
      >
        <Button
          icon={<FilterOutlined className="text-slate-600 text-xs" />}
          className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg h-8 px-3 flex items-center gap-1.5 shadow-2xs hover:border-slate-300"
        >
          <span>Lọc</span>
        </Button>

        <Button
          icon={<SettingOutlined className="text-slate-600 text-xs" />}
          className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg h-8 px-3 flex items-center gap-1.5 shadow-2xs hover:border-slate-300"
        >
          <span>Tuỳ chỉnh bảng</span>
        </Button>

        <PrimaryButton
          icon={<PlusOutlined />}
          onClick={handleCreateNew}
        >
          Thêm khóa học
        </PrimaryButton>
      </TableToolbar>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table
          rowSelection={{
            type: 'checkbox',
          }}
          columns={columns}
          dataSource={courses}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.total,
            onChange: (page) => fetchCourses(page),
            showSizeChanger: false,
          }}
        />
      </div>

      {/* Course Create/Update Modal */}
      <CourseModal
        open={modalOpen}
        editingCourse={editingCourse}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
};

import React, { useEffect, useState, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Tag,
  Space,
  Typography,
  Alert,
  Spin,
  Tooltip,
  Badge,
  Empty,
  message,
} from 'antd';
import {
  FileExcelOutlined,
  ReloadOutlined,
  SearchOutlined,
  LinkOutlined,
  TableOutlined,
  ColumnWidthOutlined,
  UnorderedListOutlined,
  ClockCircleOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import { crmService } from '../../services/crmService';

const { Title, Text, Paragraph } = Typography;

interface SheetData {
  spreadsheetId: string;
  sheetName: string;
  availableSheets?: string[];
  totalRows: number;
  totalColumns: number;
  columns: string[];
  rows: Array<Record<string, any>>;
  updatedAt: string;
}

export const GoogleSheetsMoveDataPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<SheetData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState<string>('');
  const [selectedSheet, setSelectedSheet] = useState<string>('DRAFF');

  const fetchSheetData = async (sheetToFetch?: string) => {
    const targetSheet = sheetToFetch || selectedSheet || 'DRAFF';
    setLoading(true);
    setError(null);
    try {
      const res: any = await crmService.getMoveDataSheet({ sheetName: targetSheet });
      if (res.data?.success || res.success) {
        const payload: SheetData = res.data?.data || res.data;
        setData(payload);
        if (payload.sheetName) {
          setSelectedSheet(payload.sheetName);
        }
      } else {
        setError(res.message || 'Không thể tải dữ liệu từ Google Sheet');
      }
    } catch (err: any) {
      console.error('Failed to fetch sheet data:', err);
      setError(
        err.response?.data?.message || err.message || 'Không thể kết nối đến Google Sheets API'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSheetData('DRAFF');
  }, []);

  const handleSheetChange = (newSheetName: string) => {
    setSelectedSheet(newSheetName);
    fetchSheetData(newSheetName);
  };

  // Dynamic columns configuration for Ant Design Table
  const tableColumns = useMemo(() => {
    if (!data || !data.columns || data.columns.length === 0) return [];

    const indexCol = {
      title: '#',
      dataIndex: '_rowIndex',
      key: '_rowIndex',
      width: 60,
      fixed: 'left' as const,
      align: 'center' as const,
      render: (val: number) => (
        <Text type="secondary" className="font-mono text-xs">
          {val}
        </Text>
      ),
    };

    const dataCols = data.columns.map((colName, colIdx) => ({
      title: (
        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
          <span className="text-xs text-indigo-500 font-mono">[{colIdx + 1}]</span>
          <span>{colName}</span>
        </div>
      ),
      dataIndex: colName,
      key: `${colName}_${colIdx}`,
      width: 180,
      ellipsis: true,
      render: (text: any) => {
        if (text === null || text === undefined || text === '') {
          return <span className="text-slate-300 italic text-xs">-</span>;
        }
        return (
          <span className="text-slate-800 text-xs font-medium" title={String(text)}>
            {String(text)}
          </span>
        );
      },
    }));

    return [indexCol, ...dataCols];
  }, [data?.columns]);

  // Filtered rows based on search text
  const filteredRows = useMemo(() => {
    if (!data?.rows) return [];
    if (!searchText.trim()) return data.rows;

    const query = searchText.toLowerCase();
    return data.rows.filter((row) =>
      data.columns.some((col) => {
        const val = row[col];
        return val !== undefined && val !== null && String(val).toLowerCase().includes(query);
      })
    );
  }, [data?.rows, data?.columns, searchText]);

  const googleSheetUrl = data?.spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}`
    : null;

  const availableSheetsOptions = useMemo(() => {
    const sheets = data?.availableSheets || ['DRAFF'];
    return sheets.map((s) => ({ label: s, value: s }));
  }, [data?.availableSheets]);

  return (
    <div className="space-y-5 p-2">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-emerald-700/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 text-xl shadow-inner">
                <FileExcelOutlined />
              </div>
              <div>
                <Title level={3} style={{ color: 'white', margin: 0 }} className="font-extrabold tracking-tight">
                  Google Sheet: {data?.sheetName || selectedSheet}
                </Title>
                <Text className="text-emerald-200/80 text-xs">
                  Truy xuất danh sách cột & hàng dữ liệu tự động từ Google Service Account
                </Text>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Sheet Selector Dropdown */}
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/20">
              <FolderOpenOutlined className="text-emerald-300 text-sm" />
              <span className="text-xs font-semibold text-emerald-100">Sheet:</span>
              <Select
                value={selectedSheet}
                onChange={handleSheetChange}
                options={availableSheetsOptions}
                disabled={loading}
                loading={loading}
                dropdownMatchSelectWidth={false}
                bordered={false}
                className="min-w-[140px] text-xs font-bold text-white [&_.ant-select-selection-item]:!text-white [&_.ant-select-arrow]:!text-white"
              />
            </div>

            {googleSheetUrl && (
              <Button
                type="default"
                icon={<LinkOutlined />}
                href={googleSheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white rounded-xl text-xs"
              >
                Mở trong Google Sheets
              </Button>
            )}
            <Button
              type="primary"
              icon={<ReloadOutlined spin={loading} />}
              onClick={() => {
                fetchSheetData();
                message.success('Đã tải lại dữ liệu mới nhất');
              }}
              loading={loading}
              className="bg-emerald-600 hover:bg-emerald-500 border-none shadow-md rounded-xl text-xs font-semibold"
            >
              Làm mới dữ liệu
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-emerald-700/40">
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10">
            <div className="text-[11px] text-emerald-300 font-medium">Sheet Đang Chọn</div>
            <div className="text-lg font-bold text-white truncate">{data?.sheetName || selectedSheet}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10">
            <div className="text-[11px] text-emerald-300 font-medium flex items-center gap-1">
              <ColumnWidthOutlined /> Tổng số cột
            </div>
            <div className="text-lg font-bold text-emerald-400">{data?.totalColumns ?? 0}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10">
            <div className="text-[11px] text-emerald-300 font-medium flex items-center gap-1">
              <UnorderedListOutlined /> Tổng số hàng
            </div>
            <div className="text-lg font-bold text-emerald-400">{data?.totalRows ?? 0}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10">
            <div className="text-[11px] text-emerald-300 font-medium flex items-center gap-1">
              <ClockCircleOutlined /> Cập nhật lần cuối
            </div>
            <div className="text-xs font-semibold text-white truncate mt-1">
              {data?.updatedAt ? new Date(data.updatedAt).toLocaleTimeString('vi-VN') : '-'}
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert if any */}
      {error && (
        <Alert
          message="Lỗi kết nối Google Sheet"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" type="primary" danger onClick={() => fetchSheetData()}>
              Thử lại
            </Button>
          }
          className="rounded-xl"
        />
      )}

      {/* Column Headers Overview */}
      {data && data.columns && data.columns.length > 0 && (
        <Card
          title={
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
              <TableOutlined className="text-indigo-600" />
              <span>Danh sách các Cột trong Sheet "{data.sheetName}" ({data.columns.length} cột)</span>
            </div>
          }
          className="shadow-xs rounded-xl border border-slate-200"
          bodyStyle={{ padding: '16px' }}
        >
          <div className="flex flex-wrap gap-2">
            {data.columns.map((colName, index) => (
              <Tag
                key={index}
                color="blue"
                className="px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-blue-200"
              >
                <span className="text-blue-500 font-mono font-bold">#{index + 1}</span>
                <span className="text-slate-800 font-semibold">{colName}</span>
              </Tag>
            ))}
          </div>
        </Card>
      )}

      {/* Table Data Section */}
      <Card
        className="shadow-xs rounded-xl border border-slate-200 overflow-hidden"
        bodyStyle={{ padding: '16px' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <Title level={5} style={{ margin: 0 }} className="text-slate-800 font-bold">
              Chi tiết dữ liệu các Hàng trong Sheet "{data?.sheetName || selectedSheet}" ({filteredRows.length} hàng)
            </Title>
            <Text type="secondary" className="text-xs">
              Xem và lọc dữ liệu chi tiết của từng hàng trong file Google Sheet
            </Text>
          </div>

          <div className="w-full sm:w-72">
            <Input
              prefix={<SearchOutlined className="text-slate-400 text-xs" />}
              placeholder="Tìm kiếm nội dung hàng..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              className="rounded-lg text-xs"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <Spin size="large" />
            <div className="mt-3 text-slate-500 text-xs font-medium">
              Đang kết nối API và đọc dữ liệu Google Sheet...
            </div>
          </div>
        ) : filteredRows.length === 0 ? (
          <Empty
            description={
              <span className="text-slate-500 text-xs">
                {searchText ? 'Không tìm thấy dòng nào khớp với từ khóa search' : 'Không có dữ liệu trong sheet'}
              </span>
            }
            className="py-12"
          />
        ) : (
          <Table
            columns={tableColumns}
            dataSource={filteredRows}
            rowKey={(record, idx) => record._rowIndex || idx}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total, range) => (
                <span className="text-xs text-slate-500 font-medium">
                  Hiển thị {range[0]}-{range[1]} / Tổng cộng {total} hàng
                </span>
              ),
            }}
            scroll={{ x: 'max-content', y: 540 }}
            bordered
            size="small"
            className="rounded-lg border border-slate-200"
          />
        )}
      </Card>
    </div>
  );
};

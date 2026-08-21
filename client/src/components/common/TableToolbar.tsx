import React from 'react';
import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

export interface TableToolbarProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showSearch?: boolean;
  extraLeft?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export const TableToolbar: React.FC<TableToolbarProps> = ({
  searchPlaceholder = 'Tìm kiếm...',
  searchValue,
  onSearchChange,
  showSearch = true,
  extraLeft,
  children,
  className = '',
}) => {
  return (
    <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs ${className}`}>
      <div className="flex items-center gap-2 flex-1">
        {showSearch && (
          <Input
            prefix={<SearchOutlined className="text-slate-400 text-xs" />}
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={onSearchChange}
            allowClear
            className="w-full sm:w-72 rounded-lg bg-white border-slate-200 text-xs py-1.5 shadow-2xs"
          />
        )}
        {extraLeft}
      </div>
      {children && (
        <div className="flex items-center justify-end gap-2 shrink-0">
          {children}
        </div>
      )}
    </div>
  );
};

export default TableToolbar;

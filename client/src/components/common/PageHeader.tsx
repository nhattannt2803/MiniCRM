import React from 'react';
import { Button } from 'antd';
import { AppstoreOutlined, UnorderedListOutlined } from '@ant-design/icons';

export interface ViewSwitcherProps {
  viewMode: 'kanban' | 'list' | 'grid' | 'table' | string;
  onViewModeChange: (mode: any) => void;
}

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  extra?: React.ReactNode;
  viewMode?: 'kanban' | 'list' | 'grid' | 'table' | string;
  onViewModeChange?: (mode: any) => void;
  className?: string;
}

export const ViewSwitcher: React.FC<ViewSwitcherProps> = ({
  viewMode,
  onViewModeChange,
}) => {
  const isGridView = viewMode === 'kanban' || viewMode === 'grid';
  const isTableView = viewMode === 'list' || viewMode === 'table';

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-0.5 flex items-center shadow-2xs gap-0.5">
      <Button
        type={isGridView ? 'primary' : 'text'}
        size="small"
        icon={<AppstoreOutlined />}
        onClick={() => onViewModeChange(viewMode === 'grid' ? 'grid' : 'kanban')}
        className={`h-7 w-7 flex items-center justify-center rounded border-none ${
          isGridView ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900'
        }`}
        title="Giao diện Lưới / Kanban"
      />
      <Button
        type={isTableView ? 'primary' : 'text'}
        size="small"
        icon={<UnorderedListOutlined />}
        onClick={() => onViewModeChange(viewMode === 'table' ? 'table' : 'list')}
        className={`h-7 w-7 flex items-center justify-center rounded border-none ${
          isTableView ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-900'
        }`}
        title="Giao diện Bảng / Danh sách"
      />
    </div>
  );
};

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  extra,
  viewMode,
  onViewModeChange,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-between pt-1 ${className}`}>
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight m-0 select-none">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-slate-500 m-0 mt-0.5 font-normal">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {extra}
        {viewMode && onViewModeChange && (
          <ViewSwitcher viewMode={viewMode} onViewModeChange={onViewModeChange} />
        )}
      </div>
    </div>
  );
};

export default PageHeader;

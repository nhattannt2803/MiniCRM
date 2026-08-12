import React from 'react';
import { Card, Tag, Avatar, Tooltip, Button } from 'antd';
import { UserOutlined, DollarOutlined, PlusOutlined } from '@ant-design/icons';
import { Opportunity } from '../../types';

export interface KanbanColumn {
  stageId: string;
  name: string;
  code: string;
  orderNo: number;
  probability: number;
  isWon: boolean;
  isLost: boolean;
  totalAmount: number;
  deals: Opportunity[];
}

interface KanbanBoardProps {
  columns: KanbanColumn[];
  onDealClick: (opp: Opportunity) => void;
  onStageChange: (oppId: string, newStageId: string) => void;
  onAddDeal?: (stageId: string) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ columns, onDealClick, onStageChange, onAddDeal }) => {
  const handleDragStart = (e: React.DragEvent, oppId: string) => {
    e.dataTransfer.setData('text/plain', oppId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    const oppId = e.dataTransfer.getData('text/plain');
    if (oppId) {
      onStageChange(oppId, targetStageId);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 pt-2">
      {columns.map((col) => (
        <div
          key={col.stageId}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, col.stageId)}
          className="flex-shrink-0 w-80 bg-slate-100/80 rounded-xl p-3 flex flex-col max-h-[calc(100vh-220px)] border border-slate-200"
        >
          {/* Column Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-800 text-sm">{col.name}</span>
              <Tag color={col.isWon ? 'green' : col.isLost ? 'red' : 'blue'} className="rounded-full px-2">
                {col.deals.length}
              </Tag>
              {onAddDeal && (
                <Tooltip title="Thêm cơ hội vào giai đoạn này">
                  <Button
                    type="text"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => onAddDeal(col.stageId)}
                    className="text-slate-400 hover:text-indigo-600 hover:bg-slate-200/70 p-0 h-6 w-6 flex items-center justify-center rounded-full"
                  />
                </Tooltip>
              )}
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {col.totalAmount.toLocaleString('vi-VN')} ₫
            </span>
          </div>

          {/* Column Deals List */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {col.deals.map((deal) => (
              <Card
                key={deal.id}
                draggable
                onDragStart={(e) => handleDragStart(e, deal.id)}
                onClick={() => onDealClick(deal)}
                size="small"
                className="cursor-pointer hover:shadow-md transition-shadow border-slate-200 bg-white rounded-lg group"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors line-clamp-2">
                    {deal.name}
                  </span>
                </div>

                {deal.company && (
                  <div className="text-xs text-slate-500 mb-2 truncate font-medium">
                    🏢 {deal.company.name}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1 font-bold text-indigo-600 text-xs">
                    <DollarOutlined />
                    {Number(deal.amount).toLocaleString('vi-VN')} ₫
                  </div>

                  {deal.owner ? (
                    <Tooltip title={`${deal.owner.firstName} ${deal.owner.lastName}`}>
                      <Avatar size="small" className="bg-indigo-500 text-xs">
                        {deal.owner.firstName[0]}
                      </Avatar>
                    </Tooltip>
                  ) : (
                    <Avatar size="small" icon={<UserOutlined />} className="bg-slate-300" />
                  )}
                </div>
              </Card>
            ))}

            {col.deals.length === 0 && (
              <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg text-xs text-slate-400">
                Drag deal here
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

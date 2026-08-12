import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Select, notification } from 'antd';
import { PlusOutlined, FileTextOutlined } from '@ant-design/icons';
import { crmService } from '../../services/crmService';
import { Quote } from '../../types';
import { QuoteCreateModal } from './QuoteCreateModal';

export const QuoteListPage: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const res: any = await crmService.getQuotes();
      if (res.success) setQuotes(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await crmService.updateQuoteStatus(id, status);
      notification.success({ message: 'Quote Status Updated' });
      fetchQuotes();
    } catch (err: any) {
      notification.error({ message: 'Error', description: err.message });
    }
  };

  const columns = [
    { title: 'Quote Number', dataIndex: 'quoteNumber', key: 'quoteNumber', render: (v: string) => <span className="font-bold text-indigo-600">{v}</span> },
    { title: 'Subtotal', dataIndex: 'subtotal', key: 'subtotal', render: (v: number) => `${Number(v).toLocaleString('vi-VN')} ₫` },
    { title: 'Tax Amount', dataIndex: 'taxAmount', key: 'taxAmount', render: (v: number) => `${Number(v).toLocaleString('vi-VN')} ₫` },
    { title: 'Total Amount', dataIndex: 'totalAmount', key: 'totalAmount', render: (v: number) => <span className="font-black text-emerald-600">{Number(v).toLocaleString('vi-VN')} ₫</span> },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, r: Quote) => (
        <Select value={r.status} onChange={(val) => handleStatusChange(r.id, val)} size="small" className="w-32">
          <Select.Option value="DRAFT">DRAFT</Select.Option>
          <Select.Option value="SENT">SENT</Select.Option>
          <Select.Option value="ACCEPTED">ACCEPTED</Select.Option>
          <Select.Option value="REJECTED">REJECTED</Select.Option>
        </Select>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quotations & Pricing Proposals</h1>
          <p className="text-sm text-slate-500">Formal price quotes generated for sales deals</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          className="bg-indigo-600 font-semibold rounded-lg"
          onClick={() => setCreateModalVisible(true)}
        >
          Create Quote
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <Table columns={columns} dataSource={quotes} rowKey="id" loading={loading} pagination={false} />
      </div>

      <QuoteCreateModal
        visible={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onSuccess={() => {
          setCreateModalVisible(false);
          fetchQuotes();
        }}
      />
    </div>
  );
};

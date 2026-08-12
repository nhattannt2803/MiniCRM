import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Select, notification } from 'antd';
import { PlusOutlined, FileTextOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { crmService } from '../../services/crmService';
import { Quote } from '../../types';
import { QuoteCreateModal } from './QuoteCreateModal';

export const QuoteListPage: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const { t } = useTranslation();

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
      notification.success({ message: t('common.success'), description: 'Đã cập nhật trạng thái báo giá' });
      fetchQuotes();
    } catch (err: any) {
      notification.error({ message: t('common.error'), description: err.message });
    }
  };

  const columns = [
    { title: t('quotes.quoteNumber'), dataIndex: 'quoteNumber', key: 'quoteNumber', render: (v: string) => <span className="font-bold text-indigo-600">{v}</span> },
    { title: 'Tạm tính', dataIndex: 'subtotal', key: 'subtotal', render: (v: number) => `${Number(v).toLocaleString('vi-VN')} ₫` },
    { title: 'Tiền thuế', dataIndex: 'taxAmount', key: 'taxAmount', render: (v: number) => `${Number(v).toLocaleString('vi-VN')} ₫` },
    { title: t('quotes.totalAmount'), dataIndex: 'totalAmount', key: 'totalAmount', render: (v: number) => <span className="font-black text-emerald-600">{Number(v).toLocaleString('vi-VN')} ₫</span> },
    {
      title: t('common.status'),
      key: 'status',
      render: (_: any, r: Quote) => (
        <Select value={r.status} onChange={(val) => handleStatusChange(r.id, val)} size="small" className="w-32">
          <Select.Option value="DRAFT">{t('quotes.status.DRAFT')}</Select.Option>
          <Select.Option value="SENT">{t('quotes.status.SENT')}</Select.Option>
          <Select.Option value="ACCEPTED">{t('quotes.status.ACCEPTED')}</Select.Option>
          <Select.Option value="REJECTED">{t('quotes.status.REJECTED')}</Select.Option>
        </Select>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('quotes.title')}</h1>
          <p className="text-sm text-slate-500">Bảng tổng hợp báo giá và đơn giá chính thức gửi khách hàng</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="large"
          className="bg-indigo-600 font-semibold rounded-lg"
          onClick={() => setCreateModalVisible(true)}
        >
          {t('quotes.createQuote')}
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

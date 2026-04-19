import { useEffect, useState, useCallback } from 'react';
import { Table, Card, Button, Space, Typography, Modal, Form, InputNumber,
  Input, DatePicker, Select, message, Popconfirm, Tag, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, ReloadOutlined, WarningOutlined, SearchOutlined } from '@ant-design/icons';
import { baobiApi } from '../../api/apiClient';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;

const ALERT_COLORS: Record<string, string> = {
  'Bình thường': 'green', 'Cần theo dõi': 'orange', 'Cảnh báo': 'red', 'Thiếu': 'volcano',
};

// 31-day calendar bar component
function DayCalendar({ datesWithData, currentMonth }: { datesWithData: number[]; currentMonth: dayjs.Dayjs }) {
  const daysInMonth = currentMonth.daysInMonth();
  const today = dayjs().date();
  const isCurrentMonth = currentMonth.isSame(dayjs(), 'month');

  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
        const hasData = datesWithData.includes(day);
        const isToday = isCurrentMonth && day === today;
        return (
          <Tooltip key={day} title={`${day}/${currentMonth.format('MM')} - ${hasData ? 'Có dữ liệu' : 'Chưa có'}`}>
            <div style={{
              width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 6, fontSize: 11, fontWeight: hasData ? 700 : 400, cursor: 'default',
              background: hasData
                ? 'linear-gradient(135deg, #4FC08D, #2D9D78)'
                : 'rgba(255,255,255,0.06)',
              color: hasData ? '#fff' : 'rgba(255,255,255,0.35)',
              border: isToday ? '2px solid #5B8FF9' : '1px solid rgba(255,255,255,0.08)',
              transition: 'all 0.2s',
              boxShadow: hasData ? '0 1px 4px rgba(79,192,141,0.3)' : 'none',
            }}>
              {day}
            </div>
          </Tooltip>
        );
      })}
    </div>
  );
}

export default function BaoBiPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [serverTotalBao, setServerTotalBao] = useState(0);
  const [serverTotalKg, setServerTotalKg] = useState(0);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form] = Form.useForm();
  const [datesWithData, setDatesWithData] = useState<number[]>([]);
  const [calMonth, setCalMonth] = useState(dayjs());

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await baobiApi.getAll({ page, pageSize: 50, search: search || undefined });
      setRecords(res.data.items);
      setTotal(res.data.totalCount);
      setServerTotalBao(res.data.totalBao ?? 0);
      setServerTotalKg(res.data.totalKg ?? 0);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [page, search]);

  const loadDates = useCallback(async () => {
    try {
      const res = await baobiApi.getDates(calMonth.year(), calMonth.month() + 1);
      setDatesWithData(res.data);
    } catch { /* */ }
  }, [calMonth]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { loadDates(); }, [loadDates]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await baobiApi.create({ ...values, ngayKiemTra: values.ngayKiemTra?.toISOString() ?? new Date().toISOString() });
      message.success('Đã thêm!'); setShowModal(false); form.resetFields(); loadData(); loadDates();
    } catch { message.error('Lỗi'); }
  };

  const columns: ColumnsType<any> = [
    { title: 'ID', dataIndex: 'id', width: 55 },
    { title: 'Loại bao', dataIndex: 'loaiBao', width: 140 },
    { title: 'Kích cỡ (kg)', dataIndex: 'kichCoKg', width: 95, align: 'right' },
    { title: 'Tồn kho (bao)', dataIndex: 'tonKhoHienTai', width: 120, align: 'right',
      render: (v: number) => <strong>{v?.toLocaleString()}</strong> },
    { title: 'Tồn kho (tấn)', key: 'tonKhoTan', width: 120, align: 'right',
      render: (_, r: any) => {
        const tons = ((r.kichCoKg || 0) * (r.tonKhoHienTai || 0)) / 1000;
        return <strong style={{ color: '#5B8FF9' }}>{tons.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</strong>;
      },
      sorter: (a: any, b: any) => (a.kichCoKg * a.tonKhoHienTai) - (b.kichCoKg * b.tonKhoHienTai),
    },
    { title: 'Nhu cầu dự kiến', dataIndex: 'nhuCauDuKien', width: 120, align: 'right',
      render: (v: number) => v ? v.toLocaleString() : '-' },
    { title: 'Mức cảnh báo', dataIndex: 'mucCanhBao', width: 115,
      render: (v: string) => v ? <Tag icon={v === 'Thiếu' ? <WarningOutlined /> : undefined}
        color={ALERT_COLORS[v] || 'default'}>{v}</Tag> : '-' },
    { title: 'SL thiếu', dataIndex: 'soLuongThieu', width: 80, align: 'right',
      render: (v: number) => v ? <span style={{ color: '#BF616A', fontWeight: 600 }}>{v.toLocaleString()}</span> : '-' },
    { title: 'Ngày KT', dataIndex: 'ngayKiemTra', width: 100,
      render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '-' },
    { title: 'Ghi chú', dataIndex: 'ghiChu', ellipsis: true },
    { title: '', key: 'action', width: 50,
      render: (_, r: any) => (
        <Popconfirm title="Xóa?" onConfirm={async () => { await baobiApi.delete(r.id); loadData(); loadDates(); }}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  // Use server-side totals (full dataset, not just current page)
  const totalBags = serverTotalBao;
  const totalTons = serverTotalKg / 1000;

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Title level={3} style={{ margin: 0 }}>🎒 Bao bì - Tồn kho</Title>
          <Input.Search
            placeholder="Tìm loại bao..."
            allowClear
            onSearch={handleSearch}
            style={{ width: 220 }}
            prefix={<SearchOutlined style={{ color: 'rgba(255,255,255,0.4)' }} />}
          />
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => { loadData(); loadDates(); }}>Tải lại</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>Thêm</Button>
        </Space>
      </div>

      {/* 31-day calendar bar */}
      <Card size="small" style={{ borderRadius: 10, marginBottom: 12, padding: '4px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Button size="small" onClick={() => setCalMonth(m => m.subtract(1, 'month'))}>&lt;</Button>
            <span style={{ fontWeight: 600, minWidth: 90, textAlign: 'center' }}>
              {calMonth.format('MM/YYYY')}
            </span>
            <Button size="small" onClick={() => setCalMonth(m => m.add(1, 'month'))}>&gt;</Button>
          </div>
          <DayCalendar datesWithData={datesWithData} currentMonth={calMonth} />
          <span style={{ fontSize: 12, opacity: 0.5, marginLeft: 8 }}>
            {datesWithData.length}/{calMonth.daysInMonth()} ngày có dữ liệu
          </span>
        </div>
      </Card>

      {/* Summary bar */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 13 }}>
        <Tag color="blue">Tổng: {totalBags.toLocaleString()} bao</Tag>
        <Tag color="cyan">≈ {totalTons.toLocaleString(undefined, { maximumFractionDigits: 1 })} tấn</Tag>
        <Tag>{total} loại bao</Tag>
      </div>

      {/* Table */}
      <Card style={{ borderRadius: 12 }}>
        <Table dataSource={records} columns={columns} rowKey="id" loading={loading} size="middle" scroll={{ x: 1100 }}
          pagination={{ current: page, total, pageSize: 50, onChange: setPage, showTotal: (t) => `Tổng ${t}` }} />
      </Card>

      {/* Create modal */}
      <Modal title="Thêm bao bì" open={showModal} onOk={handleCreate}
        onCancel={() => setShowModal(false)} okText="Tạo" cancelText="Hủy">
        <Form form={form} layout="vertical" initialValues={{ kichCoKg: 25, ngayKiemTra: dayjs() }}>
          <Form.Item name="ngayKiemTra" label="Ngày kiểm tra"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item>
          <Form.Item name="loaiBao" label="Loại bao" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="kichCoKg" label="Kích cỡ (kg)">
            <Select options={[25, 40, 50].map(v => ({ value: v, label: `${v} kg` }))} />
          </Form.Item>
          <Form.Item name="tonKhoHienTai" label="Tồn kho hiện tại (bao)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="nhuCauDuKien" label="Nhu cầu dự kiến"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          <Form.Item name="mucCanhBao" label="Mức cảnh báo">
            <Select options={Object.keys(ALERT_COLORS).map(k => ({ value: k, label: k }))} />
          </Form.Item>
          <Form.Item name="soLuongThieu" label="Số lượng thiếu"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          <Form.Item name="ghiChu" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

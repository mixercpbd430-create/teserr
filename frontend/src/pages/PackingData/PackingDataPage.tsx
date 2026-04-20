import { useEffect, useState } from 'react';
import { Table, Card, Button, DatePicker, Space, Typography, Tag, Statistic, Row, Col, Input } from 'antd';
import { SearchOutlined, ReloadOutlined, InboxOutlined, BarChartOutlined } from '@ant-design/icons';
import { packingApi } from '../../api/apiClient';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;

interface PackingRecord {
  id: number;
  ngayDongBao: string;
  idSanPham: number | null;
  soLuongTan: number;
  kichCoBaoKg: number;
  soBao: number | null;
  lineDongBao: string;
  ghiChu: string | null;
  nguoiTao: string | null;
  thoiGianTao: string | null;
  sanPham: { id: number; codeCam: string; tenCam: string } | null;
}

const LINE_COLORS: Record<string, string> = {
  'L1': 'blue',
  'L2': 'green',
  'L3': 'orange',
  'L4': 'purple',
};

export default function PackingDataPage() {
  const [records, setRecords] = useState<PackingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [search, setSearch] = useState('');
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => { loadData(); }, [page, selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const dateStr = selectedDate.format('YYYY-MM-DD');
      const [res, sumRes] = await Promise.all([
        packingApi.getAll({ date: dateStr, page, pageSize: 50 }),
        packingApi.getSummary(dateStr),
      ]);
      setRecords(res.data.items);
      setTotal(res.data.totalCount);
      setSummary(sumRes.data);
    } catch { /* */ } finally { setLoading(false); }
  };

  // Group by line
  const lineStats = records.reduce((acc, r) => {
    const line = r.lineDongBao || 'N/A';
    if (!acc[line]) acc[line] = { count: 0, totalTan: 0, totalBao: 0 };
    acc[line].count++;
    acc[line].totalTan += r.soLuongTan;
    acc[line].totalBao += r.soBao ?? 0;
    return acc;
  }, {} as Record<string, { count: number; totalTan: number; totalBao: number }>);

  // Filter by search
  const filtered = search
    ? records.filter(r =>
        (r.sanPham?.codeCam?.toLowerCase().includes(search.toLowerCase())) ||
        (r.sanPham?.tenCam?.toLowerCase().includes(search.toLowerCase())) ||
        (r.lineDongBao?.toLowerCase().includes(search.toLowerCase()))
      )
    : records;

  const columns: ColumnsType<PackingRecord> = [
    { title: 'ID', dataIndex: 'id', width: 60, align: 'center' },
    { title: 'Code cám', key: 'code', width: 110, render: (_, r) => r.sanPham?.codeCam || '-' },
    {
      title: 'Tên cám', key: 'ten', width: 200,
      render: (_, r) => <span style={{ fontWeight: 500 }}>{r.sanPham?.tenCam || '-'}</span>
    },
    {
      title: 'SL (tấn)', dataIndex: 'soLuongTan', width: 110, align: 'right',
      render: (v: number) => <strong style={{ color: '#A3BE8C' }}>{v?.toFixed(2)}</strong>,
      sorter: (a, b) => a.soLuongTan - b.soLuongTan,
    },
    {
      title: 'SL (kg)', key: 'kg', width: 110, align: 'right',
      render: (_, r) => <span style={{ color: '#888' }}>{(r.soLuongTan * 1000).toLocaleString()}</span>
    },
    {
      title: 'Bao (kg)', dataIndex: 'kichCoBaoKg', width: 90, align: 'right',
      render: (v: number) => `${v} kg`
    },
    {
      title: 'Số bao', dataIndex: 'soBao', width: 90, align: 'right',
      render: (v: number) => v ? <strong>{v.toLocaleString()}</strong> : '-'
    },
    {
      title: 'Line', dataIndex: 'lineDongBao', width: 80, align: 'center',
      render: (v: string) => <Tag color={LINE_COLORS[v] || 'default'}>{v}</Tag>,
      filters: Object.keys(LINE_COLORS).map(k => ({ text: k, value: k })),
      onFilter: (value, record) => record.lineDongBao === value,
    },
    { title: 'Ghi chú', dataIndex: 'ghiChu', ellipsis: true },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>📦 Đóng bao hằng ngày</Title>
        <Space>
          <Input
            placeholder="Tìm kiếm..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={e => setSearch(e.target.value)}
            allowClear
            style={{ width: 220 }}
          />
          <DatePicker
            value={selectedDate}
            onChange={(d) => d && setSelectedDate(d)}
            format="DD/MM/YYYY"
            allowClear={false}
          />
          <Button icon={<ReloadOutlined />} onClick={loadData}>Tải lại</Button>
        </Space>
      </div>

      {/* Summary cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #A3BE8C' }}>
            <Statistic
              title="Tổng SL (tấn)"
              value={summary?.tongSoLuongTan ?? 0}
              precision={2}
              suffix="tấn"
              prefix={<InboxOutlined />}
              valueStyle={{ color: '#A3BE8C', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #5E81AC' }}>
            <Statistic
              title="Tổng SL (kg)"
              value={(summary?.tongSoLuongTan ?? 0) * 1000}
              formatter={(v) => Number(v).toLocaleString()}
              valueStyle={{ color: '#5E81AC', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #EBCB8B' }}>
            <Statistic
              title="Tổng số bao"
              value={summary?.tongSoBao ?? 0}
              formatter={(v) => Number(v).toLocaleString()}
              valueStyle={{ color: '#EBCB8B' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #D08770' }}>
            <Statistic
              title="Số đơn"
              value={summary?.soDong ?? 0}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#D08770' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Line breakdown */}
      {Object.keys(lineStats).length > 0 && (
        <Card size="small" style={{ borderRadius: 8, marginBottom: 16, background: '#fafbfc' }}>
          <Space size={24} wrap>
            <strong>Theo Line:</strong>
            {Object.entries(lineStats).map(([line, stats]) => (
              <span key={line}>
                <Tag color={LINE_COLORS[line] || 'default'}>{line}</Tag>
                <span style={{ fontSize: 13 }}>
                  {stats.totalTan.toFixed(2)} tấn / {stats.totalBao.toLocaleString()} bao ({stats.count} đơn)
                </span>
              </span>
            ))}
          </Space>
        </Card>
      )}

      <Card style={{ borderRadius: 12 }}>
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="middle"
          scroll={{ x: 1000 }}
          pagination={{
            current: page,
            total,
            pageSize: 50,
            onChange: setPage,
            showTotal: (t) => `Tổng ${t} bản ghi`,
          }}
          summary={() => {
            if (filtered.length === 0) return null;
            const sumTan = filtered.reduce((s, r) => s + r.soLuongTan, 0);
            const sumBao = filtered.reduce((s, r) => s + (r.soBao ?? 0), 0);
            return (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: '#f0f9f4' }}>
                  <Table.Summary.Cell index={0} colSpan={3} align="right">
                    <strong>TỔNG CỘNG:</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align="right">
                    <strong style={{ color: '#A3BE8C', fontSize: 14 }}>{sumTan.toFixed(2)}</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right">
                    <strong style={{ color: '#888' }}>{(sumTan * 1000).toLocaleString()}</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5}></Table.Summary.Cell>
                  <Table.Summary.Cell index={6} align="right">
                    <strong>{sumBao.toLocaleString()}</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={7} colSpan={2}></Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            );
          }}
        />
      </Card>
    </div>
  );
}

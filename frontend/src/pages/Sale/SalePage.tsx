import { useEffect, useState } from 'react';
import { Table, Card, Button, DatePicker, Space, Typography, Tag, Statistic, Row, Col, Input } from 'antd';
import { SearchOutlined, ReloadOutlined, DollarOutlined, ShoppingCartOutlined, UserOutlined } from '@ant-design/icons';
import { orderApi } from '../../api/apiClient';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;

interface SaleRecord {
  id: number;
  idSanPham: number | null;
  maDatHang: string | null;
  soLuong: number;
  ngayDat: string | null;
  ngayLay: string | null;
  loaiDatHang: string | null;
  khachVangLai: number;
  ghiChu: string | null;
  nguoiTao: string | null;
  thoiGianTao: string | null;
  sanPham: { id: number; codeCam: string; tenCam: string; dangEpVien?: string } | null;
}

const TYPE_COLORS: Record<string, string> = {
  'Khách vãng lai': 'orange',
  'Đại lý Bá Cang': 'blue',
  'Xe bồn Silo': 'green',
  'Forecast tuần': 'purple',
};

export default function SalePage() {
  const [records, setRecords] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [search, setSearch] = useState('');

  useEffect(() => { loadData(); }, [page, selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const dateStr = selectedDate.format('YYYY-MM-DD');
      const res = await orderApi.getAll({ date: dateStr, page, pageSize: 50 });
      setRecords(res.data.items);
      setTotal(res.data.totalCount);
    } catch { /* */ } finally { setLoading(false); }
  };

  // Compute summary from loaded records
  const totalKg = records.reduce((sum, r) => sum + r.soLuong, 0);
  const totalTan = totalKg / 1000;
  const totalOrders = records.length;
  const uniqueProducts = new Set(records.map(r => r.idSanPham).filter(Boolean)).size;

  // Filter by search
  const filtered = search
    ? records.filter(r =>
        (r.sanPham?.codeCam?.toLowerCase().includes(search.toLowerCase())) ||
        (r.sanPham?.tenCam?.toLowerCase().includes(search.toLowerCase())) ||
        (r.maDatHang?.toLowerCase().includes(search.toLowerCase())) ||
        (r.loaiDatHang?.toLowerCase().includes(search.toLowerCase()))
      )
    : records;

  const columns: ColumnsType<SaleRecord> = [
    { title: 'ID', dataIndex: 'id', width: 60, align: 'center' },
    {
      title: 'Mã ĐH', dataIndex: 'maDatHang', width: 100,
      render: (v: string) => <Tag color="geekblue">{v}</Tag>
    },
    { title: 'Code cám', key: 'code', width: 110, render: (_, r) => r.sanPham?.codeCam || '-' },
    {
      title: 'Tên cám', key: 'ten', width: 200,
      render: (_, r) => <span style={{ fontWeight: 500 }}>{r.sanPham?.tenCam || '-'}</span>
    },
    {
      title: 'Số lượng (kg)', dataIndex: 'soLuong', width: 130, align: 'right',
      render: (v: number) => <strong style={{ color: '#BF616A' }}>{v?.toLocaleString()}</strong>,
      sorter: (a, b) => a.soLuong - b.soLuong,
    },
    {
      title: 'Tấn', key: 'tan', width: 80, align: 'right',
      render: (_, r) => <span style={{ color: '#888' }}>{(r.soLuong / 1000).toFixed(2)}</span>
    },
    {
      title: 'Loại', dataIndex: 'loaiDatHang', width: 140,
      render: (v: string) => <Tag color={TYPE_COLORS[v] || 'default'}>{v || '-'}</Tag>
    },
    { title: 'Ngày đặt', dataIndex: 'ngayDat', width: 110 },
    { title: 'Ngày lấy', dataIndex: 'ngayLay', width: 110 },
    {
      title: 'Khách VL', dataIndex: 'khachVangLai', width: 80, align: 'center',
      render: (v: number) => v ? <Tag color="volcano">{v}</Tag> : '-'
    },
    { title: 'Ghi chú', dataIndex: 'ghiChu', ellipsis: true },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>💰 Sale - Bán hàng hằng ngày</Title>
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

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #BF616A' }}>
            <Statistic
              title="Tổng SL (kg)"
              value={totalKg}
              formatter={(v) => Number(v).toLocaleString()}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#BF616A', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #D08770' }}>
            <Statistic
              title="Tổng SL (tấn)"
              value={totalTan}
              precision={2}
              suffix="tấn"
              valueStyle={{ color: '#D08770', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #5E81AC' }}>
            <Statistic
              title="Số đơn hàng"
              value={totalOrders}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: '#5E81AC' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #A3BE8C' }}>
            <Statistic
              title="Sản phẩm"
              value={uniqueProducts}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#A3BE8C' }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ borderRadius: 12 }}>
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="middle"
          scroll={{ x: 1200 }}
          pagination={{
            current: page,
            total,
            pageSize: 50,
            onChange: setPage,
            showTotal: (t) => `Tổng ${t} đơn hàng`,
          }}
          summary={() => {
            if (filtered.length === 0) return null;
            const sumKg = filtered.reduce((s, r) => s + r.soLuong, 0);
            return (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: '#fff7f0' }}>
                  <Table.Summary.Cell index={0} colSpan={4} align="right">
                    <strong>TỔNG CỘNG:</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right">
                    <strong style={{ color: '#BF616A', fontSize: 14 }}>{sumKg.toLocaleString()}</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={5} align="right">
                    <strong style={{ color: '#D08770' }}>{(sumKg / 1000).toFixed(2)}</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={6} colSpan={5}></Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            );
          }}
        />
      </Card>
    </div>
  );
}

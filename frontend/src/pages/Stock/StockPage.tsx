import { useEffect, useState } from 'react';
import { Table, Card, Input, Space, Typography, Statistic, Row, Col, DatePicker, Spin } from 'antd';
import { SearchOutlined, ReloadOutlined, DatabaseOutlined, CalendarOutlined } from '@ant-design/icons';
import { stockApi } from '../../api/apiClient';
import { Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface StockItem {
  id: number; idSanPham: number; soLuong: number; ngayCapNhat: string;
  ghiChu: string;
  sanPham: { codeCam: string; tenCam: string; dangEpVien: string } | null;
}

interface MonthlySummary {
  year: number;
  month: number;
  daysInMonth: number;
  stock: number[];
  packing: number[];
  sale: number[];
}

// Format number as compact (e.g. 1,234 -> 1.2k, 1234567 -> 1,235t)
function formatCompact(val: number, isTan = false): string {
  if (val === 0) return '-';
  if (isTan) return val.toFixed(1);
  if (val >= 1000000) return (val / 1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '';
  if (val >= 1000) return val.toLocaleString();
  return val.toString();
}

export default function StockPage() {
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [summary, setSummary] = useState({ totalProducts: 0, totalStock: 0, totalStockTan: 0 });

  // Monthly summary
  const [selectedMonth, setSelectedMonth] = useState(dayjs());
  const [monthlyData, setMonthlyData] = useState<MonthlySummary | null>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  useEffect(() => { loadStocks(); loadSummary(); }, [page, search]);
  useEffect(() => { loadMonthlySummary(); }, [selectedMonth]);

  const loadStocks = async () => {
    setLoading(true);
    try {
      const res = await stockApi.getAll({ search, page, pageSize: 50 });
      setStocks(res.data.items); setTotal(res.data.totalCount);
    } catch { /* */ } finally { setLoading(false); }
  };

  const loadSummary = async () => {
    try { const res = await stockApi.getSummary(); setSummary(res.data); }
    catch { /* */ }
  };

  const loadMonthlySummary = async () => {
    setMonthlyLoading(true);
    try {
      const res = await stockApi.getMonthlySummary(selectedMonth.year(), selectedMonth.month() + 1);
      setMonthlyData(res.data);
    } catch {
      // Use empty data when API unavailable
      const daysInMonth = selectedMonth.daysInMonth();
      setMonthlyData({
        year: selectedMonth.year(),
        month: selectedMonth.month() + 1,
        daysInMonth,
        stock: new Array(daysInMonth).fill(0),
        packing: new Array(daysInMonth).fill(0),
        sale: new Array(daysInMonth).fill(0),
      });
    } finally { setMonthlyLoading(false); }
  };

  const columns: ColumnsType<StockItem> = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: 'Code cám', key: 'code', width: 120, render: (_, r) => r.sanPham?.codeCam || '-' },
    { title: 'Tên cám', key: 'ten', width: 200, render: (_, r) => r.sanPham?.tenCam || '-' },
    { title: 'Dạng ép viên', key: 'dang', width: 120, render: (_, r) => r.sanPham?.dangEpVien || '-' },
    { title: 'Số lượng (kg)', dataIndex: 'soLuong', width: 140, align: 'right',
      render: (v: number) => <strong style={{ color: '#A3BE8C' }}>{v?.toLocaleString()}</strong>,
      sorter: (a, b) => a.soLuong - b.soLuong },
    { title: 'Tấn', key: 'tan', width: 80, align: 'right',
      render: (_, r) => (r.soLuong / 1000).toFixed(1) },
    { title: 'Ngày cập nhật', dataIndex: 'ngayCapNhat', width: 130 },
    { title: 'Ghi chú', dataIndex: 'ghiChu', ellipsis: true },
  ];

  const today = dayjs();
  const isCurrentMonth = selectedMonth.year() === today.year() && selectedMonth.month() === today.month();
  const daysInMonth = monthlyData?.daysInMonth ?? selectedMonth.daysInMonth();

  // Row configs for the monthly table
  const rowConfigs = [
    {
      label: 'Stock TP',
      icon: '📦',
      data: monthlyData?.stock ?? [],
      color: '#5E81AC',
      bgColor: 'rgba(94, 129, 172, 0.08)',
      borderColor: 'rgba(94, 129, 172, 0.3)',
      unit: 'kg',
      isTan: false,
    },
    {
      label: 'Packing',
      icon: '📋',
      data: monthlyData?.packing ?? [],
      color: '#A3BE8C',
      bgColor: 'rgba(163, 190, 140, 0.08)',
      borderColor: 'rgba(163, 190, 140, 0.3)',
      unit: 'tấn',
      isTan: true,
    },
    {
      label: 'Sale',
      icon: '💰',
      data: monthlyData?.sale ?? [],
      color: '#BF616A',
      bgColor: 'rgba(191, 97, 106, 0.08)',
      borderColor: 'rgba(191, 97, 106, 0.3)',
      unit: 'kg',
      isTan: false,
    },
  ];

  return (
    <div>
      {/* ========== MONTHLY SUMMARY TABLE (RED ZONE) ========== */}
      <Card
        style={{
          borderRadius: 12,
          marginBottom: 16,
          border: '2px solid #BF616A',
          boxShadow: '0 2px 12px rgba(191, 97, 106, 0.15)',
        }}
        bodyStyle={{ padding: '12px 16px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CalendarOutlined style={{ fontSize: 20, color: '#BF616A' }} />
            <Title level={4} style={{ margin: 0, color: '#2E3440' }}>
              Tổng hợp tháng {selectedMonth.month() + 1}/{selectedMonth.year()}
            </Title>
          </div>
          <DatePicker
            picker="month"
            value={selectedMonth}
            onChange={(d) => d && setSelectedMonth(d)}
            format="MM/YYYY"
            allowClear={false}
            style={{ width: 140 }}
          />
        </div>

        {monthlyLoading ? (
          <div style={{ textAlign: 'center', padding: 30 }}><Spin /></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              minWidth: daysInMonth * 65 + 120,
              borderCollapse: 'collapse',
              fontSize: 12,
              fontFamily: "'Inter', monospace",
            }}>
              <thead>
                <tr>
                  <th style={{
                    position: 'sticky', left: 0, zIndex: 2,
                    background: '#f8f9fa', padding: '8px 12px',
                    borderBottom: '2px solid #dee2e6',
                    textAlign: 'left', fontWeight: 700, fontSize: 13,
                    minWidth: 110,
                  }}>
                    Chỉ tiêu
                  </th>
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const day = i + 1;
                    const isToday = isCurrentMonth && day === today.date();
                    return (
                      <th key={day} style={{
                        padding: '6px 4px',
                        borderBottom: '2px solid #dee2e6',
                        textAlign: 'center',
                        fontWeight: isToday ? 800 : 600,
                        fontSize: isToday ? 13 : 12,
                        color: isToday ? '#fff' : '#495057',
                        background: isToday ? '#BF616A' : '#f8f9fa',
                        borderRadius: isToday ? '6px 6px 0 0' : 0,
                        minWidth: 55,
                      }}>
                        {day}
                      </th>
                    );
                  })}
                  <th style={{
                    padding: '6px 8px',
                    borderBottom: '2px solid #dee2e6',
                    textAlign: 'center',
                    fontWeight: 800,
                    fontSize: 13,
                    color: '#2E3440',
                    background: '#f8f9fa',
                    minWidth: 80,
                  }}>
                    TỔNG
                  </th>
                </tr>
              </thead>
              <tbody>
                {rowConfigs.map((row, rowIdx) => {
                  const rowTotal = row.data.reduce((sum, v) => sum + v, 0);
                  return (
                    <tr key={rowIdx} style={{ background: row.bgColor }}>
                      <td style={{
                        position: 'sticky', left: 0, zIndex: 1,
                        padding: '10px 12px',
                        borderBottom: `1px solid ${row.borderColor}`,
                        fontWeight: 700,
                        color: row.color,
                        background: row.bgColor,
                        whiteSpace: 'nowrap',
                        fontSize: 13,
                      }}>
                        {row.icon} {row.label}
                        <span style={{ fontSize: 10, color: '#999', marginLeft: 4 }}>({row.unit})</span>
                      </td>
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const val = row.data[i] ?? 0;
                        const isToday = isCurrentMonth && (i + 1) === today.date();
                        return (
                          <td key={i} style={{
                            padding: '8px 4px',
                            borderBottom: `1px solid ${row.borderColor}`,
                            textAlign: 'right',
                            fontWeight: val > 0 ? 600 : 400,
                            color: val > 0 ? row.color : '#ccc',
                            fontSize: 12,
                            background: isToday ? 'rgba(191, 97, 106, 0.1)' : 'transparent',
                            borderLeft: isToday ? '2px solid #BF616A' : 'none',
                            borderRight: isToday ? '2px solid #BF616A' : 'none',
                          }}>
                            {formatCompact(val, row.isTan)}
                          </td>
                        );
                      })}
                      <td style={{
                        padding: '8px 8px',
                        borderBottom: `1px solid ${row.borderColor}`,
                        textAlign: 'right',
                        fontWeight: 800,
                        color: row.color,
                        fontSize: 13,
                        borderLeft: '2px solid #dee2e6',
                        background: 'rgba(0,0,0,0.03)',
                      }}>
                        {row.isTan ? rowTotal.toFixed(1) : rowTotal.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ========== EXISTING STOCK PAGE ========== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3}>📊 Stock hôm nay</Title>
        <Space>
          <Input placeholder="Tìm kiếm..." prefix={<SearchOutlined />}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            allowClear style={{ width: 250 }} />
          <Button icon={<ReloadOutlined />} onClick={loadStocks}>Tải lại</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic title="Sản phẩm" value={summary.totalProducts}
              prefix={<DatabaseOutlined />} valueStyle={{ color: '#5E81AC' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic title="Tổng Stock" value={summary.totalStock}
              suffix="kg" formatter={(v) => Number(v).toLocaleString()}
              valueStyle={{ color: '#A3BE8C', fontWeight: 700 }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic title="Tổng Stock (tấn)" value={summary.totalStockTan}
              precision={1} suffix="tấn"
              valueStyle={{ color: '#EBCB8B' }} />
          </Card>
        </Col>
      </Row>

      <Card style={{ borderRadius: 12 }}>
        <Table dataSource={stocks} columns={columns} rowKey="id"
          loading={loading} size="middle" scroll={{ x: 900 }}
          pagination={{ current: page, total, pageSize: 50, onChange: setPage,
            showTotal: (t) => `Tổng ${t} bản ghi` }} />
      </Card>
    </div>
  );
}

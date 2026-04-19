import { useEffect, useState } from 'react';
import { Table, Card, Input, Space, Typography, Statistic, Row, Col } from 'antd';
import { SearchOutlined, ReloadOutlined, DatabaseOutlined } from '@ant-design/icons';
import { stockApi } from '../../api/apiClient';
import { Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;

interface StockItem {
  id: number; idSanPham: number; soLuong: number; ngayCapNhat: string;
  ghiChu: string;
  sanPham: { codeCam: string; tenCam: string; dangEpVien: string } | null;
}

export default function StockPage() {
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [summary, setSummary] = useState({ totalProducts: 0, totalStock: 0, totalStockTan: 0 });

  useEffect(() => { loadStocks(); loadSummary(); }, [page, search]);

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

  return (
    <div>
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

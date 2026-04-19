import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Typography, Spin } from 'antd';
import {
  ShoppingOutlined, CalendarOutlined, DatabaseOutlined,
  BarChartOutlined, RiseOutlined,
} from '@ant-design/icons';
import { dashboardApi } from '../api/apiClient';

const { Title } = Typography;

interface DashboardData {
  totalProducts: number;
  totalPlansToday: number;
  totalProductionToday: number;
  totalOrders: number;
  totalStock: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await dashboardApi.get();
      setData(res.data);
    } catch {
      // Use placeholder data when API is unavailable
      setData({ totalProducts: 0, totalPlansToday: 0, totalProductionToday: 0, totalOrders: 0, totalStock: 0 });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: 100 }}><Spin size="large" /></div>;

  const stats = [
    { title: 'Sản phẩm', value: data?.totalProducts ?? 0, icon: <ShoppingOutlined />, color: '#5E81AC', suffix: 'loại' },
    { title: 'Plan hôm nay', value: data?.totalPlansToday ?? 0, icon: <CalendarOutlined />, color: '#A3BE8C', suffix: 'SP' },
    { title: 'Sản lượng hôm nay', value: data?.totalProductionToday ?? 0, icon: <RiseOutlined />, color: '#EBCB8B', suffix: 'kg', formatter: true },
    { title: 'Đơn hàng', value: data?.totalOrders ?? 0, icon: <BarChartOutlined />, color: '#BF616A', suffix: 'đơn' },
    { title: 'Tổng tồn kho', value: data?.totalStock ?? 0, icon: <DatabaseOutlined />, color: '#B48EAD', suffix: 'kg', formatter: true },
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>📊 Tổng quan hệ thống</Title>
      <Row gutter={[16, 16]}>
        {stats.map((s, i) => (
          <Col xs={24} sm={12} lg={8} xl={Math.floor(24 / stats.length)} key={i}>
            <Card hoverable style={{
              borderRadius: 12, border: 'none',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              background: `linear-gradient(135deg, ${s.color}15, ${s.color}05)`,
            }}>
              <Statistic
                title={<span style={{ fontSize: 14, color: '#666' }}>{s.title}</span>}
                value={s.value}
                prefix={<span style={{ color: s.color, marginRight: 8 }}>{s.icon}</span>}
                suffix={s.suffix}
                formatter={s.formatter ? (v) => Number(v).toLocaleString() : undefined}
                valueStyle={{ color: s.color, fontWeight: 700, fontSize: 28 }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col span={24}>
          <Card style={{ borderRadius: 12, minHeight: 300 }}>
            <Title level={4}>🏭 Trạng thái sản xuất</Title>
            <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
              <CalendarOutlined style={{ fontSize: 48, marginBottom: 16 }} />
              <p>Kết nối backend API để xem dữ liệu chi tiết</p>
              <p style={{ fontSize: 12 }}>
                Backend: <code>dotnet run</code> từ <code>backend/B7KHSX.Api/</code>
              </p>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

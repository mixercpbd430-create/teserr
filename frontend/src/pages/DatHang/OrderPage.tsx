import { useEffect, useState } from 'react';
import { Table, Card, Button, Select, Space, Typography, Tag, Modal, Form,
  InputNumber, Input, DatePicker, message, Tabs, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { orderApi, productApi } from '../../api/apiClient';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;

interface OrderItem {
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
  sanPham: { codeCam: string; tenCam: string } | null;
}

interface TypeSummary { type: string; count: number; totalKg: number; }

const ORDER_TYPES = ['Khách vãng lai', 'Đại lý Bá Cang', 'Xe bồn Silo', 'Forecast tuần'];
const TYPE_COLORS: Record<string, string> = {
  'Khách vãng lai': 'orange', 'Đại lý Bá Cang': 'green',
  'Xe bồn Silo': 'blue', 'Forecast tuần': 'purple',
};

export default function OrderPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [activeType, setActiveType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form] = Form.useForm();
  const [summary, setSummary] = useState<TypeSummary[]>([]);

  useEffect(() => { loadOrders(); loadProducts(); loadSummary(); }, [page, activeType]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await orderApi.getAll({ type: activeType || undefined, page, pageSize: 50 });
      setOrders(res.data.items);
      setTotal(res.data.totalCount);
    } catch { /* API not connected */ }
    finally { setLoading(false); }
  };

  const loadProducts = async () => {
    try { const res = await productApi.getList(); setProducts(res.data); }
    catch { /* */ }
  };

  const loadSummary = async () => {
    try { const res = await orderApi.getSummary(); setSummary(res.data); }
    catch { /* */ }
  };

  const getTypeSummary = (type: string): TypeSummary | undefined =>
    summary.find(s => s.type === type);

  const getTotalAll = () => ({
    count: summary.reduce((s, t) => s + t.count, 0),
    totalKg: summary.reduce((s, t) => s + t.totalKg, 0),
  });

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await orderApi.create({
        idSanPham: values.idSanPham, soLuong: values.soLuong,
        ngayLay: values.ngayLay?.format('YYYY-MM-DD'),
        ghiChu: values.ghiChu, loaiDatHang: values.loaiDatHang,
        khachVangLai: values.loaiDatHang === 'Khách vãng lai' ? 1 : 0,
      });
      message.success('Đã tạo đơn hàng!');
      setShowModal(false); form.resetFields(); loadOrders(); loadSummary();
    } catch { message.error('Lỗi khi tạo đơn hàng'); }
  };

  const handleDelete = async (id: number) => {
    try { await orderApi.delete(id); message.success('Đã xóa'); loadOrders(); loadSummary(); }
    catch { message.error('Lỗi'); }
  };

  const columns: ColumnsType<OrderItem> = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: 'Mã ĐH', dataIndex: 'maDatHang', width: 140, ellipsis: true,
      render: (v: string) => <Tag color="cyan" style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</Tag> },
    { title: 'Code cám', key: 'code', width: 110, render: (_, r) => r.sanPham?.codeCam || '-' },
    { title: 'Tên cám', key: 'ten', width: 180, render: (_, r) => r.sanPham?.tenCam || '-' },
    { title: 'Số lượng', dataIndex: 'soLuong', width: 120, align: 'right',
      render: (v: number) => <strong>{v?.toLocaleString()} kg</strong>,
      sorter: (a, b) => a.soLuong - b.soLuong },
    { title: 'Loại', dataIndex: 'loaiDatHang', width: 140,
      render: (v: string) => <Tag color={TYPE_COLORS[v] || 'default'}>{v}</Tag> },
    { title: 'Ngày lấy', dataIndex: 'ngayLay', width: 110 },
    { title: 'Ghi chú', dataIndex: 'ghiChu', ellipsis: true },
    { title: '', key: 'action', width: 50,
      render: (_, r) => (
        <Popconfirm title="Xóa đơn hàng?" onConfirm={() => handleDelete(r.id)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  const tabItems = [
    { key: '', label: <span>📋 Tất cả <Tag>{getTotalAll().count}</Tag> <Tag color="green">{(getTotalAll().totalKg / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tấn</Tag></span> },
    ...ORDER_TYPES.map(t => {
      const s = getTypeSummary(t);
      return {
        key: t,
        label: <span>{t} {s ? <><Tag>{s.count}</Tag> <Tag color={TYPE_COLORS[t]}>{(s.totalKg / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tấn</Tag></> : ''}</span>,
      };
    }),
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3}>🛒 Đặt hàng</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => { loadOrders(); loadSummary(); }}>Tải lại</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>
            Thêm đơn hàng
          </Button>
        </Space>
      </div>

      <Card style={{ borderRadius: 12 }}>
        <Tabs items={tabItems} activeKey={activeType}
          onChange={(k) => { setActiveType(k); setPage(1); }} />
        <Table dataSource={orders} columns={columns} rowKey="id"
          loading={loading} size="middle" scroll={{ x: 900 }}
          pagination={{ current: page, total, pageSize: 50, onChange: setPage,
            showTotal: (t) => `Tổng ${t} đơn hàng` }} />
      </Card>

      <Modal title="Thêm đơn hàng" open={showModal} onOk={handleCreate}
        onCancel={() => setShowModal(false)} okText="Tạo" cancelText="Hủy" width={500}>
        <Form form={form} layout="vertical"
          initialValues={{ loaiDatHang: 'Khách vãng lai' }}>
          <Form.Item name="loaiDatHang" label="Loại đặt hàng" rules={[{ required: true }]}>
            <Select options={ORDER_TYPES.map(t => ({ value: t, label: t }))} />
          </Form.Item>
          <Form.Item name="idSanPham" label="Sản phẩm" rules={[{ required: true }]}>
            <Select showSearch placeholder="Chọn sản phẩm" optionFilterProp="label"
              options={products.map((p: any) => ({ value: p.id, label: `${p.codeCam} - ${p.tenCam}` }))} />
          </Form.Item>
          <Form.Item name="soLuong" label="Số lượng (kg)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} step={1000}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
          </Form.Item>
          <Form.Item name="ngayLay" label="Ngày lấy">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="ghiChu" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

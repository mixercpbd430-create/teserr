import { useEffect, useState } from 'react';
import { Table, Card, Button, DatePicker, Space, Typography, Modal, Form,
  InputNumber, Select, Input, message, Popconfirm, Tag, Statistic, Row, Col } from 'antd';
import { PlusOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { packingApi, productApi } from '../../api/apiClient';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;

export default function PackingPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [showModal, setShowModal] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [form] = Form.useForm();

  useEffect(() => { loadData(); loadProducts(); }, [page, selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const dateStr = selectedDate.format('YYYY-MM-DD');
      const [res, sumRes] = await Promise.all([
        packingApi.getAll({ date: dateStr, page, pageSize: 50 }),
        packingApi.getSummary(dateStr),
      ]);
      setRecords(res.data.items); setTotal(res.data.totalCount);
      setSummary(sumRes.data);
    } catch { /* */ } finally { setLoading(false); }
  };

  const loadProducts = async () => {
    try { const res = await productApi.getList(); setProducts(res.data); }
    catch { /* */ }
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await packingApi.create({
        ngayDongBao: selectedDate.toISOString(), idSanPham: values.idSanPham,
        soLuongTan: values.soLuongTan, kichCoBaoKg: values.kichCoBaoKg,
        soBao: values.soBao, lineDongBao: values.lineDongBao, ghiChu: values.ghiChu
      });
      message.success('Đã thêm!'); setShowModal(false); form.resetFields(); loadData();
    } catch { message.error('Lỗi'); }
  };

  const columns: ColumnsType<any> = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: 'Code cám', key: 'code', width: 110, render: (_, r) => r.sanPham?.codeCam || '-' },
    { title: 'Tên cám', key: 'ten', width: 180, render: (_, r) => r.sanPham?.tenCam || '-' },
    { title: 'SL (tấn)', dataIndex: 'soLuongTan', width: 100, align: 'right',
      render: (v: number) => <strong>{v?.toFixed(2)}</strong> },
    { title: 'Bao (kg)', dataIndex: 'kichCoBaoKg', width: 80, align: 'right' },
    { title: 'Số bao', dataIndex: 'soBao', width: 80, align: 'right',
      render: (v: number) => v ? v.toLocaleString() : '-' },
    { title: 'Line', dataIndex: 'lineDongBao', width: 70,
      render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: 'Ghi chú', dataIndex: 'ghiChu', ellipsis: true },
    { title: '', key: 'action', width: 50,
      render: (_, r: any) => (
        <Popconfirm title="Xóa?" onConfirm={async () => { await packingApi.delete(r.id); loadData(); }}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3}>📦 Packing - Đóng bao</Title>
        <Space>
          <DatePicker value={selectedDate} onChange={(d) => d && setSelectedDate(d)} format="DD/MM/YYYY" allowClear={false} />
          <Button icon={<ReloadOutlined />} onClick={loadData}>Tải lại</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>Thêm</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}><Card size="small" style={{ borderRadius: 8 }}>
          <Statistic title="Tổng SL (tấn)" value={summary?.tongSoLuongTan ?? 0} precision={2}
            suffix="tấn" valueStyle={{ color: '#5E81AC', fontWeight: 700 }} />
        </Card></Col>
        <Col span={8}><Card size="small" style={{ borderRadius: 8 }}>
          <Statistic title="Tổng số bao" value={summary?.tongSoBao ?? 0}
            formatter={(v) => Number(v).toLocaleString()} valueStyle={{ color: '#A3BE8C' }} />
        </Card></Col>
        <Col span={8}><Card size="small" style={{ borderRadius: 8 }}>
          <Statistic title="Số đơn" value={summary?.soDong ?? 0} valueStyle={{ color: '#EBCB8B' }} />
        </Card></Col>
      </Row>

      <Card style={{ borderRadius: 12 }}>
        <Table dataSource={records} columns={columns} rowKey="id" loading={loading} size="middle" scroll={{ x: 800 }}
          pagination={{ current: page, total, pageSize: 50, onChange: setPage, showTotal: (t) => `Tổng ${t}` }} />
      </Card>

      <Modal title="Thêm Packing" open={showModal} onOk={handleCreate}
        onCancel={() => setShowModal(false)} okText="Tạo" cancelText="Hủy">
        <Form form={form} layout="vertical" initialValues={{ kichCoBaoKg: 25, lineDongBao: 'L1' }}>
          <Form.Item name="idSanPham" label="Sản phẩm" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label"
              options={products.map((p: any) => ({ value: p.id, label: `${p.codeCam} - ${p.tenCam}` }))} />
          </Form.Item>
          <Form.Item name="soLuongTan" label="Số lượng (tấn)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} step={0.5} />
          </Form.Item>
          <Form.Item name="kichCoBaoKg" label="Kích cỡ bao (kg)">
            <Select options={[25, 40, 50].map(v => ({ value: v, label: `${v} kg` }))} />
          </Form.Item>
          <Form.Item name="soBao" label="Số bao"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
          <Form.Item name="lineDongBao" label="Line đóng bao">
            <Select options={['L1','L2','L3','L4'].map(l => ({ value: l, label: l }))} />
          </Form.Item>
          <Form.Item name="ghiChu" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

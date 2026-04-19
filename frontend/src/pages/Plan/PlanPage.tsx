import { useEffect, useState } from 'react';
import { Table, Card, Button, DatePicker, Space, Typography, Tag, Modal, Form,
  InputNumber, Select, Input, message, Statistic, Row, Col, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { planApi, productApi } from '../../api/apiClient';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;

interface PlanItem {
  id: number;
  idSanPham: number | null;
  maPlan: string | null;
  soLuong: number;
  ngayPlan: string | null;
  ghiChu: string | null;
  nguoiTao: string | null;
  thoiGianTao: string | null;
  sanPham: { id: number; codeCam: string; tenCam: string; dangEpVien: string; batchSize: number } | null;
}

interface ProductOption {
  id: number;
  codeCam: string;
  tenCam: string;
  batchSize: number;
}

export default function PlanPage() {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [showModal, setShowModal] = useState(false);
  const [summary, setSummary] = useState({ soSanPham: 0, tongSoLuong: 0 });
  const [form] = Form.useForm();

  useEffect(() => { loadPlans(); loadProducts(); }, [page, selectedDate]);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const dateStr = selectedDate.format('YYYY-MM-DD');
      const res = await planApi.getAll({ date: dateStr, page, pageSize: 50 });
      setPlans(res.data.items);
      setTotal(res.data.totalCount);
      const sumRes = await planApi.getSummary(dateStr);
      setSummary(sumRes.data);
    } catch { /* API not yet connected */ }
    finally { setLoading(false); }
  };

  const loadProducts = async () => {
    try {
      const res = await productApi.getList();
      setProducts(res.data);
    } catch { /* API not yet connected */ }
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await planApi.createBatch({
        ngayPlan: selectedDate.format('YYYY-MM-DD'),
        items: [{ idSanPham: values.idSanPham, soLuong: values.soLuong, ghiChu: values.ghiChu }],
      });
      message.success('Đã tạo plan thành công!');
      setShowModal(false);
      form.resetFields();
      loadPlans();
    } catch {
      message.error('Lỗi khi tạo plan');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await planApi.delete(id);
      message.success('Đã xóa');
      loadPlans();
    } catch {
      message.error('Lỗi khi xóa');
    }
  };

  const columns: ColumnsType<PlanItem> = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: 'Mã Plan', dataIndex: 'maPlan', key: 'maPlan', width: 100,
      render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: 'Code cám', key: 'codeCam', width: 120,
      render: (_, r) => r.sanPham?.codeCam || '-' },
    { title: 'Tên cám', key: 'tenCam', width: 200,
      render: (_, r) => r.sanPham?.tenCam || '-' },
    { title: 'Số lượng (kg)', dataIndex: 'soLuong', key: 'soLuong', width: 140, align: 'right',
      render: (v: number) => <span style={{ fontWeight: 600, color: '#5E81AC' }}>{v?.toLocaleString()}</span>,
      sorter: (a, b) => a.soLuong - b.soLuong },
    { title: 'Ngày Plan', dataIndex: 'ngayPlan', key: 'ngayPlan', width: 120 },
    { title: 'Ghi chú', dataIndex: 'ghiChu', key: 'ghiChu', ellipsis: true },
    { title: 'Người tạo', dataIndex: 'nguoiTao', key: 'nguoiTao', width: 100 },
    { title: '', key: 'action', width: 60,
      render: (_, r) => (
        <Popconfirm title="Xóa plan này?" onConfirm={() => handleDelete(r.id)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3}>📋 Kế hoạch Sản xuất</Title>
        <Space>
          <DatePicker value={selectedDate} onChange={(d) => d && setSelectedDate(d)}
            format="DD/MM/YYYY" allowClear={false} />
          <Button icon={<ReloadOutlined />} onClick={loadPlans}>Tải lại</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>
            Thêm Plan
          </Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic title="📦 Sản phẩm" value={summary.soSanPham} suffix="loại"
              valueStyle={{ color: '#5E81AC' }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic title="⚖️ Tổng sản lượng" value={summary.tongSoLuong}
              suffix="kg" formatter={(v) => Number(v).toLocaleString()}
              valueStyle={{ color: '#A3BE8C', fontWeight: 700 }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ borderRadius: 8 }}>
            <Statistic title="📊 Tỷ lệ công suất"
              value={((summary.tongSoLuong / 2100000) * 100)}
              precision={1} suffix="%"
              valueStyle={{ color: summary.tongSoLuong > 2100000 ? '#BF616A' : '#A3BE8C' }} />
          </Card>
        </Col>
      </Row>

      <Card style={{ borderRadius: 12 }}>
        <Table
          dataSource={plans} columns={columns} rowKey="id"
          loading={loading} size="middle" scroll={{ x: 1000 }}
          pagination={{ current: page, total, pageSize: 50, onChange: setPage,
            showTotal: (t) => `Tổng ${t} bản ghi`, showSizeChanger: false }}
          summary={(data) => {
            const totalQty = data.reduce((sum, r) => sum + r.soLuong, 0);
            return (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={4}><strong>TỔNG CỘNG</strong></Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <strong style={{ color: '#BF616A', fontSize: 16 }}>{totalQty.toLocaleString()}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} colSpan={4} />
              </Table.Summary.Row>
            );
          }}
        />
      </Card>

      <Modal title="Thêm Plan mới" open={showModal} onOk={handleCreate}
        onCancel={() => setShowModal(false)} okText="Tạo" cancelText="Hủy" width={500}>
        <Form form={form} layout="vertical">
          <Form.Item name="idSanPham" label="Sản phẩm" rules={[{ required: true }]}>
            <Select showSearch placeholder="Chọn sản phẩm"
              optionFilterProp="label"
              options={products.map(p => ({ value: p.id, label: `${p.codeCam} - ${p.tenCam}` }))}
            />
          </Form.Item>
          <Form.Item name="soLuong" label="Số lượng (kg)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} step={1000}
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
          </Form.Item>
          <Form.Item name="ghiChu" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

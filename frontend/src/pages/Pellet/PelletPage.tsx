import { useEffect, useState } from 'react';
import { Table, Card, Button, DatePicker, Space, Typography, Tag, Modal, Form,
  InputNumber, Select, Input, message, Statistic, Row, Col, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, ReloadOutlined, SettingOutlined } from '@ant-design/icons';
import { pelletApi, productApi } from '../../api/apiClient';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;

export default function PelletPage() {
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
        pelletApi.getAll({ date: dateStr, page, pageSize: 50 }),
        pelletApi.getSummary(dateStr),
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
      await pelletApi.create({
        ngaySanXuat: selectedDate.toISOString(), idSanPham: values.idSanPham,
        soLuong: values.soLuong, soMay: values.soMay,
        thoiGianChayGio: values.thoiGianChayGio, congSuatMay: values.congSuatMay,
        ghiChu: values.ghiChu,
      });
      message.success('Đã thêm bản ghi pellet!');
      setShowModal(false); form.resetFields(); loadData();
    } catch { message.error('Lỗi'); }
  };

  const columns: ColumnsType<any> = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: 'Máy', dataIndex: 'soMay', width: 70,
      render: (v: string) => <Tag color="geekblue">{v}</Tag> },
    { title: 'Code cám', key: 'code', width: 110, render: (_, r) => r.sanPham?.codeCam || '-' },
    { title: 'Tên cám', key: 'ten', width: 180, render: (_, r) => r.sanPham?.tenCam || '-' },
    { title: 'Sản lượng (kg)', dataIndex: 'soLuong', width: 130, align: 'right',
      render: (v: number) => <strong style={{ color: '#A3BE8C' }}>{v?.toLocaleString()}</strong>,
      sorter: (a: any, b: any) => a.soLuong - b.soLuong },
    { title: 'Giờ chạy', dataIndex: 'thoiGianChayGio', width: 80, align: 'right',
      render: (v: number) => v ? `${v.toFixed(1)}h` : '-' },
    { title: 'CS máy (T/h)', dataIndex: 'congSuatMay', width: 100, align: 'right',
      render: (v: number) => v ? v.toFixed(1) : '-' },
    { title: 'Ghi chú', dataIndex: 'ghiChu', ellipsis: true },
    { title: '', key: 'action', width: 50,
      render: (_, r: any) => (
        <Popconfirm title="Xóa?" onConfirm={async () => { await pelletApi.delete(r.id); loadData(); }}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3}>⚙️ Pellet - Sản xuất ép viên</Title>
        <Space>
          <DatePicker value={selectedDate} onChange={(d) => d && setSelectedDate(d)} format="DD/MM/YYYY" allowClear={false} />
          <Button icon={<ReloadOutlined />} onClick={loadData}>Tải lại</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>Thêm</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Card size="small" style={{ borderRadius: 8 }}>
          <Statistic title="Tổng sản lượng" value={summary?.tongSanLuong ?? 0} suffix="kg"
            formatter={(v) => Number(v).toLocaleString()} valueStyle={{ color: '#A3BE8C', fontWeight: 700 }} />
        </Card></Col>
        <Col span={6}><Card size="small" style={{ borderRadius: 8 }}>
          <Statistic title="Tổng giờ chạy" value={summary?.tongGioChay ?? 0} precision={1} suffix="giờ"
            valueStyle={{ color: '#5E81AC' }} />
        </Card></Col>
        <Col span={6}><Card size="small" style={{ borderRadius: 8 }}>
          <Statistic title="Số máy" value={summary?.soMay ?? 0} suffix="máy"
            prefix={<SettingOutlined />} valueStyle={{ color: '#EBCB8B' }} />
        </Card></Col>
        <Col span={6}><Card size="small" style={{ borderRadius: 8 }}>
          <Statistic title="CS trung bình" value={summary?.tongSanLuong && summary?.tongGioChay ?
            (summary.tongSanLuong / summary.tongGioChay / 1000).toFixed(1) : 0}
            suffix="T/h" valueStyle={{ color: '#B48EAD' }} />
        </Card></Col>
      </Row>

      <Card style={{ borderRadius: 12 }}>
        <Table dataSource={records} columns={columns} rowKey="id" loading={loading} size="middle" scroll={{ x: 900 }}
          pagination={{ current: page, total, pageSize: 50, onChange: setPage, showTotal: (t) => `Tổng ${t}` }} />
      </Card>

      <Modal title="Thêm bản ghi Pellet" open={showModal} onOk={handleCreate}
        onCancel={() => setShowModal(false)} okText="Tạo" cancelText="Hủy" width={500}>
        <Form form={form} layout="vertical" initialValues={{ soMay: 'M1' }}>
          <Form.Item name="soMay" label="Số máy" rules={[{ required: true }]}>
            <Select options={['M1','M2','M3','M4','M5','M6'].map(m => ({ value: m, label: m }))} />
          </Form.Item>
          <Form.Item name="idSanPham" label="Sản phẩm" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label"
              options={products.map((p: any) => ({ value: p.id, label: `${p.codeCam} - ${p.tenCam}` }))} />
          </Form.Item>
          <Form.Item name="soLuong" label="Sản lượng (kg)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} step={500} />
          </Form.Item>
          <Form.Item name="thoiGianChayGio" label="Giờ chạy"><InputNumber style={{ width: '100%' }} min={0} step={0.5} /></Form.Item>
          <Form.Item name="congSuatMay" label="CS máy (T/giờ)"><InputNumber style={{ width: '100%' }} min={0} step={0.5} /></Form.Item>
          <Form.Item name="ghiChu" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

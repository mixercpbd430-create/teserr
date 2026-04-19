import { useEffect, useState } from 'react';
import { Table, Card, Button, Input, Space, Typography, Modal, Form, message, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { productApi } from '../../api/apiClient';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;

interface ProductItem {
  id: number; codeCam: string; tenCam: string; dangEpVien: string;
  kichCoEpVien: string; kichCoDongBao: number; batchSize: number;
  vatNuoi: string; pellet: string; packing: string;
}

export default function ProductPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form] = Form.useForm();

  useEffect(() => { loadProducts(); }, [page, search]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await productApi.getAll({ search, page, pageSize: 50 });
      setProducts(res.data.items); setTotal(res.data.totalCount);
    } catch { /* */ } finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editId) {
        await productApi.update(editId, values);
        message.success('Cập nhật thành công!');
      } else {
        await productApi.create(values);
        message.success('Thêm sản phẩm thành công!');
      }
      setShowModal(false); form.resetFields(); setEditId(null); loadProducts();
    } catch { message.error('Lỗi'); }
  };

  const handleEdit = (record: ProductItem) => {
    setEditId(record.id);
    form.setFieldsValue(record);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    try { await productApi.delete(id); message.success('Đã xóa'); loadProducts(); }
    catch { message.error('Lỗi'); }
  };

  const columns: ColumnsType<ProductItem> = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: 'Code cám', dataIndex: 'codeCam', width: 120, sorter: (a, b) => (a.codeCam || '').localeCompare(b.codeCam || '') },
    { title: 'Tên cám', dataIndex: 'tenCam', width: 200 },
    { title: 'Dạng ép viên', dataIndex: 'dangEpVien', width: 120 },
    { title: 'Kích cỡ ép viên', dataIndex: 'kichCoEpVien', width: 130 },
    { title: 'Batch size', dataIndex: 'batchSize', width: 100, align: 'right',
      render: (v: number) => v ? v.toLocaleString() : '-' },
    { title: 'Vật nuôi', dataIndex: 'vatNuoi', width: 100 },
    { title: '', key: 'action', width: 80, render: (_, r) => (
      <Space>
        <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)} />
        <Popconfirm title="Xóa?" onConfirm={() => handleDelete(r.id)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Space>
    )},
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3}>📦 Sản phẩm</Title>
        <Space>
          <Input placeholder="Tìm kiếm..." prefix={<SearchOutlined />}
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            allowClear style={{ width: 250 }} />
          <Button icon={<ReloadOutlined />} onClick={loadProducts}>Tải lại</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditId(null); form.resetFields(); setShowModal(true); }}>
            Thêm SP
          </Button>
        </Space>
      </div>
      <Card style={{ borderRadius: 12 }}>
        <Table dataSource={products} columns={columns} rowKey="id"
          loading={loading} size="middle" scroll={{ x: 900 }}
          pagination={{ current: page, total, pageSize: 50, onChange: setPage, showTotal: (t) => `Tổng ${t} sản phẩm` }} />
      </Card>
      <Modal title={editId ? 'Sửa sản phẩm' : 'Thêm sản phẩm'} open={showModal}
        onOk={handleSave} onCancel={() => { setShowModal(false); setEditId(null); }} okText="Lưu" cancelText="Hủy">
        <Form form={form} layout="vertical">
          <Form.Item name="codeCam" label="Code cám" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="tenCam" label="Tên cám" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="dangEpVien" label="Dạng ép viên"><Input /></Form.Item>
          <Form.Item name="kichCoEpVien" label="Kích cỡ ép viên"><Input /></Form.Item>
          <Form.Item name="batchSize" label="Batch size"><Input type="number" /></Form.Item>
          <Form.Item name="vatNuoi" label="Vật nuôi"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

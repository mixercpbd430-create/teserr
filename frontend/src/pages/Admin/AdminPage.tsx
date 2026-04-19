import { useEffect, useState } from 'react';
import { Table, Card, Button, Space, Typography, Modal, Form, Input, Select,
  message, Popconfirm, Tag, Tabs, Checkbox } from 'antd';
import { PlusOutlined, DeleteOutlined, ReloadOutlined, LockOutlined,
  UnlockOutlined, KeyOutlined, UserOutlined, MenuOutlined } from '@ant-design/icons';
import { adminApi } from '../../api/apiClient';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;

// ==================== Users Tab ====================
function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [form] = Form.useForm();
  const [pwForm] = Form.useForm();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([adminApi.getUsers(), adminApi.getRoles()]);
      setUsers(usersRes.data); setRoles(rolesRes.data);
    } catch { /* */ } finally { setLoading(false); }
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await adminApi.createUser(values);
      message.success('Đã tạo user!'); setShowModal(false); form.resetFields(); loadData();
    } catch (e: any) { message.error(e.response?.data?.message || 'Lỗi'); }
  };

  const handleResetPassword = async () => {
    try {
      const values = await pwForm.validateFields();
      await adminApi.resetPassword(selectedUserId!, values.newPassword);
      message.success('Đã đổi mật khẩu!'); setShowPwModal(false); pwForm.resetFields();
    } catch { message.error('Lỗi'); }
  };

  const columns: ColumnsType<any> = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { title: 'Username', dataIndex: 'username', width: 120 },
    { title: 'Họ tên', dataIndex: 'fullname', width: 150 },
    { title: 'Email', dataIndex: 'email', width: 180, ellipsis: true },
    { title: 'SĐT', dataIndex: 'soDienThoai', width: 110 },
    { title: 'Vai trò', dataIndex: 'vaiTro', width: 100,
      render: (v: string) => <Tag color={v === 'Admin' ? 'red' : 'blue'}>{v}</Tag> },
    { title: 'Trạng thái', dataIndex: 'isLock', width: 100,
      render: (v: boolean) => v ? <Tag color="error">Bị khóa</Tag> : <Tag color="success">Hoạt động</Tag> },
    { title: 'Hành động', key: 'action', width: 150,
      render: (_, r: any) => (
        <Space>
          <Button size="small" icon={r.isLock ? <UnlockOutlined /> : <LockOutlined />}
            onClick={async () => { await adminApi.toggleLock(r.id); loadData(); }} />
          <Button size="small" icon={<KeyOutlined />}
            onClick={() => { setSelectedUserId(r.id); setShowPwModal(true); }} />
          <Popconfirm title="Xóa user?" onConfirm={async () => { await adminApi.deleteUser(r.id); loadData(); }}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Button icon={<ReloadOutlined />} onClick={loadData}>Tải lại</Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>Thêm user</Button>
      </div>
      <Table dataSource={users} columns={columns} rowKey="id" loading={loading} size="middle" />

      <Modal title="Thêm user" open={showModal} onOk={handleCreate}
        onCancel={() => setShowModal(false)} okText="Tạo" cancelText="Hủy">
        <Form form={form} layout="vertical">
          <Form.Item name="username" label="Username" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="password" label="Mật khẩu" rules={[{ required: true }]}><Input.Password /></Form.Item>
          <Form.Item name="fullname" label="Họ tên"><Input /></Form.Item>
          <Form.Item name="email" label="Email"><Input /></Form.Item>
          <Form.Item name="soDienThoai" label="SĐT"><Input /></Form.Item>
          <Form.Item name="idVaiTro" label="Vai trò" rules={[{ required: true }]}>
            <Select options={roles.map((r: any) => ({ value: r.id, label: r.vaiTro }))} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Đổi mật khẩu" open={showPwModal} onOk={handleResetPassword}
        onCancel={() => setShowPwModal(false)} okText="Đổi" cancelText="Hủy">
        <Form form={pwForm} layout="vertical">
          <Form.Item name="newPassword" label="Mật khẩu mới" rules={[{ required: true, min: 4 }]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// ==================== Menu Management Tab ====================
function MenuTab() {
  const [mainFunctions, setMainFunctions] = useState<any[]>([]);
  const [subFunctions, setSubFunctions] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [roleFuncs, setRoleFuncs] = useState<number[]>([]);
  const [showMainModal, setShowMainModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [mainForm] = Form.useForm();
  const [subForm] = Form.useForm();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [mf, sf, r] = await Promise.all([
        adminApi.getMainFunctions(), adminApi.getSubFunctions(), adminApi.getRoles()
      ]);
      setMainFunctions(mf.data); setSubFunctions(sf.data); setRoles(r.data);
    } catch { /* */ }
  };

  const loadRoleFuncs = async (roleId: number) => {
    try { const res = await adminApi.getRoleFunctions(roleId); setRoleFuncs(res.data); }
    catch { /* */ }
  };

  const saveRoleFuncs = async () => {
    if (!selectedRole) return;
    try {
      await adminApi.setRoleFunctions({ idVaiTro: selectedRole, functionIds: roleFuncs });
      message.success('Đã lưu phân quyền!');
    } catch { message.error('Lỗi'); }
  };

  return (
    <div style={{ display: 'flex', gap: 24 }}>
      <Card title="📂 Chức năng chính" style={{ flex: 1, borderRadius: 12 }} extra={
        <Button size="small" icon={<PlusOutlined />} onClick={() => setShowMainModal(true)}>Thêm</Button>}>
        <Table dataSource={mainFunctions} rowKey="id" size="small" pagination={false}
          columns={[
            { title: 'ID', dataIndex: 'id', width: 50 },
            { title: 'Tên', dataIndex: 'chucNangChinh' },
            { title: 'Icon', dataIndex: 'icon', width: 80 },
            { title: 'Thứ tự', dataIndex: 'thuTuUuTien', width: 60 },
          ]} />
      </Card>

      <Card title="📋 Chức năng con" style={{ flex: 1, borderRadius: 12 }} extra={
        <Button size="small" icon={<PlusOutlined />} onClick={() => setShowSubModal(true)}>Thêm</Button>}>
        <Table dataSource={subFunctions} rowKey="id" size="small" pagination={false}
          columns={[
            { title: 'ID', dataIndex: 'id', width: 50 },
            { title: 'Tên', dataIndex: 'chucNangCon' },
            { title: 'Nhóm', dataIndex: 'chucNangChinh', width: 120 },
            { title: 'Router', dataIndex: 'router', width: 100 },
          ]} />
      </Card>

      <Card title="🔑 Phân quyền" style={{ flex: 1, borderRadius: 12 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Select placeholder="Chọn vai trò" style={{ width: '100%' }}
            options={roles.map((r: any) => ({ value: r.id, label: r.vaiTro }))}
            onChange={(v) => { setSelectedRole(v); loadRoleFuncs(v); }} />
          {selectedRole && (
            <>
              <Checkbox.Group value={roleFuncs} onChange={(v) => setRoleFuncs(v as number[])}>
                <Space direction="vertical">
                  {subFunctions.map((sf: any) => (
                    <Checkbox key={sf.id} value={sf.id}>
                      {sf.chucNangChinh} → {sf.chucNangCon}
                    </Checkbox>
                  ))}
                </Space>
              </Checkbox.Group>
              <Button type="primary" onClick={saveRoleFuncs} block>Lưu phân quyền</Button>
            </>
          )}
        </Space>
      </Card>

      <Modal title="Thêm chức năng chính" open={showMainModal}
        onOk={async () => { const v = await mainForm.validateFields(); await adminApi.createMainFunction(v);
          message.success('Đã tạo!'); setShowMainModal(false); mainForm.resetFields(); loadData(); }}
        onCancel={() => setShowMainModal(false)} okText="Tạo">
        <Form form={mainForm} layout="vertical">
          <Form.Item name="chucNangChinh" label="Tên" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="icon" label="Icon"><Input placeholder="list, calendar, gear..." /></Form.Item>
          <Form.Item name="thuTuUuTien" label="Thứ tự"><Input type="number" /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Thêm chức năng con" open={showSubModal}
        onOk={async () => { const v = await subForm.validateFields(); await adminApi.createSubFunction(v);
          message.success('Đã tạo!'); setShowSubModal(false); subForm.resetFields(); loadData(); }}
        onCancel={() => setShowSubModal(false)} okText="Tạo">
        <Form form={subForm} layout="vertical">
          <Form.Item name="idChucNangChinh" label="Nhóm" rules={[{ required: true }]}>
            <Select options={mainFunctions.map((f: any) => ({ value: f.id, label: f.chucNangChinh }))} />
          </Form.Item>
          <Form.Item name="chucNangCon" label="Tên" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="router" label="Router"><Input placeholder="/plan, /order..." /></Form.Item>
          <Form.Item name="thuTuUuTien" label="Thứ tự"><Input type="number" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ==================== Admin Page (Tabs) ====================
export default function AdminPage() {
  return (
    <div>
      <Title level={3}>⚙️ Quản trị hệ thống</Title>
      <Card style={{ borderRadius: 12 }}>
        <Tabs items={[
          { key: 'users', label: <span><UserOutlined /> Người dùng</span>, children: <UsersTab /> },
          { key: 'menu', label: <span><MenuOutlined /> Menu & Phân quyền</span>, children: <MenuTab /> },
        ]} />
      </Card>
    </div>
  );
}

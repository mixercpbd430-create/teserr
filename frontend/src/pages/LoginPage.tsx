import { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Space } from 'antd';
import { UserOutlined, LockOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { authApi } from '../api/apiClient';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const res = await authApi.login(values.username, values.password);
      login(res.data.token, {
        username: res.data.username,
        fullname: res.data.fullname,
        role: res.data.role,
        roleId: res.data.roleId,
      });
      message.success(`Chào mừng ${res.data.fullname}!`);
      navigate('/');
    } catch {
      message.error('Username hoặc mật khẩu không đúng!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    }}>
      <Card
        style={{
          width: 420,
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
        styles={{ body: { padding: '40px 32px' } }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
          <div>
            <ThunderboltOutlined style={{ fontSize: 48, color: '#81A1C1' }} />
            <Title level={2} style={{ color: '#ECEFF4', marginTop: 12, marginBottom: 4 }}>
              Kế Hoạch Sản Xuất
            </Title>
            <Text style={{ color: '#88C0D0', fontSize: 14 }}>
              Production Planning System
            </Text>
          </div>

          <Form name="login" onFinish={onFinish} size="large" style={{ textAlign: 'left' }}>
            <Form.Item name="username" rules={[{ required: true, message: 'Nhập username!' }]}>
              <Input prefix={<UserOutlined style={{ color: '#88C0D0' }} />}
                placeholder="Username" autoFocus
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#ECEFF4', borderRadius: 8 }}
              />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: 'Nhập password!' }]}>
              <Input.Password prefix={<LockOutlined style={{ color: '#88C0D0' }} />}
                placeholder="Password"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#ECEFF4', borderRadius: 8 }}
              />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block
                style={{ height: 48, borderRadius: 8, fontSize: 16, fontWeight: 600,
                  background: 'linear-gradient(135deg, #81A1C1, #5E81AC)' }}>
                Đăng nhập
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  );
}

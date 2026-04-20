import { useEffect, useState } from 'react';
import { Layout, Menu, Typography, Avatar, Dropdown, Spin } from 'antd';
import {
  MenuFoldOutlined, MenuUnfoldOutlined, UserOutlined, LogoutOutlined,
  AppstoreOutlined, FileTextOutlined, ShoppingCartOutlined,
  BarChartOutlined, DatabaseOutlined, SettingOutlined, CalendarOutlined,
  ExperimentOutlined, InboxOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { menuApi } from '../../api/apiClient';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

interface MenuItem {
  id: number;
  name: string;
  icon?: string;
  router?: string;
  order: number;
}

interface MenuGroup {
  id: number;
  name: string;
  icon?: string;
  order: number;
  items: MenuItem[];
}

const ICON_MAP: Record<string, React.ReactNode> = {
  'list': <AppstoreOutlined />,
  'file-text': <FileTextOutlined />,
  'cart': <ShoppingCartOutlined />,
  'bar-chart': <BarChartOutlined />,
  'database': <DatabaseOutlined />,
  'gear': <SettingOutlined />,
  'calendar': <CalendarOutlined />,
  'clipboard-data': <BarChartOutlined />,
  'box-seam': <InboxOutlined />,
  'person-gear': <SettingOutlined />,
  'flask': <ExperimentOutlined />,
};

// Map sub-function names to routes
const ROUTE_MAP: Record<string, string> = {
  'Kế hoạch': '/plan',
  'Plan': '/plan',
  'Đặt hàng': '/order',
  'Sản phẩm': '/product',
  'Stock': '/stock',
  'Tồn kho': '/stock',
  'Pellet': '/pellet',
  'Đóng bao': '/packing',
  'Bao bì': '/baobi',
  'Sale': '/sale',
  'DL Đóng bao': '/packing-data',
  'Gửi dữ liệu': '/upload',
};

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [menuGroups, setMenuGroups] = useState<MenuGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    try {
      const res = await menuApi.getMenu();
      setMenuGroups(res.data);
    } catch (err) {
      console.error('Failed to load menu:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuClick = (key: string) => {
    if (key.startsWith('/')) {
      navigate(key);
    } else {
      // Try to map from name to route
      const route = ROUTE_MAP[key] || `/${key.toLowerCase().replace(/\s+/g, '-')}`;
      navigate(route);
    }
  };

  const menuItems = menuGroups.map((group) => ({
    key: `group-${group.id}`,
    icon: ICON_MAP[group.icon || ''] || <AppstoreOutlined />,
    label: group.name,
    children: group.items.map((item) => ({
      key: item.router || ROUTE_MAP[item.name] || item.name,
      label: item.name,
    })),
  }));

  // Add static routes for demo (when no DB-driven menu)
  if (menuItems.length === 0) {
    menuItems.push(
      { key: 'g-dashboard', icon: <BarChartOutlined />, label: 'Dashboard', children: [
        { key: '/', label: 'Tổng quan' },
      ]},
      { key: 'g-plan', icon: <CalendarOutlined />, label: 'Sản xuất', children: [
        { key: '/plan', label: 'Kế hoạch' },
        { key: '/order', label: 'Đặt hàng' },
        { key: '/pellet', label: 'Pellet' },
        { key: '/packing', label: 'Đóng bao' },
      ]},
      { key: 'g-data', icon: <DatabaseOutlined />, label: 'Dữ liệu', children: [
        { key: '/product', label: 'Sản phẩm' },
        { key: '/stock', label: 'Stock' },
        { key: '/sale', label: 'Sale' },
        { key: '/packing-data', label: 'DL Đóng bao' },
        { key: '/baobi', label: 'Bao bì' },
        { key: '/import', label: 'Import Excel' },
        { key: '/upload', label: 'Gửi dữ liệu' },
      ]},
      { key: 'g-admin', icon: <SettingOutlined />, label: 'Quản trị', children: [
        { key: '/admin', label: 'Hệ thống' },
      ]},
    );
  }

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: `${user?.fullname} (${user?.role})` },
      { type: 'divider' as const },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', danger: true },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'logout') { logout(); navigate('/login'); }
    },
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null} collapsible collapsed={collapsed} width={240}
        style={{ background: '#2E3440', boxShadow: '2px 0 8px rgba(0,0,0,0.15)' }}
      >
        <div style={{
          height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}>
          <Text strong style={{ color: '#88C0D0', fontSize: collapsed ? 14 : 16, whiteSpace: 'nowrap' }}>
            {collapsed ? 'KH' : '⚡ Kế Hoạch SX'}
          </Text>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : (
          <Menu
            mode="inline" theme="dark"
            selectedKeys={[location.pathname]}
            defaultOpenKeys={menuItems.map((m) => m.key)}
            items={menuItems}
            onClick={({ key }) => handleMenuClick(key)}
            style={{ background: 'transparent', border: 'none' }}
          />
        )}
      </Sider>
      <Layout>
        <Header style={{
          padding: '0 24px', background: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {collapsed ? <MenuUnfoldOutlined onClick={() => setCollapsed(false)} style={{ fontSize: 18 }} /> :
              <MenuFoldOutlined onClick={() => setCollapsed(true)} style={{ fontSize: 18 }} />}
          </div>
          <Dropdown menu={userMenu} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} style={{ background: '#5E81AC' }} />
              <Text strong>{user?.fullname}</Text>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: 16, padding: 24, background: '#f0f2f5', borderRadius: 8, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}

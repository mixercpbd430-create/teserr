import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import PlanPage from './pages/Plan/PlanPage';
import OrderPage from './pages/DatHang/OrderPage';
import ProductPage from './pages/Product/ProductPage';
import StockPage from './pages/Stock/StockPage';
import PelletPage from './pages/Pellet/PelletPage';
import PackingPage from './pages/Packing/PackingPage';
import SalePage from './pages/Sale/SalePage';
import PackingDataPage from './pages/PackingData/PackingDataPage';
import BaoBiPage from './pages/BaoBi/BaoBiPage';
import AdminPage from './pages/Admin/AdminPage';
import ImportPage from './pages/Import/ImportPage';
import UploadPage from './pages/Upload/UploadPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // Auth disabled — always allow access
  return <>{children}</>;
}

export default function App() {
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#5E81AC',
          borderRadius: 8,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        },
        components: {
          Menu: {
            darkItemBg: '#2E3440',
            darkSubMenuItemBg: '#3B4252',
            darkItemSelectedBg: '#81A1C1',
            darkItemHoverBg: '#4C566A',
            darkItemColor: '#D8DEE9',
            darkItemSelectedColor: '#2E3440',
          },
          Table: {
            headerBg: '#f8f9fa',
            headerColor: '#333',
            rowHoverBg: '#e8f4fd',
            fontSize: 13,
          },
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<DashboardPage />} />
            <Route path="plan" element={<PlanPage />} />
            <Route path="order" element={<OrderPage />} />
            <Route path="product" element={<ProductPage />} />
            <Route path="stock" element={<StockPage />} />
            <Route path="pellet" element={<PelletPage />} />
            <Route path="packing" element={<PackingPage />} />
            <Route path="sale" element={<SalePage />} />
            <Route path="packing-data" element={<PackingDataPage />} />
            <Route path="baobi" element={<BaoBiPage />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="import" element={<ImportPage />} />
            <Route path="upload" element={<UploadPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

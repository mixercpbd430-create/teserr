import { useState, useEffect } from 'react';
import { Card, Upload, Button, Select, Typography, message, Table, Space, Tag, Alert, Statistic, Row, Col } from 'antd';
import { UploadOutlined, CloudUploadOutlined, FileExcelOutlined, SendOutlined, CheckCircleOutlined, DatabaseOutlined } from '@ant-design/icons';
import { productApi } from '../../api/apiClient';
import * as XLSX from 'xlsx';
import axios from 'axios';

const { Title, Text } = Typography;

const REMOTE_API = 'https://teserr.onrender.com/api';

const UPLOAD_TYPES = [
  { value: 'stock', label: '📊 Stock', color: '#5E81AC', description: 'Cập nhật tồn kho hằng ngày' },
  { value: 'sale', label: '💰 Sale (Đặt hàng)', color: '#BF616A', description: 'Dữ liệu bán hàng hằng ngày' },
  { value: 'packing', label: '📦 Packing (Đóng bao)', color: '#A3BE8C', description: 'Dữ liệu đóng bao hằng ngày' },
];

interface PreviewRow {
  _key: number;
  [key: string]: any;
}

interface ProductItem {
  id: number;
  codeCam: string;
  tenCam?: string;
}

export default function UploadPage() {
  const [uploadType, setUploadType] = useState('stock');
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null);
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [previewColumns, setPreviewColumns] = useState<any[]>([]);
  const [productList, setProductList] = useState<ProductItem[]>([]);

  // Load product list on mount
  useEffect(() => {
    productApi.getList().then((res) => {
      setProductList(res.data || []);
    }).catch(() => { /* ignore */ });
  }, []);

  // Build product lookup maps
  const buildProductMaps = () => {
    const byTenCam = new Map<string, ProductItem>();
    const byCodeCam = new Map<string, ProductItem>();
    productList.forEach(p => {
      if (p.tenCam) byTenCam.set(p.tenCam.toUpperCase().trim(), p);
      if (p.codeCam) byCodeCam.set(p.codeCam.toUpperCase().trim(), p);
    });
    return { byTenCam, byCodeCam };
  };

  const findProduct = (code: string): ProductItem | null => {
    const { byTenCam, byCodeCam } = buildProductMaps();
    const key = code.toUpperCase().trim();
    return byTenCam.get(key) || byCodeCam.get(key) || null;
  };

  /** Auto-format Excel serial dates */
  function autoFormatCell(val: any): any {
    if (val === null || val === undefined || val === '') return val;
    if (typeof val === 'number' && val > 40000 && val < 70000) {
      try {
        const date = XLSX.SSF.parse_date_code(val);
        if (date) {
          const dd = String(date.d).padStart(2, '0');
          const mm = String(date.m).padStart(2, '0');
          const yyyy = date.y;
          if (date.H === 0 && date.M === 0 && date.S === 0) {
            return `${dd}/${mm}/${yyyy}`;
          }
          return `${dd}/${mm}/${yyyy} ${String(date.H).padStart(2,'0')}:${String(date.M).padStart(2,'0')}`;
        }
      } catch { /* not a date */ }
    }
    return val;
  }

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'binary' });
        const lastSheetName = wb.SheetNames[wb.SheetNames.length - 1];
        const ws = wb.Sheets[lastSheetName];

        const data: any[] = XLSX.utils.sheet_to_json(ws);
        if (data.length === 0) {
          message.warning('File không có dữ liệu');
          return;
        }

        const columns = Object.keys(data[0] as object).map((key) => ({
          title: key,
          dataIndex: key,
          key,
          ellipsis: true,
          width: 150,
          render: (val: any) => {
            const formatted = autoFormatCell(val);
            if (typeof formatted === 'number') return formatted.toLocaleString();
            return String(formatted || '-');
          },
        }));

        const formattedData = data.map((row: any, i: number) => {
          const newRow: any = { _key: i };
          for (const key of Object.keys(row)) {
            newRow[key] = autoFormatCell(row[key]);
          }
          return newRow;
        });

        setPreviewData(formattedData);
        setPreviewColumns(columns);
        setFileName(file.name);
        setUploadResult(null);
        message.success(`Đã đọc ${formattedData.length} dòng từ "${lastSheetName}" trong ${file.name}`);
      } catch {
        message.error('Lỗi đọc file Excel');
      }
    };
    reader.readAsBinaryString(file);
    return false;
  };

  const buildPayload = () => {
    const today = new Date().toISOString().split('T')[0];

    switch (uploadType) {
      case 'stock': {
        const items = previewData.map(row => {
          // Try to find product by code or name
          const code = String(row['Code cám'] ?? row['code_cam'] ?? row['CodeCam'] ?? row['Code cam'] ?? row['Ma_san_pham'] ?? '').trim();
          const name = String(row['Tên cám'] ?? row['ten_cam'] ?? row['TenCam'] ?? row['Ten cam'] ?? '').trim();
          const product = findProduct(code) || findProduct(name);
          const soLuong = Number(row['Số lượng'] ?? row['so_luong'] ?? row['SoLuong'] ?? row['So_luong'] ?? row['Ton_kho'] ?? row['Stock'] ?? 0);
          return {
            idSanPham: product?.id ?? (Number(row['id_san_pham'] ?? row['IdSanPham'] ?? row['ID'] ?? 0)),
            soLuong,
            ghiChu: String(row['Ghi chú'] ?? row['ghi_chu'] ?? row['GhiChu'] ?? ''),
          };
        }).filter(item => item.idSanPham > 0 && item.soLuong > 0);

        return {
          url: `${REMOTE_API}/import/stock`,
          data: { ngayCapNhat: today, items },
          validCount: items.length,
        };
      }

      case 'sale': {
        const items = previewData.map(row => {
          const code = String(row['Code cám'] ?? row['code_cam'] ?? row['CodeCam'] ?? row['Code cam'] ?? '').trim();
          const name = String(row['Tên cám'] ?? row['ten_cam'] ?? row['TenCam'] ?? row['Ten cam'] ?? '').trim();
          const product = findProduct(code) || findProduct(name);
          const soLuong = Number(row['Số lượng'] ?? row['so_luong'] ?? row['SoLuong'] ?? row['So_luong'] ?? 0);
          const ngayLay = String(row['Ngày lấy'] ?? row['ngay_lay'] ?? row['NgayLay'] ?? row['Ngay_lay'] ?? row['Ngày'] ?? today);
          const loaiDatHang = String(row['Loại'] ?? row['loai_dat_hang'] ?? row['LoaiDatHang'] ?? 'Khách vãng lai');
          return {
            idSanPham: product?.id ?? (Number(row['id_san_pham'] ?? row['IdSanPham'] ?? row['ID'] ?? 0)),
            soLuong,
            ngayLay,
            ghiChu: `Upload từ ${fileName}`,
            loaiDatHang,
          };
        }).filter(item => item.idSanPham > 0 && item.soLuong > 0);

        return {
          url: `${REMOTE_API}/import/order`,
          data: {
            loaiDatHang: 'Khách vãng lai',
            maDatHang: `DH_UPLOAD_${Date.now()}`,
            items,
          },
          validCount: items.length,
        };
      }

      case 'packing': {
        const items = previewData.map(row => {
          const code = String(row['Code cám'] ?? row['code_cam'] ?? row['CodeCam'] ?? '').trim();
          const name = String(row['Tên cám'] ?? row['ten_cam'] ?? row['TenCam'] ?? '').trim();
          const product = findProduct(code) || findProduct(name);
          const soLuongTan = Number(row['SL (tấn)'] ?? row['so_luong_tan'] ?? row['SoLuongTan'] ?? row['Số lượng'] ?? 0);
          const kichCoBaoKg = Number(row['Bao (kg)'] ?? row['kich_co_bao_kg'] ?? row['KichCoBaoKg'] ?? 25);
          const soBao = Number(row['Số bao'] ?? row['so_bao'] ?? row['SoBao'] ?? 0) || null;
          const lineDongBao = String(row['Line'] ?? row['line_dong_bao'] ?? row['LineDongBao'] ?? 'L1');
          return {
            ngayDongBao: new Date().toISOString(),
            idSanPham: (product?.id ?? (Number(row['id_san_pham'] ?? row['IdSanPham'] ?? row['ID'] ?? 0))) || null,
            soLuongTan,
            kichCoBaoKg,
            soBao,
            lineDongBao,
            ghiChu: `Upload từ ${fileName}`,
          };
        }).filter(item => item.soLuongTan > 0);

        // Packing uses individual POST calls
        return {
          url: `${REMOTE_API}/packing`,
          data: items,
          validCount: items.length,
          isBatch: true,
        };
      }

      default:
        return null;
    }
  };

  const handleUpload = async () => {
    const payload = buildPayload();
    if (!payload || payload.validCount === 0) {
      message.warning('Không có dữ liệu hợp lệ để gửi. Kiểm tra lại file Excel (cần có cột Code cám/Tên cám khớp với sản phẩm trong hệ thống).');
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      if ((payload as any).isBatch) {
        // Packing: send individual POST requests
        const items = payload.data as any[];
        let successCount = 0;
        let failCount = 0;
        for (const item of items) {
          try {
            await axios.post(payload.url, item, {
              headers: { 'Content-Type': 'application/json' },
              timeout: 30000,
            });
            successCount++;
          } catch {
            failCount++;
          }
        }
        setUploadResult({
          success: failCount === 0,
          message: `Đã gửi ${successCount}/${items.length} bản ghi packing lên server.${failCount > 0 ? ` (${failCount} lỗi)` : ''}`,
        });
        if (failCount === 0) message.success(`Gửi thành công ${successCount} bản ghi!`);
        else message.warning(`${successCount} thành công, ${failCount} lỗi`);
      } else {
        // Stock, Sale: single POST
        const result = await axios.post(payload.url, payload.data, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000,
        });
        const msg = result.data?.message || `Gửi thành công ${payload.validCount} bản ghi!`;
        setUploadResult({ success: true, message: msg });
        message.success(msg);
      }
    } catch (e: any) {
      const errMsg = e.response?.data?.message
        || e.response?.data?.title
        || (typeof e.response?.data === 'string' ? e.response.data : null)
        || e.message
        || 'Lỗi khi gửi dữ liệu';
      setUploadResult({ success: false, message: errMsg });
      message.error(errMsg);
    } finally {
      setUploading(false);
    }
  };

  const currentType = UPLOAD_TYPES.find(t => t.value === uploadType);
  const payload = previewData.length > 0 ? buildPayload() : null;

  return (
    <div>
      <Title level={3} style={{ margin: 0, marginBottom: 16 }}>
        🚀 Gửi dữ liệu lên Server
      </Title>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16, borderRadius: 8 }}
        message={
          <span>
            Dữ liệu sẽ được gửi đến <strong>{REMOTE_API.replace('/api', '')}</strong>
          </span>
        }
        description="Chọn loại dữ liệu → Chọn file Excel → Xem trước → Nhấn Gửi dữ liệu"
      />

      {/* Type selector + Upload */}
      <Card style={{ borderRadius: 12, marginBottom: 16 }}>
        <Space size="large" wrap align="center">
          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Loại dữ liệu</Text>
            <Select
              value={uploadType}
              onChange={(v) => {
                setUploadType(v);
                setPreviewData([]);
                setPreviewColumns([]);
                setFileName('');
                setUploadResult(null);
              }}
              style={{ width: 260 }}
              options={UPLOAD_TYPES.map(t => ({
                value: t.value,
                label: <span>{t.label} <Text type="secondary" style={{ fontSize: 11 }}>- {t.description}</Text></span>,
              }))}
            />
          </div>

          <div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>File Excel</Text>
            <Upload beforeUpload={handleFileUpload} accept=".xlsx,.xls,.csv" showUploadList={false}>
              <Button icon={<UploadOutlined />} size="large" style={{ borderRadius: 8 }}>
                Chọn file Excel
              </Button>
            </Upload>
          </div>

          {fileName && (
            <Tag icon={<FileExcelOutlined />} color="green" style={{ fontSize: 14, padding: '4px 12px' }}>
              {fileName}
            </Tag>
          )}

          {previewData.length > 0 && payload && (
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleUpload}
              loading={uploading}
              size="large"
              style={{
                borderRadius: 8,
                background: currentType?.color || '#5E81AC',
                borderColor: currentType?.color || '#5E81AC',
                fontWeight: 700,
                height: 44,
                paddingLeft: 24,
                paddingRight: 24,
              }}
            >
              Gửi {payload.validCount} bản ghi lên Server
            </Button>
          )}
        </Space>
      </Card>

      {/* Upload Result */}
      {uploadResult && (
        <Alert
          type={uploadResult.success ? 'success' : 'error'}
          showIcon
          icon={uploadResult.success ? <CheckCircleOutlined /> : undefined}
          message={uploadResult.success ? 'Gửi thành công!' : 'Gửi thất bại'}
          description={uploadResult.message}
          style={{ marginBottom: 16, borderRadius: 8 }}
          closable
          onClose={() => setUploadResult(null)}
        />
      )}

      {/* Summary stats */}
      {previewData.length > 0 && payload && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small" style={{ borderRadius: 8, borderLeft: `4px solid ${currentType?.color}` }}>
              <Statistic
                title="Tổng dòng đọc"
                value={previewData.length}
                prefix={<DatabaseOutlined />}
                valueStyle={{ color: currentType?.color }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #A3BE8C' }}>
              <Statistic
                title="Dòng hợp lệ"
                value={payload.validCount}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#A3BE8C', fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #EBCB8B' }}>
              <Statistic
                title="Dòng bỏ qua"
                value={previewData.length - payload.validCount}
                valueStyle={{ color: previewData.length - payload.validCount > 0 ? '#EBCB8B' : '#A3BE8C' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" style={{ borderRadius: 8, borderLeft: '4px solid #5E81AC' }}>
              <Statistic
                title="Số cột"
                value={previewColumns.length}
                valueStyle={{ color: '#5E81AC' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Preview Table */}
      {previewData.length > 0 && (
        <Card
          title={
            <Space>
              <span>📋 Xem trước dữ liệu ({previewData.length} dòng)</span>
              <Tag color={currentType?.color}>{currentType?.label}</Tag>
            </Space>
          }
          style={{ borderRadius: 12 }}
        >
          <Table
            dataSource={previewData}
            columns={previewColumns}
            rowKey="_key"
            size="small"
            scroll={{ x: true }}
            pagination={{ pageSize: 20, showTotal: (t) => `Tổng ${t} dòng` }}
            bordered
          />
        </Card>
      )}

      {/* Empty state */}
      {previewData.length === 0 && (
        <Card style={{ borderRadius: 12, textAlign: 'center', padding: 60 }}>
          <CloudUploadOutlined style={{ fontSize: 72, color: '#ddd', marginBottom: 16 }} />
          <div>
            <Title level={4} type="secondary" style={{ marginBottom: 8 }}>
              Gửi dữ liệu hằng ngày lên Server
            </Title>
            <Text type="secondary" style={{ fontSize: 14 }}>
              1. Chọn loại: Stock / Sale / Packing<br />
              2. Chọn file Excel chứa dữ liệu<br />
              3. Xem trước dữ liệu → Nhấn <strong>Gửi</strong>
            </Text>
          </div>
          <div style={{ marginTop: 24 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Server: <Tag color="blue">{REMOTE_API.replace('/api', '')}</Tag>
            </Text>
          </div>
        </Card>
      )}
    </div>
  );
}

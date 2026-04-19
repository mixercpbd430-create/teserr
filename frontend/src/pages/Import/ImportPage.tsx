import { useState, useEffect } from 'react';
import { Card, Upload, Button, Select, Typography, message, Table, Space, Tag, Alert, Descriptions } from 'antd';
import { UploadOutlined, CloudUploadOutlined, FileExcelOutlined } from '@ant-design/icons';
import { importApi, productApi } from '../../api/apiClient';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;

const IMPORT_TYPES = [
  { value: 'order', label: '🛒 Đặt hàng', color: '#A3BE8C' },
  { value: 'plan', label: '📋 Kế hoạch sản xuất', color: '#5E81AC' },
  { value: 'pellet', label: '⚙️ Pellet', color: '#EBCB8B' },
  { value: 'stock', label: '📊 Stock', color: '#B48EAD' },
  { value: 'product', label: '📦 Sản phẩm', color: '#BF616A' },
];

// ========== Types ==========

interface OrderPreviewRow {
  _key: number;
  codeCam: string;
  ngayLay: string;
  soLuong: number;
  idSanPham: number | null;
  tenCam: string;
  matched: boolean;
  packingSize?: string;  // e.g. "25 kg", "50 kg", "5 kg", "SILO"
  loaiHang?: string;     // e.g. "Hàng bao 25 kg", "Xe bồn"
  formularCode?: string; // e.g. "311001"
}

interface ExcelMeta {
  daiLy: string;
  mskh: string;
  diaChi: string;
  tuan: string;
}

interface ProductItem {
  id: number;
  codeCam: string;
  tenCam?: string;
}

// ========== Excel Parser for Weekly Order Plan ==========

function parseWeeklyOrderExcel(ws: XLSX.WorkSheet): { rows: OrderPreviewRow[]; meta: ExcelMeta; format: 'bao' | 'silo'; products: Map<string, any> } | null {
  // Read as raw 2D array to handle merged cells & complex layout
  const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (!raw || raw.length < 5) return null;

  // DEBUG: Log raw data to help diagnose parsing issues
  console.log('=== RAW EXCEL DATA ===');
  raw.forEach((row, i) => {
    const cells = row.map((c: any, j: number) => `[${j}]=${JSON.stringify(c)}`).join(' | ');
    console.log(`Row ${i}: ${cells}`);
  });
  console.log('=== END RAW DATA ===');

  // Extract meta info from first rows
  const meta: ExcelMeta = { daiLy: '', mskh: '', diaChi: '', tuan: '' };

  for (let i = 0; i < Math.min(raw.length, 10); i++) {
    const cellA = String(raw[i]?.[0] || '').trim();
    const upper = cellA.toUpperCase();
    if (upper.includes('ĐẠI LÝ') || upper.includes('DAI LY') || upper.includes('CHI NHÁNH')) meta.daiLy = cellA;
    else if (upper.includes('MSKH')) meta.mskh = cellA;
    else if (upper.includes('ĐC') || upper.includes('ĐỊA CHỈ')) meta.diaChi = cellA;
    else if (upper.includes('TUẦN') || upper.includes('TUAN') || upper.includes('KẾ HOẠCH')) meta.tuan = cellA;
    else if (upper.includes('TỪ NGÀY') || upper.includes('TU NGAY')) { if (!meta.tuan) meta.tuan = cellA; }
  }

  // STRATEGY: Find the header row and date columns
  // Format 1 (BAO): "CÁM BAO | THỨ 2 | THỨ 3..." + next row "Ngày | 23/3 | 24/3..."
  // Format 2 (SILO): "NGÀY | PELLET SIZE | 23/3/2026 | 24/3/2026..." (dates in same row)

  let headerIdx = -1;
  let dateIdx = -1;
  let dataColStart = 1; // column index where date columns start (skip col A = product name)

  for (let i = 0; i < Math.min(raw.length, 20); i++) {
    const row = raw[i];
    if (!row) continue;

    // Count "THỨ" keywords in columns B+ (BAO format)
    let thuCount = 0;
    for (let c = 1; c < Math.min(row.length, 12); c++) {
      const cell = String(row[c] || '').trim().toUpperCase();
      if (cell.includes('THỨ') || cell.includes('THU')) thuCount++;
    }
    if (thuCount >= 3) {
      headerIdx = i;
      console.log(`Found BAO header row at index ${i}`);
      break;
    }

    // Count date-like values in columns (SILO format: dates directly in header)
    let dateCount = 0;
    let firstDateCol = -1;
    for (let c = 1; c < Math.min(row.length, 12); c++) {
      if (looksLikeDate(row[c])) {
        dateCount++;
        if (firstDateCol < 0) firstDateCol = c;
      }
    }
    // If this row has 3+ dates, it's a SILO-style header with dates inline
    if (dateCount >= 3) {
      // Also check column A for "NGÀY", "CÁM", or similar header text
      const cellA = String(row[0] || '').trim().toUpperCase();
      if (cellA.includes('NGÀY') || cellA.includes('NGAY') || cellA.includes('CÁM')
          || cellA.includes('CAM') || cellA.includes('STT') || cellA.includes('TÊN')) {
        headerIdx = i;
        dateIdx = i; // dates are in the same row!
        dataColStart = firstDateCol;
        console.log(`Found SILO header+date row at index ${i}, dates start at col ${firstDateCol}`);
        break;
      }
    }

    // Check column A for "CÁM" with "THỨ" in other columns
    const cellA = String(row[0] || '').trim().toUpperCase();
    if (cellA.includes('CÁM') || cellA.includes('CAM')) {
      let hasThu = false;
      for (let c = 1; c < Math.min(row.length, 12); c++) {
        if (String(row[c] || '').trim().toUpperCase().includes('THỨ')) { hasThu = true; break; }
      }
      if (hasThu) {
        headerIdx = i;
        console.log(`Found BAO header row (via CÁM) at index ${i}`);
        break;
      }
    }
  }

  if (headerIdx < 0) {
    console.log('Could not find header row');
    return null;
  }

  // If dateIdx not yet found (BAO format), search for date row after header
  if (dateIdx < 0) {
    for (let i = headerIdx + 1; i <= Math.min(headerIdx + 3, raw.length - 1); i++) {
      const row = raw[i];
      if (!row) continue;
      let dateCount = 0;
      for (let c = 1; c < Math.min(row.length, 12); c++) {
        if (looksLikeDate(row[c])) dateCount++;
      }
      if (dateCount >= 3) {
        dateIdx = i;
        console.log(`Found separate date row at index ${i}`);
        break;
      }
    }
  }

  if (dateIdx < 0) {
    console.log('Could not find date row');
    return null;
  }

  // Extract dates from the date row
  const dateRow = raw[dateIdx];

  // Map column index → date string
  const colDates: Map<number, string> = new Map();
  for (let c = dataColStart; c < dateRow.length; c++) {
    // Stop at TOTAL/summary columns
    const cellVal = String(dateRow[c] || '').trim().toUpperCase();
    if (cellVal.includes('TOTAL') || cellVal === 'BAG' || cellVal === 'TON' || cellVal.includes('TỔNG')) break;
    // Also check the header row for TOTAL keywords if header != date row
    if (headerIdx !== dateIdx) {
      const headerCell = String(raw[headerIdx][c] || '').trim().toUpperCase();
      if (headerCell.includes('TOTAL') || headerCell === 'BAG' || headerCell === 'TON') break;
    }

    const dateVal = dateRow[c];
    if (looksLikeDate(dateVal)) {
      const dateStr = formatExcelDate(dateVal);
      if (dateStr) {
        colDates.set(c, dateStr);
        console.log(`Column ${c}: date = ${dateStr}`);
      }
    }
  }

  console.log(`Found ${colDates.size} date columns`);
  if (colDates.size === 0) return null;

  // Extract data rows (after dateIdx, skip TOTAL/empty)
  const dataStartIdx = dateIdx + 1;
  const rows: OrderPreviewRow[] = [];
  let keyCounter = 0;

  for (let r = dataStartIdx; r < raw.length; r++) {
    const row = raw[r];
    if (!row || row.length === 0) continue;

    const codeCam = String(row[0] || '').trim();
    if (!codeCam) continue;

    // Skip TOTAL & summary rows (not product data)
    const upper = codeCam.toUpperCase();
    if (upper === 'TOTAL' || upper.includes('TỔNG') || upper.includes('SỐ LƯỢNG')
        || upper.includes('TONG') || upper.includes('SO LUONG')) continue;

    // For each date column, if quantity > 0, create a preview row
    for (const [colIdx, dateStr] of colDates) {
      const cellVal = row[colIdx];
      const qty = parseNumber(cellVal);
      if (qty > 0) {
        // BAO format: qty = bag count → convert to kg (25kg/bag)
        // SILO format: qty = already in kg
        const isSiloFormat = (dateIdx === headerIdx);
        const soLuongKg = isSiloFormat ? qty : qty * 25;
        rows.push({
          _key: keyCounter++,
          codeCam,
          ngayLay: dateStr,
          soLuong: soLuongKg,
          idSanPham: null, // will be matched later
          tenCam: '',
          matched: false,
        });
      }
    }
  }

  // Determine format: if dateIdx === headerIdx, it's SILO (dates inline)
  const format = (dateIdx === headerIdx) ? 'silo' as const : 'bao' as const;
  console.log(`Detected format: ${format}`);

  return { rows, meta, format, products: new Map() };
}

// ========== Sales Forecast Parser ==========

function parseSalesForecastExcel(ws: XLSX.WorkSheet): { rows: OrderPreviewRow[]; meta: ExcelMeta } | null {
  const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (!raw || raw.length < 10) return null;

  // DEBUG: Log first 15 rows to trace detection issues
  console.log('=== SALES FORECAST DETECTION START ===');
  for (let i = 0; i < Math.min(raw.length, 15); i++) {
    const cells = raw[i].map((c: any, j: number) => `[${j}]=${JSON.stringify(c)}`).join(' | ');
    console.log(`Row ${i}: ${cells}`);
  }

  // Detect Sales Forecast format: look for "SALES FORECAST", "FORMULAR", "FEED CODE", "C.P. VIETNAM"
  let isForecast = false;
  let dateRange = '';
  for (let i = 0; i < Math.min(raw.length, 12); i++) {
    const rowText = raw[i].map((c: any) => String(c || '')).join(' ').toUpperCase();
    if (rowText.includes('SALES FORECAST') || rowText.includes('FORMULAR')
        || rowText.includes('FEED CODE') || rowText.includes('FEED (TONS)')) {
      isForecast = true;
      console.log(`Forecast keyword found at row ${i}: ${rowText.substring(0, 100)}`);
    }
    // Extract date range like "From 23/03/2026 to 28/03/2026"
    const match = rowText.match(/FROM\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+TO\s+(\d{1,2}\/\d{1,2}\/\d{4})/);
    if (match) {
      dateRange = `${match[1]} - ${match[2]}`;
    }
  }

  if (!isForecast) {
    console.log('Not a Sales Forecast file (no keywords found)');
    return null;
  }
  console.log(`=== SALES FORECAST FORMAT DETECTED === dateRange: ${dateRange}`);

  // Find the sub-header row that contains HIGRO (appears at least twice: once in feed code, once in quantity)
  // This is the most reliable marker for this format
  let subHeaderIdx = -1;
  for (let i = 0; i < Math.min(raw.length, 15); i++) {
    const row = raw[i];
    let higroCount = 0;
    for (let c = 0; c < row.length; c++) {
      if (String(row[c] || '').toUpperCase().trim() === 'HIGRO') higroCount++;
    }
    if (higroCount >= 2) {
      subHeaderIdx = i;
      console.log(`Found sub-header row (HIGRO x${higroCount}) at index ${i}`);
      break;
    }
  }

  // Fallback: find row that has HIGRO at least once
  if (subHeaderIdx < 0) {
    for (let i = 0; i < Math.min(raw.length, 15); i++) {
      const row = raw[i];
      for (let c = 0; c < row.length; c++) {
        if (String(row[c] || '').toUpperCase().trim() === 'HIGRO') {
          subHeaderIdx = i;
          console.log(`Found sub-header row (HIGRO fallback) at index ${i}`);
          break;
        }
      }
      if (subHeaderIdx >= 0) break;
    }
  }

  if (subHeaderIdx < 0) {
    console.log('Could not find sub-header row with HIGRO');
    return null;
  }

  // The main header is one row above the sub-header
  const headerIdx = subHeaderIdx - 1;

  // The structure has 2 header rows (row 8 = group headers, row 9 = sub-headers)
  // We need to find the column mapping
  // Read both header rows to understand structure
  const h1 = raw[headerIdx] || [];
  const h2 = raw[subHeaderIdx] || [];

  console.log('Header row 1:', h1.map((c: any, i: number) => `[${i}]=${c}`).join(' | '));
  console.log('Header row 2:', h2.map((c: any, i: number) => `[${i}]=${c}`).join(' | '));

  // Find feed code columns (D-I = index 3-8) and quantity columns (J-N = 9-13, R = 17)
  // The mapping: feed code col X -> quantity col based on header group
  // D(3)->J(9) HIGRO, E(4)->K(10) CP, F(5)->L(11) STAR, G(6)->M(12) NUVO, H(7)->N(13) NASA
  // I(8)->FARM -> quantity at R(17) which is FARM TOTAL

  // Dynamically detect column positions by scanning headers
  // Look for sub-header row with HIGRO, CP, STAR, NUVO, NASA, FARM
  let feedCodeCols: { col: number; name: string; qtyCol: number }[] = [];

  // Find FEED CODE section columns and DEALER/FARM quantity columns
  // Strategy: find "HIGRO" in sub-header, that marks the first feed code column
  // Then find matching quantity columns in the quantity section
  const subHeaders = h2.map((c: any) => String(c || '').toUpperCase().trim());
  const mainHeaders = h1.map((c: any) => String(c || '').toUpperCase().trim());

  // Find feed code start (look for HIGRO in sub-headers)
  let feedStart = -1;
  for (let c = 0; c < subHeaders.length; c++) {
    if (subHeaders[c] === 'HIGRO') {
      feedStart = c;
      break;
    }
  }

  if (feedStart < 0) {
    // Fallback: check main headers
    for (let c = 0; c < mainHeaders.length; c++) {
      if (mainHeaders[c] === 'HIGRO') {
        feedStart = c;
        break;
      }
    }
  }

  if (feedStart < 0) {
    console.log('Could not find HIGRO column to detect feed code layout');
    return null;
  }

  console.log(`Feed code columns start at index ${feedStart}`);

  // Map feed names in sub-header to their columns
  const feedNames = ['HIGRO', 'CP', 'STAR', 'NUVO', 'NASA', 'FARM'];
  const detectedFeeds: { col: number; name: string }[] = [];

  for (let c = feedStart; c < Math.min(subHeaders.length, feedStart + 10); c++) {
    const name = subHeaders[c];
    if (feedNames.includes(name)) {
      // Stop at first duplicate (e.g. second HIGRO = start of DEALER section)
      if (detectedFeeds.some(f => f.name === name)) break;
      detectedFeeds.push({ col: c, name });
    } else if (name && !['', 'CODE'].includes(name) && detectedFeeds.length > 0) {
      // Stop when we hit a non-feed-name column after finding some feeds
      break;
    }
  }

  console.log('Detected feed columns:', detectedFeeds);

  // Find the quantity section (DEALER columns that correspond to feed codes)
  // Strategy: 
  //   1. Search main header (h1) for "DEALER" to find where quantities start
  //   2. Search both h1 and h2 for second HIGRO occurrence (but validate it's close to feed codes)
  //   3. Fallback: use fixed offset (numFeedCodes columns after feedStart)
  const numFeedCodes = detectedFeeds.length; // typically 6

  let qtyStart = -1;

  // Method 1: Find "DEALER" in main headers → that column is where HIGRO qty starts
  for (let c = 0; c < mainHeaders.length; c++) {
    if (mainHeaders[c].includes('DEALER')) {
      qtyStart = c;
      console.log(`Found DEALER in main header at index ${c}`);
      break;
    }
  }

  // Method 2: Search both header rows for HIGRO after feed section (within reasonable range)
  if (qtyStart < 0) {
    const searchStart = feedStart + numFeedCodes;
    const searchEnd = Math.min(searchStart + 10, subHeaders.length); // max 10 cols away
    for (let c = searchStart; c < searchEnd; c++) {
      const sub = subHeaders[c] || '';
      const main = mainHeaders[c] || '';
      if (sub === 'HIGRO' || main === 'HIGRO') {
        qtyStart = c;
        console.log(`Found HIGRO in headers at index ${c} (sub="${sub}", main="${main}")`);
        break;
      }
    }
  }

  // Method 3: Fallback - use fixed offset (works for standard CP Vietnam format)
  if (qtyStart < 0) {
    qtyStart = feedStart + numFeedCodes;
    console.log(`Using fixed offset: qtyStart = feedStart(${feedStart}) + numFeedCodes(${numFeedCodes}) = ${qtyStart}`);
  }

  // Find FARM TOTAL column (column R = FARM section TOTAL)
  // Strategy: find "FARM" in main headers, then look for TOTAL from there
  let farmTotalCol = -1;
  
  // Method 1: Find "FARM" text in main headers to locate the FARM section
  let farmSectionStart = -1;
  for (let c = qtyStart + 5; c < Math.min(mainHeaders.length, qtyStart + 15); c++) {
    if (mainHeaders[c].includes('FARM')) {
      farmSectionStart = c;
      console.log(`Found FARM section in main header at index ${c}`);
      break;
    }
  }
  
  if (farmSectionStart >= 0) {
    // Search for TOTAL within the FARM section (typically 2-3 columns after FARM start)
    for (let c = farmSectionStart; c < Math.min(farmSectionStart + 5, subHeaders.length); c++) {
      const sub = subHeaders[c] || '';
      if (sub === 'TOTAL') {
        farmTotalCol = c;
        console.log(`Found FARM TOTAL at index ${c}`);
        break;
      }
    }
    // If no TOTAL found in sub-headers, use farmSectionStart + 2 (SWINE, INTEGRATE, TOTAL)
    if (farmTotalCol < 0) {
      farmTotalCol = farmSectionStart + 2;
      console.log(`FARM TOTAL by offset: index ${farmTotalCol}`);
    }
  }
  
  // Method 2: Fallback - fixed offset from qtyStart
  // Layout: HIGRO(+0) CP(+1) STAR(+2) NUVO(+3) NASA(+4) TOTAL(+5) SWINE(+6) INTEGRATE(+7) TOTAL(+8)
  if (farmTotalCol < 0) {
    farmTotalCol = qtyStart + 8;
    console.log(`FARM TOTAL fallback: qtyStart(${qtyStart}) + 8 = ${farmTotalCol}`);
  }

  console.log(`Quantity columns start at index ${qtyStart}, FARM TOTAL at ${farmTotalCol}`);

  // Build the feed-to-quantity mapping
  for (let i = 0; i < detectedFeeds.length; i++) {
    const feed = detectedFeeds[i];
    let qtyCol: number;

    if (feed.name === 'FARM') {
      qtyCol = farmTotalCol;
    } else {
      // DEALER feeds: HIGRO→qtyStart+0, CP→qtyStart+1, STAR→+2, NUVO→+3, NASA→+4
      const dealerIdx = ['HIGRO', 'CP', 'STAR', 'NUVO', 'NASA'].indexOf(feed.name);
      qtyCol = qtyStart + dealerIdx;
    }

    feedCodeCols.push({ col: feed.col, name: feed.name, qtyCol });
  }

  console.log('Feed-to-quantity mapping:', feedCodeCols);

  // Extract start date from date range for ngayLay
  let startDate = '';
  if (dateRange) {
    const dateMatch = dateRange.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dateMatch) {
      startDate = `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;
    }
  }
  if (!startDate) {
    // Default to today
    startDate = new Date().toISOString().split('T')[0];
  }

  // Parse data rows (start after header rows)
  const dataStart = subHeaderIdx + 1;
  const rows: OrderPreviewRow[] = [];
  let keyCounter = 0;

  // Column index for packing size (column C = index 2)
  const packingCol = 2;

  for (let r = dataStart; r < raw.length; r++) {
    const row = raw[r];
    if (!row || row.length === 0) continue;

    const formularCode = String(row[0] || '').trim();
    if (!formularCode) continue;

    // Stop at GRAND TOTAL row
    const upper = formularCode.toUpperCase();
    if (upper.includes('GRAND') || upper.includes('TỔNG') || upper.includes('TONG')) break;

    // Skip non-data rows
    if (upper === 'TOTAL' || upper.includes('REMARK') || upper.includes('NOTE')) continue;

    // Skip if formular code doesn't look like a product code (should start with digit)
    if (!/^\d/.test(formularCode)) continue;

    // Get packing size
    const packingRaw = String(row[packingCol] || '').trim();
    let packingSize = '';
    let loaiHang = '';

    const packUpper = packingRaw.toUpperCase();
    if (packUpper.includes('SILO') || packUpper.includes('BỒN') || packUpper.includes('BON')) {
      packingSize = 'SILO';
      loaiHang = 'Xe bồn';
    } else {
      const kgMatch = packingRaw.match(/(\d+)/);
      if (kgMatch) {
        packingSize = `${kgMatch[1]} kg`;
        loaiHang = `Hàng bao ${kgMatch[1]} kg`;
      } else {
        packingSize = packingRaw;
        loaiHang = packingRaw;
      }
    }

    // For each feed code column, check if there's a product name and quantity
    for (const feed of feedCodeCols) {
      const feedName = String(row[feed.col] || '').trim();
      if (!feedName) continue;

      // Skip if feed name is a pure number (it's a quantity value, not a product name)
      // REMOVED: valid feed names CAN be pure numbers (e.g. "6991")
      // The duplicate HIGRO column detection prevents quantity values from being read as feed names

      const qty = parseNumber(row[feed.qtyCol]);
      // Only include rows with actual orders (qty > 0)
      if (qty <= 0) continue;
      // qty is in tons from Excel → convert to kg for consistent storage
      const qtyKg = qty * 1000;
      rows.push({
        _key: keyCounter++,
        codeCam: feedName,
        ngayLay: startDate,
        soLuong: qtyKg,
        idSanPham: null,
        tenCam: '',
        matched: false,
        packingSize,
        loaiHang,
        formularCode,
      });
    }
  }

  console.log(`Parsed ${rows.length} forecast rows`);

  const meta: ExcelMeta = {
    daiLy: 'SALES FORECAST',
    mskh: '',
    diaChi: '',
    tuan: dateRange || `Tuần ${getWeekNumber()}`,
  };

  return { rows, meta };
}

function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  return Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
}

/** Parse a cell value as a number */
function parseNumber(val: any): number {
  if (val === null || val === undefined || val === '' || val === '-') return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/,/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/** Check if a value looks like a date (string "23/3/2026" or Excel serial number) */
function looksLikeDate(val: any): boolean {
  if (!val && val !== 0) return false;
  // String date pattern: dd/mm/yyyy or d/m/yyyy
  if (typeof val === 'string' && /\d{1,2}\/\d{1,2}\/\d{4}/.test(val.trim())) return true;
  // Excel serial date number (typically 40000-60000 range for years 2009-2063)
  if (typeof val === 'number' && val > 40000 && val < 70000) return true;
  return false;
}

/** Format Excel date: could be serial number, Date object, or string like "23/3/2026" */
function formatExcelDate(val: any): string {
  if (!val && val !== 0) return '';
  // Already a formatted string
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmed)) {
      // Convert dd/mm/yyyy → yyyy-mm-dd for backend
      const parts = trimmed.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return trimmed;
  }
  // Excel serial date number
  if (typeof val === 'number' && val > 1000) {
    try {
      const date = XLSX.SSF.parse_date_code(val);
      if (date) {
        return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
      }
    } catch { /* ignore */ }
  }
  return String(val);
}

/** Format yyyy-mm-dd back to dd/mm/yyyy for display */
function displayDate(dateStr: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }
  return dateStr;
}

// ========== Generic Parser (for other import types) ==========

/** Auto-format a cell value: detect Excel serial dates and format as dd/mm/yyyy hh:mm:ss */
function autoFormatCell(val: any): any {
  if (val === null || val === undefined || val === '') return val;
  // Detect Excel serial date number (range ~40000-70000 covers years 2009-2091)
  if (typeof val === 'number' && val > 40000 && val < 70000) {
    try {
      const date = XLSX.SSF.parse_date_code(val);
      if (date) {
        const dd = String(date.d).padStart(2, '0');
        const mm = String(date.m).padStart(2, '0');
        const yyyy = date.y;
        const hh = String(date.H).padStart(2, '0');
        const min = String(date.M).padStart(2, '0');
        const ss = String(date.S).padStart(2, '0');
        // If time is 00:00:00, just show date
        if (date.H === 0 && date.M === 0 && date.S === 0) {
          return `${dd}/${mm}/${yyyy}`;
        }
        return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
      }
    } catch { /* not a date, return as-is */ }
  }
  return val;
}

function parseGenericExcel(ws: XLSX.WorkSheet) {
  const data = XLSX.utils.sheet_to_json(ws);
  if (data.length === 0) return { data: [], columns: [] };

  const columns = Object.keys(data[0] as object).map((key) => ({
    title: key,
    dataIndex: key,
    key,
    ellipsis: true,
  }));

  // Auto-format all cell values (detect serial dates)
  const formattedData = data.map((row: any, i: number) => {
    const newRow: any = { _key: i };
    for (const key of Object.keys(row)) {
      newRow[key] = autoFormatCell(row[key]);
    }
    return newRow;
  });

  return {
    data: formattedData,
    columns,
  };
}

// ========== Component ==========

export default function ImportPage() {
  const [importType, setImportType] = useState('order');
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);

  // For order import (weekly plan)
  const [orderRows, setOrderRows] = useState<OrderPreviewRow[]>([]);
  const [excelMeta, setExcelMeta] = useState<ExcelMeta | null>(null);
  const [excelFormat, setExcelFormat] = useState<'bao' | 'silo'>('bao');
  const [productList, setProductList] = useState<ProductItem[]>([]);

  // For generic import
  const [genericData, setGenericData] = useState<any[]>([]);
  const [genericColumns, setGenericColumns] = useState<any[]>([]);

  // Load product list on mount
  useEffect(() => {
    productApi.getList().then((res) => {
      setProductList(res.data || []);
    }).catch(() => { /* ignore */ });
  }, []);

  // Match code cám to products (by TenCam first, then CodeCam)
  // Excel has product names like "552", "551X" which are TenCam in the system
  // The actual CodeCam would be something like "321001"
  const matchProducts = (rows: OrderPreviewRow[], products: ProductItem[]): OrderPreviewRow[] => {
    const byTenCam = new Map<string, ProductItem>();
    const byCodeCam = new Map<string, ProductItem>();
    products.forEach(p => {
      if (p.tenCam) byTenCam.set(p.tenCam.toUpperCase().trim(), p);
      if (p.codeCam) byCodeCam.set(p.codeCam.toUpperCase().trim(), p);
    });

    return rows.map(row => {
      const key = row.codeCam.toUpperCase().trim();
      // Try matching by TenCam first (most common for Excel imports)
      const product = byTenCam.get(key) || byCodeCam.get(key);
      return {
        ...row,
        idSanPham: product?.id ?? null,
        tenCam: product?.tenCam || '',
        matched: !!product,
      };
    });
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'binary' });
        // Use LAST sheet (latest data) instead of first sheet
        const lastSheetName = wb.SheetNames[wb.SheetNames.length - 1];
        const ws = wb.Sheets[lastSheetName];
        console.log(`Using sheet: "${lastSheetName}" (${wb.SheetNames.length} sheets total)`);

        if (importType === 'order') {
          // Try Sales Forecast format first, then weekly order plan
          let result = parseSalesForecastExcel(ws);
          let isForecast = !!result;
          if (!result) {
            const weeklyResult = parseWeeklyOrderExcel(ws);
            if (weeklyResult) {
              result = { rows: weeklyResult.rows, meta: weeklyResult.meta, format: weeklyResult.format } as any;
            }
          }
          if (!result || result.rows.length === 0) {
            message.warning('Không tìm thấy dữ liệu đặt hàng trong file. Hãy kiểm tra format file.');
            return;
          }
          if (isForecast) {
            console.log('Using Sales Forecast parser');
          }

          const matched = matchProducts(result.rows, productList);
          const matchedCount = matched.filter(r => r.matched).length;
          const unmatchedCount = matched.filter(r => !r.matched).length;

          setOrderRows(matched);
          setExcelMeta(result.meta);
          setExcelFormat((result as any).format || 'bao');
          setGenericData([]); setGenericColumns([]);
          setFileName(file.name);

          if (unmatchedCount > 0) {
            message.warning(`Đã đọc ${matched.length} dòng. ${unmatchedCount} code cám chưa có trong hệ thống!`);
          } else {
            message.success(`Đã đọc ${matched.length} dòng đặt hàng từ ${file.name}`);
          }
        } else {
          // Generic parse for other types
          const { data, columns } = parseGenericExcel(ws);
          if (data.length === 0) {
            message.warning('File không có dữ liệu');
            return;
          }
          setGenericData(data);
          setGenericColumns(columns);
          setOrderRows([]); setExcelMeta(null);
          setFileName(file.name);
          message.success(`Đã đọc ${data.length} dòng từ ${file.name}`);
        }
      } catch {
        message.error('Lỗi đọc file Excel');
      }
    };
    reader.readAsBinaryString(file);
    return false;
  };

  const handleImportOrder = async () => {
    const validRows = orderRows.filter(r => r.matched && r.soLuong > 0);
    if (validRows.length === 0) {
      message.warning('Không có dòng hợp lệ để import (code cám phải tồn tại trong hệ thống)');
      return;
    }

    setImporting(true);
    try {
      // Determine order type based on format/packing
      // Forecast items (have packingSize set) → always 'Forecast tuần'
      // Weekly silo format → 'Xe bồn Silo'
      // Weekly bao format → 'Đại lý Bá Cang'
      const getOrderType = (r: OrderPreviewRow): string => {
        if (r.packingSize) return 'Forecast tuần'; // all forecast items
        if (excelFormat === 'silo') return 'Xe bồn Silo';
        return 'Đại lý Bá Cang';
      };

      const items = validRows.map(r => ({
        idSanPham: r.idSanPham!,
        soLuong: r.soLuong,
        ngayLay: r.ngayLay,
        loaiDatHang: getOrderType(r),
        khachVangLai: 0,
        ghiChu: `Import từ ${fileName}`,
      }));

      const primaryType = items[0]?.loaiDatHang || 'Đại lý Bá Cang';
      const result = await importApi.importOrder({
        loaiDatHang: primaryType,
        maDatHang: `DH_IMPORT_${Date.now()}`,
        items: items.map(i => ({
          idSanPham: i.idSanPham,
          soLuong: i.soLuong,
          ngayLay: i.ngayLay,
          ghiChu: i.ghiChu,
          loaiDatHang: i.loaiDatHang,
        })),
      });
      message.success(result?.data?.message || `Import thành công ${validRows.length} đơn hàng!`);
      setOrderRows([]); setExcelMeta(null); setFileName('');
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Lỗi khi import');
    } finally {
      setImporting(false);
    }
  };

  const handleImportGeneric = async () => {
    if (genericData.length === 0) {
      message.warning('Chưa có dữ liệu để import');
      return;
    }

    setImporting(true);
    try {
      let result;
      switch (importType) {
        case 'plan':
          result = await importApi.importPlan({
            ngayPlan: new Date().toISOString().split('T')[0],
            maPlan: `PL_IMPORT_${Date.now()}`,
            items: genericData.map(r => ({
              idSanPham: r.id_san_pham || r.IdSanPham || r.ID || 0,
              soLuong: r.so_luong || r.SoLuong || r['Số lượng'] || 0,
              ghiChu: r.ghi_chu || r.GhiChu || r['Ghi chú'] || '',
            })),
          });
          break;
        case 'product':
          console.log('Product import data sample:', genericData[0]);
          result = await importApi.importProduct(genericData.map(r => ({
            codeCam: String(r['Code cám'] ?? r.code_cam ?? r.CodeCam ?? r['Code cam'] ?? ''),
            tenCam: String(r['Tên cám'] ?? r.ten_cam ?? r.TenCam ?? r['Ten cam'] ?? ''),
            dangEpVien: String(r['Dạng ép viên'] ?? r.dang_ep_vien ?? r.DangEpVien ?? ''),
            kichCoEpVien: String(r['Kích cỡ ép viên'] ?? r.kich_co_ep_vien ?? r.KichCoEpVien ?? ''),
            batchSize: Number(r['Batch size'] ?? r.BatchSize ?? r.batch_size ?? 0) || null,
            vatNuoi: String(r['Vật nuôi'] ?? r.vat_nuoi ?? r.VatNuoi ?? r['Vat nuoi'] ?? ''),
          })));
          break;
        case 'stock':
          result = await importApi.importStock({
            ngayCapNhat: new Date().toISOString().split('T')[0],
            items: genericData.map(r => ({
              idSanPham: r.id_san_pham || r.IdSanPham || r.ID || 0,
              soLuong: r.so_luong || r.SoLuong || r['Số lượng'] || 0,
            })),
          });
          break;
        case 'pellet':
          result = await importApi.importPellet({
            ngaySanXuat: new Date().toISOString(),
            items: genericData.map(r => ({
              idSanPham: r.id_san_pham || r.IdSanPham || r.ID || 0,
              soLuong: r.so_luong || r.SoLuong || r['Số lượng'] || 0,
              soMay: r.so_may || r.SoMay || 'M1',
            })),
          });
          break;
      }
      message.success(result?.data?.message || 'Import thành công!');
      setGenericData([]); setGenericColumns([]); setFileName('');
    } catch (e: any) {
      console.error('Import error:', e);
      console.error('Response data:', e.response?.data);
      const errMsg = e.response?.data?.message
        || e.response?.data?.title
        || (typeof e.response?.data === 'string' ? e.response.data : null)
        || e.message
        || 'Lỗi khi import';
      message.error(errMsg);
    } finally {
      setImporting(false);
    }
  };

  const totalRows = importType === 'order' ? orderRows.length : genericData.length;
  const matchedCount = orderRows.filter(r => r.matched).length;
  const unmatchedCodes = [...new Set(orderRows.filter(r => !r.matched && r.soLuong > 0).map(r => r.codeCam))];

  // Check if any row has packingSize (= forecast format)
  const hasForecastData = orderRows.some(r => r.packingSize);
  // Order preview columns — adapt based on format (BAO vs SILO vs Forecast)
  const isSilo = excelFormat === 'silo';
  const orderColumns = [
    ...(hasForecastData ? [{
      title: 'Code Cám',
      dataIndex: 'formularCode',
      key: 'formularCode',
      width: 100,
      render: (val: string) => <Text strong>{val}</Text>,
    }] : []),
    {
      title: hasForecastData ? 'Tên Cám' : 'Code Cám',
      dataIndex: 'codeCam',
      key: 'codeCam',
      width: 120,
      render: (val: string, row: OrderPreviewRow) => (
        <Text strong style={{ color: row.matched ? undefined : '#BF616A' }}>{val}</Text>
      ),
    },
    ...(hasForecastData ? [{
      title: 'Loại hàng',
      dataIndex: 'loaiHang',
      key: 'loaiHang',
      width: 130,
      render: (val: string) => {
        const color = val?.includes('bồn') ? 'volcano' : val?.includes('50') ? 'geekblue' : val?.includes('5 kg') ? 'purple' : 'cyan';
        return <Tag color={color}>{val}</Tag>;
      },
    }] : []),
    {
      title: 'Ngày Lấy',
      dataIndex: 'ngayLay',
      key: 'ngayLay',
      width: 120,
      render: (val: string) => <Tag color="blue">{displayDate(val)}</Tag>,
    },
    {
      title: 'Số Lượng (Kg)',
      dataIndex: 'soLuong',
      key: 'soLuong',
      width: 140,
      align: 'right' as const,
      render: (val: number) => (
        <Text strong style={{ color: val > 0 ? '#A3BE8C' : '#999', fontSize: 15 }}>
          {val.toLocaleString('vi-VN')}
        </Text>
      ),
    },
  ];

  return (
    <div>
      <Title level={3}>📥 Import dữ liệu từ Excel</Title>

      <Card style={{ borderRadius: 12, marginBottom: 16 }}>
        <Space size="large" wrap>
          <Select value={importType} onChange={(v) => {
            setImportType(v);
            // Clear preview on type change
            setOrderRows([]); setExcelMeta(null);
            setGenericData([]); setGenericColumns([]);
            setFileName('');
          }} style={{ width: 250 }} options={IMPORT_TYPES} />
          <Upload beforeUpload={handleFileUpload} accept=".xlsx,.xls,.csv" showUploadList={false}>
            <Button icon={<UploadOutlined />} size="large">Chọn file Excel</Button>
          </Upload>
          {fileName && <Tag icon={<FileExcelOutlined />} color="green">{fileName}</Tag>}
          {totalRows > 0 && (
            <Button type="primary" icon={<CloudUploadOutlined />}
              onClick={importType === 'order' ? handleImportOrder : handleImportGeneric}
              loading={importing} size="large">
              Import {importType === 'order' ? `${matchedCount} đơn hàng` : `${totalRows} dòng`}
            </Button>
          )}
        </Space>
      </Card>

      {/* Order Import Preview */}
      {importType === 'order' && orderRows.length > 0 && (
        <>
          {/* Meta info */}
          {excelMeta && (
            <Card style={{ borderRadius: 12, marginBottom: 16, background: '#f0f5ff' }} size="small">
              <Descriptions size="small" column={2} bordered>
                <Descriptions.Item label="Đại lý">{excelMeta.daiLy}</Descriptions.Item>
                <Descriptions.Item label="MSKH">{excelMeta.mskh}</Descriptions.Item>
                <Descriptions.Item label="Địa chỉ">{excelMeta.diaChi}</Descriptions.Item>
                <Descriptions.Item label="Tuần">{excelMeta.tuan}</Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          {/* Warnings */}
          {unmatchedCodes.length > 0 && (
            <Alert type="warning" showIcon style={{ marginBottom: 16, borderRadius: 8 }}
              message={`${unmatchedCodes.length} code cám chưa có trong hệ thống`}
              description={
                <div>
                  <Text>Các code cám sau sẽ <strong>không được import</strong>: </Text>
                  {unmatchedCodes.map(c => <Tag key={c} color="orange" style={{ margin: 2 }}>{c}</Tag>)}
                  <br/><Text type="secondary" style={{ fontSize: 12 }}>
                    Hãy thêm sản phẩm trước trong mục "Sản phẩm" rồi import lại.
                  </Text>
                </div>
              }
            />
          )}

          <Card
            title={
              <Space>
                <span>📋 Xem trước đơn hàng ({orderRows.length} dòng)</span>
                <Tag color="green">{matchedCount} hợp lệ</Tag>
                {unmatchedCodes.length > 0 && <Tag color="orange">{orderRows.length - matchedCount} thiếu sản phẩm</Tag>}
              </Space>
            }
            style={{ borderRadius: 12 }}
          >
            <Alert type="info" showIcon style={{ marginBottom: 16 }}
              message={isSilo
                ? "Mỗi dòng = 1 đơn hàng (code cám + ngày lấy + số lượng Kg). Chỉ dòng hợp lệ mới được import."
                : "Mỗi dòng = 1 đơn hàng (code cám + ngày lấy + số lượng BAG). Chỉ dòng hợp lệ mới được import."
              } />
            <Table dataSource={orderRows} columns={orderColumns} rowKey="_key"
              size="small" bordered pagination={{ pageSize: 30 }}
              rowClassName={(row) => row.matched ? '' : 'ant-table-row-warning'}
              summary={() => {
                const total = orderRows.reduce((sum, r) => sum + r.soLuong, 0);
                const unit = hasForecastData ? 'Tấn' : (isSilo ? 'Kg' : 'BAG');
                const colSpan = hasForecastData ? 4 : 2;
                return (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={colSpan}>
                    <Text strong>TỔNG</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={colSpan} align="right">
                    <Text strong style={{ color: '#A3BE8C', fontSize: 16 }}>
                      {total.toLocaleString('vi-VN')} {unit}
                    </Text>
                  </Table.Summary.Cell>
                  {!hasForecastData && !isSilo && (
                    <Table.Summary.Cell index={colSpan + 1} align="right">
                      <Text strong style={{ color: '#5E81AC', fontSize: 16 }}>
                        {(total * 25).toLocaleString('vi-VN')} Kg
                      </Text>
                    </Table.Summary.Cell>
                  )}
                </Table.Summary.Row>);
              }}
            />
          </Card>
        </>
      )}

      {/* Generic Import Preview */}
      {importType !== 'order' && genericData.length > 0 && (
        <Card title={`📋 Xem trước dữ liệu (${genericData.length} dòng)`} style={{ borderRadius: 12 }}>
          <Alert type="info" showIcon style={{ marginBottom: 16 }}
            message="Kiểm tra dữ liệu trước khi import. Các cột sẽ được tự động map sang hệ thống." />
          <Table dataSource={genericData} columns={genericColumns} rowKey="_key"
            size="small" scroll={{ x: true }} pagination={{ pageSize: 20 }} bordered />
        </Card>
      )}

      {/* Empty state */}
      {totalRows === 0 && (
        <Card style={{ borderRadius: 12, textAlign: 'center', padding: 60 }}>
          <FileExcelOutlined style={{ fontSize: 64, color: '#ccc', marginBottom: 16 }} />
          <div><Text type="secondary" style={{ fontSize: 16 }}>
            {importType === 'order'
              ? 'Upload file "Kế hoạch cám tuần" (.xlsx) để import đặt hàng'
              : 'Chọn loại import và upload file Excel để bắt đầu'}
          </Text></div>
        </Card>
      )}
    </div>
  );
}

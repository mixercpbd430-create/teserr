# -*- coding: utf-8 -*-
"""
Sync SQLite → Neon PostgreSQL (via API)
========================================
Đọc dữ liệu từ database_new.db và gửi lên https://teserr.onrender.com/api
"""

import sqlite3
import json
import sys
import os
import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

SQLITE_PATH = r"D:\BackendFrontend\B7KHSX\database_new.db"
API = "https://teserr.onrender.com/api"
BATCH_SIZE = 100  # records per request

def log(msg):
    print(f"  {msg}")

def api_post(url, data, timeout=120):
    try:
        resp = requests.post(url, json=data, timeout=timeout, verify=False)
        try:
            j = resp.json()
            return resp.status_code, j.get('message', str(j)[:200])
        except:
            return resp.status_code, resp.text[:200]
    except Exception as e:
        return 0, str(e)[:200]

def read_sqlite(query):
    conn = sqlite3.connect(SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(query)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows

# ========== SYNC FUNCTIONS ==========

def sync_products():
    """SanPham → /api/import/product"""
    print("\n📦 [1/7] Sync SanPham (Products)...")
    rows = read_sqlite("""
        SELECT [Code cám] as codeCam, [Tên cám] as tenCam, 
               [Dạng ép viên] as dangEpVien, [Kích cỡ ép viên] as kichCoEpVien,
               [Batch size] as batchSize
        FROM SanPham WHERE ([Đã xóa] = 0 OR [Đã xóa] IS NULL)
    """)
    log(f"Đọc {len(rows)} sản phẩm từ SQLite")
    
    items = []
    for r in rows:
        code = str(r.get('codeCam') or '').strip()
        if not code or code == 'Test':
            continue
        items.append({
            "codeCam": code,
            "tenCam": str(r.get('tenCam') or code),
            "dangEpVien": str(r.get('dangEpVien') or ''),
            "kichCoEpVien": str(r.get('kichCoEpVien') or ''),
            "batchSize": float(r.get('batchSize') or 0) if r.get('batchSize') else None,
            "vatNuoi": "",
        })
    
    total = 0
    for i in range(0, len(items), BATCH_SIZE):
        batch = items[i:i+BATCH_SIZE]
        code, resp = api_post(f"{API}/import/product", batch)
        total += len(batch)
        log(f"  Batch {i//BATCH_SIZE+1}: HTTP {code} - {resp[:80]}")
    
    log(f"✅ Sent {total} products")
    return total


def sync_orders():
    """Sale → /api/import/order"""
    print("\n💰 [2/7] Sync Sale (Orders)...")
    rows = read_sqlite("""
        SELECT s.[ID sản phẩm] as idSanPham, s.[Số lượng] as soLuong,
               s.[Ngày sale] as ngaySale, s.[Mã sale] as maSale, 
               s.[Ghi chú] as ghiChu, s.[Khách vãng lai] as khachVangLai
        FROM Sale s
        WHERE s.[ID sản phẩm] IS NOT NULL AND s.[Số lượng] > 0
        ORDER BY s.[Ngày sale]
    """)
    log(f"Đọc {len(rows)} sale records từ SQLite")
    
    total = 0
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i:i+BATCH_SIZE]
        items = [{
            "idSanPham": r['idSanPham'],
            "soLuong": float(r['soLuong'] or 0),
            "ngayLay": r.get('ngaySale') or '',
            "ghiChu": r.get('ghiChu') or 'Sync SQLite',
            "loaiDatHang": "Sale hàng ngày",
        } for r in batch]
        
        payload = {
            "loaiDatHang": "Sale hàng ngày",
            "maDatHang": f"SYNC_{batch[0].get('maSale','SL')}",
            "items": items,
        }
        code, resp = api_post(f"{API}/import/order", payload)
        total += len(items)
        log(f"  Batch {i//BATCH_SIZE+1}: HTTP {code} ({len(items)} items)")
    
    log(f"✅ Sent {total} sale records")
    return total


def sync_packing():
    """Packing → /api/import/packing-bulk"""
    print("\n📦 [3/7] Sync Packing...")
    rows = read_sqlite("""
        SELECT p.[ID sản phẩm] as idSanPham, p.[Số lượng] as soLuong,
               p.[Ngày packing] as ngayPacking, p.[Ghi chú] as ghiChu
        FROM Packing p
        WHERE p.[ID sản phẩm] IS NOT NULL AND p.[Số lượng] > 0
        ORDER BY p.[Ngày packing]
    """)
    log(f"Đọc {len(rows)} packing records từ SQLite")
    
    total = 0
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i:i+BATCH_SIZE]
        items = [{
            "ngayDongBao": f"{r.get('ngayPacking') or '2025-12-01'}T00:00:00Z",
            "idSanPham": r['idSanPham'],
            "soLuongTan": float(r['soLuong'] or 0) / 1000.0,
            "kichCoBaoKg": 25,
            "soBao": None,
            "lineDongBao": "L1",
            "ghiChu": r.get('ghiChu') or 'Sync SQLite',
        } for r in batch]
        
        payload = {"items": items}
        code, resp = api_post(f"{API}/import/packing-bulk", payload)
        total += len(items)
        log(f"  Batch {i//BATCH_SIZE+1}: HTTP {code} ({len(items)} items)")
    
    log(f"✅ Sent {total} packing records")
    return total


def sync_stock():
    """StockHomNay → /api/import/stock-history (INSERT mode)"""
    print("\n📊 [4/7] Sync StockHomNay...")
    rows = read_sqlite("""
        SELECT s.[ID sản phẩm] as idSanPham, s.[Số lượng] as soLuong,
               s.[Ngày cập nhật] as ngayCapNhat, s.[Ghi chú] as ghiChu
        FROM StockHomNay s
        WHERE s.[Đã xóa] = 0 AND s.[ID sản phẩm] IS NOT NULL AND s.[Số lượng] > 0
        ORDER BY s.[Ngày cập nhật]
    """)
    log(f"Đọc {len(rows)} stock records từ SQLite")
    
    # Group by date
    by_date = {}
    for r in rows:
        date = r.get('ngayCapNhat') or '2025-12-01'
        if date not in by_date:
            by_date[date] = []
        by_date[date].append(r)
    
    total = 0
    for date, date_rows in by_date.items():
        items = [{
            "idSanPham": r['idSanPham'],
            "soLuong": float(r['soLuong'] or 0),
            "ghiChu": r.get('ghiChu') or 'Sync SQLite',
        } for r in date_rows]
        
        payload = {"ngayCapNhat": date, "items": items}
        code, resp = api_post(f"{API}/import/stock-history", payload)
        total += len(items)
    
    log(f"✅ Sent {total} stock records ({len(by_date)} dates)")
    return total


def sync_plan():
    """Plan → /api/import/plan"""
    print("\n📋 [5/7] Sync Plan...")
    rows = read_sqlite("""
        SELECT p.[ID sản phẩm] as idSanPham, p.[Số lượng] as soLuong,
               p.[Ngày plan] as ngayPlan, p.[Mã plan] as maPlan, p.[Ghi chú] as ghiChu
        FROM Plan p
        WHERE p.[ID sản phẩm] IS NOT NULL AND p.[Số lượng] > 0
        ORDER BY p.[Ngày plan]
    """)
    log(f"Đọc {len(rows)} plan records từ SQLite")
    
    total = 0
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i:i+BATCH_SIZE]
        items = [{
            "idSanPham": r['idSanPham'],
            "soLuong": float(r['soLuong'] or 0),
            "ghiChu": r.get('ghiChu') or 'Sync SQLite',
        } for r in batch]
        
        payload = {
            "ngayPlan": batch[0].get('ngayPlan') or '2025-12-01',
            "maPlan": batch[0].get('maPlan') or f"SYNC_PLAN_{i}",
            "items": items,
        }
        code, resp = api_post(f"{API}/import/plan", payload)
        total += len(items)
        log(f"  Batch {i//BATCH_SIZE+1}: HTTP {code} ({len(items)} items)")
    
    log(f"✅ Sent {total} plan records")
    return total


def sync_pellet():
    """PelletCapacity → /api/import/pellet"""
    print("\n⚙️ [6/7] Sync PelletCapacity...")
    rows = read_sqlite("""
        SELECT pc.[Ngày] as ngay, pc.[Số máy] as soMay, pc.[Code cám] as codeCam,
               pc.[ID sản phẩm] as idSanPham, pc.[T/h] as congSuat,
               pc.[Kwh/T] as kwhT
        FROM PelletCapacity pc
        WHERE pc.[ID sản phẩm] IS NOT NULL
        ORDER BY pc.[Ngày]
    """)
    log(f"Đọc {len(rows)} pellet records từ SQLite")
    
    # Group by date
    by_date = {}
    for r in rows:
        date = r.get('ngay') or '2025-12-01'
        if date not in by_date:
            by_date[date] = []
        by_date[date].append(r)
    
    total = 0
    for date, date_rows in by_date.items():
        items = [{
            "idSanPham": r['idSanPham'],
            "soLuong": 0,
            "soMay": r.get('soMay') or 'PL1',
            "congSuatMay": float(r.get('congSuat') or 0),
            "thoiGianChayGio": None,
            "ghiChu": f"KwhT:{r.get('kwhT', '')} Code:{r.get('codeCam', '')}",
        } for r in date_rows]
        
        payload = {
            "ngaySanXuat": f"{date}T00:00:00Z",
            "items": items,
        }
        code, resp = api_post(f"{API}/import/pellet", payload)
        total += len(items)
    
    log(f"✅ Sent {total} pellet records ({len(by_date)} dates)")
    return total


def sync_stock_old():
    """StockOld → /api/import/stock-history"""
    print("\n📈 [7/7] Sync StockOld (Historical)...")
    rows = read_sqlite("""
        SELECT s.[ID sản phẩm] as idSanPham, s.[Số lượng] as soLuong,
               s.[Ngày stock old] as ngayStock, s.[Ghi chú] as ghiChu
        FROM StockOld s
        WHERE s.[ID sản phẩm] IS NOT NULL AND s.[Số lượng] > 0
        ORDER BY s.[Ngày stock old]
    """)
    log(f"Đọc {len(rows)} stock old records từ SQLite")
    
    by_date = {}
    for r in rows:
        date = r.get('ngayStock') or '2025-12-01'
        if date not in by_date:
            by_date[date] = []
        by_date[date].append(r)
    
    total = 0
    count = 0
    for date, date_rows in by_date.items():
        items = [{
            "idSanPham": r['idSanPham'],
            "soLuong": float(r['soLuong'] or 0),
            "ghiChu": r.get('ghiChu') or 'Sync StockOld',
        } for r in date_rows]
        
        payload = {"ngayCapNhat": date, "items": items}
        code, resp = api_post(f"{API}/import/stock-history", payload)
        total += len(items)
        count += 1
        if count % 20 == 0:
            log(f"  Progress: {count}/{len(by_date)} dates ({total} records)")
    
    log(f"✅ Sent {total} stock old records ({len(by_date)} dates)")
    return total


# ========== MAIN ==========

def main():
    print()
    print("=" * 60)
    print("  SYNC SQLite → Neon PostgreSQL")
    print("=" * 60)
    print(f"  SQLite: {SQLITE_PATH}")
    print(f"  API:    {API}")
    print("=" * 60)
    
    if not os.path.exists(SQLITE_PATH):
        print(f"\n❌ File không tồn tại: {SQLITE_PATH}")
        return
    
    results = {}
    
    # 1. Products FIRST (other tables reference products by ID)
    results['Products'] = sync_products()
    
    # 2. Orders/Sale
    results['Sale'] = sync_orders()
    
    # 3. Packing
    results['Packing'] = sync_packing()
    
    # 4. Stock
    results['Stock'] = sync_stock()
    
    # 5. Plan
    results['Plan'] = sync_plan()
    
    # 6. Pellet
    results['Pellet'] = sync_pellet()
    
    # 7. Stock Old (historical)
    results['StockOld'] = sync_stock_old()
    
    # Summary
    print()
    print("=" * 60)
    print("  KẾT QUẢ SYNC")
    print("=" * 60)
    total = 0
    for name, count in results.items():
        print(f"  {name:15s}: {count:>6,} records")
        total += count
    print(f"  {'TOTAL':15s}: {total:>6,} records")
    print("=" * 60)
    print()


if __name__ == "__main__":
    main()

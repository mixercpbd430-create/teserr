import sqlite3
conn = sqlite3.connect(r'D:\BackendFrontend\B7KHSX\database_new.db')
cur = conn.cursor()
cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = cur.fetchall()
print('=== TABLES ===')
for t in tables:
    name = t[0]
    cur.execute(f'SELECT COUNT(*) FROM [{name}]')
    count = cur.fetchone()[0]
    cur.execute(f'PRAGMA table_info([{name}])')
    cols = [c[1] for c in cur.fetchall()]
    print(f'  {name} ({count} rows): {cols[:10]}')
    if count > 0:
        cur.execute(f'SELECT * FROM [{name}] LIMIT 2')
        for row in cur.fetchall():
            print(f'    Sample: {row[:8]}')
conn.close()

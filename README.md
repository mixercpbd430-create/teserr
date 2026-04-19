# B7KHSX — Kế Hoạch Sản Xuất

Hệ thống quản lý kế hoạch sản xuất (Production Planning System).

## Tech Stack

| Layer     | Technology                         |
|-----------|-----------------------------------|
| Frontend  | React 19 + TypeScript + Vite + Ant Design |
| Backend   | .NET 8 Web API + Entity Framework Core |
| Database  | PostgreSQL (Neon)                  |
| Hosting   | Render.com (Docker)                |

## Development

### Prerequisites
- Node.js 20+
- .NET 8 SDK
- PostgreSQL (or use Neon cloud)

### Run locally

**Backend:**
```bash
cd backend/B7KHSX.Api
dotnet run
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Deployment

Deployed automatically via Render.com on push to `main`.

## Environment Variables (Render)

| Variable | Description |
|----------|------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_KEY` | JWT signing key |
| `ASPNETCORE_ENVIRONMENT` | `Production` |

# ============================================
# Stage 1: Build React Frontend
# ============================================
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ============================================
# Stage 2: Build .NET Backend
# ============================================
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS backend-build
WORKDIR /src
COPY backend/B7KHSX.Api/B7KHSX.Api.csproj ./
RUN dotnet restore
COPY backend/B7KHSX.Api/ ./
RUN dotnet publish -c Release -o /publish --no-restore

# ============================================
# Stage 3: Production Runtime
# ============================================
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine
WORKDIR /app

# Copy published .NET app
COPY --from=backend-build /publish ./

# Copy React build output into wwwroot
COPY --from=frontend-build /app/frontend/dist ./wwwroot

# Render uses port 10000 by default
ENV ASPNETCORE_URLS=http://+:10000
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 10000
ENTRYPOINT ["dotnet", "B7KHSX.Api.dll"]

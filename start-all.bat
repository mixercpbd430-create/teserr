@echo off
title B7KHSX - Start All Services
echo.
echo ================================================
echo      B7KHSX - Production Planning System
echo      Starting Backend + Frontend...
echo ================================================
echo.

:: Start Backend in a new window
echo [1/2] Starting Backend (.NET API - port 5052)...
start "B7KHSX Backend" cmd /k "cd /d %~dp0backend\B7KHSX.Api && dotnet run --urls=http://localhost:5052"

:: Wait a moment for backend to start
echo      Waiting 3 seconds for backend to initialize...
timeout /t 3 /nobreak >nul

:: Start Frontend in a new window
echo [2/2] Starting Frontend (Vite React - port 5173)...
start "B7KHSX Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ================================================
echo   All services started!
echo.
echo   Backend API:  http://localhost:5052
echo   Swagger:      http://localhost:5052/swagger
echo   Frontend:     http://localhost:5173
echo ================================================
echo.
echo   Press any key to close this launcher window.
echo   (Backend and Frontend will keep running)
pause >nul

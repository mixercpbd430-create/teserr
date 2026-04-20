@echo off
title B7KHSX - Stop All Services
echo.
echo ================================================
echo      B7KHSX - Stopping All Services...
echo ================================================
echo.

echo [1/2] Stopping Backend (dotnet)...
taskkill /f /im dotnet.exe 2>nul
if %errorlevel%==0 (echo       Done.) else (echo       No dotnet process found.)

echo [2/2] Stopping Frontend (node)...
taskkill /f /im node.exe 2>nul
if %errorlevel%==0 (echo       Done.) else (echo       No node process found.)

echo.
echo   All services stopped!
echo.
pause

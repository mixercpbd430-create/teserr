@echo off
title B7KHSX - Backend API
echo.
echo ================================================
echo      B7KHSX - Backend API (.NET 8)
echo      Port: 5052
echo ================================================
echo.
echo   API:     http://localhost:5052
echo   Swagger: http://localhost:5052/swagger
echo.

cd /d %~dp0backend\B7KHSX.Api
dotnet run --urls=http://localhost:5052
pause

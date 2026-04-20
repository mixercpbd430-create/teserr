@echo off
title B7KHSX - Frontend React
echo.
echo ================================================
echo      B7KHSX - Frontend (Vite + React)
echo      Port: 5173
echo ================================================
echo.
echo   Frontend: http://localhost:5173
echo   API URL:  http://localhost:5052/api
echo.

cd /d %~dp0frontend
npm run dev
pause

@echo off
chcp 65001 >nul
set PYTHONIOENCODING=utf-8
title Email Scanner - Stock and Bao bi
echo.
echo ================================================
echo   Email Scanner - Quet Stock va Bao bi tu Outlook
echo ================================================
echo.

:: Check Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python chua duoc cai dat!
    echo   Tai Python tai: https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

:: Install dependencies if needed
echo [1/3] Kiem tra thu vien Python...
pip install -q pywin32 openpyxl requests 2>nul

:: Run scanner
echo [2/3] Bat dau quet email...
echo.
python "%~dp0tools\email_scanner.py"

echo.
echo [3/3] Hoan tat!
echo.
pause

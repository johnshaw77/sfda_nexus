@echo off
setlocal enabledelayedexpansion

REM SFDA Nexus 開發環境啟動腳本 (Windows)
REM 同時啟動 frontend 和 backend 的開發模式

echo ===== SFDA Nexus 開發環境啟動 =====
echo 時間: %date% %time%
echo.

REM 取得腳本所在目錄
set "SCRIPT_DIR=%~dp0"
set "FRONTEND_DIR=%SCRIPT_DIR%frontend"
set "BACKEND_DIR=%SCRIPT_DIR%backend"

REM 檢查目錄是否存在
if not exist "%FRONTEND_DIR%" (
    echo [錯誤] Frontend 目錄不存在: %FRONTEND_DIR%
    pause
    exit /b 1
)

if not exist "%BACKEND_DIR%" (
    echo [錯誤] Backend 目錄不存在: %BACKEND_DIR%
    pause
    exit /b 1
)

if not exist "%FRONTEND_DIR%\package.json" (
    echo [錯誤] Frontend package.json 不存在
    pause
    exit /b 1
)

if not exist "%BACKEND_DIR%\package.json" (
    echo [錯誤] Backend package.json 不存在
    pause
    exit /b 1
)

echo [信息] 正在啟動 Backend 服務...
cd /d "%BACKEND_DIR%"
start "SFDA Backend" cmd /k "npm run dev"

REM 等待 Backend 啟動
timeout /t 3 /nobreak >nul

echo [信息] 正在啟動 Frontend 服務...
cd /d "%FRONTEND_DIR%"
start "SFDA Frontend" cmd /k "npm run dev"

echo.
echo ===== 所有開發服務已啟動 =====
echo.
echo 服務地址:
echo   - Frontend: http://localhost:5173
echo   - Backend:  http://localhost:3000
echo.
echo [信息] 兩個新的命令提示字元視窗已開啟
echo [信息] 關閉那些視窗即可停止對應的服務
echo.
echo 按任意鍵關閉此視窗...
pause >nul

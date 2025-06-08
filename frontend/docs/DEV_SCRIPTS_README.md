# SFDA Nexus 開發腳本使用指南

這個目錄包含了多個開發環境啟動腳本，可以同時啟動 frontend 和 backend 的開發模式。

## 🚀 快速開始

### 🌟 推薦方式 (所有平台)

```bash
node start-dev.js
```

## 📋 各平台支援的啟動方式

### 🖥️ Windows 用戶

#### 方式 1: Node.js 腳本 (推薦)

```cmd
# 命令提示字元或 PowerShell
node start-dev.js
```

#### 方式 2: PowerShell 腳本

```powershell
# PowerShell (管理員權限可能需要)
.\start-dev.ps1
```

#### 方式 3: 批次檔案

```cmd
# 命令提示字元
start-dev.bat
```

### 🍎 macOS / 🐧 Linux 用戶

#### 方式 1: Node.js 腳本 (推薦)

```bash
node start-dev.js
```

#### 方式 2: Shell 腳本

```bash
./start-dev.sh
```

## 服務地址

啟動後可以訪問以下地址：

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000

## 其他可用的管理腳本

### 平台檢測

```bash
# 檢測您的平台並獲得啟動建議
node platform-check.js
```

### 安裝依賴

```bash
# 安裝 Frontend 依賴
cd frontend && npm install

# 安裝 Backend 依賴
cd backend && npm install

# 安裝所有依賴 (一次性)
cd frontend && npm install && cd ../backend && npm install
```

### 清理專案

```bash
# Unix/Linux/macOS - 清理 Frontend
cd frontend && rm -rf node_modules package-lock.json

# Unix/Linux/macOS - 清理 Backend
cd backend && rm -rf node_modules package-lock.json

# Windows - 清理 Frontend
cd frontend && if exist node_modules rmdir /s /q node_modules && if exist package-lock.json del package-lock.json

# Windows - 清理 Backend
cd backend && if exist node_modules rmdir /s /q node_modules && if exist package-lock.json del package-lock.json
```

### 建置專案

```bash
# 建置 Frontend
cd frontend && npm run build
```

### 執行測試

```bash
# 執行 Backend 測試
cd backend && npm test
```

## 停止服務

在任何啟動方式中，都可以使用 `Ctrl+C` 來停止所有服務。

## 故障排除

### 1. 埠號衝突

如果遇到埠號衝突，請檢查是否有其他服務佔用了：

- 3000 (Backend)
- 5173 (Frontend)

### 2. 依賴問題

如果遇到依賴相關問題，可以嘗試：

```bash
# 清理並重新安裝 Frontend
cd frontend && rm -rf node_modules package-lock.json && npm install

# 清理並重新安裝 Backend
cd backend && rm -rf node_modules package-lock.json && npm install
```

### 3. 權限問題

#### Unix/Linux/macOS

如果 shell 腳本無法執行，請確保有執行權限：

```bash
chmod +x start-dev.sh
```

#### Windows

如果 PowerShell 腳本無法執行，可能需要調整執行策略：

```powershell
# 以管理員身份執行 PowerShell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine

# 或者暫時繞過
powershell -ExecutionPolicy Bypass -File start-dev.ps1
```

## 📂 可用檔案說明

| 檔案                | 平台支援                 | 描述                                       |
| ------------------- | ------------------------ | ------------------------------------------ |
| `start-dev.js`      | ✅ Windows, macOS, Linux | Node.js 腳本，跨平台支援最佳，無需額外依賴 |
| `start-dev.sh`      | ✅ macOS, Linux          | Bash shell 腳本                            |
| `start-dev.bat`     | ✅ Windows               | Windows 批次檔案                           |
| `start-dev.ps1`     | ✅ Windows               | PowerShell 腳本                            |
| `platform-check.js` | ✅ Windows, macOS, Linux | 平台檢測和建議腳本                         |

## 🛠️ 腳本特點比較

### start-dev.js (Node.js 版本) ⭐ 推薦

- ✅ 跨平台相容性最佳 (Windows, macOS, Linux)
- ✅ 彩色日誌輸出
- ✅ 完整的錯誤處理
- ✅ 優雅的進程管理
- ✅ Windows 特殊處理
- ✅ 無需額外依賴

### start-dev.sh (Shell 版本)

- ✅ 輕量級
- ✅ 原生 shell 支援
- ✅ 簡單直接
- ✅ 無需額外依賴
- ❌ 僅限 Unix 系統 (macOS, Linux)

### start-dev.bat (Windows 批次檔案)

- ✅ Windows 原生支援
- ✅ 無需額外依賴
- ✅ 簡單易用
- ❌ 僅限 Windows

### start-dev.ps1 (PowerShell 版本)

- ✅ Windows 現代化支援
- ✅ 豐富的功能
- ✅ 彩色輸出
- ✅ 詳細的錯誤處理
- ✅ 無需額外依賴
- ❌ 主要針對 Windows (雖然 PowerShell Core 跨平台)

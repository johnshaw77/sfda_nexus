# WebSocket 調試功能說明

## 概述

為了解決後端 WebSocket 調試訊息過多的問題，我們實現了智能日誌過濾系統。該系統可以根據消息類型和調試模式來決定是否記錄日誌。

## 調試模式

### 簡潔模式 (WS_DEBUG=false)

- **預設模式**，適合生產環境
- 只記錄重要的 WebSocket 消息：
  - `auth` - 用戶認證
  - `realtime_chat` - 實時聊天消息
  - `error` - 錯誤消息
- 過濾掉頻繁的狀態消息：
  - `ping/pong` - 心跳消息
  - `typing_status` - 輸入狀態
  - `conversation_status` - 對話狀態
  - 房間加入/離開操作

### 詳細模式 (WS_DEBUG=true)

- 開發調試模式
- 記錄所有 WebSocket 消息和操作
- 包括所有房間操作和狀態變更
- 適合開發和問題排查時使用

## 使用方法

### 1. 快速切換調試模式

```bash
# 切換調試模式（在 true/false 之間切換）
node database/scripts/toggle_websocket_debug.js toggle

# 或使用簡寫
node database/scripts/toggle_websocket_debug.js t
```

### 2. 查看當前設置

```bash
# 查看當前調試設置
node database/scripts/toggle_websocket_debug.js status

# 或使用簡寫
node database/scripts/toggle_websocket_debug.js s
```

### 3. 直接設置模式

```bash
# 啟用詳細調試
node database/scripts/toggle_websocket_debug.js on

# 啟用簡潔模式
node database/scripts/toggle_websocket_debug.js off
```

### 4. 測試調試級別

```bash
# 測試不同調試級別的效果
node database/scripts/test_websocket_debug_levels.js
```

## 環境變數配置

在 `backend/.env` 文件中：

```env
# WebSocket 調試配置
WS_DEBUG=false  # 簡潔模式
# WS_DEBUG=true   # 詳細模式
```

## 自動調試模式判斷

系統會自動根據以下條件啟用詳細調試：

- `WS_DEBUG=true` 明確設置
- `NODE_ENV=development` 開發環境

## 消息分類

### 重要消息（總是記錄）

- `auth` - 用戶認證
- `realtime_chat` - 實時聊天
- `error` - 錯誤消息

### 安靜消息（僅詳細模式記錄）

- `ping` - 心跳請求
- `pong` - 心跳回應
- `typing_status` - 輸入狀態
- `conversation_status` - 對話狀態

### 其他消息（根據調試模式決定）

- `join_room` - 加入房間
- `leave_room` - 離開房間
- 其他業務消息

## 實際效果

### 簡潔模式輸出範例

```
15:30:52 info: 新的WebSocket連接 { clientId: 'client_xxx', ip: '::1' }
15:30:52 debug: 收到WebSocket消息 { clientId: 'client_xxx', type: 'auth' }
15:30:52 info: 用戶認證成功 { userId: 1, username: 'test' }
15:30:52 debug: 收到WebSocket消息 { clientId: 'client_xxx', type: 'realtime_chat' }
```

### 詳細模式輸出範例

```
15:30:52 info: 新的WebSocket連接 { clientId: 'client_xxx', ip: '::1' }
15:30:52 debug: 收到WebSocket消息 { clientId: 'client_xxx', type: 'auth' }
15:30:52 info: 用戶認證成功 { userId: 1, username: 'test' }
15:30:52 debug: 客戶端加入房間 { clientId: 'client_xxx', roomId: 'conversation_1' }
15:30:52 debug: 收到WebSocket消息 { clientId: 'client_xxx', type: 'ping' }
15:30:52 debug: 收到WebSocket消息 { clientId: 'client_xxx', type: 'typing_status' }
15:30:52 debug: 收到WebSocket消息 { clientId: 'client_xxx', type: 'realtime_chat' }
15:30:52 debug: 客戶端離開房間 { clientId: 'client_xxx', roomId: 'conversation_1' }
```

## 注意事項

1. **重啟服務**：修改 `WS_DEBUG` 設置後需要重啟後端服務才能生效
2. **性能影響**：詳細模式會產生更多日誌，可能影響性能
3. **日誌文件**：所有日誌都會寫入到 `backend/logs/` 目錄下的相應文件
4. **生產環境**：建議在生產環境使用簡潔模式以減少日誌量

## 故障排除

如果遇到問題：

1. 檢查 `.env` 文件中的 `WS_DEBUG` 設置
2. 確認後端服務已重啟
3. 使用測試腳本驗證配置是否生效
4. 檢查 `backend/logs/` 目錄下的日誌文件

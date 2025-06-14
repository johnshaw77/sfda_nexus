# WebSocket 調試優化總結

## 問題描述

原本的 WebSocket 實現會產生大量重複的調試訊息，包括：

- 頻繁的心跳消息 (`ping/pong`)
- 客戶端房間操作 (`加入房間/離開房間`)
- 輸入狀態和對話狀態更新
- 其他非關鍵的狀態消息

這些訊息對於實際的 debug 工作幫助不大，反而會淹沒重要的錯誤和業務邏輯訊息。

## 解決方案

### 1. 智能日誌過濾系統

實現了基於消息類型的智能日誌過濾：

```javascript
// WebSocket 調試配置
const WS_DEBUG = {
  // 是否啟用詳細調試（可通過環境變數控制）
  VERBOSE:
    process.env.WS_DEBUG === "true" || process.env.NODE_ENV === "development",
  // 需要記錄的消息類型（重要操作）
  IMPORTANT_TYPES: ["auth", "realtime_chat", "error"],
  // 心跳和狀態消息（通常不需要記錄）
  QUIET_TYPES: ["ping", "pong", "typing_status", "conversation_status"],
};
```

### 2. 消息分類策略

- **重要消息**：總是記錄，包括認證、聊天、錯誤
- **安靜消息**：只在詳細模式下記錄，包括心跳、狀態更新
- **其他消息**：根據調試模式決定是否記錄

### 3. 環境變數控制

新增 `WS_DEBUG` 環境變數：

- `WS_DEBUG=false`：簡潔模式（預設）
- `WS_DEBUG=true`：詳細模式

### 4. 自動模式判斷

系統會自動根據環境啟用適當的調試模式：

- 開發環境 (`NODE_ENV=development`)：自動啟用詳細模式
- 生產環境：使用 `WS_DEBUG` 設置

## 實現的功能

### 1. 調試模式切換工具

```bash
# 快速切換調試模式
node database/scripts/toggle_websocket_debug.js toggle

# 查看當前設置
node database/scripts/toggle_websocket_debug.js status

# 直接設置
node database/scripts/toggle_websocket_debug.js on/off
```

### 2. 調試級別測試工具

```bash
# 測試不同調試級別的效果
node database/scripts/test_websocket_debug_levels.js
```

### 3. 智能日誌記錄函數

```javascript
const smartLog = (level, message, data = {}) => {
  const messageType = data.type;

  // 如果是重要消息類型，總是記錄
  if (WS_DEBUG.IMPORTANT_TYPES.includes(messageType)) {
    logger[level](message, data);
    return;
  }

  // 如果是安靜消息類型且未啟用詳細調試，則跳過
  if (WS_DEBUG.QUIET_TYPES.includes(messageType) && !WS_DEBUG.VERBOSE) {
    return;
  }

  // 其他情況根據詳細調試設置決定
  if (WS_DEBUG.VERBOSE) {
    logger[level](message, data);
  }
};
```

## 效果對比

### 優化前（所有消息都記錄）

```
15:30:52 debug: 收到WebSocket消息
15:30:52 debug: 客戶端離開房間
15:30:52 debug: 收到WebSocket消息
15:30:52 debug: 客戶端加入房間
15:30:52 debug: 收到API請求
15:30:52 debug: 用戶認證成功
15:30:52 info: API請求
15:30:52 debug: API請求完成
15:31:06 debug: 收到WebSocket消息
15:31:36 debug: 收到WebSocket消息
15:32:06 debug: 收到WebSocket消息
```

### 優化後（簡潔模式）

```
15:30:52 info: 新的WebSocket連接 { clientId: 'client_xxx' }
15:30:52 debug: 收到WebSocket消息 { type: 'auth' }
15:30:52 info: 用戶認證成功 { userId: 1 }
15:30:52 debug: 收到WebSocket消息 { type: 'realtime_chat' }
15:30:52 info: API請求 { method: 'POST', url: '/api/chat' }
```

## 配置文件

### backend/.env

```env
# WebSocket 調試配置
WS_DEBUG=false  # 簡潔模式（預設）
```

## 使用建議

### 開發環境

- 使用詳細模式 (`WS_DEBUG=true`) 進行完整的調試
- 或依賴自動判斷 (`NODE_ENV=development`)

### 生產環境

- 使用簡潔模式 (`WS_DEBUG=false`) 減少日誌量
- 只記錄關鍵的業務操作和錯誤

### 問題排查

- 臨時啟用詳細模式來獲取完整的操作記錄
- 使用切換工具快速調整調試級別

## 技術細節

### 修改的文件

- `backend/src/websocket/index.js` - 主要的 WebSocket 服務邏輯
- `backend/.env` - 環境變數配置
- `backend/database/scripts/toggle_websocket_debug.js` - 調試模式切換工具
- `backend/database/scripts/test_websocket_debug_levels.js` - 測試工具

### 向後兼容性

- 所有現有功能保持不變
- 只是調整了日誌輸出的策略
- 預設為簡潔模式，不會影響現有部署

## 總結

這次優化成功解決了 WebSocket 調試訊息過多的問題：

1. **減少噪音**：過濾掉不重要的重複訊息
2. **保留關鍵信息**：確保重要的業務操作和錯誤仍然被記錄
3. **靈活控制**：提供簡單的工具來切換調試模式
4. **環境適應**：根據運行環境自動選擇合適的調試級別

現在您可以享受更清潔的日誌輸出，同時在需要時仍能獲得完整的調試信息。

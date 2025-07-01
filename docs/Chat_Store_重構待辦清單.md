# Chat Store 重構待辦清單

## 📋 項目總覽

- **目標檔案**：`frontend/src/stores/chat.js` (2220 行)
- **目標**：拆分成 5 個可維護的 composable 檔案
- **預估時間**：3-4 週 (18 個任務)
- **原則**：零破壞性變更，保持所有功能不變

## 🎯 第一階段：準備和基礎拆分 (週 1)

### 任務 1.1：創建 useConversation.js

- [ ] **檔案**：`frontend/src/stores/composables/useConversation.js`
- [ ] **優先級**：🔴 高
- [ ] **預估時間**：6 小時
- [ ] **功能範圍**：

  ```javascript
  // 從 chat.js 遷移的函數 (約 600 行)
  -handleGetConversations -
    handleCreateConversation -
    handleSelectConversation -
    handleDeleteConversation -
    handleUpdateConversation -
    handleTogglePinConversation -
    handleSearchConversations -
    handleLoadMoreConversations -
    handleAddConversationToHistory -
    handleClearCurrentConversation -
    // 狀態管理
    conversations(ref) -
    currentConversation(ref) -
    conversationPagination(ref) -
    isLoading(ref);
  ```

- [ ] **驗收標準**：
  - 所有對話 CRUD 功能正常
  - 分頁和搜尋功能完整
  - WebSocket 房間管理正確
  - 對話列表排序（置頂邏輯）正常

### 任務 1.2：創建 useMessage.js

- [ ] **檔案**：`frontend/src/stores/composables/useMessage.js`
- [ ] **優先級**：🔴 高
- [ ] **預估時間**：6 小時
- [ ] **功能範圍**：

  ```javascript
  // 從 chat.js 遷移的函數 (約 500 行)
  -handleGetMessages -
    handleSendMessage -
    handleSendRealtimeMessage -
    handleAddMessage -
    handleUpdateMessage -
    handleLoadMoreMessages -
    sendMessage(公共介面) -
    // 狀態管理
    messages(ref) -
    messagePagination(ref) -
    isLoadingMessages(ref) -
    isSendingMessage(ref);
  ```

- [ ] **驗收標準**：
  - 消息載入和分頁正常
  - 消息發送功能完整
  - HTTP 和 WebSocket 發送都正常
  - 消息狀態更新正確

### 任務 1.3：基礎功能測試

- [ ] **檔案**：測試新創建的 composables
- [ ] **優先級**：🟡 中
- [ ] **預估時間**：3 小時
- [ ] **測試內容**：
  - 對話創建和選擇
  - 消息發送和接收
  - 分頁載入功能
  - 錯誤處理機制

## 🔧 第二階段：進階功能拆分 (週 2-3)

### 任務 2.1：創建 useStreaming.js

- [ ] **檔案**：`frontend/src/stores/composables/useStreaming.js`
- [ ] **優先級**：🔴 高
- [ ] **預估時間**：10 小時
- [ ] **功能範圍**：

  ```javascript
  // 從 chat.js 遷移的函數 (約 800 行)
  - sendMessageStream (完整串流邏輯)
  - stopCurrentStream
  - animateTyping (打字機動畫)
  - handleSSEEvent (12 種事件類型)

  // SSE 事件處理
  - user_message
  - assistant_message_created
  - stream_content
  - stream_done
  - conversation_updated
  - error
  - secondary_ai_* 系列事件

  // 狀態管理
  - isStreaming (ref)
  - streamController (ref)
  - streamingMessageId (ref)
  - aiTyping (ref)
  ```

- [ ] **驗收標準**：
  - 串流消息發送正常
  - 打字機動畫流暢
  - 所有 SSE 事件正確處理
  - 錯誤處理和恢復機制完整
  - 串流停止功能正常

### 任務 2.2：創建 useToolCall.js

- [ ] **檔案**：`frontend/src/stores/composables/useToolCall.js`
- [ ] **優先級**：🔴 高
- [ ] **預估時間**：8 小時
- [ ] **功能範圍**：

  ```javascript
  // 從 chat.js 遷移的函數 (約 400 行)
  - handleUpdateToolProgress
  - 工具調用 SSE 事件處理：
    * tool_calls_processed
    * thinking_content_processed
    * tool_processing_start
    * tool_processing_heartbeat
    * tool_processing_error
    * tool_result_section
    * ai_summary_start/delta/complete/error
    * mcp_tool_start/chunk/complete/error

  // 狀態管理
  - 工具調用進度狀態
  - MCP 工具流式處理狀態
  ```

- [ ] **驗收標準**：
  - 傳統工具調用流程完整
  - MCP 工具流式調用正常
  - 工具進度追蹤準確
  - AI 總結功能正常
  - 錯誤處理完善

### 任務 2.3：創建 useTextConversion.js

- [ ] **檔案**：`frontend/src/stores/composables/useTextConversion.js`
- [ ] **優先級**：🟡 中
- [ ] **預估時間**：4 小時
- [ ] **功能範圍**：

  ```javascript
  // 從 chat.js 遷移的函數 (約 150 行)
  -convertMessagesContent -
    setTextConversionMode -
    toggleTextConverter -
    getTextConverterInfo -
    // 狀態管理
    textConversionMode(ref) -
    isTextConverterEnabled(ref);
  ```

- [ ] **驗收標準**：
  - 繁簡轉換功能正常
  - 即時轉換應用正確
  - 串流內容轉換正常
  - 模式切換順暢

### 任務 2.4：輔助功能處理

- [ ] **檔案**：處理剩餘的輔助功能
- [ ] **優先級**：🟡 中
- [ ] **預估時間**：4 小時
- [ ] **功能範圍**：

  ```javascript
  // 模型和智能體管理
  -handleGetAvailableModels -
    handleGetAvailableAgents -
    // 狀態設置
    handleSetTypingStatus -
    handleSetAITypingStatus -
    handleInitializeChat -
    // 計算屬性
    hasConversations -
    hasMessages -
    currentConversationId;
  ```

## 🔄 第三階段：整合和重構 (週 3)

### 任務 3.1：重構主 chat.js

- [ ] **檔案**：`frontend/src/stores/chat.js` (重構)
- [ ] **優先級**：🔴 高
- [ ] **預估時間**：8 小時
- [ ] **目標**：從 2220 行減少到 < 200 行
- [ ] **重構內容**：

  ```javascript
  // 新的 chat.js 結構
  import { defineStore } from "pinia";
  import { useConversation } from "./composables/useConversation";
  import { useMessage } from "./composables/useMessage";
  import { useStreaming } from "./composables/useStreaming";
  import { useToolCall } from "./composables/useToolCall";
  import { useTextConversion } from "./composables/useTextConversion";

  export const useChatStore = defineStore("chat", () => {
    // 整合所有 composables
    const conversation = useConversation();
    const message = useMessage();
    const streaming = useStreaming();
    const toolCall = useToolCall();
    const textConversion = useTextConversion();

    // 提供統一的對外介面
    return {
      // 重新導出所有功能
      ...conversation,
      ...message,
      ...streaming,
      ...toolCall,
      ...textConversion,
    };
  });
  ```

- [ ] **驗收標準**：
  - 所有 composables 正確整合
  - 對外 API 介面保持 100% 不變
  - 所有現有功能正常運作
  - 檔案大小 < 200 行

### 任務 3.2：狀態同步測試

- [ ] **檔案**：測試各模組間的狀態同步
- [ ] **優先級**：🔴 高
- [ ] **預估時間**：6 小時
- [ ] **測試範圍**：
  - 對話切換時消息狀態同步
  - 串流時各模組狀態協調
  - 工具調用時狀態傳遞
  - 錯誤處理時狀態恢復

### 任務 3.3：效能驗證

- [ ] **檔案**：效能測試和驗證
- [ ] **優先級**：🟡 中
- [ ] **預估時間**：4 小時
- [ ] **測試內容**：
  - 載入速度對比（重構前後）
  - 記憶體使用對比
  - 串流動畫流暢度
  - 大量消息處理效能

## 🧹 第四階段：清理和優化 (週 4)

### 任務 4.1：代碼清理

- [ ] **檔案**：所有新創建的檔案
- [ ] **優先級**：🟡 中
- [ ] **預估時間**：3 小時
- [ ] **清理內容**：
  - 移除不必要的 console.log
  - 統一代碼格式
  - 完善 JSDoc 註釋
  - 移除未使用的導入

### 任務 4.2：文檔更新

- [ ] **檔案**：更新相關文檔
- [ ] **優先級**：🟡 中
- [ ] **預估時間**：2 小時
- [ ] **更新內容**：
  - 更新架構文檔
  - 添加 composables 使用說明
  - 更新開發指南

### 任務 4.3：最終測試

- [ ] **檔案**：全面功能測試
- [ ] **優先級**：🔴 高
- [ ] **預估時間**：4 小時
- [ ] **測試內容**：
  - 完整的用戶流程測試
  - 邊界情況測試
  - 錯誤恢復測試
  - 與其他模組的整合測試

## 📊 進度追蹤

### 完成狀態

- ⏳ 待開始：18 個任務
- 🔄 進行中：0 個任務
- ✅ 已完成：0 個任務

### 里程碑

1. **週 1 結束**：基礎 composables 完成
2. **週 2 結束**：進階功能 composables 完成
3. **週 3 結束**：主檔案重構完成
4. **週 4 結束**：清理和測試完成

### 風險監控

- **狀態同步問題**：各 composable 間的狀態共享
- **SSE 事件處理**：複雜的事件處理邏輯不能遺漏
- **工具調用流程**：MCP 工具的複雜生命週期
- **效能退化**：重構後不能影響原有效能

## 🎯 成功指標

- **檔案大小**：主檔案從 2220 行減少到 < 200 行
- **模組化**：5 個 composable，每個 < 500 行
- **功能完整**：100% 保持原有功能
- **效能穩定**：載入時間和記憶體使用不退化
- **開發體驗**：新功能開發更容易

---

**立即開始**：建議從任務 1.1 (useConversation.js) 開始！

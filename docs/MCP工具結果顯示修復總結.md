# MCP 工具結果顯示修復總結

## 問題描述

用戶反映 MCP 工具調用後的結果出現了，但是一閃即逝，最終變成空白或不顯示。

## 問題診斷

### 根本原因
1. **前端事件處理不完整**：`useStreaming.js` 中的 MCP 相關事件（`mcp_tool_start`、`mcp_tool_chunk`、`mcp_tool_complete`）只有簡單的 `console.log`，沒有實際的狀態處理邏輯
2. **後端缺少流式調用集成**：雖然後端有 MCP 流式調用的邏輯，但在正常聊天流程中沒有被使用
3. **數據結構不一致**：前端組件期望的數據結構與實際保存的數據結構不匹配

## 修復過程

### 1. 前端修復（`useStreaming.js`）

**修復前**：
```javascript
case "mcp_tool_start":
case "mcp_tool_chunk":
case "mcp_tool_complete":
  console.log(`處理事件: ${eventType}`, data);
  break;
```

**修復後**：
```javascript
case "mcp_tool_start":
  // 🚀 MCP 工具流式調用開始
  const mcpStartMessageIndex = messageState.messages.value.findIndex(
    (msg) => msg.id === data.assistant_message_id
  );
  if (mcpStartMessageIndex !== -1) {
    messageState.messages.value[mcpStartMessageIndex].mcpStreaming = true;
    messageState.messages.value[mcpStartMessageIndex].mcpToolName = data.toolName;
    messageState.messages.value[mcpStartMessageIndex].mcpStreamContent = "";
  }
  break;

case "mcp_tool_chunk":
  // 🚀 累積流式內容並更新進度
  // ...詳細實現

case "mcp_tool_complete":
  // 🚀 保存最終結果到 tool_results 和 metadata.tool_results
  // ...詳細實現
```

### 2. 後端流式調用集成（`mcpToolParser.service.js`）

在 `executeToolCalls` 方法中添加了對 MCP 流式調用的支持：

```javascript
// 🚀 檢查是否支持流式調用且有相應回調
const supportsStreaming = context.onMcpToolStart && context.onMcpToolChunk && context.onMcpToolComplete;

if (supportsStreaming) {
  // 使用流式調用
  await mcpClient.invokeToolStream(
    tool.id,
    toolCall.parameters,
    context,
    onChunk, onError, onComplete
  );
} else {
  // 使用普通調用（回退模式）
  const result = await mcpClient.invokeTool(tool.id, toolCall.parameters, context);
}
```

### 3. 聊天控制器回調集成（`chat.controller.js`）

在 `handleSendMessageStream` 中添加了 MCP 流式回調：

```javascript
// 🚀 新增：MCP 工具流式調用回調
onMcpToolStart: (toolName) => {
  if (isClientConnected) {
    sendSSE("mcp_tool_start", {
      assistant_message_id: assistantMessageId,
      toolName: toolName,
      conversation_id: conversationId,
    });
  }
},
onMcpToolChunk: (chunkData) => { /* ... */ },
onMcpToolComplete: (toolName, streamedContent) => { /* ... */ }
```

### 4. 數據結構改進

確保工具結果同時保存到多個位置，提高兼容性：

```javascript
// 保存到直接屬性
messageState.messages.value[index].tool_results.push(toolResult);
messageState.messages.value[index].has_tool_calls = true;

// 🔧 同時保存到 metadata 中（兼容性）
messageState.messages.value[index].metadata.tool_results.push(toolResult);
messageState.messages.value[index].metadata.has_tool_calls = true;
```

## 修復效果

1. **流式顯示**：MCP 工具調用時會顯示實時的流式進度，用戶可以看到數據逐步載入
2. **結果持久化**：工具結果不再一閃即逝，會正確保存並持續顯示
3. **進度指示**：提供視覺進度條和文字提示，改善用戶體驗
4. **錯誤處理**：流式調用失敗時自動回退到普通調用模式

## 技術架構

```
前端 useStreaming.js
    ↓ (SSE 事件)
後端 chat.controller.js
    ↓ (onMcpTool* 回調)
mcpToolParser.service.js
    ↓ (invokeToolStream)
mcp.service.js
    ↓ (HTTP SSE)
MCP 服務器 (port 8080)
```

## 測試建議

1. **流式顯示測試**：發送需要 MCP 工具調用的消息，觀察是否有流式進度顯示
2. **結果持久化測試**：確認工具結果在流式完成後仍然可見
3. **錯誤場景測試**：測試 MCP 服務不可用時的回退行為
4. **多工具調用測試**：測試同時調用多個 MCP 工具的情況

## 相關文件

- `frontend/src/composables/chat/useStreaming.js` - 前端 SSE 事件處理
- `backend/src/services/mcpToolParser.service.js` - 工具調用邏輯
- `backend/src/controllers/chat.controller.js` - 聊天控制器
- `backend/src/services/mcp.service.js` - MCP 客戶端
- `frontend/src/components/common/ToolCallDisplay.vue` - 工具結果顯示組件

## 後續優化

1. **性能優化**：考慮對大量數據的分塊策略優化
2. **用戶體驗**：添加暫停/跳過動畫的選項
3. **錯誤恢復**：改進錯誤場景下的用戶提示和恢復機制
4. **緩存機制**：對頻繁調用的工具結果進行緩存 
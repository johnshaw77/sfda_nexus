# 🧪 Qwen-Agent 前端測試指南 - 2025-06-11 準備作廢!!

## 快速驗證步驟

### 1. 基礎檢查 ✅

**步驟 1：訪問系統**

1. 打開瀏覽器訪問：http://localhost:5173
2. 使用帳號登入：`admin` / `admin123`

**步驟 2：檢查智能體列表**

1. 進入聊天頁面
2. 查看左側智能體選擇區域
3. 確認能看到 "Qwen 企業助理" 選項

### 2. 智能體選擇測試 ✅

**步驟 3：選擇 Qwen-Agent**

1. 點擊 "Qwen 企業助理"
2. 確認 URL 變為：`/chat/27` (或其他 ID)
3. 確認聊天界面顯示正確的智能體名稱

### 3. 基礎對話測試 ✅

**步驟 4：發送測試消息**
發送以下測試消息：

```
你好，請介紹一下你的功能
```

**預期結果：**

- 收到 Qwen-Agent 的回應
- 回應內容提到企業助理功能
- 沒有錯誤訊息

### 4. 工具調用測試 🔧

**步驟 5：測試 HR 工具**
發送以下消息：

```
請查詢員工資料
```

**預期結果：**

- 看到工具調用的 UI 組件
- 顯示 "工具調用 (1)" 標題
- 顯示 HR 相關的工具執行結果

**步驟 6：測試任務管理工具**
發送以下消息：

```
請幫我創建一個新任務
```

**預期結果：**

- 看到任務管理工具的調用
- 顯示結構化的任務數據

### 5. UI 組件測試 🎨

**步驟 7：檢查工具調用 UI**

1. 確認工具調用結果有美觀的卡片顯示
2. 點擊 "顯示詳情" 按鈕
3. 確認可以看到工具參數和元數據
4. 確認不同工具有不同的圖標和顏色

### 6. 錯誤處理測試 ⚠️

**步驟 8：測試錯誤情況**
發送以下消息：

```
請查詢不存在的員工 ID: 99999
```

**預期結果：**

- 看到錯誤狀態的工具調用 UI
- 顯示紅色的 "失敗" 標籤
- 顯示錯誤訊息

## 🔍 詳細驗證清單

### 資料庫驗證

- [ ] Qwen-Agent 存在於智能體列表
- [ ] 智能體 ID 為 27
- [ ] 顯示名稱為 "Qwen 企業助理"
- [ ] 關聯到 qwen3:32b 模型

### API 驗證

- [ ] 智能體選擇 API 正常
- [ ] 聊天 API 正常回應
- [ ] 工具調用 API 正常

### UI 驗證

- [ ] 智能體選擇器顯示正常
- [ ] 聊天界面切換正常
- [ ] 工具調用 UI 顯示正常
- [ ] 結構化數據顯示正常

### 功能驗證

- [ ] 基礎對話功能正常
- [ ] HR 工具調用正常
- [ ] 任務管理工具調用正常
- [ ] 財務工具調用正常
- [ ] 錯誤處理正常

## 🚨 常見問題排除

### 問題 1：看不到 Qwen 企業助理

**解決方案：**

1. 檢查後端服務是否運行：http://localhost:3000
2. 檢查資料庫中是否有 Qwen-Agent
3. 重新整理頁面

### 問題 2：工具調用失敗

**解決方案：**

1. 檢查 MCP Server 是否運行：http://localhost:8080
2. 檢查 Ollama 是否運行：http://localhost:11434
3. 檢查後端日誌

### 問題 3：UI 組件顯示異常

**解決方案：**

1. 檢查瀏覽器控制台錯誤
2. 確認前端服務正常運行
3. 清除瀏覽器快取

## 🎯 成功標準

如果以下所有項目都正常，則 Qwen-Agent 整合成功：

1. ✅ 能在智能體列表中看到 "Qwen 企業助理"
2. ✅ 能選擇並切換到 Qwen-Agent
3. ✅ 能進行基礎對話
4. ✅ 能看到工具調用的 UI 組件
5. ✅ 工具調用結果顯示正常
6. ✅ 錯誤處理正常

## 📊 測試報告模板

```
Qwen-Agent 整合測試報告
========================

測試時間：[填入時間]
測試人員：[填入姓名]

基礎功能：
- [ ] 智能體選擇：通過/失敗
- [ ] 基礎對話：通過/失敗
- [ ] 工具調用：通過/失敗
- [ ] UI 顯示：通過/失敗

詳細測試：
- [ ] HR 工具：通過/失敗
- [ ] 任務工具：通過/失敗
- [ ] 財務工具：通過/失敗
- [ ] 錯誤處理：通過/失敗

總體評價：成功/部分成功/失敗

備註：[填入問題或建議]
```

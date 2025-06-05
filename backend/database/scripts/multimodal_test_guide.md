# 🎯 多模態聊天功能測試指南

## 📋 修復內容總結

### ✅ 已修復的問題

1. **擴展多模態支持**

   - 原本只支持 Gemini 模型
   - 現在同時支持 **Ollama** 和 **Gemini** 模型

2. **清理孤立文件記錄**

   - 清理了 16 個資料庫中的無效文件記錄
   - 更新了 11 個訊息的附件引用
   - 確保資料庫和物理文件的一致性

3. **增強調試功能**

   - 添加詳細的文件上傳和處理日誌
   - 多模態格式轉換的調試信息
   - AI 回應內容的分析

4. **修復後端多模態處理**
   - **chat.controller.js**: 添加 Ollama 多模態支持
   - **ai.service.js**: 完善多模態消息處理
   - 支援兩種格式：
     - **Ollama**: OpenAI 兼容格式 (`image_url`)
     - **Gemini**: Google 原生格式 (`inline_data`)

---

## 🔧 測試前準備

### 1. 確保服務運行

```bash
# 啟動後端服務
cd backend
npm start

# 啟動前端服務
cd frontend
npm run dev
```

### 2. 檢查 Ollama 模型

```bash
# 檢查已安裝的模型
ollama list

# 拉取支持視覺的模型
ollama pull llava:latest
# 或
ollama pull qwen2-vl:latest
```

⚠️ **重要**: 基礎的 `gemma3` 和 `qwen3` 不支持圖片處理，需要使用 `llava` 或 `qwen2-vl` 等視覺模型。

---

## 🧪 測試步驟

### 步驟 1: 基本文件上傳測試

1. 打開前端聊天界面
2. 選擇支持視覺的模型（如 `llava:latest`）
3. 拖拽或點擊上傳一張圖片
4. 檢查是否出現預覽縮圖
5. 發送消息："請解釋這張圖片的內容"

### 步驟 2: 檢查後端日誌

在後端控制台中尋找以下關鍵日誌：

```
=== 處理消息附件 ===
消息ID: xxx
附件數量: 1
當前模型類型: ollama

處理附件: {id: xx, filename: "xxx.jpg", mime_type: "image/jpeg"}
=== 處理圖片附件 xx ===
圖片讀取成功，base64長度: xxxxx
已添加圖片到 Ollama 多模態內容

=== 轉換為多模態格式 (ollama) ===
圖片內容數量: 1
Ollama 多模態格式設置完成

=== OLLAMA 調用開始 ===
多模態內容: 是
=== 多模態消息詳情 ===
消息 1 (user):
  文字部分 1: "請解釋這張圖片的內容"
  圖片部分 2: data:image/jpeg;base64,/9j/4AAQS...

✅ AI 回應似乎包含對圖片的描述
```

### 步驟 3: 驗證 AI 回應

如果一切正常，AI 應該能：

- 看到並描述圖片內容
- 回應中包含具體的圖片描述
- 不會說「我看不到圖片」

---

## 🐛 常見問題排除

### 問題 1: AI 說看不到圖片

**檢查項目**:

- 後端日誌是否顯示「多模態內容: 是」
- 是否使用支持視覺的模型（llava, qwen2-vl）
- 圖片是否成功 base64 編碼

**解決方案**:

```bash
# 切換到支持視覺的模型
ollama pull llava:latest
```

### 問題 2: 文件上傳失敗

**檢查項目**:

- uploads/attachments 目錄權限
- 磁碟空間是否足夠
- 文件大小是否超過限制

**解決方案**:

```bash
# 確保目錄權限
chmod 755 uploads/attachments

# 檢查磁碟空間
df -h
```

### 問題 3: 圖片預覽顯示但AI無回應

**檢查項目**:

- 後端服務是否運行
- WebSocket 連接是否正常
- 模型服務是否可用

**解決方案**:

```bash
# 檢查 Ollama 服務
curl http://localhost:11434/api/tags

# 重啟服務
npm start
```

---

## 📊 測試腳本

運行以下腳本檢查系統狀態：

```bash
# 檢查文件上傳系統
node database/scripts/test_file_upload.js

# 檢查多模態功能
node database/scripts/test_multimodal.js

# 清理孤立文件（如需要）
node database/scripts/cleanup_orphaned_files.js
```

---

## 🎉 成功標識

**上傳成功**:

- ✅ 前端顯示圖片預覽縮圖
- ✅ 後端日誌顯示文件保存
- ✅ 資料庫中有文件記錄

**多模態成功**:

- ✅ 後端日誌顯示「多模態內容: 是」
- ✅ AI 能描述圖片具體內容
- ✅ 回應中包含圖片相關細節

---

## 📝 後續優化建議

1. **添加文件類型檢測**: 確保只有圖片文件使用多模態處理
2. **優化錯誤處理**: 更友好的錯誤提示
3. **添加進度條**: 文件上傳進度顯示
4. **批量上傳**: 支持多張圖片同時分析
5. **圖片壓縮**: 大圖片自動壓縮以節省帶寬

---

## 🔗 相關文件

- `backend/src/controllers/chat.controller.js` - 聊天控制器（多模態處理）
- `backend/src/services/ai.service.js` - AI 服務（格式轉換）
- `backend/src/controllers/files.controller.js` - 文件控制器（上傳處理）
- `frontend/src/views/chat/components/ChatArea.vue` - 聊天界面

---

**測試完成後，請向團隊報告測試結果！** 🚀

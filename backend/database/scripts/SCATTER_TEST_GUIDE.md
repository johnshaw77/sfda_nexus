# 散點圖生成測試指引

## 概述

本指引說明如何測試 SFDA Nexus 系統中的散點圖生成功能，包含自然語言詢問和 base64 圖片驗證。

## 測試環境準備

### 1. 確保服務運行

```bash
# 1. 啟動 MySQL 容器（如果尚未啟動）
docker start mysql-server

# 2. 啟動 SFDA 統計服務 (端口 8000)
cd ../../../sfda_stat
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# 3. 啟動 MCP 服務器 (端口 5000)
cd ../../../sfda_mcpserver/mcp-server
npm start

# 4. 啟動後端服務 (端口 3000)
cd ../../../backend
npm start
```

### 2. 驗證服務狀態

```bash
# 檢查統計服務
curl http://localhost:8000/api/v1/charts/health

# 檢查 MCP 服務
curl http://localhost:5000/health

# 檢查後端服務
curl http://localhost:3000/health
```

## 測試腳本說明

### 快速測試（推薦）

```bash
cd backend/database/scripts
node test_scatter_quick.js
```

**功能特點**：

- ✅ 測試用戶登入
- ✅ 查詢 `create_scatter` 工具
- ✅ 自然語言對話測試
- ✅ 直接工具調用測試
- ✅ Base64 圖片生成驗證
- ✅ 圖片檔案保存與驗證
- ✅ 統計分析數據檢查

### 全面測試

```bash
cd backend/database/scripts
node test_scatter_comprehensive.js
```

**功能特點**：

- 📊 測試 3 個不同場景
- 🏢 員工年資與薪資關係
- 📈 廣告投入與銷售額關係
- 🏭 製程溫度與產品強度關係
- 🔍 每個場景都包含自然語言和直接調用測試

## 測試結果判斷

### 成功指標

✅ **登入成功**

```
✅ 登入成功
```

✅ **工具查詢成功**

```
✅ 找到工具: create_scatter (ID: xxx)
```

✅ **自然語言理解成功**

```
✅ AI 回應成功 (xxxx 字符)
🔧 包含散點圖調用: 1 個
```

✅ **工具調用成功**

```
✅ 工具調用成功！
⏱️ 執行時間: xxxms
```

✅ **統計分析正確**

```
📊 Pearson 相關係數: 0.xxxx
📊 相關性強度: 強/中等/弱
📉 迴歸方程式: y = 3000.0000x + 32000.0000
```

✅ **圖片生成成功**

```
✅ 發現圖片數據
🖼️ 格式: png
🖼️ Base64 長度: xxxxx 字符
✅ base64 格式有效
📊 圖片大小: xx.xx KB
✅ 圖片已保存: /path/to/test_outputs/scatter_xxx.png
✅ 檔案驗證成功，大小: xx.xx KB

🎉 ✅ 散點圖圖片生成驗證成功！
```

### 失敗處理

❌ **如果看到「找不到 create_scatter 工具」**

```bash
# 檢查 MCP 服務器是否正常運行
curl http://localhost:5000/tools | jq '.[] | select(.name == "create_scatter")'
```

❌ **如果看到「沒有圖片數據」**

```bash
# 檢查統計服務是否正常
curl -X POST http://localhost:8000/api/v1/charts/scatter \
  -H "Content-Type: application/json" \
  -d '{
    "x": [1,2,3,4,5],
    "y": [10,20,30,40,50],
    "title": "測試散點圖",
    "generate_image": true
  }'
```

❌ **如果看到「工具調用失敗」**

- 檢查統計服務是否在端口 8000 運行
- 檢查網絡連接
- 查看後端日誌

## 自然語言測試案例

### 基本詢問

```
"請幫我分析員工年資和薪資的關係，我想看看薪資制度是否合理"
```

### 具體需求

```
"我想了解廣告預算和銷售業績的關係，幫我生成散點圖分析"
```

### 製程優化

```
"幫我分析製程溫度對產品強度的影響，我需要優化生產參數"
```

## 圖片驗證說明

### 1. 檔案位置

生成的圖片會保存在：

```
backend/test_outputs/scatter_xxx_timestamp.png
```

### 2. 檢查內容

- 檔案大小應該在 20KB - 200KB 之間
- 可以用圖片檢視器開啟
- 應該包含：
  - 散點圖數據點
  - X/Y 軸標籤
  - 圖表標題
  - 迴歸線（如果啟用）

### 3. Base64 驗證

- Base64 字符串長度應該 > 10000
- 格式符合正則表達式：`^[A-Za-z0-9+/]*={0,2}$`
- 可以成功轉換為 Buffer 並保存為圖片檔案

## 統計分析驗證

### 相關性分析

- **Pearson 相關係數**：應該在 -1 到 1 之間
- **相關性強度**：非常強/強/中等/弱/非常弱
- **相關性方向**：正相關/負相關/無相關

### 迴歸分析（如果啟用）

- **迴歸方程式**：y = ax + b 格式
- **R²**：應該在 0 到 1 之間
- **斜率和截距**：應該是合理的數值

## 故障排除

### 常見問題

1. **「登入失敗」**

   - 檢查 backend 服務是否在端口 3000 運行
   - 確認測試用戶（admin/admin123）存在

2. **「統計服務連接失敗」**

   - 確認 sfda_stat 服務在端口 8000 運行
   - 檢查防火牆設置

3. **「圖片保存失敗」**

   - 檢查檔案權限
   - 確認 test_outputs 目錄可寫

4. **「MCP 工具未找到」**
   - 重啟 MCP 服務器
   - 檢查工具註冊狀態

### 調試技巧

1. **查看詳細日誌**

```bash
# 後端日誌
tail -f backend/logs/app.log

# MCP 服務器日誌
cd sfda_mcpserver/mcp-server && npm run dev
```

2. **直接測試 API**

```bash
# 測試統計服務
curl -X POST http://localhost:8000/api/v1/charts/scatter \
  -H "Content-Type: application/json" \
  -d @test_scatter_data.json
```

3. **檢查服務依賴**

```bash
# 檢查 Python 環境和依賴
cd sfda_stat && python -c "import matplotlib, numpy, scipy; print('所有依賴正常')"
```

## 預期結果

成功的測試應該顯示：

- ✅ 所有服務正常運行
- ✅ 自然語言理解正確
- ✅ 工具調用成功
- ✅ 統計分析準確
- ✅ 圖片生成成功
- ✅ Base64 數據有效
- ✅ 檔案保存正常

最終在 `test_outputs` 目錄中應該有可開啟的 PNG 圖片檔案，並且控制台顯示所有測試通過的綠色勾選標記。

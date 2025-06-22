# Markdown 表格樣式修復

## 問題描述

用戶反映在 AI 回答內容中，Markdown 語法的表格無法顯示格線，表格看起來沒有邊框和分隔線。

## 問題分析

經過檢查發現，`frontend/src/components/common/CodeHighlight.vue` 組件中：

1. **MarkdownIt 解析正常**：能夠正確將 Markdown 表格語法轉換為 HTML 表格結構
2. **CSS 樣式缺失**：缺少對 `<table>`、`<th>`、`<td>` 等表格元素的樣式定義
3. **無邊框顯示**：表格元素沒有邊框、背景色等視覺樣式

## 修復方案

### 1. 添加完整的表格樣式

在 `CodeHighlight.vue` 中添加了以下樣式：

```css
/* 表格樣式 */
.markdown-content :deep(table) {
  width: 100%;
  margin: 16px 0;
  border-collapse: collapse;
  border: 1px solid var(--border-color, #e8e8e8);
  border-radius: 6px;
  overflow: hidden;
  background: var(--bg-color, #ffffff);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.markdown-content :deep(thead) {
  background: var(--bg-color-tertiary, #f5f5f5);
}

.markdown-content :deep(th) {
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: var(--text-color, #333);
  border-bottom: 2px solid var(--border-color, #e8e8e8);
  border-right: 1px solid var(--border-color, #e8e8e8);
  background: var(--bg-color-tertiary, #f5f5f5);
}

.markdown-content :deep(td) {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, #e8e8e8);
  border-right: 1px solid var(--border-color, #e8e8e8);
  color: var(--text-color, #333);
  vertical-align: top;
}
```

### 2. 添加視覺增強效果

- **條紋背景**：偶數行使用不同背景色提升可讀性
- **懸停效果**：滑鼠懸停時高亮顯示行
- **邊框處理**：最後一列和最後一行去除多餘邊框

### 3. 深色主題支援

添加了深色主題下的表格樣式：

```css
[data-theme="dark"] .markdown-content :deep(table) {
  background: var(--bg-color, #1f1f1f);
  box-shadow: 0 1px 3px rgba(255, 255, 255, 0.1);
}

[data-theme="dark"] .markdown-content :deep(tbody tr:nth-child(even)) {
  background: var(--bg-color-secondary, #2a2a2a);
}

[data-theme="dark"] .markdown-content :deep(tbody tr:hover) {
  background: var(--bg-color-tertiary, #3a3a3a);
}
```

### 4. 響應式設計

在小螢幕設備上：
- 調整字體大小
- 減少內邊距
- 支援水平滾動

## 修復效果

### 修復前
- 表格沒有邊框
- 表頭和數據行無法區分
- 深色模式下顯示異常

### 修復後
- ✅ 完整的表格邊框和格線
- ✅ 清晰的表頭樣式（深色背景、粗體文字）
- ✅ 條紋背景提升可讀性
- ✅ 懸停效果增強交互體驗
- ✅ 深色主題完美支援
- ✅ 響應式設計適配移動設備

## 測試建議

可以在聊天頁面中測試以下 Markdown 表格：

```markdown
| 能力評分 | 能力說明 | 評分說明 |
|---------|---------|---------|
| 10 | 卓越 (Outstanding) | 能獨立解決複雜問題、主動提出策略性建議 |
| 9 | 卓越 (Outstanding) | 能跨部門協調資源、具備創新思維 |
| 8 | 優良 (Excellent) | 有完整專業知識、解決問題效率高 |
```

## 相關檔案

- `frontend/src/components/common/CodeHighlight.vue` - 主要修復檔案
- 受影響範圍：所有使用 AI 回答的聊天頁面

## 技術細節

- 使用 CSS 變數系統確保主題一致性
- 使用 `:deep()` 選擇器穿透 Vue 組件樣式隔離
- 遵循現有的設計系統顏色和間距規範 
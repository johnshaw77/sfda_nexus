# Admin 暗黑模式修復文檔

## 問題描述

Admin 頁面在暗黑模式下顯示異常，主要問題包括：

1. 每個頁面都有自定義樣式，使用硬編碼的顏色值（如 `#fafafa`）
2. 樣式分散在各個組件中，難以維護
3. 暗黑模式下背景色、邊框色、文字色不協調

## 解決方案

### 1. 創建統一的 Admin 樣式文件

創建了 `frontend/src/assets/styles/admin.css`，包含：

- 使用 CSS 變數來支援暗黑模式
- 統一的 admin 頁面樣式
- Ant Design 組件的暗黑模式覆蓋樣式

### 2. 修改主樣式文件

在 `frontend/src/assets/styles/main.css` 中引入 admin 樣式：

```css
@import "./admin.css";
```

### 3. 清理各頁面的重複樣式

修改了以下頁面，移除硬編碼樣式：

- `frontend/src/views/admin/index.vue`
- `frontend/src/views/admin/users.vue`
- `frontend/src/views/admin/models.vue`
- `frontend/src/views/admin/system.vue`
- `frontend/src/views/admin/agents.vue`

### 4. 統一 CSS 類名

將所有頁面的根容器類名統一為 `admin-page`，確保樣式一致性。

## 使用的 CSS 變數

### 背景色

- `--custom-bg-primary`: 主要背景色
- `--custom-bg-secondary`: 次要背景色
- `--custom-bg-tertiary`: 第三級背景色

### 邊框色

- `--custom-border-primary`: 主要邊框色
- `--custom-border-secondary`: 次要邊框色

### 文字色

- `--custom-text-primary`: 主要文字色
- `--custom-text-secondary`: 次要文字色
- `--custom-text-tertiary`: 第三級文字色

### 其他

- `--primary-color`: 主色調
- `--error-color`: 錯誤色
- `--warning-color`: 警告色
- `--success-color`: 成功色

## 主要樣式類

### 頁面容器

- `.admin-page`: 統一的頁面容器樣式

### 搜索區域

- `.search-section`: 搜索和篩選區域樣式

### 卡片樣式

- `.admin-card`: 管理頁面卡片樣式
- `.agent-card`: 智能體卡片樣式
- `.card-icon`: 卡片圖標樣式

### 其他組件

- `.avatar-upload-section`: 頭像上傳區域
- `.config-display`: 配置顯示區域
- `.log-container`: 日誌容器
- `.pagination-wrapper`: 分頁包裝器

## 暗黑模式支援

所有樣式都使用 CSS 變數，在 `variables.css` 中定義了亮色和暗色模式的變數值：

```css
/* 亮色模式 */
[data-theme="light"] {
  --custom-bg-primary: #ffffff;
  --custom-bg-secondary: #f8fafc;
  --custom-text-primary: #1a202c;
  /* ... */
}

/* 暗色模式 */
[data-theme="dark"] {
  --custom-bg-primary: #141414;
  --custom-bg-secondary: #1f1f1f;
  --custom-text-primary: rgba(255, 255, 255, 0.85);
  /* ... */
}
```

## 測試

修復後，admin 頁面在亮色和暗色模式下都能正常顯示，包括：

- 背景色自動適應主題
- 文字色對比度良好
- 邊框和分隔線清晰可見
- Ant Design 組件樣式協調一致

## 維護建議

1. 新增 admin 頁面時，使用 `admin-page` 類名作為根容器
2. 使用已定義的 CSS 變數，避免硬編碼顏色值
3. 新增樣式時，優先在 `admin.css` 中定義通用樣式
4. 測試時確保在亮色和暗色模式下都能正常顯示

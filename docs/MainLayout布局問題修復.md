# MainLayout 布局問題修復記錄

## 修復時間

2025 年 6 月 9 日

## 問題描述

1. **智能體側邊欄預設顯示問題**：智能體選單一開始就顯示，應該預設隱藏
2. **布局錯誤**：側邊欄消失、主內容區域跑版等問題

## 問題分析

### 1. 智能體側邊欄預設顯示

- **原因**：CSS 的 `transform: translateX(-100%)` 隱藏不夠徹底
- **影響**：用戶一進入頁面就看到智能體選單，體驗不佳

### 2. 主內容區域布局混亂

- **原因**：響應式計算邏輯有誤，`marginLeft` 被智能體側邊欄狀態影響
- **影響**：主內容區域位置不正確，可能被覆蓋或錯位

### 3. 手機端響應式問題

- **原因**：手機端的側邊欄顯示/隱藏邏輯不完善
- **影響**：手機端用戶體驗差

## 修復方案

### 1. 智能體側邊欄隱藏修復

```css
.agents-sidebar {
  transform: translateX(-100%);
  visibility: hidden; /* 新增：確保完全隱藏 */
}

.agents-sidebar.visible {
  transform: translateX(0);
  visibility: visible; /* 新增：顯示時才可見 */
}
```

### 2. 主內容區域邊距重構

```vue
<!-- 移除智能體側邊欄狀態的影響 -->
<div
  class="main-content"
  :class="{
    'sidebar-collapsed': sidebarCollapsed,
    'mobile-mode': isMobile
  }"
  :style="{
    marginLeft: isMobile ? '0' :
               (sidebarCollapsed ? '60px' : `${sidebarWidth}px`)
  }">
```

### 3. 響應式邏輯優化

```javascript
const handleResize = () => {
  screenWidth.value = window.innerWidth;

  // 手機端自動隱藏所有側邊欄
  if (isMobile.value) {
    mobileSidebarVisible.value = false;
    if (agentsSidebarVisible.value) {
      agentsSidebarVisible.value = false;
    }
  }
};
```

### 4. Logo 組件優化

- 調整 Logo 尺寸：從 32px 改為 24px
- 修復多餘的 HTML 標籤結構
- 添加 `overflow: hidden` 確保圖片不溢出

## 修復後的特性

### ✅ 正確的初始狀態

- 主側邊欄：桌面端展開，手機端隱藏
- 智能體側邊欄：所有設備都預設隱藏
- 主內容區域：正確的邊距計算

### ✅ 響應式行為

- **桌面端 (≥992px)**：

  - 主側邊欄可折疊/展開
  - 智能體側邊欄從主側邊欄右側滑出
  - 主內容區域根據主側邊欄狀態調整

- **平板端 (768-991px)**：

  - 主側邊欄較窄但仍顯示
  - 智能體側邊欄覆蓋顯示
  - 搜尋框適度縮小

- **手機端 (<768px)**：
  - 主側邊欄預設隱藏，通過漢堡菜單控制
  - 智能體側邊欄全屏顯示
  - 主內容區域無左邊距

### ✅ 交互邏輯

- 點擊智能體選單項目 → 智能體側邊欄顯示
- 點擊其他選單項目 → 智能體側邊欄自動關閉
- 點擊遮罩 → 對應側邊欄關閉
- 視窗大小改變 → 自動調整布局

## 測試檢查項目

### 桌面端測試

- [ ] 頁面載入時智能體側邊欄是否隱藏
- [ ] 主側邊欄折疊/展開是否正常
- [ ] 智能體側邊欄開啟/關閉是否流暢
- [ ] 主內容區域邊距是否正確

### 手機端測試

- [ ] 漢堡菜單按鈕是否顯示
- [ ] 主側邊欄滑出/隱藏是否正常
- [ ] 智能體側邊欄全屏顯示是否正確
- [ ] 遮罩功能是否有效

### 響應式測試

- [ ] 桌面端 → 手機端切換是否正常
- [ ] 手機端 → 桌面端切換是否正常
- [ ] 各斷點的布局是否符合設計

## 後續優化建議

1. **性能優化**：添加 `will-change` CSS 屬性提升動畫性能
2. **可訪問性**：添加鍵盤導航支援
3. **用戶體驗**：記住用戶的側邊欄偏好設置
4. **動畫優化**：調整過渡動畫的緩動函數

---

# 第二階段重大布局問題修復（緊急修復）

## 修復時間

2025 年 6 月 9 日（響應式重構後緊急修復）

## 嚴重問題描述

### 1. 主內容區域大片空白問題 🚨

- **現象**：主內容區域顯示大片空白，無法正常顯示內容
- **原因**：flex 布局與 marginLeft 手動設定衝突
- **影響**：用戶無法看到頁面內容，系統基本無法使用

### 2. 智能體側邊欄從最上層滑出問題 🚨

- **現象**：智能體側邊欄 z-index 過高，從錯誤的層級滑出
- **原因**：z-index 設定為 1001，層級管理混亂
- **影響**：視覺層級錯誤，用戶體驗極差

## 緊急修復方案

### 🔧 主內容區域布局修復

**核心問題**：當主側邊欄為 `position: relative` 時，flex 布局會自動計算空間分配，手動設定 marginLeft 會造成衝突。

```vue
<!-- 修復前（有問題的代碼） -->
:style="{ marginLeft: isMobile ? '0' : (sidebarCollapsed ? '60px' :
`${sidebarWidth}px`) }"

<!-- 修復後（正確的代碼） -->
:style="{ marginLeft: '0' // 讓 flex 布局自動處理 }"
```

**CSS 優化**：

```css
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  transition: margin-left 0.3s ease;
  min-width: 0; /* 新增：防止 flex 項目溢出 */
  overflow: hidden; /* 新增：防止內容溢出 */
}

.main-sidebar {
  /* ... 其他樣式 ... */
  flex-shrink: 0; /* 新增：防止側邊欄被壓縮 */
}
```

### 🔧 z-index 層級系統重構

**核心問題**：層級設定過高且不統一，導致元素從錯誤的層級顯示。

**新的層級系統**：

```css
/* CSS 變數調整 */
--z-sidebar: 100;
--z-agents-sidebar: 110;     /* 從 200 降低到 110 */
--z-overlay: 999;            /* 保持高優先級 */

/* 實際應用層級 */
主側邊欄：
- 桌面端：z-index: 100
- 手機端：z-index: 102

智能體側邊欄：
- 桌面端：z-index: 110
- 手機端：z-index: 105

遮罩層：
- 主側邊欄遮罩：z-index: 101
- 智能體側邊欄遮罩：z-index: 109
```

**具體修復代碼**：

```vue
<!-- 智能體側邊欄 z-index 修復 -->
:style="{ width: agentsSidebarWidth, left: isMobile ? '0' : (sidebarCollapsed ?
'60px' : `${sidebarWidth}px`), zIndex: isMobile ? 105 : 110 // 從 1001
降低到合理範圍 }"

<!-- 主側邊欄 z-index 修復 -->
:style="{ /* ... 其他樣式 ... */ zIndex: isMobile ? 102 : 100 // 從 1000
降低到合理範圍 }"
```

### 🔧 主側邊欄寬度屬性強化

```vue
:style="{ width: isMobile ? (mobileSidebarVisible ? `${sidebarWidth}px` : '0') :
(sidebarCollapsed ? '60px' : `${sidebarWidth}px`), position: isMobile ? 'fixed'
: 'relative', zIndex: isMobile ? 102 : 100, minWidth: isMobile ?
(mobileSidebarVisible ? `${sidebarWidth}px` : '0') : (sidebarCollapsed ? '60px'
: `${sidebarWidth}px`) // 新增 minWidth }"
```

## 修復結果驗證

### ✅ 立即修復的問題

1. **主內容區域空白**：完全消除，內容正常顯示
2. **智能體側邊欄層級**：不再從最上層滑出，正確的視覺層級
3. **主側邊欄穩定性**：寬度計算更加穩定，不會意外收縮
4. **層級管理**：建立了合理的 z-index 層級系統

### ✅ 預期的正常行為

1. 主內容區域完全顯示，無空白區域
2. 智能體側邊欄從正確的位置滑出（主側邊欄右側）
3. 所有遮罩層正確顯示在對應元素之下
4. 響應式切換時布局穩定

## 技術總結

### 關鍵洞察

1. **Flex 布局自動計算**：當容器元素都在 flex 流中且為 relative 定位時，flex 會自動分配空間，手動設定 margin 會干擾這個過程
2. **層級管理重要性**：z-index 不是越高越好，需要建立合理的層級系統
3. **響應式定位策略**：桌面端用 relative 配合 flex，手機端用 fixed 配合 margin

### 防範措施

1. **flex 項目保護**：使用 `min-width: 0` 和 `overflow: hidden` 防止溢出
2. **側邊欄穩定性**：同時設定 `width` 和 `minWidth` 確保穩定
3. **層級規劃**：建立清晰的 z-index 層級圖，避免任意設定高值

## 相關文件

- `layouts/MainLayout.vue`：主要修復文件
- CSS 響應式重構計畫第 10 項：已標記為完成並修復嚴重問題

---

# 智能體側邊欄動畫方向修復

## 修復時間

2025 年 6 月 9 日

## 問題描述

智能體側邊欄的滑出動畫方向不正確，感覺像是從「上方」滑入，而不是從主側邊欄的「右側」滑出。

## 根本原因

1. **動畫方向錯誤**：原本使用 `translateX(-100%)` 從左側隱藏，但智能體側邊欄的 `left` 位置已經設定在主側邊欄右邊
2. **定位衝突**：`position: absolute` 相對於父容器定位，但應該相對於視窗定位
3. **視覺邏輯不符**：用戶期望智能體側邊欄從主側邊欄右側滑出，但實際從左側滑入

## 修復方案

#### 1. 改變動畫方向

```css
/* 修復前 */
.agents-sidebar {
  transform: translateX(-100%); /* 從左側隱藏 */
}

/* 修復後 */
.agents-sidebar {
  transform: translateX(100%); /* 從右側隱藏 */
}
```

#### 2. 統一定位方式

```css
/* 修復前 */
.agents-sidebar {
  position: absolute; /* 相對於父容器 */
}

/* 修復後 */
.agents-sidebar {
  position: fixed; /* 相對於視窗 */
}
```

#### 3. 優化動畫效果

```css
.agents-sidebar {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); /* 更流暢的緩動 */
}

/* 手機端和桌面端統一的動畫邏輯 */
.agents-sidebar.mobile-mode {
  transform: translateX(100%); /* 手機端也從右側滑入 */
}

.agents-sidebar.mobile-mode.visible {
  transform: translateX(0);
}
```

## 修復結果

- ✅ 智能體側邊欄現在從主側邊欄右側滑出
- ✅ 動畫方向符合用戶預期
- ✅ 手機端和桌面端動畫邏輯統一
- ✅ 使用更流暢的緩動函數提升體驗

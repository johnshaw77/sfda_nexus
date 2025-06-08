# AppSidebar 組件響應式重構

## 重構概要

完成了 `components/AppSidebar.vue` 組件的響應式重構，將原本使用單一 CSS media query 的設計，升級為使用動態響應式屬性配置和精細化斷點控制的 Ant Design Vue Layout 系統。

## 重構內容

### 1. 響應式斷點偵測系統

**新增功能：**

```javascript
// 動態視窗尺寸偵測
const screenWidth = ref(window.innerWidth);
const isMobile = computed(() => screenWidth.value < 768);
const isTablet = computed(
  () => screenWidth.value >= 768 && screenWidth.value < 992
);
const isDesktop = computed(() => screenWidth.value >= 992);

// 響應式尺寸配置
const siderWidth = computed(() => {
  if (isMobile.value) return 280;
  if (isTablet.value) return 240;
  return 240;
});

const collapsedWidth = computed(() => {
  if (isMobile.value) return 0;
  if (isTablet.value) return 60;
  return 80;
});
```

### 2. Layout Sider 響應式配置

**原始設計：**

```vue
<a-layout-sider
  :width="240"
  :collapsed-width="80"
  class="app-sider">
```

**重構後：**

```vue
<a-layout-sider
  :width="siderWidth"
  :collapsed-width="collapsedWidth"
  :class="['app-sider', { 'mobile-visible': !collapsed && isMobile, 'mobile-hidden': collapsed && isMobile }]"
  :style="{
    position: isMobile ? 'fixed' : 'fixed',
    zIndex: isMobile ? 1001 : 100
  }"
  :data-collapsed="collapsed">
```

### 3. CSS 響應式重構

**移除舊的 Media Query：**

```css
/* 已移除 */
@media (max-width: 768px) {
  .app-sider {
    transform: translateX(-100%);
    transition: transform 0.3s;
  }
  .app-sider.mobile-visible {
    transform: translateX(0);
  }
}
```

**新的響應式樣式：**

```css
/* 動態響應式類別 */
.app-sider.mobile-hidden {
  transform: translateX(-100%);
}

.app-sider.mobile-visible {
  transform: translateX(0);
  z-index: 1001;
}

/* 精細化斷點樣式 */
@media (min-width: 768px) and (max-width: 991px) {
  .app-menu {
    font-size: 14px;
  }
  .logo-container {
    margin: 12px;
  }
  .connection-status {
    font-size: 11px;
  }
}

@media (min-width: 992px) {
  .app-sider {
    box-shadow: 2px 0 12px rgba(0, 0, 0, 0.1);
  }
  .logo-container:hover {
    background: var(--custom-bg-tertiary);
  }
}
```

## 斷點規範

| 斷點 | 螢幕尺寸  | Sider 寬度 | 折疊寬度 | 特殊行為              |
| ---- | --------- | ---------- | -------- | --------------------- |
| 手機 | < 768px   | 280px      | 0px      | 固定定位 + 完全隱藏   |
| 平板 | 768-991px | 240px      | 60px     | 緊湊模式              |
| 桌面 | ≥ 992px   | 240px      | 80px     | 標準模式 + Hover 效果 |

## 響應式改進

### 1. 動態尺寸調整

- **手機端**: 更寬的側邊欄 (280px) 提供更好的觸控體驗
- **平板端**: 適中尺寸 (240px) 平衡內容與導航
- **桌面端**: 標準尺寸 (240px) 保持原有體驗

### 2. 折疊行為優化

- **手機端**: 完全隱藏 (0px) 節省螢幕空間
- **平板端**: 極簡模式 (60px) 保留圖標導航
- **桌面端**: 標準折疊 (80px) 保持操作便利性

### 3. Z-index 管理

- **手機端**: 使用較高的 z-index (1001) 確保覆蓋其他內容
- **其他裝置**: 標準 z-index (100) 避免層級衝突

### 4. 過渡動畫增強

- 所有尺寸變化都添加了平滑過渡效果
- 摺疊/展開狀態變化使用統一的動畫時間 (0.3s)

## 技術改進

### 1. 響應式架構升級

- **事件監聽**: 添加 window resize 監聽器
- **計算屬性**: 動態計算響應式狀態和尺寸
- **生命週期管理**: 正確的事件監聽器清理

### 2. 類別管理改善

- **動態類別**: 使用計算屬性動態應用響應式類別
- **狀態屬性**: 使用 data 屬性傳遞狀態給 CSS

### 3. 樣式組織優化

- **移除冗餘**: 移除舊的 media query
- **分層設計**: 按裝置類型組織樣式規則
- **效能優化**: 減少不必要的樣式計算

## 相容性保持

### 1. API 一致性

- ✅ 保持原有的 props 接口
- ✅ 保持原有的 emits 事件
- ✅ 保持與 MainLayout 的整合

### 2. 功能完整性

- ✅ 選單路由導航功能
- ✅ WebSocket 連接狀態顯示
- ✅ 管理員權限選單顯示
- ✅ Logo 和品牌展示

### 3. 視覺效果保持

- ✅ 暗黑/亮色主題支援
- ✅ Hover 交互效果
- ✅ 陰影和圓角設計
- ✅ 選中狀態指示

## 測試要點

- [x] 手機端側邊欄完全隱藏/顯示
- [x] 平板端緊湊模式切換
- [x] 桌面端標準模式操作
- [x] 視窗大小變化時的動態適應
- [x] 選單功能在各裝置上的正常運作
- [x] WebSocket 狀態顯示的響應式行為

## 重構效果

1. **更好的手機端體驗**: 更寬的側邊欄和完全隱藏的折疊模式
2. **精細化響應式控制**: 三個主要斷點的差異化處理
3. **效能優化**: 移除舊的 CSS 查詢，使用更高效的動態類別
4. **維護性提升**: 集中管理響應式邏輯，便於後續調整
5. **平滑的過渡體驗**: 所有狀態變化都有平滑動畫

## 相關文件

- 主要重構計畫: `docs/CSS響應式重構計畫.md`
- MainLayout 重構: 待完成

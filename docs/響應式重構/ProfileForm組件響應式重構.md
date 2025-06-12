# ProfileForm 組件響應式重構

## 重構概要

完成了 `views/user/components/ProfileForm.vue` 組件的響應式重構，將原本使用固定布局和 CSS media query 的設計，改為使用 Ant Design Vue Grid 系統的統一響應式方案。

## 重構內容

### 1. 表單布局響應式化

**原始設計：**

```vue
:label-col="{ span: 6 }" :wrapper-col="{ span: 18 }"
```

**重構後：**

```vue
:label-col="{ xs: { span: 24 }, sm: { span: 24 }, md: { span: 8 }, lg: { span: 6
}, xl: { span: 6 } }" :wrapper-col="{ xs: { span: 24 }, sm: { span: 24 }, md: {
span: 16 }, lg: { span: 18 }, xl: { span: 18 } }"
```

**響應式行為：**

- **xs/sm (手機)**: 標籤和輸入框垂直排列，各佔 24 格
- **md (平板)**: 標籤 8 格，輸入框 16 格
- **lg/xl (桌面)**: 標籤 6 格，輸入框 18 格

### 2. 按鈕容器響應式配置

**重構後：**

```vue
:wrapper-col="{ xs: { span: 24, offset: 0 }, sm: { span: 24, offset: 0 }, md: {
span: 16, offset: 8 }, lg: { span: 18, offset: 6 }, xl: { span: 18, offset: 6 }
}"
```

**響應式行為：**

- **xs/sm**: 按鈕左對齊，無偏移
- **md 以上**: 按鈕對齊輸入框位置

### 3. 頭像響應式實現

**JavaScript 動態尺寸：**

```javascript
const avatarSize = computed(() => {
  if (typeof window !== "undefined") {
    return window.innerWidth <= 767 ? 80 : 100;
  }
  return 100;
});
```

**CSS 變量響應式：**

```css
.profile-avatar {
  --avatar-size: 100px;
  --upload-icon-size: 32px;
  --remove-icon-size: 24px;
}

@media (max-width: 767px) {
  .profile-avatar {
    --avatar-size: 80px;
    --upload-icon-size: 28px;
    --remove-icon-size: 20px;
  }
}
```

## 斷點規範

| 斷點 | 螢幕尺寸 | 表單布局  | 頭像尺寸 |
| ---- | -------- | --------- | -------- |
| xs   | < 576px  | 垂直堆疊  | 80px     |
| sm   | ≥ 576px  | 垂直堆疊  | 80px     |
| md   | ≥ 768px  | 8:16 分割 | 100px    |
| lg   | ≥ 992px  | 6:18 分割 | 100px    |
| xl   | ≥ 1200px | 6:18 分割 | 100px    |

## 移除的 CSS Media Query

原本的 CSS media query 已完全移除，改用響應式組件配置：

```css
/* 已移除 */
@media (max-width: 768px) {
  .profile-avatar {
    /* 固定樣式配置 */
  }
}
```

## 技術細節

### 響應式實現方式

1. **Grid 布局**: 使用 Ant Design Vue 的響應式斷點配置
2. **動態尺寸**: JavaScript computed 屬性計算頭像尺寸
3. **CSS 變量**: 配合 media query 實現圖標響應式縮放

### 測試要點

- [x] 手機端表單垂直堆疊
- [x] 平板端適中布局
- [x] 桌面端最佳視覺效果
- [x] 頭像及相關圖標響應式縮放
- [x] 按鈕對齊正確

## 重構效果

1. **統一的響應式系統**: 與其他頁面保持一致的響應式設計模式
2. **更好的移動端體驗**: 手機端表單更易於填寫
3. **程式碼簡化**: 移除了自定義 CSS media query
4. **維護性提升**: 使用標準化的響應式配置

## 相關文件

- 主要重構計畫: `docs/CSS響應式重構計畫.md`
- Playground 頁面重構: `docs/Playground頁面響應式重構.md`

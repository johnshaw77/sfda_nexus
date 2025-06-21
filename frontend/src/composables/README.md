# Composables

這個目錄包含了項目中可重複使用的 Vue 3 Composition API 函數。

## useFileType

檔案類型判斷 composable，提供各種檔案類型的判斷和處理函數。

### 功能特點

- 🔍 **智能檔案類型判斷** - 支援 MIME 類型和檔案擴展名雙重檢查
- 📁 **多種檔案格式** - 支援文檔、圖片、音頻、視頻、程式碼等多種格式
- 🎯 **類型安全** - TypeScript 友好的介面設計
- 🚀 **高性能** - 輕量級實現，無外部依賴
- 🔧 **易於擴展** - 模組化設計，容易添加新的檔案類型

### 基本用法

```javascript
import { useFileType } from '@/composables/useFileType';

const {
  isPdfFile,
  isWordFile,
  isExcelFile,
  isPowerpointFile,
  isImageFile,
  getFileCategory,
  getFileIconName,
  isSupportedFile
} = useFileType();

// 檢查檔案類型
const file = { filename: 'report.pdf', mimeType: 'application/pdf' };
console.log(isPdfFile(file)); // true
console.log(getFileCategory(file)); // 'pdf'
console.log(getFileIconName(file)); // 'FilePDF'
```

### 支援的檔案類型

#### 文檔檔案
- **PDF**: `.pdf` - `application/pdf`
- **Word**: `.doc`, `.docx` - `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- **Excel**: `.xls`, `.xlsx` - `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **PowerPoint**: `.ppt`, `.pptx` - `application/vnd.ms-powerpoint`, `application/vnd.openxmlformats-officedocument.presentationml.presentation`
- **CSV**: `.csv` - `text/csv`
- **文字檔案**: `.txt`, `.md`, `.markdown` - `text/plain`, `text/markdown`

#### 程式碼檔案
- **JavaScript/TypeScript**: `.js`, `.ts`, `.jsx`, `.tsx`
- **Vue**: `.vue`
- **Python**: `.py`
- **其他**: `.java`, `.cpp`, `.c`, `.cs`, `.php`, `.rb`, `.go`, `.rs`, `.swift`, `.kt`
- **Web**: `.html`, `.css`, `.scss`, `.sass`, `.less`
- **配置檔案**: `.json`, `.xml`, `.yaml`, `.yml`, `.sql`
- **腳本檔案**: `.sh`, `.bash`, `.ps1`

#### 媒體檔案
- **圖片**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`, `.bmp`, `.ico`
- **音頻**: `.mp3`, `.wav`, `.flac`, `.aac`, `.ogg`, `.m4a`
- **視頻**: `.mp4`, `.avi`, `.mov`, `.wmv`, `.flv`, `.webm`, `.mkv`

#### 壓縮檔案
- **壓縮包**: `.zip`, `.rar`, `.7z`, `.tar`, `.gz`, `.bz2`, `.xz`

### API 參考

#### 檔案類型判斷函數

```javascript
// 基本檔案類型判斷
isPdfFile(file)           // 是否為 PDF 檔案
isWordFile(file)          // 是否為 Word 檔案
isExcelFile(file)         // 是否為 Excel 檔案
isPowerpointFile(file)    // 是否為 PowerPoint 檔案
isCsvFile(file)           // 是否為 CSV 檔案
isTextFile(file)          // 是否為文字檔案
isJsonFile(file)          // 是否為 JSON 檔案
isXmlFile(file)           // 是否為 XML 檔案
isCodeFile(file)          // 是否為程式碼檔案

// 媒體檔案判斷
isImageFile(file)         // 是否為圖片檔案
isAudioFile(file)         // 是否為音頻檔案
isVideoFile(file)         // 是否為視頻檔案

// 其他類型判斷
isArchiveFile(file)       // 是否為壓縮檔案
isDocumentFile(file)      // 是否為文檔檔案（包含多種文檔格式）
```

#### 輔助函數

```javascript
// 獲取檔案分類
getFileCategory(file)     // 返回: 'pdf', 'word', 'excel', 'image', 'code', etc.

// 獲取檔案圖示名稱
getFileIconName(file)     // 返回對應的圖示組件名稱

// 檢查檔案是否被支援
isSupportedFile(file)     // 檢查檔案是否在支援的類型列表中

// 獲取檔案信息
getFileInfo(file)         // 標準化檔案信息格式
```

### 檔案對象格式

composable 支援多種檔案對象格式：

```javascript
// 來自文件上傳的原生 File 對象
const nativeFile = {
  name: 'document.pdf',
  type: 'application/pdf'
};

// 自定義檔案對象
const customFile = {
  filename: 'document.pdf',
  mimeType: 'application/pdf'
};

// 字符串檔案名（僅基於擴展名判斷）
const fileName = 'document.pdf';

// 所有格式都可以使用
console.log(isPdfFile(nativeFile));   // true
console.log(isPdfFile(customFile));   // true
console.log(isPdfFile(fileName));     // true
```

### 在 Vue 組件中使用

```vue
<template>
  <div class="file-list">
    <div v-for="file in files" :key="file.id" class="file-item">
      <!-- 動態顯示檔案圖示 -->
      <component :is="getFileIconComponent(file)" />
      
      <!-- 根據檔案類型顯示不同的操作按鈕 -->
      <div class="file-actions">
        <template v-if="isPdfFile(file)">
          <button @click="extractText(file)">提取文字</button>
          <button @click="summarize(file)">文件摘要</button>
        </template>
        
        <template v-else-if="isImageFile(file)">
          <button @click="preview(file)">預覽圖片</button>
          <button @click="analyze(file)">圖片分析</button>
        </template>
        
        <template v-else-if="isCodeFile(file)">
          <button @click="review(file)">代碼審查</button>
          <button @click="format(file)">格式化</button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useFileType } from '@/composables/useFileType';

const {
  isPdfFile,
  isImageFile,
  isCodeFile,
  getFileIconName
} = useFileType();

const getFileIconComponent = (file) => {
  return getFileIconName(file);
};
</script>
```

### 擴展新的檔案類型

要添加新的檔案類型支援，只需要修改 `useFileType.js` 檔案：

```javascript
// 1. 添加新的判斷函數
const isNewFileType = (file) => {
  const { mimeType, filename } = getFileInfo(file);
  return (
    mimeType === 'application/new-type' ||
    filename.toLowerCase().endsWith('.new')
  );
};

// 2. 更新檔案分類函數
const getFileCategory = (file) => {
  if (isNewFileType(file)) return 'newtype';
  // ... 其他判斷
};

// 3. 更新圖示映射
const getFileIconName = (file) => {
  const category = getFileCategory(file);
  const iconMap = {
    newtype: 'NewFileIcon',
    // ... 其他映射
  };
  return iconMap[category] || 'FileOutlined';
};

// 4. 導出新函數
return {
  isNewFileType,
  // ... 其他函數
};
```

### 測試

使用 `frontend/src/test/useFileType.test.js` 來測試 composable 的功能：

```bash
# 在瀏覽器控制台中查看測試結果
import testFile from '@/test/useFileType.test.js';
testFile.runTests();
```

### 最佳實踐

1. **優先使用 MIME 類型判斷**：MIME 類型比檔案擴展名更可靠
2. **雙重檢查**：同時檢查 MIME 類型和檔案擴展名，提高準確性
3. **性能考慮**：判斷函數都是純函數，可以安全地在計算屬性中使用
4. **錯誤處理**：對於未知檔案類型，提供合理的默認行為
5. **一致性**：在整個應用中統一使用這個 composable，避免重複的判斷邏輯

### 與其他組件的整合

這個 composable 已經在以下組件中使用：

- `ChatArea.vue` - 聊天區域的檔案上傳和預覽
- `FileUpload.vue` - 檔案上傳組件
- `FilePreview.vue` - 檔案預覽組件

通過統一使用這個 composable，確保了整個應用中檔案類型判斷的一致性和可維護性。 
/**
 * useFileType Composable 測試
 * 測試各種檔案類型判斷函數
 */

import { useFileType } from '@/composables/useFileType';

// 模擬檔案對象
const createMockFile = (filename, mimeType) => ({
  filename,
  mimeType
});

const createMockFileFromNative = (name, type) => ({
  name,
  type
});

// 初始化 composable
const {
  isPdfFile,
  isWordFile,
  isCsvFile,
  isExcelFile,
  isPowerpointFile,
  isTextFile,
  isJsonFile,
  isXmlFile,
  isCodeFile,
  isImageFile,
  isAudioFile,
  isVideoFile,
  isArchiveFile,
  getFileCategory,
  getFileIconName,
  isSupportedFile
} = useFileType();

// 測試用例
console.log('=== useFileType Composable 測試 ===');

// 測試 PDF 檔案
console.log('\n--- PDF 檔案測試 ---');
console.log('PDF (MIME):', isPdfFile(createMockFile('test.pdf', 'application/pdf'))); // true
console.log('PDF (擴展名):', isPdfFile(createMockFile('test.pdf', ''))); // true
console.log('非 PDF:', isPdfFile(createMockFile('test.txt', 'text/plain'))); // false

// 測試 Excel 檔案
console.log('\n--- Excel 檔案測試 ---');
console.log('Excel XLSX:', isExcelFile(createMockFile('test.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'))); // true
console.log('Excel XLS:', isExcelFile(createMockFile('test.xls', 'application/vnd.ms-excel'))); // true
console.log('Excel (擴展名):', isExcelFile(createMockFile('test.xlsx', ''))); // true

// 測試 PowerPoint 檔案
console.log('\n--- PowerPoint 檔案測試 ---');
console.log('PowerPoint PPTX:', isPowerpointFile(createMockFile('test.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'))); // true
console.log('PowerPoint PPT:', isPowerpointFile(createMockFile('test.ppt', 'application/vnd.ms-powerpoint'))); // true
console.log('PowerPoint (擴展名):', isPowerpointFile(createMockFile('test.pptx', ''))); // true

// 測試圖片檔案
console.log('\n--- 圖片檔案測試 ---');
console.log('JPEG:', isImageFile(createMockFile('test.jpg', 'image/jpeg'))); // true
console.log('PNG:', isImageFile(createMockFile('test.png', 'image/png'))); // true
console.log('圖片 (擴展名):', isImageFile(createMockFile('test.jpg', ''))); // true

// 測試程式碼檔案
console.log('\n--- 程式碼檔案測試 ---');
console.log('JavaScript:', isCodeFile(createMockFile('test.js', 'text/javascript'))); // true
console.log('TypeScript:', isCodeFile(createMockFile('test.ts', ''))); // true
console.log('Vue:', isCodeFile(createMockFile('test.vue', ''))); // true
console.log('Python:', isCodeFile(createMockFile('test.py', ''))); // true

// 測試檔案分類
console.log('\n--- 檔案分類測試 ---');
console.log('PDF 分類:', getFileCategory(createMockFile('test.pdf', 'application/pdf'))); // 'pdf'
console.log('Excel 分類:', getFileCategory(createMockFile('test.xlsx', ''))); // 'excel'
console.log('圖片分類:', getFileCategory(createMockFile('test.jpg', 'image/jpeg'))); // 'image'
console.log('程式碼分類:', getFileCategory(createMockFile('test.js', ''))); // 'code'

// 測試圖示名稱
console.log('\n--- 檔案圖示測試 ---');
console.log('PDF 圖示:', getFileIconName(createMockFile('test.pdf', 'application/pdf'))); // 'FilePDF'
console.log('Excel 圖示:', getFileIconName(createMockFile('test.xlsx', ''))); // 'FileExcel'
console.log('PowerPoint 圖示:', getFileIconName(createMockFile('test.pptx', ''))); // 'FilePowerpoint'

// 測試支援的檔案
console.log('\n--- 支援檔案測試 ---');
console.log('支援 PDF:', isSupportedFile(createMockFile('test.pdf', 'application/pdf'))); // true
console.log('支援 Excel:', isSupportedFile(createMockFile('test.xlsx', ''))); // true
console.log('支援 PowerPoint:', isSupportedFile(createMockFile('test.pptx', ''))); // true
console.log('支援圖片:', isSupportedFile(createMockFile('test.jpg', 'image/jpeg'))); // true
console.log('不支援檔案:', isSupportedFile(createMockFile('test.unknown', 'application/unknown'))); // false

// 測試原生檔案對象（來自 input file）
console.log('\n--- 原生檔案對象測試 ---');
console.log('原生 PDF:', isPdfFile(createMockFileFromNative('test.pdf', 'application/pdf'))); // true
console.log('原生 Excel:', isExcelFile(createMockFileFromNative('test.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'))); // true
console.log('原生 PowerPoint:', isPowerpointFile(createMockFileFromNative('On board Report_簡報檔_20250528.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'))); // true

console.log('\n=== 測試完成 ===');

export default {
  runTests: () => {
    console.log('useFileType composable 測試已執行，請檢查控制台輸出');
  }
}; 
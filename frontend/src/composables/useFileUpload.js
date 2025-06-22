import { ref } from 'vue';
import { message } from 'ant-design-vue';
import { useFileType } from './useFileType';

/**
 * 檔案上傳相關的 composable
 * 提取自 ChatArea.vue 的檔案處理邏輯
 */
export function useFileUpload() {
  const { isSupportedFile } = useFileType();
  
  // 響應式狀態
  const previewFiles = ref([]);
  const isDragOver = ref(false);
  const maxPreviewFiles = 5;
  const maxFileSize = 20 * 1024 * 1024; // 20MB

  /**
   * 檔案預覽處理
   * @param {File} file - 要預覽的檔案
   * @returns {Promise<boolean>} - 是否成功添加到預覽
   */
  const handleFilePreview = async (file) => {
    try {
      // 檢查檔案數量限制
      if (previewFiles.value.length >= maxPreviewFiles) {
        message.warning(`最多只能預覽 ${maxPreviewFiles} 個檔案`);
        return false;
      }

      // 檢查檔案大小
      if (file.size > maxFileSize) {
        message.error('檔案大小不能超過 20MB');
        return false;
      }

      // 檢查檔案類型
      const fileForCheck = {
        mimeType: file.type,
        filename: file.name
      };

      if (!isSupportedFile(fileForCheck)) {
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        message.error(`不支援的檔案類型: ${file.type || fileExtension}`);
        return false;
      }

      // 創建預覽物件
      const previewFile = {
        id: Date.now() + Math.random(), // 臨時ID
        file: file, // 原始檔案物件
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type,
        preview: null, // 預覽圖片 URL
      };

      // 如果是圖片，生成預覽
      if (file.type.startsWith('image/')) {
        try {
          const previewUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          previewFile.preview = previewUrl;
        } catch (error) {
          console.error('生成圖片預覽失敗:', error);
        }
      }

      // 添加到預覽列表
      previewFiles.value.push(previewFile);

      return true;
    } catch (error) {
      console.error('檔案預覽失敗:', error);
      message.error('檔案預覽失敗');
      return false;
    }
  };

  /**
   * 移除預覽檔案
   * @param {string|number} fileId - 檔案ID
   */
  const removePreviewFile = (fileId) => {
    previewFiles.value = previewFiles.value.filter((f) => f.id !== fileId);
  };

  /**
   * 清空所有預覽檔案
   */
  const clearPreviewFiles = () => {
    previewFiles.value = [];
  };

  /**
   * 拖拉檔案處理
   */
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    isDragOver.value = true;
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // 只有當離開整個輸入區域時才設為 false
    if (!e.currentTarget.contains(e.relatedTarget)) {
      isDragOver.value = false;
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    isDragOver.value = false;

    const files = Array.from(e.dataTransfer.files);

    for (const file of files) {
      await handleFilePreview(file);
    }
  };

  /**
   * 貼上檔案處理
   */
  const handlePaste = async (e) => {
    const items = Array.from(e.clipboardData.items);

    for (const item of items) {
      if (item.kind === 'file') {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await handleFilePreview(file);
        }
      }
    }
  };

  /**
   * 上傳預覽檔案到服務器
   * @returns {Promise<Array>} - 上傳成功的檔案附件列表
   */
  const uploadPreviewFiles = async () => {
    if (previewFiles.value.length === 0) {
      return [];
    }

    const { uploadFile } = await import('@/api/files.js');
    const finalAttachments = [];

    for (const previewFile of previewFiles.value) {
      try {
        const response = await uploadFile(previewFile.file);
        if (response.success) {
          finalAttachments.push({
            id: response.data.id,
            filename: response.data.filename,
            file_size: response.data.file_size,
            mime_type: response.data.mime_type,
            file_type: response.data.file_type,
          });
        }
      } catch (error) {
        console.error(`上傳檔案 "${previewFile.filename}" 失敗:`, error);
        message.error(`上傳檔案 "${previewFile.filename}" 失敗`);
      }
    }

    return finalAttachments;
  };

  /**
   * 檔案大小格式化
   * @param {number} bytes - 檔案大小（字節）
   * @returns {string} - 格式化後的檔案大小
   */
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return {
    // 響應式狀態
    previewFiles,
    isDragOver,
    maxPreviewFiles,
    maxFileSize,
    
    // 方法
    handleFilePreview,
    removePreviewFile,
    clearPreviewFiles,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handlePaste,
    uploadPreviewFiles,
    formatFileSize,
  };
} 
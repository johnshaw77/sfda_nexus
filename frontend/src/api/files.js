/**
 * 檔案管理相關 API
 */

import api from "./index.js";

/**
 * 上傳單個檔案
 * @param {File} file - 檔案對象
 * @param {Object} options - 上傳選項
 * @returns {Promise} API 響應
 */
export const uploadFile = async (file, options = {}) => {
  const formData = new FormData();
  formData.append("file", file);

  if (options.isPublic) {
    formData.append("is_public", "true");
  }

  const response = await api.post("/api/files/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: options.onProgress,
  });

  return response.data;
};

/**
 * 上傳多個檔案
 * @param {FileList|Array} files - 檔案列表
 * @param {Object} options - 上傳選項
 * @returns {Promise} API 響應
 */
export const uploadMultipleFiles = async (files, options = {}) => {
  const formData = new FormData();

  // 添加所有檔案
  Array.from(files).forEach((file) => {
    formData.append("files", file);
  });

  if (options.isPublic) {
    formData.append("is_public", "true");
  }

  const response = await api.post("/api/files/upload-multiple", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: options.onProgress,
  });

  return response.data;
};

/**
 * 獲取用戶檔案列表
 * @param {Object} params - 查詢參數
 * @returns {Promise} API 響應
 */
export const getUserFiles = async (params = {}) => {
  const response = await api.get("/api/files", { params });
  return response.data;
};

/**
 * 獲取檔案信息
 * @param {number} fileId - 檔案 ID
 * @returns {Promise} API 響應
 */
export const getFileInfo = async (fileId) => {
  const response = await api.get(`/api/files/${fileId}`);
  return response.data;
};

/**
 * 下載檔案
 * @param {number} fileId - 檔案 ID
 * @param {string} filename - 檔案名（可選）
 * @returns {Promise} 下載響應
 */
export const downloadFile = async (fileId, filename) => {
  const response = await api.get(`/api/files/${fileId}/download`, {
    responseType: "blob",
  });

  // 創建下載連結
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename || `file_${fileId}`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);

  return response;
};

/**
 * 刪除檔案
 * @param {number} fileId - 檔案 ID
 * @returns {Promise} API 響應
 */
export const deleteFile = async (fileId) => {
  const response = await api.delete(`/api/files/${fileId}`);
  return response.data;
};

/**
 * 獲取檔案統計信息
 * @returns {Promise} API 響應
 */
export const getFileStats = async () => {
  const response = await api.get("/api/files/stats");
  return response.data;
};

/**
 * 獲取檔案預覽 URL
 * @param {number} fileId - 檔案 ID
 * @returns {string} 預覽 URL
 */
export const getFilePreviewUrl = (fileId) => {
  return `${api.defaults.baseURL}/api/files/${fileId}/download`;
};

/**
 * 檢查檔案類型是否為圖片
 * @param {string} mimeType - MIME 類型
 * @returns {boolean} 是否為圖片
 */
export const isImageFile = (mimeType) => {
  return mimeType && mimeType.startsWith("image/");
};

/**
 * 檢查檔案類型是否為文檔
 * @param {string} mimeType - MIME 類型
 * @returns {boolean} 是否為文檔
 */
export const isDocumentFile = (mimeType) => {
  const documentTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
    "text/markdown",
  ];
  return documentTypes.includes(mimeType);
};

/**
 * 格式化檔案大小
 * @param {number} bytes - 檔案大小（位元組）
 * @returns {string} 格式化後的大小
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/**
 * 獲取檔案圖標
 * @param {string} mimeType - MIME 類型
 * @returns {string} 圖標名稱
 */
export const getFileIcon = (mimeType) => {
  if (isImageFile(mimeType)) {
    return "file-image";
  }

  if (mimeType === "application/pdf") {
    return "file-pdf";
  }

  if (mimeType.includes("word") || mimeType.includes("document")) {
    return "file-word";
  }

  if (mimeType.includes("excel") || mimeType.includes("sheet")) {
    return "file-excel";
  }

  if (mimeType.includes("powerpoint") || mimeType.includes("presentation")) {
    return "file-ppt";
  }

  if (mimeType.startsWith("text/")) {
    return "file-text";
  }

  if (mimeType.startsWith("audio/")) {
    return "file-audio";
  }

  if (mimeType.startsWith("video/")) {
    return "file-video";
  }

  if (
    mimeType.includes("zip") ||
    mimeType.includes("rar") ||
    mimeType.includes("7z")
  ) {
    return "file-zip";
  }

  return "file";
};

/**
 * 分析檔案內容
 * @param {number} fileId - 檔案 ID
 * @param {string} type - 分析類型 ('summarize' | 'generate')
 * @returns {Promise} API 響應
 */
export const analyzeFile = async (fileId, type) => {
  const response = await api.post(`/api/files/${fileId}/analyze`, {
    type,
  });
  return response.data;
};

/**
 * 針對檔案提問
 * @param {number} fileId - 檔案 ID
 * @param {string} question - 問題
 * @returns {Promise} API 響應
 */
export const askFileQuestion = async (fileId, question) => {
  const response = await api.post(`/api/files/${fileId}/ask`, {
    question,
  });
  return response.data;
};

/**
 * 獲取檔案內容
 * @param {number} fileId - 檔案 ID
 * @returns {Promise} API 響應
 */
export const getFileContent = async (fileId) => {
  const response = await api.get(`/api/files/${fileId}/content`);
  return response.data;
};

export default {
  uploadFile,
  uploadMultipleFiles,
  getUserFiles,
  getFileInfo,
  downloadFile,
  deleteFile,
  getFileStats,
  getFilePreviewUrl,
  isImageFile,
  isDocumentFile,
  formatFileSize,
  getFileIcon,
  analyzeFile,
  askFileQuestion,
  getFileContent,
};

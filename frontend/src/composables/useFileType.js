/**
 * 檔案類型判斷 Composable
 * 提供各種檔案類型的判斷函數
 */

export function useFileType() {
  // 獲取檔案的 MIME 類型和檔案名
  const getFileInfo = (file) => {
    if (typeof file === 'string') {
      return { mimeType: '', filename: file };
    }
    return {
      mimeType: file.mimeType || file.type || '',
      filename: file.filename || file.name || ''
    };
  };

  // 判斷是否為文檔檔案
  const isDocumentFile = (file) => {
    const { mimeType } = getFileInfo(file);
    const documentTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      // Excel MIME 類型
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      // PowerPoint MIME 類型
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "text/csv",
      "text/markdown",
      "text/x-markdown",
      "application/json",
      "text/javascript",
      "text/css",
      "text/html",
      "application/xml",
      "text/xml",
      "application/x-yaml",
      "text/yaml",
    ];
    return documentTypes.includes(mimeType);
  };

  // 判斷是否為 PDF 檔案
  const isPdfFile = (file) => {
    const { mimeType, filename } = getFileInfo(file);
    return (
      mimeType === "application/pdf" ||
      filename.toLowerCase().endsWith(".pdf")
    );
  };

  // 判斷是否為 Word 檔案
  const isWordFile = (file) => {
    const { mimeType, filename } = getFileInfo(file);
    return (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword" ||
      mimeType?.includes("word") ||
      filename.toLowerCase().endsWith(".doc") ||
      filename.toLowerCase().endsWith(".docx")
    );
  };

  // 判斷是否為 CSV 檔案
  const isCsvFile = (file) => {
    const { mimeType, filename } = getFileInfo(file);
    return (
      mimeType === "text/csv" ||
      filename.toLowerCase().endsWith(".csv")
    );
  };

  // 判斷是否為 Excel 檔案
  const isExcelFile = (file) => {
    const { mimeType, filename } = getFileInfo(file);
    return (
      mimeType?.includes("excel") ||
      mimeType?.includes("sheet") ||
      filename.toLowerCase().endsWith(".xls") ||
      filename.toLowerCase().endsWith(".xlsx")
    );
  };

  // 判斷是否為 PowerPoint 檔案
  const isPowerpointFile = (file) => {
    const { mimeType, filename } = getFileInfo(file);
    return (
      mimeType?.includes("powerpoint") ||
      mimeType?.includes("presentation") ||
      filename.toLowerCase().endsWith(".ppt") ||
      filename.toLowerCase().endsWith(".pptx")
    );
  };

  // 判斷是否為文字檔案
  const isTextFile = (file) => {
    const { mimeType, filename } = getFileInfo(file);
    return (
      mimeType?.includes("text/plain") ||
      filename.toLowerCase().endsWith(".txt") ||
      filename.toLowerCase().endsWith(".md") ||
      filename.toLowerCase().endsWith(".markdown")
    );
  };

  // 判斷是否為 JSON 檔案
  const isJsonFile = (file) => {
    const { mimeType, filename } = getFileInfo(file);
    return (
      mimeType?.includes("application/json") ||
      filename.toLowerCase().endsWith(".json")
    );
  };

  // 判斷是否為 XML 檔案
  const isXmlFile = (file) => {
    const { mimeType, filename } = getFileInfo(file);
    return (
      mimeType?.includes("application/xml") ||
      mimeType?.includes("text/xml") ||
      filename.toLowerCase().endsWith(".xml")
    );
  };

  // 判斷是否為程式碼檔案
  const isCodeFile = (file) => {
    const { filename } = getFileInfo(file);
    const codeExtensions = [
      '.js', '.ts', '.jsx', '.tsx', '.vue', '.py', '.java', 
      '.cpp', '.c', '.cs', '.php', '.rb', '.go', '.rs', 
      '.swift', '.kt', '.html', '.css', '.scss', '.sass',
      '.less', '.sql', '.sh', '.bash', '.ps1', '.yaml', '.yml'
    ];
    return codeExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  };

  // 判斷是否為圖片檔案
  const isImageFile = (file) => {
    const { mimeType, filename } = getFileInfo(file);
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];
    return (
      mimeType?.startsWith('image/') ||
      imageExtensions.some(ext => filename.toLowerCase().endsWith(ext))
    );
  };

  // 判斷是否為音頻檔案
  const isAudioFile = (file) => {
    const { mimeType, filename } = getFileInfo(file);
    const audioExtensions = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'];
    return (
      mimeType?.startsWith('audio/') ||
      audioExtensions.some(ext => filename.toLowerCase().endsWith(ext))
    );
  };

  // 判斷是否為視頻檔案
  const isVideoFile = (file) => {
    const { mimeType, filename } = getFileInfo(file);
    const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'];
    return (
      mimeType?.startsWith('video/') ||
      videoExtensions.some(ext => filename.toLowerCase().endsWith(ext))
    );
  };

  // 判斷是否為壓縮檔案
  const isArchiveFile = (file) => {
    const { mimeType, filename } = getFileInfo(file);
    const archiveExtensions = ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz'];
    const archiveMimeTypes = [
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      'application/x-tar',
      'application/gzip',
      'application/x-bzip2'
    ];
    return (
      archiveMimeTypes.includes(mimeType) ||
      archiveExtensions.some(ext => filename.toLowerCase().endsWith(ext))
    );
  };

  // 獲取檔案類型分類
  const getFileCategory = (file) => {
    if (isImageFile(file)) return 'image';
    if (isAudioFile(file)) return 'audio';
    if (isVideoFile(file)) return 'video';
    if (isArchiveFile(file)) return 'archive';
    if (isPdfFile(file)) return 'pdf';
    // PowerPoint 檔案檢查要在 Word 檔案之前，避免誤識別
    if (isPowerpointFile(file)) return 'powerpoint';
    if (isWordFile(file)) return 'word';
    if (isExcelFile(file)) return 'excel';
    if (isCsvFile(file)) return 'csv';
    if (isJsonFile(file)) return 'json';
    if (isXmlFile(file)) return 'xml';
    if (isTextFile(file)) return 'text';
    if (isCodeFile(file)) return 'code';
    return 'unknown';
  };

  // 獲取檔案圖示名稱
  const getFileIconName = (file) => {
    const category = getFileCategory(file);
    const iconMap = {
      pdf: 'FilePDF',
      word: 'FileWord',
      excel: 'FileExcel',
      powerpoint: 'FilePowerpoint',
      csv: 'FileCSV',
      image: 'FileImageOutlined',
      audio: 'SoundOutlined',
      video: 'VideoCameraOutlined',
      archive: 'FolderZipOutlined',
      code: 'CodeOutlined',
      text: 'FileTextOutlined',
      json: 'CodeOutlined',
      xml: 'CodeOutlined',
      unknown: 'FileOutlined'
    };
    return iconMap[category] || 'FileOutlined';
  };

  // 檢查檔案是否被支援
  const isSupportedFile = (file) => {
    const { mimeType, filename } = getFileInfo(file);
    
    // 支援的 MIME 類型
    const supportedMimeTypes = [
      // 圖片
      "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
      // 文檔
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      // 文本
      "text/plain", "text/csv", "text/markdown", "text/x-markdown",
      // 其他常見開發文件
      "application/json", "text/javascript", "text/css", "text/html",
      "application/xml", "text/xml", "application/x-yaml", "text/yaml",
    ];

    // 支援的文件擴展名
    const supportedExtensions = [
      ".xlsx", ".xls", ".csv", ".txt", ".docx", ".doc", ".pptx", ".ppt",
      ".pdf", ".md", ".markdown", ".ts", ".js", ".json", ".html", ".css", 
      ".xml", ".yaml", ".yml", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"
    ];

    const fileExtension = "." + filename.split('.').pop().toLowerCase();
    return supportedMimeTypes.includes(mimeType) || supportedExtensions.includes(fileExtension);
  };

  return {
    // 基本判斷函數
    isDocumentFile,
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
    
    // 輔助函數
    getFileCategory,
    getFileIconName,
    isSupportedFile,
    getFileInfo
  };
} 
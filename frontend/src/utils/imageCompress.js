/**
 * 圖片壓縮工具
 * 用於壓縮圖片文件並轉換為 base64 格式
 */

/**
 * 壓縮圖片文件
 * @param {File} file - 原始圖片文件
 * @param {Object} options - 壓縮選項
 * @param {number} options.maxWidth - 最大寬度，默認 400
 * @param {number} options.maxHeight - 最大高度，默認 400
 * @param {number} options.quality - 壓縮質量 0-1，默認 0.8
 * @param {string} options.outputFormat - 輸出格式，默認 'image/jpeg'
 * @returns {Promise<string>} 壓縮後的 base64 字符串
 */
export const compressImage = (file, options = {}) => {
  return new Promise((resolve, reject) => {
    const {
      maxWidth = 400,
      maxHeight = 400,
      quality = 0.8,
      outputFormat = "image/jpeg",
    } = options;

    // 創建 FileReader 讀取文件
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        try {
          // 計算壓縮後的尺寸
          const { width, height } = calculateDimensions(
            img.width,
            img.height,
            maxWidth,
            maxHeight
          );

          // 創建 canvas 進行壓縮
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          canvas.width = width;
          canvas.height = height;

          // 設置高質量的圖像渲染
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          // 繪製壓縮後的圖像
          ctx.drawImage(img, 0, 0, width, height);

          // 轉換為 base64
          const compressedBase64 = canvas.toDataURL(outputFormat, quality);

          resolve(compressedBase64);
        } catch (error) {
          reject(new Error("圖片壓縮失敗: " + error.message));
        }
      };

      img.onerror = () => {
        reject(new Error("圖片加載失敗"));
      };

      img.src = event.target.result;
    };

    reader.onerror = () => {
      reject(new Error("文件讀取失敗"));
    };

    reader.readAsDataURL(file);
  });
};

/**
 * 計算壓縮後的尺寸（保持寬高比）
 * @param {number} originalWidth - 原始寬度
 * @param {number} originalHeight - 原始高度
 * @param {number} maxWidth - 最大寬度
 * @param {number} maxHeight - 最大高度
 * @returns {Object} 計算後的尺寸 { width, height }
 */
const calculateDimensions = (
  originalWidth,
  originalHeight,
  maxWidth,
  maxHeight
) => {
  let { width, height } = { width: originalWidth, height: originalHeight };

  // 如果圖片尺寸小於最大限制，不需要縮放
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }

  // 計算縮放比例
  const widthRatio = maxWidth / width;
  const heightRatio = maxHeight / height;
  const ratio = Math.min(widthRatio, heightRatio);

  // 應用縮放比例
  width = Math.round(width * ratio);
  height = Math.round(height * ratio);

  return { width, height };
};

/**
 * 獲取圖片文件信息
 * @param {File} file - 圖片文件
 * @returns {Promise<Object>} 圖片信息
 */
export const getImageInfo = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
          size: file.size,
          type: file.type,
          name: file.name,
        });
      };

      img.onerror = () => {
        reject(new Error("無法獲取圖片信息"));
      };

      img.src = event.target.result;
    };

    reader.onerror = () => {
      reject(new Error("文件讀取失敗"));
    };

    reader.readAsDataURL(file);
  });
};

/**
 * 驗證圖片文件
 * @param {File} file - 圖片文件
 * @param {Object} options - 驗證選項
 * @param {number} options.maxSize - 最大文件大小（字節），默認 2MB
 * @param {Array} options.allowedTypes - 允許的文件類型，默認 ['image/jpeg', 'image/png', 'image/webp']
 * @returns {Object} 驗證結果 { valid: boolean, error?: string }
 */
export const validateImage = (file, options = {}) => {
  const {
    maxSize = 2 * 1024 * 1024, // 2MB
    allowedTypes = ["image/jpeg", "image/png", "image/webp"],
  } = options;

  // 檢查文件類型
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `不支持的文件格式。支持的格式：${allowedTypes.join(", ")}`,
    };
  }

  // 檢查文件大小
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `文件大小超出限制。最大允許 ${maxSizeMB}MB`,
    };
  }

  return { valid: true };
};

/**
 * 智能壓縮圖片（根據文件大小自動調整壓縮參數）
 * @param {File} file - 原始圖片文件
 * @param {Object} options - 壓縮選項
 * @param {number} options.targetSize - 目標大小（字節），默認 100KB
 * @param {number} options.maxWidth - 最大寬度，默認 400
 * @param {number} options.maxHeight - 最大高度，默認 400
 * @returns {Promise<string>} 壓縮後的 base64 字符串
 */
export const smartCompressImage = async (file, options = {}) => {
  const {
    targetSize = 100 * 1024, // 100KB
    maxWidth = 400,
    maxHeight = 400,
  } = options;

  // 獲取原始圖片信息
  const imageInfo = await getImageInfo(file);

  // 根據原始文件大小調整壓縮參數
  let quality = 0.8;
  let width = maxWidth;
  let height = maxHeight;

  if (imageInfo.size > 1024 * 1024) {
    // 大於 1MB
    quality = 0.6;
    width = Math.min(maxWidth, 300);
    height = Math.min(maxHeight, 300);
  } else if (imageInfo.size > 512 * 1024) {
    // 大於 512KB
    quality = 0.7;
    width = Math.min(maxWidth, 350);
    height = Math.min(maxHeight, 350);
  }

  // 執行壓縮
  const compressedBase64 = await compressImage(file, {
    maxWidth: width,
    maxHeight: height,
    quality,
    outputFormat: "image/jpeg", // 使用 JPEG 格式獲得更好的壓縮率
  });

  // 檢查壓縮後的大小
  const compressedSize = Math.round((compressedBase64.length * 3) / 4); // base64 大小估算

  console.log(
    `圖片壓縮完成: ${imageInfo.size} bytes -> ${compressedSize} bytes`
  );

  return compressedBase64;
};

export default {
  compressImage,
  getImageInfo,
  validateImage,
  smartCompressImage,
};

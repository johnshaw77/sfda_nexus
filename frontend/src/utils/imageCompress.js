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
 * @param {File|Blob} file - 原始圖片文件
 * @param {Object} options - 壓縮選項
 * @param {number} options.targetSize - 目標大小（字節），默認 100KB
 * @param {number} options.maxWidth - 最大寬度，默認 400
 * @param {number} options.maxHeight - 最大高度，默認 400
 * @param {number} options.minQuality - 最低壓縮質量，默認 0.5
 * @param {number} options.maxQuality - 最高壓縮質量，默認 0.9
 * @param {number} options.maxIterations - 最大嘗試次數，默認 5
 * @returns {Promise<string>} 壓縮後的 base64 字符串
 */
export const smartCompressImage = async (file, options = {}) => {
  const {
    targetSize = 100 * 1024, // 100KB
    maxWidth = 400,
    maxHeight = 400,
    minQuality = 0.5,
    maxQuality = 0.9,
    maxIterations = 5,
  } = options;

  // 獲取原始圖片信息
  const imageInfo = await getImageInfo(file);
  console.log("原始圖片信息:", imageInfo);

  // 如果原始圖片已經小於目標大小，使用高質量壓縮
  if (imageInfo.size <= targetSize) {
    return compressImage(file, {
      maxWidth,
      maxHeight,
      quality: maxQuality,
    });
  }

  // 二分法查找最佳壓縮質量
  let left = minQuality;
  let right = maxQuality;
  let bestResult = null;
  let iteration = 0;

  while (iteration < maxIterations) {
    const quality = (left + right) / 2;
    console.log(`嘗試壓縮質量: ${quality}`);

    const result = await compressImage(file, {
      maxWidth,
      maxHeight,
      quality,
    });

    // 計算當前結果大小
    const currentSize = Math.ceil(result.length * 0.75); // base64 to binary size
    console.log(`當前大小: ${currentSize} bytes`);

    // 如果當前結果在目標大小的 90-100% 範圍內，或者已經達到最大迭代次數，使用當前結果
    if (
      (currentSize >= targetSize * 0.9 && currentSize <= targetSize) ||
      iteration === maxIterations - 1
    ) {
      bestResult = result;
      break;
    }

    // 調整壓縮質量範圍
    if (currentSize > targetSize) {
      right = quality;
    } else {
      left = quality;
    }

    // 如果已經找到足夠好的結果，或者質量範圍已經很小，停止迭代
    if (right - left < 0.05) {
      bestResult = result;
      break;
    }

    iteration++;
  }

  // 如果沒有找到合適的結果，使用最低質量再次嘗試
  if (!bestResult) {
    console.log("使用最低質量壓縮");
    bestResult = await compressImage(file, {
      maxWidth,
      maxHeight,
      quality: minQuality,
    });
  }

  return bestResult;
};

/**
 * 優化圖片渲染質量
 * @param {CanvasRenderingContext2D} ctx - Canvas 上下文
 * @param {number} width - 目標寬度
 * @param {number} height - 目標高度
 */
const optimizeImageRendering = (ctx, width, height) => {
  // 設置最佳的圖像平滑算法
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // 根據縮放比例優化渲染
  const scale = Math.min(width / ctx.canvas.width, height / ctx.canvas.height);
  if (scale < 0.5) {
    // 對於顯著縮小的圖片，使用階段性縮放以提高質量
    let currentWidth = ctx.canvas.width;
    let currentHeight = ctx.canvas.height;
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");

    while (currentWidth * 0.5 > width) {
      tempCanvas.width = currentWidth * 0.5;
      tempCanvas.height = currentHeight * 0.5;
      tempCtx.drawImage(
        ctx.canvas,
        0,
        0,
        currentWidth,
        currentHeight,
        0,
        0,
        tempCanvas.width,
        tempCanvas.height
      );
      currentWidth = tempCanvas.width;
      currentHeight = tempCanvas.height;
      ctx.canvas.width = currentWidth;
      ctx.canvas.height = currentHeight;
      ctx.drawImage(tempCanvas, 0, 0);
    }
  }
};

export default {
  compressImage,
  getImageInfo,
  validateImage,
  smartCompressImage,
};

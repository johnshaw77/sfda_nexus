/**
 * PowerPoint 處理服務
 * 支援 .ppt 和 .pptx 檔案內容解析
 */

import logger from "../utils/logger.util.js";

/**
 * 檢查是否為支援的 PowerPoint 檔案
 * @param {string} filePath - 檔案路徑
 * @param {string} mimeType - MIME 類型
 * @returns {boolean}
 */
export function isSupportedPowerpointFile(filePath, mimeType) {
  const supportedMimes = [
    "application/vnd.ms-powerpoint", // .ppt
    "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  ];

  const supportedExtensions = [".ppt", ".pptx"];

  return (
    supportedMimes.includes(mimeType) ||
    supportedExtensions.some(ext => 
      filePath?.toLowerCase().endsWith(ext)
    )
  );
}

/**
 * 解析 PowerPoint 檔案內容
 * @param {string} filePath - 檔案路徑
 * @returns {Promise<string>} 解析後的文本內容
 */
export async function extractPowerpointText(filePath) {
  try {
    logger.debug("開始解析 PowerPoint 檔案", { filePath });

    // 檢查檔案是否為 .pptx 格式
    if (filePath.toLowerCase().endsWith('.pptx')) {
      return await extractPptxText(filePath);
    } else if (filePath.toLowerCase().endsWith('.ppt')) {
      return await extractPptText(filePath);
    } else {
      throw new Error("不支援的 PowerPoint 檔案格式");
    }
  } catch (error) {
    logger.error("PowerPoint 檔案解析失敗", {
      filePath,
      error: error.message
    });
    return `PowerPoint 檔案解析失敗：${error.message}`;
  }
}

/**
 * 解析 .pptx 檔案（Office Open XML 格式）
 * @param {string} filePath - 檔案路徑
 * @returns {Promise<string>} 解析後的文本內容
 */
async function extractPptxText(filePath) {
  try {
    // 動態導入 pizzip 和 xml2js
    const PizZip = (await import("pizzip")).default;
    const xml2js = await import("xml2js");
    const fs = await import("fs/promises");

    logger.debug("使用 pizzip 解析 .pptx 檔案", { filePath });

    // 讀取檔案
    const fileBuffer = await fs.readFile(filePath);
    const zip = new PizZip(fileBuffer);

    let extractedText = "";
    let slideCount = 0;

    // 遍歷所有檔案，查找投影片內容
    Object.keys(zip.files).forEach(filename => {
      // 查找投影片檔案 (slide1.xml, slide2.xml, ...)
      if (filename.startsWith('ppt/slides/slide') && filename.endsWith('.xml')) {
        slideCount++;
        
        try {
          const slideXml = zip.files[filename].asText();
          const slideText = extractTextFromSlideXml(slideXml);
          
          if (slideText.trim()) {
            extractedText += `\n=== 投影片 ${slideCount} ===\n`;
            extractedText += slideText + "\n";
          }
        } catch (slideError) {
          logger.warn(`解析投影片 ${slideCount} 失敗`, {
            filename,
            error: slideError.message
          });
          extractedText += `\n=== 投影片 ${slideCount} ===\n`;
          extractedText += `[投影片解析失敗: ${slideError.message}]\n`;
        }
      }
    });

    // 也嘗試解析筆記內容
    Object.keys(zip.files).forEach(filename => {
      if (filename.startsWith('ppt/notesSlides/notesSlide') && filename.endsWith('.xml')) {
        try {
          const notesXml = zip.files[filename].asText();
          const notesText = extractTextFromNotesXml(notesXml);
          
          if (notesText.trim()) {
            const slideNumber = filename.match(/notesSlide(\d+)\.xml/)?.[1] || '?';
            extractedText += `\n--- 投影片 ${slideNumber} 筆記 ---\n`;
            extractedText += notesText + "\n";
          }
        } catch (notesError) {
          logger.warn(`解析筆記失敗`, {
            filename,
            error: notesError.message
          });
        }
      }
    });

    if (!extractedText.trim()) {
      extractedText = "[未找到可解析的文本內容]";
    }

    logger.debug("PPTX 解析完成", {
      slideCount,
      textLength: extractedText.length
    });

    return extractedText.trim();

  } catch (error) {
    logger.error("PPTX 解析失敗", {
      filePath,
      error: error.message
    });
    throw new Error(`PPTX 檔案解析失敗: ${error.message}`);
  }
}

/**
 * 解析 .ppt 檔案（傳統格式）
 * @param {string} filePath - 檔案路徑
 * @returns {Promise<string>} 解析後的文本內容
 */
async function extractPptText(filePath) {
  try {
    logger.debug("嘗試解析 .ppt 檔案", { filePath });

    // .ppt 檔案解析較為複雜，需要專門的庫
    // 這裡提供一個基本的處理方式
    return `此 PowerPoint 檔案為較舊的 .ppt 格式。

建議轉換為 .pptx 格式以獲得更好的解析結果。

檔案路徑：${filePath}
檔案格式：Microsoft PowerPoint 97-2003 (.ppt)

[.ppt 格式的完整內容解析需要額外的專門庫支援]`;

  } catch (error) {
    logger.error("PPT 解析失敗", {
      filePath,
      error: error.message
    });
    throw new Error(`PPT 檔案解析失敗: ${error.message}`);
  }
}

/**
 * 從投影片 XML 中提取文本內容
 * @param {string} slideXml - 投影片 XML 內容
 * @returns {string} 提取的文本
 */
function extractTextFromSlideXml(slideXml) {
  try {
    // 使用正則表達式提取 <a:t> 標籤中的文本內容
    const textMatches = slideXml.match(/<a:t[^>]*>(.*?)<\/a:t>/g);
    
    if (!textMatches) {
      return "";
    }

    let extractedText = "";
    
    textMatches.forEach(match => {
      // 提取標籤內的內容
      const textContent = match.replace(/<a:t[^>]*>/, '').replace(/<\/a:t>/, '');
      
      // 解碼 HTML 實體
      const decodedText = textContent
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
      
      if (decodedText.trim()) {
        extractedText += decodedText.trim() + "\n";
      }
    });

    return extractedText.trim();
  } catch (error) {
    logger.warn("從投影片 XML 提取文本失敗", { error: error.message });
    return "[文本提取失敗]";
  }
}

/**
 * 從筆記 XML 中提取文本內容
 * @param {string} notesXml - 筆記 XML 內容
 * @returns {string} 提取的文本
 */
function extractTextFromNotesXml(notesXml) {
  try {
    // 筆記的結構類似投影片，但可能在不同的命名空間
    const textMatches = notesXml.match(/<a:t[^>]*>(.*?)<\/a:t>/g);
    
    if (!textMatches) {
      return "";
    }

    let extractedText = "";
    
    textMatches.forEach(match => {
      const textContent = match.replace(/<a:t[^>]*>/, '').replace(/<\/a:t>/, '');
      
      const decodedText = textContent
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
      
      if (decodedText.trim()) {
        extractedText += decodedText.trim() + "\n";
      }
    });

    return extractedText.trim();
  } catch (error) {
    logger.warn("從筆記 XML 提取文本失敗", { error: error.message });
    return "[筆記提取失敗]";
  }
}

export default {
  isSupportedPowerpointFile,
  extractPowerpointText,
}; 
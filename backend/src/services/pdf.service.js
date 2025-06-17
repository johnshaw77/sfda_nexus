/**
 * PDF 處理服務
 * 負責從 PDF 檔案中提取文字內容
 */

import fs from "fs/promises";
import pdfParse from "pdf-parse";
import logger from "../utils/logger.util.js";

/**
 * 從 PDF 檔案提取文字內容
 * @param {string} filePath - PDF 檔案路徑
 * @returns {Promise<string>} 提取的文字內容
 */
export async function extractPdfText(filePath) {
  try {
    console.log("🔍 開始解析 PDF 檔案:", filePath);

    // 讀取 PDF 檔案
    const dataBuffer = await fs.readFile(filePath);
    console.log("📄 PDF 檔案讀取完成，大小:", dataBuffer.length, "位元組");

    // 解析 PDF 內容
    const data = await pdfParse(dataBuffer);

    console.log("✅ PDF 解析成功:");
    console.log("  - 總頁數:", data.numpages);
    console.log("  - 文字長度:", data.text.length);
    console.log("  - 元數據:", JSON.stringify(data.info, null, 2));

    if (!data.text || data.text.trim().length === 0) {
      console.warn("⚠️ PDF 中沒有找到文字內容");
      return "此 PDF 檔案中沒有可提取的文字內容，可能是圖片型 PDF 或受保護的檔案。";
    }

    // 格式化輸出
    const formattedText = formatPdfText(data.text, data.numpages);

    console.log("🎯 PDF 文字提取完成，格式化後長度:", formattedText.length);

    return formattedText;
  } catch (error) {
    console.error("❌ PDF 解析失敗:", error);
    logger.error("PDF 文字提取失敗", {
      filePath,
      error: error.message,
      stack: error.stack,
    });

    // 根據錯誤類型提供友好的錯誤訊息
    if (error.message.includes("Password")) {
      return "此 PDF 檔案受密碼保護，無法提取內容。";
    } else if (error.message.includes("Invalid PDF")) {
      return "此檔案不是有效的 PDF 格式或已損壞。";
    } else {
      return `PDF 檔案處理失敗：${error.message}`;
    }
  }
}

/**
 * 格式化 PDF 提取的文字
 * @param {string} text - 原始文字
 * @param {number} pageCount - 頁數
 * @returns {string} 格式化後的文字
 */
function formatPdfText(text, pageCount) {
  // 清理多餘的空白和換行
  let cleanedText = text
    .replace(/\r\n/g, "\n") // 統一換行符
    .replace(/\r/g, "\n") // 統一換行符
    .replace(/\n{3,}/g, "\n\n") // 減少多餘換行
    .replace(/[ \t]{2,}/g, " ") // 減少多餘空格
    .trim();

  // 如果內容太長，提供預覽
  if (cleanedText.length > 8000) {
    const preview = cleanedText.substring(0, 8000);
    const remaining = cleanedText.length - 8000;
    cleanedText = `${preview}\n\n[... 還有 ${remaining} 個字符，內容已截斷 ...]`;
  }

  // 添加基本統計信息
  const stats = `\n--- PDF 文件統計 ---\n總頁數: ${pageCount}\n文字長度: ${text.length} 字符\n`;

  return stats + "\n" + cleanedText;
}

/**
 * 檢查檔案是否為 PDF
 * @param {string} filePath - 檔案路徑
 * @param {string} mimeType - MIME 類型
 * @returns {boolean} 是否為 PDF
 */
export function isPdfFile(filePath, mimeType) {
  return (
    mimeType === "application/pdf" || filePath.toLowerCase().endsWith(".pdf")
  );
}

/**
 * 獲取 PDF 基本信息（不提取全文）
 * @param {string} filePath - PDF 檔案路徑
 * @returns {Promise<object>} PDF 基本信息
 */
export async function getPdfInfo(filePath) {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer, { max: 1 }); // 只解析第一頁獲取信息

    return {
      pages: data.numpages,
      info: data.info,
      hasText: data.text && data.text.trim().length > 0,
    };
  } catch (error) {
    logger.error("獲取 PDF 信息失敗", { filePath, error: error.message });
    return null;
  }
}

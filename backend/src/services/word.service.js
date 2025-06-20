/**
 * WORD 文件處理服務
 * 負責從 WORD 檔案（.docx）中提取文字內容和結構化信息
 */

import mammoth from "mammoth";
import fs from "fs/promises";
import logger from "../utils/logger.util.js";

/**
 * 從 WORD 檔案提取文字內容
 * @param {string} filePath - WORD 檔案路徑
 * @param {Object} options - 解析選項
 * @returns {Promise<string>} 提取的文字內容
 */
export async function extractWordText(filePath, options = {}) {
  try {
    console.log("🔍 開始解析 WORD 檔案:", filePath);

    // 檢查檔案是否存在
    await fs.access(filePath);

    // 獲取檔案統計信息
    const stats = await fs.stat(filePath);
    console.log("📄 WORD 檔案讀取完成，大小:", stats.size, "位元組");

    // 配置 mammoth 選項
    const mammothOptions = {
      // 提取純文本時忽略所有格式
      ignoreEmptyParagraphs: true,
      ...options,
    };

    // 提取純文本內容
    const result = await mammoth.extractRawText(
      { path: filePath },
      mammothOptions
    );

    console.log("✅ WORD 解析成功:");
    console.log("  - 文字長度:", result.value.length);
    console.log("  - 警告訊息數:", result.messages.length);

    // 顯示解析過程中的訊息
    if (result.messages.length > 0) {
      console.log("⚠️ 解析訊息:");
      result.messages.forEach((msg, index) => {
        console.log(`  ${index + 1}. [${msg.type}] ${msg.message}`);
      });
    }

    if (!result.value || result.value.trim().length === 0) {
      console.warn("⚠️ WORD 檔案中沒有找到文字內容");
      return "此 WORD 檔案中沒有可提取的文字內容，可能是空白檔案或檔案已損壞。";
    }

    // 格式化輸出
    const formattedText = formatWordText(
      result.value,
      stats.size,
      result.messages
    );

    console.log("🎯 WORD 文字提取完成，格式化後長度:", formattedText.length);

    return formattedText;
  } catch (error) {
    console.error("❌ WORD 解析失敗:", error);
    logger.error("WORD 文字提取失敗", {
      filePath,
      error: error.message,
      stack: error.stack,
    });

    // 根據錯誤類型提供友好的錯誤訊息
    if (error.code === "ENOENT") {
      return "找不到指定的 WORD 檔案。";
    } else if (error.message.includes("Invalid")) {
      return "此檔案不是有效的 WORD 格式或已損壞。";
    } else if (
      error.message.includes("password") ||
      error.message.includes("protected")
    ) {
      return "此 WORD 檔案受密碼保護，無法提取內容。";
    } else {
      return `WORD 檔案處理失敗：${error.message}`;
    }
  }
}

/**
 * 從 WORD 檔案提取 HTML 內容（保留格式）
 * @param {string} filePath - WORD 檔案路徑
 * @param {Object} options - 解析選項
 * @returns {Promise<Object>} 包含 HTML 內容和訊息的對象
 */
export async function extractWordHTML(filePath, options = {}) {
  try {
    console.log("🔍 開始解析 WORD 檔案為 HTML:", filePath);

    // 檢查檔案是否存在
    await fs.access(filePath);

    // 獲取檔案統計信息
    const stats = await fs.stat(filePath);
    console.log("📄 WORD 檔案讀取完成，大小:", stats.size, "位元組");

    // 配置 mammoth 選項
    const mammothOptions = {
      // 自定義樣式映射
      styleMap: [
        "p[style-name='Heading 1'] => h1",
        "p[style-name='Heading 2'] => h2",
        "p[style-name='Heading 3'] => h3",
        "p[style-name='Heading 4'] => h4",
        "p[style-name='Heading 5'] => h5",
        "p[style-name='Heading 6'] => h6",
        "p[style-name='Quote'] => blockquote",
        "p[style-name='Code'] => pre",
        "r[style-name='Code Char'] => code",
      ],
      // 處理圖片
      convertImage: mammoth.images.imgElement(function (image) {
        return image.readAsBase64String().then(function (imageBuffer) {
          return {
            src: "data:" + image.contentType + ";base64," + imageBuffer,
          };
        });
      }),
      ignoreEmptyParagraphs: true,
      ...options,
    };

    // 轉換為 HTML
    const result = await mammoth.convertToHtml(
      { path: filePath },
      mammothOptions
    );

    console.log("✅ WORD 轉 HTML 成功:");
    console.log("  - HTML 長度:", result.value.length);
    console.log("  - 警告訊息數:", result.messages.length);

    // 顯示解析過程中的訊息
    if (result.messages.length > 0) {
      console.log("⚠️ 轉換訊息:");
      result.messages.forEach((msg, index) => {
        console.log(`  ${index + 1}. [${msg.type}] ${msg.message}`);
      });
    }

    return {
      html: result.value,
      messages: result.messages,
      fileSize: stats.size,
    };
  } catch (error) {
    console.error("❌ WORD 轉 HTML 失敗:", error);
    logger.error("WORD 轉 HTML 失敗", {
      filePath,
      error: error.message,
      stack: error.stack,
    });

    throw error;
  }
}

/**
 * 格式化 WORD 提取的文字
 * @param {string} text - 原始文字
 * @param {number} fileSize - 檔案大小
 * @param {Array} messages - 解析訊息
 * @returns {string} 格式化後的文字
 */
function formatWordText(text, fileSize, messages = []) {
  // 清理多餘的空白和換行
  let cleanedText = text
    .replace(/\r\n/g, "\n") // 統一換行符
    .replace(/\r/g, "\n") // 統一換行符
    .replace(/\n{3,}/g, "\n\n") // 減少多餘換行
    .replace(/[ \t]{2,}/g, " ") // 減少多餘空格
    .trim();

  // 如果內容太長，提供預覽
  if (cleanedText.length > 10000) {
    const preview = cleanedText.substring(0, 10000);
    const remaining = cleanedText.length - 10000;
    cleanedText = `${preview}\n\n[... 還有 ${remaining} 個字符，內容已截斷 ...]`;
  }

  // 計算文字統計
  const wordCount = cleanedText
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
  const lineCount = cleanedText.split("\n").length;
  const charCount = text.length;

  // 添加基本統計信息
  const stats = `\n--- WORD 文件統計 ---\n檔案大小: ${Math.round(fileSize / 1024)} KB\n文字長度: ${charCount} 字符\n單詞數量: ${wordCount}\n行數: ${lineCount}\n`;

  // 添加解析訊息（如果有）
  let messageInfo = "";
  if (messages.length > 0) {
    const warnings = messages.filter((m) => m.type === "warning").length;
    const errors = messages.filter((m) => m.type === "error").length;
    messageInfo = `解析訊息: ${messages.length} 條 (錯誤: ${errors}, 警告: ${warnings})\n`;
  }

  return stats + messageInfo + "\n" + cleanedText;
}

/**
 * 檢查檔案是否為 WORD 檔案
 * @param {string} filePath - 檔案路徑
 * @param {string} mimeType - MIME 類型
 * @returns {boolean} 是否為 WORD 檔案
 */
export function isWordFile(filePath, mimeType) {
  const wordMimeTypes = [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "application/msword", // .doc (舊格式，mammoth 不支援)
  ];

  const wordExtensions = [".docx", ".doc"];

  return (
    wordMimeTypes.includes(mimeType) ||
    wordExtensions.some((ext) => filePath.toLowerCase().endsWith(ext))
  );
}

/**
 * 檢查檔案是否為支援的 WORD 檔案格式
 * @param {string} filePath - 檔案路徑
 * @param {string} mimeType - MIME 類型
 * @returns {boolean} 是否為支援的 WORD 檔案格式
 */
export function isSupportedWordFile(filePath, mimeType) {
  // mammoth 只支援 .docx 格式
  return (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    filePath.toLowerCase().endsWith(".docx")
  );
}

/**
 * 獲取 WORD 基本信息（不提取全文）
 * @param {string} filePath - WORD 檔案路徑
 * @returns {Promise<object>} WORD 基本信息
 */
export async function getWordInfo(filePath) {
  try {
    const stats = await fs.stat(filePath);

    // 嘗試提取部分內容來檢測是否為有效的 WORD 檔案
    const result = await mammoth.extractRawText({ path: filePath });

    const hasText = result.value && result.value.trim().length > 0;
    const wordCount = hasText
      ? result.value.split(/\s+/).filter((word) => word.length > 0).length
      : 0;

    return {
      fileSize: stats.size,
      hasText: hasText,
      textLength: result.value ? result.value.length : 0,
      wordCount: wordCount,
      messages: result.messages,
      isValid: true,
    };
  } catch (error) {
    logger.error("獲取 WORD 信息失敗", { filePath, error: error.message });
    return {
      fileSize: null,
      hasText: false,
      textLength: 0,
      wordCount: 0,
      messages: [],
      isValid: false,
      error: error.message,
    };
  }
}

/**
 * 從 WORD 檔案提取結構化內容
 * @param {string} filePath - WORD 檔案路徑
 * @returns {Promise<Object>} 結構化內容
 */
export async function extractWordStructure(filePath) {
  try {
    console.log("🔍 開始提取 WORD 檔案結構:", filePath);

    // 提取 HTML 以獲得結構信息
    const htmlResult = await extractWordHTML(filePath);

    // 提取純文本
    const textResult = await mammoth.extractRawText({ path: filePath });

    // 基本分析
    const text = textResult.value;
    const html = htmlResult.html;

    // 分析結構
    const structure = analyzeWordStructure(text, html);

    return {
      text: text,
      html: html,
      structure: structure,
      messages: [...textResult.messages, ...htmlResult.messages],
      fileSize: htmlResult.fileSize,
    };
  } catch (error) {
    logger.error("WORD 結構提取失敗", {
      filePath,
      error: error.message,
    });
    throw error;
  }
}

/**
 * 分析 WORD 文件結構
 * @param {string} text - 純文本內容
 * @param {string} html - HTML 內容
 * @returns {Object} 結構分析結果
 */
function analyzeWordStructure(text, html) {
  const structure = {
    headings: [],
    paragraphs: 0,
    lists: [],
    tables: 0,
    images: 0,
    links: 0,
    wordCount: 0,
    characterCount: 0,
  };

  if (!text || !html) {
    return structure;
  }

  // 分析文字統計
  structure.wordCount = text
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
  structure.characterCount = text.length;

  // 分析 HTML 結構
  // 標題
  const headingMatches = html.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi);
  if (headingMatches) {
    structure.headings = headingMatches.map((match) => {
      const level = parseInt(match.match(/<h([1-6])/)[1]);
      const text = match.replace(/<[^>]*>/g, "").trim();
      return { level, text };
    });
  }

  // 段落（簡單計算 p 標籤數量）
  const paragraphMatches = html.match(/<p[^>]*>/gi);
  structure.paragraphs = paragraphMatches ? paragraphMatches.length : 0;

  // 列表
  const listMatches = html.match(/<[uo]l[^>]*>/gi);
  structure.lists = listMatches ? listMatches.length : 0;

  // 表格
  const tableMatches = html.match(/<table[^>]*>/gi);
  structure.tables = tableMatches ? tableMatches.length : 0;

  // 圖片
  const imageMatches = html.match(/<img[^>]*>/gi);
  structure.images = imageMatches ? imageMatches.length : 0;

  // 連結
  const linkMatches = html.match(/<a[^>]*>/gi);
  structure.links = linkMatches ? linkMatches.length : 0;

  return structure;
}

export default {
  extractWordText,
  extractWordHTML,
  extractWordStructure,
  isWordFile,
  isSupportedWordFile,
  getWordInfo,
};

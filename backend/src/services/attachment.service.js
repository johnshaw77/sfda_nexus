/**
 * 附件處理服務
 * 統一處理所有類型的附件：圖片、PDF、Word、Excel、文本檔案
 */

import { query } from "../config/database.config.js";
import { fixFilenameEncoding } from "../models/File.model.js";
import logger from "../utils/logger.util.js";

class AttachmentService {
  /**
   * 處理消息中的所有附件
   * @param {Array} attachments - 附件列表
   * @param {string} modelType - AI模型類型 (gemini, ollama, etc.)
   * @returns {Object} 處理結果
   */
  async processAttachments(attachments, modelType) {
    if (!attachments || attachments.length === 0) {
      return {
        multimodalContents: [],
        textContents: [],
        hasImages: false,
        hasDocuments: false
      };
    }

    const result = {
      multimodalContents: [], // 圖片等多模態內容
      textContents: [],       // 文本檔案內容
      hasImages: false,
      hasDocuments: false
    };

    logger.debug(`處理 ${attachments.length} 個附件`, { modelType });

    for (const attachment of attachments) {
      try {
        // 修復檔案名稱編碼
        if (attachment.filename) {
          attachment.filename = fixFilenameEncoding(attachment.filename);
        }

        const processedAttachment = await this.processAttachment(attachment, modelType);
        
        if (processedAttachment.type === 'image') {
          result.multimodalContents.push(processedAttachment.content);
          result.hasImages = true;
        } else if (processedAttachment.type === 'document') {
          result.textContents.push(processedAttachment.content);
          result.hasDocuments = true;
        }
      } catch (error) {
        logger.warn(`附件處理失敗: ${attachment.filename}`, {
          attachmentId: attachment.id,
          error: error.message
        });
      }
    }

    return result;
  }

  /**
   * 處理單個附件
   */
  async processAttachment(attachment, modelType) {
    const { rows: fileRows } = await query(
      "SELECT file_path, stored_filename FROM files WHERE id = ?",
      [attachment.id]
    );

    if (fileRows.length === 0) {
      throw new Error(`檔案記錄不存在: ${attachment.id}`);
    }

    const filePath = fileRows[0].file_path;

    // 判斷檔案類型並處理
    if (this.isImageFile(attachment)) {
      return await this.processImageFile(attachment, filePath, modelType);
    } else if (this.isDocumentFile(attachment)) {
      return await this.processDocumentFile(attachment, filePath);
    }

    throw new Error(`不支援的檔案類型: ${attachment.mime_type}`);
  }

  /**
   * 判斷是否為圖片檔案
   */
  isImageFile(attachment) {
    return attachment.mime_type?.startsWith("image/");
  }

  /**
   * 判斷是否為文檔檔案
   */
  isDocumentFile(attachment) {
    const documentMimes = [
      "text/",
      "application/json",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ];

    const documentExtensions = [
      ".csv", ".txt", ".md", ".pdf", ".docx", ".doc", ".xls", ".xlsx", ".ppt", ".pptx"
    ];

    return documentMimes.some(mime => attachment.mime_type?.startsWith(mime)) ||
           documentExtensions.some(ext => attachment.filename?.toLowerCase().endsWith(ext));
  }

  /**
   * 處理圖片檔案
   */
  async processImageFile(attachment, filePath, modelType) {
    const fs = await import("fs/promises");
    const fileBuffer = await fs.readFile(filePath);
    const base64Image = fileBuffer.toString("base64");
    const mimeType = attachment.mime_type;

    logger.debug(`圖片處理成功: ${attachment.filename}`, {
      base64Length: base64Image.length,
      mimeType
    });

    // 根據模型類型格式化圖片內容
    let content;
    if (modelType === "gemini") {
      content = {
        type: "image",
        source: {
          type: "base64",
          media_type: mimeType,
          data: base64Image,
        },
      };
    } else if (modelType === "ollama") {
      content = {
        type: "image_url",
        image_url: `data:${mimeType};base64,${base64Image}`,
      };
    } else {
      // 默認 OpenAI 格式
      content = {
        type: "image_url",
        image_url: { url: `data:${mimeType};base64,${base64Image}` },
      };
    }

    return {
      type: 'image',
      content
    };
  }

  /**
   * 處理文檔檔案
   */
  async processDocumentFile(attachment, filePath) {
    let fileContent = "";

    // 根據檔案類型選擇處理器
    if (this.isPdfFile(attachment)) {
      fileContent = await this.processPdfFile(filePath);
    } else if (this.isWordFile(attachment)) {
      fileContent = await this.processWordFile(filePath, attachment.mime_type);
    } else if (this.isExcelFile(attachment)) {
      fileContent = await this.processExcelFile(filePath);
    } else if (this.isPowerpointFile(attachment)) {
      fileContent = await this.processPowerpointFile(filePath, attachment.mime_type);
    } else {
      // 普通文本檔案
      const fs = await import("fs/promises");
      fileContent = await fs.readFile(filePath, "utf8");
    }

    logger.debug(`文檔處理成功: ${attachment.filename}`, {
      contentLength: fileContent.length
    });

    // 格式化文檔內容
    const formattedContent = `

--- 檔案：${attachment.filename} ---
檔案類型：${attachment.mime_type}
檔案大小：${attachment.file_size} 位元組

檔案內容：
\`\`\`
${fileContent}
\`\`\`
--- 檔案結束 ---

`;

    return {
      type: 'document',
      content: formattedContent
    };
  }

  /**
   * 檔案類型判斷方法
   */
  isPdfFile(attachment) {
    return attachment.mime_type === "application/pdf" ||
           attachment.filename?.toLowerCase().endsWith(".pdf");
  }

  isWordFile(attachment) {
    return attachment.mime_type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
           attachment.mime_type === "application/msword" ||
           attachment.filename?.toLowerCase().endsWith(".docx") ||
           attachment.filename?.toLowerCase().endsWith(".doc");
  }

  isExcelFile(attachment) {
    return attachment.mime_type === "application/vnd.ms-excel" ||
           attachment.mime_type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
           attachment.filename?.toLowerCase().endsWith(".xls") ||
           attachment.filename?.toLowerCase().endsWith(".xlsx");
  }

  isPowerpointFile(attachment) {
    return attachment.mime_type === "application/vnd.ms-powerpoint" ||
           attachment.mime_type === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
           attachment.filename?.toLowerCase().endsWith(".ppt") ||
           attachment.filename?.toLowerCase().endsWith(".pptx");
  }

  /**
   * 處理 PDF 檔案
   */
  async processPdfFile(filePath) {
    const { extractPdfText } = await import("./pdf.service.js");
    return await extractPdfText(filePath);
  }

  /**
   * 處理 Word 檔案
   */
  async processWordFile(filePath, mimeType) {
    const { extractWordText, isSupportedWordFile } = await import("./word.service.js");
    
    if (isSupportedWordFile(filePath, mimeType)) {
      return await extractWordText(filePath);
    } else {
      return "此 WORD 檔案格式不受支援。請使用 .docx 格式的檔案。";
    }
  }

  /**
   * 處理 Excel 檔案
   */
  async processExcelFile(filePath) {
    const { extractExcelData } = await import("./excel.service.js");
    
    const excelData = await extractExcelData(filePath);
    
    if (typeof excelData === 'string') {
      return `Excel 檔案解析失敗：${excelData}`;
    }

    // 格式化 Excel 數據
    let formattedContent = `Excel 檔案資訊：
檔案名稱：${excelData.filename}
檔案大小：${Math.round(excelData.fileSize / 1024)} KB
工作表數量：${excelData.totalSheets}
工作表名稱：${excelData.sheetNames.join(", ")}
總行數：${excelData.totalRows}
總儲存格數：${excelData.totalCells}

`;

    // 為每個工作表添加詳細數據
    Object.entries(excelData.sheets).forEach(([sheetName, sheetData]) => {
      formattedContent += `\n=== 工作表：${sheetName} ===\n`;
      formattedContent += `行數：${sheetData.totalRows}，列數：${sheetData.totalColumns}\n`;
      
      if (sheetData.headers && sheetData.headers.length > 0) {
        formattedContent += `列標題：${sheetData.headers.join(", ")}\n`;
        
        if (sheetData.rows && sheetData.rows.length > 0) {
          formattedContent += `\n數據樣本（前5行）：\n`;
          const sampleRows = sheetData.rows.slice(0, 5);
          sampleRows.forEach((row, index) => {
            const rowData = sheetData.headers.map(header => row[header] || "").join(" | ");
            formattedContent += `第${index + 1}行：${rowData}\n`;
          });
        }
      } else {
        formattedContent += `此工作表沒有數據\n`;
      }
    });

    return formattedContent;
  }

  /**
   * 處理 PowerPoint 檔案
   */
  async processPowerpointFile(filePath, mimeType) {
    const { extractPowerpointText, isSupportedPowerpointFile } = await import("./powerpoint.service.js");
    
    if (isSupportedPowerpointFile(filePath, mimeType)) {
      return await extractPowerpointText(filePath);
    } else {
      return "此 PowerPoint 檔案格式不受支援。請使用 .pptx 格式的檔案。";
    }
  }

  /**
   * 整合附件內容到消息中
   */
  integrateAttachmentsToMessage(formattedMessage, attachmentResult) {
    // 添加文檔內容到文本消息
    if (attachmentResult.textContents.length > 0) {
      const allTextContent = attachmentResult.textContents.join("");
      
      if (typeof formattedMessage.content === "string") {
        formattedMessage.content += allTextContent;
      } else if (Array.isArray(formattedMessage.content)) {
        const textPart = formattedMessage.content.find(part => part.type === "text");
        if (textPart) {
          textPart.text += allTextContent;
        }
      }
    }

    // 處理多模態內容（圖片）
    if (attachmentResult.multimodalContents.length > 0) {
      if (typeof formattedMessage.content === "string") {
        formattedMessage.content = [
          { type: "text", text: formattedMessage.content },
          ...attachmentResult.multimodalContents
        ];
      } else {
        formattedMessage.content = [
          ...formattedMessage.content,
          ...attachmentResult.multimodalContents
        ];
      }
    }

    return formattedMessage;
  }
}

export default new AttachmentService(); 
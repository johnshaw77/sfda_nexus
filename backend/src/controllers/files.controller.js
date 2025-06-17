/**
 * 檔案管理控制器
 * 處理檔案上傳、下載、管理等 HTTP 請求
 */

import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import FileModel from "../models/File.model.js";
import {
  catchAsync,
  createSuccessResponse,
  ValidationError,
  BusinessError,
  NotFoundError,
} from "../middleware/errorHandler.middleware.js";
import logger from "../utils/logger.util.js";
import appConfig from "../config/app.config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 確保上傳目錄存在
const uploadDir = path.resolve(__dirname, "../../uploads/attachments");
const ensureUploadDir = async () => {
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }
};

// 配置 multer 存儲
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await ensureUploadDir();
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 修復檔案名稱編碼問題
    let originalname = file.originalname;
    try {
      // 嘗試修復 UTF-8 編碼被錯誤解釋為 Latin-1 的問題
      if (
        Buffer.from(originalname, "latin1").toString("utf8") !== originalname
      ) {
        const fixedName = Buffer.from(originalname, "latin1").toString("utf8");
        // 檢查修復後的名稱是否包含有效的中文字符
        if (/[\u4e00-\u9fff]/.test(fixedName)) {
          originalname = fixedName;
          file.originalname = originalname; // 更新 file 對象中的原始名稱
          logger.info("檔案名稱編碼修復", {
            original: file.originalname,
            fixed: originalname,
          });
        }
      }
    } catch (error) {
      logger.warn("檔案名稱編碼修復失敗", {
        filename: file.originalname,
        error: error.message,
      });
    }

    const storedFilename = FileModel.generateStoredFilename(originalname);
    cb(null, storedFilename);
  },
});

// 檔案過濾器
const fileFilter = (req, file, cb) => {
  // 檢查檔案類型
  const allowedMimeTypes = [
    // 圖片
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    // 文檔
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    // 文本
    "text/plain",
    "text/csv",
    "text/markdown",
    // 壓縮檔
    "application/zip",
    "application/x-rar-compressed",
    "application/x-7z-compressed",
    // 音頻
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    // 視頻
    "video/mp4",
    "video/avi",
    "video/quicktime",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ValidationError(`不支援的檔案類型: ${file.mimetype}`), false);
  }
};

// 配置 multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: appConfig.upload.maxFileSize, // 10MB
    files: appConfig.upload.maxFiles || 5,
  },
});

/**
 * 上傳單個檔案
 * @route POST /api/files/upload
 * @access Private
 */
export const handleUploadFile = catchAsync(async (req, res) => {
  const uploadSingle = upload.single("file");

  uploadSingle(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        switch (err.code) {
          case "LIMIT_FILE_SIZE":
            throw new ValidationError("檔案大小超過限制 (10MB)");
          case "LIMIT_FILE_COUNT":
            throw new ValidationError("檔案數量超過限制");
          case "LIMIT_UNEXPECTED_FILE":
            throw new ValidationError("不允許的檔案字段");
          default:
            throw new ValidationError("檔案上傳失敗");
        }
      }
      throw err;
    }

    if (!req.file) {
      throw new ValidationError("請選擇要上傳的檔案");
    }

    try {
      // 讀取檔案內容計算雜湊值
      const fileBuffer = await fs.readFile(req.file.path);
      const fileHash = FileModel.generateFileHash(fileBuffer);

      // 檢查是否已存在相同檔案（去重）
      const existingFile = await FileModel.getFileByHash(fileHash);
      if (existingFile) {
        // 檢查檔案實體是否真的存在
        try {
          await fs.access(existingFile.file_path);
          // 檔案存在，進行去重
          await fs.unlink(req.file.path);

          logger.info("檔案去重", {
            user_id: req.user.id,
            existing_file_id: existingFile.id,
            duplicate_filename: req.file.originalname,
          });

          return res.json(
            createSuccessResponse(existingFile, "檔案已存在，返回現有檔案")
          );
        } catch (accessError) {
          // 檔案記錄存在但實體檔案不存在，刪除孤立記錄
          logger.warn("發現孤立檔案記錄，將清理", {
            file_id: existingFile.id,
            file_path: existingFile.file_path,
          });

          await FileModel.deleteFile(existingFile.id);
          // 繼續處理新檔案上傳
        }
      }

      // 確定檔案類型
      let fileType = "attachment";
      if (req.file.mimetype.startsWith("image/")) {
        fileType = "image";
      } else if (
        req.file.mimetype === "application/pdf" ||
        req.file.mimetype.includes("document") ||
        req.file.mimetype.includes("sheet") ||
        req.file.mimetype.includes("presentation") ||
        req.file.mimetype.includes("text/") ||
        req.file.originalname.toLowerCase().endsWith(".pdf")
      ) {
        fileType = "document";
      }

      // 創建檔案記錄
      const fileData = {
        user_id: req.user.id,
        filename: req.file.originalname,
        stored_filename: req.file.filename,
        file_path: req.file.path,
        file_size: req.file.size,
        mime_type: req.file.mimetype,
        file_hash: fileHash,
        file_type: fileType,
        metadata: {
          upload_ip: req.ip,
          user_agent: req.get("User-Agent"),
        },
        is_public: req.body.is_public === "true" || false,
      };

      const newFile = await FileModel.createFile(fileData);

      logger.info("檔案上傳成功", {
        user_id: req.user.id,
        file_id: newFile.id,
        filename: newFile.filename,
        file_size: newFile.file_size,
        file_type: newFile.file_type,
      });

      res.json(createSuccessResponse(newFile, "檔案上傳成功"));
    } catch (error) {
      // 如果處理失敗，清理已上傳的檔案
      if (req.file && req.file.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          logger.error("清理失敗的上傳檔案時出錯", unlinkError);
        }
      }
      throw error;
    }
  });
});

/**
 * 上傳多個檔案
 * @route POST /api/files/upload-multiple
 * @access Private
 */
export const handleUploadMultipleFiles = catchAsync(async (req, res) => {
  const uploadMultiple = upload.array("files", appConfig.upload.maxFiles || 5);

  uploadMultiple(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        switch (err.code) {
          case "LIMIT_FILE_SIZE":
            throw new ValidationError("檔案大小超過限制 (10MB)");
          case "LIMIT_FILE_COUNT":
            throw new ValidationError("檔案數量超過限制");
          default:
            throw new ValidationError("檔案上傳失敗");
        }
      }
      throw err;
    }

    if (!req.files || req.files.length === 0) {
      throw new ValidationError("請選擇要上傳的檔案");
    }

    const uploadedFiles = [];
    const errors = [];

    for (const file of req.files) {
      try {
        // 讀取檔案內容計算雜湊值
        const fileBuffer = await fs.readFile(file.path);
        const fileHash = FileModel.generateFileHash(fileBuffer);

        // 檢查是否已存在相同檔案
        const existingFile = await FileModel.getFileByHash(fileHash);
        if (existingFile) {
          // 檢查檔案實體是否真的存在
          try {
            await fs.access(existingFile.file_path);
            // 檔案存在，進行去重
            await fs.unlink(file.path);
            uploadedFiles.push(existingFile);
            continue;
          } catch (accessError) {
            // 檔案記錄存在但實體檔案不存在，刪除孤立記錄
            logger.warn("發現孤立檔案記錄，將清理", {
              file_id: existingFile.id,
              file_path: existingFile.file_path,
            });

            await FileModel.deleteFile(existingFile.id);
            // 繼續處理新檔案上傳
          }
        }

        // 確定檔案類型
        let fileType = "attachment";
        if (file.mimetype.startsWith("image/")) {
          fileType = "image";
        } else if (
          file.mimetype.includes("pdf") ||
          file.mimetype.includes("document") ||
          file.mimetype.includes("sheet") ||
          file.mimetype.includes("presentation") ||
          file.mimetype.includes("text/")
        ) {
          fileType = "document";
        }

        // 創建檔案記錄
        const fileData = {
          user_id: req.user.id,
          filename: file.originalname,
          stored_filename: file.filename,
          file_path: file.path,
          file_size: file.size,
          mime_type: file.mimetype,
          file_hash: fileHash,
          file_type: fileType,
          metadata: {
            upload_ip: req.ip,
            user_agent: req.get("User-Agent"),
          },
          is_public: req.body.is_public === "true" || false,
        };

        const newFile = await FileModel.createFile(fileData);
        uploadedFiles.push(newFile);
      } catch (error) {
        errors.push({
          filename: file.originalname,
          error: error.message,
        });

        // 清理失敗的檔案
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          logger.error("清理失敗的上傳檔案時出錯", unlinkError);
        }
      }
    }

    logger.info("批量檔案上傳完成", {
      user_id: req.user.id,
      success_count: uploadedFiles.length,
      error_count: errors.length,
    });

    res.json(
      createSuccessResponse(
        {
          files: uploadedFiles,
          errors: errors,
        },
        `成功上傳 ${uploadedFiles.length} 個檔案`
      )
    );
  });
});

/**
 * 下載檔案
 * @route GET /api/files/:id/download
 * @access Private
 */
export const handleDownloadFile = catchAsync(async (req, res) => {
  const { id } = req.params;

  const file = await FileModel.getFileById(parseInt(id));
  if (!file) {
    throw new NotFoundError("檔案不存在");
  }

  // 檢查存取權限
  const hasAccess = await FileModel.checkFileAccess(file.id, req.user.id);
  if (!hasAccess) {
    throw new BusinessError("沒有權限存取此檔案");
  }

  // 檢查檔案是否存在於磁碟
  try {
    await fs.access(file.file_path);
  } catch {
    throw new NotFoundError("檔案不存在於伺服器");
  }

  // 更新下載次數
  await FileModel.incrementDownloadCount(file.id);

  logger.info("檔案下載", {
    user_id: req.user.id,
    file_id: file.id,
    filename: file.filename,
  });

  // 設置響應頭 - 允許 CORS 和內聯顯示
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${encodeURIComponent(file.filename)}"`
  );
  res.setHeader("Content-Type", file.mime_type);
  res.setHeader("Content-Length", file.file_size);

  // 發送檔案
  res.sendFile(path.resolve(file.file_path));
});

/**
 * 預覽檔案（內聯顯示，適用於圖片）
 * @route GET /api/files/:id/preview
 * @access Private
 */
export const handlePreviewFile = catchAsync(async (req, res) => {
  const { id } = req.params;

  const file = await FileModel.getFileById(parseInt(id));
  if (!file) {
    throw new NotFoundError("檔案不存在");
  }

  // 檢查存取權限
  const hasAccess = await FileModel.checkFileAccess(file.id, req.user.id);
  if (!hasAccess) {
    throw new BusinessError("沒有權限存取此檔案");
  }

  // 檢查檔案是否存在於磁碟
  try {
    await fs.access(file.file_path);
  } catch {
    throw new NotFoundError("檔案不存在於伺服器");
  }

  logger.info("檔案預覽", {
    user_id: req.user.id,
    file_id: file.id,
    filename: file.filename,
  });

  // 設置響應頭 - 內聯顯示，允許跨域
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Content-Type", file.mime_type);
  res.setHeader("Content-Length", file.file_size);
  res.setHeader("Cache-Control", "public, max-age=31536000"); // 快取1年

  // 對於圖片，使用 inline 顯示
  if (file.mime_type.startsWith("image/")) {
    res.setHeader("Content-Disposition", "inline");
  } else {
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(file.filename)}"`
    );
  }

  // 發送檔案
  res.sendFile(path.resolve(file.file_path));
});

/**
 * 獲取檔案信息
 * @route GET /api/files/:id
 * @access Private
 */
export const handleGetFileInfo = catchAsync(async (req, res) => {
  const { id } = req.params;

  const file = await FileModel.getFileById(parseInt(id));
  if (!file) {
    throw new NotFoundError("檔案不存在");
  }

  // 檢查存取權限
  const hasAccess = await FileModel.checkFileAccess(file.id, req.user.id);
  if (!hasAccess) {
    throw new BusinessError("沒有權限存取此檔案");
  }

  // 不返回敏感信息
  const { file_path, file_hash, ...safeFileInfo } = file;

  res.json(createSuccessResponse(safeFileInfo, "獲取檔案信息成功"));
});

/**
 * 獲取用戶檔案列表
 * @route GET /api/files
 * @access Private
 */
export const handleGetUserFiles = catchAsync(async (req, res) => {
  const { file_type, page = 1, limit = 20 } = req.query;

  const offset = (page - 1) * limit;
  const files = await FileModel.getUserFiles(req.user.id, {
    file_type,
    limit: parseInt(limit),
    offset: parseInt(offset),
  });

  // 移除敏感信息
  const safeFiles = files.map((file) => {
    const { file_path, file_hash, ...safeFile } = file;
    return safeFile;
  });

  logger.info("獲取用戶檔案列表", {
    user_id: req.user.id,
    file_count: safeFiles.length,
    file_type: file_type || "all",
  });

  res.json(createSuccessResponse(safeFiles, "獲取檔案列表成功"));
});

/**
 * 刪除檔案
 * @route DELETE /api/files/:id
 * @access Private
 */
export const handleDeleteFile = catchAsync(async (req, res) => {
  const { id } = req.params;

  const file = await FileModel.getFileById(parseInt(id));
  if (!file) {
    throw new NotFoundError("檔案不存在");
  }

  // 只有檔案擁有者可以刪除
  if (file.user_id !== req.user.id) {
    throw new BusinessError("沒有權限刪除此檔案");
  }

  // 刪除磁碟上的檔案
  try {
    await fs.unlink(file.file_path);
  } catch (error) {
    logger.warn("刪除磁碟檔案失敗", {
      file_id: file.id,
      file_path: file.file_path,
      error: error.message,
    });
  }

  // 刪除資料庫記錄
  await FileModel.deleteFile(file.id);

  logger.audit(req.user.id, "FILE_DELETED", {
    file_id: file.id,
    filename: file.filename,
  });

  res.json(createSuccessResponse(null, "檔案刪除成功"));
});

/**
 * 獲取檔案統計信息
 * @route GET /api/files/stats
 * @access Private
 */
export const handleGetFileStats = catchAsync(async (req, res) => {
  const stats = await FileModel.getFileStats(req.user.id);

  res.json(createSuccessResponse(stats, "獲取檔案統計成功"));
});

/**
 * 獲取檔案內容
 * @route GET /api/files/:id/content
 * @access Private
 */
export const handleGetFileContent = catchAsync(async (req, res) => {
  const { id } = req.params;

  const file = await FileModel.getFileById(parseInt(id));
  if (!file) {
    throw new NotFoundError("檔案不存在");
  }

  // 檢查存取權限
  const hasAccess = await FileModel.checkFileAccess(file.id, req.user.id);
  if (!hasAccess) {
    throw new BusinessError("沒有權限存取此檔案");
  }

  // 檢查檔案是否為文本類型
  const textTypes = [
    "text/plain",
    "text/markdown",
    "text/csv",
    "application/json",
    "text/html",
    "text/css",
    "text/javascript",
  ];

  const isTextFile =
    textTypes.includes(file.mime_type) ||
    file.filename.endsWith(".md") ||
    file.filename.endsWith(".txt") ||
    file.filename.endsWith(".js") ||
    file.filename.endsWith(".json");

  if (!isTextFile) {
    throw new BusinessError("只支援文本類型檔案的內容讀取");
  }

  try {
    // 讀取檔案內容
    const content = await fs.readFile(file.file_path, "utf8");

    logger.info("獲取檔案內容", {
      user_id: req.user.id,
      file_id: file.id,
      filename: file.filename,
      content_length: content.length,
    });

    res.json(
      createSuccessResponse(
        {
          content,
          encoding: "utf8",
          filename: file.filename,
          mime_type: file.mime_type,
        },
        "獲取檔案內容成功"
      )
    );
  } catch (error) {
    logger.error("讀取檔案內容失敗", {
      file_id: file.id,
      error: error.message,
    });
    throw new BusinessError("無法讀取檔案內容");
  }
});

/**
 * 分析檔案內容
 * @route POST /api/files/:id/analyze
 * @access Private
 */
export const handleAnalyzeFile = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { type, model = "qwen3:8b" } = req.body;

  if (!["summarize", "generate", "csv_analysis"].includes(type)) {
    throw new ValidationError(
      "無效的分析類型，支援: summarize, generate, csv_analysis"
    );
  }

  const file = await FileModel.getFileById(parseInt(id));
  if (!file) {
    throw new NotFoundError("檔案不存在");
  }

  // 檢查存取權限
  const hasAccess = await FileModel.checkFileAccess(file.id, req.user.id);
  if (!hasAccess) {
    throw new BusinessError("沒有權限存取此檔案");
  }

  let result;

  try {
    // 如果是 CSV 分析，使用專門的 CSV 服務
    if (type === "csv_analysis" && file.mime_type === "text/csv") {
      // 動態導入 CSV 服務
      const { CSVService } = await import("../services/csv.service.js");

      console.log("=== 開始 CSV 專業分析 ===");
      console.log("檔案:", file.filename);
      console.log("大小:", file.file_size, "位元組");
      console.log("使用模型:", model);

      // 使用專業的 CSV 分析服務
      const csvAnalysis = await CSVService.analyzeCSVFile(file.file_path, {
        includeAIInsights: true,
        model: model,
        maxRows: 5000, // 限制最大處理行數
      });

      result = {
        analysis_type: "csv_professional",
        csv_data: {
          filename: file.filename,
          total_rows: csvAnalysis.csvData.totalRows,
          total_columns: csvAnalysis.csvData.totalColumns,
          headers: csvAnalysis.csvData.headers,
          sample_rows: csvAnalysis.csvData.sample_rows,
        },
        data_types: csvAnalysis.typeAnalysis,
        statistics: csvAnalysis.basicStats,
        quality_report: csvAnalysis.qualityReport,
        ai_insights: csvAnalysis.aiInsights,
        metadata: csvAnalysis.metadata,
        model_used: model,
      };

      console.log("=== CSV 分析完成 ===");
      console.log("數據行數:", csvAnalysis.csvData.totalRows);
      console.log("欄位數量:", csvAnalysis.csvData.totalColumns);
      console.log(
        "品質分數:",
        csvAnalysis.qualityReport.summary.quality_score.toFixed(1)
      );
      console.log(
        "AI 洞察長度:",
        csvAnalysis.aiInsights?.insights?.length || 0
      );
    } else {
      // 其他類型的文件分析
      let fileContent = "";
      try {
        fileContent = await fs.readFile(file.file_path, "utf8");
      } catch (error) {
        throw new BusinessError("無法讀取檔案內容");
      }

      // 動態導入 AI 服務
      const { AIService } = await import("../services/ai.service.js");

      let aiPrompt = "";

      if (type === "summarize") {
        aiPrompt = `請總結以下檔案的關鍵要點：

檔案名稱：${file.filename}
檔案類型：${file.mime_type}
檔案大小：${file.file_size} 位元組

檔案內容：
\`\`\`
${fileContent.substring(0, 8000)}${fileContent.length > 8000 ? "\n... (內容過長，已截取前8000字符)" : ""}
\`\`\`

請提供：
1. 內容摘要
2. 關鍵要點
3. 主要發現
4. 建議行動

請用繁體中文回答。`;
      } else if (type === "generate") {
        aiPrompt = `基於以下檔案內容，生成一份詳細的分析報告：

檔案名稱：${file.filename}
檔案類型：${file.mime_type}
檔案大小：${file.file_size} 位元組

檔案內容：
\`\`\`
${fileContent.substring(0, 8000)}${fileContent.length > 8000 ? "\n... (內容過長，已截取前8000字符)" : ""}
\`\`\`

請生成一份包含以下部分的完整報告：
1. 執行摘要
2. 詳細分析
3. 發現和洞察
4. 建議和下一步行動
5. 結論

請用繁體中文撰寫，格式要專業且易讀。`;
      }

      // 調用 AI 模型進行分析
      const aiResponse = await AIService.callOllama({
        model: model,
        messages: [
          {
            role: "system",
            content:
              "你是一個專業的數據分析師和文檔分析專家。請提供詳細、準確且有洞察力的分析。",
          },
          {
            role: "user",
            content: aiPrompt,
          },
        ],
        temperature: 0.3, // 較低溫度確保分析的一致性
        max_tokens: 4096,
        enable_thinking: true, // 啟用思考模式
      });

      if (type === "summarize") {
        result = {
          analysis_type: "text_summary",
          summary: aiResponse.content,
          thinking_process: aiResponse.thinking_content,
          model_used: model,
          processing_time: aiResponse.processing_time,
        };
      } else {
        result = {
          analysis_type: "text_report",
          document: aiResponse.content,
          thinking_process: aiResponse.thinking_content,
          model_used: model,
          processing_time: aiResponse.processing_time,
        };
      }
    }

    logger.info("AI 檔案分析完成", {
      user_id: req.user.id,
      file_id: file.id,
      analysis_type: type,
      model_used: model,
      file_type: file.mime_type,
    });
  } catch (aiError) {
    logger.error("AI 分析失敗", {
      user_id: req.user.id,
      file_id: file.id,
      analysis_type: type,
      error: aiError.message,
    });

    // 降級到基本分析
    if (type === "csv_analysis") {
      try {
        const fileContent = await fs.readFile(file.file_path, "utf8");
        const lines = fileContent.split("\n");
        const headers = lines[0] ? lines[0].split(",") : [];

        result = {
          analysis_type: "csv_basic",
          analysis: `CSV 檔案基本分析：\n\n• 檔案名稱：${file.filename}\n• 估計行數：${lines.length - 1}\n• 欄位數量：${headers.length}\n• 欄位名稱：${headers.join(", ")}\n\n注意：AI 分析服務暫時不可用，這是基本的結構分析。`,
          error: "AI 服務不可用，提供基本分析",
          file_info: {
            filename: file.filename,
            size: file.file_size,
            mime_type: file.mime_type,
            rows_estimated: lines.length - 1,
            columns_estimated: headers.length,
          },
        };
      } catch (readError) {
        result = {
          analysis_type: "error",
          error: "無法讀取檔案內容",
          file_info: {
            filename: file.filename,
            size: file.file_size,
            mime_type: file.mime_type,
          },
        };
      }
    } else {
      // 使用原有的示例實現作為降級方案
      if (type === "summarize") {
        result = {
          analysis_type: "basic_summary",
          summary: `檔案 "${file.filename}" 的基本信息：\n\n• 檔案大小：${file.file_size} 位元組\n• 檔案類型：${file.mime_type}\n• 上傳時間：${file.created_at}\n\n注意：AI 分析服務暫時不可用。`,
          error: "AI 服務不可用",
        };
      } else {
        result = {
          analysis_type: "basic_report",
          document: `# ${file.filename} 基本報告\n\n## 檔案資訊\n- 檔案名稱：${file.filename}\n- 檔案大小：${file.file_size} 位元組\n- MIME 類型：${file.mime_type}\n- 上傳時間：${file.created_at}\n\n注意：AI 分析服務暫時不可用，這是基本的檔案信息報告。`,
          error: "AI 服務不可用",
        };
      }
    }
  }

  res.json(
    createSuccessResponse(
      result,
      `檔案${type === "csv_analysis" ? "CSV分析" : type === "summarize" ? "總結" : "文檔生成"}完成`
    )
  );
});

/**
 * 針對檔案提問
 * @route POST /api/files/:id/ask
 * @access Private
 */
export const handleAskFileQuestion = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { question, model = "qwen3:8b" } = req.body;

  if (!question || !question.trim()) {
    throw new ValidationError("問題不能為空");
  }

  const file = await FileModel.getFileById(parseInt(id));
  if (!file) {
    throw new NotFoundError("檔案不存在");
  }

  // 檢查存取權限
  const hasAccess = await FileModel.checkFileAccess(file.id, req.user.id);
  if (!hasAccess) {
    throw new BusinessError("沒有權限存取此檔案");
  }

  // 獲取檔案內容
  let fileContent = "";
  try {
    fileContent = await fs.readFile(file.file_path, "utf8");
  } catch (error) {
    throw new BusinessError("無法讀取檔案內容");
  }

  // 動態導入 AI 服務
  const { AIService } = await import("../services/ai.service.js");

  let answer = "";
  let thinkingProcess = "";

  try {
    // 構建針對檔案內容的問答提示
    const aiPrompt = `基於以下檔案內容回答用戶問題：

檔案名稱：${file.filename}
檔案類型：${file.mime_type}
檔案大小：${file.file_size} 位元組

檔案內容：
\`\`\`
${fileContent.substring(0, 8000)}${fileContent.length > 8000 ? "\n... (內容過長，已截取前8000字符)" : ""}
\`\`\`

用戶問題：${question}

請基於檔案內容提供準確、詳細的回答。如果檔案內容不足以回答問題，請明確說明。請用繁體中文回答。`;

    // 調用 AI 模型
    const aiResponse = await AIService.callOllama({
      model: model,
      messages: [
        {
          role: "system",
          content:
            "你是一個專業的文檔分析助手。請基於提供的檔案內容準確回答用戶問題，如果內容不足以回答請誠實說明。",
        },
        {
          role: "user",
          content: aiPrompt,
        },
      ],
      temperature: 0.2, // 較低溫度確保回答的準確性
      max_tokens: 2048,
      enable_thinking: true,
    });

    answer = aiResponse.content;
    thinkingProcess = aiResponse.thinking_content;

    logger.info("AI 檔案問答完成", {
      user_id: req.user.id,
      file_id: file.id,
      question_length: question.length,
      answer_length: answer.length,
      model_used: model,
      processing_time: aiResponse.processing_time,
    });
  } catch (aiError) {
    logger.error("AI 問答失敗", {
      user_id: req.user.id,
      file_id: file.id,
      question: question.substring(0, 100),
      error: aiError.message,
    });

    // 降級到基本回答
    answer = `關於檔案 "${file.filename}" 的問題「${question}」：\n\n很抱歉，AI 分析服務暫時不可用。\n\n基於檔案基本信息：\n- 檔案大小：${file.file_size} 位元組\n- 檔案類型：${file.mime_type}\n- 上傳時間：${file.created_at}\n\n建議稍後重試或聯繫系統管理員。`;
  }

  res.json(
    createSuccessResponse(
      {
        answer,
        thinking_process: thinkingProcess,
        question,
        filename: file.filename,
        model_used: model,
        file_info: {
          size: file.file_size,
          type: file.mime_type,
          content_length: fileContent.length,
        },
      },
      "問答完成"
    )
  );
});

export default {
  handleUploadFile,
  handleUploadMultipleFiles,
  handleDownloadFile,
  handleGetFileInfo,
  handleGetUserFiles,
  handleDeleteFile,
  handleGetFileStats,
  handleGetFileContent,
  handleAnalyzeFile,
  handleAskFileQuestion,
};

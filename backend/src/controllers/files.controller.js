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
    const storedFilename = FileModel.generateStoredFilename(file.originalname);
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
        // 刪除剛上傳的重複檔案
        await fs.unlink(req.file.path);

        logger.info("檔案去重", {
          user_id: req.user.id,
          existing_file_id: existingFile.id,
          duplicate_filename: req.file.originalname,
        });

        return res.json(
          createSuccessResponse(existingFile, "檔案已存在，返回現有檔案")
        );
      }

      // 確定檔案類型
      let fileType = "attachment";
      if (req.file.mimetype.startsWith("image/")) {
        fileType = "image";
      } else if (
        req.file.mimetype.includes("pdf") ||
        req.file.mimetype.includes("document") ||
        req.file.mimetype.includes("sheet") ||
        req.file.mimetype.includes("presentation") ||
        req.file.mimetype.includes("text/")
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
          await fs.unlink(file.path);
          uploadedFiles.push(existingFile);
          continue;
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
  const { type } = req.body;

  if (!["summarize", "generate"].includes(type)) {
    throw new ValidationError("無效的分析類型，支援: summarize, generate");
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
  const contentResponse = await handleGetFileContent(
    { ...req, params: { id } },
    { json: () => ({ data: { content: null } }) }
  );

  // 這是一個簡化的實現，實際應該調用 AI 服務
  let result;
  if (type === "summarize") {
    result = {
      summary: `這是檔案 "${file.filename}" 的關鍵要點總結：\n\n• 檔案大小：${file.file_size} 位元組\n• 檔案類型：${file.mime_type}\n• 上傳時間：${file.created_at}\n\n注意：這是一個示例總結，實際實現需要整合 AI 模型來分析檔案內容。`,
    };
  } else {
    result = {
      document: `基於檔案 "${file.filename}" 生成的文檔：\n\n# ${file.filename} 分析報告\n\n## 檔案資訊\n- 檔案名稱：${file.filename}\n- 檔案大小：${file.file_size} 位元組\n- MIME 類型：${file.mime_type}\n- 上傳時間：${file.created_at}\n\n## 內容分析\n\n待實現：需要整合 AI 模型來生成更詳細的分析報告。\n\n## 建議\n\n1. 檔案結構良好\n2. 建議進一步優化\n3. 可以考慮添加更多功能\n\n---\n*本報告由 SFDA Nexus 系統自動生成*`,
    };
  }

  logger.info("檔案分析完成", {
    user_id: req.user.id,
    file_id: file.id,
    analysis_type: type,
  });

  res.json(
    createSuccessResponse(
      result,
      `檔案${type === "summarize" ? "總結" : "文檔生成"}完成`
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
  const { question } = req.body;

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

  // 這是一個簡化的實現，實際應該調用 AI 服務
  const answer = `關於檔案 "${file.filename}" 的問題「${question}」：\n\n基於檔案信息，我可以告訴您：\n- 檔案大小：${file.file_size} 位元組\n- 檔案類型：${file.mime_type}\n- 上傳時間：${file.created_at}\n\n注意：這是一個示例回答。要獲得更準確的答案，需要整合 AI 模型來分析檔案的實際內容並回答您的問題。\n\n如果您有其他關於此檔案的問題，請隨時提問！`;

  logger.info("檔案問答完成", {
    user_id: req.user.id,
    file_id: file.id,
    question_length: question.length,
  });

  res.json(
    createSuccessResponse(
      {
        answer,
        question,
        filename: file.filename,
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

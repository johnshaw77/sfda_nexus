/**
 * 檔案管理路由
 * 處理檔案上傳、下載、管理等路由
 */

import express from "express";
import {
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
} from "../controllers/files.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { rateLimiters } from "../middleware/rateLimit.middleware.js";

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     File:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 檔案 ID
 *         user_id:
 *           type: integer
 *           description: 上傳用戶 ID
 *         filename:
 *           type: string
 *           description: 原始檔案名
 *         stored_filename:
 *           type: string
 *           description: 存儲檔案名
 *         file_size:
 *           type: integer
 *           description: 檔案大小（位元組）
 *         mime_type:
 *           type: string
 *           description: MIME 類型
 *         file_type:
 *           type: string
 *           enum: [avatar, attachment, document, image]
 *           description: 檔案類型
 *         metadata:
 *           type: object
 *           description: 檔案元數據
 *         is_public:
 *           type: boolean
 *           description: 是否公開
 *         download_count:
 *           type: integer
 *           description: 下載次數
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 創建時間
 *       example:
 *         id: 1
 *         user_id: 1
 *         filename: "document.pdf"
 *         stored_filename: "1733123456789_a1b2c3d4.pdf"
 *         file_size: 1048576
 *         mime_type: "application/pdf"
 *         file_type: "document"
 *         metadata: {"upload_ip": "127.0.0.1"}
 *         is_public: false
 *         download_count: 0
 *         created_at: "2024-12-02T10:30:00Z"
 */

/**
 * @swagger
 * /api/files/upload:
 *   post:
 *     summary: 上傳單個檔案
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: 要上傳的檔案
 *               is_public:
 *                 type: boolean
 *                 description: 是否設為公開檔案
 *                 default: false
 *     responses:
 *       200:
 *         description: 檔案上傳成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/File'
 *       400:
 *         description: 請求錯誤
 *       413:
 *         description: 檔案大小超過限制
 *       415:
 *         description: 不支援的檔案類型
 */
router.post(
  "/upload",
  authenticateToken,
  rateLimiters.upload,
  handleUploadFile
);

/**
 * @swagger
 * /api/files/upload-multiple:
 *   post:
 *     summary: 上傳多個檔案
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: 要上傳的檔案列表
 *               is_public:
 *                 type: boolean
 *                 description: 是否設為公開檔案
 *                 default: false
 *     responses:
 *       200:
 *         description: 檔案上傳完成
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     files:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/File'
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           filename:
 *                             type: string
 *                           error:
 *                             type: string
 */
router.post(
  "/upload-multiple",
  authenticateToken,
  rateLimiters.upload,
  handleUploadMultipleFiles
);

/**
 * @swagger
 * /api/files:
 *   get:
 *     summary: 獲取用戶檔案列表
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: file_type
 *         schema:
 *           type: string
 *           enum: [avatar, attachment, document, image]
 *         description: 檔案類型過濾
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 頁碼
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: 每頁數量
 *     responses:
 *       200:
 *         description: 獲取檔案列表成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/File'
 */
router.get("/", authenticateToken, handleGetUserFiles);

/**
 * @swagger
 * /api/files/stats:
 *   get:
 *     summary: 獲取檔案統計信息
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 獲取統計信息成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_files:
 *                       type: integer
 *                       description: 總檔案數
 *                     total_size:
 *                       type: integer
 *                       description: 總檔案大小
 *                     image_count:
 *                       type: integer
 *                       description: 圖片檔案數
 *                     document_count:
 *                       type: integer
 *                       description: 文檔檔案數
 *                     attachment_count:
 *                       type: integer
 *                       description: 附件檔案數
 *                     avg_file_size:
 *                       type: number
 *                       description: 平均檔案大小
 */
router.get("/stats", authenticateToken, handleGetFileStats);

/**
 * @swagger
 * /api/files/{id}:
 *   get:
 *     summary: 獲取檔案信息
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 檔案 ID
 *     responses:
 *       200:
 *         description: 獲取檔案信息成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/File'
 *       404:
 *         description: 檔案不存在
 *       403:
 *         description: 沒有權限存取此檔案
 */
router.get("/:id", authenticateToken, handleGetFileInfo);

/**
 * @swagger
 * /api/files/{id}/download:
 *   get:
 *     summary: 下載檔案
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 檔案 ID
 *     responses:
 *       200:
 *         description: 檔案下載成功
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: 檔案不存在
 *       403:
 *         description: 沒有權限存取此檔案
 */
router.get("/:id/download", authenticateToken, handleDownloadFile);

/**
 * @swagger
 * /api/files/{id}:
 *   delete:
 *     summary: 刪除檔案
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 檔案 ID
 *     responses:
 *       200:
 *         description: 檔案刪除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: 檔案不存在
 *       403:
 *         description: 沒有權限刪除此檔案
 */
router.delete("/:id", authenticateToken, handleDeleteFile);

/**
 * @swagger
 * /api/files/{id}/content:
 *   get:
 *     summary: 獲取檔案內容
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 檔案 ID
 *     responses:
 *       200:
 *         description: 獲取檔案內容成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     content:
 *                       type: string
 *                       description: 檔案文本內容
 *                     encoding:
 *                       type: string
 *                       description: 檔案編碼
 */
router.get("/:id/content", authenticateToken, handleGetFileContent);

/**
 * @swagger
 * /api/files/{id}/analyze:
 *   post:
 *     summary: 分析檔案內容
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 檔案 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [summarize, generate]
 *                 description: 分析類型
 *             required:
 *               - type
 *     responses:
 *       200:
 *         description: 分析完成
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: string
 *                       description: 檔案總結（當 type=summarize）
 *                     document:
 *                       type: string
 *                       description: 生成的文檔（當 type=generate）
 */
router.post("/:id/analyze", authenticateToken, handleAnalyzeFile);

/**
 * @swagger
 * /api/files/{id}/ask:
 *   post:
 *     summary: 針對檔案提問
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 檔案 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               question:
 *                 type: string
 *                 description: 要問的問題
 *             required:
 *               - question
 *     responses:
 *       200:
 *         description: 回答完成
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     answer:
 *                       type: string
 *                       description: 問題的回答
 *                     question:
 *                       type: string
 *                       description: 原始問題
 */
router.post("/:id/ask", authenticateToken, handleAskFileQuestion);

export default router;

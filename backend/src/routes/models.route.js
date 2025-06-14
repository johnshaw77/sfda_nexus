/**
 * AI 模型管理路由
 * 定義所有模型相關的 API 端點
 */

import express from "express";
import ModelsController from "../controllers/models.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     AIModel:
 *       type: object
 *       required:
 *         - model_name
 *         - display_name
 *         - provider
 *       properties:
 *         id:
 *           type: integer
 *           description: 模型唯一標識符
 *         model_name:
 *           type: string
 *           description: 模型名稱（提供商內唯一）
 *         display_name:
 *           type: string
 *           description: 顯示名稱
 *         provider:
 *           type: string
 *           enum: [ollama, gemini, openai, claude]
 *           description: AI模型提供商
 *         model_type:
 *           type: string
 *           default: text
 *           description: 模型類型
 *         description:
 *           type: string
 *           description: 模型描述
 *         max_tokens:
 *           type: integer
 *           description: 最大token數
 *         context_window:
 *           type: integer
 *           description: 上下文窗口大小
 *         supports_streaming:
 *           type: boolean
 *           default: false
 *           description: 是否支援串流回應
 *         supports_functions:
 *           type: boolean
 *           default: false
 *           description: 是否支援函數調用
 *         supports_vision:
 *           type: boolean
 *           default: false
 *           description: 是否支援視覺理解
 *         supports_audio:
 *           type: boolean
 *           default: false
 *           description: 是否支援音頻處理
 *         pricing_input:
 *           type: number
 *           format: float
 *           description: 輸入定價（每千token）
 *         pricing_output:
 *           type: number
 *           format: float
 *           description: 輸出定價（每千token）
 *         available:
 *           type: boolean
 *           default: true
 *           description: 模型是否可用
 *         is_default:
 *           type: boolean
 *           default: false
 *           description: 是否為默認模型
 *         is_active:
 *           type: boolean
 *           default: true
 *           description: 是否啟用
 *         config_json:
 *           type: object
 *           description: 模型配置JSON
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 創建時間
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: 更新時間
 *
 *     ModelStats:
 *       type: object
 *       properties:
 *         total_providers:
 *           type: integer
 *           description: 提供商總數
 *         total_models:
 *           type: integer
 *           description: 模型總數
 *         total_available:
 *           type: integer
 *           description: 可用模型數
 *         total_default:
 *           type: integer
 *           description: 默認模型數
 *         total_inactive:
 *           type: integer
 *           description: 未啟用模型數
 *         by_provider:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               provider:
 *                 type: string
 *               total_models:
 *                 type: integer
 *               available_models:
 *                 type: integer
 *               default_models:
 *                 type: integer
 *               inactive_models:
 *                 type: integer
 */

/**
 * @swagger
 * /api/models:
 *   get:
 *     summary: 獲取所有AI模型
 *     tags: [Models]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: provider
 *         schema:
 *           type: string
 *           enum: [ollama, gemini, openai, claude]
 *         description: 按提供商過濾
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: 只獲取啟用模型
 *       - in: query
 *         name: group_by_provider
 *         schema:
 *           type: boolean
 *         description: 按提供商分組返回
 *     responses:
 *       200:
 *         description: 獲取模型列表成功
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
 *                   oneOf:
 *                     - type: array
 *                       items:
 *                         $ref: '#/components/schemas/AIModel'
 *                     - type: object
 *                       additionalProperties:
 *                         type: array
 *                         items:
 *                           $ref: '#/components/schemas/AIModel'
 */
router.get("/", authenticateToken, ModelsController.handleGetAllModels);

/**
 * @swagger
 * /api/models/stats:
 *   get:
 *     summary: 獲取模型統計信息
 *     tags: [Models]
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
 *                   $ref: '#/components/schemas/ModelStats'
 */
router.get("/stats", authenticateToken, ModelsController.handleGetModelStats);

/**
 * @swagger
 * /api/models/{id}:
 *   get:
 *     summary: 根據ID獲取模型詳情
 *     tags: [Models]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 模型ID
 *     responses:
 *       200:
 *         description: 獲取模型詳情成功
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
 *                   $ref: '#/components/schemas/AIModel'
 *       404:
 *         description: 模型不存在
 */
router.get("/:id", authenticateToken, ModelsController.handleGetModelById);

/**
 * @swagger
 * /api/models:
 *   post:
 *     summary: 創建新模型
 *     tags: [Models]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - model_name
 *               - display_name
 *               - provider
 *             properties:
 *               model_name:
 *                 type: string
 *                 description: 模型名稱
 *               display_name:
 *                 type: string
 *                 description: 顯示名稱
 *               provider:
 *                 type: string
 *                 enum: [ollama, gemini, openai, claude]
 *                 description: 提供商
 *               model_type:
 *                 type: string
 *                 description: 模型類型
 *               description:
 *                 type: string
 *                 description: 模型描述
 *               max_tokens:
 *                 type: integer
 *                 description: 最大token數
 *               context_window:
 *                 type: integer
 *                 description: 上下文窗口大小
 *               supports_streaming:
 *                 type: boolean
 *                 description: 是否支援串流
 *               supports_functions:
 *                 type: boolean
 *                 description: 是否支援函數調用
 *               supports_vision:
 *                 type: boolean
 *                 description: 是否支援視覺
 *               supports_audio:
 *                 type: boolean
 *                 description: 是否支援音頻
 *               pricing_input:
 *                 type: number
 *                 description: 輸入定價
 *               pricing_output:
 *                 type: number
 *                 description: 輸出定價
 *               config_json:
 *                 type: object
 *                 description: 配置JSON
 *     responses:
 *       201:
 *         description: 模型創建成功
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
 *                   $ref: '#/components/schemas/AIModel'
 *       400:
 *         description: 模型已存在或參數錯誤
 */
router.post(
  "/",
  authenticateToken,
  requireRole(["admin"]),
  ModelsController.handleCreateModel
);

/**
 * @swagger
 * /api/models/{id}:
 *   put:
 *     summary: 更新模型
 *     tags: [Models]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 模型ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               display_name:
 *                 type: string
 *               description:
 *                 type: string
 *               max_tokens:
 *                 type: integer
 *               context_window:
 *                 type: integer
 *               supports_streaming:
 *                 type: boolean
 *               supports_functions:
 *                 type: boolean
 *               supports_vision:
 *                 type: boolean
 *               supports_audio:
 *                 type: boolean
 *               pricing_input:
 *                 type: number
 *               pricing_output:
 *                 type: number
 *               available:
 *                 type: boolean
 *               is_default:
 *                 type: boolean
 *               is_active:
 *                 type: boolean
 *               config_json:
 *                 type: object
 *     responses:
 *       200:
 *         description: 模型更新成功
 *       404:
 *         description: 模型不存在
 */
router.put(
  "/:id",
  authenticateToken,
  requireRole(["super_admin", "admin"]),
  ModelsController.handleUpdateModel
);

/**
 * @swagger
 * /api/models/{id}:
 *   delete:
 *     summary: 刪除模型（軟刪除）
 *     tags: [Models]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 模型ID
 *     responses:
 *       200:
 *         description: 模型刪除成功
 *       404:
 *         description: 模型不存在
 */
router.delete(
  "/:id",
  authenticateToken,
  requireRole(["super_admin", "admin"]),
  ModelsController.handleDeleteModel
);

/**
 * @swagger
 * /api/models/{id}/default:
 *   patch:
 *     summary: 設置默認模型
 *     tags: [Models]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 模型ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               provider:
 *                 type: string
 *                 description: 只在指定提供商內設置默認（可選）
 *     responses:
 *       200:
 *         description: 默認模型設置成功
 *       404:
 *         description: 模型不存在
 */
router.patch(
  "/:id/default",
  authenticateToken,
  requireRole(["super_admin", "admin"]),
  ModelsController.handleSetDefaultModel
);

/**
 * @swagger
 * /api/models/{id}/test:
 *   post:
 *     summary: 測試模型連接
 *     tags: [Models]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 模型ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               test_message:
 *                 type: string
 *                 default: "Hello, this is a test message."
 *                 description: 測試消息
 *     responses:
 *       200:
 *         description: 模型測試完成
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
 *                     model_id:
 *                       type: string
 *                     model_name:
 *                       type: string
 *                     provider:
 *                       type: string
 *                     test_message:
 *                       type: string
 *                     success:
 *                       type: boolean
 *                     response_time:
 *                       type: integer
 *                     error_message:
 *                       type: string
 *                     tested_at:
 *                       type: string
 *                       format: date-time
 */
router.post(
  "/:id/test",
  authenticateToken,
  requireRole(["super_admin", "admin"]),
  ModelsController.handleTestModel
);

/**
 * @swagger
 * /api/models/{id}/copy:
 *   post:
 *     summary: 複製模型
 *     tags: [Models]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 要複製的模型ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               new_name_suffix:
 *                 type: string
 *                 description: 新模型名稱後綴（可選，默認為 "_副本"）
 *               new_display_name:
 *                 type: string
 *                 description: 新顯示名稱（可選）
 *     responses:
 *       200:
 *         description: 模型複製成功
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
 *                   $ref: '#/components/schemas/AIModel'
 *       404:
 *         description: 原模型不存在
 */
router.post(
  "/:id/copy",
  authenticateToken,
  requireRole(["super_admin", "admin"]),
  ModelsController.handleCopyModel
);

/**
 * @swagger
 * /api/models/sync:
 *   post:
 *     summary: 同步模型可用性
 *     tags: [Models]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - model_updates
 *             properties:
 *               model_updates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - model_name
 *                     - provider
 *                     - available
 *                   properties:
 *                     model_name:
 *                       type: string
 *                       description: 模型名稱
 *                     provider:
 *                       type: string
 *                       description: 提供商
 *                     available:
 *                       type: boolean
 *                       description: 是否可用
 *     responses:
 *       200:
 *         description: 同步完成
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
 *                     updated_count:
 *                       type: integer
 *                     total_count:
 *                       type: integer
 */
router.post(
  "/sync",
  authenticateToken,
  requireRole(["super_admin", "admin"]),
  ModelsController.handleSyncModelAvailability
);

export default router;

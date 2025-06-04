/**
 * 智能體管理路由
 * 處理智能體相關的管理功能路由
 */

import express from "express";
import agentsController from "../controllers/agents.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { rateLimitMiddleware } from "../middleware/rateLimit.middleware.js";

const router = express.Router();

// 所有智能體管理路由都需要認證
router.use(authenticateToken);

/**
 * @swagger
 * components:
 *   schemas:
 *     Agent:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 智能體ID
 *         name:
 *           type: string
 *           description: 智能體名稱
 *         display_name:
 *           type: string
 *           description: 顯示名稱
 *         description:
 *           type: string
 *           description: 描述
 *         avatar:
 *           type: string
 *           description: 頭像
 *         system_prompt:
 *           type: string
 *           description: 系統提示詞
 *         model_id:
 *           type: integer
 *           description: 關聯模型ID
 *         category:
 *           type: string
 *           description: 分類
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: 標籤
 *         capabilities:
 *           type: object
 *           description: 能力配置
 *         tools:
 *           type: object
 *           description: 工具配置
 *         is_active:
 *           type: boolean
 *           description: 是否啟用
 *         is_public:
 *           type: boolean
 *           description: 是否公開
 *         usage_count:
 *           type: integer
 *           description: 使用次數
 *         rating:
 *           type: number
 *           description: 評分
 *         rating_count:
 *           type: integer
 *           description: 評分次數
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 創建時間
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: 更新時間
 *         created_by:
 *           type: integer
 *           description: 創建者ID
 *         model_name:
 *           type: string
 *           description: 模型名稱
 *         model_display_name:
 *           type: string
 *           description: 模型顯示名稱
 *         created_by_username:
 *           type: string
 *           description: 創建者用戶名
 *
 *     CreateAgentRequest:
 *       type: object
 *       required:
 *         - name
 *         - display_name
 *         - description
 *         - system_prompt
 *         - model_id
 *       properties:
 *         name:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *           description: 智能體名稱
 *         display_name:
 *           type: string
 *           minLength: 2
 *           maxLength: 200
 *           description: 顯示名稱
 *         description:
 *           type: string
 *           maxLength: 1000
 *           description: 描述
 *         avatar:
 *           type: string
 *           description: 頭像（base64或URL）
 *         system_prompt:
 *           type: string
 *           minLength: 10
 *           description: 系統提示詞
 *         model_id:
 *           type: integer
 *           description: 關聯模型ID
 *         category:
 *           type: string
 *           enum: [general, assistant, coding, writing, analysis, customer_service]
 *           default: general
 *           description: 分類
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: 標籤
 *         capabilities:
 *           type: object
 *           description: 能力配置
 *         tools:
 *           type: object
 *           description: 工具配置
 *         is_active:
 *           type: boolean
 *           default: true
 *           description: 是否啟用
 *         is_public:
 *           type: boolean
 *           default: true
 *           description: 是否公開
 *
 *     UpdateAgentRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *         display_name:
 *           type: string
 *           minLength: 2
 *           maxLength: 200
 *         description:
 *           type: string
 *           maxLength: 1000
 *         avatar:
 *           type: string
 *         system_prompt:
 *           type: string
 *           minLength: 10
 *         model_id:
 *           type: integer
 *         category:
 *           type: string
 *           enum: [general, assistant, coding, writing, analysis, customer_service]
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         capabilities:
 *           type: object
 *         tools:
 *           type: object
 *         is_active:
 *           type: boolean
 *         is_public:
 *           type: boolean
 */

/**
 * @swagger
 * /api/agents:
 *   get:
 *     summary: 獲取智能體列表（管理員）
 *     tags: [智能體管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 頁碼
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 每頁數量
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: 分類篩選
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: 啟用狀態篩選
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索關鍵字
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: created_at
 *         description: 排序字段
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: 排序方向
 *     responses:
 *       200:
 *         description: 獲取智能體列表成功
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
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Agent'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 */
router.get(
  "/",
  rateLimitMiddleware("admin_agents", 100, 15 * 60 * 1000),
  agentsController.handleGetAgents
);

/**
 * @swagger
 * /api/agents:
 *   post:
 *     summary: 創建智能體
 *     tags: [智能體管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAgentRequest'
 *     responses:
 *       201:
 *         description: 智能體創建成功
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
 *                   $ref: '#/components/schemas/Agent'
 *       400:
 *         description: 輸入驗證失敗
 *       409:
 *         description: 智能體名稱已存在
 */
router.post(
  "/",
  rateLimitMiddleware("admin_create_agent", 20, 60 * 60 * 1000),
  agentsController.handleCreateAgent
);

/**
 * @swagger
 * /api/agents/{agentId}:
 *   put:
 *     summary: 更新智能體
 *     tags: [智能體管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 智能體ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateAgentRequest'
 *     responses:
 *       200:
 *         description: 智能體更新成功
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
 *                   $ref: '#/components/schemas/Agent'
 *       400:
 *         description: 輸入驗證失敗
 *       404:
 *         description: 智能體不存在
 */
router.put(
  "/:agentId",
  rateLimitMiddleware("admin_update_agent", 50, 60 * 60 * 1000),
  agentsController.handleUpdateAgent
);

/**
 * @swagger
 * /api/agents/{agentId}:
 *   delete:
 *     summary: 刪除智能體
 *     tags: [智能體管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 智能體ID
 *     responses:
 *       200:
 *         description: 智能體刪除成功
 *       404:
 *         description: 智能體不存在
 */
router.delete(
  "/:agentId",
  rateLimitMiddleware("admin_delete_agent", 20, 60 * 60 * 1000),
  agentsController.handleDeleteAgent
);

/**
 * @swagger
 * /api/agents/{agentId}/duplicate:
 *   post:
 *     summary: 複製智能體
 *     tags: [智能體管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 智能體ID
 *     responses:
 *       201:
 *         description: 智能體複製成功
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
 *                   $ref: '#/components/schemas/Agent'
 *       404:
 *         description: 智能體不存在
 */
router.post(
  "/:agentId/duplicate",
  rateLimitMiddleware("admin_duplicate_agent", 10, 60 * 60 * 1000),
  agentsController.handleDuplicateAgent
);

export default router;

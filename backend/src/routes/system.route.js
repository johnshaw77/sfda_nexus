/**
 * 系統管理路由
 * 處理系統統計、配置和審計日誌相關路由
 */

import express from "express";
import systemController from "../controllers/system.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { rateLimitMiddleware } from "../middleware/rateLimit.middleware.js";

const router = express.Router();

// 所有系統管理路由都需要認證
router.use(authenticateToken);

/**
 * @swagger
 * components:
 *   schemas:
 *     SystemStats:
 *       type: object
 *       properties:
 *         users:
 *           type: object
 *           properties:
 *             total_users:
 *               type: integer
 *             active_users:
 *               type: integer
 *             admin_users:
 *               type: integer
 *             new_users_30d:
 *               type: integer
 *         conversations:
 *           type: object
 *           properties:
 *             total_conversations:
 *               type: integer
 *             active_conversations:
 *               type: integer
 *             new_conversations_7d:
 *               type: integer
 *         messages:
 *           type: object
 *           properties:
 *             total_messages:
 *               type: integer
 *             user_messages:
 *               type: integer
 *             assistant_messages:
 *               type: integer
 *             messages_24h:
 *               type: integer
 *         tokens:
 *           type: object
 *           properties:
 *             total_tokens:
 *               type: integer
 *             total_cost:
 *               type: number
 *             avg_tokens_per_message:
 *               type: number
 *
 *     AuditLog:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         user_id:
 *           type: integer
 *         action:
 *           type: string
 *         details:
 *           type: object
 *         ip_address:
 *           type: string
 *         user_agent:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         username:
 *           type: string
 *         email:
 *           type: string
 */

/**
 * @swagger
 * /api/system/stats:
 *   get:
 *     summary: 獲取系統統計信息
 *     tags: [系統管理]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 獲取系統統計成功
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
 *                   $ref: '#/components/schemas/SystemStats'
 */
router.get(
  "/stats",
  rateLimitMiddleware("admin_system_stats", 30, 15 * 60 * 1000),
  systemController.handleGetSystemStats
);

/**
 * @swagger
 * /api/system/config:
 *   get:
 *     summary: 獲取系統配置
 *     tags: [系統管理]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 獲取系統配置成功
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
 *                   description: 系統配置對象
 */
router.get(
  "/config",
  rateLimitMiddleware("admin_system_config", 30, 15 * 60 * 1000),
  systemController.handleGetSystemConfig
);

/**
 * @swagger
 * /api/system/config:
 *   put:
 *     summary: 更新系統配置
 *     tags: [系統管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ai_models:
 *                 type: object
 *                 description: AI模型配置
 *               system_settings:
 *                 type: object
 *                 description: 系統設置
 *               security_settings:
 *                 type: object
 *                 description: 安全設置
 *               notification_settings:
 *                 type: object
 *                 description: 通知設置
 *     responses:
 *       200:
 *         description: 系統配置更新成功
 *       403:
 *         description: 需要超級管理員權限
 */
router.put(
  "/config",
  rateLimitMiddleware("admin_update_config", 10, 60 * 60 * 1000), // 1小時10次
  systemController.handleUpdateSystemConfig
);

/**
 * @swagger
 * /api/system/audit-logs:
 *   get:
 *     summary: 獲取審計日誌
 *     tags: [系統管理]
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
 *           default: 50
 *         description: 每頁數量
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: integer
 *         description: 用戶ID篩選
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: 操作類型篩選
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: 開始日期
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: 結束日期
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: 排序方向
 *     responses:
 *       200:
 *         description: 獲取審計日誌成功
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
 *                         $ref: '#/components/schemas/AuditLog'
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
  "/audit-logs",
  rateLimitMiddleware("admin_audit_logs", 50, 15 * 60 * 1000),
  systemController.handleGetAuditLogs
);

export default router;

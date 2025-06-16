/**
 * MCP 服務管理路由
 * 定義所有 MCP 服務相關的 API 端點
 */

import express from "express";
import {
  handleGetAllMcpServices,
  handleGetMcpServiceById,
  handleCreateMcpService,
  handleUpdateMcpService,
  handleDeleteMcpService,
  handlePermanentDeleteMcpService,
  handleBatchDeleteMcpServices,
  handleBatchPermanentDeleteMcpServices,
  handleToggleMcpService,
  handleGetMcpServiceStats,
  handleGetActiveMcpServices,
  handleGetSyncedServices,
  discoverServices,
  compareWithExisting,
  enableSelectedServices,
  disableServices,
  triggerSync,
  checkDifferences,
  getSyncStatus,
  handleTestMcpConnection,
} from "../controllers/mcpServices.controller.js";
import {
  authenticateToken,
  requireRole,
} from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     McpService:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         id:
 *           type: integer
 *           description: MCP 服務唯一標識符
 *         name:
 *           type: string
 *           description: MCP 服務名稱
 *         endpoint_url:
 *           type: string
 *           description: MCP 服務端點 URL
 *         description:
 *           type: string
 *           description: MCP 服務描述
 *         is_active:
 *           type: boolean
 *           default: true
 *           description: 是否啟用
 *         version:
 *           type: integer
 *           default: 1
 *           description: 服務版本號
 *         owner:
 *           type: string
 *           description: 服務擁有者
 *         icon:
 *           type: string
 *           description: 服務圖示 URL
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 創建時間
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: 更新時間
 *
 *     McpServiceStats:
 *       type: object
 *       properties:
 *         total_services:
 *           type: integer
 *           description: 服務總數
 *         active_services:
 *           type: integer
 *           description: 啟用服務數
 *         inactive_services:
 *           type: integer
 *           description: 停用服務數
 *         unique_owners:
 *           type: integer
 *           description: 擁有者數量
 *         by_owner:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               owner:
 *                 type: string
 *               service_count:
 *                 type: integer
 *               active_count:
 *                 type: integer
 */

/**
 * @swagger
 * /api/mcp/services:
 *   get:
 *     summary: 獲取所有 MCP 服務
 *     tags: [MCP Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: 只獲取啟用服務
 *       - in: query
 *         name: owner
 *         schema:
 *           type: string
 *         description: 按擁有者過濾
 *     responses:
 *       200:
 *         description: 獲取 MCP 服務列表成功
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
 *                     $ref: '#/components/schemas/McpService'
 */
router.get("/", authenticateToken, handleGetAllMcpServices);

/**
 * @swagger
 * /api/mcp/services/stats:
 *   get:
 *     summary: 獲取 MCP 服務統計資訊
 *     tags: [MCP Services]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 獲取統計資訊成功
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
 *                   $ref: '#/components/schemas/McpServiceStats'
 */
router.get("/stats", authenticateToken, handleGetMcpServiceStats);

/**
 * @swagger
 * /api/mcp/services/active:
 *   get:
 *     summary: 獲取活躍的 MCP 服務
 *     tags: [MCP Services]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 獲取活躍服務成功
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
 *                     $ref: '#/components/schemas/McpService'
 */
router.get("/active", authenticateToken, handleGetActiveMcpServices);

/**
 * @swagger
 * /api/mcp/services/synced:
 *   get:
 *     summary: 獲取已同步的 MCP 服務和工具（用於日常管理）
 *     tags: [MCP Services]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 獲取已同步服務成功
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
 *                     allOf:
 *                       - $ref: '#/components/schemas/McpService'
 *                       - type: object
 *                         properties:
 *                           tools:
 *                             type: array
 *                             items:
 *                               $ref: '#/components/schemas/McpTool'
 */
router.get("/synced", authenticateToken, handleGetSyncedServices);

// MCP 服務發現和管理路由 - 必須在 /:id 之前定義
/**
 * @swagger
 * /api/mcp/services/discover:
 *   get:
 *     summary: 探索 MCP Server 上的可用服務
 *     tags: [MCP Services]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 服務探索成功
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
 *                     services:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           moduleKey:
 *                             type: string
 *                           name:
 *                             type: string
 *                           endpoint:
 *                             type: string
 *                           description:
 *                             type: string
 *                           tools:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 name:
 *                                   type: string
 *                                 displayName:
 *                                   type: string
 *                                 description:
 *                                   type: string
 *                                 enabled:
 *                                   type: boolean
 *                           enabled:
 *                             type: boolean
 *                           isNew:
 *                             type: boolean
 *                     serverInfo:
 *                       type: object
 *       400:
 *         description: 探索失敗
 */
router.get(
  "/discover",
  authenticateToken,
  requireRole(["admin", "super_admin"]),
  discoverServices
);

/**
 * @swagger
 * /api/mcp/services/compare:
 *   get:
 *     summary: 比較發現的服務與現有服務的差異
 *     tags: [MCP Services]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 服務比較成功
 */
router.get(
  "/compare",
  authenticateToken,
  requireRole(["admin", "super_admin"]),
  compareWithExisting
);

/**
 * @swagger
 * /api/mcp/services/enable:
 *   post:
 *     summary: 啟用選中的服務和工具
 *     tags: [MCP Services]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/enable",
  authenticateToken,
  requireRole(["admin", "super_admin"]),
  enableSelectedServices
);

/**
 * @swagger
 * /api/mcp/services/disable:
 *   post:
 *     summary: 停用服務或工具
 *     tags: [MCP Services]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/disable",
  authenticateToken,
  requireRole(["admin", "super_admin"]),
  disableServices
);

/**
 * @swagger
 * /api/mcp/services/sync:
 *   post:
 *     summary: 觸發完整同步
 *     tags: [MCP Services]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/sync",
  authenticateToken,
  requireRole(["admin", "super_admin"]),
  triggerSync
);

/**
 * @swagger
 * /api/mcp/services/differences:
 *   get:
 *     summary: 檢查與現有資料的差異
 *     tags: [MCP Services]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/differences",
  authenticateToken,
  requireRole(["admin", "super_admin"]),
  checkDifferences
);

/**
 * @swagger
 * /api/mcp/services/sync/status:
 *   get:
 *     summary: 獲取同步狀態
 *     tags: [MCP Services]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/sync/status",
  authenticateToken,
  requireRole(["admin", "super_admin"]),
  getSyncStatus
);

/**
 * @swagger
 * /api/mcp/services/{id}:
 *   get:
 *     summary: 根據ID獲取 MCP 服務詳情
 *     tags: [MCP Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: MCP 服務 ID
 *     responses:
 *       200:
 *         description: 獲取服務詳情成功
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
 *                   $ref: '#/components/schemas/McpService'
 *       404:
 *         description: MCP 服務不存在
 */
router.get("/:id", authenticateToken, handleGetMcpServiceById);

/**
 * @swagger
 * /api/mcp/services:
 *   post:
 *     summary: 創建新的 MCP 服務
 *     tags: [MCP Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: 服務名稱
 *               endpoint_url:
 *                 type: string
 *                 description: 服務端點 URL
 *               description:
 *                 type: string
 *                 description: 服務描述
 *               icon:
 *                 type: string
 *                 description: 服務圖示 URL
 *               version:
 *                 type: integer
 *                 description: 服務版本號
 *     responses:
 *       201:
 *         description: MCP 服務創建成功
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
 *                   $ref: '#/components/schemas/McpService'
 *       400:
 *         description: 請求參數錯誤
 *       409:
 *         description: 服務名稱已存在
 */
router.post(
  "/",
  authenticateToken,
  requireRole(["admin", "super_admin"]),
  handleCreateMcpService
);

/**
 * @swagger
 * /api/mcp/services/{id}:
 *   put:
 *     summary: 更新 MCP 服務
 *     tags: [MCP Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: MCP 服務 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: 服務名稱
 *               endpoint_url:
 *                 type: string
 *                 description: 服務端點 URL
 *               description:
 *                 type: string
 *                 description: 服務描述
 *               icon:
 *                 type: string
 *                 description: 服務圖示 URL
 *               version:
 *                 type: integer
 *                 description: 服務版本號
 *               is_active:
 *                 type: boolean
 *                 description: 是否啟用
 *     responses:
 *       200:
 *         description: MCP 服務更新成功
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
 *                   $ref: '#/components/schemas/McpService'
 *       404:
 *         description: MCP 服務不存在
 */
router.put(
  "/:id",
  authenticateToken,
  requireRole(["admin", "super_admin"]),
  handleUpdateMcpService
);

/**
 * @swagger
 * /api/mcp/services/{id}:
 *   delete:
 *     summary: 刪除 MCP 服務
 *     tags: [MCP Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: MCP 服務 ID
 *     responses:
 *       200:
 *         description: MCP 服務刪除成功
 *       404:
 *         description: MCP 服務不存在
 */
router.delete(
  "/:id",
  authenticateToken,
  requireRole(["admin", "super_admin"]),
  handleDeleteMcpService
);

/**
 * @swagger
 * /api/mcp/services/batch:
 *   delete:
 *     summary: 批量刪除 MCP 服務（軟刪除）
 *     tags: [MCP Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceIds
 *             properties:
 *               serviceIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: 要刪除的服務ID列表
 *     responses:
 *       200:
 *         description: 批量刪除成功
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
 *                     deletedServices:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                     deletedCount:
 *                       type: integer
 */
router.delete(
  "/batch",
  authenticateToken,
  requireRole(["admin", "super_admin"]),
  handleBatchDeleteMcpServices
);

/**
 * @swagger
 * /api/mcp/services/batch/permanent:
 *   delete:
 *     summary: 批量永久刪除 MCP 服務（硬刪除）
 *     tags: [MCP Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceIds
 *             properties:
 *               serviceIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: 要永久刪除的服務ID列表
 *     responses:
 *       200:
 *         description: 批量永久刪除成功
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
 *                     deletedServices:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                     deletedCount:
 *                       type: integer
 */
router.delete(
  "/batch/permanent",
  authenticateToken,
  requireRole(["admin", "super_admin"]),
  handleBatchPermanentDeleteMcpServices
);

/**
 * @swagger
 * /api/mcp/services/{id}/permanent:
 *   delete:
 *     summary: 永久刪除 MCP 服務（硬刪除）
 *     tags: [MCP Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: MCP 服務 ID
 *     responses:
 *       200:
 *         description: MCP 服務永久刪除成功
 *       404:
 *         description: MCP 服務不存在
 */
router.delete(
  "/:id/permanent",
  authenticateToken,
  requireRole(["admin", "super_admin"]),
  handlePermanentDeleteMcpService
);

/**
 * @swagger
 * /api/mcp/services/{id}/toggle:
 *   patch:
 *     summary: 切換 MCP 服務狀態
 *     tags: [MCP Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: MCP 服務 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - is_active
 *             properties:
 *               is_active:
 *                 type: boolean
 *                 description: 是否啟用
 *     responses:
 *       200:
 *         description: 狀態切換成功
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
 *                   $ref: '#/components/schemas/McpService'
 *       404:
 *         description: MCP 服務不存在
 */
router.patch(
  "/:id/toggle",
  authenticateToken,
  requireRole(["admin", "super_admin"]),
  handleToggleMcpService
);

/**
 * @swagger
 * /api/mcp/services/{id}/test:
 *   post:
 *     summary: 測試 MCP 服務連線
 *     tags: [MCP Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: MCP 服務 ID
 *     responses:
 *       200:
 *         description: 連線測試成功
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
 *                     status:
 *                       type: string
 *                       enum: [success, failed]
 *                     endpoint_url:
 *                       type: string
 *                     response_time:
 *                       type: number
 *                     timestamp:
 *                       type: string
 *       404:
 *         description: MCP 服務不存在
 */
router.post(
  "/:id/test",
  authenticateToken,
  requireRole(["admin", "super_admin"]),
  handleTestMcpConnection
);

/**
 * @swagger
 * /api/mcp/services/discover:
 *   get:
 *     summary: 探索 MCP Server 上的可用服務
 *     tags: [MCP Services]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 服務探索成功
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
 *                     services:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           moduleKey:
 *                             type: string
 *                           name:
 *                             type: string
 *                           endpoint:
 *                             type: string
 *                           description:
 *                             type: string
 *                           tools:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 name:
 *                                   type: string
 *                                 displayName:
 *                                   type: string
 *                                 description:
 *                                   type: string
 *                                 enabled:
 *                                   type: boolean
 *                           enabled:
 *                             type: boolean
 *                           isNew:
 *                             type: boolean
 *                     serverInfo:
 *                       type: object
 *       400:
 *         description: 探索失敗
 */

export default router;

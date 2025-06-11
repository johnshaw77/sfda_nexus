/**
 * MCP 工具管理路由
 * 定義所有 MCP 工具相關的 API 端點
 */

import express from "express";
import McpToolsController from "../controllers/mcpTools.controller.js";
import {
  authenticateToken,
  requireRole,
} from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     McpTool:
 *       type: object
 *       required:
 *         - mcp_service_id
 *         - name
 *       properties:
 *         id:
 *           type: integer
 *           description: MCP 工具唯一標識符
 *         mcp_service_id:
 *           type: integer
 *           description: 對應的 MCP 服務 ID
 *         name:
 *           type: string
 *           description: MCP 工具名稱
 *         description:
 *           type: string
 *           description: MCP 工具描述
 *         input_schema:
 *           type: object
 *           description: 工具輸入參數結構（JSON 格式）
 *         category:
 *           type: string
 *           default: general
 *           description: 工具分類
 *         priority:
 *           type: integer
 *           default: 1
 *           description: 優先級，數字越大優先級越高
 *         usage_count:
 *           type: integer
 *           default: 0
 *           description: 使用次數統計
 *         is_enabled:
 *           type: boolean
 *           default: true
 *           description: 是否啟用
 *         service_name:
 *           type: string
 *           description: 服務名稱
 *         service_endpoint:
 *           type: string
 *           description: 服務端點
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 創建時間
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: 更新時間
 *
 *     ToolCategoryStats:
 *       type: object
 *       properties:
 *         category:
 *           type: string
 *           description: 分類名稱
 *         total_tools:
 *           type: integer
 *           description: 該分類工具總數
 *         enabled_tools:
 *           type: integer
 *           description: 該分類已啟用工具數
 *         total_usage:
 *           type: integer
 *           description: 該分類總使用次數
 */

/**
 * @swagger
 * /api/mcp/tools:
 *   get:
 *     summary: 獲取所有 MCP 工具
 *     tags: [MCP Tools]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: is_enabled
 *         schema:
 *           type: boolean
 *         description: 只獲取啟用工具
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: 按分類過濾
 *       - in: query
 *         name: mcp_service_id
 *         schema:
 *           type: integer
 *         description: 按服務過濾
 *     responses:
 *       200:
 *         description: 獲取 MCP 工具列表成功
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
 *                     $ref: '#/components/schemas/McpTool'
 */
router.get("/", authenticateToken, McpToolsController.handleGetAllMcpTools);

/**
 * @swagger
 * /api/mcp/tools/enabled:
 *   get:
 *     summary: 獲取已啟用的 MCP 工具
 *     tags: [MCP Tools]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 獲取已啟用工具成功
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
 *                     $ref: '#/components/schemas/McpTool'
 */
router.get(
  "/enabled",
  authenticateToken,
  McpToolsController.handleGetEnabledMcpTools
);

/**
 * @swagger
 * /api/mcp/tools/stats/categories:
 *   get:
 *     summary: 獲取工具分類統計
 *     tags: [MCP Tools]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 獲取分類統計成功
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
 *                     $ref: '#/components/schemas/ToolCategoryStats'
 */
router.get(
  "/stats/categories",
  authenticateToken,
  McpToolsController.handleGetToolCategoryStats
);

/**
 * @swagger
 * /api/mcp/tools/stats/top-used:
 *   get:
 *     summary: 獲取最常用的工具
 *     tags: [MCP Tools]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 限制返回數量
 *     responses:
 *       200:
 *         description: 獲取最常用工具成功
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
 *                     $ref: '#/components/schemas/McpTool'
 */
router.get(
  "/stats/top-used",
  authenticateToken,
  McpToolsController.handleGetTopUsedTools
);

/**
 * @swagger
 * /api/mcp/tools/{id}:
 *   get:
 *     summary: 根據ID獲取工具詳情
 *     tags: [MCP Tools]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: MCP 工具 ID
 *     responses:
 *       200:
 *         description: 獲取工具詳情成功
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
 *                   $ref: '#/components/schemas/McpTool'
 *       404:
 *         description: MCP 工具不存在
 */
router.get("/:id", authenticateToken, McpToolsController.handleGetMcpToolById);

/**
 * @swagger
 * /api/mcp/tools:
 *   post:
 *     summary: 創建新的 MCP 工具
 *     tags: [MCP Tools]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mcp_service_id
 *               - name
 *             properties:
 *               mcp_service_id:
 *                 type: integer
 *                 description: MCP 服務 ID
 *               name:
 *                 type: string
 *                 description: 工具名稱
 *               description:
 *                 type: string
 *                 description: 工具描述
 *               input_schema:
 *                 type: object
 *                 description: 輸入參數結構
 *               category:
 *                 type: string
 *                 description: 工具分類
 *               priority:
 *                 type: integer
 *                 description: 優先級
 *     responses:
 *       201:
 *         description: MCP 工具創建成功
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
 *                   $ref: '#/components/schemas/McpTool'
 *       400:
 *         description: 請求參數錯誤
 *       409:
 *         description: 工具名稱已存在
 */
router.post(
  "/",
  authenticateToken,
  requireRole(["admin", "super_admin"]),
  McpToolsController.handleCreateMcpTool
);

/**
 * @swagger
 * /api/mcp/tools/{id}:
 *   put:
 *     summary: 更新 MCP 工具
 *     tags: [MCP Tools]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: MCP 工具 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: 工具名稱
 *               description:
 *                 type: string
 *                 description: 工具描述
 *               input_schema:
 *                 type: object
 *                 description: 輸入參數結構
 *               category:
 *                 type: string
 *                 description: 工具分類
 *               priority:
 *                 type: integer
 *                 description: 優先級
 *               is_enabled:
 *                 type: boolean
 *                 description: 是否啟用
 *     responses:
 *       200:
 *         description: MCP 工具更新成功
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
 *                   $ref: '#/components/schemas/McpTool'
 *       404:
 *         description: MCP 工具不存在
 */
router.put(
  "/:id",
  authenticateToken,
  requireRole(["admin", "super_admin"]),
  McpToolsController.handleUpdateMcpTool
);

/**
 * @swagger
 * /api/mcp/tools/{id}:
 *   delete:
 *     summary: 刪除 MCP 工具
 *     tags: [MCP Tools]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: MCP 工具 ID
 *     responses:
 *       200:
 *         description: MCP 工具刪除成功
 *       404:
 *         description: MCP 工具不存在
 */
router.delete(
  "/:id",
  authenticateToken,
  requireRole(["admin", "super_admin"]),
  McpToolsController.handleDeleteMcpTool
);

/**
 * @swagger
 * /api/mcp/tools/{id}/status:
 *   patch:
 *     summary: 更新工具狀態
 *     tags: [MCP Tools]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: MCP 工具 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - is_enabled
 *             properties:
 *               is_enabled:
 *                 type: boolean
 *                 description: 是否啟用
 *     responses:
 *       200:
 *         description: 工具狀態更新成功
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
 *                   $ref: '#/components/schemas/McpTool'
 *       404:
 *         description: MCP 工具不存在
 */
router.patch(
  "/:id/status",
  authenticateToken,
  requireRole(["admin", "super_admin"]),
  McpToolsController.handleUpdateMcpToolStatus
);

/**
 * @swagger
 * /api/mcp/tools/batch/status:
 *   patch:
 *     summary: 批量更新工具狀態
 *     tags: [MCP Tools]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tool_ids
 *               - is_enabled
 *             properties:
 *               tool_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: 工具ID列表
 *               is_enabled:
 *                 type: boolean
 *                 description: 是否啟用
 *     responses:
 *       200:
 *         description: 批量更新成功
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
 */
router.patch(
  "/batch/status",
  authenticateToken,
  requireRole(["admin", "super_admin"]),
  McpToolsController.handleBatchUpdateToolStatus
);

/**
 * @swagger
 * /api/mcp/services/{serviceId}/tools:
 *   get:
 *     summary: 根據服務ID獲取工具
 *     tags: [MCP Tools]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: MCP 服務 ID
 *       - in: query
 *         name: enabled_only
 *         schema:
 *           type: boolean
 *         description: 只獲取啟用工具
 *     responses:
 *       200:
 *         description: 獲取服務工具列表成功
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
 *                     $ref: '#/components/schemas/McpTool'
 *       404:
 *         description: MCP 服務不存在
 */
router.get(
  "/services/:serviceId/tools",
  authenticateToken,
  McpToolsController.handleGetMcpToolsByService
);

/**
 * @swagger
 * /api/mcp/services/{serviceId}/tools/sync:
 *   post:
 *     summary: 同步指定服務的工具
 *     tags: [MCP Tools]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
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
 *               - tools
 *             properties:
 *               tools:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     input_schema:
 *                       type: object
 *                     category:
 *                       type: string
 *                     priority:
 *                       type: integer
 *     responses:
 *       200:
 *         description: 工具同步成功
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
 *                     total:
 *                       type: integer
 *                     inserted:
 *                       type: integer
 *                     updated:
 *                       type: integer
 *                     errors:
 *                       type: integer
 *       404:
 *         description: MCP 服務不存在
 */
router.post(
  "/services/:serviceId/tools/sync",
  authenticateToken,
  requireRole(["admin", "super_admin"]),
  McpToolsController.handleSyncToolsForService
);

/**
 * @swagger
 * /api/mcp/tools/call:
 *   post:
 *     summary: 調用 MCP 工具
 *     tags: [MCP Tools]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serviceId
 *               - toolId
 *               - toolName
 *             properties:
 *               serviceId:
 *                 type: integer
 *                 description: 服務 ID
 *               toolId:
 *                 type: integer
 *                 description: 工具 ID
 *               toolName:
 *                 type: string
 *                 description: 工具名稱
 *               parameters:
 *                 type: object
 *                 description: 工具調用參數
 *     responses:
 *       200:
 *         description: 工具調用成功
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
 *                   description: 工具調用結果
 *       400:
 *         description: 調用參數錯誤
 *       404:
 *         description: 工具或服務不存在
 *       500:
 *         description: 工具調用失敗
 */
router.post("/call", authenticateToken, McpToolsController.handleCallTool);

/**
 * @swagger
 * /api/mcp/tools/call/history:
 *   get:
 *     summary: 獲取工具調用歷史
 *     tags: [MCP Tools]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: toolId
 *         schema:
 *           type: integer
 *         description: 工具 ID（可選）
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: 返回條數限制
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 頁碼
 *     responses:
 *       200:
 *         description: 獲取調用歷史成功
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
 *                     history:
 *                       type: array
 *                       items:
 *                         type: object
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 */
router.get(
  "/call/history",
  authenticateToken,
  McpToolsController.handleGetCallHistory
);

/**
 * @swagger
 * /api/mcp/tools/call/stats:
 *   get:
 *     summary: 獲取工具調用統計
 *     tags: [MCP Tools]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 獲取調用統計成功
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
 *                     total_calls:
 *                       type: integer
 *                     successful_calls:
 *                       type: integer
 *                     failed_calls:
 *                       type: integer
 *                     most_used_tools:
 *                       type: array
 *                       items:
 *                         type: object
 */
router.get(
  "/call/stats",
  authenticateToken,
  McpToolsController.handleGetCallStats
);

export default router;

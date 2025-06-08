/**
 * MCP 智能體服務權限管理路由
 * 處理智能體與 MCP 服務之間的權限關係
 */

import express from "express";
import {
  handleGetAgentServices,
  handleAssignAgentServices,
  handleRemoveAgentService,
  handleBatchUpdateAgentServices,
} from "../controllers/mcpAgents.controller.js";
import {
  authenticateToken,
  requireRole,
} from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     AgentService:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 權限記錄 ID
 *         agent_id:
 *           type: integer
 *           description: 智能體 ID
 *         mcp_service_id:
 *           type: integer
 *           description: MCP 服務 ID
 *         is_active:
 *           type: boolean
 *           description: 權限是否啟用
 *         service_name:
 *           type: string
 *           description: 服務名稱
 *         service_description:
 *           type: string
 *           description: 服務描述
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 創建時間
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: 更新時間
 */

/**
 * @swagger
 * /api/mcp/agents/{agentId}/services:
 *   get:
 *     summary: 獲取智能體的服務權限
 *     tags: [MCP Agent Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 智能體 ID
 *     responses:
 *       200:
 *         description: 獲取智能體服務權限成功
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
 *                     $ref: '#/components/schemas/AgentService'
 *       404:
 *         description: 智能體不存在
 */
router.get("/:agentId/services", authenticateToken, handleGetAgentServices);

/**
 * @swagger
 * /api/mcp/agents/{agentId}/services:
 *   post:
 *     summary: 為智能體分配服務權限
 *     tags: [MCP Agent Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 智能體 ID
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
 *                 description: 要分配的服務 ID 列表
 *     responses:
 *       200:
 *         description: 權限分配成功
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
 *                     assignedCount:
 *                       type: integer
 *                       description: 新分配的權限數量
 *                     existingCount:
 *                       type: integer
 *                       description: 已存在的權限數量
 *                     totalCount:
 *                       type: integer
 *                       description: 總權限數量
 *       404:
 *         description: 智能體不存在
 */
router.post(
  "/:agentId/services",
  authenticateToken,
  requireRole(["admin", "super_admin"]),
  handleAssignAgentServices
);

/**
 * @swagger
 * /api/mcp/agents/{agentId}/services/{serviceId}:
 *   delete:
 *     summary: 移除智能體服務權限
 *     tags: [MCP Agent Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 智能體 ID
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 服務 ID
 *     responses:
 *       200:
 *         description: 權限移除成功
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
 *         description: 智能體或服務權限不存在
 */
router.delete(
  "/:agentId/services/:serviceId",
  authenticateToken,
  requireRole(["admin", "super_admin"]),
  handleRemoveAgentService
);

/**
 * @swagger
 * /api/mcp/agents/{agentId}/services/batch:
 *   put:
 *     summary: 批量更新智能體服務權限
 *     tags: [MCP Agent Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 智能體 ID
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
 *                 description: 要保留的服務 ID 列表（其他權限將被移除）
 *     responses:
 *       200:
 *         description: 權限批量更新成功
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
 *                     addedCount:
 *                       type: integer
 *                       description: 新增的權限數量
 *                     removedCount:
 *                       type: integer
 *                       description: 移除的權限數量
 *                     totalCount:
 *                       type: integer
 *                       description: 最終權限總數
 *       404:
 *         description: 智能體不存在
 */
router.put(
  "/:agentId/services/batch",
  authenticateToken,
  requireRole(["admin", "super_admin"]),
  handleBatchUpdateAgentServices
);

export default router;

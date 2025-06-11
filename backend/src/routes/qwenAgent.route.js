/**
 * Qwen-Agent 路由
 * 定義 Qwen-Agent 相關的 API 端點
 */

import express from "express";
import {
  initializeQwenAgent,
  getQwenAgentStatus,
  getMcpTools,
  callMcpTool,
  processQwenAgentMessage,
  createQwenAgent,
  testQwenAgent,
} from "../controllers/qwenAgent.controller.js";
import {
  authenticateToken,
  requireRole,
} from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     QwenAgentStatus:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         status:
 *           type: object
 *           properties:
 *             mcp_server:
 *               type: boolean
 *             ollama_service:
 *               type: boolean
 *             tools_loaded:
 *               type: integer
 *             qwen_model:
 *               type: string
 *             last_check:
 *               type: string
 *               format: date-time
 *
 *     McpTool:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         parameters:
 *           type: object
 *         module:
 *           type: string
 *
 *     QwenAgentMessage:
 *       type: object
 *       required:
 *         - message
 *       properties:
 *         agentId:
 *           type: integer
 *         message:
 *           type: string
 *         conversationHistory:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, assistant, system]
 *               content:
 *                 type: string
 */

/**
 * @swagger
 * /api/qwen-agent/initialize:
 *   post:
 *     summary: 初始化 Qwen-Agent 服務
 *     tags: [Qwen-Agent]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 初始化成功
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
 *                   type: boolean
 */
router.post(
  "/initialize",
  authenticateToken,
  requireRole(["admin", "super_admin"]),
  initializeQwenAgent
);

/**
 * @swagger
 * /api/qwen-agent/status:
 *   get:
 *     summary: 取得 Qwen-Agent 狀態
 *     tags: [Qwen-Agent]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 狀態取得成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/QwenAgentStatus'
 */
router.get("/status", authenticateToken, getQwenAgentStatus);

/**
 * @swagger
 * /api/qwen-agent/tools:
 *   get:
 *     summary: 取得 MCP 工具列表
 *     tags: [Qwen-Agent]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 工具列表取得成功
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
router.get("/tools", authenticateToken, getMcpTools);

/**
 * @swagger
 * /api/qwen-agent/tools/{toolName}/call:
 *   post:
 *     summary: 調用 MCP 工具
 *     tags: [Qwen-Agent]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: toolName
 *         required: true
 *         schema:
 *           type: string
 *         description: 工具名稱 (例如 hr.get_department_list)
 *     requestBody:
 *       description: 工具參數
 *       content:
 *         application/json:
 *           schema:
 *             type: object
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
 */
router.post("/tools/:toolName/call", authenticateToken, callMcpTool);

/**
 * @swagger
 * /api/qwen-agent/chat:
 *   post:
 *     summary: 處理 Qwen-Agent 對話
 *     tags: [Qwen-Agent]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: 對話請求
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QwenAgentMessage'
 *     responses:
 *       200:
 *         description: 對話處理成功
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
 *                     response:
 *                       type: string
 *                     hasToolCalls:
 *                       type: boolean
 *                     toolCalls:
 *                       type: array
 *                     toolResults:
 *                       type: array
 */
router.post("/chat", authenticateToken, processQwenAgentMessage);

/**
 * @swagger
 * /api/qwen-agent/create:
 *   post:
 *     summary: 創建 Qwen-Agent
 *     tags: [Qwen-Agent]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: Agent 配置
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - display_name
 *               - system_prompt
 *             properties:
 *               name:
 *                 type: string
 *               display_name:
 *                 type: string
 *               description:
 *                 type: string
 *               system_prompt:
 *                 type: string
 *               category:
 *                 type: string
 *     responses:
 *       200:
 *         description: Agent 創建成功
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
 */
router.post(
  "/create",
  authenticateToken,
  requireRole(["admin", "super_admin"]),
  createQwenAgent
);

/**
 * @swagger
 * /api/qwen-agent/test:
 *   get:
 *     summary: 測試 Qwen-Agent 功能
 *     tags: [Qwen-Agent]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: testCase
 *         schema:
 *           type: string
 *           enum: [basic, hr, tasks, finance]
 *         description: 測試案例類型
 *     responses:
 *       200:
 *         description: 測試完成
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
 *                     testCase:
 *                       type: string
 *                     testMessage:
 *                       type: string
 *                     result:
 *                       type: object
 */
router.get("/test", authenticateToken, testQwenAgent);

export default router;

/**
 * 快速命令詞路由
 * 處理快速命令詞相關的路由配置和 API 文檔
 */

import express from "express";
import quickCommandsController from "../controllers/quickCommands.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     QuickCommand:
 *       type: object
 *       required:
 *         - id
 *         - text
 *       properties:
 *         id:
 *           type: integer
 *           description: 快速命令詞 ID
 *         text:
 *           type: string
 *           description: 命令詞文字
 *         description:
 *           type: string
 *           description: 命令詞描述
 *         icon:
 *           type: string
 *           description: 圖標名稱
 *         usage_count:
 *           type: integer
 *           description: 使用次數
 *         is_active:
 *           type: boolean
 *           description: 是否啟用
 *       example:
 *         id: 1
 *         text: "解釋一個複雜的概念"
 *         description: "請解釋一個複雜的概念，用簡單易懂的方式"
 *         icon: "book"
 *         usage_count: 15
 *         is_active: true
 *
 *     QuickCommandCreate:
 *       type: object
 *       required:
 *         - command_text
 *       properties:
 *         command_text:
 *           type: string
 *           description: 命令詞文字
 *         description:
 *           type: string
 *           description: 命令詞描述
 *         icon:
 *           type: string
 *           description: 圖標名稱
 *       example:
 *         command_text: "分析市場趨勢"
 *         description: "請分析當前的市場趨勢和投資機會"
 *         icon: "chart"
 *
 *     ApiResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: 請求是否成功
 *         message:
 *           type: string
 *           description: 響應消息
 *         data:
 *           type: object
 *           description: 響應數據
 *         error:
 *           type: string
 *           description: 錯誤信息（僅開發環境）
 */

/**
 * @swagger
 * /api/quick-commands/agent/{agentId}:
 *   get:
 *     summary: 獲取智能體的快速命令詞
 *     tags: [QuickCommands]
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
 *         description: 成功獲取快速命令詞列表
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/QuickCommand'
 *       400:
 *         description: 請求參數錯誤
 *       401:
 *         description: 未授權
 *       500:
 *         description: 服務器錯誤
 */
router.get(
  "/agent/:agentId",
  authenticateToken,
  quickCommandsController.getAgentQuickCommands
);

/**
 * @swagger
 * /api/quick-commands:
 *   get:
 *     summary: 獲取所有快速命令詞
 *     tags: [QuickCommands]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *           default: true
 *         description: 是否只獲取啟用的命令詞
 *     responses:
 *       200:
 *         description: 成功獲取快速命令詞列表
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/QuickCommand'
 *       401:
 *         description: 未授權
 *       500:
 *         description: 服務器錯誤
 *   post:
 *     summary: 創建新的快速命令詞
 *     tags: [QuickCommands]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QuickCommandCreate'
 *     responses:
 *       201:
 *         description: 成功創建快速命令詞
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/QuickCommand'
 *       400:
 *         description: 請求參數錯誤
 *       401:
 *         description: 未授權
 *       409:
 *         description: 命令詞已存在
 *       500:
 *         description: 服務器錯誤
 */
/**
 * @swagger
 * /api/quick-commands/admin:
 *   get:
 *     summary: 獲取所有快速命令詞及智能體關聯（管理介面）
 *     tags: [QuickCommands]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: string
 *           enum: ["true", "false"]
 *         description: 是否只獲取啟用的命令詞
 *     responses:
 *       200:
 *         description: 成功獲取快速命令詞管理列表
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         allOf:
 *                           - $ref: '#/components/schemas/QuickCommand'
 *                           - type: object
 *                             properties:
 *                               agent_id:
 *                                 type: integer
 *                                 description: 關聯的智能體ID
 *                               agent_name:
 *                                 type: string
 *                                 description: 智能體顯示名稱
 *       401:
 *         description: 未授權
 *       500:
 *         description: 服務器錯誤
 */
router.get(
  "/admin",
  authenticateToken,
  quickCommandsController.getAllQuickCommandsForAdmin
);

router.get("/", authenticateToken, quickCommandsController.getAllQuickCommands);
router.post("/", authenticateToken, quickCommandsController.createQuickCommand);

/**
 * @swagger
 * /api/quick-commands/{commandId}:
 *   get:
 *     summary: 根據 ID 獲取快速命令詞
 *     tags: [QuickCommands]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commandId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 命令詞 ID
 *     responses:
 *       200:
 *         description: 成功獲取快速命令詞
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/QuickCommand'
 *       400:
 *         description: 請求參數錯誤
 *       401:
 *         description: 未授權
 *       404:
 *         description: 命令詞不存在
 *       500:
 *         description: 服務器錯誤
 *   put:
 *     summary: 更新快速命令詞
 *     tags: [QuickCommands]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commandId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 命令詞 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               command_text:
 *                 type: string
 *                 description: 命令詞文字
 *               description:
 *                 type: string
 *                 description: 命令詞描述
 *               icon:
 *                 type: string
 *                 description: 圖標名稱
 *               is_active:
 *                 type: boolean
 *                 description: 是否啟用
 *     responses:
 *       200:
 *         description: 成功更新快速命令詞
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: 請求參數錯誤
 *       401:
 *         description: 未授權
 *       404:
 *         description: 命令詞不存在
 *       500:
 *         description: 服務器錯誤
 *   delete:
 *     summary: 刪除快速命令詞（軟刪除）
 *     tags: [QuickCommands]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commandId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 命令詞 ID
 *     responses:
 *       200:
 *         description: 成功刪除快速命令詞
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: 請求參數錯誤
 *       401:
 *         description: 未授權
 *       404:
 *         description: 命令詞不存在
 *       500:
 *         description: 服務器錯誤
 */
router.get(
  "/:commandId",
  authenticateToken,
  quickCommandsController.getQuickCommandById
);
router.put(
  "/:commandId",
  authenticateToken,
  quickCommandsController.updateQuickCommand
);
router.delete(
  "/:commandId",
  authenticateToken,
  quickCommandsController.deleteQuickCommand
);

/**
 * @swagger
 * /api/quick-commands/{commandId}/usage:
 *   post:
 *     summary: 增加快速命令詞使用次數統計
 *     tags: [QuickCommands]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commandId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 命令詞 ID
 *     responses:
 *       200:
 *         description: 成功更新使用次數
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: 請求參數錯誤
 *       401:
 *         description: 未授權
 *       404:
 *         description: 命令詞不存在
 *       500:
 *         description: 服務器錯誤
 */
router.post(
  "/:commandId/usage",
  authenticateToken,
  quickCommandsController.incrementCommandUsage
);

export default router;

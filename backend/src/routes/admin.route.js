/**
 * 管理員主路由
 * 統一入口，分發到各個子模塊
 */

import express from "express";
import usersRoutes from "./admin/users.route.js";
import systemRoutes from "./admin/system.route.js";
import agentsRoutes from "./admin/agents.route.js";
import chatService from "../services/chat.service.js";
import globalPromptService from "../services/globalPrompt.service.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import logger from "../utils/logger.util.js";

const router = express.Router();

// 分發到各個子模塊
router.use("/users", usersRoutes);
router.use("/system", systemRoutes);
router.use("/agents", agentsRoutes);

/**
 * @swagger
 * /api/admin/global-prompt/preview:
 *   get:
 *     summary: 獲取全域提示詞規則預覽
 *     tags: [Admin - Global Prompt]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 全域提示詞規則內容
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     rules:
 *                       type: string
 *                       description: 全域規則內容
 *                     stats:
 *                       type: object
 *                       properties:
 *                         cacheStatus:
 *                           type: string
 *                         rulesLength:
 *                           type: number
 *       401:
 *         description: 未授權
 *       403:
 *         description: 權限不足
 */
router.get(
  "/global-prompt/preview",
  authenticate,
  authorize(["admin"]),
  async (req, res) => {
    try {
      logger.info("管理員請求全域提示詞預覽", {
        userId: req.user?.id,
        userRole: req.user?.role,
      });

      const rules = await chatService.getGlobalRulesPreview();
      const stats = globalPromptService.getRulesStats();

      res.json({
        success: true,
        data: {
          rules,
          stats,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error("獲取全域提示詞預覽失敗", {
        error: error.message,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: "獲取全域提示詞預覽失敗",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/admin/global-prompt/update:
 *   put:
 *     summary: 更新全域提示詞規則
 *     tags: [Admin - Global Prompt]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rules:
 *                 type: string
 *                 description: 新的全域規則內容
 *     responses:
 *       200:
 *         description: 全域規則更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.put(
  "/global-prompt/update",
  authenticate,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const { rules } = req.body;

      if (!rules || typeof rules !== "string") {
        return res.status(400).json({
          success: false,
          message: "無效的規則內容",
        });
      }

      logger.info("管理員請求更新全域提示詞規則", {
        userId: req.user?.id,
        userRole: req.user?.role,
        rulesLength: rules.length,
      });

      const success = await globalPromptService.updateGlobalRules(rules);

      if (success) {
        res.json({
          success: true,
          message: "全域提示詞規則更新成功",
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          success: false,
          message: "全域提示詞規則更新失敗",
        });
      }
    } catch (error) {
      logger.error("更新全域提示詞規則失敗", {
        error: error.message,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: "更新全域提示詞規則失敗",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/admin/global-prompt/system-prompt-preview:
 *   post:
 *     summary: 獲取包含全域規則的完整系統提示詞預覽
 *     tags: [Admin - Global Prompt]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               basePrompt:
 *                 type: string
 *                 description: 智能體的基礎提示詞
 *     responses:
 *       200:
 *         description: 完整系統提示詞
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     fullPrompt:
 *                       type: string
 *                       description: 完整系統提示詞
 *                     promptLength:
 *                       type: number
 *                     hasGlobalRules:
 *                       type: boolean
 *                     hasToolPrompts:
 *                       type: boolean
 */
router.post(
  "/global-prompt/system-prompt-preview",
  authenticate,
  authorize(["admin"]),
  async (req, res) => {
    try {
      const { basePrompt = "" } = req.body;

      logger.info("管理員請求完整系統提示詞預覽", {
        userId: req.user?.id,
        userRole: req.user?.role,
        basePromptLength: basePrompt.length,
      });

      const fullPrompt =
        await chatService.getFullSystemPromptPreview(basePrompt);

      // 分析提示詞內容
      const hasGlobalRules = fullPrompt.includes("## 🔒 核心行為規則");
      const hasToolPrompts = fullPrompt.includes("## 🛠️ 可用工具系統");

      res.json({
        success: true,
        data: {
          fullPrompt,
          promptLength: fullPrompt.length,
          hasGlobalRules,
          hasToolPrompts,
          basePromptLength: basePrompt.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error("獲取完整系統提示詞預覽失敗", {
        error: error.message,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: "獲取完整系統提示詞預覽失敗",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/admin/global-prompt/cache/clear:
 *   post:
 *     summary: 清除全域提示詞快取
 *     tags: [Admin - Global Prompt]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 快取清除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.post(
  "/global-prompt/cache/clear",
  authenticate,
  authorize(["admin"]),
  async (req, res) => {
    try {
      logger.info("管理員請求清除全域提示詞快取", {
        userId: req.user?.id,
        userRole: req.user?.role,
      });

      // 清除所有相關快取
      chatService.clearCache();

      res.json({
        success: true,
        message: "全域提示詞快取已清除",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("清除全域提示詞快取失敗", {
        error: error.message,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: "清除全域提示詞快取失敗",
        error: error.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/admin/global-prompt/stats:
 *   get:
 *     summary: 獲取全域提示詞系統統計
 *     tags: [Admin - Global Prompt]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 系統統計資訊
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     toolStats:
 *                       type: object
 *                     globalRulesStats:
 *                       type: object
 *                     systemHealth:
 *                       type: object
 */
router.get(
  "/global-prompt/stats",
  authenticate,
  authorize(["admin"]),
  async (req, res) => {
    try {
      logger.info("管理員請求全域提示詞系統統計", {
        userId: req.user?.id,
        userRole: req.user?.role,
      });

      const toolStats = await chatService.getToolStats();
      const globalRulesStats = globalPromptService.getRulesStats();

      res.json({
        success: true,
        data: {
          toolStats,
          globalRulesStats,
          systemHealth: {
            globalPromptService: "active",
            chatService: "active",
            cacheSystem: "active",
          },
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error("獲取全域提示詞系統統計失敗", {
        error: error.message,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        message: "獲取系統統計失敗",
        error: error.message,
      });
    }
  }
);

export default router;

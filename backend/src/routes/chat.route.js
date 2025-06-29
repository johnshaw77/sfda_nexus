/**
 * 聊天路由
 * 處理對話和訊息相關的API端點
 */

import express from "express";
import chatController from "../controllers/chat.controller.js";
import {
  authenticateToken,
  optionalAuth,
} from "../middleware/auth.middleware.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

// 聊天相關的速率限制
const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分鐘
  max: 30, // 最多30次請求
  message: {
    success: false,
    message: "聊天請求過於頻繁，請稍後再試",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const sendMessageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分鐘
  max: 10, // 最多10條訊息
  message: {
    success: false,
    message: "發送訊息過於頻繁，請稍後再試",
    code: "MESSAGE_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateConversationRequest:
 *       type: object
 *       required:
 *         - model_id
 *       properties:
 *         model_id:
 *           type: integer
 *           description: AI模型ID
 *           example: 1
 *         agent_id:
 *           type: integer
 *           description: 智能體ID（可選）
 *           example: 1
 *         title:
 *           type: string
 *           maxLength: 200
 *           description: 對話標題
 *           example: "新的聊天會話"
 *         context:
 *           type: object
 *           description: 對話上下文配置
 *           example: {"temperature": 0.7}
 *
 *     SendMessageRequest:
 *       type: object
 *       required:
 *         - content
 *       properties:
 *         content:
 *           type: string
 *           description: 訊息內容
 *           example: "你好，請介紹一下你自己"
 *         content_type:
 *           type: string
 *           enum: [text, image, file, mixed]
 *           default: text
 *           description: 內容類型
 *         attachments:
 *           type: array
 *           description: 附件列表
 *           items:
 *             type: object
 *         metadata:
 *           type: object
 *           description: 額外元數據
 *         temperature:
 *           type: number
 *           minimum: 0
 *           maximum: 2
 *           default: 0.7
 *           description: 模型溫度參數
 *         max_tokens:
 *           type: integer
 *           minimum: 1
 *           maximum: 32768
 *           default: 4096
 *           description: 最大token數
 *
 *     Conversation:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 對話ID
 *         user_id:
 *           type: integer
 *           description: 用戶ID
 *         agent_id:
 *           type: integer
 *           description: 智能體ID
 *           nullable: true
 *         model_id:
 *           type: integer
 *           description: AI模型ID
 *         title:
 *           type: string
 *           description: 對話標題
 *         summary:
 *           type: string
 *           description: 對話摘要
 *           nullable: true
 *         context:
 *           type: object
 *           description: 對話上下文
 *           nullable: true
 *         message_count:
 *           type: integer
 *           description: 訊息數量
 *         total_tokens:
 *           type: integer
 *           description: 總token使用量
 *         total_cost:
 *           type: number
 *           description: 總費用
 *         status:
 *           type: string
 *           enum: [active, archived, deleted]
 *           description: 對話狀態
 *         is_pinned:
 *           type: boolean
 *           description: 是否置頂
 *         last_message_at:
 *           type: string
 *           format: date-time
 *           description: 最後訊息時間
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 創建時間
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: 更新時間
 *
 *     Message:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 訊息ID
 *         conversation_id:
 *           type: integer
 *           description: 對話ID
 *         role:
 *           type: string
 *           enum: [user, assistant, system]
 *           description: 角色
 *         content:
 *           type: string
 *           description: 訊息內容
 *         content_type:
 *           type: string
 *           enum: [text, image, file, mixed]
 *           description: 內容類型
 *         attachments:
 *           type: array
 *           description: 附件信息
 *           nullable: true
 *         metadata:
 *           type: object
 *           description: 額外元數據
 *           nullable: true
 *         tokens_used:
 *           type: integer
 *           description: 使用的token數
 *         cost:
 *           type: number
 *           description: 費用
 *         model_info:
 *           type: object
 *           description: 模型調用信息
 *           nullable: true
 *         processing_time:
 *           type: integer
 *           description: 處理時間(毫秒)
 *         is_edited:
 *           type: boolean
 *           description: 是否已編輯
 *         is_deleted:
 *           type: boolean
 *           description: 是否已刪除
 *         parent_message_id:
 *           type: integer
 *           description: 父訊息ID
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 創建時間
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: 更新時間
 *
 *     AIModel:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 模型ID
 *         name:
 *           type: string
 *           description: 模型名稱
 *         display_name:
 *           type: string
 *           description: 顯示名稱
 *         description:
 *           type: string
 *           description: 模型描述
 *         model_type:
 *           type: string
 *           enum: [ollama, gemini, openai, claude, custom]
 *           description: 模型類型
 *         model_id:
 *           type: string
 *           description: 模型標識符
 *         is_active:
 *           type: boolean
 *           description: 是否啟用
 *         is_default:
 *           type: boolean
 *           description: 是否為預設模型
 *         is_multimodal:
 *           type: boolean
 *           description: 是否支援多模態
 *         max_tokens:
 *           type: integer
 *           description: 最大token數

 *
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
 *           description: 智能體描述
 *         avatar_url:
 *           type: string
 *           description: 智能體頭像
 *           nullable: true
 *         system_prompt:
 *           type: string
 *           description: 系統提示詞
 *         model_id:
 *           type: integer
 *           description: 關聯的AI模型ID
 *         category:
 *           type: string
 *           description: 智能體分類
 *         tags:
 *           type: array
 *           description: 標籤
 *           nullable: true
 *         usage_count:
 *           type: integer
 *           description: 使用次數
 *         rating:
 *           type: number
 *           description: 評分
 */

/**
 * @swagger
 * /api/chat/conversations:
 *   post:
 *     tags: [Chat]
 *     summary: 創建新對話
 *     description: 創建一個新的對話會話
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateConversationRequest'
 *     responses:
 *       201:
 *         description: 對話創建成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: 請求參數錯誤
 *       401:
 *         description: 未認證
 *
 *   get:
 *     tags: [Chat]
 *     summary: 獲取對話列表
 *     description: 獲取當前用戶的對話列表
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, archived, all]
 *           default: active
 *         description: 對話狀態
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索關鍵詞
 *       - in: query
 *         name: agent_id
 *         schema:
 *           type: integer
 *         description: 智能體ID
 *     responses:
 *       200:
 *         description: 獲取對話列表成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         conversations:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Conversation'
 *                         total:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       401:
 *         description: 未認證
 */
router.post(
  "/conversations",
  authenticateToken,
  chatController.handleCreateConversation
);
router.get(
  "/conversations",
  authenticateToken,
  chatController.handleGetConversations
);

/**
 * @swagger
 * /api/chat/conversations/{conversationId}:
 *   get:
 *     tags: [Chat]
 *     summary: 獲取對話詳情
 *     description: 獲取指定對話的詳細信息
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 對話ID
 *     responses:
 *       200:
 *         description: 獲取對話詳情成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Conversation'
 *       401:
 *         description: 未認證
 *       404:
 *         description: 對話不存在
 *
 *   put:
 *     tags: [Chat]
 *     summary: 更新對話
 *     description: 更新對話的基本信息
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 對話ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 200
 *               summary:
 *                 type: string
 *               context:
 *                 type: object
 *               is_pinned:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 對話更新成功
 *       401:
 *         description: 未認證
 *       404:
 *         description: 對話不存在
 *
 *   delete:
 *     tags: [Chat]
 *     summary: 刪除對話
 *     description: 軟刪除指定的對話
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 對話ID
 *     responses:
 *       200:
 *         description: 對話刪除成功
 *       401:
 *         description: 未認證
 *       404:
 *         description: 對話不存在
 */
router.get(
  "/conversations/:conversationId",
  authenticateToken,
  chatController.handleGetConversation
);
router.put(
  "/conversations/:conversationId",
  authenticateToken,
  chatController.handleUpdateConversation
);
router.delete(
  "/conversations/:conversationId",
  authenticateToken,
  chatController.handleDeleteConversation
);

/**
 * @swagger
 * /api/chat/conversations/{conversationId}/messages:
 *   post:
 *     tags: [Chat]
 *     summary: 發送訊息
 *     description: 向指定對話發送訊息並獲取AI回應
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 對話ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendMessageRequest'
 *     responses:
 *       200:
 *         description: 訊息發送成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user_message:
 *                           $ref: '#/components/schemas/Message'
 *                         assistant_message:
 *                           $ref: '#/components/schemas/Message'
 *                         conversation:
 *                           $ref: '#/components/schemas/Conversation'
 *       400:
 *         description: 請求參數錯誤
 *       401:
 *         description: 未認證
 *       404:
 *         description: 對話不存在
 *       429:
 *         description: 請求過於頻繁
 *
 *   get:
 *     tags: [Chat]
 *     summary: 獲取對話訊息
 *     description: 獲取指定對話的訊息列表
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 對話ID
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
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, assistant, system]
 *         description: 角色篩選
 *       - in: query
 *         name: content_type
 *         schema:
 *           type: string
 *           enum: [text, image, file, mixed]
 *         description: 內容類型篩選
 *     responses:
 *       200:
 *         description: 獲取訊息列表成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         messages:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Message'
 *                         total:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       401:
 *         description: 未認證
 *       404:
 *         description: 對話不存在
 */
router.post(
  "/conversations/:conversationId/messages",
  authenticateToken,
  sendMessageLimiter,
  chatController.handleSendMessage
);

/**
 * @swagger
 * /api/chat/conversations/{conversationId}/messages/stream:
 *   post:
 *     tags: [Chat]
 *     summary: 發送訊息（串流模式）
 *     description: 向指定對話發送訊息並以串流方式獲取AI回應，支援即時字符級顯示
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 對話ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendMessageRequest'
 *     responses:
 *       200:
 *         description: 串流回應成功
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               description: Server-Sent Events 格式的串流數據
 *               example: |
 *                 event: user_message
 *                 data: {"id": 123, "content": "用戶訊息內容", "role": "user"}
 *
 *                 event: assistant_message_created
 *                 data: {"id": 124, "role": "assistant", "conversation_id": 1}
 *
 *                 event: stream_content
 *                 data: {"content": "你"}
 *
 *                 event: stream_content
 *                 data: {"content": "好"}
 *
 *                 event: stream_done
 *                 data: {"message": {"id": 124, "content": "你好，我是AI助手", "tokens_used": 15}}
 *
 *                 event: conversation_updated
 *                 data: {"conversation": {"id": 1, "message_count": 10, "total_tokens": 150}}
 *       400:
 *         description: 請求參數錯誤
 *       401:
 *         description: 未認證
 *       404:
 *         description: 對話不存在
 *       429:
 *         description: 請求過於頻繁
 *       500:
 *         description: 伺服器錯誤
 */
router.post(
  "/conversations/:conversationId/messages/stream",
  authenticateToken,
  sendMessageLimiter,
  chatController.handleSendMessageStream
);

router.get(
  "/conversations/:conversationId/messages",
  authenticateToken,
  chatController.handleGetMessages
);

/**
 * @swagger
 * /api/chat/conversations/{conversationId}/archive:
 *   post:
 *     tags: [Chat]
 *     summary: 歸檔對話
 *     description: 將對話標記為已歸檔
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 對話ID
 *     responses:
 *       200:
 *         description: 對話歸檔成功
 *       401:
 *         description: 未認證
 *       404:
 *         description: 對話不存在
 */
router.post(
  "/conversations/:conversationId/archive",
  authenticateToken,
  chatController.handleArchiveConversation
);

/**
 * @swagger
 * /api/chat/conversations/{conversationId}/restore:
 *   post:
 *     tags: [Chat]
 *     summary: 恢復對話
 *     description: 將歸檔的對話恢復為活躍狀態
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 對話ID
 *     responses:
 *       200:
 *         description: 對話恢復成功
 *       401:
 *         description: 未認證
 *       404:
 *         description: 對話不存在
 */
router.post(
  "/conversations/:conversationId/restore",
  authenticateToken,
  chatController.handleRestoreConversation
);

/**
 * @swagger
 * /api/chat/conversations/{conversationId}/pin:
 *   post:
 *     tags: [Chat]
 *     summary: 置頂/取消置頂對話
 *     description: 切換對話的置頂狀態
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 對話ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pinned:
 *                 type: boolean
 *                 default: true
 *                 description: 是否置頂
 *     responses:
 *       200:
 *         description: 置頂狀態更新成功
 *       401:
 *         description: 未認證
 *       404:
 *         description: 對話不存在
 */
router.post(
  "/conversations/:conversationId/pin",
  authenticateToken,
  chatController.handleTogglePinConversation
);

/**
 * @swagger
 * /api/chat/models:
 *   get:
 *     tags: [Chat]
 *     summary: 獲取可用的AI模型
 *     description: 獲取系統中配置且可用的AI模型列表
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 獲取可用模型成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         ollama:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/AIModel'
 *                         gemini:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/AIModel'
 *       401:
 *         description: 未認證
 */
router.get(
  "/models",
  authenticateToken,
  chatController.handleGetAvailableModels
);

/**
 * @swagger
 * /api/chat/agents:
 *   get:
 *     tags: [Chat]
 *     summary: 獲取智能體列表
 *     description: 獲取可用的智能體列表
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: 智能體分類
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索關鍵詞
 *     responses:
 *       200:
 *         description: 獲取智能體列表成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Agent'
 *       401:
 *         description: 未認證
 */
router.get("/agents", authenticateToken, chatController.handleGetAgents);

/**
 * @swagger
 * /api/chat/tools/stats:
 *   get:
 *     tags: [Chat]
 *     summary: 獲取 MCP 工具統計資訊
 *     description: 獲取 MCP 工具的使用統計和狀態資訊
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 獲取工具統計成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         total_tools:
 *                           type: integer
 *                           description: 總工具數量
 *                         enabled_tools:
 *                           type: integer
 *                           description: 已啟用工具數量
 *                         total_usage:
 *                           type: integer
 *                           description: 總使用次數
 *                         category_stats:
 *                           type: object
 *                           description: 分類統計
 *                         last_updated:
 *                           type: string
 *                           format: date-time
 *                           description: 最後更新時間
 *       401:
 *         description: 未認證
 */
router.get(
  "/tools/stats",
  authenticateToken,
  chatController.handleGetToolStats
);

/**
 * @swagger
 * /api/chat/system-prompt/preview:
 *   post:
 *     tags: [Chat]
 *     summary: 預覽動態系統提示詞
 *     description: 預覽包含 MCP 工具資訊的動態系統提示詞
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               base_prompt:
 *                 type: string
 *                 description: 基礎系統提示詞
 *                 example: "你是一個有用的AI助手"
 *               model_type:
 *                 type: string
 *                 enum: [ollama, gemini, openai]
 *                 default: ollama
 *                 description: 模型類型
 *     responses:
 *       200:
 *         description: 系統提示詞預覽生成成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         base_prompt:
 *                           type: string
 *                           description: 基礎提示詞
 *                         full_system_prompt:
 *                           type: string
 *                           description: 完整系統提示詞
 *                         prompt_length:
 *                           type: integer
 *                           description: 提示詞長度
 *                         generated_at:
 *                           type: string
 *                           format: date-time
 *                           description: 生成時間
 *       401:
 *         description: 未認證
 */
router.post(
  "/system-prompt/preview",
  authenticateToken,
  chatController.handlePreviewSystemPrompt
);

/**
 * @swagger
 * /api/chat/system-prompt/clear-cache:
 *   post:
 *     tags: [Chat]
 *     summary: 清除系統提示詞快取
 *     description: 清除系統提示詞的快取，強制重新生成
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 快取清除成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: 未認證
 */
router.post(
  "/system-prompt/clear-cache",
  authenticateToken,
  chatController.handleClearPromptCache
);

/**
 * @swagger
 * /api/chat/optimize-prompt:
 *   post:
 *     tags: [Chat]
 *     summary: 優化提示詞
 *     description: 使用 AI 優化用戶輸入的提示詞，使其更清晰、具體和有效
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: 原始提示詞
 *                 example: "幫我寫個報告"
 *               context:
 *                 type: string
 *                 description: 額外的上下文信息
 *                 example: "關於公司Q3財務狀況"
 *     responses:
 *       200:
 *         description: 提示詞優化成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         original_prompt:
 *                           type: string
 *                           description: 原始提示詞
 *                         optimized_prompt:
 *                           type: string
 *                           description: 優化後的提示詞
 *                         improvements:
 *                           type: array
 *                           items:
 *                             type: string
 *                           description: 改進要點列表
 *                         confidence:
 *                           type: number
 *                           description: 優化信心度 (0-1)
 *       400:
 *         description: 請求參數錯誤
 *       401:
 *         description: 未認證
 *       429:
 *         description: 請求過於頻繁
 */
router.post(
  "/optimize-prompt",
  authenticateToken,
  chatLimiter,
  chatController.handleOptimizePrompt
);

/**
 * @swagger
 * /api/chat/mcp/status:
 *   get:
 *     summary: 獲取 MCP 服務狀態
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: MCP 服務狀態獲取成功
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
 *                       type: object
 *                       properties:
 *                         total_services:
 *                           type: integer
 *                         healthy_services:
 *                           type: integer
 *                         connected_services:
 *                           type: integer
 *                         overall_health_rate:
 *                           type: string
 *                     services:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           service_id:
 *                             type: integer
 *                           service_name:
 *                             type: string
 *                           endpoint_url:
 *                             type: string
 *                           connected:
 *                             type: boolean
 *                           is_healthy:
 *                             type: boolean
 *                           response_time:
 *                             type: number
 *       401:
 *         description: 未認證
 *       403:
 *         description: 權限不足
 */
router.get(
  "/mcp/status",
  authenticateToken,
  chatController.handleGetMCPStatus
);

/**
 * @swagger
 * /api/chat/mcp/services/{serviceId}/reconnect:
 *   post:
 *     summary: 重新連接 MCP 服務
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: MCP 服務 ID
 *     responses:
 *       200:
 *         description: MCP 服務重新連接成功
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
 *                     service_id:
 *                       type: integer
 *                     reconnected:
 *                       type: boolean
 *                     is_healthy:
 *                       type: boolean
 *       400:
 *         description: 請求參數錯誤
 *       401:
 *         description: 未認證
 *       403:
 *         description: 權限不足
 */
router.post(
  "/mcp/services/:serviceId/reconnect",
  authenticateToken,
  chatController.handleReconnectMCPService
);

/**
 * @swagger
 * /api/chat/messages/{messageId}/full-content:
 *   get:
 *     tags:
 *       - Chat
 *     summary: 獲取訊息的完整內容
 *     description: 當訊息內容過長被截斷時，獲取完整的原始內容
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 訊息ID
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 獲取成功
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
 *                     id:
 *                       type: integer
 *                     fullContent:
 *                       type: string
 *                     originalLength:
 *                       type: integer
 *                     isTruncated:
 *                       type: boolean
 *                     truncatedAt:
 *                       type: string
 *                       format: date-time
 *       403:
 *         description: 無權限訪問
 *       404:
 *         description: 訊息不存在
 */
router.get(
  "/messages/:messageId/full-content",
  authenticateToken,
  chatController.handleGetFullMessageContent
);

export default router;

/**
 * 用戶管理路由
 * 處理用戶相關的管理功能路由
 */

import express from "express";
import usersController from "../controllers/users.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { rateLimitMiddleware } from "../middleware/rateLimit.middleware.js";

const router = express.Router();

// 所有用戶管理路由都需要認證
router.use(authenticateToken);

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 用戶ID
 *         username:
 *           type: string
 *           description: 用戶名
 *         email:
 *           type: string
 *           description: 電子郵件
 *         role:
 *           type: string
 *           enum: [user, admin, super_admin]
 *           description: 用戶角色
 *         is_active:
 *           type: boolean
 *           description: 是否啟用
 *         profile:
 *           type: object
 *           description: 用戶資料
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 創建時間
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: 更新時間
 *
 *     CreateUserRequest:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           minLength: 3
 *           maxLength: 30
 *           description: 用戶名
 *         email:
 *           type: string
 *           format: email
 *           description: 電子郵件
 *         password:
 *           type: string
 *           minLength: 6
 *           description: 密碼
 *         role:
 *           type: string
 *           enum: [user, admin, super_admin]
 *           default: user
 *           description: 用戶角色
 *         is_active:
 *           type: boolean
 *           default: true
 *           description: 是否啟用
 *         profile:
 *           type: object
 *           properties:
 *             display_name:
 *               type: string
 *               maxLength: 50
 *             avatar_url:
 *               type: string
 *               format: uri
 *             bio:
 *               type: string
 *               maxLength: 500
 *
 *     UpdateUserRequest:
 *       type: object
 *       properties:
 *         username:
 *           type: string
 *           minLength: 3
 *           maxLength: 30
 *         email:
 *           type: string
 *           format: email
 *         role:
 *           type: string
 *           enum: [user, admin, super_admin]
 *         is_active:
 *           type: boolean
 *         profile:
 *           type: object
 *           properties:
 *             display_name:
 *               type: string
 *               maxLength: 50
 *             avatar_url:
 *               type: string
 *               format: uri
 *             bio:
 *               type: string
 *               maxLength: 500
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: 獲取用戶列表
 *     tags: [用戶管理]
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
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, admin, super_admin]
 *         description: 角色篩選
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
 *         description: 獲取用戶列表成功
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
 *                         $ref: '#/components/schemas/User'
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
 *       401:
 *         description: 未認證
 *       403:
 *         description: 權限不足
 */
router.get(
  "/",
  rateLimitMiddleware("admin_users", 100, 15 * 60 * 1000), // 15分鐘100次
  usersController.handleGetUsers
);

/**
 * @swagger
 * /api/users/{userId}:
 *   get:
 *     summary: 獲取用戶詳情
 *     tags: [用戶管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用戶ID
 *     responses:
 *       200:
 *         description: 獲取用戶詳情成功
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
 *                   allOf:
 *                     - $ref: '#/components/schemas/User'
 *                     - type: object
 *                       properties:
 *                         stats:
 *                           type: object
 *                           properties:
 *                             conversations:
 *                               type: object
 *                             messages:
 *                               type: object
 *                             tokens:
 *                               type: object
 *       404:
 *         description: 用戶不存在
 */
router.get(
  "/:userId",
  rateLimitMiddleware("admin_user_detail", 50, 15 * 60 * 1000),
  usersController.handleGetUser
);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: 創建用戶
 *     tags: [用戶管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserRequest'
 *     responses:
 *       201:
 *         description: 用戶創建成功
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
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: 輸入驗證失敗
 *       409:
 *         description: 用戶名或郵箱已存在
 */
router.post(
  "/",
  rateLimitMiddleware("admin_create_user", 10, 60 * 60 * 1000), // 1小時10次
  usersController.handleCreateUser
);

/**
 * @swagger
 * /api/users/{userId}:
 *   put:
 *     summary: 更新用戶
 *     tags: [用戶管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用戶ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserRequest'
 *     responses:
 *       200:
 *         description: 用戶更新成功
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
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: 輸入驗證失敗
 *       404:
 *         description: 用戶不存在
 */
router.put(
  "/:userId",
  rateLimitMiddleware("admin_update_user", 50, 15 * 60 * 1000),
  usersController.handleUpdateUser
);

/**
 * @swagger
 * /api/users/{userId}:
 *   delete:
 *     summary: 刪除用戶
 *     tags: [用戶管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用戶ID
 *     responses:
 *       200:
 *         description: 用戶刪除成功
 *       400:
 *         description: 不能刪除自己的帳戶
 *       403:
 *         description: 權限不足
 *       404:
 *         description: 用戶不存在
 */
router.delete(
  "/:userId",
  rateLimitMiddleware("admin_delete_user", 10, 60 * 60 * 1000), // 1小時10次
  usersController.handleDeleteUser
);

/**
 * @swagger
 * /api/users/{userId}/reset-password:
 *   post:
 *     summary: 重置用戶密碼
 *     tags: [用戶管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用戶ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 description: 新密碼
 *     responses:
 *       200:
 *         description: 密碼重置成功
 *       400:
 *         description: 新密碼格式錯誤
 *       403:
 *         description: 權限不足
 *       404:
 *         description: 用戶不存在
 */
router.post(
  "/:userId/reset-password",
  rateLimitMiddleware("admin_reset_password", 5, 60 * 60 * 1000), // 1小時5次
  usersController.handleResetUserPassword
);

export default router;

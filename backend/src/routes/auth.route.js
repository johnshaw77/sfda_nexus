/**
 * 認證路由
 * 處理用戶認證相關的API端點
 */

import express from 'express';
import authController from '../controllers/auth.controller.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.middleware.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// 認證相關的速率限制
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分鐘
  max: 5, // 最多5次嘗試
  message: {
    success: false,
    message: '登入嘗試過於頻繁，請15分鐘後再試',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - identifier
 *         - password
 *       properties:
 *         identifier:
 *           type: string
 *           description: 用戶名或郵箱地址
 *           example: "admin"
 *         password:
 *           type: string
 *           format: password
 *           description: 用戶密碼
 *           example: "admin123"
 *         remember:
 *           type: boolean
 *           description: 是否記住登入狀態（30天）
 *           default: false
 *           example: false
 * 
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           pattern: '^[a-zA-Z0-9]{3,30}$'
 *           description: 用戶名（3-30位字母數字）
 *           example: "newuser"
 *         email:
 *           type: string
 *           format: email
 *           description: 郵箱地址
 *           example: "newuser@example.com"
 *         password:
 *           type: string
 *           pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$'
 *           description: 密碼（至少8位，包含大小寫字母和數字）
 *           example: "NewUser123"
 *         display_name:
 *           type: string
 *           maxLength: 100
 *           description: 顯示名稱
 *           example: "新用戶"
 *         department:
 *           type: string
 *           maxLength: 100
 *           description: 部門
 *           example: "技術部"
 *         position:
 *           type: string
 *           maxLength: 100
 *           description: 職位
 *           example: "軟體工程師"
 *         phone:
 *           type: string
 *           pattern: '^[\d\-\+\(\)]{10,20}$'
 *           description: 電話號碼
 *           example: "+886-123-456-789"
 * 
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "登入成功"
 *         data:
 *           type: object
 *           properties:
 *             access_token:
 *               type: string
 *               description: JWT存取令牌
 *               example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *             refresh_token:
 *               type: string
 *               description: JWT刷新令牌
 *               example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *             token_type:
 *               type: string
 *               example: "Bearer"
 *             expires_in:
 *               type: integer
 *               description: 令牌過期時間（秒）
 *               example: 604800
 *             user:
 *               $ref: '#/components/schemas/User'
 *         timestamp:
 *           type: string
 *           format: date-time
 * 
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 用戶ID
 *           example: 1
 *         username:
 *           type: string
 *           description: 用戶名
 *           example: "admin"
 *         email:
 *           type: string
 *           format: email
 *           description: 郵箱地址
 *           example: "admin@sfda-nexus.com"
 *         display_name:
 *           type: string
 *           description: 顯示名稱
 *           example: "系統管理員"
 *         avatar_url:
 *           type: string
 *           format: uri
 *           description: 頭像URL
 *           nullable: true
 *         role:
 *           type: string
 *           enum: [user, admin, super_admin]
 *           description: 用戶角色
 *           example: "super_admin"
 *         department:
 *           type: string
 *           description: 部門
 *           nullable: true
 *         position:
 *           type: string
 *           description: 職位
 *           nullable: true
 *         phone:
 *           type: string
 *           description: 電話號碼
 *           nullable: true
 *         is_active:
 *           type: boolean
 *           description: 是否啟用
 *           example: true
 *         email_verified:
 *           type: boolean
 *           description: 郵箱是否已驗證
 *           example: true
 *         last_login_at:
 *           type: string
 *           format: date-time
 *           description: 最後登入時間
 *           nullable: true
 *         login_count:
 *           type: integer
 *           description: 登入次數
 *           example: 10
 *         preferences:
 *           type: object
 *           description: 用戶偏好設置
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
 *     ChangePasswordRequest:
 *       type: object
 *       required:
 *         - current_password
 *         - new_password
 *         - confirm_password
 *       properties:
 *         current_password:
 *           type: string
 *           format: password
 *           description: 當前密碼
 *         new_password:
 *           type: string
 *           format: password
 *           pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$'
 *           description: 新密碼（至少8位，包含大小寫字母和數字）
 *         confirm_password:
 *           type: string
 *           format: password
 *           description: 確認新密碼
 * 
 *     RefreshTokenRequest:
 *       type: object
 *       required:
 *         - refresh_token
 *       properties:
 *         refresh_token:
 *           type: string
 *           description: 刷新令牌
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * 
 *     UserSession:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: 會話ID
 *         device_info:
 *           type: string
 *           description: 設備信息
 *           nullable: true
 *         ip_address:
 *           type: string
 *           description: IP地址
 *         user_agent:
 *           type: string
 *           description: 用戶代理
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: 創建時間
 *         expires_at:
 *           type: string
 *           format: date-time
 *           description: 過期時間
 * 
 *     TokenInfo:
 *       type: object
 *       properties:
 *         valid:
 *           type: boolean
 *           description: 令牌是否有效
 *           example: true
 *         user:
 *           $ref: '#/components/schemas/User'
 *         token_info:
 *           type: object
 *           properties:
 *             type:
 *               type: string
 *               description: 令牌類型
 *               example: "access"
 *             issued_at:
 *               type: string
 *               format: date-time
 *               description: 發放時間
 *             expires_at:
 *               type: string
 *               format: date-time
 *               description: 過期時間
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: 用戶登入
 *     description: 使用用戶名/郵箱和密碼進行身份驗證，返回JWT令牌
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: 登入成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: 請求參數錯誤
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 認證失敗
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: 請求過於頻繁
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/login', authLimiter, authController.handleLogin);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Authentication]
 *     summary: 用戶註冊
 *     description: 註冊新用戶帳號
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: 註冊成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: 請求參數錯誤
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: 數據驗證失敗
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/register', authLimiter, authController.handleRegister);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Authentication]
 *     summary: 用戶登出
 *     description: 登出當前會話，使令牌失效
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 登出成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: 未認證或令牌無效
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/logout', authenticateToken, authController.handleLogout);

/**
 * @swagger
 * /api/auth/logout-all:
 *   post:
 *     tags: [Authentication]
 *     summary: 登出所有設備
 *     description: 登出用戶在所有設備上的會話
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 已登出所有設備
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: 未認證或令牌無效
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/logout-all', authenticateToken, authController.handleLogoutAll);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Authentication]
 *     summary: 刷新訪問令牌
 *     description: 使用刷新令牌獲取新的訪問令牌
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *     responses:
 *       200:
 *         description: 令牌刷新成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: 請求參數錯誤
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 刷新令牌無效或已過期
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/refresh', authController.handleRefreshToken);

/**
 * @swagger
 * /api/auth/verify:
 *   get:
 *     tags: [Authentication]
 *     summary: 驗證令牌有效性
 *     description: 檢查當前令牌是否有效並返回用戶信息
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 令牌有效
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/TokenInfo'
 *       401:
 *         description: 令牌無效或已過期
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/verify', authenticateToken, authController.handleVerifyToken);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     tags: [Authentication]
 *     summary: 獲取當前用戶信息
 *     description: 獲取當前已認證用戶的詳細信息
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 獲取用戶信息成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: 未認證或令牌無效
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 * 
 *   put:
 *     tags: [Authentication]
 *     summary: 更新用戶資料
 *     description: 更新當前用戶的基本信息
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               display_name:
 *                 type: string
 *                 maxLength: 100
 *                 description: 顯示名稱
 *               avatar_url:
 *                 type: string
 *                 format: uri
 *                 description: 頭像URL
 *               department:
 *                 type: string
 *                 maxLength: 100
 *                 description: 部門
 *               position:
 *                 type: string
 *                 maxLength: 100
 *                 description: 職位
 *               phone:
 *                 type: string
 *                 pattern: '^[\d\-\+\(\)]{10,20}$'
 *                 description: 電話號碼
 *               preferences:
 *                 type: object
 *                 description: 用戶偏好設置
 *     responses:
 *       200:
 *         description: 資料更新成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: 請求參數錯誤
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 未認證或令牌無效
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/profile', authenticateToken, authController.handleGetProfile);
router.put('/profile', authenticateToken, authController.handleUpdateProfile);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     tags: [Authentication]
 *     summary: 修改密碼
 *     description: 修改當前用戶的登入密碼
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordRequest'
 *     responses:
 *       200:
 *         description: 密碼修改成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: 請求參數錯誤或新密碼與當前密碼相同
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: 當前密碼錯誤或未認證
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: 數據驗證失敗
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/change-password', authenticateToken, authController.handleChangePassword);

/**
 * @swagger
 * /api/auth/sessions:
 *   get:
 *     tags: [Authentication]
 *     summary: 獲取用戶活躍會話
 *     description: 獲取當前用戶的所有活躍會話列表
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 獲取會話列表成功
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
 *                         $ref: '#/components/schemas/UserSession'
 *       401:
 *         description: 未認證或令牌無效
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/sessions', authenticateToken, authController.handleGetSessions);

/**
 * @swagger
 * /api/auth/sessions/{sessionId}:
 *   delete:
 *     tags: [Authentication]
 *     summary: 註銷指定會話
 *     description: 註銷指定ID的用戶會話
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 會話ID
 *     responses:
 *       200:
 *         description: 會話已註銷
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: 未認證或令牌無效
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: 會話不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/sessions/:sessionId', authenticateToken, authController.handleRevokeSession);

export default router; 
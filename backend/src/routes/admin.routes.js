/**
 * 管理員路由
 * 定義管理員相關的API端點
 */

import express from "express";
import adminController from "../controllers/admin.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import { rateLimitMiddleware } from "../middleware/rateLimit.middleware.js";

const router = express.Router();

// 所有管理員路由都需要認證
router.use(authenticateToken);

// 用戶管理路由
router.get(
  "/users",
  rateLimitMiddleware("admin_users", 100, 15 * 60 * 1000), // 15分鐘100次
  adminController.handleGetUsers
);

router.get(
  "/users/:userId",
  rateLimitMiddleware("admin_user_detail", 50, 15 * 60 * 1000),
  adminController.handleGetUser
);

router.post(
  "/users",
  rateLimitMiddleware("admin_create_user", 10, 60 * 60 * 1000), // 1小時10次
  adminController.handleCreateUser
);

router.put(
  "/users/:userId",
  rateLimitMiddleware("admin_update_user", 50, 15 * 60 * 1000),
  adminController.handleUpdateUser
);

router.delete(
  "/users/:userId",
  rateLimitMiddleware("admin_delete_user", 10, 60 * 60 * 1000), // 1小時10次
  adminController.handleDeleteUser
);

router.post(
  "/users/:userId/reset-password",
  rateLimitMiddleware("admin_reset_password", 5, 60 * 60 * 1000), // 1小時5次
  adminController.handleResetUserPassword
);

// 系統管理路由
router.get(
  "/system/stats",
  rateLimitMiddleware("admin_system_stats", 30, 15 * 60 * 1000),
  adminController.handleGetSystemStats
);

router.get(
  "/system/config",
  rateLimitMiddleware("admin_system_config", 30, 15 * 60 * 1000),
  adminController.handleGetSystemConfig
);

router.put(
  "/system/config",
  rateLimitMiddleware("admin_update_config", 10, 60 * 60 * 1000), // 1小時10次
  adminController.handleUpdateSystemConfig
);

// 審計日誌路由
router.get(
  "/audit-logs",
  rateLimitMiddleware("admin_audit_logs", 50, 15 * 60 * 1000),
  adminController.handleGetAuditLogs
);

export default router;

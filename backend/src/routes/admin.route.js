/**
 * 管理員主路由
 * 統一入口，分發到各個子模塊
 */

import express from "express";
import usersRoutes from "./admin/users.route.js";
import systemRoutes from "./admin/system.route.js";
import agentsRoutes from "./admin/agents.route.js";

const router = express.Router();

// 分發到各個子模塊
router.use("/users", usersRoutes);
router.use("/system", systemRoutes);
router.use("/agents", agentsRoutes);

export default router;

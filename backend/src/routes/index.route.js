/**
 * API路由匯總文件
 * 整合所有模組的路由，提供統一的路由入口
 */

import express from "express";

// 導入各模組路由
import authRoutes from "./auth.route.js";
import chatRoutes from "./chat.route.js";
import usersRoutes from "./users.route.js";
import systemRoutes from "./system.route.js";
import agentsRoutes from "./agents.route.js";
import quickCommandsRoutes from "./quickCommands.route.js";
import modelsRoutes from "./models.route.js";
import filesRoutes from "./files.route.js";
import mcpServicesRoutes from "./mcpServices.route.js";
import mcpToolsRoutes from "./mcpTools.route.js";
// import workflowsRoutes from './workflows.route.js';
// import toolsRoutes from './tools.route.js';

const router = express.Router();

// API版本信息
router.get("/", (req, res) => {
  res.json({
    message: "sfda_nexus API",
    version: "1.0.0",
    documentation: "/api-docs",
    endpoints: {
      auth: "/api/auth",
      chat: "/api/chat",
      models: "/api/models",
      agents: "/api/agents",
      users: "/api/users",
      system: "/api/system",
      files: "/api/files",
      workflows: "/api/workflows",
      tools: "/api/tools",
      quickCommands: "/api/quick-commands",
      mcpServices: "/api/mcp/services",
      mcpTools: "/api/mcp/tools",
    },
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

// 健康檢查端點
router.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version,
  });
});

// API路由掛載
router.use("/auth", authRoutes); // 認證相關路由
router.use("/chat", chatRoutes); // 聊天功能路由
router.use("/users", usersRoutes); // 用戶管理路由
router.use("/system", systemRoutes); // 系統管理路由
router.use("/agents", agentsRoutes); // 智能體管理路由
router.use("/quick-commands", quickCommandsRoutes); // 快速命令詞路由
router.use("/models", modelsRoutes); // AI模型管理路由
router.use("/files", filesRoutes); // 檔案管理路由
router.use("/mcp/services", mcpServicesRoutes); // MCP 服務管理路由
router.use("/mcp/tools", mcpToolsRoutes); // MCP 工具管理路由
// router.use('/workflows', workflowsRoutes); // 工作流管理路由
// router.use('/tools', toolsRoutes);         // 工具管理路由

// 測試路由 (開發階段)
if (process.env.NODE_ENV === "development") {
  router.get("/test", (req, res) => {
    res.json({
      message: "測試路由正常",
      environment: "development",
      timestamp: new Date().toISOString(),
      headers: req.headers,
      query: req.query,
    });
  });
}

// 路由列表 (用於調試)
router.get("/routes", (req, res) => {
  const routes = [];

  // 遍歷所有已註冊的路由
  const listRoutes = (stack, prefix = "") => {
    stack.forEach((layer) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods)
          .join(", ")
          .toUpperCase();
        routes.push({
          path: prefix + layer.route.path,
          methods: methods,
        });
      } else if (layer.name === "router") {
        listRoutes(
          layer.handle.stack,
          prefix +
            layer.regexp.source
              .replace("\\/?(?=\\/|$)", "")
              .replace(/\\\//g, "/")
        );
      }
    });
  };

  listRoutes(router.stack, "/api");

  res.json({
    message: "已註冊的API路由",
    total: routes.length,
    routes: routes.sort((a, b) => a.path.localeCompare(b.path)),
  });
});

export default router;

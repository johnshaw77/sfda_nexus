/**
 * 智能體管理控制器
 * 處理智能體相關的管理功能
 */

import { query } from "../config/database.config.js";
import {
  catchAsync,
  createSuccessResponse,
  ValidationError,
  BusinessError,
  AuthorizationError,
} from "../middleware/errorHandler.middleware.js";
import logger from "../utils/logger.util.js";
import Joi from "joi";

/**
 * 為智能體填充MCP服務信息
 * @param {Array} agents - 智能體列表
 * @returns {Array} 填充了MCP服務信息的智能體列表
 */
const populateAgentMcpServices = async (agents) => {
  if (!agents || agents.length === 0) return agents;

  // 獲取所有智能體的ID
  const agentIds = agents.map((agent) => agent.id);

  // 批量查詢所有智能體的MCP服務
  const mcpServicesQuery = `
    SELECT 
      mas.agent_id,
      ms.id as service_id,
      ms.name as service_name,
      ms.description as service_description,
      ms.endpoint_url,
      ms.is_active as service_is_active,
      GROUP_CONCAT(
        JSON_OBJECT(
          'id', mt.id,
          'name', mt.name,
          'description', mt.description,
          'input_schema', mt.input_schema,
          'is_enabled', mt.is_enabled
        )
      ) as tools
    FROM mcp_agent_services mas
    JOIN mcp_services ms ON mas.mcp_service_id = ms.id
    LEFT JOIN mcp_tools mt ON ms.id = mt.mcp_service_id AND mt.is_enabled = 1
    WHERE mas.agent_id IN (${agentIds.map(() => "?").join(",")}) 
      AND mas.is_active = 1 
      AND ms.is_deleted = 0
    GROUP BY mas.agent_id, ms.id
    ORDER BY mas.agent_id, ms.name
  `;

  const mcpResult = await query(mcpServicesQuery, agentIds);
  const mcpServices = mcpResult.rows || [];

  // 按智能體ID分組MCP服務
  const mcpServicesByAgent = {};
  mcpServices.forEach((service) => {
    if (!mcpServicesByAgent[service.agent_id]) {
      mcpServicesByAgent[service.agent_id] = [];
    }

    // 解析工具信息
    let tools = [];
    if (service.tools) {
      try {
        // 處理GROUP_CONCAT的結果
        const toolsStr = service.tools.replace(/^\[|\]$/g, ""); // 移除首尾的[]
        if (toolsStr) {
          tools = toolsStr
            .split("},{")
            .map((toolStr, index, arr) => {
              try {
                // 重新添加大括號
                if (index === 0 && arr.length > 1) toolStr += "}";
                else if (index === arr.length - 1 && arr.length > 1)
                  toolStr = "{" + toolStr;
                else if (arr.length > 1) toolStr = "{" + toolStr + "}";

                return JSON.parse(toolStr);
              } catch (parseError) {
                logger.warn(`解析工具字符串失敗 (Agent ${service.agent_id}):`, {
                  toolStr: toolStr.substring(0, 100) + "...",
                  error: parseError.message,
                });
                return null;
              }
            })
            .filter((tool) => tool !== null); // 過濾掉解析失敗的工具
        }
      } catch (error) {
        logger.warn(`解析智能體 ${service.agent_id} 的工具信息失敗:`, error);
        tools = [];
      }
    }

    mcpServicesByAgent[service.agent_id].push({
      id: service.service_id,
      name: service.service_name,
      description: service.service_description,
      endpoint_url: service.endpoint_url,
      is_active: Boolean(service.service_is_active),
      tools: tools,
    });
  });

  // 為每個智能體填充MCP服務信息
  return agents.map((agent) => {
    const agentMcpServices = mcpServicesByAgent[agent.id] || [];

    // 解析現有的tools字段
    let tools = {};
    if (agent.tools) {
      try {
        tools =
          typeof agent.tools === "string"
            ? JSON.parse(agent.tools)
            : agent.tools;
      } catch (error) {
        logger.warn(`解析智能體 ${agent.id} 的tools字段失敗:`, error);
        tools = {};
      }
    }

    // 添加MCP服務到tools字段
    tools.mcp_services = agentMcpServices;

    return {
      ...agent,
      tools: tools,
    };
  });
};

/**
 * 處理智能體MCP服務的更新
 * @param {number} agentId - 智能體ID
 * @param {Object} tools - 工具配置對象
 * @param {number} userId - 操作用戶ID
 */
const handleAgentMcpServicesUpdate = async (agentId, tools, userId) => {
  if (!tools || !tools.mcp_services) {
    // 如果沒有MCP服務配置，清空所有關聯
    await query("DELETE FROM mcp_agent_services WHERE agent_id = ?", [agentId]);
    return;
  }

  const mcpServices = tools.mcp_services;
  const serviceIds = mcpServices
    .map((service) => service.id)
    .filter((id) => id);

  if (serviceIds.length === 0) {
    // 如果服務ID列表為空，清空所有關聯
    await query("DELETE FROM mcp_agent_services WHERE agent_id = ?", [agentId]);
    return;
  }

  // 驗證服務是否存在
  const { rows: servicesCheck } = await query(
    `SELECT id FROM mcp_services WHERE id IN (${serviceIds.map(() => "?").join(",")}) AND is_deleted = 0`,
    serviceIds
  );

  if (servicesCheck.length !== serviceIds.length) {
    throw new ValidationError("部分MCP服務不存在或已被刪除");
  }

  // 獲取現有關聯
  const { rows: existingServices } = await query(
    "SELECT mcp_service_id FROM mcp_agent_services WHERE agent_id = ?",
    [agentId]
  );

  const existingServiceIds = existingServices.map(
    (item) => item.mcp_service_id
  );

  // 計算需要添加和移除的服務
  const toAdd = serviceIds.filter((id) => !existingServiceIds.includes(id));
  const toRemove = existingServiceIds.filter((id) => !serviceIds.includes(id));

  // 添加新關聯
  for (const serviceId of toAdd) {
    await query(
      "INSERT INTO mcp_agent_services (agent_id, mcp_service_id, is_active) VALUES (?, ?, 1)",
      [agentId, serviceId]
    );
  }

  // 移除舊關聯
  if (toRemove.length > 0) {
    await query(
      `DELETE FROM mcp_agent_services WHERE agent_id = ? AND mcp_service_id IN (${toRemove.map(() => "?").join(",")})`,
      [agentId, ...toRemove]
    );
  }

  logger.info(`智能體 ${agentId} MCP服務更新完成`, {
    user_id: userId,
    added: toAdd.length,
    removed: toRemove.length,
    total: serviceIds.length,
  });
};

/**
 * 清理tools字段中的MCP服務信息（保存前）
 * @param {Object} tools - 工具配置對象
 * @returns {Object} 清理後的工具配置
 */
const cleanToolsForStorage = (tools) => {
  if (!tools) return tools;

  const cleanedTools = { ...tools };
  // 移除mcp_services，因為這些信息存儲在關聯表中
  delete cleanedTools.mcp_services;

  return cleanedTools;
};

// 輸入驗證模式
const schemas = {
  createAgent: Joi.object({
    name: Joi.string().min(2).max(100).required().messages({
      "string.min": "智能體名稱至少需要2個字符",
      "string.max": "智能體名稱不能超過100個字符",
      "any.required": "智能體名稱是必填項",
    }),
    display_name: Joi.string().min(2).max(200).required().messages({
      "string.min": "顯示名稱至少需要2個字符",
      "string.max": "顯示名稱不能超過200個字符",
      "any.required": "顯示名稱是必填項",
    }),
    description: Joi.string().max(1000).required().messages({
      "string.max": "描述不能超過1000個字符",
      "any.required": "描述是必填項",
    }),
    avatar: Joi.string().optional(),
    system_prompt: Joi.string().min(10).required().messages({
      "string.min": "系統提示詞至少需要10個字符",
      "any.required": "系統提示詞是必填項",
    }),
    model_id: Joi.number().integer().positive().required().messages({
      "number.base": "模型ID必須是數字",
      "number.integer": "模型ID必須是整數",
      "number.positive": "模型ID必須是正數",
      "any.required": "模型ID是必填項",
    }),
    category: Joi.string()
      .valid(
        "general",
        "assistant",
        "coding",
        "writing",
        "analysis",
        "customer_service"
      )
      .default("general")
      .messages({
        "any.only": "分類必須是有效值",
      }),
    tags: Joi.array().items(Joi.string()).optional(),
    capabilities: Joi.object().optional(),
    tools: Joi.object().optional(),
    agent_type: Joi.string()
      .valid("custom", "qwen")
      .default("custom")
      .messages({
        "any.only": "Agent 類型必須是 custom 或 qwen",
      }),
    qwen_config: Joi.object().optional().allow(null),
    tool_selection_mode: Joi.string()
      .valid("manual", "auto")
      .default("manual")
      .messages({
        "any.only": "工具選擇模式必須是 manual 或 auto",
      }),
    is_active: Joi.any()
      .custom((value, helpers) => {
        if (value === true || value === false || value === 1 || value === 0) {
          return Boolean(value);
        }
        return helpers.error("any.invalid");
      })
      .default(true),
    is_public: Joi.any()
      .custom((value, helpers) => {
        if (value === true || value === false || value === 1 || value === 0) {
          return Boolean(value);
        }
        return helpers.error("any.invalid");
      })
      .default(true),
  }),

  updateAgent: Joi.object({
    id: Joi.any().strip(),
    name: Joi.string().min(2).max(100).optional(),
    display_name: Joi.string().min(2).max(200).optional(),
    description: Joi.string().max(1000).optional(),
    avatar: Joi.string().optional(),
    system_prompt: Joi.string().min(10).optional(),
    model_id: Joi.number().integer().positive().optional(),
    category: Joi.string()
      .valid(
        "general",
        "assistant",
        "coding",
        "writing",
        "analysis",
        "customer_service"
      )
      .optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    capabilities: Joi.object().optional(),
    tools: Joi.object().optional(),
    agent_type: Joi.string().valid("custom", "qwen").optional().messages({
      "any.only": "Agent 類型必須是 custom 或 qwen",
    }),
    qwen_config: Joi.object().optional().allow(null),
    tool_selection_mode: Joi.string()
      .valid("manual", "auto")
      .optional()
      .messages({
        "any.only": "工具選擇模式必須是 manual 或 auto",
      }),
    is_active: Joi.any()
      .custom((value, helpers) => {
        if (value === true || value === false || value === 1 || value === 0) {
          return Boolean(value);
        }
        return helpers.error("any.invalid");
      })
      .optional(),
    is_public: Joi.any()
      .custom((value, helpers) => {
        if (value === true || value === false || value === 1 || value === 0) {
          return Boolean(value);
        }
        return helpers.error("any.invalid");
      })
      .optional(),
    sort_order: Joi.any().strip(), // 移除 sort_order 欄位，避免驗證錯誤
    usage_count: Joi.any().strip(),
    rating: Joi.any().strip(),
    rating_count: Joi.any().strip(),
    created_at: Joi.any().strip(),
    updated_at: Joi.any().strip(),
    created_by: Joi.any().strip(),
    model_name: Joi.any().strip(),
    model_display_name: Joi.any().strip(),
    created_by_username: Joi.any().strip(),
  }),
};

/**
 * 檢查管理員權限
 */
const checkAdminPermission = (user, requiredLevel = "admin") => {
  const roleHierarchy = {
    user: 1,
    admin: 2,
    super_admin: 3,
  };

  const userLevel = roleHierarchy[user.role] || 0;
  const requiredLevelNum = roleHierarchy[requiredLevel] || 0;

  if (userLevel < requiredLevelNum) {
    throw new AuthorizationError("權限不足，需要管理員權限");
  }
};

/**
 * 獲取智能體列表（管理員）
 */
export const handleGetAgents = catchAsync(async (req, res) => {
  checkAdminPermission(req.user, "admin");

  const {
    page = 1,
    limit = 20,
    category,
    is_active,
    search,
    sortBy = "sort_order",
    sortOrder = "ASC",
  } = req.query;

  // 構建查詢條件
  let whereConditions = [];
  let queryParams = [];

  // 默認過濾掉已刪除的智能體（除非明確指定要查看已停用的）
  if (is_active !== undefined) {
    whereConditions.push("a.is_active = ?");
    queryParams.push(is_active === "true" ? 1 : 0);
  } else {
    // 如果沒有指定 is_active 參數，默認只顯示啟用的智能體
    whereConditions.push("a.is_active = 1");
  }

  if (category) {
    whereConditions.push("a.category = ?");
    queryParams.push(category);
  }

  if (search) {
    whereConditions.push(
      "(a.name LIKE ? OR a.display_name LIKE ? OR a.description LIKE ?)"
    );
    queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const whereClause =
    whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

  // 獲取總數
  const countQuery = `SELECT COUNT(*) as total FROM agents a ${whereClause}`;
  const countResult = await query(countQuery, queryParams);
  const total =
    countResult.rows && countResult.rows.length > 0
      ? countResult.rows[0].total
      : 0;

  // 計算分頁
  const offset = (page - 1) * limit;
  const totalPages = Math.ceil(total / limit);

  // 獲取智能體列表
  const agentsQuery = `
    SELECT 
      a.id, a.name, a.display_name, a.description, a.avatar,
      a.system_prompt, a.model_id, a.category, a.agent_type,
      a.tags, a.capabilities, a.tools, a.qwen_config, 
      a.tool_selection_mode, a.is_active, a.is_public,
      a.usage_count, a.rating, a.rating_count, a.sort_order,
      a.created_at, a.updated_at, a.created_by,
      m.name as model_name, m.display_name as model_display_name,
      u.username as created_by_username
    FROM agents a
    LEFT JOIN ai_models m ON a.model_id = m.id
    LEFT JOIN users u ON a.created_by = u.id
    ${whereClause}
    ORDER BY a.${sortBy} ${sortOrder}
    LIMIT ${limit} OFFSET ${offset}
  `;

  const agentsResult = await query(agentsQuery, [
    ...queryParams,
    parseInt(limit),
    offset,
  ]);

  // 處理響應數據
  const agents = agentsResult.rows || [];

  const processedAgents = agents.map((agent) => ({
    ...agent,
    tags: agent.tags ? agent.tags : [],
    capabilities: agent.capabilities ? agent.capabilities : {},
    tools: agent.tools ? agent.tools : {},
    qwen_config: agent.qwen_config ? agent.qwen_config : null,
    is_active: Boolean(agent.is_active),
    is_public: Boolean(agent.is_public),
  }));

  // 填充MCP服務信息
  const agentsWithMcpServices = await populateAgentMcpServices(processedAgents);

  const responseData = {
    data: agentsWithMcpServices,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: totalPages,
    },
  };

  res.json(createSuccessResponse(responseData, "獲取智能體列表成功"));
});

/**
 * 創建智能體
 */
export const handleCreateAgent = catchAsync(async (req, res) => {
  checkAdminPermission(req.user, "admin");

  // 驗證輸入
  const { error, value } = schemas.createAgent.validate(req.body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const {
    name,
    display_name,
    description,
    avatar,
    system_prompt,
    model_id,
    category,
    agent_type,
    tags,
    capabilities,
    tools,
    qwen_config,
    tool_selection_mode,
    is_active,
    is_public,
  } = value;

  // 檢查智能體名稱是否已存在
  const { rows: existingAgent } = await query(
    "SELECT id FROM agents WHERE name = ?",
    [name]
  );
  if (existingAgent.length > 0) {
    throw new BusinessError("智能體名稱已存在", 409);
  }

  // 檢查模型是否存在
  const { rows: modelExists } = await query(
    "SELECT id FROM ai_models WHERE id = ? AND is_active = 1",
    [model_id]
  );
  if (modelExists.length === 0) {
    throw new BusinessError("指定的模型不存在或已停用", 400);
  }

  try {
    // 清理tools字段，移除MCP服務信息（這些將存儲在關聯表中）
    const cleanedTools = cleanToolsForStorage(tools);

    // 創建智能體
    const insertQuery = `
      INSERT INTO agents (
        name, display_name, description, avatar, system_prompt, 
        model_id, category, agent_type, tags, capabilities, tools, 
        qwen_config, tool_selection_mode, is_active, is_public, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const agentData = [
      name,
      display_name,
      description,
      avatar || null,
      system_prompt,
      model_id,
      category,
      agent_type || "custom",
      tags ? JSON.stringify(tags) : null,
      capabilities ? JSON.stringify(capabilities) : null,
      cleanedTools ? JSON.stringify(cleanedTools) : null,
      qwen_config ? JSON.stringify(qwen_config) : null,
      tool_selection_mode || "manual",
      is_active ? 1 : 0,
      is_public ? 1 : 0,
      req.user.id,
    ];

    const { rows: result } = await query(insertQuery, agentData);
    const agentId = result.insertId;

    // 處理MCP服務關聯
    if (tools) {
      await handleAgentMcpServicesUpdate(agentId, tools, req.user.id);
    }

    // 獲取創建的智能體詳情
    const newAgentQuery = `
      SELECT 
        a.*, m.name as model_name, m.display_name as model_display_name,
        u.username as created_by_username
      FROM agents a
      LEFT JOIN ai_models m ON a.model_id = m.id
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.id = ?
    `;

    const { rows } = await query(newAgentQuery, [agentId]);
    let newAgent = rows[0];

    // 處理JSON字段並填充MCP服務信息
    newAgent = {
      ...newAgent,
      tags: newAgent.tags ? JSON.parse(newAgent.tags) : [],
      capabilities: newAgent.capabilities
        ? JSON.parse(newAgent.capabilities)
        : {},
      tools: newAgent.tools ? JSON.parse(newAgent.tools) : {},
      qwen_config: newAgent.qwen_config
        ? JSON.parse(newAgent.qwen_config)
        : null,
      is_active: Boolean(newAgent.is_active),
      is_public: Boolean(newAgent.is_public),
    };

    // 填充MCP服務信息
    const [agentWithMcpServices] = await populateAgentMcpServices([newAgent]);
    newAgent = agentWithMcpServices;

    // 記錄審計日誌
    await query(
      "INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)",
      [
        req.user.id,
        "CREATE_AGENT",
        JSON.stringify({ agent_id: agentId, name, category }),
        req.ip,
        req.get("User-Agent"),
      ]
    );

    // 安全的 JSON 解析函數
    const safeJsonParse = (str, fallback = null) => {
      if (!str) return fallback;
      if (typeof str === "object") return str; // 已經是對象
      try {
        return JSON.parse(str);
      } catch (error) {
        logger.warn(`JSON 解析失敗: ${str}`, error);
        return fallback;
      }
    };

    // 處理響應數據
    const responseData = {
      ...newAgent,
      tags: safeJsonParse(newAgent.tags, []),
      capabilities: safeJsonParse(newAgent.capabilities, {}),
      tools: safeJsonParse(newAgent.tools, {}),
      qwen_config: safeJsonParse(newAgent.qwen_config, null),
      is_active: Boolean(newAgent.is_active),
      is_public: Boolean(newAgent.is_public),
    };

    res.status(201).json(createSuccessResponse(responseData, "智能體創建成功"));
  } catch (error) {
    logger.error("創建智能體失敗:", error);
    throw new BusinessError("創建智能體失敗");
  }
});

/**
 * 更新智能體
 */
export const handleUpdateAgent = catchAsync(async (req, res) => {
  checkAdminPermission(req.user, "admin");

  const { agentId } = req.params;

  if (!agentId || isNaN(agentId)) {
    throw new ValidationError("智能體ID格式錯誤");
  }

  // 驗證輸入
  const { error, value } = schemas.updateAgent.validate(req.body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  // 檢查智能體是否存在
  const { rows: existingAgent } = await query(
    "SELECT * FROM agents WHERE id = ?",
    [agentId]
  );
  if (existingAgent.length === 0) {
    throw new BusinessError("智能體不存在", 404);
  }

  // 檢查名稱唯一性
  if (value.name && value.name !== existingAgent[0].name) {
    const { rows: nameExists } = await query(
      "SELECT id FROM agents WHERE name = ? AND id != ?",
      [value.name, agentId]
    );
    if (nameExists.length > 0) {
      throw new BusinessError("智能體名稱已存在", 409);
    }
  }

  // 檢查模型是否存在
  if (value.model_id) {
    const { rows: modelExists } = await query(
      "SELECT id FROM ai_models WHERE id = ? AND is_active = 1",
      [value.model_id]
    );
    if (modelExists.length === 0) {
      throw new BusinessError("指定的模型不存在或已停用", 400);
    }
  }

  try {
    // 處理MCP服務更新
    if (value.tools) {
      await handleAgentMcpServicesUpdate(agentId, value.tools, req.user.id);
    }

    // 準備更新數據
    const updateFields = [];
    const updateValues = [];

    Object.entries(value).forEach(([key, val]) => {
      if (val !== undefined) {
        updateFields.push(`${key} = ?`);
        if (key === "tags" || key === "capabilities" || key === "qwen_config") {
          updateValues.push(val ? JSON.stringify(val) : null);
        } else if (key === "tools") {
          // 清理tools字段，移除MCP服務信息
          const cleanedTools = cleanToolsForStorage(val);
          updateValues.push(cleanedTools ? JSON.stringify(cleanedTools) : null);
        } else if (key === "is_active" || key === "is_public") {
          updateValues.push(val ? 1 : 0);
        } else {
          updateValues.push(val);
        }
      }
    });

    if (updateFields.length === 0) {
      throw new ValidationError("沒有提供更新數據");
    }

    // 添加更新時間
    updateFields.push("updated_at = NOW()");

    // 執行更新
    const updateQuery = `UPDATE agents SET ${updateFields.join(", ")} WHERE id = ?`;
    updateValues.push(agentId);

    await query(updateQuery, updateValues);

    // 獲取更新後的智能體
    const updatedAgentQuery = `
      SELECT 
        a.*, m.name as model_name, m.display_name as model_display_name,
        u.username as created_by_username
      FROM agents a
      LEFT JOIN ai_models m ON a.model_id = m.id
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.id = ?
    `;

    const { rows } = await query(updatedAgentQuery, [agentId]);
    let updatedAgent = rows[0];

    if (!updatedAgent) {
      throw new NotFoundError("更新後無法找到智能體");
    }

    // 記錄審計日誌
    await query(
      "INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)",
      [
        req.user.id,
        "UPDATE_AGENT",
        JSON.stringify({ agent_id: agentId, changes: Object.keys(value) }),
        req.ip,
        req.get("User-Agent"),
      ]
    );

    // 安全的 JSON 解析函數
    const safeJsonParse = (str, fallback = null) => {
      if (!str) return fallback;
      if (typeof str === "object") return str; // 已經是對象
      try {
        return JSON.parse(str);
      } catch (error) {
        logger.warn(`JSON 解析失敗: ${str}`, error);
        return fallback;
      }
    };

    // 處理響應數據並填充MCP服務信息
    updatedAgent = {
      ...updatedAgent,
      tags: safeJsonParse(updatedAgent.tags, []),
      capabilities: safeJsonParse(updatedAgent.capabilities, {}),
      tools: safeJsonParse(updatedAgent.tools, {}),
      qwen_config: safeJsonParse(updatedAgent.qwen_config, null),
      is_active: Boolean(updatedAgent.is_active),
      is_public: Boolean(updatedAgent.is_public),
    };

    // 填充MCP服務信息
    const [agentWithMcpServices] = await populateAgentMcpServices([
      updatedAgent,
    ]);

    res.json(createSuccessResponse(agentWithMcpServices, "智能體更新成功"));
  } catch (error) {
    logger.error("更新智能體失敗:", error);
    throw new BusinessError("更新智能體失敗");
  }
});

/**
 * 刪除智能體
 */
export const handleDeleteAgent = catchAsync(async (req, res) => {
  checkAdminPermission(req.user, "admin");

  const { agentId } = req.params;

  if (!agentId || isNaN(agentId)) {
    throw new ValidationError("智能體ID格式錯誤");
  }

  // 檢查智能體是否存在
  const { rows: existingAgent } = await query(
    "SELECT * FROM agents WHERE id = ?",
    [agentId]
  );
  if (existingAgent.length === 0) {
    throw new BusinessError("智能體不存在", 404);
  }

  try {
    // 軟刪除智能體
    await query(
      "UPDATE agents SET is_active = 0, updated_at = NOW() WHERE id = ?",
      [agentId]
    );

    // 記錄審計日誌
    await query(
      "INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)",
      [
        req.user.id,
        "DELETE_AGENT",
        JSON.stringify({ agent_id: agentId, name: existingAgent[0].name }),
        req.ip,
        req.get("User-Agent"),
      ]
    );

    res.json(createSuccessResponse(null, "智能體刪除成功"));
  } catch (error) {
    logger.error("刪除智能體失敗:", error);
    throw new BusinessError("刪除智能體失敗");
  }
});

/**
 * 複製智能體
 */
export const handleDuplicateAgent = catchAsync(async (req, res) => {
  checkAdminPermission(req.user, "admin");

  const { agentId } = req.params;
  const { name: customName, display_name: customDisplayName } = req.body;

  if (!agentId || isNaN(agentId)) {
    throw new ValidationError("智能體ID格式錯誤");
  }

  // 檢查智能體是否存在
  const { rows } = await query("SELECT * FROM agents WHERE id = ?", [agentId]);
  const originalAgent = rows[0];
  if (!originalAgent) {
    throw new BusinessError("智能體不存在", 404);
  }

  try {
    // 確定新的名稱
    let copyName;
    let copyDisplayName;

    if (customName) {
      // 使用自定義名稱
      copyName = customName.trim();
      copyDisplayName = customDisplayName || customName.trim();

      // 檢查名稱是否已存在
      const { rows: nameExists } = await query(
        "SELECT id FROM agents WHERE name = ?",
        [copyName]
      );
      if (nameExists.length > 0) {
        throw new BusinessError("智能體名稱已存在", 409);
      }
    } else {
      // 自動生成名稱
      copyName = `${originalAgent.name}_copy`;
      copyDisplayName = `${originalAgent.display_name} (複製)`;
      let counter = 1;

      while (true) {
        const { rows: nameExists } = await query(
          "SELECT id FROM agents WHERE name = ?",
          [copyName]
        );
        if (nameExists.length === 0) break;

        counter++;
        copyName = `${originalAgent.name}_copy_${counter}`;
        copyDisplayName = `${originalAgent.display_name} (複製${counter})`;
      }
    }

    // 複製智能體
    const insertQuery = `
      INSERT INTO agents (
        name, display_name, description, avatar, system_prompt, 
        model_id, category, agent_type, tags, capabilities, tools, 
        qwen_config, tool_selection_mode, is_active, is_public, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const agentData = [
      copyName,
      copyDisplayName,
      originalAgent.description,
      originalAgent.avatar,
      originalAgent.system_prompt,
      originalAgent.model_id,
      originalAgent.category,
      originalAgent.agent_type || "custom",
      originalAgent.tags,
      originalAgent.capabilities,
      originalAgent.tools,
      originalAgent.qwen_config,
      originalAgent.tool_selection_mode || "manual",
      1, // 默認啟用
      originalAgent.is_public,
      req.user.id,
    ];

    const { rows: result } = await query(insertQuery, agentData);
    const newAgentId = result.insertId;

    // 獲取複製的智能體詳情
    const newAgentQuery = `
      SELECT 
        a.*, m.name as model_name, m.display_name as model_display_name,
        u.username as created_by_username
      FROM agents a
      LEFT JOIN ai_models m ON a.model_id = m.id
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.id = ?
    `;

    const { rows: newAgentRows } = await query(newAgentQuery, [newAgentId]);
    const newAgent = newAgentRows[0];

    // 記錄審計日誌
    await query(
      "INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)",
      [
        req.user.id,
        "DUPLICATE_AGENT",
        JSON.stringify({
          original_agent_id: agentId,
          new_agent_id: newAgentId,
          new_name: copyName,
        }),
        req.ip,
        req.get("User-Agent"),
      ]
    );

    // 安全的 JSON 解析函數
    const safeJsonParse = (str, fallback = null) => {
      if (!str) return fallback;
      if (typeof str === "object") return str; // 已經是對象
      try {
        return JSON.parse(str);
      } catch (error) {
        logger.warn(`JSON 解析失敗: ${str}`, error);
        return fallback;
      }
    };

    // 處理響應數據
    const responseData = {
      ...newAgent,
      tags: safeJsonParse(newAgent.tags, []),
      capabilities: safeJsonParse(newAgent.capabilities, {}),
      tools: safeJsonParse(newAgent.tools, {}),
      qwen_config: safeJsonParse(newAgent.qwen_config, null),
      is_active: Boolean(newAgent.is_active),
      is_public: Boolean(newAgent.is_public),
    };

    res.status(201).json(createSuccessResponse(responseData, "智能體複製成功"));
  } catch (error) {
    logger.error("複製智能體失敗:", error);
    throw new BusinessError("複製智能體失敗");
  }
});

/**
 * 更新智能體排序
 * @route PUT /api/agents/:id/sort-order
 * @access Admin
 */
export const handleUpdateAgentSortOrder = catchAsync(async (req, res) => {
  checkAdminPermission(req.user, "admin");

  const { id } = req.params;
  const { sort_order } = req.body;

  // 驗證排序值
  if (typeof sort_order !== "number" || sort_order < 0) {
    throw new ValidationError("排序值必須是非負整數");
  }

  // 檢查智能體是否存在
  const checkQuery = "SELECT id FROM agents WHERE id = ?";
  const checkResult = await query(checkQuery, [id]);

  if (!checkResult.rows || checkResult.rows.length === 0) {
    throw new BusinessError("智能體不存在", 404);
  }

  // 更新排序
  const updateQuery = `
    UPDATE agents 
    SET sort_order = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `;

  await query(updateQuery, [sort_order, id]);

  res.json(createSuccessResponse({ id, sort_order }, "更新排序成功"));
});

/**
 * 批量更新智能體排序
 * @route PUT /api/agents/batch-sort
 * @access Admin
 */
export const handleBatchUpdateAgentSortOrder = catchAsync(async (req, res) => {
  checkAdminPermission(req.user, "admin");

  const { updates } = req.body;

  if (!Array.isArray(updates) || updates.length === 0) {
    throw new ValidationError("更新數據格式錯誤");
  }

  // 驗證每個更新項目
  for (const update of updates) {
    if (
      !update.id ||
      typeof update.sort_order !== "number" ||
      update.sort_order < 0
    ) {
      throw new ValidationError(
        "更新數據格式錯誤：每個項目需要包含有效的 id 和 sort_order"
      );
    }
  }

  // 批量更新
  const updatePromises = updates.map(({ id, sort_order }) => {
    const updateQuery = `
      UPDATE agents 
      SET sort_order = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    return query(updateQuery, [sort_order, id]);
  });

  await Promise.all(updatePromises);

  res.json(
    createSuccessResponse({ updated_count: updates.length }, "批量更新排序成功")
  );
});

export default {
  handleGetAgents,
  handleCreateAgent,
  handleUpdateAgent,
  handleDeleteAgent,
  handleDuplicateAgent,
  handleUpdateAgentSortOrder,
  handleBatchUpdateAgentSortOrder,
};

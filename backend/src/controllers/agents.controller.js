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
    sortBy = "created_at",
    sortOrder = "DESC",
  } = req.query;

  // 構建查詢條件
  let whereConditions = [];
  let queryParams = [];

  if (category) {
    whereConditions.push("a.category = ?");
    queryParams.push(category);
  }

  if (is_active !== undefined) {
    whereConditions.push("a.is_active = ?");
    queryParams.push(is_active === "true" ? 1 : 0);
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
      a.system_prompt, a.model_id, a.category, a.tags, 
      a.capabilities, a.tools, a.is_active, a.is_public,
      a.usage_count, a.rating, a.rating_count, 
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
    is_active: Boolean(agent.is_active),
    is_public: Boolean(agent.is_public),
  }));

  const responseData = {
    data: processedAgents,
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
    tags,
    capabilities,
    tools,
    is_active,
    is_public,
  } = value;

  // 檢查智能體名稱是否已存在
  const existingAgent = await query("SELECT id FROM agents WHERE name = ?", [
    name,
  ]);
  if (existingAgent.length > 0) {
    throw new BusinessError("智能體名稱已存在", 409);
  }

  // 檢查模型是否存在
  const modelExists = await query(
    "SELECT id FROM ai_models WHERE id = ? AND is_active = 1",
    [model_id]
  );
  if (modelExists.length === 0) {
    throw new BusinessError("指定的模型不存在或已停用", 400);
  }

  try {
    // 創建智能體
    const insertQuery = `
      INSERT INTO agents (
        name, display_name, description, avatar, system_prompt, 
        model_id, category, tags, capabilities, tools, 
        is_active, is_public, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const agentData = [
      name,
      display_name,
      description,
      avatar || null,
      system_prompt,
      model_id,
      category,
      tags ? JSON.stringify(tags) : null,
      capabilities ? JSON.stringify(capabilities) : null,
      tools ? JSON.stringify(tools) : null,
      is_active ? 1 : 0,
      is_public ? 1 : 0,
      req.user.id,
    ];

    const result = await query(insertQuery, agentData);
    const agentId = result.insertId;

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

    const [newAgent] = await query(newAgentQuery, [agentId]);

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

    // 處理響應數據
    const responseData = {
      ...newAgent,
      tags: newAgent.tags ? JSON.parse(newAgent.tags) : [],
      capabilities: newAgent.capabilities
        ? JSON.parse(newAgent.capabilities)
        : {},
      tools: newAgent.tools ? JSON.parse(newAgent.tools) : {},
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
  const existingAgent = await query("SELECT * FROM agents WHERE id = ?", [
    agentId,
  ]);
  if (existingAgent.length === 0) {
    throw new BusinessError("智能體不存在", 404);
  }

  // 檢查名稱唯一性
  if (value.name && value.name !== existingAgent[0].name) {
    const nameExists = await query(
      "SELECT id FROM agents WHERE name = ? AND id != ?",
      [value.name, agentId]
    );
    if (nameExists.length > 0) {
      throw new BusinessError("智能體名稱已存在", 409);
    }
  }

  // 檢查模型是否存在
  if (value.model_id) {
    const modelExists = await query(
      "SELECT id FROM ai_models WHERE id = ? AND is_active = 1",
      [value.model_id]
    );
    if (modelExists.length === 0) {
      throw new BusinessError("指定的模型不存在或已停用", 400);
    }
  }

  try {
    // 準備更新數據
    const updateFields = [];
    const updateValues = [];

    Object.entries(value).forEach(([key, val]) => {
      if (val !== undefined) {
        updateFields.push(`${key} = ?`);
        if (key === "tags" || key === "capabilities" || key === "tools") {
          updateValues.push(val ? JSON.stringify(val) : null);
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

    const [updatedAgent] = await query(updatedAgentQuery, [agentId]);

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

    // 處理響應數據
    const responseData = {
      ...updatedAgent,
      tags: updatedAgent.tags ? JSON.parse(updatedAgent.tags) : [],
      capabilities: updatedAgent.capabilities
        ? JSON.parse(updatedAgent.capabilities)
        : {},
      tools: updatedAgent.tools ? JSON.parse(updatedAgent.tools) : {},
      is_active: Boolean(updatedAgent.is_active),
      is_public: Boolean(updatedAgent.is_public),
    };

    res.json(createSuccessResponse(responseData, "智能體更新成功"));
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
  const existingAgent = await query("SELECT * FROM agents WHERE id = ?", [
    agentId,
  ]);
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

  if (!agentId || isNaN(agentId)) {
    throw new ValidationError("智能體ID格式錯誤");
  }

  // 檢查智能體是否存在
  const [originalAgent] = await query("SELECT * FROM agents WHERE id = ?", [
    agentId,
  ]);
  if (!originalAgent) {
    throw new BusinessError("智能體不存在", 404);
  }

  try {
    // 生成新的名稱
    let copyName = `${originalAgent.name}_copy`;
    let counter = 1;

    while (true) {
      const nameExists = await query("SELECT id FROM agents WHERE name = ?", [
        copyName,
      ]);
      if (nameExists.length === 0) break;

      counter++;
      copyName = `${originalAgent.name}_copy_${counter}`;
    }

    // 複製智能體
    const insertQuery = `
      INSERT INTO agents (
        name, display_name, description, avatar, system_prompt, 
        model_id, category, tags, capabilities, tools, 
        is_active, is_public, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const agentData = [
      copyName,
      `${originalAgent.display_name} (複製)`,
      originalAgent.description,
      originalAgent.avatar,
      originalAgent.system_prompt,
      originalAgent.model_id,
      originalAgent.category,
      originalAgent.tags,
      originalAgent.capabilities,
      originalAgent.tools,
      1, // 默認啟用
      originalAgent.is_public,
      req.user.id,
    ];

    const result = await query(insertQuery, agentData);
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

    const [newAgent] = await query(newAgentQuery, [newAgentId]);

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

    // 處理響應數據
    const responseData = {
      ...newAgent,
      tags: newAgent.tags ? JSON.parse(newAgent.tags) : [],
      capabilities: newAgent.capabilities
        ? JSON.parse(newAgent.capabilities)
        : {},
      tools: newAgent.tools ? JSON.parse(newAgent.tools) : {},
      is_active: Boolean(newAgent.is_active),
      is_public: Boolean(newAgent.is_public),
    };

    res.status(201).json(createSuccessResponse(responseData, "智能體複製成功"));
  } catch (error) {
    logger.error("複製智能體失敗:", error);
    throw new BusinessError("複製智能體失敗");
  }
});

export default {
  handleGetAgents,
  handleCreateAgent,
  handleUpdateAgent,
  handleDeleteAgent,
  handleDuplicateAgent,
};

/**
 * MCP 智能體服務權限管理控制器
 * 處理智能體與 MCP 服務權限相關的 HTTP 請求
 */

import { query, transaction } from "../config/database.config.js";
import {
  catchAsync,
  createSuccessResponse,
  ValidationError,
  BusinessError,
  NotFoundError,
} from "../middleware/errorHandler.middleware.js";
import logger from "../utils/logger.util.js";
import Joi from "joi";

// 驗證模式
const schemas = {
  assignServices: Joi.object({
    serviceIds: Joi.array()
      .items(Joi.number().integer().positive())
      .min(1)
      .required()
      .messages({
        "array.min": "至少需要選擇一個服務",
        "any.required": "服務ID列表是必填項",
      }),
  }),

  batchUpdate: Joi.object({
    serviceIds: Joi.array()
      .items(Joi.number().integer().positive())
      .required()
      .messages({
        "any.required": "服務ID列表是必填項",
      }),
  }),
};

/**
 * 獲取智能體的服務權限
 * @route GET /api/mcp/agents/:agentId/services
 * @access Private (Admin)
 */
export const handleGetAgentServices = catchAsync(async (req, res) => {
  const { agentId } = req.params;

  // 驗證智能體是否存在
  const { rows: agentExists } = await query(
    "SELECT id FROM agents WHERE id = ?",
    [agentId]
  );

  if (agentExists.length === 0) {
    throw new NotFoundError("智能體不存在");
  }

  // 獲取智能體的服務權限
  const sql = `
    SELECT 
      mas.id,
      mas.agent_id,
      mas.mcp_service_id,
      mas.is_active,
      mas.created_at,
      mas.updated_at,
      ms.name as service_name,
      ms.description as service_description,
      ms.endpoint_url,
      ms.owner,
      ms.is_active as service_is_active
    FROM mcp_agent_services mas
    LEFT JOIN mcp_services ms ON mas.mcp_service_id = ms.id
    WHERE mas.agent_id = ? AND ms.is_deleted = 0
    ORDER BY ms.name ASC
  `;

  const { rows: result } = await query(sql, [agentId]);

  logger.info("獲取智能體服務權限", {
    user_id: req.user.id,
    agent_id: agentId,
    service_count: result.length,
  });

  res.json(createSuccessResponse(result, "獲取智能體服務權限成功"));
});

/**
 * 為智能體分配服務權限
 * @route POST /api/mcp/agents/:agentId/services
 * @access Private (Admin)
 */
export const handleAssignAgentServices = catchAsync(async (req, res) => {
  const { agentId } = req.params;

  // 驗證輸入
  const { error, value } = schemas.assignServices.validate(req.body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const { serviceIds } = value;

  // 驗證智能體是否存在
  const { rows: agentExists } = await query(
    "SELECT id FROM agents WHERE id = ?",
    [agentId]
  );

  if (agentExists.length === 0) {
    throw new NotFoundError("智能體不存在");
  }

  // 驗證服務是否存在
  const { rows: servicesCheck } = await query(
    `SELECT id FROM mcp_services WHERE id IN (${serviceIds
      .map(() => "?")
      .join(",")}) AND is_deleted = 0`,
    serviceIds
  );

  if (servicesCheck.length !== serviceIds.length) {
    throw new ValidationError("部分服務不存在或已被刪除");
  }

  let assignedCount = 0;
  let existingCount = 0;

  try {
    await transaction(async (connection) => {
      for (const serviceId of serviceIds) {
        // 檢查權限是否已存在
        const { rows: existing } = await query(
          "SELECT id FROM mcp_agent_services WHERE agent_id = ? AND mcp_service_id = ?",
          [agentId, serviceId]
        );

        if (existing.length === 0) {
          // 創建新權限
          await query(
            "INSERT INTO mcp_agent_services (agent_id, mcp_service_id, is_active) VALUES (?, ?, 1)",
            [agentId, serviceId]
          );
          assignedCount++;
        } else {
          // 確保權限是啟用的
          await query(
            "UPDATE mcp_agent_services SET is_active = 1 WHERE agent_id = ? AND mcp_service_id = ?",
            [agentId, serviceId]
          );
          existingCount++;
        }
      }
    });

    // 記錄審計日誌
    await query(
      "INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)",
      [
        req.user.id,
        "ASSIGN_AGENT_SERVICES",
        JSON.stringify({
          agent_id: agentId,
          service_ids: serviceIds,
          assigned_count: assignedCount,
          existing_count: existingCount,
        }),
        req.ip,
        req.get("User-Agent"),
      ]
    );

    logger.info("智能體服務權限分配成功", {
      user_id: req.user.id,
      agent_id: agentId,
      assigned_count: assignedCount,
      existing_count: existingCount,
    });

    res.json(
      createSuccessResponse(
        {
          assignedCount,
          existingCount,
          totalCount: assignedCount + existingCount,
        },
        "智能體服務權限分配成功"
      )
    );
  } catch (error) {
    logger.error("分配智能體服務權限失敗:", error);
    throw new BusinessError("分配智能體服務權限失敗");
  }
});

/**
 * 移除智能體服務權限
 * @route DELETE /api/mcp/agents/:agentId/services/:serviceId
 * @access Private (Admin)
 */
export const handleRemoveAgentService = catchAsync(async (req, res) => {
  const { agentId, serviceId } = req.params;

  // 驗證智能體和服務是否存在
  const checks = await Promise.all([
    query("SELECT id FROM agents WHERE id = ?", [agentId]),
    query("SELECT id FROM mcp_services WHERE id = ? AND is_deleted = 0", [
      serviceId,
    ]),
  ]);

  if (checks[0].rows.length === 0) {
    throw new NotFoundError("智能體不存在");
  }

  if (checks[1].rows.length === 0) {
    throw new NotFoundError("服務不存在");
  }

  // 刪除權限
  const { rows: result } = await query(
    "DELETE FROM mcp_agent_services WHERE agent_id = ? AND mcp_service_id = ?",
    [agentId, serviceId]
  );

  if (result.affectedRows === 0) {
    throw new NotFoundError("權限記錄不存在");
  }

  // 記錄審計日誌
  await query(
    "INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)",
    [
      req.user.id,
      "REMOVE_AGENT_SERVICE",
      JSON.stringify({
        agent_id: agentId,
        service_id: serviceId,
      }),
      req.ip,
      req.get("User-Agent"),
    ]
  );

  logger.info("智能體服務權限移除成功", {
    user_id: req.user.id,
    agent_id: agentId,
    service_id: serviceId,
  });

  res.json(createSuccessResponse(null, "智能體服務權限移除成功"));
});

/**
 * 批量更新智能體服務權限
 * @route PUT /api/mcp/agents/:agentId/services/batch
 * @access Private (Admin)
 */
export const handleBatchUpdateAgentServices = catchAsync(async (req, res) => {
  const { agentId } = req.params;

  // 驗證輸入
  const { error, value } = schemas.batchUpdate.validate(req.body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  const { serviceIds } = value;

  // 驗證智能體是否存在
  const { rows: agentExists } = await query(
    "SELECT id FROM agents WHERE id = ?",
    [agentId]
  );

  if (agentExists.length === 0) {
    throw new NotFoundError("智能體不存在");
  }

  // 驗證服務是否存在（如果有提供服務ID）
  if (serviceIds.length > 0) {
    const { rows: servicesCheck } = await query(
      `SELECT id FROM mcp_services WHERE id IN (${serviceIds
        .map(() => "?")
        .join(",")}) AND is_deleted = 0`,
      serviceIds
    );

    if (servicesCheck.length !== serviceIds.length) {
      throw new ValidationError("部分服務不存在或已被刪除");
    }
  }

  let addedCount = 0;
  let removedCount = 0;

  try {
    await transaction(async (connection) => {
      // 獲取現有權限
      const { rows: existingServices } = await query(
        "SELECT mcp_service_id FROM mcp_agent_services WHERE agent_id = ?",
        [agentId]
      );

      const existingServiceIds = existingServices.map(
        (item) => item.mcp_service_id
      );

      // 計算需要添加和移除的服務
      const toAdd = serviceIds.filter((id) => !existingServiceIds.includes(id));
      const toRemove = existingServiceIds.filter(
        (id) => !serviceIds.includes(id)
      );

      // 添加新權限
      for (const serviceId of toAdd) {
        await query(
          "INSERT INTO mcp_agent_services (agent_id, mcp_service_id, is_active) VALUES (?, ?, 1)",
          [agentId, serviceId]
        );
        addedCount++;
      }

      // 移除舊權限
      if (toRemove.length > 0) {
        await query(
          `DELETE FROM mcp_agent_services WHERE agent_id = ? AND mcp_service_id IN (${toRemove
            .map(() => "?")
            .join(",")})`,
          [agentId, ...toRemove]
        );
        removedCount = toRemove.length;
      }
    });

    // 記錄審計日誌
    await query(
      "INSERT INTO audit_logs (user_id, action, details, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)",
      [
        req.user.id,
        "BATCH_UPDATE_AGENT_SERVICES",
        JSON.stringify({
          agent_id: agentId,
          service_ids: serviceIds,
          added_count: addedCount,
          removed_count: removedCount,
        }),
        req.ip,
        req.get("User-Agent"),
      ]
    );

    logger.info("智能體服務權限批量更新成功", {
      user_id: req.user.id,
      agent_id: agentId,
      added_count: addedCount,
      removed_count: removedCount,
    });

    res.json(
      createSuccessResponse(
        {
          addedCount,
          removedCount,
          totalCount: serviceIds.length,
        },
        "智能體服務權限批量更新成功"
      )
    );
  } catch (error) {
    logger.error("批量更新智能體服務權限失敗:", error);
    throw new BusinessError("批量更新智能體服務權限失敗");
  }
});

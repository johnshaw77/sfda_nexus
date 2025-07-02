/**
 * 調試路由 - 用於測試和調試 MCP 工具調用流程
 */

import { Router } from 'express';
import chatFlowManager from '../src/services/chatFlowManager.service.js';
import mcpToolParserService from '../src/services/mcpToolParser.service.js';
import mcpService from '../src/services/mcp.service.js';
import logger from '../src/utils/logger.util.js';

const router = Router();

/**
 * 獲取流程指標
 */
router.get('/flow-metrics', (req, res) => {
  try {
    const metrics = chatFlowManager.getFlowMetrics();
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('獲取流程指標失敗', { error: error.message });
    res.status(500).json({
      success: false,
      error: '獲取流程指標失敗'
    });
  }
});

/**
 * 獲取活躍流程
 */
router.get('/active-flows', (req, res) => {
  try {
    const activeFlows = chatFlowManager.getActiveFlows();
    res.json({
      success: true,
      data: activeFlows
    });
  } catch (error) {
    logger.error('獲取活躍流程失敗', { error: error.message });
    res.status(500).json({
      success: false,
      error: '獲取活躍流程失敗'
    });
  }
});

/**
 * 獲取特定流程狀態
 */
router.get('/flow/:flowId', (req, res) => {
  try {
    const { flowId } = req.params;
    const flowState = chatFlowManager.getFlowState(flowId);
    
    if (!flowState) {
      return res.status(404).json({
        success: false,
        error: '流程不存在'
      });
    }

    // 返回流程狀態（去除敏感信息）
    const safeFlowState = {
      flowId: flowState.flowId,
      conversationId: flowState.conversationId,
      userId: flowState.userId,
      selectedModel: flowState.selectedModel,
      currentStep: flowState.currentStep,
      steps: flowState.steps,
      errors: flowState.errors,
      toolCalls: flowState.toolCalls?.map(tool => ({
        name: tool.name,
        arguments: tool.arguments
      })),
      startTime: flowState.startTime
    };

    res.json({
      success: true,
      data: safeFlowState
    });
  } catch (error) {
    logger.error('獲取流程狀態失敗', { error: error.message });
    res.status(500).json({
      success: false,
      error: '獲取流程狀態失敗'
    });
  }
});

/**
 * 測試工具檢測
 */
router.post('/test-tool-detection', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: '需要提供測試文本'
      });
    }

    logger.info('開始工具檢測測試', { textLength: text.length });

    const detectedTools = await mcpToolParserService.detectToolCalls(text);

    res.json({
      success: true,
      data: {
        inputText: text,
        detectedTools,
        detectionCount: detectedTools.length
      }
    });

  } catch (error) {
    logger.error('工具檢測測試失敗', { error: error.message });
    res.status(500).json({
      success: false,
      error: '工具檢測測試失敗'
    });
  }
});

/**
 * 測試工具執行
 */
router.post('/test-tool-execution', async (req, res) => {
  try {
    const { toolName, arguments: toolArgs } = req.body;
    
    if (!toolName) {
      return res.status(400).json({
        success: false,
        error: '需要提供工具名稱'
      });
    }

    logger.info('開始工具執行測試', { toolName, arguments: toolArgs });

    const startTime = Date.now();
    const result = await mcpService.callTool(toolName, toolArgs || {});
    const executionTime = Date.now() - startTime;

    res.json({
      success: true,
      data: {
        toolName,
        arguments: toolArgs,
        result,
        executionTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('工具執行測試失敗', { 
      toolName: req.body.toolName,
      error: error.message 
    });
    res.status(500).json({
      success: false,
      error: `工具執行失敗: ${error.message}`
    });
  }
});

/**
 * 測試完整流程
 */
router.post('/test-full-flow', async (req, res) => {
  try {
    const { 
      message, 
      conversationId = 'debug-conversation',
      userId = 'debug-user',
      selectedModel = 'gemini-1.5-flash'
    } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: '需要提供測試消息'
      });
    }

    const events = [];
    
    // 開始流程測試
    const result = await chatFlowManager.startChatFlow({
      conversationId,
      message,
      userId,
      selectedModel,
      eventCallback: (event) => {
        events.push({
          ...event,
          timestamp: new Date().toISOString()
        });
        logger.debug(`流程事件: ${event.type}`, event.data);
      }
    });

    res.json({
      success: true,
      data: {
        flowResult: result,
        events,
        eventCount: events.length
      }
    });

  } catch (error) {
    logger.error('完整流程測試失敗', { error: error.message });
    res.status(500).json({
      success: false,
      error: `完整流程測試失敗: ${error.message}`
    });
  }
});

/**
 * 獲取 MCP 服務狀態
 */
router.get('/mcp-status', async (req, res) => {
  try {
    const status = await mcpService.getConnectionStatus();
    const availableTools = await mcpService.listAvailableTools();

    res.json({
      success: true,
      data: {
        connectionStatus: status,
        availableTools,
        toolCount: availableTools.length
      }
    });

  } catch (error) {
    logger.error('獲取 MCP 狀態失敗', { error: error.message });
    res.status(500).json({
      success: false,
      error: '獲取 MCP 狀態失敗'
    });
  }
});

/**
 * 清理調試數據
 */
router.post('/cleanup', (req, res) => {
  try {
    // 重置流程指標
    const metrics = chatFlowManager.getFlowMetrics();
    logger.info('調試數據清理', { 
      clearedActiveFlows: metrics.activeFlows,
      totalProcessedFlows: metrics.totalFlows
    });

    res.json({
      success: true,
      message: '調試數據已清理',
      data: {
        clearedFlows: metrics.activeFlows
      }
    });

  } catch (error) {
    logger.error('調試數據清理失敗', { error: error.message });
    res.status(500).json({
      success: false,
      error: '調試數據清理失敗'
    });
  }
});

export default router;
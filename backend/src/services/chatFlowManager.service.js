import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.util.js';
import aiService from './ai.service.js';
import mcpService from './mcp.service.js';
import mcpToolParserService from './mcpToolParser.service.js';
import chatService from './chat.service.js';
import { FlowError, AIServiceError, ToolExecutionError, ErrorFactory } from '../types/errors.js';

class ChatFlowManager {
  constructor() {
    this.activeFlows = new Map();
    this.flowMetrics = {
      totalFlows: 0,
      completedFlows: 0,
      failedFlows: 0,
      averageProcessingTime: 0
    };
  }

  /**
   * 開始新的聊天流程
   * @param {Object} params - 流程參數
   * @param {string} params.conversationId - 對話 ID
   * @param {string} params.message - 用戶消息
   * @param {string} params.userId - 用戶 ID
   * @param {string} params.selectedModel - 選擇的 AI 模型
   * @param {Function} params.eventCallback - 事件回調函數
   * @returns {Object} 流程狀態
   */
  async startChatFlow({
    conversationId,
    message,
    userId,
    selectedModel,
    eventCallback
  }) {
    const flowId = uuidv4();
    const startTime = Date.now();
    
    const flowState = {
      flowId,
      conversationId,
      userId,
      selectedModel,
      message,
      startTime,
      currentStep: 'initialized',
      steps: [],
      errors: [],
      toolCalls: [],
      eventCallback
    };

    this.activeFlows.set(flowId, flowState);
    this.flowMetrics.totalFlows++;

    logger.info(`[ChatFlow:${flowId}] 開始新的聊天流程`, {
      conversationId,
      userId,
      selectedModel,
      messageLength: message.length
    });

    try {
      await this._executeFlow(flowState);
      return { success: true, flowId };
    } catch (error) {
      logger.error(`[ChatFlow:${flowId}] 流程執行失敗`, { error: error.message });
      this._handleFlowError(flowState, error);
      return { success: false, flowId, error: error.message };
    }
  }

  /**
   * 執行完整的聊天流程
   * @private
   */
  async _executeFlow(flowState) {
    const { flowId } = flowState;

    try {
      // Step 1: AI 處理用戶消息
      await this._stepAIProcessing(flowState);

      // Step 2: 檢測 MCP 工具調用
      await this._stepToolDetection(flowState);

      // Step 3: 執行 MCP 工具（如果需要）
      if (flowState.toolCalls.length > 0) {
        await this._stepToolExecution(flowState);
        
        // Step 4: 處理工具結果
        await this._stepToolResultProcessing(flowState);
      }

      // Step 5: 完成流程
      await this._stepFlowCompletion(flowState);

    } catch (error) {
      this._handleFlowError(flowState, error);
      throw error;
    } finally {
      this._cleanupFlow(flowState);
    }
  }

  /**
   * Step 1: AI 處理用戶消息
   * @private
   */
  async _stepAIProcessing(flowState) {
    const { flowId, message, selectedModel, eventCallback } = flowState;
    
    this._updateFlowStep(flowState, 'ai_processing', 'AI 正在處理消息...');
    
    logger.info(`[ChatFlow:${flowId}] Step 1: AI 處理開始`, { selectedModel });

    try {
      const aiResponse = await aiService.generateResponse({
        message,
        model: selectedModel,
        conversationId: flowState.conversationId,
        onProgress: (chunk) => {
          eventCallback?.({
            type: 'ai_response_chunk',
            data: { chunk, flowId }
          });
        }
      });

      flowState.aiResponse = aiResponse;
      this._addFlowStep(flowState, 'ai_processing', 'completed', {
        responseLength: aiResponse.length,
        processingTime: Date.now() - flowState.stepStartTime
      });

      logger.info(`[ChatFlow:${flowId}] Step 1: AI 處理完成`, {
        responseLength: aiResponse.length
      });

      eventCallback?.({
        type: 'ai_response_complete',
        data: { response: aiResponse, flowId }
      });

    } catch (error) {
      this._addFlowStep(flowState, 'ai_processing', 'failed', { error: error.message });
      throw new AIServiceError(`AI 處理失敗: ${error.message}`, selectedModel, null, {
        flowId,
        step: 'ai_processing',
        originalError: error.message
      });
    }
  }

  /**
   * Step 2: 檢測 MCP 工具調用
   * @private
   */
  async _stepToolDetection(flowState) {
    const { flowId, aiResponse, eventCallback } = flowState;
    
    this._updateFlowStep(flowState, 'tool_detection', '檢測 MCP 工具調用...');
    
    logger.info(`[ChatFlow:${flowId}] Step 2: 工具檢測開始`);

    try {
      const detectedTools = await mcpToolParserService.detectToolCalls(aiResponse);
      
      flowState.toolCalls = detectedTools;
      this._addFlowStep(flowState, 'tool_detection', 'completed', {
        toolsDetected: detectedTools.length,
        tools: detectedTools.map(t => t.name),
        processingTime: Date.now() - flowState.stepStartTime
      });

      logger.info(`[ChatFlow:${flowId}] Step 2: 工具檢測完成`, {
        toolsDetected: detectedTools.length,
        tools: detectedTools.map(t => t.name)
      });

      eventCallback?.({
        type: 'tools_detected',
        data: { tools: detectedTools, flowId }
      });

    } catch (error) {
      this._addFlowStep(flowState, 'tool_detection', 'failed', { error: error.message });
      throw new FlowError(`工具檢測失敗: ${error.message}`, flowId, 'tool_detection', {
        originalError: error.message
      });
    }
  }

  /**
   * Step 3: 執行 MCP 工具
   * @private
   */
  async _stepToolExecution(flowState) {
    const { flowId, toolCalls, eventCallback } = flowState;
    
    this._updateFlowStep(flowState, 'tool_execution', '執行 MCP 工具...');
    
    logger.info(`[ChatFlow:${flowId}] Step 3: 工具執行開始`, {
      toolCount: toolCalls.length
    });

    flowState.toolResults = [];

    for (let i = 0; i < toolCalls.length; i++) {
      const tool = toolCalls[i];
      const toolStartTime = Date.now();

      try {
        logger.info(`[ChatFlow:${flowId}] 執行工具 ${i + 1}/${toolCalls.length}: ${tool.name}`);

        eventCallback?.({
          type: 'tool_execution_start',
          data: { tool, index: i, total: toolCalls.length, flowId }
        });

        const result = await mcpService.callTool(tool.name, tool.arguments);
        const executionTime = Date.now() - toolStartTime;

        flowState.toolResults.push({
          tool,
          result,
          executionTime,
          success: true
        });

        logger.info(`[ChatFlow:${flowId}] 工具 ${tool.name} 執行成功`, {
          executionTime,
          resultSize: JSON.stringify(result).length
        });

        eventCallback?.({
          type: 'tool_execution_complete',
          data: { tool, result, executionTime, flowId }
        });

      } catch (error) {
        const executionTime = Date.now() - toolStartTime;
        
        flowState.toolResults.push({
          tool,
          error: error.message,
          executionTime,
          success: false
        });

        logger.error(`[ChatFlow:${flowId}] 工具 ${tool.name} 執行失敗`, {
          error: error.message,
          executionTime
        });

        eventCallback?.({
          type: 'tool_execution_error',
          data: { tool, error: error.message, executionTime, flowId }
        });
      }
    }

    this._addFlowStep(flowState, 'tool_execution', 'completed', {
      totalTools: toolCalls.length,
      successfulTools: flowState.toolResults.filter(r => r.success).length,
      failedTools: flowState.toolResults.filter(r => !r.success).length,
      totalExecutionTime: Date.now() - flowState.stepStartTime
    });
  }

  /**
   * Step 4: 處理工具結果
   * @private
   */
  async _stepToolResultProcessing(flowState) {
    const { flowId, toolResults, eventCallback } = flowState;
    
    this._updateFlowStep(flowState, 'result_processing', '處理工具結果...');
    
    logger.info(`[ChatFlow:${flowId}] Step 4: 結果處理開始`);

    try {
      const formattedResults = await mcpToolParserService.formatToolResults(toolResults);
      
      flowState.formattedResults = formattedResults;
      this._addFlowStep(flowState, 'result_processing', 'completed', {
        resultsProcessed: toolResults.length,
        processingTime: Date.now() - flowState.stepStartTime
      });

      logger.info(`[ChatFlow:${flowId}] Step 4: 結果處理完成`);

      eventCallback?.({
        type: 'results_processed',
        data: { results: formattedResults, flowId }
      });

    } catch (error) {
      this._addFlowStep(flowState, 'result_processing', 'failed', { error: error.message });
      throw new FlowError(`結果處理失敗: ${error.message}`, flowId, 'result_processing', {
        originalError: error.message
      });
    }
  }

  /**
   * Step 5: 完成流程
   * @private
   */
  async _stepFlowCompletion(flowState) {
    const { flowId, eventCallback } = flowState;
    
    this._updateFlowStep(flowState, 'completion', '完成聊天流程...');
    
    const totalTime = Date.now() - flowState.startTime;
    
    this._addFlowStep(flowState, 'completion', 'completed', {
      totalProcessingTime: totalTime
    });

    this.flowMetrics.completedFlows++;
    this._updateAverageProcessingTime(totalTime);

    logger.info(`[ChatFlow:${flowId}] 流程完成`, {
      totalTime,
      stepsCompleted: flowState.steps.length,
      toolsExecuted: flowState.toolCalls?.length || 0
    });

    eventCallback?.({
      type: 'flow_complete',
      data: { 
        flowId, 
        totalTime, 
        summary: this._generateFlowSummary(flowState)
      }
    });
  }

  /**
   * 處理流程錯誤
   * @private
   */
  _handleFlowError(flowState, error) {
    const { flowId } = flowState;
    
    flowState.errors.push({
      step: flowState.currentStep,
      error: error.message,
      timestamp: new Date().toISOString()
    });

    this.flowMetrics.failedFlows++;

    logger.error(`[ChatFlow:${flowId}] 流程錯誤`, {
      step: flowState.currentStep,
      error: error.message,
      totalTime: Date.now() - flowState.startTime
    });

    flowState.eventCallback?.({
      type: 'flow_error',
      data: { 
        flowId, 
        error: error.message, 
        step: flowState.currentStep 
      }
    });
  }

  /**
   * 更新流程步驟
   * @private
   */
  _updateFlowStep(flowState, step, description) {
    flowState.currentStep = step;
    flowState.stepStartTime = Date.now();
    
    logger.debug(`[ChatFlow:${flowState.flowId}] ${step}: ${description}`);
  }

  /**
   * 添加完成的步驟記錄
   * @private
   */
  _addFlowStep(flowState, step, status, metadata = {}) {
    flowState.steps.push({
      step,
      status,
      startTime: flowState.stepStartTime,
      endTime: Date.now(),
      duration: Date.now() - flowState.stepStartTime,
      metadata
    });
  }

  /**
   * 清理流程資源
   * @private
   */
  _cleanupFlow(flowState) {
    const { flowId } = flowState;
    
    setTimeout(() => {
      this.activeFlows.delete(flowId);
      logger.debug(`[ChatFlow:${flowId}] 流程資源已清理`);
    }, 60000); // 1分鐘後清理
  }

  /**
   * 生成流程摘要
   * @private
   */
  _generateFlowSummary(flowState) {
    return {
      flowId: flowState.flowId,
      totalSteps: flowState.steps.length,
      totalTime: Date.now() - flowState.startTime,
      toolsExecuted: flowState.toolCalls?.length || 0,
      successful: flowState.errors.length === 0,
      errors: flowState.errors
    };
  }

  /**
   * 更新平均處理時間
   * @private
   */
  _updateAverageProcessingTime(newTime) {
    const { completedFlows, averageProcessingTime } = this.flowMetrics;
    this.flowMetrics.averageProcessingTime = 
      (averageProcessingTime * (completedFlows - 1) + newTime) / completedFlows;
  }

  /**
   * 獲取流程狀態
   */
  getFlowState(flowId) {
    return this.activeFlows.get(flowId);
  }

  /**
   * 獲取流程指標
   */
  getFlowMetrics() {
    return {
      ...this.flowMetrics,
      activeFlows: this.activeFlows.size
    };
  }

  /**
   * 獲取所有活躍流程
   */
  getActiveFlows() {
    return Array.from(this.activeFlows.values()).map(flow => ({
      flowId: flow.flowId,
      conversationId: flow.conversationId,
      currentStep: flow.currentStep,
      startTime: flow.startTime,
      userId: flow.userId
    }));
  }
}

export default new ChatFlowManager();
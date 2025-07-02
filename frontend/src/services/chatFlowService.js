/**
 * 聊天流程服務 - 前端版本
 * 統一處理前端的聊天流程、事件處理和狀態管理
 */

import { ref, reactive } from 'vue';
import { message } from 'ant-design-vue';

class ChatFlowService {
  constructor() {
    this.activeFlows = new Map();
    this.eventListeners = new Set();
    this.flowMetrics = reactive({
      totalFlows: 0,
      activeFlowsCount: 0,
      completedFlows: 0,
      failedFlows: 0
    });
  }

  /**
   * 創建新的聊天流程
   */
  createFlow(flowId, options = {}) {
    const flow = reactive({
      flowId,
      status: 'initializing',
      currentStep: null,
      steps: [],
      events: [],
      errors: [],
      toolCalls: [],
      results: null,
      startTime: Date.now(),
      endTime: null,
      
      // UI 狀態
      isStreaming: false,
      isProcessingTools: false,
      showProgress: false,
      progressText: '',
      
      // 配置
      options: {
        showDebugInfo: false,
        autoScroll: true,
        enableTypingAnimation: true,
        ...options
      }
    });

    this.activeFlows.set(flowId, flow);
    this.flowMetrics.totalFlows++;
    this.flowMetrics.activeFlowsCount++;

    this.emitEvent('flow_created', { flowId, flow });

    return flow;
  }

  /**
   * 處理流程事件
   */
  handleFlowEvent(eventType, eventData) {
    const { flowId } = eventData;
    const flow = this.activeFlows.get(flowId);

    if (!flow) {
      console.warn(`流程 ${flowId} 不存在，無法處理事件 ${eventType}`);
      return;
    }

    // 記錄事件
    flow.events.push({
      type: eventType,
      data: eventData,
      timestamp: Date.now()
    });

    // 根據事件類型更新流程狀態
    switch (eventType) {
      case 'ai_response_chunk':
        this.handleAIResponseChunk(flow, eventData);
        break;
      case 'ai_response_complete':
        this.handleAIResponseComplete(flow, eventData);
        break;
      case 'tools_detected':
        this.handleToolsDetected(flow, eventData);
        break;
      case 'tool_execution_start':
        this.handleToolExecutionStart(flow, eventData);
        break;
      case 'tool_execution_complete':
        this.handleToolExecutionComplete(flow, eventData);
        break;
      case 'tool_execution_error':
        this.handleToolExecutionError(flow, eventData);
        break;
      case 'results_processed':
        this.handleResultsProcessed(flow, eventData);
        break;
      case 'flow_complete':
        this.handleFlowComplete(flow, eventData);
        break;
      case 'flow_error':
        this.handleFlowError(flow, eventData);
        break;
      default:
        console.debug(`未知事件類型: ${eventType}`);
    }

    // 發送事件給監聽器
    this.emitEvent(eventType, { flow, eventData });
  }

  /**
   * 處理 AI 響應塊
   */
  handleAIResponseChunk(flow, eventData) {
    flow.status = 'ai_processing';
    flow.currentStep = 'receiving_ai_response';
    flow.isStreaming = true;
    flow.progressText = 'AI 正在思考...';
    
    if (flow.options.showDebugInfo) {
      console.debug(`[Flow:${flow.flowId}] 接收 AI 響應塊`, eventData);
    }
  }

  /**
   * 處理 AI 響應完成
   */
  handleAIResponseComplete(flow, eventData) {
    flow.isStreaming = false;
    flow.progressText = '正在檢測工具調用...';
    
    this.addFlowStep(flow, 'ai_processing', 'completed', {
      responseLength: eventData.response?.length || 0
    });
  }

  /**
   * 處理工具檢測結果
   */
  handleToolsDetected(flow, eventData) {
    const { tools } = eventData;
    flow.toolCalls = tools;
    flow.currentStep = 'tools_detected';
    
    if (tools.length > 0) {
      flow.isProcessingTools = true;
      flow.progressText = `檢測到 ${tools.length} 個工具調用`;
      flow.showProgress = true;
    } else {
      flow.progressText = '未檢測到工具調用';
    }

    this.addFlowStep(flow, 'tool_detection', 'completed', {
      toolsCount: tools.length,
      toolNames: tools.map(t => t.name)
    });
  }

  /**
   * 處理工具執行開始
   */
  handleToolExecutionStart(flow, eventData) {
    const { tool, index, total } = eventData;
    flow.currentStep = 'executing_tools';
    flow.progressText = `執行工具 ${index + 1}/${total}: ${tool.name}`;
    
    this.addFlowStep(flow, `tool_execution_${tool.name}`, 'started', {
      toolName: tool.name,
      index,
      total,
      arguments: tool.arguments
    });
  }

  /**
   * 處理工具執行完成
   */
  handleToolExecutionComplete(flow, eventData) {
    const { tool, result, executionTime } = eventData;
    
    this.addFlowStep(flow, `tool_execution_${tool.name}`, 'completed', {
      toolName: tool.name,
      executionTime,
      resultSize: JSON.stringify(result).length
    });

    // 檢查是否所有工具都執行完成
    const completedTools = flow.steps.filter(step => 
      step.step.startsWith('tool_execution_') && step.status === 'completed'
    ).length;

    if (completedTools === flow.toolCalls.length) {
      flow.progressText = '正在處理工具結果...';
    }
  }

  /**
   * 處理工具執行錯誤
   */
  handleToolExecutionError(flow, eventData) {
    const { tool, error, executionTime } = eventData;
    
    flow.errors.push({
      step: `tool_execution_${tool.name}`,
      error,
      timestamp: Date.now()
    });

    this.addFlowStep(flow, `tool_execution_${tool.name}`, 'failed', {
      toolName: tool.name,
      error,
      executionTime
    });

    if (flow.options.showDebugInfo) {
      message.error(`工具 ${tool.name} 執行失敗: ${error}`);
    }
  }

  /**
   * 處理結果處理完成
   */
  handleResultsProcessed(flow, eventData) {
    const { results } = eventData;
    flow.results = results;
    flow.progressText = '結果處理完成';
    
    this.addFlowStep(flow, 'result_processing', 'completed', {
      resultsCount: results.length
    });
  }

  /**
   * 處理流程完成
   */
  handleFlowComplete(flow, eventData) {
    flow.status = 'completed';
    flow.currentStep = 'completed';
    flow.endTime = Date.now();
    flow.isProcessingTools = false;
    flow.showProgress = false;
    flow.progressText = '';

    const totalTime = flow.endTime - flow.startTime;
    this.addFlowStep(flow, 'flow_completion', 'completed', {
      totalTime,
      summary: eventData.summary
    });

    this.flowMetrics.completedFlows++;
    this.flowMetrics.activeFlowsCount--;

    // 延遲清理流程數據
    setTimeout(() => {
      this.cleanupFlow(flow.flowId);
    }, 300000); // 5分鐘後清理
  }

  /**
   * 處理流程錯誤
   */
  handleFlowError(flow, eventData) {
    const { error, step } = eventData;
    
    flow.status = 'failed';
    flow.errors.push({
      step,
      error,
      timestamp: Date.now()
    });
    flow.isProcessingTools = false;
    flow.showProgress = false;
    flow.progressText = `錯誤: ${error}`;

    this.flowMetrics.failedFlows++;
    this.flowMetrics.activeFlowsCount--;

    message.error(`聊天流程失敗: ${error}`);
  }

  /**
   * 添加流程步驟
   */
  addFlowStep(flow, step, status, metadata = {}) {
    flow.steps.push({
      step,
      status,
      timestamp: Date.now(),
      metadata
    });
  }

  /**
   * 清理流程數據
   */
  cleanupFlow(flowId) {
    if (this.activeFlows.has(flowId)) {
      this.activeFlows.delete(flowId);
      this.emitEvent('flow_cleaned', { flowId });
    }
  }

  /**
   * 獲取流程狀態
   */
  getFlow(flowId) {
    return this.activeFlows.get(flowId);
  }

  /**
   * 獲取所有活躍流程
   */
  getActiveFlows() {
    return Array.from(this.activeFlows.values());
  }

  /**
   * 添加事件監聽器
   */
  addEventListener(listener) {
    this.eventListeners.add(listener);
    
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  /**
   * 發送事件
   */
  emitEvent(eventType, eventData) {
    this.eventListeners.forEach(listener => {
      try {
        listener(eventType, eventData);
      } catch (error) {
        console.error('事件監聽器執行失敗:', error);
      }
    });
  }

  /**
   * 獲取流程指標
   */
  getMetrics() {
    return {
      ...this.flowMetrics,
      activeFlows: this.activeFlows.size
    };
  }

  /**
   * 重置指標
   */
  resetMetrics() {
    this.flowMetrics.totalFlows = 0;
    this.flowMetrics.completedFlows = 0;
    this.flowMetrics.failedFlows = 0;
    this.flowMetrics.activeFlowsCount = this.activeFlows.size;
  }

  /**
   * 創建 SSE 事件處理器
   */
  createSSEHandler(flowId) {
    return (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleFlowEvent(data.type, { flowId, ...data.data });
      } catch (error) {
        console.error('SSE 事件解析失敗:', error);
        this.handleFlowEvent('flow_error', {
          flowId,
          error: 'SSE 事件解析失敗',
          step: 'sse_parsing'
        });
      }
    };
  }

  /**
   * 創建錯誤處理器
   */
  createErrorHandler(flowId) {
    return (error) => {
      console.error(`流程 ${flowId} 發生錯誤:`, error);
      this.handleFlowEvent('flow_error', {
        flowId,
        error: error.message || '未知錯誤',
        step: 'network_error'
      });
    };
  }
}

// 創建單例實例
const chatFlowService = new ChatFlowService();

/**
 * Vue Composable
 */
export function useChatFlow() {
  return {
    // 服務實例
    chatFlowService,
    
    // 響應式數據
    flowMetrics: chatFlowService.flowMetrics,
    
    // 方法
    createFlow: chatFlowService.createFlow.bind(chatFlowService),
    getFlow: chatFlowService.getFlow.bind(chatFlowService),
    getActiveFlows: chatFlowService.getActiveFlows.bind(chatFlowService),
    addEventListener: chatFlowService.addEventListener.bind(chatFlowService),
    getMetrics: chatFlowService.getMetrics.bind(chatFlowService),
    resetMetrics: chatFlowService.resetMetrics.bind(chatFlowService),
    createSSEHandler: chatFlowService.createSSEHandler.bind(chatFlowService),
    createErrorHandler: chatFlowService.createErrorHandler.bind(chatFlowService)
  };
}

export default chatFlowService;
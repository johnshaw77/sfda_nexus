<!--

/**
 * @fileoverview MessageBubble - 聊天消息氣泡組件
 * @description 這是聊天介面中的核心組件，負責渲染和管理所有類型的消息氣泡，
 * 包括用戶消息、AI 助手回應、系統消息等。支援多種功能如工具調用、
 * 圖表生成、思考過程顯示、附件處理等。
 * 
 * @component MessageBubble
 * @author SFDA Development Team
 * @since 1.0.0
 * @version 2.0.0
 * 
 * @example
 * <MessageBubble 
 *   :message="messageData"
 *   :show-status="true"
 *   @quote-message="handleQuoteMessage"
 *   @regenerate-response="handleRegenerateResponse"
 *   @generate-chart="handleGenerateChart"
 * />
 * 
 * @description 主要功能模組：
 * - 消息頭部資訊（MessageHeader）
 * - 消息內容渲染（MessageContent）
 * - 引用消息顯示（QuotedMessage）
 * - 思考過程顯示（ThinkingProcess）
 * - 工具調用結果（ToolCallResults）
 * - MCP 錯誤處理（McpErrorDisplay）
 * - 附件顯示（MessageAttachments）
 * - 圖表顯示和建議（ChartDisplay, ChartSuggestion）
 * - 消息操作工具欄（MessageActions）
 * 
 * @requires vue
 * @requires ant-design-vue
 * @requires @/stores/chat
 * @requires @/stores/config
 * @requires @/stores/auth
 * @requires @/stores/agents
 * @requires @/utils/datetimeFormat
 * @requires @/api/files
 * @requires @/services/chartIntegrationService
 * @requires @/utils/mcpStatisticalAdapter
 */
*/
-->
<template>
  <div
    class="message-bubble"
    :class="{
      'user-message': message.role === 'user',
      'ai-message': message.role === 'assistant',
      'system-message': message.role === 'system',
      'error-message': isErrorMessage,
    }">
    <!-- 消息頭部信息 -->
    <MessageHeader
      :message="message"
      :agent-avatar="currentAgentAvatar" />

    <!-- 消息內容 TODO: 做TEST-->
    <div class="message-content">
      <!-- 引用的消息 -->
      <QuotedMessage :message="message" />

      <!-- 工具調用結果顯示 -->
      <ToolCallResults
        :message="message"
        :effective-tool-calls="effectiveToolCalls"
        :tool-calls-collapsed="toolCallsCollapsed"
        @toggle-tool-calls-collapse="toggleToolCallsCollapse" />

      <!-- MCP 錯誤顯示 -->
      <McpErrorDisplay
        :message="message"
        @retry-mcp-service="handleRetryMcpTool" />

      <!-- 思考過程顯示 -->
      <ThinkingProcess
        :message="message"
        :thinking-collapsed="thinkingCollapsed"
        :is-message-streaming="isMessageStreaming"
        :is-thinking-animating="isThinkingAnimating"
        :displayed-thinking-content="displayedThinkingContent"
        @toggle-thinking-collapse="toggleThinkingCollapse" />

      <!-- 工具處理狀態顯示 -->
      <ToolProcessingStatus :message="message" />

      <!-- 工具結果分段串流狀態顯示 -->
      <ToolResultStreaming :message="message" />

      <!-- 二次調用優化狀態顯示 -->
      <OptimizingStatus :message="message" />

      <!-- 🔧 新增：工具處理錯誤顯示 -->
      <div
        v-if="message.role === 'assistant' && message.toolProcessingError"
        class="tool-processing-error">
        <ExclamationCircleOutlined />
        <span>{{ message.toolProcessingError }}</span>
      </div>

      <!-- 附件顯示 -->
      <MessageAttachments
        :message="message"
        @view-attachment="handleViewAttachment" />

      <!-- 主要內容 -->
      <MessageContent
        :message="message"
        :is-error-message="isErrorMessage"
        :should-use-content-animation="shouldUseContentAnimation"
        :is-chart-message="isChartMessage"
        :is-user-message-collapsed="isUserMessageCollapsed"
        :should-show-expand-button="shouldShowExpandButton"
        :realtime-render="configStore.chatSettings.useRealtimeRender"
        :tool-summaries="toolSummaries"
        @toggle-user-message-expand="toggleUserMessageExpand" />

      <!-- 圖表顯示 -->
      <ChartDisplay
        :is-chart-message="isChartMessage"
        :chart-data="chartData"
        :has-mcp-detected-chart="hasMcpDetectedChart"
        :mcp-chart-detection="mcpChartDetection"
        :has-backend-detected-chart="hasBackendDetectedChart"
        :backend-chart-detection="backendChartDetection" />

      <!-- AI 模型信息和操作 -->
      <MessageActions
        v-if="message.role === 'assistant'"
        v-show="!message.isStreaming && message.status !== 'sending'"
        :message="message"
        :enable-content-animation="enableContentAnimation"
        @copy-content="handleCopyMessage"
        @regenerate-response="handleRegenerateResponse"
        @quote-message="handleQuoteMessage"
        @toggle-content-animation="toggleContentAnimation"
        @delete-message="handleDeleteMessage" />

      <!-- 圖表確認 -->
      <ChartConfirmation
        :message="message"
        :backend-chart-detection="backendChartDetection"
        :is-generating-chart="isGeneratingChart"
        @confirm-chart="handleConfirmChart" />

      <!-- 🎯 智能檢測狀態提示（開發模式）TODO: 先關閉 -->
      <!--
      <div
        v-if="
          message.role === 'assistant' &&
          backendChartDetection &&
          !backendChartDetection.needsConfirmation &&
          !hasBackendDetectedChart
        "
        style="
          background: #fff7e6;
          padding: 6px 8px;
          margin: 8px 0;
          font-size: 11px;
          border: 1px solid #ffd591;
          border-radius: 4px;
          color: #d48806;
        ">
        🔍 開發測試-AI檢測到圖表意圖，但數據不足或可信度較低 ({{
          Math.round(backendChartDetection.confidence * 100)
        }}%)
      </div>
      -->

      <!-- 圖表建議和檢測狀態 -->
      <ChartSuggestion
        :show-chart-suggestion="showChartSuggestion"
        :detected-charts="detectedCharts"
        :has-backend-detected-chart="hasBackendDetectedChart"
        :has-mcp-detected-chart="hasMcpDetectedChart"
        :frontend-chart-detection-enabled="frontendChartDetectionEnabled"
        :is-detecting-charts="isDetectingCharts"
        :chart-detection-error="chartDetectionError"
        @dismiss-chart-suggestion="handleDismissChartSuggestion"
        @generate-chart="handleGenerateChart" />
    </div>

    <!-- 用戶消息和系統消息的工具欄（AI消息工具欄已集成到模型信息中） -->
    <div
      v-if="message.role !== 'assistant'"
      v-show="!message.isStreaming && message.status !== 'sending'"
      class="message-actions">
      <a-tooltip title="複製消息">
        <a-button
          type="text"
          size="small"
          @click="handleCopyMessage">
          <CopyOutlined />
        </a-button>
      </a-tooltip>

      <a-tooltip title="引用回覆">
        <a-button
          type="text"
          size="small"
          @click="handleQuoteMessage">
          <MessageOutlined />
        </a-button>
      </a-tooltip>

      <a-tooltip title="刪除消息">
        <a-button
          type="text"
          size="small"
          @click="handleDeleteMessage"
          class="danger-item">
          <DeleteOutlined />
        </a-button>
      </a-tooltip>
    </div>
    <!-- 消息狀態 -->
    <div
      v-if="showStatus"
      class="message-status">
      <a-spin
        v-if="message.status === 'sending'"
        size="small" />
      <CheckOutlined
        v-else-if="message.status === 'sent'"
        class="status-sent" />
      <ExclamationCircleOutlined
        v-else-if="message.status === 'error'"
        class="status-error" />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, nextTick, onMounted, onUnmounted, watch } from "vue";
import { message as antMessage } from "ant-design-vue";
import { useChatStore } from "@/stores/chat";
import { useConfigStore } from "@/stores/config";
import { useAuthStore } from "@/stores/auth";
import { useAgentsStore } from "@/stores/agents";
import { formatMessageTime } from "@/utils/datetimeFormat";
import { getFilePreviewUrl, askFileQuestion } from "@/api/files";
import MessageHeader from "./headers/MessageHeader.vue";
import ToolCallDisplay from "@/components/common/ToolCallDisplay.vue";
import ToolCallResults from "./tools/ToolCallResults.vue";
import McpErrorDisplay from "./tools/McpErrorDisplay.vue";
import ToolProcessingStatus from "./tools/ToolProcessingStatus.vue";
import ToolResultStreaming from "./tools/ToolResultStreaming.vue";
import OptimizingStatus from "./tools/OptimizingStatus.vue";
import QuotedMessage from "./content/QuotedMessage.vue";
import ThinkingProcess from "./content/ThinkingProcess.vue";
import MessageContent from "./content/MessageContent.vue";
import MessageActions from "./content/MessageActions.vue";
import ChartConfirmation from "./content/ChartConfirmation.vue";
import MessageAttachments from "./attachments/MessageAttachments.vue";
import ChartDisplay from "./charts/ChartDisplay.vue";
import ChartSuggestion from "./charts/ChartSuggestion.vue";
import { chartIntegrationService } from "@/services/chartIntegrationService";
import { mcpStatisticalAdapter } from "@/utils/mcpStatisticalAdapter";
import {
  CopyOutlined,
  MessageOutlined,
  CheckOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons-vue";

/**
 * @typedef {Object} MessageObject
 * @property {string} id - 消息唯一標識符
 * @property {'user'|'assistant'|'system'} role - 消息角色類型
 * @property {string} content - 消息內容文本
 * @property {string} [agent_id] - 智能體 ID
 * @property {string} [agent_name] - 智能體名稱
 * @property {boolean} [isStreaming] - 是否正在串流
 * @property {string} [status] - 消息狀態 ('sending'|'sent'|'error')
 * @property {boolean} [isError] - 是否為錯誤消息
 * @property {string} [thinking_content] - 思考過程內容
 * @property {Object} [metadata] - 消息元數據
 * @property {Array} [tool_calls] - 工具調用列表
 * @property {Array} [attachments] - 附件列表
 * @property {Object} [quoted_message] - 引用的消息
 */

/**
 * 組件 Props 定義
 * @typedef {Object} Props
 * @property {MessageObject} message - 要顯示的消息對象，包含所有消息相關資訊
 * @property {boolean} [showStatus=true] - 是否顯示消息狀態圖示（發送中、已發送、錯誤等）
 */
const props = defineProps({
  /** @type {MessageObject} 消息對象，包含消息的所有資訊和元數據 */
  message: {
    type: Object,
    required: true,
  },
  /** @type {boolean} 是否顯示消息狀態，控制底部狀態圖示的顯示 */
  showStatus: {
    type: Boolean,
    default: true,
  },
});

/**
 * 組件事件定義
 * @typedef {Object} Emits
 * @property {Function} quote-message - 引用消息事件，當用戶點擊引用按鈕時觸發
 * @property {Function} regenerate-response - 重新生成回應事件，當用戶要求重新生成 AI 回應時觸發
 * @property {Function} generate-chart - 生成圖表事件，當檢測到圖表機會並用戶確認生成時觸發
 */
const emit = defineEmits([
  /**
   * 引用消息事件
   * @param {MessageObject} message - 被引用的消息對象
   */
  "quote-message",
  /**
   * 重新生成回應事件
   * @param {MessageObject} message - 需要重新生成回應的消息對象
   */
  "regenerate-response",
  /**
   * 生成圖表事件
   * @param {Object} chartData - 圖表生成數據
   * @param {string} chartData.messageId - 消息 ID
   * @param {Object} chartData.chartData - 圖表數據和配置
   */
  "generate-chart",
]);

/**
 * 狀態管理 Store 實例
 * @description 使用 Pinia 管理的全域狀態，提供聊天、配置、認證和智能體相關功能
 */
const chatStore = useChatStore(); // 聊天對話狀態管理
const configStore = useConfigStore(); // 應用配置管理
const authStore = useAuthStore(); // 用戶認證狀態
const agentsStore = useAgentsStore(); // 智能體管理

/**
 * ====== 組件響應式狀態 ======
 * @description 管理組件內部的各種狀態，包括 UI 展示、動畫控制、圖表處理等
 */

/**
 * 用戶消息相關狀態
 * @description 控制用戶消息的展示和交互行為
 */
/** @type {Ref<HTMLElement|null>} 用戶消息內容 DOM 引用 */
const userMessageContent = ref(null);
/** @type {Ref<boolean>} 用戶消息是否處於折疊狀態 */
const isUserMessageCollapsed = ref(true);
/** @type {Ref<boolean>} 是否應該顯示展開按鈕（當內容過長時） */
const shouldShowExpandButton = ref(false);
/** @type {Ref<HTMLElement|null>} 代碼高亮容器 DOM 引用 */
const codeHighlightRef = ref(null);

/**
 * 工具調用和思考過程狀態
 * @description 控制工具調用結果和思考過程的展示狀態
 */
/** @type {Ref<boolean>} 工具調用結果是否折疊（預設折疊） */
const toolCallsCollapsed = ref(true);
/** @type {Ref<boolean>} 思考過程是否折疊（預設折疊） */
const thinkingCollapsed = ref(true);

/**
 * 內容動畫相關狀態
 * @description 控制消息內容的動畫效果，提升用戶體驗
 */
/** @type {Ref<boolean>} 是否啟用內容動畫效果 */
const enableContentAnimation = ref(true);
/** @type {Ref<HTMLElement|null>} 動畫內容容器 DOM 引用 */
const animatedContentRef = ref(null);

/**
 * 思考內容動畫狀態
 * @description 管理思考過程的逐字顯示動畫
 */
/** @type {Ref<string>} 當前顯示的思考內容（用於動畫效果） */
const displayedThinkingContent = ref("");
/** @type {Ref<boolean>} 思考內容是否正在播放動畫 */
const isThinkingAnimating = ref(false);
/** @type {Ref<number|null>} 思考內容動畫計時器 ID */
const thinkingAnimationTimer = ref(null);

/**
 * 智能圖表相關狀態
 * @description 管理圖表檢測、生成和顯示的各種狀態
 */
/** @type {Ref<Array>} 檢測到的圖表數據列表 */
const detectedCharts = ref([]);
/** @type {Ref<boolean>} 是否正在檢測圖表機會 */
const isDetectingCharts = ref(false);
/** @type {Ref<string|null>} 圖表檢測過程中的錯誤信息 */
const chartDetectionError = ref(null);
/** @type {Ref<boolean>} 是否顯示圖表建議 UI */
const showChartSuggestion = ref(false);
/** @type {Ref<boolean>} 是否正在生成圖表 */
const isGeneratingChart = ref(false);

/**
 * ====== 計算屬性 ======
 * @description 根據 props 和響應式狀態計算出的派生狀態
 */

/**
 * 後端圖表檢測結果
 * @description 從消息元數據中提取後端智能檢測的圖表資訊
 * @returns {Object|null} 包含圖表檢測結果的對象，如果沒有檢測結果則返回 null
 * @computed
 */
const backendChartDetection = computed(() => {
  const detection = props.message.metadata?.chart_detection || null;

  // 🎯 調試：記錄後端檢測結果
  if (detection) {
    console.log("🎯 [MessageBubble] 後端檢測到圖表數據:", {
      messageId: props.message.id,
      hasChartData: detection.hasChartData,
      confidence: detection.confidence,
      chartType: detection.chartType,
      dataCount: detection.data?.length || 0,
    });
  }

  return detection;
});

/**
 * MCP 工具圖表檢測結果
 * @description 從 MCP 工具調用結果中檢測圖表創建數據
 * @returns {Object|null} MCP 工具創建的圖表數據，包含圖表類型、數據和元數據
 * @computed
 */
const mcpChartDetection = computed(() => {
  const toolResults = props.message.metadata?.tool_results || [];

  // 查找圖表創建工具的結果
  for (const result of toolResults) {
    if (
      result?.data?._meta?.tool_type === "chart_creation" &&
      result?.data?._meta?.chart_data
    ) {
      const chartData = result.data._meta.chart_data;

      // 🎯 調試：記錄 MCP 圖表檢測結果
      console.log("🎯 [MessageBubble] MCP 工具檢測到圖表數據:", {
        messageId: props.message.id,
        chartType: chartData.chart_type,
        dataLength: chartData.data?.length || 0,
        confidence: chartData.confidence,
      });

      return {
        hasChartData: true, // 🔧 修復：如果能檢測到 chart_data，就表示有圖表數據
        chartType: chartData.chart_type,
        data: chartData.data,
        title: chartData.title,
        confidence: chartData.confidence || 1.0,
        reasoning: chartData.reasoning,
        source: "mcp_tool",
      };
    }
  }

  return null;
});

// 🎯 計算屬性：判斷是否有後端檢測到的圖表
const hasBackendDetectedChart = computed(() => {
  // 🔧 前端圖表禁用檢查：如果後端檢測被禁用，前端也不顯示
  const detection = backendChartDetection.value;

  // 🔧 檢查是否被後端禁用
  if (detection && detection.reason === "圖表檢測功能已禁用") {
    console.log("🎯 [MessageBubble] 圖表檢測已被後端禁用，跳過顯示");
    return false;
  }

  // 🎯 更寬鬆的檢測條件
  const hasChart =
    detection &&
    detection.hasChartData === true &&
    detection.confidence >= 0.5 &&
    detection.data &&
    Array.isArray(detection.data) &&
    detection.data.length > 0;

  // 🎯 調試：記錄是否應該顯示圖表
  if (detection) {
    console.log("🎯 [MessageBubble] 圖表顯示判斷:", {
      messageId: props.message.id,
      hasChartData: detection.hasChartData,
      confidence: detection.confidence,
      dataLength: detection.data?.length || 0,
      shouldShow: hasChart,
      isDisabled: detection.reason === "圖表檢測功能已禁用",
    });
  }

  return hasChart;
});

// 🎬 計算屬性：判斷是否應該使用內容動畫效果
// 追蹤消息是否曾經串流過
// 只有當消息明確標記為曾經串流過時才設為true
const hasBeenStreamed = ref(false);

// 檢查消息是否曾經串流過（通過檢查消息的來源）
const wasEverStreaming = computed(() => {
  // 如果消息有 isStreaming 字段且曾經為 true，或者有特定的串流標記
  return props.message.hasOwnProperty("isStreaming") && hasBeenStreamed.value;
});

// 監聽串流狀態變化
watch(
  () => props.message.isStreaming,
  (isStreaming, wasStreaming) => {
    if (wasStreaming && !isStreaming) {
      // 串流剛結束
      hasBeenStreamed.value = true;
      console.log("串流結束，標記為已串流過");
    }
  },
  { immediate: true }
);

// 組件掛載時檢查初始狀態
onMounted(() => {
  // 如果消息初始時就在串流，標記它
  if (props.message.isStreaming) {
    console.log("消息初始時正在串流");
  } else if (props.message.hasOwnProperty("isStreaming")) {
    // 如果有 isStreaming 屬性但為 false，且有內容，可能是串流剛結束的消息
    // 但我們不設置 hasBeenStreamed，因為可能是工具回應
    console.log("消息有 isStreaming 屬性但不在串流中");
  } else {
    // 沒有 isStreaming 屬性，可能是工具回應或靜態內容
    console.log("消息沒有 isStreaming 屬性，可能是工具回應");
  }
});

// 監聽動畫開關變化，當用戶手動開啟動畫時重置狀態
watch(enableContentAnimation, (newValue) => {
  if (newValue && hasBeenStreamed.value) {
    // 用戶手動開啟動畫，重置串流狀態，允許動畫
    hasBeenStreamed.value = false;
    console.log("用戶手動開啟動畫，重置串流狀態");
  }
});

const shouldUseContentAnimation = computed(() => {
  // 只對AI助手回應且非錯誤訊息啟用動畫
  const isCompleted =
    !props.message.isStreaming && props.message.status !== "streaming";

  const shouldAnimate =
    enableContentAnimation.value &&
    props.message.role === "assistant" &&
    !isErrorMessage.value &&
    !isChartMessage.value &&
    props.message.content &&
    props.message.content.length > 100 &&
    isCompleted && // 確保消息完全完成
    !hasBeenStreamed.value; // 重要：沒有串流過的消息才動畫

  console.log("動畫條件檢查:", {
    enableContentAnimation: enableContentAnimation.value,
    role: props.message.role,
    messageId: props.message.id,
    hasBeenStreamed: hasBeenStreamed.value,
    isStreaming: props.message.isStreaming,
    hasStreamingProperty: props.message.hasOwnProperty("isStreaming"),
    isCompleted,
    shouldAnimate,
  });

  return shouldAnimate;
});

// 🎯 前端智能圖表檢測開關 - 配合後端設置
const frontendChartDetectionEnabled = computed(() => {
  // 如果後端明確禁用，前端也禁用
  const detection = backendChartDetection.value;
  if (detection && detection.reason === "圖表檢測功能已禁用") {
    console.log("🎯 [MessageBubble] 後端圖表檢測已禁用，前端也禁用");
    return false;
  }

  // 如果已經有 MCP 工具圖表或後端智能圖表，前端檢測不啟用
  if (hasMcpDetectedChart.value || hasBackendDetectedChart.value) {
    console.log("🎯 [MessageBubble] 已有 MCP 或後端圖表，禁用前端檢測");
    return false;
  }

  // 🚀 新增：臨時禁用前端智能檢測 - 統一由後端 MCP 處理
  // TODO: 未來可以通過 .env 或後端配置來控制這個開關
  console.log("🎯 [MessageBubble] 前端智能檢測已暫時禁用，統一由後端 MCP 處理");
  return false;
});

// 🎯 計算屬性：判斷是否有 MCP 工具檢測到的圖表
const hasMcpDetectedChart = computed(() => {
  const detection = mcpChartDetection.value;

  const hasChart =
    detection &&
    detection.hasChartData === true &&
    detection.confidence >= 0.5 &&
    detection.data &&
    Array.isArray(detection.data) &&
    detection.data.length > 0;

  // 🎯 調試：記錄 MCP 圖表顯示判斷
  if (detection) {
    console.log("🎯 [MessageBubble] MCP 圖表顯示判斷:", {
      messageId: props.message.id,
      hasChartData: detection.hasChartData,
      confidence: detection.confidence,
      dataLength: detection.data?.length || 0,
      shouldShow: hasChart,
    });
  }

  return hasChart;
});

// 計算屬性：判斷消息是否正在串流
const isMessageStreaming = computed(() => {
  // 檢查消息是否正在串流
  return (
    props.message.metadata?.streaming ||
    props.message.streaming ||
    chatStore.streamingMessageId === props.message.id
  );
});

// 計算屬性：判斷是否有思考內容
const hasThinkingContent = computed(() => {
  return !!getThinkingContent();
});

// 🎯 計算屬性：判斷是否為圖表消息
const isChartMessage = computed(() => {
  return !!(
    props.message.metadata?.isChartMessage && props.message.metadata?.chartData
  );
});

// 🎯 計算屬性：獲取圖表數據
const chartData = computed(() => {
  return props.message.metadata?.chartData || null;
});

// 🔧 計算屬性：提取工具結果中的 Summary 信息
const toolSummaries = computed(() => {
  const toolResults = props.message.metadata?.tool_results || [];
  const summaries = [];

  console.log("🔍 [toolSummaries] 調試信息:", {
    messageId: props.message.id,
    toolResultsCount: toolResults.length,
    toolResults: toolResults,
  });

  for (const result of toolResults) {
    console.log("🔍 [toolSummaries] 檢查工具結果:", {
      success: result.success,
      hasResult: !!result.result,
      resultData: result.result,
      toolName: result.tool_name,
    });

    if (!result.success) continue;

    // 🔧 修復：檢查多個可能的數據位置
    const dataSources = [
      result.result, // 原始邏輯
      result.data, // 另一個可能的位置
      result, // 直接在 result 對象中
    ].filter(Boolean);

    for (const data of dataSources) {
      if (!data || typeof data !== "object") continue;

      // 檢查 statistics.summary 字段
      if (data.statistics?.summary) {
        console.log("✅ 找到 statistics.summary:", data.statistics.summary);
        summaries.push({
          toolName: result.tool_name || "Unknown Tool",
          summary: data.statistics.summary,
        });
        break;
      }
      // 檢查直接的 summary 字段
      else if (data.summary) {
        console.log("✅ 找到直接 summary:", data.summary);
        summaries.push({
          toolName: result.tool_name || "Unknown Tool",
          summary: data.summary,
        });
        break;
      }
      // 檢查大寫的 Summary 字段
      else if (data.Summary) {
        console.log("✅ 找到大寫 Summary:", data.Summary);
        summaries.push({
          toolName: result.tool_name || "Unknown Tool",
          summary: data.Summary,
        });
        break;
      }
    }

    // 如果這個工具結果沒有找到 Summary，記錄調試信息
    let foundInThisResult = false;
    for (const data of dataSources) {
      if (
        data &&
        typeof data === "object" &&
        (data.statistics?.summary || data.summary || data.Summary)
      ) {
        foundInThisResult = true;
        break;
      }
    }

    if (!foundInThisResult) {
      console.log(
        "❌ 在這個工具結果中未找到 Summary 字段，檢查的數據源:",
        dataSources.map((d) => Object.keys(d || {}))
      );
    }
  }

  console.log("🔍 [toolSummaries] 最終結果:", summaries);
  return summaries;
});

// 用戶消息的最大高度（行數）
const MAX_USER_MESSAGE_LINES = 6;

// 計算屬性：獲取有效的工具調用列表
const effectiveToolCalls = computed(() => {
  const toolCalls =
    props.message.metadata?.tool_calls || props.message.tool_calls || [];
  const toolResults = props.message.metadata?.tool_results || [];

  // 調試：當有工具調用時記錄計算過程
  if (toolCalls.length > 0) {
    console.log("🔧 [MessageBubble] effectiveToolCalls 計算:", {
      messageId: props.message.id,
      toolCallsCount: toolCalls.length,
      toolResultsCount: toolResults.length,
    });
  }

  // 如果沒有工具調用，返回空陣列
  if (toolCalls.length === 0) {
    return [];
  }

  // 將工具調用和結果合併
  const results = toolCalls.map((toolCall, index) => {
    const result = toolResults[index];

    // 🔧 修復：更寬鬆的成功判斷邏輯
    // 1. 明確檢查 success 為 true 或 "true" 或 truthy 值（如數字 1）
    // 2. 如果沒有 success 字段但有數據且沒有錯誤，也認為成功
    // 3. 有明確錯誤時認為失敗
    const isSuccess = result
      ? // 有明確錯誤時認為失敗
        result.error
        ? false
        : // 明確成功標記
          result.success === true ||
          result.success === "true" ||
          // 數字成功標記（如 1）
          (typeof result.success === "number" && result.success > 0) ||
          // 沒有 success 字段但有數據且沒有錯誤
          (result.success === undefined && result.data && !result.error)
      : false;

    const effective = {
      // 工具調用基本信息
      toolName: toolCall.name || result?.tool_name || "unknown",
      name: toolCall.name || result?.tool_name,
      format: toolCall.format || "function",
      arguments: toolCall.parameters || {},

      // 執行結果 - 使用改進的成功判斷邏輯
      success: isSuccess,
      result: result?.data || {},
      error: result?.error || null,
      executionTime: result?.execution_time || 0,

      // 元數據
      metadata: {
        timestamp: result?.timestamp,
        version: result?.version,
        executionId: result?.execution_id,
        serviceName: result?.service_name,
        module: result?.module,
      },

      // 調試信息
      details: result,
    };

    // 調試：記錄工具調用的成功狀態計算結果
    if (toolCalls.length > 0) {
      console.log(`🔧 [MessageBubble] 工具調用 ${index} 狀態:`, {
        toolName: effective.toolName,
        success: effective.success,
        hasError: !!result?.error,
        hasData: !!result?.data,
      });
    }

    return effective;
  });

  // 調試：記錄最終的工具調用數據
  if (toolCalls.length > 0) {
    console.log("🔧 [MessageBubble] 工具調用數據處理完成");
  }

  return results;
});

// 獲取圖片 URL

// 生命週期
onMounted(() => {
  console.log("🎯 [MessageBubble] 組件掛載:", {
    messageId: props.message.id,
    role: props.message.role,
    isStreaming: isMessageStreaming.value,
    hasContent: !!props.message.content,
    streamingMessageId: chatStore.streamingMessageId,
  });

  if (props.message.role === "user") {
    checkUserMessageHeight();
  }

  // 🎯 對於已完成的消息，立即檢測
  if (!isMessageStreaming.value && props.message.role === "assistant") {
    console.log("🎯 [MessageBubble] onMounted 觸發圖表檢測");
    nextTick(() => {
      detectChartsInMessage();
    });
  } else {
    console.log("🎯 [MessageBubble] onMounted 跳過圖表檢測:", {
      isStreaming: isMessageStreaming.value,
      role: props.message.role,
    });
  }
});

// 清理 blob URLs 和計時器
onUnmounted(() => {
  imageBlobUrls.value.forEach((blobUrl) => {
    URL.revokeObjectURL(blobUrl);
  });
  imageBlobUrls.value.clear();

  // 清理思考內容動畫計時器
  if (thinkingAnimationTimer.value) {
    clearTimeout(thinkingAnimationTimer.value);
  }
});

// 檢查用戶消息高度並決定是否顯示展開按鈕
const checkUserMessageHeight = () => {
  if (!userMessageContent.value) return;

  const element = userMessageContent.value;
  const lineHeight = parseInt(window.getComputedStyle(element).lineHeight);
  const maxHeight = lineHeight * MAX_USER_MESSAGE_LINES;

  shouldShowExpandButton.value = element.scrollHeight > maxHeight;

  // console.log("檢查用戶消息高度:", {
  //   scrollHeight: element.scrollHeight,
  //   maxHeight,
  //   shouldShow: shouldShowExpandButton.value,
  // });
};

// 切換用戶消息展開狀態
const toggleUserMessageExpand = () => {
  isUserMessageCollapsed.value = !isUserMessageCollapsed.value;
};

// 切換工具調用折疊狀態
const toggleToolCallsCollapse = () => {
  toolCallsCollapsed.value = !toolCallsCollapsed.value;
};

// 切換思考過程折疊狀態
const toggleThinkingCollapse = () => {
  thinkingCollapsed.value = !thinkingCollapsed.value;
};

// 計算屬性：獲取當前智能體頭像
const currentAgentAvatar = computed(() => {
  // 如果消息中有 agent_id，查找對應智能體
  if (props.message.agent_id) {
    const agent = agentsStore.getAgentById(props.message.agent_id);
    return agent?.avatar;
  }

  // 如果有 agent_name，通過名稱查找
  if (props.message.agent_name) {
    const agent = agentsStore.getAgentByName(props.message.agent_name);
    return agent?.avatar;
  }

  // 嘗試從當前對話獲取智能體信息
  const currentAgent = agentsStore.getCurrentAgent;
  if (currentAgent) {
    return currentAgent.avatar;
  }

  // 默認返回 null，會使用默認頭像
  return null;
});

// 獲取思考內容的方法
const getThinkingContent = () => {
  /*
  console.log("🧠 [MessageBubble] 檢查思考內容:", {
    messageId: props.message.id,
    role: props.message.role,
    hasDirectThinking: !!props.message.thinking_content,
    hasMetadataThinking: !!props.message.metadata?.thinking_content,
    directLength: props.message.thinking_content?.length || 0,
    metadataLength: props.message.metadata?.thinking_content?.length || 0,
    messageContent: props.message.content?.substring(0, 50) + "...",
    isStreaming: props.message.isStreaming,
    streamingMessageId: chatStore.streamingMessageId,
    isCurrentStreaming: chatStore.streamingMessageId === props.message.id,
  });
  */

  // 優先從直接屬性獲取（流式模式）
  if (props.message.thinking_content) {
    /*
    console.log(
      "🧠 [MessageBubble] 從直接屬性獲取思考內容:",
      props.message.thinking_content.length,
      "字符，預覽:",
      props.message.thinking_content.substring(0, 100) + "..."
    );
    */
    return props.message.thinking_content;
  }

  // 從 metadata 獲取（非流式模式）
  if (props.message.metadata?.thinking_content) {
    /*
    console.log(
      "🧠 [MessageBubble] 從 metadata 獲取思考內容:",
      props.message.metadata.thinking_content.length,
      "字符，預覽:",
      props.message.metadata.thinking_content.substring(0, 100) + "..."
    );
    */
    return props.message.metadata.thinking_content;
  }

  // console.log("🧠 [MessageBubble] 沒有找到思考內容");
  return null;
};

// 計算屬性
// getSenderName 函數已移動到 MessageInfo 組件中

// 監控消息內容變化（用戶消息）
watch(
  () => props.message.content,
  () => {
    if (props.message.role === "user") {
      nextTick(() => {
        checkUserMessageHeight();
      });
    }
  },
  { immediate: true }
);

// 監控思考內容變化（用於調試和動畫）
watch(
  () => getThinkingContent(),
  (newThinking, oldThinking) => {
    if (newThinking !== oldThinking) {
      /*
      console.log("🧠 [MessageBubble] 思考內容更新:", {
        messageId: props.message.id,
        hasContent: !!newThinking,
        length: newThinking?.length || 0,
        preview: newThinking?.substring(0, 100) + "..." || "無內容",
        isStreaming: isMessageStreaming.value,
        oldLength: oldThinking?.length || 0,
        isCurrentStreaming: chatStore.streamingMessageId === props.message.id,
        thinkingCollapsed: thinkingCollapsed.value,
        displayedLength: displayedThinkingContent.value.length,
      });
      */

      // 如果有思考內容，確保思考區域展開
      if (newThinking) {
        thinkingCollapsed.value = false;
        console.log("🧠 [MessageBubble] 自動展開思考區域");

        // 🔧 修復：只有在真正串流狀態下才啟動動畫
        // 檢查是否為當前正在串流的消息
        const isCurrentlyStreaming =
          chatStore.streamingMessageId === props.message.id;

        if (isCurrentlyStreaming) {
          // 真正的串流狀態，啟動動畫
          console.log("🧠 [MessageBubble] 串流狀態，啟動思考內容動畫");
          animateThinkingContent(newThinking);
        } else {
          // 歷史消息或非串流狀態，直接顯示完整內容
          console.log("🧠 [MessageBubble] 非串流狀態，直接顯示完整思考內容");
          displayedThinkingContent.value = newThinking;
          isThinkingAnimating.value = false;

          // 歷史消息的思考區域在載入後自動折疊
          setTimeout(() => {
            if (!isMessageStreaming.value) {
              thinkingCollapsed.value = true;
              console.log("🧠 [MessageBubble] 歷史消息思考區域自動折疊");
            }
          }, 1000); // 1秒後自動折疊，給用戶時間看到有思考內容
        }
      } else {
        // 沒有思考內容時清空顯示
        displayedThinkingContent.value = "";
        isThinkingAnimating.value = false;
        // console.log("🧠 [MessageBubble] 清空思考內容顯示");
      }
    }
  },
  { immediate: true }
);

// 監聽串流狀態變化，在串流完成後自動折疊思考內容
watch(
  () => chatStore.streamingMessageId,
  (newStreamingId, oldStreamingId) => {
    // 如果之前正在串流的消息是當前消息，且現在串流結束了
    if (
      oldStreamingId === props.message.id &&
      newStreamingId !== props.message.id &&
      hasThinkingContent.value
    ) {
      console.log("🧠 [MessageBubble] 檢測到串流完成，準備自動折疊思考內容");

      // 延遲折疊，給用戶時間看到完整的思考內容
      setTimeout(() => {
        if (!isThinkingAnimating.value) {
          thinkingCollapsed.value = true;
          console.log("🧠 [MessageBubble] 串流完成後自動折疊思考內容");
        }
      }, 2000); // 2秒後自動折疊
    }
  }
);

// 思考內容動畫函數
const animateThinkingContent = (targetContent) => {
  if (!targetContent) {
    displayedThinkingContent.value = "";
    isThinkingAnimating.value = false;
    return;
  }

  // 如果內容沒有變化，不需要動畫
  if (targetContent === displayedThinkingContent.value) {
    return;
  }

  // 如果是第一次出現思考內容，或者內容完全不同，重新開始動畫
  const shouldRestartAnimation =
    displayedThinkingContent.value === "" ||
    !targetContent.startsWith(displayedThinkingContent.value);

  if (shouldRestartAnimation) {
    displayedThinkingContent.value = "";
    isThinkingAnimating.value = true;

    // 清除之前的計時器
    if (thinkingAnimationTimer.value) {
      clearTimeout(thinkingAnimationTimer.value);
    }

    console.log("🧠 開始思考內容動畫，目標長度:", targetContent.length);

    // 逐字符添加新內容
    const addNextChar = () => {
      if (displayedThinkingContent.value.length < targetContent.length) {
        displayedThinkingContent.value = targetContent.substring(
          0,
          displayedThinkingContent.value.length + 1
        );

        // 繼續添加下一個字符，使用較快的速度
        thinkingAnimationTimer.value = setTimeout(addNextChar, 15); // 15ms 間隔，更快的動畫
      } else {
        // 動畫完成
        isThinkingAnimating.value = false;
        console.log("🧠 思考內容動畫完成");
      }
    };

    addNextChar();
  } else {
    // 如果是增量更新，直接更新到目標內容
    displayedThinkingContent.value = targetContent;
  }
};

/**
 * 錯誤消息檢測
 * @description 判斷當前消息是否為錯誤消息，用於應用錯誤樣式
 * @returns {boolean} 如果是錯誤消息則返回 true
 * @computed
 */
const isErrorMessage = computed(() => {
  if (!props.message) return false;

  const content = props.message.content || "";

  // 優先檢查各種錯誤標記
  const hasErrorFlag =
    props.message.isError ||
    props.message.error ||
    (props.message.metadata && props.message.metadata.error);

  // 優先檢查錯誤標記
  if (hasErrorFlag) {
    // console.log("✅ 通過錯誤標記檢測");
    return true;
  }

  // console.log("❌ 未檢測到錯誤");
  return false;
});

const getQuotePreview = (content) => {
  return content.length > 100 ? content.substring(0, 100) + "..." : content;
};

const getModelColor = (provider) => {
  // console.log("🔍 [MessageBubble] getModelColor:", provider);
  const colors = {
    ollama: "green",
    gemini: "blue",
    openai: "purple",
    claude: "orange",
  };
  return colors[provider] || "default";
};

/**
 * ====== 事件處理方法 ======
 * @description 處理用戶交互和組件內部事件的方法集合
 */

/**
 * 複製消息內容到剪貼板
 * @description 將當前消息的文本內容複製到系統剪貼板
 * @async
 * @function
 * @throws {Error} 當剪貼板操作失敗時拋出錯誤
 */
const handleCopyMessage = async () => {
  try {
    await navigator.clipboard.writeText(props.message.content);
    antMessage.success("消息已複製到剪貼板");
  } catch (error) {
    antMessage.error("複製失敗");
    console.error("複製失敗:", error);
  }
};

const handleRegenerateResponse = () => {
  emit("regenerate-response", props.message);
  antMessage.info("重新生成功能開發中");
};

const handleQuoteMessage = () => {
  emit("quote-message", props.message);
  antMessage.success("消息已引用");
};

// 🎬 切換內容動畫效果
const toggleContentAnimation = () => {
  enableContentAnimation.value = !enableContentAnimation.value;
  antMessage.info(
    enableContentAnimation.value ? "動畫效果已開啟" : "動畫效果已關閉"
  );
};

const handleDeleteMessage = async () => {
  try {
    await chatStore.handleDeleteMessage(props.message.id);
    antMessage.success("消息已刪除");
  } catch (error) {
    antMessage.error("刪除失敗");
    console.error("刪除失敗:", error);
  }
};

const handleViewAttachment = (attachment) => {
  // 處理附件查看邏輯
  const isImage =
    attachment.file_type === "image" ||
    attachment.mime_type?.startsWith("image/");

  if (isImage) {
    // 構建圖片預覽URL
    const imageUrl = getFilePreviewUrl(attachment.id);
    window.open(imageUrl, "_blank");
  } else {
    // 下載文件
    const downloadUrl = getFilePreviewUrl(attachment.id);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = attachment.filename || attachment.name;
    link.click();
  }
};

// 處理總結關鍵要點
const handleSummarizeFile = async (attachment) => {
  try {
    // 防止事件冒泡
    event?.stopPropagation();

    const chatStore = useChatStore();
    const loadingMessage = antMessage.loading("正在分析檔案內容...", 0);

    // 向 AI 發送總結檔案的請求
    await chatStore.sendMessage(
      `請總結這個檔案的關鍵要點：${attachment.filename}`,
      {
        attachments: [attachment],
      }
    );

    loadingMessage();
  } catch (error) {
    console.error("總結檔案失敗:", error);
    antMessage.error("總結檔案失敗，請稍後再試");
  }
};

// 處理生成文件
const handleGenerateDocument = async (attachment) => {
  try {
    // 防止事件冒泡
    event?.stopPropagation();

    const chatStore = useChatStore();
    const loadingMessage = antMessage.loading("正在生成文件...", 0);

    // 向 AI 發送生成文件的請求
    await chatStore.sendMessage(
      `請根據這個檔案的內容生成一份完整的文件：${attachment.filename}`,
      {
        attachments: [attachment],
      }
    );

    loadingMessage();
  } catch (error) {
    console.error("生成文件失敗:", error);
    antMessage.error("生成文件失敗，請稍後再試");
  }
};

// 檔案處理函數 - PDF
const handleExtractPdfText = (attachment) => {
  const text = `請提取這個 PDF 檔案中的所有文字內容：${attachment.filename}`;
  emit("send-message", text);
};

const handleSummarizePdf = (attachment) => {
  const text = `請分析並總結這個 PDF 檔案的主要內容和重點：${attachment.filename}`;
  emit("send-message", text);
};

// 檔案處理函數 - Word
const handleAnalyzeWord = (attachment) => {
  const text = `請深度分析這個 Word 文檔的結構、內容和重點：${attachment.filename}`;
  emit("send-message", text);
};

const handleFormatWord = (attachment) => {
  const text = `請整理這個 Word 文檔的格式，提供標準化排版建議：${attachment.filename}`;
  emit("send-message", text);
};

// 檔案處理函數 - CSV
const handleAnalyzeCsv = (attachment) => {
  const text = `請分析這個 CSV 數據檔案，提供統計摘要和洞察：${attachment.filename}`;
  emit("send-message", text);
};

const handleGenerateChartFromFile = (attachment) => {
  const text = `請分析這個 CSV 數據並建議適合的圖表類型，提供視覺化方案：${attachment.filename}`;
  emit("send-message", text);
};

// 檔案處理函數 - 通用檔案分析 (已有原始函數，這裡不重複)

// 🎯 圖表檢測和生成功能
const detectChartsInMessage = async () => {
  // TODO: 先關閉圖表檢查
  return;
  console.log("🎯 [MessageBubble] 開始圖表檢測:", {
    messageId: props.message.id,
    role: props.message.role,
    hasContent: !!props.message.content,
    hasToolCalls: effectiveToolCalls.value.length > 0,
    isStreaming: isMessageStreaming.value,
    content: props.message.content?.substring(0, 100) + "...",
  });

  if (props.message.role !== "assistant" || !props.message.content) {
    console.log("🎯 [MessageBubble] 跳過檢測 - 不符合條件:", {
      role: props.message.role,
      hasContent: !!props.message.content,
    });
    return;
  }

  // 跳過圖表消息的檢測
  if (props.message.metadata?.isChartMessage) {
    console.log("🎯 [MessageBubble] 跳過圖表消息的檢測");
    return;
  }

  // 🎯 優先檢查 MCP 工具圖表
  if (hasMcpDetectedChart.value) {
    console.log("🎯 [MessageBubble] ✅ MCP 工具已創建圖表，跳過所有檢測");
    showChartSuggestion.value = false; // MCP 工具已創建圖表，不需要建議
    return;
  }

  // 🎯 檢查後端智能檢測結果
  if (hasBackendDetectedChart.value) {
    console.log("🎯 [MessageBubble] ✅ 後端智能檢測已生成圖表，跳過前端檢測");
    showChartSuggestion.value = false; // 後端已顯示圖表，不需要建議
    return;
  }

  // 🎯 檢查前端檢測是否啟用
  if (!frontendChartDetectionEnabled.value) {
    console.log("🎯 [MessageBubble] 前端圖表檢測已禁用，跳過檢測");
    showChartSuggestion.value = false;
    return;
  }

  console.log("🎯 [MessageBubble] 後端未檢測到圖表，啟用前端檢測作為備用...");

  // 🔍 直接測試 conversationDataExtractor
  console.log("🔍 [MessageBubble] 直接測試 conversationDataExtractor:");
  try {
    const { conversationDataExtractor } = await import(
      "@/utils/conversationDataExtractor.js"
    );
    const directResult = conversationDataExtractor.extractData(
      props.message.content
    );
    console.log(
      "🔍 [MessageBubble] conversationDataExtractor 直接結果:",
      directResult
    );
  } catch (directError) {
    console.error(
      "🔍 [MessageBubble] conversationDataExtractor 直接錯誤:",
      directError
    );
  }

  isDetectingCharts.value = true;
  chartDetectionError.value = null;

  try {
    console.log("🎯 [MessageBubble] 開始檢測統計工具結果...");
    // 檢測統計工具結果
    const statisticalCharts = await detectStatisticalCharts();
    console.log("🎯 [MessageBubble] 統計工具檢測結果:", statisticalCharts);

    console.log("🎯 [MessageBubble] 開始檢測對話數據...");
    // 檢測對話內容中的數據
    const conversationCharts = await detectConversationCharts();
    console.log("🎯 [MessageBubble] 對話數據檢測結果:", conversationCharts);

    // 合併所有檢測結果
    const allCharts = [...statisticalCharts, ...conversationCharts];
    console.log("🎯 [MessageBubble] 所有檢測結果:", allCharts);

    if (allCharts.length > 0) {
      detectedCharts.value = allCharts;
      showChartSuggestion.value = true;
      console.log("🎯 [MessageBubble] ✅ 前端檢測到圖表機會，顯示建議");
    } else {
      showChartSuggestion.value = false;
      // 🎯 區分情況：如果後端已經有圖表，就不顯示錯誤
      if (hasBackendDetectedChart.value) {
        console.log(
          "🎯 [MessageBubble] ℹ️ 前端未檢測到圖表，但後端已提供智能檢測結果"
        );
      } else {
        console.log(
          "🎯 [MessageBubble] ❌ 前端檢測未找到圖表機會，後端也無檢測結果"
        );
      }
    }
  } catch (error) {
    console.error("🎯 [MessageBubble] 圖表檢測錯誤:", error);
    chartDetectionError.value = error.message;
    showChartSuggestion.value = false;
  } finally {
    isDetectingCharts.value = false;
  }
};

// 檢測統計工具調用結果
const detectStatisticalCharts = async () => {
  const charts = [];

  for (const toolCall of effectiveToolCalls.value) {
    if (toolCall.success && toolCall.result) {
      try {
        const chartData = await mcpStatisticalAdapter.convertToChartData(
          toolCall.result,
          toolCall.name
        );

        if (chartData) {
          charts.push({
            source: "mcp-statistical",
            type: chartData.recommendedType,
            data: chartData.data,
            title: chartData.title,
            description: chartData.description,
            confidence: 0.9,
            toolCall: toolCall,
          });
        }
      } catch (error) {
        console.warn("🎯 [MessageBubble] 統計工具轉換失敗:", error);
      }
    }
  }

  return charts;
};

// 檢測對話內容中的數據
const detectConversationCharts = async () => {
  try {
    console.log(
      "🎯 [MessageBubble] 調用 chartIntegrationService.processData:",
      {
        content: props.message.content?.substring(0, 200) + "...",
        contentLength: props.message.content?.length,
      }
    );

    const result = await chartIntegrationService.processData({
      source: "conversation",
      data: props.message.content,
      options: {},
    });

    console.log("🎯 [MessageBubble] chartIntegrationService 返回結果:", {
      success: result.success,
      hasCharts: !!result.charts,
      chartsLength: result.charts?.length,
      errors: result.errors,
      errorDetails: result.errors?.map((e) => ({
        type: e.type,
        message: e.message,
      })),
      metadata: result.metadata,
    });

    // 🔍 詳細錯誤信息
    if (result.errors?.length > 0) {
      console.error("🎯 [MessageBubble] 詳細錯誤信息:");
      console.error("🎯 [MessageBubble] 原始錯誤數組:", result.errors);
      result.errors.forEach((error, index) => {
        console.error(`  錯誤 ${index + 1}:`, error);
        console.error(`  錯誤詳情 ${index + 1}:`, {
          type: error?.type,
          message: error?.message,
          details: error?.details,
          stack: error?.stack,
          fullError: error,
        });
      });
    }

    if (result.success && result.charts?.length > 0) {
      // 導入 chartService 來生成完整的 ECharts 配置
      const { default: chartService } = await import(
        "@/services/chartService.js"
      );

      const charts = await Promise.all(
        result.charts.map(async (chart) => {
          try {
            // 使用 chartService 生成完整的 ECharts 配置
            const chartConfig = await chartService.generateChart({
              data: chart.data,
              chartType: chart.type || chart.chartType || "pie",
              config: {
                title: chart.title,
                description: chart.description,
              },
            });

            console.log("🎯 [MessageBubble] 生成完整圖表配置:", {
              hasOption: !!chartConfig.option,
              hasData: !!chart.data,
              dataKeys: chart.data ? Object.keys(chart.data) : null,
            });

            return {
              source: "conversation",
              type: chart.type || chart.chartType,
              data: chart.data,
              title: chart.title,
              description: chart.description,
              confidence: result.metadata?.confidence || 0.7,
              // 添加 ECharts 配置
              option: chartConfig.option,
              chartType: chart.type || chart.chartType,
              suggestions: chartConfig.suggestions || [],
              tableData: chartConfig.tableData || [],
              tableColumns: chartConfig.tableColumns || [],
            };
          } catch (error) {
            console.error("🎯 [MessageBubble] 生成圖表配置失敗:", error);
            return {
              source: "conversation",
              type: chart.type || chart.chartType,
              data: chart.data,
              title: chart.title,
              description: chart.description,
              confidence: result.metadata?.confidence || 0.7,
            };
          }
        })
      );

      console.log("🎯 [MessageBubble] 構建對話圖表數據:", charts);
      return charts;
    } else {
      console.log("🎯 [MessageBubble] 無法構建圖表:", {
        success: result.success,
        hasCharts: !!result.charts,
        chartsLength: result.charts?.length,
        errors: result.errors,
      });
    }
  } catch (error) {
    console.warn("🎯 [MessageBubble] 對話數據檢測失敗:", error);
  }

  return [];
};

// 生成圖表
const handleGenerateChart = async (chartData) => {
  try {
    console.log("🎯 [MessageBubble] 生成圖表:", {
      chartData,
      hasTitle: !!chartData.title,
      hasType: !!chartData.type,
      hasData: !!chartData.data,
      keys: Object.keys(chartData || {}),
    });

    // 這裡可以觸發圖表生成事件，或者直接在當前消息中嵌入圖表
    // 暫時先隱藏建議
    showChartSuggestion.value = false;

    // 觸發事件給父組件處理
    emit("generate-chart", {
      messageId: props.message.id,
      chartData: chartData,
    });
  } catch (error) {
    console.error("🎯 [MessageBubble] 圖表生成失敗:", error);
    chartDetectionError.value = error.message;
  }
};

// 忽略圖表建議
const handleDismissChartSuggestion = () => {
  showChartSuggestion.value = false;
  detectedCharts.value = [];
};

// 🎯 處理圖表確認
const handleConfirmChart = async (confirmed) => {
  if (!confirmed) {
    // 用戶拒絕，隱藏確認UI（通過更新message metadata）
    if (props.message.metadata?.chart_detection) {
      props.message.metadata.chart_detection.needsConfirmation = false;
      props.message.metadata.chart_detection.userRejected = true;
    }
    antMessage.info("已取消圖表生成");
    return;
  }

  try {
    isGeneratingChart.value = true;

    // 用戶確認，觸發圖表生成
    const chartData = backendChartDetection.value;

    // 準備請求參數
    const requestData = {
      conversationId: chatStore.currentConversationId,
      messageId: props.message.id,
      userInput: props.message.quoted_message?.content || "請製作圖表",
      aiResponse: props.message.content,
      chartData: {
        data: chartData.data,
        chartType: chartData.chartType,
        title: chartData.title,
        confidence: chartData.confidence,
      },
    };

    console.log("🎯 [MessageBubble] 發送圖表生成請求:", requestData);

    // 調用圖表生成API
    const response = await fetch("/api/chat/generate-chart", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      throw new Error(`API錯誤: ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      // 更新消息，隱藏確認UI並顯示生成的圖表
      if (props.message.metadata?.chart_detection) {
        props.message.metadata.chart_detection.needsConfirmation = false;
        props.message.metadata.chart_detection.userConfirmed = true;
        // 更新為高信心度以觸發圖表顯示
        props.message.metadata.chart_detection.confidence = 1.0;
      }

      antMessage.success("圖表生成成功！");
      console.log("🎯 [MessageBubble] 圖表生成成功:", result);
    } else {
      throw new Error(result.message || "圖表生成失敗");
    }
  } catch (error) {
    console.error("🎯 [MessageBubble] 圖表生成失敗:", error);
    antMessage.error(`圖表生成失敗: ${error.message}`);
  } finally {
    isGeneratingChart.value = false;
  }
};

// 監聽消息變化，自動檢測圖表機會
watch(
  () => [props.message.content, effectiveToolCalls.value.length],
  async ([newContent, newToolCallCount], [oldContent, oldToolCallCount]) => {
    // 只在內容穩定且非流式狀態時檢測
    if (newContent !== oldContent || newToolCallCount !== oldToolCallCount) {
      if (!isMessageStreaming.value && props.message.role === "assistant") {
        // 延遲檢測，確保內容已經完全載入
        setTimeout(() => {
          if (!isMessageStreaming.value) {
            detectChartsInMessage();
          }
        }, 1000);
      }
    }
  },
  { immediate: false }
);

// MCP 錯誤處理方法

const handleRetryMcpTool = async (mcpError) => {
  try {
    // 顯示重試開始提示
    antMessage.info(`正在重試 ${mcpError.tool_name}，請稍候...`);

    // 根據失敗的工具名稱構建重試消息
    let retryContent = "";
    const toolName = mcpError.tool_name;

    // 根據工具類型生成適當的重試請求
    if (toolName.includes("scatter") || toolName.includes("chart")) {
      retryContent = "請重新嘗試生成散點圖，使用可用的數據庫連接。";
    } else if (toolName.includes("sql") || toolName.includes("query")) {
      retryContent = "請重新執行 SQL 查詢，確保數據庫連接正常。";
    } else if (toolName.includes("data") || toolName.includes("fetch")) {
      retryContent = "請重新獲取數據，檢查數據源連接狀態。";
    } else {
      retryContent = `請重新嘗試執行 ${toolName} 工具，確保相關服務正常運行。`;
    }

    // 發送重試消息
    await chatStore.sendMessage(retryContent, {
      metadata: {
        isRetry: true,
        originalToolName: toolName,
        originalError: mcpError.error,
        retryTimestamp: Date.now(),
      },
    });

    // 標記該錯誤為已重試
    mcpError.retried = true;
    mcpError.retryTimestamp = Date.now();

    console.log("MCP 工具重試已發送:", {
      toolName,
      retryContent,
      originalError: mcpError.error,
    });
  } catch (error) {
    console.error("重試 MCP 工具失敗:", error);
    antMessage.error(`重試 ${mcpError.tool_name} 失敗，請稍後再試`);
  }
};

// 組件掛載時檢測
onMounted(() => {
  // 對於已完成的消息，立即檢測
  if (!isMessageStreaming.value && props.message.role === "assistant") {
    nextTick(() => {
      detectChartsInMessage();
    });
  }
});
</script>

<style scoped>
.message-bubble {
  margin-bottom: 16px;
  /* padding: 12px 16px; */
  padding: 6px 8px;
  border-radius: 12px;
  position: relative;
  max-width: 80%;
  word-wrap: break-word;
  font-size: var(--chat-font-size, 14px);
}

.user-message {
  background: var(--custom-bg-tertiary);
  color: var(--custom-text-primary);
  margin-left: auto;
  border-bottom-right-radius: 4px;
  border: 1px solid var(--custom-border-primary);
}

.ai-message {
  background: transparent;
  border: none;
  margin-right: auto;
  border-bottom-left-radius: 4px;
  position: relative;
  padding-bottom: 40px; /* 為工具欄留出空間 */
  color: var(--custom-text-primary);
  width: 80%;
}

/* 確保 AI 訊息在錯誤狀態下樣式優先級正確 */
.ai-message.error-message {
  background: var(--error-bg-color, #fff2f0) !important;
  border: 1px solid var(--error-color, #ff4d4f) !important;
  border-radius: 8px !important;
  padding: 12px !important;
  margin-bottom: 16px !important;
  color: var(--error-color, #ff4d4f) !important;
}

.system-message {
  background: #fff7e6;
  border: 1px solid #ffd591;
  margin: 0 auto;
  text-align: center;
  max-width: 60%;
}

/* 錯誤訊息樣式 - 最高優先級 */
.message-bubble.error-message {
  background: var(--error-bg-color, #fff2f0) !important;
  border: 1px solid var(--error-color, #ff4d4f) !important;
  border-radius: 8px !important;
  padding: 6px !important;
  margin-bottom: 16px !important;
  height: 40px;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
}

.message-bubble.error-message .message-content {
  background: transparent !important;
  color: var(--error-color, #ff4d4f) !important;
}

.message-bubble.error-message .code-highlight-container {
  background: var(--error-bg-color, #fff2f0) !important;
  border: none !important;
  border-radius: 4px !important;
}

.message-bubble.error-message .markdown-content {
  background: var(--error-bg-color, #fff2f0) !important;
  color: var(--error-color, #ff4d4f) !important;
}

/* 錯誤訊息中的 CodeHighlight 組件樣式 */
.message-bubble.error-message :deep(.code-highlight-container) {
  background: var(--error-bg-color, #fff2f0) !important;
  border: 1px solid var(--error-color, #ff4d4f) !important;
  border-radius: 4px !important;
}

.message-bubble.error-message :deep(.markdown-content) {
  background: var(--error-bg-color, #fff2f0) !important;
  color: var(--error-color, #ff4d4f) !important;
}

.message-bubble.error-message :deep(.hljs) {
  background: var(--error-bg-color, #fff2f0) !important;
  color: var(--error-color, #ff4d4f) !important;
}

/* 串流狀態的錯誤訊息 */
.message-bubble.error-message .streaming-indicator {
  background: var(--error-bg-color, #fff2f0) !important;
  border: 1px solid var(--error-color, #ff4d4f) !important;
  color: var(--error-color, #ff4d4f) !important;
}

/* 確保錯誤訊息在串流時也能正確顯示 */
.message-bubble.error-message .empty-content {
  background: var(--error-bg-color, #fff2f0) !important;
  color: var(--error-color, #ff4d4f) !important;
  padding: 12px !important;
  border-radius: 4px !important;
}

/* 頭像和消息信息樣式已移動到對應組件中 */

/* 消息信息樣式已移動到 MessageInfo 組件中 */

.message-actions {
  opacity: 0;
  transition: opacity 0.3s ease;
  position: absolute;
  bottom: -35px;
  right: -10px;
  display: flex;
  gap: 4px;
  background: var(--custom-bg-secondary);
  border: 1px solid var(--custom-border-primary);
  border-radius: 6px;
  padding: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.message-bubble:hover .message-actions {
  opacity: 1;
}

/* 系統消息工具欄居中 */
.system-message .message-actions {
  left: 50%;
  transform: translateX(-50%);
}

.user-message .message-actions :deep(.ant-btn) {
  color: var(--custom-text-secondary);
}

.user-message .message-actions :deep(.ant-btn:hover) {
  color: var(--custom-text-primary);
  background: var(--custom-bg-secondary);
}

.message-content {
  line-height: 1.6;
  position: relative;
}

.quoted-message {
  background: rgba(0, 0, 0, 0.05);
  border-left: 3px solid #1890ff;
  padding: 8px 12px;
  margin-bottom: 8px;
  border-radius: 4px;
}

.user-message .quoted-message {
  background: var(--custom-bg-secondary);
  border-left-color: var(--primary-color);
}

.quote-header {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 4px;
  opacity: 0.8;
}

.quote-content {
  font-size: 13px;
  opacity: 0.9;
}

.message-text {
  font-size: var(--chat-font-size, 14px);
  line-height: 1.6;
}

.plain-text {
  white-space: pre-wrap;
  transition: max-height 0.3s ease-in-out;
  overflow: hidden;
}

.plain-text.collapsed {
  max-height: 9em; /* 約6行文字的高度 */
  position: relative;
}

.plain-text.collapsed::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2em;
  background: linear-gradient(transparent, var(--custom-bg-tertiary));
  pointer-events: none;
}

.user-message .plain-text.collapsed::after {
  background: linear-gradient(transparent, var(--custom-bg-tertiary));
}

.expand-button-container {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}

.expand-button {
  padding: 4px 8px !important;
  height: auto !important;
  font-size: 12px;
  color: var(--custom-text-secondary) !important;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.expand-button:hover {
  background: var(--custom-bg-secondary) !important;
  color: var(--primary-color) !important;
}

.user-message .expand-button {
  color: var(--custom-text-secondary) !important;
}

.user-message .expand-button:hover {
  color: var(--primary-color) !important;
  background: var(--custom-bg-secondary) !important;
}

/* 錯誤訊息特定樣式 */
.error-text {
  font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
  font-size: 13px;
  background: transparent !important;
  color: inherit !important;
  padding: 0 !important;
  border: none !important;
  border-radius: 0 !important;
}

.message-attachments {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 附件相關樣式移至 MessageAttachments 組件 */

/* 思考過程樣式移至 ThinkingProcess 組件 */

.model-info {
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  border-top: 1px solid var(--custom-border-primary);
}

.model-info-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.model-info-actions {
  flex: 1;
  opacity: 1;
  display: flex;
  gap: 4px;
  padding: 6px;
}

/* 移除 hover 效果，工具欄直接顯示 */

.token-usage {
  opacity: 0.7;
}

.ai-message-toolbar {
  margin-top: 8px;
  padding: 6px 0;
  display: flex;
  gap: 4px;
  opacity: 1;
  background: transparent;
  border: none;
  justify-content: flex-start;
}

/* 移除 hover 效果，工具欄直接顯示 */

.toolbar-btn {
  width: 28px !important;
  height: 28px !important;
  padding: 0 !important;
  border-radius: 4px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  color: var(--custom-text-secondary) !important;
  transition: all 0.2s ease !important;
  background: transparent !important;
  border: none !important;
}

.toolbar-btn:hover {
  background: var(--primary-color) !important;
  color: white !important;
  transform: scale(1.05);
}

.toolbar-btn:active {
  transform: scale(0.95);
}

.message-status {
  position: absolute;
  bottom: 4px;
  right: 8px;
  font-size: 12px;
}

.status-sent {
  color: #52c41a;
}

.status-error {
  color: #ff4d4f;
}

.danger-item {
  color: #ff4d4f !important;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .message-bubble {
    max-width: 90%;
    padding: 10px 12px;
  }

  /* 響應式頭像樣式已移動到 MessageHeader 組件中 */
}

/* 圖表建議樣式移至 ChartSuggestion 組件 */

/* 圖表顯示相關樣式移至 ChartDisplay 組件 */

/* 圖表確認樣式移至 ChartConfirmation 組件 */

/* 🔧 工具 Summary 顯示樣式 */
.tool-summaries-section {
  margin-bottom: 16px;
}

.tool-summary-item {
  margin-bottom: 12px;
  padding: 12px;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 8px;
}

.tool-summary-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 500;
  color: #389e0d;
}

.tool-summary-title {
  font-size: 14px;
}

.tool-summary-content {
  color: #262626;
  font-size: 14px;
  line-height: 1.6;
  background: white;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid #d9f7be;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

/* 🔧 Summary 模式標識樣式 */
.summary-mode-indicator {
  margin-bottom: 12px;
}

.summary-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: linear-gradient(
    135deg,
    rgba(82, 196, 26, 0.1),
    rgba(135, 208, 104, 0.1)
  );
  border: 1px solid rgba(82, 196, 26, 0.3);
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  color: #52c41a;
  box-shadow: 0 2px 4px rgba(82, 196, 26, 0.1);
}

.summary-badge .info-icon {
  font-size: 12px;
  color: rgba(82, 196, 26, 0.7);
  cursor: help;
}

.summary-badge .info-icon:hover {
  color: #52c41a;
}

/* 暗黑模式下的 Summary 模式樣式 */
:root[data-theme="dark"] .summary-badge {
  background: linear-gradient(
    135deg,
    rgba(135, 208, 104, 0.15),
    rgba(183, 235, 143, 0.15)
  );
  border-color: rgba(135, 208, 104, 0.4);
  color: #95de64;
  box-shadow: 0 2px 4px rgba(135, 208, 104, 0.15);
}

:root[data-theme="dark"] .summary-badge .info-icon {
  color: rgba(135, 208, 104, 0.8);
}

:root[data-theme="dark"] .summary-badge .info-icon:hover {
  color: #95de64;
}

/* 暗黑模式下的工具 Summary 樣式 */
:root[data-theme="dark"] .tool-summary-item {
  background: #162312;
  border-color: #274916;
}

:root[data-theme="dark"] .tool-summary-header {
  color: #95de64;
}

:root[data-theme="dark"] .tool-summary-content {
  background: #1f1f1f;
  border-color: #274916;
  color: #d9d9d9;
}

/* 🎬 動畫按鈕樣式 */
.animation-active {
  color: #1890ff !important;
  background-color: rgba(24, 144, 255, 0.1) !important;
}

.animation-active:hover {
  background-color: rgba(24, 144, 255, 0.2) !important;
}

.animation-active svg {
  animation: sparkle 2s ease-in-out infinite;
}

@keyframes sparkle {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

/* 暗色主題適配 */
:root[data-theme="dark"] .animation-active {
  color: #177ddc !important;
  background-color: rgba(23, 125, 220, 0.1) !important;
}

:root[data-theme="dark"] .animation-active:hover {
  background-color: rgba(23, 125, 220, 0.2) !important;
}
</style>

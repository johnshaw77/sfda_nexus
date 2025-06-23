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
    <div class="message-header">
      <div class="message-avatar">
        <!-- 用戶頭像 -->
        <a-avatar
          v-if="message.role === 'user'"
          :size="32"
          :src="authStore.user?.avatar"
          :style="{
            backgroundColor: authStore.user?.avatar ? 'transparent' : '#1890ff',
          }">
          <UserOutlined v-if="!authStore.user?.avatar" />
        </a-avatar>

        <!-- AI智能體頭像 -->
        <div
          v-else-if="message.role === 'assistant'"
          class="agent-avatar-wrapper">
          <!-- 如果智能體有 base64 avatar，顯示圖片 -->
          <a-avatar
            v-if="
              currentAgentAvatar &&
              typeof currentAgentAvatar === 'string' &&
              currentAgentAvatar.startsWith('data:')
            "
            :size="32"
            :src="currentAgentAvatar"
            class="agent-avatar-image" />
          <!-- 如果智能體有頭像配置但不是圖片，使用漸變背景 -->
          <a-avatar
            v-else-if="
              currentAgentAvatar && typeof currentAgentAvatar === 'object'
            "
            :size="32"
            :style="{
              backgroundColor: 'transparent',
              background:
                currentAgentAvatar.gradient ||
                currentAgentAvatar.background ||
                '#52c41a',
            }"
            class="agent-avatar-bg">
            <!-- 如果有自定義圖標 -->
            <svg
              v-if="currentAgentAvatar.icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor">
              <path :d="currentAgentAvatar.icon" />
            </svg>
            <!-- 沒有自定義圖標使用默認 -->
            <RobotOutlined v-else />
          </a-avatar>
          <!-- 沒有頭像配置時使用默認 -->
          <a-avatar
            v-else
            :size="32"
            :style="{ backgroundColor: '#52c41a' }">
            <RobotOutlined />
          </a-avatar>
        </div>

        <!-- 系統消息頭像 -->
        <a-avatar
          v-else
          :size="32"
          :style="{ backgroundColor: '#faad14' }">
          <InfoCircleOutlined />
        </a-avatar>
      </div>
      <div class="message-info">
        <div class="message-sender">
          {{ getSenderName() }}
        </div>
        <div class="message-time">
          {{ formatMessageTime(message.created_at) }}
        </div>
      </div>
    </div>

    <!-- 消息內容 TODO: 做TEST-->
    <div class="message-content">
      <!-- 引用的消息 -->
      <div
        v-if="message.quoted_message"
        class="quoted-message">
        <div class="quote-header">
          <UserOutlined v-if="message.quoted_message.role === 'user'" />
          <RobotOutlined v-else />
          <span>{{
            message.quoted_message.role === "user"
              ? "用戶"
              : message.quoted_message.agent_name ||
                agentsStore.getCurrentAgent?.display_name ||
                agentsStore.getCurrentAgent?.name ||
                "AI助手"
          }}</span>
        </div>
        <div class="quote-content">
          {{ getQuotePreview(message.quoted_message.content) }}
        </div>
      </div>

      <!-- 工具調用結果顯示 - 移到最終回應內容之前 -->
      <div
        v-if="message.role === 'assistant' && effectiveToolCalls.length > 0"
        class="tool-calls-section">
        <div
          class="tool-calls-header"
          @click="toggleToolCallsCollapse"
          style="cursor: pointer">
          <div class="tool-calls-header-left">
            <ToolOutlined />
            <span>工具調用 ({{ effectiveToolCalls.length }})</span>
          </div>
          <div class="tool-calls-header-right">
            <DownOutlined
              :class="['collapse-icon', { collapsed: toolCallsCollapsed }]" />
          </div>
        </div>
        <div
          v-show="!toolCallsCollapsed"
          class="tool-calls-list">
          <ToolCallDisplay
            v-for="(toolCall, index) in effectiveToolCalls"
            :key="index"
            :tool-call="toolCall" />
        </div>
      </div>

      <!-- 思考過程顯示 -->
      <div
        v-if="message.role === 'assistant' && getThinkingContent()"
        class="thinking-section">
        <div
          class="thinking-header"
          @click="toggleThinkingCollapse"
          style="cursor: pointer">
          <div class="thinking-header-left">
            <BulbOutlined />
            <span>思考過程</span>
            <span
              v-if="isMessageStreaming || isThinkingAnimating"
              class="thinking-indicator">
              <LoadingOutlined spin />
              <span class="thinking-status">
                {{ isThinkingAnimating ? "思考中..." : "生成中..." }}
              </span>
            </span>
          </div>
          <div class="thinking-header-right">
            <DownOutlined
              :class="['collapse-icon', { collapsed: thinkingCollapsed }]" />
          </div>
        </div>
        <div
          v-show="!thinkingCollapsed"
          class="thinking-content">
          <div class="thinking-text">
            {{ displayedThinkingContent }}
            <span
              v-if="isThinkingAnimating"
              class="thinking-cursor"
              >|</span
            >
          </div>
        </div>
      </div>

      <!-- 🔧 新增：工具處理狀態顯示 -->
      <div
        v-if="message.role === 'assistant' && message.isProcessingTools"
        class="tool-processing-section">
        <div class="tool-processing-header">
          <ToolOutlined />
          <span>{{
            message.toolProcessingMessage || "正在檢查並處理工具調用..."
          }}</span>
          <LoadingOutlined
            spin
            class="processing-spinner" />
        </div>
      </div>

      <!-- 🚀 新增：二次調用優化狀態顯示 -->
      <div
        v-if="message.role === 'assistant' && message.isOptimizing"
        class="optimizing-section">
        <div class="optimizing-header">
          <BulbOutlined />
          <span>{{ message.optimizingMessage || "正在優化回應內容..." }}</span>
          <LoadingOutlined
            spin
            class="processing-spinner" />
        </div>
      </div>

      <!-- 🔧 新增：工具處理錯誤顯示 -->
      <div
        v-if="message.role === 'assistant' && message.toolProcessingError"
        class="tool-processing-error">
        <ExclamationCircleOutlined />
        <span>{{ message.toolProcessingError }}</span>
      </div>

      <!-- 🔧 附件顯示移到內容上方 -->
      <!-- 圖片縮圖顯示（僅用戶訊息） -->
      <div
        v-if="message.role === 'user' && imageAttachments.length > 0"
        class="message-image-thumbnails">
        <div
          v-for="attachment in imageAttachments"
          :key="attachment.id"
          class="image-thumbnail-item"
          @click="handleViewAttachment(attachment)">
          <img
            :src="getImageSrc(attachment.id)"
            :alt="attachment.filename || attachment.name"
            class="thumbnail-image"
            @error="handleImageError" />
          <div class="image-overlay">
            <div class="image-filename">
              {{ attachment.filename || attachment.name }}
            </div>
            <div class="zoom-icon">
              <EyeOutlined />
            </div>
          </div>
        </div>
      </div>

      <!-- 非圖片附件列表或AI消息的所有附件 -->
      <div
        v-if="
          message.attachments &&
          (message.role === 'assistant' || nonImageAttachments.length > 0)
        "
        class="message-attachments">
        <div
          v-for="attachment in message.role === 'assistant'
            ? message.attachments
            : nonImageAttachments"
          :key="attachment.id"
          class="attachment-item">
          <div class="attachment-card">
            <div class="attachment-icon-container">
              <div class="attachment-icon">
                <component
                  :is="getFileIcon(attachment)"
                  :style="{ color: getFileTypeColor(attachment) }" />
              </div>
            </div>
            <div class="attachment-info">
              <div class="attachment-filename">
                {{ attachment.filename || attachment.name }}
              </div>
              <div class="attachment-meta">
                <span class="attachment-size">
                  {{ getFileTypeLabel(attachment) }}
                  {{ formatFileSize(attachment.file_size || attachment.size) }}
                </span>
              </div>
            </div>
          </div>

          <!-- 🔧 移除用戶訊息的快速命令按鈕，減少視覺干擾 -->
          <!-- 檔案操作按鈕已隱藏，不再顯示快速命令 -->
        </div>
      </div>

      <!-- 主要內容 -->
      <div class="message-text">
        <!-- AI 消息 - 錯誤訊息使用純文本顯示 -->
        <div
          v-if="message.role === 'assistant' && isErrorMessage"
          class="plain-text error-text">
          {{ message.content }}
        </div>
        <!-- AI 消息 - 使用 CodeHighlight 組件 -->
        <CodeHighlight
          v-else-if="message.role === 'assistant' && !isChartMessage"
          :content="message.content"
          :is-streaming="message.isStreaming"
          :enable-keyword-highlight="true"
          theme="auto"
          :debug="false"
          :realtime-render="configStore.chatSettings.useRealtimeRender"
          ref="codeHighlightRef" />
        <!-- 純文本（用戶消息） -->
        <div
          v-else
          class="plain-text"
          :class="{
            collapsed: isUserMessageCollapsed && shouldShowExpandButton,
          }"
          ref="userMessageContent">
          {{ message.content }}
        </div>
        <!-- 展開/收起按鈕（用戶消息） -->
        <div
          v-if="message.role === 'user' && shouldShowExpandButton"
          class="expand-button-container">
          <a-button
            type="link"
            size="small"
            @click="toggleUserMessageExpand"
            class="expand-button">
            <template #icon>
              <svg
                v-if="isUserMessageCollapsed"
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="currentColor">
                <path d="M7 14l5-5 5 5z" />
              </svg>
              <svg
                v-else
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="currentColor">
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </template>
            {{ isUserMessageCollapsed ? "展開" : "收起" }}
          </a-button>
        </div>
      </div>

      <!-- 🎯 智能圖表展示 -->
      <div
        v-if="isChartMessage && chartData"
        class="chart-message-container">
        <SmartChart
          :data="chartData.data || {}"
          :prebuilt-chart="chartData"
          :chart-type="chartData.type || chartData.chartType"
          :title="chartData.title"
          :description="chartData.description"
          :width="'100%'"
          :height="400"
          :enable-download="true"
          :enable-fullscreen="true"
          :enable-data-view="true"
          :enable-type-switch="true" />
      </div>

      <!-- AI 模型信息 - 統一顯示 -->
      <div
        v-if="message.role === 'assistant'"
        v-show="!message.isStreaming && message.status !== 'sending'"
        class="model-info">
        <!-- 工具欄放在模型信息右側 -->
        <div
          v-show="!message.isStreaming && message.status !== 'sending'"
          class="model-info-actions">
          <a-tooltip title="複製消息">
            <a-button
              type="text"
              size="small"
              @click="handleCopyMessage">
              <CopyOutlined />
            </a-button>
          </a-tooltip>

          <a-tooltip title="重新生成">
            <a-button
              type="text"
              size="small"
              @click="handleRegenerateResponse">
              <ReloadOutlined />
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

          <!-- 🎯 測試圖表檢測按鈕 -->
          <a-tooltip title="測試圖表檢測">
            <a-button
              type="text"
              size="small"
              @click="detectChartsInMessage"
              style="color: #1890ff">
              <BarChartOutlined />
            </a-button>
          </a-tooltip>
        </div>
        <div class="model-info-right">
          <span class="token-usage">
            Token: {{ message.tokens_used || 0 }}
          </span>
          <!-- <span
            class="cost-info"
            v-if="message.cost && parseFloat(message.cost) > 0">
            Cost: ${{ parseFloat(message.cost).toFixed(6) }}
          </span> -->
          <a-tag :color="getModelColor(message.model_info?.model || 'default')">
            {{ message.model_info?.model || message.model || "qwen3:8b" }}
          </a-tag>
        </div>
      </div>

      <!-- 🎯 智能檢測狀態提示（開發模式） -->
      <div
        v-if="
          message.role === 'assistant' &&
          backendChartDetection &&
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
        🔍 AI檢測到圖表意圖，但數據不足或可信度較低 ({{
          Math.round(backendChartDetection.confidence * 100)
        }}%)
      </div>

      <!-- 🎯 後端智能檢測到的圖表（自動顯示） -->
      <div
        v-if="hasBackendDetectedChart"
        class="smart-chart-section">
        <div class="smart-chart-header">
          <BarChartOutlined />
          <span>🧠 AI智能圖表分析</span>
          <div class="confidence-badge">
            可信度: {{ Math.round(backendChartDetection.confidence * 100) }}%
          </div>
        </div>
        <div class="smart-chart-content">
          <SmartChart
            :data="backendChartDetection.data"
            :chart-type="backendChartDetection.chartType"
            :title="backendChartDetection.title"
            :config="{
              height: 300,
              showActions: true,
              enableExport: true,
            }"
            class="auto-generated-chart" />
        </div>
        <div class="smart-chart-reasoning">
          <div class="reasoning-text">
            {{ backendChartDetection.reasoning }}
          </div>
        </div>
      </div>

      <!-- 🎯 智能圖表建議（手動檢測） -->
      <div
        v-if="
          showChartSuggestion &&
          detectedCharts.length > 0 &&
          !hasBackendDetectedChart
        "
        class="chart-suggestion-section">
        <div class="chart-suggestion-header">
          <BarChartOutlined />
          <span>檢測到可視化數據</span>
          <a-button
            type="text"
            size="small"
            @click="handleDismissChartSuggestion"
            class="dismiss-button">
            <span style="font-size: 12px">×</span>
          </a-button>
        </div>
        <div class="chart-suggestions">
          <div
            v-for="(chart, index) in detectedCharts.slice(0, 3)"
            :key="index"
            class="chart-suggestion-item"
            @click="handleGenerateChart(chart)">
            <div class="chart-icon">
              <BarChartOutlined v-if="chart.type === 'bar'" />
              <LineChartOutlined v-else-if="chart.type === 'line'" />
              <svg
                v-else-if="chart.type === 'pie'"
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="currentColor">
                <path
                  d="M12 2C13.1 2 14 2.9 14 4V12H22C22 17.5 17.5 22 12 22S2 17.5 2 12S6.5 2 12 2Z" />
              </svg>
              <TableOutlined v-else />
            </div>
            <div class="chart-info">
              <div class="chart-title">
                {{ chart.title || `${chart.type} 圖表` }}
              </div>
              <div class="chart-confidence">
                可信度: {{ Math.round(chart.confidence * 100) }}%
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 🎯 檢測狀態指示器 -->
      <div
        v-if="isDetectingCharts"
        class="chart-detection-status">
        <LoadingOutlined spin />
        <span>分析數據中...</span>
      </div>

      <!-- 🎯 檢測錯誤 -->
      <div
        v-if="chartDetectionError"
        class="chart-detection-error">
        <ExclamationCircleOutlined />
        <span>{{ chartDetectionError }}</span>
      </div>
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
import {
  getFilePreviewUrl,
  getImageBlobUrl,
  askFileQuestion,
} from "@/api/files";
import CodeHighlight from "@/components/common/CodeHighlight.vue";
import ToolCallDisplay from "@/components/common/ToolCallDisplay.vue";
import SmartChart from "@/components/common/SmartChart.vue";
import { chartIntegrationService } from "@/services/chartIntegrationService";
import { mcpStatisticalAdapter } from "@/utils/mcpStatisticalAdapter";
import {
  UserOutlined,
  RobotOutlined,
  InfoCircleOutlined,
  CopyOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  DownOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  QuestionCircleOutlined,
  UpOutlined,
  BulbOutlined,
  LoadingOutlined,
  ToolOutlined,
  ExclamationCircleOutlined,
  CheckOutlined,
  MessageOutlined,
  // 檔案類型圖標
  TableOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FilePptOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  AudioOutlined,
  FileOutlined,
  // 添加快速建議詞需要的圖示
  ReadOutlined,
  AlignLeftOutlined,
  BarChartOutlined,
  LineChartOutlined,
  FileAddOutlined,
  ReloadOutlined,
} from "@ant-design/icons-vue";

// 導入自定義檔案圖示組件
import FileWord from "@/assets/icons/FileWord.vue";
import FileCSV from "@/assets/icons/FileCSV.vue";
import FileExcel from "@/assets/icons/FileExcel.vue";
import FilePowerpoint from "@/assets/icons/FilePowerpoint.vue";
import FilePDF from "@/assets/icons/FilePDF.vue";

// Props
const props = defineProps({
  message: {
    type: Object,
    required: true,
  },
  showStatus: {
    type: Boolean,
    default: true,
  },
});

// Emits
const emit = defineEmits([
  "quote-message",
  "regenerate-response",
  "generate-chart",
]);

// Store
const chatStore = useChatStore();
const configStore = useConfigStore();
const authStore = useAuthStore();
const agentsStore = useAgentsStore();

// 響應式狀態
const userMessageContent = ref(null);
const isUserMessageCollapsed = ref(true);
const shouldShowExpandButton = ref(false);
const codeHighlightRef = ref(null);
const toolCallsCollapsed = ref(true); // 工具調用預設為折疊狀態
const thinkingCollapsed = ref(true); // 思考過程預設為折疊狀態

// 思考內容動畫相關
const displayedThinkingContent = ref("");
const isThinkingAnimating = ref(false);
const thinkingAnimationTimer = ref(null);

// 🎯 智能圖表相關狀態
const detectedCharts = ref([]);
const isDetectingCharts = ref(false);
const chartDetectionError = ref(null);
const showChartSuggestion = ref(false);

// 🎯 計算屬性：檢查後端智能檢測結果
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

// 🎯 計算屬性：判斷是否有後端檢測到的圖表
const hasBackendDetectedChart = computed(() => {
  const detection = backendChartDetection.value;

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

// 用戶消息的最大高度（行數）
const MAX_USER_MESSAGE_LINES = 6;

// 圖片 blob URLs 管理
const imageBlobUrls = ref(new Map());
const loadingImages = ref(new Set());

// 計算屬性：分離圖片和非圖片附件
const imageAttachments = computed(() => {
  if (!props.message.attachments) return [];
  return props.message.attachments.filter(
    (attachment) =>
      attachment.file_type === "image" ||
      attachment.mime_type?.startsWith("image/")
  );
});

const nonImageAttachments = computed(() => {
  if (!props.message.attachments) return [];
  return props.message.attachments.filter(
    (attachment) =>
      attachment.file_type !== "image" &&
      !attachment.mime_type?.startsWith("image/")
  );
});

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
const getImageSrc = (fileId) => {
  // 如果已經有 blob URL，返回它
  if (imageBlobUrls.value.has(fileId)) {
    return imageBlobUrls.value.get(fileId);
  }

  // 如果正在載入，返回占位符
  if (loadingImages.value.has(fileId)) {
    return "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik03NSA2MEwxMjUgMTA1TDE2MCA3NUwxNzUgOTBWMTIwSDI1VjkwTDQwIDc1TDc1IDYwWiIgZmlsbD0iI0NDQ0NDQyIvPgo8Y2lyY2xlIGN4PSI2NSIgY3k9IjQ1IiByPSIxMCIgZmlsbD0iI0NDQ0NDQyIvPgo8L3N2Zz4K";
  }

  // 開始載入圖片
  loadImageBlob(fileId);
  return "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik03NSA2MEwxMjUgMTA1TDE2MCA3NUwxNzUgOTBWMTIwSDI1VjkwTDQwIDc1TDc1IDYwWiIgZmlsbD0iI0NDQ0NDQyIvPgo8Y2lyY2xlIGN4PSI2NSIgY3k9IjQ1IiByPSIxMCIgZmlsbD0iI0NDQ0NDQyIvPgo8L3N2Zz4K";
};

// 載入圖片 blob
const loadImageBlob = async (fileId) => {
  if (loadingImages.value.has(fileId) || imageBlobUrls.value.has(fileId)) {
    return;
  }

  loadingImages.value.add(fileId);

  try {
    const blobUrl = await getImageBlobUrl(fileId);
    imageBlobUrls.value.set(fileId, blobUrl);
  } catch (error) {
    console.error("載入圖片失敗:", error);
  } finally {
    loadingImages.value.delete(fileId);
  }
};

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

  // 預載入圖片
  imageAttachments.value.forEach((attachment) => {
    loadImageBlob(attachment.id);
  });

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
const getSenderName = () => {
  switch (props.message.role) {
    case "user":
      return (
        authStore.user?.display_name ||
        authStore.user?.username ||
        authStore.user?.email ||
        "用戶"
      );
    case "assistant":
      // 優先從消息中獲取智能體名稱，然後從當前智能體獲取
      if (props.message.agent_name) {
        return props.message.agent_name;
      }

      // 嘗試從智能體 ID 獲取名稱
      if (props.message.agent_id) {
        const agent = agentsStore.getAgentById(props.message.agent_id);
        if (agent) {
          return agent.display_name || agent.name;
        }
      }

      // 從當前智能體獲取
      const currentAgent = agentsStore.getCurrentAgent;
      if (currentAgent) {
        return currentAgent.display_name || currentAgent.name;
      }

      return "AI助手";
    case "system":
      return "系統";
    default:
      return "未知";
  }
};

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

// 錯誤檢測邏輯
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
  const colors = {
    ollama: "blue",
    gemini: "green",
    openai: "purple",
    claude: "orange",
  };
  return colors[provider] || "default";
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// 事件處理
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

const handleImageError = (event) => {
  console.error("圖片載入失敗:", event.target.src);
  // 設置錯誤占位符
  event.target.src =
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRkZFQkVFIiBzdHJva2U9IiNGRjc4NzUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWRhc2hhcnJheT0iNSw1Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iNzUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iI0ZGNzg3NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+5ZyW54mH6L275LiK5aSx5pWXPC90ZXh0Pgo8L3N2Zz4K";
  antMessage.error("圖片載入失敗");
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

// 添加檔案類型判斷方法
const getFileType = (attachment) => {
  const filename = attachment.filename || attachment.name || "";
  const mimeType = attachment.mime_type || "";
  const extension = filename.toLowerCase().split(".").pop();

  // 表格檔案
  if (extension === "csv" || mimeType === "text/csv") {
    return "csv";
  }
  if (
    extension === "xlsx" ||
    extension === "xls" ||
    mimeType.includes("spreadsheet")
  ) {
    return "excel";
  }

  // 文檔檔案
  if (extension === "pdf" || mimeType === "application/pdf") {
    return "pdf";
  }
  if (
    extension === "doc" ||
    extension === "docx" ||
    mimeType.includes("document")
  ) {
    return "word";
  }
  if (
    extension === "ppt" ||
    extension === "pptx" ||
    mimeType.includes("presentation")
  ) {
    return "powerpoint";
  }

  // 媒體檔案
  if (mimeType.startsWith("image/")) {
    return "image";
  }
  if (mimeType.startsWith("video/")) {
    return "video";
  }
  if (mimeType.startsWith("audio/")) {
    return "audio";
  }

  return "file";
};

// 獲取檔案圖標組件
const getFileIcon = (attachment) => {
  const fileType = getFileType(attachment);

  switch (fileType) {
    case "csv":
      return FileCSV;
    case "excel":
      return FileExcel;
    case "pdf":
      return FilePDF;
    case "word":
      return FileWord;
    case "powerpoint":
      return FilePowerpoint;
    case "image":
      return PictureOutlined;
    case "video":
      return VideoCameraOutlined;
    case "audio":
      return AudioOutlined;
    default:
      return FileOutlined;
  }
};

// 獲取檔案類型標籤
const getFileTypeLabel = (attachment) => {
  const fileType = getFileType(attachment);

  const labels = {
    csv: "CSV 表格",
    excel: "Excel 表格",
    pdf: "PDF 文檔",
    word: "Word 文檔",
    powerpoint: "PowerPoint",
    image: "圖片",
    video: "影片",
    audio: "音訊",
    file: "檔案",
  };

  return labels[fileType] || "檔案";
};

// 獲取檔案類型顏色
const getFileTypeColor = (attachment) => {
  const fileType = getFileType(attachment);

  const colors = {
    csv: "#52c41a", // 綠色
    excel: "#13c2c2", // 青色
    pdf: "#f5222d", // 紅色
    word: "#1890ff", // 藍色
    powerpoint: "#fa8c16", // 橙色
    image: "#722ed1", // 紫色
    video: "#eb2f96", // 粉色
    audio: "#faad14", // 黃色
    file: "#8c8c8c", // 灰色
  };

  return colors[fileType] || "#8c8c8c";
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

  // 🎯 優先檢查後端智能檢測結果
  if (hasBackendDetectedChart.value) {
    console.log("🎯 [MessageBubble] ✅ 後端智能檢測已生成圖表，跳過前端檢測");
    showChartSuggestion.value = false; // 後端已顯示圖表，不需要建議
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

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.message-avatar {
  flex-shrink: 0;
}

.agent-avatar-wrapper {
  position: relative;
}

.agent-avatar-image {
  border: 2px solid rgba(82, 196, 26, 0.2);
}

.agent-avatar-bg {
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.agent-avatar-bg svg {
  color: rgba(255, 255, 255, 0.9);
}

.message-info {
  flex: 1;
  min-width: 0;
}

.message-sender {
  font-weight: 600;
  font-size: 14px;
}

.user-message .message-sender {
  color: var(--custom-text-primary);
}

.message-time {
  font-size: 12px;
  opacity: 0.7;
}

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

.attachment-item {
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
  cursor: pointer;
  background-color: var(--color-bg-container);
  border: 1px solid var(--color-border);
  width: 100%;
  max-width: 320px;
  margin-bottom: 10px;
}

.attachment-card {
  display: flex;
  padding: 12px;
  align-items: flex-start;
  gap: 12px;
}

.attachment-icon-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.attachment-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  font-size: 24px;
  background-color: var(--color-bg-elevated);
  border-radius: 8px;
  position: relative;
  transition: all 0.3s ease;
}

.attachment-filename {
  font-size: 14px;
  color: var(--color-text-secondary);
  text-align: left;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
  margin-bottom: 10px;
}

.attachment-icon::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 8px;
  background: currentColor;
  opacity: 0.1;
  transition: opacity 0.3s ease;
}

.attachment-item:hover .attachment-icon::before {
  opacity: 0.15;
}

.attachment-info {
  flex: 1;
  overflow: hidden;
}

.attachment-name {
  font-weight: 500;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--color-text);
  font-size: 14px;
}

.attachment-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.file-type-label {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 4px;
  background: currentColor;
  color: white;
  opacity: 0.9;
  flex-shrink: 0;
}

.attachment-size {
  font-size: 12px;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

/* 🔧 移除快速命令相關樣式，簡化附件顯示 */

/* 暗色模式調整 */
:root[data-theme="dark"] .attachment-item {
  background-color: var(--color-bg-elevated);
  border-color: var(--color-border-secondary);
}

:root[data-theme="dark"] .attachment-icon {
  background-color: rgba(255, 255, 255, 0.05);
}

/* 🔧 移除快速命令暗色模式樣式 */

/* 圖片縮圖樣式 */
.message-image-thumbnails {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.image-thumbnail-item {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 200px;
  max-height: 150px;
}

.image-thumbnail-item:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.thumbnail-image {
  width: 100%;
  height: auto;
  min-width: 120px;
  max-width: 200px;
  max-height: 150px;
  object-fit: cover;
  display: block;
  border-radius: 8px;
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, 0) 60%,
    rgba(0, 0, 0, 0.8) 100%
  );
  opacity: 0;
  transition: opacity 0.3s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 8px;
  border-radius: 8px;
}

.image-thumbnail-item:hover .image-overlay {
  opacity: 1;
}

.image-filename {
  font-size: 11px;
  color: white;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: auto;
}

.zoom-icon {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  backdrop-filter: blur(4px);
}

/* 工具調用樣式 - 適配暗黑模式 */
.tool-calls-section {
  margin-top: 12px;
  border: 1px solid var(--custom-border-primary);
  border-radius: 8px;
  background: var(--custom-bg-secondary);
  overflow: hidden;
}

.tool-calls-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--custom-bg-tertiary);
  border-bottom: 1px solid var(--custom-border-primary);
  font-size: 13px;
  font-weight: 500;
  color: var(--custom-text-secondary);
  user-select: none;
  transition: background-color 0.2s ease;
}

.tool-calls-header:hover {
  background: var(--custom-bg-quaternary);
}

.tool-calls-header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tool-calls-header-right {
  display: flex;
  align-items: center;
}

.collapse-icon {
  transition: transform 0.2s ease;
  color: var(--custom-text-tertiary);
  font-size: 12px;
}

.collapse-icon.collapsed {
  transform: rotate(-90deg);
}

.tool-calls-list {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 暗黑模式下的工具調用樣式 */
:root[data-theme="dark"] .tool-calls-section {
  border-color: var(--custom-border-secondary);
  background: var(--custom-bg-primary);
}

:root[data-theme="dark"] .tool-calls-header {
  background: var(--custom-bg-secondary);
  border-bottom-color: var(--custom-border-secondary);
  color: var(--custom-text-primary);
}

:root[data-theme="dark"] .tool-calls-header:hover {
  background: var(--custom-bg-tertiary);
}

:root[data-theme="dark"] .collapse-icon {
  color: var(--custom-text-secondary);
}

/* 思考過程樣式 */
.thinking-section {
  margin-top: 12px;
  border: 1px solid var(--custom-border-primary);
  border-radius: 8px;
  background: var(--custom-bg-secondary);
  overflow: hidden;
}

.thinking-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--custom-bg-tertiary);
  border-bottom: 1px solid var(--custom-border-primary);
  font-size: 13px;
  font-weight: 500;
  color: var(--custom-text-secondary);
  user-select: none;
  transition: background-color 0.2s ease;
}

.thinking-header:hover {
  background: var(--custom-bg-quaternary);
}

.thinking-header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.thinking-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  color: #1890ff;
  font-size: 12px;
}

.thinking-status {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.thinking-header-right {
  display: flex;
  align-items: center;
}

.thinking-content {
  padding: 12px;
  background: var(--custom-bg-primary);
}

.thinking-text {
  white-space: pre-wrap;
  font-size: 15px;
  line-height: 1.5;
  color: var(--custom-text-secondary);
  font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
  background: rgba(0, 0, 0, 0.02);
  padding: 8px 12px;
  border-radius: 4px;
  border-left: 3px solid #faad14;
  position: relative;
}

.thinking-cursor {
  color: #1890ff;
  font-weight: bold;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}

/* 暗黑模式下的思考過程樣式 */
:root[data-theme="dark"] .thinking-section {
  border-color: #3e4651;
}

:root[data-theme="dark"] .thinking-header {
  border-color: #3e4651;
  background-color: #262626;
}

:root[data-theme="dark"] .thinking-content {
  background-color: #1f1f1f;
  color: #b8b8b8;
}

:root[data-theme="dark"] .thinking-text {
  color: #b8b8b8;
}

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

  .message-header {
    margin-bottom: 6px;
  }

  .message-avatar {
    display: none;
  }
}

/* 🔧 新增：工具處理狀態樣式 */
.tool-processing-section {
  margin: 8px 0;
  padding: 12px;
  background-color: #e6f7ff;
  border: 1px solid #91d5ff;
  border-radius: 6px;
  border-left: 3px solid #1890ff;
}

.tool-processing-header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1890ff;
  font-size: 14px;
}

.processing-spinner {
  color: #1890ff;
}

.tool-processing-error {
  margin: 8px 0;
  padding: 12px;
  background-color: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 6px;
  border-left: 3px solid #ff4d4f;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #cf1322;
  font-size: 14px;
}

/* 暗黑模式下的工具處理狀態樣式 */
[data-theme="dark"] .tool-processing-section {
  background-color: #111b26;
  border-color: #1e3a5f;
}

[data-theme="dark"] .tool-processing-header {
  color: #69c0ff;
}

[data-theme="dark"] .processing-spinner {
  color: #69c0ff;
}

[data-theme="dark"] .tool-processing-error {
  background-color: #2a1215;
  border-color: #58181c;
  color: #ff7875;
}

/* 🚀 二次調用優化狀態樣式 */
.optimizing-section {
  margin: 8px 0;
  padding: 12px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f4ff 100%);
  border: 1px solid #b3d8ff;
  border-radius: 6px;
  border-left: 3px solid #52c41a;
}

.optimizing-header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #389e0d;
  font-size: 14px;
  font-weight: 500;
}

/* 暗黑模式下的優化狀態樣式 */
[data-theme="dark"] .optimizing-section {
  background: linear-gradient(135deg, #0f1419 0%, #162329 100%);
  border-color: #1e3a5f;
}

[data-theme="dark"] .optimizing-header {
  color: #95de64;
}

/* 🎯 智能圖表建議樣式 */
.chart-suggestion-section {
  margin-top: 12px;
  border: 1px solid var(--custom-border-primary);
  border-radius: 8px;
  background: var(--custom-bg-secondary);
  overflow: hidden;
  border-left: 3px solid #1890ff;
}

.chart-suggestion-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--custom-bg-tertiary);
  border-bottom: 1px solid var(--custom-border-primary);
  font-size: 13px;
  font-weight: 500;
  color: #1890ff;
  gap: 6px;
}

.dismiss-button {
  color: var(--custom-text-tertiary) !important;
  padding: 0 4px !important;
  height: auto !important;
  min-width: auto !important;
}

.dismiss-button:hover {
  color: var(--custom-text-secondary) !important;
  background: transparent !important;
}

.chart-suggestions {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chart-suggestion-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  background: var(--custom-bg-primary);
  border: 1px solid var(--custom-border-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.chart-suggestion-item:hover {
  background: var(--custom-bg-tertiary);
  border-color: #1890ff;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.15);
}

.chart-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1890ff;
  background: rgba(24, 144, 255, 0.1);
  border-radius: 4px;
  flex-shrink: 0;
}

.chart-info {
  flex: 1;
  min-width: 0;
}

.chart-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--custom-text-primary);
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chart-confidence {
  font-size: 11px;
  color: var(--custom-text-tertiary);
}

/* 檢測狀態指示器 */
.chart-detection-status {
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(24, 144, 255, 0.05);
  border: 1px solid rgba(24, 144, 255, 0.2);
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #1890ff;
}

/* 檢測錯誤 */
.chart-detection-error {
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(255, 77, 79, 0.05);
  border: 1px solid rgba(255, 77, 79, 0.2);
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #ff4d4f;
}

/* 暗黑模式下的圖表建議樣式 */
:root[data-theme="dark"] .chart-suggestion-section {
  border-color: var(--custom-border-secondary);
  background: var(--custom-bg-primary);
}

:root[data-theme="dark"] .chart-suggestion-header {
  background: var(--custom-bg-secondary);
  border-bottom-color: var(--custom-border-secondary);
  color: #69c0ff;
}

:root[data-theme="dark"] .chart-suggestion-item {
  background: var(--custom-bg-secondary);
  border-color: var(--custom-border-primary);
}

:root[data-theme="dark"] .chart-suggestion-item:hover {
  background: var(--custom-bg-tertiary);
  border-color: #69c0ff;
  box-shadow: 0 2px 8px rgba(105, 192, 255, 0.15);
}

:root[data-theme="dark"] .chart-icon {
  color: #69c0ff;
  background: rgba(105, 192, 255, 0.1);
}

:root[data-theme="dark"] .chart-detection-status {
  background: rgba(105, 192, 255, 0.1);
  border-color: rgba(105, 192, 255, 0.3);
  color: #69c0ff;
}

:root[data-theme="dark"] .chart-detection-error {
  background: rgba(255, 120, 117, 0.1);
  border-color: rgba(255, 120, 117, 0.3);
  color: #ff7875;
}

/* 🎯 智能圖表分析樣式 */
.smart-chart-section {
  margin-top: 16px;
  padding: 16px;
  background: linear-gradient(
    135deg,
    rgba(24, 144, 255, 0.05),
    rgba(82, 196, 26, 0.05)
  );
  border: 1px solid rgba(24, 144, 255, 0.2);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.1);
}

.smart-chart-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 600;
  color: #1890ff;
}

.confidence-badge {
  margin-left: auto;
  padding: 2px 8px;
  background: rgba(24, 144, 255, 0.1);
  border: 1px solid rgba(24, 144, 255, 0.3);
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  color: #1890ff;
}

.smart-chart-content {
  margin: 12px 0;
  background: white;
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.auto-generated-chart {
  border-radius: 6px;
  overflow: hidden;
}

.smart-chart-reasoning {
  margin-top: 12px;
  padding: 8px 12px;
  background: rgba(24, 144, 255, 0.05);
  border-left: 3px solid #1890ff;
  border-radius: 0 6px 6px 0;
}

.reasoning-text {
  font-size: 13px;
  color: var(--custom-text-secondary);
  line-height: 1.4;
}

/* 暗黑模式下的智能圖表樣式 */
:root[data-theme="dark"] .smart-chart-section {
  background: linear-gradient(
    135deg,
    rgba(69, 192, 255, 0.08),
    rgba(82, 196, 26, 0.08)
  );
  border-color: rgba(69, 192, 255, 0.3);
}

:root[data-theme="dark"] .smart-chart-header {
  color: #69c0ff;
}

:root[data-theme="dark"] .confidence-badge {
  background: rgba(69, 192, 255, 0.15);
  border-color: rgba(69, 192, 255, 0.4);
  color: #69c0ff;
}

:root[data-theme="dark"] .smart-chart-content {
  background: var(--custom-bg-secondary);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}

:root[data-theme="dark"] .smart-chart-reasoning {
  background: rgba(69, 192, 255, 0.08);
  border-left-color: #69c0ff;
}

/* 🎯 圖表消息樣式 */
.chart-message-container {
  margin-top: 12px;
  border: 1px solid var(--custom-border-primary);
  border-radius: 8px;
  background: var(--custom-bg-secondary);
  overflow: hidden;
  border-left: 3px solid #52c41a;
}

/* 暗黑模式下的圖表消息樣式 */
:root[data-theme="dark"] .chart-message-container {
  border-color: var(--custom-border-secondary);
  background: var(--custom-bg-primary);
  border-left-color: #95de64;
}

/* 確保圖表消息中的SmartChart組件樣式正確 */
.chart-message-container :deep(.smart-chart-container) {
  border: none;
  background: transparent;
}
</style>

<template>
  <div class="tool-call-display">
    <!-- 工具調用標題 -->
    <div class="tool-call-header">
      <div class="tool-info">
        <component
          :is="getToolIcon(toolCall.toolName)"
          class="tool-icon" />
        <span class="tool-name">{{
          getToolDisplayName(toolCall.toolName)
        }}</span>
        <a-tag
          :color="getToolColor(toolCall.toolName)"
          size="small">
          {{ getToolCategory(toolCall.toolName) }}
        </a-tag>
      </div>
      <div class="tool-status">
        <a-tag
          :color="toolCall.success ? 'success' : 'error'"
          size="small">
          {{ toolCall.success ? "成功" : "失敗" }}
        </a-tag>
        <span
          class="execution-time"
          v-if="toolCall.executionTime">
          {{ toolCall.executionTime }}ms
        </span>
      </div>
    </div>

    <!-- 工具參數（可摺疊） -->
    <div
      class="tool-parameters"
      v-if="toolCall.arguments && showDetails">
      <div class="section-title">
        <CodeOutlined />
        <span>調用參數</span>
      </div>
      <div class="parameters-content">
        <pre class="json-display">{{ formatJson(toolCall.arguments) }}</pre>
      </div>
    </div>

    <!-- 工具結果 -->
    <div class="tool-result">
      <div class="section-title">
        <CheckCircleOutlined v-if="toolCall.success" />
        <ExclamationCircleOutlined v-else />
        <span>執行結果</span>
        <a-button
          type="link"
          size="small"
          @click="toggleDetails"
          class="toggle-details">
          {{ showDetails ? "收起詳情" : "顯示詳情" }}
        </a-button>
        <!-- 流式展示切換按鈕 -->
        <a-button
          v-if="supportsStreaming && toolCall.success"
          type="link"
          size="small"
          @click="toggleStreamingMode"
          class="streaming-toggle">
          {{ useStreaming ? "標準模式" : "流式展示" }}
        </a-button>
        <!-- 🔧 調試模式切換按鈕 -->
        <a-button
          v-if="getDebugInfo()"
          type="link"
          size="small"
          @click="showDebugInfo = !showDebugInfo"
          class="debug-toggle">
          {{ showDebugInfo ? "隱藏調試" : "顯示調試" }}
        </a-button>
      </div>

      <!-- 成功結果 -->
      <div
        v-if="toolCall.success"
        class="result-content success">
        <!-- 🔧 調試面板 -->
        <DebugPanel
          v-if="showDebugInfo && getDebugInfo()"
          :debug-info="getDebugInfo()" />

        <!-- 🤖 AI 指導提示詞顯示 -->
        <!-- 強制調試區塊 -->
        <div
          v-show="true"
          style="
            background: yellow;
            padding: 10px;
            margin: 10px 0;
            border: 2px solid red;
          ">
          <strong>🔍 調試信息:</strong><br />
          getAIInstructions() 返回值: {{ getAIInstructions() }}<br />
          條件判斷結果: {{ !!getAIInstructions() }}<br />
          類型: {{ typeof getAIInstructions() }}<br />
          有調試信息: {{ !!getDebugInfo() }}<br />
          調試信息類型: {{ typeof getDebugInfo() }}
        </div>

        <div
          v-if="getAIInstructions()"
          class="ai-instructions-section">
          <div class="ai-instructions-header">
            <span class="ai-instructions-icon">🧠</span>
            <span class="ai-instructions-title">AI 分析指導</span>
            <a-tag
              color="processing"
              size="small"
              >動態生成</a-tag
            >
          </div>
          <div class="ai-instructions-content">
            <div class="ai-instructions-text">
              {{ getAIInstructions() }}
            </div>
            <div class="ai-instructions-note">
              <InfoCircleOutlined />
              <span>此指導會影響 AI 的分析重點和回應風格</span>
            </div>
          </div>
        </div>

        <!-- 流式展示模式 -->
        <div
          v-if="useStreaming && streamingData"
          class="streaming-result">
          <StreamingResultViewer
            :data="streamingData"
            :auto-start="true"
            :animation-speed="800"
            @complete="onStreamingComplete"
            @stage-complete="onStageComplete" />
        </div>

        <!-- 標準展示模式 -->
        <div v-else>
          <!-- 🚀 MCP 工具流式顯示 -->
          <div
            v-if="isMcpStreaming"
            class="mcp-streaming-result">
            <div class="mcp-streaming-header">
              <div class="streaming-indicator">
                <span class="streaming-dot"></span>
                <span>{{ mcpToolName }} 數據流式載入中...</span>
              </div>
              <div v-if="mcpProgress" class="streaming-progress">
                <a-progress
                  :percent="mcpProgress.percentage"
                  size="small"
                  :show-info="false" />
                <span class="progress-text">
                  {{ mcpProgress.current }} / {{ mcpProgress.total }}
                </span>
              </div>
            </div>
            <div class="mcp-stream-content">
              <div class="streaming-content-container">
                <!-- 使用 AnimatedContent 組件進行逐行顯示 -->
                <AnimatedContent
                  :content="mcpStreamContent"
                  :enable-animation="true"
                  :chunk-size="{ min: 15, max: 30 }"
                  :delay="{ min: 30, max: 80 }" />
              </div>
            </div>
          </div>

          <!-- 🖼️ 圖片顯示（最高優先級） -->
          <div
            v-else-if="hasImageData"
            class="image-result">
            <div class="image-container">
              <div class="image-header">
                <PictureOutlined />
                <span>生成的圖片</span>
                <a-tag
                  color="green"
                  size="small"
                  >{{ getImageFormat() }}</a-tag
                >
                <span class="image-size">{{ getImageSizeText() }}</span>
              </div>
              <div class="image-display">
                <img
                  :src="getImageDataUrl()"
                  :alt="getImageTitle()"
                  class="generated-image"
                  @load="onImageLoad"
                  @error="onImageError" />
              </div>
              <div class="image-actions">
                <a-button
                  type="link"
                  size="small"
                  @click="downloadImage">
                  <DownloadOutlined />
                  下載圖片
                </a-button>
                <a-button
                  type="link"
                  size="small"
                  @click="viewFullscreen">
                  <ExpandOutlined />
                  全螢幕檢視
                </a-button>
              </div>
            </div>
          </div>

          <!-- 結構化數據顯示 -->
          <div
            v-if="isStructuredData(toolCall.result)"
            class="structured-result">
            <div class="result-container">
              <StructuredDataDisplay :data="toolCall.result" />
            </div>
          </div>
          <!-- 純文本結果 -->
          <div
            v-else-if="!hasImageData"
            class="text-result">
            <div class="text-container">
              {{ formatResult(toolCall.result) }}
            </div>
          </div>
        </div>
      </div>

      <!-- 錯誤結果 -->
      <div
        v-else
        class="result-content error">
        <div class="error-message">
          {{ toolCall.error || "工具調用失敗" }}
        </div>
        <div
          v-if="toolCall.details"
          class="error-details">
          <pre>{{ formatJson(toolCall.details) }}</pre>
        </div>
      </div>
    </div>

    <!-- 工具調用元數據（詳情模式） -->
    <div
      class="tool-metadata"
      v-if="showDetails && toolCall.metadata">
      <div class="section-title">
        <InfoCircleOutlined />
        <span>調用信息</span>
      </div>
      <div class="metadata-content">
        <div
          class="metadata-item"
          v-if="toolCall.metadata.timestamp">
          <span class="label">時間：</span>
          <span class="value">{{
            formatTimestamp(toolCall.metadata.timestamp)
          }}</span>
        </div>
        <div
          class="metadata-item"
          v-if="toolCall.metadata.version">
          <span class="label">版本：</span>
          <span class="value">{{ toolCall.metadata.version }}</span>
        </div>
        <div
          class="metadata-item"
          v-if="toolCall.metadata.executionId">
          <span class="label">執行ID：</span>
          <span class="value">{{ toolCall.metadata.executionId }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import StructuredDataDisplay from "./StructuredDataDisplay.vue";
import StreamingResultViewer from "./StreamingResultViewer.vue";
import DebugPanel from "./DebugPanel.vue";
import AnimatedContent from "./AnimatedContent.vue";
import ToolDisplayConfigManager from "@/utils/toolDisplayConfig.js";
import {
  parseStatisticalResult,
  isStreamingSupported,
} from "@/utils/statisticalResultParser.js";
import {
  PictureOutlined,
  DownloadOutlined,
  ExpandOutlined,
} from "@ant-design/icons-vue";

const props = defineProps({
  toolCall: {
    type: Object,
    required: true,
  },
});

const showDetails = ref(false);
const useStreaming = ref(false);
const streamingData = ref(null);
const showDebugInfo = ref(true); // 🔧 控制調試面板顯示

const toggleDetails = () => {
  showDetails.value = !showDetails.value;
};

// 檢查是否支援流式展示
const supportsStreaming = computed(() => {
  const toolName = props.toolCall.toolName || props.toolCall.name;
  return isStreamingSupported(toolName);
});

// 切換流式模式
const toggleStreamingMode = () => {
  useStreaming.value = !useStreaming.value;

  if (useStreaming.value && !streamingData.value) {
    // 解析統計結果為流式格式
    const parsed = parseStatisticalResult(props.toolCall);
    if (parsed) {
      streamingData.value = parsed;
    } else {
      // 如果解析失敗，回退到標準模式
      useStreaming.value = false;
      console.warn("無法解析工具結果為流式格式");
    }
  }
};

// 流式展示事件處理
const onStreamingComplete = () => {
  console.log("流式展示完成");
};

const onStageComplete = (event) => {
  console.log("階段完成:", event);
};

// 監聽工具調用變化，重置流式數據
watch(
  () => props.toolCall,
  () => {
    streamingData.value = null;
    useStreaming.value = false;
  },
  { deep: true }
);

// 使用智能配置系統獲取工具配置
const toolConfig = computed(() => {
  return ToolDisplayConfigManager.getToolConfig(
    props.toolCall.toolName || props.toolCall.name
  );
});

// 工具圖標（使用智能配置）
const getToolIcon = (toolName) => {
  const config = ToolDisplayConfigManager.getToolConfig(toolName);
  return config.icon;
};

// 工具顯示名稱（使用智能配置）
const getToolDisplayName = (toolName) => {
  const config = ToolDisplayConfigManager.getToolConfig(toolName);
  return config.displayName;
};

// 工具類別（使用智能配置）
const getToolCategory = (toolName) => {
  const config = ToolDisplayConfigManager.getToolConfig(toolName);
  return config.category;
};

// 工具顏色（使用智能配置）
const getToolColor = (toolName) => {
  const config = ToolDisplayConfigManager.getToolConfig(toolName);
  return config.color;
};

// 🚀 MCP 工具流式狀態相關計算屬性
const isMcpStreaming = computed(() => {
  return props.toolCall?.mcpStreaming === true;
});

const mcpStreamContent = computed(() => {
  return props.toolCall?.mcpStreamContent || "";
});

const mcpProgress = computed(() => {
  return props.toolCall?.mcpProgress || null;
});

const mcpToolName = computed(() => {
  return props.toolCall?.mcpToolName || props.toolCall?.toolName || props.toolCall?.name || "工具";
});

// 🖼️ 圖片數據相關計算屬性和方法
const hasImageData = computed(() => {
  // 檢查 toolCall.result.data._meta.image_data
  return !!(
    props.toolCall?.result?.data?._meta?.image_data?.base64 ||
    props.toolCall?.result?._meta?.image_data?.base64
  );
});

const getImageData = () => {
  // 從兩個可能的位置獲取圖片數據
  return (
    props.toolCall?.result?.data?._meta?.image_data ||
    props.toolCall?.result?._meta?.image_data ||
    null
  );
};

const getImageDataUrl = () => {
  const imageData = getImageData();
  if (!imageData?.base64) return "";

  // 如果 base64 已經包含 data:image 前綴，直接返回
  if (imageData.base64.startsWith("data:image")) {
    return imageData.base64;
  }

  // 否則添加前綴
  const format = imageData.format || "png";
  return `data:image/${format};base64,${imageData.base64}`;
};

const getImageFormat = () => {
  const imageData = getImageData();
  return (imageData?.format || "png").toUpperCase();
};

const getImageSizeText = () => {
  const imageData = getImageData();
  if (!imageData?.size) return "";

  const sizeKB = Math.round(imageData.size / 1000);
  return `(${sizeKB}KB)`;
};

const getImageTitle = () => {
  // 嘗試從工具調用的參數中獲取標題
  const args = props.toolCall?.arguments || props.toolCall?.parameters;
  return args?.title || "生成的圖片";
};

// 圖片載入事件
const onImageLoad = () => {
  console.log("✅ 圖片載入成功");
};

const onImageError = () => {
  console.error("❌ 圖片載入失敗");
};

// 下載圖片
const downloadImage = () => {
  const imageDataUrl = getImageDataUrl();
  if (!imageDataUrl) return;

  const link = document.createElement("a");
  link.href = imageDataUrl;
  link.download = `${getImageTitle()}.${getImageFormat().toLowerCase()}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// 全螢幕檢視
const viewFullscreen = () => {
  const imageDataUrl = getImageDataUrl();
  if (!imageDataUrl) return;

  const newWindow = window.open("", "_blank");
  if (newWindow) {
    newWindow.document.write(`
      <html>
        <head>
          <title>${getImageTitle()}</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              background: #000;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            img {
              max-width: 100%;
              max-height: 100vh;
              object-fit: contain;
            }
          </style>
        </head>
        <body>
          <img src="${imageDataUrl}" alt="${getImageTitle()}" />
        </body>
      </html>
    `);
  }
};

// 檢查是否為結構化數據
const isStructuredData = (data) => {
  return typeof data === "object" && data !== null && !Array.isArray(data);
};

// 格式化 JSON
const formatJson = (obj) => {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
};

// 格式化結果
const formatResult = (result) => {
  if (typeof result === "string") return result;
  if (typeof result === "object") return JSON.stringify(result, null, 2);
  return String(result);
};

// 格式化時間戳
const formatTimestamp = (timestamp) => {
  try {
    return new Date(timestamp).toLocaleString("zh-TW");
  } catch {
    return timestamp;
  }
};

// 🤖 獲取 AI 指導提示詞
const getAIInstructions = () => {
  if (!props.toolCall || !props.toolCall.success) {
    console.log("🔍 [ToolCallDisplay] toolCall 無效或不成功");
    return null;
  }

  console.log("🔍 [ToolCallDisplay] 詳細檢查 AI 指導提示詞:", {
    hasResult: !!props.toolCall.result,
    hasData: !!props.toolCall.data,
    toolCallKeys: Object.keys(props.toolCall),
    resultKeys: props.toolCall.result ? Object.keys(props.toolCall.result) : [],
    dataKeys: props.toolCall.data ? Object.keys(props.toolCall.data) : [],
    fullToolCall: JSON.stringify(props.toolCall, null, 2),
  });

  // 從多個可能的路徑提取 aiInstructions
  const toolCall = props.toolCall;

  // 🔧 增強的深度搜索邏輯
  function deepSearch(obj, key, path = "") {
    if (!obj || typeof obj !== "object") return null;

    // 直接檢查當前層級
    if (obj[key]) {
      console.log(
        `✅ 在路徑 '${path}' 中找到 ${key}:`,
        obj[key].substring(0, 100) + "..."
      );
      return obj[key];
    }

    // 遞歸搜索所有屬性
    for (const prop in obj) {
      if (typeof obj[prop] === "object") {
        const newPath = path ? `${path}.${prop}` : prop;
        const result = deepSearch(obj[prop], key, newPath);
        if (result) return result;
      }
    }

    return null;
  }

  // 優先檢查常見路徑
  const commonPaths = [
    () => toolCall.result?.aiInstructions,
    () => toolCall.data?.aiInstructions,
    () => toolCall.result?.data?.aiInstructions,
    () => toolCall.data?.result?.aiInstructions,
    () => toolCall.response?.aiInstructions,
    () => toolCall.response?.data?.aiInstructions,
  ];

  for (const pathFunc of commonPaths) {
    try {
      const instructions = pathFunc();
      if (instructions) {
        console.log(
          "✅ 通過常見路徑找到 aiInstructions:",
          instructions.substring(0, 100) + "..."
        );
        return instructions;
      }
    } catch (e) {
      // 忽略路徑錯誤，繼續嘗試
    }
  }

  // 如果常見路徑都找不到，使用深度搜索
  const instructions = deepSearch(toolCall, "aiInstructions");

  if (instructions) {
    console.log(
      "✅ 深度搜索找到 aiInstructions:",
      instructions.substring(0, 100) + "..."
    );
    return instructions;
  }

  console.log("❌ 未找到 aiInstructions，工具調用結構:", Object.keys(toolCall));
  return null;
};

// 🔧 獲取調試信息
const getDebugInfo = () => {
  if (!props.toolCall || !props.toolCall.success) {
    return null;
  }

  // 從工具調用結果中提取調試信息
  const toolCall = props.toolCall;

  // 使用深度搜索查找 debug_info TODO: where use this?
  function deepSearchDebugInfo(obj, path = "") {
    if (!obj || typeof obj !== "object") return null;

    // 直接檢查當前層級
    if (obj.debug_info) {
      console.log(`🔍 在路徑 '${path}' 中找到 debug_info`);
      return obj.debug_info;
    }

    // 遞歸搜索所有屬性
    for (const prop in obj) {
      if (typeof obj[prop] === "object") {
        const newPath = path ? `${path}.${prop}` : prop;
        const result = deepSearchDebugInfo(obj[prop], newPath);
        if (result) return result;
      }
    }

    return null;
  }

  // 優先檢查常見路徑
  const commonPaths = [
    () => toolCall.debug_info,
    () => toolCall.result?.debug_info,
    () => toolCall.data?.debug_info,
    () => toolCall.metadata?.debug_info,
  ];

  for (const pathFunc of commonPaths) {
    try {
      const debugInfo = pathFunc();
      if (debugInfo) {
        console.log("✅ 通過常見路徑找到 debug_info");
        return debugInfo;
      }
    } catch (e) {
      // 忽略路徑錯誤，繼續嘗試
    }
  }

  // 如果常見路徑都找不到，使用深度搜索
  const debugInfo = deepSearchDebugInfo(toolCall);

  if (debugInfo) {
    console.log("✅ 深度搜索找到 debug_info");
    return debugInfo;
  }

  console.log("❌ 未找到 debug_info");
  return null;
};
</script>

<style scoped>
.tool-call-display {
  border: 1px solid var(--custom-border-primary);
  border-radius: 8px;
  margin: 8px 0;
  background: var(--custom-bg-secondary);
  overflow: hidden;
}

.tool-call-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--custom-bg-tertiary);
  border-bottom: 1px solid var(--custom-border-primary);
}

.tool-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tool-icon {
  font-size: 16px;
  color: var(--custom-primary-color);
}

.tool-name {
  font-weight: 500;
  color: var(--custom-text-primary);
}

.tool-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.execution-time {
  font-size: 12px;
  color: var(--custom-text-tertiary);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  color: var(--custom-text-secondary);
  margin-bottom: 8px;
  font-size: 13px;
}

.tool-parameters,
.tool-result,
.tool-metadata {
  padding: 12px 16px;
}

.tool-parameters {
  background: var(--custom-bg-primary);
  border-bottom: 1px solid var(--custom-border-primary);
}

.parameters-content,
.metadata-content {
  margin-top: 8px;
}

.json-display {
  background: var(--custom-bg-component);
  border: 1px solid var(--custom-border-secondary);
  border-radius: 4px;
  padding: 8px;
  font-size: 12px;
  color: var(--custom-text-secondary);
  overflow-x: auto;
  margin: 0;
}

.result-content {
  margin-top: 8px;
}

.result-content.success {
  color: var(--custom-success-color);
}

.result-content.error {
  color: var(--custom-error-color);
}

/* 🤖 AI 指導提示詞樣式 */
.ai-instructions-section {
  background: linear-gradient(
    135deg,
    rgba(52, 196, 250, 0.1),
    rgba(52, 196, 250, 0.05)
  );
  border: 1px solid rgba(52, 196, 250, 0.3);
  border-radius: 8px;
  margin-bottom: 16px;
  overflow: hidden;
}

.ai-instructions-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(52, 196, 250, 0.15);
  border-bottom: 1px solid rgba(52, 196, 250, 0.2);
}

.ai-instructions-icon {
  font-size: 16px;
}

.ai-instructions-title {
  font-weight: 600;
  color: var(--custom-text-primary);
  font-size: 14px;
}

.ai-instructions-content {
  padding: 12px;
}

.ai-instructions-text {
  font-size: 13px;
  line-height: 1.6;
  color: var(--custom-text-secondary);
  background: var(--custom-bg-primary);
  padding: 10px 12px;
  border-radius: 6px;
  border-left: 3px solid #34c4fa;
  white-space: pre-line;
  margin-bottom: 8px;
}

.ai-instructions-note {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--custom-text-tertiary);
  font-style: italic;
}

.ai-instructions-note .anticon {
  color: #34c4fa;
  font-size: 14px;
}

.structured-result {
  background: var(--custom-bg-component);
  border: 1px solid var(--custom-border-secondary);
  border-radius: 4px;
  padding: 12px;
}

.result-container {
  overflow-x: auto;
  overflow-y: visible;
  max-width: 100%;
}

.text-result {
  background: var(--custom-bg-component);
  border: 1px solid var(--custom-border-secondary);
  border-radius: 4px;
  padding: 12px;
  white-space: pre-wrap;
  font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
  font-size: 13px;
  color: var(--custom-text-primary);
}

.text-container {
  overflow-x: auto;
  overflow-y: visible;
  max-width: 100%;
  white-space: nowrap;
}

.error-message {
  font-weight: 500;
  margin-bottom: 8px;
}

.error-details {
  background: var(--custom-error-bg);
  border: 1px solid var(--custom-error-border);
  border-radius: 4px;
  padding: 8px;
  font-size: 12px;
  color: var(--custom-error-color);
}

.metadata-item {
  display: flex;
  margin-bottom: 4px;
}

.metadata-item .label {
  font-weight: 500;
  min-width: 60px;
  color: var(--custom-text-tertiary);
}

.metadata-item .value {
  color: var(--custom-text-primary);
}

.toggle-details {
  margin-left: auto;
  padding: 0;
  height: auto;
  color: var(--custom-text-secondary);
}

.toggle-details:hover {
  color: var(--custom-primary-color);
}

.streaming-toggle {
  padding: 0 !important;
  height: auto !important;
  margin-left: 8px;
  color: var(--primary-color) !important;
  font-size: 12px;
}

.streaming-toggle:hover {
  background: rgba(24, 144, 255, 0.1) !important;
}

.debug-toggle {
  padding: 0 !important;
  height: auto !important;
  margin-left: 8px;
  color: #722ed1 !important;
  font-size: 12px;
}

.debug-toggle:hover {
  background: rgba(114, 46, 209, 0.1) !important;
}

.streaming-result {
  margin-top: 8px;
}

/* 🖼️ 圖片顯示樣式 */
.image-result {
  margin-top: 12px;
}

.image-container {
  border: 1px solid var(--custom-border-secondary);
  border-radius: 8px;
  overflow: hidden;
  background: var(--custom-bg-component);
}

.image-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--custom-bg-primary);
  border-bottom: 1px solid var(--custom-border-secondary);
  font-size: 14px;
  font-weight: 500;
  color: var(--custom-text-primary);
}

.image-size {
  color: var(--custom-text-tertiary);
  font-size: 12px;
  margin-left: auto;
}

.image-display {
  padding: 16px;
  display: flex;
  justify-content: center;
  background: var(--custom-bg-component);
}

.generated-image {
  max-width: 100%;
  max-height: 500px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s ease;
}

.generated-image:hover {
  transform: scale(1.02);
}

.image-actions {
  padding: 12px 16px;
  background: var(--custom-bg-primary);
  border-top: 1px solid var(--custom-border-secondary);
  display: flex;
  gap: 12px;
}

.image-actions .ant-btn {
  padding: 4px 12px;
  height: auto;
  font-size: 12px;
}

/* 🚀 MCP 工具流式顯示樣式 */
.mcp-streaming-result {
  padding: 16px;
  background: var(--custom-bg-component);
  border-radius: 6px;
  margin: 12px 0;
}

.mcp-streaming-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--custom-border-secondary);
}

.streaming-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--custom-text-secondary);
}

.streaming-dot {
  width: 8px;
  height: 8px;
  background: var(--custom-primary-color);
  border-radius: 50%;
  animation: streaming-pulse 1.5s ease-in-out infinite;
}

@keyframes streaming-pulse {
  0%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

.streaming-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
}

.progress-text {
  font-size: 12px;
  color: var(--custom-text-tertiary);
  white-space: nowrap;
}

.mcp-stream-content {
  background: var(--custom-bg-primary);
  border: 1px solid var(--custom-border-secondary);
  border-radius: 4px;
  overflow: hidden;
}

.streaming-content-container {
  padding: 16px;
  min-height: 60px;
  line-height: 1.6;
  color: var(--custom-text-primary);
}

/* 為了向後兼容，保留深色模式支援（使用 CSS 變量覆蓋） */
:root[data-theme="dark"] .tool-call-display {
  background: var(--custom-bg-primary);
  border-color: var(--custom-border-secondary);
}

:root[data-theme="dark"] .tool-call-header {
  background: var(--custom-bg-secondary);
  border-color: var(--custom-border-secondary);
}

:root[data-theme="dark"] .tool-parameters {
  background: var(--custom-bg-primary);
  border-color: var(--custom-border-secondary);
}

:root[data-theme="dark"] .json-display,
:root[data-theme="dark"] .structured-result,
:root[data-theme="dark"] .text-result {
  background: var(--custom-bg-component);
  border-color: var(--custom-border-secondary);
  color: var(--custom-text-primary);
}

:root[data-theme="dark"] .error-details {
  background: var(--custom-error-bg);
  border-color: var(--custom-error-border);
}
</style>

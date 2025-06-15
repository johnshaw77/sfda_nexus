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
            message.quoted_message.role === "user" ? "用戶" : "AI助手"
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
          v-else-if="message.role === 'assistant'"
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
          class="attachment-item"
          @click="handleViewAttachment(attachment)">
          <div class="attachment-icon">
            <FileOutlined v-if="attachment.file_type === 'attachment'" />
            <PictureOutlined
              v-else-if="
                attachment.file_type === 'image' ||
                attachment.mime_type?.startsWith('image/')
              " />
            <VideoCameraOutlined
              v-else-if="attachment.mime_type?.startsWith('video/')" />
            <AudioOutlined
              v-else-if="attachment.mime_type?.startsWith('audio/')" />
            <FileOutlined v-else />
          </div>
          <div class="attachment-info">
            <div class="attachment-name">
              {{ attachment.filename || attachment.name }}
            </div>
            <div class="attachment-size">
              {{ formatFileSize(attachment.file_size || attachment.size) }}
            </div>
          </div>
        </div>
      </div>

      <!-- AI 模型信息 -->
      <div
        v-if="message.role === 'assistant' && message.model_info"
        class="model-info">
        <div class="model-info-left">
          <a-tag :color="getModelColor('gemini')">
            {{ message.model_info.model || "Unknown Model" }}
          </a-tag>
          <span class="token-usage">
            Token: {{ message.tokens_used || 0 }}
          </span>
          <span
            class="cost-info"
            v-if="message.cost && parseFloat(message.cost) > 0">
            Cost: ${{ parseFloat(message.cost).toFixed(6) }}
          </span>
        </div>

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
        </div>
      </div>

      <!-- AI回應工具欄 -->
      <!-- <div
        v-if="message.role === 'assistant'"
        class="ai-message-toolbar">
        <a-button
          type="text"
          size="small"
          @click="handleCopyMessage"
          class="toolbar-btn">
          <template #icon>
            <CopyOutlined />
          </template>
        </a-button>

        <a-button
          type="text"
          size="small"
          @click="handleRegenerateResponse"
          class="toolbar-btn">
          <template #icon>
            <ReloadOutlined />
          </template>
        </a-button>

        <a-button
          type="text"
          size="small"
          @click="handleQuoteMessage"
          class="toolbar-btn">
          <template #icon>
            <MessageOutlined />
          </template>
        </a-button>
      </div> -->
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
import { getFilePreviewUrl, getImageBlobUrl } from "@/api/files";
import CodeHighlight from "@/components/common/CodeHighlight.vue";
import ToolCallDisplay from "@/components/common/ToolCallDisplay.vue";

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
const emit = defineEmits(["quote-message", "regenerate-response"]);

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

  // 如果沒有工具調用，返回空陣列
  if (toolCalls.length === 0) {
    return [];
  }

  // 將工具調用和結果合併
  return toolCalls.map((toolCall, index) => {
    const result = toolResults[index];

    return {
      // 工具調用基本信息
      toolName: toolCall.name || result?.tool_name || "unknown",
      name: toolCall.name || result?.tool_name,
      format: toolCall.format || "function",
      arguments: toolCall.parameters || {},

      // 執行結果
      success: result?.success || false,
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
  });
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
  if (props.message.role === "user") {
    checkUserMessageHeight();
  }

  // 預載入圖片
  imageAttachments.value.forEach((attachment) => {
    loadImageBlob(attachment.id);
  });
});

// 清理 blob URLs
onUnmounted(() => {
  imageBlobUrls.value.forEach((blobUrl) => {
    URL.revokeObjectURL(blobUrl);
  });
  imageBlobUrls.value.clear();
});

// 檢查用戶消息高度並決定是否顯示展開按鈕
const checkUserMessageHeight = () => {
  if (!userMessageContent.value) return;

  const element = userMessageContent.value;
  const lineHeight = parseInt(window.getComputedStyle(element).lineHeight);
  const maxHeight = lineHeight * MAX_USER_MESSAGE_LINES;

  shouldShowExpandButton.value = element.scrollHeight > maxHeight;

  console.log("檢查用戶消息高度:", {
    scrollHeight: element.scrollHeight,
    maxHeight,
    shouldShow: shouldShowExpandButton.value,
  });
};

// 切換用戶消息展開狀態
const toggleUserMessageExpand = () => {
  isUserMessageCollapsed.value = !isUserMessageCollapsed.value;
};

// 切換工具調用折疊狀態
const toggleToolCallsCollapse = () => {
  toolCallsCollapsed.value = !toolCallsCollapsed.value;
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
      return props.message.agent_name || "AI助手";
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
  gap: 8px;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.attachment-item:hover {
  background: rgba(0, 0, 0, 0.1);
}

.user-message .attachment-item {
  background: var(--custom-bg-secondary);
}

.user-message .attachment-item:hover {
  background: var(--custom-bg-tertiary);
}

.attachment-icon {
  font-size: 16px;
  opacity: 0.8;
}

.attachment-info {
  flex: 1;
  min-width: 0;
}

.attachment-name {
  font-size: 13px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-size {
  font-size: 11px;
  opacity: 0.7;
}

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

.model-info {
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
}

.model-info-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-info-actions {
  opacity: 0;
  transition: opacity 0.3s ease;
  display: flex;
  gap: 4px;
  background: var(--custom-bg-secondary);
  border: 1px solid var(--custom-border-primary);
  border-radius: 6px;
  padding: 2px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.message-bubble:hover .model-info-actions {
  opacity: 1;
}

.token-usage {
  opacity: 0.7;
}
/* 
.ai-message-toolbar {
  position: absolute;
  bottom: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 6px;
  padding: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(4px);
}

.ai-message:hover .ai-message-toolbar {
  opacity: 1;
} */

/* .toolbar-btn {
  width: 28px !important;
  height: 28px !important;
  padding: 0 !important;
  border-radius: 4px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  color: var(--custom-text-secondary) !important;
  transition: all 0.2s ease !important;
}

.toolbar-btn:hover {
  background: var(--primary-color) !important;
  color: white !important;
  transform: scale(1.05);
}

.toolbar-btn:active {
  transform: scale(0.95);
} */

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
</style>

<template>
  <div
    class="message-bubble"
    :class="{
      'user-message': message.role === 'user',
      'ai-message': message.role === 'assistant',
      'system-message': message.role === 'system',
    }">
    <!-- 消息頭部信息 -->
    <!--
    <div class="message-header">
       <div class="message-avatar">
        <a-avatar
          v-if="message.role === 'user'"
          :size="32"
          :style="{ backgroundColor: '#1890ff' }">
          <UserOutlined />
        </a-avatar>
        <a-avatar
          v-else-if="message.role === 'assistant'"
          :size="32"
          :style="{ backgroundColor: '#52c41a' }">
          <RobotOutlined />
        </a-avatar>
        <a-avatar
          v-else
          :size="32"
          :style="{ backgroundColor: '#faad14' }">
          <InfoCircleOutlined />
        </a-avatar>
      </div> -->
    <!-- TODO: 先暫時隱藏 -->
    <!-- <div class="message-info">
        <div class="message-sender">
          {{ getSenderName() }}
        </div>
        <div class="message-time">
          {{ formatTime(message.created_at) }}
        </div>
      </div> 


      
    </div> -->

    <!-- 消息內容 TODO:TEST-->
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

      <!-- 主要內容 -->
      <div class="message-text">
        <!-- AI 消息使用 CodeHighlight 組件 -->
        <CodeHighlight
          v-if="message.role === 'assistant'"
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
        <!-- 展開/收起按鈕（僅用戶消息） -->
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
        <a-tag :color="getModelColor('gemini')">
          {{ message.model_info.model || "Unknown Model" }}
        </a-tag>
        <span class="token-usage"> Token: {{ message.tokens_used || 0 }} </span>
        <span
          class="cost-info"
          v-if="message.cost && parseFloat(message.cost) > 0">
          Cost: ${{ parseFloat(message.cost).toFixed(6) }}
        </span>
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

      <div
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

        <a-tooltip
          v-if="message.role === 'assistant'"
          title="重新生成">
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
import { computed, ref, nextTick, onMounted, onUnmounted } from "vue";
import { message as antMessage } from "ant-design-vue";
import { useChatStore } from "@/stores/chat";
import { useConfigStore } from "@/stores/config";
import { formatMessageTime } from "@/utils/datetimeFormat";
import { getFilePreviewUrl, getImageBlobUrl } from "@/api/files";
import CodeHighlight from "@/components/common/CodeHighlight.vue";

// Props
const props = defineProps({
  message: {
    type: Object,
    required: true,
  },
  showStatus: {
    type: Boolean,
    default: false,
  },
});

// Emits
const emit = defineEmits(["quote-message", "regenerate-response"]);

// Store
const chatStore = useChatStore();
const configStore = useConfigStore();

// 響應式狀態
const userMessageContent = ref(null);
const isUserMessageCollapsed = ref(true);
const shouldShowExpandButton = ref(false);
const codeHighlightRef = ref(null);

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

// 檢查用戶消息是否需要展開按鈕
const checkUserMessageHeight = async () => {
  await nextTick();
  if (userMessageContent.value) {
    const element = userMessageContent.value;
    const lineHeight = parseInt(window.getComputedStyle(element).lineHeight);
    const maxHeight = lineHeight * MAX_USER_MESSAGE_LINES;

    // 如果內容高度超過最大高度，顯示展開按鈕
    if (element.scrollHeight > maxHeight) {
      shouldShowExpandButton.value = true;
    }
  }
};

// 切換用戶消息展開/收起
const toggleUserMessageExpand = () => {
  isUserMessageCollapsed.value = !isUserMessageCollapsed.value;
};

// 計算屬性
const getSenderName = () => {
  switch (props.message.role) {
    case "user":
      return "用戶";
    case "assistant":
      return props.message.agent_name || "AI助手";
    case "system":
      return "系統";
    default:
      return "未知";
  }
};

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

.system-message {
  background: #fff7e6;
  border: 1px solid #ffd591;
  margin: 0 auto;
  text-align: center;
  max-width: 60%;
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
  transition: opacity 0.2s;
  position: absolute;
  bottom: -35px;
  right: -10px;
  display: flex;
  gap: 4px;
  margin-top: 10px;
}

.ai-message .message-actions,
.message-bubble:hover .message-actions {
  background: var(--custom-bg-secondary);
  border: 1px solid var(--custom-border-primary);
  border-radius: 6px;
  opacity: 1;
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

.model-info {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
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
</style>

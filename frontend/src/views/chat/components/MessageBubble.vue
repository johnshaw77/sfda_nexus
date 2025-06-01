<template>
  <div
    class="message-bubble"
    :class="{
      'user-message': message.role === 'user',
      'ai-message': message.role === 'assistant',
      'system-message': message.role === 'system',
    }">
    <!-- 消息頭部信息 -->
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
      </div>

      <div class="message-info">
        <div class="message-sender">
          {{ getSenderName() }}
        </div>
        <div class="message-time">
          {{ formatTime(message.created_at) }}
        </div>
      </div>

      <!-- 消息操作按鈕 -->
      <div class="message-actions">
        <a-dropdown
          :trigger="['click']"
          placement="bottomRight">
          <a-button
            type="text"
            size="small">
            <MoreOutlined />
          </a-button>
          <template #overlay>
            <a-menu>
              <a-menu-item @click="handleCopyMessage">
                <CopyOutlined />
                複製消息
              </a-menu-item>
              <a-menu-item
                v-if="message.role === 'assistant'"
                @click="handleRegenerateResponse">
                <ReloadOutlined />
                重新生成
              </a-menu-item>
              <a-menu-item @click="handleQuoteMessage">
                <MessageOutlined />
                引用回覆
              </a-menu-item>
              <a-menu-divider />
              <a-menu-item
                @click="handleDeleteMessage"
                class="danger-item">
                <DeleteOutlined />
                刪除消息
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>
    </div>

    <!-- 消息內容 -->
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
        <!-- Markdown 渲染 -->
        <div
          v-if="message.role === 'assistant'"
          class="markdown-content"
          v-html="renderMarkdown(message.content)"></div>
        <!-- 純文本 -->
        <div
          v-else
          class="plain-text">
          {{ message.content }}
        </div>
      </div>

      <!-- 附件 -->
      <div
        v-if="message.attachments && message.attachments.length > 0"
        class="message-attachments">
        <div
          v-for="attachment in message.attachments"
          :key="attachment.id"
          class="attachment-item"
          @click="handleViewAttachment(attachment)">
          <div class="attachment-icon">
            <FileOutlined v-if="attachment.type === 'file'" />
            <PictureOutlined v-else-if="attachment.type === 'image'" />
            <VideoCameraOutlined v-else-if="attachment.type === 'video'" />
            <AudioOutlined v-else-if="attachment.type === 'audio'" />
            <FileOutlined v-else />
          </div>
          <div class="attachment-info">
            <div class="attachment-name">{{ attachment.name }}</div>
            <div class="attachment-size">
              {{ formatFileSize(attachment.size) }}
            </div>
          </div>
        </div>
      </div>

      <!-- AI 模型信息 -->
      <div
        v-if="message.role === 'assistant' && message.model_info"
        class="model-info">
        <a-tag :color="getModelColor(message.model_info.provider)">
          {{ message.model_info.name }}
        </a-tag>
        <span class="token-usage">
          Token: {{ message.model_info.tokens_used || 0 }}
        </span>
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
import { computed } from "vue";
import { message } from "ant-design-vue";
import {
  UserOutlined,
  RobotOutlined,
  InfoCircleOutlined,
  MoreOutlined,
  CopyOutlined,
  ReloadOutlined,
  MessageOutlined,
  DeleteOutlined,
  FileOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  AudioOutlined,
  CheckOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons-vue";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { useChatStore } from "@/stores/chat";
import { formatMessageTime } from "@/utils/datetimeFormat";

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

// 方法
const formatTime = formatMessageTime;

const renderMarkdown = (content) => {
  try {
    // 配置 marked
    marked.setOptions({
      breaks: true,
      gfm: true,
      highlight: function (code, lang) {
        // 這裡可以集成代碼高亮庫，如 highlight.js
        return `<pre><code class="language-${lang}">${code}</code></pre>`;
      },
    });

    const html = marked(content);
    return DOMPurify.sanitize(html);
  } catch (error) {
    console.error("Markdown 渲染失敗:", error);
    return content;
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
    message.success("消息已複製到剪貼板");
  } catch (error) {
    message.error("複製失敗");
    console.error("複製失敗:", error);
  }
};

const handleRegenerateResponse = () => {
  emit("regenerate-response", props.message);
};

const handleQuoteMessage = () => {
  emit("quote-message", props.message);
};

const handleDeleteMessage = async () => {
  try {
    await chatStore.handleDeleteMessage(props.message.id);
    message.success("消息已刪除");
  } catch (error) {
    message.error("刪除失敗");
    console.error("刪除失敗:", error);
  }
};

const handleViewAttachment = (attachment) => {
  // 處理附件查看邏輯
  if (attachment.type === "image") {
    // 打開圖片預覽
    window.open(attachment.url, "_blank");
  } else {
    // 下載文件
    const link = document.createElement("a");
    link.href = attachment.url;
    link.download = attachment.name;
    link.click();
  }
};
</script>

<style scoped>
.message-bubble {
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: 12px;
  position: relative;
  max-width: 80%;
  word-wrap: break-word;
}

.user-message {
  background: #1890ff;
  color: white;
  margin-left: auto;
  border-bottom-right-radius: 4px;
}

.ai-message {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  margin-right: auto;
  border-bottom-left-radius: 4px;
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
  color: rgba(255, 255, 255, 0.9);
}

.message-time {
  font-size: 12px;
  opacity: 0.7;
}

.message-actions {
  opacity: 0;
  transition: opacity 0.2s;
}

.message-bubble:hover .message-actions {
  opacity: 1;
}

.user-message .message-actions :deep(.ant-btn) {
  color: rgba(255, 255, 255, 0.8);
}

.user-message .message-actions :deep(.ant-btn:hover) {
  color: white;
  background: rgba(255, 255, 255, 0.1);
}

.message-content {
  line-height: 1.6;
}

.quoted-message {
  background: rgba(0, 0, 0, 0.05);
  border-left: 3px solid #1890ff;
  padding: 8px 12px;
  margin-bottom: 8px;
  border-radius: 4px;
}

.user-message .quoted-message {
  background: rgba(255, 255, 255, 0.1);
  border-left-color: rgba(255, 255, 255, 0.5);
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
  font-size: 14px;
}

.markdown-content {
  /* Markdown 樣式 */
}

.markdown-content :deep(pre) {
  background: #f6f8fa;
  border-radius: 6px;
  padding: 12px;
  overflow-x: auto;
  margin: 8px 0;
}

.markdown-content :deep(code) {
  background: #f6f8fa;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
}

.markdown-content :deep(blockquote) {
  border-left: 4px solid #dfe2e5;
  padding-left: 16px;
  margin: 8px 0;
  color: #6a737d;
}

.markdown-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 8px 0;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  border: 1px solid #dfe2e5;
  padding: 6px 13px;
  text-align: left;
}

.markdown-content :deep(th) {
  background: #f6f8fa;
  font-weight: 600;
}

.plain-text {
  white-space: pre-wrap;
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
  background: rgba(255, 255, 255, 0.1);
}

.user-message .attachment-item:hover {
  background: rgba(255, 255, 255, 0.2);
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

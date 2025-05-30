<template>
  <div class="chat-area">
    <!-- 聊天頭部 -->
    <div class="chat-area-header">
      <div class="conversation-info">
        <h3 class="conversation-title">
          {{ chatStore.currentConversation?.title || "新對話" }}
        </h3>
        <div class="conversation-meta">
          <span class="message-count">
            {{ chatStore.currentMessages.length }} 條消息
          </span>
          <span class="last-active">
            最後活動:
            {{ formatTime(chatStore.currentConversation?.updated_at) }}
          </span>
        </div>
      </div>

      <!-- 模型選擇和設置 -->
      <div class="chat-controls">
        <a-select
          v-model:value="selectedModel"
          placeholder="選擇 AI 模型"
          style="width: 200px"
          @change="handleModelChange">
          <a-select-option
            v-for="model in availableModels"
            :key="model.id"
            :value="model.id">
            <div class="model-option">
              <span class="model-name">{{ model.name }}</span>
              <a-tag
                :color="getModelColor(model.provider)"
                size="small">
                {{ model.provider }}
              </a-tag>
            </div>
          </a-select-option>
        </a-select>

        <a-dropdown
          :trigger="['click']"
          placement="bottomRight">
          <a-button type="text">
            <SettingOutlined />
          </a-button>
          <template #overlay>
            <a-menu>
              <a-menu-item @click="handleShowSettings">
                <SettingOutlined />
                聊天設置
              </a-menu-item>
              <a-menu-item @click="handleExportConversation">
                <ExportOutlined />
                導出對話
              </a-menu-item>
              <a-menu-item @click="handleClearMessages">
                <ClearOutlined />
                清空消息
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>
    </div>

    <!-- 消息列表區域 -->
    <div
      class="messages-container"
      ref="messagesContainer">
      <a-spin
        :spinning="loading"
        tip="載入消息中...">
        <!-- 空狀態 -->
        <div
          v-if="chatStore.currentMessages.length === 0"
          class="empty-messages">
          <div class="empty-content">
            <div class="empty-icon">
              <MessageOutlined />
            </div>
            <h3>開始對話</h3>
            <p>向 AI 助手發送消息開始對話</p>

            <!-- 快速提示 -->
            <div class="quick-prompts">
              <a-button
                v-for="prompt in quickPrompts"
                :key="prompt.id"
                type="dashed"
                size="small"
                @click="handleQuickPrompt(prompt.text)">
                {{ prompt.text }}
              </a-button>
            </div>
          </div>
        </div>

        <!-- 消息列表 -->
        <div
          v-else
          class="messages-list">
          <MessageBubble
            v-for="message in chatStore.currentMessages"
            :key="message.id"
            :message="message"
            :show-status="message.id === lastSentMessageId"
            @quote-message="handleQuoteMessage"
            @regenerate-response="handleRegenerateResponse" />

          <!-- AI 輸入狀態指示器 -->
          <div
            v-if="chatStore.isAITyping"
            class="typing-indicator">
            <div class="typing-bubble">
              <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span class="typing-text">AI 正在思考中...</span>
            </div>
          </div>
        </div>
      </a-spin>
    </div>

    <!-- 消息輸入區域 -->
    <div class="message-input-area">
      <!-- 引用消息顯示 -->
      <div
        v-if="quotedMessage"
        class="quoted-message-display">
        <div class="quote-content">
          <div class="quote-header">
            <UserOutlined v-if="quotedMessage.role === 'user'" />
            <RobotOutlined v-else />
            <span
              >回覆
              {{ quotedMessage.role === "user" ? "用戶" : "AI助手" }}</span
            >
          </div>
          <div class="quote-text">
            {{ getQuotePreview(quotedMessage.content) }}
          </div>
        </div>
        <a-button
          type="text"
          size="small"
          @click="handleCancelQuote">
          <CloseOutlined />
        </a-button>
      </div>

      <!-- 輸入框 -->
      <div class="input-container">
        <div class="input-wrapper">
          <a-textarea
            v-model:value="messageText"
            placeholder="輸入消息... (Shift+Enter 換行，Enter 發送)"
            :auto-size="{ minRows: 1, maxRows: 6 }"
            :disabled="sending"
            @keydown="handleKeyDown"
            @input="handleInputChange"
            class="message-input" />

          <!-- 輸入工具欄 -->
          <div class="input-toolbar">
            <div class="toolbar-left">
              <!-- 附件上傳 -->
              <a-upload
                :show-upload-list="false"
                :before-upload="handleFileUpload"
                accept="*/*">
                <a-button
                  type="text"
                  size="small">
                  <PaperClipOutlined />
                </a-button>
              </a-upload>

              <!-- 表情符號 -->
              <a-button
                type="text"
                size="small"
                @click="handleShowEmoji">
                <SmileOutlined />
              </a-button>
            </div>

            <div class="toolbar-right">
              <!-- 字數統計 -->
              <span class="char-count">{{ messageText.length }}</span>

              <!-- 發送按鈕 -->
              <a-button
                type="primary"
                :loading="sending"
                :disabled="!messageText.trim()"
                @click="handleSendMessage">
                <SendOutlined />
              </a-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 聊天設置模態框 -->
    <a-modal
      v-model:open="settingsModalVisible"
      title="聊天設置"
      @ok="handleSaveSettings"
      @cancel="handleCancelSettings">
      <a-form layout="vertical">
        <a-form-item label="溫度 (創造性)">
          <a-slider
            v-model:value="chatSettings.temperature"
            :min="0"
            :max="2"
            :step="0.1"
            :marks="{ 0: '保守', 1: '平衡', 2: '創新' }" />
        </a-form-item>

        <a-form-item label="最大回應長度">
          <a-input-number
            v-model:value="chatSettings.maxTokens"
            :min="100"
            :max="4000"
            style="width: 100%" />
        </a-form-item>

        <a-form-item label="系統提示詞">
          <a-textarea
            v-model:value="chatSettings.systemPrompt"
            placeholder="設置 AI 的行為和角色..."
            :rows="4" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onUnmounted, watch } from "vue";
import { message } from "ant-design-vue";
import {
  MessageOutlined,
  SettingOutlined,
  ExportOutlined,
  ClearOutlined,
  UserOutlined,
  RobotOutlined,
  CloseOutlined,
  PaperClipOutlined,
  SmileOutlined,
  SendOutlined,
} from "@ant-design/icons-vue";
import { useChatStore } from "@/stores/chat";
import { useWebSocketStore } from "@/stores/websocket";
import MessageBubble from "./MessageBubble.vue";

// Store
const chatStore = useChatStore();
const wsStore = useWebSocketStore();

// 響應式狀態
const loading = ref(false);
const sending = ref(false);
const messageText = ref("");
const quotedMessage = ref(null);
const lastSentMessageId = ref(null);
const messagesContainer = ref(null);
const settingsModalVisible = ref(false);

// 模型和設置
const selectedModel = ref("");
const availableModels = ref([
  { id: "ollama-qwen", name: "Qwen 3 30B", provider: "ollama" },
  { id: "gemini-pro", name: "Gemini Pro", provider: "gemini" },
  { id: "ollama-llama", name: "Llama 3.1", provider: "ollama" },
]);

const chatSettings = ref({
  temperature: 0.7,
  maxTokens: 2000,
  systemPrompt: "",
});

// 快速提示
const quickPrompts = ref([
  { id: 1, text: "你好，請介紹一下自己" },
  { id: 2, text: "幫我分析這個問題" },
  { id: 3, text: "請提供一些建議" },
  { id: 4, text: "解釋一下這個概念" },
]);

// 方法
const formatTime = (timestamp) => {
  if (!timestamp) return "剛剛";

  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60 * 1000) return "剛剛";
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))} 分鐘前`;
  if (diff < 24 * 60 * 60 * 1000)
    return `${Math.floor(diff / (60 * 60 * 1000))} 小時前`;

  return date.toLocaleDateString("zh-TW");
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

const getQuotePreview = (content) => {
  return content.length > 100 ? content.substring(0, 100) + "..." : content;
};

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

// 事件處理
const handleModelChange = (modelId) => {
  chatStore.handleSetCurrentModel(modelId);
  message.success("已切換 AI 模型");
};

const handleSendMessage = async () => {
  if (!messageText.value.trim()) return;

  try {
    sending.value = true;
    const messageId = await chatStore.handleSendMessage(
      messageText.value.trim(),
      quotedMessage.value
    );
    lastSentMessageId.value = messageId;
    messageText.value = "";
    quotedMessage.value = null;
    scrollToBottom();
  } catch (error) {
    message.error("發送消息失敗");
    console.error("發送消息失敗:", error);
  } finally {
    sending.value = false;
  }
};

const handleKeyDown = (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    handleSendMessage();
  }
};

const handleInputChange = () => {
  // 發送輸入狀態
  wsStore.sendMessage("user_typing", {
    conversationId: chatStore.currentConversation?.id,
    isTyping: messageText.value.length > 0,
  });
};

const handleQuickPrompt = (promptText) => {
  messageText.value = promptText;
  handleSendMessage();
};

const handleQuoteMessage = (message) => {
  quotedMessage.value = message;
};

const handleCancelQuote = () => {
  quotedMessage.value = null;
};

const handleRegenerateResponse = async (message) => {
  try {
    await chatStore.handleRegenerateResponse(message.id);
    message.success("正在重新生成回應");
  } catch (error) {
    message.error("重新生成失敗");
    console.error("重新生成失敗:", error);
  }
};

const handleFileUpload = (file) => {
  // 處理文件上傳
  console.log("上傳文件:", file);
  message.info("文件上傳功能開發中");
  return false; // 阻止自動上傳
};

const handleShowEmoji = () => {
  message.info("表情符號功能開發中");
};

const handleShowSettings = () => {
  settingsModalVisible.value = true;
};

const handleSaveSettings = () => {
  chatStore.handleUpdateChatSettings(chatSettings.value);
  settingsModalVisible.value = false;
  message.success("設置已保存");
};

const handleCancelSettings = () => {
  settingsModalVisible.value = false;
};

const handleExportConversation = async () => {
  try {
    await chatStore.handleExportConversation(chatStore.currentConversation.id);
    message.success("對話已導出");
  } catch (error) {
    message.error("導出失敗");
    console.error("導出失敗:", error);
  }
};

const handleClearMessages = async () => {
  try {
    await chatStore.handleClearMessages(chatStore.currentConversation.id);
    message.success("消息已清空");
  } catch (error) {
    message.error("清空失敗");
    console.error("清空失敗:", error);
  }
};

// 監聽消息變化，自動滾動到底部
watch(
  () => chatStore.currentMessages.length,
  () => {
    scrollToBottom();
  }
);

// 監聽 AI 輸入狀態變化
watch(
  () => chatStore.isAITyping,
  (isTyping) => {
    if (isTyping) {
      scrollToBottom();
    }
  }
);

// 生命週期
onMounted(async () => {
  try {
    loading.value = true;

    // 載入當前對話的消息
    if (chatStore.currentConversation) {
      await chatStore.handleLoadMessages(chatStore.currentConversation.id);
    }

    // 載入可用模型
    await chatStore.handleLoadAvailableModels();

    // 設置默認模型
    if (chatStore.availableModels.length > 0) {
      selectedModel.value =
        chatStore.currentModel || chatStore.availableModels[0].id;
    }

    scrollToBottom();
  } catch (error) {
    message.error("載入聊天數據失敗");
    console.error("載入聊天數據失敗:", error);
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  // 清理輸入狀態
  if (wsStore.isConnected) {
    wsStore.sendMessage("user_typing", {
      conversationId: chatStore.currentConversation?.id,
      isTyping: false,
    });
  }
});
</script>

<style scoped>
.chat-area {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.chat-area-header {
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fafafa;
}

.conversation-info {
  flex: 1;
  min-width: 0;
}

.conversation-title {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #666;
}

.chat-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.model-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.model-name {
  flex: 1;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
  background: #f8f9fa;
}

.empty-messages {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-content {
  text-align: center;
  max-width: 400px;
}

.empty-icon {
  font-size: 48px;
  color: #d9d9d9;
  margin-bottom: 16px;
}

.empty-content h3 {
  font-size: 20px;
  margin-bottom: 8px;
  color: #1a1a1a;
}

.empty-content p {
  color: #666;
  margin-bottom: 24px;
}

.quick-prompts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.typing-indicator {
  display: flex;
  justify-content: flex-start;
  margin-top: 8px;
}

.typing-bubble {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 12px;
  border-bottom-left-radius: 4px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 200px;
}

.typing-dots {
  display: flex;
  gap: 4px;
}

.typing-dots span {
  width: 6px;
  height: 6px;
  background: #52c41a;
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

.typing-text {
  font-size: 12px;
  color: #666;
}

@keyframes typing {
  0%,
  80%,
  100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.message-input-area {
  border-top: 1px solid #f0f0f0;
  background: #fff;
}

.quoted-message-display {
  padding: 12px 24px;
  background: #f6ffed;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.quote-content {
  flex: 1;
  min-width: 0;
}

.quote-header {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #52c41a;
  margin-bottom: 4px;
}

.quote-text {
  font-size: 13px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.input-container {
  padding: 16px 24px;
}

.input-wrapper {
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 0.2s;
}

.input-wrapper:focus-within {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.message-input {
  border: none !important;
  box-shadow: none !important;
  resize: none;
  padding: 12px 16px 0 16px;
}

.message-input:focus {
  border: none !important;
  box-shadow: none !important;
}

.input-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #fafafa;
  border-top: 1px solid #f0f0f0;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.char-count {
  font-size: 12px;
  color: #999;
}

/* 滾動條樣式 */
.messages-container::-webkit-scrollbar {
  width: 6px;
}

.messages-container::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.messages-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .chat-area-header {
    padding: 12px 16px;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .conversation-meta {
    flex-direction: column;
    gap: 4px;
  }

  .chat-controls {
    width: 100%;
    justify-content: space-between;
  }

  .messages-container {
    padding: 12px 16px;
  }

  .input-container {
    padding: 12px 16px;
  }

  .quoted-message-display {
    padding: 8px 16px;
  }
}
</style>

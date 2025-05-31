<template>
  <div class="chat-area">
    <!-- 聊天頭部 -->
    <div class="chat-area-header">
      <div class="conversation-info">
        <!-- 智能體信息 -->
        <div
          v-if="agent"
          class="agent-info">
          <div class="agent-avatar">
            <!-- 如果有 base64 avatar，直接顯示圖片 -->
            <img
              v-if="
                agent.avatar &&
                typeof agent.avatar === 'string' &&
                agent.avatar.startsWith('data:')
              "
              :src="agent.avatar"
              :alt="agent.name"
              class="avatar-image" />
            <!-- 沒有 avatar 時使用漸變背景 -->
            <div
              v-else
              class="avatar-bg"
              :style="{
                background:
                  agent.gradient ||
                  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }">
              <svg
                v-if="agent.icon"
                class="agent-icon"
                viewBox="0 0 24 24"
                width="20"
                height="20">
                <path
                  fill="white"
                  :d="agent.icon" />
              </svg>
              <span
                v-else
                class="agent-initial"
                >{{ agent.name.charAt(0) }}</span
              >
            </div>
            <div
              class="status-dot"
              :class="agent.status"></div>
          </div>
          <div class="agent-details">
            <h3 class="agent-name">{{ agent.name }}</h3>
            <p class="agent-description">{{ agent.description }}</p>
          </div>
        </div>

        <!-- 對話信息 -->
        <div
          v-else
          class="conversation-title-section">
          <h3 class="conversation-title">
            {{ chatStore.currentConversation?.title || "新對話" }}
          </h3>
          <div class="conversation-meta">
            <span class="message-count">
              {{ chatStore.messages.length }} 條消息
            </span>
            <span class="last-active">
              最後活動:
              {{ formatTime(chatStore.currentConversation?.updated_at) }}
            </span>
          </div>
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
          v-if="chatStore.messages.length === 0"
          class="empty-messages">
          <div class="empty-content">
            <div class="empty-icon">
              <div
                class="agent-avatar-large"
                v-if="agent">
                <!-- 如果有 base64 avatar，直接顯示圖片 -->
                <img
                  v-if="
                    agent.avatar &&
                    typeof agent.avatar === 'string' &&
                    agent.avatar.startsWith('data:')
                  "
                  :src="agent.avatar"
                  :alt="agent.name"
                  class="avatar-image-large" />
                <!-- 沒有 avatar 時使用漸變背景 -->
                <div
                  v-else
                  class="avatar-bg"
                  :style="{
                    background:
                      agent.gradient ||
                      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  }">
                  <svg
                    v-if="agent.icon"
                    class="agent-icon"
                    viewBox="0 0 24 24"
                    width="32"
                    height="32">
                    <path
                      fill="white"
                      :d="agent.icon" />
                  </svg>
                  <span
                    v-else
                    class="agent-initial"
                    >{{ agent.name.charAt(0) }}</span
                  >
                </div>
              </div>
              <MessageOutlined v-else />
            </div>
            <h3>{{ agent ? `與 ${agent.name} 開始對話` : "開始對話" }}</h3>
            <p>
              {{
                agent
                  ? `${agent.name} 專精於 ${agent.tags?.join("、")}`
                  : "向 AI 助手發送消息開始對話"
              }}
            </p>

            <!-- 快速提示 -->
            <div class="quick-prompts">
              <a-button
                v-for="prompt in getQuickPrompts()"
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
            v-for="message in chatStore.messages"
            :key="message.id"
            :message="message"
            :show-status="message.id === lastSentMessageId"
            @quote-message="handleQuoteMessage"
            @regenerate-response="handleRegenerateResponse" />

          <!-- AI 輸入狀態指示器 -->
          <div
            v-if="chatStore.aiTyping"
            class="typing-indicator">
            <div class="typing-bubble">
              <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span class="typing-text"
                >{{ agent?.name || "AI" }} 正在思考中...</span
              >
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
              {{
                quotedMessage.role === "user" ? "用戶" : agent?.name || "AI助手"
              }}</span
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
            :placeholder="`向 ${agent?.name || 'AI助手'} 發送消息... (Shift+Enter 換行，Enter 發送)`"
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
                @click="handleSendMessage"
                class="send-button">
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

// Props
const props = defineProps({
  agent: {
    type: Object,
    default: null,
  },
});

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
  // chatStore.handleSetCurrentModel(modelId);
  selectedModel.value = modelId;
  message.success("已切換 AI 模型");
};

const handleSendMessage = async () => {
  if (!messageText.value.trim()) return;

  try {
    sending.value = true;

    // 如果沒有當前對話，先創建一個
    let conversationId = chatStore.currentConversation?.id;
    if (!conversationId) {
      const newConversation = await chatStore.handleCreateConversation({
        title: messageText.value.trim().substring(0, 50),
        agent_id: props.agent?.id,
      });
      conversationId = newConversation?.id;
    }

    if (conversationId) {
      const result = await chatStore.handleSendMessage(
        conversationId,
        messageText.value.trim(),
        {
          quotedMessage: quotedMessage.value,
          temperature: chatSettings.value.temperature,
          maxTokens: chatSettings.value.maxTokens,
        }
      );

      if (result) {
        lastSentMessageId.value = result.user_message?.id;
        messageText.value = "";
        quotedMessage.value = null;
        scrollToBottom();
      }
    }
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
  wsStore.handleSendTypingStatus(
    chatStore.currentConversation?.id,
    messageText.value.length > 0
  );
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
    // await chatStore.handleRegenerateResponse(message.id);
    message.success("重新生成功能開發中");
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
  // chatStore.handleUpdateChatSettings(chatSettings.value);
  settingsModalVisible.value = false;
  message.success("設置已保存");
};

const handleCancelSettings = () => {
  settingsModalVisible.value = false;
};

const handleExportConversation = async () => {
  try {
    // await chatStore.handleExportConversation(chatStore.currentConversation.id);
    message.success("導出功能開發中");
  } catch (error) {
    message.error("導出失敗");
    console.error("導出失敗:", error);
  }
};

const handleClearMessages = async () => {
  try {
    // await chatStore.handleClearMessages(chatStore.currentConversation.id);
    message.success("清空功能開發中");
  } catch (error) {
    message.error("清空失敗");
    console.error("清空失敗:", error);
  }
};

// 根據智能體獲取快速提示
const getQuickPrompts = () => {
  if (!props.agent) {
    return quickPrompts.value;
  }

  // 根據智能體類型返回不同的快速提示
  const agentPrompts = {
    1: [
      // Arthur - 教育
      { id: 1, text: "解釋一個複雜的概念" },
      { id: 2, text: "幫我學習新知識" },
      { id: 3, text: "分析這個問題" },
    ],
    2: [
      // Fred - 體育
      { id: 1, text: "分析球隊表現" },
      { id: 2, text: "預測比賽結果" },
      { id: 3, text: "球員數據分析" },
    ],
    3: [
      // Nikki - 營養
      { id: 1, text: "制定健康飲食計劃" },
      { id: 2, text: "分析營養成分" },
      { id: 3, text: "推薦健康食譜" },
    ],
    4: [
      // Rich - 金融
      { id: 1, text: "投資建議" },
      { id: 2, text: "理財規劃" },
      { id: 3, text: "市場分析" },
    ],
    5: [
      // Travis - 旅遊
      { id: 1, text: "規劃旅行路線" },
      { id: 2, text: "推薦旅遊景點" },
      { id: 3, text: "酒店預訂建議" },
    ],
    6: [
      // Libby - 閱讀
      { id: 1, text: "推薦好書" },
      { id: 2, text: "書籍評論" },
      { id: 3, text: "閱讀計劃" },
    ],
    7: [
      // Bizzy - 商業
      { id: 1, text: "商業策略分析" },
      { id: 2, text: "市場調研" },
      { id: 3, text: "商業計劃書" },
    ],
  };

  return agentPrompts[props.agent.id] || quickPrompts.value;
};

// 監聽消息變化，自動滾動到底部
watch(
  () => chatStore.messages.length,
  () => {
    scrollToBottom();
  }
);

// 監聽 AI 輸入狀態變化
watch(
  () => chatStore.aiTyping,
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
      await chatStore.handleGetMessages(chatStore.currentConversation.id);
    }

    // 載入可用模型
    await chatStore.handleGetAvailableModels();

    // 設置默認模型
    if (
      chatStore.availableModels &&
      Object.keys(chatStore.availableModels).length > 0
    ) {
      // 從 ollama 或 gemini 中選擇第一個可用模型
      const allModels = [
        ...(chatStore.availableModels.ollama || []),
        ...(chatStore.availableModels.gemini || []),
      ];
      if (allModels.length > 0) {
        selectedModel.value = allModels[0].id || allModels[0];
      }
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
    wsStore.handleSendTypingStatus(chatStore.currentConversation?.id, false);
  }
});
</script>

<style scoped>
.chat-area {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--custom-bg-primary);
}

.chat-area-header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--custom-border-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--custom-bg-secondary);
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
  color: var(--custom-text-primary);
}

.conversation-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--custom-text-secondary);
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
  background: var(--custom-bg-secondary);
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
  color: var(--custom-text-tertiary);
  margin-bottom: 16px;
}

.empty-content h3 {
  font-size: 20px;
  margin-bottom: 8px;
  color: var(--custom-text-primary);
}

.empty-content p {
  color: var(--custom-text-secondary);
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
  background: var(--custom-bg-tertiary);
  border: 1px solid var(--success-color);
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
  background: var(--success-color);
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
  color: var(--custom-text-secondary);
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
  border-top: 1px solid var(--custom-border-primary);
  background: var(--custom-bg-primary);
}

.quoted-message-display {
  padding: 12px 24px;
  background: var(--custom-bg-tertiary);
  border-bottom: 1px solid var(--custom-border-primary);
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
  color: var(--success-color);
  margin-bottom: 4px;
}

.quote-text {
  font-size: 13px;
  color: var(--custom-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.input-container {
  padding: 16px 24px;
}

.input-wrapper {
  border: 1px solid var(--custom-border-primary);
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 0.2s;
  background: var(--custom-bg-primary);
}

.input-wrapper:focus-within {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.message-input {
  border: none !important;
  box-shadow: none !important;
  resize: none;
  padding: 12px 16px 0 16px;
  background: var(--custom-bg-primary);
  color: var(--custom-text-primary);
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
  background: var(--custom-bg-tertiary);
  border-top: 1px solid var(--custom-border-primary);
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.char-count {
  font-size: 12px;
  color: var(--custom-text-tertiary);
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

/* 智能體信息樣式 */
.agent-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.agent-avatar {
  position: relative;
  flex-shrink: 0;
}

.agent-avatar .avatar-image {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  object-fit: cover;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.agent-avatar .avatar-bg {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.agent-avatar .agent-icon {
  width: 20px;
  height: 20px;
}

.agent-avatar .agent-initial {
  font-size: 16px;
  font-weight: 600;
}

.agent-avatar .status-dot {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.status-dot.online {
  background: #48bb78;
}

.status-dot.away {
  background: #ed8936;
}

.status-dot.offline {
  background: #a0aec0;
}

.agent-details {
  flex: 1;
  min-width: 0;
}

.agent-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--custom-text-primary);
  margin: 0 0 4px 0;
}

.agent-description {
  font-size: 13px;
  color: var(--custom-text-secondary);
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.conversation-title-section .conversation-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--custom-text-primary);
}

/* 空狀態智能體頭像 */
.agent-avatar-large {
  margin: 0 auto 16px;
}

.agent-avatar-large .avatar-image-large {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  object-fit: cover;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.agent-avatar-large .avatar-bg {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.agent-avatar-large .agent-icon {
  width: 32px;
  height: 32px;
}

.agent-avatar-large .agent-initial {
  font-size: 32px;
  font-weight: 600;
}
</style>

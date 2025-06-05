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
                >{{ agent.display_name.charAt(0) }}</span
              >
            </div>
            <!-- <div
              class="status-dot"
              :class="agent.status"></div> -->
          </div>
          <div class="agent-details">
            <h3 class="agent-name">{{ agent.display_name }}</h3>
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
        <!-- <a-select
          v-model:value="selectedModel"
          placeholder="選擇 AI 模型"
          style="width: 200px"
          @change="handleModelChange"
          :loading="chatStore.isLoading">
          <a-select-option
            v-for="model in availableModels"
            :key="model.id"
            :value="model.id"
            :disabled="model.available === false">
            <div class="model-option">
              <span class="model-name">{{ model.name }}</span>
              <a-tag
                :color="getModelColor(model.provider)"
                size="small">
                {{ model.provider }}
              </a-tag>
              <a-tag
                v-if="model.available === false"
                color="red"
                size="small">
                不可用
              </a-tag>
            </div>
          </a-select-option>
        </a-select> -->

        <!-- 串流模式切換 -->
        <a-tooltip
          title="啟用後將使用類似 ChatGPT 的逐字顯示效果"
          :arrow="false"
          placement="bottom">
          <a-switch
            v-model:checked="useStreamMode"
            checked-children="串流"
            un-checked-children="普通"
            class="stream-toggle" />
        </a-tooltip>

        <a-dropdown
          :trigger="['click']"
          placement="bottomRight">
          <a-tooltip
            title="聊天設置"
            :arrow="false"
            placement="bottom">
            <a-button type="text">
              <SettingOutlined />
            </a-button>
          </a-tooltip>
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
      ref="messagesContainer"
      :style="{ height: `calc(100% - ${inputAreaHeight}px)` }">
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
                    >{{ agent.display_name.charAt(0) }}</span
                  >
                </div>
              </div>
              <MessageOutlined v-else />
            </div>
            <h3>
              {{ agent ? `與 ${agent.display_name} 開始對話` : "開始對話" }}
            </h3>
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
            v-if="chatStore.aiTyping && !hasStartedReceivingAIResponse"
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

          <!-- 停止對話按鈕 -->
          <div
            v-if="isAIResponding"
            class="stop-stream-container">
            <a-button
              type="default"
              danger
              @click="handleStopStream"
              class="stop-stream-button">
              <template #icon>
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="currentColor">
                  <rect
                    x="6"
                    y="6"
                    width="12"
                    height="12"
                    rx="2" />
                </svg>
              </template>
              停止對話
            </a-button>
          </div>
        </div>
      </a-spin>
    </div>

    <!-- 可拖拉的分隔線 -->
    <div
      class="resize-handle"
      @mousedown="handleResizeStart"
      :class="{ 'is-resizing': isResizing }">
      <div class="resize-indicator">
        <div class="resize-dots"></div>
      </div>
    </div>

    <!-- 消息輸入區域 -->
    <div
      class="message-input-area"
      :style="{ height: `${inputAreaHeight}px` }">
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
          <!-- 調整大小按鈕 -->
          <div class="resize-buttons">
            <a-tooltip
              title="放大輸入區域"
              placement="topLeft"
              :arrow="false">
              <a-button
                type="text"
                size="small"
                @click="handleExpandInput"
                :disabled="inputAreaHeight >= maxInputHeight"
                class="resize-btn">
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14">
                  <path
                    fill="currentColor"
                    d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                </svg>
              </a-button>
            </a-tooltip>
            <a-tooltip
              title="縮小輸入區域"
              placement="topLeft"
              :arrow="false">
              <a-button
                type="text"
                size="small"
                @click="handleShrinkInput"
                :disabled="inputAreaHeight <= minInputHeight"
                class="resize-btn">
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14">
                  <path
                    fill="currentColor"
                    d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                </svg>
              </a-button>
            </a-tooltip>
          </div>

          <a-textarea
            ref="messageInput"
            :value="messageText"
            @input="
              (e) => {
                messageText = e.target.value;
                handleInputChange(e);
              }
            "
            :placeholder="`向 ${agent?.name || 'AI助手'} 發送消息... (Shift+Enter 換行，Enter 發送)`"
            :auto-size="false"
            :disabled="sending"
            @keydown="handleKeyDown"
            :style="{ height: `${textareaHeight}px` }"
            class="message-input" />

          <!-- 輸入工具欄 -->
          <div class="input-toolbar">
            <div class="toolbar-left">
              <ModelSelector
                v-model:modelValue="selectedModel"
                @change="handleModelChange" />
              <!-- 新對話按鈕 -->
              <a-button
                type="text"
                size="small"
                @click="handleCreateNewConversation"
                :loading="creatingNewConversation">
                <PlusOutlined />
                新對話
              </a-button>

              <!-- 即時渲染切換 -->
              <a-tooltip
                :title="
                  configStore.chatSettings.useRealtimeRender
                    ? '當前：即時渲染模式 - 串流過程中即時顯示內容'
                    : '當前：等待渲染模式 - 串流結束後一次性渲染'
                "
                placement="top">
                <a-button
                  type="text"
                  size="small"
                  @click="handleToggleRealtimeRender"
                  :class="{
                    'active-toggle': configStore.chatSettings.useRealtimeRender,
                  }">
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="currentColor">
                    <path
                      v-if="configStore.chatSettings.useRealtimeRender"
                      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    <path
                      v-else
                      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z M12 15.4l-3.76 2-0.7-4.2-3-2.9 4.2-0.6L12 6.1l1.9 3.8 4.2 0.6-3 2.9-0.7 4.2L12 15.4z" />
                  </svg>
                  {{
                    configStore.chatSettings.useRealtimeRender ? "即時" : "等待"
                  }}
                </a-button>
              </a-tooltip>

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
              <!-- <span class="char-count">{{ messageText.length }}</span> -->

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

    <!-- 智能體選單 -->
    <div
      v-if="showAgentMenu"
      class="agent-mention-menu"
      :style="{
        position: 'fixed',
        top: agentMenuPosition.top + 'px',
        left: agentMenuPosition.left + 'px',
        zIndex: 1000,
      }">
      <div class="agent-menu-list">
        <div
          v-for="agent in availableAgents"
          :key="agent.id"
          class="agent-menu-item"
          @click="handleSelectAgent(agent)">
          <div class="agent-avatar-small">
            <!-- 如果有 base64 avatar，直接顯示圖片 -->
            <img
              v-if="
                agent.avatar &&
                typeof agent.avatar === 'string' &&
                agent.avatar.startsWith('data:')
              "
              :src="agent.avatar"
              :alt="agent.name"
              class="avatar-image-small" />
            <!-- 沒有 avatar 時使用漸變背景和首字母 -->
            <span
              v-else
              class="agent-initial-small">
              {{
                agent.display_name?.charAt(0) || agent.name?.charAt(0) || "?"
              }}
            </span>
          </div>
          <div class="agent-info-small">
            <div class="agent-name-small">{{ agent.display_name }}</div>
            <div class="agent-desc-small">{{ agent.description }}</div>
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
            :max="16384"
            style="width: 100%" />
        </a-form-item>

        <a-form-item label="系統提示詞">
          <div style="display: flex; flex-direction: column; gap: 8px">
            <div
              style="
                display: flex;
                justify-content: space-between;
                align-items: center;
              ">
              <span
                style="font-size: 14px; color: var(--custom-text-secondary)">
                {{
                  props.agent
                    ? `${props.agent.name} 的系統提示詞`
                    : "全域系統提示詞"
                }}
              </span>
              <a-button
                v-if="props.agent"
                type="link"
                size="small"
                @click="handleResetToDefaultPrompt">
                恢復默認
              </a-button>
            </div>
            <a-textarea
              v-model:value="chatSettings.systemPrompt"
              placeholder="設置 AI 的行為和角色..."
              :rows="14" />
          </div>
        </a-form-item>

        <a-form-item label="字體大小">
          <a-input-number
            v-model:value="chatSettings.fontSize"
            :min="12"
            :max="20"
            :step="1"
            style="width: 100%"
            :formatter="(value) => `${value}px`"
            :parser="(value) => value.replace('px', '')" />
          <div
            style="
              margin-top: 4px;
              font-size: 12px;
              color: var(--custom-text-secondary);
            ">
            調整聊天消息的字體大小 (12-20px)
          </div>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from "vue";
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
  PlusOutlined,
} from "@ant-design/icons-vue";
import { useChatStore } from "@/stores/chat";
import { useWebSocketStore } from "@/stores/websocket";
import { useConfigStore } from "@/stores/config";
import MessageBubble from "./MessageBubble.vue";
import ModelSelector from "./ModelSelector.vue";
import { formatMessageTime } from "@/utils/datetimeFormat";
import {
  getAgentQuickCommands,
  incrementCommandUsage,
} from "@/api/quickCommands";

// Store
const chatStore = useChatStore();
const wsStore = useWebSocketStore();
const configStore = useConfigStore();

// 響應式狀態
const loading = ref(false);
const sending = ref(false);
const messageText = ref("");
const quotedMessage = ref(null);
const lastSentMessageId = ref(null);
const messagesContainer = ref(null);
const messageInput = ref(null);
const settingsModalVisible = ref(false);
const showAgentMenu = ref(false);
const agentMenuPosition = ref({ top: 0, left: 0 });
const inputAreaHeight = ref(300);
const isResizing = ref(false);
const minInputHeight = 200;
const maxInputHeight = 600;
const creatingNewConversation = ref(false);
const agentQuickCommands = ref([]);
const loadingQuickCommands = ref(false);

// 計算 textarea 的高度
const textareaHeight = computed(() => {
  // 輸入區域總高度 - 引用消息區域高度 - 工具欄高度 - 內邊距
  const quotedHeight = quotedMessage.value ? 60 : 0; // 引用消息區域高度
  const toolbarHeight = 60; // 工具欄高度
  const padding = 48; // 上下內邊距
  return Math.max(
    60,
    inputAreaHeight.value - quotedHeight - toolbarHeight - padding
  );
});

// 判斷是否正在AI回應中
const isAIResponding = computed(() => {
  return (
    sending.value ||
    chatStore.isStreaming ||
    chatStore.isSendingMessage ||
    chatStore.aiTyping
  );
});

// 判斷當前對話是否已開始接收AI回應（用於控制思考狀態）
const hasStartedReceivingAIResponse = computed(() => {
  // 檢查最後一條消息是否是AI回應且是當前發送會話的回應
  const lastMessage = chatStore.messages[chatStore.messages.length - 1];
  const secondLastMessage = chatStore.messages[chatStore.messages.length - 2];

  // 如果最後兩條消息是用戶消息緊接著AI消息，說明已開始接收回應
  if (lastMessage?.role === "assistant" && secondLastMessage?.role === "user") {
    return true;
  }

  // 如果正在串流且有AI消息，說明已開始接收
  if (
    chatStore.isStreaming &&
    chatStore.messages.some(
      (msg) => msg.role === "assistant" && msg.isStreaming
    )
  ) {
    return true;
  }

  return false;
});

// 模型和設置
const selectedModel = ref(null); // 改為存儲完整的模型對象
const selectedModelId = computed(() => selectedModel.value?.id || "");
const availableModels = computed(() => {
  // 從 store 中獲取所有可用模型並平鋪
  const ollama = chatStore.availableModels.ollama || [];
  const gemini = chatStore.availableModels.gemini || [];
  const openai = chatStore.availableModels.openai || [];
  const claude = chatStore.availableModels.claude || [];

  return [
    ...ollama.map((model) => ({
      id: model.id,
      name: model.display_name || model.name,
      provider: "ollama",
      available: model.is_active,
      is_default: model.is_default || false,
    })),
    ...gemini.map((model) => ({
      id: model.id,
      name: model.display_name || model.name,
      provider: "gemini",
      available: model.is_active,
      is_default: model.is_default || false,
    })),
    ...openai.map((model) => ({
      id: model.id,
      name: model.display_name || model.name,
      provider: "openai",
      available: model.is_active,
      is_default: model.is_default || false,
    })),
    ...claude.map((model) => ({
      id: model.id,
      name: model.display_name || model.name,
      provider: "claude",
      available: model.is_active,
      is_default: model.is_default || false,
    })),
  ].filter((model) => model.available !== false && model.id); // 只顯示可用且有ID的模型
});

const chatSettings = ref({
  temperature: 0.7,
  maxTokens: 8192, // 增加最大token數量
  systemPrompt: "",
  fontSize: 14, // 新增字體大小設置，默認14px
});

// 串流模式狀態
const useStreamMode = ref(true); // 默認啟用串流模式
const isStreaming = ref(false); // 是否正在串流中

// 快速提示
const quickPrompts = ref([
  { id: 1, text: "你好，請介紹一下自己" },
  { id: 2, text: "幫我分析這個問題" },
  { id: 3, text: "請提供一些建議" },
  { id: 4, text: "解釋一下這個概念" },
]);

// 從 store 中獲取可用智能體
const availableAgents = computed(() => chatStore.availableAgents || []);

// Props
const props = defineProps({
  agent: {
    type: Object,
    default: null,
  },
});

// 方法
const formatTime = formatMessageTime;

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

const findModelById = (modelId) => {
  // 在所有提供商中搜尋指定ID的模型
  const providers = ["ollama", "gemini", "openai", "claude"];
  for (const provider of providers) {
    const models = chatStore.availableModels[provider] || [];
    const model = models.find((m) => m.id === modelId);
    if (model) return model;
  }
  return null;
};

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

// 事件處理
const handleModelChange = (model) => {
  // 新的 ModelSelector 組件傳遞完整的模型對象
  if (model && typeof model === "object") {
    selectedModel.value = model;
    console.log("模型已切換:", model.display_name, "ID:", model.id);
  } else {
    // 向後兼容：如果傳遞的是 ID，需要找到完整的模型對象
    const fullModel = findModelById(model);
    selectedModel.value = fullModel;
  }
};

const handleSendMessage = async () => {
  if (!messageText.value.trim()) return;

  // 確保選擇了模型
  if (!selectedModelId.value) {
    message.error("請先選擇 AI 模型");
    return;
  }

  try {
    sending.value = true;

    // 立即設置AI思考狀態
    chatStore.handleSetAITypingStatus(true);

    // 如果沒有當前對話，先創建一個
    let conversationId = chatStore.currentConversation?.id;
    if (!conversationId) {
      const newConversation = await chatStore.handleCreateConversation({
        title: messageText.value.trim().substring(0, 50),
        agent_id: props.agent?.id,
        model_id: selectedModelId.value,
      });
      conversationId = newConversation?.id;
    }

    if (conversationId) {
      const content = messageText.value.trim();

      // 清空輸入框和重置狀態
      messageText.value = "";
      quotedMessage.value = null;

      if (useStreamMode.value) {
        // 使用串流模式
        console.log("=== 使用串流模式發送消息 ===");
        isStreaming.value = true;

        await chatStore.sendMessageStream(conversationId, content, {
          model_id: selectedModelId.value,
          temperature: chatSettings.value.temperature,
          max_tokens: chatSettings.value.maxTokens,
          system_prompt: chatSettings.value.systemPrompt,
        });

        message.success("串流消息發送成功");
      } else {
        // 使用普通模式
        const result = await chatStore.handleSendMessage(
          conversationId,
          content,
          {
            quotedMessage: quotedMessage.value,
            temperature: chatSettings.value.temperature,
            maxTokens: chatSettings.value.maxTokens,
            model_id: selectedModelId.value,
            systemPrompt: chatSettings.value.systemPrompt,
          }
        );

        if (result) {
          lastSentMessageId.value = result.user_message?.id;
          message.success("消息發送成功");
        }
      }

      scrollToBottom();
    }
  } catch (error) {
    const errorMsg = useStreamMode.value ? "串流發送消息失敗" : "發送消息失敗";
    message.error(`${errorMsg}: ${error.message}`);
    console.error("發送消息失敗:", error);
  } finally {
    sending.value = false;
    isStreaming.value = false;
    // 注意：不在這裡重置aiTyping，讓它在收到回應時自然重置
  }
};

const handleKeyDown = (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    handleSendMessage();
  }
};

const handleInputChange = (event) => {
  // 發送輸入狀態
  wsStore.handleSendTypingStatus(
    chatStore.currentConversation?.id,
    messageText.value.length > 0
  );

  // 檢查是否已經有 @ 提及
  const existingMentions = (messageText.value.match(/@\w+/g) || []).length;

  // 檢查是否輸入了 @
  const cursorPosition = event?.target?.selectionStart || 0;
  const textBeforeCursor = messageText.value.substring(0, cursorPosition);
  const lastAtIndex = textBeforeCursor.lastIndexOf("@");

  if (lastAtIndex !== -1 && existingMentions === 0) {
    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
    // 如果 @ 後面沒有空格且在最後，顯示智能體選單
    if (
      !textAfterAt.includes(" ") &&
      cursorPosition === messageText.value.length
    ) {
      showAgentMenu.value = true;
      // 計算選單位置
      calculateMenuPosition(event.target);
    } else {
      showAgentMenu.value = false;
    }
  } else {
    showAgentMenu.value = false;
  }
};

const calculateMenuPosition = (textarea) => {
  const rect = textarea.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const menuHeight = 200; // 預估選單高度

  // 判斷是否應該顯示在上方
  const shouldShowAbove =
    rect.bottom + menuHeight > viewportHeight && rect.top > menuHeight;

  agentMenuPosition.value = {
    top: shouldShowAbove
      ? rect.top + window.scrollY - menuHeight
      : rect.bottom + window.scrollY,
    left: rect.left + window.scrollX,
  };
};

const handleSelectAgent = (agent) => {
  // 檢查是否已經有 @ 提及，如果有則不允許添加
  const existingMentions = (messageText.value.match(/@\w+/g) || []).length;
  if (existingMentions > 0) {
    message.warning("每條消息只能 @ 一個智能體");
    showAgentMenu.value = false;
    return;
  }

  const cursorPosition =
    messageInput.value?.$el?.querySelector("textarea")?.selectionStart ||
    messageText.value.length;
  const textBeforeCursor = messageText.value.substring(0, cursorPosition);
  const lastAtIndex = textBeforeCursor.lastIndexOf("@");

  if (lastAtIndex !== -1) {
    const textBeforeAt = messageText.value.substring(0, lastAtIndex);
    const textAfterCursor = messageText.value.substring(cursorPosition);
    messageText.value = textBeforeAt + `@${agent.name} ` + textAfterCursor;
  }

  showAgentMenu.value = false;

  // 重新聚焦輸入框
  nextTick(() => {
    if (messageInput.value) {
      messageInput.value.focus();
    }
  });
};

// 載入智能體的快速命令
const loadAgentQuickCommands = async () => {
  if (!props.agent?.id) {
    agentQuickCommands.value = [];
    return;
  }

  try {
    loadingQuickCommands.value = true;
    const commands = await getAgentQuickCommands(props.agent.id);
    agentQuickCommands.value = commands || [];
  } catch (error) {
    console.warn("載入智能體快速命令失敗:", error);
    agentQuickCommands.value = [];
  } finally {
    loadingQuickCommands.value = false;
  }
};

const handleQuickPrompt = async (prompt) => {
  // 如果是對象，提取 text；如果是字符串，直接使用
  const promptText = typeof prompt === "object" ? prompt.text : prompt;
  const commandId = typeof prompt === "object" ? prompt.id : null;

  messageText.value = promptText;

  // 統計使用次數（後台進行，不影響用戶體驗）
  if (commandId) {
    incrementCommandUsage(commandId).catch((error) => {
      console.warn("統計快速命令詞使用次數失敗:", error);
    });
  }

  // Focus 到輸入框
  nextTick(() => {
    if (messageInput.value) {
      messageInput.value.focus();
      // 將游標移到文字末尾
      const textareaEl =
        messageInput.value.$el?.querySelector("textarea") ||
        messageInput.value.$el;
      if (textareaEl && textareaEl.setSelectionRange) {
        textareaEl.setSelectionRange(
          textareaEl.value.length,
          textareaEl.value.length
        );
      }
    }
  });
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
  // 載入智能體特定的系統提示詞
  loadAgentSystemPrompt();
  settingsModalVisible.value = true;
};

const handleSaveSettings = () => {
  // 保存基本聊天設置到本地存儲（排除系統提示詞）
  const basicSettings = {
    temperature: chatSettings.value.temperature,
    maxTokens: chatSettings.value.maxTokens,
    fontSize: chatSettings.value.fontSize,
  };
  localStorage.setItem("chat_settings", JSON.stringify(basicSettings));

  // 如果有選中的智能體，保存該智能體特定的系統提示詞
  if (props.agent && props.agent.id) {
    const agentSettings = JSON.parse(
      localStorage.getItem("agent_settings") || "{}"
    );
    agentSettings[props.agent.id] = {
      customSystemPrompt: chatSettings.value.systemPrompt,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem("agent_settings", JSON.stringify(agentSettings));
  } else {
    // 如果沒有選中智能體，保存為全域設定
    localStorage.setItem(
      "global_system_prompt",
      chatSettings.value.systemPrompt
    );
  }

  // 應用字體大小設置
  document.documentElement.style.setProperty(
    "--chat-font-size",
    `${chatSettings.value.fontSize}px`
  );

  settingsModalVisible.value = false;
  message.success("設置已保存");
};

const handleCancelSettings = () => {
  settingsModalVisible.value = false;
};

// 載入智能體特定的系統提示詞
const loadAgentSystemPrompt = () => {
  if (props.agent && props.agent.id) {
    // 嘗試載入該智能體的自定義系統提示詞
    const agentSettings = JSON.parse(
      localStorage.getItem("agent_settings") || "{}"
    );
    const agentSetting = agentSettings[props.agent.id];

    if (agentSetting && agentSetting.customSystemPrompt) {
      // 使用智能體的自定義系統提示詞
      chatSettings.value.systemPrompt = agentSetting.customSystemPrompt;
    } else {
      // 使用智能體的默認系統提示詞
      chatSettings.value.systemPrompt = props.agent.system_prompt || "";
    }
  } else {
    // 沒有選中智能體時，使用全域設定
    const globalPrompt = localStorage.getItem("global_system_prompt");
    chatSettings.value.systemPrompt = globalPrompt || "";
  }
};

// 恢復智能體的默認系統提示詞
const handleResetToDefaultPrompt = () => {
  if (props.agent && props.agent.system_prompt) {
    chatSettings.value.systemPrompt = props.agent.system_prompt;
    message.success("已恢復智能體的默認系統提示詞");
  }
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

const handleStopStream = () => {
  if (chatStore.isStreaming) {
    chatStore.stopCurrentStream();
  }
};

const handleToggleRealtimeRender = () => {
  configStore.toggleRealtimeRender();
  message.success(
    `已切換為${configStore.chatSettings.useRealtimeRender ? "即時渲染" : "等待渲染"}模式`
  );
};

// 根據智能體獲取快速提示
const getQuickPrompts = () => {
  if (!props.agent) {
    return quickPrompts.value;
  }

  // 優先使用動態載入的快速命令
  if (agentQuickCommands.value && agentQuickCommands.value.length > 0) {
    return agentQuickCommands.value;
  }

  // 如果沒有載入到動態命令，則使用預設的通用快速提示
  return quickPrompts.value;
};

// 監聽消息變化，自動滾動到底部
watch(
  () => chatStore.messages,
  (newMessages, oldMessages) => {
    // 自動滾動到底部
    if (newMessages?.length > (oldMessages?.length || 0)) {
      scrollToBottom();
    }

    // 檢查是否有串流中的訊息內容發生變化
    const hasStreamingMessage = newMessages.some((msg) => msg.isStreaming);
    if (hasStreamingMessage) {
      // 如果有串流訊息，持續滾動到底部
      scrollToBottom();
    }
  },
  { deep: true }
);

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

// 監聽智能體變化，載入對應的系統提示詞和快速命令
watch(
  () => props.agent,
  () => {
    loadAgentSystemPrompt();
    loadAgentQuickCommands();
  },
  { immediate: true }
);

// 生命週期
onMounted(async () => {
  try {
    loading.value = true;

    // 載入用戶偏好的輸入區域高度
    loadInputAreaHeight();

    // 載入當前對話的消息
    if (chatStore.currentConversation) {
      await chatStore.handleGetMessages(chatStore.currentConversation.id);
    }

    // 載入可用模型和智能體
    await chatStore.handleGetAvailableModels();
    await chatStore.handleGetAvailableAgents();

    // 載入智能體快速命令
    await loadAgentQuickCommands();

    // 設置默認模型
    // 確保模型數據已載入
    if (
      !chatStore.availableModels.ollama &&
      !chatStore.availableModels.gemini
    ) {
      await chatStore.handleGetAvailableModels();
    }

    // 設置默認選中的模型
    if (availableModels.value.length > 0) {
      // 優先選擇默認模型或第一個可用模型
      const defaultModel =
        availableModels.value.find((model) => model.is_default) ||
        availableModels.value[0];

      if (defaultModel && defaultModel.id) {
        // 從 store 中找到完整的模型對象
        const fullModel = findModelById(defaultModel.id);
        selectedModel.value = fullModel || defaultModel;
        console.log("設置默認模型:", defaultModel.name, "ID:", defaultModel.id);
      } else {
        console.warn("無法找到有效的默認模型");
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

const handleResizeStart = (event) => {
  isResizing.value = true;
  const startY = event.clientY;
  const startHeight = inputAreaHeight.value;

  const handleMouseMove = (moveEvent) => {
    const deltaY = startY - moveEvent.clientY; // 向上拖拉為正值
    const newHeight = Math.max(
      minInputHeight,
      Math.min(maxInputHeight, startHeight + deltaY)
    );
    inputAreaHeight.value = newHeight;
    moveEvent.preventDefault();
  };

  const handleMouseUp = () => {
    isResizing.value = false;
    // 保存用戶偏好到 localStorage
    localStorage.setItem(
      "chatInputAreaHeight",
      inputAreaHeight.value.toString()
    );
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
  };

  // 防止文字選取和設置游標樣式
  document.body.style.userSelect = "none";
  document.body.style.cursor = "row-resize";

  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
  event.preventDefault();
};

// 從 localStorage 載入用戶偏好
const loadInputAreaHeight = () => {
  const savedHeight = localStorage.getItem("chatInputAreaHeight");
  if (savedHeight) {
    const height = parseInt(savedHeight, 10);
    if (height >= minInputHeight && height <= maxInputHeight) {
      inputAreaHeight.value = height;
    }
  }
};

// 放大輸入區域
const handleExpandInput = () => {
  //const newHeight = Math.min(maxInputHeight, inputAreaHeight.value + 300);
  inputAreaHeight.value = maxInputHeight;
  localStorage.setItem("chatInputAreaHeight", inputAreaHeight.value.toString());
};

// 縮小輸入區域
const handleShrinkInput = () => {
  //const newHeight = Math.max(minInputHeight, inputAreaHeight.value - 100);
  inputAreaHeight.value = minInputHeight;
  localStorage.setItem("chatInputAreaHeight", inputAreaHeight.value.toString());
};

// 監聽串流模式變化，保存用戶偏好
watch(useStreamMode, (newValue) => {
  console.log("串流模式切換:", newValue ? "啟用" : "禁用");
  localStorage.setItem("chat_stream_mode", JSON.stringify(newValue));
});

// 從本地存儲恢復串流模式設置
onMounted(() => {
  const savedStreamMode = localStorage.getItem("chat_stream_mode");
  if (savedStreamMode !== null) {
    useStreamMode.value = JSON.parse(savedStreamMode);
  }

  // 恢復基本聊天設置（不包含系統提示詞）
  const savedChatSettings = localStorage.getItem("chat_settings");
  if (savedChatSettings) {
    try {
      const settings = JSON.parse(savedChatSettings);
      // 只恢復基本設置，系統提示詞通過 loadAgentSystemPrompt 載入
      chatSettings.value.temperature =
        settings.temperature || chatSettings.value.temperature;
      chatSettings.value.maxTokens =
        settings.maxTokens || chatSettings.value.maxTokens;
      chatSettings.value.fontSize =
        settings.fontSize || chatSettings.value.fontSize;

      // 應用字體大小設置
      document.documentElement.style.setProperty(
        "--chat-font-size",
        `${chatSettings.value.fontSize}px`
      );
    } catch (error) {
      console.error("恢復聊天設置失敗:", error);
    }
  } else {
    // 設置默認字體大小
    document.documentElement.style.setProperty(
      "--chat-font-size",
      `${chatSettings.value.fontSize}px`
    );
  }

  // 載入智能體特定的系統提示詞
  loadAgentSystemPrompt();
});

const handleCreateNewConversation = async () => {
  try {
    creatingNewConversation.value = true;

    // 確保選擇了模型
    if (!selectedModelId.value) {
      message.error("請先選擇 AI 模型");
      return;
    }

    // 創建新對話
    const newConversation = await chatStore.handleCreateConversation({
      title: "新對話",
      agent_id: props.agent?.id,
      model_id: selectedModelId.value,
    });

    if (newConversation) {
      // 重新載入對話列表以更新sidebar
      await chatStore.handleGetConversations();

      message.success("新對話創建成功");

      // 如果需要跳轉到新對話，可以使用路由
      // $router.push(`/chat/${newConversation.id}`);
    }
  } catch (error) {
    message.error("創建新對話失敗");
    console.error("創建新對話失敗:", error);
  } finally {
    creatingNewConversation.value = false;
  }
};
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

.stream-toggle {
  margin-left: 8px;
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
  background: var(--custom-bg-primary);
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

.stop-stream-container {
  position: fixed;
  bottom: 120px; /* 固定在輸入框上方 */
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  padding: 16px;
}

.stop-stream-button {
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 20px;
  padding: 8px 16px;
  background: rgba(255, 77, 79, 0.1);
  border: 1px solid rgba(255, 77, 79, 0.3);
  color: #ff4d4f;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(255, 77, 79, 0.2);
}

.stop-stream-button:hover {
  background: rgba(255, 77, 79, 0.15) !important;
  border-color: #ff4d4f !important;
  box-shadow: 0 4px 12px rgba(255, 77, 79, 0.3) !important;
  transform: translateY(-1px);
}

.stop-stream-button svg {
  transition: transform 0.3s ease;
}

.stop-stream-button:hover svg {
  transform: scale(1.1);
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
  padding: 16px;
  height: calc(100% - 2px);
  display: flex;
  flex-direction: column;
}

.input-wrapper {
  border: 1px solid var(--custom-border-primary);
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 0.2s;
  background: var(--custom-bg-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  flex: 1;
  position: relative;
}

.input-wrapper:focus-within {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.message-input {
  border: none !important;
  box-shadow: none !important;
  resize: none;
  padding: 16px 20px;
  background: var(--custom-bg-primary);
  color: var(--custom-text-primary);
  font-size: 15px;
  line-height: 1.5;
  flex: 1;
  min-height: 60px;
}

.message-input:focus {
  border: none !important;
  box-shadow: none !important;
}

.input-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: var(--custom-bg-tertiary);
  border-top: 1px solid var(--custom-border-primary);
  flex-shrink: 0;
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

/* 即時渲染切換按鈕樣式 */
.toolbar-left .ant-btn.active-toggle {
  background: rgba(24, 144, 255, 0.1) !important;
  color: var(--primary-color) !important;
  border-color: rgba(24, 144, 255, 0.3) !important;
}

.toolbar-left .ant-btn.active-toggle:hover {
  background: rgba(24, 144, 255, 0.15) !important;
  border-color: var(--primary-color) !important;
}

.toolbar-left .ant-btn {
  transition: all 0.2s ease;
  border-radius: 6px;
  height: 32px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-left .ant-btn svg {
  flex-shrink: 0;
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
    padding: 16px 16px 24px 16px;
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

.resize-handle {
  height: 6px;
  background: var(--custom-bg-primary);
  /* border-top: 1px solid var(--custom-border-primary);
  border-bottom: 1px solid var(--custom-border-primary); */
  cursor: row-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  position: relative;
  z-index: 10;
}

.resize-handle:hover {
  background: var(--custom-bg-tertiary);
  border-color: var(--primary-color);
}

.resize-handle.is-resizing {
  background: var(--primary-color);
  border-color: var(--primary-color);
}

.resize-indicator {
  width: 60px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.resize-handle:hover .resize-indicator {
  background: rgba(24, 144, 255, 0.1);
}

.resize-handle.is-resizing .resize-indicator {
  background: rgba(255, 255, 255, 0.2);
}

.resize-dots {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
}

.resize-dots span {
  width: 20px;
  height: 1px;
  background: var(--custom-text-tertiary);
  border-radius: 1px;
  transition: all 0.2s ease;
}

.resize-handle:hover .resize-dots span {
  background: var(--primary-color);
  width: 24px;
}

.resize-handle.is-resizing .resize-dots span {
  background: white;
  width: 28px;
}

/* 調整大小按鈕樣式 */
.resize-buttons {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  z-index: 10;
  background: var(--custom-bg-primary);
  border-radius: 6px;
  padding: 2px;
  /* box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--custom-border-primary); */
}

.resize-btn {
  width: 24px !important;
  height: 24px !important;
  padding: 0 !important;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: var(--custom-text-secondary);
  transition: all 0.2s ease;
}

.resize-btn:hover:not(:disabled) {
  background: var(--custom-bg-tertiary) !important;
  color: var(--primary-color) !important;
}

.resize-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.resize-btn svg {
  transition: transform 0.2s ease;
}

.resize-btn:hover:not(:disabled) svg {
  transform: scale(1.1);
}

/* 智能體提及選單樣式 */
.agent-mention-menu {
  background: white;
  border: 1px solid var(--custom-border-primary);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 200px;
  overflow-y: auto;
  min-width: 250px;
}

.agent-menu-list {
  padding: 4px 0;
}

.agent-menu-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.agent-menu-item:hover {
  background: var(--custom-bg-tertiary);
}

.agent-avatar-small {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 14px;
  margin-right: 8px;
  flex-shrink: 0;
  overflow: hidden;
}

.avatar-image-small {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 6px;
}

.agent-initial-small {
  font-size: 14px;
  font-weight: 600;
  color: white;
}

.agent-info-small {
  flex: 1;
  min-width: 0;
}

.agent-name-small {
  font-size: 14px;
  font-weight: 600;
  color: var(--custom-text-primary);
  margin-bottom: 2px;
}

.agent-desc-small {
  font-size: 12px;
  color: var(--custom-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

<!--
  儀表板頁面
  顯示用戶概覽、統計信息、最近對話、快速操作等
-->

<template>
  <div class="dashboard-container">
    <!-- 歡迎區域 -->
    <div class="welcome-section">
      <div class="welcome-content">
        <h1 class="welcome-title">
          歡迎回來，{{
            authStore.user?.display_name || authStore.user?.username
          }}！
        </h1>
        <p class="welcome-subtitle">
          今天是 {{ currentDate }}，準備好開始您的 AI 助手之旅了嗎？
        </p>
      </div>
      <div class="welcome-actions">
        <a-button
          type="primary"
          size="large"
          @click="handleStartNewChat">
          <template #icon>
            <PlusOutlined />
          </template>
          開始新對話
        </a-button>
      </div>
    </div>

    <!-- 統計卡片 -->
    <div class="stats-section">
      <a-row :gutter="[16, 16]">
        <a-col
          :xs="24"
          :sm="12"
          :lg="6">
          <a-card class="stat-card">
            <a-statistic
              title="總對話數"
              :value="stats.totalConversations"
              :loading="isLoadingStats">
              <template #prefix>
                <MessageOutlined class="stat-icon" />
              </template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col
          :xs="24"
          :sm="12"
          :lg="6">
          <a-card class="stat-card">
            <a-statistic
              title="今日消息"
              :value="stats.todayMessages"
              :loading="isLoadingStats">
              <template #prefix>
                <SendOutlined class="stat-icon" />
              </template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col
          :xs="24"
          :sm="12"
          :lg="6">
          <a-card class="stat-card">
            <a-statistic
              title="活躍智能體"
              :value="stats.activeAgents"
              :loading="isLoadingStats">
              <template #prefix>
                <RobotOutlined class="stat-icon" />
              </template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col
          :xs="24"
          :sm="12"
          :lg="6">
          <a-card class="stat-card">
            <a-statistic
              title="使用時長"
              :value="stats.usageHours"
              suffix="小時"
              :loading="isLoadingStats">
              <template #prefix>
                <ClockCircleOutlined class="stat-icon" />
              </template>
            </a-statistic>
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- 主要內容區域 -->
    <a-row
      :gutter="[24, 24]"
      class="main-content">
      <!-- 最近對話 -->
      <a-col
        :xs="24"
        :lg="16">
        <a-card
          title="最近對話"
          class="recent-conversations-card">
          <template #extra>
            <a-button
              type="link"
              @click="handleViewAllConversations">
              查看全部
            </a-button>
          </template>

          <div
            v-if="isLoadingConversations"
            class="loading-container">
            <a-spin size="large" />
          </div>

          <div
            v-else-if="recentConversations.length === 0"
            class="empty-container">
            <a-empty description="暫無對話記錄">
              <a-button
                type="primary"
                @click="handleStartNewChat">
                開始第一個對話
              </a-button>
            </a-empty>
          </div>

          <div
            v-else
            class="conversations-list">
            <div
              v-for="conversation in recentConversations"
              :key="conversation.id"
              class="conversation-item"
              @click="handleOpenConversation(conversation)">
              <div class="conversation-avatar">
                <a-avatar :size="40">
                  <template #icon>
                    <RobotOutlined v-if="conversation.agent_id" />
                    <MessageOutlined v-else />
                  </template>
                </a-avatar>
              </div>
              <div class="conversation-content">
                <div class="conversation-title">
                  {{ conversation.title || "新對話" }}
                </div>
                <div class="conversation-preview">
                  {{ conversation.last_message_preview || "暫無消息" }}
                </div>
                <div class="conversation-meta">
                  <span class="conversation-time">
                    {{
                      formatTime(
                        conversation.last_message_at || conversation.created_at
                      )
                    }}
                  </span>
                  <a-tag
                    v-if="conversation.agent_name"
                    size="small"
                    color="blue">
                    {{ conversation.agent_name }}
                  </a-tag>
                </div>
              </div>
              <div class="conversation-actions">
                <a-button
                  type="text"
                  size="small">
                  <RightOutlined />
                </a-button>
              </div>
            </div>
          </div>
        </a-card>
      </a-col>

      <!-- 快速操作和系統狀態 -->
      <a-col
        :xs="24"
        :lg="8">
        <!-- 快速操作 -->
        <a-card
          title="快速操作"
          class="quick-actions-card">
          <div class="quick-actions-grid">
            <div
              class="quick-action-item"
              @click="handleStartNewChat">
              <div class="action-icon">
                <PlusOutlined />
              </div>
              <div class="action-text">新建對話</div>
            </div>
            <div
              class="quick-action-item"
              @click="handleViewAgents">
              <div class="action-icon">
                <RobotOutlined />
              </div>
              <div class="action-text">智能體</div>
            </div>
            <div
              class="quick-action-item"
              @click="handleViewSettings">
              <div class="action-icon">
                <SettingOutlined />
              </div>
              <div class="action-text">設置</div>
            </div>
            <div
              class="quick-action-item"
              @click="handleViewHelp">
              <div class="action-icon">
                <QuestionCircleOutlined />
              </div>
              <div class="action-text">幫助</div>
            </div>
          </div>
        </a-card>

        <!-- 系統狀態 -->
        <a-card
          title="系統狀態"
          class="system-status-card">
          <div class="status-item">
            <div class="status-label">WebSocket 連接</div>
            <div class="status-value">
              <a-badge
                :status="wsStore.isConnected ? 'success' : 'error'"
                :text="wsStore.isConnected ? '已連接' : '未連接'" />
            </div>
          </div>
          <div class="status-item">
            <div class="status-label">AI 模型狀態</div>
            <div class="status-value">
              <a-badge
                :status="modelStatus.status"
                :text="modelStatus.text" />
            </div>
          </div>
          <div class="status-item">
            <div class="status-label">可用模型</div>
            <div class="status-value">{{ availableModelsCount }} 個</div>
          </div>
        </a-card>

        <!-- 使用提示 -->
        <a-card
          title="使用提示"
          class="tips-card">
          <div class="tip-item">
            <BulbOutlined class="tip-icon" />
            <span>使用 @ 符號可以快速選擇智能體</span>
          </div>
          <div class="tip-item">
            <BulbOutlined class="tip-icon" />
            <span>支持 Markdown 格式的消息輸入</span>
          </div>
          <div class="tip-item">
            <BulbOutlined class="tip-icon" />
            <span>可以上傳文件與 AI 進行交互</span>
          </div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { message } from "ant-design-vue";
import {
  PlusOutlined,
  MessageOutlined,
  SendOutlined,
  RobotOutlined,
  ClockCircleOutlined,
  RightOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
  BulbOutlined,
} from "@ant-design/icons-vue";
import { useAuthStore } from "@/stores/auth";
import { useWebSocketStore } from "@/stores/websocket";
import { useChatStore } from "@/stores/chat";
import dayjs from "dayjs";

const router = useRouter();
const authStore = useAuthStore();
const wsStore = useWebSocketStore();
const chatStore = useChatStore();

// 響應式數據
const isLoadingStats = ref(false);
const isLoadingConversations = ref(false);
const recentConversations = ref([]);

// 統計數據
const stats = reactive({
  totalConversations: 0,
  todayMessages: 0,
  activeAgents: 0,
  usageHours: 0,
});

// 計算屬性
const currentDate = computed(() => {
  return dayjs().format("YYYY年MM月DD日 dddd");
});

const modelStatus = computed(() => {
  const ollamaCount = chatStore.availableModels.ollama?.length || 0;
  const geminiCount = chatStore.availableModels.gemini?.length || 0;

  if (ollamaCount > 0 || geminiCount > 0) {
    return { status: "success", text: "正常" };
  } else {
    return { status: "warning", text: "檢查中" };
  }
});

const availableModelsCount = computed(() => {
  const ollamaCount = chatStore.availableModels.ollama?.length || 0;
  const geminiCount = chatStore.availableModels.gemini?.length || 0;
  return ollamaCount + geminiCount;
});

// 格式化時間
const formatTime = (time) => {
  if (!time) return "";
  const now = dayjs();
  const target = dayjs(time);

  if (now.diff(target, "day") === 0) {
    return target.format("HH:mm");
  } else if (now.diff(target, "day") === 1) {
    return "昨天 " + target.format("HH:mm");
  } else if (now.diff(target, "day") < 7) {
    return target.format("dddd HH:mm");
  } else {
    return target.format("MM-DD HH:mm");
  }
};

// 載入統計數據
const handleLoadStats = async () => {
  isLoadingStats.value = true;
  try {
    // 這裡應該調用實際的 API
    // 暫時使用模擬數據
    await new Promise((resolve) => setTimeout(resolve, 1000));

    stats.totalConversations = 12;
    stats.todayMessages = 28;
    stats.activeAgents = 5;
    stats.usageHours = 24;
  } catch (error) {
    console.error("載入統計數據失敗:", error);
  } finally {
    isLoadingStats.value = false;
  }
};

// 載入最近對話
const handleLoadRecentConversations = async () => {
  isLoadingConversations.value = true;
  try {
    const conversations = await chatStore.handleGetConversations({
      limit: 5,
      sortBy: "last_message_at",
      sortOrder: "DESC",
    });
    recentConversations.value = conversations.slice(0, 5);
  } catch (error) {
    console.error("載入最近對話失敗:", error);
  } finally {
    isLoadingConversations.value = false;
  }
};

// 事件處理
const handleStartNewChat = () => {
  router.push("/chat");
};

const handleOpenConversation = (conversation) => {
  router.push(`/chat?id=${conversation.id}`);
};

const handleViewAllConversations = () => {
  router.push("/chat");
};

const handleViewAgents = () => {
  message.info("智能體管理功能開發中");
};

const handleViewSettings = () => {
  router.push("/settings");
};

const handleViewHelp = () => {
  message.info("幫助文檔功能開發中");
};

// 初始化
onMounted(async () => {
  await Promise.all([
    handleLoadStats(),
    handleLoadRecentConversations(),
    chatStore.handleGetAvailableModels(),
  ]);
});
</script>

<style scoped>
.dashboard-container {
  padding: 24px;
  background: #f5f5f5;
  min-height: calc(100vh - 64px);
}

/* 歡迎區域 */
.welcome-section {
  background: linear-gradient(135deg, #1890ff, #722ed1);
  border-radius: 12px;
  padding: 32px;
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
}

.welcome-title {
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: white;
}

.welcome-subtitle {
  font-size: 16px;
  margin: 0;
  opacity: 0.9;
}

.welcome-actions {
  flex-shrink: 0;
}

/* 統計區域 */
.stats-section {
  margin-bottom: 24px;
}

.stat-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  color: #1890ff;
  font-size: 18px;
}

/* 主要內容 */
.main-content {
  margin-bottom: 24px;
}

/* 最近對話 */
.recent-conversations-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.loading-container,
.empty-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.conversations-list {
  max-height: 400px;
  overflow-y: auto;
}

.conversation-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.conversation-item:hover {
  background: #f5f5f5;
  border-color: #d9d9d9;
}

.conversation-avatar {
  margin-right: 12px;
}

.conversation-content {
  flex: 1;
  min-width: 0;
}

.conversation-title {
  font-weight: 500;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-preview {
  color: #666;
  font-size: 14px;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.conversation-time {
  color: #999;
  font-size: 12px;
}

.conversation-actions {
  margin-left: 12px;
}

/* 快速操作 */
.quick-actions-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.quick-actions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.quick-action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #d9d9d9;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-action-item:hover {
  border-color: #1890ff;
  background: #f0f8ff;
}

.action-icon {
  font-size: 24px;
  color: #1890ff;
  margin-bottom: 8px;
}

.action-text {
  font-size: 14px;
  color: #333;
}

/* 系統狀態 */
.system-status-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.status-item:last-child {
  border-bottom: none;
}

.status-label {
  color: #666;
  font-size: 14px;
}

.status-value {
  font-weight: 500;
}

/* 使用提示 */
.tips-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tip-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
  font-size: 14px;
  color: #666;
}

.tip-icon {
  color: #faad14;
  margin-right: 8px;
  font-size: 16px;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .dashboard-container {
    padding: 16px;
  }

  .welcome-section {
    flex-direction: column;
    text-align: center;
    gap: 16px;
  }

  .welcome-title {
    font-size: 24px;
  }

  .quick-actions-grid {
    grid-template-columns: 1fr;
  }
}

/* 卡片標題樣式 */
:deep(.ant-card-head-title) {
  font-weight: 600;
  color: #333;
}

:deep(.ant-statistic-title) {
  color: #666;
  font-size: 14px;
}

:deep(.ant-statistic-content) {
  color: #333;
}
</style>

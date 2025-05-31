<template>
  <div class="welcome-screen">
    <div class="welcome-content">
      <!-- 歡迎標題 -->
      <div class="welcome-header">
        <div class="welcome-icon">
          <svg
            viewBox="0 0 24 24"
            width="48"
            height="48">
            <path
              fill="currentColor"
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        </div>
        <h1 class="welcome-title">歡迎使用 SFDA Nexus</h1>
        <p class="welcome-subtitle">選擇一個智能體開始您的對話之旅</p>
      </div>

      <!-- 智能體網格 -->
      <div class="agents-showcase">
        <div
          v-for="agent in agents"
          :key="agent.id"
          class="agent-showcase-card"
          @click="handleSelectAgent(agent)">
          <!-- 智能體頭像 -->
          <div class="showcase-avatar">
            <div
              class="avatar-bg"
              :style="{
                background:
                  agent.avatar?.gradient ||
                  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }">
              <svg
                v-if="agent.avatar?.icon"
                class="agent-icon"
                viewBox="0 0 24 24"
                width="32"
                height="32">
                <path
                  fill="white"
                  :d="agent.avatar.icon" />
              </svg>
              <span
                v-else
                class="agent-initial"
                >{{
                  agent.display_name?.charAt(0) || agent.name?.charAt(0)
                }}</span
              >
            </div>

            <!-- 狀態指示器 -->
            <div class="status-indicator">
              <div
                class="status-dot"
                :class="agent.avatar?.status || 'online'"
                :title="getStatusText(agent.avatar?.status || 'online')"></div>
            </div>
          </div>

          <!-- 智能體信息 -->
          <div class="showcase-info">
            <h3 class="showcase-name">
              {{ agent.display_name || agent.name }}
            </h3>
            <p class="showcase-description">{{ agent.description }}</p>

            <!-- 特性標籤 -->
            <div class="showcase-tags">
              <span
                v-for="tag in (agent.tags || []).slice(0, 3)"
                :key="tag"
                class="tag">
                {{ tag }}
              </span>
            </div>
          </div>

          <!-- 開始聊天按鈕 -->
          <div class="showcase-action">
            <button class="start-chat-btn">
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16">
                <path
                  fill="currentColor"
                  d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
              </svg>
              開始對話
            </button>
          </div>
        </div>
      </div>

      <!-- 底部提示 -->
      <div class="welcome-footer">
        <div class="tips">
          <h4>💡 使用提示</h4>
          <ul>
            <li>每個智能體都有不同的專業領域和特長</li>
            <li>您可以隨時切換智能體來獲得不同的幫助</li>
            <li>對話歷史會自動保存，方便您隨時查看</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { message } from "ant-design-vue";
import { useAgentsStore } from "@/stores/agents";

const router = useRouter();
const agentsStore = useAgentsStore();

// 計算屬性
const agents = computed(() => agentsStore.availableAgents);

// 方法
const handleSelectAgent = (agent) => {
  agentsStore.setCurrentAgent(agent);
  router.push({
    name: "ChatWithAgent",
    params: { agentId: agent.id },
  });
  message.success(`已選擇智能體：${agent.display_name || agent.name}`);
};

const getStatusText = (status) => {
  const statusMap = {
    online: "在線",
    away: "離開",
    offline: "離線",
  };
  return statusMap[status] || "未知";
};

// 生命週期
onMounted(async () => {
  // 如果智能體數據還沒載入，嘗試載入
  if (agents.value.length === 0) {
    try {
      await agentsStore.fetchAgents();
    } catch (error) {
      console.error("載入智能體數據失敗:", error);
      message.error("載入智能體數據失敗");
    }
  }
});
</script>

<style scoped>
.welcome-screen {
  height: 100%;
  overflow-y: auto;
  /* background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); */
  padding: 40px 20px;
}

.welcome-content {
  max-width: 1200px;
  margin: 0 auto;
}

/* 歡迎標題 */
.welcome-header {
  text-align: center;
  margin-bottom: 48px;
}

.welcome-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  color: white;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
}

.welcome-title {
  font-size: 36px;
  font-weight: 700;
  color: #1a202c;
  margin: 0 0 12px 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.welcome-subtitle {
  font-size: 18px;
  color: #718096;
  margin: 0;
  font-weight: 400;
}

/* 智能體展示網格 */
.agents-showcase {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 24px;
  margin-bottom: 48px;
}

.agent-showcase-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
}

.agent-showcase-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.agent-showcase-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
  border-color: #667eea;
}

.agent-showcase-card:hover::before {
  opacity: 1;
}

/* 智能體頭像 */
.showcase-avatar {
  position: relative;
  margin-bottom: 16px;
}

.showcase-avatar .avatar-bg {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.showcase-avatar .agent-icon {
  width: 32px;
  height: 32px;
}

.showcase-avatar .agent-initial {
  font-size: 24px;
  font-weight: 600;
}

.status-indicator {
  position: absolute;
  bottom: -2px;
  right: -2px;
  background: white;
  border-radius: 50%;
  padding: 2px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.status-indicator .status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
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

/* 智能體信息 */
.showcase-info {
  margin-bottom: 20px;
}

.showcase-name {
  font-size: 20px;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 8px 0;
}

.showcase-description {
  font-size: 14px;
  color: #718096;
  line-height: 1.5;
  margin: 0 0 12px 0;
}

.showcase-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  background: #edf2f7;
  color: #4a5568;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

/* 開始聊天按鈕 */
.showcase-action {
  display: flex;
  justify-content: flex-end;
}

.start-chat-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.start-chat-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
}

.start-chat-btn:active {
  transform: translateY(0);
}

/* 底部提示 */
.welcome-footer {
  background: white;
  border-radius: 16px;
  padding: 32px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.tips h4 {
  font-size: 18px;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tips ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tips li {
  color: #718096;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 8px;
  padding-left: 20px;
  position: relative;
}

.tips li::before {
  content: "•";
  color: #667eea;
  font-weight: bold;
  position: absolute;
  left: 0;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .welcome-screen {
    padding: 20px 16px;
  }

  .welcome-title {
    font-size: 28px;
  }

  .welcome-subtitle {
    font-size: 16px;
  }

  .agents-showcase {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .agent-showcase-card {
    padding: 20px;
  }

  .welcome-footer {
    padding: 24px;
  }
}

/* 滾動條樣式 */
.welcome-screen::-webkit-scrollbar {
  width: 6px;
}

.welcome-screen::-webkit-scrollbar-track {
  background: transparent;
}

.welcome-screen::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}

.welcome-screen::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}
</style>

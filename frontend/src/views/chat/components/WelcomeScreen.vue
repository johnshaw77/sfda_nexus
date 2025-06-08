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
      <a-row
        :gutter="[24, 24]"
        class="agents-showcase">
        <a-col
          v-for="agent in agents"
          :key="agent.id"
          :xs="24"
          :sm="24"
          :md="12"
          :lg="12"
          :xl="8"
          :xxl="8">
          <a-card
            class="agent-showcase-card"
            :hoverable="true"
            @click="handleSelectAgent(agent)">
            <!-- 卡片內容 -->
            <template #cover>
              <div class="card-cover">
                <!-- 智能體頭像 -->
                <div class="showcase-avatar">
                  <div class="avatar-container">
                    <!-- 如果有 base64 圖片，顯示圖片 -->
                    <img
                      v-if="
                        agent.avatar &&
                        typeof agent.avatar === 'string' &&
                        agent.avatar.startsWith('data:')
                      "
                      :src="agent.avatar"
                      :alt="agent.display_name || agent.name"
                      class="avatar-image" />

                    <!-- 否則顯示漸變背景和圖標/首字母 -->
                    <div
                      v-else
                      class="avatar-bg"
                      :style="{
                        background:
                          agent.avatar?.gradient ||
                          agent.avatar?.background ||
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
                          (agent.display_name || agent.name)
                            ?.charAt(0)
                            ?.toUpperCase() || "A"
                        }}</span
                      >
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <!-- 卡片主體內容 -->
            <a-card-meta
              :title="agent.display_name || agent.name"
              :description="agent.description">
            </a-card-meta>

            <!-- 特性標籤 -->
            <div class="showcase-tags">
              <a-tag
                v-for="tag in (agent.tags || []).slice(0, 3)"
                :key="tag"
                color="blue">
                {{ tag }}
              </a-tag>
            </div>

            <!-- 開始聊天按鈕 -->
            <template #actions>
              <div class="card-actions">
                <a-button
                  type="primary"
                  class="start-chat-btn"
                  @click.stop="handleSelectAgent(agent)">
                  <template #icon>
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16">
                      <path
                        fill="currentColor"
                        d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
                    </svg>
                  </template>
                  開始對話
                </a-button>
              </div>
            </template>
          </a-card>
        </a-col>
      </a-row>

      <!-- 底部提示 -->
      <a-card
        class="welcome-footer"
        title="💡 使用提示">
        <ul class="tips-list">
          <li>每個智能體都有不同的專業領域和特長</li>
          <li>您可以隨時切換智能體來獲得不同的幫助</li>
          <li>對話歷史會自動保存，方便您隨時查看</li>
        </ul>
      </a-card>
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
  margin-bottom: 48px;
}

.agent-showcase-card {
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 16px !important;
  overflow: hidden;
}

.agent-showcase-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15) !important;
}

/* 卡片封面區域 */
.card-cover {
  padding: 24px 24px 16px;
  background: var(--custom-bg-primary, #ffffff);
  display: flex;
  justify-content: center;
  border-bottom: 1px solid var(--custom-border-primary, #e2e8f0);
}

/* 智能體頭像 */
.showcase-avatar {
  position: relative;
}

.avatar-container {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 16px;
}

.avatar-bg {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 24px;
}

.agent-icon {
  width: 32px;
  height: 32px;
}

.agent-initial {
  font-size: 24px;
  font-weight: 600;
}

/* 特性標籤 */
.showcase-tags {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* 卡片操作區域 */
.card-actions {
  display: flex;
  justify-content: flex-end;
  width: 100%;
  padding: 2px 16px;
}

/* 開始聊天按鈕 */
.start-chat-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  border: none !important;
  border-radius: 8px !important;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.start-chat-btn:hover {
  transform: translateY(-1px) !important;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4) !important;
}

/* 底部提示卡片 */
.welcome-footer {
  border-radius: 16px !important;
}

.tips-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.tips-list li {
  color: #718096;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 8px;
  padding-left: 20px;
  position: relative;
}

.tips-list li::before {
  content: "•";
  color: #667eea;
  font-weight: bold;
  position: absolute;
  left: 0;
}

/* 響應式設計 - 針對小螢幕的額外調整 */
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

  .card-cover {
    padding: 20px 20px 12px;
  }
}
</style>

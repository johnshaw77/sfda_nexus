<template>
  <div class="not-found-page">
    <!-- 使用 Ant Design 的響應式容器 -->
    <a-row
      justify="center"
      align="middle"
      class="not-found-container">
      <a-col
        :xs="22"
        :sm="20"
        :md="16"
        :lg="12"
        :xl="10">
        <!-- 404 圖標和錯誤信息 -->
        <a-space
          direction="vertical"
          size="large"
          style="width: 100%"
          align="center">
          <!-- 404 圖標 -->
          <div class="error-icon">
            <svg
              width="200"
              height="200"
              viewBox="0 0 200 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg">
              <circle
                cx="100"
                cy="100"
                r="80"
                :fill="configStore.isDarkMode ? '#2a2a2a' : '#f0f2f5'"
                :stroke="configStore.isDarkMode ? '#434343' : '#d9d9d9'"
                stroke-width="2" />
              <text
                x="100"
                y="120"
                text-anchor="middle"
                font-size="48"
                font-weight="bold"
                :fill="configStore.isDarkMode ? '#177ddc' : '#1890ff'">
                404
              </text>
            </svg>
          </div>

          <!-- 錯誤信息卡片 -->
          <a-card class="error-content">
            <a-space
              direction="vertical"
              size="large"
              style="width: 100%">
              <div style="text-align: center">
                <h1 class="error-title">頁面未找到</h1>
                <p class="error-description">
                  抱歉，您訪問的頁面不存在或已被移動。
                </p>
              </div>

              <!-- 建議操作 -->
              <a-card
                size="small"
                class="error-suggestions">
                <h3>您可以嘗試：</h3>
                <ul>
                  <li>檢查網址是否正確</li>
                  <li>返回首頁重新導航</li>
                  <li>使用搜索功能查找內容</li>
                  <li>聯繫管理員獲取幫助</li>
                </ul>
              </a-card>

              <!-- 操作按鈕 -->
              <div style="text-align: center">
                <a-space
                  :size="['large', 'middle']"
                  wrap>
                  <a-button
                    type="primary"
                    size="large"
                    @click="handleGoHome">
                    <HomeOutlined />
                    返回首頁
                  </a-button>
                  <a-button
                    size="large"
                    @click="handleGoBack">
                    <ArrowLeftOutlined />
                    返回上頁
                  </a-button>
                  <a-button
                    size="large"
                    @click="handleRefresh">
                    <ReloadOutlined />
                    刷新頁面
                  </a-button>
                </a-space>
              </div>
            </a-space>
          </a-card>
        </a-space>
      </a-col>
    </a-row>

    <!-- 快速導航 -->
    <a-row
      justify="center"
      class="quick-nav-container">
      <a-col
        :xs="22"
        :sm="20"
        :md="18"
        :lg="16"
        :xl="14">
        <a-card class="quick-nav">
          <h3>快速導航</h3>
          <a-row :gutter="[16, 16]">
            <a-col
              :xs="12"
              :sm="12"
              :md="6"
              :lg="6">
              <a-card
                hoverable
                size="small"
                @click="handleNavigate('/dashboard')">
                <template #cover>
                  <div class="nav-icon">
                    <DashboardOutlined />
                  </div>
                </template>
                <a-card-meta
                  title="儀表板"
                  description="查看系統概覽" />
              </a-card>
            </a-col>
            <a-col
              :xs="12"
              :sm="12"
              :md="6"
              :lg="6">
              <a-card
                hoverable
                size="small"
                @click="handleNavigate('/chat')">
                <template #cover>
                  <div class="nav-icon">
                    <MessageOutlined />
                  </div>
                </template>
                <a-card-meta
                  title="聊天"
                  description="開始AI對話" />
              </a-card>
            </a-col>
            <a-col
              :xs="12"
              :sm="12"
              :md="6"
              :lg="6">
              <a-card
                hoverable
                size="small"
                @click="handleNavigate('/user')">
                <template #cover>
                  <div class="nav-icon">
                    <UserOutlined />
                  </div>
                </template>
                <a-card-meta
                  title="個人資料"
                  description="管理個人信息" />
              </a-card>
            </a-col>
            <a-col
              :xs="12"
              :sm="12"
              :md="6"
              :lg="6">
              <a-card
                hoverable
                size="small"
                @click="handleNavigate('/settings')">
                <template #cover>
                  <div class="nav-icon">
                    <SettingOutlined />
                  </div>
                </template>
                <a-card-meta
                  title="設置"
                  description="系統設置" />
              </a-card>
            </a-col>
          </a-row>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
import { useConfigStore } from "@/stores/config";
// Icons are globally registered in main.js
const router = useRouter();
const configStore = useConfigStore();

// 方法
const handleGoHome = () => {
  router.push("/dashboard");
};

const handleGoBack = () => {
  router.go(-1);
};

const handleRefresh = () => {
  window.location.reload();
};

const handleNavigate = (path) => {
  router.push(path);
};
</script>

<style scoped>
.not-found-page {
  min-height: 100vh;
  padding: 40px 0;
  background: var(--custom-bg-primary);
  background-image: linear-gradient(
    135deg,
    var(--custom-bg-primary) 0%,
    var(--custom-bg-secondary) 100%
  );
}

.not-found-container {
  min-height: 60vh;
  margin-bottom: 40px;
}

.error-icon {
  text-align: center;
}

.error-content {
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  background: var(--custom-bg-primary);
  border: 1px solid var(--custom-border-primary);
}

.error-title {
  font-size: 32px;
  font-weight: 700;
  color: var(--primary-color);
  margin: 0 0 16px 0;
}

.error-description {
  font-size: 16px;
  color: var(--custom-text-secondary);
  margin: 0;
  line-height: 1.6;
}

.error-suggestions {
  text-align: left;
  background: var(--custom-bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--custom-border-primary);
}

.error-suggestions h3 {
  margin: 0 0 12px 0;
  color: var(--custom-text-primary);
  font-size: 16px;
}

.error-suggestions ul {
  margin: 0;
  padding-left: 20px;
}

.error-suggestions li {
  margin-bottom: 8px;
  color: var(--custom-text-secondary);
}

.quick-nav-container {
  margin-top: 20px;
}

.quick-nav {
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  background: var(--custom-bg-primary);
  border: 1px solid var(--custom-border-primary);
}

.quick-nav h3 {
  text-align: center;
  margin: 0 0 24px 0;
  color: var(--custom-text-primary);
  font-size: 20px;
}

.nav-icon {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 60px;
  font-size: 24px;
  color: var(--primary-color);
  background: var(--custom-bg-secondary);
}

/* Ant Design 卡片 hover 效果 */
:deep(.ant-card.ant-card-hoverable:hover) {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  transition: all 0.3s ease;
}

:deep(.ant-card) {
  transition: all 0.3s ease;
  background: var(--custom-bg-primary);
  border-color: var(--custom-border-primary);
}

:deep(.ant-card-body) {
  background: var(--custom-bg-primary);
}

:deep(.ant-card-meta-title) {
  color: var(--custom-text-primary);
}

:deep(.ant-card-meta-description) {
  color: var(--custom-text-secondary);
}

/* 暗黑模式特定樣式調整 */
[data-theme="dark"] .not-found-page {
  background-image: linear-gradient(135deg, #141414 0%, #1f1f1f 100%);
}

[data-theme="dark"] .error-content {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

[data-theme="dark"] .quick-nav {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

[data-theme="dark"] :deep(.ant-card.ant-card-hoverable:hover) {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

/* 針對小螢幕的圖標調整 */
@media (max-width: 576px) {
  .error-icon svg {
    width: 150px;
    height: 150px;
  }

  .error-title {
    font-size: 24px;
  }

  .nav-icon {
    height: 50px;
    font-size: 20px;
  }
}
</style>

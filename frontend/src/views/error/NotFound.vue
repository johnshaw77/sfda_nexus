<template>
  <div class="not-found-page">
    <div class="not-found-container">
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
            fill="#f0f2f5"
            stroke="#d9d9d9"
            stroke-width="2" />
          <text
            x="100"
            y="120"
            text-anchor="middle"
            font-size="48"
            font-weight="bold"
            fill="#1890ff">
            404
          </text>
        </svg>
      </div>

      <!-- 錯誤信息 -->
      <div class="error-content">
        <h1 class="error-title">頁面未找到</h1>
        <p class="error-description">抱歉，您訪問的頁面不存在或已被移動。</p>

        <!-- 建議操作 -->
        <div class="error-suggestions">
          <h3>您可以嘗試：</h3>
          <ul>
            <li>檢查網址是否正確</li>
            <li>返回首頁重新導航</li>
            <li>使用搜索功能查找內容</li>
            <li>聯繫管理員獲取幫助</li>
          </ul>
        </div>

        <!-- 操作按鈕 -->
        <div class="error-actions">
          <a-space size="large">
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
      </div>
    </div>

    <!-- 快速導航 -->
    <div class="quick-nav">
      <h3>快速導航</h3>
      <a-row :gutter="[16, 16]">
        <a-col :span="6">
          <a-card
            hoverable
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
        <a-col :span="6">
          <a-card
            hoverable
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
        <a-col :span="6">
          <a-card
            hoverable
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
        <a-col :span="6">
          <a-card
            hoverable
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
    </div>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
import {
  HomeOutlined,
  ArrowLeftOutlined,
  ReloadOutlined,
  DashboardOutlined,
  MessageOutlined,
  UserOutlined,
  SettingOutlined,
} from "@ant-design/icons-vue";

const router = useRouter();

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
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.not-found-container {
  text-align: center;
  max-width: 600px;
  margin-bottom: 60px;
}

.error-icon {
  margin-bottom: 32px;
}

.error-content {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.error-title {
  font-size: 32px;
  font-weight: 700;
  color: #1890ff;
  margin-bottom: 16px;
}

.error-description {
  font-size: 16px;
  color: #666;
  margin-bottom: 32px;
  line-height: 1.6;
}

.error-suggestions {
  text-align: left;
  margin-bottom: 32px;
  padding: 20px;
  background: #f9f9f9;
  border-radius: 8px;
}

.error-suggestions h3 {
  margin-bottom: 12px;
  color: #333;
}

.error-suggestions ul {
  margin: 0;
  padding-left: 20px;
}

.error-suggestions li {
  margin-bottom: 8px;
  color: #666;
}

.error-actions {
  margin-top: 32px;
}

.quick-nav {
  width: 100%;
  max-width: 800px;
  background: white;
  padding: 32px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.quick-nav h3 {
  text-align: center;
  margin-bottom: 24px;
  color: #333;
  font-size: 20px;
}

.nav-icon {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80px;
  font-size: 32px;
  color: #1890ff;
  background: #f0f2f5;
}

.ant-card {
  cursor: pointer;
  transition: all 0.3s;
}

.ant-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

/* 響應式設計 */
@media (max-width: 768px) {
  .not-found-page {
    padding: 20px 10px;
  }

  .error-content {
    padding: 24px;
  }

  .error-title {
    font-size: 24px;
  }

  .quick-nav {
    padding: 20px;
  }

  .quick-nav .ant-col {
    margin-bottom: 16px;
  }
}
</style>

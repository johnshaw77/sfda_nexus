<template>
  <div class="profile-page">
    <a-card
      title="個人資料"
      :bordered="false">
      <!-- 載入狀態 -->
      <div
        v-if="!authStore.isInitialized || authStore.isLoading"
        class="loading-container">
        <a-spin size="large">
          <template #tip>載入個人資料中...</template>
        </a-spin>
      </div>

      <!-- 個人資料表單 -->
      <ProfileForm
        v-else-if="authStore.user"
        :user="authStore.user"
        @update-success="handleUpdateSuccess" />

      <!-- 錯誤狀態 -->
      <a-result
        v-else
        status="error"
        title="載入失敗"
        sub-title="無法載入個人資料，請重新登入">
        <template #extra>
          <a-button
            type="primary"
            @click="handleRetry">
            重試
          </a-button>
        </template>
      </a-result>
    </a-card>
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import ProfileForm from "./components/ProfileForm.vue";

const router = useRouter();
const authStore = useAuthStore();

// 處理更新成功
const handleUpdateSuccess = (updatedUser) => {
  debugUserData(updatedUser, "更新後的用戶數據");
};

// 重試載入
const handleRetry = async () => {
  try {
    await authStore.handleGetProfile();
  } catch (error) {
    console.error("重新載入個人資料失敗:", error);
  }
};

// 頁面載入時確保認證狀態已初始化
onMounted(async () => {
  // console.log("🚀 User 頁面載入開始");

  if (!authStore.isInitialized) {
    // console.log("📡 初始化 authStore...");
    await authStore.handleInitialize();
  }

  // 如果沒有用戶數據，嘗試重新獲取
  if (!authStore.user && authStore.token) {
    try {
      //console.log("🔄 重新獲取用戶資料...");
      await authStore.handleGetProfile();
    } catch (error) {
      console.error("載入個人資料失敗:", error);
    }
  }

  // console.log("✅ User 頁面載入完成");
});
</script>

<style scoped>
.profile-page {
  padding: 24px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: calc(100vh - 48px);
}

.profile-page .ant-card {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}
</style>

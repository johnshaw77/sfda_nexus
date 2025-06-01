<template>
  <div class="admin-page">
    <a-card
      title="管理後台"
      :bordered="false">
      <div class="admin-grid">
        <a-row :gutter="[24, 24]">
          <a-col :span="6">
            <a-card
              class="admin-card"
              hoverable
              @click="handleNavigate('/admin/models')">
              <template #cover>
                <div class="card-icon">
                  <ApiOutlined />
                </div>
              </template>
              <a-card-meta
                title="模型管理"
                description="管理 AI 模型配置" />
            </a-card>
          </a-col>

          <a-col :span="6">
            <a-card
              class="admin-card"
              hoverable
              @click="handleNavigate('/admin/agents')">
              <template #cover>
                <div class="card-icon">
                  <RobotOutlined />
                </div>
              </template>
              <a-card-meta
                title="智能體管理"
                description="管理智能體配置" />
            </a-card>
          </a-col>

          <a-col :span="6">
            <a-card
              class="admin-card"
              hoverable
              @click="handleNavigate('/admin/users')">
              <template #cover>
                <div class="card-icon">
                  <UserOutlined />
                </div>
              </template>
              <a-card-meta
                title="用戶管理"
                description="管理系統用戶" />
            </a-card>
          </a-col>

          <a-col :span="6">
            <a-card
              class="admin-card"
              hoverable
              @click="handleNavigate('/admin/system')">
              <template #cover>
                <div class="card-icon">
                  <SettingOutlined />
                </div>
              </template>
              <a-card-meta
                title="系統監控"
                description="系統狀態監控" />
            </a-card>
          </a-col>
        </a-row>
      </div>
    </a-card>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";

const router = useRouter();

const handleNavigate = (path) => {
  router.push(path);
};
</script>

<style scoped>
/* Admin 卡片懸停效果 */
.admin-card {
  cursor: pointer;
  transition: var(--transition-all);
  background: var(--custom-bg-primary);
  border: 1px solid var(--custom-border-primary);
}

.admin-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-card-hover);
  border-color: var(--primary-color);
}

.admin-card:hover .card-icon {
  background: var(--primary-color);
  color: white;
}

/* Admin 卡片圖標樣式 */
.admin-card .card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80px;
  font-size: 32px;
  color: var(--primary-color);
  background: var(--custom-bg-secondary);
  border-radius: var(--border-radius-base);
  transition: var(--transition-all);
}
</style>

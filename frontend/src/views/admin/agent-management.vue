<template>
  <div class="admin-page">
    <a-card
      title="智能體管理"
      :bordered="false">
      <a-tabs
        v-model:activeKey="activeTab"
        type="card"
        size="large">
        <!-- 智能體管理頁籤 -->
        <a-tab-pane
          key="agents"
          tab="智能體管理">
          <template #tab>
            <RobotOutlined />
            智能體管理
          </template>

          <!-- 現有的智能體管理組件 -->
          <AgentsView />
        </a-tab-pane>

        <!-- 全域提示詞頁籤 -->
        <a-tab-pane
          key="global-prompt"
          tab="全域提示詞">
          <template #tab>
            <SettingOutlined />
            全域提示詞
          </template>

          <!-- 全域提示詞管理內容 -->
          <GlobalPromptManager />
        </a-tab-pane>
      </a-tabs>
    </a-card>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { RobotOutlined, SettingOutlined } from "@ant-design/icons-vue";
import AgentsView from "./agents.vue";
import GlobalPromptManager from "./GlobalPromptManager.vue";

// 當前活動的頁籤
const activeTab = ref("agents");
</script>

<style scoped>
.admin-page {
  padding: 24px;
}

/* 頁籤樣式優化 */
:deep(.ant-tabs-card .ant-tabs-tab) {
  border-radius: 8px 8px 0 0;
  margin-right: 8px;
}

:deep(.ant-tabs-card .ant-tabs-tab-active) {
  background: linear-gradient(135deg, #1890ff 0%, #36cfc9 100%);
  border-color: #1890ff;
}

:deep(.ant-tabs-card .ant-tabs-tab-active .ant-tabs-tab-btn) {
  color: white;
}

:deep(.ant-tabs-content-holder) {
  padding: 24px 0;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .admin-page {
    padding: 16px;
  }

  :deep(.ant-tabs-content-holder) {
    padding: 16px 0;
  }
}
</style>

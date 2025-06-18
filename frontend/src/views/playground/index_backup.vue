<template>
  <div class="playground-container">
    <a-card
      title="🧪 實驗性功能測試實驗室"
      class="playground-card">
      <template #extra>
        <a-space>
          <a-tag color="blue">實驗環境</a-tag>
          <a-tag color="green">開發測試</a-tag>
        </a-space>
      </template>

      <!-- Tab 導航 -->
      <a-tabs
        v-model:activeKey="activeTab"
        type="card"
        class="playground-tabs">
        <!-- Markdown & Shiki 測試 Tab -->
        <a-tab-pane
          key="markdown"
          tab="📝 Markdown & Shiki">
          <MarkdownTestTab />
        </a-tab-pane>

        <!-- 文字轉換測試 Tab -->
        <a-tab-pane
          key="textConverter"
          tab="🔄 文字轉換測試">
          <TextConverterTestTab />
        </a-tab-pane>

        <!-- AI 串流測試 Tab -->
        <a-tab-pane
          key="aiStream"
          tab="🤖 AI 串流測試">
          <AIStreamTestTab />
        </a-tab-pane>

        <!-- 系統狀態測試 Tab -->
        <a-tab-pane
          key="systemStatus"
          tab="⚙️ 系統狀態">
          <SystemStatusTab />
        </a-tab-pane>
      </a-tabs>
    </a-card>
  </div>
</template>

<script setup>
import { ref } from "vue";
import MarkdownTestTab from "./MarkdownTestTab.vue";
import TextConverterTestTab from "./TextConverterTestTab.vue";
import AIStreamTestTab from "./AIStreamTestTab.vue";
import SystemStatusTab from "./SystemStatusTab.vue";

// 狀態
const activeTab = ref("textConverter"); // 默認顯示文字轉換測試
</script>

<style scoped>
.playground-container {
  padding: 20px;
  max-width: 1800px;
  margin: 0 auto;
}

.playground-card {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  min-height: 80vh;
}

.playground-tabs {
  margin-top: 16px;
}

/* Tab 樣式優化 */
:deep(.ant-tabs-card > .ant-tabs-nav .ant-tabs-tab) {
  border: 1px solid #d9d9d9;
  background: #fafafa;
  transition: all 0.2s ease;
}

:deep(.ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active) {
  background: #ffffff;
  border-bottom-color: #ffffff;
}

:deep(.ant-tabs-card > .ant-tabs-nav .ant-tabs-tab:hover) {
  background: #f0f2f5;
}

:deep(.ant-tabs-content) {
  padding: 24px 0;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .playground-container {
    padding: 12px;
  }

  :deep(.ant-tabs-content) {
    padding: 16px 0;
  }
}
</style>

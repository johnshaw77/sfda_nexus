<template>
  <div class="playground-container">
    <a-card
      title="🧪 SFDA Nexus Playground - 功能測試實驗室"
      class="playground-card">
      <template #extra>
        <a-space wrap>
          <a-tag color="blue">Version 1.0</a-tag>
          <a-tooltip title="重新載入所有測試環境">
            <a-button
              size="small"
              @click="refreshAll">
              <template #icon><ReloadOutlined /></template>
              刷新
            </a-button>
          </a-tooltip>
          <a-tooltip title="查看使用說明">
            <a-button
              size="small"
              @click="showHelp">
              <template #icon><QuestionCircleOutlined /></template>
              幫助
            </a-button>
          </a-tooltip>
        </a-space>
      </template>

      <!-- Tab 導航 -->
      <a-tabs
        :value="activeTab"
        @change="handleTabChange"
        type="card"
        class="playground-tabs">
        <!-- Markdown & Shiki 測試 Tab -->
        <a-tab-pane
          key="markdown"
          tab="📝 Markdown & Shiki 測試">
          <template #tab>
            <span>
              <FileMarkdownOutlined />
              Markdown & Shiki
            </span>
          </template>
          <MarkdownTab />
        </a-tab-pane>

        <!-- OpenCC 簡繁轉換測試 Tab -->
        <a-tab-pane
          key="opencc"
          tab="🔄 OpenCC 簡繁轉換">
          <template #tab>
            <span>
              <TranslationOutlined />
              OpenCC 轉換
            </span>
          </template>
          <OpenCCTab />
        </a-tab-pane>

        <!-- 智能圖表測試 Tab -->
        <a-tab-pane
          key="chart"
          tab="📊 智能圖表測試">
          <template #tab>
            <span>
              <BarChartOutlined />
              智能圖表
            </span>
          </template>
          <ChartTab />
        </a-tab-pane>

        <!-- MCP 圖表創建測試 Tab -->
        <a-tab-pane
          key="chart-creation"
          tab="🛠️ MCP 圖表創建">
          <template #tab>
            <span>
              <ExperimentOutlined />
              MCP 圖表創建
            </span>
          </template>
          <ChartCreationTest />
        </a-tab-pane>

        <!-- AI Stream 測試 Tab (預留) -->
        <a-tab-pane
          key="aistream"
          tab="🤖 AI Stream 測試"
          disabled>
          <template #tab>
            <span>
              <RobotOutlined />
              AI Stream
              <a-tag
                size="small"
                color="orange"
                style="margin-left: 4px"
                >開發中</a-tag
              >
            </span>
          </template>
          <div class="coming-soon">
            <a-empty description="AI Stream 測試功能開發中" />
            <p style="text-align: center; color: #666; margin-top: 16px">
              將包含聊天流式響應、函數調用等 AI 相關功能測試
            </p>
          </div>
        </a-tab-pane>

        <!-- 系統狀態測試 Tab (預留) -->
        <a-tab-pane
          key="system"
          tab="⚙️ 系統狀態"
          disabled>
          <template #tab>
            <span>
              <SettingOutlined />
              系統狀態
              <a-tag
                size="small"
                color="orange"
                style="margin-left: 4px"
                >開發中</a-tag
              >
            </span>
          </template>
          <div class="coming-soon">
            <a-empty description="系統狀態監控功能開發中" />
            <p style="text-align: center; color: #666; margin-top: 16px">
              將包含服務器狀態、資料庫連接、API 健康檢查等功能
            </p>
          </div>
        </a-tab-pane>

        <!-- 更多功能 Tab (預留) -->
        <a-tab-pane
          key="more"
          disabled>
          <template #tab>
            <span>
              <PlusOutlined />
              更多功能...
            </span>
          </template>
        </a-tab-pane>
      </a-tabs>

      <!-- 底部狀態欄 -->
      <div class="playground-footer">
        <a-row
          :gutter="16"
          align="middle">
          <a-col flex="auto">
            <a-space
              wrap
              size="small">
              <span class="status-item">
                <a-badge :status="playgroundStatus.overall" />
                總體狀態：{{ playgroundStatus.message }}
              </span>
              <a-divider type="vertical" />
              <span class="status-item">
                活躍 Tab：{{ getTabName(activeTab) }}
              </span>
              <a-divider type="vertical" />
              <span class="status-item"> 運行時間：{{ formatUptime() }} </span>
            </a-space>
          </a-col>
          <a-col flex="none">
            <a-space size="small">
              <a-tooltip title="查看開發日誌">
                <a-button
                  size="small"
                  type="text"
                  @click="showLogs">
                  <template #icon><CodeOutlined /></template>
                  日誌
                </a-button>
              </a-tooltip>
              <a-tooltip title="回報問題">
                <a-button
                  size="small"
                  type="text"
                  @click="reportIssue">
                  <template #icon><BugOutlined /></template>
                  回報
                </a-button>
              </a-tooltip>
            </a-space>
          </a-col>
        </a-row>
      </div>
    </a-card>

    <!-- 幫助對話框 -->
    <a-modal
      :open="helpVisible"
      title="🔍 Playground 使用說明"
      @ok="helpVisible = false"
      @cancel="helpVisible = false"
      width="600px">
      <div class="help-content">
        <h4>🎯 功能概述</h4>
        <p>
          SFDA Nexus Playground
          是一個功能測試實驗室，用於測試和驗證各種前端功能模塊。
        </p>

        <h4>📋 可用功能</h4>
        <ul>
          <li>
            <strong>Markdown & Shiki 測試</strong>：測試 Markdown
            渲染和程式碼語法高亮功能
          </li>
          <li><strong>OpenCC 簡繁轉換</strong>：測試中文簡繁體雙向轉換功能</li>
          <li>
            <strong>智能圖表測試</strong>：測試 SmartChart
            組件的各種圖表功能和數據格式支援
          </li>
          <li>
            <strong>MCP 圖表創建測試</strong>：測試 AI 通過 MCP
            工具自動創建圖表的完整流程
          </li>
          <li>
            <strong>AI Stream 測試</strong>：(開發中) AI 聊天和流式響應測試
          </li>
          <li><strong>系統狀態監控</strong>：(開發中) 系統健康狀態檢查</li>
        </ul>

        <h4>🚀 快速開始</h4>
        <ol>
          <li>點擊上方 Tab 切換不同的測試功能</li>
          <li>每個 Tab 都有預設的測試案例可以載入</li>
          <li>可以輸入自定義內容進行測試</li>
          <li>使用調試模式查看詳細信息</li>
        </ol>

        <h4>💡 提示</h4>
        <ul>
          <li>建議在開發環境下使用，可以查看詳細的控制台日誌</li>
          <li>遇到問題可以使用 "刷新" 按鈕重置狀態</li>
          <li>使用 "回報" 按鈕提交 Bug 或建議</li>
        </ul>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { message, Modal } from "ant-design-vue";
import {
  ReloadOutlined,
  QuestionCircleOutlined,
  FileMarkdownOutlined,
  TranslationOutlined,
  BarChartOutlined,
  RobotOutlined,
  SettingOutlined,
  PlusOutlined,
  CodeOutlined,
  BugOutlined,
  ExperimentOutlined,
} from "@ant-design/icons-vue";
import MarkdownTab from "./components/MarkdownTab.vue";
import OpenCCTab from "./components/OpenCCTab.vue";
import ChartTab from "./components/ChartTab.vue";
import ChartCreationTest from "./components/ChartCreationTest.vue";

// 響應式數據
const activeTab = ref("markdown");
const helpVisible = ref(false);
const startTime = ref(Date.now());
const playgroundStatus = ref({
  overall: "processing",
  message: "初始化中...",
});

// Tab 名稱映射
const tabNames = {
  markdown: "Markdown & Shiki 測試",
  opencc: "OpenCC 簡繁轉換",
  chart: "智能圖表測試",
  "chart-creation": "MCP 圖表創建測試",
  aistream: "AI Stream 測試",
  system: "系統狀態監控",
  more: "更多功能",
};

// 方法
const getTabName = (key) => {
  return tabNames[key] || "未知功能";
};

const formatUptime = () => {
  const uptime = Date.now() - startTime.value;
  const minutes = Math.floor(uptime / 60000);
  const seconds = Math.floor((uptime % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const handleTabChange = (key) => {
  activeTab.value = key;
  message.info(`已切換到：${getTabName(key)}`);
};

const refreshAll = () => {
  message.loading("正在刷新所有測試環境...", 1.5);

  // 重置狀態
  startTime.value = Date.now();
  playgroundStatus.value = {
    overall: "processing",
    message: "重新初始化中...",
  };

  setTimeout(() => {
    playgroundStatus.value = {
      overall: "success",
      message: "所有功能正常",
    };
    message.success("刷新完成");
  }, 1500);
};

const showHelp = () => {
  helpVisible.value = true;
};

const showLogs = () => {
  console.log("=== SFDA Nexus Playground 日誌 ===");
  console.log("當前 Tab:", activeTab.value);
  console.log("運行時間:", formatUptime());
  console.log("狀態:", playgroundStatus.value);
  console.log("用戶代理:", navigator.userAgent);
  console.log("=================================");
  message.success("日誌已輸出到控制台");
};

const reportIssue = () => {
  Modal.info({
    title: "🐛 問題回報",
    content: `
      請將以下信息一併提供：
      
      • 當前功能：${getTabName(activeTab.value)}
      • 瀏覽器：${navigator.userAgent.split(" ")[0]}
      • 時間：${new Date().toLocaleString()}
      • 運行環境：${process.env.NODE_ENV || "development"}
      
      您可以通過以下方式回報問題：
      1. 在開發團隊群組中描述問題
      2. 創建 GitHub Issue
      3. 聯繫系統管理員
    `,
    width: 500,
  });
};

// 生命週期
onMounted(() => {
  console.log("🧪 SFDA Nexus Playground 已載入");

  // 模擬初始化過程
  setTimeout(() => {
    playgroundStatus.value = {
      overall: "success",
      message: "所有功能正常",
    };
  }, 1000);
});

onUnmounted(() => {
  console.log("🧪 SFDA Nexus Playground 已卸載");
});
</script>

<style scoped>
.playground-container {
  padding: 16px;
  min-height: calc(100vh - 120px);
}

.playground-card {
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  background: var(--custom-bg-primary);
  border: 1px solid var(--custom-border-primary);
}

[data-theme="dark"] .playground-card {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.playground-tabs {
  margin-top: 16px;
}

.playground-tabs :deep(.ant-tabs-card .ant-tabs-tab) {
  border-radius: 8px 8px 0 0;
  border: 1px solid var(--custom-border-primary);
  background: var(--custom-bg-secondary);
  color: var(--custom-text-secondary);
  transition: all 0.3s ease;
}

.playground-tabs :deep(.ant-tabs-card .ant-tabs-tab-active) {
  background: var(--custom-bg-primary);
  border-bottom-color: var(--custom-bg-primary);
  color: var(--custom-text-primary);
}

.playground-tabs :deep(.ant-tabs-card .ant-tabs-tab:hover) {
  background: var(--custom-bg-tertiary);
  color: var(--custom-text-primary);
}

.playground-tabs :deep(.ant-tabs-card .ant-tabs-tab-disabled) {
  background: var(--custom-bg-quaternary);
  color: var(--custom-text-tertiary);
  opacity: 0.6;
}

.playground-tabs :deep(.ant-tabs-content-holder) {
  background: var(--custom-bg-primary);
  border: 1px solid var(--custom-border-primary);
  border-top: none;
  border-radius: 0 0 8px 8px;
  padding: 24px;
  min-height: 600px;
}

.coming-soon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: var(--custom-text-secondary);
}

.playground-footer {
  margin-top: 20px;
  padding: 12px 16px;
  background: var(--custom-bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--custom-border-primary);
}

.status-item {
  font-size: 12px;
  color: var(--custom-text-secondary);
}

.help-content h4 {
  color: var(--primary-color);
  margin-top: 16px;
  margin-bottom: 8px;
}

.help-content h4:first-child {
  margin-top: 0;
}

.help-content ul,
.help-content ol {
  margin-left: 16px;
}

.help-content li {
  margin-bottom: 4px;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .playground-container {
    padding: 8px;
  }

  .playground-tabs :deep(.ant-tabs-content-holder) {
    padding: 16px;
  }

  .playground-footer {
    padding: 8px 12px;
  }

  .playground-footer .ant-row {
    flex-direction: column;
    gap: 8px;
  }
}

/* 主題相關樣式已整合到統一變量系統 */
</style>

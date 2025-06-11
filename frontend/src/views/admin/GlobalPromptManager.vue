<template>
  <div class="global-prompt-manager">
    <div class="page-header">
      <h1>
        <GlobalOutlined class="page-icon" />
        全域提示詞管理
      </h1>
      <p class="page-description">管理所有智能體共同遵守的行為規則和提示詞</p>
    </div>

    <!-- 統計卡片 -->
    <div class="stats-cards">
      <a-row :gutter="16">
        <a-col :span="6">
          <a-card>
            <a-statistic
              title="全域規則狀態"
              :value="stats.globalRulesStats?.cacheStatus || 'unknown'"
              :value-style="{
                color:
                  stats.globalRulesStats?.cacheStatus === 'cached'
                    ? '#3f8600'
                    : '#cf1322',
              }">
              <template #prefix>
                <CheckCircleOutlined
                  v-if="stats.globalRulesStats?.cacheStatus === 'cached'" />
                <ExclamationCircleOutlined v-else />
              </template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card>
            <a-statistic
              title="規則內容長度"
              :value="stats.globalRulesStats?.rulesLength || 0"
              suffix="字符">
              <template #prefix>
                <FileTextOutlined />
              </template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card>
            <a-statistic
              title="啟用工具數量"
              :value="stats.toolStats?.enabled_tools || 0">
              <template #prefix>
                <ToolOutlined />
              </template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card>
            <a-statistic
              title="系統健康度"
              :value="systemHealth"
              :value-style="{
                color: systemHealth === '良好' ? '#3f8600' : '#cf1322',
              }">
              <template #prefix>
                <HeartOutlined />
              </template>
            </a-statistic>
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- 操作面板 -->
    <a-card
      title="操作面板"
      class="operation-panel">
      <a-space size="middle">
        <a-button
          type="primary"
          @click="refreshRules"
          :loading="loading.refresh">
          <ReloadOutlined />
          刷新規則
        </a-button>
        <a-button
          @click="clearCache"
          :loading="loading.clearCache">
          <DeleteOutlined />
          清除快取
        </a-button>
        <a-button
          @click="showPreview"
          :loading="loading.preview">
          <EyeOutlined />
          預覽全域規則
        </a-button>
        <a-button @click="showSystemPromptTest">
          <ExperimentOutlined />
          系統提示詞測試
        </a-button>
      </a-space>
    </a-card>

    <!-- 全域規則預覽 -->
    <a-card
      title="全域規則預覽"
      class="rules-preview"
      v-if="rulesPreview">
      <template #extra>
        <a-space>
          <a-tag color="blue">長度: {{ rulesPreview.length }} 字符</a-tag>
          <a-button
            size="small"
            @click="copyRules">
            <CopyOutlined />
            複製
          </a-button>
        </a-space>
      </template>
      <a-typography>
        <pre class="rules-content">{{ rulesPreview }}</pre>
      </a-typography>
    </a-card>

    <!-- 系統健康狀態 -->
    <a-card
      title="系統健康狀態"
      class="health-status">
      <a-descriptions
        :column="2"
        bordered>
        <a-descriptions-item label="全域提示詞服務">
          <a-tag
            :color="
              stats.systemHealth?.globalPromptService === 'active'
                ? 'green'
                : 'red'
            ">
            {{ stats.systemHealth?.globalPromptService || "unknown" }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="聊天服務">
          <a-tag
            :color="
              stats.systemHealth?.chatService === 'active' ? 'green' : 'red'
            ">
            {{ stats.systemHealth?.chatService || "unknown" }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="快取系統">
          <a-tag
            :color="
              stats.systemHealth?.cacheSystem === 'active' ? 'green' : 'red'
            ">
            {{ stats.systemHealth?.cacheSystem || "unknown" }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="最後更新">
          {{ stats.timestamp ? formatTime(stats.timestamp) : "N/A" }}
        </a-descriptions-item>
      </a-descriptions>
    </a-card>

    <!-- 系統提示詞測試對話框 -->
    <a-modal
      v-model:open="systemPromptTestVisible"
      title="系統提示詞測試"
      width="80%"
      :footer="null"
      class="system-prompt-test-modal">
      <div class="test-container">
        <a-form layout="vertical">
          <a-form-item
            label="基礎提示詞"
            help="輸入智能體的基礎提示詞，查看整合後的完整系統提示詞">
            <a-textarea
              :value="testBasePrompt"
              @input="testBasePrompt = $event.target.value"
              placeholder="例如：你是一個專業的 HR 助理，擅長處理員工相關問題。"
              :rows="4" />
          </a-form-item>
          <a-form-item>
            <a-space>
              <a-button
                type="primary"
                @click="generateTestPrompt"
                :loading="loading.test">
                <ExperimentOutlined />
                生成完整提示詞
              </a-button>
              <a-button @click="clearTestPrompt">
                <ClearOutlined />
                清除
              </a-button>
            </a-space>
          </a-form-item>
        </a-form>

        <div
          v-if="testResult"
          class="test-result">
          <a-descriptions
            :column="1"
            bordered
            size="small">
            <a-descriptions-item label="基礎提示詞長度">
              {{ testResult.basePromptLength }} 字符
            </a-descriptions-item>
            <a-descriptions-item label="完整提示詞長度">
              {{ testResult.promptLength }} 字符
            </a-descriptions-item>
            <a-descriptions-item label="包含全域規則">
              <a-tag :color="testResult.hasGlobalRules ? 'green' : 'red'">
                {{ testResult.hasGlobalRules ? "是" : "否" }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="包含工具提示詞">
              <a-tag :color="testResult.hasToolPrompts ? 'green' : 'orange'">
                {{ testResult.hasToolPrompts ? "是" : "否" }}
              </a-tag>
            </a-descriptions-item>
          </a-descriptions>

          <div class="prompt-preview">
            <h4>完整系統提示詞預覽：</h4>
            <pre class="full-prompt-content">{{ testResult.fullPrompt }}</pre>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script>
import { defineComponent, ref, reactive, onMounted, computed } from "vue";
import {
  GlobalOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  ToolOutlined,
  HeartOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  ExperimentOutlined,
  CopyOutlined,
  ClearOutlined,
} from "@ant-design/icons-vue";
import { message } from "ant-design-vue";
import {
  getGlobalPromptStats,
  getGlobalPromptPreview,
  getSystemPromptPreview,
  clearGlobalPromptCache,
} from "@/api/system";

export default defineComponent({
  name: "GlobalPromptManager",
  components: {
    GlobalOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    FileTextOutlined,
    ToolOutlined,
    HeartOutlined,
    ReloadOutlined,
    DeleteOutlined,
    EyeOutlined,
    ExperimentOutlined,
    CopyOutlined,
    ClearOutlined,
  },
  setup() {
    const stats = ref({});
    const rulesPreview = ref("");
    const systemPromptTestVisible = ref(false);
    const testBasePrompt = ref("");
    const testResult = ref(null);

    const loading = reactive({
      refresh: false,
      clearCache: false,
      preview: false,
      test: false,
    });

    const systemHealth = computed(() => {
      const health = stats.value.systemHealth;
      if (!health) return "未知";

      const services = Object.values(health);
      const activeCount = services.filter(
        (status) => status === "active"
      ).length;
      const totalCount = services.length;

      if (activeCount === totalCount) return "良好";
      if (activeCount > totalCount / 2) return "一般";
      return "異常";
    });

    // 獲取統計資訊
    const fetchStats = async () => {
      try {
        const response = await getGlobalPromptStats();
        if (response.success) {
          stats.value = response.data;
        }
      } catch (error) {
        console.error("獲取統計資訊失敗:", error);
        message.error("獲取統計資訊失敗");
      }
    };

    // 刷新規則
    const refreshRules = async () => {
      loading.refresh = true;
      try {
        await fetchStats();
        message.success("規則已刷新");
      } catch (error) {
        message.error("刷新規則失敗");
      } finally {
        loading.refresh = false;
      }
    };

    // 清除快取
    const clearCache = async () => {
      loading.clearCache = true;
      try {
        const response = await clearGlobalPromptCache();
        if (response.success) {
          message.success("快取已清除");
          await fetchStats(); // 重新獲取統計
        }
      } catch (error) {
        console.error("清除快取失敗:", error);
        message.error("清除快取失敗");
      } finally {
        loading.clearCache = false;
      }
    };

    // 顯示規則預覽
    const showPreview = async () => {
      loading.preview = true;
      try {
        const response = await getGlobalPromptPreview();
        if (response.success) {
          rulesPreview.value = response.data.rules;
          message.success("規則預覽已載入");
        }
      } catch (error) {
        console.error("獲取規則預覽失敗:", error);
        message.error("獲取規則預覽失敗");
      } finally {
        loading.preview = false;
      }
    };

    // 複製規則
    const copyRules = async () => {
      try {
        await navigator.clipboard.writeText(rulesPreview.value);
        message.success("規則已複製到剪貼簿");
      } catch (error) {
        console.error("複製失敗:", error);
        message.error("複製失敗");
      }
    };

    // 顯示系統提示詞測試
    const showSystemPromptTest = () => {
      systemPromptTestVisible.value = true;
      testBasePrompt.value = "你是一個專業的 HR 助理，擅長處理員工相關問題。";
    };

    // 生成測試提示詞
    const generateTestPrompt = async () => {
      loading.test = true;
      try {
        const response = await getSystemPromptPreview({
          basePrompt: testBasePrompt.value,
        });
        if (response.success) {
          testResult.value = response.data;
          message.success("系統提示詞已生成");
        }
      } catch (error) {
        console.error("生成系統提示詞失敗:", error);
        message.error("生成系統提示詞失敗");
      } finally {
        loading.test = false;
      }
    };

    // 清除測試提示詞
    const clearTestPrompt = () => {
      testBasePrompt.value = "";
      testResult.value = null;
    };

    // 格式化時間
    const formatTime = (timestamp) => {
      return new Date(timestamp).toLocaleString("zh-TW");
    };

    onMounted(() => {
      fetchStats();
    });

    return {
      stats,
      rulesPreview,
      systemPromptTestVisible,
      testBasePrompt,
      testResult,
      loading,
      systemHealth,
      refreshRules,
      clearCache,
      showPreview,
      copyRules,
      showSystemPromptTest,
      generateTestPrompt,
      clearTestPrompt,
      formatTime,
    };
  },
});
</script>

<style scoped>
.global-prompt-manager {
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  display: flex;
  align-items: center;
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
}

.page-icon {
  margin-right: 12px;
  color: #1890ff;
}

.page-description {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.stats-cards {
  margin-bottom: 24px;
}

.operation-panel,
.rules-preview,
.health-status {
  margin-bottom: 24px;
}

.rules-content {
  background: #f5f5f5;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  padding: 16px;
  max-height: 400px;
  overflow-y: auto;
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  font-size: 13px;
  line-height: 1.4;
  white-space: pre-wrap;
  margin: 0;
}

.system-prompt-test-modal .test-container {
  max-height: 70vh;
  overflow-y: auto;
}

.test-result {
  margin-top: 24px;
}

.prompt-preview {
  margin-top: 16px;
}

.prompt-preview h4 {
  margin-bottom: 12px;
  color: #1890ff;
}

.full-prompt-content {
  background: #f5f5f5;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  padding: 16px;
  max-height: 300px;
  overflow-y: auto;
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  font-size: 13px;
  line-height: 1.4;
  white-space: pre-wrap;
  margin: 0;
}

:deep(.ant-statistic-content) {
  font-size: 20px;
}

:deep(.ant-card-head-title) {
  font-weight: 600;
}
</style>

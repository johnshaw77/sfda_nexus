<template>
  <div class="chart-test-tab">
    <div class="tab-header">
      <h3>📊 智能圖表系統測試</h3>
      <p>測試 SmartChart 組件的各種功能和數據格式支援</p>
    </div>

    <!-- 快速操作區 -->
    <div class="quick-actions">
      <a-card
        size="small"
        title="🚀 快速測試">
        <a-row :gutter="[8, 8]">
          <a-col :span="6">
            <a-button
              block
              @click="loadQuickTest('pie')"
              size="small">
              📈 餅圖測試
            </a-button>
          </a-col>
          <a-col :span="6">
            <a-button
              block
              @click="loadQuickTest('bar')"
              size="small">
              📊 柱狀圖測試
            </a-button>
          </a-col>
          <a-col :span="6">
            <a-button
              block
              @click="loadQuickTest('line')"
              size="small">
              📉 折線圖測試
            </a-button>
          </a-col>
          <a-col :span="6">
            <a-button
              block
              @click="loadQuickTest('auto')"
              size="small">
              🤖 智能推薦
            </a-button>
          </a-col>
        </a-row>
      </a-card>
    </div>

    <!-- 測試區域 -->
    <div class="test-sections">
      <!-- 當前測試 -->
      <div class="current-test-section">
        <a-card
          title="🎯 當前測試"
          size="small">
          <template #extra>
            <a-space>
              <a-tag :color="currentTest.type === 'auto' ? 'blue' : 'green'">
                {{ currentTest.label }}
              </a-tag>
              <a-button
                size="small"
                @click="resetTest"
                >重置</a-button
              >
            </a-space>
          </template>

          <!-- 數據輸入區 -->
          <a-row :gutter="16">
            <a-col :span="8">
              <div class="data-input-section">
                <h4>📝 數據輸入</h4>
                <a-textarea
                  :value="currentDataInput"
                  @input="handleDataInput"
                  :rows="8"
                  placeholder="輸入JSON數據、CSV格式或自然語言數據..."
                  style="font-family: monospace; font-size: 12px" />

                <div
                  class="input-actions"
                  style="margin-top: 8px">
                  <a-space size="small">
                    <a-button
                      size="small"
                      @click="parseAndGenerate"
                      type="primary">
                      🎨 生成圖表
                    </a-button>
                    <a-button
                      size="small"
                      @click="loadSampleData">
                      📋 載入範例
                    </a-button>
                    <a-button
                      size="small"
                      @click="clearData">
                      🗑️ 清空
                    </a-button>
                  </a-space>
                </div>

                <!-- 數據預覽 -->
                <div
                  v-if="parsedData"
                  class="data-preview"
                  style="margin-top: 12px">
                  <h5>🔍 解析結果：</h5>
                  <pre
                    style="font-size: 10px; max-height: 120px; overflow-y: auto"
                    >{{ JSON.stringify(parsedData, null, 2) }}</pre
                  >
                </div>
              </div>
            </a-col>

            <!-- 圖表展示區 -->
            <a-col :span="16">
              <div class="chart-display-section">
                <h4>📊 圖表展示</h4>
                <div
                  v-if="showChart"
                  class="chart-container">
                  <SmartChart
                    :data="parsedData"
                    :title="currentTest.title"
                    :description="currentTest.description"
                    :chart-type="currentTest.type"
                    :height="320"
                    @chart-ready="onChartReady"
                    @error="onChartError" />
                </div>
                <div
                  v-else
                  class="empty-chart">
                  <a-empty description="請輸入數據並生成圖表">
                    <template #image> 📊 </template>
                  </a-empty>
                </div>
              </div>
            </a-col>
          </a-row>
        </a-card>
      </div>

      <!-- 預設測試案例 -->
      <div class="preset-tests-section">
        <a-card
          title="🧪 預設測試案例"
          size="small">
          <a-row :gutter="[12, 12]">
            <a-col
              :xs="24"
              :sm="12"
              :md="8"
              :lg="6"
              :xl="6"
              v-for="(testCase, index) in testCases"
              :key="index">
              <a-card
                size="small"
                :title="testCase.name"
                class="test-case-card"
                :class="{ active: currentTestCase === index }"
                @click="loadTestCase(testCase, index)">
                <template #extra>
                  <a-tag
                    size="small"
                    :color="testCase.chartType === 'auto' ? 'blue' : 'green'">
                    {{ testCase.chartType }}
                  </a-tag>
                </template>
                <p class="test-case-desc">{{ testCase.description }}</p>
                <div class="test-case-preview">
                  <span style="font-size: 11px; color: #666">
                    {{
                      typeof testCase.data === "object"
                        ? JSON.stringify(testCase.data).substring(0, 60) + "..."
                        : testCase.data.substring(0, 60) + "..."
                    }}
                  </span>
                </div>
              </a-card>
            </a-col>
          </a-row>
        </a-card>
      </div>

      <!-- 測試結果和統計 -->
      <div class="test-results-section">
        <a-card
          title="📋 測試結果"
          size="small">
          <a-row :gutter="16">
            <a-col :span="16">
              <div class="results-list">
                <a-list
                  size="small"
                  :data-source="testResults.slice(-5)">
                  <template #renderItem="{ item }">
                    <a-list-item>
                      <a-list-item-meta>
                        <template #title>
                          <span
                            :class="{
                              success: item.success,
                              error: !item.success,
                            }">
                            {{ item.title }}
                          </span>
                        </template>
                        <template #description>
                          {{ item.description }}
                        </template>
                      </a-list-item-meta>
                      <template #actions>
                        <span style="font-size: 11px; color: #999">
                          {{ new Date(item.timestamp).toLocaleTimeString() }}
                        </span>
                      </template>
                    </a-list-item>
                  </template>
                </a-list>
              </div>
            </a-col>
            <a-col :span="8">
              <div class="test-stats">
                <a-statistic
                  title="測試總數"
                  :value="testResults.length"
                  prefix="🧪" />
                <a-statistic
                  title="成功率"
                  :value="successRate"
                  suffix="%"
                  :value-style="{
                    color: successRate > 80 ? '#3f8600' : '#cf1322',
                  }"
                  prefix="✅" />
                <a-statistic
                  title="圖表類型"
                  :value="uniqueChartTypes"
                  prefix="📊" />
              </div>
            </a-col>
          </a-row>
        </a-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { message } from "ant-design-vue";
import SmartChart from "@/components/common/SmartChart.vue";
import { dataProcessor } from "@/utils/dataProcessor";
import { FileDataParser } from "@/utils/fileDataParser";
import { ConversationDataExtractor } from "@/utils/conversationDataExtractor";
import { ApiDataAdapter } from "@/utils/apiDataAdapter";
import { mcpStatisticalAdapter } from "@/utils/mcpStatisticalAdapter";

// 創建工具實例
const fileParser = new FileDataParser();
const conversationExtractor = new ConversationDataExtractor();
const apiAdapter = new ApiDataAdapter();

// 響應式數據
const currentDataInput = ref("");
const parsedData = ref(null);
const showChart = ref(false);
const currentTestCase = ref(-1);
const testResults = ref([]);
const uploadingFile = ref(false);
const processingApi = ref(false);

// 當前測試配置
const currentTest = ref({
  type: "auto",
  label: "智能推薦",
  title: "測試圖表",
  description: "圖表測試說明",
});

// 預設測試案例
const testCases = ref([
  {
    name: "銷售數據",
    description: "各產品銷售數量對比",
    chartType: "auto",
    data: {
      iPhone: 200,
      Samsung: 150,
      HUAWEI: 100,
      OPPO: 80,
      vivo: 90,
    },
  },
  {
    name: "月度業績",
    description: "月度銷售趨勢",
    chartType: "line",
    data: [
      { month: "1月", sales: 120 },
      { month: "2月", sales: 150 },
      { month: "3月", sales: 100 },
      { month: "4月", sales: 180 },
      { month: "5月", sales: 200 },
      { month: "6月", sales: 160 },
    ],
  },
  {
    name: "性別比例",
    description: "用戶性別分布",
    chartType: "pie",
    data: {
      男性: 45,
      女性: 55,
    },
  },
  {
    name: "產品評分",
    description: "多維度產品評價",
    chartType: "radar",
    data: [{ name: "產品A", quality: 85, price: 70, service: 90, brand: 80 }],
  },
  {
    name: "CSV 格式",
    description: "CSV 字符串解析測試",
    chartType: "auto",
    data: `產品,銷量,利潤
iPhone,200,50
Samsung,150,35
HUAWEI,100,25`,
  },
  {
    name: "自然語言",
    description: "從文字提取數據",
    chartType: "auto",
    data: "蘋果佔比40%，安卓佔比60%",
  },
  {
    name: "MCP統計結果",
    description: "T檢定統計分析",
    chartType: "statistical",
    data: {
      tool: "perform_ttest",
      t_statistic: 2.856,
      p_value: 0.0043,
      confidence_interval: [1.2, 4.8],
      group1_mean: 15.2,
      group2_mean: 18.5,
      group1_name: "控制組",
      group2_name: "實驗組",
    },
  },
  {
    name: "對話提取",
    description: "從自然語言對話提取數據",
    chartType: "auto",
    data: "根據最新統計，iPhone銷量達到200萬台，Samsung為150萬台，HUAWEI為100萬台。同時，第一季度營收為120萬，第二季度150萬，第三季度100萬，第四季度180萬。",
  },
]);

// 計算屬性
const successRate = computed(() => {
  if (testResults.value.length === 0) return 0;
  const successCount = testResults.value.filter((r) => r.success).length;
  return Math.round((successCount / testResults.value.length) * 100);
});

const uniqueChartTypes = computed(() => {
  const types = new Set(
    testResults.value.map((r) => r.chartType).filter(Boolean)
  );
  return types.size;
});

// 方法
const loadQuickTest = (type) => {
  const testData = {
    pie: { 項目A: 30, 項目B: 25, 項目C: 45 },
    bar: [
      { category: "Q1", value: 100 },
      { category: "Q2", value: 120 },
      { category: "Q3", value: 80 },
      { category: "Q4", value: 140 },
    ],
    line: [
      { date: "1月", value: 65 },
      { date: "2月", value: 78 },
      { date: "3月", value: 90 },
      { date: "4月", value: 82 },
      { date: "5月", value: 95 },
    ],
    auto: { Android: 60, iOS: 40 },
  };

  currentTest.value = {
    type: type,
    label: type === "auto" ? "智能推薦" : type.toUpperCase(),
    title: `${type.toUpperCase()} 快速測試`,
    description: `${type} 圖表類型的快速測試`,
  };

  parsedData.value = testData[type];
  currentDataInput.value = JSON.stringify(testData[type], null, 2);
  showChart.value = true;
  currentTestCase.value = -1;

  addTestResult({
    title: `快速測試 - ${type.toUpperCase()}`,
    description: "快速測試成功載入",
    success: true,
    chartType: type,
  });

  message.success(`已載入 ${type.toUpperCase()} 快速測試`);
};

const handleDataInput = (e) => {
  currentDataInput.value = e.target.value;
};

const parseAndGenerate = async () => {
  if (!currentDataInput.value.trim()) {
    message.warning("請輸入數據");
    return;
  }

  try {
    let result;
    let dataSource = "unknown";

    // 檢測並處理不同數據格式和來源
    const inputData = currentDataInput.value.trim();

    // 1. 檢測是否為 MCP 統計結果
    if (inputData.startsWith("{") && inputData.includes("statistic")) {
      try {
        const jsonData = JSON.parse(inputData);
        if (mcpStatisticalAdapter.isStatisticalData(jsonData)) {
          const adaptedResult = mcpStatisticalAdapter.adaptMcpResult(jsonData);
          if (adaptedResult.success) {
            result = adaptedResult;
            dataSource = "mcp_statistical";
            currentTest.value.type = "statistical";
          }
        }
      } catch (e) {
        // 不是有效的統計JSON，繼續其他檢測
      }
    }

    // 2. 如果不是統計數據，使用原有邏輯
    if (!result) {
      if (inputData.startsWith("{") || inputData.startsWith("[")) {
        // JSON 格式
        result = JSON.parse(inputData);
        dataSource = "json";
      } else if (inputData.includes(",") && inputData.includes("\n")) {
        // CSV 格式
        result = await dataProcessor.processCsvString(inputData);
        dataSource = "csv";
      } else if (
        inputData.length > 50 &&
        (inputData.includes("萬台") ||
          inputData.includes("營收") ||
          inputData.includes("季度"))
      ) {
        // 複雜自然語言對話數據
        result = conversationExtractor.extractMultipleDataSets(inputData);
        dataSource = "conversation";

        // 如果提取到多個數據集，選擇第一個用於展示
        if (result && result.datasets && result.datasets.length > 0) {
          result = result.datasets[0].data;
        }
      } else {
        // 簡單自然語言格式
        result = dataProcessor.extractFromNaturalLanguage(inputData);
        dataSource = "natural_language";
      }
    }

    // 3. 處理統計結果的特殊展示
    if (dataSource === "mcp_statistical" && result.charts) {
      // 對於統計結果，我們展示第一個圖表
      if (result.charts.length > 0) {
        parsedData.value = result.charts[0].data;
        currentTest.value.type = result.charts[0].type;
        currentTest.value.title = result.charts[0].title;
      }
    } else {
      parsedData.value = result;
    }

    showChart.value = true;

    addTestResult({
      title: "數據解析和圖表生成",
      description: `成功解析 ${dataSource} 數據並生成 ${currentTest.value.type} 圖表`,
      success: true,
      chartType: currentTest.value.type,
      dataSource: dataSource,
    });

    message.success(`圖表生成成功 (數據來源: ${dataSource})`);
  } catch (error) {
    console.error("解析失敗:", error);
    message.error(`數據解析失敗: ${error.message}`);

    addTestResult({
      title: "數據解析失敗",
      description: error.message,
      success: false,
    });
  }
};

const loadSampleData = () => {
  const samples = [
    '{"蘋果": 30, "橙子": 25, "香蕉": 45}',
    '[{"月份": "1月", "銷量": 100}, {"月份": "2月", "銷量": 120}]',
    "產品,數量\n筆記本,50\n滑鼠,30\n鍵盤,20",
    "男性用戶佔比45%，女性用戶佔比55%",
  ];

  const randomSample = samples[Math.floor(Math.random() * samples.length)];
  currentDataInput.value = randomSample;
  message.success("已載入隨機範例數據");
};

const clearData = () => {
  currentDataInput.value = "";
  parsedData.value = null;
  showChart.value = false;
  currentTestCase.value = -1;
  message.success("已清空數據");
};

const loadTestCase = (testCase, index) => {
  currentTestCase.value = index;
  currentTest.value = {
    type: testCase.chartType,
    label:
      testCase.chartType === "auto"
        ? "智能推薦"
        : testCase.chartType.toUpperCase(),
    title: testCase.name,
    description: testCase.description,
  };

  if (typeof testCase.data === "object") {
    currentDataInput.value = JSON.stringify(testCase.data, null, 2);
    parsedData.value = testCase.data;
  } else {
    currentDataInput.value = testCase.data;
    // 需要解析
    parseAndGenerate();
    return;
  }

  showChart.value = true;

  addTestResult({
    title: `載入測試案例 - ${testCase.name}`,
    description: testCase.description,
    success: true,
    chartType: testCase.chartType,
  });

  message.success(`已載入測試案例：${testCase.name}`);
};

const resetTest = () => {
  currentTest.value = {
    type: "auto",
    label: "智能推薦",
    title: "測試圖表",
    description: "圖表測試說明",
  };
  clearData();
};

const onChartReady = (result) => {
  console.log("圖表準備完成:", result);
  addTestResult({
    title: "圖表渲染成功",
    description: `${result.suggestions?.length || 0} 個推薦方案`,
    success: true,
    chartType: currentTest.value.type,
  });
};

const onChartError = (error) => {
  console.error("圖表錯誤:", error);
  addTestResult({
    title: "圖表渲染失敗",
    description: error.message || "未知錯誤",
    success: false,
  });
};

const addTestResult = (result) => {
  testResults.value.push({
    ...result,
    timestamp: Date.now(),
    id: Date.now(),
  });
};

// 生命週期
onMounted(() => {
  addTestResult({
    title: "圖表測試 Tab 載入",
    description: "圖表測試環境初始化完成",
    success: true,
  });
});
</script>

<style scoped>
.chart-test-tab {
  margin-bottom: 16px;
}

.tab-header {
  text-align: center;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--custom-border-color);
}

.tab-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--custom-text-color);
  margin-bottom: 8px;
  margin-top: 0;
}

.tab-header p {
  font-size: 14px;
  color: var(--custom-text-color-secondary);
  margin: 0;
}

.quick-actions {
  margin-bottom: 16px;
}

.test-sections > * {
  margin-bottom: 16px;
}

.data-input-section h4,
.chart-display-section h4 {
  font-size: 14px;
  font-weight: 500;
  color: var(--custom-text-color);
  margin-bottom: 8px;
}

.chart-container {
  border: 1px solid var(--custom-border-color);
  border-radius: 8px;
  overflow: hidden;
}

.empty-chart {
  border: 2px dashed var(--custom-border-color);
  border-radius: 8px;
  padding: 32px;
  text-align: center;
  color: var(--custom-text-color-secondary);
}

.data-preview {
  background: var(--custom-bg-color);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid var(--custom-border-color);
}

.data-preview h5 {
  font-size: 12px;
  font-weight: 500;
  color: var(--custom-text-color-secondary);
  margin-bottom: 8px;
  margin-top: 0;
}

.data-preview pre {
  color: var(--custom-text-color);
  font-family: "Courier New", monospace;
  background: var(--custom-bg-color-light);
  padding: 8px;
  border-radius: 4px;
  border: 1px solid var(--custom-border-color);
  margin: 0;
}

.test-case-card {
  cursor: pointer;
  transition: all 0.3s ease;
}

.test-case-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.test-case-card.active {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.test-case-desc {
  font-size: 12px;
  color: var(--custom-text-color-secondary);
  margin-bottom: 8px;
}

.test-case-preview {
  background: var(--custom-bg-color);
  padding: 8px;
  border-radius: 4px;
  font-size: 10px;
  font-family: monospace;
  border: 1px solid var(--custom-border-color);
}

.results-list {
  max-height: 240px;
  overflow-y: auto;
}

.test-stats > * {
  margin-bottom: 16px;
}

.success {
  color: #52c41a;
}

.error {
  color: #ff4d4f;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .data-input-section,
  .chart-display-section {
    margin-bottom: 16px;
  }

  .tab-header h3 {
    font-size: 16px;
  }

  .test-case-card {
    margin-bottom: 8px;
  }
}

/* 滾動條樣式 */
.results-list::-webkit-scrollbar {
  width: 6px;
}

.results-list::-webkit-scrollbar-track {
  background: var(--custom-bg-color);
}

.results-list::-webkit-scrollbar-thumb {
  background: var(--custom-border-color);
  border-radius: 3px;
}

.results-list::-webkit-scrollbar-thumb:hover {
  background: var(--custom-text-color-secondary);
}
</style>

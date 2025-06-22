<template>
  <div class="chart-test-page">
    <div class="test-header">
      <h1>圖表組件測試頁面</h1>
      <p>測試 SmartChart 組件的各種功能和數據格式</p>
    </div>

    <div class="test-sections">
      <!-- 簡單鍵值對數據測試 -->
      <div class="test-section">
        <h2>1. 簡單鍵值對數據 (自動推薦)</h2>
        <div class="test-data">
          <pre>{{ JSON.stringify(testData1, null, 2) }}</pre>
        </div>
        <SmartChart
          :data="testData1"
          title="銷售數據圖表"
          description="各產品的銷售數量對比"
          chart-type="auto" />
      </div>

      <!-- 對象數組數據測試 -->
      <div class="test-section">
        <h2>2. 對象數組數據 (指定柱狀圖)</h2>
        <div class="test-data">
          <pre>{{ JSON.stringify(testData2, null, 2) }}</pre>
        </div>
        <SmartChart
          :data="testData2"
          title="月度業績報告"
          description="各月份業績數據比較"
          chart-type="bar" />
      </div>

      <!-- 時間序列數據測試 -->
      <div class="test-section">
        <h2>3. 時間序列數據 (自動推薦)</h2>
        <div class="test-data">
          <pre>{{ JSON.stringify(testData3, null, 2) }}</pre>
        </div>
        <SmartChart
          :data="testData3"
          title="用戶增長趨勢"
          description="過去6個月的用戶數量變化"
          chart-type="auto" />
      </div>

      <!-- 多維數據測試 -->
      <div class="test-section">
        <h2>4. 多維數據 (雷達圖)</h2>
        <div class="test-data">
          <pre>{{ JSON.stringify(testData4, null, 2) }}</pre>
        </div>
        <SmartChart
          :data="testData4"
          title="產品評分雷達圖"
          description="不同維度的產品評分對比"
          chart-type="radar" />
      </div>

      <!-- 自然語言數據提取測試 -->
      <div class="test-section">
        <h2>5. 自然語言數據提取</h2>
        <div class="test-controls">
          <a-textarea
            v-model:value="naturalLanguageText"
            :rows="4"
            placeholder="輸入包含數據的自然語言文字，例如：男性40%，女性60%"
            style="margin-bottom: 16px" />
          <a-button
            @click="extractAndChart"
            type="primary"
            :loading="extracting">
            提取數據並生成圖表
          </a-button>
        </div>
        <div v-if="extractedData">
          <h4>提取的數據：</h4>
          <pre>{{ JSON.stringify(extractedData, null, 2) }}</pre>
          <SmartChart
            :data="extractedData"
            title="自然語言提取的數據圖表"
            description="從文字中提取並生成的圖表"
            chart-type="auto" />
        </div>
      </div>

      <!-- CSV 數據測試 -->
      <div class="test-section">
        <h2>6. CSV 格式數據</h2>
        <div class="test-controls">
          <a-textarea
            v-model:value="csvText"
            :rows="6"
            placeholder="輸入 CSV 格式數據"
            style="margin-bottom: 16px" />
          <a-button
            @click="parseCsvAndChart"
            type="primary"
            :loading="parsing">
            解析 CSV 並生成圖表
          </a-button>
        </div>
        <div v-if="csvData">
          <h4>解析的數據：</h4>
          <pre
            >{{ JSON.stringify(csvData.slice(0, 3), null, 2)
            }}{{ csvData.length > 3 ? "\n..." : "" }}</pre
          >
          <SmartChart
            :data="csvData"
            title="CSV 數據圖表"
            description="從 CSV 解析並生成的圖表"
            chart-type="auto" />
        </div>
      </div>
    </div>

    <!-- 測試結果 -->
    <div class="test-results">
      <h2>測試結果</h2>
      <a-list>
        <a-list-item
          v-for="result in testResults"
          :key="result.id">
          <a-list-item-meta>
            <template #title>
              <span
                :class="{ success: result.success, error: !result.success }">
                {{ result.title }}
              </span>
            </template>
            <template #description>
              {{ result.description }}
            </template>
          </a-list-item-meta>
        </a-list-item>
      </a-list>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { message } from "ant-design-vue";
import SmartChart from "@/components/common/SmartChart.vue";
import { dataProcessor } from "@/utils/dataProcessor";

// 測試數據
const testData1 = ref({
  iPhone: 200,
  Samsung: 150,
  HUAWEI: 100,
  OPPO: 80,
  vivo: 90,
});

const testData2 = ref([
  { month: "1月", sales: 120, profit: 30 },
  { month: "2月", sales: 150, profit: 40 },
  { month: "3月", sales: 100, profit: 25 },
  { month: "4月", sales: 180, profit: 50 },
  { month: "5月", sales: 200, profit: 60 },
  { month: "6月", sales: 160, profit: 45 },
]);

const testData3 = ref([
  { date: "2024-01", users: 1200 },
  { date: "2024-02", users: 1350 },
  { date: "2024-03", users: 1100 },
  { date: "2024-04", users: 1800 },
  { date: "2024-05", users: 2000 },
  { date: "2024-06", users: 1900 },
]);

const testData4 = ref([
  { name: "產品A", quality: 85, price: 70, service: 90, brand: 80 },
  { name: "產品B", quality: 75, price: 85, service: 75, brand: 70 },
  { name: "產品C", quality: 90, price: 60, service: 85, brand: 85 },
]);

// 自然語言數據提取
const naturalLanguageText = ref("男性佔比40%，女性佔比60%");
const extractedData = ref(null);
const extracting = ref(false);

// CSV 數據解析
const csvText = ref(`產品,銷量,利潤
iPhone,200,50
Samsung,150,35
HUAWEI,100,25
OPPO,80,20
vivo,90,22`);
const csvData = ref(null);
const parsing = ref(false);

// 測試結果
const testResults = ref([]);

// 提取自然語言數據
const extractAndChart = async () => {
  if (!naturalLanguageText.value.trim()) {
    message.warning("請輸入包含數據的文字");
    return;
  }

  try {
    extracting.value = true;
    const result = dataProcessor.extractFromNaturalLanguage(
      naturalLanguageText.value
    );
    extractedData.value = result;
    message.success("數據提取成功");

    testResults.value.push({
      id: Date.now(),
      title: "自然語言數據提取測試",
      description: "成功從文字中提取數據並生成圖表",
      success: true,
    });
  } catch (error) {
    console.error("數據提取失敗:", error);
    message.error(`數據提取失敗: ${error.message}`);

    testResults.value.push({
      id: Date.now(),
      title: "自然語言數據提取測試",
      description: `失敗: ${error.message}`,
      success: false,
    });
  } finally {
    extracting.value = false;
  }
};

// 解析 CSV 數據
const parseCsvAndChart = async () => {
  if (!csvText.value.trim()) {
    message.warning("請輸入 CSV 數據");
    return;
  }

  try {
    parsing.value = true;
    const result = await dataProcessor.processCsvString(csvText.value);
    csvData.value = result;
    message.success("CSV 解析成功");

    testResults.value.push({
      id: Date.now(),
      title: "CSV 數據解析測試",
      description: `成功解析 ${result.length} 行數據並生成圖表`,
      success: true,
    });
  } catch (error) {
    console.error("CSV 解析失敗:", error);
    message.error(`CSV 解析失敗: ${error.message}`);

    testResults.value.push({
      id: Date.now(),
      title: "CSV 數據解析測試",
      description: `失敗: ${error.message}`,
      success: false,
    });
  } finally {
    parsing.value = false;
  }
};

// 初始化測試
onMounted(() => {
  testResults.value.push({
    id: Date.now(),
    title: "頁面載入測試",
    description: "圖表測試頁面成功載入",
    success: true,
  });
});
</script>

<style scoped>
.chart-test-page {
  @apply max-w-7xl mx-auto p-6 space-y-8;
}

.test-header {
  @apply text-center pb-8 border-b border-gray-200 dark:border-gray-700;
}

.test-header h1 {
  @apply text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4;
}

.test-header p {
  @apply text-lg text-gray-600 dark:text-gray-400;
}

.test-sections {
  @apply space-y-12;
}

.test-section {
  @apply bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700;
}

.test-section h2 {
  @apply text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4;
}

.test-data {
  @apply mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg;
}

.test-data pre {
  @apply text-sm text-gray-700 dark:text-gray-300 font-mono overflow-x-auto;
}

.test-controls {
  @apply mb-4;
}

.test-results {
  @apply bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700;
}

.test-results h2 {
  @apply text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4;
}

.success {
  @apply text-green-600 dark:text-green-400;
}

.error {
  @apply text-red-600 dark:text-red-400;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .chart-test-page {
    @apply p-4 space-y-6;
  }

  .test-section {
    @apply p-4;
  }

  .test-data pre {
    @apply text-xs;
  }
}
</style>

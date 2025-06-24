<template>
  <div class="chart-creation-test">
    <a-card
      title="MCP 圖表創建系統測試"
      class="test-container">
      <!-- 測試說明 -->
      <a-alert
        message="MCP 圖表創建系統測試"
        description="此頁面用於測試 AI 在聊天中自動調用 create_chart 工具創建圖表的完整流程"
        type="info"
        show-icon
        style="margin-bottom: 24px" />

      <!-- 測試案例 -->
      <div class="test-cases">
        <h3>🧪 測試案例</h3>
        <a-row :gutter="16">
          <a-col
            v-for="(testCase, index) in testCases"
            :key="index"
            :span="8">
            <a-card
              :title="testCase.name"
              size="small"
              class="test-case-card">
              <div class="test-prompt">
                <strong>測試提示:</strong>
                <p>{{ testCase.prompt }}</p>
              </div>
              <div class="expected-result">
                <strong>預期結果:</strong>
                <p>{{ testCase.expected }}</p>
              </div>
              <a-button
                type="primary"
                block
                @click="runTestCase(testCase)"
                :loading="testCase.running">
                執行測試
              </a-button>
            </a-card>
          </a-col>
        </a-row>
      </div>

      <!-- 測試結果區域 -->
      <div
        v-if="testResults.length > 0"
        class="test-results">
        <h3>📊 測試結果</h3>
        <a-timeline>
          <a-timeline-item
            v-for="(result, index) in testResults"
            :key="index"
            :color="result.success ? 'green' : 'red'">
            <div class="result-item">
              <div class="result-header">
                <strong>{{ result.testName }}</strong>
                <a-tag :color="result.success ? 'green' : 'red'">
                  {{ result.success ? "成功" : "失敗" }}
                </a-tag>
              </div>
              <div class="result-details">
                <p><strong>提示:</strong> {{ result.prompt }}</p>
                <p><strong>耗時:</strong> {{ result.duration }}ms</p>

                <div v-if="result.success && result.chartData">
                  <p>
                    <strong>圖表類型:</strong> {{ result.chartData.chart_type }}
                  </p>
                  <p><strong>圖表標題:</strong> {{ result.chartData.title }}</p>
                  <p>
                    <strong>數據點數:</strong>
                    {{ result.chartData.data.length }}
                  </p>
                  <p>
                    <strong>可信度:</strong> {{ result.chartData.confidence }}
                  </p>

                  <!-- 顯示實際圖表 -->
                  <div class="chart-preview">
                    <SmartChart
                      :data="formatChartDataForDisplay(result.chartData)"
                      :chart-type="result.chartData.chart_type"
                      :title="result.chartData.title"
                      :config="{
                        height: 200,
                        showActions: false,
                      }" />
                  </div>
                </div>

                <div v-if="!result.success">
                  <p><strong>錯誤:</strong> {{ result.error }}</p>
                </div>
              </div>
            </div>
          </a-timeline-item>
        </a-timeline>
      </div>

      <!-- 系統狀態檢查 -->
      <a-divider />
      <div class="system-status">
        <h3>🔧 系統狀態檢查</h3>
        <a-space>
          <a-button
            @click="checkSystemStatus"
            :loading="checkingStatus">
            檢查系統狀態
          </a-button>
          <a-button @click="clearResults"> 清空結果 </a-button>
        </a-space>

        <div
          v-if="systemStatus"
          class="status-info">
          <a-descriptions
            title="服務狀態"
            :column="2"
            bordered
            style="margin-top: 16px">
            <a-descriptions-item label="後端服務">
              <a-tag :color="systemStatus.backend ? 'green' : 'red'">
                {{ systemStatus.backend ? "正常" : "異常" }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="MCP 統計服務">
              <a-tag :color="systemStatus.mcpStat ? 'green' : 'red'">
                {{ systemStatus.mcpStat ? "正常" : "異常" }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="圖表服務">
              <a-tag :color="systemStatus.chartService ? 'green' : 'red'">
                {{ systemStatus.chartService ? "正常" : "異常" }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="create_chart 工具">
              <a-tag :color="systemStatus.createChartTool ? 'green' : 'red'">
                {{ systemStatus.createChartTool ? "可用" : "不可用" }}
              </a-tag>
            </a-descriptions-item>
          </a-descriptions>
        </div>
      </div>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive } from "vue";
import { message } from "ant-design-vue";
import mcpApi from "@/api/mcp.js";
import SmartChart from "@/components/common/SmartChart.vue";
import axios from "axios";

// 測試案例定義
const testCases = reactive([
  {
    name: "圓餅圖測試",
    prompt: "台部:50%、港澳:30%、台積電:20%，請幫我繪製圓餅圖",
    expected: "AI 調用 create_chart 工具，生成圓餅圖",
    type: "pie",
    running: false,
  },
  {
    name: "長條圖測試",
    prompt: "Q1銷售額1200萬、Q2是1500萬、Q3是1800萬、Q4是2100萬，請創建長條圖",
    expected: "AI 調用 create_chart 工具，生成長條圖",
    type: "bar",
    running: false,
  },
  {
    name: "折線圖測試",
    prompt:
      "1月65分、2月78分、3月85分、4月92分、5月88分、6月95分，請用折線圖顯示趨勢",
    expected: "AI 調用 create_chart 工具，生成折線圖",
    type: "line",
    running: false,
  },
]);

// 測試結果
const testResults = ref([]);
const checkingStatus = ref(false);
const systemStatus = ref(null);

// 執行測試案例
const runTestCase = async (testCase) => {
  testCase.running = true;
  const startTime = Date.now();

  try {
    console.log(`🧪 開始測試: ${testCase.name}`);
    console.log(`📝 測試提示: ${testCase.prompt}`);

    // 這裡應該調用聊天 API 來測試完整流程
    // 但目前我們直接測試 MCP 工具調用
    const testResult = await testDirectMcpCall(testCase);

    const duration = Date.now() - startTime;

    testResults.value.unshift({
      testName: testCase.name,
      prompt: testCase.prompt,
      success: testResult.success,
      duration,
      chartData: testResult.chartData,
      error: testResult.error,
      timestamp: new Date().toLocaleString(),
    });

    if (testResult.success) {
      message.success(`${testCase.name} 執行成功！`);
    } else {
      message.error(`${testCase.name} 執行失敗：${testResult.error}`);
    }
  } catch (error) {
    const duration = Date.now() - startTime;

    testResults.value.unshift({
      testName: testCase.name,
      prompt: testCase.prompt,
      success: false,
      duration,
      error: error.message,
      timestamp: new Date().toLocaleString(),
    });

    message.error(`${testCase.name} 執行異常：${error.message}`);
  } finally {
    testCase.running = false;
  }
};

// 直接測試 MCP 調用
const testDirectMcpCall = async (testCase) => {
  try {
    // 獲取可用工具
    const toolsResponse = await mcpApi.getAllTools();
    const createChartTool = toolsResponse.data.data.find(
      (tool) => tool.name === "create_chart" && tool.mcp_service_id === 49
    );

    if (!createChartTool) {
      throw new Error("找不到 create_chart 工具");
    }

    // 根據測試案例生成參數
    let parameters;
    if (testCase.type === "pie") {
      parameters = {
        chart_type: "pie",
        labels: ["台部", "港澳", "台積電"],
        values: [50, 30, 20],
        title: "市場份額分布圓餅圖",
      };
    } else if (testCase.type === "bar") {
      parameters = {
        chart_type: "bar",
        labels: ["Q1", "Q2", "Q3", "Q4"],
        values: [1200, 1500, 1800, 2100],
        title: "季度銷售額長條圖",
      };
    } else if (testCase.type === "line") {
      parameters = {
        chart_type: "line",
        labels: ["1月", "2月", "3月", "4月", "5月", "6月"],
        values: [65, 78, 85, 92, 88, 95],
        title: "月度趨勢折線圖",
      };
    }

    // 調用 MCP 工具
    const response = await mcpApi.callTool({
      serviceId: createChartTool.mcp_service_id,
      toolId: createChartTool.id,
      toolName: createChartTool.name,
      parameters,
    });

    if (response.data.success) {
      const result = response.data.data;

      // 檢查是否有圖表數據
      if (result.data && result.data._meta && result.data._meta.chart_data) {
        return {
          success: true,
          chartData: result.data._meta.chart_data,
        };
      } else {
        return {
          success: false,
          error: "回應中缺少圖表數據",
        };
      }
    } else {
      return {
        success: false,
        error: response.data.message || "工具調用失敗",
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

// 格式化圖表數據供顯示使用
const formatChartDataForDisplay = (chartData) => {
  return chartData.data.reduce((acc, item) => {
    acc[item.label] = item.value;
    return acc;
  }, {});
};

// 檢查系統狀態
const checkSystemStatus = async () => {
  checkingStatus.value = true;

  try {
    const status = {
      backend: false,
      mcpStat: false,
      chartService: false,
      createChartTool: false,
    };

    // 檢查後端服務
    try {
      const backendResponse = await axios.get("/api/health");
      status.backend = backendResponse.data.status === "healthy";
    } catch (error) {
      console.warn("後端服務檢查失敗:", error.message);
    }

    // 檢查 MCP 統計服務
    try {
      const mcpResponse = await axios.get("http://localhost:8080/");
      status.mcpStat = mcpResponse.data.message.includes("MCP Server");
    } catch (error) {
      console.warn("MCP 統計服務檢查失敗:", error.message);
    }

    // 檢查圖表服務
    try {
      const chartResponse = await axios.get(
        "http://localhost:8000/api/v1/charts/health"
      );
      status.chartService = chartResponse.data.status === "healthy";
    } catch (error) {
      console.warn("圖表服務檢查失敗:", error.message);
    }

    // 檢查 create_chart 工具
    try {
      const toolsResponse = await mcpApi.getAllTools();
      const createChartTool = toolsResponse.data.data.find(
        (tool) => tool.name === "create_chart" && tool.mcp_service_id === 49
      );
      status.createChartTool = !!createChartTool && createChartTool.is_enabled;
    } catch (error) {
      console.warn("create_chart 工具檢查失敗:", error.message);
    }

    systemStatus.value = status;

    const allHealthy = Object.values(status).every((s) => s);
    if (allHealthy) {
      message.success("所有服務狀態正常！");
    } else {
      message.warning("部分服務狀態異常，請檢查");
    }
  } catch (error) {
    message.error("系統狀態檢查失敗：" + error.message);
  } finally {
    checkingStatus.value = false;
  }
};

// 清空結果
const clearResults = () => {
  testResults.value = [];
  systemStatus.value = null;
  message.success("已清空測試結果");
};
</script>

<style scoped>
.chart-creation-test {
  padding: 0;
}

.test-container {
  border: none;
  box-shadow: none;
}

.test-container :deep(.ant-card-body) {
  padding: 0;
}

.test-cases {
  margin-bottom: 32px;
}

.test-case-card {
  height: 100%;
  margin-bottom: 16px;
}

.test-prompt {
  margin-bottom: 12px;
}

.test-prompt p {
  background: var(--custom-bg-secondary);
  padding: 8px;
  border-radius: 4px;
  margin: 4px 0;
  font-family: monospace;
  font-size: 12px;
  color: var(--custom-text-primary);
  border: 1px solid var(--custom-border-primary);
}

.expected-result {
  margin-bottom: 16px;
}

.expected-result p {
  color: var(--custom-text-secondary);
  font-size: 12px;
  margin: 4px 0;
}

.test-results {
  margin-bottom: 32px;
}

.result-item {
  background: var(--custom-bg-primary);
  padding: 16px;
  border-radius: 6px;
  border: 1px solid var(--custom-border-primary);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.result-details p {
  margin: 4px 0;
  font-size: 13px;
  color: var(--custom-text-primary);
}

.chart-preview {
  margin-top: 16px;
  padding: 16px;
  background: var(--custom-bg-secondary);
  border-radius: 6px;
  border: 1px solid var(--custom-border-primary);
}

.system-status {
  padding-top: 16px;
}

.status-info {
  background: var(--custom-bg-secondary);
  padding: 16px;
  border-radius: 6px;
  border: 1px solid var(--custom-border-primary);
}
</style>

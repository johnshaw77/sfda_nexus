<template>
  <div class="admin-page">
    <a-card
      title="MCP 工具調用測試器"
      :bordered="false">
      <template #extra>
        <a-space>
          <a-button
            type="primary"
            @click="handleLoadAvailableTools">
            <ReloadOutlined />
            重新載入工具
          </a-button>
          <a-button @click="handleClearHistory">
            <ClearOutlined />
            清空歷史
          </a-button>
        </a-space>
      </template>

      <!-- 工具選擇區域 -->
      <div class="tool-selector-section">
        <h3>選擇要測試的工具</h3>
        <a-row :gutter="16">
          <a-col
            :xs="24"
            :sm="12"
            :md="8"
            :lg="6">
            <a-select
              :value="selectedServiceId"
              placeholder="選擇服務"
              style="width: 100%"
              @change="handleServiceChange"
              :loading="loading">
              <a-select-option
                v-for="service in availableServices"
                :key="service.id"
                :value="service.id">
                {{ service.name }}
              </a-select-option>
            </a-select>
          </a-col>
          <a-col
            :xs="24"
            :sm="12"
            :md="8"
            :lg="6">
            <a-select
              :value="selectedToolId"
              placeholder="選擇工具"
              style="width: 100%"
              :disabled="!selectedServiceId"
              @change="handleToolChange"
              :loading="loadingTools">
              <a-select-option
                v-for="tool in availableTools"
                :key="tool.id"
                :value="tool.id">
                {{ tool.name }}
              </a-select-option>
            </a-select>
          </a-col>
          <a-col
            :xs="24"
            :sm="24"
            :md="8"
            :lg="12">
            <a-space>
              <a-button
                type="primary"
                :disabled="!selectedTool"
                @click="handleCallTool"
                :loading="calling">
                <PlayCircleOutlined />
                調用工具
              </a-button>
              <a-button
                v-if="selectedTool"
                @click="handleViewSchema">
                <CodeOutlined />
                查看 Schema
              </a-button>
            </a-space>
          </a-col>
        </a-row>
      </div>

      <!-- 工具詳情顯示 -->
      <div
        v-if="selectedTool"
        class="tool-details-section">
        <a-descriptions
          title="工具詳情"
          :column="{ xs: 1, sm: 2, md: 3 }"
          bordered>
          <a-descriptions-item label="工具名稱">
            {{ selectedTool.name }}
          </a-descriptions-item>
          <a-descriptions-item label="服務">
            {{ selectedService?.name }}
          </a-descriptions-item>
          <a-descriptions-item label="狀態">
            <a-tag :color="selectedTool.is_enabled ? 'green' : 'red'">
              {{ selectedTool.is_enabled ? "已啟用" : "已停用" }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item
            label="描述"
            :span="3">
            {{ selectedTool.description || "暫無描述" }}
          </a-descriptions-item>
        </a-descriptions>
      </div>

      <!-- 參數輸入區域 -->
      <div
        v-if="selectedTool && toolSchema"
        class="parameters-section">
        <h3>工具參數配置</h3>
        <a-form
          :model="toolParameters"
          layout="vertical">
          <div
            v-for="(param, paramName) in toolSchema.properties"
            :key="paramName">
            <!-- 字符串類型參數 -->
            <a-form-item
              v-if="param.type === 'string'"
              :label="paramName"
              :help="param.description">
              <a-input
                v-model:value="toolParameters[paramName]"
                :placeholder="param.description || `請輸入 ${paramName}`"
                :required="isRequired(paramName)" />
            </a-form-item>

            <!-- 數字類型參數 -->
            <a-form-item
              v-else-if="param.type === 'number' || param.type === 'integer'"
              :label="paramName"
              :help="param.description">
              <a-input-number
                v-model:value="toolParameters[paramName]"
                :placeholder="param.description || `請輸入 ${paramName}`"
                :required="isRequired(paramName)"
                style="width: 100%" />
            </a-form-item>

            <!-- 布爾類型參數 -->
            <a-form-item
              v-else-if="param.type === 'boolean'"
              :label="paramName"
              :help="param.description">
              <a-switch v-model:checked="toolParameters[paramName]" />
            </a-form-item>

            <!-- 數組類型參數 -->
            <a-form-item
              v-else-if="param.type === 'array'"
              :label="paramName"
              :help="param.description">
              <a-textarea
                v-model:value="toolParameters[paramName]"
                :placeholder="`請輸入 JSON 數組格式，例如: [&quot;value1&quot;, &quot;value2&quot;]`"
                :auto-size="{ minRows: 2, maxRows: 4 }" />
            </a-form-item>

            <!-- 對象類型參數 -->
            <a-form-item
              v-else-if="param.type === 'object'"
              :label="paramName"
              :help="param.description">
              <a-textarea
                v-model:value="toolParameters[paramName]"
                :placeholder="`請輸入 JSON 對象格式`"
                :auto-size="{ minRows: 3, maxRows: 6 }" />
            </a-form-item>

            <!-- 其他類型參數 -->
            <a-form-item
              v-else
              :label="paramName"
              :help="`類型: ${param.type} - ${param.description || '暫無描述'}`">
              <a-input
                v-model:value="toolParameters[paramName]"
                :placeholder="`請輸入 ${paramName} (${param.type})`" />
            </a-form-item>
          </div>
        </a-form>

        <!-- 調用工具按鈕 - 放在面板最下方中間 -->
        <div class="call-button-container">
          <a-button
            type="primary"
            size="large"
            :disabled="!selectedTool"
            @click="handleCallTool"
            :loading="calling">
            <PlayCircleOutlined />
            調用工具
          </a-button>
        </div>
      </div>

      <!-- 無參數提示 -->
      <div
        v-else-if="selectedTool && !toolSchema"
        class="no-parameters-section">
        <h3>工具參數配置</h3>
        <a-alert
          message="此工具無需參數"
          description="點擊「調用工具」即可直接執行"
          type="info"
          show-icon />

        <!-- 調用工具按鈕 - 放在面板最下方中間 -->
        <div class="call-button-container">
          <a-button
            type="primary"
            size="large"
            :disabled="!selectedTool"
            @click="handleCallTool"
            :loading="calling">
            <PlayCircleOutlined />
            調用工具
          </a-button>
        </div>
      </div>

      <!-- 調用結果區域 -->
      <div
        v-if="callHistory.length > 0"
        class="results-section">
        <h3>調用歷史</h3>
        <div
          v-for="(call, index) in callHistory"
          :key="index"
          class="call-result">
          <a-card
            size="small"
            :title="`調用 #${callHistory.length - index}`">
            <template #extra>
              <a-space>
                <a-tag :color="call.success ? 'green' : 'red'">
                  {{ call.success ? "成功" : "失敗" }}
                </a-tag>
                <span class="call-time">{{ call.timestamp }}</span>
              </a-space>
            </template>

            <!-- 調用信息 -->
            <a-descriptions
              :column="2"
              size="small">
              <a-descriptions-item label="工具">
                {{ call.toolName }}
                <a-tag
                  v-if="call.serviceName"
                  color="blue"
                  size="small"
                  >{{ call.serviceName }}</a-tag
                >
              </a-descriptions-item>
              <a-descriptions-item label="執行時間">
                <span v-if="call.success && call.executionTime">
                  {{ call.executionTime }}ms (服務器)
                  <a-tag
                    v-if="call.fromCache"
                    color="green"
                    size="small"
                    >緩存</a-tag
                  >
                </span>
                <span v-else>{{ call.duration }}ms (總計)</span>
              </a-descriptions-item>
              <a-descriptions-item
                v-if="call.module"
                label="模組">
                <a-tag
                  color="purple"
                  size="small"
                  >{{ call.module }}</a-tag
                >
              </a-descriptions-item>
            </a-descriptions>

            <!-- 調用參數 -->
            <div
              v-if="call.parameters && Object.keys(call.parameters).length > 0">
              <h4>調用參數：</h4>
              <JsonViewer
                :data="call.parameters"
                :expand-depth="2" />
            </div>

            <!-- 調用結果 -->
            <div class="call-response">
              <h4>{{ call.success ? "調用結果：" : "錯誤信息：" }}</h4>
              <div v-if="call.success">
                <JsonViewer
                  :data="call.result"
                  :expand-depth="3" />
              </div>
              <div v-else>
                <a-alert
                  :message="call.error"
                  type="error"
                  show-icon />
              </div>
            </div>
          </a-card>
        </div>
      </div>
    </a-card>

    <!-- Schema 查看對話框 -->
    <a-modal
      v-model:open="schemaModalVisible"
      :title="`${selectedTool?.name} - Schema`"
      width="800px"
      :footer="null">
      <div v-if="toolSchema">
        <JsonViewer
          :data="toolSchema"
          :expand-depth="5" />
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { message } from "ant-design-vue";
import JsonViewer from "@/components/common/JsonViewer.vue";
import mcpApi from "@/api/mcp.js";

// 響應式數據
const loading = ref(false);
const loadingTools = ref(false);
const calling = ref(false);
const availableServices = ref([]);
const availableTools = ref([]);
const selectedServiceId = ref(null);
const selectedToolId = ref(null);
const toolParameters = ref({});
const callHistory = ref([]);
const schemaModalVisible = ref(false);

// 計算屬性
const selectedService = computed(() => {
  return availableServices.value.find(
    (service) => service.id === selectedServiceId.value
  );
});

const selectedTool = computed(() => {
  return availableTools.value.find((tool) => tool.id === selectedToolId.value);
});

const toolSchema = computed(() => {
  if (!selectedTool.value?.schema) return null;
  try {
    return typeof selectedTool.value.schema === "string"
      ? JSON.parse(selectedTool.value.schema)
      : selectedTool.value.schema;
  } catch (error) {
    console.error("Schema 解析失敗:", error);
    return null;
  }
});

// 載入可用工具
const handleLoadAvailableTools = async () => {
  loading.value = true;
  try {
    const response = await mcpApi.getSyncedServices();
    if (response.data.success) {
      availableServices.value = response.data.data.filter(
        (service) =>
          service.is_active && service.tools && service.tools.length > 0
      );
      message.success(`載入了 ${availableServices.value.length} 個可用服務`);
    } else {
      message.error(response.data.message || "載入服務失敗");
    }
  } catch (error) {
    console.error("載入服務失敗:", error);
    message.error(
      "載入服務失敗：" + (error.response?.data?.message || error.message)
    );
  } finally {
    loading.value = false;
  }
};

// 服務變更處理
const handleServiceChange = (serviceId) => {
  console.log("🔧 服務變更:", serviceId);
  selectedServiceId.value = serviceId;
  selectedToolId.value = null;
  toolParameters.value = {};

  if (serviceId) {
    const service = availableServices.value.find((s) => s.id === serviceId);
    console.log("🔧 找到服務:", service);
    if (service && service.tools) {
      availableTools.value = service.tools.filter((tool) => tool.is_enabled);
      console.log("🔧 可用工具:", availableTools.value);
    } else {
      availableTools.value = [];
    }
  } else {
    availableTools.value = [];
  }
};

// 工具變更處理
const handleToolChange = (toolId) => {
  console.log("🔧 工具變更:", toolId);
  selectedToolId.value = toolId;
  toolParameters.value = {};

  if (toolId && toolSchema.value) {
    console.log("🔧 工具 Schema:", toolSchema.value);
    // 初始化參數默認值
    Object.keys(toolSchema.value.properties || {}).forEach((paramName) => {
      const param = toolSchema.value.properties[paramName];
      if (param.default !== undefined) {
        toolParameters.value[paramName] = param.default;
      }
    });
  }
};

// 檢查是否為必需參數
const isRequired = (paramName) => {
  return toolSchema.value?.required?.includes(paramName) || false;
};

// 調用工具
const handleCallTool = async () => {
  if (!selectedTool.value) {
    message.warning("請選擇要調用的工具");
    return;
  }

  // 驗證必需參數
  if (toolSchema.value?.required) {
    for (const requiredParam of toolSchema.value.required) {
      if (!toolParameters.value[requiredParam]) {
        message.warning(`必需參數 "${requiredParam}" 不能為空`);
        return;
      }
    }
  }

  calling.value = true;
  const startTime = Date.now();

  try {
    // 處理參數類型轉換
    const processedParams = {};
    Object.keys(toolParameters.value).forEach((key) => {
      const value = toolParameters.value[key];
      const paramSchema = toolSchema.value?.properties?.[key];

      if (value !== undefined && value !== null && value !== "") {
        if (paramSchema?.type === "array" || paramSchema?.type === "object") {
          try {
            processedParams[key] =
              typeof value === "string" ? JSON.parse(value) : value;
          } catch (error) {
            throw new Error(`參數 "${key}" 的 JSON 格式不正確`);
          }
        } else if (
          paramSchema?.type === "integer" ||
          paramSchema?.type === "int"
        ) {
          // 處理整數類型參數
          const numValue =
            typeof value === "string" ? parseInt(value, 10) : value;
          if (!isNaN(numValue)) {
            processedParams[key] = numValue;
          } else {
            throw new Error(`參數 "${key}" 必須是有效的整數`);
          }
        } else if (paramSchema?.type === "number") {
          // 處理數字類型參數
          const numValue =
            typeof value === "string" ? parseFloat(value) : value;
          if (!isNaN(numValue)) {
            processedParams[key] = numValue;
          } else {
            throw new Error(`參數 "${key}" 必須是有效的數字`);
          }
        } else {
          processedParams[key] = value;
        }
      }
    });

    // 調用工具
    const response = await mcpApi.callTool({
      serviceId: selectedServiceId.value,
      toolId: selectedToolId.value,
      toolName: selectedTool.value.name,
      parameters: processedParams,
    });

    const endTime = Date.now();
    const callRecord = {
      timestamp: new Date().toLocaleString(),
      duration: endTime - startTime,
      toolName: selectedTool.value.name,
      serviceName: response.data.service_name,
      module: response.data.module,
      executionTime: response.data.execution_time,
      fromCache: response.data.from_cache,
      executionId: response.data.execution_id,
      version: response.data.version,
      parameters: processedParams,
      success: response.data.success,
      result: response.data.data, // 直接使用後端提取的業務數據
      error: response.data.success ? null : response.data.message,
    };

    callHistory.value.unshift(callRecord);

    if (response.data.success) {
      message.success("工具調用成功！");
    } else {
      message.error(`工具調用失敗：${response.data.message}`);
    }
  } catch (error) {
    const endTime = Date.now();
    const callRecord = {
      timestamp: new Date().toLocaleString(),
      duration: endTime - startTime,
      toolName: selectedTool.value.name,
      parameters: toolParameters.value,
      success: false,
      result: null,
      error: error.response?.data?.message || error.message,
    };

    callHistory.value.unshift(callRecord);

    console.error("工具調用失敗:", error);
    message.error(
      "工具調用失敗：" + (error.response?.data?.message || error.message)
    );
  } finally {
    calling.value = false;
  }
};

// 查看 Schema
const handleViewSchema = () => {
  schemaModalVisible.value = true;
};

// 清空歷史
const handleClearHistory = () => {
  callHistory.value = [];
  message.success("調用歷史已清空");
};

// 組件掛載時載入服務
onMounted(() => {
  handleLoadAvailableTools();
});
</script>

<style scoped>
.tool-selector-section {
  margin-bottom: 24px;
  padding: 16px;
  background: var(--custom-bg-secondary);
  border-radius: 6px;
  border: 1px solid var(--custom-border-secondary);
}

.tool-details-section {
  margin-bottom: 24px;
}

.parameters-section {
  margin-bottom: 24px;
  padding: 16px;
  background: var(--custom-bg-tertiary);
  border-radius: 6px;
  border: 1px solid var(--custom-border-secondary);
}

.no-parameters-section {
  margin-bottom: 24px;
}

.call-button-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--custom-border-secondary);
}

.results-section {
  margin-top: 24px;
}

.call-result {
  margin-bottom: 16px;
}

.call-time {
  font-size: 12px;
  color: var(--custom-text-secondary);
}

.call-response {
  margin-top: 12px;
}

.call-response h4 {
  margin-bottom: 8px;
  font-size: 14px;
  color: var(--custom-text-primary);
}
</style>

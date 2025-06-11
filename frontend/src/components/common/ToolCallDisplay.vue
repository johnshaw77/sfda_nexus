<template>
  <div class="tool-call-display">
    <!-- 工具調用標題 -->
    <div class="tool-call-header">
      <div class="tool-info">
        <component
          :is="getToolIcon(toolCall.toolName)"
          class="tool-icon" />
        <span class="tool-name">{{
          getToolDisplayName(toolCall.toolName)
        }}</span>
        <a-tag
          :color="getToolColor(toolCall.toolName)"
          size="small">
          {{ getToolCategory(toolCall.toolName) }}
        </a-tag>
      </div>
      <div class="tool-status">
        <a-tag
          :color="toolCall.success ? 'success' : 'error'"
          size="small">
          {{ toolCall.success ? "成功" : "失敗" }}
        </a-tag>
        <span
          class="execution-time"
          v-if="toolCall.executionTime">
          {{ toolCall.executionTime }}ms
        </span>
      </div>
    </div>

    <!-- 工具參數（可摺疊） -->
    <div
      class="tool-parameters"
      v-if="toolCall.arguments && showDetails">
      <div class="section-title">
        <CodeOutlined />
        <span>調用參數</span>
      </div>
      <div class="parameters-content">
        <pre class="json-display">{{ formatJson(toolCall.arguments) }}</pre>
      </div>
    </div>

    <!-- 工具結果 -->
    <div class="tool-result">
      <div class="section-title">
        <CheckCircleOutlined v-if="toolCall.success" />
        <ExclamationCircleOutlined v-else />
        <span>執行結果</span>
        <a-button
          type="link"
          size="small"
          @click="toggleDetails"
          class="toggle-details">
          {{ showDetails ? "收起詳情" : "顯示詳情" }}
        </a-button>
      </div>

      <!-- 成功結果 -->
      <div
        v-if="toolCall.success"
        class="result-content success">
        <!-- 結構化數據顯示 -->
        <div
          v-if="isStructuredData(toolCall.result)"
          class="structured-result">
          <StructuredDataDisplay :data="toolCall.result" />
        </div>
        <!-- 純文本結果 -->
        <div
          v-else
          class="text-result">
          {{ formatResult(toolCall.result) }}
        </div>
      </div>

      <!-- 錯誤結果 -->
      <div
        v-else
        class="result-content error">
        <div class="error-message">
          {{ toolCall.error || "工具調用失敗" }}
        </div>
        <div
          v-if="toolCall.details"
          class="error-details">
          <pre>{{ formatJson(toolCall.details) }}</pre>
        </div>
      </div>
    </div>

    <!-- 工具調用元數據（詳情模式） -->
    <div
      class="tool-metadata"
      v-if="showDetails && toolCall.metadata">
      <div class="section-title">
        <InfoCircleOutlined />
        <span>調用信息</span>
      </div>
      <div class="metadata-content">
        <div
          class="metadata-item"
          v-if="toolCall.metadata.timestamp">
          <span class="label">時間：</span>
          <span class="value">{{
            formatTimestamp(toolCall.metadata.timestamp)
          }}</span>
        </div>
        <div
          class="metadata-item"
          v-if="toolCall.metadata.version">
          <span class="label">版本：</span>
          <span class="value">{{ toolCall.metadata.version }}</span>
        </div>
        <div
          class="metadata-item"
          v-if="toolCall.metadata.executionId">
          <span class="label">執行ID：</span>
          <span class="value">{{ toolCall.metadata.executionId }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import StructuredDataDisplay from "./StructuredDataDisplay.vue";

const props = defineProps({
  toolCall: {
    type: Object,
    required: true,
  },
});

const showDetails = ref(false);

const toggleDetails = () => {
  showDetails.value = !showDetails.value;
};

// 工具圖標映射
const getToolIcon = (toolName) => {
  const iconMap = {
    "hr.get_employee_info": "UserOutlined",
    "hr.get_department_list": "TeamOutlined",
    "hr.get_attendance_records": "ClockCircleOutlined",
    "hr.get_salary_info": "DollarOutlined",
    "tasks.create_task": "PlusOutlined",
    "tasks.get_task_list": "UnorderedListOutlined",
    "finance.get_budget_info": "PieChartOutlined",
  };
  return iconMap[toolName] || "ToolOutlined";
};

// 工具顯示名稱
const getToolDisplayName = (toolName) => {
  const nameMap = {
    "hr.get_employee_info": "員工資料查詢",
    "hr.get_department_list": "部門列表查詢",
    "hr.get_attendance_records": "出勤記錄查詢",
    "hr.get_salary_info": "薪資資料查詢",
    "tasks.create_task": "創建任務",
    "tasks.get_task_list": "任務列表查詢",
    "finance.get_budget_info": "預算資料查詢",
  };
  return nameMap[toolName] || toolName;
};

// 工具類別
const getToolCategory = (toolName) => {
  if (toolName.startsWith("hr.")) return "HR";
  if (toolName.startsWith("tasks.")) return "任務";
  if (toolName.startsWith("finance.")) return "財務";
  return "工具";
};

// 工具顏色
const getToolColor = (toolName) => {
  if (toolName.startsWith("hr.")) return "blue";
  if (toolName.startsWith("tasks.")) return "green";
  if (toolName.startsWith("finance.")) return "orange";
  return "default";
};

// 檢查是否為結構化數據
const isStructuredData = (data) => {
  return typeof data === "object" && data !== null && !Array.isArray(data);
};

// 格式化 JSON
const formatJson = (obj) => {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
};

// 格式化結果
const formatResult = (result) => {
  if (typeof result === "string") return result;
  if (typeof result === "object") return JSON.stringify(result, null, 2);
  return String(result);
};

// 格式化時間戳
const formatTimestamp = (timestamp) => {
  try {
    return new Date(timestamp).toLocaleString("zh-TW");
  } catch {
    return timestamp;
  }
};
</script>

<style scoped>
.tool-call-display {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  margin: 8px 0;
  background: #fafafa;
  overflow: hidden;
}

.tool-call-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f5f5f5;
  border-bottom: 1px solid #e8e8e8;
}

.tool-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tool-icon {
  font-size: 16px;
  color: #1890ff;
}

.tool-name {
  font-weight: 500;
  color: #262626;
}

.tool-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.execution-time {
  font-size: 12px;
  color: #8c8c8c;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  color: #595959;
  margin-bottom: 8px;
  font-size: 13px;
}

.tool-parameters,
.tool-result,
.tool-metadata {
  padding: 12px 16px;
}

.tool-parameters {
  background: #f9f9f9;
  border-bottom: 1px solid #e8e8e8;
}

.parameters-content,
.metadata-content {
  margin-top: 8px;
}

.json-display {
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 8px;
  font-size: 12px;
  color: #595959;
  overflow-x: auto;
  margin: 0;
}

.result-content {
  margin-top: 8px;
}

.result-content.success {
  color: #52c41a;
}

.result-content.error {
  color: #ff4d4f;
}

.structured-result {
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 12px;
}

.text-result {
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 12px;
  white-space: pre-wrap;
  font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
  font-size: 13px;
}

.error-message {
  font-weight: 500;
  margin-bottom: 8px;
}

.error-details {
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 4px;
  padding: 8px;
  font-size: 12px;
}

.metadata-item {
  display: flex;
  margin-bottom: 4px;
}

.metadata-item .label {
  font-weight: 500;
  min-width: 60px;
  color: #8c8c8c;
}

.metadata-item .value {
  color: #262626;
}

.toggle-details {
  margin-left: auto;
  padding: 0;
  height: auto;
}

/* 深色模式支援 */
.dark .tool-call-display {
  background: #1f1f1f;
  border-color: #434343;
}

.dark .tool-call-header {
  background: #262626;
  border-color: #434343;
}

.dark .tool-parameters {
  background: #1a1a1a;
  border-color: #434343;
}

.dark .json-display,
.dark .structured-result,
.dark .text-result {
  background: #0f0f0f;
  border-color: #434343;
  color: #d9d9d9;
}
</style>

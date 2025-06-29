<template>
  <div
    v-if="
      message.role === 'assistant' &&
      message.mcpErrors &&
      message.mcpErrors.length > 0
    "
    class="mcp-errors-section">
    <div class="mcp-errors-header">
      <ExclamationCircleOutlined class="error-icon" />
      <span>工具調用問題</span>
      <a-badge
        :count="message.mcpErrors.length"
        class="error-count" />
    </div>
    <div class="mcp-errors-list">
      <div
        v-for="(mcpError, index) in message.mcpErrors"
        :key="index"
        class="mcp-error-item">
        <a-alert
          :type="getErrorAlertType(mcpError.error_type)"
          :message="getErrorTitle(mcpError)"
          :description="getErrorDescription(mcpError)"
          show-icon
          closable
          @close="handleDismissMcpError(index)"
          class="mcp-error-alert">
          <template #icon>
            <ExclamationCircleOutlined
              v-if="mcpError.error_type === 'SERVICE_UNAVAILABLE'" />
            <DisconnectOutlined
              v-else-if="mcpError.error_type === 'CONNECTION_FAILED'" />
            <DatabaseOutlined
              v-else-if="mcpError.error_type === 'DATABASE_ERROR'" />
            <SafetyCertificateOutlined
              v-else-if="mcpError.error_type === 'AUTHENTICATION_ERROR'" />
            <ClockCircleOutlined
              v-else-if="mcpError.error_type === 'TIMEOUT_ERROR'" />
            <ToolOutlined
              v-else-if="mcpError.error_type === 'TOOL_NOT_FOUND'" />
            <WarningOutlined v-else />
          </template>
          <template #action>
            <a-button
              v-if="
                mcpError.error_type === 'SERVICE_UNAVAILABLE' ||
                mcpError.error_type === 'CONNECTION_FAILED'
              "
              size="small"
              type="primary"
              @click="retryMcpService(mcpError.service_name)">
              重試
            </a-button>
          </template>
        </a-alert>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  ExclamationCircleOutlined,
  DisconnectOutlined,
  DatabaseOutlined,
  SafetyCertificateOutlined,
  ClockCircleOutlined,
  ToolOutlined,
  WarningOutlined
} from '@ant-design/icons-vue';

// Props
const props = defineProps({
  message: {
    type: Object,
    required: true
  }
});

// Emits
const emit = defineEmits(['retry-mcp-service']);

// 錯誤警告類型映射
const getErrorAlertType = (errorType) => {
  switch (errorType) {
    case "SERVICE_UNAVAILABLE":
    case "CONNECTION_FAILED":
      return "warning";
    case "DATABASE_ERROR":
    case "AUTHENTICATION_ERROR":
      return "error";
    case "TIMEOUT_ERROR":
      return "info";
    case "TOOL_NOT_FOUND":
      return "warning";
    default:
      return "error";
  }
};

// 錯誤標題生成
const getErrorTitle = (mcpError) => {
  switch (mcpError.error_type) {
    case "SERVICE_UNAVAILABLE":
      return `${mcpError.service_name} 服務不可用`;
    case "CONNECTION_FAILED":
      return `連接 ${mcpError.service_name} 失敗`;
    case "DATABASE_ERROR":
      return `${mcpError.service_name} 資料庫錯誤`;
    case "AUTHENTICATION_ERROR":
      return `${mcpError.service_name} 認證失敗`;
    case "TIMEOUT_ERROR":
      return `${mcpError.service_name} 請求超時`;
    case "TOOL_NOT_FOUND":
      return `工具 ${mcpError.tool_name} 不存在`;
    default:
      return `${mcpError.service_name} 未知錯誤`;
  }
};

// 錯誤描述生成
const getErrorDescription = (mcpError) => {
  return mcpError.suggestion || mcpError.error;
};

// 處理錯誤消除
const handleDismissMcpError = (index) => {
  if (props.message.mcpErrors && props.message.mcpErrors.length > index) {
    props.message.mcpErrors.splice(index, 1);

    // 如果沒有錯誤了，清除錯誤標記
    if (props.message.mcpErrors.length === 0) {
      props.message.hasMcpErrors = false;
    }
  }
};

// 重試 MCP 服務
const retryMcpService = (serviceName) => {
  emit('retry-mcp-service', serviceName);
};
</script>

<style scoped>
.mcp-errors-section {
  background: linear-gradient(135deg, #fff2f0 0%, #fff 100%);
  border: 1px solid #ffccc7;
  border-radius: 8px;
  margin: 8px 0;
  overflow: hidden;
}

.mcp-errors-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: linear-gradient(90deg, #ff7875 0%, #ff9c99 100%);
  color: white;
  font-weight: 500;
}

.error-icon {
  color: white;
}

.error-count {
  margin-left: auto;
}

.mcp-errors-list {
  padding: 8px;
}

.mcp-error-item {
  margin-bottom: 8px;
}

.mcp-error-item:last-child {
  margin-bottom: 0;
}

.mcp-error-alert {
  border-radius: 6px;
}
</style>
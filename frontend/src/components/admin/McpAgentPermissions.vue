<template>
  <div class="mcp-agent-permissions">
    <a-card
      title="智能體 MCP 服務權限管理"
      :bordered="false">
      <!-- 智能體選擇器 -->
      <div class="agent-selector">
        <a-row
          :gutter="16"
          align="middle">
          <a-col :span="6">
            <span style="font-weight: 500">選擇智能體：</span>
          </a-col>
          <a-col :span="12">
            <a-select
              v-model:value="selectedAgentId"
              placeholder="請選擇要管理權限的智能體"
              style="width: 100%"
              @change="handleAgentChange"
              :loading="loadingAgents">
              <a-select-option
                v-for="agent in agents"
                :key="agent.id"
                :value="agent.id">
                <div class="agent-option">
                  <span class="agent-name">{{ agent.name }}</span>
                  <a-tag
                    :color="agent.status === 'active' ? 'green' : 'orange'"
                    size="small">
                    {{ agent.status === "active" ? "啟用" : "停用" }}
                  </a-tag>
                </div>
              </a-select-option>
            </a-select>
          </a-col>
          <a-col :span="6">
            <a-button
              type="primary"
              :disabled="!selectedAgentId"
              :loading="loadingPermissions"
              @click="handleRefresh">
              <ReloadOutlined />
              重新加載權限
            </a-button>
          </a-col>
        </a-row>
      </div>

      <!-- 權限狀態概覽 -->
      <div
        v-if="selectedAgentId"
        class="permissions-overview">
        <a-row :gutter="16">
          <a-col :span="8">
            <a-statistic
              title="已分配服務"
              :value="assignedServicesCount"
              :value-style="{ color: '#52c41a' }">
              <template #prefix>
                <CheckCircleOutlined />
              </template>
            </a-statistic>
          </a-col>
          <a-col :span="8">
            <a-statistic
              title="可用服務"
              :value="availableServicesCount"
              :value-style="{ color: '#1890ff' }">
              <template #prefix>
                <CloudServerOutlined />
              </template>
            </a-statistic>
          </a-col>
          <a-col :span="8">
            <a-statistic
              title="可用工具"
              :value="totalToolsCount"
              :value-style="{ color: '#722ed1' }">
              <template #prefix>
                <ToolOutlined />
              </template>
            </a-statistic>
          </a-col>
        </a-row>
      </div>

      <!-- 服務權限配置 -->
      <div
        v-if="selectedAgentId"
        class="permissions-config">
        <div class="section-header">
          <h3>服務權限配置</h3>
          <a-space>
            <a-button
              v-if="hasChanges"
              type="primary"
              :loading="saving"
              @click="handleSaveChanges">
              <SaveOutlined />
              保存更改
            </a-button>
            <a-button
              v-if="hasChanges"
              @click="handleResetChanges">
              <UndoOutlined />
              重置更改
            </a-button>
          </a-space>
        </div>

        <!-- 服務列表 -->
        <a-table
          :columns="serviceColumns"
          :data-source="services"
          :loading="loadingPermissions"
          :pagination="false"
          row-key="id"
          class="permissions-table">
          <!-- 服務名稱列 -->
          <template #name="{ record }">
            <div class="service-info">
              <strong>{{ record.name }}</strong>
              <div class="service-description">{{ record.description }}</div>
              <a-tag
                :color="record.enabled ? 'green' : 'red'"
                size="small">
                {{ record.enabled ? "服務已啟用" : "服務未啟用" }}
              </a-tag>
            </div>
          </template>

          <!-- 工具列表列 -->
          <template #tools="{ record }">
            <div class="tools-list">
              <a-tag
                v-for="tool in record.tools"
                :key="tool.id"
                :color="tool.enabled ? 'blue' : 'default'"
                size="small"
                class="tool-tag">
                {{ tool.displayName }}
              </a-tag>
              <span
                v-if="record.tools.length === 0"
                class="no-tools">
                無可用工具
              </span>
            </div>
          </template>

          <!-- 權限狀態列 -->
          <template #permission="{ record }">
            <a-switch
              v-model:checked="record.hasPermission"
              :loading="record.updating"
              @change="() => handlePermissionToggle(record)">
              <template #checkedChildren>已授權</template>
              <template #unCheckedChildren>未授權</template>
            </a-switch>
          </template>

          <!-- 操作列 -->
          <template #action="{ record }">
            <a-space>
              <a-button
                type="text"
                size="small"
                @click="handleViewServiceDetail(record)">
                <EyeOutlined />
                詳情
              </a-button>
              <a-button
                v-if="record.hasPermission"
                type="text"
                size="small"
                danger
                @click="handlePermissionToggle(record)">
                <DeleteOutlined />
                移除權限
              </a-button>
            </a-space>
          </template>
        </a-table>
      </div>

      <!-- 空狀態 -->
      <div
        v-if="!selectedAgentId"
        class="empty-state">
        <a-empty description="請選擇一個智能體來管理其 MCP 服務權限">
          <template #image>
            <RobotOutlined style="font-size: 64px; color: #d9d9d9" />
          </template>
        </a-empty>
      </div>
    </a-card>

    <!-- 服務詳情對話框 -->
    <a-modal
      v-model:open="serviceDetailVisible"
      :title="`${selectedService?.name} - 服務詳情`"
      width="700px"
      :footer="null">
      <div v-if="selectedService">
        <a-descriptions
          :column="1"
          bordered>
          <a-descriptions-item label="服務名稱">
            {{ selectedService.name }}
          </a-descriptions-item>
          <a-descriptions-item label="描述">
            {{ selectedService.description }}
          </a-descriptions-item>
          <a-descriptions-item label="模塊鍵">
            {{ selectedService.moduleKey }}
          </a-descriptions-item>
          <a-descriptions-item label="端點">
            {{ selectedService.endpoint }}
          </a-descriptions-item>
          <a-descriptions-item label="狀態">
            <a-tag :color="selectedService.enabled ? 'green' : 'red'">
              {{ selectedService.enabled ? "已啟用" : "未啟用" }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="工具列表">
            <div class="tools-detail">
              <a-tag
                v-for="tool in selectedService.tools"
                :key="tool.id"
                :color="tool.enabled ? 'blue' : 'default'"
                style="margin-bottom: 4px">
                {{ tool.displayName }}
              </a-tag>
            </div>
          </a-descriptions-item>
        </a-descriptions>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { message } from "ant-design-vue";
import {
  ReloadOutlined,
  CheckCircleOutlined,
  CloudServerOutlined,
  ToolOutlined,
  SaveOutlined,
  UndoOutlined,
  EyeOutlined,
  DeleteOutlined,
  RobotOutlined,
} from "@ant-design/icons-vue";
import mcpApi from "@/api/mcp.js";
import agentsApi from "@/api/agents.js";

// 響應式數據
const loadingAgents = ref(false);
const loadingPermissions = ref(false);
const saving = ref(false);
const selectedAgentId = ref(null);
const agents = ref([]);
const services = ref([]);
const originalPermissions = ref({});
const serviceDetailVisible = ref(false);
const selectedService = ref(null);

// 計算屬性
const assignedServicesCount = computed(() => {
  return services.value.filter((service) => service.hasPermission).length;
});

const availableServicesCount = computed(() => {
  return services.value.filter((service) => service.enabled).length;
});

const totalToolsCount = computed(() => {
  return services.value.reduce((total, service) => {
    return total + service.tools.length;
  }, 0);
});

const hasChanges = computed(() => {
  return services.value.some((service) => {
    const originalPermission = originalPermissions.value[service.id];
    return originalPermission !== service.hasPermission;
  });
});

// 表格配置
const serviceColumns = [
  {
    title: "服務名稱",
    dataIndex: "name",
    key: "name",
    slots: { customRender: "name" },
    width: "25%",
  },
  {
    title: "可用工具",
    dataIndex: "tools",
    key: "tools",
    slots: { customRender: "tools" },
    width: "30%",
  },
  {
    title: "權限狀態",
    dataIndex: "hasPermission",
    key: "permission",
    slots: { customRender: "permission" },
    width: "20%",
    align: "center",
  },
  {
    title: "操作",
    key: "action",
    slots: { customRender: "action" },
    width: "25%",
    align: "center",
  },
];

// 方法
const loadAgents = async () => {
  loadingAgents.value = true;
  try {
    const response = await agentsApi.getAll();
    if (response.data.success) {
      agents.value = response.data.data;
    } else {
      message.error("加載智能體列表失敗");
    }
  } catch (error) {
    console.error("加載智能體失敗:", error);
    message.error(
      "加載智能體失敗：" + (error.response?.data?.message || error.message)
    );
  } finally {
    loadingAgents.value = false;
  }
};

const loadServices = async () => {
  if (!selectedAgentId.value) return;

  loadingPermissions.value = true;
  try {
    // 載入所有可用服務
    const servicesResponse = await mcpApi.getAllServices();
    const agentServicesResponse = await mcpApi.getAgentServices(
      selectedAgentId.value
    );

    if (servicesResponse.data.success && agentServicesResponse.data.success) {
      const allServices = servicesResponse.data.data;
      const agentServiceIds = new Set(
        agentServicesResponse.data.data.map((s) => s.service_id)
      );

      // 組合服務數據和權限信息
      services.value = allServices.map((service) => ({
        ...service,
        hasPermission: agentServiceIds.has(service.id),
      }));

      // 保存原始權限狀態
      originalPermissions.value = {};
      services.value.forEach((service) => {
        originalPermissions.value[service.id] = service.hasPermission;
      });
    } else {
      message.error("加載服務權限失敗");
    }
  } catch (error) {
    console.error("加載服務權限失敗:", error);
    message.error(
      "加載服務權限失敗：" + (error.response?.data?.message || error.message)
    );
  } finally {
    loadingPermissions.value = false;
  }
};

const handleAgentChange = (agentId) => {
  selectedAgentId.value = agentId;
  if (agentId) {
    loadServices();
  } else {
    services.value = [];
    originalPermissions.value = {};
  }
};

const handleLoadPermissions = () => {
  loadServices();
};

const handlePermissionToggle = (service) => {
  service.hasPermission = !service.hasPermission;
};

const handleSaveChanges = async () => {
  if (!selectedAgentId.value) {
    message.warning("請先選擇智能體");
    return;
  }

  if (!hasChanges.value) {
    message.info("沒有權限變更需要保存");
    return;
  }

  saving.value = true;
  try {
    // 獲取有權限的服務ID列表
    const serviceIds = services.value
      .filter((service) => service.hasPermission)
      .map((service) => service.id);

    const response = await mcpApi.updateAgentServices(
      selectedAgentId.value,
      serviceIds
    );

    if (response.data.success) {
      message.success("權限設置已保存");
      // 更新原始權限狀態
      services.value.forEach((service) => {
        originalPermissions.value[service.id] = service.hasPermission;
      });
    } else {
      message.error(response.data.message || "保存權限設置失敗");
    }
  } catch (error) {
    console.error("保存權限設置失敗:", error);
    message.error(
      "保存權限設置失敗：" + (error.response?.data?.message || error.message)
    );
  } finally {
    saving.value = false;
  }
};

const handleResetChanges = () => {
  services.value.forEach((service) => {
    service.hasPermission = originalPermissions.value[service.id];
  });
  message.info("已重置所有變更");
};

const handleViewServiceDetails = (service) => {
  selectedService.value = service;
  serviceDetailVisible.value = true;
};

const handleRemovePermission = async (service) => {
  service.updating = true;
  try {
    await mcpApi.removeAgentService(selectedAgentId.value, service.id);
    service.hasPermission = false;
    originalPermissions.value[service.id] = false;
    message.success(`已移除 ${service.name} 的權限`);
  } catch (error) {
    console.error("移除權限失敗:", error);
    message.error(
      "移除權限失敗：" + (error.response?.data?.message || error.message)
    );
  } finally {
    service.updating = false;
  }
};

// 監聽器
watch(selectedAgentId, (newAgentId) => {
  if (newAgentId) {
    loadServices();
  }
});

// 組件掛載時加載智能體列表
onMounted(() => {
  loadAgents();
});
</script>

<style scoped>
.mcp-agent-permissions {
  padding: 24px;
}

.agent-selector {
  margin-bottom: 24px;
  padding: 16px;
  background: #fafafa;
  border-radius: 6px;
}

.agent-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.agent-name {
  font-weight: 500;
}

.permissions-overview {
  margin-bottom: 24px;
  padding: 16px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
}

.permissions-config {
  margin-top: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.service-info .service-description {
  font-size: 12px;
  color: #666;
  margin: 4px 0;
}

.tools-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tool-tag {
  margin-bottom: 4px;
}

.no-tools {
  color: #999;
  font-style: italic;
}

.permissions-table {
  margin-top: 16px;
}

.empty-state {
  text-align: center;
  padding: 48px;
}

.tools-detail {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
</style>

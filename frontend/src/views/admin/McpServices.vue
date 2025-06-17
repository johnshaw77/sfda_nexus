<template>
  <div class="admin-page">
    <a-card
      title="MCP 服務管理"
      :bordered="false">
      <template #extra>
        <a-space>
          <a-radio-group
            :value="viewMode"
            @change="handleViewModeChange"
            style="margin-right: 16px">
            <a-tooltip
              title="管理已同步到資料庫的 MCP 服務和工具，支持啟用/停用工具，無需連接 MCP Server"
              :arrow="false">
              <a-radio-button value="manage">管理模式</a-radio-button>
            </a-tooltip>
            <a-tooltip
              :arrow="false"
              title="實時探索 MCP Server 上的可用服務，選擇要同步的服務和工具到資料庫">
              <a-radio-button value="discover">發現模式</a-radio-button>
            </a-tooltip>
          </a-radio-group>

          <a-button
            v-if="viewMode === 'discover'"
            type="primary"
            :loading="syncing"
            @click="handleFullSync">
            <SyncOutlined />
            完整同步
          </a-button>
          <a-button
            v-if="viewMode === 'discover'"
            @click="handleDiscoverServices">
            <SearchOutlined />
            服務發現
          </a-button>
          <a-button
            v-if="viewMode === 'manage'"
            @click="handleRefreshSynced">
            <SyncOutlined />
            刷新
          </a-button>
        </a-space>
      </template>

      <!-- 自定義端點輸入 (僅發現模式) -->
      <div
        v-if="viewMode === 'discover'"
        class="endpoint-section">
        <a-row
          :gutter="16"
          align="middle">
          <a-col
            :xs="24"
            :sm="24"
            :md="6"
            :lg="6"
            :xl="6">
            <span style="font-weight: 500">MCP 服務器端點：</span>
          </a-col>
          <a-col
            :xs="24"
            :sm="18"
            :md="12"
            :lg="12"
            :xl="12">
            <a-input
              :value="customEndpoint"
              placeholder="localhost:8080"
              @pressEnter="handleDiscoverServices"
              @input="(e) => (customEndpoint = e.target.value)"
              style="width: 100%">
              <template #addonBefore>http://</template>
            </a-input>
          </a-col>
          <a-col
            :xs="24"
            :sm="6"
            :md="6"
            :lg="6"
            :xl="6">
            <a-space>
              <a-button
                :loading="discovering"
                @click="handleDiscoverServices">
                探索服務
              </a-button>
              <a-button
                v-if="customEndpoint"
                @click="customEndpoint = ''"
                type="text">
                重置
              </a-button>
            </a-space>
          </a-col>
        </a-row>
      </div>

      <!-- 狀態指示器 -->
      <div class="status-section">
        <a-row :gutter="16">
          <a-col
            :xs="24"
            :sm="12"
            :md="6"
            :lg="6"
            :xl="6">
            <a-statistic
              :title="viewMode === 'discover' ? '已發現服務' : '已同步服務'"
              :value="currentServices.length"
              :value-style="{ color: '#1890ff' }">
              <template #prefix>
                <CloudServerOutlined />
              </template>
            </a-statistic>
          </a-col>
          <a-col
            :xs="24"
            :sm="12"
            :md="6"
            :lg="6"
            :xl="6">
            <a-statistic
              title="已啟用服務"
              :value="enabledServicesCount"
              :value-style="{ color: '#52c41a' }">
              <template #prefix>
                <CheckCircleOutlined />
              </template>
            </a-statistic>
          </a-col>
          <a-col
            :xs="24"
            :sm="12"
            :md="6"
            :lg="6"
            :xl="6">
            <a-statistic
              :title="viewMode === 'discover' ? '可用工具' : '已啟用工具'"
              :value="totalToolsCount"
              :value-style="{ color: '#722ed1' }">
              <template #prefix>
                <ToolOutlined />
              </template>
            </a-statistic>
          </a-col>
          <a-col
            :xs="24"
            :sm="12"
            :md="6"
            :lg="6"
            :xl="6">
            <a-statistic
              :title="viewMode === 'discover' ? '上次發現' : '上次同步'"
              :value="lastSyncTime"
              :value-style="{ color: '#fa8c16' }">
              <template #prefix>
                <ClockCircleOutlined />
              </template>
            </a-statistic>
          </a-col>
        </a-row>
      </div>

      <!-- 服務列表 -->
      <div class="services-section">
        <div class="section-header">
          <h3>{{ viewMode === "discover" ? "發現的服務" : "已同步的服務" }}</h3>
          <a-space>
            <a-button
              v-if="viewMode === 'discover' && hasSelectedServices"
              type="primary"
              :loading="enabling"
              @click="handleEnableSelected">
              <PlayCircleOutlined />
              同步選中 ({{ selectedServiceKeys.length }})
            </a-button>
            <a-button
              v-if="viewMode === 'manage' && hasEnabledServices"
              danger
              :loading="disabling"
              @click="handleDisableSelected">
              <StopOutlined />
              停用已啟用
            </a-button>
            <a-dropdown v-if="viewMode === 'manage' && hasSelectedServices">
              <template #overlay>
                <a-menu>
                  <a-menu-item @click="handleBatchDelete(false)">
                    <DeleteOutlined />
                    批量軟刪除
                  </a-menu-item>
                  <a-menu-item
                    @click="handleBatchDelete(true)"
                    danger>
                    <DeleteOutlined />
                    批量永久刪除
                  </a-menu-item>
                </a-menu>
              </template>
              <a-button danger>
                <DeleteOutlined />
                批量刪除 ({{ selectedServiceKeys.length }})
                <DownOutlined />
              </a-button>
            </a-dropdown>
          </a-space>
        </div>

        <a-table
          :columns="serviceColumns"
          :data-source="currentServices"
          :loading="loading"
          :pagination="false"
          :row-selection="rowSelection"
          :row-key="viewMode === 'discover' ? 'moduleKey' : 'id'"
          :row-class-name="() => 'service-row'"
          :scroll="{ x: isSmallScreen ? 800 : isMediumScreen ? 1000 : true }"
          @change="handleTableChange">
          <!-- 服務名稱列 -->
          <template #name="{ record }">
            <div>
              <strong>{{ record.name }}</strong>
              <div class="service-description">{{ record.description }}</div>

              <!-- 小螢幕模式：顯示額外資訊 -->
              <div
                v-if="isSmallScreen"
                class="mobile-extra-info">
                <!-- 狀態標籤 -->
                <a-tag
                  :color="record.enabled ? 'green' : 'default'"
                  size="small"
                  style="margin-top: 4px; margin-right: 8px">
                  {{ record.enabled ? "已啟用" : "未啟用" }}
                </a-tag>

                <!-- 工具數量 -->
                <span
                  v-if="record.tools && record.tools.length > 0"
                  class="mobile-tools-count">
                  {{ record.tools.length }} 個工具
                </span>
              </div>
            </div>
          </template>

          <!-- 端點列 -->
          <template #endpoint="{ record }">
            <a-button
              type="link"
              size="small"
              :href="(record.endpoint_url || record.endpoint) + '/tools'"
              target="_blank"
              style="padding: 0; height: auto">
              {{ formatEndpoint(record.endpoint_url || record.endpoint) }}
              <LinkOutlined style="margin-left: 4px" />
            </a-button>
          </template>

          <!-- 工具列 -->
          <template #tools="{ record }">
            <div class="tools-column">
              <!-- 工具標籤區域 -->
              <div
                class="tools-tags"
                v-if="record.tools && record.tools.length > 0">
                <a-tooltip
                  v-for="(tool, index) in record.tools.slice(
                    0,
                    isSmallScreen ? 2 : 5
                  )"
                  :key="tool.name || tool"
                  :title="
                    typeof tool === 'string'
                      ? tool
                      : tool.description || tool.name
                  ">
                  <a-tag
                    :color="getToolTagColor(tool)"
                    style="font-size: 12px; cursor: help"
                    @click="handleQuickToolToggle(record, tool)">
                    <ToolOutlined class="tool-icon" />
                    <span v-if="!isSmallScreen">{{ tool.name }}</span>
                  </a-tag>
                </a-tooltip>

                <!-- 更多工具指示器 -->
                <a-tag
                  v-if="record.tools.length > (isSmallScreen ? 2 : 5)"
                  color="blue"
                  size="small"
                  class="more-tools-tag"
                  @click="handleViewTools(record)"
                  :title="`還有 ${record.tools.length - (isSmallScreen ? 2 : 5)} 個工具，點擊查看全部`">
                  +{{ record.tools.length - (isSmallScreen ? 2 : 5) }}
                </a-tag>
              </div>

              <!-- 無工具時的提示 -->
              <div
                v-else
                class="no-tools">
                <a-tag
                  color="default"
                  size="small">
                  <ToolOutlined />
                  <span v-if="!isSmallScreen">無工具</span>
                </a-tag>
              </div>

              <!-- 工具數量統計 -->
              <div
                class="tools-count"
                v-if="
                  record.tools && record.tools.length > 0 && !isSmallScreen
                ">
                <a-tooltip
                  title="點擊查看工具列表"
                  :arrow="false">
                  <a-button
                    type="link"
                    size="small"
                    @click="handleViewTools(record)"
                    style="
                      padding: 0;
                      height: auto;
                      font-size: 11px;
                      color: #666;
                      cursor: help;
                    ">
                    共 {{ record.tools.length }} 個工具
                  </a-button>
                </a-tooltip>
              </div>
            </div>
          </template>

          <!-- 狀態列 -->
          <template #status="{ record }">
            <a-tag :color="record.enabled ? 'green' : 'default'">
              {{ record.enabled ? "已啟用" : "未啟用" }}
            </a-tag>
          </template>

          <!-- 操作列 -->
          <template #action="{ record }">
            <!-- 小螢幕：使用下拉選單 -->
            <a-dropdown
              v-if="isSmallScreen"
              placement="bottomRight">
              <template #overlay>
                <a-menu>
                  <a-menu-item
                    v-if="!record.enabled"
                    @click="handleEnableSingle(record)">
                    <PlayCircleOutlined />
                    啟用
                  </a-menu-item>
                  <a-menu-item
                    v-else
                    @click="handleDisableSingle(record)"
                    danger>
                    <StopOutlined />
                    停用
                  </a-menu-item>
                  <a-menu-divider />
                  <a-menu-item @click="handleViewTools(record)">
                    <EyeOutlined />
                    工具詳情
                  </a-menu-item>
                  <template v-if="viewMode === 'manage'">
                    <a-menu-divider />
                    <a-menu-item
                      @click="handleDeleteService(record, false)"
                      danger>
                      <DeleteOutlined />
                      軟刪除
                    </a-menu-item>
                    <a-menu-item
                      @click="handleDeleteService(record, true)"
                      danger>
                      <DeleteOutlined />
                      永久刪除
                    </a-menu-item>
                  </template>
                </a-menu>
              </template>
              <a-button
                type="text"
                size="small">
                <MoreOutlined />
              </a-button>
            </a-dropdown>

            <!-- 大螢幕：顯示完整按鈕 (垂直排列) -->
            <a-space
              v-else
              direction="vertical"
              size="small"
              style="
                min-width: 80px;
                display: flex;
                flex-direction: column;
                align-items: flex-start;
              ">
              <a-button
                v-if="!record.enabled"
                type="text"
                size="small"
                @click="handleEnableSingle(record)"
                style="padding: 2px 4px; height: 24px; margin-bottom: 4px">
                <PlayCircleOutlined />
                啟用
              </a-button>
              <a-button
                v-else
                type="text"
                size="small"
                danger
                @click="handleDisableSingle(record)"
                style="padding: 2px 4px; height: 24px; margin-bottom: 4px">
                <StopOutlined />
                停用
              </a-button>
              <a-button
                type="text"
                size="small"
                @click="handleViewTools(record)"
                style="padding: 2px 4px; height: 24px; margin-bottom: 4px">
                <EyeOutlined />
                工具詳情
              </a-button>
              <a-dropdown
                v-if="viewMode === 'manage'"
                style="margin-bottom: 4px">
                <template #overlay>
                  <a-menu>
                    <a-menu-item @click="handleDeleteService(record, false)">
                      <DeleteOutlined />
                      軟刪除
                    </a-menu-item>
                    <a-menu-item
                      @click="handleDeleteService(record, true)"
                      danger>
                      <DeleteOutlined />
                      永久刪除
                    </a-menu-item>
                  </a-menu>
                </template>
                <a-button
                  type="text"
                  size="small"
                  danger
                  style="padding: 2px 4px; height: 24px">
                  <DeleteOutlined />
                  刪除
                  <DownOutlined />
                </a-button>
              </a-dropdown>
            </a-space>
          </template>
        </a-table>
      </div>
    </a-card>

    <!-- 工具詳情對話框 -->
    <a-modal
      v-model:open="toolsModalVisible"
      :title="`${selectedService?.name} - 工具列表 (${selectedService?.tools?.length || 0})`"
      width="900px"
      :footer="null">
      <div v-if="selectedService">
        <!-- 工具概覽統計 -->
        <div
          class="tools-stats"
          style="margin-bottom: 20px">
          <a-row :gutter="16">
            <a-col
              :xs="24"
              :sm="24"
              :md="8"
              :lg="8"
              :xl="8">
              <a-statistic
                title="總工具數"
                :value="selectedService.tools.length"
                :value-style="{ color: '#1890ff' }">
                <template #prefix>
                  <ToolOutlined />
                </template>
              </a-statistic>
            </a-col>
            <a-col
              :xs="24"
              :sm="12"
              :md="8"
              :lg="8"
              :xl="8">
              <a-statistic
                title="已啟用"
                :value="enabledToolsCount"
                :value-style="{ color: '#52c41a' }">
                <template #prefix>
                  <CheckCircleOutlined />
                </template>
              </a-statistic>
            </a-col>
            <a-col
              :xs="24"
              :sm="12"
              :md="8"
              :lg="8"
              :xl="8">
              <a-statistic
                title="有 Schema"
                :value="toolsWithSchemaCount"
                :value-style="{ color: '#722ed1' }">
                <template #prefix>
                  <CodeOutlined />
                </template>
              </a-statistic>
            </a-col>
          </a-row>
        </div>

        <!-- 批量操作 -->
        <div
          class="tools-actions"
          style="margin-bottom: 20px">
          <a-space>
            <a-button
              type="primary"
              size="small"
              @click="handleEnableAllTools">
              全部啟用
            </a-button>
            <a-button
              size="small"
              @click="handleDisableAllTools">
              全部停用
            </a-button>
            <a-divider type="vertical" />
            <span style="color: #666; font-size: 12px">
              點擊標籤可切換啟用狀態 / 雙擊查看 Schema
            </span>
          </a-space>
        </div>

        <!-- 工具標籤展示 -->
        <div class="tools-tags-container">
          <div
            v-for="tool in selectedService.tools"
            :key="tool.name"
            class="tool-tag-wrapper">
            <!-- 主要工具標籤 -->
            <a-tag
              :color="getToolTagColor(tool)"
              :style="{
                cursor: 'pointer',
                fontSize: '11px',
                padding: '2px 6px',
                borderRadius: '6px',
                border: tool.enabled
                  ? '2px solid #52c41a'
                  : '1px solid #d9d9d9',
                fontWeight: tool.enabled ? '500' : 'normal',
                minWidth: '120px',
                textAlign: 'center',
              }"
              @click="handleToolToggle(tool, !tool.enabled)">
              <!-- 工具圖標 -->

              <!-- 工具名稱 -->
              <span>{{ tool.displayName || tool.name }}</span>
            </a-tag>

            <!-- Schema 指示器 -->
            <a-tooltip
              v-if="hasSchema(tool)"
              title="雙擊工具標籤查看 Schema"
              @click="handleViewSchema(tool)">
              <CodeOutlined
                :style="{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: '-4px',
                  right: '-4px',
                  fontSize: '14px',
                  color: 'var(--custom-text-primary)',
                  background: 'var(--custom-bg-secondary)',
                  borderRadius: '50%',
                  padding: '2px',
                }" />
            </a-tooltip>

            <!-- 工具描述提示 -->
            <a-tooltip
              v-if="tool.description"
              :title="tool.description"
              placement="bottom">
              <div
                :style="{
                  cursor: 'pointer',
                  fontSize: '10px',
                  color: '#999',
                  verticalAlign: 'top',
                  textAlign: 'left',
                  marginTop: '2px',
                  maxWidth: '120px',
                  overflow: 'hidden',
                }">
                {{ tool.description }}
              </div>
            </a-tooltip>
          </div>
        </div>

        <!-- 空狀態提示 -->
        <a-empty
          v-if="!selectedService.tools || selectedService.tools.length === 0"
          description="此服務暫無可用工具"
          :image="false">
          <template #image>
            <ToolOutlined style="font-size: 48px; color: #d9d9d9" />
          </template>
        </a-empty>
      </div>
    </a-modal>

    <!-- Schema 查看對話框 -->
    <a-modal
      v-model:open="schemaModalVisible"
      :title="`${selectedTool?.name} - Schema`"
      width="600px"
      :footer="null">
      <div v-if="selectedTool">
        <JsonViewer
          :data="selectedTool.schema"
          :expandDepth="5" />
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { message, Modal, Grid } from "ant-design-vue";
// import {
//   SyncOutlined,
//   SearchOutlined,
//   CloudServerOutlined,
//   CheckCircleOutlined,
//   ToolOutlined,
//   ClockCircleOutlined,
//   PlayCircleOutlined,
//   StopOutlined,
//   DeleteOutlined,
//   DownOutlined,
//   LinkOutlined,
//   EyeOutlined,
//   CodeOutlined,
//   MoreOutlined,
// } from "@ant-design/icons-vue";
import JsonViewer from "@/components/common/JsonViewer.vue";

import mcpApi from "@/api/mcp.js";

// 螢幕尺寸響應式監控
const { useBreakpoint } = Grid;
const screens = useBreakpoint();

const isSmallScreen = computed(() => !screens.value.md);
const isMediumScreen = computed(() => screens.value.md && !screens.value.lg);

// 響應式數據
const viewMode = ref("manage"); // 'manage' | 'discover'
const discovering = ref(false);
const syncing = ref(false);
const enabling = ref(false);
const disabling = ref(false);
const loading = ref(false);
const customEndpoint = ref("localhost:8080");
const discoveredServices = ref([]);
const syncedServices = ref([]);
const selectedServiceKeys = ref([]);
const toolsModalVisible = ref(false);
const schemaModalVisible = ref(false);
const selectedService = ref(null);
const selectedTool = ref(null);
const lastSyncTime = ref("未同步");

// 計算屬性
const currentServices = computed(() => {
  return viewMode.value === "discover"
    ? discoveredServices.value
    : syncedServices.value;
});

// 已啟用服務數量
const enabledServicesCount = computed(() => {
  return currentServices.value.filter(
    (service) => service.enabled || service.is_active
  ).length;
});

// 總工具數量
const totalToolsCount = computed(() => {
  if (viewMode.value === "discover") {
    return currentServices.value.reduce((total, service) => {
      return total + service.tools.length;
    }, 0);
  } else {
    // 管理模式：只計算已啟用的工具
    return currentServices.value.reduce((total, service) => {
      if (service.tools) {
        return total + service.tools.filter((tool) => tool.is_enabled).length;
      }
      return total;
    }, 0);
  }
});

// 已選擇服務數量
const hasSelectedServices = computed(() => {
  return selectedServiceKeys.value.length > 0;
});

// 已啟用服務數量
const hasEnabledServices = computed(() => {
  return discoveredServices.value.some((service) => service.enabled);
});

// 工具相關計算屬性
const enabledToolsCount = computed(() => {
  if (!selectedService.value || !selectedService.value.tools) return 0;
  return selectedService.value.tools.filter((tool) => tool.enabled).length;
});

// 有 Schema 的工具數量
const toolsWithSchemaCount = computed(() => {
  if (!selectedService.value || !selectedService.value.tools) return 0;
  return selectedService.value.tools.filter((tool) => hasSchema(tool)).length;
});

// 表格配置 - 響應式欄位設定
const serviceColumns = computed(() => {
  const baseColumns = [
    {
      title: "服務名稱",
      dataIndex: "name",
      key: "name",
      slots: { customRender: "name" },
      width: isSmallScreen.value ? 200 : 250,
      fixed: "left",
      responsive: ["xs", "sm", "md", "lg", "xl"],
    },
    {
      title: "端點",
      dataIndex: "endpoint",
      key: "endpoint",
      slots: { customRender: "endpoint" },
      width: 200,
      responsive: ["lg", "xl"],
    },
    {
      title: "工具",
      dataIndex: "tools",
      key: "tools",
      slots: { customRender: "tools" },
      width: isSmallScreen.value ? 180 : 350,
      responsive: ["md", "lg", "xl"],
    },
    {
      title: "狀態",
      dataIndex: "enabled",
      key: "status",
      slots: { customRender: "status" },
      width: 80,
      align: "center",
      responsive: ["sm", "md", "lg", "xl"],
    },
    {
      title: "操作",
      key: "action",
      slots: { customRender: "action" },
      width: isSmallScreen.value ? 48 : isMediumScreen.value ? 80 : 100,
      align: "center",
      fixed: "right",
      responsive: ["xs", "sm", "md", "lg", "xl"],
    },
  ];

  return baseColumns;
});

const toolColumns = [
  {
    title: "工具名稱",
    dataIndex: "name",
    key: "name",
    slots: { customRender: "name" },
    width: "40%",
  },
  {
    title: "啟用",
    dataIndex: "enabled",
    key: "enabled",
    slots: { customRender: "enabled" },
    width: "15%",
    align: "center",
  },
  {
    title: "Schema",
    dataIndex: "schema",
    key: "schema",
    slots: { customRender: "schema" },
    width: "20%",
    align: "center",
  },
];

// 行選擇配置
const rowSelection = computed(() => ({
  selectedRowKeys: selectedServiceKeys.value,
  onChange: (selectedKeys) => {
    selectedServiceKeys.value = selectedKeys;
  },
  getCheckboxProps: (record) => {
    if (viewMode.value === "discover") {
      return {
        disabled: record.enabled, // 發現模式：已啟用的服務不能再次選擇
      };
    } else {
      return {
        disabled: false, // 管理模式：所有服務都可以選擇進行刪除
      };
    }
  },
}));

// 發現服務
const handleDiscoverServices = async () => {
  discovering.value = true;
  try {
    // 構建完整的端點 URL
    let endpoint = null;
    if (customEndpoint.value && customEndpoint.value.trim()) {
      const trimmedEndpoint = customEndpoint.value.trim();
      // 如果用戶輸入的端點不包含協議，則添加 http://
      if (
        !trimmedEndpoint.startsWith("http://") &&
        !trimmedEndpoint.startsWith("https://")
      ) {
        endpoint = `http://${trimmedEndpoint}`;
      } else {
        endpoint = trimmedEndpoint;
      }
    }

    const response = await mcpApi.discoverServices(endpoint);
    if (response.data.success) {
      discoveredServices.value = response.data.data.services;
      message.success(`發現 ${response.data.data.services.length} 個服務`);
    } else {
      message.error(response.data.message || "服務發現失敗");
    }
  } catch (error) {
    console.error("服務發現失敗:", error);
    message.error(
      "服務發現失敗：" + (error.response?.data?.message || error.message)
    );
  } finally {
    discovering.value = false;
  }
};

// 同步服務
const handleFullSync = async () => {
  syncing.value = true;
  try {
    // 構建完整的端點 URL
    let endpoint = null;
    if (customEndpoint.value && customEndpoint.value.trim()) {
      const trimmedEndpoint = customEndpoint.value.trim();
      // 如果用戶輸入的端點不包含協議，則添加 http://
      if (
        !trimmedEndpoint.startsWith("http://") &&
        !trimmedEndpoint.startsWith("https://")
      ) {
        endpoint = `http://${trimmedEndpoint}`;
      } else {
        endpoint = trimmedEndpoint;
      }
    }

    const response = await mcpApi.syncServices(endpoint);
    if (response.data.success) {
      message.success(
        `同步完成：${response.data.data.services.length} 個服務，${response.data.data.tools.length} 個工具`
      );
      // 同步後自動切換到管理模式並重新加載數據
      viewMode.value = "manage";
      await handleLoadSyncedServices();
    } else {
      message.error(response.data.message || "同步失敗");
    }
  } catch (error) {
    console.error("同步失敗:", error);
    message.error(
      "同步失敗：" + (error.response?.data?.message || error.message)
    );
  } finally {
    syncing.value = false;
  }
};

// 啟用選擇的服務
const handleEnableSelected = async () => {
  if (selectedServiceKeys.value.length === 0) {
    message.warning("請選擇要啟用的服務");
    return;
  }

  enabling.value = true;
  try {
    const selectedServices = discoveredServices.value.filter((service) =>
      selectedServiceKeys.value.includes(service.moduleKey)
    );

    const response = await mcpApi.enableSelectedServices(selectedServices);
    if (response.data.success) {
      const servicesCount = response.data.data?.enabledServices?.length || 0;
      const toolsCount = response.data.data?.enabledTools?.length || 0;
      message.success(`成功啟用 ${servicesCount} 個服務，${toolsCount} 個工具`);

      // 啟用後重新獲取同步的服務數據
      await handleLoadSyncedServices();

      // 自動切換到管理模式
      viewMode.value = "manage";

      // 清空選擇狀態
      selectedServiceKeys.value = [];
    } else {
      message.error(response.data.message || "啟用失敗");
    }
  } catch (error) {
    console.error("啟用失敗:", error);
    message.error(
      "啟用失敗：" + (error.response?.data?.message || error.message)
    );
  } finally {
    enabling.value = false;
  }
};

// 啟用單個服務
const handleEnableSingle = async (service) => {
  enabling.value = true;
  try {
    const response = await mcpApi.enableSelectedServices([service]);
    if (response.data.success) {
      const toolsCount = response.data.data?.enabledTools?.length || 0;
      message.success(
        `成功啟用服務 ${service.name}，包含 ${toolsCount} 個工具`
      );

      // 啟用後重新獲取同步的服務數據
      await handleLoadSyncedServices();

      // 自動切換到管理模式
      viewMode.value = "manage";
    } else {
      message.error(response.data.message || "啟用失敗");
    }
  } catch (error) {
    console.error("啟用失敗:", error);
    message.error(
      "啟用失敗：" + (error.response?.data?.message || error.message)
    );
  } finally {
    enabling.value = false;
  }
};

// 停用選擇的服務
const handleDisableSelected = async () => {
  const enabledServices = discoveredServices.value.filter(
    (service) => service.enabled
  );

  if (enabledServices.length === 0) {
    message.warning("沒有已啟用的服務");
    return;
  }

  disabling.value = true;
  try {
    const response = await mcpApi.disableServices(
      enabledServices.map((s) => s.moduleKey)
    );
    if (response.data.success) {
      message.success(`成功停用 ${enabledServices.length} 個服務`);
      await handleDiscoverServices(); // 重新發現服務
    } else {
      message.error(response.data.message || "停用失敗");
    }
  } catch (error) {
    console.error("停用失敗:", error);
    message.error(
      "停用失敗：" + (error.response?.data?.message || error.message)
    );
  } finally {
    disabling.value = false;
  }
};

// 停用單個服務
const handleDisableSingle = async (service) => {
  disabling.value = true;
  try {
    const response = await mcpApi.disableServices([service.moduleKey]);
    if (response.data.success) {
      message.success(`成功停用服務 ${service.name}`);
      await handleDiscoverServices(); // 重新發現服務
    } else {
      message.error(response.data.message || "停用失敗");
    }
  } catch (error) {
    console.error("停用失敗:", error);
    message.error(
      "停用失敗：" + (error.response?.data?.message || error.message)
    );
  } finally {
    disabling.value = false;
  }
};

// 加載同步服務
const handleLoadSyncedServices = async () => {
  loading.value = true;
  try {
    const response = await mcpApi.getSyncedServices();
    if (response.data.success) {
      syncedServices.value = response.data.data;
      lastSyncTime.value = new Date().toLocaleString();
    } else {
      message.error(response.data.message || "加載同步服務失敗");
    }
  } catch (error) {
    console.error("加載同步服務失敗:", error);
    message.error(
      "加載同步服務失敗：" + (error.response?.data?.message || error.message)
    );
  } finally {
    loading.value = false;
  }
};

// 刷新同步服務
const handleRefreshSynced = async () => {
  await handleLoadSyncedServices();
  message.success("刷新完成");
};

// 切換模式
const handleViewModeChange = (e) => {
  viewMode.value = e.target.value;
  selectedServiceKeys.value = []; // 切換模式時清空選擇
  if (viewMode.value === "manage") {
    handleLoadSyncedServices();
  }
};

// 查看工具
const handleViewTools = (service) => {
  selectedService.value = service;
  toolsModalVisible.value = true;
};

// 查看 Schema
const handleViewSchema = (tool) => {
  selectedTool.value = tool;
  schemaModalVisible.value = true;
};

// 切換工具
const handleToolToggle = async (tool, enabled) => {
  try {
    const response = await mcpApi.toggleTool(tool.id, enabled);
    if (response.data.success) {
      tool.enabled = enabled;
      message.success(`工具 ${tool.name} 已${enabled ? "啟用" : "停用"}`);
    } else {
      message.error(response.data.message || "操作失敗");
    }
  } catch (error) {
    console.error("工具切換失敗:", error);
    message.error(
      "操作失敗：" + (error.response?.data?.message || error.message)
    );
  }
};

// 快速切換工具
const handleQuickToolToggle = async (record, tool) => {
  try {
    // 如果工具是字符串，說明是簡化顯示，需要從完整工具列表中找到對應的工具對象
    let targetTool = tool;
    if (typeof tool === "string") {
      targetTool = record.tools.find(
        (t) => t.name === tool || t.displayName === tool
      );
      if (!targetTool) {
        message.error("找不到對應的工具");
        return;
      }
    }

    const newEnabled = !targetTool.enabled;
    const response = await mcpApi.toggleTool(targetTool.id, newEnabled);

    if (response.data.success) {
      targetTool.enabled = newEnabled;
      // 同時更新服務記錄中的工具狀態
      const serviceToolIndex = record.tools.findIndex(
        (t) => t.id === targetTool.id
      );
      if (serviceToolIndex !== -1) {
        record.tools[serviceToolIndex].enabled = newEnabled;
      }
      message.success(
        `工具 ${targetTool.name || targetTool.displayName} 已${newEnabled ? "啟用" : "停用"}`
      );
    } else {
      message.error(response.data.message || "操作失敗");
    }
  } catch (error) {
    console.error("工具切換失敗:", error);
    message.error(
      "操作失敗：" + (error.response?.data?.message || error.message)
    );
  }
};

// 批量啟用工具
const handleEnableAllTools = async () => {
  if (!selectedService.value || !selectedService.value.tools) return;

  try {
    const toolIds = selectedService.value.tools.map((tool) => tool.id);
    const response = await mcpApi.batchToggleTools(toolIds, true);
    if (response.data.success) {
      selectedService.value.tools.forEach((tool) => {
        tool.enabled = true;
      });
      message.success("所有工具已啟用");
    } else {
      message.error(response.data.message || "批量啟用失敗");
    }
  } catch (error) {
    console.error("批量啟用失敗:", error);
    message.error(
      "批量啟用失敗：" + (error.response?.data?.message || error.message)
    );
  }
};

// 批量停用工具
const handleDisableAllTools = async () => {
  if (!selectedService.value || !selectedService.value.tools) return;

  try {
    const toolIds = selectedService.value.tools.map((tool) => tool.id);
    const response = await mcpApi.batchToggleTools(toolIds, false);
    if (response.data.success) {
      selectedService.value.tools.forEach((tool) => {
        tool.enabled = false;
      });
      message.success("所有工具已停用");
    } else {
      message.error(response.data.message || "批量停用失敗");
    }
  } catch (error) {
    console.error("批量停用失敗:", error);
    message.error(
      "批量停用失敗：" + (error.response?.data?.message || error.message)
    );
  }
};

// 刪除服務
const handleDeleteService = async (service, permanent = false) => {
  const action = permanent ? "永久刪除" : "軟刪除";
  Modal.confirm({
    title: `確認${action}`,
    content: `確定要${action}服務 "${service.name}" 嗎？`,
    okText: "確認",
    cancelText: "取消",
    onOk: async () => {
      try {
        const response = await mcpApi.deleteService(service.id, permanent);
        if (response.data.success) {
          message.success(`服務 ${service.name} 已${action}`);
          await handleLoadSyncedServices();
        } else {
          message.error(response.data.message || `${action}失敗`);
        }
      } catch (error) {
        console.error(`${action}失敗:`, error);
        message.error(
          `${action}失敗：` + (error.response?.data?.message || error.message)
        );
      }
    },
  });
};

// 批量刪除服務
const handleBatchDelete = async (permanent = false) => {
  if (selectedServiceKeys.value.length === 0) {
    message.warning("請選擇要刪除的服務");
    return;
  }

  const action = permanent ? "永久刪除" : "軟刪除";
  Modal.confirm({
    title: `確認批量${action}`,
    content: `確定要${action} ${selectedServiceKeys.value.length} 個服務嗎？`,
    okText: "確認",
    cancelText: "取消",
    onOk: async () => {
      try {
        const response = await mcpApi.batchDeleteServices(
          selectedServiceKeys.value,
          permanent
        );
        if (response.data.success) {
          message.success(
            `已${action} ${selectedServiceKeys.value.length} 個服務`
          );
          selectedServiceKeys.value = [];
          await handleLoadSyncedServices();
        } else {
          message.error(response.data.message || `批量${action}失敗`);
        }
      } catch (error) {
        console.error(`批量${action}失敗:`, error);
        message.error(
          `批量${action}失敗：` +
            (error.response?.data?.message || error.message)
        );
      }
    },
  });
};

// 工具方法
const formatEndpoint = (endpoint) => {
  if (!endpoint) return "";
  return endpoint.replace(/^https?:\/\//, "");
};

const getToolTagColor = (tool) => {
  if (tool.enabled) return "green";
  return "default";
};

const hasSchema = (tool) => {
  return tool.schema && Object.keys(tool.schema).length > 0;
};

const handleTableChange = (pagination, filters, sorter) => {
  // 表格變化處理
};

// 組件掛載時根據模式加載數據
onMounted(() => {
  if (viewMode.value === "manage") {
    handleLoadSyncedServices();
  }
});
</script>

<style scoped>
/* 調試信息 - 確保頁面有足夠高度 */

/* 確保內容區域有足夠高度 */
.services-section {
  margin-top: 24px;
}

.tools-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.endpoint-section {
  margin-bottom: 24px;
  padding: 16px;
  background: var(--);
  border-radius: 6px;
}

.status-section {
  margin-bottom: 24px;
  padding: 16px;
  background: var(--custom-bg-secondary);
  border: 1px solid var(--custom-border-secondary);
  border-radius: 6px;
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

.service-description {
  font-size: 12px;
  color: var(--custom-text-secondary);
  margin-top: 4px;
}

.mobile-extra-info {
  margin-top: 8px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.mobile-tools-count {
  font-size: 11px;
  color: var(--custom-text-secondary);
  background: var(--custom-bg-tertiary);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--custom-border-secondary);
}

/* 工具標籤樣式 */
.tools-tags-container {
  max-height: 400px;
  overflow-y: auto;
  padding: 8px;
  background: var(--custom-bg-tertiary);
  border-radius: 6px;
  border: 1px solid var(--custom-border-secondary);
}

.tool-tag-wrapper {
  margin: 6px !important;
  display: inline-block;
  margin: 4px;
  position: relative;
  transition: all 0.3s ease;
  vertical-align: top;
}

.tool-tag-wrapper:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.tools-stats {
  background: var(--custom-bg-tertiary);
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--custom-border-secondary);
}

.tools-actions {
  background: var(--custom-bg-tertiary);
  padding: 12px;
  border-radius: 6px;
  border: 1px solid var(--custom-border-secondary);
}

/* 工具列樣式 */
.tools-column {
  min-height: 40px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tool-icon {
  margin-right: 3px !important;
  font-size: 11px;
}

.more-tools-tag {
  margin: 0 !important;
  cursor: pointer;
  font-size: 11px !important;
  padding: 2px 6px !important;
  border-radius: 4px !important;
  font-weight: 500;
  transition: all 0.2s ease;
}

.no-tools {
  display: flex;
  align-items: center;
}

.tools-count {
  margin-top: 2px;
}

.tools-count .ant-btn-link {
  text-decoration: none;
}

/* 大螢幕下的服務行樣式，以容納垂直按鈕 */
.service-row:not(.ant-table-row-level-0) {
  height: auto !important;
}

/* 服務表格行在垂直排列按鈕模式下的樣式 */
@media (min-width: 768px) {
  .service-row {
    height: auto !important;
    min-height: 140px !important;
  }
}
</style>

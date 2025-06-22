<template>
  <div class="smart-chart-container">
    <!-- 圖表標題和操作按鈕 -->
    <div
      v-if="title || showActions"
      class="chart-header">
      <h4
        v-if="title"
        class="chart-title">
        {{ title }}
      </h4>
      <div
        v-if="showActions"
        class="chart-actions">
        <a-button
          type="text"
          size="small"
          @click="handleDownload"
          :loading="downloading"
          title="下載圖表">
          <DownloadOutlined />
        </a-button>
        <a-button
          type="text"
          size="small"
          @click="handleToggleFullscreen"
          title="全屏顯示">
          <FullscreenOutlined v-if="!isFullscreen" />
          <FullscreenExitOutlined v-else />
        </a-button>
        <a-button
          v-if="showDataTable"
          type="text"
          size="small"
          @click="showTable = !showTable"
          title="顯示數據表格">
          <TableOutlined />
        </a-button>
        <a-button
          v-if="enableChartTypeSwitch && chartSuggestions.length > 1"
          type="text"
          size="small"
          @click="showChartSelector = !showChartSelector"
          title="切換圖表類型">
          <BarChartOutlined />
        </a-button>
      </div>
    </div>

    <!-- 圖表類型選擇器 -->
    <div
      v-if="showChartSelector"
      class="chart-type-selector">
      <a-space wrap>
        <a-button
          v-for="suggestion in chartSuggestions"
          :key="suggestion.type"
          :type="currentChartType === suggestion.type ? 'primary' : 'default'"
          size="small"
          @click="handleChangeChartType(suggestion.type)">
          {{ suggestion.label }}
        </a-button>
      </a-space>
    </div>

    <!-- 載入狀態 -->
    <div
      v-if="loading"
      class="chart-loading">
      <a-spin size="large">
        <template #indicator>
          <BarChartOutlined
            style="font-size: 24px"
            spin />
        </template>
      </a-spin>
      <p>正在生成圖表...</p>
    </div>

    <!-- 錯誤狀態 -->
    <div
      v-else-if="error"
      class="chart-error">
      <a-result
        status="error"
        title="圖表生成失敗"
        :sub-title="error">
        <template #extra>
          <a-button @click="handleRetry">重試</a-button>
        </template>
      </a-result>
    </div>

    <!-- 主要圖表區域 -->
    <div
      v-else
      ref="chartContainer"
      class="chart-main"
      :class="{ 'chart-fullscreen': isFullscreen }">
      <v-chart
        ref="echartsRef"
        :option="chartOption"
        :theme="chartTheme"
        :autoresize="true"
        @click="handleChartClick"
        @finished="handleChartFinished"
        class="chart-instance"
        :style="chartStyle" />
    </div>

    <!-- 數據表格 -->
    <div
      v-if="showTable && tableData.length > 0"
      class="chart-data-table">
      <a-divider>數據表格</a-divider>
      <a-table
        :dataSource="tableData"
        :columns="tableColumns"
        size="small"
        :pagination="{ pageSize: 10 }"
        :scroll="{ x: true }" />
    </div>

    <!-- 圖表說明 -->
    <div
      v-if="description"
      class="chart-description">
      <a-typography-paragraph type="secondary">
        {{ description }}
      </a-typography-paragraph>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { useFullscreen } from "@vueuse/core";
import { message } from "ant-design-vue";
import VChart from "vue-echarts";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import {
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  RadarChart,
  GaugeChart,
  FunnelChart,
} from "echarts/charts";
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  ToolboxComponent,
  DataZoomComponent,
  BrushComponent,
  VisualMapComponent,
} from "echarts/components";
import { chartService } from "@/services/chartService";
import { useAppStore } from "@/stores/app";

// 註冊 ECharts 組件
use([
  CanvasRenderer,
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  RadarChart,
  GaugeChart,
  FunnelChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  ToolboxComponent,
  DataZoomComponent,
  BrushComponent,
  VisualMapComponent,
]);

// Props 定義
const props = defineProps({
  // 數據相關
  data: {
    type: [Array, Object],
    required: true,
  },
  chartType: {
    type: String,
    default: "auto", // auto, bar, line, pie, scatter, radar, gauge, funnel
  },

  // 外觀設置
  title: {
    type: String,
    default: "",
  },
  description: {
    type: String,
    default: "",
  },
  width: {
    type: [String, Number],
    default: "100%",
  },
  height: {
    type: [String, Number],
    default: "400px",
  },

  // 功能開關
  showActions: {
    type: Boolean,
    default: true,
  },
  showDataTable: {
    type: Boolean,
    default: true,
  },
  enableChartTypeSwitch: {
    type: Boolean,
    default: true,
  },

  // 配置選項
  chartConfig: {
    type: Object,
    default: () => ({}),
  },
});

// Emits 定義
const emit = defineEmits([
  "chart-ready",
  "chart-click",
  "chart-type-change",
  "error",
]);

// 響應式數據
const appStore = useAppStore();
const echartsRef = ref(null);
const chartContainer = ref(null);
const loading = ref(false);
const downloading = ref(false);
const error = ref("");
const showTable = ref(false);
const showChartSelector = ref(false);
const currentChartType = ref(props.chartType);

// 全屏功能
const { isFullscreen, toggle: toggleFullscreen } =
  useFullscreen(chartContainer);

// 計算屬性
const chartTheme = computed(() => {
  return appStore.isDarkMode ? "dark" : "light";
});

const chartStyle = computed(() => ({
  width: typeof props.width === "number" ? `${props.width}px` : props.width,
  height: typeof props.height === "number" ? `${props.height}px` : props.height,
}));

const chartOption = ref({});
const chartSuggestions = ref([]);
const tableData = ref([]);
const tableColumns = ref([]);

// 圖表處理邏輯
const processChartData = async () => {
  try {
    loading.value = true;
    error.value = "";

    // 使用 chartService 處理數據和生成配置
    const result = await chartService.generateChart({
      data: props.data,
      chartType: currentChartType.value,
      config: props.chartConfig,
      theme: chartTheme.value,
    });

    chartOption.value = result.option;
    chartSuggestions.value = result.suggestions || [];
    tableData.value = result.tableData || [];
    tableColumns.value = result.tableColumns || [];

    // 如果是自動模式且有推薦，使用第一個推薦類型
    if (props.chartType === "auto" && result.suggestions.length > 0) {
      currentChartType.value = result.suggestions[0].type;
    }

    emit("chart-ready", {
      option: chartOption.value,
      suggestions: chartSuggestions.value,
    });
  } catch (err) {
    console.error("圖表生成錯誤:", err);
    error.value = err.message || "圖表生成失敗";
    emit("error", err);
  } finally {
    loading.value = false;
  }
};

// 事件處理
const handleDownload = async () => {
  if (!echartsRef.value) return;

  try {
    downloading.value = true;
    const canvas = echartsRef.value.getDataURL({
      type: "png",
      pixelRatio: 2,
      backgroundColor: chartTheme.value === "dark" ? "#1f1f1f" : "#ffffff",
    });

    const link = document.createElement("a");
    link.download = `chart_${Date.now()}.png`;
    link.href = canvas;
    link.click();

    message.success("圖表下載成功");
  } catch (err) {
    console.error("下載失敗:", err);
    message.error("圖表下載失敗");
  } finally {
    downloading.value = false;
  }
};

const handleToggleFullscreen = () => {
  toggleFullscreen();
};

const handleChartClick = (params) => {
  emit("chart-click", params);
};

const handleChartFinished = () => {
  // 圖表渲染完成
};

const handleChangeChartType = async (type) => {
  if (type === currentChartType.value) return;

  currentChartType.value = type;
  await processChartData();
  emit("chart-type-change", type);
};

const handleRetry = () => {
  processChartData();
};

// 監聽數據變化
watch(
  () => props.data,
  () => {
    processChartData();
  },
  { deep: true }
);

watch(
  () => props.chartType,
  (newType) => {
    if (newType !== currentChartType.value) {
      currentChartType.value = newType;
      processChartData();
    }
  }
);

watch(
  () => chartTheme.value,
  () => {
    processChartData();
  }
);

// 生命週期
onMounted(() => {
  processChartData();
});

onUnmounted(() => {
  if (echartsRef.value) {
    echartsRef.value.dispose();
  }
});
</script>

<style scoped>
.smart-chart-container {
  @apply bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700;
}

.chart-header {
  @apply flex justify-between items-center mb-4;
}

.chart-title {
  @apply text-lg font-medium text-gray-900 dark:text-gray-100 m-0;
}

.chart-actions {
  @apply flex gap-2;
}

.chart-type-selector {
  @apply mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg;
}

.chart-loading {
  @apply flex flex-col items-center justify-center py-12 text-gray-500;
}

.chart-loading p {
  @apply mt-3 text-sm;
}

.chart-error {
  @apply py-8;
}

.chart-main {
  @apply relative;
  min-height: 300px;
}

.chart-instance {
  @apply w-full h-full;
}

.chart-fullscreen {
  @apply fixed inset-0 z-50 bg-white dark:bg-gray-900 p-6;
}

.chart-fullscreen .chart-instance {
  @apply w-full h-full;
}

.chart-data-table {
  @apply mt-4;
}

.chart-description {
  @apply mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .chart-header {
    @apply flex-col gap-3 items-start;
  }

  .chart-actions {
    @apply w-full justify-end;
  }

  .chart-type-selector :deep(.ant-space) {
    @apply w-full;
  }

  .chart-type-selector :deep(.ant-btn) {
    @apply flex-1 text-xs;
  }
}

/* 深色模式優化 */
.dark .smart-chart-container {
  @apply bg-gray-800 border-gray-600;
}

.dark .chart-type-selector {
  @apply bg-gray-700;
}

.dark .chart-description {
  @apply bg-gray-700;
}
</style>

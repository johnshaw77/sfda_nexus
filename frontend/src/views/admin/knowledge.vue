<template>
  <div class="knowledge-management">
    <!-- 頁面標題 -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="page-title">
            <BookOutlined />
            知識庫管理
          </h1>
          <p class="page-description">
            KESS 智能文檔處理系統 - 文檔摘要與知識管理
          </p>
        </div>

        <div class="header-actions">
          <!-- 搜索框 -->
          <a-input-search
            v-model:value="searchInput"
            placeholder="搜索文檔或摘要..."
            style="width: 300px"
            @search="handleSearch"
            @pressEnter="handleSearch"
            allowClear>
            <template #enterButton>
              <a-button type="primary">
                <SearchOutlined />
                搜索
              </a-button>
            </template>
          </a-input-search>

          <!-- 視圖切換 -->
          <a-segmented
            v-model:value="knowledgeStore.activeView"
            :options="viewOptions"
            style="margin-left: 16px" />

          <!-- 刷新按鈕 -->
          <a-button
            @click="handleRefresh"
            :loading="isLoading">
            <ReloadOutlined />
            刷新
          </a-button>
        </div>
      </div>
    </div>

    <!-- 主要內容區域 -->
    <div class="main-content">
      <!-- 左側邊欄 - 分類樹 -->
      <div
        class="sidebar"
        :class="{ collapsed: knowledgeStore.sidebarCollapsed }">
        <div class="sidebar-header">
          <h3 v-if="!knowledgeStore.sidebarCollapsed">文檔分類</h3>
          <a-button
            type="text"
            @click="knowledgeStore.toggleSidebar"
            class="collapse-btn">
            <MenuFoldOutlined v-if="!knowledgeStore.sidebarCollapsed" />
            <MenuUnfoldOutlined v-else />
          </a-button>
        </div>

        <div class="sidebar-content">
          <CategoryTree />
        </div>
      </div>

      <!-- 右側內容區域 -->
      <div class="content-area">
        <!-- 麵包屑導航 -->
        <div
          class="breadcrumb-section"
          v-if="knowledgeStore.selectedCategory">
          <a-breadcrumb>
            <a-breadcrumb-item>
              <HomeOutlined />
              知識庫
            </a-breadcrumb-item>
            <a-breadcrumb-item>
              <component
                :is="getCategoryIcon(knowledgeStore.selectedCategory.icon)" />
              {{ knowledgeStore.selectedCategory.name }}
            </a-breadcrumb-item>
            <a-breadcrumb-item v-if="knowledgeStore.activeView === 'search'">
              <SearchOutlined />
              搜索結果
            </a-breadcrumb-item>
          </a-breadcrumb>
        </div>

        <!-- 內容區域 -->
        <div class="content-body">
          <!-- 摘要列表視圖 -->
          <SummaryList
            v-if="knowledgeStore.activeView === 'summaries'"
            :key="summaryListKey" />

          <!-- 搜索結果視圖 -->
          <SearchResults
            v-else-if="knowledgeStore.activeView === 'search'"
            :query="knowledgeStore.searchQuery" />

          <!-- 統計視圖 -->
          <StatsOverview v-else-if="knowledgeStore.activeView === 'stats'" />

          <!-- 默認歡迎頁面 -->
          <div
            v-else
            class="welcome-section">
            <a-empty
              description="請選擇左側分類查看文檔摘要"
              :image="Empty.PRESENTED_IMAGE_SIMPLE">
              <template #image>
                <BookOutlined style="font-size: 64px; color: #d9d9d9" />
              </template>
            </a-empty>
          </div>
        </div>
      </div>
    </div>

    <!-- 摘要詳情抽屜 -->
    <SummaryDetailDrawer />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { message, Empty } from "ant-design-vue";
import {
  BookOutlined,
  SearchOutlined,
  ReloadOutlined,
  HomeOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BarChartOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons-vue";

// 組件引入
import CategoryTree from "./knowledge/components/CategoryTree.vue";
import SummaryList from "./knowledge/components/SummaryList.vue";
import SearchResults from "./knowledge/components/SearchResults.vue";
import StatsOverview from "./knowledge/components/StatsOverview.vue";
import SummaryDetailDrawer from "./knowledge/components/SummaryDetailDrawer.vue";

// Store
import { useKnowledgeStore } from "@/stores/knowledge.js";

// 初始化
const knowledgeStore = useKnowledgeStore();

// 響應式數據
const searchInput = ref("");
const summaryListKey = ref(0); // 用於強制重新渲染摘要列表

// 視圖選項
const viewOptions = [
  {
    label: "摘要列表",
    value: "summaries",
    icon: UnorderedListOutlined,
  },
  {
    label: "統計報表",
    value: "stats",
    icon: BarChartOutlined,
  },
];

// 計算屬性
const isLoading = computed(() => {
  return (
    knowledgeStore.categoryLoading ||
    knowledgeStore.summaryLoading ||
    knowledgeStore.searchLoading ||
    knowledgeStore.statsLoading
  );
});

// 方法
const handleSearch = () => {
  if (searchInput.value.trim()) {
    knowledgeStore.searchSummaries(searchInput.value.trim());
  } else {
    knowledgeStore.clearSearch();
  }
};

const handleRefresh = async () => {
  try {
    await knowledgeStore.initialize();

    // 如果有選中的分類，重新載入摘要
    if (knowledgeStore.selectedCategory) {
      await knowledgeStore.loadSummaries(
        knowledgeStore.selectedCategory.code,
        knowledgeStore.summaryPagination.current
      );
      summaryListKey.value++; // 強制重新渲染
    }

    message.success("數據刷新成功");
  } catch (error) {
    message.error("刷新失敗: " + error.message);
  }
};

const getCategoryIcon = (iconName) => {
  const iconMap = {
    laptop: "LaptopOutlined",
    "shield-check": "SafetyOutlined",
    cog: "SettingOutlined",
    users: "TeamOutlined",
    "dollar-sign": "DollarOutlined",
    scale: "AuditOutlined",
    folder: "FolderOutlined",
  };

  // 這裡可以根據需要返回對應的圖標組件
  return "FolderOutlined"; // 暫時返回默認圖標
};

// 監聽搜索查詢變化
watch(
  () => knowledgeStore.searchQuery,
  (newQuery) => {
    if (!newQuery) {
      searchInput.value = "";
    }
  }
);

// 生命週期
onMounted(async () => {
  try {
    await knowledgeStore.initialize();
  } catch (error) {
    console.error("初始化知識庫失敗:", error);
  }
});
</script>

<style scoped lang="scss">
.knowledge-management {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--background-color-base);

  .page-header {
    background: var(--custom-bg-primary);
    border-bottom: 1px solid var(--custom-border-primary);
    padding: 16px 24px;

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .title-section {
        .page-title {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          color: var(--custom-text-primary);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .page-description {
          margin: 4px 0 0 0;
          color: var(--custom-text-secondary);
          font-size: 14px;
        }
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 12px;
      }
    }
  }

  .main-content {
    flex: 1;
    display: flex;
    overflow: hidden;

    .sidebar {
      width: 300px;
      background: var(--custom-bg-primary);
      border-right: 1px solid var(--custom-border-primary);
      display: flex;
      flex-direction: column;
      transition: width 0.3s ease;

      &.collapsed {
        width: 64px;
      }

      .sidebar-header {
        padding: 16px;
        border-bottom: 1px solid var(--custom-border-primary);
        display: flex;
        justify-content: space-between;
        align-items: center;

        h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: var(--custom-text-primary);
        }

        .collapse-btn {
          padding: 4px;
        }
      }

      .sidebar-content {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
      }
    }

    .content-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;

      .breadcrumb-section {
        padding: 16px 24px 8px 24px;
        background: var(--custom-bg-primary);
        border-bottom: 1px solid var(--custom-border-secondary);
      }

      .content-body {
        flex: 1;
        overflow: hidden;
        background: var(--custom-bg-primary);

        .welcome-section {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      }
    }
  }
}

// 響應式設計
@media (max-width: 768px) {
  .knowledge-management {
    .page-header .header-content {
      flex-direction: column;
      gap: 16px;
      align-items: stretch;

      .header-actions {
        justify-content: space-between;
      }
    }

    .main-content {
      .sidebar {
        position: absolute;
        z-index: 100;
        height: 100%;

        &.collapsed {
          width: 0;
          overflow: hidden;
        }
      }
    }
  }
}
</style>

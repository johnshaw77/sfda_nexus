<template>
  <div class="category-tree">
    <!-- 加載狀態 -->
    <div
      v-if="knowledgeStore.categoryLoading"
      class="loading-container">
      <a-spin size="small" />
      <span
        v-if="!knowledgeStore.sidebarCollapsed"
        style="margin-left: 8px">
        載入分類中...
      </span>
    </div>

    <!-- 分類列表 -->
    <div
      v-else
      class="category-list">
      <div
        v-for="category in knowledgeStore.categories"
        :key="category.code"
        class="category-item"
        :class="{
          active: knowledgeStore.selectedCategory?.code === category.code,
          collapsed: knowledgeStore.sidebarCollapsed,
        }"
        @click="handleSelectCategory(category)">
        <!-- 分類圖標 -->
        <div class="category-icon">
          <component :is="getCategoryIcon(category.icon)" />
        </div>

        <!-- 分類信息 -->
        <div
          v-if="!knowledgeStore.sidebarCollapsed"
          class="category-info">
          <div class="category-name">{{ category.name }}</div>
          <div class="category-stats">
            <span class="stat-item">
              <FileTextOutlined />
              {{ category.stats.total_documents }}
            </span>
            <span class="stat-item">
              <CheckCircleOutlined />
              {{ category.stats.completed_documents }}
            </span>
            <span
              class="stat-item"
              v-if="category.stats.pending_documents > 0">
              <ClockCircleOutlined />
              {{ category.stats.pending_documents }}
            </span>
          </div>
        </div>

        <!-- 文檔數量徽章（折疊狀態下顯示） -->
        <a-badge
          v-if="knowledgeStore.sidebarCollapsed"
          :count="category.stats.total_documents"
          :number-style="{ backgroundColor: '#1890ff' }"
          class="collapsed-badge" />
      </div>
    </div>

    <!-- 空狀態 -->
    <div
      v-if="
        !knowledgeStore.categoryLoading &&
        knowledgeStore.categories.length === 0
      "
      class="empty-state">
      <a-empty
        :image="Empty.PRESENTED_IMAGE_SIMPLE"
        description="暫無分類數據" />
    </div>

    <!-- Tooltip for collapsed state -->
    <div
      v-if="knowledgeStore.sidebarCollapsed"
      class="tooltip-container">
      <a-tooltip
        v-for="category in knowledgeStore.categories"
        :key="`tooltip-${category.code}`"
        :title="getCategoryTooltip(category)"
        placement="right">
        <div></div>
      </a-tooltip>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { message, Empty } from "ant-design-vue";
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  LaptopOutlined,
  SafetyOutlined,
  SettingOutlined,
  TeamOutlined,
  DollarOutlined,
  AuditOutlined,
  FolderOutlined,
} from "@ant-design/icons-vue";

// Store
import { useKnowledgeStore } from "@/stores/knowledge.js";

const knowledgeStore = useKnowledgeStore();

// 圖標映射
const iconMap = {
  laptop: LaptopOutlined,
  "shield-check": SafetyOutlined,
  cog: SettingOutlined,
  users: TeamOutlined,
  "dollar-sign": DollarOutlined,
  scale: AuditOutlined,
  folder: FolderOutlined,
};

// 方法
const getCategoryIcon = (iconName) => {
  return iconMap[iconName] || FolderOutlined;
};

const getCategoryTooltip = (category) => {
  return `${category.name}\n文檔: ${category.stats.total_documents}\n完成: ${category.stats.completed_documents}\n待處理: ${category.stats.pending_documents}`;
};

const handleSelectCategory = async (category) => {
  try {
    await knowledgeStore.selectCategory(category.code);
  } catch (error) {
    message.error("選擇分類失敗: " + error.message);
  }
};
</script>

<style scoped lang="scss">
.category-tree {
  height: 100%;

  .loading-container {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    color: var(--custom-text-tertiary);
  }

  .category-list {
    .category-item {
      display: flex;
      align-items: center;
      padding: 12px 8px;
      margin: 4px 0;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;

      &:hover {
        background: var(--custom-bg-secondary);
      }

      &.active {
        background: var(--custom-bg-tertiary);
        border-left: 3px solid var(--primary-color);

        .category-icon {
          color: var(--primary-color);
        }

        .category-name {
          color: var(--primary-color);
          font-weight: 600;
        }
      }

      &.collapsed {
        justify-content: center;
        padding: 16px 8px;

        .category-icon {
          font-size: 20px;
        }
      }

      .category-icon {
        font-size: 16px;
        color: var(--custom-text-secondary);
        transition: color 0.2s ease;
        min-width: 20px;
        display: flex;
        justify-content: center;
      }

      .category-info {
        margin-left: 12px;
        flex: 1;
        min-width: 0;

        .category-name {
          font-size: 14px;
          font-weight: 500;
          color: var(--custom-text-primary);
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .category-stats {
          display: flex;
          gap: 8px;

          .stat-item {
            display: flex;
            align-items: center;
            gap: 2px;
            font-size: 12px;
            color: var(--custom-text-tertiary);

            &:first-child {
              color: var(--info-color);
            }

            &:nth-child(2) {
              color: var(--success-color);
            }

            &:nth-child(3) {
              color: var(--warning-color);
            }
          }
        }
      }

      .collapsed-badge {
        position: absolute;
        top: 8px;
        right: 8px;

        :deep(.ant-badge-count) {
          font-size: 10px;
          min-width: 16px;
          height: 16px;
          line-height: 16px;
          padding: 0 4px;
        }
      }
    }
  }

  .empty-state {
    padding: 40px 20px;
    text-align: center;
  }

  .tooltip-container {
    position: absolute;
    pointer-events: none;
  }
}

// 響應式設計
@media (max-width: 768px) {
  .category-tree {
    .category-list {
      .category-item {
        padding: 16px 12px;

        .category-icon {
          font-size: 18px;
        }

        .category-info {
          .category-name {
            font-size: 16px;
          }

          .category-stats {
            .stat-item {
              font-size: 13px;
            }
          }
        }
      }
    }
  }
}
</style>

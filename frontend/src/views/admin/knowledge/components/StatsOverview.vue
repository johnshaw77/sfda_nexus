<template>
  <div class="stats-overview">
    <!-- 統計頭部 -->
    <div class="stats-header">
      <h3>知識庫統計概覽</h3>
      <p>KESS 系統整體運行狀態與數據分析</p>
    </div>

    <!-- 加載狀態 -->
    <div
      v-if="knowledgeStore.statsLoading"
      class="loading-container">
      <a-spin size="large" />
      <p>載入統計數據中...</p>
    </div>

    <!-- 統計內容 -->
    <div
      v-else
      class="stats-content">
      <!-- 總覽卡片 -->
      <div class="overview-cards">
        <div class="stat-card total">
          <div class="card-icon">
            <FileTextOutlined />
          </div>
          <div class="card-content">
            <div class="stat-number">
              {{ knowledgeStore.stats.overview.total_documents || 0 }}
            </div>
            <div class="stat-label">總文檔數</div>
          </div>
        </div>

        <div class="stat-card completed">
          <div class="card-icon">
            <CheckCircleOutlined />
          </div>
          <div class="card-content">
            <div class="stat-number">
              {{ knowledgeStore.stats.overview.completed_documents || 0 }}
            </div>
            <div class="stat-label">已完成處理</div>
            <div class="stat-percent">{{ getCompletionRate() }}%</div>
          </div>
        </div>

        <div class="stat-card pending">
          <div class="card-icon">
            <ClockCircleOutlined />
          </div>
          <div class="card-content">
            <div class="stat-number">
              {{ knowledgeStore.stats.overview.pending_documents || 0 }}
            </div>
            <div class="stat-label">待處理</div>
          </div>
        </div>

        <div class="stat-card storage">
          <div class="card-icon">
            <DatabaseOutlined />
          </div>
          <div class="card-content">
            <div class="stat-number">
              {{
                formatFileSize(knowledgeStore.stats.overview.total_file_size)
              }}
            </div>
            <div class="stat-label">總存儲量</div>
          </div>
        </div>
      </div>

      <!-- 分類統計表格 -->
      <div class="category-stats-section">
        <h4>分類統計詳情</h4>
        <a-table
          :dataSource="knowledgeStore.stats.categories"
          :columns="categoryColumns"
          :pagination="false"
          :scroll="{ x: 800 }"
          row-key="code">
          <template #bodyCell="{ column, record }">
            <!-- 分類名稱列 -->
            <template v-if="column.key === 'name'">
              <div class="category-name-cell">
                <component
                  :is="getCategoryIcon(record.icon)"
                  class="category-icon" />
                <span>{{ record.name }}</span>
              </div>
            </template>

            <!-- 進度條列 -->
            <template v-if="column.key === 'progress'">
              <a-progress
                :percent="getProgressPercent(record)"
                :stroke-color="getProgressColor(record)"
                :show-info="true"
                size="small" />
            </template>

            <!-- 文件大小列 -->
            <template v-if="column.key === 'file_size'">
              {{ formatFileSize(record.total_file_size) }}
            </template>

            <!-- 狀態列 -->
            <template v-if="column.key === 'status'">
              <a-tag :color="getStatusColor(record)">
                {{ getStatusText(record) }}
              </a-tag>
            </template>
          </template>
        </a-table>
      </div>

      <!-- 處理狀態圖表 -->
      <div class="charts-section">
        <div class="chart-row">
          <!-- 分類分佈餅圖 -->
          <div class="chart-card">
            <h4>分類文檔分佈</h4>
            <div class="chart-placeholder">
              <a-empty
                description="圖表功能開發中"
                :image="Empty.PRESENTED_IMAGE_SIMPLE" />
            </div>
          </div>

          <!-- 處理進度條形圖 -->
          <div class="chart-card">
            <h4>處理進度統計</h4>
            <div class="progress-chart">
              <div
                v-for="category in knowledgeStore.stats.categories"
                :key="category.code"
                class="progress-item">
                <div class="progress-label">
                  <component
                    :is="getCategoryIcon(category.icon)"
                    class="icon" />
                  <span>{{ category.name }}</span>
                  <span class="count">({{ category.total_documents }})</span>
                </div>
                <a-progress
                  :percent="getProgressPercent(category)"
                  :stroke-color="getProgressColor(category)"
                  :show-info="true" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 系統信息 -->
      <div class="system-info-section">
        <h4>系統信息</h4>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">資料庫連接:</span>
            <a-tag color="green">正常</a-tag>
          </div>
          <div class="info-item">
            <span class="info-label">最後更新:</span>
            <span>{{ formatDate(new Date()) }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">平均文件大小:</span>
            <span>{{ getAverageFileSize() }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">處理成功率:</span>
            <span>{{ getCompletionRate() }}%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { Empty } from "ant-design-vue";
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
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

// 表格列定義
const categoryColumns = [
  {
    title: "分類",
    key: "name",
    dataIndex: "name",
    width: 150,
    fixed: "left",
  },
  {
    title: "總文檔",
    dataIndex: "total_documents",
    width: 80,
    align: "center",
  },
  {
    title: "已完成",
    dataIndex: "completed_documents",
    width: 80,
    align: "center",
  },
  {
    title: "待處理",
    dataIndex: "pending_documents",
    width: 80,
    align: "center",
  },
  {
    title: "進度",
    key: "progress",
    width: 120,
    align: "center",
  },
  {
    title: "文件大小",
    key: "file_size",
    width: 100,
    align: "right",
  },
  {
    title: "狀態",
    key: "status",
    width: 80,
    align: "center",
  },
];

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

const getCompletionRate = () => {
  const total = knowledgeStore.stats.overview.total_documents || 0;
  const completed = knowledgeStore.stats.overview.completed_documents || 0;
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
};

const getProgressPercent = (category) => {
  const total = category.total_documents || 0;
  const completed = category.completed_documents || 0;
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
};

const getProgressColor = (category) => {
  const percent = getProgressPercent(category);
  if (percent >= 90) return "#52c41a";
  if (percent >= 70) return "#1890ff";
  if (percent >= 50) return "#faad14";
  return "#f5222d";
};

const getStatusColor = (category) => {
  const percent = getProgressPercent(category);
  if (percent >= 90) return "green";
  if (percent >= 70) return "blue";
  if (percent >= 50) return "orange";
  return "red";
};

const getStatusText = (category) => {
  const percent = getProgressPercent(category);
  if (percent >= 90) return "優秀";
  if (percent >= 70) return "良好";
  if (percent >= 50) return "一般";
  return "需關注";
};

const formatFileSize = (bytes) => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const formatDate = (date) => {
  return date.toLocaleString("zh-TW");
};

const getAverageFileSize = () => {
  const total = knowledgeStore.stats.overview.total_documents || 0;
  const totalSize = knowledgeStore.stats.overview.total_file_size || 0;
  if (total === 0) return "0 B";
  return formatFileSize(totalSize / total);
};
</script>

<style scoped lang="scss">
.stats-overview {
  height: 100%;
  overflow-y: auto;
  padding: 24px;

  .stats-header {
    margin-bottom: 24px;

    h3 {
      margin: 0 0 8px 0;
      font-size: 20px;
      font-weight: 600;
      color: var(--custom-text-primary);
    }

    p {
      margin: 0;
      color: var(--custom-text-secondary);
      font-size: 14px;
    }
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 300px;
    color: var(--custom-text-tertiary);

    p {
      margin-top: 16px;
      margin-bottom: 0;
    }
  }

  .stats-content {
    .overview-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 32px;

      .stat-card {
        background: var(--custom-bg-primary);
        border: 1px solid var(--custom-border-primary);
        border-radius: 8px;
        padding: 20px;
        display: flex;
        align-items: center;
        box-shadow: var(--shadow-1);
        transition: transform 0.2s ease;

        &:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-card-hover);
        }

        &.total {
          border-left: 4px solid var(--info-color);
          .card-icon {
            color: var(--info-color);
            background: rgba(24, 144, 255, 0.1);
          }
        }

        &.completed {
          border-left: 4px solid var(--success-color);
          .card-icon {
            color: var(--success-color);
            background: rgba(82, 196, 26, 0.1);
          }
        }

        &.pending {
          border-left: 4px solid var(--warning-color);
          .card-icon {
            color: var(--warning-color);
            background: rgba(250, 173, 20, 0.1);
          }
        }

        &.storage {
          border-left: 4px solid #722ed1;
          .card-icon {
            color: #722ed1;
            background: rgba(114, 46, 209, 0.1);
          }
        }

        .card-icon {
          font-size: 24px;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 16px;
        }

        .card-content {
          flex: 1;

          .stat-number {
            font-size: 24px;
            font-weight: 600;
            color: var(--custom-text-primary);
            margin-bottom: 4px;
          }

          .stat-label {
            font-size: 14px;
            color: var(--custom-text-secondary);
          }

          .stat-percent {
            font-size: 12px;
            color: var(--success-color);
            font-weight: 500;
          }
        }
      }
    }

    .category-stats-section {
      background: var(--custom-bg-primary);
      border: 1px solid var(--custom-border-primary);
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: var(--shadow-1);

      h4 {
        margin: 0 0 16px 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--custom-text-primary);
      }

      .category-name-cell {
        display: flex;
        align-items: center;
        gap: 8px;

        .category-icon {
          font-size: 16px;
          color: var(--custom-text-tertiary);
        }
      }
    }

    .charts-section {
      margin-bottom: 24px;

      .chart-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;

        .chart-card {
          background: var(--custom-bg-primary);
          border: 1px solid var(--custom-border-primary);
          border-radius: 8px;
          padding: 24px;
          box-shadow: var(--shadow-1);

          h4 {
            margin: 0 0 16px 0;
            font-size: 16px;
            font-weight: 600;
            color: var(--custom-text-primary);
          }

          .chart-placeholder {
            height: 200px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .progress-chart {
            .progress-item {
              margin-bottom: 16px;

              .progress-label {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
                font-size: 14px;

                .icon {
                  font-size: 14px;
                  color: var(--custom-text-tertiary);
                }

                .count {
                  color: var(--custom-text-tertiary);
                  font-size: 12px;
                }
              }
            }
          }
        }
      }
    }

    .system-info-section {
      background: var(--custom-bg-primary);
      border: 1px solid var(--custom-border-primary);
      border-radius: 8px;
      padding: 24px;
      box-shadow: var(--shadow-1);

      h4 {
        margin: 0 0 16px 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--custom-text-primary);
      }

      .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;

        .info-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid var(--custom-border-secondary);

          .info-label {
            font-weight: 500;
            color: var(--custom-text-secondary);
          }
        }
      }
    }
  }
}

// 響應式設計
@media (max-width: 1200px) {
  .stats-overview {
    .stats-content {
      .charts-section {
        .chart-row {
          grid-template-columns: 1fr;
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .stats-overview {
    padding: 16px;

    .stats-content {
      .overview-cards {
        grid-template-columns: 1fr;
      }

      .category-stats-section,
      .charts-section .chart-card,
      .system-info-section {
        padding: 16px;
      }

      .system-info-section {
        .info-grid {
          grid-template-columns: 1fr;
        }
      }
    }
  }
}
</style>

<template>
  <div class="admin-page">
    <a-card
      title="智能體管理"
      :bordered="false">
      <template #extra>
        <a-space>
          <a-button @click="handleImport">
            <UploadOutlined />
            導入智能體
          </a-button>
          <a-button
            type="primary"
            @click="handleAddAgent">
            <PlusOutlined />
            創建智能體
          </a-button>
        </a-space>
      </template>

      <!-- 搜索和篩選 -->
      <div class="search-section">
        <a-row :gutter="16">
          <a-col
            :xs="24"
            :sm="24"
            :md="8"
            :lg="8">
            <a-input-search
              v-model:value="searchText"
              placeholder="搜索智能體名稱或描述"
              @search="handleSearch"
              allow-clear />
          </a-col>
          <a-col
            :xs="12"
            :sm="8"
            :md="6"
            :lg="6">
            <a-select
              v-model:value="filterCategory"
              placeholder="選擇分類"
              style="width: 100%"
              allow-clear>
              <a-select-option value="general">通用</a-select-option>
              <a-select-option value="assistant">通用助手</a-select-option>
              <a-select-option value="coding">編程助手</a-select-option>
              <a-select-option value="writing">寫作助手</a-select-option>
              <a-select-option value="analysis">分析助手</a-select-option>
              <a-select-option value="customer_service"
                >客服助手</a-select-option
              >
            </a-select>
          </a-col>
          <a-col
            :xs="12"
            :sm="8"
            :md="6"
            :lg="6">
            <a-select
              v-model:value="filterStatus"
              placeholder="選擇狀態"
              style="width: 100%"
              allow-clear>
              <a-select-option value="active">啟用</a-select-option>
              <a-select-option value="inactive">停用</a-select-option>
            </a-select>
          </a-col>
          <a-col
            :xs="24"
            :sm="8"
            :md="4"
            :lg="4">
            <a-button
              block
              @click="handleReset"
              >重置</a-button
            >
          </a-col>
        </a-row>
      </div>

      <!-- 智能體卡片列表 -->
      <div class="agents-grid">
        <a-row :gutter="[24, 24]">
          <a-col
            v-for="agent in filteredAgents"
            :key="agent.id"
            :xs="24"
            :sm="12"
            :md="8"
            :lg="6">
            <a-card
              hoverable
              class="agent-card"
              :class="{ disabled: !agent.is_active }">
              <!-- 卡片頭部 -->
              <template #cover>
                <div class="agent-avatar">
                  <div class="avatar-container">
                    <a-avatar
                      :size="128"
                      :src="agent.avatar"
                      :style="{
                        backgroundColor: agent.avatar
                          ? 'transparent'
                          : 'var(--primary-color)',
                      }">
                      <template #icon>
                        <RobotOutlined v-if="!agent.avatar" />
                      </template>
                    </a-avatar>
                    <!-- 狀態指示器 -->
                    <a-tooltip :title="agent.is_active ? '已啟用' : '已禁用'">
                      <div
                        class="status-indicator"
                        :class="{ active: agent.is_active }">
                        <div class="status-dot"></div>
                      </div>
                    </a-tooltip>
                  </div>
                </div>
              </template>

              <!-- 卡片操作 -->
              <template #actions>
                <a-tooltip title="編輯">
                  <EditOutlined @click="handleEdit(agent)" />
                </a-tooltip>
                <a-tooltip title="複製">
                  <CopyOutlined @click="handleClone(agent)" />
                </a-tooltip>
                <a-tooltip title="測試">
                  <PlayCircleOutlined @click="handleTest(agent)" />
                </a-tooltip>
                <a-popconfirm
                  title="確定要刪除這個智能體嗎？"
                  @confirm="handleDelete(agent)">
                  <a-tooltip title="刪除">
                    <DeleteOutlined />
                  </a-tooltip>
                </a-popconfirm>
              </template>

              <!-- 卡片內容 -->
              <a-card-meta :title="agent.display_name || agent.name">
                <template #avatar>
                  <a-space
                    direction="vertical"
                    size="small">
                    <a-tag :color="getCategoryColor(agent.category)">
                      {{ getCategoryName(agent.category) }}
                    </a-tag>
                    <a-tag
                      :color="agent.agent_type === 'qwen' ? 'orange' : 'blue'"
                      size="small">
                      {{
                        agent.agent_type === "qwen" ? "Qwen-Agent" : "自定義"
                      }}
                    </a-tag>
                  </a-space>
                </template>
                <template #description>
                  <a-tooltip
                    :title="agent.description"
                    placement="topLeft">
                    <div class="agent-description">
                      {{ agent.description }}
                    </div>
                  </a-tooltip>
                </template>
              </a-card-meta>

              <!-- 狀態和統計 -->
              <div class="agent-stats">
                <div class="stat-item">
                  <span class="stat-label">使用次數:</span>
                  <span class="stat-value">{{ agent.usage_count || 0 }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">使用模型:</span>
                  <a-tooltip title="點擊編輯智能體和模型配置">
                    <span
                      class="stat-value model-name clickable"
                      @click="handleEdit(agent)">
                      {{
                        agent.model_display_name || agent.model_name || "未設定"
                      }}
                    </span>
                  </a-tooltip>
                </div>
                <div class="stat-item">
                  <span class="stat-label">MCP服務:</span>
                  <a-tooltip title="點擊編輯智能體和MCP服務配置">
                    <span
                      class="stat-value mcp-service"
                      @click="handleViewMcpServices(agent)">
                      {{ getAgentMcpServiceText(agent.id) }}
                    </span>
                  </a-tooltip>
                </div>
              </div>
            </a-card>
          </a-col>
        </a-row>
      </div>

      <!-- 分頁 -->
      <div class="pagination-wrapper">
        <a-pagination
          :current="pagination.page"
          :page-size="pagination.limit"
          :total="pagination.total"
          :show-size-changer="true"
          :show-quick-jumper="true"
          :show-total="(total) => `共 ${total} 個智能體`"
          @change="handlePageChange" />
      </div>
    </a-card>

    <!-- 創建/編輯智能體對話框 -->
    <a-modal
      v-model:open="modalVisible"
      :title="modalTitle"
      :width="900"
      @ok="handleModalOk"
      @cancel="handleModalCancel">
      <a-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        layout="vertical">
        <!-- 基本信息區域 -->
        <a-row :gutter="24">
          <!-- 頭像 -->
          <a-col
            :xs="24"
            :sm="24"
            :md="6"
            :lg="6">
            <a-form-item label="頭像">
              <div class="avatar-upload-section">
                <AvatarUpload
                  v-model="formData.avatar"
                  :size="80"
                  :default-icon="h(RobotOutlined)"
                  tips="支持 JPG、PNG 格式，建議 200x200 像素，可拖拉、貼上"
                  @change="handleAvatarChange" />
              </div>
            </a-form-item>
          </a-col>

          <!-- 基本信息 -->
          <a-col
            :xs="24"
            :sm="24"
            :md="18"
            :lg="18">
            <a-row :gutter="16">
              <a-col
                :xs="24"
                :sm="12"
                :md="12"
                :lg="12">
                <a-form-item name="name">
                  <template #label>
                    <a-space>
                      <span>智能體名稱</span>
                      <a-tooltip
                        title="智能體的唯一標識名稱，用於系統內部識別，建議使用英文或數字，不可重複">
                        <QuestionCircleOutlined
                          style="color: #999; cursor: help" />
                      </a-tooltip>
                    </a-space>
                  </template>
                  <a-input
                    v-model:value="formData.name"
                    placeholder="輸入智能體名稱" />
                </a-form-item>
              </a-col>
              <a-col
                :xs="24"
                :sm="12"
                :md="12"
                :lg="12">
                <a-form-item name="display_name">
                  <template #label>
                    <a-space>
                      <span>顯示名稱</span>
                      <a-tooltip
                        title="在用戶界面中顯示的友好名稱，支援中文，用戶看到的名稱">
                        <QuestionCircleOutlined
                          style="color: #999; cursor: help" />
                      </a-tooltip>
                    </a-space>
                  </template>
                  <a-input
                    v-model:value="formData.display_name"
                    placeholder="輸入顯示名稱" />
                </a-form-item>
              </a-col>
            </a-row>

            <a-row :gutter="16">
              <a-col
                :xs="24"
                :sm="12"
                :md="8"
                :lg="8">
                <a-form-item name="category">
                  <template #label>
                    <a-space>
                      <span>分類</span>
                      <a-tooltip
                        title="智能體的功能分類，用於組織和篩選不同類型的助手">
                        <QuestionCircleOutlined
                          style="color: #999; cursor: help" />
                      </a-tooltip>
                    </a-space>
                  </template>
                  <a-select
                    v-model:value="formData.category"
                    placeholder="選擇分類">
                    <a-select-option value="general">通用</a-select-option>
                    <a-select-option value="assistant"
                      >通用助手</a-select-option
                    >
                    <a-select-option value="coding">編程助手</a-select-option>
                    <a-select-option value="writing">寫作助手</a-select-option>
                    <a-select-option value="analysis">分析助手</a-select-option>
                    <a-select-option value="customer_service"
                      >客服助手</a-select-option
                    >
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col
                :xs="24"
                :sm="12"
                :md="8"
                :lg="8">
                <a-form-item name="agent_type">
                  <template #label>
                    <a-space>
                      <span>Agent 類型</span>
                      <a-tooltip
                        title="選擇 Agent 的運作模式：自定義 Agent 需要手動配置工具，Qwen-Agent 支援智能工具選擇">
                        <QuestionCircleOutlined
                          style="color: #999; cursor: help" />
                      </a-tooltip>
                    </a-space>
                  </template>
                  <a-select
                    v-model:value="formData.agent_type"
                    placeholder="選擇 Agent 類型"
                    @change="handleAgentTypeChange">
                    <a-select-option value="custom">
                      <a-space>
                        <span>自定義 Agent</span>
                        <a-tag
                          color="blue"
                          size="small"
                          >標準</a-tag
                        >
                      </a-space>
                    </a-select-option>
                    <a-select-option value="qwen">
                      <a-space>
                        <span>Qwen-Agent</span>
                        <a-tag
                          color="orange"
                          size="small"
                          >智能</a-tag
                        >
                      </a-space>
                    </a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col
                :xs="24"
                :sm="12"
                :md="8"
                :lg="8">
                <a-form-item name="model_id">
                  <template #label>
                    <a-space>
                      <span>關聯模型</span>
                      <a-tooltip
                        title="選擇此 Agent 使用的 AI 模型，不同模型有不同的能力和特性">
                        <QuestionCircleOutlined
                          style="color: #999; cursor: help" />
                      </a-tooltip>
                    </a-space>
                  </template>
                  <a-select
                    v-model:value="formData.model_id"
                    placeholder="選擇AI模型"
                    :loading="loadingModels"
                    :options="
                      availableModels.map((model) => ({
                        label:
                          model.display_name || model.model_name || model.name,
                        value: model.id,
                      }))
                    "
                    show-search
                    :filter-option="
                      (input, option) =>
                        option.label.toLowerCase().includes(input.toLowerCase())
                    ">
                  </a-select>
                </a-form-item>
              </a-col>
            </a-row>
          </a-col>
        </a-row>

        <!-- 描述 -->
        <a-form-item name="description">
          <template #label>
            <a-space>
              <span>描述</span>
              <a-tooltip
                title="詳細描述此 Agent 的功能、用途和特色，幫助用戶了解如何使用">
                <QuestionCircleOutlined style="color: #999; cursor: help" />
              </a-tooltip>
            </a-space>
          </template>
          <a-textarea
            v-model:value="formData.description"
            placeholder="輸入智能體描述"
            :rows="2" />
        </a-form-item>

        <!-- MCP 服務詳情對話框 -->
        <a-modal
          v-model:open="serviceDetailVisible"
          :title="`${selectedServiceDetail?.name} - 服務詳情`"
          width="700px"
          :footer="null">
          <div v-if="selectedServiceDetail">
            <a-descriptions
              :column="1"
              bordered>
              <a-descriptions-item label="服務名稱">
                {{ selectedServiceDetail.name }}
              </a-descriptions-item>
              <a-descriptions-item label="描述">
                {{ selectedServiceDetail.description || "暫無描述" }}
              </a-descriptions-item>
              <a-descriptions-item label="端點 URL">
                {{ selectedServiceDetail.endpoint_url || "暫無端點" }}
              </a-descriptions-item>
              <a-descriptions-item label="擁有者">
                {{ selectedServiceDetail.owner || "未知" }}
              </a-descriptions-item>
              <a-descriptions-item label="版本">
                {{ selectedServiceDetail.version || "1.0.0" }}
              </a-descriptions-item>
              <a-descriptions-item label="狀態">
                <a-tag
                  :color="selectedServiceDetail.is_active ? 'green' : 'red'">
                  {{ selectedServiceDetail.is_active ? "已啟用" : "未啟用" }}
                </a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="可用工具">
                <div class="tools-detail">
                  <div v-if="(selectedServiceDetail.tools || []).length === 0">
                    <a-empty
                      :image="false"
                      description="此服務暫無可用工具" />
                  </div>
                  <div v-else>
                    <a-space
                      direction="vertical"
                      style="width: 100%">
                      <a-card
                        v-for="tool in selectedServiceDetail.tools || []"
                        :key="tool.id"
                        size="small"
                        :title="tool.name"
                        style="margin-bottom: 8px">
                        <p>{{ tool.description || "暫無描述" }}</p>
                        <div class="tool-meta">
                          <a-tag
                            size="small"
                            :color="tool.is_enabled ? 'green' : 'red'">
                            {{ tool.is_enabled ? "已啟用" : "未啟用" }}
                          </a-tag>
                          <span class="tool-usage">
                            使用次數: {{ tool.usage_count || 0 }}
                          </span>
                        </div>
                      </a-card>
                    </a-space>
                  </div>
                </div>
              </a-descriptions-item>
            </a-descriptions>
          </div>
        </a-modal>

        <!-- 系統提示詞 -->
        <a-form-item name="system_prompt">
          <template #label>
            <a-space>
              <span>系統提示詞</span>
              <a-tooltip
                title="定義 Agent 的角色、行為模式和回應風格的核心指令，這是 Agent 個性的基礎">
                <QuestionCircleOutlined style="color: #999; cursor: help" />
              </a-tooltip>
            </a-space>
          </template>
          <a-textarea
            v-model:value="formData.system_prompt"
            placeholder="輸入系統提示詞，定義智能體的行為和角色"
            :rows="4" />
        </a-form-item>

        <!-- 配置區域 -->
        <a-row :gutter="16">
          <a-col
            :xs="24"
            :sm="24"
            :md="8"
            :lg="8">
            <a-form-item name="tags">
              <template #label>
                <a-space>
                  <span>標籤</span>
                  <a-tooltip
                    title="為 Agent 添加關鍵字標籤，方便搜索和分類管理">
                    <QuestionCircleOutlined style="color: #999; cursor: help" />
                  </a-tooltip>
                </a-space>
              </template>
              <a-select
                v-model:value="formData.tags"
                mode="tags"
                placeholder="輸入標籤"
                :token-separators="[',']">
              </a-select>
            </a-form-item>
          </a-col>
          <a-col
            :xs="24"
            :sm="12"
            :md="8"
            :lg="8">
            <a-form-item>
              <template #label>
                <a-space>
                  <span>狀態設置</span>
                  <a-tooltip
                    title="啟用：Agent 是否可以使用；公開：是否對所有用戶可見">
                    <QuestionCircleOutlined style="color: #999; cursor: help" />
                  </a-tooltip>
                </a-space>
              </template>
              <a-space
                direction="vertical"
                style="width: 100%">
                <div
                  style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                  ">
                  <span>啟用:</span>
                  <a-switch
                    v-model:checked="formData.is_active"
                    size="small" />
                </div>
                <div
                  style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                  ">
                  <span>公開:</span>
                  <a-switch
                    v-model:checked="formData.is_public"
                    size="small" />
                </div>
              </a-space>
            </a-form-item>
          </a-col>
          <a-col
            :xs="24"
            :sm="12"
            :md="8"
            :lg="8">
            <a-form-item name="capabilities">
              <template #label>
                <a-space>
                  <span>能力配置</span>
                  <a-tooltip
                    title="JSON 格式的能力配置，定義 Agent 的特殊能力和限制">
                    <QuestionCircleOutlined style="color: #999; cursor: help" />
                  </a-tooltip>
                </a-space>
              </template>
              <a-textarea
                v-model:value="formData.capabilities"
                placeholder="JSON格式"
                :rows="3" />
            </a-form-item>
          </a-col>
        </a-row>

        <!-- Qwen-Agent 專用配置 -->
        <div
          v-if="formData.agent_type === 'qwen'"
          class="qwen-config-section">
          <a-divider orientation="left">
            <a-space>
              <span>Qwen-Agent 配置</span>
              <a-tag
                color="orange"
                size="small"
                >智能模式</a-tag
              >
            </a-space>
          </a-divider>

          <a-row :gutter="16">
            <a-col
              :xs="24"
              :sm="12"
              :md="8"
              :lg="8">
              <a-form-item name="tool_selection_mode">
                <template #label>
                  <a-space>
                    <span>工具選擇模式</span>
                    <a-tooltip
                      title="手動選擇：需要明確指定使用的工具；自動選擇：AI 根據對話內容智能選擇合適的工具">
                      <QuestionCircleOutlined
                        style="color: #999; cursor: help" />
                    </a-tooltip>
                  </a-space>
                </template>
                <a-select
                  v-model:value="formData.tool_selection_mode"
                  placeholder="選擇工具選擇模式">
                  <a-select-option value="manual">
                    <a-space>
                      <span>手動選擇</span>
                      <a-tag
                        color="blue"
                        size="small"
                        >精確</a-tag
                      >
                    </a-space>
                  </a-select-option>
                  <a-select-option value="auto">
                    <a-space>
                      <span>自動選擇</span>
                      <a-tag
                        color="green"
                        size="small"
                        >智能</a-tag
                      >
                    </a-space>
                  </a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col
              :xs="24"
              :sm="12"
              :md="8"
              :lg="8">
              <a-form-item>
                <template #label>
                  <a-space>
                    <span>MCP 服務</span>
                    <a-tooltip
                      title="Model Context Protocol 服務，提供外部工具和數據源的連接能力">
                      <QuestionCircleOutlined
                        style="color: #999; cursor: help" />
                    </a-tooltip>
                  </a-space>
                </template>
                <a-switch
                  v-model:checked="formData.qwen_config.mcp_enabled"
                  checked-children="啟用"
                  un-checked-children="停用" />
              </a-form-item>
            </a-col>
            <a-col
              :xs="24"
              :sm="12"
              :md="8"
              :lg="8">
              <a-form-item>
                <template #label>
                  <a-space>
                    <span>自動工具選擇</span>
                    <a-tooltip
                      title="開啟後，AI 會根據對話內容自動判斷並調用最合適的工具，無需手動指定">
                      <QuestionCircleOutlined
                        style="color: #999; cursor: help" />
                    </a-tooltip>
                  </a-space>
                </template>
                <a-switch
                  v-model:checked="formData.qwen_config.auto_tool_selection"
                  checked-children="開啟"
                  un-checked-children="關閉" />
              </a-form-item>
            </a-col>
          </a-row>

          <a-row :gutter="16">
            <a-col
              :xs="24"
              :sm="12"
              :md="12"
              :lg="12">
              <a-form-item name="supported_languages">
                <template #label>
                  <a-space>
                    <span>支援語言</span>
                    <a-tooltip
                      title="選擇此 Agent 能夠理解和回應的語言，影響 AI 的語言處理能力">
                      <QuestionCircleOutlined
                        style="color: #999; cursor: help" />
                    </a-tooltip>
                  </a-space>
                </template>
                <a-select
                  v-model:value="formData.qwen_config.supported_languages"
                  mode="multiple"
                  placeholder="選擇支援的語言"
                  :options="[
                    { label: '繁體中文', value: 'zh-TW' },
                    { label: '簡體中文', value: 'zh-CN' },
                    { label: 'English', value: 'en' },
                    { label: '日本語', value: 'ja' },
                    { label: '한국어', value: 'ko' },
                  ]" />
              </a-form-item>
            </a-col>
            <a-col
              :xs="24"
              :sm="12"
              :md="12"
              :lg="12">
              <a-form-item name="specialties">
                <template #label>
                  <a-space>
                    <span>專業領域</span>
                    <a-tooltip
                      title="選擇此 Agent 擅長的專業領域，會影響工具選擇和回應的專業性">
                      <QuestionCircleOutlined
                        style="color: #999; cursor: help" />
                    </a-tooltip>
                  </a-space>
                </template>
                <a-select
                  v-model:value="formData.qwen_config.specialties"
                  mode="multiple"
                  placeholder="選擇專業領域"
                  :options="[
                    { label: '人力資源 (HR)', value: 'HR' },
                    { label: '財務管理 (Finance)', value: 'Finance' },
                    {
                      label: '任務管理 (TaskManagement)',
                      value: 'TaskManagement',
                    },
                    { label: '工作流程 (Workflow)', value: 'Workflow' },
                    {
                      label: '客戶服務 (CustomerService)',
                      value: 'CustomerService',
                    },
                    { label: '數據分析 (DataAnalysis)', value: 'DataAnalysis' },
                  ]" />
              </a-form-item>
            </a-col>
          </a-row>

          <a-form-item name="model_config">
            <template #label>
              <a-space>
                <span>模型配置</span>
                <a-tooltip
                  title="JSON 格式的模型參數配置，包括模型名稱、溫度值、最大 token 數等">
                  <QuestionCircleOutlined style="color: #999; cursor: help" />
                </a-tooltip>
              </a-space>
            </template>
            <a-textarea
              v-model:value="formData.qwen_config.model_config_json"
              placeholder='{"model": "qwen3:32b", "temperature": 0.7, "max_tokens": 4096}'
              :rows="3"
              @blur="handleModelConfigChange" />
          </a-form-item>
        </div>

        <!-- MCP 服務配置 -->
        <a-form-item name="mcpServices">
          <template #label>
            <a-space>
              <span>工具配置</span>
              <a-tooltip
                title="選擇此 Agent 可以使用的 MCP 服務和工具，這些工具將擴展 Agent 的能力">
                <QuestionCircleOutlined style="color: #999; cursor: help" />
              </a-tooltip>
            </a-space>
          </template>
          <div class="mcp-services-selector">
            <!-- 服務統計概覽 -->
            <div class="services-overview">
              <a-space>
                <a-statistic
                  title="已選服務"
                  :value="selectedServices.length"
                  suffix="/" />
                <a-statistic
                  title="可用服務"
                  :value="mcpServices.length" />
                <a-statistic
                  title="總工具數"
                  :value="getTotalToolsCount()" />
              </a-space>
            </div>

            <!-- 服務選擇列表 -->
            <div class="services-list">
              <a-spin :spinning="loadingServices">
                <a-list
                  :data-source="mcpServices"
                  size="small"
                  :locale="{ emptyText: '暫無可用的 MCP 服務' }">
                  <template #renderItem="{ item }">
                    <a-list-item class="service-item">
                      <template #actions>
                        <a-tooltip title="查看詳情">
                          <a-button
                            type="text"
                            size="small"
                            @click="handleViewServiceDetail(item)">
                            <EyeOutlined />
                          </a-button>
                        </a-tooltip>
                      </template>

                      <a-list-item-meta>
                        <template #avatar>
                          <a-checkbox
                            :checked="selectedServices.includes(item.id)"
                            @change="handleServiceToggle(item.id, $event)" />
                        </template>
                        <template #title>
                          <div class="service-title">
                            <span class="service-name">{{ item.name }}</span>
                            <a-tag
                              :color="item.is_active ? 'green' : 'red'"
                              size="small">
                              {{ item.is_active ? "啟用" : "停用" }}
                            </a-tag>
                          </div>
                        </template>
                        <template #description>
                          <div class="service-description">
                            <p>{{ item.description || "暫無描述" }}</p>
                            <div class="service-tools">
                              <a-space wrap>
                                <a-tag
                                  v-for="tool in (item.tools || []).slice(0, 3)"
                                  :key="tool.id"
                                  size="small"
                                  color="blue">
                                  {{ tool.name }}
                                </a-tag>
                                <a-tag
                                  v-if="(item.tools || []).length > 3"
                                  size="small"
                                  color="default">
                                  +{{ (item.tools || []).length - 3 }} 更多
                                </a-tag>
                              </a-space>
                            </div>
                          </div>
                        </template>
                      </a-list-item-meta>
                    </a-list-item>
                  </template>
                </a-list>
              </a-spin>
            </div>

            <!-- 批量操作 -->
            <div class="batch-actions">
              <a-space>
                <a-button
                  size="small"
                  @click="handleSelectAllServices">
                  全選
                </a-button>
                <a-button
                  size="small"
                  @click="handleClearAllServices">
                  清空
                </a-button>
                <a-button
                  size="small"
                  type="primary"
                  ghost
                  @click="handleRefreshServices">
                  <ReloadOutlined />
                  刷新服務
                </a-button>
              </a-space>
            </div>
          </div>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, h } from "vue";
import { message, Modal } from "ant-design-vue";
import { useAgentsStore } from "@/stores/agents";
import { useModelsStore } from "@/stores/models";
import { Grid } from "ant-design-vue";
import AvatarUpload from "@/components/common/AvatarUpload.vue";
import mcpApi from "@/api/mcp.js";
import { getModels } from "@/api/models.js";
import {
  QuestionCircleOutlined,
  RobotOutlined,
  EyeOutlined,
  ReloadOutlined,
} from "@ant-design/icons-vue";

// 響應式斷點
const { useBreakpoint } = Grid;
const screens = useBreakpoint();

// 響應式計算屬性
const isMobile = computed(() => !screens.value.md);

// 動態樣式計算（僅保留必要的內聯樣式）
const responsiveStyles = computed(() => ({
  // 移除大部分內聯樣式，改用 CSS 類和響應式布局
}));

// Store
const agentsStore = useAgentsStore();
const modelsStore = useModelsStore();

// 響應式數據
const searchText = ref("");
const filterCategory = ref();
const filterStatus = ref();
const modalVisible = ref(false);
const formRef = ref();

// 添加 MCP 服務相關的響應式數據
const mcpServices = ref([]);
const loadingServices = ref(false);
const selectedServices = ref([]);
const serviceDetailVisible = ref(false);
const selectedServiceDetail = ref(null);

// AI 模型相關
const availableModels = ref([]);
const loadingModels = ref(false);

// 移除緩存，直接從智能體的 tools.mcp_services 讀取

// 分頁
const pagination = computed(() => agentsStore.getPagination);

// 計算屬性
const agents = computed(() => agentsStore.getAllAgents);
const loading = computed(() => agentsStore.isLoading);

// 表單數據
const formData = reactive({
  id: null,
  name: "",
  display_name: "",
  description: "",
  category: "",
  agent_type: "custom",
  system_prompt: "",
  model_id: "",
  avatar: "",
  tags: [],
  capabilities: {},
  tools: {},
  qwen_config: {
    mcp_enabled: true,
    auto_tool_selection: true,
    supported_languages: ["zh-TW", "zh-CN", "en"],
    specialties: ["HR", "Finance", "TaskManagement"],
    model_config: {
      model: "qwen3:32b",
      temperature: 0.7,
      max_tokens: 4096,
    },
    model_config_json:
      '{"model": "qwen3:32b", "temperature": 0.7, "max_tokens": 4096}',
  },
  tool_selection_mode: "manual",
  is_active: true,
  is_public: true,
});

// 表單驗證規則
const formRules = {
  name: [
    { required: true, message: "請輸入智能體名稱" },
    { min: 2, max: 100, message: "智能體名稱長度應在2-100個字符之間" },
  ],
  display_name: [
    { required: true, message: "請輸入顯示名稱" },
    { min: 2, max: 200, message: "顯示名稱長度應在2-200個字符之間" },
  ],
  description: [
    { required: true, message: "請輸入描述" },
    { max: 1000, message: "描述不能超過1000個字符" },
  ],
  system_prompt: [
    { required: true, message: "請輸入系統提示詞" },
    { min: 10, message: "系統提示詞至少需要10個字符" },
  ],
  model_id: [{ required: true, message: "請選擇關聯模型" }],
  category: [{ required: true, message: "請選擇分類" }],
};

// 計算屬性
const modalTitle = computed(() => (formData.id ? "編輯智能體" : "創建智能體"));

const filteredAgents = computed(() => {
  let result = agents.value;

  if (searchText.value) {
    result = result.filter(
      (agent) =>
        (agent.name &&
          agent.name.toLowerCase().includes(searchText.value.toLowerCase())) ||
        (agent.display_name &&
          agent.display_name
            .toLowerCase()
            .includes(searchText.value.toLowerCase())) ||
        (agent.description &&
          agent.description
            .toLowerCase()
            .includes(searchText.value.toLowerCase()))
    );
  }

  if (filterCategory.value) {
    result = result.filter((agent) => agent.category === filterCategory.value);
  }

  if (filterStatus.value) {
    const isActive = filterStatus.value === "active";
    result = result.filter((agent) => agent.is_active === isActive);
  }

  return result;
});

// 獲取智能體的MCP服務顯示文本 - 從 tools.mcp_services 讀取
const getAgentMcpServiceText = (agentId) => {
  // 從智能體列表中找到對應的智能體
  const agent = agents.value.find((a) => a.id === agentId);
  if (!agent) {
    return "載入中...";
  }

  // 從 tools.mcp_services 中獲取服務數量
  if (
    agent.tools &&
    typeof agent.tools === "object" &&
    agent.tools.mcp_services
  ) {
    const count = agent.tools.mcp_services.length;
    return count === 0 ? "未配置" : `${count} 個服務`;
  }

  return "未配置";
};

// 方法
const getCategoryColor = (category) => {
  const colors = {
    general: "default",
    assistant: "blue",
    coding: "green",
    writing: "purple",
    analysis: "orange",
    customer_service: "cyan",
  };
  return colors[category] || "default";
};

const getCategoryName = (category) => {
  const names = {
    general: "通用",
    assistant: "通用助手",
    coding: "編程助手",
    writing: "寫作助手",
    analysis: "分析助手",
    customer_service: "客服助手",
  };
  return names[category] || category;
};

const handleSearch = () => {
  agentsStore.fetchAgentsForAdmin({
    page: 1,
    limit: pagination.value.limit,
    category: filterCategory.value,
    is_active: filterStatus.value,
    search: searchText.value,
  });
};

const handleReset = () => {
  searchText.value = "";
  filterCategory.value = undefined;
  filterStatus.value = undefined;

  // 重新獲取數據
  agentsStore.fetchAgentsForAdmin({
    page: 1,
    limit: pagination.value.limit,
  });
};

const handleAddAgent = () => {
  resetForm();
  modalVisible.value = true;
};

const handleEdit = (record) => {
  // 從 tools.mcp_services 中提取已選中的服務
  let mcpServiceIds = [];
  if (
    record.tools &&
    typeof record.tools === "object" &&
    record.tools.mcp_services
  ) {
    mcpServiceIds = record.tools.mcp_services.map((service) => service.id);
  }

  Object.assign(formData, {
    ...record,
    // 處理 JSON 字段的顯示
    capabilities:
      typeof record.capabilities === "object"
        ? JSON.stringify(record.capabilities, null, 2)
        : record.capabilities || "",
    tools:
      typeof record.tools === "object"
        ? JSON.stringify(record.tools, null, 2)
        : record.tools || "",
    tags: record.tags || [],
    // 處理 model_id
    model_id: record.model_id || null,
    // 處理 Qwen-Agent 相關欄位
    agent_type: record.agent_type || "custom",
    tool_selection_mode: record.tool_selection_mode || "manual",
    qwen_config: {
      mcp_enabled: record.qwen_config?.mcp_enabled ?? true,
      auto_tool_selection: record.qwen_config?.auto_tool_selection ?? true,
      supported_languages: record.qwen_config?.supported_languages || [
        "zh-TW",
        "zh-CN",
        "en",
      ],
      specialties: record.qwen_config?.specialties || [
        "HR",
        "Finance",
        "TaskManagement",
      ],
      model_config: record.qwen_config?.model_config || {
        model: "qwen3:32b",
        temperature: 0.7,
        max_tokens: 4096,
      },
      model_config_json: record.qwen_config?.model_config
        ? JSON.stringify(record.qwen_config.model_config, null, 2)
        : '{"model": "qwen3:32b", "temperature": 0.7, "max_tokens": 4096}',
    },
  });

  // 設置已選中的 MCP 服務
  selectedServices.value = mcpServiceIds;

  modalVisible.value = true;
};

const handleClone = (record) => {
  // 顯示複製確認對話框
  const defaultName = `(複製)${record.display_name || record.name}`;

  // 檢測當前主題
  const isDarkTheme =
    document.documentElement.getAttribute("data-theme") === "dark" ||
    document.documentElement.classList.contains("dark") ||
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  // 根據主題動態設置樣式
  const getThemeStyles = () => {
    if (isDarkTheme) {
      return {
        containerStyle: {
          color: "#e8e8e8",
        },
        inputStyle: {
          width: "100%",
          padding: "8px 12px",
          backgroundColor: "#1f1f1f",
          border: "1px solid #434343",
          borderRadius: "6px",
          color: "#e8e8e8",
          fontSize: "14px",
          outline: "none",
          transition: "border-color 0.2s ease",
        },
        labelStyle: {
          marginBottom: "8px",
          fontSize: "14px",
          color: "#c9c9c9",
        },
      };
    } else {
      return {
        containerStyle: {
          color: "#333",
        },
        inputStyle: {
          width: "100%",
          padding: "8px 12px",
          backgroundColor: "#ffffff",
          border: "1px solid #d9d9d9",
          borderRadius: "6px",
          color: "#333",
          fontSize: "14px",
          outline: "none",
          transition: "border-color 0.2s ease",
        },
        labelStyle: {
          marginBottom: "8px",
          fontSize: "14px",
          color: "#666",
        },
      };
    }
  };

  const themeStyles = getThemeStyles();

  Modal.confirm({
    title: "複製智能體",
    content: h(
      "div",
      {
        style: themeStyles.containerStyle,
      },
      [
        h(
          "p",
          {
            style: themeStyles.labelStyle,
          },
          "請輸入新智能體的名稱："
        ),
        h("input", {
          id: "clone-name-input",
          type: "text",
          value: defaultName,
          style: themeStyles.inputStyle,
          onInput: (e) => {
            e.target.value = e.target.value;
          },
          onFocus: (e) => {
            // 聚焦時的邊框顏色
            e.target.style.borderColor = isDarkTheme ? "#1890ff" : "#40a9ff";
            e.target.style.boxShadow = isDarkTheme
              ? "0 0 0 2px rgba(24, 144, 255, 0.2)"
              : "0 0 0 2px rgba(24, 144, 255, 0.2)";
          },
          onBlur: (e) => {
            // 失焦時恢復邊框顏色
            e.target.style.borderColor = isDarkTheme ? "#434343" : "#d9d9d9";
            e.target.style.boxShadow = "none";
          },
        }),
      ]
    ),
    okText: "確認複製",
    cancelText: "取消",
    onOk: async () => {
      const input = document.getElementById("clone-name-input");
      const newName = input?.value?.trim();

      if (!newName) {
        message.error("請輸入智能體名稱");
        return Promise.reject();
      }

      try {
        await agentsStore.duplicateAgent(record.id, {
          name: newName,
          display_name: newName,
        });
        message.success("智能體複製成功");
      } catch (error) {
        message.error(
          "複製失敗: " + (error.response?.data?.message || error.message)
        );
        return Promise.reject();
      }
    },
  });

  // 延遲一小段時間後自動 focus 到輸入框並選中所有文字
  setTimeout(() => {
    const input = document.getElementById("clone-name-input");
    if (input) {
      input.focus();
      // 選中所有文字，方便用戶直接覆蓋輸入
      input.select();
    }
  }, 100);
};

const handleDelete = async (record) => {
  try {
    await agentsStore.deleteAgent(record.id);
    message.success("智能體刪除成功");
  } catch (error) {
    message.error("刪除失敗");
  }
};

const handleTest = (record) => {
  message.info(`正在測試智能體: ${record.name}`);
  // 這裡可以打開測試對話框
};

// 查看智能體的MCP服務 - 直接打開編輯對話框
const handleViewMcpServices = (agent) => {
  handleEdit(agent);
};

// 移除了 showMcpServicesInfo 方法，現在直接使用編輯對話框

const handleStatusChange = async (record) => {
  record.updating = true;
  try {
    await agentsStore.updateAgentStatus(record.id, record.is_active);
    message.success(`智能體已${record.is_active ? "啟用" : "停用"}`);
  } catch (error) {
    record.is_active = !record.is_active;
    message.error("狀態更新失敗");
  } finally {
    record.updating = false;
  }
};

const handleImport = () => {
  message.info("智能體導入功能開發中");
};

const handlePageChange = (page, pageSize) => {
  // 重新獲取數據
  agentsStore.fetchAgentsForAdmin({
    page,
    limit: pageSize,
    category: filterCategory.value,
    is_active: filterStatus.value,
    search: searchText.value,
  });
};

const handleModalOk = async () => {
  try {
    await formRef.value.validate();

    // 準備提交數據
    const submitData = { ...formData };

    // 處理 model_id，確保是正確的格式
    if (submitData.model_id) {
      submitData.model_id = parseInt(submitData.model_id);
    } else {
      submitData.model_id = null;
    }

    // 處理 JSON 字段
    if (typeof submitData.capabilities === "string") {
      try {
        submitData.capabilities = JSON.parse(submitData.capabilities);
      } catch (error) {
        message.error("能力配置 JSON 格式錯誤");
        return;
      }
    }

    if (typeof submitData.tools === "string") {
      try {
        submitData.tools = JSON.parse(submitData.tools);
      } catch (error) {
        message.error("工具配置 JSON 格式錯誤");
        return;
      }
    }

    // 處理 Qwen-Agent 配置
    if (submitData.agent_type === "qwen") {
      // 確保模型配置是正確的 JSON 格式
      try {
        if (submitData.qwen_config.model_config_json) {
          submitData.qwen_config.model_config = JSON.parse(
            submitData.qwen_config.model_config_json
          );
        }
        // 移除臨時的 JSON 字符串字段
        delete submitData.qwen_config.model_config_json;
      } catch (error) {
        message.error("Qwen 模型配置 JSON 格式錯誤");
        return;
      }
    } else {
      // 如果不是 Qwen-Agent，清空 qwen_config
      submitData.qwen_config = null;
    }

    // 將選中的 MCP 服務添加到 tools 字段（後端會自動處理關聯表）
    if (selectedServices.value.length > 0) {
      const selectedMcpServices = mcpServices.value.filter((service) =>
        selectedServices.value.includes(service.id)
      );

      submitData.tools = {
        ...submitData.tools,
        mcp_services: selectedMcpServices.map((service) => ({
          id: service.id,
          name: service.name,
          description: service.description,
          tools: service.tools || [],
        })),
      };
    } else {
      // 如果沒有選中任何服務，確保清空 mcp_services
      submitData.tools = {
        ...submitData.tools,
        mcp_services: [],
      };
    }

    let agentId;
    if (submitData.id) {
      // 編輯智能體
      await agentsStore.updateAgent(submitData.id, submitData);
      agentId = submitData.id;
      message.success("智能體更新成功");
    } else {
      // 創建智能體
      const result = await agentsStore.createAgent(submitData);
      agentId = result.id;
      message.success("智能體創建成功");
    }

    // MCP 服務信息會通過 tools.mcp_services 傳遞給後端，後端會自動處理關聯表

    modalVisible.value = false;
    resetForm();

    // 重新獲取數據以顯示最新的頭像
    await agentsStore.fetchAgentsForAdmin({
      page: pagination.value.page,
      limit: pagination.value.limit,
      category: filterCategory.value,
      is_active: filterStatus.value,
      search: searchText.value,
    });
  } catch (error) {
    console.error("操作失敗:", error);

    // 顯示詳細的錯誤訊息
    if (error.response?.data?.details) {
      const details = error.response.data.details;
      details.forEach((detail) => {
        message.error(`${detail.path?.join(".")}: ${detail.message}`);
      });
    } else if (error.response?.data?.message) {
      message.error(error.response.data.message);
    } else if (error.message) {
      message.error(error.message);
    } else {
      message.error("操作失敗，請檢查表單內容");
    }
  }
};

const handleModalCancel = () => {
  modalVisible.value = false;
  resetForm();
};

const resetForm = () => {
  Object.assign(formData, {
    id: null,
    name: "",
    display_name: "",
    description: "",
    category: "",
    agent_type: "custom",
    system_prompt: "",
    model_id: null,
    avatar: "",
    tags: [],
    capabilities: {},
    tools: {},
    qwen_config: {
      mcp_enabled: true,
      auto_tool_selection: true,
      supported_languages: ["zh-TW", "zh-CN", "en"],
      specialties: ["HR", "Finance", "TaskManagement"],
      model_config: {
        model: "qwen3:32b",
        temperature: 0.7,
        max_tokens: 4096,
      },
      model_config_json:
        '{"model": "qwen3:32b", "temperature": 0.7, "max_tokens": 4096}',
    },
    tool_selection_mode: "manual",
    is_active: true,
    is_public: true,
  });
  selectedServices.value = [];
};

// 處理頭像變更
const handleAvatarChange = (avatarUrl) => {
  formData.avatar = avatarUrl;
};

// Qwen-Agent 相關處理函數
const handleAgentTypeChange = (value) => {
  if (value === "qwen") {
    // 切換到 Qwen-Agent 時，設置默認配置
    formData.tool_selection_mode = "auto";
    if (!formData.qwen_config.model_config_json) {
      formData.qwen_config.model_config_json =
        '{"model": "qwen3:32b", "temperature": 0.7, "max_tokens": 4096}';
    }
  } else {
    // 切換到自定義 Agent 時，設置為手動模式
    formData.tool_selection_mode = "manual";
  }
};

const handleModelConfigChange = () => {
  try {
    const config = JSON.parse(formData.qwen_config.model_config_json);
    formData.qwen_config.model_config = config;
  } catch (error) {
    console.warn("模型配置 JSON 格式錯誤:", error);
  }
};

// MCP 服務相關方法
const loadMcpServices = async () => {
  loadingServices.value = true;
  try {
    const response = await mcpApi.getSyncedServices();
    if (response.data.success) {
      mcpServices.value = response.data.data;
    } else {
      message.error("加載 MCP 服務失敗");
    }
  } catch (error) {
    console.error("加載 MCP 服務失敗:", error);
    message.error("加載 MCP 服務失敗");
  } finally {
    loadingServices.value = false;
  }
};

const getTotalToolsCount = () => {
  return mcpServices.value.reduce((total, service) => {
    return total + (service.tools || []).length;
  }, 0);
};

const handleServiceToggle = (serviceId, event) => {
  if (event.target.checked) {
    selectedServices.value.push(serviceId);
  } else {
    const index = selectedServices.value.indexOf(serviceId);
    if (index > -1) {
      selectedServices.value.splice(index, 1);
    }
  }
};

const handleSelectAllServices = () => {
  selectedServices.value = mcpServices.value
    .filter((service) => service.is_active)
    .map((service) => service.id);
};

const handleClearAllServices = () => {
  selectedServices.value = [];
};

const handleRefreshServices = async () => {
  await loadMcpServices();
  message.success("MCP 服務列表已刷新");
};

const handleViewServiceDetail = (service) => {
  selectedServiceDetail.value = service;
  serviceDetailVisible.value = true;
};

// 加載智能體的 MCP 服務權限
const loadAgentMcpServices = async (agentId) => {
  if (!agentId) return;

  try {
    const response = await mcpApi.getAgentServices(agentId);
    if (response && response.success && Array.isArray(response.data)) {
      selectedServices.value = response.data.map((item) => item.mcp_service_id);
    } else {
      console.warn("MCP 服務權限資料格式異常:", response);
      selectedServices.value = [];
    }
  } catch (error) {
    console.error("加載智能體 MCP 服務失敗:", error);
    selectedServices.value = [];

    // 如果是 404 錯誤（智能體沒有配置任何 MCP 服務），這是正常的
    if (error.response?.status !== 404) {
      message.warning("載入 MCP 服務權限失敗");
    }
  }
};

// 保存智能體的 MCP 服務權限
const saveAgentMcpServices = async (agentId) => {
  try {
    console.log(
      `[DEBUG] 保存智能體 ${agentId} 的MCP服務:`,
      selectedServices.value
    );
    // 使用批量更新 API，會自動處理添加和移除
    const response = await mcpApi.batchUpdateAgentServices(
      agentId,
      selectedServices.value
    );
    console.log(`[DEBUG] MCP服務保存響應:`, response);
    return response;
  } catch (error) {
    console.error("保存智能體 MCP 服務失敗:", error);
    throw error;
  }
};

// 載入 AI 模型
const loadModels = async () => {
  loadingModels.value = true;
  try {
    const response = await getModels();

    if (response && response.success) {
      // 檢查響應數據結構 - 後端返回的格式是 { success: true, data: [...] }
      const allModels = response.data || [];
      // 只顯示已啟用的模型
      const activeModels = allModels.filter((model) => model.is_active);
      availableModels.value = activeModels;

      if (activeModels.length === 0) {
        console.warn("沒有找到已啟用的 AI 模型");
      }
    } else {
      console.error("API 響應失敗:", response);
      // 如果是認證錯誤，不顯示錯誤消息（會由攔截器處理）
      if (response?.status !== 401) {
        message.error("載入 AI 模型失敗: " + (response?.message || "未知錯誤"));
      }
    }
  } catch (error) {
    console.error("載入 AI 模型失敗:", error);

    // 如果是認證錯誤，不顯示錯誤消息
    if (error.response?.status !== 401) {
      message.error(
        "載入 AI 模型失敗: " + (error.response?.data?.message || error.message)
      );
    }
  } finally {
    loadingModels.value = false;
  }
};

// 移除複雜的預載邏輯，改為按需載入

// 生命週期
onMounted(async () => {
  try {
    // 初始化智能體數據、MCP 服務數據和 AI 模型數據
    await Promise.all([
      agentsStore.fetchAgentsForAdmin(),
      loadMcpServices(),
      loadModels(),
    ]);
  } catch (error) {
    console.error("載入數據失敗:", error);
    message.error("載入數據失敗");
  }
});
</script>

<style scoped>
/* 複製智能體輸入框樣式 - 現在使用動態內聯樣式 */
/* 這些樣式已被動態內聯樣式取代，保留註釋作為參考 */

/* MCP 服務選擇器樣式 */
.mcp-services-selector {
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 16px;
  background: #fafafa;
}

/* 響應式 MCP 服務區域 - 小螢幕時縮小間距 */
@media (max-width: 768px) {
  .mcp-services-selector {
    padding: 12px;
  }
}

.services-overview {
  margin-bottom: 16px;
  padding: 12px;
  background: white;
  border-radius: 4px;
  border: 1px solid #f0f0f0;
}

/* 響應式服務概覽 - 小螢幕時縮小間距 */
@media (max-width: 768px) {
  .services-overview {
    padding: 8px;
  }
}

.services-list {
  max-height: 200px;
  overflow-y: auto;
  background: white;
  border-radius: 4px;
  border: 1px solid #f0f0f0;
}

/* 響應式服務列表 - 小螢幕時增加高度 */
@media (max-width: 768px) {
  .services-list {
    max-height: 250px;
  }
}

.service-item {
  border-bottom: 1px solid #f0f0f0;
}

.service-item:last-child {
  border-bottom: none;
}

.service-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.service-name {
  font-weight: 500;
}

.service-description p {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #666;
}

.service-tools {
  margin-top: 8px;
}

.batch-actions {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.tools-detail .tool-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.tool-usage {
  font-size: 12px;
  color: #666;
}

/* 暗黑模式適配 */
:root[data-theme="dark"] .mcp-services-selector {
  background: rgba(255, 255, 255, 0.04);
  border-color: #434343;
}

:root[data-theme="dark"] .services-overview,
:root[data-theme="dark"] .services-list {
  background: rgba(255, 255, 255, 0.04);
  border-color: #434343;
}

:root[data-theme="dark"] .service-description p {
  color: rgba(255, 255, 255, 0.65);
}

/* 智能體卡片樣式 */
.agents-grid .agent-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.agents-grid .agent-card .ant-card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.agents-grid .agent-card .ant-card-meta {
  flex: 1;
}

.agent-description {
  height: 2.4em;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.2;
  cursor: pointer;
  color: rgba(0, 0, 0, 0.65);
}

:root[data-theme="dark"] .agent-description {
  color: rgba(255, 255, 255, 0.65);
}

.agent-avatar {
  padding: 24px;
  text-align: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.avatar-container {
  position: relative;
  display: inline-block;
}

.status-indicator {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border: 2px solid #ffffff;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ff4d4f;
  transition: background-color 0.3s ease;
}

.status-indicator.active .status-dot {
  background: #52c41a;
}

.agent-card.disabled {
  opacity: 0.6;
}

.agent-stats {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
}

.stat-item:last-child {
  margin-bottom: 0;
}

.stat-label {
  color: #666;
  font-weight: 500;
}

.stat-value {
  color: #1890ff;
  font-weight: 600;
}

.stat-value.model-name {
  color: #722ed1;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stat-value.model-name.clickable {
  cursor: pointer;
  transition: color 0.3s ease;
}

.stat-value.model-name.clickable:hover {
  color: #531dab;
}

.stat-value.mcp-service {
  color: #13c2c2;
  cursor: pointer;
  transition: color 0.3s ease;
}

.stat-value.mcp-service:hover {
  color: #08979c;
}

/* 暗黑模式適配 */
:root[data-theme="dark"] .agent-avatar {
  background: linear-gradient(135deg, #2a2a2a 0%, #3c3c3c 100%);
}

:root[data-theme="dark"] .agent-stats {
  border-top-color: #434343;
}

:root[data-theme="dark"] .stat-label {
  color: rgba(255, 255, 255, 0.65);
}

:root[data-theme="dark"] .status-indicator {
  background: rgba(0, 0, 0, 0.7);
  border-color: #434343;
}

/* 智能體卡片樣式 */
.agents-grid .agent-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.agents-grid .agent-card .ant-card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.agents-grid .agent-card .ant-card-meta {
  flex: 1;
}

.agent-description {
  height: 2.4em;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.2;
  cursor: pointer;
  color: rgba(0, 0, 0, 0.65);
}

:root[data-theme="dark"] .agent-description {
  color: rgba(255, 255, 255, 0.65);
}

.agent-avatar {
  padding: 24px;
  text-align: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

/* 響應式頭像區域 - 小螢幕時縮小間距 */
@media (max-width: 768px) {
  .agent-avatar {
    padding: 16px;
  }
}

.avatar-container {
  position: relative;
  display: inline-block;
}

.status-indicator {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border: 2px solid #ffffff;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ff4d4f;
  transition: background-color 0.3s ease;
}

.status-indicator.active .status-dot {
  background: #52c41a;
}

.agent-card.disabled {
  opacity: 0.6;
}

.agent-stats {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
}

.stat-item:last-child {
  margin-bottom: 0;
}

.stat-label {
  color: #666;
  font-weight: 500;
}

.stat-value {
  color: #1890ff;
  font-weight: 600;
}

.stat-value.model-name {
  color: #722ed1;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 響應式文字大小 - 小螢幕時縮小 */
@media (max-width: 768px) {
  .stat-item {
    font-size: 12px;
  }

  .stat-value.model-name {
    max-width: 80px;
  }
}

.stat-value.model-name.clickable {
  cursor: pointer;
  transition: color 0.3s ease;
}

.stat-value.model-name.clickable:hover {
  color: #531dab;
}

.stat-value.mcp-service {
  color: #13c2c2;
  cursor: pointer;
  transition: color 0.3s ease;
}

.stat-value.mcp-service:hover {
  color: #08979c;
}

/* 表單區域響應式樣式 */
.avatar-upload-section {
  text-align: center;
}

/* 響應式表單佈局 - 小螢幕時調整 */
@media (max-width: 768px) {
  .avatar-upload-section {
    margin-bottom: 16px;
  }
}

/* Qwen-Agent 配置區域樣式 */
.qwen-config-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin: 16px 0;
  border: 1px solid #e8e8e8;
}

.qwen-config-section .ant-divider {
  margin: 0 0 16px 0;
}

/* 暗黑模式下的 Qwen 配置區域 */
:root[data-theme="dark"] .qwen-config-section {
  background: #1a1a1a;
  border-color: #434343;
}

/* 暗黑模式適配 */
:root[data-theme="dark"] .agent-avatar {
  background: linear-gradient(135deg, #2a2a2a 0%, #3c3c3c 100%);
}

:root[data-theme="dark"] .agent-stats {
  border-top-color: #434343;
}

:root[data-theme="dark"] .stat-label {
  color: rgba(255, 255, 255, 0.65);
}

:root[data-theme="dark"] .status-indicator {
  background: rgba(0, 0, 0, 0.7);
  border-color: #434343;
}
</style>

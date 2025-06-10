<template>
  <div class="chat-area">
    <!-- 聊天頭部 -->
    <div class="chat-area-header">
      <div class="conversation-info">
        <!-- 智能體信息 -->
        <div
          v-if="agent"
          class="agent-info">
          <div class="agent-avatar">
            <!-- 如果有 base64 avatar，直接顯示圖片 -->
            <img
              v-if="
                agent.avatar &&
                typeof agent.avatar === 'string' &&
                agent.avatar.startsWith('data:')
              "
              :src="agent.avatar"
              :alt="agent.name"
              class="avatar-image" />
            <!-- 沒有 avatar 時使用漸變背景 -->
            <div
              v-else
              class="avatar-bg"
              :style="{
                background:
                  agent.gradient ||
                  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }">
              <svg
                v-if="agent.icon"
                class="agent-icon"
                viewBox="0 0 24 24"
                width="20"
                height="20">
                <path
                  fill="white"
                  :d="agent.icon" />
              </svg>
              <span
                v-else
                class="agent-initial"
                >{{ agent.display_name.charAt(0) }}</span
              >
            </div>
          </div>
          <div class="agent-details">
            <h3 class="agent-name">{{ agent.display_name }}</h3>
            <p class="agent-description">{{ agent.description }}</p>
          </div>
        </div>

        <!-- 對話信息 -->
        <div
          v-else
          class="conversation-title-section">
          <h3 class="conversation-title">
            {{ chatStore.currentConversation?.title || "新對話" }}
          </h3>
          <div class="conversation-meta">
            <span class="message-count">
              {{ chatStore.messages.length }} 條消息
            </span>
            <span class="last-active">
              最後活動:
              {{ formatTime(chatStore.currentConversation?.updated_at) }}
            </span>
          </div>
        </div>
      </div>

      <!-- 模型選擇和設置 -->
      <div class="chat-controls">
        <!-- 串流模式切換 -->
        <a-tooltip
          title="啟用後將使用類似 ChatGPT 的逐字顯示效果"
          :arrow="false"
          placement="bottom">
          <a-switch
            v-model:checked="useStreamMode"
            checked-children="串流"
            un-checked-children="普通"
            class="stream-toggle" />
        </a-tooltip>

        <!-- 調試面板切換 -->
        <a-tooltip
          title="開發調試面板"
          :arrow="false"
          placement="bottom">
          <a-button
            type="text"
            @click="showDebugPanel = !showDebugPanel"
            :class="{ 'debug-active': showDebugPanel }">
            <BugOutlined />
          </a-button>
        </a-tooltip>

        <a-dropdown
          :trigger="['click']"
          placement="bottomRight">
          <a-tooltip
            title="聊天設置"
            :arrow="false"
            placement="bottom">
            <a-button type="text">
              <SettingOutlined />
            </a-button>
          </a-tooltip>
          <template #overlay>
            <a-menu>
              <a-menu-item @click="handleShowSettings">
                <SettingOutlined />
                聊天設置
              </a-menu-item>
              <a-menu-item @click="handleExportConversation">
                <ExportOutlined />
                導出對話
              </a-menu-item>
              <a-menu-item @click="handleClearMessages">
                <ClearOutlined />
                清空消息
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>
    </div>

    <!-- 消息列表區域 -->
    <div
      class="messages-container"
      ref="messagesContainer"
      :style="{ height: `calc(100% - ${inputAreaHeight}px)` }"
      @scroll="handleScrollToLoadMore">
      <a-spin
        :spinning="loading"
        tip="載入消息中...">
        <!-- 載入更多指示器（在頂部） -->
        <div
          v-if="hasMoreMessages && isLoadingMoreMessages"
          class="load-more-indicator">
          <a-spin size="small" />
          <span>載入更多歷史消息...</span>
        </div>

        <!-- 手動載入更多按鈕（可選） -->
        <div
          v-if="hasMoreMessages && !isLoadingMoreMessages"
          class="load-more-button">
          <a-button
            type="dashed"
            size="small"
            @click="handleLoadMoreMessages"
            :loading="isLoadingMoreMessages">
            載入更多歷史消息 ({{
              chatStore.messagePagination.total - chatStore.messages.length
            }}
            條)
          </a-button>
        </div>

        <!-- 空狀態 -->
        <div
          v-if="chatStore.messages.length === 0"
          class="empty-messages">
          <div class="empty-content">
            <div class="empty-icon">
              <div
                class="agent-avatar-large"
                v-if="agent">
                <!-- 如果有 base64 avatar，直接顯示圖片 -->
                <img
                  v-if="
                    agent.avatar &&
                    typeof agent.avatar === 'string' &&
                    agent.avatar.startsWith('data:')
                  "
                  :src="agent.avatar"
                  :alt="agent.name"
                  class="avatar-image-large" />
                <!-- 沒有 avatar 時使用漸變背景 -->
                <div
                  v-else
                  class="avatar-bg"
                  :style="{
                    background:
                      agent.gradient ||
                      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  }">
                  <svg
                    v-if="agent.icon"
                    class="agent-icon"
                    viewBox="0 0 24 24"
                    width="32"
                    height="32">
                    <path
                      fill="white"
                      :d="agent.icon" />
                  </svg>
                  <span
                    v-else
                    class="agent-initial"
                    >{{ agent.display_name.charAt(0) }}</span
                  >
                </div>
              </div>
              <MessageOutlined v-else />
            </div>
            <h3>
              {{ agent ? `與 ${agent.display_name} 開始對話` : "開始對話" }}
            </h3>
            <p>
              {{
                agent
                  ? `${agent.name} 專精於 ${agent.tags?.join("、")}`
                  : "向 AI 助手發送消息開始對話"
              }}
            </p>

            <!-- 快速提示 -->
            <div class="quick-prompts">
              <a-button
                v-for="prompt in getQuickPrompts()"
                :key="prompt.id"
                type="dashed"
                size="small"
                @click="handleQuickPrompt(prompt.text)">
                {{ prompt.text }}
              </a-button>
            </div>
          </div>
        </div>

        <!-- 消息列表 -->
        <div
          v-else
          class="messages-list">
          <MessageBubble
            v-for="message in chatStore.messages"
            :key="message.id"
            :message="message"
            :show-status="message.id === lastSentMessageId"
            @quote-message="handleQuoteMessage"
            @regenerate-response="handleRegenerateResponse" />

          <!-- AI 輸入狀態指示器 -->
          <div
            v-if="chatStore.aiTyping && !hasStartedReceivingAIResponse"
            class="typing-indicator">
            <div class="typing-bubble">
              <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span class="typing-text"
                >{{
                  agent?.display_name || agent?.name || "AI"
                }}
                正在思考中...</span
              >
            </div>
          </div>

          <!-- 停止對話按鈕 -->
          <div
            v-if="isAIResponding"
            class="stop-stream-container">
            <a-button
              type="default"
              danger
              @click="handleStopStream"
              class="stop-stream-button">
              <template #icon>
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="currentColor">
                  <rect
                    x="6"
                    y="6"
                    width="12"
                    height="12"
                    rx="2" />
                </svg>
              </template>
              停止對話
            </a-button>
          </div>
        </div>
      </a-spin>
    </div>

    <!-- 可拖拉的分隔線 -->
    <div
      class="resize-handle"
      @mousedown="handleResizeStart"
      :class="{ 'is-resizing': isResizing }">
      <div class="resize-indicator">
        <div class="resize-dots"></div>
      </div>
    </div>

    <!-- 調試面板 - 右側固定 -->
    <div
      v-if="showDebugPanel"
      class="debug-panel-sidebar">
      <div class="debug-header">
        <h4>🐛 調試</h4>
        <a-button
          type="text"
          size="small"
          @click="showDebugPanel = false">
          <CloseOutlined />
        </a-button>
      </div>
      <div class="debug-content">
        <a-row :gutter="[16, 8]">
          <a-col :span="24">
            <div class="debug-item">
              <label>當前模型:</label>
              <span class="debug-value">{{ getSelectedModelInfo() }}</span>
            </div>
          </a-col>
          <a-col :span="24">
            <div class="debug-item">
              <label>模型端點:</label>
              <span class="debug-value mono">{{ getModelEndpoint() }}</span>
            </div>
          </a-col>
          <a-col :span="24">
            <div class="debug-item">
              <label>後端 API:</label>
              <span class="debug-value mono">{{ configStore.apiBaseUrl }}</span>
            </div>
          </a-col>
          <a-col :span="16">
            <div class="debug-item">
              <label>對話模式:</label>
              <span class="debug-value">{{
                useStreamMode ? "串流模式" : "普通模式"
              }}</span>
            </div>
          </a-col>

          <a-col :span="12">
            <div class="debug-item">
              <label>當前智能體:</label>
              <span class="debug-value">{{ agent?.display_name || "無" }}</span>
            </div>
          </a-col>

          <a-col :span="12">
            <div class="debug-item">
              <label>消息數量:</label>
              <span class="debug-value">{{ chatStore.messages.length }}</span>
            </div>
          </a-col>
          <a-col :span="12">
            <div class="debug-item">
              <label>Temperature:</label>
              <span class="debug-value">{{ chatSettings.temperature }}</span>
            </div>
          </a-col>
          <a-col :span="12">
            <div class="debug-item">
              <label>Max Tokens:</label>
              <span class="debug-value">{{ chatSettings.maxTokens }}</span>
            </div>
          </a-col>
          <a-col :span="24">
            <div class="debug-item">
              <label>系統提示詞:</label>
              <div class="debug-value system-prompt">
                {{ chatSettings.systemPrompt || "無自定義系統提示詞" }}
              </div>
            </div>
          </a-col>
          <a-col :span="24">
            <div class="debug-item">
              <label>最後發送狀態:</label>
              <div class="debug-status">
                <a-tag :color="sending ? 'processing' : 'default'">
                  {{ sending ? "發送中" : "待命" }}
                </a-tag>
                <a-tag :color="isStreaming ? 'processing' : 'default'">
                  {{ isStreaming ? "串流中" : "非串流" }}
                </a-tag>
                <a-tag :color="chatStore.aiTyping ? 'processing' : 'default'">
                  {{ chatStore.aiTyping ? "AI 回應中" : "AI 待命" }}
                </a-tag>
              </div>
            </div>
          </a-col>
        </a-row>
      </div>
    </div>

    <!-- 消息輸入區域 -->
    <div
      class="message-input-area"
      :style="{ height: `${inputAreaHeight}px` }">
      <!-- 引用消息顯示 -->
      <div
        v-if="quotedMessage"
        class="quoted-message-display">
        <div class="quote-content">
          <div class="quote-header">
            <UserOutlined v-if="quotedMessage.role === 'user'" />
            <RobotOutlined v-else />
            <span
              >回覆
              {{
                quotedMessage.role === "user" ? "用戶" : agent?.name || "AI助手"
              }}</span
            >
          </div>
          <div class="quote-text">
            {{ getQuotePreview(quotedMessage.content) }}
          </div>
        </div>
        <a-button
          type="text"
          size="small"
          @click="handleCancelQuote">
          <CloseOutlined />
        </a-button>
      </div>

      <!-- 輸入框 -->
      <div class="input-container">
        <div
          class="input-wrapper"
          :class="{ 'drag-over': isDragOver }"
          @dragover="handleDragOver"
          @dragleave="handleDragLeave"
          @drop="handleDrop">
          <!-- 調整大小按鈕 -->
          <div class="resize-buttons">
            <a-tooltip
              title="放大輸入區域"
              placement="topLeft"
              :arrow="false">
              <a-button
                type="text"
                size="small"
                @click="handleExpandInput"
                :disabled="inputAreaHeight >= maxInputHeight"
                class="resize-btn">
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14">
                  <path
                    fill="currentColor"
                    d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                </svg>
              </a-button>
            </a-tooltip>
            <a-tooltip
              title="縮小輸入區域"
              placement="topLeft"
              :arrow="false">
              <a-button
                type="text"
                size="small"
                @click="handleShrinkInput"
                :disabled="inputAreaHeight <= minInputHeight"
                class="resize-btn">
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14">
                  <path
                    fill="currentColor"
                    d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                </svg>
              </a-button>
            </a-tooltip>
          </div>

          <!-- 檔案分析卡片 -->
          <FileAnalysisCard
            v-if="showFileAnalysisCard && currentFileInfo"
            :file-info="currentFileInfo"
            @close="showFileAnalysisCard = false"
            class="inline-file-analysis" />

          <!-- 預覽檔案縮圖 -->
          <div
            v-if="previewFiles.length > 0"
            class="preview-files-container">
            <div class="preview-files-list">
              <div
                v-for="file in previewFiles"
                :key="file.id"
                class="preview-file-wrapper">
                <!-- 預覽卡片 -->
                <div class="preview-file-item">
                  <!-- 移除按鈕（放在卡片右上角） -->
                  <a-button
                    type="text"
                    size="small"
                    @click.stop="handleRemovePreviewFile(file.id)"
                    class="card-remove-btn">
                    <CloseOutlined />
                  </a-button>

                  <!-- 檔案縮圖 -->
                  <div
                    class="file-thumbnail"
                    :class="{
                      clickable:
                        file.preview && file.mimeType.startsWith('image/'),
                    }"
                    @click="handlePreviewImage(file)">
                    <!-- 圖片檔案顯示預覽 -->
                    <img
                      v-if="file.preview"
                      :src="file.preview"
                      :alt="file.filename"
                      class="thumbnail-image" />
                    <!-- 非圖片檔案顯示圖示 -->
                    <div
                      v-else
                      class="thumbnail-icon">
                      <FileImageOutlined />
                    </div>
                    <!-- 放大鏡圖示（僅圖片顯示） -->
                    <div
                      v-if="file.preview && file.mimeType.startsWith('image/')"
                      class="zoom-icon">
                      <svg
                        viewBox="0 0 24 24"
                        width="12"
                        height="12"
                        fill="white">
                        <path
                          d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                        <path d="M12 10h-2v2H9v-2H7V9h2V7h1v2h2v1z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <!-- 解釋此圖按鈕（放在卡片下方，僅圖片顯示） -->
                <div
                  v-if="file.preview && file.mimeType.startsWith('image/')"
                  class="image-actions">
                  <a-button
                    type="text"
                    size="small"
                    @click="handleExplainImage(file)"
                    class="explain-btn">
                    <EyeOutlined />
                    解釋此圖
                  </a-button>
                </div>
              </div>
            </div>
          </div>

          <!-- 拖拉提示覆蓋層 -->
          <div
            v-if="isDragOver"
            class="drag-overlay">
            <div class="drag-content">
              <FileImageOutlined class="drag-icon" />
              <div class="drag-text">拖放檔案到這裡</div>
              <div class="drag-subtext">支援圖片、文件等多種格式</div>
            </div>
          </div>

          <a-textarea
            ref="messageInput"
            :value="messageText"
            @input="
              (e) => {
                messageText = e.target.value;
                handleInputChange(e);
              }
            "
            @paste="handlePaste"
            :placeholder="`向 ${agent?.name || 'AI助手'} 發送消息... (Shift+Enter 換行，Enter 發送，支援拖拉或貼上檔案)`"
            :auto-size="false"
            :disabled="sending"
            @keydown="handleKeyDown"
            :style="{ height: `${textareaHeight}px` }"
            class="message-input" />

          <!-- 輸入工具欄 -->
          <div class="input-toolbar">
            <div class="toolbar-left">
              <!-- 模型選擇器 -->
              <ModelSelector
                v-model:modelValue="selectedModel"
                @change="handleModelChange" />

              <!-- 新對話按鈕 -->
              <a-button
                type="text"
                size="small"
                @click="handleCreateNewConversation"
                :loading="creatingNewConversation">
                <PlusOutlined />
                新對話
              </a-button>

              <!-- 即時渲染切換 -->
              <a-tooltip
                :title="
                  configStore.chatSettings.useRealtimeRender
                    ? '當前：即時渲染模式 - 串流過程中即時顯示內容'
                    : '當前：等待渲染模式 - 串流結束後一次性渲染'
                "
                placement="top">
                <a-button
                  type="text"
                  size="small"
                  @click="handleToggleRealtimeRender"
                  :class="{
                    'active-toggle': configStore.chatSettings.useRealtimeRender,
                  }">
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="currentColor">
                    <path
                      v-if="configStore.chatSettings.useRealtimeRender"
                      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    <path
                      v-else
                      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z M12 15.4l-3.76 2-0.7-4.2-3-2.9 4.2-0.6L12 6.1l1.9 3.8 4.2 0.6-3 2.9-0.7 4.2L12 15.4z" />
                  </svg>
                  {{
                    configStore.chatSettings.useRealtimeRender ? "即時" : "等待"
                  }}
                </a-button>
              </a-tooltip>

              <!-- 思考模式切換 -->
              <a-tooltip
                :title="
                  thinkingMode
                    ? '當前：思考模式開啟 - AI 會顯示思考過程'
                    : '當前：思考模式關閉 - AI 直接輸出結果'
                "
                placement="top">
                <a-button
                  type="text"
                  size="small"
                  @click="handleToggleThinkingMode"
                  :class="{
                    'active-toggle': thinkingMode,
                  }">
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="currentColor">
                    <path
                      v-if="thinkingMode"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path
                      v-else
                      d="M8 12.5c0 .41.34.75.75.75h2.5v2.5c0 .41.34.75.75.75s.75-.34.75-.75v-2.5h2.5c.41 0 .75-.34.75-.75s-.34-.75-.75-.75h-2.5v-2.5c0-.41-.34-.75-.75-.75s-.75.34-.75.75v2.5h-2.5c-.41 0-.75.34-.75.75zm-6 0c0 5.52 4.48 10 10 10s10-4.48 10-10S17.52 2.5 12 2.5 2 6.98 2 12.5z" />
                  </svg>
                  {{ thinkingMode ? "思考" : "直出" }}
                </a-button>
              </a-tooltip>

              <!-- 預覽後上傳 -->
              <a-tooltip placement="top">
                <template #title>
                  <span v-html="uploadDescription"></span>
                </template>
                <a-upload
                  :show-upload-list="false"
                  :before-upload="handleFilePreview"
                  accept="*/*">
                  <a-button
                    type="text"
                    size="small">
                    <PaperClipOutlined />
                  </a-button>
                </a-upload>
              </a-tooltip>

              <!-- 表情符號 -->
              <a-button
                type="text"
                size="small"
                @click="handleShowEmoji">
                <SmileOutlined />
              </a-button>
            </div>

            <div class="toolbar-right">
              <!-- 字數統計 -->
              <!-- <span class="char-count">{{ messageText.length }}</span> -->

              <!-- 發送按鈕 -->
              <a-button
                type="primary"
                :loading="sending"
                :disabled="!messageText.trim() && previewFiles.length === 0"
                @click="handleSendMessage"
                class="send-button">
                <SendOutlined />
              </a-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 智能體選單 -->
    <div
      v-if="showAgentMenu"
      class="agent-mention-menu"
      :style="{
        position: 'fixed',
        top: agentMenuPosition.top + 'px',
        left: agentMenuPosition.left + 'px',
        zIndex: 1000,
      }">
      <div class="agent-menu-list">
        <div
          v-for="agent in availableAgents"
          :key="agent.id"
          class="agent-menu-item"
          @click="handleSelectAgent(agent)">
          <div class="agent-avatar-small">
            <!-- 如果有 base64 avatar，直接顯示圖片 -->
            <img
              v-if="
                agent.avatar &&
                typeof agent.avatar === 'string' &&
                agent.avatar.startsWith('data:')
              "
              :src="agent.avatar"
              :alt="agent.name"
              class="avatar-image-small" />
            <!-- 沒有 avatar 時使用漸變背景和首字母 -->
            <span
              v-else
              class="agent-initial-small">
              {{
                agent.display_name?.charAt(0) || agent.name?.charAt(0) || "?"
              }}
            </span>
          </div>
          <div class="agent-info-small">
            <div class="agent-name-small">{{ agent.display_name }}</div>
            <div class="agent-desc-small">{{ agent.description }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 圖片預覽模態框 -->
    <a-modal
      v-model:open="imagePreviewVisible"
      :title="null"
      :footer="null"
      width="30%"
      centered
      class="image-preview-modal">
      <div
        v-if="currentPreviewImage"
        class="image-preview-content">
        <img
          :src="currentPreviewImage.url"
          :alt="currentPreviewImage.filename"
          class="preview-image" />
      </div>
    </a-modal>

    <!-- 聊天設置模態框 -->
    <a-modal
      v-model:open="settingsModalVisible"
      title="聊天設置"
      @ok="handleSaveSettings"
      @cancel="handleCancelSettings">
      <a-form layout="vertical">
        <a-form-item label="溫度 (創造性)">
          <a-slider
            v-model:value="chatSettings.temperature"
            :min="0"
            :max="2"
            :step="0.1"
            :marks="{ 0: '保守', 1: '平衡', 2: '創新' }" />
        </a-form-item>

        <a-form-item label="最大回應長度">
          <a-input-number
            v-model:value="chatSettings.maxTokens"
            :min="100"
            :max="16384"
            style="width: 100%" />
        </a-form-item>

        <a-form-item label="系統提示詞">
          <div style="display: flex; flex-direction: column; gap: 8px">
            <div
              style="
                display: flex;
                justify-content: space-between;
                align-items: center;
              ">
              <span
                style="font-size: 14px; color: var(--custom-text-secondary)">
                {{
                  props.agent
                    ? `${props.agent.name} 的系統提示詞`
                    : "全域系統提示詞"
                }}
              </span>
              <a-button
                v-if="props.agent"
                type="link"
                size="small"
                @click="handleResetToDefaultPrompt">
                恢復默認
              </a-button>
            </div>
            <a-textarea
              v-model:value="chatSettings.systemPrompt"
              placeholder="設置 AI 的行為和角色..."
              :rows="14" />
          </div>
        </a-form-item>

        <a-form-item label="字體大小">
          <a-input-number
            v-model:value="chatSettings.fontSize"
            :min="12"
            :max="20"
            :step="1"
            style="width: 100%"
            :formatter="(value) => `${value}px`"
            :parser="(value) => value.replace('px', '')" />
          <div
            style="
              margin-top: 4px;
              font-size: 12px;
              color: var(--custom-text-secondary);
            ">
            調整聊天消息的字體大小 (12-20px)
          </div>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from "vue";
import { message } from "ant-design-vue";
// Icons are globally registered in main.js
import { useChatStore } from "@/stores/chat";
import { useWebSocketStore } from "@/stores/websocket";
import { useConfigStore } from "@/stores/config";
import MessageBubble from "./MessageBubble.vue";
import ModelSelector from "./ModelSelector.vue";
import FileAnalysisCard from "@/components/common/FileAnalysisCard.vue";
import { formatMessageTime } from "@/utils/datetimeFormat";
import {
  getAgentQuickCommands,
  incrementCommandUsage,
} from "@/api/quickCommands";
import { useInfiniteScroll } from "@vueuse/core";

// Store
const chatStore = useChatStore();
const wsStore = useWebSocketStore();
const configStore = useConfigStore();

// 響應式狀態
const loading = ref(false);
const sending = ref(false);
const messageText = ref("");
const showDebugPanel = ref(false);
const quotedMessage = ref(null);
const lastSentMessageId = ref(null);
const messagesContainer = ref(null);
const messageInput = ref(null);
const pendingAttachments = ref([]);
const settingsModalVisible = ref(false);
const showFileAnalysisCard = ref(false);
const currentFileInfo = ref(null);
const showAgentMenu = ref(false);
const agentMenuPosition = ref({ top: 0, left: 0 });
const inputAreaHeight = ref(320); // 增加默認高度以適應新的最小高度
const isResizing = ref(false);
const minInputHeight = 280; // 增加最小高度以適應工具欄和附件
const maxInputHeight = 600;
const creatingNewConversation = ref(false);
const agentQuickCommands = ref([]);
const loadingQuickCommands = ref(false);
const thinkingMode = ref(true); // 默認開啟思考模式
const uploadDescription = `<li>» 文件數量:同時最多 5 個</li>
  <li>» 文件大小: 單個文件大小不超過 20 MB</li>
  <li>» 文件類型: pdf,txt,docs,xlsx,圖片和各類代碼文件格式等</li>`;
// 預覽檔案相關狀態
const previewFiles = ref([]);
const maxPreviewFiles = 5;
const imagePreviewVisible = ref(false);
const currentPreviewImage = ref(null);
const isDragOver = ref(false);

// 無限滾動狀態
const isLoadingMoreMessages = ref(false);
const hasMoreMessages = computed(() => {
  if (!chatStore.messagePagination.total) return false;
  const loaded = chatStore.messages.length;
  return loaded < chatStore.messagePagination.total;
});

// 方案1: 使用 VueUse 的無限滾動 (需要先安裝 @vueuse/core)
const {
  canLoadMore,
  isLoading: infiniteLoading,
  load,
} = useInfiniteScroll(
  messagesContainer,
  async () => {
    if (hasMoreMessages.value && !isLoadingMoreMessages.value) {
      await handleLoadMoreMessages();
    }
  },
  {
    direction: "top", // 向上滾動載入歷史消息
    distance: 100, // 距離頂部100px時觸發
  }
);

// 方案2: 手動實現滾動檢測
const handleScrollToLoadMore = () => {
  if (
    !messagesContainer.value ||
    isLoadingMoreMessages.value ||
    !hasMoreMessages.value
  ) {
    return;
  }

  const { scrollTop } = messagesContainer.value;

  // 當滾動到頂部50px範圍內時載入更多
  if (scrollTop <= 50) {
    handleLoadMoreMessages();
  }
};

// 載入更多歷史消息
const handleLoadMoreMessages = async () => {
  if (
    !chatStore.currentConversation ||
    isLoadingMoreMessages.value ||
    !hasMoreMessages.value
  ) {
    return;
  }

  try {
    isLoadingMoreMessages.value = true;
    console.log("🔄 載入更多歷史消息...");

    // 記錄當前滾動位置
    const currentScrollHeight = messagesContainer.value?.scrollHeight || 0;

    // 載入下一頁
    await chatStore.handleLoadMoreMessages();

    // 恢復滾動位置，避免跳躍
    await nextTick();
    if (messagesContainer.value) {
      const newScrollHeight = messagesContainer.value.scrollHeight;
      const scrollDiff = newScrollHeight - currentScrollHeight;
      messagesContainer.value.scrollTop = scrollDiff;
    }
  } catch (error) {
    console.error("載入更多消息失敗:", error);
    message.error("載入更多消息失敗");
  } finally {
    isLoadingMoreMessages.value = false;
  }
};

// 計算 textarea 的高度
const textareaHeight = computed(() => {
  // 輸入區域總高度 - 引用消息區域高度 - 工具欄高度 - 內邊距 - 附件區域高度
  const quotedHeight = quotedMessage.value ? 60 : 0; // 引用消息區域高度
  const toolbarHeight = 60; // 工具欄高度
  const padding = 48; // 上下內邊距

  // 計算預覽檔案容器高度
  const previewFilesHeight = previewFiles.value.length > 0 ? 80 : 0;

  // 計算檔案分析卡片高度
  const fileAnalysisHeight =
    showFileAnalysisCard.value && currentFileInfo.value ? 120 : 0;

  return Math.max(
    80, // 增加最小 textarea 高度
    inputAreaHeight.value -
      quotedHeight -
      toolbarHeight -
      padding -
      previewFilesHeight -
      fileAnalysisHeight
  );
});

// 判斷是否正在AI回應中
const isAIResponding = computed(() => {
  return (
    sending.value ||
    chatStore.isStreaming ||
    chatStore.isSendingMessage ||
    chatStore.aiTyping
  );
});

// 判斷當前對話是否已開始接收AI回應（用於控制思考狀態）
const hasStartedReceivingAIResponse = computed(() => {
  // 檢查最後一條消息是否是AI回應且是當前發送會話的回應
  const lastMessage = chatStore.messages[chatStore.messages.length - 1];
  const secondLastMessage = chatStore.messages[chatStore.messages.length - 2];

  // 如果最後兩條消息是用戶消息緊接著AI消息，說明已開始接收回應
  if (lastMessage?.role === "assistant" && secondLastMessage?.role === "user") {
    return true;
  }

  // 如果正在串流且有AI消息，說明已開始接收
  if (
    chatStore.isStreaming &&
    chatStore.messages.some(
      (msg) => msg.role === "assistant" && msg.isStreaming
    )
  ) {
    return true;
  }

  return false;
});

// 模型和設置
const selectedModel = ref(null); // 改為存儲完整的模型對象
const selectedModelId = computed(() => selectedModel.value?.id || "");
const availableModels = computed(() => {
  // 動態地從 store 中獲取所有可用模型並平鋪
  const allModels = [];

  if (
    chatStore.availableModels &&
    typeof chatStore.availableModels === "object"
  ) {
    // 遍歷所有 provider
    Object.keys(chatStore.availableModels).forEach((provider) => {
      const models = chatStore.availableModels[provider] || [];
      models.forEach((model) => {
        allModels.push({
          id: model.id,
          name: model.display_name || model.name,
          provider: provider,
          is_active: model.is_active,
          is_default: model.is_default || false,
        });
      });
    });
  }

  return allModels.filter((model) => model.is_active !== false && model.id); // 只顯示可用且有ID的模型
});

const chatSettings = ref({
  temperature: 0.7,
  maxTokens: 8192, // 增加最大token數量
  systemPrompt: "",
  fontSize: 14, // 新增字體大小設置，默認14px
});

// 串流模式狀態
const useStreamMode = ref(true); // 默認啟用串流模式
const isStreaming = ref(false); // 是否正在串流中

// 快速提示
const quickPrompts = ref([
  // { id: 1, text: "你好，請介紹一下自己" },
  // { id: 2, text: "幫我分析這個問題" },
  // { id: 3, text: "請提供一些建議" },
  // { id: 4, text: "解釋一下這個概念" },
]);

// 從 store 中獲取可用智能體
const availableAgents = computed(() => chatStore.availableAgents || []);

// Props
const props = defineProps({
  agent: {
    type: Object,
    default: null,
  },
});

// 方法
const formatTime = formatMessageTime;

const getModelColor = (provider) => {
  const colors = {
    ollama: "blue",
    gemini: "green",
    openai: "purple",
    claude: "orange",
  };
  return colors[provider] || "default";
};

const getQuotePreview = (content) => {
  return content.length > 100 ? content.substring(0, 100) + "..." : content;
};

const findModelById = (modelId) => {
  // 動態地在所有提供商中搜尋指定ID的模型
  if (
    chatStore.availableModels &&
    typeof chatStore.availableModels === "object"
  ) {
    for (const provider of Object.keys(chatStore.availableModels)) {
      const models = chatStore.availableModels[provider] || [];
      const model = models.find((m) => m.id === modelId);
      if (model) return model;
    }
  }
  return null;
};

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTo({
        top: messagesContainer.value.scrollHeight,
        behavior: "smooth",
      });
    }
  });
};

// 滾動到底部的增強版本，確保在消息完全渲染後執行
const scrollToBottomWithDelay = async (delay = 100) => {
  await nextTick();
  // 等待一個短暫延遲確保消息完全渲染
  setTimeout(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTo({
        top: messagesContainer.value.scrollHeight,
        behavior: "smooth",
      });
    }
  }, delay);
};

// 事件處理
const handleModelChange = (model) => {
  // 新的 ModelSelector 組件傳遞完整的模型對象
  if (model && typeof model === "object") {
    selectedModel.value = model;
    console.log("模型已切換:", model.display_name, "ID:", model.id, model);
  } else {
    // 向後兼容：如果傳遞的是 ID，需要找到完整的模型對象
    const fullModel = findModelById(model);
    selectedModel.value = fullModel;
  }
};

const handleSendMessage = async () => {
  if (!messageText.value.trim() && previewFiles.value.length === 0) return;

  // 確保選擇了模型
  if (!selectedModelId.value) {
    message.error("請先選擇 AI 模型");
    return;
  }

  try {
    sending.value = true;

    // 立即設置AI思考狀態
    chatStore.handleSetAITypingStatus(true);

    // 如果沒有當前對話，先創建一個
    let conversationId = chatStore.currentConversation?.id;
    if (!conversationId) {
      const newConversation = await chatStore.handleCreateConversation({
        // 不設置標題，等第一條消息後自動生成
        agent_id: props.agent?.id,
        model_id: selectedModelId.value,
      });
      conversationId = newConversation?.id;
    }

    if (conversationId) {
      let content = messageText.value.trim();

      // 處理思考模式：如果關閉思考模式，在消息前添加 /no_think 前綴
      if (!thinkingMode.value && !content.startsWith("/no_think")) {
        content = "/no_think " + content;
      }

      let finalAttachments = [];

      // 處理預覽檔案上傳
      if (previewFiles.value.length > 0) {
        const { uploadFile } = await import("@/api/files.js");

        for (const previewFile of previewFiles.value) {
          try {
            const response = await uploadFile(previewFile.file);
            if (response.success) {
              finalAttachments.push({
                id: response.data.id,
                filename: response.data.filename,
                file_size: response.data.file_size,
                mime_type: response.data.mime_type,
                file_type: response.data.file_type,
              });
            }
          } catch (error) {
            console.error(`上傳檔案 "${previewFile.filename}" 失敗:`, error);
            message.error(`上傳檔案 "${previewFile.filename}" 失敗`);
          }
        }
      }

      // 合併現有附件和新上傳的附件
      if (pendingAttachments.value.length > 0) {
        finalAttachments = [...finalAttachments, ...pendingAttachments.value];
      }

      const attachments = finalAttachments.length > 0 ? finalAttachments : null;

      // 清空輸入框和重置狀態
      messageText.value = "";
      quotedMessage.value = null;
      pendingAttachments.value = [];
      previewFiles.value = []; // 清空預覽檔案

      if (useStreamMode.value) {
        // 使用串流模式
        console.log("=== 使用串流模式發送消息 ===");
        isStreaming.value = true;

        await chatStore.sendMessageStream(conversationId, content, {
          model_id: selectedModelId.value,
          endpoint_url: selectedModel.value?.endpoint_url,
          temperature: chatSettings.value.temperature,
          max_tokens: chatSettings.value.maxTokens,
          system_prompt: chatSettings.value.systemPrompt,
          attachments: attachments,
        });

        // message.success("串流消息發送成功");
      } else {
        // 使用普通模式
        const result = await chatStore.handleSendMessage(
          conversationId,
          content,
          {
            quotedMessage: quotedMessage.value,
            temperature: chatSettings.value.temperature,
            maxTokens: chatSettings.value.maxTokens,
            model_id: selectedModelId.value,
            endpoint_url: selectedModel.value?.endpoint_url,
            systemPrompt: chatSettings.value.systemPrompt,
            attachments: attachments,
          }
        );

        if (result) {
          lastSentMessageId.value = result.user_message?.id;
          message.success("消息發送成功");
        }
      }

      scrollToBottom();
    }
  } catch (error) {
    const errorMsg = useStreamMode.value ? "串流發送消息失敗" : "發送消息失敗";
    // message.error(`${errorMsg}: ${error.message}`);
    console.error("發送消息失敗:", error);
  } finally {
    sending.value = false;
    isStreaming.value = false;
    // 注意：不在這裡重置aiTyping，讓它在收到回應時自然重置
  }
};

const handleKeyDown = (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    handleSendMessage();
  }
};

const handleInputChange = (event) => {
  // 發送輸入狀態
  wsStore.handleSendTypingStatus(
    chatStore.currentConversation?.id,
    messageText.value.length > 0
  );

  // 檢查是否已經有 @ 提及
  const existingMentions = (messageText.value.match(/@\w+/g) || []).length;

  // 檢查是否輸入了 @
  const cursorPosition = event?.target?.selectionStart || 0;
  const textBeforeCursor = messageText.value.substring(0, cursorPosition);
  const lastAtIndex = textBeforeCursor.lastIndexOf("@");

  if (lastAtIndex !== -1 && existingMentions === 0) {
    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
    // 如果 @ 後面沒有空格且在最後，顯示智能體選單
    if (
      !textAfterAt.includes(" ") &&
      cursorPosition === messageText.value.length
    ) {
      showAgentMenu.value = true;
      // 計算選單位置
      calculateMenuPosition(event.target);
    } else {
      showAgentMenu.value = false;
    }
  } else {
    showAgentMenu.value = false;
  }
};

const calculateMenuPosition = (textarea) => {
  const rect = textarea.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const menuHeight = 200; // 預估選單高度

  // 判斷是否應該顯示在上方
  const shouldShowAbove =
    rect.bottom + menuHeight > viewportHeight && rect.top > menuHeight;

  agentMenuPosition.value = {
    top: shouldShowAbove
      ? rect.top + window.scrollY - menuHeight
      : rect.bottom + window.scrollY,
    left: rect.left + window.scrollX,
  };
};

const handleSelectAgent = (agent) => {
  // 檢查是否已經有 @ 提及，如果有則不允許添加
  const existingMentions = (messageText.value.match(/@\w+/g) || []).length;
  if (existingMentions > 0) {
    message.warning("每條消息只能 @ 一個智能體");
    showAgentMenu.value = false;
    return;
  }

  const cursorPosition =
    messageInput.value?.$el?.querySelector("textarea")?.selectionStart ||
    messageText.value.length;
  const textBeforeCursor = messageText.value.substring(0, cursorPosition);
  const lastAtIndex = textBeforeCursor.lastIndexOf("@");

  if (lastAtIndex !== -1) {
    const textBeforeAt = messageText.value.substring(0, lastAtIndex);
    const textAfterCursor = messageText.value.substring(cursorPosition);
    messageText.value = textBeforeAt + `@${agent.name} ` + textAfterCursor;
  }

  showAgentMenu.value = false;

  // 重新聚焦輸入框
  nextTick(() => {
    if (messageInput.value) {
      messageInput.value.focus();
    }
  });
};

// 載入智能體的快速命令
const loadAgentQuickCommands = async () => {
  if (!props.agent?.id) {
    agentQuickCommands.value = [];
    return;
  }

  try {
    loadingQuickCommands.value = true;
    const commands = await getAgentQuickCommands(props.agent.id);
    console.log("commands", commands);
    agentQuickCommands.value = commands || [];
  } catch (error) {
    console.warn("載入智能體快速命令失敗:", error);
    agentQuickCommands.value = [];
  } finally {
    loadingQuickCommands.value = false;
  }
};

const handleQuickPrompt = async (prompt) => {
  // 如果是對象，提取 text；如果是字符串，直接使用
  const promptText = typeof prompt === "object" ? prompt.text : prompt;
  const commandId = typeof prompt === "object" ? prompt.id : null;

  messageText.value = promptText;

  // 統計使用次數（後台進行，不影響用戶體驗）
  if (commandId) {
    incrementCommandUsage(commandId).catch((error) => {
      console.warn("統計快速命令詞使用次數失敗:", error);
    });
  }

  // Focus 到輸入框
  nextTick(() => {
    if (messageInput.value) {
      messageInput.value.focus();
      // 將游標移到文字末尾
      const textareaEl =
        messageInput.value.$el?.querySelector("textarea") ||
        messageInput.value.$el;
      if (textareaEl && textareaEl.setSelectionRange) {
        textareaEl.setSelectionRange(
          textareaEl.value.length,
          textareaEl.value.length
        );
      }
    }
  });
};

const handleQuoteMessage = (message) => {
  quotedMessage.value = message;
};

const handleCancelQuote = () => {
  quotedMessage.value = null;
};

const handleRegenerateResponse = async (message) => {
  try {
    // await chatStore.handleRegenerateResponse(message.id);
    message.success("重新生成功能開發中");
  } catch (error) {
    message.error("重新生成失敗");
    console.error("重新生成失敗:", error);
  }
};

const handleFileUpload = async (file) => {
  try {
    // 檢查檔案大小 (10MB 限制)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      message.error("檔案大小不能超過 10MB");
      return false;
    }

    // 檢查檔案類型
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "text/csv",
      "text/markdown",
      "text/x-markdown",

      "xlsx",
      "xls",
      "csv",
      "txt",
      "docx",
      "doc",
      "pptx",
      "ts",
      "js",
      "application/json",
      "html",
      "css",
      "xml",
      "yaml",
      "yml",
    ];

    console.log("file.type", file.type);

    if (!allowedTypes.includes(file.type)) {
      message.error("不支援的檔案類型");
      return false;
    }

    // 顯示上傳進度
    let uploadProgressMessage = null;

    // 上傳檔案
    const { uploadFile } = await import("@/api/files.js");
    const response = await uploadFile(file, {
      onProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );

        // 關閉之前的進度消息
        if (uploadProgressMessage) {
          uploadProgressMessage();
        }

        // 顯示新的進度消息
        uploadProgressMessage = message.loading(
          `上傳進度: ${percentCompleted}%`,
          0
        );
      },
    });

    // 關閉進度消息
    if (uploadProgressMessage) {
      uploadProgressMessage();
    }

    if (response.success) {
      const uploadedFile = response.data;

      // 將檔案信息添加到消息中
      const fileAttachment = {
        id: uploadedFile.id,
        filename: uploadedFile.filename,
        file_size: uploadedFile.file_size,
        mime_type: uploadedFile.mime_type,
        file_type: uploadedFile.file_type,
      };

      // 存儲檔案附件信息（用於發送消息時使用）
      if (!pendingAttachments.value) {
        pendingAttachments.value = [];
      }
      pendingAttachments.value.push(fileAttachment);

      // 顯示檔案分析卡片
      showFileAnalysisCard.value = true;
      currentFileInfo.value = uploadedFile;

      // message.success(`檔案 "${uploadedFile.filename}" 上傳成功`);
    } else {
      message.error(response.message || "檔案上傳失敗");
    }
  } catch (error) {
    console.error("檔案上傳失敗:", error);
    message.error("檔案上傳失敗，請稍後重試");
  }

  return false; // 阻止 ant-design-vue 的自動上傳
};

const handleFilePreview = async (file) => {
  try {
    // 檢查檔案數量限制
    if (previewFiles.value.length >= maxPreviewFiles) {
      message.warning(`最多只能預覽 ${maxPreviewFiles} 個檔案`);
      return false;
    }

    // 檢查檔案大小 (20MB 限制)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      message.error("檔案大小不能超過 20MB");
      return false;
    }

    // 檢查檔案類型
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "text/csv",
      "text/markdown",
      "text/x-markdown",
      "application/json",
      "text/javascript",
      "text/css",
      "text/html",
      "application/xml",
      "text/xml",
      "application/x-yaml",
      "text/yaml",
    ];

    if (!allowedTypes.includes(file.type)) {
      message.error("不支援的檔案類型");
      return false;
    }

    // 創建預覽物件
    const previewFile = {
      id: Date.now() + Math.random(), // 臨時ID
      file: file, // 原始檔案物件
      filename: file.name,
      fileSize: file.size,
      mimeType: file.type,
      preview: null, // 預覽圖片 URL
    };

    // 如果是圖片，生成預覽
    if (file.type.startsWith("image/")) {
      try {
        const previewUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        previewFile.preview = previewUrl;
      } catch (error) {
        console.error("生成圖片預覽失敗:", error);
      }
    }

    // 添加到預覽列表
    previewFiles.value.push(previewFile);

    // message.success(`檔案 "${file.name}" 已添加到預覽`);

    // 將焦點設置到輸入框
    nextTick(() => {
      if (messageInput.value) {
        const textareaEl =
          messageInput.value.$el?.querySelector("textarea") ||
          messageInput.value.$el;
        if (textareaEl) {
          textareaEl.focus();
        }
      }
    });
  } catch (error) {
    console.error("檔案預覽失敗:", error);
    message.error("檔案預覽失敗");
  }

  return false; // 阻止自動上傳
};

const handleRemovePreviewFile = (fileId) => {
  previewFiles.value = previewFiles.value.filter((f) => f.id !== fileId);
};

const handleExplainImage = (file) => {
  // 在消息輸入框中添加解釋此圖的文字
  const explainText = "請解釋這張圖片的內容";
  if (messageText.value.trim()) {
    messageText.value += "\n\n" + explainText;
  } else {
    messageText.value = explainText;
  }

  // 將焦點設置到輸入框
  nextTick(() => {
    if (messageInput.value) {
      const textareaEl =
        messageInput.value.$el?.querySelector("textarea") ||
        messageInput.value.$el;
      if (textareaEl) {
        textareaEl.focus();
        // 將游標移到文字末尾
        textareaEl.setSelectionRange(
          textareaEl.value.length,
          textareaEl.value.length
        );
      }
    }
  });
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const handlePreviewImage = (file) => {
  if (file.preview && file.mimeType.startsWith("image/")) {
    currentPreviewImage.value = {
      url: file.preview,
      filename: file.filename,
      fileSize: file.fileSize,
    };
    imagePreviewVisible.value = true;
  }
};

// 拖拉檔案處理
const handleDragOver = (e) => {
  e.preventDefault();
  e.stopPropagation();
  isDragOver.value = true;
};

const handleDragLeave = (e) => {
  e.preventDefault();
  e.stopPropagation();
  // 只有當離開整個輸入區域時才設為 false
  if (!e.currentTarget.contains(e.relatedTarget)) {
    isDragOver.value = false;
  }
};

const handleDrop = async (e) => {
  e.preventDefault();
  e.stopPropagation();
  isDragOver.value = false;

  const files = Array.from(e.dataTransfer.files);

  for (const file of files) {
    await handleFilePreview(file);
  }
};

// 貼上檔案處理
const handlePaste = async (e) => {
  const items = Array.from(e.clipboardData.items);

  for (const item of items) {
    if (item.kind === "file") {
      e.preventDefault();
      const file = item.getAsFile();
      if (file) {
        await handleFilePreview(file);
      }
    }
  }
};

const handleShowEmoji = () => {
  message.info("表情符號功能開發中");
};

const handleShowSettings = () => {
  // 載入智能體特定的系統提示詞
  loadAgentSystemPrompt();
  settingsModalVisible.value = true;
};

const handleSaveSettings = () => {
  // 保存基本聊天設置到本地存儲（排除系統提示詞）
  const basicSettings = {
    temperature: chatSettings.value.temperature,
    maxTokens: chatSettings.value.maxTokens,
    fontSize: chatSettings.value.fontSize,
  };
  localStorage.setItem("chat_settings", JSON.stringify(basicSettings));

  // 如果有選中的智能體，保存該智能體特定的系統提示詞
  if (props.agent && props.agent.id) {
    const agentSettings = JSON.parse(
      localStorage.getItem("agent_settings") || "{}"
    );
    agentSettings[props.agent.id] = {
      customSystemPrompt: chatSettings.value.systemPrompt,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem("agent_settings", JSON.stringify(agentSettings));
  } else {
    // 如果沒有選中智能體，保存為全域設定
    localStorage.setItem(
      "global_system_prompt",
      chatSettings.value.systemPrompt
    );
  }

  // 應用字體大小設置
  document.documentElement.style.setProperty(
    "--chat-font-size",
    `${chatSettings.value.fontSize}px`
  );

  settingsModalVisible.value = false;
  message.success("設置已保存");
};

const handleCancelSettings = () => {
  settingsModalVisible.value = false;
};

// 載入智能體特定的系統提示詞
const loadAgentSystemPrompt = () => {
  if (props.agent && props.agent.id) {
    // 嘗試載入該智能體的自定義系統提示詞
    const agentSettings = JSON.parse(
      localStorage.getItem("agent_settings") || "{}"
    );
    const agentSetting = agentSettings[props.agent.id];

    if (agentSetting && agentSetting.customSystemPrompt) {
      // 使用智能體的自定義系統提示詞
      chatSettings.value.systemPrompt = agentSetting.customSystemPrompt;
    } else {
      // 使用智能體的默認系統提示詞
      chatSettings.value.systemPrompt = props.agent.system_prompt || "";
    }
  } else {
    // 沒有選中智能體時，使用全域設定
    const globalPrompt = localStorage.getItem("global_system_prompt");
    chatSettings.value.systemPrompt = globalPrompt || "";
  }
};

// 恢復智能體的默認系統提示詞
const handleResetToDefaultPrompt = () => {
  if (props.agent && props.agent.system_prompt) {
    chatSettings.value.systemPrompt = props.agent.system_prompt;
    message.success("已恢復智能體的默認系統提示詞");
  }
};

const handleExportConversation = async () => {
  try {
    // await chatStore.handleExportConversation(chatStore.currentConversation.id);
    message.success("導出功能開發中");
  } catch (error) {
    message.error("導出失敗");
    console.error("導出失敗:", error);
  }
};

const handleClearMessages = async () => {
  try {
    // await chatStore.handleClearMessages(chatStore.currentConversation.id);
    message.success("清空功能開發中");
  } catch (error) {
    message.error("清空失敗");
    console.error("清空失敗:", error);
  }
};

const handleStopStream = () => {
  if (chatStore.isStreaming) {
    chatStore.stopCurrentStream();
  }
};

const handleToggleRealtimeRender = () => {
  configStore.toggleRealtimeRender();
  message.success(
    `已切換為${configStore.chatSettings.useRealtimeRender ? "即時渲染" : "等待渲染"}模式`
  );
};

// 切換思考模式
const handleToggleThinkingMode = () => {
  thinkingMode.value = !thinkingMode.value;
  console.log("思考模式切換:", thinkingMode.value ? "開啟" : "關閉");
  // 保存用戶偏好到本地存儲
  localStorage.setItem(
    "chat_thinking_mode",
    JSON.stringify(thinkingMode.value)
  );
  message.success(`已切換為${thinkingMode.value ? "思考模式" : "直出模式"}`);
};

// 根據智能體獲取快速提示
const getQuickPrompts = () => {
  if (!props.agent) {
    return quickPrompts.value;
  }

  // 優先使用動態載入的快速命令
  if (agentQuickCommands.value && agentQuickCommands.value.length > 0) {
    return agentQuickCommands.value;
  }

  // 如果沒有載入到動態命令，則使用預設的通用快速提示
  return quickPrompts.value;
};

// 監聽消息變化，自動滾動到底部
watch(
  () => chatStore.messages,
  (newMessages, oldMessages) => {
    // 自動滾動到底部
    if (newMessages?.length > (oldMessages?.length || 0)) {
      // 如果是載入歷史對話（從 0 到多條消息），使用延遲滾動確保渲染完成
      if ((oldMessages?.length || 0) === 0 && newMessages?.length > 0) {
        console.log("載入歷史對話，平滑滾動到底部");
        scrollToBottomWithDelay(150);
      } else {
        // 新增消息時立即滾動
        scrollToBottom();
      }
    }

    // 檢查是否有串流中的訊息內容發生變化
    const hasStreamingMessage = newMessages.some((msg) => msg.isStreaming);
    if (hasStreamingMessage) {
      // 如果有串流訊息，持續滾動到底部
      scrollToBottom();
    }
  },
  { deep: true }
);

watch(
  () => chatStore.messages.length,
  () => {
    scrollToBottom();
  }
);

// 監聽 AI 輸入狀態變化
watch(
  () => chatStore.aiTyping,
  (isTyping) => {
    if (isTyping) {
      scrollToBottom();
    }
  }
);

// 監聽當前對話變化，載入歷史對話後滾動到底部
watch(
  () => chatStore.currentConversation?.id,
  async (newConversationId, oldConversationId) => {
    if (newConversationId && newConversationId !== oldConversationId) {
      // 等待消息載入完成後滾動到底部
      await nextTick();
      // 使用較長的延遲確保歷史消息完全渲染
      scrollToBottomWithDelay(200);
    }
  }
);

// 監聽智能體變化，載入對應的系統提示詞和快速命令
watch(
  () => props.agent,
  () => {
    loadAgentSystemPrompt();
    loadAgentQuickCommands();
  },
  { immediate: true }
);

// 生命週期
onMounted(async () => {
  try {
    loading.value = true;

    // 載入用戶偏好的輸入區域高度
    loadInputAreaHeight();

    // 載入當前對話的消息
    if (chatStore.currentConversation) {
      await chatStore.handleGetMessages(chatStore.currentConversation.id);
    }

    // 載入可用模型和智能體
    await chatStore.handleGetAvailableModels();
    await chatStore.handleGetAvailableAgents();

    // 載入智能體快速命令
    await loadAgentQuickCommands();

    // 設置默認模型
    // 確保模型數據已載入
    if (
      !chatStore.availableModels.ollama &&
      !chatStore.availableModels.gemini
    ) {
      await chatStore.handleGetAvailableModels();
    }

    // 設置默認選中的模型
    if (availableModels.value.length > 0) {
      // 優先選擇默認模型或第一個可用模型
      const defaultModel =
        availableModels.value.find((model) => model.is_default) ||
        availableModels.value[0];

      if (defaultModel && defaultModel.id) {
        // 從 store 中找到完整的模型對象
        const fullModel = findModelById(defaultModel.id);
        selectedModel.value = fullModel || defaultModel;
        console.log("設置默認模型:", defaultModel.name, "ID:", defaultModel.id);
      } else {
        console.warn("無法找到有效的默認模型");
      }
    }

    // 如果有當前對話和消息，滾動到底部
    if (chatStore.currentConversation && chatStore.messages.length > 0) {
      scrollToBottomWithDelay(200);
    } else {
      scrollToBottom();
    }
  } catch (error) {
    message.error("載入聊天數據失敗");
    console.error("載入聊天數據失敗:", error);
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  // 清理輸入狀態
  if (wsStore.isConnected) {
    wsStore.handleSendTypingStatus(chatStore.currentConversation?.id, false);
  }
});

const handleResizeStart = (event) => {
  isResizing.value = true;
  const startY = event.clientY;
  const startHeight = inputAreaHeight.value;

  const handleMouseMove = (moveEvent) => {
    const deltaY = startY - moveEvent.clientY; // 向上拖拉為正值
    const newHeight = Math.max(
      minInputHeight,
      Math.min(maxInputHeight, startHeight + deltaY)
    );
    inputAreaHeight.value = newHeight;
    moveEvent.preventDefault();
  };

  const handleMouseUp = () => {
    isResizing.value = false;
    // 保存用戶偏好到 localStorage
    localStorage.setItem(
      "chatInputAreaHeight",
      inputAreaHeight.value.toString()
    );
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
  };

  // 防止文字選取和設置游標樣式
  document.body.style.userSelect = "none";
  document.body.style.cursor = "row-resize";

  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
  event.preventDefault();
};

// 從 localStorage 載入用戶偏好
const loadInputAreaHeight = () => {
  const savedHeight = localStorage.getItem("chatInputAreaHeight");
  if (savedHeight) {
    const height = parseInt(savedHeight, 10);
    if (height >= minInputHeight && height <= maxInputHeight) {
      inputAreaHeight.value = height;
    }
  }
};

// 放大輸入區域
const handleExpandInput = () => {
  //const newHeight = Math.min(maxInputHeight, inputAreaHeight.value + 300);
  inputAreaHeight.value = maxInputHeight;
  localStorage.setItem("chatInputAreaHeight", inputAreaHeight.value.toString());
};

// 縮小輸入區域
const handleShrinkInput = () => {
  //const newHeight = Math.max(minInputHeight, inputAreaHeight.value - 100);
  inputAreaHeight.value = minInputHeight;
  localStorage.setItem("chatInputAreaHeight", inputAreaHeight.value.toString());
};

// 監聽串流模式變化，保存用戶偏好
watch(useStreamMode, (newValue) => {
  console.log("串流模式切換:", newValue ? "啟用" : "禁用");
  localStorage.setItem("chat_stream_mode", JSON.stringify(newValue));
});

// 從本地存儲恢復串流模式設置
onMounted(() => {
  const savedStreamMode = localStorage.getItem("chat_stream_mode");
  if (savedStreamMode !== null) {
    useStreamMode.value = JSON.parse(savedStreamMode);
  }

  // 恢復思考模式設置
  const savedThinkingMode = localStorage.getItem("chat_thinking_mode");
  if (savedThinkingMode !== null) {
    thinkingMode.value = JSON.parse(savedThinkingMode);
  }

  // 恢復基本聊天設置（不包含系統提示詞）
  const savedChatSettings = localStorage.getItem("chat_settings");
  if (savedChatSettings) {
    try {
      const settings = JSON.parse(savedChatSettings);
      // 只恢復基本設置，系統提示詞通過 loadAgentSystemPrompt 載入
      chatSettings.value.temperature =
        settings.temperature || chatSettings.value.temperature;
      chatSettings.value.maxTokens =
        settings.maxTokens || chatSettings.value.maxTokens;
      chatSettings.value.fontSize =
        settings.fontSize || chatSettings.value.fontSize;

      // 應用字體大小設置
      document.documentElement.style.setProperty(
        "--chat-font-size",
        `${chatSettings.value.fontSize}px`
      );
    } catch (error) {
      console.error("恢復聊天設置失敗:", error);
    }
  } else {
    // 設置默認字體大小
    document.documentElement.style.setProperty(
      "--chat-font-size",
      `${chatSettings.value.fontSize}px`
    );
  }

  // 載入智能體特定的系統提示詞
  loadAgentSystemPrompt();
});

const handleCreateNewConversation = async () => {
  try {
    creatingNewConversation.value = true;

    // 確保選擇了模型
    if (!selectedModelId.value) {
      message.error("請先選擇 AI 模型");
      return;
    }

    // 先清空當前對話狀態
    chatStore.handleClearCurrentConversation();

    // 創建新對話（不設置標題，等第一條消息後自動生成）
    const newConversation = await chatStore.handleCreateConversation({
      agent_id: props.agent?.id,
      model_id: selectedModelId.value,
    });

    if (newConversation) {
      message.success("準備新對話");
      // 注意：新對話不會立即顯示在歷史列表中，直到發送第一條消息
    }
  } catch (error) {
    message.error("創建新對話失敗");
    console.error("創建新對話失敗:", error);
  } finally {
    creatingNewConversation.value = false;
  }
};

// 獲取所有模型的扁平列表（與 ModelSelector 相同的邏輯）
const getAllModels = () => {
  const models = [];
  if (
    chatStore.availableModels &&
    typeof chatStore.availableModels === "object"
  ) {
    // 動態遍歷所有提供商
    Object.keys(chatStore.availableModels).forEach((provider) => {
      if (chatStore.availableModels[provider]) {
        models.push(...chatStore.availableModels[provider]);
      }
    });
  }
  return models;
};

// 獲取當前選中模型的詳細信息
const getSelectedModelInfo = () => {
  if (!selectedModelId.value) {
    return "未選擇模型";
  }

  const allModels = getAllModels();
  if (allModels.length === 0) {
    return `模型 ID: ${selectedModelId.value} (模型列表載入中...)`;
  }

  const model = allModels.find((m) => m.id === selectedModelId.value);
  if (!model) {
    return `模型 ID: ${selectedModelId.value} (詳情未知)`;
  }

  console.log("model====>", model);

  return `${model.display_name || model.name} (${model.provider})`;
};

// 獲取當前模型的端點信息
const getModelEndpoint = () => {
  if (!selectedModelId.value) {
    return "未選擇模型";
  }

  const allModels = getAllModels();
  if (allModels.length === 0) {
    return "模型列表載入中...";
  }

  const model = allModels.find((m) => m.id === selectedModelId.value);
  if (!model) {
    return "端點信息未知";
  }

  return model.endpoint_url || "未配置端點";
};
</script>

<style scoped>
.chat-area {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--custom-bg-primary);
}

.chat-area-header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--custom-border-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--custom-bg-secondary);
}

.conversation-info {
  flex: 1;
  min-width: 0;
}

.conversation-title {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--custom-text-primary);
}

.conversation-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--custom-text-secondary);
}

.chat-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stream-toggle {
  margin-left: 8px;
}

.debug-active {
  background: var(--primary-color) !important;
  color: white !important;
}

.model-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.model-name {
  flex: 1;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
  background: var(--custom-bg-primary);
}

.empty-messages {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-content {
  text-align: center;
  max-width: 400px;
}

.empty-icon {
  font-size: 48px;
  color: var(--custom-text-tertiary);
  margin-bottom: 16px;
}

.empty-content h3 {
  font-size: 20px;
  margin-bottom: 8px;
  color: var(--custom-text-primary);
}

.empty-content p {
  color: var(--custom-text-secondary);
  margin-bottom: 24px;
}

.quick-prompts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.typing-indicator {
  display: flex;
  justify-content: flex-start;
  margin-top: 8px;
}

.typing-bubble {
  background: var(--custom-bg-tertiary);
  border: 1px solid var(--success-color);
  border-radius: 12px;
  border-bottom-left-radius: 4px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 300px;
}

.typing-dots {
  display: flex;
  gap: 4px;
}

.typing-dots span {
  width: 6px;
  height: 6px;
  background: var(--success-color);
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

.typing-text {
  font-size: 12px;
  color: var(--custom-text-secondary);
}

@keyframes typing {
  0%,
  80%,
  100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.stop-stream-container {
  position: fixed;
  bottom: 120px; /* 固定在輸入框上方 */
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  padding: 16px;
}

.stop-stream-button {
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 20px;
  padding: 8px 16px;
  background: rgba(255, 77, 79, 0.1);
  border: 1px solid rgba(255, 77, 79, 0.3);
  color: #ff4d4f;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(255, 77, 79, 0.2);
}

.stop-stream-button:hover {
  background: rgba(255, 77, 79, 0.15) !important;
  border-color: #ff4d4f !important;
  box-shadow: 0 4px 12px rgba(255, 77, 79, 0.3) !important;
  transform: translateY(-1px);
}

.stop-stream-button svg {
  transition: transform 0.3s ease;
}

.stop-stream-button:hover svg {
  transform: scale(1.1);
}

.message-input-area {
  border-top: 1px solid var(--custom-border-primary);
  background: var(--custom-bg-primary);
}

.quoted-message-display {
  padding: 12px 24px;
  background: var(--custom-bg-tertiary);
  border-bottom: 1px solid var(--custom-border-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.quote-content {
  flex: 1;
  min-width: 0;
}

.quote-header {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--success-color);
  margin-bottom: 4px;
}

.quote-text {
  font-size: 13px;
  color: var(--custom-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.input-container {
  padding: 16px;
  height: calc(100% - 2px);
  display: flex;
  flex-direction: column;
}

.input-wrapper {
  border: 1px solid var(--custom-border-primary);
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 0.2s;
  background: var(--custom-bg-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  flex: 1;
  position: relative;
}

.input-wrapper:focus-within {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.message-input {
  border: none !important;
  box-shadow: none !important;
  resize: none;
  padding: 16px 20px;
  background: var(--custom-bg-primary);
  color: var(--custom-text-primary);
  font-size: 15px;
  line-height: 1.5;
  flex: 1;
  min-height: 60px;
}

.message-input:focus {
  border: none !important;
  box-shadow: none !important;
}

.input-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: var(--custom-bg-tertiary);
  border-top: 1px solid var(--custom-border-primary);
  flex-shrink: 0;
  min-height: 60px; /* 確保工具欄有最小高度 */
  gap: 8px; /* 添加元素間距 */
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.char-count {
  font-size: 12px;
  color: var(--custom-text-tertiary);
}

/* 即時渲染切換按鈕樣式 */
.toolbar-left .ant-btn.active-toggle {
  background: rgba(24, 144, 255, 0.1) !important;
  color: var(--primary-color) !important;
  border-color: rgba(24, 144, 255, 0.3) !important;
}

.toolbar-left .ant-btn.active-toggle:hover {
  background: rgba(24, 144, 255, 0.15) !important;
  border-color: var(--primary-color) !important;
}

.toolbar-left .ant-btn {
  transition: all 0.2s ease;
  border-radius: 6px;
  height: 32px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-left .ant-btn svg {
  flex-shrink: 0;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .chat-area-header {
    padding: 12px 16px;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .conversation-meta {
    flex-direction: column;
    gap: 4px;
  }

  .chat-controls {
    width: 100%;
    justify-content: space-between;
  }

  .messages-container {
    padding: 12px 16px;
  }

  .input-container {
    padding: 16px 16px 24px 16px;
  }

  .quoted-message-display {
    padding: 8px 16px;
  }

  /* 移動端工具欄優化 */
  .input-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    min-height: auto;
    padding: 16px;
  }

  .toolbar-left,
  .toolbar-right {
    justify-content: center;
    flex-wrap: wrap;
  }

  .toolbar-right {
    flex-shrink: 1;
  }
}

/* 智能體信息樣式 */
.agent-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.agent-avatar {
  position: relative;
  flex-shrink: 0;
}

.agent-avatar .avatar-image {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  object-fit: cover;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.agent-avatar .avatar-bg {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.agent-avatar .agent-icon {
  width: 20px;
  height: 20px;
}

.agent-avatar .agent-initial {
  font-size: 16px;
  font-weight: 600;
}

.agent-details {
  flex: 1;
  min-width: 0;
}

.agent-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--custom-text-primary);
  margin: 0 0 4px 0;
}

.agent-description {
  font-size: 13px;
  color: var(--custom-text-secondary);
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.conversation-title-section .conversation-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--custom-text-primary);
}

/* 空狀態智能體頭像 */
.agent-avatar-large {
  margin: 0 auto 16px;
}

.agent-avatar-large .avatar-image-large {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  object-fit: cover;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.agent-avatar-large .avatar-bg {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.agent-avatar-large .agent-icon {
  width: 32px;
  height: 32px;
}

.agent-avatar-large .agent-initial {
  font-size: 32px;
  font-weight: 600;
}

.resize-handle {
  height: 6px;
  background: var(--custom-bg-primary);
  /* border-top: 1px solid var(--custom-border-primary);
  border-bottom: 1px solid var(--custom-border-primary); */
  cursor: row-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  position: relative;
  z-index: 10;
}

.resize-handle:hover {
  background: var(--custom-bg-tertiary);
  border-color: var(--primary-color);
}

.resize-handle.is-resizing {
  background: var(--primary-color);
  border-color: var(--primary-color);
}

.resize-indicator {
  width: 60px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.resize-handle:hover .resize-indicator {
  background: rgba(24, 144, 255, 0.1);
}

.resize-handle.is-resizing .resize-indicator {
  background: rgba(255, 255, 255, 0.2);
}

.resize-dots {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
}

.resize-dots span {
  width: 20px;
  height: 1px;
  background: var(--custom-text-tertiary);
  border-radius: 1px;
  transition: all 0.2s ease;
}

.resize-handle:hover .resize-dots span {
  background: var(--primary-color);
  width: 24px;
}

.resize-handle.is-resizing .resize-dots span {
  background: white;
  width: 28px;
}

/* 調整大小按鈕樣式 */
.resize-buttons {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  z-index: 10;
  background: var(--custom-bg-primary);
  border-radius: 6px;
  padding: 2px;
  /* box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--custom-border-primary); */
}

.resize-btn {
  width: 24px !important;
  height: 24px !important;
  padding: 0 !important;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: var(--custom-text-secondary);
  transition: all 0.2s ease;
}

.resize-btn:hover:not(:disabled) {
  background: var(--custom-bg-tertiary) !important;
  color: var(--primary-color) !important;
}

.resize-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.resize-btn svg {
  transition: transform 0.2s ease;
}

.resize-btn:hover:not(:disabled) svg {
  transform: scale(1.1);
}

/* 智能體提及選單樣式 */
.agent-mention-menu {
  background: white;
  border: 1px solid var(--custom-border-primary);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 200px;
  overflow-y: auto;
  min-width: 250px;
}

.agent-menu-list {
  padding: 4px 0;
}

.agent-menu-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.agent-menu-item:hover {
  background: var(--custom-bg-tertiary);
}

.agent-avatar-small {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 14px;
  margin-right: 8px;
  flex-shrink: 0;
  overflow: hidden;
}

.avatar-image-small {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 6px;
}

.agent-initial-small {
  font-size: 14px;
  font-weight: 600;
  color: white;
}

.agent-info-small {
  flex: 1;
  min-width: 0;
}

.agent-name-small {
  font-size: 14px;
  font-weight: 600;
  color: var(--custom-text-primary);
  margin-bottom: 2px;
}

.agent-desc-small {
  font-size: 12px;
  color: var(--custom-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 內聯檔案分析卡片樣式 */
.inline-file-analysis {
  margin-bottom: 12px;
  border-bottom: 1px solid var(--custom-border-primary);
  padding-bottom: 12px;
}

.input-wrapper {
  position: relative;
  transition: all 0.2s ease;
}

.input-wrapper.drag-over {
  border: 1px dashed var(--primary-color);
  border-radius: 8px;
  background: rgba(24, 144, 255, 0.05);
}

/* 當有檔案分析卡片時，調整輸入框的邊框 */
.input-wrapper:has(.inline-file-analysis) .message-input {
  border-top: none;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}

/* 預覽檔案容器樣式 */
.preview-files-container {
  padding: 6px;
  border: 1px solid var(--custom-border-primary);
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  background: var(--custom-bg-secondary);
  min-height: 48px; /* 確保容器有最小高度 */
  max-height: 110px; /* 限制最大高度，超出時滾動 */
  overflow-y: auto;
}

.preview-files-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  min-height: 40px; /* 確保列表有最小高度 */
}

.preview-file-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px; /* 卡片和下方按鈕的間距 */
}

.preview-file-item {
  position: relative; /* 重要：為絕對定位的移除按鈕提供相對定位參考 */
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0px;
  background: var(--custom-bg-tertiary);
  border: 1px solid var(--custom-border-primary);
  border-radius: 8px;
  max-width: 80px; /* 縮小寬度，因為只顯示縮圖 */
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.preview-file-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.file-thumbnail {
  position: relative;
  width: 60px; /* 增加寬度以便更好地顯示移除按鈕 */
  height: 60px; /* 增加高度 */
  border-radius: 8px;
  overflow: hidden;
  background: var(--custom-bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  border: 1px solid var(--custom-border-primary);
}

.file-thumbnail.clickable {
  cursor: pointer;
}

.file-thumbnail.clickable:hover {
  transform: scale(1.02);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-icon {
  color: var(--custom-text-secondary);
  font-size: 24px;
}

/* 卡片右上角的移除按鈕 */
.card-remove-btn {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 20px !important;
  height: 20px !important;
  padding: 0 !important;
  background: var(--error-color) !important; /* 使用主色調 */
  border: 0px solid var(--primary-color) !important;
  border-radius: 50%;
  color: white !important;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0; /* 預設隱藏 */
  transition: all 0.2s ease;
  z-index: 10;
}

.card-remove-btn:hover {
  opacity: 1 !important;
  background: var(--primary-color) !important;
  transform: scale(1.1);
  box-shadow: 0 2px 6px rgba(24, 144, 255, 0.3);
}

.preview-file-item:hover .card-remove-btn {
  opacity: 1; /* 滑鼠移過卡片時顯示 */
}

.zoom-icon {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 16px;
  height: 16px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.file-thumbnail.clickable:hover .zoom-icon {
  opacity: 1;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.filename {
  font-size: 12px;
  font-weight: 500;
  color: var(--custom-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.file-size {
  font-size: 11px;
  color: var(--custom-text-secondary);
}

/* 解釋此圖按鈕樣式（放在卡片下方） */
.image-actions {
  display: flex;
  justify-content: center;
}

.explain-btn {
  display: flex;
  align-items: center;
  gap: 2px;
  color: var(--custom-text-primary) !important;
  font-size: 11px;
  height: 24px;
  padding: 0 4px;
  border-radius: 6px; /* 更圓潤的外觀 */
  border: 1px solid var(--custom-border-primary) !important;
  background: var(--custom-bg-secondary) !important;
  transition: all 0.2s ease;
  white-space: nowrap; /* 防止文字換行 */
}

.explain-btn:hover {
  background: var(--custom-bg-quaternary) !important;

  transform: scale(1.02);
}

/* 當有預覽檔案時，調整輸入框樣式 */
.input-wrapper:has(.preview-files-container) .message-input {
  border-top: none;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}

.ant-modal-content {
  border: 2px solid red !important;
  padding: 0 !important;
  margin: 40px;
}
/* 圖片預覽 Modal 樣式 */
.image-preview-modal .ant-modal-body {
  padding: 0;
}

.image-preview-modal .ant-modal-header {
  display: none;
}

.image-preview-content {
  display: flex;
  justify-content: center;
  align-items: center;
}

.preview-image {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 8px;
}

/* 拖拉覆蓋層樣式 */
.drag-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(24, 144, 255, 0.1);
  border: 2px dashed var(--primary-color);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  backdrop-filter: blur(2px);
}

.drag-content {
  text-align: center;
  color: var(--primary-color);
}

.drag-icon {
  font-size: 48px;
  margin-bottom: 16px;
  display: block;
}

.drag-text {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.drag-subtext {
  font-size: 14px;
  opacity: 0.8;
}

/* 調試面板樣式 - 右側固定 */
.debug-panel-sidebar {
  position: fixed;
  top: 180px;
  right: 0;
  width: 300px;
  max-width: 300px;
  height: 450px;
  background: var(--custom-bg-secondary);
  border-left: 1px solid var(--custom-border-primary);
  padding: 0;
  font-family:
    "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New",
    monospace;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  animation: slideInRight 0.3s ease-out;
}

@keyframes slideInRight {
  0% {
    opacity: 0;
    transform: translateX(300px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

.debug-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--custom-bg-tertiary);
  border-bottom: 1px solid var(--custom-border-primary);
  flex-shrink: 0;
}

.debug-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--custom-text-primary);
}

.debug-content {
  padding: 16px;
  flex: 1;
  overflow-y: auto;
}

.debug-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 8px;
  font-size: 12px;
}

.debug-item label {
  font-weight: 600;
  color: var(--custom-text-secondary);
  min-width: 80px;
  margin-right: 8px;
  flex-shrink: 0;
}

.debug-value {
  color: var(--custom-text-primary);
  word-break: break-all;
  flex: 1;
}

.debug-value.mono {
  font-family:
    "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New",
    monospace;
  background: var(--custom-bg-primary);
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--custom-border-primary);
}

.debug-value.system-prompt {
  background: var(--custom-bg-primary);
  padding: 8px;
  border-radius: 4px;
  border: 1px solid var(--custom-border-primary);
  max-height: 100px;
  overflow-y: auto;
  white-space: pre-wrap;
  font-size: 11px;
  line-height: 1.4;
}

.debug-status {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.debug-status .ant-tag {
  margin: 0;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 12px;
}

/* 載入更多指示器樣式 */
.load-more-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: var(--custom-bg-secondary);
  border-bottom: 1px solid var(--custom-border-primary);
  color: var(--custom-text-secondary);
  font-size: 14px;
}

/* 手動載入更多按鈕樣式 */
.load-more-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background: var(--custom-bg-secondary);
  border-bottom: 1px solid var(--custom-border-primary);
}

.load-more-button .ant-button {
  border-radius: 6px;
  font-size: 12px;
}
</style>

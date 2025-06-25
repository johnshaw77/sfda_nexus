<template>
  <div class="chat-area">
    <!-- 放一個 div 在背景, 並且放在最下一層 -->

    <!-- 聊天頭部 -->
    <div class="chat-area-header">
      <div class="conversation-info">
        <!-- 智能體信息 -->
        <div
          v-if="agent"
          class="agent-info">
          <!-- 展開按鈕 (僅在對話面板折疊時顯示) -->
          <a-tooltip
            v-if="conversationPanelCollapsed"
            title="展開對話面板"
            placement="bottom"
            :arrow="false">
            <a-button
              type="text"
              class="conversation-expand-btn"
              @click="handleToggleConversationCollapse">
              <MenuUnfoldOutlined />
            </a-button>
          </a-tooltip>

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
        <!-- 快速命令下拉選單 -->
        <a-dropdown
          :trigger="['click']"
          placement="bottomLeft">
          <a-tooltip
            title="快速命令"
            :arrow="false"
            placement="bottom">
            <a-button
              type="text"
              class="quick-commands-btn"
              :loading="loadingQuickCommands">
              <ThunderboltOutlined />
              快速命令
              <DownOutlined style="font-size: 10px; margin-left: 4px" />
            </a-button>
          </a-tooltip>
          <template #overlay>
            <a-menu @click="handleDynamicQuickCommand">
              <!-- 載入中狀態 -->
              <template v-if="loadingQuickCommands">
                <a-menu-item disabled>
                  <a-spin
                    size="small"
                    style="margin-right: 8px" />
                  載入快速命令中...
                </a-menu-item>
              </template>

              <!-- 動態載入的智能體快速命令 -->
              <template v-else-if="agentQuickCommands.length > 0">
                <a-menu-item-group
                  :title="`${agent?.display_name || '智能體'} 專屬命令`">
                  <a-menu-item
                    v-for="command in agentQuickCommands"
                    :key="command.id">
                    <component
                      :is="getIconComponent(command.icon)"
                      v-if="command.icon"
                      style="margin-right: 8px" />
                    {{ command.text }}
                    <span
                      v-if="command.description"
                      class="command-desc">
                      - {{ command.description }}
                    </span>
                  </a-menu-item>
                </a-menu-item-group>
              </template>

              <!-- 如果沒有智能體特定的快速命令，顯示通用命令 -->
              <template v-else>
                <a-menu-item-group title="數據查詢">
                  <a-menu-item key="query-employee">
                    <UserOutlined />
                    查詢員工資料
                  </a-menu-item>
                  <a-menu-item key="query-department">
                    <TeamOutlined />
                    查詢部門信息
                  </a-menu-item>
                  <a-menu-item key="query-salary">
                    <DollarOutlined />
                    查詢薪資信息
                  </a-menu-item>
                </a-menu-item-group>

                <a-menu-divider />

                <a-menu-item-group title="報表生成">
                  <a-menu-item key="report-monthly">
                    <FileTextOutlined />
                    生成月度報表
                  </a-menu-item>
                  <a-menu-item key="report-attendance">
                    <CalendarOutlined />
                    考勤統計報表
                  </a-menu-item>
                  <a-menu-item key="report-performance">
                    <TrophyOutlined />
                    績效評估報表
                  </a-menu-item>
                </a-menu-item-group>

                <a-menu-divider />

                <a-menu-item-group title="系統操作">
                  <a-menu-item key="backup-data">
                    <CloudDownloadOutlined />
                    數據備份
                  </a-menu-item>
                  <a-menu-item key="system-check">
                    <SafetyOutlined />
                    系統檢查
                  </a-menu-item>
                  <a-menu-item key="clear-cache">
                    <DeleteOutlined />
                    清理緩存
                  </a-menu-item>
                </a-menu-item-group>
              </template>
            </a-menu>
          </template>
        </a-dropdown>

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

        <a-tooltip
          :title="
            configStore.chatSettings.useRealtimeRender
              ? '當前：即時渲染模式 - 串流過程中即時顯示內容'
              : '當前：等待渲染模式 - 串流結束後一次性渲染'
          "
          placement="bottom"
          :arrow="false">
          <a-tag
            @click="handleToggleRealtimeRender"
            :color="
              thinkingMode
                ? 'var(--primary-color)'
                : 'var(--text-color-secondary)'
            ">
            <span v-show="!inputCollapsed">{{
              configStore.chatSettings.useRealtimeRender ? "即時" : "等待"
            }}</span>
          </a-tag>
        </a-tooltip>

        <!-- 思考模式切換 -->
        <a-tooltip
          :title="
            thinkingMode
              ? '當前：思考模式開啟 - AI 會顯示思考過程'
              : '當前：思考模式關閉 - AI 直接輸出結果'
          "
          placement="bottom"
          :arrow="false">
          <a-tag
            :color="
              thinkingMode
                ? 'var(--primary-color)'
                : 'var(--text-color-secondary)'
            "
            @click="handleToggleThinkingMode">
            <span v-show="!inputCollapsed">{{
              thinkingMode ? "思考" : "直出"
            }}</span>
          </a-tag>
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
      :style="{
        height: `calc(100% - ${inputCollapsed ? 60 : inputAreaHeight}px)`,
      }">
      <!-- <div class="background-video">
        <video
          src="/images/ssss.mp4"
          style="
            position: absolute;
            opacity: 0.2;
            width: 100%;
            height: 100%;
            border-radius: 0px;
          "
          autoplay
          loop
          muted></video>
      </div> -->
      <a-spin
        :spinning="loading"
        tip="載入消息中...">
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
                  ? `${agent.display_name} 專精於 ${agent.tags?.join("、")}`
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
            @regenerate-response="handleRegenerateResponse"
            @generate-chart="handleGenerateChart" />

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
        </div>
      </a-spin>
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
        <StopOutlined />
        停止對話
      </a-button>
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

    <!-- 聊天狀態調試面板組件 -->
    <ChatDebugPanel
      :visible="showDebugPanel"
      :selected-model-info="getSelectedModelInfo()"
      :model-endpoint="getModelEndpoint()"
      :api-base-url="configStore.apiBaseUrl"
      :stream-mode="useStreamMode"
      :agent-name="agent?.display_name"
      :message-count="chatStore.messages.length"
      :temperature="chatSettings.temperature"
      :max-tokens="chatSettings.maxTokens"
      :system-prompt="chatSettings.systemPrompt"
      :sending="sending"
      :is-streaming="isStreaming"
      :ai-typing="chatStore.aiTyping"
      :selected-model-provider="getSelectedModelProvider()"
      @close="showDebugPanel = false" />

    <!-- 消息輸入區域 -->
    <div
      class="message-input-area"
      :class="{ 'input-collapsed': inputCollapsed }"
      :style="{ height: inputCollapsed ? '60px' : `${inputAreaHeight}px` }">
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
                quotedMessage.role === "user"
                  ? "用戶"
                  : quotedMessage.agent_name ||
                    agent?.display_name ||
                    agent?.name ||
                    "AI助手"
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
      <div
        class="input-container"
        :class="{ collapsed: inputCollapsed }">
        <div
          class="input-wrapper"
          :class="{
            'drag-over': isDragOver,
            collapsed: inputCollapsed,
            'input-disabled': optimizingPrompt,
          }"
          @dragover="handleDragOver"
          @dragleave="handleDragLeave"
          @drop="handleDrop">
          <!-- 調整大小按鈕 -->
          <div
            class="resize-buttons"
            v-show="!inputCollapsed">
            <!-- 折疊按鈕 -->
            <a-tooltip
              :title="inputCollapsed ? '展開輸入框' : '折疊輸入框'"
              placement="top">
              <a-button
                type="text"
                size="small"
                @click="handleToggleInputCollapse"
                class="resize-btn">
                <ArrowDownToLine :size="12" />
              </a-button>
            </a-tooltip>
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
                <Maximize :size="12" />
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
                <Minimize :size="12" />
              </a-button>
            </a-tooltip>
          </div>

          <!-- 檔案分析卡片 -->
          <FileAnalysisCard
            v-if="showFileAnalysisCard && currentFileInfo && !inputCollapsed"
            :file-info="currentFileInfo"
            @close="showFileAnalysisCard = false"
            class="inline-file-analysis" />

          <!-- 預覽檔案縮圖 -->
          <div
            v-if="previewFiles.length > 0 && !inputCollapsed"
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
                      clickable: file.preview && isImageFile(file),
                    }"
                    @click="handlePreviewImage(file)">
                    <!-- 圖片檔案顯示預覽 - 使用與其他檔案一致的樣式，但不顯示檔名 -->
                    <a-tooltip
                      v-if="file.preview"
                      :title="file.filename"
                      placement="bottom">
                      <div class="file-icon-container">
                        <div class="thumbnail-icon image-thumbnail-icon">
                          <img
                            :src="file.preview"
                            :alt="file.filename"
                            class="image-thumbnail-preview" />
                          <!-- 放大鏡圖示（僅圖片顯示） -->
                          <div
                            v-if="file.preview && isImageFile(file)"
                            class="zoom-icon">
                            <ZoomIn :size="8" />
                          </div>
                        </div>
                        <!-- 圖片檔案不顯示檔名，但整個區域有tooltip -->
                      </div>
                    </a-tooltip>
                    <!-- 非圖片檔案顯示圖示 -->
                    <div
                      v-else
                      class="file-icon-container">
                      <div class="thumbnail-icon">
                        <!-- PDF 檔案 -->
                        <FilePDF v-if="isPdfFile(file)" />
                        <!-- Word 檔案 -->
                        <FileWord v-else-if="isWordFile(file)" />
                        <!-- CSV 檔案 -->
                        <FileCSV v-else-if="isCsvFile(file)" />
                        <!-- Excel 檔案 -->
                        <FileExcel v-else-if="isExcelFile(file)" />
                        <!-- PowerPoint 檔案 -->
                        <FilePowerpoint v-else-if="isPowerpointFile(file)" />
                        <!-- 預設檔案圖示 -->
                        <FileOutlined v-else />
                      </div>
                      <!-- 檔案名稱 -->
                      <a-tooltip
                        :title="file.filename"
                        placement="bottom">
                        <div class="file-name-label">
                          {{ file.filename }}
                        </div>
                      </a-tooltip>
                    </div>
                  </div>
                </div>

                <!-- 快速命令按鈕 -->
                <div class="file-actions">
                  <!-- 圖片的解釋按鈕 -->
                  <template v-if="file.preview && isImageFile(file)">
                    <a-button
                      type="text"
                      size="small"
                      @click="handleExplainImage(file)"
                      class="action-btn">
                      <EyeOutlined />
                      解釋此圖
                    </a-button>
                  </template>

                  <!-- 文檔檔案的快速命令 -->
                  <template v-else>
                    <!-- PDF 檔案專用建議詞 -->
                    <template v-if="isPdfFile(file)">
                      <a-button
                        type="text"
                        size="small"
                        @click="handleExtractPdfText(file)"
                        class="action-btn">
                        <FileTextOutlined />
                        提取文字
                      </a-button>
                      <a-button
                        type="text"
                        size="small"
                        @click="handleSummarizePdf(file)"
                        class="action-btn">
                        <ReadOutlined />
                        文件摘要
                      </a-button>
                    </template>

                    <!-- Word 檔案專用建議詞 -->
                    <template v-else-if="isWordFile(file)">
                      <a-button
                        type="text"
                        size="small"
                        @click="handleAnalyzeDocument(file)"
                        class="action-btn">
                        <EditOutlined />
                        文檔分析
                      </a-button>
                      <a-button
                        type="text"
                        size="small"
                        @click="handleFormatDocument(file)"
                        class="action-btn">
                        <AlignLeftOutlined />
                        格式整理
                      </a-button>
                    </template>

                    <!-- CSV 檔案專用建議詞 -->
                    <template v-else-if="isCsvFile(file)">
                      <a-button
                        type="text"
                        size="small"
                        @click="handleAnalyzeCsvData(file)"
                        class="action-btn">
                        <BarChartOutlined />
                        數據分析
                      </a-button>
                      <a-button
                        type="text"
                        size="small"
                        @click="handleGenerateChartFromCSV(file)"
                        class="action-btn">
                        <LineChartOutlined />
                        生成圖表
                      </a-button>
                    </template>

                    <!-- Excel 檔案專用建議詞 -->
                    <template v-else-if="isExcelFile(file)">
                      <a-button
                        type="text"
                        size="small"
                        @click="handleAnalyzeExcelData(file)"
                        class="action-btn">
                        <TableOutlined />
                        數據分析
                      </a-button>
                      <a-button
                        type="text"
                        size="small"
                        @click="handleGenerateExcelChart(file)"
                        class="action-btn">
                        <PieChartOutlined />
                        生成圖表
                      </a-button>
                      <a-button
                        type="text"
                        size="small"
                        @click="handleSummarizeExcelSheets(file)"
                        class="action-btn">
                        <FileSearchOutlined />
                        工作表摘要
                      </a-button>
                    </template>

                    <!-- PowerPoint 檔案專用建議詞 -->
                    <template v-else-if="isPowerpointFile(file)">
                      <a-button
                        type="text"
                        size="small"
                        @click="handleAnalyzePowerpoint(file)"
                        class="action-btn">
                        <PresentationChartLineOutlined />
                        簡報分析
                      </a-button>
                      <a-button
                        type="text"
                        size="small"
                        @click="handleExtractSlideContent(file)"
                        class="action-btn">
                        <FileImageOutlined />
                        提取內容
                      </a-button>
                      <a-button
                        type="text"
                        size="small"
                        @click="handleOptimizePresentation(file)"
                        class="action-btn">
                        <BulbOutlined />
                        優化建議
                      </a-button>
                    </template>

                    <!-- 文字檔案專用建議詞 -->
                    <template v-else-if="isTextFile(file)">
                      <a-button
                        type="text"
                        size="small"
                        @click="handleAnalyzeText(file)"
                        class="action-btn">
                        <FileTextOutlined />
                        文本分析
                      </a-button>
                      <a-button
                        type="text"
                        size="small"
                        @click="handleSummarizeText(file)"
                        class="action-btn">
                        <ReadOutlined />
                        內容摘要
                      </a-button>
                    </template>

                    <!-- JSON 檔案專用建議詞 -->
                    <template v-else-if="isJsonFile(file)">
                      <a-button
                        type="text"
                        size="small"
                        @click="handleParseJson(file)"
                        class="action-btn">
                        <CodeOutlined />
                        解析結構
                      </a-button>
                      <a-button
                        type="text"
                        size="small"
                        @click="handleValidateJson(file)"
                        class="action-btn">
                        <CheckCircleOutlined />
                        驗證格式
                      </a-button>
                    </template>

                    <!-- XML 檔案專用建議詞 -->
                    <template v-else-if="isXmlFile(file)">
                      <a-button
                        type="text"
                        size="small"
                        @click="handleParseXml(file)"
                        class="action-btn">
                        <CodeOutlined />
                        解析結構
                      </a-button>
                      <a-button
                        type="text"
                        size="small"
                        @click="handleTransformXml(file)"
                        class="action-btn">
                        <SwapOutlined />
                        格式轉換
                      </a-button>
                    </template>

                    <!-- 程式碼檔案專用建議詞 -->
                    <template v-else-if="isCodeFile(file)">
                      <a-button
                        type="text"
                        size="small"
                        @click="handleReviewCode(file)"
                        class="action-btn">
                        <BugOutlined />
                        代碼審查
                      </a-button>
                      <a-button
                        type="text"
                        size="small"
                        @click="handleExplainCode(file)"
                        class="action-btn">
                        <QuestionCircleOutlined />
                        代碼解釋
                      </a-button>
                      <a-button
                        type="text"
                        size="small"
                        @click="handleOptimizeCode(file)"
                        class="action-btn">
                        <ThunderboltOutlined />
                        優化建議
                      </a-button>
                    </template>

                    <!-- 通用文檔建議詞 -->
                    <template v-else>
                      <a-button
                        type="text"
                        size="small"
                        @click="handleSummarizeFile(file)"
                        class="action-btn">
                        <FileTextOutlined />
                        關鍵要點
                      </a-button>
                      <a-button
                        type="text"
                        size="small"
                        @click="handleGenerateDocument(file)"
                        class="action-btn">
                        <EditOutlined />
                        生成文件
                      </a-button>
                    </template>
                  </template>
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
            v-show="!inputCollapsed"
            ref="messageInput"
            :value="messageText"
            @input="
              (e) => {
                messageText = e.target.value;
                handleInputChange(e);
              }
            "
            @paste="handlePaste"
            :placeholder="
              isListening
                ? '🎤 正在監聽語音輸入...'
                : `向 ${agent?.display_name || 'AI助手'} 發送消息... (Shift+Enter 換行，Enter 發送，Tab 優化提示詞，支援拖拉或貼上檔案)`
            "
            :auto-size="false"
            :disabled="sending || optimizingPrompt"
            @keydown="handleKeyDown"
            :style="{ height: `${textareaHeight}px` }"
            class="message-input"
            :class="{ 'voice-listening': isListening }" />

          <!-- 折疊狀態的簡化提示 -->
          <div
            v-if="inputCollapsed"
            class="collapsed-input-hint"
            @click="handleToggleInputCollapse">
            <span class="hint-text">點擊這裡或展開按鈕開始對話...</span>
          </div>

          <!-- 🤖 智能建議區域 -->
          <div
            v-if="shouldShowSuggestions && !inputCollapsed"
            class="smart-suggestions-area">
            <!-- 圖表建議 -->
            <div
              v-if="chartSuggestions.length > 0"
              class="suggestion-group">
              <div class="suggestion-header">
                <BarChartOutlined />
                <span>智能圖表建議</span>
                <a-button
                  type="text"
                  size="small"
                  @click="clearSuggestions"
                  class="clear-btn">
                  <CloseOutlined />
                </a-button>
              </div>
              <div class="suggestion-list">
                <div
                  v-for="suggestion in chartSuggestions.slice(0, 2)"
                  :key="suggestion.id"
                  class="suggestion-item"
                  @click="handleApplySuggestion(suggestion)">
                  <div class="suggestion-icon">
                    <component
                      :is="
                        suggestion.chartType === 'pie'
                          ? 'PieChartOutlined'
                          : 'BarChartOutlined'
                      " />
                  </div>
                  <div class="suggestion-content">
                    <div class="suggestion-title">{{ suggestion.title }}</div>
                    <div class="suggestion-desc">
                      {{ suggestion.description }}
                    </div>
                  </div>
                  <div class="suggestion-confidence">
                    {{ Math.round(suggestion.confidence * 100) }}%
                  </div>
                </div>
              </div>
            </div>

            <!-- 分析建議 -->
            <div
              v-if="analysisSuggestions.length > 0"
              class="suggestion-group">
              <div class="suggestion-header">
                <EyeOutlined />
                <span>智能分析建議</span>
              </div>
              <div class="suggestion-list">
                <div
                  v-for="suggestion in analysisSuggestions.slice(0, 2)"
                  :key="suggestion.id"
                  class="suggestion-item"
                  @click="handleApplySuggestion(suggestion)">
                  <div class="suggestion-icon">
                    <EyeOutlined />
                  </div>
                  <div class="suggestion-content">
                    <div class="suggestion-title">{{ suggestion.title }}</div>
                    <div class="suggestion-desc">
                      {{ suggestion.description }}
                    </div>
                  </div>
                  <div class="suggestion-confidence">
                    {{ Math.round(suggestion.confidence * 100) }}%
                  </div>
                </div>
              </div>
            </div>

            <!-- 分析中指示器 -->
            <div
              v-if="isSuggestionAnalyzing"
              class="analyzing-indicator">
              <LoadingOutlined spin />
              <span>AI正在分析輸入內容...</span>
            </div>
          </div>

          <!-- 輸入工具欄 -->
          <div class="input-toolbar">
            <div class="toolbar-left">
              <!-- 模型選擇器 -->
              <ModelSelector
                v-model:modelValue="selectedModel"
                :disabled="sending || optimizingPrompt"
                @change="handleModelChange" />
              <!-- 優化提示詞 -->
              <a-tooltip
                placement="top"
                :arrow="false">
                <template #title>
                  <span>優化提示詞 (Tab 鍵快捷鍵)</span>
                </template>
                <a-button
                  type="text"
                  size="small"
                  :loading="optimizingPrompt"
                  :disabled="!messageText.trim() || optimizingPrompt || sending"
                  @click="handleOptimizePrompt">
                  <Sparkles :size="14" />
                </a-button>
              </a-tooltip>

              <!-- 語音輸入 -->
              <a-tooltip
                placement="top"
                :arrow="false">
                <template #title>
                  <span v-if="!speechSupported">您的瀏覽器不支援語音識別</span>
                  <span v-else-if="isListening">點擊停止語音輸入</span>
                  <span v-else>點擊開始語音輸入</span>
                </template>
                <a-button
                  type="text"
                  size="small"
                  :disabled="!speechSupported || sending || optimizingPrompt"
                  :class="{ 'voice-active': isListening }"
                  @click="handleVoiceInput">
                  <Mic :size="14" />
                </a-button>
              </a-tooltip>

              <!-- 預覽後上傳 -->
              <a-tooltip
                placement="top"
                :arrow="false">
                <template #title>
                  <span v-html="uploadDescription"></span>
                </template>
                <a-upload
                  :show-upload-list="false"
                  :before-upload="handleFilePreview"
                  :disabled="sending || optimizingPrompt"
                  accept="*/*">
                  <a-button
                    type="text"
                    size="small"
                    :disabled="sending || optimizingPrompt">
                    <PaperClipOutlined />
                  </a-button>
                </a-upload>
              </a-tooltip>

              <!-- 即時渲染切換 -->

              <!-- 表情符號 -->
              <!-- <a-button
                type="text"
                size="small"
                @click="handleShowEmoji">
                <SmileOutlined />
              </a-button> -->
            </div>

            <div class="toolbar-right">
              <!-- 字數統計 -->
              <!-- <span class="char-count">{{ messageText.length }}</span> -->
              <!-- 新對話按鈕 -->
              <a-tooltip
                placement="top"
                :arrow="false">
                <template #title>
                  <span>開啟新的對話</span>
                </template>
                <a-button
                  type="text"
                  size="small"
                  @click="handleCreateNewConversation"
                  :disabled="sending || optimizingPrompt"
                  :loading="creatingNewConversation">
                  <MessageCirclePlus
                    :size="14"
                    :color="
                      configStore.chatSettings.useRealtimeRender
                        ? 'var(--primary-color)'
                        : 'var(--text-color-secondary)'
                    " />
                  <span v-show="!inputCollapsed">新對話</span>
                </a-button>
              </a-tooltip>
              <!-- 發送按鈕 -->
              <a-button
                type="primary"
                :loading="sending"
                :disabled="
                  (!messageText.trim() && previewFiles.length === 0) ||
                  optimizingPrompt
                "
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
import { ref, computed, nextTick, onMounted, onUnmounted, watch, h } from "vue";
import { message } from "ant-design-vue";
// Icons are globally registered in main.js
import { useChatStore } from "@/stores/chat";
import { useWebSocketStore } from "@/stores/websocket";
import { useConfigStore } from "@/stores/config";
import MessageBubble from "./MessageBubble.vue";
import ModelSelector from "./ModelSelector.vue";
import FileAnalysisCard from "@/components/common/FileAnalysisCard.vue";
import ChatDebugPanel from "@/components/chat/ChatDebugPanel.vue";
import { formatMessageTime } from "@/utils/datetimeFormat";
import {
  getAgentQuickCommands,
  incrementCommandUsage,
} from "@/api/quickCommands";
import {
  ArrowDownToLine,
  Maximize,
  Minimize,
  ZoomIn,
  MessageCirclePlus,
  Mic,
  Sparkles,
} from "lucide-vue-next";
import FileWord from "@/assets/icons/FileWord.vue";
import FileCSV from "@/assets/icons/FileCSV.vue";
import FileExcel from "@/assets/icons/FileExcel.vue";
import FilePowerpoint from "@/assets/icons/FilePowerpoint.vue";
import FilePDF from "@/assets/icons/FilePDF.vue";

import { useLocalStorage, useSpeechRecognition } from "@vueuse/core";
import { chatWithQwenAgent } from "@/api/qwenAgent";
import { optimizePrompt } from "@/api/chat";
import { useFileType } from "@/composables/useFileType";
import { useSmartSuggestions } from "@/composables/useSmartSuggestions";

// Store
const chatStore = useChatStore();
const wsStore = useWebSocketStore();
const configStore = useConfigStore();

// Composables
const {
  isDocumentFile,
  isPdfFile,
  isWordFile,
  isCsvFile,
  isExcelFile,
  isPowerpointFile,
  isTextFile,
  isJsonFile,
  isXmlFile,
  isCodeFile,
  isImageFile,
  isSupportedFile,
} = useFileType();

// 🤖 智能建議功能
const {
  currentInput,
  suggestions,
  isAnalyzing: isSuggestionAnalyzing,
  shouldShowSuggestions,
  chartSuggestions,
  analysisSuggestions,
  setInput,
  clearSuggestions,
  generateChart,
  performAnalysis,
} = useSmartSuggestions();

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
  <li>» 文件類型: csv,pdf,txt,docs,xlsx,圖片和各類代碼文件格式等</li>`;
// 預覽檔案相關狀態
const previewFiles = ref([]);
const maxPreviewFiles = 5;
const imagePreviewVisible = ref(false);
const currentPreviewImage = ref(null);
const isDragOver = ref(false);

// 輸入框折疊狀態
const inputCollapsed = useLocalStorage("chat-input-collapsed", false);

// 優化提示詞相關狀態
const optimizingPrompt = ref(false);
const promptHistory = ref([]); // 用於存儲提示詞歷史，支援 undo 功能

// 語音識別功能
const {
  isSupported: speechSupported,
  isListening,
  isFinal,
  result: speechResult,
  start: startSpeechRecognition,
  stop: stopSpeechRecognition,
} = useSpeechRecognition({
  lang: "zh-TW", // 設置為繁體中文
  interimResults: true, // 顯示即時結果
  continuous: true, // 持續監聽
});

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
const quickPrompts = ref([]);

// 從 store 中獲取可用智能體
const availableAgents = computed(() => chatStore.availableAgents || []);

// Props
const props = defineProps({
  agent: {
    type: Object,
    default: null,
  },
  conversationPanelCollapsed: {
    type: Boolean,
    default: false,
  },
});

// Emits
const emit = defineEmits(["toggle-conversation-collapse"]);

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

// 檢測是否是 Qwen Agent (TODO: qwen agent framework 還需測試驗証，不然就棄用)
const isQwenAgent = (agent) => {
  if (!agent) return false;
  // 檢查 agent 名稱或工具配置來判斷是否是 Qwen Agent
  return (
    agent.name === "qwen-enterprise-agent" ||
    (agent.tools &&
      agent.tools.mcp_tools &&
      Array.isArray(agent.tools.mcp_tools))
  );
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

      // 🔍 調試：檢查附件信息
      console.log("=== 前端發送消息調試 ===");
      console.log("預覽檔案數量:", previewFiles.value.length);
      console.log("待發送附件數量:", pendingAttachments.value.length);
      console.log("最終附件數量:", finalAttachments.length);
      console.log("最終附件內容:", finalAttachments);
      console.log("傳遞給後端的附件:", attachments);
      console.log("================================");

      // 清空輸入框和重置狀態
      messageText.value = "";
      quotedMessage.value = null;
      pendingAttachments.value = [];
      previewFiles.value = []; // 清空預覽檔案

      // 檢查是否是 Qwen Agent
      if (isQwenAgent(props.agent)) {
        console.log("=== 檢測到 Qwen Agent，使用 Qwen-Agent API ===");
        console.log("Agent:", props.agent.name);
        console.log("Message:", content);

        try {
          // 使用 Qwen-Agent API
          const response = await chatWithQwenAgent({
            message: content,
            agentId: props.agent.id,
            conversationId: conversationId,
            context: {
              temperature: chatSettings.value.temperature,
              max_tokens: chatSettings.value.maxTokens,
              system_prompt: chatSettings.value.systemPrompt,
              attachments: attachments,
            },
          });

          console.log("=== Qwen-Agent 回應 ===");
          console.log("Response:", response);

          if (response.success) {
            // 重新載入對話消息以顯示新的消息
            await chatStore.handleGetMessages(conversationId);
            message.success("Qwen Agent 回應成功");
          } else {
            throw new Error(response.error || "Qwen Agent 回應失敗");
          }
        } catch (error) {
          console.error("Qwen Agent 調用失敗:", error);
          message.error(`Qwen Agent 調用失敗: ${error.message}`);
        }
      } else if (useStreamMode.value) {
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

  // 處理 Ctrl+Z (Windows) 或 Cmd+Z (Mac) 復原功能
  if (
    (event.ctrlKey || event.metaKey) &&
    event.key === "z" &&
    !event.shiftKey
  ) {
    event.preventDefault();
    undoPrompt();
  }

  // 處理 Tab 鍵觸發優化提示詞功能
  if (
    event.key === "Tab" &&
    !event.shiftKey &&
    !event.ctrlKey &&
    !event.metaKey
  ) {
    // 只有在有輸入內容且不在優化中時才觸發
    if (messageText.value.trim() && !optimizingPrompt.value) {
      event.preventDefault();
      handleOptimizePrompt();
    }
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

// TODO: @ 的功能還需要測試驗証，未來想法是多個智能體可以同時被提及，但目前只允許一個智能體被提及
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

// 保存提示詞到歷史記錄
const saveToHistory = (prompt) => {
  if (
    prompt.trim() &&
    prompt !== promptHistory.value[promptHistory.value.length - 1]
  ) {
    promptHistory.value.push(prompt.trim());
    // 限制歷史記錄數量
    if (promptHistory.value.length > 10) {
      promptHistory.value.shift();
    }
  }
};

// 復原到上一個提示詞
const undoPrompt = () => {
  if (promptHistory.value.length > 0) {
    const lastPrompt = promptHistory.value.pop();
    messageText.value = lastPrompt;
    message.info("已復原到上一個提示詞");

    // Focus 到輸入框
    nextTick(() => {
      if (messageInput.value) {
        const textareaEl =
          messageInput.value.$el?.querySelector("textarea") ||
          messageInput.value.$el;
        if (textareaEl) {
          textareaEl.focus();
          textareaEl.setSelectionRange(
            textareaEl.value.length,
            textareaEl.value.length
          );
        }
      }
    });
  } else {
    message.warning("沒有可復原的提示詞");
  }
};

// 優化提示詞處理函數
const handleOptimizePrompt = async () => {
  if (!messageText.value.trim()) {
    message.warning("請先輸入提示詞");
    return;
  }

  if (messageText.value.length > 2000) {
    message.warning("提示詞長度不能超過 2000 字符");
    return;
  }

  // 如果已在優化中，防止重複調用
  if (optimizingPrompt.value) {
    return;
  }

  // 保存原始提示詞到歷史記錄
  const originalPrompt = messageText.value.trim();
  saveToHistory(originalPrompt);

  try {
    optimizingPrompt.value = true;

    // 顯示優化中的提示
    const loadingMessage = message.loading("正在優化提示詞，請稍候...", 0);

    // 調用優化 API
    const response = await optimizePrompt({
      prompt: originalPrompt,
      context: props.agent?.description || "",
    });

    // 關閉載入提示
    loadingMessage();

    if (response.success) {
      // 直接將優化結果套入輸入框
      messageText.value = response.data.optimized_prompt;

      // 顯示成功提示，包含復原選項
      const messageKey = `optimize_${Date.now()}`;
      message.success({
        content: `提示詞已優化完成！信心度: ${Math.round(response.data.confidence || 0)}% (Ctrl+Z 或 Tab 可復原)`,
        duration: 6, // 縮短顯示時間
        key: messageKey,
        btn: h(
          "a-button",
          {
            type: "text",
            size: "small",
            onClick: () => {
              undoPrompt();
              message.destroy(messageKey);
            },
          },
          "復原"
        ),
      });

      // Focus 到輸入框
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
    } else {
      // 優化失敗，恢復原始內容
      messageText.value = originalPrompt;
      message.error(response.message || "優化失敗，已恢復原始內容");
    }
  } catch (error) {
    // 發生錯誤，恢復原始內容
    messageText.value = originalPrompt;
    console.error("優化提示詞失敗:", error);

    // 根據錯誤類型顯示不同的錯誤信息
    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      message.error("優化請求超時，已恢復原始內容");
    } else if (error.response?.status >= 500) {
      message.error("服務器錯誤，已恢復原始內容");
    } else {
      message.error("優化失敗，已恢復原始內容");
    }
  } finally {
    optimizingPrompt.value = false;

    // 確保輸入框重新獲得焦點
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
  }
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

// 🎯 處理圖表生成請求
const handleGenerateChart = async (event) => {
  try {
    console.log("🎯 [ChatArea] 收到圖表生成請求:", {
      event,
      messageId: event?.messageId,
      chartData: event?.chartData,
      chartDataKeys: Object.keys(event?.chartData || {}),
      hasTitle: !!event?.chartData?.title,
      hasType: !!event?.chartData?.type,
    });

    const { messageId, chartData } = event;

    // 創建圖表消息
    const chartTitle = chartData.title || `${chartData.type || "智能"} 圖表`;
    const chartMessage = {
      id: Date.now(),
      role: "assistant",
      content: `根據數據分析，為您生成了 ${chartTitle}：`,
      created_at: new Date().toISOString(),
      metadata: {
        chartData: chartData,
        isChartMessage: true,
        sourceMessageId: messageId,
      },
      model_info: {
        model: "智能圖表生成器",
      },
    };

    // 添加到聊天記錄
    chatStore.messages.push(chartMessage);

    // 滾動到底部
    await nextTick();
    await scrollToBottomWithDelay(200);

    message.success("圖表已生成");
  } catch (error) {
    console.error("🎯 [ChatArea] 圖表生成失敗:", error);
    message.error("圖表生成失敗: " + error.message);
  }
};

// 🤖 處理智能建議應用
const handleApplySuggestion = async (suggestion) => {
  try {
    console.log("🤖 [ChatArea] 應用智能建議:", suggestion);

    if (suggestion.type === "chart") {
      // 生成圖表
      const result = await suggestion.handler();
      if (result.success) {
        // 創建圖表消息
        const chartMessage = {
          id: Date.now(),
          role: "assistant",
          content: `基於您的輸入，為您生成了 ${result.chartData.title}：`,
          created_at: new Date().toISOString(),
          metadata: {
            chartData: result.chartData,
            isChartMessage: true,
            sourceType: "smart-suggestion",
          },
          model_info: {
            model: "智能建議系統",
          },
        };

        chatStore.messages.push(chartMessage);
        await nextTick();
        await scrollToBottomWithDelay(200);

        message.success("智能圖表已生成");
        clearSuggestions();
      } else {
        message.error(result.error || "圖表生成失敗");
      }
    } else if (suggestion.type === "analysis") {
      // 執行分析
      const result = await suggestion.handler();
      if (result.success) {
        // 在輸入框中添加分析結果提示
        const analysisText = `\n\n## 📊 ${suggestion.title}\n${result.result}`;
        messageText.value += analysisText;

        message.success("分析完成，結果已添加到輸入框");
        clearSuggestions();
      } else {
        message.error(result.error || "分析失敗");
      }
    }
  } catch (error) {
    console.error("🤖 [ChatArea] 智能建議應用失敗:", error);
    message.error("建議應用失敗: " + error.message);
  }
};

//TODO 檔案上傳功能，已沒有使用，改成先預覽，再上傳
const handleFileUpload = async (file) => {
  try {
    // 檢查檔案大小 (10MB 限制)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      message.error("檔案大小不能超過 10MB");
      return false;
    }

    // 檢查檔案類型 - 使用 composable 中的判斷函數
    const fileForCheck = {
      mimeType: file.type,
      filename: file.name,
    };

    console.log("file.type", file.type);
    console.log("file.name", file.name);

    if (!isSupportedFile(fileForCheck)) {
      const fileExtension = "." + file.name.split(".").pop().toLowerCase();
      message.error(`不支援的檔案類型: ${file.type || fileExtension}`);
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

    // 檢查檔案類型 - 使用 composable 中的判斷函數
    const fileForCheck = {
      mimeType: file.type,
      filename: file.name,
    };

    if (!isSupportedFile(fileForCheck)) {
      const fileExtension = "." + file.name.split(".").pop().toLowerCase();
      message.error(`不支援的檔案類型: ${file.type || fileExtension}`);
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
    if (isImageFile(fileForCheck)) {
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

// 處理檔案關鍵要點
const handleSummarizeFile = (file) => {
  const summarizeText = `請分析這個檔案的關鍵要點`;
  if (messageText.value.trim()) {
    messageText.value += "\n\n" + summarizeText;
  } else {
    messageText.value = summarizeText;
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

// 處理生成文件
const handleGenerateDocument = (file) => {
  const generateText = `基於這個檔案內容，請生成一份完整的文件`; //：${file.filename}`;
  if (messageText.value.trim()) {
    messageText.value += "\n\n" + generateText;
  } else {
    messageText.value = generateText;
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

// PDF 專用處理函數
const handleExtractPdfText = (file) => {
  const extractText = `請提取這個 PDF 檔案中的所有文字內容`; //：${file.filename}`;
  if (messageText.value.trim()) {
    messageText.value += "\n\n" + extractText;
  } else {
    messageText.value = extractText;
  }

  setFocusToInput();
};

const handleSummarizePdf = (file) => {
  const summarizeText = `請分析並總結這個 PDF 文件的主要內容和重點`; //：${file.filename}`;
  if (messageText.value.trim()) {
    messageText.value += "\n\n" + summarizeText;
  } else {
    messageText.value = summarizeText;
  }

  setFocusToInput();
};

// Word 專用處理函數
const handleAnalyzeDocument = (file) => {
  const analyzeText = `請深度分析這個 Word 文檔的結構、內容和重點`; //：${file.filename}`;
  if (messageText.value.trim()) {
    messageText.value += "\n\n" + analyzeText;
  } else {
    messageText.value = analyzeText;
  }

  setFocusToInput();
};

const handleFormatDocument = (file) => {
  const formatText = `請整理這個 Word 文檔的格式，提供標準化的排版建議`; //：${file.filename}`;
  if (messageText.value.trim()) {
    messageText.value += "\n\n" + formatText;
  } else {
    messageText.value = formatText;
  }

  setFocusToInput();
};

// CSV 專用處理函數
const handleAnalyzeCsvData = (file) => {
  const analyzeText = `請分析這個 CSV 檔案中的數據，提供統計摘要和洞察`; //：${file.filename}`;
  if (messageText.value.trim()) {
    messageText.value += "\n\n" + analyzeText;
  } else {
    messageText.value = analyzeText;
  }

  setFocusToInput();
};

const handleGenerateChartFromCSV = (file) => {
  const chartText = `請分析這個 CSV 數據並建議適合的圖表類型，提供數據視覺化方案`; //：${file.filename}`;
  if (messageText.value.trim()) {
    messageText.value += "\n\n" + chartText;
  } else {
    messageText.value = chartText;
  }

  setFocusToInput();
};

// Excel 專用處理函數
const handleAnalyzeExcelData = (file) => {
  const analyzeText = `請深度分析這個 Excel 檔案中的所有工作表數據，提供統計摘要、數據品質評估和業務洞察`; //：${file.filename}`;
  if (messageText.value.trim()) {
    messageText.value += "\n\n" + analyzeText;
  } else {
    messageText.value = analyzeText;
  }

  setFocusToInput();
};

const handleGenerateExcelChart = (file) => {
  const chartText = `請分析這個 Excel 檔案的數據結構，建議適合的圖表類型和數據視覺化方案，考慮多個工作表之間的關係`; //：${file.filename}`;
  if (messageText.value.trim()) {
    messageText.value += "\n\n" + chartText;
  } else {
    messageText.value = chartText;
  }

  setFocusToInput();
};

const handleSummarizeExcelSheets = (file) => {
  const summaryText = `請分析這個 Excel 檔案中所有工作表的結構和用途，提供每個工作表的摘要和整體檔案的功能說明`; //：${file.filename}`;
  if (messageText.value.trim()) {
    messageText.value += "\n\n" + summaryText;
  } else {
    messageText.value = summaryText;
  }

  setFocusToInput();
};

// PowerPoint 專用處理函數
const handleAnalyzePowerpoint = (file) => {
  const analyzeText = `請分析這個 PowerPoint 簡報檔案的結構和內容，提供每張投影片的摘要和整體簡報的主題分析`; //：${file.filename}`;
  if (messageText.value.trim()) {
    messageText.value += "\n\n" + analyzeText;
  } else {
    messageText.value = analyzeText;
  }

  setFocusToInput();
};

const handleExtractSlideContent = (file) => {
  const extractText = `請提取這個 PowerPoint 簡報中所有投影片的文字內容、圖表說明和重要元素，整理成結構化的文字格式`; //：${file.filename}`;
  if (messageText.value.trim()) {
    messageText.value += "\n\n" + extractText;
  } else {
    messageText.value = extractText;
  }

  setFocusToInput();
};

const handleOptimizePresentation = (file) => {
  const optimizeText = `請分析這個 PowerPoint 簡報並提供優化建議，包括內容結構、視覺設計、邏輯流程和演講技巧方面的改善方案`; //：${file.filename}`;
  if (messageText.value.trim()) {
    messageText.value += "\n\n" + optimizeText;
  } else {
    messageText.value = optimizeText;
  }

  setFocusToInput();
};

// 文字檔案專用處理函數
const handleAnalyzeText = (file) => {
  const analyzeText = `請分析這個文字檔案的內容結構、主題和重點，提供詳細的文本分析報告`; //：${file.filename}`;
  if (messageText.value.trim()) {
    messageText.value += "\n\n" + analyzeText;
  } else {
    messageText.value = analyzeText;
  }

  setFocusToInput();
};

const handleSummarizeText = (file) => {
  const summarizeText = `請為這個文字檔案提供簡潔的內容摘要，突出關鍵信息和要點`; //：${file.filename}`;
  if (messageText.value.trim()) {
    messageText.value += "\n\n" + summarizeText;
  } else {
    messageText.value = summarizeText;
  }

  setFocusToInput();
};

// JSON 檔案專用處理函數
const handleParseJson = (file) => {
  const parseText = `請解析這個 JSON 檔案的結構，說明各個欄位的用途和數據類型`; //：${file.filename}`;
  if (messageText.value.trim()) {
    messageText.value += "\n\n" + parseText;
  } else {
    messageText.value = parseText;
  }

  setFocusToInput();
};

const handleValidateJson = (file) => {
  const validateText = `請驗證這個 JSON 檔案的格式是否正確，並檢查是否有語法錯誤或結構問題`; //：${file.filename}`;
  if (messageText.value.trim()) {
    messageText.value += "\n\n" + validateText;
  } else {
    messageText.value = validateText;
  }

  setFocusToInput();
};

// XML 檔案專用處理函數
const handleParseXml = (file) => {
  const parseText = `請解析這個 XML 檔案的結構，說明元素層次和屬性配置`; //：${file.filename}`;
  if (messageText.value.trim()) {
    messageText.value += "\n\n" + parseText;
  } else {
    messageText.value = parseText;
  }

  setFocusToInput();
};

const handleTransformXml = (file) => {
  const transformText = `請分析這個 XML 檔案並提供格式轉換建議，例如轉為 JSON 或其他結構化格式`; //：${file.filename}`;
  if (messageText.value.trim()) {
    messageText.value += "\n\n" + transformText;
  } else {
    messageText.value = transformText;
  }

  setFocusToInput();
};

// 程式碼檔案專用處理函數
const handleReviewCode = (file) => {
  const reviewText = `請對這個程式碼檔案進行詳細的代碼審查，包括代碼品質、潛在問題、安全性和最佳實踐建議`; //：${file.filename}`;
  if (messageText.value.trim()) {
    messageText.value += "\n\n" + reviewText;
  } else {
    messageText.value = reviewText;
  }

  setFocusToInput();
};

const handleExplainCode = (file) => {
  const explainText = `請詳細解釋這個程式碼檔案的功能、邏輯流程和關鍵算法，適合初學者理解`; //：${file.filename}`;
  if (messageText.value.trim()) {
    messageText.value += "\n\n" + explainText;
  } else {
    messageText.value = explainText;
  }

  setFocusToInput();
};

const handleOptimizeCode = (file) => {
  const optimizeText = `請分析這個程式碼檔案並提供性能優化建議，包括代碼重構、效率改進和可維護性提升方案`; //：${file.filename}`;
  if (messageText.value.trim()) {
    messageText.value += "\n\n" + optimizeText;
  } else {
    messageText.value = optimizeText;
  }

  setFocusToInput();
};

// 共用的設置焦點函數
const setFocusToInput = () => {
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
  if (file.preview && isImageFile(file)) {
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

// const handleShowEmoji = () => {
//   message.info("表情符號功能開發中");
// };

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

// 處理動態快速命令點擊
const handleDynamicQuickCommand = ({ key }) => {
  // 如果是動態載入的智能體快速命令
  const dynamicCommand = agentQuickCommands.value.find(
    (cmd) => cmd.id === parseInt(key)
  );
  if (dynamicCommand) {
    messageText.value = dynamicCommand.text;

    // 統計使用次數（後台進行，不影響用戶體驗）
    incrementCommandUsage(dynamicCommand.id).catch((error) => {
      console.warn("統計快速命令詞使用次數失敗:", error);
    });

    // 聚焦到輸入框
    nextTick(() => {
      const textarea = document.querySelector(".message-input textarea");
      if (textarea) {
        textarea.focus();
      }
    });
    return;
  }

  // 如果是靜態的回退命令，使用原來的邏輯 //TODO: 保留，但已經不使用
  handleQuickCommand({ key });
};

// 處理快速命令點擊（保留作為回退）
const handleQuickCommand = ({ key }) => {
  const commandMap = {
    // 數據查詢
    "query-employee": "請幫我查詢員工資料，我需要查看員工的基本信息",
    "query-department": "請幫我查詢部門信息，包括部門結構和人員分佈",
    "query-salary": "請幫我查詢薪資信息，包括薪資統計和分析",

    // 報表生成
    "report-monthly": "請幫我生成本月的月度報表，包括各項關鍵指標",
    "report-attendance": "請幫我生成考勤統計報表，分析員工出勤情況",
    "report-performance": "請幫我生成績效評估報表，評估員工表現",

    // 系統操作
    "backup-data": "請幫我執行數據備份操作，確保數據安全",
    "system-check": "請幫我進行系統檢查，確認系統運行狀態",
    "clear-cache": "請幫我清理系統緩存，優化系統性能",
  };

  const commandText = commandMap[key];
  if (commandText) {
    messageText.value = commandText;
    // 不自動發送，讓用戶自行決定是否發送
    // 可以選擇性地聚焦到輸入框
    nextTick(() => {
      const textarea = document.querySelector(".message-input textarea");
      if (textarea) {
        textarea.focus();
      }
    });
  }
};

// 獲取圖標組件
const getIconComponent = (iconName) => {
  if (!iconName) return null;

  // 常用圖標映射表
  const iconMap = {
    user: "UserOutlined",
    team: "TeamOutlined",
    dollar: "DollarOutlined",
    "file-text": "FileTextOutlined",
    calendar: "CalendarOutlined",
    trophy: "TrophyOutlined",
    "cloud-download": "CloudDownloadOutlined",
    safety: "SafetyOutlined",
    delete: "DeleteOutlined",
    book: "BookOutlined",
    heart: "HeartOutlined",
    star: "StarOutlined",
    rocket: "RocketOutlined",
    bulb: "BulbOutlined",
    setting: "SettingOutlined",
    question: "QuestionCircleOutlined",
    info: "InfoCircleOutlined",
    plus: "PlusOutlined",
    edit: "EditOutlined",
    search: "SearchOutlined",
    filter: "FilterOutlined",
    export: "ExportOutlined",
    import: "ImportOutlined",
    sync: "SyncOutlined",
    bell: "BellOutlined",
    message: "MessageOutlined",
    mail: "MailOutlined",
    phone: "PhoneOutlined",
    home: "HomeOutlined",
    shop: "ShopOutlined",
    bank: "BankOutlined",
    car: "CarOutlined",
    environment: "EnvironmentOutlined",
  };

  return iconMap[iconName] || "QuestionCircleOutlined";
};

// 處理對話面板折疊
const handleToggleConversationCollapse = () => {
  // 向父組件發送事件，讓父組件處理折疊邏輯
  emit("toggle-conversation-collapse");
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

// 獲取選中模型的提供者
const getSelectedModelProvider = () => {
  if (!selectedModelId.value) return "ollama";

  const allModels = getAllModels();
  const model = allModels.find((m) => m.id === selectedModelId.value);
  return model?.provider || "ollama";
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

// 語音輸入處理函數
const handleVoiceInput = () => {
  if (!speechSupported.value) {
    message.error(
      "您的瀏覽器不支援語音識別功能，請使用 Chrome、Edge 或 Safari 瀏覽器"
    );
    return;
  }

  if (isListening.value) {
    // 如果正在監聽，停止語音識別
    stopSpeechRecognition();
    message.success("語音輸入已停止");
  } else {
    try {
      // 開始語音識別
      startSpeechRecognition();
      message.success("開始語音輸入，請說話...", 3);
    } catch (error) {
      console.error("語音識別啟動失敗:", error);
      message.error("語音識別啟動失敗，請檢查麥克風權限");
    }
  }
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

// 存儲上次的語音識別結果，避免重複添加
const lastSpeechResult = ref("");

// 監聽語音識別結果
watch(speechResult, (newResult) => {
  if (newResult && newResult !== lastSpeechResult.value) {
    // 如果是最終結果，替換整個輸入框內容
    if (isFinal.value) {
      messageText.value = newResult;
      lastSpeechResult.value = newResult;
    } else {
      // 如果是即時結果，只顯示當前識別的內容
      const baseText = messageText.value
        .replace(lastSpeechResult.value, "")
        .trim();
      messageText.value = baseText ? `${baseText} ${newResult}` : newResult;
      lastSpeechResult.value = newResult;
    }
  }
});

// 監聽語音識別完成狀態
watch(isFinal, (final) => {
  if (final && isListening.value && speechResult.value) {
    // 當語音識別完成時，重置狀態
    lastSpeechResult.value = "";

    // 延遲停止監聽，確保完整識別
    setTimeout(() => {
      if (isListening.value) {
        stopSpeechRecognition();
        message.success("語音輸入完成");

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
      }
    }, 1500); // 延遲1.5秒停止，確保完整識別
  }
});

// 🤖 同步輸入到智能建議系統
watch(
  messageText,
  (newText) => {
    setInput(newText);
  },
  { immediate: true }
);

// 生命週期
onMounted(async () => {
  try {
    loading.value = true;

    // 確保輸入面板預設展開
    inputCollapsed.value = false;

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

  // 停止語音識別
  if (isListening.value) {
    stopSpeechRecognition();
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

// 切換輸入框折疊狀態
const handleToggleInputCollapse = () => {
  inputCollapsed.value = !inputCollapsed.value;
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
  padding: 8px 12px;
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
  gap: 6px;
}

.stream-toggle {
  margin-left: 8px;
}

.debug-active {
  background: var(--primary-color) !important;
  color: white !important;
}

.quick-commands-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--custom-text-primary);
  border: 1px solid var(--custom-border-color);
  border-radius: 6px;
  padding: 4px 12px;
  height: 32px;
  transition: all 0.2s ease;
}

.quick-commands-btn:hover {
  border-color: var(--custom-primary-color);
  color: var(--custom-primary-color);
  background-color: var(--custom-primary-color-light);
}

/* 快速命令描述樣式 */
.command-desc {
  font-size: 11px;
  color: var(--custom-text-tertiary);
  margin-left: 4px;
  opacity: 0.8;
}

/* 快速命令選單分組標題樣式 */
:deep(.ant-menu-item-group-title) {
  font-weight: 600;
  color: var(--custom-primary-color);
  font-size: 12px;
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
  position: absolute;
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

.stop-stream-button .anticon {
  transition: transform 0.3s ease;
}

.stop-stream-button:hover .anticon {
  transform: scale(1.1);
}

.message-input-area {
  border-top: 1px solid var(--custom-border-primary);
  background: var(--custom-bg-primary);
  transition: height 0.3s ease;
}

.message-input-area.input-collapsed {
  overflow: hidden;
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

.input-container.collapsed {
  padding: 8px 16px;
  height: 100%;
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

.input-wrapper.collapsed {
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
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

.input-wrapper.collapsed .input-toolbar {
  padding: 8px 16px;
  min-height: 44px;
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

.toolbar-left .ant-btn,
.toolbar-right .ant-btn {
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

/* 折疊狀態提示樣式 */
.collapsed-input-hint {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  background: var(--custom-bg-primary);
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-radius: 8px;
  margin: 4px;
}

.collapsed-input-hint:hover {
  background: var(--custom-bg-tertiary);
}

.hint-text {
  color: var(--custom-text-tertiary);
  font-size: 14px;
  font-style: italic;
  transition: color 0.2s ease;
}

.collapsed-input-hint:hover .hint-text {
  color: var(--custom-text-secondary);
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

.conversation-expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  color: var(--custom-text-secondary);
  transition: all 0.2s ease;
}

.conversation-expand-btn:hover {
  background-color: var(--custom-bg-tertiary);
  color: var(--custom-primary-color);
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
  width: 80px; /* 增加寬度以容納檔案名稱 */
  min-height: 60px; /* 使用 min-height 以容納檔案名稱 */
  border-radius: 8px;
  overflow: visible; /* 改為 visible 以顯示檔案名稱 */
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

.image-preview-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-icon-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 4px;
}

.thumbnail-icon {
  color: var(--custom-text-secondary);
  font-size: 24px;
}

/* 圖片縮圖圖標樣式 - 填滿整個卡片區域 */
.image-thumbnail-icon {
  position: relative;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  overflow: hidden;
  background: var(--custom-bg-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0; /* 移除padding讓圖片填滿整個區域 */
}

.image-thumbnail-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px; /* 與容器圓角一致 */
}

.file-name-label {
  font-size: 10px;
  color: var(--custom-text-secondary);
  text-align: center;
  max-width: 70px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
  margin-top: 2px;
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
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
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

/* 檔案快速命令按鈕樣式（放在卡片下方） */
.file-actions {
  display: flex;
  justify-content: center;
  gap: 4px;
  flex-wrap: wrap;
}

.action-btn {
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

.action-btn:hover {
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

/* 優化提示詞按鈕特殊樣式 */
.toolbar-left .ant-btn:has(.lucide-sparkles) {
  color: var(--primary-color) !important;
  transition: all 0.2s ease;
}

.toolbar-left .ant-btn:has(.lucide-sparkles):hover {
  background: rgba(24, 144, 255, 0.1) !important;
  transform: scale(1.05);
}

.toolbar-left .ant-btn:has(.lucide-sparkles):disabled {
  color: var(--custom-text-disabled) !important;
  transform: none;
}

/* 輸入區域禁用狀態樣式 */
.input-wrapper.input-disabled {
  position: relative;
}

/* 只禁用 textarea 和按鈕，保留拖拉檔案功能 */
.input-wrapper.input-disabled .message-input {
  opacity: 0.6;
  pointer-events: none;
}

.input-wrapper.input-disabled .input-toolbar {
  opacity: 0.6;
  pointer-events: none;
}

.input-wrapper.input-disabled::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.02);
  z-index: 5;
  border-radius: 12px;
  pointer-events: none;
}

/* 語音輸入按鈕樣式 */
.voice-active {
  background: rgba(255, 77, 79, 0.1) !important;
  color: #ff4d4f !important;
  border-color: rgba(255, 77, 79, 0.3) !important;
  animation: voice-pulse 1.5s infinite;
}

@keyframes voice-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 77, 79, 0.4);
  }
  70% {
    box-shadow: 0 0 0 8px rgba(255, 77, 79, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(255, 77, 79, 0);
  }
}

.voice-active:hover {
  background: rgba(255, 77, 79, 0.15) !important;
  transform: scale(1.05);
}

/* 語音監聽時的輸入框樣式 */
.voice-listening {
  background: rgba(255, 77, 79, 0.05) !important;
  border-color: rgba(255, 77, 79, 0.3) !important;
  animation: voice-input-glow 2s infinite;
}

@keyframes voice-input-glow {
  0%,
  100% {
    border-color: rgba(255, 77, 79, 0.3);
    box-shadow: 0 0 5px rgba(255, 77, 79, 0.2);
  }
  50% {
    border-color: rgba(255, 77, 79, 0.6);
    box-shadow: 0 0 15px rgba(255, 77, 79, 0.4);
  }
}

/* 優化中時的輸入框樣式 */
.message-input:disabled {
  background: var(--custom-bg-disabled) !important;
  color: var(--custom-text-disabled) !important;
  cursor: not-allowed;
}

/* 工具欄按鈕禁用狀態 */
.input-toolbar .ant-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-toolbar .ant-upload.ant-upload-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 🤖 智能建議區域樣式 */
.smart-suggestions-area {
  margin: 8px 0;
  padding: 0;
  border-radius: 8px;
  overflow: hidden;
}

.suggestion-group {
  margin-bottom: 8px;
  border: 1px solid var(--custom-border-primary);
  border-radius: 8px;
  background: var(--custom-bg-secondary);
  overflow: hidden;
}

.suggestion-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--custom-bg-tertiary);
  border-bottom: 1px solid var(--custom-border-primary);
  font-size: 13px;
  font-weight: 500;
  color: var(--custom-text-primary);
  gap: 6px;
}

.clear-btn {
  color: var(--custom-text-tertiary) !important;
  padding: 0 4px !important;
  height: auto !important;
  min-width: auto !important;
  margin-left: auto;
}

.clear-btn:hover {
  color: var(--custom-text-secondary) !important;
  background: transparent !important;
}

.suggestion-list {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: 6px;
  background: var(--custom-bg-primary);
  border: 1px solid var(--custom-border-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.suggestion-item:hover {
  background: var(--custom-bg-tertiary);
  border-color: var(--primary-color);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.15);
}

.suggestion-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: rgba(24, 144, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
  font-size: 16px;
  flex-shrink: 0;
}

.suggestion-content {
  flex: 1;
  min-width: 0;
}

.suggestion-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--custom-text-primary);
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.suggestion-desc {
  font-size: 11px;
  color: var(--custom-text-secondary);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.suggestion-confidence {
  font-size: 11px;
  color: var(--custom-text-tertiary);
  background: var(--custom-bg-secondary);
  padding: 2px 6px;
  border-radius: 10px;
  flex-shrink: 0;
}

.analyzing-indicator {
  padding: 12px;
  text-align: center;
  color: var(--custom-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--custom-bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--custom-border-primary);
  font-size: 12px;
}

/* 暗黑模式下的智能建議樣式 */
:root[data-theme="dark"] .suggestion-group {
  border-color: var(--custom-border-secondary);
  background: var(--custom-bg-primary);
}

:root[data-theme="dark"] .suggestion-header {
  background: var(--custom-bg-secondary);
  border-bottom-color: var(--custom-border-secondary);
}

:root[data-theme="dark"] .suggestion-item {
  background: var(--custom-bg-secondary);
  border-color: var(--custom-border-primary);
}

:root[data-theme="dark"] .suggestion-item:hover {
  background: var(--custom-bg-tertiary);
  border-color: #69c0ff;
  box-shadow: 0 2px 8px rgba(105, 192, 255, 0.15);
}

:root[data-theme="dark"] .suggestion-icon {
  color: #69c0ff;
  background: rgba(105, 192, 255, 0.1);
}

:root[data-theme="dark"] .analyzing-indicator {
  background: var(--custom-bg-primary);
  border-color: var(--custom-border-secondary);
}
</style>

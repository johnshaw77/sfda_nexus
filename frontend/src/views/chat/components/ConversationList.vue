<template>
  <div class="conversation-list">
    <!-- 新建對話按鈕 -->
    <!-- <div class="conversation-header">
      <a-button
        type="primary"
        block
        @click="handleCreateConversation"
        :loading="creating">
        <PlusOutlined />
        新建對話
      </a-button>
    </div> -->

    <!-- 搜索框 -->
    <div
      class="conversation-search"
      :class="{
        'fading-out': isFadingOut,
        'fading-in': props.expanding,
        hidden: props.parentCollapsed,
      }">
      <a-input
        v-model:value="searchKeyword"
        placeholder="搜尋對話..."
        @input="handleSearch"
        class="search-input">
        <template #prefix>
          <SearchOutlined />
        </template>
      </a-input>
      <a-tooltip
        v-if="!props.isMobile"
        title="摺疊對話面板"
        placement="right">
        <a-button
          type="text"
          class="collapse-btn"
          @click="handleToggleCollapse">
          <PanelLeftClose :size="18" />
        </a-button>
      </a-tooltip>
    </div>

    <!-- 對話列表 -->
    <div
      class="conversation-items"
      :class="{
        'fading-out': isFadingOut,
        'fading-in': props.expanding,
      }">
      <a-spin :spinning="loading">
        <div
          v-if="filteredConversations.length === 0"
          class="empty-state">
          <a-empty
            description="暫無對話"
            :image="Empty.PRESENTED_IMAGE_SIMPLE" />
        </div>

        <transition-group
          name="conversation-list"
          tag="div">
          <div
            v-for="conversation in filteredConversations"
            :key="conversation.id"
            class="conversation-item"
            :class="{
              active: chatStore.currentConversation?.id === conversation.id,
              pinned: conversation.is_pinned,
            }"
            @click="handleSelectConversation(conversation)">
            <!-- 對話信息 -->
            <div class="conversation-info">
              <div class="conversation-title">
                <PushpinOutlined
                  v-if="conversation.is_pinned"
                  class="pin-icon" />
                <MessageCircleMore :size="16" />
                {{ conversation.title || "新對話" }}
              </div>
              <!-- <div class="conversation-preview">
                {{ getLastMessagePreview(conversation) }} whatthis
              </div> -->
              <div class="conversation-meta">
                <!-- 智能體信息 -->
                <div
                  class="agent-info"
                  v-if="getAgentInfo(conversation)">
                  <Bot :size="12" />
                  <span class="agent-name">
                    {{
                      getAgentInfo(conversation).display_name ||
                      getAgentInfo(conversation).name
                    }}
                  </span>
                </div>
                <span class="conversation-time">
                  {{ formatChatTime(conversation.updated_at) }}
                </span>
                <span
                  v-if="conversation.unread_count > 0"
                  class="unread-count">
                  {{ conversation.unread_count }}
                </span>
              </div>
            </div>

            <!-- 操作按鈕 -->
            <div class="conversation-actions">
              <a-dropdown
                :trigger="['click']"
                placement="bottomRight">
                <a-button
                  type="text"
                  size="small"
                  @click.stop>
                  <MoreOutlined />
                </a-button>
                <template #overlay>
                  <a-menu>
                    <a-menu-item @click="handlePinConversation(conversation)">
                      <PushpinOutlined />
                      {{ conversation.is_pinned ? "取消置頂" : "置頂對話" }}
                    </a-menu-item>
                    <a-menu-item
                      @click="handleRenameConversation(conversation)">
                      <EditOutlined />
                      重命名
                    </a-menu-item>
                    <a-menu-item
                      @click="handleArchiveConversation(conversation)">
                      <InboxOutlined />
                      歸檔對話
                    </a-menu-item>
                    <a-menu-divider />
                    <a-menu-item
                      @click="handleDeleteConversation(conversation)"
                      class="danger-item">
                      <DeleteOutlined />
                      刪除對話
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </div>
          </div>
        </transition-group>
      </a-spin>
    </div>

    <!-- 重命名對話模態框 -->
    <a-modal
      v-model:open="renameModalVisible"
      title="重命名對話"
      @ok="handleConfirmRename"
      @cancel="handleCancelRename">
      <a-input
        v-model:value="newConversationTitle"
        placeholder="請輸入新的對話標題"
        @press-enter="handleConfirmRename" />
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { message, Empty } from "ant-design-vue";
// Icons are globally registered in main.js
import { useChatStore } from "@/stores/chat";
import { useAgentsStore } from "@/stores/agents";
import { useWebSocketStore } from "@/stores/websocket";
import { formatChatTime } from "@/utils/datetimeFormat";
import { PanelLeftClose, MessageCircleMore, Bot } from "lucide-vue-next";

// Define emits
const emit = defineEmits(["toggle-collapse", "conversation-selected"]);

// Define props
const props = defineProps({
  expanding: {
    type: Boolean,
    default: false,
  },
  isMobile: {
    type: Boolean,
    default: false,
  },
  parentCollapsed: {
    type: Boolean,
    default: false,
  },
});

// Store
const chatStore = useChatStore();
const agentsStore = useAgentsStore();
const wsStore = useWebSocketStore();
const router = useRouter();

// 響應式狀態
const loading = ref(false);
const creating = ref(false);
const searchKeyword = ref("");
const renameModalVisible = ref(false);
const newConversationTitle = ref("");
const currentRenameConversation = ref(null);
const isFadingOut = ref(false);

// 計算屬性
const filteredConversations = computed(() => {
  // 只顯示有標題且標題不為空的對話（已經有實際消息的對話）
  const conversationsWithTitle = chatStore.conversations.filter(
    (conversation) =>
      conversation.title &&
      conversation.title.trim() !== "" &&
      conversation.title !== "新對話"
  );

  if (!searchKeyword.value) {
    return conversationsWithTitle;
  }

  return conversationsWithTitle.filter(
    (conversation) =>
      conversation.title
        ?.toLowerCase()
        .includes(searchKeyword.value.toLowerCase()) ||
      conversation.last_message?.content
        ?.toLowerCase()
        .includes(searchKeyword.value.toLowerCase())
  );
});

// 獲取對話對應的智能體信息
const getAgentInfo = (conversation) => {
  if (!conversation.agent_id) return null;
  return agentsStore.getAgentById(conversation.agent_id);
};

// 方法
const handleToggleCollapse = () => {
  // 開始淡出動畫
  isFadingOut.value = true;

  // 等待淡出動畫完成後再摺疊側邊欄
  setTimeout(() => {
    // 通知父組件摺疊側邊欄
    emit("toggle-collapse", true);
    // 重置淡出狀態
    isFadingOut.value = false;
  }, 150); // 縮短為 150ms 的淡出時間
};

const handleCreateConversation = async () => {
  try {
    creating.value = true;
    await chatStore.handleCreateConversation();
    message.success("新對話已創建");
  } catch (error) {
    message.error("創建對話失敗");
    console.error("創建對話失敗:", error);
  } finally {
    creating.value = false;
  }
};

const handleSelectConversation = async (conversation) => {
  try {
    // 選擇對話
    await chatStore.handleSelectConversation(conversation);

    // 通知父組件
    emit("conversation-selected", conversation);

    // 導航到聊天詳細頁
    const agentInfo = getAgentInfo(conversation);
    if (agentInfo) {
      // 如果有智能體信息，導航到對應的智能體聊天頁
      await router.push(`/chat/${agentInfo.id}`);
    } else {
      // 沒有智能體信息，導航到基礎聊天頁
      await router.push("/chat");
    }
  } catch (error) {
    message.error("載入對話失敗");
    console.error("載入對話失敗:", error);
  }
};

const handleSearch = () => {
  // 搜索邏輯已在計算屬性中實現
};

const handlePinConversation = async (conversation) => {
  try {
    await chatStore.handlePinConversation(
      conversation.id,
      !conversation.is_pinned
    );
    message.success(conversation.is_pinned ? "已取消置頂" : "已置頂對話");
  } catch (error) {
    message.error("操作失敗");
    console.error("置頂操作失敗:", error);
  }
};

const handleRenameConversation = (conversation) => {
  currentRenameConversation.value = conversation;
  newConversationTitle.value = conversation.title || "";
  renameModalVisible.value = true;
};

const handleConfirmRename = async () => {
  if (!newConversationTitle.value.trim()) {
    message.warning("請輸入對話標題");
    return;
  }

  try {
    await chatStore.handleUpdateConversation(
      currentRenameConversation.value.id,
      { title: newConversationTitle.value.trim() }
    );
    message.success("對話已重命名");
    renameModalVisible.value = false;
  } catch (error) {
    message.error("重命名失敗");
    console.error("重命名失敗:", error);
  }
};

const handleCancelRename = () => {
  renameModalVisible.value = false;
  newConversationTitle.value = "";
  currentRenameConversation.value = null;
};

const handleArchiveConversation = async (conversation) => {
  try {
    await chatStore.handleArchiveConversation(conversation.id);
    message.success("對話已歸檔");
  } catch (error) {
    message.error("歸檔失敗");
    console.error("歸檔失敗:", error);
  }
};

const handleDeleteConversation = async (conversation) => {
  try {
    await chatStore.handleDeleteConversation(conversation.id);
    message.success("對話已刪除");
  } catch (error) {
    message.error("刪除失敗");
    console.error("刪除失敗:", error);
  }
};

//TODO: 這是for what ??
const getLastMessagePreview = (conversation) => {
  if (!conversation.last_message) {
    return "暫無消息";
  }

  const content = conversation.last_message.content;
  return content.length > 50 ? content.substring(0, 50) + "..." : content;
};

// 生命週期
onMounted(async () => {
  try {
    loading.value = true;
    await chatStore.handleGetConversations();
  } catch (error) {
    message.error("載入對話列表失敗");
    console.error("載入對話列表失敗:", error);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.conversation-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--custom-bg-primary);
}

.conversation-header {
  padding: 2px;
  border-bottom: 1px solid var(--custom-border-primary);
  display: flex;
  justify-content: space-between;
}

.conversation-search {
  padding: 6px 8px;
  border-bottom: 1px solid var(--custom-border-primary);
  display: flex;
  align-items: center;
  gap: 6px;
  transition:
    opacity 0.15s ease-out,
    visibility 0.15s ease-out;
}

.conversation-search.fading-out {
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none;
}

.conversation-search.hidden {
  display: none !important;
}

.conversation-search.fading-in {
  animation: fadeIn 0.3s ease-out forwards;
}

@keyframes fadeIn {
  0% {
    opacity: 0.3;
  }
  100% {
    opacity: 1;
  }
}

.collapse-btn {
  flex-shrink: 0;
  min-width: 32px !important;
  min-height: 32px !important;
  padding: 4px !important;
  border-radius: 4px;
  color: var(--custom-text-secondary);
  transition: all 0.2s;
}

.collapse-btn:hover {
  background: var(--custom-bg-tertiary);
  color: var(--custom-text-primary);
  border-radius: 6px;
  /* transform: scale(1.05); */
}

.collapse-btn:active {
  transform: scale(0.95);
}

.search-input {
  flex: 1;
}

.conversation-items {
  flex: 1;
  overflow-y: auto;
  transition:
    opacity 0.15s ease-out,
    visibility 0.15s ease-out,
    transform 0.15s ease-out;
  transform-origin: center top;
}

.conversation-items.fading-out {
  opacity: 0 !important;
  visibility: hidden !important;
  transform: scale(0.95) translateX(-30px);
  pointer-events: none;
}

/* 確保所有文字內容在淡出時都不可見 */
.conversation-items.fading-out * {
  opacity: 0 !important;
  visibility: hidden !important;
}

.conversation-search.fading-out * {
  opacity: 0 !important;
  visibility: hidden !important;
}

/* 保護摺疊按鈕在動畫期間依然可見 */
.conversation-search.fading-out .collapse-btn {
  opacity: 1 !important;
  visibility: visible !important;
}

.conversation-items.fading-in {
  animation: fadeInSlideDown 0.3s ease-out forwards;
}

@keyframes fadeInSlideDown {
  0% {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
}

.conversation-item {
  padding: 16px 8px 6px 20px;
  border-bottom: 1px solid var(--custom-border-primary);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
}

.conversation-item:hover {
  background: var(--custom-bg-tertiary);
}

.conversation-item.active {
  background: var(--custom-bg-tertiary);
  border-right: 3px solid var(--primary-color);
  position: relative;
}
/* 
.conversation-item.active::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--primary-color);
  border-radius: 0 2px 2px 0;
} */

.conversation-item.pinned {
  background: var(--custom-bg-secondary);
  border-left: 2px solid #faad14;
}

.conversation-info {
  flex: 1;
  min-width: 0;
}

.conversation-title {
  font-weight: 500;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pin-icon {
  color: #faad14;
  font-size: 12px;
}

.conversation-preview {
  color: #666;
  font-size: 12px;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.agent-info {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--custom-bg-secondary);
  border: 1px solid var(--custom-border-primary);
  border-radius: 12px;
  padding: 2px 6px;
  font-size: 10px;
  color: var(--primary-color);
  flex-shrink: 0;
}

.agent-name {
  font-weight: 500;
  max-width: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-time {
  color: #999;
  font-size: 11px;
  padding-top: 6px;
  flex-shrink: 0;
}

.unread-count {
  background: #ff4d4f;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 16px;
  text-align: center;
}

.conversation-actions {
  opacity: 0;
  transition: opacity 0.2s;
}

.conversation-item:hover .conversation-actions {
  opacity: 1;
}

.danger-item {
  color: #ff4d4f !important;
}

/* 對話列表動畫效果 */
.conversation-list-enter-active {
  transition: all 0.5s ease-out;
}

.conversation-list-leave-active {
  transition: all 0.3s ease-in;
}

.conversation-list-enter-from {
  opacity: 0;
  transform: translateX(-30px) scale(0.95);
}

.conversation-list-leave-to {
  opacity: 0;
  transform: translateX(30px) scale(0.95);
}

.conversation-list-move {
  transition: transform 0.3s ease;
}

/* 新增對話項目的脈動效果 */
.conversation-item.conversation-list-enter-active {
  animation: pulse-glow 0.9s ease-out;
}

@keyframes pulse-glow {
  0% {
    transform: translateX(-30px) scale(0.95);
    opacity: 0;
    box-shadow: 0 0 0 0 var(--primary-color);
  }
  50% {
    transform: translateX(-10px) scale(1.02);
    opacity: 0.8;
    box-shadow: 0 0 20px 0 rgba(24, 144, 255, 0.3);
  }
  100% {
    transform: translateX(0) scale(1);
    opacity: 1;
    box-shadow: 0 0 0 0 transparent;
  }
}
</style>

<template>
  <div class="conversation-list">
    <!-- 新建對話按鈕 -->
    <div class="conversation-header">
      <a-button 
        type="primary" 
        block 
        @click="handleCreateConversation"
        :loading="creating"
      >
        <PlusOutlined />
        新建對話
      </a-button>
    </div>

    <!-- 搜索框 -->
    <div class="conversation-search">
      <a-input
        v-model:value="searchKeyword"
        placeholder="搜索對話..."
        @input="handleSearch"
      >
        <template #prefix>
          <SearchOutlined />
        </template>
      </a-input>
    </div>

    <!-- 對話列表 -->
    <div class="conversation-items">
      <a-spin :spinning="loading">
        <div v-if="filteredConversations.length === 0" class="empty-state">
          <a-empty 
            description="暫無對話"
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
          />
        </div>
        
        <div 
          v-for="conversation in filteredConversations" 
          :key="conversation.id"
          class="conversation-item"
          :class="{ 
            'active': chatStore.currentConversation?.id === conversation.id,
            'pinned': conversation.is_pinned 
          }"
          @click="handleSelectConversation(conversation)"
        >
          <!-- 對話信息 -->
          <div class="conversation-info">
            <div class="conversation-title">
              <PushpinOutlined v-if="conversation.is_pinned" class="pin-icon" />
              {{ conversation.title || '新對話' }}
            </div>
            <div class="conversation-preview">
              {{ getLastMessagePreview(conversation) }}
            </div>
            <div class="conversation-meta">
              <span class="conversation-time">
                {{ formatTime(conversation.updated_at) }}
              </span>
              <span v-if="conversation.unread_count > 0" class="unread-count">
                {{ conversation.unread_count }}
              </span>
            </div>
          </div>

          <!-- 操作按鈕 -->
          <div class="conversation-actions">
            <a-dropdown :trigger="['click']" placement="bottomRight">
              <a-button type="text" size="small" @click.stop>
                <MoreOutlined />
              </a-button>
              <template #overlay>
                <a-menu>
                  <a-menu-item @click="handlePinConversation(conversation)">
                    <PushpinOutlined />
                    {{ conversation.is_pinned ? '取消置頂' : '置頂對話' }}
                  </a-menu-item>
                  <a-menu-item @click="handleRenameConversation(conversation)">
                    <EditOutlined />
                    重命名
                  </a-menu-item>
                  <a-menu-item @click="handleArchiveConversation(conversation)">
                    <InboxOutlined />
                    歸檔對話
                  </a-menu-item>
                  <a-menu-divider />
                  <a-menu-item 
                    @click="handleDeleteConversation(conversation)"
                    class="danger-item"
                  >
                    <DeleteOutlined />
                    刪除對話
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </div>
        </div>
      </a-spin>
    </div>

    <!-- 重命名對話模態框 -->
    <a-modal
      v-model:open="renameModalVisible"
      title="重命名對話"
      @ok="handleConfirmRename"
      @cancel="handleCancelRename"
    >
      <a-input
        v-model:value="newConversationTitle"
        placeholder="請輸入新的對話標題"
        @press-enter="handleConfirmRename"
      />
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { message, Empty } from 'ant-design-vue'
import {
  PlusOutlined,
  SearchOutlined,
  MoreOutlined,
  PushpinOutlined,
  EditOutlined,
  InboxOutlined,
  DeleteOutlined
} from '@ant-design/icons-vue'
import { useChatStore } from '@/store/chat'
import { useWebSocketStore } from '@/store/websocket'

// Store
const chatStore = useChatStore()
const wsStore = useWebSocketStore()

// 響應式狀態
const loading = ref(false)
const creating = ref(false)
const searchKeyword = ref('')
const renameModalVisible = ref(false)
const newConversationTitle = ref('')
const currentRenameConversation = ref(null)

// 計算屬性
const filteredConversations = computed(() => {
  if (!searchKeyword.value) {
    return chatStore.conversations
  }
  
  return chatStore.conversations.filter(conversation => 
    conversation.title?.toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
    conversation.last_message?.content?.toLowerCase().includes(searchKeyword.value.toLowerCase())
  )
})

// 方法
const handleCreateConversation = async () => {
  try {
    creating.value = true
    await chatStore.handleCreateConversation()
    message.success('新對話已創建')
  } catch (error) {
    message.error('創建對話失敗')
    console.error('創建對話失敗:', error)
  } finally {
    creating.value = false
  }
}

const handleSelectConversation = async (conversation) => {
  try {
    await chatStore.handleSelectConversation(conversation.id)
  } catch (error) {
    message.error('切換對話失敗')
    console.error('切換對話失敗:', error)
  }
}

const handleSearch = () => {
  // 搜索邏輯已在計算屬性中實現
}

const handlePinConversation = async (conversation) => {
  try {
    await chatStore.handlePinConversation(conversation.id, !conversation.is_pinned)
    message.success(conversation.is_pinned ? '已取消置頂' : '已置頂對話')
  } catch (error) {
    message.error('操作失敗')
    console.error('置頂操作失敗:', error)
  }
}

const handleRenameConversation = (conversation) => {
  currentRenameConversation.value = conversation
  newConversationTitle.value = conversation.title || ''
  renameModalVisible.value = true
}

const handleConfirmRename = async () => {
  if (!newConversationTitle.value.trim()) {
    message.warning('請輸入對話標題')
    return
  }
  
  try {
    await chatStore.handleUpdateConversation(
      currentRenameConversation.value.id,
      { title: newConversationTitle.value.trim() }
    )
    message.success('對話已重命名')
    renameModalVisible.value = false
  } catch (error) {
    message.error('重命名失敗')
    console.error('重命名失敗:', error)
  }
}

const handleCancelRename = () => {
  renameModalVisible.value = false
  newConversationTitle.value = ''
  currentRenameConversation.value = null
}

const handleArchiveConversation = async (conversation) => {
  try {
    await chatStore.handleArchiveConversation(conversation.id)
    message.success('對話已歸檔')
  } catch (error) {
    message.error('歸檔失敗')
    console.error('歸檔失敗:', error)
  }
}

const handleDeleteConversation = async (conversation) => {
  try {
    await chatStore.handleDeleteConversation(conversation.id)
    message.success('對話已刪除')
  } catch (error) {
    message.error('刪除失敗')
    console.error('刪除失敗:', error)
  }
}

const getLastMessagePreview = (conversation) => {
  if (!conversation.last_message) {
    return '暫無消息'
  }
  
  const content = conversation.last_message.content
  return content.length > 50 ? content.substring(0, 50) + '...' : content
}

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  
  // 今天
  if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString('zh-TW', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }
  
  // 昨天
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.getDate() === yesterday.getDate()) {
    return '昨天'
  }
  
  // 本週
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString('zh-TW', { weekday: 'short' })
  }
  
  // 更早
  return date.toLocaleDateString('zh-TW', { 
    month: 'short', 
    day: 'numeric' 
  })
}

// 生命週期
onMounted(async () => {
  try {
    loading.value = true
    await chatStore.handleLoadConversations()
  } catch (error) {
    message.error('載入對話列表失敗')
    console.error('載入對話列表失敗:', error)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.conversation-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.conversation-header {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.conversation-search {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.conversation-items {
  flex: 1;
  overflow-y: auto;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
}

.conversation-item {
  padding: 12px 16px;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
}

.conversation-item:hover {
  background: #f8f9fa;
}

.conversation-item.active {
  background: #e6f7ff;
  border-right: 3px solid #1890ff;
}

.conversation-item.pinned {
  background: #fffbe6;
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
}

.conversation-time {
  color: #999;
  font-size: 11px;
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

/* 滾動條樣式 */
.conversation-items::-webkit-scrollbar {
  width: 4px;
}

.conversation-items::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.conversation-items::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 2px;
}

.conversation-items::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style> 
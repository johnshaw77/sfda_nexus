<template>
  <div class="welcome-screen">
    <div class="welcome-content">
      <!-- Logo 和標題 -->
      <div class="welcome-header">
        <div class="logo">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="40" r="35" fill="#1890ff" opacity="0.1"/>
            <circle cx="40" cy="40" r="25" fill="#1890ff" opacity="0.2"/>
            <circle cx="40" cy="40" r="15" fill="#1890ff"/>
            <path d="M32 35h16v2H32v-2zm0 4h12v2H32v-2zm0 4h8v2H32v-2z" fill="white"/>
          </svg>
        </div>
        <h1 class="welcome-title">歡迎使用 SFDA Nexus</h1>
        <p class="welcome-subtitle">企業級 AI 聊天助手，讓工作更高效</p>
      </div>

      <!-- 功能介紹 -->
      <div class="feature-grid">
        <div class="feature-card">
          <div class="feature-icon">
            <MessageOutlined />
          </div>
          <h3>智能對話</h3>
          <p>與 AI 助手進行自然對話，獲得專業建議和解答</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">
            <TeamOutlined />
          </div>
          <h3>多角色支持</h3>
          <p>選擇不同的 AI 智能體，滿足各種工作場景需求</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">
            <ThunderboltOutlined />
          </div>
          <h3>實時響應</h3>
          <p>基於 WebSocket 的實時通信，快速獲得回應</p>
        </div>

        <div class="feature-card">
          <div class="feature-icon">
            <SafetyOutlined />
          </div>
          <h3>安全可靠</h3>
          <p>企業級安全保障，保護您的數據隱私</p>
        </div>
      </div>

      <!-- 快速開始 -->
      <div class="quick-start">
        <h2>快速開始</h2>
        <div class="start-options">
          <a-button 
            type="primary" 
            size="large" 
            @click="handleCreateConversation"
            :loading="creating"
          >
            <PlusOutlined />
            開始新對話
          </a-button>
          
          <a-button 
            size="large" 
            @click="handleShowExamples"
          >
            <BulbOutlined />
            查看示例
          </a-button>
        </div>
      </div>

      <!-- 示例對話 -->
      <div v-if="showExamples" class="examples-section">
        <h3>示例對話</h3>
        <div class="example-grid">
          <div 
            v-for="example in examples" 
            :key="example.id"
            class="example-card"
            @click="handleUseExample(example)"
          >
            <div class="example-icon">
              <component :is="example.icon" />
            </div>
            <div class="example-content">
              <h4>{{ example.title }}</h4>
              <p>{{ example.description }}</p>
              <div class="example-prompt">
                "{{ example.prompt }}"
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 使用提示 -->
      <div class="tips-section">
        <h3>使用提示</h3>
        <div class="tips-list">
          <div class="tip-item">
            <CheckCircleOutlined class="tip-icon" />
            <span>點擊左上角的「新建對話」開始與 AI 對話</span>
          </div>
          <div class="tip-item">
            <CheckCircleOutlined class="tip-icon" />
            <span>可以在對話中切換不同的 AI 模型和智能體</span>
          </div>
          <div class="tip-item">
            <CheckCircleOutlined class="tip-icon" />
            <span>支持置頂、重命名和歸檔對話，方便管理</span>
          </div>
          <div class="tip-item">
            <CheckCircleOutlined class="tip-icon" />
            <span>使用搜索功能快速找到歷史對話</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  MessageOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  PlusOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  CodeOutlined,
  FileTextOutlined,
  CalculatorOutlined,
  TranslationOutlined
} from '@ant-design/icons-vue'
import { useChatStore } from '@/store/chat'

// Store
const chatStore = useChatStore()

// 響應式狀態
const creating = ref(false)
const showExamples = ref(false)

// 示例對話數據
const examples = ref([
  {
    id: 1,
    title: '代碼審查',
    description: '讓 AI 幫助審查和優化代碼',
    prompt: '請幫我審查這段 JavaScript 代碼，並提供優化建議',
    icon: CodeOutlined
  },
  {
    id: 2,
    title: '文檔撰寫',
    description: '協助撰寫技術文檔和報告',
    prompt: '幫我撰寫一份關於新功能的技術文檔',
    icon: FileTextOutlined
  },
  {
    id: 3,
    title: '數據分析',
    description: '分析數據並提供洞察',
    prompt: '請分析這組銷售數據，並提供改進建議',
    icon: CalculatorOutlined
  },
  {
    id: 4,
    title: '語言翻譯',
    description: '多語言翻譯和本地化',
    prompt: '請將這段文字翻譯成英文，並保持專業語調',
    icon: TranslationOutlined
  }
])

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

const handleShowExamples = () => {
  showExamples.value = !showExamples.value
}

const handleUseExample = async (example) => {
  try {
    creating.value = true
    await chatStore.handleCreateConversation()
    
    // 發送示例消息
    setTimeout(() => {
      chatStore.handleSendMessage(example.prompt)
    }, 500)
    
    message.success('已創建新對話並發送示例消息')
  } catch (error) {
    message.error('創建對話失敗')
    console.error('創建對話失敗:', error)
  } finally {
    creating.value = false
  }
}
</script>

<style scoped>
.welcome-screen {
  height: 100%;
  overflow-y: auto;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.welcome-content {
  max-width: 800px;
  width: 100%;
  text-align: center;
}

.welcome-header {
  margin-bottom: 48px;
}

.logo {
  margin-bottom: 24px;
  display: flex;
  justify-content: center;
}

.welcome-title {
  font-size: 32px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 12px;
}

.welcome-subtitle {
  font-size: 16px;
  color: #666;
  margin: 0;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
  margin-bottom: 48px;
}

.feature-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.feature-icon {
  font-size: 32px;
  color: #1890ff;
  margin-bottom: 16px;
}

.feature-card h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #1a1a1a;
}

.feature-card p {
  font-size: 14px;
  color: #666;
  margin: 0;
  line-height: 1.5;
}

.quick-start {
  background: white;
  padding: 32px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 32px;
}

.quick-start h2 {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 24px;
  color: #1a1a1a;
}

.start-options {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.examples-section {
  background: white;
  padding: 32px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 32px;
  text-align: left;
}

.examples-section h3 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 24px;
  color: #1a1a1a;
  text-align: center;
}

.example-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.example-card {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  gap: 12px;
}

.example-card:hover {
  border-color: #1890ff;
  background: #f6ffed;
}

.example-icon {
  font-size: 20px;
  color: #1890ff;
  flex-shrink: 0;
  margin-top: 2px;
}

.example-content h4 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
  color: #1a1a1a;
}

.example-content p {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.example-prompt {
  font-size: 13px;
  color: #1890ff;
  font-style: italic;
  background: #f0f8ff;
  padding: 8px;
  border-radius: 4px;
  border-left: 3px solid #1890ff;
}

.tips-section {
  background: white;
  padding: 32px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-align: left;
}

.tips-section h3 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 24px;
  color: #1a1a1a;
  text-align: center;
}

.tips-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tip-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: #666;
}

.tip-icon {
  color: #52c41a;
  font-size: 16px;
  flex-shrink: 0;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .welcome-content {
    padding: 0 16px;
  }
  
  .welcome-title {
    font-size: 24px;
  }
  
  .feature-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .quick-start,
  .examples-section,
  .tips-section {
    padding: 24px;
  }
  
  .start-options {
    flex-direction: column;
    align-items: center;
  }
  
  .example-grid {
    grid-template-columns: 1fr;
  }
}

/* 滾動條樣式 */
.welcome-screen::-webkit-scrollbar {
  width: 6px;
}

.welcome-screen::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.welcome-screen::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.welcome-screen::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style> 
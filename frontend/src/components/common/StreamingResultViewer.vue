<template>
  <div class="streaming-result-viewer">
    <!-- 進度指示器 -->
    <div v-if="isStreaming" class="streaming-progress">
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: `${progress}%` }"
        ></div>
      </div>
      <div class="progress-text">
        {{ currentStageText }}
      </div>
    </div>

    <!-- 流式內容展示 -->
    <div class="streaming-content">
      <div
        v-for="(section, index) in visibleSections"
        :key="section.id"
        class="result-section"
        :class="[`section-${section.type}`, { 'section-animating': section.isAnimating }]"
      >
        <!-- 階段圖標和標題 -->
        <div class="section-header">
          <div class="section-icon">
            <component :is="section.icon" :spin="section.isAnimating" />
          </div>
          <h4 class="section-title">{{ section.title }}</h4>
          <div v-if="section.isAnimating" class="typing-indicator">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>

        <!-- 階段內容 -->
        <div class="section-content">
          <div
            v-if="section.type === 'data-overview'"
            class="data-overview-content"
          >
            <div class="data-stats">
              <div class="stat-item">
                <span class="stat-label">樣本數量：</span>
                <span class="stat-value">{{ section.content.sampleSize }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">檢定類型：</span>
                <span class="stat-value">{{ section.content.testType }}</span>
              </div>
              <div v-if="section.content.alpha" class="stat-item">
                <span class="stat-label">顯著性水準：</span>
                <span class="stat-value">α = {{ section.content.alpha }}</span>
              </div>
            </div>
          </div>

          <div
            v-else-if="section.type === 'calculation'"
            class="calculation-content"
          >
            <div class="calculation-steps">
              <div v-for="step in section.content.steps" :key="step.name" class="calc-step">
                <span class="step-name">{{ step.name }}：</span>
                <span class="step-value">{{ step.value }}</span>
              </div>
            </div>
          </div>

          <div
            v-else-if="section.type === 'results'"
            class="results-content"
          >
            <div class="result-metrics">
              <div class="metric-card" :class="section.content.significance">
                <div class="metric-label">t 統計量</div>
                <div class="metric-value">{{ section.content.tStatistic }}</div>
              </div>
              <div class="metric-card" :class="section.content.significance">
                <div class="metric-label">p 值</div>
                <div class="metric-value">{{ section.content.pValue }}</div>
              </div>
              <div v-if="section.content.confidenceInterval" class="metric-card">
                <div class="metric-label">95% 信賴區間</div>
                <div class="metric-value">{{ section.content.confidenceInterval }}</div>
              </div>
            </div>
          </div>

          <div
            v-else-if="section.type === 'interpretation'"
            class="interpretation-content"
          >
            <div class="interpretation-text">
              <p class="conclusion" :class="section.content.significance">
                {{ section.content.conclusion }}
              </p>
              <p class="explanation">
                {{ section.content.explanation }}
              </p>
            </div>
          </div>

          <div
            v-else-if="section.type === 'recommendations'"
            class="recommendations-content"
          >
            <div class="recommendations-list">
              <div v-for="rec in section.content.recommendations" :key="rec.type" class="recommendation-item">
                <component :is="rec.icon" class="rec-icon" />
                <div class="rec-content">
                  <div class="rec-title">{{ rec.title }}</div>
                  <div class="rec-description">{{ rec.description }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 通用文本內容 -->
          <div
            v-else
            class="text-content"
          >
            <div class="animated-text">
              {{ displayedText }}
              <span v-if="section.isAnimating" class="text-cursor">|</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 跳過動畫按鈕 -->
    <div v-if="isStreaming" class="skip-animation">
      <a-button type="link" size="small" @click="skipAnimation">
        跳過動畫
      </a-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'

const props = defineProps({
  data: {
    type: Object,
    required: true
  },
  autoStart: {
    type: Boolean,
    default: true
  },
  animationSpeed: {
    type: Number,
    default: 1000 // 每個階段的間隔時間（毫秒）
  }
})

const emit = defineEmits(['complete', 'stage-complete'])

// 響應式數據
const isStreaming = ref(false)
const currentStageIndex = ref(-1)
const visibleSections = ref([])
const displayedText = ref('')
const currentTextIndex = ref(0)

// 計算屬性
const progress = computed(() => {
  if (!props.data.sections || props.data.sections.length === 0) return 0
  return ((currentStageIndex.value + 1) / props.data.sections.length) * 100
})

const currentStageText = computed(() => {
  if (currentStageIndex.value < 0) return '準備分析...'
  if (currentStageIndex.value >= props.data.sections.length) return '分析完成'
  return props.data.sections[currentStageIndex.value]?.title || '處理中...'
})

// 方法
const startStreaming = async () => {
  if (!props.data.sections || props.data.sections.length === 0) return
  
  isStreaming.value = true
  visibleSections.value = []
  currentStageIndex.value = -1
  
  for (let i = 0; i < props.data.sections.length; i++) {
    currentStageIndex.value = i
    const section = { ...props.data.sections[i] }
    section.isAnimating = true
    section.id = `section-${i}-${Date.now()}`
    
    visibleSections.value.push(section)
    
    // 等待動畫
    await new Promise(resolve => setTimeout(resolve, props.animationSpeed))
    
    // 停止動畫
    section.isAnimating = false
    
    emit('stage-complete', { index: i, section })
  }
  
  isStreaming.value = false
  emit('complete')
}

const skipAnimation = () => {
  if (!props.data.sections) return
  
  isStreaming.value = false
  visibleSections.value = props.data.sections.map((section, index) => ({
    ...section,
    id: `section-${index}-${Date.now()}`,
    isAnimating: false
  }))
  currentStageIndex.value = props.data.sections.length
  emit('complete')
}

// 監聽數據變化
watch(() => props.data, (newData) => {
  if (newData && props.autoStart) {
    nextTick(() => {
      startStreaming()
    })
  }
}, { immediate: true })

// 暴露方法給父組件
defineExpose({
  startStreaming,
  skipAnimation
})
</script>

<style scoped>
.streaming-result-viewer {
  width: 100%;
  max-width: 100%;
}

.streaming-progress {
  margin-bottom: 16px;
  padding: 12px;
  background: var(--custom-bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--custom-border-primary);
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: var(--custom-bg-tertiary);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #1890ff, #52c41a);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: var(--custom-text-secondary);
  text-align: center;
}

.streaming-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.result-section {
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--custom-border-primary);
  background: var(--custom-bg-container);
  opacity: 0;
  transform: translateY(10px);
  animation: fadeInUp 0.5s ease forwards;
}

.section-animating {
  border-color: var(--primary-color);
  box-shadow: 0 0 8px rgba(24, 144, 255, 0.2);
}

@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.section-icon {
  font-size: 18px;
  color: var(--primary-color);
}

.section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--custom-text-primary);
}

.typing-indicator {
  display: flex;
  gap: 2px;
  margin-left: auto;
}

.typing-indicator .dot {
  width: 4px;
  height: 4px;
  background: var(--primary-color);
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator .dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator .dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 80%, 100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  40% {
    opacity: 1;
    transform: scale(1);
  }
}

.section-content {
  color: var(--custom-text-primary);
}

/* 數據概覽樣式 */
.data-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-label {
  color: var(--custom-text-secondary);
  font-size: 14px;
}

.stat-value {
  font-weight: 600;
  color: var(--primary-color);
}

/* 計算步驟樣式 */
.calculation-steps {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.calc-step {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--custom-bg-secondary);
  border-radius: 6px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 13px;
}

.step-name {
  color: var(--custom-text-secondary);
  min-width: 120px;
}

.step-value {
  font-weight: 600;
  color: var(--custom-text-primary);
}

/* 結果指標樣式 */
.result-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.metric-card {
  padding: 12px;
  border-radius: 8px;
  text-align: center;
  background: var(--custom-bg-secondary);
  border: 1px solid var(--custom-border-primary);
}

.metric-card.significant {
  border-color: #f5222d;
  background: rgba(245, 34, 45, 0.05);
}

.metric-card.not-significant {
  border-color: #52c41a;
  background: rgba(82, 196, 26, 0.05);
}

.metric-label {
  font-size: 12px;
  color: var(--custom-text-secondary);
  margin-bottom: 4px;
}

.metric-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--custom-text-primary);
}

/* 解釋內容樣式 */
.interpretation-text {
  line-height: 1.6;
}

.conclusion {
  font-weight: 600;
  margin-bottom: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  border-left: 4px solid var(--custom-border-primary);
}

.conclusion.significant {
  border-left-color: #f5222d;
  background: rgba(245, 34, 45, 0.05);
  color: #f5222d;
}

.conclusion.not-significant {
  border-left-color: #52c41a;
  background: rgba(82, 196, 26, 0.05);
  color: #52c41a;
}

.explanation {
  color: var(--custom-text-secondary);
  margin: 0;
}

/* 建議列表樣式 */
.recommendations-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recommendation-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: var(--custom-bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--custom-border-primary);
}

.rec-icon {
  font-size: 16px;
  color: var(--primary-color);
  margin-top: 2px;
}

.rec-content {
  flex: 1;
}

.rec-title {
  font-weight: 600;
  color: var(--custom-text-primary);
  margin-bottom: 4px;
}

.rec-description {
  font-size: 14px;
  color: var(--custom-text-secondary);
  line-height: 1.5;
}

/* 通用文本樣式 */
.animated-text {
  line-height: 1.6;
}

.text-cursor {
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* 跳過按鈕 */
.skip-animation {
  margin-top: 12px;
  text-align: center;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .result-metrics {
    grid-template-columns: 1fr;
  }
  
  .data-stats {
    flex-direction: column;
    gap: 8px;
  }
  
  .recommendation-item {
    flex-direction: column;
    gap: 8px;
  }
}
</style> 
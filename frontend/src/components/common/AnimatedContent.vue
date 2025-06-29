<template>
  <div class="animated-content-wrapper" ref="wrapperRef">
    <!-- 動畫狀態：隨機字符塊打字效果 -->
    <div 
      v-if="isAnimating && displayedChunks.length > 0" 
      class="animated-content"
      ref="animatedContentRef">
      <span
        v-for="(chunk, index) in displayedChunks"
        :key="index"
        class="animated-chunk"
        :class="{
          'fade-effect': enableGradientEffect
        }"
        :style="{ animationDelay: `${index * 0.05}s` }">
        {{ chunk.content }}
      </span>
      <!-- 打字機游標 -->
      <span class="typing-cursor">|</span>
    </div>

    <!-- 動畫完成後顯示完整內容 -->
    <CodeHighlight
      v-else-if="!isAnimating && content"
      :content="content"
      :is-streaming="false"
      :enable-keyword-highlight="true"
      theme="auto"
      :debug="false"
      :realtime-render="true"
      ref="codeHighlightRef" />
      
    <!-- 等待動畫開始時的占位符 -->
    <div v-else-if="isAnimating && displayedChunks.length === 0" class="animation-placeholder">
      <!-- 空佔位，不影響布局 -->
    </div>
    
    <!-- 兜底顯示 -->
    <div v-else class="fallback-content">
      {{ content || '準備中...' }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useScroll, useElementSize, useIntersectionObserver } from '@vueuse/core'
import CodeHighlight from './CodeHighlight.vue'

const props = defineProps({
  content: {
    type: String,
    required: true
  },
  enableAnimation: {
    type: Boolean,
    default: true
  },
  animationDelay: {
    type: Number,
    default: 30 // 每個字符組間隔30ms，更快的打字效果
  },
  animationSpeed: {
    type: String,
    default: 'normal', // slow, normal, fast, turbo
    validator: (value) => ['slow', 'normal', 'fast', 'turbo'].includes(value)
  },
  chunkSizeRange: {
    type: Array,
    default: () => [8, 30] // 每次顯示8-30個字符的隨機範圍，增加塊大小
  },
  enableGradientEffect: {
    type: Boolean,
    default: true // 是否啟用漸層效果
  }
})

const emit = defineEmits(['animation-complete'])

// 響應式數據
const isAnimating = ref(false)
const fullContent = ref('')
const displayedChunks = ref([]) // 存儲已顯示的字符塊
const animatedContentRef = ref(null)
const codeHighlightRef = ref(null)
const wrapperRef = ref(null)

// 簡單的 markdown 格式化函數
const formatMarkdown = (text) => {
  if (!text) return ''
  
  let formatted = text
  
  // 標題格式化
  formatted = formatted.replace(/^### (.*$)/gm, '<h3>$1</h3>')
  formatted = formatted.replace(/^## (.*$)/gm, '<h2>$1</h2>')
  formatted = formatted.replace(/^# (.*$)/gm, '<h1>$1</h1>')
  
  // 粗體
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  
  // 斜體
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>')
  
  // 代碼塊（行內）
  formatted = formatted.replace(/`(.*?)`/g, '<code>$1</code>')
  
  // 列表項
  formatted = formatted.replace(/^[\-\*\+] (.*)$/gm, '<li>$1</li>')
  
  // 數字列表
  formatted = formatted.replace(/^\d+\. (.*)$/gm, '<li>$1</li>')
  
  return formatted
}

// 使用 VueUse 的滾動系統
const userIsScrolling = ref(false)
const scrollTimeout = ref(null)
const shouldFollowAnimation = ref(true)

// 找到滾動容器
const findScrollContainer = () => {
  if (!wrapperRef.value) return null
  
  let container = wrapperRef.value.parentElement
  while (container && container !== document.body) {
    const style = window.getComputedStyle(container)
    if (
      style.overflow === 'auto' || 
      style.overflow === 'scroll' || 
      style.overflowY === 'auto' || 
      style.overflowY === 'scroll' ||
      container.scrollHeight > container.clientHeight
    ) {
      return container
    }
    container = container.parentElement
  }
  return document.documentElement
}

// 使用 VueUse 的滾動功能
const scrollContainer = ref(null)
const { x, y, isScrolling, arrivedState, directions } = useScroll(scrollContainer, {
  behavior: 'auto', // 使用 auto 獲得即時響應
  throttle: 30 // 平衡的更新頻率，約33fps
})

// 預先滾動到動畫內容底部，為新文字預留空間
const followAnimationProgress = () => {
  if (!shouldFollowAnimation.value || userIsScrolling.value) {
    return
  }
  
  // 確保滾動容器是最新的
  if (!scrollContainer.value) {
    scrollContainer.value = findScrollContainer()
  }
  
  if (scrollContainer.value && wrapperRef.value) {
    const container = scrollContainer.value
    const wrapper = wrapperRef.value
    
    // 獲取當前可見動畫區域的實際高度
    const animatedContent = wrapper.querySelector('.animated-content')
    if (!animatedContent) return
    
    const animatedRect = animatedContent.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    
    // 計算動畫內容相對於容器的位置
    const contentBottom = animatedRect.bottom
    const containerBottom = containerRect.bottom
    
    console.log('預先滾動檢查', {
      contentBottom,
      containerBottom,
      currentScroll: y.value,
      displayedChunks: displayedChunks.value.length
    })
    
    // 精準滾動策略：保持動畫內容在可視區域下部
    const targetOffset = 80 // 預留空間高度，調整為適中
    const overflow = contentBottom - (containerBottom - targetOffset)
    
    if (overflow > 10) { // 降低觸發閾值，更早開始滾動
      const currentScroll = y.value
      
      // 計算適中的滾動增量：既不太快也不太慢
      const scrollRatio = 0.6 // 滾動60%的溢出量，保持文字可見
      const scrollIncrement = Math.max(Math.min(overflow * scrollRatio, 60), 15) // 15-60px之間
      const targetScroll = currentScroll + scrollIncrement
      
      console.log('執行精準預先滾動', {
        from: currentScroll,
        to: targetScroll,
        displayedChunks: displayedChunks.value.length,
        overflow,
        scrollIncrement,
        targetOffset
      })
      
      // 精準滾動到目標位置
      y.value = targetScroll
    }
  }
}

// 監聽用戶滾動行為 - 加入防抖，避免自動滾動被誤判
let userScrollDebounce = null
watch(isScrolling, (scrolling) => {
  if (scrolling) {
    // 清除防抖計時器
    if (userScrollDebounce) {
      clearTimeout(userScrollDebounce)
    }
    
    // 100ms 後才認為是真正的用戶滾動（避免自動滾動被誤判，但更快響應）
    userScrollDebounce = setTimeout(() => {
      userIsScrolling.value = true
      shouldFollowAnimation.value = false
      console.log('檢測到用戶滾動，暫停自動跟隨')
      
      // 清除之前的定時器
      if (scrollTimeout.value) {
        clearTimeout(scrollTimeout.value)
      }
      
      // 用戶停止滾動800ms後恢復自動跟隨（更快恢復）
      scrollTimeout.value = setTimeout(() => {
        userIsScrolling.value = false
        shouldFollowAnimation.value = true
        console.log('恢復自動跟隨')
      }, 800)
    }, 100)
  }
})

// 初始化滾動容器
onMounted(() => {
  nextTick(() => {
    scrollContainer.value = findScrollContainer()
    console.log('初始化滾動容器:', scrollContainer.value?.tagName)
  })
})

// VueUse 已經處理了事件監聽，不需要手動設置

// 獲取動畫速度設定
const getAnimationSpeed = () => {
  const speedMap = {
    slow: { delay: 80, chunkMultiplier: 0.7, randomVariation: 30 },
    normal: { delay: 30, chunkMultiplier: 1, randomVariation: 20 },
    fast: { delay: 15, chunkMultiplier: 1.3, randomVariation: 15 },
    turbo: { delay: 8, chunkMultiplier: 1.8, randomVariation: 10 }
  }
  return speedMap[props.animationSpeed] || speedMap.normal
}

// 生成隨機字符塊大小
const getRandomChunkSize = () => {
  const [min, max] = props.chunkSizeRange
  const speed = getAnimationSpeed()
  const adjustedMin = Math.floor(min * speed.chunkMultiplier)
  const adjustedMax = Math.floor(max * speed.chunkMultiplier)
  return Math.floor(Math.random() * (adjustedMax - adjustedMin + 1)) + adjustedMin
}

// 將內容分割成隨機大小的字符塊
const splitContentIntoChunks = (content) => {
  if (!content) return []
  
  const chunks = []
  let currentIndex = 0
  
  while (currentIndex < content.length) {
    const chunkSize = getRandomChunkSize()
    const chunk = content.substring(currentIndex, currentIndex + chunkSize)
    chunks.push(chunk)
    currentIndex += chunkSize
  }
  
  return chunks
}

// 開始動畫 - 隨機字符塊動畫
const startAnimation = async () => {
  if (!props.content || !props.enableAnimation) {
    isAnimating.value = false
    return
  }
  
  // 防止重複動畫
  if (isAnimating.value) {
    console.log('動畫已在進行中，跳過')
    return
  }
  
  console.log('開始字符塊動畫:', {
    contentLength: props.content.length,
    enableAnimation: props.enableAnimation
  })

  // 重置狀態
  displayedChunks.value = []
  fullContent.value = props.content
  shouldFollowAnimation.value = true
  
  const chunks = splitContentIntoChunks(props.content)

  // 延遲一點才開始動畫，確保父組件渲染完成
  await new Promise(resolve => setTimeout(resolve, 100))
  
  // 現在才設置為動畫狀態
  isAnimating.value = true
  await nextTick()

  // 初始滾動檢查，確保動畫區域可見
  await new Promise(resolve => setTimeout(resolve, 50))
  followAnimationProgress()

  // 逐塊顯示動畫 - 隨機字符塊打字效果
  for (let i = 0; i < chunks.length; i++) {
    // 創建字符塊對象
    const chunkObj = {
      content: chunks[i],
      index: i
    }
    
    // 添加當前字符塊到顯示列表
    displayedChunks.value.push(chunkObj)
    
    // 等待 DOM 更新
    await nextTick()
    
    // 平衡的滾動檢查策略：每2個字符塊檢查一次
    if (i > 0 && i % 2 === 0) {
      followAnimationProgress()
      await new Promise(resolve => setTimeout(resolve, 20)) // 縮短延遲，保持響應性
    }
    
    // 隨機延遲，模擬真實AI思考和輸入過程
    if (i < chunks.length - 1) {
      const speed = getAnimationSpeed()
      // 使用速度設定的延遲 + 隨機變化
      const baseDelay = speed.delay
      const randomVariation = Math.random() * speed.randomVariation
      const totalDelay = baseDelay + randomVariation
      await new Promise(resolve => setTimeout(resolve, totalDelay))
    }
  }

  // 動畫完成後強力最終滾動
  await nextTick()
  
  // 多次嘗試確保滾動到底部
  for (let attempt = 0; attempt < 3; attempt++) {
    if (scrollContainer.value && wrapperRef.value) {
      const container = scrollContainer.value
      const wrapper = wrapperRef.value
      const animatedContent = wrapper.querySelector('.animated-content')
      
      if (animatedContent) {
        const animatedRect = animatedContent.getBoundingClientRect()
        const containerRect = container.getBoundingClientRect()
        const totalOverflow = animatedRect.bottom - containerRect.bottom
        
        console.log(`最終滾動嘗試 ${attempt + 1}`, {
          totalOverflow,
          currentScroll: y.value,
          contentBottom: animatedRect.bottom,
          containerBottom: containerRect.bottom
        })
        
        if (totalOverflow > -10) { // 允許小於10px的誤差
          const targetScroll = y.value + totalOverflow + 50 // 額外50px確保完全可見
          y.value = targetScroll
          await new Promise(resolve => setTimeout(resolve, 100))
        } else {
          break // 已經滾動到位了
        }
      }
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  isAnimating.value = false
  emit('animation-complete')
}

// 監聽內容變化 - 防止串流時重複觸發
watch(() => props.content, (newContent, oldContent) => {
  if (newContent && newContent !== oldContent) {
    // 只在內容實際改變且動畫啟用時才開始動畫
    if (props.enableAnimation) {
      // 清除任何正在進行的動畫
      if (isAnimating.value) {
        isAnimating.value = false
      }
      // 短暫延遲後開始新動畫，避免連續觸發
      setTimeout(() => {
        startAnimation()
      }, 100)
    }
  }
}, { immediate: true })

// 組件卸載時清理
onUnmounted(() => {
  if (scrollTimeout.value) {
    clearTimeout(scrollTimeout.value)
  }
})

// 暴露方法給父組件
defineExpose({
  startAnimation,
  isAnimating
})
</script>

<style scoped>
.animated-content-wrapper {
  width: 100%;
  /* CSS 變數定義 */
  --text-color-rgb: 38, 38, 38;
  --bg-color-rgb: 255, 255, 255;
}

.animated-content {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: var(--text-color-primary);
}

/* 字符塊基礎樣式 */
.animated-chunk {
  display: inline;
  background: transparent;
  border: none;
  padding: 0;
  color: var(--text-color-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  word-wrap: break-word;
  white-space: pre-wrap; /* 保持空白字符和換行 */
}

/* 字符塊淡入效果 */
.animated-chunk.fade-effect {
  animation: chunkFadeIn 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

/* 打字機游標 */
.typing-cursor {
  color: var(--primary-color, #1890ff);
  animation: blink 1s infinite;
  font-weight: 300;
  margin-left: 2px;
}

/* 字符塊淡入動畫 */
@keyframes chunkFadeIn {
  0% {
    opacity: 0;
    transform: translateY(8px) scale(0.95);
  }
  60% {
    opacity: 0.8;
    transform: translateY(-2px) scale(1.02);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 閃爍游標動畫 */
@keyframes blink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0;
  }
}


/* 動畫占位符 */
.animation-placeholder {
  height: 0;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}

/* 兜底樣式 */
.fallback-content {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: var(--text-color-primary);
  padding: 0;
  background: transparent;
}

/* 暗色主題適配 */
@media (prefers-color-scheme: dark) {
  .animated-content-wrapper {
    --text-color-rgb: 255, 255, 255;
    --bg-color-rgb: 31, 31, 31;
  }
  
  .typing-cursor {
    color: var(--primary-color, #52c41a);
  }
}
</style>
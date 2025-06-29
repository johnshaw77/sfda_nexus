<template>
  <div class="typewriter-container">
    <div 
      class="typewriter-content"
      :class="{ 'is-typing': isTyping }"
      v-html="displayContent">
    </div>
    <span 
      v-if="isTyping" 
      class="typewriter-cursor"
      :class="{ 'blinking': isTyping }">
      |
    </span>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  // 要顯示的完整內容
  content: {
    type: String,
    default: ''
  },
  // 打字速度（毫秒）
  speed: {
    type: Number,
    default: 30
  },
  // 是否自動開始
  autoStart: {
    type: Boolean,
    default: true
  },
  // 是否已完成（用於外部控制）
  isComplete: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['complete', 'progress'])

const displayContent = ref('')
const isTyping = ref(false)
const currentIndex = ref(0)
const typewriterTimer = ref(null)

// 清理定時器
const clearTimer = () => {
  if (typewriterTimer.value) {
    clearTimeout(typewriterTimer.value)
    typewriterTimer.value = null
  }
}

// 開始打字機效果
const startTyping = () => {
  if (!props.content || props.isComplete) return
  
  clearTimer()
  isTyping.value = true
  currentIndex.value = 0
  displayContent.value = ''
  
  typeNext()
}

// 打字下一個字符
const typeNext = () => {
  if (!isTyping.value || currentIndex.value >= props.content.length) {
    completeTyping()
    return
  }
  
  const nextChar = props.content[currentIndex.value]
  displayContent.value += nextChar
  currentIndex.value++
  
  // 發送進度事件
  const progress = Math.round((currentIndex.value / props.content.length) * 100)
  emit('progress', progress)
  
  // 設置下一個字符的延遲
  let delay = props.speed
  
  // 根據字符類型調整速度
  if (nextChar === ' ') {
    delay = props.speed * 0.5 // 空格稍快
  } else if (nextChar === '\n') {
    delay = props.speed * 2 // 換行稍慢
  } else if (/[,.!?。，！？]/.test(nextChar)) {
    delay = props.speed * 3 // 標點符號更慢
  }
  
  // 添加隨機性讓打字更自然
  delay += Math.random() * 20 - 10
  
  typewriterTimer.value = setTimeout(typeNext, Math.max(delay, 10))
}

// 完成打字
const completeTyping = () => {
  isTyping.value = false
  clearTimer()
  displayContent.value = props.content
  emit('complete')
}

// 立即完成（跳過動畫）
const skipAnimation = () => {
  clearTimer()
  isTyping.value = false
  currentIndex.value = props.content.length
  displayContent.value = props.content
  emit('complete')
}

// 監聽內容變化
watch(() => props.content, (newContent, oldContent) => {
  if (newContent !== oldContent) {
    if (props.autoStart && newContent) {
      startTyping()
    }
  }
}, { immediate: true })

// 監聽完成狀態
watch(() => props.isComplete, (isComplete) => {
  if (isComplete) {
    skipAnimation()
  }
})

// 暴露方法給父組件
defineExpose({
  startTyping,
  skipAnimation,
  completeTyping
})

onMounted(() => {
  if (props.autoStart && props.content && !props.isComplete) {
    startTyping()
  }
})

onBeforeUnmount(() => {
  clearTimer()
})
</script>

<style scoped>
.typewriter-container {
  display: inline-flex;
  align-items: flex-start;
  position: relative;
}

.typewriter-content {
  white-space: pre-wrap;
  word-wrap: break-word;
}

.typewriter-content.is-typing {
  /* 添加輕微的背景高亮表示正在打字 */
  background: linear-gradient(90deg, transparent 0%, rgba(24, 144, 255, 0.1) 50%, transparent 100%);
  background-size: 200% 100%;
  animation: typing-highlight 2s ease-in-out infinite;
}

.typewriter-cursor {
  display: inline-block;
  margin-left: 2px;
  font-weight: bold;
  color: #1890ff;
}

.typewriter-cursor.blinking {
  animation: cursor-blink 1s infinite;
}

@keyframes cursor-blink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0;
  }
}

@keyframes typing-highlight {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

/* 響應式設計 */
@media (max-width: 768px) {
  .typewriter-content {
    font-size: 14px;
  }
  
  .typewriter-cursor {
    margin-left: 1px;
  }
}
</style>
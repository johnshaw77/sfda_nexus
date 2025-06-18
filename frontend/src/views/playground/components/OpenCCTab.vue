<template>
  <div class="opencc-test-container">
    <!-- 設置面板 -->
    <div class="settings-panel">
      <a-card
        size="small"
        title="🔧 轉換設置">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="轉換模式">
              <a-select
                :value="conversionMode"
                @change="handleModeChange"
                style="width: 100%">
                <a-select-option value="s2t">簡體轉繁體</a-select-option>
                <a-select-option value="t2s">繁體轉簡體</a-select-option>
                <a-select-option value="s2tw">簡體轉台灣繁體</a-select-option>
                <a-select-option value="tw2s">台灣繁體轉簡體</a-select-option>
                <a-select-option value="s2hk">簡體轉香港繁體</a-select-option>
                <a-select-option value="hk2s">香港繁體轉簡體</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="轉換選項">
              <a-space wrap>
                <a-switch
                  v-model:checked="autoConvert"
                  checked-children="自動"
                  un-checked-children="手動" />
                <a-switch
                  v-model:checked="preserveLineBreaks"
                  checked-children="保留換行"
                  un-checked-children="連續文字" />
                <a-switch
                  v-model:checked="debugMode"
                  checked-children="調試"
                  un-checked-children="調試" />
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
      </a-card>
    </div>

    <!-- 轉換主界面 -->
    <a-row
      :gutter="[16, 16]"
      style="margin-top: 16px">
      <!-- 輸入區域 -->
      <a-col
        :xs="24"
        :sm="24"
        :md="12"
        :lg="12"
        :xl="12">
        <div class="input-section">
          <div class="section-header">
            <h3>📝 {{ getModeLabel(conversionMode, "input") }}</h3>
            <a-space wrap>
              <a-button
                size="small"
                @click="clearInput"
                >清空</a-button
              >
              <a-button
                size="small"
                @click="loadTestCase"
                >載入測試文字</a-button
              >
              <a-button
                size="small"
                @click="swapContent"
                >交換內容</a-button
              >
            </a-space>
          </div>

          <a-textarea
            :value="inputText"
            @input="handleInputChange"
            :placeholder="getPlaceholder(conversionMode)"
            :rows="15"
            class="text-input"
            show-count
            :maxlength="5000" />

          <div class="input-stats">
            <a-space wrap>
              <span>字符數：{{ inputText.length }}</span>
              <span>行數：{{ inputText.split("\n").length }}</span>
              <span>中文字符：{{ getChineseCharCount(inputText) }}</span>
            </a-space>
          </div>
        </div>
      </a-col>

      <!-- 輸出區域 -->
      <a-col
        :xs="24"
        :sm="24"
        :md="12"
        :lg="12"
        :xl="12">
        <div class="output-section">
          <div class="section-header">
            <h3>✨ {{ getModeLabel(conversionMode, "output") }}</h3>
            <a-space wrap>
              <a-button
                size="small"
                @click="handleConvert"
                :loading="isConverting"
                type="primary">
                立即轉換
              </a-button>
              <a-button
                size="small"
                @click="copyResult"
                >複製結果</a-button
              >
              <a-button
                size="small"
                @click="downloadResult"
                >下載</a-button
              >
            </a-space>
          </div>

          <div class="output-container">
            <a-spin :spinning="isConverting">
              <div
                v-if="convertedText"
                class="converted-text">
                {{ convertedText }}
              </div>
              <div
                v-else
                class="empty-result">
                <a-empty description="請輸入文字並點擊轉換" />
              </div>
            </a-spin>
          </div>

          <div
            class="output-stats"
            v-if="convertedText">
            <a-space wrap>
              <span>輸出字符：{{ convertedText.length }}</span>
              <span>轉換率：{{ getConversionRate() }}%</span>
              <span>用時：{{ conversionTime }}ms</span>
            </a-space>
          </div>
        </div>
      </a-col>
    </a-row>

    <!-- 測試案例區域 -->
    <a-divider>🧪 預設測試案例</a-divider>
    <a-row :gutter="[8, 8]">
      <a-col
        :xs="24"
        :sm="12"
        :md="8"
        :lg="6"
        :xl="6"
        v-for="(testCase, index) in testCases"
        :key="index">
        <a-card
          size="small"
          :title="testCase.name"
          class="test-case-card"
          @click="loadSpecificTestCase(testCase)">
          <template #extra>
            <a-button
              type="link"
              size="small"
              >載入</a-button
            >
          </template>
          <p class="test-case-desc">{{ testCase.description }}</p>
          <div class="test-case-preview">{{ testCase.preview }}</div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 調試面板 -->
    <div v-if="debugMode">
      <a-divider>🔬 調試資訊</a-divider>
      <a-row :gutter="[16, 16]">
        <a-col
          :xs="24"
          :sm="24"
          :md="12">
          <a-card
            size="small"
            title="📊 轉換統計">
            <a-descriptions
              :column="1"
              size="small">
              <a-descriptions-item label="轉換模式">{{
                getModeFullName(conversionMode)
              }}</a-descriptions-item>
              <a-descriptions-item label="輸入長度"
                >{{ inputText.length }} 字符</a-descriptions-item
              >
              <a-descriptions-item label="輸出長度"
                >{{ convertedText.length }} 字符</a-descriptions-item
              >
              <a-descriptions-item label="中文字符">{{
                getChineseCharCount(inputText)
              }}</a-descriptions-item>
              <a-descriptions-item label="轉換時間"
                >{{ conversionTime }}ms</a-descriptions-item
              >
              <a-descriptions-item label="轉換器狀態">{{
                converterStatus
              }}</a-descriptions-item>
            </a-descriptions>
          </a-card>
        </a-col>
        <a-col
          :xs="24"
          :sm="24"
          :md="12">
          <a-card
            size="small"
            title="🔧 系統資訊">
            <a-descriptions
              :column="1"
              size="small">
              <a-descriptions-item label="OpenCC 版本">{{
                openccVersion
              }}</a-descriptions-item>
              <a-descriptions-item label="WASM 支援">{{
                wasmSupported ? "是" : "否"
              }}</a-descriptions-item>
              <a-descriptions-item label="瀏覽器">{{
                getBrowserInfo()
              }}</a-descriptions-item>
              <a-descriptions-item label="記憶體使用">{{
                getMemoryUsage()
              }}</a-descriptions-item>
            </a-descriptions>
          </a-card>
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { message } from "ant-design-vue";
import textConverter from "@/utils/textConverter";

// 響應式數據
const inputText = ref("");
const convertedText = ref("");
const conversionMode = ref("s2t");
const autoConvert = ref(false);
const preserveLineBreaks = ref(true);
const debugMode = ref(false);
const isConverting = ref(false);
const conversionTime = ref(0);
const converterStatus = ref("未初始化");
const openccVersion = ref("2.1.0");
const wasmSupported = ref(true);

// 檢查轉換器狀態
const isReady = computed(() => textConverter.isAvailable());

// 測試案例
const testCases = ref([
  {
    name: "簡體範例",
    description: "包含常用簡體字的測試文字",
    content:
      '这是一个简体中文测试文本。包含了一些常用的汉字，比如"国家"、"经济"、"发展"等。希望能够正确转换为繁体字。',
    preview: "这是一个简体中文测试文本...",
  },
  {
    name: "繁體範例",
    description: "包含常用繁體字的測試文字",
    content:
      "這是一個繁體中文測試文本。包含了一些常用的漢字，比如「國家」、「經濟」、「發展」等。希望能夠正確轉換為簡體字。",
    preview: "這是一個繁體中文測試文本...",
  },
  {
    name: "專業術語",
    description: "包含技術和專業術語的文字",
    content:
      "人工智能、機器學習、深度學習、神經網絡、自然語言處理、電腦視覺、數據科學、雲端計算、區塊鏈技術。",
    preview: "人工智能、機器學習、深度學習...",
  },
  {
    name: "混合內容",
    description: "包含標點符號、數字和英文的混合內容",
    content:
      "根據2023年的統計數據顯示，AI技術在各個領域的應用正在快速發展。例如：ChatGPT、GPT-4等大語言模型。",
    preview: "根據2023年的統計數據顯示...",
  },
  {
    name: "詩詞文學",
    description: "古典詩詞和文學作品",
    content: "床前明月光，疑是地上霜。舉頭望明月，低頭思故鄉。——李白《靜夜思》",
    preview: "床前明月光，疑是地上霜...",
  },
  {
    name: "長文測試",
    description: "較長的文章段落測試",
    content:
      "中華文化源遠流長，博大精深。從古至今，漢字作為中華文明的重要載體，承載著豐富的歷史文化內涵。簡體字和繁體字作為漢字的不同書寫形式，各自都有其獨特的特點和使用場景。在現代信息化時代，如何實現簡繁體字之間的準確轉換，成為了一個重要的技術課題。",
    preview: "中華文化源遠流長，博大精深...",
  },
]);

// 計算屬性和方法
const getModeLabel = (mode, type) => {
  const labels = {
    s2t: { input: "簡體中文輸入", output: "繁體中文輸出" },
    t2s: { input: "繁體中文輸入", output: "簡體中文輸出" },
    s2tw: { input: "簡體中文輸入", output: "台灣繁體輸出" },
    tw2s: { input: "台灣繁體輸入", output: "簡體中文輸出" },
    s2hk: { input: "簡體中文輸入", output: "香港繁體輸出" },
    hk2s: { input: "香港繁體輸入", output: "簡體中文輸出" },
  };
  return labels[mode]?.[type] || "文字輸入";
};

const getModeFullName = (mode) => {
  const names = {
    s2t: "簡體轉繁體 (Simplified to Traditional)",
    t2s: "繁體轉簡體 (Traditional to Simplified)",
    s2tw: "簡體轉台灣繁體 (Simplified to Taiwan Traditional)",
    tw2s: "台灣繁體轉簡體 (Taiwan Traditional to Simplified)",
    s2hk: "簡體轉香港繁體 (Simplified to Hong Kong Traditional)",
    hk2s: "香港繁體轉簡體 (Hong Kong Traditional to Simplified)",
  };
  return names[mode] || mode;
};

const getPlaceholder = (mode) => {
  if (mode.startsWith("s2")) {
    return "请输入简体中文文字...";
  } else {
    return "請輸入繁體中文文字...";
  }
};

const getChineseCharCount = (text) => {
  const chineseRegex = /[\u4e00-\u9fff]/g;
  const matches = text.match(chineseRegex);
  return matches ? matches.length : 0;
};

const getConversionRate = () => {
  if (!inputText.value || !convertedText.value) return 0;
  const inputLength = inputText.value.length;
  const outputLength = convertedText.value.length;
  return Math.round((outputLength / inputLength) * 100);
};

const getBrowserInfo = () => {
  return navigator.userAgent.split(" ")[0] || "Unknown";
};

const getMemoryUsage = () => {
  if (performance.memory) {
    const used = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
    return `${used}MB`;
  }
  return "N/A";
};

// 事件處理
const handleModeChange = (value) => {
  conversionMode.value = value;
  if (autoConvert.value && inputText.value) {
    handleConvert();
  }
};

const handleInputChange = (e) => {
  inputText.value = e.target.value;
  if (autoConvert.value && inputText.value) {
    // 防抖處理
    clearTimeout(window.autoConvertTimer);
    window.autoConvertTimer = setTimeout(() => {
      handleConvert();
    }, 500);
  }
};

const handleConvert = async () => {
  if (!inputText.value.trim()) {
    message.warning("請輸入要轉換的文字");
    return;
  }

  try {
    isConverting.value = true;
    converterStatus.value = "轉換中...";
    const startTime = Date.now();

    let result;
    switch (conversionMode.value) {
      case "s2t":
      case "s2tw":
      case "s2hk":
        result = textConverter.simplifiedToTraditional(inputText.value);
        break;
      case "t2s":
      case "tw2s":
      case "hk2s":
        result = textConverter.traditionalToSimplified(inputText.value);
        break;
      default:
        result = inputText.value;
    }

    conversionTime.value = Date.now() - startTime;
    convertedText.value = result;
    converterStatus.value = "轉換完成";

    message.success(`轉換完成，用時 ${conversionTime.value}ms`);
  } catch (error) {
    console.error("轉換失敗:", error);
    message.error("轉換失敗，請檢查輸入內容");
    converterStatus.value = "轉換失敗";
  } finally {
    isConverting.value = false;
  }
};

const clearInput = () => {
  inputText.value = "";
  convertedText.value = "";
  message.success("已清空輸入");
};

const swapContent = () => {
  if (!convertedText.value) {
    message.warning("請先進行轉換");
    return;
  }

  const temp = inputText.value;
  inputText.value = convertedText.value;
  convertedText.value = temp;

  // 切換轉換模式
  const modeMap = {
    s2t: "t2s",
    t2s: "s2t",
    s2tw: "tw2s",
    tw2s: "s2tw",
    s2hk: "hk2s",
    hk2s: "s2hk",
  };
  conversionMode.value = modeMap[conversionMode.value] || "t2s";

  message.success("已交換輸入輸出內容");
};

const loadTestCase = () => {
  const randomCase =
    testCases.value[Math.floor(Math.random() * testCases.value.length)];
  loadSpecificTestCase(randomCase);
};

const loadSpecificTestCase = (testCase) => {
  inputText.value = testCase.content;
  message.success(`已載入測試案例：${testCase.name}`);

  if (autoConvert.value) {
    setTimeout(() => {
      handleConvert();
    }, 100);
  }
};

const copyResult = async () => {
  if (!convertedText.value) {
    message.warning("沒有可複製的轉換結果");
    return;
  }

  try {
    await navigator.clipboard.writeText(convertedText.value);
    message.success("已複製轉換結果到剪貼板");
  } catch (err) {
    message.error("複製失敗");
  }
};

const downloadResult = () => {
  if (!convertedText.value) {
    message.warning("沒有可下載的轉換結果");
    return;
  }

  const blob = new Blob([convertedText.value], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `轉換結果_${conversionMode.value}_${new Date().getTime()}.txt`;
  a.click();
  URL.revokeObjectURL(url);

  message.success("已開始下載轉換結果");
};

// 生命週期
onMounted(() => {
  converterStatus.value = isReady.value ? "已就緒" : "初始化中...";
});
</script>

<style scoped>
.opencc-test-container {
  padding: 16px 0;
}

.settings-panel {
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--custom-border-color);
}

.section-header h3 {
  margin: 0;
  color: #1890ff;
}

.text-input {
  font-family: "Microsoft YaHei", "微軟雅黑", Arial, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  border-radius: 6px;
}

.input-stats,
.output-stats {
  margin-top: 8px;
  padding: 8px;
  background: var(--custom-bg-color);
  border-radius: 4px;
  font-size: 12px;
  color: var(--custom-text-color);
}

.output-container {
  border: 1px solid var(--custom-border-color);
  border-radius: 6px;
  padding: 16px;
  background: var(--custom-bg-color);
  min-height: 400px;
  max-height: 500px;
  overflow-y: auto;
}

.converted-text {
  font-family: "Microsoft YaHei", "微軟雅黑", Arial, sans-serif;
  font-size: 14px;
  line-height: 1.8;
  color: var(--custom-text-color);
  white-space: pre-wrap;
  word-break: break-word;
}

.empty-result {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
}

.test-case-card {
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 8px;
  height: 140px;
}

.test-case-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.test-case-desc {
  margin: 8px 0;
  color: var(--custom-text-color);
  font-size: 12px;
}

.test-case-preview {
  font-size: 11px;
  color: var(--custom-text-color);
  background: var(--custom-bg-color);
  padding: 6px;
  border-radius: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .output-container {
    min-height: 300px;
  }
}

/* 滾動條樣式 */
.output-container::-webkit-scrollbar {
  width: 6px;
}

.output-container::-webkit-scrollbar-track {
  background: var(--custom-bg-color);
}

.output-container::-webkit-scrollbar-thumb {
  background: var(--custom-border-color);
  border-radius: 3px;
}

.output-container::-webkit-scrollbar-thumb:hover {
  background: var(--custom-border-color);
}
</style>

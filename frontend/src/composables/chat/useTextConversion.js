/**
 * 文字轉換 Composable
 * 處理繁簡轉換相關功能
 */

import { ref } from "vue";
import textConverter from "@/utils/textConverter.js";

export function useTextConversion() {
  // 文字轉換設定
  const textConversionMode = ref("auto"); // 'none', 'auto', 's2t', 't2s'
  const isTextConverterEnabled = ref(true);

  // 設置文字轉換模式
  const setTextConversionMode = (mode) => {
    textConversionMode.value = mode;
    return mode;
  };

  // 切換文字轉換器開關
  const toggleTextConverter = (enabled) => {
    isTextConverterEnabled.value = enabled;
    return enabled;
  };

  // 獲取文字轉換器信息
  const getTextConverterInfo = () => ({
    isEnabled: isTextConverterEnabled.value,
    mode: textConversionMode.value,
    isAvailable: textConverter.isAvailable(),
    supportedModes: textConverter.getSupportedModes(),
  });

  // 應用文字轉換到單個內容
  const convertContent = (content, mode = textConversionMode.value) => {
    if (!isTextConverterEnabled.value || !textConverter.isAvailable()) {
      return content;
    }
    return textConverter.convertThinkingContent(content, mode);
  };

  // 應用文字轉換到串流內容
  const convertStreamContent = (content, mode = textConversionMode.value) => {
    if (!isTextConverterEnabled.value || !textConverter.isAvailable()) {
      return content;
    }
    return textConverter.convertStreamThinkingContent(content, mode);
  };

  return {
    // 狀態
    textConversionMode,
    isTextConverterEnabled,

    // 方法
    setTextConversionMode,
    toggleTextConverter,
    getTextConverterInfo,
    convertContent,
    convertStreamContent,
  };
}

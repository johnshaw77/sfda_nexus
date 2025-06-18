/**
 * 文字轉換工具
 * 使用 OpenCC 進行繁簡轉換
 */

import { Converter } from "opencc-js";

class TextConverter {
  constructor() {
    // 初始化轉換器
    this.s2tConverter = null;
    this.t2sConverter = null;
    this.init();
  }

  /**
   * 初始化轉換器
   */
  init() {
    try {
      // 簡體轉繁體（台灣標準）
      this.s2tConverter = Converter({ from: "cn", to: "tw" });
      // 繁體轉簡體
      this.t2sConverter = Converter({ from: "tw", to: "cn" });
      console.log("✅ OpenCC 轉換器初始化成功");
    } catch (error) {
      console.error("❌ OpenCC 轉換器初始化失敗:", error);
    }
  }

  /**
   * 簡體轉繁體
   * @param {string} text - 要轉換的文字
   * @returns {string} 轉換後的文字
   */
  simplifiedToTraditional(text) {
    if (!text || typeof text !== "string") return text;
    if (!this.s2tConverter) {
      console.warn("OpenCC 簡轉繁轉換器未初始化");
      return text;
    }

    try {
      return this.s2tConverter(text);
    } catch (error) {
      console.error("簡轉繁轉換失敗:", error);
      return text;
    }
  }

  /**
   * 繁體轉簡體
   * @param {string} text - 要轉換的文字
   * @returns {string} 轉換後的文字
   */
  traditionalToSimplified(text) {
    if (!text || typeof text !== "string") return text;
    if (!this.t2sConverter) {
      console.warn("OpenCC 繁轉簡轉換器未初始化");
      return text;
    }

    try {
      return this.t2sConverter(text);
    } catch (error) {
      console.error("繁轉簡轉換失敗:", error);
      return text;
    }
  }

  /**
   * 處理思考內容的轉換
   * @param {string} thinkingContent - 思考內容
   * @param {string} mode - 轉換模式 's2t' | 't2s' | 'auto' | 'none'
   * @returns {string} 轉換後的思考內容
   */
  convertThinkingContent(thinkingContent, mode = "auto") {
    if (!thinkingContent || typeof thinkingContent !== "string") {
      return thinkingContent;
    }

    switch (mode) {
      case "s2t":
        return this.simplifiedToTraditional(thinkingContent);
      case "t2s":
        return this.traditionalToSimplified(thinkingContent);
      case "auto":
        // 自動檢測並轉換為繁體
        return this.autoConvertToTraditional(thinkingContent);
      case "none":
      default:
        return thinkingContent;
    }
  }

  /**
   * 自動檢測並轉換為繁體
   * @param {string} text - 要檢測的文字
   * @returns {string} 轉換後的文字
   */
  autoConvertToTraditional(text) {
    if (!text) return text;

    // 簡單的簡體字檢測
    const simplifiedChars = [
      "国",
      "学",
      "语",
      "时",
      "间",
      "发",
      "说",
      "问",
      "题",
      "现",
      "实",
      "应",
      "该",
      "这",
      "样",
      "那",
      "样",
      "什",
      "么",
      "怎",
      "么",
      "为",
      "什",
      "么",
    ];
    const hasSimplified = simplifiedChars.some((char) => text.includes(char));

    if (hasSimplified) {
      console.log("🔄 檢測到簡體字，執行簡轉繁");
      return this.simplifiedToTraditional(text);
    }

    return text;
  }

  /**
   * 批量處理消息中的思考內容
   * @param {Array} messages - 消息列表
   * @param {string} mode - 轉換模式
   * @returns {Array} 處理後的消息列表
   */
  convertMessagesThinkingContent(messages, mode = "auto") {
    if (!Array.isArray(messages)) return messages;

    return messages.map((message) => {
      if (message.metadata?.thinking_content) {
        const convertedMessage = { ...message };
        convertedMessage.metadata = {
          ...message.metadata,
          thinking_content: this.convertThinkingContent(
            message.metadata.thinking_content,
            mode
          ),
        };
        return convertedMessage;
      }
      return message;
    });
  }

  /**
   * 處理串流思考內容
   * @param {string} streamChunk - 串流數據塊
   * @param {string} mode - 轉換模式
   * @returns {string} 轉換後的數據塊
   */
  convertStreamThinkingContent(streamChunk, mode = "auto") {
    return this.convertThinkingContent(streamChunk, mode);
  }

  /**
   * 檢查是否可用
   * @returns {boolean} 是否可用
   */
  isAvailable() {
    return !!(this.s2tConverter && this.t2sConverter);
  }

  /**
   * 獲取支援的轉換模式
   * @returns {Array} 支援的模式列表
   */
  getSupportedModes() {
    return [
      { value: "none", label: "不轉換" },
      { value: "auto", label: "自動轉換為繁體" },
      { value: "s2t", label: "簡體轉繁體" },
      { value: "t2s", label: "繁體轉簡體" },
    ];
  }
}

// 創建全局實例
const textConverter = new TextConverter();

export default textConverter;

/**
 * 基礎格式化器
 * 提供所有格式化器的共用功能
 */

import logger from "../../../utils/logger.util.js";

export class BaseFormatter {
  constructor() {
    this.name = this.constructor.name;
  }

  /**
   * 檢查是否支援該工具
   * @param {string} toolName - 工具名稱
   * @param {string} toolType - 工具類型
   * @returns {boolean}
   */
  canHandle(toolName, toolType = null) {
    throw new Error("子類必須實現 canHandle 方法");
  }

  /**
   * 格式化工具結果
   * @param {Object} data - 工具結果數據
   * @param {string} toolName - 工具名稱
   * @param {Object} context - 格式化上下文
   * @returns {string} 格式化後的文本
   */
  format(data, toolName, context = {}) {
    throw new Error("子類必須實現 format 方法");
  }

  /**
   * 記錄調試信息
   * @param {string} message - 調試訊息
   * @param {Object} data - 調試數據
   */
  debug(message, data = {}) {
    logger.debug(`[${this.name}] ${message}`, data);
  }

  /**
   * 記錄錯誤信息
   * @param {string} message - 錯誤訊息
   * @param {Error} error - 錯誤對象
   */
  error(message, error) {
    logger.error(`[${this.name}] ${message}`, { error: error.message });
  }

  /**
   * 安全的數據訪問
   * @param {Object} data - 數據對象
   * @param {string} path - 數據路徑 (如 'data.result.items')
   * @param {*} defaultValue - 默認值
   * @returns {*} 數據值
   */
  safeGet(data, path, defaultValue = null) {
    try {
      return path.split('.').reduce((obj, key) => obj?.[key], data) ?? defaultValue;
    } catch (error) {
      return defaultValue;
    }
  }

  /**
   * 格式化時間戳
   * @param {string|Date} timestamp - 時間戳
   * @returns {string} 格式化後的時間
   */
  formatTimestamp(timestamp) {
    if (!timestamp) return "未提供";
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return timestamp.toString();
    }
  }

  /**
   * 格式化數字（加入千分位分隔符）
   * @param {number|string} value - 數值
   * @param {number} decimals - 小數位數
   * @returns {string} 格式化後的數字
   */
  formatNumber(value, decimals = 0) {
    if (value === null || value === undefined || value === '') return "未提供";
    
    const num = parseFloat(value);
    if (isNaN(num)) return value.toString();
    
    return num.toLocaleString('zh-TW', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  /**
   * 安全截取字串
   * @param {string} str - 字串
   * @param {number} maxLength - 最大長度
   * @param {string} suffix - 截取後綴
   * @returns {string} 截取後的字串
   */
  truncateString(str, maxLength = 50, suffix = '...') {
    if (!str || typeof str !== 'string') return '';
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - suffix.length) + suffix;
  }

  /**
   * 檢查數據是否為空
   * @param {*} data - 數據
   * @returns {boolean} 是否為空
   */
  isEmpty(data) {
    if (data === null || data === undefined) return true;
    if (typeof data === 'string') return data.trim() === '';
    if (Array.isArray(data)) return data.length === 0;
    if (typeof data === 'object') return Object.keys(data).length === 0;
    return false;
  }

  /**
   * 生成表格標題行
   * @param {Array<string>} headers - 標題陣列
   * @returns {string} Markdown 表格標題
   */
  generateTableHeader(headers) {
    const headerRow = `| ${headers.join(' | ')} |`;
    const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`;
    return `${headerRow}\n${separatorRow}`;
  }

  /**
   * 生成表格數據行
   * @param {Array<string>} cells - 單元格數據
   * @returns {string} Markdown 表格行
   */
  generateTableRow(cells) {
    return `| ${cells.join(' | ')} |`;
  }

  /**
   * 處理 AI 指導標籤
   * @param {string} content - 包含指導標籤的內容
   * @returns {string} 處理後的內容
   */
  processAIInstructions(content) {
    if (!content || typeof content !== 'string') return '';
    
    // 提取 AI 分析指導內容
    const aiInstructionMatch = content.match(/🧠 AI 分析指導[：:]\s*([\s\S]*?)(?=\n\n|\n(?=\d+\.)|$)/);
    if (aiInstructionMatch) {
      return aiInstructionMatch[1].trim();
    }
    
    return '';
  }
}
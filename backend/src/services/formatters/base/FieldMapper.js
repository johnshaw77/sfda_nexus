/**
 * 欄位對照管理器
 * 負責欄位名稱對照、優先級排序和數據格式化
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from "../../../utils/logger.util.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FieldMapper {
  constructor() {
    this.fieldMappings = null;
    this.displayRules = null;
    this.loadConfigurations();
  }

  /**
   * 載入配置檔案
   */
  loadConfigurations() {
    try {
      const configPath = path.join(__dirname, '../config');
      
      // 載入欄位對照表
      const fieldMappingsPath = path.join(configPath, 'fieldMappings.json');
      this.fieldMappings = JSON.parse(fs.readFileSync(fieldMappingsPath, 'utf8'));
      
      // 載入顯示規則
      const displayRulesPath = path.join(configPath, 'displayRules.json');
      this.displayRules = JSON.parse(fs.readFileSync(displayRulesPath, 'utf8'));
      
      logger.debug('[FieldMapper] 配置檔案載入成功', {
        fieldMappingCategories: Object.keys(this.fieldMappings),
        displayRuleCategories: Object.keys(this.displayRules)
      });
    } catch (error) {
      logger.error('[FieldMapper] 配置檔案載入失敗', error);
      this.fieldMappings = { common: {} };
      this.displayRules = { general: {} };
    }
  }

  /**
   * 重新載入配置檔案（熱重載）
   */
  reloadConfigurations() {
    this.loadConfigurations();
    logger.info('[FieldMapper] 配置檔案已重新載入');
  }

  /**
   * 獲取欄位對照資訊
   * @param {string} fieldName - 欄位名稱
   * @param {string} category - 類別 (如 'mil_management', 'statistical')
   * @returns {Object} 欄位對照資訊
   */
  getFieldMapping(fieldName, category = 'common') {
    // 先查找特定類別的對照
    const categoryMappings = this.fieldMappings[category] || {};
    if (categoryMappings[fieldName]) {
      return categoryMappings[fieldName];
    }
    
    // 再查找通用對照
    const commonMappings = this.fieldMappings.common || {};
    if (commonMappings[fieldName]) {
      return commonMappings[fieldName];
    }
    
    // 沒有找到對照，返回默認值
    return {
      label: fieldName,
      priority: 99,
      type: 'string'
    };
  }

  /**
   * 獲取欄位的中文標籤
   * @param {string} fieldName - 欄位名稱
   * @param {string} category - 類別
   * @returns {string} 中文標籤
   */
  getFieldLabel(fieldName, category = 'common') {
    const mapping = this.getFieldMapping(fieldName, category);
    return mapping.label || fieldName;
  }

  /**
   * 獲取欄位優先級
   * @param {string} fieldName - 欄位名稱
   * @param {string} category - 類別
   * @returns {number} 優先級（數字越小優先級越高）
   */
  getFieldPriority(fieldName, category = 'common') {
    const mapping = this.getFieldMapping(fieldName, category);
    return mapping.priority || 99;
  }

  /**
   * 按優先級排序欄位
   * @param {Array<string>} fieldNames - 欄位名稱陣列
   * @param {string} category - 類別
   * @returns {Array<string>} 排序後的欄位名稱陣列
   */
  sortFieldsByPriority(fieldNames, category = 'common') {
    return fieldNames.sort((a, b) => {
      const aPriority = this.getFieldPriority(a, category);
      const bPriority = this.getFieldPriority(b, category);
      return aPriority - bPriority;
    });
  }

  /**
   * 格式化欄位值
   * @param {*} value - 欄位值
   * @param {string} fieldName - 欄位名稱
   * @param {string} category - 類別
   * @returns {string} 格式化後的值
   */
  formatFieldValue(value, fieldName, category = 'common') {
    if (value === null || value === undefined || value === '') {
      return '未提供';
    }

    const mapping = this.getFieldMapping(fieldName, category);
    const type = mapping.type || 'string';
    
    try {
      switch (type) {
        case 'number':
          return this.formatNumber(value, mapping);
        case 'integer':
          return this.formatInteger(value);
        case 'date':
          return this.formatDate(value);
        case 'email':
          return this.formatEmail(value);
        case 'phone':
          return this.formatPhone(value);
        case 'text':
          return this.formatText(value, mapping);
        case 'array':
          return this.formatArray(value);
        default:
          return this.formatString(value, mapping);
      }
    } catch (error) {
      logger.warn(`[FieldMapper] 格式化欄位 ${fieldName} 失敗`, { value, error: error.message });
      return value.toString();
    }
  }

  /**
   * 格式化數字
   * @param {*} value - 數值
   * @param {Object} mapping - 欄位對照資訊
   * @returns {string} 格式化後的數字
   */
  formatNumber(value, mapping) {
    const num = parseFloat(value);
    if (isNaN(num)) return value.toString();
    
    const decimals = mapping.decimals || 0;
    const suffix = mapping.suffix || '';
    const format = mapping.format;
    
    if (format === 'scientific' && (num < 0.001 || num > 1000000)) {
      return num.toExponential(decimals) + suffix;
    }
    
    const formatted = num.toLocaleString('zh-TW', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
    
    return formatted + suffix;
  }

  /**
   * 格式化整數
   * @param {*} value - 整數值
   * @returns {string} 格式化後的整數
   */
  formatInteger(value) {
    const num = parseInt(value);
    if (isNaN(num)) return value.toString();
    return num.toLocaleString('zh-TW');
  }

  /**
   * 格式化日期
   * @param {*} value - 日期值
   * @returns {string} 格式化後的日期
   */
  formatDate(value) {
    if (!value) return '未提供';
    
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return value.toString();
      
      return date.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return value.toString();
    }
  }

  /**
   * 格式化電子郵件
   * @param {*} value - 電子郵件
   * @returns {string} 格式化後的電子郵件
   */
  formatEmail(value) {
    const emailStr = value.toString();
    // 簡單的電子郵件格式驗證
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(emailStr)) {
      return emailStr;
    }
    return emailStr; // 即使格式不正確也返回原值
  }

  /**
   * 格式化電話號碼
   * @param {*} value - 電話號碼
   * @returns {string} 格式化後的電話號碼
   */
  formatPhone(value) {
    const phoneStr = value.toString().replace(/\D/g, ''); // 移除非數字字符
    
    // 台灣手機號碼格式 (09XX-XXX-XXX)
    if (phoneStr.length === 10 && phoneStr.startsWith('09')) {
      return `${phoneStr.slice(0, 4)}-${phoneStr.slice(4, 7)}-${phoneStr.slice(7)}`;
    }
    
    // 台灣市話格式 (XX-XXXX-XXXX)
    if (phoneStr.length >= 8) {
      return phoneStr.replace(/(\d{2})(\d{4})(\d+)/, '$1-$2-$3');
    }
    
    return value.toString(); // 返回原格式
  }

  /**
   * 格式化文本
   * @param {*} value - 文本值
   * @param {Object} mapping - 欄位對照資訊
   * @returns {string} 格式化後的文本
   */
  formatText(value, mapping) {
    const text = value.toString();
    const maxLength = mapping.maxLength || this.displayRules.general?.truncateTextLength || 50;
    
    if (text.length <= maxLength) {
      return text;
    }
    
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * 格式化陣列
   * @param {*} value - 陣列值
   * @returns {string} 格式化後的陣列
   */
  formatArray(value) {
    if (!Array.isArray(value)) {
      return value.toString();
    }
    
    if (value.length === 0) {
      return '空陣列';
    }
    
    // 如果是數字陣列（如信賴區間），格式化為區間表示
    if (value.length === 2 && value.every(v => typeof v === 'number')) {
      return `[${value[0].toFixed(3)}, ${value[1].toFixed(3)}]`;
    }
    
    return value.join(', ');
  }

  /**
   * 格式化字串
   * @param {*} value - 字串值
   * @param {Object} mapping - 欄位對照資訊
   * @returns {string} 格式化後的字串
   */
  formatString(value, mapping) {
    const str = value.toString();
    const suffix = mapping.suffix || '';
    return str + suffix;
  }

  /**
   * 獲取顯示規則
   * @param {string} category - 類別
   * @param {string} ruleName - 規則名稱
   * @returns {*} 規則值
   */
  getDisplayRule(category, ruleName = null) {
    const categoryRules = this.displayRules[category] || {};
    const generalRules = this.displayRules.general || {};
    
    if (ruleName) {
      return categoryRules[ruleName] ?? generalRules[ruleName];
    }
    
    return { ...generalRules, ...categoryRules };
  }

  /**
   * 檢查欄位是否應該高亮顯示
   * @param {string} fieldName - 欄位名稱
   * @param {*} value - 欄位值
   * @param {string} category - 類別
   * @returns {Object|null} 高亮規則或 null
   */
  checkHighlightRule(fieldName, value, category = 'common') {
    const rules = this.getDisplayRule(category, 'highlightRules');
    if (!rules || !rules[fieldName]) {
      return null;
    }
    
    const rule = rules[fieldName];
    const condition = rule.condition;
    
    try {
      // 簡單的條件檢查實現
      if (condition.includes('>')) {
        const threshold = parseFloat(condition.split('>')[1].trim());
        if (parseFloat(value) > threshold) {
          return rule;
        }
      } else if (condition.includes('==')) {
        const expectedValue = condition.split('==')[1].trim().replace(/['"]/g, '');
        if (value.toString() === expectedValue) {
          return rule;
        }
      }
    } catch (error) {
      logger.warn(`[FieldMapper] 高亮規則檢查失敗`, { fieldName, condition, error: error.message });
    }
    
    return null;
  }

  /**
   * 獲取所有支援的類別
   * @returns {Array<string>} 類別陣列
   */
  getSupportedCategories() {
    return Object.keys(this.fieldMappings);
  }

  /**
   * 根據工具名稱推斷類別
   * @param {string} toolName - 工具名稱
   * @returns {string} 推斷的類別
   */
  inferCategoryFromToolName(toolName) {
    const toolNameLower = toolName.toLowerCase();
    
    if (toolNameLower.includes('mil') || toolNameLower.includes('project')) {
      return 'mil_management';
    }
    
    if (toolNameLower.includes('stat') || toolNameLower.includes('test') || 
        toolNameLower.includes('analysis') || toolNameLower.includes('anova')) {
      return 'statistical';
    }
    
    if (toolNameLower.includes('emp') || toolNameLower.includes('employee') || 
        toolNameLower.includes('staff') || toolNameLower.includes('人員')) {
      return 'employee';
    }
    
    return 'common';
  }
}

// 單例模式
const fieldMapper = new FieldMapper();

export default fieldMapper;
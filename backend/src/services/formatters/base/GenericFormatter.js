/**
 * 通用格式化器
 * 作為後備格式化器處理未知或通用的工具結果
 */

import { BaseFormatter } from "./BaseFormatter.js";
import fieldMapper from "./FieldMapper.js";

export default class GenericFormatter extends BaseFormatter {
  constructor() {
    super();
    this.category = 'common';
  }

  /**
   * 檢查是否支援該工具（通用格式化器支援所有工具）
   * @param {string} toolName - 工具名稱
   * @param {string} toolType - 工具類型
   * @returns {boolean}
   */
  canHandle(toolName, toolType = null) {
    // 通用格式化器作為後備，支援所有工具
    return true;
  }

  /**
   * 格式化工具結果
   * @param {Object} data - 工具結果數據
   * @param {string} toolName - 工具名稱
   * @param {Object} context - 格式化上下文
   * @returns {string} 格式化後的文本
   */
  format(data, toolName, context = {}) {
    this.debug(`使用通用格式化器處理`, { toolName, dataType: typeof data });

    try {
      if (!data) {
        return `## 📋 ${toolName} 執行結果\n\n無數據返回。`;
      }

      let formatted = `## 📋 ${toolName} 執行結果\n\n`;

      // 處理 AI 指導提示詞
      const aiInstructions = this.processAIInstructions(data.aiInstructions);
      if (aiInstructions) {
        formatted += "### 🧠 AI 分析指導\n";
        formatted += `${aiInstructions}\n\n`;
        formatted += "---\n\n";
      }

      // 根據數據類型選擇格式化方法
      if (typeof data === 'string') {
        formatted += this.formatStringData(data);
      } else if (Array.isArray(data)) {
        formatted += this.formatArrayData(data, toolName);
      } else if (typeof data === 'object' && data !== null) {
        formatted += this.formatObjectData(data, toolName);
      } else {
        formatted += `數據類型: ${typeof data}\n值: ${data}`;
      }

      return formatted;

    } catch (error) {
      this.error(`通用格式化器處理失敗 (${toolName})`, error);
      return this.formatFallback(data, toolName);
    }
  }

  /**
   * 格式化字串數據
   * @param {string} data - 字串數據
   * @returns {string} 格式化結果
   */
  formatStringData(data) {
    // 檢查是否是 JSON 字串
    try {
      const parsed = JSON.parse(data);
      return this.formatObjectData(parsed, 'parsed_json');
    } catch (error) {
      // 不是 JSON，直接返回文本
      return `### 📄 結果內容\n\n${data}\n\n`;
    }
  }

  /**
   * 格式化陣列數據
   * @param {Array} data - 陣列數據
   * @param {string} toolName - 工具名稱
   * @returns {string} 格式化結果
   */
  formatArrayData(data, toolName) {
    if (data.length === 0) {
      return "### 📄 結果內容\n\n空陣列，無數據。\n\n";
    }

    let formatted = `### 📊 數據列表 (共 ${data.length} 筆)\n\n`;

    // 檢查是否是物件陣列（表格數據）
    if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
      formatted += this.formatTableData(data, toolName);
    } else {
      // 簡單數值陣列
      formatted += this.formatSimpleArray(data);
    }

    return formatted;
  }

  /**
   * 格式化物件數據
   * @param {Object} data - 物件數據
   * @param {string} toolName - 工具名稱
   * @returns {string} 格式化結果
   */
  formatObjectData(data, toolName) {
    let formatted = "";

    // 檢查是否有特殊的數據結構
    if (data.data && Array.isArray(data.data)) {
      // 包含數據陣列的結構
      formatted += this.formatMetadataAndData(data, toolName);
    } else if (data.result || data.results) {
      // 包含結果的結構
      const results = data.result || data.results;
      formatted += "### 📊 執行結果\n\n";
      formatted += this.formatAnyData(results, toolName);
    } else {
      // 一般物件結構
      formatted += this.formatGenericObject(data);
    }

    return formatted;
  }

  /**
   * 格式化包含元數據和數據的結構
   * @param {Object} data - 包含元數據的數據
   * @param {string} toolName - 工具名稱
   * @returns {string} 格式化結果
   */
  formatMetadataAndData(data, toolName) {
    let formatted = "";

    // 顯示查詢資訊
    if (data.totalRecords !== undefined || data.count !== undefined) {
      formatted += "### 📈 查詢資訊\n";
      if (data.count !== undefined && data.totalRecords !== undefined) {
        formatted += `- **查詢筆數**: ${this.formatNumber(data.count)} / ${this.formatNumber(data.totalRecords)} 筆\n`;
      }
      if (data.currentPage && data.totalPages) {
        formatted += `- **分頁資訊**: 第 ${data.currentPage} 頁，共 ${data.totalPages} 頁\n`;
      }
      if (data.timestamp) {
        formatted += `- **查詢時間**: ${this.formatTimestamp(data.timestamp)}\n`;
      }
      formatted += "\n";
    }

    // 顯示篩選條件
    if (data.filters && Object.keys(data.filters).length > 0) {
      formatted += "### 🔧 篩選條件\n";
      Object.entries(data.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          formatted += `- **${key}**: ${value}\n`;
        }
      });
      formatted += "\n";
    }

    // 顯示統計資訊
    if (data.statistics) {
      formatted += "### 📊 統計資訊\n";
      if (typeof data.statistics === 'string') {
        formatted += `${data.statistics}\n\n`;
      } else {
        formatted += this.formatGenericObject(data.statistics) + "\n";
      }
    }

    // 顯示主要數據
    if (data.data && Array.isArray(data.data)) {
      formatted += this.formatTableData(data.data, toolName);
    }

    return formatted;
  }

  /**
   * 格式化表格數據
   * @param {Array} data - 表格數據陣列
   * @param {string} toolName - 工具名稱
   * @returns {string} 格式化的表格
   */
  formatTableData(data, toolName) {
    if (data.length === 0) {
      return "### 📊 數據表格\n\n無數據。\n\n";
    }

    let formatted = `### 📊 數據表格 (共 ${data.length} 筆)\n\n`;

    // 取得所有可能的欄位
    const allFields = new Set();
    data.forEach(item => {
      Object.keys(item).forEach(key => allFields.add(key));
    });

    const fieldsArray = Array.from(allFields);
    
    // 推斷類別並排序欄位
    const category = fieldMapper.inferCategoryFromToolName(toolName);
    const sortedFields = fieldMapper.sortFieldsByPriority(fieldsArray, category);
    
    // 限制顯示欄位數量
    const displayFields = sortedFields.slice(0, 8);
    const headers = displayFields.map(field => fieldMapper.getFieldLabel(field, category));

    // 生成表格
    formatted += this.generateTableHeader(headers) + "\n";

    data.forEach(item => {
      const cells = displayFields.map(field => {
        const value = this.safeGet(item, field, '');
        const formattedValue = fieldMapper.formatFieldValue(value, field, category);
        return this.truncateString(formattedValue, 25);
      });
      formatted += this.generateTableRow(cells) + "\n";
    });

    formatted += "\n";

    // 顯示隱藏的欄位
    if (sortedFields.length > displayFields.length) {
      const hiddenFields = sortedFields.slice(8).map(field => 
        fieldMapper.getFieldLabel(field, category)
      );
      formatted += `🔍 **其他欄位**: ${hiddenFields.join(', ')}\n\n`;
    }

    return formatted;
  }

  /**
   * 格式化簡單陣列
   * @param {Array} data - 簡單陣列
   * @returns {string} 格式化結果
   */
  formatSimpleArray(data) {
    let formatted = "";
    
    if (data.length <= 10) {
      // 小陣列，直接列出所有項目
      data.forEach((item, index) => {
        formatted += `${index + 1}. ${item}\n`;
      });
    } else {
      // 大陣列，顯示前5個和後5個
      data.slice(0, 5).forEach((item, index) => {
        formatted += `${index + 1}. ${item}\n`;
      });
      formatted += `...\n`;
      data.slice(-5).forEach((item, index) => {
        formatted += `${data.length - 5 + index + 1}. ${item}\n`;
      });
    }
    
    formatted += "\n";
    return formatted;
  }

  /**
   * 格式化通用物件
   * @param {Object} obj - 物件
   * @returns {string} 格式化結果
   */
  formatGenericObject(obj) {
    let formatted = "### 📋 詳細資訊\n\n";

    Object.entries(obj).forEach(([key, value]) => {
      const label = fieldMapper.getFieldLabel(key, this.category);
      
      if (value === null || value === undefined) {
        formatted += `- **${label}**: 未提供\n`;
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        formatted += `- **${label}**: [物件]\n`;
        // 遞歸處理嵌套物件（限制層級）
        Object.entries(value).forEach(([subKey, subValue]) => {
          formatted += `  - ${subKey}: ${subValue}\n`;
        });
      } else if (Array.isArray(value)) {
        formatted += `- **${label}**: [陣列, ${value.length} 項目]\n`;
      } else {
        const formattedValue = fieldMapper.formatFieldValue(value, key, this.category);
        formatted += `- **${label}**: ${formattedValue}\n`;
      }
    });

    formatted += "\n";
    return formatted;
  }

  /**
   * 格式化任意類型數據
   * @param {*} data - 任意數據
   * @param {string} toolName - 工具名稱
   * @returns {string} 格式化結果
   */
  formatAnyData(data, toolName) {
    if (typeof data === 'string') {
      return this.formatStringData(data);
    } else if (Array.isArray(data)) {
      return this.formatArrayData(data, toolName);
    } else if (typeof data === 'object' && data !== null) {
      return this.formatGenericObject(data);
    } else {
      return `數據: ${data}\n\n`;
    }
  }

  /**
   * 後備格式化方法
   * @param {*} data - 數據
   * @param {string} toolName - 工具名稱
   * @returns {string} 後備格式化結果
   */
  formatFallback(data, toolName) {
    let formatted = `## ⚠️ 工具執行結果 (${toolName})\n\n`;
    formatted += "工具執行完成，但格式化時發生錯誤。以下是原始數據：\n\n";
    
    try {
      if (typeof data === 'string') {
        formatted += data;
      } else {
        formatted += "```json\n" + JSON.stringify(data, null, 2) + "\n```";
      }
    } catch (error) {
      formatted += "無法顯示數據內容。";
    }
    
    return formatted;
  }
}
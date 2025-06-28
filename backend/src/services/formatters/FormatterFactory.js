/**
 * 格式化器工廠
 * 自動選擇並創建合適的格式化器
 */

import logger from "../../utils/logger.util.js";
import fieldMapper from "./base/FieldMapper.js";

class FormatterFactory {
  constructor() {
    this.formatters = new Map();
    this.defaultFormatter = null;
    this.initialized = false;
  }

  /**
   * 初始化工廠，註冊所有格式化器
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // 動態載入所有格式化器
      await this.loadFormatters();
      this.initialized = true;
      logger.info('[FormatterFactory] 格式化器工廠初始化完成', {
        formattersCount: this.formatters.size,
        availableFormatters: Array.from(this.formatters.keys())
      });
    } catch (error) {
      logger.error('[FormatterFactory] 格式化器工廠初始化失敗', error);
      throw error;
    }
  }

  /**
   * 載入所有格式化器
   */
  async loadFormatters() {
    const formattersToLoad = [
      { name: 'MilFormatter', path: './business/MilFormatter.js' },
      { name: 'StatisticalFormatter', path: './analysis/StatisticalFormatter.js' },
      { name: 'EmployeeFormatter', path: './business/EmployeeFormatter.js' },
      { name: 'GenericFormatter', path: './base/GenericFormatter.js' }
    ];

    for (const formatterInfo of formattersToLoad) {
      try {
        const module = await import(formatterInfo.path);
        const FormatterClass = module.default || module[formatterInfo.name];
        
        if (FormatterClass) {
          const formatter = new FormatterClass();
          this.registerFormatter(formatterInfo.name, formatter);
          
          // 設定 GenericFormatter 為默認格式化器
          if (formatterInfo.name === 'GenericFormatter') {
            this.defaultFormatter = formatter;
          }
        }
      } catch (error) {
        // 如果格式化器不存在，記錄警告但不中斷初始化
        logger.warn(`[FormatterFactory] 無法載入格式化器 ${formatterInfo.name}`, {
          path: formatterInfo.path,
          error: error.message
        });
      }
    }
  }

  /**
   * 註冊格式化器
   * @param {string} name - 格式化器名稱
   * @param {Object} formatter - 格式化器實例
   */
  registerFormatter(name, formatter) {
    if (!formatter.canHandle || !formatter.format) {
      throw new Error(`格式化器 ${name} 必須實現 canHandle 和 format 方法`);
    }
    
    this.formatters.set(name, formatter);
    logger.debug(`[FormatterFactory] 已註冊格式化器: ${name}`);
  }

  /**
   * 獲取適合的格式化器
   * @param {string} toolName - 工具名稱
   * @param {string} toolType - 工具類型（可選）
   * @returns {Object} 格式化器實例
   */
  getFormatter(toolName, toolType = null) {
    if (!this.initialized) {
      logger.warn('[FormatterFactory] 工廠尚未初始化，使用默認格式化器');
      return this.getDefaultFormatter();
    }

    // 推斷工具類型（如果未提供）
    const inferredType = toolType || fieldMapper.inferCategoryFromToolName(toolName);
    
    logger.debug(`[FormatterFactory] 尋找格式化器`, {
      toolName,
      toolType: inferredType,
      availableFormatters: Array.from(this.formatters.keys())
    });

    // 遍歷所有格式化器，找到第一個能處理該工具的
    for (const [name, formatter] of this.formatters) {
      try {
        if (formatter.canHandle(toolName, inferredType)) {
          logger.debug(`[FormatterFactory] 選擇格式化器: ${name}`, { toolName, toolType: inferredType });
          return formatter;
        }
      } catch (error) {
        logger.warn(`[FormatterFactory] 格式化器 ${name} 檢查失敗`, { error: error.message });
      }
    }

    // 沒有找到合適的格式化器，使用默認格式化器
    logger.debug(`[FormatterFactory] 未找到專用格式化器，使用默認格式化器`, { toolName, toolType: inferredType });
    return this.getDefaultFormatter();
  }

  /**
   * 獲取默認格式化器
   * @returns {Object} 默認格式化器實例
   */
  getDefaultFormatter() {
    if (this.defaultFormatter) {
      return this.defaultFormatter;
    }

    // 如果沒有默認格式化器，創建一個簡單的後備格式化器
    return this.createFallbackFormatter();
  }

  /**
   * 創建後備格式化器
   * @returns {Object} 後備格式化器
   */
  createFallbackFormatter() {
    return {
      canHandle: () => true,
      format: (data, toolName, context = {}) => {
        try {
          if (typeof data === 'string') {
            return data;
          }
          
          if (Array.isArray(data)) {
            return `查詢結果包含 ${data.length} 筆資料:\n${JSON.stringify(data, null, 2)}`;
          }
          
          if (typeof data === 'object' && data !== null) {
            return `工具 ${toolName} 執行結果:\n${JSON.stringify(data, null, 2)}`;
          }
          
          return data.toString();
        } catch (error) {
          logger.error('[FallbackFormatter] 格式化失敗', error);
          return `工具 ${toolName} 執行完成，但格式化時發生錯誤。`;
        }
      }
    };
  }

  /**
   * 格式化工具結果
   * @param {Object} data - 工具結果數據
   * @param {string} toolName - 工具名稱
   * @param {Object} context - 格式化上下文
   * @returns {string} 格式化後的文本
   */
  async formatToolResult(data, toolName, context = {}) {
    try {
      // 確保工廠已初始化
      if (!this.initialized) {
        await this.initialize();
      }

      const formatter = this.getFormatter(toolName, context.toolType);
      const result = formatter.format(data, toolName, context);
      
      logger.debug(`[FormatterFactory] 格式化完成`, {
        toolName,
        formatterUsed: formatter.constructor.name,
        resultLength: result.length
      });
      
      return result;
    } catch (error) {
      logger.error(`[FormatterFactory] 格式化工具結果失敗`, {
        toolName,
        error: error.message
      });
      
      // 返回錯誤友好的消息
      return `⚠️ 工具 ${toolName} 執行完成，但格式化時發生錯誤: ${error.message}`;
    }
  }

  /**
   * 獲取所有已註冊的格式化器信息
   * @returns {Array} 格式化器信息陣列
   */
  getFormatterInfo() {
    const info = [];
    for (const [name, formatter] of this.formatters) {
      info.push({
        name,
        className: formatter.constructor.name,
        hasCanHandle: typeof formatter.canHandle === 'function',
        hasFormat: typeof formatter.format === 'function'
      });
    }
    return info;
  }

  /**
   * 重新載入所有格式化器
   */
  async reload() {
    this.formatters.clear();
    this.defaultFormatter = null;
    this.initialized = false;
    await this.initialize();
    logger.info('[FormatterFactory] 格式化器工廠已重新載入');
  }

  /**
   * 檢查格式化器健康狀態
   * @returns {Object} 健康狀態報告
   */
  healthCheck() {
    const report = {
      initialized: this.initialized,
      formattersCount: this.formatters.size,
      hasDefaultFormatter: !!this.defaultFormatter,
      formatters: this.getFormatterInfo(),
      status: 'healthy'
    };

    // 檢查是否有基本的格式化器
    if (this.formatters.size === 0) {
      report.status = 'warning';
      report.warnings = ['沒有註冊任何格式化器'];
    }

    if (!this.defaultFormatter) {
      report.status = 'warning';
      report.warnings = report.warnings || [];
      report.warnings.push('沒有設定默認格式化器');
    }

    return report;
  }
}

// 單例模式
const formatterFactory = new FormatterFactory();

export default formatterFactory;
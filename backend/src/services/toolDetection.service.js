/**
 * 工具檢測服務 - 重構版本
 * 提供更清晰的工具檢測邏輯和更好的調試能力
 */

import logger from '../utils/logger.util.js';
import McpToolModel from '../models/McpTool.model.js';

class ToolDetectionService {
  constructor() {
    this.detectionStrategies = new Map();
    this.initializeStrategies();
  }

  /**
   * 初始化檢測策略
   */
  initializeStrategies() {
    this.detectionStrategies.set('json_block', new JsonBlockStrategy());
    this.detectionStrategies.set('json_inline', new JsonInlineStrategy());
    this.detectionStrategies.set('xml_structured', new XmlStructuredStrategy());
    this.detectionStrategies.set('xml_simple', new XmlSimpleStrategy());
    this.detectionStrategies.set('tag_format', new TagFormatStrategy());
  }

  /**
   * 檢測工具調用
   * @param {string} text - 待檢測的文本
   * @param {Object} options - 檢測選項
   * @returns {Promise<Array>} 檢測到的工具調用
   */
  async detectToolCalls(text, options = {}) {
    const { 
      enabledStrategies = null, 
      context = {},
      validation = true 
    } = options;

    const detectionId = this.generateDetectionId();
    const startTime = Date.now();

    logger.debug(`[ToolDetection:${detectionId}] 開始工具檢測`, {
      textLength: text.length,
      enabledStrategies: enabledStrategies || 'all',
      context
    });

    try {
      const results = [];

      // 1. 預處理文本
      const preprocessedText = this.preprocessText(text);

      // 2. 使用各種策略檢測
      const strategiesToUse = enabledStrategies 
        ? Array.from(this.detectionStrategies.keys()).filter(key => enabledStrategies.includes(key))
        : Array.from(this.detectionStrategies.keys());

      for (const strategyName of strategiesToUse) {
        const strategy = this.detectionStrategies.get(strategyName);
        
        try {
          const strategyResults = await strategy.detect(preprocessedText, context);
          
          if (strategyResults.length > 0) {
            logger.debug(`[ToolDetection:${detectionId}] 策略 ${strategyName} 檢測到 ${strategyResults.length} 個工具調用`);
            
            results.push(...strategyResults.map(result => ({
              ...result,
              detectionStrategy: strategyName,
              detectionId
            })));
          }
        } catch (error) {
          logger.warn(`[ToolDetection:${detectionId}] 策略 ${strategyName} 檢測失敗`, {
            error: error.message
          });
        }
      }

      // 3. 去重和排序
      const uniqueResults = this.deduplicateResults(results);

      // 4. 驗證工具調用（如果啟用）
      const validatedResults = validation 
        ? await this.validateToolCalls(uniqueResults, detectionId)
        : uniqueResults;

      const processingTime = Date.now() - startTime;

      logger.info(`[ToolDetection:${detectionId}] 工具檢測完成`, {
        totalResults: results.length,
        uniqueResults: uniqueResults.length,
        validatedResults: validatedResults.length,
        processingTime,
        strategiesUsed: strategiesToUse
      });

      return validatedResults;

    } catch (error) {
      logger.error(`[ToolDetection:${detectionId}] 工具檢測失敗`, {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * 預處理文本
   */
  preprocessText(text) {
    // 移除註釋
    let processed = text.replace(/\/\*[\s\S]*?\*\//g, '');
    processed = processed.replace(/\/\/.*$/gm, '');
    
    // 移除過多的空白字符
    processed = processed.replace(/\s+/g, ' ').trim();
    
    return processed;
  }

  /**
   * 去重結果
   */
  deduplicateResults(results) {
    const seen = new Set();
    return results.filter(result => {
      const key = `${result.name}:${JSON.stringify(result.parameters)}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * 驗證工具調用
   */
  async validateToolCalls(toolCalls, detectionId) {
    const validatedResults = [];
    
    // 獲取可用工具列表
    const availableTools = await McpToolModel.getEnabledMcpTools();
    const toolNames = new Set(availableTools.map(tool => tool.name));

    for (const toolCall of toolCalls) {
      try {
        // 驗證工具名稱
        if (!toolNames.has(toolCall.name)) {
          logger.warn(`[ToolDetection:${detectionId}] 工具 ${toolCall.name} 不存在或未啟用`);
          continue;
        }

        // 驗證參數格式
        if (!this.validateParameters(toolCall.parameters)) {
          logger.warn(`[ToolDetection:${detectionId}] 工具 ${toolCall.name} 參數格式無效`);
          continue;
        }

        validatedResults.push({
          ...toolCall,
          validated: true,
          validationTime: new Date().toISOString()
        });

      } catch (error) {
        logger.warn(`[ToolDetection:${detectionId}] 驗證工具調用失敗`, {
          toolName: toolCall.name,
          error: error.message
        });
      }
    }

    return validatedResults;
  }

  /**
   * 驗證參數格式
   */
  validateParameters(parameters) {
    if (parameters === null || parameters === undefined) {
      return false;
    }
    
    if (typeof parameters !== 'object') {
      return false;
    }

    // 檢查是否為有效的 JSON 對象
    try {
      JSON.stringify(parameters);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 生成檢測 ID
   */
  generateDetectionId() {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * 獲取檢測統計
   */
  getDetectionStats() {
    return {
      availableStrategies: Array.from(this.detectionStrategies.keys()),
      strategiesCount: this.detectionStrategies.size
    };
  }
}

/**
 * JSON 代碼塊策略
 */
class JsonBlockStrategy {
  detect(text, context) {
    const pattern = /```json\s*(\{[\s\S]*?\})\s*```/gi;
    const results = [];
    let match;

    while ((match = pattern.exec(text)) !== null) {
      try {
        const jsonStr = match[1];
        const parsed = JSON.parse(jsonStr);

        if (parsed.tool && typeof parsed.tool === 'string') {
          results.push({
            name: parsed.tool,
            parameters: parsed.parameters || parsed.params || {},
            format: 'json_block',
            rawMatch: match[0],
            confidence: 0.9
          });
        }
      } catch (error) {
        // JSON 解析失敗，跳過此匹配
        continue;
      }
    }

    return results;
  }
}

/**
 * JSON 內聯策略
 */
class JsonInlineStrategy {
  detect(text, context) {
    const pattern = /\{(?:[^{}]|{[^{}]*})*"tool"(?:[^{}]|{[^{}]*})*\}/g;
    const results = [];
    let match;

    while ((match = pattern.exec(text)) !== null) {
      try {
        const parsed = JSON.parse(match[0]);

        if (parsed.tool && typeof parsed.tool === 'string') {
          results.push({
            name: parsed.tool,
            parameters: parsed.parameters || parsed.params || {},
            format: 'json_inline',
            rawMatch: match[0],
            confidence: 0.8
          });
        }
      } catch (error) {
        continue;
      }
    }

    return results;
  }
}

/**
 * XML 結構化策略
 */
class XmlStructuredStrategy {
  detect(text, context) {
    const pattern = /<tool_call>\s*<name>([^<]+)<\/name>\s*<parameters>([\s\S]*?)<\/parameters>\s*<\/tool_call>/gi;
    const results = [];
    let match;

    while ((match = pattern.exec(text)) !== null) {
      try {
        const toolName = match[1].trim();
        const paramsStr = match[2].trim();

        let parameters = {};
        if (paramsStr) {
          try {
            parameters = JSON.parse(paramsStr);
          } catch {
            parameters = this.parseKeyValuePairs(paramsStr);
          }
        }

        results.push({
          name: toolName,
          parameters,
          format: 'xml_structured',
          rawMatch: match[0],
          confidence: 0.9
        });
      } catch (error) {
        continue;
      }
    }

    return results;
  }

  parseKeyValuePairs(str) {
    const pairs = {};
    const lines = str.split('\n').map(line => line.trim()).filter(line => line);
    
    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        pairs[key.trim()] = valueParts.join(':').trim();
      }
    }
    
    return pairs;
  }
}

/**
 * XML 簡單策略
 */
class XmlSimpleStrategy {
  detect(text, context) {
    const pattern = /<tool_call>([\s\S]*?)<\/tool_call>/gi;
    const results = [];
    let match;

    while ((match = pattern.exec(text)) !== null) {
      try {
        const content = match[1].trim();
        const lines = content.split('\n').map(line => line.trim()).filter(line => line);

        if (lines.length > 0) {
          const toolName = lines[0];
          const paramsStr = lines.length > 1 ? lines[1] : '{}';

          let parameters = {};
          try {
            parameters = JSON.parse(paramsStr);
          } catch {
            parameters = this.parseSimpleParams(paramsStr);
          }

          results.push({
            name: toolName,
            parameters,
            format: 'xml_simple',
            rawMatch: match[0],
            confidence: 0.7
          });
        }
      } catch (error) {
        continue;
      }
    }

    return results;
  }

  parseSimpleParams(str) {
    if (!str || str === '{}') return {};
    
    const params = {};
    const parts = str.split(',').map(part => part.trim());
    
    for (const part of parts) {
      const [key, value] = part.split('=').map(s => s.trim());
      if (key && value) {
        params[key] = value.replace(/^["']|["']$/g, '');
      }
    }
    
    return params;
  }
}

/**
 * 標籤格式策略
 */
class TagFormatStrategy {
  detect(text, context) {
    const pattern = /<tool_call\s+name="([^"]+)"\s*(?:params="([^"]*)")?\s*\/?>/gi;
    const results = [];
    let match;

    while ((match = pattern.exec(text)) !== null) {
      try {
        const toolName = match[1];
        const paramsStr = match[2] || '{}';

        let parameters = {};
        try {
          parameters = JSON.parse(paramsStr);
        } catch {
          parameters = this.parseAttributeParams(paramsStr);
        }

        results.push({
          name: toolName,
          parameters,
          format: 'tag_format',
          rawMatch: match[0],
          confidence: 0.8
        });
      } catch (error) {
        continue;
      }
    }

    return results;
  }

  parseAttributeParams(str) {
    if (!str) return {};
    
    const params = {};
    const pairs = str.split(',').map(pair => pair.trim());
    
    for (const pair of pairs) {
      const [key, value] = pair.split(':').map(s => s.trim());
      if (key && value) {
        params[key] = value.replace(/^["']|["']$/g, '');
      }
    }
    
    return params;
  }
}

export default new ToolDetectionService();
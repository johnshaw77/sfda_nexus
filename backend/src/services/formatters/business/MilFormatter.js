/**
 * MIL 專案管理格式化器
 * 專門處理 MIL 專案管理相關工具的數據格式化
 */

import { BaseFormatter } from "../base/BaseFormatter.js";
import fieldMapper from "../base/FieldMapper.js";

export default class MilFormatter extends BaseFormatter {
  constructor() {
    super();
    this.category = 'mil_management';
    this.supportedTools = [
      'get-mil-list',
      'get_mil_list',
      'get-mil-details',
      'get_mil_details',
      'get-mil-status-report',
      'get_mil_status_report'
    ];
  }

  /**
   * 檢查是否支援該工具
   * @param {string} toolName - 工具名稱
   * @param {string} toolType - 工具類型
   * @returns {boolean}
   */
  canHandle(toolName, toolType = null) {
    const toolNameLower = toolName.toLowerCase();
    
    // 檢查是否在支援的工具列表中
    if (this.supportedTools.includes(toolName)) {
      return true;
    }
    
    // 檢查工具名稱是否包含 MIL 關鍵字
    if (toolNameLower.includes('mil')) {
      return true;
    }
    
    // 檢查工具類型
    if (toolType === this.category) {
      return true;
    }
    
    return false;
  }

  /**
   * 格式化工具結果
   * @param {Object} data - 工具結果數據
   * @param {string} toolName - 工具名稱
   * @param {Object} context - 格式化上下文
   * @returns {string} 格式化後的文本
   */
  format(data, toolName, context = {}) {
    if (!data) {
      return "無 MIL 數據";
    }

    // 檢查是否為錯誤回應或空數據
    if (this.isErrorResponse(data)) {
      return this.formatErrorResponse(data, toolName);
    }

    this.debug(`開始格式化 MIL 工具結果`, { toolName, dataType: typeof data });

    try {
      switch (toolName) {
        case "get-mil-list":
        case "get_mil_list":
          return this.formatMILListResult(data);
        case "get-mil-details":
        case "get_mil_details":
          return this.formatMILDetailsResult(data);
        case "get-mil-status-report":
        case "get_mil_status_report":
          return this.formatMILStatusReport(data);
        default:
          return this.formatGeneralMILResult(data);
      }
    } catch (error) {
      this.error(`格式化 MIL 結果時發生錯誤 (${toolName})`, error);
      return this.formatFallback(data, toolName);
    }
  }

  /**
   * 格式化 MIL 列表結果
   * @param {Object} data - MIL 列表數據
   * @returns {string} 格式化的 MIL 列表報告
   */
  formatMILListResult(data) {
    let formatted = "## 📋 MIL 專案管理清單\n\n";

    // AI 指導提示詞處理
    const aiInstructions = this.processAIInstructions(data.aiInstructions);
    if (aiInstructions) {
      formatted += "### 🧠 AI 分析指導\n";
      formatted += `${aiInstructions}\n\n`;
      formatted += "---\n\n";
    }

    // 專案摘要資訊
    if (data.statistics?.summary) {
      formatted += "### 📊 專案摘要\n";
      formatted += `${data.statistics.summary}\n\n`;
    }

    // 專案詳細數據分析
    formatted += this.formatStatisticsSection(data.statistics);

    // 查詢資訊
    formatted += this.formatQueryInfo(data);

    // 篩選條件
    formatted += this.formatFilters(data.filters);

    // 🔍 新增：原始工具數據展示
    formatted += this.formatRawDataSection(data.data);

    // 完整數據列表
    formatted += this.formatProjectsList(data.data);

    return formatted;
  }

  /**
   * 格式化統計分析區段
   * @param {Object} statistics - 統計數據
   * @returns {string} 格式化的統計區段
   */
  formatStatisticsSection(statistics) {
    if (!statistics?.details) return "";

    let formatted = "";
    const stats = statistics.details;

    formatted += "### 🔍 專案數據分析\n";

    if (stats.totalCount !== undefined) {
      formatted += `- **總專案數**: ${this.formatNumber(stats.totalCount)} 筆\n`;
    }

    if (stats.avgDelayDays !== undefined) {
      formatted += `- **平均延遲天數**: ${this.formatNumber(stats.avgDelayDays, 1)} 天\n`;
    }

    if (stats.delayRange) {
      formatted += `- **延遲範圍**: ${stats.delayRange.min} ~ ${stats.delayRange.max} 天\n`;
    }

    formatted += "\n";

    // 風險分析
    if (stats.riskAnalysis) {
      formatted += "### ⚠️ 風險分析\n";
      const risk = stats.riskAnalysis;
      
      if (risk.highRisk !== undefined) {
        formatted += `- **高風險專案**: ${this.formatNumber(risk.highRisk)} 筆（延遲 > 10天）\n`;
      }
      if (risk.delayed !== undefined) {
        formatted += `- **延遲專案**: ${this.formatNumber(risk.delayed)} 筆\n`;
      }
      if (risk.onTimeOrEarly !== undefined) {
        formatted += `- **準時或提前**: ${this.formatNumber(risk.onTimeOrEarly)} 筆\n`;
      }
      formatted += "\n";
    }

    // 責任分布
    if (stats.responsibility) {
      formatted += "### 👥 責任分布\n";
      const resp = stats.responsibility;
      
      if (resp.uniqueDRICount !== undefined) {
        formatted += `- **涉及負責人**: ${this.formatNumber(resp.uniqueDRICount)} 位\n`;
      }
      if (resp.uniqueDeptCount !== undefined) {
        formatted += `- **涉及部門**: ${this.formatNumber(resp.uniqueDeptCount)} 個\n`;
      }
      formatted += "\n";
    }

    return formatted;
  }

  /**
   * 格式化查詢資訊
   * @param {Object} data - 查詢數據
   * @returns {string} 格式化的查詢資訊
   */
  formatQueryInfo(data) {
    if (data.totalRecords === undefined) return "";

    let formatted = "### 📈 查詢資訊\n";
    formatted += `- **查詢筆數**: ${this.formatNumber(data.count || 0)} / ${this.formatNumber(data.totalRecords)} 筆\n`;
    
    if (data.currentPage && data.totalPages) {
      formatted += `- **分頁資訊**: 第 ${data.currentPage} 頁，共 ${data.totalPages} 頁\n`;
    }
    
    formatted += `- **查詢時間**: ${this.formatTimestamp(data.timestamp) || "未知"}\n\n`;
    
    return formatted;
  }

  /**
   * 格式化篩選條件
   * @param {Object} filters - 篩選條件
   * @returns {string} 格式化的篩選條件
   */
  formatFilters(filters) {
    if (!filters || Object.keys(filters).length === 0) return "";

    let formatted = "### 🔧 篩選條件\n";
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        const label = fieldMapper.getFieldLabel(key, this.category);
        formatted += `- **${label}**: ${value}\n`;
      }
    });
    
    formatted += "\n";
    return formatted;
  }

  /**
   * 格式化原始工具數據區段
   * @param {Array} rawData - 原始數據陣列
   * @returns {string} 格式化的原始數據區段
   */
  formatRawDataSection(rawData) {
    // 🔇 暫時隱藏原始工具數據區段
    return "";
    
    /* 
    // 原始實現 - 如需要可以重新啟用
    if (!Array.isArray(rawData) || rawData.length === 0) {
      return "### 📋 原始工具數據\n\n無數據\n\n";
    }

    let formatted = "### 📋 原始工具數據\n\n";
    formatted += `💡 **用途說明**: 以下是工具實際返回的 JSON 數據，可複製用於測試 AI 幻覺問題\n\n`;
    
    // 使用簡潔的 JSON 代碼區塊，避免 HTML 相容性問題
    formatted += "```json\n";
    
    try {
      // 格式化 JSON，每個物件一行以便閱讀
      const formattedJson = JSON.stringify(rawData, null, 2);
      formatted += formattedJson;
    } catch (error) {
      formatted += "JSON 格式化錯誤: " + error.message;
    }
    
    formatted += "\n```\n\n";
    
    formatted += `📊 **數據統計**: 共 ${rawData.length} 筆記錄\n\n`;
    
    // 顯示可用欄位
    if (rawData.length > 0) {
      const sampleItem = rawData[0];
      const availableFields = Object.keys(sampleItem);
      formatted += `🗂️ **可用欄位** (${availableFields.length} 個): ${availableFields.join(', ')}\n\n`;
    }
    
    return formatted;
    */
  }

  /**
   * 格式化專案列表
   * @param {Array} projects - 專案數據陣列
   * @returns {string} 格式化的專案列表
   */
  formatProjectsList(projects) {
    if (!Array.isArray(projects) || projects.length === 0) {
      return "### 📝 專案清單\n\n無專案數據\n";
    }

    let formatted = `### 📝 專案清單 (共 ${projects.length} 筆)\n\n`;

    // 檢查重要欄位缺失
    const sampleItem = projects[0];
    const availableFields = Object.keys(sampleItem);
    const missingImportantFields = this.checkMissingImportantFields(availableFields);
    
    if (missingImportantFields.length > 0) {
      formatted += `⚠️ **注意**: 以下重要欄位在數據中缺失: ${missingImportantFields.join(', ')}\n\n`;
    }

    const sortedFields = fieldMapper.sortFieldsByPriority(availableFields, this.category);
    
    // 智能選擇顯示欄位：優先顯示核心欄位，確保重要文本內容能顯示
    const coreFields = sortedFields.filter(field => {
      const mapping = fieldMapper.getFieldMapping(field, this.category);
      return mapping.priority <= 2; // 優先級1和2
    });
    
    const detailFields = sortedFields.filter(field => {
      const mapping = fieldMapper.getFieldMapping(field, this.category);
      return mapping.priority > 2; // 優先級3（詳細資訊）
    });

    // 表格顯示核心欄位（限制8個避免過寬）
    const displayFields = coreFields.slice(0, 8);
    const headers = displayFields.map(field => fieldMapper.getFieldLabel(field, this.category));
    
    formatted += this.generateTableHeader(headers) + "\n";

    // 檢查是否包含文本欄位，決定顯示格式
    const hasTextFields = displayFields.some(field => {
      const mapping = fieldMapper.getFieldMapping(field, this.category);
      return mapping.type === 'text';
    });

    if (hasTextFields && projects.length <= 3) {
      // 如果有文本欄位且專案數量不多，使用列表格式以完整顯示內容
      projects.forEach((project, index) => {
        formatted += `**${index + 1}. ${project.SerialNumber || '專案'}**\n`;
        displayFields.forEach(field => {
          const value = this.safeGet(project, field, '');
          if (value && value !== '' && value !== 'undefined') {
            const label = fieldMapper.getFieldLabel(field, this.category);
            
            // 對於列表格式，不截斷文本內容
            const mapping = fieldMapper.getFieldMapping(field, this.category);
            let formattedValue;
            if (mapping.type === 'text') {
              // 文本類型直接返回完整內容，不截斷
              formattedValue = value.toString();
            } else {
              formattedValue = fieldMapper.formatFieldValue(value, field, this.category);
            }
            
            // 檢查是否需要高亮
            const highlightRule = fieldMapper.checkHighlightRule(field, value, this.category);
            const displayValue = highlightRule ? `⚠️ ${formattedValue}` : formattedValue;
            
            formatted += `- **${label}**: ${displayValue}\n`;
          }
        });
        formatted += "\n";
      });
    } else {
      // 使用傳統表格格式
      projects.forEach((project, index) => {
        const cells = displayFields.map(field => {
          const value = this.safeGet(project, field, '');
          const formattedValue = fieldMapper.formatFieldValue(value, field, this.category);
          
          // 檢查欄位類型，文本欄位允許更長的顯示
          const mapping = fieldMapper.getFieldMapping(field, this.category);
          const maxLength = mapping.type === 'text' ? 50 : 20;
          
          // 檢查是否需要高亮
          const highlightRule = fieldMapper.checkHighlightRule(field, value, this.category);
          if (highlightRule) {
            return `⚠️ ${this.truncateString(formattedValue, maxLength)}`;
          }
          
          return this.truncateString(formattedValue, maxLength);
        });
        
        formatted += this.generateTableRow(cells) + "\n";
      });
    }

    formatted += "\n";

    // 顯示詳細文本資訊（不截斷重要內容）
    if (detailFields.length > 0) {
      formatted += "### 📋 詳細資訊\n\n";
      
      projects.forEach((project, index) => {
        if (projects.length > 1) {
          formatted += `**${index + 1}. ${project.SerialNumber || '未知編號'}**\n`;
        }
        
        detailFields.forEach(field => {
          const value = this.safeGet(project, field, '');
          if (value && value !== '' && value !== 'undefined') {
            const label = fieldMapper.getFieldLabel(field, this.category);
            
            // 對於詳細資訊區段，文本類型不截斷
            const mapping = fieldMapper.getFieldMapping(field, this.category);
            let formattedValue;
            if (mapping.type === 'text') {
              // 文本類型直接返回完整內容，不截斷
              formattedValue = value.toString();
            } else {
              formattedValue = fieldMapper.formatFieldValue(value, field, this.category);
            }
            
            formatted += `- **${label}**: ${formattedValue}\n`;
          }
        });
        
        if (projects.length > 1) {
          formatted += "\n";
        }
      });
      
      formatted += "\n";
    }

    // 顯示隱藏的核心欄位
    if (coreFields.length > displayFields.length) {
      const hiddenCoreFields = coreFields.slice(8).map(field => 
        fieldMapper.getFieldLabel(field, this.category)
      );
      formatted += `🔍 **其他核心欄位**: ${hiddenCoreFields.join(', ')}\n\n`;
    }

    return formatted;
  }

  /**
   * 檢查缺失的重要欄位
   * @param {Array} availableFields - 可用欄位列表
   * @returns {Array} 缺失的重要欄位標籤
   */
  checkMissingImportantFields(availableFields) {
    // 定義重要欄位（優先級1和2）
    const importantFields = [
      'TypeName', 'Status', 'is_APPLY', 'MidTypeName', 'RecordDate',
      'ActualFinishDate', 'ChangeFinishDate', 'Solution'
    ];

    const missingFields = importantFields.filter(field => !availableFields.includes(field));
    
    return missingFields.map(field => fieldMapper.getFieldLabel(field, this.category));
  }

  /**
   * 格式化 MIL 詳細結果
   * @param {Object} data - MIL 詳細數據
   * @returns {string} 格式化的詳細報告
   */
  formatMILDetailsResult(data) {
    let formatted = "## 🔍 MIL 專案詳細資訊\n\n";

    if (data.data) {
      const project = data.data;
      const allFields = Object.keys(project);
      const sortedFields = fieldMapper.sortFieldsByPriority(allFields, this.category);

      formatted += "### 📋 專案基本資訊\n\n";

      // 按優先級顯示所有欄位
      sortedFields.forEach(field => {
        const label = fieldMapper.getFieldLabel(field, this.category);
        const value = project[field];
        const formattedValue = fieldMapper.formatFieldValue(value, field, this.category);
        
        // 檢查高亮規則
        const highlightRule = fieldMapper.checkHighlightRule(field, value, this.category);
        if (highlightRule) {
          formatted += `- **${label}**: ⚠️ ${formattedValue} (${highlightRule.message})\n`;
        } else {
          formatted += `- **${label}**: ${formattedValue}\n`;
        }
      });

      formatted += "\n";
      
      // 🔍 新增：原始工具數據展示
      formatted += this.formatRawDataSection([project]);
    }

    return formatted;
  }

  /**
   * 格式化 MIL 狀態報告
   * @param {Object} data - 狀態報告數據
   * @returns {string} 格式化的狀態報告
   */
  formatMILStatusReport(data) {
    let formatted = "## 📊 MIL 專案狀態報告\n\n";

    // 總體統計
    if (data.summary) {
      formatted += "### 📈 總體統計\n";
      Object.entries(data.summary).forEach(([key, value]) => {
        const label = fieldMapper.getFieldLabel(key, this.category);
        formatted += `- **${label}**: ${this.formatNumber(value)}\n`;
      });
      formatted += "\n";
    }

    // 狀態分布
    if (data.statusDistribution) {
      formatted += "### 📊 狀態分布\n\n";
      formatted += this.generateTableHeader(['狀態', '數量', '百分比']) + "\n";
      
      Object.entries(data.statusDistribution).forEach(([status, count]) => {
        const percentage = data.total ? ((count / data.total) * 100).toFixed(1) : '0';
        formatted += this.generateTableRow([status, count.toString(), `${percentage}%`]) + "\n";
      });
      formatted += "\n";
    }

    return formatted;
  }

  /**
   * 格式化通用 MIL 結果
   * @param {Object} data - 通用數據
   * @returns {string} 格式化的通用結果
   */
  formatGeneralMILResult(data) {
    let formatted = "## 📋 MIL 專案管理結果\n\n";

    if (Array.isArray(data)) {
      return this.formatProjectsList(data);
    }

    if (typeof data === 'object' && data !== null) {
      formatted += "### 📊 結果數據\n";
      
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'data' && Array.isArray(value)) {
          formatted += this.formatProjectsList(value);
        } else {
          const label = fieldMapper.getFieldLabel(key, this.category);
          const formattedValue = fieldMapper.formatFieldValue(value, key, this.category);
          formatted += `- **${label}**: ${formattedValue}\n`;
        }
      });
    }

    return formatted;
  }

  /**
   * 檢查是否為錯誤回應
   * @param {Object} data - 數據
   * @returns {boolean} 是否為錯誤回應
   */
  isErrorResponse(data) {
    // 檢查常見的錯誤指標
    if (data.success === false) return true;
    if (data.error) return true;
    if (data.data && Array.isArray(data.data) && data.data.length === 0 && data.count === 0) {
      // 空結果但有明確的查詢資訊
      return false; 
    }
    
    // 檢查是否缺少必要的數據結構
    if (!data.data && !data.timestamp && !data.count) return true;
    
    return false;
  }

  /**
   * 格式化錯誤回應
   * @param {Object} data - 錯誤數據
   * @param {string} toolName - 工具名稱
   * @returns {string} 錯誤訊息
   */
  formatErrorResponse(data, toolName) {
    let formatted = `## ❌ MIL 查詢執行錯誤\n\n`;
    
    if (data.error) {
      formatted += `**錯誤訊息**: ${data.error}\n\n`;
    }
    
    // 🔧 新增：檢查未知參數錯誤
    if (data.error && data.error.includes('Unknown parameter')) {
      const errorMessage = data.error;
      
      // 提取未知參數名稱
      const unknownParamMatch = errorMessage.match(/Unknown parameter\(s\): ([^.]+)/);
      const allowedParamsMatch = errorMessage.match(/Allowed parameters: (.+)$/);
      
      if (unknownParamMatch && allowedParamsMatch) {
        const unknownParams = unknownParamMatch[1];
        const allowedParams = allowedParamsMatch[1];
        
        formatted += `⚠️ **參數錯誤**: 查詢條件中包含不存在的參數 \`${unknownParams}\`\n\n`;
        formatted += `**可用的查詢參數**:\n`;
        
        // 格式化允許的參數列表
        const paramList = allowedParams.split(', ');
        paramList.forEach(param => {
          // 提供常用參數的說明
          const paramDescriptions = {
            'delayDayMin': '最小延遲天數 - 查詢延遲天數 ≥ 此值的專案',
            'delayDayMax': '最大延遲天數 - 查詢延遲天數 ≤ 此值的專案', 
            'status': '專案狀態 (OnGoing, Completed, Cancelled)',
            'isApply': '申請結案狀態 (Y=已申請, N=未申請)',
            'typeName': 'MIL 類別',
            'importance': '重要度 (H=高, M=中, L=低)',
            'driName': '負責人姓名',
            'driDept': '負責部門',
            'proposalFactory': '提案廠別 (JK, KH, KS)'
          };
          
          const description = paramDescriptions[param] || '查詢參數';
          formatted += `- \`${param}\`: ${description}\n`;
        });
        
        formatted += `\n**建議修正**:\n`;
        if (unknownParams.includes('naqi_num')) {
          formatted += `- 將 \`naqi_num > 3\` 改為 \`delayDayMin: 3\`\n`;
        }
        formatted += `- 使用 \`isApply: "N"\` 查詢未申請結案的專案\n\n`;
      }
    }
    // 向後兼容原有的 naqi_num 錯誤檢查
    else if (data.error && data.error.includes('naqi_num')) {
      formatted += `⚠️ **可能的問題**: 查詢條件中包含不存在的欄位 \`naqi_num\`\n\n`;
      formatted += `**可用的延遲相關欄位**:\n`;
      formatted += `- \`DelayDay\`: 延遲天數\n`;
      formatted += `- \`Status\`: 專案狀態\n`;
      formatted += `- \`is_APPLY\`: 申請結案狀態\n\n`;
      formatted += `**建議查詢條件**: \`DelayDay > 10 AND is_APPLY = '否'\`\n\n`;
    }
    
    formatted += `**工具**: ${toolName}\n`;
    formatted += `**建議**: 請檢查查詢條件是否正確，或聯繫系統管理員確認參數名稱。\n\n`;
    
    return formatted;
  }

  /**
   * 後備格式化方法
   * @param {Object} data - 數據
   * @param {string} toolName - 工具名稱
   * @returns {string} 格式化的後備結果
   */
  formatFallback(data, toolName) {
    let formatted = `## ⚠️ MIL 工具執行結果 (${toolName})\n\n`;
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
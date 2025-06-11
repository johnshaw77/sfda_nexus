/**
 * 智能工具顯示配置系統
 * 自動推斷工具的顯示屬性，減少手動配置工作
 */

// 手動配置覆蓋（僅用於特殊情況）
const MANUAL_OVERRIDES = {
  // HR 工具的特殊配置
  get_employee_info: {
    displayName: "員工詳細資料查詢",
    icon: "UserOutlined",
    category: "HR",
    color: "blue",
    description: "查詢員工的完整資訊，包括基本資料、聯絡方式、職位等",
  },

  // 可以根據需要添加更多手動覆蓋
};

// 自動推斷規則配置
const INFERENCE_RULES = {
  // 動作類型推斷
  actionPatterns: [
    { regex: /^get_.*/, action: "查詢", icon: "SearchOutlined" },
    { regex: /^create_.*/, action: "建立", icon: "PlusOutlined" },
    { regex: /^update_.*/, action: "更新", icon: "EditOutlined" },
    { regex: /^delete_.*/, action: "刪除", icon: "DeleteOutlined" },
    { regex: /.*_list$/, action: "列表", icon: "UnorderedListOutlined" },
    { regex: /.*_info$/, action: "資訊", icon: "InfoCircleOutlined" },
    { regex: /.*_status$/, action: "狀態", icon: "CheckCircleOutlined" },
    { regex: /.*_record.*/, action: "記錄", icon: "FileTextOutlined" },
  ],

  // 領域類型推斷
  domainPatterns: [
    {
      regex: /(employee|staff|user|person|member)/,
      domain: "員工",
      category: "HR",
      color: "blue",
      icon: "UserOutlined",
    },
    {
      regex: /(department|team|group|division)/,
      domain: "部門",
      category: "HR",
      color: "blue",
      icon: "TeamOutlined",
    },
    {
      regex: /(salary|wage|pay|compensation)/,
      domain: "薪資",
      category: "HR",
      color: "blue",
      icon: "DollarOutlined",
    },
    {
      regex: /(attendance|checkin|checkout|leave)/,
      domain: "考勤",
      category: "HR",
      color: "blue",
      icon: "ClockCircleOutlined",
    },
    {
      regex: /(task|todo|job|activity)/,
      domain: "任務",
      category: "任務管理",
      color: "green",
      icon: "CheckSquareOutlined",
    },
    {
      regex: /(project|initiative)/,
      domain: "專案",
      category: "任務管理",
      color: "green",
      icon: "ProjectOutlined",
    },
    {
      regex: /(budget|finance|money|cost|expense)/,
      domain: "財務",
      category: "財務管理",
      color: "orange",
      icon: "PieChartOutlined",
    },
    {
      regex: /(report|analytics|stats|metrics)/,
      domain: "報表",
      category: "分析",
      color: "purple",
      icon: "BarChartOutlined",
    },
  ],

  // 中文名稱生成規則
  nameTemplates: {
    "get_{domain}_info": "{domain}資訊查詢",
    "get_{domain}_list": "{domain}清單查詢",
    "create_{domain}": "建立{domain}",
    "update_{domain}": "更新{domain}",
    "delete_{domain}": "刪除{domain}",
    "{domain}_{action}": "{domain}{action}",
    default: "{action}{domain}",
  },
};

/**
 * 智能工具配置管理器
 */
class ToolDisplayConfigManager {
  /**
   * 獲取工具的完整顯示配置
   * @param {string} toolName - 工具名稱
   * @param {Object} toolMeta - 工具元數據（可選）
   * @returns {Object} 完整的顯示配置
   */
  static getToolConfig(toolName, toolMeta = {}) {
    // 1. 優先使用手動覆蓋配置
    if (MANUAL_OVERRIDES[toolName]) {
      return {
        ...this.inferToolConfig(toolName, toolMeta),
        ...MANUAL_OVERRIDES[toolName],
      };
    }

    // 2. 使用自動推斷
    return this.inferToolConfig(toolName, toolMeta);
  }

  /**
   * 自動推斷工具配置
   * @param {string} toolName - 工具名稱
   * @param {Object} toolMeta - 工具元數據
   * @returns {Object} 推斷的配置
   */
  static inferToolConfig(toolName, toolMeta = {}) {
    const config = {
      toolName,
      displayName: toolName,
      icon: "ToolOutlined",
      category: "工具",
      color: "default",
      action: "執行",
      domain: "通用",
    };

    // 推斷動作類型
    const actionMatch = INFERENCE_RULES.actionPatterns.find((pattern) =>
      pattern.regex.test(toolName)
    );
    if (actionMatch) {
      config.action = actionMatch.action;
      config.icon = actionMatch.icon;
    }

    // 推斷領域類型
    const domainMatch = INFERENCE_RULES.domainPatterns.find((pattern) =>
      pattern.regex.test(toolName)
    );
    if (domainMatch) {
      config.domain = domainMatch.domain;
      config.category = domainMatch.category;
      config.color = domainMatch.color;
      // 如果沒有從動作推斷出圖標，使用領域圖標
      if (config.icon === "ToolOutlined") {
        config.icon = domainMatch.icon;
      }
    }

    // 生成顯示名稱
    config.displayName = this.generateDisplayName(toolName, config);

    // 如果有工具元數據描述，優先使用
    if (toolMeta.description) {
      config.description = toolMeta.description;
    }

    return config;
  }

  /**
   * 生成顯示名稱
   * @param {string} toolName - 工具名稱
   * @param {Object} config - 已推斷的配置
   * @returns {string} 生成的顯示名稱
   */
  static generateDisplayName(toolName, config) {
    // 嘗試匹配名稱模板
    for (const [template, namePattern] of Object.entries(
      INFERENCE_RULES.nameTemplates
    )) {
      if (template === "default") continue;

      const regex = new RegExp(
        "^" +
          template.replace("{domain}", "(.+)").replace("{action}", "(.+)") +
          "$"
      );

      if (regex.test(toolName)) {
        return namePattern
          .replace("{domain}", config.domain)
          .replace("{action}", config.action);
      }
    }

    // 使用預設模板
    return INFERENCE_RULES.nameTemplates.default
      .replace("{domain}", config.domain)
      .replace("{action}", config.action);
  }

  /**
   * 批量獲取工具配置
   * @param {Array} tools - 工具清單
   * @returns {Object} 工具名稱到配置的映射
   */
  static getBatchToolConfigs(tools) {
    const configs = {};
    tools.forEach((tool) => {
      const toolName = typeof tool === "string" ? tool : tool.name;
      const toolMeta = typeof tool === "object" ? tool : {};
      configs[toolName] = this.getToolConfig(toolName, toolMeta);
    });
    return configs;
  }

  /**
   * 添加手動覆蓋配置
   * @param {string} toolName - 工具名稱
   * @param {Object} config - 覆蓋配置
   */
  static addManualOverride(toolName, config) {
    MANUAL_OVERRIDES[toolName] = { ...MANUAL_OVERRIDES[toolName], ...config };
  }

  /**
   * 獲取支援的圖標清單
   * @returns {Array} 圖標名稱陣列
   */
  static getSupportedIcons() {
    return [
      "UserOutlined",
      "TeamOutlined",
      "DollarOutlined",
      "ClockCircleOutlined",
      "CheckSquareOutlined",
      "ProjectOutlined",
      "PieChartOutlined",
      "BarChartOutlined",
      "SearchOutlined",
      "PlusOutlined",
      "EditOutlined",
      "DeleteOutlined",
      "UnorderedListOutlined",
      "InfoCircleOutlined",
      "CheckCircleOutlined",
      "FileTextOutlined",
      "ToolOutlined",
    ];
  }
}

export default ToolDisplayConfigManager;

// 使用範例：
// const config = ToolDisplayConfigManager.getToolConfig('get_employee_info');
// console.log(config);
// 輸出: {
//   toolName: 'get_employee_info',
//   displayName: '員工資訊查詢',
//   icon: 'UserOutlined',
//   category: 'HR',
//   color: 'blue',
//   action: '查詢',
//   domain: '員工'
// }

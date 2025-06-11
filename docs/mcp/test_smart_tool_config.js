/**
 * 智能工具配置系統演示測試
 * 展示如何自動處理新的MCP工具而無需手動配置
 * 2025-06-11
 */

// 模擬導入智能配置系統（在實際項目中會是 import）
const MANUAL_OVERRIDES = {
  get_employee_info: {
    displayName: "員工詳細資料查詢",
    icon: "UserOutlined",
    category: "HR",
    color: "blue",
    description: "查詢員工的完整資訊，包括基本資料、聯絡方式、職位等",
  },
};

const INFERENCE_RULES = {
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

class ToolDisplayConfigManager {
  static getToolConfig(toolName, toolMeta = {}) {
    if (MANUAL_OVERRIDES[toolName]) {
      return {
        ...this.inferToolConfig(toolName, toolMeta),
        ...MANUAL_OVERRIDES[toolName],
      };
    }
    return this.inferToolConfig(toolName, toolMeta);
  }

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

    const actionMatch = INFERENCE_RULES.actionPatterns.find((pattern) =>
      pattern.regex.test(toolName)
    );
    if (actionMatch) {
      config.action = actionMatch.action;
      config.icon = actionMatch.icon;
    }

    const domainMatch = INFERENCE_RULES.domainPatterns.find((pattern) =>
      pattern.regex.test(toolName)
    );
    if (domainMatch) {
      config.domain = domainMatch.domain;
      config.category = domainMatch.category;
      config.color = domainMatch.color;
      if (config.icon === "ToolOutlined") {
        config.icon = domainMatch.icon;
      }
    }

    config.displayName = this.generateDisplayName(toolName, config);

    if (toolMeta.description) {
      config.description = toolMeta.description;
    }

    return config;
  }

  static generateDisplayName(toolName, config) {
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

    return INFERENCE_RULES.nameTemplates.default
      .replace("{domain}", config.domain)
      .replace("{action}", config.action);
  }
}

// 測試案例：模擬各種新的MCP工具
const testTools = [
  // 現有的工具（有手動覆蓋）
  "get_employee_info",

  // HR 相關的新工具（自動推斷）
  "get_employee_list",
  "create_employee",
  "update_employee_salary",
  "get_department_list",
  "get_attendance_record",

  // 任務管理相關的新工具
  "create_task",
  "get_task_list",
  "update_task_status",
  "delete_task",
  "get_project_info",

  // 財務相關的新工具
  "get_budget_status",
  "create_expense_record",
  "get_finance_report",

  // 分析相關的新工具
  "get_analytics_report",
  "generate_metrics_dashboard",

  // 完全未知的工具
  "some_unknown_tool",
  "process_data_stream",
];

console.log("🚀 智能工具配置系統演示");
console.log("=" * 50);

testTools.forEach((toolName) => {
  const config = ToolDisplayConfigManager.getToolConfig(toolName);

  console.log(`\n🛠️ 工具: ${toolName}`);
  console.log(`   顯示名稱: ${config.displayName}`);
  console.log(`   圖標: ${config.icon}`);
  console.log(`   分類: ${config.category}`);
  console.log(`   顏色: ${config.color}`);
  console.log(`   動作: ${config.action}`);
  console.log(`   領域: ${config.domain}`);

  if (MANUAL_OVERRIDES[toolName]) {
    console.log(`   ✅ 使用手動覆蓋配置`);
  } else {
    console.log(`   🤖 自動推斷配置`);
  }
});

console.log("\n📊 統計結果:");
console.log(`   總工具數: ${testTools.length}`);
console.log(`   手動配置: ${Object.keys(MANUAL_OVERRIDES).length}`);
console.log(
  `   自動推斷: ${testTools.length - Object.keys(MANUAL_OVERRIDES).length}`
);
console.log(
  `   自動化比例: ${(
    ((testTools.length - Object.keys(MANUAL_OVERRIDES).length) /
      testTools.length) *
    100
  ).toFixed(1)}%`
);

console.log("\n✨ 結論:");
console.log("   - 大部分工具都能自動推斷出合適的顯示配置");
console.log("   - 只有重要或特殊的工具需要手動配置");
console.log("   - 新增MCP工具時無需修改前端代碼");
console.log("   - 系統具有良好的擴展性和維護性");

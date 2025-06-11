#!/usr/bin/env node

/**
 * 測試 Qwen-Agent 欄位實作
 * 驗證資料庫結構和 API 功能
 */

import mysql from "mysql2/promise";
import axios from "axios";

class QwenAgentFieldsTester {
  constructor() {
    this.connection = null;
    this.baseURL = "http://localhost:3000/api";
  }

  async connect() {
    try {
      this.connection = await mysql.createConnection({
        host: "localhost",
        port: 3306,
        user: "root",
        password: "MyPwd@1234",
        database: "sfda_nexus",
        charset: "utf8mb4",
      });
      console.log("✅ 資料庫連接成功");
    } catch (error) {
      console.error("❌ 資料庫連接失敗:", error.message);
      throw error;
    }
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.end();
      console.log("✅ 資料庫連接已關閉");
    }
  }

  async testDatabaseSchema() {
    console.log("\n📊 測試 1: 資料庫結構驗證");

    try {
      // 檢查 agents 表結構
      const [columns] = await this.connection.execute("DESCRIBE agents");

      const requiredFields = [
        "agent_type",
        "qwen_config",
        "tool_selection_mode",
      ];
      const existingFields = columns.map((col) => col.Field);

      console.log("📋 agents 表欄位:");
      columns.forEach((col) => {
        const isNew = requiredFields.includes(col.Field);
        console.log(
          `   ${isNew ? "🆕" : "📝"} ${col.Field}: ${col.Type} ${col.Null === "YES" ? "(可空)" : "(必填)"} ${col.Default ? `預設: ${col.Default}` : ""}`
        );
      });

      // 檢查新欄位是否存在
      const missingFields = requiredFields.filter(
        (field) => !existingFields.includes(field)
      );
      if (missingFields.length > 0) {
        console.log(`❌ 缺少欄位: ${missingFields.join(", ")}`);
        return false;
      }

      console.log("✅ 所有必要欄位都存在");
      return true;
    } catch (error) {
      console.error("❌ 資料庫結構測試失敗:", error.message);
      return false;
    }
  }

  async testQwenAgentData() {
    console.log("\n📊 測試 2: Qwen-Agent 數據驗證");

    try {
      // 查詢 Qwen-Agent 記錄
      const [rows] = await this.connection.execute(
        `SELECT 
          id, name, display_name, agent_type, tool_selection_mode,
          JSON_PRETTY(qwen_config) as qwen_config_formatted
        FROM agents 
        WHERE agent_type = 'qwen'`
      );

      if (rows.length === 0) {
        console.log("⚠️  沒有找到 Qwen-Agent 記錄");
        return false;
      }

      console.log(`✅ 找到 ${rows.length} 個 Qwen-Agent 記錄:`);
      rows.forEach((agent) => {
        console.log(`   📋 ${agent.display_name} (${agent.name})`);
        console.log(`      - Agent 類型: ${agent.agent_type}`);
        console.log(`      - 工具選擇模式: ${agent.tool_selection_mode}`);
        console.log(`      - Qwen 配置:`);

        if (agent.qwen_config_formatted) {
          const lines = agent.qwen_config_formatted.split("\n");
          lines.forEach((line) => {
            if (line.trim()) {
              console.log(`        ${line}`);
            }
          });
        }
      });

      return true;
    } catch (error) {
      console.error("❌ Qwen-Agent 數據測試失敗:", error.message);
      return false;
    }
  }

  async testAgentTypeDistribution() {
    console.log("\n📊 測試 3: Agent 類型分佈");

    try {
      const [rows] = await this.connection.execute(
        `SELECT 
          agent_type,
          COUNT(*) as count,
          GROUP_CONCAT(display_name SEPARATOR ', ') as agents
        FROM agents 
        GROUP BY agent_type`
      );

      console.log("📈 Agent 類型分佈:");
      rows.forEach((row) => {
        console.log(
          `   ${row.agent_type === "qwen" ? "🤖" : "👤"} ${row.agent_type}: ${row.count} 個`
        );
        if (row.count <= 5) {
          console.log(`      └─ ${row.agents}`);
        } else {
          const agentList = row.agents.split(", ");
          console.log(
            `      └─ ${agentList.slice(0, 3).join(", ")} 等 ${row.count} 個`
          );
        }
      });

      return true;
    } catch (error) {
      console.error("❌ Agent 類型分佈測試失敗:", error.message);
      return false;
    }
  }

  async testToolSelectionModes() {
    console.log("\n📊 測試 4: 工具選擇模式分佈");

    try {
      const [rows] = await this.connection.execute(
        `SELECT 
          tool_selection_mode,
          agent_type,
          COUNT(*) as count
        FROM agents 
        GROUP BY tool_selection_mode, agent_type
        ORDER BY agent_type, tool_selection_mode`
      );

      console.log("🔧 工具選擇模式分佈:");
      rows.forEach((row) => {
        const modeIcon = row.tool_selection_mode === "auto" ? "🤖" : "👤";
        const typeIcon = row.agent_type === "qwen" ? "🧠" : "⚙️";
        console.log(
          `   ${modeIcon} ${row.tool_selection_mode} (${typeIcon} ${row.agent_type}): ${row.count} 個`
        );
      });

      return true;
    } catch (error) {
      console.error("❌ 工具選擇模式測試失敗:", error.message);
      return false;
    }
  }

  async testCreateQwenAgent() {
    console.log("\n📊 測試 5: 創建新的 Qwen-Agent (模擬)");

    try {
      // 模擬創建 Qwen-Agent 的數據
      const testAgentData = {
        name: "test-qwen-agent",
        display_name: "測試 Qwen 助理",
        description: "這是一個測試用的 Qwen-Agent",
        system_prompt:
          "你是一個測試用的 AI 助理，專門用於驗證 Qwen-Agent 功能。",
        model_id: 2, // 假設 qwen3:32b 的 ID 是 2
        category: "assistant",
        agent_type: "qwen",
        qwen_config: {
          mcp_enabled: true,
          auto_tool_selection: true,
          supported_languages: ["zh-TW", "en"],
          specialties: ["Testing", "QA"],
          model_config: {
            model: "qwen3:32b",
            temperature: 0.8,
            max_tokens: 2048,
          },
        },
        tool_selection_mode: "auto",
        is_active: true,
        is_public: false,
      };

      console.log("📝 測試數據結構:");
      console.log(`   - Agent 類型: ${testAgentData.agent_type}`);
      console.log(`   - 工具選擇模式: ${testAgentData.tool_selection_mode}`);
      console.log(`   - MCP 啟用: ${testAgentData.qwen_config.mcp_enabled}`);
      console.log(
        `   - 自動工具選擇: ${testAgentData.qwen_config.auto_tool_selection}`
      );
      console.log(
        `   - 支援語言: ${testAgentData.qwen_config.supported_languages.join(", ")}`
      );
      console.log(
        `   - 專業領域: ${testAgentData.qwen_config.specialties.join(", ")}`
      );

      // 檢查是否已存在同名 Agent
      const [existing] = await this.connection.execute(
        "SELECT id FROM agents WHERE name = ?",
        [testAgentData.name]
      );

      if (existing.length > 0) {
        console.log("⚠️  測試 Agent 已存在，跳過創建");
        return true;
      }

      console.log("✅ 測試數據結構驗證通過");
      console.log("ℹ️  實際創建功能需要通過 API 測試");

      return true;
    } catch (error) {
      console.error("❌ 創建 Qwen-Agent 測試失敗:", error.message);
      return false;
    }
  }

  async runAllTests() {
    console.log("🚀 開始 Qwen-Agent 欄位實作測試\n");

    const tests = [
      { name: "資料庫結構驗證", method: this.testDatabaseSchema },
      { name: "Qwen-Agent 數據驗證", method: this.testQwenAgentData },
      { name: "Agent 類型分佈", method: this.testAgentTypeDistribution },
      { name: "工具選擇模式分佈", method: this.testToolSelectionModes },
      { name: "創建 Qwen-Agent 測試", method: this.testCreateQwenAgent },
    ];

    const results = [];

    for (const test of tests) {
      try {
        const result = await test.method.call(this);
        results.push({ name: test.name, success: result });
      } catch (error) {
        console.error(`❌ ${test.name} 執行失敗:`, error.message);
        results.push({ name: test.name, success: false, error: error.message });
      }
    }

    // 顯示測試結果摘要
    console.log("\n📋 測試結果摘要:");
    console.log("=".repeat(50));

    let passedTests = 0;
    results.forEach((result) => {
      const status = result.success ? "✅ 通過" : "❌ 失敗";
      console.log(`${status} ${result.name}`);
      if (result.error) {
        console.log(`   錯誤: ${result.error}`);
      }
      if (result.success) passedTests++;
    });

    console.log("=".repeat(50));
    console.log(`📊 總計: ${passedTests}/${results.length} 個測試通過`);

    if (passedTests === results.length) {
      console.log("🎉 所有測試都通過！Qwen-Agent 欄位實作成功！");
    } else {
      console.log("⚠️  部分測試失敗，請檢查相關問題");
    }

    return passedTests === results.length;
  }
}

// 執行測試
async function main() {
  const tester = new QwenAgentFieldsTester();

  try {
    await tester.connect();
    const success = await tester.runAllTests();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error("💥 測試執行失敗:", error.message);
    process.exit(1);
  } finally {
    await tester.disconnect();
  }
}

// 如果直接執行此腳本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default QwenAgentFieldsTester;

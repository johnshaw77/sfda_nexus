#!/usr/bin/env node

/**
 * 測試 API 對 Qwen-Agent 欄位的處理
 */

import axios from "axios";

const API_BASE = "http://localhost:3000/api";

// 模擬管理員 token（實際使用時需要真實的認證）
const ADMIN_TOKEN = "test-admin-token";

class QwenAgentAPITester {
  constructor() {
    this.axios = axios.create({
      baseURL: API_BASE,
      headers: {
        Authorization: `Bearer ${ADMIN_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
  }

  async testUpdateExistingAgent() {
    console.log("\n🧪 測試更新現有 Agent 的 Qwen 欄位");

    try {
      // 首先獲取一個現有的 Agent
      const agentsResponse = await this.axios.get("/agents");

      if (!agentsResponse.data.success || !agentsResponse.data.data.length) {
        console.log("❌ 無法獲取現有 Agent 列表");
        return false;
      }

      const agent = agentsResponse.data.data[0];
      console.log(`📋 選擇 Agent: ${agent.display_name} (ID: ${agent.id})`);

      // 準備更新數據
      const updateData = {
        agent_type: "qwen",
        tool_selection_mode: "auto",
        qwen_config: {
          mcp_enabled: true,
          auto_tool_selection: true,
          supported_languages: ["zh-TW", "en"],
          specialties: ["Testing", "API"],
          model_config: {
            model: "qwen3:32b",
            temperature: 0.8,
            max_tokens: 2048,
          },
        },
      };

      console.log("📤 發送更新請求...");
      const updateResponse = await this.axios.put(
        `/agents/${agent.id}`,
        updateData
      );

      if (updateResponse.data.success) {
        console.log("✅ Agent 更新成功");
        console.log(`   - Agent 類型: ${updateResponse.data.data.agent_type}`);
        console.log(
          `   - 工具選擇模式: ${updateResponse.data.data.tool_selection_mode}`
        );
        console.log(
          `   - Qwen 配置: ${updateResponse.data.data.qwen_config ? "已設置" : "未設置"}`
        );
        return true;
      } else {
        console.log("❌ Agent 更新失敗:", updateResponse.data.message);
        return false;
      }
    } catch (error) {
      console.log("❌ API 測試失敗:");
      if (error.response) {
        console.log(`   狀態碼: ${error.response.status}`);
        console.log(
          `   錯誤訊息: ${error.response.data.message || error.response.statusText}`
        );
        if (error.response.data.details) {
          console.log(
            `   詳細信息: ${JSON.stringify(error.response.data.details, null, 2)}`
          );
        }
      } else {
        console.log(`   錯誤: ${error.message}`);
      }
      return false;
    }
  }

  async testCreateQwenAgent() {
    console.log("\n🧪 測試創建新的 Qwen-Agent");

    try {
      const newAgentData = {
        name: "test-qwen-api-agent",
        display_name: "API 測試 Qwen 助理",
        description: "這是通過 API 創建的測試 Qwen-Agent",
        system_prompt: "你是一個測試用的 AI 助理，專門用於驗證 API 功能。",
        model_id: 2, // 假設存在的模型 ID
        category: "assistant",
        agent_type: "qwen",
        qwen_config: {
          mcp_enabled: true,
          auto_tool_selection: true,
          supported_languages: ["zh-TW", "zh-CN", "en"],
          specialties: ["API", "Testing", "QA"],
          model_config: {
            model: "qwen3:32b",
            temperature: 0.7,
            max_tokens: 4096,
          },
        },
        tool_selection_mode: "auto",
        is_active: true,
        is_public: false,
      };

      console.log("📤 發送創建請求...");
      const createResponse = await this.axios.post("/agents", newAgentData);

      if (createResponse.data.success) {
        console.log("✅ Qwen-Agent 創建成功");
        const createdAgent = createResponse.data.data;
        console.log(`   - ID: ${createdAgent.id}`);
        console.log(`   - 名稱: ${createdAgent.display_name}`);
        console.log(`   - Agent 類型: ${createdAgent.agent_type}`);
        console.log(`   - 工具選擇模式: ${createdAgent.tool_selection_mode}`);
        console.log(
          `   - Qwen 配置: ${createdAgent.qwen_config ? "已設置" : "未設置"}`
        );

        if (createdAgent.qwen_config) {
          console.log(
            `   - 支援語言: ${createdAgent.qwen_config.supported_languages?.join(", ")}`
          );
          console.log(
            `   - 專業領域: ${createdAgent.qwen_config.specialties?.join(", ")}`
          );
        }

        return createdAgent.id;
      } else {
        console.log("❌ Qwen-Agent 創建失敗:", createResponse.data.message);
        return null;
      }
    } catch (error) {
      console.log("❌ 創建 API 測試失敗:");
      if (error.response) {
        console.log(`   狀態碼: ${error.response.status}`);
        console.log(
          `   錯誤訊息: ${error.response.data.message || error.response.statusText}`
        );
        if (error.response.data.details) {
          console.log(
            `   詳細信息: ${JSON.stringify(error.response.data.details, null, 2)}`
          );
        }
      } else {
        console.log(`   錯誤: ${error.message}`);
      }
      return null;
    }
  }

  async testGetAgentWithQwenFields() {
    console.log("\n🧪 測試獲取包含 Qwen 欄位的 Agent");

    try {
      const response = await this.axios.get("/agents");

      if (!response.data.success) {
        console.log("❌ 獲取 Agent 列表失敗");
        return false;
      }

      const agents = response.data.data;
      const qwenAgents = agents.filter((agent) => agent.agent_type === "qwen");

      console.log(
        `📊 總共 ${agents.length} 個 Agent，其中 ${qwenAgents.length} 個 Qwen-Agent`
      );

      if (qwenAgents.length > 0) {
        console.log("✅ 找到 Qwen-Agent:");
        qwenAgents.forEach((agent) => {
          console.log(`   📋 ${agent.display_name}`);
          console.log(`      - Agent 類型: ${agent.agent_type}`);
          console.log(`      - 工具選擇模式: ${agent.tool_selection_mode}`);
          console.log(
            `      - Qwen 配置: ${agent.qwen_config ? "已設置" : "未設置"}`
          );
        });
        return true;
      } else {
        console.log("⚠️  沒有找到 Qwen-Agent");
        return false;
      }
    } catch (error) {
      console.log("❌ 獲取 Agent 測試失敗:");
      if (error.response) {
        console.log(`   狀態碼: ${error.response.status}`);
        console.log(
          `   錯誤訊息: ${error.response.data.message || error.response.statusText}`
        );
      } else {
        console.log(`   錯誤: ${error.message}`);
      }
      return false;
    }
  }

  async runAllTests() {
    console.log("🚀 開始 Qwen-Agent API 測試\n");

    const tests = [
      {
        name: "獲取包含 Qwen 欄位的 Agent",
        method: this.testGetAgentWithQwenFields,
      },
      {
        name: "更新現有 Agent 的 Qwen 欄位",
        method: this.testUpdateExistingAgent,
      },
      { name: "創建新的 Qwen-Agent", method: this.testCreateQwenAgent },
    ];

    const results = [];

    for (const test of tests) {
      try {
        const result = await test.method.call(this);
        results.push({ name: test.name, success: !!result });
      } catch (error) {
        console.error(`❌ ${test.name} 執行失敗:`, error.message);
        results.push({ name: test.name, success: false, error: error.message });
      }
    }

    // 顯示測試結果摘要
    console.log("\n📋 API 測試結果摘要:");
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
      console.log("🎉 所有 API 測試都通過！Qwen-Agent 欄位 API 功能正常！");
    } else {
      console.log("⚠️  部分 API 測試失敗，請檢查相關問題");
    }

    return passedTests === results.length;
  }
}

// 執行測試
async function main() {
  const tester = new QwenAgentAPITester();

  try {
    const success = await tester.runAllTests();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error("💥 API 測試執行失敗:", error.message);
    process.exit(1);
  }
}

// 如果直接執行此腳本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default QwenAgentAPITester;

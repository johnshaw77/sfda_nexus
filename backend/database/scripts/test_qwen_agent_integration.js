/**
 * Qwen-Agent 整合測試腳本
 * 驗證 Qwen-Agent 服務與 SFDA Nexus 的整合是否正常
 */

import axios from "axios";
import logger from "../../src/utils/logger.util.js";

const API_BASE = "http://localhost:3000/api";
const QWEN_AGENT_API = `${API_BASE}/qwen-agent`;

// 測試配置
const TEST_CONFIG = {
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
};

// 模擬用戶認證 token（在實際測試中需要有效的 token）
let authToken = null;

async function runTests() {
  console.log("\n🤖 開始 Qwen-Agent 整合測試...\n");

  try {
    // 測試 1: 檢查 Qwen-Agent 狀態
    await testQwenAgentStatus();

    // 測試 2: 取得 MCP 工具列表
    await testGetMcpTools();

    // 測試 3: 測試基本對話功能
    await testBasicChat();

    // 測試 4: 測試 HR 工具調用
    await testHrToolCall();

    // 測試 5: 測試複合功能
    await testComplexScenario();

    console.log("\n✅ 所有測試完成！");
  } catch (error) {
    console.error("\n❌ 測試過程中發生錯誤:", error.message);
    process.exit(1);
  }
}

/**
 * 測試 Qwen-Agent 狀態
 */
async function testQwenAgentStatus() {
  console.log("📊 測試 1: 檢查 Qwen-Agent 狀態...");

  try {
    const response = await axios.get(`${QWEN_AGENT_API}/status`, {
      ...TEST_CONFIG,
      headers: {
        ...TEST_CONFIG.headers,
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
      },
    });

    console.log("狀態回應:", JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log("✅ Qwen-Agent 狀態檢查通過");

      const status = response.data.status;
      console.log(`   - MCP Server: ${status.mcp_server ? "✅" : "❌"}`);
      console.log(`   - Ollama 服務: ${status.ollama_service ? "✅" : "❌"}`);
      console.log(`   - 已載入工具數量: ${status.tools_loaded}`);
      console.log(`   - Qwen 模型: ${status.qwen_model}`);
    } else {
      throw new Error("Qwen-Agent 狀態檢查失敗");
    }
  } catch (error) {
    if (error.response?.status === 401) {
      console.log("⚠️  需要認證 token，跳過此測試");
      return;
    }
    console.error("❌ 狀態檢查失敗:", error.message);
    throw error;
  }
}

/**
 * 測試取得 MCP 工具列表
 */
async function testGetMcpTools() {
  console.log("\n🔧 測試 2: 取得 MCP 工具列表...");

  try {
    const response = await axios.get(`${QWEN_AGENT_API}/tools`, {
      ...TEST_CONFIG,
      headers: {
        ...TEST_CONFIG.headers,
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
      },
    });

    if (response.data.success) {
      const tools = response.data.data;
      console.log(`✅ 成功取得 ${tools.length} 個 MCP 工具`);

      // 按模組分組顯示工具
      const toolsByModule = tools.reduce((acc, tool) => {
        if (!acc[tool.module]) acc[tool.module] = [];
        acc[tool.module].push(tool.name);
        return acc;
      }, {});

      Object.entries(toolsByModule).forEach(([module, toolNames]) => {
        console.log(
          `   📋 ${module.toUpperCase()} 模組: ${toolNames.join(", ")}`
        );
      });
    } else {
      throw new Error("取得工具列表失敗");
    }
  } catch (error) {
    if (error.response?.status === 401) {
      console.log("⚠️  需要認證 token，跳過此測試");
      return;
    }
    console.error("❌ 取得工具列表失敗:", error.message);
    throw error;
  }
}

/**
 * 測試基本對話功能
 */
async function testBasicChat() {
  console.log("\n💬 測試 3: 測試基本對話功能...");

  try {
    const testMessage = "您好，請介紹一下您可以提供什麼企業服務？";

    const response = await axios.post(
      `${QWEN_AGENT_API}/chat`,
      {
        message: testMessage,
        conversationHistory: [],
      },
      {
        ...TEST_CONFIG,
        headers: {
          ...TEST_CONFIG.headers,
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
      }
    );

    if (response.data.success) {
      const result = response.data.data;
      console.log("✅ 基本對話功能正常");
      console.log(`   用戶: ${testMessage}`);
      console.log(`   助理: ${result.response?.substring(0, 100)}...`);
      console.log(`   是否有工具調用: ${result.hasToolCalls ? "是" : "否"}`);
    } else {
      throw new Error("對話功能測試失敗");
    }
  } catch (error) {
    if (error.response?.status === 401) {
      console.log("⚠️  需要認證 token，跳過此測試");
      return;
    }
    console.error("❌ 對話功能測試失敗:", error.message);
    throw error;
  }
}

/**
 * 測試 HR 工具調用
 */
async function testHrToolCall() {
  console.log("\n🏢 測試 4: 測試 HR 工具調用...");

  try {
    const testMessage = "請查詢所有部門的資料";

    const response = await axios.post(
      `${QWEN_AGENT_API}/chat`,
      {
        message: testMessage,
        conversationHistory: [],
      },
      {
        ...TEST_CONFIG,
        headers: {
          ...TEST_CONFIG.headers,
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
      }
    );

    if (response.data.success) {
      const result = response.data.data;
      console.log("✅ HR 工具調用測試正常");
      console.log(`   用戶: ${testMessage}`);
      console.log(`   是否調用工具: ${result.hasToolCalls ? "是" : "否"}`);

      if (result.hasToolCalls && result.toolResults) {
        console.log(`   調用工具數量: ${result.toolResults.length}`);
        result.toolResults.forEach((toolResult, index) => {
          const toolName = toolResult.toolCall?.function?.name || "未知工具";
          const success = toolResult.result?.success ? "成功" : "失敗";
          console.log(`   工具 ${index + 1}: ${toolName} - ${success}`);
        });
      }

      console.log(`   回應: ${result.response?.substring(0, 150)}...`);
    } else {
      throw new Error("HR 工具調用測試失敗");
    }
  } catch (error) {
    if (error.response?.status === 401) {
      console.log("⚠️  需要認證 token，跳過此測試");
      return;
    }
    console.error("❌ HR 工具調用測試失敗:", error.message);
    throw error;
  }
}

/**
 * 測試複合場景
 */
async function testComplexScenario() {
  console.log("\n🎯 測試 5: 測試複合場景...");

  try {
    const testMessage = "請查詢財務部的員工資料，並為他們安排下週的部門會議";

    const response = await axios.post(
      `${QWEN_AGENT_API}/chat`,
      {
        message: testMessage,
        conversationHistory: [],
      },
      {
        ...TEST_CONFIG,
        headers: {
          ...TEST_CONFIG.headers,
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
      }
    );

    if (response.data.success) {
      const result = response.data.data;
      console.log("✅ 複合場景測試正常");
      console.log(`   用戶: ${testMessage}`);
      console.log(`   是否調用工具: ${result.hasToolCalls ? "是" : "否"}`);

      if (result.hasToolCalls && result.toolResults) {
        console.log(`   調用工具數量: ${result.toolResults.length}`);
        result.toolResults.forEach((toolResult, index) => {
          const toolName = toolResult.toolCall?.function?.name || "未知工具";
          const success = toolResult.result?.success ? "成功" : "失敗";
          console.log(`   工具 ${index + 1}: ${toolName} - ${success}`);
        });
      }

      console.log(`   回應: ${result.response?.substring(0, 200)}...`);
    } else {
      throw new Error("複合場景測試失敗");
    }
  } catch (error) {
    if (error.response?.status === 401) {
      console.log("⚠️  需要認證 token，跳過此測試");
      return;
    }
    console.error("❌ 複合場景測試失敗:", error.message);
    throw error;
  }
}

/**
 * 測試各種測試案例
 */
async function testAllTestCases() {
  console.log("\n🧪 執行完整測試案例...");

  const testCases = ["basic", "hr", "tasks", "finance"];

  for (const testCase of testCases) {
    try {
      console.log(`\n📋 執行測試案例: ${testCase}`);

      const response = await axios.get(
        `${QWEN_AGENT_API}/test?testCase=${testCase}`,
        {
          ...TEST_CONFIG,
          headers: {
            ...TEST_CONFIG.headers,
            ...(authToken && { Authorization: `Bearer ${authToken}` }),
          },
        }
      );

      if (response.data.success) {
        const result = response.data.data;
        console.log(`✅ 測試案例 ${testCase} 完成`);
        console.log(`   測試訊息: ${result.testMessage}`);
        console.log(
          `   是否調用工具: ${result.result.hasToolCalls ? "是" : "否"}`
        );
      }
    } catch (error) {
      if (error.response?.status === 401) {
        console.log("⚠️  需要認證 token，跳過此測試");
        continue;
      }
      console.error(`❌ 測試案例 ${testCase} 失敗:`, error.message);
    }
  }
}

// 如果直接執行此腳本
if (process.argv[1].endsWith("test_qwen_agent_integration.js")) {
  runTests()
    .then(() => {
      console.log("\n🎉 測試完成！");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 測試失敗:", error);
      process.exit(1);
    });
}

export { runTests };

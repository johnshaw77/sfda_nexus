/**
 * Qwen-Agent 完整整合測試腳本
 * 測試資料庫、API、MCP 連接等所有組件
 */

import mysql from "mysql2/promise";
import axios from "axios";
import dotenv from "dotenv";

// 載入環境變數
dotenv.config();

const config = {
  host: "localhost",
  user: "root",
  password: "MyPwd@1234",
  database: "sfda_nexus",
  charset: "utf8mb4",
};

const API_BASE_URL = "http://localhost:3000";

// 測試用戶憑證
const TEST_USER = {
  identifier: "admin",
  password: "admin123",
};

class QwenAgentTester {
  constructor() {
    this.connection = null;
    this.authToken = null;
  }

  async init() {
    console.log("🚀 開始 Qwen-Agent 整合測試...\n");

    // 連接資料庫
    try {
      this.connection = await mysql.createConnection(config);
      console.log("✅ 資料庫連接成功");
    } catch (error) {
      console.error("❌ 資料庫連接失敗:", error.message);
      throw error;
    }

    // 獲取認證 token
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/login`,
        TEST_USER
      );
      this.authToken = response.data.data.token;
      console.log("✅ 用戶認證成功");
    } catch (error) {
      console.error("❌ 用戶認證失敗:", error.message);
      throw error;
    }
  }

  async testDatabase() {
    console.log("\n📊 測試 1: 資料庫整合");

    try {
      // 檢查 Qwen-Agent 是否存在
      const [rows] = await this.connection.execute(
        "SELECT id, name, display_name, model_id, category, is_active FROM agents WHERE name = ?",
        ["qwen-enterprise-agent"]
      );

      if (rows.length === 0) {
        console.log("❌ Qwen-Agent 不存在於資料庫中");
        return false;
      }

      const agent = rows[0];
      console.log("✅ Qwen-Agent 存在於資料庫");
      console.log(`   - ID: ${agent.id}`);
      console.log(`   - 顯示名稱: ${agent.display_name}`);
      console.log(`   - 模型ID: ${agent.model_id}`);
      console.log(`   - 類別: ${agent.category}`);
      console.log(`   - 狀態: ${agent.is_active ? "啟用" : "停用"}`);

      // 檢查模型是否存在
      const [modelRows] = await this.connection.execute(
        "SELECT name, display_name, model_type FROM ai_models WHERE id = ?",
        [agent.model_id]
      );

      if (modelRows.length > 0) {
        const model = modelRows[0];
        console.log(
          `✅ 關聯模型存在: ${model.display_name} (${model.model_type})`
        );
      } else {
        console.log("⚠️  關聯模型不存在");
      }

      return true;
    } catch (error) {
      console.error("❌ 資料庫測試失敗:", error.message);
      return false;
    }
  }

  async testAPI() {
    console.log("\n🔌 測試 2: API 端點");

    const headers = {
      Authorization: `Bearer ${this.authToken}`,
      "Content-Type": "application/json",
    };

    try {
      // 測試狀態端點
      console.log("測試 GET /api/qwen-agent/status...");
      const statusResponse = await axios.get(
        `${API_BASE_URL}/api/qwen-agent/status`,
        { headers }
      );
      console.log("✅ 狀態端點正常");
      console.log("   狀態:", statusResponse.data.data?.status || "未知");

      // 測試工具端點
      console.log("測試 GET /api/qwen-agent/tools...");
      const toolsResponse = await axios.get(
        `${API_BASE_URL}/api/qwen-agent/tools`,
        { headers }
      );
      console.log("✅ 工具端點正常");
      console.log(
        `   可用工具數量: ${toolsResponse.data.data?.tools?.length || 0}`
      );

      // 測試初始化端點
      console.log("測試 POST /api/qwen-agent/initialize...");
      const initResponse = await axios.post(
        `${API_BASE_URL}/api/qwen-agent/initialize`,
        {},
        { headers }
      );
      console.log("✅ 初始化端點正常");

      return true;
    } catch (error) {
      console.error(
        "❌ API 測試失敗:",
        error.response?.data?.message || error.message
      );
      return false;
    }
  }

  async testAgentsList() {
    console.log("\n👥 測試 3: 智能體列表 API");

    const headers = {
      Authorization: `Bearer ${this.authToken}`,
      "Content-Type": "application/json",
    };

    try {
      const response = await axios.get(`${API_BASE_URL}/api/chat/agents`, {
        headers,
      });
      const agents = response.data.data;

      console.log("✅ 智能體列表 API 正常");
      console.log(`   總智能體數量: ${agents.length}`);

      // 查找 Qwen-Agent
      const qwenAgent = agents.find(
        (agent) => agent.name === "qwen-enterprise-agent"
      );
      if (qwenAgent) {
        console.log("✅ Qwen-Agent 出現在智能體列表中");
        console.log(`   - 顯示名稱: ${qwenAgent.display_name}`);
        console.log(`   - 描述: ${qwenAgent.description?.substring(0, 50)}...`);
      } else {
        console.log("❌ Qwen-Agent 未出現在智能體列表中");
        return false;
      }

      return true;
    } catch (error) {
      console.error(
        "❌ 智能體列表測試失敗:",
        error.response?.data?.message || error.message
      );
      return false;
    }
  }

  async testMCPConnection() {
    console.log("\n🔗 測試 4: MCP Server 連接");

    try {
      // 測試 MCP Server 是否運行
      const mcpResponse = await axios.get("http://localhost:8080/health");
      console.log("✅ MCP Server 運行正常");
      console.log("   版本:", mcpResponse.data.version || "未知");

      // 測試工具列表
      const toolsResponse = await axios.get("http://localhost:8080/tools");
      const tools = toolsResponse.data.tools || [];
      console.log(`✅ MCP 工具可用: ${tools.length} 個`);

      // 列出工具類別
      const categories = {};
      tools.forEach((tool) => {
        const category = tool.name.split(".")[0];
        categories[category] = (categories[category] || 0) + 1;
      });

      Object.entries(categories).forEach(([category, count]) => {
        console.log(`   - ${category}: ${count} 個工具`);
      });

      return true;
    } catch (error) {
      console.error("❌ MCP Server 連接失敗:", error.message);
      console.log("   請確保 MCP Server 在 localhost:8080 運行");
      return false;
    }
  }

  async testOllamaConnection() {
    console.log("\n🤖 測試 5: Ollama 連接");

    try {
      // 測試 Ollama 服務
      const ollamaResponse = await axios.get("http://localhost:11434/api/tags");
      const models = ollamaResponse.data.models || [];
      console.log("✅ Ollama 服務運行正常");
      console.log(`   可用模型數量: ${models.length}`);

      // 檢查 qwen3:32b 模型
      const qwenModel = models.find((model) => model.name.includes("qwen3"));
      if (qwenModel) {
        console.log(`✅ Qwen 模型可用: ${qwenModel.name}`);
        console.log(
          `   大小: ${(qwenModel.size / 1024 / 1024 / 1024).toFixed(1)} GB`
        );
      } else {
        console.log("⚠️  Qwen 模型未找到，請確保已下載 qwen3:32b");
      }

      return true;
    } catch (error) {
      console.error("❌ Ollama 連接失敗:", error.message);
      console.log("   請確保 Ollama 在 localhost:11434 運行");
      return false;
    }
  }

  async testBasicChat() {
    console.log("\n💬 測試 6: 基礎對話功能");

    const headers = {
      Authorization: `Bearer ${this.authToken}`,
      "Content-Type": "application/json",
    };

    try {
      // 獲取 Qwen-Agent ID
      const agentsResponse = await axios.get(
        `${API_BASE_URL}/api/chat/agents`,
        { headers }
      );
      const qwenAgent = agentsResponse.data.data.find(
        (agent) => agent.name === "qwen-enterprise-agent"
      );

      if (!qwenAgent) {
        console.log("❌ 無法找到 Qwen-Agent");
        return false;
      }

      // 測試基礎對話
      const chatData = {
        message: "你好，請介紹一下你的功能",
        agentId: qwenAgent.id,
        tools: [],
      };

      console.log("發送測試消息...");
      const chatResponse = await axios.post(
        `${API_BASE_URL}/api/qwen-agent/chat`,
        chatData,
        { headers }
      );

      if (chatResponse.data.success) {
        console.log("✅ 基礎對話功能正常");
        console.log(
          "   回應長度:",
          chatResponse.data.data.response?.length || 0
        );
      } else {
        console.log("❌ 對話功能異常:", chatResponse.data.message);
        return false;
      }

      return true;
    } catch (error) {
      console.error(
        "❌ 對話測試失敗:",
        error.response?.data?.message || error.message
      );
      return false;
    }
  }

  async runAllTests() {
    const results = [];

    try {
      await this.init();

      results.push(await this.testDatabase());
      results.push(await this.testAPI());
      results.push(await this.testAgentsList());
      results.push(await this.testMCPConnection());
      results.push(await this.testOllamaConnection());
      results.push(await this.testBasicChat());
    } catch (error) {
      console.error("❌ 測試初始化失敗:", error.message);
      return;
    } finally {
      if (this.connection) {
        await this.connection.end();
      }
    }

    // 測試結果總結
    console.log("\n📋 測試結果總結");
    console.log("=".repeat(50));

    const testNames = [
      "資料庫整合",
      "API 端點",
      "智能體列表",
      "MCP Server 連接",
      "Ollama 連接",
      "基礎對話功能",
    ];

    let passedTests = 0;
    results.forEach((result, index) => {
      const status = result ? "✅ 通過" : "❌ 失敗";
      console.log(`${index + 1}. ${testNames[index]}: ${status}`);
      if (result) passedTests++;
    });

    console.log("=".repeat(50));
    console.log(`總體結果: ${passedTests}/${results.length} 項測試通過`);

    if (passedTests === results.length) {
      console.log("🎉 所有測試通過！Qwen-Agent 整合成功！");
    } else {
      console.log("⚠️  部分測試失敗，請檢查相關服務");
    }
  }
}

// 執行測試
const tester = new QwenAgentTester();
tester.runAllTests().catch(console.error);

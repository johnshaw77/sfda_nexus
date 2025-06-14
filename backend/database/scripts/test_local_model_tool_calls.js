/**
 * 本地模型工具調用診斷腳本
 * 用於測試和診斷本地模型（qwen2.5-vl:32B、qwen3:32b）的工具調用問題
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

// 設置環境變數
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../../.env") });

import AIService from "../../src/services/ai.service.js";
import McpToolParser from "../../src/services/mcpToolParser.service.js";
import ChatService from "../../src/services/chat.service.js";
import { query } from "../../src/config/database.config.js";

const BACKEND_URL = "http://localhost:3000";

// 測試用戶憑據
const TEST_USER = {
  identifier: "admin@sfda-nexus.com",
  password: "admin123",
};

class LocalModelDiagnostic {
  constructor() {
    this.mcpToolParser = new McpToolParser();
    this.chatService = new ChatService();
  }

  /**
   * 測試本地模型的基本回應
   */
  async testBasicResponse() {
    console.log("\n=== 測試本地模型基本回應 ===");

    const testModels = [
      {
        name: "qwen2.5-vl:32B",
        model_id: "qwen2.5-vl:32b",
        endpoint_url: "http://localhost:11434/api/chat",
      },
      {
        name: "qwen3:32b",
        model_id: "qwen3:32b",
        endpoint_url: "http://localhost:11434/api/chat",
      },
    ];

    for (const model of testModels) {
      console.log(`\n--- 測試模型: ${model.name} ---`);

      try {
        const response = await AIService.callModel({
          provider: "ollama",
          model: model.model_id,
          endpoint_url: model.endpoint_url,
          messages: [
            {
              role: "user",
              content: "你好，請簡單介紹一下你自己。",
            },
          ],
          temperature: 0.7,
          max_tokens: 500,
        });

        console.log("✅ 模型回應成功");
        console.log("回應長度:", response.content.length);
        console.log("回應預覽:", response.content.substring(0, 200) + "...");
        console.log("處理時間:", response.processing_time);
      } catch (error) {
        console.log("❌ 模型回應失敗:", error.message);
      }
    }
  }

  /**
   * 測試本地模型的工具調用能力
   */
  async testToolCallCapability() {
    console.log("\n=== 測試本地模型工具調用能力 ===");

    // 獲取系統提示詞（包含工具信息）
    const systemPrompt = await this.chatService.generateSystemPrompt("", {
      user_id: 1,
      conversation_id: 1,
      model_type: "ollama",
    });

    console.log("系統提示詞長度:", systemPrompt.length);
    console.log("包含工具信息:", systemPrompt.includes("可用工具系統"));
    console.log("包含員工工具:", systemPrompt.includes("get_employee_info"));

    const testCases = [
      {
        query: "請查詢工號 A123456 的員工信息",
        expectedTool: "get_employee_info",
      },
      {
        query: "幫我查一下白勝宇的工號",
        expectedTool: "search_employees",
      },
      {
        query: "請使用工具查詢員工 A123456 的詳細資料",
        expectedTool: "get_employee_info",
      },
    ];

    const testModels = [
      {
        name: "qwen2.5-vl:32B",
        model_id: "qwen2.5-vl:32b",
        endpoint_url: "http://localhost:11434/api/chat",
      },
      {
        name: "qwen3:32b",
        model_id: "qwen3:32b",
        endpoint_url: "http://localhost:11434/api/chat",
      },
    ];

    for (const model of testModels) {
      console.log(`\n--- 測試模型: ${model.name} ---`);

      for (const testCase of testCases) {
        console.log(`\n測試查詢: "${testCase.query}"`);

        try {
          // 調用模型
          const response = await AIService.callModel({
            provider: "ollama",
            model: model.model_id,
            endpoint_url: model.endpoint_url,
            messages: [
              {
                role: "system",
                content: systemPrompt,
              },
              {
                role: "user",
                content: testCase.query,
              },
            ],
            temperature: 0.3,
            max_tokens: 1000,
          });

          console.log("模型原始回應:");
          console.log("=".repeat(50));
          console.log(response.content);
          console.log("=".repeat(50));

          // 檢查是否包含工具調用
          const hasToolCalls = this.mcpToolParser.hasToolCalls(
            response.content
          );
          console.log("包含工具調用:", hasToolCalls);

          if (hasToolCalls) {
            // 解析工具調用
            const toolCalls = await this.mcpToolParser.parseToolCalls(
              response.content,
              { user_id: 1 }
            );

            console.log("解析到的工具調用數量:", toolCalls.length);

            if (toolCalls.length > 0) {
              console.log("工具調用詳情:");
              toolCalls.forEach((call, index) => {
                console.log(`  ${index + 1}. 工具名稱: ${call.name}`);
                console.log(`     格式: ${call.format}`);
                console.log(
                  `     參數:`,
                  JSON.stringify(call.parameters, null, 2)
                );
              });

              // 檢查是否包含預期的工具
              const hasExpectedTool = toolCalls.some(
                (call) => call.name === testCase.expectedTool
              );
              console.log(
                `包含預期工具 (${testCase.expectedTool}):`,
                hasExpectedTool
              );
            }
          } else {
            console.log("❌ 未檢測到工具調用");

            // 分析可能的原因
            console.log("\n可能的問題分析:");
            if (!response.content.includes("tool")) {
              console.log("- 回應中完全沒有 'tool' 關鍵字");
            }
            if (!response.content.includes("{")) {
              console.log("- 回應中沒有 JSON 格式");
            }
            if (!response.content.includes("get_employee_info")) {
              console.log("- 回應中沒有提到具體的工具名稱");
            }
          }
        } catch (error) {
          console.log("❌ 測試失敗:", error.message);
        }

        console.log("\n" + "-".repeat(80));
      }
    }
  }

  /**
   * 測試工具調用解析器的各種格式
   */
  async testParserFormats() {
    console.log("\n=== 測試工具調用解析器格式支援 ===");

    const testFormats = [
      {
        name: "JSON 格式（標準）",
        content: `我需要查詢員工信息。

\`\`\`json
{
  "tool": "get_employee_info",
  "parameters": {
    "employeeId": "A123456"
  }
}
\`\`\`

讓我為您查詢這個員工的詳細信息。`,
      },
      {
        name: "直接 JSON 格式",
        content: `我需要查詢員工信息：{"tool": "get_employee_info", "parameters": {"employeeId": "A123456"}}`,
      },
      {
        name: "函數調用格式",
        content: `我需要查詢員工信息，讓我調用工具：get_employee_info(employeeId="A123456")`,
      },
      {
        name: "XML 格式",
        content: `我需要查詢員工信息。

<tool_call>
<name>get_employee_info</name>
<parameters>{"employeeId": "A123456"}</parameters>
</tool_call>`,
      },
      {
        name: "簡單標籤格式",
        content: `我需要查詢員工信息。

<tool_call>
get_employee_info
{"employeeId": "A123456"}
</tool_call>`,
      },
      {
        name: "標籤屬性格式",
        content: `我需要查詢員工信息：<tool_call name="get_employee_info" params='{"employeeId": "A123456"}' />`,
      },
    ];

    for (const format of testFormats) {
      console.log(`\n--- 測試格式: ${format.name} ---`);
      console.log("測試內容:");
      console.log(format.content);
      console.log("\n解析結果:");

      try {
        const toolCalls = await this.mcpToolParser.parseToolCalls(
          format.content,
          {
            user_id: 1,
          }
        );

        if (toolCalls.length > 0) {
          console.log("✅ 解析成功");
          toolCalls.forEach((call, index) => {
            console.log(`  ${index + 1}. 工具: ${call.name}`);
            console.log(`     格式: ${call.format}`);
            console.log(`     參數:`, JSON.stringify(call.parameters, null, 2));
          });
        } else {
          console.log("❌ 解析失敗 - 未找到工具調用");
        }
      } catch (error) {
        console.log("❌ 解析錯誤:", error.message);
      }

      console.log("-".repeat(60));
    }
  }

  /**
   * 測試完整的工具調用流程
   */
  async testFullToolCallFlow() {
    console.log("\n=== 測試完整工具調用流程 ===");

    const testQuery = "請查詢工號 A123456 的員工信息";

    // 模擬一個包含工具調用的 AI 回應
    const mockAIResponse = `我來幫您查詢工號 A123456 的員工信息。

\`\`\`json
{
  "tool": "get_employee_info",
  "parameters": {
    "employeeId": "A123456"
  }
}
\`\`\`

正在查詢中...`;

    console.log("模擬 AI 回應:");
    console.log(mockAIResponse);

    try {
      // 使用聊天服務處理回應
      const result = await this.chatService.processChatMessage(mockAIResponse, {
        user_id: 1,
        conversation_id: 1,
        model_id: 1,
      });

      console.log("\n處理結果:");
      console.log("包含工具調用:", result.has_tool_calls);
      console.log("工具調用數量:", result.tool_calls?.length || 0);
      console.log("工具結果數量:", result.tool_results?.length || 0);
      console.log("使用二次 AI:", result.used_secondary_ai);

      if (result.tool_calls && result.tool_calls.length > 0) {
        console.log("\n工具調用詳情:");
        result.tool_calls.forEach((call, index) => {
          console.log(`  ${index + 1}. ${call.name} (${call.format})`);
          console.log(`     參數:`, JSON.stringify(call.parameters, null, 2));
        });
      }

      if (result.tool_results && result.tool_results.length > 0) {
        console.log("\n工具執行結果:");
        result.tool_results.forEach((result, index) => {
          console.log(`  ${index + 1}. ${result.tool_name}`);
          console.log(`     成功: ${result.success}`);
          console.log(`     執行時間: ${result.execution_time}ms`);
          if (result.success) {
            console.log(`     數據:`, JSON.stringify(result.data, null, 2));
          } else {
            console.log(`     錯誤: ${result.error}`);
          }
        });
      }

      console.log("\n最終回應:");
      console.log(result.final_response);
    } catch (error) {
      console.log("❌ 流程測試失敗:", error.message);
    }
  }

  /**
   * 檢查數據庫中的服務配置
   */
  async checkServiceConfiguration() {
    console.log("\n=== 檢查服務配置 ===");

    try {
      // 檢查 MCP 服務
      const { rows: services } = await query(
        "SELECT * FROM mcp_services WHERE is_enabled = TRUE ORDER BY id"
      );

      console.log(`找到 ${services.length} 個啟用的 MCP 服務:`);
      services.forEach((service) => {
        console.log(`  ID: ${service.id}`);
        console.log(`  名稱: ${service.name}`);
        console.log(`  端點: ${service.endpoint_url}`);
        console.log(`  描述: ${service.description}`);
        console.log("");
      });

      // 檢查工具配置
      const { rows: tools } = await query(
        "SELECT * FROM mcp_tools WHERE is_enabled = TRUE ORDER BY service_id, name"
      );

      console.log(`找到 ${tools.length} 個啟用的工具:`);
      tools.forEach((tool) => {
        console.log(`  服務 ID: ${tool.service_id}`);
        console.log(`  工具名稱: ${tool.name}`);
        console.log(`  端點: ${tool.endpoint_url}`);
        console.log(`  描述: ${tool.description}`);
        console.log("");
      });

      // 檢查重複配置
      const duplicateServices = services.filter(
        (service, index, arr) =>
          arr.findIndex((s) => s.endpoint_url === service.endpoint_url) !==
          index
      );

      if (duplicateServices.length > 0) {
        console.log("⚠️ 發現重複的服務配置:");
        duplicateServices.forEach((service) => {
          console.log(`  ID: ${service.id}, 端點: ${service.endpoint_url}`);
        });
      }

      const duplicateTools = tools.filter(
        (tool, index, arr) =>
          arr.findIndex(
            (t) => t.name === tool.name && t.service_id !== tool.service_id
          ) !== index
      );

      if (duplicateTools.length > 0) {
        console.log("⚠️ 發現重複的工具配置:");
        duplicateTools.forEach((tool) => {
          console.log(`  工具: ${tool.name}, 服務 ID: ${tool.service_id}`);
        });
      }
    } catch (error) {
      console.log("❌ 檢查配置失敗:", error.message);
    }
  }

  /**
   * 運行所有診斷測試
   */
  async runAllTests() {
    console.log("🔍 開始本地模型工具調用診斷");
    console.log("=".repeat(80));

    try {
      await this.checkServiceConfiguration();
      await this.testBasicResponse();
      await this.testParserFormats();
      await this.testFullToolCallFlow();
      await this.testToolCallCapability();

      console.log("\n✅ 診斷完成");
    } catch (error) {
      console.log("\n❌ 診斷過程中發生錯誤:", error.message);
      console.error(error);
    }
  }
}

async function testLocalModelToolCalls() {
  console.log("🧪 測試本地模型工具調用...\n");

  try {
    // 1. 登錄
    console.log("1️⃣ 登錄...");
    const loginResponse = await axios.post(
      `${BACKEND_URL}/api/auth/login`,
      TEST_USER
    );

    const authToken = loginResponse.data.data.access_token;
    console.log("   ✅ 登錄成功");

    // 2. 獲取可用模型列表
    console.log("\n2️⃣ 獲取可用模型...");
    const modelsResponse = await axios.get(`${BACKEND_URL}/api/chat/models`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const models = modelsResponse.data.data;
    console.log("   📋 可用模型:");
    models.forEach((model) => {
      console.log(
        `     - ${model.display_name} (${model.model_type}): ${model.model_id}`
      );
    });

    // 3. 找到本地模型（Ollama）
    const localModel = models.find(
      (model) => model.model_type === "ollama" && model.is_active
    );

    if (!localModel) {
      console.log("   ❌ 未找到可用的本地模型");
      return;
    }

    console.log(
      `   ✅ 使用本地模型: ${localModel.display_name} (ID: ${localModel.id})`
    );

    // 4. 創建對話
    console.log("\n3️⃣ 創建對話...");
    const createConvResponse = await axios.post(
      `${BACKEND_URL}/api/chat/conversations`,
      {
        title: "本地模型工具調用測試",
        agent_id: 1, // 數位秘書
        model_id: localModel.id,
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    const conversationId = createConvResponse.data.data.id;
    console.log(`   ✅ 對話創建成功，ID: ${conversationId}`);

    // 5. 測試工具調用
    const testCases = [
      "請查詢工號 A123456 的員工信息",
      "查詢員工 A123456",
      "我想知道 A123456 這個員工的資料",
    ];

    for (let i = 0; i < testCases.length; i++) {
      const testMessage = testCases[i];
      console.log(`\n4️⃣.${i + 1} 測試工具調用: "${testMessage}"`);

      try {
        const sendMessageResponse = await axios.post(
          `${BACKEND_URL}/api/chat/conversations/${conversationId}/messages`,
          {
            content: testMessage,
            content_type: "text",
            temperature: 0.7,
            max_tokens: 2000,
            model_id: localModel.id,
          },
          {
            headers: { Authorization: `Bearer ${authToken}` },
            timeout: 60000, // 60秒超時
          }
        );

        if (sendMessageResponse.data.success) {
          const { assistant_message } = sendMessageResponse.data.data;

          console.log(`   ✅ 消息發送成功`);
          console.log(
            `   🤖 AI 回應長度: ${assistant_message.content.length} 字符`
          );

          // 檢查是否包含工具調用結果
          const hasEmployeeInfo =
            assistant_message.content.includes("白勝宇") ||
            assistant_message.content.includes("A123456") ||
            assistant_message.content.includes("資訊技術部") ||
            assistant_message.content.includes("軟體工程師");

          if (hasEmployeeInfo) {
            console.log("   🎯 ✅ 檢測到工具調用結果！");
            console.log("   📄 回應內容預覽:");
            console.log(
              "   " + assistant_message.content.substring(0, 300) + "..."
            );
          } else {
            console.log("   ⚠️ 未檢測到明顯的工具調用結果");
            console.log("   📄 完整回應:");
            console.log("   " + assistant_message.content);
          }

          // 檢查 metadata 中的工具調用信息
          if (assistant_message.metadata) {
            const metadata =
              typeof assistant_message.metadata === "string"
                ? JSON.parse(assistant_message.metadata)
                : assistant_message.metadata;

            if (metadata.has_tool_calls) {
              console.log("   🔧 工具調用信息:");
              console.log(
                `     - 工具調用次數: ${metadata.tool_calls?.length || 0}`
              );
              console.log(
                `     - 工具結果次數: ${metadata.tool_results?.length || 0}`
              );
            }
          }
        } else {
          console.log("   ❌ 消息發送失敗:", sendMessageResponse.data.message);
        }
      } catch (error) {
        console.log("   ❌ 消息發送失敗:", error.message);
        if (error.response?.data) {
          console.log("   📄 錯誤詳情:", error.response.data.message);
        }
      }

      // 測試間隔
      if (i < testCases.length - 1) {
        console.log("   ⏳ 等待 2 秒...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  } catch (error) {
    console.error("❌ 測試過程中發生錯誤:", error.message);
  }

  console.log("\n🎯 本地模型工具調用測試完成");
}

// 執行診斷
const diagnostic = new LocalModelDiagnostic();
diagnostic
  .runAllTests()
  .then(() => {
    console.log("\n🏁 診斷結束");
    process.exit(0);
  })
  .catch((error) => {
    console.error("診斷失敗:", error);
    process.exit(1);
  });

// 運行測試
testLocalModelToolCalls().catch(console.error);

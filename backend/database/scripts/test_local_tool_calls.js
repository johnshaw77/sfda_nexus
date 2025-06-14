/**
 * 測試本地模型工具調用
 * 使用 Ollama 本地模型測試 MCP 工具調用功能
 */

import axios from "axios";

const BACKEND_URL = "http://localhost:3000";

// 測試用戶憑據
const TEST_USER = {
  identifier: "admin@sfda-nexus.com",
  password: "admin123",
};

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

    const modelsData = modelsResponse.data.data || modelsResponse.data;

    // 處理按提供商分組的模型數據
    let models = [];
    if (modelsData.ollama) {
      models = [
        ...models,
        ...modelsData.ollama.map((m) => ({ ...m, model_type: "ollama" })),
      ];
    }
    if (modelsData.gemini) {
      models = [
        ...models,
        ...modelsData.gemini.map((m) => ({ ...m, model_type: "gemini" })),
      ];
    }
    if (modelsData.openai) {
      models = [
        ...models,
        ...modelsData.openai.map((m) => ({ ...m, model_type: "openai" })),
      ];
    }
    if (modelsData.claude) {
      models = [
        ...models,
        ...modelsData.claude.map((m) => ({ ...m, model_type: "claude" })),
      ];
    }

    console.log("   📋 可用模型:");
    models.forEach((model) => {
      console.log(
        `     - ${model.display_name} (${model.model_type}): ${model.model_id} ${model.is_active ? "✅" : "❌"}`
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

// 運行測試
testLocalModelToolCalls().catch(console.error);

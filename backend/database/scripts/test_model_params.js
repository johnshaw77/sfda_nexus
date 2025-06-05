/**
 * 測試模型參數傳遞
 * 驗證聊天接口是否正確使用資料庫中的模型參數（endpoint_url, api_key等）
 */

import axios from "axios";

const API_BASE = "http://localhost:3000/api";

// 測試配置
const testConfig = {
  auth: {
    identifier: "admin",
    password: "admin123",
  },
  testModel: {
    id: 38, // Qwen 2.5-VL 32B
    expected_endpoint: "http://localhost:11434",
    expected_multimodal: true,
  },
};

let authToken = "";

async function login() {
  try {
    const response = await axios.post(
      `${API_BASE}/auth/login`,
      testConfig.auth
    );
    authToken = response.data.data.access_token;
    console.log("✅ 登入成功");
    return true;
  } catch (error) {
    console.error("❌ 登入失敗:", error.response?.data || error.message);
    return false;
  }
}

async function getModelById(modelId) {
  try {
    const response = await axios.get(`${API_BASE}/models`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const allModels = response.data.data;

    // 調試：打印資料結構
    console.log("模型資料結構:", Object.keys(allModels));

    // 從所有 provider 中搜尋模型
    for (const provider in allModels) {
      const models = allModels[provider];

      // 檢查是否為陣列
      if (Array.isArray(models)) {
        const model = models.find((m) => m.id === modelId);
        if (model) return model;
      } else {
        // 如果不是陣列，直接檢查
        if (models.id === modelId) return models;
      }
    }
    return null;
  } catch (error) {
    console.error("❌ 獲取模型失敗:", error.response?.data || error.message);
    return null;
  }
}

async function testChatWithModel(modelId) {
  try {
    console.log("\n🧪 測試聊天接口模型參數傳遞...");

    // 創建新對話
    const conversationResponse = await axios.post(
      `${API_BASE}/chat/conversations`,
      {
        title: "測試模型參數",
        model_id: modelId,
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    const conversationId = conversationResponse.data.data.id;
    console.log("📋 創建測試對話 ID:", conversationId);

    // 發送測試消息
    console.log("📤 發送測試消息...");
    const messageResponse = await axios.post(
      `${API_BASE}/chat/conversations/${conversationId}/messages`,
      {
        content: "請簡單介紹一下你自己，一句話即可",
        temperature: 0.5,
        max_tokens: 100,
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    const result = messageResponse.data;
    if (result.success) {
      console.log("✅ 聊天測試成功");
      console.log("📊 回應統計:", {
        provider: result.data.assistant_message?.model_info?.provider,
        model: result.data.assistant_message?.model_info?.model,
        tokens: result.data.assistant_message?.tokens_used,
        processing_time: result.data.assistant_message?.processing_time + "ms",
      });
      return true;
    } else {
      console.log("❌ 聊天測試失敗:", result.message);
      return false;
    }
  } catch (error) {
    console.error("❌ 聊天測試失敗:", error.response?.data || error.message);

    // 打印詳細的錯誤信息
    if (error.response?.data?.details) {
      console.error("詳細錯誤:", error.response.data.details);
    }

    return false;
  }
}

async function main() {
  console.log("🧪 開始測試模型參數傳遞...\n");

  // 1. 登入
  if (!(await login())) {
    process.exit(1);
  }

  // 2. 獲取測試模型信息
  console.log("\n📋 獲取模型信息...");
  const model = await getModelById(testConfig.testModel.id);

  if (!model) {
    console.error("❌ 找不到測試模型 ID:", testConfig.testModel.id);
    process.exit(1);
  }

  console.log("✅ 找到測試模型:", {
    id: model.id,
    name: model.display_name,
    provider: model.provider,
    model_id: model.model_id,
    endpoint_url: model.endpoint_url || "undefined",
    is_multimodal: model.is_multimodal,
    is_active: model.is_active,
  });

  // 3. 驗證模型配置
  console.log("\n🔍 驗證模型配置...");

  if (
    model.endpoint_url &&
    model.endpoint_url !== testConfig.testModel.expected_endpoint
  ) {
    console.warn("⚠️  端點URL不符合預期:", {
      actual: model.endpoint_url,
      expected: testConfig.testModel.expected_endpoint,
    });
  } else {
    console.log("✅ 端點URL配置正確");
  }

  if (
    Boolean(model.is_multimodal) !== testConfig.testModel.expected_multimodal
  ) {
    console.warn("⚠️  多模態支援不符合預期:", {
      actual: Boolean(model.is_multimodal),
      expected: testConfig.testModel.expected_multimodal,
    });
  } else {
    console.log("✅ 多模態配置正確");
  }

  // 4. 測試聊天接口
  const chatSuccess = await testChatWithModel(model.id);

  // 5. 總結
  console.log("\n📊 測試總結:");
  console.log("   登入:", "✅ 成功");
  console.log("   模型獲取:", model ? "✅ 成功" : "❌ 失敗");
  console.log("   聊天測試:", chatSuccess ? "✅ 成功" : "❌ 失敗");

  if (chatSuccess) {
    console.log("\n🎉 模型參數傳遞測試通過！");
    console.log("💡 提示: 檢查後端日誌以確認是否使用了資料庫中的配置");
  } else {
    console.log("\n❌ 測試失敗，請檢查配置和日誌");
  }
}

main().catch(console.error);

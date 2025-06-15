/**
 * 測試模型名稱更新功能
 * 驗證前端 model_name 欄位是否能正確更新到後端 name 欄位
 */

import axios from "axios";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

// 載入環境變數
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../../.env") });

const BACKEND_URL = "http://localhost:3000";

console.log("🧪 測試模型名稱更新功能");
console.log("=".repeat(50));

/**
 * 測試模型名稱更新
 */
async function testModelNameUpdate() {
  try {
    // 1. 登入獲取 token
    console.log("\n1️⃣ 登入獲取認證 token...");
    const loginResponse = await axios.post(`${BACKEND_URL}/api/auth/login`, {
      identifier: "admin",
      password: "admin123",
    });

    const authToken = loginResponse.data.data.access_token;
    console.log("   ✅ 登入成功");

    // 2. 獲取現有模型列表
    console.log("\n2️⃣ 獲取現有模型列表...");
    const modelsResponse = await axios.get(`${BACKEND_URL}/api/models`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const models = modelsResponse.data.data;
    if (!models || models.length === 0) {
      console.log("   ❌ 沒有找到任何模型，請先添加一些測試模型");
      return false;
    }

    const testModel = models[0];
    console.log(
      `   ✅ 找到測試模型: ${testModel.model_name} (ID: ${testModel.id})`
    );

    // 3. 記錄原始名稱
    const originalName = testModel.model_name;
    const newName = `${originalName}_測試更新_${Date.now()}`;

    console.log(`   📝 原始名稱: ${originalName}`);
    console.log(`   📝 新名稱: ${newName}`);

    // 4. 更新模型名稱
    console.log("\n3️⃣ 更新模型名稱...");
    const updateResponse = await axios.put(
      `${BACKEND_URL}/api/models/${testModel.id}`,
      {
        model_name: newName,
        display_name: testModel.display_name,
        provider: testModel.provider,
        model_id: testModel.model_id,
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    if (updateResponse.data.success) {
      console.log("   ✅ 更新請求成功");
    } else {
      console.log("   ❌ 更新請求失敗:", updateResponse.data.message);
      return false;
    }

    // 5. 驗證更新結果
    console.log("\n4️⃣ 驗證更新結果...");
    const verifyResponse = await axios.get(`${BACKEND_URL}/api/models`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const updatedModels = verifyResponse.data.data;
    const updatedModel = updatedModels.find((m) => m.id === testModel.id);

    if (!updatedModel) {
      console.log("   ❌ 找不到更新後的模型");
      return false;
    }

    console.log(`   📋 更新後的模型名稱: ${updatedModel.model_name}`);

    if (updatedModel.model_name === newName) {
      console.log("   ✅ 模型名稱更新成功！");
    } else {
      console.log("   ❌ 模型名稱更新失敗！");
      console.log(`      期望: ${newName}`);
      console.log(`      實際: ${updatedModel.model_name}`);
      return false;
    }

    // 6. 恢復原始名稱
    console.log("\n5️⃣ 恢復原始名稱...");
    await axios.put(
      `${BACKEND_URL}/api/models/${testModel.id}`,
      {
        model_name: originalName,
        display_name: testModel.display_name,
        provider: testModel.provider,
        model_id: testModel.model_id,
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    console.log("   ✅ 已恢復原始名稱");

    return true;
  } catch (error) {
    console.error("\n❌ 測試失敗:", error.message);
    if (error.response) {
      console.error("   HTTP 狀態:", error.response.status);
      console.error("   錯誤回應:", error.response.data);
    }
    throw error;
  }
}

/**
 * 主測試函數
 */
async function runTest() {
  try {
    console.log("\n🚀 開始測試模型名稱更新功能...");

    const success = await testModelNameUpdate();

    if (success) {
      console.log("\n6️⃣ 測試總結...");
      console.log("   ✅ 模型名稱更新功能正常工作");
      console.log("   ✅ 前端 model_name 欄位正確映射到後端 name 欄位");
    }
  } catch (error) {
    console.error("\n❌ 測試執行失敗:", error.message);
    process.exit(1);
  }
}

// 執行測試
if (import.meta.url === `file://${process.argv[1]}`) {
  runTest()
    .then(() => {
      console.log("\n🏁 測試結束");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 測試失敗:", error.message);
      process.exit(1);
    });
}

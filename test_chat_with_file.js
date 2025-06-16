const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const BASE_URL = "http://localhost:3000/api";

// 測試用的 CSV 數據
const csvContent = `姓名,部門,薪資,入職日期,績效評分
張小明,技術部,85000,2023-01-15,4.5
李美華,行銷部,75000,2023-03-20,4.2
王大偉,財務部,90000,2022-11-10,4.8
陳小芳,人事部,70000,2023-05-05,4.0
林志強,技術部,95000,2022-08-15,4.7`;

let authToken = "";
let uploadedFileId = "";
let conversationId = "";

async function login() {
  console.log("🔐 正在登入系統...");

  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      identifier: "admin",
      password: "admin123",
    }),
  });

  if (!response.ok) {
    throw new Error(`登入失敗: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  authToken = data.data.access_token;
  console.log("✅ 登入成功");
  return data;
}

async function uploadCSVFile() {
  console.log("📤 正在上傳 CSV 檔案...");

  // 創建臨時 CSV 檔案
  const tempFilePath = path.join(__dirname, "temp_chat_test.csv");
  fs.writeFileSync(tempFilePath, csvContent, "utf8");

  try {
    const form = new FormData();
    form.append("file", fs.createReadStream(tempFilePath), {
      filename: "chat_test_employees.csv",
      contentType: "text/csv",
    });

    const response = await fetch(`${BASE_URL}/files/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        ...form.getHeaders(),
      },
      body: form,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `上傳失敗: ${response.status} ${response.statusText}\n${errorText}`
      );
    }

    const data = await response.json();
    uploadedFileId = data.data.id;
    console.log("✅ 檔案上傳成功");
    console.log(`   檔案 ID: ${uploadedFileId}`);
    console.log(`   檔案名稱: ${data.data.filename}`);

    return data;
  } finally {
    // 清理臨時檔案
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}

async function createConversation() {
  console.log("💬 正在創建新對話...");

  const response = await fetch(`${BASE_URL}/chat/conversations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "檔案測試對話",
      model_id: 42, // 使用本地 qwen3:8b 模型
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `創建對話失敗: ${response.status} ${response.statusText}\n${errorText}`
    );
  }

  const data = await response.json();
  conversationId = data.data.id;
  console.log("✅ 對話創建成功");
  console.log(`   對話 ID: ${conversationId}`);

  return data;
}

async function sendMessageWithFile(message) {
  console.log(`\n📩 正在發送消息: ${message}`);
  console.log("📎 附加檔案 ID:", uploadedFileId);

  const response = await fetch(
    `${BASE_URL}/chat/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: message,
        attachments: [
          {
            id: uploadedFileId,
            filename: "chat_test_employees.csv",
            file_size: csvContent.length,
            mime_type: "text/csv",
            file_type: "document",
          },
        ],
        temperature: 0.2,
        max_tokens: 2048,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ 發送消息失敗: ${response.status} ${response.statusText}`);
    console.error("錯誤詳情:", errorText);
    return null;
  }

  const data = await response.json();
  console.log("✅ 消息發送成功");

  if (data.data.assistant_message) {
    console.log("\n🤖 AI 回答:");
    console.log(data.data.assistant_message.content);

    if (data.data.assistant_message.metadata?.thinking_content) {
      console.log("\n🤔 AI 思考過程:");
      console.log(data.data.assistant_message.metadata.thinking_content);
    }
  }

  return data;
}

async function cleanup() {
  console.log("\n🧹 正在清理測試資源...");

  // 清理檔案
  if (uploadedFileId && authToken) {
    try {
      const response = await fetch(`${BASE_URL}/files/${uploadedFileId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        console.log("✅ 測試檔案清理完成");
      } else {
        console.log("⚠️ 檔案清理失敗");
      }
    } catch (error) {
      console.log("⚠️ 檔案清理出錯:", error.message);
    }
  }

  // 清理對話
  if (conversationId && authToken) {
    try {
      const response = await fetch(
        `${BASE_URL}/chat/conversations/${conversationId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (response.ok) {
        console.log("✅ 測試對話清理完成");
      } else {
        console.log("⚠️ 對話清理失敗");
      }
    } catch (error) {
      console.log("⚠️ 對話清理出錯:", error.message);
    }
  }
}

async function runChatFileTest() {
  console.log("🚀 開始聊天檔案附件測試\n");

  try {
    // 1. 登入
    await login();
    console.log("");

    // 2. 上傳檔案
    await uploadCSVFile();
    console.log("");

    // 3. 創建對話
    await createConversation();
    console.log("");

    // 4. 發送帶附件的消息
    await sendMessageWithFile("這個檔案中有多少個員工？請分析一下薪資情況。");

    console.log("\n🎉 聊天檔案測試完成！");
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
    console.error("詳細錯誤:", error);
  } finally {
    // 清理
    await cleanup();
  }
}

// 執行測試
runChatFileTest();

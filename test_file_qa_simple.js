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
  const tempFilePath = path.join(__dirname, "temp_test.csv");
  fs.writeFileSync(tempFilePath, csvContent, "utf8");

  try {
    const form = new FormData();
    form.append("file", fs.createReadStream(tempFilePath), {
      filename: "test_employees.csv",
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

    return data;
  } finally {
    // 清理臨時檔案
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}

async function askFileQuestion(question) {
  console.log(`❓ 正在詢問: ${question}`);

  const response = await fetch(`${BASE_URL}/files/${uploadedFileId}/ask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question: question,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ 問答失敗: ${response.status} ${response.statusText}`);
    console.error("錯誤詳情:", errorText);
    return null;
  }

  const data = await response.json();
  console.log("✅ 檔案問答完成");
  console.log(
    `💬 回答: ${data.data ? data.data.answer : data.answer || "無回答"}`
  );

  return data;
}

async function cleanup() {
  if (uploadedFileId && authToken) {
    console.log("🧹 正在清理測試檔案...");
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
        console.log("⚠️ 檔案清理失敗，請手動刪除");
      }
    } catch (error) {
      console.log("⚠️ 檔案清理出錯:", error.message);
    }
  }
}

async function runTest() {
  console.log("🚀 開始檔案問答測試\n");

  try {
    // 1. 登入
    await login();
    console.log("");

    // 2. 上傳檔案
    await uploadCSVFile();
    console.log("");

    // 3. 測試多個問題
    const questions = [
      "這個檔案中有多少個員工？",
      "薪資最高的員工是誰？",
      "平均薪資是多少？",
      "技術部有幾個人？",
      "績效評分最高的是誰？",
    ];

    for (const question of questions) {
      await askFileQuestion(question);
      console.log("");
    }

    console.log("🎉 所有測試完成！");
  } catch (error) {
    console.error("❌ 測試失敗:", error.message);
    console.error("詳細錯誤:", error);
  } finally {
    // 清理
    await cleanup();
  }
}

// 執行測試
runTest();

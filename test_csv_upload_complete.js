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
林志強,技術部,95000,2022-08-15,4.7
黃淑娟,行銷部,72000,2023-02-28,4.3
劉建國,財務部,88000,2023-01-08,4.6
蔡雅婷,人事部,68000,2023-04-12,3.9
鄭明輝,技術部,92000,2022-12-01,4.9
吳佩君,行銷部,76000,2023-03-15,4.1`;

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
  console.log(`   Token: ${authToken.substring(0, 20)}...`);
  return data;
}

async function uploadCSVFile() {
  console.log("📤 正在上傳 CSV 檔案...");

  // 創建臨時 CSV 檔案
  const tempFilePath = path.join(__dirname, "temp_employees.csv");
  fs.writeFileSync(tempFilePath, csvContent, "utf8");

  try {
    const form = new FormData();
    form.append("file", fs.createReadStream(tempFilePath), {
      filename: "employees.csv",
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
    console.log(`   檔案大小: ${data.data.file_size} bytes`);

    return data;
  } finally {
    // 清理臨時檔案
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}

async function analyzeCSVFile() {
  console.log("🔍 正在分析 CSV 檔案...");

  const response = await fetch(`${BASE_URL}/files/${uploadedFileId}/analyze`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "csv_analysis",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `分析失敗: ${response.status} ${response.statusText}\n${errorText}`
    );
  }

  const data = await response.json();
  console.log("✅ CSV 分析完成");
  console.log("📊 分析結果:");
  console.log(JSON.stringify(data, null, 2));

  return data;
}

async function askFileQuestion() {
  console.log("❓ 正在詢問檔案相關問題...");

  const question = "這個檔案中薪資最高的員工是誰？平均薪資是多少？";

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
    throw new Error(
      `問答失敗: ${response.status} ${response.statusText}\n${errorText}`
    );
  }

  const data = await response.json();
  console.log("✅ 檔案問答完成");
  console.log(`❓ 問題: ${question}`);
  console.log(`💬 回答: ${data.answer}`);

  return data;
}

async function getFileContent() {
  console.log("📄 正在獲取檔案內容...");

  const response = await fetch(`${BASE_URL}/files/${uploadedFileId}/content`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `獲取內容失敗: ${response.status} ${response.statusText}\n${errorText}`
    );
  }

  const data = await response.json();
  console.log("✅ 檔案內容獲取成功");
  console.log("📄 檔案內容預覽:");
  console.log(data.data.content.substring(0, 200) + "...");

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

async function runCompleteTest() {
  console.log("🚀 開始完整的 CSV 處理測試\n");

  try {
    // 1. 登入
    await login();
    console.log("");

    // 2. 上傳檔案
    await uploadCSVFile();
    console.log("");

    // 3. 獲取檔案內容
    await getFileContent();
    console.log("");

    // 4. 分析檔案
    await analyzeCSVFile();
    console.log("");

    // 5. 檔案問答
    await askFileQuestion();
    console.log("");

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
runCompleteTest();

/**
 * CSV 處理功能測試腳本
 * 測試 CSV 上傳、分析和 AI 問答功能
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import FormData from "form-data";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const API_BASE_URL = "http://localhost:3000/api";
const TEST_USER = {
  identifier: "admin",
  password: "admin123",
};

let authToken = "";

/**
 * 登入獲取 token
 */
async function login() {
  try {
    console.log("🔐 正在登入...");
    const response = await axios.post(`${API_BASE_URL}/auth/login`, TEST_USER);

    if (response.data.success) {
      authToken = response.data.data.token;
      console.log("✅ 登入成功");
      return true;
    } else {
      console.error("❌ 登入失敗:", response.data.message);
      return false;
    }
  } catch (error) {
    console.error(
      "❌ 登入錯誤:",
      error.response?.data?.message || error.message
    );
    return false;
  }
}

/**
 * 創建測試 CSV 檔案
 */
async function createTestCSV() {
  const csvContent = `姓名,年齡,部門,薪資,入職日期,績效評分
張三,28,技術部,85000,2022-01-15,4.5
李四,32,銷售部,75000,2021-06-20,4.2
王五,25,人事部,65000,2023-03-10,4.8
趙六,35,財務部,90000,2020-11-05,4.1
錢七,29,技術部,88000,2022-08-12,4.6
孫八,31,銷售部,78000,2021-12-03,4.3
周九,27,人事部,67000,2023-01-25,4.7
吳十,33,財務部,92000,2020-09-18,4.0
鄭一,26,技術部,82000,2022-11-30,4.4
馬二,30,銷售部,76000,2021-04-14,4.5
陳三,34,財務部,95000,2019-12-01,4.2
林四,28,技術部,86000,2022-07-22,4.6
黃五,29,人事部,69000,2023-02-08,4.8
劉六,36,銷售部,80000,2020-10-15,4.1
楊七,25,技術部,83000,2023-05-03,4.7`;

  const testFilePath = path.join(__dirname, "test_employees.csv");
  await fs.writeFile(testFilePath, csvContent, "utf8");
  console.log("📄 測試 CSV 檔案已創建:", testFilePath);
  return testFilePath;
}

/**
 * 上傳 CSV 檔案
 */
async function uploadCSV(filePath) {
  try {
    console.log("📤 正在上傳 CSV 檔案...");

    const formData = new FormData();
    const fileBuffer = await fs.readFile(filePath);
    formData.append("file", fileBuffer, {
      filename: "test_employees.csv",
      contentType: "text/csv",
    });

    const response = await axios.post(
      `${API_BASE_URL}/files/upload`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    if (response.data.success) {
      console.log("✅ CSV 檔案上傳成功");
      console.log("檔案 ID:", response.data.data.id);
      console.log("檔案名稱:", response.data.data.filename);
      console.log("檔案大小:", response.data.data.file_size, "位元組");
      return response.data.data;
    } else {
      console.error("❌ 檔案上傳失敗:", response.data.message);
      return null;
    }
  } catch (error) {
    console.error(
      "❌ 上傳錯誤:",
      error.response?.data?.message || error.message
    );
    return null;
  }
}

/**
 * 測試 CSV 專業分析
 */
async function testCSVAnalysis(fileId) {
  try {
    console.log("\n🔍 正在進行 CSV 專業分析...");

    const response = await axios.post(
      `${API_BASE_URL}/files/${fileId}/analyze`,
      {
        type: "csv_analysis",
        model: "qwen3:8b",
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data.success) {
      const analysis = response.data.data;

      console.log("✅ CSV 分析完成");
      console.log("\n📊 分析結果摘要:");
      console.log("- 分析類型:", analysis.analysis_type);
      console.log("- 數據行數:", analysis.csv_data?.total_rows);
      console.log("- 欄位數量:", analysis.csv_data?.total_columns);
      console.log("- 欄位名稱:", analysis.csv_data?.headers?.join(", "));

      if (analysis.quality_report) {
        console.log(
          "- 數據品質分數:",
          analysis.quality_report.summary.quality_score.toFixed(1) + "/100"
        );
        console.log(
          "- 發現問題數:",
          analysis.quality_report.summary.total_issues
        );
      }

      if (analysis.ai_insights) {
        console.log(
          "- AI 洞察長度:",
          analysis.ai_insights.insights?.length || 0,
          "字符"
        );
        console.log("- 使用模型:", analysis.ai_insights.model_used);
        console.log("- 處理時間:", analysis.ai_insights.processing_time, "ms");

        if (analysis.ai_insights.thinking_process) {
          console.log(
            "- 思考過程長度:",
            analysis.ai_insights.thinking_process.length,
            "字符"
          );
        }
      }

      // 顯示數據類型分析
      if (analysis.data_types) {
        console.log("\n📋 數據類型分析:");
        Object.entries(analysis.data_types).forEach(([field, info]) => {
          console.log(
            `- ${field}: ${info.type} (信心度: ${(info.confidence * 100).toFixed(1)}%)`
          );
        });
      }

      // 顯示統計摘要
      if (analysis.statistics) {
        console.log("\n📈 統計摘要:");
        Object.entries(analysis.statistics).forEach(([field, stats]) => {
          if (stats.mean !== undefined) {
            console.log(
              `- ${field}: 平均=${stats.mean.toFixed(2)}, 中位數=${stats.median.toFixed(2)}, 標準差=${stats.std.toFixed(2)}`
            );
          } else if (stats.unique_count !== undefined) {
            console.log(
              `- ${field}: 唯一值=${stats.unique_count}, 平均長度=${stats.avg_length.toFixed(1)}`
            );
          }
        });
      }

      // 顯示 AI 洞察（前500字符）
      if (analysis.ai_insights?.insights) {
        console.log("\n🧠 AI 洞察預覽:");
        console.log(analysis.ai_insights.insights.substring(0, 500) + "...");
      }

      return analysis;
    } else {
      console.error("❌ CSV 分析失敗:", response.data.message);
      return null;
    }
  } catch (error) {
    console.error(
      "❌ 分析錯誤:",
      error.response?.data?.message || error.message
    );
    return null;
  }
}

/**
 * 測試檔案問答功能
 */
async function testFileQA(fileId) {
  const questions = [
    "這個數據集中哪個部門的平均薪資最高？",
    "績效評分最高的員工是誰？",
    "技術部有多少名員工？",
    "入職時間最早的員工是誰？",
    "薪資分佈有什麼特徵？",
  ];

  console.log("\n❓ 正在測試檔案問答功能...");

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];

    try {
      console.log(`\n問題 ${i + 1}: ${question}`);

      const response = await axios.post(
        `${API_BASE_URL}/files/${fileId}/ask`,
        {
          question: question,
          model: "qwen3:8b",
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        const result = response.data.data;
        console.log("✅ 回答:", result.answer.substring(0, 200) + "...");
        console.log(
          "📊 處理信息: 模型=" +
            result.model_used +
            ", 檔案大小=" +
            result.file_info.content_length +
            "字符"
        );

        if (result.thinking_process) {
          console.log(
            "🧠 思考過程長度:",
            result.thinking_process.length,
            "字符"
          );
        }
      } else {
        console.error("❌ 問答失敗:", response.data.message);
      }
    } catch (error) {
      console.error(
        "❌ 問答錯誤:",
        error.response?.data?.message || error.message
      );
    }

    // 避免請求過於頻繁
    if (i < questions.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

/**
 * 清理測試檔案
 */
async function cleanup(filePath, fileId) {
  try {
    // 刪除本地測試檔案
    await fs.unlink(filePath);
    console.log("🗑️ 本地測試檔案已刪除");

    // 刪除上傳的檔案
    if (fileId) {
      const response = await axios.delete(`${API_BASE_URL}/files/${fileId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.data.success) {
        console.log("🗑️ 上傳的檔案已刪除");
      }
    }
  } catch (error) {
    console.warn("⚠️ 清理時出現錯誤:", error.message);
  }
}

/**
 * 主測試函數
 */
async function runTests() {
  console.log("🚀 開始 CSV 處理功能測試\n");

  // 1. 登入
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error("❌ 無法登入，測試終止");
    return;
  }

  let testFilePath = "";
  let uploadedFile = null;

  try {
    // 2. 創建測試 CSV
    testFilePath = await createTestCSV();

    // 3. 上傳 CSV
    uploadedFile = await uploadCSV(testFilePath);
    if (!uploadedFile) {
      console.error("❌ 檔案上傳失敗，測試終止");
      return;
    }

    // 4. 測試 CSV 分析
    const analysisResult = await testCSVAnalysis(uploadedFile.id);
    if (!analysisResult) {
      console.error("❌ CSV 分析失敗");
    }

    // 5. 測試檔案問答
    await testFileQA(uploadedFile.id);

    console.log("\n✅ 所有測試完成！");
  } catch (error) {
    console.error("❌ 測試過程中出現錯誤:", error.message);
  } finally {
    // 6. 清理
    if (testFilePath || uploadedFile) {
      console.log("\n🧹 正在清理測試檔案...");
      await cleanup(testFilePath, uploadedFile?.id);
    }
  }
}

// 執行測試
runTests().catch(console.error);

#!/usr/bin/env node

/**
 * 測試二次 AI 調用一致性修復效果
 * 測試場景：用戶明確指定欄位和數量時，AI是否會嚴格遵循
 */

import fetch from "node-fetch";

const BASE_URL = "http://localhost:3001";
const TEST_TOKEN = "your-test-token"; // 請替換為有效的測試 token

async function testSecondaryAIConsistency() {
  console.log("🧪 測試二次 AI 調用一致性修復效果\n");

  // 測試案例
  const testCases = [
    {
      name: "欄位限制測試",
      question:
        "請查詢MIL專案，但只要這3個欄位：SerialNumber, ProposalFactory, Solution",
      expectedBehavior: "只顯示指定的3個欄位，不添加其他欄位",
    },
    {
      name: "數量限制測試",
      question: "請查詢MIL專案，只要5筆資料就好",
      expectedBehavior: "只顯示5筆資料，不多不少",
    },
    {
      name: "複合限制測試",
      question:
        "請查詢MIL專案，只要3筆資料，而且只顯示SerialNumber和ProposalFactory這2個欄位",
      expectedBehavior: "同時滿足數量和欄位限制",
    },
  ];

  const results = [];

  for (const testCase of testCases) {
    console.log(`\n📋 測試案例：${testCase.name}`);
    console.log(`❓ 問題：${testCase.question}`);
    console.log(`✅ 期望行為：${testCase.expectedBehavior}`);

    try {
      const response = await fetch(`${BASE_URL}/api/chat/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TEST_TOKEN}`,
        },
        body: JSON.stringify({
          message: testCase.question,
          conversation_id: "test_consistency",
          model: "qwen2.5-vl:32b", // 使用與二次調用相同的模型
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log("✅ 對話成功");

        // 檢查是否有工具調用和二次AI回應
        if (result.has_tool_calls && result.used_secondary_ai) {
          console.log("🔧 有工具調用，使用了二次AI");
          console.log(
            "🤖 二次AI模型配置：",
            result.debug_info?.secondaryAI?.modelConfig?.model_id || "未知"
          );

          // 分析回應內容
          const finalResponse = result.final_response || result.response;

          console.log("\n📝 AI 最終回應：");
          console.log(finalResponse);

          // 簡單的一致性檢查
          const consistencyCheck = analyzeConsistency(testCase, finalResponse);
          console.log(`\n🎯 一致性評估：${consistencyCheck.score}/10`);
          console.log(`📊 分析：${consistencyCheck.analysis}`);

          results.push({
            testCase: testCase.name,
            success: true,
            response: finalResponse,
            consistencyScore: consistencyCheck.score,
            analysis: consistencyCheck.analysis,
          });
        } else {
          console.log("⚠️ 沒有工具調用或沒有使用二次AI");
          results.push({
            testCase: testCase.name,
            success: false,
            reason: "沒有觸發二次AI調用",
          });
        }
      } else {
        console.log("❌ 對話失敗:", result.error);
        results.push({
          testCase: testCase.name,
          success: false,
          reason: result.error,
        });
      }
    } catch (error) {
      console.error("❌ 請求失敗:", error.message);
      results.push({
        testCase: testCase.name,
        success: false,
        reason: error.message,
      });
    }

    // 等待一下再進行下一個測試
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // 總結測試結果
  console.log("\n" + "=".repeat(60));
  console.log("📊 測試結果總結");
  console.log("=".repeat(60));

  const successfulTests = results.filter((r) => r.success);
  const averageScore =
    successfulTests.length > 0
      ? successfulTests.reduce((sum, r) => sum + r.consistencyScore, 0) /
        successfulTests.length
      : 0;

  console.log(`✅ 成功測試：${successfulTests.length}/${results.length}`);
  console.log(`🎯 平均一致性分數：${averageScore.toFixed(1)}/10`);

  if (averageScore >= 8) {
    console.log("🎉 修復效果優秀！AI一致性顯著提升");
  } else if (averageScore >= 6) {
    console.log("👍 修復效果良好，仍有改善空間");
  } else {
    console.log("⚠️ 修復效果有限，需要進一步優化");
  }

  return results;
}

/**
 * 分析AI回應的一致性
 */
function analyzeConsistency(testCase, response) {
  let score = 10;
  let issues = [];

  const lowerResponse = response.toLowerCase();

  // 檢查欄位限制
  if (
    testCase.question.includes("只要") &&
    testCase.question.includes("欄位")
  ) {
    // 提取要求的欄位數量
    const fieldMatch = testCase.question.match(/只要.*?(\d+).*?欄位/);
    if (fieldMatch) {
      const requiredFields = parseInt(fieldMatch[1]);

      // 簡單檢查：如果回應中出現太多欄位名稱，可能違反了限制
      const fieldIndicators = [
        "序號",
        "編號",
        "名稱",
        "狀態",
        "日期",
        "時間",
        "重要性",
        "描述",
      ];
      const detectedFields = fieldIndicators.filter((field) =>
        lowerResponse.includes(field)
      );

      if (detectedFields.length > requiredFields + 1) {
        // 允許一些容錯
        score -= 3;
        issues.push(
          `可能顯示了過多欄位（檢測到${detectedFields.length}個可能的欄位）`
        );
      }
    }
  }

  // 檢查數量限制
  if (testCase.question.includes("只要") && testCase.question.includes("筆")) {
    const quantityMatch = testCase.question.match(/只要.*?(\d+).*?筆/);
    if (quantityMatch) {
      const requiredQuantity = parseInt(quantityMatch[1]);

      // 檢查是否有明顯的列表結構
      const listMatches =
        response.match(/^\d+\./gm) || response.match(/^[-*]\s/gm);
      if (listMatches && listMatches.length > requiredQuantity + 1) {
        score -= 3;
        issues.push(`可能顯示了過多資料筆數（檢測到${listMatches.length}筆）`);
      }
    }
  }

  // 檢查是否有不當的額外分析
  if (
    lowerResponse.includes("建議") ||
    lowerResponse.includes("分析") ||
    lowerResponse.includes("趨勢")
  ) {
    if (
      testCase.question.includes("只要") ||
      testCase.question.includes("只顯示")
    ) {
      // 如果用戶明確要求限制，但AI仍添加分析，扣分
      score -= 1;
      issues.push("在用戶要求限制的情況下，仍添加了額外分析");
    }
  }

  // 檢查是否完全沒有回應用戶問題
  if (lowerResponse.includes("沒有") && lowerResponse.includes("數據")) {
    score -= 5;
    issues.push("回應表示沒有數據，可能忽略了工具結果");
  }

  const analysis =
    issues.length > 0 ? `發現問題：${issues.join("; ")}` : "回應符合用戶要求";

  return { score: Math.max(0, score), analysis };
}

// 如果直接執行此腳本
if (import.meta.url === `file://${process.argv[1]}`) {
  testSecondaryAIConsistency()
    .then((results) => {
      console.log("\n🏁 測試完成");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ 測試失敗:", error);
      process.exit(1);
    });
}

export default testSecondaryAIConsistency;

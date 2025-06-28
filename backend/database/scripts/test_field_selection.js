#!/usr/bin/env node

/**
 * 測試 MIL 工具欄位選擇功能
 * 驗證用戶指定欄位時是否只返回指定欄位
 */

import fetch from "node-fetch";

const MCP_SERVER_URL = "http://localhost:3001/api";

async function testFieldSelection() {
  console.log("🧪 測試 MIL 工具欄位選擇功能\\n");

  const testCases = [
    {
      name: "預設欄位測試",
      params: {
        limit: 3,
      },
      expected: "只返回預設的3個欄位: SerialNumber, ProposalFactory, Solution",
    },
    {
      name: "指定3個欄位測試",
      params: {
        fields: ["SerialNumber", "ProposalFactory", "Solution"],
        limit: 3,
      },
      expected: "只返回指定的3個欄位",
    },
    {
      name: "指定單一欄位測試",
      params: {
        fields: ["SerialNumber"],
        limit: 5,
      },
      expected: "只返回SerialNumber欄位",
    },
    {
      name: "指定多欄位測試",
      params: {
        fields: [
          "SerialNumber",
          "TypeName",
          "Status",
          "DRI_EmpName",
          "DelayDay",
        ],
        limit: 2,
      },
      expected: "返回5個指定欄位",
    },
  ];

  for (const testCase of testCases) {
    console.log(`\\n🔍 ${testCase.name}`);
    console.log(`📋 期望結果: ${testCase.expected}`);
    console.log(`⚙️ 參數:`, JSON.stringify(testCase.params, null, 2));

    try {
      const response = await fetch(`${MCP_SERVER_URL}/mil/get-mil-list`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testCase.params),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.data.data.length > 0) {
        const firstRecord = result.data.data[0];
        const returnedFields = Object.keys(firstRecord);

        console.log(`✅ 成功 - 返回 ${returnedFields.length} 個欄位:`);
        console.log(`📝 欄位列表: ${returnedFields.join(", ")}`);

        // 檢查是否符合預期
        if (testCase.params.fields) {
          const expectedFields = testCase.params.fields;
          const isMatch =
            returnedFields.length === expectedFields.length &&
            expectedFields.every((field) => returnedFields.includes(field));

          if (isMatch) {
            console.log("🎯 ✅ 欄位完全符合預期！");
          } else {
            console.log("🚨 ❌ 欄位不符合預期！");
            console.log(`   期望: ${expectedFields.join(", ")}`);
            console.log(`   實際: ${returnedFields.join(", ")}`);
          }
        } else {
          // 檢查預設欄位
          const defaultFields = ["SerialNumber", "ProposalFactory", "Solution"];
          const isMatch =
            returnedFields.length === defaultFields.length &&
            defaultFields.every((field) => returnedFields.includes(field));

          if (isMatch) {
            console.log("🎯 ✅ 預設欄位符合預期！");
          } else {
            console.log("🚨 ❌ 預設欄位不符合預期！");
            console.log(`   期望: ${defaultFields.join(", ")}`);
            console.log(`   實際: ${returnedFields.join(", ")}`);
          }
        }

        // 顯示第一筆資料範例
        console.log("\\n📊 第一筆資料範例:");
        console.table([firstRecord]);
      } else {
        console.log("⚠️ 沒有返回資料");
      }
    } catch (error) {
      console.log(`❌ 失敗: ${error.message}`);
    }

    console.log("-".repeat(60));
  }
}

// 執行測試
testFieldSelection().catch(console.error);

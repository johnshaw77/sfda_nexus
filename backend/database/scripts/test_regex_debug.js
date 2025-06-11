#!/usr/bin/env node

/**
 * 正規表達式調試腳本
 */

function testRegexPatterns() {
  console.log("🧪 測試正規表達式...\n");

  const testText = `我來幫您查詢公司的部門資訊。

<tool_call>
get_department_list
{"sortBy": "code", "sortOrder": "asc"}
</tool_call>

查詢完成後，我會為您整理部門列表。`;

  console.log("📝 測試文本:");
  console.log(testText);
  console.log("\n" + "=".repeat(50) + "\n");

  // 測試不同的正規表達式
  const patterns = [
    {
      name: "原始模式",
      regex:
        /<tool_call>\s*([^\n<]+)(?:\s*\n\s*(\{[\s\S]*?\}))?\s*<\/tool_call>/gi,
    },
    {
      name: "簡化模式",
      regex: /<tool_call>([\s\S]*?)<\/tool_call>/gi,
    },
    {
      name: "更寬鬆模式",
      regex: /<tool_call>\s*(.*?)\s*<\/tool_call>/gis,
    },
    {
      name: "分行處理模式",
      regex: /<tool_call>\s*([^\n]+)\s*\n\s*(\{.*?\})\s*<\/tool_call>/gis,
    },
  ];

  patterns.forEach((pattern) => {
    console.log(`🔍 測試模式: ${pattern.name}`);
    console.log(`   正規表達式: ${pattern.regex.source}`);

    // 重置正規表達式
    pattern.regex.lastIndex = 0;

    let match;
    let matchCount = 0;

    while ((match = pattern.regex.exec(testText)) !== null) {
      matchCount++;
      console.log(`   匹配 ${matchCount}:`);
      console.log(`     完整匹配: "${match[0]}"`);

      for (let i = 1; i < match.length; i++) {
        if (match[i] !== undefined) {
          console.log(`     群組 ${i}: "${match[i]}"`);
        }
      }
    }

    if (matchCount === 0) {
      console.log("   ❌ 沒有匹配");
    } else {
      console.log(`   ✅ 找到 ${matchCount} 個匹配`);
    }

    console.log("");
  });

  // 手動解析測試
  console.log("🔧 手動解析測試:");
  const manualPattern = /<tool_call>([\s\S]*?)<\/tool_call>/gi;
  let match = manualPattern.exec(testText);

  if (match) {
    const content = match[1].trim();
    console.log(`   工具調用內容: "${content}"`);

    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);
    console.log(`   分割行數: ${lines.length}`);

    if (lines.length >= 1) {
      const toolName = lines[0];
      console.log(`   工具名稱: "${toolName}"`);

      if (lines.length >= 2) {
        const paramString = lines[1];
        console.log(`   參數字符串: "${paramString}"`);

        try {
          const params = JSON.parse(paramString);
          console.log(`   解析參數: ${JSON.stringify(params)}`);

          console.log("\n✅ 手動解析成功!");
          console.log(`   工具: ${toolName}`);
          console.log(`   參數: ${JSON.stringify(params)}`);
        } catch (error) {
          console.log(`   ❌ JSON 解析失敗: ${error.message}`);
        }
      } else {
        console.log("   工具無參數");
      }
    }
  } else {
    console.log("   ❌ 手動解析失敗");
  }
}

testRegexPatterns();

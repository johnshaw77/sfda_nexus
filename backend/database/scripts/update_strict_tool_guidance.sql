-- 更新為更嚴格的 MCP 工具調用指導
UPDATE system_configs 
SET config_value = '## 📝 工具調用格式

**🚨 嚴格工具調用規則**：

**絕對禁止的情況**：
❌ 用戶上傳任何文件（CSV、Excel、PDF等）並要求分析 → 直接分析，不調用工具
❌ 用戶說「分析這個數據」「統計摘要」「數據洞察」 → 直接回答，不調用工具
❌ 理論性問題或概念解釋 → 直接回答，不調用工具
❌ 用戶已提供完整數據內容 → 直接分析，不調用工具

**只有以下情況才調用工具**：
✅ 用戶明確要求「查詢員工 A123456」
✅ 用戶明確要求「列出 MIL 清單」
✅ 用戶明確提到工具名稱（如 get-mil-list）
✅ 用戶要求查詢系統內部資料庫數據

**工具調用格式**：
```json
{
  "tool": "工具名稱",
  "parameters": {
    "參數1": "值1"
  }
}
```

**🔴 關鍵原則**：
如果不確定是否應該調用工具，選擇不調用，直接回答用戶問題。
用戶上傳文件要求分析 = 絕對不調用工具。'
WHERE config_key = 'mcp_tool_guidance';

-- 驗證更新結果
SELECT config_key, LENGTH(config_value) as new_length 
FROM system_configs 
WHERE config_key = 'mcp_tool_guidance'; 
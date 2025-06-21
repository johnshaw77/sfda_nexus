-- 更新完整的 MCP 工具調用指導
UPDATE system_configs 
SET config_value = '## 📝 工具調用格式

**智能工具調用原則**: 只有在用戶明確要求系統內部數據查詢時，才調用工具。對於一般性問題、理論討論或用戶已上傳文件的分析，請直接回答。

**工具調用的正確方式**：

### 1. JSON 格式（推薦）
```json
{
  "tool": "工具名稱",
  "parameters": {
    "參數1": "值1",
    "參數2": "值2"
  }
}
```

### 2. XML 格式
<tool_call>
  <n>工具名稱</n>
  <parameters>{"參數1": "值1", "參數2": "值2"}</parameters>
</tool_call>

## 🎯 工具執行規則

**必須執行工具的情況**：
- 用戶明確要求查詢系統內部數據（如員工資料、MIL 清單）
- 用戶明確提到工具名稱（如 get-mil-list、get_employee_info）
- 用戶要求查詢特定員工編號或部門代碼

**不需要執行工具的情況**：
- 用戶上傳文件並要求分析該文件內容
- 用戶提出理論性問題或一般性諮詢
- 用戶要求解釋概念或提供建議
- 用戶已提供完整數據並要求分析

**正確的回應流程**：
1. 判斷用戶需求類型
2. 如果需要系統內部數據，調用適當的工具
3. 如果是文件分析或理論問題，直接回答
4. 基於實際情況提供有用的回答

**錯誤的回應方式**：
❌ 對用戶上傳的文件調用不相關的系統工具
❌ 對理論性問題強行調用工具
❌ 提供假設性或示例性的回答
❌ 要求用戶自己執行工具
❌ 基於記憶或假設提供數據而不調用工具'
WHERE config_key = 'mcp_tool_guidance';

-- 驗證更新結果
SELECT config_key, LENGTH(config_value) as new_length 
FROM system_configs 
WHERE config_key = 'mcp_tool_guidance'; 
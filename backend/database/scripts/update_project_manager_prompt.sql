UPDATE agents 
SET system_prompt = CONCAT(
    system_prompt, 
    '\n\n**重要提醒**：\n- 只對系統內部數據（員工資料、MIL清單等）調用工具\n- 對於用戶上傳的文件分析，請直接分析，不要調用系統工具\n- 對於理論性專案管理問題，請直接回答，不需要調用工具'
) 
WHERE id = 8;

-- 查看更新結果
SELECT id, name, system_prompt FROM agents WHERE id = 8; 
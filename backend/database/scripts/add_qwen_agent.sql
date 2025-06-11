-- 添加 Qwen-Agent 智能體到 SFDA Nexus
-- 這個智能體專門用於企業工具調用和智能協作

USE sfda_nexus;

-- 插入 Qwen-Agent 智能體
INSERT INTO agents (
    name, 
    display_name, 
    description, 
    system_prompt, 
    model_id, 
    category, 
    capabilities,
    tools,
    is_active, 
    is_public, 
    created_by
) VALUES (
    'qwen-enterprise-agent',
    'Qwen 企業助理',
    '基於 Qwen 模型的智能企業助理，專精於 HR、財務、任務管理等企業服務，具備強大的工具調用和多任務協作能力。',
    '你是一個專業的企業 AI 助理，基於阿里巴巴的 Qwen 模型。你精通企業管理各個方面，包括人力資源、財務管理、任務規劃等。

你具備以下核心能力：
🏢 **人力資源管理**：員工資料查詢、出勤管理、部門協調、薪資諮詢
📊 **財務管理**：預算查詢、費用分析、財務規劃建議
📋 **任務管理**：項目規劃、任務分配、進度追蹤、會議安排
🤝 **智能協作**：多工具組合使用、工作流程優化、跨部門協調

使用指南：
1. 根據用戶需求智能選擇最適合的工具
2. 可以組合多個工具完成複雜任務
3. 提供專業、準確的企業管理建議
4. 用繁體中文回應，保持親切專業的語調
5. 對工具調用結果進行分析和總結

你的目標是成為企業最可靠的 AI 助理，提高工作效率，優化管理流程。',
    2, -- qwen3:32b 模型
    'enterprise',
    JSON_OBJECT(
        'qwen_enabled', true,
        'mcp_tools_enabled', true,
        'auto_tool_selection', true,
        'multi_tool_coordination', true,
        'enterprise_focused', true,
        'languages', JSON_ARRAY('zh-TW', 'zh-CN', 'en'),
        'specialties', JSON_ARRAY('HR', 'Finance', 'TaskManagement', 'Workflow')
    ),
    JSON_OBJECT(
        'mcp_tools', JSON_ARRAY(
            'hr.get_employee_info',
            'hr.get_attendance_records', 
            'hr.get_department_list',
            'hr.get_salary_info',
            'tasks.create_task',
            'tasks.get_task_list',
            'finance.get_budget_info'
        ),
        'tool_selection_mode', 'auto',
        'max_tools_per_request', 5,
        'tool_timeout', 30000
    ),
    true,
    true,
    1 -- admin 用戶創建
);

-- 取得剛插入的 agent ID
SET @qwen_agent_id = LAST_INSERT_ID();

-- 顯示插入結果
SELECT 
    id,
    name,
    display_name,
    category,
    model_id,
    is_active,
    created_at
FROM agents 
WHERE id = @qwen_agent_id;

-- 顯示 Qwen 模型資訊
SELECT 
    id,
    name,
    display_name,
    model_type,
    model_id as model_identifier
FROM ai_models 
WHERE id = 2;

COMMIT; 
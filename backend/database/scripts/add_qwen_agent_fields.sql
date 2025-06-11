-- 添加 Qwen-Agent 相關欄位到 agents 表
-- 執行命令：docker exec -i mysql-server mysql -u root -pMyPwd@1234 --default-character-set=utf8mb4 sfda_nexus < backend/database/scripts/add_qwen_agent_fields.sql

USE sfda_nexus;

-- 設置字符集
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 檢查當前 agents 表結構
SELECT 'Current agents table structure:' as info;
DESCRIBE agents;

-- 添加 Qwen-Agent 相關欄位
ALTER TABLE agents 
ADD COLUMN agent_type ENUM('custom', 'qwen') DEFAULT 'custom' COMMENT 'Agent 類型' AFTER category,
ADD COLUMN qwen_config JSON DEFAULT NULL COMMENT 'Qwen-Agent 專用配置' AFTER tools,
ADD COLUMN tool_selection_mode ENUM('manual', 'auto') DEFAULT 'manual' COMMENT '工具選擇模式' AFTER qwen_config;

-- 添加索引
ALTER TABLE agents 
ADD INDEX idx_agent_type (agent_type),
ADD INDEX idx_tool_selection_mode (tool_selection_mode);

-- 檢查修改後的表結構
SELECT 'Updated agents table structure:' as info;
DESCRIBE agents;

-- 更新現有的 Qwen-Agent 記錄
UPDATE agents 
SET 
    agent_type = 'qwen',
    qwen_config = JSON_OBJECT(
        'model_config', JSON_OBJECT(
            'model', 'qwen3:32b',
            'temperature', 0.7,
            'max_tokens', 4096
        ),
        'mcp_enabled', true,
        'auto_tool_selection', true,
        'supported_languages', JSON_ARRAY('zh-TW', 'zh-CN', 'en'),
        'specialties', JSON_ARRAY('HR', 'Finance', 'TaskManagement', 'Workflow')
    ),
    tool_selection_mode = 'auto'
WHERE name = 'qwen-enterprise-agent';

-- 驗證更新結果
SELECT 
    id,
    name,
    display_name,
    agent_type,
    tool_selection_mode,
    JSON_PRETTY(qwen_config) as qwen_config_formatted
FROM agents 
WHERE name = 'qwen-enterprise-agent';

-- 顯示所有 agents 的新欄位狀態
SELECT 
    id,
    name,
    display_name,
    category,
    agent_type,
    tool_selection_mode,
    CASE 
        WHEN qwen_config IS NOT NULL THEN 'Has Config'
        ELSE 'No Config'
    END as qwen_config_status
FROM agents
ORDER BY id;

COMMIT; 
-- 添加智能體相關字段到 messages 表
-- 用於修復智能體錯誤切換問題

-- 添加 agent_id 字段
ALTER TABLE messages 
ADD COLUMN agent_id INT DEFAULT NULL COMMENT '智能體ID（可選）',
ADD COLUMN agent_name VARCHAR(100) DEFAULT NULL COMMENT '智能體名稱（快照）';

-- 添加索引
ALTER TABLE messages 
ADD INDEX idx_messages_agent_id (agent_id);

-- 添加外鍵約束（如果需要）
ALTER TABLE messages 
ADD CONSTRAINT fk_messages_agent_id 
FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL;

-- 從對話表同步現有的智能體信息到消息表
UPDATE messages m
JOIN conversations c ON m.conversation_id = c.id
JOIN agents a ON c.agent_id = a.id
SET 
  m.agent_id = c.agent_id,
  m.agent_name = COALESCE(a.display_name, a.name)
WHERE m.role = 'assistant' AND c.agent_id IS NOT NULL; 
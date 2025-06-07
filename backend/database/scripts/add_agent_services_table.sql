-- 建立智能體服務權限控制表
CREATE TABLE IF NOT EXISTS mcp_agent_services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    agent_id INT NOT NULL COMMENT '智能體ID',
    mcp_service_id INT NOT NULL COMMENT 'MCP服務ID',
    is_active TINYINT(1) DEFAULT 1 COMMENT '是否啟用 (1=啟用, 0=停用)',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    FOREIGN KEY (mcp_service_id) REFERENCES mcp_services(id) ON DELETE CASCADE,
    UNIQUE KEY unique_agent_service (agent_id, mcp_service_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='智能體服務權限表';

-- 建立索引優化查詢效能（檢查索引是否存在）
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'mcp_agent_services' 
     AND INDEX_NAME = 'idx_mcp_agent_services_agent') = 0,
    'CREATE INDEX idx_mcp_agent_services_agent ON mcp_agent_services(agent_id, is_active)',
    'SELECT "Index idx_mcp_agent_services_agent already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'mcp_agent_services' 
     AND INDEX_NAME = 'idx_mcp_agent_services_service') = 0,
    'CREATE INDEX idx_mcp_agent_services_service ON mcp_agent_services(mcp_service_id, is_active)',
    'SELECT "Index idx_mcp_agent_services_service already exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 檢查並移除 mcp_tools 表的 category 字段（因為服務本身就是分類）
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'mcp_tools' 
     AND COLUMN_NAME = 'category') > 0,
    'ALTER TABLE mcp_tools DROP COLUMN category',
    'SELECT "Category column not exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 檢查並移除相關索引
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'mcp_tools' 
     AND INDEX_NAME = 'idx_mcp_tools_category') > 0,
    'DROP INDEX idx_mcp_tools_category ON mcp_tools',
    'SELECT "Index idx_mcp_tools_category not exists" as message'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 更新現有服務資料，將其改為業務服務
UPDATE mcp_services SET 
    name = 'HR 服務',
    description = 'HR 人力資源管理服務，包含員工、薪資、考勤等功能',
    endpoint_url = 'http://localhost:8080/api/hr'
WHERE id = 1;

UPDATE mcp_services SET 
    name = '財務服務', 
    description = '財務管理服務，包含預算、報表、費用等功能',
    endpoint_url = 'http://localhost:8080/api/finance'
WHERE id = 2;

INSERT INTO mcp_services (name, endpoint_url, description, owner) 
VALUES ('任務管理服務', 'http://localhost:8080/api/tasks', '任務和專案管理服務，包含任務建立、追蹤等功能', 'system')
ON DUPLICATE KEY UPDATE 
    name = VALUES(name),
    endpoint_url = VALUES(endpoint_url),
    description = VALUES(description);

SELECT 'MCP 智能體服務權限表建立完成！' as message; 
-- ============================================
-- SFDA Nexus MCP 整合資料表建立腳本
-- 建立日期：2024-12-30
-- 說明：建立 MCP 服務與工具管理所需的資料表
-- ============================================

USE sfda_nexus;

-- ============================================
-- 1. 建立 MCP 服務表
-- ============================================
CREATE TABLE IF NOT EXISTS mcp_services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT 'MCP 服務名稱',
    endpoint_url VARCHAR(255) COMMENT 'MCP 服務端點 URL',
    description VARCHAR(255) COMMENT 'MCP 服務描述',
    is_active TINYINT(1) DEFAULT 1 COMMENT '是否啟用 (1=啟用, 0=停用)',
    version INT DEFAULT 1 COMMENT 'MCP 服務版本號',
    owner VARCHAR(100) COMMENT '服務擁有者',
    icon VARCHAR(255) COMMENT '服務圖示 URL',
    is_deleted TINYINT(1) DEFAULT 0 COMMENT '軟刪除標記 (1=已刪除, 0=正常)',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
    
    -- 索引
    INDEX idx_mcp_services_name (name),
    INDEX idx_mcp_services_active (is_active, is_deleted),
    INDEX idx_mcp_services_owner (owner)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='MCP 服務表';

-- ============================================
-- 2. 建立 MCP 工具表
-- ============================================
CREATE TABLE IF NOT EXISTS mcp_tools (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mcp_service_id INT NOT NULL COMMENT '對應的 MCP 服務 ID',
    name VARCHAR(100) NOT NULL COMMENT 'MCP 工具名稱',
    description VARCHAR(255) COMMENT 'MCP 工具描述',
    input_schema JSON COMMENT '工具輸入參數結構（JSON 格式）',
    category VARCHAR(50) DEFAULT 'general' COMMENT '工具分類',
    priority INT DEFAULT 1 COMMENT '優先級，數字越大優先級越高',
    usage_count INT DEFAULT 0 COMMENT '使用次數統計',
    is_enabled TINYINT(1) DEFAULT 1 COMMENT '是否啟用 (1=啟用, 0=停用)',
    is_deleted TINYINT(1) DEFAULT 0 COMMENT '軟刪除標記 (1=已刪除, 0=正常)',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '建立時間',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新時間',
    
    -- 外鍵約束
    FOREIGN KEY (mcp_service_id) REFERENCES mcp_services(id) ON DELETE CASCADE,
    
    -- 索引
    INDEX idx_mcp_tools_service (mcp_service_id),
    INDEX idx_mcp_tools_enabled (mcp_service_id, is_enabled, is_deleted),
    INDEX idx_mcp_tools_category (category, is_enabled),
    INDEX idx_mcp_tools_name (name),
    INDEX idx_mcp_tools_usage (usage_count DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='MCP 工具表';

-- ============================================
-- 3. 新增預設資料
-- ============================================

-- 新增預設的本地 MCP 服務
INSERT INTO mcp_services (name, endpoint_url, description, owner) 
VALUES (
    '本地 MCP Server', 
    'http://localhost:8080', 
    '本地開發用 MCP 工具服務，提供各種開發和管理工具', 
    'system'
) ON DUPLICATE KEY UPDATE 
    endpoint_url = VALUES(endpoint_url),
    description = VALUES(description),
    updated_at = CURRENT_TIMESTAMP;

-- 新增範例 MCP 服務（可選）
INSERT INTO mcp_services (name, endpoint_url, description, owner) 
VALUES (
    'SFDA MCP Server', 
    'http://localhost:8081', 
    'SFDA 專用 MCP 服務，提供 HR、財務、任務管理等工具', 
    'admin'
) ON DUPLICATE KEY UPDATE 
    endpoint_url = VALUES(endpoint_url),
    description = VALUES(description),
    updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- 4. 查看建立結果
-- ============================================

-- 顯示建立的表結構
SHOW CREATE TABLE mcp_services;
SHOW CREATE TABLE mcp_tools;

-- 查看資料
SELECT * FROM mcp_services;
SELECT * FROM mcp_tools;

-- 顯示完成訊息
SELECT '✅ MCP 資料表建立完成！' AS message; 
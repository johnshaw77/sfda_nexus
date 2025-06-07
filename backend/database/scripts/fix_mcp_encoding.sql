-- ============================================
-- 修正 MCP 資料表字符集編碼問題
-- 建立日期：2024-12-30
-- 說明：修正中文顯示亂碼問題
-- ============================================

USE sfda_nexus;

-- ============================================
-- 1. 刪除現有資料（保留結構）
-- ============================================
DELETE FROM mcp_tools;
DELETE FROM mcp_services;

-- ============================================
-- 2. 修改表字符集為 utf8mb4
-- ============================================
ALTER TABLE mcp_services CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE mcp_tools CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================
-- 3. 重新插入正確編碼的資料
-- ============================================

-- 新增預設的本地 MCP 服務
INSERT INTO mcp_services (name, endpoint_url, description, owner) 
VALUES (
    '本地 MCP Server', 
    'http://localhost:8080', 
    '本地開發用 MCP 工具服務，提供各種開發和管理工具', 
    'system'
);

-- 新增範例 MCP 服務
INSERT INTO mcp_services (name, endpoint_url, description, owner) 
VALUES (
    'SFDA MCP Server', 
    'http://localhost:8081', 
    'SFDA 專用 MCP 服務，提供 HR、財務、任務管理等工具', 
    'admin'
);

-- ============================================
-- 4. 檢查修正結果
-- ============================================
SELECT 
    id,
    name,
    endpoint_url,
    description,
    is_active,
    owner,
    created_at
FROM mcp_services;

-- 顯示字符集資訊
SHOW FULL COLUMNS FROM mcp_services;
SHOW FULL COLUMNS FROM mcp_tools;

-- 顯示完成訊息
SELECT '✅ MCP 資料表字符集編碼修正完成！' AS message; 
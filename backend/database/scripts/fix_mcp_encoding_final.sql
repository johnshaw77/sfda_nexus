-- ============================================
-- 最終修正 MCP 資料表字符集編碼問題
-- 建立日期：2024-12-30
-- 說明：設定正確的字符集並重新插入資料
-- ============================================

-- 設定連線字符集
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET CHARACTER SET utf8mb4;

USE sfda_nexus;

-- ============================================
-- 1. 刪除現有資料
-- ============================================
DELETE FROM mcp_tools;
DELETE FROM mcp_services;

-- ============================================
-- 2. 重置 AUTO_INCREMENT
-- ============================================
ALTER TABLE mcp_services AUTO_INCREMENT = 1;
ALTER TABLE mcp_tools AUTO_INCREMENT = 1;

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

-- 顯示完成訊息
SELECT '✅ MCP 資料表字符集編碼最終修正完成！' AS message; 
-- 移除 quick_commands 表的 category 欄位
-- 執行日期: 2025-01-27

USE sfda_nexus;

-- 移除 category 欄位的索引
DROP INDEX idx_category ON quick_commands;

-- 移除 category 欄位
ALTER TABLE quick_commands DROP COLUMN category;

-- 檢查表結構
DESCRIBE quick_commands;

-- 顯示修改後的表結構
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'sfda_nexus' 
  AND TABLE_NAME = 'quick_commands'
ORDER BY ORDINAL_POSITION; 
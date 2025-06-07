-- 為 mcp_tools 表添加新字段以支持更豐富的工具信息
-- 執行時間：2025-06-07

USE sfda_nexus;

-- 添加版本字段
ALTER TABLE mcp_tools 
ADD COLUMN version VARCHAR(20) DEFAULT '1.0.0' COMMENT '工具版本號' AFTER description;

-- 添加緩存相關字段
ALTER TABLE mcp_tools 
ADD COLUMN cacheable TINYINT(1) DEFAULT 0 COMMENT '是否可緩存' AFTER input_schema;

ALTER TABLE mcp_tools 
ADD COLUMN cache_ttl INT DEFAULT 0 COMMENT '緩存時間（毫秒）' AFTER cacheable;

-- 添加統計信息字段
ALTER TABLE mcp_tools 
ADD COLUMN stats JSON DEFAULT NULL COMMENT '工具統計信息' AFTER cache_ttl;

-- 添加最後執行時間字段
ALTER TABLE mcp_tools 
ADD COLUMN last_executed_at DATETIME DEFAULT NULL COMMENT '最後執行時間' AFTER usage_count;

-- 添加執行成功次數字段
ALTER TABLE mcp_tools 
ADD COLUMN success_count INT DEFAULT 0 COMMENT '執行成功次數' AFTER last_executed_at;

-- 添加執行失敗次數字段
ALTER TABLE mcp_tools 
ADD COLUMN error_count INT DEFAULT 0 COMMENT '執行失敗次數' AFTER success_count;

-- 查看更新後的表結構
DESCRIBE mcp_tools; 
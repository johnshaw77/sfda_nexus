-- 為 ai_models 表添加 icon 欄位
-- 用於存儲模型圖標的路徑或名稱

USE sfda_nexus;

ALTER TABLE ai_models 
ADD COLUMN icon VARCHAR(200) DEFAULT NULL COMMENT '模型圖標路徑' 
AFTER description;

-- 為一些常見模型設置預設圖標
UPDATE ai_models SET icon = 'ollama.svg' WHERE model_type = 'ollama';
UPDATE ai_models SET icon = 'gemini.svg' WHERE model_type = 'gemini';
UPDATE ai_models SET icon = 'openai.svg' WHERE model_type = 'openai';
UPDATE ai_models SET icon = 'claude.svg' WHERE model_type = 'claude';

-- 查看更新結果
SELECT id, name, display_name, model_type, icon FROM ai_models; 
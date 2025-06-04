-- 修正 Gemini 模型中文編碼問題
-- 設定正確的字符集

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 修正 Gemini 2.5 Pro 預覽版的顯示名稱
UPDATE ai_models 
SET display_name = 'Gemini 2.5 Pro (預覽版)'
WHERE name = 'gemini-2-5-pro-preview';

-- 修正 Gemini 2.5 Flash 預覽版的顯示名稱  
UPDATE ai_models 
SET display_name = 'Gemini 2.5 Flash (預覽版 05-20)'
WHERE name = 'gemini-2-5-flash-preview';

-- 確保其他模型名稱正確
UPDATE ai_models 
SET display_name = 'Gemini 1.5 Flash'
WHERE name = 'gemini-1-5-flash';

UPDATE ai_models 
SET display_name = 'Gemini 1.5 Pro'
WHERE name = 'gemini-1-5-pro';

-- 檢查修正結果
SELECT 
  id,
  name,
  display_name,
  model_id,
  created_at
FROM ai_models 
WHERE model_type = 'gemini'
ORDER BY created_at DESC; 
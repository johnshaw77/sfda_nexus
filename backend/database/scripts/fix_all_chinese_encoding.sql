-- 修正所有 Gemini 模型的中文編碼問題
-- 包括 display_name 和 description 欄位

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 修正 Gemini 2.5 Pro 預覽版
UPDATE ai_models 
SET 
  display_name = 'Gemini 2.5 Pro (預覽版)',
  description = 'Google Gemini 2.5 Pro 預覽版模型，最新一代多模態大型語言模型，支援文字、圖像、音頻和視頻處理'
WHERE name = 'gemini-2-5-pro-preview';

-- 修正 Gemini 2.5 Flash 預覽版
UPDATE ai_models 
SET 
  display_name = 'Gemini 2.5 Flash (預覽版 05-20)',
  description = 'Google Gemini 2.5 Flash 預覽版模型，快速高效的多模態模型，適合實時對話和快速處理'
WHERE name = 'gemini-2-5-flash-preview';

-- 修正 Gemini 1.5 Flash
UPDATE ai_models 
SET 
  display_name = 'Gemini 1.5 Flash',
  description = 'Google Gemini 1.5 Flash 模型，快速響應的多模態模型，平衡了性能和效率'
WHERE name = 'gemini-1-5-flash';

-- 修正 Gemini 1.5 Pro
UPDATE ai_models 
SET 
  display_name = 'Gemini 1.5 Pro',
  description = 'Google Gemini 1.5 Pro 模型，高級多模態大型語言模型，擁有優秀的推理能力和廣泛的知識'
WHERE name = 'gemini-1-5-pro';

-- 檢查修正結果
SELECT 
  name,
  display_name,
  description,
  model_id
FROM ai_models 
WHERE model_type = 'gemini'
ORDER BY created_at DESC; 
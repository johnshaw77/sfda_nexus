-- 添加 Gemini 模型到資料庫
-- 包含：Gemini 2.5 Pro 預覽版、Gemini 2.5 Flash 預覽版、Gemini 1.5 Flash、Gemini 1.5 Pro

-- 設定正確的字符集以支援中文
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 添加 Gemini 2.5 Pro 預覽版
INSERT INTO ai_models (
  name,
  display_name,
  model_type,
  model_id,
  description,
  max_tokens,
  temperature,
  top_p,
  is_active,
  is_default,
  is_multimodal,
  capabilities
) VALUES (
  'gemini-2-5-pro-preview',
  'Gemini 2.5 Pro (預覽版)',
  'gemini',
  'gemini-2.5-pro-preview-05-06',
  'Google Gemini 2.5 Pro 預覽版模型，最新一代多模態大型語言模型，支援文字、圖像、音頻和視頻處理',
  1048576,
  0.7,
  0.9,
  TRUE,
  FALSE,
  TRUE,
  JSON_OBJECT(
    'streaming', true,
    'chat', true,
    'multimodal', true,
    'vision', true,
    'audio', true,
    'video', true,
    'context_window', 1048576,
    'reasoning', true
  )
) ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  description = VALUES(description),
  is_active = VALUES(is_active),
  capabilities = VALUES(capabilities);

-- 添加 Gemini 2.5 Flash 預覽版
INSERT INTO ai_models (
  name,
  display_name,
  model_type,
  model_id,
  description,
  max_tokens,
  temperature,
  top_p,
  is_active,
  is_default,
  is_multimodal,
  capabilities
) VALUES (
  'gemini-2-5-flash-preview',
  'Gemini 2.5 Flash (預覽版 05-20)',
  'gemini',
  'gemini-2.5-flash-preview-05-20',
  'Google Gemini 2.5 Flash 預覽版模型，快速高效的多模態模型，適合實時對話和快速處理',
  1048576,
  0.7,
  0.9,
  TRUE,
  FALSE,
  TRUE,
  JSON_OBJECT(
    'streaming', true,
    'chat', true,
    'multimodal', true,
    'vision', true,
    'fast_response', true,
    'context_window', 1048576,
    'real_time', true
  )
) ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  description = VALUES(description),
  is_active = VALUES(is_active),
  capabilities = VALUES(capabilities);

-- 添加 Gemini 1.5 Flash
INSERT INTO ai_models (
  name,
  display_name,
  model_type,
  model_id,
  description,
  max_tokens,
  temperature,
  top_p,
  is_active,
  is_default,
  is_multimodal,
  capabilities
) VALUES (
  'gemini-1-5-flash',
  'Gemini 1.5 Flash',
  'gemini',
  'gemini-1.5-flash',
  'Google Gemini 1.5 Flash 模型，快速響應的多模態模型，平衡了性能和效率',
  1048576,
  0.7,
  0.9,
  TRUE,
  FALSE,
  TRUE,
  JSON_OBJECT(
    'streaming', true,
    'chat', true,
    'multimodal', true,
    'vision', true,
    'fast_response', true,
    'context_window', 1048576
  )
) ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  description = VALUES(description),
  is_active = VALUES(is_active),
  capabilities = VALUES(capabilities);

-- 添加 Gemini 1.5 Pro
INSERT INTO ai_models (
  name,
  display_name,
  model_type,
  model_id,
  description,
  max_tokens,
  temperature,
  top_p,
  is_active,
  is_default,
  is_multimodal,
  capabilities
) VALUES (
  'gemini-1-5-pro',
  'Gemini 1.5 Pro',
  'gemini',
  'gemini-1.5-pro',
  'Google Gemini 1.5 Pro 模型，高級多模態大型語言模型，擁有優秀的推理能力和廣泛的知識',
  2097152,
  0.7,
  0.9,
  TRUE,
  FALSE,
  TRUE,
  JSON_OBJECT(
    'streaming', true,
    'chat', true,
    'multimodal', true,
    'vision', true,
    'reasoning', true,
    'context_window', 2097152,
    'advanced_capabilities', true
  )
) ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  description = VALUES(description),
  is_active = VALUES(is_active),
  capabilities = VALUES(capabilities);

-- 檢查插入結果
SELECT 
  name,
  display_name,
  model_type,
  model_id,
  is_active,
  is_default,
  is_multimodal,
  max_tokens
FROM ai_models 
WHERE model_id IN (
  'gemini-2.5-pro-preview-05-06',
  'gemini-2.5-flash-preview-05-20',
  'gemini-1.5-flash',
  'gemini-1.5-pro'
)
ORDER BY created_at DESC;

-- 顯示所有 Gemini 模型
SELECT 
  id,
  name,
  display_name,
  model_id,
  is_active,
  max_tokens,
  created_at
FROM ai_models 
WHERE model_type = 'gemini'
ORDER BY name; 
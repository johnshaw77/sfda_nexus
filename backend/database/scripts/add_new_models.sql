-- 添加新的 Ollama 模型
-- deepseek-r1:32b 和 gemma3:27b

-- 添加 deepseek-r1:32b 模型
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
  'deepseek-r1-32b',
  'DeepSeek R1 32B',
  'ollama',
  'deepseek-r1:32b',
  'DeepSeek R1 推理模型，32B 參數，專為複雜推理任務優化',
  8192,
  0.7,
  0.9,
  TRUE,
  FALSE,
  FALSE,
  JSON_OBJECT(
    'streaming', true,
    'reasoning', true,
    'context_window', 32768
  )
) ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  description = VALUES(description),
  is_active = VALUES(is_active);

-- 添加 gemma3:27b 模型
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
  'gemma3-27b',
  'Gemma 3 27B',
  'ollama',
  'gemma3:27b',
  'Google Gemma 3 模型，27B 參數，高性能語言模型',
  8192,
  0.7,
  0.9,
  TRUE,
  FALSE,
  FALSE,
  JSON_OBJECT(
    'streaming', true,
    'chat', true,
    'context_window', 32768
  )
) ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  description = VALUES(description),
  is_active = VALUES(is_active);

-- 檢查插入結果
SELECT 
  name,
  display_name,
  model_type,
  model_id,
  is_active,
  is_default
FROM ai_models 
WHERE model_id IN ('deepseek-r1:32b', 'gemma3:27b')
ORDER BY created_at DESC; 
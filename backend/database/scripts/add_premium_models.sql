-- 添加高級、中級、基礎模型到資料庫
-- 按照前端模型選擇器的分類需求

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ===========================================
-- 高級模型 (Premium Models)
-- ===========================================

-- Claude 4 Sonnet (虛擬模型，用於演示)
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
  'claude-4-sonnet',
  'Claude 4 Sonnet',
  'claude',
  'claude-4-sonnet-20241205',
  'Anthropic Claude 4 Sonnet，最新一代高性能推理模型',
  200000,
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
    'advanced_analysis', true,
    'context_window', 200000
  )
) ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  description = VALUES(description),
  capabilities = VALUES(capabilities);

-- Claude 4 Opus (虛擬模型，用於演示)
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
  'claude-4-opus',
  'Claude 4 Opus',
  'claude',
  'claude-4-opus-20241205',
  'Anthropic Claude 4 Opus，最強大的多模態大型語言模型',
  200000,
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
    'creative_writing', true,
    'advanced_analysis', true,
    'context_window', 200000
  )
) ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  description = VALUES(description),
  capabilities = VALUES(capabilities);

-- GPT-4o (更新為最新版本)
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
  'gpt-4o',
  'GPT-4o',
  'openai',
  'gpt-4o',
  'OpenAI GPT-4 Omni，多模態旗艦模型，支援文字、圖像、音頻處理',
  128000,
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
    'reasoning', true,
    'code_generation', true,
    'context_window', 128000
  )
) ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  description = VALUES(description),
  capabilities = VALUES(capabilities);

-- GPT-4.1 (虛擬模型，用於演示)
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
  'gpt-4-1',
  'GPT-4.1',
  'openai',
  'gpt-4.1',
  'OpenAI GPT-4.1，最新升級版本，增強推理和多模態能力',
  128000,
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
    'reasoning', true,
    'advanced_reasoning', true,
    'code_generation', true,
    'context_window', 128000
  )
) ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  description = VALUES(description),
  capabilities = VALUES(capabilities);

-- ===========================================
-- 中級模型 (Intermediate Models)
-- ===========================================

-- Claude 3.7 Sonnet (虛擬模型，用於演示)
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
  'claude-3-7-sonnet',
  'Claude 3.7 Sonnet',
  'claude',
  'claude-3-7-sonnet-20241001',
  'Anthropic Claude 3.7 Sonnet，平衡性能與效率的優秀模型',
  200000,
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
    'context_window', 200000
  )
) ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  description = VALUES(description),
  capabilities = VALUES(capabilities);

-- Claude 3.5 Sonnet V2
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
  'claude-3-5-sonnet-v2',
  'Claude 3.5 Sonnet V2',
  'claude',
  'claude-3-5-sonnet-20241022',
  'Anthropic Claude 3.5 Sonnet 第二版，改進的推理和視覺能力',
  200000,
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
    'context_window', 200000
  )
) ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  description = VALUES(description),
  capabilities = VALUES(capabilities);

-- ===========================================
-- 基礎模型 (Basic Models)
-- ===========================================

-- Llama 3.1 405B
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
  'llama-3-1-405b',
  'Llama 3.1 405B',
  'ollama',
  'llama3.1:405b',
  'Meta Llama 3.1 405B，開源大型語言模型',
  128000,
  0.7,
  0.9,
  TRUE,
  FALSE,
  FALSE,
  JSON_OBJECT(
    'streaming', true,
    'chat', true,
    'reasoning', true,
    'code_generation', true,
    'open_source', true,
    'context_window', 128000
  )
) ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  description = VALUES(description),
  capabilities = VALUES(capabilities);

-- Perplexity (作為 Ollama 部署模型)
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
  'perplexity',
  'Perplexity',
  'ollama',
  'perplexity:latest',
  'Perplexity AI 搜索增強語言模型',
  32000,
  0.7,
  0.9,
  TRUE,
  FALSE,
  FALSE,
  JSON_OBJECT(
    'streaming', true,
    'chat', true,
    'web_search', true,
    'fact_checking', true,
    'context_window', 32000
  )
) ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  description = VALUES(description),
  capabilities = VALUES(capabilities);

-- Grok 3 (作為 OpenAI 格式接入)
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
  'grok-3',
  'Grok 3',
  'openai',
  'grok-3',
  'xAI Grok 3，具有幽默感和實時信息的AI助手',
  128000,
  0.7,
  0.9,
  TRUE,
  FALSE,
  TRUE,
  JSON_OBJECT(
    'streaming', true,
    'chat', true,
    'humor', true,
    'real_time_info', true,
    'multimodal', true,
    'context_window', 128000
  )
) ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  description = VALUES(description),
  capabilities = VALUES(capabilities);

-- 檢查插入結果
SELECT 
  id,
  name,
  display_name,
  model_type,
  model_id,
  is_active,
  max_tokens,
  created_at
FROM ai_models 
WHERE name IN (
  'claude-4-sonnet', 'claude-4-opus', 'gpt-4o', 'gpt-4-1',
  'claude-3-7-sonnet', 'claude-3-5-sonnet-v2',
  'llama-3-1-405b', 'perplexity', 'grok-3'
)
ORDER BY 
  CASE model_type 
    WHEN 'claude' THEN 1
    WHEN 'openai' THEN 2
    WHEN 'ollama' THEN 3
    ELSE 4
  END,
  display_name;

-- 顯示按類型分組的模型統計
SELECT 
  model_type,
  COUNT(*) as model_count,
  SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active_count
FROM ai_models 
GROUP BY model_type
ORDER BY model_type; 
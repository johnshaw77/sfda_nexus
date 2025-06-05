-- 添加 Llava 視覺模型到資料庫
-- 支持圖片理解的 Ollama 模型

INSERT INTO ai_models (
    name, 
    display_name, 
    description,
    model_type, 
    model_id, 
    endpoint_url, 
    is_active, 
    is_default,
    is_multimodal,
    max_tokens,
    temperature,
    top_p
) VALUES (
    'llava',
    'Llava (視覺模型)',
    'Large Language and Vision Assistant - 支持圖片理解和分析的多模態模型',
    'ollama',
    'llava:latest',
    'http://localhost:11434',
    true,
    false,
    true,  -- 重要：支持多模態
    4096,
    0.70,
    0.90
)
ON DUPLICATE KEY UPDATE
    display_name = VALUES(display_name),
    is_multimodal = VALUES(is_multimodal),
    description = VALUES(description),
    is_active = VALUES(is_active);

-- 驗證插入結果
SELECT id, name, display_name, model_type, is_multimodal, is_active 
FROM ai_models 
WHERE model_type = 'ollama' 
ORDER BY id; 
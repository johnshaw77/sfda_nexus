-- 添加 create_chart 工具到統計分析服務
-- 執行前請確保統計分析服務存在 (ID: 49)

INSERT INTO mcp_tools (
    mcp_service_id,
    name,
    description,
    version,
    input_schema,
    cacheable,
    cache_ttl,
    stats,
    priority,
    usage_count,
    last_executed_at,
    success_count,
    error_count,
    is_enabled,
    is_deleted,
    created_at,
    updated_at
) VALUES (
    49, -- 統計分析服務 ID
    'create_chart',
    '創建各種類型的統計圖表，支援圓餅圖、長條圖、折線圖',
    '1.0.0',
    JSON_OBJECT(
        'type', 'object',
        'required', JSON_ARRAY('chart_type', 'data'),
        'properties', JSON_OBJECT(
            'chart_type', JSON_OBJECT(
                'type', 'string',
                'enum', JSON_ARRAY('pie', 'bar', 'line'),
                'description', '圖表類型：pie(圓餅圖)、bar(長條圖)、line(折線圖)'
            ),
            'data', JSON_OBJECT(
                'oneOf', JSON_ARRAY(
                    JSON_OBJECT(
                        'type', 'object',
                        'required', JSON_ARRAY('labels', 'values'),
                        'properties', JSON_OBJECT(
                            'labels', JSON_OBJECT(
                                'type', 'array',
                                'items', JSON_OBJECT('type', 'string'),
                                'description', '數據標籤陣列'
                            ),
                            'values', JSON_OBJECT(
                                'type', 'array',
                                'items', JSON_OBJECT('type', 'number'),
                                'description', '數據值陣列'
                            )
                        ),
                        'description', '簡化數據格式：標籤和數值分離'
                    ),
                    JSON_OBJECT(
                        'type', 'array',
                        'items', JSON_OBJECT(
                            'type', 'object',
                            'required', JSON_ARRAY('label', 'value'),
                            'properties', JSON_OBJECT(
                                'label', JSON_OBJECT('type', 'string'),
                                'value', JSON_OBJECT('type', 'number')
                            )
                        ),
                        'description', '完整數據格式：標籤值對陣列'
                    )
                )
            ),
            'title', JSON_OBJECT(
                'type', 'string',
                'description', '圖表標題（可選）'
            ),
            'description', JSON_OBJECT(
                'type', 'string',
                'description', '圖表描述（可選）'
            ),
            'config', JSON_OBJECT(
                'type', 'object',
                'properties', JSON_OBJECT(
                    'width', JSON_OBJECT('type', 'number', 'default', 400),
                    'height', JSON_OBJECT('type', 'number', 'default', 300),
                    'theme', JSON_OBJECT('type', 'string', 'default', 'default')
                ),
                'description', '圖表配置選項（可選）'
            )
        )
    ),
    0, -- cacheable
    0, -- cache_ttl
    NULL, -- stats
    1, -- priority
    0, -- usage_count
    NULL, -- last_executed_at
    0, -- success_count
    0, -- error_count
    1, -- is_enabled
    0, -- is_deleted
    NOW(), -- created_at
    NOW()  -- updated_at
);

-- 驗證插入結果
SELECT 
    id,
    name,
    description,
    version,
    is_enabled,
    created_at
FROM mcp_tools 
WHERE name = 'create_chart' 
AND mcp_service_id = 49; 
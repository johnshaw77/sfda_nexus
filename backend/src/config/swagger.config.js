/**
 * Swagger API文檔配置
 * 自動生成API文檔，支持交互式測試
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { appConfig } from './app.config.js';

// Swagger 配置選項
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'sfda_nexus API 文檔',
      version: '1.0.0',
      description: `
        企業AI聊天系統API文檔
        
        ## 功能概述
        - 用戶認證與授權管理
        - AI模型配置與管理  
        - 智能體角色定義
        - 聊天對話處理
        - 工作流自動化
        - 檔案上傳與管理
        - 系統管理功能
        
        ## 認證方式
        大部分API需要Bearer Token認證，請在Authorization標頭中包含有效的JWT token。
        
        ## 錯誤處理
        所有API響應都遵循統一的格式，包含success字段和標準化的錯誤碼。
      `,
      contact: {
        name: 'sfda_nexus 開發團隊',
        email: 'support@sfda-nexus.com',
        url: 'https://github.com/your-org/sfda_nexus'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: appConfig.server.apiBaseUrl || 'http://localhost:3000',
        description: '開發環境'
      },
      // 生產環境可以添加更多服務器
      // {
      //   url: 'https://api.your-domain.com',
      //   description: '生產環境'
      // }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Token 認證'
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API Key 認證'
        }
      },
      schemas: {
        // 通用響應模式
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
              description: '操作是否成功'
            },
            message: {
              type: 'string',
              example: '操作成功',
              description: '響應訊息'
            },
            data: {
              type: 'object',
              description: '響應數據'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: '響應時間戳'
            }
          }
        },
        
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
              description: '操作是否成功'
            },
            message: {
              type: 'string',
              example: '操作失敗',
              description: '錯誤訊息'
            },
            code: {
              type: 'string',
              example: 'VALIDATION_ERROR',
              description: '錯誤代碼'
            },
            details: {
              type: 'object',
              description: '錯誤詳情（僅在開發環境或驗證錯誤時提供）'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: '錯誤時間戳'
            },
            path: {
              type: 'string',
              example: '/api/users',
              description: '請求路徑'
            },
            method: {
              type: 'string',
              example: 'POST',
              description: 'HTTP方法'
            }
          }
        },
        
        PaginationResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: '查詢成功'
            },
            data: {
              type: 'array',
              items: {},
              description: '分頁數據'
            },
            meta: {
              type: 'object',
              properties: {
                pagination: {
                  type: 'object',
                  properties: {
                    page: {
                      type: 'integer',
                      example: 1,
                      description: '當前頁碼'
                    },
                    limit: {
                      type: 'integer',
                      example: 20,
                      description: '每頁數量'
                    },
                    total: {
                      type: 'integer',
                      example: 100,
                      description: '總記錄數'
                    },
                    totalPages: {
                      type: 'integer',
                      example: 5,
                      description: '總頁數'
                    },
                    hasNext: {
                      type: 'boolean',
                      example: true,
                      description: '是否有下一頁'
                    },
                    hasPrev: {
                      type: 'boolean',
                      example: false,
                      description: '是否有上一頁'
                    }
                  }
                }
              }
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        
        // 數據模型預留位置（將在各個模組中定義具體模型）
        User: {
          type: 'object',
          description: '用戶模型（待補充）'
        },
        
        Conversation: {
          type: 'object', 
          description: '對話模型（待補充）'
        },
        
        Message: {
          type: 'object',
          description: '訊息模型（待補充）'
        },
        
        Agent: {
          type: 'object',
          description: '智能體模型（待補充）'
        },
        
        AIModel: {
          type: 'object',
          description: 'AI模型（待補充）'
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: '用戶認證相關API'
      },
      {
        name: 'Chat',
        description: '聊天對話相關API'
      },
      {
        name: 'Models',
        description: 'AI模型管理API'
      },
      {
        name: 'Agents',
        description: '智能體管理API'
      },
      {
        name: 'Workflows',
        description: '工作流管理API'
      },
      {
        name: 'Users',
        description: '用戶管理API'
      },
      {
        name: 'Tools',
        description: '工具管理API'
      },
      {
        name: 'Admin',
        description: '系統管理API'
      },
      {
        name: 'System',
        description: '系統功能API'
      }
    ]
  },
  apis: [
    './src/routes/*.js',    // 掃描路由文件
    './src/docs/swagger/*.yaml' // 掃描YAML文檔
  ]
};

// 生成Swagger規範
const specs = swaggerJsdoc(options);

/**
 * 設置Swagger UI
 */
export const setupSwagger = (app) => {
  // Swagger UI 選項
  const swaggerUiOptions = {
    explorer: true,
    customCss: `
      .swagger-ui .topbar { 
        display: none; 
      }
      .swagger-ui .info .title {
        color: #1890ff;
      }
      .swagger-ui .scheme-container {
        background: #f6f6f6;
        padding: 20px;
        margin: 20px 0;
      }
    `,
    customSiteTitle: 'sfda_nexus API 文檔',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
      docExpansion: 'list'
    }
  };
  
  // 提供JSON格式的API文檔
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
  
  // 設置Swagger UI路由
  app.use('/api-docs', swaggerUi.serve);
  app.get('/api-docs', swaggerUi.setup(specs, swaggerUiOptions));
  
  // 替代的文檔路由
  app.use('/docs', swaggerUi.serve);
  app.get('/docs', swaggerUi.setup(specs, swaggerUiOptions));
};

/**
 * 獲取API規範
 */
export const getApiSpecs = () => specs;

/**
 * 驗證API文檔完整性
 */
export const validateApiDocs = () => {
  try {
    const requiredPaths = ['/api/auth', '/api/chat', '/api/models'];
    const specPaths = Object.keys(specs.paths || {});
    
    const missingPaths = requiredPaths.filter(path => 
      !specPaths.some(specPath => specPath.startsWith(path))
    );
    
    if (missingPaths.length > 0) {
      console.warn('⚠️ API文檔缺少以下路徑:', missingPaths);
    } else {
      console.log('✅ API文檔驗證通過');
    }
    
    return missingPaths.length === 0;
  } catch (error) {
    console.error('❌ API文檔驗證失敗:', error.message);
    return false;
  }
};

export default {
  setupSwagger,
  getApiSpecs,
  validateApiDocs,
  specs
}; 
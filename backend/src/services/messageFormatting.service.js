/**
 * 消息格式化服務
 * 處理消息格式化和附件整合
 */

import AttachmentService from './attachment.service.js';
import logger from '../utils/logger.util.js';

class MessageFormattingService {
  /**
   * 格式化上下文消息列表
   * @param {Array} contextMessages - 上下文消息列表
   * @param {string} modelType - AI模型類型
   * @returns {Array} 格式化後的消息列表
   */
  async formatContextMessages(contextMessages, modelType) {
    logger.debug(`格式化 ${contextMessages.length} 條上下文消息`, { modelType });

    return await Promise.all(
      contextMessages.map(async (msg) => {
        const formattedMessage = {
          role: msg.role,
          content: msg.content,
        };

        // 處理附件
        if (msg.attachments && msg.attachments.length > 0) {
          await this.processMessageAttachments(formattedMessage, msg.attachments, modelType);
        }

        return formattedMessage;
      })
    );
  }

  /**
   * 處理消息中的附件
   * @param {Object} formattedMessage - 格式化的消息對象
   * @param {Array} attachments - 附件列表
   * @param {string} modelType - AI模型類型
   */
  async processMessageAttachments(formattedMessage, attachments, modelType) {
    try {
      logger.debug(`處理消息附件`, {
        attachmentCount: attachments.length,
        modelType
      });

      // 使用 AttachmentService 處理附件
      const attachmentResult = await AttachmentService.processAttachments(attachments, modelType);

      // 整合附件內容到消息中
      AttachmentService.integrateAttachmentsToMessage(formattedMessage, attachmentResult);

      // 記錄處理結果
      if (attachmentResult.hasImages || attachmentResult.hasDocuments) {
        logger.debug(`附件處理完成`, {
          hasImages: attachmentResult.hasImages,
          hasDocuments: attachmentResult.hasDocuments,
          imageCount: attachmentResult.multimodalContents.length,
          documentCount: attachmentResult.textContents.length
        });
      }

    } catch (error) {
      logger.warn(`消息附件處理失敗`, {
        error: error.message,
        attachmentCount: attachments.length
      });
    }
  }

  /**
   * 創建系統消息
   * @param {string} systemPromptContent - 系統提示詞內容
   * @returns {Object} 系統消息對象
   */
  createSystemMessage(systemPromptContent) {
    if (!systemPromptContent) {
      return null;
    }

    return {
      role: "system",
      content: systemPromptContent,
    };
  }

  /**
   * 組裝最終的消息列表
   * @param {Array} contextMessages - 格式化的上下文消息
   * @param {string} systemPromptContent - 系統提示詞
   * @returns {Array} 最終的消息列表
   */
  assembleFinalMessages(contextMessages, systemPromptContent) {
    const messages = [...contextMessages];

    // 如果有系統提示詞，添加到消息開頭
    const systemMessage = this.createSystemMessage(systemPromptContent);
    if (systemMessage) {
      messages.unshift(systemMessage);
    }

    logger.debug(`組裝最終消息列表`, {
      totalMessages: messages.length,
      hasSystemPrompt: !!systemMessage
    });

    return messages;
  }
}

export default new MessageFormattingService(); 
/**
 * 知識庫管理資料模型
 * 整合 KESS 系統的分類、摘要、文檔數據
 */

import { kessQuery } from "../config/database.config.js";
import logger from "../utils/logger.util.js";

/**
 * 知識庫分類模型
 */
export class KnowledgeCategory {
  /**
   * 獲取所有活躍的分類
   * 使用 kess_category_statistics view 獲取分類統計信息
   */
  static async getActiveCategories() {
    try {
      const sql = `
        SELECT 
          category_code,
          category_name,
          total_documents,
          completed_documents,
          pending_documents,
          failed_documents,
          archived_documents,
          total_file_size,
          avg_word_count,
          total_summaries,
          avg_confidence_score
        FROM kess_category_statistics
        WHERE total_documents > 0
        ORDER BY category_name
      `;

      const { rows } = await kessQuery(sql);
      return rows;
    } catch (error) {
      logger.error("獲取活躍分類失敗:", error);
      throw error;
    }
  }

  /**
   * 根據分類代碼獲取分類詳情
   */
  static async getCategoryById(categoryCode) {
    try {
      const sql = `
        SELECT 
          category_code,
          category_name,
          total_documents,
          completed_documents,
          pending_documents,
          failed_documents,
          archived_documents,
          total_file_size,
          avg_word_count,
          total_summaries,
          avg_confidence_score
        FROM kess_category_statistics
        WHERE category_code = ?
      `;

      const { rows } = await kessQuery(sql, [categoryCode]);
      return rows[0];
    } catch (error) {
      logger.error("獲取分類詳情失敗:", error);
      throw error;
    }
  }
}

/**
 * 知識庫摘要模型
 */
export class KnowledgeSummary {
  /**
   * 根據分類獲取摘要列表
   * 使用 kess_document_summary_overview view 獲取完整信息
   */
  static async getSummariesByCategory(
    categoryCode,
    page = 1,
    limit = 20,
    search = ""
  ) {
    try {
      const offset = (page - 1) * limit;

      let sql = `
        SELECT 
          id,
          category_code,
          category_name,
          file_name,
          file_path,
          archive_path,
          file_size,
          word_count,
          processing_status,
          is_archived,
          document_created_at,
          summary_text,
          llm_provider,
          llm_model,
          processing_time_ms,
          confidence_score,
          summary_created_at
        FROM kess_document_summary_overview
        WHERE category_code = ?
      `;

      const params = [categoryCode];

      if (search) {
        sql += ` AND (file_name LIKE ? OR summary_text LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
      }

      sql += ` ORDER BY summary_created_at DESC LIMIT ${limit} OFFSET ${offset}`;

      const { rows } = await kessQuery(sql, params);
      return rows;
    } catch (error) {
      logger.error("獲取分類摘要列表失敗:", error);
      throw error;
    }
  }

  /**
   * 獲取摘要總數
   */
  static async getSummariesCountByCategory(categoryCode, search = "") {
    try {
      let sql = `
        SELECT COUNT(*) as total
        FROM kess_document_summary_overview
        WHERE category_code = ?
      `;

      const params = [categoryCode];

      if (search) {
        sql += ` AND (file_name LIKE ? OR summary_text LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
      }

      const { rows } = await kessQuery(sql, params);
      return rows[0].total;
    } catch (error) {
      logger.error("獲取摘要總數失敗:", error);
      throw error;
    }
  }

  /**
   * 根據ID獲取摘要詳情
   */
  static async getSummaryById(id) {
    try {
      const sql = `
        SELECT 
          id,
          category_code,
          category_name,
          file_name,
          file_path,
          archive_path,
          file_size,
          word_count,
          processing_status,
          is_archived,
          document_created_at,
          summary_text,
          llm_provider,
          llm_model,
          processing_time_ms,
          confidence_score,
          summary_created_at
        FROM kess_document_summary_overview
        WHERE id = ?
      `;

      const { rows } = await kessQuery(sql, [id]);
      return rows[0];
    } catch (error) {
      logger.error("獲取摘要詳情失敗:", error);
      throw error;
    }
  }

  /**
   * 搜索摘要
   */
  static async searchSummaries(keyword, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;

      const sql = `
        SELECT 
          id,
          category_code,
          category_name,
          file_name,
          file_path,
          archive_path,
          file_size,
          word_count,
          processing_status,
          is_archived,
          document_created_at,
          summary_text,
          llm_provider,
          llm_model,
          processing_time_ms,
          confidence_score,
          summary_created_at
        FROM kess_document_summary_overview
        WHERE file_name LIKE ? OR summary_text LIKE ?
        ORDER BY summary_created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const { rows } = await kessQuery(sql, [`%${keyword}%`, `%${keyword}%`]);
      return rows;
    } catch (error) {
      logger.error("搜索摘要失敗:", error);
      throw error;
    }
  }

  /**
   * 獲取搜索結果總數
   */
  static async getSearchCount(keyword) {
    try {
      const sql = `
        SELECT COUNT(*) as total
        FROM kess_document_summary_overview
        WHERE file_name LIKE ? OR summary_text LIKE ?
      `;

      const { rows } = await kessQuery(sql, [`%${keyword}%`, `%${keyword}%`]);
      return rows[0].total;
    } catch (error) {
      logger.error("獲取搜索總數失敗:", error);
      throw error;
    }
  }

  /**
   * 更新摘要
   */
  static async updateSummary(id, data) {
    try {
      const sql = `
        UPDATE kess_summaries 
        SET summary_text = ?, updated_at = NOW()
        WHERE id = ?
      `;

      const { rows } = await kessQuery(sql, [data.summary_text, id]);
      return rows.affectedRows > 0;
    } catch (error) {
      logger.error("更新摘要失敗:", error);
      throw error;
    }
  }

  /**
   * 刪除摘要
   */
  static async deleteSummary(id) {
    try {
      const sql = `DELETE FROM kess_summaries WHERE id = ?`;
      const { rows } = await kessQuery(sql, [id]);
      return rows.affectedRows > 0;
    } catch (error) {
      logger.error("刪除摘要失敗:", error);
      throw error;
    }
  }
}

/**
 * 知識庫文檔模型
 */
export class KnowledgeDocument {
  /**
   * 根據ID獲取文檔詳情
   */
  static async getDocumentById(id) {
    try {
      const sql = `
        SELECT 
          id,
          category_code,
          category_name,
          file_name,
          file_path,
          archive_path,
          file_size,
          word_count,
          processing_status,
          is_archived,
          document_created_at
        FROM kess_document_summary_overview
        WHERE id = ?
      `;

      const { rows } = await kessQuery(sql, [id]);
      return rows[0];
    } catch (error) {
      logger.error("獲取文檔詳情失敗:", error);
      throw error;
    }
  }

  /**
   * 根據文檔ID獲取所有摘要
   */
  static async getDocumentSummaries(documentId) {
    try {
      const sql = `
        SELECT 
          s.id,
          s.summary_text,
          s.llm_provider,
          s.llm_model,
          s.processing_time_ms,
          s.confidence_score,
          s.created_at
        FROM kess_summaries s
        WHERE s.document_id = ?
        ORDER BY s.created_at DESC
      `;

      const { rows } = await kessQuery(sql, [documentId]);
      return rows;
    } catch (error) {
      logger.error("獲取文檔摘要失敗:", error);
      throw error;
    }
  }
}

/**
 * 知識庫統計模型
 */
export class KnowledgeStats {
  /**
   * 獲取總體統計信息
   * 使用 kess_processing_statistics view
   */
  static async getOverviewStats() {
    try {
      const sql = `
        SELECT 
          SUM(total_documents) as total_documents,
          SUM(completed_documents) as completed_documents,
          SUM(pending_documents) as pending_documents,
          SUM(failed_documents) as failed_documents,
          SUM(archived_documents) as archived_documents,
          SUM(total_file_size) as total_file_size,
          AVG(avg_word_count) as avg_word_count,
          SUM(total_summaries) as total_summaries,
          AVG(avg_confidence_score) as avg_confidence_score
        FROM kess_category_statistics
      `;

      const { rows } = await kessQuery(sql);
      return rows[0];
    } catch (error) {
      logger.error("獲取總體統計失敗:", error);
      throw error;
    }
  }

  /**
   * 獲取分類統計信息
   */
  static async getCategoryStats() {
    try {
      const sql = `
        SELECT 
          category_code,
          category_name,
          total_documents,
          completed_documents,
          pending_documents,
          failed_documents,
          archived_documents,
          total_file_size,
          avg_word_count,
          total_summaries,
          avg_confidence_score
        FROM kess_category_statistics
        ORDER BY total_documents DESC
      `;

      const { rows } = await kessQuery(sql);
      return rows;
    } catch (error) {
      logger.error("獲取分類統計失敗:", error);
      throw error;
    }
  }
}

import logger from "../utils/logger.util.js";
import { query as dbQuery } from "../config/database.config.js";

/**
 * 全域提示詞服務
 * 管理所有智能體共同的行為規則和提示詞
 */
class GlobalPromptService {
  constructor() {
    // 全域規則配置
    this.globalRules = null;
    this.cacheExpiry = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 分鐘快取
  }

  /**
   * 獲取全域提示詞規則
   * @returns {Promise<string>} 全域提示詞
   */
  async getGlobalPromptRules() {
    try {
      // 檢查快取
      if (
        this.globalRules &&
        this.cacheExpiry &&
        Date.now() < this.cacheExpiry
      ) {
        logger.debug("使用快取的全域提示詞規則");
        return this.globalRules;
      }

      // 從資料庫載入全域規則
      const globalRules = await this.loadGlobalRulesFromDatabase();

      // 更新快取
      this.globalRules = globalRules;
      this.cacheExpiry = Date.now() + this.cacheTimeout;

      logger.info("全域提示詞規則載入完成", {
        rulesLength: globalRules.length,
        source: "database",
      });

      return globalRules;
    } catch (error) {
      logger.error("獲取全域提示詞規則失敗", {
        error: error.message,
      });
      return ""; // 降級處理
    }
  }

  /**
   * 從資料庫載入全域規則
   * @returns {Promise<string>} 全域規則內容
   */
  async loadGlobalRulesFromDatabase() {
    try {
      const sql = `
        SELECT config_value 
        FROM system_configs 
        WHERE config_key = 'global_prompt_rules'
        LIMIT 1
      `;

      const { rows } = await dbQuery(sql);

      if (rows && rows.length > 0) {
        logger.debug("從資料庫成功載入全域提示詞規則");
        return rows[0].config_value;
      } else {
        logger.warn("資料庫中未找到全域提示詞配置，使用預設規則");
        // 如果資料庫中沒有配置，使用預設規則
        return this.generateGlobalRules();
      }
    } catch (error) {
      logger.error("從資料庫載入全域規則失敗", {
        error: error.message,
      });
      // 降級處理：使用硬編碼的預設規則
      return this.generateGlobalRules();
    }
  }

  /**
   * 生成全域行為規則
   * @returns {string} 全域規則提示詞
   */
  generateGlobalRules() {
    const sections = [];

    // 🔒 核心行為規則
    sections.push("## 🔒 核心行為規則");
    sections.push("");
    sections.push("請嚴格遵守以下規則：");
    sections.push("");

    // 絕對禁止的行為
    sections.push("### 🚫 **絕對禁止的行為：**");
    sections.push("1. **絕對不可以編造、猜測或虛構任何數據**");
    sections.push(
      "   - 如果沒有工具返回的確實數據，明確說明「無法獲取相關資料」"
    );
    sections.push("   - 不可以基於假設或常識提供具體的數字、日期、人名等資訊");
    sections.push("");

    sections.push("2. **如果工具調用失敗，必須明確告知用戶**");
    sections.push("   - 清楚說明失敗原因（參數錯誤、系統問題、權限不足等）");
    sections.push("   - 提供可能的解決方案或替代方法");
    sections.push("");

    sections.push("3. **不可以對工具返回的數據進行任何假設性的補充**");
    sections.push("   - 只能基於工具實際返回的資料進行分析");
    sections.push("   - 不可以推測缺失的資料或填補空白資訊");
    sections.push("");

    sections.push("4. **不可以提供未經工具驗證的資訊**");
    sections.push("   - 所有具體資料都必須來自工具調用結果");
    sections.push("   - 不可以憑記憶或訓練資料提供具體的業務資訊");
    sections.push("");

    // 允許的行為
    sections.push("### ✅ **允許的行為：**");
    sections.push("1. **只能基於工具返回的真實數據進行回答**");
    sections.push("   - 可以整理、組織和格式化工具返回的資料");
    sections.push("   - 可以計算基於真實數據的統計結果");
    sections.push("");

    sections.push("2. **可以解釋和分析工具返回的結果**");
    sections.push("   - 提供數據的含義和背景說明");
    sections.push("   - 分析趨勢和模式（基於實際數據）");
    sections.push("");

    sections.push("3. **可以建議用戶使用其他相關工具**");
    sections.push("   - 推薦可能有用的工具來獲取更多資訊");
    sections.push("   - 說明不同工具的功能和適用場景");
    sections.push("");

    sections.push("4. **可以要求用戶提供更多資訊**");
    sections.push("   - 詢問必要的參數以進行工具調用");
    sections.push("   - 請求澄清模糊的需求");
    sections.push("");

    // 工具調用規範
    sections.push("### 🛠️ **工具調用規範：**");
    sections.push("1. **參數驗證**：調用工具前，確保所有參數格式正確");
    sections.push("2. **錯誤處理**：工具調用失敗時，向用戶說明原因和建議");
    sections.push("3. **結果確認**：明確區分成功和失敗的工具調用結果");
    sections.push("4. **透明度**：讓用戶知道你正在調用哪些工具以及為什麼");
    sections.push("");

    // 用戶體驗規範
    sections.push("### 🎯 **用戶體驗規範：**");
    sections.push("1. **清晰回應**：用簡潔明瞭的語言回答問題");
    sections.push("2. **結構化資訊**：使用標題、列表、表格等方式組織資訊");
    sections.push("3. **主動建議**：在適當時候提供相關的操作建議");
    sections.push("4. **確認理解**：對於複雜需求，確認理解用戶的意圖");
    sections.push("");

    // 安全與隱私
    sections.push("### 🔐 **安全與隱私：**");
    sections.push("1. **敏感資料**：不在工具調用中暴露敏感的個人資訊");
    sections.push("2. **權限檢查**：尊重工具的權限限制，不嘗試未授權的操作");
    sections.push("3. **資料保護**：不將工具返回的敏感資料用於其他目的");
    sections.push("");

    return sections.join("\n");
  }

  /**
   * 將全域規則整合到系統提示詞中
   * @param {string} basePrompt - 智能體的基礎提示詞
   * @returns {Promise<string>} 包含全域規則的完整提示詞
   */
  async integrateGlobalRules(basePrompt = "") {
    try {
      const globalRules = await this.getGlobalPromptRules();

      if (!globalRules) {
        return basePrompt;
      }

      if (!basePrompt) {
        return globalRules;
      }

      // 將全域規則放在最前面，確保優先級
      return `${globalRules}\n\n---\n\n${basePrompt}`;
    } catch (error) {
      logger.error("整合全域規則失敗", {
        error: error.message,
      });
      return basePrompt; // 降級處理
    }
  }

  /**
   * 清除快取
   */
  clearCache() {
    this.globalRules = null;
    this.cacheExpiry = null;
    logger.debug("全域提示詞快取已清除");
  }

  /**
   * 更新全域規則配置
   * @param {string} newRules - 新的規則內容
   * @returns {Promise<boolean>} 更新是否成功
   */
  async updateGlobalRules(newRules) {
    try {
      const sql = `
        UPDATE system_configs 
        SET config_value = ?, updated_at = NOW()
        WHERE config_key = 'global_prompt_rules'
      `;

      const { rows: result } = await dbQuery(sql, [newRules]);

      if (result.affectedRows > 0) {
        logger.info("全域規則更新成功", {
          rulesLength: newRules.length,
        });
        this.clearCache(); // 清除快取以強制重新載入
        return true;
      } else {
        logger.warn("全域規則更新失敗：未找到配置記錄");
        return false;
      }
    } catch (error) {
      logger.error("更新全域規則失敗", {
        error: error.message,
      });
      return false;
    }
  }

  /**
   * 獲取規則統計資訊
   * @returns {Object} 規則統計
   */
  getRulesStats() {
    return {
      cacheStatus: this.globalRules ? "cached" : "not_cached",
      cacheExpiry: this.cacheExpiry,
      rulesLength: this.globalRules ? this.globalRules.length : 0,
    };
  }
}

export default new GlobalPromptService();

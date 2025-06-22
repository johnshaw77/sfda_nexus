/**
 * 對話數據提取器
 * 從自然語言中識別和提取數據，用於圖表生成
 */
export class ConversationDataExtractor {
  constructor() {
    this.patterns = this.initializePatterns();
    this.keywords = this.initializeKeywords();
  }

  /**
   * 初始化匹配模式
   */
  initializePatterns() {
    return {
      // 百分比模式
      percentage: [
        // 匹配 "A:50%" 或 "A部門:50%" 或 "A部門 50%" 格式
        /([A-Za-z\u4e00-\u9fff]+(?:部門|部|組|科|處|課|團隊)?)\s*[：:]\s*(\d+(?:\.\d+)?)[%％]/g,
        // 匹配 "A 50%" 格式
        /([A-Za-z\u4e00-\u9fff]+(?:部門|部|組|科|處|課|團隊)?)\s+(\d+(?:\.\d+)?)[%％]/g,
        // 匹配 "50% A部門" 格式
        /(\d+(?:\.\d+)?)[%％]\s*([A-Za-z\u4e00-\u9fff]+(?:部門|部|組|科|處|課|團隊)?)/g,
        // 原來的通用模式（作為備用）
        /([^，。：（）\s]{1,10})[\s是占佔]?(\d+(?:\.\d+)?)[%％]/g,
      ],

      // 數字與單位模式
      numberWithUnit: [
        /([^，。：]+?)[\s是]?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(萬|千|百|億|元|台|個|人|次|件|項|分|點)/g,
        /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(萬|千|百|億|元|台|個|人|次|件|項|分|點)[\s是的]?([^，。：]+)/g,
      ],

      // 冒號分隔模式
      colonSeparated: [
        /([^：，。]+?)[\s]*[:：][\s]*(\d+(?:,\d{3})*(?:\.\d+)?)[\s]*(萬|千|百|億|元|台|個|人|次|件|項|分|點|%％)?/g,
      ],

      // 月份/季度數據模式
      timeData: [
        /(\d{1,2}月|\d+季度?|Q\d)[\s]*[:：]?[\s]*(\d+(?:,\d{3})*(?:\.\d+)?)/g,
        /(\d{4}年\d{1,2}月|\d{4}-\d{1,2})[\s]*[:：]?[\s]*(\d+(?:,\d{3})*(?:\.\d+)?)/g,
      ],

      // 比較模式
      comparison: [
        /([^，。]+?)(\d+(?:,\d{3})*(?:\.\d+)?)[，\s]*([^，。]+?)(\d+(?:,\d{3})*(?:\.\d+)?)/g,
      ],

      // 表格式數據
      tablePattern: [
        /^\s*([^：\t]+?)[\s]*[:：\t][\s]*(\d+(?:,\d{3})*(?:\.\d+)?)/gm,
      ],
    };
  }

  /**
   * 初始化關鍵詞
   */
  initializeKeywords() {
    return {
      chartTypes: {
        柱狀圖: "bar",
        長條圖: "bar",
        條形圖: "bar",
        餅圖: "pie",
        圓餅圖: "pie",
        折線圖: "line",
        曲線圖: "line",
        散點圖: "scatter",
        散佈圖: "scatter",
        雷達圖: "radar",
        蜘蛛圖: "radar",
      },

      dataTypes: {
        銷售: "sales",
        營收: "revenue",
        收入: "revenue",
        業績: "performance",
        用戶: "users",
        人數: "people",
        數量: "quantity",
        比例: "ratio",
        佔比: "ratio",
        分布: "distribution",
      },

      timeUnits: {
        月: "month",
        季: "quarter",
        年: "year",
        週: "week",
        日: "day",
      },

      units: {
        萬: 10000,
        千: 1000,
        百: 100,
        億: 100000000,
        元: 1,
        台: 1,
        個: 1,
        人: 1,
        次: 1,
        件: 1,
        項: 1,
        分: 1,
        點: 1,
      },
    };
  }

  /**
   * 主要提取方法
   * @param {string} text - 輸入文字
   * @returns {Object} 提取結果
   */
  extractData(text) {
    console.log("🔍 [ConversationDataExtractor] extractData 開始:", {
      textLength: text?.length,
      textPreview: text?.substring(0, 200),
      textType: typeof text,
    });

    const result = {
      success: false,
      data: null,
      chartType: "auto",
      suggestions: [],
      metadata: {
        source: "conversation",
        extractedAt: Date.now(),
        originalText: text,
      },
    };

    try {
      // 檢測圖表類型意圖
      const chartTypeIntent = this.detectChartTypeIntent(text);
      console.log("🔍 [extractData] 圖表類型檢測結果:", chartTypeIntent);
      if (chartTypeIntent) {
        result.chartType = chartTypeIntent;
      }

      // 嘗試不同的提取方法 (按優先級排序)
      const extractors = [
        {
          name: "listPercentage",
          fn: () => this.extractListPercentageData(text),
        }, // 🎯 新增：處理列表式百分比
        { name: "percentage", fn: () => this.extractPercentageData(text) },
        {
          name: "colonSeparated",
          fn: () => this.extractColonSeparatedData(text),
        },
        { name: "timeSeries", fn: () => this.extractTimeSeriesData(text) },
        { name: "comparison", fn: () => this.extractComparisonData(text) },
        { name: "table", fn: () => this.extractTableData(text) },
        {
          name: "numberWithUnit",
          fn: () => this.extractNumberWithUnitData(text),
        },
      ];

      for (const extractor of extractors) {
        const extracted = extractor.fn();
        console.log(`🔍 [extractData] 嘗試 ${extractor.name} 提取器:`, {
          hasResult: !!extracted,
          resultLength: extracted?.length,
          result: extracted,
        });

        if (extracted && extracted.length > 0) {
          const processedData = this.processExtractedData(extracted);
          console.log(`🔍 [extractData] ${extractor.name} 處理結果:`, {
            hasProcessedData: !!processedData,
            processedData,
          });

          if (processedData) {
            result.success = true;
            result.data = processedData;
            result.suggestions = this.generateSuggestions(
              result.data,
              result.chartType
            );
            console.log(`✅ [extractData] 使用 ${extractor.name} 提取器成功`);
            break;
          }
        }
      }

      // 如果沒有提取到數據，嘗試簡單的數字提取
      if (!result.success) {
        const simpleNumbers = this.extractSimpleNumbers(text);
        if (simpleNumbers && simpleNumbers.length > 0) {
          result.success = true;
          result.data = simpleNumbers;
          result.suggestions = this.generateSuggestions(
            result.data,
            result.chartType
          );
        }
      }
    } catch (error) {
      result.error = error.message;
    }

    return result;
  }

  /**
   * 檢測圖表類型意圖
   * @param {string} text - 輸入文字
   * @returns {string|null} 圖表類型
   */
  detectChartTypeIntent(text) {
    for (const [keyword, type] of Object.entries(this.keywords.chartTypes)) {
      if (text.includes(keyword)) {
        return type;
      }
    }

    // 基於內容推測
    if (
      text.includes("趨勢") ||
      text.includes("變化") ||
      text.includes("時間")
    ) {
      return "line";
    }

    if (
      text.includes("比例") ||
      text.includes("佔比") ||
      text.includes("分布")
    ) {
      return "pie";
    }

    if (text.includes("比較") || text.includes("對比")) {
      return "bar";
    }

    return null;
  }

  /**
   * 提取列表式百分比數據
   * 處理 "A、B、C 三類別的佔比為 50%、30%、20%" 這種格式
   * @param {string} text - 輸入文字
   * @returns {Array} 提取的數據
   */
  extractListPercentageData(text) {
    console.log("🔍 [extractListPercentageData] 開始分析:", text);

    // 🎯 全新的分步驟解析方法
    // 第一步：尋找包含百分比數值的部分
    const percentagePattern =
      /(\d+(?:\.\d+)?[%％](?:[、，,]\s*\d+(?:\.\d+)?[%％])*)/;
    const percentageMatch = text.match(percentagePattern);

    if (!percentageMatch) {
      console.log("🔍 [extractListPercentageData] 未找到百分比數據");
      return [];
    }

    // 提取所有百分比數值
    const valuesStr = percentageMatch[1];
    const valueMatches = valuesStr.match(/\d+(?:\.\d+)?/g);

    if (!valueMatches || valueMatches.length < 2) {
      console.log("🔍 [extractListPercentageData] 百分比數值不足");
      return [];
    }

    console.log("🔍 [extractListPercentageData] 找到數值:", valueMatches);

    // 第二步：在百分比數據前面尋找名稱列表
    const beforePercentage = text.substring(
      0,
      text.indexOf(percentageMatch[0])
    );
    console.log(
      "🔍 [extractListPercentageData] 百分比前的文本:",
      beforePercentage
    );

    // 尋找名稱列表（A、B、C 或 產品A、產品B、產品C 等）
    const namePattern =
      /([A-Za-z\u4e00-\u9fff]+[、，,]\s*[A-Za-z\u4e00-\u9fff]+(?:[、，,]\s*[A-Za-z\u4e00-\u9fff]+)*)/;
    const nameMatch = beforePercentage.match(namePattern);

    if (!nameMatch) {
      console.log("🔍 [extractListPercentageData] 未找到名稱列表");
      return [];
    }

    // 提取並清理名稱
    const namesStr = nameMatch[1];
    let names = namesStr
      .split(/[、，,]/)
      .map((name) => name.trim())
      .filter((name) => name && name.length > 0);

    console.log("🔍 [extractListPercentageData] 解析結果:", {
      beforePercentage,
      namesStr,
      extractedNames: names,
      valueMatches,
      namesCount: names.length,
      valuesCount: valueMatches.length,
    });

    // 檢查名稱和數值數量是否匹配
    if (names.length !== valueMatches.length) {
      console.log("❌ [extractListPercentageData] 名稱和數值數量不匹配");
      return [];
    }

    // 生成結果
    const results = [];
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const value = parseFloat(valueMatches[i]);

      if (name && !isNaN(value)) {
        results.push({
          name: name,
          value: value,
          unit: "%",
          originalMatch: `${name}:${value}%`,
        });
        console.log("✅ [extractListPercentageData] 提取項目:", {
          name,
          value,
        });
      }
    }

    console.log("🔍 [extractListPercentageData] 最終結果:", results);
    return results;
  }

  /**
   * 提取百分比數據
   * @param {string} text - 輸入文字
   * @returns {Array} 提取的數據
   */
  extractPercentageData(text) {
    const results = [];

    this.patterns.percentage.forEach((pattern, index) => {
      console.log(`🔍 [extractPercentageData] 使用模式 ${index}:`, pattern);
      let match;
      while ((match = pattern.exec(text)) !== null) {
        console.log(`🔍 [extractPercentageData] 匹配結果:`, {
          fullMatch: match[0],
          groups: match.slice(1),
          match1: match[1],
          match2: match[2],
          match3: match[3],
        });

        let name, value;

        // 檢查是否為 "數字% 名稱" 格式（模式 2）
        if (index === 2 && match[1] && match[2]) {
          // 第三個模式：數字在前，名稱在後
          value = match[1];
          name = match[2];
        } else {
          // 其他模式：名稱在前，數字在後
          name = match[1];
          value = match[2];
        }

        const parsedValue = parseFloat(value);

        console.log(`🔍 [extractPercentageData] 解析結果:`, {
          patternIndex: index,
          originalName: name,
          originalValue: value,
          trimmedName: name?.trim(),
          parsedValue,
          isValidValue: !isNaN(parsedValue),
        });

        if (name && value && !isNaN(parsedValue)) {
          results.push({
            name: name.trim(),
            value: parsedValue,
            unit: "%",
            originalMatch: match[0],
          });
        }
      }
    });

    return results;
  }

  /**
   * 提取數字與單位數據
   * @param {string} text - 輸入文字
   * @returns {Array} 提取的數據
   */
  extractNumberWithUnitData(text) {
    const results = [];

    this.patterns.numberWithUnit.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match.length >= 4) {
          const [, name, value, unit] = match;
          if (name && value) {
            const numericValue = this.parseNumber(value, unit);
            results.push({
              name: name.trim(),
              value: numericValue,
              unit: unit,
              originalMatch: match[0],
            });
          }
        }
      }
    });

    return results;
  }

  /**
   * 提取冒號分隔數據
   * @param {string} text - 輸入文字
   * @returns {Array} 提取的數據
   */
  extractColonSeparatedData(text) {
    const results = [];

    console.log(`🔍 [extractColonSeparatedData] 輸入文字:`, text);

    // 檢查是否是「標題: 項目1 數值1, 項目2 數值2」格式
    const complexPattern = /^(.+?)[:：]\s*(.+)$/;
    const match = text.match(complexPattern);

    console.log(`🔍 [extractColonSeparatedData] 複雜模式匹配:`, {
      hasMatch: !!match,
      match: match,
    });

    if (match) {
      const [, title, dataString] = match;
      console.log(`🔍 [extractColonSeparatedData] 分解結果:`, {
        title,
        dataString,
      });

      // 解析逗號分隔的數據部分
      const dataItems = dataString.split(/[,，]/);
      console.log(`🔍 [extractColonSeparatedData] 分割後的項目:`, dataItems);

      for (const item of dataItems) {
        const trimmedItem = item.trim();
        console.log(`🔍 [extractColonSeparatedData] 處理項目:`, trimmedItem);

        // 匹配「部門名稱 數字單位」格式，支援複合單位如「萬元」
        const itemPattern =
          /^(.+?)\s+(\d+(?:,\d{3})*(?:\.\d+)?)\s*(萬|千|百|億)?(元|台|個|人|次|件|項|分|點)?$/;
        const itemMatch = trimmedItem.match(itemPattern);

        console.log(`🔍 [extractColonSeparatedData] 項目匹配:`, {
          item: trimmedItem,
          hasMatch: !!itemMatch,
          match: itemMatch,
        });

        if (itemMatch) {
          const [, name, value, majorUnit, minorUnit] = itemMatch;
          // 處理複合單位，如「萬元」
          const unit = (majorUnit || "") + (minorUnit || "");
          const numericValue = this.parseNumber(value, majorUnit || "");
          console.log(`🔍 [extractColonSeparatedData] 成功提取:`, {
            name: name.trim(),
            value,
            majorUnit,
            minorUnit,
            unit,
            numericValue,
          });
          results.push({
            name: name.trim(),
            value: numericValue,
            unit: unit || "",
            originalMatch: trimmedItem,
          });
        }
      }
    }

    // 如果上面的模式沒有匹配到，使用原來的模式
    if (results.length === 0) {
      this.patterns.colonSeparated.forEach((pattern) => {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          const [, name, value, unit] = match;
          if (name && value) {
            const numericValue = this.parseNumber(value, unit);
            results.push({
              name: name.trim(),
              value: numericValue,
              unit: unit || "",
              originalMatch: match[0],
            });
          }
        }
      });
    }

    return results;
  }

  /**
   * 提取時間序列數據
   * @param {string} text - 輸入文字
   * @returns {Array} 提取的數據
   */
  extractTimeSeriesData(text) {
    const results = [];

    this.patterns.timeData.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const [, time, value] = match;
        if (time && value) {
          results.push({
            name: time.trim(),
            value: this.parseNumber(value),
            type: "time-series",
            originalMatch: match[0],
          });
        }
      }
    });

    return results;
  }

  /**
   * 提取比較數據
   * @param {string} text - 輸入文字
   * @returns {Array} 提取的數據
   */
  extractComparisonData(text) {
    const results = [];

    this.patterns.comparison.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const [, name1, value1, name2, value2] = match;
        if (name1 && value1 && name2 && value2) {
          results.push(
            {
              name: name1.trim(),
              value: this.parseNumber(value1),
              originalMatch: match[0],
            },
            {
              name: name2.trim(),
              value: this.parseNumber(value2),
              originalMatch: match[0],
            }
          );
        }
      }
    });

    return results;
  }

  /**
   * 提取表格式數據
   * @param {string} text - 輸入文字
   * @returns {Array} 提取的數據
   */
  extractTableData(text) {
    const results = [];

    this.patterns.tablePattern.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const [, name, value] = match;
        if (name && value) {
          results.push({
            name: name.trim(),
            value: this.parseNumber(value),
            originalMatch: match[0],
          });
        }
      }
    });

    return results;
  }

  /**
   * 提取簡單數字
   * @param {string} text - 輸入文字
   * @returns {Array} 提取的數據
   */
  extractSimpleNumbers(text) {
    const results = [];

    // 嘗試提取所有數字
    const numberPattern = /(\d+(?:,\d{3})*(?:\.\d+)?)/g;
    const numbers = [];
    let match;

    while ((match = numberPattern.exec(text)) !== null) {
      numbers.push(parseFloat(match[1].replace(/,/g, "")));
    }

    // 如果有多個數字，嘗試創建簡單數據集
    if (numbers.length >= 2) {
      numbers.forEach((num, index) => {
        results.push({
          name: `項目 ${index + 1}`,
          value: num,
          generated: true,
        });
      });
    }

    return results;
  }

  /**
   * 解析數字（處理單位轉換）
   * @param {string} value - 數值字符串
   * @param {string} unit - 單位
   * @returns {number} 轉換後的數值
   */
  parseNumber(value, unit = "") {
    // 移除逗號分隔符
    const cleanValue = value.replace(/,/g, "");
    let number = parseFloat(cleanValue);

    if (isNaN(number)) {
      return 0;
    }

    // 單位轉換
    if (unit && this.keywords.units[unit]) {
      number *= this.keywords.units[unit];
    }

    return number;
  }

  /**
   * 處理提取的數據
   * @param {Array} extractedData - 提取的原始數據
   * @returns {Array|Object} 處理後的數據
   */
  processExtractedData(extractedData) {
    console.log(`🔍 [processExtractedData] 輸入數據:`, extractedData);

    if (!extractedData || extractedData.length === 0) {
      console.log(`❌ [processExtractedData] 數據為空`);
      return null;
    }

    // 去重（基於名稱）
    const uniqueData = [];
    const nameSet = new Set();

    extractedData.forEach((item) => {
      console.log(`🔍 [processExtractedData] 處理項目:`, item);

      // 清理名稱：移除前後的標點符號和空白
      let cleanName = item.name?.toString().trim();
      if (cleanName) {
        cleanName = cleanName.replace(/^[、，,\s]+|[、，,\s]+$/g, ""); // 移除開頭和結尾的標點
        cleanName = cleanName.replace(/^\d+$/, ""); // 移除純數字的名稱
      }

      // 🎯 增強的數據過濾邏輯
      const isValidName =
        cleanName &&
        cleanName.length > 0 &&
        !/^\d+$/.test(cleanName) &&
        !cleanName.includes("、") && // 過濾包含頓號的名稱
        !cleanName.includes("：") && // 過濾包含冒號的名稱
        !cleanName.includes(":") && // 過濾包含英文冒號的名稱
        !cleanName.includes("%") && // 過濾包含百分號的名稱
        !/^[、，,\s：:]+/.test(cleanName); // 過濾以標點符號開頭的名稱

      const isValidValue =
        typeof item.value === "number" && !isNaN(item.value) && item.value > 0; // 🎯 過濾掉值為 0 的項目

      // 🎯 過濾掉明顯的總和或匯總項目
      const isSummaryItem = /總和|合計|總計|總額|小計/.test(cleanName);

      if (
        isValidName &&
        isValidValue &&
        !isSummaryItem &&
        !nameSet.has(cleanName)
      ) {
        nameSet.add(cleanName);
        uniqueData.push({
          name: cleanName,
          value: item.value,
          unit: item.unit || "",
        });
      } else {
        console.log(`🔍 [processExtractedData] 過濾項目:`, {
          cleanName,
          isValidName,
          isValidValue,
          isSummaryItem,
          reason: !isValidName
            ? "invalid name"
            : !isValidValue
              ? "invalid value"
              : isSummaryItem
                ? "summary item"
                : "duplicate",
        });
      }
    });

    console.log(`🔍 [processExtractedData] 去重後數據:`, uniqueData);

    // 如果只有鍵值對，轉換為對象格式
    if (
      uniqueData.length <= 8 &&
      uniqueData.every((item) => item.name && typeof item.value === "number")
    ) {
      const objData = {};
      uniqueData.forEach((item) => {
        objData[item.name] = item.value;
      });
      console.log(`✅ [processExtractedData] 轉換為對象格式:`, objData);
      return objData;
    }

    console.log(`✅ [processExtractedData] 返回數組格式:`, uniqueData);
    return uniqueData;
  }

  /**
   * 生成建議
   * @param {Array|Object} data - 處理後的數據
   * @param {string} chartType - 圖表類型
   * @returns {Array} 建議陣列
   */
  generateSuggestions(data, chartType) {
    const suggestions = [];

    if (!data) return suggestions;

    const dataArray = Array.isArray(data)
      ? data
      : Object.entries(data).map(([k, v]) => ({ name: k, value: v }));
    const hasPercentages = dataArray.some(
      (item) => item.unit === "%" || (item.value <= 1 && item.value >= 0)
    );

    // 基於數據特徵的建議
    if (hasPercentages) {
      suggestions.push({
        type: "chart",
        chartType: "pie",
        title: "比例分析",
        description: "使用餅圖展示各項佔比",
        confidence: 0.9,
      });
    }

    if (dataArray.length >= 3 && dataArray.length <= 10) {
      suggestions.push({
        type: "chart",
        chartType: "bar",
        title: "數值比較",
        description: "使用柱狀圖比較各項數值",
        confidence: 0.8,
      });
    }

    if (dataArray.some((item) => item.type === "time-series")) {
      suggestions.push({
        type: "chart",
        chartType: "line",
        title: "時間趨勢",
        description: "使用折線圖展示時間趨勢",
        confidence: 0.95,
      });
    }

    // 如果用戶明確指定了圖表類型，優先推薦
    if (chartType && chartType !== "auto") {
      suggestions.unshift({
        type: "chart",
        chartType: chartType,
        title: "用戶指定圖表",
        description: `按用戶要求生成 ${chartType} 圖表`,
        confidence: 1.0,
      });
    }

    return suggestions;
  }

  /**
   * 提取多個數據集
   * @param {string} text - 輸入文字
   * @returns {Object} 包含多個數據集的結果
   */
  extractMultipleDataSets(text) {
    const singleResult = this.extractData(text);

    if (!singleResult.success) {
      return {
        success: false,
        datasets: [],
        confidence: 0,
        error: singleResult.error || "無法提取數據",
      };
    }

    // 將單個結果包裝為數據集格式
    const dataset = {
      data: singleResult.data,
      title: this.generateTitle(text, singleResult.data),
      description: "從對話中提取的數據",
      confidence: this.calculateConfidence(singleResult.data, text),
      metadata: {
        ...singleResult.metadata,
        extractionMethod: "conversation",
      },
    };

    return {
      success: true,
      datasets: [dataset],
      confidence: dataset.confidence,
      metadata: {
        totalDatasets: 1,
        source: "conversation",
        extractedAt: Date.now(),
      },
    };
  }

  /**
   * 生成數據集標題
   * @param {string} text - 原始文字
   * @param {Array} data - 提取的數據
   * @returns {string} 標題
   */
  generateTitle(text, data) {
    // 嘗試從文字中提取上下文作為標題
    const lines = text.split(/[\n。！？]/).filter((line) => line.trim());

    for (const line of lines) {
      if (line.length < 50 && line.length > 5) {
        // 查找包含數據關鍵詞的行
        if (/銷售|營收|數據|統計|分析|報告/.test(line)) {
          return line.trim();
        }
      }
    }

    // 基於數據內容生成標題
    if (data && (Array.isArray(data) || typeof data === "object")) {
      const dataArray = Array.isArray(data) ? data : Object.keys(data);
      const hasTime = dataArray.some((item) => {
        const label = typeof item === "object" ? item.name : item;
        return /月|季|年|週|日/.test(label);
      });
      const hasPercentage = text.includes("%") || text.includes("％");

      if (hasTime) return "時間序列數據";
      if (hasPercentage) return "比例分布數據";
      return "數據統計";
    }

    return "對話數據";
  }

  /**
   * 計算提取信心度
   * @param {Array|Object} data - 提取的數據
   * @param {string} text - 原始文字
   * @returns {number} 信心度 (0-1)
   */
  calculateConfidence(data, text) {
    let confidence = 0.5; // 基礎信心度

    if (!data) return 0.1;

    // 轉換為數組進行分析
    const dataArray = Array.isArray(data)
      ? data
      : Object.entries(data).map(([k, v]) => ({ name: k, value: v }));

    // 數據點數量加分
    if (dataArray.length >= 3) confidence += 0.2;
    if (dataArray.length >= 5) confidence += 0.1;

    // 數據規律性加分
    const hasConsistentLabels = dataArray.every((item) => {
      const name = item.name || item.label || "";
      return name && typeof name === "string" && name.length > 0;
    });
    if (hasConsistentLabels) confidence += 0.1;

    // 數值合理性加分
    const hasReasonableValues = dataArray.every((item) => {
      const value = item.value || item;
      return typeof value === "number" && value >= 0;
    });
    if (hasReasonableValues) confidence += 0.1;

    // 文字結構化程度加分
    if (text.includes(":") || text.includes("：")) confidence += 0.05;
    if (text.includes("\n")) confidence += 0.05;

    return Math.min(confidence, 0.95); // 最高95%信心度
  }

  /**
   * 驗證提取結果
   * @param {Object} result - 提取結果
   * @returns {Object} 驗證後的結果
   */
  validateResult(result) {
    if (!result.success || !result.data) {
      return {
        ...result,
        valid: false,
        validationErrors: ["無法從文字中提取有效數據"],
      };
    }

    const validationErrors = [];

    // 檢查數據完整性
    const dataArray = Array.isArray(result.data)
      ? result.data
      : Object.entries(result.data).map(([k, v]) => ({ name: k, value: v }));

    if (dataArray.length < 2) {
      validationErrors.push("數據點過少，至少需要2個數據點才能生成圖表");
    }

    // 檢查數值有效性
    const invalidValues = dataArray.filter(
      (item) => typeof item.value !== "number" || isNaN(item.value)
    );

    if (invalidValues.length > 0) {
      validationErrors.push(`發現 ${invalidValues.length} 個無效數值`);
    }

    return {
      ...result,
      valid: validationErrors.length === 0,
      validationErrors,
    };
  }
}

// 創建單例實例
export const conversationDataExtractor = new ConversationDataExtractor();

// 便捷方法
export const extractConversationData = (text) => {
  const result = conversationDataExtractor.extractData(text);
  return conversationDataExtractor.validateResult(result);
};

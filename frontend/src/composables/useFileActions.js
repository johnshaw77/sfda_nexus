import { nextTick } from 'vue';

/**
 * 檔案操作相關的 composable
 * 提取自 ChatArea.vue 的檔案操作邏輯
 */
export function useFileActions() {

  /**
   * 設置焦點到輸入框
   */
  const setFocusToInput = () => {
    nextTick(() => {
      const messageInput = document.querySelector('.message-input textarea');
      if (messageInput) {
        messageInput.focus();
        // 將游標移到文字末尾
        messageInput.setSelectionRange(
          messageInput.value.length,
          messageInput.value.length
        );
      }
    });
  };

  /**
   * 添加文字到輸入框
   */
  const addTextToInput = (text, currentText) => {
    if (currentText.trim()) {
      return currentText + '\n\n' + text;
    } else {
      return text;
    }
  };

  /**
   * 圖片操作處理函數
   */
  const handleExplainImage = (file) => {
    const explainText = '請解釋這張圖片的內容';
    return { action: 'add-text', text: explainText };
  };

  /**
   * PDF 專用處理函數
   */
  const handleExtractPdfText = (file) => {
    const extractText = `請提取這個 PDF 檔案中的所有文字內容：${file.filename}`;
    return { action: 'add-text', text: extractText };
  };

  const handleSummarizePdf = (file) => {
    const summarizeText = `請分析並總結這個 PDF 文件的主要內容和重點：${file.filename}`;
    return { action: 'add-text', text: summarizeText };
  };

  /**
   * Word 專用處理函數
   */
  const handleAnalyzeDocument = (file) => {
    const analyzeText = `請深度分析這個 Word 文檔的結構、內容和重點：${file.filename}`;
    return { action: 'add-text', text: analyzeText };
  };

  const handleFormatDocument = (file) => {
    const formatText = `請整理這個 Word 文檔的格式，提供標準化的排版建議：${file.filename}`;
    return { action: 'add-text', text: formatText };
  };

  /**
   * CSV 專用處理函數
   */
  const handleAnalyzeCsvData = (file) => {
    const analyzeText = `請分析這個 CSV 檔案中的數據，提供統計摘要和洞察：${file.filename}`;
    return { action: 'add-text', text: analyzeText };
  };

  const handleGenerateChart = (file) => {
    const chartText = `請分析這個 CSV 數據並建議適合的圖表類型，提供數據視覺化方案：${file.filename}`;
    return { action: 'add-text', text: chartText };
  };

  /**
   * Excel 專用處理函數
   */
  const handleAnalyzeExcelData = (file) => {
    const analyzeText = `請深度分析這個 Excel 檔案中的所有工作表數據，提供統計摘要、數據品質評估和業務洞察：${file.filename}`;
    return { action: 'add-text', text: analyzeText };
  };

  const handleGenerateExcelChart = (file) => {
    const chartText = `請分析這個 Excel 檔案的數據結構，建議適合的圖表類型和數據視覺化方案，考慮多個工作表之間的關係：${file.filename}`;
    return { action: 'add-text', text: chartText };
  };

  const handleSummarizeExcelSheets = (file) => {
    const summaryText = `請分析這個 Excel 檔案中所有工作表的結構和用途，提供每個工作表的摘要和整體檔案的功能說明：${file.filename}`;
    return { action: 'add-text', text: summaryText };
  };

  /**
   * PowerPoint 專用處理函數
   */
  const handleAnalyzePowerpoint = (file) => {
    const analyzeText = `請分析這個 PowerPoint 簡報檔案的結構和內容，提供每張投影片的摘要和整體簡報的主題分析：${file.filename}`;
    return { action: 'add-text', text: analyzeText };
  };

  const handleExtractSlideContent = (file) => {
    const extractText = `請提取這個 PowerPoint 簡報中所有投影片的文字內容、圖表說明和重要元素，整理成結構化的文字格式：${file.filename}`;
    return { action: 'add-text', text: extractText };
  };

  const handleOptimizePresentation = (file) => {
    const optimizeText = `請分析這個 PowerPoint 簡報並提供優化建議，包括內容結構、視覺設計、邏輯流程和演講技巧方面的改善方案：${file.filename}`;
    return { action: 'add-text', text: optimizeText };
  };

  /**
   * 文字檔案專用處理函數
   */
  const handleAnalyzeText = (file) => {
    const analyzeText = `請分析這個文字檔案的內容結構、主題和重點，提供詳細的文本分析報告：${file.filename}`;
    return { action: 'add-text', text: analyzeText };
  };

  const handleSummarizeText = (file) => {
    const summarizeText = `請為這個文字檔案提供簡潔的內容摘要，突出關鍵信息和要點：${file.filename}`;
    return { action: 'add-text', text: summarizeText };
  };

  /**
   * JSON 檔案專用處理函數
   */
  const handleParseJson = (file) => {
    const parseText = `請解析這個 JSON 檔案的結構，說明各個欄位的用途和數據類型：${file.filename}`;
    return { action: 'add-text', text: parseText };
  };

  const handleValidateJson = (file) => {
    const validateText = `請驗證這個 JSON 檔案的格式是否正確，並檢查是否有語法錯誤或結構問題：${file.filename}`;
    return { action: 'add-text', text: validateText };
  };

  /**
   * XML 檔案專用處理函數
   */
  const handleParseXml = (file) => {
    const parseText = `請解析這個 XML 檔案的結構，說明元素層次和屬性配置：${file.filename}`;
    return { action: 'add-text', text: parseText };
  };

  const handleTransformXml = (file) => {
    const transformText = `請分析這個 XML 檔案並提供格式轉換建議，例如轉為 JSON 或其他結構化格式：${file.filename}`;
    return { action: 'add-text', text: transformText };
  };

  /**
   * 程式碼檔案專用處理函數
   */
  const handleReviewCode = (file) => {
    const reviewText = `請對這個程式碼檔案進行詳細的代碼審查，包括代碼品質、潛在問題、安全性和最佳實踐建議：${file.filename}`;
    return { action: 'add-text', text: reviewText };
  };

  const handleExplainCode = (file) => {
    const explainText = `請詳細解釋這個程式碼檔案的功能、邏輯流程和關鍵算法，適合初學者理解：${file.filename}`;
    return { action: 'add-text', text: explainText };
  };

  const handleOptimizeCode = (file) => {
    const optimizeText = `請分析這個程式碼檔案並提供性能優化建議，包括代碼重構、效率改進和可維護性提升方案：${file.filename}`;
    return { action: 'add-text', text: optimizeText };
  };

  /**
   * 通用檔案處理函數
   */
  const handleSummarizeFile = (file) => {
    const summarizeText = `請分析這個檔案的關鍵要點：${file.filename}`;
    return { action: 'add-text', text: summarizeText };
  };

  const handleGenerateDocument = (file) => {
    const generateText = `基於這個檔案內容，請生成一份完整的文件：${file.filename}`;
    return { action: 'add-text', text: generateText };
  };

  /**
   * 主要的檔案操作處理器
   */
  const handleFileAction = (actionType, file) => {
    const actionMap = {
      'explain-image': handleExplainImage,
      'extract-pdf-text': handleExtractPdfText,
      'summarize-pdf': handleSummarizePdf,
      'analyze-document': handleAnalyzeDocument,
      'format-document': handleFormatDocument,
      'analyze-csv-data': handleAnalyzeCsvData,
      'generate-chart': handleGenerateChart,
      'analyze-excel-data': handleAnalyzeExcelData,
      'generate-excel-chart': handleGenerateExcelChart,
      'summarize-excel-sheets': handleSummarizeExcelSheets,
      'analyze-powerpoint': handleAnalyzePowerpoint,
      'extract-slide-content': handleExtractSlideContent,
      'optimize-presentation': handleOptimizePresentation,
      'analyze-text': handleAnalyzeText,
      'summarize-text': handleSummarizeText,
      'parse-json': handleParseJson,
      'validate-json': handleValidateJson,
      'parse-xml': handleParseXml,
      'transform-xml': handleTransformXml,
      'review-code': handleReviewCode,
      'explain-code': handleExplainCode,
      'optimize-code': handleOptimizeCode,
      'summarize-file': handleSummarizeFile,
      'generate-document': handleGenerateDocument,
    };

    const handler = actionMap[actionType];
    if (handler) {
      return handler(file);
    } else {
      console.warn(`未知的檔案操作類型: ${actionType}`);
      return null;
    }
  };

  return {
    handleFileAction,
    addTextToInput,
    setFocusToInput,
  };
} 
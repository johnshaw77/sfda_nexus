/**
 * 測試 Llava 多模態功能
 * 驗證 llava 模型是否能處理圖片
 */

import { AIService } from "../../src/services/ai.service.js";

console.log("🧪 測試 Llava 多模態功能...\n");

async function testLlavaMultimodal() {
  try {
    // 1. 測試純文字對話
    console.log("=== 1. 測試純文字對話 ===");
    const textOnlyMessages = [
      { role: "user", content: "你好，請告訴我你是什麼模型？" },
    ];

    console.log("發送純文字消息到 llava...");
    const textResponse = await AIService.callModel({
      provider: "ollama",
      model: "llava:latest",
      messages: textOnlyMessages,
      temperature: 0.7,
      max_tokens: 1000,
      stream: false,
    });

    console.log("✅ 純文字回應成功:");
    console.log(textResponse.content.substring(0, 200) + "...\n");

    // 2. 測試多模態格式（模擬圖片）
    console.log("=== 2. 測試多模態格式 ===");
    const multimodalMessages = [
      {
        role: "user",
        content: [
          { type: "text", text: "請描述這張圖片的內容" },
          {
            type: "image_url",
            image_url: {
              url: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
            },
          },
        ],
      },
    ];

    console.log("發送多模態消息到 llava...");
    console.log("消息格式:", JSON.stringify(multimodalMessages[0], null, 2));

    try {
      const multimodalResponse = await AIService.callModel({
        provider: "ollama",
        model: "llava:latest",
        messages: multimodalMessages,
        temperature: 0.7,
        max_tokens: 1000,
        stream: false,
      });

      console.log("✅ 多模態回應成功:");
      console.log(multimodalResponse.content.substring(0, 300) + "...\n");
    } catch (error) {
      console.log("❌ 多模態測試失敗:");
      console.log("錯誤類型:", error.constructor.name);
      console.log("錯誤消息:", error.message);
      if (error.response?.data) {
        console.log("API 錯誤詳情:", error.response.data);
      }
      console.log("");
    }

    // 3. 檢查 Ollama 服務狀態
    console.log("=== 3. 檢查 Ollama 服務狀態 ===");
    try {
      const response = await fetch("http://localhost:11434/api/tags");
      const data = await response.json();
      console.log("✅ Ollama 服務正常");
      const llavaModel = data.models?.find((m) => m.name.includes("llava"));
      if (llavaModel) {
        console.log("✅ 找到 llava 模型:", llavaModel.name);
        console.log(
          "   大小:",
          Math.round((llavaModel.size / 1024 / 1024 / 1024) * 100) / 100,
          "GB"
        );
      } else {
        console.log("❌ 未找到 llava 模型");
      }
    } catch (error) {
      console.log("❌ Ollama 服務連接失敗:", error.message);
    }
  } catch (error) {
    console.error("測試過程發生錯誤:", error);
  }
}

testLlavaMultimodal();

// 簡單的 HTTP 服務器來提供測試頁面
import { createServer } from "http";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const server = createServer((req, res) => {
  console.log("📡 請求:", req.method, req.url);

  // 設置 CORS 標頭
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    if (req.url === "/" || req.url === "/test") {
      // 提供測試頁面
      const htmlContent = readFileSync(
        join(__dirname, "test_thinking_mode_fix.html"),
        "utf8"
      );
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(htmlContent);
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    }
  } catch (error) {
    console.error("服務器錯誤:", error);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
  }
});

const PORT = 8081;
server.listen(PORT, () => {
  console.log(`🌐 測試服務器運行在: http://localhost:${PORT}`);
  console.log(`📄 測試頁面地址: http://localhost:${PORT}/test`);
});

// 優雅關閉
process.on("SIGINT", () => {
  console.log("\n🛑 正在關閉測試服務器...");
  server.close(() => {
    console.log("✅ 測試服務器已關閉");
    process.exit(0);
  });
});

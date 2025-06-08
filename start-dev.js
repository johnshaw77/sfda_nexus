#!/usr/bin/env node

/**
 * SFDA Nexus 開發環境啟動腳本
 * 同時啟動 frontend 和 backend 的開發模式
 * 跨平台支援 (Windows, macOS, Linux)
 */

import { spawn } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { platform } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 檢測作業系統
const isWindows = platform() === "win32";

// 顏色定義 (Windows 支援)
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

// 日誌輸出函式
const log = (message, color = colors.reset) => {
  // Windows 可能不支援顏色，提供回退
  if (isWindows && !process.env.FORCE_COLOR) {
    console.log(message);
  } else {
    console.log(`${color}${message}${colors.reset}`);
  }
};

// 格式化時間戳
const timestamp = () => {
  return new Date().toLocaleTimeString("zh-TW", { hour12: false });
};

// 進程管理
const processes = [];

// 跨平台進程終止
const killProcess = (proc, signal = "SIGTERM") => {
  if (isWindows) {
    // Windows 使用 taskkill
    spawn("taskkill", ["/pid", proc.pid, "/f", "/t"], { shell: true });
  } else {
    // Unix 系統使用標準信號
    proc.kill(signal);
  }
};

// 清理函式
const cleanup = () => {
  log("\n正在停止所有開發服務...", colors.yellow);

  processes.forEach((proc, index) => {
    if (proc && !proc.killed) {
      log(`停止進程 ${index + 1}...`, colors.yellow);
      killProcess(proc, "SIGTERM");

      // 如果進程沒有正常停止，強制終止
      setTimeout(() => {
        if (!proc.killed) {
          killProcess(proc, "SIGKILL");
        }
      }, 5000);
    }
  });

  setTimeout(() => {
    log("所有服務已停止", colors.green);
    process.exit(0);
  }, 2000);
};

// 監聽退出信號
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

// 啟動單個服務
const startService = (name, command, args, cwd, color) => {
  return new Promise((resolve, reject) => {
    log(`[${timestamp()}] 啟動 ${name}...`, color);

    // 跨平台命令執行
    const spawnOptions = {
      cwd,
      stdio: "pipe",
      shell: true,
    };

    // Windows 特殊處理
    if (isWindows) {
      spawnOptions.windowsHide = true;
    }

    const proc = spawn(command, args, spawnOptions);

    processes.push(proc);

    // 處理標準輸出
    proc.stdout.on("data", (data) => {
      const output = data.toString().trim();
      if (output) {
        output.split("\n").forEach((line) => {
          if (line.trim()) {
            log(`${color}[${name}]${colors.reset} ${line}`, colors.reset);
          }
        });
      }
    });

    // 處理錯誤輸出
    proc.stderr.on("data", (data) => {
      const output = data.toString().trim();
      if (output) {
        output.split("\n").forEach((line) => {
          if (line.trim()) {
            log(`${color}[${name}]${colors.reset} ${line}`, colors.reset);
          }
        });
      }
    });

    // 處理進程錯誤
    proc.on("error", (error) => {
      log(`[${timestamp()}] ${name} 啟動失敗: ${error.message}`, colors.red);
      reject(error);
    });

    // 處理進程退出
    proc.on("close", (code) => {
      if (code === 0) {
        log(`[${timestamp()}] ${name} 正常退出`, color);
      } else {
        log(`[${timestamp()}] ${name} 異常退出，代碼: ${code}`, colors.red);
      }
    });

    // 檢查服務是否啟動成功
    setTimeout(() => {
      if (!proc.killed) {
        log(`[${timestamp()}] ${name} 啟動成功`, colors.green);
        resolve(proc);
      }
    }, 3000);
  });
};

// 主要啟動函式
const main = async () => {
  try {
    log(
      `${colors.bright}${colors.cyan}=== SFDA Nexus 開發環境啟動 ===${colors.reset}`
    );
    log(`時間: ${new Date().toLocaleString("zh-TW")}`, colors.cyan);
    log("", colors.reset);

    // 專案路徑
    const frontendPath = join(__dirname, "frontend");
    const backendPath = join(__dirname, "backend");

    log("檢查專案目錄...", colors.yellow);

    // 啟動服務
    const services = [
      {
        name: "Backend",
        command: "npm",
        args: ["run", "dev"],
        cwd: backendPath,
        color: colors.blue,
      },
      {
        name: "Frontend",
        command: "npm",
        args: ["run", "dev"],
        cwd: frontendPath,
        color: colors.magenta,
      },
    ];

    // 同時啟動所有服務
    const promises = services.map((service) =>
      startService(
        service.name,
        service.command,
        service.args,
        service.cwd,
        service.color
      )
    );

    await Promise.allSettled(promises);

    log("", colors.reset);
    log(
      `${colors.bright}${colors.green}=== 所有開發服務已啟動 ===${colors.reset}`
    );
    log("", colors.reset);
    log("服務地址:", colors.cyan);
    log("  - Frontend: http://localhost:5173", colors.magenta);
    log("  - Backend:  http://localhost:3000", colors.blue);
    log("", colors.reset);
    log(`${colors.yellow}按 Ctrl+C 停止所有服務${colors.reset}`);
    log("", colors.reset);
  } catch (error) {
    log(`啟動失敗: ${error.message}`, colors.red);
    cleanup();
  }
};

// 執行主函式
main().catch((error) => {
  log(`未處理的錯誤: ${error.message}`, colors.red);
  cleanup();
});

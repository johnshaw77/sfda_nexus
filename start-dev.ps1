# SFDA Nexus 開發環境啟動腳本 (PowerShell)
# 同時啟動 frontend 和 backend 的開發模式

param(
    [switch]$Help,
    [switch]$Verbose
)

# 顏色定義
$Colors = @{
    Red = "Red"
    Green = "Green" 
    Yellow = "Yellow"
    Blue = "Blue"
    Magenta = "Magenta"
    Cyan = "Cyan"
    White = "White"
}

# 日誌輸出函式
function Write-ColorLog {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    
    $timestamp = Get-Date -Format "HH:mm:ss"
    Write-Host "[$timestamp] $Message" -ForegroundColor $Color
}

# 檢查目錄函式
function Test-ProjectDirectories {
    $scriptDir = Split-Path -Parent $MyInvocation.ScriptName
    $frontendDir = Join-Path $scriptDir "frontend"
    $backendDir = Join-Path $scriptDir "backend"
    
    if (-not (Test-Path $frontendDir)) {
        Write-ColorLog "錯誤: Frontend 目錄不存在 ($frontendDir)" $Colors.Red
        return $false
    }
    
    if (-not (Test-Path $backendDir)) {
        Write-ColorLog "錯誤: Backend 目錄不存在 ($backendDir)" $Colors.Red
        return $false
    }
    
    if (-not (Test-Path (Join-Path $frontendDir "package.json"))) {
        Write-ColorLog "錯誤: Frontend package.json 不存在" $Colors.Red
        return $false
    }
    
    if (-not (Test-Path (Join-Path $backendDir "package.json"))) {
        Write-ColorLog "錯誤: Backend package.json 不存在" $Colors.Red
        return $false
    }
    
    return $true
}

# 啟動服務函式
function Start-DevService {
    param(
        [string]$Name,
        [string]$Path,
        [string]$Color
    )
    
    Write-ColorLog "啟動 $Name 服務..." $Color
    
    $job = Start-Job -ScriptBlock {
        param($ServicePath)
        Set-Location $ServicePath
        npm run dev
    } -ArgumentList $Path -Name $Name
    
    return $job
}

# 主要執行函式
function Start-DevEnvironment {
    if ($Help) {
        Write-Host @"
SFDA Nexus 開發環境啟動腳本

用法:
    .\start-dev.ps1          # 啟動開發環境
    .\start-dev.ps1 -Verbose # 詳細輸出模式
    .\start-dev.ps1 -Help    # 顯示此說明

功能:
    - 同時啟動 frontend 和 backend 開發服務器
    - 跨平台支援 (Windows, macOS, Linux)
    - 彩色日誌輸出
    - 優雅的進程管理

服務地址:
    - Frontend: http://localhost:5173
    - Backend:  http://localhost:3000
"@
        return
    }
    
    Write-ColorLog "=== SFDA Nexus 開發環境啟動 ===" $Colors.Cyan
    Write-ColorLog "時間: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" $Colors.Cyan
    Write-Host ""
    
    # 檢查目錄
    if (-not (Test-ProjectDirectories)) {
        Write-ColorLog "環境檢查失敗，退出" $Colors.Red
        return
    }
    
    Write-ColorLog "環境檢查通過" $Colors.Green
    Write-Host ""
    
    # 取得專案路徑
    $scriptDir = Split-Path -Parent $MyInvocation.ScriptName
    $frontendDir = Join-Path $scriptDir "frontend"
    $backendDir = Join-Path $scriptDir "backend"
    
    try {
        # 啟動服務
        $backendJob = Start-DevService "Backend" $backendDir $Colors.Blue
        Start-Sleep -Seconds 3
        $frontendJob = Start-DevService "Frontend" $frontendDir $Colors.Magenta
        
        Write-Host ""
        Write-ColorLog "=== 所有開發服務已啟動 ===" $Colors.Green
        Write-Host ""
        Write-ColorLog "服務地址:" $Colors.Cyan
        Write-ColorLog "  - Frontend: http://localhost:5173" $Colors.Magenta
        Write-ColorLog "  - Backend:  http://localhost:3000" $Colors.Blue
        Write-Host ""
        Write-ColorLog "按 Ctrl+C 停止所有服務" $Colors.Yellow
        Write-Host ""
        
        # 監控作業
        try {
            while ($true) {
                if ($Verbose) {
                    Write-ColorLog "Backend 狀態: $($backendJob.State)" $Colors.Blue
                    Write-ColorLog "Frontend 狀態: $($frontendJob.State)" $Colors.Magenta
                }
                
                # 檢查作業是否還在運行
                if ($backendJob.State -eq "Failed" -or $frontendJob.State -eq "Failed") {
                    Write-ColorLog "偵測到服務失敗，正在停止..." $Colors.Red
                    break
                }
                
                Start-Sleep -Seconds 5
            }
        }
        catch {
            Write-ColorLog "偵測到中斷信號" $Colors.Yellow
        }
        
    }
    finally {
        # 清理作業
        Write-ColorLog "正在停止所有服務..." $Colors.Yellow
        
        if ($backendJob) {
            Stop-Job $backendJob -ErrorAction SilentlyContinue
            Remove-Job $backendJob -ErrorAction SilentlyContinue
            Write-ColorLog "Backend 服務已停止" $Colors.Blue
        }
        
        if ($frontendJob) {
            Stop-Job $frontendJob -ErrorAction SilentlyContinue 
            Remove-Job $frontendJob -ErrorAction SilentlyContinue
            Write-ColorLog "Frontend 服務已停止" $Colors.Magenta
        }
        
        Write-ColorLog "所有服務已停止" $Colors.Green
    }
}

# 執行主函式
Start-DevEnvironment

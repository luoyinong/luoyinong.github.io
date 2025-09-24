
# PowerShell 脚本：切换 VUE_APP_PROXY_URL 注释，环境地址全部维护在 .env.development.local
# 用法：powershell -ExecutionPolicy Bypass -File switch-env.ps1 <env>

param(
    [string]$env
)
# 解决中文输出乱码
chcp 65001 > $null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$envFile = Join-Path $PSScriptRoot "..\.env.development.local"
$lines = Get-Content $envFile -Encoding UTF8

# 环境关键字与注释对应关系，全部为 # DEV、# TEST、# SIT、# CUSTOM、# MOCK、# LOCAL
switch ($env) {
    'dev'    { $targetComment = '# DEV' }
    'test'   { $targetComment = '# TEST' }
    'sit'    { $targetComment = '# SIT' }
    'custom' { $targetComment = '# CUSTOM' }
    'mock'   { $targetComment = '# MOCK' }
    'local'  { $targetComment = '# LOCAL' }
    default  {
        Write-Host "Unknown environment: $env"
        exit 1
    }
}

$inTargetBlock = $false
$newLines = @()

foreach ($line in $lines) {
    # 检查是否进入目标环境注释块
    if ($line.Trim() -eq $targetComment) {
        $inTargetBlock = $true
        $newLines += $line
        continue
    }
    # 检查是否进入其他环境注释块
    if ($line.Trim() -match '^# (DEV|TEST|SIT|CUSTOM|MOCK|LOCAL)($| )') {
        $inTargetBlock = $false
        $newLines += $line
        continue
    }
    # 只处理 VUE_APP_PROXY_URL 行
    if ($line -match '^(# )?VUE_APP_PROXY_URL=') {
        if ($inTargetBlock) {
            # 目标环境，取消注释
            $newLines += $line.TrimStart('# ').Trim()
        } else {
            # 其他环境，加注释
            if ($line.Trim().StartsWith('#')) {
                $newLines += $line
            } else {
                $newLines += "# $line"
            }
        }
        continue
    }
    $newLines += $line
}

[System.IO.File]::WriteAllLines($envFile, $newLines, [System.Text.Encoding]::UTF8)
Write-Host "Switched to environment: $env"

# === 停止已存在的 vue dev 服务 ===
# 查找包含 tvt.js serve 的 node 进程
$processes = Get-WmiObject Win32_Process | Where-Object {
    $_.CommandLine -match 'tvt.js serve'
}
if ($processes) {
    foreach ($proc in $processes) {
        try {
            Stop-Process -Id $proc.ProcessId -Force
            Write-Host "Terminated process: $($proc.ProcessId) $($proc.CommandLine)"
        } catch {
            Write-Host "Failed to terminate: $($proc.ProcessId)"
        }
    }
    Start-Sleep -Seconds 2
} else {
    Write-Host "No running vue dev service process detected."
}

# === 启动 vue dev 服务 ===
Write-Host "Starting npm run dev ..."
$workDir = Resolve-Path "$PSScriptRoot/.."
Invoke-Expression "cd `"$workDir`"; npm run dev"


{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Switch to DEV and restart vue dev",
      "type": "shell",
      "command": "powershell",
      "args": [
        "-ExecutionPolicy", "Bypass", "-File", "${workspaceFolder}/.vscode/switch-env.ps1", "dev"
      ],
      "group": "build",
      "presentation": {
        "reveal": "always",
        "panel": "shared"
      }
    },
    {
      "label": "Switch to TEST and restart vue dev",
      "type": "shell",
      "command": "powershell",
      "args": [
        "-ExecutionPolicy", "Bypass", "-File", "${workspaceFolder}/.vscode/switch-env.ps1", "test"
      ],
      "group": "build",
      "presentation": {
        "reveal": "always",
        "panel": "shared"
      }
    },
    {
      "label": "Switch to SIT and restart vue dev",
      "type": "shell",
      "command": "powershell",
      "args": [
        "-ExecutionPolicy", "Bypass", "-File", "${workspaceFolder}/.vscode/switch-env.ps1", "sit"
      ],
      "group": "build",
      "presentation": {
        "reveal": "always",
        "panel": "shared"
      }
    },
    {
      "label": "Switch to CUSTOM and restart vue dev",
      "type": "shell",
      "command": "powershell",
      "args": [
        "-ExecutionPolicy", "Bypass", "-File", "${workspaceFolder}/.vscode/switch-env.ps1", "custom"
      ],
      "group": "build",
      "presentation": {
        "reveal": "always",
        "panel": "shared"
      }
    },
    {
      "label": "Switch to MOCK and restart vue dev",
      "type": "shell",
      "command": "powershell",
      "args": [
        "-ExecutionPolicy", "Bypass", "-File", "${workspaceFolder}/.vscode/switch-env.ps1", "mock"
      ],
      "group": "build",
      "presentation": {
        "reveal": "always",
        "panel": "shared"
      }
    },
    {
      "label": "Switch to LOCAL and restart vue dev",
      "type": "shell",
      "command": "powershell",
      "args": [
        "-ExecutionPolicy", "Bypass", "-File", "${workspaceFolder}/.vscode/switch-env.ps1", "local"
      ],
      "group": "build",
      "presentation": {
        "reveal": "always",
        "panel": "shared"
      }
    }
  ]
}

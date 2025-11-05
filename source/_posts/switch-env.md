---
title: vue项目切换环境热更新
date: 2025-10-23 11:53:10
categories:
- 翻新旧项目
tags:
- 前端
- vue2
---

# 背景

目前部门主要有三种环境

1. 开发环境(开发自行调试, 极其不稳定, 后端经常重启服务)
2. 联调环境(前后端联调, 比较稳定, 限制了只能master分支部署)
3. 测试环境 (测试用来迭代测试的, 非常稳定)
4. 集成环境 (临时的, 集成测试使用)
5. 多域名环境 (临时的, 调试单点登录等功能)

前端开发一般是连的联调环境, 但是测试提单前会招开发确认, 那么这个时候, 就需要切到测试环境复现问题, 好让测试提单

又或者排期比较紧张的时候, 其它需求的开发也会过来找前端调试, 那么这个时候就又需要切到开发环境

上述现象导致了一个问题,那就是忙的时候需要来回切环境, 而vue2项目切环境需要修改.env.development.local文件, 再重启服务

整个过程比较麻烦, 所以决定看下是否能快速切环境

## 思路

问题

1. 打开local文件, 手动修改环境地址(或者取消注释)
2. 重启服务时间比较长, 这是vue-cli的限制 (之前已经优化过, 但随着项目规模的增长, 时间又从2秒变到了6秒.....)

目标

1. 希望通过命令行, 或者选择环境等方式修改地址, 操作长度不超过2步
2. 缩短重启时间, 或者不重启, 只是热更新

## 方案

### 快速切换地址

vscode提出了task这个概念, 就是通过配置, 可以便捷的执行脚本, 与gulp, webpack等工具不同的是, task可以使用其它语言作为脚本, 更重要的是,它还可以用vscode的快捷键里触发

@图1

这样的通过 ctrl+shift+B 快捷键就可以快速调用task任务

至于task的详细介绍, 可以看vscode的[官网](https://code.visualstudio.com/docs/debugtest/tasks)

### 环境变量

vue2项目的环境变量一般都保存在.local文件里, 如今要用脚本切换的话, 那么就有多种方案,

一是保存到脚本里, 这样的话编写脚本很方便, 不用读取文件直接全覆盖.local文件即可

二则是继续保存在.local文件里, 我最终选择了这种方案, 原因有多个, 主要还是为了保持和其它项目的一致

### 切换脚本

由用户选择task(对应环境), 再传入ps脚本, 然后写入.local文件, 最后重启服务

```json
// task.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Switch to DEV",
      "type": "shell",
      "command": "powershell",
      "args": [
        "-ExecutionPolicy", "Bypass", "-File", "${workspaceFolder}/.vscode/switch-env.ps1", "DEV"
      ],
      "group": "build",
      "presentation": {
        "reveal": "always",
        "panel": "shared" // 公用窗口, 避免切换环境后新增窗口
      }
    },
    {
      "label": "Switch to TEST",
      "type": "shell",
      "command": "powershell",
      "args": [
        "-ExecutionPolicy", "Bypass", "-File", "${workspaceFolder}/.vscode/switch-env.ps1", "TEST"
      ],
      "group": "build",
      "presentation": {
        "reveal": "always",
        "panel": "shared"
      }
    },
    {
      "label": "Switch to SIT",
      "type": "shell",
      "command": "powershell",
      "args": [
        "-ExecutionPolicy", "Bypass", "-File", "${workspaceFolder}/.vscode/switch-env.ps1", "SIT"
      ],
      "group": "build",
      "presentation": {
        "reveal": "always",
        "panel": "shared"
      }
    },
    {
      "label": "Switch to CUSTOM",
      "type": "shell",
      "command": "powershell",
      "args": [
        "-ExecutionPolicy", "Bypass", "-File", "${workspaceFolder}/.vscode/switch-env.ps1", "CUSTOM"
      ],
      "group": "build",
      "presentation": {
        "reveal": "always",
        "panel": "shared"
      }
    },
    {
      "label": "Switch to MOCK",
      "type": "shell",
      "command": "powershell",
      "args": [
        "-ExecutionPolicy", "Bypass", "-File", "${workspaceFolder}/.vscode/switch-env.ps1", "MOCK"
      ],
      "group": "build",
      "presentation": {
        "reveal": "always",
        "panel": "shared"
      }
    },
    {
      "label": "Switch to LOCAL",
      "type": "shell",
      "command": "powershell",
      "args": [
        "-ExecutionPolicy", "Bypass", "-File", "${workspaceFolder}/.vscode/switch-env.ps1", "LOCAL"
      ],
      "group": "build",
      "presentation": {
        "reveal": "always",
        "panel": "shared"
      }
    }
  ]
}

```

```PowerShell
# switch-env.ps1
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

$targetComment = '#' + $env

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
```

上述两个文件的位置

@图2

添加完之后就可以使用快捷键快速切换环境了

@图3

.local文件

```shell

# DEV
# VUE_APP_PROXY_URL=123

# TEST
# VUE_APP_PROXY_URL=123

# SIT
VUE_APP_PROXY_URL=123

# CUSTOM
# VUE_APP_PROXY_URL=123

# LOCAL
# VUE_APP_PROXY_URL=123

# MOCK
VUE_APP_MOCK_PROXY_URL=456
```

需要注意的是, 这个local文件的查找是从上至下的, 并且mock和其它环境不是互斥的, 所以需要将mock放到最下面

### 解决vue重启

首先是为什么要重启, 原因很简单, 环境配置是写在.local文件里, vue-cli启动时会将.local的配置写入process.env, 然后vue.config.js里的proxy拿到配置

所以只有vue-cli启动时, 才会从.local文件里拿到环境变量, 然后配置代理

那么要解决修改代理后需要重启的问题, 就需要解决如何实时读取.local文件

思路

1. 将.local文件变成json等文件, 这样一来, vue-cli处理请求时, 从.local文件读取数据即可
2. 监听.local文件, 一旦更改, 就更新vue-cli里的变量

### 实时读取

1. nodejs加载js后, 整个文件已经被读入内存, 此时再更改js文件, 对变量也不会有影响, 所以将变量写成引用这种方案行不通的
2. 如果是实时加载, 实现的手段无非是将target设置成属性读取器, 或是使用proxy, 或是改变router, 利用http-proxy-middleware的特性, 动态改变target

这几种方式都有一个问题, 那就是项目的接口读取是很频繁的, 每次进行代理时, 都要进行文件读取, 会严重拖慢接口的速度

### 使用缓存

既然频繁读取会有性能问题, 那么不直接读取文件, 而是利用require自带的缓存怎么样?

这样的话, 问题就来到应该怎样更新缓存

可以使用fs.stat拿到文件的修改时间, 和上一次的时间对比, 如果不同, 就更新缓存

> 在文件内部维护一个版本号这是不行的, 还是要先读取文件内容, 相当于脱裤子放屁

```JavaScript
let lastMtimeMs = 0

const st = await fs.stat(envFile);
if (st.mtimeMs === lastMtimeMs && cache) return;
const content = await fs.readFile(envFile, 'utf8');
cache = parseEnv(content);
lastMtimeMs = st.mtimeMs;

```

### 监听local文件

比起上述的实时加载, 监听local文件, 然后更改环境变量要简单得多

```JavaScript

const fs = require('fs');
const settingModuleId = require.resolve('./setting.json');
let setting = require('./setting.json');

fs.watchFile(settingModuleId, { interval: 1000 }, (curr, prev) => {
  if (curr.mtimeMs !== prev.mtimeMs) {
    // 删除 require 缓存并重新加载
    delete require.cache[settingModuleId];
    try {
      setting = require(settingModuleId);
    } catch (err) {
      console.error('reload setting failed', err);
    }
  }
});

setInterval(() => {
  console.log(setting);
}, 2000);

```

### 更新环境变量

一开始用的是属性存取器, 发现没有效果, 查看http-proxy-middleware源码后发现它是将配置assign到新对象了, 从而失去了属性读取器的效果

@图4

一同失效的还有proxy

不过没有关系, 还可以使用router选项

设置router后会覆盖之前的target属性, 并且router可以是一个函数

@图5

@图6

所以这么写即可

```JavaScript
proxy: [
  {
    context: ['/test'],
    target: '', // env.development or 自己的.local
    router() {
      return process.env.VUE_APP_PROXY_URL
    },
    changeOrigin: true,
    secure: false,
  }
],
```

此外, 我这边项目vue-cli版本比较老, 用的是webpack打包的那一套, 没有用vue.config.js进行配置, 而读取.local文件是我自己实现的

所以需要更改一下读取配置

```JavaScript
function loadEnvFiles(mode) {
  const basePath = path.resolve(process.cwd(), `.env.${mode}`)
  const localPath = `${basePath}.local`

  // 监听local文件
  fs.watchFile(localPath, { interval: 1000 }, (curr, prev) => {
    if (curr.mtimeMs !== prev.mtimeMs) {
      const updatedEnv = dotenv.config({ path: localPath, override: true }) // 加上override表示覆盖
      dotenv.populate(process.env, updatedEnv, { override: true })
    }
  })

  env.NODE_ENV = mode
  try {
    const env = dotenv.config({ path: [localPath, basePath] })
    dotenv.populate(process.env, env)
  } catch (err) {
    // only ignore error if file is not found
    if (err.toString().indexOf('ENOENT') < 0) {
      console.error(err)
    }
  }
}
```

如果是较新的vue-cli, 那么用.local文件估计是不行的, 不过也有办法, 就是不使用这玩意, 用json或者js记录环境变量,

然后自己读取配置, 也是一样的

### 删除重启脚本

之前会检测是否存在vue服务, 然后重启, 现在的话不用停, 没有的话再启动

```PowerShell

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

$targetComment = "# $env"
Write-Host $targetComment


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
if (!$processes) {
    # === 启动 vue dev 服务 ===
    Write-Host "Starting npm run dev ..."
    $workDir = Resolve-Path "$PSScriptRoot/.."
    Invoke-Expression "cd `"$workDir`"; npm run dev"
}
```

## 完结

优化之前的步骤
手动修改环境地址(3s) => 重启服务(6s) => 切换浏览器(1s) = 10s

优化后的步骤
ctrl+shift+B(1s) => 切换浏览器(1s) = 2s

可以说大大简化了切换地址的效率, 再也不怕焦头烂额的来回切地址了 (有时候还会忘记重启(～￣▽￣)～)

## 后续

在实际使用过程中发现一个问题, 那就是webpack-dev-server的proxy一旦配置了route, 那么它就会覆盖其它的proxy配置, 这就导致了本地的静态资源文件修改不生效

实际上连的是环境上的资源文件

个人认为这是一个bug

但好在还有其它方法解决, devServer也支持proxy是函数, 所以这么写就没问题

```JavaScript
proxy: [
  () => ({
    context: ['/test'],
    target: process.env.VUE_APP_PROXY_URL, // env.development or 自己的.local
    changeOrigin: true,
    secure: false,
  })
],
```



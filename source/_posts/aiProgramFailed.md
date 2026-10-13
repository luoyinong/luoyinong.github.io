# 记录一次失败的玩具项目心得

## 技术栈

codex + deepseek 4.0/4.1 flash
ts + nodejs + mysql

## 项目概览

这次的玩具项目规模比较大, 属于重agent项目, 是一个文字RPG类游戏, 但和传统的RPG不同的是, 里面的很多内容都是由ai即时演算的

比如 世界AI导演, 负责统一编排世界剧情的演化, 不再是固定的剧情
ai npc, 拥有独立的记忆(设定+事实+对话上下文), 会根据不同情景做出选择, 和玩家对话也会更加多变
ai 旁白, 即时描绘场景
ai 动作识别, 用户输入一句话, ai将其识别为系统支持的动作
ai 提案, 系统裁决, 保证系统运行的可靠性 

## 项目过程

### 想法

一开始, 只是有一个模糊的想搞一个ai参与度高的, 不一样的项目, 由于本人玩游戏比较多, 但是大多数游戏剧情比较固定, 所以就想搞出一个ai演化的PG游戏,

但是呢, 由于我的主要目的是开发ai演化, 所以就把游戏的其它内容直接忽略, 比如画面

### 开始与结束

由于只是一个模糊的想法, 所以我先找ai一起讨论出了项目的需求规格, 然后让ai按照需求文档拆分开发计划, 再就是进行开发, 最后是我进行试玩

讨论需求规格的时候, 感觉ai还是很靠谱的, 提出了许多建议和想法, 以至于我都认为整个项目会比较顺利的完成,

这里说一下为什么直接拆开发计划, 而不是细化文档, 比如说给出系统架构图, 模块设计文档, 然后是开发计划

我这么做主要是基于过去的经验, 以及还是对ai掌握的不够

1. 之前使用github copilot时候, 用的是claude 4.5, 文档我让ai写, 然后自己审核, 但是发现文档写的多没有屌用, ai还是有概率遗忘, 
高级模型大概率还能理解你的指正, 低级模型直接开始瞎几把改

2. 文档和代码有什么区别? 在有ai的情况下, 有必要把所有细节都描绘出来吗, 和用代码实现有什么区别, 如果文档非常详细, 那么后面进行迭代的时候,
就意味着你需要同时更新两份资源, 一旦迭代过多, 会变得非常麻烦

3. 所以我这次想的是只给需求规格, 然后让ai自行发挥, 搞出一个能跑的项目, 后面再进行优化

这么做的结果是, 确实搞出来一个能跑的文字游戏世界, 也能够进行世界ai演化, npc也能回答一些问题, **但是**, 试玩的时候就会发现有很多东西不对劲

比如世界剧情推进, 旁白老是重复一些描述, npc插话, npc胡说八道, 玩家可以进行注入(直接升级), 没有场景限制, 动作识别不准, 不好调试等等一系列的问题

然后呢, 我就如愿以偿的开始各种优化, 最后的结果是人麻了

### 游戏截图

初始化

@图1

进入世界

@图2

发生对话

@图3

调试日志

@图4

总体来说, 总算是能玩了, 但也仅限于初期, 游戏再往后发展, 我也没试过, 感觉会有很多问题, 不过主要的目标达到了

> 本来还说想搞一个语音识别+语音朗读, 再加上音乐, 结果改问题改的人麻了

## 架构与设计

一开始没有设计, 都是开发完毕后补充的, 方便以后翻阅

### 系统架构图

```mermaid
flowchart LR
  Player["玩家<br/>[Person]<br/>发起行动、查看世界状态"]

  subgraph SystemBoundary["游戏系统边界"]
    direction LR

    Web["React SPA<br/>[Container: Browser]<br/>菜单 / 游戏 / 日志 / 输入与展示"]

    Server["Express 应用<br/>[Container: Node.js Process]<br/>REST + SSE / 用例编排 / 领域引擎<br/>AI Runtime / 世界生成 / 权威校验 / 日志"]

    DB["SQLite<br/>[Container: Data Store]<br/>存档 / 游戏日志 / 压缩正文"]

    Settings["本地配置文件<br/>[Data Store]<br/>settings.json / API Key / 会话 ID"]
  end

  subgraph ExternalBoundary["外部系统"]
    AI["OpenAI 兼容服务<br/>[External System]<br/>Chat Completions / Responses"]
  end

  Player -->|"操作游戏"| Web

  Web -->|"HTTP REST<br/>创建世界 / 读取存档 / 执行行动"| Server
  Server -->|"SSE<br/>生成进度 / 流式叙事"| Web
  Server -->|"HTML / JS / CSS"| Web

  Server -->|"SQLite WAL<br/>保存和读取 GameState"| DB
  Server -->|"文件 I/O<br/>读取和保存配置"| Settings

  Server -->|"HTTPS<br/>JSON 请求 / 流式请求"| AI
  AI -->|"JSON 结果 / 流式文本 / 模型响应"| Server

  Constraint["关键约束<br/>AI 输出只作为提案、计划或文本<br/>正式状态变化必须由服务端权威层校验并原子提交"]
  Constraint -.-> Server

  classDef person fill:#f3f4f6,stroke:#4b5563,color:#111827
  classDef container fill:#dbeafe,stroke:#2563eb,color:#172554
  classDef datastore fill:#ede9fe,stroke:#7c3aed,color:#2e1065
  classDef external fill:#ffedd5,stroke:#ea580c,color:#431407
  classDef note fill:#fefce8,stroke:#ca8a04,color:#422006

  class Player person
  class Web,Server container
  class DB,Settings datastore
  class AI external
  class Constraint note
```



### 模块设计图

express 应用内部模块设计图

```mermaid
flowchart TB
  SPA["React SPA<br/>REST / SSE Client"]
  SQLite["SQLite<br/>GameState / Game Logs"]
  AIProvider["OpenAI 兼容服务<br/>Chat Completions / Responses"]

  subgraph Server["Express 应用：模块设计"]
    direction TB

    subgraph Interface["1. 接口模块"]
      Entry["index.ts<br/>进程启动 / 静态资源"]
      Routes["routes.ts<br/>REST / SSE / 用例入口"]
    end

    subgraph Application["2. 应用编排模块"]
      CreateWorld["创建世界流程"]
      Intent["intent.ts<br/>文本转 PlayerIntent"]
      Actions["actions.ts<br/>玩家行动总编排"]
      Tick["worldTick.ts<br/>跨天世界推进"]
    end

    subgraph Domain["3. 领域模块"]
      Authority["authority.ts<br/>校验 / 原子提交 / 回滚"]
      Gameplay["combat / cultivation / interaction<br/>scenes / stats / timeCost"]
      Adjudicate["adjudicate.ts<br/>自由行动结果应用"]
      Memory["memory.ts<br/>NPC 记忆桶"]
      Story["story.ts<br/>剧情状态机"]
    end

    subgraph Capability["4. AI 能力模块"]
      Runtime["runtime.ts<br/>世界导演 / NPC 对话<br/>自由动作 / 战斗选招 / 记忆压缩"]
      AiClient["client.ts + providers.ts<br/>协议适配 / 模型请求"]
      Narrator["narrator.ts<br/>流式叙事"]
    end

    subgraph WorldGen["5. 世界生成模块"]
      Generator["generator.ts<br/>区域 → NPC → 内容 → 剧情"]
      Presets["presets / seed / jianghu<br/>预设世界与内置内容"]
      Compiler["storyBlueprint + storyCompiler<br/>剧情蓝图 → 状态机"]
      StorySim["storySim.ts<br/>无干预世界模拟"]
    end

    subgraph Infra["6. 基础设施模块"]
      Store["store.ts<br/>SQLite 存档与日志"]
      GameLog["gameLog.ts<br/>缓冲 / 脱敏 / flush"]
      Config["config.ts<br/>设置 / API Key / 会话 ID"]
    end
  end

  Shared["shared/types.ts + labels.ts<br/>跨前后端共享契约"]

  SPA --> Routes
  Entry --> Routes

  Routes --> CreateWorld
  Routes --> Intent
  Routes --> Actions
  Routes --> Narrator
  Routes --> Store
  Routes --> Config

  Intent --> AiClient

  Actions --> Authority
  Actions --> Runtime
  Actions --> Gameplay
  Actions --> Adjudicate
  Actions --> Memory
  Actions --> Story
  Actions --> Tick
  Adjudicate --> Authority

  Tick --> Authority
  Tick --> Runtime
  Tick --> Gameplay
  Tick --> Memory
  Tick --> Story

  Runtime --> AiClient
  Runtime --> Gameplay
  Runtime --> Memory
  AiClient --> AIProvider
  Narrator --> AiClient

  CreateWorld --> Generator
  CreateWorld --> Presets
  Generator --> AiClient
  Generator --> Gameplay
  Generator --> Story
  Generator --> Compiler
  Presets --> Gameplay
  Presets --> Story
  Presets --> Compiler
  Compiler --> Story
  StorySim --> Presets
  StorySim --> Story
  StorySim --> Tick

  Authority --> Gameplay
  Authority --> Memory
  Authority --> Story
  Authority --> GameLog
  Store --> SQLite
  GameLog --> Store
  Config --> AiClient

  Shared -.-> SPA
  Shared -.-> Routes
  Shared -.-> Actions
  Shared -.-> Runtime
  Shared -.-> Generator
```

双向依赖问题

```mermaid
flowchart TB
  subgraph App["应用与接口模块"]
    Routes["routes.ts<br/>HTTP / SSE 用例入口"]
    Actions["actions.ts<br/>玩家行动总编排"]
  end

  subgraph AI["AI 能力模块"]
    Runtime["runtime.ts<br/>世界导演 / NPC / 自由动作 / 战斗"]
    AiClient["client.ts + providers.ts<br/>模型协议与请求"]
  end

  subgraph Domain["领域模块"]
    Intent["intent.ts<br/>意图解析"]
    EngineCore["engine 领域核心<br/>authority / scenes / worldTick<br/>combat / memory / interaction"]
    StorySim["storySim.ts<br/>无干预模拟"]
  end

  subgraph World["世界生成模块"]
    Generator["generator.ts<br/>AI 世界生成"]
    Presets["presets.ts"]
    Seed["seed.ts + jianghu.ts<br/>预设世界与内置内容"]
  end

  Shared["shared/types.ts<br/>约 1000 行横切共享契约"]

  Routes --> Actions
  Actions --> EngineCore
  Actions --> Runtime
  Intent --> AiClient

  Runtime ==>|"直接调用 combat / memory / interaction"| EngineCore
  EngineCore -.->|"反向依赖 AiRuntime 类型"| Runtime

  StorySim ==>|"导入 world/presets"| Presets
  Presets --> Seed
  Seed ==>|"导入 engine/story/stats/combat/interaction"| EngineCore
  Generator ==>|"导入 engine/story/stats"| EngineCore

  Shared -.-> Routes
  Shared -.-> Actions
  Shared -.-> Intent
  Shared -.-> Runtime
  Shared -.-> EngineCore
  Shared -.-> StorySim
  Shared -.-> Generator
  Shared -.-> Seed

  ProblemA["问题 1<br/>AI 能力模块 ↔ 领域模块<br/>形成双向依赖"] -.-> Runtime
  ProblemA -.-> EngineCore

  ProblemB["问题 2<br/>领域模拟模块 ↔ 世界生成模块<br/>形成双向依赖"] -.-> StorySim
  ProblemB -.-> Presets
  ProblemB -.-> Seed

  ProblemC["问题 3<br/>领域代码直接依赖 AI Client<br/>trusted boundary 被穿透"] -.-> Intent
  ProblemC -.-> AiClient

  ProblemD["问题 4<br/>共享类型单文件横切所有层<br/>变更影响范围大"] -.-> Shared

  ProblemE["问题 5<br/>actions / runtime / routes 高扇出<br/>编排逻辑集中在少数大文件"] -.-> Actions
  ProblemE -.-> Runtime
  ProblemE -.-> Routes

  classDef problem fill:#fee2e2,stroke:#dc2626,color:#450a0a
  classDef hotspot fill:#fef3c7,stroke:#d97706,color:#451a03
  classDef shared fill:#ede9fe,stroke:#7c3aed,color:#2e1065

  class ProblemA,ProblemB,ProblemC,ProblemD,ProblemE problem
  class Routes,Actions,Runtime hotspot
  class Shared shared
```

理想依赖优化

```mermaid
flowchart LR
  Interface["接口层"] --> Application["应用编排层"]
  Application --> DomainPort["领域端口 / 领域服务"]
  Application --> AiAdapter["AI 适配器"]
  AiAdapter --> DomainPort
  Application --> WorldService["世界生成服务"]
  WorldService --> DomainPort
  Infrastructure["基础设施与存储"] --> DomainPort
```

### 玩家时序图

```mermaid
sequenceDiagram
  autonumber
  actor Player
  participant UI as 游戏界面
  participant Server as 游戏服务
  participant World as 世界状态

  Player->>UI: 输入行动
  UI->>UI: 锁定输入框并显示等待状态
  UI->>Server: 提交行动

  activate Server
  Note over Server: AI 解析、AI 提案、权威校验、世界 tick<br/>全部隐藏在这个黑盒内部

  Server->>World: 读取当前地点、时间、战斗、对话、任务与剧情
  World-->>Server: 返回当前状态

  Server->>World: 结算玩家行动

  alt 行动不成立
    World-->>Server: 状态不变，返回拒绝原因
    Server-->>UI: 返回不成立的叙事结果
  else 行动成立
    opt 行动跨过自然日
      Server->>World: 推进传闻、事件、NPC 与世界剧情
    end

    Server-->>UI: 流式返回叙事文本
    UI-->>Player: 实时显示旁白

    Server-->>UI: 返回行动后的完整状态
  end
  deactivate Server

  UI->>UI: 更新时间、位置、气血、灵力、背包、任务和剧情面板

  alt 进入战斗
    UI-->>Player: 显示招式面板与生死选择
  else 进入对话
    UI-->>Player: 显示对话面板和可继续输入状态
  else 一般行动结果
    UI-->>Player: 显示新场景、行动结果和下一步输入框
  end
```

### 服务端行动处理时序图

```mermaid
sequenceDiagram
  autonumber
  actor Player
  participant Browser as Browser SPA
  participant API as Server API / SSE
  participant Orchestrator as Game Orchestrator
  participant AI as AI Runtime
  participant Authority as Authority
  participant Tick as World Tick
  participant Store as SQLite / Logs

  Player->>Browser: 提交行动
  Browser->>API: POST /api/game/action
  activate API
  API->>Store: 开启 turn + 记录玩家输入

  API->>Orchestrator: 解析意图并执行行动
  activate Orchestrator
  Note over Orchestrator: 包含 intent.ts 与 actions.ts

  alt 普通文本且规则无法确定
    Orchestrator->>AI: 将文本解析为 PlayerIntent
    AI-->>Orchestrator: PlayerIntent
  end

  alt 确定性行动
    Orchestrator->>Authority: 执行领域规则并修改状态
  else 自由行动 / NPC 对话 / 战斗选招
    Orchestrator->>AI: 请求 WorldProposal / DialogueResult
    AI-->>Orchestrator: AI 提案或执行结果

    Orchestrator->>Authority: 校验并原子提交
    activate Authority
    Note over Authority: 校验来源、权限、在场性、效果形状

    alt 校验失败
      Authority-->>Orchestrator: 拒绝或阻断，不修改状态
    else 应用失败
      Authority->>Authority: restoreState(snapshot)
      Authority-->>Orchestrator: 提交失败并回滚
    else 提交成功
      Authority-->>Orchestrator: CommitResult accepted
    end

    deactivate Authority
  end

  alt 时间跨过自然日
    Orchestrator->>Tick: runWorldTick
    activate Tick
    Tick->>AI: 请求 WorldPlan 与记忆压缩
    AI-->>Tick: storyActions + directives

    Tick->>Authority: 提交世界变化
    Authority-->>Tick: CommitResult

    Tick->>Tick: 事件、剧情、队伍和传闻结算
    Tick-->>Orchestrator: tick logs
    deactivate Tick
  end

  Orchestrator->>Authority: 剧情推进与收尾结算
  Orchestrator-->>API: ActionResult
  deactivate Orchestrator

  API->>Store: saveGame(state)
  API->>AI: 请求流式叙事
  activate AI

  loop 叙事分块
    AI-->>API: text chunk
    API-->>Browser: SSE event: chunk
  end

  AI-->>API: final narration
  deactivate AI

  API->>Store: 记录叙事与 AI 日志并 flush
  API-->>Browser: SSE event: done { state, narration, result }
  deactivate API
```

### 世界日推进时序图

```mermaid
sequenceDiagram
  autonumber
  participant Caller as Action Orchestrator
  participant Tick as World Tick
  participant Rules as World Rule Systems
  participant Scenes as Scene System
  participant Memory as NPC Memory
  participant Director as World AI
  participant Authority as Authority
  participant Story as Story Engine
  participant Store as SQLite / Logs

  Caller->>Tick: runWorldTick(state, runtime)
  activate Tick

  Tick->>Rules: 扩散地区传闻
  Rules-->>Tick: 邻接地区传闻更新

  Tick->>Rules: 结算过期或无法继续的任务
  Rules-->>Tick: 任务失败效果
  opt 存在任务失败效果
    Tick->>Authority: 原子提交任务状态变化
    Authority-->>Tick: CommitResult
  end

  Tick->>Rules: 商店补充低库存商品
  Rules-->>Tick: 库存更新

  Tick->>Scenes: 生成 NPC 冲突
  Tick->>Scenes: 推进持久与临时场景
  opt 场景满足结算条件
    Scenes->>Director: 请求场景结局
    Director-->>Scenes: 场景 outcome
  end
  Scenes-->>Tick: 场景日志与状态变化

  Tick->>Memory: 压缩过期 NPC 记忆
  alt World AI 可用且存在旧记忆
    Memory->>Director: 汇总事实、关系、承诺与摘要
    Director-->>Memory: 结构化记忆摘要
    Memory->>Authority: 提交 memory_compression 效果
    Authority-->>Memory: CommitResult
  else 无 AI 或摘要为空
    Memory->>Memory: 确定性淘汰低价值旧记忆
  end
  Memory-->>Tick: 记忆压缩结果

  Tick->>Rules: 结算到期世界事件
  Rules-->>Tick: 事件结局与区域影响
  opt 世界事件推进任务
    Tick->>Authority: 提交任务进度效果
    Authority-->>Tick: CommitResult
  end

  Tick->>Rules: NPC 恢复气血、灵力与受伤状态

  Tick->>Story: 构建当前剧情上下文
  Story-->>Tick: 当前节拍、剩余时间、允许信号

  alt World AI 已配置
    Tick->>Director: worldPlan(state, storyContext)
    Note over Tick,Director: 世界 AI 只输出计划，不直接写状态
    Director-->>Tick: storyActions + directives

    alt 存在可执行世界指令
      Tick->>Authority: 提交普通世界指令产生的效果
      Authority-->>Tick: accepted 或 discarded + warning
      Tick->>Story: 应用 story_beat / story_ending
      Story-->>Tick: 动态节拍或新结局
    else 没有有效世界指令
      Tick->>Rules: 执行确定性世界事件
      Rules-->>Tick: 事件日志
    end

    Tick->>Story: 应用 story_signal
    Story-->>Tick: 信号生效或忽略
  else 无 World AI
    Tick->>Rules: 执行确定性世界事件
    Rules-->>Tick: 事件日志
  end

  Tick->>Story: advanceStory(state)
  Story-->>Tick: 节拍转移、剧情结算或最终结局

  Tick->>Authority: 结算剧情触发的队伍离队
  Authority-->>Tick: CommitResult

  Tick-->>Caller: 返回本日 tick logs
  deactivate Tick

  Caller->>Store: saveGame(state)
  Store-->>Caller: 状态保存完成
  Caller->>Store: 记录世界 AI 计划、警告与本日日志
  Caller->>Store: flushLogs
  Store-->>Caller: 日志写入完成
```

### ai提交与校验

```mermaid
flowchart LR
  AI["不可信 AI 输出<br/>自由行动 / 世界计划 / NPC 对话 / 记忆摘要"]

  Normalize["归一化与适配<br/>结构解析 / 类型白名单 / 数量限制"]

  Proposal["WorldProposal<br/>actionSummary + claimedFacts + effects"]

  subgraph TrustedBoundary["可信边界"]
    Authority["Authority<br/>校验 + 快照 + 原子应用<br/>失败时整批回滚"]
    State["GameState"]
    Authority --> State
  end

  Rejected["rejected / blocked<br/>GameState 不发生变化"]
  Rollback["执行异常<br/>restoreState(snapshot)"]
  Accepted["CommitResult accepted<br/>facts / logs / timeCost / dayCrossed"]

  AI --> Normalize
  Normalize --> Proposal
  Proposal --> Authority

  Authority -->|"校验失败"| Rejected
  Authority -->|"应用异常"| Rollback
  Authority -->|"全部成功"| Accepted

  Accepted --> Caller["调用方继续行动编排"]
  Caller --> Persist["saveGame(state)<br/>持久化到 SQLite"]

  Guarantee["Authority 的保证<br/>来源有权限<br/>实体存在且在场<br/>效果类型受控<br/>整批成功或整批失败"]
  Guarantee -.-> Authority

  classDef untrusted fill:#ffedd5,stroke:#ea580c,color:#431407
  classDef trusted fill:#dbeafe,stroke:#2563eb,color:#172554
  classDef result fill:#fee2e2,stroke:#dc2626,color:#450a0a
  classDef success fill:#dcfce7,stroke:#16a34a,color:#052e16
  classDef persist fill:#ede9fe,stroke:#7c3aed,color:#2e1065

  class AI untrusted
  class Authority,State trusted
  class Rejected,Rollback result
  class Accepted,Caller success
  class Persist,Guarantee persist
```

### 主线推进机制图

```mermaid
stateDiagram-v2
  [*] --> NotStarted
  state "未开始" as NotStarted
  state "当前 Beat" as CurrentBeat
  state "动态 Beat" as DynamicBeat
  state "下一 Beat" as NextBeat
  state "收尾 Beat" as ClosingBeat
  state "已结束" as Ended

  NotStarted --> CurrentBeat: advanceStory / 激活首个 Beat

  CurrentBeat --> NextBeat: time / 正常时间推进
  CurrentBeat --> NextBeat: world_signal / 世界信号提前推进
  CurrentBeat --> NextBeat: NPC 或势力条件满足
  CurrentBeat --> NextBeat: timeout / 超时强制推进并记为 failed
  CurrentBeat --> NextBeat: cast_broken / 关键演员失效后跳过

  CurrentBeat --> DynamicBeat: story_beat / 插入动态节拍
  DynamicBeat --> NextBeat: time / timeout / 回到原下一节拍
  NextBeat --> CurrentBeat: 激活下一节拍
  NextBeat --> ClosingBeat: 下一目标是终局节点

  ClosingBeat --> Ended: terminal_outcome / 默认结局
  ClosingBeat --> Ended: story_ending / 导演给出新结局

  note right of CurrentBeat
    同一 Beat 的触发优先级：
    all_cast_dead > cast_broken >
    NPC/势力条件 > world_signal >
    time > timeout
  end note

  note right of DynamicBeat
    插入条件：
    当前 Beat 有唯一下一目标
    最多插入 3 次
    每天最多插入 1 次
    动态节拍按 time=2、timeout=4 推进
  end note

  note right of ClosingBeat
    收尾 Beat 的下一目标必须是 terminal
    story_ending 只能在这里生效
  end note
```

动态节拍是世界 AI 在主线运行过程中，为了回应玩家行为或世界变化，临时插入“当前节拍”和“原下一节拍”之间的一段主线剧情。

### 内置剧情主线图

```mermaid
stateDiagram-v2
  direction LR

  [*] --> LingmaiRumor

  state "灵脉异动初显<br/>beat_1_1" as LingmaiRumor
  state "夜袭矿洞<br/>beat_1_2" as NightRaid
  state "黑风寨内乱<br/>beat_1_3" as StrongholdChaos
  state "宗门勘察<br/>beat_2_1" as SectInvestigation
  state "灵脉对峙<br/>beat_2_2" as VeinShowdown
  state "收徒榜文<br/>beat_2_3 · 收尾 Beat" as TrialAnnounce
  state "收徒试炼<br/>beat_2_4 · 默认结局" as Trial

  state "动态节拍<br/>由世界 AI 插入" as DynamicBeat
  state "导演结局<br/>替换默认结局" as DirectorEnding

  LingmaiRumor --> NightRaid: time 4 天<br/>world_signal 灵脉异动传闻
  LingmaiRumor --> SectInvestigation: timeout 7 天

  NightRaid --> SectInvestigation: time 4 天 / timeout 7 天
  NightRaid --> StrongholdChaos: npc_dead(tiemian)

  StrongholdChaos --> SectInvestigation: time 4 天 / timeout 7 天

  SectInvestigation --> VeinShowdown: time 4 天 / timeout 7 天<br/>world_signal 宗门查明线索
  VeinShowdown --> TrialAnnounce: time 4 天 / timeout 7 天<br/>faction qingyun-zong ≥ 30

  TrialAnnounce --> Trial: time 4 天 / timeout 7 天<br/>world_signal 收徒榜文张贴
  Trial --> [*]

  TrialAnnounce --> DirectorEnding: story_ending<br/>仅在收尾阶段生效
  DirectorEnding --> [*]

  StrongholdChaos --> DynamicBeat: story_beat
  DynamicBeat --> SectInvestigation: time 2 天 / timeout 4 天

  SectInvestigation --> DynamicBeat: story_beat
  DynamicBeat --> VeinShowdown: time 2 天 / timeout 4 天

  VeinShowdown --> DynamicBeat: story_beat
  DynamicBeat --> TrialAnnounce: time 2 天 / timeout 4 天

  TrialAnnounce --> DynamicBeat: story_beat
  DynamicBeat --> Trial: time 2 天 / timeout 4 天

  note right of NightRaid
    本世界没有编译出 cast_broken 转移。
    铁面死亡通过 npc_dead(tiemian)
    进入黑风寨内乱。
  end note

  note right of DynamicBeat
    只能插入到唯一下一目标的 Beat。
    每天最多 1 次，总计最多 3 次。
    动态 Beat 的 time 为 2 天，
    timeout 为 4 天。
  end note

  note right of TrialAnnounce
    下一目标是终局 Beat，
    因此这里进入收尾窗口。
    世界 AI 可以发出 story_ending。
  end note
```

### NPC记忆生命周期图

```mermaid
flowchart LR
  subgraph Sources["事件来源"]
    Dialogue["NPC 对话与 AI remember"]
    Interaction["赠送 / 传授 / 攻击 / 战斗"]
    WorldEvent["世界事件 / 传闻 / 场景"]
    WorldAI["世界 AI 计划"]
  end

  WriteRouter["记忆写入分类<br/>appendEpisode / appendFact / recordBelief<br/>appendSummary / queueNpcEvent / appendChat"]

  EpisodeWrite["episode 写入<br/>直接追加"]
  SemanticWrite["fact / belief / summary 写入"]
  PendingWrite["pending 写入<br/>importance >= 0.5"]
  ChatWrite["chatLog 写入<br/>截断到 120 字"]

  Dedup["文本归一化 + Jaccard >= 0.75<br/>相似 fact / belief / summary 合并<br/>fact 累加 occurrences"]

  Store["NpcBrain 六个独立记忆桶<br/>episodes 40 / facts 40 / beliefs 30<br/>summaries 5 / pending 10 / chatLog 4"]

  Score["memoryScore<br/>importance × 0.98^age × recencyBoost"]
  Trim["容量治理<br/>protected 最多 5<br/>淘汰低分非保护项<br/>pending 溢出转 fact<br/>chatLog 丢弃最旧记录"]

  Read["buildMemoryText<br/>读取预算：belief 6 / fact 8<br/>episode 5 / summary 2<br/>pending 3 / chat 4"]
  LastAccess["更新 lastAccessedDay"]
  NpcContext["NPC 对话上下文"]
  WorldCard["buildWorldCards<br/>读取 pending"]
  Director["世界 AI 导演"]

  Tick["跨天 World Tick"]
  Stale["扫描旧 episodes<br/>age > 3 且 importance < 0.7<br/>数量至少 5 条"]
  AiSummary["AI 摘要<br/>facts / promises / relations / summary"]
  Authority["Authority 提交 memory_compression"]
  Prune["删除已压缩的原始 episodes"]
  Offline["无 AI 或摘要为空<br/>淘汰 age > 5 且 importance < 0.4"]

  Dialogue --> WriteRouter
  Interaction --> WriteRouter
  WorldEvent --> WriteRouter
  WorldAI --> WriteRouter

  WriteRouter --> EpisodeWrite
  WriteRouter --> SemanticWrite
  WriteRouter --> PendingWrite
  WriteRouter --> ChatWrite

  EpisodeWrite --> Store
  SemanticWrite --> Dedup
  Dedup --> Store
  PendingWrite --> Store
  ChatWrite --> Store

  Store --> Score
  Score --> Trim
  Trim --> Store

  Store --> Read
  Read --> NpcContext
  Read --> LastAccess
  LastAccess --> Score

  Store --> WorldCard
  WorldCard --> Director

  Tick --> Stale
  Stale --> AiSummary
  AiSummary --> Authority
  Authority --> SemanticWrite
  Authority --> Prune
  Prune --> Store

  Stale --> Offline
  Offline --> Store

  classDef source fill:#dbeafe,stroke:#2563eb,color:#172554
  classDef write fill:#dcfce7,stroke:#16a34a,color:#052e16
  classDef memory fill:#ede9fe,stroke:#7c3aed,color:#2e1065
  classDef read fill:#cffafe,stroke:#0891b2,color:#164e63
  classDef compress fill:#fef3c7,stroke:#d97706,color:#451a03

  class Dialogue,Interaction,WorldEvent,WorldAI source
  class WriteRouter,EpisodeWrite,SemanticWrite,PendingWrite,ChatWrite,Dedup write
  class Store,Score,Trim memory
  class Read,LastAccess,NpcContext,WorldCard,Director read
  class Tick,Stale,AiSummary,Authority,Prune,Offline compress
```
记忆桶约束

| 记忆桶 | 容量 | 读取预算 | 主要行为 |
|---|---:|---:|---|
| `episodes` | 40 | 5 | 按时间追加，不合并，是跨天压缩的主要对象 |
| `facts` | 40 | 8 | 相似内容合并，累计 `occurrences` |
| `beliefs` | 30 | 6 | 相似认知合并，记录 NPC 的主观判断 |
| `summaries` | 5 | 2 | 保存压缩后的长期摘要 |
| `pending` | 10 | 3 | 重要事件待处理队列，溢出时最旧一条降级为 `fact` |
| `chatLog` | 4 | 4 | 单条最多 120 字，只保留最近几句对话 |


## 反思与心得

### 需求规格

这次的需求输出还行, 主要是自己玩过很多游戏, 然后即时的借助了ai不断梳理知识点

### 设计与开发

但是在架构/模块设计上面还是有很多问题, 之前搞过一些, 由于ai不听话, 所以这次想的是用MVP快速验证, 避免效果还没出来, 自己就不行了

发现可能还是得自己先理解, 不然对项目的掌控力会越来越弱

### 验证与修复

最后是验证与修复环节, 中间试图使用aiProgram3 提到的循环验证, 即开启多个子代理扮演不同角色, 然后按照单线程的方式进行
提单=>问题审核=>开发修复=>修改审核=>关单的流程

但是发现还是不行, 还是需要人, 因为ai是一定会出错的,tmd, 就算只有0.0001%的概率, 它每个步骤累计起来, 那就很让人头疼了

关键是, ai出错, 你不知道它会错在哪里, 要是你自己写的话, 你可能会猜到自己在哪个模块随便搞了下, 出错概率比较大

ai就不行了, tmd, 很容易改完一个问题, 但是又改出新问题(你很难想到的位置), 或者把之前的问题又搞出来了, 防不胜防

> 另外提一嘴, gpt 5.6sol很喜欢搞tdd, 这个修复小问题还行, 在大问题上很容易迷失方向, 或者说注意力偏差

此外, ai容易出错, 或者说和你的预期不符, 它的原因可能是多样的, 不仅仅是因为现在的大模型是概率模型, 

还包含开发者思路不清晰, prompt传递有问题(语言歧义), ai理解有偏差, 开发者有独特于训练集的思路等等

所以, ai辅助开发, 是一定一定需要人参与的

### 优化

设计: 需要在ai的帮助下, 尽可能地猜想项目的边界, 架构设计需要清晰, 模块需要尽可能的保持扩展性, 高内聚低耦合
验证: 需要先完善需求规格, 模块接口合理, 然后设计测试方案, 对不同的功能模块进行业务专项测试

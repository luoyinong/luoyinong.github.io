---
title: AI辅助编程实践
date: 2025-12-27 10:00:00
categories:
- AI
tags:
- AI
- GitHub Copilot
- 编程工具
---

## 背景

这两年AI发展迅速, 尤其是编程方面, 或许是因为训练数据充足(～￣▽￣)～, 之前还说过AI的回答很有可能充斥着幻觉, 不是高手还真看不出来

那么来到写代码这个领域呢, 之前也用过AI进行1辅助编程, 但也只是生成片段或者批量修改某些变量, 并不能看出AI编程的强度, 

这一次我将只负责设计以及少许的debug

## 工具

vscode + copilot + auto model

## 定义

### instructions

Create repository custom instructions files that give Copilot additional context on how to understand your project and how to build, test and validate its changes.[链接](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-organization-instructions)

这是github说明

翻译过来就是instructions可以提供**上下文**, 你不可能在使用AI时一直只用一个chat, 切换不同chat时, 肯定还是需要某些相同的上下文, 

比如项目编码规范, 组件列表, api位置等等, 这个时候就需要instructions了

> 这里不考虑另外两种instructions

### prompt

A prompt is a request that you make to GitHub Copilot. For example, a question that you ask Copilot Chat, or a code snippet that you ask Copilot to complete. In addition to your prompt, Copilot uses additional context, like the code in your current file and the chat history, to generate a response.

Follow the tips in this article to write prompts that generate better responses from Copilot.

这是github说明

翻译过来就是你向AI发的请求都是prompt, 很显然, 作为一个聪明的人, 你在使用AI的过程中, 肯定有某些重复的请求, 比如 说中文(～￣▽￣)～

所以呢, 我们同样需要保存某些prompt(更加准确, 规范的), 以复用

### MCP server

MCP (Model Context Protocol) is an open-source standard for connecting AI applications to external systems.
Using MCP, AI applications like Claude or ChatGPT can connect to data sources (e.g. local files, databases), tools (e.g. search engines, calculators) and workflows (e.g. specialized prompts)—enabling them to access key information and perform tasks.
Think of MCP like a USB-C port for AI applications. Just as USB-C provides a standardized way to connect electronic devices, MCP provides a standardized way to connect AI applications to external systems.

这是官方说明

简单点就是, MCP首先是个协议, 然后呢, AI本来只能从自己内部系统中拿到数据, 使用MCP协议后, AI可以通过MCP工具连接到其它工具, 比如你的日历, 在你规划今天的日程时, 它可以根据日历上的排期为你给出建议

## 思路

由于没啥用AI编写项目的经验, 所以我决定先从借鉴开始

1. 这是github自己出的一个AI常用指令集合, 可以参考一下[awesome-copilot](https://github.com/github/awesome-copilot)
2. 小试牛刀, 创建一个demo级项目, 了解AI的性能, 以及怎么合作, 并总结出一套自己的流程与规范
3. 初露峥嵘, 解决自己在实际工作中遇到的的问题, 优化之前的流程
4. 发散思考, 找出其它可借助AI的场景, 并逐步实现AI替换人工

## 小试牛刀

最近项目正在搞web转码, 将设备传过来的视频流包装成mp4格式, 我对此也有点感兴趣, 查阅资料后得知纯web的话, 可以换容器格式, 但是编码的话会有兼容问题, WebCodecs这个浏览器api可以调用电脑的硬件来解码, 只是有些浏览器的旧版本不支持, 需要服务器进行转码做兜底

既然如此, 那就做一个demo级的转码项目, 试试AI的能力

### videoServer prompt

首先我将自己的需求整理了一下, 大致有如下内容

```sh
## 架构

### 技术栈

服务器使用express+nodejs, 页面使用vue3+js+scss, 不使用数据库保存, 视频直接存在本地

## 功能

### 主要功能

1. 没有登录, 只是作为一个demo网站
2. 可以上传各种格式的视频, 网站将视频保存下来
3. 保存的视频可以在网站上观看
4. 观看视频时可以选择编码格式, 并且进入网站后, 会自动选中浏览器支持的格式


### 规格说明

1. 上传的视频格式包含常见的格式如mp4, avi, mov, mkv, flv
2. 视频编码格式可以是h264, h265, av1
3. 视频里的音频格式可以是MP3, AAC, FLAC, APE, ALAC, WAV
```

然后让AI帮我设计详细的文档, 并且一旦有疑问, 一定要问我

> 让AI分析并提出问题这一点很重要

这是AI完善后的文档, 详细内容可以去AiDemo项目里查看

@图1

@图2

@图3

@图4

可以说是比较好的了, 至少比我自己写的好很多

接下来便是让AI按照设计文档分步骤进行开发

解决完几个小问题后, 运行项目

@图5

@图6

@图7

@图8

速度非常快, 大概就花了两个多小时, 就让这个demo级的项目跑了起来, 运行也没有发现问题, 

唯一需要值得**注意**的地方就是: AI容易**左右脑互博**, 改一个问题很容易改来改去, 最后还引入了新问题, 

这个时候, 你作为一个设计者, 应该引导AI, 比如让AI先进行分析, 然后给出解决方案, 最后你再决定使用哪种方案,

或者提供AI之前没有注意到的问题(很少见, 但也不是没有)



## 初露峥嵘

在日常工作中, 有许多可以让AI介入的场景, 为了简单起见, 我选择了辅助代码检视, 原因无他, 这项工作比较符合AI的能力范围, 也有一定的挑战难度

### 目前的问题

在代码检视的过程中, 我遇到了如下问题

1. 自己commit时很难发现自己代码的问题, 除非写代码和提交代码的间隔比较长
2. 别人提交的MR经常会有重复性的问题, 很麻烦, 说了这次改后, 下次又不记得了, 之后照样犯

### 解决方案

上面两种场景都可以使用AI来解决, 甚至说是一种比较好的方式, 我可以将自己或者别人的问题积累下来, 作为prompt放进AI里, 让它来检视

> 这种工作方式国外的大厂貌似已经打通了, 我想也试试降本增效ψ(｀∇´)ψ

但是呢, 使用AI的话还有一个问题, 它很难去获取MR里提交的内容, 除非你将内容复制给它, 这样会很麻烦, AI也不好给出检视意见

这时我有两种方案

1. 开发出一个浏览器插件, 通过MCP连接vscode的copilot, 使得copilot能够获取MR内容
2. 开发一个vscode插件, 获取gitlab的MR, 然后让copilot拿到MR内容

很显然, 第二种方案更加简单与实用, 因为copilot就在vscode上, 并且vscode自带diff视图, 检视非常方便

### codeReview实现

按照管理, 我先搜索了一下vscode插件市场是否有类似的插件, 结论是有的, gitlab官方就有插件, 可惜的是连接不了公司部署的gitlab实例, 可能是被屏蔽了, 或者版本太老

所以还是得自己来, 老样子, 先上项目文档

```sh
## 目标

开发一个vscode插件, 让copilot帮助我进行代码审查, 包含我自己在本地将要提交的代码, 以及别人提交到仓库的merge request

## 技术栈

语言:js
运行时环境:nodejs
额外api: 1. vscode extension api 2. gitlab v4版本 api


## 主要功能

1. 展示个人用户的merge requests列表(可以过滤author和assignee)
2. 可以进入merge request查看更改的代码, 使用vscode的git diff查看

## 开发环境

nodejs 16
操作系统 window 11
```

走了一遍老流程之后, 大概花了一个下午(4个小时), 完成了初版, 调试是没有问题了, 但实际应用还是有问题

1. 虽然使用的是cjs, 但引入的三方库, 所以只用vsce打包会遇到找不到三方库的bug
2. diff视图好是好, 但是vscode的类型系统无法识别变更文件的类型, 
3. diff只会显示变更的片段
4. 支持个人令牌和OAuth认证, 但是只有个人令牌的数据会做持久化存储
5. 跨项目MR会涉及到无权限问题
6. 由于不是真是文件, copilot无法获取文件内容

等等, 就不在此一一列举了

好在我对此还是有些了解的, 所以在AI的协助下将其全部解决, 用了差不多3个小时

MR列表

@图9

过滤asignee

@图10

过滤author

@图11

他人MR

@图12


自己MR

@图13

AI检视

@图14

个人使用上目前没发现问题, 可能还需要后续持续的使用

## 发散思考

在小试牛刀时, 我觉得自个有些多余了, 好在实际项目一套整下来后, 我还是有点用的, 虽然不多

整体看下来, AI的强大毋庸置疑, 只是你作为设计师, 需要对项目有一定的了解以及调试能力, 另外, AI写的代码大概就是初级工程师的水平

@图15

不是说一定要用什么设计模式, 那样反而蛋疼(自己看不懂), 而是说要提前约定好规范, 免得AI犯病, 引入一些无用代码(发现过)

这两天试下来, 大致可以确定现阶段的AI还无法完全代替人类工程师

> 项目规模越大， AI分数越低，很考验设计师的思路和方法

最主要的原因不是它的心智不够, 而是还没有与现实世界建立全面的联系, 比如无法自己调试程序, 没法获得电脑的控制权等等

但是使用AI的场景依然有很多, 比如写单元测试用例, 重构模块, 写change log, 这些AI都是可以做到的, 并且可以搞个prompt file

以后都让AI做

### 熟虑

曾经思考过一个问题, AI越来越强大, 会不会让我失业, 有的人说古代到现代, 农民也没有失业, 生产力的提高反而让农民更好过了

但这种说法其实隐藏了一个比较致命的问题, 那就是转型所带来的结构性失业, 在转型过程中, 必定是有一群人成会成为代价

不过呢往好处想, 现在国家正在搞数字信息化转型, AI带来的强大生产力提升说不定会引发第二次大基建呢



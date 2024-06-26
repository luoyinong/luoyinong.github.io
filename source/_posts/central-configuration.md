---
title: 翻新旧项目之抽取公共配置
date: 2024-06-02 12:15:15
categories:
- 翻新旧项目
tags:
- 前端
- webpack
- 设计
---

# 前言

旧项目除了配套设施老旧之外, 还有一个问题就是依赖混乱, 难以管理, 存在大量重复的配置, 但是各个项目

又有些独特的配置

如果说不想优化**打包速度**以及**缩小**文件**体积**的话, 那么可以完全不管

然而这确实是一件需要解决的事情 (**领导要求**)

所以无论是为了完成要求还是为了将来可能升级vue3, 都需要将旧项目的配置和依赖统一管理起来

## 思路

目前状况: 有六个前端项目, 四个pc段, 两个app端, 用的都是vue2+webpack

> 不过版本稍微有些不同, 有些是直接使用的webpack, 有些是用vue-cli@2或者vue-cli@4

 @图1

这是大概的一个状态

可以看到不同项目之间, 不仅是dependencies有大量相同的依赖, devDependencies也有

那么我的思路如下:

1. 抽离dependencies里的element-ui, vue, vue-router, axios等, 放到widget(组件库)里面
2. 抽离devDependencies里的babel, eslint, husky, webpack等, 放到单独的npm包buildTools里
3. buildTools提供基础的webpack配置, babel配置, eslint配置等, 各个项目引用后进行更改

@图2

buildTools具体实现请看 [nodejs-packge篇](/2024/05/19/nodejs-package)

这样一来, 每个项目基本只用负责管理自己的dependencies, 公共的依赖由组件库和buildTools进行管理

## 可能的问题

### 会不会给项目引入不必要的依赖

答案是**不会**

组件库只包含运行时必要的依赖, 如element ui, vue, vue-router等, 这些确实都是组件库自身所需要的
项目库需要剔除的就是这些组件库包含的依赖

至于devDependencies依赖, 同理, builTools只会把必要的插件放到dependencies, 如webpack, babel, eslint等

### 为什么不再细分配置文件成preset

目前的项目只会在部门使用, 没必要将babel, eslint等配置文件作为npm包单独发布, 避免**过度设计**, 各个项目直接引用即可

### 会不会导致项目出现bug

可能会有, 需要验证, 不过升级时已经尽量保证**不动**项目**代码**了

由于这个是**领导要求**的, 所以不算私自升级, 可以让各个项目的前端**责任人**进行**辅助**

然后准备是放到两个大版本之间进行升级 (那个时候开发和测试都没有需求压力)

> 比较急迫的eslint+husky则是已经放到项目里了, 这个倒是不会导致代码bug
> 组件库的单元测试也是加上了, 这个也同样不会导致bug

### 项目A开发时发现element ui某个版本有bug, 更新element ui版本不方便

**确实**是有些不方便, 需要先升级组件库的element-ui版本, 然后再升级项目的版本

**但是**, 这种升级方式也保证了其它项目能够及时接受升级, 避免出现和项目A一样的bug

### 升级公共依赖需要到每个项里面去升级, 是不是有些麻烦

如果不从工程化的角度看的话, 那确实是有优化手段的, 比如CDN不指定版本号 或者 webpack5的module federation

> module federation更倾向于微前端方式的共享代码

**但是**

从严谨的角度来看, 任何代码的改动必须经过测试的验证, 尤其是核心模块, 项目的依赖不能随便更新

不过呢, 之前就说过, 前端属于是游离在安全边界的东西, 所以有些公司前端的依赖并不会固定版本

```json
{
  "axios": "^1.1.1"
}
```

而是会使用最新小版本的依赖

然而, 我们作为开发, **没事**还是不要给自己**挖坑**

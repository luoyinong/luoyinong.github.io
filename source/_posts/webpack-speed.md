---
title: webpack5打包加速
date: 2024-05-25 10:41:15
categories:
- webpack
tags:
- 前端
- webpack
---

# 前言

记录一下优化webpack5项目的过程

之前通过升级nodejs, babel, webpack等东西, 顺利将打包时间从44秒降到了34秒左右, 提升大约有20%

这只是工具链的版本升级, 不涉及到配置的修改(除了缓存那个),  [翻新旧项目之webpack](/2024/05/19/webpack#本地构建加速)

这次将说一下配置上的修改以及效果

## 思路

1. 查看webpack文档, 看下官方的建议
2. 上网搜一下, 看下社区的建议
3. 根据过往经验, 结合上述建议形成方案

@图1

经过上述过程我的尝试方案为

1. 先给各个插件和loader测速
2. 缩小loader解析范围
3. 使用oneOf减少文件经过loader的数量
4. 使用Dlls减少打包插件的数量
5. 更改部分resolve配置(后缀那个改不了, 改动太大)
6. 尝试使用多线程
7. 关闭sourcemap
8. 去掉不必要的插件
  
不会考虑的方案

1. 使用缓存, 由于流水线是不会保留缓存的, 所以不考虑
2. 使用cdn拆分依赖, 项目这边暂时没有这个条件

## 实操

首先记录一下原始的时间

@图2

**33秒**

使用speed-measure-webpack-v5-plugin测速 (这是webpack5的插件)

@图3

## 无用方案

由于当时无效尝试没有截图, 所以直接上结论

### 缩小loader解析范围

无效, 缩短时间在0.1秒左右, 并且不稳定

@图4

可能是文件太少了, 只有几百个文件

### 使用oneOf减少文件经过loader的数量

无效, 无明显时间缩短

### 使用Dlls减少打包插件的数量

无效, 无明显时间缩短

我这边是加上dllplugin和DllReferencePlugin

将不常升级的vue, element-ui, aws-sdk, moment-timezone, ali-oss打包成dll

另外vue-cli和create-react-app都早已经将dllPlugin去除

@图5
@图6

文章参考: <https://www.cnblogs.com/skychx/p/webpack-dllplugin.html>

### 更改部分resolve配置

无效, 无明显时间缩短

我的是加上symlinks

@图7

### 尝试使用多线程

无效, 无明显时间缩短

### 关闭sourcemap

无明显时间缩短, 小于1s

> 之前用的是最快的那个

### 去掉不必要的插件

由于之前升级已经将eslint插件去除, 所以不知道效果, 按理来说应该会缩短个
几秒

## 结论

网上说的以及官网的方案不适合本项目

我猜测原因是, webpack本身优化已经很好了, 并且项目代码不是特别多, 原本也只要44秒, 所以官方的优化只是锦上添花,

至于网上的有些方案, hh, 只能说是屎里淘金

## 有效方案

观察图3会很容易发现一个问题, 那就是terserPlugin的耗时非常高

@图3

所以我决定从这个插件入手, 查看官网, 发现这个插件默认的压缩工具是terser

而我们可以还可以使用 uglify-js, swc, esbuild

我先使用了swc, 这是效果

@图9

实际构建速度

@图10

又快了11秒左右

综合之前的10秒, 加起来就快了22秒, **提速50%**, 这个效果算是非常可以了

然后又上网搜了一下, 还真有这方面的文章

[参考文章](https://juejin.cn/post/7236670763272798266)

不过他这有个问题

@图11

这正是本项目难受的地方 (要兼容IE), 所以最后没有选择使用esbuild-loader或者swc-loader来替换babel-loader

> 毕竟babel-loader可以按需polyfill, 并且loader所占的时间也不长

但是它们来压缩es5代码确实是可以的 (css用mini-css-extract-plugin, 避免样式出问题)

## 结尾

如果要解决一个问题, 网上能提供的方案还是挺多的, 但是质量低下的较多, 需要自己先找到**突破点**

然后据此再进行**深度搜索** (github, stackoverflow等)

## 彩蛋

这是使用一个国内的ai的结果

@图12

这个ai大概是不知道自己在说些什么的, 但总体来说还行

英文版
@图13

效果比起中文要好一些hh, 虽然还是有牛头不对马嘴的

然后再就是针对性突破

@图14

咋说嘞, 比起国内的一些不靠谱的博客是要好一点, 但是也及其考验阅读者的水平,

我估计新手看这文章很难将其转化为实践的步骤,

1. 因为知识点极为密集, 新手查着查着人就没了
2. 没有讨论, 里面的坑不会有其他人来指出, 试了就上当了
3. 没有实践指导, 基于其它文章生成

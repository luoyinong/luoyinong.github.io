---
title: jenkins升级nodejs
date: 2024-10-13 16:31:15
categories:
- 翻新旧项目
tags:
- nodejs
- 流水线
- jenkins
---

# 前言

上个版本一直没有升级流水线，主要是考虑到当时正在进行需求开发，贸然升级流水线nodejs的话会影响到其它开发以及测试，

所以需要一直等到大版本结束

之前已经在本地将所有的项目升级了（nodejs20+所有插件），具体请看之前的[升级](/2024/04/20/eslint/)，并且已经验证通过
这次将记录jenjin升级nodejs的过程，并将升级后的项目部署到联调环境

## 实践

一般而言，一个环境里只能装一个nodejs版本，如果要装多个的话就需要版本管理器，如nvm或者fnm，

许多博客在介绍jenkins切换nodejs版本时也是这么说的，

但是呢，jenkins自己是有nodejs插件的，并且支持在配置里切换nodejs版本

首先是添加nodejs插件（如果没装的话）

@图1

@图2

然后添加nodejs

@图3
@图4

可以选择自动安装，也可以手动安装

自动安装
@图5

手动安装的话，就可以到[官网](https://nodejs.org/download/release/)选择需要的安装包下载

@图6

注意了，这里不需要配置环境变量，许多博客说需要配置环境变量，如果使用本文的方法，那是不需要的

由于是验证，就再复制一个任务，而不是在之前的任务上修改

@图7
@图8

进入任务

@图9

选择需要的nodejs版本

@图10

之后就是使用脚本进行跑流水线了，这个脚本因公司而异，就不贴出来了

升级的效果是比较明显的，本地升到16的话，时间缩短了25%左右（nodejs20的话是50%）

而流水线则是更加明显，到了50%左右 （11min => 4m50s, 8m43s => 4m17s)

> 流水线慢主要是前端构建慢，所以领导一直想提升前端构建速度

## 遇到的问题

### glibc

之前升级时，是想一步到位，直接升到了nodejs20，结果服务报

/lib/x86_64-linux-gnu/libm.so.6: version `GLIBC_2.27' not found (required by node)

查阅得知是服务器Ubuntu版本太低，不支持nodejs20 （最高nodejs17）

要么升级ubuntu要么升级内核版本，运维认为影响比较大，所以只升到了nodejs16

### No matching version

由于是升级到了nodejs16而不是20，所以有些插件的版本出了问题，比如vuex-persistedstate这个插件，
4.x版本 + nodejs16会导致引入vue3的一些库，从而报错，

No matching version found for compiler-core@3.5.9

故需手动降低版本到3.x

> 还有一些插件也降了版本，不过没出问题，就不赘述了

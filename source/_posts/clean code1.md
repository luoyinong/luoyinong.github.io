---
title: 前端分享之clean code<待定>
date: 2024-06-09 18:45:15
categories:
- 分享
tags:
- clean code
- 分享
- 代码质量
---


# 前言

之前在[eslint篇]()说过, 提高代码质量最直接的手段是使用eslint, 以及流水线+单元测试检查, 然后就是间接的code review, 然而这些都是治标不治本

最根本的原因是开发心中没有代码质量这个概念, 所以也可以从提高相关开发的认知下手

> 外包的话, 可能就是懒得搞, 除非是安全要求

这篇是我给其它组员分享的ppt的md镜像版, 由于不方便将公司代码展示, 所以代码片段都**有所改动**

## 主题

主题分为:

1. 变量命名
2. 注释规范
3. 抽象与函数

## clean code

@图1

## 变量命名

起一个**恰到好处**的名字是一件非常困难的事情, 并且英文不是我们的**母语**, 所以会变得更加**困难**
但是, 变量名是我们理解代码的一个非常**重要**的**工具**, 尽管困难, 还是要做到最低限度的要求

即**名副其实**

除此之外, 还可以做到

1. 部分代替注释
2. 有意义的区分
3. 拥有上下文

### 名副其实

```JavaScript
export function checkPinXie(reg, value) {
  if (!value) return
  let str = value
  if (reg) {
    str = Pinyin.chToPinYin(value.replace(' ', ''))
  }
  return str
}

```

这段代码看得可能有点上头, 那它有什么问题呢

**名不副实**

1. checkPinXie不符合用途, 
2. reg不符合用途

**其它问题**

1. 返回值类型不一致
2. 标志位应该放在后面, 并且提供默认值
3. if语句最好加上{}, 即使是单条语句
4. 语句结尾最好使用分号

> if不加{}或者末尾不加分号, 可能导致eslint格式化出问题

那么应该怎么改呢

```JavaScript
export function strToPinYin(str, needTranslate = true) {
  if (!str) {
    return '';
  }

  if (needTranslate) {
    return Pinyin.chToPinYin(value.replace(' ', ''));
  }

  return str;
}

```

### 部分代替注释

示例1

```JavaScript
const arrayTools = {
  // 向数组末尾添加新的元素
  arrPush(array, item) {
    array.push(item)
    return array
  },

  // 向数组头部添加新的元素
  arrUnshift(array, item) {
    array.unshift(item)
    return array
  }
}

```

有什么问题

1. 注释不是越多越好
2. 变量命名起的好, 注释就可以少一点
3. 多余的注释反而会混淆重点

那么应该怎么改呢

```JavaScript
const arrayTools = {
  arrPush(array, item) {
    array.push(item)
    return array
  },

  arrUnshift(array, item) {
    array.unshift(item)
    return array
  },
}
```

> 这只是初步更改, 后面还有

示例2

```JavaScript
// 开发环境控制条调试
if (process.env.NODE_ENV === 'development') {
  new VConsole()
}

// do something

// console.log('appType', 'appUI', 'appVersion')
// appType = 'A' // 本地调试代码

// do something

// appUI = 'B' // 本地调试代码

```

**本地开发**时需要将调试代码**注释取消**, 然后**提交代码**时需要**重新注释**

风险还是比较大的, 也很麻烦

怎么改呢

```JavaScript
// @/utils.js

export function ifDevelopment(cb) {
  if (process.env.NODE_ENV === 'development') {
    cb()
  }
}

// main.js

ifDevelopment(() => new VConsole())

// do something

ifDevelopment(() => {
  console.log('appType', 'appUI', 'appVersion')
  appType = 'A'
})


// do something

ifDevelopment(() => appUI = 'B')
```

### 有意义的区分

@图2

> 这段代码由GitHub copilot生成, 逻辑可能有问题

有什么问题

1. 大量的重复代码
2. 命名没有区分度

怎么改

@图3

> 这里其实还可以再优化的, 比如把格式抽象出来, 就像dayjs一样
> 我这就懒得搞了

### 结合上下文

```JavaScript
const arrayTools = {
  arrPush(array, item) {
    array.push(item)
    return array
  },

  arrUnshift(array, item) {
    array.unshift(item)
    return array
  },
}
```

这段代码是不是有点熟悉? [示例一](#部分代替注释)

其实arr前缀是非常多余的, 所以还可以继续改

```JavaScript
const arrayTools = {
  push(array, item) {
    array.push(item)
    return array
  },

  unshift(array, item) {
    array.unshift(item)
    return array
  },
}
```

## 注释规范

@图4

作者的说法比较极端, 目前由于jsdoc的支持, 对某些函数进行注释, 以此表明它的参数, 返回值还是很有用的
但这不代表你一定要写注释

根据书籍中的推荐, 以及个人过往编码经历, 我认为这些地方是可以写注释的

### 好注释-jsdoc

```JavaScript
/**
 * Represents a book.
 * @constructor
 * @param {string} title - The title of the book.
 * @param {string} author - The author of the book.
 */
function Book(title, author) {
}
```

### 好注释-翻译

```JavaScript
// 至少8位, 且必须有数字+特殊字符+字母
function ValidatePassword(pwd) {
  const reg = /^(?=.*[A-Za-z])(?=.*\\d)(?=.*[`~!@#$%^&*()_+<>?:"{},.\\/\\\\;\'[\\]])[A-Za-z\\d`~!@#$%^&*()_+<>?:"{},.\\/\\\\;\'[\\]]{8,}$/
  return reg.test(pwd)
}
```

像正则这种信息量密集的东西, 不写个注释, 一般人还真的很难短时间呢看懂, 还容易漏

> 这一段我是网上抄的
> 当然, 如同clean code的作者所说, 注释也可能是错的, 
> 这就是另外一个问题了, 可以用单元测试来保证

### 好注释-概括

@图5

[图片来源](https://cloud.tencent.com/developer/article/1651333)

### 好注释-说明

类似于jsdoc, 这其实就相当于一个文档

```JavaScript
// 返回字符串如: 2022-06-01T06:50:53.985Z
function format(time) {
  // 格式化time
  // 返回格式化后的字符串
}
```

### 好注释-阐释背景

```JavaScript

function handleParams(time) {
  
  // 正常的逻辑

  // element ui@13.1.1版本的bug, 等后续修复
  // 修复bug

  // 正常的逻辑
}
```

### 坏注释-多余

[参考前面的](#部分代替注释)

### 坏注释-整活

@图6

可以在个人项目写 , 不要在公司项目写

## 抽象与函数

此章节是涉及到了 *clean code*, *refactoring* 以及**设计模式**等内容, 
可能比较抽象, 听不懂没关系, 大概率是我没说好

> 不过还是想尝试一下

### 抽象

**代码抽象** 是计算机编程中一项重要的概念

它指的是通过隐藏细节和简化复杂性，将代码概括为更高层次的抽象概念，从而提高代码的可读性、可维护性和可重用性

@图7

如果将上图展开呢

@图8

这么一比, 是不是*图7*更加直观, 更容易理解

抽象指的就是 通过隐藏细节和简化复杂性

如果开发需要, 那么你就可以进入下一层来查看

@图9

那么 我们设计的时候也可以参考这个, 可以从上到下, 从抽象到具体

@图10

### 函数

在JavaScript里面, 函数是一等公民, 享有和其他变量相同的权力

* 可用表达式生成
* 也可以用构造函数生成
* 还可以用函数声明生成
* 可作为参数
* 可作为返回值
* 可放到数组里面

以上种种都可以说明, 函数可以作为前一节当中的概括节点, 它拥有足够的容纳能力

@图11

抽象和封装有些类似, 但是还是有些不同

* 抽象是更高一层的概念, 封装是作为其中的一种实现手段
* 除了封装, 还可以用建模(时序图, 用例图, 类图), 系统流程图等等来实现抽象

> 由于是用代码进行讲解, 所以本节所说的更倾向于封装

### 建议

在进行抽象时, 可以从一下方面考虑

1. **单一职责**, 一个函数在它所在的**层次**只做一件事情, 越靠近底层(实现), 能力越单一

@图12

2. 参数不应过多, 超过三个应该考虑将其变成对象

@图13

3. 参数层层传递很麻烦

@图14

> 此为 *重构 改善既有代码的设计* 的章节, 感兴趣的可以自行前往观看

## 末尾

以上都是一些非常基础的东西, 但是由于前端开发有很多都是转行的, 缺乏编程的基础知识, 所以最终还是想分享一下
毕竟每次提交都提很多检视意见的话, 有点尬尴...

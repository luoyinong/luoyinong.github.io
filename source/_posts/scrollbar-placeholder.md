---
title: 由滚动条占位引出的组件设计
date: 2024-11-24 08:34:59
categories:
- 组件设计
tags:
- compatibility
- scrollbar
- css
---

# 背景

最近在开发页面时遇到了一个问题，滚动条占位，使得原有布局被挤压，导致界面不整齐，或者说不美观

滚动条出现之前
@图1

滚动条出现之后
@图2

## 思路

### ::-webkit-scrollbar

一开始想的是使用::-webkit-scrollbar这个伪类，然而这边项目需要兼容火狐浏览器，所以这个想法被否决了

### 上网

作为一名面向谷歌搜索工程师，如果没有好思路那就上网找一下

不过网上大多数都是重复的那几个方法，并且不能解决我的问题

1. 使用overflow:overlay, 仅适合谷歌浏览器
2. 使用margin-right:calc(100% - 100vw), 仅适合整个页面
3. 赋予body绝对定位，然后让root隐藏滚动条，仅适合整个页面
4. 使用js实时计算元素宽度，然后赋予margin-right，拉伸元素，很麻烦
5. scrollbar-gutter：stable，safari浏览器不兼容

说实话有点蛋疼了，其实还有两个比较简单的办法，不过交互比较差，

1. 让整个窗口滚动，用户在滚动后就不能输入名字，或者操作列表项

@图3

2. 一直显示滚动条占位符，界面不美观，不符合UI

@图4
@图5

### 自己想

网上没啥好办法，那就只能自己想了，这东西主要的难度在于，在css里什么时候出现滚动条是不确定的，除非使用js

不过转化一下就行了，大家在最初学习css布局的时候，应该都知道两栏布局吧

@图6

左滑右固定，左定右伸缩

以前还要用float，定位之类的来做，现在嘛，那就简单多了，flex一把梭

把两栏布局应用到滚动条，那自然就是左定，右伸缩

这是之前代码的概括版

```html
<head>
  <style>
    .container {
      width: 340px;
      height: 400px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .list {
      display: flex;
      flex-direction: column;
      height: 300px;
      overflow-y: auto;
    }
    .item {
      width: 280px;
      height: 30px;
    }
  </style>
</head>
<body>
  <div class="container">
    <input type="text" placeholder="请输入名字" class="input"/>
    <div class="tool-bar">
      <span class="tool-item">i</span>
      <span class="tool-item">o</span>
      <span class="tool-item">p</span>
      <span class="tool-item">l</span>
    </div>
    <div class="list">
      <div class="item">1</div>
      <div class="item">2</div>
      <div class="item">3</div>
    </div>
  </div>
</body>

```

我们需要做的就是将滚动条与列表容器分离开来

然后使用绝对定位，使得滚动容器出现滚动条时不挤开父容器，并保持list原有位置

```html
<head>
  <style>
    .container {
      width: 340px;
      height: 400px;
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative; /* add */
    }

    /* add start*/
    .list-wrapper {
      display: flex;
      width: 305px;
      overflow-y: auto;
      max-height: 300px;
      overflow-y: auto;
      height: 300px;
      position: absolute; /* 绝对定位，保持list位置 */
      top: 100px;
      left: 30px;
    }
    /* add end*/

    .list {
      display: flex;
      flex-direction: column;
      /* height: 300px; del */
      /* overflow-y: auto; del*/
    }
    .item {
      width: 280px;
      height: 30px;
    }
  </style>
</head>
<body>
  <div class="container">
    <input type="text" placeholder="请输入名字" class="input"/>
    <div class="tool-bar">
      <span class="tool-item">i</span>
      <span class="tool-item">o</span>
      <span class="tool-item">p</span>
      <span class="tool-item">l</span>
    </div>
    <div class="list-wrapper">
      <div class="list">
        <div class="item">1</div>
        <div class="item">2</div>
        <div class="item">3</div>
      </div>
    </div>
  </div>
</body>

```

最终结果

@图7

@图8

这种方案唯一的可能的缺点就是父容器需要留出一定的空间给滚动条，

如果这点空间UI都不愿意给的话，那就取消绝对定位，给塞到列表里，看UI同不同意(～￣▽￣)～

## 组件

方案既然已经出来了，考虑到这个场景还是挺常见的，我决定将其设计成一个组件，

### 设计思路

1. 使用组件一定要方便，尽量不更改原有结构，不使用过多的参数
2. 支持一定的扩展，可以用slot，class等

### 实践

组件非常的简单，

需要注意的地方有两点，这里的wrapper不再使用绝对定位，而是使用负margin来保持原有位置

因为绝对定位需要改变原有的样式，使得父元素变成相对定位

```vue
<template>
  <div class="scrollbar-wrapper">
    <slot></slot>
  </div>
</template>

<script>
export default {
  name: 'StableScrollbar'
}
</script>

<style  scoped>
.scrollbar-wrapper {
  display: inline-block;
  overflow-y: auto;
  margin-right: -25px;
}
</style>
```

使用起来也很简单, 先将原有list用组件包裹起来，然后将滚动相关样式删除

最后根据需要，给StableScrollbar加上宽高

```vue
<template>
  <div class="container">
    <input type="text" placeholder="请输入名字" class="input" />
    <div class="tool-bar">
      <span class="tool-item">i</span>
      <span class="tool-item">o</span>
      <span class="tool-item">p</span>
      <span class="tool-item">l</span>
    </div>
    <StableScrollbar class="list-wrapper">
      <div class="list">
        <div class="item">1</div>
        <div class="item">2</div>
        <div class="item">3</div>
      </div>
    </StableScrollbar>
  </div>
</template>

<script>
import StableScrollbar from './components/StableScrollbar.vue'

export default {
  name: 'App',
  components: {
    StableScrollbar
  },
}
</script>
<style>
/* add */
.list-wrapper {
  width: 305px;
  height: 300px;
}

.list {
  display: flex;
  flex-direction: column;
  /* overflow-y: auto;
  height: 300px del*/
}

.item {
  width: 280px;
  height: 30px;
  background-color: antiquewhite;
  margin-bottom: 10px;
  flex-shrink: 0;
}
</style>
```

效果和之前一模一样

@图9

有些人可能会问，这和写个公用样式，然后让开发自己包个div有什么区别

还是有些区别的

1. 更方便写文档，你写个公共样式，准备在哪里写使用方法呢，别人又怎么知道有这种东西
2. 提高扩展性，方便以后接入其它的滚动条组件

## 后记

设计组件这个东西，怎么说呢，并不是参数越多，可扩展性越高，就越好，

如同前端开发页面，前端面对的是**用户**，

需要尽量的让用户觉得，这个产品用起来很**直观**，很**方便**，并且**颜值**也很高

那么作为**设计组件**的开发，我们面对的是**开发**，也是**用户**，也要**识别**用户**需求**

在部门里推行组件库

搞那么多参数，然后文档写了一次后就再也不更新了，其它开发看得一头雾水，复制个demo结果发现还是错的，

这种组件是很难推广下去的

只有让用的开发觉得，我用这个组件确实节省了时间和精力，这样才好推广组件

所以，**不要过度设计**，如果有需要再进行有针对的优化，可以加上默认参数，更多的demo等等

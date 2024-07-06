---
title: 解决浏览器input自动补全
date: 2024-07-06 16:57:15
categories:
- 组件设计
tags:
- bug
- 组件库
---

# 背景

chrome@125.0.6422.142
vue@2.7
element ui@2.15

## 发现问题

现象:
使用组件库封装的组件, 发现浏览器自动填充的数据和placeholder重叠

@图1

正常应该是

@图2

我最先想到的解决方案是**关闭**浏览器的**自动填充**功能

## 关闭自动填充

先是试了下在input元素添加autocomplete=off, 发现不管用

> chrome浏览器已经不认这个属性了

查阅资料后, 使用autocomplete=new-password/nope, 还是没用

> 浏览器又改了, 也不认这个属性

查阅stackOverflow, 看到这三种方法

1. 使用name={Math.random}, 想让浏览器对应不上名字
2. 改变type类型, 从text和password里来回切
3. 在用户名和密码框前面再加两个input元素, 然后隐藏起来

实践后, 上述方法均无效, 只能说chrome浏览器太智能了

然后我自己又试了一下把input从form表单里移出来, 照样还是会自动填充

> 属实有点难受

## 监听inut.value

既然不能关闭, 那么能不能监听input的value值, 一改变就将placeholder隐藏起来

```JavaScript
value: {
  handler(val) {
    this.hidePlaceHolder = value !== ''
  },
  immediate: true,
},
```

然而还是不行, 初次加载页面后, 页面似乎没拿到填充的数据

这时发现鼠标点击页面任意位置后, 样式变成正常, 

调试后, 才知道是触发了vue 的 watch:immediate, 从而拿到了值

然后在控制台手动打印input.value, 有值, 同时也会触发watch:immediate,, 样式也会变正常

那么能不能在代码里触发页面更新呢

## 代码触发更新

在mounted钩子读取input.value值, 为空, 无效

怀疑是时间不对, 延迟一秒, 还是无效

有理由认为chrome 浏览器认为页面此时属于不活跃状态, 所以拿不到值

那咋办嘞

## css大法

正好有个css伪类:autofill, 可以控制自动填充的样式

```css
.input_style {
  /deep/.el-input__inner {
    &:autofill {
      opacity: 0;
    }

    &:-webkit-autofill {
      opacity: 0;
    }
  }
}

```

> 不得不说css还是很强大的, 
> 想起之前初学前端时跟着百度前端技术学院用css解决各种难题
> 可惜后来百度就去推广自己的框架了

既然如此, 那就先隐藏input, 等到点击后再显示

```html
<div v-clickoutside="handleClickOutSide" style="display: none"></div>

<xx-input
  v-model="value"
  type="text"
  :class="{
    input_style: true,
    pageFresh,
  }"
  :clearable="false"
  maxlength="6"
  required
>

</xx-input>
```
```javascript
handleClickOutSide() {
  this.pageFresh = false
}
```

这样的话确实有效, 进入页面是这样的

@图3

随便点击一个地方后

@图4

但是这次有多个页面会有自动填充的问题, 一个个加有点麻烦

整个项目其它输入框可能也会有这个问题

## 变成解决方案

所以可以把它变成整个项目的解决方案

将clickOutside放到app.vue层

```html
<div id="app">
  <div v-clickoutside="handleClickOutSide" style="display: none"></div>
  <router-view />
</div>
```

然后将pageFresh这个状态保存在vuex store里面

```js
// state.js
const state = {
  pageFresh: true, // 页面没有被点击过
}

// mutation.js
const mutation = {
  // 页面被点击过
  UPDATE_PAGE_FRESH(state) {
    state.pageFresh = false
  },
}

// page.vue
computed: {
  ...mapState(['pageFresh']),
}
```

接着把样式放到全局样式表里


```css
.input_style {
  &.pageFresh /deep/.el-input__inner {
    &:autofill {
      opacity: 0;
    }

    &:-webkit-autofill {
      opacity: 0;
    }
  }
}

```

这样的话, 整个项目都可以使用这个解决方案

## 开箱即用

然而, 我觉得这样还是太麻烦了, 能不能放在组件库里, 让其它项目也开箱即用

需要解决三个问题

1. 全局创建一个实例与监听outside,避免每个input都创建一个div
2. 全局状态共享, 避免每个input组件都维护一个状态(pageFresh)
3. pageFresh会让input加上特殊类名, 从而可以使用:autofill控制样式

需要注意的几个地方

1. 兼容以前的配置, 处理autocomplete默认为关闭
2. 全局状态可以使用闭包来实现, 而不是挂在window或者vue上
3. 使用起来一定要方便, 比如说加个配置或者指令


### 实践过程

实践过程中发现不用创建实例来监听outsude, 当时在项目里用v-outside只是图方便, 

现在的话直接监听body的点击事件就行了

然后就是全局状态共享, 既然是在组件库, 那么组件天然就是一个可复制模块, 无需全局状态共享

只需要订阅点击事件更改自身状态就行

> 主要还是vue2比较麻烦, 无法在外部创建响应式变量
> 所以需要使用订阅模式来更新自身状态

```Javascript
// 监听page点击事件
let hasListener = false
const subscriber = []

function handleClickPage() {
  subscriber.forEach((cb) => cb())
}

const listenPageClick = (cb) => {
  if (!hasListener) {
    hasListener = true
    document.body.addEventListener('click', handleClickPage)
  }

  if (!subscriber.includes(cb)) {
    subscriber.push(cb)
  }
}

export default listenPageClick
```

然后给input组件加上props: solveAutoComplete

```Javascript
props: {
  solveAutoComplete: {
    type: Boolean,
    default: false,
  },
},
data() {
  return {
    pageFresh: false,
  }
},
mounted() {
  if (this.solveAutoComplete) {
    this.pageFresh = true
    listenPageClick(this.updateFresh)
  }
},
methods: {
  updateFresh() {
    this.pageFresh = false
  },
}

```

```html
<el-input
  :class="{
    pageFresh,
  }"
>
</el-input>
```

```css
.pageFresh /deep/.el-input__inner {
  &:autofill {
    opacity: 0;
  }

  &:-webkit-autofill {
    opacity: 0;
  }
}

```

这是默认状态 (solveAutoComplete = false)

@图5

这是开启状态 (solveAutoComplete = true)

@图6

## 优化

### 回顾

这算是初步解决了浏览器填充的问题, 但是又有个问题, 为什么一定要点击后才能填充?

前面这样做的原因是: 

1. js不能监听浏览器是否自动填充
2. input是靠js监听focus事件来改变label与placeholder的位置

这两点导致自动填充与placeholder重叠

所以我先使用:autofill屏蔽了自动填充

等到页面变成活跃状态, js能供监听input.value的值的时候, 再解除屏蔽

### 思路

那么为什么不能通过css来改变label与placeholder的位置呢

答案显然是可以的, 因为css本来就是做这事的

然而我思考了一会之后放弃了这个打算

因为组件库里的这个input比较复杂, focus不仅仅和label的位置有关, 

如果把这部分的逻辑拆分为两个地方很容易出错, 后续维护也会变得越来越难

> 尤其是css, 它用来写逻辑的话, 会很难读
> 个人比较推崇高内聚, 低耦合, 当然这只是方向

## 最后

经过一系列的尝试, 最终搞定了浏览器的自动填充问题, 虽然解决方案不是完美无瑕

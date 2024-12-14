---
title: 前端分享之公共函数
date: 2024-12-14 09:40:15
categories:
- 分享
tags:
- 分享
- 代码质量
---



# 前言

前端小组平时没什么交流，也没有什么技术分享，迭代一正好转测完成，大家都不忙，决定发起一次交流会，主题如下

1. 组件库已支持实时调试，操作说明
2. 某个项目里实用的公共函数
3. 怎么提升代码可维护性
4. 组件库新增的组件以及使用说明

这篇是我给其它组员分享的ppt的md镜像版, 由于不方便将公司代码展示, 所以代码片段都有所改动

## 组件库实时调试

这个优化实践之前已经说过了，所以不在再赘述

之所以要在交流会里提这个，那是因为虽然我在群里发了文档，但发现有些开发还是不会，所以自己演示了一遍

## 项目里实用的公共函数

提出这个主题的初衷是，给其它开发介绍一下怎么找公共函数，使用公共函数的优点

1. 习惯后会比较节约时间
2. 在团队内形成规范，避免其它开发（如后端）给的字段或者结构不统一（如时间戳格式，设备信息树解析）
3. 避免其它前端踩过的坑，自己再踩一遍

> 在代码检视中发现有些开发不了解公共函数库，自己造轮子

## 怎么提升代码可维护性

什么是代码可维护

1. 代码易懂，逻辑清晰
2. 模块明确，修改隔离（解耦）
3. 方便修改，功能集中（内聚）

### 代码易懂，逻辑清晰

这是代码检视里发现的一段代码

```html
<el-button
  v-if="info.status == 1 && log"
>
  button1
</el-button>
<el-button
  v-if="info.status == 2 && abc"
>
  button2
</el-button>

<script>
  data() {
    return {
      // 权限项，日志权限，。。。。
      log: false,
      // 权限项，abc权限，。。。。
      abc: false
    }
  }
</script>
```

log和abc都是权限项，检查是否有权限项然后显示按钮

很显然不看下面的变量注释，是看不懂这是干什么的，如果组件代码过长，那就更难懂了

还是那句话，变量命名要清晰

在此提供一些常见的规律

**布尔值**：is+形容词 如isWritable, isVisible，isEnabled
**权限**：support+权限项 如supportPtz,supportRecord
**常见的事件**：
submit，cancel，confirm，close


```html
<el-button
  v-if="info.status == 1 && supportLog"
>
  button1
</el-button>
<el-button
  v-if="info.status == 2 && supportAbc"
>
  button2
</el-button>

<script>
  data() {
    return {
      // 权限项，日志权限，。。。。
      log: false,
      // 权限项，abc权限，。。。。
      abc: false
    }
  }
</script>
```

这样一来就会更加清晰

> 魔鬼数字的问题就不谈了，这次只是举个例子

### 模块明确，修改隔离（解耦）

这也是代码检视时发现的一个问题，应届生在一个目录下写了十几个组件(～￣▽￣)～，
我一下子没找到功能对应的文件，眼睛都看花了

```javascript

config
  - rule
    - groupView1
    - groupView2
    - groupView3
    - plateView1
    - plateView2
    - plateView3
    - plateView4
    - dialog1
    - dialog2
    - dialog3
    - vehicleView1
    - vehicleView2
    - vehicleView3
    - vehicleView4
    - vehicleView5
    - rule1
    - rule2
    - ruleDialog1
    - ruleDialog2
```

咋说嘞，也不是不行，就是以后找代码全靠全局搜索了

其实一个功能搞出这么多组件，说明还是有解耦的意识，但是没有进行模块化

```javascript

config
  - rule
    - group
      - groupView1
      - groupView2
      - groupView3
    - plate
      - plateView1
      - plateView2
      - plateView3
      - plateView4
    - components
      - dialog1
      - dialog2
      - dialog3
      - ruleDialog1
      - ruleDialog2
    - vehicle
      - vehicleView1
      - vehicleView2
      - vehicleView3
      - vehicleView4
      - vehicleView5
    - rule1
    - rule2

```

这样看起来是不是好很多，根据以往的经验，一个目录放4-5个组件就差不多了，

当然层级也不要太深，视具体情况而定，过度设计也是不可取的

### 方便修改，功能集中（内聚）前

这里涉及到一个问题，那就是哪些代码才是一个功能或者说模块，我们要怎么聚合与解耦

所以在说这个之前，先说一下怎么确定内聚还是解耦

### 内聚还是解耦

这个其实是和功能规模，代码数量有关

功能不多，直接拆分就行

@图1

如果是一个大型的模块，涉及到多个功能，每个功能涉及的逻辑又有很多，既然是放到同一个文件里，

那么它们之间必然有相似的环节，此时可以先进行解耦，然后分层将相似环节聚合

@图2

这个东西在项目里也是有实践案例的，

我重构了一下项目里的协议对接模块，这里的web对接设备用的都是xml，

但是**设备**有**不同种类**，然后由于**没有**统一**规范**，所以不同设备所用的**格式**是**不同**的，

导致**web**这边需要做**兼容**

```JavaScript
// 功能1
function test(id, index, info, item) {
  const cId = caculateId(id, index)
  let xml = '<?xml version="1.0" encoding="utf-8" ?>'
  xml += '<request type=device1 url=test><content>'
  xml = xml + '<index>' + index + '</index>'
  xml = xml + '<name>' + info.name + '</name>'
  xml = xml + '<abc>' + item.abc + '</abc>'
  xml = xml + '<abd>' + item.ret + '</abd>'
  xml += '</request></content>'
}

// 功能2
function test1(id, index, info, item) {
  const cId = caculateId(id, index)
  let xml = '<?xml version="1.0" encoding="utf-8" ?>'
  xml += '<request type=device1 url=test1><content>'
  xml = xml + '<index>' + index + '</index>'
  xml = xml + '<name>' + info.name + '</name>'
  xml = xml + '<abc>' + item.abc + '</abc>'
  xml = xml + '<abd>' + item.ret + '</abd>'
  xml += '</request></content>'
}
// 功能3
function test2(id, index, info, item) {
  const cId = caculateId(id, index)
  let xml = '<?xml version="1.0" encoding="utf-8" ?>'
  xml += '<request type=device2 url=test2><content>'
  xml += '<body>'
  xml = xml + '<index>' + index + '</index>'
  xml = xml + '<name>' + info.name + '</name>'
  xml = xml + '<abc>' + item.abc + '</abc>'
  xml = xml + '<abd>' + item.ret + '</abd>'
  xml += '</body>'
  xml += '</request></content>'
}
// 功能4
function test3(id, index, info, item) {
  const cId = caculateId(id, index)
  let xml = '<?xml version="1.0" encoding="utf-8" ?>'
  xml += '<request type=device2 url=test3><content>'
  xml += '<body>'
  xml = xml + '<index>' + index + '</index>'
  xml = xml + '<name>' + info.name + '</name>'
  xml = xml + '<abc>' + item.abc + '</abc>'
  xml = xml + '<abd>' + item.ret + '</abd>'
  xml += '</body>'
  xml += '</request></content>'
}

```

这里的代码是简化版本，

实际上，有几十个类似的函数，并且每个函数的参数，type, url, body里拼接的内容，数据结构都有所不同

> 我这里就懒得改了

很容易就能看出来，这些函数是有公共部分的，我们可以按照先解耦再聚合的流程进行优化

```javascript
function device1Wrapper(id, url, body) {
  const cId = caculateId(id, index)

  return `<?xml version="1.0" encoding="utf-8" ?>
  <request type=device1 url=${url} reqId = ${cId}>
    <content>
      ${body}
    </content>
  </request>
  `
}

function device2Wrapper(url, body) {
  return `<?xml version="1.0" encoding="utf-8" ?>
  <request type=device2 url=${url} reqId=0 >
    <content><body>
      ${body}
    </content></body>
  </request>
  `
}

function test1(id, index, info, item) {
  const body = `<index>${index}</index>
  <name>${info.name}'</name>
  '<abc>${item.abc}</abc>
  '<abd>${item.abd}</abd>
  `

  return device1Wrapper(id, 'test1', body)
}

function test2(id, index, info, item) {
  const body = `<index>${index}</index>
  <name>${info.name}'</name>
  '<abc>${item.abc}</abc>
  '<abd>${item.abd}</abd>
  `

  return device2Wrapper(id, 'test2', body)
}

```

这样一来，其它开发进行阅读时就只用关心重点，即url和参数，

至于不同协议的区别，其它开发是不需要关心的

### 方便修改，功能集中（内聚）后

说完什么时候聚合，什么时候解耦，那么就可以接着说说聚合

还是用我遇到的例子来说明，我这边有一个大文件，里面代码大致可以分成几类

1. 协议处理，就是之前拼接xml的那些代码
2. 数据处理，设备返回的数据不一定是web可用的，可能用了base64，可能是json字符串需要转js，
  还有些字段不符合规范，用下划线开头，比如_id
1. 业务逻辑处理
2. 数据存储或者分发，存到vuex，存到localStorage，通过EventBus传给其它页面

这就存在一个问题，就是它把几乎所有协议的代码放在了一个文件里，

这个文件有十几个ifelse判断不同协议，然后进行处理

大概一千多行代码，

大家可能会说这就是内聚呀ψ(｀∇´)ψ，一个功能都放在一起了。。。

这样想的可以在看下[前面一节](内聚还是解耦)的内容

所以呢，优化的思路应该是，

1. 协议处理放一块，
2. 数据处理分为不同策略放一个模块（vuex是一个不错的选择），
3. 业务逻辑放到页面，
4. 数据存储视情况而定

这才是内聚

不过这个文件我看了好几天，没敢改，里面的逻辑太复杂了，涉及到许多页面逻辑和插件交互

有人可能会问，你之前敢给所有项目升级，现在就不敢重构一个模块了吗？

我之前敢升级那是有原因的

1. 人是不可靠的，工具是可靠的
2. 之前升级大部分都不涉及到业务代码的修改，小部分是借由工具统一修改的，所以可以认为升级是可靠的
3. 而这次涉及到的业务代码修改，是没有工具的，需要人工修改
4. js不像java有静态检查，逻辑代码改出问题很难发现

> 那次升级后续也没出什么问题

所以，上面的思路也只是说说而已(～￣▽￣)～，除非领导下发任务，让其作为一个技术需求，不然我是不敢动的

## 组件库新增的组件以及使用说明

具体组件我就不说了，毕竟都是公司内部的东西，我加上这个主题，主要是因为，有些开发辛苦设计出来的组件没有人用，

其它人一是不知道，二是不会用（懒得看文档），

所以呢，我想定期开交流会，分享组内的公共组件以及说明

## 后记

这次交流会除了上述这些，还有一个重要内容，就是让开发们把上个版本做的重要功能在会上介绍一下，

作为一个前端，总不能连部门产品的功能都不知道吧

### 展望

还有个想做但是没有条件的，那就是竞品分析，说实话这是产品的活，但是产品老是改需求，而且还是在开发后期，

作为前端还没有什么办法，

所以呢，我就想在会上和大家一起分析一下竞品，之后再改需求，那前端说话就有根据了

> 主要是没有竞品的账号（都是要花钱的），也没有渠道申请。。。

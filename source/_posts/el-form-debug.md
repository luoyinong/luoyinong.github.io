---
title: 记element ui form 校验debug
date: 2024-09-07 14:52:00
categories:
- web debug
tags:
- vue
- element ui
- el-form
- debug
---

# 背景

按照需求写一个联动的表单，支持校验，包含自定义的组件，结果在开发过程中遇到了一个bug，其中一个自定义组件
的必填校验不会被触发
这个bug着实让我调试了好长时间，故记录下来

## 现象

表单大概是这样的，

@图1

其中组件select是一个下拉组件（共有4个选项），下面的组件会随着select的变化而展示不同的自定义组件A,B,C,D

然而，组件select的1，2，4选项对应的自定义组件的校验没有问题，就第三个选项对应的组件不会触发elForm的必填校验

@图2

更加奇怪的是，直接从1切换到3选项是有问题的，从其它选项（2，4）切换到3则是不会有这个问题

@图3

## 排查过程

### 校验规则 X

一开始我认为这只是在漫长开发过程中及其普通的一次debug，猜测是校验规则有问题，可能是prop写错了，或者是validator写错了

不过被无情打脸，无论再怎么检查，甚至是将其它没问题的组件的校验条件复制过来，同样无效

### 网上建议 X

既然简单的初次尝试失败，那就在网上搜了一下，看有没有遇到同样事情的，不过最后都被验证无效

1. 在rule里的type里面加array
2. 在自定义组件中加element ui的emitter，然后监听value并触发form-item的change事件
3. 将rule的trigger从change改成blur

### 自己debug

经过上面的尝试，我意识到这个bug并没有想象的那么简单，于是通过vue devtools检查组件内部状态和变化，

很快就发现了问题所在：

组件select直接切换到第3个选项时，elForm并没有将对应的formItem添加到fileds

@图4

> 将elFormItem展开后确实是不包含问题组件

从其它选项切换到第3个选项时，elForm是有的

@图5

这也就是为什么会出现必填校验失效的原因，elForm压根不知道多了这个组件

> 还真是应了一句话，自己动手丰衣足食

经过调试，发现组件C的父组件el-form-item并没有触发mounted事件.

调试方法见 [调试element ui](#调试element-ui)

这下我就明白了，由于我是通过v-if来实现选项变化时，展示不同的组件

```javascript
<select v-model="select">
  <optionA />
  <optionB />
  <optionC />
  <optionD />
</select>
<form>
  <div v-if="select === 'optionA'">
    <form-item>
      <compA />
    </form-item>
  </div>
  <div v-else-if="select === 'optionB'" class="classB">
    <form-item>
      <compB />
    </form-item>
  </div>
  <div v-else-if="select === 'optionC'">
    <form-item>
      <compC />
    </form-item>
  </div>
  <form-item v-else-if="select === 'optionD'">
    <compD />
  </form-item>
</form>
```

而vue将选项1和选项3对应的自定义组件进行了复用，导致直接切换时没有触发addField事件

@图6

从而elForm不会监听这个formItem的变化，最终导致校验失败


要解决这个问题很简单，加上key，让vue重新渲染节点即可


```javascript
<select v-model="select">
  <optionA />
  <optionB />
  <optionC />
  <optionD />
</select>
<form>
  <div v-if="select === 'optionA'" key="optionA">
    <form-item>
      <compA />
    </form-item>
  </div>
  <div v-else-if="select === 'optionB'" class="classB">
    <form-item>
      <compB />
    </form-item>
  </div>
  <div v-else-if="select === 'optionC'" key="optionC">
    <form-item>
      <compC />
    </form-item>
  </div>
  <form-item v-else-if="select === 'optionD'">
    <compD />
  </form-item>
</form>
```

## 思考

比较细心的人可能会问，为什么vue会复用节点，导致form-item的mounted钩子没被触发

vue的虚拟节点和diff算法我就不说了，因为网上一堆资料，

我这个表单是因为自定义组件外层的元素是相同的，div+formItem, 所有vue就会复用

可能有人又要问了，为什么从A切换到B就没事，那是因为B有个class，D没有div，所以不会复用。。。

@图7

## 调试element ui

从element ui的源码上我没发现有什么问题，根据之前的现象，这肯定是和项目代码有强关联的，需要在运行时调试

但这又有一个问题，怎么调试，平常都是调试项目自己的代码，直接加debug就行了

而项目是全量引入的element ui，加进来的是经过打包的代码，就算一步一步debug到elForm的代码，也很难看懂

### 调试方法-引入source map X

网上提到一个方法，就是下载element ui自己打包，然后将source map放到自己的项目里，并将webpack的配置修改

这个我只是提下，太麻烦了，也没有什么特殊的适配场景

### element ui加载方式

element ui作为一个加载灵活的组件库，它支持多种引入方式，包含全量加载，按需加载，cdn加载

其中的按需加载又包括编译包和源码包，项目使用时可以根据自己的编译目标选择

@图8

如果目标和element ui的相似，那么就可以使用编译包
如果差别过大，那么就可以使用源码包，根据项目配置的目标对element ui的组件进行编译（不过打包速度可能会减慢）

### 调试方法-引入单个组件 √

既然知道了element ui的各种加载方式，那么我们直接在页面引入package/form即可

```javascript
import ElForm from 'element-ui/packages/form'

export default {
  name: 'page',
  components: {
    ElForm,
  },
  data() {}
}

```


然后进入form组件加上debug或者console语句

@图9

@图10

> vue3使用vite的话，可能得清下vite的缓存
> 如果vue2无效，那么需要检查一下webpack配置，看下是不是在js rule里exclude element ui了

---
title: 由npm link报错引出的开发优化
date: 2024-11-14 18:50:15
categories:
- webpack
tags:
- npm
- 组件库
- webpack
---

# 背景

之前已经将部门的前端项目整体升级了，并且集中处理了运行时依赖和编译时依赖，然而组内一名开发在使用npm link后发现项目跑不起来

```Can't resolve 'vue' in '组件路径'```

看了一下情况，发现是项目npm link 组件库后, 导致其子依赖都被删除, 从而出现运行报错的问题

本来是 项目A => 组件库 => vue

npm link之后

项目A => 本地组件库， 项目A里的vue等依赖被删除，这才导致项目运行时找不到vue从而报错

## 解决方案

看了一下npm link的文档，虽然里面的参数有很多，但是对于解决这个问题都没有什么用，最后决定使用第三方的库[npm-link](https://www.npmjs.com/package/link)

@图1

主要是这东西不会自动install，所以不会自动移除组件库的子依赖

### webpack适配

```JavaScript
// webpack.config.js
resolve: {
  symlinks: false,
},
```

在实践中发现，组件库更改代码后重新build，

虽然组件库打包完成后, 项目的控制台会显示重新运行，

但是组件库的改动却没有同步到项目里

一开始以为是symlinks的锅，排查了一下，发现其实不然

@图2

```JavaScript
watchOptions: {
  followSymlinks: true,
},
```

我加了上述的配置也没有作用，尝试性的把webpack cache的内容删除后，重新运行项目，发现改动生效了，这就说明是webpack cache的问题

@图3

关于缓存的控制，webpack也是有相关的配置的

@图4

按照上述文档缩写

加上

```JavaScript
  snapshot: {
    managedPaths: [
      /^(.+?[\\/]node_modules[\\/](?!(组件库)))/,
    ],
  },
```

这样就没有问题了, 不过组件库的无关文件比较多，比如src，static， 而项目只关心打包后的文件

所以可以优化成

```JavaScript
  snapshot: {
    managedPaths: [
      /^(.+?[\\/]node_modules[\\/](?!(组件库[\\/]dist[\\/]组件库.js)))/,
    ],
  },
```

删除缓存，重新运行项目，然后改动组件库代码，重新打包，一气呵成

最终顺利解决问题

### 调试困难

提出npm link报错的同学表示需要进行实时调试，每次改动后手动build很麻烦，

这里也是可以优化一下开发流程的，不过我一直没搞，主要有两个原因

1. 本来是想着可以直接运行组件库的demo模式进行调试，
但是某些组件需要c++插件的配合，在组件库里很难搞出来，所以需要link到项目里调试

2. 组件库后续会改成按需加载的模式，那样的话直接link就行了，不需要特殊处理

不过呢，既然其它开发有这个需求，那我就进行一下优化

方法很简单，组件库需要监听文件改动然后重新打包

webpack也是有这个配置的，watch

首先把之前dev.config.js重命名为demo.config.js

然后复制prod.config.js, 重命名为dev.config.js

@图4

在dev.config.js加上watch：true

然后更新命令

@图5

这样就完成了改造，其它开需要在项目里调试的话，

在组件库运行npm run dev
然后在项目里运行 npx link 组件库路径
即可进行实时调试

> 不得不说webpack的配置还是挺多的，不像一些新兴的打包库，开箱即用，
> 但是复杂的配置也允许了极致的个性化

## 后记

这次npm带来的问题让我不得不开始审视npm，在之前的公司里都是别人搞好了，我来用，

现在则是由我来处理npm的这些问题，我可能需要评估使用npm会带来的问题，以及更换npm所花费的成本

> 作为一名开发，我希望前端项目的各种环境保持统一，尤其是部门目前的前端项目规模不大，历史包袱也不大

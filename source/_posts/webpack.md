---
title: 翻新旧项目之webpack
date: 2024-05-19 15:29:15
categories:
- 翻新旧项目
tags:
- 前端
- webpack
---

## 前言

技术栈和动机不再说明, 详见 [babel升级篇](/2024/05/12/babel)

## 思路

由于webpack从3到5是断代升级, 并且官方没有提供升级工具,

所以需要更新webpack配套的loader, plugin, 以及它们的配置

1. 先查看所有loader和plugin的最新版本, 进行以下分支
2. 一.几年没更新就去查找对应文档是否废弃或者有替代方案
3. 二.最近发了版本, 那就手动写上最新版本号
4. 等到把插件更新完毕后, 运行build, 根据错误提示来更正配置
5. 对比升级前后的页面, 查看是否遗漏了什么问题
6. 升级的步骤非常多, 如果全写出来很麻烦, 所以只说新的步骤

无论是webpack还是loader, plugin的配置都不用太担心, 因为现在的提示非常智能

会准确标出哪个配置项是多余的, 哪个是不正确的, 按照报错改就行了

## 实操

### 更新依赖

按照关键字loader和webpack把依赖都放到最前面, 方便后面替换

@图1

然后把文件放到暂存区

> 关于怎么快速知道插件最新版本, 可以把鼠标放到依赖上 (vscode, 这时会自动显示
最新的版本)

vue-loader的版本不要动, 因为它适配的是vue2

@图2

如果是这种几年没更新的, 那基本可以确定是废弃的,
去官网查一下, 然后再去webpack看下怎么替换file-loader

@图3

根据官网的文档, 将url-loader替换成webpack5内置的asset module

@图4

移除url-loader和file-loader的依赖

@图5

继续写新版本

@图6

查看官网, 又是一个废弃的 (已经不支持webpack5, sass-loader自己已经支持给每个文件加上额外内容), 所以移除这个依赖

然后将样式处理的loader规则写上

```js
{
  test: /\.(sa|sc|c)ss$/,
  use: [
    // Creates `style` nodes from JS strings
    devMode ? "style-loader" : MiniCssExtractPlugin.loader,
    // Translates CSS into CommonJS
    "css-loader",
    "postcss-loader",
    // Compiles Sass to CSS
    {
      loader: "sass-loader",
      options: {
        additionalData(source, loaderContext) {
          const { resourcePath, rootContext } = loaderContext;
          const absolutePath = path.resolve(rootContext, 'src/theme/vars.scss');

          // All scss files ending with imports.scss
          // will not re-import additionalData
          if (resourcePath === absolutePath) return source;
          // Use additionalData from legacy nuxt scss options
          return `@import 'theme/vars.scss'; ${source}`
        },
        // additionalData: "@import 'theme/vars.scss';",
        sassOptions: {
          includePaths: [path.resolve(__dirname, '../src')],
        },
      }
    }
  ],
},

```

这里的additionalData就相当于前面的sass-resources-loader
其中的判断是为了不在vars.scss引入vars.scs文件, 避免冲突

后续重复步骤不再一一说明, 更新完之后

@图7

将node_modules和package-lock.json删除

运行npm i

### 现在来调整配置

之前的vue-loader是将css处理挂在自己的options下面, 这次需要给它提取出来

vueLoaderConfig

@图8
@图9

然后将css的loader放到下面

@图10

具体代码上面有, 就不全贴了

移除这几个插件, webpack已经默认启动

@图11

给webpack补上如下配置

@图12

mode和stats是新增的, devtool现在会严格要求顺序

然后移除config文件夹下的dev.env.js和prod.env.js

直接在webpack.dev.config.js和prod.config.js里面配置mode就行

@图13

其它配置可以在运行npm run build时根据报错提示信息来更改
下面是遇到的几个花了点时间解决的问题

### mini-css-extract-plugin Conflicting order. Following module has been added

组件引入css的顺序不一致, 在prod的配置里加上

@图14

开发配置不用加

### crypto

BREAKING CHANGE: webpack < 5 used to include polyfills for node.js core modules
by default

webpack3 会给编译后的文件加上nodejs的模块的polyfill
webpack5 不会这样做 因为这会导致包的体积变大....

网上给的解决方案大多都是使用

@图15

但是这很不靠谱, 因为crypto-browserify它的子依赖会用其它nodejs的核心模块, 导致出现更多的错误

并且这玩意已经几年没更新了, 所以我最后使用的是crypto-js, 它只是语法稍微变了一下, 其它没什么问题

### console.log

之前的打包文件是不会去除console的, 既然这次升级那就给它在prod加上

@图16

对比的时候记得先把之前的打包文件删除, 我因为没删除导致一直在旧文件里搜到console.log

然后以为配置没有生效, 排查了十几分钟

> 可以给webpack output.clean设置为true

### splitChunks 分包

这是一个老生常谈的问题, 之前的打包文件就分了三个, 入口文件加起来非常大 (8M左右)

> 这也是单页应用的弊端
> 不过也可以稍微优化一下

可以将element ui组件库, 项目组件库以及其它几个较大的插件分离开来

```javascript
splitChunks: {
  chunks: 'async',
  minSize: 20000,
  minRemainingSize: 0,
  minChunks: 1,
  maxAsyncRequests: 30,
  maxInitialRequests: 30,
  enforceSizeThreshold: 50000,
  cacheGroups: {
    defaultVendors: {
      test: /[\\/]node_modules[\\/]/,
      priority: -5,
      chunks: "initial",
      name: "app_node_modules",
      minSize: 0,
    },
    default: {
      minChunks: 2,
      priority: -20,
    },
    elementPackage: {
      test: /[\\/]node_modules[\\/](element-ui|element-variables)[\\/]/,
      name: 'vendor_element',
      chunks: "all",
      priority: 10,
    },
    widgetPackage: {
      test: /[\\/]node_modules[\\/](组件库)[\\/]/,
      name: 'vendor_widget',
      chunks: "all",
      priority: 10,
    },
    awsPackage: {
      test: /[\\/]node_modules[\\/](aws-sdk)[\\/]/,
      name: 'vendor_aws',
      chunks: "all",
      priority: 10,
    }
  }
}
```

> 如果还要继续优化, 那就需要整理依赖, 将固定版本的插件打包成dll或者放到cdn上, 比aws-sdk
> 然后再将首页不用的模块移除引用, 比如element ui变成按需加载
> 最后使用webpack的预加载语法优化请求, pre-fetch/pre-load
> 优化篇估计也是一个大坑, 还是不在这里写了

升级完毕, npm run build 无报错

@图17

结合之前的babel升级, 速度快了10秒左右(原为44秒) , 提示约为 22%

### 本地构建加速

webpack提供了缓存功能, 可以缓存上一次的编译内容, 在下一次编译时利用缓存进行加速

具体配置如下 (在dev的配置, prod暂时不考虑)

```js
cache: {
  type: 'filesystem',
  allowCollectingMemory: true,
  buildDependencies: {
    // This makes all dependencies of this file - build dependencies
    config: [__filename],
    // By default webpack and loaders are build dependencies
  },
  maxMemoryGenerations: Infinity,
  memoryCacheUnaffected: true,
},
experiments: {
  cacheUnaffected: true,
},
```

总的来说就是使用空间换时间的策略 (还好硬盘容量够大hh..)

使用cache之前

@图18

第二次与热更新

@图19

使用cache之后

@图20

第二次与热更新

@图21

可以看到第二次启动快了20秒左右, 速度提升了80%, 对于热更新没有太大影响

> 虽然比起vite还是慢了不少, 但是也还行了

### 为什么本地构建不使用vite

我是基于以下几个原因没有用vite

1. webpack切换到vite不同于升级, 是属于底层原理的不同
2. webpack cache的效果还不错, 几秒和零点几秒的差别对于我来说可以接受
3. 后面还有更优先级更高的事情

> 另外, 如果没有升级nodejs的话, vite是使用不了的, 它只支持新版的node

@图22

针对第一点我来展开说一下,

webpack会对所有被引入的文件进行编译, 同时支持cjs和esm的写法, 支持大量的功能配置
vite是一个比较轻量化的构建工具, 对**底层配置**进行了一定的封装, 由于是利用了现代浏览器支持加载esm的特性,
所以**不支持cjs**的写法

@图23

我这的几个项目确实是用到了webpack的一些独特的配置, 而vite不支持更改, 比如说静态资源管理

vite
@图24

而我这的项目恰好就这样写了 (并且有些文件是cjs), 如果要改的话, 工作量应该比较大, 并且是破坏性重构, 风险也大, 然而收益却不高

> 破坏性重构是指使用人工而非工具的手段进行重构, 由于**人**是**不可信赖**的, 所以其重构的结构大概率也是不可信赖的
> 使用单元测试和人工测试也只是降低了风险
> 公司招你来是解决问题的, 而不是创造问题的, 需要时刻谨记这一点
> 当然, 你要防御性编程那就没办法了, hh

如果硬要改的话也不是不行, 我的思路是

1. 编写一个rollup的插件, 将那些不符合vite要求的文件给列出来
2. 这个插件需要处理没有后缀名的文件, 让vite暂时忽略 (查看vite的resolve是怎么搞得)
3. 处理使用require引入资源的文件 (社区已有插件, 只需要列出来即可)
4. 处理使用错误路径的文件 (关键字对比, 包含static)
5. 等等

至于找到之后是人工改还是工具改, 没走到那一步, 我很难确定

综上所述, 开发环境切换到vite是非常麻烦的, 且收益较低, 暂时不考虑

> 如果是新开的项目倒是可以考虑完全使用vite, 因为vite也支持vue2

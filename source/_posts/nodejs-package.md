---
title: 使用webpack打包nodejs插件
date: 2024-05-19 15:31:15
categories:
- webpack
tags:
- 前端
- webpack
- nodejs
---

# 前言

记录一下怎么使用webpack打包nodejs插件
<!-- more -->

## 实操

node插件

```JavaScript
// 部分代码没有放上来, 只说大概思路和配置
const { cac } = require('cac')
const path = require('node:path')
const Webpack = require('webpack')
const WebpackDevServer = require('webpack-dev-server')
const portfinder = require('portfinder')


const cli = cac('cliName')
const rootDir = process.cwd()

const getPort = (config) =>
  new Promise((resolve, reject) => {
    portfinder.basePort = config.devServer.port
    portfinder.getPort((err, port) => {
      if (err) {
        reject(err)
      } else {
        resolve(port)
      }
    })
  })

cli
  .command('serve <configFile>', 'start dev server')
  .alias('dev')
  .action(async (configFile) => {
    const devConfig = require(path.resolve(rootDir, configFile))
    const port = await getPort(devConfig)

    const compiler = Webpack(devConfig)
    const devServerOptions = { ...devConfig.devServer, port }

    const server = new WebpackDevServer(devServerOptions, compiler)

    console.log('Starting server...')
    await server.start()
  })

```

## 为什么要打包

这个工具将会被安装到各个项目里, 并不想让对项目**无用**的**依赖**被**安装**, 所以需要在**编译**阶段将
一些npm插件打包进去

## 打包工具选择

目前已知的工具

rollup, parcel, esbuild, webpack, browserify

### rollup

rollup更擅长es module的打包, **放弃**

有些人肯定要问, 我为什么不写成es modules的形式,

可是我的目标本来就是要适配nodejs, 那我为什么还要用es module来写呢

并且后面开发debug的话, 用cjs的源码可以直接覆盖项目里的node_module, 更加方便

> 至于debug用npm link, 呵呵, 这玩意自个的bug就一堆, 最好还是别用了
> 依赖会有各种问题

### parcel

看到开头就放弃了, 也许可以通过配置来解决, 但是没必要, **放弃**

@图1

### esbuild

这个比较知名的是它的打包速度, 从概览来看, 它也是可以用来打包nodejs插件的

@图2

### webpack

主要优点有一个, 不用安装新的依赖, 本身是支持打包nodejs插件的

### browserify

这个是为了让nodejs程序在浏览器上运行才出现的, 不符合目标, **放弃**

@图3

经过比较, 就剩下了esbuild和webpack, 因为插件代码较少, 所以esbuild的优势没了hh, 最终选择了webpack

## 配置webpack

首先根据代码分析依赖

@图4

上图有四类依赖

* A: nodejs提供的api
* B: 项目本身会安装的依赖(devdependencies)
如: webpack, webpack-dev-server(因为这些依赖实际上也是用户的项目打包需要的)
* C: 只是这个命令行项目需要的
如 cac(命令行辅助工具), portfinder
* D: 动态依赖, 是用户传入的文件路径

A类依赖, 需要将webpack打包的目标环境设置为node, 这样就不会将这些api打包进去

``` js
target: 'node14.16',
```

然后就是B类依赖, 由于它们是用户项目也需要的, 所以在配置webpack时需要将它们外部库

```JavaScript
externals: {
  webpack: 'webpack',
  'webpack-dev-server': 'webpack-dev-server',
},
```

然后我们是想让这个文件变成一个插件所以需要配置output
(不配置library的话, 上面的external会被认为是环境提供的变量, 从而将require去掉)

这是没有library的情况(为了格式化方便, 将portfinder也设置成了外部依赖)

@图5

```JavaScript
output: {
  library: {
    name: 'cli',
    type: 'commonjs',
  },
},
```

这是之后的

@图6

这样的话, 命令行插件就会依赖用户安装的依赖

### C类

C类依赖则是需要打包到文件里, 以便用户安装这个插件时无需安装多余的依赖

最后总体配置如下

```JavaScript
module.exports = {
  mode: 'production',
  entry: {
    main: './src/index.js',
  },
  output: {
    library: {
      name: 'cli',
      type: 'commonjs',
    },
  },
  externals: {
    webpack: 'webpack',
    'webpack-dev-server': 'webpack-dev-server',
  },
  target: 'node14.16',

  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: {
          and: [/node_modules/],
        },
      },
    ],
  },
}
```

在根目录下添加babelrc

```json
{
  "presets": [
    [
      "@babel/preset-env",
      {
        "useBuiltIns": "usage",
        "corejs": 3,
        "targets": "node 14.16"
      }
    ]
  ],
  "plugins": [
    "@babel/plugin-transform-runtime"
  ]
}

```

然后在package.json里面指明engines

```json
"engines": {
  "node": ">=14.16.1"
}
```

### D类

webpack在打包时会将所有依赖都解析一遍, 而这种动态的依赖会被直接编译成

@图7
@图8

在运行时就会报错

@图9

由于是包含了变量, 所以无法使用require.context (它只支持字符串拼接)

那么这个时候我首先想到的是使用nodejs的readfile, 然后使用eval来执行

@图10
@图11
@图12

但是这样的话有点多余, 因为明明nodejs已经提供了解析js文件的api----require

这里面的**关键问题**是webpack会**自动**解析**require**

那么让webpack识别不出来不就行了?

@图13
@图14

```JavaScript
const requireFunc =
  // eslint-disable-next-line no-undef
  typeof __webpack_require__ === 'function' ? __non_webpack_require__ : require

// 然后把解析配置文件的这一行替换
// const devConfig = require(path.resolve(rootDir, configFile))

const devConfig = requireFunc(path.resolve(rootDir, configFile))
```

然后再搜索打包后的文件

@图15
@图16

这次就没有了

### 节外

这里插一嘴, 为什么要让用户传入配置文件, 而不是约定配置文件在根目录呢?

约定式的配置优点很明显, 用户安装了插件, 然后把配置放在根目录就可以直接用

然而这带来了一个问题, 有很多的插件都是这样搞得, 结果导致一个前端目录下有非常多的配置文件, hh

@图17

这应该还不算多, 有的项目还有ts配置文件, vue配置文件, vue的环境文件

人麻了

所以我是比较抵制这种搞法的

> 还有一个原因就是
> 插件作为底层, 它不应该依赖于上层的项目
> 而是应该依赖倒置, 两者共同依赖于配置文件(可以不放在根目录, 甚至可以放到目录外)

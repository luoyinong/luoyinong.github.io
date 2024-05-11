---
title: 翻新旧项目之babel
date: 2024-05-11 22:40:15
---

## 项目技术栈

nodejs@14.16.1 + vue@2.7.8 + babel@6.22.1 + webpack@3.6.0
标准的vue-cli生成的项目模板

> 不过其中增加了一些插件和配置
> 如果你的项目完全是最初的vuecli@2的模板, 那么建议直接替换使用vuecli@4的模板

## 动机

看过<<重构:改善既有代码的设计>>这本书的同学应该知道, 里面提到了三次法则, 即第三次对代码感到厌烦时, 那么就需要考虑重构

但是我毕竟在国内, 开发流程与国外也不同, 项目更加注重需求的完成情况,
所以我认为重构的动机应该是由一下几点驱动, 重要性从高到低

1. 领导或者部门要求, 例如之前的代码重复率, 复杂度等不符合要求
2. 业务需求, 可以在重构后有专业的测试帮你测
3. 绩效要求/自我要求, 这个随人, 看情况

第三点的动机最不足, 你自己需要考虑到领导是否支持, 时间是否允许, 对之前的需求理解是否充分,
改动之后是否会出现bug等等, 风险较大, 个人不建议这么做

> 好好的模块, 能跑就行, 又没碍着你, 为啥要改它, 又不是不能用

而我这次想要尝试升级项目的插件版本是基于一下考虑

1. 领导觉得目前前端在流水线构建速度太慢, 需要提速
2. 无论是babel还是webpack, 它们的升级都不涉及到代码逻辑的变动, 编译跑过去基本就没问题了
3. 由于要支持ie浏览器, 所以项目一直没切vue3, 趁着代码不多先把环境升上去, 方便以后升级
4. 用过vite的人很难再忍受webpack的本地启动速度

## 思路

这个我认为很重要, 需要分步升级, 分步验证

1. 使用nvm管理node版本, 方便验证时对比, 也方便出问题时回退
2. 先升级node, node新版本是兼容旧版本的, 兼容性较好
3. 升级Babel相关插件, 它与webpack的联系是babel-loader, 只要先不升级loader就可以了
4. babel6升级到babel7有官方提供的工具, 更好升级, 万一webpack升不了, 那就只升babel
5. 利用git记录每一小步的变动, 方便对比文件和回退
6. 编译和运行都不报错后, 验证功能没问题

## 实操

### 升级node

使用nvm下载nodejs的最新稳定版本, 然后切换到这个版本

如果下载较慢需要切换下载源

使用

```shell
nvm node_mirror https://npmmirror.com/mirrors/node/
nvm npm_mirror https://npmmirror.com/mirrors/npm/
```

不要用<https://npm.taobao.org/mirrors这个>, 它已经过期了

### 使用babel-upgrade

删除node_modules, 运行工具

```shell
del -R .\node_modules\
npx babel-upgrade –write
```

Babellrc会多出一堆plugins

@图1

运行npm i报错

@图2

Node-gyp 编译有问题, 这东西一看就是node-sass的依赖, 现在sass团队推荐使用dart-sass

> de-sass的编译速度虽然快一些, 但是和node的版本强绑定, 并且还需要安装python的运行环境, 用起来很难受

手动在package.json里面移除node-sass依赖

然后运行npm i sass, npm run build报错

@图3

babel-plugin-transform-vue-jsx依赖有问题, 它需要的是babel-plugin-syntax-jsx

然而工具给babel-plugin-syntax-jsx升级到了@babel/plugin-syntax-jsx@7.0.0

所以需要将babel-plugin-transform-vue-jsx升级到4.x版本

npm i babel-plugin-transform-vue-jsx@4.0.1

npm run build 继续报错

@图4

sass不支持 /deep/和>>>语法, 新版本的sass使用了::v-deep进行穿透

如果只是把项目里的旧语法全部替换, 那倒是简单,
然而element ui里面可是使用了大量的旧语法

@图5

所以需要回退sass的版本
最后确认使用1.26.1
npm i -D sass@1.26.1
然后把package.json里面sass的版本写成固定版本

@图6

然后把项目里的/deep/和>>>全局替换成::v-deep

npm run build 继续报错

@图7

Babel@ 7.4.0新版本已经不用安装polyfill这个插件了

@图8

手动移除babel-polyfill依赖, 并将代码里的相关代码去除

@图9

npm run build 没报错

### 接下来处理babelrc多出来的配置

先理清一下这些plugin与preset的关系

下面的plugin分为三类

1. 支持vue jsx语法 (transform-vue-jsx)
2. 将babel的运行时代码整合重用 (@babel/plugin-transform-runtime)
3. 支持es6等的语法 (剩下的都是)

@图10
@图11

es6, 7 ,8相比于es5增加了许多内容, 在plugin里面一个个的去加非常麻烦
于是就可以用preset来快速使用配套的plugin

那么@babel-polyfill又和上面的第三类插件有什么区别呢?

**没啥大区别**

另外, 新版本的corejs已经替代了Babel-polyfill的位置

> corejs@2的话还需要安装@babel/plugin-transform-regenerator
> corejs@3就不用了

在preset里面配置

```js
"presets": [
    [
      "@babel/preset-env",
      {
        "useBuiltIns": "usage",
        "corejs": 3,
        "targets": {
          "browsers": [
            "> 1%",
            "last 2 versions",
            "not ie <= 8"
          ]
        }
      }
    ]
]
```

useBuiltIns是指是否使用babel内置的转换插件

@图12

前面说到要用corejs所以这里写usage, 自动按需加载

corejs用3

> 另外, 还有一个@babel/runtime-corejs3
> 这东西是你写插件库的时候用的, 避免污染全局变量

运行 npm i –S core-js@3 安装corejs 3.x的版本

删除plugin里面的es6插件以及package.json里面的依赖 (包含@babel-polyfill)

@图13
@图14

移除@babel/plugin-transform-runtime的配置

@图15

之前的upgrade工具只是升级到了7.0, 现在需要将它们的版本升级到最新版

所以需要手动移除@babel/core的依赖, 然后再重新安装依赖

```shell
npm i –D @babel/core @babel/plugin-syntax-jsx @babel/plugin-transform-runtime @babel/preset-env 
```

@图16

运行npm run build, 打包成功, 速度比起babel6快了5秒左右, 提升10%

@图17
@图18

运行 npm run dev
检查页面, 没发现问题

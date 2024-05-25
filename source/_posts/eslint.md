---
title: 翻新旧项目之eslint
date: 2024-04-20 10:40:15
categories:
- 翻新旧项目
tags:
- 前端
- eslint
---

# 背景

新入职公司, 项目新(一年)旧(好几年)混杂, 好的是已经有了公共组件库,基本上是将element ui的组件包了一层, 并且属于新代码, 坏的是基础设施基本没有(属于能跑就行的那种)

技术栈: vue@2.7 + element ui@2.15 + webpack@3.6

已发现的问题(重要性高到低):

1. 组件库UI样式不统一或者有问题
2. 部分组件封装逻辑有问题, 并且还有错误代码
3. 没有安装eslint, 隐藏了很多问题代码以及风格不统一
4. 业务项目并没有使用组件库的组件, 而是自己到处封装
5. 打包速度慢
6. 公共js组件较少, 业务项目的类似函数很多,
7. 编码质量较为低下, 有较多的违反**clean code**的代码
8. npm插件版本较为低下, 其中有些已经是EOL(end of life)

思路:

* 出现这些问题的原因说白了就是缺少前端负责人, 以及过去对前端的不重视, 导致客户经常投诉页面有问题以及交付质量差
* 针对第一点, 目前新入职的负责人已经开始整改, 这一点最好要和UI负责人以及产品确定后再进行统一
* 2,3,5,6其实都是代码质量的问题, 根本原因是缺乏规范以及有效的审查机制, 再深一点则是之前的开发人员水平高低不一
* 随着项目的开发, 代码会越来越臃肿, 如果不及时处理一些问题, 可能会给未来版本上线埋雷

综上所述, 决定还是从收益最大, 对业务影响最小的代码风格进行入手,

> ui样式问题已经被列为前端组的目标

解决方案:

* eslint 检查语法错误
* prettier 检查风格问题
* husky + lint-staged 对开发提交的代码进行审查

## 先贴方案, 再说问题

请注意, 我这是基于**旧项目**以及它配套的nodejs进行配置的, 肯定是**不符合**

各个插件**最新**的配置

### 第一步, 先在package.json添加如下配置

```json
// package.json

  "scripts": {
    "prepare": "cd .. && husky install project/.husky",
    "lint": "eslint --ext .js,.vue src --fix",
    "lint-staged": "lint-staged"
  },
  "lint-staged": {
    "*.(js|vue)": [
      "eslint"
    ]
  },
  "devDependencies": {
    "babel-eslint": "^10.1.0",
    "eslint": "^8.57.0",
    "eslint-config-prettier": "9.1.0",
    "eslint-plugin-prettier": "^4.2.1",
    "eslint-plugin-vue": "^8.7.1",
  }
```

然后运行```npm i```

### 添加eslint配置

```JavaScript
// .eslintrc.js
module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/recommended',
    'plugin:prettier/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2020,
    ecmaFeatures: {
      jsx: true,
    },
  },
  rules: {
    'prettier/prettier': [
      'error',
      {
        // 优先填写prettier规则
        singleQuote: true, 
        endOfLine: 'crlf',
        semi: false,
      },
    ],
    // 语法规则
    'space-infix-ops': ['error', { int32Hint: false }],
  },
  ignorePatterns: [
    'build',
    'config',
    'dist',
    'node_modules',
    'coverage',
    'static',
  ],
  globals: {
    $: true,
    process: true,
    moment: true,
  },
}

```

### 添加jsconfig配置

```json
// jsconfig.json

{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "@ui/*": [
        "src/ui/*"
      ],
      "@js/*": [
        "src/js/*"
      ],
      "@/*": [
        "src/*"
      ],
    }
  },
  "include": [
    "src/**/*",
  ],
  "exclude": [
    "node_modules"
  ]
}
```

### 在.husky文件夹下添加pre-commit文件

在文件中写入如下内容(第一行注释可以删除)

```shell
# .husky/pre-commit

#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

cd project && npm run lint-staged
```

上面的这个解决方案已经是很成熟的方案了, 但是, 我在使用时依旧遇到了一些小问题

下面将会说明遇到的问题以及解决方案与一些想法

### 问题一 项目配套的nodejs版本比较低

导致无法直接使用最新的npm插件(因为这些插件多多少少会使用新的api)

解决方法很简单, 去到插件的开源仓, 查看他的过往版本

![图1](/img/eslint/1.png)

切换不同tag, 然后看他的package.json里的engines字段

![图2](/img/eslint/2.png)

对比项目的nodejs, 然后选择合适的版本安装

### 问题二 npm插件版本降级后导致其它插件不适配

这个可以查看devDependencies或者Dependencies字段, 过程和上面类似, 不再赘述

### 问题三 关于eslint方案, 网上的资料太杂

资料要么是最新的eslint, 要么是过期的, 很难刚好找到适合当前项目的配置

这个时候就需要自己去仓库查看以往版本的文档

* 另外更推荐使用谷歌查资料, 国内的几个博客基本都是抄来抄去, 在里面找东西相当于屎里淘金

### 问题四 eslint和prettier冲突

这个是一个老生常谈的问题了, 我发现还是人有些没搞明白这是为什么(毕竟这东西的配置抄一抄就行, 有问题那就不搞了...)

首先呢, 我们要明白一点, 无论是eslint还是prettier, 它们管理的东西都是rules的一个集合

![图3](/img/eslint/3.png)

![图3-1](/img/eslint/3-1.png)

那么它们为什么会冲突, 很简单, eslint的部分规则和prettier有冲突

如上图3-1所示, eslint会管理代码的引号, prettier也会, 然后它们的默认值不同

<center>eslint@9.1.0</center>

![图4](/img/eslint/4.png)

<center>prettier@3.2.5</center>

![图5](/img/eslint/5.png)

所以如果你什么都没配置的话, eslint就是会和prettier打架

既然有问题, 那么社区自然也是有解决方案的, 但是, 在说方案之前, 还得先理解一个东西, 那就是eslint和prettier的职责范围

* eslint更加偏向于检查代码的**语法错误**, 目前eslint已经**放弃**了代码**格式化**这份工作

<center>eslint@9.1.0</center>

![图6](/img/eslint/6.png)

![图7](/img/eslint/7.png)

* prettier则是倾向于**代码规范**的检查, 并且会**承担**代码**格式化**的功能

<center>eslint@9.1.0</center>

![图8](/img/eslint/8.png)

所以, 以后进行配置rule的时候, **代码风格**相关的rule就写在prettier里面, **语法**相关的则是放到eslint里面

> 或者更为简单的, 先去prettier里查一下有没有这个规则, 有的话就用prettier的, 没有的话再去eslint找

说完理念, 再说方案

目前的话, 有两个解决方案, eslint-plugin-prettier和eslint-config-prettier

plugin现在已经包含了config, 所以我直接用了plugin

<center>eslint-plugin-prettier@5.1.3</center>

![图9](/img/eslint/9.png)

这玩意说白了就是把eslint格式化相关的规则给禁用了, 然后又把eslint和prettier冲突的规则合并了, 只用prettier的, 所以用了

之后就不会再有冲突

### 问题五 vscode怎么配置代码格式化

首先呢, vscode是自带js解析以及格式化的, 如果要用eslint, 那么就需要在vscode安装eslint插件, 这个插件和npm的eslint不同,
它支持代码格式化,所以就别再装个prettier了

然后在vscode的配置文件写入一下配置

```json
// setting.json
"eslint.options": {
    "extensions": [
        ".js", // 使用eslint检查文件的类型
        ".vue",
        ".jsx",
        ".tsx"
    ]
},
"editor.codeActionsOnSave": {
    "source.fixAll.eslint": "always"  // 代码保存格式化
},
"eslint.format.enable": true, // 开启eslint格式化
"[javascript]": { // 使用eslint格式化js
    "editor.defaultFormatter": "dbaeumer.vscode-eslint"
},
"[vue]": {
    "editor.defaultFormatter": "dbaeumer.vscode-eslint"
},
```

### 问题六 git目录在前端项目目录之外

![图11](/img/eslint/11.png)

husky的文档已经提供了解决方法

<center>husky@9.0.11</center>

![图10](/img/eslint/10.png)

### 问题七 lint-staged不生效

有几个可能, 一是配置写的有问题

```json
  "lint-staged": {
    "*.(js|vue)": [
      "eslint" // eslint不要传文件参数, 需要由lint-staged处理后传给eslint
    ]
  },
```

二是git版本可能有问题

使用命令查看git版本

```shell
git --version 
```

然后使用命令升级到最新版本

```shell
git update
```

三是husky的命令没有运行, 这个可能是.husky目录下缺少这个文件夹

![图12](/img/eslint/12.png)

### 问题八 vscode没有完全开启js功能

例如 ctrl点击到定义处, 路径补全

这个需要在项目里配置[Link](#jsconfig配置)

### 问题九 同一个git目录下有多个前端项目需要管理

这样的话husky的目录就不能放在前端项目里了, 因为git的hookpath只能有一个
所以需要放在两个前端项目的外面

```js
-- platformWeb
---- .git
---- frontendA
---- frontendB
---- husky
------ _
------ pre-commit
```

> 放到外面后需要重新执行husky初始化命令

```json
// package.json
{
  "script": {
    "prepare": "cd .. && husky install .husky"
  }
}
```

这样的话就带来另外一个问题, 可能你只负责frontendA项目, 并不想管frontendB,
但是现在这样的话, 会导致eslint检查所有项目, 并如果frontendB没有安装以来的话会
报错, 导致无法提交

这个时候就需要更改pre-commit命令, 只检查修改的项目

```shell
# pre-commit

#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"


changedFiles=$(git diff --cached --name-only --diff-filter=ACM)

rootDir=$(PWD)

# 判断目录是否改动

isFrontendA=false
isFrontendB=false

for file in $changedFiles
do
    if [[ $file == frontendA/* ]]
    then
        isFrontendA=true
    if [[ $file == frontendB/* ]]
    then
        isFrontendB=true
    fi
done

execTask() {
    echo "$rootDir/$1"
    echo "root $1 commit-msg"
    cd "$rootDir/$1" && npm run lint-staged
}

if $isFrontendA
then
    execTask "frontendA" $1
    task1=$! # 保存任务 id
fi

if $isFrontendB
    execTask "frontendB" $1
    task2=$!
fi

if [[ -n $task1 ]]; then
    wait $task1
fi

if [[ -n $task2 ]]; then
    wait $task2
fi
```

> 如果项目太多可以考虑用数组


### 想法一

其实一开始是不想在pre-commit进行eslint检查的, 我是想在git push时进行检查

> 一是节省时间
> 二是平时在本地进行git相关操作时会比较方便

后来由于负责人以及同事要求commit就处理, 只能放弃

> 毕竟刚来, 估计同事们可能有其它考虑

### 想法二

前面只是装了eslint, 并没有修复代码, 运行eslint之后, 发现还剩下100+errors和10+warnings

> 只能说这个组件库还比较年轻

只改规范问题, 至于涉及到复杂逻辑的, 一律禁止这一行的检查, 等到后面有了单元测试再看

### 想法三

代码审查并不只是eslint检查, esilnt属于最基础的部分,

还应该根据不同要求在不同方面进行体现
如:

1. ui要求, 那么则是可以在mr上添加完成的图片
2. 安全要求, 需要committer在codereview时仔细检查代码以及流水线安全检查
3. 缺陷要求, 流水线跑单元测试等

这些都可以提升前端代码质量, 只不过需要因地制宜

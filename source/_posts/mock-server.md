---
title: 前端mock与请求转发
date: 2024-06-09 18:45:15
categories:
- server
tags:
- nodejs
- mock
- h5
- token
---

# 前言

最近在同时做两个需求, 一个是**pc端**的, 另外一个是**移动端**的, 难受的是这两个需求在开发时都遇到了问题,

* **pc端**的接口已经设计完毕, 但是处于开发中, **前端**只能靠**接口文档**进行字段的**预绑定**, 无法查看具体效果
* **移动端**同样也有上述的问题, 但是, 它还多了一个**认证**的坑, 之前的同事是用临时token解决的(会有时效性)

## mock数据

第一个问题是个老问题了, 一般的做法就是自己模拟数据, 不过模拟数据也有好几种方式

### 硬编码假数据

优点: 改数据方便
缺点:

1. 联调时需要删除代码,
2. 有时还要把数据代码恢复
3. 把数据放到单独的文件夹, 然后通过切换环境使用不同的接口,
然而这会导致假数据被打包到文件里

> 虽然也可以通过改webpack配置来去除mock数据, 但是之前已经做了依赖升级
> 只是代码没合入, 现在再改配置, 很麻烦

### 使用mock工具, 将假数据与项目代码分离开来

优点:

1. 改数据也很方便,
2. 有些工具甚至能根据接口文档自动生成数据
3. 方便组员共享数据

> 这边没有开发环境, 只有联调环境, 还经常坏, 需要使用本地数据

缺点: 暂无

故最终决定将假数据和项目分离开来

## 工具选择

### mockjs

这东西是需要配合服务器使用的, 它自己只是负责造随机数据的, 除非是写在项目里, 不过已经确定分离数据与代码
适合和其它工具配合使用

@图1

### json server

我个人对于restfult api是无感的, 只是这边的后端统一用的是post, 所以在这方面json-server没优势

再加上它好像不支持随机数据, 所以pass

@图2

**restful**接口好在接口**可读**, 方便**复用**时快速理解,
但是我接触到的大多数接口都是**内部使用**, 并且**不会复用**

> 另外它用http状态码来表示业务状态, 只能说呵呵了

### apifox

这东西内嵌mockjs, 启动方便, 在postman的基础上增加了其它的功能

@图3

并且对于中小团队是免费的, 不用担心版权问题

@图4

> 还是想吐槽一句, 这些工具都要强制登录, 虽然能理解, 但是不支持

### 结论

解决这个问题最好的方法是使用apifox

## H5接口认证

如果说直接调用web后端在本地启动的服务, 那是可以让后端把token认证暂时去掉的, 但是这一次的需求比较特殊,
只能调联调环境的接口,

这时问题就来了, pc端的网页可以通过登录获取一个临时的token, 嵌入在app的h5页面没有登录页, 只能通过app获取token,

这意味着在本地开发页面时拿不到token, 所以在初步与web后端联调时会有问题

> 之前的开发者都是从网页端复制一个token, 然后贴在代码里...

### 过往经验

其实之前我是遇到过相似的问题, 那是一个低代码平台, 基础的页面和服务开发都是在平台的网页里面搞的,
> 前后端js一把梭

然后新的java架构师转而使用**java**进行编写服务, 新的前端负责人使用**vue3**进行编写页面
这就带来了token认证的问题

与目前的状况**相同**的地方:

1. 都可以**调用**java后端**本地**启的服务
2. 调用开发**环境**的话都需要拿到**token**
3. 后端基本**不愿意管**这个事情, 只能前端**自己处理**

不同的地方:

1. 低代码这个是由于**安全**问题, 平台那边它是**不**开放**跨域请求**的, 所以你本地没法登录, 自然也没法拿token
2. 低代码平台除了认证之外还有跨域问题
3. 而app这边是**没有登录**页, 导致没法拿到token

之前我为了解决这个问题是采用了比较复杂的方案,

1. expressjs接受webpack-server代理的请求
2. websocket转发请求给开发环境
3. 开发环境的客户端接受请求后转发给后台
4. 最后数据按照原路返回

@图5

这样基本就相当于所有请求都走线上的服务, 当时遇到的一个主要的难题是上传图片, websocket传的是文本信息

一开始是转的base64, 后来其它同事说大图片有问题, 然后改成了websoket发送信号, 客户端主动请求数据

> 之所以这样搞, 主要还是因为平台不接受跨域请求, 没办法

当时也考虑过使用postMessage, 在不同页签进行通信,

```JavaScript
// local page
const targetUrl = 'https://123.com/project/page'
const onlineWindow = window.open(targetUrl)
onlineWindow.postMessage({name: 'test'}, targetUrl)

// online page
window.addListener('message', (event) => console.log(event))
```

这样的话就需要在本地页面执行相应js:

* 要么更改项目代码
* 要么每次刷新时都粘贴一段代码到本地页面的控制台
* 要么使用浏览器插件(油猴等)插入js代码

感觉第一种不太好, 第二种很麻烦, 第三种可能会被公司认为是违规行为, 所以最后还是使用了websocket

> 至于线上页面, 由于是低代码平台, 自己写个页面加上客户端js, 每次调试时打开这个页面就行, 比较方便

### 思路

这次的问题相比前面要简单得多, 只需要及时获取**线上**环境的**token**即可,
然而
这个问题再加上前面的**mock数据**问题, 我认为还是**共用**同**一种解决方案**会比较方便

所以, 我决定自己写个简单的服务器, 它需要满足以下需求

首先是功能需求

1. 支持**代理**模式和**mock**模式
2. **代理**模式自动**登录线上**环境, 获取**token**并**保存**下来
3. **代理**模式可以**定时刷新**token
4. **代理**模式可以将**token挂载**代理的请求上
5. mock模式将假数据返回
6. **mock**数据支持**随机**也支持**写死**

其次是开发体验需求

1. 服务支持**热更新**, 方便随时更改mock数据和代理路径
2. 不同项目的mock服务**支持开启**和关闭, 避免可能的冲突
3. 友好的**错误提示**, 方便开发者**快速定位**问题
4. **配置**要尽量**直观与集中**, 不要反人类
5. 加上**文档**(如果要给其它人用的话), 方便新的使用者快速上手

## 解决方案

说下大体设计方案

nodejs + expressjs + cors

@图6

### 配置

首先是配置, 配置分为两种,

1. 服务器本身的配置(端口号, 模式, 开启哪个项目的服务, 对应的用户名和密码)
2. mock数据

**服务器配置**

由于部门内部的开发环境账号密码是共享的, 所以无需将用户名和密码分离开, 放在js文件里即可,

然后入口文件 (main.js) 读取数据

> 开发自己用的项目的配置文件尽量还是用js, 不要用json, 不方便扩展

**mock数据**

mock数据的话, 使用glob和require将文件里的配置读取出来, 然后入口文件根据服务器配置进行传参, 最后过滤拿到要建立路由的数据,

```javascript
// 读取文件里的配置
const glob = require('glob');
const path = require('path');

function getProjectName(absolutePath) {
  const filename = path.basename(absolutePath, '.js');
  if (filename === 'index') {
    const dirname = path.dirname(absolutePath);
    return dirname.split(path.sep).pop();
  }
  return filename;
}

function resolveConfig(pattern) {
  let config = {};

  const jsfiles = glob.sync(pattern);

  jsfiles.forEach((filePath) => {
    const absolutePath = path.resolve(process.cwd(), filePath);
    const data = require(absolutePath);

    const projectName = getProjectName(absolutePath);

    config[projectName] = data;
  });

  return config;
}

```

```JavaScript
// 过滤配置
function filterConfig(config, projects) {
  const result = {};
  const filter = [];

  if (!projects || projects.length === 0) {
    return config;
  }

  if (Array.isArray(projects)) {
    projects.forEach((name) => {
      filter.push(name);
    });
  } else {
    Object.entries(projects).forEach(([key, value]) => {
      if (value) {
        filter.push(key);
      }
    });
  }

  Object.entries(config).forEach(([projectName, value]) => {
    if (filter.includes(projectName)) {
      result[projectName] = value;
    }
  });

  return result;
}
```

```JavaScript
// 建立路由

function buildRoute(projects) {
  const finalConfig = filterConfig(config, projects);

  Object.keys(finalConfig).forEach((projectName) => {
    const mockDatas = finalConfig[projectName];

    Object.entries(mockDatas).forEach(([key, value]) => {
      // console.log(key);
      router.post(key, (req, res) => {
        let result;

        if (typeof value === 'object') {
          // 数组 数据从中随机选择一个返回
          if (Array.isArray(value)) {
            // 概率平均
            const length = value.length;

            const ran = Math.floor(Math.random() * length);

            result = value[ran];
          } else {
            // 对象 直接返回
            result = value;
          }
        } else if (typeof value === 'function') {
          // 函数 返回函数的返回值
          result = value();
        } else {
          throw new Error(
            'fail to resolve moack data at ',
            projectName,
            'path: ',
            key,
          );
        }

        res.json(result);
      });
    });
  });

  return router;
}

```

### 获取token与刷新token

每次代理的请求都要调用getToken方法, 然后将token放在请求上

```JavaScript
async function getToken(logInInfo, { force }) {
  if (isFirstLogin(logInInfo) || force || isExpired(logInInfo)) {
    console.log('update token');
    await updateLoginInfo(logInInfo);

    logInInfo.expireTime = tokenExpireTime(logInInfo.token);
  }

  return { token: logInInfo.token, expireTime: logInInfo.expireTime };
}
```

由于涉及到公司的验证步骤, 所以生成账号信息与加上token的代码就不贴了,

### 支持热更新

使用npm-watch, 监听src下面的js文件

@图7

### 友好的错误提示

使用morgan, 自定义后台提示信息

```JavaScript
app.use(morgan(':method :url :status'));
```

### 代理请求

这个可能和mock服务有冲突, 所以服务器配置那里只支持代理模式和mock模式二选一

其次, express router是支持正则的, 所以服务器配置里的proxy table可以和webpack server里的差不多

@图8

### 文档

这东西我目前只打算自己用, 未来统一升级配置后, 可能会**集成**到**脚手架**里

不过写**好文档**也是一件**难**事,

1. **用户**和**开发者**是存在天然的**知识代沟**的, 并且很难相互理解
2. 文档的**维护**是一件**蛋疼**的事情, 容易忘, 也没成绩

第一点很难从技术上解决, 主要还是提供**一键配置**服务, 然后给用户选项, **让他选**而不是让他配

第二点则是要从**设计**时就考虑清楚, 提供给用户的**接口**最好**不要变**, 提供的功能也不要变, 要变就加新接口和功能
做到**向下兼容**

### 可能存在的问题

目前他这个h5是直接调的web端的接口, 其它h5可能会调移动端独有的接口, 到时候的token就不可能这么简单就获取和解析

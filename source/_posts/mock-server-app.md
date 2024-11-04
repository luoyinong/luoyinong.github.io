---
title: app原生接口mock
date: 2024-11-04 16:22:15
categories:
- server
tags:
- nodejs
- mock
- h5
---


# 背景

最近在开发门禁机相关的h5，借个设备来回搞了一天，然而最后还是只能连开发的设备，这就导致了不能随便改机器的数据
开发h5比较僵硬

之前已经完成了对服务器接口的mock工作，但是没有搞app与h5的数据交互，经过这次的事情，我决定给mock服务加上模拟app的能力

## 思路

这肯定会涉及到两端的修改，一个是h5，一个是mock服务器，需要符合以下原则

1. h5改动越少越好，
2. mock服务器这边的话，则是需要尽量符合之前mock数据的格式，不要增加使用难度

这里的h5项目与app交互都是通过js对象jsbridge传递的，app装一个webview，webview挂一个全局对象，然后h5在上面注册回调，

这样h5就可以拿到app的数据，app也可以注册事件，拿到h5发过来的消息

这种方式给模拟app数据带来了一定的麻烦，毕竟mock服务不可能主动在h5页面加一个对象

> 就算可以也很麻烦，并且不符合前面的原则1

## 实践

### h5

给h5加一个mode，mode='mock’时，jsbridge将数据转成post请求发出去

```JavaScript
const isMock = process.env.VUE_APP_MODE === 'MOCK'

function bridgeCallHandler(type, params, cfn = function () {}) {
  let wbB = window.WebViewJavascriptBridge

  if (isMock) {
    // mock模式下，将发给app的数据转发给mock服务器
    import('@/api/request').then(({ default: request }) => {
      request.post(`/app-mock/${type}`, params).then(res => {
        cfn(res.data)
      })
    })
  } else {
    // 这块代码做了极大的简化，只是表明大概意思
    wbB.callHandler(type, params, cfn)
  }
}

```

这样就做到了尽量少的改动h5，只会在mock模式下引入文件，需要mock app数据时，在.env.development.local加上

```VUE_APP_MODE=MOCK```

就行

### mock服务器

服务器这边的改动就会相对较大了，它需要解决以下问题

1. 传给app的数据内部包含一部分的url，与普通的post请求不同，需要区分
2. 与app的交互，有一部分不需要返回值，还有一部分涉及到手机的功能，如请求摄像头,请求录音等，这些交互的响应不能报错
3. 虽然app与服务器返回的数据都是json，但是前者需要经过JSON.parse,后者经过axios自动变成js对象，前者需要做兼容

问题1比较好解决，由于都是一个部门，app接受的数据格式都是统一的，写一个express中间件，统一处理一下就可以了

```JavaScript
const responseData = require('../responseData.js');

// appMockPrexfix, app mock请求的前缀
module.exports = (router, appMockPrexfix) => {
  return (req, res, next) => {
    const {
      path,
      body: {
        data: { url },
      },
    } = req;
    const arr = path.split('/').filter((item) => item);
    let key = '';

    if (url === undefined) {
      key = `${appMockPrexfix}/${arr.join('/')}`;
    } else {
      key = `${appMockPrexfix}/${arr.join('/')}/${url}`;
    }

    res.redirect(key)
  };
};
```

解析参数里包含路径的请求，然后拼接成最终路径，最后重新转发到服务器

问题2的话，这个的话涉及到express router的一些api，具体可以参考文档

我们需要一一对比router的里面的path，然后给匹配不上的返回空消息，避免h5报错

```JavaScript
module.exports = (router, appMockPrexfix) => {
  return (req, res, next) => {

    // 处理参数url...


    let hasRouteToHandle = false;

    router.stack.forEach((stackItem) => {
      // check if current rout path matches route request path
      if (stackItem.route?.path === key) {
        hasRouteToHandle = true;
      }
    });

    if (hasRouteToHandle) {
      res.redirect(key)
    } else {
      // No matching route for this request
      console.log('app request will not be handled');
      res.json(responseData.createBasic(null));
    }
  };
};
```

不过上的方法还是有一些隐藏的问题的，express router并不是通过 stackItem.route?.path === key 来判断的，他是将path变成了pathRegexp，

@图1

这会导致有一些复杂的url可能匹配不上，所以需要修改判断条件

```JavaScript
if (stackItem.route?.path === key) {
  hasRouteToHandle = true;
}

// 变成

if (stackItem.regexp.exec(key)) {
  hasRouteToHandle = true;
}
```

然而调试的时候发现redirect的请求不会被代理，原因是h5项目会把代理url前缀重写，而服务器无法获知

所以不能用重定向，而是在中间件里修改req的url，而express提供了方法

@图2

```js
const responseData = require('../responseData.js');

module.exports = (router, appMockPrexfix) => {
  return (req, res, next) => {
    const {
      path,
      body: {
        data: { url },
      },
    } = req;
    const arr = path.split('/').filter((item) => item);
    let key = '';

    if (url === undefined) {
      key = `${appMockPrexfix}/${arr.join('/')}`;
    } else {
      key = `${appMockPrexfix}/${arr.join('/')}/${url}`;
    }

    let hasRouteToHandle = false;
    let currentStack;

    router.stack.forEach((stackItem) => {
      // check if current rout path matches route request path
      if (stackItem.regexp.exec(key)) {
        hasRouteToHandle = true;
        currentStack = stackItem;
      }
    });

    if (!hasRouteToHandle) {
      // No matching route for this request
      console.log('app request will not be handled');
      res.json(responseData.createBasic(null));
    } else {
      req.originalUrl = key;

      currentStack.handle(req, res, next);
    }
  };
};
```

最后就是问题3，虽然app与服务器返回的数据都是json，但是前者需要经过JSON.parse,后者经过axios自动变成js对象，需要前者做兼容

可以在buildRoute里处理模拟数据

```js
// main.js

function buildRoute(projects, appMockPrexfix) {
  const finalConfig = filterConfig(config, projects);

  Object.keys(finalConfig).forEach((projectName) => {
    const mockDatas = finalConfig[projectName];

    Object.entries(mockDatas).forEach(([key, value]) => {
      let isApp = false;

      if (key.startsWith(appMockPrexfix)) {
        isApp = true;
      }

      // 其它处理

      router.post(key, (req, res) => {

        // 其它处理

        if (isApp) {
          if (result.data) {
            result.data = JSON.stringify(result.data);
          }
          res.json(result);
        }

        // 其它处理
      });
    }
  }
}

```

有些读者可能会问，为什么不在之前的中间件处理response呢，或者新建一个appResponse中间件，这样会更加合理

在buildRoute里写的话，会使得这个函数依赖具体的实现

这么写是两个原因

1. express 中间件是链式调用，不像koa的洋葱圈，express的中间件res.send之后，就不会调用后面的中间件了，所以无法处理req.body
2. 前面也提到过，同一个部门的数据格式都是统一的，所以写在buildRoute里面也行

关于第二点，我再说一下，要优化也不是不行，可以搞依赖注入那一套，加个统一处理mock数据的函数，然后根据mock数据类型对数据进行不同处理

```js
function handleResponse(url,data) {
  const type = resolve(url)

  switch (type) {
    case web1:
      // handle web1
      break;
    case web2:
      // handle web2
      break;
    case app1:
      // handle app1
      break; 
    default:
      break;
  }
}

function buildRoute(projects, resCb) {
  // 其它处理

  res.send(resCb(data, url))
}

buildRoute(enabledProjects, handleResponse);

```

> 或者搞个处理res的对象，有默认处理方法，也有app处理或者其它类型的处理方法，然后挂到mockData上面，当配置项

但是呢，我这里没必要，本来就是给内部用的，并且要尽量简单，做到开箱即用，不搞那么多的配置

最后就是在入口文件使用中间件

```js
// index.js

const buildMockRoute = require('./data/main.js');
const buildAppRequest = require('./utils/middleWare/buildAppRequest.js');

if (mode === 'mock') {
  const appMockPrexfix = '/app-mock';
  const mockRouter = buildMockRoute(enabledProjects, appMockPrexfix);
  const appRequstMid = buildAppRequest(mockRouter, appMockPrexfix);

  app.use('/', mockRouter);
  app.use(appMockPrexfix, appRequstMid);
} else if (mode === 'proxy') {
  const tokenRouter = buildTokenRoute(enabledProjects);

  app.use('/', tokenRouter);
} else {
  console.error('mode error');
}
```

app项目处理原生交互的[代码](#h5)

这样一来，mock服务器就支持app原生数据的模拟了，并且data的结构和web接口的结构一摸一样，只是response.body的内容不一样，非常容易使用

并且对app的改动也非常小，其它app项目也容易引入

## 题外话

koa和next的中间件都是用的洋葱圈模型，所以它们都可以修改响应，当初觉得比较简单就直接用了express，只能说高级别的框架确实要好用些

这种洋葱圈模型确实比较有意思，我就想着自己实现一下

首先是使用场景

```js
const mid1 = async (req, res, next) => {
  handle(req)

  await next()

  handle(res)
}
const mid2 = async (req, res, next) => {
  handle(req)

  await next()

  handle(res)
}

app.use(mid1, mid2)
```

所以思路也就出来了

1. next返回一个promise，等到响应时将promise解决掉
2. 中间件的执行顺序是 mid1 => mid2 => mid2 => mid1, 可以使用js自带的递归来解决

```js
const app = {
  stack: [],
  use(...args) {
    this.stack.push(...args);
  },
  // 核心代码
  start(request, response) {
    let index = this.stack.length;

    const next = () => {
      if (index > 0) {
        index--;
        const current = this.stack[index];
        current(request, response, next);
      }

      return response.p;
    };

    next();
  },
};

const mid1 = async (req, res, next) => {
  console.log('before mid1');
  console.log(req.params);
  console.log(res.body);

  await next();

  console.log('after mid1');
  console.log(res.body);
};

const mid2 = async (req, res, next) => {
  console.log('before mid2');
  console.log(req.params);
  console.log(res.body);

  await next();

  console.log('after mid2');
  console.log(res.body);
};

app.use(mid1, mid2);

const response = {
  p: new Promise((res) =>
    setTimeout(() => {
      response.body = {
        data: '12hgfaogijero',
      };
      res();
    }, 3000),
  ),
};

app.start(
  {
    params: {
      name: '123',
      age: 12,
    },
  },
  response,
);

```

结果

@图3

那怎么让express也支持洋葱圈模型呢，我倒是有个思路

1. 重写response.send, 触发promise
2. 重写router里的next返回promise, 因为express的中间件其实是依赖router实现的

总之是比较麻烦的，就不搞了

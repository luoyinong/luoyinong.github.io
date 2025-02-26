# 背景

之前说过，这边的前端基建几乎是零，所以H5上测试环境后就遇到了问题，测试发现bug后，开发无法快速定位到问题，
因为看不到H5的日志

接口日志倒是能看，但纯前端的问题的话，还是很难排查，等到自己到联调环境去复现时，又复现不出来，这就很尴尬了

## 思路

这里的思路倒是很直接，日志有两种，线上和本地，鉴于app那边已经有自己的本地日志了，所以H5可以接入app的日志，借助

app来快速完成日志的记录。

### 分类 

一般来说，一旦上了测试或者正式环境，那就不能打印日志了，不过错误信息还是要记录的， 所以要区分级别，平时用来调试的

日志就别打了，这一点在之前的webpack里已经加上了插件，在非开发环境会自动去除log和info的日志。

那么，作为一名开发，为了在线上环境快速定位问题，我需要看的日志可以分为如下几类

1. js的异常与错误，比如说用的变量不存在，JSON.stringfy失败等等
2. 异步调用失败
3. 接口异常
4. 调用app的接口异常

### 边界

由于app也有自己的日志，所以需要和app的区分一下，不然会污染对方的日志，并且自己也难得看

在日志前加个前缀即可，如 H5_ERROR

其次，这个错误日志不能影响原有的开发调试，

最后，需要上报的是没有处理的，意料之外的异常，

比如接口返回的错误已经被捕捉并处理，那么这时候就不需要上报了

又比如说用户提交表单，结果elForm校验不通过，返回了个error，页面不让用户提交并提示错误，
这种同样不需要上报（使用try...catch处理即可）

## 实践

### 捕捉

首先是捕捉js的问题


```javascript
// 页面自身错误
window.addEventListener('error', event => {
  const { message, filename, lineno, colno, error } = event

  const logData = {
    type: 'JS_ERROR',
    message: message,
    file: filename,
    line: lineno,
    column: colno,
    stack: error?.stack || '无堆栈信息'
  }
  handleError(logData)
})

```

其次是异步调用的问题

```javascript
// 捕获未处理的Promise rejection
window.addEventListener('unhandledrejection', event => {
  const {
    reason: { message, stack }
  } = event
  const logData = {
    type: 'PROMISE_REJECTION',
    message: message || '未知错误',
    stack: stack || '无堆栈信息'
  }

  handleError(logData)
})

```

然后是业务逻辑中决定跑出来的异常

```javascript
const oldErorHandler = console.error

console.error = (...params) => {
  const msg = params.map(item => {
    if (item instanceof Error) {
      return {
        msg: item.message,
        stack: item.stack
      }
    }
    return item
  })
  handleError({
    type: 'CONSOLE_ERROR',
    message: msg
  })

  oldErorHandler.apply(console, params)
}

```

最后是捕捉接口和app的异常，这里就不贴代码了，

接口是在处理的所有错误码之后上报，app也是

> vue-router有个api叫做onError,如果用了的话那么它就不会打印异常，需要自己处理或者上报

### 上报

```javascript
const logLevel = {
  info: 'log/info',
  error: 'log/error',
  warn: 'log/warn',
  debug: 'log/debug'
}

const H5Prefix = 'H5_ERROR: '

let lastData = null

export function handleError(data) {
  try {
    let logContent = JSON.stringify(data, null, ' ')

    if (lastData === logContent) { // 这里是为了避免重复的日志
      return
    }
    lastData = logContent

    appLog(logLevel.error, H5Prefix + logContent)
  } catch (error) {
    //只会影响上报日志，所以只在app日志里打印
    appLog(
      logLevel.error,
      H5Prefix +
        JSON.stringify({
          type: 'CONSOLE_ERROR',
          message: 'fail to log error'
        })
    )
  }
}

```

最后，将上述捕捉异常的代码放入一个函数里，在main.js最前面调用

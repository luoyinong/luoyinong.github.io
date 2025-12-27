---
title: 页面加载优化
date: 2025-11-15 14:30:00
categories:
- 性能优化
tags:
- 前端
- 性能优化
---

## 背景

之所以写这个, 是因为最近连续遇到了两个加载缓慢的问题, 先是H5需要三十一秒加载出来, 后是web登录需要20秒才能进入首页ψ(｀∇´)ψ

## 确认问题

### H5缓慢

经过排查, H5加载缓慢是因为iphone的审核用的是国内的账号, 所以访问的也是国内部署的H5, 加上H5项目规模增长迅速, 自然就变得非常缓慢, 审核看到一直白屏, 就打回了

### web缓慢

首先呢, 这个同样是外网环境, 测试在公司访问首次新加坡DC的网址, 之前大概是1-2s的等待时间, 这次突然变成了20秒

@图1

@图2

@图3

从网络请求可以看到, 登录到首页之前需要加载一个js文件, 这个js文件的体积比较大(3672KB), 下载了19s

这次登录很慢的原因主要有三点

1. 首次访问没有缓存
2. 测试没有挂梯子
3. 进入首页加载的资源确实有点大了

针对第一点在不禁用缓存的情况下

@图4

非常快, 首页整体大概是0.7秒左右

针对第二点, 挂梯子禁用缓存

@图5

## web思路

首先呢, 肯定是要让测试挂梯子的, 不然没法搞, 线路不稳定, 前端不背锅

其次, 优化资源大小

这个可以分为几个步骤

1. 查看首页加载地模块, 看下是否有冗余的模块可以删除, 或者使用懒加载
2. 就网络请求来看, 目前只优化了缓存,没有加压缩, 可以加上GZIP(或者Brotli, 这是谷歌新搞的一种压缩格式, 压缩率更高, 但兼容性一般)

@图6


### 压缩资源

这个最好搞, 性价比也很高, 所以先说这个

在webpack的prod配置里加上压缩配置即可

然后通知运维, 让他们在nginx加上支持GZIP的配置即可

```JavaScript
const compressionPlugin = require('compression-webpack-plugin')

plugins: [
  new compressionPlugin({
    filename: '[path][base].gz',
    algorithm: 'gzip',
    test: /\.js$|\.css$/,
    threshold: 102400, // 大于100k进行压缩
    minRatio: 0.8,
    deleteOriginalAssets: false,
  }),
],
```

压缩后的效果

@图13

压缩后体积减小了87%左右, 效果很明显, 这也是之前为什么说性价比很高的原因

#### 为什么节点是100KB?

因为观察了一下资源的请求, 100KB是个分水岭, 小的基本都是几KB, 大的基本都超过了100KB, 所以用100KB作为分界点

#### 为什么是前端压缩?

明明nginx也支持将资源压缩成GZIP, 并且前端压缩的话, 会减慢打包速度

目前服务器资源比较紧张, 所以只能前端压缩

#### nginx怎么配置

@图9

加上这一行即可

### 查看模块

如下图所示, 这是首页的模块分析

@图7

左上角那个最大的模块非常显眼, 3.8M..., 查看git记录后, 才知道是其它开发在首页加了一个新功能, 直接引入了aws-sdk和aliyun-sdk,

这就导致了首页需要加载的资源骤然变大, 从而登录耗时变得非常长

@图8

就是这一行, 导致首页资源变得非常大 

> 这个是后来补的图片, 所以后缀的hash值对不上, 当时是一致的

运行本地项目查看网络请求, 这个是不会有hash值的, 看的更加清楚

@图10

就是这几个家伙

首先想到的是tree-shaking, 然后这个想法就被我第一时间排除了, 之前的文章里也说过, 项目使用的框架比较老旧, 我之前升级到webpack4就已经很费精力了, 辛亏控制了改动, 下个大版本开发时基本没有问题

现在是版本中后期, 快进入集成, 我要是搞事的话, 今年的大锅必定扣我头上

### 懒加载

在上面的图片已经看到了, 这几个oss-sdk是一个整体, 很难在进行切分, 既然如此, 干脆都不要了(不是)

```JavaScript
// 上一版本
import { uploadToCloud } from '@/utils/h5/downloadOss.js'

// 优化后
let uploadToCloud
watch: {
  visible() {
    import('@/utils/h5/downloadOss.js').then(({ uploadToCloud: temp }) => {
      uploadToCloud = temp
    })
  },
},

methods: {
  submit() {
    uploadToCloud(info, file)
  }
}
```

这个新加的功能是一个弹窗里的, 所以它并不是第一时间就会被用户使用到, 只有当用户打开弹窗后, 点击下载按钮才会使用这个函数

我们可以使用懒加载的方式, 只有当用户点击下载弹窗时才引入这个模块, 从而大福降低引入模块的大小


@图11

这样再看, 就会发现刚才框的oss相关的模块消失了

点击下载弹窗后, 才会下载文件

@图12

由于webpack会记录加载的文件id, 所以这里不用担心重复下载两个资源文件的问题

这种写法其实还是有些问题的, 虽然是在打开弹窗=>点击下载中间插入了引入资源的步骤, 用户可以不感知引入资源的时间

但万一资源没下好, 加上用户手比较快(～￣▽￣)～

所以这里最好加上一个等待的机制, 不过这样一来, 要是以后有其它的模块也需要这样的优化, 就会显得很麻烦

所以需要将其变成一个通用的方法, 以供日后其它页面(项目)使用


```JavaScript
class DynamicImport {
  constructor(path) {
    this.path = path
    this.mod = null
    this.pendingPromise = null
  }

  async start() {
    let resolve

    this.pendingPromise = new Promise((res) => (resolve = res))
    this.mod = await import(`@/dynamic/${this.path}`) // 必须写上一部分路径, 帮助webpack识别

    resolve()

    return this.mod
  }

  loading() {
    return this.pendingPromise
  }
}
```

使用

```JavaScript
let uploadToCloud
const downloadImport = new DynamicImport('downloadOss.js')

watch: {
  visible() {
    const mod = await downloadImport.start()
    uploadToCloud = mod.uploadToCloud
  },
},

methods: {
  async submit() {
    await downloadImport.loading()
    uploadToCloud(info, file)
  }
}
```

这样一来, 即使网络较差或者用户手速很快, 点击下载后也会等到资源加载完毕后再调用函数

> 需要注意的是DynamicImport里的注释, 如果全是变量, 那么代码运行时, webpack将会报cannot find module

### 其它思路

除了压缩和懒加载这两个常见的方法, 是否还有其它方法加速页面加载呢?

答案肯定是有的

首先是常见的CDN加速, 如果公司没预算, 那就从前端入手, 分析首页的资源情况

1. 图片太大, 那就先用小图, 后面再加载高清图
2. 引入的js,css资源过多, 导致请求被阻塞, 可以设置合理的分包临界点
3. 引入的资源过大, 拆分模块, 只引入必要的模块, 如果不是首页, 那么可以使用预加载等手段

## H5思路

首先要做的肯定也是用资源压缩, web已经说过, 这里就不再提了, 其次是分包, 这个需要app开发配合, 他们目前没时间, 所以我只是试了一下(自己搞了一个简陋的app demo), 效果非常明显

H5和web说实话没有多少区别, 唯一的一个不同点是H5是运行在app里的webview, 其实webview也是一个浏览器, 但是它是受到app控制的, 所以可以在这一方面下手

1. 缓存, app已经做了(但颗粒度很粗, 其实可以做到更好, 只是很难推动)
2. 将运行时文件(vue框架, 组件库, 加密库等)拆分出来, 存到app, 这些文件的特点是几乎不会改变, 如果后续需要升级, 可以考虑建一个静态资源服务器, app可以从这里下载版本合适的运行时文件

### 想象中的方案

首先是分包, 这个很简单, 更改一下webpack的打包配置即可

```JavaScript
webpackConfig.optimization.splitChunks({
  chunks: 'all',
  cacheGroups: {
    library: {
      name: 'chunk-library', 
      priority: 20,
      test: /[\\/]node_modules[\\/](vue|vant|ali-oss|aws-sdk)[\\/]/,
    }
  }
})
```

打包后, 将拆分出来的文件传给app, 让app存储起来

然后webview发送请求时, app将特定资源的请求拦截, 替换成本地资源

```Java
mWebView = findViewById<WebView>(R.id.activity_main_webview)

mWebView?.settings?.javaScriptEnabled = true // 启用 JavaScript
mWebView?.settings?.domStorageEnabled = true  // 支持 DOM 存储


mWebView?.setWebViewClient(object : WebViewClient() {
    override fun shouldInterceptRequest(
        view: WebView,
        request: WebResourceRequest
    ): WebResourceResponse? {

        val url = request.url.toString()
        var prexifx = "http://10.50.20.43:5928/userapp/static/js/external/"

        Log.v("test", url)

        if (url.startsWith(prexifx)) {
            // 提取资源路径（例如：/app-resources/js/main.js）
            val name = url.replace(prexifx, "")
            try {
                // 从assets目录读取文件
                val inputStream = assets.open(name)
                val mimeType = "application/javascript" // 根据文件类型动态判断
                return WebResourceResponse(mimeType, "UTF-8", inputStream)
            } catch (e: IOException) {
                e.printStackTrace()
                Log.e("h5Error", e.toString())
            }
        }
        return super.shouldInterceptRequest(view, request)
    }
})
```

这里就是将external目录下的资源统统替换成app自己的, 在之前压缩70%的体积的基础上, 可以再次减少大约50%的体积

不过这个方案还是有些问题的, 因为ios不支持拦截https请求...

只能说还需要研究

### 其它方案

其实还是有一些更加细致的优化, 不过提升太小, 在31s的白屏时间下, 这些优化都不太顶事




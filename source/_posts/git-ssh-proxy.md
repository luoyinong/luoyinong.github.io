---
title: window git设置代理
date: 2024-06-02 12:58:15
categories:
- window-tools
tags:
- clash
- git
- proxy
---

# 背景

今天使用git从github拉取最新代码, 发现速度有点慢, 只有几kb, 由于之前没设置代理也很快, 所以一直没仔细研究
看来今天只能设置代理了

## 环境

* window 10
* clash for windows@0.20.39
* git@2.41.0.windows.3
* github.com
* ssh

> 如果你是mac或者linux, 那么最好还是直接看下面的参考文章, 请自强!

参考文章

1. [一文让你了解如何为 Git 设置代理](https://ericclose.github.io/git-proxy-config.html)
2. [chenshengzhi/git_ssh_proxy.md](https://gist.github.com/chenshengzhi/07e5177b1d97587d5ca0acc0487ad677?permalink_comment_id=3721523)

## 实操

github提供了两种连接的方式, https or ssh, 正常来说, 都是直接使用的ssh, 我也是这样的

@图1

打开clash for windows, 查看端口号

@图2

我的是7890,

> 下面的内容里请自行将 **{port}** 替换成 clash的端口号
> 自行将 **{user}** 替换成 自己的用户名

选一个你喜欢的终端 (cmd/powershell/git bash) 运行如下命令

```shell
git config --global http.https://github.com.proxy socks5://127.0.0.1:{port}
```

> 这是表明你将为git的ssh连接使用socks代理

设置完成后, C:\Users\\{user}\\.gitconfig 文件中会增加以下条目:

@图3

然后进入目录 C:\Users\\{user}\\.ssh 编辑.config文件

> 如果没有就自己新增一个

添加上如下内容

```shell
Host github.com
  User git
  Port 443
  Hostname ssh.github.com
  IdentityFile "C:\Users\{user}\.ssh\id_rsa"
  TCPKeepAlive yes
  ProxyCommand "C:\Program Files\Git\mingw64\bin\connect.exe" -S 127.0.0.1:{port} -a none %h %p

Host ssh.github.com
  User git
  Port 443
  Hostname ssh.github.com
  IdentityFile "C:\Users\{user}\.ssh\id_rsa"
  TCPKeepAlive yes
  ProxyCommand "C:\Program Files\Git\mingw64\bin\connect.exe" -S 127.0.0.1:{port} -a none %h %p
```

"C:\Program Files\Git\mingw64\bin\connect.exe" 这个是你git connect的安装地址, 不知道的可以
在git bash里面运行connect命令

@图4

把这个复制过来就行

然后在终端运行

```shell
ssh -T git@github.com
```

会提示你是否接受一个东西, 和当初设置ssh后连接github是一个东西
输入yes即可

然后就会出现成功的提示

@图5

之后你就可以开启clash for windows的代理, 进行git操作了

## 遇到的问题

这个过程中我遇到了很多问题, 回过头来看, 基本都是环境没对上或者版本没对上导致的
所以跟着我这篇文章进行操作的朋友, 请再次确认你的[环境](#环境)是否和我提供的一致

下面的问题作为**记录**用, 直接根据前面的文章进行配置, 不会出现下面的问题

### nc: not found

```shell
/usr/bin/bash: line 0: exec: nc: not found
kex_exchange_identification: Connection closed by remote host
Connection closed by UNKNOWN port 65535
```

第一句的问题是, 这是linux下的配置, 在windows里不管用

不要用

```shell
ProxyCommand nc -v -x 127.0.0.1:{port} %h %p
```

请使用

```shell
ProxyCommand "C:\Program Files\Git\mingw64\bin\connect.exe" -S 127.0.0.1:{port} -a none %h %p
```

### CreateProcessW failed

```shell
CreateProcessW failed error:2
posix_spawnp: No such file or directory
```

这是没有指定connect.exe的位置

不要用

```shell
ProxyCommand -S 127.0.0.1:{port} -a none %h %p
```

请使用

```shell
ProxyCommand "C:\Program Files\Git\mingw64\bin\connect.exe" -S 127.0.0.1:{port} -a none %h %p
```

是这位老哥提供的[解决方案](https://gist.github.com/chenshengzhi/07e5177b1d97587d5ca0acc0487ad677?permalink_comment_id=4833327#gistcomment-4833327)

### 想使用http代理, 怎么知道端口号

首先得搞清楚, git使用ssh或者https协议 和 clash使用socks或者http代理是没关系的

然后clash的http/socks端口号都是一个

@图6
@图7

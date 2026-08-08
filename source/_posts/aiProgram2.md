---
title: AI辅助开发 VS Code 插件
date: 2026-08-08 10:50:00
categories:
- AI
tags:
- AI
- VS Code
- Copilot
- Webview
---

## 背景

接上一篇：[AI辅助编程实践](/2025/12/27/ai-program/)。

之前在 copilot 的协助下小试牛刀，搞了两个 demo 级项目，然后又做了一个规模比较大的游戏项目（纯 ts，自走棋+杀戮尖塔），游戏没有做出来。

可以说是失败了，卡在了越来越复杂的 bug 修复上，帧动画+分离逻辑计算，全部由 AI 写还是太勉强，出了问题调试起来很麻烦，最后在一次虚拟机丢失文件之后，我放弃了这个项目的编写。

本以为有关 AI 的个人探索到此为止，但是之前 code review 插件居然用起来了，所以决定稍微记录一下编写 vscode 插件的过程。

## 工具

vscode + copilot + claude sonnet4.6（主要） + claude haiku4.5（改css） + gemini3.1 pro（查资料）

## 技术栈

typescript + Vue 3 + VS Code Extension API

## 遇到的问题

由于之前已经写过一部分了，所以重复的内容就不再赘述，我只写一些后续优化遇到的问题，以及一些思路

1. vscode自带的diff视图无法满足较好的交互体验，比如点击行号添加评论，在代码里显示评论以及图片
2. MR某些文件路径过长，查看起来很麻烦
3. npm上的 diff库在显示上面还是有问题，比如增删的代码两边对不齐，影响阅读

## 解决思路

其实上面的问题大多数都是功能设计上的问题，而不是代码的问题，从某种角度来说，我现在的定位是产品+SE

### vscode webview

既然vscode自带的视图无法完成我的要求，那么vscode又是怎样做出来插件市场的呢，肯定有一个办法能显示html，没错，就是webview

通过vscode api创建webview面板，

开发环境，由vite启动本地服务，webview挂载连接，

生产模式，webview直接加载打包好的静态资源

```JavaScript
this.panel = vscode.window.createWebviewPanel(
    'mrDetail',
    `MR !${mrData.iid}: ${mrData.title}`,
    vscode.ViewColumn.Beside,
    { 
        enableScripts: true,  // 允许执行 JS
        localResourceRoots: [vscode.Uri.file('.../webview-ui/dist')]
    }
);
```

然后通过postmessage进行双向通信

最后效果

@图1

@图2

@图3

无论是加载评论（包括图片），还是代码对比差异，效果都很不错

### 路径优化

这个的灵感来自于vscode自带source control显示

@图4

@图5

所以插件这边也改成了支持树形显示，和vscode的文件目录保持一致

@图6

当初在做这个功能时，遇到了一些问题，比如点击MR后，文件树不会自动展开

修复后，只展开第一层级

修复后，展开时直接卡死

等等

即使我用的是claude sonnet4.6，还是会遇到这么多的问题，这不仅仅是微软给模型加了限制的，而是模型本身就具有自我约束的倾向

也就是从用户的请求里找到一条概率最大的解决办法，其它可能性，或者中途遇到的问题，模型会通通放到一边，这就会导致修复引入缺陷的

概率变得很大，即使你是一名非常资深的开发，面对动辄几千行的修改，也是很难搞的

> 也可以选择一次修改一点，那就要看你的钱包遭得住吗
> 并且由于上下文继承会有一定丢失，不是说越多对话就越好的

### diff视图缺陷

#### 换行

由于vscode宽度有限，所以一行的代码数过多的话，会出现横向滚动条，webview这边保持两个区域滚动位置相同比较麻烦，所以我决定让他们换行

@图7

但是换行后，左右两边就没对齐了，因为另外一边可能不会换行（增删的情况），所以需要手动对齐

```typescript
// 同步左右两侧对应行的高度。
// diff2html side-by-side 模式用两个独立的 <table>，当某行内容折行导致行高不同时，
// 后续所有行都会错位。此函数找出每对对应的 <tr>，将二者高度统一为较高的那个。
const syncRowHeights = () => {
  if (!diffContainer.value) return;

  const fileWrappers = diffContainer.value.querySelectorAll('.d2h-file-wrapper');
  fileWrappers.forEach(wrapper => {
    const filesDiff = wrapper.querySelector('.d2h-files-diff');
    if (!filesDiff || filesDiff.children.length < 2) return;

    const leftRows = Array.from(filesDiff.children[0].querySelectorAll('tbody tr')) as HTMLElement[];
    const rightRows = Array.from(filesDiff.children[1].querySelectorAll('tbody tr')) as HTMLElement[];
    const count = Math.min(leftRows.length, rightRows.length);

    // 先全部重置，让浏览器计算自然高度
    for (let i = 0; i < count; i++) {
      leftRows[i].style.height = '';
      rightRows[i].style.height = '';
    }

    // 触发一次 reflow
    void (filesDiff as HTMLElement).getBoundingClientRect();

    // 逐行取最大高度并统一
    for (let i = 0; i < count; i++) {
      const leftH = leftRows[i].getBoundingClientRect().height;
      const rightH = rightRows[i].getBoundingClientRect().height;
      if (leftH !== rightH) {
        const max = Math.max(leftH, rightH);
        leftRows[i].style.height = `${max}px`;
        rightRows[i].style.height = `${max}px`;
      }
    }
  });
};
```

#### 高亮缓慢

一开始用的diff2html自带的高亮，但是如果文件过大，打开文件后，代码一开始是没有高亮的，但是它又不支持手动调用api处理

所以换成了hljs，分批高亮

```JavaScript
// 分片处理任务，每帧处理一小部分，避免阻塞主线程
const CHUNK_SIZE = 40; 
let currentTask = 0;

const processChunks = () => {
  if (!diffContainer.value) return; // 组件已卸载

  const end = Math.min(currentTask + CHUNK_SIZE, tasks.length);
  for (let i = currentTask; i < end; i++) {
    const { block, lang } = tasks[i];
    try {
      const text = block.innerText;
      const highlighted = hljs.highlight(text, { language: lang, ignoreIllegals: true });
      block.innerHTML = highlighted.value;
      block.classList.add('hljs');
    } catch (e) {
      // 忽略高亮失败的情况
    }
  }
  
  currentTask = end;
  if (currentTask < tasks.length) {
    highlightingAnimationFrame = requestAnimationFrame(processChunks);
  } else {
    highlightingAnimationFrame = null;
    syncRowHeights();
  }
};

// 延迟一帧开始，给浏览器时间进行初始渲染和滚动
highlightingAnimationFrame = requestAnimationFrame(processChunks);
```

### 评论错位

由于评论是后续加上去的，所以diff2html不会主动去处理，导致评论后续代码错位，

所以在插入评论后，需要在另外一侧插入占位符

```typescript

// 辅助函数：由于 diff2html 在 side-by-side 模式下使用两个平行的表格，
// 插入评论行时，必须在对侧也插入一个等高的占位行，否则后续代码行会错位。
const createExpansionRows = (row: HTMLTableRowElement, extraClass: string = '') => {
  const sideDiff = row.closest('.d2h-file-side-diff');
  const filesDiff = row.closest('.d2h-files-diff');
  
  const expansionRow = document.createElement('tr');
  expansionRow.className = `comment-expansion-row ${extraClass}`.trim();
  const cell = document.createElement('td');
  cell.setAttribute('colspan', String(row.cells.length));
  expansionRow.appendChild(cell);
  row.after(expansionRow);

  // 如果是在并排模式下（检测到两侧容器），需要在对侧同步
  if (sideDiff && filesDiff) {
    const isRightSide = filesDiff.lastElementChild === sideDiff;
    const otherSide = isRightSide ? filesDiff.firstElementChild : filesDiff.lastElementChild;
    const allRowsInSide = Array.from(sideDiff.querySelectorAll('tr'));
    const rowIndex = allRowsInSide.indexOf(row);
    const otherRows = otherSide?.querySelectorAll('tr');
    const otherRow = otherRows ? otherRows[rowIndex] : null;

    if (otherRow) {
      const placeholderRow = document.createElement('tr');
      placeholderRow.className = `comment-expansion-row placeholder-row ${extraClass}`.trim();
      const pCell = document.createElement('td');
      pCell.setAttribute('colspan', String((otherRow as any).cells.length));
      placeholderRow.appendChild(pCell);
      otherRow.after(placeholderRow);

      // 高度同步：确保对侧占位符和评论行高度实时一致
      const ro = new ResizeObserver(() => {
        if (expansionRow && placeholderRow) {
          placeholderRow.style.height = `${expansionRow.offsetHeight}px`;
        }
      });
      ro.observe(expansionRow);
    }
  }
  return cell;
};
```

## 后续

当前只是解决了能用的问题，对于一些极端场景，还是没有优化，比如：文件数过多、代码行数过大等性能问题
又比如还遗留了一些工程上的问题，比如说：对功能的稳定性没有保障，缺乏详细的文档

这些也都可以让AI协助完成

## 思考

### 团队

个人感觉AI的出现，还是对个人开发者更加有利，比如当前的各种音乐播放器都很难用，并且还要续费，有了AI的帮忙，自己写一个也不是不行

又比如说各种app需要很多权限，一些不重要的app完全可以自己写一个，比如记账的，又比如听书的

大公司不缺人，做项目的瓶颈在于初期目标是否正确，后续需求设计是否完善，团队管理成本是否变得无比庞大，

AI不仅不会解决这个问题，还有可能加剧这个问题

毕竟这东西是个黑盒，也很难去把控每一个细节，就像是开一辆赛车，你以为一脚油门就到终点了，下一秒却发现前面是弯道（～￣▽￣）～

### 感慨

有些惭愧，自己从一开始一行行审核AI代码，再到自己只当测试，再到让AI写设计，AI实现，AI测，感觉自己有些多余了
不过用了大半年之后，发现AI这东西还是不太行，或许是训练数据的问题，或许是参数不够，或许是上下文不够，AI还是缺少智能
前段时间AI飞速进化，个人认为只不过是通过工程化的手段，让AI初步接触世界，拥有一定的行为模式，但还是不够
具体表现在，无法判断并行任务的重要性，容易在细枝末节雕花，容易在意想不到的地方埋坑（暴雷），自我迭代能力有限（甚至是负的），通常压缩两三次上下文就变成笨比了等等

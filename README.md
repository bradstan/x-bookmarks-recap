# X Bookmarks Recap · X收藏夹年度报告

把你一年的 X（Twitter）收藏夹，变成一份可以晒的年度报告：

- **总量**：收藏了多少条、多少字，相当于读了几本书
- **节奏**：哪个月、哪一天收藏得最疯
- **内容领域排行**：AI、开发、内容流量、投资……每个月的冠军领域
- **AI 与工具**：最常出现的 AI 产品，以及你的「AI 移情别恋史」
- **年度作者**：收藏最多的作者，你关注了其中多少人
- **作者画像**：大号还是小号，你的信息来自哪些城市
- **口味**：最火的一条、最冷门的宝藏、你收藏的内容有多「干货」
- **里程碑**：年度第一条和最近一条收藏
- **年度关键词**和**收藏人格**、徽章
- 一张 1080×1440 的分享卡片，只放让你有面子的内容

**🔒 数据不出浏览器。** 纯静态页面，没有后端、没有统计脚本，所有分析都在你自己的浏览器里完成。

## 使用

**👉 在线版：https://bradstan.github.io/x-bookmarks-recap/**

**1. 导出收藏夹**

在已经用 Chrome 登录 X 的电脑上，打开终端运行（需要 Node.js 22 以上）：

```bash
npx github:bradstan/x-bookmarks-recap
```

当前目录会生成一个 `wrapped.json`，里面有你的全部收藏，以及你的名字、@id 和头像（用来画在分享卡片上）。

- 加 `--articles`：顺便抓取收藏里 X 长文的全文，字数和领域统计更准，每篇约 2 秒。
- 用 Firefox：加 `--firefox-profile default-release`。
- 导出用的是 [bird](https://github.com/steipete/bird)，它读取浏览器里 X 的登录状态，数据只写到你自己的电脑上。

**2. 打开网页，把 `wrapped.json` 拖进去**

报告生成后，可以在最后一屏改名字、@id、换头像，再下载卡片或分享到 X。

也可以本地运行网页：

```bash
git clone https://github.com/bradstan/x-bookmarks-recap && cd x-bookmarks-recap && python3 -m http.server 8000
```

然后打开 http://localhost:8000。

## 自己部署一份

Fork 这个仓库，在仓库的 Settings → Pages 里选择从 `main` 分支部署，再把 [`src/card.js`](src/card.js) 里的 `SITE` 改成你的地址，卡片底部就会显示你的链接。

## 它是怎么算的

- **收藏时间**：X 的接口不返回「你什么时候收藏的」，但收藏列表是按收藏时间倒序排的。所以一条收藏的时间，一定不早于排在它后面所有推文的发布时间。我们用这个下限来推算收藏的年份和月份。
- **话题**：关键词词典匹配，见 [`src/topics.js`](src/topics.js)。一条收藏可以属于多个话题。
- **收藏人格**：由占比最高的话题决定（占比低于 15% 时为「杂食信息猎人」）。
- **字数和阅读时长**：推文正文加长文全文，按 400 字/分钟；没补全的长文按每篇 3000 字估算。
- **品牌**：只用文字和颜色展示，不使用任何官方 logo，本项目与这些品牌无关联。

## 贡献

最欢迎的 PR：

- 在 [`src/topics.js`](src/topics.js) 里补充关键词、增加新话题和新人格
- 新的徽章规则（在 [`src/engine.js`](src/engine.js) 的 `badges` 部分）
- 英文界面

示例数据由 `node scripts/make-sample.js > sample/bookmarks.sample.json` 生成，内容和作者全部虚构。

## License

MIT

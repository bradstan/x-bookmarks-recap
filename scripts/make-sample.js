// 生成虚构的示例数据（作者、内容、数字全部是编的），格式模仿 bird --json-full + enrich。
// 用法：node scripts/make-sample.js > sample/bookmarks.sample.json
let seed = 42;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (a) => a[Math.floor(rand() * a.length)];
const xdate = (d) => d.toUTCString().replace(/^(\w+), (\d+) (\w+) (\d+) (.*) GMT$/, '$1 $3 $2 $5 +0000 $4');

const cities = ['San Francisco, CA', 'Beijing', 'Hong Kong', 'Shanghai', 'London', 'Singapore', 'Tokyo', '', '', 'Mars'];
const authors = Array.from({ length: 60 }, (_, i) => ({
  username: `demo_user_${i + 1}`, name: `示例作者 ${i + 1}`,
  followers: Math.floor(Math.exp(5 + rand() * 8)), following: rand() < 0.3,
  location: pick(cities), created: new Date(Date.UTC(2008 + Math.floor(rand() * 18), 0, 1)),
}));
const fav = authors.slice(0, 5);
const texts = [
  '用 Claude Code 写了一个 Agent，自动整理每天的待办，效率翻倍',
  '这个 GitHub 开源项目太强了，一行命令部署自己的知识库',
  '独立开发者 6 个月做到 MRR 2 万美金，复盘一下他的出海路径',
  '小红书起号的 5 个选题技巧，第 3 个最容易被忽略',
  '用 Seedance 生成了一段短片，分镜和提示词都放在评论区',
  '美股财报季来了，这几家公司的期权隐含波动率值得关注',
  '分享一套好看的 UI 配色和字体搭配，做产品设计直接用',
  '保姆级教程：从零开始学习用 Obsidian 搭个人知识库',
  '我的自动化工作流：n8n + 飞书，每天省下 2 小时',
  '关于焦虑和睡眠，这篇讲得最清楚的一篇',
  'Codex 新版本体验：这次真的能替我写完整个功能了',
  'The best MCP servers for Claude, a thread',
  'How we grew our SaaS to $1M ARR without ads',
  'A complete guide to prompt engineering for agents',
];
const articles = [
  '一人公司实战手册：用 AI Agent 和 Skill 搭一条全自动内容流水线。',
  'The ultimate guide to vibe coding: from idea to deployed app in a weekend.',
  '出海 SaaS 复盘：从 0 到 ARR 50 万美金，我做对的三件事。',
];

const out = [];
let t = Date.UTC(2026, 10, 15);
for (let i = 0; i < 320; i++) {
  t -= Math.floor(rand() * 26 * 3600e3) + 3600e3; // 收藏时间倒序
  const lag = rand() < 0.05 ? rand() * 900 * 864e5 : rand() * 3 * 864e5;
  const created = new Date(t - lag);
  const a = rand() < 0.15 ? pick(fav) : pick(authors);
  const id = String(1900000000000000000n + BigInt(i));
  const isArticle = rand() < 0.12;
  const text = isArticle ? 'https://t.co/demo' + i : pick(texts) + (rand() < 0.1 ? ' https://t.co/gh' + i : '');
  const urls = isArticle ? [{ expanded_url: `https://x.com/i/article/${id}` }]
    : (text.includes('/gh') ? [{ expanded_url: `https://github.com/demo/repo-${i}` }] : []);
  const likes = Math.floor(Math.exp(1 + rand() * 10));
  const tw = {
    id, text, createdAt: xdate(created),
    replyCount: Math.floor(likes * rand() * 0.1), retweetCount: Math.floor(likes * rand() * 0.2), likeCount: likes,
    author: { username: a.username, name: a.name },
    media: rand() < 0.35 ? [{ type: rand() < 0.2 ? 'video' : 'photo' }] : [],
    _raw: {
      __typename: 'Tweet',
      core: { user_results: { result: { legacy: {
        screen_name: a.username, name: a.name, followers_count: a.followers, following: a.following,
        location: a.location, created_at: xdate(a.created),
      } } } },
      legacy: {
        full_text: text, created_at: xdate(created), favorite_count: likes, bookmark_count: Math.floor(likes * (0.3 + rand() * 2)),
        favorited: rand() < 0.05, lang: /[一-鿿]/.test(text) ? 'zh' : (isArticle ? 'zxx' : 'en'), entities: { urls },
      },
      views: { count: String(likes * (60 + Math.floor(rand() * 200))) },
    },
  };
  if (isArticle) tw.articleText = pick(articles).repeat(40);
  out.push(tw);
}
process.stdout.write(JSON.stringify({ me: { name: '示例用户', username: 'demo_user' }, tweets: out }));

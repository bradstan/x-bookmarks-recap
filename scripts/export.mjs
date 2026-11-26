#!/usr/bin/env node
// 一键导出：你的 X 资料（名字、@id、头像）+ 全部收藏 + 长文标题/封面/全文 + 配图缩略图 + 作者头像。
// 生成的 wrapped.json 直接拖进网页即可。全程只在你的电脑上运行，读取的是浏览器里 X 的登录状态。
import { execFile, execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { promisify } from 'node:util';
const execFileP = promisify(execFile);

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`X Bookmarks Recap · 导出工具

用法：npx github:bradstan/x-bookmarks-recap [选项]

  --no-articles       不抓 X 长文的标题、封面和全文（更快，但报告会少很多内容）
  --no-images         不下载配图和头像（卡片上就没有图片）
  --out=文件名        输出文件，默认 wrapped.json
  --firefox-profile default-release   用 Firefox 的登录状态（默认读 Chrome）

导出后打开 https://bradstan.github.io/x-bookmarks-recap/ ，把文件拖进去。`);
  process.exit(0);
}
const withArticles = !args.includes('--no-articles') && !args.includes('--fast');
const withImages = !args.includes('--no-images');
const out = (args.find((a) => a.startsWith('--out=')) || '--out=wrapped.json').slice(6);
const birdArgs = args.filter((a) => !['--no-articles', '--no-images', '--fast', '--articles'].includes(a) && !a.startsWith('--out='));

// 让 Node 的 fetch 走 HTTPS_PROXY（开着代理的环境下 bird 才能连上 X）
const env = { ...process.env, NODE_USE_ENV_PROXY: '1' };
const hasBird = (() => { try { execFileSync('bird', ['--version'], { stdio: 'ignore', env }); return true; } catch (e) { return false; } })();
const birdCmd = (a) => (hasBird ? ['bird', [...a, ...birdArgs]] : ['npx', ['-y', '@steipete/bird', ...a, ...birdArgs]]);
const bird = (...a) => { const [c, x] = birdCmd(a); return execFileSync(c, x, { encoding: 'utf8', env, maxBuffer: 1 << 30, stdio: ['ignore', 'pipe', 'pipe'] }); };
const step = (s) => process.stderr.write(s + '\n');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const raw = (t) => { let r = t._raw || {}; if (r.tweet) r = r.tweet; return r; };

// 下载图片转 data URI（用 curl：自动走系统代理，且不依赖 Node 版本）
async function fetchImage(url) {
  try {
    const { stdout } = await execFileP('curl', ['-sL', '--max-time', '20', '-f', url], { encoding: 'buffer', maxBuffer: 1 << 24 });
    if (stdout.length < 200) return '';
    const type = stdout[0] === 0x89 ? 'image/png' : 'image/jpeg';
    return `data:${type};base64,` + stdout.toString('base64');
  } catch (e) { return ''; }
}
async function pool(items, n, fn, label) {
  let i = 0, done = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const it = items[i++]; await fn(it); process.stderr.write(`\r   ${label} ${++done}/${items.length}`); }
  }));
  if (items.length) step('');
}
// pbs.twimg.com 图片换成指定尺寸
const sized = (url, name) => {
  const m = (url || '').match(/^(https:\/\/pbs\.twimg\.com\/(?:media|ext_tw_video_thumb|amplify_video_thumb|tweet_video_thumb)\/[^?]+?)\.(jpg|png|jpeg|webp)/);
  return m ? `${m[1]}?format=jpg&name=${name}` : url;
};

// 1. 我是谁
step('① 读取你的 X 账号…');
let me = { username: '', name: '', avatar: '' };
try {
  const m = bird('whoami').match(/@(\w+)\s*\(([^)]*)\)/);
  if (m) me = { ...me, username: m[1], name: m[2] };
} catch (e) { step('   读取失败，可以稍后在网页里手动填写名字和头像。'); }
if (me.username) {
  try {
    const t = JSON.parse(bird('user-tweets', me.username, '-n', '1', '--json-full'));
    const list = Array.isArray(t) ? t : t.tweets || [];
    const u = (list[0] && raw(list[0]).core && raw(list[0]).core.user_results.result) || {};
    const url = (u.avatar && u.avatar.image_url) || (u.legacy && u.legacy.profile_image_url_https) || '';
    if (u.core && u.core.name) me.name = u.core.name;
    if (url && withImages) me.avatar = await fetchImage(url.replace('_normal.', '_400x400.'));
  } catch (e) { step('   头像获取失败，可以在网页里上传。'); }
  step(`   你好，${me.name} @${me.username}`);
}

// 2. 收藏
step('② 导出全部收藏（几百条大约需要半分钟）…');
let data;
try { data = JSON.parse(bird('bookmarks', '--all', '--json-full')); }
catch (e) {
  step('❌ 没能读取收藏夹。请确认：1) 电脑上的 Chrome 已登录 X；2) 网络能打开 x.com。');
  step('   详细错误：' + String((e.stderr || e.message || e)).trim().split('\n').slice(-2).join(' '));
  process.exit(1);
}
const tweets = Array.isArray(data) ? data : data.tweets || [];
step(`   共 ${tweets.length} 条`);

// 只给「最近一年」的收藏补长文和图片（收藏按时间倒序，用后缀最大发布时间推算收藏年份）
const savedYear = new Map();
let max = -Infinity;
for (let i = tweets.length - 1; i >= 0; i--) { max = Math.max(max, new Date(tweets[i].createdAt).getTime()); savedYear.set(tweets[i], new Date(max).getFullYear()); }
const year = Math.max(...savedYear.values());
const thisYear = tweets.filter((t) => savedYear.get(t) === year);

// 3. 长文：标题、摘要、封面、全文
const isArticle = (t) => (((raw(t).legacy || {}).entities || {}).urls || []).some((u) => (u.expanded_url || '').includes('/i/article/'));
if (withArticles) {
  const todo = thisYear.filter(isArticle);
  step(`③ 读取 ${year} 年收藏的 ${todo.length} 篇 X 长文（每篇约 2 秒，可以去倒杯水）…`);
  let i = 0;
  for (const t of todo) {
    try {
      const d = JSON.parse(bird('read', t.id, '--json-full'));
      const a = ((raw(d).article || {}).article_results || {}).result || {};
      t.articleTitle = a.title || (d.article && d.article.title) || '';
      t.articlePreview = a.preview_text || (d.article && d.article.previewText) || '';
      t.articleText = a.plain_text || d.text || '';
      t.articleCover = ((a.cover_media || {}).media_info || {}).original_img_url || '';
    } catch (e) { /* 跳过 */ }
    process.stderr.write(`\r   ${++i}/${todo.length}`);
    await sleep(1200);
  }
  step('');
} else step('（已跳过长文。去掉 --no-articles 可以拿到长文标题、封面和全文）');

// 4. 图片：配图/封面缩略图 + 收藏最多的作者头像
data = Array.isArray(data) ? { tweets } : data;
data.avatars = {};
if (withImages) {
  const imgJobs = thisYear.map((t) => {
    const media = ((raw(t).legacy || {}).extended_entities || {}).media || [];
    const url = t.articleCover || (media[0] && media[0].media_url_https) || '';
    return url ? { t, url: sized(url, '360x360') } : null;
  }).filter(Boolean);
  step(`④ 下载 ${imgJobs.length} 张配图缩略图…`);
  await pool(imgJobs, 8, async (j) => { j.t.thumb = await fetchImage(j.url); }, '配图');

  const counts = new Map();
  for (const t of thisYear) { const u = t.author && t.author.username; if (u) counts.set(u, (counts.get(u) || 0) + 1); }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([u]) => u);
  const avatarUrl = {};
  for (const t of thisYear) {
    const u = (((raw(t).core || {}).user_results) || {}).result || {};
    const name = t.author && t.author.username;
    if (top.includes(name) && !avatarUrl[name]) avatarUrl[name] = (u.avatar && u.avatar.image_url) || (u.legacy && u.legacy.profile_image_url_https) || '';
  }
  await pool(top.filter((u) => avatarUrl[u]), 6, async (u) => { data.avatars[u] = await fetchImage(avatarUrl[u].replace('_normal.', '_200x200.')); }, '作者头像');
}

writeFileSync(out, JSON.stringify({ me, exportedAt: new Date().toISOString(), avatars: data.avatars, tweets }));
step(`✅ 已保存到 ${out}，把它拖进网页即可：https://bradstan.github.io/x-bookmarks-recap/`);

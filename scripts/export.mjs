#!/usr/bin/env node
// 一键导出：你的 X 资料（名字、@id、头像）+ 全部收藏，可选补全长文全文。
// 生成的 wrapped.json 直接拖进网页即可。全程只在你的电脑上运行，读取的是浏览器里 X 的登录状态。
//
// 用法：
//   npx github:bradstan/xbookmark-yearlyreport            # 导出收藏 + 个人资料
//   npx github:bradstan/xbookmark-yearlyreport --articles # 另外补全 X 长文全文（每篇约 2 秒）
// 其它参数会原样传给 bird，例如 --firefox-profile default-release
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const withArticles = args.includes('--articles');
const out = (args.find((a) => a.startsWith('--out=')) || '--out=wrapped.json').slice(6);
const birdArgs = args.filter((a) => a !== '--articles' && !a.startsWith('--out='));

// 让 Node 的 fetch 走 HTTPS_PROXY（开着代理的环境下 bird 才能连上 X）
const env = { ...process.env, NODE_USE_ENV_PROXY: '1' };
const hasBird = (() => { try { execFileSync('bird', ['--version'], { stdio: 'ignore', env }); return true; } catch (e) { return false; } })();
const bird = (...a) => {
  const [cmd, pre] = hasBird ? ['bird', []] : ['npx', ['-y', '@steipete/bird']];
  return execFileSync(cmd, [...pre, ...a, ...birdArgs], { encoding: 'utf8', env, maxBuffer: 1 << 30, stdio: ['ignore', 'pipe', 'pipe'] });
};
const step = (s) => process.stderr.write(s + '\n');

// 1. 我是谁
step('① 读取你的 X 账号…');
let me = { username: '', name: '', avatar: '' };
try {
  const who = bird('whoami');
  const m = who.match(/@(\w+)\s*\(([^)]*)\)/);
  if (m) me = { ...me, username: m[1], name: m[2] };
} catch (e) { step('   读取失败，可以稍后在网页里手动填写名字和头像。'); }

// 2. 头像（转成 data URI，网页画卡片时不会遇到跨域问题）
if (me.username) {
  try {
    const t = JSON.parse(bird('user-tweets', me.username, '-n', '1', '--json-full'));
    const list = Array.isArray(t) ? t : t.tweets || [];
    let r = list[0] && list[0]._raw; if (r && r.tweet) r = r.tweet;
    const u = r && r.core && r.core.user_results && r.core.user_results.result || {};
    const url = (u.avatar && u.avatar.image_url) || (u.legacy && u.legacy.profile_image_url_https) || '';
    if (u.core && u.core.name) me.name = u.core.name;
    if (url) {
      const img = execFileSync('curl', ['-sL', '--max-time', '20', url.replace('_normal.', '_400x400.')], { maxBuffer: 1 << 24 });
      if (img.length > 100) me.avatar = 'data:image/jpeg;base64,' + img.toString('base64');
    }
  } catch (e) { step('   头像获取失败，可以在网页里上传。'); }
  step(`   你好，${me.name} @${me.username}`);
}

// 3. 收藏
step('② 导出全部收藏（几百条大约需要半分钟）…');
const data = JSON.parse(bird('bookmarks', '--all', '--json-full'));
const tweets = Array.isArray(data) ? data : data.tweets || [];
step(`   共 ${tweets.length} 条`);

// 4. 可选：长文全文
if (withArticles) {
  const isArticle = (t) => {
    let r = t._raw; if (r && r.tweet) r = r.tweet;
    const urls = ((r && r.legacy && r.legacy.entities && r.legacy.entities.urls) || []).map((u) => u.expanded_url || '');
    return urls.some((u) => u.includes('/i/article/'));
  };
  const todo = tweets.filter(isArticle);
  step(`③ 补全 ${todo.length} 篇 X 长文…`);
  let i = 0;
  for (const t of todo) {
    try { t.articleText = JSON.parse(bird('read', t.id, '--json')).text || ''; } catch (e) { /* 跳过 */ }
    process.stderr.write(`\r   ${++i}/${todo.length}`);
    await new Promise((r) => setTimeout(r, 1500));
  }
  step('');
} else {
  step('（提示：加 --articles 可以补全 X 长文全文，字数和领域统计会更准）');
}

writeFileSync(out, JSON.stringify({ me, exportedAt: new Date().toISOString(), tweets }));
step(`✅ 已保存到 ${out}，把它拖进网页即可：https://bradstan.github.io/xbookmark-yearlyreport/`);

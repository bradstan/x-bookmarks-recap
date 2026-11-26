#!/usr/bin/env node
// 可选：给收藏夹里的 X 长文（Article）补上全文，让字数统计和领域分类更准。
// 收藏接口只返回长文链接，没有正文；这里用 bird 逐篇读取，每篇间隔 1.5 秒。中断后重跑会接着抓。
//
// 用法：node scripts/enrich.mjs bookmarks.json bookmarks.enriched.json
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const [src, out = 'bookmarks.enriched.json'] = process.argv.slice(2);
if (!src) { console.error('用法：node scripts/enrich.mjs bookmarks.json [输出文件]'); process.exit(1); }

const data = JSON.parse(readFileSync(src, 'utf8'));
const list = Array.isArray(data) ? data : data.tweets;
const prev = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : null;
const cache = new Map(((prev && (Array.isArray(prev) ? prev : prev.tweets)) || []).filter((t) => t.articleText).map((t) => [t.id, t.articleText]));

const isArticle = (t) => {
  const r = t._raw && (t._raw.tweet || t._raw);
  const urls = ((r && r.legacy && r.legacy.entities && r.legacy.entities.urls) || []).map((u) => u.expanded_url || '');
  return urls.some((u) => u.includes('/i/article/')) || /x\.com\/i\/article\//.test(t.text || '');
};
const todo = list.filter(isArticle);
const bird = process.env.BIRD || 'bird';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const save = () => writeFileSync(out, JSON.stringify(Array.isArray(data) ? list : { ...data, tweets: list }));

let done = 0, failed = 0;
for (const t of todo) {
  if (cache.has(t.id)) { t.articleText = cache.get(t.id); done++; continue; }
  try {
    const res = JSON.parse(execFileSync(bird, ['read', t.id, '--json'], { encoding: 'utf8', timeout: 60000, stdio: ['ignore', 'pipe', 'ignore'] }));
    t.articleText = res.text || '';
    done++;
  } catch (e) { failed++; }
  process.stdout.write(`\r长文 ${done + failed}/${todo.length}（失败 ${failed}）`);
  if ((done + failed) % 20 === 0) save();
  await sleep(1500);
}
save();
console.log(`\n完成：${done} 篇补全，${failed} 篇失败 → ${out}`);

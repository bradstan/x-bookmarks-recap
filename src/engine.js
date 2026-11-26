// 分析引擎：纯函数，浏览器和 Node 通用。所有计算都在本地完成，不发任何网络请求。
(function (root) {
  const D = (typeof module !== 'undefined' && module.exports) ? require('./topics.js') : root.BW_TOPICS;

  const num = (v) => { const n = typeof v === 'string' ? Number(v) : v; return typeof n === 'number' && isFinite(n) ? n : 0; };
  const stripUrls = (s) => s.replace(/https?:\/\/\S+/g, ' ');

  // ---------- 输入归一化 ----------
  // 支持：bird --json（基础字段）、bird --json-full（带 _raw，字段最全）、
  // 以及 scripts/enrich.mjs 补过长文全文的版本（articleText）。
  function normalize(raw) {
    let list = raw;
    if (!Array.isArray(list)) list = raw && (raw.tweets || raw.bookmarks || raw.data || raw.items) || [];
    const out = [];
    for (const t of list) {
      if (!t) continue;
      let r = t._raw || null;
      if (r && r.__typename === 'TweetWithVisibilityResults') r = r.tweet;
      const lg = (r && r.legacy) || t.legacy || {};
      const ur = r && r.core && r.core.user_results && r.core.user_results.result || {};
      const ul = ur.legacy || {};
      const uc = ur.core || {};
      const note = r && r.note_tweet && r.note_tweet.note_tweet_results && r.note_tweet.note_tweet_results.result || {};
      const id = String(t.id || t.id_str || t.rest_id || lg.id_str || '');
      const created = t.createdAt || t.created_at || lg.created_at;
      const date = created ? new Date(created) : null;
      if (!id || !date || isNaN(date)) continue;
      const text = note.text || lg.full_text || t.text || t.full_text || '';
      const ents = lg.entities || {};
      const urls = [...(ents.urls || []), ...((note.entity_set || {}).urls || [])].map((u) => u.expanded_url || '').filter(Boolean);
      const domains = [...new Set(urls.map((u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } }).filter(Boolean))];
      const media = ((lg.extended_entities || {}).media) || [];
      const author = t.author || t.user || {};
      const q = r && r.quoted_status_result && r.quoted_status_result.result || null;
      const qq = q && q.__typename === 'TweetWithVisibilityResults' ? q.tweet : q;
      const qu = qq && qq.core && qq.core.user_results && qq.core.user_results.result || {};
      const isArticle = urls.some((u) => u.includes('/i/article/')) || !!(r && r.article);
      out.push({
        id, date, text,
        articleText: t.articleText || '',
        isArticle,
        isLongPost: !!note.text,
        isQuote: !!(lg.is_quote_status || t.quotedTweet),
        quotedAuthor: (qu.core && qu.core.screen_name) || (qu.legacy && qu.legacy.screen_name) || (t.quotedTweet && t.quotedTweet.author && t.quotedTweet.author.username) || '',
        likes: num(t.likeCount ?? lg.favorite_count),
        retweets: num(t.retweetCount ?? lg.retweet_count),
        replies: num(t.replyCount ?? lg.reply_count),
        bookmarksGlobal: r ? num(lg.bookmark_count) : null,
        views: r && r.views && r.views.count ? num(r.views.count) : null,
        lang: lg.lang || '',
        photos: media.length ? media.filter((m) => m.type === 'photo').length : (Array.isArray(t.media) ? t.media.filter((m) => !m.type || m.type === 'photo').length : 0),
        videos: media.filter((m) => m.type === 'video' || m.type === 'animated_gif').length + (!media.length && Array.isArray(t.media) ? t.media.filter((m) => m.type === 'video').length : 0),
        videoMs: media.reduce((s, m) => s + num(m.video_info && m.video_info.duration_millis), 0),
        domains,
        username: author.username || author.screen_name || uc.screen_name || ul.screen_name || 'unknown',
        name: author.name || uc.name || ul.name || author.username || 'unknown',
        hasRaw: !!r,
        iLiked: !!lg.favorited,
        iFollow: r ? !!(ul.following || (ur.relationship_perspectives || {}).following) : null,
        followers: r ? num(ul.followers_count) : null,
        authorCreated: (ul.created_at || uc.created_at) ? new Date(ul.created_at || uc.created_at) : null,
        location: ul.location || (ur.location && ur.location.location) || '',
      });
    }
    return out; // 保持原顺序：书签接口按「收藏时间」倒序返回
  }

  // ---------- 推算收藏时间 ----------
  // X 不返回收藏时间，但书签列表按收藏时间倒序排列，所以第 i 条的收藏时间
  // ≥ 它之后所有推文的发布时间。取后缀最大值作为「收藏时间下限」。
  function inferSavedAt(items) {
    let max = -Infinity;
    for (let i = items.length - 1; i >= 0; i--) {
      max = Math.max(max, items[i].date.getTime());
      items[i].savedAt = new Date(max);
    }
    return items;
  }

  // ---------- 词典匹配 ----------
  const esc = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // 英文词按单词边界匹配（允许复数 s），中文按子串匹配
  const toRe = (w) => /^[\x00-\x7f]+$/.test(w)
    ? new RegExp('(^|[^a-z0-9])' + esc(w) + '(e?s)?($|[^a-z0-9])', 'i')
    : new RegExp(esc(w), 'i');
  const compile = (list) => list.map((x) => ({ ...x, res: x.words.map(toRe) }));
  const topicMatchers = compile(D.TOPICS);
  const brandMatchers = compile(D.BRANDS);
  // 关键词可以是字符串，或 [显示名, ...同义词]
  const keywordMatchers = D.KEYWORDS.map((k) => { const ws = [].concat(k); return { word: ws[0], res: ws.map(toRe) }; });

  function score(matchers, text) {
    const clean = stripUrls(text);
    const hits = [];
    for (const m of matchers) {
      let s = 0;
      for (const re of m.res) if (re.test(clean)) s++;
      if (s) hits.push({ id: m.id, score: s });
    }
    return hits.sort((a, b) => b.score - a.score);
  }
  const topicsOf = (text) => score(topicMatchers, text);

  // 地点清洗：只留城市/地区，去掉广告、玩梗地点
  function cleanLocation(loc) {
    const s = (loc || '').trim();
    if (!s || s.length > 40) return '';
    if (/微信|vx|v:|wx|合作|wechat|telegram|tg:|@|http|mars|earth|moon|地球|火星|宇宙|universe|internet|everywhere|metaverse|web3|on-?chain|🌍|🌏|🌎/i.test(s)) return '';
    for (const [re, name] of D.CITIES) if (re.test(s)) return name;
    return s.length <= 16 ? s.replace(/,.*$/, '').trim() : '';
  }

  const isLinkOnly = (text) => stripUrls(text).trim().length === 0;
  const hasCJK = (text) => /[一-鿿]/.test(text);
  const tweetUrl = (t) => `https://x.com/${t.username}/status/${t.id}`;
  const countBy = (arr) => { const m = new Map(); for (const k of arr) m.set(k, (m.get(k) || 0) + 1); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
  const median = (arr) => { const a = arr.filter((x) => x != null).sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : null; };
  const dayKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

  // ---------- 主分析 ----------
  function analyze(raw, opts = {}) {
    const all = inferSavedAt(normalize(raw));
    if (!all.length) throw new Error('没有读到任何推文，请检查文件格式');
    const years = [...new Set(all.map((t) => t.savedAt.getFullYear()))].sort((a, b) => b - a);
    const year = opts.year || years[0];
    const items = all.filter((t) => t.savedAt.getFullYear() === year);
    const prevAuthors = new Set(all.filter((t) => t.savedAt.getFullYear() < year).map((t) => t.username));
    const n = items.length;
    if (!n) throw new Error(`${year} 年没有收藏记录`);
    const hasRaw = items.some((t) => t.hasRaw);
    const ofN = (k) => k / n;

    for (const t of items) {
      t.full = t.text + '\n' + t.articleText;
      t.topics = topicsOf(t.full).map((h) => h.id);
      t.brands = score(brandMatchers, t.full).map((h) => h.id);
    }

    // 1. 总量
    const articleCount = items.filter((t) => t.isArticle).length;
    const articlesWithText = items.filter((t) => t.isArticle && t.articleText).length;
    const ARTICLE_GUESS = 3000; // 没抓到全文的长文，按 3000 字估
    const chars = items.reduce((s, t) => s + stripUrls(t.text).trim().length + (t.articleText ? t.articleText.length : (t.isArticle ? ARTICLE_GUESS : 0)), 0);
    const videoMinutes = Math.round(items.reduce((s, t) => s + t.videoMs, 0) / 60000);
    const readHours = Math.max(1, Math.round(chars / 400 / 60 + videoMinutes / 60));
    const totalViews = hasRaw ? items.reduce((s, t) => s + (t.views || 0), 0) : null;
    const charsEstimated = articleCount > articlesWithText;

    // 2. 节奏
    const months = Array(12).fill(0);
    items.forEach((t) => months[t.savedAt.getMonth()]++);
    const peakMonth = months.indexOf(Math.max(...months));
    const days = countBy(items.map((t) => dayKey(t.savedAt)));
    const burstDay = days[0] ? { day: days[0][0], count: days[0][1] } : null;

    // 3. 领域
    const primary = countBy(items.filter((t) => t.topics.length).map((t) => t.topics[0]));
    const any = countBy(items.flatMap((t) => t.topics));
    const tagged = items.filter((t) => t.topics.length).length;
    const topicMeta = Object.fromEntries(D.TOPICS.map((t) => [t.id, t]));
    const topics = primary.map(([id, count]) => ({ id, name: topicMeta[id].name, color: topicMeta[id].color, count, share: count / tagged, mentions: (any.find((a) => a[0] === id) || [0, 0])[1] }));
    const untagged = n - tagged;
    const topicMonths = months.map((_, m) => {
      const c = countBy(items.filter((t) => t.savedAt.getMonth() === m && t.topics.length).map((t) => t.topics[0]));
      return c[0] ? { id: c[0][0], name: topicMeta[c[0][0]].name, color: topicMeta[c[0][0]].color, count: c[0][1] } : null;
    });

    // 品牌
    const brandMeta = Object.fromEntries(D.BRANDS.map((b) => [b.id, b]));
    const brands = countBy(items.flatMap((t) => t.brands)).map(([id, count]) => ({ id, name: brandMeta[id].name, color: brandMeta[id].color, count }));
    const brandMonths = months.map((_, m) => {
      const c = countBy(items.filter((t) => t.savedAt.getMonth() === m).flatMap((t) => t.brands));
      return c[0] && c[0][1] >= 2 ? { id: c[0][0], name: brandMeta[c[0][0]].name, color: brandMeta[c[0][0]].color, count: c[0][1] } : null;
    });
    // 移情别恋史：把相邻月份的冠军合并成阶段
    const brandEras = [];
    brandMonths.forEach((b, m) => {
      if (!b) return;
      const last = brandEras[brandEras.length - 1];
      if (last && last.id === b.id) last.to = m; else brandEras.push({ ...b, from: m, to: m });
    });

    // 4. 作者
    const byAuthor = new Map();
    for (const t of items) {
      const a = byAuthor.get(t.username) || { username: t.username, name: t.name, count: 0, followers: t.followers, iFollow: t.iFollow };
      a.count++; byAuthor.set(t.username, a);
    }
    const authors = [...byAuthor.values()].sort((a, b) => b.count - a.count);
    const oneTimeAuthors = authors.filter((a) => a.count === 1).length;
    const newAuthors = authors.filter((a) => !prevAuthors.has(a.username)).length;
    const notFollowed = hasRaw ? items.filter((t) => t.iFollow === false).length : null;
    const liked = hasRaw ? items.filter((t) => t.iLiked).length : null;
    const quoted = countBy(items.filter((t) => t.quotedAuthor).map((t) => t.quotedAuthor)).slice(0, 5);

    // 作者画像
    let authorProfile = null;
    if (hasRaw) {
      const fl = authors.map((a) => a.followers).filter((x) => x != null);
      const cities = countBy(authors.map((a) => cleanLocation((items.find((t) => t.username === a.username) || {}).location)).filter(Boolean)).slice(0, 6);
      const acctYears = items.filter((t) => t.authorCreated).map((t) => ({ y: t.authorCreated.getFullYear(), t }));
      const oldest = acctYears.sort((a, b) => a.t.authorCreated - b.t.authorCreated)[0];
      authorProfile = {
        medianFollowers: median(fl),
        big: authors.filter((a) => a.followers >= 100000).length,
        small: authors.filter((a) => a.followers != null && a.followers < 5000).length,
        cities,
        brandNewAccounts: new Set(acctYears.filter((x) => x.y === year).map((x) => x.t.username)).size,
        oldest: oldest ? { username: oldest.t.username, name: oldest.t.name, year: oldest.y } : null,
      };
    }

    // 5. 口味
    const medianLikes = median(items.map((t) => t.likes));
    const medianViews = hasRaw ? median(items.map((t) => t.views)) : null;
    const withText = items.filter((t) => !isLinkOnly(t.text) || t.articleText);
    const pop = (t) => (t.views != null ? t.views : t.likes * 100);
    const mostViral = [...withText].sort((a, b) => pop(b) - pop(a))[0] || items[0];
    const hiddenGem = [...withText].sort((a, b) => pop(a) - pop(b))[0] || items[0];
    const saveRatio = hasRaw ? median(items.filter((t) => t.likes >= 50).map((t) => t.bookmarksGlobal / t.likes)) : null;
    const rarest = hasRaw ? [...withText].filter((t) => t.bookmarksGlobal != null).sort((a, b) => a.bookmarksGlobal - b.bookmarksGlobal)[0] : null;
    const domains = countBy(items.flatMap((t) => t.domains).filter((d) => !/^(x|twitter)\.com$|t\.co$|\.(md|txt|py|js|json|sh)$/i.test(d))).slice(0, 6);
    const github = items.filter((t) => t.domains.includes('github.com')).length;

    // 形式与语言
    const formats = {
      article: articleCount,
      longPost: items.filter((t) => t.isLongPost).length,
      quote: items.filter((t) => t.isQuote).length,
      photo: items.filter((t) => t.photos > 0).length,
      video: items.filter((t) => t.videos > 0).length,
      linkOnly: items.filter((t) => isLinkOnly(t.text)).length,
    };
    // 卡片用的三分类（互不重叠）：文章 = X 长文，视频 = 带视频的推文，其余都算帖子
    const kinds = { article: articleCount, video: items.filter((t) => !t.isArticle && t.videos > 0).length };
    kinds.post = n - kinds.article - kinds.video;
    const cjk = items.filter((t) => hasCJK(t.full)).length;
    const en = items.filter((t) => !hasCJK(t.full) && /[a-z]{3,}/i.test(stripUrls(t.full))).length;

    // 6. 里程碑
    const chrono = [...items].reverse(); // 原数组是收藏倒序
    const firstOfYear = chrono[0];
    const latest = items[0];
    const dig = [...items].sort((a, b) => (b.savedAt - b.date) - (a.savedAt - a.date))[0];
    const digDays = Math.round((dig.savedAt - dig.date) / 864e5);

    // 7. 年度关键词
    const keywords = keywordMatchers
      .map((k) => ({ word: k.word, count: items.filter((t) => { const s = stripUrls(t.full); return k.res.some((re) => re.test(s)); }).length }))
      .filter((k) => k.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    // 8. 人格
    const top = topics[0];
    const personaKey = top && top.share >= 0.15 ? top.id : 'other';
    const persona = { key: personaKey, ...D.PERSONAS[personaKey], color: top ? top.color : '#7C5CFF' };

    // 徽章：brag=true 的才上分享卡（让人显得聪明/有趣），其余只在报告页里
    const B = [];
    const add = (name, desc, brag) => B.push({ name, desc, brag });
    if (formats.article + formats.longPost >= n * 0.3) add('深度阅读者', `${formats.article + formats.longPost} 条是长文或长推，碎片信息入不了你的眼。`, true);
    if (github >= 10) add('GitHub 寻宝人', `收藏里出现了 ${github} 次 GitHub 链接。`, true);
    if (cjk / n > 0.25 && en / n > 0.1) add('双语冲浪选手', `中文 ${Math.round(cjk / n * 100)}%，英文 ${Math.round(en / n * 100)}%，信息差就是这么来的。`, true);
    if (hiddenGem && hasRaw && hiddenGem.views != null && hiddenGem.views < 5000) add('小众挖宝人', `你收藏过一条只有 ${hiddenGem.views} 次浏览的推文。`, true);
    if (authorProfile && authorProfile.medianFollowers > 100000) add('大 V 信徒', `你收藏的作者粉丝中位数 ${fmt(authorProfile.medianFollowers)}。`, false);
    if (authors.length / n > 0.6) add('雨露均沾', `${n} 条收藏来自 ${authors.length} 位作者，${oneTimeAuthors} 位只收藏过一次。`, true);
    else if (authors[0] && authors[0].count >= 8) add('头号死忠粉', `你收藏了 @${authors[0].username} ${authors[0].count} 次。`, true);
    if (brandEras.length >= 3) add('AI 渣男', `一年换了 ${new Set(brandEras.map((e) => e.id)).size} 个「最爱」AI。`, true);
    if (notFollowed != null && notFollowed / n > 0.5 && liked / n < 0.1) add('白嫖大师', `${Math.round(notFollowed / n * 100)}% 的收藏来自没关注的人，${n} 条只点赞了 ${liked} 条。`, false);
    if (formats.linkOnly / n > 0.2) add('链接囤积癖', `${Math.round(formats.linkOnly / n * 100)}% 的收藏只有一个链接，点开了吗？`, false);
    if (digDays > 365) add('考古学家', `你收藏了一条 ${Math.floor(digDays / 365)} 年前的推文。`, true);
    if (Math.max(...months) / n > 0.2) add('收藏暴走月', `${peakMonth + 1} 月一个月收藏了 ${months[peakMonth]} 条。`, false);

    // 9. 年度总结：根据内容方向、形式、广度，写一段正面鼓励的话
    const summary = (() => {
      const names = topics.slice(0, 3).map((t) => t.name);
      const frontier = ['agent', 'dev', 'aigc'].includes(topics[0] && topics[0].id);
      const parts = [];
      if (names.length) parts.push(`你把目光投向了${names.join('、')}，${frontier ? '一直站在变化的最前沿' : '一直在为真正重要的事积累'}`);
      const deep = formats.article + formats.longPost;
      if (deep >= n * 0.3) parts.push(`${formats.article} 篇长文说明你愿意为深度花时间`);
      else if (kinds.video >= n * 0.15) parts.push(`${kinds.video} 条视频让你学得又快又直观`);
      else parts.push('碎片时间也被你用来高效吸收');
      if (en / n > 0.1 && cjk / n > 0.25) parts.push('中英双语输入让你看得更早、更远');
      else if (authors.length >= 100) parts.push(`${authors.length} 位作者的见解汇成了你的知识地图`);
      return parts.join('；') + `。${year + 1}，把收藏变成作品，你已经准备好了！`;
    })();

    return {
      year, years, total: n, allTotal: all.length, hasRaw,
      chars, charsEstimated, readHours, videoMinutes, totalViews, articleCount, articlesWithText,
      months, peakMonth, burstDay,
      topics, untagged, topicMonths, brands, brandMonths, brandEras,
      authors: authors.slice(0, 10), authorCount: authors.length, oneTimeAuthors, newAuthors, hasPrevYears: prevAuthors.size > 0,
      notFollowed, liked, quoted, authorProfile,
      medianLikes, medianViews, mostViral, hiddenGem, saveRatio, rarest, domains, github,
      formats, kinds, cjk, en,
      firstOfYear, latest, dig: { tweet: dig, days: digDays },
      keywords, persona, badges: B, summary,
      tweetUrl,
    };
  }

  function fmt(n) {
    if (n == null) return '—';
    if (n >= 1e8) return (n / 1e8).toFixed(1).replace(/\.0$/, '') + '亿';
    if (n >= 1e4) return (n / 1e4).toFixed(1).replace(/\.0$/, '') + '万';
    return String(n);
  }
  const pct = (x) => Math.round(x * 100) + '%';
  const fmtWords = (n) => (n >= 1e4 ? Math.round(n / 1e4) + ' 万' : String(n));

  const api = { fmtWords, normalize, inferSavedAt, topicsOf, cleanLocation, analyze, fmt, pct, tweetUrl, isLinkOnly };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BW = api;
})(typeof window !== 'undefined' ? window : globalThis);

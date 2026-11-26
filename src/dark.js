// 深色版：3 张信息密集的总结图（1080×1440），复用 posters.js 的绘图工具。
// 01 总览：总数、类型、字数、浏览、人格、徽章、月度节奏
// 02 关注：前 5 领域 + 代表作、季度冠军、AI 移情别恋史、年度最爱、年度关键词
// 03 人与内容：前 3 位作者、关注关系、最火/最冷门的收藏卡片、年度总结、2027 预言
(function (root) {
  const W = 1080, H = 1440, P = 72;
  const D = { bg: '#0b0b12', panel: '#15151f', panel2: '#1c1c28', line: '#2a2a3a', text: '#f4f4f8', sub: '#cfcfe0', muted: '#9a9ab0', pink: '#FF4D8D', yellow: '#F2C230' };
  const CN = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC",sans-serif';
  const NUM = `"Anton",${CN}`;
  const SITE = () => (root.BW_CARD && root.BW_CARD.SITE) || 'bradstan.github.io/x-bookmarks-recap';
  const U = () => root.BW_POSTERS.util;
  const fmt = (n) => root.BW.fmt(n);
  const medals = ['🥇', '🥈', '🥉'];

  function bg(c, r) {
    c.fillStyle = D.bg; c.fillRect(0, 0, W, H);
    glow(c, W * 0.88, 80, 560, r.persona.color, 0.42);
    glow(c, 60, H * 0.7, 520, D.pink, 0.14);
  }
  function glow(c, x, y, rad, color, a) {
    const n = parseInt(color.slice(1), 16), rgb = `${n >> 16},${(n >> 8) & 255},${n & 255}`;
    const g = c.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  const grad = (c, r) => { const g = c.createLinearGradient(P, 0, W - P, 0); g.addColorStop(0, r.persona.color); g.addColorStop(1, D.pink); return g; };
  function t(c, s, x, y, f, color, align = 'left') { c.font = f; c.fillStyle = color; c.textAlign = align; c.fillText(s, x, y); c.textAlign = 'left'; }
  function panel(c, x, y, w, h, fill = D.panel) { U().fillRR(c, x, y, w, h, 22, fill); }
  function section(c, s, y) { t(c, s, P, y, `600 26px ${CN}`, D.muted); }

  // 页眉：头像 + 「2026 X收藏夹年度报告」+ 名字 + 页码
  function header(c, r, o, imgs, n, sub) {
    const ax = P + 40, ay = 92, ar = 40;
    U().avatarCircle(c, imgs.get(o.avatar), ax, ay, ar, o.name || o.username || 'X', 'rgba(255,255,255,0.25)');
    const tx = ax + ar + 22;
    c.font = `900 46px ${CN}`; c.fillStyle = grad(c, r); const ys = String(r.year); c.fillText(ys, tx, ay + 2);
    const yw = c.measureText(ys).width;
    t(c, ' X收藏夹年度报告', tx + yw, ay + 2, `900 46px ${CN}`, D.text);
    const who = [o.name, o.username ? '@' + o.username : ''].filter(Boolean).join(' · ');
    if (who) U().fit(c, who, tx, ay + 40, 520, 24, 500, CN, D.muted);
    t(c, `${n} / 3`, W - P, ay - 6, `400 30px ${NUM}`, D.muted, 'right');
    t(c, sub, W - P, ay + 36, `600 22px ${CN}`, D.muted, 'right');
  }
  function footer(c) {
    const fy = H - 40 - 76;
    U().fillRR(c, P - 16, fy, W - 2 * P + 32, 76, 38, 'rgba(255,255,255,0.06)');
    t(c, '生成你的收藏夹年报 →', P + 14, fy + 48, `600 26px ${CN}`, D.sub);
    t(c, SITE(), W - P - 14, fy + 48, `700 26px ${CN}`, D.text, 'right');
  }
  function chip(c, s, x, y, { size = 26, fill = 'rgba(255,255,255,0.08)', color = D.text, weight = 700 } = {}) {
    c.font = `${weight} ${size}px ${CN}`; const w = c.measureText(s).width + size * 1.4;
    U().fillRR(c, x, y, w, size * 1.9, size * 0.95, fill); t(c, s, x + size * 0.7, y + size * 1.32, `${weight} ${size}px ${CN}`, color); return w;
  }
  function bar(c, x, y, w, h, frac, color) { U().fillRR(c, x, y, w, h, h / 2, '#22222f'); U().fillRR(c, x, y, Math.max(h, w * frac), h, h / 2, color); }

  const pages = [];

  // ---------- 01 总览 ----------
  pages.push(function overview(c, r, o, imgs) {
    bg(c, r); header(c, r, o, imgs, 1, '总览');
    let y = 270;
    const lead = `${r.year}年我在X上一共收藏了`;
    t(c, lead, P, y, `600 32px ${CN}`, D.sub);
    c.font = `600 32px ${CN}`; let x = P + c.measureText(lead).width + 14;
    c.font = `400 120px ${NUM}`; c.fillStyle = grad(c, r); c.fillText(String(r.total), x, y + 6); x += c.measureText(String(r.total)).width + 12;
    t(c, '个内容', x, y, `600 32px ${CN}`, D.sub);
    // 类型
    y += 36; x = P;
    for (const s of [`📝 帖子 ${r.kinds.post}`, `📰 文章 ${r.kinds.article}`, `🎬 视频 ${r.kinds.video}`]) x += chip(c, s, x, y, { size: 26 }) + 12;
    // 2×2 数字
    y += 84;
    const books = Math.max(1, Math.round(r.chars / 100000));
    const stats = [
      [root.BW.fmtWords(r.chars) + '字', `相当于读完 ${books} 本书`],
      [r.videoMinutes ? `${r.videoMinutes} 分钟` : `${r.kinds.video} 条`, r.videoMinutes ? '收藏的视频总时长' : '收藏的视频'],
      [fmt(r.totalViews), '这些内容的总浏览量'],
      [fmt(r.globalBookmarks), '人次和我收藏了同样的内容'],
    ];
    const sw = (W - P * 2 - 16) / 2;
    stats.forEach(([big, small], i) => {
      const sx = P + (i % 2) * (sw + 16), sy = y + Math.floor(i / 2) * 132;
      panel(c, sx, sy, sw, 116);
      U().fit(c, big, sx + 26, sy + 62, sw - 52, 48, 400, NUM, D.text);
      t(c, small, sx + 26, sy + 98, `500 22px ${CN}`, D.muted);
    });
    // 人格
    y += 290;
    section(c, '我的收藏人格', y);
    y += 82; c.fillStyle = grad(c, r); U().fit(c, r.persona.name, P, y, W - P * 2, 80, 900, CN, grad(c, r));
    y += 46; U().fit(c, r.persona.line, P, y, W - P * 2, 30, 500, CN, D.sub);
    // 徽章
    y += 30; x = P;
    for (const b of r.badges.filter((b) => b.brag).slice(0, 5)) {
      c.font = `700 24px ${CN}`; const w = c.measureText(b.name).width + 34;
      if (x + w > W - P) break;
      x += chip(c, b.name, x, y, { size: 24, fill: 'rgba(255,255,255,0.1)' }) + 10;
    }
    // 月度节奏
    y += 110;
    section(c, '收藏节奏', y);
    const burst = r.burstDay && r.burstDay.count >= 5 ? ` · 暴走日 ${r.burstDay.day.split('-')[1]}月${r.burstDay.day.split('-')[2]}日 ≥${r.burstDay.count} 条` : '';
    t(c, `最疯：${r.peakMonth + 1} 月 ${r.months[r.peakMonth]} 条${burst}`, W - P, y, `600 22px ${CN}`, D.muted, 'right');
    const ch = 190, base = y + 26 + ch, bw = (W - P * 2) / 12, mx = Math.max(...r.months, 1);
    r.months.forEach((m, i) => {
      const h = (m / mx) * ch, bx = P + i * bw + 6;
      U().fillRR(c, bx, base - Math.max(4, h), bw - 12, Math.max(4, h), 6, i === r.peakMonth ? D.pink : r.persona.color);
      if (m) t(c, String(m), bx + (bw - 12) / 2, base - h - 8, `400 22px ${NUM}`, D.sub, 'center');
      t(c, `${i + 1}月`, bx + (bw - 12) / 2, base + 28, `500 19px ${CN}`, D.muted, 'center');
    });
    footer(c);
  });

  // ---------- 02 关注 ----------
  pages.push(function focus(c, r, o, imgs) {
    bg(c, r); header(c, r, o, imgs, 2, '我在关注什么');
    let y = 220;
    section(c, '我最关注的领域', y);
    const tops = r.topics.slice(0, 5), max = tops[0] ? tops[0].count : 1;
    tops.forEach((tp, i) => {
      y += 92;
      if (medals[i]) t(c, medals[i], P - 4, y + 2, `400 38px ${CN}`, '#fff');
      else t(c, String(i + 1), P + 18, y, `400 32px ${NUM}`, D.muted, 'center');
      U().fit(c, tp.name, P + 56, y, 280, 32, i < 3 ? 800 : 600, CN, D.text);
      bar(c, P + 340, y - 22, W - P * 2 - 470, 20, tp.count / max, tp.color);
      t(c, `${tp.count} 条`, W - P, y, `400 32px ${NUM}`, i < 3 ? D.text : D.muted, 'right');
      const pick = (r.topicPicks[tp.id] || []).map((x) => r.titleOf(x)).filter(Boolean)[0];
      if (pick) U().para(c, `代表作：${pick}`, P + 56, y + 34, W - P * 2 - 56, 26, 1, `500 21px ${CN}`, D.muted);
    });
    // 季度
    y += 72;
    const qw = (W - P * 2 - 30) / 4;
    r.quarters.forEach((q, i) => {
      const qx = P + i * (qw + 10);
      panel(c, qx, y, qw, 92, D.panel2);
      U().fillRR(c, qx, y, 8, 92, 4, q.color || D.line);
      t(c, `Q${q.q}`, qx + 24, y + 38, `400 28px ${NUM}`, D.muted);
      U().fit(c, q.name || '—', qx + 24, y + 74, qw - 40, 26, 800, CN, D.text);
    });
    // AI 移情别恋史
    y += 150;
    section(c, 'AI 移情别恋史', y);
    y += 22; let x = P, row = 0;
    r.brandEras.forEach((e, i) => {
      const label = e.name, months = e.from === e.to ? `${e.from + 1}月` : `${e.from + 1}–${e.to + 1}月`;
      c.font = `800 28px ${CN}`; const lw = c.measureText(label).width; c.font = `500 18px ${CN}`;
      const w = Math.max(lw, c.measureText(months).width) + 40;
      if (i > 0 && x + 30 + w <= W - P) { t(c, '→', x + 2, y + row * 100 + 50, `600 26px ${CN}`, D.muted); x += 30; }
      else if (i > 0) { x = P; row++; }
      const ey = y + row * 100;
      U().fillRR(c, x, ey, w, 80, 16, D.panel2);
      c.strokeStyle = e.color; c.lineWidth = 2; U().rrect(c, x, ey, w, 80, 16); c.stroke();
      t(c, label, x + 20, ey + 40, `800 28px ${CN}`, e.color === '#BBBBBB' || e.color === '#E0E0E0' ? D.text : e.color);
      t(c, months, x + 20, ey + 66, `500 18px ${CN}`, D.muted);
      x += w + 10;
    });
    y += (row + 1) * 100 + 20;
    // 年度最爱 + 年度关键词
    const hw = (W - P * 2 - 16) / 2;
    const fav = r.brands[0], kw = r.keywords[0];
    panel(c, P, y, hw, 170);
    t(c, '我的年度最爱', P + 26, y + 46, `600 24px ${CN}`, D.muted);
    if (fav) { U().fit(c, fav.name, P + 26, y + 124, hw - 200, 72, 400, NUM, D.text); t(c, `${fav.count} 次`, P + hw - 26, y + 124, `400 44px ${NUM}`, D.yellow, 'right'); }
    panel(c, P + hw + 16, y, hw, 170);
    t(c, '我的年度关键词', P + hw + 42, y + 46, `600 24px ${CN}`, D.muted);
    if (kw) { U().fit(c, kw.word, P + hw + 42, y + 124, hw - 200, 72, 400, NUM, D.text); t(c, `${kw.count} 条`, P + hw * 2 - 10, y + 124, `400 44px ${NUM}`, D.yellow, 'right'); }
    // 其他高频词
    y += 196; x = P;
    const brands2 = r.brands.slice(1, 5).map((b) => `${b.name} ${b.count}`);
    const kws2 = r.keywords.slice(1, 7).map((k) => `${k.word} ${k.count}`);
    const limit = H - 40 - 76 - 24;
    for (const s of [...kws2, ...brands2]) {
      c.font = `600 22px ${CN}`; const w = c.measureText(s).width + 30;
      if (x + w > W - P) { x = P; y += 54; }
      if (y + 42 > limit) break;
      x += chip(c, s, x, y, { size: 22, weight: 600, color: D.sub }) + 10;
    }
    footer(c);
  });

  // ---------- 03 人与内容 ----------
  pages.push(function people(c, r, o, imgs) {
    bg(c, r); header(c, r, o, imgs, 3, '我和谁，读了什么');
    let y = 220;
    section(c, '我收藏最多的作者', y);
    const cw = (W - P * 2 - 32) / 3;
    r.authors.slice(0, 3).forEach((a, i) => {
      const cx = P + i * (cw + 16);
      panel(c, cx, y + 20, cw, 186);
      U().avatarCircle(c, imgs.get(r.avatars[a.username]), cx + cw / 2, y + 92, 48, a.username, 'rgba(255,255,255,0.25)');
      t(c, medals[i], cx + 20, y + 66, `400 32px ${CN}`, '#fff');
      U().fit(c, '@' + a.username, cx + cw / 2, y + 166, cw - 30, 26, 800, CN, D.text, 'center');
      t(c, `${a.count} 条`, cx + cw / 2, y + 196, `400 22px ${NUM}`, D.muted, 'center');
    });
    y += 244;
    const ap = r.authorProfile;
    const facts = [[`${r.authorCount}`, '位作者'], [r.notFollowed != null ? `${Math.round(r.notFollowed / r.total * 100)}%` : '—', '来自没关注的人'], [ap ? fmt(ap.medianFollowers) : '—', '作者粉丝中位数'], [ap ? `${ap.big}` : '—', '位 10 万粉大号']];
    const fw = (W - P * 2) / 4;
    facts.forEach(([big, small], i) => { t(c, big, P + i * fw, y + 16, `400 46px ${NUM}`, D.text); t(c, small, P + i * fw, y + 50, `500 20px ${CN}`, D.muted); });
    // 两张代表收藏
    y += 100;
    section(c, '年度证物', y);
    const ev = [r.mostViral, r.hiddenGem].filter(Boolean);
    const labels = [r.mostViral && (r.mostViral.views != null ? `🔥 最火 · ${fmt(r.mostViral.views)} 浏览` : `🔥 最火 · ${fmt(r.mostViral.likes)} 赞`),
      r.hiddenGem && (r.hiddenGem.views != null ? `💎 最冷门 · 只有 ${fmt(r.hiddenGem.views)} 浏览` : `💎 最冷门 · ${r.hiddenGem.likes} 赞`)];
    const ew = (W - P * 2 - 20) / 2;
    let evH = 0;
    ev.forEach((tw, i) => {
      const ex = P + i * (ew + 20);
      t(c, labels[i], ex, y + 44, `700 22px ${CN}`, D.sub);
      tw._avatar = r.avatars[tw.username] || '';
      evH = Math.max(evH, U().xCard(c, tw, ex, y + 62, ew, imgs, { maxText: 2, imgRatio: 0.3 }));
    });
    // 最长 + 第一条（一行字）
    y += 62 + evH + 36;
    const longT = r.titleOf(r.longest), firstT = r.titleOf(r.firstOfYear);
    if (longT) U().para(c, `📏 最长的一篇（${root.BW.fmtWords(r.longestChars)}字）：${longT}`, P, y, W - P * 2, 32, 1, `500 23px ${CN}`, D.sub);
    if (firstT) U().para(c, `🌅 年度第一条：${firstT}`, P, y + 38, W - P * 2, 32, 1, `500 23px ${CN}`, D.sub);
    // 总结 + 预言
    y += 72;
    const room = H - 40 - 76 - 24 - y;
    const pred = r.rising && r.rising.delta > 0.02 ? `🔮 ${r.year + 1} 预言：我会更关注「${r.rising.name}」（下半年占比 +${Math.round(r.rising.delta * 100)} 个百分点）` : '';
    const sumLines = Math.max(2, Math.floor((room - (pred ? 44 : 0)) / 35));
    const used = U().para(c, r.summary, P, y + 6, W - P * 2, 35, sumLines, `500 24px ${CN}`, D.text);
    if (pred) U().para(c, pred, P, y + 6 + used + 8, W - P * 2, 34, 1, `700 23px ${CN}`, D.yellow);
    footer(c);
  });

  const TITLES = ['深色 · 总览', '深色 · 我在关注什么', '深色 · 我和谁，读了什么'];
  function draw(canvas, i, r, o, imgs) {
    canvas.width = W; canvas.height = H;
    const c = canvas.getContext('2d'); c.textBaseline = 'alphabetic';
    pages[i](c, r, o, imgs);
  }
  root.BW_DARK = { draw, count: pages.length, TITLES };
})(window);

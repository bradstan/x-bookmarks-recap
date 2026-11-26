// 分享卡片：直接用 Canvas 画，1080×1440（3:4，适合小红书/朋友圈/X）。不依赖任何外部库。
// 只放让人「显得聪明 / 有趣」的内容，吐槽类徽章不上卡。
(function (root) {
  const SITE = 'bradstan.github.io/bookmarks-wrapped'; // fork 之后改成你自己的地址
  const FONT = '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
  const W = 1080, H = 1440, P = 84;

  // opts: { name, username, avatar: 已加载好的 Image（可选） }
  // 信息顺序：标题 → 收藏总数（帖子/文章/视频）+ 字数 → 收藏人格 → 最关注的 5 个领域
  //          → 收藏最多的 3 位作者 → 年度最爱 → 年度关键词 → 年度总结 → 生成链接
  function draw(canvas, r, opts = {}) {
    canvas.width = W; canvas.height = H;
    const c = canvas.getContext('2d');
    const accent = r.persona.color;
    const BW = root.BW;
    const grad = () => { const g = c.createLinearGradient(P, 0, W - P, 0); g.addColorStop(0, accent); g.addColorStop(1, '#FF4D8D'); return g; };

    c.fillStyle = '#0b0b12'; c.fillRect(0, 0, W, H);
    glow(c, W * 0.85, 120, 520, accent, 0.45);
    glow(c, 80, H * 0.62, 460, '#FF4D8D', 0.16);

    // ---- 头像 + 名字 + @id ----
    const ax = P + 42, ay = 92, ar = 42;
    c.save(); c.beginPath(); c.arc(ax, ay, ar, 0, Math.PI * 2); c.closePath();
    if (opts.avatar && opts.avatar.complete && opts.avatar.naturalWidth) {
      c.clip(); c.drawImage(opts.avatar, ax - ar, ay - ar, ar * 2, ar * 2);
    } else {
      c.fillStyle = accent; c.fill();
      c.fillStyle = '#fff'; c.font = `800 38px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(((opts.name || opts.username || 'X')[0] || 'X').toUpperCase(), ax, ay + 2);
    }
    c.restore();
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 3; c.beginPath(); c.arc(ax, ay, ar, 0, Math.PI * 2); c.stroke();
    const nameX = ax + ar + 24, nameMax = W - P - nameX;
    if (opts.name || opts.username) {
      c.fillStyle = '#f4f4f8'; fitText(c, opts.name || '@' + opts.username, nameX, ay - 4, nameMax, 36, 800);
      if (opts.username && opts.name) { c.fillStyle = '#9a9ab0'; fitText(c, '@' + opts.username, nameX, ay + 34, nameMax, 26, 500); }
    }

    // ---- 标题 ----
    let y = 212, x = P;
    const seg = (s, fill) => { c.font = `900 54px ${FONT}`; c.fillStyle = fill; c.fillText(s, x, y); x += c.measureText(s).width; };
    seg('我的', '#f4f4f8'); seg(String(r.year), grad()); seg(' X收藏夹年度报告', '#f4f4f8');

    // ---- 收藏总数 ----
    y = 316; x = P;
    const k = r.kinds;
    const lead = `${r.year}年我在X上一共收藏了`;
    c.font = `600 32px ${FONT}`; c.fillStyle = '#cfcfe0'; c.fillText(lead, x, y); x += c.measureText(lead).width + 12;
    c.font = `900 96px ${FONT}`; c.fillStyle = grad(); c.fillText(String(r.total), x, y); x += c.measureText(String(r.total)).width + 12;
    c.font = `600 32px ${FONT}`; c.fillStyle = '#cfcfe0'; c.fillText('个内容', x, y);
    y += 26; x = P;
    for (const [label, v] of [['帖子', k.post], ['文章', k.article], ['视频', k.video]]) {
      c.font = `500 26px ${FONT}`; const lw = c.measureText(label).width;
      c.font = `800 30px ${FONT}`; const vw = c.measureText(String(v)).width;
      const w = lw + vw + 50;
      roundRect(c, x, y, w, 54, 27, 'rgba(255,255,255,0.08)');
      text(c, label, x + 20, y + 37, '500 26px', '#9a9ab0');
      text(c, String(v), x + 20 + lw + 10, y + 38, '800 30px', '#f4f4f8');
      x += w + 12;
    }
    y += 54 + 50;
    text(c, `约 ${BW.fmtWords(r.chars)} 字，相当于读完 ${Math.max(1, Math.round(r.chars / 100000))} 本书`, P, y, '600 30px', '#cfcfe0');

    // ---- 收藏人格 ----
    y += 64;
    text(c, '我的收藏人格', P, y, '600 28px', '#9a9ab0');
    y += 76;
    c.fillStyle = grad(); fitText(c, r.persona.name, P, y, W - 2 * P, 72, 900);
    y += 42;
    c.fillStyle = '#cfcfe0'; fitText(c, r.persona.line, P, y, W - 2 * P, 28, 500);

    // ---- 最关注的 5 个领域 ----
    y += 64;
    text(c, '我最关注的领域', P, y, '600 28px', '#9a9ab0');
    const tops = r.topics.slice(0, 5);
    const max = tops[0] ? tops[0].count : 1;
    const medals = ['🥇', '🥈', '🥉'];
    const barX = P + 320, barW = W - P - barX - 130;
    tops.forEach((t, i) => {
      y += 50;
      if (medals[i]) text(c, medals[i], P - 4, y + 4, '400 38px', '#fff');
      else { c.textAlign = 'center'; text(c, String(i + 1), P + 18, y, '700 26px', '#9a9ab0'); c.textAlign = 'left'; }
      c.fillStyle = '#f4f4f8'; fitText(c, t.name, P + 54, y, barX - P - 68, 30, i < 3 ? 700 : 500);
      roundRect(c, barX, y - 22, barW, 20, 10, '#20202e');
      roundRect(c, barX, y - 22, Math.max(20, barW * t.count / max), 20, 10, t.color);
      c.textAlign = 'right'; text(c, `${t.count} 条`, W - P, y, '600 26px', i < 3 ? '#f4f4f8' : '#9a9ab0'); c.textAlign = 'left';
    });

    // ---- 作者 Top 3 | 年度最爱 / 年度关键词 ----
    y += 36;
    const lw = Math.round((W - 2 * P - 20) * 0.56), rw = W - 2 * P - 20 - lw, rx = P + lw + 20;
    roundRect(c, P, y, lw, 176, 22, '#15151f');
    text(c, '我收藏最多的作者', P + 22, y + 40, '500 22px', '#9a9ab0');
    r.authors.slice(0, 3).forEach((a, i) => {
      const ly = y + 82 + i * 36;
      text(c, `${i + 1}.`, P + 22, ly, '700 26px', '#9a9ab0');
      c.fillStyle = '#f4f4f8'; fitText(c, '@' + a.username, P + 56, ly, lw - 56 - 96, 26, 700);
      c.textAlign = 'right'; text(c, `${a.count} 条`, P + lw - 22, ly, '500 24px', '#9a9ab0'); c.textAlign = 'left';
    });
    [['我的年度最爱', r.brands[0] ? r.brands[0].name : '—'], ['我的年度关键词', r.keywords[0] ? r.keywords[0].word : '—']].forEach(([label, value], i) => {
      const ty = y + i * 98;
      roundRect(c, rx, ty, rw, 78, 22, '#15151f');
      text(c, label, rx + 22, ty + 30, '500 22px', '#9a9ab0');
      c.fillStyle = '#f4f4f8'; fitText(c, value, rx + 22, ty + 66, rw - 44, 30, 800);
    });
    y += 176;

    // ---- 年度总结 ----
    y += 50;
    let size = 27, lines = wrap(c, r.summary, W - 2 * P, size);
    while (lines.length > 3 && size > 20) { size -= 1; lines = wrap(c, r.summary, W - 2 * P, size); }
    lines.slice(0, 3).forEach((ln, i) => text(c, ln, P, y + i * Math.round(size * 1.48), `500 ${size}px`, '#e4e4ee'));

    // ---- 底部：生成链接 ----
    const fy = H - 40 - 80;
    roundRect(c, P - 20, fy, W - 2 * P + 40, 80, 40, 'rgba(255,255,255,0.06)');
    text(c, '生成你的收藏夹年报 →', P + 16, fy + 50, '600 26px', '#cfcfe0');
    c.textAlign = 'right'; text(c, SITE, W - P - 16, fy + 50, '700 26px', '#f4f4f8'); c.textAlign = 'left';
  }

  // 按字符折行（中英混排都适用，英文单词尽量不拆）
  function wrap(c, s, maxW, size) {
    c.font = `500 ${size}px ${FONT}`;
    const tokens = s.match(/[A-Za-z0-9@._-]+|\s|./gu) || [];
    const lines = []; let cur = '';
    for (const tk of tokens) {
      if (c.measureText(cur + tk).width > maxW && cur) { lines.push(cur.trim()); cur = tk.trim(); }
      else cur += tk;
    }
    if (cur.trim()) lines.push(cur.trim());
    return lines;
  }

  function text(c, s, x, y, font, color) { c.font = `${font} ${FONT}`; c.fillStyle = color; c.fillText(s, x, y); }
  function glow(c, x, y, r, color, a) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, hexA(color, a)); g.addColorStop(1, hexA(color, 0));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
  function roundRect(c, x, y, w, h, r, fill) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); c.fillStyle = fill; c.fill();
  }
  function fitText(c, s, x, y, maxW, size, weight) {
    let z = size;
    c.font = `${weight} ${z}px ${FONT}`;
    while (c.measureText(s).width > maxW && z > 14) { z -= 2; c.font = `${weight} ${z}px ${FONT}`; }
    c.fillText(s, x, y);
  }

  root.BW_CARD = { draw, SITE };
})(window);

// 「收藏档案」9 张海报：Canvas 绘制，1080×1440。风格：米白纸 + 钴蓝 + 墨黑 + 胶带黄，撕纸、胶带、标签、剪报字。
(function (root) {
  const W = 1080, H = 1440, P = 72;
  const C = {
    paper: '#ECE8DF', paper2: '#F6F3EC', ink: '#141414', blue: '#1F3BD6', tape: 'rgba(242,194,48,0.88)', yellow: '#F2C230',
    red: '#D7263D', muted: '#6B6760', line: '#CFC8BA', xblue: '#1D9BF0', xbg: '#000000', xline: '#2F3336', xtext: '#E7E9EA', xmuted: '#71767B',
  };
  const CN = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC",sans-serif';
  const DISPLAY = `"Anton",${CN}`;
  const SERIF = '"Songti SC","STSong","Noto Serif CJK SC",Georgia,serif';
  const MONO = '"SF Mono",Menlo,Consolas,monospace';
  const SITE = () => (root.BW_CARD && root.BW_CARD.SITE) || 'bradstan.github.io/x-bookmarks-recap';
  const fmt = (n) => root.BW.fmt(n);

  // ---------- 工具 ----------
  function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function font(c, w, size, fam = CN) { c.font = `${w} ${size}px ${fam}`; }
  function text(c, s, x, y, f, color, align = 'left') { c.font = f; c.fillStyle = color; c.textAlign = align; c.fillText(s, x, y); c.textAlign = 'left'; }
  function fit(c, s, x, y, maxW, size, weight, fam, color, align = 'left') {
    let z = size; font(c, weight, z, fam);
    while (c.measureText(s).width > maxW && z > 12) { z -= 2; font(c, weight, z, fam); }
    c.fillStyle = color; c.textAlign = align; c.fillText(s, x, y); c.textAlign = 'left'; return z;
  }
  function wrap(c, s, maxW) {
    const tokens = String(s).replace(/\s+/g, ' ').match(/[A-Za-z0-9@#._'’\-]+|\s|./gu) || [];
    const lines = []; let cur = '';
    for (const tk of tokens) {
      if (c.measureText(cur + tk).width > maxW && cur.trim()) { lines.push(cur.trim()); cur = tk.trim(); } else cur += tk;
    }
    if (cur.trim()) lines.push(cur.trim());
    return lines;
  }
  function para(c, s, x, y, maxW, lh, maxLines, f, color) {
    c.font = f; let lines = wrap(c, s, maxW);
    if (lines.length > maxLines) { lines = lines.slice(0, maxLines); let l = lines[maxLines - 1]; while (c.measureText(l + '…').width > maxW && l.length) l = l.slice(0, -1); lines[maxLines - 1] = l + '…'; }
    lines.forEach((ln, i) => { c.fillStyle = color; c.fillText(ln, x, y + i * lh); });
    return lines.length * lh;
  }
  function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function fillRR(c, x, y, w, h, r, fill) { rrect(c, x, y, w, h, r); c.fillStyle = fill; c.fill(); }
  function shadow(c, on, blur = 18, dy = 8, a = 0.22) { if (on) { c.shadowColor = `rgba(0,0,0,${a})`; c.shadowBlur = blur; c.shadowOffsetY = dy; } else { c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0; } }
  function rotated(c, x, y, a, fn) { c.save(); c.translate(x, y); c.rotate(a); fn(); c.restore(); }

  // 纸张：底色 + 颗粒 + 纤维
  function paper(c, seed = 1, color = C.paper) {
    c.fillStyle = color; c.fillRect(0, 0, W, H);
    const r = rng(seed);
    for (let i = 0; i < 9000; i++) { c.fillStyle = `rgba(0,0,0,${r() * 0.05})`; c.fillRect(r() * W, r() * H, 1.4, 1.4); }
    for (let i = 0; i < 2500; i++) { c.fillStyle = `rgba(255,255,255,${r() * 0.25})`; c.fillRect(r() * W, r() * H, 1.2, 1.2); }
    c.strokeStyle = 'rgba(0,0,0,0.035)'; c.lineWidth = 1;
    for (let i = 0; i < 40; i++) { const x = r() * W, y = r() * H; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 20 * r(), y + 10 * r(), x + 40 * r() - 20, y + 30 * r()); c.stroke(); }
  }
  // 对位标记
  function regMark(c, x, y, s = 14) {
    c.strokeStyle = 'rgba(20,20,20,0.55)'; c.lineWidth = 1.5;
    c.beginPath(); c.arc(x, y, s * 0.45, 0, Math.PI * 2); c.moveTo(x - s, y); c.lineTo(x + s, y); c.moveTo(x, y - s); c.lineTo(x, y + s); c.stroke();
  }
  // 撕边纸片
  function torn(c, x, y, w, h, fill, seed = 3, jag = 6, edges = 'tblr') {
    const r = rng(seed); const pts = [];
    const edge = (x1, y1, x2, y2, on) => {
      const n = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / 14));
      for (let i = 0; i < n; i++) {
        const t = i / n; const px = x1 + (x2 - x1) * t, py = y1 + (y2 - y1) * t;
        const nx = -(y2 - y1), ny = x2 - x1, l = Math.hypot(nx, ny) || 1;
        const d = on ? (r() - 0.5) * jag : 0;
        pts.push([px + nx / l * d, py + ny / l * d]);
      }
    };
    edge(x, y, x + w, y, edges.includes('t')); edge(x + w, y, x + w, y + h, edges.includes('r'));
    edge(x + w, y + h, x, y + h, edges.includes('b')); edge(x, y + h, x, y, edges.includes('l'));
    c.beginPath(); pts.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.closePath();
    c.fillStyle = fill; c.fill();
  }
  // 胶带
  function tape(c, x, y, w, a, color = C.tape, h = 38) {
    rotated(c, x, y, a, () => {
      const r = rng(Math.round(x * 7 + y));
      c.beginPath(); c.moveTo(-w / 2, -h / 2);
      for (let i = 0; i <= 6; i++) c.lineTo(-w / 2 + (r() - 0.5) * 6, -h / 2 + (h * i) / 6);
      c.lineTo(w / 2, h / 2);
      for (let i = 6; i >= 0; i--) c.lineTo(w / 2 + (r() - 0.5) * 6, -h / 2 + (h * i) / 6);
      c.closePath(); c.fillStyle = color; c.fill();
      c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(-w / 2, -h / 2 + 4, w, 4);
    });
  }
  // 标签块（如 POWER / IMAGE）
  function label(c, s, x, y, { bg = C.ink, fg = '#fff', size = 30, fam = CN, weight = 800, pad = 12, angle = 0 } = {}) {
    font(c, weight, size, fam); const w = c.measureText(s).width + pad * 2, h = size + pad * 1.4;
    rotated(c, x, y, angle, () => { c.fillStyle = bg; c.fillRect(0, 0, w, h); c.fillStyle = fg; c.textBaseline = 'middle'; c.fillText(s, pad, h / 2 + 1); c.textBaseline = 'alphabetic'; });
    return w;
  }
  // 印章
  function stamp(c, s, x, y, a, color = C.red, size = 64) {
    rotated(c, x, y, a, () => {
      font(c, 400, size, DISPLAY); const w = c.measureText(s).width + 56, h = size + 40;
      c.globalAlpha = 0.85; c.strokeStyle = color; c.lineWidth = 6; rrect(c, -w / 2, -h / 2, w, h, 10); c.stroke();
      c.lineWidth = 2; rrect(c, -w / 2 + 9, -h / 2 + 9, w - 18, h - 18, 6); c.stroke();
      c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(s, 0, 4); c.textAlign = 'left'; c.textBaseline = 'alphabetic';
      c.globalAlpha = 1;
      // 做旧：随机擦掉一些点
      const r = rng(x + y); c.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(0,0,0,${0.5 + r() * 0.5})`; c.fillRect((r() - 0.5) * w, (r() - 0.5) * h, 2 + r() * 3, 2 + r() * 2); }
      c.globalCompositeOperation = 'source-over';
    });
  }
  // 爆炸星贴纸
  function burst(c, x, y, r1, r2, n, fill, lines, a = -0.12) {
    rotated(c, x, y, a, () => {
      c.beginPath();
      for (let i = 0; i < n * 2; i++) { const rr = i % 2 ? r2 : r1, t = (Math.PI * i) / n; c.lineTo(Math.cos(t) * rr, Math.sin(t) * rr); }
      c.closePath(); shadow(c, true, 10, 4, 0.2); c.fillStyle = fill; c.fill(); shadow(c, false);
      c.fillStyle = C.ink; c.textAlign = 'center';
      lines.forEach(([s, f], i) => { c.font = f; c.fillText(s, 0, (i - (lines.length - 1) / 2) * 44 + 14); });
      c.textAlign = 'left';
    });
  }
  // 图钉 + 红线
  function pin(c, x, y, color = C.red) {
    shadow(c, true, 4, 3, 0.35); c.beginPath(); c.arc(x, y, 11, 0, Math.PI * 2); c.fillStyle = color; c.fill(); shadow(c, false);
    c.beginPath(); c.arc(x - 3, y - 3, 3.5, 0, Math.PI * 2); c.fillStyle = 'rgba(255,255,255,0.6)'; c.fill();
  }
  function string(c, x1, y1, x2, y2) {
    c.strokeStyle = 'rgba(200,30,45,0.9)'; c.lineWidth = 3; c.beginPath(); c.moveTo(x1, y1);
    c.quadraticCurveTo((x1 + x2) / 2, Math.max(y1, y2) + 24, x2, y2); c.stroke();
  }

  // 图片：裁切铺满
  function cover(c, img, x, y, w, h) {
    const iw = img && (img.naturalWidth || img.width), ih = img && (img.naturalHeight || img.height);
    if (!iw || !ih) return false;
    const s = Math.max(w / iw, h / ih);
    const sw = w / s, sh = h / s; c.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h); return true;
  }
  // 双色调（黑白 → 墨色/纸色），档案感
  const toneCache = new Map();
  function duotone(img, dark = [20, 20, 20], light = [236, 232, 223], key = '') {
    const k = (img && img.src ? img.src.slice(-40) : '') + key + dark + light;
    if (toneCache.has(k)) return toneCache.get(k);
    const cv = document.createElement('canvas'); const s = Math.min(1, 480 / Math.max(img.naturalWidth, img.naturalHeight));
    cv.width = Math.max(1, Math.round(img.naturalWidth * s)); cv.height = Math.max(1, Math.round(img.naturalHeight * s));
    const x = cv.getContext('2d'); x.drawImage(img, 0, 0, cv.width, cv.height);
    const d = x.getImageData(0, 0, cv.width, cv.height);
    for (let i = 0; i < d.data.length; i += 4) {
      let l = (0.3 * d.data[i] + 0.59 * d.data[i + 1] + 0.11 * d.data[i + 2]) / 255;
      l = Math.min(1, Math.max(0, (l - 0.5) * 1.25 + 0.5));
      for (let j = 0; j < 3; j++) d.data[i + j] = dark[j] + (light[j] - dark[j]) * l;
    }
    x.putImageData(d, 0, 0); toneCache.set(k, cv); return cv;
  }
  // 网点人像
  function halftone(img, size, dot = 7, ink = C.ink) {
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const x = cv.getContext('2d');
    const sm = document.createElement('canvas'); const n = Math.ceil(size / dot); sm.width = sm.height = n;
    const sx = sm.getContext('2d'); cover(sx, img, 0, 0, n, n);
    const d = sx.getImageData(0, 0, n, n).data;
    x.fillStyle = C.paper2; x.fillRect(0, 0, size, size); x.fillStyle = ink;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const k = (j * n + i) * 4; const l = (0.3 * d[k] + 0.59 * d[k + 1] + 0.11 * d[k + 2]) / 255;
      const r = (1 - l) * dot * 0.62; if (r > 0.3) { x.beginPath(); x.arc(i * dot + dot / 2, j * dot + dot / 2, r, 0, Math.PI * 2); x.fill(); }
    }
    return cv;
  }
  // 照片（白边 + 投影 + 双色调）
  function photo(c, img, x, y, w, h, a, { border = 12, tone = true, tapeOn = false, caption = '' } = {}) {
    rotated(c, x + w / 2, y + h / 2, a, () => {
      const bh = caption ? 46 : 0;
      shadow(c, true, 16, 8, 0.25); c.fillStyle = '#FBFAF6'; c.fillRect(-w / 2 - border, -h / 2 - border, w + border * 2, h + border * 2 + bh); shadow(c, false);
      const toned = tone === 'blue' ? duotone(img, [31, 59, 214], [236, 232, 223], 'b') : tone ? duotone(img) : img;
      if (img && img.naturalWidth) cover(c, toned, -w / 2, -h / 2, w, h);
      else { c.fillStyle = '#D9D3C7'; c.fillRect(-w / 2, -h / 2, w, h); }
      if (caption) fit(c, caption, 0, h / 2 + border + 32, w, 24, 700, CN, C.ink, 'center');
      if (tapeOn) tape(c, 0, -h / 2 - border, Math.min(140, w * 0.6), 0.04);
    });
  }
  // 头像圆形
  function avatarCircle(c, img, x, y, r, fallback = 'X', ring = '#fff') {
    c.save(); c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.closePath();
    if (img && img.naturalWidth) { c.clip(); cover(c, img, x - r, y - r, r * 2, r * 2); }
    else { c.fillStyle = C.blue; c.fill(); c.fillStyle = '#fff'; font(c, 800, r, CN); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(fallback.slice(0, 1).toUpperCase(), x, y + 2); c.textAlign = 'left'; c.textBaseline = 'alphabetic'; }
    c.restore(); c.strokeStyle = ring; c.lineWidth = 5; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke();
  }

  // ---------- X 风格内容卡片（照着 X 的样子画，等同截图）----------
  function icon(c, kind, x, y, color, filled) {
    c.save(); c.translate(x, y); c.strokeStyle = color; c.fillStyle = color; c.lineWidth = 2.2; c.lineJoin = 'round'; c.lineCap = 'round';
    c.beginPath();
    if (kind === 'reply') { rrect(c, -10, -9, 20, 15, 7); c.stroke(); c.beginPath(); c.moveTo(-4, 6); c.lineTo(-7, 11); c.lineTo(1, 6); c.stroke(); }
    else if (kind === 'rt') { c.moveTo(-9, -2); c.lineTo(-9, -7); c.lineTo(5, -7); c.moveTo(1, -11); c.lineTo(5, -7); c.lineTo(1, -3); c.moveTo(9, 2); c.lineTo(9, 7); c.lineTo(-5, 7); c.moveTo(-1, 3); c.lineTo(-5, 7); c.lineTo(-1, 11); c.stroke(); }
    else if (kind === 'like') { c.moveTo(0, 9); c.bezierCurveTo(-14, -1, -9, -13, 0, -5); c.bezierCurveTo(9, -13, 14, -1, 0, 9); c.closePath(); c.stroke(); }
    else if (kind === 'views') { [[-7, 4], [-1, -4], [5, 0]].forEach(([bx, top]) => { c.moveTo(bx, 9); c.lineTo(bx, top); }); c.stroke(); }
    else if (kind === 'bm') { c.moveTo(-7, -10); c.lineTo(7, -10); c.lineTo(7, 10); c.lineTo(0, 4); c.lineTo(-7, 10); c.closePath(); filled ? c.fill() : c.stroke(); }
    c.restore();
  }
  function xCard(c, t, x, y, w, imgs, { maxText = 4, showImage = true } = {}) {
    const pad = 22; let h = 0;
    const img = showImage && t.thumb ? imgs.get(t.thumb) : null;
    const imgH = img ? Math.round(w * 0.4) : 0;
    const title = t.articleTitle || '';
    const body = (t.isArticle ? (t.articlePreview || t.articleText.slice(0, 200)) : t.text.replace(/https?:\/\/t\.co\/\S+/g, '').trim()) || '';
    // 先量高度
    font(c, 800, 26, CN); const tl = title ? Math.min(2, wrap(c, title, w - pad * 2).length) : 0;
    font(c, 400, 23, CN); const bl = body ? Math.min(maxText, wrap(c, body, w - pad * 2).length) : 0;
    const badgeH = !img && t.isArticle ? 40 : 0;
    h = 70 + imgH + (img ? 16 : 0) + badgeH + tl * 34 + (tl ? 8 : 0) + bl * 32 + 62;
    // 卡片
    shadow(c, true, 22, 10, 0.35); fillRR(c, x, y, w, h, 18, C.xbg); shadow(c, false);
    c.strokeStyle = C.xline; c.lineWidth = 1.5; rrect(c, x, y, w, h, 18); c.stroke();
    // 作者行
    let cy = y + 46;
    avatarCircle(c, imgs.get(t._avatar), x + pad + 16, cy - 8, 16, t.username || 'X', '#000');
    fit(c, t.name || t.username, x + pad + 42, cy - 2, w - pad * 2 - 160, 21, 700, CN, C.xtext);
    const nw = c.measureText(t.name || t.username).width;
    fit(c, '@' + t.username, x + pad + 50 + nw, cy - 2, Math.max(40, w - pad * 2 - 60 - nw - 40), 19, 400, CN, C.xmuted);
    cy += 18;
    if (img) {
      c.save(); rrect(c, x + pad, cy, w - pad * 2, imgH, 14); c.clip(); cover(c, img, x + pad, cy, w - pad * 2, imgH); c.restore();
      if (t.isArticle) { fillRR(c, x + pad + 12, cy + imgH - 44, 118, 32, 6, 'rgba(0,0,0,0.72)'); text(c, '𝕏 Article', x + pad + 22, cy + imgH - 21, `700 18px ${CN}`, '#fff'); }
      cy += imgH + 16;
    } else if (t.isArticle) { fillRR(c, x + pad, cy, 118, 30, 6, '#16181C'); text(c, '𝕏 Article', x + pad + 10, cy + 21, `700 18px ${CN}`, '#fff'); cy += 40; }
    if (title) { cy += 26; cy += para(c, title, x + pad, cy, w - pad * 2, 34, 2, `800 26px ${CN}`, '#fff') - 26; cy += 8; }
    if (body) { cy += 30; cy += para(c, body, x + pad, cy, w - pad * 2, 32, maxText, `400 23px ${CN}`, C.xtext) - 30; }
    // 数据行
    const by = y + h - 30, step = (w - pad * 2) / 5;
    const nums = [['reply', t.replies], ['rt', t.retweets], ['like', t.likes], ['views', t.views]];
    nums.forEach(([k, v], i) => { icon(c, k, x + pad + 10 + i * step, by - 6, C.xmuted); if (v != null) text(c, fmt(v), x + pad + 28 + i * step, by, `400 19px ${CN}`, C.xmuted); });
    icon(c, 'bm', x + w - pad - 10, by - 6, C.xblue, true);
    return h;
  }

  // ---------- 页眉页脚 ----------
  function header(c, r, n, en, cn) {
    regMark(c, 36, 36); regMark(c, W - 36, 36); regMark(c, 36, H - 36); regMark(c, W - 36, H - 36);
    text(c, `THE BOOKMARK FILE · ${r.year}`, P, 78, `400 24px ${DISPLAY}`, C.muted);
    text(c, `${String(n).padStart(2, '0')} / 09`, W - P, 78, `400 24px ${DISPLAY}`, C.muted, 'right');
    c.fillStyle = C.ink; c.fillRect(P, 94, W - P * 2, 3);
    if (en) {
      fit(c, en, P, 196, W - P * 2, 92, 400, DISPLAY, C.ink);
      const ew = c.measureText(en).width;
      font(c, 800, 34, CN); const lw = c.measureText(cn || '').width + 24;
      if (cn && P + ew + 22 + lw <= W - P) label(c, cn, P + ew + 22, 120, { bg: C.blue, size: 34, pad: 12 });
      else if (cn) label(c, cn, P, 212, { bg: C.blue, size: 30, pad: 10 });
    }
  }
  function footer(c, r, opts) {
    c.fillStyle = C.ink; c.fillRect(P, H - 92, W - P * 2, 2);
    text(c, 'X BOOKMARKS RECAP', P, H - 56, `400 26px ${DISPLAY}`, C.ink);
    const who = opts.username ? `@${opts.username}` : '';
    font(c, 400, 26, DISPLAY); const bw = c.measureText('X BOOKMARKS RECAP').width;
    if (who) text(c, who, P + bw + 16, H - 57, `600 22px ${CN}`, C.muted);
    text(c, `生成你的 → ${SITE()}`, W - P, H - 57, `600 22px ${CN}`, C.ink, 'right');
  }
  const medal = ['🥇', '🥈', '🥉'];

  // ---------- 9 页 ----------
  const pages = [];

  // 01 封面
  pages.push(function cover1(c, r, o, imgs) {
    paper(c, 11);
    const pics = r.collage.map((t) => imgs.get(t.thumb)).filter(Boolean);
    const slots = [[-30, 120, 300, 230, -0.12], [300, 60, 260, 200, 0.06], [600, 110, 300, 230, -0.05], [860, 260, 260, 220, 0.1],
      [-60, 430, 260, 300, 0.08], [850, 560, 280, 240, -0.08], [-40, 900, 300, 240, -0.06], [820, 900, 300, 260, 0.07],
      [160, 1120, 300, 230, 0.05], [520, 1110, 320, 240, -0.07], [380, -60, 240, 200, -0.03], [-20, 1220, 220, 200, 0.12]];
    slots.forEach(([x, y, w, h, a], i) => { const img = pics[i % Math.max(1, pics.length)]; if (pics.length) photo(c, img, x, y, w, h, a, { border: 10, tone: [false, true, 'blue'][i % 3] }); });
    // 中央撕纸
    shadow(c, true, 24, 10, 0.3); torn(c, 150, 400, 780, 640, '#FBFAF6', 7, 10); shadow(c, false);
    tape(c, 260, 410, 180, -0.2); tape(c, 820, 1030, 200, -0.15);
    text(c, 'THE BOOKMARK FILE', 540, 500, `400 54px ${DISPLAY}`, C.ink, 'center');
    text(c, String(r.year), 540, 760, `400 280px ${DISPLAY}`, C.blue, 'center');
    text(c, 'recap.', 790, 812, `400 46px ${DISPLAY}`, C.ink, 'left');
    fit(c, 'X 收藏夹年度档案', 540, 880, 640, 56, 900, CN, C.ink, 'center');
    // 本人标签
    const av = imgs.get(o.avatar);
    avatarCircle(c, av, 270, 975, 46, o.name || o.username || 'X');
    if (o.name || o.username) {
      fit(c, o.name || '@' + o.username, 334, 968, 360, 34, 800, CN, C.ink);
      if (o.name && o.username) fit(c, '@' + o.username, 334, 1004, 360, 26, 500, CN, C.muted);
    }
    burst(c, 860, 360, 120, 96, 18, C.yellow, [[String(r.total), `400 64px ${DISPLAY}`], ['条收藏', `800 26px ${CN}`]], 0.18);
    stamp(c, 'CONFIDENTIAL', 760, 990, -0.14, C.red, 40);
    regMark(c, 36, 36); regMark(c, W - 36, 36); regMark(c, 36, H - 36); regMark(c, W - 36, H - 36);
    fillRR(c, 0, H - 96, W, 96, 0, C.ink);
    text(c, 'X BOOKMARKS RECAP', P, H - 38, `400 34px ${DISPLAY}`, '#fff');
    text(c, `生成你的 → ${SITE()}`, W - P, H - 40, `600 24px ${CN}`, '#fff', 'right');
  });

  // 02 案卷总览
  pages.push(function summary(c, r, o) {
    paper(c, 22); header(c, r, 2, 'FILE SUMMARY', '案卷总览');
    let y = 236;
    text(c, `${r.year} 年，我在 X 上一共收藏了`, P, y + 30, `700 34px ${CN}`, C.ink);
    text(c, String(r.total), P - 4, y + 260, `400 250px ${DISPLAY}`, C.blue);
    const tw = c.measureText(String(r.total)).width;
    text(c, '个内容', P + tw + 14, y + 256, `800 46px ${CN}`, C.ink);
    // 三类
    y += 300;
    const kinds = [['📝', '帖子', r.kinds.post], ['📰', '文章', r.kinds.article], ['🎬', '视频', r.kinds.video]];
    const kw = (W - P * 2 - 40) / 3;
    kinds.forEach(([e, l, v], i) => {
      const x = P + i * (kw + 20);
      shadow(c, true, 10, 5, 0.18); torn(c, x, y, kw, 120, i === 1 ? C.yellow : '#FBFAF6', 30 + i, 6, 'tb'); shadow(c, false);
      text(c, e, x + 22, y + 56, `400 36px ${CN}`, C.ink);
      text(c, l, x + 74, y + 54, `700 30px ${CN}`, C.ink);
      text(c, String(v), x + 22, y + 104, `400 46px ${DISPLAY}`, C.ink);
    });
    // 数字块
    y += 160;
    const books = Math.max(1, Math.round(r.chars / 100000));
    const blocks = [
      ['01', `${root.BW.fmtWords(r.chars)}字`, `相当于读完 ${books} 本书`],
      r.videoMinutes ? ['02', `${r.videoMinutes} 分钟`, '收藏的视频总时长'] : ['02', `${r.kinds.video} 条`, '收藏的视频'],
      ['03', fmt(r.totalViews), '这些内容的总浏览量'],
      ['04', fmt(r.globalBookmarks), '人次和我收藏了同样的内容'],
    ];
    const bw = (W - P * 2 - 20) / 2;
    blocks.forEach(([n, big, small], i) => {
      const x = P + (i % 2) * (bw + 20), by = y + Math.floor(i / 2) * 150;
      c.fillStyle = C.blue; c.fillRect(x, by, 56, 56); text(c, n, x + 28, by + 42, `400 32px ${DISPLAY}`, '#fff', 'center');
      fit(c, big, x + 74, by + 50, bw - 80, 56, 400, DISPLAY, C.ink);
      text(c, small, x + 74, by + 92, `500 24px ${CN}`, C.muted);
      c.fillStyle = C.line; c.fillRect(x, by + 124, bw, 2);
    });
    // 月度柱状
    y += 330;
    text(c, '收藏节奏', P, y, `800 30px ${CN}`, C.ink);
    text(c, `最疯的月份：${r.peakMonth + 1} 月 ${r.months[r.peakMonth]} 条${r.burstDay && r.burstDay.count >= 5 ? ` · 暴走日：${r.burstDay.day.split('-')[1]} 月 ${r.burstDay.day.split('-')[2]} 日 ≥${r.burstDay.count} 条` : ''}`, W - P, y, `600 22px ${CN}`, C.muted, 'right');
    const ch = 200, cy = y + 30 + ch, bw2 = (W - P * 2) / 12, mx = Math.max(...r.months, 1);
    r.months.forEach((m, i) => {
      const h = (m / mx) * ch; const x = P + i * bw2 + 6;
      c.fillStyle = i === r.peakMonth ? C.red : C.blue; c.fillRect(x, cy - h, bw2 - 12, Math.max(2, h));
      if (m) text(c, String(m), x + (bw2 - 12) / 2, cy - h - 8, `400 22px ${DISPLAY}`, C.ink, 'center');
      text(c, `${i + 1}月`, x + (bw2 - 12) / 2, cy + 30, `500 20px ${CN}`, C.muted, 'center');
    });
    footer(c, r, o);
  });

  // 03 人物档案
  pages.push(function profile(c, r, o, imgs) {
    paper(c, 33); header(c, r, 3, 'SUBJECT PROFILE', '人物档案');
    // 网点头像
    const av = imgs.get(o.avatar);
    const px = P, py = 250, ps = 440;
    shadow(c, true, 18, 8, 0.25); torn(c, px - 16, py - 16, ps + 32, ps + 32, '#FBFAF6', 41, 8); shadow(c, false);
    if (av) c.drawImage(halftone(av, ps, 8, C.blue), px, py);
    else { c.fillStyle = '#D9D3C7'; c.fillRect(px, py, ps, ps); text(c, '?', px + ps / 2, py + ps / 2 + 60, `400 200px ${DISPLAY}`, C.muted, 'center'); }
    tape(c, px + 60, py - 10, 160, -0.35); tape(c, px + ps - 40, py + ps + 6, 160, -0.3);
    // 档案字段
    const fx = px + ps + 50; let fy = 290;
    const fields = [['姓名', o.name || '—'], ['代号', o.username ? '@' + o.username : '—'], ['档案年份', String(r.year)], ['收藏数', `${r.total} 条`], ['主要领域', r.topics[0] ? r.topics[0].name : '—'], ['年度最爱', r.brands[0] ? r.brands[0].name : '—']];
    fields.forEach(([k, v]) => {
      text(c, k.toUpperCase(), fx, fy, `600 22px ${CN}`, C.muted);
      fit(c, v, fx, fy + 42, W - P - fx, 34, 800, CN, C.ink);
      c.fillStyle = C.line; c.fillRect(fx, fy + 58, W - P - fx, 2); fy += 78;
    });
    // 人格
    let y = 790;
    label(c, '我的收藏人格', P, y, { bg: C.ink, size: 30 });
    y += 150;
    fit(c, r.persona.name, P, y, W - P * 2, 130, 900, CN, C.blue);
    y += 34;
    // 引语框
    shadow(c, true, 12, 6, 0.18); torn(c, P, y, W - P * 2, 130, '#FBFAF6', 52, 6); shadow(c, false);
    text(c, '“', P + 18, y + 92, `400 120px ${DISPLAY}`, C.yellow);
    fit(c, r.persona.line, P + 96, y + 80, W - P * 2 - 130, 36, 700, CN, C.ink);
    // 徽章标签
    y += 190; let x = P;
    const tags = r.badges.filter((b) => b.brag).slice(0, 5);
    tags.forEach((b, i) => {
      font(c, 800, 30, CN); const w = c.measureText(b.name).width + 28;
      if (x + w > W - P) { x = P; y += 70; }
      label(c, b.name, x, y, { bg: i % 2 ? C.ink : C.blue, size: 30, angle: (i % 3 - 1) * 0.03 });
      x += w + 16;
    });
    footer(c, r, o);
  });

  // 04 关注领域
  pages.push(function topics(c, r, o) {
    paper(c, 44); header(c, r, 4, 'KEY TOPICS', '我最关注的领域');
    let y = 250;
    const tops = r.topics.slice(0, 5), max = tops[0] ? tops[0].count : 1;
    tops.forEach((t, i) => {
      const rowH = 168;
      c.fillStyle = i < 3 ? C.blue : C.ink; c.fillRect(P, y, 70, 70);
      text(c, String(i + 1), P + 35, y + 56, `400 52px ${DISPLAY}`, '#fff', 'center');
      if (medal[i]) text(c, medal[i], P + 86, y + 52, `400 40px ${CN}`, C.ink);
      const nx = P + (medal[i] ? 140 : 92);
      fit(c, t.name, nx, y + 52, 420, 44, 900, CN, C.ink);
      text(c, String(t.count), W - P - 50, y + 58, `400 64px ${DISPLAY}`, C.ink, 'right');
      text(c, '条', W - P, y + 56, `700 26px ${CN}`, C.ink, 'right');
      // 条
      c.fillStyle = '#DDD6C8'; c.fillRect(nx, y + 74, W - P - nx, 14);
      c.fillStyle = t.color; c.fillRect(nx, y + 74, (W - P - nx) * t.count / max, 14);
      // 代表作
      const picks = (r.topicPicks[t.id] || []).map((x) => r.titleOf(x)).filter(Boolean);
      if (picks[0]) para(c, `代表作：${picks[0]}`, nx, y + 122, W - P - nx, 30, 1, `500 23px ${CN}`, C.muted);
      c.fillStyle = C.line; c.fillRect(P, y + rowH - 14, W - P * 2, 2);
      y += rowH;
    });
    // 季度
    y += 20;
    text(c, '每个季度最关注', P, y + 10, `800 30px ${CN}`, C.ink);
    y += 34; const qw = (W - P * 2 - 30) / 4;
    r.quarters.forEach((q, i) => {
      const x = P + i * (qw + 10);
      torn(c, x, y, qw, 120, q.color || '#D9D3C7', 60 + i, 5, 'tb');
      text(c, `Q${q.q}`, x + 18, y + 46, `400 36px ${DISPLAY}`, '#fff');
      fit(c, q.name || '—', x + 18, y + 94, qw - 36, 28, 800, CN, '#fff');
    });
    footer(c, r, o);
  });

  // 05 证物墙
  pages.push(function evidence(c, r, o, imgs) {
    paper(c, 55); header(c, r, 5, 'EVIDENCE', '证物墙');
    const ev = r.evidence.slice(0, 4);
    const tags = (t) => {
      if (t === r.mostViral) return ['A', '最火的一条', t.views != null ? `${fmt(t.views)} 浏览` : `${fmt(t.likes)} 赞`];
      if (t === r.hiddenGem) return ['B', '最冷门的宝藏', t.views != null ? `只有 ${fmt(t.views)} 浏览` : `只有 ${t.likes} 赞`];
      if (t === r.longest) return ['C', '最长的一篇', `${root.BW.fmtWords(r.longestChars)}字`];
      return ['D', '年度第一条', `${t.savedAt.getMonth() + 1} 月 ${t.savedAt.getDate()} 日`];
    };
    const slots = [[P, 250, 450, -0.025, 3], [W - P - 450, 276, 450, 0.03, 3], [P + 10, 790, 450, 0.02, 2], [W - P - 450, 770, 450, -0.03, 2]];
    ev.forEach((t, i) => {
      const [x, y, w, a, mt] = slots[i];
      rotated(c, x + w / 2, y, a, () => {
        const h = xCard(c, t, -w / 2, 30, w, imgs, { maxText: mt });
        tape(c, -w / 2 + 6, 36, 110, -0.75); tape(c, w / 2 - 6, 36, 110, 0.75);
        const [L, name, val] = tags(t);
        label(c, `EXHIBIT ${L}`, -w / 2 - 6, -28, { bg: C.yellow, fg: C.ink, size: 24, fam: DISPLAY, weight: 400 });
        label(c, `${name} · ${val}`, -w / 2 + 146, -28, { bg: C.ink, size: 22 });
        void h;
      });
    });
    footer(c, r, o);
  });

  // 06 关系网
  pages.push(function network(c, r, o, imgs) {
    paper(c, 66); header(c, r, 6, 'NETWORK', '我收藏最多的作者');
    const cx = 540, cy = 640;
    const ppl = r.authors.slice(0, 5);
    const pos = [[220, 380], [860, 380], [160, 770], [920, 770], [540, 960]];
    // 红线先画
    ppl.forEach((a, i) => string(c, cx, cy, pos[i][0], pos[i][1] - 70));
    // 中心是我
    shadow(c, true, 14, 6, 0.25); avatarCircle(c, imgs.get(o.avatar), cx, cy, 92, o.name || o.username || '我'); shadow(c, false);
    label(c, o.username ? '@' + o.username : '我', cx - 70, cy + 104, { bg: C.blue, size: 28 });
    pin(c, cx, cy - 92);
    ppl.forEach((a, i) => {
      const [x, y] = pos[i];
      const img = imgs.get(r.avatars[a.username]);
      rotated(c, x, y, (i % 2 ? 1 : -1) * 0.05, () => {
        shadow(c, true, 14, 8, 0.25); c.fillStyle = '#FBFAF6'; c.fillRect(-100, -120, 200, 250); shadow(c, false);
        if (img) cover(c, duotone(img), -86, -106, 172, 172); else { c.fillStyle = '#D9D3C7'; c.fillRect(-86, -106, 172, 172); }
        fit(c, '@' + a.username, 0, 98, 176, 24, 800, CN, C.ink, 'center');
        text(c, `${a.count} 条`, 0, 124, `400 22px ${DISPLAY}`, C.red, 'center');
      });
      pin(c, x, y - 118);
      if (i < 3) text(c, medal[i], x + 76, y - 96, `400 40px ${CN}`, C.ink);
    });
    // 事实条
    let y = 1196;
    const ap = r.authorProfile;
    const facts = [[`${r.authorCount}`, '位作者被我收藏'], [r.notFollowed != null ? `${Math.round(r.notFollowed / r.total * 100)}%` : '—', '来自我没关注的人'], [ap ? fmt(ap.medianFollowers) : '—', '作者粉丝中位数']];
    const fw = (W - P * 2 - 40) / 3;
    facts.forEach(([big, small], i) => {
      const x = P + i * (fw + 20);
      text(c, big, x, y, `400 64px ${DISPLAY}`, C.blue); text(c, small, x, y + 40, `600 22px ${CN}`, C.ink);
    });
    if (ap && ap.cities.length) para(c, `作者分布：${ap.cities.slice(0, 5).map(([cc, k]) => `${cc} ${k}`).join(' · ')}`, P, y + 92, W - P * 2, 30, 1, `500 22px ${CN}`, C.muted);
    footer(c, r, o);
  });

  // 07 AI 移情别恋史
  pages.push(function timeline(c, r, o) {
    paper(c, 77); header(c, r, 7, 'AI LOVE TIMELINE', 'AI 移情别恋史');
    let y = 270;
    text(c, '每个月我收藏里出现最多的 AI', P, y, `600 26px ${CN}`, C.muted);
    // 时间轴
    y += 70; const x0 = P + 20, x1 = W - P - 20, mw = (x1 - x0) / 12;
    c.strokeStyle = C.ink; c.lineWidth = 4; c.beginPath(); c.moveTo(x0, y + 120); c.lineTo(x1, y + 120); c.stroke();
    for (let m = 0; m <= 12; m++) { c.fillStyle = C.ink; c.fillRect(x0 + m * mw - 1, y + 110, 3, 20); if (m < 12) text(c, `${m + 1}`, x0 + m * mw + mw / 2, y + 160, `400 26px ${DISPLAY}`, C.muted, 'center'); }
    r.brandEras.forEach((e, i) => {
      const ex = x0 + e.from * mw + 4, ew = (e.to - e.from + 1) * mw - 8;
      const up = i % 2 === 0;
      c.fillStyle = e.color; c.fillRect(ex, y + 100, ew, 20);
      const ly = up ? y + 10 : y + 200;
      c.strokeStyle = e.color; c.lineWidth = 2; c.beginPath(); c.moveTo(ex + ew / 2, up ? ly + 58 : ly); c.lineTo(ex + ew / 2, up ? y + 100 : y + 120); c.stroke();
      font(c, 400, 34, DISPLAY); const lw = Math.max(c.measureText(e.name).width + 24, 60);
      const lx = Math.min(Math.max(P, ex + ew / 2 - lw / 2), W - P - lw);
      c.fillStyle = C.ink; c.fillRect(lx, ly, lw, 54); text(c, e.name, lx + lw / 2, ly + 41, `400 34px ${DISPLAY}`, e.color === '#BBBBBB' || e.color === '#E0E0E0' ? '#fff' : e.color, 'center');
    });
    // 年度最爱
    y += 320;
    const fav = r.brands[0];
    if (fav) {
      shadow(c, true, 16, 8, 0.25); torn(c, P, y, W - P * 2, 250, C.blue, 88, 8); shadow(c, false);
      text(c, '我的年度最爱', P + 36, y + 64, `700 30px ${CN}`, '#fff');
      fit(c, fav.name, P + 36, y + 190, 560, 140, 400, DISPLAY, '#fff');
      text(c, `${fav.count} 次`, W - P - 40, y + 190, `400 80px ${DISPLAY}`, C.yellow, 'right');
      stamp(c, 'TRUE LOVE', W - P - 150, y + 60, 0.16, C.yellow, 36);
    }
    // 品牌榜
    y += 300;
    text(c, '品牌出现次数', P, y, `800 30px ${CN}`, C.ink);
    const list = r.brands.slice(0, 6), bmax = list[0] ? list[0].count : 1;
    list.forEach((b, i) => {
      const by = y + 30 + i * 56;
      fit(c, b.name, P, by + 32, 200, 30, 400, DISPLAY, C.ink);
      c.fillStyle = '#DDD6C8'; c.fillRect(P + 220, by + 12, W - P * 2 - 320, 24);
      c.fillStyle = i === 0 ? C.blue : C.ink; c.fillRect(P + 220, by + 12, (W - P * 2 - 320) * b.count / bmax, 24);
      text(c, String(b.count), W - P, by + 34, `400 32px ${DISPLAY}`, C.ink, 'right');
    });
    footer(c, r, o);
  });

  // 08 年度关键词（剪报拼字）
  pages.push(function keyword(c, r, o, imgs) {
    paper(c, 99); header(c, r, 8, 'KEYWORD OF THE YEAR', '年度关键词');
    const kw = r.keywords[0] ? r.keywords[0].word : '—';
    const chars = [...kw]; const rnd = rng(kw.length * 977 + 5);
    const fams = [DISPLAY, SERIF, CN, MONO];
    const bgs = ['#FBFAF6', C.yellow, C.ink, C.blue, '#FBFAF6', C.red];
    const size = Math.min(240, Math.floor((W - P * 2) / Math.max(chars.length, 1) * 1.05));
    let x = P + 10; const y = 430;
    const widths = chars.map((ch, i) => { const fam = fams[i % fams.length]; font(c, 900, size, fam); return c.measureText(ch).width + 36; });
    const total = widths.reduce((a, b) => a + b, 0) + (chars.length - 1) * 8;
    x = Math.max(P, (W - total) / 2);
    chars.forEach((ch, i) => {
      const fam = fams[i % fams.length], bg = bgs[i % bgs.length], fg = bg === C.ink || bg === C.blue || bg === C.red ? '#fff' : C.ink;
      const w = widths[i], h = size + 40, a = (rnd() - 0.5) * 0.18;
      rotated(c, x + w / 2, y, a, () => {
        shadow(c, true, 10, 6, 0.25); torn(c, -w / 2, -h / 2, w, h, bg, 200 + i, 6); shadow(c, false);
        font(c, 900, size, fam); c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch, 0, 8); c.textAlign = 'left'; c.textBaseline = 'alphabetic';
      });
      x += w + 8;
    });
    text(c, `出现在 ${r.keywords[0] ? r.keywords[0].count : 0} 条收藏里`, 540, 640, `700 34px ${CN}`, C.ink, 'center');
    // 其他关键词：剪下来的标签
    let ly = 690, lx = P; const others = r.keywords.slice(1, 9);
    others.forEach((k, i) => {
      const s = `${k.word}  ${k.count}`; const sz = 26 + Math.round(12 * k.count / (others[0] ? others[0].count : 1));
      font(c, 800, sz, CN); const w = c.measureText(s).width + 30;
      if (lx + w > W - P) { lx = P; ly += sz + 44; }
      label(c, s, lx, ly, { bg: i % 3 === 0 ? C.blue : i % 3 === 1 ? C.ink : '#FBFAF6', fg: i % 3 === 2 ? C.ink : '#fff', size: sz, angle: (rnd() - 0.5) * 0.08 });
      lx += w + 16;
    });
    // 含这个词的收藏
    const picks = r.keywordPicks || [];
    if (picks.length) {
      const top = ly + 100;
      text(c, `「${kw}」出现在这些收藏里`, P, top, `800 28px ${CN}`, C.ink);
      const cw = (W - P * 2 - 30) / 2;
      picks.forEach((t, i) => rotated(c, P + i * (cw + 30) + cw / 2, top + 30, (i ? 1 : -1) * 0.02, () => {
        xCard(c, t, -cw / 2, 0, cw, imgs, { maxText: 2, showImage: false });
        tape(c, 0, 0, 130, (i ? -1 : 1) * 0.08);
      }));
    }
    footer(c, r, o);
  });

  // 09 结案报告
  pages.push(function closing(c, r, o, imgs) {
    paper(c, 111); header(c, r, 9, 'CASE CLOSED', '结案报告');
    // 信纸：高度随文字
    const lx = P, ly = 236, lw = W - P * 2;
    font(c, 500, 31, CN); const lines = Math.min(7, wrap(c, r.summary, lw - 88).length);
    const lh = 140 + lines * 52 + 30;
    shadow(c, true, 20, 10, 0.25); torn(c, lx, ly, lw, lh, '#FBFAF6', 123, 7); shadow(c, false);
    c.strokeStyle = 'rgba(31,59,214,0.15)'; c.lineWidth = 2;
    for (let yy = ly + 120 + 52; yy < ly + lh - 20; yy += 52) { c.beginPath(); c.moveTo(lx + 40, yy - 38); c.lineTo(lx + lw - 40, yy - 38); c.stroke(); }
    text(c, `致 ${o.name || (o.username ? '@' + o.username : '你')}：`, lx + 44, ly + 84, `800 34px ${CN}`, C.ink);
    para(c, r.summary, lx + 44, ly + 150, lw - 88, 52, 7, `500 31px ${CN}`, C.ink);
    tape(c, lx + 90, ly + 6, 170, -0.3);
    // 档案摘要
    let y = ly + lh + 44;
    text(c, '档案摘要', P, y, `800 30px ${CN}`, C.ink);
    y += 24;
    const facts = [['收藏', `${r.total} 条`], ['收藏人格', r.persona.name], ['年度最爱', r.brands[0] ? r.brands[0].name : '—'], ['年度关键词', r.keywords[0] ? r.keywords[0].word : '—']];
    const fw = (W - P * 2 - 30) / 4;
    facts.forEach(([k, v], i) => {
      const x = P + i * (fw + 10);
      c.fillStyle = i % 2 ? C.ink : C.blue; c.fillRect(x, y, fw, 118);
      text(c, k, x + 18, y + 40, `600 22px ${CN}`, i % 2 ? C.yellow : '#C9D2FF');
      fit(c, v, x + 18, y + 92, fw - 36, 36, 900, CN, '#fff');
    });
    y += 160;
    // 2027 预言
    if (r.rising && r.rising.delta > 0.02) {
      shadow(c, true, 12, 6, 0.2); torn(c, P, y, W - P * 2, 190, C.yellow, 141, 6); shadow(c, false);
      text(c, `${r.year + 1} PREDICTION`, P + 32, y + 58, `400 40px ${DISPLAY}`, C.ink);
      fit(c, `明年我会更关注「${r.rising.name}」`, P + 32, y + 118, W - P * 2 - 64, 42, 900, CN, C.ink);
      text(c, `下半年它的占比比上半年涨了 ${Math.round(r.rising.delta * 100)} 个百分点`, P + 32, y + 160, `500 24px ${CN}`, '#5A4A10');
      y += 230;
    }
    // 签名 + 印章
    avatarCircle(c, imgs.get(o.avatar), P + 50, y + 54, 50, o.name || o.username || 'X', C.ink);
    text(c, o.name || '我', P + 120, y + 48, `800 34px ${CN}`, C.ink);
    text(c, `${r.year}.12 · 收藏档案归档`, P + 120, y + 88, `500 24px ${CN}`, C.muted);
    stamp(c, 'CASE CLOSED', 790, y + 50, -0.12, C.red, 64);
    // 链接块
    const by = H - 222;
    c.fillStyle = C.blue; c.fillRect(P, by, W - P * 2, 104);
    text(c, '生成你的收藏档案 →', P + 30, by + 64, `800 34px ${CN}`, '#fff');
    fit(c, SITE(), W - P - 30, by + 64, 520, 30, 700, CN, C.yellow, 'right');
    footer(c, r, o);
  });

  const TITLES = ['封面', '案卷总览', '人物档案', '关注领域', '证物墙', '关系网', 'AI 移情别恋史', '年度关键词', '结案报告'];

  // 预加载需要的图片，返回 Map(dataURI → Image)
  async function loadImages(r, o) {
    const srcs = new Set();
    if (o.avatar) srcs.add(o.avatar);
    r.collage.forEach((t) => srcs.add(t.thumb));
    r.evidence.forEach((t) => { if (t.thumb) srcs.add(t.thumb); t._avatar = r.avatars[t.username] || ''; if (t._avatar) srcs.add(t._avatar); });
    Object.values(r.avatars).forEach((a) => srcs.add(a));
    const map = new Map();
    await Promise.all([...srcs].filter((s) => /^data:image\//.test(s || '')).map((s) => new Promise((res) => {
      const im = new Image(); im.onload = () => { map.set(s, im); res(); }; im.onerror = res; im.src = s;
    })));
    return map;
  }
  let fontReady = null;
  function ensureFont() {
    if (!fontReady) fontReady = (async () => {
      try { const f = new FontFace('Anton', 'url(assets/fonts/Anton-Regular.ttf)'); await f.load(); document.fonts.add(f); }
      catch (e) { try { await document.fonts.load('400 40px Anton'); } catch (e2) { /* 退回系统字体 */ } }
    })();
    return fontReady;
  }
  function draw(canvas, i, r, o, imgs) {
    canvas.width = W; canvas.height = H;
    const c = canvas.getContext('2d'); c.textBaseline = 'alphabetic';
    pages[i](c, r, o, imgs);
  }

  root.BW_POSTERS = { draw, loadImages, ensureFont, count: pages.length, TITLES, W, H };
})(window);

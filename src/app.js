(function () {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const M = (i) => `${i + 1}月`;
  const { fmt, pct } = BW;
  let raw = null;
  // 个人资料：来自导出文件里的 me，也可以在卡片页手动改。只接受 data: 图片，避免加载外部资源。
  let profile = { name: '', username: '', avatar: '' };
  let avatarImg = null;
  function setAvatar(src) {
    profile.avatar = /^data:image\//.test(src || '') ? src : '';
    avatarImg = null;
    if (!profile.avatar) return Promise.resolve();
    return new Promise((res) => { const im = new Image(); im.onload = () => { avatarImg = im; res(); }; im.onerror = () => res(); im.src = profile.avatar; });
  }

  // ---------- 读取文件 ----------
  const drop = $('#drop');
  $('#file').addEventListener('change', (e) => e.target.files[0] && readFile(e.target.files[0]));
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => { e.preventDefault(); e.dataTransfer.files[0] && readFile(e.dataTransfer.files[0]); });

  $('#demo').addEventListener('click', async () => {
    try { load(await (await fetch('sample/bookmarks.sample.json')).json()); }
    catch (e) { showErr('示例数据加载失败：' + e.message); }
  });
  $('#back').addEventListener('click', () => { $('#report').hidden = true; $('#landing').hidden = false; });
  $('#year').addEventListener('change', (e) => render(+e.target.value));

  function readFile(f) {
    const fr = new FileReader();
    fr.onload = () => { try { load(JSON.parse(fr.result)); } catch (e) { showErr('读不懂这个文件：' + e.message); } };
    fr.readAsText(f);
  }
  function showErr(m) { const el = $('#err'); el.textContent = m; el.hidden = false; }
  async function load(data) {
    raw = data;
    const me = (data && !Array.isArray(data) && data.me) || {};
    profile = { name: String(me.name || '').slice(0, 30), username: String(me.username || '').replace(/^@/, '').slice(0, 30), avatar: '' };
    await setAvatar(me.avatar);
    $('#err').hidden = true;
    render();
  }

  // ---------- 小组件 ----------
  const slide = (eyebrow, body) => `<section class="slide"><p class="eyebrow">${eyebrow}</p>${body}</section>`;
  const stat = (big, label) => `<div class="stat"><b>${big}</b><span>${label}</span></div>`;
  const bars = (rows, max) => rows.map((t) => `
    <div class="topic-row"><div>${esc(t.name)}</div>
    <div class="track"><div class="fill" style="width:${Math.max(3, (t.count / max) * 100)}%;background:${t.color}"></div></div>
    <div class="n">${t.count}</div></div>`).join('');
  const note = (s) => `<p class="note">${s}</p>`;
  function tweetCard(t, r, label) {
    const body = (t.text.replace(/https?:\/\/t\.co\/\S+/g, '').trim() || t.articleText.split('\n')[0] || '（一条链接，点开看看）');
    return `<a class="tweet" href="${esc(r.tweetUrl(t))}" target="_blank" rel="noopener">
      <div class="meta">${label} · ${esc(t.name)} @${esc(t.username)}</div>
      <div class="body">${esc(body)}</div></a>`;
  }
  const dayLabel = (k) => { const [, m, d] = k.split('-'); return `${m} 月 ${d} 日`; };

  // 分享文案：short 用于 X（字数有限），完整版用于复制到小红书等平台
  function shareText(r, short) {
    const medals = ['🥇', '🥈', '🥉', '4.', '5.'];
    const books = Math.max(1, Math.round(r.chars / 100000));
    const L = [`我的${r.year} X收藏夹年度报告`, '',
      `${r.year}年我在X上一共收藏了 ${r.total} 个内容，其中📝 帖子 ${r.kinds.post} 条、📰 文章 ${r.kinds.article} 篇、🎬 视频 ${r.kinds.video} 条；约 ${BW.fmtWords(r.chars)} 字，相当于读完 ${books} 本书。`, '',
      `我的收藏人格：${r.persona.name}`, '',
      '我最关注的领域：', ...r.topics.slice(0, short ? 3 : 5).map((t, i) => `${medals[i]} ${t.name} ${t.count} 条`)];
    if (!short) {
      L.push('', '我收藏最多的作者：', ...r.authors.slice(0, 3).map((a, i) => `${i + 1}. @${a.username}（${a.count} 条）`));
      if (r.brands[0]) L.push('', `我的年度最爱：${r.brands[0].name}`);
      if (r.keywords[0]) L.push(`我的年度关键词：${r.keywords[0].word}`);
      L.push('', r.summary);
    }
    L.push('', `生成你的 👉 https://${BW_CARD.SITE}/`);
    return L.join('\n');
  }

  // ---------- 渲染 ----------
  function render(year) {
    let r;
    try { r = BW.analyze(raw, { year }); } catch (e) { showErr(e.message); return; }
    document.documentElement.style.setProperty('--accent', r.persona.color);
    $('#year').innerHTML = r.years.map((y) => `<option value="${y}" ${y === r.year ? 'selected' : ''}>${y} 年</option>`).join('');
    const S = [];
    const books = Math.max(1, Math.round(r.chars / 100000));

    // 封面
    S.push(`<section class="slide">
      ${profile.username || profile.name ? `<div class="me">${profile.avatar ? `<img src="${esc(profile.avatar)}" alt="">` : ''}<div><b>${esc(profile.name || '@' + profile.username)}</b>${profile.name && profile.username ? `<span>@${esc(profile.username)}</span>` : ''}</div></div>` : ''}
      <p class="eyebrow">${r.year} · 你的 X 收藏夹年报</p>
      <h2>这一年，你按下了</h2>
      <div class="big grad">${r.total}</div>
      <h2>次收藏</h2>
      <p>加起来约 <b>${BW.fmtWords(r.chars)}</b> 字，相当于 ${books} 本书。全部读完需要 ${r.readHours} 小时。</p>
      <div class="hint">往下滑 ↓</div></section>`);

    // 总量
    S.push(slide('总量', `
      <h2>如果收藏就等于学会，你今年读完了 ${books} 本书</h2>
      <div class="stats">
        ${stat(BW.fmtWords(r.chars), `字${r.charsEstimated ? '（含估算）' : ''}`)}
        ${stat(r.articleCount, '篇 X 长文')}
        ${stat(`${r.videoMinutes} 分钟`, `视频（${r.formats.video} 条）`)}
        ${r.totalViews != null ? stat(fmt(r.totalViews), '次：这些推文的总浏览量') : stat(r.formats.longPost, '条长推')}
      </div>
      ${r.charsEstimated ? note(`有 ${r.articleCount - r.articlesWithText} 篇长文没抓到全文，按每篇 3000 字估算。用 enrich 脚本补全后更准。`) : ''}`));

    // 节奏
    const maxM = Math.max(...r.months, 1);
    S.push(slide('收藏节奏', `
      <h2>${M(r.peakMonth)}，你收藏得最疯</h2>
      <p>那个月收藏了 ${r.months[r.peakMonth]} 条，占全年 ${pct(r.months[r.peakMonth] / r.total)}。${r.burstDay && r.burstDay.count >= 5 ? `最疯的一天是 ${dayLabel(r.burstDay.day)}，至少收藏了 ${r.burstDay.count} 条。` : ''}</p>
      <div class="months">${r.months.map((m, i) => `<div class="bar ${i === r.peakMonth ? 'peak' : ''}" style="height:${(m / maxM) * 100}%"><span>${m || ''}</span></div>`).join('')}</div>
      <div class="mlabels">${r.months.map((_, i) => `<div>${i + 1}</div>`).join('')}</div>
      ${note('X 不提供收藏时间。日期根据收藏顺序推算，是「最早可能」的收藏日。')}`));

    // 领域排序
    const top = r.topics[0];
    S.push(slide('内容领域排行', `
      <h2>${top ? `${esc(top.name)} 占了你 ${pct(top.share)} 的收藏` : '你的收藏五花八门'}</h2>
      <div>${bars(r.topics.slice(0, 8), top ? top.count : 1)}</div>
      <p class="sub">每个月最常收藏的领域</p>
      <div class="month-strip">${r.topicMonths.map((t, i) => `<div title="${t ? esc(t.name) : ''}" style="background:${t ? t.color : '#20202e'}"><span>${i + 1}</span></div>`).join('')}</div>
      ${note(`按每条收藏的主要领域统计。${r.untagged} 条没识别出领域。`)}`));

    // 品牌
    if (r.brands.length) {
      S.push(slide('AI 与工具', `
        <h2>今年你被 ${esc(r.brands[0].name)} 承包了</h2>
        <p>${esc(r.brands[0].name)} 在你的收藏里出现了 ${r.brands[0].count} 次。</p>
        <div>${bars(r.brands.slice(0, 8), r.brands[0].count)}</div>
        ${r.brandEras.length >= 2 ? `<p class="sub">你的 AI 移情别恋史</p>
        <div class="eras">${r.brandEras.map((e) => `<div class="era" style="--c:${e.color}"><b>${esc(e.name)}</b><span>${e.from === e.to ? M(e.from) : `${M(e.from)}–${M(e.to)}`}</span></div>`).join('<i>→</i>')}</div>` : ''}`));
    }

    // 年度作者
    S.push(slide('年度作者', `
      <h2>@${esc(r.authors[0].username)} 被你收藏了 ${r.authors[0].count} 次</h2>
      <p>今年你收藏了 ${r.authorCount} 位作者，其中 ${r.oneTimeAuthors} 位只收藏过一次${r.hasPrevYears ? `，${r.newAuthors} 位是今年新认识的` : ''}。</p>
      <ol class="authors">${r.authors.slice(0, 10).map((a) => `
        <li><span class="who"><a href="https://x.com/${encodeURIComponent(a.username)}" target="_blank" rel="noopener">${esc(a.name)}</a><small>@${esc(a.username)}</small></span><span class="muted">${a.count} 条</span></li>`).join('')}</ol>
      ${r.quoted.length ? note(`被你收藏的推文引用最多的人：${r.quoted.slice(0, 3).map(([u, c]) => `@${esc(u)}（${c} 次）`).join('、')}`) : ''}`));

    // 你和作者
    if (r.authorProfile) {
      const ap = r.authorProfile;
      S.push(slide('你和他们的关系', `
        <h2>${pct(r.notFollowed / r.total)} 的收藏，来自你没关注的人</h2>
        <p>${r.total} 条收藏里，你只顺手点赞了 ${r.liked} 条。</p>
        <div class="stats">
          ${stat(fmt(ap.medianFollowers), '作者粉丝中位数')}
          ${stat(ap.big, '位 10 万粉以上的大号')}
          ${stat(ap.small, '位 5000 粉以下的小号')}
          ${stat(ap.brandNewAccounts, `位今年才注册的新人`)}
        </div>
        ${ap.cities.length ? `<p class="sub">你的信息来自这些地方</p><div class="chips">${ap.cities.map(([c, k]) => `<span class="chip">${esc(c)} <small>${k}</small></span>`).join('')}</div>` : ''}
        ${ap.oldest ? note(`最老的作者账号：@${esc(ap.oldest.username)}，${ap.oldest.year} 年注册。`) : ''}`));
    }

    // 口味
    S.push(slide('你的口味', `
      <h2>最火的那条，和最冷门的宝藏</h2>
      ${tweetCard(r.mostViral, r, r.mostViral.views != null ? `🔥 ${fmt(r.mostViral.views)} 浏览` : `🔥 ${fmt(r.mostViral.likes)} 赞`)}
      ${tweetCard(r.hiddenGem, r, r.hiddenGem.views != null ? `💎 只有 ${fmt(r.hiddenGem.views)} 浏览` : `💎 只有 ${r.hiddenGem.likes} 赞`)}
      <div class="stats">
        ${stat(fmt(r.medianLikes), '收藏推文的点赞中位数')}
        ${r.saveRatio != null ? stat(`${r.saveRatio.toFixed(1)}×`, '全网收藏数 ÷ 点赞数（越高越「干货」）') : stat(fmt(r.medianViews), '浏览中位数')}
      </div>
      ${r.domains.length ? note(`外链最常去：${r.domains.slice(0, 4).map(([d, c]) => `${esc(d)}（${c}）`).join('、')}`) : ''}`));

    // 形式与语言
    const f = r.formats;
    S.push(slide('你爱收藏什么形式', `
      <h2>${f.article + f.longPost >= r.total * 0.3 ? '你偏爱长内容' : '你偏爱短平快'}</h2>
      <div class="stats three">
        ${stat(f.article, 'X 长文')}${stat(f.longPost, '长推')}${stat(f.quote, '引用推文')}
        ${stat(f.photo, '带图')}${stat(f.video, '带视频')}${stat(f.linkOnly, '只有一个链接')}
      </div>
      <p style="margin-top:16px">语言：中文 ${pct(r.cjk / r.total)} · 英文 ${pct(r.en / r.total)}</p>`));

    // 里程碑
    S.push(slide('里程碑', `
      <h2>今年的第一条，和最近的一条</h2>
      ${tweetCard(r.firstOfYear, r, `🌅 年度第一条（约 ${r.firstOfYear.savedAt.getMonth() + 1} 月 ${r.firstOfYear.savedAt.getDate()} 日）`)}
      ${tweetCard(r.latest, r, '🌙 最近一条')}
      ${r.dig.days > 30 ? `<p style="margin-top:12px">最「考古」的一条：发出至少 ${r.dig.days} 天后才被你收藏。</p>` : ''}`));

    // 关键词
    if (r.keywords.length) {
      const kmax = r.keywords[0].count;
      S.push(slide('年度关键词', `
        <h2>「${esc(r.keywords[0].word)}」是你的年度关键词</h2>
        <p>它出现在 ${r.keywords[0].count} 条收藏里。</p>
        <div class="cloud">${r.keywords.map((k, i) => `<span style="font-size:${16 + 30 * k.count / kmax}px;opacity:${0.5 + 0.5 * k.count / kmax};color:${i === 0 ? 'var(--accent)' : 'inherit'}">${esc(k.word)}</span>`).join('')}</div>`));
    }

    // 人格
    S.push(slide('你的收藏人格', `
      <div class="persona-name grad" style="background-image:linear-gradient(90deg, ${r.persona.color}, #FF4D8D)">${esc(r.persona.name)}</div>
      <p>${esc(r.persona.line)}</p>
      <p class="summary">${esc(r.summary)}</p>
      <div class="badges">${r.badges.map((b) => `<div class="badge ${b.brag ? '' : 'roast'}"><b>${esc(b.name)}</b><span>${esc(b.desc)}</span></div>`).join('')}</div>
      ${note('带虚线框的是「只给你自己看」的吐槽，不会出现在分享卡片上。')}`));

    // 分享卡
    S.push(slide('晒出来', `
      <h2>你的年度收藏卡片</h2>
      <div class="card-wrap">
        <div class="profile-edit">
          <label class="avatar-pick" title="换头像">${profile.avatar ? `<img id="av" src="${esc(profile.avatar)}" alt="">` : '<img id="av" alt="" hidden>'}<span>换头像</span><input id="avfile" type="file" accept="image/*" hidden></label>
          <input id="pname" class="name-input" maxlength="30" placeholder="名字" value="${esc(profile.name)}">
          <input id="phandle" class="name-input" maxlength="30" placeholder="@你的 X 用户名" value="${esc(profile.username ? '@' + profile.username : '')}">
        </div>
        <canvas id="card"></canvas>
        <div class="actions">
          <button id="dl" class="btn" type="button">下载图片</button>
          <button id="share" class="btn ghost" type="button">分享到 X</button>
          <button id="copy" class="btn ghost" type="button">复制完整文案</button>
        </div>
      </div>`));

    $('#slides').innerHTML = S.join('');
    $('#landing').hidden = true;
    $('#report').hidden = false;
    $('#report').scrollTop = 0;

    const canvas = $('#card');
    const redraw = () => BW_CARD.draw(canvas, r, { name: profile.name, username: profile.username, avatar: avatarImg });
    redraw();
    $('#pname').addEventListener('input', (e) => { profile.name = e.target.value.trim(); redraw(); });
    $('#phandle').addEventListener('input', (e) => { profile.username = e.target.value.trim().replace(/^@/, ''); redraw(); });
    $('#avfile').addEventListener('change', (e) => {
      const f = e.target.files[0]; if (!f) return;
      const fr = new FileReader();
      fr.onload = async () => { await setAvatar(fr.result); const av = $('#av'); av.src = profile.avatar; av.hidden = false; redraw(); };
      fr.readAsDataURL(f);
    });
    $('#dl').addEventListener('click', () => {
      const a = document.createElement('a');
      a.download = `xbookmark-yearlyreport-${r.year}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    });
    $('#copy').addEventListener('click', async (e) => {
      try { await navigator.clipboard.writeText(shareText(r, false)); e.target.textContent = '已复制 ✓'; }
      catch (err) { window.prompt('复制下面的文案：', shareText(r, false)); }
    });
    $('#share').addEventListener('click', () => {
      const text = shareText(r, true);
      window.open('https://x.com/intent/post?text=' + encodeURIComponent(text), '_blank', 'noopener');
    });
  }
})();

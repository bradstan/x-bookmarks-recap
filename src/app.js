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

  // ---------- 渲染：9 张档案海报 + 一图总结 ----------
  let current = null, imgs = new Map(), redrawTimer = null;
  async function render(year) {
    let r;
    try { r = BW.analyze(raw, { year }); } catch (e) { showErr(e.message); return; }
    current = r;
    $('#year').innerHTML = r.years.map((y) => `<option value="${y}" ${y === r.year ? 'selected' : ''}>${y} 年</option>`).join('');
    const n = BW_POSTERS.count;
    $('#slides').innerHTML = `
      <section class="toolbar">
        <div class="profile-edit">
          <label class="avatar-pick" title="换头像">${profile.avatar ? `<img id="av" src="${esc(profile.avatar)}" alt="">` : '<img id="av" alt="" hidden>'}<span>换头像</span><input id="avfile" type="file" accept="image/*" hidden></label>
          <input id="pname" class="name-input" maxlength="30" placeholder="名字" value="${esc(profile.name)}">
          <input id="phandle" class="name-input" maxlength="30" placeholder="@你的 X 用户名" value="${esc(profile.username ? '@' + profile.username : '')}">
        </div>
        <div class="actions">
          <button id="dlall" class="btn" type="button">下载全部 ${n + 1} 张</button>
          <button id="share" class="btn ghost" type="button">分享到 X</button>
          <button id="copy" class="btn ghost" type="button">复制完整文案</button>
        </div>
        <p class="note">共 ${n} 张档案海报 + 1 张一图总结，都是 1080×1440，适合小红书 9 宫格；发 X 可以选其中 4 张。</p>
      </section>
      <div class="posters">
        ${Array.from({ length: n }, (_, i) => `<figure class="poster"><canvas data-i="${i}"></canvas><figcaption><span>${String(i + 1).padStart(2, '0')} · ${BW_POSTERS.TITLES[i]}</span><button class="link-btn dl1" data-i="${i}" type="button">下载</button></figcaption></figure>`).join('')}
        <figure class="poster"><canvas id="card"></canvas><figcaption><span>10 · 一图总结</span><button class="link-btn dl1" data-i="card" type="button">下载</button></figcaption></figure>
      </div>`;
    $('#landing').hidden = true;
    $('#report').hidden = false;
    $('#report').scrollTop = 0;

    await BW_POSTERS.ensureFont();
    await drawAll();

    const later = () => { clearTimeout(redrawTimer); redrawTimer = setTimeout(drawAll, 250); };
    $('#pname').addEventListener('input', (e) => { profile.name = e.target.value.trim(); later(); });
    $('#phandle').addEventListener('input', (e) => { profile.username = e.target.value.trim().replace(/^@/, ''); later(); });
    $('#avfile').addEventListener('change', (e) => {
      const f = e.target.files[0]; if (!f) return;
      const fr = new FileReader();
      fr.onload = async () => { await setAvatar(fr.result); const av = $('#av'); av.src = profile.avatar; av.hidden = false; drawAll(); };
      fr.readAsDataURL(f);
    });
    const save = (canvas, name) => { const a = document.createElement('a'); a.download = name; a.href = canvas.toDataURL('image/png'); a.click(); };
    const fileName = (i) => `x-bookmarks-recap-${r.year}-${i === 'card' ? '10' : String(+i + 1).padStart(2, '0')}.png`;
    document.querySelectorAll('.dl1').forEach((b) => b.addEventListener('click', () => {
      const i = b.dataset.i; save(i === 'card' ? $('#card') : document.querySelector(`canvas[data-i="${i}"]`), fileName(i));
    }));
    $('#dlall').addEventListener('click', async () => {
      const list = [...document.querySelectorAll('.posters canvas')];
      for (const [k, cv] of list.entries()) { save(cv, fileName(cv.id === 'card' ? 'card' : k)); await new Promise((res) => setTimeout(res, 350)); }
    });
    $('#copy').addEventListener('click', async (e) => {
      try { await navigator.clipboard.writeText(shareText(r, false)); e.target.textContent = '已复制 ✓'; }
      catch (err) { window.prompt('复制下面的文案：', shareText(r, false)); }
    });
    $('#share').addEventListener('click', () => {
      window.open('https://x.com/intent/post?text=' + encodeURIComponent(shareText(r, true)), '_blank', 'noopener');
    });
  }

  async function drawAll() {
    const r = current; if (!r) return;
    const o = { name: profile.name, username: profile.username, avatar: profile.avatar };
    imgs = await BW_POSTERS.loadImages(r, o);
    document.querySelectorAll('.posters canvas[data-i]').forEach((cv) => BW_POSTERS.draw(cv, +cv.dataset.i, r, o, imgs));
    BW_CARD.draw($('#card'), r, { name: profile.name, username: profile.username, avatar: avatarImg });
  }
})();

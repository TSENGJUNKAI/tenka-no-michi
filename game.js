// 天下之道 — 遊戲引擎
(function () {
  const { FAC, PLAY, LOCKED, GENS, ALLIES, TREAS, SYN, B, SCRIPTED, EVENTS, WORLD, ENDINGS } = TD;
  const GEN = Object.fromEntries(GENS.map(g => [g.id, g]));
  const ALLY = Object.fromEntries(ALLIES.map(a => [a.id, a]));
  const TR = Object.fromEntries(TREAS.map(t => [t.id, t]));
  const COLORS = Object.fromEntries(Object.entries(FAC).map(([k, v]) => [k, v.color]));
  const MULTI = new Set(['storm', 'escape', 'saku', 'hold', 'shinpu', 'kuujo', 'kuruma', 'gyorin', 'yoshu', 'relief', 'iwabitsu', 'charge', 'komichi']);
  const MAX_GENS = 8, ROWS = 6;

  const $ = (s, r = document) => r.querySelector(s);
  const rnd = Math.random;
  const pick = a => a[Math.floor(rnd() * a.length)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { } }
  };
  const META_DEF = { seen: { gens: [], treas: [], ev: [], world: [], battles: [], syn: [] }, unlock: {}, runs: 0, clears: [] };
  let META = Object.assign({}, META_DEF, store.get('tenka.meta', {}));
  META.seen = Object.assign({}, META_DEF.seen, META.seen || {});
  const saveMeta = () => store.set('tenka.meta', META);
  const seen = (k, id) => { if (!META.seen[k].includes(id)) { META.seen[k].push(id); saveMeta(); } };

  let S = null;
  const saveRun = () => { if (S && !S.over) store.set('tenka.run', S); };

  // ───────── 年代 ─────────
  const CN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  const cnum = n => n === 1 ? '元' : n <= 10 ? CN[n] : n < 20 ? '十' + CN[n - 10] : CN[Math.floor(n / 10)] + '十' + (n % 10 ? CN[n % 10] : '');
  function era(y) {
    const yi = Math.floor(y);
    if (y < 1570.3) return '永祿' + cnum(yi - 1557) + '年';
    if (y < 1573.55) return '元龜' + cnum(yi - 1569) + '年';
    return '天正' + cnum(yi - 1572) + '年';
  }
  const RN = ['', '一', '二', '三'];
  const season = y => ['春', '夏', '秋', '冬'][Math.min(3, Math.floor((y - Math.floor(y)) * 4))];
  const yearLabel = y => `${era(y)}・${season(y)}`;

  // ───────── 狀態計算 ─────────
  const P = () => PLAY[S.fac];
  function leaderName() {
    const L = P().leaders;
    for (const l of L) {
      if (l.flag) { if (S.flags[l.flag]) return l.n; continue; }
      if (l.to === undefined || S.year < l.to) return l.n;
    }
    const f = L.find(l => l.flag); return f ? f.n : L[L.length - 1].n;
  }
  const provCount = () => Object.values(S.owners).filter(o => o === S.fac).length;
  const myProvs = () => Object.keys(S.owners).filter(k => S.owners[k] === S.fac);
  function activeSyn() {
    const camp = [S.fac, ...S.allies.map(a => ALLY[a].fac)];
    return SYN.filter(s => s.camp ? s.camp.every(f => camp.includes(f)) : s.req.filter(r => S.gens.includes(r)).length >= s.need);
  }
  function skills() {
    const list = [];
    S.gens.forEach(g => GEN[g].sk.forEach(k => list.push(k)));
    S.treas.forEach(t => TR[t].sk.forEach(k => list.push(k)));
    S.allies.forEach(a => list.push(ALLY[a].sk));
    activeSyn().forEach(s => s.sk.forEach(k => list.push(k)));
    (S.legacy || []).forEach(k => list.push(k));
    return list;
  }
  const bonus = t => skills().filter(k => k.t === t).reduce((a, k) => a + k.v, 0);
  const best = stat => S.gens.reduce((m, g) => Math.max(m, GEN[g][stat]), 40);
  const bestBy = fn => S.gens.slice().sort((a, b) => fn(GEN[b]) - fn(GEN[a]))[0];
  const canGun = () => S.fac === 'oda' || S.treas.includes('tanegashima') || bonus('gun') >= .12;

  const G = {
    get fac() { return S.fac; }, get S() { return S; },
    has: id => S.gens.includes(id), treas: id => S.treas.includes(id), flag: f => !!S.flags[f],
    ally: id => S.allies.includes(id), hasAlly: id => S.allies.includes(id),
    removeAlly(id) { S.allies = S.allies.filter(a => a !== id); },
    setOwn(ids, f, force) { ids.forEach(i => { if (force || S.owners[i] !== S.fac) S.owners[i] = f; }); },
    best, bonus
  };

  // ───────── 效果 ─────────
  const LBL = { troops: '兵力', gold: '金', pres: '威望', loy: '忠誠', gauge: '忍', income: '每回合收入' };
  function poolGens(rar) {
    return GENS.filter(g => !S.gens.includes(g.id) && !S.dead.includes(g.id) && S.year >= g.from && S.year < g.d - .02 && (!rar || rar.includes(g.r)));
  }
  function weightedGen(list) {
    if (!list.length) return null;
    const w = list.map(g => (g.r === 1 ? 5 : g.r === 2 ? 3.6 : 1.3) * (g.home === S.fac ? 2.4 : 1));
    let t = w.reduce((a, b) => a + b, 0) * rnd();
    for (let i = 0; i < list.length; i++) { t -= w[i]; if (t <= 0) return list[i]; }
    return list[list.length - 1];
  }
  function addGen(id, out) {
    const g = GEN[id]; if (!g || S.gens.includes(id)) return;
    if (S.gens.length >= MAX_GENS) { out.push({ t: `家臣團已滿，${g.n}無法加入`, c: 'dn' }); return; }
    S.gens.push(id); seen('gens', id); out.push({ t: `${g.n} 加入`, c: 'up' });
  }
  function eligibleAllies() {
    return ALLIES.filter(a => a.fac !== S.fac && !S.allies.includes(a.id) && S.year < a.d - .02 && !S.dead.includes(a.id));
  }
  function applyEff(eff) {
    const out = [];
    if (!eff) return out;
    const num = (k, v) => {
      if (!v) return;
      if (k === 'gauge' && S.fac !== 'tokugawa') return;
      S[k] = (S[k] || 0) + v;
      if (k === 'loy') S.loy = clamp(S.loy, 0, 100);
      if (k === 'gauge') S.gauge = clamp(S.gauge, 0, 100);
      if (k === 'gold' || k === 'troops' || k === 'pres') S[k] = Math.max(0, S[k]);
      out.push({ t: `${LBL[k]} ${v > 0 ? '+' : ''}${fmt(v)}`, c: v > 0 ? 'up' : 'dn' });
    };
    ['troops', 'gold', 'pres', 'loy', 'gauge'].forEach(k => num(k, eff[k]));
    if (eff.goldPerProv) num('gold', eff.goldPerProv * provCount());
    if (eff.income) { S.income += eff.income; out.push({ t: `每回合收入 +${eff.income}`, c: 'up' }); }
    if (eff.gen) {
      if (GEN[eff.gen]) addGen(eff.gen, out);
      else {
        const rar = eff.gen === 'r12' ? [1, 2] : eff.gen === 'r2' ? [2, 3] : [1, 2, 3];
        const g = weightedGen(poolGens(rar));
        if (g) addGen(g.id, out); else num('gold', 20);
      }
    }
    if (eff.treas && !S.treas.includes(eff.treas)) { S.treas.push(eff.treas); seen('treas', eff.treas); out.push({ t: `獲得名物「${TR[eff.treas].n}」`, c: 'up' }); }
    if (eff.ally) {
      let a = eff.ally === 'random' ? pick(eligibleAllies()) : ALLY[eff.ally];
      if (a && !S.allies.includes(a.id) && S.allies.length < 3) { S.allies.push(a.id); out.push({ t: `與${a.n}結盟`, c: 'up' }); }
      else if (eff.ally === 'random') num('gold', 20);
    }
    if (eff.flag) S.flags[eff.flag] = 1;
    if (eff.prov) { eff.prov.forEach(p => { if (S.owners[p] !== S.fac) { S.owners[p] = S.fac; out.push({ t: `取得${TMap.byId[p].n}`, c: 'up' }); } }); }
    return out;
  }
  function effPreview(eff) {
    if (!eff) return '';
    const parts = [];
    ['troops', 'gold', 'pres', 'loy', 'gauge'].forEach(k => { if (eff[k] && (k !== 'gauge' || S.fac === 'tokugawa')) parts.push(`${LBL[k]} ${eff[k] > 0 ? '+' : ''}${fmt(eff[k])}`); });
    if (eff.goldPerProv) parts.push(`金 +${eff.goldPerProv * provCount()}`);
    if (eff.income) parts.push(`收入 +${eff.income}/回合`);
    if (eff.gen) parts.push(GEN[eff.gen] ? `${GEN[eff.gen].n} 加入` : '新家臣加入');
    if (eff.treas) parts.push(`名物「${TR[eff.treas].n}」`);
    if (eff.ally) parts.push(eff.ally === 'random' ? '結成同盟' : `與${ALLY[eff.ally].n}結盟`);
    if (eff.prov) parts.push('取得' + eff.prov.map(p => TMap.byId[p].n).join('、'));
    return parts.join('　');
  }
  const fxHtml = list => list.length ? `<div class="fx">${list.map(x => `<span class="${x.c || ''}">${esc(x.t)}</span>`).join('')}</div>` : '';
  const histHtml = h => h ? `<div class="hist"><span class="tag">史實</span><p>${esc(h)}</p></div>` : '';

  // ───────── 介面工具 ─────────
  const screen = () => $('#screen');
  function toast(html) {
    const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = html;
    $('#toasts').appendChild(t); setTimeout(() => t.remove(), 4200);
  }
  function openModal(html) {
    const m = $('#modal'); m.hidden = false;
    m.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
    m.querySelector('.sheet').scrollTop = 0;
    return m;
  }
  const closeModal = () => { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; };
  function sceneHead(type, place, year) {
    return `<div class="scene-box">${TArt.scene(type || 'field')}${place ? `<span class="place">${esc(place)}</span>` : ''}${year ? `<span class="yr">${esc(year)}</span>` : ''}</div>`;
  }
  function placeName(loc) {
    if (!loc) return '';
    let best = null, bd = 1e9;
    TMap.PROV.forEach(p => { const d = Math.hypot(p.lon - loc[0], p.lat - loc[1]); if (d < bd) { bd = d; best = p; } });
    return best ? best.n : '';
  }
  function portrait(g, lg) {
    return `<div class="face${lg ? ' lg' : ''}" style="background:${FAC[g.home] ? FAC[g.home].color : '#777'}">${g.ch}</div>`;
  }
  const stars = r => '★'.repeat(r) + '<span style="opacity:.3">' + '★'.repeat(3 - r) + '</span>';
  const SKN = { atk: '強攻', amb: '奇襲', plot: '調略', gun: '鐵砲', def: '兵損', income: '收入', troops: '募兵', winpres: '勝利威望', wingold: '勝利金錢', loy: '忠誠', foresight: '看穿敵情', lowhp: '背水一戰', siege: '守城', escape: '撤退無損', risk: '謀反風險', tea: '茶道' };
  function skText(sk) {
    return sk.map(k => {
      if (['atk', 'amb', 'plot', 'gun'].includes(k.t)) return `${SKN[k.t]} ${k.v > 0 ? '+' : ''}${Math.round(k.v * 100)}%`;
      if (k.t === 'def') return `兵損 -${Math.round(k.v * 100)}%`;
      if (['income', 'troops', 'winpres', 'wingold'].includes(k.t)) return `${SKN[k.t]} +${k.v}`;
      if (k.t === 'loy') return `忠誠 ${k.v > 0 ? '+' : ''}${k.v}/回合`;
      if (k.t === 'risk') return '忠誠低於 60 時可能謀反';
      if (k.t === 'lowhp') return '兵力低於四成時成功率 +20%';
      if (k.t === 'siege') return '守城戰兵損 -20%';
      if (k.t === 'escape') return '撤退無損失';
      if (k.t === 'foresight') return '看穿敵情，成功率 +5%';
      if (k.t === 'tea') return '寺社效果 ×1.5';
      return SKN[k.t];
    }).join('，');
  }
  function lifeText(g) { return g.unk ? '生卒年不詳' : `${g.b}–${Math.floor(g.d)}`; }

  // ───────── 標題 ─────────
  let titleMap = null;
  function showTitle() {
    S = null;
    const save = store.get('tenka.run', null);
    screen().innerHTML = `
      <div class="title">
        <div class="title-left gutter">
          <h1 class="title-name">天下之道<span class="seal">戰國</span></h1>
          <div class="title-side">
            <div class="years">一五六〇 — 一五八二</div>
            <p>從桶狹間到本能寺，二十二年的亂世。選擇一個大名，在分岔的道路上做出抉擇、招攬名將、攻城略地。每一局都不一樣，但歷史會一直在旁邊提醒你：真正發生的是什麼。</p>
            <div class="title-actions">
              <button class="btn btn-shu" id="b-new">新的征途</button>
              ${save ? `<button class="btn" id="b-cont">繼續：${esc(PLAY[save.fac].lord.slice(0, 2))}家・${esc(yearLabel(save.year))}</button>` : ''}
              <button class="btn btn-ghost" id="b-codex">戰國圖鑑</button>
            </div>
            <p class="fine">史實說明依據通說整理；標註「傳說」「據說」者真偽未定。肉鴿模式中的武將會依真實年代登場與退場。</p>
          </div>
        </div>
        <div class="title-map"><svg id="tmap" role="img" aria-label="1560 年的日本勢力圖"></svg></div>
      </div>`;
    const svg = $('#tmap');
    titleMap = TMap.buildMap(svg, { id: 't' });
    const own = Object.fromEntries(TMap.PROV.map(p => [p.id, p.own]));
    titleMap.setOwners(own, COLORS, null);
    requestAnimationFrame(() => titleMap.setView([180, 280, 700, 640], false));
    $('#b-new').onclick = showSelect;
    if (save) $('#b-cont').onclick = () => { S = save; showRun(); resumeAfterLoad(); };
    $('#b-codex').onclick = () => showCodex(showTitle);
  }

  // ───────── 勢力選擇 ─────────
  function showSelect() {
    const ids = Object.keys(PLAY);
    let cur = 'oda';
    const isLocked = id => id === 'tokugawa' && !META.unlock.tokugawa;
    screen().innerHTML = `
      <div class="select">
        <div class="select-list gutter">
          <div class="select-head"><h2>選擇你的大名</h2><button class="btn btn-sm btn-ghost" id="b-back">← 返回</button></div>
          <div class="fcards" id="fcards"></div>
          <div class="fdetail" id="fdetail"></div>
        </div>
        <div class="select-map"><svg id="smap" role="img" aria-label="勢力位置"></svg><div class="map-caption" id="scap"></div></div>
      </div>`;
    const svg = $('#smap'); const m = TMap.buildMap(svg, { id: 's' });
    const own = Object.fromEntries(TMap.PROV.map(p => [p.id, p.own]));
    m.setOwners(own, COLORS, null);
    function render() {
      $('#fcards').innerHTML = ids.map(id => {
        const p = PLAY[id], lk = isLocked(id);
        return `<button class="fcard ${id === cur ? 'on' : ''} ${lk ? 'locked' : ''}" data-id="${id}" ${lk ? 'aria-disabled="true"' : ''}>
          <span class="crest" style="color:${FAC[id].color}">${TArt.crest(FAC[id].crest)}</span>
          <span class="fn">${FAC[id].n}家　${p.lord}</span>
          <span class="fl">${TMap.byId[p.home].n}・<span class="diff">${'◆'.repeat(p.diff)}${'◇'.repeat(5 - p.diff)}</span></span>
          <span class="fl">${lk ? '🔒 以織田家攻下稻葉山城（第一章）後開放' : esc(p.tag)}</span>
        </button>`;
      }).join('') + LOCKED.map(l => `<div class="fcard locked"><span class="crest" style="color:${FAC[l.id].color}">${TArt.crest(FAC[l.id].crest)}</span><span class="fn">${FAC[l.id].n}家　${l.lord}</span><span class="fl">${esc(l.tag)}</span><span class="fl">🔒 ${esc(l.how)}</span></div>`).join('');
      const p = PLAY[cur];
      $('#fdetail').innerHTML = `<div class="mech">特性：${p.mech}</div><p>${esc(p.mechd)}</p><p class="fine">起始：兵力 ${fmt(p.start.troops)}・金 ${p.start.gold}・家臣 ${p.gens.map(g => GEN[g].n).join('、')}</p>
        <div class="actions" style="justify-content:flex-start"><button class="btn btn-shu" id="b-go" ${isLocked(cur) ? 'disabled' : ''}>以${FAC[cur].n}家出陣</button></div>`;
      const mine = TMap.PROV.filter(x => x.own === cur).map(x => x.id);
      m.highlight(mine);
      m.marks([{ lon: TMap.byId[p.home].lon, lat: TMap.byId[p.home].lat, label: TMap.byId[p.home].n }]);
      m.setView(m.boxFor(mine, 260));
      $('#scap').innerHTML = `<b class="brush">${FAC[cur].n}家的位置</b><br>${esc(regionNote(cur))}`;
      document.querySelectorAll('#fcards .fcard[data-id]').forEach(b => b.onclick = () => { cur = b.dataset.id; render(); });
      $('#b-go').onclick = () => { if (!isLocked(cur)) newRun(cur); };
    }
    render();
    $('#b-back').onclick = showTitle;
  }
  function regionNote(f) {
    return {
      oda: '尾張（今愛知縣西部），濃尾平原上的富庶之地，東邊是今川家，北邊是美濃齋藤家。',
      tokugawa: '三河（今愛知縣東部），夾在西邊的織田與東邊的今川之間。1560 年時還是今川家的附庸。',
      takeda: '甲斐（今山梨縣）與信濃（今長野縣），群山環繞、沒有海。北邊越過川中島就是越後。',
      uesugi: '越後（今新潟縣），面向日本海的雪國，冬天大雪會封住山路。南邊越過山脈就是關東與信濃。'
    }[f];
  }

  // ───────── 新局 ─────────
  function newRun(fac) {
    const p = PLAY[fac];
    const owners = Object.fromEntries(TMap.PROV.map(x => [x.id, x.own]));
    S = {
      fac, year: p.prologue ? B[p.prologue].y : p.ch[0].from, ch: p.prologue ? -1 : 0,
      troops: p.start.troops, gold: p.start.gold, pres: p.start.pres, loy: p.start.loy, gauge: 0, income: 0,
      gens: p.gens.slice(), allies: [], treas: [], legacy: [], owners, flags: {}, dead: [], doneWorld: [], evDone: [],
      map: null, stats: { battles: 0, wins: 0, events: 0, startYear: 1560 }, over: false, pending: null
    };
    S.gens.forEach(g => seen('gens', g));
    META.runs++; saveMeta();
    showRun();
    const steps = [next => storyModal({ kicker: `${FAC[fac].n}家・序`, title: p.lord, scene: fac === 'uesugi' ? 'snow' : fac === 'takeda' ? 'mist' : 'castle', place: TMap.byId[p.home].n, year: yearLabel(S.year), text: p.intro, btn: '出陣' }, next)];
    if (p.prologue) {
      steps.push(next => battleStep(B[p.prologue], { boss: true, named: p.prologue }, next));
    }
    runQueue(steps, () => startChapter(0));
  }
  function startChapter(i) {
    const c = P().ch[i];
    S.ch = i; S.year = Math.max(S.year, c.from); S.map = genMap(); S.pending = null;
    saveRun(); refresh();
    runQueue([next => storyModal({ kicker: c.t.split('　')[0], title: c.t.split('　')[1], scene: B[c.boss].scene, place: '', year: yearLabel(S.year), text: c.intro, btn: '開始' }, next)], () => { saveRun(); refresh(); });
  }

  // ───────── 路線圖 ─────────
  const TYPES = [['battle', .3], ['event', .32], ['recruit', .1], ['shop', .1], ['temple', .1], ['diplo', .08]];
  const TICON = { battle: '戰', event: '事', recruit: '才', shop: '市', temple: '寺', diplo: '盟', boss: '決' };
  const TNAME = { battle: '合戰', event: '事件', recruit: '人才', shop: '城下町', temple: '寺社', diplo: '外交', boss: '決戰' };
  function wtype() { let t = rnd(); for (const [k, w] of TYPES) { t -= w; if (t <= 0) return k; } return 'event'; }
  function genMap() {
    const rows = [];
    for (let r = 0; r < ROWS; r++) {
      const n = r === 0 ? 3 : (rnd() < .3 ? 2 : 3);
      const types = r === 0 ? shuffle(['event', 'battle', 'recruit']) : Array.from({ length: n }, wtype);
      if (r === ROWS - 1 && !types.some(t => t === 'temple' || t === 'shop')) types[Math.floor(rnd() * n)] = 'temple';
      if (r > 0 && types.every(t => t === types[0]) && n > 1) types[0] = 'event';
      rows.push(types.map(t => ({ t, next: [] })));
    }
    rows.push([{ t: 'boss', next: [] }]);
    for (let r = 0; r < rows.length - 1; r++) {
      const A = rows[r], Bn = rows[r + 1];
      const x = (i, n) => (i + .5) / n;
      A.forEach((node, i) => {
        let bj = 0, bd = 9; Bn.forEach((_, j) => { const d = Math.abs(x(j, Bn.length) - x(i, A.length)); if (d < bd) { bd = d; bj = j; } });
        node.next.push(bj);
        if (Bn.length > 1 && rnd() < .5) { const alt = clamp(bj + (rnd() < .5 ? -1 : 1), 0, Bn.length - 1); if (!node.next.includes(alt)) node.next.push(alt); }
      });
      Bn.forEach((_, j) => {
        if (!A.some(n => n.next.includes(j))) {
          let bi = 0, bd = 9; A.forEach((_, i) => { const d = Math.abs(x(j, Bn.length) - x(i, A.length)); if (d < bd) { bd = d; bi = i; } });
          A[bi].next.push(j);
        }
      });
    }
    return { rows, pos: null, path: [] };
  }
  function rowYear(r) { const c = P().ch[S.ch]; return r >= ROWS ? c.to : c.from + (r + 1) * (c.to - c.from) / (ROWS + 1); }
  function availNodes() {
    if (!S.map || S.pending) return [];
    if (!S.map.pos) return S.map.rows[0].map((_, c) => [0, c]);
    const [r, c] = S.map.pos; if (r + 1 >= S.map.rows.length) return [];
    return S.map.rows[r][c].next.map(j => [r + 1, j]);
  }

  // ───────── 主畫面 ─────────
  let bigMap = null, runTab = 'route';
  function showRun() {
    screen().innerHTML = `
      <header class="bar gutter" id="bar"></header>
      <div class="run" id="run" data-tab="${runTab}">
        <section class="route panel" id="route" aria-label="行軍路線"></section>
        <section class="mapwrap" id="mapwrap" aria-label="天下形勢">
          <svg id="bigmap" role="img" aria-label="日本勢力圖"></svg>
          <div class="mapctl"><button class="btn" id="mv-home">本國周邊</button><button class="btn" id="mv-all">全日本</button></div>
          <div class="mapinfo" id="mapinfo"></div>
          <div class="ptip" id="ptip" hidden></div>
        </section>
        <section class="camp panel" id="camp" aria-label="家臣團"></section>
      </div>
      <nav class="tabs" id="tabs"><button data-t="route">路線</button><button data-t="map">天下</button><button data-t="camp">家臣</button></nav>`;
    bigMap = TMap.buildMap($('#bigmap'), { id: 'b' });
    bigMap.onClick((pid) => {
      const p = TMap.byId[pid], o = S.owners[pid];
      const tip = $('#ptip'), svg = $('#bigmap');
      const ctm = svg.getScreenCTM(); if (!ctm) return;
      const pt = svg.createSVGPoint(); pt.x = p.xy[0]; pt.y = p.xy[1];
      const sp = pt.matrixTransform(ctm), rect = $('#mapwrap').getBoundingClientRect();
      tip.hidden = false; tip.style.left = (sp.x - rect.left) + 'px'; tip.style.top = (sp.y - rect.top) + 'px';
      tip.innerHTML = `<b class="brush">${p.n}</b>　${FAC[o] ? FAC[o].n : ''}${o === S.fac ? '（你的領地）' : ''}`;
      clearTimeout(tip._t); tip._t = setTimeout(() => tip.hidden = true, 2600);
    });
    $('#mv-home').onclick = () => bigMap.setView(bigMap.boxFor(myProvs(), 200));
    $('#mv-all').onclick = () => bigMap.setView([0, 0, TMap.W, TMap.H]);
    document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => {
      const t = b.dataset.t;
      runTab = (t === 'camp' && runTab === 'camp' && window.innerWidth > 760) ? 'route' : t;
      $('#run').dataset.tab = runTab; markTabs();
      if (runTab === 'map') requestAnimationFrame(() => bigMap.setView(bigMap.boxFor(myProvs(), 200), false));
    });
    markTabs();
    refresh();
    requestAnimationFrame(() => bigMap.setView(bigMap.boxFor(myProvs(), 220), false));
  }
  function markTabs() { document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === runTab)); }
  let lastRes = {};
  function refresh() {
    if (!S || !$('#bar')) return;
    const p = P();
    const res = { troops: S.troops, gold: S.gold, pres: S.pres, loy: S.loy, gauge: S.gauge };
    $('#bar').innerHTML = `
      <div class="lord">${TArt.crest(FAC[S.fac].crest)}<div><b>${esc(leaderName())}</b><div class="era">${yearLabel(S.year)}<small>${Math.floor(S.year)} 年・領地 ${provCount()} 國</small></div></div></div>
      <div class="res num">
        <span class="chip" data-k="troops" title="兵力"><i>兵</i>${fmt(S.troops)}</span>
        <span class="chip" data-k="gold" title="金錢"><i>金</i>${fmt(S.gold)}</span>
        <span class="chip" data-k="pres" title="威望"><i>威</i>${fmt(S.pres)}</span>
        <span class="chip ${S.loy < 35 ? 'warn' : ''}" data-k="loy" title="家臣忠誠"><i>忠</i><span class="meter"><span style="width:${S.loy}%"></span></span>${S.loy}</span>
        ${S.fac === 'tokugawa' ? `<span class="chip" data-k="gauge" title="忍耐"><i>忍</i><span class="meter"><span style="width:${S.gauge}%"></span></span>${S.gauge}</span>` : ''}
      </div>
      <div class="tools"><button class="btn" id="b-cdx">圖鑑</button><button class="btn" id="b-menu">選單</button></div>`;
    Object.keys(res).forEach(k => { if (lastRes[k] !== undefined && lastRes[k] !== res[k]) { const c = $(`#bar .chip[data-k="${k}"]`); c && c.classList.add('flash'); } });
    lastRes = res;
    $('#b-cdx').onclick = () => { const keep = S; showCodex(() => { S = keep; showRun(); resumeAfterLoad(); }); };
    $('#b-menu').onclick = menuModal;
    renderRoute(); renderCamp(); renderMap();
  }
  function renderRoute() {
    const el = $('#route'); if (!el) return;
    if (!S.map) { el.innerHTML = `<div class="chap"><div class="k">序章</div><h3>${esc(P().lord)}</h3></div>`; return; }
    const c = P().ch[S.ch], rows = S.map.rows, H = 78, total = rows.length * H;
    const av = availNodes().map(([r, cc]) => r + ':' + cc);
    const xpos = (i, n) => (i + .5) / n * 100;
    let edges = '', nodes = '', lbls = '';
    rows.forEach((row, r) => {
      const y = r * H + H / 2;
      lbls += `<div class="rowlbl" style="top:${y}px">${Math.floor(rowYear(r))}<br>${season(rowYear(r))}</div>`;
      row.forEach((n, i) => {
        n.next.forEach(j => {
          const walked = S.map.path.some((p, k) => p[0] === r && p[1] === i && S.map.path[k + 1] && S.map.path[k + 1][0] === r + 1 && S.map.path[k + 1][1] === j);
          edges += `<line class="${walked ? 'walk' : ''}" x1="${xpos(i, row.length)}" y1="${y}" x2="${xpos(j, rows[r + 1].length)}" y2="${y + H}"/>`;
        });
        const done = S.map.path.some(p => p[0] === r && p[1] === i);
        const here = S.map.pos && S.map.pos[0] === r && S.map.pos[1] === i;
        const isAv = av.includes(r + ':' + i);
        const past = !done && S.map.pos && r <= S.map.pos[0];
        const bossName = n.t === 'boss' ? B[c.boss].n : '';
        nodes += `<button class="node t-${n.t} ${isAv ? 'avail' : ''} ${done ? 'done' : ''} ${here ? 'here' : ''} ${past ? 'past' : ''}" style="left:${xpos(i, row.length)}%;top:${y}px" data-r="${r}" data-c="${i}" ${isAv ? '' : 'tabindex="-1"'} aria-label="${TNAME[n.t]}${bossName ? '：' + bossName : ''}${isAv ? '（可前往）' : ''}">${TICON[n.t]}</button>`;
        if (bossName) nodes += `<span class="node-name" style="left:${xpos(i, row.length)}%;top:${y + 36}px">${esc(bossName)}</span>`;
      });
    });
    el.innerHTML = `<div class="chap"><div class="k">${esc(c.t.split('　')[0])}</div><h3>${esc(c.t.split('　')[1])}</h3></div>
      <div class="route-body"><div class="route-wrap" style="height:${total + 30}px">
        <svg class="edges" viewBox="0 0 100 ${total + 30}" preserveAspectRatio="none">${edges}</svg>${lbls}${nodes}</div></div>
      <div class="legend">${Object.keys(TICON).map(k => `<span><b>${TICON[k]}</b>${TNAME[k]}</span>`).join('')}</div>`;
    el.querySelectorAll('.node.avail').forEach(b => b.onclick = () => goNode(+b.dataset.r, +b.dataset.c));
  }
  function renderCamp() {
    const el = $('#camp'); if (!el) return;
    const syn = activeSyn().map(s => s.id);
    const relevant = SYN.filter(s => syn.includes(s.id) || (s.req && s.req.some(r => S.gens.includes(r))) || (s.camp && s.camp.includes(S.fac)));
    el.innerHTML = `
      <div class="sec-h"><h3>家臣團</h3><small>${S.gens.length} / ${MAX_GENS}</small></div>
      <div class="gens">${S.gens.length ? S.gens.map(id => genCard(GEN[id])).join('') : '<p class="empty">還沒有家臣。</p>'}</div>
      <div class="sec-h"><h3>同盟</h3><small>${S.allies.length} / 3</small></div>
      ${S.allies.length ? `<div class="mini-list">${S.allies.map(a => { const A = ALLY[a]; return `<div class="mini"><span style="color:${FAC[A.fac].color}">${TArt.crest(FAC[A.fac].crest)}</span><div><b>${A.n}</b><div class="sub">${skText([A.sk])}・卒於 ${Math.floor(A.d)}</div></div></div>`; }).join('')}</div>` : '<p class="empty">沒有盟友。外交節點或聯姻事件可以結盟。</p>'}
      <div class="sec-h"><h3>名物</h3><small>${S.treas.length}</small></div>
      ${S.treas.length ? `<div class="mini-list">${S.treas.map(t => `<div class="mini"><div><b>${TR[t].n}</b>　<span class="sub">${TR[t].k}</span><div class="sub">${skText(TR[t].sk)}</div></div></div>`).join('')}</div>` : '<p class="empty">尚未收藏名物。</p>'}
      <div class="sec-h"><h3>羈絆</h3><small>${syn.length} 組生效</small></div>
      ${relevant.length ? `<div class="mini-list">${relevant.map(s => `<div class="mini syn ${syn.includes(s.id) ? 'on' : ''}"><div><b>${s.n}</b>　<span class="sub">${s.req ? `${s.req.filter(r => S.gens.includes(r)).length}/${s.need}` : '同陣營'}</span><div class="sub">${s.req ? s.req.map(r => GEN[r].n).join('・') : '武田與上杉同在一方'}</div><div class="sub">${skText(s.sk)}</div></div></div>`).join('')}</div>` : '<p class="empty">集齊特定武將可觸發羈絆，例如「德川四天王」「兩兵衛」。</p>'}
      ${(S.legacy || []).length ? `<div class="sec-h"><h3>遺志</h3></div><p class="empty">${S.legacy.map(l => `${esc(l.from)}：${skText([l])}`).join('<br>')}</p>` : ''}`;
  }
  function genCard(g) {
    const age = Math.floor(S.year) - g.b;
    return `<div class="gcard r${g.r}">${portrait(g)}
      <div class="nm"><b>${g.n}</b><span class="stars">${stars(g.r)}</span><small>${g.unk ? '' : age + '歲・'}${lifeText(g)}</small></div>
      <div class="sk"><em>${g.skn}</em>　${skText(g.sk)}</div>
      <div class="stats">${[['武', g.w], ['智', g.c], ['政', g.a]].map(([k, v]) => `<div>${k}<span class="bar2"><span style="width:${v}%"></span></span>${v}</div>`).join('')}</div></div>`;
  }
  function renderMap() {
    if (!bigMap) return;
    bigMap.setOwners(S.owners, COLORS, S.fac);
    bigMap.highlight([]);
    const present = {}; Object.values(S.owners).forEach(o => present[o] = (present[o] || 0) + 1);
    const major = Object.keys(present).filter(f => f !== 'kokujin' && f !== 'ezo').sort((a, b) => (b === S.fac) - (a === S.fac) || present[b] - present[a]).slice(0, 9);
    $('#mapinfo').innerHTML = major.map(f => `<span class="${f === S.fac ? 'you' : ''}"><i style="background:${COLORS[f]}"></i>${FAC[f].n} ${present[f]}</span>`).join('') + `<span><i style="background:${COLORS.kokujin}"></i>國人眾</span>`;
  }
  function menuModal() {
    openModal(`<div class="sheet-body"><h2>選單</h2><p class="story">進度會在每個節點結束後自動存檔。</p>
      <div class="actions" style="justify-content:flex-start">
        <button class="btn" id="m-close">返回遊戲</button>
        <button class="btn" id="m-title">回到標題（保留存檔）</button>
        <button class="btn btn-shu" id="m-quit">放棄這一局</button></div></div>`);
    $('#m-close').onclick = closeModal;
    $('#m-title').onclick = () => { closeModal(); showTitle(); };
    $('#m-quit').onclick = () => { $('#m-quit').outerHTML = '<button class="btn btn-shu" id="m-quit2">確定放棄？存檔將刪除</button>'; $('#m-quit2').onclick = () => { store.del('tenka.run'); closeModal(); showTitle(); }; };
  }

  // ───────── 佇列 ─────────
  function runQueue(steps, done) {
    let i = 0;
    const next = () => {
      if (S && S.over) return;
      if (i >= steps.length) { closeModal(); done && done(); return; }
      const s = steps[i++]; s(next);
    };
    next();
  }
  function storyModal(o, next) {
    openModal(`${sceneHead(o.scene, o.place, o.year)}<div class="sheet-body">${o.kicker ? `<div class="kicker">${esc(o.kicker)}</div>` : ''}<h2>${esc(o.title)}</h2><p class="story">${esc(o.text)}</p>${o.fx ? fxHtml(o.fx) : ''}${histHtml(o.hist)}<div class="actions"><button class="btn btn-shu" id="m-ok">${esc(o.btn || '繼續')}</button></div></div>`);
    $('#m-ok').focus(); $('#m-ok').onclick = () => next();
  }

  // ───────── 時間流逝 ─────────
  function advanceTo(y) {
    const y0 = S.year; S.year = y;
    const steps = [];
    // 收入
    const n = provCount();
    const gold = Math.round((6 + n * 4 + bonus('income') + S.income) * (S.fac === 'oda' ? 1.4 : 1));
    const troops = Math.round(n * 220 + bonus('troops'));
    S.gold += gold; S.troops += troops; S.loy = clamp(S.loy + bonus('loy'), 0, 100);
    // 武將退場
    S.gens.slice().forEach(id => {
      const g = GEN[id];
      if (g.d < y && !(id === 'akechi' && y <= 1582.45)) {
        S.gens = S.gens.filter(x => x !== id); S.dead.push(id);
        const sk = g.sk.find(k => k.t !== 'risk');
        const leg = sk ? { t: sk.t, v: typeof sk.v === 'number' && sk.v < 1 ? Math.round(sk.v * 50) / 100 : Math.ceil(sk.v / 2), from: g.n } : null;
        if (leg && !['foresight', 'escape', 'siege', 'lowhp', 'tea'].includes(leg.t)) S.legacy.push(leg);
        steps.push(next => storyModal({ kicker: '訃報', title: `${g.n}　逝世`, scene: 'night', year: `${Math.floor(g.d)} 年`, text: `${g.n}離開了人世，享年${Math.floor(g.d) - g.b}歲。\n${g.bio}`, fx: [{ t: '威望 +5', c: 'up' }, ...(leg && S.legacy.includes(leg) ? [{ t: `遺志：${skText([leg])}`, c: 'up' }] : [])], btn: '合掌' }, () => { S.pres += 5; next(); }));
      }
    });
    S.allies.slice().forEach(id => { if (ALLY[id].d < y) { S.allies = S.allies.filter(x => x !== id); toast(`<b>${ALLY[id].n}</b> 逝世，同盟結束。`); } });
    // 謀反
    S.gens.slice().forEach(id => {
      const r = GEN[id].sk.find(k => k.t === 'risk');
      if (r && S.loy < 60 && rnd() < r.v) {
        steps.push(next => {
          S.gens = S.gens.filter(x => x !== id);
          const fx = applyEff({ troops: -Math.round(S.troops * .15), loy: -10 });
          storyModal({ kicker: '下剋上', title: `${GEN[id].n}謀反！`, scene: 'fire', year: yearLabel(S.year), text: `家中人心浮動，${GEN[id].n}帶著部下離開了你，投向了敵方。\n忠誠太低的時候，野心家就會蠢蠢欲動。`, fx, btn: '可惡' }, next);
        });
      }
    });
    // 新人登場
    const fresh = GENS.filter(g => g.from > y0 && g.from <= y && g.r >= 2 && !S.gens.includes(g.id));
    if (fresh.length) toast(`新人登場：${fresh.slice(0, 3).map(g => `<b>${g.n}</b>（${Math.floor(y) - g.b}歲）`).join('、')}　開始活躍了`);
    // 天下大事
    WORLD.filter(w => w.y > y0 && w.y <= y && !S.doneWorld.includes(w.id)).sort((a, b) => a.y - b.y).forEach(w => {
      steps.push(next => {
        S.doneWorld.push(w.id);
        const r = w.f(G);
        if (!r) return next();
        seen('world', w.id);
        if (r.battle) { const def = B[r.battle]; return battleStep(def, { named: r.battle }, next); }
        eventModal(Object.assign({ kicker: '天下大事', yearText: yearLabel(w.y) }, r), next);
      });
    });
    steps.unshift(next => { refresh(); next(); });
    return steps;
  }

  // ───────── 節點 ─────────
  function goNode(r, c) {
    S.map.pos = [r, c]; S.map.path.push([r, c]);
    const node = S.map.rows[r][c];
    S.pending = { r, c, t: node.t };
    const steps = advanceTo(rowYear(r));
    steps.push(next => nodeStep(node.t, next));
    saveRun();
    refresh();
    runQueue(steps, afterNode);
  }
  function resumeAfterLoad() {
    if (!S) return;
    if (S.pending && S.map) {
      const t = S.pending.t;
      runQueue([next => nodeStep(t, next)], afterNode);
    } else if (!S.map) { startChapter(Math.max(0, S.ch)); }
  }
  function afterNode() {
    const wasBoss = S.pending && S.pending.t === 'boss';
    S.pending = null;
    if (checkOver()) return;
    saveRun(); refresh();
    if (wasBoss) {
      if (S.ch === 0 && S.fac === 'oda' && !META.unlock.tokugawa) { META.unlock.tokugawa = 1; saveMeta(); toast('<b>德川家</b> 已開放！'); }
      if (S.ch < 2) startChapter(S.ch + 1);
      else ending('win');
    }
  }
  function checkOver() {
    if (S.troops <= 0) { ending('fall', '你的兵力耗盡，再也無法抵擋敵人的進攻。'); return true; }
    if (S.loy <= 0) { ending('fall', '家臣們對你失去了信心，群起叛變。你被自己的家臣逐出了城。'); return true; }
    return false;
  }
  function nodeStep(t, next) {
    if (t === 'battle') return battleStep(makeBattle(), {}, next);
    if (t === 'boss') { const id = P().ch[S.ch].boss; return councilModal(B[id], () => battleStep(B[id], { boss: true, named: id }, next)); }
    if (t === 'event') return randomEvent(next);
    if (t === 'recruit') return recruitModal(next);
    if (t === 'shop') return shopModal(next);
    if (t === 'temple') return templeModal(next);
    if (t === 'diplo') return diploModal(next);
    next();
  }

  // ───────── 事件 ─────────
  function randomEvent(next) {
    const list = EVENTS.filter(e => !S.evDone.includes(e.id) && (!e.y || (S.year >= e.y[0] && S.year <= e.y[1])) && (!e.facs || e.facs.includes(S.fac)) && (!e.need || e.need(G)));
    const e = list.length ? pick(list) : pick(EVENTS.filter(x => !x.facs && !x.need && !x.y));
    S.evDone.push(e.id); S.stats.events++; seen('ev', e.id);
    eventModal(Object.assign({ kicker: '事件', yearText: yearLabel(S.year) }, e), next);
  }
  function eventModal(e, next) {
    const gens = shuffle(S.gens);
    const text = (e.text || '').replace('{g1}', gens[0] ? GEN[gens[0]].n : '某家臣').replace('{g2}', gens[1] ? GEN[gens[1]].n : '另一位家臣');
    const place = e.loc ? placeName(e.loc) : '';
    const head = sceneHead(e.scene, place, e.yearText);
    const body = e.loc ? `<div class="with-mini"><p class="story">${esc(text)}</p><div class="mini-map">${TMap.miniMap(e.loc[0], e.loc[1], place)}</div></div>` : `<p class="story">${esc(text)}</p>`;
    if (!e.ch) {
      const fx = applyEff(e.eff);
      openModal(`${head}<div class="sheet-body"><div class="kicker">${esc(e.kicker)}</div><h2>${esc(e.t)}</h2>${body}${fxHtml(fx)}${histHtml(e.hist)}<div class="actions"><button class="btn btn-shu" id="m-ok">繼續</button></div></div>`);
      $('#m-ok').focus(); $('#m-ok').onclick = () => { refresh(); next(); };
      return;
    }
    const chs = e.ch.map((c, i) => {
      let dis = '', why = '';
      if (c.req && c.req.gold && S.gold < c.req.gold) { dis = 1; why = `需要 ${c.req.gold} 金`; }
      if (c.req && c.req.loyMin && S.loy < c.req.loyMin) { dis = 1; why = `需要忠誠 ${c.req.loyMin}`; }
      if (c.need && !c.need(G)) { dis = 1; why = '條件不符'; }
      if (c.tag === 'betray' && S.fac === 'uesugi') { dis = 1; why = '義：上杉家不做這種事'; }
      const pv = c.p !== undefined ? `成功率 ${Math.round((typeof c.p === 'function' ? c.p(G) : c.p) * 100)}%` : effPreview(c.eff);
      return `<button class="choice" data-i="${i}" ${dis ? 'disabled' : ''}><b>${esc(c.t)}</b><small>${esc(why || pv || '　')}</small></button>`;
    }).join('');
    openModal(`${head}<div class="sheet-body"><div class="kicker">${esc(e.kicker)}</div><h2>${esc(e.t)}</h2>${body}<div class="choices">${chs}</div></div>`);
    document.querySelectorAll('#modal .choice').forEach(b => b.onclick = () => {
      const c = e.ch[+b.dataset.i];
      let res = c;
      if (c.p !== undefined) { const p = typeof c.p === 'function' ? c.p(G) : c.p; res = rnd() < p ? c.ok : c.ng; }
      const fx = applyEff(res.eff);
      if (S.fac === 'tokugawa' && /忍耐|隱忍/.test(c.t)) S.gauge = clamp(S.gauge + 5, 0, 100);
      refresh();
      openModal(`${head}<div class="sheet-body"><div class="kicker">${esc(e.kicker)}</div><h2>${esc(e.t)}</h2><p class="story"><b class="brush">▸ ${esc(c.t)}</b>\n${esc(res.r || '')}</p>${fxHtml(fx)}${histHtml(e.hist)}<div class="actions"><button class="btn btn-shu" id="m-ok">繼續</button></div></div>`);
      $('#m-ok').focus(); $('#m-ok').onclick = () => next();
    });
  }

  // ───────── 招募・城下町・寺社・外交 ─────────
  function recruitModal(next) {
    const list = [];
    const pool = poolGens();
    for (let i = 0; i < 3 && pool.length; i++) { const g = weightedGen(pool.filter(x => !list.includes(x))); if (g) list.push(g); }
    const full = S.gens.length >= MAX_GENS;
    openModal(`${sceneHead('castle', '', yearLabel(S.year))}<div class="sheet-body"><div class="kicker">人才</div><h2>有志之士前來投效</h2>
      <p class="story">${full ? '家臣團已滿（最多 8 人）。請先在下方選擇一位家臣讓他離開，或放棄招募。' : '三位武士在城下求見。你只能留下其中一位。'}</p>
      <div class="pick3">${list.map(g => pcard(g, '', full)).join('')}</div>
      ${full ? `<div class="choices">${S.gens.map(id => `<button class="choice" data-dismiss="${id}"><b>讓 ${GEN[id].n} 離開</b><small>${skText(GEN[id].sk)}</small></button>`).join('')}</div>` : ''}
      <div class="actions"><button class="btn" id="m-skip">都不需要（威望 +3）</button></div></div>`);
    list.forEach(g => seen('gens', g.id));
    document.querySelectorAll('#modal .pcard').forEach(b => b.onclick = () => {
      const out = []; addGen(b.dataset.id, out); refresh();
      const g = GEN[b.dataset.id];
      openModal(`${sceneHead('castle', '', yearLabel(S.year))}<div class="sheet-body"><div class="kicker">新家臣</div><h2>${g.n}</h2><div class="with-mini"><p class="story">${esc(g.bio)}</p>${portrait(g, true)}</div>${fxHtml(out)}<div class="actions"><button class="btn btn-shu" id="m-ok">繼續</button></div></div>`);
      $('#m-ok').onclick = () => next();
    });
    document.querySelectorAll('#modal [data-dismiss]').forEach(b => b.onclick = () => { S.gens = S.gens.filter(x => x !== b.dataset.dismiss); refresh(); recruitModal(next); });
    $('#m-skip').onclick = () => { S.pres += 3; refresh(); next(); };
  }
  function pcard(g, price, dis) {
    const age = Math.floor(S.year) - g.b;
    return `<button class="pcard r${g.r}" data-id="${g.id}" ${dis ? 'disabled' : ''}>${portrait(g)}<b>${g.n}</b><span class="stars">${stars(g.r)}</span>
      <span class="age">${g.unk ? '生卒年不詳' : `${age} 歲・${lifeText(g)}`}</span>
      <span class="sk"><em>${g.skn}</em><br>${skText(g.sk)}</span>
      <span class="sk">武 ${g.w}・智 ${g.c}・政 ${g.a}</span>${price ? `<span class="price">${price} 金</span>` : ''}</button>`;
  }
  const PRICE = { 1: 35, 2: 70, 3: 130 };
  function shopModal(next) {
    const pool = poolGens();
    const sale = [];
    for (let i = 0; i < 2 && pool.length; i++) { const g = weightedGen(pool.filter(x => !sale.includes(x))); if (g) sale.push(g); }
    const tr = shuffle(TREAS.filter(t => !S.treas.includes(t.id)))[0];
    const draw = () => {
      const full = S.gens.length >= MAX_GENS;
      openModal(`${sceneHead('market', '', yearLabel(S.year))}<div class="sheet-body"><div class="kicker">城下町</div><h2>熱鬧的城下町</h2>
        <p class="story">商人、浪人、工匠聚集在這裡。你手上有 <b class="num">${fmt(S.gold)}</b> 金。</p>
        <div class="pick3">${sale.map(g => S.gens.includes(g.id) ? '' : pcard(g, PRICE[g.r], full || S.gold < PRICE[g.r])).join('')}</div>
        <div class="choices">
          ${tr && !S.treas.includes(tr.id) ? `<button class="choice" data-buy="tr" ${S.gold < 70 ? 'disabled' : ''}><b>名物「${tr.n}」（${tr.k}）・70 金</b><small>${skText(tr.sk)}</small></button>` : ''}
          <button class="choice" data-buy="troops" ${S.gold < 30 ? 'disabled' : ''}><b>募集足輕・30 金</b><small>兵力 +1,200</small></button>
          <button class="choice" data-buy="gift" ${S.gold < 25 ? 'disabled' : ''}><b>犒賞家臣・25 金</b><small>忠誠 +10</small></button>
        </div>
        <div class="actions"><button class="btn btn-shu" id="m-ok">離開</button></div></div>`);
      document.querySelectorAll('#modal .pcard').forEach(b => b.onclick = () => { const g = GEN[b.dataset.id]; S.gold -= PRICE[g.r]; addGen(g.id, []); toast(`<b>${g.n}</b> 加入了家臣團`); refresh(); draw(); });
      document.querySelectorAll('#modal [data-buy]').forEach(b => b.onclick = () => {
        const k = b.dataset.buy;
        if (k === 'tr') { S.gold -= 70; applyEff({ treas: tr.id }); toast(`獲得名物「<b>${tr.n}</b>」`); }
        if (k === 'troops') { S.gold -= 30; S.troops += 1200; }
        if (k === 'gift') { S.gold -= 25; S.loy = clamp(S.loy + 10, 0, 100); }
        refresh(); draw();
      });
      $('#m-ok').onclick = () => next();
    };
    sale.forEach(g => seen('gens', g.id));
    draw();
  }
  function templeModal(next) {
    const m = bonus('tea') ? 1.5 : 1;
    const opts = [
      { t: '休養生息', d: `兵力 +${fmt(Math.round(Math.max(800, S.troops * .2) * m))}`, eff: { troops: Math.round(Math.max(800, S.troops * .2) * m) } },
      { t: '祈願', d: `忠誠 +${Math.round(15 * m)}`, eff: { loy: Math.round(15 * m) } },
      { t: '參拜並捐獻', d: `威望 +${Math.round(10 * m)}`, eff: { pres: Math.round(10 * m) } }
    ];
    if (S.fac === 'tokugawa') opts.push({ t: '靜坐、忍耐', d: '忍 +25', eff: { gauge: 25 } });
    openModal(`${sceneHead('temple', '', yearLabel(S.year))}<div class="sheet-body"><div class="kicker">寺社</div><h2>古剎的鐘聲</h2>
      <p class="story">連年征戰之後，難得能停下腳步。${m > 1 ? '茶人的陪伴讓這段時光格外寧靜（效果 ×1.5）。' : ''}</p>
      <div class="choices">${opts.map((o, i) => `<button class="choice" data-i="${i}"><b>${o.t}</b><small>${o.d}</small></button>`).join('')}</div></div>`);
    document.querySelectorAll('#modal .choice').forEach(b => b.onclick = () => { applyEff(opts[+b.dataset.i].eff); refresh(); next(); });
  }
  function diploModal(next) {
    const cands = shuffle(eligibleAllies()).slice(0, 2);
    const p = clamp(.3 + S.pres / 400 + bonus('plot'), .1, .9);
    const p2 = clamp(.4 + bonus('plot'), .1, .9);
    const full = S.allies.length >= 3;
    openModal(`${sceneHead('court', '', yearLabel(S.year))}<div class="sheet-body"><div class="kicker">外交</div><h2>使者往來</h2>
      <p class="story">只能進行一項交涉。威望越高、家臣越擅長調略，交涉越容易成功。</p>
      <div class="choices">
        ${cands.map((a, i) => `<button class="choice" data-a="${a.id}" ${full || S.gold < 25 ? 'disabled' : ''}><b>與${FAC[a.fac].n}家的${a.n}結盟・25 金</b><small>${full ? '同盟已滿（最多 3 個）' : `成功率 ${Math.round(p * 100)}%・效果：${skText([a.sk])}`}</small></button>`).join('')}
        <button class="choice" data-x="turn" ${S.gold < 40 || S.gens.length >= MAX_GENS ? 'disabled' : ''}><b>策反敵方武將・40 金</b><small>成功率 ${Math.round(p2 * 100)}%・獲得一位名將</small></button>
        <button class="choice" data-x="gift"><b>向朝廷獻金・20 金</b><small>威望 +12</small></button>
      </div><div class="actions"><button class="btn" id="m-skip">不進行交涉</button></div></div>`);
    const result = (title, text, fx) => { refresh(); openModal(`${sceneHead('court', '', yearLabel(S.year))}<div class="sheet-body"><div class="kicker">外交</div><h2>${esc(title)}</h2><p class="story">${esc(text)}</p>${fxHtml(fx)}<div class="actions"><button class="btn btn-shu" id="m-ok">繼續</button></div></div>`); $('#m-ok').onclick = () => next(); };
    document.querySelectorAll('#modal [data-a]').forEach(b => b.onclick = () => {
      const a = ALLY[b.dataset.a]; S.gold -= 25;
      if (rnd() < p) result('同盟成立', `${a.n}接受了你的提議。`, applyEff({ ally: a.id }));
      else result('交涉失敗', `${a.n}婉拒了你的使者。`, [{ t: '金 -25', c: 'dn' }]);
    });
    $('#modal [data-x="turn"]').onclick = () => { S.gold -= 40; if (rnd() < p2) result('策反成功', '一位敵方武將帶著部下前來投效。', applyEff({ gen: 'r2' })); else result('策反失敗', '密使被識破，對方加強了戒備。', [{ t: '金 -40', c: 'dn' }]); };
    $('#modal [data-x="gift"]').onclick = () => { if (S.gold < 20) return; result('獻金', '朝廷對你的忠心表示讚許。', applyEff({ gold: -20, pres: 12 })); };
    $('#m-skip').onclick = () => next();
  }

  // 決戰前的軍議：把金錢換成兵力，並預告這一戰的特殊戰術
  function councilModal(def, go) {
    let buys = 0;
    const draw = () => {
      const cost = 30 + buys * 10;
      const tips = (def.specials || []).filter(sp => !sp.instant).map(sp => {
        const ok = !sp.req || sp.req(G);
        return `<li>${ok ? '' : '🔒 '}<b class="brush">${esc(sp.n)}</b>：${esc(sp.d || '')}</li>`;
      }).join('');
      openModal(`${sceneHead(def.scene, def.place, yearLabel(S.year))}<div class="sheet-body"><div class="kicker">軍議</div><h2>決戰前夜：${esc(def.n)}</h2>
        <p class="story">敵軍約 ${fmt(def.ft)} 人，由${esc(def.cmd)}率領。${def.local ? `這一戰你身邊只有約 ${def.local} 名隨從，大軍來不及趕到。` : `你目前有 ${fmt(S.troops)} 兵、${fmt(S.gold)} 金。`}\n這是一章的最後一戰，敗北就會結束這一局。</p>
        ${tips ? `<div class="fine">這一戰可用的特殊戰術：<ul style="margin:.3em 0 0;padding-left:1.2em">${tips}</ul></div>` : ''}
        <div class="choices">
          ${def.local ? '' : `<button class="choice" data-c="troops" ${S.gold < cost ? 'disabled' : ''}><b>動員足輕・${cost} 金</b><small>兵力 +1,200（可重複，每次多花 10 金）</small></button>`}
          <button class="choice" data-c="loy" ${S.gold < 25 || S.loy >= 100 ? 'disabled' : ''}><b>犒賞將士・25 金</b><small>忠誠 +10</small></button>
        </div>
        <div class="actions"><button class="btn btn-shu" id="m-ok">出陣</button></div></div>`);
      document.querySelectorAll('#modal [data-c]').forEach(b => b.onclick = () => {
        if (b.dataset.c === 'troops') { S.gold -= cost; S.troops += 1200; buys++; }
        else { S.gold -= 25; S.loy = clamp(S.loy + 10, 0, 100); }
        refresh(); draw();
      });
      $('#m-ok').onclick = go;
    };
    draw();
  }

  // ───────── 合戰 ─────────
  function frontier() {
    const mine = new Set(myProvs()), allyF = S.allies.map(a => ALLY[a].fac);
    const out = new Set();
    mine.forEach(p => TMap.NEI[p].forEach(n => { const o = S.owners[n]; if (o !== S.fac && !allyF.includes(o) && n !== 'ezo') out.add(n); }));
    return [...out];
  }
  function makeBattle() {
    const fr = frontier();
    const t = fr.length ? pick(fr) : pick(TMap.PROV.filter(p => S.owners[p.id] !== S.fac && p.id !== 'ezo')).id;
    const prov = TMap.byId[t], o = S.owners[t];
    const ep = Math.round((S.troops * .55 + 1500 + Math.max(0, S.ch) * 1800) * (.85 + rnd() * .35) / 100) * 100;
    return { n: `${prov.n}攻略`, place: prov.n, loc: [prov.lon, prov.lat], foe: o, cmd: `${FAC[o].n}家的部將`, ft: ep, ep, scene: pick(['field', 'castle', 'river', 'mist']), target: t,
      intro: `你的軍隊進入了${prov.n}。${FAC[o].n}家的軍隊已在前方布陣，旗幟在風中翻飛。`, specials: [] };
  }
  function battleStep(def, opt, next) {
    if (def.boss && (def === B.honnoji || def === B.iga) && S.gens.includes('akechi')) {
      S.gens = S.gens.filter(x => x !== 'akechi'); S.dead.push('akechi');
    }
    const st = { def, opt, bt: def.local || S.troops, hp: 100, round: 1, buff: S.flags.intel ? .1 : 0, used: {}, furin: false, furinUsed: false, burst: false, log: [] };
    st.bt0 = st.bt;
    if (S.flags.intel) { delete S.flags.intel; st.log.push({ c: 'sys', t: '忍者帶回了敵軍的情報（成功率 +10%）。' }); }
    S.stats.battles++;
    if (opt.named) seen('battles', opt.named);
    const intro = () => {
      const place = def.place || placeName(def.loc);
      openModal(`${sceneHead(def.scene, place, yearLabel(S.year))}<div class="sheet-body"><div class="kicker">${def.boss ? '決戰' : '合戰'}</div><h2>${esc(def.n)}</h2>
        <div class="with-mini"><p class="story">${esc(def.intro)}</p>${def.loc ? `<div class="mini-map">${TMap.miniMap(def.loc[0], def.loc[1], place)}</div>` : ''}</div>
        <p class="fine">敵軍：${esc(FAC[def.foe] ? FAC[def.foe].n : '')}・${esc(def.cmd)}・約 ${fmt(def.ft)} 人${def.local ? `　我方：隨從約 ${def.local} 人` : ''}${def.mode === 'survive' ? `　<b>勝利條件：${esc(def.survive || '撐過三回合')}</b>` : '　勝利條件：三回合內擊潰敵軍士氣'}</p>
        <div class="actions"><button class="btn btn-shu" id="m-ok">開戰</button></div></div>`);
      $('#m-ok').focus(); $('#m-ok').onclick = draw;
    };
    const tactics = () => {
      const nd = def.noDefault || [];
      const ratio = (st.bt * (1 + S.gens.reduce((a, g) => a + GEN[g].w, 0) / 900)) / (def.ep * (.4 + .6 * st.hp / 100));
      const l2 = Math.log2(Math.max(.05, ratio));
      st.dmul = clamp(1 + .2 * l2, .8, 1.5);
      const extra = () => st.buff + (st.furin ? .25 : 0) + (bonus('foresight') ? .05 : 0) + (bonus('lowhp') && st.bt < st.bt0 * .4 ? .2 : 0);
      const list = [];
      const lead = (fn) => { const id = bestBy(fn); return id ? GEN[id].n : ''; };
      if (!nd.includes('strike')) list.push({ id: 'strike', n: '強攻', d: `正面進攻${lead(g => g.w) ? '・由' + lead(g => g.w) + '率領' : ''}`, p: .4 + .2 * l2 + (best('w') - 60) / 250 + bonus('atk') + (S.fac === 'uesugi' ? .15 : 0) + ((def.penalty || {}).strike || 0), dmg: S.fac === 'takeda' ? 46 : 38, failLoss: 1.2 });
      if (!nd.includes('amb')) list.push({ id: 'amb', n: '奇襲', d: `繞道突襲，高風險${lead(g => g.c) ? '・由' + lead(g => g.c) + '指揮' : ''}`, p: .3 + .08 * l2 + (best('c') - 60) / 200 + bonus('amb'), dmg: 55, failLoss: 1.4 });
      if (!nd.includes('plot')) list.push({ id: 'plot', n: '調略', d: '勸降、離間；成功時兵損減半', p: .26 + (S.gens.reduce((m, g) => Math.max(m, (GEN[g].c + GEN[g].a) / 2), 40) - 60) / 220 + bonus('plot'), dmg: 30, lossMul: .5 });
      if (!nd.includes('gun') && canGun()) list.push({ id: 'gun', n: '鐵砲齊射', d: '每次花費 8 金', p: .58 + bonus('gun'), dmg: 40, cost: 8 });
      (def.specials || []).forEach(sp => {
        if (st.used[sp.id] && !MULTI.has(sp.id)) return;
        if (sp.rounds && !sp.rounds.includes(st.round)) return;
        if (sp.req && !sp.req(G)) return;
        list.push(Object.assign({ special: 1 }, sp, { p: sp.instant || sp.noAttack ? 1 : sp.p(G) }));
      });
      list.forEach(t => { if (!t.instant && !t.noAttack) t.p = st.burst ? 1 : clamp(t.p + extra(), .03, .97); });
      if (!def.boss && !nd.includes('retreat')) list.push({ id: 'retreat', n: '撤退', d: bonus('escape') ? '保全兵力（撤退無損）' : '放棄這場合戰，威望 -8', instant: 'retreat', p: 1 });
      return list;
    };
    const draw = () => {
      const roundText = def.roundText && def.roundText[st.round];
      const list = tactics();
      const ftNow = Math.round(def.ft * (.35 + .65 * st.hp / 100));
      openModal(`${sceneHead(def.scene, def.place || placeName(def.loc), `第${RN[st.round]}回合`)}<div class="sheet-body">
        <div class="armies">
          <div class="army"><b>${esc(leaderName())}</b><small>兵力 ${fmt(st.bt)} / ${fmt(st.bt0)}</small><div class="gauge"><span style="width:${clamp(st.bt / st.bt0 * 100, 0, 100)}%"></span></div></div>
          <div class="vs">對</div>
          <div class="army foe"><b>${esc(def.cmd)}</b><small>士氣 ${Math.max(0, Math.round(st.hp))}・${bonus('foresight') ? '' : '約 '}${fmt(ftNow)} 人</small><div class="gauge"><span style="width:${clamp(st.hp, 0, 100)}%"></span></div></div>
        </div>
        <div class="rounds">${[1, 2, 3].map(i => `<i class="${i < st.round ? 'done' : i === st.round ? 'on' : ''}">${RN[i]}</i>`).join('')}</div>
        ${roundText ? `<p class="story"><b class="brush">${esc(roundText)}</b></p>` : ''}
        ${st.log.length ? `<div class="blog" id="blog">${st.log.map(l => `<p class="${l.c}">${esc(l.t)}</p>`).join('')}</div>` : ''}
        <div class="power">
          ${S.fac === 'takeda' && !st.furinUsed ? `<button class="btn btn-sm ${st.furin ? 'armed' : ''}" id="pw-furin">風林火山 ${st.furin ? '（已發動：下一個戰術 +25%）' : '（每戰一次：下一個戰術 +25%）'}</button>` : ''}
          ${S.fac === 'tokugawa' && S.gauge >= 100 && !st.burst ? '<button class="btn btn-sm" id="pw-burst">忍耐爆發（忍 100）</button>' : ''}
          ${st.burst ? '<span class="fine">忍耐爆發：下一個戰術必定成功</span>' : ''}
        </div>
        <div class="tactics">${list.map((t, i) => `<button class="tac ${t.special ? 'special' : ''}" data-i="${i}" ${t.cost && S.gold < t.cost ? 'disabled' : ''}><b>${esc(t.n)}</b><span class="pct">${t.instant ? '' : Math.round(t.p * 100) + '%'}</span><small>${esc(t.d || '')}</small></button>`).join('')}</div>
      </div>`);
      const bl = $('#blog'); if (bl) bl.scrollTop = bl.scrollHeight;
      const fb = $('#pw-furin'); if (fb) fb.onclick = () => { st.furin = !st.furin; draw(); };
      const bb = $('#pw-burst'); if (bb) bb.onclick = () => { st.burst = true; S.gauge = 0; refresh(); draw(); };
      document.querySelectorAll('#modal .tac').forEach(b => b.onclick = () => act(list[+b.dataset.i]));
    };
    const loss = mul => {
      const ep = def.ep * (.4 + .6 * clamp(st.hp, 0, 100) / 100);
      let f = clamp(.05 + .07 * ep / Math.max(1, st.bt), .04, def.cap || .32) * (.85 + rnd() * .3);
      f *= 1 - Math.min(.5, bonus('def'));
      if (def.mode === 'survive' && bonus('siege')) f *= .8;
      return Math.max(def.local ? 1 : 10, Math.round(st.bt * f * mul));
    };
    const act = t => {
      if (t.instant === 'history') return end('history');
      if (t.instant === 'withdraw') { st.log.push({ c: 'sys', t: '你下令撤退。' }); return end('withdraw'); }
      if (t.instant === 'retreat') return end('retreat');
      st.used[t.id] = 1;
      if (t.cost) S.gold -= t.cost;
      let mul = 1, ok = true;
      if (t.noAttack) {
        st.buff += t.buff || 0; mul = .5;
        st.log.push({ c: 'ok', t: `${t.n}。${t.buff ? `之後的戰術成功率 +${Math.round(t.buff * 100)}%。` : ''}` });
      } else {
        ok = rnd() < t.p;
        if (ok) {
          const dmg = t.dmg >= 999 ? 999 : Math.round(t.dmg * (st.dmul || 1));
          st.hp -= dmg;
          mul = t.lossMul !== undefined ? t.lossMul : 1;
          st.log.push({ c: 'ok', t: `${t.n}成功！${dmg >= 999 ? '' : dmg ? `敵軍士氣 -${dmg}。` : ''}` });
          if (t.prov && S.owners[t.prov] !== S.fac) { S.owners[t.prov] = S.fac; st.log.push({ c: 'ok', t: `取得${TMap.byId[t.prov].n}。` }); }
        } else {
          mul = t.failLoss || 1;
          st.log.push({ c: 'ng', t: t.failText || `${t.n}失敗了。` });
          if (S.fac === 'tokugawa') S.gauge = clamp(S.gauge + 4, 0, 100);
        }
      }
      if (t.eff) applyEff(t.eff);
      if (st.furin && !t.noAttack) { st.furin = false; st.furinUsed = true; }
      if (st.burst && !t.noAttack) st.burst = false;
      if (st.hp <= 0) return end('win');
      const l = loss(mul);
      if (mul > 0) { st.bt = Math.max(0, st.bt - l); st.log.push({ c: 'sys', t: `我軍損失 ${fmt(l)} 人。` }); }
      else st.log.push({ c: 'sys', t: '敵軍沒有發動攻擊。' });
      if (st.bt <= st.bt0 * .15) return end('lose');
      st.round++;
      if (st.round > 3) {
        if (def.mode === 'survive') return end('win');
        st.narrow = st.hp <= 40;
        return end(st.hp <= 40 ? 'win' : 'lose');
      }
      refresh(); draw();
    };
    const end = res => {
      const fx = [];
      if (!def.local) S.troops = Math.max(0, Math.round(res === 'retreat' && bonus('escape') ? S.troops : res === 'retreat' ? st.bt * .95 : res === 'withdraw' ? Math.max(st.bt, S.troops) * .85 : st.bt));
      if (res === 'history') { S.over = true; closeModal(); return ending('history'); }
      let title, text, cls;
      if (res === 'win') {
        S.stats.wins++;
        title = st.narrow && st.hp > 0 ? '辛勝' : '勝利'; cls = 'win';
        const w = def.win || { t: `敵軍潰散了。${def.target ? TMap.byId[def.target].n + '落入你的手中。' : ''}`, eff: { gold: 25, pres: 5 } };
        text = w.t;
        const eff = Object.assign({}, w.eff);
        eff.pres = Math.round(((eff.pres || 0) + bonus('winpres')) * (S.fac === 'uesugi' ? 1.5 : 1));
        eff.gold = (eff.gold || 0) + bonus('wingold');
        if (w.prov) eff.prov = w.prov;
        if (def.target) eff.prov = [def.target];
        fx.push(...applyEff(eff));
        if (!def.boss && rnd() < .25) {
          const g = weightedGen(poolGens([1, 2]).filter(x => x.home === def.foe).concat(rnd() < .4 ? poolGens([1, 2]) : []));
          if (g && S.gens.length < MAX_GENS) { addGen(g.id, fx); text += `\n敵將${g.n}被你的氣度折服，前來投降。`; }
        }
      } else if (res === 'retreat' || res === 'withdraw') {
        title = '撤退'; cls = 'lose'; text = res === 'withdraw' ? '你聽從了老臣的勸告，保住了大半兵力。' : '你下令全軍撤退。';
        if (!(res === 'retreat' && bonus('escape'))) fx.push(...applyEff({ pres: res === 'withdraw' ? -5 : -8 }));
        if (S.fac === 'tokugawa') S.gauge = clamp(S.gauge + 8, 0, 100);
      } else {
        title = '敗北'; cls = 'lose'; text = def.lose || '你的軍隊潰敗了。';
        if (def.boss) { S.over = true; }
        else { fx.push(...applyEff({ pres: -8, gold: -10 })); if (S.fac === 'tokugawa') S.gauge = clamp(S.gauge + 12, 0, 100); }
      }
      refresh();
      openModal(`${sceneHead(def.scene, def.place || placeName(def.loc), yearLabel(S.year))}<div class="sheet-body"><div class="result-title ${cls}">${title}</div><h2>${esc(def.n)}</h2>
        <p class="story">${esc(text)}</p><p class="fine">剩餘兵力 ${fmt(st.bt)}${def.local ? '（隨從）' : ''}</p>${fxHtml(fx)}${histHtml(def.hist)}
        <div class="actions"><button class="btn btn-shu" id="m-ok">${S.over ? '……' : '繼續'}</button></div></div>`);
      $('#m-ok').focus();
      $('#m-ok').onclick = () => {
        if (S.over) { closeModal(); return def.loseEnding ? ending(def.loseEnding) : ending('fall', def.lose); }
        if (res === 'win' && def.win && def.win.next) { const sc = SCRIPTED[def.win.next]; return eventModal(Object.assign({ kicker: '抉擇', yearText: yearLabel(S.year) }, sc), next); }
        next();
      };
    };
    intro();
  }

  // ───────── 結局 ─────────
  function ending(kind, cause) {
    const fac = S.fac, E = ENDINGS[fac];
    S.over = true; store.del('tenka.run'); closeModal();
    const unlocks = [];
    if (kind === 'win' || kind === 'history') { if (!META.clears.includes(fac)) META.clears.push(fac); }
    if (fac === 'oda' && (kind === 'win' || kind === 'history' || S.ch >= 1) && !META.unlock.tokugawa) { META.unlock.tokugawa = 1; unlocks.push('德川家已開放'); }
    saveMeta();
    const big = kind === 'win' ? '改寫歷史' : kind === 'history' ? '如史實所載' : '家門滅亡';
    const text = kind === 'win' ? E.win : kind === 'history' ? E.history : (cause || '你的勢力滅亡了。');
    const years = Math.floor(S.year) - 1560;
    screen().innerHTML = `<div class="page gutter"><div class="ending">
      <div class="fine">${FAC[fac].n}家・${esc(leaderName())}・${yearLabel(S.year)}（${Math.floor(S.year)}）</div>
      <div class="big ${kind === 'win' ? 'win' : ''}">${big}</div>
      <p class="story">${esc(text)}</p>
      <div class="estats num"><div><b>${years}</b><small>年</small></div><div><b>${provCount()}</b><small>領地（國）</small></div><div><b>${S.stats.wins}/${S.stats.battles}</b><small>合戰勝場</small></div><div><b>${S.gens.length + S.dead.filter(d => GEN[d]).length}</b><small>麾下武將</small></div></div>
      ${histHtml(E.hist)}
      ${unlocks.map(u => `<div class="unlock">🔓 ${esc(u)}</div>`).join('')}
      <div class="actions" style="justify-content:flex-start"><button class="btn btn-shu" id="e-new">再戰一局</button><button class="btn" id="e-cdx">戰國圖鑑</button><button class="btn btn-ghost" id="e-title">回到標題</button></div>
    </div></div>`;
    $('#e-new').onclick = showSelect;
    $('#e-cdx').onclick = () => showCodex(showTitle);
    $('#e-title').onclick = showTitle;
  }

  // ───────── 圖鑑 ─────────
  function showCodex(back) {
    let tab = 'gens';
    const draw = () => {
      let body = '';
      if (tab === 'gens') {
        const sorted = GENS.slice().sort((a, b) => a.b - b.b);
        body = `<p class="fine">已遇見 ${META.seen.gens.length} / ${GENS.length} 位。依出生年排列——看看誰和誰是同一個時代的人。</p><div class="cgrid">${sorted.map(g => {
          const ok = META.seen.gens.includes(g.id);
          return ok ? `<div class="centry"><div class="hd">${portrait(g)}<div><h4>${g.n}　<span class="stars">${stars(g.r)}</span></h4><div class="yrs">${lifeText(g)}・${FAC[g.home].n}${g.home === 'kokujin' ? '' : '家'}・遊戲中 ${Math.floor(g.from)} 年起登場</div></div></div><p><b class="brush">${g.skn}</b>　${skText(g.sk)}</p><p>${esc(g.bio)}</p></div>`
            : `<div class="centry unseen"><div class="hd"><div class="face" style="background:var(--line)">？</div><div><h4>？？？</h4><div class="yrs">${lifeText(g)}</div></div></div><p>尚未遇見。</p></div>`;
        }).join('')}</div>`;
      } else if (tab === 'treas') {
        body = `<div class="cgrid">${TREAS.map(t => META.seen.treas.includes(t.id) ? `<div class="centry"><h4>${t.n}　<small class="fine">${t.k}</small></h4><p>${skText(t.sk)}</p><p>${esc(t.hist)}</p></div>` : `<div class="centry unseen"><h4>？？？</h4><p>${t.k}・尚未獲得</p></div>`).join('')}</div>`;
      } else if (tab === 'syn') {
        body = `<div class="cgrid">${SYN.map(s => `<div class="centry"><h4>${s.n}</h4><p>${s.req ? s.req.map(r => META.seen.gens.includes(r) ? GEN[r].n : '？？？').join('・') + `（需 ${s.need} 人）` : '武田與上杉同在一方'}</p><p>${skText(s.sk)}</p><p>${esc(s.hist)}</p></div>`).join('')}</div>`;
      } else if (tab === 'ev') {
        const all = EVENTS.filter(e => META.seen.ev.includes(e.id));
        body = all.length ? `<div class="cgrid">${all.map(e => `<div class="centry"><h4>${esc(e.t)}</h4><p>${esc(e.hist)}</p></div>`).join('')}</div>` : '<p class="fine">還沒有遇到任何事件。</p>';
      } else {
        const items = [];
        WORLD.forEach(w => items.push({ y: w.y, id: w.id, k: 'world', t: worldTitle(w) }));
        Object.entries(B).forEach(([id, b]) => { if (!items.some(i => i.t === b.n && Math.abs(i.y - b.y) < .2)) items.push({ y: b.y, id, k: 'battles', t: b.n, h: b.hist }); });
        items.sort((a, b) => a.y - b.y);
        body = `<p class="fine">點亮的項目代表你在遊戲中親身經歷過。紅點越多，你就越了解這段歷史。</p><div class="timeline">${items.map(i => {
          const ok = META.seen[i.k].includes(i.id) || (i.k === 'world' && META.seen.battles.some(b => B[b].n === i.t));
          return `<div class="tl ${ok ? 'seen' : ''}"><span class="y">${Math.floor(i.y)}</span><b>${esc(i.t)}</b>${ok && i.h ? `<p>${esc(i.h)}</p>` : ''}</div>`;
        }).join('')}</div>`;
      }
      screen().innerHTML = `<div class="page gutter"><div class="page-in">
        <div class="page-head"><h2>戰國圖鑑</h2><button class="btn btn-sm" id="c-back">← 返回</button></div>
        <div class="ctabs">${[['gens', '武將'], ['treas', '名物'], ['syn', '羈絆'], ['ev', '事件'], ['tl', '年表']].map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" data-t="${k}">${n}</button>`).join('')}</div>
        ${body}</div></div>`;
      document.querySelectorAll('.ctabs button').forEach(b => b.onclick = () => { tab = b.dataset.t; draw(); });
      $('#c-back').onclick = back;
    };
    draw();
  }
  const WTITLE = { w_okehazama: '桶狹間之戰', w_kanto: '長尾景虎繼承關東管領', w_kawanakajima: '第四次川中島之戰', w_kiyosu: '清洲同盟', w_ieyasu: '松平元康改名家康', w_tokugawa: '家康改姓德川', w_mino: '信長攻下美濃', w_oichi: '阿市嫁給淺井長政', w_joraku: '信長擁立足利義昭上洛', w_suruga: '武田、德川瓜分今川領', w_kanegasaki: '金崎之退口', w_anegawa: '姉川之戰', w_motonari: '毛利元就逝世', w_hieizan: '火燒比叡山', w_saijo: '信玄的西上作戰', w_mikata: '三方原之戰', w_shingen: '武田信玄病逝', w_bakufu: '室町幕府滅亡', w_asai: '淺井・朝倉滅亡', w_nagashino: '長篠之戰', w_azuchi: '安土城築城', w_matsunaga: '松永久秀與平蜘蛛', w_kenshin: '上杉謙信病逝・御館之亂', w_ishiyama: '石山合戰結束', w_koshu: '武田家滅亡' };
  const worldTitle = w => WTITLE[w.id] || w.id;

  showTitle();
})();

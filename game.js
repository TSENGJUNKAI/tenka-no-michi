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
  const RN = ['', '一', '二', '三', '四', '五'];
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
  // ───────── 武將成長 ─────────
  const LV_NEED = [0, 0, 4, 10, 18, 28];
  const LV_TITLE = ['', '新參', '侍大將', '部將', '宿老', '天下之士'];
  const lvOf = id => { const m = (S.merit || {})[id] || 0; let l = 1; for (let i = 2; i <= 5; i++) if (m >= LV_NEED[i]) l = i; return l; };
  const skMul = id => [1, 1, 1, 1.25, 1.25, 1.5][lvOf(id)];
  function stat(id, s) {
    const g = GEN[id], l = lvOf(id) - 1;
    const main = ['w', 'c', 'a'].reduce((a, k) => g[k] > g[a] ? k : a, 'w');
    return Math.min(120, g[s] + l * (s === main ? 3 : 1));
  }
  function gainMerit(id, n, out) {
    if (!id || !GEN[id] || !S.gens.includes(id)) return;
    S.merit = S.merit || {};
    const before = lvOf(id);
    S.merit[id] = (S.merit[id] || 0) + n;
    const after = lvOf(id);
    if (after > before) {
      const g = GEN[id];
      (out || S.lvq || (S.lvq = [])).push(id);
      TAudio.sfx('level');
      toast(`<div style="display:flex;gap:10px;align-items:center">${portrait(g, 'md')}<div><b>${g.n}</b> 晉升為「${LV_TITLE[after]}」！<br><span class="fine">${after === 3 ? '技能效果 ×1.25' : after === 5 ? '技能效果 ×1.5' : '能力提升'}</span></div></div>`);
    }
  }

  function skills() {
    const list = [];
    S.gens.forEach(g => { const m = skMul(g); GEN[g].sk.forEach(k => list.push(m === 1 || k.t === 'risk' || k.v === 1 ? k : { t: k.t, v: k.v < 1 ? Math.round(k.v * m * 100) / 100 : Math.round(k.v * m) })); });
    S.treas.forEach(t => TR[t].sk.forEach(k => list.push(k)));
    S.allies.forEach(a => list.push(ALLY[a].sk));
    activeSyn().forEach(s => s.sk.forEach(k => list.push(k)));
    (S.legacy || []).forEach(k => list.push(k));
    return list;
  }
  const bonus = t => skills().filter(k => k.t === t).reduce((a, k) => a + k.v, 0);
  const best = s => S.gens.reduce((m, g) => Math.max(m, stat(g, s)), 40);
  const bestBy = fn => S.gens.slice().sort((a, b) => fn(b) - fn(a))[0];
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
    return GENS.filter(g => !g.evOnly && !S.gens.includes(g.id) && !S.dead.includes(g.id) && S.year >= g.from && S.year < g.d - .02 && (!rar || rar.includes(g.r)));
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
      if (k === 'pres' && v > 0 && S.fac === 'imagawa') { const extra = Math.round(v * .5); S.pres += extra; v += extra; }
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
    if (eff.prov) { eff.prov.forEach(p => { if (S.owners[p] !== S.fac) { S.owners[p] = S.fac; (S.newProv = S.newProv || []).push(p); out.push({ t: `取得${TMap.byId[p].n}（今${TMap.byId[p].nowS}）`, c: 'up' }); } }); }
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
  function histHtml(h) {
    if (!h) return '';
    const k = h.indexOf('。');
    const first = k > 0 ? h.slice(0, k + 1) : h, rest = k > 0 ? h.slice(k + 1).trim() : '';
    return `<div class="hist"><span class="tag">史實</span><div><p>${esc(first)}</p>${rest ? `<details class="hist-more"><summary>讀下去</summary><p>${esc(rest)}</p></details>` : ''}</div></div>`;
  }

  // ───────── 對話：一句一句出現，有說話者時顯示肖像 ─────────
  const LEADER_PT = { oda: ['L_oda', 1534], tokugawa: ['L_tokugawa', 1543], takeda: ['L_takeda', 1521], uesugi: ['L_uesugi', 1530], hojo: ['L_hojo', 1515], imagawa: ['L_imagawa', 1519], mori: ['L_mori', 1497], chosokabe: ['L_chosokabe', 1539] };
  const leaderG = (fac = S.fac) => ({ id: LEADER_PT[fac][0], home: fac, b: LEADER_PT[fac][1] });
  function speakerOf(line) {
    const m = line.match(/^([^「：:，。！]{1,10}?)(?:衝了進來|稟報|說|回報|大喊|求見|跪在[^：:]*)?[：:]「/);
    if (!m) return null;
    const nm = m[1].replace(/們$/, '');
    const g = GENS.find(x => nm === x.n || (nm.length >= 2 && x.n.includes(nm)));
    if (g) return { g, n: g.n };
    return { g: { id: 'x_' + nm, home: 'kokujin', b: 1530 }, n: m[1] };
  }
  function lineHtml(ln) {
    const sp = speakerOf(ln);
    if (sp) return `<div class="tl-line say">${portrait(sp.g, 'md')}<div><b class="brush">${esc(sp.n)}</b><p>${esc(ln.slice(ln.indexOf('「')))}</p></div></div>`;
    return `<p class="tl-line nar">${esc(ln)}</p>`;
  }
  function talk(el, text, done) {
    if (!el) { if (done) done(); return; }
    const lines = String(text || '').split('\n').filter(x => x.trim());
    let n = Math.min(1, lines.length);
    const draw = () => {
      el.innerHTML = lines.slice(0, n).map(lineHtml).join('') + (n < lines.length ? '<div class="talk-ctl"><button class="talk-next" aria-label="下一句">▼</button><button class="talk-all">全部顯示</button></div>' : '');
      const nb = el.querySelector('.talk-next'), ab = el.querySelector('.talk-all');
      if (nb) nb.onclick = ev => { ev.stopPropagation(); n++; TAudio.sfx('page'); draw(); };
      if (ab) ab.onclick = ev => { ev.stopPropagation(); n = lines.length; draw(); };
      const all = el.querySelectorAll('.tl-line'); if (n > 1 && all.length) TFx.pop(all[all.length - 1]);
      if (n >= lines.length && done) { const d = done; done = null; d(); }
    };
    el.onclick = () => { if (n < lines.length) { n++; TAudio.sfx('page'); draw(); } };
    draw();
  }

  // ───────── 新手教學 ─────────
  const TUT = {
    map: [['#route', '這是本章的行軍路線。從上往下選一個節點前進，最下面的「決」是章末決戰。'], ['#bar .res', '兵力、金錢、威望、忠誠。忠誠歸零的話，家臣會背叛你。'], ['#mapwrap', '天下形勢圖。點任何一國，都能看到它今天的地名。']],
    target: [['#modal .selmap', '合戰前先選目標：地圖上標了數字的國，就是可以攻打的鄰國。'], ['#modal .choice.target', '每一國有地形和特產，攻下後特產就歸你。']],
    setup: [['#modal .forms', '先選陣形，它決定三路部隊的站位和強弱。'], ['#modal .bfsvg', '上方是敵軍，下方是我軍。旗子上的「騎、槍、砲」就是兵種。'], ['#modal .ctr-legend', '兵種相剋：鐵砲克騎馬、騎馬克長槍、長槍克鐵砲。'], ['#modal .bf-ctl3', '替每一路派大將、選兵種、分配兵力。兩軍之間出現綠色▲，代表那一路有利。'], ['#modal #bf-go', '準備好就開戰！']],
    round: [['#modal .bfsvg .sign-enemy', '敵軍旁的圖示是他們下一步的意圖：紅箭頭是突擊、柵欄是固守、硝煙是射擊，問號代表看不清楚。'], ['#modal .bf-ctl3', '替每一路下軍令：敵軍突擊時固守或誘敵，敵軍固守或射擊時就進攻。'], ['#modal .bf-ctl', '預備隊可以投入任何一路；計策每回合可以用一項。'], ['#modal #bf-go', '按下「下令」，三路同時交戰。擊潰敵軍兩路，或讓敵本陣士氣歸零就獲勝。']],
    storm: [['#modal .plan[data-k="sp:storm"]', '暴雨來了！史實上，信長正是趁這場暴雨突襲今川本陣。選這個計策，再按「下令」。']],
    lord: [['#camp .lords', '攻下的國可以派家臣當城主：政務高的人能增加收入，武勇高的人守城更穩。但城主不能上戰場。']]
  };
  function tutor(key) {
    if (META.tut === 'off') return;
    META.tutSeen = META.tutSeen || [];
    if (META.tutSeen.includes(key)) return;
    const steps = TUT[key].filter(([sel]) => { const el = document.querySelector(sel); return el && el.getBoundingClientRect().width > 0; });
    if (!steps.length) return;
    META.tutSeen.push(key); saveMeta();
    let i = 0;
    const box = document.createElement('div'); box.className = 'coach'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', '教學');
    document.body.appendChild(box);
    const show = () => {
      if (i >= steps.length) { box.remove(); return; }
      const [sel, text] = steps[i];
      const el = document.querySelector(sel);
      if (!el) { i++; return show(); }
      el.scrollIntoView({ block: 'center' });
      requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const below = r.bottom + 190 < innerHeight;
        box.innerHTML = `<div class="coach-hole" style="left:${r.left - 6}px;top:${r.top - 6}px;width:${r.width + 12}px;height:${r.height + 12}px"></div>
          <div class="coach-tip" style="left:${clamp(r.left + r.width / 2 - 160, 12, Math.max(12, innerWidth - 332))}px;top:${below ? r.bottom + 14 : Math.max(12, r.top - 170)}px">
            <p>${text}</p><div class="coach-act"><button class="btn btn-sm btn-ghost" id="co-skip">跳過教學</button><button class="btn btn-sm btn-shu" id="co-next">${i === steps.length - 1 ? '知道了' : '下一步'}（${i + 1}/${steps.length}）</button></div></div>`;
        box.querySelector('#co-next').onclick = () => { i++; show(); };
        box.querySelector('#co-skip').onclick = () => { META.tut = 'off'; saveMeta(); box.remove(); };
        box.querySelector('#co-next').focus();
      });
    };
    show();
  }

  // ───────── 介面工具 ─────────
  const screen = () => $('#screen');
  function toast(html) {
    const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = html;
    $('#toasts').appendChild(t); setTimeout(() => t.remove(), 4600);
  }
  function openModal(html, opt) {
    const m = $('#modal'); const fresh = m.hidden; m.hidden = false;
    m.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
    const sheet = m.querySelector('.sheet');
    if (!(opt && opt.keepScroll)) sheet.scrollTop = 0;
    if (fresh) TFx.modalIn(sheet); else if (!(opt && opt.quiet)) { TFx.contentSwap(sheet); TFx.sceneIn(sheet); }
    return m;
  }
  const closeModal = () => { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; };
  const seasonIdx = y => Math.min(3, Math.floor((y - Math.floor(y)) * 4));
  function sceneHead(type, place, year, opt) {
    type = type || 'field';
    const y = S ? S.year : 1560.5;
    const k = (Math.floor(y * 40) * 7 + type.length * 3) % 10;
    const time = type === 'night' ? 'night' : ['fire', 'tea', 'storm'].includes(type) ? 'day' : k < 7 ? 'day' : k < 9 ? 'dusk' : 'dawn';
    const o = Object.assign({ season: seasonIdx(y), time, seed: Math.floor(y * 4), our: S ? FAC[S.fac].color : undefined }, opt || {});
    return `<div class="scene-box">${TArt.scene(type, o)}${place ? `<span class="place">${esc(place)}</span>` : ''}${year ? `<span class="yr">${esc(year)}</span>` : ''}</div>`;
  }
  function provAt(loc) {
    if (!loc) return null;
    let best = null, bd = 1e9;
    TMap.PROV.forEach(p => { const d = Math.hypot(p.lon - loc[0], p.lat - loc[1]); if (d < bd) { bd = d; best = p; } });
    return best;
  }
  function placeName(loc) { const p = provAt(loc); return p ? `${p.n}（今${p.nowS}）` : ''; }
  function ageOf(g) { return S ? Math.floor(S.year) - g.b : Math.min(45, Math.floor(g.d) - g.b); }
  function portrait(g, size) {
    const color = FAC[g.home] ? FAC[g.home].color : '#777';
    return `<div class="face${size === true ? ' lg' : size ? ' ' + size : ''}">${TArt.portrait(g, ageOf(g), color)}</div>`;
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
          <h1 class="title-name">${[...'天下之道'].map(c => `<span class="ch">${c}</span>`).join('')}<span class="seal">戰國</span></h1>
          <div class="title-side">
            <div class="years">一五六〇 — 一五八二</div>
            <p>從桶狹間到本能寺，二十二年的亂世。選擇一個大名，在分岔的道路上做出抉擇、招攬名將、攻城略地。每一局都不一樣，但歷史會一直在旁邊提醒你：真正發生的是什麼。</p>
            <div class="title-actions">
              <button class="btn btn-shu" id="b-new">新的征途</button>
              ${save ? `<button class="btn" id="b-cont">繼續：${esc(PLAY[save.fac].lord.slice(0, 2))}家・${esc(yearLabel(save.year))}</button>` : ''}
              <button class="btn btn-ghost" id="b-codex">戰國圖鑑</button>
              <span class="toggles"><button class="btn btn-sm btn-ghost" id="b-snd"></button><button class="btn btn-sm btn-ghost" id="b-anim"></button></span>
            </div>
            <p class="fine" id="anim-note"></p>
            <p class="fine">史實說明依據通說整理；標註「傳說」「據說」者真偽未定。肉鴿模式中的武將會依真實年代登場與退場。</p>
          </div>
        </div>
        <div class="title-map"><svg id="tmap" role="img" aria-label="1560 年的日本勢力圖"></svg></div>
      </div>`;
    const svg = $('#tmap');
    titleMap = TMap.buildMap(svg, { id: 't', clouds: true });
    const own = Object.fromEntries(TMap.PROV.map(p => [p.id, p.own]));
    titleMap.setOwners(own, COLORS, null);
    requestAnimationFrame(() => { titleMap.setView([0, 0, TMap.W, TMap.H], false); titleMap.setView([180, 280, 700, 640]); });
    TFx.titleIntro(screen());
    bindAnimToggle($('#b-anim'), $('#anim-note'));
    bindSoundToggle($('#b-snd'));
    TAudio.play('calm');
    $('#b-new').onclick = showSelect;
    if (save) $('#b-cont').onclick = () => { S = save; showRun(); resumeAfterLoad(); };
    $('#b-codex').onclick = () => showCodex(showTitle);
  }

  function bindSoundToggle(btn, short) {
    const draw = () => { btn.textContent = short ? (TAudio.isOn() ? '♪ 開' : '♪ 關') : `音樂：${TAudio.isOn() ? '開' : '關'}（點擊切換）`; btn.setAttribute('aria-pressed', String(TAudio.isOn())); btn.title = '背景音樂與音效'; };
    draw();
    btn.onclick = () => { TAudio.setOn(!TAudio.isOn()); draw(); };
  }
  const ANIM_LABEL = { auto: '動畫：自動', on: '動畫：開', off: '動畫：關' };
  function bindAnimToggle(btn, note) {
    const draw = () => {
      btn.textContent = ANIM_LABEL[TFx.getMode()] + '（點擊切換）';
      if (note) note.textContent = TFx.getMode() === 'auto' && TFx.reduce() ? '你的系統開啟了「減少動態效果」，所以動畫目前是關閉的。想看動畫，可以把這裡切到「開」。' : '';
    };
    draw();
    btn.onclick = () => { const order = ['auto', 'on', 'off']; TFx.setMode(order[(order.indexOf(TFx.getMode()) + 1) % 3]); draw(); };
  }

  // ───────── 勢力選擇 ─────────
  function showSelect() {
    const ids = Object.keys(PLAY);
    let cur = 'oda';
    const isLocked = id => !!PLAY[id].unlock && !META.unlock[id];
    let diff = store.get('tenka.diff', 'normal');
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
          <span class="fl">${lk ? '🔒 ' + esc(p.unlock) : esc(p.tag)}</span>
        </button>`;
      }).join('');
      const p = PLAY[cur];
      $('#fdetail').innerHTML = `<div class="mech">特性：${p.mech}</div><p>${esc(p.mechd)}</p><p class="fine">起始：兵力 ${fmt(p.start.troops)}・金 ${p.start.gold}・家臣 ${p.gens.map(g => GEN[g].n).join('、')}</p>
        <div class="diffs" role="group" aria-label="難度">${[['easy', '初陣', '敵軍較弱'], ['normal', '尋常', '標準難度'], ['hard', '修羅', '敵軍強大']].map(([k, n, t]) => `<button class="diffb ${diff === k ? 'on' : ''}" data-d="${k}" title="${t}">${n}</button>`).join('')}</div>
        <div class="actions" style="justify-content:flex-start"><button class="btn btn-shu" id="b-go" ${isLocked(cur) ? 'disabled' : ''}>以${FAC[cur].n}家出陣</button></div>`;
      document.querySelectorAll('.diffb').forEach(b => b.onclick = () => { diff = b.dataset.d; store.set('tenka.diff', diff); render(); });
      const mine = TMap.PROV.filter(x => x.own === cur).map(x => x.id);
      m.highlight(mine);
      m.marks([{ lon: TMap.byId[p.home].lon, lat: TMap.byId[p.home].lat, label: TMap.byId[p.home].n }]);
      m.setView(m.boxFor(mine, 260));
      $('#scap').innerHTML = `<b class="brush">${FAC[cur].n}家的位置</b><br>${esc(regionNote(cur))}`;
      document.querySelectorAll('#fcards .fcard[data-id]').forEach(b => b.onclick = () => { cur = b.dataset.id; render(); });
      $('#b-go').onclick = () => { if (!isLocked(cur)) newRun(cur, diff); };
    }
    render();
    $('#b-back').onclick = showTitle;
  }
  function regionNote(f) {
    return {
      oda: '尾張（今愛知縣西部），濃尾平原上的富庶之地，東邊是今川家，北邊是美濃齋藤家。',
      tokugawa: '三河（今愛知縣東部），夾在西邊的織田與東邊的今川之間。1560 年時還是今川家的附庸。',
      takeda: '甲斐（今山梨縣）與信濃（今長野縣），群山環繞、沒有海。北邊越過川中島就是越後。',
      uesugi: '越後（今新潟縣），面向日本海的雪國，冬天大雪會封住山路。南邊越過山脈就是關東與信濃。',
      hojo: '相模（今神奈川縣）與武藏（今東京都、埼玉縣），關東平原的南端。北邊是上杉，西邊是武田與今川。',
      imagawa: '駿河（今靜岡縣中部）與遠江（今靜岡縣西部），東海道上的富庶之地。西邊就是織田家的尾張。',
      mori: '安藝（今廣島縣西部），面向瀨戶內海。北邊越過中國山地，就是出雲的尼子家。',
      chosokabe: '土佐（今高知縣），四國的南部，背後是險峻的四國山地，面前是太平洋。'
    }[f];
  }

  // ───────── 新局 ─────────
  const DIFF = { easy: { n: '初陣', ep: .85, gold: 40, loy: 5 }, normal: { n: '尋常', ep: 1, gold: 0, loy: 0 }, hard: { n: '修羅', ep: 1.25, gold: 0, loy: -10 } };
  const diffMul = () => (DIFF[S.diff || 'normal'] || DIFF.normal).ep;
  function newRun(fac, diff = 'normal') {
    const p = PLAY[fac];
    const owners = Object.fromEntries(TMap.PROV.map(x => [x.id, x.own]));
    S = {
      fac, year: p.prologue ? B[p.prologue].y : p.ch[0].from, ch: p.prologue ? -1 : 0,
      troops: p.start.troops, gold: p.start.gold, pres: p.start.pres, loy: p.start.loy, gauge: 0, income: 0,
      gens: p.gens.slice(), allies: [], treas: [], legacy: [], owners, flags: {}, dead: [], doneWorld: [], evDone: [],
      map: null, stats: { battles: 0, wins: 0, events: 0, startYear: 1560 }, over: false, pending: null, diff, lords: {}
    };
    S.gold += DIFF[diff].gold; S.loy = clamp(S.loy + DIFF[diff].loy, 0, 100);
    S.gens.forEach(g => seen('gens', g));
    META.runs++; saveMeta();
    showRun();
    const steps = [next => storyModal({ kicker: `${FAC[fac].n}家・序`, title: p.lord, scene: fac === 'uesugi' ? 'snow' : fac === 'takeda' ? 'mist' : 'castle', place: TMap.byId[p.home].n, year: yearLabel(S.year), text: p.intro, btn: '出陣', lead: true }, next)];
    if (p.prologue) {
      steps.push(next => battleStep(B[p.prologue], { boss: true, named: p.prologue }, next));
    }
    runQueue(steps, () => startChapter(0));
  }
  function startChapter(i) {
    const c = P().ch[i];
    S.ch = i; S.year = Math.max(S.year, c.from); S.map = genMap(); S.pending = null;
    saveRun(); refresh();
    const [k, t] = c.t.split('　');
    TAudio.sfx('drum');
    TFx.chapterCard(k, t, () => runQueue([next => storyModal({ kicker: k, title: t, scene: B[c.boss].scene, place: '', year: yearLabel(S.year), text: c.intro, btn: '開始' }, next)], () => { saveRun(); refresh(); setTimeout(() => tutor('map'), 300); }));
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
          <div class="mapctl"><button class="btn" id="mv-lbl" aria-pressed="false">今名</button><button class="btn" id="mv-home">本國周邊</button><button class="btn" id="mv-all">全日本</button></div>
          <div class="mapinfo" id="mapinfo"></div>
          <div class="ptip" id="ptip" hidden></div>
        </section>
        <section class="camp panel" id="camp" aria-label="家臣團"></section>
      </div>
      <nav class="tabs" id="tabs"><button data-t="route">路線</button><button data-t="map">天下</button><button data-t="camp">家臣</button></nav>`;
    TAudio.play('calm');
    bigMap = TMap.buildMap($('#bigmap'), { id: 'b' });
    bigMap.onClick((pid) => {
      const p = TMap.byId[pid], o = S.owners[pid];
      const tip = $('#ptip'), svg = $('#bigmap');
      const ctm = svg.getScreenCTM(); if (!ctm) return;
      const pt = svg.createSVGPoint(); pt.x = p.xy[0]; pt.y = p.xy[1];
      const sp = pt.matrixTransform(ctm), rect = $('#mapwrap').getBoundingClientRect();
      tip.hidden = false; tip.style.left = (sp.x - rect.left) + 'px'; tip.style.top = (sp.y - rect.top) + 'px';
      tip.innerHTML = `<b class="brush">${p.n}</b>　${FAC[o] ? FAC[o].n : ''}${o === S.fac ? '（你的領地）' : ''}<br><span class="fine">今：${p.now}・${p.region}</span>`;
      clearTimeout(tip._t); tip._t = setTimeout(() => tip.hidden = true, 3200);
    });
    let lbl = store.get('tenka.lbl', 'old');
    const setLbl = () => { bigMap.labelMode(lbl); $('#mv-lbl').textContent = lbl === 'now' ? '古名' : '今名'; $('#mv-lbl').setAttribute('aria-pressed', String(lbl === 'now')); };
    setLbl();
    $('#mv-lbl').onclick = () => { lbl = lbl === 'now' ? 'old' : 'now'; store.set('tenka.lbl', lbl); setLbl(); };
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
        <span class="chip" data-k="troops" title="兵力"><i>兵</i><b class="v">${fmt(S.troops)}</b></span>
        <span class="chip" data-k="gold" title="金錢"><i>金</i><b class="v">${fmt(S.gold)}</b></span>
        <span class="chip" data-k="pres" title="威望"><i>威</i><b class="v">${fmt(S.pres)}</b></span>
        <span class="chip ${S.loy < 35 ? 'warn' : ''}" data-k="loy" title="家臣忠誠"><i>忠</i><span class="meter"><span style="width:${S.loy}%"></span></span>${S.loy}</span>
        ${S.fac === 'tokugawa' ? `<span class="chip" data-k="gauge" title="忍耐"><i>忍</i><span class="meter"><span style="width:${S.gauge}%"></span></span>${S.gauge}</span>` : ''}
      </div>
      <div class="tools"><button class="btn" id="b-snd2"></button><button class="btn" id="b-cdx">圖鑑</button><button class="btn" id="b-menu">選單</button></div>`;
    bindSoundToggle($('#b-snd2'), true);
    Object.keys(res).forEach(k => {
      if (lastRes[k] !== undefined && lastRes[k] !== res[k]) {
        const c = $(`#bar .chip[data-k="${k}"]`); if (!c) return;
        c.classList.add('flash');
        const v = c.querySelector('.v'); if (v) TFx.countUp(v, lastRes[k], res[k], fmt);
      }
    });
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
      ${lordsHtml()}
      <div class="sec-h"><h3>同盟</h3><small>${S.allies.length} / 3</small></div>
      ${S.allies.length ? `<div class="mini-list">${S.allies.map(a => { const A = ALLY[a]; return `<div class="mini"><span style="color:${FAC[A.fac].color}">${TArt.crest(FAC[A.fac].crest)}</span><div><b>${A.n}</b><div class="sub">${skText([A.sk])}・卒於 ${Math.floor(A.d)}</div></div></div>`; }).join('')}</div>` : '<p class="empty">沒有盟友。外交節點或聯姻事件可以結盟。</p>'}
      <div class="sec-h"><h3>名物</h3><small>${S.treas.length}</small></div>
      ${S.treas.length ? `<div class="mini-list">${S.treas.map(t => `<div class="mini"><div><b>${TR[t].n}</b>　<span class="sub">${TR[t].k}</span><div class="sub">${skText(TR[t].sk)}</div></div></div>`).join('')}</div>` : '<p class="empty">尚未收藏名物。</p>'}
      <div class="sec-h"><h3>羈絆</h3><small>${syn.length} 組生效</small></div>
      ${relevant.length ? `<div class="mini-list">${relevant.map(s => `<div class="mini syn ${syn.includes(s.id) ? 'on' : ''}"><div><b>${s.n}</b>　<span class="sub">${s.req ? `${s.req.filter(r => S.gens.includes(r)).length}/${s.need}` : '同陣營'}</span><div class="sub">${s.req ? s.req.map(r => GEN[r].n).join('・') : '武田與上杉同在一方'}</div><div class="sub">${skText(s.sk)}</div></div></div>`).join('')}</div>` : '<p class="empty">集齊特定武將可觸發羈絆，例如「德川四天王」「兩兵衛」。</p>'}
      ${(S.legacy || []).length ? `<div class="sec-h"><h3>遺志</h3></div><p class="empty">${S.legacy.map(l => `${esc(l.from)}：${skText([l])}`).join('<br>')}</p>` : ''}`;
    bindLords();
  }
  function lordsHtml() {
    cleanLords();
    const mine = myProvs();
    const used = Object.values(S.lords);
    return `<div class="sec-h"><h3>領地與城主</h3><small>${Object.keys(S.lords).length} 位城主</small></div>
      <div class="lords">${mine.map(p => { const pv = TMap.byId[p], l = S.lords[p];
        return `<label class="lord-row"><span><b class="brush">${pv.n}</b><small>今${pv.nowS}${l ? `・收入 +${Math.floor(stat(l, 'a') / 15)}` : ''}</small></span>
          <select data-p="${p}" aria-label="${pv.n}的城主"><option value="">（無城主）</option>${S.gens.filter(g => g === l || !used.includes(g)).map(g => `<option value="${g}" ${g === l ? 'selected' : ''}>${GEN[g].n}・武${stat(g, 'w')}・政${stat(g, 'a')}</option>`).join('')}</select></label>`; }).join('')}</div>
      <p class="empty">城主能增加收入、守城更穩，但不能上戰場。</p>`;
  }
  function bindLords() {
    document.querySelectorAll('#camp .lords select').forEach(sel => sel.onchange = () => { S.lords[sel.dataset.p] = sel.value || undefined; if (!sel.value) delete S.lords[sel.dataset.p]; saveRun(); renderCamp(); });
    if (myProvs().length >= 2 && $('#modal').hidden) setTimeout(() => tutor('lord'), 300);
  }
  function genCard(g) {
    const age = Math.floor(S.year) - g.b, lv = lvOf(g.id), m = (S.merit || {})[g.id] || 0;
    const prog = lv >= 5 ? 100 : Math.round((m - LV_NEED[lv]) / (LV_NEED[lv + 1] - LV_NEED[lv]) * 100);
    const mul = skMul(g.id);
    return `<div class="gcard r${g.r}">${portrait(g)}
      <div class="nm"><b>${g.n}</b><span class="lv">Lv${lv}・${LV_TITLE[lv]}</span><small>${g.unk ? '' : age + '歲・'}${lifeText(g)}</small></div>
      <div class="sk"><em>${g.skn}</em>　${skText(mul === 1 ? g.sk : g.sk.map(k => k.t === 'risk' || k.v === 1 ? k : { t: k.t, v: k.v < 1 ? Math.round(k.v * mul * 100) / 100 : Math.round(k.v * mul) }))}</div>
      <div class="stats">${[['武', 'w'], ['智', 'c'], ['政', 'a']].map(([k, s]) => { const v = stat(g.id, s); return `<div>${k}<span class="bar2"><span style="width:${Math.min(100, v)}%"></span></span>${v}</div>`; }).join('')}</div>
      <div class="merit" title="功勳 ${m}${lv < 5 ? ` / 下一級 ${LV_NEED[lv + 1]}` : ''}"><span style="width:${prog}%"></span></div></div>`;
  }
  function renderMap() {
    if (!bigMap) return;
    bigMap.setOwners(S.owners, COLORS, S.fac);
    bigMap.highlight([]);
    myProvs().forEach(p => { if (!META.seen.prov) META.seen.prov = []; if (!META.seen.prov.includes(p)) { META.seen.prov.push(p); saveMeta(); } });
    if (S.newProv && S.newProv.length && $('#modal').hidden) {
      const ids = S.newProv.filter(p => S.owners[p] === S.fac); S.newProv = [];
      ids.forEach(p => TFx.capture(bigMap.cell(p)));
      if (ids.length) toast(`取得 ${ids.map(p => `<b>${TMap.byId[p].n}</b>（今${TMap.byId[p].now}）`).join('、')}`);
    }
    const present = {}; Object.values(S.owners).forEach(o => present[o] = (present[o] || 0) + 1);
    const major = Object.keys(present).filter(f => f !== 'kokujin' && f !== 'ezo').sort((a, b) => (b === S.fac) - (a === S.fac) || present[b] - present[a]).slice(0, 9);
    $('#mapinfo').innerHTML = major.map(f => `<span class="${f === S.fac ? 'you' : ''}"><i style="background:${COLORS[f]}"></i>${FAC[f].n} ${present[f]}</span>`).join('') + `<span><i style="background:${COLORS.kokujin}"></i>國人眾</span>`;
  }
  function menuModal() {
    openModal(`<div class="sheet-body"><h2>選單</h2><p class="story">進度會在每個節點結束後自動存檔。</p>
      <div class="actions" style="justify-content:flex-start">
        <button class="btn" id="m-close">返回遊戲</button>
        <button class="btn" id="m-title">回到標題（保留存檔）</button>
        <button class="btn btn-shu" id="m-quit">放棄這一局</button></div>
      <div class="actions" style="justify-content:flex-start"><button class="btn btn-sm" id="m-snd"></button><button class="btn btn-sm" id="m-anim"></button><button class="btn btn-sm" id="m-tut">重新顯示教學</button></div><p class="fine" id="m-anim-note"></p></div>`);
    bindSoundToggle($('#m-snd'));
    $('#m-tut').onclick = () => { META.tut = ''; META.tutSeen = []; saveMeta(); $('#m-tut').textContent = '教學會在之後重新出現'; };
    bindAnimToggle($('#m-anim'), $('#m-anim-note'));
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
    const lead = o.lead ? `<div class="talk-lead">${portrait(leaderG(), true)}<b class="brush">${esc(leaderName())}</b></div>` : '';
    if (o.scene === 'night' || o.scene === 'fire') TAudio.play('tense');
    openModal(`${sceneHead(o.scene, o.place, o.year)}<div class="sheet-body">${o.kicker ? `<div class="kicker">${esc(o.kicker)}</div>` : ''}<h2>${esc(o.title)}</h2><div class="${lead ? 'with-lead' : ''}">${lead}<div class="talk" id="talk"></div></div>${o.fx ? fxHtml(o.fx) : ''}${histHtml(o.hist)}<div class="actions" id="talk-act" hidden><button class="btn btn-shu" id="m-ok">${esc(o.btn || '繼續')}</button></div></div>`);
    talk($('#talk'), o.text, () => { $('#talk-act').hidden = false; $('#m-ok').focus(); });
    $('#m-ok').onclick = () => { TAudio.play('calm'); next(); };
  }

  // ───────── 時間流逝 ─────────
  function advanceTo(y) {
    const y0 = S.year; S.year = y;
    const steps = [];
    // 收入
    const n = provCount();
    const gold = Math.round((6 + n * 4 + bonus('income') + S.income) * (S.fac === 'oda' ? 1.4 : S.fac === 'hojo' ? 1.2 : 1));
    const troops = Math.round(n * 220 * (S.fac === 'chosokabe' ? 2 : 1) + bonus('troops'));
    cleanLords();
    const lordGold = Object.values(S.lords || {}).reduce((a, g) => a + Math.floor(stat(g, 'a') / 15), 0);
    S.gold += lordGold;
    if (S.fac === 'imagawa') S.loy = clamp(S.loy - 1, 0, 100);
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
    const wrap = $('#route .route-wrap');
    const from = S.map.pos && wrap ? wrap.querySelector(`.node[data-r="${S.map.pos[0]}"][data-c="${S.map.pos[1]}"]`) : null;
    const to = wrap ? wrap.querySelector(`.node[data-r="${r}"][data-c="${c}"]`) : null;
    if (wrap) wrap.querySelectorAll('.node.avail').forEach(n => { n.onclick = null; n.classList.remove('avail'); });
    TFx.travel(wrap && wrap.offsetParent ? wrap : null, from, to, () => enterNode(r, c));
  }
  function enterNode(r, c) {
    S.map.pos = [r, c]; S.map.path.push([r, c]);
    const node = S.map.rows[r][c];
    S.pending = { r, c, t: node.t };
    const steps = advanceTo(rowYear(r));
    steps.push(next => nodeStep(node.t, next));
    if (node.t !== 'boss' && r > 0) steps.push(next => counterStep(next));
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
    if (t === 'battle') return targetModal(next);
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
    const pv = provAt(e.loc);
    const body = e.loc ? `<div class="with-mini"><div class="talk" id="talk"></div><div><div class="mini-map">${TMap.miniMap(e.loc[0], e.loc[1], pv.n)}</div><div class="now-line">今：${esc(pv.now)}</div></div></div>` : `<div class="talk" id="talk"></div>`;
    TAudio.play(e.scene === 'night' || e.scene === 'fire' ? 'tense' : 'calm');
    if (!e.ch) {
      const fx = applyEff(e.eff);
      openModal(`${head}<div class="sheet-body"><div class="kicker">${esc(e.kicker)}</div><h2>${esc(e.t)}</h2>${body}<div id="talk-act" hidden>${fxHtml(fx)}${histHtml(e.hist)}<div class="actions"><button class="btn btn-shu" id="m-ok">繼續</button></div></div></div>`);
      talk($('#talk'), text, () => { $('#talk-act').hidden = false; $('#m-ok').focus(); });
      $('#m-ok').onclick = () => { refresh(); next(); };
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
    openModal(`${head}<div class="sheet-body"><div class="kicker">${esc(e.kicker)}</div><h2>${esc(e.t)}</h2>${body}<div class="choices" id="talk-act" hidden>${chs}</div></div>`);
    talk($('#talk'), text, () => { $('#talk-act').hidden = false; });
    document.querySelectorAll('#modal .choice').forEach(b => b.onclick = () => {
      const c = e.ch[+b.dataset.i];
      let res = c;
      if (c.p !== undefined) { const p = typeof c.p === 'function' ? c.p(G) : c.p; res = rnd() < p ? c.ok : c.ng; }
      const fx = applyEff(res.eff);
      if (S.fac === 'tokugawa' && /忍耐|隱忍/.test(c.t)) S.gauge = clamp(S.gauge + 5, 0, 100);
      if (gens[0]) { gainMerit(gens[0], 1); fx.push({ t: `${GEN[gens[0]].n} 功勳 +1`, c: 'up' }); }
      refresh();
      openModal(`${head}<div class="sheet-body"><div class="kicker">${esc(e.kicker)}</div><h2>${esc(e.t)}</h2><p class="story"><b class="brush">▸ ${esc(c.t)}</b><br>${esc(res.r || '')}</p>${fxHtml(fx)}${histHtml(e.hist)}<div class="actions"><button class="btn btn-shu" id="m-ok">繼續</button></div></div>`);
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
    const tcost = S.fac === 'chosokabe' ? 15 : 30;
    const draw = () => {
      const full = S.gens.length >= MAX_GENS;
      openModal(`${sceneHead('market', '', yearLabel(S.year))}<div class="sheet-body"><div class="kicker">城下町</div><h2>熱鬧的城下町</h2>
        <p class="story">商人、浪人、工匠聚集在這裡。你手上有 <b class="num">${fmt(S.gold)}</b> 金。</p>
        <div class="pick3">${sale.map(g => S.gens.includes(g.id) ? '' : pcard(g, PRICE[g.r], full || S.gold < PRICE[g.r])).join('')}</div>
        <div class="choices">
          ${tr && !S.treas.includes(tr.id) ? `<button class="choice" data-buy="tr" ${S.gold < 70 ? 'disabled' : ''}><b>名物「${tr.n}」（${tr.k}）・70 金</b><small>${skText(tr.sk)}</small></button>` : ''}
          <button class="choice" data-buy="troops" ${S.gold < tcost ? 'disabled' : ''}><b>募集足輕・${tcost} 金</b><small>兵力 +1,200</small></button>
          <button class="choice" data-buy="gift" ${S.gold < 25 ? 'disabled' : ''}><b>犒賞家臣・25 金</b><small>忠誠 +10</small></button>
        </div>
        <div class="actions"><button class="btn btn-shu" id="m-ok">離開</button></div></div>`);
      document.querySelectorAll('#modal .pcard').forEach(b => b.onclick = () => { const g = GEN[b.dataset.id]; S.gold -= PRICE[g.r]; addGen(g.id, []); toast(`<b>${g.n}</b> 加入了家臣團`); refresh(); draw(); });
      document.querySelectorAll('#modal [data-buy]').forEach(b => b.onclick = () => {
        const k = b.dataset.buy;
        if (k === 'tr') { S.gold -= 70; applyEff({ treas: tr.id }); toast(`獲得名物「<b>${tr.n}</b>」`); }
        if (k === 'troops') { S.gold -= tcost; S.troops += 1200; }
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
    const p = clamp(.3 + S.pres / 400 + bonus('plot') + (S.fac === 'imagawa' ? .2 : 0), .1, .95);
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
      const cost = (30 + buys * 10) / (S.fac === 'chosokabe' ? 2 : 1);
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
  // ───────── 攻略目標：地形與特產 ─────────
  const MOUNTAIN = new Set(['kai', 'shinano_s', 'shinano_n', 'hida', 'kozuke', 'mimasaka', 'iga', 'yamato', 'kii', 'kumano', 'tosa', 'hyuga', 'mutsu_n', 'dewa_s', 'tamba', 'tajima', 'higo']);
  const terrainOf = p => MOUNTAIN.has(p) ? 'mountain' : 'plain';
  const PRODUCT = {
    kai: { n: '黑川金山', d: '收入 +5', eff: { income: 5 } }, sado: { n: '佐渡金山', d: '收入 +5', eff: { income: 5 } },
    iwami: { n: '石見銀山', d: '收入 +7', eff: { income: 7 } }, izumi: { n: '自治都市・堺', d: '收入 +6', eff: { income: 6 } },
    settsu: { n: '大坂與兵庫津', d: '收入 +3・威望 +5', eff: { income: 3, pres: 5 } }, yamashiro: { n: '京都', d: '威望 +20', eff: { pres: 20 } },
    omi_n: { n: '國友鐵砲鍛冶', d: '獲得種子島銃', eff: { treas: 'tanegashima' } }, kii: { n: '雜賀・根來鐵砲眾', d: '獲得種子島銃', eff: { treas: 'tanegashima' } },
    osumi: { n: '種子島', d: '獲得種子島銃', eff: { treas: 'tanegashima' } }, iga: { n: '伊賀忍者', d: '下一戰看穿敵情', eff: { flag: 'intel' } },
    mikawa: { n: '三河武士', d: '兵力 +800', eff: { troops: 800 } }, owari: { n: '濃尾平原的稻米', d: '收入 +3', eff: { income: 3 } },
    mino: { n: '濃尾平原的稻米', d: '收入 +3', eff: { income: 3 } }, echigo: { n: '青苧（麻布原料）', d: '收入 +3', eff: { income: 3 } },
    hizen: { n: '南蠻貿易港', d: '收入 +4', eff: { income: 4 } }, chikuzen: { n: '博多港', d: '收入 +4', eff: { income: 4 } },
    musashi: { n: '關東平原', d: '兵力 +800', eff: { troops: 800 } }, suruga: { n: '駿河灣的鹽與海運', d: '收入 +3', eff: { income: 3 } },
    ise: { n: '伊勢神宮與海路', d: '收入 +2・威望 +6', eff: { income: 2, pres: 6 } }, harima: { n: '播磨的鹽田', d: '收入 +3', eff: { income: 3 } },
    shinano_n: { n: '善光寺', d: '威望 +6', eff: { pres: 6 } }, kozuke: { n: '上野的牧場', d: '兵力 +500', eff: { troops: 500 } },
    mutsu_s: { n: '奧州名馬', d: '兵力 +500', eff: { troops: 500 } }, nagato: { n: '赤間關海峽', d: '收入 +3', eff: { income: 3 } },
    omi_s: { n: '琵琶湖水運', d: '收入 +3', eff: { income: 3 } }, sagami: { n: '小田原城下', d: '收入 +3', eff: { income: 3 } }
  };
  function frontier() {
    const mine = new Set(myProvs()), allyF = S.allies.map(a => ALLY[a].fac);
    const out = new Set();
    mine.forEach(p => TMap.NEI[p].forEach(n => { const o = S.owners[n]; if (o !== S.fac && !allyF.includes(o) && n !== 'ezo') out.add(n); }));
    return [...out];
  }
  const enemyStrength = () => Math.round((S.troops * .6 + 1500 + Math.max(0, S.ch) * 2600) * (.85 + rnd() * .35) * diffMul() / 100) * 100;
  function makeBattle(t, ep) {
    if (!t) { const fr = frontier(); t = fr.length ? pick(fr) : pick(TMap.PROV.filter(p => S.owners[p.id] !== S.fac && p.id !== 'ezo')).id; }
    const prov = TMap.byId[t], o = S.owners[t], ter = terrainOf(t);
    ep = ep || enemyStrength();
    return { n: `${prov.n}攻略`, place: `${prov.n}（今${prov.nowS}）`, loc: [prov.lon, prov.lat], foe: o, cmd: `${FAC[o].n}家的部將`, ft: ep, ep, target: t, terrain: ter,
      scene: ter === 'mountain' ? pick(['mist', 'siege', 'field']) : pick(['field', 'cavalry', 'siege', 'river']),
      intro: `你的軍隊進入了${prov.n}（今${prov.now}）。${FAC[o].n}家的軍隊已在前方布陣，旗幟在風中翻飛。`, specials: [] };
  }
  function targetModal(next) {
    setTimeout(() => tutor('target'), 350);
    let cands = shuffle(frontier()).slice(0, 4);
    if (!cands.length) cands = [pick(TMap.PROV.filter(p => S.owners[p.id] !== S.fac && p.id !== 'ezo')).id];
    const info = cands.map(t => ({ t, ep: enemyStrength() }));
    let sel = null;
    const draw = () => {
      openModal(`<div class="sheet-body"><div class="kicker">合戰</div><h2>選擇攻打目標</h2>
        <p class="story">斥候回報了邊境各國的情況。點地圖上標了數字的國，或從下方清單選擇。</p>
        <div class="selmap"><svg id="selmap" role="img" aria-label="可以攻打的國"></svg></div>
        <div class="choices">${info.map((c, i) => {
          const p = TMap.byId[c.t], o = S.owners[c.t], pr = PRODUCT[c.t], ter = terrainOf(c.t);
          return `<button class="choice target ${sel === c.t ? 'on' : ''}" data-t="${c.t}"><b>${i + 1}．${p.n}（今${esc(p.now)}）</b><small>${FAC[o].n}${o === 'kokujin' ? '' : '家'}・約 ${fmt(c.ep)} 人・${ter === 'mountain' ? '山地：騎馬不利、守方有利' : '平原：騎馬有利'}${pr && !(S.gotProd || []).includes(c.t) ? `・特產「${pr.n}」（${pr.d}）` : ''}</small></button>`;
        }).join('')}
          <button class="choice" data-t=""><b>按兵不動</b><small>這次不出兵（威望 -3）</small></button></div>
        <div class="actions"><button class="btn btn-shu" id="m-ok" ${sel ? '' : 'disabled'}>${sel ? `出兵：${TMap.byId[sel].n}` : '請先選擇目標'}</button></div></div>`, { quiet: true, keepScroll: true });
      const m = TMap.buildMap($('#selmap'), { id: 'sel' });
      m.setOwners(S.owners, COLORS, S.fac);
      m.highlight(sel ? [sel] : cands);
      m.marks(info.map((c, i) => ({ lon: TMap.byId[c.t].lon, lat: TMap.byId[c.t].lat, label: `${i + 1}` })));
      m.setView(m.boxFor(cands.concat(myProvs().filter(p => cands.some(c => TMap.NEI[c].has(p)))), 110), false);
      m.onClick(pid => { if (cands.includes(pid)) { sel = pid; draw(); } });
      document.querySelectorAll('#modal .choice').forEach(b => b.onclick = () => {
        if (!b.dataset.t) { S.pres = Math.max(0, S.pres - 3); refresh(); return next(); }
        sel = b.dataset.t; draw();
      });
      $('#m-ok').onclick = () => { const c = info.find(x => x.t === sel); if (c) battleStep(makeBattle(c.t, c.ep), {}, next); };
    };
    draw();
  }

  // ───────── 城主與敵軍反攻 ─────────
  function cleanLords() {
    S.lords = S.lords || {};
    Object.keys(S.lords).forEach(p => { if (S.owners[p] !== S.fac || !S.gens.includes(S.lords[p])) delete S.lords[p]; });
  }
  function counterStep(next) {
    const mine = myProvs();
    if (mine.length < 2 || rnd() > Math.min(.3, .08 + .025 * mine.length)) return next();
    const allyF = S.allies.map(a => ALLY[a].fac), opts = [];
    mine.forEach(p => TMap.NEI[p].forEach(n => { const o = S.owners[n]; if (o !== S.fac && !allyF.includes(o) && o !== 'ezo' && o !== 'kokujin') opts.push([p, o]); }));
    if (!opts.length) return next();
    const [p, o] = pick(opts), prov = TMap.byId[p];
    cleanLords();
    const lord = S.lords[p];
    const ep = Math.round((S.troops * .45 + 1000 + Math.max(0, S.ch) * 1800) * (.8 + rnd() * .3) / 100) * 100;
    const holdP = clamp(.35 + (lord ? (stat(lord, 'w') - 50) / 150 + .15 : 0) + (S.fac === 'hojo' ? .15 : 0), .1, .9);
    const place = `${prov.n}（今${prov.nowS}）`;
    TAudio.play('tense'); TAudio.sfx('drum');
    const lose = (msg) => {
      S.owners[p] = o; delete S.lords[p];
      const fx = [{ t: `失去${prov.n}`, c: 'dn' }, ...applyEff({ pres: -5 })];
      refresh();
      openModal(`${sceneHead('fire', place, yearLabel(S.year), { foe: COLORS[o] })}<div class="sheet-body"><div class="kicker">敵襲</div><h2>${prov.n}失守</h2><p class="story">${esc(msg)}</p>${fxHtml(fx)}<div class="actions"><button class="btn btn-shu" id="m-ok">繼續</button></div></div>`, { quiet: true });
      $('#m-ok').onclick = () => next();
    };
    openModal(`${sceneHead('siege', place, yearLabel(S.year), { foe: COLORS[o] })}<div class="sheet-body"><div class="kicker">敵襲</div><h2>${FAC[o].n}家攻打${prov.n}！</h2>
      <div class="talk" id="talk"></div>
      <div class="choices" id="talk-act" hidden>
        <button class="choice" data-c="fight"><b>出兵迎擊</b><small>防衛戰・敵軍約 ${fmt(ep)} 人・撐過三回合就能守住</small></button>
        <button class="choice" data-c="hold"><b>${lord ? `交給城主${GEN[lord].n}固守` : '交給守軍固守'}</b><small>守住的機率 ${Math.round(holdP * 100)}%</small></button>
        <button class="choice" data-c="give"><b>放棄${prov.n}</b><small>保住兵力，但失去這個國</small></button></div></div>`);
    talk($('#talk'), `${FAC[o].n}家趁你出兵在外，率約 ${fmt(ep)} 人攻入${prov.n}（今${prov.now}）。\n${lord ? `城主${GEN[lord].n}派人火速求援。` : '這裡沒有城主，守軍人心惶惶。'}`, () => { $('#talk-act').hidden = false; });
    document.querySelectorAll('#modal [data-c]').forEach(b => b.onclick = () => {
      const c = b.dataset.c;
      if (c === 'fight') return battleStep({ n: `${prov.n}防衛戰`, place, loc: [prov.lon, prov.lat], foe: o, cmd: `${FAC[o].n}家的部將`, ft: ep, ep, defense: 1, lost: p, mode: 'survive', cap: .35, survive: '撐過三回合就能守住', scene: 'siege', terrain: terrainOf(p), intro: `${FAC[o].n}軍已經包圍了${prov.n}的城池，你率軍趕來救援。`, specials: [], win: { t: `敵軍撤退了，${prov.n}守住了。`, eff: { pres: 8 } }, lose: `${prov.n}失守了。` }, {}, next);
      if (c === 'give') return lose(`你下令撤出${prov.n}，把兵力保留給更重要的戰場。`);
      if (rnd() < holdP) {
        if (lord) gainMerit(lord, 2);
        const fx = applyEff({ pres: 6 });
        if (lord) fx.push({ t: `${GEN[lord].n} 功勳 +2`, c: 'up' });
        refresh();
        openModal(`${sceneHead('castle', place, yearLabel(S.year))}<div class="sheet-body"><div class="kicker">敵襲</div><h2>${prov.n}守住了</h2><p class="story">${lord ? `${GEN[lord].n}率領守軍堅守城池，` : '守軍拚死抵抗，'}${FAC[o].n}軍久攻不下，只好撤退。</p>${fxHtml(fx)}<div class="actions"><button class="btn btn-shu" id="m-ok">繼續</button></div></div>`, { quiet: true });
        $('#m-ok').onclick = () => next();
      } else lose(`${lord ? `${GEN[lord].n}奮戰到最後，` : ''}城池還是被攻破了。`);
    });
  }

  // ───────── 合戰：三路布陣 ─────────
  const UT = { cav: { n: '騎馬隊', s: '騎' }, spear: { n: '長槍隊', s: '槍' }, gun: { n: '鐵砲隊', s: '砲' } };
  const BEATS = { gun: 'cav', cav: 'spear', spear: 'gun' };
  const LANE = ['左翼', '中央', '右翼'];
  const FORMS = {
    gyorin: { n: '魚鱗', d: '中央突出：中央 +30%，兩翼 -10%', pos: [0, 24, 0], m: [.9, 1.3, .9], hist: '部隊像魚鱗般層層排列、中央突出，適合以少擊多。三方原之戰中，武田信玄擺的就是魚鱗之陣。' },
    kakuyoku: { n: '鶴翼', d: '兩翼前伸：兩翼 +20%，中央 -15%；兩翼都勝可包圍本陣', pos: [24, -8, 24], m: [1.2, .85, 1.2], hist: '像鶴展翅般向兩側張開，適合以多擊少、包圍敵軍。三方原之戰中，德川家康就擺出鶴翼之陣迎戰武田。' },
    hoshi: { n: '鋒矢', d: '全軍突擊：攻擊 +15%，損失 +15%', pos: [12, 34, 12], m: [1.15, 1.15, 1.15], lossMul: 1.15, hist: '像箭頭一樣全力向前衝，是攻擊性最強的陣形，但側面和後方容易被攻破。' },
    engetsu: { n: '偃月', d: '大將在前：中央 +15%，本陣受損 -40%', pos: [4, 16, 4], m: [1, 1.15, 1], hqMul: .6, hist: '大將親自站在弧形陣前端，士氣高昂但大將危險。傳說上杉謙信擅長這種陣形。' },
    hoen: { n: '方圓', d: '圓陣死守：損失 -25%，攻擊 -15%', pos: [-16, -10, -16], m: [.85, .85, .85], lossMul: .75, hist: '把大將圍在中央的圓形防禦陣，適合被包圍時固守，或等待援軍到來。' }
  };
  const ORD = { atk: '進攻', hold: '固守', feint: '誘敵' };
  const INTENT = { charge: '突擊', hold: '固守', shoot: '射擊' };
  // 軍令對敵軍意圖：[我方造成傷害倍率, 我方承受傷害倍率]
  const MX = { atk: { charge: [1, 1], hold: [.75, 1.1], shoot: [1, 1.25] }, hold: { charge: [1.15, .65], hold: [.3, .3], shoot: [.5, .9] }, feint: { charge: [1.45, .5], hold: [.2, .35], shoot: [.2, .6] } };
  const FPREF = { takeda: ['cav', 'cav', 'spear'], uesugi: ['cav', 'spear', 'spear'], oda: ['gun', 'spear', 'spear'], tokugawa: ['spear', 'spear', 'cav'], akechi: ['gun', 'spear', 'gun'], ikko: ['spear', 'spear', 'spear'], saito: ['spear', 'spear', 'cav'], imagawa: ['spear', 'cav', 'spear'], hojo: ['spear', 'gun', 'spear'], mori: ['spear', 'gun', 'spear'], miyoshi: ['spear', 'gun', 'cav'], azai: ['spear', 'cav', 'spear'], asakura: ['spear', 'spear', 'cav'], kokujin: ['spear', 'spear', 'cav'] };
  const BOSS_LANES = {
    okehazama: ['spear', 'cav', 'spear'], marune: ['spear', 'spear', 'spear'], inabayama: ['spear', 'spear', 'gun'], nagashino_oda: ['cav', 'cav', 'cav'],
    nagashino_toku: ['cav', 'cav', 'cav'], nagashino_t: ['gun', 'gun', 'spear'], honnoji: ['gun', 'spear', 'gun'], mikawa_ikki: ['spear', 'spear', 'spear'],
    mikatagahara_toku: ['cav', 'cav', 'spear'], mikatagahara_t: ['spear', 'gun', 'spear'], iga: ['spear', 'spear', 'spear'], kawanakajima_t: ['cav', 'spear', 'cav'],
    kawanakajima_u: ['cav', 'spear', 'cav'], koshu: ['gun', 'spear', 'gun'], tedorigawa: ['spear', 'gun', 'spear'], uozu: ['gun', 'spear', 'gun'], anegawa: ['spear', 'cav', 'spear'],
    okehazama_i: ['spear', 'cav', 'spear'], enshu: ['spear', 'spear', 'cav'], sunpu: ['cav', 'cav', 'spear'], kakegawa: ['spear', 'gun', 'spear'], odawara: ['cav', 'spear', 'cav'], mimasetoge: ['cav', 'spear', 'cav'], kannagawa: ['spear', 'gun', 'spear'],
    gassantoda: ['spear', 'spear', 'spear'], kizugawa: ['gun', 'gun', 'spear'], takamatsu: ['gun', 'spear', 'gun'], nagahama: ['spear', 'spear', 'spear'], yanagare: ['spear', 'cav', 'spear'], shimanto: ['spear', 'gun', 'spear'], nakatomigawa: ['spear', 'gun', 'spear']
  };
  const RNX = ['', '一', '二', '三', '四', '五'];
  const PERS = { aggressive: { n: '猛攻', w: { charge: .3 } }, defensive: { n: '堅守', w: { hold: .3 } }, cunning: { n: '狡猾', fake: .35, w: {} }, gunner: { n: '重鐵砲', w: { shoot: .25 } }, balanced: { n: '穩健', w: {} } };
  const CMD_PERS = [['信玄', 'cunning'], ['謙信', 'aggressive'], ['政虎', 'aggressive'], ['景虎', 'aggressive'], ['家康', 'defensive'], ['勝家', 'aggressive'], ['義元', 'defensive'], ['光秀', 'gunner'], ['信忠', 'gunner'], ['信長', 'gunner'], ['勝賴', 'aggressive'], ['龍興', 'defensive'], ['秀吉', 'cunning'], ['一益', 'gunner'], ['長政', 'aggressive'], ['本願寺', 'aggressive'], ['落武者', 'aggressive'], ['氏康', 'defensive'], ['元就', 'cunning'], ['十河', 'aggressive'], ['一條', 'defensive'], ['尼子', 'defensive'], ['國人', 'balanced']];
  const FAC_PERS = { takeda: 'cunning', uesugi: 'aggressive', hojo: 'defensive', oda: 'gunner', tokugawa: 'defensive', mori: 'cunning', ikko: 'aggressive', imagawa: 'defensive', akechi: 'gunner', chosokabe: 'aggressive' };
  const WEATHER = { clear: { n: '晴', ic: '☀' }, rain: { n: '雨', ic: '☂', d: '鐵砲受潮' }, mist: { n: '霧', ic: '〰', d: '看不清敵軍、誘敵有利' }, snow: { n: '雪', ic: '❄', d: '騎馬遲緩' } };
  const BOSS_WEATHER = { okehazama: r => r >= 2 ? 'rain' : 'clear', okehazama_i: r => r >= 2 ? 'rain' : 'clear', kawanakajima_t: r => r <= 2 ? 'mist' : 'clear', kawanakajima_u: r => r <= 2 ? 'mist' : 'clear', mikatagahara_toku: () => 'snow', mikatagahara_t: () => 'snow', tedorigawa: () => 'rain', iga: () => 'mist', mimasetoge: () => 'mist', takamatsu: () => 'rain', honnoji: () => 'clear' };

  function battleStep(def, opt, next) {
    if (def.boss && (def === B.honnoji || def === B.iga) && S.gens.includes('akechi')) {
      S.gens = S.gens.filter(x => x !== 'akechi'); S.dead.push('akechi');
    }
    const bid = opt.named;
    const EP = Math.max(def.ep * (def.boss && S.ch >= 0 ? 1.25 : 1), def.boss && !def.local && S.ch >= 0 ? S.troops * .8 : 0) * diffMul();
    const T = def.local || S.troops;
    const survive = def.mode === 'survive';
    const maxR = survive ? 3 : 5;
    const foeColor = FAC[def.foe] ? FAC[def.foe].color : undefined;
    const placeTxt = def.place && def.loc && !def.target ? `${def.place}（今${provAt(def.loc).nowS}）` : (def.place || placeName(def.loc));
    const head = label => sceneHead(def.scene, placeTxt, label, { foe: foeColor, seed: def.n.length });
    const types = (bid && BOSS_LANES[bid]) || shuffle(FPREF[def.foe] || FPREF.kokujin);
    const wts = [0, 1, 2].map(() => .3 + rnd() * .15), ws = wts.reduce((a, b) => a + b, 0);
    const resFrac = def.local ? 0 : .15;
    const foe = types.map((ty, i) => { const tr = Math.max(def.local ? 30 : 100, Math.round(EP * (1 - resFrac) * wts[i] / ws)); return { type: ty, troops: tr, t0: tr, broken: false, intent: 'hold', shown: 'hold', known: false }; });
    const pers = (CMD_PERS.find(([k]) => def.cmd.includes(k)) || [0, FAC_PERS[def.foe] || pick(['balanced', 'aggressive', 'defensive', 'cunning'])])[1];
    const foeForm = { aggressive: pick(['hoshi', 'gyorin']), defensive: pick(['hoen', 'kakuyoku']), cunning: 'kakuyoku', gunner: 'kakuyoku', balanced: pick(['gyorin', 'kakuyoku']) }[pers];
    const sea = Math.min(3, Math.floor((S.year - Math.floor(S.year)) * 4));
    const wBase = (() => { const r = rnd(); if (sea === 3 && r < .35) return 'snow'; if (r < .15) return 'rain'; if (r < .28) return 'mist'; return 'clear'; })();
    const weather = () => (bid && BOSS_WEATHER[bid]) ? BOSS_WEATHER[bid](Math.max(1, st.round)) : wBase;
    const wx = ty => { const w = weather(); return w === 'rain' && ty === 'gun' ? .4 : w === 'snow' && ty === 'cav' ? .8 : 1; };
    const defType = S.fac === 'takeda' ? 'cav' : 'spear';
    const our = [0, 1, 2].map(() => ({ g: null, type: defType, pct: 30, troops: 0, t0: 0, order: 'atk', broken: false }));
    const lordSet = Object.values(S.lords || {});
    const fieldGens = S.gens.filter(g => !lordSet.includes(g));
    const gs = fieldGens.slice().sort((a, b) => stat(b, 'w') - stat(a, 'w'));
    [1, 0, 2].forEach((lane, k) => { if (gs[k]) our[lane].g = gs[k]; });
    const st = { round: 0, form: 'gyorin', hq: { our: 100, foe: 100 }, reserve: 0, resTo: -1, resUsed: false, plan: null, used: {}, log: [], buff: 0, intel: !!S.flags.intel, fx: null, foeRes: Math.round(EP * resFrac), plotN: 0 };
    if (S.flags.intel) { delete S.flags.intel; st.log.push({ c: 'sys', t: '忍者帶回了敵軍的情報：本戰可以看穿更多敵軍動向。' }); }
    S.stats.battles++;
    if (bid) seen('battles', bid);
    const plotP = () => clamp(.3 + (S.gens.reduce((m, g) => Math.max(m, (stat(g, 'c') + stat(g, 'a')) / 2), 40) - 60) / 200 + bonus('plot') + (S.fac === 'mori' ? .25 : 0), .05, .95);
    const total = () => our.reduce((a, l) => a + l.troops, 0) + st.reserve;

    const intro = () => {
      const pv = provAt(def.loc);
      openModal(`${head(yearLabel(S.year))}<div class="sheet-body"><div class="kicker">${def.boss ? '決戰' : '合戰'}</div><h2>${esc(def.n)}</h2>
        <div class="with-mini"><div class="talk" id="talk"></div>${def.loc ? `<div><div class="mini-map">${TMap.miniMap(def.loc[0], def.loc[1], pv.n)}</div><div class="now-line">今：${esc(pv.now)}</div></div>` : ''}</div>
        <p class="fine">敵軍：${esc(FAC[def.foe] ? FAC[def.foe].n : '')}・${esc(def.cmd)}・約 ${fmt(def.ft)} 人${def.local ? `　我方：隨從約 ${def.local} 人` : ''}　<b>勝利條件：${survive ? esc(def.survive || '撐過三回合') : '擊潰敵軍兩路，或讓敵本陣士氣歸零'}</b></p>
        <div class="actions"><button class="btn btn-shu" id="m-ok">布陣</button></div></div>`);
      talk($('#talk'), def.intro);
      TAudio.play('battle'); TAudio.sfx('horn');
      $('#m-ok').focus(); $('#m-ok').onclick = setup;
    };

    // 戰場圖：上方敵軍、下方我軍，左中右三路
    const LX = [110, 300, 490], EY = 124, OY = 262;
    const unit = Math.max(T, EP) / 22;
    const ourCol = FAC[S.fac].color, foeCol = foeColor || '#b5361f';
    const shown = (l, mode) => mode === 'setup' ? Math.round(T * l.pct / 100) : l.troops;
    const ourY = i => OY - Math.round(FORMS[st.form].pos[i] * .8);
    const foeY = i => EY + Math.round(FORMS[foeForm].pos[i] * .5);
    const portraitAt = (id, x, y, s) => TArt.portrait(GEN[id], ageOf(GEN[id]), FAC[GEN[id].home] ? FAC[GEN[id].home].color : '#777').replace('<svg viewBox', `<svg x="${x}" y="${y}" width="${s}" height="${s}" viewBox`);
    const svgField = mode => {
      const pts = LX.map((x, i) => `${x},${ourY(i) + 4}`);
      const outline = st.form === 'hoen' ? `<ellipse cx="300" cy="${OY + 22}" rx="262" ry="66" class="bf-form"/>` : `<path d="M${pts[0]} L${pts[1]} L${pts[2]} M${pts[0]} L300,${OY + 70} L${pts[2]}" class="bf-form"/>`;
      let s = `<svg class="bfsvg" viewBox="0 0 600 380" role="img" aria-label="戰場：上方是敵軍，下方是我軍"><rect class="bf-ground" width="600" height="380"/>${TArt.terrain(def.terrain, def.scene === 'river', def.n.length)}${TArt.camp(300, 34, foeCol, true, st.hq.foe)}${TArt.camp(300, 350, ourCol, false, st.hq.our)}${outline}`;
      [0, 1, 2].forEach(i => {
        const f = foe[i], l = our[i], x = LX[i], oy = ourY(i);
        const adv = BEATS[l.type] === f.type ? 'adv' : BEATS[f.type] === l.type ? 'dis' : '';
        const lb = l.broken || (mode === 'setup' && l.pct === 0);
        const fy = foeY(i);
        s += `<g class="blk foe" data-i="${i}">${TArt.block(f.type, f.troops, unit, x, fy, foeCol, true, f.broken)}<text class="bf-num" x="${x}" y="${fy + 48}">${f.broken ? '潰走' : fmt(f.troops)}</text></g>`;
        if (mode !== 'setup' && !f.broken) s += TArt.sign(f.known ? f.shown : 'unk', x - 66, fy - 14, true);
        if (!f.broken && !lb) s += TArt.vsMark(adv, x - 8, (fy + oy) / 2 + 2);
        s += `<g class="blk our" data-i="${i}">${TArt.block(l.type, shown(l, mode), unit, x, oy, ourCol, false, lb)}<text class="bf-num" x="${x}" y="${oy + 48}">${l.broken ? '潰走' : lb ? '' : fmt(shown(l, mode))}</text></g>`;
        if (l.g && !lb) s += portraitAt(l.g, x - 82, oy + 10, 28);
        if (mode !== 'setup' && !l.broken) s += TArt.sign(l.order, x - 66, oy - 14, false);
      });
      return s + TArt.weather(weather()) + '</svg>';
    };
    const tags = () => `<div class="bf-tags"><span>敵將・${esc(def.cmd.replace(/家的部將$/, '軍'))}<b>${PERS[pers].n}</b></span><span>${FORMS[foeForm].n}之陣</span><span>${WEATHER[weather()].ic} ${WEATHER[weather()].n}${WEATHER[weather()].d ? '・' + WEATHER[weather()].d : ''}</span>${st.foeRes > 0 && st.round > 0 ? '<span>敵預備隊待命</span>' : ''}</div>`;
    const legend = `<div class="ctr-legend" role="img" aria-label="兵種相剋：鐵砲克騎馬、騎馬克長槍、長槍克鐵砲">${TArt.unitIcon('gun')}<span>›</span>${TArt.unitIcon('cav')}<span>›</span>${TArt.unitIcon('spear')}<span>›</span>${TArt.unitIcon('gun')}</div>`;
    const colSetup = i => {
      const l = our[i];
      return `<div class="col"><div class="col-h">${LANE[i]}</div>
        <select class="ln-gen" data-i="${i}" aria-label="${LANE[i]}的大將"><option value="">無大將</option>${fieldGens.map(g => `<option value="${g}" ${l.g === g ? 'selected' : ''}>${GEN[g].n}</option>`).join('')}</select>
        <div class="uts">${['cav', 'spear', ...(canGun() ? ['gun'] : [])].map(ty => `<button class="ut ${l.type === ty ? 'on' : ''}" data-i="${i}" data-ty="${ty}" aria-label="${UT[ty].n}" title="${UT[ty].n}">${TArt.unitIcon(ty)}</button>`).join('')}</div>
        <div class="pct"><button class="pm" data-i="${i}" data-d="-10" aria-label="減少${LANE[i]}兵力">−</button><span class="num">${l.pct}%</span><button class="pm" data-i="${i}" data-d="10" aria-label="增加${LANE[i]}兵力">＋</button></div></div>`;
    };

    const setup = () => {
      const resPct = 100 - our.reduce((a, l) => a + l.pct, 0);
      openModal(`<div class="sheet-body bf-body">
        <div class="bf-head"><div><div class="kicker">布陣</div><h2>${esc(def.n)}</h2></div>${legend}</div>
        <div class="forms" role="group" aria-label="陣形">${Object.entries(FORMS).map(([k, f]) => `<button class="form ${st.form === k ? 'on' : ''}" data-f="${k}" aria-label="${f.n}之陣">${TArt.formIcon(f.pos, k)}<span>${f.n}</span></button>`).join('')}</div>
        <p class="form-d">${FORMS[st.form].n}・${FORMS[st.form].d}</p>
        ${tags()}
        ${svgField('setup')}
        <div class="bf-ctl3">${[0, 1, 2].map(colSetup).join('')}</div>
        <div class="bf-foot"><span class="fine">預備隊 ${resPct}%${def.terrain === 'mountain' ? '・山地：騎馬不利' : def.terrain === 'plain' ? '・平原：騎馬有利' : ''}</span><button class="btn btn-shu" id="bf-go">開戰</button></div>
        <details class="bf-help"><summary>怎麼布陣？</summary><p>三路各派大將、選兵種、分配兵力，剩下的兵力是預備隊。照相剋克制敵人：鐵砲克騎馬、騎馬克長槍、長槍克鐵砲（綠色▲代表有利）。</p><p class="fine">${FORMS[st.form].hist}</p></details>
      </div>`, { quiet: true, keepScroll: true });
      document.querySelectorAll('#modal .form').forEach(b => b.onclick = () => { st.form = b.dataset.f; setup(); });
      document.querySelectorAll('#modal .ut').forEach(b => b.onclick = () => { our[+b.dataset.i].type = b.dataset.ty; setup(); });
      document.querySelectorAll('#modal .ln-gen').forEach(s => s.onchange = () => {
        const i = +s.dataset.i, g = s.value || null, other = our.findIndex((l, k) => k !== i && g && l.g === g);
        if (other >= 0) our[other].g = our[i].g;
        our[i].g = g; setup();
      });
      document.querySelectorAll('#modal .pm').forEach(b => b.onclick = () => {
        const l = our[+b.dataset.i], d = +b.dataset.d, sum = our.reduce((a, x) => a + x.pct, 0);
        if (d > 0 && sum + d > 100) return;
        l.pct = clamp(l.pct + d, 0, 70); setup();
      });
      setTimeout(() => tutor('setup'), 200);
      $('#bf-go').onclick = () => {
        our.forEach(l => { l.troops = l.t0 = Math.round(T * l.pct / 100); if (l.troops <= 0) { l.broken = true; } });
        st.reserve = T - our.reduce((a, l) => a + l.troops, 0);
        st.round = 1; genIntents(); roundView();
      };
    };

    function genIntents() {
      const W = { cav: { charge: .65, hold: .35 }, spear: { charge: .4, hold: .6 }, gun: { shoot: .6, hold: .3, charge: .1 } };
      const pw = PERS[pers].w || {};
      foe.forEach((f, i) => {
        if (f.broken) return;
        if (our[i].broken) { f.intent = 'charge'; f.shown = 'charge'; return; }
        const ws = Object.assign({}, W[f.type]);
        Object.keys(pw).forEach(k => { if (ws[k] !== undefined) ws[k] += pw[k]; });
        const tot = Object.values(ws).reduce((x, y) => x + y, 0);
        let t = rnd() * tot; f.intent = 'hold';
        for (const k of Object.keys(ws)) { t -= ws[k]; if (t <= 0) { f.intent = k; break; } }
        if (weather() === 'rain' && f.intent === 'shoot') f.intent = 'hold';
        f.shown = f.intent;
        if (PERS[pers].fake && rnd() < PERS[pers].fake) { const opts = Object.keys(W[f.type]).filter(k => k !== f.intent); if (opts.length) f.shown = pick(opts); }
      });
      const n = Math.max(0, 1 + (best('c') >= 80 ? 1 : 0) + (bonus('foresight') ? 1 : 0) + (st.intel ? 1 : 0) - (weather() === 'mist' ? 1 : 0));
      const alive = shuffle(foe.filter(f => !f.broken));
      foe.forEach(f => { f.known = false; });
      alive.slice(0, n).forEach(f => { f.known = true; });
    }
    function planList() {
      const L = [];
      (def.specials || []).forEach(sp => {
        if (st.used[sp.id] && !MULTI.has(sp.id)) return;
        if (sp.rounds && !sp.rounds.includes(Math.min(st.round, 3))) return;
        if (sp.req && !sp.req(G)) return;
        L.push({ key: 'sp:' + sp.id, n: sp.n, d: sp.d || '', pct: sp.instant || sp.noAttack ? undefined : Math.round(clamp(sp.p(G) + st.buff, .03, .97) * 100) });
      });
      if (st.plotN < (S.fac === 'mori' ? 2 : 1)) L.push({ key: 'plot', n: '調略敵軍', d: `勸誘兵力最多的一路敵軍倒戈撤走一半（每戰 ${S.fac === 'mori' ? 2 : 1} 次）`, pct: Math.round(plotP() * 100) });
      if (S.fac === 'takeda' && !st.furinUsed) L.push({ key: 'furin', n: '風林火山', d: '本回合全軍攻擊 +40%（每戰一次）' });
      if (S.fac === 'uesugi' && !st.biUsed) L.push({ key: 'bi', n: '毘沙門天的加護', d: '本回合「進攻」的各路不會被敵軍固守或射擊壓制（每戰一次）' });
      if (S.fac === 'oda' && !st.sanUsed && our.some(l => l.type === 'gun' && !l.broken)) L.push({ key: 'san', n: '鐵砲輪射', d: '本回合鐵砲隊攻擊 ×1.8（每戰一次）' });
      if (S.fac === 'tokugawa' && S.gauge >= 100) L.push({ key: 'burst', n: '忍耐爆發', d: '本回合我軍不受任何損失（消耗忍 100）' });
      return L;
    }

    const colRound = i => {
      const l = our[i];
      if (l.broken) return `<div class="col"><div class="col-h">${LANE[i]}</div><span class="fine">潰走</span></div>`;
      return `<div class="col"><div class="col-h">${LANE[i]}</div><div class="ords">${Object.keys(ORD).map(k => {
        const dis = k === 'feint' && !(l.g && stat(l.g, 'c') >= 60);
        return `<button class="ord ${l.order === k ? 'on' : ''}" data-i="${i}" data-o="${k}" ${dis ? 'disabled' : ''} title="${dis ? '誘敵需要智謀 60 以上的大將' : ORD[k]}"><svg viewBox="-16 -16 32 32" class="ord-ic" aria-hidden="true">${TArt.icon(k)}</svg><span>${ORD[k]}</span></button>`;
      }).join('')}</div></div>`;
    };
    const roundView = () => {
      const plans = planList();
      if (st.plan && !plans.some(p => p.key === st.plan)) st.plan = null;
      const roundText = def.roundText && def.roundText[Math.min(st.round, 3)];
      const cur = plans.find(p => p.key === st.plan);
      const news = st.log.slice(st.logMark || 0);
      openModal(`<div class="sheet-body bf-body">
        <div class="bf-head"><div><div class="kicker">${esc(def.n)}・${FORMS[st.form].n}之陣</div><h2>第${RNX[st.round]}回合 <small class="fine">／ ${maxR}${survive ? '・撐過即勝' : ''}</small></h2></div>${legend}</div>
        ${roundText ? `<p class="bf-say">${esc(roundText)}</p>` : ''}
        ${tags()}
        ${svgField('round')}
        <div class="bf-ctl3">${[0, 1, 2].map(colRound).join('')}</div>
        <div class="bf-ctl">
          ${!st.resUsed && st.reserve > 0 ? `<div class="row"><span class="rlbl">預備隊 ${fmt(st.reserve)}</span>${['保留', ...LANE].map((n, k) => `<button class="rsv ${st.resTo === k - 1 ? 'on' : ''}" data-k="${k - 1}" ${k > 0 && our[k - 1].broken ? 'disabled' : ''}>${n}</button>`).join('')}</div>` : ''}
          ${plans.length ? `<div class="row"><span class="rlbl">計策</span>${plans.map(p => `<button class="plan ${st.plan === p.key ? 'on' : ''}" data-k="${p.key}" title="${esc(p.d)}">${esc(p.n)}${p.pct !== undefined ? ` <small class="num">${p.pct}%</small>` : ''}</button>`).join('')}</div>${cur ? `<p class="fine">${esc(cur.d)}</p>` : ''}` : ''}
        </div>
        <div class="bf-foot">${news.length ? `<details class="bf-log"><summary>戰報</summary>${news.map(l => `<p class="${l.c}">${esc(l.t)}</p>`).join('')}</details>` : '<span></span>'}<div class="actions">${!def.boss ? '<button class="btn" id="bf-retreat">撤退</button>' : ''}<button class="btn btn-shu" id="bf-go">下令</button></div></div>
        <details class="bf-help"><summary>怎麼下令？</summary><p>看敵軍旁的圖示：敵軍<b>突擊</b>時用固守或誘敵反制；敵軍<b>固守、射擊</b>時就進攻。問號代表意圖不明。擊潰兩路，或讓敵本陣士氣（陣幕下的紅條）歸零就能獲勝。</p></details>
      </div>`, { quiet: true, keepScroll: true });
      document.querySelectorAll('#modal .ord').forEach(b => b.onclick = () => { our[+b.dataset.i].order = b.dataset.o; roundView(); });
      document.querySelectorAll('#modal .rsv').forEach(b => b.onclick = () => { st.resTo = +b.dataset.k; roundView(); });
      document.querySelectorAll('#modal .plan').forEach(b => b.onclick = () => { st.plan = st.plan === b.dataset.k ? null : b.dataset.k; roundView(); });
      const rb = $('#bf-retreat'); if (rb) rb.onclick = () => end('retreat');
      $('#bf-go').onclick = exec;
      setTimeout(() => { tutor('round'); if (plans.some(p => p.key === 'sp:storm')) tutor('storm'); }, 200);
      if (st.fx) {
        const f = st.fx; st.fx = null;
        const svg = $('#modal .bfsvg');
        f.lanes.forEach((x, i) => {
          if (x.order) TFx.clash(svg, i, { order: x.order, intent: x.intent, ourType: x.ourType, x: LX[i], oy: ourY(i), ey: foeY(i) });
          setTimeout(() => {
            if (!svg || !svg.isConnected) return;
            if (x.toFoe) TFx.floatText(svg.querySelector(`.blk.foe[data-i="${i}"]`), `-${fmt(x.toFoe)}`, '');
            if (x.toUs) TFx.floatText(svg.querySelector(`.blk.our[data-i="${i}"]`), `-${fmt(x.toUs)}`, 'bad');
          }, TFx.ok() ? 380 : 0);
        });
        if (f.hq) TFx.floatText(svg.querySelector('.hqcamp.foe'), `士氣 -${f.hq}`, '');
        if (f.ourHq) TFx.floatText(svg.querySelector('.hqcamp.our'), `士氣 -${f.ourHq}`, 'bad');
        if (f.plan === 'ok') TFx.flash($('#modal .bf-body'), 'rgba(255,240,200,.35)');
        if (f.plan === 'ng') TFx.flash($('#modal .bf-body'), 'rgba(120,20,10,.25)');
      }
    };

    const exec = () => {
      st.logMark = st.log.length;
      const plan = st.plan; st.plan = null;
      let atkMul = 1 + st.buff, lossMul = (FORMS[st.form].lossMul || 1) * (1 - Math.min(.5, bonus('def'))) * (S.fac === 'hojo' && (survive || def.defense) ? .7 : 1) * (S.fac === 'chosokabe' ? 1.1 : 1) * (weather() === 'snow' ? 1.05 : 1), hqHit = 0, noPenalty = false, gunMul = 1;
      const fx = { lanes: [{}, {}, {}] };
      if (st.resTo >= 0 && !st.resUsed && !our[st.resTo].broken) {
        const l = our[st.resTo];
        l.troops += st.reserve; l.t0 += st.reserve;
        st.log.push({ c: 'ok', t: `預備隊 ${fmt(st.reserve)} 人投入${LANE[st.resTo]}。` });
        st.reserve = 0; st.resUsed = true;
      }
      st.resTo = -1;
      if (plan) {
        if (plan.startsWith('sp:')) {
          const sp = def.specials.find(x => 'sp:' + x.id === plan);
          st.used[sp.id] = 1;
          if (sp.instant === 'history') return end('history');
          if (sp.instant === 'withdraw') return end('withdraw');
          if (sp.noAttack) {
            st.buff += sp.buff || 0;
            st.log.push({ c: 'ok', t: `${sp.n}。之後全軍攻擊 +${Math.round((sp.buff || 0) * 100)}%。` });
          } else if (rnd() < clamp(sp.p(G) + st.buff, .03, .97)) {
            if (sp.dmg >= 999) { st.log.push({ c: 'ok', t: `${sp.n}成功！` }); if (sp.eff) applyEff(sp.eff); return end('win'); }
            const h = Math.round(sp.dmg * .6);
            hqHit += h;
            if (sp.lossMul !== undefined) lossMul *= sp.lossMul;
            st.log.push({ c: 'ok', t: `${sp.n}成功！${h ? `敵本陣士氣 -${h}。` : ''}` });
            if (sp.prov && S.owners[sp.prov] !== S.fac) { S.owners[sp.prov] = S.fac; (S.newProv = S.newProv || []).push(sp.prov); st.log.push({ c: 'ok', t: `取得${TMap.byId[sp.prov].n}。` }); }
            const lg = bestBy(id => stat(id, 'c')); if (lg) gainMerit(lg, def.boss ? 3 : 2);
            fx.plan = 'ok';
          } else {
            lossMul *= sp.failLoss || 1.2;
            st.log.push({ c: 'ng', t: sp.failText || `${sp.n}失敗了。` });
            fx.plan = 'ng';
          }
          if (sp.eff) applyEff(sp.eff);
        } else if (plan === 'plot') {
          st.plotN++;
          if (rnd() < plotP()) {
            const tgt = foe.filter(f => !f.broken).sort((a, b) => b.troops - a.troops)[0];
            if (tgt) { tgt.troops = Math.round(tgt.troops * .5); tgt.intent = 'hold'; st.log.push({ c: 'ok', t: `調略成功！敵方${LANE[foe.indexOf(tgt)]}有一半人馬倒戈撤走。` }); fx.plan = 'ok'; }
            const lg = bestBy(id => stat(id, 'c') + stat(id, 'a')); if (lg) gainMerit(lg, 2);
          } else { st.log.push({ c: 'ng', t: '調略失敗，使者被趕了回來。' }); fx.plan = 'ng'; }
        } else if (plan === 'furin') { st.furinUsed = true; atkMul += .4; st.log.push({ c: 'ok', t: '「疾如風，徐如林，侵掠如火，不動如山」——全軍攻擊大增！' }); }
        else if (plan === 'bi') { st.biUsed = true; noPenalty = true; st.log.push({ c: 'ok', t: '「毘」字旗高高舉起，全軍奮勇向前！' }); }
        else if (plan === 'san') { st.sanUsed = true; gunMul = 1.8; st.log.push({ c: 'ok', t: '鐵砲隊輪番射擊，槍聲不絕！' }); }
        else if (plan === 'burst') { S.gauge = 0; lossMul = 0; st.log.push({ c: 'ok', t: '你咬緊牙關，全軍穩住陣腳：本回合毫無損失！' }); }
      }
      const tm = def.terrain === 'mountain' ? { cav: .8 } : def.terrain === 'plain' ? { cav: 1.15 } : {};
      const fm = FORMS[st.form].m, hqMul = FORMS[st.form].hqMul || 1;
      const gm = id => id ? 1 + (stat(id, 'w') - 50) / 150 : .85;
      const ctr = (a, b, ours) => BEATS[a] === b ? (a === 'gun' && ours && S.fac === 'oda' ? 1.7 : 1.5) : BEATS[b] === a ? .7 : 1;
      let sumFoe = 0, sumUs = 0;
      [0, 1, 2].forEach(i => {
        const l = our[i], f = foe[i];
        if (l.broken && f.broken) return;
        if (f.broken) {
          if (l.order === 'atk') { const h = clamp(Math.round(12 + 25 * l.troops / (EP / 3)), 10, 40); hqHit += h; st.log.push({ c: 'ok', t: `${LANE[i]}突破敵陣，直撲敵本陣（士氣 -${h}）。` }); }
          return;
        }
        if (l.broken) {
          const h = Math.round(hqMul * clamp(12 + 25 * f.troops / (T / 3), 10, 40));
          st.hq.our -= h; fx.ourHq = (fx.ourHq || 0) + h;
          st.log.push({ c: 'ng', t: `敵軍從${LANE[i]}突入，我本陣士氣 -${h}。` });
          return;
        }
        const mx = MX[l.order][f.intent].slice();
        if (noPenalty && l.order === 'atk') { mx[0] = Math.max(mx[0], 1); mx[1] = Math.min(mx[1], 1); }
        if (l.type === 'cav' && f.intent === 'shoot' && l.order === 'atk') mx[1] *= .85;
        if (f.known && f.shown !== f.intent) st.log.push({ c: 'ng', t: `敵將虛晃一招！${LANE[i]}其實是「${INTENT[f.intent]}」。` });
        const ourP = l.troops * ctr(l.type, f.type, true) * fm[i] * gm(l.g) * (tm[l.type] || 1) * atkMul * wx(l.type) * (l.order === 'feint' && weather() === 'mist' ? 1.25 : 1)
          * (l.type === 'gun' ? gunMul * (1 + bonus('gun')) : 1)
          * (l.order === 'atk' ? 1 + bonus('atk') + (S.fac === 'uesugi' ? .1 : 0) : 1)
          * (l.order === 'feint' ? 1 + bonus('amb') : 1)
          * (bonus('lowhp') && l.troops < l.t0 * .4 ? 1.3 : 1);
        const foeP = f.troops * ctr(f.type, l.type, false) * (tm[f.type] || 1) * (f.intent === 'hold' && def.terrain === 'mountain' ? 1.15 : 1) * FORMS[foeForm].m[i] * wx(f.type);
        const toFoe = Math.round(Math.min(ourP * .17 * mx[0] * (.9 + rnd() * .2) * (FORMS[foeForm].lossMul || 1), f.t0 * .45 * Math.max(mx[0], .3)));
        const toUs = Math.round(Math.min(foeP * .17 * mx[1] * (.9 + rnd() * .2) * lossMul * (survive && bonus('siege') ? .8 : 1), l.t0 * (def.cap || .45) * Math.max(mx[1], .3)));
        f.troops = Math.max(0, f.troops - toFoe); l.troops = Math.max(0, l.troops - toUs);
        sumFoe += toFoe; sumUs += toUs;
        fx.lanes[i] = { toFoe, toUs, order: l.order, intent: f.intent, ourType: l.type };
        if (l.order === 'atk' && l.type === 'gun') fx.gun = true;
        if (l.order === 'atk' && l.type === 'cav') fx.charge = true;
        st.log.push({ c: toFoe >= toUs ? 'ok' : 'ng', t: `${LANE[i]}：我軍${ORD[l.order]}、敵軍${INTENT[f.intent]}——敵 -${fmt(toFoe)}，我 -${fmt(toUs)}。` });
        if (l.g && toFoe > toUs) gainMerit(l.g, def.boss ? 2 : 1);
        if (f.troops < f.t0 * .25) { f.broken = true; st.hq.foe -= 25; st.log.push({ c: 'ok', t: `敵方${LANE[i]}潰走了！敵本陣士氣 -25。` }); }
        if (l.troops < l.t0 * .25) { l.broken = true; st.hq.our -= Math.round(25 * hqMul); st.log.push({ c: 'ng', t: `我方${LANE[i]}潰走了！本陣士氣 -${Math.round(25 * hqMul)}。` }); }
      });
      if (st.foeRes > 0) {
        const weak = foe.map((f, i) => [f, i]).filter(([f]) => !f.broken).sort((a, b) => a[0].troops / a[0].t0 - b[0].troops / b[0].t0)[0];
        if (weak && ((pers === 'aggressive' && st.round >= 2) || weak[0].troops < weak[0].t0 * .5)) {
          weak[0].troops += st.foeRes; weak[0].t0 += st.foeRes;
          st.log.push({ c: 'ng', t: `敵軍預備隊 ${fmt(st.foeRes)} 人投入${LANE[weak[1]]}！` });
          fx.foeRes = weak[1]; st.foeRes = 0;
        }
      }
      if (st.form === 'kakuyoku' && foe[0].broken && foe[2].broken && !st.encircled) { st.encircled = true; hqHit += 30; st.log.push({ c: 'ok', t: '鶴翼合圍！兩翼包抄敵本陣（士氣 -30）。' }); }
      if (hqHit) { st.hq.foe -= hqHit; fx.hq = hqHit; }
      if (S.fac === 'tokugawa' && sumUs > sumFoe) S.gauge = clamp(S.gauge + 6, 0, 100);
      st.fx = fx;
      TAudio.sfx(fx.gun ? 'gun' : 'clash');
      const fb = foe.filter(f => f.broken).length, ob = our.filter(l => l.broken).length;
      if (st.hq.foe <= 0 || fb >= 2) return end('win');
      if (st.hq.our <= 0 || ob >= 2) return end('lose');
      st.round++;
      if (st.round > maxR) {
        if (survive) return end('win');
        const ourT = our.reduce((a, l) => a + l.troops, 0) + st.reserve, foeT = foe.reduce((a, f) => a + f.troops, 0);
        st.narrow = true;
        return end(st.hq.foe + foeT / EP * 40 < st.hq.our + ourT / T * 40 ? 'win' : 'lose');
      }
      genIntents(); refresh(); roundView();
    };

    const end = res => {
      const fx = [];
      const left = total();
      if (!def.local) S.troops = Math.max(0, Math.round(res === 'retreat' ? (bonus('escape') ? Math.max(left, S.troops * .9) : left * .95) : res === 'withdraw' ? Math.max(left, S.troops * .85) : left));
      if (res === 'history') { S.over = true; closeModal(); return ending('history'); }
      let title, text, cls;
      if (res === 'win') {
        S.stats.wins++;
        title = st.narrow ? '辛勝' : '勝利'; cls = 'win';
        const w = def.win || { t: `敵軍潰散了。${def.target ? TMap.byId[def.target].n + '落入你的手中。' : ''}`, eff: { gold: 25, pres: 5 } };
        text = w.t;
        const eff = Object.assign({}, w.eff);
        eff.pres = Math.round(((eff.pres || 0) + bonus('winpres')) * (S.fac === 'uesugi' ? 1.5 : 1));
        eff.gold = (eff.gold || 0) + bonus('wingold');
        if (w.prov) eff.prov = w.prov;
        if (def.target) eff.prov = [def.target];
        fx.push(...applyEff(eff));
        if (def.target && PRODUCT[def.target] && !(S.gotProd = S.gotProd || []).includes(def.target)) {
          const pr = PRODUCT[def.target]; S.gotProd.push(def.target);
          text += `\n你取得了當地的特產「${pr.n}」。`;
          fx.push(...applyEff(pr.eff));
        }
        S.gens.forEach(id => gainMerit(id, 1));
        if (S.gens.length) fx.push({ t: '全體家臣 功勳 +1', c: 'up' });
        if (!def.boss && rnd() < .25) {
          const g = weightedGen(poolGens([1, 2]).filter(x => x.home === def.foe).concat(rnd() < .4 ? poolGens([1, 2]) : []));
          if (g && S.gens.length < MAX_GENS) { addGen(g.id, fx); text += `\n敵將${g.n}被你的氣度折服，前來投降。`; }
        }
      } else if (def.defense) {
        title = '失守'; cls = 'lose'; text = def.lose;
        S.owners[def.lost] = def.foe; if (S.lords) delete S.lords[def.lost];
        fx.push({ t: `失去${TMap.byId[def.lost].n}`, c: 'dn' }, ...applyEff({ pres: -5 }));
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
      openModal(`${head(yearLabel(S.year))}<div class="sheet-body"><div class="result-title ${cls}">${title}</div><h2>${esc(def.n)}</h2>
        <p class="story">${esc(text)}</p><p class="fine">剩餘兵力 ${fmt(left)}${def.local ? '（隨從）' : ''}</p>${fxHtml(fx)}${histHtml(def.hist)}
        <div class="actions"><button class="btn btn-shu" id="m-ok">${S.over ? '……' : '繼續'}</button></div></div>`, { quiet: true });
      TFx.stamp($('#modal .sheet'), cls === 'win' ? '勝' : res === 'lose' ? '敗' : '退', cls === 'win');
      TAudio.sfx(cls === 'win' ? 'win' : 'lose'); TAudio.play('calm');
      if (cls === 'win') TFx.charge($('#modal .scene'), true);
      $('#m-ok').focus();
      $('#m-ok').onclick = () => {
        if (S.over) { closeModal(); return def.loseEnding ? ending(def.loseEnding) : ending('fall', def.lose); }
        if (res === 'win' && bid === 'okehazama' && !META.unlock.imagawa) { META.unlock.imagawa = 1; saveMeta(); toast('<b>今川家</b> 已開放！'); }
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
    if (kind === 'win' || kind === 'history') {
      if (!META.clears.includes(fac)) META.clears.push(fac);
      const un = (id, msg) => { if (!META.unlock[id]) { META.unlock[id] = 1; unlocks.push(msg); } };
      if (fac === 'takeda' || fac === 'uesugi') un('hojo', '北條家已開放');
      un('mori', '毛利家已開放');
      if (META.clears.length >= 2) un('chosokabe', '長宗我部家已開放');
    }
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
            : `<div class="centry unseen"><div class="hd"><div class="face" style="background:var(--line);display:grid;place-items:center;font-family:var(--f-brush);font-size:1.4rem;color:var(--paper)">？</div><div><h4>？？？</h4><div class="yrs">${lifeText(g)}</div></div></div><p>尚未遇見。</p></div>`;
        }).join('')}</div>`;
      } else if (tab === 'geo') {
        const owned = META.seen.prov || [];
        body = `<p class="fine">古代日本把全國分成「五畿七道」，底下再分成六十多個「令制國」。戰國時代的人說的「尾張」「甲斐」，就是這些國名；明治時代（1871 年）廢藩置縣後，才改成今天的都道府縣。金框代表你曾經統治過的國。</p>
          ${Object.entries(TMap.REGION).map(([r, ids]) => `<div class="geo-region"><h3>${r}</h3><div class="geo-list">${ids.map(i => { const p = TMap.byId[i]; return p.lbl || i === 'ezo' ? `<div class="geo ${owned.includes(i) ? 'owned' : ''}"><b>${p.n}</b><span>${esc(p.now)}</span>${owned.includes(i) ? '<small>曾經統治</small>' : ''}</div>` : ''; }).join('')}</div></div>`).join('')}`;
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
        <div class="ctabs">${[['gens', '武將'], ['treas', '名物'], ['syn', '羈絆'], ['ev', '事件'], ['geo', '地理'], ['tl', '年表']].map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" data-t="${k}">${n}</button>`).join('')}</div>
        ${body}</div></div>`;
      document.querySelectorAll('.ctabs button').forEach(b => b.onclick = () => { tab = b.dataset.t; draw(); });
      $('#c-back').onclick = back;
    };
    draw();
  }
  const WTITLE = { w_okehazama: '桶狹間之戰', w_kanto: '長尾景虎繼承關東管領', w_kawanakajima: '第四次川中島之戰', w_kiyosu: '清洲同盟', w_ieyasu: '松平元康改名家康', w_tokugawa: '家康改姓德川', w_mino: '信長攻下美濃', w_oichi: '阿市嫁給淺井長政', w_joraku: '信長擁立足利義昭上洛', w_suruga: '武田、德川瓜分今川領', w_kanegasaki: '金崎之退口', w_anegawa: '姉川之戰', w_motonari: '毛利元就逝世', w_hieizan: '火燒比叡山', w_saijo: '信玄的西上作戰', w_mikata: '三方原之戰', w_shingen: '武田信玄病逝', w_bakufu: '室町幕府滅亡', w_asai: '淺井・朝倉滅亡', w_nagashino: '長篠之戰', w_azuchi: '安土城築城', w_matsunaga: '松永久秀與平蜘蛛', w_kenshin: '上杉謙信病逝・御館之亂', w_ishiyama: '石山合戰結束', w_koshu: '武田家滅亡', w_ujiyasu: '北條氏康病逝' };
  const worldTitle = w => WTITLE[w.id] || w.id;

  document.addEventListener('pointerdown', () => TAudio.unlock());
  document.addEventListener('click', e => { if (e.target.closest('button')) TAudio.sfx('click'); });
  showTitle();
})();

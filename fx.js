// 天下之道 — 動畫（GSAP）；減少動態效果或套件載入失敗時，全部直接略過
window.TFx = (function () {
  const reduce = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // 動畫模式：auto 依系統「減少動態效果」設定；on／off 由玩家指定
  let mode = 'auto';
  try { mode = localStorage.getItem('tenka.anim') || 'auto'; } catch (e) { }
  function applyMode() {
    document.documentElement.classList.toggle('anim-on', mode === 'on');
    document.documentElement.classList.toggle('anim-off', mode === 'off');
  }
  applyMode();
  function setMode(m) { mode = m; try { localStorage.setItem('tenka.anim', m); } catch (e) { } applyMode(); }
  const motion = () => mode === 'on' || (mode === 'auto' && !reduce());
  const ok = () => !!window.gsap && motion();
  const g = () => window.gsap;

  // 捲軸展開
  function modalIn(sheet) {
    if (!ok() || !sheet) return;
    g().fromTo(sheet, { clipPath: 'inset(0% 49% 0% 49%)', opacity: .4 }, { clipPath: 'inset(0% 0% 0% 0%)', opacity: 1, duration: .6, ease: 'power3.out', clearProps: 'clipPath' });
    sceneIn(sheet);
    const body = sheet.querySelector('.sheet-body');
    if (body) g().from(body.children, { opacity: 0, y: 10, duration: .45, stagger: .05, delay: .25, ease: 'power2.out', clearProps: 'all' });
  }
  function sceneIn(root) {
    if (!ok() || !root) return;
    const lays = root.querySelectorAll('.scene .lay3, .scene .lay2, .scene .lay1, .scene .lay0');
    if (lays.length) g().from(lays, { x: i => 12 + i * 10, opacity: 0, duration: 1, stagger: .07, ease: 'power2.out' });
    const sun = root.querySelector('.scene .sunl');
    if (sun) g().from(sun, { y: 24, opacity: 0, duration: 1.4, ease: 'power1.out' });
    const our = root.querySelectorAll('.scene .army-our'), foe = root.querySelectorAll('.scene .army-foe');
    if (our.length) g().from(our, { x: -40, opacity: 0, duration: 1.1, ease: 'power2.out', delay: .2 });
    if (foe.length) g().from(foe, { x: 40, opacity: 0, duration: 1.1, ease: 'power2.out', delay: .2 });
  }
  function contentSwap(sheet) {
    if (!ok() || !sheet) return;
    const body = sheet.querySelector('.sheet-body');
    if (body) g().from(body, { opacity: .2, y: 6, duration: .25, ease: 'power1.out', clearProps: 'all' });
  }

  // 章節標題卡
  function chapterCard(kicker, title, done) {
    if (!ok()) return done();
    const el = document.createElement('div');
    el.className = 'chapcard';
    el.innerHTML = `<div class="cc-wash"></div><div class="cc-in"><div class="cc-k">${kicker}</div><div class="cc-t">${[...title].map(c => `<span>${c}</span>`).join('')}</div><div class="cc-seal">天下</div></div>`;
    document.body.appendChild(el);
    const tl = g().timeline({ onComplete: () => { el.remove(); done(); } });
    tl.from(el.querySelector('.cc-wash'), { scaleX: 0, transformOrigin: 'left center', duration: .5, ease: 'power3.inOut' })
      .from(el.querySelector('.cc-k'), { opacity: 0, y: -10, duration: .3 })
      .from(el.querySelectorAll('.cc-t span'), { opacity: 0, y: 30, filter: 'blur(6px)', duration: .5, stagger: .09, ease: 'power3.out' }, '-=.1')
      .from(el.querySelector('.cc-seal'), { scale: 2.6, rotate: -25, opacity: 0, duration: .35, ease: 'back.out(2.2)' }, '-=.15')
      .to(el, { opacity: 0, duration: .45, delay: 1.1 });
    el.addEventListener('click', () => tl.progress(1));
  }

  // 合戰效果
  function floatText(anchor, text, cls) {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const s = document.createElement('div');
    s.className = 'float-num ' + (cls || '');
    s.textContent = text;
    s.style.left = (r.left + r.width / 2) + 'px'; s.style.top = (r.top) + 'px';
    document.body.appendChild(s);
    if (!ok()) { setTimeout(() => s.remove(), 900); return; }
    g().fromTo(s, { y: 0, opacity: 1, scale: .6 }, { y: -46, opacity: 0, scale: 1.25, duration: 1.2, ease: 'power2.out', onComplete: () => s.remove() });
  }
  function shake(el, amt = 6) {
    if (!ok() || !el) return;
    g().fromTo(el, { x: 0 }, { x: amt, duration: .06, repeat: 5, yoyo: true, ease: 'none', clearProps: 'x' });
  }
  function flash(el, color) {
    if (!ok() || !el) return;
    const f = document.createElement('div'); f.className = 'fx-flash'; f.style.background = color;
    el.appendChild(f);
    g().fromTo(f, { opacity: .55 }, { opacity: 0, duration: .5, onComplete: () => f.remove() });
  }
  // 箭矢或鐵砲齊射，從一方飛向另一方
  function volley(svg, fromLeft, kind) {
    if (!ok() || !svg) return;
    const ns = 'http://www.w3.org/2000/svg';
    const grp = document.createElementNS(ns, 'g'); grp.setAttribute('class', 'volley');
    svg.appendChild(grp);
    const n = kind === 'gun' ? 10 : 14;
    for (let i = 0; i < n; i++) {
      const y = 110 + Math.random() * 70;
      const el = document.createElementNS(ns, kind === 'gun' ? 'circle' : 'line');
      if (kind === 'gun') { el.setAttribute('r', '1.8'); el.setAttribute('cx', fromLeft ? 140 : 460); el.setAttribute('cy', y); el.setAttribute('class', 'shot'); }
      else { el.setAttribute('x1', 0); el.setAttribute('y1', 0); el.setAttribute('x2', fromLeft ? 14 : -14); el.setAttribute('y2', -3); el.setAttribute('class', 'arrow'); el.setAttribute('transform', `translate(${fromLeft ? 140 : 460},${y})`); }
      grp.appendChild(el);
      const dx = (fromLeft ? 1 : -1) * (260 + Math.random() * 80);
      g().fromTo(el, { x: 0, y: 0, opacity: 1 }, { x: dx, y: kind === 'gun' ? Math.random() * 10 - 5 : 10, opacity: 0, duration: kind === 'gun' ? .35 : .7, delay: Math.random() * .25, ease: kind === 'gun' ? 'none' : 'power1.in' });
      if (kind === 'gun') {
        const puff = document.createElementNS(ns, 'circle');
        puff.setAttribute('cx', fromLeft ? 140 : 460); puff.setAttribute('cy', y); puff.setAttribute('r', '6'); puff.setAttribute('class', 'puff');
        grp.appendChild(puff);
        g().fromTo(puff, { scale: .3, opacity: .8, transformOrigin: 'center' }, { scale: 2.4, opacity: 0, duration: .9, ease: 'power1.out' });
      }
    }
    setTimeout(() => grp.remove(), 1400);
  }
  // 三路合戰：部隊互衝、射擊沿直線飛向對面
  function clash(svg, i, o) {
    if (!ok() || !svg) return;
    const our = svg.querySelector(`.blk.our[data-i="${i}"] .blk-in`), foe = svg.querySelector(`.blk.foe[data-i="${i}"] .blk-in`);
    const oy = o.order === 'atk' ? -34 : o.order === 'feint' ? 20 : -6;
    const fy = o.intent === 'charge' ? (o.order === 'feint' ? 46 : 30) : o.intent === 'shoot' ? 0 : 6;
    if (our) g().fromTo(our, { y: 0 }, { y: oy, duration: .38, yoyo: true, repeat: 1, ease: 'power2.inOut' });
    if (foe) g().fromTo(foe, { y: 0 }, { y: fy, duration: .38, yoyo: true, repeat: 1, ease: 'power2.inOut', delay: .06 });
    const ns = 'http://www.w3.org/2000/svg';
    const shoot = (fromY, toY, kind) => {
      for (let k = 0; k < 7; k++) {
        const x = o.x - 30 + Math.random() * 60;
        const el = document.createElementNS(ns, kind === 'gun' ? 'circle' : 'line');
        if (kind === 'gun') { el.setAttribute('r', '1.8'); el.setAttribute('cx', x); el.setAttribute('cy', fromY); el.setAttribute('class', 'shot'); }
        else { el.setAttribute('x1', x); el.setAttribute('y1', fromY); el.setAttribute('x2', x); el.setAttribute('y2', fromY + (toY > fromY ? 10 : -10)); el.setAttribute('class', 'arrow'); }
        svg.appendChild(el);
        g().fromTo(el, { y: 0, opacity: 1 }, { y: toY - fromY, opacity: 0, duration: kind === 'gun' ? .3 : .6, delay: Math.random() * .3, ease: 'none', onComplete: () => el.remove() });
        if (kind === 'gun') {
          const p = document.createElementNS(ns, 'circle');
          p.setAttribute('cx', x); p.setAttribute('cy', fromY); p.setAttribute('r', '5'); p.setAttribute('class', 'puff');
          svg.appendChild(p);
          g().fromTo(p, { scale: .3, opacity: .8, transformOrigin: 'center' }, { scale: 2.2, opacity: 0, duration: .9, onComplete: () => p.remove() });
        }
      }
    };
    if (o.ourType === 'gun' || o.order !== 'atk') shoot(o.oy - 20, o.ey + 10, o.ourType === 'gun' ? 'gun' : 'arrow');
    if (o.intent === 'shoot') shoot(o.ey + 10, o.oy - 10, 'gun');
  }
  function charge(svg, our) {
    if (!ok() || !svg) return;
    const a = svg.querySelectorAll(our ? '.army-our' : '.army-foe');
    if (a.length) g().fromTo(a, { x: 0 }, { x: our ? 60 : -60, duration: .45, yoyo: true, repeat: 1, ease: 'power2.inOut' });
  }
  function stamp(container, char, win) {
    const s = document.createElement('div');
    s.className = 'stamp ' + (win ? 'win' : 'lose');
    s.textContent = char;
    container.appendChild(s);
    if (!ok()) return;
    g().fromTo(s, { scale: 3, rotate: -28, opacity: 0 }, { scale: 1, rotate: -10, opacity: .92, duration: .45, ease: 'back.out(2.4)', delay: .15 });
    shake(container, 4);
  }

  // 地圖：新取得的國
  function capture(cell) {
    if (!ok() || !cell) return;
    g().fromTo(cell, { fillOpacity: 1, strokeWidth: 6 }, { fillOpacity: .72, strokeWidth: .7, duration: 1.6, ease: 'power2.out', clearProps: 'fillOpacity,strokeWidth' });
  }
  // 路線：朱印移動到下一個節點
  function travel(wrap, from, to, done) {
    if (!ok() || !wrap || !to) return done();
    const m = document.createElement('div'); m.className = 'traveler';
    wrap.appendChild(m);
    const p = el => ({ left: el.offsetLeft, top: el.offsetTop });
    const a = from ? p(from) : { left: p(to).left, top: p(to).top - 60 }, b = p(to);
    g().fromTo(m, { left: a.left, top: a.top, scale: .6 }, { left: b.left, top: b.top, scale: 1, duration: .45, ease: 'power2.inOut', onComplete: () => { m.remove(); done(); } });
  }
  function countUp(el, from, to, fmt) {
    if (!el) return;
    if (!ok()) { el.textContent = fmt(to); return; }
    const o = { v: from };
    g().to(o, { v: to, duration: .7, ease: 'power2.out', onUpdate: () => { el.textContent = fmt(o.v); } });
  }
  function pop(el) {
    if (!ok() || !el) return;
    g().fromTo(el, { scale: .85, opacity: 0 }, { scale: 1, opacity: 1, duration: .45, ease: 'back.out(2)', clearProps: 'all' });
  }
  function titleIntro(root) {
    if (!ok() || !root) return;
    const tl = g().timeline();
    tl.from(root.querySelectorAll('.title-name .ch'), { opacity: 0, y: -26, filter: 'blur(8px)', duration: .7, stagger: .16, ease: 'power3.out' })
      .from(root.querySelector('.title-name .seal'), { scale: 2.4, rotate: -30, opacity: 0, duration: .4, ease: 'back.out(2)' }, '-=.2')
      .from(root.querySelectorAll('.title-side > *'), { opacity: 0, x: 16, duration: .5, stagger: .08 }, '-=.3');
  }
  function stagger(nodes) {
    if (!ok() || !nodes || !nodes.length) return;
    g().from(nodes, { opacity: 0, y: 14, duration: .4, stagger: .04, ease: 'power2.out', clearProps: 'all' });
  }

  return { ok, motion, reduce, getMode: () => mode, setMode, modalIn, contentSwap, sceneIn, chapterCard, floatText, shake, flash, volley, clash, charge, stamp, capture, travel, countUp, pop, titleIntro, stagger };
})();

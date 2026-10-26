// 天下之道 — 美術：家紋、武將肖像、情景插畫
window.TArt = (function () {
  // ───────── 家紋（viewBox -50..50，使用 currentColor） ─────────
  function crest(type) {
    const ring = '<circle r="46" fill="none" stroke="currentColor" stroke-width="5"/>';
    let g = '';
    switch (type) {
      case 'hishi': // 武田菱
        g = '<g transform="scale(1,.72) rotate(45)">' + [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([i, j]) => `<rect x="${i > 0 ? 2.5 : -29.5}" y="${j > 0 ? 2.5 : -29.5}" width="27" height="27"/>`).join('') + '</g>';
        return `<svg viewBox="-50 -50 100 100" fill="currentColor" aria-hidden="true">${g}</svg>`;
      case 'aoi': { // 三葉葵
        const leaf = 'M0,-4 C-15,-10 -21,-30 -9,-37 C-4,-40 0,-36 0,-32 C0,-36 4,-40 9,-37 C21,-30 15,-10 0,-4Z';
        const vein = 'M0,-6 L0,-31 M0,-14 L-8,-24 M0,-14 L8,-24 M0,-22 L-6,-30 M0,-22 L6,-30';
        g = [0, 120, 240].map(a => `<g transform="rotate(${a})"><path d="${leaf}" fill="currentColor"/><path d="${vein}" style="stroke:var(--bg)" stroke-width="1.6" fill="none" opacity=".75"/></g>`).join('');
        return `<svg viewBox="-50 -50 100 100" aria-hidden="true">${ring}<g transform="translate(0,3)">${g}</g></svg>`;
      }
      case 'mokko': { // 織田木瓜
        g = [0, 72, 144, 216, 288].map(a => `<circle cx="0" cy="-22" r="18" transform="rotate(${a})"/>`).join('');
        const inner = [0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-10" rx="5" ry="9" transform="rotate(${a})"/>`).join('');
        return `<svg viewBox="-50 -50 100 100" aria-hidden="true"><g fill="currentColor">${g}</g><circle r="21" style="fill:var(--bg)"/><g fill="currentColor">${inner}<circle r="4"/></g></svg>`;
      }
      case 'bi':
        return `<svg viewBox="-50 -50 100 100" aria-hidden="true">${ring}<text y="17" text-anchor="middle" font-size="52" fill="currentColor" style="font-family:var(--f-brush)">毘</text></svg>`;
      case 'hikiryo':
        return `<svg viewBox="-50 -50 100 100" fill="currentColor" aria-hidden="true">${ring}<rect x="-40" y="-20" width="80" height="12"/><rect x="-40" y="8" width="80" height="12"/></svg>`;
      case 'uroko':
        return `<svg viewBox="-50 -50 100 100" fill="currentColor" aria-hidden="true"><path d="M0,-38L-20,-4H20Z M-22,0L-42,34H-2Z M22,0L2,34H42Z"/></svg>`;
      case 'ichimonji':
        return `<svg viewBox="-50 -50 100 100" fill="currentColor" aria-hidden="true"><rect x="-36" y="-40" width="72" height="11" rx="2"/><circle cx="0" cy="-6" r="13"/><circle cx="-17" cy="22" r="13"/><circle cx="17" cy="22" r="13"/></svg>`;
      case 'katabami': {
        const leaf = 'M0,0 C-16,-6 -20,-28 -8,-32 C-3,-34 0,-30 0,-27 C0,-30 3,-34 8,-32 C20,-28 16,-6 0,0Z';
        return `<svg viewBox="-50 -50 100 100" fill="currentColor" aria-hidden="true"><g transform="translate(0,4)">${[0, 120, 240].map(a => `<path d="${leaf}" transform="rotate(${a})"/>`).join('')}</g></svg>`;
      }
      default:
        return `<svg viewBox="-50 -50 100 100" aria-hidden="true">${ring}</svg>`;
    }
  }

  // 可重現的亂數
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const hash = str => [...String(str)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

  // ───────── 武將肖像 ─────────
  // 依史料與傳說中的甲冑特徵設計：h 是兜的前立，type 是非甲冑造型
  const PT = {
    honda: { h: 'antler' }, date: { h: 'crescent', patch: 1 }, naoe: { h: 'ai' }, ii: { h: 'tengu', armor: '#a8322a' },
    yamagata: { h: 'horns', armor: '#a8322a' }, masayuki: { h: 'rokumon' }, yukitaka: { h: 'rokumon' },
    yukimura: { h: 'antler', armor: '#a8322a', six: 1 }, oichi: { type: 'woman', robe: '#7a3b5a' },
    ginchiyo: { type: 'woman', band: 1, robe: '#3d4f6a' }, rikyu: { type: 'tea' }, akechi: { type: 'eboshi' },
    ishida: { type: 'eboshi' }, kobayakawa: { type: 'eboshi' }, matsunaga: { type: 'eboshi' }, hideyoshi: { h: 'sunburst' },
    kato: { h: 'naga' }, maeda: { h: 'naga' }, kuroda: { h: 'bowl' }, fukushima: { h: 'ichinotani' }, takenaka: { h: 'ichinotani' },
    keiji: { type: 'kabuki' }, ranmaru: { type: 'youth' }, hattori: { h: 'none', menpo: 1, armor: '#1c1c22' },
    yoshihiro: { h: 'horns', armor: '#3b2a22' }, kagekatsu: { h: 'sun' }, sakai: { h: 'moon' }, niwa: { h: 'moon' },
    magoichi: { h: 'crow' }, yasuke: { h: 'none', skin: '#6e4a33' }, kakizaki: { h: 'horns', menpo: 1 }
  };
  const HELMETS = ['horns', 'moon', 'sun', 'horns', 'smallmoon', 'none', 'horns'];

  function portrait(g, age, color) {
    const r = rng(hash(g.id));
    const spec = Object.assign({ type: 'armor', h: HELMETS[Math.floor(r() * HELMETS.length)] }, PT[g.id] || {});
    const old = age >= 55, mid = age >= 38;
    const id = 'pt' + g.id + (old ? 'o' : '');
    const skin = spec.skin || ['#e6c39b', '#dcb68c', '#e9caa6'][Math.floor(r() * 3)];
    const ink = '#1d1915', gold = '#d6ab3c';
    const armor = spec.armor || ['#2a2622', '#2f2a30', '#3a2c24'][Math.floor(r() * 3)];
    const lace = spec.armor ? '#e2b24a' : color;
    const hair = old ? '#b9b4ab' : '#17130f';
    let back = '', body = '', head = '', front = '';

    // 身體
    if (spec.type === 'woman' && !spec.band) {
      body = `<path d="M12,100 C14,80 30,72 50,72 C70,72 86,80 88,100Z" fill="${spec.robe}"/><path d="M40,72 L50,90 L60,72" fill="none" stroke="#f3e6cc" stroke-width="3"/><path d="M24,92 q8,-6 14,2 M62,88 q8,-6 14,2" stroke="${gold}" stroke-width="1.5" fill="none" opacity=".7"/>`;
    } else if (['eboshi', 'tea', 'youth'].includes(spec.type)) {
      const robe = spec.type === 'tea' ? '#2b2826' : spec.type === 'youth' ? '#e8dcc0' : color;
      body = `<path d="M10,100 C12,79 30,71 50,71 C70,71 88,79 90,100Z" fill="${robe}"/><path d="M41,71 L50,86 L59,71" fill="none" stroke="${spec.type === 'youth' ? '#a8322a' : '#f1e6cf'}" stroke-width="3"/>${spec.type === 'eboshi' ? `<path d="M10,100 L22,76 L34,73 L30,100Z M90,100 L78,76 L66,73 L70,100Z" fill="${color}" opacity=".85"/>` : ''}`;
    } else {
      const sode = `<path d="M8,84 L28,74 L33,100 L10,100Z" fill="${armor}"/><path d="M92,84 L72,74 L67,100 L90,100Z" fill="${armor}"/>`;
      const laces = [80, 86, 92, 98].map(y => `<path d="M${10 + (y - 80) * .1},${y + 2} L${30 + (y - 80) * .15},${y - 6}" stroke="${lace}" stroke-width="1.6"/><path d="M${90 - (y - 80) * .1},${y + 2} L${70 - (y - 80) * .15},${y - 6}" stroke="${lace}" stroke-width="1.6"/>`).join('');
      body = `<path d="M16,100 C18,80 32,72 50,72 C68,72 82,80 84,100Z" fill="${armor}"/><path d="M36,80 L64,80 M34,88 L66,88 M33,96 L67,96" stroke="${lace}" stroke-width="2"/>${sode}${laces}<path d="M40,72 L60,72 L58,78 L42,78Z" fill="${ink}" opacity=".6"/>`;
      if (spec.six) body += [0, 1, 2].map(i => `<circle cx="${44 + i * 6}" cy="91" r="2.4" fill="${gold}"/>`).join('');
    }

    // 頭部後方
    const helmeted = spec.type === 'armor' || spec.band;
    if (spec.h === 'sunburst') back += Array.from({ length: 15 }, (_, i) => { const a = (-160 + i * 10) * Math.PI / 180; return `<line x1="50" y1="38" x2="${(50 + Math.cos(a) * 44).toFixed(1)}" y2="${(38 + Math.sin(a) * 44).toFixed(1)}" stroke="${gold}" stroke-width="2.4"/>`; }).join('');
    if (spec.h === 'ichinotani') back += `<path d="M44,40 L40,4 L60,2 L58,40Z" fill="#d9d9d4" stroke="${ink}" stroke-width="1"/>`;
    if (spec.h === 'naga') back += `<path d="M38,42 C36,22 42,6 50,2 C58,6 64,22 62,42Z" fill="${g.id === 'maeda' ? gold : '#cfcfca'}" stroke="${ink}" stroke-width="1"/>${g.id === 'kato' ? '<circle cx="50" cy="24" r="5" fill="#b5361f"/>' : ''}`;
    if (spec.type === 'woman' && !spec.band) back += `<path d="M30,56 C26,34 36,26 50,26 C64,26 74,34 70,56 L74,86 L26,86Z" fill="${hair}"/>`;
    if (spec.type === 'kabuki') back += Array.from({ length: 9 }, (_, i) => { const a = (-170 + i * 20) * Math.PI / 180; return `<path d="M50,44 L${(50 + Math.cos(a - .12) * 28).toFixed(1)},${(44 + Math.sin(a - .12) * 28).toFixed(1)} L${(50 + Math.cos(a + .12) * 30).toFixed(1)},${(44 + Math.sin(a + .12) * 30).toFixed(1)}Z" fill="${hair}"/>`; }).join('');
    if (spec.type === 'armor') back += `<path d="M28,47 L72,47 L80,63 Q50,70 20,63Z" fill="${armor}" stroke="${lace}" stroke-width="1.2"/><path d="M24,55 L76,55" stroke="${lace}" stroke-width="1.2"/>`;

    // 臉
    head += `<ellipse cx="34.5" cy="55" rx="3" ry="4.5" fill="${skin}"/><ellipse cx="65.5" cy="55" rx="3" ry="4.5" fill="${skin}"/><ellipse cx="50" cy="54" rx="14" ry="16.5" fill="${skin}"/>`;
    const brow = old ? '#d6d2c8' : ink;
    const tilt = r() > .5 ? 2 : 1;
    head += `<path d="M40,${48 - tilt} L46,49 M60,${48 - tilt} L54,49" stroke="${brow}" stroke-width="${spec.type === 'woman' ? 1.4 : 2.2}" stroke-linecap="round"/>`;
    head += spec.type === 'woman' ? `<path d="M41,53 q3,-2 6,0 M53,53 q3,-2 6,0" stroke="${ink}" stroke-width="1.4" fill="none"/><path d="M47,64 q3,1.5 6,0" stroke="#b5361f" stroke-width="1.8" fill="none"/>`
      : `<path d="M41,53 L47,53.5 M53,53.5 L59,53" stroke="${ink}" stroke-width="1.9" stroke-linecap="round"/><path d="M50,55 L49,60 L51.5,60" stroke="${ink}" stroke-width="1" fill="none" opacity=".6"/><path d="M46,64.5 L54,64.5" stroke="${ink}" stroke-width="1.2" opacity=".7"/>`;
    if (spec.type !== 'woman' && spec.type !== 'youth') {
      if (old) head += `<path d="M38,62 C40,74 46,80 50,80 C54,80 60,74 62,62 C58,68 54,66 50,67 C46,66 42,68 38,62Z" fill="#d9d5cc"/>`;
      else if (mid || r() > .5) head += `<path d="M43,62 C46,60 49,61 50,62 C51,61 54,60 57,62" stroke="${ink}" stroke-width="2" fill="none"/>${r() > .5 ? `<path d="M47,68 L50,72 L53,68" fill="${ink}"/>` : ''}`;
    }
    if (spec.menpo) head += `<path d="M36,58 C38,72 46,74 50,74 C54,74 62,72 64,58 L60,62 L54,60 L46,60 L40,62Z" fill="#7a2a20"/><path d="M42,66 L58,66" stroke="#e9d6a8" stroke-width="1.2"/>`;

    // 頭頂
    if (spec.type === 'woman' && !spec.band) {
      front += `<path d="M35,48 C35,32 44,28 50,28 C56,28 65,32 65,48 C60,40 54,38 50,38 C46,38 40,40 35,48Z" fill="${hair}"/><path d="M60,34 L72,26" stroke="${gold}" stroke-width="1.6"/>`;
    } else if (spec.type === 'eboshi') {
      front += `<path d="M36,46 C34,40 38,38 50,38 C62,38 66,40 64,46 C60,42 40,42 36,46Z" fill="${hair}"/><path d="M38,40 C36,22 44,10 56,12 C62,18 64,30 62,40Z" fill="#141210"/><path d="M40,36 L62,34" stroke="#3a3530" stroke-width="1"/>`;
    } else if (spec.type === 'tea') {
      front += `<path d="M34,46 C32,30 42,24 50,24 C58,24 68,30 66,46 C60,40 40,40 34,46Z" fill="#5b4a3a"/><path d="M34,46 L66,46" stroke="#3a2f25" stroke-width="2"/>`;
    } else if (spec.type === 'youth') {
      front += `<path d="M35,50 C33,32 44,28 50,28 C58,28 67,32 65,50 C62,42 56,40 50,41 C44,40 38,42 35,50Z" fill="${hair}"/><path d="M47,28 C46,22 54,22 53,28Z" fill="${hair}"/><path d="M50,28 L50,22" stroke="#b5361f" stroke-width="2"/>`;
    } else if (spec.type === 'kabuki') {
      front += `<path d="M35,48 C35,34 44,30 50,30 C56,30 65,34 65,48 C58,42 42,42 35,48Z" fill="${hair}"/><rect x="34" y="42" width="32" height="4" fill="#b5361f"/>`;
    } else if (spec.band) {
      front += `<path d="M35,48 C35,32 44,28 50,28 C56,28 65,32 65,48 C58,40 42,40 35,48Z" fill="${hair}"/><rect x="34" y="40" width="32" height="5" fill="#f3efe6"/><path d="M66,42 L76,48 L74,52" stroke="#f3efe6" stroke-width="3" fill="none"/>`;
    } else {
      const bowl = spec.h === 'bowl' ? '#9b2c1f' : ['#2b2723', '#33302b'][Math.floor(r() * 2)];
      front += `<path d="M33,47 C33,28 67,28 67,47Z" fill="${bowl}"/>${[38, 44, 50, 56, 62].map(x => `<path d="M${x},32 L${x + (x - 50) * .08},46" stroke="#58524a" stroke-width=".8"/>`).join('')}
        <path d="M31,46 Q50,51 69,46 L69,49 Q50,55 31,49Z" fill="${ink}"/>
        <path d="M30,44 L24,40 L25,50 L32,50Z" fill="${lace}"/><path d="M70,44 L76,40 L75,50 L68,50Z" fill="${lace}"/>`;
    }
    // 前立
    const m = spec.h;
    if (spec.type === 'armor') {
      if (m === 'horns') front += `<path d="M47,40 C40,30 37,18 40,8 C43,18 46,28 50,38 C54,28 57,18 60,8 C63,18 60,30 53,40Z" fill="${gold}" stroke="${ink}" stroke-width=".8"/>`;
      if (m === 'tengu') front += `<path d="M46,40 C38,26 36,10 38,0 C42,12 46,26 50,37 C54,26 58,12 62,0 C64,10 62,26 54,40Z" fill="${gold}" stroke="${ink}" stroke-width=".8"/>`;
      if (m === 'crescent') front += `<path d="M18,26 Q48,52 88,10 Q50,42 18,26Z" fill="${gold}" stroke="${ink}" stroke-width=".8"/>`;
      if (m === 'smallmoon') front += `<path d="M38,30 Q50,44 62,30 Q50,38 38,30Z" fill="${gold}"/>`;
      if (m === 'moon') front += `<path d="M34,26 Q50,46 66,26 Q50,38 34,26Z" fill="#e7e4dc" stroke="${ink}" stroke-width=".6"/>`;
      if (m === 'sun') front += `<circle cx="50" cy="31" r="7" fill="#b5361f" stroke="${gold}" stroke-width="2"/>`;
      if (m === 'ai') front += `<rect x="42" y="16" width="16" height="20" rx="2" fill="${gold}"/><text x="50" y="31" text-anchor="middle" font-size="13" fill="${ink}" style="font-family:var(--f-brush)">愛</text>`;
      if (m === 'rokumon') front += `<rect x="38" y="24" width="24" height="15" rx="2" fill="${ink}"/>` + [0, 1, 2, 3, 4, 5].map(i => `<circle cx="${42 + (i % 3) * 8}" cy="${28 + Math.floor(i / 3) * 7}" r="2.8" fill="${gold}"/>`).join('');
      if (m === 'antler') front += `<g stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"><path d="M44,38 C36,28 30,20 28,8 M34,26 L24,22 M31,17 L22,10"/><path d="M56,38 C64,28 70,20 72,8 M66,26 L76,22 M69,17 L78,10"/></g>`;
      if (m === 'crow') front += `<path d="M44,34 L50,22 L56,34 L50,30Z M38,28 L50,26 L62,28 L50,24Z" fill="${ink}"/><circle cx="50" cy="22" r="2" fill="${ink}"/>`;
    }
    if (spec.patch) front += `<path d="M54,50 L62,50 L61,56 L55,56Z" fill="${ink}"/><path d="M36,46 L64,51" stroke="${ink}" stroke-width="1.2"/>`;

    return `<svg viewBox="0 0 100 100" class="pt" aria-hidden="true"><defs><clipPath id="${id}"><circle cx="50" cy="50" r="49"/></clipPath><radialGradient id="${id}g" cx="50%" cy="35%" r="65%"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></radialGradient></defs>
      <g clip-path="url(#${id})"><rect width="100" height="100" fill="${color}"/><rect width="100" height="100" fill="url(#${id}g)"/><g transform="translate(-8,-4) scale(1.16)">${back}${body}${head}${front}</g></g></svg>`;
  }

  // ───────── 情景插畫 ─────────
  function ridge(base, amp, seed, rough = 6) {
    const r = rng(seed); let d = `M-10,210 L-10,${base}`; let x = -10;
    while (x < 610) {
      const nx = x + 30 + r() * 50, peak = base - amp * (0.3 + r() * 0.7);
      const mx = (x + nx) / 2;
      d += ` Q${mx.toFixed(1)},${(peak - r() * rough).toFixed(1)} ${nx.toFixed(1)},${(base - amp * r() * 0.35).toFixed(1)}`;
      x = nx;
    }
    return d + ' L610,210Z';
  }
  function pine(x, y, s) {
    return `<g transform="translate(${x},${y}) scale(${s})" class="fg"><rect x="-1.5" y="-4" width="3" height="30"/><path d="M0,-40 L-14,-14 L-6,-15 L-18,4 L-5,2 L-20,20 L20,20 L5,2 L18,4 L6,-15 L14,-14Z"/></g>`;
  }
  function blossomTree(x, y, s, cls, seed) {
    const r = rng(seed); let blobs = '';
    for (let i = 0; i < 9; i++) blobs += `<circle class="${cls}" cx="${(-26 + r() * 52).toFixed(0)}" cy="${(-52 + r() * 26).toFixed(0)}" r="${(9 + r() * 8).toFixed(0)}" opacity="${(.75 + r() * .25).toFixed(2)}"/>`;
    return `<g transform="translate(${x},${y}) scale(${s})"><path class="fg" d="M-3,0 L-2,-30 L-14,-44 L-1,-36 L2,-50 L4,-34 L16,-42 L4,-26 L4,0Z"/>${blobs}</g>`;
  }
  function bamboo(x, y, n, seed) {
    const r = rng(seed); let g = '', bx = x;
    for (let i = 0; i < n; i++) {
      const h = 150 + r() * 60;
      g += `<rect class="bam" x="${bx.toFixed(0)}" y="${(y - h).toFixed(0)}" width="5" height="${h.toFixed(0)}"/>`;
      for (let k = 1; k < 6; k++) g += `<rect class="fg" x="${(bx - .5).toFixed(0)}" y="${(y - k * h / 6).toFixed(0)}" width="6" height="1.5" opacity=".5"/>`;
      g += `<path class="bam" d="M${(bx + 3).toFixed(0)},${(y - h * .7).toFixed(0)} q14,-6 22,-2 q-12,2 -22,6Z M${(bx + 2).toFixed(0)},${(y - h * .45).toFixed(0)} q-14,-6 -22,-2 q12,2 22,6Z" opacity=".85"/>`;
      bx += 14 + r() * 10;
    }
    return g;
  }
  function nobori(x, y, h, fill, ch) {
    return `<g transform="translate(${x},${y})"><rect x="-1" y="${-h}" width="2" height="${h}" class="fg"/><rect class="flag" x="1" y="${-h + 4}" width="12" height="${h * 0.55}" style="fill:${fill}"/>${ch ? `<text x="7" y="${-h + 18}" font-size="9" text-anchor="middle" class="paper" style="font-family:var(--f-brush)">${ch}</text>` : ''}</g>`;
  }
  function rider(x, y, s, flag, flip) {
    return `<g transform="translate(${x.toFixed(0)},${y.toFixed(0)}) scale(${flip ? -s : s},${s})"><g class="fg">
      <ellipse cx="0" cy="-18" rx="14" ry="6.5"/><path d="M10,-21 L16,-34 L21,-32 L15,-17Z M16,-34 L26,-30 L25,-27 L18,-29Z M-14,-20 q-8,4 -10,12 q4,-6 9,-8Z"/>
      <path d="M-9,-13 L-13,0 M-5,-13 L-2,0 M6,-13 L11,-1 M10,-14 L15,-2" style="stroke:var(--fg1)" stroke-width="2.4"/>
      <path d="M-3,-24 L5,-24 L3,-38 L-2,-38Z"/><circle cx=".5" cy="-41" r="3.4"/><path d="M-8,-30 L24,-50" style="stroke:var(--fg1)" stroke-width="1.3"/>
      <path d="M-2,-38 L-4,-54" style="stroke:var(--fg1)" stroke-width="1.2"/></g><rect x="-11" y="-55" width="7" height="9" style="fill:${flag}"/></g>`;
  }
  function soldier(x, y, s, flag, flip, i) {
    return `<g transform="translate(${x.toFixed(0)},${y.toFixed(0)}) scale(${flip ? -s : s},${s})"><g class="fg"><path d="M-5,-22 L5,-22 L0,-27Z"/><rect x="-3" y="-22" width="6" height="12"/>
      <path d="M-2,-10 L-4,0 M2,-10 L4,0 M0,-18 L18,-42" style="stroke:var(--fg1)" stroke-width="1.6"/></g>${i % 3 === 0 ? `<path d="M0,-22 L-1,-36" style="stroke:var(--fg1)" stroke-width="1.2"/><rect x="-6" y="-37" width="5" height="7" style="fill:${flag}"/>` : ''}</g>`;
  }
  function army(x0, y, n, kind, flag, flip, seed, cls) {
    const r = rng(seed); let g = '';
    for (let i = 0; i < n; i++) {
      const x = x0 + (flip ? -1 : 1) * (i * (kind === 'horse' ? 30 : 13) + r() * 6), yy = y + (r() * 8 - 4);
      g += kind === 'horse' ? rider(x, yy, .8 + r() * .15, flag, flip) : soldier(x, yy, .9 + r() * .2, flag, flip, i);
    }
    return `<g class="${cls || (flip ? 'army-foe' : 'army-our')}">${g}</g>`;
  }
  function tenshu(x, y, s) {
    return `<g transform="translate(${x},${y}) scale(${s})" class="fg">
      <path d="M-46,0 L-38,-26 L38,-26 L46,0Z"/>
      <rect x="-30" y="-48" width="60" height="22"/><path d="M-42,-46 Q0,-56 42,-46 L36,-52 L-36,-52Z"/>
      <rect x="-22" y="-70" width="44" height="18"/><path d="M-32,-68 Q0,-78 32,-68 L26,-74 L-26,-74Z"/>
      <rect x="-14" y="-88" width="28" height="14"/><path d="M-24,-86 Q0,-98 24,-86 L0,-104Z"/>
      <rect x="-1.5" y="-110" width="3" height="8"/></g>`;
  }
  function pagoda(x, y, s) {
    let d = ''; for (let i = 0; i < 5; i++) { const w = 34 - i * 5, yy = -i * 20; d += `<rect x="${-w / 2 + 6}" y="${yy - 14}" width="${w - 12}" height="14"/><path d="M${-w},${yy - 12} Q0,${yy - 22} ${w},${yy - 12} L${w - 6},${yy - 18} L${-w + 6},${yy - 18}Z"/>`; }
    return `<g transform="translate(${x},${y}) scale(${s})" class="fg">${d}<rect x="-1.5" y="-128" width="3" height="30"/></g>`;
  }
  function roofRow(y, n, seed) {
    const r = rng(seed); let g = ''; let x = 10;
    for (let i = 0; i < n; i++) { const w = 50 + r() * 40, h = 18 + r() * 12; g += `<path class="fg" d="M${x.toFixed(0)},${y} L${x.toFixed(0)},${(y - h).toFixed(0)} L${(x + w / 2).toFixed(0)},${(y - h - 14).toFixed(0)} L${(x + w).toFixed(0)},${(y - h).toFixed(0)} L${(x + w).toFixed(0)},${y}Z"/><rect class="shu" x="${(x + w * .3).toFixed(0)}" y="${(y - h + 4).toFixed(0)}" width="${(w * .4).toFixed(0)}" height="8" opacity=".85"/>`; x += w + 6; }
    return g;
  }
  // 飄落的粒子：花瓣、楓葉、雪、雨
  function particles(kind, n, seed) {
    const r = rng(seed); let g = '';
    for (let i = 0; i < n; i++) {
      const x = r() * 640 - 20, d = (kind === 'rain' ? .6 + r() * .4 : 5 + r() * 6).toFixed(2), dl = (-r() * 10).toFixed(2), dx = ((r() - .5) * (kind === 'rain' ? 30 : 90)).toFixed(0), sz = (.7 + r() * .7).toFixed(2);
      const shape = kind === 'petal' ? '<ellipse rx="2.6" ry="1.6" class="petal"/>' : kind === 'leaf' ? `<path d="M0,-4 L1.2,-1 L4,-1.5 L2,1 L3,4 L0,2.4 L-3,4 L-2,1 L-4,-1.5 L-1.2,-1Z" class="${r() > .5 ? 'leaf' : 'leaf2'}"/>` : kind === 'snow' ? '<circle r="1.6" class="snowf"/>' : '<line x1="0" y1="0" x2="-8" y2="22" class="rain"/>';
      g += `<g class="ptc" style="--d:${d}s;--dl:${dl}s;--dx:${dx}px;--x:${x.toFixed(0)}px"><g transform="scale(${sz})">${shape}</g></g>`;
    }
    return `<g class="ptcs">${g}</g>`;
  }

  let uid = 0;
  const SEASON_PTC = ['petal', '', 'leaf', 'snow'];
  function scene(type, opt = {}) {
    const id = 'sc' + (++uid);
    const seed = hash(type) + (opt.seed || 0);
    const r = rng(seed + 99);
    const season = opt.season === undefined ? 1 : opt.season;
    const time = opt.time || 'day';
    const our = opt.our || 'var(--ai2)', foe = opt.foe || 'var(--shu)';
    const sky = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sky-a"/><stop offset="1" class="sky-b"/></linearGradient></defs><rect width="600" height="200" fill="url(#${id})"/>`;
    const sx = (380 + r() * 140).toFixed(0);
    let sun = time === 'night' ? `<circle class="paper" cx="${sx}" cy="50" r="18"/><circle cx="${+sx + 8}" cy="44" r="16" style="fill:var(--sky-top)"/>` : `<circle class="sun" cx="${sx}" cy="${time === 'dusk' || time === 'dawn' ? 96 : 60}" r="${time === 'dusk' ? 34 : 26}" opacity=".9"/>`;
    const far = `<path class="m3" d="${ridge(130, 60, seed + 1, 8)}"/>`;
    const caps = season === 3 ? `<path class="snowcap" d="${ridge(130, 60, seed + 1, 8)}" transform="translate(0,-3)" opacity=".7"/>` : '';
    const mid = `<path class="m2" d="${ridge(155, 45, seed + 7, 6)}"/>`;
    const near = `<path class="m1" d="${ridge(182, 26, seed + 13, 4)}"/>`;
    let fg = '', extra = '', ptc = SEASON_PTC[season];
    const tree = (x, y, s) => season === 0 ? blossomTree(x, y, s, 'sakura', seed + x) : season === 2 ? blossomTree(x, y, s, 'momiji', seed + x) : pine(x, y, s);
    switch (type) {
      case 'storm':
        sun = ''; ptc = 'rain';
        fg = [60, 90, 120, 150].map((x, i) => nobori(x, 188, 70, i % 2 ? 'var(--kin)' : our, '')).join('') + army(170, 192, 5, 'foot', our, false, seed) + army(560, 190, 4, 'horse', foe, true, seed + 3);
        extra = '<path class="bolt" d="M300,0 L286,52 L298,54 L282,104" stroke="#fff6d8" stroke-width="2.5" fill="none" opacity=".8"/>';
        break;
      case 'castle': fg = tenshu(300, 168, 1.05) + tree(130, 172, .9) + tree(470, 176, 1.1) + pine(500, 180, .8); break;
      case 'siege': fg = tenshu(420, 160, .95) + army(60, 194, 9, 'foot', our, false, seed) + '<g class="arrows">' + Array.from({ length: 7 }, (_, i) => `<line x1="${120 + i * 22}" y1="${150 - i * 4}" x2="${136 + i * 22}" y2="${138 - i * 4}" style="stroke:var(--fg1)" stroke-width="1.2"/>`).join('') + '</g>'; break;
      case 'field':
      case 'cavalry': {
        const horse = type === 'cavalry' || r() > .5;
        fg = [40, 70, 100].map((x, i) => nobori(x, 190, 64 + (i % 2) * 8, our, '')).join('') + army(110, 194, 7, 'foot', our, false, seed)
          + army(580, 192, horse ? 5 : 8, horse ? 'horse' : 'foot', foe, true, seed + 5) + [470, 500].map(x => nobori(x, 188, 62, foe, '')).join('');
        break;
      }
      case 'fire': {
        sun = ''; ptc = '';
        fg = `<g class="fg"><path d="M150,190 L150,140 L300,140 L300,190Z"/><path d="M120,142 Q225,104 330,142 L300,124 L150,124Z"/><path d="M175,124 Q225,94 275,124 L225,100Z"/></g>`;
        const rr = rng(4); let fl = '';
        for (let i = 0; i < 14; i++) { const x = 130 + rr() * 200, h = 30 + rr() * 60; fl += `<path class="${i % 3 ? 'flame' : 'flame2'} flk" style="--fd:${(.6 + rr() * .8).toFixed(2)}s" d="M${x.toFixed(0)},150 Q${(x - 14).toFixed(0)},${(150 - h * .5).toFixed(0)} ${(x + 2).toFixed(0)},${(150 - h).toFixed(0)} Q${(x + 18).toFixed(0)},${(150 - h * .45).toFixed(0)} ${(x + 10).toFixed(0)},150Z" opacity=".9"/>`; }
        extra = `<ellipse class="smoke drift" cx="240" cy="40" rx="140" ry="34"/><ellipse class="smoke drift2" cx="330" cy="20" rx="120" ry="24"/>`;
        fg += fl + pine(470, 182, 1) + pine(520, 186, .8) + army(560, 194, 6, 'foot', '#6b6fa8', true, seed);
        break;
      }
      case 'temple': fg = pagoda(420, 186, 1) + tree(120, 180, 1) + tree(170, 184, .8) + '<path class="fg" d="M210,190 L210,166 L330,166 L330,190Z M196,168 Q270,140 344,168 L320,156 L220,156Z"/>'; break;
      case 'snow':
        sun = '<circle class="paper" cx="455" cy="62" r="24" opacity=".6"/>'; ptc = 'snow';
        fg = pine(90, 186, 1.1) + pine(140, 190, .8) + army(170, 194, 5, 'foot', our, false, seed) + army(580, 192, 5, 'horse', foe, true, seed + 2) + [360, 395].map(x => nobori(x, 192, 60, foe, '')).join('');
        break;
      case 'night':
        sun = `<circle class="paper" cx="470" cy="50" r="20"/><circle cx="478" cy="44" r="18" style="fill:var(--sky-top)"/>`;
        extra = Array.from({ length: 40 }, () => `<circle class="paper twinkle" style="--tw:${(1.5 + r() * 3).toFixed(1)}s" cx="${(r() * 600).toFixed(0)}" cy="${(r() * 90).toFixed(0)}" r="${(r() * 1.2 + .3).toFixed(1)}" opacity=".7"/>`).join('');
        fg = bamboo(40, 200, 6, seed) + '<g transform="translate(330,178)"><rect class="fg" x="-1.5" y="-30" width="3" height="30"/><path class="flame2 flk" style="--fd:.8s" d="M0,-30 Q-6,-38 0,-48 Q6,-38 0,-30Z"/></g>' + army(420, 194, 4, 'foot', our, false, seed);
        ptc = '';
        break;
      case 'mist': fg = [80, 110, 140].map(x => nobori(x, 188, 60, our, '')).join('') + army(160, 194, 6, 'foot', our, false, seed) + army(590, 192, 5, 'horse', foe, true, seed + 1);
        extra = '<rect class="mist drift" x="-60" y="120" width="720" height="26" opacity=".7"/><rect class="mist drift2" x="-60" y="150" width="720" height="18" opacity=".55"/><rect class="mist drift" x="-60" y="96" width="720" height="14" opacity=".5"/>'; break;
      case 'river': fg = '<path class="river" d="M-10,170 Q150,150 300,172 T610,160 L610,200 L-10,200Z" opacity=".95"/><path class="line wavy" d="M40,178 Q200,160 320,182 T600,170" opacity=".4"/>' + army(560, 166, 5, 'horse', foe, true, seed) + army(40, 166, 5, 'foot', our, false, seed + 2); break;
      case 'tea': sun = ''; ptc = '';
        fg = `<rect class="paper" x="0" y="0" width="600" height="200" opacity=".35"/>
        <g class="line" opacity=".35">${[0, 1, 2, 3, 4, 5].map(i => `<line x1="${i * 120}" y1="150" x2="${i * 120 - 60}" y2="200"/>`).join('')}<line x1="0" y1="150" x2="600" y2="150"/></g>
        <path class="fg" d="M240,150 Q240,104 300,104 Q360,104 360,150Z"/><rect class="fg" x="276" y="150" width="48" height="8"/>
        <path d="M248,124 Q300,132 352,124" style="stroke:var(--kin)" stroke-width="2" fill="none"/>
        <path class="line steam" d="M290,96 Q280,80 292,66 Q304,52 294,36 M310,96 Q320,78 308,62 Q298,48 310,34" opacity=".5"/>
        <rect class="m2" x="430" y="40" width="70" height="110" opacity=".5"/><text x="465" y="100" text-anchor="middle" font-size="28" class="fg" style="font-family:var(--f-brush)">${['和', '敬', '清', '寂'][Math.floor(r() * 4)]}</text>
        ${season === 0 ? blossomTree(110, 150, .8, 'sakura', seed) : season === 2 ? blossomTree(110, 150, .8, 'momiji', seed) : ''}`; break;
      case 'sea': {
        let w = ''; for (let i = 0; i < 12; i++) for (let j = 0; j < 3; j++) w += `<path class="line" d="M${i * 54 - 10 + j * 27},${160 + j * 14} a22,22 0 0,1 44,0" opacity=".35"/>`;
        fg = `<rect class="river" x="0" y="140" width="600" height="60"/><g class="wavy">${w}</g><g class="bob"><g transform="translate(330,150)" class="fg"><path d="M-60,0 L60,0 L44,18 L-44,18Z"/><rect x="-2" y="-80" width="4" height="80"/><path class="paper" d="M4,-74 L48,-70 L44,-12 L4,-10Z" opacity=".9"/></g></g>`;
        break;
      }
      case 'market': fg = roofRow(186, 8, seed) + nobori(560, 190, 50, 'var(--shu)', '市'); break;
      case 'court': fg = `<g class="fg"><path d="M120,190 L120,150 L480,150 L480,190Z"/><path d="M90,152 Q300,108 510,152 L470,132 L130,132Z"/><path d="M200,134 Q300,104 400,134 L300,112Z"/></g>${[160, 210, 260, 340, 390, 440].map(x => `<rect class="kin" x="${x - 14}" y="156" width="28" height="30" opacity=".55"/>`).join('')}` + tree(60, 188, .9) + tree(545, 190, .9); break;
      case 'shrine': fg = `<g class="shu"><rect x="232" y="96" width="10" height="94"/><rect x="358" y="96" width="10" height="94"/><path d="M206,82 Q300,70 394,82 L398,94 L202,94Z"/><rect x="220" y="108" width="160" height="8"/><rect x="296" y="94" width="8" height="16"/></g>` + tree(120, 188, 1.1) + tree(480, 188, 1.1); break;
      case 'village': fg = `<g class="fg"><path d="M90,190 L90,160 L150,160 L150,190Z M76,162 L120,128 L164,162Z"/><path d="M420,192 L420,166 L470,166 L470,192Z M408,168 L445,138 L482,168Z"/></g><g class="line" opacity=".35">${[0, 1, 2, 3, 4].map(i => `<line x1="180" y1="${172 + i * 6}" x2="400" y2="${172 + i * 6}"/>`).join('')}</g>` + tree(540, 190, .9) + tree(250, 170, .6); break;
      case 'bamboo': fg = bamboo(10, 205, 26, seed) + '<rect class="mist" x="0" y="150" width="600" height="50" opacity=".4"/>'; break;
      default: fg = pine(300, 188, 1);
    }
    const fire = type === 'fire';
    return `<svg class="scene s-${type} season-${season} t-${time}" viewBox="0 0 600 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${sky}<g class="sunl">${sun}</g><g class="lay3">${far}${caps}</g><g class="lay2">${mid}${fire ? extra : ''}</g><g class="lay1">${near}</g><g class="lay0">${fg}${!fire ? extra : ''}</g>${ptc ? particles(ptc, ptc === 'rain' ? 70 : 26, seed) : ''}</svg>`;
  }

  // ───────── 合戰圖：小兵、本陣、意圖與軍令圖示 ─────────
  // 小兵（原點在腳下，約 14×28）
  function fig(type, x, y, col, flag) {
    const t = `translate(${x.toFixed(1)},${y.toFixed(1)})`;
    const fl = flag ? `<path d="M-1,-15 L-3,-27" class="fig-l"/><rect x="-6" y="-28" width="4" height="6" style="fill:${col}"/>` : '';
    if (type === 'cav') return `<g transform="${t}"><g class="fig"><ellipse cx="0" cy="-6" rx="7" ry="3.4"/><path d="M5,-8 L8,-14 L10.5,-13 L7.5,-5Z M8,-14 L13,-12 L12.5,-10.5 L9,-12Z M-7,-7 q-4,2 -4,6 q2,-3 4,-4Z"/><path d="M-2,-9 L2,-9 L1.5,-16 L-1,-16Z"/><circle cx=".2" cy="-17.5" r="1.9"/></g><path d="M-5,-4 L-6.5,1 M-2,-4 L-1,1 M3,-4 L5,1 M6,-5 L8,0 M-4,-12 L11,-25" class="fig-l"/>${fl}</g>`;
    if (type === 'gun') return `<g transform="${t}"><g class="fig"><path d="M-4.5,-13 L4.5,-13 L0,-17Z"/><rect x="-2.5" y="-13" width="5" height="7"/><path d="M-3,-6 L3,-6 L5,-1 L-3,0Z"/></g><path d="M-1,-9 L8,-20" class="fig-l" stroke-width="1.6"/><circle cx="8.5" cy="-21" r="1.2" class="fig"/>${fl}</g>`;
    return `<g transform="${t}"><g class="fig"><path d="M-4.5,-15 L4.5,-15 L0,-19Z"/><rect x="-2.5" y="-15" width="5" height="9"/></g><path d="M-1.5,-6 L-2.5,0 M1.5,-6 L2.5,0 M2.5,-4 L4.5,-30" class="fig-l"/><path d="M3.8,-30 L4.5,-34 L5.4,-30Z" class="fig"/>${fl}</g>`;
  }
  // 一整路部隊：人數越多畫越多小兵，潰走時倒在地上
  function block(type, troops, unit, cx, cy, col, enemy, broken) {
    if (broken) {
      return `<g class="blk-broken">${[-24, 0, 22].map((dx, k) => `<g transform="translate(${cx + dx},${cy + 4}) rotate(${k % 2 ? 80 : -78})">${fig(type, 0, 0, col, false)}</g>`).join('')}<path d="M${cx + 40},${cy + 8} L${cx + 52},${cy - 10}" class="fig-l"/><rect x="${cx + 48}" y="${cy - 14}" width="9" height="7" style="fill:${col}" transform="rotate(30 ${cx + 52} ${cy - 10})" opacity=".7"/></g>`;
    }
    const n = Math.max(1, Math.min(15, Math.round(troops / unit)));
    const rows = Math.ceil(n / 5);
    let g = '';
    for (let k = 0; k < n; k++) {
      const r = Math.floor(k / 5), c = k % 5, inRow = r === rows - 1 ? n - 5 * (rows - 1) : 5;
      const x = cx + (c - (inRow - 1) / 2) * 17, y = cy + (r - (rows - 1) / 2) * 19 + 10;
      g += fig(type, x, y, col, (k + r) % 3 === 0);
    }
    const bx = cx + 52;
    const ban = `<g class="nobori"><path d="M${bx},${cy + 22} L${bx},${cy - 30}" class="fig-l" stroke-width="1.6"/><rect x="${bx + 1}" y="${cy - 28}" width="13" height="30" style="fill:${col}"/><text x="${bx + 7.5}" y="${cy - 9}" class="ban-t">${{ cav: '騎', spear: '槍', gun: '砲' }[type]}</text></g>`;
    return `<g class="blk-in">${g}</g>${ban}`;
  }
  // 本陣：陣幕、旗幟與士氣條
  function camp(x, y, col, enemy, morale) {
    const m = Math.max(0, Math.min(100, morale));
    return `<g class="hqcamp ${enemy ? 'foe' : 'our'}">
      <path d="M${x - 70},${y - 26} L${x - 70},${y + 10} M${x + 70},${y - 26} L${x + 70},${y + 10}" class="fig-l" stroke-width="1.6"/>
      <rect x="${x - 70}" y="${y - 24}" width="10" height="16" style="fill:${col}"/><rect x="${x + 60}" y="${y - 24}" width="10" height="16" style="fill:${col}"/>
      <rect x="${x - 56}" y="${y - 10}" width="112" height="20" class="maku"/>
      <path d="M${x - 56},${y - 3} L${x + 56},${y - 3} M${x - 56},${y + 4} L${x + 56},${y + 4}" style="stroke:${col}" stroke-width="3"/>
      <circle cx="${x}" cy="${y}" r="7" style="fill:${col}" class="camp-crest"/>
      <rect x="${x - 56}" y="${y + 14}" width="112" height="5" class="hq-bg"/><rect x="${x - 56}" y="${y + 14}" width="${(112 * m / 100).toFixed(1)}" height="5" style="fill:${enemy ? 'var(--shu)' : 'var(--ink2)'}" class="hq-fill"/></g>`;
  }
  const ICON = {
    charge: '<path d="M-9,-8 L0,0 L9,-8 M-9,0 L0,8 L9,0" class="ic" style="stroke:var(--shu)"/>',
    atk: '<path d="M-9,8 L0,0 L9,8 M-9,0 L0,-8 L9,0" class="ic" style="stroke:var(--ink)"/>',
    hold: '<path d="M-10,-7 L-10,8 M-3,-9 L-3,8 M4,-9 L4,8 M11,-7 L11,8 M-12,-2 L13,-2 M-12,4 L13,4" class="ic" style="stroke:var(--r2)"/>',
    shoot: '<circle cx="-6" cy="2" r="5" style="fill:var(--kin)" opacity=".75"/><circle cx="2" cy="-3" r="6" style="fill:var(--kin)" opacity=".55"/><circle cx="9" cy="3" r="4" style="fill:var(--kin)" opacity=".75"/><path d="M-12,8 L4,-2" class="ic" style="stroke:var(--ink)"/>',
    feint: '<path d="M8,-8 C-10,-10 -12,8 4,8" class="ic" style="stroke:var(--ok)"/><path d="M0,3 L5,8 L0,13" class="ic" style="stroke:var(--ok)"/>',
    unk: '<circle r="10" class="ic-q"/><text y="5" class="ic-qt">？</text>'
  };
  const ILBL = { charge: '突擊', hold: '固守', shoot: '射擊', unk: '不明', atk: '進攻', feint: '誘敵' };
  function sign(kind, x, y, label) {
    return `<g class="sign s-${kind}" transform="translate(${x},${y})"><circle r="14" class="sign-bg"/>${ICON[kind]}${label ? `<text y="27" class="sign-t">${ILBL[kind]}</text>` : ''}</g>`;
  }
  function vsMark(adv, x, y) {
    if (!adv) return '';
    return `<g transform="translate(${x},${y})" class="vs-mark ${adv}"><circle r="9"/><path d="${adv === 'adv' ? 'M-4,3 L0,-4 L4,3Z' : 'M-4,-3 L0,4 L4,-3Z'}"/></g>`;
  }
  function terrain(ter, river, seed) {
    const r = rng(seed + 5); let g = '';
    for (let i = 0; i < 70; i++) { const x = r() * 600, y = 60 + r() * 270; g += `<path d="M${x.toFixed(0)},${y.toFixed(0)} l2,-5 M${(x + 3).toFixed(0)},${y.toFixed(0)} l1,-4" class="grass"/>`; }
    if (ter === 'mountain') g += `<path d="M-10,380 L-10,90 Q30,60 60,110 Q80,150 50,220 Q20,300 40,380Z M610,380 L610,80 Q570,60 545,120 Q525,170 555,240 Q580,310 560,380Z" class="hill"/>`;
    if (river) g += `<path d="M-10,182 C120,170 200,200 300,186 C400,172 480,204 610,188 L610,204 C480,220 400,190 300,204 C200,218 120,188 -10,198Z" class="bf-river"/>`;
    return g;
  }
  function formIcon(pos, form) {
    const xs = [7, 18, 29];
    const dots = xs.map((x, i) => `<circle cx="${x}" cy="${(12 - pos[i] / 3).toFixed(1)}" r="3"/>`).join('');
    return `<svg viewBox="0 0 36 24" class="form-ic" aria-hidden="true">${form === 'hoen' ? '<ellipse cx="18" cy="14" rx="15" ry="8" class="fi-l"/>' : `<path d="M${xs[0]},${(12 - pos[0] / 3).toFixed(1)} L${xs[1]},${(12 - pos[1] / 3).toFixed(1)} L${xs[2]},${(12 - pos[2] / 3).toFixed(1)}" class="fi-l"/>`}${dots}<rect x="15" y="19" width="6" height="4" class="fi-hq"/></svg>`;
  }
  function unitIcon(type) {
    return `<svg viewBox="-10 -36 24 38" class="unit-ic" aria-hidden="true">${fig(type, 0, 0, 'var(--shu)', type !== 'cav')}</svg>`;
  }

  return { crest, scene, portrait, fig, block, camp, sign, vsMark, terrain, formIcon, unitIcon, icon: k => ICON[k] };
})();

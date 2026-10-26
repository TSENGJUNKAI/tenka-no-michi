// 天下之道 — 美術：家紋、情景插畫
window.TArt = (function () {
  // 家紋（viewBox -50..50，使用 currentColor）
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
  function nobori(x, y, h, cls, ch) {
    return `<g transform="translate(${x},${y})"><rect x="-1" y="${-h}" width="2" height="${h}" class="fg"/><rect x="1" y="${-h + 4}" width="12" height="${h * 0.55}" class="${cls}"/>${ch ? `<text x="7" y="${-h + 18}" font-size="9" text-anchor="middle" class="paper" style="font-family:var(--f-brush)">${ch}</text>` : ''}</g>`;
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
    for (let i = 0; i < n; i++) { const w = 50 + r() * 40, h = 18 + r() * 12; g += `<path class="fg" d="M${x},${y} L${x},${y - h} L${x + w / 2},${y - h - 14} L${x + w},${y - h} L${x + w},${y}Z"/><rect class="shu" x="${x + w * .3}" y="${y - h + 4}" width="${w * .4}" height="8" opacity=".85"/>`; x += w + 6; }
    return g;
  }

  let uid = 0;
  function scene(type) {
    const id = 'sc' + (++uid);
    const seed = [...String(type)].reduce((a, c) => a + c.charCodeAt(0), 0);
    let sky = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sky-a"/><stop offset="1" class="sky-b"/></linearGradient></defs><rect width="600" height="200" fill="url(#${id})"/>`;
    let sun = '<circle class="sun" cx="455" cy="62" r="28" opacity=".9"/>';
    const far = `<path class="m3" d="${ridge(130, 60, seed + 1, 8)}"/>`;
    const mid = `<path class="m2" d="${ridge(155, 45, seed + 7, 6)}"/>`;
    const near = `<path class="m1" d="${ridge(182, 26, seed + 13, 4)}"/>`;
    let fg = '', extra = '';
    switch (type) {
      case 'storm': {
        sun = '';
        const r = rng(9); let lines = '';
        for (let i = 0; i < 90; i++) { const x = r() * 640 - 20, y = r() * 200; lines += `<line class="rain" x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x - 14).toFixed(0)}" y2="${(y + 36).toFixed(0)}"/>`; }
        fg = [60, 90, 120, 150].map((x, i) => nobori(x, 188, 70, i % 2 ? 'kin' : 'paper', '')).join('') + [420, 450, 480, 510, 540].map((x, i) => nobori(x, 186, 62, 'shu', '')).join('');
        extra = lines + '<path d="M300,0 L286,52 L298,54 L282,104" stroke="#fff6d8" stroke-width="2.5" fill="none" opacity=".8"/>';
        break;
      }
      case 'castle': fg = tenshu(300, 168, 1.05) + pine(130, 172, .9) + pine(470, 176, 1.1) + pine(500, 180, .8); break;
      case 'field': fg = [70, 105, 140, 175, 210].map((x, i) => nobori(x, 190, 64 + (i % 2) * 8, i % 2 ? 'ai' : 'shu', '')).join('') + [380, 420, 460, 500, 540].map((x, i) => nobori(x, 188, 58 + (i % 2) * 10, i % 2 ? 'kin' : 'ai', '')).join('') + '<path class="fg" d="M240,196 L260,150 L264,150 L246,196Z M330,196 L350,148 L354,148 L336,196Z" opacity=".7"/>'; break;
      case 'fire': {
        sun = '';
        fg = `<g class="fg"><path d="M150,190 L150,140 L300,140 L300,190Z"/><path d="M120,142 Q225,104 330,142 L300,124 L150,124Z"/><path d="M175,124 Q225,94 275,124 L225,100Z"/></g>`;
        const r = rng(4); let fl = '';
        for (let i = 0; i < 14; i++) { const x = 130 + r() * 200, h = 30 + r() * 60; fl += `<path class="${i % 3 ? 'flame' : 'flame2'}" d="M${x},150 Q${x - 14},${150 - h * .5} ${x + 2},${150 - h} Q${x + 18},${150 - h * .45} ${x + 10},150Z" opacity=".9"/>`; }
        extra = `<ellipse class="smoke" cx="240" cy="40" rx="140" ry="34"/><ellipse class="smoke" cx="330" cy="20" rx="120" ry="24"/>` ;
        fg += fl + pine(470, 182, 1) + pine(520, 186, .8);
        break;
      }
      case 'temple': fg = pagoda(420, 186, 1) + pine(120, 180, 1) + pine(170, 184, .8) + '<path class="fg" d="M210,190 L210,166 L330,166 L330,190Z M196,168 Q270,140 344,168 L320,156 L220,156Z"/>'; break;
      case 'snow': {
        sun = '<circle class="paper" cx="455" cy="62" r="24" opacity=".6"/>';
        const r = rng(3); let fl = '';
        for (let i = 0; i < 80; i++) fl += `<circle class="snowf" cx="${(r() * 600).toFixed(0)}" cy="${(r() * 200).toFixed(0)}" r="${(1 + r() * 1.8).toFixed(1)}"/>`;
        fg = pine(90, 186, 1.1) + pine(140, 190, .8) + [360, 395, 430, 465, 500].map((x, i) => nobori(x, 192, 60, 'shu', i === 2 ? '風' : '')).join('');
        extra = fl;
        break;
      }
      case 'night': {
        sun = '<circle class="paper" cx="470" cy="50" r="20"/><circle cx="478" cy="44" r="18" style="fill:var(--sky-top)"/>';
        const r = rng(7); let st = '';
        for (let i = 0; i < 40; i++) st += `<circle class="paper" cx="${(r() * 600).toFixed(0)}" cy="${(r() * 90).toFixed(0)}" r="${(r() * 1.2 + .3).toFixed(1)}" opacity=".7"/>`;
        extra = st;
        fg = pine(120, 186, 1.2) + pine(170, 190, .9) + '<g transform="translate(330,178)"><rect class="fg" x="-1.5" y="-30" width="3" height="30"/><path class="flame2" d="M0,-30 Q-6,-38 0,-48 Q6,-38 0,-30Z"/></g>';
        break;
      }
      case 'mist': fg = [80, 110, 140].map((x, i) => nobori(x, 188, 60, 'ai', i === 1 ? '毘' : '')).join('') + [430, 460, 490, 520].map((x, i) => nobori(x, 188, 62, 'shu', i === 1 ? '風' : '')).join('');
        extra = '<rect class="mist" x="0" y="120" width="600" height="26" opacity=".7"/><rect class="mist" x="0" y="150" width="600" height="18" opacity=".55"/><rect class="mist" x="0" y="96" width="600" height="14" opacity=".5"/>'; break;
      case 'river': fg = '<path class="river" d="M-10,170 Q150,150 300,172 T610,160 L610,200 L-10,200Z" opacity=".95"/><path class="line" d="M40,178 Q200,160 320,182 T600,170" opacity=".4"/>' + [500, 525, 550].map(x => nobori(x, 168, 50, 'shu', '')).join('') + [60, 85].map(x => nobori(x, 166, 50, 'ai', '')).join(''); break;
      case 'tea': sun = ''; fg = `<rect class="paper" x="0" y="0" width="600" height="200" opacity=".35"/>
        <g class="line" opacity=".35">${[0, 1, 2, 3, 4, 5].map(i => `<line x1="${i * 120}" y1="150" x2="${i * 120 - 60}" y2="200"/>`).join('')}<line x1="0" y1="150" x2="600" y2="150"/></g>
        <path class="fg" d="M240,150 Q240,104 300,104 Q360,104 360,150Z"/><rect class="fg" x="276" y="150" width="48" height="8"/>
        <path d="M248,124 Q300,132 352,124" style="stroke:var(--kin)" stroke-width="2" fill="none"/>
        <path class="line" d="M290,96 Q280,80 292,66 Q304,52 294,36 M310,96 Q320,78 308,62 Q298,48 310,34" opacity=".5"/>
        <rect class="m2" x="430" y="40" width="70" height="110" opacity=".5"/><text x="465" y="100" text-anchor="middle" font-size="28" class="fg" style="font-family:var(--f-brush)">和</text>`; break;
      case 'sea': {
        let w = ''; for (let i = 0; i < 12; i++) for (let j = 0; j < 3; j++) w += `<path class="line" d="M${i * 54 - 10 + j * 27},${160 + j * 14} a22,22 0 0,1 44,0" opacity=".35"/>`;
        fg = `<rect class="river" x="0" y="140" width="600" height="60"/>${w}<g transform="translate(330,150)" class="fg"><path d="M-60,0 L60,0 L44,18 L-44,18Z"/><rect x="-2" y="-80" width="4" height="80"/><path class="paper" d="M4,-74 L48,-70 L44,-12 L4,-10Z" opacity=".9"/></g>`;
        break;
      }
      case 'market': fg = roofRow(186, 8, 5) + nobori(560, 190, 50, 'shu', '市'); break;
      case 'court': fg = `<g class="fg"><path d="M120,190 L120,150 L480,150 L480,190Z"/><path d="M90,152 Q300,108 510,152 L470,132 L130,132Z"/><path d="M200,134 Q300,104 400,134 L300,112Z"/></g>${[160, 210, 260, 340, 390, 440].map(x => `<rect class="kin" x="${x - 14}" y="156" width="28" height="30" opacity=".55"/>`).join('')}` + pine(60, 188, .9) + pine(545, 190, .9); break;
      case 'shrine': fg = `<g class="shu"><rect x="232" y="96" width="10" height="94"/><rect x="358" y="96" width="10" height="94"/><path d="M206,82 Q300,70 394,82 L398,94 L202,94Z"/><rect x="220" y="108" width="160" height="8"/><rect x="296" y="94" width="8" height="16"/></g>` + pine(120, 188, 1.1) + pine(480, 188, 1.1); break;
      case 'village': fg = `<g class="fg"><path d="M90,190 L90,160 L150,160 L150,190Z M76,162 L120,128 L164,162Z"/><path d="M420,192 L420,166 L470,166 L470,192Z M408,168 L445,138 L482,168Z"/></g><g class="line" opacity=".35">${[0, 1, 2, 3, 4].map(i => `<line x1="180" y1="${172 + i * 6}" x2="400" y2="${172 + i * 6}"/>`).join('')}</g>` + pine(540, 190, .9); break;
      default: fg = pine(300, 188, 1);
    }
    return `<svg class="scene s-${type}" viewBox="0 0 600 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${sky}${sun}${far}${mid}${extra && type === 'fire' ? extra : ''}${near}${fg}${type !== 'fire' ? extra : ''}</svg>`;
  }

  return { crest, scene };
})();

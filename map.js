// 天下之道 — 地圖：投影、海岸線、令制國與勢力範圍
(function () {
  const X0 = 129.4, Y0 = 42.4, KX = 80, KY = 97.6;
  const W = 1040, H = 1192;
  const P = (lon, lat) => [(lon - X0) * KX, (Y0 - lat) * KY];

  // 海岸線（經度, 緯度）— 依主要岬角與海灣手描的簡化輪廓
  const LAND = {
    honshu: [130.92,33.95, 130.88,34.15, 131.15,34.38, 131.4,34.43, 131.62,34.6, 131.85,34.7, 132.08,34.9, 132.4,35.15, 132.63,35.43, 132.9,35.52, 133.08,35.58, 133.3,35.55, 133.4,35.47, 133.8,35.5, 134.2,35.54, 134.6,35.66, 134.9,35.68, 135.22,35.78, 135.2,35.56, 135.4,35.5, 135.75,35.5, 136.05,35.66, 135.97,35.98, 136.12,36.22, 136.4,36.45, 136.62,36.62, 136.75,36.92, 136.75,37.25, 136.92,37.4, 137.35,37.52, 137.25,37.3, 137.0,37.07, 136.98,36.85, 137.2,36.77, 137.55,36.92, 137.85,37.05, 138.25,37.18, 138.55,37.38, 138.8,37.65, 139.05,37.95, 139.45,38.22, 139.6,38.6, 139.82,38.95, 139.92,39.2, 140.05,39.72, 139.75,39.88, 139.72,40.0, 140.0,40.2, 139.92,40.62, 140.25,40.8, 140.35,41.25, 140.65,41.15, 140.75,40.85, 141.15,40.88, 141.2,41.25, 140.8,41.15, 140.92,41.53, 141.46,41.43, 141.4,41.0, 141.55,40.52, 141.85,40.2, 141.98,39.64, 142.07,39.55, 141.9,39.27, 141.6,38.9, 141.5,38.3, 141.3,38.42, 141.0,38.25, 140.95,37.8, 141.0,37.4, 140.95,37.0, 140.65,36.6, 140.6,36.3, 140.87,35.73, 140.65,35.6, 140.4,35.25, 140.3,35.15, 139.88,34.9, 139.82,35.0, 139.82,35.3, 140.1,35.6, 139.85,35.65, 139.65,35.45, 139.68,35.15, 139.55,35.3, 139.15,35.25, 139.08,35.1, 139.12,34.95, 138.85,34.6, 138.75,34.75, 138.85,35.1, 138.68,35.12, 138.4,34.95, 138.22,34.6, 137.75,34.66, 137.3,34.62, 137.0,34.58, 137.3,34.72, 137.25,34.82, 136.95,34.85, 136.9,34.7, 136.85,35.05, 136.65,34.98, 136.52,34.72, 136.75,34.5, 136.9,34.4, 136.9,34.28, 136.5,34.2, 136.2,34.07, 136.0,33.72, 135.77,33.43, 135.37,33.73, 135.07,33.88, 135.15,34.22, 135.35,34.45, 135.45,34.6, 135.43,34.7, 135.2,34.68, 135.0,34.65, 134.7,34.77, 134.3,34.7, 134.0,34.58, 133.75,34.48, 133.35,34.45, 133.1,34.37, 132.75,34.25, 132.45,34.35, 132.2,34.15, 132.1,33.95, 131.8,34.03, 131.55,34.03, 131.25,33.95, 131.0,33.97],
    kyushu: [130.95,33.92, 130.75,33.92, 130.5,33.85, 130.38,33.62, 130.15,33.58, 129.97,33.47, 129.55,33.37, 129.72,33.17, 129.65,32.95, 129.85,32.75, 129.75,32.58, 130.05,32.75, 130.2,32.72, 130.2,32.6, 130.37,32.78, 130.2,32.9, 130.12,33.02, 130.3,33.18, 130.42,33.12, 130.43,32.95, 130.55,32.78, 130.58,32.62, 130.58,32.48, 130.38,32.2, 130.18,32.02, 130.2,31.82, 130.25,31.7, 130.18,31.45, 130.22,31.27, 130.35,31.25, 130.63,31.2, 130.57,31.58, 130.75,31.73, 130.7,31.48, 130.67,31.0, 131.0,31.25, 131.1,31.45, 131.33,31.37, 131.45,31.9, 131.65,32.42, 131.72,32.6, 131.95,32.95, 131.85,33.1, 131.6,33.25, 131.7,33.4, 131.75,33.55, 131.5,33.62, 131.2,33.62, 130.98,33.88],
    shikoku: [134.6,34.22, 134.58,34.05, 134.73,33.85, 134.37,33.58, 134.17,33.25, 133.9,33.5, 133.6,33.5, 133.28,33.38, 132.95,32.95, 133.02,32.72, 132.7,32.78, 132.7,32.93, 132.55,33.22, 132.4,33.38, 132.0,33.35, 132.4,33.47, 132.5,33.6, 132.7,33.85, 132.78,33.98, 133.0,34.07, 133.18,33.92, 133.28,33.97, 133.55,34.02, 133.65,34.13, 133.8,34.3, 134.05,34.35, 134.18,34.33, 134.4,34.23],
    sado: [138.22,38.32, 138.5,38.33, 138.55,38.05, 138.4,37.82, 138.22,37.85, 138.35,38.05],
    awaji: [134.92,34.6, 135.02,34.55, 134.9,34.25, 134.7,34.2, 134.82,34.45],
    ezo: [139.85,41.55, 140.1,41.42, 140.45,41.52, 140.73,41.77, 141.15,41.82, 141.0,42.3, 140.4,42.6, 139.8,42.6],
    tanega: [130.95,30.85, 131.08,30.75, 130.98,30.45, 130.88,30.4, 130.9,30.7],
    amakusa: [130.0,32.5, 130.25,32.55, 130.35,32.4, 130.15,32.2, 130.0,32.3],
    oki: [133.15,36.32, 133.35,36.3, 133.38,36.18, 133.2,36.15]
  };
  const CLIP = { honshu: ['honshu', 'oki'], kyushu: ['kyushu', 'tanega', 'amakusa'], shikoku: ['shikoku'] };

  // 令制國：id, 名稱, 經度, 緯度, 島, 1560 年的領主, 是否顯示標籤
  const PROV_RAW = [
    ['nagato','長門',131.2,34.25,'honshu','mori'], ['suo','周防',131.85,34.1,'honshu','mori'],
    ['aki','安藝',132.5,34.5,'honshu','mori'], ['iwami','石見',132.15,34.85,'honshu','mori'],
    ['izumo','出雲',132.85,35.3,'honshu','amago'], ['hoki','伯耆',133.55,35.35,'honshu','amago'],
    ['bingo','備後',133.15,34.7,'honshu','mori'], ['bitchu','備中',133.65,34.85,'honshu','kokujin'],
    ['mimasaka','美作',133.9,35.1,'honshu','amago'], ['bizen','備前',134.1,34.75,'honshu','kokujin'],
    ['inaba','因幡',134.25,35.4,'honshu','kokujin'], ['harima','播磨',134.7,34.95,'honshu','kokujin'],
    ['tajima','但馬',134.75,35.4,'honshu','kokujin'], ['tango','丹後',135.1,35.6,'honshu','kokujin'],
    ['tamba','丹波',135.35,35.15,'honshu','miyoshi'], ['settsu','攝津',135.4,34.78,'honshu','miyoshi'],
    ['izumi','和泉',135.4,34.42,'honshu','miyoshi'], ['kawachi','河內',135.62,34.6,'honshu','miyoshi'],
    ['yamashiro','山城',135.75,35.0,'honshu','miyoshi'], ['yamato','大和',135.85,34.45,'honshu','miyoshi'],
    ['kii','紀伊',135.45,34.0,'honshu','kokujin'], ['kumano','紀伊',136.0,33.85,'honshu','kokujin',0],
    ['iga','伊賀',136.15,34.75,'honshu','kokujin'], ['ise','伊勢',136.45,34.65,'honshu','kitabatake'],
    ['shima','志摩',136.82,34.38,'honshu','kitabatake'], ['wakasa','若狹',135.85,35.48,'honshu','kokujin'],
    ['omi_s','南近江',136.1,35.05,'honshu','rokkaku'], ['omi_n','北近江',136.3,35.45,'honshu','azai'],
    ['echizen','越前',136.25,35.95,'honshu','asakura'], ['kaga','加賀',136.55,36.35,'honshu','ikko'],
    ['noto','能登',136.9,37.1,'honshu','kokujin'], ['etchu','越中',137.2,36.65,'honshu','kokujin'],
    ['hida','飛驒',137.25,36.15,'honshu','kokujin'], ['mino','美濃',136.85,35.6,'honshu','saito'],
    ['owari','尾張',136.9,35.2,'honshu','oda'], ['mikawa','三河',137.3,34.92,'honshu','tokugawa'],
    ['totomi','遠江',137.85,34.85,'honshu','imagawa'], ['suruga','駿河',138.45,35.15,'honshu','imagawa'],
    ['kai','甲斐',138.65,35.65,'honshu','takeda'], ['shinano_s','信濃',137.95,35.95,'honshu','takeda'],
    ['shinano_n','北信濃',138.2,36.6,'honshu','takeda'], ['echigo','越後',138.45,37.15,'honshu','uesugi'],
    ['echigo2','越後',139.25,37.85,'honshu','uesugi',0], ['kozuke','上野',139.0,36.45,'honshu','uesugi'],
    ['izu','伊豆',138.95,34.85,'honshu','hojo'], ['sagami','相模',139.3,35.4,'honshu','hojo'],
    ['musashi','武藏',139.5,35.95,'honshu','hojo'], ['shimotsuke','下野',139.85,36.65,'honshu','kokujin'],
    ['hitachi','常陸',140.35,36.4,'honshu','kokujin'], ['shimosa','下總',140.2,35.8,'honshu','kokujin'],
    ['kazusa','上總',140.15,35.4,'honshu','kokujin'], ['awa_b','安房',139.95,35.05,'honshu','kokujin'],
    ['mutsu_s','陸奧',140.4,37.45,'honshu','date'], ['mutsu_c','陸奧',141.0,38.6,'honshu','kokujin',0],
    ['mutsu_n','陸奧',141.3,39.7,'honshu','nanbu',0], ['mutsu_t','陸奧',140.7,40.7,'honshu','nanbu',0],
    ['dewa_s','出羽',140.1,38.4,'honshu','kokujin'], ['dewa_n','出羽',140.3,39.7,'honshu','kokujin',0],
    ['buzen','豐前',131.05,33.6,'kyushu','otomo'], ['chikuzen','筑前',130.55,33.55,'kyushu','otomo'],
    ['chikugo','筑後',130.6,33.25,'kyushu','otomo'], ['bungo','豐後',131.45,33.15,'kyushu','otomo'],
    ['hizen','肥前',129.95,33.1,'kyushu','kokujin'], ['higo','肥後',130.85,32.6,'kyushu','kokujin'],
    ['hyuga','日向',131.3,32.2,'kyushu','kokujin'], ['osumi','大隅',130.9,31.45,'kyushu','shimazu'],
    ['satsuma','薩摩',130.35,31.75,'kyushu','shimazu'],
    ['sanuki','讚岐',133.95,34.22,'shikoku','miyoshi'], ['awa','阿波',134.35,33.95,'shikoku','miyoshi'],
    ['iyo','伊予',132.85,33.7,'shikoku','kokujin'], ['tosa','土佐',133.55,33.45,'shikoku','chosokabe'],
    ['sado','佐渡',138.38,38.05,'sado','kokujin'], ['awaji','淡路',134.85,34.4,'awaji','miyoshi'],
    ['ezo','蝦夷',140.5,42.0,'ezo','ezo']
  ];
  const PROV = PROV_RAW.map(r => ({ id: r[0], n: r[1], lon: r[2], lat: r[3], isl: r[4], own: r[5], lbl: r[6] !== 0, xy: P(r[2], r[3]) }));
  const byId = Object.fromEntries(PROV.map(p => [p.id, p]));

  // 跨海相鄰
  const SEA_LINKS = [['awaji','settsu'],['awaji','harima'],['awaji','awa'],['awa','kii'],['sanuki','bizen'],['sanuki','bitchu'],
    ['iyo','aki'],['iyo','suo'],['buzen','nagato'],['sado','echigo2'],['ezo','mutsu_t']];

  const f2 = n => Math.round(n * 10) / 10;
  const fp = p => f2(p[0]) + ',' + f2(p[1]);
  function pairs(arr) { const o = []; for (let i = 0; i < arr.length; i += 2) o.push(P(arr[i], arr[i + 1])); return o; }
  function smooth(pts) {
    const n = pts.length; let d = 'M' + fp(pts[0]);
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += 'C' + fp(c1) + ' ' + fp(c2) + ' ' + fp(p2);
    }
    return d + 'Z';
  }
  const LANDPATH = Object.fromEntries(Object.entries(LAND).map(([k, v]) => [k, smooth(pairs(v))]));

  // 以半平面裁切求出 Voronoi 區塊（每座島各自計算，避免隔海誤判）
  function clipHalf(poly, a, b, c) {
    const out = [];
    for (let k = 0; k < poly.length; k++) {
      const p = poly[k], q = poly[(k + 1) % poly.length];
      const fpv = a * p[0] + b * p[1] - c, fq = a * q[0] + b * q[1] - c;
      if (fpv <= 0) out.push(p);
      if ((fpv < 0 && fq > 0) || (fpv > 0 && fq < 0)) { const t = fpv / (fpv - fq); out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]); }
    }
    return out;
  }
  const NEI = Object.fromEntries(PROV.map(p => [p.id, new Set()]));
  const CELL = {};
  Object.keys(CLIP).forEach(isl => {
    const group = PROV.filter(p => p.isl === isl);
    group.forEach(pi => {
      let poly = [[-60, -60], [W + 60, -60], [W + 60, H + 60], [-60, H + 60]];
      const [xi, yi] = pi.xy;
      group.forEach(pj => {
        if (pj === pi) return;
        const [xj, yj] = pj.xy;
        poly = clipHalf(poly, xj - xi, yj - yi, (xj * xj + yj * yj - xi * xi - yi * yi) / 2);
      });
      CELL[pi.id] = poly;
      group.forEach(pj => {
        if (pj === pi) return;
        const [xj, yj] = pj.xy, a = xj - xi, b = yj - yi, c = (xj * xj + yj * yj - xi * xi - yi * yi) / 2, s = Math.hypot(a, b);
        let on = 0;
        poly.forEach(v => { if (Math.abs(a * v[0] + b * v[1] - c) / s < 0.05) on++; });
        if (on >= 2) { NEI[pi.id].add(pj.id); NEI[pj.id].add(pi.id); }
      });
    });
  });
  SEA_LINKS.forEach(([a, b]) => { NEI[a].add(b); NEI[b].add(a); });
  NEI.ezo.clear();
  PROV.forEach(p => NEI[p.id].delete('ezo'));

  // 主要城郭與據點
  const SITES = [
    ['清洲城',136.85,35.2], ['岡崎城',137.16,34.95], ['躑躅崎館',138.58,35.68], ['春日山城',138.2,37.15],
    ['駿府',138.38,34.98], ['小田原城',139.15,35.25], ['吉田郡山城',132.7,34.66], ['稻葉山城',136.78,35.43],
    ['小谷城',136.27,35.46], ['一乘谷',136.24,36.0], ['觀音寺城',136.15,35.15], ['岡豐城',133.6,33.6],
    ['府內',131.6,33.23], ['內城',130.55,31.6], ['米澤',140.1,37.9]
  ];
  const SEA_LABELS = [['日本海',134.2,38.6,30],['太平洋',139.2,32.2,30],['瀨戶內海',132.95,34.2,13],['東シナ海',129.9,31.6,0]];

  const cellPath = poly => 'M' + poly.map(fp).join('L') + 'Z';
  function castleGlyph(x, y) {
    return `<g class="castle" transform="translate(${f2(x)},${f2(y)})"><path d="M-6,4h12l-2,-4h-8zM-4,0h8l-1.5,-3.5h-5zM-2.5,-3.5h5l-2.5,-3z"/></g>`;
  }

  function buildMap(svg, opt = {}) {
    const id = opt.id || 'm';
    let defs = `<defs>
      <pattern id="${id}-wave" width="40" height="20" patternUnits="userSpaceOnUse">
        ${[[20,0],[0,10],[40,10],[20,20]].map(([cx,cy]) => [17,12,7,2].map(r => `<circle class="wv" cx="${cx}" cy="${cy}" r="${r}"/>`).join('')).join('')}
      </pattern>
      <filter id="${id}-ink" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter>
      <filter id="${id}-paper"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="2" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.09 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
      ${Object.entries(CLIP).map(([k, parts]) => `<clipPath id="${id}-clip-${k}">${parts.map(p => `<path d="${LANDPATH[p]}"/>`).join('')}</clipPath>`).join('')}
    </defs>`;
    let html = defs;
    html += `<rect class="sea" x="-400" y="-400" width="${W + 800}" height="${H + 800}"/>`;
    html += `<rect fill="url(#${id}-wave)" class="sea-wave" x="-400" y="-400" width="${W + 800}" height="${H + 800}"/>`;
    html += `<g class="land-shadow">${Object.values(LANDPATH).map(d => `<path d="${d}"/>`).join('')}</g>`;
    html += `<g class="land-base">${Object.values(LANDPATH).map(d => `<path d="${d}"/>`).join('')}</g>`;
    html += '<g class="cells">';
    Object.keys(CLIP).forEach(k => {
      html += `<g clip-path="url(#${id}-clip-${k})">`;
      PROV.filter(p => p.isl === k).forEach(p => { html += `<path class="cell" data-id="${p.id}" d="${cellPath(CELL[p.id])}"/>`; });
      html += '</g>';
    });
    ['sado', 'awaji', 'ezo'].forEach(k => { html += `<path class="cell" data-id="${k}" d="${LANDPATH[k]}"/>`; });
    html += '</g>';
    html += `<g class="land-grain">${Object.values(LANDPATH).map(d => `<path d="${d}" filter="url(#${id}-paper)"/>`).join('')}</g>`;
    html += `<g class="coast" filter="url(#${id}-ink)">${Object.values(LANDPATH).map(d => `<path d="${d}"/>`).join('')}</g>`;
    html += '<g class="sites">' + SITES.map(s => { const [x, y] = P(s[1], s[2]); return castleGlyph(x, y); }).join('');
    const [kx, ky] = P(135.76, 35.01);
    html += `<g class="capital" transform="translate(${f2(kx)},${f2(ky)})"><circle r="9"/><text y="4">京</text></g></g>`;
    html += '<g class="plabels">' + PROV.filter(p => p.lbl).map(p => `<text data-id="${p.id}" x="${f2(p.xy[0])}" y="${f2(p.xy[1] + 5)}">${p.n}</text>`).join('') + '</g>';
    html += '<g class="slabels">' + SEA_LABELS.filter(s => s[3]).map(s => { const [x, y] = P(s[1], s[2]); return `<text x="${f2(x)}" y="${f2(y)}" style="font-size:${s[3]}px">${s[0]}</text>`; }).join('') + '</g>';
    html += `<g class="cartouche" transform="translate(40,60)"><rect width="150" height="54" rx="2"/><rect x="5" y="5" width="140" height="44" class="in"/><text x="75" y="34">日本六十餘州圖</text></g>`;
    html += `<g class="compass" transform="translate(${W - 70},${H - 90})"><circle r="26"/><path d="M0,-34L6,0L0,6L-6,0Z"/><text y="-40">北</text></g>`;
    html += '<g class="marks"></g>';
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = html;

    const cells = {};
    svg.querySelectorAll('.cell').forEach(el => { cells[el.dataset.id] = el; });
    let vb = [0, 0, W, H], anim = null;

    const api = {
      setOwners(owners, colors, mine) {
        Object.entries(cells).forEach(([pid, el]) => {
          const o = owners[pid] || 'kokujin';
          el.style.fill = colors[o] || '#999';
          el.classList.toggle('mine', o === mine);
          el.dataset.owner = o;
        });
      },
      highlight(ids) {
        Object.values(cells).forEach(el => el.classList.remove('hl'));
        (ids || []).forEach(i => cells[i] && cells[i].classList.add('hl'));
      },
      marks(list) { // [{lon,lat,label,cls}]
        svg.querySelector('.marks').innerHTML = list.map(m => {
          const [x, y] = P(m.lon, m.lat);
          return `<g class="mark ${m.cls || ''}" transform="translate(${f2(x)},${f2(y)})"><circle class="pulse" r="14"/><circle r="6"/>${m.label ? `<text y="-14">${m.label}</text>` : ''}</g>`;
        }).join('');
      },
      setView(box, animate = true) {
        const ar = (svg.clientWidth || 600) / (svg.clientHeight || 600);
        let [x, y, w, h] = box;
        if (w / h < ar) { const nw = h * ar; x -= (nw - w) / 2; w = nw; } else { const nh = w / ar; y -= (nh - h) / 2; h = nh; }
        const to = [x, y, w, h];
        if (anim) cancelAnimationFrame(anim);
        const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!animate || reduce) { vb = to; svg.setAttribute('viewBox', vb.map(f2).join(' ')); return; }
        const from = vb.slice(), t0 = performance.now();
        const step = t => {
          const k = Math.min(1, (t - t0) / 650), e = 1 - Math.pow(1 - k, 3);
          vb = from.map((v, i) => v + (to[i] - v) * e);
          svg.setAttribute('viewBox', vb.map(f2).join(' '));
          if (k < 1) anim = requestAnimationFrame(step);
        };
        anim = requestAnimationFrame(step);
      },
      boxFor(ids, pad = 120) {
        const pts = ids.map(i => byId[i]).filter(Boolean).map(p => p.xy);
        if (!pts.length) return [0, 0, W, H];
        const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
        const x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad, x1 = Math.max(...xs) + pad, y1 = Math.max(...ys) + pad;
        return [x0, y0, Math.max(x1 - x0, 360), Math.max(y1 - y0, 300)];
      },
      onClick(fn) {
        svg.addEventListener('click', e => { const c = e.target.closest('.cell'); if (c) fn(c.dataset.id, e); });
      }
    };
    return api;
  }

  function miniMap(lon, lat, label) {
    const [x, y] = P(lon, lat);
    const w = 520, h = 390;
    return `<svg class="minimap" viewBox="${f2(x - w / 2)} ${f2(y - h / 2)} ${w} ${h}" role="img" aria-label="位置：${label || ''}">
      <rect class="sea" x="${f2(x - w)}" y="${f2(y - h)}" width="${w * 2}" height="${h * 2}"/>
      ${Object.values(LANDPATH).map(d => `<path class="mm-land" d="${d}"/>`).join('')}
      <circle class="mm-pulse" cx="${f2(x)}" cy="${f2(y)}" r="16"/><circle class="mm-dot" cx="${f2(x)}" cy="${f2(y)}" r="6"/>
      ${label ? `<text class="mm-label" x="${f2(x)}" y="${f2(y - 16)}">${label}</text>` : ''}
    </svg>`;
  }

  window.TMap = { W, H, P, PROV, byId, NEI, buildMap, miniMap, LANDPATH };
})();

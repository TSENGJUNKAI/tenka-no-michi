// 天下之道 — 浮世繪：公有領域的江戶・明治武者繪，用在肖像、合戰與事件插畫
// 圖片皆取自 Wikimedia Commons，標示為公有領域（Public domain）；縮小後存放在 img/
window.TUki = (function () {
  const C = 'https://commons.wikimedia.org/wiki/File:';
  // fx, fy：臉部在圖中的位置（0–1）；z：做成圓形頭像時放大幾倍
  const ART = {
    p_oda: { t: '太平記英勇傳　太田上總介平春永（織田信長）', a: '歌川國芳', y: '1848–49', from: 'Wikimedia Commons', url: C + 'Oda-Nobunaga-by-Utagawa-Kuniyoshi.png', fx: .44, fy: .3, z: 2.8 },
    p_ieyasu: { t: '大日本名將鑑　德川家康', a: '月岡芳年', y: '1878', from: '東京都立圖書館', url: C + 'Tokugawa_Ieyasu_-_Directories_of_Famous_Generals_of_Japan.jpg', fx: .38, fy: .59, z: 5 },
    p_shingen: { t: '武田信玄', a: '歌川國芳', y: '1843–44', from: '大英博物館', url: C + 'Takeda_Shingen_%E6%AD%A6%E7%94%B0%E4%BF%A1%E7%8E%84_(BM_2008,3037.15309).jpg', fx: .52, fy: .37, z: 2.6 },
    p_kenshin: { t: '芳年武者无類　上杉輝虎入道謙信', a: '月岡芳年', y: '1883', from: '洛杉磯郡立美術館', url: C + 'Uesugi_Kenshin_Nyudo_Terutora_Riding_into_Battle_LACMA_M.2007.152.65.jpg', fx: .32, fy: .32, z: 3.2 },
    p_yoshimoto: { t: '太平記英勇傳　今川義元', a: '歌川國芳', y: '1848–50', from: '大英博物館', url: C + 'Imagawa-Yoshimoto-Ukiyo-e.jpg', fx: .55, fy: .41, z: 3 },
    p_motochika: { t: '大日本六十餘將　土佐 長宗我部元親', a: '歌川芳虎', y: '1866', from: 'Wikimedia Commons', url: C + 'Dai_Nihon_Rokuj%C5%AByosh%C5%8D,_Tosa_Ch%C5%8Dsokabe_Hata_no_Motochika_by_Yoshitora.jpg', fx: .52, fy: .5, z: 3 },
    p_motonari: { t: '大日本名將鑑　毛利元就夜襲嚴島', a: '月岡芳年', y: '1880', from: '洛杉磯郡立美術館', url: C + 'Mori_Motonari_Attacking_Sue_Harutaka_at_Itsukushima_LACMA_M.84.31.247.jpg' },
    p_kansuke: { t: '山本勘助', a: '歌川國芳', y: '1845–46', from: '大英博物館', url: C + 'Yamamoto_Kansuke_%E5%B1%B1%E6%9C%AC%E5%8B%98%E5%8A%A9_(BM_2008,3037.15510).jpg', fx: .56, fy: .56, z: 2.8 },
    p_katsuyori: { t: '武田伊奈四郎勝賴', a: '歌川國芳', y: '1845–46', from: '大英博物館', url: C + 'Takeda_Inashiro_Katsuyori_%E6%AD%A6%E7%94%B0%E4%BC%8A%E5%A5%88%E5%9B%9B%E9%83%8E%E5%8B%9D%E9%A0%BC_(BM_2008,3037.10502).jpg', fx: .44, fy: .5, z: 2 },
    p_kiyomasa: { t: '大日本名將鑑　加藤主計頭清正', a: '月岡芳年', y: '1878', from: '洛杉磯郡立美術館', url: C + 'Kato_Kazuenokami_Kiyomasa_Kneeling_by_a_Banner_LACMA_M.84.31.269.jpg', fx: .48, fy: .51, z: 2.8 },
    p_okubo: { t: '皇國二十四功　大久保彥左衛門救家康', a: '月岡芳年', y: '1881', from: '洛杉磯郡立美術館', url: C + 'Okubo_Hikozaemon_Tadanori_Rescuing_Tokugawa_Ieyasu_LACMA_M.84.31.128.jpg' },
    e_okehazama: { t: '桶狹間大合戰之圖', a: '右田年英', y: '明治後期', from: 'Wikimedia Commons', url: C + 'Imagawa_Yoshimoto,_Okehazama_Daikassen_no_Zu_by_Toshihide.jpg', pos: '50% 40%' },
    e_kawanakajima: { t: '武田上杉川中嶋大合戰之圖', a: '歌川國芳', y: '約 1845', from: '大英博物館', url: C + 'Takeda_Uesugi_Kawanakajima_o-kassen_no_zu_%E6%AD%A6%E7%94%B0%E4%B8%8A%E6%9D%89%E5%B7%9D%E4%B8%AD%E5%B6%8B%E5%A4%A7%E5%90%88%E6%88%A6%E3%81%AE%E5%9C%96_(Takeda_and_Uesugi_at_the_Battle_of_Kawanakajima)_(BM_2008,3037.18311).jpg' },
    e_anegawa: { t: '新撰太閤記　姉川大合戰', a: '歌川豐宣', y: '1883', from: 'Wikimedia Commons', url: C + 'Utagawa-Toyonobu-Shinsen-Taikoki-17-c.jpg' },
    e_mikatagahara: { t: '三方原之戰', a: '歌川芳虎', y: '1874', from: 'Wikimedia Commons', url: C + 'Battle_of_Mikatagahara.jpg', pos: '50% 45%' },
    e_nagashino: { t: '長篠合戰', a: '歌川豐宣', y: '1883', from: '洛杉磯郡立美術館', url: C + '%E9%95%B7%E7%AF%A0%E5%90%88%E6%88%B0_-_Nagashino_kassen_-_the_battle_of_Nagashino.jpg' },
    e_honnoji: { t: '大日本名將鑑　本能寺焰中的織田右大臣信長', a: '月岡芳年', y: '1878', from: '洛杉磯郡立美術館', url: C + 'Oda_Udaijin_Taira_no_Nobunaga_in_Flames_at_the_Temple_Honnoji_LACMA_M.84.31.116.jpg' },
    e_honnoji2: { t: '信長在本能寺的烈火中奮戰', a: '月岡芳年', y: '1878', from: '美國國會圖書館', url: C + 'Nobunaga_by_Yoshitoshi.jpg' },
    e_yamazaki: { t: '山崎合戰前的軍議', a: '歌川貞秀', y: '1863', from: 'Wikimedia Commons', url: C + 'War_Council_Before_the_Battle_of_Yamazaki.jpg', pos: '50% 40%' },
    e_ogurusu: { t: '月百姿　山城小栗栖月', a: '月岡芳年', y: '1885–92', from: 'Wikimedia Commons', url: C + 'Yoshitoshi_-_100_Aspects_of_the_Moon_-_19.jpg' },
    e_shizugatake: { t: '月百姿　志津嶽月', a: '月岡芳年', y: '1888', from: '荷蘭國家博物館', url: C + 'Hideyoshi_en_de_maan_te_Shizugatake-Rijksmuseum_RP-P-1989-218.jpeg' },
    e_itsukushima: { t: '嚴島合戰', a: '歌川貞秀', y: '約 1850', from: '波士頓美術館', url: C + 'Battle_Itsukushima.jpg', pos: '50% 45%' },
    e_tenmoku: { t: '天目山 武田勝賴戰死', a: '二代 歌川國輝', y: '1861', from: '波士頓美術館', url: C + 'Utagawa_Kuniteru_II_-_The_Death_in_Battle_of_Katsuyori_on_Mount_Tenmoku.jpg', pos: '50% 40%' }
  };
  // 寬幅（雙聯、三聯）的圖鋪滿整個情景框；直式的一枚摺則像掛軸一樣立在情景插畫上
  const WIDE = ['e_okehazama', 'e_mikatagahara', 'e_yamazaki', 'e_itsukushima', 'e_tenmoku', 'e_anegawa'];

  // 武將頭像：一般武將看 id，主君依當下的名字（勝賴、景勝不是信玄、謙信）
  const GEN = { a_oda: 'p_oda', a_tokugawa: 'p_ieyasu', a_takeda: 'p_shingen', a_uesugi: 'p_kenshin', a_chosokabe: 'p_motochika', yamamoto: 'p_kansuke' };
  const LEAD = { L_oda: [['信長', 'p_oda']], L_tokugawa: [['元康', 'p_ieyasu'], ['家康', 'p_ieyasu']], L_takeda: [['信玄', 'p_shingen'], ['勝賴', 'p_katsuyori']], L_uesugi: [['長尾景虎', 'p_kenshin'], ['輝虎', 'p_kenshin'], ['謙信', 'p_kenshin']], L_imagawa: [['義元', 'p_yoshimoto']], L_chosokabe: [['元親', 'p_motochika']] };
  function faceKey(g) {
    if (!g) return null;
    if (LEAD[g.id]) { const hit = LEAD[g.id].find(([n]) => (g.nm || '').includes(n)); return hit ? hit[1] : null; }
    return GEN[g.id] || null;
  }

  // 合戰與天下大事對應的插畫
  const BATTLE = { okehazama: 'e_okehazama', okehazama_i: 'e_okehazama', kawanakajima_t: 'e_kawanakajima', kawanakajima_u: 'e_kawanakajima', anegawa: 'e_anegawa', mikatagahara_toku: 'e_mikatagahara', mikatagahara_t: 'e_mikatagahara', nagashino_oda: 'e_nagashino', nagashino_t: 'e_nagashino', nagashino_toku: 'e_nagashino', honnoji: 'e_honnoji', koshu: 'e_tenmoku' };
  const WORLD = { w_okehazama: 'e_okehazama', w_kawanakajima: 'e_kawanakajima', w_anegawa: 'e_anegawa', w_mikata: 'e_mikatagahara', w_nagashino: 'e_nagashino', w_motonari: 'e_itsukushima', w_shingen: 'p_shingen', w_koshu: 'e_tenmoku' };
  // 結局：改寫歷史／如史實所載，以及「後來的歷史」
  const ENDING = {
    oda: { win: 'e_honnoji2', history: 'e_honnoji', after: ['e_yamazaki', 'e_ogurusu', 'e_shizugatake'] },
    tokugawa: { win: 'p_okubo', history: 'p_okubo' }, takeda: { win: 'p_katsuyori', history: 'e_tenmoku' },
    uesugi: { win: 'p_kenshin', history: 'p_kenshin' }, imagawa: { win: 'p_yoshimoto', history: 'e_okehazama' },
    mori: { win: 'p_motonari', history: 'p_motonari' }, chosokabe: { win: 'p_motochika', history: 'p_motochika' }
  };

  const src = k => `img/${k}.jpg`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const cap = k => `${ART[k].a}〈${ART[k].t}〉`;

  // 以 background 裁出臉部：把 (fx, fy) 放在框的正中央
  function faceStyle(k) {
    const a = ART[k], z = a.z || 2.6, ratio = 1.45;
    const p = (f, zz) => zz <= 1 ? 50 : Math.max(0, Math.min(100, (f * zz - .5) / (zz - 1) * 100));
    return `background-image:url(${src(k)});background-size:${z * 100}% auto;background-position:${p(a.fx, z).toFixed(1)}% ${p(a.fy, z * ratio).toFixed(1)}%`;
  }
  const faceHtml = k => `<span class="ukf" role="img" aria-label="${esc(cap(k))}" style="${faceStyle(k)}"></span>`;

  // 情景框：寬幅鋪滿；直式立在原本的情景插畫上
  function sceneHtml(k, svg) {
    const a = ART[k];
    if (WIDE.includes(k)) return `<img class="uk-wide" src="${src(k)}" alt="${esc(cap(k))}" style="object-position:${a.pos || '50% 50%'}" data-uk="${k}" loading="lazy"><span class="uk-cap">${esc(cap(k))}</span>`;
    return `${svg}<span class="uk-veil"></span><img class="uk-print" src="${src(k)}" alt="${esc(cap(k))}" data-uk="${k}" loading="lazy"><span class="uk-cap">${esc(cap(k))}</span>`;
  }

  // 點圖放大
  function lightbox(k) {
    const a = ART[k]; if (!a) return;
    const d = document.createElement('div');
    d.className = 'uk-lb'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', a.t);
    d.innerHTML = `<figure><img src="${src(k)}" alt="${esc(cap(k))}"><figcaption><b class="brush">${esc(a.t)}</b><span>${esc(a.a)}・${esc(a.y)}・${esc(a.from)}藏・公有領域</span><a href="${a.url}" target="_blank" rel="noopener">原圖（Wikimedia Commons）↗</a></figcaption></figure><button class="btn btn-sm" aria-label="關閉">✕</button>`;
    const close = () => { d.remove(); document.removeEventListener('keydown', key); };
    const key = e => { if (e.key === 'Escape') close(); };
    d.onclick = e => { if (!e.target.closest('a')) close(); };
    document.addEventListener('keydown', key);
    document.body.appendChild(d);
  }
  document.addEventListener('click', e => { const t = e.target.closest('[data-uk]'); if (t && !e.defaultPrevented) lightbox(t.dataset.uk); });

  // 出處頁：所有浮世繪的畫廊與來源
  function galleryHtml() {
    return `<p class="fine">遊戲裡的浮世繪都是江戶末期到明治時代的「武者繪」。畫師生於戰國之後兩三百年，畫的是當時流傳的軍記故事與英雄形象，不是寫實的紀錄，但能看到後世的日本人怎麼想像這些武將。所有圖片取自 Wikimedia Commons，標示為公有領域；為了讓遊戲載入快一點，都縮小過。點圖可以放大。</p>
      <div class="uk-gal">${Object.keys(ART).map(k => { const a = ART[k]; return `<figure class="uk-item"><img src="${src(k)}" alt="${esc(cap(k))}" data-uk="${k}" loading="lazy"><figcaption><b>${esc(a.t)}</b><span>${esc(a.a)}・${esc(a.y)}</span><span>${esc(a.from)}藏・公有領域</span><a href="${a.url}" target="_blank" rel="noopener">原圖頁面 ↗</a></figcaption></figure>`; }).join('')}</div>`;
  }

  return { ART, faceKey, faceHtml, sceneHtml, lightbox, galleryHtml, battle: id => BATTLE[id] || null, world: id => WORLD[id] || null, ending: (fac, kind) => (ENDING[fac] || {})[kind] || null, after: fac => (ENDING[fac] || {}).after || [], cap };
})();

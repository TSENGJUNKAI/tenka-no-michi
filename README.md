# 天下之道

以 1560–1582 年日本戰國時代為舞台的肉鴿（roguelike）策略遊戲，邊玩邊認識戰國史。

選擇一位大名，在分岔的路線上做出抉擇、招攬名將、攻城略地，每章最後迎來一場真實的歷史決戰。每個事件與戰役結束後，都會附上一段「史實」說明，對照歷史上真正發生的事。

## 特色

- **八個可玩勢力**：織田信長、德川家康、武田信玄、上杉謙信、北條氏康、今川義元、毛利元就、長宗我部元親，各有獨特機制與專屬劇本（部分勢力需通關解鎖）。可選初陣、尋常、修羅三種難度。
- **年代系統**：約 50 位武將依真實生卒年登場與退場；主君也會隨史實改名或繼承（元康→家康、信玄→勝賴、謙信→景勝／景虎）。
- **三路布陣合戰**：戰場分成左翼、中央、右翼。開戰前選陣形（魚鱗、鶴翼、鋒矢、偃月、方圓）、分配大將與兵力、決定兵種（鐵砲克騎馬、騎馬克長槍、長槍克鐵砲）；每回合依敵軍公開的意圖（突擊、固守、射擊）下達進攻、固守、誘敵的軍令，並適時投入預備隊與計策。戰場以圖畫呈現：我軍在左、敵軍在右，騎馬隊、長槍隊、鐵砲隊會畫成一群小兵。五種陣形各有不同的形狀與本陣位置（偃月的大將站在最前、方圓把本陣圍在中間），換陣形時部隊會移動過去，敵軍的陣形也看得到；鶴翼兩翼都得勝時會合攏包圍。下令後部隊會衝鋒、射擊。
- **聰明的敵軍**：敵將有個性（猛攻、堅守、狡猾、重鐵砲），會擺陣形、投入預備隊，狡猾的敵將還會用假意圖騙你；雨、霧、雪等天候也會影響戰局。
- **自選攻打目標**：在地圖上挑選要攻打的鄰國，每國有地形（山地／平原）與特產（甲斐金山、石見銀山、堺、國友鐵砲……）。
- **城主與反攻**：攻下的國可以派家臣當城主（增加收入、守城更穩，但不能上戰場）；敵國也會趁你出兵時反攻。
- **歷史決戰**：桶狹間、稻葉山城、川中島、三方原、長篠、手取川、本能寺、伊賀越、甲州征伐、魚津城等。
- **天下大事**：清洲同盟、信長上洛、金崎之退口、火燒比叡山、信玄病逝、御館之亂……依年份自動發生。
- **武將成長**：家臣在合戰與事件中累積功勳，從「新參」晉升到「天下之士」，能力與技能隨之提升。
- **羈絆與名物**：德川四天王、兩兵衛、真田三代等組合加成；九十九髮茄子、村正、蜻蛉切、三日月宗近等 17 件名物。
- **現代地名**：每個令制國都標註今天的都道府縣（例如尾張＝愛知縣西部），地圖可切換古名／今名，圖鑑有依「五畿七道」分區的地理頁。
- **戰國圖鑑與年表**：遇過的武將、事件會永久收錄，年表依你經歷過的事件逐一點亮。
- **武將詳細資料**：點家臣卡片、招募畫面或布陣時的「詳細」，可以看到武將的生平、能力、技能與羈絆，每項能力都寫出實際影響（例如「武勇 88：擔任大將時那一路戰力 +25%」）。
- **看得懂的數值**：狀態列寫全名（兵力、金錢、威望、忠誠），點一下就有說明；圖鑑的「用語」頁集中解釋路線、資源、武將與合戰的名詞。合戰時每一路都會顯示雙方戰力比較，並把大將武勇、兵種相剋、陣形、地形、天候等加成一項一項列出來，戰報也會寫出原因。
- **美術與動畫**：每位武將都有依甲冑特徵繪製的肖像（伊達的新月、本多的鹿角、直江的「愛」字……）；情景插畫隨季節（春櫻、秋楓、冬雪）與時段變化；以 [GSAP](https://gsap.com/) 製作捲軸展開、章節標題、合戰特效與勝敗朱印。遊戲內可切換動畫開關。
- **新手教學與對話**：第一次合戰有逐步引導；事件改成一句一句出現的對話，附說話者肖像。
- **浮世繪**：主君肖像、歷史決戰與天下大事的插畫，換成江戶末期到明治時代的武者繪（歌川國芳、月岡芳年等），點圖可以放大；結局畫面會附上「後來的歷史」。圖鑑的「出處」頁列出每幅圖與每首音樂的來源。
- **音樂與音效**：平時、合戰、決戰前各有一首開放授權的背景音樂（太鼓與和風旋律），換場時交叉淡入淡出；音效以 Web Audio 即時合成。音檔載入失敗時改用合成的古箏、太鼓、尺八（都節音階）。
- 手繪令制國地圖，可以拖曳移動、用滾輪或雙指縮放；支援深色模式與手機。

## 怎麼玩

這是純前端的靜態網頁，不需要安裝任何東西：

- 直接用瀏覽器開啟 `index.html`，或
- 在資料夾內執行 `python -m http.server` 後開啟 `http://localhost:8000`。

存檔與圖鑑進度儲存在瀏覽器的 localStorage。

## 檔案

| 檔案 | 內容 |
|---|---|
| `index.html` | 版面與樣式 |
| `map.js` | 日本地圖：海岸線、令制國分區、勢力範圍 |
| `data.js` | 遊戲內容：勢力、武將、名物、羈絆、戰役、事件 |
| `art.js` | 家紋、武將肖像與情景插畫 |
| `fx.js` | 動畫效果（GSAP） |
| `audio.js` | 背景音樂（播放 `music/`，備用合成）與音效 |
| `ukiyo.js` | 浮世繪目錄：出處、肖像裁切、對應的合戰與事件 |
| `img/` | 浮世繪縮圖（公有領域） |
| `music/` | 背景音樂（創用 CC 授權） |
| `game.js` | 遊戲流程、合戰、存檔與圖鑑 |

## 圖片出處

`img/` 裡的浮世繪都取自 [Wikimedia Commons](https://commons.wikimedia.org/)，標示為公有領域（Public domain）。為了讓遊戲載入快一點，都縮小成長邊 720–900 像素。

| 作品 | 畫師 | 年代 | 原圖 |
|---|---|---|---|
| 太平記英勇傳　太田上總介平春永（織田信長） | 歌川國芳 | 1848–49 | [Commons](https://commons.wikimedia.org/wiki/File:Oda-Nobunaga-by-Utagawa-Kuniyoshi.png) |
| 大日本名將鑑　德川家康 | 月岡芳年 | 1878 | [Commons](https://commons.wikimedia.org/wiki/File:Tokugawa_Ieyasu_-_Directories_of_Famous_Generals_of_Japan.jpg) |
| 武田信玄 | 歌川國芳 | 1843–44 | [Commons](https://commons.wikimedia.org/wiki/File:Takeda_Shingen_%E6%AD%A6%E7%94%B0%E4%BF%A1%E7%8E%84_%28BM_2008,3037.15309%29.jpg) |
| 芳年武者无類　上杉輝虎入道謙信 | 月岡芳年 | 1883 | [Commons](https://commons.wikimedia.org/wiki/File:Uesugi_Kenshin_Nyudo_Terutora_Riding_into_Battle_LACMA_M.2007.152.65.jpg) |
| 太平記英勇傳　今川義元 | 歌川國芳 | 1848–50 | [Commons](https://commons.wikimedia.org/wiki/File:Imagawa-Yoshimoto-Ukiyo-e.jpg) |
| 大日本六十餘將　土佐 長宗我部元親 | 歌川芳虎 | 1866 | [Commons](https://commons.wikimedia.org/wiki/File:Dai_Nihon_Rokuj%C5%AByosh%C5%8D,_Tosa_Ch%C5%8Dsokabe_Hata_no_Motochika_by_Yoshitora.jpg) |
| 大日本名將鑑　毛利元就夜襲嚴島 | 月岡芳年 | 1880 | [Commons](https://commons.wikimedia.org/wiki/File:Mori_Motonari_Attacking_Sue_Harutaka_at_Itsukushima_LACMA_M.84.31.247.jpg) |
| 山本勘助 | 歌川國芳 | 1845–46 | [Commons](https://commons.wikimedia.org/wiki/File:Yamamoto_Kansuke_%E5%B1%B1%E6%9C%AC%E5%8B%98%E5%8A%A9_%28BM_2008,3037.15510%29.jpg) |
| 武田伊奈四郎勝賴 | 歌川國芳 | 1845–46 | [Commons](https://commons.wikimedia.org/wiki/File:Takeda_Inashiro_Katsuyori_%E6%AD%A6%E7%94%B0%E4%BC%8A%E5%A5%88%E5%9B%9B%E9%83%8E%E5%8B%9D%E9%A0%BC_%28BM_2008,3037.10502%29.jpg) |
| 大日本名將鑑　加藤主計頭清正 | 月岡芳年 | 1878 | [Commons](https://commons.wikimedia.org/wiki/File:Kato_Kazuenokami_Kiyomasa_Kneeling_by_a_Banner_LACMA_M.84.31.269.jpg) |
| 皇國二十四功　大久保彥左衛門救家康 | 月岡芳年 | 1881 | [Commons](https://commons.wikimedia.org/wiki/File:Okubo_Hikozaemon_Tadanori_Rescuing_Tokugawa_Ieyasu_LACMA_M.84.31.128.jpg) |
| 桶狹間大合戰之圖 | 右田年英 | 明治後期 | [Commons](https://commons.wikimedia.org/wiki/File:Imagawa_Yoshimoto,_Okehazama_Daikassen_no_Zu_by_Toshihide.jpg) |
| 武田上杉川中嶋大合戰之圖 | 歌川國芳 | 約 1845 | [Commons](https://commons.wikimedia.org/wiki/File:Takeda_Uesugi_Kawanakajima_o-kassen_no_zu_%E6%AD%A6%E7%94%B0%E4%B8%8A%E6%9D%89%E5%B7%9D%E4%B8%AD%E5%B6%8B%E5%A4%A7%E5%90%88%E6%88%A6%E3%81%AE%E5%9C%96_%28Takeda_and_Uesugi_at_the_Battle_of_Kawanakajima%29_%28BM_2008,3037.18311%29.jpg) |
| 新撰太閤記　姉川大合戰 | 歌川豐宣 | 1883 | [Commons](https://commons.wikimedia.org/wiki/File:Utagawa-Toyonobu-Shinsen-Taikoki-17-c.jpg) |
| 三方原之戰 | 歌川芳虎 | 1874 | [Commons](https://commons.wikimedia.org/wiki/File:Battle_of_Mikatagahara.jpg) |
| 長篠合戰 | 歌川豐宣 | 1883 | [Commons](https://commons.wikimedia.org/wiki/File:%E9%95%B7%E7%AF%A0%E5%90%88%E6%88%B0_-_Nagashino_kassen_-_the_battle_of_Nagashino.jpg) |
| 本能寺焰中的織田右大臣信長 | 月岡芳年 | 1878 | [Commons](https://commons.wikimedia.org/wiki/File:Oda_Udaijin_Taira_no_Nobunaga_in_Flames_at_the_Temple_Honnoji_LACMA_M.84.31.116.jpg) |
| 信長在本能寺的烈火中奮戰 | 月岡芳年 | 1878 | [Commons](https://commons.wikimedia.org/wiki/File:Nobunaga_by_Yoshitoshi.jpg) |
| 山崎合戰前的軍議 | 歌川貞秀 | 1863 | [Commons](https://commons.wikimedia.org/wiki/File:War_Council_Before_the_Battle_of_Yamazaki.jpg) |
| 月百姿　山城小栗栖月 | 月岡芳年 | 1885–92 | [Commons](https://commons.wikimedia.org/wiki/File:Yoshitoshi_-_100_Aspects_of_the_Moon_-_19.jpg) |
| 月百姿　志津嶽月 | 月岡芳年 | 1888 | [Commons](https://commons.wikimedia.org/wiki/File:Hideyoshi_en_de_maan_te_Shizugatake-Rijksmuseum_RP-P-1989-218.jpeg) |
| 嚴島合戰 | 歌川貞秀 | 約 1850 | [Commons](https://commons.wikimedia.org/wiki/File:Battle_Itsukushima.jpg) |
| 天目山 武田勝賴戰死 | 二代 歌川國輝 | 1861 | [Commons](https://commons.wikimedia.org/wiki/File:Utagawa_Kuniteru_II_-_The_Death_in_Battle_of_Katsuyori_on_Mount_Tenmoku.jpg) |

## 音樂出處

`music/` 裡的三首曲子都是創用 CC 姓名標示授權，為了讓遊戲載入快一點，重新壓縮成 96 kbps MP3。

| 檔案 | 用途 | 曲名與作者 | 授權 |
|---|---|---|---|
| `calm.mp3` | 平時（地圖、事件） | "Ishikari Lore" Kevin MacLeod ([incompetech.com](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100192)) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| `battle.mp3` | 合戰 | "Taiko drums (seamless loop)" by jobro ([freesound.org](https://freesound.org/people/jobro/sounds/112248/))，由 congusbongus 剪成循環（[OpenGameArt](https://opengameart.org/content/taiko-drums-seamless-loop)） | [CC BY 3.0](http://creativecommons.org/licenses/by/3.0/) |
| `tense.mp3` | 歷史決戰前、危急時 | "Asian Drums" Kevin MacLeod ([incompetech.com](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100396)) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |

## 關於史實

史實說明依據通說整理；標註「傳說」「據說」者真偽未定。地圖的國界為簡化示意，肉鴿模式中的武將組合屬於架空的「夢之共演」。

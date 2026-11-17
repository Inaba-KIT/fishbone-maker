// 使い方.pdf（A4横・1枚のリーフレット）を作る
//
// 使い方（リポジトリのいちばん上のフォルダで）：
//   npm install --no-save playwright
//   npx playwright install chromium
//   node tools/make-manual.js
//
// index.html を実際にブラウザで開いて画面を切り抜き、使い方.pdf を上書きする。
// ボタンの配置や見た目を変えたら、これを実行し直して PDF も作り直すこと。
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');
const dir = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch();
  const sample = JSON.parse(fs.readFileSync(path.join(dir, 'サンプル.json'), 'utf8'));
  sample.bones[0].smalls = ['睡眠不足', 'スマホが気になる'];
  const app = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 3 });
  await app.addInitScript(d => localStorage.setItem('fishbone-maker-v1', d), JSON.stringify(sample));
  await app.goto(pathToFileURL(path.join(dir, 'index.html')).href);
  await app.waitForTimeout(300);
  const rect = sel => app.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }, sel);
  // 切り抜き。pointer はマウスの絵を置く位置（画面の座標）
  async function crop(box, pointer) {
    const clip = { x: box.x, y: box.y, width: box.w, height: box.h };
    const img = (await app.screenshot({ clip })).toString('base64');
    const p = pointer ? { left: (pointer.x - box.x) / box.w * 100, top: (pointer.y - box.y) / box.h * 100 } : null;
    return { img, p, ratio: box.w / box.h };
  }
  const head = await rect('[data-key="head"] rect');
  const bone = await rect('[data-key="bone-0"] rect');
  const spineY = head.y + head.h / 2;

  // STEP1 問題
  const s1 = await crop({ x: head.x - 80, y: head.y - 14, w: head.w + 96, h: head.h + 28 },
    { x: head.x + head.w * 0.86, y: head.y + head.h * 0.8 });
  // STEP2 要因
  const s2 = await crop({ x: bone.x - 40, y: bone.y - 20, w: bone.w + 80, h: 150 },
    { x: bone.x + bone.w * 0.65, y: bone.y + bone.h * 0.75 });
  // STEP3 小要因（入力中のところ）
  await app.click('[data-key="small-0-1"]');
  await app.keyboard.press('End');
  await app.keyboard.press('Enter');
  await app.keyboard.type('朝ごはんを食べない');
  // 要因1の小骨と入力欄がすべて入る範囲
  const u = await app.evaluate(() => {
    const rs = [...document.querySelectorAll('[data-key^="small-0-"] rect, .inline-editor')].map(e => e.getBoundingClientRect());
    return { l: Math.min(...rs.map(r => r.left)), t: Math.min(...rs.map(r => r.top)), r: Math.max(...rs.map(r => r.right)), b: Math.max(...rs.map(r => r.bottom)) };
  });
  const s3 = await crop({ x: u.l - 16, y: u.t - 30, w: u.r - u.l + 70, h: u.b - u.t + 52 }, null);
  await app.keyboard.press('Escape');
  // STEP4 保存・書き出し（保存ボタンとメニュー）
  await app.click('#menuButton');
  const save = await rect('#saveButton');
  const menu = await rect('#menuList');
  const pptx = await rect('#exportPptx');
  const s4 = await crop({ x: Math.min(save.x, menu.x) - 12, y: save.y - 8, w: 1280 - Math.min(save.x, menu.x) + 4, h: pptx.y + pptx.h - save.y + 14 },
    { x: save.x + save.w * 0.62, y: save.y + save.h * 0.78 });
  await app.click('#menuButton');

  const pointerSvg = `<svg class="ptr" viewBox="0 0 24 24"><path d="M4 2l15 11-6.5 1.2 3.8 7.3-3 1.5-3.7-7.4L4 20z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  const pic = s => `<div class="pic"><div class="pic-in" style="aspect-ratio:${s.ratio};width:min(100%, calc(64mm * ${s.ratio}))"><img src="data:image/png;base64,${s.img}">` +
    (s.p ? `<span class="ptr-wrap" style="left:${s.p.left}%;top:${s.p.top}%">${pointerSvg}</span>` : '') + `</div></div>`;

  // ボタンの絵（ツールと同じ見た目）
  const C = '#1F4E79', R = '#B3261E';
  const round = (sym, color) => `<svg viewBox="0 0 24 24" class="ic"><circle cx="12" cy="12" r="10" fill="#fff" stroke="${color}" stroke-width="1.8"/>` +
    (sym === 'cross' ? `<g transform="rotate(45 12 12)">` : '<g>') +
    `<line x1="7" y1="12" x2="17" y2="12" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/>` +
    (sym !== 'minus' ? `<line x1="12" y1="7" x2="12" y2="17" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/>` : '') + `</g></svg>`;
  const pill = `<span class="pillbtn">＋ 大骨を追加</span>`;
  const fd = `<span class="sqbtn"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 3h13l4 4v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" fill="none" stroke="${C}" stroke-width="2" stroke-linejoin="round"/><path d="M7 3v6h9V3" fill="none" stroke="${C}" stroke-width="2" stroke-linejoin="round"/><path d="M13 5v2" stroke="${C}" stroke-width="2" stroke-linecap="round"/><rect x="7" y="13" width="10" height="8" fill="none" stroke="${C}" stroke-width="2"/></svg></span>`;
  const fit = `<span class="sqbtn"><svg viewBox="0 0 20 20" width="16" height="16"><path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
  const keys = k => `<kbd>${k}</kbd>`;

  const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>
    @page { size: A4 landscape; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; }
    body { width: 297mm; height: 210mm; font-family: "Meiryo UI", "Meiryo", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "IPAPGothic", sans-serif; color: #1d2733; overflow: hidden; background: #fff; }
    .band { background: #1F4E79; color: #fff; padding: 7mm 12mm 6mm; display: flex; align-items: flex-end; gap: 8mm; position: relative; }
    .band h1 { margin: 0; font-size: 25pt; letter-spacing: .02em; }
    .band .catch { font-size: 13pt; opacity: .95; padding-bottom: 3px; }
    .band .url { margin-left: auto; font-size: 9pt; opacity: .85; padding-bottom: 4px; }
    .lead { padding: 4mm 12mm 0; font-size: 11pt; color: #333; }
    .lead b { color: #1F4E79; }
    .steps { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 5mm; padding: 4mm 12mm 0; }
    .step { border-radius: 10px; background: #F2F6FA; padding: 4mm 4mm 4mm; display: flex; flex-direction: column; position: relative; }
    .step + .step::before { content: ""; position: absolute; left: -4.6mm; top: 50%; border: 2.2mm solid transparent; border-left: 2.8mm solid #9DB7D1; transform: translateY(-50%); }
    .tag { align-self: flex-start; display: inline-block; background: #E8590C; color: #fff; font-weight: bold; font-size: 9pt; border-radius: 999px; padding: 1px 9px; letter-spacing: .05em; }
    .step h2 { margin: 2mm 0 2.5mm; font-size: 15pt; color: #1F4E79; line-height: 1.25; }
    .pic { height: 69mm; display: flex; align-items: center; justify-content: center; background: #fff; border-radius: 6px; border: 1px solid #D5DEE8; overflow: hidden; padding: 2mm; }
    .pic-in { position: relative; }
    .pic-in img { width: 100%; height: 100%; display: block; }
    .ptr-wrap { position: absolute; width: 9mm; height: 9mm; filter: drop-shadow(0 1px 1.5px rgba(0,0,0,.35)); }
    .ptr { width: 100%; height: 100%; display: block; }
    .step p { margin: 3mm 0 0; font-size: 11pt; line-height: 1.5; }
    kbd { font-family: inherit; font-size: 9pt; border: 1px solid #9aa7b4; border-bottom-width: 2px; border-radius: 4px; padding: 0 5px; background: #fff; }
    .bottom { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr); gap: 6mm; padding: 5mm 12mm 0; }
    .card { border: 1.5px solid #D5DEE8; border-radius: 10px; padding: 3.5mm 5mm; }
    .card h3 { margin: 0 0 2.5mm; font-size: 11.5pt; color: #1F4E79; }
    .btns { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2.4mm 4mm; font-size: 10pt; }
    .btns div { display: flex; align-items: center; gap: 2.4mm; white-space: nowrap; }
    .ic { width: 6mm; height: 6mm; flex: none; }
    .pillbtn { font-size: 8pt; font-weight: bold; color: ${C}; border: 1.5px solid ${C}; border-radius: 999px; padding: 1px 7px; background: #fff; flex: none; }
    .sqbtn { display: inline-flex; border: 1.5px solid ${C}; border-radius: 6px; padding: 3px 5px; background: #fff; flex: none; }
    .tips { background: #FFF4EC; border-color: #F5C9A8; }
    .tips h3 { color: #B4460A; }
    .tips ul { margin: 0; padding-left: 1.1em; font-size: 10pt; line-height: 1.55; }
    .tips li { margin-bottom: 1.2mm; }
    .foot { position: absolute; left: 12mm; right: 12mm; bottom: 5mm; font-size: 8.5pt; color: #6b7785; display: flex; justify-content: space-between; }
  </style></head><body>
  <div class="band"><h1>フィッシュボーン図メーカー</h1><div class="catch">クリックして書くだけ。原因がひと目でわかる。</div>
    <div class="url">inaba-kit.github.io/fishbone-maker</div></div>
  <div class="lead">図の<b>文字をクリック</b>すると、その場で書けます。上から順に 1 → 4 で完成です。</div>
  <div class="steps">
    <div class="step"><span class="tag">STEP 1</span><h2>問題を書く</h2>${pic(s1)}
      <p>右の<b>頭</b>をクリック。困っていること・起きている結果を書きます。</p></div>
    <div class="step"><span class="tag">STEP 2</span><h2>要因を書く</h2>${pic(s2)}
      <p><b>四角</b>をクリック。原因のまとまり（人・方法・環境…）を書きます。</p></div>
    <div class="step"><span class="tag">STEP 3</span><h2>小要因を書く</h2>${pic(s3)}
      <p><b>線の上</b>をクリック。${keys('Enter')}で次の行へどんどん書けます。終わりは${keys('Esc')}。</p></div>
    <div class="step"><span class="tag">STEP 4</span><h2>保存・書き出し</h2>${pic(s4)}
      <p>${fd}で<b>保存</b>。<b>メニュー</b>から画像・PDF・PowerPointに。</p></div>
  </div>
  <div class="bottom">
    <div class="card"><h3>ボタンの意味</h3><div class="btns">
      <div>${round('plus', C)}小要因を増やす</div>
      <div>${round('minus', R)}小要因を消す</div>
      <div>${round('cross', R)}要因を消す</div>
      <div>${pill}要因を増やす</div>
      <div>${fd}ファイルに保存</div>
      <div>${fit}図の全体を見る</div>
    </div></div>
    <div class="card tips"><h3>ここだけ注意</h3><ul>
      <li>書いた内容はブラウザに<b>自動保存</b>。同じPCならそのまま続きができます。</li>
      <li>別のPCで続ける・提出するときは${fd}で<b>ファイルに保存</b>。</li>
    </ul></div>
  </div>
  <div class="foot"><span>メニューの「ファイルを開く」で、保存したファイルの続きから作業できます。配色は4種類から選べます。</span><span>書いた内容がインターネットに送られることはありません</span></div>
  </body></html>`;
  const p = await b.newPage();
  await p.setContent(html, { waitUntil: 'load' });
  await p.pdf({ path: path.join(dir, '使い方.pdf'), width: '297mm', height: '210mm', printBackground: true });
  await b.close();
})();

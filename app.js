/* 喵其林指南・加值互動
   內容都已在 HTML 裡（給 AI 與搜尋引擎讀）；這支只負責篩選、查詢、換算。 */
(function () {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function fmt(n) { return Number(n).toLocaleString('zh-TW'); }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  /* 搜尋字用空白分成幾個詞，每個詞都要出現（順序不限），例：「法米納 魚」 */
  function 詞(q) { return String(q || '').trim().toLowerCase().split(/\s+/).filter(Boolean); }
  function 全中(text, q) { var t = String(text || '').toLowerCase(); return 詞(q).every(function (w) { return t.indexOf(w) >= 0; }); }
  function hl(text, q) {
    var t = esc(text), ws = 詞(q); if (!ws.length) return t;
    var qs = ws.map(function (w) { return esc(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|');
    return t.replace(new RegExp('(' + qs + ')', 'ig'), '<mark>$1</mark>');
  }
  var main = document.getElementById('main');


  /* 停更提示：超過 14 天沒更新成功就明講 */
  var 最後 = window.PAW_STALE_FROM;
  if (最後) {
    var 天 = Math.floor((Date.now() - new Date(最後.replace(' ', 'T') + ':00+08:00')) / 864e5);
    if (天 > 14) main.insertAdjacentHTML('afterbegin', '<div class="note warn">資料已經 ' + 天 + ' 天沒有更新成功（最後一次：' + esc(最後) + '）。這段期間的新公告可能還沒收錄。</div>');
  }

  /* 食安快報：篩選（卡片都已在頁面上，這裡只切換顯示） */
  var ff = $('#ff');
  if (ff) {
    var cards = Array.prototype.slice.call(document.querySelectorAll('#flist .card'));
    var p = new URLSearchParams(location.search);
    ['q', 'c', 't', 'y'].forEach(function (k) { var el = ff.elements[k]; if (el && p.get(k)) el.value = p.get(k); });
    var 更新 = function () {
      var q = ff.elements.q.value.trim().toLowerCase(), c = ff.elements.c.value, t = ff.elements.t.value, y = ff.elements.y.value, n = 0;
      cards.forEach(function (el) {
        var ok = (!c || el.dataset.c === c) && (!t || el.dataset.t.split('|').indexOf(t) >= 0) && (!y || el.dataset.y === y) && (!q || 全中(el.dataset.q, q));
        el.hidden = !ok; if (ok) n++;
      });
      $('#fcount').textContent = '符合 ' + n + ' 筆（共 ' + cards.length + ' 筆）';
      $('#fempty').hidden = n > 0;
      var s = new URLSearchParams(); if (q) s.set('q', q); if (c) s.set('c', c); if (t) s.set('t', t); if (y) s.set('y', y);
      history.replaceState(null, '', location.pathname + (s.toString() ? '?' + s : ''));
    };
    ff.addEventListener('input', 更新); ff.addEventListener('change', 更新);
    ff.addEventListener('submit', function (ev) { ev.preventDefault(); 更新(); });
    更新();
  }

  var E = window.PAW_EVENTS || [];

  /* 首頁「我知道產品」：打字時先找營養建檔款與品牌，送出則到查一包（全部申報資料） */
  var hq = $('#hq'), hsug = $('#hsug'), B = window.PAW_BRANDS || [], F = window.PAW_FOODS || [];
  if (hq && hsug) {
    hq.addEventListener('input', function () {
      var q = hq.value.trim();
      if (!q) { hsug.innerHTML = ''; return; }
      /* 貓的狀況：打這些詞，帶到「搜貓飯」並幫忙勾好（元首 20261016 12:10 定）；只篩數字與品名，不代表適合 */
      var 況 = [[/腎/, 'c', '低磷', '低磷（暫定門檻）'], [/胖|肥|減重|體重/, 'c', '低脂', '低脂（暫定門檻）'],
        [/泌尿|尿/, 'c', '泌尿', '品名寫泌尿'], [/毛球|化毛|吐毛/, 'c', '毛球', '品名寫化毛或毛球'],
        [/腸胃|軟便|拉肚子|消化|敏感|過敏|低敏/, 'c', '敏感', '品名寫腸胃、敏感或低敏'],
        [/幼貓|小貓|kitten/i, 'a', '幼貓', '幼貓'], [/老貓|熟齡|高齡|老年|senior/i, 'a', '熟齡貓', '熟齡貓'], [/成貓|adult/i, 'a', '成貓', '成貓']];
      var 中況 = 況.filter(function (r) { return r[0].test(q); });
      var 參 = new URLSearchParams();
      中況.forEach(function (r) { if (r[1] === 'a') 參.set('a', r[2]); else 參.append('c', r[2]); });
      var 況區 = 中況.length ? '<p class="muted" style="margin:8px 0 4px">依貓的狀況找：</p><p style="margin:0"><a class="btn small ghost" href="/?' + 參 + '">' + 中況.map(function (r) { return esc(r[3]); }).join('・') + ' → 看符合的貓飯</a></p><p class="muted" style="margin:4px 0 0">依數字或官方品名篩選，不代表適合你的貓。</p>' : '';
      var fh = F.filter(function (f) { return 全中(f.n + ' ' + f.k, q); }).slice(0, 8);
      /* 成分：比對前五項成分與申報原料（品名沒中的才列，避免重複） */
      var ih = F.filter(function (f) { return fh.indexOf(f) < 0 && (全中(f.i5, q) || 全中(f.im, q)); }).slice(0, 8);
      var bh = B.filter(function (b) { return 全中([b.n, b.en].concat(b.a).join(' '), q); }).slice(0, 6);
      hsug.innerHTML = 況區 +
        (fh.length ? '<p class="muted" style="margin:8px 0 4px">貓飯：</p><ul class="lrows">' + fh.map(function (f) { return '<li class="lrow"><a href="' + esc(f.u) + '">' + hl(f.n, q) + '</a><span class="muted">' + esc(f.b) + '</span></li>'; }).join('') + '</ul>' : '') +
        (ih.length ? '<p class="muted" style="margin:8px 0 4px">成分有寫「' + esc(q) + '」：</p><ul class="lrows">' + ih.map(function (f) { return '<li class="lrow"><a href="' + esc(f.u) + '">' + esc(f.n) + '</a><span class="muted">' + esc(f.b) + '・' + (全中(f.i5, q) ? '前五項成分' : '申報原料') + '</span></li>'; }).join('') + '</ul>' : '') +
        (bh.length ? '<p class="muted" style="margin:8px 0 4px">品牌：</p><div class="pills">' + bh.map(function (b) { return '<a class="pill-link" href="' + esc(b.u) + '">' + esc(b.n) + '</a>'; }).join('') + '</div>' : '') +
        (!fh.length && !bh.length && !ih.length && !中況.length ? '<p class="muted">營養建檔裡沒有符合的款。按 Enter 查台灣全部申報資料。</p>' : '');
    });
    /* 點旁邊或按 Esc 收起建議清單 */
    document.addEventListener('click', function (ev) { if (!ev.target.closest('.top')) hsug.innerHTML = ''; });
    hq.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { hsug.innerHTML = ''; hq.blur(); } });
  }

  /* 首頁「我知道貓的狀況」：卡片都已在頁面上，這裡只篩選、排序 */
  var cf2 = $('#cf2'), foods = $('#foods');
  if (cf2 && foods) {
    var fcards = Array.prototype.slice.call(foods.querySelectorAll('.food'));
    var 篩 = function () {
      var a = (cf2.querySelector('input[name=a]:checked') || {}).value || '';
      var cs = Array.prototype.slice.call(cf2.querySelectorAll('input[name=c]:checked')).map(function (x) { return x.value; });
      var s = cf2.elements.s.value, n = 0, 無齡 = 0;
      fcards.forEach(function (el) {
        var ages = el.dataset.age ? el.dataset.age.split(' ') : [], cc = el.dataset.c ? el.dataset.c.split(' ') : [];
        var okA = !a || ages.indexOf(a) >= 0;
        if (a && !ages.length) 無齡++;
        var ok = okA && cs.every(function (c) { return cc.indexOf(c) >= 0; });
        el.hidden = !ok; if (ok) n++;
      });
      var 鍵 = { p: ['p', 1], f: ['f', 1], cb: ['cb', 1], pr: ['pr', -1] }[s];
      var 排 = fcards.slice().sort(function (x, y) {
        if (!鍵) return 0;
        var vx = x.dataset[鍵[0]], vy = y.dataset[鍵[0]];
        if (vx === '' && vy === '') return 0; if (vx === '') return 1; if (vy === '') return -1;  /* 待補、未公開排最後（US-3） */
        return (parseFloat(vx) - parseFloat(vy)) * 鍵[1];
      });
      if (鍵) 排.forEach(function (el) { foods.appendChild(el); });
      $('#fc2').textContent = '符合 ' + n + ' 款（共 ' + fcards.length + ' 款）' + (無齡 ? '；另有 ' + 無齡 + ' 款官方品名沒寫適用年齡，沒有列入' : '');
      $('#fe2').hidden = n > 0;
    };
    cf2.addEventListener('change', 篩);
    /* 從搜尋框帶過來的條件（?a=幼貓&c=低磷） */
    var 帶 = new URLSearchParams(location.search);
    if (帶.get('a') || 帶.getAll('c').length) {
      cf2.querySelectorAll('input').forEach(function (i) {
        if (i.name === 'a') i.checked = i.value === (帶.get('a') || '');
        if (i.name === 'c') i.checked = 帶.getAll('c').indexOf(i.value) >= 0;
      });
      篩();
    }
  }

  /* 查一包（台灣申報資料，按需載入） */
  var lf = $('#lf');
  if (lf) {
    var 載入中 = {};
    var 載 = function (src, cb) {
      if (載入中[src] === true) return cb();
      if (載入中[src]) return 載入中[src].push(cb);
      載入中[src] = [cb];
      var s = document.createElement('script'); s.src = src;
      s.onload = function () { var l = 載入中[src]; 載入中[src] = true; l.forEach(function (f) { f(); }); };
      s.onerror = function () { var l = 載入中[src]; 載入中[src] = null; l.forEach(function (f) { f(new Error('載入失敗')); }); };
      document.body.appendChild(s);
    };
    var 片號 = function (id) { var n = 0; for (var i = 0; i < id.length; i++) n += id.charCodeAt(i); return n % 64; }; // 與建置.py 相同
    var lq = $('#lq'); lq.value = new URLSearchParams(location.search).get('q') || '';
    $('#lcount').textContent = '資料載入中…';
    載('/data/registry.js', function (err) {
      if (err || !window.PAW_REG) { $('#lcount').textContent = '申報資料載入失敗，請重新整理頁面。'; return; }
      var R = window.PAW_REG, 不合格廠商 = {}, 顯示數 = 30;
      E.forEach(function (e) { if (e.國 === 'TW') 不合格廠商[e.廠商] = (不合格廠商[e.廠商] || 0) + 1; });
      var 明細 = function (id, btn) {
        var row = document.getElementById('d-' + id), cell = row.firstChild;
        if (!row.hidden) { row.hidden = true; btn.textContent = '看申報內容'; return; }
        row.hidden = false; btn.textContent = '收起'; cell.innerHTML = '<span class="muted">載入中…</span>';
        var n = 片號(id), nn = (n < 10 ? '0' : '') + n;
        載('/data/reg/' + nn + '.js', function (err2) {
          var d = !err2 && window['PAW_REG_PART_' + nn] && window['PAW_REG_PART_' + nn][id];
          if (!d) { cell.textContent = '明細載入失敗。'; return; }
          cell.innerHTML = '<dl class="kv"><dt>適用寵物</dt><dd>' + esc(d[2]) + '</dd><dt>主要原料及添加物</dt><dd>' + esc(d[0]) + '</dd></dl>' +
            '<div class="orig" style="white-space:pre-wrap"><span class="muted">主要營養成分及含量（申報原文）：</span>\n' + esc(d[1]) + '</div>' +
            '<div class="src"><a href="https://data.gov.tw/dataset/93696" rel="noopener">來源：農業部開放資料「寵物食品資料」↗</a><a href="/guide/calculator/">把數字換算成乾物比 →</a></div>';
        });
      };
      var 搜 = function () {
        var q = lq.value.trim().toLowerCase();
        history.replaceState(null, '', location.pathname + (q ? '?q=' + encodeURIComponent(q) : ''));
        if (!q) { $('#lcount').textContent = '請輸入關鍵字。'; $('#llist').innerHTML = ''; return; }
        var r = R.列.filter(function (x) { return 全中(x[1] + ' ' + x[5], q); });
        $('#lcount').textContent = '符合 ' + fmt(r.length) + ' 筆' + (r.length > 顯示數 ? '，先顯示前 ' + 顯示數 + ' 筆，請加關鍵字縮小範圍' : '');
        $('#llist').innerHTML = r.length ? '<div class="tbl-wrap"><table class="rtable"><thead><tr><th>品名</th><th>品項</th><th>來源</th><th>原產地</th><th>廠商</th><th></th></tr></thead><tbody>' +
          r.slice(0, 顯示數).map(function (x) {
            var 廠 = x[5].replace(/^【[^】]*】/, ''), bad = 不合格廠商[廠];
            return '<tr><td class="main">' + hl(x[1], q) + '<div class="muted" style="font-weight:400">' + esc(x[6]) + '・' + esc(x[0]) + '</div></td><td data-label="品項">' + esc(R.品項[x[2]]) + '</td><td data-label="來源">' + esc(R.來源[x[3]]) + '</td><td data-label="原產地">' + esc(x[4]) + '</td><td data-label="廠商">' + hl(x[5], q) +
              (bad ? '<div><a href="/recalls/tw/?q=' + encodeURIComponent(廠) + '" class="chip" style="margin-top:4px">同廠商快報 ' + bad + ' 筆</a></div>' : '') +
              '</td><td class="act"><button type="button" class="btn small ghost" data-id="' + esc(x[0]) + '">看申報內容</button></td></tr><tr hidden class="detail" id="d-' + esc(x[0]) + '"><td colspan="6"></td></tr>';
          }).join('') + '</tbody></table></div><p class="muted">「同廠商快報」只比對廠商名稱完全相同，不代表這一款產品出過事，請點進去看品名與批號。</p>'
          : '<div class="empty">申報資料裡找不到「' + esc(q) + '」。<br><span class="muted">找不到可能是名稱寫法不同，也可能是沒有申報。請試試品牌的中文或英文名。</span></div>';
        main.querySelectorAll('[data-id]').forEach(function (b) { b.addEventListener('click', function () { 明細(b.dataset.id, b); }); });
      };
      lf.addEventListener('submit', function (ev) { ev.preventDefault(); 搜(); });
      if (lq.value) 搜(); else $('#lcount').textContent = '可以開始查詢。';
    });
  }

  /* 可排序表格（營養比較）：點表頭切換升降；待補、未公開一律排最後（US-3） */
  document.querySelectorAll('table.sortable').forEach(function (tb) {
    var ths = tb.querySelectorAll('th[data-sort]');
    ths.forEach(function (th) {
      var 欄 = Array.prototype.indexOf.call(th.parentNode.children, th);
      var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'sortbtn'; btn.textContent = th.textContent;
      th.textContent = ''; th.appendChild(btn); th.setAttribute('aria-sort', 'none');
      btn.addEventListener('click', function () {
        var 升 = th.getAttribute('aria-sort') !== 'ascending';
        ths.forEach(function (t) { t.setAttribute('aria-sort', 'none'); });
        th.setAttribute('aria-sort', 升 ? 'ascending' : 'descending');
        var body = tb.tBodies[0], rows = Array.prototype.slice.call(body.rows);
        var v = function (r) { var x = parseFloat((r.cells[欄].textContent || '').replace('%', '')); return isNaN(x) ? null : x; };
        rows.sort(function (a, b) { var x = v(a), y = v(b); if (x === null && y === null) return 0; if (x === null) return 1; if (y === null) return -1; return 升 ? x - y : y - x; });
        rows.forEach(function (r) { body.appendChild(r); });
      });
    });
  });

  /* 乾物比換算器 */
  var cf = $('#cf');
  if (cf) {
    var 範例 = { w: 8, p: 36, f: 18, fi: 2.5, a: 7.5, ph: 1.1, ca: 1.3 }; // 示範用的虛構數字，非任何產品
    var v = function (k) { var x = parseFloat($('#c-' + k).value); return isNaN(x) ? null : x; };
    var 算 = function () {
      var w = v('w'), out = $('#cr');
      if (w == null || w >= 100) { out.innerHTML = '<p class="muted" style="margin:0">請先填水分（小於 100）。</p>'; return; }
      var dm = function (x) { return x == null ? null : x / (100 - w) * 100; };
      var rows = [], p = v('p'), f = v('f'), fi = v('fi'), a = v('a'), ph = v('ph'), ca = v('ca');
      var row = function (name, val, cmp) { if (val == null) return; rows.push('<div class="res-row"><span>' + name + (cmp ? '<div class="cmp">' + cmp + '</div>' : '') + '</span><b>' + val.toFixed(1) + '%</b></div>'); };
      var 對照 = function (val, 低, 高) { if (val == null) return ''; return 'FEDIAF 成貓最低建議值 ' + (低 === 高 ? 低 + '%' : 低 + '%／' + 高 + '%') + '：' + (val >= 高 ? (低 === 高 ? '達到' : '兩欄都達到') : val >= 低 ? '達到 ' + 低 + '%，未達 ' + 高 + '%' : (低 === 高 ? '未達' : '低於兩欄')); };
      row('蛋白質（乾物）', dm(p), 對照(dm(p), 25, 33.3));
      row('脂肪（乾物）', dm(f), 對照(dm(f), 9, 9));
      row('纖維（乾物）', dm(fi)); row('灰分（乾物）', dm(a));
      if ([p, f, fi, a].every(function (x) { return x != null; })) {
        var nfe = 100 - w - p - f - fi - a;
        rows.push(nfe < 0 ? '<div class="res-row"><span>碳水（NFE 估算）</span><b>數字加總超過 100，請檢查</b></div>'
          : '<div class="res-row"><span>碳水（NFE 估算，乾物）<div class="cmp">估計值；包裝通常沒有標示</div></span><b>' + dm(nfe).toFixed(1) + '%</b></div>');
      }
      row('磷（乾物）', dm(ph), 對照(dm(ph), 0.26, 0.35));
      row('鈣（乾物）', dm(ca), 對照(dm(ca), 0.4, 0.53));
      if (ph && ca) rows.push('<div class="res-row"><span>鈣磷比<div class="cmp">FEDIAF：最低 1/1，成貓營養上限 2/1</div></span><b>' + (ca / ph).toFixed(2) + ' : 1</b></div>');
      out.innerHTML = rows.length ? '<h3>換算結果</h3>' + rows.join('') + '<p class="muted">對照只是把數字放在一起，不代表適不適合你的貓。</p>' : '<p class="muted" style="margin:0">再填一項營養素。</p>';
    };
    $('#c-ex').addEventListener('click', function () { Object.keys(範例).forEach(function (k) { $('#c-' + k).value = 範例[k]; }); 算(); });
    cf.querySelectorAll('input').forEach(function (i) { i.addEventListener('input', 算); });
  }
})();

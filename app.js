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
      var 況 = [[/腎|低磷|磷/, 's', 'p', '依磷由低到高排'], [/胖|肥|減重|體重|低脂/, 's', 'f', '依脂肪由低到高排'],  /* 元首 15:42 定：不標低磷、低脂，改帶到排序 */
        [/泌尿|尿/, 'c', '泌尿', '品名寫泌尿'], [/毛球|化毛|吐毛/, 'c', '毛球', '品名寫化毛或毛球'],
        [/腸胃|軟便|拉肚子|消化|敏感|過敏|低敏/, 'c', '敏感', '品名寫腸胃、敏感或低敏'],
        [/幼貓|小貓|kitten/i, 'a', '幼貓', '幼貓'], [/老貓|熟齡|高齡|老年|senior/i, 'a', '熟齡貓', '熟齡貓'], [/成貓|adult/i, 'a', '成貓', '成貓']];
      var 中況 = 況.filter(function (r) { return r[0].test(q); });
      var 參 = new URLSearchParams();
      中況.forEach(function (r) { if (r[1] === 'a') 參.set('a', r[2]); else if (r[1] === 's') 參.set('s', r[2]); else 參.append('c', r[2]); });
      var 況區 = 中況.length ? '<p class="muted" style="margin:8px 0 4px">依狀況找：</p><p style="margin:0"><a class="btn small ghost" href="/?' + 參 + '">' + 中況.map(function (r) { return esc(r[3]); }).join('・') + ' 的貓飯 ›</a></p><p class="muted" style="margin:4px 0 0">只依數字或品名篩選，不代表適合你的貓。</p>' : '';
      var fh = F.filter(function (f) { return 全中(f.n + ' ' + f.k, q); }).slice(0, 8);
      /* 成分：比對前五項成分與申報原料（品名沒中的才列，避免重複） */
      var ih = F.filter(function (f) { return fh.indexOf(f) < 0 && (全中(f.i5, q) || 全中(f.im, q)); }).slice(0, 8);
      var bh = B.filter(function (b) { return 全中([b.n, b.en].concat(b.a).join(' '), q); }).slice(0, 6);
      hsug.innerHTML = 況區 +
        (fh.length ? '<p class="muted" style="margin:8px 0 4px">貓飯：</p><ul class="lrows">' + fh.map(function (f) { return '<li class="lrow"><a href="' + esc(f.u) + '"><span>' + hl(f.n, q) + '</span></a><span class="muted">' + esc(f.b) + '</span></li>'; }).join('') + '</ul>' : '') +
        (ih.length ? '<p class="muted" style="margin:8px 0 4px">成分有寫「' + esc(q) + '」：</p><ul class="lrows">' + ih.map(function (f) { return '<li class="lrow"><a href="' + esc(f.u) + '">' + esc(f.n) + '</a><span class="muted">' + esc(f.b) + '・' + (全中(f.i5, q) ? '前五項成分' : '申報原料') + '</span></li>'; }).join('') + '</ul>' : '') +
        (bh.length ? '<p class="muted" style="margin:8px 0 4px">品牌：</p><div class="pills">' + bh.map(function (b) { return '<a class="pill-link" href="' + esc(b.u) + '">' + esc(b.n) + '</a>'; }).join('') + '</div>' : '') +
        (!fh.length && !bh.length && !ih.length && !中況.length ? '<p class="muted">54 款裡沒有符合的。按 Enter，到全台 63,020 筆申報紀錄裡找。</p>' : '');
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
      $('#fc2').textContent = '共 ' + n + ' 款' + (無齡 ? '。另有 ' + 無齡 + ' 款品名沒寫年齡，沒有列入。' : '');
      $('#fe2').hidden = n > 0;
      /* 只勾一個有固定清單的條件時，給狀況頁網址（SEO 關鍵字計畫 v1） */
      var 固 = { '泌尿': ['/conditions/urinary/', '品名寫泌尿的貓乾糧清單'] }[cs.length === 1 && !a ? cs[0] : ''];
      var fl = $('#fl2'); if (fl) { fl.hidden = !固; fl.innerHTML = 固 ? '這份清單的固定網址：<a href="' + 固[0] + '">' + 固[1] + '</a>' : ''; }
    };
    cf2.addEventListener('change', 篩);
    /* 從搜尋框帶過來的條件（?a=幼貓&c=泌尿&s=p） */
    var 帶 = new URLSearchParams(location.search);
    if (帶.get('s') && cf2.elements.s.querySelector('option[value="' + 帶.get('s') + '"]')) cf2.elements.s.value = 帶.get('s');
    if (帶.get('a') || 帶.getAll('c').length || 帶.get('s')) {
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
    var 版號 = window.PAW_REG_V ? '?v=' + window.PAW_REG_V : '';
    載('/data/registry.js' + 版號, function (err) {
      if (err || !window.PAW_REG) { $('#lcount').textContent = '申報資料載入失敗，請重新整理頁面。'; return; }
      var R = window.PAW_REG, 不合格廠商 = {}, 顯示數 = 30;
      E.forEach(function (e) { if (e.國 === 'TW') 不合格廠商[e.廠商] = (不合格廠商[e.廠商] || 0) + 1; });
      var 明細 = function (id, btn) {
        var row = document.getElementById('d-' + id), cell = row.firstChild;
        if (!row.hidden) { row.hidden = true; btn.textContent = '看申報內容'; return; }
        row.hidden = false; btn.textContent = '收起'; cell.innerHTML = '<span class="muted">載入中…</span>';
        var n = 片號(id), nn = (n < 10 ? '0' : '') + n;
        載('/data/reg/' + nn + '.js' + 版號, function (err2) {
          var d = !err2 && window['PAW_REG_PART_' + nn] && window['PAW_REG_PART_' + nn][id];
          if (!d) { cell.textContent = '明細載入失敗。'; return; }
          cell.innerHTML = '<dl class="kv"><dt>適用寵物</dt><dd>' + esc(d[2]) + '</dd><dt>主要原料及添加物</dt><dd>' + esc(d[0]) + '</dd></dl>' +
            '<div class="orig" style="white-space:pre-wrap"><span class="muted">主要營養成分及含量（申報原文）：</span>\n' + esc(d[1]) + '</div>' +
            '<div class="src"><a href="https://data.gov.tw/dataset/93696" rel="noopener">來源：農業部開放資料「寵物食品資料」↗</a><a href="/guide/calculator/">把數字換算成乾物比 →</a></div>';
        });
      };
      /* 品牌同義詞：打英文名也找得到中文品名（外部檢查 #12，例：LitoMon → 怪獸部落） */
      var 同義 = function (w) {
        var alts = [w];
        (window.PAW_BRANDS || []).forEach(function (b) {
          var ks = [b.n, b.en].concat(b.a).filter(Boolean).map(function (k) { return String(k).toLowerCase(); });
          if (ks.some(function (k) { return k.indexOf(w) >= 0 || w.indexOf(k) >= 0; })) alts = alts.concat(ks);
        });
        return alts;
      };
      /* 品項篩選（外部檢查 #13） */
      var lt = $('#lt');
      if (lt && lt.options.length < 2) R.品項.forEach(function (n, i) { if (!n) return; var o = document.createElement('option'); o.value = i; o.textContent = n; lt.appendChild(o); });
      var 搜 = function (更多) {
        var q = lq.value.trim().toLowerCase();
        if (!更多) 顯示數 = 30;
        history.replaceState(null, '', location.pathname + (q ? '?q=' + encodeURIComponent(q) : ''));
        if (!q) { $('#lcount').textContent = '請輸入關鍵字。'; $('#llist').innerHTML = ''; return; }
        var 詞們 = 詞(q).map(同義), 品項 = lt ? lt.value : '';
        var r = R.列.filter(function (x) {
          var t = (x[1] + ' ' + x[5]).toLowerCase();
          return (品項 === '' || String(x[2]) === 品項) && 詞們.every(function (alts) { return alts.some(function (a) { return t.indexOf(a) >= 0; }); });
        });
        $('#lcount').textContent = '找到 ' + fmt(r.length) + ' 筆' + (r.length > 顯示數 ? '，先列前 ' + fmt(顯示數) + ' 筆。多加一個關鍵字（例如品牌名）可以縮小範圍。' : '');
        $('#llist').innerHTML = r.length ? '<div class="tbl-wrap"><table class="rtable"><thead><tr><th>品名</th><th>品項</th><th>國內製造／進口</th><th>原產地</th><th>申報廠商</th><th></th></tr></thead><tbody>' +
          r.slice(0, 顯示數).map(function (x) {
            var 廠 = x[5].replace(/^【[^】]*】/, ''), bad = 不合格廠商[廠];
            return '<tr><td class="main">' + hl(x[1], q) + '<div class="muted" style="font-weight:400">' + esc(x[6]) + '・' + esc(x[0]) + '</div></td><td data-label="品項">' + esc(R.品項[x[2]]) + '</td><td data-label="國內製造／進口">' + esc(R.來源[x[3]]) + '</td><td data-label="原產地">' + esc(x[4]) + '</td><td data-label="申報廠商">' + hl(x[5], q) +
              (bad ? '<div><a href="/recalls/tw/?q=' + encodeURIComponent(廠) + '" class="chip" style="margin-top:4px">這家廠商有 ' + bad + ' 筆不合格紀錄</a></div>' : '') +
              '</td><td class="act"><button type="button" class="btn small ghost" data-id="' + esc(x[0]) + '">看申報內容</button></td></tr><tr hidden class="detail" id="d-' + esc(x[0]) + '"><td colspan="6"></td></tr>';
          }).join('') + '</tbody></table></div><p class="muted">「不合格紀錄」只比對廠商名稱完全相同，不代表這一款產品出過事，請點進去看品名與批號。</p>'
          : '<div class="empty">找不到「' + esc(q) + '」。<br><span class="muted">可能申報時用了別的名字，試試品牌中文名、英文名或公司名，或把品項改回「全部」。</span></div>';
        if (r.length > 顯示數) $('#llist').insertAdjacentHTML('beforeend', '<p class="more"><button type="button" class="btn ghost" id="lmore">再顯示 30 筆</button></p>');
        main.querySelectorAll('[data-id]').forEach(function (b) { b.addEventListener('click', function () { 明細(b.dataset.id, b); }); });
        var m = $('#lmore'); if (m) m.addEventListener('click', function () { 顯示數 += 30; 搜(true); });
      };
      lf.addEventListener('submit', function (ev) { ev.preventDefault(); 搜(); });
      if (lt) lt.addEventListener('change', function () { 搜(); });
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
      if (w == null) { out.innerHTML = '<p class="muted" style="margin:0">填水分和至少一項營養素，就會算出乾物比。</p>'; return; }
      if (w >= 100) { out.innerHTML = '<p class="muted" style="margin:0">水分要小於 100%，請再確認一次。</p>'; return; }
      var dm = function (x) { return x == null ? null : x / (100 - w) * 100; };
      var rows = [], p = v('p'), f = v('f'), fi = v('fi'), a = v('a'), ph = v('ph'), ca = v('ca');
      var row = function (name, val, cmp) { if (val == null) return; rows.push('<div class="res-row"><span>' + name + (cmp ? '<div class="cmp">' + cmp + '</div>' : '') + '</span><b>' + val.toFixed(1) + '%</b></div>'); };
      var 對照 = function (val, 低, 高) { if (val == null) return ''; var 標 = 低 === 高 ? 低 + '%' : 低 + '%／' + 高 + '%'; return val >= 高 ? '高於 FEDIAF 成貓最低建議（' + 標 + '）' : val >= 低 ? '高於 ' + 低 + '%，低於 ' + 高 + '%（熱量需求低的貓建議 ' + 高 + '%）' : '低於 FEDIAF 成貓最低建議（' + 標 + '）'; };
      row('蛋白質（乾物比）', dm(p), 對照(dm(p), 25, 33.3));
      row('脂肪（乾物比）', dm(f), 對照(dm(f), 9, 9));
      row('纖維（乾物比）', dm(fi)); row('灰分（乾物比）', dm(a));
      if ([p, f, fi, a].every(function (x) { return x != null; })) {
        var nfe = 100 - w - p - f - fi - a;
        rows.push(nfe < 0 ? '<div class="res-row"><span>碳水（NFE 估算）</span><b>幾個數字加起來超過 100%，請再確認一次。</b></div>'
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

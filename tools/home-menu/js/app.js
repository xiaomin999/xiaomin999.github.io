/* ============================================================
 * 家常点餐 · 主程序
 * 依赖：rules.js + dish-0x-*.js（已将菜品推入 window.DISH_PACKS）
 * ============================================================ */
(function () {
  'use strict';

  /* ---------- 数据装配 ---------- */
  var ALL = [].concat.apply([], window.DISH_PACKS || []);
  var BY_ID = {};
  ALL.forEach(function (d) { BY_ID[d.id] = d; });

  var CAT_ORDER = ['全部', '荤菜', '水产', '素菜', '凉菜', '汤羹', '主食'];
  function cats() {
    var set = {};
    ALL.forEach(function (d) { set[d.cat] = 1; });
    var arr = CAT_ORDER.filter(function (c) { return c === '全部' || set[c]; });
    return arr;
  }

  function searchText(d) {
    var f = (d.f || []).map(function (k) { return (window.FLAGS[k] || {}).name || k; }).join(' ');
    return [d.name, (d.alias || []).join(' '), d.cuisine, d.flavor, (d.tags || []).join(' '), d.sub, d.cat, f].join(' ').toLowerCase();
  }

  /* ---------- 状态 ---------- */
  var state = { cat: '全部', q: '', cart: loadCart() };

  function loadCart() {
    try { var v = JSON.parse(localStorage.getItem('homemenu_cart_v1')); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }
  function saveCart() { try { localStorage.setItem('homemenu_cart_v1', JSON.stringify(state.cart)); } catch (e) {} }
  function inCart(id) { return state.cart.indexOf(id) >= 0; }

  /* ---------- 工具 ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function flagChips(d) {
    return (d.f || []).map(function (k) {
      var f = window.FLAGS[k]; if (!f) return '';
      return '<span class="flag">' + f.ico + ' ' + f.name + '</span>';
    }).join('');
  }
  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.hidden = true; }, 1400);
  }

  /* ---------- GI（升糖指数，混合餐估算值，非实验室实测） ---------- */
  function dishGi(d) {
    if (d.cat === '主食') {
      var n = d.name + (d.alias || []).join('');
      if (/杂粮/.test(n)) return 50;
      if (/馒头/.test(n)) return 85;
      if (/包子|肉包/.test(n)) return 65;
      if (/饺子|水饺/.test(n)) return 55;
      if (/皮蛋/.test(n)) return 68;
      if (/小米粥/.test(n)) return 70;
      if (/粥/.test(n)) return 73;
      if (/炒饭/.test(n)) return 70;
      if (/葱油饼/.test(n)) return 70;
      if (/拌面|阳春|面/.test(n)) return 60;
      return 83;
    }
    var g = 35;
    if ((d.f || []).indexOf('sug') >= 0) g += 20;
    if ((d.f || []).indexOf('sta') >= 0) g += 18;
    if (d.carb >= 40) g += 16; else if (d.carb >= 25) g += 10; else if (d.carb >= 15) g += 5;
    if (d.fat >= 25) g -= 5;
    if (d.pro >= 20) g -= 3;
    return Math.max(20, Math.min(95, g));
  }
  function giLabel(g) {
    if (g <= 55) return { t: '低GI', c: 'ok' };
    if (g <= 69) return { t: '中GI', c: 'warn' };
    return { t: '高GI', c: 'bad' };
  }
  function giNote(g) {
    if (g <= 55) return '升糖慢，血糖较平稳';
    if (g <= 69) return '升糖速度中等，适量即可';
    return '升糖快，建议搭配蔬菜 / 蛋白一起吃、控制分量';
  }

  /* ---------- 菜品图标（emoji 头像，可换真实照片） ---------- */
  var EMOJI_KW = [
    ['红烧肉|扣肉|排骨|猪蹄|肘', '🍖'], ['里脊|糖醋|锅包', '🍖'], ['回锅|小炒肉|肉丝|肉末|肉片', '🥩'],
    ['鱼|虾|蟹|海鲜|鱿鱼|带鱼|黄鱼|鲈鱼|龙利', '🦐'], ['贝|蛤|蚝', '🦪'],
    ['鸡|口水|辣子|三杯|白切|盐焗', '🍗'], ['鸭', '🦆'], ['蛋', '🥚'],
    ['牛', '🐄'], ['羊', '🐑'], ['豆腐|豆|腐竹|千张|豆皮|豆浆', '🫘'],
    ['番茄|西红柿', '🍅'], ['土豆|马铃薯|地三鲜', '🥔'], ['茄子', '🍆'], ['黄瓜', '🥒'],
    ['玉米', '🌽'], ['西兰花|菜花|花菜', '🥦'], ['冬瓜|丝瓜|苦瓜', '🥒'], ['萝卜', '🥕'],
    ['粥', '🥣'], ['米饭|炒饭', '🍚'], ['面', '🍜'], ['饺子|包子|馒头|饼|馍', '🥟'],
    ['汤', '🍲'], ['凉|拌|皮蛋|拍', '🥗'], ['南瓜', '🎃'], ['海带|紫菜|木耳', '🥬']
  ];
  var EMOJI_CAT = { '荤菜': '🍖', '水产': '🐟', '素菜': '🥬', '凉菜': '🥗', '汤羹': '🍲', '主食': '🍚' };
  function dishEmoji(d) {
    var s = d.name + (d.alias || []).join('') + (d.sub || '');
    for (var i = 0; i < EMOJI_KW.length; i++) {
      if (new RegExp(EMOJI_KW[i][0]).test(s)) return EMOJI_KW[i][1];
    }
    return EMOJI_CAT[d.cat] || '🍽️';
  }
  function dishThumb(d) {
    var photo = window.DISH_PHOTO && window.DISH_PHOTO[d.id];
    if (photo) return '<img class="thumb-img" src="' + esc(photo) + '" alt="' + esc(d.name) + '">';
    return '<span class="thumb-emoji">' + dishEmoji(d) + '</span>';
  }

  /* ---------- 渲染：分类 ---------- */
  function renderCats() {
    var box = $('#cats'); box.innerHTML = '';
    cats().forEach(function (c) {
      var b = document.createElement('button');
      b.className = 'cat' + (c === state.cat ? ' active' : '');
      b.textContent = c;
      b.onclick = function () { state.cat = c; renderCats(); renderList(); };
      box.appendChild(b);
    });
  }

  /* ---------- 渲染：列表 ---------- */
  function renderList() {
    var list = $('#list'); list.innerHTML = '';
    var q = state.q.trim().toLowerCase();
    var rows = ALL.filter(function (d) {
      if (state.cat !== '全部' && d.cat !== state.cat) return false;
      if (q && searchText(d).indexOf(q) < 0) return false;
      return true;
    });
    if (!rows.length) {
      list.innerHTML = '<div class="empty">没有匹配的菜，换个关键词试试～</div>';
      return;
    }
    rows.forEach(function (d) {
      var card = document.createElement('div');
      card.className = 'dish';
      var g = dishGi(d), gl = giLabel(g);
      card.innerHTML =
        '<div class="card-head"><div class="thumb">' + dishThumb(d) + '</div>' +
          '<div class="card-head-txt"><div class="name">' + esc(d.name) + '</div>' +
          '<div class="cat-tag">' + esc(d.cat) + ' · ' + esc(d.cuisine || '') + '</div></div></div>' +
        '<div class="flavor">' + esc(d.flavor || '') + '</div>' +
        '<div class="meta">' +
          '<span class="chip k">🔥 ' + d.kcal + ' kcal</span>' +
          '<span class="chip gi gi-' + gl.c + '">' + gl.t + ' ' + g + '</span>' +
          '<span class="chip t">⏱ ' + d.time + '分</span>' +
          (d.tags || []).slice(0, 1).map(function (t) { return '<span class="chip t">' + esc(t) + '</span>'; }).join('') +
        '</div>' +
        '<div class="flags">' + flagChips(d) + '</div>';
      card.onclick = function () { openDetail(d.id); };
      list.appendChild(card);
    });
  }

  /* ---------- 渲染：详情 ---------- */
  function openDetail(id) {
    var d = BY_ID[id]; if (!d) return;
    var body = $('#detail-body');
    var conflicts = window.conflictsOf(d, ALL);
    var confHtml = conflicts.length
      ? conflicts.map(function (c) {
          return '<div class="conflict" data-open="' + c.dish.id + '">' +
            '<div class="ci">⚠️</div>' +
            '<div class="ct"><b>' + esc(c.dish.name) + '</b> · ' + esc(c.rule.title) +
            '<span class="why">' + esc(c.rule.why) + '</span></div></div>';
        }).join('')
      : '<div class="advice" style="background:#f3f8f3;border-left-color:var(--ok)">✅ 暂时没发现与它明显「不宜同餐」的家常菜，放心配。</div>';

    var goodHtml = (d.good || []).map(function (g) {
      return '<button class="gc" data-good="' + esc(g) + '">' + esc(g) + '</button>';
    }).join('');

    var added = inCart(id);
    body.innerHTML =
      '<div class="cart-top">' +
        '<div class="title-row"><button class="back" data-close="detail">×</button><div class="title">菜谱详情</div></div>' +
        '<div class="cart-actions"><button class="btn ' + (added ? 'ghost added' : 'primary') + '" id="add-cart-btn">' +
          (added ? '✓ 已在点餐中（点此移出）' : '加入「我的点餐」') + '</button></div>' +
      '</div>' +
      '<div class="sheet-body">' +
        '<div class="detail-hero">' +
          '<div class="hero-emoji">' + dishEmoji(d) + '</div>' +
          '<h2>' + esc(d.name) + '</h2>' +
          '<div class="alias">' + esc((d.alias || []).join(' · ')) + '</div>' +
          '<div class="flavor">' + esc(d.flavor || '') + ' · ' + esc(d.cuisine || '') + '</div>' +
          '<div class="quick">' +
            '<div class="q">⏱ 约' + d.time + '分钟<b></b></div>' +
            '<div class="q">🔥 ' + d.kcal + ' kcal<b></b></div>' +
            '<div class="q">👥 ' + d.serve + '人份<b></b></div>' +
            '<div class="q">📊 难度 ' + d.level + '/3<b></b></div>' +
          '</div>' +
        '</div>' +

        '<div class="section"><h3><span class="bar"></span>营养（每份约）</h3>' +
          '<div class="nutri">' +
            '<div><b>' + d.kcal + '</b><span>千卡</span></div>' +
            '<div><b>' + d.pro + 'g</b><span>蛋白质</span></div>' +
            '<div><b>' + d.fat + 'g</b><span>脂肪</span></div>' +
            '<div><b>' + d.carb + 'g</b><span>碳水</span></div>' +
            '<div><b>' + d.sod + 'mg</b><span>钠</span></div>' +
          '</div>' +
          (function () { var gg = dishGi(d), lg = giLabel(gg);
            return '<div class="gi-line">升糖指数 GI（混合餐估算）：<b>' + gg + '</b> ' +
              '<span class="chip gi gi-' + lg.c + '">' + lg.t + '</span>' +
              '<span class="gi-note">' + giNote(gg) + '</span></div>'; })() +
          '<div class="flags" style="margin-top:10px">' + flagChips(d) + '</div>' +
        '</div>' +

        '<div class="section"><h3><span class="bar"></span>食材</h3>' +
          '<div class="ings">' +
            '<div class="ing-group"><div class="h">主料</div><ul>' + (d.main || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' +
            '<div class="ing-group"><div class="h">辅料</div><ul>' + (d.aux || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' +
            '<div class="ing-group"><div class="h">调料</div><ul>' + (d.seas || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' +
          '</div>' +
        '</div>' +

        '<div class="section"><h3><span class="bar"></span>做法（' + (d.steps || []).length + '步）</h3>' +
          '<ol class="steps">' + (d.steps || []).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
        '</div>' +

        '<div class="section"><h3><span class="bar"></span>小贴士</h3>' +
          '<ul class="tips">' + (d.tips || []).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
        '</div>' +

        '<div class="section"><h3><span class="bar"></span>食用建议</h3>' +
          '<div class="advice">' + esc(d.advice || '') + '</div>' +
          '<div class="advice people" style="margin-top:8px"><b>特别人群：</b>' + esc(d.people || '') + '</div>' +
        '</div>' +

        '<div class="section"><h3><span class="bar"></span>不宜同餐 ⚠️</h3>' +
          '<p style="font-size:12px;color:var(--ink2);margin:0 0 6px">以下菜品与本菜同食时，可能触发搭配提示（点开可看那道菜）：</p>' +
          confHtml +
        '</div>' +

        '<div class="section"><h3><span class="bar"></span>推荐搭配</h3>' +
          '<div class="good-chips">' + goodHtml + '</div>' +
        '</div>' +

        '<div class="disclaimer">搭配提示基于营养学常识，仅供参考，非医学诊断。有慢性病、孕期、服药者请遵医嘱；服药期间特别注意西柚等「药物相克」。</div>' +
      '</div>';

    $('#add-cart-btn').onclick = function () { toggleCart(id); };
    Array.prototype.forEach.call(body.querySelectorAll('[data-open]'), function (el) {
      el.onclick = function () { openDetail(el.getAttribute('data-open')); };
    });
    Array.prototype.forEach.call(body.querySelectorAll('[data-good]'), function (el) {
      el.onclick = function () {
        var g = el.getAttribute('data-good');
        closeOverlay('detail');
        state.cat = '全部'; state.q = g; $('#search').value = g; $('#clear-search').hidden = false;
        renderCats(); renderList();
        toast('已为你筛选：' + g);
      };
    });
    openOverlay('detail');
  }

  /* ---------- 购物车 ---------- */
  function toggleCart(id) {
    var wasIn = inCart(id);
    if (wasIn) {
      state.cart = state.cart.filter(function (x) { return x !== id; });
      toast('已移出点餐');
    } else {
      state.cart.push(id);
      toast('已加入 · 继续点菜');
    }
    saveCart(); updateBadge(); renderOverview();
    if (!$('#detail').hidden) {
      if (wasIn) openDetail(id);            // 移出：留在详情刷新按钮
      else closeOverlay('detail');          // 加入：回到菜单继续点
    }
    if (!$('#cart').hidden) renderCart();
  }
  function updateBadge() {
    var b = $('#cart-badge');
    if (state.cart.length) { b.textContent = state.cart.length; b.hidden = false; }
    else b.hidden = true;
  }

  function renderCart() {
    var body = $('#cart-body');
    var dishes = state.cart.map(function (id) { return BY_ID[id]; }).filter(Boolean);
    if (!dishes.length) {
      body.innerHTML =
        '<div class="cart-top">' +
          '<div class="title-row"><button class="back" data-close="cart">×</button><div class="title">我的点餐</div></div>' +
          '<div class="cart-actions"><button class="btn primary" id="add-more">去点菜</button></div>' +
        '</div>' +
        '<div class="sheet-body"><div class="empty">还没有点菜～<br>去「点餐」挑几道，我会帮你做同餐搭配分析和采购清单。</div></div>';
      $('#add-more').onclick = function () { closeOverlay('cart'); };
      return;
    }

    var a = window.analyzeMeal(dishes);
    var lab = window.scoreLabel(a.score);
    var avgGi = Math.round(dishes.reduce(function (s, d) { return s + dishGi(d); }, 0) / dishes.length);
    var scoreHtml =
      '<div class="score-card"><div class="num">' + a.score + '</div>' +
      '<div class="lab">' + lab.ico + ' ' + lab.text + '</div>' +
      '<div class="desc">共 ' + dishes.length + ' 道菜 · ' + a.meat + ' 荤 / ' + a.veg + ' 素 / ' + a.soup + ' 汤 · 平均GI ' + avgGi + '</div></div>';

    var alertsHtml = a.hits.map(function (h) {
      var r = h.rule;
      var cls = r.level === 3 ? 'l3' : r.level === 2 ? 'l2' : 'l1';
      var ico = r.level === 3 ? '🚨' : r.level === 2 ? '⚠️' : '💡';
      var names = h.dishes.map(function (d) { return d.name; }).join(' + ');
      return '<div class="alert ' + cls + '">' +
        '<div class="at">' + ico + ' ' + esc(r.title) + ' <span style="font-weight:400;font-size:11px;color:var(--ink2)">（' + esc(names) + '）</span></div>' +
        '<div class="awhy">' + esc(r.why) + '</div>' +
        '<div class="afix"><b>怎么调：</b>' + esc(r.fix) + '</div>' +
        '<div class="awho">' + esc(r.who) + '</div>' +
      '</div>';
    }).join('');

    var suggestHtml = a.suggests.map(function (s) {
      return '<div class="suggest"><div class="st">💡 ' + esc(s.t) + '</div><div>' + esc(s.d) + '</div></div>';
    }).join('');

    // 采购清单：按 主料/辅料/调料 聚合去重
    var shop = { '主料': {}, '辅料': {}, '调料': {} };
    dishes.forEach(function (d) {
      (d.main || []).forEach(function (x) { if (x && x !== '无') shop['主料'][x] = (shop['主料'][x] || 0) + 1; });
      (d.aux || []).forEach(function (x) { if (x && x !== '无') shop['辅料'][x] = (shop['辅料'][x] || 0) + 1; });
      (d.seas || []).forEach(function (x) { if (x && x !== '无') shop['调料'][x] = (shop['调料'][x] || 0) + 1; });
    });
    function shopGroup(title, obj) {
      var keys = Object.keys(obj);
      if (!keys.length) return '';
      var items = keys.map(function (k) {
        return '<li data-shop="' + esc(k) + '"><span class="ck"></span><span>' + esc(k) + '</span></li>';
      }).join('');
      return '<div class="block-title"><span class="bar"></span>' + title + '（' + keys.length + '）</div>' +
        '<ul class="shop-list" style="list-style:none;padding:0;margin:0 0 14px">' + items + '</ul>';
    }
    var shopHtml = shopGroup('🛒 主料', shop['主料']) + shopGroup('🧄 辅料', shop['辅料']) + shopGroup('🧂 调料', shop['调料']);

    var itemsHtml = dishes.map(function (d) {
      return '<div class="cart-item">' +
        '<div style="flex:1"><div class="ci-name">' + esc(d.name) + '</div>' +
        '<div class="ci-meta">' + esc(d.cat) + ' · ' + d.kcal + ' kcal · 约' + d.time + '分</div></div>' +
        '<button class="rm" data-rm="' + d.id + '">×</button></div>';
    }).join('');

    body.innerHTML =
      '<div class="cart-top">' +
        '<div class="title-row"><button class="back" data-close="cart">×</button><div class="title">我的点餐（' + dishes.length + '）</div></div>' +
        '<div class="cart-actions">' +
          '<button class="btn ghost" id="clear-cart">清空</button>' +
          '<button class="btn primary" id="add-more">继续点菜</button>' +
        '</div>' +
      '</div>' +
      '<div class="sheet-body">' +
        scoreHtml +
        (alertsHtml ? '<div class="block-title"><span class="bar"></span>搭配体检</div>' + alertsHtml : '') +
        (suggestHtml ? suggestHtml : '') +
        '<div class="block-title"><span class="bar"></span>已点菜品</div>' + itemsHtml +
        (shopHtml ? '<div class="block-title"><span class="bar"></span>采购清单</div>' + shopHtml +
          '<div class="disclaimer">勾掉已买到的；清单按菜品自动汇总，购前请按实际人数微调用量。</div>' : '') +
      '</div>';

    Array.prototype.forEach.call(body.querySelectorAll('[data-rm]'), function (el) {
      el.onclick = function () { toggleCart(el.getAttribute('data-rm')); };
    });
    Array.prototype.forEach.call(body.querySelectorAll('[data-shop]'), function (el) {
      el.onclick = function () { el.classList.toggle('done'); };
    });
    $('#clear-cart').onclick = function () {
      state.cart = []; saveCart(); updateBadge(); renderCart(); renderOverview(); toast('已清空');
    };
    $('#add-more').onclick = function () { closeOverlay('cart'); };
  }

  /* ---------- 主页概览板块（我的点餐） ---------- */
  function renderOverview() {
    var box = $('#cart-overview'); if (!box) return;
    var dishes = state.cart.map(function (id) { return BY_ID[id]; }).filter(Boolean);
    if (!dishes.length) {
      box.innerHTML =
        '<div class="ov-card" id="ov-card">' +
          '<div class="ov-head"><div class="ov-title">🛒 我的点餐</div><div class="ov-go">去挑菜 ›</div></div>' +
          '<div class="ov-empty-tip">还没点菜，挑几道招牌菜开始吧～</div>' +
        '</div>';
      $('#ov-card').onclick = function () { renderCart(); openOverlay('cart'); };
      return;
    }
    var a = window.analyzeMeal(dishes);
    var totalKcal = dishes.reduce(function (s, d) { return s + (d.kcal || 0); }, 0);
    var avgGi = Math.round(dishes.reduce(function (s, d) { return s + dishGi(d); }, 0) / dishes.length);
    box.innerHTML =
      '<div class="ov-card" id="ov-card">' +
        '<div class="ov-head"><div class="ov-title">🛒 我的点餐 <span class="ov-count">' + dishes.length + '</span></div><div class="ov-go">查看 ›</div></div>' +
        '<div class="ov-stats">' +
          '<div class="ov-stat"><b>' + dishes.length + '</b><span>已点道数</span></div>' +
          '<div class="ov-stat"><b>' + totalKcal + '</b><span>总热量</span></div>' +
          '<div class="ov-stat"><b>' + avgGi + '</b><span>平均GI</span></div>' +
          '<div class="ov-stat"><b>' + a.score + '</b><span>搭配评分</span></div>' +
        '</div>' +
      '</div>';
    $('#ov-card').onclick = function () { renderCart(); openOverlay('cart'); };
  }

  /* ---------- 相克百科 ---------- */
  function renderMyths() {
    var body = $('#myths-body');
    var html = '<div class="sheet-head"><button class="back" data-close="myths">×</button><div class="title">相克百科</div></div><div class="sheet-body>';
    html += '<div class="disclaimer" style="margin-top:0;margin-bottom:12px">民间流传很多「食物相克」说法，大部分是谣言。这里把常见说法逐条核实，帮你别被误导，也别真踩雷。</div>';
    html += (window.MYTHS || []).map(function (m) {
      return '<div class="myth"><div class="claim">' + esc(m.claim) +
        '<span class="verdict v-' + esc(m.verdict) + '">' + esc(m.verdict) + '</span></div>' +
        '<div class="fact">' + esc(m.fact) + '</div></div>';
    }).join('');
    html += '</div>';
    body.innerHTML = html;
    openOverlay('myths');
  }

  /* ---------- 浮层控制 ---------- */
  function openOverlay(id) { $('#' + id).hidden = false; $('#' + id).scrollTop = 0; var s = $('#' + id + ' .sheet'); if (s) s.scrollTop = 0; }
  function closeOverlay(id) { $('#' + id).hidden = true; }
  document.addEventListener('click', function (e) {
    var cl = e.target.closest('[data-close]');
    if (cl) { closeOverlay(cl.getAttribute('data-close')); return; }
    var ov = e.target.closest('.overlay');
    if (ov && e.target === ov) { ov.hidden = true; }   // 点灰色背景关闭
  });

  /* ---------- 底部导航 ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('.bottom-nav button'), function (b) {
    b.onclick = function () {
      var v = b.getAttribute('data-view');
      Array.prototype.forEach.call(document.querySelectorAll('.bottom-nav button'), function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      if (v === 'menu') { ['detail', 'cart', 'myths'].forEach(closeOverlay); }
      else if (v === 'cart') { renderCart(); openOverlay('cart'); }
      else if (v === 'myths') { renderMyths(); }
    };
  });

  /* ---------- 搜索 ---------- */
  var searchTimer;
  $('#search').addEventListener('input', function () {
    state.q = this.value;
    $('#clear-search').hidden = !this.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () { renderList(); }, 120);
  });
  $('#clear-search').onclick = function () {
    $('#search').value = ''; state.q = ''; this.hidden = true; renderList();
  };

  /* ---------- 启动 ---------- */
  renderCats();
  renderList();
  updateBadge();
  renderOverview();
})();

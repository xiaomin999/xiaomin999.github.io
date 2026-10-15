/* ============================================================
 * 日迹 · 备忘录工作台  ——  主程序
 * 视图：日历 / 流水 / 统计 / 设置
 * ============================================================ */

(function () {
  'use strict';

  /* 构建版本：改动前端后要手动 +1，并同步更新 index.html 里 app.js 的 ?v=（设置页会显示，用来确认浏览器跑的是新代码） */
  var APP_VER = 'v2.2';

  /* ---------------- 小工具 ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function money(n) { return '¥' + (Math.round(Number(n || 0) * 100) / 100).toLocaleString('zh-CN'); }

  const SV = {
    plus: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
    edit: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 20h4l10-10-4-4L4 16z"/><path d="M14 6l4 4"/></svg>',
    trash: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
    check: '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><path d="M4 12l6 6L20 6"/></svg>',
    left: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 5l-7 7 7 7"/></svg>',
    right: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 5l7 7-7 7"/></svg>'
  };

  const view = { name: 'calendar', y: 0, m: 0, sel: DU.today() };
  const ui = { q: '', kind: 'all', tag: '' };
  const day0 = DU.parse(DU.today());
  view.y = day0.getFullYear(); view.m = day0.getMonth();

  let modalSave = null;

  /* ---------------- 提示条 ---------------- */
  let toastTimer = null;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('on'); }, 2200);
  }

  /* ---------------- 导航 ---------------- */
  function setView(name) {
    view.name = name;
    $$('.rail-btn').forEach(function (b) { b.classList.toggle('is-on', b.dataset.view === name); });
    $$('.view').forEach(function (s) { s.classList.toggle('is-on', s.id === 'view-' + name); });
    const titles = { calendar: '日历', stream: '流水', stats: '统计', settings: '设置' };
    $('#viewTitle').textContent = titles[name] || '日历';
    renderTopActions();
    renderAll();
  }

  function renderTopActions() {
    const box = $('#topActions');
    if (view.name === 'calendar') {
      box.innerHTML = '<button class="btn primary" data-act="add-entry" data-kind="activity">' + SV.plus + ' 记一条</button>';
    } else if (view.name === 'stream') {
      box.innerHTML = '<button class="btn" data-act="cal-today">回到今天</button>';
    } else {
      box.innerHTML = '';
    }
  }

  /* ---------------- 总渲染 ---------------- */
  function renderAll() {
    if (view.name === 'calendar') { renderCalendar(); renderDayPane(); }
    else if (view.name === 'stream') renderStream();
    else if (view.name === 'stats') renderStats();
    else if (view.name === 'settings') renderSettings();
    renderSyncDot();
  }

  function renderSyncDot() {
    const info = Sync.info();
    const dot = $('#syncDot');
    const cc = Sync.cloudConfig ? Sync.cloudConfig() : {};
    const hasCfg = !!(cc.url && cc.anonKey);
    dot.className = 'sync-dot ' + (
      !info.enabled ? 'off' :
      info.status === 'syncing' ? 'syncing' :
      info.status === 'err' ? 'err' : 'on'
    );
    dot.title = !info.enabled ? (hasCfg ? '已填连接信息，但 SDK 未加载（检查 js/vendor/supabase.js）' : '纯本地模式（未连接云端）')
      : info.status === 'syncing' ? '正在同步…'
      : info.status === 'err' ? ('同步出错：' + info.error)
      : ('已连接云端 · 待推送 ' + info.pending + ' 条');
  }

  /* ================= 日历 ================= */
  function renderCalendar() {
    const y = view.y, m = view.m;
    $('#calToolbar').innerHTML =
      '<span class="cal-title">' + DU.monthLabel(y, m) + '</span>' +
      '<span class="cal-nav">' +
        '<button data-act="cal-prev" title="上个月">' + SV.left + '</button>' +
        '<button data-act="cal-next" title="下个月">' + SV.right + '</button>' +
      '</span>' +
      '<span class="spacer"></span>' +
      '<button class="btn sm" data-act="cal-today">今天</button>';

    const first = new Date(y, m, 1);
    const startDow = (first.getDay() + 6) % 7;
    const dim = new Date(y, m + 1, 0).getDate();
    const rows = Math.ceil((startDow + dim) / 7);
    let html = '';
    for (let i = 0; i < rows * 7; i++) {
      const d = new Date(y, m, 1 - startDow + i);
      html += cellHTML(DU.ymd(d), d, d.getMonth() !== m);
    }
    $('#calGrid').innerHTML = html;
    renderLegend();
  }

  function cellHTML(key, d, dim) {
    const logs = Store.logsOfDay(key);
    const habitNames = [], dotParts = [];
    logs.forEach(function (l) {
      const h = Store.habitById(l.habitId);
      if (h) { habitNames.push(h.name); dotParts.push('<i class="dot" style="background:' + h.color + '"></i>'); }
    });
    const tags = Store.tagsOfDay(key);
    tags.forEach(function (t) {
      dotParts.push('<i class="dot" style="background:' + tagColor(t) + '"></i>');
    });
    if (ui.tag && tags.indexOf(ui.tag) >= 0) dotParts.unshift('<i class="dot" style="background:' + tagColor(ui.tag) + ';width:9px;height:9px"></i>');

    const total = logs.length + tags.length;
    const shown = dotParts.slice(0, 6).join('');
    const more = total > 6 ? '<i class="dot more">+' + (total - 6) + '</i>' : '';
    const ents = Store.entriesOfDay(key);
    const names = habitNames.concat(tags).slice(0, 2).join(' · ');

    const cls = ['cell'];
    if (dim) cls.push('dim');
    if (DU.isToday(key)) cls.push('is-today');
    if (key === view.sel) cls.push('is-sel');

    return '<button class="' + cls.join(' ') + '" data-act="pick-day" data-day="' + key + '">' +
      '<span class="cell-num">' + d.getDate() + '</span>' +
      (ents.length ? '<span class="cell-badge">' + ents.length + '</span>' : '') +
      (names ? '<span class="cell-meta">' + esc(names) + '</span>' : '<span class="cell-meta"></span>') +
      '<span class="cell-dots">' + shown + more + '</span>' +
      '</button>';
  }

  function renderLegend() {
    const box = $('#calLegend');
    const habits = Store.habits();
    const tags = Store.allTags().slice(0, 8);
    let html = '<span class="legend-title">习惯</span>';
    html += habits.map(function (h) {
      return '<span class="legend-item" data-act="toggle-habit-legend" data-habit="' + h.id + '">' +
        '<i class="dot" style="background:' + h.color + '"></i>' + esc(h.name) + '</span>';
    }).join('');
    if (tags.length) {
      html += '<span class="legend-title" style="margin-left:8px">标签</span>';
      html += tags.map(function (t) {
        return '<span class="legend-item" data-act="filter-tag" data-tag="' + esc(t.tag) + '">' +
          '<i class="dot" style="background:' + tagColor(t.tag) + '"></i>' + esc(t.tag) +
          '<span style="color:var(--hint)">' + t.count + '</span></span>';
      }).join('');
    }
    box.innerHTML = html;
  }

  /* ================= 当日面板 ================= */
  function renderDayPane() {
    const day = view.sel;
    const habits = Store.habits();
    const logged = Store.logsOfDay(day);
    const ents = Store.entriesOfDay(day);
    const meals = ents.filter(function (e) { return e.kind === 'meal'; });
    const acts = ents.filter(function (e) { return e.kind === 'activity'; });
    const moods = ents.filter(function (e) { return e.kind === 'mood'; });
    const exps = ents.filter(function (e) { return e.kind === 'expense'; });
    const spent = exps.reduce(function (s, e) { return s + (Number(e.amount) || 0); }, 0);

    let html = '';
    html += '<div class="dp-head">' +
      '<div class="dp-date">' + DU.cn(day) +
        '<span class="pill ' + (DU.isToday(day) ? 'ok' : 'off') + '">' + DU.relative(day) + '</span>' +
      '</div>' +
      '<div class="dp-sub">周' + DU.weekday(day) + ' · ' + ents.length + ' 条记录' +
        (logged.length ? ' · 打卡 ' + logged.length + '/' + habits.length : '') +
        (spent ? ' · 花费 ' + money(spent) : '') +
      '</div>' +
    '</div><div class="dp-body">';

    // —— 打卡 ——
    html += '<section class="dp-sec">' +
      '<div class="dp-sec-head"><span class="dp-sec-title">今天做到了</span>' +
      '<span style="font-size:11.5px;color:var(--hint)">点一下打勾</span></div>';
    if (!habits.length) {
      html += '<div class="empty">还没有习惯，去「设置」加几个。</div>';
    } else {
      html += '<div class="chips">' + habits.map(function (h) {
        const on = Store.isLogged(h.id, day);
        const st = Store.streak(h.id);
        return '<button class="chip' + (on ? ' on' : '') + '" data-act="toggle-habit" data-habit="' + h.id + '" ' +
          'style="' + (on ? 'color:' + h.color : '') + '" title="' + esc(h.name) + (st ? ' · 连续 ' + st + ' 天' : '') + '">' +
          '<i class="tick" style="background:' + (on ? h.color : 'transparent') + ';border-color:' + h.color + '">' + SV.check + '</i>' +
          esc(h.name) + (st > 1 ? '<span style="color:var(--hint);font-size:11px">' + st + '天</span>' : '') +
          '</button>';
      }).join('') + '</div>';
    }
    html += '</section>';

    // —— 吃了什么 ——
    html += '<section class="dp-sec">' +
      '<div class="dp-sec-head"><span class="dp-sec-title">吃了什么</span>' +
      '<button class="btn sm ghost" data-act="add-entry" data-kind="meal">' + SV.plus + '</button></div>';
    html += meals.length
      ? meals.map(function (e) { return recHTML(e, { slot: true }); }).join('')
      : '<div class="empty">还没记。早上吃了什么？</div>';
    html += '<div class="quick-add">' + MEAL_SLOTS.map(function (s) {
      return '<button class="btn sm" data-act="add-entry" data-kind="meal" data-slot="' + s + '">＋' + s + '</button>';
    }).join('') + '</div></section>';

    // —— 做了什么 ——
    html += '<section class="dp-sec">' +
      '<div class="dp-sec-head"><span class="dp-sec-title">做了什么</span>' +
      '<button class="btn sm ghost" data-act="add-entry" data-kind="activity">' + SV.plus + '</button></div>';
    html += acts.length
      ? acts.map(function (e) { return recHTML(e); }).join('')
      : '<div class="empty">运动、加班、看书、见了谁……都记这里。</div>';
    html += '</section>';

    // —— 心情与状态 ——
    const mood = moods[0] || null;
    const mp = (mood && mood.payload) || {};
    html += '<section class="dp-sec">' +
      '<div class="dp-sec-head"><span class="dp-sec-title">心情与状态</span>' +
      (mood ? '<button class="btn sm ghost" data-act="edit-entry" data-id="' + mood.id + '">' + SV.edit + '</button>'
            : '<button class="btn sm ghost" data-act="add-entry" data-kind="mood">' + SV.plus + '</button>') + '</div>';
    html += moodRow('心情', 'mood', mp.mood, mood ? mood.id : '');
    html += moodRow('精力', 'energy', mp.energy, mood ? mood.id : '');
    html += '<div class="mood-row"><span class="mood-label">睡眠</span>' +
      '<input class="mood-sleep" type="number" step="0.5" min="0" max="24" placeholder="小时" ' +
      'value="' + (mp.sleep == null ? '' : mp.sleep) + '" data-act="mood-sleep" data-id="' + (mood ? mood.id : '') + '">' +
      '<span style="font-size:12px;color:var(--hint)">小时</span></div>';
    if (mood && mood.note) html += '<div class="rec-note" style="padding-left:62px">' + esc(mood.note) + '</div>';
    html += '</section>';

    // —— 花费 ——
    html += '<section class="dp-sec">' +
      '<div class="dp-sec-head"><span class="dp-sec-title">花费' +
      (spent ? ' <b>' + money(spent) + '</b>' : '') + '</span>' +
      '<button class="btn sm ghost" data-act="add-entry" data-kind="expense">' + SV.plus + '</button></div>';
    html += exps.length
      ? exps.map(function (e) { return recHTML(e, { amount: true }); }).join('')
      : '<div class="empty">今天花了多少？记一笔。</div>';
    html += '</section>';

    html += '</div>';
    $('#dayPane').innerHTML = html;
  }

  function moodRow(label, field, val, entryId) {
    let s = '<div class="mood-row"><span class="mood-label">' + label + '</span><span class="mood-pick">';
    for (let i = 1; i <= 5; i++) {
      s += '<button class="' + (Number(val) === i ? 'on' : '') + '" data-act="mood-set" ' +
        'data-field="' + field + '" data-val="' + i + '" data-id="' + entryId + '">' + i + '</button>';
    }
    return s + '</span></div>';
  }

  function recHTML(e, opt) {
    opt = opt || {};
    const tags = (e.tags || []).map(function (t) {
      return '<span class="tag" data-act="filter-tag" data-tag="' + esc(t) + '" ' +
        'style="color:' + tagColor(t) + '">' + esc(t) + '</span>';
    }).join('');
    const who = e.author && e.author !== Store.settings().author
      ? '<span class="who">' + esc(e.author) + '</span>' : '';
    return '<div class="rec">' +
      (opt.slot && e.slot ? '<span class="rec-slot">' + esc(e.slot) + '</span>' : '') +
      '<div class="rec-main">' +
        '<div class="rec-title">' + (esc(e.title) || '<span style="color:var(--hint)">未命名</span>') + '</div>' +
        (e.note ? '<div class="rec-note">' + esc(e.note) + '</div>' : '') +
        ((tags || who) ? '<div class="rec-meta">' + tags + who + '</div>' : '') +
      '</div>' +
      (opt.amount && e.amount != null ? '<span class="rec-amount">' + money(e.amount) + '</span>' : '') +
      '<span class="rec-acts">' +
        '<button data-act="edit-entry" data-id="' + e.id + '" title="编辑">' + SV.edit + '</button>' +
        '<button class="del" data-act="del-entry" data-id="' + e.id + '" title="删除">' + SV.trash + '</button>' +
      '</span></div>';
  }

  /* ================= 流水 ================= */
  function renderStream() {
    const kinds = [['all', '全部'], ['meal', '吃的'], ['activity', '做的'], ['mood', '状态'], ['expense', '花费']];
    $('#streamToolbar').innerHTML =
      '<input type="search" id="streamQ" placeholder="搜内容 / 标签…" value="' + esc(ui.q) + '">' +
      '<span class="seg">' + kinds.map(function (k) {
        return '<button class="' + (ui.kind === k[0] ? 'on' : '') + '" data-act="filter-kind" data-kind="' + k[0] + '">' + k[1] + '</button>';
      }).join('') + '</span>' +
      (ui.tag ? '<button class="btn sm" data-act="filter-tag" data-tag="">标签：' + esc(ui.tag) + ' ✕</button>' : '');

    const q = ui.q.trim().toLowerCase();
    let list = Store.state.entries.slice();
    if (ui.kind !== 'all') list = list.filter(function (e) { return e.kind === ui.kind; });
    if (ui.tag) list = list.filter(function (e) { return (e.tags || []).indexOf(ui.tag) >= 0; });
    if (q) {
      list = list.filter(function (e) {
        return (String(e.title) + ' ' + String(e.note) + ' ' + (e.tags || []).join(' ') + ' ' + String(e.slot || ''))
          .toLowerCase().indexOf(q) >= 0;
      });
    }
    list.sort(function (a, b) {
      if (a.day !== b.day) return a.day < b.day ? 1 : -1;
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });

    if (!list.length) {
      $('#streamList').innerHTML = '<div class="empty">没有符合条件的记录。</div>';
      return;
    }
    const groups = {};
    list.forEach(function (e) { (groups[e.day] = groups[e.day] || []).push(e); });

    let html = '';
    Object.keys(groups).forEach(function (day) {
      const items = groups[day];
      const logged = Store.logsOfDay(day).length;
      html += '<div class="stream-group">' +
        '<div class="stream-date">' + DU.cnFull(day) + ' 周' + DU.weekday(day) +
          '<span class="pill ' + (DU.isToday(day) ? 'ok' : 'off') + '">' + DU.relative(day) + '</span>' +
          (logged ? '<span style="color:var(--hint)">打卡 ' + logged + '</span>' : '') +
          '<span class="line"></span>' +
          '<button class="btn sm ghost" data-act="add-entry" data-kind="activity" data-day="' + day + '">' + SV.plus + '</button>' +
        '</div>' +
        '<div class="stream-cards">' + items.map(function (e) { return recHTML(e, { slot: true, amount: true }); }).join('') + '</div>' +
      '</div>';
    });
    $('#streamList').innerHTML = html;
  }

  /* ================= 统计 ================= */
  function renderStats() {
    const t = DU.today();
    const d0 = DU.parse(t);
    const monthStart = DU.ymd(new Date(d0.getFullYear(), d0.getMonth(), 1));
    const monthEnd = DU.ymd(new Date(d0.getFullYear(), d0.getMonth() + 1, 0));
    const last30 = DU.addDays(t, -29);

    const monthEntries = Store.state.entries.filter(function (e) { return e.day >= monthStart && e.day <= monthEnd; });
    const habits = Store.habits(true);
    let monthLogs = 0;
    habits.forEach(function (h) { monthLogs += Store.habitCount(h.id, monthStart, monthEnd); });

    const spentMonth = Store.sumExpense(monthStart, monthEnd);
    const spent30 = Store.sumExpense(last30, t);
    let best = 0;
    habits.forEach(function (h) { best = Math.max(best, Store.bestStreak(h.id)); });

    let html = '<div class="stats-grid">' +
      metric('本月记录', monthEntries.length, '条') +
      metric('本月打卡', monthLogs, '次') +
      metric('本月花费', money(spentMonth).replace('¥', ''), '元', '¥') +
      metric('近 30 天花费', money(spent30).replace('¥', ''), '元', '¥') +
      metric('最长连续打卡', best, '天') +
      metric('累计记录', Store.state.entries.length, '条') +
    '</div>';

    // 习惯表
    html += '<div class="card-block"><h3 class="block-title">习惯坚持情况</h3>';
    if (!habits.length) {
      html += '<div class="empty">还没有习惯。</div>';
    } else {
      html += '<table class="hb"><thead><tr>' +
        '<th>习惯</th><th>本月</th><th>累计</th><th>当前连续</th><th>最长连续</th><th>近 8 周</th>' +
        '</tr></thead><tbody>';
      habits.forEach(function (h) {
        html += '<tr>' +
          '<td class="name"><span class="dot" style="background:' + h.color + ';display:inline-block;margin-right:7px;vertical-align:middle"></span>' + esc(h.name) + '</td>' +
          '<td class="num">' + Store.habitCount(h.id, monthStart, monthEnd) + '</td>' +
          '<td class="num">' + Store.habitCount(h.id) + '</td>' +
          '<td class="num">' + Store.streak(h.id) + '</td>' +
          '<td class="num">' + Store.bestStreak(h.id) + '</td>' +
          '<td>' + miniHeat(h.id) + '</td>' +
        '</tr>';
      });
      html += '</tbody></table>';
    }
    html += '</div>';

    // 标签云
    const tags = Store.allTags();
    html += '<div class="card-block"><h3 class="block-title">做过的事 · 标签</h3>';
    html += tags.length
      ? '<div class="tag-cloud">' + tags.map(function (t2) {
          const days = Store.daysWithTag(t2.tag).length;
          return '<button class="tag-pill" data-act="filter-tag" data-tag="' + esc(t2.tag) + '" style="color:' + tagColor(t2.tag) + '">' +
            esc(t2.tag) + '<b>' + t2.count + ' 次 / ' + days + ' 天</b></button>';
        }).join('') + '</div>'
      : '<div class="empty">还没有标签。记「做了什么」时加上标签，比如：跑步、加班、看书。</div>';
    html += '</div>';

    // 8 周热力图
    html += '<div class="card-block"><h3 class="block-title">最近 8 周记录密度</h3>' +
      heat56() + '<div class="hint">颜色越深，当天记录越多。空格子 = 那天什么都没记。</div></div>';

    $('#statsBody').innerHTML = html;
  }

  function metric(k, v, u, prefix) {
    return '<div class="metric"><div class="k">' + k + '</div><div class="v">' +
      (prefix || '') + (typeof v === 'number' ? v.toLocaleString('zh-CN') : esc(v)) +
      '<span class="u">' + (u || '') + '</span></div></div>';
  }

  function miniHeat(habitId) {
    let s = '<div class="heat mini">';
    for (let i = 55; i >= 0; i--) {
      const d = DU.addDays(DU.today(), -i);
      const h = Store.habitById(habitId);
      const on = Store.isLogged(habitId, d);
      s += '<i title="' + d + (on ? '：已打卡' : '') + '" style="background:' +
        (on ? (h ? h.color : '#378ADD') : '#F0EEE9') + '"></i>';
    }
    return s + '</div>';
  }

  function heat56() {
    const map = Store.datesWithAnyRecord();
    let max = 1;
    Object.keys(map).forEach(function (k) { if (map[k] > max) max = map[k]; });
    let s = '<div class="heat big">';
    for (let i = 55; i >= 0; i--) {
      const d = DU.addDays(DU.today(), -i);
      const n = map[d] || 0;
      const a = n ? 0.25 + 0.75 * (n / max) : 0;
      s += '<i title="' + d + '：' + n + ' 条" style="background:' +
        (n ? 'rgba(55,138,221,' + a.toFixed(2) + ')' : '#F0EEE9') + '"></i>';
    }
    return s + '</div>';
  }

  /* ================= 设置 ================= */
  function renderSettings() {
    const st = Store.settings();
    const info = Sync.info();
    const cc = Sync.cloudConfig ? Sync.cloudConfig() : { url: '', anonKey: '', fromLocal: false };
    const hasCfg = !!(cc.url && cc.anonKey);

    let html = '';

    // 同步
    html += '<div class="set-block"><h3 class="block-title">云端同步 <span style="font-weight:400;font-size:11px;color:var(--hint);margin-left:6px">构建 ' + APP_VER + '</span></h3>';
    html += '<div class="status-line">' +
      '<span class="pill ' + (!info.enabled ? 'off' : info.status === 'err' ? 'err' : info.status === 'syncing' ? 'warn' : 'ok') + '">' +
        (!info.enabled ? (hasCfg ? 'SDK 未加载' : '未连接') : info.status === 'err' ? '出错' : info.status === 'syncing' ? '同步中' : '已连接') +
      '</span>' +
      (info.enabled ? '<span style="color:var(--hint);font-size:12.5px">' + esc(info.url) + ' · 待推送 ' + info.pending + ' 条' +
        (info.lastSyncAt ? ' · 上次 ' + fmtTime(info.lastSyncAt) : '') + '</span>'
        : hasCfg
          ? '<span style="color:var(--hint);font-size:12.5px">连接信息已填，但 Supabase SDK 没加载成功 —— 检查 js/vendor/supabase.js 是否存在，或换网络刷新</span>'
          : '<span style="color:var(--hint);font-size:12.5px">还没连接云端，数据只在这台设备的浏览器里（下面填上连接信息即可开启）</span>') +
    '</div>';
    if (info.error) html += '<div class="hint" style="color:var(--danger)">' + esc(info.error) + '</div>';
    if (info.enabled) {
      html += '<div style="margin-top:12px;display:flex;gap:8px">' +
        '<button class="btn" data-act="sync-pull">从云端拉取</button>' +
        '<button class="btn" data-act="sync-push">本机数据推到云端</button>' +
      '</div>';
    }
    html += '<div class="set-row" style="margin-top:14px"><label>连接信息</label><div class="grow">' +
      '<input type="text" id="cloudUrl" placeholder="https://xxxx.supabase.co" value="' + esc(cc.url) + '">' +
      '<div style="display:flex;gap:6px;margin-top:6px">' +
        '<input type="password" id="cloudKey" placeholder="anon public key" value="' + esc(cc.anonKey) + '" style="flex:1">' +
        '<button class="btn sm" data-act="cloud-key-toggle">显示</button>' +
      '</div>' +
      '<div style="display:flex;gap:8px;margin-top:8px">' +
        '<button class="btn primary" data-act="cloud-save">保存并连接</button>' +
        '<button class="btn" data-act="cloud-clear">清除本机连接</button>' +
      '</div>' +
      '<div class="hint">把 Supabase 的 <b>Project URL</b> 和 <b>anon public key</b> 粘进来即可，只保存在<b>这台设备</b>的浏览器里，不会进任何仓库/文件。' +
        (cc.fromLocal ? '（当前用的就是本机保存的）' : '') + '</div>' +
      '<div class="hint">你和他的设备各粘一次（内容一样）。建表脚本在项目根目录 <code>supabase-memo-schema.sql</code>，到对应项目的 SQL Editor 执行一次。</div>' +
    '</div></div>';

    // 共享
    html += '<div class="set-block"><h3 class="block-title">共享与身份</h3>';
    html += '<div class="set-row"><label>我是谁</label><div class="grow">' +
      '<input type="text" id="setAuthor" value="' + esc(st.author) + '" placeholder="你的名字，如 小敏">' +
      '<div class="hint">两个人的设备填不一样的名字，记录上会显示是谁记的。</div></div></div>';
    html += '<div class="set-row"><label>共享空间码</label><div class="grow">' +
      '<input type="text" id="setWorkspace" value="' + esc(st.workspace) + '">' +
      '<div class="hint">你和他两台设备填<b>完全一样</b>的字符串才会看到同一份记录。改完会自动重新连接云端。</div></div></div>';
    html += '</div>';

    // 习惯管理
    html += '<div class="set-block"><h3 class="block-title">习惯清单</h3>';
    Store.habits(true).forEach(function (h) {
      html += '<div class="habit-edit">' +
        '<div class="palette">' + HABIT_PALETTE.map(function (c) {
          return '<button class="color-swatch' + (c === h.color ? ' on' : '') + '" data-act="habit-color" ' +
            'data-id="' + h.id + '" data-color="' + c + '" style="background:' + c + '"></button>';
        }).join('') + '</div>' +
        '<input type="text" value="' + esc(h.name) + '" data-act="habit-rename" data-id="' + h.id + '">' +
        '<button class="btn sm" data-act="habit-active" data-id="' + h.id + '">' + (h.active === false ? '启用' : '停用') + '</button>' +
        '<button class="btn sm danger" data-act="habit-del" data-id="' + h.id + '">' + SV.trash + '</button>' +
      '</div>';
    });
    html += '<div style="margin-top:12px"><button class="btn primary" data-act="habit-add">' + SV.plus + ' 加一个习惯</button></div>';
    html += '<div class="hint">停用后不再出现在当日打卡区，历史打卡记录保留。</div></div>';

    // 数据
    html += '<div class="set-block"><h3 class="block-title">数据</h3><div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn" data-act="export">导出 JSON 备份</button>' +
      '<button class="btn" data-act="import-merge">导入并合并</button>' +
      '<button class="btn" data-act="import-replace">导入并覆盖</button>' +
      '<button class="btn danger" data-act="clear-local">清空本机数据</button>' +
    '</div><div class="hint">' +
      '本机数据：习惯 ' + Store.state.habits.length + ' 个 · 打卡 ' + Store.state.logs.length +
      ' 条 · 记录 ' + Store.state.entries.length + ' 条。' +
      '清空只影响这台设备，云端数据不动，之后重新拉取就能回来。' +
    '</div></div>';

    $('#settingsBody').innerHTML = html;
  }

  function fmtTime(d) {
    const x = new Date(d);
    return DU.pad(x.getHours()) + ':' + DU.pad(x.getMinutes()) + ':' + DU.pad(x.getSeconds());
  }

  /* ================= 记录弹窗 ================= */
  function openEntryModal(entry, preset) {
    preset = preset || {};
    const isNew = !entry;
    const cur = entry || {
      day: preset.day || view.sel || DU.today(),
      kind: preset.kind || 'activity',
      slot: preset.slot || (preset.kind === 'meal' ? '早餐' : ''),
      title: '', note: '', tags: [], amount: null, payload: {}
    };
    let kind = cur.kind;
    let tags = (cur.tags || []).slice();

    const modal = $('#modalRoot');
    modal.classList.add('on');
    modal.innerHTML = '<div class="modal">' +
      '<div class="modal-head"><h3>' + (isNew ? '记一条' : '修改记录') + '</h3>' +
        '<div class="kind-tabs">' +
          [['meal', '吃了什么'], ['activity', '做了什么'], ['mood', '心情与状态'], ['expense', '花费']].map(function (k) {
            return '<button data-ktab="' + k[0] + '" class="' + (kind === k[0] ? 'on' : '') + '">' + k[1] + '</button>';
          }).join('') +
        '</div>' +
      '</div>' +
      '<form class="modal-body" id="entryForm"><div id="fields"></div></form>' +
      '<div class="modal-foot">' +
        '<button class="btn" data-act="modal-close">取消</button>' +
        '<button class="btn primary" data-act="modal-save">保存</button>' +
      '</div>' +
    '</div>';

    function fieldsHTML() {
      let h = '';
      h += '<div class="field"><label>日期</label><input type="date" id="f-day" value="' + cur.day + '"></div>';
      if (kind === 'meal') {
        h += '<div class="field"><label>哪一餐</label><select id="f-slot">' +
          MEAL_SLOTS.map(function (s) {
            return '<option ' + ((cur.slot || '早餐') === s ? 'selected' : '') + '>' + s + '</option>';
          }).join('') + '</select></div>';
        h += '<div class="field"><label>吃了什么</label><input type="text" id="f-title" value="' + esc(cur.title) + '" placeholder="例：番茄牛腩饭 + 一杯美式"></div>';
      } else if (kind === 'activity') {
        h += '<div class="field"><label>做了什么</label><input type="text" id="f-title" value="' + esc(cur.title) + '" placeholder="例：跑步 5 公里 / 加班到 9 点"></div>';
      } else if (kind === 'mood') {
        h += '<div class="field"><label>心情</label><div class="mood-pick" id="f-mood">' + picker('mood', cur.payload.mood) + '</div></div>';
        h += '<div class="field"><label>精力</label><div class="mood-pick" id="f-energy">' + picker('energy', cur.payload.energy) + '</div></div>';
        h += '<div class="field"><label>睡眠时长（小时）</label><input type="number" step="0.5" min="0" max="24" id="f-sleep" value="' + (cur.payload.sleep == null ? '' : cur.payload.sleep) + '" placeholder="例：7.5"></div>';
      } else {
        h += '<div class="field"><label>花在哪儿</label><input type="text" id="f-title" value="' + esc(cur.title) + '" placeholder="例：午饭外卖 / 打车"></div>';
        h += '<div class="field"><label>金额（元）</label><input type="number" step="0.01" min="0" id="f-amount" value="' + (cur.amount == null ? '' : cur.amount) + '" placeholder="例：28.5"></div>';
      }
      if (kind !== 'mood') {
        h += '<div class="field"><label>标签（逗号或空格分隔）</label>' +
          '<input type="text" id="f-tags" value="' + esc(tags.join('、')) + '" placeholder="例：跑步、加班"></div>';
        const sugg = Store.allTags().slice(0, 10);
        if (sugg.length) {
          h += '<div class="field"><label>常用标签</label><div class="chips">' + sugg.map(function (t) {
            return '<button type="button" class="chip" data-suggest="' + esc(t.tag) + '" style="color:' + tagColor(t.tag) + '">' + esc(t.tag) + '</button>';
          }).join('') + '</div></div>';
        }
      }
      h += '<div class="field"><label>备注</label><textarea id="f-note" placeholder="想补的话…">' + esc(cur.note) + '</textarea></div>';
      return h;
    }

    function picker(field, val) {
      let s = '';
      for (let i = 1; i <= 5; i++) {
        s += '<button type="button" data-pick="' + field + '" data-val="' + i + '" class="' + (Number(val) === i ? 'on' : '') + '">' + i + '</button>';
      }
      return s;
    }

    const payload = Object.assign({}, cur.payload);

    function paintFields() {
      $('#fields').innerHTML = fieldsHTML();
    }
    paintFields();

    modal.querySelectorAll('[data-ktab]').forEach(function (b) {
      b.addEventListener('click', function () {
        kind = b.dataset.ktab;
        modal.querySelectorAll('[data-ktab]').forEach(function (x) { x.classList.toggle('on', x === b); });
        paintFields();
      });
    });

    // 注意：用 onclick 赋值而非 addEventListener，
    // 否则每次打开弹窗都会往 #modalRoot 上叠加一层监听。
    modal.onclick = function (e) {
      if (!(e.target instanceof Element)) return;
      if (e.target.classList.contains('mask')) { closeModal(); return; }

      const pk = e.target.closest('[data-pick]');
      if (pk) {
        payload[pk.dataset.pick] = Number(pk.dataset.val);
        pk.parentElement.querySelectorAll('[data-pick]').forEach(function (x) { x.classList.toggle('on', x === pk); });
        return;
      }
      const sg = e.target.closest('[data-suggest]');
      if (sg) {
        const t = sg.dataset.suggest;
        const inp = $('#f-tags');
        if (!inp) return;
        const cur2 = inp.value.split(/[,，、\s]+/).filter(Boolean);
        if (cur2.indexOf(t) < 0) cur2.push(t);
        inp.value = cur2.join('、');
      }
    };

    modalSave = function () {
      const day = $('#f-day').value || cur.day;
      const titleEl = $('#f-title');
      const data = {
        day: day, kind: kind,
        slot: kind === 'meal' ? ($('#f-slot') ? $('#f-slot').value : '') : '',
        title: titleEl ? titleEl.value : (cur.title || ''),
        note: $('#f-note') ? $('#f-note').value : '',
        tags: kind === 'mood' ? [] : ($('#f-tags') ? $('#f-tags').value.split(/[,，、\s]+/).filter(Boolean) : []),
        amount: kind === 'expense' && $('#f-amount') ? $('#f-amount').value : null,
        payload: kind === 'mood' ? payload : {}
      };
      if (kind === 'mood' && $('#f-sleep') && $('#f-sleep').value !== '') payload.sleep = Number($('#f-sleep').value);
      if (!String(data.title || '').trim() && kind !== 'mood') { toast('先写点什么吧'); return; }
      if (kind === 'mood') data.title = '心情 ' + (payload.mood || '-') + ' / 精力 ' + (payload.energy || '-');
      if (isNew) Store.addEntry(data); else Store.updateEntry(cur.id, data);
      closeModal();
      toast(isNew ? '已记录' : '已更新');
      view.sel = day;
      const dd = DU.parse(day);
      view.y = dd.getFullYear(); view.m = dd.getMonth();
      renderAll();
    };
  }

  function closeModal() {
    const m = $('#modalRoot');
    m.innerHTML = '';
    m.classList.remove('on');
    modalSave = null;
  }

  /* ================= 事件 ================= */
  document.addEventListener('click', function (e) {
    if (!(e.target instanceof Element)) return;
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const act = t.dataset.act;

    switch (act) {
      case 'nav': setView(t.dataset.view); break;

      case 'cal-prev':
        view.m--; if (view.m < 0) { view.m = 11; view.y--; }
        renderCalendar(); break;
      case 'cal-next':
        view.m++; if (view.m > 11) { view.m = 0; view.y++; }
        renderCalendar(); break;
      case 'cal-today': {
        view.sel = DU.today();
        const d = DU.parse(view.sel);
        view.y = d.getFullYear(); view.m = d.getMonth();
        if (view.name !== 'calendar') setView('calendar'); else renderAll();
        break;
      }
      case 'pick-day':
        view.sel = t.dataset.day;
        if (window.innerWidth <= 980) {
          const pane = $('#dayPane');
          if (pane) setTimeout(function () { pane.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 40);
        }
        renderAll(); break;

      case 'toggle-habit': {
        const on = Store.toggleLog(t.dataset.habit, view.sel);
        toast(on ? '打卡成功' : '已取消');
        break;
      }
      case 'toggle-habit-legend':
        toast('到右边当日面板里点它就能打卡'); break;

      case 'add-entry':
        openEntryModal(null, { kind: t.dataset.kind, slot: t.dataset.slot, day: t.dataset.day || view.sel });
        break;

      case 'edit-entry': {
        const en = Store.entryById(t.dataset.id);
        if (en) openEntryModal(en);
        break;
      }
      case 'del-entry': {
        const en = Store.entryById(t.dataset.id);
        if (en && confirm('删除这条记录？\n\n' + (en.title || '(未命名)'))) { Store.deleteEntry(en.id); toast('已删除'); }
        break;
      }

      case 'mood-set': {
        const id = t.dataset.id, field = t.dataset.field, val = Number(t.dataset.val);
        if (id) {
          const en = Store.entryById(id);
          if (en) {
            const p = Object.assign({}, en.payload);
            p[field] = p[field] === val ? null : val;
            Store.updateEntry(id, { payload: p });
          }
        } else {
          const p = {}; p[field] = val;
          Store.addEntry({ day: view.sel, kind: 'mood', title: '心情 / 精力', payload: p });
        }
        break;
      }

      case 'filter-kind': ui.kind = t.dataset.kind; renderStream(); break;
      case 'filter-tag':
        ui.tag = (ui.tag === t.dataset.tag) ? '' : t.dataset.tag;
        if (ui.tag) { setView('stream'); }
        else renderStream();
        break;

      case 'habit-add': {
        const name = prompt('新习惯的名称，比如「早睡」「走 8000 步」：');
        if (name && name.trim()) { Store.addHabit({ name: name.trim() }); toast('已添加'); }
        break;
      }
      case 'habit-del': {
        const h = Store.habitById(t.dataset.id);
        if (h && confirm('删除习惯「' + h.name + '」？\n它下面所有历史打卡记录也会一起删掉。')) {
          Store.deleteHabit(h.id); toast('已删除');
        }
        break;
      }
      case 'habit-color': Store.updateHabit(t.dataset.id, { color: t.dataset.color }); break;
      case 'habit-active': {
        const h = Store.habitById(t.dataset.id);
        Store.updateHabit(h.id, { active: h.active === false });
        break;
      }

      case 'sync-pull':
        Sync.pull(false).then(function (r) {
          toast(r.ok ? ('已从云端拉取，更新 ' + r.changed + ' 条') : ('拉取失败：' + r.reason));
        });
        break;
      case 'sync-push':
        if (!confirm('把本机全部数据推到云端？\n同 ID 的云端记录会被本机覆盖。')) break;
        Sync.pushAll().then(function (r) { toast(r.ok ? '已推送到云端' : ('推送失败：' + r.reason)); });
        break;

      case 'cloud-save': {
        const u = ($('#cloudUrl') || {}).value || '';
        const k = ($('#cloudKey') || {}).value || '';
        if (!u.trim() || !k.trim()) { toast('url 和 anonKey 都要填'); break; }
        toast('正在连接…');
        Sync.setCloud(u, k).then(function (r) {
          if (!r.enabled) toast('Supabase SDK 未加载，检查 js/vendor/supabase.js');
          else toast(r.ok ? '已连接云端 ✅' : ('连接失败：' + (r.reason || '请检查 url / key')));
          renderAll();
        });
        break;
      }
      case 'cloud-clear':
        if (!confirm('清除本机保存的云端连接信息？云端数据不受影响。')) break;
        Sync.setCloud('', '').then(function () { toast('已清除本机连接'); renderAll(); });
        break;
      case 'cloud-key-toggle': {
        const kk = $('#cloudKey');
        if (kk) kk.type = kk.type === 'password' ? 'text' : 'password';
        break;
      }

      case 'export': {
        const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = '日迹备份-' + DU.today() + '.json';
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
        toast('已导出');
        break;
      }
      case 'import-merge':
      case 'import-replace': {
        const inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = '.json,application/json';
        inp.onchange = function () {
          const f = inp.files[0];
          if (!f) return;
          const rd = new FileReader();
          rd.onload = function () {
            try {
              const r = Store.importJSON(rd.result, act === 'import-replace' ? 'replace' : 'merge');
              toast('导入成功：' + r.entries + ' 条记录');
            } catch (err) { toast('导入失败：' + err.message); }
          };
          rd.readAsText(f);
        };
        inp.click();
        break;
      }
      case 'clear-local':
        if (confirm('清空这台设备上的全部记录？\n云端数据不动，之后重新拉取即可恢复。')) {
          Store.clearLocal();
          toast('本机已清空');
        }
        break;

      case 'modal-close': closeModal(); break;
      case 'modal-save': if (modalSave) modalSave(); break;
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeModal(); return; }
    if (!modalSave) return;
    const inModal = e.target.closest && e.target.closest('#modalRoot');
    if (!inModal) return;
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      modalSave();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      modalSave();
    }
  });

  // 设置页里的输入
  document.addEventListener('change', function (e) {
    const t = e.target;
    if (t.id === 'setAuthor') { Store.setSetting('author', t.value.trim() || '我'); toast('已保存'); }
    if (t.id === 'setWorkspace') {
      const v = t.value.trim();
      if (!v) return;
      Store.setSetting('workspace', v);
      Sync.resubscribe();
      Sync.pull(true);
      toast('已切换到空间：' + v);
    }
    if (t.dataset && t.dataset.act === 'habit-rename') {
      const v = t.value.trim();
      if (v) Store.updateHabit(t.dataset.id, { name: v });
    }
    if (t.dataset && t.dataset.act === 'mood-sleep') {
      const id = t.dataset.id, v = t.value;
      if (id) {
        const en = Store.entryById(id);
        if (en) Store.updateEntry(id, { payload: Object.assign({}, en.payload, { sleep: v === '' ? null : Number(v) }) });
      } else if (v !== '') {
        Store.addEntry({ day: view.sel, kind: 'mood', title: '心情 / 精力', payload: { sleep: Number(v) } });
      }
    }
  });

  document.addEventListener('input', function (e) {
    if (e.target.id === 'streamQ') {
      ui.q = e.target.value;
      const pos = e.target.selectionStart;
      renderStream();
      const box = $('#streamQ');
      if (box) { box.focus(); box.setSelectionRange(pos, pos); }
    }
  });

  // 数据一变就重绘当前视图
  Store.onRender(renderAll);

  /* ---------------- 启动 ---------------- */
  Store.init();
  Sync.onStatus(function () { renderSyncDot(); if (view.name === 'settings') renderSettings(); });
  Sync.init();
  setView('calendar');
  renderAll();

  window.__memo = { Store: Store, Sync: Sync, view: view, ui: ui, render: renderAll };
})();

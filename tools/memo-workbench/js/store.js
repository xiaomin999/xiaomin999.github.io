/* ============================================================
 * 日迹 · 备忘录工作台  ——  数据层
 * 本地优先：所有读写先落 localStorage，再由 sync.js 推云端。
 * 没配云端时纯本地跑，功能完全一致。
 * ============================================================ */

/* ---------------- 日期工具 ---------------- */
window.DU = (function () {
  const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

  function pad(n) { return String(n).padStart(2, '0'); }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) {
    const p = String(s).split('-').map(Number);
    return new Date(p[0], (p[1] || 1) - 1, p[2] || 1);
  }
  function today() { return ymd(new Date()); }
  function addDays(s, n) { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); }
  function weekday(s) { return WEEK[parse(s).getDay()]; }
  function cn(s) {
    const d = parse(s);
    return (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日';
  }
  function cnFull(s) {
    const d = parse(s);
    return d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日';
  }
  function isToday(s) { return s === today(); }
  function monthLabel(y, m) { return y + ' 年 ' + (m + 1) + ' 月'; }
  /** 相对今天的说法 */
  function relative(s) {
    const t = today();
    const diff = Math.round((parse(s) - parse(t)) / 86400000);
    if (diff === 0) return '今天';
    if (diff === -1) return '昨天';
    if (diff === 1) return '明天';
    if (diff === -2) return '前天';
    return weekday(s);
  }
  return { WEEK, ymd, parse, today, addDays, weekday, cn, cnFull, isToday, monthLabel, relative, pad };
})();

/* ---------------- 工具 ---------------- */
function uuid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

const HABIT_PALETTE = ['#378ADD', '#1D9E75', '#EF9F27', '#D4537E', '#7F77DD', '#639922', '#D85A30', '#0F6E56'];
const TAG_PALETTE = ['#7F77DD', '#1D9E75', '#D85A30', '#D4537E', '#378ADD', '#639922', '#BA7517', '#0F6E56', '#993556', '#185FA5'];

/** 标签颜色：同一个标签名永远得到同一个颜色，跨设备一致 */
function tagColor(tag) {
  let h = 0;
  const s = String(tag);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return TAG_PALETTE[h % TAG_PALETTE.length];
}

const MEAL_SLOTS = ['早餐', '午餐', '晚餐', '加餐'];
const KIND_LABEL = { meal: '吃了什么', activity: '做了什么', mood: '心情与状态', expense: '花费' };

/* ---------------- Store ---------------- */
window.Store = (function () {
  const NS = 'memo_v1_';
  const K = {
    habits: NS + 'habits',
    logs: NS + 'logs',
    entries: NS + 'entries',
    settings: NS + 'settings'
  };

  const DEFAULT_HABITS = [
    { name: '运动', color: '#378ADD' },
    { name: '早睡', color: '#1D9E75' },
    { name: '读书', color: '#EF9F27' },
    { name: '喝水 2L', color: '#85B7EB' },
    { name: '护肤', color: '#D4537E' }
  ];

  const state = {
    habits: [],
    logs: [],
    entries: [],
    settings: {}
  };

  const renderSubs = [];
  const syncSubs = [];

  function read(k, d) {
    try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : d; }
    catch (e) { console.warn('[store] 读取失败', k, e); return d; }
  }
  function write(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); }
    catch (e) { console.warn('[store] 写入失败', k, e); }
  }

  function persist() {
    write(K.habits, state.habits);
    write(K.logs, state.logs);
    write(K.entries, state.entries);
    write(K.settings, state.settings);
  }

  /** 让所有视图重绘 */
  function emitRender() { renderSubs.forEach(function (f) { try { f(); } catch (e) { console.error(e); } }); }
  /** 通知云同步模块去推送 */
  function emitSync(evt) { syncSubs.forEach(function (f) { try { f(evt); } catch (e) { console.error(e); } }); }

  function init() {
    state.habits = read(K.habits, []);
    state.logs = read(K.logs, []);
    state.entries = read(K.entries, []);
    state.settings = read(K.settings, {});

    if (!state.settings.workspace) {
      state.settings.workspace = window.MEMO_WORKSPACE_DEFAULT || 'memo-shared';
    }
    if (!state.settings.author) state.settings.author = '我';
    if (typeof state.settings.seeded !== 'boolean') state.settings.seeded = false;

    // 首次使用：内置一批习惯，让日历上立刻有东西可点
    if (!state.settings.seeded && !state.habits.length) {
      const now = new Date().toISOString();
      state.habits = DEFAULT_HABITS.map(function (h, i) {
        return {
          id: uuid(), name: h.name, color: h.color, sort: i + 1,
          active: true, author: state.settings.author, updatedAt: now
        };
      });
      state.settings.seeded = true;
    }
    persist();
  }

  /* ---------- 订阅 ---------- */
  function onRender(fn) { renderSubs.push(fn); }
  function onSync(fn) { syncSubs.push(fn); }

  /* ---------- 习惯 ---------- */
  function habits(all) {
    const list = state.habits.filter(function (h) { return all ? true : h.active !== false; });
    return list.sort(function (a, b) { return (a.sort || 0) - (b.sort || 0); });
  }
  function habitById(id) { return state.habits.filter(function (h) { return h.id === id; })[0] || null; }

  function addHabit(data) {
    const maxSort = state.habits.reduce(function (m, h) { return Math.max(m, h.sort || 0); }, 0);
    const h = {
      id: uuid(), name: data.name || '新习惯',
      color: data.color || HABIT_PALETTE[state.habits.length % HABIT_PALETTE.length],
      sort: maxSort + 1, active: true,
      author: state.settings.author, updatedAt: new Date().toISOString()
    };
    state.habits.push(h);
    persist(); emitRender();
    emitSync({ table: 'memo_habits', op: 'upsert', row: h });
    return h;
  }

  function updateHabit(id, patch) {
    const h = habitById(id);
    if (!h) return null;
    Object.assign(h, patch, { updatedAt: new Date().toISOString() });
    persist(); emitRender();
    emitSync({ table: 'memo_habits', op: 'upsert', row: h });
    return h;
  }

  function deleteHabit(id) {
    state.habits = state.habits.filter(function (h) { return h.id !== id; });
    const gone = state.logs.filter(function (l) { return l.habitId === id; });
    state.logs = state.logs.filter(function (l) { return l.habitId !== id; });
    persist(); emitRender();
    emitSync({ table: 'memo_habits', op: 'delete', id: id });
    gone.forEach(function (l) {
      emitSync({ table: 'memo_logs', op: 'delete', id: l.id });
    });
  }

  /* ---------- 打卡 ---------- */
  function logsOfDay(day) { return state.logs.filter(function (l) { return l.day === day; }); }
  function isLogged(habitId, day) {
    return state.logs.some(function (l) { return l.habitId === habitId && l.day === day; });
  }

  function toggleLog(habitId, day) {
    const hit = state.logs.filter(function (l) { return l.habitId === habitId && l.day === day; })[0];
    if (hit) {
      state.logs = state.logs.filter(function (l) { return l.id !== hit.id; });
      persist(); emitRender();
      emitSync({ table: 'memo_logs', op: 'delete', id: hit.id });
      return false;
    }
    const l = {
      id: uuid(), habitId: habitId, day: day,
      author: state.settings.author, updatedAt: new Date().toISOString()
    };
    state.logs.push(l);
    persist(); emitRender();
    emitSync({ table: 'memo_logs', op: 'upsert', row: l });
    return true;
  }

  /** 连续打卡天数（截止到某天，往前数） */
  function streak(habitId) {
    let n = 0;
    let cur = DU.today();
    // 今天没打卡不算断，从昨天继续往前数
    if (!isLogged(habitId, cur)) cur = DU.addDays(cur, -1);
    while (isLogged(habitId, cur)) { n++; cur = DU.addDays(cur, -1); }
    return n;
  }
  function bestStreak(habitId) {
    const days = state.logs
      .filter(function (l) { return l.habitId === habitId; })
      .map(function (l) { return l.day; })
      .sort();
    let best = 0, run = 0, prev = null;
    days.forEach(function (d) {
      if (prev && DU.addDays(prev, 1) === d) run++; else run = 1;
      if (run > best) best = run;
      prev = d;
    });
    return best;
  }
  function habitCount(habitId, from, to) {
    return state.logs.filter(function (l) {
      return l.habitId === habitId && (!from || l.day >= from) && (!to || l.day <= to);
    }).length;
  }

  /* ---------- 流水 ---------- */
  function entriesOfDay(day) {
    return state.entries
      .filter(function (e) { return e.day === day; })
      .sort(function (a, b) { return String(a.createdAt || '').localeCompare(String(b.createdAt || '')); });
  }
  function entryById(id) { return state.entries.filter(function (e) { return e.id === id; })[0] || null; }

  function addEntry(data) {
    const now = new Date().toISOString();
    const e = {
      id: uuid(),
      day: data.day || DU.today(),
      kind: data.kind || 'activity',
      slot: data.slot || '',
      title: (data.title || '').trim(),
      note: data.note || '',
      tags: (data.tags || []).map(function (t) { return String(t).trim(); }).filter(Boolean),
      amount: data.amount === '' || data.amount === null || data.amount === undefined ? null : Number(data.amount),
      payload: data.payload || {},
      author: state.settings.author,
      createdAt: now,
      updatedAt: now
    };
    state.entries.push(e);
    persist(); emitRender();
    emitSync({ table: 'memo_entries', op: 'upsert', row: e });
    return e;
  }

  function updateEntry(id, patch) {
    const e = entryById(id);
    if (!e) return null;
    Object.assign(e, patch, { updatedAt: new Date().toISOString() });
    if (e.tags) e.tags = e.tags.map(function (t) { return String(t).trim(); }).filter(Boolean);
    if (e.amount === '' || e.amount === undefined) e.amount = null;
    persist(); emitRender();
    emitSync({ table: 'memo_entries', op: 'upsert', row: e });
    return e;
  }

  function deleteEntry(id) {
    state.entries = state.entries.filter(function (e) { return e.id !== id; });
    persist(); emitRender();
    emitSync({ table: 'memo_entries', op: 'delete', id: id });
  }

  /** 某天用到的全部标签（习惯色 + 标签色的统一取色入口） */
  function tagsOfDay(day) {
    const set = {};
    entriesOfDay(day).forEach(function (e) { (e.tags || []).forEach(function (t) { set[t] = 1; }); });
    return Object.keys(set);
  }

  function allTags() {
    const map = {};
    state.entries.forEach(function (e) {
      (e.tags || []).forEach(function (t) { map[t] = (map[t] || 0) + 1; });
    });
    return Object.keys(map).map(function (t) { return { tag: t, count: map[t] }; })
      .sort(function (a, b) { return b.count - a.count; });
  }

  /** 标签出现在哪些天（日历高亮「同样的事情」用） */
  function daysWithTag(tag) {
    const set = {};
    state.entries.forEach(function (e) {
      if ((e.tags || []).indexOf(tag) >= 0) set[e.day] = 1;
    });
    return Object.keys(set);
  }

  function sumExpense(from, to) {
    let s = 0;
    state.entries.forEach(function (e) {
      if (e.kind !== 'expense' || e.amount == null) return;
      if (from && e.day < from) return;
      if (to && e.day > to) return;
      s += Number(e.amount) || 0;
    });
    return s;
  }

  function datesWithAnyRecord() {
    const set = {};
    state.entries.forEach(function (e) { set[e.day] = (set[e.day] || 0) + 1; });
    return set;
  }

  /* ---------- 设置 ---------- */
  function setSetting(k, v) {
    state.settings[k] = v;
    persist(); emitRender();
  }
  function settings() { return state.settings; }

  /* ---------- 云端合并 ---------- */
  function applyRemote(table, rows) {
    if (!rows || !rows.length) return 0;
    let changed = 0;
    if (table === 'memo_habits') {
      rows.forEach(function (r) {
        const local = habitById(r.id);
        if (!local) { state.habits.push(r); changed++; }
        else if (tsOf(r.updatedAt) > tsOf(local.updatedAt)) { Object.assign(local, r); changed++; }
      });
    } else if (table === 'memo_logs') {
      rows.forEach(function (r) {
        const local = state.logs.filter(function (l) { return l.id === r.id; })[0];
        if (!local) {
          // 同习惯同一天只保留一条
          const dup = state.logs.filter(function (l) { return l.habitId === r.habitId && l.day === r.day; })[0];
          if (dup) return;
          state.logs.push(r); changed++;
        }
      });
    } else if (table === 'memo_entries') {
      rows.forEach(function (r) {
        const local = entryById(r.id);
        if (!local) { state.entries.push(r); changed++; }
        else if (tsOf(r.updatedAt) > tsOf(local.updatedAt)) { Object.assign(local, r); changed++; }
      });
    }
    if (changed) { persist(); emitRender(); }
    return changed;
  }

  function removeRemote(table, id) {
    let changed = false;
    if (table === 'memo_habits') {
      const n = state.habits.length;
      state.habits = state.habits.filter(function (h) { return h.id !== id; });
      changed = n !== state.habits.length;
    } else if (table === 'memo_logs') {
      const n = state.logs.length;
      state.logs = state.logs.filter(function (l) { return l.id !== id; });
      changed = n !== state.logs.length;
    } else if (table === 'memo_entries') {
      const n = state.entries.length;
      state.entries = state.entries.filter(function (e) { return e.id !== id; });
      changed = n !== state.entries.length;
    }
    if (changed) { persist(); emitRender(); }
  }

  function tsOf(v) { const t = Date.parse(v || ''); return isNaN(t) ? 0 : t; }

  /** 清空本机数据（不影响云端） */
  function clearLocal() {
    state.habits = []; state.logs = []; state.entries = [];
    state.settings.seeded = false;
    persist(); emitRender(); emitSync({ table: '__reset__', op: 'reset' });
  }

  function exportJSON() {
    return JSON.stringify({
      app: '日迹', version: 1, exportedAt: new Date().toISOString(),
      settings: state.settings, habits: state.habits, logs: state.logs, entries: state.entries
    }, null, 2);
  }

  function importJSON(text, mode) {
    const d = JSON.parse(text);
    if (!d || !Array.isArray(d.entries)) throw new Error('文件格式不对');
    if (mode === 'replace') {
      state.habits = d.habits || [];
      state.logs = d.logs || [];
      state.entries = d.entries || [];
      if (d.settings) state.settings = Object.assign(state.settings, d.settings);
    } else {
      const ids = {};
      state.entries.forEach(function (e) { ids[e.id] = 1; });
      (d.entries || []).forEach(function (e) { if (!ids[e.id]) state.entries.push(e); });
      const hids = {};
      state.habits.forEach(function (h) { hids[h.id] = 1; });
      (d.habits || []).forEach(function (h) { if (!hids[h.id]) state.habits.push(h); });
      const lids = {};
      state.logs.forEach(function (l) { lids[l.id] = 1; });
      (d.logs || []).forEach(function (l) { if (!lids[l.id]) state.logs.push(l); });
    }
    persist(); emitRender();
    return { entries: (d.entries || []).length, habits: (d.habits || []).length, logs: (d.logs || []).length };
  }

  return {
    state, init, persist, onRender, onSync,
    habits, habitById, addHabit, updateHabit, deleteHabit,
    logsOfDay, isLogged, toggleLog, streak, bestStreak, habitCount,
    entriesOfDay, entryById, addEntry, updateEntry, deleteEntry,
    tagsOfDay, allTags, daysWithTag, sumExpense, datesWithAnyRecord,
    settings, setSetting,
    applyRemote, removeRemote, clearLocal, exportJSON, importJSON
  };
})();

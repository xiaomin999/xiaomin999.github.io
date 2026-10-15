/* ============================================================
 * 日迹 · 备忘录工作台  ——  云端同步层
 * ------------------------------------------------------------
 * 设计：本地优先（local-first）
 *   1) 所有改动先写 localStorage 并立刻渲染，界面永不等待网络
 *   2) 改动排队推送到 Supabase；断网时队列持久化，恢复后自动补推
 *   3) 订阅 postgres_changes，对方设备改了立刻拉到本机
 *   4) 冲突策略：谁改得晚（updated_at 更大）谁生效
 *
 * 没填 config 时 ENABLED=false，整个模块静默退化，不影响任何本地功能。
 * ============================================================ */

window.Sync = (function () {
  const CFG = window.MEMO_SUPABASE || {};
  const URL = String(CFG.url || '').trim();
  const KEY = String(CFG.anonKey || '').trim();
  const ENABLED = !!(URL && KEY && window.supabase && window.supabase.createClient);
  const TABLES = ['memo_habits', 'memo_logs', 'memo_entries'];
  const QKEY = 'memo_v1_pending';

  let sb = null;
  let channel = null;
  let queue = [];
  let flushing = false;
  let status = ENABLED ? 'idle' : 'off';
  let lastError = '';
  let lastSyncAt = null;
  const statusSubs = [];

  function ws() { return (Store.settings().workspace) || 'memo-shared'; }
  function nowISO() { return new Date().toISOString(); }

  function setStatus(s, err) {
    status = s;
    if (err !== undefined) lastError = err ? String(err.message || err) : '';
    statusSubs.forEach(function (f) { try { f(s, lastError); } catch (e) { console.error(e); } });
  }
  function onStatus(fn) { statusSubs.push(fn); fn(status, lastError); }

  function client() {
    if (!sb) sb = window.supabase.createClient(URL, KEY);
    return sb;
  }

  /* ---------------- 字段映射 ---------------- */
  function toRemote(table, row) {
    const base = { id: row.id, workspace: ws(), author: row.author || null, updated_at: row.updatedAt || nowISO() };
    if (table === 'memo_habits') {
      return Object.assign(base, {
        name: row.name, color: row.color, sort: row.sort || 0, active: row.active !== false
      });
    }
    if (table === 'memo_logs') {
      return Object.assign(base, { habit_id: row.habitId, day: row.day });
    }
    return Object.assign(base, {
      day: row.day, kind: row.kind, slot: row.slot || null,
      title: row.title || '', note: row.note || '',
      tags: row.tags || [], amount: row.amount == null ? null : Number(row.amount),
      payload: row.payload || {}, created_at: row.createdAt || row.updatedAt || nowISO()
    });
  }

  function fromRemote(table, r) {
    if (table === 'memo_habits') {
      return {
        id: r.id, name: r.name, color: r.color, sort: r.sort,
        active: r.active !== false, author: r.author || '', updatedAt: r.updated_at
      };
    }
    if (table === 'memo_logs') {
      return {
        id: r.id, habitId: r.habit_id, day: r.day,
        author: r.author || '', updatedAt: r.updated_at
      };
    }
    return {
      id: r.id, day: r.day, kind: r.kind, slot: r.slot || '',
      title: r.title || '', note: r.note || '',
      tags: r.tags || [], amount: r.amount == null ? null : Number(r.amount),
      payload: r.payload || {}, author: r.author || '',
      createdAt: r.created_at || r.updated_at, updatedAt: r.updated_at
    };
  }

  /* ---------------- 队列 ---------------- */
  function loadQueue() {
    try { queue = JSON.parse(localStorage.getItem(QKEY) || '[]') || []; }
    catch (e) { queue = []; }
  }
  function saveQueue() {
    try { localStorage.setItem(QKEY, JSON.stringify(queue)); } catch (e) { /* 满了就算了 */ }
  }
  function pendingCount() { return queue.length; }

  function enqueue(evt) {
    if (!ENABLED || !evt || evt.table === '__reset__') return;
    // 同一行的旧操作可以丢掉，合并成一次
    queue = queue.filter(function (op) {
      if (op.table !== evt.table) return true;
      return (op.op === 'upsert' ? op.row.id : op.id) !== (evt.op === 'upsert' ? evt.row.id : evt.id);
    });
    queue.push(evt);
    saveQueue();
    flush();
  }

  async function flush() {
    if (!ENABLED || flushing || !queue.length) return;
    flushing = true;
    setStatus('syncing');
    try {
      while (queue.length) {
        const op = queue[0];
        const c = client();
        let res;
        if (op.op === 'upsert') {
          res = await c.from(op.table).upsert(toRemote(op.table, op.row));
        } else {
          res = await c.from(op.table).delete().eq('id', op.id);
        }
        if (res && res.error) throw res.error;
        queue.shift();
        saveQueue();
      }
      lastSyncAt = new Date();
      setStatus('on');
    } catch (e) {
      console.warn('[sync] 推送失败，已留在队列待重试', e);
      setStatus('err', e);
      // 30 秒后自动重试
      setTimeout(function () { flushing = false; flush(); }, 30000);
      return;
    } finally {
      if (!queue.length) flushing = false;
    }
  }

  /* ---------------- 拉取 ---------------- */
  async function pull(silent) {
    if (!ENABLED) return { ok: false, reason: 'disabled' };
    if (!silent) setStatus('syncing');
    try {
      const c = client();
      const w = ws();
      const results = await Promise.all(TABLES.map(function (t) {
        return c.from(t).select('*').eq('workspace', w);
      }));
      let total = 0;
      for (let i = 0; i < TABLES.length; i++) {
        const r = results[i];
        if (r.error) throw r.error;
        const rows = (r.data || []).map(function (x) { return fromRemote(TABLES[i], x); });
        total += Store.applyRemote(TABLES[i], rows);
      }
      lastSyncAt = new Date();
      setStatus('on');
      return { ok: true, changed: total };
    } catch (e) {
      console.warn('[sync] 拉取失败', e);
      setStatus('err', e);
      return { ok: false, reason: String(e.message || e) };
    }
  }

  /** 把本机全部数据推上去（首次接入云端时用） */
  async function pushAll() {
    if (!ENABLED) return { ok: false, reason: 'disabled' };
    setStatus('syncing');
    try {
      const c = client();
      const jobs = [
        { t: 'memo_habits', rows: Store.state.habits },
        { t: 'memo_logs', rows: Store.state.logs },
        { t: 'memo_entries', rows: Store.state.entries }
      ];
      for (const j of jobs) {
        if (!j.rows.length) continue;
        const payload = j.rows.map(function (r) { return toRemote(j.t, r); });
        const res = await c.from(j.t).upsert(payload);
        if (res.error) throw res.error;
      }
      lastSyncAt = new Date();
      setStatus('on');
      return { ok: true };
    } catch (e) {
      setStatus('err', e);
      return { ok: false, reason: String(e.message || e) };
    }
  }

  /* ---------------- 实时订阅 ---------------- */
  function subscribe() {
    if (!ENABLED) return;
    try {
      if (channel) client().removeChannel(channel);
      const w = ws();
      channel = client().channel('memo-' + w);
      TABLES.forEach(function (t) {
        channel.on('postgres_changes',
          { event: '*', schema: 'public', table: t, filter: 'workspace=eq.' + w },
          function (payload) {
            if (payload.eventType === 'DELETE') {
              Store.removeRemote(t, payload.old.id);
            } else {
              Store.applyRemote(t, [fromRemote(t, payload.new)]);
            }
          });
      });
      channel.subscribe(function (st) {
        if (st === 'SUBSCRIBED') setStatus('on');
        else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') setStatus('err', '实时通道异常');
      });
    } catch (e) {
      console.warn('[sync] 订阅失败', e);
      setStatus('err', e);
    }
  }

  function resubscribe() { subscribe(); }

  /* ---------------- 启动 ---------------- */
  function init() {
    loadQueue();
    Store.onSync(enqueue);
    if (!ENABLED) {
      setStatus('off');
      console.info('[日迹] 未配置云端，运行在纯本地模式。');
      return;
    }
    setStatus('idle');
    pull(true).then(function (r) {
      if (r.ok) { subscribe(); flush(); }
      else { setStatus('err', r.reason); }
    });
    window.addEventListener('online', function () { flush(); pull(true); });
  }

  function info() {
    return {
      enabled: ENABLED, status: status, error: lastError,
      pending: queue.length, lastSyncAt: lastSyncAt,
      url: URL ? URL.replace(/^https?:\/\//, '') : '', workspace: ws()
    };
  }

  return { init, pull, pushAll, flush, onStatus, info, resubscribe, pendingCount, ENABLED };
})();

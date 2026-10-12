/* ============================================================
 * 灵感匣 (Linggan Xia) · 主逻辑
 * 纯前端 PWA + Supabase 云同步
 * ============================================================ */
(function () {
  "use strict";

  const DEFAULT_CATS = ["创业", "副业", "写作", "其他"];
  const STATUS_LABEL = { idea: "想法", doing: "进行中", done: "已落地", archived: "归档" };
  const SRC_LABEL = { wechat: "微信", xiaohongshu: "小红书", web: "网页", manual: "手动", other: "其他" };

  const State = {
    sb: null,
    user: null,
    ideas: [],
    view: "all",          // all | starred | cat:<name> | status:<name>
    search: "",
    pendingClip: null,
    authMode: "signin",   // signin | signup
    rtChannel: null,
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  /* ---------------- 配置 ---------------- */
  function loadConfig() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem("linggan_config") || "null"); } catch (e) {}
    const base = (window.LINGGAN_CONFIG && window.LINGGAN_CONFIG.SUPABASE_URL) ? window.LINGGAN_CONFIG : {};
    return {
      url: (saved && saved.SUPABASE_URL) || base.SUPABASE_URL || "",
      key: (saved && saved.SUPABASE_ANON_KEY) || base.SUPABASE_ANON_KEY || "",
    };
  }

  function initClient() {
    const cfg = loadConfig();
    if (!cfg.url || !cfg.key) {
      // 未配置：进设置页
      showApp(false);
      openSettings(true);
      toast("请先在「设置」填写 Supabase 地址和密钥");
      return;
    }
    State.sb = window.supabase.createClient(cfg.url, cfg.key, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
    bindAuth();
  }

  /* ---------------- 鉴权 ---------------- */
  function bindAuth() {
    State.sb.auth.onAuthStateChange((_event, session) => {
      if (session && session.user) {
        State.user = session.user;
        onSignedIn();
      } else {
        State.user = null;
        showApp(false);
      }
    });
    // 立即检查已有会话
    State.sb.auth.getSession().then(({ data }) => {
      if (data.session && data.session.user) {
        State.user = data.session.user;
        onSignedIn();
      } else {
        showApp(false);
      }
    });
  }

  function onSignedIn() {
    showApp(true);
    loadIdeas();
    setupRealtime();
    applyPendingClip();
  }

  async function doAuth(e) {
    e.preventDefault();
    const errBox = $("#auth-error");
    errBox.hidden = true;
    if (!State.sb) {
      errBox.textContent = "还没有连接 Supabase：请先在「设置」填写 Project URL 和 Anon Key（Supabase 后台 → Project Settings → API 里复制）。";
      errBox.hidden = false;
      openSettings(false);
      return;
    }
    const email = $("#auth-email").value.trim();
    const password = $("#auth-password").value;
    const btn = $("#auth-submit");
    btn.disabled = true;
    try {
      if (State.authMode === "signup") {
        const { data, error } = await State.sb.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          // 直接登录（后台若关闭了邮箱验证）
          toast("注册成功，已自动登录");
        } else {
          toast("注册成功，请查收验证邮件后登录");
          setAuthMode("signin");
        }
      } else {
        const { error } = await State.sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast("登录成功");
      }
    } catch (err) {
      errBox.textContent = err.message || String(err);
      errBox.hidden = false;
    } finally {
      btn.disabled = false;
    }
  }

  function setAuthMode(mode) {
    State.authMode = mode;
    $("#auth-mode-text").textContent = mode === "signup" ? "已经有账号了？" : "还没有账号？";
    $("#auth-toggle").textContent = mode === "signup" ? "去登录" : "注册一个";
    $("#auth-submit").textContent = mode === "signup" ? "注册" : "登录";
    $("#auth-password").setAttribute("autocomplete", mode === "signup" ? "new-password" : "current-password");
  }

  async function logout() {
    await State.sb.auth.signOut();
    if (State.rtChannel) { State.sb.removeChannel(State.rtChannel); State.rtChannel = null; }
    State.ideas = [];
    showApp(false);
    toast("已退出登录");
  }

  /* ---------------- 数据 ---------------- */
  async function loadIdeas() {
    const { data, error } = await State.sb
      .from("ideas")
      .select("*")
      .eq("user_id", State.user.id)
      .order("created_at", { ascending: false });
    if (error) {
      if (/Could not find the table|does not exist|schema cache/i.test(error.message)) {
        toast("数据库还没建表：请到 Supabase 后台 SQL Editor 运行项目里的 schema.sql");
      } else {
        toast("加载失败：" + error.message);
      }
      return;
    }
    State.ideas = data || [];
    renderAll();
  }

  function setupRealtime() {
    if (State.rtChannel) State.sb.removeChannel(State.rtChannel);
    State.rtChannel = State.sb
      .channel("ideas-rt")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "ideas", filter: `user_id=eq.${State.user.id}` },
        () => loadIdeas())
      .subscribe();
  }

  async function saveIdea(e) {
    e.preventDefault();
    const id = $("#idea-id").value || null;
    const payload = {
      title: $("#f-title").value.trim(),
      content: $("#f-content").value.trim(),
      source_url: $("#f-url").value.trim() || null,
      source_type: $("#f-source").value,
      category: $("#f-category").value.trim() || "其他",
      status: $("#f-status").value,
      tags: $("#f-tags").value.split(/[,，、]/).map((s) => s.trim()).filter(Boolean),
    };
    let error;
    if (id) {
      const r = await State.sb.from("ideas").update(payload).eq("id", id).eq("user_id", State.user.id);
      error = r.error;
    } else {
      const r = await State.sb.from("ideas").insert({ ...payload, user_id: State.user.id });
      error = r.error;
    }
    if (error) { toast("保存失败：" + error.message); return; }
    closeModal("modal-idea");
    toast(id ? "已更新" : "已保存");
    // 实时订阅会刷新；兜底也刷一次
    loadIdeas();
  }

  async function deleteIdea(id) {
    if (!confirm("确定删除这条想法？")) return;
    const { error } = await State.sb.from("ideas").delete().eq("id", id).eq("user_id", State.user.id);
    if (error) { toast("删除失败：" + error.message); return; }
    closeModal("modal-idea");
    toast("已删除");
    loadIdeas();
  }

  async function toggleStar(idea) {
    const { error } = await State.sb
      .from("ideas").update({ starred: !idea.starred }).eq("id", idea.id).eq("user_id", State.user.id);
    if (error) { toast("操作失败：" + error.message); return; }
    loadIdeas();
  }

  /* ---------------- 渲染 ---------------- */
  function showApp(show) {
    $("#app-screen").hidden = !show;
    $("#auth-screen").hidden = show;
  }

  function categoriesWithCounts() {
    const map = {};
    DEFAULT_CATS.forEach((c) => (map[c] = 0));
    State.ideas.forEach((it) => {
      const c = it.category || "其他";
      map[c] = (map[c] || 0) + 1;
    });
    return Object.keys(map).map((c) => ({ name: c, count: map[c] }));
  }

  function statusWithCounts() {
    return Object.keys(STATUS_LABEL).map((k) => ({
      key: k,
      label: STATUS_LABEL[k],
      count: State.ideas.filter((it) => (it.status || "idea") === k).length,
    }));
  }

  function renderSidebar() {
    // 分类
    const catNav = $("#nav-categories");
    catNav.innerHTML = "";
    categoriesWithCounts().forEach((c) => {
      const b = document.createElement("button");
      b.className = "nav-item" + (State.view === "cat:" + c.name ? " active" : "");
      b.innerHTML = `<span>${escapeHtml(c.name)}</span><span class="nav-count">${c.count}</span>`;
      b.onclick = () => setView("cat:" + c.name);
      catNav.appendChild(b);
    });
    // 状态
    const stNav = $("#nav-status");
    stNav.innerHTML = "";
    statusWithCounts().forEach((s) => {
      const b = document.createElement("button");
      b.className = "nav-item" + (State.view === "status:" + s.key ? " active" : "");
      b.innerHTML = `<span>${s.label}</span><span class="nav-count">${s.count}</span>`;
      b.onclick = () => setView("status:" + s.key);
      stNav.appendChild(b);
    });
    // 静态项高亮
    $$("#nav-static .nav-item").forEach((b) => {
      const v = b.dataset.view;
      b.classList.toggle("active", (v === "all" && State.view === "all") || (v === "starred" && State.view === "starred"));
    });
    // 底部导航高亮
    $$(".bottom-nav .bn-item").forEach((b) => {
      const v = b.dataset.view;
      const active = (v === "all" && State.view === "all") ||
        (v === "starred" && State.view === "starred") ||
        (v === "stats" && State.view === "stats") ||
        (v === "help" && State.view === "help") ||
        (v === "settings" && State.view === "settings");
      b.classList.toggle("active", active);
    });
  }

  function filtered() {
    let list = State.ideas.slice();
    if (State.view.startsWith("cat:")) {
      const name = State.view.slice(4);
      list = list.filter((it) => (it.category || "其他") === name);
    } else if (State.view.startsWith("status:")) {
      const k = State.view.slice(7);
      list = list.filter((it) => (it.status || "idea") === k);
    } else if (State.view === "starred") {
      list = list.filter((it) => it.starred);
    }
    const q = State.search.trim().toLowerCase();
    if (q) {
      list = list.filter((it) => {
        const hay = [it.title, it.content, (it.tags || []).join(" "), it.source_url || ""]
          .join(" ").toLowerCase();
        return hay.includes(q);
      });
    }
    return list;
  }

  function titleOf(it) {
    if (it.title) return it.title;
    const firstLine = (it.content || "").split("\n")[0].trim();
    return firstLine || "(无标题)";
  }

  function renderList() {
    const list = filtered();
    const wrap = $("#list");
    const empty = $("#empty");
    $("#list-meta").textContent = `${list.length} 条 · 共 ${State.ideas.length} 条`;
    if (list.length === 0) {
      wrap.innerHTML = "";
      empty.hidden = State.ideas.length === 0 ? false : true;
      if (State.ideas.length === 0) empty.querySelector("p").textContent = "这里还空空如也。";
      else empty.querySelector("p").textContent = "没有符合条件的内容。";
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    wrap.innerHTML = "";
    list.forEach((it) => {
      const card = document.createElement("div");
      card.className = "card";
      const tags = (it.tags || []).map((t) => `<span class="chip tag">#${escapeHtml(t)}</span>`).join("");
      const cat = `<span class="chip cat">${escapeHtml(it.category || "其他")}</span>`;
      const status = `<span class="chip status">${STATUS_LABEL[it.status] || "想法"}</span>`;
      const src = it.source_type && it.source_type !== "manual"
        ? `<span class="chip src">${SRC_LABEL[it.source_type] || it.source_type}</span>` : "";
      const link = it.source_url
        ? `<a class="card-link" href="${escapeAttr(it.source_url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">🔗 来源</a>` : "";
      const time = fmtTime(it.created_at);
      card.innerHTML = `
        <div class="card-top">
          <div class="card-title">${escapeHtml(titleOf(it))}</div>
          <button class="card-star" title="星标">${it.starred ? "⭐" : "☆"}</button>
        </div>
        ${it.content ? `<div class="card-content">${escapeHtml(it.content)}</div>` : ""}
        <div class="card-meta">
          ${cat}${status}${src}${tags}${link}
          <span class="card-time">${time}</span>
        </div>
        <div class="card-actions">
          <button class="btn" data-act="edit">编辑</button>
          <button class="btn btn-danger" data-act="del">删除</button>
        </div>`;
      card.querySelector(".card-star").onclick = (e) => { e.stopPropagation(); toggleStar(it); };
      card.querySelector('[data-act="edit"]').onclick = (e) => { e.stopPropagation(); openIdeaModal(it); };
      card.querySelector('[data-act="del"]').onclick = (e) => { e.stopPropagation(); deleteIdea(it.id); };
      card.onclick = () => openIdeaModal(it);
      wrap.appendChild(card);
    });
  }

  function renderAll() {
    renderSidebar();
    renderList();
    // 更新标题
    let t = "全部想法";
    if (State.view === "starred") t = "星标";
    else if (State.view.startsWith("cat:")) t = State.view.slice(4);
    else if (State.view.startsWith("status:")) t = STATUS_LABEL[State.view.slice(7)] || "想法";
    $("#topbar-title").textContent = t;
    // 分类 datalist
    const dl = $("#cat-list");
    if (dl) dl.innerHTML = categoriesWithCounts().map((c) => `<option value="${escapeAttr(c.name)}">`).join("");
  }

  /* ---------------- 视图切换 ---------------- */
  function setView(v) {
    State.view = v;
    renderAll();
    // 移动端切换视图后滚动到顶部
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------------- 想法弹窗 ---------------- */
  function openIdeaModal(idea) {
    $("#idea-modal-title").textContent = idea ? "编辑想法" : "新建想法";
    $("#idea-id").value = idea ? idea.id : "";
    $("#f-title").value = idea ? idea.title || "" : "";
    $("#f-content").value = idea ? idea.content || "" : "";
    $("#f-url").value = idea ? idea.source_url || "" : "";
    $("#f-source").value = idea ? (idea.source_type || "manual") : "manual";
    $("#f-category").value = idea ? (idea.category || "其他") : "";
    $("#f-status").value = idea ? (idea.status || "idea") : "idea";
    $("#f-tags").value = idea ? (idea.tags || []).join(", ") : "";
    $("#idea-delete").hidden = !idea;
    if (idea) $("#idea-delete").onclick = () => deleteIdea(idea.id);
    openModal("modal-idea");
    setTimeout(() => $("#f-title").focus(), 50);
  }

  /* ---------------- 剪藏 (URL 参数) ---------------- */
  function readClipParams() {
    const p = new URLSearchParams(location.search);
    if (p.get("clip") === "1") {
      State.pendingClip = {
        title: p.get("title") || "",
        url: p.get("url") || "",
        text: p.get("text") || "",
        category: p.get("category") || "",
        source: p.get("source") || "",
      };
      // 清理 URL，避免刷新重复弹窗
      history.replaceState(null, "", location.pathname);
    }
  }

  function applyPendingClip() {
    if (!State.pendingClip) return;
    const c = State.pendingClip;
    State.pendingClip = null;
    const content = [c.text || "", c.url ? "\n来源：" + c.url : ""].join("").trim();
    const sourceType = c.source || (
      c.url && c.url.includes("xiaohongshu") ? "xiaohongshu"
        : c.url && c.url.includes("weixin") ? "wechat" : (c.url ? "web" : "manual")
    );
    openIdeaModal({
      title: c.title || "",
      content: content,
      source_url: c.url || "",
      source_type: sourceType,
      category: c.category || "",
      status: "idea",
      tags: [],
    });
    toast("已从网页剪藏，确认后保存");
  }

  /* ---------------- 设置 ---------------- */
  function openSettings(force) {
    const cfg = loadConfig();
    const body = $("#settings-body");
    const email = State.user ? State.user.email : "（未登录）";
    body.innerHTML = `
      <div class="set-row">
        <h3>账号</h3>
        <p>当前登录：<b>${escapeHtml(email)}</b></p>
        ${State.user ? `<button class="btn btn-danger" id="set-logout">退出登录</button>` : ""}
      </div>
      <div class="set-row">
        <h3>Supabase 连接</h3>
        <p>把你的 Supabase 项目 URL 和 anon key 填到下面（也可直接改 config.js）。保存后会自动刷新。</p>
        <label>Project URL
          <input id="set-url" type="text" placeholder="https://xxxx.supabase.co" value="${escapeAttr(cfg.url)}" />
        </label>
        <label>Anon Key (public)
          <input id="set-key" type="text" placeholder="eyJhbGci..." value="${escapeAttr(cfg.key)}" />
        </label>
        <button class="btn btn-primary" id="set-save">保存连接</button>
      </div>
      <div class="set-row">
        <h3>数据</h3>
        <p>把全部想法导出为 JSON 备份。</p>
        <button class="btn" id="set-export">导出 JSON</button>
      </div>
      <div class="set-row">
        <h3>数据库初始化</h3>
        <p>首次使用请到 Supabase 后台 SQL Editor 执行项目里的 <span class="kbd">schema.sql</span>（新建 ideas 表 + 权限）。</p>
      </div>`;
    if (State.user) $("#set-logout").onclick = logout;
    $("#set-save").onclick = () => {
      const url = $("#set-url").value.trim();
      const key = $("#set-key").value.trim();
      localStorage.setItem("linggan_config", JSON.stringify({ SUPABASE_URL: url, SUPABASE_ANON_KEY: key }));
      toast("已保存，正在刷新…");
      setTimeout(() => location.reload(), 600);
    };
    $("#set-export").onclick = exportJSON;
    openModal("modal-settings");
  }

  function exportJSON() {
    const data = JSON.stringify(State.ideas, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "灵感匣备份_" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    toast("已导出 " + State.ideas.length + " 条");
  }

  /* ---------------- 剪藏工具 / 帮助 ---------------- */
  function openHelp() {
    const appUrl = location.origin + location.pathname;
    const bmCode =
      "javascript:(function(){var t=encodeURIComponent(document.title);" +
      "var u=encodeURIComponent(location.href);" +
      "var s=encodeURIComponent((window.getSelection&&window.getSelection().toString())||'');" +
      "var app=" + JSON.stringify(appUrl) + ";" +
      "window.open(app+'?clip=1&title='+t+'&url='+u+'&text='+s,'_blank');})();";
    const body = $("#help-body");
    body.innerHTML = `
      <div class="set-row">
        <h3>① 书签剪藏（最简单，全平台）</h3>
        <p>把下面的按钮拖到浏览器书签栏。以后在任意网页点它，就会自动抓取标题/链接/选中文字并跳到灵感匣保存。</p>
        <a class="bookmarklet" href="${escapeAttr(bmCode)}">📌 拖我到书签栏：剪藏到灵感匣</a>
        <p>若拖不动，复制下面代码，新建书签并把网址粘贴为这段代码：</p>
        <div class="code-block" id="bm-code"></div>
      </div>
      <div class="set-row">
        <h3>② 浏览器插件（桌面 Chrome 增强版）</h3>
        <p>项目里的 <span class="kbd">extension/</span> 文件夹是一个 Manifest V3 插件：点工具栏图标即可把当前网页剪藏到灵感匣（比书签多一个弹窗预览）。</p>
        <p>安装：Chrome 打开 <span class="kbd">chrome://extensions</span> → 开启「开发者模式」→ 「加载已解压的扩展程序」→ 选择 extension 文件夹。首次使用在弹窗里填一下灵感匣地址（就是本页地址）。</p>
      </div>
      <div class="set-row">
        <h3>③ 手机分享后粘贴</h3>
        <p>在微信/小红书复制文字或链接，打开灵感匣点「＋ 新建想法」，直接粘贴进去即可。来源下拉选「微信 / 小红书」方便归类。</p>
      </div>`;
    const bmEl = document.getElementById("bm-code");
    if (bmEl) bmEl.textContent = bmCode;
    openModal("modal-help");
  }

  /* ---------------- 统计 ---------------- */
  function openStats() {
    const total = State.ideas.length;
    const starred = State.ideas.filter((it) => it.starred).length;
    const thisMonth = State.ideas.filter((it) => {
      const d = new Date(it.created_at);
      const n = new Date();
      return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
    }).length;
    const byCat = categoriesWithCounts().filter((c) => c.count > 0);
    const body = $("#stats-body");
    body.innerHTML = `
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-num">${total}</div><div class="stat-lbl">总计</div></div>
        <div class="stat-card"><div class="stat-num">${starred}</div><div class="stat-lbl">星标</div></div>
        <div class="stat-card"><div class="stat-num">${thisMonth}</div><div class="stat-lbl">本月新增</div></div>
      </div>
      <h3 style="font-size:14px;margin:6px 0">按分类</h3>
      <div class="stat-list">
        ${byCat.map((c) => `<div><span>${escapeHtml(c.name)}</span><b>${c.count}</b></div>`).join("") || "<div>暂无数据</div>"}
      </div>`;
    openModal("modal-stats");
  }

  /* ---------------- 弹窗通用 ---------------- */
  function openModal(id) {
    const sel = id.startsWith("#") ? id : "#" + id;
    // 一次只开一个弹窗，避免叠层
    $$(".modal").forEach((m) => { if ("#" + m.id !== sel) m.hidden = true; });
    $(sel).hidden = false;
  }
  function closeModal(id) {
    const sel = id.startsWith("#") ? id : "#" + id;
    $(sel).hidden = true;
  }

  /* ---------------- 工具 ---------------- */
  let toastTimer = null;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 2200);
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function escapeAttr(s) { return escapeHtml(s); }
  function fmtTime(iso) {
    const d = new Date(iso);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return "刚刚";
    if (diff < 3600) return Math.floor(diff / 60) + " 分钟前";
    if (diff < 86400) return Math.floor(diff / 3600) + " 小时前";
    if (diff < 86400 * 7) return Math.floor(diff / 86400) + " 天前";
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  /* ---------------- 事件绑定 ---------------- */
  function bindEvents() {
    $("#auth-form").addEventListener("submit", doAuth);
    $("#auth-toggle").addEventListener("click", (e) => {
      e.preventDefault();
      setAuthMode(State.authMode === "signin" ? "signup" : "signin");
    });

    $("#btn-new").addEventListener("click", () => openIdeaModal(null));
    $("#btn-empty-new").addEventListener("click", () => openIdeaModal(null));
    $("#btn-user").addEventListener("click", () => openSettings(false));
    $("#idea-form").addEventListener("submit", saveIdea);

    $("#search").addEventListener("input", (e) => {
      State.search = e.target.value;
      renderList();
    });

    // 导航（静态 + 底部 + 侧边栏操作项）
    $$("#nav-static .nav-item, .bottom-nav .bn-item, .nav-action").forEach((b) => {
      b.addEventListener("click", () => {
        const v = b.dataset.view;
        if (v === "stats") { openStats(); return; }
        if (v === "help") { openHelp(); return; }
        if (v === "settings") { openSettings(false); return; }
        setView(v);
      });
    });

    // 关闭弹窗
    $$("[data-close]").forEach((b) => {
      b.addEventListener("click", () => closeModal(b.dataset.close));
    });
    $$(".modal").forEach((m) => {
      m.addEventListener("click", (e) => { if (e.target === m) m.hidden = true; });
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") $$(".modal").forEach((m) => (m.hidden = true)); });
  }

  /* ---------------- 启动 ---------------- */
  function start() {
    bindEvents();
    readClipParams();
    if (!window.supabase) {
      toast("Supabase 脚本未加载，请检查 vendor/supabase.js");
      return;
    }
    initClient();
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
  }

  document.addEventListener("DOMContentLoaded", start);
})();

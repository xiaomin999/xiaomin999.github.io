/* 需求挖掘工作台 v1 —— 纯前端 localStorage */
(function () {
  "use strict";

  var LS_KEY = "demand_miner_v1";

  /* ---------- 状态 ---------- */
  var state = load();
  var currentFilter = "全部";
  var currentProjectId = state.projects.length ? state.projects[0].id : null;

  function blankState() {
    return { projects: [], reportByProject: {} };
  }
  function load() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && Array.isArray(s.projects)) return s;
      }
    } catch (e) {}
    return blankState();
  }
  function save() {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }

  function getProject(id) {
    for (var i = 0; i < state.projects.length; i++) {
      if (state.projects[i].id === id) return state.projects[i];
    }
    return null;
  }
  function cur() { return getProject(currentProjectId); }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function nowStr() {
    var d = new Date();
    function p(n) { return n < 10 ? "0" + n : n; }
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function norm(s) {
    return String(s || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  var SOURCES = ["搜索下拉词", "笔记/评论区", "知乎/问答", "差评", "其他"];

  /* ---------- 通用对话框（替代原生 prompt/confirm，预览沙箱兼容） ---------- */
  var dialogModal = document.getElementById("dialogModal");
  var dialogTitle = document.getElementById("dialogTitle");
  var dialogMsg = document.getElementById("dialogMsg");
  var dialogInput = document.getElementById("dialogInput");
  var dialogOk = document.getElementById("dialogOk");
  var dialogCancel = document.getElementById("dialogCancel");
  var dialogCallback = null;

  function openDialog(opts, cb) {
    dialogTitle.textContent = opts.title || "";
    if (opts.message) {
      dialogMsg.textContent = opts.message;
      dialogMsg.style.display = "block";
    } else {
      dialogMsg.style.display = "none";
    }
    if (opts.needInput) {
      dialogInput.style.display = "block";
      dialogInput.value = opts.defaultValue || "";
    } else {
      dialogInput.style.display = "none";
    }
    dialogCallback = cb;
    dialogModal.style.display = "flex";
    if (opts.needInput) {
      setTimeout(function () { dialogInput.focus(); dialogInput.select(); }, 30);
    }
  }
  function closeDialog() {
    dialogModal.style.display = "none";
    dialogCallback = null;
  }
  function dialogConfirm() {
    var cb = dialogCallback;
    var val = dialogInput.value.trim();
    closeDialog();
    if (cb) cb(val);
  }
  dialogOk.addEventListener("click", dialogConfirm);
  dialogCancel.addEventListener("click", closeDialog);
  dialogModal.addEventListener("click", function (e) {
    if (e.target === dialogModal) closeDialog();
  });
  dialogModal.addEventListener("keydown", function (e) {
    if (e.key === "Enter") dialogConfirm();
    if (e.key === "Escape") closeDialog();
  });
  function showPrompt(title, defaultValue, cb) {
    openDialog({ title: title, needInput: true, defaultValue: defaultValue }, cb);
  }
  function showConfirm(message, cb) {
    openDialog({ title: "请确认", message: message, needInput: false }, function () { cb(true); });
  }

  /* ---------- Toast ---------- */
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 1800);
  }

  /* ---------- 项目 ---------- */
  var projectSelect = document.getElementById("projectSelect");

  function renderProjects() {
    projectSelect.innerHTML = "";
    state.projects.forEach(function (p) {
      var opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = p.name;
      if (p.id === currentProjectId) opt.selected = true;
      projectSelect.appendChild(opt);
    });
  }

  function ensureProject() {
    if (cur()) return;
    if (!state.projects.length) {
      var p = { id: uid(), name: "新行业调研", createdAt: nowStr(), items: [] };
      state.projects.push(p);
      currentProjectId = p.id;
      save();
    }
  }

  projectSelect.addEventListener("change", function () {
    currentProjectId = this.value;
    currentFilter = "全部";
    renderAll();
  });

  document.getElementById("btnNewProject").addEventListener("click", function () {
    showPrompt("新项目名称（行业/主题，如：全屋定制）：", "", function (name) {
      if (!name) return;
      var p = { id: uid(), name: name, createdAt: nowStr(), items: [] };
      state.projects.push(p);
      currentProjectId = p.id;
      save(); renderAll();
      toast("已创建：" + p.name);
    });
  });

  document.getElementById("btnRenameProject").addEventListener("click", function () {
    var p = cur(); if (!p) return;
    showPrompt("重命名为：", p.name, function (name) {
      if (!name) return;
      p.name = name;
      save(); renderProjects();
    });
  });

  document.getElementById("btnDelProject").addEventListener("click", function () {
    var p = cur(); if (!p) return;
    showConfirm("确定删除项目「" + p.name + "」及其全部 " + p.items.length + " 条数据？此操作不可恢复。", function () {
      state.projects = state.projects.filter(function (x) { return x.id !== p.id; });
      delete state.reportByProject[p.id];
      currentProjectId = state.projects.length ? state.projects[0].id : null;
      ensureProject();
      save(); renderAll();
      toast("已删除");
    });
  });

  /* ---------- 收集 ---------- */
  var sourceSelect = document.getElementById("sourceSelect");
  var withTime = document.getElementById("withTime");
  var batchInput = document.getElementById("batchInput");
  var singleInput = document.getElementById("singleInput");

  function addItem(text, source, time) {
    text = String(text || "").trim();
    if (!text) return false;
    var p = cur(); if (!p) return false;
    if (document.getElementById("autoDedup").checked) {
      var dup = p.items.some(function (it) { return norm(it.text) === norm(text); });
      if (dup) return false;
    }
    p.items.push({ id: uid(), text: text, source: source || "其他", time: time || nowStr() });
    return true;
  }

  document.getElementById("btnAddBatch").addEventListener("click", function () {
    var lines = batchInput.value.split(/\n+/);
    var added = 0, skipped = 0;
    var src = sourceSelect.value;
    var t = withTime.checked ? nowStr() : "";
    lines.forEach(function (l) {
      if (!l.trim()) return;
      if (addItem(l, src, t)) added++; else skipped++;
    });
    batchInput.value = "";
    save(); renderPool(); renderCollectStat();
    toast(added ? "已加入 " + added + " 条" + (skipped ? "，去重跳过 " + skipped + " 条" : "") : "没有新增（可能全部重复）");
  });

  function addSingle() {
    var t = withTime.checked ? nowStr() : "";
    if (addItem(singleInput.value, sourceSelect.value, t)) {
      singleInput.value = "";
      save(); renderPool(); renderCollectStat();
    } else {
      toast("内容为空或已存在");
    }
  }
  document.getElementById("btnAddSingle").addEventListener("click", addSingle);
  singleInput.addEventListener("keydown", function (e) { if (e.key === "Enter") addSingle(); });

  function renderCollectStat() {
    var p = cur();
    document.getElementById("collectStat").textContent =
      p && p.items.length ? "数据池现有 " + p.items.length + " 条" : "";
  }

  /* ---------- 数据池 ---------- */
  var itemList = document.getElementById("itemList");
  var sourceFilter = document.getElementById("sourceFilter");

  function renderFilter() {
    var p = cur();
    var counts = {};
    SOURCES.forEach(function (s) { counts[s] = 0; });
    if (p) p.items.forEach(function (it) { counts[it.source] = (counts[it.source] || 0) + 1; });
    var total = p ? p.items.length : 0;

    sourceFilter.innerHTML = "";
    var chips = [["全部", total]].concat(SOURCES.map(function (s) { return [s, counts[s] || 0]; }));
    chips.forEach(function (c) {
      var el = document.createElement("span");
      el.className = "chip" + (currentFilter === c[0] ? " active" : "");
      el.textContent = c[0] + " " + c[1];
      el.addEventListener("click", function () { currentFilter = c[0]; renderPool(); });
      sourceFilter.appendChild(el);
    });
  }

  function renderPool() {
    renderFilter();
    var p = cur();
    var items = p ? p.items.slice().reverse() : [];
    if (currentFilter !== "全部") items = items.filter(function (it) { return it.source === currentFilter; });
    document.getElementById("poolCount").textContent = p ? p.items.length : 0;
    itemList.innerHTML = "";
    if (!items.length) {
      itemList.innerHTML = '<div class="empty-tip">还没有数据，去左栏粘贴客户原话吧</div>';
      return;
    }
    items.forEach(function (it) {
      var row = document.createElement("div");
      row.className = "item";
      row.innerHTML =
        '<div class="item-text">' + esc(it.text) +
        '<div class="item-meta">[' + esc(it.source) + (it.time ? " · " + esc(it.time) : "") + "]</div></div>" +
        '<button class="item-del" title="删除">×</button>';
      row.querySelector(".item-del").addEventListener("click", function () {
        var pp = cur();
        pp.items = pp.items.filter(function (x) { return x.id !== it.id; });
        save(); renderPool(); renderCollectStat();
      });
      itemList.appendChild(row);
    });
  }

  /* ---------- 导出分析包 ---------- */
  var exportModal = document.getElementById("exportModal");
  var exportText = document.getElementById("exportText");

  function buildExport() {
    var p = cur();
    if (!p || !p.items.length) { toast("数据池是空的，先去收集吧"); return null; }
    var counts = {};
    p.items.forEach(function (it) { counts[it.source] = (counts[it.source] || 0) + 1; });
    var srcLine = SOURCES.filter(function (s) { return counts[s]; })
      .map(function (s) { return s + " " + counts[s] + " 条"; }).join("，");

    var lines = [];
    lines.push("请按下面这套「用户需求挖掘」流程，分析我收集的「" + p.name + "」行业客户原话数据。");
    lines.push("");
    lines.push("分析要求：");
    lines.push("1. 数据清洗：合并去重，剔除与我目标客户无关的同行/噪音词，给出保留量与剔除量统计（像洗数据漏斗那样报告：合并去重 → 剔除 → 边缘待定 → 靶心库）。");
    lines.push("2. 痛点归类：把靶心词按主题归类（可用 5W1H），标出哪一堆最大、哪一堆负面情绪最重。");
    lines.push("3. 真需求判断：把「嘴上说的痛点」和「实际付费解决的问题」放一起对比，指出对不上的地方，告诉我他们真正在买的是什么。注意区分搜索侧（他们只在搜索框打的词）与评论侧（他们在评论区说的话）两类来源的证据。");
    lines.push("4. 钱在哪：回答三个问题——谁在为这个需求付费、付多少（找投流/报价/充值类词佐证付费能力）；现在别人怎么解决这个需求、哪里没做好；剩下的缺口普通人能不能做。");
    lines.push("5. 输出格式：Markdown 报告，所有结论必须标注来源（引用原话，注明 [来源类型]），不同来源有分歧就两边都列出来，证据不足的结论标注「推测」，不要强行下结论。");
    lines.push("");
    lines.push("数据概况：共 " + p.items.length + " 条（" + srcLine + "）");
    lines.push("数据明细（每条一行，格式：[来源|时间] 原话）：");
    lines.push("");
    p.items.forEach(function (it) {
      lines.push("[" + it.source + "|" + (it.time || "无日期") + "] " + it.text);
    });
    return lines.join("\n");
  }

  document.getElementById("btnExport").addEventListener("click", function () {
    var text = buildExport();
    if (!text) return;
    exportText.value = text;
    var p = cur();
    document.getElementById("exportStat").textContent =
      "「" + p.name + "」共 " + p.items.length + " 条，约 " + text.length + " 字";
    exportModal.style.display = "flex";
  });
  document.getElementById("btnCloseExport").addEventListener("click", function () {
    exportModal.style.display = "none";
  });
  exportModal.addEventListener("click", function (e) {
    if (e.target === exportModal) exportModal.style.display = "none";
  });

  function copyText(text, okMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast(okMsg); }, function () { fallbackCopy(text, okMsg); });
    } else {
      fallbackCopy(text, okMsg);
    }
  }
  function fallbackCopy(text, okMsg) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); toast(okMsg); } catch (e) { toast("复制失败，请手动全选复制"); }
    document.body.removeChild(ta);
  }

  document.getElementById("btnCopyExport").addEventListener("click", function () {
    copyText(exportText.value, "已复制，去 WorkBuddy 粘贴吧");
  });
  document.getElementById("btnCopyPrompt").addEventListener("click", function () {
    var text = buildExport();
    if (!text) return;
    copyText(text, "已复制分析包");
  });

  /* ---------- 报告 ---------- */
  var reportInput = document.getElementById("reportInput");
  var reportView = document.getElementById("reportView");
  var reportEmpty = document.getElementById("reportEmpty");

  function renderReport() {
    var p = cur();
    var md = p ? (state.reportByProject[p.id] || "") : "";
    reportInput.value = md;
    if (!md) {
      reportEmpty.style.display = "block";
      reportInput.style.display = "none";
      reportView.style.display = "none";
      reportView.innerHTML = "";
      return;
    }
    reportEmpty.style.display = "none";
    reportInput.style.display = "none";
    reportView.style.display = "block";
    reportView.innerHTML = renderMarkdown(md);
  }

  /* 轻量 Markdown 渲染：标题/粗体/列表/表格/引用/分隔线/代码 */
  function inlineFmt(s) {
    return esc(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");
  }
  function renderMarkdown(md) {
    var lines = md.split(/\r?\n/);
    var html = [], i = 0, inList = false, listTag = "ul";
    function closeList() { if (inList) { html.push("</" + listTag + ">"); inList = false; } }

    for (; i < lines.length; i++) {
      var line = lines[i];
      var t = line.trim();
      if (!t) { closeList(); continue; }
      if (/^(-{3,}|\*{3,})$/.test(t)) { closeList(); html.push("<hr>"); continue; }
      var h = t.match(/^(#{1,4})\s+(.*)/);
      if (h) { closeList(); html.push("<h" + h[1].length + ">" + inlineFmt(h[2]) + "</h" + h[1].length + ">"); continue; }
      if (/^>\s?/.test(t)) {
        closeList();
        var quote = [];
        while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
          quote.push(lines[i].trim().replace(/^>\s?/, "")); i++;
        }
        i--;
        html.push("<blockquote>" + quote.map(inlineFmt).join("<br>") + "</blockquote>");
        continue;
      }
      /* 表格 */
      if (/\|/.test(t) && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1])) {
        closeList();
        function parseRow(row) {
          var cells = row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|");
          return cells.map(function (c) { return c.trim(); });
        }
        var head = parseRow(t);
        i += 2;
        var rows = [];
        while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim()) {
          rows.push(parseRow(lines[i])); i++;
        }
        i--;
        var th = head.map(function (c) { return "<th>" + inlineFmt(c) + "</th>"; }).join("");
        html.push("<table><thead><tr>" + th + "</tr></thead><tbody>");
        rows.forEach(function (r) {
          html.push("<tr>" + r.map(function (c) { return "<td>" + inlineFmt(c) + "</td>"; }).join("") + "</tr>");
        });
        html.push("</tbody></table>");
        continue;
      }
      var ul = t.match(/^[-*]\s+(.*)/);
      var ol = t.match(/^\d+[.、]\s+(.*)/);
      if (ul || ol) {
        var tag = ul ? "ul" : "ol";
        if (!inList || listTag !== tag) { closeList(); html.push("<" + tag + ">"); inList = true; listTag = tag; }
        html.push("<li>" + inlineFmt(ul ? ul[1] : ol[1]) + "</li>");
        continue;
      }
      closeList();
      html.push("<p>" + inlineFmt(t) + "</p>");
    }
    closeList();
    return html.join("\n");
  }

  /* 双击报告区进入编辑 */
  reportView.addEventListener("dblclick", function () {
    reportEmpty.style.display = "none";
    reportInput.style.display = "block";
    reportView.style.display = "none";
    reportInput.focus();
  });
  function commitReport() {
    var p = cur(); if (!p) return;
    state.reportByProject[p.id] = reportInput.value.trim();
    save(); renderReport();
  }
  reportInput.addEventListener("blur", commitReport);
  reportInput.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { reportInput.blur(); }
  });
  document.getElementById("btnClearReport").addEventListener("click", function () {
    var p = cur(); if (!p) return;
    if (!state.reportByProject[p.id]) { toast("当前没有报告"); return; }
    showConfirm("确定清空当前项目的报告？", function () {
      delete state.reportByProject[p.id];
      save(); renderReport();
      toast("报告已清空");
    });
  });

  document.getElementById("autoDedup").addEventListener("change", save);

  /* ---------- 总渲染 ---------- */
  function renderAll() {
    ensureProject();
    renderProjects();
    renderPool();
    renderCollectStat();
    renderReport();
  }
  renderAll();
})();

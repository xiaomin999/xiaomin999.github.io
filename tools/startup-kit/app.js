// ============================================================
// 创业方向合集 · 交互逻辑
// ============================================================
(function () {
  "use strict";

  // ---------- 视图切换 ----------
  const navBtns = document.querySelectorAll(".nav-btn");
  const views = {
    hub: document.getElementById("view-hub"),
    validate: document.getElementById("view-validate"),
    assess: document.getElementById("view-assess"),
    prep: document.getElementById("view-prep"),
    breakeven: document.getElementById("view-breakeven"),
  };
  navBtns.forEach((b) => {
    b.addEventListener("click", () => {
      navBtns.forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      Object.values(views).forEach((v) => v.classList.remove("active"));
      views[b.dataset.view].classList.add("active");
    });
  });

  // 侧边栏折叠
  const sidebar = document.getElementById("sidebar");
  document.getElementById("collapseBtn").addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
  });

  // ---------- 工具 ----------
  const $ = (sel, root) => (root || document).querySelector(sel);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };

  // ---------- 方向合集渲染 ----------
  const filterBar = document.getElementById("filterBar");
  const cardsGrid = document.getElementById("cardsGrid");
  const statsRow = document.getElementById("statsRow");
  let activeCat = "all";

  function buildFilters() {
    const cats = [{ key: "all", name: "全部", emoji: "✦", color: "#2f6bff" }];
    Object.entries(CATEGORIES).forEach(([k, v]) =>
      cats.push({ key: k, name: v.name, emoji: v.emoji, color: v.color })
    );
    cats.forEach((c) => {
      const chip = el("button", "chip" + (c.key === "all" ? " active" : ""), `${c.emoji} ${c.name}`);
      chip.addEventListener("click", () => {
        activeCat = c.key;
        document.querySelectorAll(".chip").forEach((x) => x.classList.remove("active"));
        chip.classList.add("active");
        renderCards();
      });
      filterBar.appendChild(chip);
    });
  }

  function renderStats() {
    statsRow.innerHTML = "";
    const total = STARTUP_DIRS.length;
    const lowCost = STARTUP_DIRS.filter((d) => d.capitalLevel === 1).length;
    const avgPayback = "1–6 月";
    const cats = Object.keys(CATEGORIES).length;
    const data = [
      { num: total, lbl: "个可落地方向" },
      { num: lowCost, lbl: "个极低成本可起步 (¥0–5k)" },
      { num: cats, lbl: "大品类覆盖" },
      { num: avgPayback, lbl: "多数回本周期" },
    ];
    data.forEach((d) => {
      const s = el("div", "stat");
      s.appendChild(el("div", "num", d.num));
      s.appendChild(el("div", "lbl", d.lbl));
      statsRow.appendChild(s);
    });
  }

  function renderCards() {
    cardsGrid.innerHTML = "";
    const list = activeCat === "all"
      ? STARTUP_DIRS
      : STARTUP_DIRS.filter((d) => d.category === activeCat);
    list.forEach((d) => {
      const cat = CATEGORIES[d.category];
      const card = el("div", "card");
      card.style.setProperty("--cat-color", cat.color);

      const head = el("div", "card-head");
      head.appendChild(el("span", "card-emoji", d.emoji));
      head.appendChild(el("span", "card-title", d.name));
      head.appendChild(el("span", "cat-badge", cat.emoji + " " + cat.name));
      head.querySelector(".cat-badge").style.background = cat.color;
      card.appendChild(head);

      card.appendChild(el("div", "card-tagline", d.tagline));

      const mrow = el("div", "metric-row");
      const m = (k, v) => {
        const box = el("div", "metric");
        box.appendChild(el("div", "k", k));
        box.appendChild(el("div", "v", v));
        return box;
      };
      mrow.appendChild(m("启动资金", d.capital));
      mrow.appendChild(m("回本周期", d.payback));
      mrow.appendChild(m("验证难度", "★".repeat(d.difficulty) + "☆".repeat(3 - d.difficulty)));
      card.appendChild(mrow);

      const acts = el("div", "card-actions");
      const b1 = el("button", "btn-ghost", "看详情");
      b1.addEventListener("click", () => openDetail(d));
      const b2 = el("button", "btn-ghost", "生成验证清单");
      b2.addEventListener("click", () => {
        switchView("validate");
        document.getElementById("weekDirSelect").value = d.id;
        genWeek();
      });
      acts.appendChild(b1);
      acts.appendChild(b2);
      card.appendChild(acts);

      cardsGrid.appendChild(card);
    });
  }

  // ---------- 详情抽屉 ----------
  const mask = el("div", "modal-mask");
  document.body.appendChild(mask);
  function openDetail(d) {
    const cat = CATEGORIES[d.category];
    const modal = el("div", "modal");
    let html = `<button class="close-x">✕</button>`;
    html += `<h3>${d.emoji} ${d.name}</h3>`;
    html += `<div class="m-sub">${cat.emoji} ${cat.name} · 启动 ${d.capital} · 回本 ${d.payback} · 难度 ${"★".repeat(d.difficulty)}</div>`;

    html += `<section><h4>💡 为什么现在做</h4><p style="font-size:13.5px;color:var(--ink-soft);line-height:1.55">${d.whyNow}</p></section>`;

    html += `<section><h4>👤 适合谁</h4><ul>`;
    d.fit.forEach((f) => (html += `<li>${f}</li>`));
    html += `</ul></section>`;

    html += `<section><h4>⚡ 最快验证（7–14 天）</h4><ol>`;
    d.validateSteps.forEach((s) => (html += `<li>${s}</li>`));
    html += `</ol></section>`;

    html += `<section><h4>🧰 需要准备</h4><ul>`;
    d.prepare.forEach((p) => (html += `<li>${p}</li>`));
    html += `</ul></section>`;

    html += `<section><h4>🏷️ 关键信号</h4>`;
    d.tags.forEach((t) => (html += `<span class="tag-pill">${TAGS[t]}</span>`));
    html += `</section>`;

    modal.innerHTML = html;
    if (d.category === "store") {
      const beBtn = el("button", "btn-primary", "📊 去盈亏测算");
      beBtn.style.marginTop = "16px";
      beBtn.addEventListener("click", () => {
        mask.classList.remove("open");
        switchView("breakeven");
        setBeDir(d.id);
      });
      modal.appendChild(beBtn);
    }
    mask.innerHTML = "";
    mask.appendChild(modal);
    mask.classList.add("open");
    modal.querySelector(".close-x").addEventListener("click", () => mask.classList.remove("open"));
    mask.addEventListener("click", (e) => { if (e.target === mask) mask.classList.remove("open"); });
  }

  // ---------- 快速验证 ----------
  function renderPlaybook() {
    $("#vpCore").textContent = VALIDATION_PLAYBOOK.core;
    const pl = $("#phaseList");
    pl.innerHTML = "";
    VALIDATION_PLAYBOOK.phases.forEach((p) => {
      const box = el("div", "phase");
      const head = el("div", "p-head");
      head.appendChild(el("span", "p-name", p.phase));
      head.appendChild(el("span", "p-days", p.days));
      box.appendChild(head);
      box.appendChild(el("div", "p-goal", "目标：" + p.goal));
      const ol = el("ol");
      p.steps.forEach((s) => ol.appendChild(el("li", null, s)));
      box.appendChild(ol);
      pl.appendChild(box);
    });

    // 7天清单选择器
    const sel = $("#weekDirSelect");
    sel.innerHTML = "";
    STARTUP_DIRS.forEach((d) => {
      const o = el("option", null, d.name);
      o.value = d.id;
      sel.appendChild(o);
    });
  }

  function genWeek() {
    const id = $("#weekDirSelect").value;
    const d = STARTUP_DIRS.find((x) => x.id === id);
    const list = $("#weekPlanList");
    list.innerHTML = "";
    list.classList.add("highlight");
    VALIDATION_PLAYBOOK.weekPlan.forEach((w) => list.appendChild(el("li", null, w)));
    // 把该方向的具体步骤作为补充提示追加
    d.validateSteps.forEach((s, i) =>
      list.appendChild(el("li", null, `· 该方向专用：第 ${i + 1} 步 → ${s}`))
    );
  }
  $("#genWeekBtn").addEventListener("click", genWeek);

  function switchView(v) {
    navBtns.forEach((x) => x.classList.toggle("active", x.dataset.view === v));
    Object.values(views).forEach((vv) => vv.classList.remove("active"));
    views[v].classList.add("active");
  }

  // ---------- 自我评估 ----------
  const quizState = {}; // qIndex -> optionIndex
  function renderQuiz() {
    const box = $("#quizBox");
    box.innerHTML = "";
    QUIZ.forEach((q, qi) => {
      const qEl = el("div", "quiz-q");
      qEl.appendChild(el("div", "qq-title", `${qi + 1}. ${q.q}`));
      const opts = el("div", "quiz-opts");
      q.options.forEach((o, oi) => {
        const b = el("button", "quiz-opt", o.label);
        b.addEventListener("click", () => {
          quizState[qi] = oi;
          opts.querySelectorAll(".quiz-opt").forEach((x) => x.classList.remove("picked"));
          b.classList.add("picked");
          updateQuizProgress();
        });
        opts.appendChild(b);
      });
      qEl.appendChild(opts);
      box.appendChild(qEl);
    });
    updateQuizProgress();
  }

  function updateQuizProgress() {
    const answered = Object.keys(quizState).length;
    $("#quizProgress").textContent = `已答 ${answered}/${QUIZ.length}`;
    $("#quizResultBtn").disabled = answered < QUIZ.length;
  }

  function computeResult() {
    const score = {};
    STARTUP_DIRS.forEach((d) => (score[d.id] = 0));
    Object.entries(quizState).forEach(([qi, oi]) => {
      const tags = QUIZ[qi].options[oi].tags;
      STARTUP_DIRS.forEach((d) => {
        tags.forEach((t) => { if (d.tags.includes(t)) score[d.id] += 1; });
      });
    });
    // 资金约束：若选「几乎为零」则降权高投入方向
    const capAns = quizState[1];
    if (capAns != null && capAns < 2) {
      STARTUP_DIRS.forEach((d) => { if (d.capitalLevel === 3) score[d.id] -= 1.5; });
    }
    const ranked = STARTUP_DIRS.map((d) => ({ d, s: score[d.id] }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 3);
    return ranked;
  }

  $("#quizResultBtn").addEventListener("click", () => {
    const top = computeResult();
    const box = $("#quizResult");
    box.innerHTML = "";
    box.appendChild(el("div", "lead", "按你的能力 / 资金 / 资源，最匹配的方向是："));
    top.forEach((r, i) => {
      const card = el("div", "result-card");
      card.appendChild(el("div", "rk", `#${i + 1}`));
      const mid = el("div");
      const why = r.s > 0
        ? "与你的回答高度契合：能力匹配 + 投入适配"
        : "可作为拓展尝试，建议先从低成本方向练手";
      mid.appendChild(el("div", "rname", `${r.d.emoji} ${r.d.name}`));
      mid.appendChild(el("div", "rwhy", why + ` · 启动 ${r.d.capital}`));
      card.appendChild(mid);
      card.appendChild(el("div", "rscore", "匹配分 " + Math.max(0, r.s)));
      box.appendChild(card);
    });
  });

  // ---------- 筹备清单 ----------
  function renderPrep() {
    const box = $("#prepList");
    box.innerHTML = "";
    PREP_CHECKLIST.forEach((stage) => {
      const s = el("div", "prep-stage");
      s.appendChild(el("div", "ps-head", stage.stage));
      const ul = el("ul");
      stage.items.forEach((it) => {
        const li = el("label", "prep-item");
        const cb = el("input");
        cb.type = "checkbox";
        cb.addEventListener("change", () => li.classList.toggle("done", cb.checked));
        li.appendChild(cb);
        li.appendChild(el("span", null, it));
        ul.appendChild(li);
      });
      s.appendChild(ul);
      box.appendChild(s);
    });
  }

  // ---------- 盈亏测算 ----------
  const beSel = $("#beDirSelect");
  const beInputs = {
    rent: $("#beRent"), labor: $("#beLabor"),
    other: $("#beOther"), price: $("#bePrice"), margin: $("#beMargin"),
  };

  function computeBE() {
    const rent = +beInputs.rent.value || 0;
    const labor = +beInputs.labor.value || 0;
    const other = +beInputs.other.value || 0;
    const price = +beInputs.price.value || 0;
    const margin = +beInputs.margin.value || 0;
    const fixed = rent + labor + other;
    const unitMargin = (price * margin) / 100;
    const box = $("#beResult");
    if (unitMargin <= 0) {
      box.innerHTML = `<div class="be-card warn">客单价或毛利率为 0，无法计算。请填入真实数值。</div>`;
      return;
    }
    const monthUnits = Math.ceil(fixed / unitMargin);
    const dayUnits = Math.ceil(monthUnits / 30);
    box.innerHTML =
      `<div class="be-card">` +
      `<div class="be-row"><span>月固定成本</span><b>¥${fixed.toLocaleString()}</b></div>` +
      `<div class="be-row"><span>每单毛利（客单 × 毛利率）</span><b>¥${unitMargin.toFixed(1)}</b></div>` +
      `<div class="be-row hl"><span>每月需卖出</span><b>${monthUnits.toLocaleString()} 单</b></div>` +
      `<div class="be-row hl"><span>每天需卖出（按 30 天）</span><b>${dayUnits.toLocaleString()} 单</b></div>` +
      `<div class="be-row"><span>年固定成本</span><b>¥${(fixed * 12).toLocaleString()}</b></div>` +
      `</div>`;
  }

  function setBeDir(id) {
    const d = BREAKEVEN_DEFAULTS[id];
    if (!d) return;
    beInputs.rent.value = d.rent;
    beInputs.labor.value = d.labor;
    beInputs.other.value = d.other;
    beInputs.price.value = d.price;
    beInputs.margin.value = d.margin;
    computeBE();
  }

  function renderBreakeven() {
    beSel.innerHTML = "";
    STARTUP_DIRS.filter((d) => d.category === "store").forEach((d) => {
      const o = el("option", null, d.emoji + " " + d.name);
      o.value = d.id;
      beSel.appendChild(o);
    });
    beSel.addEventListener("change", () => setBeDir(beSel.value));
    Object.values(beInputs).forEach((inp) => inp.addEventListener("input", computeBE));
    setBeDir(beSel.value);
  }

  // ---------- 启动 ----------
  buildFilters();
  renderStats();
  renderCards();
  renderPlaybook();
  renderQuiz();
  renderPrep();
  renderBreakeven();
})();

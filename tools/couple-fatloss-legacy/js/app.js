(function () {
  "use strict";

  const PLAN = window.PLAN;
  const WEEK_CN = window.WEEK_CN;
  const STORE_KEY = "couple_fatloss_records_v1";
  const SET_KEY = "couple_fatloss_settings_v1";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  function todayDateStr(d = new Date()) {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }
  function weekdayCN(d = new Date()) { return WEEK_CN[d.getDay()]; }

  function loadRecords() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveRecords(r) { localStorage.setItem(STORE_KEY, JSON.stringify(r)); }
  function loadSettings() {
    try {
      return Object.assign({ weather: "sunny", notify: false, remindersFired: {} }, JSON.parse(localStorage.getItem(SET_KEY)) || {});
    } catch (e) { return { weather: "sunny", notify: false, remindersFired: {} }; }
  }
  function saveSettings(s) { localStorage.setItem(SET_KEY, JSON.stringify(s)); }

  let records = loadRecords();
  let settings = loadSettings();

  function getCycle(weekday) {
    return PLAN.cycle_split.fat_loss_days.includes(weekday) ? "fat_loss" : "cheat";
  }
  function calorieLimit(gender, cycle) {
    if (gender === "male") return cycle === "fat_loss" ? PLAN.calorie_limit.male_fat_loss : PLAN.calorie_limit.male_cheat;
    return cycle === "fat_loss" ? PLAN.calorie_limit.female_fat_loss : PLAN.calorie_limit.female_cheat;
  }

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2000);
  }

  function openVideo(link) {
    if (!link) { toast("暂无视频链接"); return; }
    window.open(link, "_blank");
  }

  function updateStatusTime() {
    const now = new Date();
    $("#statusTime").textContent = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
  }

  function renderHeader() {
    const now = new Date();
    const wd = weekdayCN(now);
    const cycle = getCycle(wd);
    const cycleText = cycle === "fat_loss" ? "减脂日" : "放纵日";
    $("#appName").textContent = PLAN.app_name;
    $("#cycleBadge").textContent = cycleText;
    $("#weatherToggle").textContent = settings.weather === "sunny" ? "☀️" : "🌧️";
    $("#weatherToggle").title = settings.weather === "sunny" ? "点击切换雨天" : "点击切换晴天";

    const hour = now.getHours();
    const greet = hour < 11 ? "早安，减脂搭档 💑" : hour < 14 ? "午安，减脂搭档 💪" : hour < 18 ? "下午好，减脂搭档 ☕" : "晚安，减脂搭档 🌙";
    const quotes = cycle === "fat_loss"
      ? ["今天的高强度，是明天的惊艳 ✨", "汗水不会骗人，坚持就有光 💫", "男主去跑步，女主抽一套，各练各的爽 🏃💃", "控制饮食 + 动起来 = 稳稳掉秤 📉"]
      : ["放纵日也要聪明的吃 🍰", "低强度舒缓一下，给身体放个假 🧘", "跟随男生散个步，也是甜甜的约会 💞", "今天轻松练，明天继续冲 🚴"];
    $("#heroGreet").textContent = greet;
    $("#heroSub").textContent = todayDateStr() + " " + wd + " · " + cycleText + " · " + (settings.weather === "sunny" ? "晴天" : "雨天");
    $("#heroQuote").textContent = quotes[Math.floor(Math.random() * quotes.length)];

    updateHeroRing();
  }

  function renderTip() {
    const bar = $("#tipBar");
    const hour = new Date().getHours();
    let msg = "";
    if (hour >= 20) msg = "🌙 20点后禁食提醒：今天不要吃东西啦，喝点温水就好～";
    else if (hour >= 17 && hour < 19) msg = "🍽️ 晚餐时间（17:30-19:00）：蒸煮少油，记得记录哦";
    else if (hour >= 11 && hour < 13) msg = "🍱 午餐时间（11:30-13:30）：均衡搭配，控制油脂";
    else if (hour >= 7 && hour < 9) msg = "🌞 早餐时间（7-9点）：开启一天好状态";
    if (msg) { bar.textContent = msg; bar.classList.add("show"); }
    else bar.classList.remove("show");
  }

  function dietForDay(weekday) {
    const cycle = getCycle(weekday);
    if (cycle === "fat_loss") {
      const d = PLAN.diet_plan.fat_loss[weekday];
      return {
        cycle,
        meals: [
          { key: "breakfast", label: "早餐", male: d.breakfast_male, female: d.breakfast_female },
          { key: "lunch", label: "午餐", male: d.lunch_male, female: d.lunch_female },
          { key: "dinner", label: "晚餐", male: d.dinner_male, female: d.dinner_female }
        ],
        snack: d.snack
      };
    } else {
      const d = PLAN.diet_plan.cheat[weekday];
      const shared = d.breakfast;
      return {
        cycle,
        meals: [
          { key: "breakfast", label: "早餐", male: shared, female: shared, shared: true },
          { key: "lunch", label: "午餐", male: d.lunch, female: d.lunch, shared: true },
          { key: "dinner", label: "晚餐", male: d.dinner, female: d.dinner, shared: true }
        ],
        snack: d.cheat_food,
        cheatMeal: true
      };
    }
  }

  function renderDiet(weekday, rec) {
    const info = dietForDay(weekday);
    const wrap = $("#dietBlocks");
    wrap.innerHTML = "";
    const limit = calorieLimit("female", info.cycle);
    $("#dietLimitHint").textContent = "每日上限 男" + calorieLimit("male", info.cycle) + " / 女" + limit + " kcal";

    info.meals.forEach(m => {
      const rm = rec && rec.diet ? rec.diet[m.key] : null;
      const block = document.createElement("div");
      block.className = "diet-block";
      const sharedTag = m.shared ? '<span class="chip">男女共用菜单</span>' : "";
      block.innerHTML =
        '<div class="diet-head"><span>' + m.label + " " + sharedTag + '</span></div>' +
        '<div class="diet-items">🟦 男主：' + m.male + '</div>' +
        (m.shared ? "" : '<div class="diet-items">🟪 女主：' + m.female + '</div>') +
        '<div class="diet-meta">' +
          '<label>男主kcal<input type="number" data-diet="' + m.key + '" data-g="male" value="' + (rm ? (rm.male || "") : "") + '" placeholder="热量" /></label>' +
          '<label>女主kcal<input type="number" data-diet="' + m.key + '" data-g="female" value="' + (rm ? (rm.female || "") : "") + '" placeholder="热量" /></label>' +
        '</div>';
      wrap.appendChild(block);
    });
    const snackBlock = document.createElement("div");
    snackBlock.className = "diet-block";
    snackBlock.innerHTML =
      '<div class="diet-head"><span>加餐 / 放纵餐 ' + (info.cheatMeal ? "🍰" : "🥛") + '</span></div>' +
      '<div class="diet-items">' + info.snack + '</div>' +
      '<div class="diet-meta">' +
        '<label class="check-row" style="margin:0"><input type="checkbox" id="snackHas" ' + (rec && rec.diet && rec.diet.snackHas ? "checked" : "") + ' /><span>有加餐</span></label>' +
        '<label>kcal<input type="number" id="snackKcal" value="' + (rec && rec.diet && rec.diet.snackKcal ? rec.diet.snackKcal : "") + '" placeholder="热量" /></label>' +
      '</div>';
    wrap.appendChild(snackBlock);
  }

  function renderMaleSection(weekday, rec) {
    const cycle = getCycle(weekday);
    const planText = cycle === "fat_loss"
      ? PLAN.sport_plan.fat_loss_daily[weekday].male
      : PLAN.sport_plan.cheat_daily[weekday].male;
    $("#maleSportPlan").textContent = "今日计划：" + planText;

    const runInput = $("#maleRun"), skipInput = $("#maleSkip");
    if (settings.weather === "sunny") { runInput.placeholder = "5"; skipInput.placeholder = "（雨天填）"; }
    else { skipInput.placeholder = "3800"; runInput.placeholder = "（晴天填）"; }
    if (rec && rec.male) {
      runInput.value = rec.male.run || "";
      skipInput.value = rec.male.skip || "";
      $("#maleStrength").checked = !!rec.male.strength;
    }

    const vids = (PLAN.video_resource.male_fixed_video[weekday] || []);
    const vWrap = $("#maleVideos");
    vWrap.innerHTML = "";
    vids.forEach((v, i) => {
      const done = rec && rec.male && rec.male.videos && rec.male.videos[i] ? rec.male.videos[i].done : false;
      const item = document.createElement("div");
      item.className = "video-item";
      item.innerHTML =
        '<div>' +
          '<div class="v-name">' + v.video_name + '</div>' +
          '<div class="v-tags">' + v.video_tag.join(" · ") + '</div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;align-items:center">' +
          '<label class="check-row" style="margin:0"><input type="checkbox" data-mv="' + i + '" ' + (done ? "checked" : "") + '/><span>已完成</span></label>' +
          '<button class="video-open" data-link="' + v.video_link + '">▶ 跟练</button>' +
        '</div>';
      vWrap.appendChild(item);
    });
  }

  function renderFemaleSection(weekday, rec) {
    const cycle = getCycle(weekday);
    const planText = cycle === "fat_loss"
      ? PLAN.sport_plan.fat_loss_daily[weekday].female
      : PLAN.sport_plan.cheat_daily[weekday].female;
    $("#femaleSportPlan").textContent = (cycle === "fat_loss" ? "减脂日·单人随机：" : "放纵日·双模式：") + planText;

    const mode = rec && rec.female ? rec.female.mode : "solo";
    $$('input[name="femaleMode"]').forEach(r => r.checked = (r.value === mode));
    $("#femaleCoupleHint").textContent = cycle === "fat_loss"
      ? "减脂日建议独立完成单人训练；如需结伴仅做力量/拉伸。"
      : "可选：跟随男生完成「" + PLAN.sport_plan.cheat_daily[weekday].male + "」";
    $("#femaleCoupleDone").checked = !!(rec && rec.female && rec.female.coupleDone);

    toggleFemaleMode(mode);
    if (mode === "solo") {
      if (rec && rec.female && rec.female.solo) showFemaleRandom(rec.female.solo, !!rec.female.solo.done);
      else drawTodayFemale(cycle, $("#femaleFilter").value);
    }
  }

  function toggleFemaleMode(mode) {
    $("#femaleSoloBox").style.display = mode === "solo" ? "" : "none";
    $("#femaleCoupleBox").style.display = mode === "couple" ? "" : "none";
  }

  function filterPredicate(f) {
    switch (f) {
      case "无跑跳": return w => (w.tag || []).some(t => t.includes("无跳跃")) || /无跑跳|无跳跃/.test(w.workout_name + w.target);
      case "新手友好": return w => (w.tag || []).includes("新手友好") || /新手/.test(w.workout_name + w.target);
      case "矿泉水瓶器械": return w => /矿泉水瓶/.test(w.equip) || (w.tag || []).includes("矿泉水瓶器械");
      case "全身燃脂": return w => /全身/.test(w.workout_name + w.target) || (w.tag || []).includes("全身燃脂");
      case "局部塑形": return w => /肩背|臀腿|腹部|手臂|腰腹|马甲线|拜拜肉/.test(w.workout_name + w.target) || (w.tag || []).includes("局部塑形");
      default: return () => true;
    }
  }

  function drawRandomWorkout(pool, filter, excludeName) {
    const arr = pool.filter(filterPredicate(filter));
    const list = arr.length ? arr : pool;
    let pick = list[Math.floor(Math.random() * list.length)];
    if (excludeName && list.length > 1) {
      let guard = 0;
      while (pick.workout_name === excludeName && guard++ < 10) pick = list[Math.floor(Math.random() * list.length)];
    }
    return pick;
  }

  function femalePoolByCycle(cycle) {
    return cycle === "fat_loss" ? PLAN.video_resource.female_random_fat_loss_pool : PLAN.video_resource.female_random_cheat_pool;
  }

  function renderRandomCard(w, done) {
    const c = $("#femaleRandomContent");
    c.innerHTML =
      '<div class="rd-name">' + w.workout_name + '</div>' +
      '<div class="rd-meta">' +
        '<span class="chip blue">⏱ ' + w.duration + ' 分钟</span>' +
        '<span class="chip">难度 ' + w.difficulty + '</span>' +
        '<span class="chip">器械 ' + w.equip + '</span>' +
      '</div>' +
      '<div class="rd-target">🎯 ' + w.target + '</div>' +
      '<div class="rd-meta">' + (w.tag || []).map(t => '<span class="chip pink">' + t + '</span>').join("") + '</div>' +
      '<button class="rd-video" data-link="' + w.video_link + '">▶ 打开跟练视频</button>' +
      '<label class="check-row rd-done-row"><input type="checkbox" id="femaleSoloDone" ' + (done ? "checked" : "") + '/><span>已完成本次训练</span></label>';
  }

  function showFemaleRandom(w, done) {
    $("#femaleRandomLoading").style.display = "none";
    renderRandomCard(w, done);
  }

  function drawTodayFemale(cycle, filter, excludeName) {
    $("#femaleRandomLoading").style.display = "block";
    $("#femaleRandomContent").innerHTML = "";
    setTimeout(() => {
      const w = drawRandomWorkout(femalePoolByCycle(cycle), filter, excludeName);
      showFemaleRandom(w, false);
    }, 450);
  }

  function bindFemaleRandomControls(weekday) {
    const cycle = getCycle(weekday);
    $("#femaleRefresh").onclick = () => {
      const cur = $("#femaleRandomContent .rd-name") ? $("#femaleRandomContent .rd-name").textContent : "";
      drawTodayFemale(cycle, $("#femaleFilter").value, cur);
      toast("已为你重新随机一套训练 🎲");
    };
    $("#femaleFilter").onchange = () => drawTodayFemale(cycle, $("#femaleFilter").value);
  }

  function renderWeightRating(rec) {
    $("#weightMale").value = rec && rec.weight ? rec.weight.male || "" : "";
    $("#weightFemale").value = rec && rec.weight ? rec.weight.female || "" : "";
    setRating(rec ? rec.rating || 0 : 0);
    $("#note").value = rec ? rec.note || "" : "";
    $("#cheatOver").checked = !!(rec && rec.cheatOver);
  }
  function setRating(v) {
    $$("#ratingStars span").forEach(s => s.classList.toggle("active", +s.dataset.v <= v));
    $("#ratingStars").dataset.val = v;
  }

  function loadTodayToForm() {
    const wd = weekdayCN();
    const rec = records[todayDateStr()];
    renderDiet(wd, rec);
    renderMaleSection(wd, rec);
    renderFemaleSection(wd, rec);
    renderWeightRating(rec);
    bindFemaleRandomControls(wd);
    $("#water").value = rec ? rec.water || "" : "";
    updateWaterBar();
  }

  function updateWaterBar() {
    const v = +($("#water").value || 0);
    const goal = PLAN.global_rule.water_daily;
    const pct = Math.min(100, Math.round(v / goal * 100));
    $("#waterFill").style.width = pct + "%";
    $("#waterText").textContent = v + " / " + goal + " ml";
    updateHeroRing(pct);
  }

  function updateHeroRing(pct) {
    if (pct == null) {
      const rec = records[todayDateStr()];
      const v = rec ? (rec.water || 0) : 0;
      pct = Math.min(100, Math.round(v / PLAN.global_rule.water_daily * 100));
    }
    const C = 264;
    const offset = C * (1 - pct / 100);
    const bar = $("#heroRingBar");
    if (bar) { bar.style.strokeDashoffset = offset; bar.style.stroke = pct >= 100 ? "#34D399" : pct >= 50 ? "#8B5CF6" : "#F472B6"; }
    const txt = $("#heroRingText");
    if (txt) txt.textContent = pct + "%";
  }

  function saveToday() {
    const wd = weekdayCN();
    const cycle = getCycle(wd);
    const diet = {};
    $$("[data-diet]").forEach(inp => {
      const k = inp.dataset.diet, g = inp.dataset.g;
      diet[k] = diet[k] || {};
      diet[k][g] = inp.value ? +inp.value : 0;
    });
    diet.snackHas = $("#snackHas").checked;
    diet.snackKcal = $("#snackKcal").value ? +$("#snackKcal").value : 0;

    const maleVids = (PLAN.video_resource.male_fixed_video[wd] || []).map((v, i) => ({
      name: v.video_name, link: v.video_link,
      done: !!$('[data-mv="' + i + '"]').checked
    }));

    const mode = $('input[name="femaleMode"]:checked').value;
    let female = { mode };
    if (mode === "solo") {
      const nameEl = $("#femaleRandomContent .rd-name");
      const durEl = $("#femaleRandomContent .rd-meta .chip.blue");
      const linkEl = $("#femaleRandomContent .rd-video");
      const name = nameEl ? nameEl.textContent : "";
      const dur = durEl ? +durEl.textContent.replace(/\D/g, "") : 0;
      const link = linkEl ? linkEl.dataset.link : "";
      female.solo = { name: name, duration: dur, video: link, done: !!($("#femaleSoloDone") ? $("#femaleSoloDone").checked : false) };
    } else {
      female.coupleDone = $("#femaleCoupleDone").checked;
    }

    const rec = {
      date: todayDateStr(), weekday: wd, cycle: cycle, weather: settings.weather,
      diet: diet,
      water: +($("#water").value || 0),
      male: {
        run: +($("#maleRun").value || 0),
        skip: +($("#maleSkip").value || 0),
        strength: $("#maleStrength").checked,
        videos: maleVids
      },
      female: female,
      weight: { male: +($("#weightMale").value || 0), female: +($("#weightFemale").value || 0) },
      rating: +($("#ratingStars").dataset.val || 0),
      note: $("#note").value,
      cheatOver: $("#cheatOver").checked,
      updatedAt: Date.now()
    };
    records[todayDateStr()] = rec;
    saveRecords(records);
    toast("✅ 今日打卡已保存");
    renderDashboard();
  }

  function renderRandomTab() {
    const poolKey = $("#randomPool").value;
    const filter = $("#randomFilter2").value;
    const pool = poolKey === "fat_loss" ? PLAN.video_resource.female_random_fat_loss_pool : PLAN.video_resource.female_random_cheat_pool;
    $("#randomLibInfo").textContent = "共 " + pool.length + " 套训练 · 当前筛选：" + (filter || "全部");
    const list = $("#randomPoolList");
    list.innerHTML = "";
    pool.filter(filterPredicate(filter)).forEach(w => {
      const item = document.createElement("div");
      item.className = "pool-item";
      item.innerHTML =
        '<div class="pi-name">' + w.workout_name + '</div>' +
        '<div class="pi-meta">⏱' + w.duration + 'min · 难度' + w.difficulty + ' · 器械' + w.equip + ' · ' + (w.tag || []).join("、") + '</div>' +
        '<div class="pi-meta">🎯 ' + w.target + '</div>' +
        '<button class="rd-video" style="margin-top:8px" data-link="' + w.video_link + '">▶ 打开跟练视频</button>';
      list.appendChild(item);
    });
    if (!list.children.length) list.innerHTML = '<div class="empty">该筛选条件下暂无训练，换个标签试试～</div>';
  }

  function drawRandomTab() {
    const poolKey = $("#randomPool").value;
    const filter = $("#randomFilter2").value;
    const pool = poolKey === "fat_loss" ? PLAN.video_resource.female_random_fat_loss_pool : PLAN.video_resource.female_random_cheat_pool;
    const pickedName = $("#randomPoolList .pool-picked .pi-name") ? $("#randomPoolList .pool-picked .pi-name").textContent : "";
    const w = drawRandomWorkout(pool, filter, pickedName);
    $$("#randomPoolList .pool-item").forEach(el => el.classList.remove("pool-picked"));
    const items = $$("#randomPoolList .pool-item");
    const idx = pool.filter(filterPredicate(filter)).findIndex(x => x.workout_name === w.workout_name);
    if (items[idx]) items[idx].classList.add("pool-picked");
    toast("🎲 已抽取：" + w.workout_name);
    if (items[idx] && items[idx].scrollIntoView) items[idx].scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function renderPlan(weekday) {
    const cycle = getCycle(weekday);
    const wrap = $("#planDetail");
    const diet = dietForDay(weekday);
    let html = '<div class="plan-day"><h3>' + weekday + ' · ' + (cycle === "fat_loss" ? "🔥 减脂日" : "🍰 放纵日") + '</h3>';

    html += '<div class="plan-sub">🍱 饮食（男主 / 女主）</div>';
    diet.meals.forEach(m => {
      html += '<div class="plan-line">🟦 ' + m.label + '·男：' + m.male + '</div>';
      html += '<div class="plan-line">🟪 ' + m.label + '·女：' + m.female + '</div>';
    });
    html += '<div class="plan-line">🥛 加餐/放纵：' + diet.snack + '</div>';

    const malePlan = cycle === "fat_loss" ? PLAN.sport_plan.fat_loss_daily[weekday].male : PLAN.sport_plan.cheat_daily[weekday].male;
    html += '<div class="plan-sub">🏃 男生运动（固定）</div><div class="plan-line">' + malePlan + '</div>';
    const vids = PLAN.video_resource.male_fixed_video[weekday] || [];
    vids.forEach(v => html += '<a class="plan-video" href="' + v.video_link + '" target="_blank">▶ ' + v.video_name + '</a><br/>');

    const femPlan = cycle === "fat_loss" ? PLAN.sport_plan.fat_loss_daily[weekday].female : PLAN.sport_plan.cheat_daily[weekday].female;
    html += '<div class="plan-sub">💃 女生运动</div><div class="plan-line">' + femPlan + '</div>';
    const fpool = femalePoolByCycle(cycle);
    html += '<div class="plan-line muted small">可抽取训练库（' + fpool.length + ' 套）：' + fpool.map(w => w.workout_name).join("、") + '</div>';

    html += '</div>';
    wrap.innerHTML = html;
  }

  function categorizeFemale(name) {
    if (/全身|HIIT/.test(name)) return "全身燃脂";
    if (/肩背|手臂|拜拜肉/.test(name)) return "上肢塑形";
    if (/臀腿/.test(name)) return "臀腿塑形";
    if (/腹部|马甲线/.test(name)) return "核心训练";
    if (/瑜伽/.test(name)) return "瑜伽舒缓";
    if (/拉伸/.test(name)) return "拉伸放松";
    if (/燃脂舞/.test(name)) return "燃脂舞";
    return "其他";
  }

  function aggregate() {
    const list = Object.values(records).sort((a, b) => a.date.localeCompare(b.date));
    const res = {
      list: list,
      maleWeight: [], femaleWeight: [],
      maleOk: 0, femaleOk: 0, days: 0,
      maleRunDays: 0, maleSkipDays: 0, maleRunKm: 0, maleSkip: 0,
      maleRunSunny: 0, maleRunRain: 0, maleSkipSunny: 0, maleSkipRain: 0,
      femSoloDone: 0, femCat: {},
      maleComplete: 0, femComplete: 0,
      cheatOver: 0,
      maleVidDone: 0, maleVidTotal: 0, femVidDone: 0
    };
    list.forEach(r => {
      res.days++;
      if (r.weight && r.weight.male) res.maleWeight.push({ d: r.date, v: r.weight.male });
      if (r.weight && r.weight.female) res.femaleWeight.push({ d: r.date, v: r.weight.female });
      const mt = (r.diet.breakfast ? (r.diet.breakfast.male || 0) : 0) + (r.diet.lunch ? (r.diet.lunch.male || 0) : 0) + (r.diet.dinner ? (r.diet.dinner.male || 0) : 0) + (r.diet.snackHas ? (r.diet.snackKcal || 0) : 0);
      const ft = (r.diet.breakfast ? (r.diet.breakfast.female || 0) : 0) + (r.diet.lunch ? (r.diet.lunch.female || 0) : 0) + (r.diet.dinner ? (r.diet.dinner.female || 0) : 0) + (r.diet.snackHas ? (r.diet.snackKcal || 0) : 0);
      if (mt <= calorieLimit("male", r.cycle)) res.maleOk++;
      if (ft <= calorieLimit("female", r.cycle)) res.femaleOk++;
      if (r.male.run > 0) { res.maleRunDays++; res.maleRunKm += r.male.run; if (r.weather === "sunny") res.maleRunSunny++; else res.maleRunRain++; }
      if (r.male.skip > 0) { res.maleSkipDays++; res.maleSkip += r.male.skip; if (r.weather === "sunny") res.maleSkipSunny++; else res.maleSkipRain++; }
      if (r.male.run > 0 || r.male.skip > 0) res.maleComplete++;
      (r.male.videos || []).forEach(v => { res.maleVidTotal++; if (v.done) res.maleVidDone++; });
      if (r.female.mode === "solo" && r.female.solo) {
        if (r.female.solo.done) { res.femSoloDone++; res.femComplete++; const c = categorizeFemale(r.female.solo.name); res.femCat[c] = (res.femCat[c] || 0) + 1; }
      } else if (r.female.mode === "couple" && r.female.coupleDone) {
        res.femComplete++;
      }
      if (r.female.mode === "solo" && r.female.solo && r.female.solo.done) res.femVidDone++;
      if (r.cheatOver) res.cheatOver++;
    });
    return res;
  }

  function svgLineChart(series, labels) {
    const W = 320, H = 180, pad = 28;
    let all = [];
    series.forEach(s => s.points.forEach(p => { if (p.v != null) all.push(p.v); }));
    if (!all.length) return '<svg class="svg-chart" viewBox="0 0 320 180"><text x="160" y="90" text-anchor="middle" fill="#aaa" font-size="12">暂无体重数据</text></svg>';
    let min = Math.min.apply(null, all), max = Math.max.apply(null, all);
    if (min === max) { min -= 1; max += 1; }
    const n = labels.length;
    const x = i => pad + (W - 2 * pad) * (n <= 1 ? 0.5 : i / (n - 1));
    const y = v => H - pad - (H - 2 * pad) * (v - min) / (max - min);
    let grid = "";
    for (let g = 0; g <= 2; g++) {
      const gy = pad + (H - 2 * pad) * g / 2;
      const gv = (max - (max - min) * g / 2).toFixed(1);
      grid += '<line x1="' + pad + '" y1="' + gy + '" x2="' + (W - pad) + '" y2="' + gy + '" stroke="#eee"/><text x="' + (pad - 4) + '" y="' + (gy + 3) + '" text-anchor="end" font-size="9" fill="#aaa">' + gv + '</text>';
    }
    let paths = "";
    series.forEach(s => {
      let seg = [];
      const flush = () => { if (seg.length > 1) paths += '<polyline points="' + seg.join(" ") + '" fill="none" stroke="' + s.color + '" stroke-width="2.5"/>'; seg = []; };
      s.points.forEach((p, i) => {
        if (p.v == null) { flush(); return; }
        const cx = x(i), cy = y(p.v);
        seg.push(cx + "," + cy);
        paths += '<circle cx="' + cx + '" cy="' + cy + '" r="3" fill="' + s.color + '"/>';
      });
      flush();
    });
    let xlab = "";
    labels.forEach((l, i) => { if (i % Math.ceil(n / 5 || 1) === 0 || i === n - 1) xlab += '<text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="9" fill="#aaa">' + l.slice(5) + '</text>'; });
    return '<svg class="svg-chart" viewBox="0 0 ' + W + ' ' + H + '">' + grid + paths + xlab + '</svg>';
  }

  function alignSeries(arr, labels) {
    const map = {}; arr.forEach(p => map[p.d] = p.v);
    return labels.map(d => ({ v: d in map ? map[d] : null }));
  }

  function renderDashboard() {
    const wrap = $("#dashboard");
    if (!Object.keys(records).length) {
      wrap.innerHTML = '<div class="empty">还没有打卡数据，去「今日打卡」记录第一天吧 💪</div>';
      return;
    }
    const a = aggregate();
    const maleRate = a.days ? Math.round(a.maleOk / a.days * 100) : 0;
    const femaleRate = a.days ? Math.round(a.femaleOk / a.days * 100) : 0;
    const maleCompRate = a.days ? Math.round(a.maleComplete / a.days * 100) : 0;
    const femCompRate = a.days ? Math.round(a.femComplete / a.days * 100) : 0;
    const maleVidRate = a.maleVidTotal ? Math.round(a.maleVidDone / a.maleVidTotal * 100) : 0;

    const wLabels = [...new Set([...a.maleWeight, ...a.femaleWeight].map(p => p.d))].sort();
    const wChart = svgLineChart([
      { color: "#3b82f6", points: alignSeries(a.maleWeight, wLabels) },
      { color: "#ec4899", points: alignSeries(a.femaleWeight, wLabels) }
    ], wLabels);

    const cats = Object.entries(a.femCat).sort((x, y) => y[1] - x[1]);
    const maxCat = cats.length ? cats[0][1] : 1;
    const catBars = cats.length
      ? cats.map(([k, v]) => '<div class="bar-row"><span class="bl">' + k + '</span><div class="bar-track"><div class="bar-fill" style="width:' + (v / maxCat * 100) + '%"></div></div><span class="bar-val">' + v + '</span></div>').join("")
      : '<div class="empty">暂无女生训练完成记录</div>';

    const rankBars =
      '<div class="bar-row"><span class="bl">🟦 男主</span><div class="bar-track"><div class="bar-fill male" style="width:' + maleCompRate + '%"></div></div><span class="bar-val">' + maleCompRate + '%</span></div>' +
      '<div class="bar-row"><span class="bl">🟪 女主</span><div class="bar-track"><div class="bar-fill" style="width:' + femCompRate + '%"></div></div><span class="bar-val">' + femCompRate + '%</span></div>';

    wrap.innerHTML =
      '<div class="dash-card">' +
        '<h3>⚖️ 体重变化曲线 <span class="muted small">（男女分线）</span></h3>' +
        '<div class="legend"><span><i style="background:#3b82f6"></i>男主</span><span><i style="background:#ec4899"></i>女主</span></div>' +
        wChart +
      '</div>' +
      '<div class="dash-card">' +
        '<h3>🍽️ 每日热量达标率 <span class="muted small">（男女分开）</span></h3>' +
        '<div class="stat-grid">' +
          '<div class="stat"><div class="num male">' + maleRate + '%</div><div class="lbl">男主达标 ' + a.maleOk + '/' + a.days + '天</div></div>' +
          '<div class="stat"><div class="num female">' + femaleRate + '%</div><div class="lbl">女主达标 ' + a.femaleOk + '/' + a.days + '天</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="dash-card">' +
        '<h3>🏃 男生有氧汇总 <span class="muted small">（晴雨拆分）</span></h3>' +
        '<div class="stat-grid">' +
          '<div class="stat"><div class="num male">' + a.maleRunKm + '</div><div class="lbl">跑步总公里（晴' + a.maleRunSunny + '/雨' + a.maleRunRain + '天）</div></div>' +
          '<div class="stat"><div class="num male">' + a.maleSkip + '</div><div class="lbl">跳绳总次数（晴' + a.maleSkipSunny + '/雨' + a.maleSkipRain + '天）</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="dash-card">' +
        '<h3>💃 女生随机训练分类 <span class="muted small">（完成次数）</span></h3>' +
        catBars +
        '<div class="muted small" style="margin-top:6px">累计完成单人训练 ' + a.femSoloDone + ' 次</div>' +
      '</div>' +
      '<div class="dash-card">' +
        '<h3>🏆 运动完成率排行 <span class="muted small">（情侣对比）</span></h3>' +
        rankBars +
      '</div>' +
      '<div class="dash-card">' +
        '<h3>▶️ 跟练视频完成 <span class="muted small">（男女分开）</span></h3>' +
        '<div class="stat-grid">' +
          '<div class="stat"><div class="num male">' + maleVidRate + '%</div><div class="lbl">男主 ' + a.maleVidDone + '/' + a.maleVidTotal + '</div></div>' +
          '<div class="stat"><div class="num female">' + a.femSoloDone + '</div><div class="lbl">女主单人训练完成</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="dash-card">' +
        '<h3>🍰 放纵餐超标</h3>' +
        '<div class="stat-grid"><div class="stat"><div class="num" style="color:var(--danger)">' + a.cheatOver + '</div><div class="lbl">超标次数</div></div></div>' +
      '</div>' +
      '<div class="dash-card">' +
        '<h3>📑 月度汇总</h3>' +
        '<div class="stat-grid">' +
          '<div class="stat"><div class="num">' + a.days + '</div><div class="lbl">打卡天数</div></div>' +
          '<div class="stat"><div class="num">' + (a.list.length ? (a.list.reduce((s, r) => s + (r.rating || 0), 0) / a.list.length).toFixed(1) : "-") + '</div><div class="lbl">平均自评</div></div>' +
        '</div>' +
      '</div>';
  }

  const REMINDERS = [
    { id: "breakfast", time: "07:30", label: "早餐打卡提醒" },
    { id: "lunch", time: "12:00", label: "午餐后记录提醒" },
    { id: "dinner", time: "18:00", label: "晚餐前提醒（蒸煮少油）" },
    { id: "water", time: "15:00", label: "喝水提醒（目标2000ml）" },
    { id: "fast", time: "20:00", label: "禁食提醒（20点后不吃）" },
    { id: "checkin", time: "21:30", label: "今日打卡未完成提醒" }
  ];

  function renderReminderList() {
    const wrap = $("#reminderList");
    wrap.innerHTML = REMINDERS.map(r => '<div class="reminder-item"><span>⏰ ' + r.time + '</span><span>' + r.label + '</span></div>').join("");
  }

  function renderParamDoc() {
    $("#paramDoc").innerHTML =
      '<ul class="doc">' +
        '<li><b>男生有氧参数</b>：修改 <code>global_rule.male_aerobic_rule</code> 内公里数、跳绳次数、消耗热量。</li>' +
        '<li><b>女生随机训练库</b>：增删 <code>female_random_fat_loss_pool</code> / <code>female_random_cheat_pool</code> 数组条目，替换 <code>video_link</code> 即可更新视频。</li>' +
        '<li><b>筛选标签</b>：修改 <code>female_workout_rule.filter_option</code> 增减女生训练筛选维度。</li>' +
        '<li><b>随机刷新规则</b>：默认每日无次数上限；如需限制可在代码中配置。</li>' +
        '<li><b>运动时长</b>：修改素材库内 <code>duration</code> 字段调整单套训练时间。</li>' +
        '<li><b>热量上限</b>：男减脂 ' + PLAN.calorie_limit.male_fat_loss + ' / 男放纵 ' + PLAN.calorie_limit.male_cheat + ' / 女减脂 ' + PLAN.calorie_limit.female_fat_loss + ' / 女放纵 ' + PLAN.calorie_limit.female_cheat + ' kcal。</li>' +
      '</ul>';
  }

  function notify(title, body) {
    if (settings.notify && "Notification" in window && Notification.permission === "granted") {
      try { new Notification(title, { body: body }); } catch (e) {}
    }
    toast(title);
  }

  function checkReminders() {
    if (!settings.notify) return;
    const now = new Date();
    const hhmm = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
    const todayKey = todayDateStr();
    REMINDERS.forEach(r => {
      if (r.time === hhmm) {
        const fk = r.id + "_" + todayKey;
        if (settings.remindersFired[fk]) return;
        settings.remindersFired[fk] = true; saveSettings(settings);
        notify("💞 " + r.label, "情侣减脂打卡助手提醒你：" + r.label);
      }
    });
  }

  function switchTab(name) {
    $$(".tab-panel").forEach(p => p.classList.remove("active"));
    $$(".tab-btn").forEach(b => b.classList.remove("active"));
    $("#tab-" + name).classList.add("active");
    $('.tab-btn[data-tab="' + name + '"]').classList.add("active");
    if (name === "dashboard") renderDashboard();
    if (name === "plan") renderPlan(weekdayCN());
    if (name === "random") renderRandomTab();
  }

  function bindEvents() {
    $$(".tab-btn").forEach(b => b.onclick = () => switchTab(b.dataset.tab));
    $("#weatherToggle").onclick = () => {
      settings.weather = settings.weather === "sunny" ? "rain" : "sunny";
      saveSettings(settings); renderHeader();
      renderMaleSection(weekdayCN(), records[todayDateStr()]);
      toast(settings.weather === "sunny" ? "已切换为晴天 ☀️" : "已切换为雨天 🌧️");
    };
    $("#water").oninput = updateWaterBar;
    $$('input[name="femaleMode"]').forEach(r => r.onchange = () => {
      const mode = r.value;
      toggleFemaleMode(mode);
      if (mode === "solo") {
        const rec = records[todayDateStr()];
        if (rec && rec.female && rec.female.solo) showFemaleRandom(rec.female.solo, !!rec.female.solo.done);
        else drawTodayFemale(getCycle(weekdayCN()), $("#femaleFilter").value);
      }
    });
    $$("#ratingStars span").forEach(s => s.onclick = () => setRating(+s.dataset.v));
    $("#saveToday").onclick = saveToday;
    $("#resetToday").onclick = () => {
      if (confirm("确定清空今日表单？（不会删除已保存记录）")) { location.reload(); }
    };
    $("#randomPool").onchange = renderRandomTab;
    $("#randomFilter2").onchange = renderRandomTab;
    $("#randomDraw2").onclick = drawRandomTab;
    $$("#planSeg .seg-btn").forEach(b => b.onclick = () => {
      $$("#planSeg .seg-btn").forEach(x => x.classList.remove("active"));
      b.classList.add("active"); renderPlan(b.dataset.week);
    });
    document.body.addEventListener("click", e => {
      const btn = e.target.closest("[data-link]");
      if (btn) { openVideo(btn.dataset.link); }
    });
    $("#notifyToggle").onchange = () => {
      settings.notify = $("#notifyToggle").checked;
      saveSettings(settings);
      if (settings.notify && "Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().then(p => {
          $("#notifyStatus").textContent = p === "granted" ? "✅ 通知已开启" : "⚠️ 通知权限被拒绝，将无法推送";
        });
      } else {
        $("#notifyStatus").textContent = settings.notify ? "✅ 通知已开启（需授权）" : "通知已关闭";
      }
    };
    $("#notifyTest").onclick = () => notify("🔔 测试通知", "这是一条来自情侣减脂打卡助手的推送");
    $("#exportData").onclick = () => {
      const blob = new Blob([JSON.stringify({ records: records, settings: settings }, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = "couple_fatloss_backup.json"; a.click();
      toast("已导出数据");
    };
    $("#importData").onclick = () => $("#importFile").click();
    $("#importFile").onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const data = JSON.parse(rd.result);
          if (data.records) records = data.records;
          if (data.settings) settings = Object.assign(settings, data.settings);
          saveRecords(records); saveSettings(settings);
          toast("✅ 数据导入成功"); renderHeader(); loadTodayToForm();
        } catch (err) { toast("导入失败：JSON 格式错误"); }
      };
      rd.readAsText(f);
    };
    $("#clearData").onclick = () => {
      if (confirm("⚠️ 确定清空全部打卡数据？此操作不可恢复！")) {
        records = {}; saveRecords(records); toast("已清空全部数据"); renderDashboard(); loadTodayToForm();
      }
    };
  }

  function init() {
    updateStatusTime();
    setInterval(updateStatusTime, 30000);
    renderHeader();
    renderTip();
    loadTodayToForm();
    renderReminderList();
    renderParamDoc();
    $("#notifyToggle").checked = settings.notify;
    bindEvents();
    setInterval(renderTip, 60000);
    setInterval(checkReminders, 30000);
  }

  document.addEventListener("DOMContentLoaded", init);
})();

/* ============================================================
 * 家常菜单 · 同餐搭配规则引擎
 * ------------------------------------------------------------
 * 1) FLAGS：给每道菜打「营养特征标记」，菜品数据里用 f:['fat','sod'] 表示。
 * 2) RULES：规则引擎据标记判断「这一餐」是否存在搭配问题。
 * 3) MYTHS ：常见「食物相克」谣言的澄清，避免把谣言当规则。
 *
 * 声明：结论属营养学常识层面的提示，不是医学诊断，也不代表绝对禁忌。
 *       有慢性病、孕期、服药等情况请遵医嘱。
 * ============================================================ */

window.FLAGS = {
  fat:   { name: '油脂偏重',  ico: '🛢️', tip: '单份脂肪较高，或烹饪用油量大' },
  fry:   { name: '油炸',      ico: '🍟', tip: '高温油炸，吸油量最大的一种做法' },
  sod:   { name: '高钠',      ico: '🧂', tip: '盐、酱油、豆瓣、腌制品较多' },
  sug:   { name: '高糖',      ico: '🍬', tip: '糖醋、拔丝、蜜汁等含糖调味' },
  pur:   { name: '高嘌呤',    ico: '🦐', tip: '海鲜、动物内脏、浓肉汤、菌菇干品' },
  chol:  { name: '高胆固醇',  ico: '🥚', tip: '蛋黄、内脏、肥肉、鱿鱼等' },
  oxa:   { name: '高草酸',    ico: '🌿', tip: '菠菜、苋菜、竹笋、甜菜、花生红衣' },
  ca:    { name: '高钙',      ico: '🦴', tip: '豆腐、虾皮、奶制品、芝麻酱' },
  vc:    { name: '高维C',     ico: '🍋', tip: '青椒、番茄、西兰花、鲜枣、猕猴桃' },
  fib:   { name: '高纤维',    ico: '🥬', tip: '粗粮、菌藻、绿叶菜、豆类' },
  tan:   { name: '富含鞣酸',  ico: '🍵', tip: '柿子、浓茶、山楂、未熟香蕉' },
  iron:  { name: '富铁',      ico: '🩸', tip: '猪肝、鸭血、红肉、黑木耳' },
  k:     { name: '高钾',      ico: '🍌', tip: '土豆、香蕉、菌菇、豆类、紫菜' },
  cold:  { name: '性寒凉',    ico: '❄️', tip: '中医角度偏寒凉：螃蟹、苦瓜、西瓜、绿豆、冬瓜' },
  hot:   { name: '性温热',    ico: '🔥', tip: '中医角度偏温热：羊肉、辣椒、荔枝、韭菜' },
  sta:   { name: '高淀粉',    ico: '🍚', tip: '米面、土豆、红薯、粉条、山药' },
  pro:   { name: '高蛋白',    ico: '🥩', tip: '肉蛋豆奶等优质蛋白来源' },
  alc:   { name: '含酒精',    ico: '🍺', tip: '啤酒、黄酒、料酒入菜较多' },
  caf:   { name: '含咖啡因',  ico: '☕', tip: '浓茶、咖啡、可乐' },
  raw:   { name: '生食半熟',  ico: '🐟', tip: '刺身、溏心蛋、醉虾、半熟牛排' },
  milk:  { name: '乳制品',    ico: '🥛', tip: '牛奶、芝士、黄油、炼乳' },
  spicy: { name: '辛辣',      ico: '🌶️', tip: '辣椒、花椒、胡椒、生蒜用量较大' }
};

/* level: 3 = 建议调整（这餐尽量别这么配） / 2 = 注意（可以吃，但要控量） / 1 = 小提示（知道即可） */
window.RULES = [
  {
    id: 'pur-pur', level: 3, title: '高嘌呤 × 2 道以上', flags: ['pur'], min: 2,
    why: '嘌呤在体内代谢成尿酸。同一餐里海鲜、内脏、浓肉汤、干菌菇叠加，一餐的嘌呤负荷会明显偏高。',
    fix: '同一餐最多保留 1 道高嘌呤菜，撤掉浓汤，改配清淡蔬菜；记得多喝水。',
    who: '高尿酸 / 痛风发作期人群应直接避开这种组合；健康人偶尔一次问题不大，但别天天这么吃。'
  },
  {
    id: 'pur-alc', level: 3, title: '高嘌呤 + 酒精（海鲜配啤酒）', flags: ['pur', 'alc'], 
    why: '酒精会抑制尿酸排泄、并促进嘌呤分解，等于「一边多产、一边少排」，是痛风最常见的诱发组合。',
    fix: '把啤酒 / 黄酒换成白开水、苏打水或无糖茶；或把海鲜换成禽肉、豆制品。',
    who: '高尿酸、痛风、脂肪肝人群务必避免；这也是「海鲜啤酒痛风套餐」的来源。'
  },
  {
    id: 'pur-fat', level: 2, title: '高嘌呤 + 高脂', flags: ['pur', 'fat'],
    why: '高脂会降低尿酸排出效率，同时增加血脂负担，两者互为帮凶。',
    fix: '把其中一道换成蒸、煮、白灼的做法，或改用清汤代替浓汤。',
    who: '高尿酸合并血脂异常、脂肪肝人群要特别注意。'
  },
  {
    id: 'oxa-ca', level: 2, title: '高草酸 + 高钙（菠菜配豆腐类）', flags: ['oxa', 'ca'],
    why: '草酸会与钙结合成不易吸收的草酸钙，这一餐的钙基本白补了。注意：这并不会「中毒」，只是营养浪费。',
    fix: '绿叶菜先沸水焯 20–30 秒再炒，可去掉大部分草酸；或把补钙的菜放到另一餐。',
    who: '长身高的孩子、孕期哺乳期、骨质疏松人群最在意钙吸收，建议焯水后再同餐。'
  },
  {
    id: 'fat-fat', level: 2, title: '三道以上重油菜', flags: ['fat'], min: 3,
    why: '红烧、干煸、回锅、爆炒各来一道，一餐的油往往超过全天建议量的一半以上。',
    fix: '保证至少 2 道蒸煮白灼或凉拌菜，把其中一道重油菜改成清炒。',
    who: '减脂期、血脂异常、胆囊疾病人群尤其要注意。'
  },
  {
    id: 'fry-fry', level: 2, title: '两道油炸菜同桌', flags: ['fry'], min: 2,
    why: '油炸食品吸油率高，且高温易产生丙烯酰胺等有害物质，叠加后热量与氧化油脂摄入都偏高。',
    fix: '留一道就好，另一道换成清蒸、白灼或凉拌。',
    who: '所有人；每周油炸类建议不超过 2 次。'
  },
  {
    id: 'fat-chol', level: 2, title: '高脂 + 高胆固醇', flags: ['fat', 'chol'],
    why: '肥肉、内脏、蛋黄配重油做法，饱和脂肪与胆固醇同时抬高，对血脂最不友好。',
    fix: '把其中一道换成鱼虾、豆制品或瘦禽肉，增加蔬菜比例。',
    who: '高血脂、冠心病、胆结石人群建议避免。'
  },
  {
    id: 'sod-sod', level: 2, title: '三道以上重口味 / 腌制菜', flags: ['sod'], min: 3,
    why: '酱油、豆瓣酱、腌菜、卤味叠加，一餐钠摄入轻松超过 2000mg（成人全天建议 <2000mg，即食盐 <5g）。',
    fix: '留 1 道重口味的下饭菜，其余改成清炒、白灼；汤汁别拌饭。',
    who: '高血压、肾病、水肿、孕期人群要重点控制。'
  },
  {
    id: 'sug-sug', level: 2, title: '两道以上甜口菜', flags: ['sug'], min: 2,
    why: '糖醋、蜜汁、拔丝这类菜，一份的添加糖常常就有 15–25g。两份同桌，糖已经接近全天上限。',
    fix: '保留一道甜口菜做「开胃/收尾」，另一道改咸鲜口。',
    who: '控糖人群、脂肪肝、龋齿多的孩子。'
  },
  {
    id: 'sug-sta', level: 2, title: '甜口菜 + 大量主食', flags: ['sug', 'sta'],
    why: '糖与精制碳水同餐，血糖上升快、回落也快，容易「吃完就困、很快又饿」。',
    fix: '先吃蔬菜和蛋白，主食减半或换成杂粮饭，甜口菜放最后吃。',
    who: '糖尿病、胰岛素抵抗、多囊卵巢综合征人群要按这个顺序吃。'
  },
  {
    id: 'cold-cold', level: 2, title: '两道以上寒凉菜', flags: ['cold'], min: 2,
    why: '中医角度寒凉叠加易伤脾胃，现代营养学上则表现为生冷食物刺激胃肠、影响消化。',
    fix: '搭配姜、蒜、葱、胡椒等温性调味，或把其中一道改成热菜。',
    who: '脾胃虚寒（易腹泻、怕冷）、经期女性、老人小孩更明显。'
  },
  {
    id: 'cold-raw', level: 2, title: '生冷菜 + 生食半熟食材', flags: ['cold', 'raw'],
    why: '一餐里全是未经充分加热的食物，肠胃负担大，食源性致病菌风险也升高。',
    fix: '至少保留一道热菜；生食海鲜务必选正规渠道、隔餐不食。',
    who: '孕妇、儿童、老人、免疫力低下者应避免生食海鲜。'
  },
  {
    id: 'tan-pro', level: 2, title: '鞣酸 + 高蛋白（柿子配鱼虾蟹）', flags: ['tan', 'pro'],
    why: '鞣酸与蛋白质结合成不易消化的沉淀物，空腹大量吃还可能在胃里结成「胃石」，引起腹脹腹痛。',
    fix: '柿子、浓茶、山楂与高蛋白菜错开 2 小时以上；别空腹吃柿子。',
    who: '胃肠功能弱、有胃病史的人尤其注意。注意：虾+维C 会中毒是谣言，但「柿子+高蛋白」确实要避。'
  },
  {
    id: 'caf-iron', level: 1, title: '浓茶 / 咖啡 与 富铁食物同桌', flags: ['caf', 'iron'],
    why: '茶多酚与咖啡因会抑制非血红素铁吸收，餐后马上喝浓茶，铁的吸收率可明显下降。',
    fix: '餐后 1 小时再喝茶；补铁餐旁边配点维C（如青椒、番茄）反而促进吸收。',
    who: '缺铁性贫血、孕期、经期女性、素食者。'
  },
  {
    id: 'fib-ca', level: 1, title: '高纤维 + 高钙', flags: ['fib', 'ca'],
    why: '膳食纤维、植酸会与钙结合，略微降低钙吸收率。',
    fix: '不用刻意避开，只要保证奶制品、豆制品分布在全天不同餐次即可。',
    who: '需要重点补钙的人群。'
  },
  {
    id: 'k-k', level: 2, title: '三道以上高钾菜', flags: ['k'], min: 3,
    why: '高钾对多数人是好事，但肾功能不佳者排钾能力下降，容易出现高血钾。',
    fix: '肾功能不全者把蔬菜先切小块焯水再炒，可去掉部分钾；控制总量。',
    who: '慢性肾病 / 透析人群需遵医嘱；健康人无须担心。'
  },
  {
    id: 'spicy-spicy', level: 2, title: '两道以上重辣菜', flags: ['spicy'], min: 2,
    why: '辣椒素叠加刺激胃黏膜、加快肠道蠕动，容易反酸、烧心、腹泻。',
    fix: '配一杯温牛奶或酸奶，主食配米饭（别配酒）；留一道清淡菜中和。',
    who: '胃炎、胃溃疡、痔疮、肠易激人群。'
  },
  {
    id: 'pro-pro', level: 1, title: '三道以上大荤', flags: ['pro'], min: 3,
    why: '一餐蛋白总量过高，消化负担重，也挤掉了蔬菜的位置。',
    fix: '按「1 道荤 + 1 道半荤 + 2 道素 + 1 道汤」结构点菜，荤菜留 1–2 道足够。',
    who: '消化功能弱、痛风、肾病人群。'
  },
  {
    id: 'sta-sta', level: 1, title: '三道以上主食类', flags: ['sta'], min: 3,
    why: '土豆、粉条、山药、米面同理，都是碳水，一起吃相当于主食翻倍。',
    fix: '把土豆丝、粉条、山药当成主食替换品，米饭相应减量。',
    who: '控糖、减脂人群。'
  },
  {
    id: 'fat-cold', level: 1, title: '重油 + 生冷', flags: ['fat', 'cold'],
    why: '油腻食物本就延缓胃排空，再配生冷刺激，容易腹胀、腹泻。',
    fix: '重油菜旁边配温热的清汤，而不是冰饮。',
    who: '脾胃虚弱、胆囊疾病人群。'
  },
  {
    id: 'hot-cold', level: 1, title: '大热 + 大寒同餐', flags: ['hot', 'cold'],
    why: '中医「寒热相激」的说法，现代角度看是冷热刺激叠加，胃肠敏感者容易不适。',
    fix: '比如涮羊肉配西瓜，建议把西瓜挪到餐后 1 小时。',
    who: '肠胃敏感人群；健康人偶尔一次无妨。'
  },
  {
    id: 'milk-oxa', level: 1, title: '牛奶 / 奶制品 + 高草酸', flags: ['milk', 'oxa'],
    why: '牛奶中的钙同样会被草酸结合而损失，还可能在胃里形成絮状物（无害，但不舒服）。',
    fix: '喝奶和吃菠菜、竹笋错开 1–2 小时。',
    who: '儿童长高、补钙人群。'
  }
];

/* 常见「食物相克」谣言澄清：很多流传很广的禁忌其实不成立，别当成规则用 */
window.MYTHS = [
  { id: 'vc-shrimp', claim: '维生素C + 虾 = 砒霜', verdict: '谣言',
    fact: '该说法源自「虾中五价砷被维C还原为三价砷」的推演。实际虾的有机砷毒性极低，要吃到中毒剂量需一次吃下上百公斤虾。正常吃完全没事。' },
  { id: 'spinach-tofu', claim: '菠菜 + 豆腐 会得结石', verdict: '半对',
    fact: '草酸确实会和钙结合，但结合发生在肠道里，反而减少了草酸被吸收，降低肾结石风险。真正要注意的是「钙没补上」，菠菜焯水即可解决。' },
  { id: 'soymilk-egg', claim: '豆浆 + 鸡蛋 相克', verdict: '谣言',
    fact: '两者都是优质蛋白。唯一问题是「没煮透的豆浆」含胰蛋白酶抑制剂，会影响蛋白吸收并引起恶心——煮到沸腾后再煮 5 分钟就没问题。' },
  { id: 'carrot-radish', claim: '胡萝卜 + 白萝卜 破坏营养', verdict: '依据不足',
    fact: '胡萝卜中的抗坏血酸氧化酶确实会氧化维C，但加热后酶已失活，且日常食量下的损失微不足道。' },
  { id: 'milk-orange', claim: '牛奶 + 橘子 会沉淀中毒', verdict: '谣言',
    fact: '酸性环境下牛奶蛋白会絮凝，这是胃里的正常消化过程，不是变质也不是中毒。只是口感不好而已。' },
  { id: 'crab-persimmon', claim: '螃蟹 + 柿子 同吃中毒', verdict: '真的要注意',
    fact: '不是中毒，但风险真实：鞣酸 + 高蛋白易在胃里结成胃石，再加上螃蟹性寒、可能不新鲜，两者同食容易腹痛腹泻。建议错开 2 小时。' },
  { id: 'durian-alcohol', claim: '榴莲 + 酒 会致命', verdict: '真的危险',
    fact: '榴莲含硫化合物会抑制乙醛脱氢酶，导致酒精代谢产物乙醛堆积，可能引起心悸、面红、血压骤升。这条要当真。' },
  { id: 'seafood-vitc-hot', claim: '海鲜配橙汁等于吃砒霜', verdict: '谣言',
    fact: '同第一条。真正该避的是「海鲜 + 啤酒」（痛风）与「生食海鲜」（致病菌/寄生虫）。' },
  { id: 'potato-beef', claim: '土豆 + 牛肉 相克伤胃', verdict: '谣言',
    fact: '土豆炖牛肉是最经典的搭配之一。唯一提示：土豆是主食，吃了它记得少盛半碗饭。' },
  { id: 'eggs-cold', claim: '感冒不能吃鸡蛋', verdict: '依据不足',
    fact: '鸡蛋提供优质蛋白，有助恢复。发烧期间若食欲差可吃蒸蛋羹等好消化的做法，并注意补水。' },
  { id: 'grapefruit-drug', claim: '只有菜才讲究搭配', verdict: '药物更要注意',
    fact: '西柚（葡萄柚）会抑制肝药酶 CYP3A4，与他汀类降脂药、部分降压药、抗心律失常药同服会升高血药浓度，这是真正需要严格避开的「搭配」。服药期间请咨询医生或药师。' }
];

/* ============================================================
 * 规则引擎
 * ============================================================ */

function flagsOf(dish) { return (dish && dish.f) || []; }

function hasAll(dish, flags) { return flags.every(f => flagsOf(dish).indexOf(f) >= 0); }

/**
 * 分析一餐：dishes 是已点菜品数组
 * 返回 { hits:[{rule, dishes}], score, level }
 */
window.analyzeMeal = function (dishes) {
  const list = (dishes || []).filter(Boolean);
  const hits = [];
  window.RULES.forEach(function (rule) {
    if (rule.flags.length === 1) {
      const f = rule.flags[0];
      const hit = list.filter(d => flagsOf(d).indexOf(f) >= 0);
      const need = rule.min || 2;
      if (hit.length >= need) hits.push({ rule: rule, dishes: hit, count: hit.length });
    } else {
      const used = [];
      let ok = true;
      rule.flags.forEach(function (f) {
        const pick = list.find(d => flagsOf(d).indexOf(f) >= 0 && used.indexOf(d) < 0);
        if (!pick) { ok = false; return; }
        used.push(pick);
      });
      if (ok && used.length) hits.push({ rule: rule, dishes: used, count: used.length });
    }
  });
  hits.sort((a, b) => b.rule.level - a.rule.level || b.count - a.count);

  let score = 100;
  hits.forEach(function (h) {
    score -= h.rule.level === 3 ? 14 : h.rule.level === 2 ? 7 : 3;
  });
  // 结构加分/扣分
  const cats = list.map(d => d.cat);
  const veg = cats.filter(c => c === '素菜' || c === '凉菜').length;
  const meat = cats.filter(c => c === '荤菜' || c === '水产').length;
  const soup = cats.filter(c => c === '汤羹').length;
  if (list.length >= 3) {
    if (veg === 0) score -= 10;
    if (veg >= 2) score += 4;
    if (meat > 2) score -= 4;
    if (soup >= 1) score += 3;
  }
  score = Math.max(30, Math.min(100, Math.round(score)));

  // 结构建议
  const suggests = [];
  if (list.length >= 3) {
    if (veg === 0) suggests.push({ t: '这餐没有蔬菜', d: '加 1–2 道绿叶菜或凉拌菜，能显著降低这一餐的油脂与升糖速度。', cat: '素菜' });
    if (soup === 0) suggests.push({ t: '缺一碗汤', d: '配一道清淡汤羹，能减少吃菜时的油盐摄入欲望，也更容易饱。', cat: '汤羹' });
    if (meat === 0) suggests.push({ t: '蛋白来源偏少', d: '加一道鸡蛋、豆腐或鱼虾，饱腹感更久，也不容易餐后想吃零食。', cat: '荤菜' });
    if (meat > 2) suggests.push({ t: '荤菜偏多', d: '建议留 1–2 道荤菜，其余替换成素菜，消化负担会轻很多。', cat: '素菜' });
  }
  return { hits: hits, score: score, suggests: suggests, veg: veg, meat: meat, soup: soup };
};

/** 单道菜：找出菜库中与它「不宜同餐」的菜 */
window.conflictsOf = function (dish, allDishes) {
  const out = [];
  (allDishes || []).forEach(function (other) {
    if (!other || other.id === dish.id) return;
    window.RULES.forEach(function (rule) {
      if (rule.flags.length === 1) {
        const f = rule.flags[0];
        if (rule.min > 2) return;               // 需要 3 道以上才触发的规则，单看两菜不提示
        if (flagsOf(dish).indexOf(f) >= 0 && flagsOf(other).indexOf(f) >= 0) {
          out.push({ dish: other, rule: rule });
        }
      } else {
        const combined = flagsOf(dish).concat(flagsOf(other));
        if (rule.flags.every(f => combined.indexOf(f) >= 0)) {
          out.push({ dish: other, rule: rule });
        }
      }
    });
  });
  // 去重：同一道菜只保留最严重的一条规则
  const seen = {}, res = [];
  out.sort((a, b) => b.rule.level - a.rule.level);
  out.forEach(function (o) {
    if (seen[o.dish.id]) return;
    seen[o.dish.id] = 1;
    res.push(o);
  });
  return res.slice(0, 10);
};

/** 提示等级 -> 文案 */
window.scoreLabel = function (score) {
  if (score >= 92) return { level: 'ok', text: '这一餐搭配很均衡', ico: '✅' };
  if (score >= 80) return { level: 'info', text: '整体不错，有 1–2 处可优化', ico: '👍' };
  if (score >= 65) return { level: 'warn', text: '有几处搭配需要留意', ico: '⚠️' };
  return { level: 'bad', text: '这餐搭配偏重口 / 偏油，建议调整', ico: '🚨' };
};

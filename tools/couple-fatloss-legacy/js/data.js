/* =========================================================================
 * 情侣双人减脂打卡助手 — 数据层
 * 来源：用户提供的「终极完整版｜情侣减脂7天结构化打卡方案」全量 JSON
 * 说明：所有素材库内置（APP 联网随机调取即在本地素材库中随机抽取，
 *      如需真正联网可把 drawRandomWorkout 接口替换为远程 API）。
 * ========================================================================= */
window.PLAN = {
  app_name: "情侣双人减脂打卡助手",
  cycle_type: "7天循环周期",
  cycle_split: {
    fat_loss_days: ["周一", "周二", "周三", "周四"],
    cheat_days: ["周五", "周六", "周日"]
  },
  user_role: ["男主", "女主"],
  calorie_limit: {
    male_fat_loss: 1600,
    male_cheat: 1900,
    female_fat_loss: 1200,
    female_cheat: 1500
  },
  global_rule: {
    water_daily: 2000,
    forbidden_food: ["含糖饮料", "油炸食品", "奶油甜品", "酒精"],
    cook_way_fat_loss: "蒸/煮/少油清炒，油脂≤10g/餐",
    cook_way_cheat: "蒸/煮/清炒，油脂≤15g/餐",
    eat_time_rule: "早餐7-9点，午餐11:30-13:30，晚餐17:30-19:00，20点后禁食",
    warm_up: "每日10分钟热身+5分钟放松拉伸",
    male_aerobic_rule: {
      normal_weather: "5公里慢跑，消耗380kcal",
      rain_weather: "跳绳3800次，等价5km跑步热量，1000次跳绳≈100kcal"
    },
    female_workout_rule: {
      mode: "单人独立训练，无强制固定计划，每日联网随机抽取",
      fat_loss_pool: "高强度单人减脂训练库（周一~周四抽取）",
      cheat_pool: "低强度舒缓塑形库（周五~周日抽取）",
      random_refresh: "每日可无限次点击「重新随机推荐」更换当日训练",
      filter_option: ["无跑跳", "新手友好", "矿泉水瓶器械", "全身燃脂", "局部塑形"],
      standard: "每次随机方案=主有氧+局部塑形+配套跟练视频链接"
    }
  },
  daily_check_form: [
    "周期标签(减脂日/放纵日)",
    "当日天气(晴天/雨天)",
    "早餐(清单/热量/是否达标)",
    "午餐(清单/热量/是否达标)",
    "晚餐(清单/热量/是否达标)",
    "加餐(有无/热量)",
    "当日饮水量ml",
    "【男生运动】有氧记录：跑步公里/跳绳个数",
    "【男生运动】配套力量视频是否完成(是/否)",
    "【女生运动】训练模式：单人随机训练 / 跟随情侣休闲运动",
    "【女生运动】当日随机训练名称+时长",
    "【女生运动】单人跟练视频(可点击跳转)+完成勾选",
    "双人分开体重记录kg(男主/女主)",
    "当日自评1-5分",
    "备注"
  ],
  diet_plan: {
    fat_loss: {
      "周一": {
        breakfast_male: "全麦面包2片+水煮蛋2个+无糖豆浆300ml+小苹果1个",
        breakfast_female: "全麦面包1片+水煮蛋1个+无糖豆浆200ml+小苹果半个",
        lunch_male: "杂粮饭150g+香煎鸡胸肉180g+西兰花200g+菠菜150g",
        lunch_female: "杂粮饭100g+香煎鸡胸肉120g+西兰花150g+菠菜100g",
        dinner_male: "蒸紫薯80g+清蒸巴沙鱼150g+油麦菜300g",
        dinner_female: "蒸紫薯50g+清蒸巴沙鱼100g+油麦菜200g",
        snack: "无糖酸奶150g（可选）"
      },
      "周二": {
        breakfast_male: "玉米1根+水煮蛋2个+纯牛奶300ml+蓝莓小盒",
        breakfast_female: "半根玉米+水煮蛋1个+纯牛奶200ml+蓝莓半盒",
        lunch_male: "干荞麦面80g+瘦牛肉150g+金针菇+娃娃菜",
        lunch_female: "干荞麦面50g+瘦牛肉100g+金针菇+娃娃菜",
        dinner_male: "白灼虾200g+生菜350g（无主食）",
        dinner_female: "白灼虾130g+生菜250g（无主食）",
        snack: "黄瓜1根（可选）"
      },
      "周三": {
        breakfast_male: "纯燕麦50g+水煮蛋2个+橙子1个",
        breakfast_female: "纯燕麦30g+水煮蛋1个+橙子半个",
        lunch_male: "红薯180g+瘦猪肉160g+芹菜+荷兰豆",
        lunch_female: "红薯120g+瘦猪肉110g+芹菜+荷兰豆",
        dinner_male: "山药100g+嫩豆腐250g+凉拌海带丝",
        dinner_female: "山药60g+嫩豆腐180g+凉拌海带丝",
        snack: "小番茄200g（可选）"
      },
      "周四": {
        breakfast_male: "全麦包子2个+无糖酸奶250ml+猕猴桃1个",
        breakfast_female: "全麦包子1个+无糖酸奶180ml+猕猴桃半个",
        lunch_male: "糙米饭140g+去皮鸡腿180g+冬瓜+小白菜",
        lunch_female: "糙米饭90g+去皮鸡腿120g+冬瓜+小白菜",
        dinner_male: "龙利鱼160g+凉拌黄瓜+菌菇（无主食）",
        dinner_female: "龙利鱼110g+凉拌黄瓜+菌菇（无主食）",
        snack: "水煮蛋白1个（可选）"
      }
    },
    cheat: {
      "周五": {
        breakfast: "沿用减脂早餐标准",
        lunch: "清汤牛肉拉面（少面多牛肉青菜，无红油）",
        dinner: "自制瘦肉类烤肉+大量生菜，少量低脂辣酱",
        cheat_food: "小块无糖蛋糕 / 三分糖奶茶（二选一）"
      },
      "周六": {
        breakfast: "少油鸡蛋蔬菜煎饼（无薄脆）",
        lunch: "家常瘦肉炒菜+正常米饭，避开肥肉重油",
        dinner: "薄底鸡肉蔬菜披萨1-2片，少芝士",
        cheat_food: "无糖酸奶基底水果捞小份"
      },
      "周日": {
        breakfast: "沿用减脂早餐标准",
        lunch: "清汤轻火锅（海鲜、瘦肉、蔬菜，少粉条丸子）",
        dinner: "杂粮粥+清蒸瘦肉+清炒时蔬",
        cheat_food: "10g以内原味坚果小包"
      }
    }
  },
  sport_plan: {
    fat_loss_daily: {
      "周一": {
        male: "晴天5km慢跑 / 雨天3800次跳绳 + 双人平板支撑3组×40s",
        female: "联网随机抽取单人高强度减脂训练（独立完成，不强制结伴）"
      },
      "周二": {
        male: "晴天5km慢跑 / 雨天3800次跳绳 + 深蹲弓步臀腿4组",
        female: "联网随机抽取单人高强度减脂训练（独立完成，不强制结伴）"
      },
      "周三": {
        male: "晴天5km慢跑 / 雨天3800次跳绳 + 35分钟双人帕梅拉燃脂操 + 卷腹核心训练",
        female: "联网随机抽取单人高强度减脂训练（独立完成，不强制结伴）"
      },
      "周四": {
        male: "晴天5km慢跑 / 雨天3800次跳绳 + 矿泉水瓶上肢塑形",
        female: "联网随机抽取单人高强度减脂训练（独立完成，不强制结伴）"
      }
    },
    cheat_daily: {
      "周五": {
        male: "30分钟情侣散步 + 全身拉伸塑形，无跑步/跳绳",
        female: "二选一：1.联网随机单人低强度舒缓训练 2.跟随男生散步拉伸"
      },
      "周六": {
        male: "28分钟双人舒缓瑜伽，无跑步/跳绳",
        female: "二选一：1.联网随机单人低强度舒缓训练 2.跟随男生双人瑜伽"
      },
      "周日": {
        male: "35分钟休闲骑行，骑行后腿部拉伸，无跑步/跳绳",
        female: "二选一：1.联网随机单人低强度舒缓训练 2.跟随男生骑行拉伸"
      }
    }
  },
  video_resource: {
    male_fixed_video: {
      "周一": [
        { video_name: "双人平板支撑核心训练（情侣搭档版）", video_link: "https://www.bilibili.com/video/BV1MZ4y1Y7fR", video_tag: ["核心", "居家无器械", "双人同步"] }
      ],
      "周二": [
        { video_name: "15分钟情侣无器械臀腿燃脂，新手友好", video_link: "https://www.bilibili.com/video/BV1aA411L7sG", video_tag: ["臀腿", "塑形", "燃脂"] }
      ],
      "周三": [
        { video_name: "帕梅拉双人全身暴汗燃脂操", video_link: "https://www.bilibili.com/video/BV1qt4y1s7XQ", video_tag: ["全身暴汗", "高强度", "双人同步"] },
        { video_name: "居家卷腹核心训练", video_link: "https://www.bilibili.com/video/BV1wK4y1k7vC", video_tag: ["腹部", "核心强化"] }
      ],
      "周四": [
        { video_name: "12分钟居家手臂肩背塑形，矿泉水瓶替代哑铃", video_link: "https://www.bilibili.com/video/BV15t4y1D7zr", video_tag: ["上肢塑形", "瘦肩", "瘦拜拜肉"] }
      ],
      "周五": [
        { video_name: "10分钟运动后舒缓拉伸，缓解全身酸痛", video_link: "https://www.bilibili.com/video/BV1ZY4y1b7hE", video_tag: ["拉伸", "放松", "低强度"] }
      ],
      "周六": [
        { video_name: "28分钟情侣舒缓减脂瑜伽，饭后可练", video_link: "https://www.bilibili.com/video/BV19s4y1x7aM", video_tag: ["瑜伽", "舒缓", "体态矫正"] }
      ],
      "周日": [
        { video_name: "5分钟腿部放松拉伸（骑行专用）", video_link: "https://www.bilibili.com/video/BV1mY4y1N7vF", video_tag: ["腿部放松", "简易拉伸"] }
      ]
    },
    female_random_fat_loss_pool: [
      { workout_name: "25分钟Eleni Fit无跑跳全身燃脂", duration: 25, difficulty: "中等", equip: "无器械", target: "全身燃脂、不伤膝盖", video_link: "https://www.bilibili.com/video/BV1mG411x7QH", tag: ["大基数友好", "无跳跃", "单人居家"] },
      { workout_name: "30分钟帕梅拉HIIT暴汗燃脂", duration: 30, difficulty: "偏高", equip: "无器械", target: "快速刷脂、提代谢", video_link: "https://www.bilibili.com/video/BV1qt4y1s7XQ", tag: ["HIIT", "暴汗", "小基数减脂"] },
      { workout_name: "20分钟周六野全身塑形燃脂操", duration: 20, difficulty: "低-中等", equip: "无器械", target: "瘦腰腹、改善体态", video_link: "https://www.bilibili.com/video/BV1ZY4y1b7hE", tag: ["新手友好", "体态矫正", "站立无深蹲"] },
      { workout_name: "18分钟矿泉水瓶肩背手臂塑形", duration: 18, difficulty: "中等", equip: "矿泉水瓶2个", target: "瘦拜拜肉、直角肩", video_link: "https://www.bilibili.com/video/BV15t4y1D7zr", tag: ["上肢塑形", "办公室可练", "负重轻"] },
      { workout_name: "22分钟安娜臀腿紧致训练", duration: 22, difficulty: "中等偏高", equip: "无器械", target: "提臀、瘦腿、改善假胯宽", video_link: "https://www.bilibili.com/video/BV1aA411L7sG", tag: ["臀腿塑形", "居家无器械"] },
      { workout_name: "15分钟站立腹部马甲线训练", duration: 15, difficulty: "中等", equip: "无器械", target: "平坦小腹、消除侧腰赘肉", video_link: "https://www.bilibili.com/video/BV1MZ4y1Y7fR", tag: ["核心", "站立不卷腹", "懒人收腹"] }
    ],
    female_random_cheat_pool: [
      { workout_name: "28分钟双人舒缓瑜伽（单人可独立练习）", duration: 28, difficulty: "低", equip: "瑜伽垫", target: "放松拉伸、缓解水肿", video_link: "https://www.bilibili.com/video/BV19s4y1x7aM", tag: ["舒缓瑜伽", "饭后可练", "消肿"] },
      { workout_name: "12分钟全身舒缓拉伸", duration: 12, difficulty: "极低", equip: "无器械", target: "肌肉放松、缓解酸痛", video_link: "https://www.bilibili.com/video/BV1ZY4y1b7hE", tag: ["拉伸", "运动后修复", "生理期可用"] },
      { workout_name: "20分钟低强度有氧燃脂舞", duration: 20, difficulty: "低", equip: "无器械", target: "轻度消耗、快乐减脂", video_link: "https://www.bilibili.com/video/BV1wK4y1k7vC", tag: ["燃脂舞", "轻松无压力", "低心率"] },
      { workout_name: "10分钟腿部放松拉伸（骑行/散步后）", duration: 10, difficulty: "极低", equip: "无器械", target: "消除小腿粗壮、放松下肢", video_link: "https://www.bilibili.com/video/BV1mY4y1N7vF", tag: ["瘦腿拉伸", "休闲运动配套"] }
    ]
  },
  app_data_statistics_module: [
    "双人每周体重变化曲线（男女分线展示）",
    "每日热量达标率统计（男女分开计算）",
    "男主跑步公里/跳绳完成次数月度汇总（晴雨天拆分）",
    "女生随机训练完成次数、训练类型分类统计",
    "运动完成率排行榜（情侣独立对比）",
    "放纵餐超标次数记录",
    "月度减脂数据汇总报表",
    "跟练视频完成打卡记录（男女分开统计）"
  ]
};

/* 星期中文 -> 英文 key 映射，便于与 JS Date 配合 */
window.WEEK_CN = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

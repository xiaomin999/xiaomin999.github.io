# 我的工具箱 · 入口导航

个人自建工具的统一入口页。访问 **https://xiaomin999.github.io** 即可打开。

## 这个仓库是什么

一个纯静态的个人工具门户。根 `index.html` 是导航页，所有本地工具站放在 `tools/` 下各子目录，每个工具都有独立可访问的线上地址。

```
/
├── index.html          导航门户（图标网格 + 搜索 + 分类筛选 + 最近使用）
├── manifest.json       PWA 清单（可"添加到主屏幕"当 App 用）
├── sw.js               离线缓存
├── icons/              应用图标 192 / 512
└── tools/              各工具站点，每个目录一个站
    ├── ielts-prep/             雅思学习平台
    ├── study-workbench/        学习工作台 · 四合一
    ├── career-study-plan/      小陈自用学习计划
    ├── goal-tracker/           学习目标管理台
    ├── fund-workbench/         基金交易判断工作台
    ├── self-discipline-hub/    小助理自律工作台
    ├── office-workbench/       个人办公台
    ├── data-analysis-workbench/ 数据分析工作台
    ├── whiteboard/             Boardly 协作白板
    ├── gzh-ai-writer/          公众号 AI 写作工作台
    └── couple-fatloss-legacy/  初代减脂打卡助手（归档）
```

## 工具清单

**健康生活**
| 工具 | 地址 |
|---|---|
| 肥肉减速带（双人减脂打卡） | https://couple-fatloss-couple-fatloss-d6ghlrds87c015969.webapps.tcloudbase.com |
| 配料表风险扫描 | https://xiaomin999.github.io/ingredient-risk-scanner/ |
| 初代减脂打卡助手（归档） | `/tools/couple-fatloss-legacy/` |

**搞钱与财务**
| 工具 | 地址 |
|---|---|
| 电商作战室 | https://xiaomin999.github.io/ecom-warroom/ |
| 副业收集工作台 | https://xiaomin999.github.io/side-hustle-hub/ |
| 基金交易判断工作台 | `/tools/fund-workbench/` |
| 简记 · 记账 | https://xiaomin999.github.io/jianji/ |

**学习成长**
| 工具 | 地址 |
|---|---|
| 雅思学习平台 | `/tools/ielts-prep/` |
| 学习工作台 · 四合一 | `/tools/study-workbench/` |
| 小陈自用学习计划 | `/tools/career-study-plan/` |
| 学习目标管理台 | `/tools/goal-tracker/` |

**效率工具**
| 工具 | 地址 |
|---|---|
| 小助理自律工作台 | `/tools/self-discipline-hub/` |
| 个人办公台 | `/tools/office-workbench/` |
| 数据分析工作台 | `/tools/data-analysis-workbench/` |
| Boardly 协作白板 | `/tools/whiteboard/` |
| 公众号 AI 写作工作台 | `/tools/gzh-ai-writer/` |

## 维护方式

### 改导航页
直接编辑根 `index.html`。工具清单在 `<script>` 顶部的 `TOOLS` 数组里，一项一个工具：

```js
{ cat:"健康生活", name:"工具名", desc:"一句话描述",
  url:"tools/新站/", host:"本站", icon:"i-xxx",
  g:"linear-gradient(135deg,#色1,#色2)", live:1 }
```

- `icon` 取值对应页面顶部 `<defs>` 里的 SVG 图标 id（`i-dumbbell`、`i-scan`、`i-cart` …），新增图标先在那里加 `<g id="i-xxx">`。
- `live:0` 会显示成灰色归档样式。
- `url` 用**相对路径**（`tools/xxx/`），这样本地双击打开和线上访问都能正确跳转。

### 加一个新工具站
1. 把站点目录放进 `tools/<slug>/`，确保里面有 `index.html`
2. 在 `TOOLS` 数组里加一条
3. push 即可，GitHub Pages 自动发布

### 本地预览
```bash
cd tools-hub
python -m http.server 8080
# 打开 http://127.0.0.1:8080
```

不要直接双击 `index.html`——部分工具依赖摄像头等 API，`file://` 协议下会被浏览器拦截。

## 注意

- 站点包内**已清理所有硬编码密钥**（Supabase / 大模型 API Key），需要云同步或 AI 的站点会降级为本地模式。想在线上启用完整功能，请改成运行时填入 key 或走后端代理，不要把 key 写进仓库。
- 仓库是公开的（GitHub Pages 免费版要求）。**任何新加的站点，push 前先确认没有 token、密码、个人隐私数据。**
- 标着 `github.io` 域名的那几个工具（电商作战室、副业工作台、配料表风险扫描、简记、肥肉减速带）走的是各自独立的部署，**不在本仓库内**，这里只做外链聚合。改它们要去对应的仓库。

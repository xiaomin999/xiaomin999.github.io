/* ============================================================
 * 日迹 · 备忘录工作台  ——  云端配置
 * ============================================================
 * 【怎么填】
 *   1) 打开 https://supabase.com 登录 → 进你 couple-fatloss 那个项目
 *   2) 左侧 Project Settings（齿轮）→ API Keys / API
 *   3) 复制 Project URL  → 填到下面 url
 *   4) 复制 anon public key（一定是 anon，不是 service_role）→ 填到下面 anonKey
 *   5) 保存这个文件，刷新页面即可
 *
 * 【注意】
 *   · 浏览器直连 Supabase 要求页面跑在 http/https 下，
 *     直接双击打开 index.html（file://）会 Origin:null 报错。
 *     本地预览请用：http-server 127.0.0.1:8080
 *   · 两个都留空时 = 纯本地模式，功能完全可用，只是不跨设备。
 *   · 这个文件不要传到公开仓库或发到群里。
 * ============================================================ */

window.MEMO_SUPABASE = {
  url: "",
  anonKey: ""
};

/* 共享空间码：你和他两台设备必须填【完全一样】的字符串，才能看到同一份记录。
 * 改这里，或者到「设置 → 共享空间码」里改（推荐，改完自动生效）。 */
window.MEMO_WORKSPACE_DEFAULT = "memo-shared";

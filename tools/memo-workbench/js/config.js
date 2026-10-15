/* ============================================================
 * 日迹 · 备忘录工作台  ——  云端连接配置（一般不用改这个文件）
 * ============================================================
 * 【推荐做法：连接信息填在「设置页」里，不要写进本文件】
 *   打开工作台 → 设置 → 云端同步 → 连接信息，把
 *     · Project URL（下面已帮你填好）
 *     · anon public key
 *   粘进去，点「保存并连接」即可。
 *   它只保存在【各自设备的浏览器】里（localStorage），不会进任何文件/仓库。
 *   你和他两台设备各粘一次（内容一样）就能同步。
 *
 * 【⚠️ 部署到公开站点（如 GitHub Pages）时，anonKey 务必保持为空】
 *   anon key 一旦进了公开仓库，任何人拿到它就能读写你的历史记录。
 *   留空 = 传上去的站点默认「未连接」，靠设置页粘贴来连，最安全。
 *   （url 不是密钥，公开无妨，所以这里保留。）
 *
 * 【取值位置】Supabase 控制台 → 你的项目 → Settings(齿轮) → API
 *   · Project URL      → url
 *   · anon public key  → anonKey（一定是 anon，不是 service_role）
 *
 * 【注意】浏览器直连 Supabase 要求页面跑在 http/https 下；
 *   双击打开 index.html（file://）会 Origin:null 报错。
 *   本地预览请用：http-server 127.0.0.1:8080
 * ============================================================ */

window.MEMO_SUPABASE = {
  url: "https://hrcnpjshuwlwtnwaecot.supabase.co",
  anonKey: ""
};

/* 共享空间码：你和他两台设备必须填【完全一样】的字符串，才能看到同一份记录。
 * 改这里，或者到「设置 → 共享空间码」里改（推荐，改完自动生效）。 */
window.MEMO_WORKSPACE_DEFAULT = "memo-shared";

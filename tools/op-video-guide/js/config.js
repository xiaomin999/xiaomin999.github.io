/* ============================================================
 * Supabase 配置（云端同步用，可选）
 * ------------------------------------------------------------
 * 本仓库（xiaomin999.github.io）为【公开仓库】，出于安全考虑，
 * 这里已把真实的 url / anonKey 留空。
 *
 * 留空后工具仍可正常运行：所有数据走「本机缓存（localStorage）」模式，
 * 只是不跨设备云端同步。原版 setup.sql 里的 anon 策略是
 * 「全员可读写」（for all to anon using (true) with check (true)），
 * 一旦暴露真实 url + anonKey，任何人都能读写/删除你的数据与视频桶，
 * 因此门户版默认关闭云端同步。
 *
 * 若你要在自己的设备上开启云端同步：
 *   1. 在 Supabase 新建项目，执行本地 setup.sql 初始化表与桶；
 *   2. 把下面的 url 改成你的项目地址（形如 https://xxxx.supabase.co）；
 *   3. anonKey 填项目的 anon public key（本就公开在前端，无需保密）；
 *   4. 建议把 setup.sql 的开放策略收紧为「仅自己可写」，避免被他人篡改。
 * ============================================================ */
window.SUPABASE_CONFIG = {
  url: "",
  anonKey: "",
  // 视频存哪个桶（建表 SQL 里会一并创建）
  bucket: "guide-videos",
  // 元数据存哪张表（建表 SQL 里会一并创建）
  table: "operation_guides"
};

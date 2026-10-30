/* ============================================================
 * 极简 Supabase 封装（不依赖官方 SDK，避免微信里 CDN 拉不到）
 * 只用 fetch 直接打 REST + Storage 接口，和「健康助手」思路一致。
 * ============================================================ */
window.SB = (function () {
  'use strict';
  var C = window.SUPABASE_CONFIG;
  var REST = C.url + '/rest/v1';
  var STORE = C.url + '/storage/v1';
  var BUCKET = C.bucket || 'guide-videos';
  var TABLE = C.table || 'operation_guides';

  function headers(extra) {
    var h = { 'apikey': C.anonKey, 'Authorization': 'Bearer ' + C.anonKey };
    if (extra) { for (var k in extra) h[k] = extra[k]; }
    return h;
  }

  // 列出全部记录（按创建时间倒序）
  function listGuides() {
    return fetch(REST + '/' + TABLE + '?select=*&order=created_at.desc', { headers: headers() })
      .then(function (r) { if (!r.ok) throw new Error('读取失败 HTTP ' + r.status); return r.json(); });
  }

  // 新增一条记录
  function insertGuide(row) {
    return fetch(REST + '/' + TABLE, {
      method: 'POST',
      headers: headers({ 'Content-Type': 'application/json', 'Prefer': 'return=representation' }),
      body: JSON.stringify([row])
    }).then(function (r) { if (!r.ok) throw new Error('保存失败 HTTP ' + r.status); return r.json(); });
  }

  // 删除一条记录
  function deleteGuide(id) {
    return fetch(REST + '/' + TABLE + '?id=eq.' + encodeURIComponent(id), {
      method: 'DELETE', headers: headers()
    }).then(function (r) { if (!r.ok) throw new Error('删除失败 HTTP ' + r.status); });
  }

  // 上传视频文件到存储桶
  function uploadVideo(path, file) {
    return fetch(STORE + '/object/' + BUCKET + '/' + path, {
      method: 'POST',
      headers: headers({ 'Content-Type': file.type || 'video/mp4', 'x-upsert': 'true' }),
      body: file
    }).then(function (r) { if (!r.ok) throw new Error('上传失败 HTTP ' + r.status); });
  }

  // 删除视频对象
  function deleteVideo(path) {
    return fetch(STORE + '/object/' + BUCKET + '/' + path, {
      method: 'DELETE', headers: headers()
    }).then(function (r) { if (!r.ok) throw new Error('删视频失败 HTTP ' + r.status); });
  }

  // 视频公开访问地址
  function publicUrl(path) {
    return STORE + '/object/public/' + BUCKET + '/' + path;
  }

  return {
    listGuides: listGuides,
    insertGuide: insertGuide,
    deleteGuide: deleteGuide,
    uploadVideo: uploadVideo,
    deleteVideo: deleteVideo,
    publicUrl: publicUrl
  };
})();

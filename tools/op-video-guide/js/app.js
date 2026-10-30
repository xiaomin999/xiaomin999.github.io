/* ============================================================
 * 操作视频速查 —— 主逻辑
 * 流程：打开链接 → 搜问题/点分类 → 看视频；右下角 + 添加新录屏。
 * 数据：元数据存 Supabase 表，视频存 Supabase 存储桶；本地用
 * localStorage 缓存一份，微信里二次打开秒开。
 * ============================================================ */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var cacheKey = 'opg_cache_v1';

  var guides = [];
  var activeCat = '';
  var pendingFile = null;
  var current = null;

  // ---------- 本地缓存 ----------
  function loadCache() {
    try {
      var c = JSON.parse(localStorage.getItem(cacheKey));
      if (Array.isArray(c)) return c;
    } catch (e) {}
    return [];
  }
  function saveCache() {
    try { localStorage.setItem(cacheKey, JSON.stringify(guides)); } catch (e) {}
  }

  // ---------- 提示 ----------
  var toastTimer;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  // ---------- 视图切换 ----------
  function showView(id) {
    var nodes = document.querySelectorAll('.view, .modal');
    for (var i = 0; i < nodes.length; i++) nodes[i].classList.remove('active');
    var el = document.getElementById(id);
    if (el) el.classList.add('active');
    window.scrollTo(0, 0);
  }

  // ---------- 工具 ----------
  function esc(s) {
    return (s || '').replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function fmt(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    var p = function (n) { return ('' + n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
           ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function extOf(file) {
    var n = (file.name || '').toLowerCase();
    var m = n.match(/\.([a-z0-9]+)$/);
    if (m) return m[1];
    var t = (file.type || '').split('/')[1] || 'mp4';
    return t;
  }

  // ---------- 渲染 ----------
  function categories() {
    var set = {};
    guides.forEach(function (g) { if (g.category) set[g.category] = 1; });
    return Object.keys(set);
  }
  function renderChips() {
    var wrap = $('#catChips');
    wrap.innerHTML = '';
    var all = categories();
    if (!all.length) return;
    var mk = function (label, val) {
      var b = document.createElement('button');
      b.className = 'chip' + (activeCat === val ? ' on' : '');
      b.textContent = label;
      b.onclick = function () {
        activeCat = (activeCat === val ? '' : val);
        renderChips(); renderList();
      };
      return b;
    };
    wrap.appendChild(mk('全部', ''));
    all.forEach(function (c) { wrap.appendChild(mk(c, c)); });
  }
  function renderList() {
    var q = ($('#searchInput').value || '').trim().toLowerCase();
    var list = guides.filter(function (g) {
      if (activeCat && g.category !== activeCat) return false;
      if (!q) return true;
      return (g.question + ' ' + (g.note || '') + ' ' + (g.category || '')).toLowerCase().indexOf(q) >= 0;
    });
    var box = $('#guideList');
    box.innerHTML = '';
    $('#emptyHint').hidden = guides.length !== 0;
    if (!list.length) {
      box.innerHTML = '<p class="nores">' + (guides.length ? '没有匹配的记录。' : '') + '</p>';
      return;
    }
    list.forEach(function (g) {
      var card = document.createElement('div');
      card.className = 'card';
      card.innerHTML =
        '<div class="thumb"><span class="play">&#9654;</span></div>' +
        '<div class="meta">' +
          '<div class="q">' + esc(g.question) + '</div>' +
          (g.category ? '<div class="ctag">' + esc(g.category) + '</div>' : '') +
          (g.note ? '<div class="nt">' + esc(g.note) + '</div>' : '') +
          '<div class="date">' + fmt(g.created_at) + '</div>' +
        '</div>';
      card.onclick = function () { openDetail(g); };
      box.appendChild(card);
    });
  }

  // ---------- 详情 ----------
  function openDetail(g) {
    current = g;
    var v = $('#detailVideo');
    v.pause();
    v.removeAttribute('src');
    v.src = SB.publicUrl(g.video_path);
    v.load();
    $('#detailQuestion').textContent = g.question;
    var cat = $('#detailCat');
    cat.textContent = g.category || '';
    cat.style.display = g.category ? 'inline-block' : 'none';
    var note = $('#detailNote');
    note.textContent = g.note || '';
    note.style.display = g.note ? 'block' : 'none';
    showView('view-detail');
  }

  // ---------- 数据刷新 ----------
  function refresh() {
    return SB.listGuides().then(function (rows) {
      guides = rows || [];
      saveCache();
      $('#netWarn').hidden = true;
    }).catch(function (e) {
      console.error(e);
      guides = loadCache();
      $('#netWarn').hidden = false;
      toast('云端读取失败，显示本地缓存');
    }).then(function () {
      renderChips(); renderList();
    });
  }

  // ---------- 添加 ----------
  function openAdd() { showView('view-add'); }
  function closeAdd() {
    $('#inQuestion').value = '';
    $('#inCategory').value = '';
    $('#inNote').value = '';
    $('#inVideo').value = '';
    pendingFile = null;
    var pv = $('#addPreview');
    pv.hidden = true; pv.removeAttribute('src');
    $('#uploadStatus').textContent = '';
    showView('view-list');
  }
  function onFile(e) {
    var f = e.target.files && e.target.files[0];
    if (!f) { pendingFile = null; return; }
    if (!/^video\//.test(f.type)) {
      toast('请选择视频文件');
      e.target.value = '';
      pendingFile = null;
      return;
    }
    pendingFile = f;
    var pv = $('#addPreview');
    pv.hidden = false;
    pv.src = URL.createObjectURL(f);
  }
  function save() {
    var question = $('#inQuestion').value.trim();
    var category = $('#inCategory').value.trim();
    var note = $('#inNote').value.trim();
    if (!question) { toast('请填写问题'); return; }
    if (!pendingFile) { toast('请选择视频'); return; }
    var btn = $('#btnSave');
    btn.disabled = true;
    var status = $('#uploadStatus');
    var ext = extOf(pendingFile);
    var path = 'videos/' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.' + ext;
    status.textContent = '上传视频中…';
    SB.uploadVideo(path, pendingFile)
      .then(function () {
        status.textContent = '保存记录中…';
        return SB.insertGuide({
          question: question,
          category: category,
          note: note,
          video_path: path,
          video_name: pendingFile.name || '',
          video_type: pendingFile.type || ''
        });
      })
      .then(function () {
        toast('已保存');
        return refresh();
      })
      .then(function () { closeAdd(); })
      .catch(function (e) {
        console.error(e);
        status.textContent = '保存失败：' + e.message;
        toast('保存失败，见上方提示');
      })
      .then(function () { btn.disabled = false; });
  }

  // ---------- 删除 ----------
  function del() {
    if (!current) return;
    if (!confirm('确定删除这条记录？视频也会一并删除，且无法恢复。')) return;
    var p = [];
    if (current.video_path) p.push(SB.deleteVideo(current.video_path));
    p.push(SB.deleteGuide(current.id));
    Promise.all(p).then(function () {
      toast('已删除');
      return refresh();
    }).then(function () {
      showView('view-list');
    }).catch(function (e) {
      console.error(e);
      toast('删除失败');
    });
  }

  // ---------- 初始化 ----------
  function init() {
    guides = loadCache();
    renderChips();
    renderList();
    $('#searchInput').addEventListener('input', renderList);
    $('#fabAdd').addEventListener('click', openAdd);
    $('#btnCloseAdd').addEventListener('click', closeAdd);
    $('#btnCancelAdd').addEventListener('click', closeAdd);
    $('#btnSave').addEventListener('click', save);
    $('#inVideo').addEventListener('change', onFile);
    $('#btnBack').addEventListener('click', function () { showView('view-list'); });
    $('#btnDelete').addEventListener('click', del);
    refresh();
  }
  document.addEventListener('DOMContentLoaded', init);
})();

(function(){
  'use strict';

  /* ===================== 基础 ===================== */
  var KEY = 'tiantong_hub_v1';
  var TYPES = {
    gzh:    {label:'公众号选题', emoji:'📝', cls:'purple'},
    xhs:    {label:'小红书文案', emoji:'📕', cls:'pink'},
    douyin: {label:'抖音脚本',   emoji:'🎬', cls:'blue'},
    todo:   {label:'通用待办',   emoji:'✅', cls:'green'}
  };
  var PRESET = {
    pink:   ['#ece0db','#a28276'],
    red:    ['#ead9d9','#a87e88'],
    green:  ['#dfe9e0','#6f8a76'],
    blue:   ['#dde5eb','#74879b'],
    purple: ['#e4dee9','#857796'],
    yellow: ['#eee7d6','#a08a5f']
  };
  var DOW = ['日','一','二','三','四','五','六'];

  var store = load();
  var cal = {focus:null, calTab:'month'};
  var currentView = 'calendar';
  var drawerDate = null;

  function load(){
    try{ var s = JSON.parse(localStorage.getItem(KEY)); if(s && s.tasks) return s; }catch(e){}
    return seed();
  }
  function seed(){
    return {
      tasks: [],
      xhsProducts: [
        {id:uid(), name:'示例：奶油色针织开衫', cat:'穿搭', note:'自然光平铺+上身各一张', shot:false},
        {id:uid(), name:'示例：桌面香薰礼盒', cat:'好物', note:'俯拍+细节特写', shot:false}
      ],
      xhsCopyTypes: [
        {id:uid(), name:'种草测评', desc:'自用真实感受，优缺点都讲'},
        {id:uid(), name:'好物清单', desc:'按场景/人群汇总几样'},
        {id:uid(), name:'穿搭分享', desc:'OOTD+搭配思路'},
        {id:uid(), name:'教程干货', desc:'可复制的操作步骤'},
        {id:uid(), name:'日常vlog', desc:'生活化记录，拉近距离'},
        {id:uid(), name:'避坑指南', desc:'踩过的雷，帮别人省心'}
      ],
      xhsCopies: [],
      douyinScripts: [
        {id:uid(), title:'每日穿搭 · OOTD 模版', style:'通勤温柔风', created:todayStr(),
         planDate:'', published:false,
         scenes:[
           {visual:'全身远景', line:'哈喽宝子们，今天分享一套通勤穿搭～', duration:'0:05', bgm:'轻快BGM'},
           {visual:'中景/特写', line:'上衣/裤子/鞋子分别是什么、价格', duration:'0:08', bgm:'同BGM'},
           {visual:'中景走动', line:'转身展示版型、垂感', duration:'0:06', bgm:''},
           {visual:'近景口播', line:'为什么这样搭、显瘦点在哪', duration:'0:10', bgm:''},
           {visual:'全身结尾', line:'关注我看更多穿搭', duration:'0:04', bgm:'收尾音效'}
         ],
         props:'手机支架、自然光、同色系背景墙',
         note:'固定机位+自然光，前3秒必须抓眼球'}
      ],
      links: [
        {id:uid(), name:'灵感匣', url:'https://xiaomin999.github.io/tools/lingganxia/', emoji:'💡', color:'purple'},
        {id:uid(), name:'公众号助推助手', url:'https://xiaomin999.github.io/gzh-booster/', emoji:'📝', color:'red'},
        {id:uid(), name:'红算子·小红书运营', url:'https://xiaomin999.github.io/xhs-workbench/', emoji:'📕', color:'pink'},
        {id:uid(), name:'副业收集工作台', url:'https://xiaomin999.github.io/side-hustle-hub/', emoji:'💰', color:'yellow'},
        {id:uid(), name:'简记·记账', url:'https://xiaomin999.github.io/jianji/', emoji:'📒', color:'green'},
        {id:uid(), name:'抖音创作服务平台', url:'https://creator.douyin.com/', emoji:'🎬', color:'blue'},
        {id:uid(), name:'小红书创作中心', url:'https://creator.xiaohongshu.com/', emoji:'✏️', color:'red'},
        {id:uid(), name:'Canva 设计', url:'https://www.canva.com/', emoji:'🎨', color:'purple'}
      ],
      goals: {gzh:30, xhs:20, douyin:12},
      recent: []
    };
  }
  function save(){ try{ localStorage.setItem(KEY, JSON.stringify(store)); }catch(e){ toast('保存失败：本地存储不可用'); } }
  function uid(){ return 'id'+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function $(s,root){ return (root||document).querySelector(s); }
  function todayStr(){ return ymd(new Date()); }
  function ymd(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function pad(n){ return (n<10?'0':'')+n; }
  function parseYmd(s){ var p=s.split('-'); return new Date(+p[0], +p[1]-1, +p[2]); }

  function toast(msg){
    var t=$('#toast'); t.textContent=msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t=setTimeout(function(){ t.classList.remove('show'); }, 1900);
  }

  /* ===================== 通用条目（跨平台联动） ===================== */
  function allItems(){
    var arr=[];
    store.tasks.forEach(function(t){ arr.push({id:t.id, date:t.date, type:t.type, title:t.title, time:t.time, status:t.done?'done':'todo', ref:'task'}); });
    store.xhsCopies.forEach(function(c){ if(c.date) arr.push({id:c.id, date:c.date, type:'xhs', title:c.title, time:'', status:c.status==='posted'?'done':'todo', ref:'copy'}); });
    store.douyinScripts.forEach(function(s){ if(s.planDate) arr.push({id:s.id, date:s.planDate, type:'douyin', title:s.title, time:'', status:s.published?'done':'todo', ref:'script'}); });
    return arr;
  }
  function pubItemRow(it){
    var T=TYPES[it.type]||TYPES.todo;
    var a = it.ref==='task' ? {tg:'task-toggle',ed:'task-edit',dl:'task-del'}
          : it.ref==='copy' ? {tg:'copy-toggle',ed:'copy-edit',dl:'copy-del'}
          : {tg:'script-toggle',ed:'script-edit',dl:'script-del'};
    var done = it.status==='done';
    return '<div class="tc-item'+(done?' done':'')+'">'
      +'<span class="tag" style="background:'+typeColor(it.type)+'">'+T.emoji+'</span>'
      +'<span class="tt">'+(it.time?'<b>'+esc(it.time)+'</b> ':'')+esc(it.title)+'</span>'
      +'<button class="icon-btn" data-act="'+a.tg+'" data-id="'+it.id+'" title="完成">'+(done?'✔':'○')+'</button>'
      +'<button class="icon-btn" data-act="'+a.ed+'" data-id="'+it.id+'">✎</button>'
      +'<button class="icon-btn" data-act="'+a.dl+'" data-id="'+it.id+'">🗑</button></div>';
  }
  function typeColor(tp){ var p=PRESET[(TYPES[tp]&&TYPES[tp].cls)||'purple']; return p?p[1]:PRESET.purple[1]; }

  /* ===================== 弹窗 / 抽屉 ===================== */
  function openModal(html){
    $('#modal').innerHTML = html;
    $('#modalMask').classList.add('open');
  }
  function closeModal(){ $('#modalMask').classList.remove('open'); $('#modal').innerHTML=''; }
  function openDrawer(html){
    var d=$('#drawer'); d.innerHTML=html; d.setAttribute('aria-hidden','false');
    d.classList.add('open'); $('#drawerMask').classList.add('open');
  }
  function closeDrawer(){
    $('#drawer').classList.remove('open'); $('#drawerMask').classList.remove('open');
    $('#drawer').setAttribute('aria-hidden','true'); drawerDate=null;
  }

  /* ===================== 导航 ===================== */
  function switchView(v){
    currentView=v;
    document.querySelectorAll('.nav-item,.bnav').forEach(function(b){
      b.classList.toggle('active', b.dataset.view===v);
    });
    if(v==='calendar') renderCalendar();
    else if(v==='gzh') renderGzh();
    else if(v==='xhs') renderXhs();
    else if(v==='douyin') renderDouyin();
    else if(v==='goals') renderGoals();
    else if(v==='links') renderLinks();
    window.scrollTo(0,0);
  }
  document.querySelectorAll('.nav-item,.bnav').forEach(function(b){
    b.addEventListener('click', function(){ switchView(b.dataset.view); });
  });
  $('#drawerMask').addEventListener('click', function(e){ if(e.target===this) closeDrawer(); });
  $('#modalMask').addEventListener('click', function(e){ if(e.target===this) closeModal(); });

  /* ===================== 日历（月历 / 周历 / 发布排期） ===================== */
  function renderCalendar(){
    if(!cal.focus) cal.focus=todayStr();
    var f=parseYmd(cal.focus);
    var y=f.getFullYear(), m=f.getMonth();
    var seg='<div class="seg" style="margin-right:auto">'
      +'<button class="'+(cal.calTab==='month'?'on':'')+'" data-act="cal-tab" data-tab="month">📅 月历</button>'
      +'<button class="'+(cal.calTab==='week'?'on':'')+'" data-act="cal-tab" data-tab="week">🗓️ 周历</button>'
      +'<button class="'+(cal.calTab==='publish'?'on':'')+'" data-act="cal-tab" data-tab="publish">🔗 发布排期</button></div>';
    var title = (cal.calTab==='week') ? weekRangeLabel(f) : (y+'年 '+(m+1)+'月');
    var toolbar='<div class="cal-toolbar">'+seg
      +'<button class="cal-nav" data-act="cal-prev">‹</button>'
      +'<div class="month">'+title+'</div>'
      +'<button class="cal-nav" data-act="cal-next">›</button>'
      +'<button class="pill" data-act="cal-today">今天</button></div>';
    var body;
    if(cal.calTab==='month') body=renderMonthGrid(y,m);
    else if(cal.calTab==='week') body=renderWeekGrid(f);
    else body=renderPublish();
    $('#view').innerHTML='<div class="view-head"><h2>📅 我的日历</h2><span class="sub">点格子标注当天要做的事</span></div>'+toolbar+body;
  }
  function weekRangeLabel(f){
    var ws=new Date(f); ws.setDate(f.getDate()-f.getDay());
    var we=new Date(ws); we.setDate(ws.getDate()+6);
    return (ws.getMonth()+1)+'.'+ws.getDate()+' – '+(we.getMonth()+1)+'.'+we.getDate();
  }
  function renderMonthGrid(y,m){
    var first=new Date(y,m,1), lead=first.getDay(), dim=new Date(y,m+1,0).getDate();
    var total=Math.ceil((lead+dim)/7)*7, start=1-lead, tStr=todayStr();
    var all=allItems(), cells='';
    for(var i=0;i<total;i++){
      var day=start+i, cd=new Date(y,m,day), inMonth=(day>=1&&day<=dim), ds=ymd(cd);
      var items=all.filter(function(it){return it.date===ds;});
      var byType={}; items.forEach(function(it){ byType[it.type]=(byType[it.type]||0)+1; });
      var types=Object.keys(byType);
      var dots=''; types.slice(0,4).forEach(function(tp){ dots+='<span class="cal-dot" style="background:'+typeColor(tp)+'" title="'+TYPES[tp].label+'"></span>'; });
      if(types.length>4) dots+='<span class="cal-more">+'+(items.length-types.length)+'</span>';
      cells+='<div class="cal-cell'+(inMonth?'':' other')+(ds===tStr?' today':'')+'" data-act="open-day" data-date="'+ds+'">'
        +'<div class="dnum">'+ (inMonth?day:(cd.getMonth()+1)+'/'+day) +'</div>'
        +'<div class="cal-dots">'+dots+'</div></div>';
    }
    var todayItems=all.filter(function(it){return it.date===tStr;});
    var todayHtml = todayItems.length ? todayItems.map(pubItemRow).join('')
      : '<div class="empty"><b>今天还没有安排 🍬</b>点下方日历格子，把待办标上去吧</div>';
    return '<div class="card today-card"><div class="tc-head"><div><b style="font-size:17px">今天 · '+((new Date()).getMonth()+1)+'月'+((new Date()).getDate())+'日 周'+DOW[(new Date()).getDay()]+'</b></div>'
      +'<span class="chip green">'+todayItems.length+' 项</span></div><div class="tc-list">'+todayHtml+'</div></div>'
      +'<div class="cal-grid"><div class="cal-dow">日</div><div class="cal-dow">一</div><div class="cal-dow">二</div><div class="cal-dow">三</div><div class="cal-dow">四</div><div class="cal-dow">五</div><div class="cal-dow">六</div>'+cells+'</div>';
  }
  function renderWeekGrid(f){
    var ws=new Date(f); ws.setDate(f.getDate()-f.getDay());
    var all=allItems(), cols='';
    for(var i=0;i<7;i++){
      var d=new Date(ws); d.setDate(ws.getDate()+i); var ds=ymd(d), tStr=todayStr();
      var items=all.filter(function(it){return it.date===ds;});
      var inner=items.slice(0,6).map(function(it){
        return '<div class="wk-item" style="border-left:3px solid '+typeColor(it.type)+'">'+esc(it.title)+(it.status==='done'?' ✓':'')+'</div>';
      }).join('');
      if(items.length>6) inner+='<div class="wk-more">+'+(items.length-6)+'</div>';
      cols+='<div class="cal-cell wk'+(ds===tStr?' today':'')+'" data-act="open-day" data-date="'+ds+'">'
        +'<div class="dnum">'+d.getMonth()+1+'/'+d.getDate()+' '+DOW[d.getDay()]+'</div>'
        +'<div class="wk-list">'+(inner||'<span class="wk-empty">—</span>')+'</div></div>';
    }
    return '<div class="cal-grid wk-grid">'+cols+'</div>';
  }
  function renderPublish(){
    var all=allItems().slice().sort(function(a,b){return a.date.localeCompare(b.date);});
    var groups={}; all.forEach(function(it){ (groups[it.date]=groups[it.date]||[]).push(it); });
    var keys=Object.keys(groups).sort();
    if(!keys.length) return '<div class="empty"><b>还没有发布排期 🔗</b>给待办 / 小红书文案 / 抖音脚本填上日期，就会按平台汇总到这里</div>';
    var html='<div class="sec-note">公众号、小红书、抖音的内容计划汇总在一处，按日期「联动」展示。标记已发/已发布会自动回落到月目标进度。</div>';
    keys.forEach(function(k){
      var d=parseYmd(k);
      html+='<div class="pub-date">📆 '+d.getMonth()+1+'月'+d.getDate()+'日 · 周'+DOW[d.getDay()]+'</div>';
      html+='<div class="list">'+groups[k].map(pubItemRow).join('')+'</div>';
    });
    return html;
  }
  function openDay(ds){
    drawerDate=ds;
    var d=parseYmd(ds);
    var items=allItems().filter(function(it){return it.date===ds;}).slice().sort(function(a,b){return (a.time||'').localeCompare(b.time||'');});
    var list = items.length
      ? items.map(function(it){
          var T=TYPES[it.type]||TYPES.todo;
          return '<div class="task-item'+(it.status==='done'?' done':'')+'">'
            +'<div class="chk" data-act="'+(it.ref==='task'?'task-toggle':it.ref==='copy'?'copy-toggle':'script-toggle')+'" data-id="'+it.id+'">'+(it.status==='done'?'✔':'')+'</div>'
            +'<div class="ti-body"><div class="ti-title">'+esc(it.title)+'</div>'
            +'<div class="ti-meta"><span class="chip '+T.cls+'">'+T.emoji+' '+T.label+'</span>'
            +(it.time?'<span class="chip">⏰ '+esc(it.time)+'</span>':'')
            +(it.status==='done'?'<span class="chip green">已发布</span>':'<span class="chip">待发布</span>')+'</div></div>'
            +'<div class="ti-actions"><button class="icon-btn" data-act="'+(it.ref==='task'?'task-edit':it.ref==='copy'?'copy-edit':'script-edit')+'" data-id="'+it.id+'">✎</button>'
            +'<button class="icon-btn" data-act="'+(it.ref==='task'?'task-del':it.ref==='copy'?'copy-del':'script-del')+'" data-id="'+it.id+'">🗑</button></div></div>';
        }).join('')
      : '<div class="empty" style="padding:18px">这一天还是空的，加一条吧 🍬</div>';
    var chips='';
    Object.keys(TYPES).forEach(function(tp){
      var T=TYPES[tp];
      chips+='<button class="qa" data-act="qa-add" data-type="'+tp+'" data-date="'+ds+'">'+T.emoji+' '+T.label+'</button>';
    });
    openDrawer(
      '<button class="drawer-close" data-act="close-drawer">✕</button>'
      +'<h3>'+d.getMonth()+1+'月'+d.getDate()+'日 · 周'+DOW[d.getDay()]+'</h3>'
      +'<div class="dh-sub">这一天的安排（含各平台）</div>'
      +'<div id="drawerList">'+list+'</div>'
      +'<div class="dh-sub" style="margin-top:14px">快速添加待办</div>'
      +'<div class="quick-add">'+chips+'</div>'
    );
  }
  function openTaskModal(task, def){
    def=def||{};
    var isEdit=!!task;
    var t=task||{id:'', date:def.date||todayStr(), type:def.type||'gzh', title:'', time:'', note:'', done:false};
    var opts='';
    Object.keys(TYPES).forEach(function(tp){ opts+='<option value="'+tp+'"'+(tp===t.type?' selected':'')+'>'+TYPES[tp].emoji+' '+TYPES[tp].label+'</option>'; });
    openModal(
      '<h3>'+(isEdit?'✎ 编辑待办':'➕ 新建待办')+'</h3>'
      +'<div class="form-row"><label>日期</label><input class="input" id="t-date" type="date" value="'+esc(t.date)+'"></div>'
      +'<div class="form-row"><label>类型</label><select class="select" id="t-type">'+opts+'</select></div>'
      +'<div class="form-row"><label>标题 / 内容</label><input class="input" id="t-title" value="'+esc(t.title)+'" placeholder="例如：公众号选题《秋日通勤穿搭》"></div>'
      +'<div class="form-row"><label>时间（可选）</label><input class="input" id="t-time" type="time" value="'+esc(t.time)+'"></div>'
      +'<div class="form-row"><label>备注（可选）</label><textarea class="textarea" id="t-note" placeholder="灵感、要点、链接…">'+esc(t.note)+'</textarea></div>'
      +'<div class="modal-actions"><button class="btn ghost" data-act="close-modal">取消</button>'
      +'<button class="btn" data-act="task-save" data-id="'+t.id+'">保存</button></div>'
    );
  }

  function openTaskPreview(t){
    var T=TYPES[t.type]||TYPES.todo;
    openModal(
      '<h3>'+T.emoji+' '+esc(t.title)+'</h3>'
      +'<div class="r-meta" style="margin-bottom:14px">'
      +'<span class="chip '+T.cls+'">'+T.label+'</span>'
      +'<span class="chip">📅 '+esc(t.date)+(t.time?' '+esc(t.time):'')+'</span>'
      +(t.done?'<span class="chip green">已发</span>':'<span class="chip yellow">待写</span>')
      +'</div>'
      +'<div class="form-row"><label>备注 / 灵感</label>'
      +'<div style="font-size:14.5px;color:var(--ink);line-height:1.9;white-space:pre-wrap;word-break:break-word;background:#f7f5f1;border-radius:14px;padding:14px">'+(t.note?esc(t.note):'（还没有写备注）')+'</div></div>'
      +'<div class="modal-actions">'
      +'<button class="btn ghost" data-act="close-modal">关闭</button>'
      +'<button class="btn" data-act="task-edit" data-id="'+t.id+'">✎ 编辑</button></div>'
    );
  }

  /* ===================== 公众号 ===================== */
  function renderGzh(){
    var items=store.tasks.filter(function(t){return t.type==='gzh';}).slice().sort(function(a,b){return a.date.localeCompare(b.date);});
    var body = items.length
      ? items.map(function(t){
          return '<div class="row clickable" data-act="task-view" data-id="'+t.id+'"><div class="r-main"><div class="r-title">'+esc(t.title)+'</div>'
            +(t.note?'<div class="r-note">'+esc(t.note)+'</div>':'')
            +'<div class="r-meta"><span class="chip purple">📅 '+t.date+(t.time?' '+esc(t.time):'')+'</span>'
            +(t.done?'<span class="chip green">已发</span>':'<span class="chip">待写</span>')+'</div></div>'
            +'<div class="r-actions"><button class="status-toggle'+(t.done?' on':'')+'" data-act="task-toggle" data-id="'+t.id+'">'+(t.done?'已发':'标记已发')+'</button>'
            +'<button class="icon-btn" data-act="task-edit" data-id="'+t.id+'">✎</button>'
            +'<button class="icon-btn" data-act="task-del" data-id="'+t.id+'">🗑</button></div></div>';
        }).join('')
      : '<div class="empty"><b>还没有公众号选题 📝</b>点右边「新建选题」，提前把每天要写的题目标进日历</div>';
    $('#view').innerHTML='<div class="view-head"><h2>📝 公众号选题</h2><span class="sub">日更节奏 · 提前规划</span>'
      +'<div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap">'+'<button class="btn ghost" data-act="gzh-gen-open">✨ 一键生成</button>'+'<button class="btn" data-act="gzh-new">➕ 新建选题</button></div></div>'
      +'<div class="sec-note">「✨ 一键生成」按「人群 × 痛点 × 场景 × 利益承诺」的选题公式批量产出候选，选用即入库；所有选题都会同步显示在「日历 / 发布排期」对应日期上。💡 点击卡片可预览，点 ✎ 按钮才进入编辑。</div>'
      +'<div class="list">'+body+'</div>';
  }

  /* ===================== 小红书 ===================== */
  var xhsTab='products';
  function renderXhs(){
    $('#view').innerHTML='<div class="view-head"><h2>📕 小红书</h2><span class="sub">摆拍产品 · 文案类型 · 文案记录</span></div>'
      +'<div class="subtabs">'
      +'<button class="subtab'+(xhsTab==='products'?' on':'')+'" data-act="xhs-tab" data-tab="products">🛍️ 摆拍产品</button>'
      +'<button class="subtab'+(xhsTab==='types'?' on':'')+'" data-act="xhs-tab" data-tab="types">🏷️ 文案类型</button>'
      +'<button class="subtab'+(xhsTab==='copies'?' on':'')+'" data-act="xhs-tab" data-tab="copies">📝 文案记录</button>'
      +'</div>'
      +'<div class="xhs-section'+(xhsTab==='products'?' on':'')+'" id="xhs-products"></div>'
      +'<div class="xhs-section'+(xhsTab==='types'?' on':'')+'" id="xhs-types"></div>'
      +'<div class="xhs-section'+(xhsTab==='copies'?' on':'')+'" id="xhs-copies"></div>';
    renderXhsProducts(); renderXhsTypes(); renderXhsCopies();
  }
  function renderXhsProducts(){
    var arr=store.xhsProducts;
    var body = arr.length
      ? arr.map(function(p){
          return '<div class="row clickable" data-act="prod-view" data-id="'+p.id+'"><div class="r-main"><div class="r-title">'+esc(p.name)+'</div>'
            +(p.note?'<div class="r-note">'+esc(p.note)+'</div>':'')
            +'<div class="r-meta">'+(p.cat?'<span class="chip pink">'+esc(p.cat)+'</span>':'')
            +(p.shot?'<span class="chip green">已拍</span>':'<span class="chip">待拍</span>')+'</div></div>'
            +'<div class="r-actions"><button class="status-toggle'+(p.shot?' on':'')+'" data-act="prod-toggle" data-id="'+p.id+'">'+(p.shot?'已拍':'标记已拍')+'</button>'
            +'<button class="icon-btn" data-act="prod-edit" data-id="'+p.id+'">✎</button>'
            +'<button class="icon-btn" data-act="prod-del" data-id="'+p.id+'">🗑</button></div></div>';
        }).join('')
      : '<div class="empty"><b>还没有摆拍产品 🛍️</b>把要拍的产品记下来，拍完一键标记</div>';
    $('#xhs-products').innerHTML='<div class="sec-note">记录要拍摄/摆拍的产品，拍完标记「已拍」，避免漏拍。💡 点击卡片可预览拍摄备注，点 ✎ 按钮才进入编辑。</div>'
      +'<div style="margin-bottom:12px"><button class="btn" data-act="prod-new">➕ 添加产品</button></div>'
      +'<div class="list">'+body+'</div>';
  }
  function renderXhsTypes(){
    var arr=store.xhsCopyTypes;
    var body = arr.length
      ? arr.map(function(c){
          return '<div class="row clickable" data-act="ctype-view" data-id="'+c.id+'"><div class="r-main"><div class="r-title">'+esc(c.name)+'</div>'
            +(c.desc?'<div class="r-note">'+esc(c.desc)+'</div>':'')+'</div>'
            +'<div class="r-actions"><button class="icon-btn" data-act="ctype-edit" data-id="'+c.id+'">✎</button>'
            +'<button class="icon-btn" data-act="ctype-del" data-id="'+c.id+'">🗑</button></div></div>';
        }).join('')
      : '<div class="empty"><b>还没有文案类型 🏷️</b>先定义你常发的几种文案类型</div>';
    $('#xhs-types').innerHTML='<div class="sec-note">规划你「每天发什么类型的文案」（种草/测评/穿搭）。写文案时可一键选类型。💡 点击卡片可预览说明，点 ✎ 按钮才进入编辑。</div>'
      +'<div style="margin-bottom:12px"><button class="btn" data-act="ctype-new">➕ 添加类型</button></div>'
      +'<div class="list">'+body+'</div>';
  }
  function renderXhsCopies(){
    var arr=store.xhsCopies;
    var prodName={}; store.xhsProducts.forEach(function(p){prodName[p.id]=p.name;});
    var typeName={}; store.xhsCopyTypes.forEach(function(c){typeName[c.id]=c.name;});
    var body = arr.length
      ? arr.slice().sort(function(a,b){return (b.date||'').localeCompare(a.date||'');}).map(function(c){
          return '<div class="row clickable" data-act="copy-view" data-id="'+c.id+'"><div class="r-main"><div class="r-title">'+esc(c.title)+'</div>'
            +(c.body?'<div class="r-note">'+esc(c.body)+'</div>':'')
            +'<div class="r-meta">'
            +(c.typeId&&typeName[c.typeId]?'<span class="chip red">'+esc(typeName[c.typeId])+'</span>':'')
            +(c.product&&prodName[c.product]?'<span class="chip pink">🛍️ '+esc(prodName[c.product])+'</span>':'')
            +(c.date?'<span class="chip">📅 '+esc(c.date)+'</span>':'')
            +(c.status==='posted'?'<span class="chip green">已发</span>':'<span class="chip yellow">草稿</span>')+'</div></div>'
            +'<div class="r-actions"><button class="status-toggle'+(c.status==='posted'?' on':'')+'" data-act="copy-toggle" data-id="'+c.id+'">'+(c.status==='posted'?'已发':'标记已发')+'</button>'
            +'<button class="icon-btn" data-act="copy-edit" data-id="'+c.id+'">✎</button>'
            +'<button class="icon-btn" data-act="copy-del" data-id="'+c.id+'">🗑</button></div></div>';
        }).join('')
      : '<div class="empty"><b>还没有文案记录 📝</b>这里专门存你的小红书文案草稿，之前没建过，现在归位啦</div>';
    $('#xhs-copies').innerHTML='<div class="sec-note">专属「文案记录」区：标题、类型、关联产品、正文、发布日期、状态一目了然。「✨ 一键生成」按标题公式 + 分类型正文骨架 + 话题标签产出草稿，可带入编辑或直接存草稿。💡 点击卡片可直接预览文案，点 ✎ 按钮才进入编辑。</div>'
      +'<div style="margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap">'+'<button class="btn ghost" data-act="xhs-gen-open">✨ 一键生成</button>'+'<button class="btn" data-act="copy-new">➕ 新建文案</button></div>'
      +'<div class="list">'+body+'</div>';
  }
  function openCopyPreview(c){
    var typeName='', prodName='';
    store.xhsCopyTypes.forEach(function(t){ if(t.id===c.typeId) typeName=t.name; });
    store.xhsProducts.forEach(function(p){ if(p.id===c.product) prodName=p.name; });
    openModal(
      '<h3>📕 '+esc(c.title)+'</h3>'
      +'<div class="r-meta" style="margin-bottom:14px">'
      +(typeName?'<span class="chip red">'+esc(typeName)+'</span>':'')
      +(prodName?'<span class="chip pink">🛍️ '+esc(prodName)+'</span>':'')
      +(c.date?'<span class="chip">📅 '+esc(c.date)+'</span>':'<span class="chip">未排期</span>')
      +(c.status==='posted'?'<span class="chip green">已发</span>':'<span class="chip yellow">草稿</span>')
      +'</div>'
      +'<div class="form-row"><label>正文 / 文案内容</label>'
      +'<div style="font-size:14.5px;color:var(--ink);line-height:1.9;white-space:pre-wrap;word-break:break-word;background:#f7f5f1;border-radius:14px;padding:14px">'+(c.body?esc(c.body):'（还没有写正文）')+'</div></div>'
      +'<div class="modal-actions">'
      +'<button class="btn ghost" data-act="close-modal">关闭</button>'
      +'<button class="btn" data-act="copy-edit" data-id="'+c.id+'">✎ 编辑</button></div>'
    );
  }
  function openCopyModal(copy){
    var isEdit=!!copy;
    var c=copy||{id:'',title:'',typeId:'',product:'',body:'',date:'',status:'draft'};
    var typeOpts='<option value="">（不选）</option>'+store.xhsCopyTypes.map(function(t){return '<option value="'+t.id+'"'+(t.id===c.typeId?' selected':'')+'>'+esc(t.name)+'</option>';}).join('');
    var prodOpts='<option value="">（无）</option>'+store.xhsProducts.map(function(p){return '<option value="'+p.id+'"'+(p.id===c.product?' selected':'')+'>'+esc(p.name)+'</option>';}).join('');
    openModal(
      '<h3>'+(isEdit?'✎ 编辑文案':'➕ 新建文案')+'</h3>'
      +'<div class="form-row"><label>标题</label><input class="input" id="c-title" value="'+esc(c.title)+'" placeholder="笔记标题"></div>'
      +'<div class="form-row"><label>文案类型</label><select class="select" id="c-type">'+typeOpts+'</select></div>'
      +'<div class="form-row"><label>关联摆拍产品</label><select class="select" id="c-product">'+prodOpts+'</select></div>'
      +'<div class="form-row"><label>正文 / 文案内容</label><textarea class="textarea" id="c-body" style="min-height:140px" placeholder="标题党+正文+话题标签…">'+esc(c.body)+'</textarea></div>'
      +'<div class="form-row"><label>计划发布日期</label><input class="input" id="c-date" type="date" value="'+esc(c.date)+'"></div>'
      +'<div class="form-row"><label>状态</label><select class="select" id="c-status">'
      +'<option value="draft"'+(c.status!=='posted'?' selected':'')+'>草稿</option>'
      +'<option value="posted"'+(c.status==='posted'?' selected':'')+'>已发</option></select></div>'
      +'<div class="modal-actions"><button class="btn ghost" data-act="close-modal">取消</button>'
      +'<button class="btn" data-act="copy-save" data-id="'+c.id+'">保存</button></div>'
    );
  }

  /* ===================== 抖音 ===================== */

  /* ===================== 一键生成 · 内容方法论库 ===================== */
  /* 专家设计原则：
     公众号选题 = 人群 × 痛点 × 场景 × 利益承诺 → 6 种标题公式 + 切入角度
     小红书文案 = 标题公式 + 按文案类型分骨架的正文 + 话题标签
     抖音脚本 = 黄金3秒钩子 → 框架化分镜（围绕主题，不写死商品）→ 结尾CTA，时长归一化
  */
  var GENX = {
    gzh:{
      formulas:[
        {name:'数字清单', build:function(t,n){ return '关于'+t+'，这'+n+'件事越早知道越好'; },
         angle:'干货清单型，收藏率高，适合把经验系统化输出，长尾搜索流量稳定。'},
        {name:'痛点提问', build:function(t,n){ return '为什么你的'+t+'总是没效果？问题大多出在这几点'; },
         angle:'直击痛点、标题自带悬念，评论区互动率通常最高，适合抛观点引讨论。'},
        {name:'反常识劝退', build:function(t,n){ return '别再盲目'+t+'了，真正有用的方法其实是这样'; },
         angle:'反观点切入容易引发争论和转发，最好有真实数据和结果兜底再写。'},
        {name:'身份对标', build:function(t,n){ return '给正在'+t+'的你：一份可以直接抄的作业'; },
         angle:'精准人群代入，粉丝粘性高，适合作为系列内容的第一篇立住人设。'},
        {name:'经历复盘', build:function(t,n){ return '坚持'+t+'一个月，我踩过的坑和真实的改变'; },
         angle:'第一人称真实感，信任度最高，把个人经历提炼成可复制的方法论。'},
        {name:'节点借势', build:function(t,n){ return '2026年，'+t+'的新玩法（建议收藏）'; },
         angle:'带年份关键词吃搜索长尾流量，适合平台算法偏好时效内容的窗口期。'}
      ],
      nums:[3,4,5,6]
    },
    xhs:{
      titleFormulas:[
        function(t){ return t+'｜真的后悔没有早点发现'; },
        function(t){ return '谁懂啊，'+t+'也太好用了吧😭'; },
        function(t){ return t+'测评｜看完再买不吃亏'; },
        function(t){ return '整理了'+pick([3,4,5,6,8])+'个'+t+'的小技巧，建议收藏⭐'; },
        function(t){ return t+'避坑指南，新手必看！'; },
        function(t){ return '亲测'+t+'一个月，说几句大实话'; }
      ],
      tagPool:['好物分享','避坑指南','新手必看','干货分享','亲测有效','测评','我的宝藏','自我提升','生活方式','日常碎片','实用好物'],
      skeletons:{
        '种草测评':[
          {h:'📌 先说结论', p:function(t){ return '纠结'+t+'的宝子看这篇就够，真实体验和优缺点都整理好了，看完再决定入不入手。'; }},
          {h:'🎯 为什么需要', p:function(t){ return '之前一直被这个问题困扰，试过几种方法都不太行，直到认真做了功课重新选。'; }},
          {h:'📦 第一印象', p:function(t){ return '刚拿到手的感觉：包装、质感、细节都在线，第一眼印象加分。'; }},
          {h:'⏳ 真实体验', p:function(t){ return '重点说使用过程：操作简单上手快，日常使用频率很高，不是三分钟热度的那种。'; }},
          {h:'✅ 优点', p:function(t){ return '最打动我的点：一是真正解决了问题，二是细节做工经得起细看，三是这个价位很难挑。'; }},
          {h:'⚠️ 缺点也说', p:function(t){ return '客观讲两个小缺点：前期需要一点适应成本；另外配件建议一次买齐，分开买反而贵。'; }},
          {h:'👤 适合谁', p:function(t){ return '预算有限又不想将就的宝子可以冲；追求一步到位的建议直接上高配版。'; }}
        ],
        '好物清单':[
          {h:'📌 清单概览', p:function(t){ return '这份'+t+'清单按场景分好了类，都是自用回购款，照着买不踩雷。'; }},
          {h:'1️⃣ 第一件', p:function(t){ return '使用频率最高的一件，一句话理由+适用场景，闭眼入。'; }},
          {h:'2️⃣ 第二件', p:function(t){ return '颜值和实力并存，放在家里/办公室里每天都用得上。'; }},
          {h:'3️⃣ 第三件', p:function(t){ return '被低估的冷门好物，知道的人不多但真的好用。'; }},
          {h:'💡 选购思路', p:function(t){ return '挑这类东西记住三点：看口碑、看细节、看售后，比来比去不如看长期评价。'; }},
          {h:'⚠️ 避坑提醒', p:function(t){ return '别被颜值忽悠，先想清楚自己的使用场景再下单。'; }}
        ],
        '穿搭分享':[
          {h:'📌 今日OOTD', p:function(t){ return '今天这套'+t+'可以直接抄作业，显高显瘦，通勤约会都能穿。'; }},
          {h:'👗 单品解析', p:function(t){ return '逐件说：版型怎么选、尺码怎么挑、不同身材的适配度，都标清楚了。'; }},
          {h:'💡 搭配思路', p:function(t){ return '为什么这样搭：色彩做减法、比例靠高腰线、配饰点到为止，普通人也能复制。'; }},
          {h:'🔄 一衣多穿', p:function(t){ return '换个组合还能再搭两套，一件顶三件，性价比直接拉满。'; }},
          {h:'⚠️ 常见错误', p:function(t){ return '这类搭配最容易翻车的点：颜色超过三种、上下都宽松，避开就赢了一半。'; }},
          {h:'👤 适合人群', p:function(t){ return '小个子和微胖宝子都能参考，照抄没问题。'; }}
        ],
        '教程干货':[
          {h:'📌 学会什么', p:function(t){ return '看完这条'+t+'教程，你能完整跟做一遍，新手也不会翻车。'; }},
          {h:'📋 准备清单', p:function(t){ return '需要的东西就这几样，提前准备好，跟着步骤走就行。'; }},
          {h:'👣 步骤拆解', p:function(t){ return '第一步是基础，很多人错在这；第二步注意手法细节；第三步检查收尾。'; }},
          {h:'⚠️ 常见错误', p:function(t){ return '新手最容易翻车的一步：急着跳步骤，慢一点反而更快。'; }},
          {h:'🎯 效果检查', p:function(t){ return '怎么判断做对了：对照这三个标准自查，全中就达标。'; }},
          {h:'📎 进阶技巧', p:function(t){ return '熟手可以试试这个优化思路，效果还能再上一个档。'; }}
        ],
        '日常vlog':[
          {h:'📌 今天主题', p:function(t){ return '记录普通又闪光的一天，这就是生活本来的样子。'; }},
          {h:'🌅 上午', p:function(t){ return '从一顿认真的早餐开始，慢下来的早晨最治愈。'; }},
          {h:'☀️ 下午', p:function(t){ return '下午专注做事，忙里偷闲的片刻最珍贵。'; }},
          {h:'🌙 晚上', p:function(t){ return '傍晚的光线最好，随手一拍都是生活感。'; }},
          {h:'✨ 高光时刻', p:function(t){ return '今天最值得记下来的瞬间，是一个小小的进步。'; }},
          {h:'💭 一点感悟', p:function(t){ return '平凡的日子也在好好过，把节奏握在自己手里就很踏实。'; }}
        ],
        '避坑指南':[
          {h:'📌 避坑总览', p:function(t){ return '关于'+t+'的这些坑我全踩过，整理出来帮你省时间和钱。'; }},
          {h:'❌ 坑一', p:function(t){ return '最常见的坑：被表面参数忽悠，实际体验完全两回事。正确做法是看长期真实评价。'; }},
          {h:'❌ 坑二', p:function(t){ return '跟风买爆款，根本不适合自己的情况。先明确需求再掏钱。'; }},
          {h:'❌ 坑三', p:function(t){ return '贪便宜买低价版，后期维护成本反而更高。该省的省，该花的别省。'; }},
          {h:'✅ 正确姿势', p:function(t){ return '一句话总结：明确预算和场景，对照真实口碑，选售后稳的。'; }}
        ]
      },
      generic:[
        {h:'📌 主题引入', p:function(t){ return '这篇聊聊'+t+'，把核心方法和注意事项一次说清楚。'; }},
        {h:'🎯 痛点场景', p:function(t){ return '先对号入座：你是不是也遇到过这些情况？'; }},
        {h:'📦 核心内容', p:function(t){ return '分三点讲：第一点是基础，第二点是关键，第三点是进阶，按需取用。'; }},
        {h:'💡 方法总结', p:function(t){ return '把上面的内容浓缩成一句可执行的话，收藏起来随时看。'; }},
        {h:'👤 适合人群', p:function(t){ return '有同样困扰的宝子都可以试试，欢迎对号入座。'; }}
      ]
    }
  };

  /* ---- 抖音：分镜模板库（框架化话术，围绕 {t} 展开） ---- */

  /* ===================== 抖音：贴题化生成（专家版） =====================
     原则：不编造内容。先清洗主题、识别叙事类型，再把「内容要点」按顺序落进分镜。
     长主题自动拆成真实要点；短主题给【待补】占位，创作者补细节即可开拍。 */
  var GEN = {
    ootd:{ label:'👗 穿搭分享', short:'穿搭分享',
      hooks:['今天这套{t}真的绝，显高显瘦还好看～','还在为穿什么发愁？这套{t}直接抄作业！','被问爆的{t}来了，通勤约会都能穿！'],
      middles:[
        {visual:'全身远景 · 转一圈', line:'先看整体：{p}', dur:6},
        {visual:'中景 · 单品逐一展示', line:'{p}', dur:8},
        {visual:'近景 · 细节特写', line:'细节放大看：{p}', dur:5},
        {visual:'中景走动 · 场景化', line:'{p}', dur:6}
      ],
      extra:{visual:'近景口播 · 互动', line:'链接和尺码都放评论区了，自取不客气～', dur:6},
      ctas:['关注我看更多穿搭，我们下次见～','喜欢这套记得点赞收藏，还想看什么风格评论区点菜！'],
      prompts:['这套搭配的整体思路（风格/场合）','上身单品逐件说清楚','最值得看的细节（版型、面料、走线）','走动或通勤场景下的真实效果'],
      props:'手机支架、自然光、同色系背景墙、搭配的鞋包配饰',
      note:'前3秒抓眼球；每个单品给足特写；自然光拍摄，避免顶光。'
    },
    review:{ label:'🛍️ 好物测评', short:'好物测评',
      hooks:['用了整整一个月的{t}，今天来交个真实作业！','别急着买{t}！先看完这条再决定。'],
      middles:[
        {visual:'开箱 · 俯拍', line:'先开箱：{p}', dur:6},
        {visual:'使用过程 · 中景', line:'实际用起来：{p}', dur:8},
        {visual:'效果对比 · 分屏', line:'对比一下：{p}', dur:6},
        {visual:'近景 · 总结', line:'{p}', dur:5}
      ],
      extra:{visual:'近景口播 · 答疑', line:'适合谁、不适合谁，一句话说清楚，对号入座就行。', dur:6},
      ctas:['真实测评不踩坑，关注我，下期测点别的！','觉得有用就点赞收藏，免得想买的时候找不到～'],
      prompts:['第一印象和包装细节','真实使用过程（多久、怎么用）','用之前和之后的差别','优点和不避讳的缺点','到底适合谁买'],
      props:'产品本体、使用场景布置、分屏对比素材',
      note:'优缺点都讲才可信；对比画面要有冲击力；价格信息放评论区。'
    },
    tutorial:{ label:'📚 教程干货', short:'教程干货',
      hooks:['3分钟学会{t}，有手就会！','关于{t}，这条视频一口气讲清楚。'],
      middles:[
        {visual:'全景 · 准备', line:'先备好东西：{p}', dur:5},
        {visual:'中景 · 步骤一', line:'{p}', dur:7},
        {visual:'近景 · 步骤二', line:'{p}', dur:7},
        {visual:'中景 · 成果展示', line:'{p}', dur:5}
      ],
      extra:{visual:'近景口播 · 答疑', line:'常见问题整理好了，评论区置顶自取。', dur:5},
      ctas:['学会了的宝子点个赞，关注我学更多干货！','收藏起来慢慢做，做完记得来交作业～'],
      prompts:['需要准备的材料/工具','第一步怎么做（最容易错的点）','第二步的关键细节','做完怎么检查效果'],
      props:'教程所需材料、整齐的操作台面',
      note:'步骤配字幕；关键步骤放慢并重复；开头先展示成果再讲过程。'
    },
    vlog:{ label:'🎬 日常vlog', short:'日常vlog',
      hooks:['今天是怎么过的？记录一下{t}。','平凡又闪光的一天，这就是{t}。'],
      middles:[
        {visual:'清晨 · 空镜', line:'{p}', dur:5},
        {visual:'白天 · 生活片段', line:'{p}', dur:7},
        {visual:'傍晚 · 氛围镜头', line:'{p}', dur:6},
        {visual:'夜晚 · 口播', line:'{p}', dur:5}
      ],
      extra:{visual:'混剪 · 高光瞬间', line:'把今天最想记住的几个瞬间剪在一起。', dur:6},
      ctas:['关注我，一起把日子过成想要的样子～','你的今天过得怎么样？评论区聊聊～'],
      prompts:['早上从哪里开始（一句话交代）','白天主要做了什么','傍晚最有氛围的一个画面','晚上回看这天的一点感受'],
      props:'手机、稳定器（可选）、日常场景自然光线',
      note:'多拍空镜和转场素材；配乐卡点；文案走心不煽情。'
    },
    emotion:{ label:'💭 情绪 / 关系叙事', short:'情绪叙事',
      hooks:['有件事憋了挺久，今天想好好说说：{t}。','{t}——这句话我花了好几周才说得出口。','如果你最近也在经历{t}，这条视频陪你坐一会儿。'],
      middles:[
        {visual:'近景口播 · 起因', line:'先把背景交代清楚：{p}', dur:8},
        {visual:'空镜 · 当时的状态', line:'{p}', dur:7},
        {visual:'中景 · 转折', line:'后来让我慢慢松口气的，是{p}', dur:8},
        {visual:'近景口播 · 现在', line:'{p}', dur:7},
        {visual:'特写 · 一句收尾', line:'{p}', dur:6}
      ],
      extra:{visual:'近景口播 · 给观众', line:'如果你也在类似的阶段，别急着逼自己，慢一点也没关系。', dur:6},
      ctas:['如果你也有类似的时刻，评论区聊聊，我都在。','愿我们都能慢慢把日子过顺，关注我，下次继续聊。'],
      prompts:['当时具体发生了什么（时间、谁在场）','那段时间最真实的感受','是什么让你开始想改变','现在的状态变成了什么样','回头看最想说的一句话'],
      props:'安静室内、自然光、有故事的道具（旧照片/聊天记录注意打码）',
      note:'情绪类靠真实细节取胜，不说教；先讲发生了什么，再讲感受怎么变的；涉及他人注意隐私。'
    }
  };
  var genSel={type:'vlog',dur:30}, genTopic='', genScript=null, genTypeTouched=false;
  var genPoints=[], genPointSource='';
  var gzhGen={topic:'',crowd:'',results:[]};
  var xhsGen={topic:'',typeId:'',product:'',titles:[],picked:0,body:'',tags:'',points:[]};
  function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
  function fmtDur(s){ return Math.floor(s/60)+':'+pad(s%60); }

  /* ---- 主题清洗：剥离类型后缀、去掉重复段、取核心短语 ---- */
  function cleanTopic(raw){
    var src=(raw||'').trim();
    var parts=src.split(/[·｜|]/).map(function(x){return x.trim();}).filter(function(x){return x;});
    var out=[]; parts.forEach(function(p){ if(out[out.length-1]!==p) out.push(p); });
    var junk=['日常vlog','穿搭分享','好物测评','教程干货','情绪叙事','vlog','穿搭','测评','教程','种草','ootd','日常'];
    out=out.filter(function(p){ return junk.indexOf(p.toLowerCase().replace(/ /g,''))<0; });
    var full=out.join('，')||src;
    var first=full;
    ['，','。','；','！','？',',','.',';','!','?'].forEach(function(c){ var i=first.indexOf(c); if(i>=0) first=first.slice(0,i); });
    var short=(first.trim()||full).slice(0,16);
    return {full:full, short:short};
  }
  /* ---- 意图识别：决定用哪套叙事结构 ---- */
  function detectIntent(t){
    var K=[
      ['emotion',['家人','父母','妈妈','爸爸','吵架','大哭','闹别扭','情绪','内耗','焦虑','难过','委屈','关系','和好','联系','孤独','治愈','分手','朋友','压力','崩溃','恢复','想通']],
      ['ootd',['穿搭','搭配','衣服','裙','外套','显瘦','ootd','单品']],
      ['review',['测评','好物','开箱','回购','踩坑','值得买','使用感','实测']],
      ['tutorial',['教程','怎么做','步骤','方法','技巧','学会','攻略','新手','教学']],
      ['vlog',['vlog','日常','一天','周末','记录','生活','旅行','出门']]
    ];
    for(var i=0;i<K.length;i++){
      for(var j=0;j<K[i][1].length;j++){ if(t.indexOf(K[i][1][j])>=0) return K[i][0]; }
    }
    return '';
  }
  /* ---- 要点解析（用户输入：一行一条，也支持逗号/分号） ---- */
  function parsePoints(str){
    var arr=(str||'').split(String.fromCharCode(10));
    ['，',',','；',';'].forEach(function(c){
      var nx=[]; arr.forEach(function(x){ x.split(c).forEach(function(y){ if(y.trim()) nx.push(y.trim()); }); }); arr=nx;
    });
    return arr.filter(function(x){return x.length>=2;}).slice(0,6);
  }
  /* ---- 自动要点：长主题拆真实片段；短主题给明确占位 ---- */
  function autoPoints(full,T){
    var arr=[full];
    ['，','。','；','、','！','？',',','.',';','!','?'].forEach(function(c){
      var nx=[]; arr.forEach(function(x){ x.split(c).forEach(function(y){ if(y.trim()) nx.push(y.trim()); }); }); arr=nx;
    });
    arr=arr.filter(function(x){ return x.length>=3; });
    if(arr.length>=2) return arr.slice(0,5);
    return (T.prompts||[]).map(function(p){ return '【待补：'+p+'】'; });
  }
  function scriptPlainText(s){
    return '《'+s.title+'》完整口播稿\n\n'+s.scenes.map(function(sc,i){ return '【'+(i+1)+'】'+sc.line; }).join('\n');
  }
  function genBuild(topic){
    var c=cleanTopic(topic);
    var intent=detectIntent(c.full);
    if(!genTypeTouched && intent && GEN[intent]) genSel.type=intent;
    var T=GEN[genSel.type]||GEN.vlog;
    var target=genSel.dur;
    var mids = target===15 ? T.middles.slice(0,2)
             : target===60 ? T.middles.concat([T.extra])
             : T.middles.slice(0,3);
    var pts=genPoints.length?genPoints.slice():autoPoints(c.full,T);
    genPointSource=genPoints.length?'你填的内容要点':'从主题自动拆出的要点';
    var hook={visual:'近景口播 · 黄金3秒', line:pick(T.hooks), dur:4};
    var cta={visual:'近景口播 · 结尾号召', line:pick(T.ctas), dur:4};
    var plan=[hook].concat(mids,[cta]);
    var raw=plan.map(function(sc){return sc.dur;});
    var sum=raw.reduce(function(a,b){return a+b;},0);
    var scaled=raw.map(function(d){return Math.max(2,Math.round(d*target/sum));});
    var diff=target-scaled.reduce(function(a,b){return a+b;},0);
    if(diff!==0){ var mi=scaled.indexOf(Math.max.apply(null,scaled)); scaled[mi]=Math.max(2,scaled[mi]+diff); }
    var midIdx=0;
    var scenes=plan.map(function(sc,i){
      var line=sc.line.split('{t}').join(c.short);
      if(line.indexOf('{p}')>=0){
        var p = midIdx<pts.length ? pts[midIdx]
              : '【待补：'+(T.prompts[(midIdx-pts.length)%T.prompts.length]||'这里补一个真实细节')+'】';
        line=line.split('{p}').join(p);
        midIdx++;
      }
      return {visual:sc.visual, line:line,
        duration:fmtDur(scaled[i]),
        bgm: i===0?'轻快BGM':(i===plan.length-1?'收尾音效':'同BGM')};
    });
    var title=c.short+(c.short.indexOf(T.short)>=0?'':' · '+T.short);
    genScript={id:'', title:title, style:'', planDate:'', published:false,
      scenes:scenes, props:T.props, note:T.note, created:todayStr(),
      intent:T.label, structure:'黄金3秒钩子 → '+mids.length+' 个要点分镜 → 结尾号召',
      pointSource:genPointSource, brief:c.full,
      autoType:intent&&!genTypeTouched?'根据主题自动推荐':'你手动选择'};
  }
  /* ---- 抖音生成 UI ---- */
  function openGenModal(){
    genSel={type:'vlog',dur:30}; genTypeTouched=false; genPoints=[]; genPointSource='';
    var typeBtns=''; Object.keys(GEN).forEach(function(k){ typeBtns+='<button class="'+(k===genSel.type?'on':'')+'" data-act="gen-type" data-val="'+k+'">'+GEN[k].label+'</button>'; });
    var durBtns=[15,30,60].map(function(d){ return '<button class="'+(d===genSel.dur?'on':'')+'" data-act="gen-dur" data-val="'+d+'">'+d+'秒</button>'; }).join('');
    openModal(
      '<h3>✨ 一键生成脚本</h3>'
      +'<div class="sec-note">先识别主题属于哪类叙事，再把「内容要点」按顺序写进分镜。长主题会自动拆成要点；短主题给出【待补】提示，不替你编故事。</div>'
      +'<div class="form-row"><label>视频主题 / 选题</label><input class="input" id="g-topic" placeholder="例如：初秋通勤穿搭；也可以直接粘一整段真实经历"></div>'
      +'<div class="form-row"><label>内容要点（可选，一行一条；不填则从主题自动提取）</label>'
      +'<textarea class="textarea" id="g-points" style="min-height:76px" placeholder="例如：\n前几周跟家人闹了两次\n慢慢有了自己的周末\n状态恢复后才想联系"></textarea></div>'
      +'<div class="form-row"><label>脚本类型（按主题自动推荐，可手动改）</label><div class="seg" id="g-type">'+typeBtns+'</div></div>'
      +'<div class="form-row"><label>视频时长</label><div class="seg" id="g-dur">'+durBtns+'</div></div>'
      +'<div class="modal-actions"><button class="btn ghost" data-act="close-modal">取消</button>'
      +'<button class="btn" data-act="gen-run">🎁 生成脚本</button></div>'
    );
    setTimeout(function(){ var t=$('#g-topic'); if(t) t.focus(); },60);
  }
  function openGenResult(){
    var s=genScript;
    var total=s.scenes.reduce(function(a,sc){ var p=sc.duration.split(':'); return a+(+p[0])*60+(+p[1]); },0);
    var rows=s.scenes.map(function(sc,i){
      return '<tr><td style="width:34px;text-align:center;color:var(--ink-2)">'+(i+1)+'</td>'
      +'<td>'+esc(sc.visual)+'</td><td>'+esc(sc.line)+'</td>'
      +'<td style="width:56px">'+esc(sc.duration)+'</td></tr>';
    }).join('');
    var struct=['黄金3秒钩子','要点分镜','结尾号召'].map(function(x){return '<span class="chip blue">'+x+'</span>';}).join('');
    var insight='<div class="sec-note">🧠 识别为「'+esc(s.intent||'')+'」（'+esc(s.autoType||'')+'），'+esc(s.pointSource||'')+'；按「'+esc(s.structure||'')+'」编排，总时长对齐 '+total+' 秒。带【待补】的句子补上真实细节就能直接拍。</div>';
    openModal(
      '<h3>🎁 生成完成</h3>'+insight
      +'<div class="r-meta" style="margin-bottom:12px">'+struct
      +'<span class="chip pink">'+esc(s.title)+'</span>'
      +'<span class="chip">'+s.scenes.length+' 个分镜</span><span class="chip">约 '+total+' 秒</span></div>'
      +'<div class="form-row"><label>完整口播稿（可整段复制，配合提词器使用）</label>'
      +'<textarea class="textarea" id="g-copy" style="min-height:150px" readonly>'+esc(scriptPlainText(s))+'</textarea>'
      +'<button class="btn ghost sm" data-act="gen-copy" style="margin-top:6px">📋 复制口播稿</button></div>'
      +'<div class="form-row"><label>分镜预览</label>'
      +'<table class="scene-table"><thead><tr><th>#</th><th>画面</th><th>话术</th><th>时长</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
      +'<div class="modal-actions"><button class="btn ghost" data-act="gen-again">↻ 换一版</button>'
      +'<button class="btn ghost" data-act="close-modal">取消</button>'
      +'<button class="btn" data-act="gen-use">✎ 编辑并保存</button></div>'
    );
  }

  /* ---- 公众号选题生成（人群 × 痛点 × 场景 × 利益承诺） ---- */
  function gzhGenBuild(){
    var c=cleanTopic(gzhGen.topic), t=c.short, crowd=gzhGen.crowd;
    var full = crowd ? (crowd+'，'+t) : t;
    var F=GENX.gzh.formulas.slice();
    var chosen=[];
    while(chosen.length<5 && F.length){ chosen.push(F.splice(Math.floor(Math.random()*F.length),1)[0]); }
    gzhGen.results=chosen.map(function(f){
      var n=pick(GENX.gzh.nums);
      return {formula:f.name, title:f.build(full,n), angle:f.angle};
    });
  }
  function openGzhGenModal(){
    gzhGen={topic:'',crowd:'',results:[]};
    openModal(
      '<h3>✨ 一键生成选题</h3>'
      +'<div class="sec-note">按「人群 × 痛点 × 场景 × 利益承诺」的选题逻辑生成候选；过长的主题会自动取核心短语，避免标题变成一整段话。每个候选都附切入角度说明。</div>'
      +'<div class="form-row"><label>想写的主题 / 领域</label><input class="input" id="gg-topic" placeholder="例如：通勤穿搭、租房改造、副业赚钱"></div>'
      +'<div class="form-row"><label>目标人群（可选，写进标题更抓人）</label><input class="input" id="gg-crowd" placeholder="例如：职场新人、小个子女生、新手妈妈"></div>'
      +'<div class="modal-actions"><button class="btn ghost" data-act="close-modal">取消</button>'
      +'<button class="btn" data-act="gzh-gen-run">🎁 生成选题</button></div>'
    );
    setTimeout(function(){ var t=$('#gg-topic'); if(t) t.focus(); },60);
  }
  function openGzhGenResult(){
    var cards=gzhGen.results.map(function(r,i){
      return '<div class="row" style="align-items:center">'
        +'<div class="r-main"><div class="r-title">'+esc(r.title)+'</div>'
        +'<div class="r-note">💡 '+esc(r.angle)+'</div>'
        +'<div class="r-meta"><span class="chip purple">'+esc(r.formula)+'</span></div></div>'
        +'<div class="r-actions"><button class="btn sm" data-act="gzh-gen-pick" data-idx="'+i+'">选用</button></div></div>';
    }).join('');
    openModal(
      '<h3>🎁 选题候选</h3>'
      +'<div class="sec-note">主题「'+esc(gzhGen.topic)+(gzhGen.crowd?'」· 人群「'+esc(gzhGen.crowd):'')+'」。选用后自动加入公众号选题列表，日期默认今天，可再编辑调整。</div>'
      +'<div class="list">'+cards+'</div>'
      +'<div class="modal-actions"><button class="btn ghost" data-act="gzh-gen-run">↻ 换一批</button>'
      +'<button class="btn ghost" data-act="close-modal">取消</button></div>'
    );
  }

  /* ---- 小红书文案生成（标题公式 + 分类型正文骨架 + 标签） ---- */
  function xhsSkeleton(typeName){
    var S=GENX.xhs.skeletons[typeName];
    return S || GENX.xhs.generic;
  }
  function xhsGenBuild(){
    var t=cleanTopic(xhsGen.topic).short;
    var typeName=''; store.xhsCopyTypes.forEach(function(c){ if(c.id===xhsGen.typeId) typeName=c.name; });
    var prodName=''; store.xhsProducts.forEach(function(p){ if(p.id===xhsGen.product) prodName=p.name; });
    var F=GENX.xhs.titleFormulas.slice(), titles=[];
    while(titles.length<3 && F.length){ titles.push(F.splice(Math.floor(Math.random()*F.length),1)[0](t)); }
    var body='# '+titles[0]+'\n\n';
    var pts=xhsGen.points||[];
    xhsSkeleton(typeName).forEach(function(st){
      var para=st.p(t);
      if(prodName && st.h.indexOf('第一印象')>=0) para='这次主角是'+prodName+'，'+para;
      if(pts.length && st.h.indexOf('核心内容')>=0){
        para+='\n'+pts.map(function(p,i){return (i+1)+'. '+p;}).join('\n');
      }
      body+=st.h+'\n'+para+'\n\n';
    });
    var pool=GENX.xhs.tagPool.slice(), tags=[];
    while(tags.length<4 && pool.length){ tags.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]); }
    tags.unshift(t.replace(/ /g,''));
    xhsGen.titles=titles; xhsGen.picked=0; xhsGen.body=body.trim();
    xhsGen.tags=tags.map(function(x){return '#'+x;}).join(' ');
  }
  function openXhsGenModal(){
    xhsGen={topic:'',typeId:'',product:'',titles:[],picked:0,body:'',tags:'',points:[]};
    var typeOpts='<option value="">（不选，用通用结构）</option>'+store.xhsCopyTypes.map(function(t){return '<option value="'+t.id+'">'+esc(t.name)+'</option>';}).join('');
    var prodOpts='<option value="">（不关联）</option>'+store.xhsProducts.map(function(p){return '<option value="'+p.id+'">'+esc(p.name)+'</option>';}).join('');
    openModal(
      '<h3>✨ 一键生成文案</h3>'
      +'<div class="sec-note">按小红书笔记结构生成：标题公式（备选3个）+ 按文案类型分段的正文骨架 + 话题标签，生成后可编辑再存。</div>'
      +'<div class="form-row"><label>文案主题</label><input class="input" id="xg-topic" placeholder="例如：秋冬身体护理、租房好物、通勤妆容"></div>'
      +'<div class="form-row"><label>内容要点（可选，一行一条；会写进正文核心段）</label>'
      +'<textarea class="textarea" id="xg-points" style="min-height:70px" placeholder="例如：\n干燥起皮最严重的是小腿\n换过三款身体乳的对比\n坚持两周后的变化"></textarea></div>'
      +'<div class="form-row"><label>文案类型（决定正文骨架）</label><select class="select" id="xg-type">'+typeOpts+'</select></div>'
      +'<div class="form-row"><label>关联摆拍产品（可选）</label><select class="select" id="xg-product">'+prodOpts+'</select></div>'
      +'<div class="modal-actions"><button class="btn ghost" data-act="close-modal">取消</button>'
      +'<button class="btn" data-act="xhs-gen-run">🎁 生成文案</button></div>'
    );
    setTimeout(function(){ var t=$('#xg-topic'); if(t) t.focus(); },60);
  }
  function openXhsGenResult(){
    var radios=xhsGen.titles.map(function(tt,i){
      return '<label class="pub-check" style="margin:4px 0"><input type="radio" name="xg-title" value="'+i+'"'+(i===xhsGen.picked?' checked':'')+'> '+esc(tt)+'</label>';
    }).join('');
    openModal(
      '<h3>🎁 文案草稿</h3>'
      +'<div class="sec-note">标题三选一，正文可直接改。确认后「带入编辑」精修，或直接存为草稿。</div>'
      +'<div class="form-row"><label>标题（选一个）</label>'+radios+'</div>'
      +'<div class="form-row"><label>正文</label><textarea class="textarea" id="xg-body" style="min-height:220px">'+esc(xhsGen.body)+'</textarea></div>'
      +'<div class="form-row"><label>话题标签</label><input class="input" id="xg-tags" value="'+esc(xhsGen.tags)+'"></div>'
      +'<div class="modal-actions"><button class="btn ghost" data-act="xhs-gen-run">↻ 换一版</button>'
      +'<button class="btn ghost" data-act="close-modal">取消</button>'
      +'<button class="btn" data-act="xhs-gen-save">💾 存为草稿</button>'
      +'<button class="btn green" data-act="xhs-gen-use">✎ 带入编辑</button></div>'
    );
  }

  function renderDouyin(){
    var arr=store.douyinScripts;
    var body = arr.length
      ? arr.slice().reverse().map(function(s){
          return '<div class="row clickable" data-act="script-view" data-id="'+s.id+'"><div class="r-main"><div class="r-title">'+esc(s.title)+'</div>'
            +(s.style?'<div class="r-note">风格：'+esc(s.style)+'</div>':'')
            +'<div class="r-meta"><span class="chip blue">🎬 '+s.scenes.length+' 个分镜</span>'
            +(s.planDate?'<span class="chip">📅 '+esc(s.planDate)+'</span>':'')
            +(s.published?'<span class="chip green">已发布</span>':'<span class="chip">待拍</span>')
            +(s.created?'<span class="chip">建于 '+esc(s.created)+'</span>':'')+'</div></div>'
            +'<div class="r-actions"><button class="status-toggle'+(s.published?' on':'')+'" data-act="script-toggle" data-id="'+s.id+'">'+(s.published?'已发布':'标记已发布')+'</button>'
            +'<button class="icon-btn" data-act="script-edit" data-id="'+s.id+'">✎</button>'
            +'<button class="icon-btn" data-act="script-del" data-id="'+s.id+'">🗑</button></div></div>';
        }).join('')
      : '<div class="empty"><b>还没有脚本 🎬</b>先建一个穿搭视频脚本模版</div>';
    $('#view').innerHTML='<div class="view-head"><h2>🎬 抖音 · 穿搭脚本</h2><span class="sub">一键生成 + 脚本模版 + 随手新建</span>'
      +'<button class="btn green" style="margin-left:auto" data-act="gen-open">✨ 一键生成</button>'
      +'<button class="btn" data-act="script-new">➕ 新建脚本</button></div>'
      +'<div class="sec-note">「一键生成」输入主题即可自动生成分镜脚本+口播话术；给脚本填「计划发布日期」后会出现在日历与发布排期里。💡 点击脚本卡片可直接预览完整内容，点 ✎ 按钮才进入编辑。</div>'
      +'<div class="list">'+body+'</div>';
  }
  function openScriptModal(script){
    var isEdit=!!script;
    var s=script||{id:'',title:'',style:'',planDate:'',published:false,scenes:[{visual:'',line:'',duration:'',bgm:''}],props:'',note:''};
    var rows=s.scenes.map(function(sc,i){
      return '<tr data-idx="'+i+'">'
        +'<td style="width:34px;text-align:center;color:var(--ink-2)">'+(i+1)+'</td>'
        +'<td><input data-f="visual" value="'+esc(sc.visual)+'" placeholder="景别/画面"></td>'
        +'<td><textarea data-f="line" rows="2" placeholder="台词/字幕">'+esc(sc.line)+'</textarea></td>'
        +'<td style="width:64px"><input data-f="duration" value="'+esc(sc.duration)+'" placeholder="0:05"></td>'
        +'<td style="width:80px"><input data-f="bgm" value="'+esc(sc.bgm)+'" placeholder="BGM"></td>'
        +'<td style="width:36px"><button class="icon-btn" data-act="scene-del" data-idx="'+i+'">🗑</button></td></tr>';
    }).join('');
    openModal(
      '<h3>'+(isEdit?'✎ 编辑脚本':'➕ 新建脚本')+'</h3>'
      +'<div class="form-row"><label>视频标题 / 主题</label><input class="input" id="s-title" value="'+esc(s.title)+'" placeholder="例如：初秋温柔通勤穿搭"></div>'
      +'<div class="form-row"><label>风格 / 人设</label><input class="input" id="s-style" value="'+esc(s.style)+'" placeholder="例如：通勤温柔风"></div>'
      +'<div class="form-row"><label>计划发布日期（可选）</label><input class="input" id="s-plan" type="date" value="'+esc(s.planDate)+'"></div>'
      +'<div class="form-row"><label>分镜脚本</label>'
      +'<table class="scene-table"><thead><tr><th>#</th><th>景别/画面</th><th>台词/字幕</th><th>时长</th><th>BGM</th><th></th></tr></thead><tbody id="sceneBody">'+rows+'</tbody></table>'
      +'<button class="btn ghost sm" data-act="scene-add" style="margin-top:8px">＋ 添加分镜</button></div>'
      +'<div class="form-row"><label>道具 / 场景</label><textarea class="textarea" id="s-props" placeholder="手机支架、自然光…">'+esc(s.props)+'</textarea></div>'
      +'<div class="form-row"><label>备注</label><textarea class="textarea" id="s-note" style="min-height:70px" placeholder="拍摄要点…">'+esc(s.note)+'</textarea></div>'
      +'<label class="pub-check"><input type="checkbox" id="s-pub"'+(s.published?' checked':'')+'> 已发布（计入月目标）</label>'
      +'<div class="modal-actions"><button class="btn ghost" data-act="close-modal">取消</button>'
      +'<button class="btn" data-act="script-save" data-id="'+s.id+'">保存</button></div>'
    );
  }
  function openScriptPreview(s){
    var rows = s.scenes.map(function(sc,i){
      return '<tr><td style="width:34px;text-align:center;color:var(--ink-2)">'+(i+1)+'</td>'
        +'<td>'+esc(sc.visual||'—')+'</td>'
        +'<td>'+esc(sc.line||'—')+'</td>'
        +'<td style="width:64px">'+esc(sc.duration||'—')+'</td>'
        +'<td style="width:80px">'+esc(sc.bgm||'—')+'</td></tr>';
    }).join('');
    openModal(
      '<h3>🎬 '+esc(s.title)+'</h3>'
      +'<div class="r-meta" style="margin-bottom:14px">'
      +(s.style?'<span class="chip blue">风格：'+esc(s.style)+'</span>':'')
      +'<span class="chip">📅 '+(s.planDate?esc(s.planDate):'未排期')+'</span>'
      +(s.published?'<span class="chip green">已发布</span>':'<span class="chip yellow">待拍</span>')
      +(s.created?'<span class="chip">建于 '+esc(s.created)+'</span>':'')
      +'</div>'
      +'<div class="form-row"><label>分镜脚本（'+s.scenes.length+' 个）</label>'
      +'<table class="scene-table"><thead><tr><th>#</th><th>景别/画面</th><th>台词/字幕</th><th>时长</th><th>BGM</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
      +'<div class="form-row"><label>完整口播稿（可复制，配合提词器使用）</label>'
      +'<textarea class="textarea" id="g-copy" style="min-height:130px" readonly>'+esc(scriptPlainText(s))+'</textarea>'
      +'<button class="btn ghost sm" data-act="gen-copy" style="margin-top:6px">📋 复制口播稿</button></div>'
      +(s.props?'<div class="form-row"><label>道具 / 场景</label><div class="r-note">'+esc(s.props)+'</div></div>':'')
      +(s.note?'<div class="form-row"><label>备注</label><div class="r-note">'+esc(s.note)+'</div></div>':'')
      +'<div class="modal-actions">'
      +'<button class="btn ghost" data-act="close-modal">关闭</button>'
      +'<button class="btn" data-act="script-edit" data-id="'+s.id+'">✎ 编辑</button></div>'
    );
  }
  function readScenes(){
    var rows=document.querySelectorAll('#sceneBody tr'), out=[];
    rows.forEach(function(tr){ var o={}; tr.querySelectorAll('[data-f]').forEach(function(inp){ o[inp.dataset.f]=inp.value.trim(); }); out.push(o); });
    return out;
  }
  function openProdModal(p){
    var isEdit=!!p, o=p||{id:'',name:'',cat:'',note:''};
    openModal('<h3>'+(isEdit?'✎ 编辑产品':'➕ 添加摆拍产品')+'</h3>'
      +'<div class="form-row"><label>产品名称</label><input class="input" id="p-name" value="'+esc(o.name)+'"></div>'
      +'<div class="form-row"><label>类目（可选）</label><input class="input" id="p-cat" value="'+esc(o.cat)+'" placeholder="穿搭/好物/美妆…"></div>'
      +'<div class="form-row"><label>备注（可选）</label><textarea class="textarea" id="p-note" placeholder="拍摄角度、数量…">'+esc(o.note)+'</textarea></div>'
      +'<div class="modal-actions"><button class="btn ghost" data-act="close-modal">取消</button><button class="btn" data-act="prod-save" data-id="'+o.id+'">保存</button></div>');
  }
  function openProdPreview(p){
    openModal(
      '<h3>🛍️ '+esc(p.name)+'</h3>'
      +'<div class="r-meta" style="margin-bottom:14px">'
      +(p.cat?'<span class="chip pink">'+esc(p.cat)+'</span>':'<span class="chip">未分类</span>')
      +(p.shot?'<span class="chip green">已拍</span>':'<span class="chip yellow">待拍</span>')
      +'</div>'
      +'<div class="form-row"><label>拍摄备注</label>'
      +'<div style="font-size:14.5px;color:var(--ink);line-height:1.9;white-space:pre-wrap;word-break:break-word;background:#f7f5f1;border-radius:14px;padding:14px">'+(p.note?esc(p.note):'（还没有写拍摄备注）')+'</div></div>'
      +'<div class="modal-actions">'
      +'<button class="btn ghost" data-act="close-modal">关闭</button>'
      +'<button class="btn" data-act="prod-edit" data-id="'+p.id+'">✎ 编辑</button></div>'
    );
  }
  function openCtypeModal(c){
    var isEdit=!!c, o=c||{id:'',name:'',desc:''};
    openModal('<h3>'+(isEdit?'✎ 编辑类型':'➕ 添加文案类型')+'</h3>'
      +'<div class="form-row"><label>类型名称</label><input class="input" id="ct-name" value="'+esc(o.name)+'" placeholder="种草测评"></div>'
      +'<div class="form-row"><label>说明（可选）</label><textarea class="textarea" id="ct-desc" placeholder="这个类型怎么写…">'+esc(o.desc)+'</textarea></div>'
      +'<div class="modal-actions"><button class="btn ghost" data-act="close-modal">取消</button><button class="btn" data-act="ctype-save" data-id="'+o.id+'">保存</button></div>');
  }

  function openCtypePreview(c){
    openModal(
      '<h3>🏷️ '+esc(c.name)+'</h3>'
      +'<div class="form-row"><label>类型说明</label>'
      +'<div style="font-size:14.5px;color:var(--ink);line-height:1.9;white-space:pre-wrap;word-break:break-word;background:#f7f5f1;border-radius:14px;padding:14px">'+(c.desc?esc(c.desc):'（还没有写类型说明）')+'</div></div>'
      +'<div class="modal-actions">'
      +'<button class="btn ghost" data-act="close-modal">关闭</button>'
      +'<button class="btn" data-act="ctype-edit" data-id="'+c.id+'">✎ 编辑</button></div>'
    );
  }

  /* ===================== 月目标 ===================== */
  function monthMetrics(ym){
    var r={gzh:0,xhs:0,douyin:0};
    store.tasks.forEach(function(t){ if(t.type==='gzh'&&t.done&&t.date&&t.date.indexOf(ym)===0) r.gzh++; });
    store.xhsCopies.forEach(function(c){ if(c.status==='posted'&&c.date&&c.date.indexOf(ym)===0) r.xhs++; });
    store.douyinScripts.forEach(function(s){ if(s.published&&s.planDate&&s.planDate.indexOf(ym)===0) r.douyin++; });
    return r;
  }
  function renderGoals(){
    var ym=todayStr().slice(0,7), g=store.goals||{gzh:0,xhs:0,douyin:0}, cur=monthMetrics(ym);
    function bar(metric,label,emoji,cls,actual,goal){
      var pct = goal>0 ? Math.min(100, Math.round(actual/goal*100)) : (actual>0?100:0);
      return '<div class="goal-row"><div class="goal-top"><span>'+emoji+' '+label+'</span>'
        +'<span class="chip '+cls+'">'+actual+' / '+(goal||'—')+'</span></div>'
        +'<div class="goal-bar"><div class="goal-fill gf-'+cls+'" style="width:'+pct+'%"></div></div>'
        +'<div class="goal-pct">'+pct+'%</div></div>';
    }
    var html='<div class="view-head"><h2>🎯 月目标</h2><span class="sub">'+ym.replace('-','年 ')+'月 · 自动统计进度</span></div>'
      +'<div class="card"><div class="sec-note">设置本月目标数，下方进度会按「已发/已发布」自动累计（数据来自日历、文案记录、脚本）。</div>'
      +'<div class="goal-edit">'
      +'<div class="goal-inp"><label>公众号已发（篇）</label><input class="input" type="number" min="0" id="goal-gzh" value="'+(g.gzh||0)+'"></div>'
      +'<div class="goal-inp"><label>小红书已发（篇）</label><input class="input" type="number" min="0" id="goal-xhs" value="'+(g.xhs||0)+'"></div>'
      +'<div class="goal-inp"><label>抖音发布（条）</label><input class="input" type="number" min="0" id="goal-douyin" value="'+(g.douyin||0)+'"></div>'
      +'</div><div style="margin-top:4px"><button class="btn" data-act="goals-save">💾 保存目标</button></div></div>'
      +'<div class="card" style="margin-top:14px">'
      + bar('gzh','公众号','📝','purple',cur.gzh,g.gzh)
      + bar('xhs','小红书','📕','pink',cur.xhs,g.xhs)
      + bar('douyin','抖音','🎬','blue',cur.douyin,g.douyin)
      + '</div>';
    $('#view').innerHTML=html;
  }

  /* ===================== 入口链接 ===================== */
  function markRecent(id){
    var link=store.links.find(function(l){return l.id===id;}); if(!link) return;
    store.recent=store.recent.filter(function(x){return x!==id;});
    store.recent.unshift(id); store.recent=store.recent.slice(0,6); save();
  }
  function hostOf(u){ try{ return new URL(u).host; }catch(e){ return u; } }
  function renderLinks(){
    var grad=function(c){ var p=PRESET[c]||PRESET.purple; return 'background:linear-gradient(135deg,'+p[0]+','+p[1]+')'; };
    var recents=store.recent.map(function(id){return store.links.find(function(l){return l.id===id;});}).filter(Boolean);
    var recentHtml = recents.length
      ? '<div class="recent-row">'+recents.map(function(l){
          return '<a class="recent-pill" href="'+esc(l.url)+'" target="_blank" rel="noopener" data-act="link-go" data-id="'+l.id+'">'
            +'<i style="'+grad(l.color)+'">'+l.emoji+'</i>'+esc(l.name)+'</a>';
        }).join('')+'</div>' : '';
    var cards=store.links.map(function(l){
      return '<div class="link-card"><div class="la"><button class="icon-btn" data-act="link-edit" data-id="'+l.id+'">✎</button>'
        +'<button class="icon-btn" data-act="link-del" data-id="'+l.id+'">🗑</button></div>'
        +'<div class="link-ic" style="'+grad(l.color)+'">'+l.emoji+'</div>'
        +'<h3>'+esc(l.name)+'</h3><div class="lh">'+esc(hostOf(l.url))+'</div>'
        +'<a class="btn sm" style="margin-top:4px" href="'+esc(l.url)+'" target="_blank" rel="noopener" data-act="link-go" data-id="'+l.id+'">打开 ↗</a></div>';
    }).join('');
    $('#view').innerHTML='<div class="view-head"><h2>🔗 常用入口</h2><span class="sub">把常用网站收拢一处</span>'
      +'<button class="btn" style="margin-left:auto" data-act="link-new">➕ 添加入口</button></div>'
      +'<div class="sec-note">已接入：灵感匣、公众号助推助手、红算子·小红书运营、副业收集工作台等。点「添加入口」可自定义。</div>'
      +recentHtml+'<div class="link-grid">'+cards+'</div>';
  }
  function openLinkModal(link){
    var isEdit=!!link, l=link||{id:'',name:'',url:'',emoji:'🔗',color:'purple'};
    var colorOpts=Object.keys(PRESET).map(function(k){return '<option value="'+k+'"'+(k===l.color?' selected':'')+'>'+k+'</option>';}).join('');
    openModal(
      '<h3>'+(isEdit?'✎ 编辑入口':'➕ 添加入口')+'</h3>'
      +'<div class="form-row"><label>名称</label><input class="input" id="l-name" value="'+esc(l.name)+'" placeholder="例如：灵感匣"></div>'
      +'<div class="form-row"><label>网址</label><input class="input" id="l-url" value="'+esc(l.url)+'" placeholder="https://…"></div>'
      +'<div class="form-row"><label>图标 emoji</label><input class="input" id="l-emoji" value="'+esc(l.emoji)+'" style="width:80px;text-align:center;font-size:18px"></div>'
      +'<div class="form-row"><label>配色</label><select class="select" id="l-color">'+colorOpts+'</select></div>'
      +'<div class="modal-actions"><button class="btn ghost" data-act="close-modal">取消</button>'
      +'<button class="btn" data-act="link-save" data-id="'+l.id+'">保存</button></div>'
    );
  }

  /* ===================== 备份 ===================== */
  function openBackup(){
    openModal(
      '<h3>⚙️ 数据备份</h3>'
      +'<div class="sec-note">所有数据都存在本机浏览器（localStorage）。换设备或清缓存前，建议导出备份；误删也能导入恢复。</div>'
      +'<div class="form-row"><b>导出备份</b><div class="r-note">下载一个 JSON 文件，安全保存在电脑里。</div>'
      +'<button class="btn" data-act="backup-export" style="margin-top:8px">⬇️ 导出 JSON</button></div>'
      +'<div class="form-row" style="margin-top:14px"><b>导入恢复</b><div class="r-note">选择之前导出的 JSON，会覆盖当前数据（请先导出再导入）。</div>'
      +'<input type="file" id="backup-file" accept="application/json,.json" style="margin-top:8px">'
      +'<button class="btn ghost" data-act="backup-import" style="margin-top:8px">⬆️ 导入并覆盖</button></div>'
    );
  }
  function exportData(){
    var blob=new Blob([JSON.stringify(store,null,2)],{type:'application/json'});
    var a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download='甜筒工作台-备份-'+todayStr()+'.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 1000);
    toast('已导出备份 🍬');
  }
  function importData(){
    var inp=$('#backup-file'); if(!inp||!inp.files.length){ toast('先选择一个 JSON 文件'); return; }
    var fr=new FileReader();
    fr.onload=function(){
      try{
        var data=JSON.parse(fr.result);
        if(!data.tasks) throw 0;
        store=data; save(); closeModal(); switchView(currentView); toast('导入成功，数据已恢复 ✅');
      }catch(e){ toast('文件格式不对，导入失败'); }
    };
    fr.readAsText(inp.files[0]);
  }

  function refreshCurrent(){
    if(drawerDate) openDay(drawerDate);
    switchView(currentView);
  }

  /* ===================== 全局事件 ===================== */
  document.addEventListener('click', function(e){
    var t=e.target.closest('[data-act]'); if(!t) return;
    var act=t.dataset.act, id=t.dataset.id, task, idx;

    switch(act){
      case 'close-modal': closeModal(); break;
      case 'close-drawer': closeDrawer(); break;

      case 'cal-tab': cal.calTab=t.dataset.tab; renderCalendar(); break;
      case 'cal-prev':
        if(cal.calTab==='week'){ var pw=parseYmd(cal.focus); pw.setDate(pw.getDate()-7); cal.focus=ymd(pw); }
        else { var pm=parseYmd(cal.focus); pm.setMonth(pm.getMonth()-1); cal.focus=ymd(pm); }
        renderCalendar(); break;
      case 'cal-next':
        if(cal.calTab==='week'){ var nw=parseYmd(cal.focus); nw.setDate(nw.getDate()+7); cal.focus=ymd(nw); }
        else { var nm=parseYmd(cal.focus); nm.setMonth(nm.getMonth()+1); cal.focus=ymd(nm); }
        renderCalendar(); break;
      case 'cal-today': cal.focus=todayStr(); renderCalendar(); break;
      case 'open-day': openDay(t.dataset.date); break;
      case 'qa-add': closeDrawer(); openTaskModal(null,{date:t.dataset.date, type:t.dataset.type}); break;

      case 'task-toggle':
        task=store.tasks.find(function(x){return x.id===id;}); if(task){ task.done=!task.done; save(); refreshCurrent(); } break;
      case 'task-view':
        var tv=store.tasks.find(function(x){return x.id===id;}); if(tv) openTaskPreview(tv); break;
      case 'task-edit':
        task=store.tasks.find(function(x){return x.id===id;}); if(task) openTaskModal(task); break;
      case 'task-del':
        if(confirm('确定删除这条？')){ store.tasks=store.tasks.filter(function(x){return x.id!==id;}); save(); refreshCurrent(); toast('已删除'); } break;
      case 'task-save':
        var fDate=$('#t-date').value||todayStr(), title=$('#t-title').value.trim();
        if(!title){ toast('标题不能为空'); return; }
        if(id){ task=store.tasks.find(function(x){return x.id===id;}); if(task){ task.date=fDate; task.type=$('#t-type').value; task.title=title; task.time=$('#t-time').value; task.note=$('#t-note').value.trim(); } }
        else { store.tasks.push({id:uid(), date:fDate, type:$('#t-type').value, title:title, time:$('#t-time').value, note:$('#t-note').value.trim(), done:false}); }
        save(); closeModal(); refreshCurrent(); toast('已保存 🍬'); break;

      case 'gzh-new': openTaskModal(null,{date:todayStr(), type:'gzh'}); break;

      case 'xhs-tab': xhsTab=t.dataset.tab; renderXhs(); break;
      case 'prod-toggle': var p=store.xhsProducts.find(function(x){return x.id===id;}); if(p){p.shot=!p.shot; save(); renderXhsProducts();} break;
      case 'prod-view': var pdv=store.xhsProducts.find(function(x){return x.id===id;}); if(pdv) openProdPreview(pdv); break;
      case 'prod-edit': var pe=store.xhsProducts.find(function(x){return x.id===id;}); if(pe) openProdModal(pe); break;
      case 'prod-del': if(confirm('删除该产品？')){ store.xhsProducts=store.xhsProducts.filter(function(x){return x.id!==id;}); save(); renderXhsProducts(); toast('已删除'); } break;
      case 'prod-new': openProdModal(null); break;
      case 'prod-save':
        var pn=$('#p-name').value.trim(); if(!pn){toast('名称不能为空');return;}
        if(id){ var pu=store.xhsProducts.find(function(x){return x.id===id;}); if(pu){pu.name=pn;pu.cat=$('#p-cat').value.trim();pu.note=$('#p-note').value.trim();} }
        else { store.xhsProducts.push({id:uid(), name:pn, cat:$('#p-cat').value.trim(), note:$('#p-note').value.trim(), shot:false}); }
        save(); closeModal(); renderXhsProducts(); toast('已保存 🍬'); break;

      case 'ctype-view': var ctv=store.xhsCopyTypes.find(function(x){return x.id===id;}); if(ctv) openCtypePreview(ctv); break;
      case 'ctype-edit': var ce=store.xhsCopyTypes.find(function(x){return x.id===id;}); if(ce) openCtypeModal(ce); break;
      case 'ctype-del': if(confirm('删除该文案类型？')){ store.xhsCopyTypes=store.xhsCopyTypes.filter(function(x){return x.id!==id;}); save(); renderXhsTypes(); toast('已删除'); } break;
      case 'ctype-new': openCtypeModal(null); break;
      case 'ctype-save':
        var cn=$('#ct-name').value.trim(); if(!cn){toast('名称不能为空');return;}
        if(id){ var cu=store.xhsCopyTypes.find(function(x){return x.id===id;}); if(cu){cu.name=cn;cu.desc=$('#ct-desc').value.trim();} }
        else { store.xhsCopyTypes.push({id:uid(), name:cn, desc:$('#ct-desc').value.trim()}); }
        save(); closeModal(); renderXhsTypes(); toast('已保存 🍬'); break;

      case 'copy-view': var cv=store.xhsCopies.find(function(x){return x.id===id;}); if(cv) openCopyPreview(cv); break;
      case 'copy-toggle': var c=store.xhsCopies.find(function(x){return x.id===id;}); if(c){c.status=(c.status==='posted'?'draft':'posted'); save(); renderXhsCopies(); if(currentView==='calendar') renderCalendar();} break;
      case 'copy-edit': var ce2=store.xhsCopies.find(function(x){return x.id===id;}); if(ce2) openCopyModal(ce2); break;
      case 'copy-del': if(confirm('删除该文案？')){ store.xhsCopies=store.xhsCopies.filter(function(x){return x.id!==id;}); save(); renderXhsCopies(); if(currentView==='calendar') renderCalendar(); toast('已删除'); } break;
      case 'copy-new': openCopyModal(null); break;
      case 'copy-save':
        var ctitle=$('#c-title').value.trim(); if(!ctitle){toast('标题不能为空');return;}
        if(id){ var cu2=store.xhsCopies.find(function(x){return x.id===id;}); if(cu2){cu2.title=ctitle;cu2.typeId=$('#c-type').value;cu2.product=$('#c-product').value;cu2.body=$('#c-body').value.trim();cu2.date=$('#c-date').value;cu2.status=$('#c-status').value;} }
        else { store.xhsCopies.push({id:uid(), title:ctitle, typeId:$('#c-type').value, product:$('#c-product').value, body:$('#c-body').value.trim(), date:$('#c-date').value, status:$('#c-status').value}); }
        save(); closeModal(); renderXhsCopies(); if(currentView==='calendar') renderCalendar(); toast('已保存 🍬'); break;

      case 'script-new':
        if(confirm('用内置「穿搭视频脚本模版」开始，还是空白新建？\n确定=用模版，取消=空白')){ openScriptModal(null); }
        else { openScriptModal({id:'',title:'',style:'',planDate:'',published:false,scenes:[{visual:'',line:'',duration:'',bgm:''}],props:'',note:''}); }
        break;
      case 'gen-open': openGenModal(); break;
      case 'gen-type':
        genSel.type=t.dataset.val; genTypeTouched=true;
        document.querySelectorAll('#g-type button').forEach(function(b){ b.classList.toggle('on', b.dataset.val===genSel.type); });
        break;
      case 'gen-dur':
        genSel.dur=+t.dataset.val;
        document.querySelectorAll('#g-dur button').forEach(function(b){ b.classList.toggle('on', +b.dataset.val===genSel.dur); });
        break;
      case 'gen-run':
        genTopic=($('#g-topic').value||'').trim();
        if(!genTopic){ toast('先填写视频主题'); return; }
        genPoints=parsePoints($('#g-points')?$('#g-points').value:'');
        genBuild(genTopic); openGenResult(); break;
      case 'gen-again': genBuild(genTopic); openGenResult(); break;
      case 'gen-use': closeModal(); openScriptModal(genScript); break;
      case 'gen-copy':
        var ta=$('#g-copy');
        if(ta){ ta.select(); try{ document.execCommand('copy'); toast('口播稿已复制 📋'); }catch(e){ toast('复制失败，请手动选择复制'); } }
        break;
      case 'gzh-gen-open': openGzhGenModal(); break;
      case 'gzh-gen-run':
        var gt=($('#gg-topic').value||'').trim();
        if(!gt){ toast('先填写想写的主题'); return; }
        gzhGen.topic=cleanTopic(gt).short; gzhGen.crowd=($('#gg-crowd').value||'').trim();
        gzhGenBuild(); openGzhGenResult(); break;
      case 'gzh-gen-pick':
        var gi=+t.dataset.idx, gr=gzhGen.results[gi];
        if(gr){
          store.tasks.push({id:uid(), type:'gzh', title:gr.title, date:todayStr(), time:'', done:false,
            note:'【切入角度】'+gr.angle+'\n【标题公式】'+gr.formula+'（一键生成于 '+todayStr()+'，可按需调整）'});
          save(); closeModal(); renderGzh(); if(currentView==='calendar') renderCalendar();
          toast('已加入选题列表 📝');
        }
        break;
      case 'xhs-gen-open': openXhsGenModal(); break;
      case 'xhs-gen-run':
        var xt=($('#xg-topic').value||'').trim();
        if(!xt){ toast('先填写文案主题'); return; }
        xhsGen.topic=cleanTopic(xt).short; xhsGen.typeId=$('#xg-type').value; xhsGen.product=$('#xg-product').value;
        xhsGen.points=parsePoints($('#xg-points')?$('#xg-points').value:'');
        xhsGenBuild(); openXhsGenResult(); break;
      case 'xhs-gen-save':
        var xr0=document.querySelector('input[name="xg-title"]:checked');
        var xti0=xr0?xhsGen.titles[+xr0.value]:xhsGen.titles[0];
        var xb0=($('#xg-body').value||'').trim();
        var xg0=($('#xg-tags').value||'').trim();
        if(!xti0){ toast('标题不能为空'); return; }
        store.xhsCopies.push({id:uid(), title:xti0, typeId:xhsGen.typeId, product:xhsGen.product,
          body:xb0+(xg0?('\n\n'+xg0):''), date:'', status:'draft'});
        save(); closeModal(); renderXhsCopies(); toast('已存为草稿 📝'); break;
      case 'xhs-gen-use':
        var xr1=document.querySelector('input[name="xg-title"]:checked');
        var xti1=xr1?xhsGen.titles[+xr1.value]:xhsGen.titles[0];
        var xb1=($('#xg-body').value||'').trim();
        var xg1=($('#xg-tags').value||'').trim();
        closeModal();
        openCopyModal({id:'', title:xti1, typeId:xhsGen.typeId, product:xhsGen.product,
          body:xb1+(xg1?('\n\n'+xg1):''), date:'', status:'draft'});
        break;
      case 'script-view': var sv=store.douyinScripts.find(function(x){return x.id===id;}); if(sv) openScriptPreview(sv); break;
      case 'script-toggle':
        var sc=store.douyinScripts.find(function(x){return x.id===id;}); if(sc){sc.published=!sc.published; save(); renderDouyin(); if(currentView==='calendar'||currentView==='goals') refreshCurrent(); else refreshCurrent();} break;
      case 'script-edit': var se=store.douyinScripts.find(function(x){return x.id===id;}); if(se) openScriptModal(se); break;
      case 'script-del': if(confirm('删除该脚本？')){ store.douyinScripts=store.douyinScripts.filter(function(x){return x.id!==id;}); save(); renderDouyin(); toast('已删除'); } break;
      case 'scene-add':
        var tb=$('#sceneBody'); if(tb){
          var i=tb.children.length;
          var tr=document.createElement('tr'); tr.dataset.idx=i;
          tr.innerHTML='<td style="text-align:center;color:var(--ink-2)">'+(i+1)+'</td>'
            +'<td><input data-f="visual" placeholder="景别/画面"></td>'
            +'<td><textarea data-f="line" rows="2" placeholder="台词/字幕"></textarea></td>'
            +'<td><input data-f="duration" placeholder="0:05"></td>'
            +'<td><input data-f="bgm" placeholder="BGM"></td>'
            +'<td><button class="icon-btn" data-act="scene-del" data-idx="'+i+'">🗑</button></td>';
          tb.appendChild(tr); renumberScenes();
        }
        break;
      case 'scene-del':
        var tr2=t.closest('tr'); if(tr2&&tr2.parentNode) tr2.parentNode.removeChild(tr2); renumberScenes(); break;
      case 'script-save':
        var stitle=$('#s-title').value.trim(); if(!stitle){toast('标题不能为空');return;}
        var scenes=readScenes();
        if(id){ var su=store.douyinScripts.find(function(x){return x.id===id;}); if(su){su.title=stitle;su.style=$('#s-style').value.trim();su.planDate=$('#s-plan').value;su.published=$('#s-pub').checked;su.scenes=scenes;su.props=$('#s-props').value.trim();su.note=$('#s-note').value.trim();} }
        else { store.douyinScripts.push({id:uid(), title:stitle, style:$('#s-style').value.trim(), planDate:$('#s-plan').value, published:$('#s-pub').checked, scenes:scenes, props:$('#s-props').value.trim(), note:$('#s-note').value.trim(), created:todayStr()}); }
        save(); closeModal(); renderDouyin(); if(currentView==='calendar'||currentView==='goals') refreshCurrent(); else refreshCurrent(); toast('已保存 🍬'); break;

      case 'link-new': openLinkModal(null); break;
      case 'link-edit': var le=store.links.find(function(x){return x.id===id;}); if(le) openLinkModal(le); break;
      case 'link-del': if(confirm('删除该入口？')){ store.links=store.links.filter(function(x){return x.id!==id;}); save(); renderLinks(); toast('已删除'); } break;
      case 'link-go': markRecent(id); break;
      case 'link-save':
        var ln=$('#l-name').value.trim(), lu=$('#l-url').value.trim();
        if(!ln){toast('名称不能为空');return;}
        if(!/^https?:\/\//.test(lu)){ toast('网址要以 http:// 或 https:// 开头'); return; }
        if(id){ var lu2=store.links.find(function(x){return x.id===id;}); if(lu2){lu2.name=ln;lu2.url=lu;lu2.emoji=$('#l-emoji').value.trim()||'🔗';lu2.color=$('#l-color').value;} }
        else { store.links.push({id:uid(), name:ln, url:lu, emoji:$('#l-emoji').value.trim()||'🔗', color:$('#l-color').value}); }
        save(); closeModal(); renderLinks(); toast('已保存 🍬'); break;

      case 'goals-save':
        store.goals=store.goals||{};
        store.goals.gzh=Math.max(0, parseInt($('#goal-gzh').value)||0);
        store.goals.xhs=Math.max(0, parseInt($('#goal-xhs').value)||0);
        store.goals.douyin=Math.max(0, parseInt($('#goal-douyin').value)||0);
        save(); renderGoals(); toast('目标已保存 🎯'); break;

      case 'backup-export': exportData(); break;
      case 'backup-import': importData(); break;
    }
  });

  function renumberScenes(){
    var tb=$('#sceneBody'); if(!tb) return;
    Array.prototype.forEach.call(tb.children, function(tr,i){
      tr.dataset.idx=i;
      var num=tr.querySelector('td'); if(num) num.textContent=(i+1);
      var del=tr.querySelector('[data-act="scene-del"]'); if(del) del.dataset.idx=i;
    });
  }

  /* ===================== 初始化 ===================== */
  (function init(){
    var h=13; try{ h=new Date().getHours(); }catch(e){}
    var g = h<11?'早上好':(h<14?'中午好':(h<18?'下午好':'晚上好'));
    $('#greeting').textContent = g+'呀 🍬 今天也要元气满满地搞副业～';
    $('#btnBackup').addEventListener('click', openBackup);
    document.addEventListener('keydown', function(e){ if(e.key==='Escape'){ closeModal(); closeDrawer(); } });
    switchView('calendar');
  })();

})();

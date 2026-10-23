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
    pink:   ['#ffd0e4','#ff8fb8'],
    red:    ['#ffd6e8','#ff6b8b'],
    green:  ['#d4f3e0','#56c596'],
    blue:   ['#d6ecff','#5aa9f0'],
    purple: ['#e7dcff','#a07cff'],
    yellow: ['#fff2cf','#f5c84b']
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
  $('#drawerMask').addEventListener('click', closeDrawer);
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
    return '<div class="card today-card"><div class="tc-head"><div><b style="font-family:ZCOOL KuaiLe;font-size:17px">今天 · '+((new Date()).getMonth()+1)+'月'+((new Date()).getDate())+'日 周'+DOW[(new Date()).getDay()]+'</b></div>'
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

  /* ===================== 公众号 ===================== */
  function renderGzh(){
    var items=store.tasks.filter(function(t){return t.type==='gzh';}).slice().sort(function(a,b){return a.date.localeCompare(b.date);});
    var body = items.length
      ? items.map(function(t){
          return '<div class="row"><div class="r-main"><div class="r-title">'+esc(t.title)+'</div>'
            +(t.note?'<div class="r-note">'+esc(t.note)+'</div>':'')
            +'<div class="r-meta"><span class="chip purple">📅 '+t.date+(t.time?' '+esc(t.time):'')+'</span>'
            +(t.done?'<span class="chip green">已发</span>':'<span class="chip">待写</span>')+'</div></div>'
            +'<div class="r-actions"><button class="status-toggle'+(t.done?' on':'')+'" data-act="task-toggle" data-id="'+t.id+'">'+(t.done?'已发':'标记已发')+'</button>'
            +'<button class="icon-btn" data-act="task-edit" data-id="'+t.id+'">✎</button>'
            +'<button class="icon-btn" data-act="task-del" data-id="'+t.id+'">🗑</button></div></div>';
        }).join('')
      : '<div class="empty"><b>还没有公众号选题 📝</b>点右边「新建选题」，提前把每天要写的题目标进日历</div>';
    $('#view').innerHTML='<div class="view-head"><h2>📝 公众号选题</h2><span class="sub">日更节奏 · 提前规划</span>'
      +'<button class="btn" style="margin-left:auto" data-act="gzh-new">➕ 新建选题</button></div>'
      +'<div class="sec-note">所有选题都会同步显示在「日历 / 发布排期」对应日期上。</div>'
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
          return '<div class="row"><div class="r-main"><div class="r-title">'+esc(p.name)+'</div>'
            +(p.note?'<div class="r-note">'+esc(p.note)+'</div>':'')
            +'<div class="r-meta">'+(p.cat?'<span class="chip pink">'+esc(p.cat)+'</span>':'')
            +(p.shot?'<span class="chip green">已拍</span>':'<span class="chip">待拍</span>')+'</div></div>'
            +'<div class="r-actions"><button class="status-toggle'+(p.shot?' on':'')+'" data-act="prod-toggle" data-id="'+p.id+'">'+(p.shot?'已拍':'标记已拍')+'</button>'
            +'<button class="icon-btn" data-act="prod-edit" data-id="'+p.id+'">✎</button>'
            +'<button class="icon-btn" data-act="prod-del" data-id="'+p.id+'">🗑</button></div></div>';
        }).join('')
      : '<div class="empty"><b>还没有摆拍产品 🛍️</b>把要拍的产品记下来，拍完一键标记</div>';
    $('#xhs-products').innerHTML='<div class="sec-note">记录要拍摄/摆拍的产品，拍完标记「已拍」，避免漏拍。</div>'
      +'<div style="margin-bottom:12px"><button class="btn" data-act="prod-new">➕ 添加产品</button></div>'
      +'<div class="list">'+body+'</div>';
  }
  function renderXhsTypes(){
    var arr=store.xhsCopyTypes;
    var body = arr.length
      ? arr.map(function(c){
          return '<div class="row"><div class="r-main"><div class="r-title">'+esc(c.name)+'</div>'
            +(c.desc?'<div class="r-note">'+esc(c.desc)+'</div>':'')+'</div>'
            +'<div class="r-actions"><button class="icon-btn" data-act="ctype-edit" data-id="'+c.id+'">✎</button>'
            +'<button class="icon-btn" data-act="ctype-del" data-id="'+c.id+'">🗑</button></div></div>';
        }).join('')
      : '<div class="empty"><b>还没有文案类型 🏷️</b>先定义你常发的几种文案类型</div>';
    $('#xhs-types').innerHTML='<div class="sec-note">规划你「每天发什么类型的文案」（种草/测评/穿搭）。写文案时可一键选类型。</div>'
      +'<div style="margin-bottom:12px"><button class="btn" data-act="ctype-new">➕ 添加类型</button></div>'
      +'<div class="list">'+body+'</div>';
  }
  function renderXhsCopies(){
    var arr=store.xhsCopies;
    var prodName={}; store.xhsProducts.forEach(function(p){prodName[p.id]=p.name;});
    var typeName={}; store.xhsCopyTypes.forEach(function(c){typeName[c.id]=c.name;});
    var body = arr.length
      ? arr.slice().sort(function(a,b){return (b.date||'').localeCompare(a.date||'');}).map(function(c){
          return '<div class="row"><div class="r-main"><div class="r-title">'+esc(c.title)+'</div>'
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
    $('#xhs-copies').innerHTML='<div class="sec-note">专属「文案记录」区：标题、类型、关联产品、正文、发布日期、状态一目了然。</div>'
      +'<div style="margin-bottom:12px"><button class="btn" data-act="copy-new">➕ 新建文案</button></div>'
      +'<div class="list">'+body+'</div>';
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
  function renderDouyin(){
    var arr=store.douyinScripts;
    var body = arr.length
      ? arr.slice().reverse().map(function(s){
          return '<div class="row"><div class="r-main"><div class="r-title">'+esc(s.title)+'</div>'
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
    $('#view').innerHTML='<div class="view-head"><h2>🎬 抖音 · 穿搭脚本</h2><span class="sub">脚本模版 + 随手新建</span>'
      +'<button class="btn" style="margin-left:auto" data-act="script-new">➕ 新建脚本</button></div>'
      +'<div class="sec-note">内置穿搭视频脚本模版；给脚本填「计划发布日期」后会出现在日历与发布排期里。</div>'
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
  function openCtypeModal(c){
    var isEdit=!!c, o=c||{id:'',name:'',desc:''};
    openModal('<h3>'+(isEdit?'✎ 编辑类型':'➕ 添加文案类型')+'</h3>'
      +'<div class="form-row"><label>类型名称</label><input class="input" id="ct-name" value="'+esc(o.name)+'" placeholder="种草测评"></div>'
      +'<div class="form-row"><label>说明（可选）</label><textarea class="textarea" id="ct-desc" placeholder="这个类型怎么写…">'+esc(o.desc)+'</textarea></div>'
      +'<div class="modal-actions"><button class="btn ghost" data-act="close-modal">取消</button><button class="btn" data-act="ctype-save" data-id="'+o.id+'">保存</button></div>');
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
      +'<div class="form-row"><b style="font-family:ZCOOL KuaiLe">导出备份</b><div class="r-note">下载一个 JSON 文件，安全保存在电脑里。</div>'
      +'<button class="btn" data-act="backup-export" style="margin-top:8px">⬇️ 导出 JSON</button></div>'
      +'<div class="form-row" style="margin-top:14px"><b style="font-family:ZCOOL KuaiLe">导入恢复</b><div class="r-note">选择之前导出的 JSON，会覆盖当前数据（请先导出再导入）。</div>'
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
      case 'prod-edit': var pe=store.xhsProducts.find(function(x){return x.id===id;}); if(pe) openProdModal(pe); break;
      case 'prod-del': if(confirm('删除该产品？')){ store.xhsProducts=store.xhsProducts.filter(function(x){return x.id!==id;}); save(); renderXhsProducts(); toast('已删除'); } break;
      case 'prod-new': openProdModal(null); break;
      case 'prod-save':
        var pn=$('#p-name').value.trim(); if(!pn){toast('名称不能为空');return;}
        if(id){ var pu=store.xhsProducts.find(function(x){return x.id===id;}); if(pu){pu.name=pn;pu.cat=$('#p-cat').value.trim();pu.note=$('#p-note').value.trim();} }
        else { store.xhsProducts.push({id:uid(), name:pn, cat:$('#p-cat').value.trim(), note:$('#p-note').value.trim(), shot:false}); }
        save(); closeModal(); renderXhsProducts(); toast('已保存 🍬'); break;

      case 'ctype-edit': var ce=store.xhsCopyTypes.find(function(x){return x.id===id;}); if(ce) openCtypeModal(ce); break;
      case 'ctype-del': if(confirm('删除该文案类型？')){ store.xhsCopyTypes=store.xhsCopyTypes.filter(function(x){return x.id!==id;}); save(); renderXhsTypes(); toast('已删除'); } break;
      case 'ctype-new': openCtypeModal(null); break;
      case 'ctype-save':
        var cn=$('#ct-name').value.trim(); if(!cn){toast('名称不能为空');return;}
        if(id){ var cu=store.xhsCopyTypes.find(function(x){return x.id===id;}); if(cu){cu.name=cn;cu.desc=$('#ct-desc').value.trim();} }
        else { store.xhsCopyTypes.push({id:uid(), name:cn, desc:$('#ct-desc').value.trim()}); }
        save(); closeModal(); renderXhsTypes(); toast('已保存 🍬'); break;

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

/* 公众号AI写作工作台 — app.js (v1)
 * 数据全部存 localStorage；AI 接口 OpenAI 兼容，未填密钥时自动降级为 DEMO 模式。
 * 工作流：知识库 → 提取爆款因子 → 选题 → 写稿 → 配图 → 复盘 → 每日节奏
 */
'use strict';

/* ---------------- 工具 ---------------- */
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const todayStr = () => new Date().toISOString().slice(0,10);
const fmtDate = d => (d||'').slice(0,10);
const esc = s => (s||'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const DB = {
  get(k, def){ try{ const v = localStorage.getItem('gzh_'+k); return v?JSON.parse(v):def; }catch(e){ return def; } },
  set(k, v){ localStorage.setItem('gzh_'+k, JSON.stringify(v)); }
};

/* ---------------- 状态 ---------------- */
const settings = Object.assign({
  apiBase:'https://api.openai.com/v1',
  apiKey:'',
  model:'gpt-4o-mini',
  imgApiBase:'https://api.openai.com/v1',
  imgApiKey:'',
  imgModel:'gpt-image-1',
  dailyTime:'20:30'
}, DB.get('settings', {}));

function saveSettings(){ DB.set('settings', settings); refreshAiStatus(); }

function isLive(){ return !!settings.apiKey.trim(); }
function isImgLive(){ return !!settings.imgApiKey.trim(); }

function refreshAiStatus(){
  const el = $('#aiStatus');
  if(isLive()){ el.textContent='AI 已接入'; el.className='ai-status live'; }
  else { el.textContent='DEMO 模式'; el.className='ai-status demo'; }
}

/* ---------------- AI 客户端 ---------------- */
async function aiChat(system, user, temp=0.7){
  if(!isLive()){
    return demoChat(system, user);
  }
  const body = { model: settings.model, temperature: temp,
    messages:[{role:'system',content:system},{role:'user',content:user}] };
  try{
    const r = await fetch(settings.apiBase.replace(/\/$/,'')+'/chat/completions', {
      method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer '+settings.apiKey },
      body: JSON.stringify(body)
    });
    if(!r.ok) throw new Error('HTTP '+r.status);
    const j = await r.json();
    return (j.choices&&j.choices[0]&&j.choices[0].message.content) || '';
  }catch(e){
    toast('接口调用失败，已回退 DEMO：'+e.message);
    return demoChat(system, user);
  }
}

/* DEMO：用真实知识库/因子编造结构化内容，让流程可跑通 */
function demoChat(system, user){
  const kb = DB.get('kb', []);
  const factors = DB.get('factors', []);
  const low = system.includes('因子');
  if(system.includes('提取爆款因子') || system.includes('extract factors')){
    return JSON.stringify(defaultFactors(kb), null, 2);
  }
  if(system.includes('选题') || system.includes('topic')){
    return JSON.stringify(genTopicsDemo(user, kb, factors), null, 2);
  }
  if(system.includes('初稿') || system.includes('draft')){
    return genDraftDemo(user, kb, factors);
  }
  if(system.includes('复盘') || system.includes('review')){
    return reviewDemo(kb, factors);
  }
  return '（DEMO）已收到你的指令：'+user.slice(0,40)+' …… 接入 API 后将生成真实内容。';
}

function defaultFactors(kb){
  const hits = kb.filter(a=>a.isHit);
  const base = [
    {name:'第一人称真实经历', type:'叙事', weight:9, desc:'用"我"的具体故事开场，比观点更有代入感', examples:['学AI一个月，我的公众号开始赚钱了']},
    {name:'反差钩子', type:'标题', weight:8, desc:'预期 vs 现实的反差，制造好奇', examples:['不是大钱，但够了']},
    {name:'具体数字/时间', type:'标题', weight:8, desc:'带时间跨度与量化结果，增强可信', examples:['一个月','8:30','几分钟']},
    {name:'痛点共鸣', type:'结构', weight:7, desc:'先写读者也有的困境，再给解法', examples:['最难的不是写，是坐下来写']},
    {name:'短句断行', type:'排版', weight:6, desc:'每段≤3行，手机阅读友好', examples:[]},
    {name:'行动召唤', type:'结尾', weight:7, desc:'结尾给一个可立刻照做的动作', examples:['有人帮你跨过这一步，就不一样了']}
  ];
  return base.map(f=>({...f, id:uid(), source:'ai', createdAt:todayStr()}));
}

function genTopicsDemo(direction, kb, factors){
  const titles = kb.slice(0,6).map(a=>a.title);
  const fpool = factors.length?factors:[{name:'第一人称真实经历'},{name:'反差钩子'},{name:'具体数字'}];
  const dir = (direction||'我的成长故事').trim();
  const mk = (i,hook,angle,why)=>({
    id:uid(), direction:dir, title:hook, hook, angle,
    rationale:why, status:'候选', factorIds:[], createdAt:todayStr()
  });
  return [
    mk(0, `「${dir}」这件事，我劝你别等「准备好了」再开始`,
       '用你自己的起步犹豫做反差开场，再给三个最小行动',
       '命中因子：'+fpool[0].name+' / '+fpool[1].name+'，结合知识库「'+(titles[0]||'过往文章')+'」的素材'),
    mk(1, `一个人写公众号一年没起色，一个月靠 AI 翻盘：差别在哪`,
       '对比"断更期"与"AI 辅助期"的每天流程，落到可复制的清单',
       '命中因子：'+fpool[1].name+' / 具体数字，引用知识库 '+titles.length+' 篇素材'),
    mk(2, `8:30 的电脑、写作业的娃、和一篇发出去的文章`,
       '把"每天坐下来写"的仪式感写成画面，给读者一个同款节奏',
       '命中因子：'+fpool[2].name+' / 痛点共鸣，呼应知识库「'+(titles[1]||'日常记录')+'」')
  ];
}

function genDraftDemo(topic, kb, factors){
  const fnames = factors.map(f=>f.name).join('、') || '第一人称真实经历、反差钩子';
  const src = kb.slice(0,3).map(a=>'· '+a.title).join('\n') || '· （暂无知识库素材，先写你的真实经历）';
  return `标题：${topic.title}

（开场·真实经历）
我得先说一个事实：一个月前，我对这件事的理解还停留在很浅的地方。后来发生的变化，不是因为我突然变厉害了，而是因为有人/有系统，帮我跨过了"每天坐下来"这一步。

（反差钩子）
不是大钱。但够了。够让我知道，这件事能走下去。

（痛点共鸣）
我断断续续也做了一年。之前最大的问题不是不想做，是没人出题、没人看稿、没人问你今天发不发。写着写着，就断了。

（主体·结合知识库素材）
这次我的素材来自：
${src}

我让系统帮我把写过的东西全部过一遍，提取出能复用的因子：${fnames}。再让它在低表现的内容里找短板，扬长避短。

（行动召唤）
如果你也卡在"坐下来"这一步——今晚${settings.dailyTime}，打开电脑，先写三行。剩下的，交给流程。

（注：这是 DEMO 草稿，接入 API 后会基于你的知识库与因子生成真实内容，请在右侧编辑区改成你的语气。）`;
}

function reviewDemo(kb, factors){
  const hits = kb.filter(a=>a.isHit);
  const lows = kb.filter(a=>!a.isHit);
  const avgHit = hits.length? Math.round(hits.reduce((s,a)=>s+(+a.reads||0),0)/hits.length):0;
  const avgLow = lows.length? Math.round(lows.reduce((s,a)=>s+(+a.reads||0),0)/lows.length):0;
  return `【复盘摘要】
· 爆款 ${hits.length} 篇，平均阅读 ${avgHit}；低阅读 ${lows.length} 篇，平均阅读 ${avgLow}。
· 爆款共性：多带"第一人称真实经历 + 反差钩子 + 具体数字"，标题短、开头直给。
· 低阅读共性：偏观点堆砌、开头铺垫长、缺少可立刻照做的动作。
· 扬长避短建议：下一篇沿用爆款因子组合，把"痛点→解法→行动"三段式写成固定骨架；低表现题材改为穿插在爆款文末，不单独成篇。`;
}

/* 配图：真实接口或本地占位 */
function placeholderImg(prompt){
  let h=0; for(const c of prompt) h=(h*31+c.charCodeAt(0))%360;
  const c1=`hsl(${h},70%,62%)`, c2=`hsl(${(h+40)%360},65%,52%)`;
  const svg=`<svg xmlns='http://www.w3.org/2000/svg' width='320' height='200'>
   <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
   <stop offset='0' stop-color='${c1}'/><stop offset='1' stop-color='${c2}'/></linearGradient></defs>
   <rect width='320' height='200' fill='url(#g)'/>
   <text x='160' y='105' fill='white' font-size='15' font-family='sans-serif' text-anchor='middle'>${esc(prompt).slice(0,22)}</text></svg>`;
  return 'data:image/svg+xml;utf8,'+encodeURIComponent(svg);
}
async function genImage(prompt){
  if(!isImgLive()){ return placeholderImg(prompt); }
  try{
    const r = await fetch(settings.imgApiBase.replace(/\/$/,'')+'/images/generations', {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+settings.imgApiKey},
      body: JSON.stringify({ model:settings.imgModel, prompt, n:1, size:'1024x640' })
    });
    if(!r.ok) throw new Error('HTTP '+r.status);
    const j = await r.json();
    const d = j.data&&j.data[0];
    return d&&(d.url||('data:image/'+ (d.b64_json?'png;base64,':'') + (d.b64_json||''))) || placeholderImg(prompt);
  }catch(e){ toast('配图接口失败，使用占位图'); return placeholderImg(prompt); }
}

/* ---------------- Toast ---------------- */
let toastTimer;
function toast(msg){
  let t=$('#toast'); if(!t){ t=document.createElement('div'); t.id='toast'; t.className='toast'; document.body.appendChild(t); }
  t.textContent=msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove('show'),2600);
}

/* ---------------- 路由 ---------------- */
const routes = {
  dashboard:renderDashboard, knowledge:renderKnowledge, factors:renderFactors,
  topics:renderTopics, draft:renderDraft, images:renderImages,
  review:renderReview, rhythm:renderRhythm, settings:renderSettings
};
const titles = {dashboard:'仪表盘',knowledge:'知识库',factors:'爆款因子库',topics:'选题',
  draft:'写稿',images:'配图',review:'复盘',rhythm:'每日节奏',settings:'设置'};

function navigate(route){
  if(!routes[route]) route='dashboard';
  $$('.nav-item[data-route]').forEach(b=>b.classList.toggle('active', b.dataset.route===route));
  $('#pageTitle').textContent = titles[route];
  routes[route]();
  $('#sidebar').classList.remove('open');
  location.hash = route;
}

/* ---------------- 仪表盘 ---------------- */
function renderDashboard(){
  const kb=DB.get('kb',[]), factors=DB.get('factors',[]), topics=DB.get('topics',[]);
  const rhythm=DB.get('rhythm',{}); const streak=calcStreak(rhythm);
  const published = topics.filter(t=>t.status==='已发布').length;
  const totalReads = kb.reduce((s,a)=>s+(+a.reads||0),0);
  const done = !!rhythm[todayStr()];
  $('#content').innerHTML = `
  <div class="hero">
    <h2>最难的一步不是写，是每天坐下来写。</h2>
    <p>这个工作台把你的流程固化下来：知识库喂养 → 提取爆款因子 → AI 出题 → AI 出初稿 → AI 配图 → 每晚${settings.dailyTime}节奏打卡。今天，你坐下来了吗？</p>
    <div class="row" style="margin-top:14px">
      <button class="btn" onclick="navigate('rhythm')">${done?'✓ 今日已打卡':'今晚'+settings.dailyTime+'，去打卡'}</button>
      <button class="btn ghost" onclick="navigate('topics')">开始今晚的选题</button>
    </div>
  </div>
  <div class="grid grid-4">
    <div class="stat"><div class="num">${streak}</div><div class="lbl">连续写作天数 🔥</div></div>
    <div class="stat"><div class="num">${kb.length}</div><div class="lbl">知识库文章</div></div>
    <div class="stat"><div class="num">${factors.length}</div><div class="lbl">爆款因子（你的 Skill）</div></div>
    <div class="stat"><div class="num">${totalReads}</div><div class="lbl">累计阅读量</div></div>
  </div>
  <hr class="sep"/>
  <div class="grid grid-2">
    <div class="card">
      <div class="section-title">📍 今晚流程</div>
      <div class="row" style="margin:10px 0"><span class="pill">1 出题</span>→<span class="pill">2 初稿</span>→<span class="pill">3 配图</span>→<span class="pill green">4 发布</span></div>
      <p class="muted">选题 ${topics.filter(t=>t.status==='候选').length} 个待处理 · 已发布 ${published} 篇。点上方按钮或从左侧进入对应模块。</p>
    </div>
    <div class="card">
      <div class="section-title">⚡ 快速动作</div>
      <div class="row" style="margin-top:8px">
        <button class="btn sm" onclick="quickExtract()">从爆款提取因子</button>
        <button class="btn sm soft" onclick="navigate('knowledge')">喂一篇新文章</button>
        <button class="btn sm ghost" onclick="navigate('review')">看复盘</button>
      </div>
      <p class="muted" style="margin-top:10px">未接入 API 时所有生成均为 DEMO 示例，接入后自动变为真实内容。</p>
    </div>
  </div>`;
}

function calcStreak(rhythm){
  let s=0; const d=new Date();
  // 今天若未打卡，从昨天算起
  if(!rhythm[todayStr()]) d.setDate(d.getDate()-1);
  for(;;){
    const k=d.toISOString().slice(0,10);
    if(rhythm[k]){ s++; d.setDate(d.getDate()-1); } else break;
  }
  return s;
}

async function quickExtract(){
  const kb=DB.get('kb',[]); const hits=kb.filter(a=>a.isHit);
  if(!hits.length){ toast('请先在知识库标记至少 1 篇爆款'); return; }
  const sys='你是公众号爆款分析师，请基于用户提供的爆款文章，提取可复用的爆款因子，输出 JSON 数组，每项含 name/type/weight(1-10)/desc/examples。';
  const usr='爆款文章标题：\n'+hits.map(a=>'· '+a.title+'（阅读 '+a.reads+'）').join('\n');
  toast('正在提取因子…');
  const res = await aiChat(sys, usr, 0.5);
  let arr=[];
  try{ arr = JSON.parse(res.replace(/```json|```/g,'').trim()); }catch(e){ arr=defaultFactors(kb); }
  if(!Array.isArray(arr)) arr=defaultFactors(kb);
  arr = arr.map(f=>({id:uid(), name:f.name, type:f.type||'通用', weight:f.weight||5, desc:f.desc||'', examples:f.examples||[], source:'ai', createdAt:todayStr()}));
  const factors=DB.get('factors',[]).concat(arr); DB.set('factors',factors);
  toast('已提取 '+arr.length+' 个因子，存入爆款因子库（你的 Skill）');
  renderDashboard();
}

/* ---------------- 知识库 ---------------- */
function renderKnowledge(){
  const kb=DB.get('kb',[]);
  $('#content').innerHTML = `
  <div class="card" style="margin-bottom:18px">
    <div class="section-title">📚 知识库（把你写过的文章喂进来）</div>
    <p class="muted">AI 会在这里找素材、提取爆款因子、分析低阅读。建议标注每篇的阅读量，并勾选是否爆款。</p>
    <label class="field">标题</label><input id="kbTitle" placeholder="例如：学AI一个月，我的公众号开始赚钱了"/>
    <label class="field">正文</label><textarea id="kbContent" placeholder="粘贴文章全文或核心段落…"></textarea>
    <div class="grid grid-3">
      <div><label class="field">阅读量</label><input id="kbReads" type="number" placeholder="0"/></div>
      <div><label class="field">发布日期</label><input id="kbDate" type="date"/></div>
      <div><label class="field">标签（逗号分隔）</label><input id="kbTags" placeholder="AI,成长,副业"/></div>
    </div>
    <div class="row" style="margin-top:12px">
      <label class="row" style="gap:6px"><input type="checkbox" id="kbHit" style="width:auto"/> 标记为爆款</label>
      <div class="spacer"></div>
      <button class="btn" onclick="addArticle()">+ 存入知识库</button>
    </div>
  </div>
  <div class="row" style="margin-bottom:12px">
    <div class="section-title" style="margin:0">已收录 ${kb.length} 篇</div>
    <div class="spacer"></div>
    <button class="btn sm ghost" onclick="exportKB()">导出 JSON</button>
    <button class="btn sm ghost" onclick="importKB()">导入 JSON</button>
  </div>
  <div class="grid grid-2" id="kbList"></div>`;
  renderKBList();
}

function addArticle(){
  const title=$('#kbTitle').value.trim();
  const content=$('#kbContent').value.trim();
  if(!title||!content){ toast('标题和正文都要填'); return; }
  const kb=DB.get('kb',[]);
  kb.unshift({ id:uid(), title, content, reads:+$('#kbReads').value||0,
    date:$('#kbDate').value||todayStr(), tags:($('#kbTags').value||'').split(',').map(s=>s.trim()).filter(Boolean),
    isHit:$('#kbHit').checked, createdAt:todayStr() });
  DB.set('kb',kb);
  $('#kbTitle').value='';$('#kbContent').value='';$('#kbReads').value='';$('#kbTags').value='';$('#kbHit').checked=false;
  toast('已存入知识库'); renderKBList(); renderDashboard();
}
function renderKBList(){
  const kb=DB.get('kb',[]); const box=$('#kbList'); if(!box) return;
  if(!kb.length){ box.innerHTML='<div class="empty">还没有文章，先喂一篇吧。</div>'; return; }
  box.innerHTML = kb.map(a=>`
    <div class="item">
      <div class="top">
        <span class="title">${esc(a.title)}</span>
        ${a.isHit?'<span class="pill hit">爆款</span>':'<span class="pill low">常规</span>'}
        <div class="spacer"></div>
        <button class="btn sm ghost" onclick="delArticle('${a.id}')">删</button>
      </div>
      <div class="meta">阅读 ${a.reads||0} · ${fmtDate(a.date)} · ${(a.tags||[]).map(t=>'<span class="tag">'+esc(t)+'</span>').join(' ')}</div>
      <div class="meta">${esc(a.content.slice(0,60))}…</div>
    </div>`).join('');
}
function delArticle(id){ const kb=DB.get('kb',[]).filter(a=>a.id!==id); DB.set('kb',kb); renderKBList(); renderDashboard(); }
function exportKB(){
  const data=JSON.stringify({kb:DB.get('kb',[]),factors:DB.get('factors',[])},null,2);
  const b=new Blob([data],{type:'application/json'}); const u=URL.createObjectURL(b);
  const a=document.createElement('a'); a.href=u; a.download='gzh-backup.json'; a.click(); URL.revokeObjectURL(u);
}
function importKB(){
  const inp=document.createElement('input'); inp.type='file'; inp.accept='.json';
  inp.onchange=()=>{ const f=inp.files[0]; if(!f) return; const r=new FileReader();
    r.onload=()=>{ try{ const j=JSON.parse(r.result); if(j.kb)DB.set('kb',j.kb); if(j.factors)DB.set('factors',j.factors);
      toast('导入成功'); renderKBList(); renderDashboard(); }catch(e){ toast('解析失败'); } }; r.readAsText(f); };
  inp.click();
}

/* ---------------- 爆款因子库 ---------------- */
function renderFactors(){
  const factors=DB.get('factors',[]);
  $('#content').innerHTML = `
  <div class="card" style="margin-bottom:18px">
    <div class="section-title">🔥 爆款因子库 = 你的写作 Skill</div>
    <p class="muted">这里存放从爆款里提取、可反复调用的"配方"。写稿和选题会自动参考它们。权重越高，越优先使用。</p>
    <div class="row">
      <button class="btn" onclick="quickExtract()">⚡ 从爆款一键提取</button>
      <button class="btn soft" onclick="showFactorForm()">+ 手动添加因子</button>
    </div>
    <div id="factorForm" style="display:none;margin-top:14px">
      <div class="grid grid-2">
        <div><label class="field">因子名</label><input id="fName" placeholder="例：第一人称真实经历"/></div>
        <div><label class="field">类型</label>
          <select id="fType"><option>叙事</option><option>标题</option><option>结构</option><option>排版</option><option>结尾</option><option>通用</option></select></div>
      </div>
      <label class="field">说明</label><textarea id="fDesc" placeholder="这个因子为什么有效、怎么用"></textarea>
      <label class="field">权重 1-10</label><input id="fWeight" type="number" min="1" max="10" value="7" style="max-width:120px"/>
      <div class="row" style="margin-top:10px"><button class="btn sm" onclick="addFactor()">保存因子</button></div>
    </div>
  </div>
  <div class="grid grid-3" id="factorList"></div>`;
  renderFactorList();
}
function showFactorForm(){ const f=$('#factorForm'); f.style.display = f.style.display==='none'?'block':'none'; }
function addFactor(){
  const name=$('#fName').value.trim(); if(!name){ toast('填因子名'); return; }
  const factors=DB.get('factors',[]);
  factors.unshift({id:uid(), name, type:$('#fType').value, weight:+$('#fWeight').value||5,
    desc:$('#fDesc').value.trim(), examples:[], source:'manual', createdAt:todayStr()});
  DB.set('factors',factors); toast('因子已保存'); renderFactorList(); renderDashboard();
}
function renderFactorList(){
  const factors=DB.get('factors',[]).sort((a,b)=>b.weight-a.weight); const box=$('#factorList'); if(!box) return;
  if(!factors.length){ box.innerHTML='<div class="empty">还没有因子。点"从爆款一键提取"或手动添加。</div>'; return; }
  box.innerHTML=factors.map(f=>`
    <div class="factor">
      <div class="ftype">${esc(f.type)} · ${f.source==='ai'?'AI提取':'手动'}</div>
      <div class="title" style="font-weight:700;margin:2px 0">${esc(f.name)}</div>
      <div class="meta" style="font-size:12.5px;color:var(--muted)">${esc(f.desc||'')}</div>
      <div class="weight-bar"><i style="width:${f.weight*10}%"></i></div>
      <div class="row" style="margin-top:8px"><span class="muted" style="font-size:12px">权重 ${f.weight}</span>
        <div class="spacer"></div><button class="btn sm ghost" onclick="delFactor('${f.id}')">删</button></div>
    </div>`).join('');
}
function delFactor(id){ DB.set('factors',DB.get('factors',[]).filter(f=>f.id!==id)); renderFactorList(); renderDashboard(); }

/* ---------------- 选题 ---------------- */
function renderTopics(){
  const factors=DB.get('factors',[]);
  $('#content').innerHTML = `
  <div class="card" style="margin-bottom:18px">
    <div class="section-title">💡 出题：你给方向，AI 去知识库找素材</div>
    <p class="muted">输入一个方向/关键词，AI 会结合你的知识库与爆款因子，产出 3 个带钩子和角度的选题。</p>
    <label class="field">今晚的方向</label>
    <textarea id="topicDir" placeholder="例如：我想写"普通人怎么用 AI 开始副业"，语气要真实、不鸡汤"></textarea>
    <div class="row" style="margin-top:12px">
      <button class="btn" id="genTopicBtn" onclick="genTopics()">⚡ 生成选题</button>
      <span class="muted">已加载 ${factors.length} 个爆款因子作为参考</span>
    </div>
  </div>
  <div id="topicList"></div>`;
  renderTopicList();
}
async function genTopics(){
  const dir=$('#topicDir').value.trim(); if(!dir){ toast('先写方向'); return; }
  const btn=$('#genTopicBtn'); btn.disabled=true; btn.innerHTML='<span class="spin"></span>生成中…';
  const kb=DB.get('kb',[]), factors=DB.get('factors',[]);
  const sys='你是公众号选题助手。用户给方向，你结合其知识库素材与爆款因子，产出3个选题。输出 JSON 数组，每项含 title/hook/angle/rationale。';
  const usr=`方向：${dir}\n知识库标题：${kb.map(a=>a.title).join('、')||'（空）'}\n爆款因子：${factors.map(f=>f.name).join('、')||'（空）'}`;
  const res=await aiChat(sys,usr,0.8);
  let arr=[]; try{ arr=JSON.parse(res.replace(/```json|```/g,'').trim()); }catch(e){ arr=genTopicsDemo(dir,kb,factors); }
  if(!Array.isArray(arr)) arr=genTopicsDemo(dir,kb,factors);
  arr=arr.map(t=>({id:uid(), direction:dir, title:t.title||t.hook, hook:t.hook||t.title, angle:t.angle||'',
    rationale:t.rationale||'', status:'候选', factorIds:[], createdAt:todayStr()}));
  const topics=DB.get('topics',[]).concat(arr); DB.set('topics',topics);
  btn.disabled=false; btn.textContent='⚡ 重新生成';
  toast('生成 '+arr.length+' 个选题'); renderTopicList();
}
function renderTopicList(){
  const topics=DB.get('topics',[]); const box=$('#topicList'); if(!box) return;
  if(!topics.length){ box.innerHTML='<div class="empty">还没有选题，上面生成一个吧。</div>'; return; }
  box.innerHTML=topics.slice().reverse().map(t=>`
    <div class="item" style="margin-bottom:12px">
      <div class="top"><span class="title">${esc(t.title)}</span>
        <span class="pill">${esc(t.status)}</span>
        <div class="spacer"></div>
        <button class="btn sm" onclick="toDraft('${t.id}')">去写稿</button>
        <button class="btn sm ghost" onclick="delTopic('${t.id}')">删</button></div>
      <div class="meta"><b>钩子：</b>${esc(t.hook||'')}</div>
      <div class="meta"><b>角度：</b>${esc(t.angle||'')}</div>
      <div class="meta"><b>为什么：</b>${esc(t.rationale||'')}</div>
    </div>`).join('');
}
function toDraft(id){ const t=DB.get('topics',[]).find(x=>x.id===id); if(t) DB.set('_curTopic',id); navigate('draft'); }
function delTopic(id){ DB.set('topics',DB.get('topics',[]).filter(t=>t.id!==id)); renderTopicList(); }

/* ---------------- 写稿 ---------------- */
function renderDraft(){
  const topics=DB.get('topics',[]);
  const curId=DB.get('_curTopic',''); const cur=topics.find(t=>t.id===curId)||topics[0];
  const drafts=DB.get('drafts',[]); const d=drafts.find(x=>x.topicId===(cur&&cur.id))||{};
  $('#content').innerHTML=`
  <div class="card" style="margin-bottom:18px">
    <div class="section-title">📝 写稿：AI 出初稿，你改</div>
    <label class="field">选择选题</label>
    <select id="draftTopic">${topics.length?topics.map(t=>`<option value="${t.id}" ${cur&&t.id===cur.id?'selected':''}>${esc(t.title)}</option>`).join(''):'<option>先去选题</option>'}</select>
    <div class="row" style="margin-top:12px">
      <button class="btn" id="genDraftBtn" onclick="genDraft()">⚡ 生成初稿（基于知识库+因子）</button>
      <button class="btn soft" onclick="saveDraft()">保存我的修改</button>
      <button class="btn ghost" onclick="publishDraft()">标记为已发布</button>
    </div>
  </div>
  <div class="editor-wrap">
    <div class="pane"><h4>AI 初稿（只读参考）</h4><div id="aiPane" style="white-space:pre-wrap;font-size:13.5px;color:#5b534a;max-height:520px;overflow:auto">${esc(d.aiText||'（点上方"生成初稿"）')}</div></div>
    <div class="pane"><h4>我的定稿（可编辑）</h4><textarea id="userText" style="min-height:480px">${esc(d.userText||d.aiText||'')}</textarea></div>
  </div>`;
  $('#draftTopic').onchange=e=>{ DB.set('_curTopic',e.target.value); renderDraft(); };
}
async function genDraft(){
  const tid=$('#draftTopic').value; const t=DB.get('topics',[]).find(x=>x.id===tid); if(!t){ toast('先选选题'); return; }
  const btn=$('#genDraftBtn'); btn.disabled=true; btn.innerHTML='<span class="spin"></span>生成中…';
  const kb=DB.get('kb',[]), factors=DB.get('factors',[]);
  const sys='你是公众号写手。基于用户选题、知识库素材与爆款因子，写一篇口语化、第一人称、手机友好的初稿（含标题、开场、主体、行动召唤）。';
  const usr=`选题：${t.title}\n钩子：${t.hook||''}\n角度：${t.angle||''}\n知识库素材标题：${kb.map(a=>a.title).join('、')||'（空）'}\n爆款因子：${factors.map(f=>f.name).join('、')||'（空）'}`;
  const txt=await aiChat(sys,usr,0.8);
  const drafts=DB.get('drafts',[]); let d=drafts.find(x=>x.topicId===tid);
  if(!d){ d={id:uid(),topicId:tid,aiText:'',userText:'',createdAt:todayStr()}; drafts.push(d); }
  d.aiText=txt; d.userText=txt; d.updatedAt=todayStr(); DB.set('drafts',drafts);
  btn.disabled=false; btn.textContent='⚡ 重新生成';
  $('#aiPane').textContent=txt; $('#userText').value=txt;
  toast('初稿已生成，去右侧改成你的语气');
}
function saveDraft(){
  const tid=$('#draftTopic').value; const txt=$('#userText').value;
  const drafts=DB.get('drafts',[]); let d=drafts.find(x=>x.topicId===tid);
  if(!d){ d={id:uid(),topicId:tid,aiText:txt,userText:txt,createdAt:todayStr()}; drafts.push(d); }
  else { d.userText=txt; d.updatedAt=todayStr(); }
  DB.set('drafts',drafts); toast('已保存你的定稿');
}
function publishDraft(){
  const tid=$('#draftTopic').value; const topics=DB.get('topics',[]);
  const t=topics.find(x=>x.id===tid); if(t){ t.status='已发布'; DB.set('topics',topics);
    const today=todayStr(); const rhythm=DB.get('rhythm',{}); rhythm[today]={done:true,note:'发布：'+(t.title||''),minutes:0}; DB.set('rhythm',rhythm);
    toast('已标记发布，并打卡今日节奏'); renderDashboard(); }
}

/* ---------------- 配图 ---------------- */
function renderImages(){
  const imgs=DB.get('images',[]);
  $('#content').innerHTML=`
  <div class="card" style="margin-bottom:18px">
    <div class="section-title">🎨 配图：一句话生成封面/插图</div>
    <label class="field">画面描述（中文即可）</label>
    <textarea id="imgPrompt" placeholder="例如：温暖的书桌灯光下，一台笔记本和一个写作业的小孩，扁平插画风，橙色调"></textarea>
    <div class="row" style="margin-top:12px"><button class="btn" id="genImgBtn" onclick="genImg()">⚡ 生成配图</button>
      <span class="muted">未接入图像 API 时生成渐变占位图，接入后变为真实图片</span></div>
  </div>
  <div class="img-grid" id="imgGrid"></div>`;
  renderImgGrid();
}
async function genImg(){
  const p=$('#imgPrompt').value.trim(); if(!p){ toast('描述一下画面'); return; }
  const btn=$('#genImgBtn'); btn.disabled=true; btn.innerHTML='<span class="spin"></span>生成中…';
  const url=await genImage(p);
  const imgs=DB.get('images',[]); imgs.unshift({id:uid(),prompt:p,url,createdAt:todayStr()}); DB.set('images',imgs);
  btn.disabled=false; btn.textContent='⚡ 生成配图'; renderImgGrid();
}
function renderImgGrid(){
  const imgs=DB.get('images',[]); const box=$('#imgGrid'); if(!box) return;
  if(!imgs.length){ box.innerHTML='<div class="empty">还没有配图。</div>'; return; }
  box.innerHTML=imgs.map(i=>`
    <div class="img-card"><img src="${i.url}" style="width:100%;display:block" alt=""/>
      <div class="cap">${esc(i.prompt.slice(0,30))}</div></div>`).join('');
}

/* ---------------- 复盘 ---------------- */
function renderReview(){
  const kb=DB.get('kb',[]); const hits=kb.filter(a=>a.isHit); const lows=kb.filter(a=>!a.isHit);
  const factors=DB.get('factors',[]);
  $('#content').innerHTML=`
  <div class="card" style="margin-bottom:18px">
    <div class="section-title">📈 复盘：扬长避短</div>
    <p class="muted">对比爆款与低阅读，找出可复用的与共性的短板。点下面的按钮让 AI 给一份复盘建议（基于你的真实数据）。</p>
    <div class="row"><button class="btn" id="revBtn" onclick="runReview()">⚡ AI 复盘建议</button></div>
    <div id="revOut" style="margin-top:14px;white-space:pre-wrap;font-size:14px;line-height:1.8"></div>
  </div>
  <div class="grid grid-2">
    <div class="card"><div class="section-title">爆款 vs 低阅读（阅读量）</div>
      <div class="chart" id="revChart"></div>
    </div>
    <div class="card"><div class="section-title">因子权重 Top</div>
      <div id="facChart"></div>
    </div>
  </div>`;
  // 图表
  const max=Math.max(1,...kb.map(a=>+a.reads||0));
  $('#revChart').innerHTML = kb.slice(0,8).map(a=>{
    const h=Math.round(((+a.reads||0)/max)*140); const hot=a.isHit;
    return `<div class="bar"><div class="b" style="height:${h}px;background:${hot?'var(--hit)':'var(--low)'}"></div><div class="bl">${esc(a.title.slice(0,6))}</div></div>`;
  }).join('') || '<div class="muted">先去知识库加几篇文章</div>';
  const top=factors.slice().sort((a,b)=>b.weight-a.weight).slice(0,6);
  $('#facChart').innerHTML = top.length? top.map(f=>`
    <div style="margin:8px 0"><div class="row" style="justify-content:space-between"><span>${esc(f.name)}</span><span class="muted">${f.weight}</span></div>
    <div class="weight-bar"><i style="width:${f.weight*10}%"></i></div></div>`).join('') : '<div class="muted">因子库为空</div>';
}
async function runReview(){
  const kb=DB.get('kb',[]), factors=DB.get('factors',[]);
  if(!kb.length){ toast('知识库为空，先加文章'); return; }
  const btn=$('#revBtn'); btn.disabled=true; btn.innerHTML='<span class="spin"></span>分析中…';
  const sys='你是公众号数据复盘师。对比用户的爆款与低阅读文章，给出扬长避短的具体建议。';
  const usr=`爆款(${kb.filter(a=>a.isHit).length}篇)：${kb.filter(a=>a.isHit).map(a=>a.title+'('+a.reads+')').join('、')||'无'}\n低阅读(${kb.filter(a=>!a.isHit).length}篇)：${kb.filter(a=>!a.isHit).map(a=>a.title+'('+a.reads+')').join('、')||'无'}\n因子：${factors.map(f=>f.name).join('、')||'无'}`;
  const out=await aiChat(sys,usr,0.4);
  $('#revOut').textContent = out || reviewDemo(kb,factors);
  btn.disabled=false; btn.textContent='⚡ 重新复盘';
}

/* ---------------- 每日节奏 ---------------- */
function renderRhythm(){
  const rhythm=DB.get('rhythm',{});
  // 近 28 天
  const days=[]; const d=new Date();
  for(let i=27;i>=0;i--){ const x=new Date(d); x.setDate(d.getDate()-i); days.push(x.toISOString().slice(0,10)); }
  const cells=days.map(k=>{ const r=rhythm[k]; const dt=new Date(k);
    return `<div class="day ${r&&r.done?'done':''}"><span class="dnum">${dt.getDate()}</span><span class="dtick">${r&&r.done?'✓':''}</span></div>`; }).join('');
  const done=!!rhythm[todayStr()];
  $('#content').innerHTML=`
  <div class="rhythm-today">
    <div><div class="streak-big" id="streakNum">${calcStreak(rhythm)}</div><div class="muted">连续天数</div></div>
    <div class="spacer"></div>
    <div>
      <div style="font-weight:700;margin-bottom:6px">今晚 ${settings.dailyTime} · 你坐下来写了吗？</div>
      <div class="row">
        <button class="btn" onclick="checkIn(true)">✓ 今天写了</button>
        <button class="btn ghost" onclick="checkIn(false)">标记休息</button>
        <input id="rnote" class="field" style="width:220px;margin:0" placeholder="今天写了什么/卡在哪"/>
      </div>
    </div>
  </div>
  <div class="card" style="margin-top:18px">
    <div class="section-title">⏰ 最近 28 天节奏</div>
    <div class="rhythm-grid">${cells}</div>
    <p class="muted" style="margin-top:12px">最难的不是写，是每天坐下来。把这个打卡当成和"孩子写作业"一样的固定仪式。</p>
  </div>`;
}
function checkIn(done){
  const today=todayStr(); const rhythm=DB.get('rhythm',{});
  rhythm[today]={done, note:$('#rnote').value.trim(), minutes: done?30:0};
  DB.set('rhythm',rhythm); toast(done?'已打卡，保持节奏 🔥':'已记录休息日'); renderRhythm(); renderDashboard();
}

/* ---------------- 设置 ---------------- */
function renderSettings(){
  $('#content').innerHTML=`
  <div class="card" style="margin-bottom:18px">
    <div class="section-title">⚙️ AI 接入（OpenAI 兼容）</div>
    <p class="muted">填了密钥即用真实模型；留空则全程 DEMO 示例。兼容 DeepSeek / 通义 / 月之暗面 等（改 Base URL 与模型名即可）。</p>
    <label class="field">对话 API Base URL</label><input id="sApiBase" value="${esc(settings.apiBase)}"/>
    <label class="field">API Key</label><input id="sApiKey" type="password" placeholder="sk-..." value="${esc(settings.apiKey)}"/>
    <label class="field">模型名</label><input id="sModel" value="${esc(settings.model)}"/>
    <hr class="sep"/>
    <label class="field">图像 API Base URL</label><input id="sImgBase" value="${esc(settings.imgApiBase)}"/>
    <label class="field">图像 API Key</label><input id="sImgKey" type="password" placeholder="sk-..." value="${esc(settings.imgApiKey)}"/>
    <label class="field">图像模型</label><input id="sImgModel" value="${esc(settings.imgModel)}"/>
    <hr class="sep"/>
    <label class="field">每日写作时间</label><input id="sDaily" type="time" value="${esc(settings.dailyTime)}" style="max-width:160px"/>
    <div class="row" style="margin-top:14px"><button class="btn" onclick="saveSettingsUI()">保存设置</button>
      <span id="sMsg" class="muted"></span></div>
  </div>
  <div class="card">
    <div class="section-title">🗂 数据</div>
    <div class="row">
      <button class="btn sm ghost" onclick="exportKB()">导出全部备份</button>
      <button class="btn sm ghost" onclick="importKB()">导入备份</button>
      <button class="btn sm ghost" onclick="clearAll()">清空全部数据</button>
    </div>
    <p class="muted" style="margin-top:10px">所有数据仅存于本机浏览器（localStorage），不上传任何服务器。</p>
  </div>`;
}
function saveSettingsUI(){
  settings.apiBase=$('#sApiBase').value.trim();
  settings.apiKey=$('#sApiKey').value.trim();
  settings.model=$('#sModel').value.trim()||'gpt-4o-mini';
  settings.imgApiBase=$('#sImgBase').value.trim();
  settings.imgApiKey=$('#sImgKey').value.trim();
  settings.imgModel=$('#sImgModel').value.trim()||'gpt-image-1';
  settings.dailyTime=$('#sDaily').value||'20:30';
  saveSettings(); $('#sMsg').textContent='已保存 ✓'; toast('设置已保存');
}
function clearAll(){
  if(!confirm('确定清空全部数据？此操作不可恢复。')) return;
  ['kb','factors','topics','drafts','images','rhythm','_curTopic'].forEach(k=>localStorage.removeItem('gzh_'+k));
  toast('已清空'); navigate('dashboard');
}

/* ---------------- 侧边栏折叠 ---------------- */
function initSidebar(){
  const flag = DB.get('flag_sidebar', false);
  if(flag) $('#sidebar').classList.add('collapsed');
  $('#toggleSidebar').onclick=()=>{
    const s=$('#sidebar'); s.classList.toggle('collapsed');
    DB.set('flag_sidebar', s.classList.contains('collapsed'));
    const arr=s.querySelector('.toggle .ni'); if(arr) arr.textContent = s.classList.contains('collapsed')?'»':'«';
  };
  $$('.nav-item[data-route]').forEach(b=> b.onclick=()=>navigate(b.dataset.route));
  $('#mobileMenu').onclick=()=> $('#sidebar').classList.toggle('open');
}

/* ---------------- 启动 ---------------- */
function init(){
  $('#todayStamp').textContent = new Date().toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'short'});
  initSidebar(); refreshAiStatus();
  const r = (location.hash||'#dashboard').replace('#','');
  navigate(r);
}
window.navigate=navigate; window.quickExtract=quickExtract; window.addArticle=addArticle;
window.delArticle=delArticle; window.exportKB=exportKB; window.importKB=importKB;
window.showFactorForm=showFactorForm; window.addFactor=addFactor; window.delFactor=delFactor;
window.genTopics=genTopics; window.toDraft=toDraft; window.delTopic=delTopic;
window.genDraft=genDraft; window.saveDraft=saveDraft; window.publishDraft=publishDraft;
window.genImg=genImg; window.runReview=runReview; window.checkIn=checkIn;
window.saveSettingsUI=saveSettingsUI; window.clearAll=clearAll;
init();

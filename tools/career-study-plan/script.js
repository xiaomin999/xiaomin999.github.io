
// ===== 侧边栏折叠 / 展开 =====
const body = document.body;
const floatToggle = document.getElementById('floatToggle');
const sideCollapse = document.getElementById('sideCollapse');
const backdrop = document.getElementById('backdrop');

function initNav(){
  const w = window.innerWidth;
  if(w < 820){ body.classList.add('collapsed'); } else { body.classList.remove('collapsed'); }
}
initNav();
window.addEventListener('resize', initNav);

// 防止移动端点击穿透：切换侧栏后短暂禁用"新出现的那层"的点击，
// 避免同一次手指点击被派发到遮罩/☰ 又把刚打开的又关闭（即「点不开 / 收缩不回去」）
function lockPulse(el){
  if(!el) return;
  el.style.pointerEvents = 'none';
  clearTimeout(el._pt);
  el._pt = setTimeout(()=>{ el.style.pointerEvents = ''; }, 350);
}
function openNav(e){ if(e) e.stopPropagation(); body.classList.remove('collapsed'); lockPulse(backdrop); }
function closeNav(e){ if(e) e.stopPropagation(); body.classList.add('collapsed'); lockPulse(floatToggle); }

floatToggle.addEventListener('click', openNav);
sideCollapse.addEventListener('click', closeNav);
backdrop.addEventListener('click', closeNav);

// ===== 职业切换 =====
let currentCareer = 'cost';
const tabCost = document.getElementById('tabCost');
const tabHR = document.getElementById('tabHR');
const tabBOM = document.getElementById('tabBOM');
const careerCost = document.getElementById('careerCost');
const careerHR = document.getElementById('careerHR');
const careerBOM = document.getElementById('careerBOM');
const sideTitle = document.getElementById('sideTitle');

function switchCareer(c){
  currentCareer = c;
  // Reset all tabs and bodies — force hide via both class AND inline style (double safety)
  [tabCost, tabHR, tabBOM].forEach(t => t.classList.remove('active'));
  [careerCost, careerHR, careerBOM].forEach(b => { b.classList.remove('active'); b.style.display = 'none'; });
  body.classList.remove('career-hr', 'career-bom');

  if(c === 'cost'){
    tabCost.classList.add('active');
    careerCost.classList.add('active');
    careerCost.style.display = '';
    sideTitle.innerHTML = '成本方向<br>学习执行计划';
  } else if(c === 'hr'){
    tabHR.classList.add('active');
    careerHR.classList.add('active');
    careerHR.style.display = '';
    body.classList.add('career-hr');
    sideTitle.innerHTML = 'HR数据专家<br>学习执行计划';
  } else {
    tabBOM.classList.add('active');
    careerBOM.classList.add('active');
    careerBOM.style.display = '';
    body.classList.add('career-bom');
    sideTitle.innerHTML = '产品数据工程师<br>(BOM)';
  }
  // Reset nav to first section of new career
  showFirstSection(c);
  window.scrollTo({top:0, behavior:'auto'});
  renderAllProgress();
  initRoadmap(c);
  renderCal(c);
}

function showFirstSection(career){
  let secClass = career === 'cost' ? '.sec' : (career === 'hr' ? '.hr-sec' : '.bom-sec');
  let sections = Array.from(document.querySelectorAll(secClass));
  sections.forEach(s => s.hidden = true);
  if(sections.length) sections[0].hidden = false;
  document.querySelectorAll('#sideNav a').forEach(a => a.classList.remove('active'));
  let firstNav = document.querySelector('#sideNav a');
  if(firstNav) firstNav.classList.add('active');
}

tabCost.addEventListener('click', ()=>switchCareer('cost'));
tabHR.addEventListener('click', ()=>switchCareer('hr'));
tabBOM.addEventListener('click', ()=>switchCareer('bom'));

// ===== 点击导航 → 右侧只展示对应板块（按索引匹配，三职业通用）=====
const navAnchors = Array.from(document.querySelectorAll('#sideNav a'));
navAnchors.forEach(a=>{
  a.addEventListener('click', e=>{
    e.preventDefault();
    let idx = navAnchors.indexOf(a);
    let secClass = currentCareer === 'cost' ? '.sec' : (currentCareer === 'hr' ? '.hr-sec' : '.bom-sec');
    let secs = Array.from(document.querySelectorAll(secClass));
    secs.forEach((s,i)=> s.hidden = (i !== idx));
    navAnchors.forEach(n=> n.classList.toggle('active', n === a));
    if(window.innerWidth < 820) closeNav();
  });
});

// 移动端点击导航后自动收起
document.querySelectorAll('#sideNav a').forEach(a=>{
  a.addEventListener('click', ()=>{ if(window.innerWidth < 820) closeNav(); });
});

// ===== 全局进度（checkboxes） =====
const KEY = 'studyPlan_v3';
let state = {};
try{ state = JSON.parse(localStorage.getItem(KEY) || '{}'); }catch(e){ state={}; }

function save(){ try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){} }

function renderAllProgress(){
  ['cost','hr','bom'].forEach(career => {
    const prefix = career === 'cost' ? '' : (career === 'hr' ? 'h' : 'b');
    const checks = Array.from(document.querySelectorAll(`#career${career==='cost'?'Cost':(career==='hr'?'HR':'BOM')} .check[data-key]`));
    let done = checks.filter(cb => cb.classList.contains('done')).length;
    let pct = checks.length ? Math.round(done/checks.length*100) : 0;
    const numEl = document.getElementById('pgNum_'+career);
    const fillEl = document.getElementById('pgFill_'+career);
    if(numEl) numEl.textContent = pct+'%';
    if(fillEl) fillEl.style.width = pct+'%';

    // Sidebar progress (shows current career)
    if(currentCareer === career){
      const sideNum = document.getElementById('pgNumSide');
      const sideFill = document.getElementById('pgFillSide');
      if(sideNum) sideNum.textContent = pct+'%';
      if(sideFill) sideFill.style.width = pct+'%';
    }

    // Resource list progress bars
    const resList = document.getElementById('resList_'+career);
    if(resList){
      const items = resList.querySelectorAll('.res-item');
      items.forEach(item => {
        const cb = item.querySelector('.res-cb');
        const bar = item.querySelector('.rs-bar > i');
        if(cb && bar){
          const key = item.querySelector('.res-name a')?.textContent?.trim() || '';
          const ep = state['ep_'+career+'_'+key] || 0;
          const totalText = item.querySelector('.rs-num')?.textContent || '';
          const m = totalText.match(/(\d+)/);
          const total = m ? parseInt(m[1]) : 1;
          const w = Math.min(100, Math.round(ep/total*100));
          bar.style.width = w+'%';
          cb.classList.toggle('on', ep >= total);
        }
      });
    }
  });
}

document.querySelectorAll('.check').forEach(cb=>{
  const key = cb.dataset.key;
  if(state[key]){ cb.classList.add('done'); }
  cb.addEventListener('click', ()=>{
    cb.classList.toggle('done');
    state[key] = cb.classList.contains('done') ? 1 : 0;
    save(); renderAllProgress();
  });
});

// Reset buttons
['cost','hr','bom'].forEach(career => {
  const btn = document.getElementById('resetBtn_'+career);
  if(btn){
    btn.addEventListener('click', ()=>{
      const prefix = career === 'cost' ? '' : (career === 'hr' ? 'h' : 'b');
      if(confirm('确定清空 '+career.toUpperCase()+' 方向的所有勾选进度吗？')){
        const containerId = career === 'cost' ? 'careerCost' : (career === 'hr' ? 'careerHR' : 'careerBOM');
        document.querySelectorAll('#'+containerId+' .check[data-key]').forEach(cb=>{
          cb.classList.remove('done');
          delete state[cb.dataset.key];
        });
        save(); renderAllProgress();
      }
    });
  }
});

// ===== Roadmap tracking (per-career) =====
const ROAD_KEY_PREFIX = 'road_';

function getRoadKey(career){ return ROAD_KEY_PREFIX + career; }

function loadRoad(career){
  try{ return JSON.parse(localStorage.getItem(getRoadKey(career)) || '{}'); } catch(e){ return {}; }
}
function saveRoad(career, data){
  try{ localStorage.setItem(getRoadKey(career), JSON.stringify(data)); } catch(e){}
}

function totalOf(anchor){
  const t = anchor?.querySelector('.rs-num')?.textContent || '';
  const m = t.match(/(\d+)/);
  return m ? parseInt(m[1]) : 0;
}

function logToday(career, key){
  const road = loadRoad(career);
  if(!road.log) road.log = {};
  const today = new Date().toISOString().slice(0,10);
  if(!road.log[today]) road.log[today] = [];
  if(!road.log[today].includes(key)) road.log[today].push(key);
  road.items[key].lastDate = today;
  saveRoad(career, road);
}

function initRoadmap(career){
  const road = loadRoad(career);
  const containerId = career === 'cost' ? 'roadSummary_cost' : (career === 'hr' ? 'roadSummary_hr' : 'roadSummary_bom');
  const container = document.getElementById(containerId);
  if(!container) return;

  // Find all resource rows within this career's roadmap section
  const careerBodyId = career === 'cost' ? 'careerCost' : (career === 'hr' ? 'careerHR' : 'careerBOM');
  const rows = Array.from(document.querySelectorAll('#'+careerBodyId+' .phase .res-item'));
  if(rows.length === 0 && !road.inited){
    // First time - build items from sub-text entries with links
    const subs = Array.from(document.querySelectorAll('#'+careerBodyId+' .phase .sub-text'));
    subs.forEach((sub, idx) => {
      const link = sub.querySelector('a[href]');
      if(link){
        const name = link.textContent.trim();
        const key = career+'_'+idx+'_'+name.slice(0,20);
        if(!road.items) road.items = {};
        if(!road.items[key]){
          road.items[key] = { done:false, ep:0, total:totalOf(sub.parentElement), name:name };
        }
      }
    });
    road.inited = true;
    saveRoad(career, road);
  }

  // Wire checkboxes in phase subsections
  const parentSection = document.getElementById(containerId)?.closest('section') || document.getElementById(careerBodyId);
  const phaseDivs = Array.from(parentSection?.querySelectorAll('.phase') || []);
  phaseDivs.forEach(phase => {
    // Each .sub that has a link becomes a trackable row
    const subs = phase.querySelectorAll(':scope > .sub');
    subs.forEach((sub, sIdx) => {
      const link = sub.querySelector('.sub-text a[href]');
      if(!link) return;
      const name = link.textContent.trim();
      const key = career+'_'+phaseDivs.indexOf(phase)+'_'+sIdx+'_'+name.slice(0,20);

      if(!road.items) road.items = {};
      if(!road.items[key]){
        road.items[key] = { done:false, ep:0, total:totalOf(sub), name:name };
      }
      const item = road.items[key];

      // Ensure checkbox exists
      let row = sub.closest('.sub') || sub;
      let cb = row.querySelector('.road-cb');
      if(!cb){
        cb = document.createElement('div');
        cb.className = 'res-cb road-cb';
        cb.textContent = '✓';
        row.querySelector('.sub-text').insertBefore(cb, row.querySelector('.sub-text').firstChild);
      }
      cb.classList.toggle('on', item.done);

      cb.addEventListener('click', (e)=>{
        e.stopPropagation();
        item.done = !item.done;
        if(item.done){
          const tot = totalOf(row);
          if(tot) item.ep = tot;
          logToday(career, key);
        } else {
          item.ep = 0;
        }
        cb.classList.toggle('on', item.done);
        // Update stepper display
        const stVal = row.querySelector('.st-val b');
        if(stVal && item.total) stVal.textContent = item.ep;
        saveRoad(career, road);
        renderSummary(career);
        renderCal(career);
      });

      // Wire steppers
      const minus = row.querySelector('.st-minus');
      const plus = row.querySelector('.st-plus');
      const stVal = row.querySelector('.st-val b');

      if(stVal && item.total) stVal.textContent = item.ep;

      if(minus) minus.addEventListener('click', (e)=>{
        e.stopPropagation();
        if(item.ep > 0){ item.ep--; saveRoad(career, road); if(stVal) stVal.textContent=item.ep; renderSummary(career); }
      });
      if(plus) plus.addEventListener('click', (e)=>{
        e.stopPropagation();
        const max = totalOf(row);
        if(item.ep < max){ item.ep++; saveRoad(career, road); if(stVal) stVal.textContent=item.ep; renderSummary(career); }
        if(item.ep >= max && !item.done){
          item.done = true; item.lastDate = new Date().toISOString().slice(0,10);
          const cb2 = row.querySelector('.road-cb');
          if(cb2) cb2.classList.add('on');
          logToday(career, key);
          saveRoad(career, road);
          renderSummary(career); renderCal(career);
        }
      });

      // Auto-log on video click
      if(link){
        link.addEventListener('click', ()=>{
          logToday(career, key);
          saveRoad(career, road);
          renderCal(career);
        });
      }
    });
  });

  saveRoad(career, road);
  renderSummary(career);
  renderCal(career);
}

function renderSummary(career){
  const road = loadRoad(career);
  const items = road.items || Object.create(null);
  const keys = Object.keys(items);
  let doneCount = 0, epSum = 0;
  keys.forEach(k => {
    if(items[k].done) doneCount++;
    epSum += (items[k].ep || 0);
  });
  const daysSet = new Set(Object.keys(road.log || {}));

  const doneEl = document.getElementById('rsDone_'+career);
  const epEl = document.getElementById('rsEp_'+career);
  const daysEl = document.getElementById('rsDays_'+career);
  const barEl = document.getElementById('rsBar_'+career);
  if(doneEl) doneEl.textContent = doneCount;
  if(epEl) epEl.textContent = epSum;
  if(daysEl) daysEl.textContent = daysSet.size;
  if(barEl) barEl.style.width = keys.length ? Math.round(doneCount/keys.length*100)+'%' : '0%';
}

// ===== Calendar =====
function renderCal(career){
  const road = loadRoad(career);
  const log = road.log || {};
  const now = new Date();
  let y = (road.calYear || now.getFullYear());
  let m = (road.calMonth ?? now.getMonth()); // 0-based
  const grid = document.getElementById('calGrid_'+career);
  const monthLabel = document.getElementById('calMonth_'+career);
  if(!grid) return;

  monthLabel.textContent = y+'年'+(m+1)+'月';
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const todayStr = now.toISOString().slice(0,10);
  let html = '日一二三四五六'.split('').map(d=>'<div class="cal-cell" style="font-size:11px;color:var(--muted);cursor:default">'+d+'</div>').join('');

  for(let i=0;i<firstDay;i++) html += '<div class="cal-cell" style="cursor:default"></div>';
  for(let d=1;d<=daysInMonth;d++){
    const ds = y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const courses = log[ds] || [];
    const lv = courses.length === 0 ? 0 : (courses.length === 1 ? 1 : (courses.length <= 3 ? 2 : 3));
    const isToday = ds === todayStr;
    html += `<div class="cal-cell cd lv${lv}${isToday?' today':''}" data-date="${ds}" data-career="${career}">${d}</div>`;
  }
  grid.innerHTML = html;

  // Click date -> show detail
  grid.querySelectorAll('.cal-cell[data-date]').forEach(cell=>{
    cell.addEventListener('click', ()=>{
      const ds = cell.dataset.date;
      const courses = log[ds] || [];
      const detail = document.getElementById('calDetail_'+career);
      if(detail){
        if(courses.length === 0) detail.textContent = ds+' 无学习记录';
        else detail.textContent = ds+' 学了：'+courses.map(k=>(road.items||{})[k]?.name||k).join('、');
      }
    });
  });
}

// Cal prev/next
['cost','hr','bom'].forEach(career => {
  document.querySelectorAll('.cal-prev[data-career="'+career+'"]').forEach(b=>{
    b.addEventListener('click', ()=>{ const road=loadRoad(career); road.calMonth=(road.calMonth??new Date().getMonth())-1; if(road.calMonth<0){road.calMonth=11;road.calYear=(road.calYear||new Date().getFullYear())-1;} saveRoad(career,road); renderCal(career); });
  });
  document.querySelectorAll('.cal-next[data-career="'+career+'"]').forEach(b=>{
    b.addEventListener('click', ()=>{ const road=loadRoad(career); road.calMonth=(road.calMonth??new Date().getMonth())+1; if(road.calMonth>11){road.calMonth=0;road.calYear=(road.calYear||new Date().getFullYear())+1;} saveRoad(career,road); renderCal(career); });
  });
});

// Reset roadmap
['cost','hr','bom'].forEach(career => {
  document.querySelectorAll('.road-reset[data-career="'+career+'"]').forEach(b=>{
    b.addEventListener('click', ()=>{
      if(confirm('确定重置 '+career.toUpperCase()+' 路线图的所有学习进度吗？')){
        localStorage.removeItem(getRoadKey(career));
        initRoadmap(career);
        renderAllProgress();
      }
    });
  });
});

// Export/Import
['cost','hr','bom'].forEach(career => {
  document.querySelectorAll('.road-export[data-career="'+career+'"]').forEach(b=>{
    b.addEventListener('click', ()=>{
      const data = { road: loadRoad(career), state:{}, ts: new Date().toISOString() };
      // Also export global checkboxes for this career
      const prefix = career === 'cost' ? '' : (career === 'hr' ? 'h' : 'b');
      document.querySelectorAll('.check[data-key^="'+prefix+'"]').forEach(cb=>{
        data.state[cb.dataset.key] = cb.classList.contains('done')?1:0;
      });
      const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download='learning-progress-'+career+'.json'; a.click(); URL.revokeObjectURL(url);
    });
  });
  document.querySelectorAll('.road-import[data-career="'+career+'"]').forEach(b=>{
    b.addEventListener('click',()=>document.querySelector('.road-file[data-career="'+career+'"]').click());
  });
  document.querySelectorAll('.road-file[data-career="'+career+'"]').forEach(inp=>{
    inp.addEventListener('change', e=>{
      const f = e.target.files[0]; if(!f) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try{
          const data = JSON.parse(ev.target.result);
          if(data.road) saveRoad(career, data.road);
          if(data.state){
            Object.entries(data.state).forEach(([k,v])=>{
              state[k]=v; const cb=document.querySelector('.check[data-key="'+k+'"]');
              if(cb){if(v)cb.classList.add('done');else cb.classList.remove('done');}
            }); save();
          }
          initRoadmap(career); renderAllProgress();
          alert('导入成功！');
        }catch(err){ alert('导入失败：'+err.message); }
      };
      reader.readAsText(f);
      inp.value='';
    });
  });
});

// ===== GitHub Gist Cloud Sync =====
['cost','hr','bom'].forEach(career => {
  // Toggle panel
  document.querySelectorAll('.gist-toggle[data-career="'+career+'"]').forEach(b=>{
    b.addEventListener('click', ()=>{
      const panel = document.querySelector('.gist-panel-'+career);
      if(panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });
  });
  // Save settings
  document.querySelectorAll('.gist-set[data-career="'+career+'"]').forEach(b=>{
    b.addEventListener('click', ()=>{
      const tokenEl = document.querySelector('.gist-token[data-career="'+career+'"]');
      const idEl = document.querySelector('.gist-id-input[data-career="'+career+'"]');
      const road = loadRoad(career);
      if(tokenEl) road.gistToken = tokenEl.value.trim();
      if(idEl) road.gistId = idEl.value.trim();
      saveRoad(career, road);
      const statusEl = document.querySelector('.sync-status-'+career);
      if(statusEl) { statusEl.textContent = '✅ 设置已保存'; statusEl.className = 'sync-status sync-status-'+career+' ok'; setTimeout(()=>statusEl.textContent='',3000); }
    });
  });
  // Upload
  document.querySelectorAll('.gist-upload[data-career="'+career+'"]').forEach(b=>{
    b.addEventListener('click', async()=>{
      const statusEl = document.querySelector('.sync-status-'+career);
      if(!statusEl) return;
      const road = loadRoad(career);
      const token = road.gistToken || '';
      if(!token){ statusEl.textContent = '❌ 请先填写 GitHub 令牌'; statusEl.className='sync-status sync-status-'+career+' err'; return; }
      statusEl.textContent = '⏳ 上传中...';
      try{
        const payload = { road, state:{}, ts: new Date().toISOString(), career };
        const prefix = career === 'cost' ? '' : (career === 'hr' ? 'h' : 'b');
        document.querySelectorAll('.check[data-key^="'+prefix+'"]').forEach(cb=>{
          payload.state[cb.dataset.key] = cb.classList.contains('done')?1:0;
        });
        const bodyJson = JSON.stringify({ description: (career==='cost'?'数据分析师成本方向学习进度':(career==='hr'?'HR数据专家学习进度':'产品数据工程师BOM学习进度')), public: false, files: { 'progress.json': { content: JSON.stringify(payload) } } });
        let url, opts;
        if(road.gistId){
          url = 'https://api.github.com/gists/'+road.gistId;
          opts = { method:'PATCH', headers:{ Authorization:'token '+token, 'Accept':'application/vnd.github.v3+json' }, body:bodyJson };
        } else {
          url = 'https://api.github.com/gists';
          opts = { method:'POST', headers:{ Authorization:'token '+token, 'Accept':'application/vnd.github.v3+json' }, body:bodyJson };
        }
        const resp = await fetch(url, opts);
        const data = await resp.json();
        if(resp.ok && data.id){
          if(!road.gistId){ road.gistId = data.id; saveRoad(career, road); const idInput = document.querySelector('.gist-id-input[data-career="'+career+'"]'); if(idInput) idInput.value=data.id; }
          statusEl.textContent = '☁ 已上传到云端（Gist: '+data.id.slice(0,8)+'…）';
          statusEl.className = 'sync-status sync-status-'+career+' ok';
        } else {
          throw new Error((data.message||'HTTP '+resp.status));
        }
      } catch(err){ statusEl.textContent = '❌ 上传失败：'+err.message; statusEl.className='sync-status sync-status-'+career+' err'; }
    });
  });
  // Download
  document.querySelectorAll('.gist-download[data-career="'+career+'"]').forEach(b=>{
    b.addEventListener('click', async()=>{
      const statusEl = document.querySelector('.sync-status-'+career);
      if(!statusEl) return;
      const road = loadRoad(career);
      const token = road.gistToken || '';
      const gid = road.gistId || '';
      if(!token || !gid){ statusEl.textContent = '❌ 请先填写令牌和 Gist ID'; statusEl.className='sync-status sync-status-'+career+' err'; return; }
      statusEl.textContent = '⏳ 下载中...';
      try{
        const resp = await fetch('https://api.github.com/gists/'+gid, { headers:{ Authorization:'token '+token } });
        const data = await resp.json();
        if(resp.ok && data.files && data.files['progress.json']){
          const payload = JSON.parse(data.files['progress.json'].content);
          if(payload.road) saveRoad(career, payload.road);
          if(payload.state){
            Object.entries(payload.state).forEach(([k,v])=>{
              state[k]=v; const cb=document.querySelector('.check[data-key="'+k+'"]');
              if(cb){if(v)cb.classList.add('done');else cb.classList.remove('done');}
            }); save();
          }
          initRoadmap(career); renderAllProgress();
          statusEl.textContent = '☁ 已从云端同步（Gist: '+gid.slice(0,8)+'…）';
          statusEl.className = 'sync-status sync-status-'+career+' ok';
        } else { throw new Error('Gist 中未找到 progress.json'); }
      } catch(err){ statusEl.textContent = '❌ 下载失败：'+err.message; statusEl.className='sync-status sync-status-'+career+' err'; }
    });
  });
});

// ===== Init on load =====
renderAllProgress();
initRoadmap('cost');
initRoadmap('hr');
initRoadmap('bom');
showFirstSection('cost');
// Force career isolation on initial load (double safety)
careerHR.style.display = 'none';
careerBOM.style.display = 'none';

/* Pagination: tables and row lists show 10 rows per page, card grids 3 rows of cards. */
const PG_ROWS=10, PG_CARD_ROWS=3;
const PG_STATE=new Map();
const PG_ICO=pts=>'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="'+pts+'"></polyline></svg>';
function pgTargets(){
  const v=document.getElementById("view");if(!v)return [];
  const out=[];
  v.querySelectorAll("table.t").forEach(el=>{const box=el.querySelector(":scope > tbody");if(box)out.push({el,box,kind:"table"});});
  v.querySelectorAll(".gs-proj-grid").forEach(el=>out.push({el,box:el,kind:"grid"}));
  v.querySelectorAll(".list:not(#pkgItems)").forEach(el=>out.push({el,box:el,kind:"list"}));
  const seen={};
  out.forEach(t=>{seen[t.kind]=(seen[t.kind]||0)+1;t.key=(location.hash||"#/search")+"|"+t.kind+"|"+seen[t.kind];});
  return out;
}
function pgRows(box){return [...box.children].filter(r=>!r.classList.contains("pager"));}
function pgSize(t){
  if(t.kind!=="grid")return PG_ROWS;
  const cols=getComputedStyle(t.box).gridTemplateColumns.split(" ").filter(Boolean).length;
  return Math.max(1,cols)*PG_CARD_ROWS;
}
function pgNums(page,pages){
  if(pages<=7)return Array.from({length:pages},(_,i)=>i+1);
  const s=new Set([1,pages,page-1,page,page+1]);
  if(page<=4)[2,3,4,5].forEach(x=>s.add(x));
  if(page>=pages-3)[pages-1,pages-2,pages-3,pages-4].forEach(x=>s.add(x));
  const nums=[...s].filter(x=>x>=1&&x<=pages).sort((a,b)=>a-b),out=[];
  nums.forEach((x,i)=>{if(i&&x-nums[i-1]>1)out.push(0);out.push(x);});
  return out;
}
/* Card grids change column count with their own width (window size, sidebar collapse) */
const pgRO=new ResizeObserver(entries=>{
  let changed=false;
  entries.forEach(e=>{const w=Math.round(e.contentRect.width);if(e.target._pgW!==w){e.target._pgW=w;changed=true;}});
  if(changed){clearTimeout(pgRun.timer);pgRun.timer=setTimeout(pgRun,60);}
});
function pgApply(t){
  if(t.kind==="grid"&&!t.box._pgWatched){t.box._pgWatched=true;pgRO.observe(t.box);}
  const all=pgRows(t.box),shown=all.filter(r=>!r.hidden),size=pgSize(t),n=shown.length;
  const pages=Math.max(1,Math.ceil(n/size));
  let st=PG_STATE.get(t.key);
  if(!st||st.n!==n)st={page:1,n,size};
  else if(st.size!==size)st={page:Math.floor((st.page-1)*st.size/size)+1,n,size};
  st.page=Math.min(Math.max(1,st.page),pages);
  PG_STATE.set(t.key,st);
  const from=(st.page-1)*size,to=Math.min(from+size,n),idx=new Map(shown.map((r,i)=>[r,i]));
  all.forEach(r=>{const i=idx.has(r)?idx.get(r):-1,off=i!==-1&&(i<from||i>=to);
    if(r.classList.contains("pg-off")!==off)r.classList.toggle("pg-off",off);});
  pgPager(t,st.page,pages,n,from,to);
}
function pgAnchor(t){const p=t.el.parentElement;return t.kind==="table"&&p&&p.classList.contains("scroll")?p:t.el;}
function pgPager(t,page,pages,n,from,to){
  let nav=t.el._pager;
  if(pages<=1){if(nav){nav.remove();t.el._pager=null;}return;}
  if(!nav){nav=document.createElement("nav");nav.className="pager";nav.setAttribute("aria-label","Pagination");t.el._pager=nav;}
  nav._target=t;
  const anchor=pgAnchor(t);
  if(anchor.nextElementSibling!==nav)anchor.after(nav);
  const html='<span class="pager-info">Showing <b>'+(from+1)+'–'+to+'</b> of '+n+'</span>'+
    '<div class="pager-btns">'+
      '<button type="button" class="pager-btn" data-pg="'+(page-1)+'"'+(page===1?' disabled':'')+' aria-label="Previous page" title="Previous page">'+PG_ICO("15 18 9 12 15 6")+'</button>'+
      pgNums(page,pages).map(x=>x?'<button type="button" class="pager-btn" data-pg="'+x+'"'+(x===page?' aria-current="page"':'')+' aria-label="Page '+x+'">'+x+'</button>':'<span class="pager-gap" aria-hidden="true">…</span>').join("")+
      '<button type="button" class="pager-btn" data-pg="'+(page+1)+'"'+(page===pages?' disabled':'')+' aria-label="Next page" title="Next page">'+PG_ICO("9 18 15 12 9 6")+'</button>'+
    '</div>';
  if(nav._html!==html){nav.innerHTML=html;nav._html=html;}
}
let pgRunning=false;
function pgRun(){if(pgRunning)return;pgRunning=true;try{pgTargets().forEach(pgApply);}finally{pgRunning=false;}}

export function initPagination(){
  document.addEventListener("click",e=>{
    const b=e.target.closest(".pager [data-pg]");if(!b||b.disabled||b.hasAttribute("aria-current"))return;
    const nav=b.closest(".pager"),t=nav._target,st=t&&PG_STATE.get(t.key);if(!st)return;
    st.page=+b.dataset.pg;pgApply(t);
    const top=pgAnchor(t).getBoundingClientRect().top,head=(parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--top-h"))||64)+16;
    if(top<head)window.scrollBy(0,top-head);
    const cur=nav.querySelector('[aria-current="page"]');if(cur)cur.focus({preventScroll:true});
  });
  /* Sorting a table starts again from its first page */
  document.addEventListener("click",e=>{
    const th=e.target.closest("table.t thead th.sortable");if(!th)return;
    const t=pgTargets().find(x=>x.el===th.closest("table.t"));if(!t)return;
    const st=PG_STATE.get(t.key);if(st){st.page=1;pgApply(t);}
  });
  /* Re-paginate whenever a page renders, a list is re-drawn or a search hides rows */
  new MutationObserver(pgRun).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["hidden"]});
}

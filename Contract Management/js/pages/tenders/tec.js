/* TEC inbox and the read-only package viewer. */
import { log } from "../../core/activity.js";
import { PS } from "../../core/constants.js";
import { D, PK, T, me } from "../../core/model.js";
import { isTEC } from "../../core/permissions.js";
import { route } from "../../core/registry.js";
import { denied } from "../../core/router.js";
import { S, save } from "../../core/store.js";
import { has } from "../../core/tasks.js";
import { renderNav } from "../../layout/sidebar.js";
import { tecBreadcrumbs } from "../../ui/breadcrumbs.js";
import { esc, fmtD, uname } from "../../ui/format.js";
import { adot, badge } from "../../ui/markup.js";

/* TEC viewer */
function tecInbox(){const u=me(),ps=S.packages.filter(p=>[PS.TEC,PS.POST,PS.FIN].includes(p.status)&&isTEC(u,T(p.tenderId)));
  return '<h1>TEC inbox</h1>'+(ps.length?'<div class="scroll"><table class="t"><thead><tr><th>Tender</th><th>Version</th><th>Submitted</th><th>Your view</th></tr></thead><tbody>'+ps.map(p=>{const t=T(p.tenderId);return '<tr><td><a href="#/tec/'+p.id+'">'+esc(t.code)+'</a>'+adot(has("tecRead:"+p.id))+'<br><span class="small muted">'+esc(t.title)+'</span></td><td>'+p.version+'</td><td>'+fmtD(p.submittedAt)+'</td><td>'+(p.tecViews[u.id]?badge("Viewed"):'<span class="badge w">Not viewed yet</span>')+'</td></tr>';}).join("")+'</tbody></table></div>':'<div class="empty">Nothing has been submitted to your panel.</div>');}
route("tec",(pid,ix)=>{const u=me();if(!pid)return tecInbox();const p=PK(pid);if(!p)return denied("This package doesn't exist.");const t=T(p.tenderId);
  if(!isTEC(u,t)||!p.submittedAt)return denied("Only TEC members of "+t.code+" can open this package after submission.");
  if(!p.tecViews[u.id]){p.tecViews[u.id]=Date.now();log(t,"viewed package v"+p.version);save();setTimeout(renderNav,0);}
  const i=ix===undefined?-1:+ix,items=p.items.map(it=>({it,d:D(it.docId)})),ms=S.metrics.filter(m=>m.tenderId===t.id);
  const sel=i>=0&&items[i]?items[i]:null,html=sel?(sel.d.versions[sel.it.versionNo-1]||{html:sel.d.html}).html:null;
  return tecBreadcrumbs()+'<div class="head"><div><h1>'+esc(t.code+" "+t.title)+'</h1><div class="row">'+badge(p.status)+'<span class="small muted">Package version '+p.version+', submitted '+fmtD(p.submittedAt)+' by '+uname(t.icId)+'. Read-only.</span></div></div></div>'+
  '<div class="grid2 u-cols-260-fr"><div><div class="panel toc"><h3>Contents</h3><a href="#/tec/'+p.id+'"'+(i<0?' aria-current="true"':"")+'>Transmittal and success metrics</a>'+items.map((x,k)=>'<a href="#/tec/'+p.id+'/'+k+'"'+(k===i?' aria-current="true"':"")+'>'+(k+1)+'. '+esc(x.d.name)+'</a>').join("")+'</div>'+
  ''+'</div>'+
  '<div>'+(sel?'<div class="doc"><div class="doc-tools"><b class="small">'+esc(sel.d.name)+'</b><span class="saved">Version '+sel.it.versionNo+', '+(sel.d.audience==="Internal"?"internal":"for tenderers")+'</span></div><div class="doc-body">'+html+'</div></div>':
   '<div class="panel"><h3>Transmittal</h3><dl class="kv"><dt>Tender</dt><dd>'+esc(t.code+" "+t.title)+'</dd><dt>Procurement route</dt><dd>'+esc(t.route)+'</dd><dt>Package version</dt><dd>'+p.version+'</dd><dt>Documents</dt><dd>'+items.length+' ('+items.filter(x=>x.d.audience==="Internal").length+' internal)</dd><dt>Contracts review</dt><dd>'+esc((p.reviews.filter(r=>r.stage==="Before TEC").slice(-1)[0]||{outcome:"Not recorded"}).outcome)+'</dd></dl></div>'+
   '<div class="panel"><h3>Success metrics</h3>'+(ms.length?ms.map(m=>'<div class="metric"><span><b>'+esc(m.metric)+'</b><span class="why">Target: '+esc(m.target)+'</span></span><span class="tag">'+esc(m.source)+'</span></div>').join(""):'<p class="muted">No metrics recorded.</p>')+'</div>')+'</div></div>';});

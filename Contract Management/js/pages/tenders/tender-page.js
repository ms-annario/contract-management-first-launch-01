/* Tender page shell, overview tab and activity tab. */
import { log, notify } from "../../core/activity.js";
import { T, U, docsOf, me, pkgOf, spOf } from "../../core/model.js";
import { canSeeTender, isSPL, isTEC } from "../../core/permissions.js";
import { tStatus } from "../../core/progress.js";
import { ACT, ROUTES, route } from "../../core/registry.js";
import { denied, rerender } from "../../core/router.js";
import { S } from "../../core/store.js";
import { docNeeds, has } from "../../core/tasks.js";
import { tDocs } from "./documents-tab.js";
import { tMetrics } from "./metrics-tab.js";
import { tTeam } from "./team-tab.js";
import { feed } from "../../ui/activity-feed.js";
import { tenderBreadcrumbs } from "../../ui/breadcrumbs.js";
import { openModal, toast } from "../../ui/feedback.js";
import { esc, fmtD, uname } from "../../ui/format.js";
import { badge, dA, dSR, segs, userOpts } from "../../ui/markup.js";

/* ---------- Tender pages ---------- */
export const TABS=[["overview","Overview"],["team","Team"],["documents","Documents"],["metrics","Success metrics"]];
export const SUGG={};
export function tabNeeds(t,k){const p=pkgOf(t),pk=x=>p?x.map(y=>y+":"+p.id):[];
  if(k==="overview")return has("assignIC:"+t.id,"nominateTec:"+t.id);if(k==="team")return has("assignSme:"+t.id);
  if(k==="documents")return has("collate:"+t.id,"chooseDocs:"+t.id,"assignOwner:"+t.id)||docsOf(t).some(docNeeds);if(k==="metrics")return has("metrics:"+t.id);
  if(k==="package")return has(...pk(["tecApprove","sendCR","resendCR","sendTD","crReview"]));return false;}
function tenderHead(t,tab){
  const sp=spOf(t);
  return tenderBreadcrumbs(t)+'<div class="head"><div><h1>'+esc(t.code+" "+t.title)+'</h1><div class="row">'+badge(tStatus(t))+'</div></div>'+(isSPL(me(),sp)?'<div class="acts"><button class="btn ghost" data-act="delTender" data-id="'+t.id+'">Delete</button><button class="btn sec" data-act="editTender" data-id="'+t.id+'">Edit details</button></div>':"")+'</div>'+
  '<nav class="tabs" aria-label="Tender sections">'+TABS.map(([k,l])=>{const n=tabNeeds(t,k);return '<a href="#/tender/'+t.id+'/'+k+'"'+(k===tab?' aria-current="page"':"")+dA(n)+'>'+l+dSR(n)+'</a>';}).join("")+'</nav>';
}
route("tender",(id,tab,subtab)=>{const t=T(id),u=me();tab=tab||"overview";if(tab==="activity")tab="overview";if(!t)return denied("This tender doesn't exist.");
  if(!canSeeTender(u,t)){if(isTEC(u,t)&&pkgOf(t))return ROUTES.tec();return denied("You don't have a role on this tender.");}
  const body={overview:tOverview,team:tTeam,documents:tDocs,metrics:tMetrics,activity:tActivity}[tab]||tOverview;
  return tenderHead(t,tab)+body(t,subtab);});
export function tOverview(t){const u=me(),sp=spOf(t),lead=isSPL(u,sp);
  const cands=S.users.filter(x=>x.status==="Active"&&x.companyId==="c1"&&x.teamId==="t-pm");
  return '<div class="grid2"><div><div class="panel">'+
  '<div class="u-d-flex u-items-center u-justify-between u-mb-12 u-gap-12">'+
    '<h3 class="u-m-0">Tender details</h3>'+
    '<button type="button" class="btn sec sm u-d-inline-flex u-items-center u-gap-6" data-act="viewTenderChanges" data-id="'+t.id+'"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>View Changes</button>'+
  '</div>'+
  '<dl class="kv"><dt>Contract number</dt><dd>'+esc(t.code)+'</dd><dt>Contract type</dt><dd>'+esc(t.ctype||"–")+'</dd><dt>Procurement route</dt><dd>'+esc(t.route)+'</dd><dt>Sub-project</dt><dd>'+esc(sp.name)+', led by '+uname(sp.leadId)+'</dd>'+
  '<dt>Contract project IC</dt><dd>'+(lead&&!t.manual?'<span class="sel-dot"'+dA(has("assignIC:"+t.id))+'><select data-chg="setIC" data-id="'+t.id+'" aria-label="Contract project IC">'+userOpts(cands,t.icId,"Choose an IC",true)+'</select></span>':t.icId?uname(t.icId):'<span class="muted">Not assigned</span>')+'</dd>'+
  '<dt>Created</dt><dd>'+fmtD(t.createdAt)+'</dd></dl>'+(t.scope?'<h3>Description</h3><p class="muted u-max-w-70ch">'+esc(t.scope)+'</p>':"")+'</div>'+
  '<div class="panel"><h3>Progress</h3>'+segs(t)+'</div></div>'+
  '<div><div class="panel"><h3>Tender evaluation committee</h3>'+(t.tec.length?'<ul class="u-m-0 u-pl-18">'+t.tec.map(m=>'<li>'+uname(m.userId)+(m.chair?" (chair)":"")+'</li>').join("")+'</ul>':'<p class="muted">No members nominated yet.</p>')+
  (lead&&!t.manual?'<button class="btn sec sm" data-act="nominateTec" data-id="'+t.id+'"'+dA(has("nominateTec:"+t.id))+'>'+(t.tec.length?"Change members":"Nominate members")+dSR(has("nominateTec:"+t.id))+'</button>':"")+'</div>'+
  '</div></div>';}
ACT.setIC=el=>{const t=T(el.dataset.id);if(!el.value)return;const prev=t.icId;t.icId=el.value;log(t,"assigned "+U(el.value).name+" as contract project IC");notify([el.value],"You are contract project IC for "+t.code+" "+t.title,"#/tender/"+t.id+"/team","assignSme:"+t.id);if(prev&&prev!==el.value)notify([prev],"You are no longer IC for "+t.code,"#/home");rerender();toast(U(el.value).name+" is now IC. Status: "+tStatus(t));};
ACT.nominateTec=el=>{const t=T(el.dataset.id),pool=S.users.filter(x=>x.status==="Active"&&x.companyId==="c1"),cur=t.tec.map(m=>m.userId),ch=(t.tec.find(m=>m.chair)||{}).userId;
  openModal({title:"Nominate TEC for "+t.code,body:'<div class="u-max-h-320 u-overflow-auto">'+pool.map(x=>'<div class="row u-justify-between u-border-b-1-solid-rule u-p-4-0"><label class="check u-m-0"><input type="checkbox" name="m" value="'+x.id+'"'+(cur.includes(x.id)?" checked":"")+'> '+esc(x.name)+' <span class="small muted">'+esc(x.title)+'</span></label><label class="small"><input type="radio" name="chair" value="'+x.id+'"'+(ch===x.id?" checked":"")+'> Chair</label></div>').join("")+'</div>',submit:"Save TEC",onSubmit:fd=>{
   const ms=fd.getAll("m"),c=fd.get("chair");if(!ms.length)return "Choose at least one member.";if(!c||!ms.includes(c))return "Choose a chair from the selected members.";
   t.tec=ms.map(id=>({userId:id,chair:id===c}));log(t,"nominated "+ms.length+" TEC members");notify(ms.filter(id=>!cur.includes(id)),"You were nominated to the TEC for "+t.code+" "+t.title+". You get access when the package is submitted.","#/tec");rerender();toast("TEC saved with "+U(c).name+" as chair");}});};
export function tActivity(t){return '<div class="panel">'+feed(S.activity.filter(a=>a.tenderId===t.id))+'</div>';}

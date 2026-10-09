/* Tender stage tracking, project progress and due-date status. */
import { DAY, DEFAULT_DUR, DS, PS, STAGES } from "./constants.js";
import { docsOf, pkgOf, projOf, reqDocs, spOf, tendersOf } from "./model.js";
import { S } from "./store.js";
import { esc } from "../ui/format.js";

export function tStatus(t){
  if(t.manual)return t.manual;
  if(!t.icId)return "Planned";
  const p=pkgOf(t);
  if(p){if(p.status===PS.FIN)return "Finalised";if([PS.TEC,PS.POST].includes(p.status))return "With TEC";if([PS.ICR,PS.CHG,PS.CLR].includes(p.status))return "In contracts review";}
  return docsOf(t).length?"In preparation":"Set up";
}
function addWorkdays(ts,n){const d=new Date(ts);let k=0;while(k<n){d.setDate(d.getDate()+1);const w=d.getDay();if(w!==0&&w!==6)k++;}return d.getTime();}
export function plannedDates(t){const p=projOf(t),dur=(p&&p.dur&&p.dur.length===STAGES.length)?p.dur:DEFAULT_DUR;let c=t.createdAt;return dur.map(n=>(c=addWorkdays(c,n)));}
function stageChecks(t){
  const ds=reqDocs(t),p=pkgOf(t),sp=spOf(t);
  const all=list=>ds.length>0&&ds.every(d=>list.includes(d.status));
  const pIn=list=>!!p&&list.includes(p.status);
  return [!!(sp&&sp.leadId),
   !!t.icId,
   t.smes.length>0,
   ds.length>0&&ds.every(d=>d.ownerId),
   all([DS.PA,DS.AP,DS.FI,DS.CR]),
   all([DS.AP,DS.FI,DS.CR]),
   !!p,
   !!p&&(p.tecApproved||pIn([PS.ICR,PS.CHG,PS.CLR,PS.TEC,PS.POST,PS.FIN,PS.TD])),
   pIn([PS.CLR,PS.TEC,PS.POST,PS.FIN,PS.TD]),
   pIn([PS.TD])];
}
export function currentStage(t){const c=stageChecks(t);const i=c.findIndex(ok=>!ok);return i<0?STAGES.length:i;}
/* Stage shown as current (the last one once everything is done) */
export function stageIdx(t){return Math.min(currentStage(t),STAGES.length-1);}
function stageLabel(t){return currentStage(t)>=STAGES.length?"Sent to Tender Division":STAGES[stageIdx(t)];}
function stagePct(t){return Math.round(currentStage(t)/STAGES.length*100);}
/* Project progress: every tender, plus each sub-project that has no tender yet */
/* Card status for an active project, from its progress */
export function projectPrepStatus(p){if(p.status!=="Active")return p.status;const pct=projectPct(p);return pct>=100?"Done Preparation":pct<=0?"Start Preparation":"Tender Preparing";}
/* Short hover summary of where a project's tenders are */
export function projectInsight(p){const sps=S.subprojects.filter(sp=>sp.projectId===p.id);
  const ts=sps.flatMap(sp=>tendersOf(sp).filter(t=>!t.manual)),empty=sps.filter(sp=>!tendersOf(sp).some(t=>!t.manual));
  const by={};ts.forEach(t=>{const l=stageLabel(t);by[l]=(by[l]||0)+1;});
  const order=STAGES.concat(["Sent to Tender Division"]);
  const rows=Object.keys(by).sort((a,b)=>order.indexOf(b)-order.indexOf(a)).map(l=>'<li><span>'+esc(l===STAGES[STAGES.length-1]?"Ready to send to Tender Division":l)+'</span><b>'+by[l]+'</b></li>').join("");
  const head=ts.length?ts.length+' '+(ts.length===1?'tender':'tenders')+' across '+sps.length+' '+(sps.length===1?'sub-project':'sub-projects'):(sps.length?'No tenders yet':'No sub-projects yet');
  const lagging=ts.length?ts.reduce((a,t)=>currentStage(t)<currentStage(a)?t:a):null;
  const note=empty.length?empty.length+' '+(empty.length===1?'sub-project has':'sub-projects have')+' no tender yet':(lagging&&currentStage(lagging)<STAGES.length?'Furthest behind: '+lagging.code+' at '+stageLabel(lagging).replace(/^Send to/,"Ready to send to"):'');
  return '<div class="gs-proj-tip" role="tooltip"><div class="gs-proj-tip-h">'+esc(head)+'</div>'+(rows?'<ul>'+rows+'</ul>':'')+(note?'<div class="gs-proj-tip-n">'+esc(note)+'</div>':'')+'</div>';}
export function projectPct(p){const sps=S.subprojects.filter(sp=>sp.projectId===p.id);const units=[];
  sps.forEach(sp=>{const ts=tendersOf(sp).filter(t=>!t.manual);if(ts.length)ts.forEach(t=>units.push(stagePct(t)));else units.push(sp.leadId?Math.round(1/STAGES.length*100):0);});
  return units.length?Math.round(units.reduce((a,b)=>a+b,0)/units.length):0;}
function rag(due,done){if(done||!due)return "g";const left=(due-Date.now())/DAY;if(left<0)return "b";if(left<=2.8)return "w";return "g";}
export function docRag(d){return [DS.AP,DS.FI,DS.NR].includes(d.status)?"g":rag(d.due,false);}
export function spStatus(sp){
  if(sp.status)return sp.status;
  const ts=tendersOf(sp);
  if(!ts.length)return "Set up";
  if(ts.every(t=>tStatus(t)==="Finalised"))return "Finalised";
  if(ts.some(t=>tStatus(t)==="With TEC"))return "With TEC";
  if(ts.some(t=>tStatus(t)==="In contracts review"))return "In contracts review";
  return "In preparation";
}
export function lastUpdTender(t){
  if(t.updatedAt)return {at:t.updatedAt,by:t.updatedBy};
  const a=S.activity.filter(x=>x.tenderId===t.id).sort((x,y)=>y.at-x.at)[0];
  if(a)return {at:a.at,by:a.by};
  return {at:t.createdAt||null,by:t.icId||null};
}

/* Small HTML helpers: badges, status dots, form fields and option lists. */
import { STAGES } from "../core/constants.js";
import { lastUpd } from "../core/model.js";
import { currentStage, lastUpdTender, stageIdx } from "../core/progress.js";
import { esc, fmtDT, uname } from "./format.js";

function badgeCls(s){
  if(["Approved","Final","Cleared for TEC","Finalised","Active","Viewed","Accepted","Done Preparation"].includes(s))return "g";
  if(["Drafting","Published","Collating","Set up","In preparation","Tender Preparing"].includes(s))return "a";
  if(["Pending approval","In contracts review","Submitted to TEC","Post-TEC review","With TEC","Invited","On hold"].includes(s))return "w";
  if(["Returned","Changes requested","Cancelled","Inactive","Overdue"].includes(s))return "b";
  return "";
}
export const badge=s=>'<span class="badge '+badgeCls(s)+'">'+esc(s)+'</span>';
export const ragDot=r=>'<span class="rag '+r+'" title="'+({g:"On track",w:"Due soon",b:"Overdue"})[r]+'" aria-hidden="true"></span>';
export const adot=c=>c?'<span class="adot" role="img" aria-label="Action needed" title="Action needed"></span>':"";
export const dA=c=>c?' data-dot title="Action needed"':"";
export const dSR=c=>c?'<span class="sr-only">, action needed</span>':"";
export const fld=(label,inner,id)=>'<div class="field"><label'+(id?' for="'+id+'"':"")+'>'+esc(label)+'</label>'+inner+'</div>';
export const opts=(list,sel)=>list.map(o=>'<option value="'+esc(o.v)+'"'+(o.v===sel?" selected":"")+'>'+esc(o.l)+'</option>').join("");
export const userOpts=(users,sel,blank,short)=>(blank?'<option value="">'+esc(blank)+'</option>':"")+opts(users.map(u=>({v:u.id,l:u.name+(u.title&&!short?", "+u.title:"")})),sel);
export function segs(t){const n=STAGES.length,all=currentStage(t)>=n,c=stageIdx(t),cls=i=>(i<c||all)?"done":i===c?"cur":"";
  return '<ol class="stages" aria-label="Stage '+(c+1)+' of '+n+'">'+STAGES.map((s,i)=>'<li class="'+cls(i)+'"'+(i===c&&!all?' aria-current="step"':'')+'><i></i><span>'+esc(s)+'</span></li>').join("")+'</ol>';}
export function updTxtTender(t){
  const l=lastUpdTender(t);
  return l.at?fmtDT(l.at)+(l.by?'<br><span class="small muted">by '+uname(l.by)+'</span>':''):'<span class="muted">–</span>';
}
export const updTxt=d=>{const l=lastUpd(d);return l.at?fmtDT(l.at)+(l.by?'<br><span class="small muted">by '+uname(l.by)+'</span>':""):'<span class="muted">–</span>';};

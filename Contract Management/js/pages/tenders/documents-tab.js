/* Tender documents tab: adding documents, owners, due dates and collation. */
import { log, notify } from "../../core/activity.js";
import { DS, PS, STAGES } from "../../core/constants.js";
import { sampleHtml } from "../../core/document-templates.js";
import { D, T, U, byId, docsOf, me, pkgOf, reqDocs, touchDoc } from "../../core/model.js";
import { canSeeDoc, isIC } from "../../core/permissions.js";
import { docRag, plannedDates } from "../../core/progress.js";
import { ACT } from "../../core/registry.js";
import { go, rerender } from "../../core/router.js";
import { S, save, uid } from "../../core/store.js";
import { docNeeds, has } from "../../core/tasks.js";
import { recPanel } from "./ai-recommendations.js";
import { M, openModal, toast } from "../../ui/feedback.js";
import { dueTxt, esc, fmtD, fromISO, toISO, uname } from "../../ui/format.js";
import { adot, badge, dA, dSR, ragDot, updTxt, userOpts } from "../../ui/markup.js";

ACT.newDoc=el=>{const t=T(el.dataset.id),have=docsOf(t).map(d=>d.catId),avail=S.catalogue.filter(k=>!have.includes(k.id)),smes=t.smes.map(s=>U(s.userId)),due=toISO(plannedDates(t)[STAGES.indexOf("Drafting")]);
  if(!smes.length){openModal({title:"Add an SME first",submit:null,body:'<p>Every document needs an SME as its owner. Assign SMEs on the Team tab, then add documents.</p><p><a class="btn sec sm" href="#/tender/'+t.id+'/team">Go to Team</a></p>'});M.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>M.close()));return;}
  const guess=k=>{const s=t.smes.find(x=>k.discipline.toLowerCase().includes(x.disc.toLowerCase())||x.disc.toLowerCase().includes(k.discipline.toLowerCase()));return s?s.userId:null;};
  const row=k=>'<tr><td><label class="check u-m-0"><input type="checkbox" name="k" value="'+k.id+'"'+(k.required?" checked":"")+'> <span>'+esc(k.name)+'<br><span class="small muted">'+esc(k.spec)+(k.audience==="Internal"?", internal":"")+'</span></span></label></td>'+
    '<td><select name="o_'+k.id+'" aria-label="Owner of '+esc(k.name)+'">'+userOpts(smes,guess(k),"Choose an SME",true)+'</select></td><td><input type="date" name="d_'+k.id+'" value="'+due+'" aria-label="Due date for '+esc(k.name)+'" class="u-w-auto"></td></tr>';
  openModal({title:"Add documents to "+t.code,wide:true,submit:avail.length?"Add selected documents":null,body:
    (avail.length?'<label class="check"><input type="checkbox" id="ndAll"> <b>Select all</b></label><div class="scroll u-max-h-46vh u-overflow-auto u-m-6-0-14"><table class="t"><thead><tr><th>Document</th><th>Owner SME</th><th>Due</th></tr></thead><tbody>'+avail.map(row).join("")+'</tbody></table></div>':'<p class="muted">Every catalogue document is already on this tender.</p>')+
    '',
   onSubmit:fd=>{const picks=fd.getAll("k"),list=[];
    if(!picks.length)return "Tick at least one document.";
    const miss=picks.filter(id=>!fd.get("o_"+id)).map(id=>byId(S.catalogue,id).name);if(miss.length)return "Choose an owner SME for: "+miss.join(", ")+".";
    picks.forEach(id=>{const k=byId(S.catalogue,id);list.push({k,owner:fd.get("o_"+id),due:fromISO(fd.get("d_"+id))});});
    list.forEach(({k,owner,due})=>{const html=k.spec==="General"?sampleHtml(k.name,t):"<h3>1. Scope</h3><p></p><h3>2. Requirements</h3><p></p><h3>3. Interfaces</h3><p></p>";
      const d={id:uid("d"),tenderId:t.id,catId:k.id,name:k.name,spec:k.spec,audience:k.audience,ownerId:owner,due,status:DS.NS,html,versions:[],comments:[],approvals:[],remarks:null,contractsFlag:null,createdAt:Date.now(),updatedAt:Date.now(),updatedBy:S.me};
      S.docs.push(d);notify([owner],"You own "+d.name+" on "+t.code+", "+dueTxt(d.due).toLowerCase(),"#/doc/"+d.id,"own:"+d.id);});
    log(t,"added "+list.length+(list.length===1?" document":" documents")+" and assigned owners");rerender();toast(list.length+(list.length===1?" document added":" documents added"));}});
  const all=document.getElementById("ndAll");if(all){const boxes=[...M.querySelectorAll('input[name=k]')],sync=()=>{all.checked=boxes.every(b=>b.checked);all.indeterminate=!all.checked&&boxes.some(b=>b.checked);};
    all.addEventListener("change",()=>{boxes.forEach(b=>b.checked=all.checked);sync();});boxes.forEach(b=>b.addEventListener("change",sync));sync();}};
const TDOC_TABS=[
  ["all","All",null],
  ["approved","Approved",[DS.AP,DS.FI]],
  ["pending","Pending approval",[DS.PA]],
  ["published","Published",[DS.IR]],
  ["drafting","Drafting",[DS.DR]],
  ["returned","Returned",[DS.RT]],
  ["changes","Changes requested",[DS.CR]],
  ["notstarted","Not started",[DS.NS]]
];
const tdocMatch=(k,d)=>{const tb=TDOC_TABS.find(x=>x[0]===k);if(!tb||k==="all"||!tb[2])return true;return tb[2].includes(d.status);};
export function tDocs(t,subtab){const u=me(),ic=isIC(u,t)&&!t.manual,allDocs=docsOf(t).sort((a,b)=>S.catalogue.findIndex(k=>k.id===a.catId)-S.catalogue.findIndex(k=>k.id===b.catId)),p=pkgOf(t);
  const smes=t.smes.map(s=>U(s.userId));
  const curTab=TDOC_TABS.some(x=>x[0]===subtab)?subtab:"all";
  const curTabItem=TDOC_TABS.find(x=>x[0]===curTab)||TDOC_TABS[0];
  const ds=allDocs.filter(d=>tdocMatch(curTab,d));
  const tabsNav=allDocs.length?'<nav class="tabs subtabs" aria-label="Filter documents by status">'+
    TDOC_TABS.map(([k,l])=>{
      const count=allDocs.filter(d=>tdocMatch(k,d)).length;
      if(!count&&k!=="all"&&k!==curTab)return "";
      const inGs = (location.hash || "").startsWith("#/search");
      const href = k==="all"?'#/tender/'+t.id+'/documents':'#/tender/'+t.id+'/documents/'+k;
      const gsAct = inGs ? ' data-act="gsTenderDocSubtab" data-subtab="'+k+'"' : '';
      return '<a href="'+href+'"'+gsAct+(k===curTab?' aria-current="page"':'')+'>'+esc(l)+' <span class="muted small">'+count+'</span></a>';
    }).join("")+'</nav>':'';
  return '<div class="head"><div><h2 class="sec u-mt-0">Tender readiness</h2></div><div class="acts">'+(ic?(!p?'<button class="btn ghost" data-act="collate" data-id="'+t.id+'"'+dA(has("collate:"+t.id))+'>Collate package'+dSR(has("collate:"+t.id))+'</button>':"")+'<button class="btn" data-act="newDoc" data-id="'+t.id+'"'+dA(has("chooseDocs:"+t.id))+'>Add documents'+dSR(has("chooseDocs:"+t.id))+'</button>':"")+'<button class="btn sec" data-act="uploadDoc" data-tender="'+t.id+'"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="u-mr-5 u-va-n2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>Upload document</button></div></div>'+(ic?recPanel(t):"")+tabsNav+
  (allDocs.length?(ds.length?'<div class="scroll"><table class="t"><thead><tr><th>Document</th><th>Type</th><th>Owner</th><th>Due</th><th>Status</th><th>Last updated</th></tr></thead><tbody>'+ds.map(d=>{const lock=[DS.AP,DS.FI,DS.NR,DS.PA].includes(d.status);
   return '<tr><td>'+(canSeeDoc(me(),d)?'<a href="#/doc/'+d.id+'">'+esc(d.name)+'</a>':esc(d.name)+' <span class="small muted">Not published yet</span>')+adot(docNeeds(d))+'</td><td><span class="tag">'+esc(d.spec)+'</span> '+(d.audience==="Internal"?'<span class="tag">Internal</span>':"")+'</td>'+
   '<td class="nowrap">'+(ic&&!lock?'<span class="sel-dot"'+dA(!d.ownerId&&has("assignOwner:"+t.id))+'><select data-chg="setOwner" data-id="'+d.id+'" aria-label="Owner of '+esc(d.name)+'">'+userOpts(smes,d.ownerId,"Unassigned",true)+'</select></span>':d.ownerId?uname(d.ownerId):'<span class="muted">Unassigned</span>')+'</td>'+
   '<td class="nowrap">'+(ic&&!lock?'<input type="date" class="u-w-auto" data-chg="setDue" data-id="'+d.id+'" value="'+(d.due?toISO(d.due):"")+'" aria-label="Due date">':'')+' '+ragDot(docRag(d))+(lock?fmtD(d.due):"")+'</td><td>'+badge(d.status)+'</td><td class="nowrap small">'+updTxt(d)+'</td>'+
   '</tr>';}).join("")+'</tbody></table></div>':'<div class="empty">No documents with status “'+esc(curTabItem[1])+'”.</div>'):'<div class="empty">No documents chosen yet.'+(ic?' Use <b>Add documents</b> to pick them and assign owners.':"")+'</div>');}
ACT.setOwner=el=>{const d=D(el.dataset.id),t=T(d.tenderId),prev=d.ownerId;d.ownerId=el.value||null;touchDoc(d);if(d.ownerId){notify([d.ownerId],"You now own "+d.name+" on "+t.code,"#/doc/"+d.id,"own:"+d.id);log(t,"assigned "+d.name+" to "+U(d.ownerId).name,d.id);}if(prev&&prev!==d.ownerId)notify([prev],d.name+" on "+t.code+" was reassigned","#/home");save();rerender();toast("Owner updated");};
ACT.setDue=el=>{const d=D(el.dataset.id);d.due=fromISO(el.value);touchDoc(d);save();rerender();toast("Due date updated");};
ACT.collate=el=>{const t=T(el.dataset.id),ds=reqDocs(t),miss=ds.filter(d=>d.status!==DS.AP);
  if(!ds.length){toast("Add documents before collating");return;}
  if(miss.length){openModal({title:"Package can't be collated yet",submit:null,body:'<p>'+miss.length+' required '+(miss.length===1?"document isn't":"documents aren't")+' approved:</p><div class="scroll"><table class="t"><tbody>'+miss.map(d=>'<tr><td><a href="#/doc/'+d.id+'">'+esc(d.name)+'</a></td><td>'+(d.ownerId?uname(d.ownerId):"Unassigned")+'</td><td>'+badge(d.status)+'</td></tr>').join("")+'</tbody></table></div>'});M.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>M.close()));return;}
  const prev=pkgOf(t),order=ds.sort((a,b)=>S.catalogue.findIndex(k=>k.id===a.catId)-S.catalogue.findIndex(k=>k.id===b.catId));
  const p={id:uid("pk"),tenderId:t.id,version:prev?prev.version+1:1,items:order.map(d=>({docId:d.id,versionNo:d.versions.length})),status:PS.COL,createdAt:Date.now(),reviews:[],checklist:{},tecViews:{},actions:[],submittedAt:null};
  S.packages.push(p);log(t,"collated package v"+p.version+" with "+p.items.length+" documents");rerender();toast("Package v"+p.version+" collated");go("#/package/"+p.id);};

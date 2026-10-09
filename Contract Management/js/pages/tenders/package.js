/* Tender package page and contracts-review actions. */
import { log, notify } from "../../core/activity.js";
import { DS, PS, TD_READY } from "../../core/constants.js";
import { D, PK, T, U, me, pkgOf, projOf, spOf, touchDoc } from "../../core/model.js";
import { canSeeTender, isCR, isIC, isPL, isSPL } from "../../core/permissions.js";
import { ACT, route } from "../../core/registry.js";
import { denied, rerender } from "../../core/router.js";
import { S, save, uid } from "../../core/store.js";
import { docNeeds, has } from "../../core/tasks.js";
import { packageBreadcrumbs } from "../../ui/breadcrumbs.js";
import { openModal, toast } from "../../ui/feedback.js";
import { esc, fmtD, fmtDT, uname } from "../../ui/format.js";
import { adot, badge, dA, dSR, fld } from "../../ui/markup.js";

export function pkgPanel(t){const u=me(),p=pkgOf(t),ic=isIC(u,t)&&!t.manual,cr=isCR(u);
  if(!p)return '<div class="empty">No package yet. '+(ic?'Collate once every required document is approved. <br><br><button class="btn" data-act="collate" data-id="'+t.id+'"'+dA(has("collate:"+t.id))+'>Collate package</button>':'The contract project IC collates it once every document is approved.')+'</div>';
  const items=p.items.map((it,i)=>{const d=D(it.docId);return '<div class="pkg-item"><span class="ix">'+(i+1)+'</span><span><a href="#/doc/'+d.id+'">'+esc(d.name)+'</a>'+adot(docNeeds(d))+' <span class="small muted">version '+it.versionNo+', '+(d.ownerId?uname(d.ownerId):"")+'</span>'+(d.audience==="Internal"?' <span class="tag">Internal</span>':"")+(d.contractsFlag?'<br><span class="small u-text-b-fg">Contracts: '+esc(d.contractsFlag)+'</span>':"")+'</span><span class="row">'+badge(d.status)+

   (cr&&p.status===PS.ICR?'<label class="check small u-m-0"><input type="checkbox" name="flag" data-chg="flag" data-id="'+p.id+'" value="'+d.id+'"'+((p.flags||[]).includes(d.id)?" checked":"")+'> Flag</label>':"")+'</span></div>';}).join("");
  const flagged=p.items.map(i=>D(i.docId)).filter(d=>d.status===DS.CR||d.contractsFlag);
  let acts="";
  if(ic){
    if(p.status===PS.COL){
      acts+='<button class="btn '+(p.tecApproved?'ghost':'')+'" data-act="tecApprove" data-id="'+p.id+'"'+dA(!p.tecApproved)+'>'+(p.tecApproved?'✓ TEC Approved':'TEC Approve')+dSR(!p.tecApproved)+'</button>';
      acts+='<button class="btn" data-act="sendCR" data-id="'+p.id+'"'+dA(has("sendCR:"+p.id))+'>Send for contracts review'+dSR(has("sendCR:"+p.id))+'</button>';
    }
    if(p.status===PS.CHG){
      acts+='<button class="btn" data-act="resendCR" data-id="'+p.id+'"'+dA(true)+'>Resubmit to contracts reviewer'+dSR(true)+'</button>';
      if(flagged.some(d=>d.status===DS.CR))acts+='<button class="btn ghost" data-act="reopenAll" data-id="'+p.id+'">Reopen flagged documents</button>';
    }
    if(p.status===PS.CLR){
      acts+='<button class="btn sec" data-act="resendCR" data-id="'+p.id+'">Resubmit to contracts reviewer</button>';
    }
  }
  const canExport=ic||cr||isPL(u,projOf(t))||isSPL(u,spOf(t));
  const tdSent=p.status===PS.TD,tdDue=has("sendTD:"+p.id);
  const tdConfirm=(ic&&(TD_READY.includes(p.status)||tdSent))?
    '<div class="td-confirm'+(tdDue?' due':'')+'"'+dA(tdDue)+'><label class="check u-m-0"><input type="checkbox" data-chg="sendTD" data-id="'+p.id+'"'+(tdSent?" checked":"")+'> <span>I have sent this package to Tender Division <span class="req">*</span>'+dSR(tdDue)+'</span></label>'+
    (tdSent?'<div class="small muted">Confirmed '+fmtDT(p.sentTdAt)+' by '+uname(p.sentTdBy)+'</div>':'<div class="small muted">Required to complete the tender.</div>')+'</div>':
    (tdSent?'<p class="small muted u-m-12-0-0">Sent to Tender Division '+fmtDT(p.sentTdAt)+' by '+uname(p.sentTdBy)+'</p>':'');
  const exp=canExport?'<div class="panel"><h3>Download</h3><div class="row"><button class="btn sec sm" data-act="exportPkg" data-id="'+p.id+'" data-f="docx">Word</button><button class="btn sec sm" data-act="exportPkg" data-id="'+p.id+'" data-f="pdf">PDF</button><button class="btn sec sm" data-act="exportPkg" data-id="'+p.id+'" data-f="zip">ZIP</button></div>'+tdConfirm+'</div>':"";
  const crPanel=cr&&p.status===PS.ICR?
   '<div class="panel"><h3>Outcome'+adot(has("crReview:"+p.id))+'</h3><div class="row"><button class="btn warn" data-act="requestChanges" data-id="'+p.id+'">Return back</button><button class="btn" data-act="clearPkg" data-id="'+p.id+'">Approve</button></div></div>':"";
  return '<div class="grid2"><div><div class="head u-mb-10"><div><h2 class="sec u-m-0">Package version '+p.version+'</h2><div class="row u-mt-6">'+badge(p.status)+'<span class="small muted">Collated '+fmtD(p.createdAt)+(p.submittedAt?", submitted to TEC "+fmtD(p.submittedAt):"")+'</span></div></div><div class="acts">'+acts+'</div></div>'+
   '<div class="list" id="pkgItems">'+items+'</div></div><div>'+crPanel+exp+'</div></div>';}
route("package",id=>{const p=PK(id),u=me();if(!p)return denied("This package doesn't exist.");const t=T(p.tenderId);if(!canSeeTender(u,t))return denied("You don't have access to this package.");
  return packageBreadcrumbs(p, t)+'<h1>'+esc(t.code+" "+t.title)+'</h1>'+pkgPanel(t);});
const crTeam=()=>S.users.filter(x=>isCR(x)&&x.status==="Active").map(x=>x.id);
ACT.tecApprove=el=>{const p=PK(el.dataset.id),t=T(p.tenderId);
  openModal({title:"TEC Approve "+t.code+"?",body:'<p>Record TEC approval for package v'+p.version+' ('+p.items.length+' documents) before sending to the contracts reviewer.</p>'+
   fld("Approval remarks (optional)",'<textarea name="n" id="ta1" placeholder="Add remarks or notes from the TEC panel..."></textarea>',"ta1"),submit:"TEC Approve",onSubmit:fd=>{
   const notes=fd.get("n").trim();p.tecApproved=true;p.reviews.push({by:S.me,stage:"TEC",outcome:"TEC Approved",at:Date.now(),notes});
   log(t,"TEC approved package v"+p.version+(notes?": "+notes:""));notify([t.icId],"TEC approved package v"+p.version+" on "+t.code+". Ready to send for contracts review.","#/package/"+p.id,"sendCR:"+p.id);
   save();rerender();toast("Package v"+p.version+" TEC approved");}});};
ACT.sendCR=el=>{const p=PK(el.dataset.id),t=T(p.tenderId);p.status=PS.ICR;p.createdAt=Date.now();log(t,"sent package v"+p.version+" for contracts review");notify(crTeam(),U(t.icId).name+" sent "+t.code+" "+t.title+" for contracts review","#/package/"+p.id,"crReview:"+p.id);rerender();toast("Sent to the contracts team");};
ACT.flag=el=>{const p=PK(el.dataset.id);p.flags=(p.flags||[]).filter(x=>x!==el.value);if(el.checked)p.flags.push(el.value);save();};
ACT.requestChanges=el=>{const p=PK(el.dataset.id),t=T(p.tenderId),ids=(p.flags||[]).slice();
  if(!ids.length){toast("Tick Flag on at least one document first");return;}
  openModal({title:"Return back "+t.code,body:ids.map(id=>fld(D(id).name,'<textarea name="c_'+id+'" id="rc'+id+'" placeholder="What needs to change"></textarea>',"rc"+id)).join(""),submit:"Return back",danger:true,onSubmit:fd=>{
   if(ids.some(id=>!fd.get("c_"+id).trim()))return "Add a comment for every flagged document.";
   ids.forEach(id=>{const d=D(id),c=fd.get("c_"+id).trim();d.status=DS.CR;d.contractsFlag=c;touchDoc(d);d.comments.push({id:uid("cm"),by:S.me,at:Date.now(),text:c,resolved:false,replies:[],contracts:true});notify([d.ownerId],"Contracts reviewer flagged "+d.name+": "+c,"#/doc/"+d.id);});
   p.flags=[];p.status=PS.CHG;p.reviews.push({by:S.me,stage:"Contracts review",outcome:"Returned",at:Date.now(),notes:ids.length+" documents flagged"});log(t,"returned package v"+p.version+" in contracts review ("+ids.length+" documents flagged)");
   notify([t.icId],"Contracts reviewer returned "+t.code+" ("+t.title+") for changes. You can revise and resubmit.","#/package/"+p.id,"resendCR:"+p.id);save();rerender();toast("Returned back. "+U(t.icId).name+" has been notified");}});};
ACT.clearPkg=el=>{const p=PK(el.dataset.id),t=T(p.tenderId);if((p.flags||[]).length){toast("Untick flagged documents, or click Return back instead");return;}

  openModal({title:"Approve "+t.code+"?",body:fld("Notes for the record",'<textarea name="n" id="cl1" placeholder="Optional notes..."></textarea>',"cl1"),submit:"Approve",onSubmit:fd=>{
   p.status=PS.CLR;p.reviews.push({by:S.me,stage:"Contracts review",outcome:"Approved",at:Date.now(),notes:fd.get("n").trim()});log(t,"approved package v"+p.version);notify([t.icId],"Contracts reviewer approved "+t.code+" ("+t.title+"). Download the package and send it to Tender Division.","#/package/"+p.id,"sendTD:"+p.id);save();rerender();toast("Approved");}});};
ACT.reopenAll=el=>{const p=PK(el.dataset.id),t=T(p.tenderId);p.items.map(i=>D(i.docId)).filter(d=>d.status===DS.CR).forEach(d=>{d.status=DS.DR;touchDoc(d);notify([d.ownerId],"Revise "+d.name+" for the contracts team. Re-approval is needed.","#/doc/"+d.id,"own:"+d.id);log(t,"reopened "+d.name+" for changes",d.id);});save();rerender();toast("Flagged documents reopened");};
ACT.resendCR=el=>{const p=PK(el.dataset.id),t=T(p.tenderId);p.flags=[];p.items.forEach(i=>{const d=D(i.docId);i.versionNo=d.versions.length;d.contractsFlag=null;});p.status=PS.ICR;log(t,"resubmitted package v"+p.version+" for contracts review");notify(crTeam(),U(t.icId).name+" resubmitted "+t.code+" ("+t.title+") for contracts review","#/package/"+p.id,"crReview:"+p.id);save();rerender();toast("Resubmitted to contracts reviewer");};
ACT.sendTD=el=>{const p=PK(el.dataset.id),t=T(p.tenderId);
  if(el.checked){p.prevStatus=p.status;p.status=PS.TD;p.sentTdAt=Date.now();p.sentTdBy=S.me;log(t,"confirmed package v"+p.version+" was sent to Tender Division");notify(["u-td",spOf(t).leadId].filter(Boolean),t.code+" "+t.title+" was sent to Tender Division","#/package/"+p.id);toast(t.code+" marked as sent to Tender Division");}
  else{p.status=p.prevStatus||PS.CLR;p.sentTdAt=null;p.sentTdBy=null;log(t,"undid the Tender Division confirmation for package v"+p.version);toast("Confirmation removed");}
  save();rerender();};

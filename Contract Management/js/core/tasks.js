/* Each person's to-do list, derived from the current state. */
import { DS, EDITABLE, PS, TD_READY, isApproved } from "./constants.js";
import { PR, T, U, me, pkgOf, reqDocs, spOf, tendersOf } from "./model.js";
import { canCreateProject, isAdmin, isCR, isIC, isPL, isSPL, isSuperiorOf, isTEC } from "./permissions.js";
import { docRag, tStatus } from "./progress.js";
import { S } from "./store.js";
import { dueTxt, rel, uname } from "../ui/format.js";

let ACTS=new Set();
export const refreshActs=()=>{ACTS=new Set(reqTasks(me()).map(t=>t.key));};
export const has=(...k)=>k.some(x=>ACTS.has(x));
export const cntActs=pre=>[...ACTS].filter(k=>pre.includes(k.split(":")[0])).length;
export const docNeeds=d=>[...ACTS].some(k=>/^(own|publish|comments|approve):/.test(k)&&k.split(":")[1]===d.id);
const ROLE_REQUIRED={"Project lead":["appointLead","addSp","firstProject"],"Sub-project lead":["createTenders","assignIC"],"Contract project IC":["assignSme","chooseDocs","assignOwner","collate","tecApprove","sendCR","resendCR","sendTD"],"SME":["publish","own"]};
export const reqTasks=u=>myTasks(u).filter(t=>!t.opt);
export function myTasks(u){
  const out=[],add=(key,what,ctx,link,status,r)=>out.push({key,what,ctx,link,status,r});
  S.docs.forEach(d=>{const t=T(d.tenderId);if(!t||t.manual)return;const tc=t.code+" "+t.title;
    if(d.ownerId===u.id){
      if(d.status===DS.NS)add("publish:"+d.id,"Start drafting "+d.name,tc+", "+dueTxt(d.due),"#/doc/"+d.id,d.status,docRag(d));
      else if(d.status===DS.DR){
        if(d.remarks){
          const lastAppr=d.approvals&&d.approvals.slice().reverse().find(a=>a.decision==="Returned");
          const supName=lastAppr?uname(lastAppr.approverId):(U(d.ownerId).superiorId?uname(U(d.ownerId).superiorId):"superior");
          add("own:"+d.id,"Revise "+d.name+" and send to "+supName+" for review",tc+(d.remarks?' — "'+d.remarks+'"':''),"#/doc/"+d.id,d.status,"b");
        } else {
          add("publish:"+d.id,"Finish "+d.name+" and send for approval",tc+", "+dueTxt(d.due),"#/doc/"+d.id,d.status,docRag(d));
        }
      }
      else if(d.status===DS.IR)add("own:"+d.id,"Send "+d.name+" for approval",tc+", "+dueTxt(d.due),"#/doc/"+d.id,d.status,docRag(d));
      else if(d.status===DS.RT){
        const lastAppr=d.approvals&&d.approvals.slice().reverse().find(a=>a.decision==="Returned");
        const supName=lastAppr?uname(lastAppr.approverId):(U(d.ownerId).superiorId?uname(U(d.ownerId).superiorId):"superior");
        add("own:"+d.id,"Revise "+d.name+" ("+supName+"'s remarks) and send for approval",tc+(d.remarks?' — "'+d.remarks+'"':''),"#/doc/"+d.id,d.status,"b");
      }
      const oc=d.comments.filter(c=>!c.resolved);
      if(oc.length&&EDITABLE.includes(d.status))add("comments:"+d.id,"Respond to "+oc.length+" open "+(oc.length===1?"comment":"comments")+" on "+d.name,tc,"#/doc/"+d.id,d.status,"g");}

    if(d.status===DS.PA&&isSuperiorOf(u,d.ownerId))add("approve:"+d.id,"Approve "+d.name,"From "+U(d.ownerId).name+", "+tc,"#/doc/"+d.id,d.status,"w");
  });
  S.tenders.forEach(t=>{if(!t||t.manual)return;const p=pkgOf(t),sp=spOf(t);
    if(isSPL(u,sp)){if(!t.icId)add("assignIC:"+t.id,"Assign a contract project IC to "+t.code,t.title,"#/tender/"+t.id+"/overview","Planned","w");
      else if(!t.tec.length)add("nominateTec:"+t.id,"Nominate the TEC for "+t.code,t.title,"#/tender/"+t.id+"/overview",tStatus(t),"g");}
    if(isIC(u,t)){const ds=reqDocs(t);
      if(!t.smes.length)add("assignSme:"+t.id,"Assign SMEs to "+t.code,t.title,"#/tender/"+t.id+"/team",tStatus(t),"g");
      else if(!ds.length)add("chooseDocs:"+t.id,"Create documents for "+t.code,t.title,"#/tender/"+t.id+"/documents",tStatus(t),"g");
      const un=ds.filter(d=>!d.ownerId&&!isApproved(d));if(un.length)add("assignOwner:"+t.id,"Assign an SME to "+un.length+(un.length===1?" document":" documents")+" on "+t.code,t.title,"#/tender/"+t.id+"/documents",tStatus(t),"w");

      if(!S.metrics.some(m=>m.tenderId===t.id))add("metrics:"+t.id,"Set success metrics for "+t.code,t.title,"#/tender/"+t.id+"/metrics",tStatus(t),"g");
      if(!p&&ds.length&&ds.every(isApproved))add("collate:"+t.id,"Collate the package for "+t.code,"All documents approved and ready to collate","#/tender/"+t.id+"/documents","Ready to collate","w");
      if(p&&p.status===PS.COL){
        if(!p.tecApproved)add("tecApprove:"+p.id,"TEC Approve "+t.code,"Package v"+p.version+" pending TEC approval","#/package/"+p.id,p.status,"w");
        add("sendCR:"+p.id,"Send "+t.code+" for contracts review","Package v"+p.version+(p.tecApproved?" (TEC approved)":""),"#/package/"+p.id,p.status,"g");
      }
      if(p&&p.status===PS.CHG)add("resendCR:"+p.id,"Resubmit "+t.code+" to contracts reviewer","Contracts reviewer returned package v"+p.version,"#/package/"+p.id,p.status,"b");
      if(p&&TD_READY.includes(p.status))add("sendTD:"+p.id,"Send "+t.code+" to Tender Division","Approved by the contracts team. Download the package and confirm it was sent","#/package/"+p.id,p.status,"w");}
    if(isCR(u)&&p){if(p.status===PS.ICR)add("crReview:"+p.id,"Review "+t.code+" "+t.title,"Package v"+p.version+" from "+U(t.icId).name,"#/package/"+p.id,p.status,"w");}
    if(p&&p.status===PS.TEC&&isTEC(u,t)&&!p.tecViews[u.id])add("tecRead:"+p.id,"Read "+t.code+" "+t.title,"Submitted "+rel(p.submittedAt),"#/tec/"+p.id,p.status,"w");
  });
  S.subprojects.forEach(sp=>{if(!sp)return;const pr=PR(sp.projectId);
    if(isPL(u,pr)&&!sp.leadId)add("appointLead:"+sp.id,"Appoint a lead for "+sp.name,pr.name,"#/project/"+sp.projectId,"Set up","w");
    if(isSPL(u,sp)&&!tendersOf(sp).length)add("createTenders:"+sp.id,"Create the list of tenders for "+sp.name,pr.name+". Add each contract this sub-project will tender.","#/search/"+sp.projectId+"/"+sp.id,"Set up","w");});
  S.projects.forEach(pr=>{if(!pr)return;if(isPL(u,pr)&&!S.subprojects.some(sp=>sp.projectId===pr.id))add("addSp:"+pr.id,"Add sub-projects to "+pr.code+" "+pr.name,"Break the master project into sub-projects","#/project/"+pr.id,pr.status,"w");});
  if(u.role==="Project lead"&&canCreateProject(u)&&!S.projects.some(p=>isPL(u,p)))add("firstProject","Create a master project","Start by setting up the master project","#/search","Set up","w");
  if(isAdmin(u))S.users.filter(x=>x.status==="Invited").forEach(x=>add("invite:"+x.id,"Invitation pending for "+x.name,x.email,"#/users","Invited","g"));
  out.forEach(t=>{const req=ROLE_REQUIRED[u.role];t.opt=!!req&&!req.includes(t.key.split(":")[0]);});
  const w={b:0,w:1,g:2};return out.sort((a,b)=>w[a.r]-w[b.r]);
}

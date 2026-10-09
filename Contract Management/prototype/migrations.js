/* Prototype only: upgrades browser data saved by earlier prototype versions. */
import { ROLE_OF } from "../js/core/constants.js";
import { S } from "../js/core/store.js";
import { ROLES } from "./role-switcher.js";
import { ago, seed } from "./sample-data.js";

function migratePastDocs(){
  if(!S.docs.some(d=>!d.tenderId&&!d.past&&!d.uploaded))return;
  const fresh=seed();
  S.docs.forEach(d=>{if(d.tenderId||d.past||d.uploaded)return;const f=fresh.docs.find(x=>x.id===d.id);if(!f||!f.past)return;
    d.past=f.past;
    if(d.versions.length===f.versions.length&&d.approvals.length===f.approvals.length){
      d.createdAt=f.createdAt;d.due=f.due;d.versions.forEach((v,i)=>{v.at=f.versions[i].at;});d.approvals.forEach((a,i)=>{a.at=f.approvals[i].at;});
      if(d.updatedBy===f.updatedBy)d.updatedAt=f.updatedAt;}});
}
export function migrate(){migratePastDocs();S.notes.forEach(n=>{if(n.fyi===undefined){n.fyi=false;n.done=true;}});S.tenders.forEach(t=>{t.manual=null;if(!t.ctype)t.ctype=({tn1:"Design and build",tn4:"Supply and install"})[t.id]||"Construct only";});S.projects.forEach(p=>{if(!p.createdAt)p.createdAt=p.start||Date.now();if(!p.updatedAt)p.updatedAt=ago(15);if(!p.updatedBy)p.updatedBy=p.leadId||"u-pl";});S.subprojects.forEach(sp=>{if(!sp.createdAt)sp.createdAt=Date.now();if(!sp.updatedAt)sp.updatedAt=ago(20);if(!sp.updatedBy)sp.updatedBy=sp.leadId||"u-spl";});S.docs.forEach(d=>{if(d.name==="Instructions to tenderers")d.name="Tender instructions";if(d.status==="In review")d.status="Published";if(d.status==="Not required")d.status=d.prevStatus||"Not started";d.comments.forEach(c=>{c.mustFix=false;});if(!d.createdAt)d.createdAt=ago(30);if(!d.updatedAt)d.updatedAt=ago(4);if(!d.updatedBy)d.updatedBy=d.ownerId||"u-ic";});if(S.catalogue){S.catalogue.forEach(k=>{if(k.name==="Instructions to tenderers")k.name="Tender instructions";});}S.users.forEach(u=>{if(!u.role||u.role==="Sub-project reviewer")u.role=ROLE_OF[u.id]||"SME";});if(S.me==="u-rev"||S.me==="u-tec"||S.me==="u-tec2"||S.me==="u-tec3"||!ROLES.some(r=>r.u===S.me)){S.me="u-ic";}const tn8=S.tenders.find(t=>t.id==="tn8");if(tn8&&tn8.icId==="u-ic")tn8.icId=null;const tn9=S.tenders.find(t=>t.id==="tn9");if(tn9&&tn9.icId==="u-ic")tn9.icId=null;const sp6=S.subprojects.find(sp=>sp.id==="sp6");if(sp6&&sp6.leadId==="u-spl")sp6.leadId="u-spl2";
  if(!S.users.some(u=>u.id==="u-td")){S.users.push({id:"u-td",name:"Oliver Smith",email:"oliver.smith@harbourline.example",companyId:"c1",teamId:"t-td",title:"Tender division",role:"Tender division",superiorId:null,sys:"user",creator:false,status:"Active"});}
  if(!S.teams.some(t=>t.id==="t-td")){S.teams.push({id:"t-td",companyId:"c1",name:"Tender division"});}
  if(S.activity){
    S.activity.forEach(act=>{
      if(act.tenderId){
        const t=S.tenders.find(x=>x.id===act.tenderId);
        if(t){
          if(!act.spId)act.spId=t.spId;
          if(!act.projectId){
            const sp=S.subprojects.find(x=>x.id===t.spId);
            if(sp)act.projectId=sp.projectId;
          }
        }
      } else if(act.spId&&!act.projectId){
        const sp=S.subprojects.find(x=>x.id===act.spId);
        if(sp)act.projectId=sp.projectId;
      }
    });
  }
}

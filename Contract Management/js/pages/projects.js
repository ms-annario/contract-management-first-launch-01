/* Master projects and sub-projects: forms, actions and pages. */
import { log, logProj, logSp, notify } from "../core/activity.js";
import { DEFAULT_DUR } from "../core/constants.js";
import { PR, SP, U, me, tendersOf, touchProj, touchSp } from "../core/model.js";
import { ACT, route } from "../core/registry.js";
import { denied, go, rerender } from "../core/router.js";
import { S, save, uid } from "../core/store.js";
import { GS_STATE, closeAllDd } from "./home/state.js";
import { RABORT, SUGG_DOCS } from "./tenders/ai-recommendations.js";
import { ABORT } from "./tenders/metrics-tab.js";
import { SUGG } from "./tenders/tender-page.js";
import { openModal, toast } from "../ui/feedback.js";
import { esc, fromISO, toISO } from "../ui/format.js";
import { fld, userOpts } from "../ui/markup.js";

/* ---------- Master projects and sub-projects ---------- */
export const splCandidates=()=>S.users.filter(x=>x.status==="Active"&&x.role==="Sub-project lead");
const projForm=p=>
  '<div class="row">'+
    '<div class="field u-flex-1 u-min-w-120"><label for="p2">Project code</label><input type="text" name="c" id="p2" maxlength="8" placeholder="e.g. NRE" value="'+esc(p?p.code:"")+'"></div>'+
    '<div class="field u-flex-2p5 u-min-w-200"><label for="p1">Project name</label><input type="text" name="n" id="p1" placeholder="e.g. Northshore Rail Extension" value="'+esc(p?p.name:"")+'"></div>'+
  '</div>'+
  fld("Description",'<textarea name="d" id="p6">'+esc(p&&p.desc||"")+'</textarea>',"p6")+
  fld("Target completion",'<input type="date" name="e" id="p5" value="'+(p&&p.end?toISO(p.end):"")+'">',"p5")+
  fld("Funding paper reference",'<input type="text" name="f" id="p7" placeholder="For example FP-2026-014" value="'+esc(p&&p.funding||"")+'">',"p7");
function readProj(fd,self){const n=fd.get("n").trim(),c=fd.get("c").trim().toUpperCase(),e=fromISO(fd.get("e"));
  if(!n||!c)return {err:"Enter a project name and code."};if(S.projects.some(p=>p.code===c&&p!==self))return {err:"That project code is already used."};
  return {v:{name:n,code:c,client:(self&&self.client)||(fd.get("cl")?fd.get("cl").trim():""),desc:fd.get("d").trim(),start:(self&&self.start)||Date.now(),end:e,funding:fd.get("f").trim()}};}
ACT.newProject=()=>openModal({title:"New master project",body:projForm(null),submit:"Create project",onSubmit:fd=>{const r=readProj(fd,null);if(r.err)return r.err;
  const p=Object.assign({id:uid("p"),leadId:S.me,status:"Active",createdAt:Date.now(),updatedAt:Date.now(),updatedBy:S.me,dur:DEFAULT_DUR.slice()},r.v);
  S.projects.push(p);
  logProj(p, "created master project "+p.code+" "+p.name);
  save();
  toast(p.name+" created");
  GS_STATE.pId = p.id;
  GS_STATE.spId = "";
  GS_STATE.tId = "";
  GS_STATE.docId = "";
  GS_STATE.query = "";
  closeAllDd();
  go("#/search/"+p.id);
}});
ACT.editProject=el=>{const p=PR(el.dataset.id);openModal({title:"Edit "+p.code+" "+p.name,body:projForm(p),submit:"Save changes",onSubmit:fd=>{const r=readProj(fd,p);if(r.err)return r.err;
  Object.assign(p,r.v);touchProj(p);logProj(p,"edited master project details");save();rerender();toast("Project details saved");}});};
ACT.delProject=el=>{
  const p=PR(el.dataset.id);
  if(!p) return;
  const sps=S.subprojects.filter(s=>s.projectId===p.id);
  const spIds=new Set(sps.map(s=>s.id));
  const ts=S.tenders.filter(t=>spIds.has(t.spId));
  const tIds=new Set(ts.map(t=>t.id));
  const docs=S.docs.filter(d=>tIds.has(d.tenderId));
  const docIds=new Set(docs.map(d=>d.id));

  let summaryHtml = '';
  if(sps.length || ts.length || docs.length){
    const items = [];
    if(sps.length) items.push('<b>'+sps.length+'</b> '+(sps.length===1?'sub-project':'sub-projects'));
    if(ts.length) items.push('<b>'+ts.length+'</b> '+(ts.length===1?'tender':'tenders'));
    if(docs.length) items.push('<b>'+docs.length+'</b> '+(docs.length===1?'document':'documents'));
    summaryHtml = '<div class="u-bg-sunk u-border-1-solid-rule u-rounded-8 u-p-12 u-m-12-0">'+
      '<p class="u-m-0-0-6 u-fs-13 u-fw-600 u-text-ink">This will also permanently delete:</p>'+
      '<ul class="u-m-0 u-pl-18 u-fs-13 u-text-ink-2 u-leading-1p6">'+
        items.map(it=>'<li>'+it+'</li>').join('')+
      '</ul>'+
    '</div>';
  } else {
    summaryHtml = '<p class="u-m-12-0 u-text-ink-2">This will permanently remove the master project.</p>';
  }

  openModal({
    title: "Delete "+p.code+" "+p.name+"?",
    danger: true,
    submit: "Delete project",
    body: '<p class="u-mt-0">Are you sure you want to delete <strong>'+esc(p.code+" "+p.name)+'</strong>?</p>'+
      summaryHtml,
    onSubmit: ()=>{
      const notifyUids = [...new Set([...sps.map(s=>s.leadId), ...ts.map(t=>t.icId)].filter(Boolean))];
      if(notifyUids.length){
        notify(notifyUids, p.code+" "+p.name+" was deleted by "+me().name, "#/home");
      }
      ts.forEach(t=>{
        delete SUGG_DOCS[t.id];
        delete SUGG[t.id];
        if(RABORT[t.id]){ try{ RABORT[t.id].abort(); }catch(e){} delete RABORT[t.id]; }
        if(ABORT[t.id]){ try{ ABORT[t.id].abort(); }catch(e){} delete ABORT[t.id]; }
      });
      S.docs = S.docs.filter(d=>!tIds.has(d.tenderId));
      S.packages = S.packages.filter(pk=>!tIds.has(pk.tenderId));
      S.metrics = S.metrics.filter(m=>!tIds.has(m.tenderId));
      S.activity = S.activity.filter(a=>a.projectId!==p.id && (!a.spId || !spIds.has(a.spId)) && (!a.tenderId || !tIds.has(a.tenderId)));
      S.notes = S.notes.filter(x=>{
        if(!x.link) return true;
        if(x.link.includes("/search/"+p.id) || x.link.includes("/project/"+p.id)) return false;
        if([...spIds].some(sid=>x.link.includes("/search/"+p.id+"/"+sid) || x.link.includes("/subproject/"+sid))) return false;
        if([...tIds].some(tid=>x.link.includes("/tender/"+tid) || x.link.includes("/"+tid))) return false;
        if([...docIds].some(did=>x.link.includes("/doc/"+did) || x.link.includes("/"+did))) return false;
        return true;
      });
      S.tenders = S.tenders.filter(t=>!spIds.has(t.spId));
      S.subprojects = S.subprojects.filter(s=>s.projectId!==p.id);
      S.projects = S.projects.filter(x=>x!==p);
      save();
      toast(p.name+" deleted");
      const nextH = (location.hash||"").startsWith("#/projects") ? "#/projects" : "#/search";
      GS_STATE.pId = ""; GS_STATE.spId = ""; GS_STATE.tId = ""; GS_STATE.docId = "";
      go(nextH);
    }
  });
};
route("project",id=>{
  const p=PR(id);
  if(!p) return denied("This master project doesn't exist.");
  GS_STATE.pId = p.id;
  GS_STATE.spId = "";
  GS_STATE.tId = "";
  GS_STATE.docId = "";
  GS_STATE.query = "";
  closeAllDd();
  go("#/search/"+p.id);
  return "";
});
route("subproject",id=>{
  const sp=SP(id);
  if(!sp) return denied("This sub-project doesn't exist.");
  GS_STATE.pId = sp.projectId;
  GS_STATE.spId = sp.id;
  GS_STATE.tId = "";
  GS_STATE.docId = "";
  GS_STATE.query = "";
  closeAllDd();
  go("#/search/"+sp.projectId+"/"+sp.id);
  return "";
});
const spForm=sp=>fld("Name",'<input type="text" name="n" id="s1" value="'+esc(sp?sp.name:"")+'">',"s1")+fld("Description",'<textarea name="d" id="s2">'+esc(sp&&sp.desc||"")+'</textarea>',"s2");
ACT.editSp=el=>{const sp=SP(el.dataset.id);openModal({title:"Edit "+sp.name,body:spForm(sp),submit:"Save changes",onSubmit:fd=>{const n=fd.get("n").trim();if(!n)return "Enter a name.";
  if(S.subprojects.some(x=>x!==sp&&x.projectId===sp.projectId&&x.name.toLowerCase()===n.toLowerCase()))return "Another sub-project in this project has that name.";
  sp.name=n;sp.desc=fd.get("d").trim();touchSp(sp);touchProj(PR(sp.projectId));logSp(sp,"edited sub-project details");save();rerender();toast("Sub-project details saved");}});};
ACT.delSp=el=>{const sp=SP(el.dataset.id),n=tendersOf(sp).length,pid=sp.projectId;
  if(n){openModal({title:"Can't delete "+sp.name,submit:null,body:'<p>'+esc(sp.name)+' has '+n+(n===1?" tender":" tenders")+'. Remove its tenders before deleting the sub-project.</p>'});return;}
  openModal({title:"Delete "+sp.name+"?",danger:true,submit:"Delete sub-project",body:'<p>This permanently removes the sub-project from '+esc(PR(pid).name)+'.</p>',onSubmit:()=>{
   notify([sp.leadId],sp.name+" was deleted by "+me().name,"#/home");S.subprojects=S.subprojects.filter(x=>x!==sp);save();toast(sp.name+" deleted");
   go("#/search/" + pid);}});};
ACT.setSpl=el=>{const sp=SP(el.dataset.id),prev=sp.leadId;if(!el.value)return;sp.leadId=el.value;touchSp(sp);touchProj(PR(sp.projectId));logSp(sp,"changed sub-project lead to "+U(el.value).name);save();notify([el.value],"You are now sub-project lead for "+sp.name,"#/search/"+sp.projectId+"/"+sp.id,"createTenders:"+sp.id);if(prev)notify([prev],"You are no longer lead of "+sp.name,"#/home");
  tendersOf(sp).forEach(t=>log(t,"changed sub-project lead to "+U(el.value).name));rerender();toast(U(el.value).name+" now leads "+sp.name);};
ACT.addSp=el=>openModal({title:"Add sub-project",body:spForm(null)+fld("Sub-project lead",'<select name="l" id="s3">'+userOpts(splCandidates(),null,"Assign later")+'</select>',"s3"),submit:"Add sub-project",onSubmit:fd=>{
  const n=fd.get("n").trim();if(!n)return "Enter a name.";const sp={id:uid("sp"),projectId:el.dataset.id,name:n,desc:fd.get("d").trim(),leadId:fd.get("l")||null,members:[],createdAt:Date.now(),updatedAt:Date.now(),updatedBy:S.me};S.subprojects.push(sp);touchProj(PR(el.dataset.id));logSp(sp,"created sub-project "+n);logProj(PR(el.dataset.id),"added sub-project "+n);save();
  if(sp.leadId)notify([sp.leadId],"You are now sub-project lead for "+n,"#/search/"+sp.projectId+"/"+sp.id,"createTenders:"+sp.id);rerender();toast(n+" added");}});

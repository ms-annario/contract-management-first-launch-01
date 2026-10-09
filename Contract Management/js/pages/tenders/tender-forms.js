/* Tender create/edit forms and actions. */
import { log, notify } from "../../core/activity.js";
import { PR, SP, T, docsOf, me, pkgOf, spOf, touchProj, touchSp } from "../../core/model.js";
import { isSPL } from "../../core/permissions.js";
import { ACT } from "../../core/registry.js";
import { go, rerender } from "../../core/router.js";
import { S, save, uid } from "../../core/store.js";
import { openModal, toast } from "../../ui/feedback.js";
import { esc } from "../../ui/format.js";
import { fld, opts } from "../../ui/markup.js";

/* ---------- Tenders ---------- */
const CONTRACT_TYPES=["Construct only","Design and build","Supply and install","Term contract","Consultancy"];
const tenderForm=(t, preSpId)=>{
  const u=me(), mySps=S.subprojects.filter(sp=>isSPL(u,sp));
  const targetSp = preSpId || (t ? t.spId : (mySps[0] && mySps[0].id));
  const spField = (!t && mySps.length > 1 && !preSpId) ?
    fld("Sub-project", '<select name="spId" id="n_sp">'+mySps.map(s=>'<option value="'+s.id+'"'+(s.id===targetSp?' selected':'')+'>'+esc(s.name)+'</option>').join("")+'</select>', "n_sp") :
    '<input type="hidden" name="spId" value="'+esc(targetSp||"")+'">';
  return spField +
    '<div class="row"><div class="field u-flex-1"><label for="n1">Contract number</label><input type="text" name="c" id="n1" placeholder="NRE-C04" value="'+esc(t?t.code:"")+'"></div><div class="field u-flex-2"><label for="n2">Title</label><input type="text" name="t" id="n2" value="'+esc(t?t.title:"")+'"></div></div>'+
    '<div class="row"><div class="field u-flex-1"><label for="n6">Contract type</label><select name="ct" id="n6">'+opts(CONTRACT_TYPES.map(x=>({v:x,l:x})),t&&t.ctype||"Construct only")+'</select></div><div class="field u-flex-1"><label for="n3">Procurement route</label><select name="r" id="n3">'+opts(["Open tender","Selective tender","Negotiated"].map(x=>({v:x,l:x})),t?t.route:"Open tender")+'</select></div></div>'+
    fld("Description",'<textarea name="s" id="n5">'+esc(t&&t.scope||"")+'</textarea>',"n5");
};
function readTender(fd,self){const c=fd.get("c").trim().toUpperCase(),t=fd.get("t").trim();if(!c||!t)return {err:"Enter a contract number and title."};
  if(S.tenders.some(x=>x.code===c&&x!==self))return {err:"That contract number already exists."};
  return {v:{code:c,title:t,ctype:fd.get("ct"),route:fd.get("r"),scope:fd.get("s").trim()}};}
ACT.newTender=el=>openModal({title:"New tender",body:tenderForm(null, el&&(el.dataset.id||el.dataset.sp)),submit:"Create tender",onSubmit:fd=>{const r=readTender(fd,null);if(r.err)return r.err;
  const targetSp = (el&&(el.dataset.id||el.dataset.sp)) || fd.get("spId") || (S.subprojects.find(s=>isSPL(me(),s))||{}).id;
  const tn=Object.assign({id:uid("tn"),spId:targetSp,createdAt:Date.now(),updatedAt:Date.now(),updatedBy:S.me,icId:null,smes:[],tec:[],manual:null},r.v);
  S.tenders.push(tn);touchSp(SP(targetSp));touchProj(PR(SP(targetSp).projectId));log(tn,"created the tender");save();rerender();toast(tn.code+" created as Planned");}});
ACT.editTender=el=>{const t=T(el.dataset.id);openModal({title:"Edit "+t.code,body:tenderForm(t),submit:"Save changes",onSubmit:fd=>{const r=readTender(fd,t);if(r.err)return r.err;
  Object.assign(t,r.v);t.updatedAt=Date.now();t.updatedBy=S.me;touchSp(spOf(t));touchProj(PR(spOf(t).projectId));log(t,"edited the tender details");save();rerender();toast("Tender details saved");}});};
ACT.delTender=el=>{const t=T(el.dataset.id),n=docsOf(t).length;
  if(n||pkgOf(t)){openModal({title:"Can't delete "+t.code,submit:null,body:'<p>'+esc(t.code+" "+t.title)+' already has '+n+(n===1?" document":" documents")+'. Tenders with work in progress can\'t be deleted.</p>'});return;}
  openModal({title:"Delete "+t.code+"?",danger:true,submit:"Delete tender",body:'<p>This permanently removes '+esc(t.code+" "+t.title)+' from '+esc(spOf(t).name)+'.</p>',onSubmit:()=>{
   notify([t.icId],t.code+" "+t.title+" was deleted by "+me().name,"#/home");S.metrics=S.metrics.filter(m=>m.tenderId!==t.id);S.activity=S.activity.filter(a=>a.tenderId!==t.id);
   const nextH = (location.hash||"").startsWith("#/search") && spOf(t) ? "#/search/" + spOf(t).projectId + "/" + spOf(t).id : "#/board";
   S.notes=S.notes.filter(x=>!x.link.includes("/tender/"+t.id+"/"));S.tenders=S.tenders.filter(x=>x!==t);save();toast(t.code+" deleted");go(nextH);}});};

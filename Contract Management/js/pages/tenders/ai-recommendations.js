/* AI document recommendations for a tender. */
import { log } from "../../core/activity.js";
import { DS, STAGES } from "../../core/constants.js";
import { sampleHtml } from "../../core/document-templates.js";
import { T, byId, docsOf } from "../../core/model.js";
import { plannedDates } from "../../core/progress.js";
import { ACT } from "../../core/registry.js";
import { rerender } from "../../core/router.js";
import { S, uid } from "../../core/store.js";
import { has } from "../../core/tasks.js";
import { cap } from "../../features/export/libraries.js";
import { toast } from "../../ui/feedback.js";
import { esc } from "../../ui/format.js";
import { dA } from "../../ui/markup.js";

/* ---------- AI document recommendations ---------- */
const PAST_TENDERS=[
 {code:"WKR-C11",title:"Elevated walkway",ctype:"Design and build",route:"Open tender",scope:"elevated pedestrian walkway steel structure lifts foundations",docs:["k1","k2","k3","k4","k5","k6","k7","k8","k9","k10","k11","k15","k16"]},
 {code:"ELX-C04",title:"Bridge widening",ctype:"Construct only",route:"Open tender",scope:"bridge widening piling deck traffic management utilities",docs:["k1","k2","k3","k4","k5","k6","k7","k8","k9","k10","k12","k13","k15","k16"]},
 {code:"SKY-C02",title:"Viaduct section 2",ctype:"Design and build",route:"Open tender",scope:"viaduct bored piles precast segments drainage utilities",docs:["k1","k2","k3","k4","k5","k6","k7","k8","k9","k10","k11","k12","k13","k14","k15","k16"]},
 {code:"DPT-C01",title:"Bus depot",ctype:"Construct only",route:"Selective tender",scope:"depot earthworks drainage ground improvement building",docs:["k2","k4","k5","k6","k7","k8","k10","k13","k15","k16"]},
 {code:"STN-F03",title:"Station finishes",ctype:"Supply and install",route:"Open tender",scope:"station finishes signage glazing panels installation",docs:["k1","k2","k3","k4","k5","k7","k8","k10","k14","k15","k16"]},
 {code:"NBR-S01",title:"Noise barrier retrofit",ctype:"Supply and install",route:"Open tender",scope:"transparent noise barriers viaduct parapet panels installation",docs:["k1","k2","k3","k4","k5","k7","k8","k9","k10","k11","k14","k15","k16"]}];
export const SUGG_DOCS={},REJECTED={};
const words=x=>new Set(String(x||"").toLowerCase().split(/[^a-z]+/).filter(w=>w.length>3));
function similarTenders(t){const w=words(t.title+" "+t.scope);return PAST_TENDERS.map(p=>{let sc=(p.ctype===t.ctype?3:0)+(p.route===t.route?1:0);words(p.title+" "+p.scope).forEach(x=>{if(w.has(x))sc+=2;});return {p,sc};}).sort((a,b)=>b.sc-a.sc).slice(0,3).filter(x=>x.sc>0).map(x=>x.p);}
function recAvail(t){const have=docsOf(t).map(d=>d.catId),rej=REJECTED[t.id]||[];return S.catalogue.filter(k=>!have.includes(k.id)&&!rej.includes(k.id));}
function localRecs(t){const sim=similarTenders(t),av=recAvail(t);
  const items=av.map(k=>{const used=sim.filter(p=>p.docs.includes(k.id));return {k,used};}).filter(x=>x.k.required||x.used.length*2>=sim.length&&x.used.length>0)
   .map(x=>({catId:x.k.id,reason:x.used.length?"Used in "+x.used.length+" of "+sim.length+" similar past tenders ("+x.used.map(p=>p.code).join(", ")+")"+(x.k.required?". Required by default.":"."):"Required by default for every tender."}));
  return {source:"Rule-based",summary:(t.ctype||"Tender")+", "+t.route.toLowerCase()+". Compared with "+sim.length+" similar past "+(sim.length===1?"tender":"tenders")+".",similar:sim.map(p=>p.code),items};}
/* Sparkle mark for AI-assisted features */
const AI_SPARK='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z"></path></svg>';
export function recPanel(t){const sg=SUGG_DOCS[t.id];
  if(!sg)return '<div class="panel u-mb-16"><div class="row u-justify-between"><div><h3 class="ai-head u-m-0">Recommended documents</h3><p class="small muted u-m-4-0-0">AI reads this tender\'s type and scope, compares it with similar past tenders and suggests the documents it needs.</p></div><button class="btn sec" data-act="recDocs" data-id="'+t.id+'"'+dA(has("chooseDocs:"+t.id))+'><span class="ai-btn-ico">'+AI_SPARK+'</span>Recommend me</button></div></div>';
  if(sg.loading)return '<div class="panel u-mb-16"><h3 class="ai-head u-m-0-0-6">Recommended documents</h3><p>Understanding '+esc(t.code)+' and reviewing similar past tenders...</p><button class="btn ghost sm" data-act="stopRec" data-id="'+t.id+'">Stop</button></div>';
  if(sg.error)return '<div class="panel u-mb-16"><h3 class="ai-head u-m-0-0-6">Recommended documents</h3><p class="small muted u-m-0-0-10">'+esc(sg.error)+'</p><button class="btn sec sm" data-act="recDocs" data-id="'+t.id+'">Try again</button></div>';
  const items=sg.items.map(x=>({x,k:byId(S.catalogue,x.catId)})).filter(o=>o.k&&recAvail(t).includes(o.k));
  return '<div class="panel u-mb-16"><div class="row u-justify-between"><h3 class="ai-head u-m-0">Recommended documents <span class="tag">'+esc(sg.source)+'</span></h3><div class="row">'+(items.length>1?'<button class="btn sec sm" data-act="recAll" data-id="'+t.id+'">Accept all '+items.length+'</button>':"")+'<button class="btn ghost sm" data-act="recClose" data-id="'+t.id+'">Close</button></div></div>'+
   '<p class="small u-m-8-0-4"><b>This tender:</b> '+esc(sg.summary)+'</p>'+(sg.similar&&sg.similar.length?'<p class="small muted u-m-0-0-6">Similar past tenders: '+sg.similar.map(c=>{const p=PAST_TENDERS.find(x=>x.code===c);return esc(c+(p?" "+p.title:""));}).join(", ")+'</p>':"")+
   (items.length?items.map(({x,k})=>'<div class="metric"><span><b>'+esc(k.name)+'</b> <span class="tag">'+esc(k.spec)+'</span>'+(k.audience==="Internal"?' <span class="tag">Internal</span>':"")+'<span class="why u-d-block">'+esc(x.reason)+'</span></span><span class="row"><button class="btn sm" data-act="recAccept" data-id="'+t.id+'" data-k="'+k.id+'">Accept</button><button class="btn ghost sm" data-act="recReject" data-id="'+t.id+'" data-k="'+k.id+'">Reject</button></span></div>').join(""):'<p class="muted small u-m-10-0-0">All suggestions handled. Accepted documents are in the list below, ready for SME assignment.</p>')+'</div>';}
function acceptRec(t,kid){const k=byId(S.catalogue,kid),html=k.spec==="General"?sampleHtml(k.name,t):"<h3>1. Scope</h3><p></p><h3>2. Requirements</h3><p></p><h3>3. Interfaces</h3><p></p>";
  S.docs.push({id:uid("d"),tenderId:t.id,catId:k.id,name:k.name,spec:k.spec,audience:k.audience,ownerId:null,due:plannedDates(t)[STAGES.indexOf("Drafting")],status:DS.NS,html,versions:[],comments:[],approvals:[],remarks:null,contractsFlag:null,createdAt:Date.now(),updatedAt:Date.now(),updatedBy:S.me});}
ACT.recAccept=el=>{const t=T(el.dataset.id),k=byId(S.catalogue,el.dataset.k);acceptRec(t,k.id);log(t,"accepted the AI recommendation for "+k.name);rerender();toast(k.name+" added. Assign an SME below");};
ACT.recReject=el=>{const t=T(el.dataset.id);(REJECTED[t.id]=REJECTED[t.id]||[]).push(el.dataset.k);rerender();};
ACT.recAll=el=>{const t=T(el.dataset.id),items=SUGG_DOCS[t.id].items.filter(x=>recAvail(t).some(k=>k.id===x.catId));items.forEach(x=>acceptRec(t,x.catId));log(t,"accepted "+items.length+" AI document recommendations");rerender();toast(items.length+" documents added. Assign SMEs below");};
ACT.recClose=el=>{delete SUGG_DOCS[el.dataset.id];rerender();};
export const RABORT={};
ACT.stopRec=el=>{const c=RABORT[el.dataset.id];if(c)c.abort();};
ACT.recDocs=async el=>{const t=T(el.dataset.id),av=recAvail(t),sim=similarTenders(t);
  if(!av.length){toast("Every catalogue document is already on this tender");return;}
  SUGG_DOCS[t.id]={loading:true};rerender();
  const sample=await cap("sample");if(!sample){SUGG_DOCS[t.id]=localRecs(t);rerender();toast("AI isn't available in this view, so these come from matching past tenders");return;}
  const ctl=new AbortController();RABORT[t.id]=ctl;
  const prompt="You help a contract project IC decide which documents a construction tender needs.\n\nCurrent tender: "+t.code+" "+t.title+"\nContract type: "+(t.ctype||"unknown")+"\nProcurement route: "+t.route+"\nScope: "+(t.scope||"not given")+
   "\nDocuments already on the tender: "+(docsOf(t).map(d=>d.name).join("; ")||"none")+
   "\n\nSimilar past tenders and the documents they used:\n"+sim.map(p=>"- "+p.code+" "+p.title+" ("+p.ctype+", "+p.route+"): "+p.docs.map(id=>(byId(S.catalogue,id)||{}).name).filter(Boolean).join("; ")).join("\n")+
   "\n\nDocument catalogue you may choose from (id: name, spec type, audience, required by default):\n"+av.map(k=>k.id+": "+k.name+", "+k.spec+", "+k.audience+(k.required?", required":"")).join("\n")+
   "\n\nUnderstand the nature of the current tender, use the past tenders as evidence, and recommend the catalogue documents it needs. Respond with only JSON: {\"summary\":\"one sentence describing the nature of this tender\",\"documents\":[{\"id\":\"catalogue id\",\"reason\":\"one sentence under 25 words citing the past tenders or scope\"}]}";
  try{const r=await sample.json(prompt,{signal:ctl.signal,modelTier:"quick"});const ids=new Set(av.map(k=>k.id));
    const items=(r&&Array.isArray(r.documents)?r.documents:[]).filter(x=>x&&ids.has(x.id)).map(x=>({catId:x.id,reason:String(x.reason||"")}));
    if(!items.length)throw {code:"invalid_json"};SUGG_DOCS[t.id]={source:"AI suggested",summary:String(r.summary||""),similar:sim.map(p=>p.code),items};rerender();}
  catch(e){if(e&&e.code==="cancelled"){delete SUGG_DOCS[t.id];rerender();return;}
    if(e&&e.code==="not_granted"){SUGG_DOCS[t.id]=localRecs(t);rerender();toast("AI wasn't allowed, so these come from matching past tenders");return;}
    SUGG_DOCS[t.id]={error:e&&e.code==="rate_limited"?"Too many requests right now. Wait a minute and try again.":"Couldn't get recommendations this time. Try again, or add documents yourself."};rerender();}
  finally{delete RABORT[t.id];}};

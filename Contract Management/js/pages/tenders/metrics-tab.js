/* Success metrics tab and AI metric suggestions. */
import { log } from "../../core/activity.js";
import { T, me } from "../../core/model.js";
import { isIC } from "../../core/permissions.js";
import { ACT } from "../../core/registry.js";
import { rerender } from "../../core/router.js";
import { S, uid } from "../../core/store.js";
import { has } from "../../core/tasks.js";
import { cap } from "../../features/export/libraries.js";
import { SUGG } from "./tender-page.js";
import { openModal, toast } from "../../ui/feedback.js";
import { esc } from "../../ui/format.js";
import { dA, dSR, fld } from "../../ui/markup.js";

export function tMetrics(t){const u=me(),ic=isIC(u,t)&&!t.manual,ms=S.metrics.filter(m=>m.tenderId===t.id),sg=SUGG[t.id],hist=S.history.filter(h=>h.route===t.route);
  return '<div class="grid2"><div><div class="head"><div><h2 class="sec u-mt-0">Success metrics</h2></div><div class="acts">'+(ic?'<button class="btn sec" data-act="addMetric" data-id="'+t.id+'">Add metric</button><button class="btn" data-act="suggest" data-id="'+t.id+'" id="sugBtn"'+dA(has("metrics:"+t.id))+'>Suggest metrics'+dSR(has("metrics:"+t.id))+'</button>':"")+'</div></div>'+
  (ms.length?'<div class="list u-p-0-16">'+ms.map(m=>'<div class="metric"><span><b>'+esc(m.metric)+'</b><span class="why">Target: '+esc(m.target)+'</span></span><span class="row">'+(ic?'<button class="link small" data-act="delMetric" data-id="'+m.id+'">Remove</button>':"")+'</span></div>').join("")+'</div>':'<div class="empty">No metrics accepted yet.</div>')+
  '<div id="sugOut">'+(sg?sugHtml(t,sg):"")+'</div></div>'+
  '<div class="panel"><h3>Past metrics</h3>'+(hist.length?hist.map(h=>'<div class="metric"><span><b>'+esc(h.metric)+'</b><span class="why">'+esc(h.tender)+'. Target '+esc(h.target)+', actual '+esc(h.actual)+'</span></span>'+(ic?'<button class="btn ghost sm" data-act="useHist" data-id="'+t.id+'" data-i="'+S.history.indexOf(h)+'">Use</button>':"")+'</div>').join(""):'<p class="muted">No similar tenders yet.</p>')+'</div></div>';}
function sugHtml(t,sg){if(sg.loading)return '<div class="panel u-mt-14"><p>Thinking about metrics for '+esc(t.code)+'...</p><button class="btn ghost sm" data-act="stopSuggest" data-id="'+t.id+'">Stop</button></div>';
  if(sg.error)return '<p class="small muted u-mt-14">'+esc(sg.error)+'</p>';
  return '<div class="panel u-mt-14"><h3>Suggestions <span class="tag">'+esc(sg.source)+'</span></h3><p class="small muted">Nothing is saved until you accept it. Edit the target first if needed.</p>'+sg.items.map((s,i)=>'<div class="metric"><span><b>'+esc(s.metric)+'</b><span class="why">'+esc(s.rationale||"")+'</span><input type="text" value="'+esc(s.target)+'" id="sgT'+i+'" aria-label="Target for '+esc(s.metric)+'" class="u-mt-6"></span><span class="row"><button class="btn sm" data-act="acceptSug" data-id="'+t.id+'" data-i="'+i+'">Accept</button><button class="btn ghost sm" data-act="rejectSug" data-id="'+t.id+'" data-i="'+i+'">Reject</button></span></div>').join("")+'</div>';}
ACT.addMetric=el=>openModal({title:"Add success metric",body:fld("Metric",'<input type="text" name="m" id="am1">',"am1")+fld("Target",'<input type="text" name="t" id="am2">',"am2"),onSubmit:fd=>{const m=fd.get("m").trim(),tg=fd.get("t").trim();if(!m||!tg)return "Enter a metric and target.";S.metrics.push({id:uid("m"),tenderId:el.dataset.id,metric:m,target:tg,source:"Manual"});const t=T(el.dataset.id);log(t,"added success metric "+m);rerender();}});
ACT.delMetric=el=>{S.metrics=S.metrics.filter(m=>m.id!==el.dataset.id);rerender();};
ACT.useHist=el=>{const h=S.history[+el.dataset.i];openModal({title:"Use past metric",body:'<p><b>'+esc(h.metric)+'</b><br><span class="small muted">'+esc(h.tender)+' achieved '+esc(h.actual)+'</span></p>'+fld("Target for this tender",'<input type="text" name="t" id="uh1" value="'+esc(h.target)+'">',"uh1"),submit:"Accept metric",onSubmit:fd=>{
  S.metrics.push({id:uid("m"),tenderId:el.dataset.id,metric:h.metric,target:fd.get("t").trim()||h.target,source:"Historical"});const t=T(el.dataset.id);log(t,"accepted historical metric "+h.metric);rerender();toast("Metric accepted");}});};
ACT.acceptSug=el=>{const t=T(el.dataset.id),sg=SUGG[t.id],i=+el.dataset.i,s=sg.items[i],tg=(document.getElementById("sgT"+i)||{}).value||s.target;
  S.metrics.push({id:uid("m"),tenderId:t.id,metric:s.metric,target:tg,source:sg.source==="AI suggested"?"AI":"Template"});sg.items.splice(i,1);if(!sg.items.length)delete SUGG[t.id];log(t,"accepted success metric "+s.metric);rerender();toast("Metric accepted");};
ACT.rejectSug=el=>{const sg=SUGG[el.dataset.id];sg.items.splice(+el.dataset.i,1);if(!sg.items.length)delete SUGG[el.dataset.id];rerender();};
const TEMPLATE_METRICS=[
 {metric:"Programme adherence on key dates",target:"95% of key dates met",rationale:"Tracks whether the contractor keeps the critical path on schedule."},
 {metric:"Cost growth from award to final account",target:"Under 8% of the tender sum",rationale:"Shows how well scope and risk were priced at tender."},
 {metric:"Lost-time injury frequency rate",target:"Below 0.2 per 100,000 hours",rationale:"A standard lagging safety measure for heavy civil works."},
 {metric:"Non-conformance reports closed within 14 days",target:"90% of reports",rationale:"Indicates how quickly quality problems are fixed."},
 {metric:"Community complaints per month",target:"Fewer than 5",rationale:"Captures the impact of works on neighbours and traffic."},
 {metric:"Open defects at substantial completion",target:"Fewer than 50 items",rationale:"Measures build quality at handover."}];
export const ABORT={};
ACT.stopSuggest=el=>{const c=ABORT[el.dataset.id];if(c)c.abort();};
ACT.suggest=async el=>{const t=T(el.dataset.id),have=S.metrics.filter(m=>m.tenderId===t.id).map(m=>m.metric.toLowerCase());
  const fallback=msg=>{SUGG[t.id]={source:"Template suggestions",items:TEMPLATE_METRICS.filter(m=>!have.includes(m.metric.toLowerCase())).map(m=>({...m}))};rerender();if(msg)toast(msg);};
  if(!t.scope||t.scope.split(/\s+/).length<8){toast("Add a scope description of at least a sentence to get useful suggestions");return;}
  SUGG[t.id]={loading:true};rerender();
  const sample=await cap("sample");if(!sample){fallback("AI isn't available in this view, so these are template suggestions");return;}
  const ctl=new AbortController();ABORT[t.id]=ctl;
  const prompt="You are helping a contract project IC prepare a construction tender. Suggest 6 measurable success metrics for judging this contract after award.\n\nTender: "+t.code+" "+t.title+"\nProcurement route: "+t.route+"\nScope: "+t.scope+"\nAlready accepted (do not repeat): "+(have.join("; ")||"none")+
   "\n\nRespond with only a JSON array of 6 objects with keys: metric (under 8 words), target (specific and measurable, under 12 words), rationale (one sentence under 25 words).";
  try{const r=await sample.json(prompt,{signal:ctl.signal,modelTier:"quick"});
    const items=(Array.isArray(r)?r:[]).filter(x=>x&&typeof x.metric==="string"&&typeof x.target==="string").slice(0,8).map(x=>({metric:x.metric,target:x.target,rationale:String(x.rationale||"")}));
    if(!items.length)throw {code:"invalid_json"};SUGG[t.id]={source:"AI suggested",items};rerender();}
  catch(e){if(e&&e.code==="cancelled"){delete SUGG[t.id];rerender();return;}
    if(e&&e.code==="not_granted"){fallback("AI suggestions weren't allowed, so these are template suggestions");return;}
    SUGG[t.id]={error:e&&e.code==="rate_limited"?"Too many requests right now. Wait a minute and try again.":"Couldn't get suggestions this time. Try again, or add metrics manually."};rerender();}
  finally{delete ABORT[t.id];}};

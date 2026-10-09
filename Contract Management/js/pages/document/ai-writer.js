/* AI writing assistant for documents. */
import { D, T } from "../../core/model.js";
import { ACT } from "../../core/registry.js";
import { rerender } from "../../core/router.js";
import { S, save } from "../../core/store.js";
import { snapshot } from "./document-page.js";
import { openModal, toast } from "../../ui/feedback.js";
import { esc } from "../../ui/format.js";
import { fld } from "../../ui/markup.js";

function getAiDocMock(d, t, task){
  const name = d ? d.name : "Document";
  const tCode = t ? t.code : "NRE-C03";
  const tTitle = t ? t.title : "Tender";
  const scope = t && t.scope ? t.scope : "the works described in the tender drawings and specification schedule";

  if(task === "expand"){
    return '<h3>2. Technical Specifications & Requirements</h3>' +
      '<p>The Contractor shall execute the works for <b>' + esc(tCode + ' ' + tTitle) + '</b> in strict conformance with the following performance benchmarks:</p>' +
      '<ul>' +
        '<li><b>Material Standards:</b> All components shall be certified to current British/European Standards and supplied with mill test certificates prior to installation.</li>' +
        '<li><b>Durability & Performance:</b> Systems shall possess a design service life of not less than 30 years under designated environmental exposure conditions.</li>' +
        '<li><b>Site Coordination:</b> The Contractor shall liaise directly with the systems contractor and statutory undertakers for interface clearances.</li>' +
        '<li><b>Quality Assurance:</b> An Inspection and Test Plan (ITP) shall be submitted within 14 days of contract award.</li>' +
      '</ul>';
  }

  if(task === "compliance"){
    return '<h3>3. Testing, Verification & Compliance Criteria</h3>' +
      '<ol>' +
        '<li><b>Independent Testing:</b> Acoustic attenuation and structural load testing shall be performed by an accredited independent testing facility.</li>' +
        '<li><b>Sample Mock-ups:</b> A 1:1 scale mock-up of the barrier assembly shall be submitted to the Contract Project IC for aesthetic and technical clearance.</li>' +
        '<li><b>Non-Conformance Procedure:</b> Any component exhibiting manufacturing defects or damage during transit shall be quarantined immediately.</li>' +
        '<li><b>Handover Documentation:</b> Final acceptance is contingent on delivery of As-Built drawings, manufacturer warranties, and O&M manuals.</li>' +
      '</ol>';
  }

  if(task === "polish"){
    return '<h3>1. Purpose & Scope</h3>' +
      '<p>This document sets out the contractual and technical requirements for the procurement, fabrication, delivery, and installation of works associated with <b>' + esc(tCode + ' ' + tTitle) + '</b>.</p>' +
      '<p>The appointed Contractor shall carry out the works in rigorous compliance with the Particular Specification, statutory planning conditions, and the employer requirements.</p>';
  }

  return '<h3>1. Purpose & Scope</h3>' +
    '<p>This document defines the requirements and specifications for <b>' + esc(name) + '</b> under tender package <b>' + esc(tCode + ' ' + tTitle) + '</b>.</p>' +
    '<p><b>Scope of Works:</b> ' + esc(scope) + '</p>' +
    '<h3>2. Key Requirements & Deliverables</h3>' +
    '<ul>' +
      '<li>Supply, delivery, offloading, and on-site erection of all specified modular units and ancillary fixings.</li>' +
      '<li>Execution of pre-installation structural surveys, geotechnical verification, and alignment inspections.</li>' +
      '<li>Full interface coordination with ongoing civil engineering and permanent way infrastructure.</li>' +
      '<li>Adherence to Environmental Protection Guidelines, acoustic decibel mitigation criteria, and site safety rules.</li>' +
    '</ul>' +
    '<h3>3. Compliance & Quality Assurance</h3>' +
    '<ol>' +
      '<li>Submit a project-specific Quality Plan and Inspection & Test Plan (ITP) for IC review before off-site fabrication.</li>' +
      '<li>Provide manufacturer warranties guaranteeing minimum 30-year corrosion protection and acoustic integrity.</li>' +
      '<li>Conduct all field verification testing witnessed by the nominated contract supervisor.</li>' +
    '</ol>';
}
ACT.aiWriteAssist=el=>{
  const d=D(el.dataset.id);if(!d)return;
  const t=T(d.tenderId);
  const sample1=getAiDocMock(d, t, "draft");
  openModal({
    title:"AI Writing Assistant",
    wide:true,
    body:''+
      fld("Writing task",'<select name="task" id="aiTask"><option value="draft">Draft complete structure & clauses (Recommended)</option><option value="expand">Expand technical requirements & specifications</option><option value="compliance">Add testing, verification & compliance criteria</option><option value="polish">Refine & formalize contract wording</option></select>',"aiTask")+
      fld("Custom instructions (optional)",'<textarea name="prompt" id="aiPrompt" rows="2" placeholder="e.g. Include BS EN acoustic standards, durability warranty, modular assembly criteria..."></textarea>',"aiPrompt")+
      fld("How to apply",'<select name="mode" id="aiMode"><option value="replace">Replace current editor content</option><option value="append">Append to existing content</option></select>',"aiMode")+
      '<div class="u-bg-sunk u-border-1-solid-rule u-rounded-6 u-p-12 u-mt-12">'+
        '<div class="u-d-flex u-items-center u-justify-between u-mb-6">'+
          '<span class="u-fw-600 u-fs-12 u-text-ink-2 u-case-upper u-tracking-0p04em">AI Generated Preview</span>'+
          '<span class="badge a u-fs-11">AI Suggestion</span>'+
        '</div>'+
        '<div id="aiPreviewBox" class="u-fs-13p5 u-leading-1p5 u-max-h-160 u-overflow-y-auto u-text-ink u-bg-surface u-p-10 u-rounded-4 u-border-1-solid-rule">'+sample1+'</div>'+
      '</div>',
    submit:"Insert into document",
    onSubmit:fd=>{
      const task=fd.get("task")||"draft";
      const mode=fd.get("mode")||"replace";
      const generated=getAiDocMock(d, t, task);
      const ed=document.getElementById("editor");
      if(ed){
        if(mode==="append"){
          ed.innerHTML = (ed.innerHTML.trim() ? ed.innerHTML + '<br>' : '') + generated;
        }else{
          ed.innerHTML = generated;
        }
        ed.dispatchEvent(new Event("input"));
      }else{
        d.html = mode==="append" ? (d.html + generated) : generated;
        d.updatedAt = Date.now();
        d.updatedBy = S.me;
        snapshot(d,"AI assisted draft");
        save();
        rerender();
      }
      toast("AI text inserted. Review and click Save.");
    }
  });

  const sel=document.getElementById("aiTask");
  const pBox=document.getElementById("aiPreviewBox");
  if(sel&&pBox){
    sel.addEventListener("change",()=>{
      pBox.innerHTML=getAiDocMock(d, t, sel.value);
    });
  }
};

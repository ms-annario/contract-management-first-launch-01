/* Home page detail panels for projects, sub-projects, tenders and documents. */
import { DOC_LOCKED, DS } from "../../core/constants.js";
import { PR, T, U, lastUpd, me, pkgOf, spOf, tendersOf } from "../../core/model.js";
import { canComment, canCreateProject, canEditDoc, canSeeDoc, isAdmin, isPL, isProjectLeadUser, isSPL, userRelatesToProject, userRelatesToSubproject, userRelatesToTender } from "../../core/permissions.js";
import { projectInsight, projectPct, projectPrepStatus, tStatus } from "../../core/progress.js";
import { afterRender } from "../../core/router.js";
import { S } from "../../core/store.js";
import { has } from "../../core/tasks.js";
import { docRemarkRows } from "../document/document-details.js";
import { bindEditor, docActivity, docActs } from "../document/document-page.js";
import { GS_STATE } from "./state.js";
import { splCandidates } from "../projects.js";
import { tDocs } from "../tenders/documents-tab.js";
import { tMetrics } from "../tenders/metrics-tab.js";
import { pkgPanel } from "../tenders/package.js";
import { tTeam } from "../tenders/team-tab.js";
import { TABS, tActivity, tOverview, tabNeeds } from "../tenders/tender-page.js";
import { feed } from "../../ui/activity-feed.js";
import { esc, fmtD, fmtDT, rel, uname } from "../../ui/format.js";
import { adot, badge, dA, dSR, updTxtTender, userOpts } from "../../ui/markup.js";

export function renderGsProjectDetails(p){
  const u = me();
  const isProjLead = isProjectLeadUser(u);
  if(!isProjLead && !userRelatesToProject(u, p)){
    return '<div class="panel muted u-p-28-20 u-text-center"><h3 class="u-m-0-0-6">Access Restricted</h3><p class="u-m-0 u-fs-13p5">You are not assigned to this master project and cannot view its details.</p></div>';
  }
  const canManage = isPL(u, p) || isAdmin(u) || canCreateProject(u);
  let sps = S.subprojects.filter(s => s.projectId === p.id);
  if(!isProjLead){
    sps = sps.filter(sp => userRelatesToSubproject(u, sp));
  }
  let ts = S.tenders.filter(t => sps.some(s => s.id === t.spId));
  if(!isProjLead){
    ts = ts.filter(t => userRelatesToTender(u, t));
  }
  const cands = splCandidates();
  const rows = sps.map(sp => {
    const leadCell = canManage ?
      '<span class="sel-dot"'+dA(has("appointLead:"+sp.id))+'><select data-chg="setSpl" data-id="'+sp.id+'" aria-label="Lead for '+esc(sp.name)+'">'+userOpts(cands.concat(sp.leadId&&!cands.some(c=>c.id===sp.leadId)?[U(sp.leadId)]:[]),sp.leadId,"Choose a lead",true)+'</select></span>' :
      (sp.leadId ? '<b>'+esc(U(sp.leadId).name)+'</b>' : '<span class="muted">Unassigned</span>');
    return '<tr>'+
      '<td><b><a href="#/search/'+p.id+'/'+sp.id+'" data-act="gsQuickSelect" data-type="sp" data-id="'+sp.id+'" class="u-decoration-none u-text-inherit">'+esc(sp.name)+'</a></b></td>'+
      '<td class="nowrap">'+leadCell+'</td>'+
      '<td class="nowrap small">'+(sp.updatedAt?fmtDT(sp.updatedAt)+(sp.updatedBy?'<br><span class="muted small">by '+uname(sp.updatedBy||sp.leadId)+'</span>':''):'–')+'</td>'+
      '<td class="c"><a class="circle-btn" href="#/search/'+p.id+'/'+sp.id+'" data-act="gsQuickSelect" data-type="sp" data-id="'+sp.id+'" title="Open '+esc(sp.name)+'" aria-label="Open '+esc(sp.name)+'"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></a></td>'+
    '</tr>';
  }).join("");

  return '<div class="head"><div><h1>'+esc(p.code+" "+p.name)+'</h1>'+
    '<div class="row">'+badge(projectPrepStatus(p))+'</div></div>'+
    (canManage ? '<div class="acts"><button type="button" class="btn ghost" data-act="delProject" data-id="'+p.id+'">Delete</button><button type="button" class="btn sec" data-act="editProject" data-id="'+p.id+'">Edit details</button></div>' : '')+
  '</div>'+
  '<div class="panel">'+
    '<div class="u-d-flex u-items-center u-justify-between u-mb-12 u-gap-12">'+
      '<h3 class="u-m-0">Project details</h3>'+
      '<button type="button" class="btn sec sm u-d-inline-flex u-items-center u-gap-6" data-act="viewProjChanges" data-id="'+p.id+'"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>View Changes</button>'+
    '</div>'+
    '<dl class="kv kv2">'+
    '<dt>Code</dt><dd>'+esc(p.code)+'</dd>'+
    '<dt>Project lead</dt><dd>'+uname(p.leadId)+'</dd>'+
    '<dt>Target completion</dt><dd>'+fmtD(p.end)+'</dd>'+
    '<dt>Sub-projects</dt><dd>'+sps.length+'</dd>'+
    '<dt>Funding paper</dt><dd>'+(p.funding?esc(p.funding):'<span class="muted">Not linked</span>')+'</dd>'+
    '<dt>Tenders</dt><dd>'+ts.length+'</dd>'+
  '</dl>'+
  '<div class="kv-desc"><div class="kv-desc-label">Description</div><p>'+(p.desc?esc(p.desc):'<span class="muted">None</span>')+'</p></div>'+
  '</div>'+
  '<div class="head u-m-30-0-12"><h2 class="sec u-m-0">Sub-projects</h2>'+
    (canManage ? '<div class="acts"><button type="button" class="btn" data-act="addSp" data-id="'+p.id+'"'+dA(has("addSp:"+p.id))+'>Add sub-project'+dSR(has("addSp:"+p.id))+'</button></div>' : '')+
  '</div>'+
  '<div class="scroll"><table class="t"><thead><tr><th>Sub-project</th><th>Sub-project lead</th><th>Last updated</th><th></th></tr></thead><tbody>'+
    (rows || '<tr><td colspan="4" class="muted">Use <b>Add sub-project</b> to create one.</td></tr>')+
  '</tbody></table></div>';
}
export function renderGsSubprojectDetails(sp, p){
  if(!p) p = PR(sp.projectId);
  const u = me();
  const isProjLead = isProjectLeadUser(u);
  if(!isProjLead && !userRelatesToSubproject(u, sp)){
    return '<div class="panel muted u-p-28-20 u-text-center"><h3 class="u-m-0-0-6">Access Restricted</h3><p class="u-m-0 u-fs-13p5">You are not assigned to this sub-project and cannot view its details.</p></div>';
  }
  const canManage = isPL(u, p) || isAdmin(u);
  let ts = tendersOf(sp);
  if(!isProjLead){
    ts = ts.filter(t => userRelatesToTender(u, t));
  }
  const cands = splCandidates();
  const leadCell = canManage ?
    '<span class="sel-dot"'+dA(has("appointLead:"+sp.id))+'><select data-chg="setSpl" data-id="'+sp.id+'" aria-label="Sub-project lead">'+userOpts(cands.concat(sp.leadId&&!cands.some(c=>c.id===sp.leadId)?[U(sp.leadId)]:[]),sp.leadId,"Choose a lead",true)+'</select></span>' :
    (sp.leadId ? '<b>'+esc(U(sp.leadId).name)+'</b>' : '<span class="muted">Unassigned</span>');

  const rows = ts.length ? ts.map(t => {
    return '<tr>'+
      '<td><b><a href="#/search/'+p.id+'/'+sp.id+'/'+t.id+'" data-act="gsQuickSelect" data-type="t" data-id="'+t.id+'" class="u-decoration-none u-text-inherit">'+esc(t.code)+'</a></b><br><span class="small muted">'+esc(t.title)+'</span></td>'+
      '<td>'+esc(t.ctype||"–")+'</td>'+
      '<td>'+(t.icId?uname(t.icId):'<span class="muted">Not assigned</span>')+'</td>'+
      '<td class="nowrap">'+badge(tStatus(t))+'</td>'+
      '<td class="nowrap small">'+updTxtTender(t)+'</td>'+
      '<td class="c"><a class="circle-btn" href="#/search/'+p.id+'/'+sp.id+'/'+t.id+'" data-act="gsQuickSelect" data-type="t" data-id="'+t.id+'" title="Open '+esc(t.code)+' '+esc(t.title)+'" aria-label="Open '+esc(t.code)+' '+esc(t.title)+'"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></a></td>'+
    '</tr>';
  }).join("") : '<tr><td colspan="6" class="muted">'+(isSPL(u, sp) ? 'Use <b>+ New tender</b> to create one.' : 'The sub-project lead hasn\'t created any tenders yet.')+'</td></tr>';

  return '<div class="head"><div><h1>'+esc(sp.name)+'</h1></div>'+
    (canManage ? '<div class="acts"><button type="button" class="btn ghost" data-act="delSp" data-id="'+sp.id+'">Delete</button><button type="button" class="btn sec" data-act="editSp" data-id="'+sp.id+'">Edit details</button></div>' : '')+
  '</div>'+
  '<div class="panel">'+
    '<div class="u-d-flex u-items-center u-justify-between u-mb-12 u-gap-12">'+
      '<h3 class="u-m-0">Sub-project details</h3>'+
      '<button type="button" class="btn sec sm u-d-inline-flex u-items-center u-gap-6" data-act="viewSpChanges" data-id="'+sp.id+'"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>View Changes</button>'+
    '</div>'+
    '<dl class="kv kv2">'+
    '<dt>Master project</dt><dd><a href="#/search/'+p.id+'" data-act="gsQuickSelect" data-type="mp" data-id="'+p.id+'">'+esc(p.code+" "+p.name)+'</a></dd>'+
    '<dt>Sub-project lead</dt><dd>'+leadCell+'</dd>'+
    '<dt>Tenders</dt><dd>'+ts.length+'</dd>'+
  '</dl>'+
  '<div class="kv-desc"><div class="kv-desc-label">Description</div><p>'+(sp.desc?esc(sp.desc):'<span class="muted">None</span>')+'</p></div>'+
  '</div>'+
  '<div class="head u-m-30-0-12"><h2 class="sec u-m-0">Tenders</h2>'+
    (isSPL(u, sp) ? '<div class="acts"><button type="button" class="btn" data-act="newTender" data-id="'+sp.id+'" data-sp="'+sp.id+'"'+dA(has("createTenders:"+sp.id))+'>+ New tender'+dSR(has("createTenders:"+sp.id))+'</button></div>' : '')+
  '</div>'+
  '<div class="scroll"><table class="t"><thead><tr><th>Tender</th><th>Tender type</th><th>IC</th><th>Status</th><th>Last updated</th><th></th></tr></thead><tbody>'+
    rows+
  '</tbody></table></div>';
}
export function renderGsTenderDetails(t, sp){
  const u = me();
  const isProjLead = isProjectLeadUser(u);
  if(!isProjLead && !userRelatesToTender(u, t)){
    return '<div class="panel muted u-p-28-20 u-text-center"><h3 class="u-m-0-0-6">Access Restricted</h3><p class="u-m-0 u-fs-13p5">You are not assigned to this tender and cannot view its details.</p></div>';
  }
  if(!sp) sp = spOf(t);
  let curTab = GS_STATE.tenderTab || "overview";
  if(curTab === "activity") curTab = "overview";
  const gsTabs = pkgOf(t) ? TABS.concat([["package", "Package"]]) : TABS;
  const tabsNav = '<nav class="tabs" aria-label="Tender sections">' +
    gsTabs.map(([k, l]) => {
      const n = tabNeeds(t, k);
      return '<a href="#/tender/'+t.id+'/'+k+'" data-act="gsTenderTab" data-tab="'+k+'"'+(k === curTab ? ' aria-current="page"' : '')+dA(n)+'>'+l+dSR(n)+'</a>';
    }).join("") +
    '</nav>';

  const acts = isSPL(me(), sp) ?
    '<div class="acts"><button type="button" class="btn ghost" data-act="delTender" data-id="'+t.id+'">Delete</button><button type="button" class="btn sec" data-act="editTender" data-id="'+t.id+'">Edit details</button></div>' : '';

  const head = '<div class="head"><div><h1>'+esc(t.code+" "+t.title)+'</h1><div class="row">'+badge(tStatus(t))+'</div></div>'+acts+'</div>';

  const bodyMap = {
    overview: tOverview,
    team: tTeam,
    documents: tDocs,
    metrics: tMetrics,
    activity: tActivity,
    package: (tt) => pkgPanel(tt)
  };
  const bodyFn = bodyMap[curTab] || tOverview;

  return head + tabsNav + bodyFn(t, GS_STATE.tenderDocSubtab || "all");
}
export function renderGsDocDetails(d, t, sp, p){
  const u = me();
  const isProjLead = isProjectLeadUser(u);
  if(!isProjLead && !canSeeDoc(u, d)){
    return '<div class="panel muted u-p-28-20 u-text-center"><h3 class="u-m-0-0-6">Access Restricted</h3><p class="u-m-0 u-fs-13p5">You do not have access to view this document.</p></div>';
  }
  if(!t) t = T(d.tenderId);
  if(!sp && t) sp = spOf(t);
  if(!p && sp) p = PR(sp.projectId);

  const owner = d.ownerId === u.id;
  const edit = canEditDoc(u, d);
  const cm = canComment(u, d);
  const isLib = d.status === DS.AP || d.status === DS.FI;
  if(!d.versions || !d.versions.length){
    d.versions = [{no:1, html:d.html, at:d.createdAt||Date.now(), by:d.ownerId||S.me, note:"Initial draft"}];
  }
  const last = d.versions[d.versions.length-1];

  const body = edit ? (
    '<div class="doc">' +
      '<div class="doc-tools" role="toolbar" aria-label="Formatting">' +
        '<button type="button" data-act="fmt" data-c="formatBlock" data-v="h3">Heading</button>' +
        '<button type="button" data-act="fmt" data-c="formatBlock" data-v="p">Paragraph</button>' +
        '<button type="button" data-act="fmt" data-c="bold"><b>B</b></button>' +
        '<button type="button" data-act="fmt" data-c="italic"><i>I</i></button>' +
        '<button type="button" data-act="fmt" data-c="insertOrderedList">Numbered</button>' +
        '<button type="button" data-act="fmt" data-c="insertUnorderedList">Bullets</button>' +
        '<span class="u-w-1 u-h-16 u-bg-rule u-m-0-4 u-d-inline-block u-va-middle"></span>' +
        '<button type="button" class="btn-ai-write" data-act="aiWriteAssist" data-id="'+d.id+'" title="AI to help with writing document">' +
          '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="u-mr-4 u-va-n1"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z"></path></svg>Write with AI' +
        '</button>' +
        '<div class="u-ml-auto u-d-inline-flex u-items-center u-gap-10">' +
          '<span class="saved" id="savedState">All changes saved</span>' +
          '<button type="button" class="btn-save" id="btnSaveDoc" data-act="saveDocContent" data-id="'+d.id+'" title="Save document changes (Cmd+S / Ctrl+S)" disabled>' +
            '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>Save' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="doc-body" id="editor" contenteditable="true" spellcheck="true" aria-label="Document content">' + d.html + '</div>' +
    '</div>'
  ) : (
    '<div class="doc">' +
      '<div class="doc-tools">' +
        '<span class="saved u-ml-0">Read-only</span>' +
      '</div>' +
      '<div class="doc-body" id="reader">' + d.html + '</div>' +
    '</div>'
  );

  const cms = d.comments.slice().sort((a,b) => (a.resolved - b.resolved) || (b.at - a.at));
  const cmHtml = cms.map(c =>
    '<div class="cmt'+(c.resolved ? " resolved" : "")+'">' +
      '<div class="by">'+uname(c.by)+'<span class="at">'+rel(c.at)+'</span>'+(c.contracts ? ' <span class="tag">Contracts review</span>' : '')+(c.resolved ? ' <span class="tag">Resolved</span>' : '')+'</div>' +
      '<p>'+esc(c.text)+'</p>' +
      c.replies.map(r => '<div class="rep"><div class="by">'+uname(r.by)+'<span class="at">'+rel(r.at)+'</span></div><p>'+esc(r.text)+'</p></div>').join('') +
      (!c.resolved && (cm || owner) ?
        '<div class="row u-mt-6">' +
          '<button class="link small" data-act="reply" data-id="'+d.id+'" data-c="'+c.id+'">Reply</button>' +
          (owner ? '<button class="link small" data-act="resolve" data-id="'+d.id+'" data-c="'+c.id+'">Resolve</button>' : '') +
        '</div>' : '') +
    '</div>'
  ).join('');

  const curVerNo = last.no;
  const versHtml = d.versions.slice().reverse().map(v => {
    const isCur = v.no === curVerNo;
    const canRestore = edit && !isCur && !DOC_LOCKED.includes(d.status);
    return '<li class="u-d-flex u-items-center u-justify-between u-gap-8 u-p-7-0 u-border-b-1-solid-rule">' +
      '<div><div class="u-fw-600 u-fs-13">Version '+v.no+(isCur ? ' <span class="badge g u-fs-11 u-p-0-5 u-ml-4">Current</span>' : '')+'</div>' +
      '<div class="small muted">'+fmtDT(v.at)+' by '+uname(v.by)+(v.note ? ' &middot; '+esc(v.note) : '')+'</div></div>' +
      (canRestore ? '<button type="button" class="btn sec sm u-p-2-8 u-fs-12" data-act="restoreDocVer" data-id="'+d.id+'" data-v="'+v.no+'" title="Restore this version">Restore</button>' : '') +
    '</li>';
  }).join('');

  afterRender.push(() => bindEditor(d));

  const head = '<div class="head"><div>' +
    '<h1>'+esc(d.name)+'</h1>' +
  '</div>' +
  '<div class="acts">' + docActs(d) + '</div>' +
  '</div>';

  return head +
    '<div class="grid2">' +
      '<div>' + body + '</div>' +
      '<div>' +
        '<div class="panel"><h3>Document details</h3>' +
          '<dl class="kv">' +
            '<dt>Tender</dt><dd>'+esc((t?t.code+" "+t.title:"–"))+'</dd>' +
            '<dt>Spec type</dt><dd>'+esc(d.spec)+'</dd>' + docRemarkRows(d) +
            (d.fileName ? '<dt>Attached file</dt><dd><b>'+esc(d.fileName)+'</b> <span class="muted small">('+(d.fileSize||'142 KB')+')</span></dd>' : '') +
            '<dt>Owner</dt><dd>'+(d.ownerId ? uname(d.ownerId) : "Unassigned")+'</dd>' +
            (isLib ? '' : '<dt>Due date</dt><dd>'+fmtD(d.due)+'</dd><dt>Status</dt><dd>'+badge(d.status)+'</dd>') +
            '<dt>Created</dt><dd>'+(d.createdAt ? fmtD(d.createdAt) : '–')+'</dd>' +
            '<dt>Last updated</dt><dd>'+(lastUpd(d).at ? fmtDT(lastUpd(d).at)+(lastUpd(d).by ? ' by '+uname(lastUpd(d).by) : '') : '–')+'</dd>' +
          '</dl>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="row u-justify-between"><h3 class="u-m-0">Version history</h3><span class="muted small">'+d.versions.length+(d.versions.length===1?' version':' versions')+'</span></div>' +
          '<ul class="u-list-none u-p-0 u-m-8-0-0">' + (versHtml || '<li class="small muted">Version 1</li>') + '</ul>' +
        '</div>' +
        '<div class="panel">' +
          '<div class="row u-justify-between"><h3 class="u-m-0">Comments'+adot(has("comments:"+d.id))+''+(d.comments.some(c=>!c.resolved)?' <span class="muted small">'+d.comments.filter(c=>!c.resolved).length+' open</span>':'')+'</h3>' +
            (cm ? '<button class="btn sec sm" data-act="addComment" data-id="'+d.id+'">Add comment</button>' : '') +
          '</div>' +
          (cmHtml || '<p class="muted small u-mt-10">No comments yet.</p>') +
        '</div>' +
        '<div class="panel"><h3>Activity</h3>' + feed(docActivity(d)) + '</div>' +
      '</div>' +
    '</div>';
}
export function renderGsDirectoryHome(matchingProjects, allProjects){
  const u = me();
  const isProjLead = isProjectLeadUser(u);
  const firstDot = has("firstProject");
  const createBtn = isProjLead ? '<div class="acts"><button type="button" class="btn sm" data-act="newProject"'+dA(firstDot)+'><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="u-mr-5 u-va-n1"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>Create Master Project'+dSR(firstDot)+'</button></div>' : '';
  if(!allProjects || allProjects.length === 0){
    return '<div class="head u-m-4-0-12 u-items-center">'+
      '<div><h2 class="sec u-m-0">Master Projects</h2></div>'+
      createBtn+
    '</div>'+
    '<div class="panel muted u-mt-14 u-p-32-20 u-text-center"><h3 class="u-m-0">No Assigned Projects</h3></div>';
  }
  if(!matchingProjects || matchingProjects.length === 0){
    return '<div class="head u-m-4-0-12 u-items-center">'+
      '<div><h2 class="sec u-m-0">Master Projects</h2></div>'+
      createBtn+
    '</div>'+
    '<div class="panel muted u-mt-14 u-p-32-20 u-text-center"><h3 class="u-m-0">No results found</h3></div>';
  }
  return '<div class="head u-m-4-0-12 u-items-center">'+
    '<div><h2 class="sec u-m-0">Master Projects</h2></div>'+
    createBtn+
  '</div>'+
  '<div class="gs-proj-grid">'+
    matchingProjects.map(p=>{
      const pl = U(p.leadId);
      const pct = projectPct(p);
      return '<div class="gs-proj-card" data-act="gsQuickSelect" data-type="p" data-id="'+p.id+'" role="button" tabindex="0" aria-label="Select '+esc(p.name)+'">'+
        '<div>'+
          '<div class="u-d-flex u-justify-between u-items-center u-gap-8"><span class="proj-badge">'+esc(p.code)+'</span>'+badge(projectPrepStatus(p))+'</div>'+
          '<h3 class="gs-proj-name" title="'+esc(p.name)+'">'+esc(p.name)+'</h3>'+
        '</div>'+
        '<div class="gs-proj-prog">'+
          '<div class="gs-proj-prog-bar" role="progressbar" aria-label="'+esc(p.name)+' progress" aria-valuenow="'+pct+'" aria-valuemin="0" aria-valuemax="100"><i style="width:'+pct+'%"></i></div>'+
          '<span class="gs-proj-prog-pct">'+pct+'%</span>'+
          projectInsight(p)+
        '</div>'+
        '<div class="u-d-inline-flex u-items-center u-gap-6 u-fs-12 u-text-ink-2 u-mt-auto">'+
          '<div class="avatar-sm u-w-20 u-h-20 u-fs-9p5">'+esc(pl.name.slice(0,2).toUpperCase())+'</div>'+
          '<span class="u-fw-600">'+esc(pl.name)+'</span>'+
        '</div>'+
      '</div>';
    }).join('')+
  '</div>';
}

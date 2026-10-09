/* Home page route and its navigation actions. */
import { DS } from "../../core/constants.js";
import { D, PR, SP, T, me, projOf, spOf } from "../../core/model.js";
import { canSeeDoc, isProjectLeadUser, userRelatesToProject, userRelatesToSubproject, userRelatesToTender } from "../../core/permissions.js";
import { ACT, route } from "../../core/registry.js";
import { currentOrigin, go, render, rerender } from "../../core/router.js";
import { S } from "../../core/store.js";
import { renderGsDirectoryHome, renderGsDocDetails, renderGsProjectDetails, renderGsSubprojectDetails, renderGsTenderDetails } from "./details.js";
import { renderGsDropdownSearch, renderGsSearchDropdown } from "./dropdowns.js";
import { executeUniversalSearch, gsTaskTargets } from "./search-engine.js";
import { GS_STATE, closeAllDd, resetSearchState } from "./state.js";
import { toast } from "../../ui/feedback.js";
import { esc, uname } from "../../ui/format.js";

route("search", (arg0, arg1, arg2, arg3) => {
  let pId = arg0 || "";
  let spId = arg1 || "";
  let tId = arg2 || "";
  let docId = arg3 || "";

  if(docId){
    const d = D(docId);
    if(d){
      tId = d.tenderId;
      const t = T(tId);
      if(t){
        spId = t.spId;
        const sp = SP(spId);
        if(sp) pId = sp.projectId;
      }
    }
  } else if(tId){
    const t = T(tId);
    if(t){
      spId = t.spId;
      const sp = SP(spId);
      if(sp) pId = sp.projectId;
    }
  } else if(spId){
    const sp = SP(spId);
    if(sp) pId = sp.projectId;
  }

  const curUser = me();
  const isProjLead = isProjectLeadUser(curUser);

  // Lineage-restricted project list: all for Project Lead, only assigned for others
  const allProjects = isProjLead ? S.projects : S.projects.filter(p => userRelatesToProject(curUser, p));

  // If currently requested pId is not related to user, reset lineage
  if(pId && !allProjects.some(p => p.id === pId)){
    pId = "";
    spId = "";
    tId = "";
    docId = "";
    if(location.hash.startsWith("#/search/")) history.replaceState(null, "", "#/search");
  }

  let availableSps = [];
  if(pId){
    availableSps = S.subprojects.filter(sp => sp.projectId === pId);
  } else {
    const allowedPIds = new Set(allProjects.map(p => p.id));
    availableSps = S.subprojects.filter(sp => allowedPIds.has(sp.projectId));
  }
  if(!isProjLead){
    availableSps = availableSps.filter(sp => userRelatesToSubproject(curUser, sp));
  }
  if(spId && !availableSps.some(sp => sp.id === spId)){
    spId = "";
    tId = "";
    docId = "";
    if(pId && location.hash.startsWith("#/search/")) history.replaceState(null, "", "#/search/" + pId);
  }

  let availableTenders = [];
  if(spId){
    availableTenders = S.tenders.filter(t => t.spId === spId);
  } else if(pId){
    const allowedSpIds = new Set(availableSps.map(sp => sp.id));
    availableTenders = S.tenders.filter(t => allowedSpIds.has(t.spId));
  } else {
    const allowedSpIds = new Set(availableSps.map(sp => sp.id));
    availableTenders = S.tenders.filter(t => allowedSpIds.has(t.spId));
  }
  if(!isProjLead){
    availableTenders = availableTenders.filter(t => userRelatesToTender(curUser, t));
  }
  if(tId && !availableTenders.some(t => t.id === tId)){
    tId = "";
    docId = "";
    if(pId && spId && location.hash.startsWith("#/search/")) history.replaceState(null, "", "#/search/" + pId + "/" + spId);
  }
  const finalTenders = availableTenders.slice();

  let availableDocs = [];
  if(tId){
    availableDocs = S.docs.filter(d => d.tenderId === tId && d.status !== DS.NR);
  } else if(spId){
    const allowedTIds = new Set(finalTenders.map(t => t.id));
    availableDocs = S.docs.filter(d => allowedTIds.has(d.tenderId) && d.status !== DS.NR);
  } else if(pId){
    const allowedTIds = new Set(finalTenders.map(t => t.id));
    availableDocs = S.docs.filter(d => allowedTIds.has(d.tenderId) && d.status !== DS.NR);
  } else {
    const allowedTIds = new Set(finalTenders.map(t => t.id));
    availableDocs = S.docs.filter(d => allowedTIds.has(d.tenderId) && d.status !== DS.NR);
  }
  if(!isProjLead){
    availableDocs = availableDocs.filter(d => canSeeDoc(curUser, d));
  }
  if(docId && !availableDocs.some(d => d.id === docId)){
    docId = "";
    if(pId && spId && tId && location.hash.startsWith("#/search/")) history.replaceState(null, "", "#/search/" + pId + "/" + spId + "/" + tId);
  }

  if(tId !== GS_STATE.tId){
    GS_STATE.tenderTab = "overview";
    GS_STATE.tenderDocSubtab = "all";
  }

  GS_STATE.pId = pId;
  GS_STATE.spId = spId;
  GS_STATE.tId = tId;
  GS_STATE.docId = docId;

  const curLevel = docId ? "doc" : (tId ? "tender" : (spId ? "subproject" : (pId ? "project" : "none")));
  const q = (GS_STATE.query || "").toLowerCase().trim();
  const searchRes = executeUniversalSearch(q, curUser);

  const curP = pId ? PR(pId) : null;
  const curSp = spId ? SP(spId) : null;
  const curT = tId ? T(tId) : null;
  const curDoc = docId ? D(docId) : null;

  let h = '<div class="gs-wrap">';

  // Next-action notifications (red dots) for the current user
  const gsTargets = gsTaskTargets(curUser);
  const notifDot = lvl => {
    let ls = [];
    if(lvl === "project"){
      ls = gsTargets.filter(x => x.level === "project" && (!pId || x.pId === pId));
    } else if(lvl === "subproject"){
      ls = gsTargets.filter(x => x.level === "subproject" && (!pId || x.pId === pId) && (!spId || x.spId === spId));
    } else if(lvl === "tender"){
      ls = gsTargets.filter(x => x.level === "tender" && (!pId || x.pId === pId) && (!spId || x.spId === spId) && (!tId || x.tId === tId));
    } else if(lvl === "doc"){
      ls = gsTargets.filter(x => x.level === "doc" && (!pId || x.pId === pId) && (!spId || x.spId === spId) && (!tId || x.tId === tId) && (!docId || x.docId === docId));
    }
    if(!ls.length) return '';
    const tips = [...new Set(ls.map(x => x.what))];
    const tip = 'Pending: ' + tips.slice(0, 4).join(' · ') + (tips.length > 4 ? ' · +' + (tips.length - 4) + ' more' : '');
    return '<span class="gs-red-notif-dot" title="'+esc(tip)+'" aria-label="'+esc(ls.length+' pending '+(ls.length===1?'task':'tasks'))+'">'+ls.length+'</span>';
  };

  const sortDdOptions = list => {
    list.sort((a, b) => {
      const notifDiff = (b.notif || 0) - (a.notif || 0);
      if(notifDiff !== 0) return notifDiff;
      if(q){
        const matchDiff = (b.matchTag ? 1 : 0) - (a.matchTag ? 1 : 0);
        if(matchDiff !== 0) return matchDiff;
      }
      return 0;
    });
  };

  // 4 Modular Searchable Dropdowns connected by arrows
  const mpOptions = [];
  allProjects.forEach(p => {
    const hasMatch = q && searchRes.pIdsWithMatches.has(p.id);
    mpOptions.push({
      val: p.id,
      isSelected: p.id === pId,
      code: p.code,
      title: p.name,
      matchTag: hasMatch ? "Match" : null,
      notif: gsTargets.filter(x => x.pId === p.id).length,
      searchTxt: [p.code, p.name, uname(p.leadId)].join(" ")
    });
  });
  sortDdOptions(mpOptions);
  const mpSelectedHtml = curP ? (
    '<span class="gs-dd-selected-val">' +
      '<span class="gs-dd-code-badge">' + esc(curP.code) + '</span>' +
      '<span class="gs-dd-title-text" title="' + esc(curP.name) + '">' + esc(curP.name) + '</span>' +
    '</span>'
  ) : '';

  const spOptions = [];
  availableSps.forEach(sp => {
    const p = PR(sp.projectId);
    const hasMatch = q && searchRes.spIdsWithMatches.has(sp.id);
    spOptions.push({
      val: sp.id,
      isSelected: sp.id === spId,
      code: p ? p.code : "",
      title: sp.name,
      matchTag: hasMatch ? "Match" : null,
      notif: gsTargets.filter(x => x.spId === sp.id).length,
      searchTxt: [sp.name, sp.desc, (p?p.code:""), (p?p.name:""), uname(sp.leadId)].join(" ")
    });
  });
  sortDdOptions(spOptions);
  const spSelectedHtml = curSp ? (
    '<span class="gs-dd-selected-val">' +
      (curP ? '' : '<span class="gs-dd-code-badge">' + esc((PR(curSp.projectId)||{}).code||"") + '</span>') +
      '<span class="gs-dd-title-text" title="' + esc(curSp.name) + '">' + esc(curSp.name) + '</span>' +
    '</span>'
  ) : '';

  const tOptions = [];
  finalTenders.forEach(t => {
    const sp = SP(t.spId);
    const p = sp ? PR(sp.projectId) : null;
    const hasMatch = q && searchRes.tIdsWithMatches.has(t.id);
    tOptions.push({
      val: t.id,
      isSelected: t.id === tId,
      code: t.code,
      title: t.title,
      matchTag: hasMatch ? "Match" : null,
      notif: gsTargets.filter(x => x.tId === t.id).length,
      searchTxt: [t.code, t.title, t.route, t.scope, (sp?sp.name:""), (p?p.code:""), (t.icId?uname(t.icId):"")].join(" ")
    });
  });
  sortDdOptions(tOptions);
  const tSelectedHtml = curT ? (
    '<span class="gs-dd-selected-val">' +
      '<span class="gs-dd-code-badge">' + esc(curT.code) + '</span>' +
      '<span class="gs-dd-title-text" title="' + esc(curT.title) + '">' + esc(curT.title) + '</span>' +
    '</span>'
  ) : '';

  const shortDocStatus = (st) => {
    if(st === DS.PA || st === "Pending approval") return "Pending";
    if(st === DS.CR || st === "Changes requested") return "Changes";
    if(st === DS.NS || st === "Not started") return "Not started";
    return st;
  };

  const docOptions = [];
  availableDocs.forEach(d => {
    const t = T(d.tenderId);
    const hasMatch = q && searchRes.docIdsWithMatches.has(d.id);
    docOptions.push({
      val: d.id,
      isSelected: d.id === docId,
      tagHtml: '<span class="gs-dd-status-badge '+(d.status===DS.AP?"g":d.status===DS.CR?"a":d.status===DS.RT?"b":d.status===DS.PA?"w":"")+'" title="'+esc(d.status)+'">'+esc(shortDocStatus(d.status))+'</span>',
      title: d.name,
      matchTag: hasMatch ? "Match" : null,
      notif: gsTargets.filter(x => x.docId === d.id).length,
      searchTxt: [d.name, d.status, (t?t.code:""), (t?t.title:""), d.spec].join(" ")
    });
  });
  sortDdOptions(docOptions);
  const docSelectedHtml = curDoc ? (
    '<span class="gs-dd-selected-val">' +
      '<span class="gs-dd-status-badge '+(curDoc.status===DS.AP?"g":curDoc.status===DS.CR?"a":curDoc.status===DS.RT?"b":curDoc.status===DS.PA?"w":"")+'">' + esc(shortDocStatus(curDoc.status)) + '</span>' +
      '<span class="gs-dd-title-text" title="' + esc(curDoc.name) + '">' + esc(curDoc.name) + '</span>' +
    '</span>'
  ) : '';

  const mpBadgeCount = q ? searchRes.pIdsWithMatches.size : allProjects.length;
  const spBadgeCount = q ? (pId ? availableSps.filter(sp => searchRes.spIdsWithMatches.has(sp.id)).length : searchRes.spIdsWithMatches.size) : availableSps.length;
  const tBadgeCount = q ? (spId ? finalTenders.filter(t => searchRes.tIdsWithMatches.has(t.id)).length : searchRes.tIdsWithMatches.size) : finalTenders.length;
  const docBadgeCount = q ? (tId ? availableDocs.filter(d => searchRes.docIdsWithMatches.has(d.id)).length : searchRes.docIdsWithMatches.size) : availableDocs.length;

  h += '<div class="gs-pipeline-panel">';
  h += '  <div class="gs-pipeline-header">';
  h += '    <div class="gs-pipeline-search-wrap'+(GS_STATE.query ? ' has-q' : '')+'">';
  h += '      <svg class="gs-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';
  h += '      <input type="text" id="gsMainQuery" class="gs-pipeline-search-inp" placeholder="Search" value="'+esc(GS_STATE.query)+'" data-inp="gsSearchInp" autocomplete="off" spellcheck="false">';
  if(GS_STATE.query){
    h += '      <button type="button" class="gs-clear-q" data-act="gsClearQuery" title="Clear search">&times;</button>';
  }
  if(q && GS_STATE.searchDropdownOpen !== false && searchRes && searchRes.totalCount > 0){
    h += renderGsSearchDropdown(q, searchRes);
  }
  h += '    </div>';
  h += '    <div class="gs-phase-sel-wrap">';
  h += '      <select class="gs-phase-select" data-chg="gsPhaseChange" aria-label="Workflow phase">';
  const phases = [
    { val: "Funding Paper", label: "Funding Paper" },
    { val: "Tender Preparation", label: "Tender Preparation (" + allProjects.length + ")" },
    { val: "Tender Evaluation", label: "Tender Evaluation" },
    { val: "Tender Award", label: "Tender Award" }
  ];
  phases.forEach(ph => {
    const isSel = (GS_STATE.phase || "Tender Preparation") === ph.val;
    h += '        <option value="'+esc(ph.val)+'"'+(isSel ? ' selected' : '')+'>'+esc(ph.label)+'</option>';
  });
  h += '      </select>';
  h += '      <svg class="gs-phase-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>';
  h += '    </div>';
  h += '    <button type="button" class="gs-reset-btn" data-act="gsClearAll" title="Reset all selections and search">';
  h += '      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
  h += '        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>';
  h += '        <polyline points="3 3 3 8 8 8"></polyline>';
  h += '      </svg>';
  h += '      <span>reset</span>';
  h += '    </button>';
  h += '  </div>';
  h += '  <div class="gs-pipeline">';
  // Module 1: Master Project
  h += '  <div class="gs-mod-card'+(pId?' has-val':'')+(curLevel==="project"?' active-target':'')+'">';
  h += notifDot("project");
  h += '    <div class="gs-mod-top">';
  h += '      <span class="gs-mod-label">Master Project</span>';
  h += '      <span class="gs-mod-badge-num'+(pId?' is-selected':'')+'">'+(pId?'Selected':mpBadgeCount.toLocaleString()+' results')+'</span>';
  h += '    </div>';
  h += renderGsDropdownSearch({
    dd: "mp",
    label: "Master Project",
    placeholder: "Select Master Project",
    searchPlaceholder: "Search Master Projects...",
    selected: !!pId,
    selectedHtml: mpSelectedHtml,
    selectedTitle: curP ? (curP.code + " " + curP.name) : "",
    options: mpOptions
  });
  h += '  </div>';

  // Arrow 1
  h += '  <div class="gs-arrow-col"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></div>';

  // Module 2: Sub-Project
  h += '  <div class="gs-mod-card'+(spId?' has-val':'')+(curLevel==="subproject"?' active-target':'')+'">';
  h += notifDot("subproject");
  h += '    <div class="gs-mod-top">';
  h += '      <span class="gs-mod-label">Sub-Project</span>';
  h += '      <span class="gs-mod-badge-num'+(spId?' is-selected':'')+'">'+(spId?'Selected':spBadgeCount.toLocaleString()+' results')+'</span>';
  h += '    </div>';
  h += renderGsDropdownSearch({
    dd: "sp",
    label: "Sub-Project",
    placeholder: "Select Sub-Project",
    searchPlaceholder: "Search Sub-Projects...",
    selected: !!spId,
    selectedHtml: spSelectedHtml,
    selectedTitle: curSp ? curSp.name : "",
    options: spOptions
  });
  h += '  </div>';

  // Arrow 2
  h += '  <div class="gs-arrow-col"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></div>';

  // Module 3: Tender
  h += '  <div class="gs-mod-card'+(tId?' has-val':'')+(curLevel==="tender"?' active-target':'')+'">';
  h += notifDot("tender");
  h += '    <div class="gs-mod-top">';
  h += '      <span class="gs-mod-label">Tender</span>';
  h += '      <span class="gs-mod-badge-num'+(tId?' is-selected':'')+'">'+(tId?'Selected':tBadgeCount.toLocaleString()+' results')+'</span>';
  h += '    </div>';
  h += renderGsDropdownSearch({
    dd: "t",
    label: "Tender",
    placeholder: "Select Tender",
    searchPlaceholder: "Search Tenders...",
    selected: !!tId,
    selectedHtml: tSelectedHtml,
    selectedTitle: curT ? (curT.code + " " + curT.title) : "",
    options: tOptions
  });
  h += '  </div>';

  // Arrow 3
  h += '  <div class="gs-arrow-col"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></div>';

  // Module 4: Document
  h += '  <div class="gs-mod-card'+(docId?' has-val':'')+(curLevel==="doc"?' active-target':'')+'">';
  h += notifDot("doc");
  h += '    <div class="gs-mod-top">';
  h += '      <span class="gs-mod-label">Document</span>';
  h += '      <span class="gs-mod-badge-num'+(docId?' is-selected':'')+'">'+(docId?'Selected':docBadgeCount.toLocaleString()+' results')+'</span>';
  h += '    </div>';
  h += renderGsDropdownSearch({
    dd: "doc",
    label: "Document",
    placeholder: "Select Document",
    searchPlaceholder: "Search Documents...",
    isLast: true,
    selected: !!docId,
    selectedHtml: docSelectedHtml,
    selectedTitle: curDoc ? curDoc.name : "",
    options: docOptions
  });
  h += '  </div>';
  h += '  </div>';
  h += '</div>';

  // Breadcrumbs & Back bar
  let crumbInner = '<a href="#/search">Home</a>';
  if(curP){
    crumbInner += ' <span class="crumb-sep">/</span> '+(curSp||curT||curDoc?'<a href="#/search/'+curP.id+'">'+esc(curP.code+' '+curP.name)+'</a>':'<span class="crumb-curr">'+esc(curP.code+' '+curP.name)+'</span>');
  }
  if(curSp){
    crumbInner += ' <span class="crumb-sep">/</span> '+(curT||curDoc?'<a href="#/search/'+curP.id+'/'+curSp.id+'">'+esc(curSp.name)+'</a>':'<span class="crumb-curr">'+esc(curSp.name)+'</span>');
  }
  if(curT){
    crumbInner += ' <span class="crumb-sep">/</span> '+(curDoc?'<a href="#/search/'+curP.id+'/'+curSp.id+'/'+curT.id+'">'+esc(curT.code)+'</a>':'<span class="crumb-curr">'+esc(curT.code+' '+curT.title)+'</span>');
  }
  if(curDoc){
    crumbInner += ' <span class="crumb-sep">/</span> <span class="crumb-curr">'+esc(curDoc.name)+'</span>';
  }

  h += '<div class="gs-nav-bar">';
  h += '  <div class="crumbs-bar u-m-0">';
  h += '    <button type="button" class="btn-back" data-act="gsBack" title="Step back in lineage">';
  h += '      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="u-mr-2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>';
  h += '      Back';
  h += '    </button>';
  h += '    <p class="crumbs">'+crumbInner+'</p>';
  h += '  </div>';
  h += '</div>';

  // Dynamic Details View
  h += '<div class="gs-detail-section">';
  if(curLevel === "none"){
    const filteredProjects = q ? allProjects.filter(p => searchRes.pIdsWithMatches.has(p.id)) : allProjects;
    h += renderGsDirectoryHome(filteredProjects, allProjects);
  } else {
    if(curLevel === "project" && curP){
      h += renderGsProjectDetails(curP);
    } else if(curLevel === "subproject" && curSp){
      h += renderGsSubprojectDetails(curSp, curP);
    } else if(curLevel === "tender" && curT){
      h += renderGsTenderDetails(curT, curSp);
    } else if(curLevel === "doc" && curDoc){
      h += renderGsDocDetails(curDoc, curT, curSp, curP);
    }
  }
  h += '</div>';

  h += '</div>';
  return h;
});
ACT.gsTenderTab = (el, e) => {
  if(e) e.preventDefault();
  GS_STATE.tenderTab = el.dataset.tab;
  rerender();
};
ACT.gsTenderDocSubtab = (el, e) => {
  if(e) e.preventDefault();
  GS_STATE.tenderDocSubtab = el.dataset.subtab;
  rerender();
};
ACT.gsBack = () => {
  closeAllDd();
  GS_STATE.tenderTab = "overview";
  GS_STATE.tenderDocSubtab = "all";
  if(GS_STATE.docId){
    GS_STATE.docId = "";
    go("#/search/" + GS_STATE.pId + "/" + GS_STATE.spId + "/" + GS_STATE.tId);
  } else if(GS_STATE.tId){
    GS_STATE.tId = "";
    go("#/search/" + GS_STATE.pId + "/" + GS_STATE.spId);
  } else if(GS_STATE.spId){
    GS_STATE.spId = "";
    go("#/search/" + GS_STATE.pId);
  } else if(GS_STATE.pId){
    GS_STATE.pId = "";
    go("#/search");
  } else {
    go(currentOrigin().hash || "#/dashboard");
  }
};
ACT.gsClearAll = () => {
  resetSearchState();
  if(location.hash === "#/search") render();
  else go("#/search");
  toast("Search reset");
};
ACT.gsPhaseChange = el => {
  GS_STATE.phase = el.value;
  toast("Switched phase: " + el.value);
};
ACT.gsSearchInp = el => {
  GS_STATE.query = el.value;
  GS_STATE.searchDropdownOpen = !!el.value.trim();
  render(true);
  const inp = document.getElementById("gsMainQuery");
  if(inp){
    inp.focus();
    inp.selectionStart = inp.selectionEnd = inp.value.length;
  }
};
ACT.gsClearQuery = () => {
  GS_STATE.query = "";
  GS_STATE.searchDropdownOpen = false;
  render(true);
};
ACT.gsSetSearchDdTab = (el, e) => {
  if(e){
    e.preventDefault();
    e.stopPropagation();
  }
  GS_STATE.searchDdTab = el.dataset.tab || "all";
  render(true);
  const inp = document.getElementById("gsMainQuery");
  if(inp){
    inp.focus();
    inp.selectionStart = inp.selectionEnd = inp.value.length;
  }
};
ACT.gsGoLineage = (el, e) => {
  if(e) e.preventDefault();
  const pid = el.dataset.pid || "";
  const spid = el.dataset.spid || "";
  const tid = el.dataset.tid || "";
  const docid = el.dataset.docid || "";
  GS_STATE.pId = pid;
  GS_STATE.spId = spid;
  GS_STATE.tId = tid;
  GS_STATE.docId = docid;
  GS_STATE.searchDropdownOpen = false;
  closeAllDd();
  if(docid){
    go("#/search/" + pid + "/" + spid + "/" + tid + "/" + docid);
  } else if(tid){
    go("#/search/" + pid + "/" + spid + "/" + tid);
  } else if(spid){
    go("#/search/" + pid + "/" + spid);
  } else if(pid){
    go("#/search/" + pid);
  } else {
    go("#/search");
  }
};
ACT.gsQuickSelect = el => {
  const type = el.dataset.type, id = el.dataset.id;
  if(type === "p"){
    go("#/search/" + id);
  } else if(type === "sp"){
    const sp = SP(id);
    go("#/search/" + sp.projectId + "/" + id);
  } else if(type === "t"){
    GS_STATE.tenderTab = "overview";
    GS_STATE.tenderDocSubtab = "all";
    const t = T(id), sp = spOf(t), p = projOf(t);
    go("#/search/" + (p ? p.id : "") + "/" + (sp ? sp.id : "") + "/" + id);
  } else if(type === "d"){
    const d = D(id), t = T(d.tenderId), sp = spOf(t), p = projOf(t);
    go("#/search/" + (p ? p.id : "") + "/" + (sp ? sp.id : "") + "/" + (t ? t.id : "") + "/" + id);
  }
};

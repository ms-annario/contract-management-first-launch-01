/* Home page pipeline dropdowns and the search suggestions panel. */
import { D, SP, T, projOf, spOf } from "../../core/model.js";
import { ACT } from "../../core/registry.js";
import { go, render } from "../../core/router.js";
import { highlightMatch } from "./search-engine.js";
import { GS_STATE, closeAllDd } from "./state.js";
import { esc } from "../../ui/format.js";
import { badge } from "../../ui/markup.js";

export function renderGsSearchDropdown(q, searchRes){
  if(!q || !searchRes || searchRes.totalCount === 0) return "";
  const activeTab = GS_STATE.searchDdTab || "all";

  const tabs = [
    { id: "all", label: "All Results", count: searchRes.totalCount }
  ];
  if(searchRes.projects.length) tabs.push({ id: "project", label: "Master Projects", count: searchRes.projects.length });
  if(searchRes.subprojects.length) tabs.push({ id: "subproject", label: "Sub-Projects", count: searchRes.subprojects.length });
  if(searchRes.tenders.length) tabs.push({ id: "tender", label: "Tenders", count: searchRes.tenders.length });
  if(searchRes.docs.length) tabs.push({ id: "doc", label: "Documents", count: searchRes.docs.length });

  let h = '<div class="gs-search-dropdown" id="gsSearchDropdown" role="listbox">';

  // Header with counts & tabs
  h += '  <div class="gs-search-dd-header">';
  h += '    <div class="gs-search-dd-head-top">';
  h += '      <span class="gs-search-dd-count-label"><b>'+searchRes.totalCount+'</b> results found</span>';
  h += '    </div>';
  h += '    <div class="gs-search-dd-tabs">';
  tabs.forEach(t => {
    const isAct = activeTab === t.id;
    h += '<button type="button" class="gs-search-dd-tab'+(isAct?' active':'')+'" data-act="gsSetSearchDdTab" data-tab="'+t.id+'">';
    h += esc(t.label) + ' <span class="gs-search-dd-badge">'+t.count+'</span>';
    h += '</button>';
  });
  h += '    </div>';
  h += '  </div>';

  // List of results
  h += '  <div class="gs-search-dd-list">';

  const renderDdItem = (item) => {
    let row = '<div class="gs-search-dd-item" data-act="gsGoLineage" data-pid="'+esc(item.pId)+'" data-spid="'+esc(item.spId)+'" data-tid="'+esc(item.tId)+'" data-docid="'+esc(item.docId)+'" role="option" tabindex="0">';
    row += '  <div class="gs-search-dd-row">';
    row += '    <div class="gs-search-dd-name-col">';
    if(item.code && item.type !== 'doc'){
      row += '      <span class="proj-badge u-fs-10p5 u-p-1p5-5p5">'+highlightMatch(item.code, q)+'</span>';
    }
    row += '      <span class="gs-search-dd-title">'+highlightMatch(item.title, q)+'</span>';
    row += '    </div>';
    row += '    <div class="gs-search-dd-status-col">';
    if(item.status){
      row += badge(item.status);
    }
    row += '    </div>';
    row += '  </div>';
    row += '</div>';
    return row;
  };

  if(activeTab === "all"){
    if(searchRes.projects.length){
      h += '<div class="gs-search-dd-section-title">Master Projects ('+searchRes.projects.length+')</div>';
      searchRes.projects.forEach(p => { h += renderDdItem(p); });
    }
    if(searchRes.subprojects.length){
      h += '<div class="gs-search-dd-section-title">Sub-Projects ('+searchRes.subprojects.length+')</div>';
      searchRes.subprojects.forEach(sp => { h += renderDdItem(sp); });
    }
    if(searchRes.tenders.length){
      h += '<div class="gs-search-dd-section-title">Tenders ('+searchRes.tenders.length+')</div>';
      searchRes.tenders.forEach(t => { h += renderDdItem(t); });
    }
    if(searchRes.docs.length){
      h += '<div class="gs-search-dd-section-title">Documents ('+searchRes.docs.length+')</div>';
      searchRes.docs.forEach(d => { h += renderDdItem(d); });
    }
  } else if(activeTab === "project"){
    searchRes.projects.forEach(p => { h += renderDdItem(p); });
  } else if(activeTab === "subproject"){
    searchRes.subprojects.forEach(sp => { h += renderDdItem(sp); });
  } else if(activeTab === "tender"){
    searchRes.tenders.forEach(t => { h += renderDdItem(t); });
  } else if(activeTab === "doc"){
    searchRes.docs.forEach(d => { h += renderDdItem(d); });
  }

  h += '  </div>';
  h += '</div>';
  return h;
}
export function renderGsDropdownSearch(cfg){
  const fullTitle = cfg.selected && cfg.selectedTitle ? cfg.selectedTitle : ('Search or select ' + cfg.label);
  let h = '<div class="gs-dd-wrap'+(cfg.isLast?' is-last':'')+'" data-dd="'+cfg.dd+'">';
  h += '<div role="combobox" tabindex="0" class="gs-dd-trigger" data-act="gsToggleDropdown" aria-expanded="false" aria-haspopup="listbox" title="'+esc(fullTitle)+'">';
  h += '  <div class="gs-dd-content">';
  if(cfg.selected && cfg.selectedHtml){
    h += cfg.selectedHtml;
  } else {
    h += '  <span class="gs-dd-placeholder">'+esc(cfg.placeholder)+'</span>';
  }
  h += '  </div>';
  h += '  <div class="gs-dd-actions">';
  if(cfg.selected){
    h += '  <span class="gs-dd-clear-btn" role="button" tabindex="0" data-act="gsClearDdLevel" data-dd="'+cfg.dd+'" title="Clear selection" aria-label="Clear selection">&times;</span>';
  }
  h += '    <svg class="gs-dd-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>';
  h += '  </div>';
  h += '</div>';

  h += '<div class="gs-dd-menu" role="listbox">';
  h += '  <div class="gs-dd-search-header">';
  h += '    <div class="gs-dd-search-wrap">';
  h += '      <svg class="gs-dd-search-ico" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';
  h += '      <input type="text" class="gs-dd-search-input" placeholder="'+esc(cfg.searchPlaceholder)+'" data-inp="gsDdFilter" data-dd="'+cfg.dd+'" autocomplete="off" spellcheck="false">';
  h += '      <button type="button" class="gs-dd-search-clear u-d-none" data-act="gsDdClearInput" title="Clear search">&times;</button>';
  h += '    </div>';
  h += '  </div>';

  h += '  <div class="gs-dd-list">';
  cfg.options.forEach(opt => {
    const isAct = !!opt.isSelected;
    h += '  <div class="gs-dd-item'+(opt.isAll?' is-all':'')+(isAct?' is-selected':'')+'" data-act="gsPickOption" data-dd="'+cfg.dd+'" data-val="'+esc(opt.val)+'" data-search="'+esc(opt.searchTxt || (opt.title + " " + (opt.code||"")))+'" role="option" aria-selected="'+isAct+'">';
    h += '    <div class="gs-dd-item-left">';
    if(opt.code){
      h += '    <span class="gs-dd-code-badge">'+esc(opt.code)+'</span>';
    } else if(opt.tagHtml){
      h += opt.tagHtml;
    }
    h += '      <div class="gs-dd-item-info">';
    h += '        <div class="gs-dd-item-title">'+esc(opt.title)+'</div>';
    h += '      </div>';
    h += '    </div>';
    if(opt.notif){
      h += '    <span class="gs-dd-notif" title="'+opt.notif+' action'+(opt.notif===1?'':'s')+' needed">'+opt.notif+'</span>';
    }
    if(isAct){
      h += '    <span class="gs-dd-item-check"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg></span>';
    }
    h += '  </div>';
  });
  h += '    <div class="gs-dd-empty u-d-none">No matching results found</div>';
  h += '  </div>';

  h += '</div>';
  h += '</div>';
  return h;
}
ACT.gsToggleDropdown = (el, e) => {
  if(e) e.stopPropagation();
  const wrap = el.closest(".gs-dd-wrap");
  if(!wrap) return;
  const isOpen = wrap.classList.contains("open");
  closeAllDd();
  if(!isOpen){
    wrap.classList.add("open");
    const card = wrap.closest(".gs-mod-card");
    if(card) card.classList.add("has-open-dd");
    el.setAttribute("aria-expanded", "true");
    const inp = wrap.querySelector(".gs-dd-search-input");
    if(inp){
      inp.value = "";
      const items = wrap.querySelectorAll(".gs-dd-item");
      items.forEach(it => it.style.display = "");
      const empty = wrap.querySelector(".gs-dd-empty");
      if(empty) empty.style.display = "none";
      const clearBtn = wrap.querySelector(".gs-dd-search-clear");
      if(clearBtn) clearBtn.style.display = "none";
      setTimeout(() => { inp.focus(); }, 35);
    }
  }
};
ACT.gsClearDdLevel = (el, e) => {
  if(e) e.stopPropagation();
  const dd = el.dataset.dd;
  closeAllDd();
  GS_STATE.tenderTab = "overview";
  GS_STATE.tenderDocSubtab = "all";
  if(dd === "mp"){
    GS_STATE.pId = "";
    GS_STATE.spId = "";
    GS_STATE.tId = "";
    GS_STATE.docId = "";
    go("#/search");
  } else if(dd === "sp"){
    GS_STATE.spId = "";
    GS_STATE.tId = "";
    GS_STATE.docId = "";
    go(GS_STATE.pId ? "#/search/" + GS_STATE.pId : "#/search");
  } else if(dd === "t"){
    GS_STATE.tId = "";
    GS_STATE.docId = "";
    go(GS_STATE.pId && GS_STATE.spId ? "#/search/" + GS_STATE.pId + "/" + GS_STATE.spId : (GS_STATE.pId ? "#/search/" + GS_STATE.pId : "#/search"));
  } else if(dd === "doc"){
    GS_STATE.docId = "";
    go("#/search/" + GS_STATE.pId + "/" + GS_STATE.spId + "/" + GS_STATE.tId);
  }
};
ACT.gsPickOption = (el, e) => {
  if(e) e.stopPropagation();
  const dd = el.dataset.dd;
  const val = el.dataset.val || "";
  closeAllDd();
  GS_STATE.tenderTab = "overview";
  GS_STATE.tenderDocSubtab = "all";
  if(dd === "mp"){
    GS_STATE.pId = val;
    GS_STATE.spId = "";
    GS_STATE.tId = "";
    GS_STATE.docId = "";
    go(val ? "#/search/" + val : "#/search");
  } else if(dd === "sp"){
    if(!val){
      GS_STATE.spId = "";
      GS_STATE.tId = "";
      GS_STATE.docId = "";
      go(GS_STATE.pId ? "#/search/" + GS_STATE.pId : "#/search");
    } else {
      const sp = SP(val);
      if(sp){
        GS_STATE.pId = sp.projectId;
        GS_STATE.spId = val;
        GS_STATE.tId = "";
        GS_STATE.docId = "";
        go("#/search/" + sp.projectId + "/" + val);
      }
    }
  } else if(dd === "t"){
    if(!val){
      GS_STATE.tId = "";
      GS_STATE.docId = "";
      go(GS_STATE.pId && GS_STATE.spId ? "#/search/" + GS_STATE.pId + "/" + GS_STATE.spId : (GS_STATE.pId ? "#/search/" + GS_STATE.pId : "#/search"));
    } else {
      const t = T(val);
      if(t){
        const sp = spOf(t), p = projOf(t);
        GS_STATE.pId = p ? p.id : "";
        GS_STATE.spId = sp ? sp.id : "";
        GS_STATE.tId = val;
        GS_STATE.docId = "";
        go("#/search/" + (p ? p.id : "") + "/" + (sp ? sp.id : "") + "/" + val);
      }
    }
  } else if(dd === "doc"){
    if(!val){
      GS_STATE.docId = "";
      go("#/search/" + GS_STATE.pId + "/" + GS_STATE.spId + "/" + GS_STATE.tId);
    } else {
      const d = D(val);
      if(d){
        const t = T(d.tenderId), sp = spOf(t), p = projOf(t);
        GS_STATE.pId = p ? p.id : "";
        GS_STATE.spId = sp ? sp.id : "";
        GS_STATE.tId = t ? t.id : "";
        GS_STATE.docId = val;
        go("#/search/" + (p ? p.id : "") + "/" + (sp ? sp.id : "") + "/" + (t ? t.id : "") + "/" + val);
      }
    }
  }
};
ACT.gsDdFilter = (el) => {
  const q = (el.value || "").toLowerCase().trim();
  const menu = el.closest(".gs-dd-menu");
  if(!menu) return;
  const items = menu.querySelectorAll(".gs-dd-item");
  let visibleCount = 0;
  items.forEach(it => {
    const txt = (it.dataset.search || it.textContent).toLowerCase();
    const match = !q || txt.includes(q);
    it.style.display = match ? "" : "none";
    if(match) visibleCount++;
  });
  const empty = menu.querySelector(".gs-dd-empty");
  if(empty){
    empty.style.display = (visibleCount === 0) ? "block" : "none";
  }
  const clearBtn = menu.querySelector(".gs-dd-search-clear");
  if(clearBtn){
    clearBtn.style.display = q ? "inline-flex" : "none";
  }
};
ACT.gsDdClearInput = (el, e) => {
  if(e) e.stopPropagation();
  const header = el.closest(".gs-dd-search-header");
  if(!header) return;
  const inp = header.querySelector(".gs-dd-search-input");
  if(inp){
    inp.value = "";
    inp.focus();
    ACT.gsDdFilter(inp);
  }
};

export function initSearchDropdowns(){
  document.addEventListener("click", e => {
    if(!e.target.closest(".gs-dd-wrap")){
      closeAllDd();
    }
    if(!e.target.closest(".gs-pipeline-search-wrap")){
      if(GS_STATE.searchDropdownOpen){
        GS_STATE.searchDropdownOpen = false;
        const dd = document.getElementById("gsSearchDropdown");
        if(dd) dd.remove();
      }
    } else if(e.target && e.target.id === "gsMainQuery"){
      if(GS_STATE.query && !GS_STATE.searchDropdownOpen){
        GS_STATE.searchDropdownOpen = true;
        render(true);
        const inp = document.getElementById("gsMainQuery");
        if(inp){
          inp.focus();
          inp.selectionStart = inp.selectionEnd = inp.value.length;
        }
      }
    }
  });
  document.addEventListener("keydown", e => {
    if(e.key === "Escape"){
      closeAllDd();
      if(GS_STATE.searchDropdownOpen){
        GS_STATE.searchDropdownOpen = false;
        const dd = document.getElementById("gsSearchDropdown");
        if(dd) dd.remove();
        return;
      }
      return;
    }
    if(e.target && e.target.id === "gsMainQuery" && e.key === "Enter"){
      const dd = document.getElementById("gsSearchDropdown");
      if(dd){
        const firstItem = dd.querySelector(".gs-search-dd-item");
        if(firstItem){
          e.preventDefault();
          ACT.gsGoLineage(firstItem, e);
          return;
        }
      }
    }
    const trigger = e.target.closest(".gs-dd-trigger");
    if(trigger && (e.key === "Enter" || e.key === " ") && !e.target.closest(".gs-dd-clear-btn")){
      e.preventDefault();
      ACT.gsToggleDropdown(trigger, e);
      return;
    }
    const inp = e.target.closest(".gs-dd-search-input");
    if(inp && e.key === "Enter"){
      e.preventDefault();
      const menu = inp.closest(".gs-dd-menu");
      if(!menu) return;
      const items = Array.from(menu.querySelectorAll(".gs-dd-item")).filter(it => it.style.display !== "none");
      const nonAll = items.find(it => !it.classList.contains("is-all"));
      const target = nonAll || items[0];
      if(target && target.dataset.act && ACT[target.dataset.act]){
        ACT[target.dataset.act](target, e);
      }
    }
  });
  window.addEventListener("hashchange", closeAllDd);
  window.addEventListener("resize", closeAllDd);
}

/* Sidebar navigation, collapse state and sign-out. */
import { PS } from "../core/constants.js";
import { T, me } from "../core/model.js";
import { isAdmin, isProjectLeadUser, isTEC } from "../core/permissions.js";
import { ACT } from "../core/registry.js";
import { go, parse } from "../core/router.js";
import { S } from "../core/store.js";
import { cntActs, refreshActs, reqTasks } from "../core/tasks.js";
import { resetSearchState } from "../pages/home/state.js";
import { openModal, toast } from "../ui/feedback.js";
import { esc } from "../ui/format.js";
import { lock } from "./login.js";

/* nav */
let SIDEBAR_COLLAPSED = false;
try {
  SIDEBAR_COLLAPSED = localStorage.getItem("tender_proto_sidebar_collapsed") === "true";
} catch(e){}
function navIcon(r){
  const m={
    search:'<svg class="nav-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
    dashboard:'<svg class="nav-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>',
    users:'<svg class="nav-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
    catalogue:'<svg class="nav-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path><line x1="12" y1="6" x2="16" y2="6"></line><line x1="12" y1="10" x2="16" y2="10"></line></svg>',
    tec:'<svg class="nav-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>',
    library:'<svg class="nav-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>'
  };
  return m[r]||m.search;
}
let TENDER_PREP_EXPANDED = true;
try {
  const stored = localStorage.getItem("tender_proto_prep_expanded");
  if(stored !== null) TENDER_PREP_EXPANDED = stored === "true";
} catch(e){}
function renderTenderPrepNav(){
  const isExpanded = TENDER_PREP_EXPANDED;
  let h = '<div class="side-menu-group" id="sideTenderPrepGroup">';
  h += '  <button type="button" class="side-menu-toggle" data-act="toggleTenderPrep" aria-expanded="'+isExpanded+'" title="'+(isExpanded ? 'Collapse ' : 'Expand ')+'Tender Preparation">';
  h += '    <span class="nav-left">';
  h += '      <svg class="nav-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
  h += '        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>';
  h += '        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>';
  h += '        <path d="M9 12h6"></path><path d="M9 16h6"></path>';
  h += '      </svg>';
  h += '      <span class="nav-label">Tender Preparation</span>';
  h += '    </span>';
  h += '    <svg class="side-menu-chevron'+(isExpanded ? '' : ' collapsed')+'" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>';
  h += '  </button>';

  h += '  <div class="side-sub-menu'+(isExpanded ? '' : ' u-d-none')+'">';
  h += '    <button type="button" class="side-sub-item" data-act="newProject" title="Create master project">';
  h += '      <span class="nav-left">';
  h += '        <svg class="nav-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
  h += '          <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line>';
  h += '        </svg>';
  h += '        <span class="nav-label">Create master project</span>';
  h += '      </span>';
  h += '    </button>';
  h += '  </div>';
  h += '</div>';
  return h;
}
function navItems(u){
  const taskCount = reqTasks(u).length;
  const items=[
    {l:"Home",h:"#/search",r:"search"},
    {l:"My Tasks",h:"#/dashboard",r:"dashboard",n:taskCount}
  ];
  if(isAdmin(u))items.push({l:"Users",h:"#/users",r:"users"});
  if(isProjectLeadUser(u)){
    items.push({isPrepGroup:true});
  }
  items.push({l:"Document library",h:"#/library",r:"library"});
  if(isAdmin(u))items.push({l:"Document catalogue",h:"#/catalogue",r:"catalogue"});
  if(S.tenders.some(t=>isTEC(u,t)))items.push({l:"TEC inbox",h:"#/tec",r:"tec",n:S.packages.filter(p=>p.status===PS.TEC&&isTEC(u,T(p.tenderId))&&!p.tecViews[u.id]).length});
  return items;
}
const AREA={users:["invite"],library:["review"],tec:["tecApprove","tecRead"]};
export function renderNav(r){r=r||parse();refreshActs();
  const shell=document.querySelector(".shell");
  if(shell) shell.classList.toggle("sidebar-collapsed", SIDEBAR_COLLAPSED);
  const nav=document.getElementById("nav");
  if(nav) nav.classList.toggle("collapsed", SIDEBAR_COLLAPSED);
  const u=me(),items=navItems(u);items.forEach(i=>{if(i.r && AREA[i.r])i.n=cntActs(AREA[i.r]);});const cur=r.name;
  const collapseIco = SIDEBAR_COLLAPSED ?
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><polyline points="13 10 15 12 13 14"></polyline></svg>' :
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><polyline points="15 10 13 12 15 14"></polyline></svg>';

  let h='<div class="side-head">'+
    '<span class="side-head-label">App name</span>'+
    '<button type="button" class="side-collapse-btn" data-act="toggleSidebar" title="'+(SIDEBAR_COLLAPSED?'Expand sidebar':'Collapse sidebar')+'" aria-label="'+(SIDEBAR_COLLAPSED?'Expand sidebar':'Collapse sidebar')+'">'+
      collapseIco+
    '</button>'+
  '</div>'+
  '<div class="side-nav">';
  items.forEach(i=>{
    if(i.isPrepGroup){h+=renderTenderPrepNav();return;}
    const ico = navIcon(i.r);
    h+='<a href="'+i.h+'"'+(cur===i.r?' aria-current="page"':"")+' title="'+esc(i.l)+'">'+
      '<span class="nav-left">'+ico+'<span class="nav-label">'+esc(i.l)+'</span></span>'+
      (i.n?'<span class="n" aria-label="'+i.n+' to do">'+i.n+'</span>':"")+
    '</a>';
  });
  h+='</div>';
  h+='<div class="who">'+
    '<div class="who-avatar" title="'+esc(u.name)+' ('+esc(u.role||u.title||"")+')">'+
      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'+
    '</div>'+
    '<div class="who-info">'+
      '<b>'+esc(u.name)+'</b>'+
      '<span>'+esc(u.role||u.title||"")+'</span>'+
    '</div>'+
    '<button class="who-logout" type="button" data-act="logout" title="Log out" aria-label="Log out">'+
      '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>'+
    '</button>'+
  '</div>';
  document.getElementById("nav").innerHTML=h;
}
ACT.toggleTenderPrep=()=>{
  if(SIDEBAR_COLLAPSED){
    SIDEBAR_COLLAPSED = false;
    try { localStorage.setItem("tender_proto_sidebar_collapsed", "false"); } catch(e){}
    TENDER_PREP_EXPANDED = true;
    try { localStorage.setItem("tender_proto_prep_expanded", "true"); } catch(e){}
    renderNav();
    return;
  }
  TENDER_PREP_EXPANDED = !TENDER_PREP_EXPANDED;
  try {
    localStorage.setItem("tender_proto_prep_expanded", TENDER_PREP_EXPANDED ? "true" : "false");
  } catch(e){}
  renderNav();
};
ACT.toggleSidebar=()=>{
  SIDEBAR_COLLAPSED = !SIDEBAR_COLLAPSED;
  try {
    localStorage.setItem("tender_proto_sidebar_collapsed", SIDEBAR_COLLAPSED ? "true" : "false");
  } catch(e){}
  const shell=document.querySelector(".shell");
  const nav=document.getElementById("nav");
  if(shell) shell.classList.toggle("sidebar-collapsed", SIDEBAR_COLLAPSED);
  if(nav) nav.classList.toggle("collapsed", SIDEBAR_COLLAPSED);
  renderNav();
};
ACT.logout=()=>openModal({title:"Log out",body:'<p>You are currently signed in as <b>'+esc(me().name)+'</b> ('+esc(me().role||"User")+').</p>',submit:"Log out",onSubmit:()=>{resetSearchState();lock();go("#/search");toast("You have been logged out.");}});

export function initSidebar(){
  document.addEventListener("keydown",e=>{
    if((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==="b"){
      const el=document.activeElement;
      if(el && (el.tagName==="INPUT"||el.tagName==="TEXTAREA"||el.isContentEditable)) return;
      e.preventDefault();
      ACT.toggleSidebar();
    }
  });
}

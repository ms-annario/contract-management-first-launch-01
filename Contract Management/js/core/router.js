/* Hash router: parses the address, renders the matching page and tracks navigation history. */
import { me } from "./model.js";
import { ROUTES, route } from "./registry.js";
import { S, save } from "./store.js";
import { refreshActs } from "./tasks.js";
import { renderNav } from "../layout/sidebar.js";
import { gsRedirectHash } from "../pages/home/search-engine.js";
import { esc } from "../ui/format.js";
import { initSortableHeaders } from "../ui/table-sort.js";

/* Extra renderers that run after every page render (the prototype's role switcher uses this) */
const renderHooks=[];
export function onRender(fn){renderHooks.push(fn);}
export let afterRender=[];
export function parse(){const raw=(location.hash||"#/search").slice(2);const qIdx=raw.indexOf("?");const pathPart=qIdx>=0?raw.slice(0,qIdx):raw;const h=pathPart.split("/");return {name:h[0]||"search",args:h.slice(1)};}
export function go(h){if(location.hash===h)render();else location.hash=h;}
export function denied(msg){return '<h1>Not available for this role</h1><p class="sub">'+esc(msg||"Switch role in the header to see this page.")+'</p><a class="btn sec" href="#/dashboard">Go to My Tasks</a>';}
/* Breadcrumb origin: the last top-level page the user visited */
const HUBS={search:"Home",dashboard:"My Tasks",library:"Document library",tec:"TEC inbox",users:"Users",catalogue:"Document catalogue"};
function trackNav(r){if(HUBS[r.name])try{sessionStorage.setItem("tender_proto_hub",JSON.stringify({hash:"#/"+r.name,label:HUBS[r.name]}));}catch(e){}}
export function currentOrigin(){try{const s=sessionStorage.getItem("tender_proto_hub");if(s)return JSON.parse(s);}catch(e){}return {hash:"#/dashboard",label:"My Tasks"};}
export let routeStack=[];
export function render(keepScroll){
  let r=parse();const u=me();afterRender=[];
  if(u.status!=="Active"){S.me="u-admin";save();}
  const red=gsRedirectHash(r);if(red){history.replaceState(null,"",red);r=parse();}
  trackNav(r);
  const curHash=location.hash||"#/search";
  if(!routeStack.length||routeStack[routeStack.length-1]!==curHash){
    routeStack.push(curHash);
    if(routeStack.length>30)routeStack.shift();
  }
  refreshActs();
  const fn=ROUTES[r.name]||ROUTES.home;
  let html;try{html=fn(...r.args);}catch(e){console.error(e);html=denied("This page could not be shown. "+e.message);}
  const v=document.getElementById("view");const y=window.scrollY;
  v.innerHTML=html;renderNav(r);renderHooks.forEach(f=>f());
  afterRender.forEach(f=>f());
  initSortableHeaders();
  if(keepScroll)window.scrollTo(0,y);else{window.scrollTo(0,0);}
}
export function rerender(){save();render(true);}
/* Old addresses (notifications, bookmarks) open their current equivalents */
["home","projects","board","tenders"].forEach(n=>route(n,()=>{go("#/search");return "";}));
["mydocs","approvals","contracts","evaluation"].forEach(n=>route(n,()=>{go("#/dashboard");return "";}));

export function initRouter(){
  window.addEventListener("hashchange",()=>render());
}

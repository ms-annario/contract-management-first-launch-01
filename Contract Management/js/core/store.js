/* Application state, persisted to localStorage, with hooks for seeding and migrating it. */

const STORE="tender-workspace-proto-nodata-v1";
export let S;
/* The prototype supplies sample data and migrations through these hooks,
   so the app itself never depends on prototype code. */
const hooks={seed:emptyState,migrate:null,afterLoad:[]};
export function useSeed(fn){hooks.seed=fn;}
export function useMigration(fn){hooks.migrate=fn;}
export function onLoad(fn){hooks.afterLoad.push(fn);}
export function setState(next){S=next;}
function emptyState(){return {seq:500,me:null,companies:[],teams:[],users:[],catalogue:[],projects:[],subprojects:[],tenders:[],docs:[],metrics:[],history:[],packages:[],notes:[],activity:[]};}
export function load(){try{const raw=localStorage.getItem(STORE);if(raw)S=JSON.parse(raw);}catch(e){}if(!S)S=hooks.seed();if(hooks.migrate)hooks.migrate();hooks.afterLoad.forEach(f=>f());}
export function save(){try{localStorage.setItem(STORE,JSON.stringify(S));}catch(e){}}
export const uid=p=>p+"-"+(++S.seq);

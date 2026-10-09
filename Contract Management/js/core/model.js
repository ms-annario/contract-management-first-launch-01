/* Lookups and record-keeping helpers over the application state. */
import { DS } from "./constants.js";
import { S } from "./store.js";

export const byId=(arr,id)=>arr.find(x=>x.id===id);
export const U=id=>byId(S.users,id)||{id,name:"Unknown",teamId:null};
export const T=id=>byId(S.tenders,id), D=id=>byId(S.docs,id), SP=id=>byId(S.subprojects,id), PR=id=>byId(S.projects,id), PK=id=>byId(S.packages,id);
export const team=u=>byId(S.teams,u&&u.teamId)||{};
export const me=()=>U(S.me);
function getTenderDivisionUser(){return S.users.find(x=>x.id==="u-td"||(x.title&&x.title.toLowerCase().includes("tender division"))||x.teamId==="t-td")||{id:"u-td",name:"Oliver Smith",email:"oliver.smith@harbourline.example",title:"Tender division"};}
export function tenderDivisionEmail(){const td=getTenderDivisionUser();return (td&&td.email)?td.email:"oliver.smith@harbourline.example";}
export const docsOf=t=>S.docs.filter(d=>d.tenderId===t.id);
export const reqDocs=t=>docsOf(t).filter(d=>d.status!==DS.NR);
export const pkgOf=t=>S.packages.filter(p=>p.tenderId===t.id).sort((a,b)=>b.version-a.version)[0]||null;
export const tendersOf=sp=>S.tenders.filter(t=>t.spId===sp.id);
export const spOf=t=>SP(t.spId), projOf=t=>PR(spOf(t).projectId);
/* ---------- Record keeping and document actions ---------- */
export function touchDoc(d){d.updatedAt=Date.now();d.updatedBy=S.me;}
export function touchProj(p){p.updatedAt=Date.now();p.updatedBy=S.me;}
export function touchSp(sp){sp.updatedAt=Date.now();sp.updatedBy=S.me;}
export const lastUpd=d=>{if(d.updatedAt)return {at:d.updatedAt,by:d.updatedBy};const a=S.activity.filter(x=>x.docId===d.id).sort((x,y)=>y.at-x.at)[0],v=d.versions.slice(-1)[0];
  if(a&&(!v||a.at>=v.at))return {at:a.at,by:a.by};if(v)return {at:v.at,by:v.by};return {at:d.createdAt||null,by:d.ownerId||null};};

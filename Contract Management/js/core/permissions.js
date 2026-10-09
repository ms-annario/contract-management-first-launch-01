/* Who can see, edit and comment on projects, tenders and documents. */
import { DRAFTY, DS, EDITABLE, PS, ROLE_OF, isApproved } from "./constants.js";
import { PR, T, U, pkgOf, projOf, spOf, team, tendersOf } from "./model.js";
import { S } from "./store.js";

export const isAdmin=u=>u.sys==="admin";
export const canCreateProject=u=>u.creator||isAdmin(u);
export const isPL=(u,p)=>p&&p.leadId===u.id;
export const isSPL=(u,sp)=>sp&&sp.leadId===u.id;
export const isIC=(u,t)=>t&&t.icId===u.id;
const isSME=(u,t)=>t&&t.smes.some(s=>s.userId===u.id);
export const isCR=u=>!!team(u).cr||(!!u&&u.role==="Contracts team reviewer");
export const isTEC=(u,t)=>t&&t.tec.some(m=>m.userId===u.id);
function spMembers(sp){const s=new Set([sp.leadId,...sp.members]);tendersOf(sp).forEach(t=>{if(t.icId)s.add(t.icId);t.smes.forEach(x=>s.add(x.userId));});s.delete(null);return [...s];}
export const isMember=(u,sp)=>spMembers(sp).includes(u.id)||isPL(u,PR(sp.projectId));
export const isSuperiorOf=(u,ownerId)=>U(ownerId).superiorId===u.id;
export function canSeeTender(u,t){const p=pkgOf(t);return isPL(u,projOf(t))||isMember(u,spOf(t))||(isCR(u)&&p&&p.status!==PS.COL)||(u.role==="t-td"&&p&&p.status===PS.TD);}
export function canSeeDoc(u,d){if(isApproved(d))return true;const t=T(d.tenderId);if(DRAFTY.includes(d.status)&&!d.versions.length)return d.ownerId===u.id||isIC(u,t)||isSuperiorOf(u,d.ownerId);return canSeeTender(u,t)||isSuperiorOf(u,d.ownerId);}
export function isProjectLeadUser(u){
  if(!u) return false;
  if(u.role) return u.role === "Project lead";
  return (typeof ROLE_OF !== "undefined" && ROLE_OF[u.id] === "Project lead");
}
export function userRelatesToTender(u, t){
  if(!u || !t) return false;
  if(isProjectLeadUser(u)) return true;
  const sp = spOf(t);
  if(sp && isSPL(u, sp)) return true;
  if(sp && (sp.members || []).includes(u.id)) return true;
  if(isIC(u, t)) return true;
  if(isSME(u, t)) return true;
  if(isTEC(u, t)) return true;
  if(S.docs.some(d => d.tenderId === t.id && (d.ownerId === u.id || isSuperiorOf(u, d.ownerId) || (d.comments || []).some(c => c.by === u.id)))) return true;
  if(isCR(u) && S.packages.some(pk => pk.tenderId === t.id)) return true;
  const p = sp ? PR(sp.projectId) : null;
  if(p && isPL(u, p)) return true;
  return false;
}
export function userRelatesToSubproject(u, sp){
  if(!u || !sp) return false;
  if(isProjectLeadUser(u)) return true;
  if(isSPL(u, sp)) return true;
  if((sp.members || []).includes(u.id)) return true;
  const spTs = tendersOf(sp);
  if(spTs.some(t => userRelatesToTender(u, t))) return true;
  const p = PR(sp.projectId);
  if(p && isPL(u, p)) return true;
  return false;
}
export function userRelatesToProject(u, p){
  if(!u || !p) return false;
  if(isProjectLeadUser(u)) return true;
  if(isPL(u, p)) return true;
  const prSps = S.subprojects.filter(sp => sp.projectId === p.id);
  if(prSps.some(sp => userRelatesToSubproject(u, sp))) return true;
  return false;
}
export function canEditDoc(u,d){const t=T(d.tenderId);if(!t||t.manual)return false;if(d.ownerId===u.id&&EDITABLE.includes(d.status))return true;return isIC(u,t)&&d.status===DS.NS;}
export function canComment(u,d){const t=T(d.tenderId);if(!t||t.manual)return false;const p=pkgOf(t);if([DS.NS,DS.DR,DS.IR,DS.RT].includes(d.status)&&isMember(u,spOf(t)))return true;
  return isCR(u)&&p&&p.status===PS.ICR&&p.items.some(i=>i.docId===d.id);}

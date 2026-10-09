/* Home page search, task targeting and redirects. */
import { DS } from "../../core/constants.js";
import { D, PK, PR, SP, T, U, me, projOf, spOf } from "../../core/model.js";
import { canSeeDoc, canSeeTender, isProjectLeadUser, userRelatesToProject, userRelatesToSubproject, userRelatesToTender } from "../../core/permissions.js";
import { spStatus, tStatus } from "../../core/progress.js";
import { S } from "../../core/store.js";
import { myTasks } from "../../core/tasks.js";
import { GS_STATE } from "./state.js";
import { esc } from "../../ui/format.js";

/* Map each required task of the user to where its NEXT action happens in the lineage */
export function gsTaskTargets(u){
  const out = [];
  const DOC_K = ["publish","own","comments","approve","review"];
  const TENDER_K = ["assignIC","nominateTec","assignSme","metrics","chooseDocs","assignOwner","collate"];
  const PKG_K = ["tecApprove","sendCR","resendCR","sendTD","crReview","tecRead"];
  myTasks(u).filter(tk => !tk.opt).forEach(tk => {
    const parts = tk.key.split(":"), kind = parts[0], id = parts[1];
    let level = "", d = null, t = null, sp = null, p = null;
    if(DOC_K.includes(kind)){ d = D(id); if(!d) return; t = T(d.tenderId); if(!t) return; level = "doc"; }
    else if(TENDER_K.includes(kind)){ t = T(id); if(!t) return; level = "tender"; }
    else if(PKG_K.includes(kind)){ const pk = PK(id); if(!pk) return; t = T(pk.tenderId); if(!t) return; level = "tender"; }
    else if(kind === "appointLead"){ sp = SP(id); if(!sp) return; level = "subproject"; }
    else if(kind === "createTenders"){ sp = SP(id); if(!sp) return; level = "subproject"; }
    else if(kind === "addSp"){ p = PR(id); if(!p) return; level = "project"; }
    else if(kind === "firstProject"){ level = "project"; }
    else return;
    if(t) sp = spOf(t) || sp;
    if(sp) p = PR(sp.projectId) || p;
    out.push({ key: tk.key, what: tk.what, level, pId: p ? p.id : "", spId: sp ? sp.id : "", tId: t ? t.id : "", docId: d ? d.id : "" });
  });
  return out;
}
/* Send legacy tender / document / package links into the search template */
export function gsRedirectHash(r){
  const u = me(), pl = isProjectLeadUser(u);
  const lineage = t => { const sp = spOf(t), p = projOf(t); return (sp && p) ? { sp, p } : null; };
  const base = (L, t) => "#/search/" + L.p.id + "/" + L.sp.id + "/" + t.id;
  if(r.name === "tender" && r.args[0]){
    const t = T(r.args[0]); if(!t || !(pl || userRelatesToTender(u, t))) return null;
    const L = lineage(t); if(!L) return null;
    GS_STATE.tId = t.id; GS_STATE.docId = "";
    GS_STATE.tenderTab = r.args[1] || "overview";
    GS_STATE.tenderDocSubtab = r.args[2] || "all";
    return base(L, t);
  }
  if(r.name === "doc" && r.args[0]){
    const d = D(r.args[0]); if(!d) return null;
    const t = T(d.tenderId); if(!t) return null;
    if(!canSeeDoc(u, d) || !(pl || userRelatesToTender(u, t))) return null;
    const L = lineage(t); if(!L) return null;
    GS_STATE.tId = t.id; GS_STATE.docId = d.id;
    return base(L, t) + "/" + d.id;
  }
  if(r.name === "package" && r.args[0]){
    const pk = PK(r.args[0]); if(!pk) return null;
    const t = T(pk.tenderId); if(!t || !canSeeTender(u, t) || !(pl || userRelatesToTender(u, t))) return null;
    const L = lineage(t); if(!L) return null;
    GS_STATE.tId = t.id; GS_STATE.docId = "";
    GS_STATE.tenderTab = "package";
    return base(L, t);
  }
  return null;
}
export function highlightMatch(text, q){
  if(!text) return "";
  const safeText = esc(text);
  if(!q) return safeText;
  const escQ = esc(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try {
    const rx = new RegExp('(' + escQ + ')', 'gi');
    return safeText.replace(rx, '<mark class="gs-hl">$1</mark>');
  } catch(e){
    return safeText;
  }
}
export function executeUniversalSearch(q, curUser){
  const cleanQ = (q || "").trim().toLowerCase();
  if(!cleanQ) return {
    query: "",
    projects: [],
    subprojects: [],
    tenders: [],
    docs: [],
    totalCount: 0,
    pIdsWithMatches: new Set(),
    spIdsWithMatches: new Set(),
    tIdsWithMatches: new Set(),
    docIdsWithMatches: new Set()
  };

  const isProjLead = isProjectLeadUser(curUser);

  // 1. Projects
  const allowedProjects = isProjLead ? S.projects : S.projects.filter(p => userRelatesToProject(curUser, p));
  const matchedProjects = [];
  allowedProjects.forEach(p => {
    const searchFields = [p.name, p.code].filter(Boolean).join(" ");
    if(searchFields.toLowerCase().includes(cleanQ)){
      matchedProjects.push({
        type: "project",
        id: p.id,
        project: p,
        title: p.name,
        code: p.code,
        status: p.status,
        metaText: "",
        snippet: "",
        lineagePath: [p.code],
        pId: p.id,
        spId: "",
        tId: "",
        docId: ""
      });
    }
  });

  // 2. Sub-projects
  const allowedSps = isProjLead ? S.subprojects : S.subprojects.filter(sp => userRelatesToSubproject(curUser, sp));
  const matchedSps = [];
  allowedSps.forEach(sp => {
    const p = PR(sp.projectId);
    if(!p) return;
    if(!isProjLead && !userRelatesToProject(curUser, p)) return;
    const searchFields = sp.name || "";
    if(searchFields.toLowerCase().includes(cleanQ)){
      matchedSps.push({
        type: "subproject",
        id: sp.id,
        subproject: sp,
        project: p,
        title: sp.name,
        code: p.code,
        status: typeof spStatus === "function" ? spStatus(sp) : (sp.status || "Active"),
        metaText: "",
        snippet: "",
        lineagePath: [p.code, sp.name],
        pId: p.id,
        spId: sp.id,
        tId: "",
        docId: ""
      });
    }
  });

  // 3. Tenders
  const allowedTenders = isProjLead ? S.tenders : S.tenders.filter(t => userRelatesToTender(curUser, t));
  const matchedTenders = [];
  allowedTenders.forEach(t => {
    const sp = spOf(t);
    const p = projOf(t);
    if(!sp || !p) return;
    if(!isProjLead && (!userRelatesToSubproject(curUser, sp) || !userRelatesToProject(curUser, p))) return;
    const searchFields = [t.title, t.code].filter(Boolean).join(" ");
    if(searchFields.toLowerCase().includes(cleanQ)){
      matchedTenders.push({
        type: "tender",
        id: t.id,
        tender: t,
        subproject: sp,
        project: p,
        title: t.title,
        code: t.code,
        status: tStatus(t),
        metaText: "",
        snippet: "",
        lineagePath: [p.code, sp.name, t.code],
        pId: p.id,
        spId: sp.id,
        tId: t.id,
        docId: ""
      });
    }
  });

  // 4. Documents (all files)
  const allowedDocs = isProjLead ? S.docs.filter(d => d.status !== DS.NR) : S.docs.filter(d => d.status !== DS.NR && canSeeDoc(curUser, d));
  const matchedDocs = [];
  allowedDocs.forEach(d => {
    const t = T(d.tenderId);
    if(!t) return;
    const sp = spOf(t);
    const p = projOf(t);
    if(!sp || !p) return;
    if(!isProjLead && (!userRelatesToTender(curUser, t) || !userRelatesToSubproject(curUser, sp) || !userRelatesToProject(curUser, p))) return;
    const searchFields = d.name || "";
    if(searchFields.toLowerCase().includes(cleanQ)){
      matchedDocs.push({
        type: "doc",
        id: d.id,
        doc: d,
        tender: t,
        subproject: sp,
        project: p,
        title: d.name,
        code: t.code,
        spec: d.spec,
        status: d.status,
        audience: d.audience,
        owner: d.ownerId ? U(d.ownerId) : null,
        metaText: "",
        snippet: "",
        lineagePath: [p.code, sp.name, t.code, d.name],
        pId: p.id,
        spId: sp.id,
        tId: t.id,
        docId: d.id
      });
    }
  });

  const pIdsWithMatches = new Set([
    ...matchedProjects.map(m => m.pId),
    ...matchedSps.map(m => m.pId),
    ...matchedTenders.map(m => m.pId),
    ...matchedDocs.map(m => m.pId)
  ]);
  const spIdsWithMatches = new Set([
    ...matchedSps.map(m => m.spId),
    ...matchedTenders.map(m => m.spId),
    ...matchedDocs.map(m => m.spId)
  ]);
  const tIdsWithMatches = new Set([
    ...matchedTenders.map(m => m.tId),
    ...matchedDocs.map(m => m.tId)
  ]);
  const docIdsWithMatches = new Set(matchedDocs.map(m => m.docId));

  const totalCount = matchedProjects.length + matchedSps.length + matchedTenders.length + matchedDocs.length;
  return {
    query: cleanQ,
    projects: matchedProjects,
    subprojects: matchedSps,
    tenders: matchedTenders,
    docs: matchedDocs,
    totalCount: totalCount,
    pIdsWithMatches: pIdsWithMatches,
    spIdsWithMatches: spIdsWithMatches,
    tIdsWithMatches: tIdsWithMatches,
    docIdsWithMatches: docIdsWithMatches
  };
}

/* Activity feed rendering and the change-log dialog. */
import { D, PR, SP, T, docsOf, me, pkgOf, tendersOf } from "../core/model.js";
import { isAdmin, isProjectLeadUser, userRelatesToProject, userRelatesToSubproject, userRelatesToTender } from "../core/permissions.js";
import { ACT } from "../core/registry.js";
import { S } from "../core/store.js";
import { M, openModal } from "./feedback.js";
import { esc, fmtDT, uname } from "./format.js";

function actLink(a){
  if(a.link) return a.link;
  const tid = a.tenderId;
  const t = tid ? T(tid) : null;
  const txt = (a.text || "").toLowerCase();

  // 1. Direct document match by a.docId
  if(a.docId && D(a.docId)) {
    return "#/doc/" + a.docId;
  }

  // 2. Document name match within tender documents
  if(t) {
    const ds = docsOf(t);
    const matchedDoc = ds.filter(d => txt.includes(d.name.toLowerCase()))
                         .sort((x, y) => y.name.length - x.name.length)[0];
    if(matchedDoc) return "#/doc/" + matchedDoc.id;
  }

  // 3. Document general actions / catalogue / drafting
  if(txt.includes("document") || txt.includes("catalogue") || txt.includes("recommendation") || txt.includes("drafting") || txt.includes("revising") || txt.includes("reopened") || txt.includes("flagged") || txt.includes("collate")) {
    if(t) return "#/tender/" + t.id + "/documents";
  }

  // 4. Package actions
  if(txt.includes("package") || txt.includes("contracts review") || txt.includes("tec approved") || txt.includes("submitted to tec") || txt.includes("post-tec") || txt.includes("finalised")) {
    if(t) {
      const p = pkgOf(t);
      if(p) return "#/package/" + p.id;
      return "#/tender/" + t.id + "/documents";
    }
  }

  // 5. Team / IC / SME / members / lead
  if(txt.includes("sme") || txt.includes(" ic") || txt.includes("project ic") || txt.includes("team") || txt.includes("assigned owners") || txt.includes("lead")) {
    if(t) return "#/tender/" + t.id + "/team";
  }

  // 6. Success metrics
  if(txt.includes("metric")) {
    if(t) return "#/tender/" + t.id + "/metrics";
  }

  // 7. Tender overview fallback
  if(t) {
    return "#/tender/" + t.id + "/overview";
  }

  // 8. Sub-project link
  if(a.spId && SP(a.spId)) {
    const sp = SP(a.spId);
    return "#/search/" + sp.projectId + "/" + sp.id;
  }

  // 9. Master project link
  if(a.projectId) {
    return "#/search/" + a.projectId;
  }

  return null;
}
function formatActText(a, link){
  if(!link) return esc(a.text);
  const txt = a.text || "";

  // 1. Direct doc match by a.docId
  if(a.docId && D(a.docId)) {
    const d = D(a.docId);
    const idx = txt.toLowerCase().indexOf(d.name.toLowerCase());
    if(idx >= 0) {
      return esc(txt.slice(0, idx)) +
        '<a href="' + link + '" class="feed-target-link" title="Open ' + esc(d.name) + '">' + esc(txt.slice(idx, idx + d.name.length)) + '</a>' +
        esc(txt.slice(idx + d.name.length));
    }
  }

  // 2. Doc match by tender documents
  if(a.tenderId && T(a.tenderId)) {
    const ds = docsOf(T(a.tenderId))
      .filter(d => txt.toLowerCase().includes(d.name.toLowerCase()))
      .sort((x, y) => y.name.length - x.name.length);
    if(ds.length) {
      const d = ds[0];
      const idx = txt.toLowerCase().indexOf(d.name.toLowerCase());
      return esc(txt.slice(0, idx)) +
        '<a href="' + link + '" class="feed-target-link" title="Open ' + esc(d.name) + '">' + esc(txt.slice(idx, idx + d.name.length)) + '</a>' +
        esc(txt.slice(idx + d.name.length));
    }
  }

  // 3. Role / IC / SME assignments
  const mRole = txt.match(/^assigned (.+) as (.+)$/i);
  if(mRole) {
    return 'assigned ' + esc(mRole[1]) + ' as <a href="' + link + '" class="feed-target-link" title="View team">' + esc(mRole[2]) + '</a>';
  }
  const mLead = txt.match(/^changed sub-project lead to (.+)$/i);
  if(mLead) {
    return 'changed sub-project lead to <a href="' + link + '" class="feed-target-link" title="View team">' + esc(mLead[1]) + '</a>';
  }
  const mAppLead = txt.match(/^appointed (.+) as sub-project lead(?: for (.+))?$/i);
  if(mAppLead) {
    return 'appointed ' + esc(mAppLead[1]) + ' as sub-project lead' + (mAppLead[2] ? ' for <a href="' + link + '" class="feed-target-link">' + esc(mAppLead[2]) + '</a>' : '');
  }
  const mRemove = txt.match(/^removed (.+) from the team$/i);
  if(mRemove) {
    return 'removed ' + esc(mRemove[1]) + ' from <a href="' + link + '" class="feed-target-link" title="View team">the team</a>';
  }

  // 3b. Master project & Sub-project creation & details
  const mProj = txt.match(/^created master project (.+)$/i);
  if(mProj) {
    return 'created master project <a href="' + link + '" class="feed-target-link" title="View master project">' + esc(mProj[1]) + '</a>';
  }
  const mSpAdd = txt.match(/^(?:added|created) sub-project (.+)$/i);
  if(mSpAdd) {
    return 'added sub-project <a href="' + link + '" class="feed-target-link" title="View sub-project">' + esc(mSpAdd[1]) + '</a>';
  }
  if(txt.includes("master project details")) {
    return 'updated <a href="' + link + '" class="feed-target-link" title="View master project">master project details</a>';
  }
  if(txt.includes("sub-project details")) {
    return 'updated <a href="' + link + '" class="feed-target-link" title="View sub-project">sub-project details</a>';
  }

  // 4. Tender creation & details
  if(txt === "created the tender") {
    return 'created <a href="' + link + '" class="feed-target-link" title="View tender overview">the tender</a>';
  }
  if(txt === "edited the tender details") {
    return 'edited <a href="' + link + '" class="feed-target-link" title="View tender overview">the tender details</a>';
  }
  const mTecNom = txt.match(/^nominated (\d+) TEC members$/i);
  if(mTecNom) {
    return 'nominated <a href="' + link + '" class="feed-target-link" title="View TEC committee">' + esc(mTecNom[1]) + ' TEC members</a>';
  }

  // 5. Documents / Catalogue
  if(txt.includes("assigned owners")) {
    const idx = txt.indexOf("assigned owners");
    return esc(txt.slice(0, idx)) + '<a href="' + link + '" class="feed-target-link" title="View documents">assigned owners</a>' + esc(txt.slice(idx + 15));
  }
  if(txt.includes("from the catalogue")) {
    const idx = txt.indexOf("from the catalogue");
    return esc(txt.slice(0, idx)) + 'from <a href="' + link + '" class="feed-target-link" title="View catalogue">the catalogue</a>' + esc(txt.slice(idx + 18));
  }

  // 6. Packages
  const mPkg = txt.match(/(package v\d+)/i);
  if(mPkg) {
    const idx = txt.indexOf(mPkg[1]);
    return esc(txt.slice(0, idx)) +
      '<a href="' + link + '" class="feed-target-link" title="Open package">' + esc(mPkg[1]) + '</a>' +
      esc(txt.slice(idx + mPkg[1].length));
  }

  // 7. Success metrics
  const mMet = txt.match(/(success metric|historical metric) (.+)$/i);
  if(mMet) {
    const idx = txt.indexOf(mMet[2]);
    return esc(txt.slice(0, idx)) +
      '<a href="' + link + '" class="feed-target-link" title="View success metrics">' + esc(mMet[2]) + '</a>';
  }

  // Fallback: wrap in target link
  return '<a href="' + link + '" class="feed-target-link">' + esc(txt) + '</a>';
}
export function feed(list){
  return list.length ?
    '<ul class="feed">' + list.sort((a,b)=>b.at-a.at).map(a => {
      const link = actLink(a);
      const textHtml = formatActText(a, link);
      return '<li>'+
        '<time>' + fmtDT(a.at) + '</time>'+
        '<div class="feed-content"><b>' + uname(a.by) + '</b> ' + textHtml + '</div>'+
      '</li>';
    }).join("") + '</ul>' :
    '<div class="empty">No activity yet.</div>';
}
function openActivityLogModal(type, entity){
  const u = me();
  let acts = [], title = '';

  if (type === 'project') {
    const p = entity;
    const sps = S.subprojects.filter(s => s.projectId === p.id);
    const spIds = new Set(sps.map(s => s.id));
    const ts = S.tenders.filter(t => spIds.has(t.spId));
    const tIds = new Set(ts.map(t => t.id));

    acts = S.activity.filter(a => {
      if (a.projectId === p.id) return true;
      if (a.spId && spIds.has(a.spId)) return true;
      if (a.tenderId && tIds.has(a.tenderId)) return true;
      if (a.tenderId && T(a.tenderId) && spIds.has(T(a.tenderId).spId)) return true;
      return false;
    });

    if (!isProjectLeadUser(u) && !isAdmin(u)) {
      acts = acts.filter(a => {
        if (a.tenderId && T(a.tenderId)) return userRelatesToTender(u, T(a.tenderId));
        if (a.spId && SP(a.spId)) return userRelatesToSubproject(u, SP(a.spId));
        if (a.projectId) return userRelatesToProject(u, PR(a.projectId));
        return true;
      });
    }

    title = p.code + ' ' + p.name;
  } else if (type === 'subproject') {
    const sp = entity;
    const ts = tendersOf(sp);
    const tIds = new Set(ts.map(t => t.id));

    acts = S.activity.filter(a => {
      if (a.spId === sp.id) return true;
      if (a.tenderId && tIds.has(a.tenderId)) return true;
      if (a.tenderId && T(a.tenderId) && T(a.tenderId).spId === sp.id) return true;
      return false;
    });

    if (!isProjectLeadUser(u) && !isAdmin(u)) {
      acts = acts.filter(a => {
        if (a.tenderId && T(a.tenderId)) return userRelatesToTender(u, T(a.tenderId));
        if (a.spId && SP(a.spId)) return userRelatesToSubproject(u, SP(a.spId));
        return true;
      });
    }

    title = sp.name;
  } else if (type === 'tender') {
    const t = entity;
    acts = S.activity.filter(a => a.tenderId === t.id);
    title = t.code + ' ' + t.title;
  }

  const body = '<div class="scroll u-max-h-60vh">' +
    feed(acts) +
  '</div>';

  openModal({
    title,
    body,
    wide: true,
    submit: null
  });

  M.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => M.close());
  });
}
ACT.viewProjChanges = el => {
  const p = PR(el.dataset.id);
  if (p) openActivityLogModal('project', p);
};
ACT.viewSpChanges = el => {
  const sp = SP(el.dataset.id);
  if (sp) openActivityLogModal('subproject', sp);
};
ACT.viewTenderChanges = el => {
  const t = T(el.dataset.id);
  if (t) openActivityLogModal('tender', t);
};

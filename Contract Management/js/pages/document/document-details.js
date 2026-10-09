/* Document details rows shared by the document page and Home. */
import { DS } from "../../core/constants.js";
import { esc, uname } from "../../ui/format.js";

/* Revision remarks, listed in the document details while the owner revises */
export function docOriginRows(d,t){
  if(t)return '<dt>Tender</dt><dd>'+esc(t.code+" "+t.title)+'</dd>';
  const p=d.past||{};
  return '<dt>Master project</dt><dd>'+(p.project?esc(p.project):'–')+'</dd><dt>Sub-project</dt><dd>'+(p.sp?esc(p.sp):'–')+'</dd><dt>Tender</dt><dd>'+(p.tender?esc(p.tender):'–')+'</dd>';
}
export function docRemarkRows(d){const ap=d.approvals.slice().reverse().find(a=>a.decision==="Returned");
  return (d.remarks&&[DS.RT,DS.DR,DS.IR].includes(d.status)?'<dt>Returned by</dt><dd>'+(ap?uname(ap.approverId):"Approver")+'</dd><dt>Remarks</dt><dd>'+esc(d.remarks)+'</dd>':'')+
    (d.contractsFlag&&[DS.CR,DS.DR,DS.IR,DS.PA].includes(d.status)?'<dt>Contracts team</dt><dd>'+esc(d.contractsFlag)+'</dd>':'');}

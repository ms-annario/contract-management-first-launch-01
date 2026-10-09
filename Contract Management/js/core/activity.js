/* Activity log entries and in-app notifications. */
import { PR, SP, U } from "./model.js";
import { S, uid } from "./store.js";
import { reqTasks } from "./tasks.js";

export function log(t,text,docId){
  const tid = t ? t.id : null;
  const s = t && t.spId ? SP(t.spId) : null;
  const spId = s ? s.id : (t ? t.spId : null);
  const p = s ? PR(s.projectId) : null;
  S.activity.push({id:uid("a"),at:Date.now(),by:S.me,tenderId:tid,spId:spId||null,projectId:p?p.id:null,docId:docId||null,link:null,text});
}
export function logProj(p,text){
  if(!p) return;
  S.activity.push({id:uid("a"),at:Date.now(),by:S.me,tenderId:null,spId:null,projectId:p.id,docId:null,link:"#/search/"+p.id,text});
}
export function logSp(sp,text){
  if(!sp) return;
  S.activity.push({id:uid("a"),at:Date.now(),by:S.me,tenderId:null,spId:sp.id,projectId:sp.projectId,docId:null,link:"#/search/"+sp.projectId+"/"+sp.id,text});
}
export function notify(ids,text,link,key){[...new Set(ids)].filter(id=>id&&id!==S.me).forEach(id=>{const live=!!key&&reqTasks(U(id)).some(t=>t.key===key);
  S.notes.push({id:uid("n"),userId:id,text,link,at:Date.now(),read:false,key:live?key:null,fyi:!live,done:false});});}

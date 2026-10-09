/* Back button and breadcrumb trails. */
import { me, projOf, spOf } from "../core/model.js";
import { canSeeTender } from "../core/permissions.js";
import { currentOrigin } from "../core/router.js";
import { esc } from "./format.js";

function backBar(crumbInner, fallbackHash){
  return '<div class="crumbs-bar">' +
    '<button type="button" class="btn-back" data-act="goBack" data-fallback="' + esc(fallbackHash||"") + '" title="Go back to previous step">' +
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="u-mr-2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>' +
      'Back' +
    '</button>' +
    '<p class="crumbs">' + crumbInner + '</p>' +
  '</div>';
}
const originLink=o=>'<a href="'+o.hash+'">'+esc(o.label)+'</a> / ';
export function tenderBreadcrumbs(t){const sp=spOf(t),p=projOf(t),o=currentOrigin();
  if(!sp)return backBar(esc(t.code),o.hash);
  return backBar(originLink(o)+(p?'<a href="#/search/'+p.id+'">'+esc(p.name)+'</a> / <a href="#/search/'+p.id+'/'+sp.id+'">':'<a href="#/search">')+esc(sp.name)+'</a> / '+esc(t.code),o.hash);}
export function docBreadcrumbs(d,t){const o=currentOrigin();
  if(!t)return backBar('<a href="'+o.hash+'">'+esc(o.label)+'</a>',o.hash);
  return backBar(originLink(o)+(canSeeTender(me(),t)?'<a href="#/tender/'+t.id+'/documents">'+esc(t.code)+'</a>':esc(t.code)),o.hash);}
export function packageBreadcrumbs(p,t){const o=currentOrigin();return backBar(originLink(o)+'<a href="#/tender/'+t.id+'/overview">'+esc(t.code)+'</a>',o.hash);}
export const tecBreadcrumbs=()=>backBar('<a href="#/tec">TEC inbox</a>',currentOrigin().hash);

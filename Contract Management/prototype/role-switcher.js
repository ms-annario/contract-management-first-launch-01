/* Prototype only: the 'Viewing as' role switcher and ?user= switching. */
import { U, byId, me } from "../js/core/model.js";
import { render } from "../js/core/router.js";
import { S, save } from "../js/core/store.js";
import { reqTasks } from "../js/core/tasks.js";
import { resetSearchState } from "../js/pages/home/state.js";
import { toast } from "../js/ui/feedback.js";
import { esc } from "../js/ui/format.js";

export const ROLES=[
 {label:"System admin",u:"u-admin"},{label:"Project lead",u:"u-pl"},{label:"Sub-project lead",u:"u-spl"},
 {label:"Contract project IC",u:"u-ic"},{label:"SME",u:"u-sme1"},{label:"SME superior",u:"u-sup"},
 {label:"Contracts team reviewer",u:"u-ctr"}];
/* ?user=<id> in the address opens the app as that person */
export function applyUserFromUrl(){const urlUser=new URLSearchParams(location.search).get("user");if(urlUser&&byId(S.users,urlUser)){S.me=urlUser;}}
export function renderTop(){
  const sel=document.getElementById("roleSel");
  if(!sel) return;
  if(!ROLES.some(r=>r.u===S.me)){ S.me="u-ic"; save(); }

  sel.innerHTML=ROLES.map(r=>{
    const u=U(r.u);
    const count=u ? reqTasks(u).length : 0;
    const badge=count ? " ("+count+")" : "";
    return '<option value="'+r.u+'"'+(r.u===S.me?" selected":"")+'>'+esc(r.label+" ("+(u?u.name:"")+")"+badge)+'</option>';
  }).join("");
}

export function bindRoleSwitcher(){
  document.getElementById("roleSel").addEventListener("change",e=>{
    S.me=e.target.value;
    save();
    resetSearchState();
    toast("Now viewing as "+me().name+", "+(ROLES.find(r=>r.u===S.me)||{label:""}).label);
    if(location.hash === "#/search") render();
    else location.hash = "#/search";
  });
}

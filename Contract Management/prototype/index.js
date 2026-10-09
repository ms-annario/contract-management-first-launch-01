/* Prototype-only tooling: sample data, the "Viewing as" role switcher, Reset demo, ?user= switching
   and the starting role after login. The app runs without it: delete the import of this file from js/main.js. */
import { S, save, useSeed, useMigration, onLoad } from "../js/core/store.js";
import { onRender } from "../js/core/router.js";
import { onLogin } from "../js/layout/login.js";
import { resetSearchState } from "../js/pages/home/state.js";
import { seed } from "./sample-data.js";
import { migrate } from "./migrations.js";
import { applyUserFromUrl, renderTop, bindRoleSwitcher } from "./role-switcher.js";
import "./reset-demo.js";

const css=document.createElement("link");
css.rel="stylesheet";
css.href=new URL("./prototype.css",import.meta.url).href;
document.head.append(css);

const brand=document.querySelector(".brand");
brand.insertAdjacentHTML("beforeend","<small>Prototype</small>");
brand.insertAdjacentHTML("afterend",'<span class="brand-disclaimer">This header won’t be included in the platform; it is for tryout purposes only.</span>');
document.getElementById("topActions").innerHTML=
  '<label class="rolesel"><span>Viewing as</span><select id="roleSel" aria-label="Switch role"></select></label>'+
  '<button class="btn ghost sm" type="button" data-act="resetDemo">Reset demo</button>';

useSeed(seed);
useMigration(migrate);
onLoad(applyUserFromUrl);
onRender(renderTop);
bindRoleSwitcher();
onLogin(()=>{S.me="u-pl";save();resetSearchState();}); // every login starts viewing as the project lead

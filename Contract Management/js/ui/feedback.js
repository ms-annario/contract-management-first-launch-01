/* Toasts and the shared modal dialog. */
import { esc } from "./format.js";

export function toast(msg){const box=document.getElementById("toasts");while(box.children.length>1)box.firstChild.remove();const el=document.createElement("div");el.className="toast";el.textContent=msg;box.appendChild(el);setTimeout(()=>el.remove(),3200);}
/* modal */
export const M=document.getElementById("modal");
export function openModal({title,body,submit="Save",danger=false,onSubmit,wide}){
  M.style.width=wide?"min(760px,calc(100vw - 24px))":"";
  M.innerHTML='<form method="dialog" novalidate><h2 class="mh">'+esc(title)+'</h2><div class="mb">'+body+'<p class="err" id="mErr" hidden></p></div><div class="mf"><button type="button" class="btn ghost" value="cancel" data-close>'+(submit?"Cancel":"Close")+'</button>'+(submit?'<button class="btn'+(danger?" warn":"")+'" value="ok">'+esc(submit)+'</button>':"")+'</div></form>';
  const f=M.querySelector("form");
  M.querySelector("[data-close]").onclick=()=>M.close();
  M.onclose=()=>{M.style.width="";};
  f.onsubmit=async e=>{e.preventDefault();try{const err=onSubmit?await onSubmit(new FormData(f),f):null;if(err){const p=M.querySelector("#mErr");if(p){p.textContent=err;p.hidden=false;}return;}M.close();}catch(ex){console.error(ex);const p=M.querySelector("#mErr");if(p){p.textContent=ex&&ex.message||"Error";p.hidden=false;}}};
  M.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>M.close()));
  M.showModal();const first=f.querySelector("input:not([type=hidden]),select,textarea");if(first)first.focus();
}

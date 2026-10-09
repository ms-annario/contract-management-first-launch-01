/* Password gate: the login screen shown until the access password is entered, and locking again on log out.
   This only hides the app in the browser. It is not real security: the password is readable in this file. */
const PASSWORD="make users happy";
const KEY="contract_mgmt_access";

let unlocked=false;
try{unlocked=localStorage.getItem(KEY)==="granted";}catch(e){}
document.documentElement.classList.toggle("locked",!unlocked);

function show(){
  document.documentElement.classList.toggle("locked",!unlocked);
  if(unlocked)return;
  const pw=document.getElementById("loginPw");
  pw.value="";
  document.getElementById("loginErr").hidden=true;
  setTimeout(()=>pw.focus()); // after any closing dialog has handed focus back
}
/* Runs after a correct password, before the first page renders (the prototype picks the starting role here) */
const loginHooks=[];
export function onLogin(fn){loginHooks.push(fn);}
export function isUnlocked(){return unlocked;}
export function lock(){
  unlocked=false;
  try{localStorage.removeItem(KEY);}catch(e){}
  show();
}
export function initLogin(onUnlock){
  const pw=document.getElementById("loginPw"),err=document.getElementById("loginErr");
  document.getElementById("loginForm").addEventListener("submit",e=>{
    e.preventDefault();
    if(pw.value.trim()!==PASSWORD){err.hidden=false;pw.select();return;}
    unlocked=true;
    try{localStorage.setItem(KEY,"granted");}catch(e){}
    loginHooks.forEach(f=>f());
    show();
    onUnlock();
  });
  pw.addEventListener("input",()=>{err.hidden=true;});
  show();
}

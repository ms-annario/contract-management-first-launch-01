/* Delegated click/change/input handling for elements with data-act, data-chg and data-inp. */
import { ACT } from "./registry.js";
import { currentOrigin, go, routeStack } from "./router.js";

ACT.goBack=el=>{
  const fallback=el&&el.dataset&&el.dataset.fallback;
  if(routeStack.length>1){
    routeStack.pop();
    const prev=routeStack.pop();
    go(prev);
    return;
  }
  if(window.history.length>1){
    window.history.back();
    return;
  }
  if(fallback){
    go(fallback);
  }else{
    go(currentOrigin().hash||"#/dashboard");
  }
};

export function initActions(){
  document.addEventListener("click",e=>{const el=e.target.closest("[data-act]");if(!el)return;const f=ACT[el.dataset.act];if(f){e.preventDefault();f(el,e);}});
  document.addEventListener("change",e=>{const el=e.target.closest("[data-chg]");if(!el)return;const f=ACT[el.dataset.chg];if(f)f(el,e);});
  document.addEventListener("input",e=>{const el=e.target.closest("[data-inp]");if(!el)return;const f=ACT[el.dataset.inp];if(f)f(el,e);});
}

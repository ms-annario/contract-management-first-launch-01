/* Home page selection and search state. */

/* ---------- Home: search and project explorer ---------- */
export let GS_STATE = {
  pId: "",
  spId: "",
  tId: "",
  docId: "",
  query: "",
  phase: "Tender Preparation",
  searchDropdownOpen: false,
  searchDdTab: "all"
};
export function resetSearchState(){
  if(typeof closeAllDd === "function") closeAllDd();
  const dd = document.getElementById("gsSearchDropdown");
  if(dd){
    if(dd.remove) dd.remove();
    else if(dd.parentNode) dd.parentNode.removeChild(dd);
  }
  if(typeof GS_STATE !== "undefined"){
    GS_STATE = { pId: "", spId: "", tId: "", docId: "", query: "", tenderTab: "overview", tenderDocSubtab: "all", phase: "Tender Preparation", searchDropdownOpen: false, searchDdTab: "all" };
  }
  const mainInp = document.getElementById("gsMainQuery");
  if(mainInp) mainInp.value = "";
}
export function closeAllDd(){
  document.querySelectorAll(".gs-dd-wrap.open").forEach(w => {
    w.classList.remove("open");
    const card = w.closest(".gs-mod-card");
    if(card) card.classList.remove("has-open-dd");
    const tr = w.querySelector(".gs-dd-trigger");
    if(tr) tr.setAttribute("aria-expanded", "false");
  });
}

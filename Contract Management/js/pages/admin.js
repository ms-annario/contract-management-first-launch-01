/* Admin pages: users and the document catalogue. */
import { PLATFORM_ROLES } from "../core/constants.js";
import { U, byId, me, team } from "../core/model.js";
import { isAdmin } from "../core/permissions.js";
import { ACT, route } from "../core/registry.js";
import { afterRender, denied, rerender } from "../core/router.js";
import { S, uid } from "../core/store.js";
import { has } from "../core/tasks.js";
import { openModal, toast } from "../ui/feedback.js";
import { esc } from "../ui/format.js";
import { badge, dA, dSR, fld, opts } from "../ui/markup.js";

/* ---------- Admin ---------- */
let USER_SEARCH="";
const userSearchText=u=>{const c=byId(S.companies,u.companyId)||{};return [u.name,u.email,c.name,team(u).name,u.role,u.status].join(" ").toLowerCase();};
function applyUserSearch(){const q=USER_SEARCH;let n=0;
  document.querySelectorAll("#usersTable tbody tr[data-q]").forEach(tr=>{const hit=!q||tr.dataset.q.includes(q);tr.hidden=!hit;if(hit)n++;});
  const meta=document.getElementById("userSearchMeta");if(meta)meta.innerHTML=q?'Showing <b>'+n+'</b> of '+S.users.length:S.users.length+' '+(S.users.length===1?'user':'users');
  const empty=document.getElementById("userSearchEmpty");if(empty)empty.hidden=!(q&&!n);}
ACT.userSearch=el=>{USER_SEARCH=el.value.trim().toLowerCase();const clr=document.getElementById("userSearchClear");if(clr)clr.style.display=USER_SEARCH?"block":"none";applyUserSearch();};
ACT.clearUserSearch=()=>{USER_SEARCH="";const inp=document.getElementById("userSearchInp");if(inp){inp.value="";inp.focus();}const clr=document.getElementById("userSearchClear");if(clr)clr.style.display="none";applyUserSearch();};
route("users",()=>{if(!isAdmin(me()))return denied("Only system admins manage users.");
  afterRender.push(applyUserSearch);
  const rows=S.users.map(u=>{const c=byId(S.companies,u.companyId);return '<tr data-q="'+esc(userSearchText(u))+'"><td><b>'+esc(u.name)+'</b><br><span class="small muted">'+esc(u.email)+'</span></td><td>'+esc(c.name)+'<br><span class="small muted">'+esc(team(u).name||"")+'</span></td>'+
   '<td><select data-chg="setRole" data-id="'+u.id+'" aria-label="Platform role for '+esc(u.name)+'">'+opts(PLATFORM_ROLES.map(r=>({v:r,l:r})),u.role)+'</select></td><td>'+(u.sys==="admin"?'<span class="tag">System admin</span>':'<label class="switch"><input type="checkbox" role="switch" data-chg="setCreator" data-id="'+u.id+'"'+(u.creator?" checked":"")+' aria-label="'+esc(u.name)+' can create master project"><span class="switch-track"></span></label>')+'</td>'+
   '<td class="nowrap">'+(u.status==="Invited"?badge(u.status)+' <button class="btn sm sec" data-act="acceptInvite" data-id="'+u.id+'"'+dA(has("invite:"+u.id))+'>Simulate acceptance'+dSR(has("invite:"+u.id))+'</button>':
     '<label class="switch"'+(u.id===S.me?' title="You can\'t deactivate yourself"':'')+'><input type="checkbox" role="switch" data-chg="toggleActive" data-id="'+u.id+'"'+(u.status==="Active"?" checked":"")+(u.id===S.me?" disabled":"")+' aria-label="'+esc(u.name)+' active"><span class="switch-track"></span><span class="switch-lbl">'+(u.status==="Active"?"Active":"Inactive")+'</span></label>')+'</td></tr>';}).join("");
  return '<div class="head"><div><h1>Users</h1></div><div class="acts"><button class="btn" data-act="invite">Invite user</button></div></div>'+
  '<div class="u-d-flex u-items-center u-justify-between u-gap-12 u-m-16-0-18 u-flex-wrap">'+
    '<div class="proj-search-wrap u-flex-1">'+
      '<svg class="search-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>'+
      '<input type="text" id="userSearchInp" class="proj-search-inp" placeholder="Search by name, email, company, team, role..." value="'+esc(USER_SEARCH)+'" data-inp="userSearch" autocomplete="off" aria-label="Search users">'+
      '<button type="button" id="userSearchClear" class="proj-search-clear" data-act="clearUserSearch" title="Clear search" style="'+(USER_SEARCH?'display:block':'display:none')+'">&times;</button>'+
    '</div>'+
    '<span id="userSearchMeta" class="small muted"></span>'+
  '</div>'+
  '<div class="panel muted u-p-24-20 u-text-center" id="userSearchEmpty" hidden>No users match your search.</div>'+
  '<div class="scroll"><table class="t" id="usersTable"><thead><tr><th>Name</th><th>Company and team</th><th>Platform role</th><th>Can create master project?</th><th>Status</th></tr></thead><tbody>'+rows+'</tbody></table></div>';});
ACT.invite=()=>openModal({title:"Invite user",body:fld("Full name",'<input type="text" name="name" id="f1" required>',"f1")+fld("Work email",'<input type="email" name="email" id="f2" required>',"f2")+
  fld("Company",'<input type="text" name="company" id="f3" list="dlCompanies" placeholder="e.g. Harbourline Engineering" required><datalist id="dlCompanies">'+S.companies.map(c=>'<option value="'+esc(c.name)+'">').join("")+'</datalist>',"f3")+
  fld("Team",'<input type="text" name="team" id="f4" list="dlTeams" placeholder="e.g. Design" required><datalist id="dlTeams">'+[...new Set(S.teams.map(t=>t.name))].map(n=>'<option value="'+esc(n)+'">').join("")+'</datalist>',"f4")+
  fld("Platform role",'<select name="role" id="f5">'+opts(PLATFORM_ROLES.map(r=>({v:r,l:r})),"SME")+'</select>',"f5")+'',
  submit:"Send invitation",onSubmit:fd=>{const name=fd.get("name").trim(),email=fd.get("email").trim().toLowerCase();
   if(!name)return "Enter the person's name.";if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))return "Enter a valid email address.";
   if(S.users.some(u=>u.email===email))return "Someone with this email is already registered.";
   const coName=(fd.get("company")||"").trim(),tmName=(fd.get("team")||"").trim();if(!coName)return "Enter the company.";if(!tmName)return "Enter the team.";
   const tm=findOrAddTeam(coName,tmName);S.users.push({id:uid("u"),name,email,companyId:tm.companyId,teamId:tm.id,title:tm.name,superiorId:null,sys:"user",creator:false,status:"Invited",role:fd.get("role")});rerender();toast("Invitation sent to "+email);}});
/* Company and team are typed in on invite; reuse a match (any case) or create one */
function findOrAddTeam(coName,tmName){const lc=x=>x.toLowerCase();
  let c=S.companies.find(x=>lc(x.name)===lc(coName));
  if(!c){const base=(coName.match(/\b[A-Za-z0-9]/g)||[]).join("").toUpperCase().slice(0,3)||coName.slice(0,3).toUpperCase();let code=base,i=2;while(S.companies.some(x=>x.code===code))code=base+(i++);
    c={id:uid("c"),name:coName,code};S.companies.push(c);}
  let t=S.teams.find(x=>x.companyId===c.id&&lc(x.name)===lc(tmName));
  if(!t){t={id:uid("t"),companyId:c.id,name:tmName,cr:false};S.teams.push(t);}
  return t;}
ACT.setRole=el=>{const u=U(el.dataset.id);u.role=el.value;rerender();toast(u.name+" is now "+el.value);};
ACT.acceptInvite=el=>{U(el.dataset.id).status="Active";rerender();toast(U(el.dataset.id).name+" is now active");};
ACT.setCreator=el=>{const u=U(el.dataset.id);u.creator=el.checked;rerender();toast(u.name+(el.checked?" can now create master projects":" can no longer create master projects"));};
ACT.deactivate=el=>{const u=U(el.dataset.id);openModal({title:"Deactivate "+u.name+"?",body:'<p>Their sessions end straight away and they can no longer sign in. Their name stays on past records.</p>',submit:"Deactivate",danger:true,onSubmit:()=>{
  u.status="Inactive";

  rerender();toast(u.name+" deactivated");}});};
ACT.toggleActive=el=>{const u=U(el.dataset.id);if(el.checked){u.status="Active";rerender();toast(u.name+" reactivated");}else{el.checked=true;ACT.deactivate(el);}};
route("catalogue",()=>{if(!isAdmin(me()))return denied("Only system admins maintain the catalogue.");
  return '<div class="head"><div><h1>Document catalogue</h1></div><div class="acts"><button class="btn" data-act="addCat">Add document type</button></div></div>'+
  '<div class="scroll"><table class="t"><thead><tr><th>Document</th><th>Spec type</th><th>Audience</th><th>Usual owner</th><th>Default</th></tr></thead><tbody>'+
  S.catalogue.map(k=>{return '<tr><td><b>'+esc(k.name)+'</b></td><td>'+esc(k.spec)+'</td><td>'+(k.audience==="Internal"?"Internal":"Tenderer")+'</td><td>'+esc(k.discipline)+'</td><td>'+(k.required?"Required":"Optional")+'</td></tr>';}).join("")+'</tbody></table></div>';});
ACT.addCat=()=>openModal({title:"Add document type",body:fld("Document name",'<input type="text" name="n" id="k1">',"k1")+
  fld("Spec type",'<select name="s" id="k2"><option>Particular</option><option>General</option></select>',"k2")+fld("Audience",'<select name="a" id="k3"><option value="Tenderers">Tenderer</option><option value="Internal">Internal</option></select>',"k3")+
  fld("Usual owner discipline",'<input type="text" name="d" id="k4" value="Design">',"k4")+'<label class="check"><input type="checkbox" name="r" checked> Required by default</label>',onSubmit:fd=>{
  const n=fd.get("n").trim();if(!n)return "Enter a document name.";if(S.catalogue.some(k=>k.name.toLowerCase()===n.toLowerCase()))return "That document type already exists.";
  const k={id:uid("k"),name:n,spec:fd.get("s"),audience:fd.get("a"),discipline:fd.get("d").trim()||"Unassigned",required:!!fd.get("r")};S.catalogue.push(k);
  rerender();toast(n+" added to the catalogue");}});

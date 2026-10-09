/* Tender team tab: SMEs and TEC members. */
import { log, notify } from "../../core/activity.js";
import { isApproved } from "../../core/constants.js";
import { T, U, byId, docsOf, me, team, touchDoc } from "../../core/model.js";
import { isIC } from "../../core/permissions.js";
import { ACT } from "../../core/registry.js";
import { rerender } from "../../core/router.js";
import { S } from "../../core/store.js";
import { has } from "../../core/tasks.js";
import { openModal, toast } from "../../ui/feedback.js";
import { esc } from "../../ui/format.js";
import { dA, dSR, fld, userOpts } from "../../ui/markup.js";

export function tTeam(t){const u=me(),ic=isIC(u,t)&&!t.manual;
  return '<div class="head"><div><h2 class="sec u-mt-0">Subject matter experts</h2></div><div class="acts">'+(ic?'<button class="btn" data-act="addSme" data-id="'+t.id+'"'+dA(has("assignSme:"+t.id))+'>Assign SME'+dSR(has("assignSme:"+t.id))+'</button>':"")+'</div></div>'+
  (t.smes.length?'<div class="scroll"><table class="t"><thead><tr><th>Name</th><th>Team</th><th>Documents</th><th></th></tr></thead><tbody>'+t.smes.map(s=>{const x=U(s.userId),n=docsOf(t).filter(d=>d.ownerId===x.id).length;
   return '<tr><td><b>'+esc(x.name)+'</b><br><span class="small muted">'+esc(x.title)+'</span></td><td>'+esc(team(x).name||"")+'</td><td>'+n+'</td><td class="c">'+(ic?'<button class="btn ghost sm" data-act="removeSme" data-id="'+t.id+'" data-u="'+x.id+'">Remove</button>':"")+'</td></tr>';}).join("")+'</tbody></table></div>':'<div class="empty">'+(ic?'Use <b>Assign SME</b> to create one.':'No SMEs assigned yet.')+'</div>');}
ACT.addSme=el=>{const t=T(el.dataset.id),ic=me(),co=byId(S.companies,ic.companyId),pool=S.users.filter(x=>x.status==="Active"&&x.companyId===ic.companyId&&!t.smes.some(s=>s.userId===x.id)&&x.sys!=="admin");
  const selected=new Set();
  const guessDisc=u=>{const tn=(team(u).name||"").toLowerCase(),tit=(u.title||"").toLowerCase();
    if(tn.includes("contract")||tit.includes("contract"))return "Contracts";
    if(tn.includes("design")||tit.includes("design")||tit.includes("engineer"))return "Design";
    if(tn.includes("procurement")||tit.includes("procurement"))return "Procurement";
    if(tn.includes("quantity")||tit.includes("survey")||tit.includes("qs"))return "Quantity surveying";
    if(tn.includes("hse")||tit.includes("safety")||tit.includes("health"))return "HSE";
    if(tn.includes("control")||tn.includes("project management")||tit.includes("director"))return "Project controls";
    return "Design";};
  openModal({title:"Assign team members to "+t.code,submit:"Assign selected",
    body:fld("Search people",'<input type="text" id="smeQ" placeholder="Type a name" autocomplete="off">',"smeQ")+
      ''+
      '<div class="row u-justify-between u-items-center u-m-8-0-6">'+
        '<label class="check u-m-0"><input type="checkbox" id="smeAll"> <b>Select all</b></label>'+
        '<span id="smeCount" class="small muted">0 selected</span>'+
      '</div>'+
      '<div id="smeList" class="u-max-h-220 u-overflow-auto u-border-1-solid-rule u-rounded-6 u-p-4-10"></div>'+
      fld("Discipline",'<select name="disc" id="smeD">'+
        '<option value="auto">Auto-detect from role/team</option>'+
        ["Design","Contracts","Procurement","Quantity surveying","HSE","Project controls"].map(x=>'<option value="'+x+'">'+x+'</option>').join("")+
      '</select>',"smeD"),
    onSubmit:fd=>{
      const ids=Array.from(new Set([...selected, ...fd.getAll("who")]));
      if(!ids.length)return "Select at least one person to assign.";
      const chosenDisc=fd.get("disc");
      ids.forEach(id=>{
        const x=U(id),disc=chosenDisc==="auto"?guessDisc(x):chosenDisc;
        t.smes.push({userId:id,disc});
        log(t,"assigned "+x.name+" as "+disc+" SME");
        notify([id],"You were assigned as "+disc+" SME on "+t.code+" "+t.title,"#/tender/"+t.id+"/documents");
      });
      rerender();
      toast(ids.length+(ids.length===1?" team member assigned":" team members assigned"));
    }
  });

  const updateHeader=visibleBoxes=>{
    const cnt=document.getElementById("smeCount");
    if(cnt)cnt.textContent=selected.size+" selected";
    const all=document.getElementById("smeAll");
    if(all&&visibleBoxes&&visibleBoxes.length){
      all.checked=visibleBoxes.every(b=>b.checked);
      all.indeterminate=!all.checked&&visibleBoxes.some(b=>b.checked);
    }
  };

  const draw=q=>{
    const l=pool.filter(x=>x.name.toLowerCase().includes(q.toLowerCase())||(team(x).name||"").toLowerCase().includes(q.toLowerCase())||x.title.toLowerCase().includes(q.toLowerCase()));
    const listEl=document.getElementById("smeList");
    if(!listEl)return;
    listEl.innerHTML=l.length?l.map(x=>'<label class="check u-d-flex u-items-center u-p-5-0 u-m-0"><input type="checkbox" name="who" value="'+x.id+'"'+(selected.has(x.id)?" checked":"")+'> <span class="u-ml-8"><b>'+esc(x.name)+'</b> <span class="small muted">'+esc(team(x).name+", "+x.title)+'</span></span></label>').join(""):'<p class="small muted u-p-6-0">No one in '+esc(co.name)+' matches “'+esc(q)+'”.</p>';
    const boxes=[...listEl.querySelectorAll('input[name="who"]')];
    updateHeader(boxes);
  };

  draw("");
  const qEl=document.getElementById("smeQ");
  if(qEl)qEl.addEventListener("input",e=>draw(e.target.value));

  const listEl=document.getElementById("smeList");
  if(listEl){
    listEl.addEventListener("change",e=>{
      if(e.target&&e.target.name==="who"){
        if(e.target.checked)selected.add(e.target.value);
        else selected.delete(e.target.value);
        const boxes=[...listEl.querySelectorAll('input[name="who"]')];
        updateHeader(boxes);
      }
    });
  }

  const allEl=document.getElementById("smeAll");
  if(allEl){
    allEl.addEventListener("change",()=>{
      const boxes=[...document.querySelectorAll('#smeList input[name="who"]')];
      boxes.forEach(b=>{
        b.checked=allEl.checked;
        if(allEl.checked)selected.add(b.value);
        else selected.delete(b.value);
      });
      updateHeader(boxes);
    });
  }
};
ACT.removeSme=el=>{const t=T(el.dataset.id),x=U(el.dataset.u),owned=docsOf(t).filter(d=>d.ownerId===x.id),others=t.smes.filter(s=>s.userId!==x.id).map(s=>U(s.userId));
  const open=owned.filter(d=>!isApproved(d));
  openModal({title:"Remove "+x.name+" from "+t.code+"?",danger:true,submit:"Remove SME",body:(open.length?'<p>'+esc(x.name)+' owns '+open.length+(open.length===1?" document":" documents")+' that are still in progress. Choose who takes them over.</p>'+
    fld("New owner",'<select name="to" id="rs1">'+userOpts(others,null,"Leave unassigned",true)+'</select>',"rs1")+'<ul class="small muted u-m-0 u-pl-18">'+open.map(d=>'<li>'+esc(d.name)+'</li>').join("")+'</ul>':'<p>'+esc(x.name)+' will lose access to this tender'+(owned.length?". Documents they already finished stay credited to them.":".")+'</p>'),
   onSubmit:fd=>{const to=fd.get("to")||null;open.forEach(d=>{d.ownerId=to;touchDoc(d);if(to)notify([to],"You now own "+d.name+" on "+t.code,"#/doc/"+d.id,"own:"+d.id);log(t,"reassigned "+d.name+" to "+(to?U(to).name:"nobody"),d.id);});
    t.smes=t.smes.filter(s=>s.userId!==x.id);notify([x.id],"You were removed from "+t.code+" "+t.title,"#/home");log(t,"removed "+x.name+" from the team");rerender();toast(x.name+" removed"+(open.length?(to?", documents moved to "+U(to).name:", documents unassigned"):""));}});};

/* Prototype only: sample people, catalogue and past-project library documents. */
import { DAY, DEFAULT_DUR, DS, PS, isApproved } from "../js/core/constants.js";
import { sampleHtml } from "../js/core/document-templates.js";

const NOW=Date.now();
export const ago=d=>NOW-d*DAY, ahead=d=>NOW+d*DAY;
export function seed(){
 const S={seq:500,me:"u-ic"};
 S.companies=[{id:"c1",name:"Harbourline Engineering",code:"HLE"},{id:"c2",name:"Meridian Consultants",code:"MER"}];
 S.teams=[
  {id:"t-pm",companyId:"c1",name:"Project management"},{id:"t-des",companyId:"c1",name:"Design"},{id:"t-con",companyId:"c1",name:"Contracts"},
  {id:"t-pro",companyId:"c1",name:"Procurement"},{id:"t-qs",companyId:"c1",name:"Quantity surveying"},{id:"t-cr",companyId:"c1",name:"Contracts review",cr:true},
  {id:"t-tec",companyId:"c1",name:"Tender evaluation"},{id:"t-td",companyId:"c1",name:"Tender division"},{id:"t-mdes",companyId:"c2",name:"Design"}];
 const u=(id,name,team,title,sup,sys,extra)=>Object.assign({id,name,email:name.toLowerCase().replace(/[^a-z]+/g,".")+"@harbourline.example",companyId:"c1",teamId:team,title,superiorId:sup||null,sys:sys||"user",creator:false,status:"Active"},extra||{});
 S.users=[
  u("u-admin","Aisha Rahman","t-pm","Platform administrator",null,"admin"),
  u("u-pl","Daniel Wong","t-pm","Project director",null,"user",{creator:true}),
  u("u-spl","Priya Nair","t-pm","Sub-project lead, civil works"),
  u("u-spl2","Leo Tan","t-pm","Sub-project lead, stations"),
  u("u-ic","Marcus Lee","t-pm","Contract project IC"),
  u("u-sup","Helen Ho","t-des","Technical director"),
  u("u-sme1","Sofia Chan","t-des","Senior design engineer","u-sup"),
  u("u-sme2","Kenji Ito","t-con","Contracts manager","u-sup"),
  u("u-sme3","Nadia Karim","t-pro","Procurement lead","u-sup"),
  u("u-sme4","Ben Okafor","t-qs","Quantity surveyor","u-sup"),
  u("u-rev","Ravi Patel","t-des","Geotechnical adviser","u-sup"),
  u("u-ctr","Omar Haddad","t-cr","Contracts review manager"),
  u("u-tec","Grace Lim","t-tec","TEC chair"),
  u("u-tec2","Wei Zhang","t-tec","TEC member"),
  u("u-tec3","Fatima Ali","t-tec","TEC member"),
  u("u-td","Oliver Smith","t-td","Tender division",null,"user"),
  Object.assign(u("u-ext","James Porter","t-mdes","Design consultant"),{companyId:"c2",email:"james.porter@meridian.example"})];
 const cat=(id,name,spec,aud,disc,req)=>({id,name,spec,audience:aud,discipline:disc,required:req});
 S.catalogue=[
  cat("k1","Invitation to tender","General","Tenderers","Contracts",true),cat("k2","Tender instructions","General","Tenderers","Contracts",true),
  cat("k3","Form of tender","General","Tenderers","Contracts",true),cat("k4","General conditions of contract","General","Tenderers","Contracts",true),
  cat("k5","Special conditions of contract","Particular","Tenderers","Contracts",true),cat("k6","General specification","General","Tenderers","Design",true),
  cat("k7","Particular specification","Particular","Tenderers","Design",true),cat("k8","Bills of quantities","Particular","Tenderers","Quantity surveying",true),
  cat("k9","Drawings register","Particular","Tenderers","Design",true),cat("k10","Tender returnables schedule","Particular","Tenderers","Procurement",true),
  cat("k11","Health, safety and environmental requirements","General","Tenderers","HSE",false),cat("k12","Programme and key dates","Particular","Tenderers","Project controls",false),
  cat("k13","Site information","Particular","Tenderers","Design",false),cat("k14","Contract forms and schedules","General","Tenderers","Contracts",false),
  cat("k15","Tender evaluation plan","Particular","Internal","Procurement",true),cat("k16","Pre-tender estimate","Particular","Internal","Quantity surveying",true),
  cat("k17","Procurement strategy note","Particular","Internal","Project management",false)];
  S.projects=[
    {id:"p1",name:"Northshore Rail Extension",code:"NRE",client:"Northshore Transit Authority",desc:"A 6 km elevated rail extension with three new stations and a depot.",funding:"FP-2025-031",leadId:"u-pl",start:ago(120),end:ahead(900),status:"Active",createdAt:ago(120),updatedAt:ago(15),updatedBy:"u-pl",dur:DEFAULT_DUR.slice()},
    {id:"p2",name:"Coastal Highway Upgrade",code:"CHU",client:"Department of Transportation",desc:"A 14 km coastal dual-carriageway with 4 grade-separated interchanges, seawall protections, and intelligent lighting systems.",funding:"FP-2025-088",leadId:"u-pl",start:ago(90),end:ahead(720),status:"Active",createdAt:ago(90),updatedAt:ago(10),updatedBy:"u-pl",dur:DEFAULT_DUR.slice()},
    {id:"p3",name:"Metro Airport Express Depot Expansion",code:"MAX",client:"Airport Rail Transit Authority",desc:"Expansion of rolling stock stabling yards, automated maintenance facility, and depot traction power substation.",funding:"FP-2024-102",leadId:"u-pl",start:ago(150),end:ahead(500),status:"Active",createdAt:ago(150),updatedAt:ago(5),updatedBy:"u-pl",dur:DEFAULT_DUR.slice()}
  ];
  S.subprojects=[
    {id:"sp1",projectId:"p1",name:"Civil works",desc:"Viaducts, depot and earthworks",leadId:"u-spl",members:["u-rev"],createdAt:ago(120),updatedAt:ago(20),updatedBy:"u-spl"},
    {id:"sp2",projectId:"p1",name:"Stations and systems",desc:"Station fit-out, signalling and power",leadId:"u-spl2",members:[],createdAt:ago(120),updatedAt:ago(30),updatedBy:"u-spl2"},
    {id:"sp3",projectId:"p2",name:"Interchange & Overpass Structures",desc:"Elevated bridge structures and highway flyovers",leadId:"u-spl",members:["u-rev"],createdAt:ago(90),updatedAt:ago(12),updatedBy:"u-spl"},
    {id:"sp4",projectId:"p2",name:"Marine Seawall & Reclamation",desc:"Rock revetment, shoreline stabilization and drainage",leadId:"u-spl2",members:[],createdAt:ago(90),updatedAt:ago(14),updatedBy:"u-spl2"},
    {id:"sp5",projectId:"p3",name:"Stabling Yards & Trackwork",desc:"Ballasted track, stabling sidings and turnouts",leadId:"u-spl2",members:["u-rev"],createdAt:ago(150),updatedAt:ago(8),updatedBy:"u-spl2"},
    {id:"sp6",projectId:"p3",name:"Depot Power & Traction Substation",desc:"25kV traction substation and switchgear installation",leadId:"u-spl2",members:[],createdAt:ago(150),updatedAt:ago(6),updatedBy:"u-spl2"}
  ];
  const tec=[{userId:"u-tec",chair:true},{userId:"u-tec2"},{userId:"u-tec3"}];
  S.tenders=[
    {id:"tn1",spId:"sp1",code:"NRE-C01",title:"Viaduct and civil works",route:"Open tender",scope:"Design and construction of a 1.8 km elevated viaduct on bored piles between Harbour Road and Northshore station, including drainage, utilities diversions, temporary traffic management and interface works with the systems contractor.",createdAt:ago(34),icId:"u-ic",smes:[{userId:"u-sme1",disc:"Design"},{userId:"u-sme2",disc:"Contracts"},{userId:"u-sme3",disc:"Procurement"},{userId:"u-sme4",disc:"Quantity surveying"}],tec:tec.map(x=>({...x})),manual:null},
    {id:"tn2",spId:"sp1",code:"NRE-C02",title:"Depot earthworks",route:"Selective tender",scope:"Bulk earthworks, ground improvement and drainage for the 14 hectare depot site.",createdAt:ago(60),icId:"u-ic",smes:[{userId:"u-sme1",disc:"Design"},{userId:"u-sme2",disc:"Contracts"},{userId:"u-sme4",disc:"Quantity surveying"}],tec:tec.map(x=>({...x})),manual:null},
    {id:"tn3",spId:"sp2",code:"NRE-S01",title:"Station fit-out",route:"Open tender",scope:"Architectural fit-out of three stations including finishes, signage and passenger facilities.",createdAt:ago(85),icId:"u-ic",smes:[{userId:"u-sme1",disc:"Design"},{userId:"u-sme2",disc:"Contracts"}],tec:tec.map(x=>({...x})),manual:null},
    {id:"tn4",spId:"sp1",code:"NRE-C03",title:"Noise barriers",route:"Open tender",scope:"Supply and installation of transparent noise barriers along the viaduct.",createdAt:ago(2),icId:null,smes:[],tec:[],manual:null},
    {id:"tn5",spId:"sp3",code:"CHU-C01",title:"Flyover bridge structural works",route:"Open tender",scope:"Design and build of 4-lane prestressed concrete box girder flyover structure with cast-in-place piers.",createdAt:ago(45),icId:"u-ic",smes:[{userId:"u-sme1",disc:"Design"},{userId:"u-sme2",disc:"Contracts"}],tec:tec.map(x=>({...x})),manual:null},
    {id:"tn6",spId:"sp3",code:"CHU-C02",title:"Traffic signalling & smart lighting",route:"Selective tender",scope:"Supply and installation of adaptive traffic controller signals, LED gantry luminaires and fiber network.",createdAt:ago(25),icId:"u-ic",smes:[{userId:"u-sme1",disc:"Design"},{userId:"u-sme3",disc:"Procurement"}],tec:tec.map(x=>({...x})),manual:null},
    {id:"tn7",spId:"sp4",code:"CHU-M01",title:"Seawall rock revetment and drainage",route:"Open tender",scope:"Armor rock placement, geotextile filtration layer and marine outfall culverts along 3.2 km coastline.",createdAt:ago(20),icId:"u-ic",smes:[{userId:"u-sme1",disc:"Design"},{userId:"u-sme4",disc:"Quantity surveying"}],tec:tec.map(x=>({...x})),manual:null},
    {id:"tn8",spId:"sp5",code:"MAX-D01",title:"Stabling yard trackwork and turnouts",route:"Open tender",scope:"Track laying, continuously welded rail, turnouts, buffer stops and ballasting for 12 stabling sidings.",createdAt:ago(75),icId:null,smes:[{userId:"u-sme1",disc:"Design"},{userId:"u-sme2",disc:"Contracts"},{userId:"u-sme4",disc:"Quantity surveying"}],tec:tec.map(x=>({...x})),manual:null},
    {id:"tn9",spId:"sp6",code:"MAX-P01",title:"25kV traction power substation",route:"Selective tender",scope:"Design, manufacture, delivery and commissioning of indoor 25kV gas-insulated switchgear and auxiliary transformers.",createdAt:ago(55),icId:null,smes:[{userId:"u-sme1",disc:"Design"},{userId:"u-sme2",disc:"Contracts"}],tec:tec.map(x=>({...x})),manual:null}
  ];
  S.docs=[];
  const mk=(id,tid,kid,owner,status,due)=>{const t=S.tenders.find(x=>x.id===tid),k=S.catalogue.find(x=>x.id===kid);const html=sampleHtml(k.name,t);
   const d=Object.assign({id,tenderId:tid,catId:kid,name:k.name,spec:k.spec,audience:k.audience,ownerId:owner,due,status,html,versions:[],comments:[],approvals:[],remarks:null,contractsFlag:null,createdAt:ago(30),updatedAt:ago(4),updatedBy:owner||"u-ic"});
   if(status!==DS.NS&&status!==DS.DR)d.versions.push({no:1,html,at:ago(8),by:owner,note:"Shared for review"});
   if([DS.AP,DS.FI].includes(status))d.approvals.push({versionNo:1,approverId:"u-sup",decision:"Approved",remarks:"",at:ago(6)});
   S.docs.push(d);return d;};
  mk("d1","tn1","k2","u-sme2",DS.AP,ago(4));mk("d2","tn1","k4","u-sme2",DS.AP,ago(4));
  mk("d3","tn1","k5","u-sme2",DS.PA,ago(1));
  mk("d4","tn1","k6","u-sme1",DS.AP,ago(5));
  const d5=mk("d5","tn1","k7","u-sme1",DS.IR,ahead(3));
  d5.comments.push({id:"cm1",by:"u-rev",at:ago(2),text:"Pile cap cover of 75 mm conflicts with the marine exposure class in the ground investigation report. Please confirm with the durability assessment.",resolved:false,replies:[]});
  d5.comments.push({id:"cm2",by:"u-sme3",at:ago(1),text:"Can we reference the systems interface matrix here so tenderers price the cast-in containment?",resolved:false,replies:[{by:"u-sme1",at:ago(.5),text:"Good idea, adding it in the next revision."}]});
  mk("d6","tn1","k8","u-sme4",DS.DR,ahead(6));
  const d7=mk("d7","tn1","k15","u-sme3",DS.RT,ahead(2));
  d7.approvals.push({versionNo:1,approverId:"u-sup",decision:"Returned",remarks:"Weighting needs sign-off from the procurement board. Add the safety performance sub-criteria and scoring guidance.",at:ago(1)});d7.remarks=d7.approvals[0].remarks;
  mk("d8","tn1","k16","u-sme4",DS.NS,ahead(8));
  ["k2","k4","k7","k8"].forEach((k,i)=>mk("d2"+i,"tn2",k,i===2?"u-sme1":i===3?"u-sme4":"u-sme2",DS.AP,ago(12)));
  ["k2","k4","k7","k15"].forEach((k,i)=>mk("d3"+i,"tn3",k,i===2?"u-sme1":"u-sme2",DS.FI,ago(30)));
  ["k2","k5","k7","k8"].forEach((k,i)=>mk("d5"+i,"tn5",k,i===2?"u-sme1":i===3?"u-sme4":"u-sme2",i===0?DS.AP:i===1?DS.PA:i===2?DS.IR:DS.DR,ahead(5)));
  ["k6","k15"].forEach((k,i)=>mk("d6"+i,"tn6",k,i===0?"u-sme1":"u-sme3",i===0?DS.DR:DS.PA,ahead(10)));
  ["k13","k8"].forEach((k,i)=>mk("d7"+i,"tn7",k,i===0?"u-sme1":"u-sme4",i===0?DS.IR:DS.NS,ahead(12)));
  ["k2","k4","k7","k8"].forEach((k,i)=>mk("d8"+i,"tn8",k,i===2?"u-sme1":i===3?"u-sme4":"u-sme2",DS.FI,ago(15)));
  ["k5","k7"].forEach((k,i)=>mk("d9"+i,"tn9",k,i===1?"u-sme1":"u-sme2",i===0?DS.AP:DS.IR,ahead(8)));
 S.metrics=[
  {id:"m1",tenderId:"tn2",metric:"Earthworks volume variance",target:"Within 5% of the bill quantity",source:"Historical"},
  {id:"m2",tenderId:"tn2",metric:"Lost-time injury frequency rate",target:"Below 0.2 per 100,000 hours",source:"Manual"},
  {id:"m3",tenderId:"tn3",metric:"Snagging items at handover",target:"Fewer than 25 per station",source:"Historical"},
  {id:"m4",tenderId:"tn3",metric:"Programme adherence",target:"No milestone later than 10 working days",source:"Manual"}];
 S.history=[
  {tender:"WKR-C11 Elevated walkway",route:"Open tender",metric:"Cost growth from award to final account",target:"Under 8%",actual:"6.4%"},
  {tender:"WKR-C11 Elevated walkway",route:"Open tender",metric:"Lost-time injury frequency rate",target:"Below 0.25",actual:"0.18"},
  {tender:"ELX-C04 Bridge widening",route:"Open tender",metric:"Programme adherence on key dates",target:"95% on time",actual:"91%"},
  {tender:"ELX-C04 Bridge widening",route:"Open tender",metric:"Non-conformance reports closed within 14 days",target:"90%",actual:"94%"},
  {tender:"SKY-C02 Viaduct section 2",route:"Open tender",metric:"Concrete cube test pass rate",target:"98%",actual:"99.1%"},
  {tender:"SKY-C02 Viaduct section 2",route:"Open tender",metric:"Community complaints per month",target:"Fewer than 5",actual:"3.2"},
  {tender:"DPT-C01 Bus depot",route:"Selective tender",metric:"Earthworks volume variance",target:"Within 5%",actual:"3.8%"}];
 S.packages=[
  {id:"pk2",tenderId:"tn2",version:1,items:["d20","d21","d22","d23"].map(id=>({docId:id,versionNo:1})),status:PS.ICR,createdAt:ago(4),reviews:[],checklist:{},tecViews:{},actions:[],submittedAt:null},
  {id:"pk3",tenderId:"tn3",version:1,items:["d30","d31","d32","d33"].map(id=>({docId:id,versionNo:1})),status:PS.TEC,createdAt:ago(14),reviews:[{by:"u-ctr",stage:"Before TEC",outcome:"Cleared for TEC",at:ago(8),notes:"All checks complete."}],checklist:{},tecViews:{"u-tec2":ago(1)},actions:[],submittedAt:ago(6)}];
 S.notes=[];S.activity=[];
 const a=(at,by,tid,text,docId,link,pid,spId)=>{
  const t=tid?S.tenders.find(x=>x.id===tid):null;
  const s=spId?S.subprojects.find(x=>x.id===spId):(t&&t.spId?S.subprojects.find(x=>x.id===t.spId):null);
  const p=pid?S.projects.find(x=>x.id===pid):(s?S.projects.find(x=>x.id===s.projectId):null);
  S.activity.push({id:"a"+(S.activity.length+1),at,by,tenderId:tid||null,docId:docId||null,link:link||null,text,spId:s?s.id:(spId||null),projectId:p?p.id:(pid||null)});
 };
 a(ago(120),"u-pl",null,"created master project NRE Northshore Rail Extension",null,"#/search/p1","p1");
 a(ago(120),"u-pl",null,"added sub-project Civil works",null,"#/search/p1/sp1","p1","sp1");
 a(ago(120),"u-pl",null,"appointed Priya Nair as sub-project lead for Civil works",null,"#/search/p1/sp1","p1","sp1");
 a(ago(120),"u-pl",null,"added sub-project Stations and systems",null,"#/search/p1/sp2","p1","sp2");
 a(ago(120),"u-pl",null,"appointed Liam Vance as sub-project lead for Stations and systems",null,"#/search/p1/sp2","p1","sp2");
 a(ago(34),"u-spl","tn1","created the tender");a(ago(30),"u-spl","tn1","assigned Marcus Lee as contract project IC");a(ago(26),"u-ic","tn1","selected 8 documents from the catalogue");
 a(ago(20),"u-spl",null,"updated sub-project details for Civil works",null,"#/search/p1/sp1","p1","sp1");
 a(ago(15),"u-pl",null,"updated master project details for NRE",null,"#/search/p1","p1");
 a(ago(8),"u-sme1","tn1","shared Particular specification for review","d5");a(ago(2),"u-rev","tn1","commented on Particular specification","d5");
 a(ago(1),"u-sup","tn1","returned Tender evaluation plan with remarks","d7");a(ago(1),"u-sme2","tn1","sent Special conditions of contract for approval","d3");
 a(ago(4),"u-ic","tn2","sent package v1 for contracts review");a(ago(6),"u-ic","tn3","submitted package v1 to TEC");a(ago(1),"u-tec2","tn3","viewed package v1");
 a(ago(2),"u-spl","tn4","created the tender");
 const n=(uid,text,link,at,key)=>S.notes.push({id:"n"+(S.notes.length+1),userId:uid,text,link,at,read:false,key:key||null,fyi:!key,done:false});
 n("u-sup","Kenji Ito sent Special conditions of contract for approval","#/doc/d3",ago(1),"approve:d3");
 n("u-sme3","Helen Ho returned Tender evaluation plan with remarks","#/doc/d7",ago(1),"own:d7");
 n("u-sme1","Ravi Patel commented on Particular specification","#/doc/d5",ago(2),"comments:d5");
 n("u-ctr","Marcus Lee sent NRE-C02 Depot earthworks for contracts review","#/package/pk2",ago(4),"crReview:pk2");
 n("u-tec","NRE-S01 Station fit-out was submitted to TEC","#/tec/pk3",ago(6),"tecRead:pk3");
 n("u-spl","NRE-C03 Noise barriers needs a contract project IC","#/tender/tn4/overview",ago(2),"assignIC:tn4");
 n("u-ic","Helen Ho returned Tender evaluation plan on NRE-C01","#/doc/d7",ago(1));
 /* No-data edition: start without master projects, sub-projects or tenders.
    Approved documents stay in the Document library as records from past projects. */
 const PAST_AGE={p1:420,p2:260,p3:150};
 S.docs=S.docs.filter(isApproved).map(d=>{
  const t=S.tenders.find(x=>x.id===d.tenderId),sp=S.subprojects.find(x=>x.id===t.spId),p=S.projects.find(x=>x.id===sp.projectId),shift=PAST_AGE[p.id]*DAY;
  d.versions.forEach(v=>{v.at-=shift;});d.approvals.forEach(a=>{a.at-=shift;});
  return Object.assign(d,{name:t.code+" "+d.name,tenderId:null,past:{project:p.name,sp:sp.name,tender:t.code+" "+t.title},createdAt:d.createdAt-shift,updatedAt:d.updatedAt-shift,due:d.due-shift});
 });
 S.projects=[];S.subprojects=[];S.tenders=[];S.packages=[];S.metrics=[];S.notes=[];S.activity=[];
 return S;
}

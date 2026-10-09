/* My Tasks page. */
import { me } from "../core/model.js";
import { route } from "../core/registry.js";
import { reqTasks } from "../core/tasks.js";
import { esc } from "../ui/format.js";
import { adot, badge, ragDot } from "../ui/markup.js";

const taskList=ts=>ts.length?'<div class="list">'+ts.map(t=>'<a class="task" href="'+t.link+'" title="'+esc(t.ctx)+'">'+adot(true)+'<span class="what">'+esc(t.what)+'</span>'+badge(t.status)+'</a>').join("")+'</div>':'<div class="empty">Nothing to do right now.</div>';
route("dashboard",(tab)=>{
  const u=me(),ts=reqTasks(u);
  const curTab=tab||"tasks";
  return '<div class="head"><div><h1>My Tasks</h1></div></div>'+
    '<nav class="tabs u-mt-14" aria-label="Tasks sections">'+
      '<a href="#/dashboard"'+(curTab==="tasks"?' aria-current="page"':'')+'>To do <span class="muted small">'+ts.length+'</span></a>'+
    '</nav>'+
    '<div class="legend"><span>'+adot(true)+'To do</span><span>'+ragDot("w")+'Due soon</span><span>'+ragDot("b")+'Overdue</span></div>'+
    '<h2 class="sec u-mt-8">To do</h2>'+taskList(ts);
});

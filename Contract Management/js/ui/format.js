/* Escaping and date/time formatting. */
import { DAY } from "../core/constants.js";
import { U } from "../core/model.js";

export const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const p2=n=>String(n).padStart(2,"0");
export const fmtD=ts=>{if(!ts)return "–";const d=new Date(ts);return p2(d.getDate())+"/"+p2(d.getMonth()+1)+"/"+d.getFullYear();};
export const fmtDT=ts=>{if(!ts)return "–";const d=new Date(ts);return fmtD(ts)+" "+p2(d.getHours())+":"+p2(d.getMinutes());};
export function rel(ts){const d=(Date.now()-ts)/DAY;if(d<1/24)return "just now";if(d<1)return Math.round(d*24)+" h ago";if(d<2)return "yesterday";return Math.round(d)+" days ago";}
export function dueTxt(ts){if(!ts)return "No due date";const d=Math.round((ts-Date.now())/DAY);if(d<0)return "Overdue by "+(-d)+(d===-1?" day":" days");if(d===0)return "Due today";return "Due in "+d+(d===1?" day":" days");}
export const uname=id=>esc(U(id).name);
export const toISO=ts=>{const d=new Date(ts);return d.toISOString().slice(0,10);};
export const fromISO=s=>s?new Date(s+"T12:00:00").getTime():null;

/* Allow-list sanitiser for rich-text document content. */

/* sanitizer for editor HTML */
const ALLOWED={H3:1,H4:1,P:1,OL:1,UL:1,LI:1,B:1,STRONG:1,I:1,EM:1,BR:1,U:1};
export function sanitize(html){
  const doc=new DOMParser().parseFromString("<div>"+html+"</div>","text/html");const root=doc.body.firstChild;
  (function walk(n){[...n.childNodes].forEach(c=>{if(c.nodeType===3)return;if(c.nodeType!==1){c.remove();return;}
    walk(c);if(c.tagName==="DIV"){const p=doc.createElement("p");while(c.firstChild)p.appendChild(c.firstChild);c.replaceWith(p);return;}
    if(!ALLOWED[c.tagName]){while(c.firstChild)c.parentNode.insertBefore(c.firstChild,c);c.remove();return;}
    [...c.attributes].forEach(a=>c.removeAttribute(a.name));});})(root);
  return root.innerHTML;
}

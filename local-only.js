(function(){
"use strict";
var placeholder="/assets/property-placeholder.svg";
function external(url){
 if(!url||/^(?:#|\/(?!\/)|data:|blob:|mailto:|tel:|javascript:)/i.test(url))return false;
 try{return new URL(url,location.href).origin!==location.origin;}catch(e){return false;}
}
function clean(root){
 (root||document).querySelectorAll("a[href],img[src],script[src],link[href],iframe[src],source[src],video[src],audio[src],form[action]").forEach(function(el){
  var attr=el.matches("a[href]")?"href":el.matches("img[src]")?"src":el.matches("script[src]")?"src":el.matches("link[href]")?"href":el.matches("iframe[src]")?"src":el.matches("source[src]")?"src":el.matches("video[src],audio[src]")?"src":"action";
  var value=el.getAttribute(attr);
  if(!external(value))return;
  if(el.matches("img[src]")){
   el.setAttribute("data-external-image-removed","true");
   el.setAttribute("src",placeholder);
   el.removeAttribute("srcset");
  }else if(el.matches("a[href]")){
   el.removeAttribute("href");
   el.removeAttribute("target");
   el.setAttribute("aria-disabled","true");
   el.classList.add("external-link-removed");
  }else if(el.matches("iframe[src]")){
   el.remove();
  }else if(el.matches("script[src],link[href]")){
   el.remove();
  }else{
   el.removeAttribute(attr);
   if(el.matches("form[action]"))el.setAttribute("action",location.pathname);
  }
 });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){clean(document);});
else clean(document);
if(window.MutationObserver)new MutationObserver(function(records){records.forEach(function(r){r.addedNodes.forEach(function(n){if(n.nodeType===1)clean(n);});});}).observe(document.documentElement,{childList:true,subtree:true});
})();
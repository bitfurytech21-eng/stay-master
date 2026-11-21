(function(){
"use strict";
var pageCountry=document.body.getAttribute("data-listing-country");
if(!pageCountry)pageCountry=/canada/i.test(location.pathname)?"Canada":"United States";
var grid=document.getElementById("naPropertyGrid"),filter=document.getElementById("naCityFilter");
if(!grid||!filter)return;
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function fact(label,value){return value==null||value===""?"":'<li><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong></li>';}
function render(items,city){
 var shown=items.filter(function(p){return city==="all"||p.city===city;});
 document.getElementById("naResultCount").textContent=shown.length+" listing"+(shown.length===1?"":"s");
 if(!shown.length){grid.innerHTML='<p class="na-loading">No imported properties were found for this city.</p>';return;}
 grid.innerHTML=shown.map(function(p){
  var facts=fact("Guests",p.guests)+fact("Bedrooms",p.bedrooms)+fact("Bathrooms",p.bathrooms)+fact("Beds",p.beds);
  var photos=(p.photos||[]).map(function(ph,i){return '<a href="'+esc(ph.url)+'" target="_blank" rel="noopener noreferrer"><img loading="lazy" decoding="async" src="'+esc(ph.url)+'" alt="'+esc(ph.caption||p.name+" photo "+(i+1))+'"></a>';}).join("");
  var amenities=(p.amenities||[]).filter(Boolean).map(function(a){return "<li>"+esc(a)+"</li>";}).join("");
  var details=(p.description||"").trim();
  var gallery=photos?'<div class="na-photo-grid">'+photos+'</div>':"";
  var detailsBlock=(details||amenities||gallery)?'<details class="na-details"><summary>Property details &amp; photo gallery ('+(p.photos||[]).length+' photos)</summary><div class="na-detail-content">'+(details?'<p class="na-description">'+esc(details)+'</p>':"")+(amenities?'<ul class="na-amenities">'+amenities+'</ul>':"")+gallery+'<p class="na-source-note">Information and images are shown as third-party source references. Confirm accuracy and reuse rights with the original listing operator.</p></div></details>':"";
  return '<article class="apt-card"><div class="apt-card-media"><a href="'+esc(p.source_url)+'" target="_blank" rel="noopener noreferrer"><img loading="lazy" decoding="async" src="'+esc(p.hero_image_url)+'" alt="'+esc(p.name)+' property photograph"></a></div><div class="apt-card-body"><p class="na-card-kicker">'+esc(p.city)+' · '+esc(p.country)+' · '+esc(p.property_type||"Property")+'</p><h3><a href="'+esc(p.source_url)+'" target="_blank" rel="noopener noreferrer">'+esc(p.name)+'</a></h3><ul class="apt-specs">'+facts+'</ul>'+(p.area?'<p class="na-area">'+esc(p.area)+'</p>':"")+detailsBlock+'<div class="na-actions"><a class="btn-outline" href="'+esc(p.source_url)+'" target="_blank" rel="noopener noreferrer">View original listing</a><a class="na-map-link" href="'+esc(p.map_url)+'" target="_blank" rel="noopener noreferrer">Approximate map location</a></div></div></article>';
 }).join("");
}
fetch("data/north-america-property-directory.json").then(function(r){if(!r.ok)throw new Error("Property data unavailable");return r.json();}).then(function(data){
 var items=(data.properties||[]).filter(function(p){return p.country===pageCountry;});
 var cities=Array.from(new Set(items.map(function(p){return p.city;}))).sort();
 cities.forEach(function(city){var o=document.createElement("option");o.value=city;o.textContent=city;filter.appendChild(o);});
 document.getElementById("naPropertyCount").textContent=items.length;
 document.getElementById("naCityCount").textContent=cities.length;
 document.getElementById("naPhotoCount").textContent=items.reduce(function(n,p){return n+(p.photos||[]).length;},0).toLocaleString();
 filter.addEventListener("change",function(){render(items,filter.value);});
 render(items,"all");
}).catch(function(){grid.innerHTML='<p class="na-loading">Property listings could not be loaded. Please refresh the page or try again later.</p>';});
})();
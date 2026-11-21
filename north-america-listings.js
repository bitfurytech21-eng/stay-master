(function(){
"use strict";
var pageCountry=document.body.getAttribute("data-listing-country");
if(!pageCountry)pageCountry=/canada/i.test(location.pathname)?"Canada":"United States";
var grid=document.getElementById("naPropertyGrid"),filter=document.getElementById("naCityFilter");
if(!grid||!filter)return;
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function fact(label,value){return value==null||value===""?"":'<li><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong></li>';}
function photoUrl(photo){return typeof photo==="string"?photo:(photo&&photo.url)||"";}
function photoCaption(photo,index){return typeof photo==="object"&&photo.caption?photo.caption:"Property photo "+(index+1);}
function render(items,city){
 var shown=items.filter(function(p){return city==="all"||p.city===city;});
 document.getElementById("naResultCount").textContent=shown.length+" listing"+(shown.length===1?"":"s");
 if(!shown.length){grid.innerHTML='<p class="na-loading">No imported properties were found for this city.</p>';return;}
 grid.innerHTML=shown.map(function(p,index){
  var facts=fact("Guests",p.guests)+fact("Bedrooms",p.bedrooms)+fact("Bathrooms",p.bathrooms)+fact("Beds",p.beds);
  var amenities=(p.amenities||[]).filter(Boolean).map(function(a){return "<li>"+esc(a)+"</li>";}).join("");
  var details=(p.description||"").trim();
  var photos=(p.photos||[]).filter(function(photo){return !!photoUrl(photo);});
  if(p.hero_image_url&&!photos.some(function(photo){return photoUrl(photo)===p.hero_image_url;}))photos.unshift({url:p.hero_image_url,caption:"Main property photo"});
  var gallery=photos.length?'<div class="na-photo-grid" aria-label="Property photo gallery">'+photos.map(function(photo,i){return '<figure><img loading="lazy" decoding="async" src="'+esc(photoUrl(photo))+'" alt="'+esc(p.name+' — '+photoCaption(photo,i))+'"><figcaption>'+esc(photoCaption(photo,i))+'</figcaption></figure>';}).join("")+'</div>':"";
  var detailsBlock=(details||amenities||gallery)?'<details class="na-details"><summary>View full property details, photos &amp; amenities</summary><div class="na-detail-content">'+(details?'<div class="na-description">'+esc(details)+'</div>':"")+(amenities?'<ul class="na-amenities">'+amenities+'</ul>':"")+gallery+'</div></details>':"";
  var hero=p.hero_image_url||photoUrl(photos[0])||"images/property-placeholder.svg";
  return '<article class="apt-card"><div class="apt-card-media"><img loading="lazy" decoding="async" src="'+esc(hero)+'" alt="'+esc(p.name)+' property in '+esc(p.city)+'"></div><div class="apt-card-body"><p class="na-card-kicker">'+esc(p.city)+' · '+esc(p.country)+' · '+esc(p.property_type||"Property")+'</p><h3>'+esc(p.name)+'</h3><ul class="apt-specs">'+facts+'</ul>'+(p.area?'<p class="na-area">'+esc(p.area)+'</p>':"")+detailsBlock+'<p class="na-local-note">Independent property reference. Stay Master has not verified management, availability, rates or booking for this property.</p></div></article>';
 }).join("");
}
fetch("data/north-america-property-directory.json").then(function(r){if(!r.ok)throw new Error("Property data unavailable");return r.json();}).then(function(data){
 var items=(data.properties||[]).filter(function(p){return p.country===pageCountry;});
 var cities=Array.from(new Set(items.map(function(p){return p.city;}))).sort();
 cities.forEach(function(city){var o=document.createElement("option");o.value=city;o.textContent=city;filter.appendChild(o);});
 document.getElementById("naPropertyCount").textContent=items.length;
 document.getElementById("naCityCount").textContent=cities.length;
 document.getElementById("naPhotoCount").textContent=items.reduce(function(total,p){return total+(p.photos||[]).length+(p.hero_image_url?1:0);},0);
 filter.addEventListener("change",function(){render(items,filter.value);});
 render(items,"all");
}).catch(function(){grid.innerHTML='<p class="na-loading">Property listings could not be loaded. Please refresh the page or try again later.</p>';});
})();
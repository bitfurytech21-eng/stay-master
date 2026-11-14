(() => {
const $ = (s) => document.querySelector(s);
// Resolve API paths through api-config.js so the frontend can talk to the
// deployed backend even when the HTML is served from a different origin.
const apiUrl = (p) => (window.STAY_MASTER_API ? window.STAY_MASTER_API.url(p) : p);
// Cookies must be sent with 'include' when the API is on another origin,
// otherwise the guest session would be dropped on every request.
const credentialsMode = () => (window.STAY_MASTER_API && window.STAY_MASTER_API.crossOrigin ? 'include' : 'same-origin');
const api = async (url, options={}) => {
  const response = await fetch(apiUrl(url),{credentials:credentialsMode(),headers:{'Content-Type':'application/json',...(options.headers||{})},...options});
  const data = await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data.error || 'The request could not be completed.');
  return data;
};
const msg = (el,text,type='') => {el.textContent=text;el.className='booking-message '+type;};
const escapeHtml = (v) => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const results = $('#propertyResults');
let lastSearch = null;
const cities = {London:'london',Rome:'rome',Barcelona:'barcelona',Athens:'athens',Warsaw:'warsaw',Hamburg:'hamburg',Salzburg:'salzburg','Tel Aviv':'tel-aviv','Bat Yam':'bat-yam'};
// The team address used when the booking service cannot be reached. Kept in one
// place so the fallback never drifts from the contact page.
const TEAM_EMAIL = 'easytravelagency@trustagent.space';

/* ------------------------------------------------------------------ *
 * Static inventory
 *
 * The apartment list is published data, not live data: it is generated from
 * data/site.json into inventory.json by build_inventory.py. Reading it means
 * search works on any static host (GitHub Pages included) with no backend.
 * The API is still preferred when it answers, because only it knows live
 * availability and rates.
 * ------------------------------------------------------------------ */
let inventoryPromise = null;
function loadInventory(){
  if(!inventoryPromise){
    inventoryPromise = fetch('inventory.json',{cache:'no-cache'})
      .then(r=>{ if(!r.ok) throw new Error('inventory'); return r.json(); })
      .then(d=>Array.isArray(d.properties)?d.properties:[])
      .catch(()=>[]);
  }
  return inventoryPromise;
}

// Returns {source:'api'|'static', properties:[...]}. Never throws: if the API
// is unreachable the static inventory is used instead, so a search always
// produces a result rather than an error.
// Once the API has failed, stop retrying it for the rest of the page load: a
// dead host should not add a failed request to every search.
let apiDown = false;
async function loadProperties(city=''){
  if(!apiDown){
    try{
      const params=new URLSearchParams();if(city)params.set('city',city);
      const data=await api('/api/booking/properties?'+params.toString());
      if(data && Array.isArray(data.properties) && data.properties.length){
        return {source:'api',properties:data.properties};
      }
    }catch(e){apiDown=true;/* fall back to the static inventory */}
  }
  const all=await loadInventory();
  const properties=city?all.filter(p=>p.citySlug===city):all;
  return {source:'static',properties};
}

function propertyCard(p){
 const image=p.image?'<img src="'+escapeHtml(p.image)+'" alt="'+escapeHtml(p.name)+'" loading="lazy">':'<div class="property-placeholder"></div>';
 const link=p.page?'<a class="property-card-link" href="'+escapeHtml(p.page)+'">View property</a>':'';
 return '<article class="property-card">'+image+'<div class="property-card-body"><p class="eyebrow">'+escapeHtml(p.city)+', '+escapeHtml(p.country)+'</p><h3>'+escapeHtml(p.name)+'</h3><p>'+escapeHtml(p.address||p.description||'Serviced apartments by master')+'</p>'+link+'<div class="unit-list" id="units-'+escapeHtml(p.id||p.slug)+'"><small>Choose dates and search to check availability.</small></div></div></article>';
}

// Render the units of one property from the static inventory, filtered by the
// number of guests. Rates are not published, so every unit is "on request".
function staticUnitsHtml(p,guests){
 const units=(p.units||[]).filter(u=>u.maxGuests>=guests);
 if(!units.length){
  return '<small>No apartment at this property sleeps '+escapeHtml(guests)+'. Please contact our team for options.</small>';
 }
 return units.map(u=>{
  const detail=[u.guestsLabel?escapeHtml(u.guestsLabel)+' guests':'',u.bedrooms?u.bedrooms+' bed':'',u.sqm?u.sqm+' m\u00b2':''].filter(Boolean).join(' \u00b7 ');
  return '<div class="unit-row"><span><strong>'+escapeHtml(u.name)+'</strong>'+detail+'<br><strong>Rate on request</strong> <small>our team will send you a quote</small></span>'
   +'<button type="button" data-unit-slug="'+escapeHtml(u.slug)+'" data-property-slug="'+escapeHtml(p.slug)+'" data-unit-name="'+escapeHtml(u.name)+'" data-property-name="'+escapeHtml(p.name)+'">Request booking</button></div>';
 }).join('');
}

async function search(event){
 if(event)event.preventDefault();
 const cityName=$('#city').value, checkIn=$('#checkIn').value, checkOut=$('#checkOut').value, guests=Number($('#guests').value||2);
 if(!checkIn||!checkOut||checkOut<=checkIn){msg($('#searchMessage'),'Choose a valid check-in and check-out date.','error');return;}
 if(new Date(checkIn+'T00:00:00')<new Date(new Date().toDateString())){msg($('#searchMessage'),'Check-in must be today or a future date.','error');return;}
 lastSearch={checkIn,checkOut,guests};
 const button=$('#searchForm button');button.disabled=true;button.textContent='Searching\u2026';
 try{
  const {source,properties}=await loadProperties(cities[cityName]||'');
  results.innerHTML=properties.length?properties.map(propertyCard).join(''):'<div class="booking-empty">No properties match that destination. Please contact our team for assistance.</div>';
  $('#resultCount').textContent=properties.length+(properties.length===1?' property':' properties');
  await Promise.all(properties.map(async p=>{
   const box=$('#units-'+(p.id||p.slug));
   if(!box)return;
   if(source==='static'){
    box.innerHTML=staticUnitsHtml(p,guests);
    return;
   }
   try{
    const data=await api('/api/booking/availability?'+new URLSearchParams({propertyId:p.id,checkIn,checkOut,guests}));
    box.innerHTML=data.units.length?data.units.map(u=>{
     const onRequest=u.nightly_rate_minor===0;
     const price=onRequest
       ? '<strong>Rate on request</strong> <small>our team will send you a quote for '+data.nights+' nights</small>'
       : escapeHtml(u.max_guests)+' guests \u00b7 '+(u.nightly_rate_minor/100).toFixed(2)+' '+escapeHtml(u.currency)+' / night<br><strong>Stay total: '+((u.nightly_rate_minor*data.nights)/100).toFixed(2)+' '+escapeHtml(u.currency)+'</strong> <small>for '+data.nights+' nights, before any separately disclosed fees</small>';
     return '<div class="unit-row"><span><strong>'+escapeHtml(u.name)+'</strong>'+price+'</span><button type="button" data-unit="'+u.id+'" data-property="'+p.id+'">Request booking</button></div>';
    }).join('') : (p.unit_types===0?'<small>Rates and bookable inventory are not yet configured for this property. Please contact our team.</small>':'<small>No matching units available for these dates.</small>');
   }catch(e){
    // The API answered the property list but not availability: show the
    // published inventory rather than an error.
    box.innerHTML=staticUnitsHtml(p,guests);
   }
  }));
  msg($('#searchMessage'),source==='static'
   ? 'Showing our published apartments. Rates are on request and every booking is confirmed by our team.'
   : 'Availability is based on inventory entered by the property team. Requests remain pending until confirmed.','');
 }catch(e){msg($('#searchMessage'),e.message,'error');}
 finally{button.disabled=false;button.textContent='Search stays';}
}
$('#searchForm').addEventListener('submit',search);

// A booking request that could not reach the API is not silently dropped: the
// guest is told plainly and given a working way to send the same details.
function offerEmailFallback(unitName,propertyName){
 const subject='Booking request: '+unitName+' at '+propertyName;
 const body=['Hello master team,','','I would like to request this apartment:','',
  'Apartment: '+unitName,'Property: '+propertyName,
  lastSearch?('Check in: '+lastSearch.checkIn):'',
  lastSearch?('Check out: '+lastSearch.checkOut):'',
  lastSearch?('Guests: '+lastSearch.guests):'',
  '','Please confirm availability and send me a quote.',''].filter(Boolean).join('\n');
 const href='mailto:'+TEAM_EMAIL+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
 const box=$('#searchMessage');
 box.className='booking-message error';
 box.innerHTML='Our booking service is not reachable right now, so your request was not submitted. '
  +'<a href="'+escapeHtml(href)+'">Email our team about '+escapeHtml(unitName)+'</a> and we will confirm availability and send a quote.';
}

results.addEventListener('click',async e=>{
 const button=e.target.closest('[data-unit],[data-unit-slug]');if(!button)return;
 // Static-inventory path: no numeric ids, so the API cannot be used for it.
 if(button.dataset.unitSlug){
  offerEmailFallback(button.dataset.unitName,button.dataset.propertyName);
  return;
 }
 try{
  const me=await api('/api/auth/me');
  if(!me.user){msg($('#authMessage'),'Please sign in or create an account before requesting a booking.','error');$('#guestAccess').scrollIntoView({behavior:'smooth'});return;}
  const booking=await api('/api/bookings',{method:'POST',body:JSON.stringify({unitId:Number(button.dataset.unit),propertyId:Number(button.dataset.property),...lastSearch})});
  msg($('#authMessage'),'Booking request '+booking.reference+' received. Payment is not collected yet; our team will confirm your request.','success');
  $('#guestAccess').scrollIntoView({behavior:'smooth'});await loadAccount();
 }catch(err){
  const row=button.closest('.unit-row');
  const name=row&&row.querySelector('strong')?row.querySelector('strong').textContent:'this apartment';
  offerEmailFallback(name,'master');
 }
});
document.querySelectorAll('[data-auth-tab]').forEach(button=>button.addEventListener('click',()=>{
 document.querySelectorAll('[data-auth-tab]').forEach(b=>b.classList.toggle('active',b===button));
 $('#loginForm').hidden=button.dataset.authTab!=='login';$('#registerForm').hidden=button.dataset.authTab!=='register';msg($('#authMessage'),'');
}));
async function authSubmit(form,endpoint){
 const button=form.querySelector('button[type=submit]');button.disabled=true;
 try{const body=Object.fromEntries(new FormData(form).entries());await api(endpoint,{method:'POST',body:JSON.stringify(body)});form.reset();msg($('#authMessage'),'You are signed in.','success');await loadAccount();}
 catch(e){msg($('#authMessage'),e.message,'error');}
 finally{button.disabled=false;}
}
$('#loginForm').addEventListener('submit',e=>{e.preventDefault();authSubmit(e.currentTarget,'/api/auth/login');});
$('#registerForm').addEventListener('submit',e=>{e.preventDefault();authSubmit(e.currentTarget,'/api/auth/register');});
async function openManualCheckout(reference,amountMinor,currency){
 const panel=$('#manualCheckout');panel.hidden=false;panel.innerHTML='<h3>Manual bank transfer checkout</h3><p>Loading payment instructions\u2026</p>';panel.scrollIntoView({behavior:'smooth',block:'center'});
 try{
  const methods=await api('/api/payments/methods');
  if(!methods.methods.length){panel.innerHTML='<h3>Manual checkout unavailable</h3><p>'+escapeHtml(methods.message)+'</p><p>Contact our reservations team for payment instructions.</p>';return;}
  const method=methods.methods[0];
  if(method.currency!==currency){panel.innerHTML='<h3>Payment currency unavailable</h3><p>The configured bank account accepts '+escapeHtml(method.currency)+' but this booking is priced in '+escapeHtml(currency)+'. Please contact our reservations team for payment instructions. Do not transfer funds to this account for this booking.</p>';return;}
  panel.innerHTML='<h3>Manual bank transfer</h3><p>Booking reference: <strong>'+escapeHtml(reference)+'</strong></p><p>Amount due: <strong>'+((amountMinor/100).toFixed(2))+' '+escapeHtml(currency)+'</strong></p><p>Transfer to the account below. Use your booking reference as the transfer description.</p><dl class="payment-details"><dt>Bank</dt><dd>'+escapeHtml(method.bankName)+'</dd><dt>Account name</dt><dd>'+escapeHtml(method.accountName)+'</dd><dt>Account number</dt><dd>'+escapeHtml(method.accountNumber)+'</dd>'+(method.sortCode?'<dt>Sort code</dt><dd>'+escapeHtml(method.sortCode)+'</dd>':'')+(method.iban?'<dt>IBAN</dt><dd>'+escapeHtml(method.iban)+'</dd>':'')+(method.swift?'<dt>SWIFT/BIC</dt><dd>'+escapeHtml(method.swift)+'</dd>':'')+'<dt>Instructions</dt><dd>'+escapeHtml(method.instructions)+'</dd></dl><form id="manualPaymentForm" class="auth-form"><label>Account holder / payer name<input name="payerName" required minlength="2" maxlength="120"></label><label>Transfer transaction reference<input name="transactionReference" required minlength="4" maxlength="120"></label><label>Transfer date<input name="transferDate" type="date" required></label><label>Additional notes (optional)<textarea name="notes" maxlength="500" rows="3"></textarea></label><button class="booking-primary" type="submit">Submit payment for verification</button></form><div id="paymentMessage" class="booking-message" role="status"></div><p class="payment-caution">Submitting details does not confirm payment. Keep your bank receipt. The team will verify the funds before updating your booking.</p>';
  $('#manualPaymentForm').addEventListener('submit',async e=>{e.preventDefault();const button=e.currentTarget.querySelector('button');button.disabled=true;try{const values=Object.fromEntries(new FormData(e.currentTarget).entries());const result=await api('/api/bookings/'+encodeURIComponent(reference)+'/payments',{method:'POST',body:JSON.stringify({...values,amountMinor})});msg($('#paymentMessage'),result.message,'success');await loadAccount();}catch(error){msg($('#paymentMessage'),error.message,'error');}finally{button.disabled=false;}});
 }catch(error){panel.textContent=error.message;}
}
$('#bookingHistory').addEventListener('click',e=>{const button=e.target.closest('[data-pay-booking]');if(button)openManualCheckout(button.dataset.payBooking,Number(button.dataset.amount),button.dataset.currency);});

async function loadAccount(){
 try{
  const me=await api('/api/auth/me');if(!me.user){$('#accountPanel').hidden=true;return;}
  $('#accountPanel').hidden=false;$('#welcomeName').textContent='Welcome, '+me.user.name;
  const data=await api('/api/bookings/mine');
  $('#bookingHistory').innerHTML=data.bookings.length?data.bookings.map(b=>{
   // A 0 total means the apartment is priced on request: there is nothing to
   // pay yet, so never offer a checkout button for it.
   const priced=b.total_minor>0;
   const total=priced?((b.total_minor/100).toFixed(2)+' '+escapeHtml(b.currency)):'Rate on request';
   const payButton=(priced&&b.payment_status!=='paid'&&b.status!=='cancelled')?'<br><button type="button" class="booking-secondary" data-pay-booking="'+escapeHtml(b.reference)+'" data-amount="'+b.total_minor+'" data-currency="'+escapeHtml(b.currency)+'">Manual checkout \u00b7 '+total+'</button>':'';
   return '<div class="history-row"><strong>'+escapeHtml(b.reference)+' \u00b7 '+escapeHtml(b.property_name)+'</strong>'+escapeHtml(b.unit_name)+' \u00b7 '+escapeHtml(b.city)+'<br>'+escapeHtml(b.check_in)+' to '+escapeHtml(b.check_out)+' \u00b7 '+b.nights+' nights<br>'+escapeHtml(b.status)+' / payment '+escapeHtml(b.payment_status)+' / submission '+escapeHtml(b.latest_payment_submission||'none')+(b.latest_payment_submission==='submitted'?'<br><span>Payment submission awaiting review</span>':payButton)+'<br><span>'+total+'</span></div>';
  }).join(''):'<p>You have no booking requests yet.</p>';
 }catch(e){/* signed-out state is shown by default */}
}
$('#logoutButton').addEventListener('click',async()=>{try{await api('/api/auth/logout',{method:'POST',body:'{}'});$('#accountPanel').hidden=true;msg($('#authMessage'),'You have signed out.');}catch(e){msg($('#authMessage'),e.message,'error');}});
const params=new URLSearchParams(location.search);if(params.has('city')){$('#city').value=Object.keys(cities).find(k=>cities[k]===params.get('city'))||'';}
if(params.has('checkin'))$('#checkIn').value=params.get('checkin');if(params.has('checkout'))$('#checkOut').value=params.get('checkout');
if(params.has('guests')){const g=Math.max(1,Math.min(12,Number(params.get('guests'))||2));$('#guests').value=String(g);}
loadAccount();
// Fill a sensible default window (30 days out, 3 nights) when the visitor
// arrived without dates, so a search always has something to run on.
function ensureDates(){
  if($('#checkIn').value&&$('#checkOut').value)return;
  const d=new Date();d.setDate(d.getDate()+30);
  const a=new Date(d);a.setDate(a.getDate()+3);
  const iso=x=>x.toISOString().slice(0,10);
  if(!$('#checkIn').value)$('#checkIn').value=iso(d);
  if(!$('#checkOut').value)$('#checkOut').value=iso(a);
}
// Arriving from the homepage search widget: run the search straight away.
if(params.has('checkin')&&params.has('checkout')){search();}
// Arriving with only a destination (the homepage widget without dates): still
// search, so the button always produces results.
else if(params.has('city')){ensureDates();search();}
// Arriving from a property page's "Check Availability": highlight that apartment.
if(params.has('unit')){
  if(!params.has('checkin')||!params.has('checkout')){ensureDates();search();}
  // The deep link carries the apartment name; compare like-for-like slugs.
  const slugify=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const wanted=slugify(params.get('unit'));
  const mark=()=>{
    const rows=[...document.querySelectorAll('.unit-row')];
    const hit=rows.find(r=>{
      const n=r.querySelector('strong');
      return n && slugify(n.textContent)===wanted;
    });
    if(hit){hit.classList.add('unit-row--highlight');hit.scrollIntoView({behavior:'smooth',block:'center'});}
  };
  // Results may still be loading; watch for them briefly.
  let tries=0;
  const t=setInterval(()=>{mark();if(++tries>20)clearInterval(t);},250);
}
})();

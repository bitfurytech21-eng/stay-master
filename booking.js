(() => {
const $ = (s) => document.querySelector(s);
const api = async (url, options={}) => {
  const response = await fetch(url,{credentials:'same-origin',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});
  const data = await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data.error || 'The request could not be completed.');
  return data;
};
const msg = (el,text,type='') => {el.textContent=text;el.className='booking-message '+type;};
const escapeHtml = (v) => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const results = $('#propertyResults');
let lastSearch = null;
const cities = {London:'london',Rome:'rome',Barcelona:'barcelona',Athens:'athens',Warsaw:'warsaw',Hamburg:'hamburg',Salzburg:'salzburg','Tel Aviv':'tel-aviv','Bat Yam':'bat-yam'};
async function loadProperties(city=''){
 const params=new URLSearchParams();if(city)params.set('city',city);
 const data=await api('/api/booking/properties?'+params.toString());
 return data.properties;
}
function propertyCard(p){
 const image=p.image?'<img src="'+escapeHtml(p.image)+'" alt="'+escapeHtml(p.name)+'" loading="lazy">':'<div class="property-placeholder"></div>';
 return '<article class="property-card">'+image+'<div class="property-card-body"><p class="eyebrow">'+escapeHtml(p.city)+', '+escapeHtml(p.country)+'</p><h3>'+escapeHtml(p.name)+'</h3><p>'+escapeHtml(p.address||p.description||'Serviced apartments by master')+'</p><div class="unit-list" id="units-'+p.id+'"><small>Choose dates and search to check availability.</small></div></div></article>';
}
async function search(event){
 if(event)event.preventDefault();
 const cityName=$('#city').value, checkIn=$('#checkIn').value, checkOut=$('#checkOut').value, guests=Number($('#guests').value||2);
 if(!checkIn||!checkOut||checkOut<=checkIn){msg($('#searchMessage'),'Choose a valid check-in and check-out date.','error');return;}
 if(new Date(checkIn+'T00:00:00')<new Date(new Date().toDateString())){msg($('#searchMessage'),'Check-in must be today or a future date.','error');return;}
 lastSearch={checkIn,checkOut,guests};
 const button=$('#searchForm button');button.disabled=true;button.textContent='Searching…';
 try{
  const properties=await loadProperties(cities[cityName]||'');
  results.innerHTML=properties.length?properties.map(propertyCard).join(''):'<div class="booking-empty">No properties have been published to the booking inventory yet. Please contact our team for assistance.</div>';
  $('#resultCount').textContent=properties.length+' properties';
  await Promise.all(properties.map(async p=>{
   const box=$('#units-'+p.id);
   try{
    const data=await api('/api/booking/availability?'+new URLSearchParams({propertyId:p.id,checkIn,checkOut,guests}));
    box.innerHTML=data.units.length?data.units.map(u=>'<div class="unit-row"><span><strong>'+escapeHtml(u.name)+'</strong>'+escapeHtml(u.max_guests)+' guests · '+(u.nightly_rate_minor/100).toFixed(2)+' '+escapeHtml(u.currency)+' / night</span><button type="button" data-unit="'+u.id+'" data-property="'+p.id+'">Request booking</button></div>').join('') : (p.unit_types===0?'<small>Rates and bookable inventory are not yet configured for this property. Please contact our team.</small>':'<small>No matching units available for these dates.</small>');
   }catch(e){box.textContent=e.message;}
  }));
  msg($('#searchMessage'),'Availability is based on inventory entered by the property team. Requests remain pending until confirmed.','');
 }catch(e){msg($('#searchMessage'),e.message,'error');}
 finally{button.disabled=false;button.textContent='Search stays';}
}
$('#searchForm').addEventListener('submit',search);
results.addEventListener('click',async e=>{
 const button=e.target.closest('[data-unit]');if(!button)return;
 try{
  const me=await api('/api/auth/me');
  if(!me.user){msg($('#authMessage'),'Please sign in or create an account before requesting a booking.','error');$('#guestAccess').scrollIntoView({behavior:'smooth'});return;}
  const booking=await api('/api/bookings',{method:'POST',body:JSON.stringify({unitId:Number(button.dataset.unit),propertyId:Number(button.dataset.property),...lastSearch})});
  msg($('#authMessage'),'Booking request '+booking.reference+' received. Payment is not collected yet; our team will confirm your request.','success');
  $('#guestAccess').scrollIntoView({behavior:'smooth'});await loadAccount();
 }catch(err){msg($('#searchMessage'),err.message,'error');}
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
 const panel=$('#manualCheckout');panel.hidden=false;panel.innerHTML='<h3>Manual bank transfer checkout</h3><p>Loading payment instructions…</p>';panel.scrollIntoView({behavior:'smooth',block:'center'});
 try{
  const methods=await api('/api/payments/methods');
  if(!methods.methods.length){panel.innerHTML='<h3>Manual checkout unavailable</h3><p>'+escapeHtml(methods.message)+'</p><p>Contact our reservations team for payment instructions.</p>';return;}
  const method=methods.methods[0];
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
  $('#bookingHistory').innerHTML=data.bookings.length?data.bookings.map(b=>'<div class="history-row"><strong>'+escapeHtml(b.reference)+' · '+escapeHtml(b.property_name)+'</strong>'+escapeHtml(b.unit_name)+' · '+escapeHtml(b.city)+'<br>'+escapeHtml(b.check_in)+' to '+escapeHtml(b.check_out)+' · '+b.nights+' nights<br>'+escapeHtml(b.status)+' / payment '+escapeHtml(b.payment_status)+' / submission '+escapeHtml(b.latest_payment_submission||'none')+(b.latest_payment_submission==='submitted'?'<br><span>Payment submission awaiting review</span>':(b.payment_status!=='paid'&&b.status!=='cancelled'?'<br><button type="button" class="booking-secondary" data-pay-booking="'+escapeHtml(b.reference)+'" data-amount="'+b.total_minor+'" data-currency="'+escapeHtml(b.currency)+'">Manual checkout · '+(b.total_minor/100).toFixed(2)+' '+escapeHtml(b.currency)+'</button>':''))+'</div>').join(''):'<p>You have no booking requests yet.</p>';
 }catch(e){/* signed-out state is shown by default */}
}
$('#logoutButton').addEventListener('click',async()=>{try{await api('/api/auth/logout',{method:'POST',body:'{}'});$('#accountPanel').hidden=true;msg($('#authMessage'),'You have signed out.');}catch(e){msg($('#authMessage'),e.message,'error');}});
const params=new URLSearchParams(location.search);if(params.has('city')){$('#city').value=Object.keys(cities).find(k=>cities[k]===params.get('city'))||'';}
if(params.has('checkin'))$('#checkIn').value=params.get('checkin');if(params.has('checkout'))$('#checkOut').value=params.get('checkout');
loadAccount();
})();
export const propertyCatalog = [
  {slug:'london-master-st-pauls',name:"master St. Paul's",city:'London',country:'United Kingdom',address:'9 Creed Lane, London EC4V 5BR, UK',image:'images/buildings/london-master-st-pauls-01.jpg'},
  {slug:'london-master-cannon',name:'master Cannon',city:'London',country:'United Kingdom',address:'2 Suffolk Lane, London EC4R 0AT, UK',image:'images/buildings/london-master-cannon-01.jpg'},
  {slug:'london-master-farringdon',name:'master Farringdon',city:'London',country:'United Kingdom',address:'66 Turnmill Street, London EC1M 5RR, UK',image:'images/buildings/london-master-farringdon-01.jpg'},
  {slug:'rome-master-trevi',name:'master Trevi',city:'Rome',country:'Italy',address:'Via dei Maroniti 19, 00187 Roma, Italy',image:'images/buildings/rome-master-trevi-01.jpg'},
  {slug:'barcelona-master-la-rambla',name:'master La Rambla',city:'Barcelona',country:'Spain',address:'La Rambla, 34, 08002 Barcelona, Spain',image:'images/buildings/barcelona-master-la-rambla-01.jpg'},
  {slug:'athens-master-plaka',name:'Plaka Athens',city:'Athens',country:'Greece',address:'Apollonos 34, Athens, Greece',image:'images/buildings/athens-master-plaka-athens-01.jpg'},
  {slug:'warsaw-master-wola',name:'master Wola',city:'Warsaw',country:'Poland',address:'Grzybowska 45, 00-844 Warszawa, Poland',image:'images/buildings/warsaw-master-wola-01.jpg'},
  {slug:'hamburg-master-altona',name:'Altona Hamburg',city:'Hamburg',country:'Germany',address:'Beerenweg 1C, 22761 Hamburg, Germany',image:'images/buildings/hamburg-master-altona-01.jpg'},
  {slug:'salzburg-master-mirabell',name:'Mirabell Salzburg',city:'Salzburg',country:'Austria',address:'Rainerstrasse 7, Salzburg, Austria',image:'images/buildings/salzburg-master-mirabell-01.jpg'},
  {slug:'salzburg-master-linzergasse',name:'Linzergasse Salzburg',city:'Salzburg',country:'Austria',address:'Schallmooser Hauptstrasse 2, Salzburg, Austria',image:'images/buildings/salzburg-master-linzergasse-01.jpg'},
  {slug:'tel-aviv-mazeh',name:'Mazeh Tel Aviv',city:'Tel Aviv',country:'Israel',address:'56 Mazeh, Tel Aviv, Israel',image:'images/buildings/tel-aviv-mazeh-tel-aviv-01.jpg'},
  {slug:'tel-aviv-master-shenkin',name:'master Shenkin',city:'Tel Aviv',country:'Israel',address:'38 Shenkin St, Tel Aviv, Israel',image:'images/buildings/tel-aviv-master-shenkin-01.jpg'},
  {slug:'bat-yam-master-bat-yam',name:'master Bat Yam',city:'Bat Yam',country:'Israel',address:'Yochanan HaSandlar 4 Street, Bat Yam, Israel',image:'images/buildings/bat-yam-master-bat-yam-01.jpg'}
];

export function seedBookingCatalog(db) {
  const insert = db.prepare(`INSERT OR IGNORE INTO booking_properties
    (slug,name,city,country,address,image,created_at) VALUES(?,?,?,?,?,?,?)`);
  const now = new Date().toISOString();
  const seed = db.transaction(() => {
    for (const p of propertyCatalog) insert.run(p.slug,p.name,p.city,p.country,p.address,p.image,now);
  });
  seed();
}

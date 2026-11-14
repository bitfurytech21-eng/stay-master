import { rateTable } from './rates.js';

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

/**
 * Bookable apartment types, taken from the real apartment list in data/site.json.
 *
 * Rates are not declared here: they come from rateTable (see rates.js), keyed by
 * this property slug and the unit name below. A unit with no rate entry is
 * seeded at 0, which the booking engine reads as "rate on request" - it never
 * invents a nightly rate.
 */
export const unitCatalog = [
  {property:'london-master-st-pauls',name:"Inner Lightwell Studio",maxGuests:2},
  {property:'london-master-st-pauls',name:"Studio",maxGuests:2},
  {property:'london-master-st-pauls',name:"Family Apartment (4 PAX)",maxGuests:4},
  {property:'london-master-st-pauls',name:"Family Apartment (5 PAX)",maxGuests:5},
  {property:'london-master-cannon',name:"Lower Ground Studio",maxGuests:2},
  {property:'london-master-cannon',name:"Studio",maxGuests:2},
  {property:'london-master-cannon',name:"Studio with sofa bed",maxGuests:3},
  {property:'london-master-cannon',name:"One bedroom open plan",maxGuests:4},
  {property:'london-master-cannon',name:"Family Apartment (4 PAX)",maxGuests:4},
  {property:'london-master-cannon',name:"Family Apartment (5 PAX)",maxGuests:5},
  {property:'london-master-cannon',name:"Family Apartment (6 PAX)",maxGuests:6},
  {property:'london-master-farringdon',name:"One bedroom open plan",maxGuests:4},
  {property:'london-master-farringdon',name:"Family Apartment",maxGuests:8},
  {property:'rome-master-trevi',name:"Studio",maxGuests:2},
  {property:'rome-master-trevi',name:"Studio with Balcony",maxGuests:3},
  {property:'rome-master-trevi',name:"Large studio Ground level",maxGuests:4},
  {property:'rome-master-trevi',name:"Large Studio with Balcony",maxGuests:4},
  {property:'rome-master-trevi',name:"One-Bedroom Apartment with Large Terrace",maxGuests:4},
  {property:'rome-master-trevi',name:"Family Apartment with Balcony",maxGuests:5},
  {property:'rome-master-trevi',name:"Two-Bedroom Penthouse with Large Terrace",maxGuests:4},
  {property:'rome-master-trevi',name:"Three-Bedroom Penthouse with Large Terrace",maxGuests:6},
  {property:'barcelona-master-la-rambla',name:"Interior One Bedroom Apartment",maxGuests:4},
  {property:'barcelona-master-la-rambla',name:"Studio with Balcony",maxGuests:4},
  {property:'barcelona-master-la-rambla',name:"One Bedroom Apartment with Balcony",maxGuests:4},
  {property:'barcelona-master-la-rambla',name:"One Bedroom with Large Terrace",maxGuests:2},
  {property:'barcelona-master-la-rambla',name:"Two Bedroom Apartment with Balcony",maxGuests:4},
  {property:'barcelona-master-la-rambla',name:"Family Two Bedroom Apartment",maxGuests:8},
  {property:'barcelona-master-la-rambla',name:"Two Bedroom penthouse with Large Terrace",maxGuests:6},
  {property:'athens-master-plaka',name:"Plaka Comfort Studio",maxGuests:2},
  {property:'athens-master-plaka',name:"Plaka Superior Studio with Sofa Bed",maxGuests:4},
  {property:'athens-master-plaka',name:"Plaka Balcony Studio",maxGuests:2},
  {property:'athens-master-plaka',name:"Plaka One-Bedroom Suite",maxGuests:4},
  {property:'athens-master-plaka',name:"Plaka One-Bedroom Suite with Balcony",maxGuests:4},
  {property:'athens-master-plaka',name:"Acropolis View Penthouse Suite",maxGuests:4},
  {property:'athens-master-plaka',name:"Plaka Family Suite",maxGuests:8},
  {property:'athens-master-plaka',name:"Acropolis View Family Penthouse Suite",maxGuests:8},
  {property:'warsaw-master-wola',name:"Studio Apartment",maxGuests:2},
  {property:'warsaw-master-wola',name:"Studio with Sofa bed",maxGuests:4},
  {property:'warsaw-master-wola',name:"One Bedroom Apartment",maxGuests:2},
  {property:'warsaw-master-wola',name:"One Bedroom Apartment with Sofa bed",maxGuests:4},
  {property:'warsaw-master-wola',name:"Two Bedroom Apartment",maxGuests:6},
  {property:'warsaw-master-wola',name:"Three Bedroom Apartment",maxGuests:6},
  {property:'warsaw-master-wola',name:"Family Two-Bedroom Apartment 6 PAX",maxGuests:6},
  {property:'warsaw-master-wola',name:"Family Two-Bedroom Apartment 8 PAX",maxGuests:8},
  {property:'hamburg-master-altona',name:"Studio Apartment",maxGuests:2},
  {property:'hamburg-master-altona',name:"Studio Apartment with Sofa Bed",maxGuests:4},
  {property:'hamburg-master-altona',name:"Family Apartment",maxGuests:6},
  {property:'salzburg-master-mirabell',name:"Studio Apartment",maxGuests:2},
  {property:'salzburg-master-mirabell',name:"Studio Apartment with Sofa bed",maxGuests:4},
  {property:'salzburg-master-mirabell',name:"Deluxe Studio",maxGuests:2},
  {property:'salzburg-master-mirabell',name:"Compact One Bedroom Apartment",maxGuests:3},
  {property:'salzburg-master-mirabell',name:"One Bedroom Apartment",maxGuests:4},
  {property:'salzburg-master-mirabell',name:"Deluxe One Bedroom with Single Sofabed",maxGuests:3},
  {property:'salzburg-master-mirabell',name:"One Bedroom Suite",maxGuests:4},
  {property:'salzburg-master-mirabell',name:"Deluxe One Bedroom Suite",maxGuests:4},
  {property:'salzburg-master-mirabell',name:"Family Apartment",maxGuests:8},
  {property:'salzburg-master-mirabell',name:"Three Bedroom Penthouse with Terrace",maxGuests:6},
  {property:'salzburg-master-linzergasse',name:"Studio Apartment",maxGuests:2},
  {property:'salzburg-master-linzergasse',name:"One Bedroom Open Plan Suite",maxGuests:4},
  {property:'salzburg-master-linzergasse',name:"One Bedroom Apartment",maxGuests:4},
  {property:'tel-aviv-mazeh',name:"One Bedroom Apartment",maxGuests:2},
  {property:'tel-aviv-mazeh',name:"One Bedroom Apartment with Sofa Bed",maxGuests:4},
  {property:'tel-aviv-mazeh',name:"One Bedroom Apartment with Balcony",maxGuests:2},
  {property:'tel-aviv-mazeh',name:"One Bedroom Apartment with Balcony & Sofa Bed",maxGuests:4},
  {property:'tel-aviv-mazeh',name:"Two Bedroom Apartment with Sofa Bed",maxGuests:6},
  {property:'tel-aviv-mazeh',name:"One Bedroom Apartment with Big Terrace & Sofa Bed",maxGuests:4},
  {property:'tel-aviv-master-shenkin',name:"One Bedroom Apartment",maxGuests:4},
  {property:'tel-aviv-master-shenkin',name:"One Bedroom Apartment With Balcony",maxGuests:4},
  {property:'tel-aviv-master-shenkin',name:"Two Bedroom Apartment With Balcony",maxGuests:6},
  {property:'tel-aviv-master-shenkin',name:"Three Bedroom Apartment With Balcony",maxGuests:8},
  {property:'tel-aviv-master-shenkin',name:"Four Bedroom Apartment With Balcony",maxGuests:10},
  {property:'bat-yam-master-bat-yam',name:"One Bedroom Suite",maxGuests:2},
  {property:'bat-yam-master-bat-yam',name:"One Bedroom Suite with sofabed",maxGuests:3},
];

/**
 * Seed properties and apartment units, with their published nightly rates.
 *
 * Rates come from rateTable (generated from data/rates.json by
 * make_backend_rates.py), so the backend and the static site quote the same
 * price for the same apartment. A unit with no entry in rateTable is seeded at
 * 0, which the booking engine reads as "rate on request" - it never invents a
 * price.
 *
 * Existing rows are updated too. A deployment that was seeded before rates
 * existed has every unit at 0; without this the API would keep reporting
 * "rate on request" forever. Only rows still at 0 are touched, so a rate an
 * administrator has set is never overwritten.
 */
export function seedBookingCatalog(db) {
  const insertProperty = db.prepare(`INSERT OR IGNORE INTO booking_properties
    (slug,name,city,country,address,image,created_at) VALUES(?,?,?,?,?,?,?)`);
  const now = new Date().toISOString();
  let priced = 0;
  let updated = 0;
  const seed = db.transaction(() => {
    for (const p of propertyCatalog) insertProperty.run(p.slug,p.name,p.city,p.country,p.address,p.image,now);

    const propertyId = db.prepare('SELECT id FROM booking_properties WHERE slug=?');
    const unitExists = db.prepare('SELECT id,nightly_rate_minor FROM booking_units WHERE property_id=? AND name=?');
    const insertUnit = db.prepare(`INSERT INTO booking_units
      (property_id,name,max_guests,nightly_rate_minor,currency,created_at) VALUES(?,?,?,?,?,?)`);
    const updateUnit = db.prepare(`UPDATE booking_units
      SET nightly_rate_minor=?,currency=? WHERE id=? AND nightly_rate_minor=0`);
    for (const u of unitCatalog) {
      const property = propertyId.get(u.property);
      if (!property) continue;
      const rate = (rateTable[u.property] || {})[u.name];
      const minor = rate ? Math.round(rate.nightly * 100) : 0;
      const currency = rate ? rate.currency : 'EUR';
      if (minor > 0) priced += 1;
      const existing = unitExists.get(property.id, u.name);
      if (existing) {
        if (minor > 0 && existing.nightly_rate_minor === 0) {
          updated += updateUnit.run(minor, currency, existing.id).changes;
        }
        continue;
      }
      insertUnit.run(property.id, u.name, u.maxGuests, minor, currency, now);
    }
  });
  seed();
  if (updated) console.log(`Booking catalog: applied published rates to ${updated} existing unit(s).`);
  return { priced, updated };
}

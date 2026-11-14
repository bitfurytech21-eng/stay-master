/* Shared 3D photo albums for property landing pages and apartment detail pages. */
(function () {
  "use strict";
  if (document.querySelector("[data-property-gallery]")) return;
  var file = decodeURIComponent(location.pathname.split("/").pop() || "");
  var propertyKey = file.replace(/\.html?$/i, "").replace(/-apartments-.+$/i, "");
  var heading = document.querySelector(".bhero h1") || document.querySelector("main h1");
  var propertyName = heading ? heading.textContent.trim() : "Property";
  var imageManifest = ["images/buildings/athens-master-plaka-athens-01.jpg","images/buildings/athens-master-plaka-athens-02.jpg","images/buildings/athens-master-plaka-athens-03.jpg","images/buildings/athens-master-plaka-athens-04.jpg","images/buildings/athens-master-plaka-athens-05.jpg","images/buildings/athens-master-plaka-athens-06.jpg","images/buildings/athens-master-plaka-athens-07.jpg","images/buildings/athens-master-plaka-athens-08.jpg","images/buildings/athens-master-plaka-athens-09.jpg","images/buildings/athens-master-plaka-athens-10.jpg","images/buildings/athens-master-plaka-athens-11.jpg","images/buildings/athens-master-plaka-athens-12.jpg","images/buildings/athens-master-plaka-athens-13.jpg","images/buildings/athens-master-plaka-athens-14.jpg","images/buildings/barcelona-01.jpg","images/buildings/barcelona-02.jpg","images/buildings/barcelona-03.jpg","images/buildings/barcelona-04.jpg","images/buildings/barcelona-master-la-rambla-01.jpg","images/buildings/barcelona-master-la-rambla-02.jpg","images/buildings/barcelona-master-la-rambla-03.jpg","images/buildings/barcelona-master-la-rambla-04.jpg","images/buildings/barcelona-master-la-rambla-05.jpg","images/buildings/barcelona-master-la-rambla-06.png","images/buildings/barcelona-master-la-rambla-07.jpg","images/buildings/barcelona-master-la-rambla-08.jpg","images/buildings/barcelona-master-la-rambla-09.jpg","images/buildings/barcelona-master-la-rambla-10.jpg","images/buildings/barcelona-master-la-rambla-11.png","images/buildings/barcelona-master-la-rambla-12.jpg","images/buildings/bat-yam-master-bat-yam-01.webp","images/buildings/bat-yam-master-bat-yam-02.webp","images/buildings/bat-yam-master-bat-yam-03.webp","images/buildings/bat-yam-master-bat-yam-04.webp","images/buildings/bat-yam-master-bat-yam-05.webp","images/buildings/bat-yam-master-bat-yam-06.webp","images/buildings/bat-yam-master-bat-yam-07.webp","images/buildings/bat-yam-master-bat-yam-08.webp","images/buildings/bat-yam-master-bat-yam-09.webp","images/buildings/bat-yam-master-bat-yam-10.webp","images/buildings/bat-yam-master-bat-yam-11.jpg","images/buildings/bat-yam-master-bat-yam-12.jpg","images/buildings/city-barcelona-1.jpg","images/buildings/city-barcelona-2.jpg","images/buildings/city-barcelona-3.jpg","images/buildings/city-barcelona-4.jpg","images/buildings/city-london-1.jpg","images/buildings/city-london-2.jpg","images/buildings/city-london-3.jpg","images/buildings/city-london-4.jpg","images/buildings/city-rome-1.jpg","images/buildings/city-rome-2.jpg","images/buildings/city-rome-3.jpg","images/buildings/city-rome-4.jpg","images/buildings/city-warsaw-1.jpg","images/buildings/city-warsaw-2.jpg","images/buildings/city-warsaw-3.jpg","images/buildings/city-warsaw-4.jpg","images/buildings/hamburg-master-altona-01.jpg","images/buildings/hamburg-master-altona-02.jpg","images/buildings/hamburg-master-altona-03.jpg","images/buildings/hamburg-master-altona-04.jpg","images/buildings/hamburg-master-altona-05.jpg","images/buildings/hamburg-master-altona-06.jpg","images/buildings/hamburg-master-altona-07.jpg","images/buildings/hamburg-master-altona-08.jpg","images/buildings/hamburg-master-altona-09.jpg","images/buildings/hamburg-master-altona-10.jpg","images/buildings/hamburg-master-altona-11.jpg","images/buildings/hamburg-master-altona-12.jpg","images/buildings/home-02.jpg","images/buildings/home-03.jpg","images/buildings/home-04.jpg","images/buildings/home-05.jpg","images/buildings/home-06.jpg","images/buildings/home-07.jpg","images/buildings/home-08.jpg","images/buildings/home-09.jpg","images/buildings/home-10.jpg","images/buildings/london-01.jpg","images/buildings/london-02.jpg","images/buildings/london-03.jpg","images/buildings/london-04.jpg","images/buildings/london-master-cannon-01.jpg","images/buildings/london-master-cannon-02.jpg","images/buildings/london-master-cannon-03.jpg","images/buildings/london-master-cannon-04.jpg","images/buildings/london-master-cannon-05.jpg","images/buildings/london-master-cannon-06.jpg","images/buildings/london-master-cannon-07.jpg","images/buildings/london-master-cannon-08.jpg","images/buildings/london-master-cannon-09.jpg","images/buildings/london-master-cannon-10.jpg","images/buildings/london-master-cannon-11.jpg","images/buildings/london-master-cannon-12.jpg","images/buildings/london-master-farringdon-01.jpg","images/buildings/london-master-farringdon-02.jpg","images/buildings/london-master-farringdon-03.jpg","images/buildings/london-master-farringdon-04.jpg","images/buildings/london-master-farringdon-05.jpg","images/buildings/london-master-farringdon-06.jpg","images/buildings/london-master-farringdon-07.jpg","images/buildings/london-master-farringdon-08.jpg","images/buildings/london-master-farringdon-09.jpg","images/buildings/london-master-farringdon-10.jpg","images/buildings/london-master-farringdon-11.jpg","images/buildings/london-master-farringdon-12.jpg","images/buildings/london-master-st-pauls-01.jpg","images/buildings/london-master-st-pauls-02.jpg","images/buildings/london-master-st-pauls-03.jpg","images/buildings/london-master-st-pauls-04.jpg","images/buildings/london-master-st-pauls-05.jpg","images/buildings/london-master-st-pauls-06.jpg","images/buildings/london-master-st-pauls-07.jpg","images/buildings/london-master-st-pauls-08.jpg","images/buildings/london-master-st-pauls-09.jpg","images/buildings/london-master-st-pauls-10.jpg","images/buildings/london-master-st-pauls-11.jpg","images/buildings/london-master-st-pauls-12.jpg","images/buildings/rome-01.jpg","images/buildings/rome-02.jpg","images/buildings/rome-03.jpg","images/buildings/rome-04.jpg","images/buildings/rome-master-trevi-01.jpg","images/buildings/rome-master-trevi-02.webp","images/buildings/rome-master-trevi-03.jpg","images/buildings/rome-master-trevi-04.jpg","images/buildings/rome-master-trevi-05.jpg","images/buildings/rome-master-trevi-06.jpg","images/buildings/rome-master-trevi-07.jpg","images/buildings/rome-master-trevi-08.jpg","images/buildings/rome-master-trevi-09.jpg","images/buildings/rome-master-trevi-10.jpg","images/buildings/rome-master-trevi-11.jpg","images/buildings/rome-master-trevi-12.jpg","images/buildings/salzburg-master-linzergasse-01.jpg","images/buildings/salzburg-master-linzergasse-02.jpg","images/buildings/salzburg-master-linzergasse-03.jpg","images/buildings/salzburg-master-linzergasse-04.jpg","images/buildings/salzburg-master-linzergasse-05.jpg","images/buildings/salzburg-master-linzergasse-06.jpg","images/buildings/salzburg-master-linzergasse-07.jpg","images/buildings/salzburg-master-linzergasse-08.jpg","images/buildings/salzburg-master-linzergasse-09.jpg","images/buildings/salzburg-master-linzergasse-10.jpg","images/buildings/salzburg-master-linzergasse-11.jpg","images/buildings/salzburg-master-linzergasse-12.jpg","images/buildings/salzburg-master-mirabell-01.jpg","images/buildings/salzburg-master-mirabell-02.jpg","images/buildings/salzburg-master-mirabell-03.jpg","images/buildings/salzburg-master-mirabell-04.jpg","images/buildings/salzburg-master-mirabell-05.jpg","images/buildings/salzburg-master-mirabell-06.jpg","images/buildings/salzburg-master-mirabell-07.jpg","images/buildings/salzburg-master-mirabell-08.jpg","images/buildings/salzburg-master-mirabell-09.jpg","images/buildings/salzburg-master-mirabell-10.jpg","images/buildings/salzburg-master-mirabell-11.jpg","images/buildings/salzburg-master-mirabell-12.jpg","images/buildings/tel-aviv-master-shenkin-01.jpg","images/buildings/tel-aviv-master-shenkin-02.jpg","images/buildings/tel-aviv-master-shenkin-03.jpg","images/buildings/tel-aviv-master-shenkin-04.jpg","images/buildings/tel-aviv-master-shenkin-05.jpg","images/buildings/tel-aviv-master-shenkin-06.jpg","images/buildings/tel-aviv-master-shenkin-07.jpg","images/buildings/tel-aviv-master-shenkin-08.jpg","images/buildings/tel-aviv-master-shenkin-09.jpg","images/buildings/tel-aviv-master-shenkin-10.jpg","images/buildings/tel-aviv-master-shenkin-11.jpg","images/buildings/tel-aviv-master-shenkin-12.jpg","images/buildings/tel-aviv-mazeh-tel-aviv-01.jpg","images/buildings/tel-aviv-mazeh-tel-aviv-02.jpg","images/buildings/tel-aviv-mazeh-tel-aviv-03.jpg","images/buildings/tel-aviv-mazeh-tel-aviv-04.jpg","images/buildings/tel-aviv-mazeh-tel-aviv-05.jpg","images/buildings/tel-aviv-mazeh-tel-aviv-06.jpg","images/buildings/tel-aviv-mazeh-tel-aviv-07.jpg","images/buildings/tel-aviv-mazeh-tel-aviv-08.jpg","images/buildings/tel-aviv-mazeh-tel-aviv-09.jpg","images/buildings/tel-aviv-mazeh-tel-aviv-10.jpg","images/buildings/tel-aviv-mazeh-tel-aviv-11.jpg","images/buildings/tel-aviv-mazeh-tel-aviv-12.jpg","images/buildings/warsaw-01.jpg","images/buildings/warsaw-02.jpg","images/buildings/warsaw-03.jpg","images/buildings/warsaw-04.jpg","images/buildings/warsaw-master-wola-01.jpg","images/buildings/warsaw-master-wola-02.jpg","images/buildings/warsaw-master-wola-03.jpg","images/buildings/warsaw-master-wola-04.jpg","images/buildings/warsaw-master-wola-05.jpg","images/buildings/warsaw-master-wola-06.jpg","images/buildings/warsaw-master-wola-07.jpg","images/buildings/warsaw-master-wola-08.jpg","images/buildings/warsaw-master-wola-09.jpg","images/buildings/warsaw-master-wola-10.jpg","images/buildings/warsaw-master-wola-11.jpg","images/buildings/warsaw-master-wola-12.jpg"];
  var prefix = "images/buildings/" + propertyKey + "-";
  var photos = imageManifest.filter(function (src) { return src.indexOf(prefix) === 0; });
  if (!photos.length) {
    photos = Array.prototype.map.call(document.querySelectorAll(".bhero-gallery img"), function (img) {
      return img.getAttribute("src");
    }).filter(Boolean);
  }
  photos = photos.filter(function (src, i, list) { return list.indexOf(src) === i; });
  if (!photos.length) return;

  var section = document.createElement("section");
  section.className = "property-gallery-feature";
  section.dataset.propertyGallery = "true";
  section.setAttribute("aria-label", "Property photo albums");
  section.innerHTML = '<div class="property-gallery-inner">' +
    '<p class="property-gallery-kicker">Explore the property</p>' +
    '<div class="property-gallery-heading"><div><h2>Photo albums</h2><p>Browse the available photographs for this property.</p></div><span class="property-gallery-total"></span></div>' +
    '<div class="property-album-grid"></div>' +
    '<div class="property-photo-viewer" hidden><div class="property-viewer-top"><button type="button" class="property-gallery-back">Back to albums</button><h3 class="property-viewer-title"></h3></div>' +
    '<div class="property-scene" tabindex="0" role="group" aria-label="3D photo carousel. Use arrow keys, swipe or drag to rotate."><div class="property-ring"></div></div>' +
    '<p class="property-photo-caption" aria-live="polite"></p><div class="property-gallery-controls"><button type="button" class="property-gallery-prev" aria-label="Previous photo">Previous</button><span class="property-gallery-count"></span><button type="button" class="property-gallery-next" aria-label="Next photo">Next</button></div></div></div>';
  var hero = document.querySelector("main .bhero");
  if (hero && hero.parentNode) hero.parentNode.insertBefore(section, hero.nextSibling);
  else (document.querySelector("main") || document.body).prepend(section);

  var grid = section.querySelector(".property-album-grid");
  var viewer = section.querySelector(".property-photo-viewer");
  var ring = section.querySelector(".property-ring");
  var scene = section.querySelector(".property-scene");
  var albumTitle = "Property photo collection";
  section.querySelector(".property-gallery-total").textContent = photos.length + (photos.length === 1 ? " photo" : " photos");
  var card = document.createElement("button");
  card.type = "button";
  card.className = "property-album-card";
  card.setAttribute("aria-label", "Open " + albumTitle + ", " + photos.length + " photos");
  var preview = document.createElement("span");
  preview.className = "property-album-preview";
  photos.slice(0, 3).forEach(function (src, i) {
    var img = document.createElement("img");
    img.src = src; img.alt = ""; img.loading = "lazy";
    img.style.setProperty("--album-index", i);
    preview.appendChild(img);
  });
  var details = document.createElement("span");
  details.className = "property-album-details";
  var name = document.createElement("strong"); name.textContent = albumTitle;
  var count = document.createElement("small"); count.textContent = photos.length + (photos.length === 1 ? " photo" : " photos");
  details.append(name, count); card.append(preview, details); grid.appendChild(card);

  var index = 0, rotation = 0, step = 0, radius = 0, pointerX = null, startRotation = 0;
  function render() {
    var total = photos.length;
    ring.style.transform = "translateZ(-" + radius + "px) rotateY(" + rotation + "deg)";
    index = ((Math.round(-rotation / step) % total) + total) % total;
    section.querySelector(".property-photo-caption").textContent = propertyName + " · Photo " + (index + 1);
    section.querySelector(".property-gallery-count").textContent = (index + 1) + " / " + total;
    section.querySelector(".property-gallery-prev").disabled = total < 2;
    section.querySelector(".property-gallery-next").disabled = total < 2;
  }
  function openAlbum() {
    index = 0; rotation = 0;
    step = 360 / photos.length;
    radius = photos.length < 2 ? 0 : Math.max(190, Math.round(110 / Math.tan(Math.PI / photos.length)));
    ring.replaceChildren();
    photos.forEach(function (src, i) {
      var face = document.createElement("figure");
      face.className = "property-photo-face";
      face.style.transform = "translate(-50%,-50%) rotateY(" + (i * step) + "deg) translateZ(" + radius + "px)";
      var img = document.createElement("img");
      img.src = src; img.alt = propertyName + " photo " + (i + 1);
      img.loading = i < 2 ? "eager" : "lazy"; img.decoding = "async";
      face.appendChild(img); ring.appendChild(face);
    });
    ring.style.transform = "translateZ(-" + radius + "px)";
    section.querySelector(".property-viewer-title").textContent = albumTitle;
    grid.hidden = true; viewer.hidden = false; render();
  }
  function move(direction) { rotation -= direction * step; render(); }
  card.addEventListener("click", openAlbum);
  section.querySelector(".property-gallery-back").addEventListener("click", function () { viewer.hidden = true; grid.hidden = false; });
  section.querySelector(".property-gallery-next").addEventListener("click", function () { move(1); });
  section.querySelector(".property-gallery-prev").addEventListener("click", function () { move(-1); });
  scene.addEventListener("pointerdown", function (event) {
    if (photos.length < 2) return;
    pointerX = event.clientX; startRotation = rotation;
    ring.classList.add("is-dragging"); scene.setPointerCapture(event.pointerId);
  });
  scene.addEventListener("pointermove", function (event) {
    if (pointerX === null) return;
    rotation = startRotation + (event.clientX - pointerX) * 0.4;
    ring.style.transform = "translateZ(-" + radius + "px) rotateY(" + rotation + "deg)";
  });
  function endDrag() {
    if (pointerX === null) return;
    pointerX = null; ring.classList.remove("is-dragging");
    rotation = Math.round(rotation / step) * step; render();
  }
  scene.addEventListener("pointerup", endDrag);
  scene.addEventListener("pointercancel", endDrag);
  scene.addEventListener("keydown", function (event) {
    if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
    if (event.key === "Escape") { viewer.hidden = true; grid.hidden = false; }
  });
})();
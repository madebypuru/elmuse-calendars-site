/* Polaroid product page: the twelve city cards in the spec band's samples tab (Sigma "sample images").
   Everything else on the page (options, gallery, tabs, cart, related) is site.js. */
(function () {
  "use strict";
  const CITIES = [
    ["January", "Delhi", "India Gate", "01-delhi"],
    ["February", "Agra", "Taj Mahal", "02-agra"],
    ["March", "Jaipur", "Hawa Mahal", "03-jaipur"],
    ["April", "Amritsar", "Harmandir Sahib", "04-amritsar"],
    ["May", "Hyderabad", "Charminar", "05-hyderabad"],
    ["June", "Mumbai", "Gateway of India", "06-mumbai"],
    ["July", "Kochi", "Chinese fishing nets", "07-kochi"],
    ["August", "Madurai", "Meenakshi Temple", "08-madurai"],
    ["September", "Mysuru", "Mysore Palace", "09-mysuru"],
    ["October", "Kolkata", "Howrah Bridge", "10-kolkata"],
    ["November", "Varanasi", "Dashashwamedh Ghat", "11-varanasi"],
    ["December", "Goa", "Basilica of Bom Jesus", "12-goa"]
  ];
  document.querySelector("[data-cities]").innerHTML = CITIES.map(([month, city, monument, file]) => `<figure class="sample">
    <img src="../assets/polaroid/${file}.png" width="454" height="642" alt="The ${month} card: ${city}, ${monument}" loading="lazy">
    <div class="spec-row"><span>${month}</span><span>${city}, ${monument}</span></div>
  </figure>`).join("");
})();

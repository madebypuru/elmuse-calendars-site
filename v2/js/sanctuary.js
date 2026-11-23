/* Sanctuary: the twelve month sheets for the THE TWELVE MONTHS tab (Sigma's sample images), each with a Month / Line row. */
(function () {
  "use strict";
  const MONTHS = [
    ["jan", "January", "Hold it lightly, let it soar."],
    ["feb", "February", "Slow blooms, in your own season."],
    ["mar", "March", "Colour outside the lines."],
    ["apr", "April", "Recipes and roots, the taste of home."],
    ["may", "May", "Sweet afternoons of mango summers."],
    ["jun", "June", "Rooftop nights under the same stars."],
    ["jul", "July", "Paper boats and puddle days."],
    ["aug", "August", "The threads that tie us."],
    ["sep", "September", "Shape it slowly."],
    ["oct", "October", "Make room for the light."],
    ["nov", "November", "Soft layers, warm hearts."],
    ["dec", "December", "The way back home."]
  ];
  document.querySelector("[data-months]").innerHTML = MONTHS.map(([key, month, line]) => {
    const base = `img/sanctuary/sanctuary-sheet-${key}`;
    return `<figure class="sample"><img src="${base}-1200.webp" srcset="${base}-1200.webp 960w, ${base}-2400.webp 1920w" sizes="(max-width: 900px) 50vw, 25vw" alt="The ${month} sheet" loading="lazy"><div class="spec-row"><span>${month}</span><span>${line}</span></div></figure>`;
  }).join("");
})();

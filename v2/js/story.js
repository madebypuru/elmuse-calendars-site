/* elmuse 2027 calendars, v2 stories (Sigma blog post and blog author page).
   STORIES is the one list: stories.html draws its work grid from it, story.html?s=<slug> draws one story.
   Every story's text is a sample until the owner writes it, so each first paragraph starts "Sample text."
   Blocks, in Sigma's widths: { body: [paragraphs] }, { fig: 688 | 1048 | 560, img }, { pair: [img, img] }. */
(function () {
  "use strict";
  const E = window.Elmuse;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const STORIES = [
    {
      slug: "letter", title: "A letter from the studio", kicker: "The studio", tag: null,
      card: "sanctuary-hand-on-sheet-tall", lead: "sanctuary-hand-on-sheet",
      excerpt: "Why a paper calendar still matters, in a few lines from Jaipur.",
      blocks: [
        { body: [
          "Sample text. Every year someone asks us why a paper calendar still matters. Our answer is a small one.",
          "A phone tells you what comes next. A page shows you where you have been. When you tear off a month, peg a city card to your board or circle a date on the wall, the year becomes something you can touch, keep and give away.",
          "Each one is printed, cut and packed in Jaipur by people we know by name. We hope yours sits somewhere you look every day, and that by December it looks a little used, a little loved and entirely yours."
        ] },
        { fig: 688, img: "sanctuary-hands-lift-sheet" },
        { pair: ["shared-board-peg-stamp-card", "polaroid-hands-hold-march"] },
        { fig: 1048, img: "polaroid-cards-scattered" }
      ]
    },
    {
      slug: "making", title: "How a board is made", kicker: "Sanctuary, The studio", tag: "sanctuary",
      card: "sanctuary-board-standing-peg", lead: "sanctuary-sheets-golden-hour",
      excerpt: "Birch ply cut by laser, a ledge plate, a peg, and twelve sheets of 320 gsm card.",
      blocks: [
        { body: [
          "Sample text. The board is birch plywood, 10 × 15 in and 4 mm thick, cut by laser so the edges come out charred dark. The elmuse name is engraved on the strip below the ledge.",
          "A ledge plate slots through the board to make the shelf. On a desk, the table plate leans the board back about 21°. On a wall, it hangs from a brass plate on the back."
        ] },
        { fig: 688, img: "sanctuary-edge-cross" },
        { body: [
          "Each month is a sheet of 320 gsm card. The front carries the month's artwork, which tears off along a perforation as a postcard, and the month grid. The back has the postcard back and a journal page with a reflection, a prompt, the ritual and a QR code."
        ] },
        { pair: ["sanctuary-back-hanging-plate", "sanctuary-peg-todo-note"] },
        { fig: 1048, img: "sanctuary-side-stand" }
      ]
    },
    {
      slug: "twelve-cities", title: "Twelve cities", kicker: "Polaroid, The cards", tag: "polaroid",
      card: "polaroid-fan-close", lead: "polaroid-hands-fan-cards",
      excerpt: "One Indian city and its monument for each month of 2027, carried behind your phone.",
      blocks: [
        { body: [
          "Sample text. Twelve stamp cards, 60 × 85 mm on textured 380 gsm card, one for each month of 2027. Each carries a city and its monument, drawn like a postage stamp.",
          "January is Delhi and India Gate. February, Agra and the Taj Mahal. March, Jaipur and Hawa Mahal. April, Amritsar and Harmandir Sahib. May, Hyderabad and Charminar. June, Mumbai and the Gateway of India.",
          "July is Kochi and its Chinese fishing nets. August, Madurai and the Meenakshi Temple. September, Mysuru and Mysore Palace. October, Kolkata and Howrah Bridge. November, Varanasi and Dashashwamedh Ghat. December, Goa and the Basilica of Bom Jesus."
        ] },
        { fig: 688, img: "polaroid-card-in-phone-cover" },
        { pair: ["polaroid-card-jan", "polaroid-card-mar"] },
        { fig: 1048, img: "polaroid-cards-scattered" }
      ]
    },
    {
      slug: "two-together", title: "The two together", kicker: "Sanctuary and Polaroid", tag: null,
      card: "shared-board-peg-stamp-card", lead: "shared-cards-and-board-sun",
      excerpt: "The month's city card, clipped to the board by its wooden peg.",
      blocks: [
        { body: [
          "Sample text. The Sanctuary board has a wooden peg on its edge. Clip the month's Polaroid card to it and the city sits beside the month you are planning.",
          "On the 1st, the old sheet comes off and the old card goes in a drawer, or onto the wall."
        ] },
        { pair: ["shared-peg-holds-stamp-card", "shared-cards-and-board-sun-tall"] },
        { fig: 688, img: "sanctuary-peg-in-hand" }
      ]
    },
    {
      slug: "train-ticket", title: "A train ticket home", kicker: "Sanctuary, Sample story", tag: "sanctuary", sample: true,
      card: "sanctuary-peg-todo-note", lead: "sanctuary-hands-lift-sheet",
      excerpt: "Sample: I clip whatever matters this week to the peg. In March it was a train ticket home.",
      blocks: [
        { body: ["Sample text. I clip whatever matters this week to the peg. In March it was a train ticket home.", "On a desk in Jaipur."] },
        { pair: ["sanctuary-hand-sets-sheet", "sanctuary-peg-todo-note"] }
      ]
    },
    {
      slug: "april-picture", title: "The April picture", kicker: "Sanctuary, Sample story", tag: "sanctuary", sample: true,
      card: "sanctuary-hands-settle-sheet", lead: "sanctuary-postcard-qr",
      excerpt: "Sample: I posted the April picture to my mother. She has it on her fridge now.",
      blocks: [
        { body: ["Sample text. I posted the April picture to my mother. She has it on her fridge now.", "On a wall in Bengaluru."] },
        { fig: 688, img: "sanctuary-journal-back" }
      ]
    },
    {
      slug: "first-of-the-month", title: "The first of the month", kicker: "Polaroid, Sample story", tag: "polaroid", sample: true,
      card: "polaroid-hands-hold-march", lead: "polaroid-card-in-phone-cover",
      excerpt: "Sample: I didn't think I'd look forward to the 1st. Now I take the old card out before I've had my tea.",
      blocks: [
        { body: ["Sample text. I didn't think I'd look forward to the 1st. Now I take the old card out before I've had my tea.", "Carried in Mumbai."] },
        { pair: ["polaroid-card-jun", "polaroid-card-beside-phone"] }
      ]
    },
    {
      slug: "kochi", title: "Ten minutes on Kochi", kicker: "Polaroid, Sample story", tag: "polaroid", sample: true,
      card: "polaroid-stack-in-hand", lead: "polaroid-cards-scattered",
      excerpt: "Sample: People ask about the card on my phone. Then we talk about Kochi for ten minutes.",
      blocks: [
        { body: ["Sample text. People ask about the card on my phone. Then we talk about Kochi for ten minutes.", "Carried in Kochi."] },
        { fig: 688, img: "polaroid-card-jul" }
      ]
    }
  ];

  const manifest = fetch("img/manifest.json").then((r) => r.json()).then((m) => new Map(m.images.map((im) => [im.id, im]))).catch(() => new Map());

  // An <img> for a library photo with its srcset, sizes, focal point and manifest alt (filled in once the manifest arrives).
  function img(id, sizes, { lazy = true, alt = "" } = {}) {
    const p = E.photo(id);
    return `<img data-photo="${id}" src="${p.src}" srcset="${p.srcset}" sizes="${sizes}" alt="${esc(alt)}"${lazy ? ' loading="lazy"' : ' fetchpriority="high"'}>`;
  }
  async function finishImages(root) {
    const m = await manifest;
    root.querySelectorAll("img[data-photo]").forEach((el) => {
      const im = m.get(el.dataset.photo);
      if (!im) return;
      if (im.focal) el.style.setProperty("--focal", `${im.focal[0] * 100}% ${im.focal[1] * 100}%`);
      if (!el.hasAttribute("data-decorative")) el.alt = im.alt || "";
    });
  }

  const titleLine = (s) => (s.sample ? `Sample: ${s.title}` : s.title);
  const href = (s) => `story.html?s=${encodeURIComponent(s.slug)}`;

  // Sigma's profile work grid: a 4:5 image and a caps title.
  const workCard = (s) => `<a class="work-card" href="${href(s)}">
      <div class="work-card__img">${img(s.card, "(max-width: 900px) 100vw, 33vw").replace("<img ", "<img data-decorative ")}</div>
      <p class="work-card__title">${esc(titleLine(s))}</p>
    </a>`;

  // Sigma's EXPLORE MORE: 16:9 image, caps title, excerpt, READ MORE.
  const exploreCard = (s) => `<a class="explore-card" href="${href(s)}">
      <div class="explore-card__img">${img(s.card, "(max-width: 900px) 100vw, 24vw").replace("<img ", "<img data-decorative ")}</div>
      <p class="explore-card__title">${esc(titleLine(s))}</p>
      <p class="explore-card__excerpt">${esc(s.excerpt)}</p>
      <span class="link">Read more</span>
    </a>`;

  function block(b) {
    if (b.body) return `<div class="story-body">${b.body.map((p) => `<p>${esc(p)}</p>`).join("")}</div>`;
    if (b.fig) return `<figure class="story-fig story-fig--${b.fig}">${img(b.img, `(max-width: 900px) 100vw, ${b.fig}px`)}</figure>`;
    if (b.pair) return `<div class="story-pair">${b.pair.map((id) => img(id, "(max-width: 900px) 100vw, 516px")).join("")}</div>`;
    throw new Error(`Unknown story block ${JSON.stringify(b)}`);
  }

  function renderStory(el, slug) {
    const s = STORIES.find((x) => x.slug === slug);
    if (!s) {
      document.title = "Story not found · elmuse 2027 calendars";
      el.innerHTML = `<header class="story-head"><p class="kicker">Stories</p><h1>Story not found</h1><p><a class="link" href="stories.html">All stories</a></p></header>`;
      return;
    }
    const product = s.tag ? E.config.products[s.tag] : null;
    const others = STORIES.filter((x) => x !== s).slice(0, 2);
    document.title = `${titleLine(s)} · elmuse 2027 calendars`;
    el.innerHTML = `
      <header class="story-head">
        <p class="kicker">${esc(s.kicker)}</p>
        <h1>${esc(titleLine(s))}</h1>
        ${product ? `<p><a href="${product.page}">${esc(product.name)}</a></p>` : ""}
        <p>by the elmuse studio</p>
      </header>
      <figure class="story-fig story-fig--1408">${img(s.lead, "100vw", { lazy: false })}</figure>
      ${s.blocks.map(block).join("")}
      <div class="story-about"><p class="kicker">About</p><p class="kicker">The elmuse studio</p><p class="story-about__bio">A small studio in Jaipur. These three are our calendars for 2027: Sanctuary for your desk, Polaroid for your pocket and Distinctive for your wall.</p></div>
      <section class="explore" aria-labelledby="explore-title">
        <h2 class="kicker" id="explore-title">Explore more</h2>
        ${others.map(exploreCard).join("")}
      </section>`;
    finishImages(el);
  }

  const story = document.querySelector("[data-story]");
  if (story) renderStory(story, new URLSearchParams(location.search).get("s"));
  const grid = document.querySelector("[data-work-grid]");
  if (grid) { grid.innerHTML = STORIES.map(workCard).join(""); finishImages(grid); }
})();

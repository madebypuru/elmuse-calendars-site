# elmuse 2027 calendars, v2: the Sigma spec

The owner's reference is sigmaphoto.com, and the target is a site as good as it in every detail. This file maps our content into Sigma's real layouts. Every number comes from the two forensic studies in `calendar-refs/study/sigma-spec/` (`SPEC-home-header-listing.md`, `SPEC-product-cart-stories.md`, the `styles-*.json` dumps and `screens/`). When a value here and a value there disagree, the study wins: fix this file.

**The rule for page builders.** Match Sigma. Do not enlarge type, add tiles, add colour, add shadows or rounded corners, add hover motion, or make your own layout calls. The last site failed because agents did exactly that. If something is not covered here, open the Sigma screenshot named in the section and do what Sigma does. If our content truly cannot fit, write the deviation in your report with its reason.

The shared system already implements everything in sections 1 to 3. `styleguide.html` shows each part with our content. Page builders write page markup from section 4 using those classes, and put only page-specific layout in `css/<page>.css`.

---

## 1. Tokens (`css/tokens.css`)

### Type: three faces

| Sigma face | Ours | Token | Why |
|---|---|---|---|
| Sigma Serif head (display) | Regie | `--font-display` | Owner's display face. Only the display sizes below use it. |
| Sigma Serif (text cut) | **Newsreader**, weight **500**, optical size auto | `--font-text`, `--text-wght` | Chosen by rendering eight free serifs beside Sigma's own 390px intro paragraph (`screens/390-home-02-intro.jpg`) at 16/20 with 0.08px tracking. Newsreader breaks every line in exactly the same place as Sigma Serif, so its width is the same; its x-height, open counters, soft bracketed serifs and low contrast at text size are the closest. At 400 it is lighter than Sigma's 400 (ink 3.99 against Sigma's 4.92 on the same five lines; Sigma's JPEG adds a little), so we set it at 500 (ink 4.65), which matches Sigma's colour on screen. PT Serif and Gelasio matched width and colour too, but PT Serif's sharp wedge serifs and Gelasio's Georgia contrast read further from Sigma. Bold roles use 700. |
| Sigma Sans (UI) | Proxima Nova (local demo files, `unicode-range` limited), falling back to Figtree | `--font-ui` | Decided. Digits and symbols fall through to Figtree; see README. |
| none | Caveat | `--font-hand` | Handwritten notes only (a note on the board, a scribble on the planner). Never headings, labels, prices or quotes. |

Google Fonts link for every page: `family=Figtree:wght@400;700&family=Newsreader:opsz,wght@6..72,500;6..72,700` (add `&family=Caveat:wght@500` only on a page with a handwritten note).

### Type roles

Sizes are px and do not scale with the viewport: Sigma keeps 88 from 1024 to 1920 and drops straight to 36 at 900 and below. Body text never goes above 16 or below 13.

| Role | Face | Size / line-height | Tracking | Case | Class or token |
|---|---|---|---|---|---|
| Home intro H1 | Regie | 88/83.8 (phone 36/39.6) | −3px (phone normal) | upper | `.d1-home` |
| Product title, checkout title, profile name | Regie | 88/83.6 (phone 36/39.6; product title switches at 768) | −1.32px (profile −0.32) | product: as typed; checkout, profile: upper | `.pdp-title`, `.page-title`, `.profile-head h1` |
| 88 over an image | Regie | 88/96.8 | 0.08px | upper | `.banner__title` |
| Statement, story headline | Regie | 48/52.8 (story phone 36/39.6; fp2-style statements stay 48) | 0.08px | upper | `.d2`, `.story-head h1` |
| Listing title | Regie | 48/60 (phone 36/45) | 0.08px | upper | `.list-head__title` |
| Section title, card title, h4 | Newsreader | 16/17.6 | 0.08px | upper | `.section-title`, `.title`, `.card__title` |
| Names, prices, body | Newsreader | 16/20 | 0.08px (story body 0.05px) | as typed | body default, `.text` |
| Title on image tile | Newsreader | 21/23.1 | 0.08px | as typed | `.image-tile__title` |
| Title on large tile | Newsreader | 24/30 (phone 20/22) | 0.08px | upper | `.image-tile--large` |
| Story cover call to action | Newsreader | 36/45 | 0.05px | as typed | `--fs-cta` |
| Every UI label | Proxima | 13/16.25 | 0.08px | upper | `.ui-caps`, `.link`, `.nav-item` |
| Spec cell, helper, bullet | Proxima | 13/16.25 | 0.08px (helper and radio: normal) | as typed | `.ui`, `.helper`, `.bullets` |
| Button label, text action | Proxima | 13/normal | 0.26px | upper | `.btn`, `.link--action` |
| Footer heading | Proxima | 13/14.3 | 0.08px | upper, ink-70 | `.site-footer__head` |
| Story kicker, about label | Proxima | 13/16.25 | 0.2px | upper | `.kicker` |
| Drawer line price | Proxima | 16/16 | 0.08px | | `.mini-line__price` |
| Phone menu level 1 | Newsreader | 16/20 | | upper, #575757 | `.sheet__l1` |
| Phone menu level 2 | Proxima | 13/16.25 | | upper, #575757 | `.sheet__l2` |

### Colour

One ink. Hierarchy is opacity, never a second colour. There is no accent and no sale red. Colour comes only from the photographs.

| Token | Value | Use |
|---|---|---|
| `--ink` | #333333 | All text, primary button, promo bar |
| `--ink-90` | rgba(51,51,51,.9) | Primary hover, outline-button border |
| `--ink-80` | rgba(51,51,51,.8) | Every text-link hover |
| `--ink-70` | rgba(51,51,51,.7) | Secondary text, footer headings, input/stepper/tab/spec-row rules |
| `--ink-60` | rgba(51,51,51,.6) | Inactive tab, inactive thumbnail |
| `--ink-30` | rgba(51,51,51,.3) | Inactive gallery dot, disabled stepper glyph |
| `--ink-10` | rgba(51,51,51,.1) | Hairlines: listing grid, totals rows, related cells |
| `--paper` | #FEFEFD | Body, header, dropdown, phone menu body |
| `--white` | #FFFFFF | Home content layer, drawer, inputs, footer, phone header |
| `--cream` | #FAF7EF | Letter (newsletter) panel |
| `--band` | #FAF8F2 | Spec band |
| `--thumb` | #EBEBEB | Gallery thumbnails |
| `--grey-count` | #7D7D7D | Counts beside list items |
| `--grey-menu` | #575757 | Phone menu |
| `--disabled` | #999 | Disabled radio |
| `--scrim` | rgba(0,0,0,.15) | Behind drawers |
| `--success`, `--warning` | rgb(51,191,138), rgb(193,72,5) | 1px borders of messages and notices only |
| `--shadow-drawer` | −2px 0 5px rgba(0,0,0,.5) | Drawers only; nothing else has a shadow |

### Layout, shape, motion

- Root: browser default (16px). Sigma sets `html { font-size: 1px }` so its rem values are px; we write px directly, which gives the same numbers.
- `--margin` 16 and `--gutter` 16 at every width; `--row-gap` 24.
- A 12-column grid, `(W − 32 − 11×16) / 12`, with **no max width**. At 1440: 3-up = 4 columns = 458.7, 2-up = 6 columns = 696, footer 4-up = 340.
- `--section-pad` 80 top and 80 bottom (48 on phones), so sections sit 160 apart (96 on phones). `--title-gap` 80 under a centred section title. `--page-top` 160 (96 on phones) above the first block of a listing, checkout, profile or questions page. `--buy-gap` 160 around a product's buy section.
- Measures: 500 centred editorial copy, 560 story body, 344 card excerpts and intro copy, 464 buy box.
- Controls are 40 tall (`--control-h`). Radius 0 everywhere; inputs 1px (`--radius-input`). Hairlines 1px.
- Header 48.25 (16.25 line + 16 + 16). Promo 48, or 72 on phones where it wraps.
- Breakpoint: 900/901, Sigma's. The product title alone switches at 768/769, as Sigma's does.
- Motion: hovers are instant (no transition anywhere on hover). Drawer `right .3s ease` with scrim `opacity .3s`. Dropdown opens `transform .1s linear`, closes `.2s linear` after `.1s`. Phone menu sheet `.2s linear`; its accordion `height .2s`, the +/− turns in `.3s linear`. Product sub-bar `all .1s linear`. Tab colour `.3s`. Nothing animates on load: no fade-ins, no reveal on scroll, no smooth-scroll on `html`.

---

## 2. Shared chrome (`js/site.js` draws it)

### Promo bar
Sigma: 48 tall, #333, `padding 14px 16px`, a centred group of message and link with a 72px gap. It scrolls away; it is not sticky. Ours: the message is `config.delivery.line` ("SHIPS FROM JAIPUR FROM 10 DECEMBER", Newsreader 16/20 caps, white) and the link is "SEE THE CALENDARS" (Proxima 13 caps, underlined) to `calendars.html`. On phones it wraps to 72.

### Header
Sigma `screens/1440-header-top.png`, `ANNOT-1440-header-xpositions.png`.
- Three equal thirds, gap 16, `padding 0 16`, background #FEFEFD, 48.25 tall. `position: sticky; top: 0`. Identical when scrolled: no border, no shadow, no state change.
- Left: CALENDARS · STORIES · QUESTIONS · FOR TEAMS. Each is Proxima 13/16.25 caps with `padding 16px 0`, so the hover target is the full height. Gap 16 (8 at 1100 and below). Hover goes to ink-80 instantly.
- Centre: the elmuse wordmark at 19.8 tall (Sigma's logo height), black.
- Right: CART (n). That is all. Sigma also has LOG IN and SEARCH; we have no accounts, and three products do not need search, so both are left out.
- No Personal/For teams switch and no Order button: Sigma has neither.
- Phones: MENU at x16, wordmark centred, CART (n) right, white background.

### Dropdown
Sigma `screens/1440-header-dropdown-products.png`. Hovering or focusing CALENDARS opens a full-width panel under the header: #FEFEFD, `padding 16px`, no border, no shadow, a plain vertical list left-aligned at x16 (not under its parent), Proxima 13 caps with an 18.25 row pitch. It slides down from behind the header. Items: SANCTUARY, POLAROID, DISTINCTIVE, ALL CALENDARS. No images, no columns. The other nav items have no panel. Escape closes it.

### Phone menu
Sigma `screens/390-menu-products-expanded.jpg`. A fixed full-screen sheet. Top bar 48, white, MENU left and CLOSE right. Body #FEFEFD. Level 1 Newsreader 16/20 caps #575757 on a 36 pitch, first item at y105. CALENDARS links to the listing and has a +/− toggle at the right edge (6×1 bars) that opens an accordion of the three calendars and ALL CALENDARS in Proxima 13 caps on a 20.25 pitch. Then STORIES, QUESTIONS, FOR TEAMS. Sigma's search box and LOG IN are left out for the same reasons as the header.

### Product sub-bar
Sigma `screens/lens-1440-01-hero-title.jpg`. On a product page (`<body data-page="sanctuary|polaroid|distinctive">`) site.js adds a bar under the header: `position: sticky; top: 48.25`, background rgba(254,254,253,.9), `padding 16`, Proxima 13 caps. Left "SANCTUARY | 2027" (Sigma: "35MM F1.2 DG II | ART", name then line). Right DETAILS (`#details`) and BUY NOW (`#buy-now`). It hides (opacity and slide, `.1s linear`) while the spec band `#details` sits under it, as Sigma's does. **Every product page must have `id="buy-now"` on the buy section and `id="details"` on the spec band.**

### Footer
Sigma `screens/1440-home-10-footer.jpg`, `390-home-10-footer.jpg`. White, `padding 120px 16px 32px`. The mark centred, 120 gap, four columns of three grid columns each (x 16 / 372 / 728 / 1084 at 1440), 120 gap, copyright. Headings Proxima 13/14.3 caps ink-70 with 20 below; links Proxima 13/16.25 caps stacked with no gap. No rules, no payment icons. Phones: each group is a row, heading left, links from the middle. Columns: CALENDARS (the three, ALL CALENDARS), HELP (QUESTIONS, CART, CHECKOUT), STUDIO (STORIES, FOR TEAMS), CONTACT (WhatsApp and email only when config has them, then the studio address). Copyright "© 2026 elmuse. All rights reserved."

### Cart drawer
Sigma `screens/cart-drawer-1440-one-item-detail.png`. Fixed right, 390 wide, full height, white, `−2px 0 5px rgba(0,0,0,.5)`, scrim rgba(0,0,0,.15). Slides on `right .3s`. CART left and CLOSE right at y16 (text, not icons). Each line: image 109×136, 16 gap, text from x141: NAME caps, "2027 calendar", then each option as "Label:" and its value; a row with the compact "− 1 +" stepper and the line price (Proxima 16/16) on the right; then EDIT (to the product page) and REMOVE. At the bottom: the placeholder-price line while prices are unconfirmed, SUBTOTAL with the amount, and PROCEED TO CHECKOUT (358×40 primary). Empty: "You have no items in your cart." in Proxima 13 bold, nothing else. No suggestions, no region choice, no delivery line: Sigma's drawer has none of them (region and delivery live at checkout).

### Order bar on phones
Removed. Sigma has no fixed bottom bar; on product pages the sticky sub-bar's BUY NOW does that job.

### Checkout (Sigma cart page)
Sigma `screens/cart-page-1440-one-item.jpg`, `cart-page-390-*.png`. Built in `checkout.html`.
- Title CHECKOUT, Regie 88/83.6 caps centred, 160 above. The notice under it (1px warning border, alert icon, serif text) carries the honest line: prices are placeholders, nothing is charged. It hides when `pricesConfirmed` is true.
- Items 73% and summary 23.65% (1028 and 333 at 1440), as Sigma's.
- Items: a header row (Item | Price | Qty | Subtotal, Newsreader 16) under a 1px ink-70 rule; rows with a 106×132 image, name and options in Proxima 13, REMOVE; unit price and subtotal in Newsreader 16; the compact stepper. Then CONTINUE SHOPPING (outline). Sigma's CLEAR and UPDATE buttons are left out: quantities apply at once and lines remove one by one.
- Under the items, our details form (Sigma's checkout page itself was not studied): section titles in the summary-title style, fields with a 13px label, 12 gap, 40px inputs with a 1px ink-70 border, radius 1, `padding 7px 11px`.
- Summary: SUMMARY (Newsreader 16 caps over a 1px ink-70 rule); "Delivering to" (Proxima 13 bold, Sigma's "Estimate Shipping and Tax") with INDIA and ABROAD text radios; Subtotal, Delivery and Order total rows in Newsreader 16 between ink-10 rules; CONTINUE TO PAYMENT (primary, submits the form); the delivery estimate.
- Phones: title, notice, items, form, summary. Sigma puts the summary first because its button leads to another page; ours submits the form above it.

---

## 3. Shared parts (`css/components.css`)

Use these; do not restyle them in page CSS.

| Sigma part | Our class | Notes |
|---|---|---|
| Container, 12-col grid | `.container`, `.grid` with `.c-2/3/4/6/8/12` | Children span 12 on phones. |
| Section | `.section` | 80/80 (48 on phones). |
| Centred section title | `.section-title` | 80 below. |
| Primary / outline / text action | `.btn`, `.btn--block`, `.btn--outline`, `.link`, `.link--action` + chevron icon | 40 tall, 0 radius. |
| Text radios | `.option`, `.option__label`, `.radios`, `.radio` (+ `.radio__ring`), `.helper` | Two columns; no swatches, no prices in labels. |
| Stepper | `.stepper` (40 \| input \| 40), `.stepper--compact` | The minus stays dark at 1, as Sigma's. |
| Field | `.field`, `.field__label`, `.field__input`, `.field__help`, `.field__error`, `.check`, `select.field__input` | |
| Notice | `.notice`, `.notice--success` | |
| Benefit bullets | `.bullets` | Disc bullets, `li` margin 0 0 4px 16px. |
| Curtain hero | `.curtain` (fixed photo) + `.curtain__content` (white layer, margin-top 100vh) | Static and in flow on phones. |
| Home intro | `.intro` with `.d1-home`, `.prose`, `.link` | |
| 90vh image tile | `.image-tile` (+ `--large`), `.image-tile__text`, `.image-tile__title` | `--dim` sets the dim layer (default .25). |
| Product tile 4:5 | `.product-tile`, `.product-tile__img` (`--photo` for photos), `.badge`, `.product-tile__name`, `.price-row`, `.price-was` | Cut-outs sit in the middle 70×60% of the frame. |
| Editorial card 4:5 | `.card`, `.card__img`, `.card__title` | |
| Full-bleed banner 90vh | `.banner`, `.banner__title`, `.banner__copy` | Default dim .3. |
| Category column | `.category`, `.category__img` (`--file` for print files), `.category__text`, `.category__title` | Text column `padding-right: 100px`. |
| Newsletter | `.letter`, `.letter__form`, `.letter__panel` | 4 + 8 columns, cream panel. |
| Listing | `.list-head`, `.list-banner`, `.toolbar`, `.list-grid`, `.list-cell`, `.list-cell__img` (`--photo`), `.swatches`, `.list-edit` | Editorial tiles carry the .25 dim layer. Phones: horizontal hairlines only. |
| Product title, hero | `.pdp-title` (two `span` lines), `.pdp-hero` (a `picture` with a phone `source`) | Title block `padding 160px 16px` (487 tall at 1440; 96 on phones ≤768). Hero 1440:910, 4:5 on phones. |
| Buy section | `.buy` holding `.gallery[data-gallery]` and `.buybox` | |
| Buy box | `.buybox__head` (`.buybox__name` + `[data-price]`), `.buybox__meta`, `.buybox__options[data-choices]`, `.stepper`, `.btn.btn--block.buybox__add`, `.bullets`, `.link--action` | Gaps 16 / 50 / 16 / 32 / 32 / 16 / 48 / 32 as measured. |
| Gallery | `.gallery[data-gallery] > .gallery__track > .gallery__slide` (`--file` for cut-outs and print files) | site.js adds arrows, thumbnails (one row that scrolls sideways), dots. File slides sit in the middle 70 × 60% of the stage. |
| Intro copy + image | `.split`, `.split__copy`, `.split__img` | 1/3 and 2/3, image 3:2. |
| Spec band | `.band#details`, `.tabs[data-tabs]` with `.tab[data-tab]`, `.panel`, `.spec-row`, `.feature-row`, `.samples` and `.sample` | Tabs sticky at 80 on desktop; 64 above the panel on phones. A feature row's first child is uppercase whatever its element. A sample's table has a rule above its first row. |
| Stories on a product page | `.stories`, `.story-card`, `.story-card__img`, `.story-card__title`, `.story-card__excerpt` | |
| Related | `<section class="related" data-more="<id>">` | site.js fills it. |
| Story page | `.story-head`, `.kicker`, `.story-fig--1408/1048/688/560`, `.story-body`, `.story-pair`, `.story-about`, `.explore` with `.explore-card`, `__img`, `__title`, `__excerpt` | Lead figure cropped 3:2. Phones: head padding 96, headline 36 above the tag. No rule above the about block. |
| Stories index | `.profile-head`, `.work-grid`, `.work-card` | |
| Checkout | `.page-title`, `.cart-layout`, `.cart-table__head`, `.cart-row`, `.summary__title`, `.summary__row` | |

---

## 4. Page by page

ASCII widths are at 1440 (content 1408) and 390 (content 358).

### 4.1 Home (`index.html`) ← Sigma home

```
1440                                                    390
[promo 48] [header 48.25]                               [promo 72] [header]
┌──────────── curtain: fixed photo, 100vh ─────────────┐ ┌ hero, static, 844−48 ┐
│        shared-cards-and-board-sun, no text           │ │ …-sun-tall, no text  │
└──────────────────────────────────────────────────────┘ └──────────────────────┘
white layer slides over it (margin-top 100vh, z 10)
  80 │        A YEAR YOU CAN HOLD  (88 caps, −3)          │ 48 │ 36/39.6 caps
     │   [500 measure, 16/20, centred]  EXPLORE MORE     │    │ copy centred
 160 │                 NEW FOR 2027                       │ 96
     │  ┌── 696 × 90vh ──┐16┌── 696 × 90vh ──┐           │    │ 358 × 90vh, stacked
     │  │ SANCTUARY       │  │ POLAROID       │           │    │
 160 │                 THE CALENDARS                      │
     │  ┌459 4:5┐16┌459 4:5┐16┌459 4:5┐ name/price      │    │ 1-up
 160 │                 IN USE                             │
     │  ┌459 4:5┐  ┌459 4:5┐  ┌459 4:5┐ caption          │    │ stacked
 160 ←────── banner 1440 × 90vh: A LETTER FROM THE STUDIO ──────→
 160 │                 MADE IN JAIPUR                     │
     │  ┌── 696 × 90vh ──┐16┌── 696 × 90vh ──┐           │
 160 │            WHERE WILL YOUR YEAR LIVE              │
     │  ┌459 sq┐ ON YOUR DESK  ┌459 sq┐ IN YOUR POCKET  ┌459 sq┐ ON YOUR WALL
 160 │  [letter form 4 cols] [cream panel 8 cols]         │    │ panel, then form
[footer]
```

| # | Section | Sigma equivalent | Content |
|---|---|---|---|
| 0 | Curtain hero | Fixed FP2 hero (`1440-home-01-top-hero.jpg`) | `shared-cards-and-board-sun` (16:9, dark) cover, the whole image one link to `calendars.html`, no text. Phone: `shared-cards-and-board-sun-tall` (4:5). Use a `picture` with `media="(max-width: 900px)"`. |
| 1 | Intro | "Small, powerful, adaptable" | `.d1-home` "A year you can hold", 24 gap, 500 copy (the current lede: three paper calendars for 2027, for your desk, pocket and wall, made in Jaipur), link EXPLORE THE CALENDARS → `calendars.html`. |
| 2 | New for 2027 | New products, two 90vh image tiles | Title "NEW FOR 2027". Sanctuary tile `sanctuary-board-december` (dark) "Sanctuary / Desk and wall calendar" + EXPLORE MORE; Polaroid tile `polaroid-fan-close` (dark) "Polaroid / Twelve stamp cards" + EXPLORE MORE. Distinctive is not here because it has no photograph; it appears in sections 3 and 7. |
| 3 | The calendars | Featured products, 3-up 4:5 tiles | Title "THE CALENDARS". Three `.product-tile`s: Sanctuary (`sanctuary-board-march`, `--photo`), Polaroid (`../assets/polaroid/03-jaipur.png` cut-out), Distinctive (`../assets/distinctive/green-horizontal.webp` print file). Two caps lines (name, line) and the price from `[data-price]`. Badge only for a true fact; none for now. Phone: one-up. Sigma's slider and dots are not needed for three items, which fit the 3-up row exactly. |
| 4 | In use | "Captured with FP2", three 4:5 photos with captions | Title "IN USE". `sanctuary-hand-sets-sheet`, `polaroid-hands-hold-march`, `shared-peg-holds-stamp-card`, each linking to a story. |
| 5 | A letter from the studio | Trevor Key, full-bleed 90vh banner | `.banner` over `sanctuary-hand-on-sheet` (dark). Title "A LETTER FROM THE STUDIO", 500 copy (two lines of the existing letter), READ MORE → the letter story. |
| 6 | Made in Jaipur | Made in Aizu, two 90vh video tiles | Title-on-tile layout `.image-tile--large`, 24/30 caps: `sanctuary-edge-cross` "Cut in Jaipur" and `polaroid-stack-in-hand` "Printed in Jaipur", each → the making story. Stills, not video, and no parallax: we have no footage. |
| 7 | Where will your year live | Product categories, 3 squares + h4 + body + link | This is where the "where will your year live" idea goes, as Sigma would say it: three category columns ON YOUR DESK (`sanctuary-board-march`) / IN YOUR POCKET (`polaroid-card-in-phone-cover-square`) / ON YOUR WALL (`../assets/distinctive/ivory-horizontal.webp`, `.category__img--file`), one sentence each, READ MORE → the product. Not as 3-up 90vh tiles: Sigma has no 3-up 90vh tile anywhere. |
| 8 | The studio letter | Newsletter, form 4 cols + cream panel 8 cols | Form: "THE STUDIO LETTER", one line, Email address *, consent check, SUBSCRIBE → `Elmuse.keepOrSend(form, "waitlist")` with its honest result in `.form-status`. Panel: `../assets/polaroid/03-jaipur.png` centred on cream (Sigma centres a line drawing; we have no drawing, and the March card is Jaipur). Phone: panel first. |

Dropped from the current home: "What people said" (sample quotes) and "Questions, briefly". Sigma's home has neither. The sample quotes move to story cards (clearly marked "Sample"); questions live on `questions.html`.

### 4.2 Calendars listing (`calendars.html`, new) ← Sigma /lenses

```
1440                                                         390
 160 │                 CALENDARS (48/60 caps)              │ 96  36/45
     │        [500 intro, 16/20 centred]                    │
←──── banner 1440 × 606 (2.375:1): sanctuary-hands-fan-sheets ────→
  80 │ 2027 CALENDARS                          3 CALENDARS  │ toolbar 48.25
  64 ←───── full bleed, three cells of 480, 1px ink-10 hairlines ─────→
     ┌──────────────┬──────────────┬──────────────┐   phone: 1-up, 358 inside
     │ img 1:1 pad16│ img 1:1      │ EDITORIAL 4:5│   the margin, pad 16 16 64
     │ SANCTUARY    │ POLAROID     │ photo fills, │
     │ Desk and wall│ Twelve stamp │ bold title + │
     │ ₹2,400       │ ₹1,200       │ READ MORE    │
     ├──────────────┼──────────────┼──────────────┘
     │ DISTINCTIVE ●│ EDITORIAL 4:5│               (a partial last row, as Sigma's)
     │ ● green ivory│ For teams    │
     └──────────────┴──────────────┘
[footer, no letter]
```

- Head: `.list-head` "CALENDARS", intro "Three paper calendars for 2027, for your desk, your pocket and your wall. Made in Jaipur." Banner `sanctuary-hands-fan-sheets` cropped to 2.375:1.
- Toolbar: left "2027 CALENDARS" (Sigma's H1 slot), right "3 CALENDARS" in ink-70. **No filters, no sort, no compare**: with three products they mean nothing, and Sigma's own rule is to show a filter only when it narrows something.
- Grid cells: Sanctuary (`sanctuary-board-march`, `--photo`), Polaroid (`03-jaipur.png`), editorial tile 1 (`shared-board-peg-stamp-card`, "The two together", READ MORE → story), Distinctive (`green-horizontal.webp`, swatches green #2a3d28 and ivory #f3ece0 top right), editorial tile 2 (`shared-cards-and-board-sun-tall`, "For teams", READ MORE → `teams.html`). Name in source caps, line in sentence case, price, as Sigma's "CONTEMPORARY / 12mm F1.4 DC / $629". No hover state.

### 4.3 Product pages (`sanctuary.html`, `polaroid.html`, `distinctive.html`) ← Sigma product page (lens)

```
1440                                                          390
[promo][header][sub-bar: POLAROID | 2027        DETAILS  BUY NOW]
 160 │                    2027                        │  96  36/39.6 two lines
     │                  Polaroid   (88/83.6, −1.32)   │  96  (block 487 at 1440)
     ←──────── hero 1440 × 910, full bleed ──────────→       phone image 4:5
 160
     ┌── gallery 696 ──────────┐16┌──── right half 696 ────┐  gallery 358 4:5
     │ stage 696 × 870 (4:5)   │  │ ┌ buy box 464 ┐ pt 80   │  5 dots under it
     │ ‹ 80                80 ›│  │ 2027 calendar    ₹1,200 │  buy box 358,
     │                         │  │ Polaroid                │  +32 under the gallery
     ├ thumbs 104 on #EBEBEB ──┘  │ meta (ink-70)        50 │
     │                            │ How you carry it     16 │
     │                            │ ◯ BEHIND MY…  ◯ WITH A… │ 224 | 224
     │                            │ helper               32 │
     │                            │ [−][      1      ][+] 16│ 40 | 384 | 40
     │                            │ [   ADD TO CART    ] 48 │ 464 × 40
     │                            │ • bullets ×3         32 │
     │                            │ ORDERING FOR A TEAM ›   │
 160
     │ HOW IT TRAVELS (h4)  │ image 939 × 626 (3:2)        │  96 after the text action,
     │                                                      │  image first, 24, copy
  80 ←── spec band #FAF8F2, full bleed, padding 80 16 ──→
     │ SPECIFICATIONS (sticky)  │ Size        │ 60 × 85 mm  │  tabs above, not sticky, 64 to the panel
     │ HOW IT TRAVELS           │ Paper       │ …           │  33px rows, ink-70 rules
     │ TWELVE CITIES            │                           │
  80 │ ┌ story 696 4:5 ┐16┌ story 696 4:5 ┐  title, excerpt 344, READ MORE
  80 │            THE OTHER CALENDARS
   |cell 360|cell 360|   (cells are a quarter of the viewport, full bleed)   [VIEW ALL CALENDARS]
[footer]
```

Element order, as Sigma: sub-bar → `.pdp-title` → `.pdp-hero` → `.buy#buy-now[data-product-form]` → `.split` → (Sigma's video: we have none, skip) → `.band#details` → `.stories` → `.related[data-more]` → footer.

| Slot | Sanctuary | Polaroid | Distinctive |
|---|---|---|---|
| Title lines | 2027 / Sanctuary | 2027 / Polaroid | 2027 / Distinctive |
| Hero (desktop / phone) | `sanctuary-sheets-golden-hour` / `sanctuary-sheets-golden-hour-tall` | `polaroid-hands-fan-cards` / `polaroid-fan-close` | `../assets/distinctive/green-horizontal.webp` / `green-vertical.webp` (print files; no photographs exist) |
| Gallery slides (4:5) | `sanctuary-board-march` (the `data-product-image`), `sanctuary-board-standing-peg`, `sanctuary-journal-back`, `sanctuary-peg-todo-note`, `sanctuary-back-hanging-plate` | `polaroid-card-in-phone-cover-square` (`data-product-image`), `polaroid-stack-in-hand`, `polaroid-card-beside-phone`, `polaroid-fan-close`, `06-mumbai.png` (`--file`) | the four print files, all `gallery__slide--file`; the first is the `data-product-image` and swaps with the options |
| Name block | "2027 calendar" / "Sanctuary" + price right | "2027 calendar" / "Polaroid" + price | "2027 calendar" / "Distinctive" + price |
| Meta line (Sigma's SKU slot, ink-70) | Birch board, 10 × 15 in | Twelve stamp cards, 60 × 85 mm | Wall planner, 3 × 2 ft |
| Options (`data-choices`) | none in config; the box goes straight from meta to the stepper (32), with the helper "It stands on a desk or hangs on a wall." | How you carry it: BEHIND MY PHONE COVER / WITH A MAGSAFE HOLDER | Orientation: HORIZONTAL / VERTICAL; Colour: FOREST GREEN / IVORY / ARTWORK EDITION |
| Bullets (3) | Twelve sheets, a postcard to tear off each month · `data-delivery` · Guest checkout; delivery cost shown before you pay | One Indian city and its monument for each month · delivery · guest checkout | Every day of 2027 on one sheet · delivery · guest checkout |
| Text action (Sigma's BUY FROM RESELLER ›) | ORDERING FOR A TEAM › → `teams.html` | same | same |
| Split h4 + copy | ONE SHEET, FOUR USES, the four uses as two short paragraphs | HOW IT TRAVELS WITH YOU | HOW PEOPLE USE IT |
| Split image (3:2) | `sanctuary-postcard-qr` | `polaroid-card-in-phone-cover` | the drawn-to-scale view `distinctive.js` makes, at 3:2 |
| Band tab 1, spec rows | DETAILS: Size, Materials, Standing, In the box, Each sheet, Care | SPECIFICATIONS: Size, Paper, The year, In the box, The holder, For companies | SPECIFICATIONS: Size, Orientation, Colours, Paper, In the box |
| Band tab 2, feature rows | HOW YOU USE IT: the four uses | HOW IT TRAVELS: slip it in, swap it on the 1st, the city you carry | HOW PEOPLE USE IT: the year on one wall, plan the week, mark the days |
| Band tab 3, samples (Sigma "sample images") | THE TWELVE MONTHS: `sanctuary-sheet-jan`…`dec`, 2-up, each with a Month / Line spec row | TWELVE CITIES: `polaroid-card-jan`…`dec`, each with Month / City, monument | THE MONTHS: the month crops `distinctive.js` already makes, each with Month / Days |
| Stories (2 × 4:5) | `sanctuary-hand-sets-sheet`, `sanctuary-hands-settle-sheet`; titles and excerpts from the current sample quotes, excerpt starting "Sample:" | `polaroid-hands-hold-march`, `polaroid-stack-in-hand` | `shared-peg-holds-stamp-card` would be wrong (it is Sanctuary); use `sanctuary-hands-fan-sheets-tall` and `polaroid-fan-close` and title them as the studio's stories, not Distinctive's |
| Related | `data-more="sanctuary"` | `data-more="polaroid"` | `data-more="distinctive"` |

Rules for all three: the buy box is never sticky; neither is the gallery. The option change swaps the first slide in place and the price in place. No swatches, no option prices in labels (the price updates). The old "See it in 3D" link for Sanctuary goes in the split copy as a `.link` if the 3D viewer is kept. The old interactive month viewers move into the samples tab; do not invent a new section for them.

### 4.4 Stories (`stories.html`, new) and one story page (`story.html`, new) ← Sigma blog profile and blog post

Stories index (Sigma `profile-1440-01-name-bio.jpg`, `profile-1440-02-work-grid.jpg`):
- `.profile-head`: "STORIES" Regie 88/83.6 caps, −0.32, 160 above; 500 intro, 40 above.
- 160, then `.work-grid`: three columns of 4:5 cards, caps Newsreader 16 title (max 316) under each. Cards: A letter from the studio (`sanctuary-hand-on-sheet-tall`), How a board is made (`sanctuary-board-standing-peg`), Twelve cities (`polaroid-fan-close`), The two together (`shared-board-peg-stamp-card`), plus the sample-quote stories, each marked "Sample" in its title line.

Story page (Sigma `story-1440-*.jpg`, `story-390-*.png`), one template filled from a small object in `js/story.js` chosen by `?s=<slug>`:
- `.story-head` (max 800, centred): kicker (e.g. "SANCTUARY, THE STUDIO", Proxima 13 caps 0.2), 40, H1 Regie 48/52.8 caps, 48, tag (the calendar) and byline ("by the elmuse studio") in Newsreader 16.
- Lead `.story-fig--1408` (3:2 crop of a 16:9 photo is fine), then every block 80 apart: `.story-body` 560 (Newsreader 16/20, 0.05, 16 between paragraphs, no drop cap, no pull quotes, no captions), `.story-fig--688`, `.story-pair` (two 516 portraits, gap 32), `.story-fig--1048`.
- `.story-about`: ABOUT | THE ELMUSE STUDIO | 344 bio. Then "EXPLORE MORE": the other stories as `.work-card`s.
- Text: the existing letter (from the current home) for the letter story; the Sanctuary details for the making story; the Polaroid city list for twelve cities. Anything not written by the owner starts with "Sample text." in the first paragraph.

### 4.5 For teams (`teams.html`) ← Sigma story typography + Sigma controls

- `.story-head`: kicker FOR TEAMS, H1 "A year on their desk, with your name on it" (48 caps), the tag line "Quoted for each order. Ships 10 December to the first week of January."
- Lead `.story-fig--1408` `shared-cards-and-board-sun`.
- `.story-body` 560: the two lines of intro.
- "WHAT WE CAN MAKE YOURS" as `.spec-row`s inside a 560 column (Sanctuary | logo engraved, artwork and themes, monthly QR; Polaroid | brand stickers; Distinctive | custom artwork on larger orders). Sigma uses this row style for structured facts.
- The enquiry form in the same 560 column, id `enquire`: section title in `.summary__title` style, fields as checkout (13 label, 12 gap, 40 inputs), "What are you planning?" as `.radios`, "Which calendars?" as `.check`s, file upload as an outline button, SEND ENQUIRY primary full width. `Elmuse.validate` then `Elmuse.keepOrSend(form, "enquiry")`.
- "Rather talk it through?" with `[data-if-contact]` and the WhatsApp button only when config has a number.

### 4.6 Questions (`questions.html`) ← Sigma spec band with tabs

Sigma would use the spec band: the questions are structured facts in four groups, and the band's vertical tabs are Sigma's way of switching between groups of facts. Story typography would make a long single column with no way to jump.
- `.page-title` "QUESTIONS" (88 caps, 160 above) and a 500 centred intro with `[data-contact-ways]`.
- 80, then `.band` with tabs ORDERING / THE CALENDARS / FOR TEAMS / THE STUDIO; each panel is `.feature-row`s (question in the left 340 cell, answer in the right). No accordions: Sigma has none.
- Phones: tabs above, not sticky.

### 4.7 Checkout (`checkout.html`) ← Sigma cart page
Done in the shared rebuild; see section 2.

---

## 5. Images

| Use | Ratio | Source |
|---|---|---|
| Home curtain | viewport, cover | desktop `shared-cards-and-board-sun`, phone `shared-cards-and-board-sun-tall` |
| 90vh image tiles | 6 cols × 90vh, cover | dark-toned photos only (`tone: dark` in the manifest) so white text reads; `--dim` .25 |
| Full-bleed banner | 90vh, cover | `sanctuary-hand-on-sheet` |
| Editorial cards, story cards, work cards | 4:5 | `*-tall` and 4:5 library photos |
| Product tiles, listing cells, related cells | 4:5 or 1:1, **cut-out on white with air** | `config.products[id].cutout`: Polaroid `03-jaipur.png` (true transparent cut-out); Distinctive the print file; Sanctuary has no cut-out, so `sanctuary-board-march` (the board on a pale table) fills the frame as a photo (`--photo`). A clean board cut-out is the one asset this design still wants. |
| Category squares | 1:1 | photos fill; the Distinctive print file sits contained |
| Product hero | 1440 × 910, cover | per page, with a separate 4:5 phone image |
| Gallery | 4:5 stage | photos cover; cut-outs and print files contain on paper |
| Listing banner | 2.375:1 | `sanctuary-hands-fan-sheets` |
| Letter panel | 3:2 cream panel | `03-jaipur.png` centred |

Never use the `distinctive-*` library photographs for Distinctive: they show a different (light blue) planner. No radius, border, shadow or tilt on any image. Every library image goes through `Elmuse.photo(id)` (or `-1200/-2400.webp` with `srcset`) and its manifest `focal` as `--focal`.

---

## 6. Deviations from Sigma

| Sigma | Ours | Reason |
|---|---|---|
| Sigma Serif text at 400 | Newsreader at 500 | Same width and line breaks; 500 matches Sigma's colour on screen (measured ink), 400 is visibly lighter. |
| Logo 85 × 19.8 | Wordmark 95 × 19.8 | Same height; our wordmark is wider (4.78:1 against 4.29:1). |
| Σ footer mark 80 × 80 | Wordmark 160 × 33 | No elmuse symbol exists. |
| LOG IN, SEARCH in header and menu | Left out | No accounts; three products do not need search. |
| Filters, sort, compare on the listing | Left out | Three products; nothing to narrow. |
| Featured-products slider with dots | A plain 3-up row | Exactly three products fill it. |
| Made in Aizu video tiles with jarallax | Still photos, no parallax | No footage. |
| Product-page video block | Left out | No footage. |
| Dimming baked into tile JPEGs | A flat CSS dim layer (`--dim`, .25; banner .3) | Our photos are not pre-dimmed; the layer does the same job. |
| Drawer UPDATE action | Left out | Quantities apply at once. |
| Cart page CLEAR / UPDATE buttons, discount code | Left out | Lines remove one by one; no codes. |
| Cart page summary first on phones | Summary after the form | Our summary button submits the form above it. |
| Fotorama transform slide (cubic-bezier(.1,0,.25,1)) | Native scroll-snap with smooth scroll | Swipe works natively; the easing is the browser's. |
| Radio ring from an icon font | CSS ring, 16px box, 11px circle, 5px dot | No icon font; same size and position. |
| Drawer shows only subtotal | Adds one ink-70 line while prices are placeholders | Honesty until the owner confirms prices. |
| Checkout notice text about terms | The placeholder-price and payments notice | Same component, our honest message. |
| Sanctuary cut-out | Photo on a pale table | No cut-out exists yet. |

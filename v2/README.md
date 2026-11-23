# elmuse 2027 calendars, v2

Plain HTML, CSS and JS. No build step. Serve `calendars-2027/` over http (for example `python3 -m http.server 8931` from `calendars-2027/`) and open `/v2/styleguide.html` to see every shared part with our content.

**Read `SPEC.md` first.** It maps every page onto sigmaphoto.com's measured layouts, lists the images for each slot and the few deviations. The system copies Sigma's values exactly; do not improve on them.

## The one rule for page builders

Do not edit the shared files: `css/tokens.css`, `css/components.css`, `js/config.js`, `js/site.js`, `img/manifest.json`, `img/icons/`, `img/brand/`, `SPEC.md` and this README. Put page styles in `css/<page>.css` (layout only; never restyle a shared part), the page script in `js/<page>.js`, and extra images in `img/pages/<page>/`. If you need something shared that is missing, build it in your page files and report it.

## The system in one paragraph

Three faces, two working sizes, one ink. Regie is the display face at 88 (36 on phones) and 48. Newsreader at weight 500 is the text face at 16/20 for names, prices and body, and 16/17.6 caps for titles. Proxima Nova (falling back to Figtree live) is every UI label at 13/16.25, uppercase, 0.08px tracking; buttons use 0.26px. Ink is #333; hierarchy is its opacity (.8 hover, .7 secondary, .6 inactive, .1 hairlines). The page is #FEFEFD, the home layer and drawer are white, the spec band is #FAF8F2 and the letter panel #FAF7EF. Radius 0, controls 40 tall, 16px margins and gutters on a 12-column grid with no max width, 80px section padding (48 on phones). Hovers are instant; only the drawer, dropdown, phone menu and sub-bar move.

- **Handwriting** (`--font-hand`, `.hand`) is only for real handwritten notes. A page that shows one adds `&family=Caveat:wght@500` to its font link.
- **Symbols are icons**, never typed characters in the UI face: `Elmuse.icon("plus")` or `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><use href="img/icons/plus.svg#i"></use></svg>`. The set: plus, minus, close, arrows, chevrons, check, cart, menu, truck, whatsapp, mail, external, info, alert. The Proxima demo files draw a "DEMO" flower for `! " # $ % & ' ( ) * + - / 4 < = > @ [ \ ] ^ _ \` { | } ~`; `tokens.css` limits Proxima with `unicode-range`, so those and all digits fall through to Figtree.

## Page skeleton

```html
<!doctype html>
<html lang="en-IN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sanctuary · elmuse 2027 calendars</title>
  <link rel="icon" href="data:,">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;700&family=Newsreader:opsz,wght@6..72,500;6..72,700&display=swap">
  <link rel="stylesheet" href="css/tokens.css">
  <link rel="stylesheet" href="css/components.css">
  <link rel="stylesheet" href="css/sanctuary.css">
</head>
<body data-page="sanctuary">
  <a class="skip-link" href="#main">Skip to content</a>
  <header data-site-header></header>
  <main id="main" class="container">…</main>
  <footer data-site-footer></footer>
  <script src="js/config.js"></script>
  <script src="js/site.js"></script>
  <script src="js/sanctuary.js"></script>
</body>
</html>
```

`site.js` draws the promo bar, the sticky header with the CALENDARS dropdown, the phone menu sheet, the footer and the cart drawer on every page. When `data-page` names a product (`sanctuary`, `polaroid`, `distinctive`) it also adds the sticky product sub-bar, whose links need `id="buy-now"` on the buy section and `id="details"` on the spec band. There is no order bar, no Personal/For teams switch and no Order button: Sigma has none.

## Buy section (product pages)

```html
<div class="buy" id="buy-now" data-product-form="polaroid">
  <div class="gallery" data-gallery>
    <div class="gallery__track">
      <div class="gallery__slide"><img data-product-image src="img/polaroid/polaroid-card-in-phone-cover-square-1200.webp" alt="…"></div>
      <div class="gallery__slide gallery__slide--file"><img src="../assets/polaroid/06-mumbai.png" alt="…"></div>
    </div>
  </div>
  <div class="buybox">
    <div class="buybox__head"><h2 class="buybox__name"><span>2027 calendar</span><span>Polaroid</span></h2><p data-price></p></div>
    <p class="buybox__meta">Twelve stamp cards, 60 × 85 mm</p>
    <div class="buybox__options" data-choices="polaroid"></div>
    <!-- Elmuse.stepperHTML(1, "How many") markup, or write it out as in styleguide.html -->
    <button type="button" class="btn btn--block buybox__add" data-add-to-cart="polaroid">Add to cart</button>
    <ul class="bullets"><li>…</li><li data-delivery></li><li>Guest checkout; delivery cost shown before you pay</li></ul>
    <a class="link link--action" href="teams.html">Ordering for a team <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><use href="img/icons/chevron-right.svg#i"></use></svg></a>
  </div>
</div>
```

- `data-choices="<id>"` renders that product's options from `config.js` as Sigma's text radios in two columns, with the helper line.
- An option change swaps `img[data-product-image]` (and its thumbnail) to `Elmuse.imageFor(id, options)`, moves the gallery to it, and updates `[data-price]` in place.
- `data-add-to-cart` reads the options and the stepper, adds, and opens the drawer.
- `[data-gallery]` gets its arrows, thumbnails (desktop) and dots (phones) from `site.js`.
- `[data-tabs]` makes the spec band's vertical tabs work (`.tab[data-tab="<panel id>"]` and `.panel` with that id).
- `<section class="related" data-more="<this product's id>">` fills with the other calendars and VIEW ALL CALENDARS.
- `[data-price="<id>"]` outside a form shows that product's base price; `[data-delivery]` gets the delivery line; `[data-price-note]` shows the placeholder-price line while prices are unconfirmed.
- For a display-only swap that never touches the cart, use `<fieldset data-swap="#imgId">` with radios carrying `data-image="<manifest id>"`.
- Contact-only copy: `[data-if-contact]`, `[data-if-no-contact]`, `[data-contact-ways]`, `a[data-whatsapp="message"]`, `[data-email]`. Empty routes in config hide their controls.

## Config and photos

- `window.ELMUSE_CONFIG` (`js/config.js`): products (`sanctuary`, `polaroid`, `distinctive`) with name, reason, price, page, `image`, `cutout` (the product shot for tiles on white), specs, options (`priceDelta`, `helper`) and images per option; delivery lines; shipping; contact; endpoints. **Prices and shipping are placeholders (TBD)** until `pricesConfirmed` is true. Endpoints are empty, so forms keep their data on the device and say so.
- `window.Elmuse` (`js/site.js`): `config`, `mode`, `money(n)`, `photo(id)`, `setImage(img, id)`, `price(id, opts)`, `imageFor(id, opts)`, `optionLabels(id, opts)`, `normaliseOptions(id, opts)`, `cart.get/totals/dispatch/open/close/subscribe`, `validate(form)`, `keepOrSend(form, "enquiry"|"waitlist"|"checkout")` (a repeated name such as a checkbox group becomes an array; with an endpoint, a form holding a file input is sent as multipart FormData, otherwise as JSON; kept data records a file by name, size and type), `stepperHTML(qty, label, extraClass)`, `choicesHTML(id)`, `icon(name, cls)`, `contactWays()`. The cart also fires `elmuse:cart` on `document`.
- `img/manifest.json` lists the graded photos with `ratio`, `focal`, `uses`, `option`, `tone` and `alt`. Paths follow `img/<first word of id>/<id>-1200.webp` and `-2400.webp`. The `distinctive-*` photos show a different planner: never use them for Distinctive.

## Checks

`calendar-refs/v2-review/sigma-match/` (outside this public folder) holds the comparison with Sigma: `computed-styles.txt` (each shared part's computed styles and boxes against Sigma's measured values at 1440×900, 1920×1080, 1024×768 and 390×844), and side-by-side images of the header, dropdown, footer, drawer, checkout and phone menu, Sigma on the left.

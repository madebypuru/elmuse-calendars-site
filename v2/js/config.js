/* elmuse 2027 calendars, v2 site config. Shared file: the owner edits values here, page builders read it.
   Every price and shipping cost below is a PLACEHOLDER (TBD) until the owner confirms it.
   When prices are real, set pricesConfirmed: true and the "placeholder price" tag disappears. */
window.ELMUSE_CONFIG = {
  currency: "INR",
  pricesConfirmed: false, // TBD

  // Images: a manifest id (img/manifest.json) or a path relative to v2/.
  products: {
    sanctuary: {
      id: "sanctuary",
      name: "Sanctuary",
      reason: "A birch board for your desk or wall, with a month to tear off, keep and post.",
      price: 2400, // TBD placeholder
      page: "sanctuary.html",
      image: "sanctuary-board-march",
      cutout: "sanctuary-board-march", // product shot for tiles on white; no cut-out of the board exists yet, so the photo on its pale table stands in
      specs: ["Birch ply board, 10 × 15 in", "12 sheets, 320 gsm", "Tear-off postcard on every month", "Journal back with a ritual and a QR"],
      options: [],
      images: { default: "sanctuary-board-march" }
    },
    polaroid: {
      id: "polaroid",
      name: "Polaroid",
      reason: "Twelve stamp cards, one Indian city a month, carried behind your phone.",
      price: 1200, // TBD placeholder
      page: "polaroid.html",
      image: "polaroid-hands-fan-cards",
      cutout: "../assets/polaroid/03-jaipur.png", // transparent PNG of the March card, for tiles on white
      specs: ["12 stamp cards, 60 × 85 mm", "Textured 380 gsm", "Fits behind a clear phone cover"],
      options: [
        {
          group: "holder",
          label: "How you carry it",
          helper: "Photo of the holder coming soon.", // no MagSafe holder photo exists yet, so the picture does not change
          choices: [
            { value: "cover", label: "Behind my phone cover", priceDelta: 0 },
            { value: "magsafe", label: "With a MagSafe holder", priceDelta: 900 } // TBD placeholder
          ]
        }
      ],
      // Key is the chosen option values joined by "-" in option order. No MagSafe photo exists yet.
      images: { default: "polaroid-card-in-phone-cover-square", cover: "polaroid-card-in-phone-cover-square", magsafe: "polaroid-card-in-phone-cover-square" } // no MagSafe holder photo yet: shows the plain card until one exists
    },
    distinctive: {
      id: "distinctive",
      name: "Distinctive",
      reason: "The whole year on one 3 × 2 ft sheet, so you can see it from across the room.",
      price: 3200, // TBD placeholder
      page: "distinctive.html",
      image: "../assets/distinctive/green-horizontal.webp", // the real planner print; the library photos show a different product
      cutout: "../assets/distinctive/green-horizontal.webp", // the print file on white
      specs: ["3 × 2 ft wall planner", "Horizontal or vertical", "Green, ivory or the artwork edition"],
      options: [
        {
          group: "orientation",
          label: "Orientation",
          helper: "Horizontal reads like a timeline; vertical fits narrow walls.",
          choices: [
            { value: "horizontal", label: "Horizontal", priceDelta: 0 },
            { value: "vertical", label: "Vertical", priceDelta: 0 }
          ]
        },
        {
          group: "colour",
          label: "Colour",
          helper: "Choose a colour to see it.",
          choices: [
            { value: "green", label: "Forest green", priceDelta: 0, swatch: "#2a3d28" },
            { value: "ivory", label: "Ivory", priceDelta: 0, swatch: "#f3ece0" },
            { value: "artwork", label: "Artwork edition", priceDelta: 400 } // TBD placeholder
          ]
        }
      ],
      // Design files, not photos. The artwork edition has no image yet and falls back to default.
      images: {
        default: "../assets/distinctive/green-horizontal.webp",
        "horizontal-green": "../assets/distinctive/green-horizontal.webp",
        "vertical-green": "../assets/distinctive/green-vertical.webp",
        "horizontal-ivory": "../assets/distinctive/ivory-horizontal.webp",
        "vertical-ivory": "../assets/distinctive/ivory-vertical.webp",
        // The artwork edition has no file yet: it shows the green print in the chosen orientation until one exists.
        "horizontal-artwork": "../assets/distinctive/green-horizontal.webp",
        "vertical-artwork": "../assets/distinctive/green-vertical.webp"
      }
    }
  },

  delivery: {
    line: "Ships from Jaipur from 10 December", // owner fact: shipping runs 10 Dec to first week of Jan
    india: "Arrives 4–8 days after it ships", // TBD: estimate, not confirmed by owner
    international: "Arrives 10–18 days after it ships" // TBD: estimate, not confirmed by owner
  },

  shipping: {
    india: 150,          // TBD placeholder, per order
    international: 1800, // TBD placeholder, per order
    freeIndiaOver: 4000  // TBD placeholder; 0 turns free shipping off
  },

  contact: {
    whatsapp: "", // digits with country code, e.g. "919800000000". Empty: WhatsApp buttons stay disabled.
    email: "",    // e.g. "hello@elmuse.in". Empty: email links show a note.
    address: "elmuse studio, Jaipur, Rajasthan, India" // placeholder address line
  },

  endpoints: {
    enquiry: "",  // POST URL for team enquiries. Empty: forms keep the data on this device and say so.
    waitlist: "", // POST URL for the waitlist.
    checkout: ""  // payment provider. Empty: checkout ends at "payments are not connected yet".
  }
};

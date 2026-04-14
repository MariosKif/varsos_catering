# Finger Food Page — UI/UX Redesign

**Date:** 2026-04-14
**Target file:** `src/pages/finger-food.astro`
**Approach:** "Editorial Long-Form"

## Goal

Rebuild the finger food page into a warm, editorial experience that serves two audiences equally — parents planning a παιδικό πάρτι (the SEO target) and general catering customers — while pushing every visitor toward a single primary action: **calling or WhatsApp-ing for a quote**.

## Decisions locked during brainstorming

| Decision | Choice |
|---|---|
| Audience | Both balanced, with prominent παιδικό πάρτι section |
| Primary CTA | Phone call / WhatsApp |
| Gallery organization | Categorized with tabs/filters |
| Visual direction | Warm & Editorial (cream/ivory, Playfair headlines, muted orange) |
| Παιδικό πάρτι placement | Dedicated featured section **above** the gallery |

## Page structure

Top-to-bottom flow on `/finger-food`:

1. **Hero** — editorial headline with italic accent word + 3-photo collage + phone pill
2. **Παιδικό Πάρτι featured section** — warm cream card with 4 kid-friendly photos + phone & WhatsApp CTAs
3. **Tabbed gallery** — 29 items, sticky category chips, 7 filters
4. **"Πώς στήνουμε το finger food σας"** — 6-step builder as small numbered cards
5. **Γιατί Varsos** — 3 trust points with icons (Αγνά υλικά / Ποικιλία / Από το 1987)
6. **Final CTA band** — orange gradient with phone + WhatsApp buttons
7. **Sticky floating phone/WhatsApp** — mobile only (below 768px), bottom-right

## Section details

### 1. Hero

- Background: gradient from `#fefaf3` to `#faf7f2` (cream).
- Pre-title kicker: `— FINGER FOOD · ΑΠΟ ΤΟ 1987` in uppercase brand orange, letter-spacing ~3px.
- Headline: `Χειροποίητα ορεκτικά για κάθε στιγμή.` — Playfair Display 700, "ορεκτικά" italicized in `text-brand-600`.
- Subcopy: one sentence about 29 ideas, fresh ingredients, audiences (παιδικά πάρτι, δεξιώσεις, βαφτίσεις, εταιρικά).
- Primary CTA: pill button "📞 211 800 2214" (phone number from the scraped source) — `tel:+302118002214`.
- Secondary CTA: ghost pill "Δείτε τις ιδέες ↓" that smooth-scrolls to the gallery section.
- Right side: 3-photo collage (1 tall, 2 small) using images `02-mini-cheeseburger.jpg`, `25-souvlakia-kotopoulo-ananas.jpg`, `04-solomos-rokka-graviera.jpg`. Rounded `rounded-2xl`.
- On mobile, collage stacks below copy.

### 2. Παιδικό Πάρτι featured section

- Contained within `max-w-6xl`, sits as a card with rounded corners and cream-orange gradient background (`from-[#fff4e6] to-[#fef3e2]` with `border-[#f5dfc0]`).
- Decorative soft circle in a corner for warmth (no heavy illustrations).
- Kicker: `🎉 ΠΑΙΔΙΚΟ ΠΑΡΤΙ` in brand orange uppercase.
- Headline: `Νόστιμες επιλογές που αγαπούν τα παιδιά.` (Playfair).
- Copy: 1-2 sentences about kid-friendly finger food (mini burgers, hot dogs, σνιτσελάκια, κεφτεδάκια, μπόμπες).
- CTAs: phone pill (brand orange) + WhatsApp pill (`#25D366`).
- Right side: 2×2 grid of 4 images — `02-mini-cheeseburger.jpg`, `08-hotdog-krepaki.jpg`, `10-snitselakia.jpg`, `07-keftedakia-tyri.jpg`.
- WhatsApp link: `https://wa.me/302118002214` (using same landline number; update to a dedicated WA number if one exists — TBD by owner).

### 3. Tabbed gallery

- Section id: `#gallery` so the hero "Δείτε τις ιδέες" anchor works.
- Section header: kicker `ΕΠΙΛΟΓΕΣ` + Playfair heading `29 χειροποίητες ιδέες`.
- **Category tabs** — sticky on scroll (`position: sticky; top: <header-height>`), horizontally scrollable on mobile:
  - `Όλα (29)` — default, active
  - `🍔 Burgers & Hot Dogs` (2 items)
  - `🧀 Καναπεδάκια` (6 items)
  - `🍡 Σουβλάκια & Sticks` (5 items)
  - `🥧 Πίτες` (2 items)
  - `🧀 Τυριά & Αλλαντικά` (6 items)
  - `🥩 Κρέας` (4 items)
  - `🥐 Ζύμες & Σαλάτες` (4 items)
- Active chip style: filled black (`bg-gray-900 text-white`). Inactive: white with cream border.
- Grid: 2 cols mobile, 3 cols sm, 4 cols lg. Square aspect-ratio images with rounded `rounded-2xl`, item name below in 13-14px weight-medium.
- Filter interaction: client-side JavaScript toggles a `data-category` attribute match. When a category is selected, non-matching items fade out and collapse with a short transition (~250ms). No URL state — it's a simple filter.
- Each item stays keyboard-accessible; filter buttons use `<button>` elements with `aria-pressed`.

**Category mapping** (each item gets one category; multi-tag not needed for MVP):

| Category | Item numbers |
|---|---|
| Burgers & Hot Dogs | 02, 08 |
| Καναπεδάκια | 01, 04, 11, 12, 14, 17 |
| Σουβλάκια & Sticks | 03, 15, 16, 25, 28 |
| Πίτες | 18, 19 |
| Τυριά & Αλλαντικά | 05, 06, 20, 23, 24, 27 |
| Κρέας | 07, 10, 26, 29 |
| Ζύμες & Σαλάτες | 09, 13, 21, 22 |

### 4. "Πώς στήνουμε" builder guide

- White background section (breaks up the cream rhythm).
- Kicker `ΟΔΗΓΟΣ` + Playfair heading `Πώς στήνουμε το finger food σας`.
- 6 cards (3×2 on desktop, 2×3 on tablet, 1×6 on mobile). Each card: numbered circle (1-6) in brand orange, label, short description. Cream-tinted card background to contrast with the white section.
- Content stays as it is now (Βάση / Τυριά / Spreads & σως / Πρωτεΐνη / Συνοδευτικά / Φρούτα).

### 5. Γιατί Varsos

- Cream background (`#faf7f2`).
- 3 cards with emoji icons:
  - 🌿 **Αγνά υλικά** — "Χωρίς συντηρητικά. Αυθημερόν."
  - 🍽️ **Ποικιλία γεύσεων** — "29 ιδέες, από mini burgers έως μπόμπες."
  - ⏱️ **Από το 1987** — "Σχεδόν 40 χρόνια εμπειρίας στην Αθήνα."

### 6. Final CTA band

- Full-width section with a `linear-gradient(135deg, brand-600, brand-700)` background and white text.
- Playfair heading `Ας στήσουμε το μενού σας`.
- Subcopy: "Καλέστε μας ή στείλτε WhatsApp — απαντάμε άμεσα."
- Two pill buttons: phone (white bg, brand-orange text) + WhatsApp (`#25D366`, white text).

### 7. Sticky floating phone/WhatsApp (mobile only)

- Visible below `md` breakpoint (`< 768px`).
- Fixed bottom-right, `24px` inset, two stacked circular buttons (phone above, WhatsApp below) — ~48px diameter each with shadow.
- Appears once the hero section has fully left the viewport (IntersectionObserver on the hero element). Hidden again when the final CTA band enters the viewport, to avoid overlapping with the in-section phone/WhatsApp pills.
- Hidden on desktop since hero + featured + final CTA already surface phone and WhatsApp.

## Visual tokens

- Cream surfaces: `#faf7f2` (page), `#fefaf3` (hero top), `#fff4e6`/`#fef3e2` (παιδικό πάρτι card).
- Borders: `#ece5d6` / `#e5dcc9`.
- Text: primary `#1c1917`, secondary `#6b5d47`.
- Brand orange: existing Tailwind `brand-600` (oklch 0.55 0.17 50) used for accents, kickers, CTA pills, hover states.
- WhatsApp green: `#25D366`.
- Headings: Playfair Display 700 with letter-spacing `-0.01em` on large sizes.
- Body: system sans (inherited from Layout). Keep existing Tailwind body stack.
- Radii: `rounded-2xl` for cards and images; `rounded-full` for pills.
- Spacing: generous (`py-20`/`py-24` between sections), section max-width `max-w-6xl`.

## Motion

- Use the existing GSAP setup. Keep motion restrained and editorial:
  - Hero: fade+slide-up on kicker, headline, subcopy, collage (`data-gsap-fade` stagger — already wired).
  - Παιδικό πάρτι, gallery header, builder, trust, CTA: ScrollTrigger fade-in at 80% viewport, subtle 30px rise.
  - Image cards in the gallery: on hover, scale to 1.05 (already present), plus a soft lift shadow.
  - No parallax, no looping animations, no auto-scroll carousels.

## Accessibility

- All images keep descriptive `alt` text (already in the data array).
- Category filter buttons use `<button aria-pressed>`; focus ring visible.
- Phone/WhatsApp pills include `aria-label` with full intent ("Καλέστε Varsos Catering", "Επικοινωνία μέσω WhatsApp").
- Color contrast: body text on cream ≥ 4.5:1 (verified against `#6b5d47` on `#faf7f2`). White text on brand-600 gradient passes WCAG AA.
- Respect `prefers-reduced-motion` — disable all ScrollTrigger reveals under that media query.

## Implementation scope

- Modify: `src/pages/finger-food.astro` (full rewrite of the body).
- Possibly add: a small `StickyContactFab.astro` component for the mobile floating CTA (single-purpose, self-contained).
- Keep: the downloaded `public/images/finger-food/*.{jpg,png}` assets unchanged.
- Out of scope: changing the Header, Footer, Layout, other pages, Firebase config, or introducing new dependencies. All styling stays within Tailwind v4 tokens.

## Content (Greek copy — final)

Captured in the section detail blocks above. The existing `items` data array in the page gets extended with a `category` field mapping per the table in §3.

## Success criteria

- Page passes `npm run build` with zero errors.
- Page renders without console errors on desktop and mobile viewports.
- All 29 items appear and filter correctly across the 7 categories.
- Phone and WhatsApp links open the native handlers on mobile.
- Sticky mobile FAB appears on scroll and hides when off-screen contact zones are already visible.
- Lighthouse accessibility score ≥ 95.

## Open items (to confirm before implementation)

- Whether there's a dedicated WhatsApp number or the landline `211 800 2214` is WA-enabled.

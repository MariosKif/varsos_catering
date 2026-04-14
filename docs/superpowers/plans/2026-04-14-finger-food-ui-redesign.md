# Finger Food UI/UX Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/finger-food` as a warm, editorial, single-primary-CTA page with a tabbed category gallery, dedicated παιδικό πάρτι feature, and mobile sticky contact FAB — per the Editorial Long-Form spec.

**Architecture:** One Astro page (`src/pages/finger-food.astro`) owning all layout, data, and client JS for the category filter. One new small component (`src/components/StickyContactFab.astro`) encapsulating the mobile-only floating phone/WhatsApp buttons with IntersectionObserver visibility. All styles via Tailwind v4 utility classes (brand tokens from `src/styles/global.css`). Motion via the existing GSAP + ScrollTrigger setup, gated by `prefers-reduced-motion`.

**Tech Stack:** Astro 5, Tailwind CSS 4 (via `@tailwindcss/vite`), GSAP 3 + ScrollTrigger, Playfair Display (Google Fonts, already loaded in `Layout.astro`).

**Spec:** `docs/superpowers/specs/2026-04-14-finger-food-ui-redesign-design.md`

**Verification convention:** This page has no unit tests (no existing test suite for `.astro` pages). Verification runs the dev server (`npm run dev`) and uses the Playwright MCP (`mcp__playwright__browser_navigate`, `browser_take_screenshot`, `browser_console_messages`, `browser_resize`) to confirm rendering, zero console errors, and correct behavior at desktop (1280×800) and mobile (375×812) viewports.

---

## File plan

| Path | Status | Responsibility |
|---|---|---|
| `src/pages/finger-food.astro` | modify (full rewrite) | Page data (items, categories, WHATSAPP_URL), all sections, filter JS, GSAP motion |
| `src/components/StickyContactFab.astro` | create | Mobile-only fixed phone + WA buttons; IntersectionObserver-based visibility |
| `public/images/finger-food/*.{jpg,png}` | unchanged | 29 downloaded photos — reuse as-is |

**Note on decomposition:** The filter JS, motion JS, and markup all live in one `.astro` file because Astro co-locates client scripts with their markup. If `finger-food.astro` grows past ~350 lines we can later extract sub-sections into partials, but the spec's scope doesn't require that split upfront.

---

## Task 1: Set up data layer and page scaffold

**Files:**
- Modify (full rewrite): `src/pages/finger-food.astro`

**Goal:** Replace the current page body with a new skeleton that declares all page data (items with categories, category list, WhatsApp constant, phone constant) and renders a minimal Hero + section placeholders. No styling polish yet — just clean structure that compiles and is ready for section-by-section refinement in later tasks.

- [ ] **Step 1: Replace `src/pages/finger-food.astro` entirely**

Write this exact content:

```astro
---
import Layout from '../layouts/Layout.astro';
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';

const PHONE_DISPLAY = '211 800 2214';
const PHONE_HREF = 'tel:+302118002214';
// TODO: replace with real WhatsApp URL once provided by owner.
const WHATSAPP_URL = '#whatsapp';

type Category =
  | 'burgers'
  | 'kanapedakia'
  | 'souvlakia'
  | 'pites'
  | 'tyria-allantika'
  | 'kreas'
  | 'zymes-salates';

interface Item {
  img: string;
  name: string;
  category: Category;
}

const items: Item[] = [
  { img: '/images/finger-food/01-tyri-krema-solomos.jpg',        name: 'Τυρί κρέμα & φρέσκος σολωμός',                category: 'kanapedakia' },
  { img: '/images/finger-food/02-mini-cheeseburger.jpg',         name: 'Mini Cheeseburger με ψωμί μπριός',            category: 'burgers' },
  { img: '/images/finger-food/03-loukanika-beikon.jpg',          name: 'Λουκάνικα με μπέικον καραμελωμένα',            category: 'souvlakia' },
  { img: '/images/finger-food/04-solomos-rokka-graviera.jpg',    name: 'Σολομός, μαρούλι, ρόκα, γραβιέρα',             category: 'kanapedakia' },
  { img: '/images/finger-food/05-kypela-allantikon-tyrion.jpg',  name: 'Κύπελα αλλαντικών & τυριών',                   category: 'tyria-allantika' },
  { img: '/images/finger-food/06-salami-tyri-pasta-elia.jpg',    name: 'Σαλάμι, τυρί, pasta ελιάς',                    category: 'tyria-allantika' },
  { img: '/images/finger-food/07-keftedakia-tyri.jpg',           name: 'Κεφτεδάκια χειροποίητα με τυρί',                category: 'kreas' },
  { img: '/images/finger-food/08-hotdog-krepaki.jpg',            name: 'Hot dog με κρεπάκι, τυρί & σως',               category: 'burgers' },
  { img: '/images/finger-food/09-krouasan-voutirou.png',         name: 'Κρουασάν βουτύρου διάφορα',                    category: 'zymes-salates' },
  { img: '/images/finger-food/10-snitselakia.jpg',               name: 'Σνιτσελάκια',                                  category: 'kreas' },
  { img: '/images/finger-food/11-baketa-filadelfeia-prosouto.jpg', name: 'Μπακέτα με τυρί φιλαδέλφεια & προσούτο',     category: 'kanapedakia' },
  { img: '/images/finger-food/12-ntomatinia-motsarela.jpg',      name: 'Ντοματίνια με μοτσαρέλα',                      category: 'kanapedakia' },
  { img: '/images/finger-food/13-atomika-salatas-dip.jpg',       name: 'Ατομικά είδη σαλάτας με/χωρίς dip',            category: 'zymes-salates' },
  { img: '/images/finger-food/14-tartaki-solomos-elia.jpg',      name: 'Ταρτάκι με σολομό, ελιά, αγγούρι & σως',       category: 'kanapedakia' },
  { img: '/images/finger-food/15-kotopoulo-beikon-zahari.jpg',   name: 'Μπουκιές κοτόπουλου με μπέικον & καστανή ζάχαρη', category: 'souvlakia' },
  { img: '/images/finger-food/16-soudakia-pikantiko-tyri.jpg',   name: 'Σουδάκια αλμυρά με πικάντικη γέμιση τυριών',   category: 'souvlakia' },
  { img: '/images/finger-food/17-kritsinia-prosouto.jpg',        name: 'Κριτσίνια με προσούτο & φιλαδέλφεια',           category: 'kanapedakia' },
  { img: '/images/finger-food/18-spanakotyropita.jpg',           name: 'Σπανακοτυρόπιτα χωριάτικη χειροποίητη',         category: 'pites' },
  { img: '/images/finger-food/19-tyropitaki-sousami.jpg',        name: 'Τυροπιτάκι με σουσάμι',                        category: 'pites' },
  { img: '/images/finger-food/20-tyrokafteri-salami.jpg',        name: 'Τυροκαυτερή με σαλάμι & ελιά',                  category: 'tyria-allantika' },
  { img: '/images/finger-food/21-boukitses-finger.jpg',          name: 'Μπουκίτσες finger',                            category: 'zymes-salates' },
  { img: '/images/finger-food/22-bobes-brios.jpg',               name: 'Μπόμπες διάφορες μπριός',                      category: 'zymes-salates' },
  { img: '/images/finger-food/23-piatela-tyrion-allantikon.jpg', name: 'Πιατέλα τυριών & αλλαντικών για απεριτίφ',     category: 'tyria-allantika' },
  { img: '/images/finger-food/24-tyroboukitses.jpg',             name: 'Τυρομπουκίτσες',                               category: 'tyria-allantika' },
  { img: '/images/finger-food/25-souvlakia-kotopoulo-ananas.jpg', name: 'Σουβλάκια κοτόπουλου με πιπεριά & ανανά',     category: 'souvlakia' },
  { img: '/images/finger-food/26-psito-hoirino-rolo.jpg',        name: 'Ψητό χοιρινό ρολό',                            category: 'kreas' },
  { img: '/images/finger-food/27-diskos-tyrion-allantikon.jpg',  name: 'Δίσκος τυριών & αλλαντικών για απεριτίφ',      category: 'tyria-allantika' },
  { img: '/images/finger-food/28-soudakia-zampon-tonos.jpg',     name: 'Σουδάκια αλμυρά με ζαμπόν, κοτόπουλο, τόνο',   category: 'souvlakia' },
  { img: '/images/finger-food/29-fterougies-kotopoulo-bbq.jpg',  name: 'Φτερούγες κοτόπουλου ψητές ή με σάλτσα BBQ',    category: 'kreas' },
];

const categories: { id: Category | 'all'; label: string }[] = [
  { id: 'all',             label: `Όλα (${items.length})` },
  { id: 'burgers',         label: '🍔 Burgers & Hot Dogs' },
  { id: 'kanapedakia',     label: '🧀 Καναπεδάκια' },
  { id: 'souvlakia',       label: '🍡 Σουβλάκια & Sticks' },
  { id: 'pites',           label: '🥧 Πίτες' },
  { id: 'tyria-allantika', label: '🧀 Τυριά & Αλλαντικά' },
  { id: 'kreas',           label: '🥩 Κρέας' },
  { id: 'zymes-salates',   label: '🥐 Ζύμες & Σαλάτες' },
];
---

<Layout
  title="Finger Food — 20+ Ιδέες | Varsos Catering"
  description="Χειροποίητα finger food με ποιοτικά υλικά χωρίς συντηρητικά. 29 ιδέες για παιδικά πάρτι, δεξιώσεις και εταιρικά events — από το 1987."
>
  <Header currentPath="/finger-food" />

  <section id="hero" class="pt-28 pb-16 px-4 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-6xl text-center">
      <h1 class="font-heading text-4xl font-bold">Finger Food</h1>
      <p class="mt-4 text-gray-500">Scaffold — sections below will fill in task-by-task.</p>
    </div>
  </section>

  <section id="paidiko-parti" class="py-16 px-4"><div class="mx-auto max-w-6xl">[παιδικό πάρτι placeholder]</div></section>
  <section id="gallery" class="py-16 px-4"><div class="mx-auto max-w-6xl">[gallery placeholder — {items.length} items / {categories.length} categories]</div></section>
  <section id="builder" class="py-16 px-4"><div class="mx-auto max-w-6xl">[builder placeholder]</div></section>
  <section id="why" class="py-16 px-4"><div class="mx-auto max-w-6xl">[why varsos placeholder]</div></section>
  <section id="cta" class="py-16 px-4"><div class="mx-auto max-w-6xl">[final cta placeholder]</div></section>

  <Footer />
</Layout>
```

- [ ] **Step 2: Verify the page renders with zero console errors**

If the dev server isn't running, start it: `npm run dev` (background).

Using the Playwright MCP:
1. `browser_navigate` to `http://localhost:4321/finger-food` (use the port reported by the dev server; may be 4322+ if 4321 is in use).
2. `browser_console_messages` with `level: "error"` — expect 0 errors.
3. `browser_take_screenshot` full-page — expect the placeholder headings to be visible.

- [ ] **Step 3: Commit**

```bash
git add src/pages/finger-food.astro
git commit -m "Scaffold finger-food redesign with item+category data"
```

---

## Task 2: Build the hero section

**Files:**
- Modify: `src/pages/finger-food.astro` (replace the `#hero` section)

**Goal:** Editorial hero with kicker, italic-accent headline, supporting copy, phone CTA, ghost scroll CTA, and a 3-photo collage on the right (stacked below on mobile).

- [ ] **Step 1: Replace the `#hero` section**

In `src/pages/finger-food.astro`, replace the entire `<section id="hero">…</section>` block with:

```astro
  <section id="hero" class="relative overflow-hidden bg-gradient-to-b from-[#fefaf3] to-[#faf7f2] pt-28 pb-20 px-4 sm:px-6 lg:px-8 lg:pt-36">
    <div class="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-brand-100/50 blur-3xl" aria-hidden="true"></div>
    <div class="relative mx-auto max-w-6xl">
      <div class="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-12 items-center">
        <div data-gsap-fade>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">— Finger Food · Από το 1987</p>
          <h1 class="mt-4 font-heading text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight text-gray-900">
            Χειροποίητα <em class="italic text-brand-600">ορεκτικά</em><br class="hidden sm:inline" />
            για κάθε στιγμή.
          </h1>
          <p class="mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-[#6b5d47]">
            29 ιδέες finger food με φρέσκα υλικά, χωρίς συντηρητικά. Ιδανικά για παιδικά πάρτι, δεξιώσεις, βαφτίσεις και εταιρικά events.
          </p>
          <div class="mt-7 flex flex-wrap gap-3">
            <a
              href={PHONE_HREF}
              aria-label={`Καλέστε Varsos Catering στο ${PHONE_DISPLAY}`}
              class="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
            >
              <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M2 3.5A1.5 1.5 0 013.5 2h1.148a1.5 1.5 0 011.465 1.175l.716 3.223a1.5 1.5 0 01-1.052 1.767l-.933.267a11.036 11.036 0 006.72 6.72l.267-.933a1.5 1.5 0 011.767-1.052l3.223.716A1.5 1.5 0 0118 15.352V16.5a1.5 1.5 0 01-1.5 1.5H15c-7.18 0-13-5.82-13-13V3.5z" /></svg>
              {PHONE_DISPLAY}
            </a>
            <a
              href="#gallery"
              class="inline-flex items-center gap-2 rounded-full bg-white border border-[#e5dcc9] px-6 py-3 text-sm font-semibold text-[#6b5d47] transition hover:border-brand-600 hover:text-brand-700"
            >
              Δείτε τις ιδέες
              <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clip-rule="evenodd" /></svg>
            </a>
          </div>
        </div>

        <div class="grid grid-cols-2 grid-rows-2 gap-3 sm:gap-4" data-gsap-fade>
          <div class="row-span-2 aspect-[3/4] overflow-hidden rounded-3xl ring-1 ring-black/5">
            <img src="/images/finger-food/02-mini-cheeseburger.jpg" alt="Mini cheeseburger με ψωμί μπριός" class="h-full w-full object-cover" loading="eager" />
          </div>
          <div class="aspect-square overflow-hidden rounded-2xl ring-1 ring-black/5">
            <img src="/images/finger-food/25-souvlakia-kotopoulo-ananas.jpg" alt="Σουβλάκια κοτόπουλου" class="h-full w-full object-cover" loading="eager" />
          </div>
          <div class="aspect-square overflow-hidden rounded-2xl ring-1 ring-black/5">
            <img src="/images/finger-food/04-solomos-rokka-graviera.jpg" alt="Σολομός με ρόκα και γραβιέρα" class="h-full w-full object-cover" loading="eager" />
          </div>
        </div>
      </div>
    </div>
  </section>
```

- [ ] **Step 2: Verify rendering at desktop and mobile**

1. `browser_navigate` to the finger-food URL.
2. `browser_resize` to `1280×800`, `browser_take_screenshot` — expect two-column layout with copy left, collage right.
3. `browser_resize` to `375×812`, `browser_take_screenshot` — expect copy on top, collage below (stacked).
4. `browser_console_messages` errors — expect 0.
5. Click the phone pill — expect its href to be `tel:+302118002214` (inspect via `browser_evaluate` if needed: `document.querySelector('#hero a[href^=tel]').getAttribute('href')`).

- [ ] **Step 3: Commit**

```bash
git add src/pages/finger-food.astro
git commit -m "Build editorial hero for finger-food with collage and phone CTA"
```

---

## Task 3: Παιδικό Πάρτι featured section

**Files:**
- Modify: `src/pages/finger-food.astro` (replace the `#paidiko-parti` section)

**Goal:** Warm cream-orange card above the gallery with kicker, Playfair headline, kid-friendly copy, phone + WhatsApp CTAs, and a 2×2 photo grid of kid-friendly items (mini burger, hot dog, snitzel, kefte with cheese).

- [ ] **Step 1: Replace the `#paidiko-parti` section**

Replace the entire `<section id="paidiko-parti">…</section>` block with:

```astro
  <section id="paidiko-parti" class="px-4 sm:px-6 lg:px-8 -mt-8 lg:-mt-12 pb-12">
    <div class="mx-auto max-w-6xl">
      <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#fff4e6] to-[#fef3e2] border border-[#f5dfc0] p-8 sm:p-10 lg:p-14">
        <div class="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full bg-brand-200/40" aria-hidden="true"></div>
        <div class="relative grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">🎉 Παιδικό Πάρτι</p>
            <h2 class="mt-3 font-heading text-3xl sm:text-4xl font-bold leading-[1.1] text-gray-900">
              Νόστιμες επιλογές που<br />αγαπούν τα παιδιά.
            </h2>
            <p class="mt-4 text-base leading-relaxed text-[#6b5d47]">
              Mini burgers, hot dogs, σνιτσελάκια, κεφτεδάκια και μπόμπες — μερίδες finger-friendly που δεν διακόπτουν το παιχνίδι. Οργανώνουμε το μενού ανάλογα με τον αριθμό και την ηλικία των παιδιών.
            </p>
            <div class="mt-6 flex flex-wrap gap-3">
              <a
                href={PHONE_HREF}
                aria-label={`Καλέστε για προσφορά στο ${PHONE_DISPLAY}`}
                class="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-brand-600/25 transition hover:bg-brand-700"
              >
                <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M2 3.5A1.5 1.5 0 013.5 2h1.148a1.5 1.5 0 011.465 1.175l.716 3.223a1.5 1.5 0 01-1.052 1.767l-.933.267a11.036 11.036 0 006.72 6.72l.267-.933a1.5 1.5 0 011.767-1.052l3.223.716A1.5 1.5 0 0118 15.352V16.5a1.5 1.5 0 01-1.5 1.5H15c-7.18 0-13-5.82-13-13V3.5z" /></svg>
                Καλέστε για προσφορά
              </a>
              <a
                href={WHATSAPP_URL}
                aria-label="Επικοινωνία μέσω WhatsApp"
                class="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-semibold text-white shadow-md shadow-[#25D366]/25 transition hover:bg-[#1ebe57]"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 004.79 1.23h.004c5.46 0 9.91-4.45 9.91-9.92 0-2.65-1.03-5.14-2.9-7.01A9.825 9.825 0 0012.05 2zm0 1.67c2.2 0 4.27.86 5.82 2.42a8.21 8.21 0 012.42 5.82c0 4.55-3.7 8.25-8.24 8.25a8.21 8.21 0 01-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 01-1.26-4.4c0-4.54 3.7-8.24 8.24-8.24zm-4.42 4.54c-.21 0-.55.08-.84.4-.29.32-1.1 1.08-1.1 2.63s1.13 3.05 1.29 3.26c.16.21 2.2 3.36 5.33 4.7 2.6 1.11 3.13.89 3.69.84.56-.05 1.82-.75 2.08-1.48.26-.72.26-1.34.18-1.47-.08-.14-.29-.22-.6-.38-.31-.16-1.82-.9-2.1-1-.28-.1-.49-.15-.7.15-.21.31-.8 1-.98 1.21-.18.21-.36.23-.67.08-.31-.16-1.3-.48-2.48-1.53-.92-.82-1.53-1.83-1.71-2.14-.18-.31-.02-.48.13-.63.14-.14.31-.37.47-.55.15-.19.21-.32.31-.53.1-.21.05-.4-.03-.55-.08-.15-.7-1.68-.96-2.3-.25-.6-.51-.52-.7-.53-.18-.01-.39-.01-.6-.01z"/></svg>
                WhatsApp
              </a>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="aspect-square overflow-hidden rounded-2xl ring-1 ring-black/5">
              <img src="/images/finger-food/02-mini-cheeseburger.jpg" alt="Mini cheeseburger" class="h-full w-full object-cover" loading="lazy" />
            </div>
            <div class="aspect-square overflow-hidden rounded-2xl ring-1 ring-black/5">
              <img src="/images/finger-food/08-hotdog-krepaki.jpg" alt="Hot dog με κρεπάκι" class="h-full w-full object-cover" loading="lazy" />
            </div>
            <div class="aspect-square overflow-hidden rounded-2xl ring-1 ring-black/5">
              <img src="/images/finger-food/10-snitselakia.jpg" alt="Σνιτσελάκια" class="h-full w-full object-cover" loading="lazy" />
            </div>
            <div class="aspect-square overflow-hidden rounded-2xl ring-1 ring-black/5">
              <img src="/images/finger-food/07-keftedakia-tyri.jpg" alt="Κεφτεδάκια με τυρί" class="h-full w-full object-cover" loading="lazy" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
```

- [ ] **Step 2: Verify section renders correctly**

1. `browser_navigate` to finger-food page.
2. `browser_resize` to `1280×800`, `browser_take_screenshot` — expect cream-orange rounded card sitting just below the hero with two-column content.
3. `browser_resize` to `375×812`, `browser_take_screenshot` — expect stacked content, 2×2 photo grid below copy.
4. `browser_console_messages` errors — expect 0.
5. Verify WhatsApp link: `browser_evaluate` `document.querySelector('#paidiko-parti a[aria-label*="WhatsApp"]').getAttribute('href')` → expect `#whatsapp`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/finger-food.astro
git commit -m "Add παιδικό πάρτι featured section with phone and WhatsApp CTAs"
```

---

## Task 4: Tabbed gallery (markup + filter JS)

**Files:**
- Modify: `src/pages/finger-food.astro` (replace the `#gallery` section and add a `<script>` block at the bottom for the filter)

**Goal:** Render category chips + 29 item cards. Chips are sticky under the header. Clicking a chip filters the grid via a small client-side script that toggles `data-hidden` on non-matching items.

- [ ] **Step 1: Replace the `#gallery` section**

Replace the entire `<section id="gallery">…</section>` block with:

```astro
  <section id="gallery" class="bg-[#faf7f2] py-20 px-4 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-6xl">
      <div class="text-center">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Επιλογές</p>
        <h2 class="mt-3 font-heading text-3xl sm:text-4xl font-bold text-gray-900">29 χειροποίητες ιδέες</h2>
        <p class="mt-3 mx-auto max-w-2xl text-[#6b5d47]">
          Επιλέξτε κατηγορία για γρήγορο φιλτράρισμα.
        </p>
      </div>

      <div
        id="category-tabs"
        class="sticky top-[68px] z-20 -mx-4 mt-10 flex gap-2 overflow-x-auto bg-[#faf7f2]/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
        role="tablist"
        aria-label="Κατηγορίες finger food"
      >
        {categories.map((cat, i) => (
          <button
            type="button"
            role="tab"
            aria-pressed={i === 0 ? 'true' : 'false'}
            data-category={cat.id}
            class:list={[
              'whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2',
              i === 0
                ? 'bg-gray-900 text-white shadow-sm'
                : 'bg-white text-[#6b5d47] border border-[#e5dcc9] hover:border-brand-600 hover:text-brand-700',
            ]}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div id="gallery-grid" class="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
        {items.map(({ img, name, category }) => (
          <figure
            data-category={category}
            class="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-900/5 transition hover:-translate-y-0.5 hover:shadow-md data-[hidden=true]:hidden"
          >
            <div class="aspect-square overflow-hidden">
              <img src={img} alt={name} class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
            </div>
            <figcaption class="p-4 text-sm font-medium leading-snug text-gray-900">
              {name}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  </section>
```

- [ ] **Step 2: Add the filter script**

Near the bottom of the file, update/replace the existing `<script>` block (the one that imports GSAP) with this combined version — we keep the GSAP fade for `[data-gsap-fade]` elements and add the filter logic:

```astro
<script>
  import { gsap } from 'gsap';

  gsap.defaults({ ease: 'power3.out' });
  gsap.from('[data-gsap-fade]', {
    y: 30,
    opacity: 0,
    duration: 0.9,
    stagger: 0.15,
    delay: 0.2,
  });

  // Gallery category filter
  const tabs = document.querySelectorAll<HTMLButtonElement>('#category-tabs button[data-category]');
  const cards = document.querySelectorAll<HTMLElement>('#gallery-grid figure[data-category]');

  function applyFilter(category: string) {
    cards.forEach((card) => {
      const match = category === 'all' || card.dataset.category === category;
      card.dataset.hidden = match ? 'false' : 'true';
    });
  }

  tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.category ?? 'all';
      tabs.forEach((t) => {
        const active = t === btn;
        t.setAttribute('aria-pressed', active ? 'true' : 'false');
        t.classList.toggle('bg-gray-900', active);
        t.classList.toggle('text-white', active);
        t.classList.toggle('shadow-sm', active);
        t.classList.toggle('bg-white', !active);
        t.classList.toggle('text-[#6b5d47]', !active);
        t.classList.toggle('border', !active);
        t.classList.toggle('border-[#e5dcc9]', !active);
      });
      applyFilter(cat);
    });
  });
</script>
```

- [ ] **Step 3: Verify filter works across all categories**

1. `browser_navigate` to finger-food page.
2. `browser_resize` to `1280×800`.
3. `browser_take_screenshot` — expect 4-col grid with 29 items, "Όλα (29)" chip dark.
4. For each non-"all" category, use `browser_evaluate` to click the chip and count visible cards:

```js
// Example for 'burgers':
document.querySelector('#category-tabs button[data-category="burgers"]').click();
document.querySelectorAll('#gallery-grid figure:not([data-hidden="true"])').length;
```

Expected counts per category (must match exactly):
- `burgers`: 2
- `kanapedakia`: 6
- `souvlakia`: 5
- `pites`: 2
- `tyria-allantika`: 6
- `kreas`: 4
- `zymes-salates`: 4
- `all`: 29

5. `browser_console_messages` errors — expect 0.
6. `browser_resize` to `375×812`, verify chips are horizontally scrollable and grid becomes 2-col.

- [ ] **Step 4: Commit**

```bash
git add src/pages/finger-food.astro
git commit -m "Add tabbed gallery with client-side category filter across 7 categories"
```

---

## Task 5: Builder guide refinement

**Files:**
- Modify: `src/pages/finger-food.astro` (replace the `#builder` section)

**Goal:** Six small cards with numbered brand-orange circles on a cream-tinted background, sitting in a white section so the page has a rhythm break before the cream gallery → white guide → cream Why Varsos.

- [ ] **Step 1: Replace the `#builder` section**

Replace the entire `<section id="builder">…</section>` block with:

```astro
  <section id="builder" class="bg-white py-20 px-4 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-6xl">
      <div class="text-center">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Οδηγός</p>
        <h2 class="mt-3 font-heading text-3xl sm:text-4xl font-bold text-gray-900">Πώς στήνουμε το finger food σας</h2>
        <p class="mt-3 mx-auto max-w-2xl text-[#6b5d47]">
          Ξεκινάμε με 3-4 βασικά υλικά και χτίζουμε συνδυασμούς — έτσι εξασφαλίζουμε σωστή ποικιλία χωρίς περιττή σπατάλη.
        </p>
      </div>

      <div class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: 'Βάση',                    desc: 'Μπακέτα, crackers ή κριτσίνια.' },
          { label: 'Τυριά',                    desc: 'Επιλογή 1-2 γεύσεων ανά πιατέλα.' },
          { label: 'Spreads & σως',            desc: 'Μαγιονέζα, μουστάρδα, κρέμα τυριού, dips.' },
          { label: 'Πρωτεΐνη',                 desc: 'Αλλαντικά, κοτόπουλο, σολομός ή γαρίδες.' },
          { label: 'Συνοδευτικά',              desc: 'Λαχανικά εποχής & ελιές.' },
          { label: 'Φρούτα (προαιρετικά)',     desc: 'Εποχιακά φρούτα για φρεσκάδα.' },
        ].map((block, i) => (
          <div class="rounded-2xl bg-[#faf7f2] p-6 ring-1 ring-[#ece5d6]" data-gsap-reveal>
            <span class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
              {i + 1}
            </span>
            <h3 class="mt-4 text-lg font-semibold text-gray-900">{block.label}</h3>
            <p class="mt-2 text-sm leading-relaxed text-[#6b5d47]">{block.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
```

*(The `data-gsap-reveal` hook will be wired up in Task 8 for scroll-triggered reveal. Until then it's inert.)*

- [ ] **Step 2: Verify visuals**

1. `browser_navigate` + screenshot at `1280×800` — expect 3-col grid of 6 cream cards with brand-orange numbered circles.
2. `browser_resize` to `375×812` + screenshot — expect single-column stack.
3. `browser_console_messages` errors — expect 0.

- [ ] **Step 3: Commit**

```bash
git add src/pages/finger-food.astro
git commit -m "Refine builder guide with numbered cards on white section"
```

---

## Task 6: Why Varsos + Final CTA band

**Files:**
- Modify: `src/pages/finger-food.astro` (replace `#why` and `#cta` sections)

**Goal:** Three trust cards with emoji icons on cream background, followed by a full-width orange gradient band with phone + WhatsApp buttons.

- [ ] **Step 1: Replace `#why` and `#cta` sections**

Replace both sections with:

```astro
  <section id="why" class="bg-[#faf7f2] py-20 px-4 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-6xl">
      <h2 class="text-center font-heading text-3xl sm:text-4xl font-bold text-gray-900">Γιατί Varsos</h2>
      <div class="mt-12 grid gap-6 sm:grid-cols-3">
        {[
          { icon: '🌿', title: 'Αγνά υλικά',         desc: 'Φρέσκα υλικά χωρίς συντηρητικά. Παρασκευή αυθημερόν.' },
          { icon: '🍽️', title: 'Ποικιλία γεύσεων',   desc: '29 ιδέες — από mini burgers έως παραδοσιακές μπόμπες.' },
          { icon: '⏱️', title: 'Από το 1987',         desc: 'Σχεδόν 40 χρόνια εμπειρίας στην Αθήνα.' },
        ].map(({ icon, title, desc }) => (
          <div class="rounded-2xl bg-white p-8 ring-1 ring-[#ece5d6]" data-gsap-reveal>
            <div class="text-3xl" aria-hidden="true">{icon}</div>
            <h3 class="mt-3 text-lg font-semibold text-gray-900">{title}</h3>
            <p class="mt-2 text-sm leading-relaxed text-[#6b5d47]">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>

  <section id="cta" class="relative overflow-hidden bg-gradient-to-br from-brand-600 to-brand-700 py-20 px-4 sm:px-6 lg:px-8 text-white">
    <div class="pointer-events-none absolute -top-20 -right-20 h-80 w-80 rounded-full bg-white/10" aria-hidden="true"></div>
    <div class="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-black/10" aria-hidden="true"></div>
    <div class="relative mx-auto max-w-xl text-center">
      <h2 class="font-heading text-3xl sm:text-4xl font-bold">Ας στήσουμε το μενού σας</h2>
      <p class="mt-4 text-white/85">Καλέστε μας ή στείλτε WhatsApp — απαντάμε άμεσα.</p>
      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <a
          href={PHONE_HREF}
          aria-label={`Καλέστε Varsos Catering στο ${PHONE_DISPLAY}`}
          class="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-700 shadow-lg transition hover:bg-brand-50"
        >
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M2 3.5A1.5 1.5 0 013.5 2h1.148a1.5 1.5 0 011.465 1.175l.716 3.223a1.5 1.5 0 01-1.052 1.767l-.933.267a11.036 11.036 0 006.72 6.72l.267-.933a1.5 1.5 0 011.767-1.052l3.223.716A1.5 1.5 0 0118 15.352V16.5a1.5 1.5 0 01-1.5 1.5H15c-7.18 0-13-5.82-13-13V3.5z" /></svg>
          {PHONE_DISPLAY}
        </a>
        <a
          href={WHATSAPP_URL}
          aria-label="Επικοινωνία μέσω WhatsApp"
          class="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#1ebe57]"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 004.79 1.23h.004c5.46 0 9.91-4.45 9.91-9.92 0-2.65-1.03-5.14-2.9-7.01A9.825 9.825 0 0012.05 2zm0 1.67c2.2 0 4.27.86 5.82 2.42a8.21 8.21 0 012.42 5.82c0 4.55-3.7 8.25-8.24 8.25a8.21 8.21 0 01-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 01-1.26-4.4c0-4.54 3.7-8.24 8.24-8.24zm-4.42 4.54c-.21 0-.55.08-.84.4-.29.32-1.1 1.08-1.1 2.63s1.13 3.05 1.29 3.26c.16.21 2.2 3.36 5.33 4.7 2.6 1.11 3.13.89 3.69.84.56-.05 1.82-.75 2.08-1.48.26-.72.26-1.34.18-1.47-.08-.14-.29-.22-.6-.38-.31-.16-1.82-.9-2.1-1-.28-.1-.49-.15-.7.15-.21.31-.8 1-.98 1.21-.18.21-.36.23-.67.08-.31-.16-1.3-.48-2.48-1.53-.92-.82-1.53-1.83-1.71-2.14-.18-.31-.02-.48.13-.63.14-.14.31-.37.47-.55.15-.19.21-.32.31-.53.1-.21.05-.4-.03-.55-.08-.15-.7-1.68-.96-2.3-.25-.6-.51-.52-.7-.53-.18-.01-.39-.01-.6-.01z" /></svg>
          WhatsApp
        </a>
      </div>
    </div>
  </section>
```

- [ ] **Step 2: Verify visuals and CTAs**

1. `browser_navigate` + screenshot at `1280×800` — expect 3 white cards on cream, followed by orange gradient band with two buttons centered.
2. `browser_resize` to `375×812` + screenshot — expect cards stack, CTA band full-width with centered buttons.
3. `browser_console_messages` errors — expect 0.

- [ ] **Step 3: Commit**

```bash
git add src/pages/finger-food.astro
git commit -m "Add Why Varsos trust cards and final gradient CTA band"
```

---

## Task 7: Mobile sticky contact FAB

**Files:**
- Create: `src/components/StickyContactFab.astro`
- Modify: `src/pages/finger-food.astro` (import and render the component)

**Goal:** A mobile-only (hidden at `md:` and up) floating stack of phone + WhatsApp buttons in the bottom-right. Visible once the hero has fully scrolled out of view; hidden when the final CTA band enters the viewport.

- [ ] **Step 1: Create `src/components/StickyContactFab.astro`**

```astro
---
interface Props {
  phoneHref: string;
  phoneLabel: string;
  whatsappUrl: string;
  watchOutElementId: string;
  hideOnElementId: string;
}

const { phoneHref, phoneLabel, whatsappUrl, watchOutElementId, hideOnElementId } = Astro.props;
---

<div
  id="sticky-contact-fab"
  data-watch-out={watchOutElementId}
  data-hide-on={hideOnElementId}
  class="pointer-events-none fixed right-4 bottom-4 z-40 flex flex-col gap-3 opacity-0 translate-y-4 transition-all duration-300 md:hidden data-[visible=true]:pointer-events-auto data-[visible=true]:opacity-100 data-[visible=true]:translate-y-0"
>
  <a
    href={whatsappUrl}
    aria-label="Επικοινωνία μέσω WhatsApp"
    class="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-black/20 ring-1 ring-black/10"
  >
    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 004.79 1.23h.004c5.46 0 9.91-4.45 9.91-9.92 0-2.65-1.03-5.14-2.9-7.01A9.825 9.825 0 0012.05 2zm0 1.67c2.2 0 4.27.86 5.82 2.42a8.21 8.21 0 012.42 5.82c0 4.55-3.7 8.25-8.24 8.25a8.21 8.21 0 01-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 01-1.26-4.4c0-4.54 3.7-8.24 8.24-8.24zm-4.42 4.54c-.21 0-.55.08-.84.4-.29.32-1.1 1.08-1.1 2.63s1.13 3.05 1.29 3.26c.16.21 2.2 3.36 5.33 4.7 2.6 1.11 3.13.89 3.69.84.56-.05 1.82-.75 2.08-1.48.26-.72.26-1.34.18-1.47-.08-.14-.29-.22-.6-.38-.31-.16-1.82-.9-2.1-1-.28-.1-.49-.15-.7.15-.21.31-.8 1-.98 1.21-.18.21-.36.23-.67.08-.31-.16-1.3-.48-2.48-1.53-.92-.82-1.53-1.83-1.71-2.14-.18-.31-.02-.48.13-.63.14-.14.31-.37.47-.55.15-.19.21-.32.31-.53.1-.21.05-.4-.03-.55-.08-.15-.7-1.68-.96-2.3-.25-.6-.51-.52-.7-.53-.18-.01-.39-.01-.6-.01z" /></svg>
  </a>
  <a
    href={phoneHref}
    aria-label={phoneLabel}
    class="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-xl shadow-black/20 ring-1 ring-black/10"
  >
    <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M2 3.5A1.5 1.5 0 013.5 2h1.148a1.5 1.5 0 011.465 1.175l.716 3.223a1.5 1.5 0 01-1.052 1.767l-.933.267a11.036 11.036 0 006.72 6.72l.267-.933a1.5 1.5 0 011.767-1.052l3.223.716A1.5 1.5 0 0118 15.352V16.5a1.5 1.5 0 01-1.5 1.5H15c-7.18 0-13-5.82-13-13V3.5z" /></svg>
  </a>
</div>

<script>
  const fab = document.getElementById('sticky-contact-fab');
  if (fab) {
    const watchOutId = fab.dataset.watchOut;
    const hideOnId = fab.dataset.hideOn;
    const watchOutEl = watchOutId ? document.getElementById(watchOutId) : null;
    const hideOnEl = hideOnId ? document.getElementById(hideOnId) : null;

    let heroPassed = false;
    let ctaVisible = false;

    const update = () => {
      fab.dataset.visible = heroPassed && !ctaVisible ? 'true' : 'false';
    };

    if (watchOutEl) {
      new IntersectionObserver(
        ([entry]) => {
          // heroPassed = hero is NOT intersecting (scrolled past)
          heroPassed = !entry.isIntersecting;
          update();
        },
        { threshold: 0 }
      ).observe(watchOutEl);
    } else {
      heroPassed = true;
    }

    if (hideOnEl) {
      new IntersectionObserver(
        ([entry]) => {
          ctaVisible = entry.isIntersecting;
          update();
        },
        { threshold: 0.1 }
      ).observe(hideOnEl);
    }

    update();
  }
</script>
```

- [ ] **Step 2: Import and render the FAB in `finger-food.astro`**

At the top of `src/pages/finger-food.astro`, add the import after the existing imports:

```astro
import StickyContactFab from '../components/StickyContactFab.astro';
```

Then, inside the `<Layout>`, right before `<Footer />`, render:

```astro
  <StickyContactFab
    phoneHref={PHONE_HREF}
    phoneLabel={`Καλέστε Varsos Catering στο ${PHONE_DISPLAY}`}
    whatsappUrl={WHATSAPP_URL}
    watchOutElementId="hero"
    hideOnElementId="cta"
  />
```

- [ ] **Step 3: Verify FAB behavior on mobile**

1. `browser_navigate` + `browser_resize` to `375×812`.
2. `browser_take_screenshot` at the top of the page — FAB should be invisible (hero in view).
3. `browser_evaluate`: `window.scrollTo(0, 900); await new Promise(r => setTimeout(r, 500));` then screenshot — FAB should be visible in bottom-right.
4. `browser_evaluate`: `document.getElementById('cta').scrollIntoView(); await new Promise(r => setTimeout(r, 500));` then screenshot — FAB should be invisible again.
5. `browser_resize` to `1280×800` — FAB must be hidden at all scroll positions.
6. `browser_console_messages` errors — expect 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/StickyContactFab.astro src/pages/finger-food.astro
git commit -m "Add mobile sticky contact FAB with hero/CTA-aware visibility"
```

---

## Task 8: GSAP scroll reveals + reduced-motion + accessibility pass

**Files:**
- Modify: `src/pages/finger-food.astro` (extend the bottom `<script>` block)

**Goal:** Add subtle ScrollTrigger reveal on elements tagged with `data-gsap-reveal` (builder cards, Why Varsos cards). Respect `prefers-reduced-motion` — no GSAP effects at all when enabled. Final accessibility check (tab order, focus rings, alt text).

- [ ] **Step 1: Replace the bottom `<script>` block with the final version**

In `src/pages/finger-food.astro`, replace the existing `<script>` (the one added in Task 4 that contains the filter + initial GSAP fade) with:

```astro
<script>
  import { gsap } from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!prefersReducedMotion) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.defaults({ ease: 'power3.out' });

    gsap.from('[data-gsap-fade]', {
      y: 30,
      opacity: 0,
      duration: 0.9,
      stagger: 0.15,
      delay: 0.2,
    });

    document.querySelectorAll<HTMLElement>('[data-gsap-reveal]').forEach((el) => {
      gsap.from(el, {
        y: 30,
        opacity: 0,
        duration: 0.7,
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      });
    });
  }

  // Gallery category filter (motion-independent)
  const tabs = document.querySelectorAll<HTMLButtonElement>('#category-tabs button[data-category]');
  const cards = document.querySelectorAll<HTMLElement>('#gallery-grid figure[data-category]');

  function applyFilter(category: string) {
    cards.forEach((card) => {
      const match = category === 'all' || card.dataset.category === category;
      card.dataset.hidden = match ? 'false' : 'true';
    });
  }

  tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.category ?? 'all';
      tabs.forEach((t) => {
        const active = t === btn;
        t.setAttribute('aria-pressed', active ? 'true' : 'false');
        t.classList.toggle('bg-gray-900', active);
        t.classList.toggle('text-white', active);
        t.classList.toggle('shadow-sm', active);
        t.classList.toggle('bg-white', !active);
        t.classList.toggle('text-[#6b5d47]', !active);
        t.classList.toggle('border', !active);
        t.classList.toggle('border-[#e5dcc9]', !active);
      });
      applyFilter(cat);
    });
  });
</script>
```

- [ ] **Step 2: Verify reveal + reduced-motion + focus rings**

1. `browser_navigate` + `browser_resize` to `1280×800`.
2. Scroll down slowly (`window.scrollTo(0, 2000)` via `browser_evaluate`), screenshot — builder cards should animate in; Why Varsos cards should animate in.
3. Test reduced motion: `browser_evaluate`:
```js
// Emulate reduced motion via CDP isn't available; instead hard-reload with an evaluation check
window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```
Record whether the machine has reduced motion on. If it's off, the author should manually verify in the OS-level setting later; document this in the commit message.

4. Tab through the page with keyboard: `browser_press_key` "Tab" repeatedly. The focus order should traverse header → hero phone → hero "Δείτε" → παιδικό πάρτι phone → WhatsApp → category chips → item figures (not focusable since they're `<figure>`, good) → builder (no focusables) → why varsos (no focusables) → CTA phone → WhatsApp → sticky FAB (on mobile). `browser_take_screenshot` at each tab stop to confirm visible focus ring on brand-orange interactive elements.

5. `browser_console_messages` errors — expect 0.

6. Run `npm run build` to confirm production build passes with zero errors:

```bash
npm run build
```

Expected: clean build, no TypeScript or Astro errors. Browse `dist/finger-food/index.html` exists.

- [ ] **Step 3: Commit**

```bash
git add src/pages/finger-food.astro
git commit -m "Add scroll-reveal motion with prefers-reduced-motion guard"
```

---

## Final verification checklist

After Task 8, the page should satisfy every success criterion from the spec:

- [ ] `npm run build` succeeds with zero errors.
- [ ] Zero browser console errors at `/finger-food` (desktop 1280×800 and mobile 375×812).
- [ ] All 29 items render; each category filter returns the exact counts listed in Task 4 Step 3.
- [ ] Phone link (`tel:+302118002214`) appears in hero, παιδικό πάρτι box, final CTA band, and mobile FAB.
- [ ] WhatsApp link (currently `#whatsapp`) appears in παιδικό πάρτι box, final CTA band, and mobile FAB. Single `WHATSAPP_URL` constant controls all four locations.
- [ ] Mobile FAB appears after the hero scrolls out and hides when the final CTA band enters viewport.
- [ ] Mobile FAB is hidden at `md:` and above.
- [ ] No visible overflow on any viewport between 320px and 1600px.
- [ ] All interactive elements have visible focus rings (brand-orange 2px offset ring).
- [ ] All images have descriptive `alt` text.
- [ ] Motion is disabled when the OS reports `prefers-reduced-motion: reduce`.

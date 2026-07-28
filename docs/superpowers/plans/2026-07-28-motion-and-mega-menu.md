# Motion Layer + Mega Menus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a choreographed scroll/entrance motion layer and five working desktop mega-menu panels to the EmpowerMS homepage reference build.

**Architecture:** Two independent, dependency-free layers. `css/motion.css` + `js/reveal.js` drive attribute-based reveals (`data-reveal`, `data-reveal-group`, `data-reveal-entrance`) through one shared IntersectionObserver. `css/megamenu.css` + `js/megamenu.js` drive five full-width panels added to `src/sections/00-header.html`. Both gate their hidden/positioned CSS behind an attribute the script itself sets (`[data-reveal="on"]`, `[data-mega="on"]`), so a script that never loads leaves the page fully visible and every link reachable.

**Tech Stack:** Plain HTML/CSS/ES modules. Node ≥18 for `build.mjs` and `node --test test.mjs`. No dependencies, no install step, no framework.

**Spec:** `docs/superpowers/specs/2026-07-28-motion-and-mega-menu-design.md`

## Global Constraints

- **Never edit** `tokens/*.css`, `components/components.css`, or `assets/*`. They are imported verbatim from the design system (README rule). All new CSS goes in `css/`.
- **No new design tokens.** Motion values come from `tokens/motion.css`: `--dur-fast:120ms`, `--dur:200ms`, `--dur-slow:400ms`, `--dur-reveal:600ms`, `--ease-out`, `--ease-in-out`, `--ease-entrance`.
- **No dependencies.** No npm install, no CDN, no library.
- **Progressive enhancement contract** (from the `js/nav.js` header comment): markup ships usable; JS opts in. Never hide content in CSS that only JS can un-hide, unless the gate attribute is set by that same JS.
- **No inline `style` attributes in markup** — `test.mjs` asserts this against `dist/index.html`. Runtime `style.setProperty()` from JS is fine.
- **No runtime markup generation** — no `innerHTML`, no `createElement` in any file in `js/`. `test.mjs` asserts this.
- Build with `node build.mjs`; test with `node --test test.mjs`; view at `http://localhost:8000/dist/index.html` via `python3 -m http.server` (never `file://`).
- Curly apostrophes (`’`) in prose copy, not ASCII — `test.mjs` asserts this on section partials.
- `--em-orange` on white is 3.59:1 and fails AA for normal-size text. No new small orange text.
- Existing test `shell links stylesheets in cascade order` requires this order in `src/index.html`: `tokens/fonts.css` → `tokens/colors.css` → `tokens/base.css` → `components/components.css` → `css/homepage.css` → `css/wireframe.css`. New stylesheets go **between `homepage.css` and `wireframe.css`**.

## File Structure

| File | Status | Responsibility |
| --- | --- | --- |
| `css/motion.css` | create | Reveal start-states, `.is-revealed` settled state, stagger delay, reduced-motion block |
| `js/reveal.js` | create | Sets `[data-reveal="on"]`, stamps `--reveal-i`, one IntersectionObserver, entrance-on-load, sticky-header scroll flag |
| `css/megamenu.css` | create | `.em-mega` panel layout, link columns, feature card, open/closed states, responsive cutover |
| `js/megamenu.js` | create | Sets `[data-mega="on"]`, hover-intent + click + keyboard, one-panel-at-a-time, 960px gate |
| `src/sections/00-header.html` | modify | Add ids + `aria-controls` to the five triggers; add five `.em-mega` panels |
| `src/sections/01..07-*.html` | modify | Add `data-reveal*` attributes only — no structural change |
| `src/index.html` | modify | Link two new stylesheets and two new scripts |
| `css/homepage.css` | modify | Sticky + condensing header rules; `.ctl` becomes non-sticky |
| `test.mjs` | modify | New assertions for both layers |
| `README.md` | modify | Motion section + Mega menu section |

**Note on test style:** the existing suite asserts against the built HTML/CSS as strings — there is no DOM harness and no dependency budget for one. JS behaviour (hover intent, keyboard, observer) is therefore verified in the browser, which each JS task includes as an explicit step. Static structure, ARIA wiring, and CSS presence are covered by `test.mjs`.

---

### Task 1: Reveal engine — CSS + JS, wired into the shell

**Files:**
- Create: `css/motion.css`
- Create: `js/reveal.js`
- Modify: `src/index.html`
- Test: `test.mjs`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: the attribute contract every later markup task uses —
  - `data-reveal="rise" | "fade" | "slide-l" | "slide-r" | "clip"` on any element
  - `data-reveal-group` on an ancestor: each descendant `[data-reveal]` gets `--reveal-i` stamped in document order, delaying it `i * 70ms`
  - `data-reveal-entrance` on an ancestor (or on an element that also has `data-reveal`): reveals on load instead of on scroll
  - `<html data-reveal="on">` set by `js/reveal.js`; `.is-revealed` added per element

- [ ] **Step 1: Write the failing tests**

Append to `test.mjs`:

```js
/* ---------- motion layer ---------- */

const motion = readFileSync('css/motion.css', 'utf8');
const revealJs = readFileSync('js/reveal.js', 'utf8');

test('motion layer ships as its own stylesheet and module', () => {
  assert.ok(existsSync('css/motion.css'), 'missing css/motion.css');
  assert.ok(existsSync('js/reveal.js'), 'missing js/reveal.js');
  assert.match(html, /<link rel="stylesheet" href="\.\.\/css\/motion\.css">/);
  assert.match(html, /<script type="module" src="\.\.\/js\/reveal\.js"><\/script>/);
});

test('every hidden reveal start-state is gated behind [data-reveal="on"]', () => {
  // The gate attribute is set by js/reveal.js itself. Any opacity:0 rule
  // outside it would hide content permanently when the script fails to load.
  for (const rule of motion.split('}')) {
    if (!/opacity:\s*0\b/.test(rule)) continue;
    assert.match(rule, /\[data-reveal="on"\]/,
      `ungated start-state would hide content without JS: ${rule.trim().slice(0, 80)}`);
  }
});

test('reveal script sets its own gate attribute before anything else', () => {
  const gateAt = revealJs.indexOf(`setAttribute('data-reveal', 'on')`);
  assert.ok(gateAt > -1, 'js/reveal.js never sets the [data-reveal="on"] gate');
  const observeAt = revealJs.indexOf('IntersectionObserver');
  assert.ok(observeAt === -1 || gateAt < observeAt, 'gate set after the observer is built');
});

test('motion layer honours prefers-reduced-motion', () => {
  assert.match(motion, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(revealJs, /prefers-reduced-motion:\s*reduce/,
    'reveal.js does not check reduced motion');
});

test('reveal observer uses threshold 0, not a fraction', () => {
  // An element taller than the viewport never reaches a fractional
  // threshold, and would stay hidden forever. The negative bottom
  // rootMargin is what delays the reveal instead.
  assert.match(revealJs, /threshold:\s*0\b/);
  assert.match(revealJs, /rootMargin:\s*'0px 0px -12% 0px'/);
});

test('reveal observer is one-shot', () => {
  assert.match(revealJs, /unobserve/, 'elements are never unobserved; observer leaks work');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test.mjs`
Expected: FAIL — `ENOENT: no such file or directory, open 'css/motion.css'` (the `readFileSync` at module scope throws before any test runs).

- [ ] **Step 3: Create `css/motion.css`**

```css
/* Empower Mississippi homepage — motion layer.
   Scroll reveals and page entrance. Consumes tokens/motion.css only; adds
   no new tokens and edits no upstream file.

   Progressive enhancement contract (same as js/nav.js): every start-state
   below is nested under [data-reveal="on"], which js/reveal.js sets as its
   first statement. If that script never loads, nothing is ever hidden and
   the page renders exactly as it did before this layer existed. */

[data-reveal="on"] [data-reveal]{
  opacity:0;
  transition:opacity var(--dur-reveal) var(--ease-entrance),
             transform var(--dur-reveal) var(--ease-entrance),
             clip-path var(--dur-reveal) var(--ease-entrance);
  transition-delay:calc(var(--reveal-i, 0) * 70ms);
}

[data-reveal="on"] [data-reveal="rise"]{transform:translateY(20px)}
[data-reveal="on"] [data-reveal="slide-l"]{transform:translateX(-24px)}
[data-reveal="on"] [data-reveal="slide-r"]{transform:translateX(24px)}
/* clip-path is applied to the photo variant only — an inset(0) on every
   revealed element would also clip card shadows to the border box. */
[data-reveal="on"] [data-reveal="clip"]{clip-path:inset(0 0 14% 0);transform:scale(1.04)}

[data-reveal="on"] [data-reveal].is-revealed{opacity:1;transform:none}
[data-reveal="on"] [data-reveal="clip"].is-revealed{clip-path:inset(0 0 0 0)}

@media (prefers-reduced-motion: reduce){
  [data-reveal="on"] [data-reveal],
  [data-reveal="on"] [data-reveal].is-revealed{
    opacity:1;transform:none;clip-path:none;
    transition:none;transition-delay:0s;
  }
}
```

- [ ] **Step 4: Create `js/reveal.js`**

```js
// Scroll reveals + page entrance.
//
// Progressive enhancement, same contract as js/nav.js: the markup ships
// fully visible. Every hidden start-state in css/motion.css is nested
// under [data-reveal="on"], which this script sets below — if the script
// never loads, nothing is ever hidden.

const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

root.setAttribute('data-reveal', 'on');

const all = [...document.querySelectorAll('[data-reveal]')];

// Stagger index. Position is counted within the nearest enclosing group,
// not across the page, so a card's delay reflects where it sits in its own
// row. querySelectorAll returns document order, so a plain counter is enough.
const counters = new Map();
for (const el of all) {
  const group = el.closest('[data-reveal-group]');
  if (!group) continue;
  const i = counters.get(group) ?? 0;
  el.style.setProperty('--reveal-i', String(i));
  counters.set(group, i + 1);
}

// Above-the-fold elements animate on load rather than on intersection —
// they are already in view, so an observer would fire them all at once
// with no choreography.
const entrance = new Set();
for (const scope of document.querySelectorAll('[data-reveal-entrance]')) {
  if (scope.hasAttribute('data-reveal')) entrance.add(scope);
  for (const el of scope.querySelectorAll('[data-reveal]')) entrance.add(el);
}

function reveal(el) {
  el.classList.add('is-revealed');
}

if (reduced.matches) {
  for (const el of all) reveal(el);
} else {
  // Two frames: the first lets the start-state paint, the second starts
  // the transition. Revealing in the same frame as the gate attribute
  // would skip the animation entirely.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      for (const el of entrance) reveal(el);
    });
  });

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      reveal(entry.target);
      observer.unobserve(entry.target);
    }
  }, {
    // threshold 0, not a fraction: an element taller than the viewport can
    // never satisfy a fractional threshold and would stay hidden forever.
    // The negative bottom margin supplies the "just before it's in view"
    // timing instead.
    threshold: 0,
    rootMargin: '0px 0px -12% 0px',
  });

  for (const el of all) {
    if (entrance.has(el)) continue;
    observer.observe(el);
  }
}
```

- [ ] **Step 5: Link both files in `src/index.html`**

After the `css/homepage.css` link and before `css/wireframe.css`:

```html
<link rel="stylesheet" href="../css/motion.css">
```

After the `js/nav.js` script tag:

```html
<script type="module" src="../js/reveal.js"></script>
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `node --test test.mjs`
Expected: PASS — all previously existing tests still pass (the cascade-order test tolerates `motion.css` because it sits between `homepage.css` and `wireframe.css`).

- [ ] **Step 7: Verify nothing regressed visually**

Run: `node build.mjs && python3 -m http.server 8000`
Open `http://localhost:8000/dist/index.html`. No element carries `data-reveal` yet, so the page must look **exactly** as before. Confirm the console is clean and `document.documentElement.dataset.reveal === 'on'`.

- [ ] **Step 8: Commit**

```bash
git add css/motion.css js/reveal.js src/index.html test.mjs
git commit -m "feat: add attribute-driven scroll reveal engine"
```

---

### Task 2: Hero + header page entrance

**Files:**
- Modify: `src/sections/01-hero.html`
- Test: `test.mjs`

**Interfaces:**
- Consumes: `data-reveal`, `data-reveal-group`, `data-reveal-entrance` from Task 1.
- Produces: the page's only `data-reveal-entrance` scope. Every later section reveals on scroll.

- [ ] **Step 1: Write the failing tests**

Append to `test.mjs`:

```js
test('hero is the page entrance scope and staggers its own copy', () => {
  const hero = html.match(/<section class="em-hero"[\s\S]*?<\/section>/)[0];
  assert.match(hero, /data-reveal-entrance/, 'hero is not an entrance scope');
  assert.match(hero, /data-reveal-group/, 'hero copy is not staggered');
  assert.match(hero, /<h1 id="hero-title" data-reveal="rise">/);
  assert.match(hero, /class="em-hero__media"[^>]*data-reveal-group/);
  assert.ok(/<img[^>]*data-reveal="clip"/.test(hero), 'hero photo does not use the clip reveal');
});

test('page entrance is scoped to above-the-fold content only', () => {
  const scopes = html.match(/data-reveal-entrance/g) || [];
  assert.equal(scopes.length, 1,
    'more than one entrance scope — everything below the fold should reveal on scroll');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test.mjs`
Expected: FAIL — `hero is not an entrance scope`.

- [ ] **Step 3: Add the attributes**

Replace the whole of `src/sections/01-hero.html` with:

```html
<section class="em-hero" aria-labelledby="hero-title" data-reveal-entrance>
  <div class="em-hero__copy" data-reveal-group>
    <p class="em-annotate">1 · Awareness</p>
    <p class="em-eyebrow" data-reveal="rise">Real people. Real problems. Real solutions.</p>
    <h1 id="hero-title" data-reveal="rise">Your American Dream starts here.</h1>
    <p class="em-hero__lede" data-reveal="rise">You want to build a great life. Raise a family. Find meaningful work. Put down roots in a strong community. We work to expand opportunity so every Mississippian has the chance to achieve the American Dream right here at home.</p>
    <div class="em-hero__actions" data-reveal="rise">
      <a class="em-btn em-btn--primary em-btn--lg" href="/what-we-do">Explore Our Work</a>
      <a class="em-hero__link" href="/join-us">Sign up →</a>
    </div>
  </div>
  <div class="em-hero__media" data-reveal-group>
    <img src="../assets/photography/family-outdoors-park.jpg" alt="A child reading a book at a table in a school library, bookshelves behind" data-reveal="clip">
    <figure class="em-hero__northstar" data-reveal="rise">
      <figcaption class="em-hero__northstar-label">Our north star</figcaption>
      <p>We want every Mississippian to have the opportunity to achieve the American Dream right here at home.</p>
    </figure>
  </div>
</section>
```

Note: `.em-annotate` is deliberately left un-revealed. It is preview-only funnel chrome, hidden unless `data-annotations="on"`, and giving it a stagger index would push every real element one slot later.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test.mjs`
Expected: PASS.

- [ ] **Step 5: Verify the entrance in the browser**

Run: `node build.mjs && python3 -m http.server 8000`
Reload `http://localhost:8000/dist/index.html` and watch the top of the page: eyebrow → h1 → lede → actions arrive 70ms apart; the photo wipes up and settles from a slight scale. Then enable "Reduce motion" in macOS System Settings → Accessibility → Display, hard-reload, and confirm everything is simply present with no movement.

- [ ] **Step 6: Commit**

```bash
git add src/sections/01-hero.html test.mjs
git commit -m "feat: choreograph the hero page entrance"
```

---

### Task 3: Solutions and Foundations scroll reveals

**Files:**
- Modify: `src/sections/02-solutions.html`
- Modify: `src/sections/03-foundations.html`
- Test: `test.mjs`

**Interfaces:**
- Consumes: the Task 1 attribute contract.
- Produces: nothing new.

- [ ] **Step 1: Write the failing tests**

Append to `test.mjs`:

```js
test('process steps cascade as one group', () => {
  const list = html.match(/<ol class="em-process"[^>]*>[\s\S]*?<\/ol>/)[0];
  assert.match(list, /<ol class="em-process" data-reveal-group>/);
  const revealed = list.match(/<li class="em-process__step" data-reveal="rise">/g) || [];
  assert.equal(revealed.length, 5, `expected 5 revealing steps, found ${revealed.length}`);
});

test('both foundations layouts reveal, so the variant switcher never breaks', () => {
  assert.match(html, /<div class="em-bento" data-reveal-group>/);
  assert.match(html, /<div class="em-equal" data-reveal-group>/);
  assert.match(html, /<img class="em-bento__media"[^>]*data-reveal="clip">/,
    'bento feature photo does not use the clip reveal');
  const cards = html.match(/<article class="em-solution"[^>]*data-reveal="rise">/g) || [];
  assert.equal(cards.length, 5, `expected 2 bento + 3 equal cards revealing, found ${cards.length}`);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test.mjs`
Expected: FAIL — `Cannot read properties of null` / `expected 5 revealing steps, found 0`.

- [ ] **Step 3: Edit `src/sections/02-solutions.html`**

Three edits, no structural change:

1. Open the head block as a group and reveal its two halves:

```html
    <div class="em-solutions__head" data-reveal-group>
      <div data-reveal="rise">
```
and
```html
      <p class="em-lead" data-reveal="rise">Every family, worker, and community faces unique challenges, but lasting progress begins with practical solutions. We listen to the people affected, research what works, and partner with communities and leaders to create more opportunity across Mississippi.</p>
```

2. Reveal the section label:

```html
    <p class="em-solutions__label" data-reveal="rise">Empower solutions model</p>
```

3. Make the chevron a group and reveal each step. Change the list open tag to:

```html
    <ol class="em-process" data-reveal-group>
```
and every one of the five step open tags from `<li class="em-process__step">` to:

```html
      <li class="em-process__step" data-reveal="rise">
```

The steps' inner `__bg` / `__scrim` / `__inner` markup is untouched — the whole panel arrives as one unit, left to right, at 70ms intervals.

- [ ] **Step 4: Edit `src/sections/03-foundations.html`**

1. Head block, same shape as Solutions:

```html
    <div class="em-foundations__head" data-reveal-group>
      <div data-reveal="rise">
```
```html
      <p class="em-lead" data-reveal="rise">The American Dream is built on opportunity, but it isn’t always within reach. That’s why we turn research into action, partnering with communities and leaders to advance practical solutions that help more Mississippians succeed.</p>
```

2. Bento layout — group the wrapper, reveal each card and the feature photo:

```html
    <div class="em-bento" data-reveal-group>
      <div class="em-bento__col">
        <article class="em-solution" data-reveal="rise">
```
(second `<article class="em-solution">` in that column gets `data-reveal="rise"` too), then:

```html
      <article class="em-solution em-bento__tall" data-reveal="rise">
```
and its photo:

```html
        <img class="em-bento__media" src="../assets/photography/grandparents-grandchild.jpg" alt="Two adults and a child smiling together outdoors in a park" data-reveal="clip">
```

3. Equal layout — group the wrapper and reveal all three cards:

```html
    <div class="em-equal" data-reveal-group>
      <article class="em-solution" data-reveal="rise">
```
for each of the three articles.

Both variants are wired because `data-foundations` switches which one is displayed; the hidden one must not be left un-animated for whoever flips the switch.

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test test.mjs`
Expected: PASS.

- [ ] **Step 6: Verify in the browser**

Run: `node build.mjs && python3 -m http.server 8000`
Scroll to Solutions: the five chevron panels arrive left to right, not all at once. Scroll to Foundations: cards cascade, the tall card's photo wipes in. Switch the Foundations control to "Three equal" and scroll back up and down — the equal layout cascades too.

- [ ] **Step 7: Commit**

```bash
git add src/sections/02-solutions.html src/sections/03-foundations.html test.mjs
git commit -m "feat: reveal the solutions chevron and both foundations layouts"
```

---

### Task 4: Stories, Insights, Join us, Footer scroll reveals

**Files:**
- Modify: `src/sections/04-stories.html`
- Modify: `src/sections/05-insights.html`
- Modify: `src/sections/06-joinus.html`
- Modify: `src/sections/07-footer.html`
- Test: `test.mjs`

**Interfaces:**
- Consumes: the Task 1 attribute contract.
- Produces: completes reveal coverage; Task 9's docs describe the finished set.

- [ ] **Step 1: Write the failing tests**

Append to `test.mjs`:

```js
test('both stories layouts reveal, so the variant switcher never breaks', () => {
  assert.match(html, /<div class="em-stories__feature" data-reveal-group>/);
  assert.match(html, /<div class="em-stories__carousel" data-reveal-group>/);
  assert.match(html, /<article class="em-stories__lead-card" data-reveal="slide-l">/);
});

test('insights rows cascade as one group', () => {
  assert.match(html, /<div class="em-insights__rows" data-reveal-group>/);
  const revealed = html.match(/<article class="em-insights__row" data-reveal="rise">/g) || [];
  assert.equal(revealed.length, 3, `expected 3 revealing rows, found ${revealed.length}`);
});

test('join us and footer participate in the reveal layer', () => {
  assert.match(html, /<div class="em-join" data-reveal-group>/);
  assert.match(html, /<div class="em-footer__top" data-reveal-group>/);
});

test('every data-reveal value is one of the five documented variants', () => {
  const allowed = new Set(['rise', 'fade', 'slide-l', 'slide-r', 'clip']);
  for (const m of html.matchAll(/data-reveal="([^"]*)"/g)) {
    assert.ok(allowed.has(m[1]), `undocumented reveal variant: ${m[1]}`);
  }
});

test('every reveal group actually contains something to reveal', () => {
  // A group with no revealing descendants is dead markup — usually a
  // sign the attributes were added to the wrong element.
  for (const m of html.matchAll(/<(\w+)([^>]*\sdata-reveal-group[^>]*)>/g)) {
    const from = m.index + m[0].length;
    const window = html.slice(from, from + 3000);
    assert.match(window, /data-reveal="/,
      `data-reveal-group with no revealing children near: ${m[0].slice(0, 70)}`);
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test.mjs`
Expected: FAIL — `The input did not match the regular expression /<div class="em-stories__feature" data-reveal-group>/`.

- [ ] **Step 3: Edit `src/sections/04-stories.html`**

1. Head:

```html
    <div class="em-stories__head" data-reveal-group>
      <div data-reveal="rise">
```
and the CTA:
```html
      <a class="em-btn em-btn--inverse-outline em-btn--md" href="/community-stories" data-reveal="rise">Read Community Stories</a>
```

2. Feature layout — lead card slides in from the left, the two minis cascade after it:

```html
    <div class="em-stories__feature" data-reveal-group>
      <article class="em-stories__lead-card" data-reveal="slide-l">
```
and each of the two `<article class="em-stories__mini">` becomes:
```html
        <article class="em-stories__mini" data-reveal="rise">
```

3. Carousel layout:

```html
    <div class="em-stories__carousel" data-reveal-group>
```
and:
```html
      <article class="em-stories__slide" data-reveal="rise">
```

- [ ] **Step 4: Edit `src/sections/05-insights.html`**

1. Aside becomes a group; reveal its parts:

```html
    <div class="em-insights__aside" data-reveal-group>
```
with `data-reveal="rise"` added to `<p class="em-eyebrow">`, `<h2 id="insights-title">`, `<p class="em-insights__lede">`, the `See all` link, and the podcast card:

```html
      <p class="em-eyebrow" data-reveal="rise">Insights</p>
      <h2 id="insights-title" data-reveal="rise">Latest insights and research</h2>
```
```html
      <p class="em-insights__lede" data-reveal="rise">Stay connected with the latest research, conversations, and stories driving opportunity across Mississippi.</p>
      <a class="em-btn em-btn--outline em-btn--sm" href="/all-content" data-reveal="rise">See all</a>

      <a class="em-podcast em-insights__podcast" href="/podcast" data-reveal="rise">
```

2. Rows:

```html
    <div class="em-insights__rows" data-reveal-group>
      <article class="em-insights__row" data-reveal="rise">
```
for all three rows.

- [ ] **Step 5: Edit `src/sections/06-joinus.html`**

1. Head:

```html
    <div class="em-join__head" data-reveal-group>
      <div data-reveal="rise">
```
```html
      <p class="em-lead" data-reveal="rise">Stay connected, bring the conversation to your community, or support the work directly.</p>
```

2. Panels:

```html
    <div class="em-join" data-reveal-group>
      <div class="em-join__panel" data-reveal="rise">
```
and each of the two cards:
```html
        <article class="em-card em-card--pad-md em-join__card" data-reveal="rise">
```

- [ ] **Step 6: Edit `src/sections/07-footer.html`**

Group the top row and reveal its three columns. The first column is a bare `<div>`; give each of the three the attribute:

```html
    <div class="em-footer__top" data-reveal-group>
      <div data-reveal="fade">
```
```html
      <div data-reveal="fade">
        <h4>Follow</h4>
```
```html
      <div data-reveal="fade">
        <h4>More</h4>
```

`fade`, not `rise`: the footer is the last thing on the page and a translate here fights the scroll rather than accenting it.

- [ ] **Step 7: Run tests to verify they pass**

Run: `node --test test.mjs`
Expected: PASS.

- [ ] **Step 8: Verify in the browser**

Run: `node build.mjs && python3 -m http.server 8000`
Scroll the whole page top to bottom. Every section animates once and stays put on scroll-up. Flip the Stories control to "Carousel" and scroll past it again. Nothing should ever be permanently invisible — if something is, it entered the viewport without triggering the observer, and the fix is the reveal attribute placement, not a threshold change.

- [ ] **Step 9: Commit**

```bash
git add src/sections/04-stories.html src/sections/05-insights.html src/sections/06-joinus.html src/sections/07-footer.html test.mjs
git commit -m "feat: reveal stories, insights, join us and footer on scroll"
```

---

### Task 5: Sticky, condensing header

**Files:**
- Modify: `css/homepage.css`
- Modify: `js/reveal.js`
- Test: `test.mjs`

**Interfaces:**
- Consumes: `root` and the module structure from Task 1.
- Produces: `<html data-scrolled>` past 80px of scroll — Task 7's panel styles ride along with the sticky header but do not depend on this attribute.

- [ ] **Step 1: Write the failing tests**

Append to `test.mjs`:

```js
test('header sticks and condenses on scroll', () => {
  assert.match(homepage, /\.em-header\{[^}]*position:sticky/);
  assert.match(homepage, /\[data-scrolled\][^{]*\.em-header__bar\{[^}]*min-height/);
});

test('preview bar gives up sticky so it cannot cover the sticky header', () => {
  // .ctl used to be position:sticky;top:0;z-index:100. A sticky header at
  // top:0 would sit underneath it. .ctl is preview-only chrome and never
  // ships, so it scrolls away instead.
  const rule = homepage.slice(homepage.indexOf('.ctl{'), homepage.indexOf('}', homepage.indexOf('.ctl{')));
  assert.ok(!/position:sticky/.test(rule), '.ctl is still sticky and will cover the header');
});

test('scroll flag is passive and frame-guarded', () => {
  assert.match(revealJs, /addEventListener\('scroll'[\s\S]{0,160}passive:\s*true/,
    'scroll listener is not passive');
  assert.match(revealJs, /data-scrolled/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test.mjs`
Expected: FAIL — `header sticks and condenses on scroll`.

- [ ] **Step 3: Make the preview bar non-sticky**

In `css/homepage.css`, change the `.ctl` rule's first declaration from `position:sticky;top:0;z-index:100;` to:

```css
/* Not sticky: the header below is, and this preview-only bar (z-index 100)
   would otherwise sit on top of it at the same offset. It never ships. */
.ctl{position:relative;z-index:100;display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-5);
```

- [ ] **Step 4: Add the sticky header rules**

In `css/homepage.css`, immediately before the `/* ---------- Header search ---------- */` comment:

```css
/* ---------- Sticky, condensing header ---------- */
/* components.css sets .em-header{position:relative;z-index:40}; only the
   positioning is overridden here so the upstream file stays untouched.
   js/reveal.js sets [data-scrolled] on <html> past 80px. */
.em-header{position:sticky;top:0;transition:box-shadow var(--dur) var(--ease-out)}
.em-header__bar{transition:min-height var(--dur) var(--ease-out)}
[data-scrolled] .em-header{box-shadow:var(--shadow-md)}
[data-scrolled] .em-header__bar{min-height:68px}
```

- [ ] **Step 5: Add the scroll flag to `js/reveal.js`**

Append to the end of the file:

```js
// Sticky header state. Passive listener plus a frame guard: at most one
// attribute flip per frame, and no layout reads inside the handler.
const SCROLL_AT = 80;
let ticking = false;

function syncScrolled() {
  ticking = false;
  root.toggleAttribute('data-scrolled', window.scrollY > SCROLL_AT);
}

window.addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(syncScrolled);
}, { passive: true });

syncScrolled();
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `node --test test.mjs`
Expected: PASS.

- [ ] **Step 7: Verify in the browser**

Run: `node build.mjs && python3 -m http.server 8000`
Scroll down: the header stays at the top, its bar tightens from 92px to 68px, and a soft shadow appears. Scroll back to the very top: it expands again and the shadow goes. The preview control bar scrolls away and does not overlap the header. Check at 375px width too — the header still sticks and the mobile menu still opens beneath it.

- [ ] **Step 8: Commit**

```bash
git add css/homepage.css js/reveal.js test.mjs
git commit -m "feat: make the header sticky and condense it on scroll"
```

---

### Task 6: Mega menu markup

**Files:**
- Modify: `src/sections/00-header.html`
- Test: `test.mjs`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: five panels with ids `mega-about`, `mega-solutions`, `mega-content`, `mega-podcast`, `mega-join`; five triggers with ids `mega-trigger-about`, `mega-trigger-solutions`, `mega-trigger-content`, `mega-trigger-podcast`, `mega-trigger-join`, each carrying `aria-controls` pointing at its panel. Task 7 styles `.em-mega*`; Task 8 wires `[aria-controls]` on `.em-header__item`.

- [ ] **Step 1: Write the failing tests**

Append to `test.mjs`:

```js
/* ---------- desktop mega menus ---------- */

const MEGA = [
  ['About', 'mega-about'],
  ['Solutions', 'mega-solutions'],
  ['All Content', 'mega-content'],
  ['Podcast', 'mega-podcast'],
  ['Join Us', 'mega-join'],
];

test('every desktop nav trigger controls a real panel', () => {
  for (const [label, id] of MEGA) {
    const trigger = html.match(new RegExp(`<button class="em-header__link"[^>]*>${label} `));
    assert.ok(trigger, `no trigger button for ${label}`);
    assert.match(html, new RegExp(`aria-controls="${id}"`), `${label} does not control ${id}`);
    assert.match(html, new RegExp(`<div class="em-mega" id="${id}"`), `no panel markup for ${id}`);
  }
});

test('every mega panel is labelled by its own trigger', () => {
  for (const [, id] of MEGA) {
    const panel = html.match(new RegExp(`<div class="em-mega" id="${id}"[^>]*>`))[0];
    const labelled = panel.match(/aria-labelledby="([^"]+)"/);
    assert.ok(labelled, `${id} has no aria-labelledby`);
    assert.match(html, new RegExp(`id="${labelled[1]}"[^>]*aria-controls="${id}"`),
      `${id} is labelled by something that is not its trigger`);
  }
});

test('every mega link is a real link with a destination', () => {
  const links = html.match(/<a class="em-mega__link"[^>]*>/g) || [];
  assert.ok(links.length >= 15, `expected the full sitemap, found ${links.length} mega links`);
  for (const a of links) {
    assert.match(a, /href="\/[^"]*"/, `mega link without a destination: ${a}`);
  }
});

test('desktop mega menus and the mobile nav stay in sync', () => {
  // One sitemap, two renderings. If someone adds a link to one nav and
  // not the other, the two navs disagree about what the site contains.
  const panel = html.match(/<nav class="em-mobilenav"[\s\S]*?<\/nav>/)[0];
  const mobile = [...panel.matchAll(/<a class="em-mobilenav__sublink" href="([^"]+)">([^<]+)<\/a>/g)]
    .map(m => `${m[2]}|${m[1]}`).sort();
  const desktop = [...html.matchAll(
    /<a class="em-mega__link" href="([^"]+)">\s*<span class="em-mega__link-label">([^<]+)<\/span>/g)]
    .map(m => `${m[2]}|${m[1]}`).sort();
  assert.deepEqual(desktop, mobile, 'desktop mega links and mobile nav links have drifted');
});

test('mega panels ship in the partial, not injected at runtime', () => {
  const partial = readFileSync('src/sections/00-header.html', 'utf8');
  assert.match(partial, /<div class="em-mega" id="mega-about"/);
  for (const f of readdirSync('js')) {
    const js = readFileSync(`js/${f}`, 'utf8');
    assert.ok(!js.includes('innerHTML') && !js.includes('createElement'),
      `js/${f} builds markup at runtime instead of progressively enhancing static markup`);
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test.mjs`
Expected: FAIL — `About does not control mega-about`.

- [ ] **Step 3: Give the five triggers ids and `aria-controls`**

In `src/sections/00-header.html`, replace the five `<button>` lines inside `.em-header__nav` with:

```html
        <div class="em-header__item"><button class="em-header__link" type="button" id="mega-trigger-about" aria-controls="mega-about" aria-expanded="false">About <span class="em-header__caret" aria-hidden="true"></span></button></div>
        <div class="em-header__item"><button class="em-header__link" type="button" id="mega-trigger-solutions" aria-controls="mega-solutions" aria-expanded="false">Solutions <span class="em-header__caret" aria-hidden="true"></span></button></div>
        <div class="em-header__item"><button class="em-header__link" type="button" id="mega-trigger-content" aria-controls="mega-content" aria-expanded="false">All Content <span class="em-header__caret" aria-hidden="true"></span></button></div>
        <div class="em-header__item"><button class="em-header__link" type="button" id="mega-trigger-podcast" aria-controls="mega-podcast" aria-expanded="false">Podcast <span class="em-header__caret" aria-hidden="true"></span></button></div>
        <div class="em-header__item"><button class="em-header__link" type="button" id="mega-trigger-join" aria-controls="mega-join" aria-expanded="false">Join Us <span class="em-header__caret" aria-hidden="true"></span></button></div>
```

- [ ] **Step 4: Add the five panels**

Insert directly after the closing `</div>` of `.em-header__bar` and its `.em-container`, i.e. between `</div>` (container close) and `<nav class="em-mobilenav" ...>`:

```html
  <div class="em-mega" id="mega-about" aria-labelledby="mega-trigger-about">
    <div class="em-container">
      <div class="em-mega__inner">
        <div class="em-mega__links">
          <div class="em-mega__col">
            <p class="em-mega__group-title">Empower Mississippi</p>
            <a class="em-mega__link" href="/">
              <span class="em-mega__link-label">Who We Are</span>
              <span class="em-mega__link-desc">Our mission, our team, and the people we work for.</span>
            </a>
            <a class="em-mega__link" href="/solutions">
              <span class="em-mega__link-label">What We Do</span>
              <span class="em-mega__link-desc">How research becomes policy that reaches Mississippi families.</span>
            </a>
          </div>
        </div>
        <a class="em-mega__feature" href="/solutions">
          <img class="em-mega__feature-media" src="../assets/photography/grandparents-grandchild.jpg" alt="">
          <span class="em-mega__feature-eyebrow">Our north star</span>
          <span class="em-mega__feature-title">Every Mississippian deserves the chance to build their life here at home.</span>
          <span class="em-mega__feature-meta">Read our approach →</span>
        </a>
      </div>
    </div>
  </div>

  <div class="em-mega" id="mega-solutions" aria-labelledby="mega-trigger-solutions">
    <div class="em-container">
      <div class="em-mega__inner">
        <div class="em-mega__links">
          <div class="em-mega__col">
            <p class="em-mega__group-title">Start here</p>
            <a class="em-mega__link" href="/solutions">
              <span class="em-mega__link-label">Solutions Center</span>
              <span class="em-mega__link-desc">Every issue we work on, in one place.</span>
            </a>
            <a class="em-mega__link" href="/latest">
              <span class="em-mega__link-label">Research (EPIC)</span>
              <span class="em-mega__link-desc">The evidence behind each solution we advance.</span>
            </a>
          </div>
          <div class="em-mega__col">
            <p class="em-mega__group-title">Three foundations</p>
            <a class="em-mega__link" href="/education">
              <span class="em-mega__link-label">Quality Education</span>
              <span class="em-mega__link-desc">Expanding what is possible for every child.</span>
            </a>
            <a class="em-mega__link" href="/solutions">
              <span class="em-mega__link-label">Meaningful Work</span>
              <span class="em-mega__link-desc">Connecting Mississippians to careers worth staying for.</span>
            </a>
            <a class="em-mega__link" href="/solutions">
              <span class="em-mega__link-label">Public Safety</span>
              <span class="em-mega__link-desc">Safer neighbourhoods where opportunity can take hold.</span>
            </a>
          </div>
        </div>
        <a class="em-mega__feature" href="/latest">
          <img class="em-mega__feature-media" src="../assets/photography/classroom-students.jpg" alt="">
          <span class="em-mega__feature-eyebrow">Latest research</span>
          <span class="em-mega__feature-title">Research title — auto-populated from EPIC</span>
          <span class="em-mega__feature-meta">6 min read →</span>
        </a>
      </div>
    </div>
  </div>

  <div class="em-mega" id="mega-content" aria-labelledby="mega-trigger-content">
    <div class="em-container">
      <div class="em-mega__inner">
        <div class="em-mega__links">
          <div class="em-mega__col">
            <p class="em-mega__group-title">Read</p>
            <a class="em-mega__link" href="/latest">
              <span class="em-mega__link-label">Articles</span>
              <span class="em-mega__link-desc">Analysis and commentary from the Empower team.</span>
            </a>
            <a class="em-mega__link" href="/latest">
              <span class="em-mega__link-label">Community Stories</span>
              <span class="em-mega__link-desc">Mississippians describing the barriers they face, in their own words.</span>
            </a>
          </div>
          <div class="em-mega__col">
            <p class="em-mega__group-title">Newsroom</p>
            <a class="em-mega__link" href="/latest">
              <span class="em-mega__link-label">Press Releases</span>
              <span class="em-mega__link-desc">Announcements and statements from Empower Mississippi.</span>
            </a>
            <a class="em-mega__link" href="/latest">
              <span class="em-mega__link-label">Research</span>
              <span class="em-mega__link-desc">Full reports, briefs, and data.</span>
            </a>
          </div>
        </div>
        <a class="em-mega__feature" href="/latest">
          <img class="em-mega__feature-media" src="../assets/photography/child-classroom-tablet.jpg" alt="">
          <span class="em-mega__feature-eyebrow">Latest article</span>
          <span class="em-mega__feature-title">Article headline — auto-populated from the blog</span>
          <span class="em-mega__feature-meta">4 min read →</span>
        </a>
      </div>
    </div>
  </div>

  <div class="em-mega" id="mega-podcast" aria-labelledby="mega-trigger-podcast">
    <div class="em-container">
      <div class="em-mega__inner">
        <div class="em-mega__links">
          <div class="em-mega__col">
            <p class="em-mega__group-title">Shows</p>
            <a class="em-mega__link" href="/latest">
              <span class="em-mega__link-label">The Empower Podcast</span>
              <span class="em-mega__link-desc">The ideas, people, and policy shaping opportunity in Mississippi.</span>
            </a>
            <a class="em-mega__link" href="/latest">
              <span class="em-mega__link-label">Capitol Chat</span>
              <span class="em-mega__link-desc">What moved at the Capitol this week, and what it means.</span>
            </a>
          </div>
        </div>
        <a class="em-mega__feature" href="/latest">
          <img class="em-mega__feature-media" src="../assets/photography/video-still-man-outdoors.jpg" alt="">
          <span class="em-mega__feature-eyebrow">Newest episode</span>
          <span class="em-mega__feature-title">Episode title — auto-populated from the podcast feed</span>
          <span class="em-mega__feature-meta">Listen now →</span>
        </a>
      </div>
    </div>
  </div>

  <div class="em-mega" id="mega-join" aria-labelledby="mega-trigger-join">
    <div class="em-container">
      <div class="em-mega__inner">
        <div class="em-mega__links">
          <div class="em-mega__col">
            <p class="em-mega__group-title">Get involved</p>
            <a class="em-mega__link" href="/join">
              <span class="em-mega__link-label">Newsletter</span>
              <span class="em-mega__link-desc">Stories, research, and updates, straight to your inbox.</span>
            </a>
            <a class="em-mega__link" href="/join">
              <span class="em-mega__link-label">Ambassador Program</span>
              <span class="em-mega__link-desc">Bring the conversation about opportunity to your community.</span>
            </a>
          </div>
        </div>
        <a class="em-mega__feature" href="/donate">
          <img class="em-mega__feature-media" src="../assets/photography/father-children-field.jpg" alt="">
          <span class="em-mega__feature-eyebrow">Support the work</span>
          <span class="em-mega__feature-title">Your support advances practical solutions across Mississippi.</span>
          <span class="em-mega__feature-meta">Donate →</span>
        </a>
      </div>
    </div>
  </div>
```

Two content rules held here:

- **Link labels and hrefs are copied exactly from `.em-mobilenav__sublink`.** The sync test above compares the two sets; if they differ the build fails.
- **Feature images use `alt=""`.** They are decorative next to a titled link, and the repo has an open todo recording that the stand-in photo filenames do not describe their contents — inventing alt text here would create wrong alt text to clean up later.

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test test.mjs`
Expected: PASS. The pre-existing `every aria-controls in the built page points at an id that exists` test now also covers the five new triggers.

- [ ] **Step 6: Check the un-styled fallback**

Run: `node build.mjs && python3 -m http.server 8000`
The panels have no CSS yet, so they render as five stacked link lists under the header. That is exactly the no-JS/no-CSS fallback — confirm every link is present and clickable before moving on.

- [ ] **Step 7: Commit**

```bash
git add src/sections/00-header.html test.mjs
git commit -m "feat: add the five desktop mega menu panels"
```

---

### Task 7: Mega menu styling

**Files:**
- Create: `css/megamenu.css`
- Modify: `src/index.html`
- Test: `test.mjs`

**Interfaces:**
- Consumes: the class names from Task 6, and Task 5's `.em-header{position:sticky}` — the panel is `position:absolute; top:100%` against the header, so the header must already be a positioned ancestor. Do not run this task before Task 5.
- Produces: `[data-mega="on"]` as the gate Task 8's script must set, and `.is-open` as the class it toggles on a panel.

- [ ] **Step 1: Write the failing tests**

Append to `test.mjs`:

```js
const mega = readFileSync('css/megamenu.css', 'utf8');

test('mega menu stylesheet is linked in cascade order', () => {
  assert.match(html, /<link rel="stylesheet" href="\.\.\/css\/megamenu\.css">/);
  assert.ok(html.indexOf('css/homepage.css') < html.indexOf('css/megamenu.css'));
  assert.ok(html.indexOf('css/megamenu.css') < html.indexOf('css/wireframe.css'));
});

test('mega panels are only hidden once JS has claimed them', () => {
  // Same contract as the reveal layer: no rule may hide a panel unless it
  // is nested under the [data-mega="on"] gate that js/megamenu.js sets.
  for (const rule of mega.split('}')) {
    if (!/\bdisplay:\s*none|\bvisibility:\s*hidden/.test(rule)) continue;
    assert.match(rule, /\[data-mega="on"\]|@media/,
      `ungated hide rule would lose links without JS: ${rule.trim().slice(0, 80)}`);
  }
});

test('mega panels are suppressed below the mobile nav breakpoint', () => {
  const at = mega.indexOf('max-width:960px');
  assert.ok(at > -1, 'no 960px rule — panels would overlap the mobile nav');
  assert.match(mega.slice(at), /\.em-mega\{[^}]*display:none/);
});

test('mega menu motion is disabled under reduced motion', () => {
  assert.match(mega, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test.mjs`
Expected: FAIL — `ENOENT: no such file or directory, open 'css/megamenu.css'`.

- [ ] **Step 3: Create `css/megamenu.css`**

```css
/* Empower Mississippi homepage — desktop mega menus.

   Progressive enhancement contract, same as css/motion.css: the five
   panels ship in normal flow in src/sections/00-header.html. Only once
   js/megamenu.js sets [data-mega="on"] do they become positioned overlays
   that start closed. No JS → five plain stacked link lists under the
   header bar, every link reachable.

   Open state on the trigger reuses .em-header__item--open, which
   components/components.css already styles. */

.em-mega{border-top:1px solid var(--border-subtle);background:var(--surface-page)}
.em-mega__inner{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,.6fr);
  gap:var(--space-10);padding:var(--space-8) 0 var(--space-9)}
.em-mega__links{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));
  gap:var(--space-7) var(--space-8);align-content:start}

.em-mega__group-title{margin:0 0 var(--space-3);font-family:var(--font-display);
  font-size:var(--fs-eyebrow);font-weight:var(--fw-semibold);
  letter-spacing:var(--ls-eyebrow);text-transform:uppercase;color:var(--text-muted)}

.em-mega__link{display:block;padding:var(--space-2) 0;text-decoration:none;
  border-radius:var(--radius-sm)}
.em-mega__link-label{display:block;font-family:var(--font-display);
  font-weight:var(--fw-semibold);font-size:var(--fs-small);color:var(--em-blue)}
.em-mega__link-desc{display:block;margin-top:3px;font-size:var(--fs-caption);
  line-height:var(--lh-snug);color:var(--text-muted);max-width:34ch}
.em-mega__link:hover .em-mega__link-label{color:var(--blue-800)}
.em-mega__link:hover .em-mega__link-desc{color:var(--text-body)}

/* Feature card. Body/muted text throughout — --em-orange on white is
   3.59:1 and fails AA at these sizes (see the repo's open a11y todo). */
.em-mega__feature{display:block;padding:var(--space-5);border-radius:var(--radius-card);
  background:var(--blue-100);text-decoration:none}
.em-mega__feature:hover{background:var(--blue-200)}
.em-mega__feature-media{display:block;width:100%;height:132px;object-fit:cover;
  border-radius:var(--radius-media);margin-bottom:var(--space-4)}
.em-mega__feature-eyebrow{display:block;margin-bottom:var(--space-2);
  font-family:var(--font-display);font-size:var(--fs-eyebrow);font-weight:var(--fw-semibold);
  letter-spacing:var(--ls-eyebrow);text-transform:uppercase;color:var(--text-muted)}
.em-mega__feature-title{display:block;font-family:var(--font-display);
  font-size:var(--fs-h5);font-weight:var(--fw-semibold);line-height:var(--lh-heading);
  color:var(--em-blue)}
.em-mega__feature-meta{display:block;margin-top:var(--space-3);
  font-size:var(--fs-caption);font-weight:var(--fw-semibold);color:var(--text-link)}

/* ---------- Enhanced state ---------- */
/* Absolute, not fixed: the panel is anchored to the sticky header and
   travels with it. width:100% of .em-header spans the viewport, so the
   panel reads full-bleed while its content stays inside .em-container. */
[data-mega="on"] .em-mega{position:absolute;left:0;right:0;top:100%;z-index:39;
  box-shadow:var(--shadow-md);
  opacity:0;transform:translateY(-8px);
  transition:opacity var(--dur) var(--ease-out),transform var(--dur) var(--ease-out)}
[data-mega="on"] .em-mega[hidden]{display:none}
[data-mega="on"] .em-mega.is-open{opacity:1;transform:none}

[data-mega="on"] .em-mega .em-mega__link,
[data-mega="on"] .em-mega .em-mega__feature{
  opacity:0;transform:translateY(6px);
  transition:opacity var(--dur) var(--ease-out),transform var(--dur) var(--ease-out)}
[data-mega="on"] .em-mega.is-open .em-mega__link,
[data-mega="on"] .em-mega.is-open .em-mega__feature{opacity:1;transform:none}
[data-mega="on"] .em-mega.is-open .em-mega__link{transition-delay:calc(var(--reveal-i, 0) * 30ms)}

/* Below the desktop breakpoint the mobile nav owns navigation entirely.
   Unconditional — this must hold whether or not the script loaded. */
@media (max-width:960px){
  .em-mega{display:none}
}

@media (prefers-reduced-motion: reduce){
  [data-mega="on"] .em-mega,
  [data-mega="on"] .em-mega.is-open,
  [data-mega="on"] .em-mega .em-mega__link,
  [data-mega="on"] .em-mega .em-mega__feature{
    opacity:1;transform:none;transition:none;transition-delay:0s;
  }
}
```

Note the panel-column grid collapses to one column automatically for the two-link panels because `.em-mega__links` only ever holds the columns that exist in the markup.

- [ ] **Step 4: Link it in `src/index.html`**

Immediately after the `css/motion.css` link:

```html
<link rel="stylesheet" href="../css/megamenu.css">
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test test.mjs`
Expected: PASS.

- [ ] **Step 6: Verify the un-enhanced state in the browser**

Run: `node build.mjs && python3 -m http.server 8000`
No script sets `[data-mega="on"]` yet, so the panels are still stacked in normal flow — but now styled. Confirm the link columns and feature cards look right; this is the layout you will see in a fraction of a second before Task 8's script claims them, and the layout an Elementor dev sees if they paste the CSS without the JS. Then run `document.documentElement.setAttribute('data-mega','on')` in the console: all five panels should stack invisibly over the page top — expected, since none is `hidden` yet. Reload to clear.

- [ ] **Step 7: Commit**

```bash
git add css/megamenu.css src/index.html test.mjs
git commit -m "feat: style the desktop mega menu panels"
```

---

### Task 8: Mega menu behaviour

**Files:**
- Create: `js/megamenu.js`
- Modify: `src/index.html`
- Test: `test.mjs`

**Interfaces:**
- Consumes: `[aria-controls]` triggers and panel ids from Task 6; `[data-mega="on"]`, `.is-open`, `--reveal-i` from Task 7; `.em-header__item--open` from `components/components.css`.
- Produces: the finished feature. Nothing consumes it.

- [ ] **Step 1: Write the failing tests**

Append to `test.mjs`:

```js
const megaJs = readFileSync('js/megamenu.js', 'utf8');

test('mega menu module is loaded by the shell', () => {
  assert.match(html, /<script type="module" src="\.\.\/js\/megamenu\.js"><\/script>/);
});

test('mega menu script sets its own gate attribute', () => {
  assert.match(megaJs, /setAttribute\('data-mega', 'on'\)/);
});

test('hover intent is gated on a fine pointer', () => {
  // Touch and pen devices fire synthetic hover; opening a mega panel on
  // a tap that was meant to activate the trigger is the classic bug.
  assert.match(megaJs, /\(hover: hover\) and \(pointer: fine\)/);
});

test('mega menu is disabled below the mobile nav breakpoint', () => {
  assert.match(megaJs, /min-width:\s*961px/,
    'no desktop media query — panels would fight the mobile nav');
});

test('mega menu implements the documented keyboard map', () => {
  for (const key of ['Escape', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
    assert.ok(megaJs.includes(`'${key}'`), `keyboard map missing ${key}`);
  }
});

test('mega menu drives aria-expanded on the trigger', () => {
  assert.match(megaJs, /setAttribute\('aria-expanded', 'true'\)/);
  assert.match(megaJs, /setAttribute\('aria-expanded', 'false'\)/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test.mjs`
Expected: FAIL — `ENOENT: no such file or directory, open 'js/megamenu.js'`.

- [ ] **Step 3: Create `js/megamenu.js`**

```js
// Desktop mega menus.
//
// Progressive enhancement, same contract as js/nav.js: the five panels
// ship visible in src/sections/00-header.html as plain stacked link
// lists. This script sets [data-mega="on"], which is what
// css/megamenu.css keys its positioned, closed-by-default styles off —
// if this file never loads, every mega-menu link is still on the page.
//
// Below 960px the mobile nav (js/nav.js) owns navigation and this script
// closes and stands down.

const root = document.documentElement;
const header = document.querySelector('.em-header');

const OPEN_DELAY = 120;
const CLOSE_DELAY = 200;

const desktop = window.matchMedia('(min-width: 961px)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

const menus = header
  ? [...header.querySelectorAll('.em-header__item')]
      .map((item) => {
        const trigger = item.querySelector('[aria-controls]');
        const panel = trigger && document.getElementById(trigger.getAttribute('aria-controls'));
        return panel ? { item, trigger, panel } : null;
      })
      .filter(Boolean)
  : [];

if (menus.length) {
  root.setAttribute('data-mega', 'on');

  let open = null;
  let timer = 0;

  for (const { panel } of menus) {
    panel.hidden = true;
    // Stagger index for the link cascade, mirroring css/motion.css.
    panel.querySelectorAll('.em-mega__link').forEach((link, i) => {
      link.style.setProperty('--reveal-i', String(i));
    });
  }

  function cancel() {
    clearTimeout(timer);
    timer = 0;
  }

  function close() {
    cancel();
    if (!open) return;
    open.item.classList.remove('em-header__item--open');
    open.trigger.setAttribute('aria-expanded', 'false');
    open.panel.classList.remove('is-open');
    open.panel.hidden = true;
    open = null;
  }

  function show(menu) {
    cancel();
    if (open === menu) return;
    close();
    open = menu;
    menu.item.classList.add('em-header__item--open');
    menu.trigger.setAttribute('aria-expanded', 'true');
    menu.panel.hidden = false;
    // Next frame, so the closed start-state paints before the transition.
    requestAnimationFrame(() => {
      if (open === menu) menu.panel.classList.add('is-open');
    });
  }

  function after(ms, fn) {
    cancel();
    timer = setTimeout(fn, ms);
  }

  for (const menu of menus) {
    const { item, trigger, panel } = menu;

    // Click always works — it is the only path on touch, and it pins the
    // panel open for mouse users who prefer not to hover.
    trigger.addEventListener('click', () => {
      if (!desktop.matches) return;
      if (open === menu) close();
      else show(menu);
    });

    if (finePointer.matches) {
      // Intent delays: a pointer crossing the nav on its way somewhere
      // else should not flash five panels. Switching between triggers
      // while one is already open is instant — the user has committed.
      for (const el of [item, panel]) {
        el.addEventListener('mouseenter', () => {
          if (!desktop.matches) return;
          if (open) show(menu);
          else after(OPEN_DELAY, () => show(menu));
        });
        el.addEventListener('mouseleave', () => {
          if (!desktop.matches) return;
          after(CLOSE_DELAY, close);
        });
      }
    }

    trigger.addEventListener('keydown', (event) => {
      if (!desktop.matches) return;
      const index = menus.indexOf(menu);

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        show(menu);
        panel.querySelector('a')?.focus();
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        const step = event.key === 'ArrowRight' ? 1 : -1;
        menus[(index + step + menus.length) % menus.length].trigger.focus();
      }
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !open) return;
    const trigger = open.trigger;
    close();
    trigger.focus();
  });

  // Pointer and focus both leaving the header close it. focusout fires
  // before the new element is focused, so relatedTarget is what to test.
  document.addEventListener('click', (event) => {
    if (open && !header.contains(event.target)) close();
  });

  header.addEventListener('focusout', (event) => {
    if (open && !header.contains(event.relatedTarget)) close();
  });

  // Crossing the breakpoint hands navigation back to the mobile menu.
  desktop.addEventListener('change', close);
}
```

- [ ] **Step 4: Link it in `src/index.html`**

After the `js/reveal.js` script tag:

```html
<script type="module" src="../js/megamenu.js"></script>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test test.mjs`
Expected: PASS.

- [ ] **Step 6: Verify behaviour in the browser**

Run: `node build.mjs && python3 -m http.server 8000`

Walk every path — this is the only coverage these behaviours get:

1. Hover "Solutions" briefly and leave without pausing: nothing opens.
2. Hover and rest: panel opens after a beat, links cascade in, caret flips, trigger pill highlights.
3. Move the pointer from "Solutions" to "Podcast": swaps instantly, no flicker, only one panel open.
4. Move the pointer down into the open panel: it stays open. Leave the panel: it closes after a beat.
5. Click "About": pins open. Click "About" again: closes.
6. Tab to a trigger, press Enter: opens. Press Escape: closes and focus returns to the trigger.
7. With a panel open, press ArrowDown: focus lands on the first link. Tab through to the last link and Tab once more: the panel closes.
8. ArrowLeft / ArrowRight on a trigger moves along the nav and wraps at both ends.
9. Click anywhere in `<main>` with a panel open: it closes.
10. Scroll with a panel open: the panel travels with the sticky header.
11. Resize below 960px: any open panel closes, no panel is reachable, the mobile menu still works. Resize back up: mega menus work again.
12. With reduced motion on, panels appear and disappear with no movement.

- [ ] **Step 7: Commit**

```bash
git add js/megamenu.js src/index.html test.mjs
git commit -m "feat: wire mega menu hover intent, click and keyboard behaviour"
```

---

### Task 9: Documentation and full-suite verification

**Files:**
- Modify: `README.md`
- Test: `test.mjs` (full run only)

**Interfaces:**
- Consumes: everything.
- Produces: the hand-off documentation the Elementor developer reads.

- [ ] **Step 1: Write the failing test**

Append to `test.mjs`:

```js
test('README documents both new layers for the Elementor hand-off', () => {
  const readme = readFileSync('README.md', 'utf8');
  for (const needle of ['## Motion', '## Mega menus', 'data-reveal', 'data-reveal-group',
                        'data-reveal-entrance', 'prefers-reduced-motion', 'css/motion.css',
                        'js/reveal.js', 'css/megamenu.css', 'js/megamenu.js']) {
    assert.ok(readme.includes(needle), `README does not document ${needle}`);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test.mjs`
Expected: FAIL — `README does not document ## Motion`.

- [ ] **Step 3: Update the Structure block in `README.md`**

Add the four new files to the tree, after the existing `css/wireframe.css` and `js/nav.js` lines respectively:

```
css/motion.css            ← scroll + entrance reveals — shippable
css/megamenu.css          ← desktop mega menu panels — shippable
```
```
js/reveal.js              ← reveal engine + sticky header flag — shippable
js/megamenu.js            ← desktop mega menu behaviour — shippable
```

- [ ] **Step 4: Add the two new README sections**

Append after the existing "Mobile navigation" section:

````markdown
## Motion

Scroll and entrance animation is an attribute layer: `css/motion.css` holds the
states, `js/reveal.js` decides when to apply them. Nothing about it is
homepage-specific — moving it to another page means copying two files and adding
attributes.

| Attribute | Where | Effect |
| --- | --- | --- |
| `data-reveal="rise"` | any element | fades up 20px |
| `data-reveal="fade"` | any element | fades only |
| `data-reveal="slide-l"` / `"slide-r"` | any element | fades in from 24px left/right |
| `data-reveal="clip"` | photos | wipes up and settles from a 1.04 scale |
| `data-reveal-group` | a container | each `[data-reveal]` inside it is delayed 70ms more than the previous one |
| `data-reveal-entrance` | a container | reveals on load instead of on scroll — the hero only |

`js/reveal.js` sets `<html data-reveal="on">` as its first statement, and every
hidden start-state in `css/motion.css` is nested under that attribute. If the
script fails to load, nothing is hidden — the page just renders without motion.
Never write an ungated `opacity:0`; `test.mjs` fails the build if you do.

Reveals are one-shot: an element animates the first time it enters view and is
then unobserved. It does not re-hide on scroll-up.

`prefers-reduced-motion: reduce` is honoured in both files — every start-state
collapses to the settled state and all durations go to zero.

**Rebuilding in Elementor:** either paste `css/motion.css` + `js/reveal.js` in
wholesale and add the attributes to each widget's advanced settings, or map each
section to Elementor's own entrance animations. If you use Elementor's, the
closest equivalents are `fadeInUp` for `rise`, `fadeIn` for `fade`, and
`fadeInLeft`/`fadeInRight` for the slides; there is no built-in equivalent of
`clip`, and Elementor's per-widget animation delay is what reproduces
`data-reveal-group`.

The header is `position: sticky` and condenses from 92px to 68px past 80px of
scroll, driven by `<html data-scrolled>` from the same script. The preview
control bar (`.ctl`) is deliberately **not** sticky — it would sit on top of the
sticky header. It never ships, so this only affects the preview.

## Mega menus

Each of the five desktop nav triggers opens a full-width panel: grouped link
columns on the left, one promoted feature card on the right. Markup lives in
`src/sections/00-header.html` (five `.em-mega` panels), styles in
`css/megamenu.css`, behaviour in `js/megamenu.js`.

Behaviour: hover-intent opens after 120ms and closes after 200ms, but only on a
fine pointer; moving between triggers while one is open swaps instantly; click
toggles and pins; Escape closes and returns focus to the trigger; ArrowDown moves
into the panel; ArrowLeft/ArrowRight move along the nav; outside click and focus
leaving the header both close. Exactly one panel is open at a time. Below 960px
the whole feature stands down and the mobile menu takes over.

Same progressive-enhancement contract as the motion layer: `js/megamenu.js` sets
`<html data-mega="on">`, and only then does `css/megamenu.css` position the panels
and close them. Without the script they are five plain stacked link lists.

**Link content is not placeholder — panel copy is.** Every link label and href is
copied from the mobile nav, and `test.mjs` fails if the two sets ever diverge:
change one nav, change both. The one-line link descriptions, the feature-card
titles, and the feature images are stand-ins written for this build and need
Empower's real content. Feature images carry `alt=""` deliberately — they are
decorative beside a titled link, and the stand-in photo filenames do not describe
their contents.
````

- [ ] **Step 5: Run the full suite**

Run: `node --test test.mjs`
Expected: PASS — every test, old and new. Report the actual pass count; do not claim completion from a partial run.

- [ ] **Step 6: Final browser pass**

Run: `node build.mjs && python3 -m http.server 8000`

- Reload at 1440px: hero entrance plays, every section reveals on scroll, header condenses, all five mega menus behave.
- Reload at 375px: no mega panels, mobile menu works, page still reveals on scroll.
- Toggle every preview control (skin, foundations, stories, funnel notes) and scroll the page again in each state — the wireframe skin and both layout variants must still animate.
- Turn on reduced motion and reload: everything present, nothing moves.

- [ ] **Step 7: Commit**

```bash
git add README.md test.mjs
git commit -m "docs: document the motion layer and mega menus for hand-off"
```

---

## Verification checklist

Run before declaring the branch done:

```bash
node build.mjs && node --test test.mjs
```

- [ ] Full suite passes, with the pass count reported
- [ ] `git status` clean
- [ ] `tokens/`, `components/`, `assets/` untouched: `git diff --stat master -- tokens components assets` is empty
- [ ] No `data-reveal` element is ever permanently invisible at 375px, 768px, 1440px, or 1920px
- [ ] With JS disabled entirely: page fully visible, all mega-menu links reachable

import { chromium } from 'playwright';

/* Playwright is this repository's first dependency, and it stays confined
   here: the static build, build.mjs and test.mjs stay dependency-free.
   Playwright is a dev dependency used only by this harness and
   test-elementor.mjs, per the task brief's own instruction. */

/* The check that no static parse can make. A Loop Grid whose item template
   does not emit its filter attribute produces a page where every control
   still moves, no card ever hides, and nothing anywhere reports an error.
   Proven against dist/content-b.html on 2026-08-12: 23 items, 6 after
   ticking Community Stories, 23 restored.

   Two deviations from the brief's own draft of this function, both found by
   running it against the real deployed page rather than only against a
   local static file, and both left in place rather than reverted:

   1. waitUntil: 'load', not 'networkidle'. dist/content-b.html has no
      ongoing background network activity, so 'networkidle' resolved cleanly
      there; the live install carries MailMunch, a Facebook pixel and
      Cloudflare's own scripts, which keep the network non-idle well past
      Playwright's 30s default timeout. 'load' matches what
      checkVisibleWithoutJs already uses below, for the same reason.
   2. { force: true } on check/uncheck. The live page runs a MailMunch popup
      signup form. Its backdrop (data-dojo-attach-point="modalOverlay",
      class mc-modal-bg) starts at display:none and switches to a
      full-viewport, z-index:9995 overlay roughly 6 to 8 seconds after load,
      confirmed by polling its computed style. force: true is a deliberate
      bypass of Playwright's actionability check, not a blind workaround:
      this WAS investigated as a possible real defect rather than assumed
      to be a test artifact (see the task report), and the investigation
      resolved cleanly enough to keep the bypass rather than fix anything
      here:
        - A real (non-forced) page.locator(...).click() on the guest
          checkbox, run after the popup has triggered, times out: mouse
          interaction with the filter (and everything else on the page) IS
          genuinely blocked for as long as the popup stays open, for every
          visitor, not just this test.
        - Real Tab-key navigation from the top of the document reaches the
          checkbox in 7 tab presses even with the popup visually open (the
          popup implements no focus trap of its own, so keyboard focus
          walks straight past it into the page behind it), and Space then
          toggles the checkbox and updates the visible card count
          correctly. Keyboard users are not blocked.
        - The popup carries a real close control (button.mc-closeModal,
          aria-label="Close") and responds to Escape, so a mouse visitor
          who notices it can dismiss it and regain normal interaction; the
          defect is the automatic, undismissed default state, not an
          absence of any way out.
      So this is a real, live, site-wide MOUSE-only usability defect caused
      by an unrelated third-party marketing plugin already installed on
      empv2, not something this conversion introduced and not something
      fixable from podcast-a's own markup or CSS. force: true here verifies
      the filter's own CSS cascade in isolation from that plugin's timing,
      which is what this function exists to prove; the plugin finding
      itself is reported separately and flagged for the go-live gate,
      not patched around silently. */
export async function checkFilter(url, { toggleSelector, itemSelector, attribute = 'data-guest' }) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(url, { waitUntil: 'load' });

    const visible = () => page.$$eval(itemSelector, els =>
      els.filter(e => getComputedStyle(e).display !== 'none').length);
    const shownKinds = attr => page.$$eval(itemSelector, (els, a) =>
      [...new Set(els.filter(e => getComputedStyle(e).display !== 'none')
        .map(e => e.getAttribute(a)))].filter(Boolean).sort(), attr);

    const before = await visible();
    await page.check(toggleSelector, { force: true });
    const after = await visible();
    const kinds = await shownKinds(attribute);
    await page.uncheck(toggleSelector, { force: true });
    const restored = await visible();

    return { before, after, restored, kinds };
  } finally {
    await browser.close();
  }
}

/* Elementor's entrance animations, and css/motion.css without js/reveal.js,
   both leave content hidden waiting for a trigger. The build's rule is that
   nothing is. This build has shipped that defect once already.

   The brief's own draft of this function returned the $$eval call directly
   (`return page.$$eval(...)`) without awaiting it first. In an async
   function that is not the same as awaiting it: `return <promise>` hands
   the pending promise straight to the caller and the function's own body is
   considered finished, so the `finally` block's `await browser.close()`
   runs immediately, while the $$eval call is still in flight, and its
   result then rejects with "Target page, context or browser has been
   closed" instead of ever resolving. Reproduced live against
   https://empv2.wpenginepowered.com/podcast-a/ before fixing it here:
   awaiting the value before returning is what makes close() run after the
   read completes rather than racing it. */
export async function checkVisibleWithoutJs(url, selector) {
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'load' });
    return await page.$$eval(selector, els =>
      els.filter(e => getComputedStyle(e).opacity !== '0' && getComputedStyle(e).display !== 'none').length);
  } finally {
    await browser.close();
  }
}

/* The other half of the no-JS comparison: how many of the same selector are
   visible once JavaScript HAS run and the reveal has been given time to
   settle (settleReveal(), below). checkVisibleWithoutJs on its own proves
   nothing is permanently hidden, but says nothing about whether the count it
   found is the RIGHT count; a selector matching zero elements on both sides
   (a typo, a class that does not exist) would report false parity. Diffing
   against this is what test-elementor.mjs's no-JS test actually asserts. */
export async function checkVisibleWithJs(url, selector) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(url, { waitUntil: 'load' });
    await settleReveal(page);
    return await page.$$eval(selector, els =>
      els.filter(e => getComputedStyle(e).opacity !== '0' && getComputedStyle(e).display !== 'none').length);
  } finally {
    await browser.close();
  }
}

/* Check 5 of the spec's harness. Catches the two silent infrastructure
   failures: a stylesheet that never enqueued, and Elementor's Theme Style or
   UiCore's own globals winning over css/site.css. Compared against the same
   property on the same selector in the static build, not against a number
   typed into this file.

   waitUntil: 'load', not 'networkidle', for the reason checkFilter's own
   comment gives: the live install's third-party scripts (MailMunch, a
   Facebook pixel, Cloudflare) keep the network non-idle well past
   Playwright's default timeout. A computed style read does not need the
   page to go fully idle, only for its own CSS to have applied. */
export async function computedStyles(url, probes) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(url, { waitUntil: 'load' });
    const out = {};
    for (const { name, selector, property } of probes) {
      out[name] = await page.$eval(
        selector,
        (el, prop) => getComputedStyle(el).getPropertyValue(prop).trim(),
        property,
      ).catch(() => null);
    }
    return out;
  } finally {
    await browser.close();
  }
}

/* waitUntil: 'load', not 'networkidle', for the same reason as above.

   Found live, on the first capture pass: two of the four static-reference
   screenshots (768, 1440) came back with the hero copy and the whole
   episode grid rendered as a barely-visible grey ghost, while 1024 and 390
   were fine. The cause is js/reveal.js's own design (see that file's own
   comments): every [data-reveal] element outside the above-the-fold
   [data-reveal-entrance] scope only gains its .is-revealed class from an
   IntersectionObserver callback that fires once the element intersects the
   viewport, and a plain fullPage screenshot does not reliably give that
   callback time to fire and its CSS transition time to finish before the
   capture happens, at every width, every time. Scrolling to the bottom
   first (in real steps, not a single jump, so intersection entries fire
   the way they would for a scrolling visitor) and then explicitly waiting
   for every [data-reveal] element to carry .is-revealed removes the race
   instead of hoping the timing works out. Scrolling back to the top before
   capturing matches what Step 11 actually wants: a screenshot of the page
   as a visitor arriving at the top of it would see it once revealed, not
   mid-scroll.

   Waiting only for the .is-revealed CLASS was not enough on its own,
   found on the second capture pass: css/motion.css transitions opacity
   over --dur-reveal (600ms) plus a PER-ITEM stagger,
   transition-delay: calc(var(--reveal-i) * 70ms), where --reveal-i is the
   element's position within its own [data-reveal-group] (js/reveal.js sets
   it). The class is added the instant an element intersects, which can be
   well before its transition-delay has even elapsed, let alone before the
   600ms transition after that finishes; in a 66-card group the last card's
   delay alone is 65 * 70ms = 4550ms. Capturing right after the class check
   caught mid-transition frames, exactly the same "grey ghost" look as
   before, just further down the page. Reading each element's own computed
   transition-delay + transition-duration and waiting for the slowest one
   is what makes this correct for any group size, this page's 9-card static
   sample and the converted page's 66-card grid alike, rather than a fixed
   guess tuned to whichever page happened to be captured last. */
async function settleReveal(page) {
  await page.evaluate(async () => {
    const height = document.documentElement.scrollHeight;
    const step = window.innerHeight;
    for (let y = 0; y < height; y += step) {
      window.scrollTo(0, y);
      await new Promise(r => requestAnimationFrame(r));
    }
    window.scrollTo(0, height);
    await new Promise(r => requestAnimationFrame(r));
  });
  /* Query from body, not document, matching js/reveal.js:16 exactly. js/reveal.js:11
     sets data-reveal="on" on <html> itself as the gate for the whole page; the
     collection that ever receives .is-revealed is body-scoped, precisely to exclude
     that root element. A document-wide query here would sweep <html> into the set
     this waits on, and since <html> never gets .is-revealed, every() could never
     return true: the wait would time out on every single page, unconditionally. */
  await page.waitForFunction(() =>
    [...document.body.querySelectorAll('[data-reveal]')].every(el => el.classList.contains('is-revealed')),
  { timeout: 10000 }).catch(() => {
    /* Finding 5.9's grey-ghost screenshots happened because this timeout was
       swallowed silently: capture proceeded anyway and produced exactly the
       unusable screenshot this function exists to prevent, with no signal
       anywhere. Warn rather than throw, since a partial reveal is still worth
       looking at, but never let it pass without saying so. */
    console.warn(`settleReveal: not every [data-reveal] element reached is-revealed within 10000ms on ${page.url()}`);
  });
  const maxTransitionMs = await page.evaluate(() => {
    const toMs = v => (v.endsWith('ms') ? parseFloat(v) : parseFloat(v) * 1000);
    let max = 0;
    for (const el of document.querySelectorAll('[data-reveal]')) {
      const cs = getComputedStyle(el);
      const total = toMs(cs.transitionDelay || '0s') + toMs(cs.transitionDuration || '0s');
      if (total > max) max = total;
    }
    return max;
  });
  await page.waitForTimeout(maxTransitionMs + 100);
  await page.evaluate(() => window.scrollTo(0, 0));
}

/* Keyed on the element's own text, never on a selector: the conversion moves
   classes onto wrapper divs, so a selector-keyed comparison silently matches
   nothing on one side and scores that as agreement. Scrolls the whole page
   first, because js/reveal.js only reveals on intersection and a lazily loaded
   image settles at a different height before and after. */
export async function census(url, { width = 1440, height = 900 } = {}) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(url, { waitUntil: 'load' });
    await settleReveal(page);
    /* Awaited, not returned bare: the same trap checkVisibleWithJs's own
       comment above documents. A bare `return page.evaluate(...)` hands the
       caller a pending promise while this function's body is considered
       finished, so `finally`'s browser.close() races it and the read fails
       with "Target page, context or browser has been closed" instead of
       ever resolving. Reproduced live running this against the deployed
       homepage before adding the await. */
    return await page.evaluate(() => {
      const out = {}; const seen = {};
      for (const el of document.querySelectorAll('h1,h2,h3,h4,h5,p,blockquote')) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none') continue;
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
        let key = `${el.tagName.toLowerCase()}|${text}`;
        seen[key] = (seen[key] || 0) + 1;
        if (seen[key] > 1) key = `${key}#${seen[key]}`;
        /* The margin a converted page renders can legitimately sit on a
           wrapper the static build does not have, so charge the element and
           every widget wrapper around it, stopping at the first container. */
        let mb = parseFloat(cs.marginBottom) || 0;
        let node = el.parentElement;
        while (node && node.matches('.elementor-widget, .elementor-widget-container') && !node.matches('.e-con')) {
          mb += parseFloat(getComputedStyle(node).marginBottom) || 0;
          node = node.parentElement;
        }
        out[key] = {
          fontSize: cs.fontSize,
          lineHeight: cs.lineHeight,
          fontFamily: cs.fontFamily.split(',')[0].replace(/["']/g, ''),
          color: cs.color,
          background: cs.backgroundColor,
          marginBottom: `${mb}px`,
        };
      }
      return out;
    });
  } finally {
    await browser.close();
  }
}

/* The census compares values. This compares boxes: width, height, padding,
   border radius and width, and the type properties that decide a control's
   footprint. Anchors inside Elementor's button widget are skipped: link()
   renders the pill on the WRAPPER and the anchor fills it, which is by
   design and measured correct against the static build's own anchor. */
export async function controlBoxes(url, { width = 1440, height = 900 } = {}) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(url, { waitUntil: 'load' });
    await settleReveal(page);
    /* Awaited for the same reason as census() above. */
    return await page.evaluate(() => {
      const out = {}; const seen = {};
      for (const el of document.querySelectorAll('a,button,input,select,textarea,img')) {
        if (el.closest('.elementor-widget-button')) continue;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        let key = `${el.tagName.toLowerCase()}|${(el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 20)
          || el.getAttribute('alt') || '?'}`;
        seen[key] = (seen[key] || 0) + 1;
        if (seen[key] > 1) key = `${key}#${seen[key]}`;
        out[key] = {
          w: Math.round(r.width), h: Math.round(r.height),
          padding: cs.padding, borderRadius: cs.borderRadius, borderWidth: cs.borderWidth,
          fontWeight: cs.fontWeight, letterSpacing: cs.letterSpacing, fontSize: cs.fontSize,
        };
      }
      return out;
    });
  } finally {
    await browser.close();
  }
}

export async function screenshots(url, dir) {
  const browser = await chromium.launch();
  try {
    for (const width of [390, 768, 1024, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1200 } });
      await page.goto(url, { waitUntil: 'load' });
      await settleReveal(page);
      await page.screenshot({ path: `${dir}/${width}.png`, fullPage: true });
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

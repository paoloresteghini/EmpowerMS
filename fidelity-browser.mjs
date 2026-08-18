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
  /* The height is re-read every iteration rather than cached once, and the
     loop is followed by one more explicit scroll to whatever the height
     reads AFTER the loop, not the height it started with. The live install
     loads real photographs over the network, so document.body.scrollHeight
     can still be growing while this loop is running: a height cached at
     the top can be stale by the time the loop reaches what was the bottom
     when it started, and the steps stop short of the page's actual last
     section, exactly the elements settleReveal exists to give time to. */
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise(r => requestAnimationFrame(r));
    }
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(r => requestAnimationFrame(r));
    /* A short pause at the true bottom, re-read just above, before this
       function moves on to waiting for .is-revealed: one rAF frame is
       enough for the scroll itself to paint, but IntersectionObserver
       callbacks and any image decode they trigger are not guaranteed to
       land inside that single frame on a page still loading over the
       network. */
    await new Promise(r => setTimeout(r, 250));
  });
  /* A settle routine has to be able to CAUSE the condition it waits for,
     not just wait for it. Every failure in this function, before landing
     here, was a version of waiting for something nothing had made
     possible yet:

     - the page grows while you scroll it, because images are lazy, so a
       single pass measures a page that no longer exists by the time you
       read it
     - an image the browser never fetches never completes, so waiting on
       all of them deadlocks
     - an element parked outside a scroll container cannot be reached by
       scrolling the window, whatever the budget

     Addressed below in the order that matters: cause the images to load
     and the layout to stop moving FIRST, then cause every axis of every
     element to actually be reachable, and only then wait for the reveal
     itself.

     IMAGES BEFORE REVEALS. `loading="lazy"` (emitted by both the static
     build and Elementor) means an image does not fetch until scrolling
     brings it near the viewport, and each one that resolves from nothing
     to its real intrinsic height pushes everything below it down. That is
     the actual mechanism behind a multi-thousand-pixel vertical drift
     measured live at 390px during this task's own investigation: one
     element's own rect.y moved by roughly 7200px in under 4 seconds with
     window.scrollTo never once called, because content above it kept
     growing as images resolved. Waiting for images to finish before
     asking anything to have revealed fixes the cause rather than chasing
     the symptom with an ever-larger budget.

     Filtered to images that actually have a rendered box. A strict "every
     entry in document.images" wait deadlocks forever on this page: the
     hero carries an `fp-hero__aside` column that is `display:none` below
     a breakpoint (a desktop-only photograph), and a display:none ancestor
     means the browser's own native lazy-loading never bothers fetching
     it, so `.complete` never becomes true, for a reason that has nothing
     to do with a broken asset. An image with no rendered box can never
     affect layout or ever need to reveal, so it is excluded rather than
     waited on. Measured live at 390px: 14 of 15 images unfiltered, one of
     them (the hidden hero photo) never completing; filtered to the 14
     that actually render, the wait settles in about 200ms once the
     vertical pass above has already run. */
  await page.waitForFunction(() =>
    [...document.images].filter((img) => {
      const r = img.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }).every(img => img.complete),
  { timeout: 15000 }).catch(async () => {
    const { total, incomplete, srcs } = await page.evaluate(() => {
      const imgs = [...document.images].filter((img) => {
        const r = img.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      const stillLoading = imgs.filter(img => !img.complete);
      return {
        total: imgs.length,
        incomplete: stillLoading.length,
        srcs: stillLoading.slice(0, 5).map(img => img.currentSrc || img.src),
      };
    });
    throw new Error(
      `settleReveal: ${incomplete} of ${total} rendered images never finished loading within 15000ms on `
      + `${page.url()}. Still loading: ${srcs.join(' | ')}`,
    );
  });
  /* EVERY AXIS REACHABLE. A vertical-only scroll can never bring a
     horizontally-scrolling rail's off-screen items into view. Found live
     at 390px: `.c2-panels` holds three `.c2-panel` articles in a snapped
     horizontal rail (`overflow-x:auto`, `css/current-2.css:353`), and the
     third sits at x=632 while the viewport itself is only 390 wide, its
     scrollLeft never having moved past 24 of a possible 595. The vertical
     pass above walks straight past it. Not scoped to `.c2-panels` by
     name: this instrument gates twelve more page conversions and any of
     them may carry a rail of its own, so every element that is itself
     horizontally scrollable gets the same treatment.

     Three things learned measuring this live, all left in place:

     1. A jump straight from the container's starting scrollLeft to its
        end in one `scrollTo` missed the panel BETWEEN the two ends: an
        instant jump sets the final position directly, with no
        intermediate frame at any position in between, so a middle panel
        that never fully overlaps the viewport at either end is never
        seen intersecting at all. Stepping through in clientWidth
        increments, same shape as the vertical loop above, gives every
        panel an intermediate frame where it is actually the one on
        screen.
     2. A pause, fixed or polled, is a symptom fix. `.c2-panels` carries
        `scroll-snap-type: x mandatory`, and CSS scroll snap re-settles a
        container to its nearest snap point asynchronously after a
        programmatic scrollTo. A fixed pause missed that re-settle often
        enough to fail intermittently; a version that instead polled
        scrollLeft until it stopped changing across a single frame still
        failed intermittently, on exactly one of the three panels, varying
        run to run, because that check passes trivially the instant after
        a scrollTo (the value has already arrived and snap has not moved
        it yet) and moves on while the container is still about to
        re-settle underneath it. The actual fix is below: remove the
        re-settle rather than wait it out.
     3. Requiring several consecutive unchanged frames, not one, turns the
        poll from a check of "is not moving right now" into "has actually
        stopped moving" (`STABLE_FRAMES` in `settleScrollLeft` below),
        which is what a single-frame poll was missing in point 2. Kept as
        a second layer alongside disabling scroll snap outright for the
        walk (see the comment on `el.style.scrollSnapType` below), rather
        than relying on either fix alone: disabling snap removes the
        mechanism that was re-settling positions, and the multi-frame poll
        is what a caller with a rail using some OTHER async repositioning
        this instrument has not seen yet would still be protected by.

     KNOWN GAP, left in rather than hidden behind a longer budget or a
     silent retry. Even with all three fixes above, live at 390px this
     still fails intermittently on one of the three `.c2-panels` articles
     (37 of 38 [data-reveal] elements settle; which panel is the holdout
     varies between runs). The 1440 width has no rail and has not been
     seen to fail. A tempting next fix was tried and MEASURED WORSE, so it
     is recorded here rather than left for someone to reach for again:
     calling `el.scrollIntoView({ block: 'center' })` on each container
     before walking it horizontally, on the reasoning that the vertical
     pass above ends at the page's true bottom and the rail might not be
     on screen at all while this loop runs. Live: this dropped the result
     from 37 of 38 to 28 of 38, with the newly-unrevealed set spread
     across sections that have nothing to do with the rail (podcast card,
     article cards, the join-us slab), because scrolling the window
     vertically for every matched container, mid-function, disturbs
     whatever the earlier phases had already arranged and does not put it
     back. A caller seeing an occasional single-element throw at 390,
     naming one `.c2-panels` panel, should re-run rather than treat it as
     a page defect; a throw naming several elements across unrelated
     sections is a different, worse signal and should not be waved off
     the same way.

     UPDATE: the technique this paragraph rejects, el.scrollIntoView on a
     container before working it, was re-adopted below anyway (see "Bring
     the container into view VERTICALLY before walking it" further down in
     this same evaluate) once its actual cost was understood: 27 of 38
     revealed without it, because a container brought into view moves
     everything below it off screen for good once the first vertical pass
     has already run. It is safe there because the compensating second
     vertical pass a few lines below re-scrolls past everything the walk's
     own scrollIntoView calls displaced, restoring what this paragraph
     found missing. Read this record as history, not as a standing
     prohibition on the call itself: what was rejected and never brought
     back is calling it AS A SUBSTITUTE for restoring the rest of the page
     afterwards, not calling it at all. */
  await page.evaluate(async () => {
    /* STABLE_FRAMES, not one frame, and the distinction is the whole flake.
       The first version returned as soon as scrollLeft matched its previous
       value across a single frame. Immediately after a programmatic
       scrollTo that test passes trivially: the value has already arrived at
       its requested position and snap has not moved it yet, so the very
       first comparison succeeds and the walk moves on to the next step
       while the container is still about to re-settle underneath it.
       Requiring several consecutive unchanged frames is what makes this a
       measurement of "has stopped moving" rather than of "is not moving
       right now". */
    const STABLE_FRAMES = 3;
    const settleScrollLeft = async (el, budgetMs) => {
      const deadline = Date.now() + budgetMs;
      let prev = el.scrollLeft;
      let stable = 0;
      while (Date.now() < deadline) {
        await new Promise(r => requestAnimationFrame(r));
        const cur = el.scrollLeft;
        stable = cur === prev ? stable + 1 : 0;
        prev = cur;
        if (stable >= STABLE_FRAMES) return;
      }
    };
    const containers = [...document.querySelectorAll('*')].filter((el) => {
      const cs = getComputedStyle(el);
      return (cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth;
    });
    for (const el of containers) {
      /* Bring the container into view VERTICALLY before walking it, and this
         is the cause the two earlier repairs missed. The vertical pass above
         ends at document.body.scrollHeight and the return to the top is at
         the end of this function, so without this the walk runs while the
         page is parked at the bottom and the rail sits far above the
         viewport. No horizontal position can make an element intersect while
         its container is off screen on the other axis, which is why neither
         a longer per-step budget nor disabling snap changed anything. */
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      await new Promise(r => requestAnimationFrame(r));
      const start = el.scrollLeft;
      const step = el.clientWidth;
      /* Snap is turned OFF for the walk and restored afterwards, which
         removes the re-settle rather than waiting it out. This is safe
         because .is-revealed is sticky and js/reveal.js unobserves each
         element on its first intersection, so nothing that happens after an
         element reveals can un-reveal it, and the property is restored
         before any measurement is taken. Read from the inline style rather
         than the computed one so the restore puts back exactly what was
         there, including nothing. */
      const snap = el.style.scrollSnapType;
      el.style.scrollSnapType = 'none';
      for (let x = 0; x < el.scrollWidth; x += step) {
        el.scrollTo({ left: x, behavior: 'instant' });
        await settleScrollLeft(el, 500);
      }
      el.scrollTo({ left: el.scrollWidth, behavior: 'instant' });
      await settleScrollLeft(el, 500);
      el.scrollTo({ left: start, behavior: 'instant' });
      await settleScrollLeft(el, 500);
      el.style.scrollSnapType = snap;
    }
    /* One more vertical pass, and it is not belt and braces. Bringing a
       container into view moves the window back up the page, so every
       element BELOW it stops being on screen and, if it had not already
       revealed, never will: the first vertical pass is over and nothing
       else scrolls past them. Measured directly when this was missing: 27
       of 38 revealed, the unrevealed set being the whole insights section,
       which sits below the rail. Whatever scrolls the page must be the LAST
       thing that runs before the wait. */
    const vstep = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += vstep) {
      window.scrollTo(0, y);
      await new Promise(r => requestAnimationFrame(r));
    }
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(r => requestAnimationFrame(r));
  });
  /* THE LAST HOLDOUT: one element that missed its own step. The vertical
     pass just above steps by window.innerHeight and awaits exactly ONE
     requestAnimationFrame per step, which gives js/reveal.js's
     IntersectionObserver a single rendering opportunity to notice each
     position. An element that only ever appears as a sliver at a step
     boundary, rather than comfortably inside one step's frame, can miss
     that one chance. Intermittent because it is a race against the
     observer's own callback timing, not a fixed geometry: measured at
     390px running controlBoxes() against dist/final.html alone, nothing
     else in the process, three times: settled, unsettled, unsettled. The
     holdout was a single <h2>, sitting at rect y=-6008 (roughly 6000px
     ABOVE the viewport once the pass above lands at the bottom), in a
     section with no rail and no horizontal scrolling, which rules out
     `.c2-panels` as the cause here.

     A settle routine must be able to CAUSE the condition it waits for, the
     same principle the rest of this function is built on. So: find every
     [data-reveal] element still missing .is-revealed, scroll each directly
     into view, give it a frame, and check again, until the unrevealed set
     stops shrinking or a small round budget runs out.

     el.scrollIntoView is the same call the container walk above uses, and
     that is not a coincidence to paper over: what actually distinguishes
     this pass from the one MEASURED WORSE up at the KNOWN GAP paragraph is
     not the call, it is WHEN it runs and WHAT it is allowed to touch. The
     rejected version scrolled the window on behalf of containers that were
     not themselves the elements in trouble, at a point in the walk where
     later phases still had work left to do, so it could carry an
     unrelated element out of view before that element had ever had its own
     chance to be seen; that is what cost it 37 of 38 down to 28 of 38. This
     pass runs only once every earlier phase (images, the horizontal walk,
     the final vertical pass) has already finished, and it scrolls only to
     elements that have provably missed their chance, never to a container
     on anyone else's behalf. Because .is-revealed is sticky and
     js/reveal.js unobserves on first intersection (see the container
     walk's own comment on that above), the unrevealed set this pass reads
     can only shrink, never grow, so a scroll on behalf of one holdout can
     never create a new one. That is a difference in kind, not in degree,
     even though the call itself is identical.

     One thing this pass CAN disturb, and does correct for below:
     scrollIntoView moves every scrollable ancestor of the target, not only
     the window, so a holdout that lives inside a `.c2-panels`-style rail
     drags that rail's scrollLeft away from the position the container walk
     above spent real effort settling it back to. Neither census() nor
     controlBoxes() records x or y, so this cannot manufacture a box or
     style difference in the two instruments this function was built for.
     screenshots() is the caller that does care: it settles and then takes
     a fullPage capture, and a rail parked on a different panel from run to
     run would turn an axis that used to be deterministic into a visible,
     flaky artifact in review screenshots. Restored the same way the walk
     above restores it, snapshot before, settle back after. */
  await page.evaluate(async () => {
    const containers = [...document.querySelectorAll('*')].filter((el) => {
      const cs = getComputedStyle(el);
      return (cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth;
    });
    const savedScrollLeft = containers.map(el => el.scrollLeft);
    const MAX_ROUNDS = 5;
    let previousCount = Infinity;
    for (let round = 0; round < MAX_ROUNDS; round += 1) {
      const unrevealed = [...document.body.querySelectorAll('[data-reveal]')]
        .filter(el => !el.classList.contains('is-revealed'));
      if (unrevealed.length === 0 || unrevealed.length >= previousCount) break;
      previousCount = unrevealed.length;
      for (const el of unrevealed) {
        el.scrollIntoView({ block: 'center', behavior: 'instant' });
        await new Promise(r => requestAnimationFrame(r));
      }
    }
    /* Bounded the same way settleScrollLeft above is bounded: a budget, not
       an unbounded poll, because scroll-snap's async re-settle is exactly
       the mechanism that made an unbounded wait unsafe there too. Skipped
       entirely for a container the loop above never touched, which is the
       common case measured on this page (the recurring holdout is a plain
       heading with no rail of its own). */
    const STABLE_FRAMES = 3;
    for (let i = 0; i < containers.length; i += 1) {
      const el = containers[i];
      if (el.scrollLeft === savedScrollLeft[i]) continue;
      el.scrollTo({ left: savedScrollLeft[i], behavior: 'instant' });
      const deadline = Date.now() + 500;
      let prev = el.scrollLeft;
      let stable = 0;
      while (Date.now() < deadline && stable < STABLE_FRAMES) {
        await new Promise(r => requestAnimationFrame(r));
        const cur = el.scrollLeft;
        stable = cur === prev ? stable + 1 : 0;
        prev = cur;
      }
    }
  });
  /* Query from body, not document, matching js/reveal.js:16 exactly. js/reveal.js:11
     sets data-reveal="on" on <html> itself as the gate for the whole page; the
     collection that ever receives .is-revealed is body-scoped, precisely to exclude
     that root element. A document-wide query here would sweep <html> into the set
     this waits on, and since <html> never gets .is-revealed, every() could never
     return true: the wait would time out on every single page, unconditionally. */
  await page.waitForFunction(() =>
    [...document.body.querySelectorAll('[data-reveal]')].every(el => el.classList.contains('is-revealed')),
  { timeout: 10000 }).catch(async () => {
    /* Finding 5.9's grey-ghost screenshots happened because this timeout was
       swallowed silently: capture proceeded anyway and produced exactly the
       unusable screenshot this function exists to prevent, with no signal
       anywhere. Worse, census() and controlBoxes() compare layout
       properties (font-size, margins, box dimensions) that a mid-reveal
       element still satisfies identically to a settled one; neither
       instrument would ever notice a partial reveal on its own. A
       measurement taken against a partially revealed page is worse than no
       measurement, because it is indistinguishable from a good one, so
       this throws instead of warning. Gathered fresh here, not carried
       over from the failed wait: how many of how many elements actually
       settled, and the first few that did not, identified by tag plus
       either the element's own leading text or its class list, whichever
       exists (an element with neither is otherwise indistinguishable from
       any other of the same tag in the message). */
    const { total, revealed, stuck } = await page.evaluate(() => {
      const els = [...document.body.querySelectorAll('[data-reveal]')];
      const notRevealed = els.filter(el => !el.classList.contains('is-revealed'));
      const describe = el => {
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30);
        const label = text || (el.className && String(el.className).trim()) || '(no text, no class)';
        return `<${el.tagName.toLowerCase()}> ${label}`;
      };
      return {
        total: els.length,
        revealed: els.length - notRevealed.length,
        stuck: notRevealed.slice(0, 5).map(describe),
      };
    });
    throw new Error(
      `settleReveal: only ${revealed} of ${total} [data-reveal] elements reached is-revealed within `
      + `10000ms on ${page.url()}. First unrevealed: ${stuck.join(' | ')}`,
    );
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
    /* Awaited, not returned bare: the same trap checkVisibleWithoutJs's own
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
        /* Finding 5.9's own root cause, closed here: a fully laid-out,
           perfectly positioned element that is simply invisible matched on
           every property above, because none of them is opacity,
           visibility or size. Three fields, the smallest set that catches
           it: opacity, visibility (a `[data-reveal]` element or an
           accessibility utility class can hide either way, and the two are
           independent: `visibility:hidden` still occupies its box while an
           element clipped to nothing does not), and whether the element's
           own box has collapsed to zero in either dimension (a box that
           overflow:hidden or a broken flex/grid track can crush even when
           opacity and visibility both read as fully shown).
           Opacity is rounded to 2 decimal places rather than compared as
           the raw string getComputedStyle returns. By the time this runs,
           settleReveal() has already waited out every element's own
           transition-delay plus transition-duration (or thrown, if it
           could not), so a genuinely settled element should read exactly 0
           or 1; rounding absorbs the sub-percent float noise browsers can
           still leave behind (0.99999994 rather than 1) without hiding a
           real difference, so two elements legitimately invisible on both
           sides still compare equal instead of failing on decimal dust. */
        const rect = el.getBoundingClientRect();
        out[key] = {
          fontSize: cs.fontSize,
          lineHeight: cs.lineHeight,
          fontFamily: cs.fontFamily.split(',')[0].replace(/["']/g, ''),
          color: cs.color,
          background: cs.backgroundColor,
          marginBottom: `${mb}px`,
          opacity: Math.round(parseFloat(cs.opacity) * 100) / 100,
          visibility: cs.visibility,
          zeroSized: rect.width === 0 || rect.height === 0,
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
   design and measured correct against the static build's own anchor.

   Keyed by identity, never by position. A first pass fell back to a shared
   '?' bucket for every element with neither text nor alt, and matched
   entries across the two sides by encounter order rather than by what they
   actually are: live's 80x80 mini-card avatar landed in the same bucket as
   static's 374x600 panel photograph, because the two pages carry different
   photographs in the mini cards and everything after that divergence shifts
   by one position. census()'s own comment above states the principle this
   violates from the value side, that a key the comparison can move
   "silently matches nothing on one side and scores that as agreement"; the
   positional bucket is the same failure one level over, scoring a
   difference against the wrong element instead of against no element.

   img: the src basename, normalized, and nothing else. Never alt: alt is a
   per-usage attribute, not an identity of the photograph. Measured live:
   .c2-panel__bg carries alt "A child working on a tablet in a classroom"
   where the static build's identical photograph carries alt="" (decorative
   there, meaningful in the insights row for the same file), so an
   alt-first key pairs live's panel background with static's insights
   thumbnail instead of with its own static counterpart. Normalized by
   stripping WordPress's generated size suffix (-300x136) and then a
   trailing dedupe suffix (-1), in that order: the footer logo is
   logo-reversed-300x136-1.png live against logo-reversed-300x136.png
   static, and without the dedupe strip it drops out of the sweep on every
   page.
   a: text, else aria-label, else the URL's pathname. Pathname, not the raw
   href: live's hrefs are absolute against empv2 and the static build's are
   relative, so a raw-href key would silently stop comparing anchors that
   share no text or aria-label at all.
   button/input/select/textarea: text, else aria-label, else name, else
   type.
   An element that yields none of those is EXCLUDED from the returned
   object rather than bucketed under a shared fallback key: an excluded
   element is a visible gap in coverage, counted per side below; a
   positionally bucketed one is an invisible false finding.

   aria-label is unstable across this conversion for the same reason alt
   is: Elementor's image widget has no control for either, so an anchor
   that carries one in the static build carries neither live, and neither
   can ever serve as identity. The header logo link is the measured
   instance: static's anchor keys on its aria-label ("Empower Mississippi
   home"), live's carries neither text nor aria-label and falls through to
   pathname, so the two deliberately do not pair. That is not a coverage
   gap; pairing them would produce a FALSE finding rather than recover a
   real one. Measured at 1440px: .em-header__logo (flex: 1 1 0px, 232x52),
   .em-header__nav (641px) and .em-header__bar (1152px) are identical on
   both sides, and the only difference is which element carries the
   .em-header__logo class. Static puts it on the <a>, so the anchor is the
   232px flex item; live puts it on the image widget's wrapper (header.mjs's
   own comment already records that class move as a known cost), so the
   wrapper is the 232px flex item and the anchor inside shrink-wraps to its
   image at 112px. Comparing those two anchors' boxes would score that
   shrink-wrap as a size defect on an element that, at the header's own
   level, is not wrong at all.

   The general limit this illustrates: a box sweep cannot tell "this
   element is the wrong size" from "this element is no longer the element
   the rule applies to". That is the census's job, keyed on the text the
   conversion cannot move; the plan lands two instruments rather than one
   for exactly this reason. */
export async function controlBoxes(url, { width = 1440, height = 900 } = {}) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(url, { waitUntil: 'load' });
    /* An unsettled page is an ERROR for census() and a DATUM here, and the
       two instruments genuinely want different answers.
       census() asserts on visibility now: it reports each element's opacity
       and visibility, so measuring a half-revealed page would manufacture
       false differences, and it must refuse. It gets the throw.
       This instrument measures BOXES. Reveal changes opacity and transform,
       and neither changes the width or height recorded below, so an
       unrevealed element measures the same as a revealed one. Throwing here
       buys nothing and costs a flake, measured repeatedly today: the box
       sweep passes when run alone and fails when run after the census in the
       same process, on different elements on different runs, on the live
       page and on a local file alike. That is contention between repeated
       browser sessions, not a property of either page.
       So the failure is recorded rather than thrown, under a key the
       comparison reads like any other. A page that settles DIFFERENTLY from
       its counterpart still surfaces as a difference. A page that merely
       settles slowly does not.
       The one case where reveal does change a measured box is
       data-reveal="clip", which starts at transform: scale(1.04). An
       unexplained size difference on a clip element should suspect this
       first. */
    const unsettled = await settleReveal(page).then(() => null, (e) => e.message);
    /* Awaited for the same reason as census() above. */
    const boxes = await page.evaluate(() => {
      const out = {}; const seen = {}; let excluded = 0;
      const clean = (s) => (s || '').replace(/\s+/g, ' ').trim().slice(0, 20) || null;
      for (const el of document.querySelectorAll('a,button,input,select,textarea,img')) {
        if (el.closest('.elementor-widget-button')) continue;
        let ident;
        if (el.tagName === 'IMG') {
          const src = el.currentSrc || el.src || '';
          const base = src.split('/').pop().split('?')[0].split('#')[0];
          const dot = base.lastIndexOf('.');
          const name = dot === -1 ? base : base.slice(0, dot);
          const ext = dot === -1 ? '' : base.slice(dot);
          const stripped = name.replace(/-\d+x\d+$/, '').replace(/-\d+$/, '');
          ident = stripped ? `${stripped}${ext}` : null;
        } else if (el.tagName === 'A') {
          ident = clean(el.textContent) || clean(el.getAttribute('aria-label'))
            || (el.href ? new URL(el.href).pathname : null);
        } else {
          ident = clean(el.textContent) || clean(el.getAttribute('aria-label'))
            || el.getAttribute('name') || el.getAttribute('type');
        }
        if (!ident) { excluded += 1; continue; }
        let key = `${el.tagName.toLowerCase()}|${ident}`;
        seen[key] = (seen[key] || 0) + 1;
        if (seen[key] > 1) key = `${key}#${seen[key]}`;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        out[key] = {
          w: Math.round(r.width), h: Math.round(r.height),
          padding: cs.padding, borderRadius: cs.borderRadius, borderWidth: cs.borderWidth,
          fontWeight: cs.fontWeight, letterSpacing: cs.letterSpacing, fontSize: cs.fontSize,
        };
      }
      /* Reported per side, not summed or dropped: the test compares this
         key like any other, so a coverage gap on one side and not the
         other becomes a visible diff instead of a silent one. */
      out.__excluded_count__ = excluded;
      /* Whether the page finished revealing, recorded rather than thrown.
         The string is deliberately reduced to a boolean-ish marker: the
         throw's own message names counts and elements that differ run to
         run, and a key that changes every run would report a difference on
         every run. What matters for a comparison is that one side settled
         and the other did not. */
      return out;
    });
    /* Reduced to a marker rather than carrying the message: the throw names
       counts and elements that vary run to run, and a key whose value
       changed every run would report a difference on every run. What a
       comparison needs to know is that one side settled and the other did
       not. */
    /* Always present, and always a TRUTHY string, which is not fussiness.
       The census test builds its comparison set with
       `Object.keys(live).filter((k) => stat[k])`, so a key that is absent on
       one side, or present with a falsy value, never enters the comparison
       at all. Setting this only when unsettled reproduced exactly that: at
       390 the live page settled and the static build did not, the two sides
       genuinely disagreed, and the test passed because the key existed on
       one side only. This file has already been bitten by that once, with
       __excluded_count__ and a count of zero. A marker that reports a
       difference must be comparable on both sides even when there is
       nothing to report. */
    boxes.__unsettled__ = unsettled ? 'unsettled' : 'settled';
    return boxes;
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

/* The THIRD instrument, added 2026-08-18 after an audit of all seven converted
 * pages found 10 defects on 5 pages that neither census() nor controlBoxes()
 * reports, and counted the blind spot at 71 to 86 percent of everything
 * rendered inside <main> on a typical page
 * (.superpowers/sdd/2026-08-15-class-in-markup/audit-invisible-defects.md).
 *
 * WHY THIS IS A SEPARATE INSTRUMENT RATHER THAN A WIDER controlBoxes().
 * Every one of those 10 defects lives on a CONTAINER, or on the one widget
 * class controlBoxes() deliberately excludes. Widening controlBoxes() to reach
 * them was measured and rejected: on the same seven pages a container sweep
 * inherits 188 tag changes (a class travelling to a widget wrapper, which is
 * always a div, while the real element keeps its tag one level down), 120
 * flex-wrap differences that are Elementor container defaults with no visual
 * consequence, and a set of container height differences that are box shifts
 * with nothing inside them moving. One of the 188 is a real defect and one of
 * the 120 is. controlBoxes()'s own comment states the reason from the other
 * side: a box sweep cannot tell "this element is the wrong size" from "this
 * element is no longer the element the rule applies to", and containers are
 * exactly where the conversion legitimately moves classes. A noisy shared gate
 * gets its tolerances widened until it stops being a gate, and this project has
 * already shipped one test that failed green.
 *
 * So: a NAMED property set over a NAMED element set, and nothing else. Three
 * measurements, in increasing cost, each with its own assertion in
 * test-elementor.mjs so a failure names which invariant broke:
 *
 *   mainHeight  one number per page per width, <main>'s own border-box height.
 *   axis        flex-direction on keyed elements, GATED on both sides
 *               computing flex or inline-flex, plus the absolute viewport x of
 *               every keyed element.
 *   painted     border-box top and height of every keyed element that computes
 *               a non-transparent background-color or a background-image.
 *
 * DELIBERATELY OUT: tag comparison, flex-wrap, and any general width/height
 * sweep over containers. All three were measured across the seven pages and all
 * three are dominated by differences with no visual consequence.
 *
 * THE KEY, and this is the part that took three attempts in the audit to get
 * right. Elements are keyed by the build's own class tokens plus an ordinal,
 * never by position in the tree: Elementor inserts wrapper elements, so
 * offset-within-parent and child index are both incomparable across the two
 * builds, and only viewport-absolute x is. ELEMENTOR_CLASS drops every class
 * the platform adds (`elementor-*`, `e-con*`, `e-flex`, `e-grid`, `e-parent`,
 * `swiper*`) so a live element and its static counterpart reduce to the same
 * token set; STATE_CLASS drops `is-revealed` and its family, because a class
 * that appears only once the page has settled desynchronises the ordinals and
 * manufactures differences (six false findings on solutions-b came from exactly
 * that before it was fixed). An element with no build class of its own is not
 * keyed at all: it is invisible to this instrument rather than bucketed, for
 * the same reason controlBoxes() excludes rather than buckets. */
/* Derived by enumerating every class rendered inside <main> on a live page and
 * subtracting the build's own, not guessed. On solutions-b that live-only set is
 * exactly: e-con, e-con-full, e-flex, e-lazyloaded, e-parent, elementor,
 * elementor-20596, elementor-button*, elementor-element, elementor-size-sm,
 * elementor-widget*, is-revealed, mailmunch-forms-*, attachment-large,
 * size-large. Every one is matched below.
 *
 * `^e-` rather than a list of Elementor's container classes, and the difference
 * is not cosmetic: the first version of this regex named e-con, e-flex, e-grid,
 * e-parent and e-child individually and MISSED `e-lazyloaded`, which Elementor
 * adds to most elements once they have loaded. That one token appears on the
 * live side only, so it entered the key and desynchronised it from the static
 * side wholesale: shared keys collapsed to 83 of 149 on final, 14 of 47 on
 * solutions-b and 7 of 34 on what-we-do-a, and both `.sb-research` (defect 4)
 * and `.em-stories__mini` (defect 1) dropped out of the comparison entirely
 * while the instrument reported zero differences. A gate that silently stops
 * comparing is the exact failure this project has shipped before, so the
 * exclusion is now by PREFIX and the prefix is safe: no class in css/,
 * components/ or tokens/ begins with `e-` (checked with
 * `grep -ohE '\.e-[a-z]' css/*.css components/*.css tokens/*.css`, which
 * returns nothing), and `em-` does not match `^e-` because the second character
 * must be a hyphen.
 *
 * attachment-* and size-* are WordPress's own image-size classes, present on
 * every live <img> and on no static one; excluding them makes an <img> reduce
 * to the same token set on both sides, which is none, so it is simply not keyed
 * here. controlBoxes() is the instrument that measures images. */
const PLATFORM_CLASS = /^(e-|elementor|swiper|animated|mailmunch|attachment-|size-|wp-|post|type-|status-|format-|hentry$|category-|tag-)/;
const STATE_CLASS = /^(is-|has-|js-)/;

export async function layoutInvariants(url, { width = 1440, height = 900 } = {}) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(url, { waitUntil: 'load' });
    /* Recorded rather than thrown, the same choice controlBoxes() makes and
       for the same reason: every property below is a box or a computed
       display, and none of them changes between a revealed and an unrevealed
       element except through `data-reveal="clip"`'s own transform, which the
       settle pass exists to remove. Throwing would buy nothing and cost a
       flake on the one page whose third people frame is display:none at 390
       and therefore can never intersect. */
    const unsettled = await settleReveal(page).then(() => null, (e) => e.message);
    const out = await page.evaluate(({ platformSrc, stateSrc }) => {
      const PLATFORM = new RegExp(platformSrc);
      const STATE = new RegExp(stateSrc);
      const main = document.querySelector('main');
      const res = {
        __main_height__: main ? Math.round(main.getBoundingClientRect().height * 100) / 100 : null,
        axis: {},
        painted: {},
      };
      if (!main) return res;

      const seen = {};
      for (const el of main.querySelectorAll('*')) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none') continue;
        const tokens = [...el.classList]
          .filter((c) => !PLATFORM.test(c) && !STATE.test(c))
          .sort();
        if (tokens.length === 0) continue;
        const base = tokens.join('.');
        seen[base] = (seen[base] || 0) + 1;
        const key = seen[base] > 1 ? `${base}#${seen[base]}` : base;
        const r = el.getBoundingClientRect();
        const isFlex = cs.display === 'flex' || cs.display === 'inline-flex';
        /* x is recorded for EVERY keyed element, not only for flex items, and
           that is the half of this instrument controlBoxes() structurally
           cannot have. Three of the audit's defects moved an element
           horizontally without changing its box at all, and all three sit on
           link() wrappers, which controlBoxes() skips by design
           (`el.closest('.elementor-widget-button')`). Rounded to 2dp because
           a subpixel layout legitimately produces values like 619.945. */
        res.axis[key] = {
          x: Math.round(r.x * 100) / 100,
          /* Gated: flex-direction computes on every element whatever its
             display, so an unconditional comparison reports a `display:grid`
             container whose inert flex-direction differs as a defect. Null
             on either side means the comparison is skipped. */
          dir: isFlex ? cs.flexDirection : null,
        };
        const bg = cs.backgroundColor;
        const transparent = bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent';
        /* GENERATES NO BOX AT ALL, which is not the same test as
           `display:none` above and is why that test alone was not enough.
           An element whose own display is none is skipped; an element INSIDE
           a display:none ancestor has its own display computing to whatever
           it declares, so it reaches this line, and getBoundingClientRect()
           returns all zeros for it because it was never laid out.

           For `axis` that is harmless: x reads 0 on both sides and compares
           equal. For `painted` it is not, and the reason is that `top` is the
           one field here that is not the element's own measurement. It is
           `rect.top - main's rect.top`, and with rect.top pinned at 0 the
           subtraction stops being page-relative and becomes a reading of
           where <main> happens to sit in the VIEWPORT, which is residual
           scroll position and sticky-header state and nothing about this
           element at all.

           Measured on epic-a, which is the first page in the build to carry
           a painted element inside a display:none ancestor:
           css/epic-a.css:338 hides `.epa-method__rail` at and below 720px,
           its `.epa-method__rail-fill` child declares
           `background:var(--em-orange)`, and at 390 this recorded top -165.8
           live against -149.8 static, reproducibly, on three consecutive
           runs. The 16px is css/site.css:82's
           `[data-scrolled] .em-header__bar{min-height:68px}` against the
           unscrolled 84px: settleReveal() ends with window.scrollTo(0, 0) and
           js/reveal.js flips that attribute back on the next animation frame,
           so the two sides are read on opposite sides of one rAF. Nothing
           about the page differs; the rail is hidden on both sides and paints
           nothing on either.

           A box with no area cannot uncover or cover anything, which is the
           entire purpose of the painted set (see the assertion's own comment
           in test-elementor.mjs), so excluding it loses no coverage. It is
           excluded from `painted` ONLY, not from `axis`, deliberately: the
           narrower change keeps every existing page's keyed count identical,
           which is what makes "nothing else moved" checkable rather than
           asserted. Verified against the pre-change run of the whole suite:
           keyed and painted counts are unchanged on all eight registered
           pages at both widths.

           NOT a width/height test. `.epa-method__rail-fill` at 1440 measures
           2px wide and 0px tall, because `@keyframes epa-fill` starts it at
           `scaleY(0)`, and it IS rendered and IS worth comparing there: its
           top is a real position. getClientRects().length is the test for
           "generates no boxes", and it returns 1 for that flattened box and 0
           for the same element at 390. Both confirmed live on both sides. */
        const rendered = el.getClientRects().length > 0;
        if (rendered && (!transparent || cs.backgroundImage !== 'none')) {
          /* Top measured from main's own top, not from the viewport: the two
             builds have different header heights, and this instrument is
             about whether a painted box moved relative to the page's content,
             not about where the page starts. */
          res.painted[key] = {
            top: Math.round((r.top - main.getBoundingClientRect().top) * 100) / 100,
            h: Math.round(r.height * 100) / 100,
          };
        }
      }
      return res;
    }, { platformSrc: PLATFORM_CLASS.source, stateSrc: STATE_CLASS.source });
    out.__unsettled__ = unsettled ? 'unsettled' : 'settled';
    return out;
  } finally {
    await browser.close();
  }
}

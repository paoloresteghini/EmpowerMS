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
/* THE HERO ENTRANCE INSTRUMENT, and the one measurement that would have
   caught the defect repaired on 2026-08-20: every converted page's hero
   entrance animation was dead, and nothing in this harness could see it.

   WHY THE EXISTING INSTRUMENTS COULD NOT. settleReveal() and
   checkVisibleWithJs() both answer "did everything end up visible?", and the
   broken page answered yes: js/reveal.js ran, added .is-revealed to
   everything, and left the page correct in its final state. What was wrong
   was PURELY temporal. css/motion.css nests every start-state under
   [data-reveal="on"], js/reveal.js set that attribute as its first statement,
   and js/reveal.js is deferred, so on the live install the gate landed AFTER
   first paint (measured: 392ms paint, 408ms gate on /person/kienna-horn/).
   The start state never held for a frame anyone could see. An end-state
   assertion cannot distinguish that from a working animation, so this
   function asserts on the FRAMES INSTEAD OF THE OUTCOME.

   WHY gateInMarkup IS READ OFF THE HTTP RESPONSE AND NOT OFF THE DOM. This
   is the whole reason the function intercepts the document response at all.
   js/reveal.js still sets data-reveal="on" itself, deliberately, so
   document.documentElement carries it either way and a DOM read would pass
   just as happily on the broken page as on the repaired one. Only the bytes
   the server sent can tell the two apart. A gate keyed on the DOM would be
   the probe-keying failure this repository has already shipped once.

   The three readings together are what make it red-testable: remove the
   server-side gate and gateInMarkup goes false AND hiddenAtFirstFrame goes
   false; break css/motion.css and hiddenAtFirstFrame goes false; break
   js/reveal.js and endsVisible goes false. */
export async function entranceAnimation(url, { width = 1440, height = 900 } = {}) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height } });
    /* Sampling starts before any page script has run: addInitScript is
       evaluated on the fresh document, so the first rAF this schedules is
       the first frame the document has, which is the frame the start state
       either holds in or does not. A sampler installed any later would be
       measuring after the thing it is trying to observe. */
    await page.addInitScript(() => {
      window.__entrance = [];
      const poll = () => {
        if (document.body) {
          const els = [...document.body.querySelectorAll('[data-reveal]')].slice(0, 5);
          if (els.length) window.__entrance.push(els.map(e => Number(getComputedStyle(e).opacity)));
        }
        if (performance.now() < 3000) requestAnimationFrame(poll);
      };
      requestAnimationFrame(poll);
    });

    let markup = '';
    const response = await page.goto(url, { waitUntil: 'load' });
    markup = await response.text();
    /* Long enough for --dur-reveal (600ms) plus the stagger the last of the
       five sampled elements can carry, plus the deferred script's own
       arrival on a live install. 2200ms is measured headroom, not a guess:
       the slowest of the eighteen converted pages settled by 1100ms. */
    await page.waitForTimeout(2200);

    const frames = await page.evaluate(() => window.__entrance ?? []);
    const first = frames[0] ?? [];
    const last = frames[frames.length - 1] ?? [];
    return {
      /* The <html ...> tag as the SERVER sent it. */
      gateInMarkup: /<html[^>]*\sdata-reveal="on"/.test(markup),
      noscriptFallback: /<noscript><style>\[data-reveal\]\{[^<]*opacity:1!important/.test(markup),
      frames: frames.length,
      hiddenAtFirstFrame: first.length > 0 && first.every(v => v < 0.01),
      /* A frame caught part-way through the fade. Zero of these means the
         element went from hidden to shown with no transition in between,
         which is a snap, not an animation. */
      fadeFrames: frames.filter(f => f.some(v => v > 0.001 && v < 0.999)).length,
      endsVisible: last.length > 0 && last.some(v => v > 0.99),
    };
  } finally {
    await browser.close();
  }
}

/* EVERY PHOTOGRAPH INSIDE THE MOTION LAYER ACTUALLY ARRIVED, asserted
   directly rather than inferred from a height.

   WHY THIS EXISTS SEPARATELY FROM layoutInvariants(). On 2026-08-20 two
   photographs went missing from the live site (/epic/ and /newsletter/ at
   390px) and layoutInvariants() did catch it -- as a main-height difference
   of 256.5px and 456px. That is a true red with the wrong subject: it says
   "this page is the wrong height", and a person reading it starts looking at
   layout. It took a per-element diff and a network log to turn that into "a
   photograph is missing". A missing photograph is user-visible on its own
   terms and deserves a failure that says so.

   It also covers what a height check structurally cannot: an image that fails
   to load inside a container that is already sized by aspect-ratio, or beside
   content taller than itself, costs the page no height at all and is
   invisible to every box comparison in this harness.

   ONE BROWSER FOR THE WHOLE SET, page per url: this is called with the full
   converted-page list, and launching Chromium seventeen times to ask one
   question per page is most of the runtime for none of the value.

   THE SCROLL IS NOT OPTIONAL. These are loading="lazy" images below the fold;
   a page that is never scrolled has a legitimate reason not to have fetched
   them, and asserting on an unscrolled page would fail on correct pages. */
export async function unloadedRevealImages(urls, { width = 390, height = 844 } = {}) {
  const browser = await chromium.launch();
  try {
    const out = [];
    for (const url of urls) {
      const page = await browser.newPage({ viewport: { width, height } });
      try {
        await page.goto(url, { waitUntil: 'load' });
        await page.evaluate(async () => {
          const step = window.innerHeight;
          for (let y = 0; y < document.body.scrollHeight; y += step) {
            window.scrollTo(0, y);
            await new Promise((r) => requestAnimationFrame(r));
          }
          window.scrollTo(0, document.body.scrollHeight);
          await new Promise((r) => setTimeout(r, 250));
        });
        /* After the scroll, not during it: a lazy fetch started at the bottom
           of the loop needs time to come back over the network, and this is
           run against a live install rather than a local file. */
        await page.waitForTimeout(1500);
        const missing = await page.$$eval('[data-reveal] img', (imgs) => imgs
          /* AN IMAGE THAT IS NOT RENDERED CANNOT BE A MISSING PHOTOGRAPH, and
             leaving this out made the gate's first run red on the homepage
             for a correct page: css/option-a.css:446 sets
             .fp-hero__aside{display:none} at the narrow breakpoint, by design
             ("an inset photo over a full-width picture just covers the
             subject's face"), so the browser rightly never fetches it.

             checkVisibility() and not a zero-area test, and the distinction
             is the whole point: the epic-a defect this gate exists for
             presents as an image that IS rendered, with a real 342x257 box
             from its aspect-ratio, and no pixels in it. A zero-area filter
             would have skipped exactly the case being caught. Opacity is
             deliberately not passed as an option: every element here is
             mid-reveal by nature and opacity 0 is its normal resting state
             before it is scrolled to. */
          .filter((i) => i.checkVisibility())
          /* naturalWidth, not .complete: a decode that failed reports
             complete true with naturalWidth 0, which is the same missing
             photograph to a visitor. */
          .filter((i) => !(i.complete && i.naturalWidth > 0))
          .map((i) => (i.getAttribute('src') || '(no src)').split('/').pop().split('?')[0]));
        out.push({ url, missing });
      } finally {
        await page.close();
      }
    }
    return out;
  } finally {
    await browser.close();
  }
}

/* THE MOTION LAYER'S INVENTORY, counted off the live page so it can be
   compared against what this repository actually deploys.

   WHY IT EXISTS. Every other reveal instrument here asks whether the elements
   that ARE marked up animate correctly. None of them notices an element that
   has quietly stopped being marked up at all. That is not hypothetical: 331 of
   these attributes live on Elementor wrappers as Custom Attributes (Advanced ->
   Attributes) and the rest are baked inside html() widgets' raw markup, so
   deleting a widget and adding a replacement, or editing an HTML widget's
   markup in the editor, silently drops the attribute. The page keeps working,
   the suite stays green, and one element stops animating. Asked for by Paolo
   on 2026-08-20 after exactly that question.

   SCOPED TO <main>, because the header and footer are site-wide theme parts
   rendered outside it (header.php opens <main> after the header location,
   footer.php closes it before the footer location). Their reveals belong to
   the theme parts' own gates, not to any one page's inventory.

   LOOP DESCENDANTS COUNTED SEPARATELY, and this is what removes the need for
   any hand-written exemption. A Loop Grid renders one template N times, so
   content-a carries 205 in-loop reveals against 23 authored cards in its
   static counterpart, which is precisely why that page is in EXCLUDED_PAGES
   for every other comparison. Splitting on .elementor-loop-container lets the
   authored part of every page, loop pages included, be compared exactly,
   while the loop part gets the coarse non-zero check its N-fold repetition
   can support.

   THREE COUNTS AND NOT ONE. They fail differently and the difference is the
   diagnosis: `reveal` is the animation itself, `group` is the stagger (lose it
   and a row fires all at once instead of in sequence), `entrance` is the
   above-the-fold choreography (lose it and the hero reveals off the scroll
   observer instead of on load). */
export async function revealInventory(urls, { width = 1440, height = 900 } = {}) {
  const browser = await chromium.launch();
  try {
    const out = [];
    for (const url of urls) {
      const page = await browser.newPage({ viewport: { width, height } });
      try {
        await page.goto(url, { waitUntil: 'load' });
        out.push({ url, ...await page.evaluate(() => {
          const main = document.querySelector('main');
          if (!main) return { reveal: null, group: null, entrance: null, inLoop: null, loops: null };
          const inLoop = (el) => !!el.closest('.elementor-loop-container');
          const all = [...main.querySelectorAll('[data-reveal]')];
          return {
            reveal: all.filter((el) => !inLoop(el)).length,
            group: [...main.querySelectorAll('[data-reveal-group]')].filter((el) => !inLoop(el)).length,
            entrance: [...main.querySelectorAll('[data-reveal-entrance]')].filter((el) => !inLoop(el)).length,
            inLoop: all.filter(inLoop).length,
            loops: main.querySelectorAll('.elementor-loop-container').length,
          };
        }) });
      } finally {
        await page.close();
      }
    }
    return out;
  } finally {
    await browser.close();
  }
}

/* The same three counts, taken off an element tree this repository builds
   rather than off a rendered page. Pure, so it is unit-tested directly.

   COUNTED OFF JSON, WHICH IS SAFE HERE AND WOULD NOT BE OFF THE SOURCE FILE.
   These modules carry long prose comments that mention data-reveal many times
   over (js/reveal.js's contract, why an attribute sits where it does); a grep
   of the .mjs would count the prose. JSON.stringify sees only the built
   objects, so comments cannot reach it.

   TWO SHAPES, ONE COUNT. The same attribute is written two ways depending on
   where it lands: `data-reveal|rise` inside an Elementor _attributes string,
   and `data-reveal="rise"` inside an html() widget's raw markup. Bare forms
   with no value occur too (`data-reveal-group` in markup, `data-reveal-group|`
   in _attributes). Matching the NAME and excluding a following name character
   is what covers all four without four patterns, and the negative lookahead is
   what stops `data-reveal` from also counting every `data-reveal-group`. An
   earlier version counted the valued forms and then subtracted the group and
   entrance totals, which double-corrected and undercounted every page. */
export function treeRevealInventory(tree) {
  const json = JSON.stringify(tree);
  const count = (re) => (json.match(re) || []).length;
  return {
    reveal: count(/data-reveal(?![-\w])/g),
    group: count(/data-reveal-group/g),
    entrance: count(/data-reveal-entrance/g),
  };
}

/* WHAT ELEMENTOR'S OWN ENTRANCE ANIMATIONS ACTUALLY DO on a rendered page,
   measured rather than read off a stylesheet.

   WHY THIS IS A LIVE MEASUREMENT AND NOT A STRING ASSERTION ON bridge.css.
   The block at the end of css/bridge.css redefines the @keyframes Elementor
   ships, so that a section Empower add through the editor after hand-off
   animates like the rest of the site. Whether it WINS is a cascade question
   with two ways to fail that a source assertion cannot see:

     1. Elementor loads its animation CSS ON DEMAND, one file per animation
        (fadeInUp.min.css, zoomIn.min.css), only when some element on the page
        uses that animation. Two @keyframes of the same name is a
        last-one-wins contest with no specificity involved, so if Elementor's
        file ever landed after bridge.css the override would silently do
        nothing and the stylesheet would still contain every rule a grep
        would look for.
     2. bridge.css also sets a duration on `.animated`, and because it loads
        last, a bare selector there would beat Elementor's own
        `.animated-slow`/`.animated-fast` and quietly disable the editor's
        Animation Duration dropdown. Nothing about that is visible in either
        stylesheet on its own; it only exists in the combination.

   TRAVEL IS READ OFF THE MATRIX, NOT OFF THE KEYFRAME TEXT. The difference
   this defends is between a flat 20px and 100% of the element's own height,
   and the only honest way to know which one a browser is running is to
   sample the transform while it runs. The fixture's containers are 400px
   tall for exactly this reason; its own header records why. */
export async function nativeAnimation(url, { width = 1440, height = 900 } = {}) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.addInitScript(() => {
      window.__na = [];
      const poll = () => {
        for (const el of document.querySelectorAll('[class*="zzp-"]')) {
          const key = [...el.classList].find((c) => c.startsWith('zzp-'));
          const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
          window.__na.push({ key, y: m.m42, h: el.getBoundingClientRect().height });
        }
        if (performance.now() < 12000) requestAnimationFrame(poll);
      };
      requestAnimationFrame(poll);
    });
    await page.goto(url, { waitUntil: 'load' });

    /* EACH PROBE MUST BE SCROLLED TO, and this is not incidental setup.
       Elementor's entrance animation is triggered on viewport entry: until
       then the element carries `elementor-invisible` and no `.animated`
       class at all, so its computed animation-duration reads 0s. The
       fixture's three containers are 400px tall each, so the third is below
       the fold on load. The first version of this function read the page
       without scrolling and the Slow probe reported 0s, which the gate
       correctly rejected -- as a bug in the measurement, not in bridge.css.
       Sampling continues throughout, so each animation is caught while it
       runs rather than after it has settled. */
    for (const key of ['zzp-fadeinup', 'zzp-zoomin', 'zzp-slow']) {
      await page.evaluate((k) => document.querySelector(`.${k}`)?.scrollIntoView({ block: 'center' }), key);
      /* Longer than the slow probe's own 2s, so its duration is readable and
         its travel has been sampled before the next scroll moves on. */
      await page.waitForTimeout(2400);
    }

    const frames = await page.evaluate(() => window.__na ?? []);
    const computed = await page.evaluate(() => {
      const read = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const cs = getComputedStyle(el);
        return { duration: cs.animationDuration, name: cs.animationName, easing: cs.animationTimingFunction };
      };
      /* The effective @keyframes for a name is the LAST one defined across
         all sheets, which is precisely the thing at risk here, so the sheet
         that supplied it is reported rather than just its content. */
      const winner = (name) => {
        let found = null;
        for (const sheet of document.styleSheets) {
          let rules;
          try { rules = sheet.cssRules; } catch { continue; }
          for (const rule of rules) {
            if (rule.type === CSSRule.KEYFRAMES_RULE && rule.name === name) {
              found = { sheet: (sheet.href || 'inline').split('/').pop().split('?')[0],
                from: rule.cssRules[0]?.style.cssText ?? '' };
            }
          }
        }
        return found;
      };
      return {
        fadeInUp: read('.zzp-fadeinup'), zoomIn: read('.zzp-zoomin'), slow: read('.zzp-slow'),
        winningFadeInUp: winner('fadeInUp'), winningZoomIn: winner('zoomIn'),
      };
    });

    const peak = (key) => {
      const rows = frames.filter((f) => f.key === key);
      return { travel: Math.round(Math.max(0, ...rows.map((f) => Math.abs(f.y))) * 10) / 10,
        height: Math.round(Math.max(0, ...rows.map((f) => f.h))) };
    };
    return { ...computed, travel: { fadeInUp: peak('zzp-fadeinup'), slow: peak('zzp-slow') }, frames: frames.length };
  } finally {
    await browser.close();
  }
}

/* DOES THE HEADER EVER RENDER AT THE WRONG SIZE, sampled frame by frame from
   before the document has run anything of its own.

   WHY AN END-STATE READING CANNOT ANSWER THIS. The header settles correctly
   either way: the panels close, the search bar closes, and every existing
   header assertion in this suite passes on the broken page. What was wrong
   was a WINDOW -- between first paint and two deferred scripts running, the
   header laid out at 727px with five dropdown panels and the search bar open,
   then collapsed to 137px. Same class of defect as the dead entrance
   animation, same reason nothing caught it, and the same answer: sample the
   frames instead of the outcome.

   maxHeight IS THE ASSERTION AND panelFrames IS THE DIAGNOSIS. A header that
   is briefly enormous is the defect a visitor sees; the panel count says
   which of the two scripts was responsible. Both are reported so a failure
   does not need a second run to interpret. */
export async function headerSettle(url, { width = 1440, height = 900 } = {}) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.addInitScript(() => {
      window.__hs = [];
      const poll = () => {
        const header = document.querySelector('.em-header');
        if (header) {
          window.__hs.push({
            h: header.getBoundingClientRect().height,
            panels: [...document.querySelectorAll('.em-header__menu')]
              .filter((el) => el.getBoundingClientRect().height > 0).length,
            search: (document.getElementById('site-search')?.getBoundingClientRect().height ?? 0) > 0,
          });
        }
        if (performance.now() < 4000) requestAnimationFrame(poll);
      };
      requestAnimationFrame(poll);
    });
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    const frames = await page.evaluate(() => window.__hs ?? []);
    const heights = frames.map((f) => f.h);
    return {
      frames: frames.length,
      maxHeight: Math.round(Math.max(0, ...heights)),
      /* The last sampled frame, which is the header at rest and the number
         every other reading is judged against. */
      restHeight: Math.round(frames.length ? frames[frames.length - 1].h : 0),
      panelFrames: frames.filter((f) => f.panels > 0).length,
      searchFrames: frames.filter((f) => f.search).length,
    };
  } finally {
    await browser.close();
  }
}

/* The utility bar at a given width: how tall, how many flex items it still
   has, and whether the email is rendered.

   THREE READINGS BECAUSE THE FIX HAS TWO HALVES AND THEY LIVE IN DIFFERENT
   FILES. css/header-2.css hides the anchor, which is the whole fix in the
   static build. On the install the flex child is an Elementor text-editor
   wrapper, not the anchor, so hiding the anchor alone leaves a zero-width item
   still contributing the row's gap; css/bridge.css hides that wrapper.
   `emailShown` catches the first half regressing, `items` catches the second,
   and `height` is what a visitor actually experiences. Asserting only on the
   email would pass on a bar still carrying a phantom column. */
export async function utilityBar(url, widths = [1440, 390]) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'load' });
    const out = {};
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      /* A settle beat: the change is a media query, so layout has to be
         recomputed before any of this is meaningful. */
      await page.waitForTimeout(180);
      out[width] = await page.evaluate(() => {
        const bar = document.querySelector('.em-utility__bar');
        const link = document.querySelector('.em-utility__link');
        if (!bar) return null;
        return {
          height: Math.round(bar.getBoundingClientRect().height),
          emailShown: !!link && getComputedStyle(link).display !== 'none',
          items: [...bar.children].filter((c) => getComputedStyle(c).display !== 'none').length,
        };
      });
    }
    return out;
  } finally {
    await browser.close();
  }
}

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

/* checkFilter's bigger sibling, written for content-a, whose filter is two
   RADIO groups rather than one checkbox group and whose hides act on three
   different kinds of element: a chosen type hides whole bands, a chosen topic
   hides individual cards, and three type-and-topic pairs hold nothing at all
   and reveal a written empty state instead.

   WHY A SECOND FUNCTION RATHER THAN AN OPTION ON checkFilter. That one models
   a filter as "toggle one control, read one attribute off the items, untoggle,
   read again", which is the whole of podcast-a's facet and none of this one.
   Here the two groups interact (css/content-a.css:340 hides three whole bands
   when Bill Summaries is chosen, because bill summaries are written as
   articles), so what has to be asserted is a SEQUENCE OF STATES, each read
   across three selectors. Bending checkFilter into that shape would have made
   both callers harder to read than two functions that each do one thing.

   THIS FUNCTION MAKES NO ASSERTIONS AND KNOWS NOTHING ABOUT content-a. It
   drives the states it is given and reports what it saw; every expectation
   lives in test-elementor.mjs, where a reader can see the filter's rules and
   its measured behaviour next to each other.

   `steps` is a list of { name, check: [radioId, ...] }. Each step chooses its
   radios IN ORDER and then reads the page. Radios are never unchecked (that is
   not a thing a radio group does); a step returns to the unfiltered state by
   choosing the group's own "all" control, which is exactly how a visitor does
   it and is what proves the do-nothing states really do nothing.

   IT CLICKS THE LABEL, NOT THE INPUT, and that is not a convenience. This
   filter's radios are `position:absolute;width:1px;height:1px;opacity:0;
   pointer-events:none` (css/content-a.css:133-134), clipped behind their own
   labels on purpose so that they stay in the tab order and on the
   accessibility tree while the LABEL is what a visitor sees and hits. A click
   aimed at the input lands on whatever is underneath it, so Playwright's own
   check() reports "clicking the checkbox did not change its state", which is
   the harness describing the design correctly rather than a page defect. The
   label is the control, so the label is what this clicks.

   AND IT ASSERTS THE STATE WAS ENTERED, in the same evaluate, which is recipe
   step 8's standing rule. A click that silently failed to land would otherwise
   read as a filter that hides nothing, which is the exact defect this function
   exists to catch: the two are indistinguishable from the outside.

   `{ force: true }` and `waitUntil: 'load'` are checkFilter's, for the reasons
   its own comment gives at length: the install runs a MailMunch popup that
   covers the viewport a few seconds after load and blocks real mouse
   interaction site-wide, which is a live third-party defect this conversion
   did not introduce and cannot fix from its own markup. */
export async function checkRadioFilter(url, { steps, bandSelector, cardSelector, emptySelector }) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(url, { waitUntil: 'load' });

    /* Read in ONE evaluate per step, so every number in a step's row is
       measured at the same moment. Reading them one call at a time would let
       the popup, a lazy image or a reveal land between two reads and produce a
       row that never existed on the page. */
    const read = () => page.evaluate(({ band, card, empty }) => {
      const shown = (sel) => [...document.querySelectorAll(sel)]
        .filter((e) => getComputedStyle(e).display !== 'none');
      const bands = shown(band);
      const cards = shown(card);
      const emptyEls = document.querySelectorAll(empty);
      return {
        bands: bands.length,
        bandTypes: bands.map((e) => e.getAttribute('data-type')),
        /* Cards inside a hidden band have display:block of their own but are
           not rendered, so a bare display test over-counts. offsetParent is
           null for anything with a display:none ancestor, which is the
           question the filter is actually about. */
        cards: cards.filter((e) => e.offsetParent !== null).length,
        cardTopics: [...new Set(
          cards.filter((e) => e.offsetParent !== null)
            .map((e) => e.getAttribute('data-topic')),
        )].sort(),
        cardsWithoutTopic: cards.filter((e) => e.offsetParent !== null && !e.getAttribute('data-topic')).length,
        emptyTotal: emptyEls.length,
        emptyShown: [...emptyEls].filter((e) => getComputedStyle(e).display !== 'none').length,
      };
    }, { band: bandSelector, card: cardSelector, empty: emptySelector });

    const out = [];
    for (const step of steps) {
      for (const id of step.check) {
        await page.click(`label[for="${id}"]`, { force: true });
        const checked = await page.$eval(`#${id}`, (el) => el.checked);
        if (!checked) {
          throw new Error(`checkRadioFilter: clicking label[for="${id}"] did not check #${id}, so the state under test was never entered`);
        }
      }
      out.push({ name: step.name, ...await read() });
    }
    return out;
  } finally {
    await browser.close();
  }
}

/* podcast-a's guest filter, which is checkboxes rather than content-a's radios
   and needs a different reading.

   WHY NOT checkRadioFilter(). That helper reads bands, data-topic and an empty
   state, none of which podcast-a has, and it treats every step as additive
   because a radio group cannot be un-picked. A checkbox can, and un-checking is
   half of what this filter promises, so a step here TOGGLES and records the
   state it produced.

   WHAT THE FILTER ACTUALLY DOES, read off css/podcast-a.css:248-251 rather than
   assumed. The rules hide `.pca-ep[data-guest="x"]` only when SOME guest box is
   checked and x's own box is not. A card carrying no data-guest at all is
   matched by none of the three selectors, so it stays visible under every
   combination. That is why untagged cards are counted separately here instead of
   being folded into the total: on this install 57 of 66 episodes are untagged,
   and a check that expected them to disappear would report Empower's tagging gap
   as a conversion defect.

   force: true on the click, for the reason checkRadioFilter uses it: the install
   serves a Mailchimp popup that covers the viewport seconds after load and
   intercepts pointer events. */
export async function checkGuestFilter(url, { steps, cardSelector, facetSelector }) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(url, { waitUntil: 'load' });

    const read = () => page.evaluate(({ card, facet }) => {
      const cards = [...document.querySelectorAll(card)];
      /* offsetParent, not display, for the reason checkRadioFilter records: a
         card inside a hidden ancestor keeps its own display value. */
      const visible = cards.filter((e) => e.offsetParent !== null);
      const byGuest = {};
      for (const e of visible) {
        const g = e.getAttribute('data-guest') || '(untagged)';
        byGuest[g] = (byGuest[g] || 0) + 1;
      }
      return {
        total: cards.length,
        visible: visible.length,
        byGuest,
        facets: document.querySelectorAll(facet).length,
        checked: [...document.querySelectorAll(facet)].filter((e) => e.checked).map((e) => e.id).sort(),
      };
    }, { card: cardSelector, facet: facetSelector });

    const out = [{ name: 'start', ...await read() }];
    for (const step of steps) {
      for (const id of step.toggle) {
        const before = await page.$eval(`#${id}`, (el) => el.checked);
        await page.click(`label[for="${id}"]`, { force: true });
        const after = await page.$eval(`#${id}`, (el) => el.checked);
        if (after === before) {
          throw new Error(
            `checkGuestFilter: clicking label[for="${id}"] left #${id} at checked=${after}, `
            + 'so the state under test was never entered',
          );
        }
      }
      out.push({ name: step.name, ...await read() });
    }
    return out;
  } finally {
    await browser.close();
  }
}

/* Reads /team/'s two Loop Grids as data: who is in each, in what order, with
   what role, where each card points, and where the ledger's hairlines land.
   Nothing here decides whether any of it is CORRECT; the test that calls it
   does, and it does so against rules rather than against a list of names,
   because the names are Empower's to change in wp-admin and a test that
   hard-codes them goes red on a hire.

   waitUntil: 'load', not 'networkidle', for the reason checkFilter's own
   comment gives: the live install's third-party scripts (MailMunch, a Facebook
   pixel, Cloudflare) keep the network non-idle well past Playwright's default
   timeout.

   THE BORDERS ARE READ AS COMPUTED VALUES, IN DOCUMENT ORDER, because the
   defect this exists to catch is positional: `.ta-ledger__row:last-child`
   matches every row once each row is the only child of its own loop item
   (elementor/pages/team-a/03-fellows.mjs's note 1 predicted it, bridge.css
   block 59 repairs it), and a repair that stops working would show as five
   hairlines where the design has one. A count of rows would not see it. */
export async function teamRoster(url) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(url, { waitUntil: 'load' });

    /* AWAITED, not returned unawaited: the finally below closes the browser, and
       a returned-but-unresolved evaluate() races it and fails with "Target
       page, context or browser has been closed". Caught the first time this
       helper ran. */
    return await page.evaluate(() => {
      const txt = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);

      const staff = [...document.querySelectorAll('.ta-person')].map((card) => {
        const link = card.querySelector('a.ta-person__link');
        const img = card.querySelector('.ta-portrait img');
        return {
          name: txt(card.querySelector('.ta-person__name')),
          role: txt(card.querySelector('.ta-person__title')),
          href: link ? link.getAttribute('href') : null,
          more: txt(card.querySelector('.ta-person__more')),
          img: img ? img.getAttribute('src') : null,
          imgW: img ? Math.round(img.getBoundingClientRect().width) : null,
          imgH: img ? Math.round(img.getBoundingClientRect().height) : null,
          imgFit: img ? getComputedStyle(img).objectFit : null,
        };
      });

      const fellows = [...document.querySelectorAll('.ta-ledger__row')].map((row) => {
        const img = row.querySelector('.ta-disc img');
        const cs = getComputedStyle(row);
        return {
          name: txt(row.querySelector('.ta-ledger__name')),
          field: txt(row.querySelector('.ta-ledger__field')),
          img: img ? img.getAttribute('src') : null,
          borderBottom: cs.borderBottomWidth,
          tracks: cs.gridTemplateColumns.split(' ').length,
        };
      });

      /* The board is still hand-written markup with monogram tiles, and its
         own `.ta-pending` note says so. Read so the test can assert the note
         moved with the placeholders rather than being deleted with them. */
      const board = [...document.querySelectorAll('.ta-roll__item')].map((li) => txt(li.querySelector('.ta-roll__name')));

      return {
        staff,
        fellows,
        board,
        note: txt(document.querySelector('.ta-note')),
        pending: txt(document.querySelector('.ta-pending')),
        pendingInBoard: !!document.querySelector('.ta-board .ta-pending'),
      };
    });
  } finally {
    await browser.close();
  }
}

/* Reads one `person` single as data: which of the design's optional blocks are
   present, where the two back links go, and whether the page's own stylesheet
   arrived. Called once per person by the test, because the whole point of the
   Single template is that eighteen different records go through it and the
   parts that vary are exactly the parts that can be wrong.

   THE STYLESHEET IS READ AS A COMPUTED VALUE, NOT AS A <link> IN THE HEAD.
   `.tp-role`'s colour comes from css/team-bio.css and from nothing else, so a
   page that lost its stylesheet reports the UA default here. That is the check
   that would have caught seventeen bios shipping unstyled while Grant Callen's
   shipped correctly through a slug collision, which is the defect this helper
   was written after. A <link> check would have passed on the collision too. */
export async function personSingle(url) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(url, { waitUntil: 'load' });

    return await page.evaluate(() => {
      const txt = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);
      const h1 = document.querySelector('h1#bio-title');
      const img = document.querySelector('.tp-portrait img');
      const role = document.querySelector('.tp-role');
      const bio = document.querySelector('.tp-bio');

      return {
        h1: txt(h1),
        h1Count: document.querySelectorAll('h1').length,
        labelledBy: document.querySelector('.tp-profile')?.getAttribute('aria-labelledby') ?? null,
        role: txt(role),
        /* Read off the element the stylesheet is the only source for. */
        roleColor: role ? getComputedStyle(role).color : null,
        portrait: img ? img.getAttribute('src') : null,
        portraitFit: img ? getComputedStyle(img).objectFit : null,
        portraitBorder: img ? getComputedStyle(img.closest('.tp-portrait')).borderTopWidth : null,
        contact: !!document.querySelector('.tp-contact'),
        mailto: document.querySelector('.tp-contact a')?.getAttribute('href') ?? null,
        pending: !!document.querySelector('.tp-contact__pending'),
        bioParagraphs: bio ? bio.querySelectorAll('p').length : 0,
        bioColor: bio ? getComputedStyle(bio.querySelector('p') ?? bio).lineHeight : null,
        share: !!document.querySelector('.sfsi_Sicons, .sfsibeforpstwpr, .sfsiaftrpstwpr'),
        backLinks: [...document.querySelectorAll('.tp-back, .tp-more__link')].map((a) => a.getAttribute('href')),
        cta: document.querySelector('.tp-profile__actions a')?.getAttribute('href') ?? null,
      };
    });
  } finally {
    await browser.close();
  }
}

/* Asks the DOCUMENT what is under the pointer at given points inside a card,
   which is the only way to check a whole-plate click target.
   `.da-door h3 a::after{inset:0}` and its cousins make a whole card one click
   target while keeping exactly one anchor in the accessibility tree. When
   Elementor's widget wrapper captures the overlay's containing block, EVERY
   element is still present, every class still matches and every computed
   property still agrees with the static build; what changes is which box the
   overlay is sized against. A census, a box sweep and a computed-style probe
   all pass over the defect, and the card looks correct because the heading text
   still navigates and the hover animation still fires (it is driven by
   `.da-door:hover`, not by the anchor).

   So this hit-tests instead. Each probe is a selector INSIDE the card; the
   answer is the href of the anchor the point resolves into, or a description of
   whatever non-anchor element is on top.

   SCROLLED INTO VIEW FIRST, AND THAT IS LOAD-BEARING: elementFromPoint is
   viewport-relative and returns null for a point below the fold, which reads as
   "no anchor here" and is indistinguishable from the defect. The first run of
   this helper returned null for every probe on a page whose cards were simply
   further down. */
export async function clickTargets(url, { cardSelector, probeSelectors, width = 1440 }) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    await page.goto(url, { waitUntil: 'load' });

    const cards = await page.$$(cardSelector);
    const out = [];

    for (const card of cards) {
      /* PLAYWRIGHT'S OWN SCROLL, NOT Element.scrollIntoView() INSIDE evaluate().
         The in-page call was the first implementation and it silently did
         nothing on this install: measured at `load`, window.scrollY stayed 0
         through three scrollIntoView() calls and every probe came back with a
         point 1200-1600px below a 1000px viewport, so elementFromPoint returned
         null for all six. That reads as "no anchor here", which is exactly what
         the defect this helper exists to find looks like — a false RED, which
         is the same class of error as a false green and harder to notice
         because it points at real code.

         THE CAUSE, confirmed afterwards rather than left as a mystery: this
         install runs a Mailchimp popup that opens a second or two after load
         and LOCKS SCROLLING while it is up. An in-page scrollIntoView() against
         a locked document silently does nothing and reports no error, so the
         probe points stayed where they were. Any browser check against this
         install that scrolls has the same exposure.

         scrollIntoViewIfNeeded() is an auto-waiting Playwright action: it waits
         for the element to be stable before and after scrolling, so the
         measurement below runs against settled layout rather than against
         whatever the page looked like mid-load, and it fails loudly instead of
         quietly not moving. */
      await card.scrollIntoViewIfNeeded();

      const result = await card.evaluate((el, probeSelectors) => {
        const anchor = el.querySelector('a[href]');
        const probes = {};
        for (const sel of probeSelectors) {
          const target = el.querySelector(sel);
          if (!target) { probes[sel] = 'MISSING'; continue; }
          const r = target.getBoundingClientRect();
          if (!r.width || !r.height) { probes[sel] = 'ZERO-SIZED'; continue; }
          const x = r.left + r.width / 2;
          const y = r.top + r.height / 2;
          /* Reported distinctly from a real miss, and the caller MUST treat it
             as a broken measurement rather than as a failed assertion: a point
             outside the viewport is not evidence about the click target. */
          if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) {
            probes[sel] = `UNMEASURABLE:point ${Math.round(x)},${Math.round(y)} outside ${window.innerWidth}x${window.innerHeight} viewport`;
            continue;
          }
          const hit = document.elementFromPoint(x, y);
          if (!hit) { probes[sel] = 'UNMEASURABLE:elementFromPoint returned null inside the viewport'; continue; }
          const a = hit.closest('a[href]');
          probes[sel] = a
            ? a.getAttribute('href')
            : `NO-ANCHOR:${hit.tagName.toLowerCase()}.${(hit.className || '').toString().split(' ')[0]}`;
        }
        return { href: anchor ? anchor.getAttribute('href') : null, probes };
      }, probeSelectors);

      /* Fail here rather than returning an unmeasurable value for a caller to
         assert against. This helper's contract is "what is under this point";
         if it could not look, that is its own bug, not a finding about the
         page. */
      for (const [sel, value] of Object.entries(result.probes)) {
        if (String(value).startsWith('UNMEASURABLE:')) {
          throw new Error(
            `clickTargets: could not hit-test ${sel} inside ${cardSelector} — ${String(value).slice('UNMEASURABLE:'.length)}. `
            + 'The measurement is broken; this is not a statement about the page.',
          );
        }
      }

      out.push(result);
    }

    return out;
  } finally {
    await browser.close();
  }
}

/* Scrolls, then reports where the named sticky elements actually sat.
   THE ONLY FUNCTION IN THIS FILE THAT SCROLLS, and it exists because that was a
   blind spot with a cost. `position:sticky` fails when an ancestor gives it
   nowhere to travel, and when it fails EVERY computed value still matches the
   static build: `position` is `sticky`, `top` is the authored offset, the
   element is present and correctly classed. census(), controlBoxes(),
   computedStyles() and layoutInvariants() all measure at scroll position 0,
   where a sticky element and a static one are indistinguishable. The site
   header was not sticky on any converted page for fourteen conversions and
   nothing here reported it.

   Returns the element's viewport `top` after scrolling, which is the whole
   test: a stuck element sits at its own `top` offset, an unstuck one is
   somewhere far negative.

   NOT waitUntil:'networkidle', for the reason checkFilter's comment gives (the
   install's third-party scripts never let the network idle), and the scroll is
   done with window.scrollTo rather than an element method because there is no
   element to scroll to — the question is what happens at an arbitrary depth. */
/* Below this much available scroll, a page cannot demonstrate stickiness: the
   header is 113px, so a document offering less than roughly three times that
   never moves the element far enough for "still at top:0" to mean anything. */
const MIN_USEFUL_SCROLL = 400;

export async function stickyAfterScroll(url, probes, { scrollY = 2000, width = 1440, height = 900 } = {}) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(url, { waitUntil: 'load' });
    /* CLAMPED TO WHAT THE DOCUMENT ACTUALLY HAS, then checked against the
       clamp rather than against the request. A short page cannot scroll 2000px
       and that is not a finding about stickiness: /grant-callen/ is one bio and
       offers 907px, which the first version of this helper reported as "the
       document did not scroll". Two different situations were producing one
       error, so the clamp separates them: falling short of the CLAMP means
       something is holding the document, falling short of the REQUEST just
       means the page is short.

       The install runs a Mailchimp popup that can lock scrolling once it opens,
       so the scroll happens before it appears and the result is verified. */
    const target = await page.evaluate((y) => {
      const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const to = Math.min(y, max);
      window.scrollTo(0, to);
      return { to: Math.round(to), max: Math.round(max) };
    }, scrollY);
    await page.waitForTimeout(700);

    const out = await page.evaluate(({ probes, scrollY }) => {
      const reached = Math.round(window.scrollY);
      const res = { scrollY: reached, requestedScrollY: scrollY, elements: {} };
      for (const sel of probes) {
        const el = document.querySelector(sel);
        if (!el) { res.elements[sel] = null; continue; }
        const cs = getComputedStyle(el);
        res.elements[sel] = {
          top: Math.round(el.getBoundingClientRect().top),
          height: Math.round(el.getBoundingClientRect().height),
          position: cs.position,
          cssTop: cs.top,
          parentHeight: el.parentElement ? Math.round(el.parentElement.getBoundingClientRect().height) : null,
        };
      }
      return res;
    }, { probes, scrollY });

    if (out.scrollY < target.to * 0.9) {
      throw new Error(
        `stickyAfterScroll: the document offers ${target.max}px of scroll, this asked for ${target.to} and `
        + `reached ${out.scrollY}. Something is holding the document, so nothing measured here is a `
        + 'statement about stickiness. On this install the usual cause is the Mailchimp popup locking '
        + 'scroll once it opens.',
      );
    }

    /* A page that barely scrolls cannot demonstrate stickiness either way: if
       the whole travel is shorter than the element itself, "still visible" is
       not evidence. Reported as an unusable measurement rather than a pass. */
    if (target.max < MIN_USEFUL_SCROLL) {
      throw new Error(
        `stickyAfterScroll: this page offers only ${target.max}px of scroll, which is too little to show `
        + `whether an element sticks (need at least ${MIN_USEFUL_SCROLL}px). Point this at a longer page.`,
      );
    }

    out.availableScroll = target.max;
    return out;
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
    for (const { name, selector, property, pseudo = null } of probes) {
      /* `pseudo` is optional and defaults to null, which is exactly what
         getComputedStyle's second argument means when it is omitted, so every
         probe written before it existed reads identically.

         IT EXISTS BECAUSE A GENERATED BOX CAN BE A LAYOUT PARTICIPANT that no
         element selector can reach. Beaver's `.fl-post-grid::before/::after`
         clearfix pair are inert while their parent is a block box and become
         two blank grid items the moment it is a grid; the only way to assert
         they are gone is to read the pseudo-element's own `content`. */
      out[name] = await page.$eval(
        selector,
        (el, [prop, pseudoEl]) => getComputedStyle(el, pseudoEl).getPropertyValue(prop).trim(),
        [property, pseudo],
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
      /* 40, NOT 20, WIDENED 2026-08-19 BY TASK 18 AFTER A 20-CHARACTER PREFIX
         PAIRED TWO DIFFERENT ELEMENTS. census() above has always used 40; this
         was the only place in the file still cutting at 20, and the two
         instruments now agree.

         What went wrong, which is the reason this is a fix and not a tidy-up.
         An identity here has to do two jobs: name the element for a human
         reading a failure, and PAIR the element with its counterpart on the
         other side. The second job is the one a short prefix breaks.
         dist/work.html's header logo is `<a class="em-header__logo" href="/"
         aria-label="Empower Mississippi home">`, and that page's own content
         carries `<a class="sol-stub__title">Empower Mississippi Releases New
         Research to Help Determine Why More Mississippians Aren't in the
         Workforce</a>`. Cut at 20 both are `Empower Mississippi `, so the
         static side emitted `a|Empower Mississippi ` (the header, first in
         DOM order) and `a|Empower Mississippi #2` (the stub title), while the
         live side, whose header is an Elementor theme part with different
         markup, emitted only ONE such element and it took the unsuffixed key.
         The comparison then measured the static HEADER LOGO against the live
         STUB TITLE and reported 232x52 against 363x63 as a defect. Both real
         elements are identical on both sides at 363x63; the difference was
         manufactured entirely by the key.

         WHY THE DEDUPE SUFFIX CANNOT FIX THIS, recorded so nobody tries. The
         `#n` counter is assigned in DOM order, so it is a property of the
         DOCUMENT rather than of the element. When one side has an element the
         other lacks, every later element sharing that identity shifts by one
         and pairs with the wrong counterpart. A key used for pairing must be a
         function of the element alone, which is what widening the slice
         restores.

         40 IS MEASURED, NOT PICKED. Every a/button/input/select/textarea in
         all thirteen registered static builds was enumerated at 20, 40, 60 and
         80 characters. At 20 there are THREE places where one key covers two
         or more different strings: this page's header-against-stub pair, and
         two on capitol-a (`2026 Capitol Chat: W` over Weeks 11, 7 and 2, and
         `Capitol Chat: Week 1` over Weeks 11 and 10). At 40 there are none, and
         60 and 80 buy nothing further. capitol-a's two pass today only because
         its colliding elements appear in the same order on both sides, which
         is luck rather than correctness, and they stop being luck here.

         WIDENING CAN ONLY SPLIT, NEVER MERGE. Two elements that share a
         40-character prefix necessarily share a 20-character one, so no pair
         that is distinguished today becomes conflated; the change can only
         separate elements that were wrongly conflated. That is why the whole
         suite was expected to stay green across it, and did.

         WHAT IT COSTS: 262 of the 856 keys across the corpus get a longer
         name, so any key quoted in a comment or a report before this date is
         written in the old form. Nothing in the code depends on the names:
         DEFERRED_IMAGES only ever holds `img|` keys, whose identity is built
         from the filename below and never passes through clean() at all, and
         CONTENT_HEIGHT_EXEMPTIONS keys on layoutInvariants()'s class tokens. */
      const clean = (s) => (s || '').replace(/\s+/g, ' ').trim().slice(0, 40) || null;
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

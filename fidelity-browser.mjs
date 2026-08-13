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
      signup form (data-dojo-attach-point="modalOverlay"); even off-screen it
      intercepts pointer events over the whole viewport and Playwright's
      normal actionability check (real click, must be unobstructed) times
      out against it. force: true dispatches the check directly against the
      input rather than simulating a real pointer click through whatever
      third-party overlay happens to be in the DOM that day. What this
      function verifies is the CSS cascade from :checked, not click
      ergonomics through an unrelated marketing plugin's markup, so bypassing
      the actionability check is the right trade here, not a workaround for
      something this test should actually be catching. */
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

/* waitUntil: 'load', not 'networkidle', for the same reason as above. */
export async function screenshots(url, dir) {
  const browser = await chromium.launch();
  try {
    for (const width of [390, 768, 1024, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1200 } });
      await page.goto(url, { waitUntil: 'load' });
      await page.screenshot({ path: `${dir}/${width}.png`, fullPage: true });
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

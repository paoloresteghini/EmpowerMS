import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';

import { PAGES } from './build.mjs';

execFileSync('node', ['build.mjs'], { stdio: 'inherit' });

/* Every page this build produces, keyed by output path. `html` is the
   reference build — the assertions below that name .em-* section classes are
   about that page specifically. The cross-page contract that has to hold for
   all five homepages is asserted in its own block at the end of this file.

   HOMEPAGES is filtered by `kind`, not by "everything except the chooser".
   The About Us variations share the chrome, the tokens and the design
   language but none of the homepage copy deck, so the homepage contract —
   seventeen roadmap strings, one hero CTA reading "Explore Our Work", exactly
   one email field — is nonsense applied to them. They get their own contract
   further down. */
const HOMEPAGES = PAGES
  .filter(p => p.kind === 'homepage')
  .map(p => ({ ...p, html: readFileSync(p.out, 'utf8') }));
const ABOUTPAGES = PAGES
  .filter(p => p.kind === 'about')
  .map(p => ({ ...p, html: readFileSync(p.out, 'utf8') }));
/* Page hygiene — alt text, heading order, the skip link, one orange action —
   is not a homepage question. Every client-facing page this build produces is
   swept for it. */
const ALLPAGES = [...HOMEPAGES, ...ABOUTPAGES];
const html = readFileSync('dist/current.html', 'utf8');

/* About pages own their stylesheet by default (css/<slug>.css). Public Safety
   moved onto css/solution.css on 2026-08-07 as the first page built on the
   shared solution template; Task 3 and Task 4 add work and education onto
   the same file. Every sweep below that reads a page's stylesheet by slug
   goes through this so the exemption lives in one place. */
const SHARED_CSS = { safety: 'solution.css', work: 'solution.css', education: 'solution.css' };
const cssFileFor = slug => `css/${SHARED_CSS[slug] || `${slug}.css`}`;

test('build resolves every include marker', () => {
  assert.ok(!html.includes('@include'), 'unresolved @include marker in output');
});

test('build inlines section content', () => {
  assert.match(html, /<header class="em-header">/);
});

test('design system files imported at root level', () => {
  for (const f of [
    'tokens/base.css', 'tokens/colors.css', 'tokens/fonts.css',
    'components/components.css',
  ]) assert.ok(existsSync(f), `missing ${f}`);
});

test('asset paths referenced by tokens actually resolve', () => {
  // tokens/*.css use url('../assets/...') — only correct if tokens/ is a
  // sibling of assets/. Guard the layout constraint.
  for (const f of [
    'assets/fonts/figtree-700.woff2',
    'assets/pattern-blue.png',
    'assets/logo-primary.png',
    'assets/logo-primary-reversed.png',
  ]) assert.ok(existsSync(f), `missing ${f}`);
});

test('imported binaries are not empty or HTML error pages', () => {
  for (const f of ['assets/fonts/figtree-700.woff2', 'assets/logo-primary.png']) {
    assert.ok(statSync(f).size > 1000, `${f} looks truncated`);
  }
});

test('shell links stylesheets in cascade order', () => {
  const order = ['tokens/fonts.css', 'tokens/colors.css', 'tokens/base.css',
                 'components/components.css', 'css/homepage.css'];
  let cursor = -1;
  for (const href of order) {
    const at = html.indexOf(href);
    assert.ok(at > cursor, `${href} out of cascade order`);
    cursor = at;
  }
});

test('header is a landmark with a nav and six links', () => {
  assert.match(html, /<header class="em-header">/);
  assert.match(html, /<nav class="em-header__nav" aria-label="Primary">/);
  for (const label of ['Home', 'About', 'Solutions', 'All Content', 'Podcast', 'Join Us']) {
    assert.ok(html.includes(`>${label}<`) || html.includes(`>${label} `), `nav missing ${label}`);
  }
});

test('header Donate is navy, not the orange primary', () => {
  assert.match(html, /class="em-btn em-btn--secondary em-btn--sm"[^>]*>[\s\S]{0,40}Donate/);
});

test('hero holds the single h1', () => {
  const h1s = html.match(/<h1[\s>]/g) || [];
  assert.equal(h1s.length, 1, `expected exactly one h1, found ${h1s.length}`);
  assert.match(html, /Your American Dream starts here\./);
});

test('exactly one orange primary button on the page', () => {
  const primaries = html.match(/em-btn--primary/g) || [];
  assert.equal(primaries.length, 1, `brand rule: one orange action per view, found ${primaries.length}`);
  const at = html.indexOf('em-btn--primary');
  assert.match(html.slice(at, at + 200), /Explore Our Work/);
});

test('hero image has alt text', () => {
  assert.match(html, /class="em-hero__media"[\s\S]{0,300}?alt="[^"]+"/);
});

test('process has five steps in order', () => {
  const steps = ['Define the problem', 'Conduct research', 'Craft policy solution',
                 'Advocate for change', 'Policy implementation'];
  let cursor = -1;
  for (const s of steps) {
    const at = html.indexOf(s);
    assert.ok(at > cursor, `step out of order or missing: ${s}`);
    cursor = at;
  }
});

test('process detail is in the DOM, not hover-only content', () => {
  assert.match(html, /class="em-process__detail"[\s\S]{0,400}?Learn more/);
});

test('foundations uses the house Real solution: label', () => {
  assert.match(html, /<strong>Real solution:<\/strong>/);
});

test('section copy uses curly apostrophes, not ASCII', () => {
  for (const f of readdirSync('src/sections')) {
    const s = readFileSync(`src/sections/${f}`, 'utf8');
    const bad = s.match(/[A-Za-z]'[A-Za-z]/g) || [];
    assert.equal(bad.length, 0,
      `${f} has ${bad.length} straight apostrophe(s): ${bad.join(', ')} — brand copy requires U+2019`);
  }
});

test('section copy uses curly quotes in prose, not straight ASCII quotes', () => {
  for (const f of readdirSync('src/sections')) {
    const s = readFileSync(`src/sections/${f}`, 'utf8');
    // Strip HTML tags to check only text content, not attribute delimiters
    const textOnly = s.replace(/<[^>]+>/g, '');
    // Look for straight double quotes in text (not preceded/followed by < or >)
    // This catches quotes in prose but not in HTML attributes
    const badLines = [];
    for (const line of textOnly.split('\n')) {
      if (line.includes('"') && line.trim()) {
        badLines.push(line.trim());
      }
    }
    assert.equal(badLines.length, 0,
      `${f} has straight double quotes in prose; must use curly quotes (U+201C/U+201D): ${badLines.slice(0, 2).join(' | ')}`);
  }
});

test('stories attributes Jodi Berry with city', () => {
  assert.match(html, /Jodi Berry/);
  assert.match(html, /Sumrall, MS/);
});

test('insights lists three content rows', () => {
  const rows = html.match(/class="em-insights__row"/g) || [];
  assert.equal(rows.length, 3);
});

test('insights preserves CMS placeholder copy verbatim', () => {
  assert.match(html, /Article headline — auto-populated from the blog/);
  assert.match(html, /Research title — auto-populated from EPIC/);
  assert.match(html, /Community story title — auto-populated/);
});

test('join us newsletter is a real form with a labelled input', () => {
  assert.match(html, /<form class="em-newsletter__form"/);
  assert.match(html, /<label[^>]*for="join-email"/);
  assert.match(html, /id="join-email"[^>]*type="email"/);
});

test('the page asks for an email address exactly once', () => {
  // Join Us and the footer both carried a subscribe field, one scroll apart,
  // asking the same question twice. Join Us owns it now.
  const emails = html.match(/type="email"/g) || [];
  assert.equal(emails.length, 1, `expected one email input, found ${emails.length}`);
  assert.ok(!html.includes('em-footer__form'), 'the footer subscribe form is back');
});

test('join us carries no orange action, and its secondary ways in are links', () => {
  const s = readFileSync('src/sections/06-joinus.html', 'utf8');
  assert.ok(!s.includes('em-btn--primary'), 'orange button outside the hero');
  // The only button in the section is Subscribe, which sits on the navy slab
  // and so has to be the inverse fill, not the navy one.
  assert.ok(s.includes('em-btn--inverse'), 'expected the inverse subscribe button on the navy slab');
  assert.ok(!s.includes('em-btn--secondary'),
    'navy button on the navy slab — it would be invisible against --surface-navy-deep');
  const actions = s.match(/class="em-join__action"/g) || [];
  assert.equal(actions.length, 2, `expected the ambassador and donate links, found ${actions.length}`);
});

test('the honeycomb is a real tile, applied as a mask so one file serves every colour', () => {
  const tile = 'patterns/hex-lattice.svg';
  assert.ok(existsSync(tile), `missing ${tile}`);
  const svg = readFileSync(tile, 'utf8');
  // 120 x 69.28 is the lattice's own period (3s by s*root3 at s=40). A tile of
  // any other size cannot repeat without a seam, which is exactly what went
  // wrong with the supplied assets/pattern-blue.png.
  assert.match(svg, /viewBox="0 0 120 69\.28"/, 'tile is not the hexagon lattice period');
  assert.ok(!svg.includes('<image'), 'the tile embeds a raster');

  // Applied as a mask, never as background-image: that is what makes the colour
  // a CSS token instead of a second exported file.
  const at = homepage.indexOf('.em-join__slab::before');
  assert.ok(at > -1, 'the slab does not carry the pattern');
  const rule = homepage.slice(at, homepage.indexOf('}', at));
  assert.match(rule, /mask-image:url\('\.\.\/patterns\/hex-lattice\.svg'\)/);
  assert.match(rule, /-webkit-mask-image:/, 'no -webkit- prefixed mask for Safari');
  assert.match(rule, /var\(--pattern-ink\)/, 'pattern paint is not tokenised');
  // Graduated on purpose, and graduated in the PAINT rather than in a second
  // mask layer: where mask-composite is unsupported, two mask layers add
  // instead of intersecting and the slab fills with solid ink.
  assert.match(rule, /background:(linear|radial)-gradient/, 'the lattice runs at one flat strength');
  const declarations = homepage.replace(/\/\*[\s\S]*?\*\//g, '');   // the comment explains why
  assert.ok(!/mask-composite/.test(declarations), 'mask-composite has an ink-blob fallback');
  assert.ok(!/background-image:url\('\.\.\/patterns/.test(homepage),
    'pattern used as a background image — it could no longer be recoloured');
});

test('the supplied raster patterns are not reintroduced', () => {
  // tokens/base.css still declares .em-pattern-blue / .em-pattern-orange; they
  // are baked compositions, not tiles, and tile with a visible seam.
  assert.ok(!html.includes('em-pattern-blue') && !html.includes('em-pattern-orange'),
    'a supplied raster pattern class is applied in the markup');
});

test('the join us photo wash stays under the opacity its contrast was measured at', () => {
  // The wash sits behind body copy. Measured against the darkest source pixel
  // under either paragraph, .26 leaves --text-body at 4.89:1. Anything above
  // ~.3 pushes it under AA, and nothing in CSS would tell you.
  for (const m of homepage.matchAll(/\.em-join__wash[^{]*\{[^}]*?opacity:\.(\d+)/g)) {
    assert.ok(Number(`0.${m[1]}`) <= 0.26, `wash opacity .${m[1]} exceeds the measured-safe .26`);
  }
  for (const m of homepage.matchAll(/em-join__wash\{opacity:\.(\d+);transform/g)) {
    assert.ok(Number(`0.${m[1]}`) <= 0.26, `wash hover opacity .${m[1]} exceeds the measured-safe .26`);
  }
  // Decorative: it must never carry alt text or reach the accessibility tree.
  const s = readFileSync('src/sections/06-joinus.html', 'utf8');
  for (const tag of s.match(/<img class="em-join__wash[^>]*>/g) || []) {
    assert.match(tag, /alt=""/, `decorative wash with alt text: ${tag.slice(0, 70)}`);
    assert.match(tag, /aria-hidden="true"/);
    assert.match(tag, /loading="lazy"/);
  }
});

test('the join us washes reuse photos the page already loads', () => {
  // A decorative background is not worth a new network request. Both files
  // appear in an earlier section, so they come from cache.
  const join = readFileSync('src/sections/06-joinus.html', 'utf8');
  const others = readdirSync('src/sections')
    .filter(f => f !== '06-joinus.html')
    .map(f => readFileSync(`src/sections/${f}`, 'utf8')).join('\n');
  const washes = [...join.matchAll(/em-join__wash[^>]*src="[^"]*\/([^/"]+\.jpg)"/g)].map(m => m[1]);
  assert.equal(washes.length, 2, `expected two washes, found ${washes.length}`);
  for (const file of washes) {
    assert.ok(others.includes(file), `${file} is only used by the wash — it would be an extra download`);
  }
});

test('join us does not repeat the composition of the section above it', () => {
  // Foundations, Stories and the old Join layout were all "dominant panel
  // left, two stacked cards right" with a title/lead head grid on top, which
  // made the closing section read as a copy of Stories. Join Us is a stacked
  // slab-then-two-ways composition now, and owns no head grid.
  const s = readFileSync('src/sections/06-joinus.html', 'utf8');
  assert.ok(!s.includes('em-join__head'), 'the shared head grid is back in join us');
  assert.ok(!s.includes('em-card'), 'join us is carded again');
  assert.match(s, /class="em-join__slab"/);
  assert.match(s, /class="em-join__ways"/);
  // The h2 lives inside the slab and still labels the section.
  assert.match(s, /aria-labelledby="join-title"/);
  assert.match(s, /<h2 id="join-title">/);
});

test('footer is a landmark with four social links', () => {
  assert.match(html, /<footer class="em-footer">/);
  const socials = html.match(/class="em-footer__social"[\s\S]*?<\/div>/);
  assert.ok(socials, 'no social block');
  assert.equal((socials[0].match(/<a /g) || []).length, 4);
});

test('footer carries the registered address', () => {
  assert.match(html, /741 Avignon Dr\., Suite C/);
  assert.match(html, /Ridgeland, MS 39157/);
});

test('footer keeps mission, social and links after losing the subscribe form', () => {
  assert.ok(!html.includes('for="footer-email"'), 'the footer subscribe field is back');
  assert.match(html, /class="em-footer__mission"/);
  assert.match(html, /class="em-footer__social"/);
});

const homepage = readFileSync('css/homepage.css', 'utf8');
const site = readFileSync('css/site.css', 'utf8');

test('hero copy column grows with the viewport instead of a bare cap', () => {
  // .em-hero__copy's left padding scales with (100vw - --container-max)/2 to
  // keep the copy aligned with the page container above the 1200px
  // breakpoint. If .em-hero's grid-template-columns is a bare "680px" cap,
  // that alignment padding eats directly into the copy's content width —
  // shrinking it as the viewport grows — instead of the column widening to
  // absorb it. The column must reference the same viewport-relative term so
  // content width stays constant. See task-16 report for the regression.
  const at = homepage.indexOf('.em-hero{');
  assert.ok(at > -1, 'no .em-hero rule found');
  const end = homepage.indexOf('}', at);
  const rule = homepage.slice(at, end + 1);
  const gtcMatch = rule.match(/grid-template-columns:([^;]+);/);
  assert.ok(gtcMatch, 'no grid-template-columns in .em-hero');
  const gtc = gtcMatch[1];
  assert.ok(!/minmax\(0,\s*680px\)/.test(gtc),
    'hero column is a bare 680px cap — copy content width will shrink as the viewport widens past 1200px');
  assert.match(gtc, /100vw/, 'hero column does not reference 100vw');
  assert.match(gtc, /var\(--container-max\)/, 'hero column does not reference --container-max');
});

test('responsive rules exist at the documented breakpoints', () => {
  // The chrome breakpoints (960 for the nav swap, 400 for the 320px floor)
  // live in site.css now, because every option shares that header. The rest
  // are the reference build's own content-reflow steps.
  for (const bp of ['1200px', '1150px', '900px', '600px']) {
    assert.ok(homepage.includes(`max-width:${bp}`), `no breakpoint at ${bp} in homepage.css`);
  }
  for (const bp of ['960px', '900px', '600px', '420px', '400px']) {
    assert.ok(site.includes(`max-width:${bp}`), `no breakpoint at ${bp} in site.css`);
  }
});

test('chevron becomes a vertical stack before the strip can overflow', () => {
  // .em-process needs ~1054px (5*238 - 4*34) to render horizontally, which
  // the --container-max:1200px container only clears above a ~1102px
  // viewport — so the chevron must stack at a breakpoint higher than 900px,
  // not at it. See css/homepage.css for the full derivation.
  const at = homepage.indexOf('max-width:1150px');
  assert.ok(at > -1);
  assert.match(homepage.slice(at), /em-process\{[^}]*flex-direction:column/);

  // and the 900px block — for sections that DO fit horizontally that low —
  // must not be the one carrying the chevron stack rule
  const at900 = homepage.indexOf('max-width:900px');
  const end900 = homepage.indexOf('\n}', at900);
  assert.ok(at900 > -1 && end900 > -1);
  assert.ok(!/em-process\{/.test(homepage.slice(at900, end900)),
    'chevron stack rule found in the 900px block instead of the 1150px block');
});

test('header nav hides before its own min-content width can overflow', () => {
  // .em-header__bar never wraps (logo + six nav links + search + Donate),
  // measured with an intrinsic min-content width of ~940px, so the nav
  // must be hidden above the general 900px stacking breakpoint, not at
  // the 600px one previously used for it — that left a real overflow
  // window from ~600-940px, confirmed by measurement.
  const at = site.indexOf('max-width:960px');
  assert.ok(at > -1, 'no 960px breakpoint for the header nav');
  assert.match(site.slice(at), /em-header__nav\{[^}]*display:none/);

  const at600 = site.indexOf('max-width:600px');
  const end600 = site.indexOf('\n}', at600);
  assert.ok(at600 > -1 && end600 > -1);
  assert.ok(!/em-header__nav\{/.test(site.slice(at600, end600)),
    'header nav hide rule duplicated in the 600px block');
});

test('header bar tightens its gaps before the 320px floor can overflow', () => {
  // .em-header__bar's non-wrapping, non-shrinking children (logo + gap +
  // actions, with .em-header__nav already hidden by the 960px rule) need
  // 299.5px but only 272px is available inside a 320px viewport —
  // measured, not assumed. A max-width:400px rule tightens both the bar
  // gap and the actions gap to buy back the missing width without
  // shrinking the logo or the Donate button itself.
  const at = site.indexOf('max-width:400px');
  assert.ok(at > -1, 'no 400px breakpoint for the small header bar fix');
  const block = site.slice(at, site.indexOf('}', site.indexOf('}', at) + 1) + 1);
  assert.match(block, /em-header__bar\{gap:/, 'bar gap not tightened at 400px');
  assert.match(block, /em-header__actions\{gap:/, 'actions gap not tightened at 400px');
});

test('mobile menu toggle has an accessible name and aria-controls matching the panel id', () => {
  const toggleMatch = html.match(/<button class="em-header__toggle"[^>]*>/);
  assert.ok(toggleMatch, 'no mobile menu toggle button in output');
  const toggle = toggleMatch[0];
  assert.match(toggle, /aria-expanded="(true|false)"/, 'toggle missing aria-expanded');
  assert.match(toggle, /aria-label="[^"]+"/, 'toggle missing an accessible name');

  const controlsMatch = toggle.match(/aria-controls="([^"]+)"/);
  assert.ok(controlsMatch, 'toggle missing aria-controls');
  const panelIdMatch = html.match(/<nav class="em-mobilenav" id="([^"]+)"/);
  assert.ok(panelIdMatch, 'mobile nav panel missing an id');
  assert.equal(controlsMatch[1], panelIdMatch[1], 'aria-controls does not match the panel id');
});

test('mobile menu carries all six top-level items and a sample of sub-items', () => {
  const panelMatch = html.match(/<nav class="em-mobilenav"[\s\S]*?<\/nav>/);
  assert.ok(panelMatch, 'mobile nav panel not found in output');
  const panel = panelMatch[0];

  for (const label of ['Home', 'About', 'Solutions', 'All Content', 'Podcast', 'Join Us']) {
    assert.ok(panel.includes(`>${label}<`) || panel.includes(`>${label} `),
      `mobile menu missing top-level item ${label}`);
  }
  for (const sub of ['Who We Are', 'Solutions Center', 'Quality Education', 'Research (EPIC)',
                      'Articles', 'The Empower Podcast', 'Newsletter', 'Ambassador Program']) {
    assert.ok(panel.includes(sub), `mobile menu missing sub-item ${sub}`);
  }

  // Each group with children exposes it as a real <ul>, not a styled div.
  const sublists = panel.match(/<ul class="em-mobilenav__sublist"/g) || [];
  assert.equal(sublists.length, 5, `expected 5 expandable sub-groups, found ${sublists.length}`);
});

test('mobile nav panel markup lives in the header partial, not injected by JS', () => {
  const partial = readFileSync('src/_shared/header.html', 'utf8');
  assert.match(partial, /<nav class="em-mobilenav" id="mobile-nav" aria-label="Mobile">/);
  assert.match(partial, /Who We Are/, 'sub-item copy missing from the static partial');

  for (const jsFile of ['js/nav.js']) {
    const js = readFileSync(jsFile, 'utf8');
    assert.ok(!js.includes('innerHTML') && !js.includes('createElement'),
      `${jsFile} builds markup at runtime instead of progressively enhancing static markup`);
  }
});

test('heading order never skips a level', () => {
  const levels = [...html.matchAll(/<h([1-5])[\s>]/g)].map(m => Number(m[1]));
  for (let i = 1; i < levels.length; i++) {
    assert.ok(levels[i] <= levels[i - 1] + 1,
      `heading jumps from h${levels[i - 1]} to h${levels[i]} at index ${i}`);
  }
});

test('every content image has an alt attribute', () => {
  for (const tag of html.match(/<img\b[^>]*>/g) || []) {
    assert.match(tag, /\salt="/, `img without alt: ${tag.slice(0, 90)}`);
  }
});

test('section partials carry no page chrome', () => {
  for (const f of readdirSync('src/sections')) {
    const s = readFileSync(`src/sections/${f}`, 'utf8');
    // Tag-boundary matches only — a bare substring check on '<head' would
    // also flag the legitimate <header class="em-header"> landmark.
    for (const bad of [/<html[\s>]/, /<head[\s>]/, /<body[\s>]/, /id="controls"/]) {
      assert.ok(!bad.test(s), `${f} contains page chrome matching ${bad}`);
    }
  }
});

test('no inline style attributes or style blocks — Elementor hand-off hygiene', () => {
  /* Swept over EVERY client-facing page, not over `html`. This test spent most
     of its life reading dist/current.html alone, because that was the only page
     in the build the day it was written; by the time the build reached
     forty-odd pages it was still reading one of them and still passing green.
     A guard bound to a single representative artefact stops covering the build
     the moment a second artefact exists, and it stops silently.

     Both shapes matter for the conversion. An inline style attribute is a rule
     Elementor cannot see, so it survives a paste into an HTML widget and then
     vanishes the moment anybody rebuilds that block natively. An inline <style>
     block is worse: pasted into an HTML widget it leaks page-wide, and it is
     invisible to the enqueue order the hand-off table sets out. */
  assert.ok(ALLPAGES.length > 40, `only ${ALLPAGES.length} pages swept — is the filter right?`);
  for (const { out, html: page } of ALLPAGES) {
    assert.ok(!/\sstyle="/.test(page), `${out}: inline style attribute found; move it to CSS`);
    assert.ok(!/<style[\s>]/.test(page), `${out}: inline <style> block found; move it to a stylesheet`);
  }
});

test('every section partial roots on a single element — one partial, one Elementor container', () => {
  /* The hand-off says each partial under src/ is a standalone fragment that
     pastes into one Elementor HTML widget or maps to one native container. That
     only holds if the partial roots on <section> elements and nothing else: a
     wrapper <div> around several sections is one extra nesting level that has
     to be unpicked by hand at conversion time, and a partial that opens on a
     <div> gives the person converting it nothing to map a container onto.

     Several sibling sections in one partial is fine and used — All Content B's
     shelves are six — because each still lands as its own container.

     The two landing-template notes are the deliberate exception: they are
     review furniture, addressed to Empower rather than to a visitor, and they
     are named here so the exemption cannot quietly grow. */
  const NOTE_PARTIALS = ['src/landing/sections/00-note.html', 'src/landing-b/sections/00-note.html'];
  const partials = [];
  const walk = dir => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith('.html') && p.includes('/sections/')) partials.push(p);
    }
  };
  walk('src');
  assert.ok(partials.length > 150, `only ${partials.length} section partials found — is the walk right?`);

  for (const f of partials) {
    const s = readFileSync(f, 'utf8').replace(/<!--[\s\S]*?-->/g, '').trim();
    if (NOTE_PARTIALS.includes(f)) {
      assert.match(s, /^<div/, `${f} is exempted as a review note but no longer opens on a <div> — retire the exemption`);
      continue;
    }
    assert.match(s, /^<section[\s>]/, `${f} does not open on a <section>`);
    assert.match(s, /<\/section>$/, `${f} does not close on a </section>`);
  }
});

/* ---------- CMS slots ---------- */

test('every repeating block of live posts is marked as a CMS slot', () => {
  /* The hand-off tells WordPress to "replace the auto-populated placeholder
     strings with dynamic content". That instruction was written when the only
     dynamic blocks in the build were four homepage stubs carrying the literal
     words "auto-populated". Everything built since is populated with REAL
     empowerms.org posts instead — which reads better in review and is honest
     about the shape, but leaves the person doing the conversion with no signal
     at all about which blocks are a query and which are authored content. Get
     that wrong in either direction and the page is broken in a way nobody sees
     for months: a query where an editorial sequence was meant, or twenty-three
     headlines frozen into a static page that never updates again.

     So every block holding two or more live post links carries data-cms. Three
     values, and the third is as important as the first:

       loop    the container repeats from a query
       field   this element's text and href come from a query; what surrounds it
               is authored
       manual  it looks like a feed and deliberately is not — the landing
               template's outcome sequence is three chosen posts in the order
               the campaign happened, and a Loop Grid of whatever is recent
               would destroy the point of the block */
  const VALUES = new Set(['loop', 'field', 'manual']);
  const partials = [];
  const walk = dir => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith('.html') && p.includes('/sections/')) partials.push(p);
    }
  };
  walk('src');

  let marked = 0;
  for (const f of partials) {
    const s = readFileSync(f, 'utf8');
    const body = s.replace(/<!--[\s\S]*?-->/g, '');
    const posts = (body.match(/empowerms\.org\//g) || []).length;
    const markers = [...body.matchAll(/data-cms="([^"]*)"/g)].map(m => m[1]);
    marked += markers.length;

    if (posts >= 2) {
      assert.ok(markers.length > 0,
        `${f} carries ${posts} live post links and no data-cms marker — say whether that block is a ` +
        `query (loop/field) or authored content that only looks like one (manual)`);
    }
    for (const v of markers) {
      assert.ok(VALUES.has(v), `${f}: data-cms="${v}" is not one of ${[...VALUES].join(', ')}`);
    }
    /* A marker with no note is half a signal. The note is what tells the person
       in Elementor which query, and where the query is not yet answerable —
       Empower's WordPress has no Research & Reports category, and that belongs
       beside the block that needs one, not only in this repository's README. */
    const noted = (body.match(/data-cms-note="/g) || []).length;
    assert.equal(noted, markers.length, `${f}: ${markers.length} data-cms markers but ${noted} data-cms-note`);
  }
  assert.ok(marked > 40, `only ${marked} CMS markers across the build — is the walk right?`);
});

test('the hand-off documents the CMS markers it asks the converter to grep for', () => {
  /* The markers are only worth stamping if the person converting the build is
     told they exist. A marker vocabulary documented nowhere is a private
     convention, and this repository is a hand-off, not a runtime. */
  const readme = readFileSync('README.md', 'utf8');
  const handoff = readme.slice(readme.indexOf('## Hand-off to WordPress + Elementor'));
  assert.ok(handoff.length > 2000, 'the hand-off section is missing or has been renamed');
  for (const needle of ['data-cms', 'data-cms-note', 'data-cms-item-attrs',
    '`loop`', '`field`', '`manual`', 'Loop Grid']) {
    assert.ok(handoff.includes(needle), `the hand-off section does not document ${needle}`);
  }
});

test('every filtered loop declares the item attributes its filter depends on', () => {
  /* The four filtering pages are the ones the conversion can quietly break.
     Their filters are CSS over data attributes on each card — data-type,
     data-topic, data-guest, data-session — and in WordPress the cards stop
     being hand-written HTML and start coming out of a Loop Grid. A loop item
     template that does not emit those attributes produces a page that looks
     right, filters nothing, and reports no error: every control still moves,
     and every card stays put.

     data-cms-item-attrs is that contract written down. This test keeps it
     honest in both directions — every attribute named must actually be on the
     items today, and every attribute on the items (bar the motion layer's own)
     must be named — so the contract cannot drift away from the markup it
     describes, in either direction. */
  const filtered = [];
  for (const f of ['src/content-a/sections/02-browse.html', 'src/content-b/sections/03-shelves.html',
    'src/podcast-a/sections/03-library.html', 'src/podcast-b/sections/03-library.html',
    'src/capitol-a/sections/03-library.html', 'src/capitol-b/sections/03-library.html']) {
    const s = readFileSync(f, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    /* Each loop container, from its opening tag to the matching close. The
       containers here are flat lists of <li>, so the first </ul> or </ol> after
       the marker ends it. */
    const chunks = [...s.matchAll(/<(ul|ol)([^>]*data-cms="loop"[^>]*)>([\s\S]*?)<\/\1>/g)];
    assert.ok(chunks.length > 0, `${f}: no data-cms="loop" list found — did the markup shape change?`);
    for (const [, , attrs, inner] of chunks) {
      const declared = new Set((attrs.match(/data-cms-item-attrs="([^"]*)"/)?.[1] || '').split(',').filter(Boolean));
      assert.ok(declared.size > 0, `${f}: a filtered loop declares no data-cms-item-attrs`);
      /* data-reveal and data-reveal-group are the motion layer, not the filter,
         and they are replaced by Elementor's own entrance animations at
         conversion time — see the motion note in the README. */
      const found = new Set([...inner.matchAll(/\s(data-[a-z-]+)=/g)]
        .map(m => m[1]).filter(a => !a.startsWith('data-reveal')));
      for (const a of declared) {
        assert.ok(found.has(a), `${f} declares ${a} in data-cms-item-attrs but no item carries it`);
      }
      for (const a of found) {
        assert.ok(declared.has(a), `${f}: items carry ${a} but the loop does not declare it in ` +
          `data-cms-item-attrs — a Loop Grid that does not emit it filters nothing, silently`);
      }
      filtered.push(f);
    }
  }
  assert.ok(filtered.length >= 12, `only ${filtered.length} filtered loops checked`);
});

test('every aria-controls in the built page points at an id that exists', () => {
  const controlled = [...html.matchAll(/\baria-controls="([^"]+)"/g)].map(m => m[1]);
  assert.ok(controlled.length > 0, 'no aria-controls attributes found to check');
  for (const id of controlled) {
    assert.match(html, new RegExp(`\\bid="${id}"`), `aria-controls="${id}" has no matching id`);
  }
});

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

test('process steps cascade as one group', () => {
  const list = html.match(/<ol class="em-process"[^>]*>[\s\S]*?<\/ol>/)[0];
  assert.match(list, /<ol class="em-process" data-reveal-group>/);
  const revealed = list.match(/<li class="em-process__step" data-reveal="rise">/g) || [];
  assert.equal(revealed.length, 5, `expected 5 revealing steps, found ${revealed.length}`);
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

test('header sticks and condenses on scroll', () => {
  assert.match(site, /\.em-header\{[^}]*position:sticky/);
  assert.match(site, /\[data-scrolled\][^{]*\.em-header__bar\{[^}]*min-height/);
});

test('scroll flag is passive and frame-guarded', () => {
  assert.match(revealJs, /addEventListener\('scroll'[\s\S]{0,160}passive:\s*true/,
    'scroll listener is not passive');
  assert.match(revealJs, /data-scrolled/);
});

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
  const partial = readFileSync('src/_shared/header.html', 'utf8');
  assert.match(partial, /<div class="em-mega" id="mega-about"/);
  for (const f of readdirSync('js')) {
    const js = readFileSync(`js/${f}`, 'utf8');
    assert.ok(!js.includes('innerHTML') && !js.includes('createElement'),
      `js/${f} builds markup at runtime instead of progressively enhancing static markup`);
  }
});

const mega = readFileSync('css/megamenu.css', 'utf8');

test('mega menu stylesheet is linked in cascade order', () => {
  assert.match(html, /<link rel="stylesheet" href="\.\.\/css\/megamenu\.css">/);
  assert.ok(html.indexOf('css/homepage.css') < html.indexOf('css/megamenu.css'));
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
  // Same boundary value as css/homepage.css's nav breakpoint and
  // css/megamenu.css's panel breakpoint — both max-width:960px. A mismatched
  // pair (e.g. min-width:961px here) leaves a sliver viewport width where
  // the desktop nav is hidden, the mobile toggle is hidden, and the mega
  // triggers are inert.
  assert.match(megaJs, /max-width:\s*960px/,
    'no matching mobile media query — panels would fight the mobile nav');
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

test('close() and show() keep is-open and hidden in sync', () => {
  // css/megamenu.css's reduced-motion block forces every panel opaque
  // regardless of .is-open, so `hidden` is the ONLY thing keeping a closed
  // panel out of the layout for reduced-motion users. If close() and show()
  // ever get split so is-open and hidden come off in different code paths,
  // reduced-motion users get five stacked, permanently-visible panels while
  // this suite stays green — so this test parses the actual function
  // bodies rather than grepping the whole file, and will fail if either
  // half of the invariant is dropped from either function.
  const closeStart = megaJs.indexOf('function close()');
  const showStart = megaJs.indexOf('function show(menu)');
  const afterStart = megaJs.indexOf('function after(');
  assert.ok(closeStart > -1 && showStart > closeStart && afterStart > showStart,
    'expected close(), then show(menu), then after() in js/megamenu.js — cannot isolate function bodies');

  const closeBody = megaJs.slice(closeStart, showStart);
  const showBody = megaJs.slice(showStart, afterStart);

  assert.match(closeBody, /\.panel\.classList\.remove\('is-open'\)/,
    'close() no longer removes is-open from the panel');
  assert.match(closeBody, /\.panel\.hidden\s*=\s*true/,
    'close() no longer hides the panel');
  assert.match(showBody, /\.panel\.hidden\s*=\s*false/,
    'show() no longer unhides the panel');
});

/* ---------- simple dropdowns (dist/current-2.html) ---------- */

const current2 = readFileSync('dist/current-2.html', 'utf8');
const header2 = readFileSync('src/_shared/header-2.html', 'utf8');
/* The header's own stylesheet. It was part of css/current-2.css until the
   agreed build and the six About Us pages all started using this header;
   see the note at the top of css/header-2.css. */
const dropCss = readFileSync('css/header-2.css', 'utf8');
const dropJs = readFileSync('js/dropdown.js', 'utf8');

test('the dropdown header carries the same top-level items as the mega header, bar the one Empower changed', () => {
  /* Two renderings of one nav. The labels are the contract; how they open is
     not. ONE documented divergence, 2026-08-05: Empower asked for the shipping
     header's Solutions item to become "Our Solutions" and to be a link to the
     landing page. header.html is the mega-menu header, which only the original
     build and the four reference homepages use — it is a record of what was
     reviewed, not a page that ships, so it keeps the old label. If the mega
     header is ever revived, this is the line that says what it owes. */
  const labels = (partial) =>
    [...partial.matchAll(/<(?:a|button) class="em-header__link"[^>]*>([^<]+)/g)]
      .map(m => m[1].trim()).sort();
  const shipped = labels(header2).map(l => l === 'Our Solutions' ? 'Solutions' : l).sort();
  assert.deepEqual(shipped, labels(readFileSync('src/_shared/header.html', 'utf8')),
    'header-2.html and header.html no longer offer the same top-level nav');
  assert.ok(header2.includes('<a class="em-header__link" href="/solutions">Our Solutions</a>'),
    'Our Solutions is no longer a link to the landing page');
});

test('Our Solutions opens the landing page and its dropdown holds only the pages beneath it', () => {
  /* Empower, 2026-08-05: the top-level item goes to the Solutions landing page;
     the dropdown lists the individual solutions and research, and no longer
     repeats the landing page as "Solutions Center". */
  const panel = header2.match(/<div class="em-header__menu" id="drop-solutions"[\s\S]*?<\/div>/)[0];
  const links = [...panel.matchAll(/<a href="([^"]+)">([^<]*?)<span>/g)].map(m => m[2]);
  assert.deepEqual(links,
    ['Quality Education', 'Meaningful Work', 'Public Safety', 'Research (EPIC)'],
    'the Our Solutions dropdown is not the four pages beneath the landing page');
  const markup = header2.replace(/<!--[\s\S]*?-->/g, '');
  assert.ok(!markup.includes('Solutions Center'),
    'Solutions Center is still in the nav — the item above it is now that page');
  /* The disclosure button, not the link, carries aria-controls: that is what
     js/dropdown.js binds to, and it is why the link can navigate. */
  assert.match(header2,
    /<button class="em-header__disclosure"[^>]*aria-controls="drop-solutions"/,
    'the Solutions panel has no disclosure button to open it');
});

test('the dropdowns and their own mobile nav stay in sync', () => {
  const panel = header2.match(/<nav class="em-mobilenav"[\s\S]*?<\/nav>/)[0];
  const mobile = [...panel.matchAll(/<a class="em-mobilenav__sublink" href="([^"]+)">([^<]+)<\/a>/g)]
    .map(m => `${m[2]}|${m[1]}`).sort();
  const desktop = [...header2.matchAll(/<a href="([^"]+)">([^<]*?)<span>/g)]
    .map(m => `${m[2]}|${m[1]}`).sort();
  assert.deepEqual(desktop, mobile, 'dropdown links and mobile nav links have drifted');
});

test('every dropdown trigger controls a real panel labelled by that trigger', () => {
  for (const m of header2.matchAll(/id="(drop-trigger-[^"]+)" aria-controls="([^"]+)"/g)) {
    const panel = header2.match(new RegExp(`<div class="em-header__menu" id="${m[2]}"[^>]*>`));
    assert.ok(panel, `no panel markup for ${m[2]}`);
    assert.match(panel[0], new RegExp(`aria-labelledby="${m[1]}"`),
      `${m[2]} is not labelled by its own trigger`);
  }
});

test('dropdown panels are only hidden once JS has claimed them', () => {
  // components.css ships .em-header__menu already positioned, so current-2.css
  // has to put it BACK into normal flow and re-position it behind the gate —
  // otherwise a no-JS visitor gets five panels stacked on one another.
  assert.match(dropCss, /\.em-header__menu\{[^}]*position:static/,
    'the ungated panel is not returned to normal flow');
  for (const rule of dropCss.split('}')) {
    if (!/\bdisplay:\s*none|\bvisibility:\s*hidden/.test(rule)) continue;
    assert.match(rule, /\[data-dropdown="on"\]|@media/,
      `ungated hide rule would lose links without JS: ${rule.trim().slice(0, 80)}`);
  }
});

test('dropdown panels stand down below the mobile nav breakpoint', () => {
  // Same boundary in the stylesheet and the script, for the same reason as
  // the mega menus: a mismatch leaves a sliver of viewport width where the
  // desktop nav is hidden and the triggers are inert.
  const at = dropCss.indexOf('max-width:960px');
  assert.ok(at > -1, 'no 960px rule — panels would overlap the mobile nav');
  assert.match(dropCss.slice(at), /\.em-header__menu\{[^}]*display:none/);
  assert.match(dropJs, /max-width:\s*960px/);
});

test('dropdown motion is disabled under reduced motion, and the gate still hides', () => {
  assert.match(dropCss, /@media \(prefers-reduced-motion:\s*reduce\)/);
  assert.match(dropCss, /\[data-dropdown="on"\] \.em-header__menu\[hidden\]\{display:none\}/,
    'reduced-motion users would get every panel permanently in the layout');
});

test('the dropdown script keeps the mega menu behaviour contract', () => {
  assert.match(dropJs, /setAttribute\('data-dropdown', 'on'\)/);
  assert.match(dropJs, /\(hover: hover\) and \(pointer: fine\)/);
  for (const key of ['Escape', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
    assert.ok(dropJs.includes(`'${key}'`), `keyboard map missing ${key}`);
  }
  assert.match(dropJs, /setAttribute\('aria-expanded', 'true'\)/);
  assert.match(dropJs, /setAttribute\('aria-expanded', 'false'\)/);
});

test('the dropdown page carries neither mega menu layer', () => {
  assert.ok(!current2.includes('css/megamenu.css'), 'current-2 still links megamenu.css');
  assert.ok(!current2.includes('js/megamenu.js'), 'current-2 still loads megamenu.js');
  assert.ok(!current2.includes('em-mega'), 'current-2 still carries mega markup');
});

test('README documents both new layers for the Elementor hand-off', () => {
  const readme = readFileSync('README.md', 'utf8');
  for (const needle of ['## Motion', '## Mega menus', 'data-reveal', 'data-reveal-group',
                        'data-reveal-entrance', 'prefers-reduced-motion', 'css/motion.css',
                        'js/reveal.js', 'css/megamenu.css', 'js/megamenu.js']) {
    assert.ok(readme.includes(needle), `README does not document ${needle}`);
  }
});

/* ---------- accessibility + performance fixes (impeccable audit) ---------- */

test('every image declares intrinsic dimensions and a loading strategy', () => {
  // Undimensioned images shift the layout as they land; eager-loading all 32
  // blocks the mobile first paint. Hero + logo stay eager on purpose.
  const imgs = html.match(/<img\b[^>]*>/g) || [];
  assert.ok(imgs.length >= 30, `expected the full image set, found ${imgs.length}`);
  for (const tag of imgs) {
    assert.match(tag, /\swidth="\d+"/, `img without intrinsic width: ${tag.slice(0, 80)}`);
    assert.match(tag, /\sheight="\d+"/, `img without intrinsic height: ${tag.slice(0, 80)}`);
    assert.ok(/loading="lazy"/.test(tag) || /fetchpriority="high"/.test(tag),
      `img with no loading strategy: ${tag.slice(0, 80)}`);
  }
  const eager = imgs.filter(t => /fetchpriority="high"/.test(t));
  assert.equal(eager.length, 2, `only the hero photo and logo should be eager, found ${eager.length}`);
});

test('display faces are preloaded', () => {
  assert.match(html, /<link rel="preload" as="font"[^>]*figtree-700\.woff2"/);
  assert.match(html, /<link rel="preload" as="font"[^>]*source-sans-3-400\.woff2"/);
});

test('small orange text uses the darkened ink, not the 3.59:1 brand orange', () => {
  // --em-orange on white is 3.59:1 and on --blue-100 is 3.15:1, both under
  // AA's 4.5:1 for text at these sizes. --em-orange-ink is the same hue at
  // 5.17:1 / 4.54:1. Fills, orange-on-navy and the focus ring keep the
  // original value, so this only ever applies to small text on light.
  assert.match(site, /--em-orange-ink:#BA4920/);
  const at = site.lastIndexOf('--em-orange-ink)');
  assert.ok(at > -1, 'the ink token is defined but never used');
  for (const sel of ['.em-eyebrow', '.em-article__more', '.em-solution__more', '.em-podcast__show']) {
    const re = new RegExp(`\\${sel}[,{][\\s\\S]{0,400}?var\\(--em-orange-ink\\)`);
    assert.match(site, re, `${sel} still resolves to the failing brand orange`);
  }
});

test('placeholder text clears 4.5:1 against the input background', () => {
  // components.css ships --grey-500 (#9A9A9A), 2.85:1 on white. Placeholder
  // text is text. The audit's sweep only walked rendered text nodes, so this
  // one was never measured.
  const at = site.indexOf('.em-input::placeholder');
  assert.ok(at > -1, 'no placeholder contrast override');
  assert.match(site.slice(at, site.indexOf('}', at)), /var\(--text-muted\)/);
});

test('standalone links meet the 24px minimum target size', () => {
  // SC 2.5.8. These are card and list links, not links inside a sentence,
  // so the inline exception does not apply. The footer "X" link measured
  // 8x22 before this.
  const at = site.indexOf('.em-footer__links a{');
  assert.ok(at > -1, 'no target-size rule for footer links');
  const rule = site.slice(at, site.indexOf('}', at));
  assert.match(rule, /min-height:24px/);
  assert.match(rule, /min-width:24px/);
});

test('the display scale is fluid, not fixed rem', () => {
  // Fixed rem display steps were the direct cause of a horizontal-scroll
  // failure at 200% text zoom (SC 1.4.4).
  for (const token of ['--fs-hero', '--fs-h1', '--fs-h2']) {
    const re = new RegExp(`${token}:clamp\\(`);
    assert.match(site, re, `${token} is not fluid`);
  }
});

test('homepage.css holds no hard-coded colours outside the token block', () => {
  const body = homepage.slice(homepage.indexOf('}', homepage.indexOf(':root{')));
  const hits = (body.match(/rgba?\(\d|#[0-9a-fA-F]{3,6}\b/g) || []);
  assert.equal(hits.length, 0, `hard-coded colour(s) outside :root: ${hits.join(', ')}`);
});

test('the section eyebrow is not one repeated treatment on every section', () => {
  // Six identical uppercase tracked kickers is the saturated landing-page
  // tell. The hero and stories keep the brand kicker; the rest are quiet
  // sentence-case lead-ins. Every roadmap string is preserved either way.
  const at = homepage.indexOf('.em-solutions__head .em-eyebrow');
  assert.ok(at > -1, 'no differentiated eyebrow treatment');
  const rule = homepage.slice(at, homepage.indexOf('}', at));
  assert.match(rule, /text-transform:none/);
  assert.match(rule, /letter-spacing:normal/);
});

test('dev server never leaks into the built page', () => {
  // dev.mjs injects its reload client into the HTTP response, not the file.
  // If this ever fails, a dev-only <script> is about to ship to WordPress.
  assert.ok(!html.includes('__dev/reload'), 'dev reload client written into dist/index.html');
  const shell = readFileSync('src/index.html', 'utf8');
  assert.ok(!shell.includes('dev.mjs'), 'dev server referenced from the page shell');
});

/* ===========================================================================
   The cross-page contract.

   Everything above this line is about the reference build specifically. What
   follows has to hold for EVERY homepage this repo produces, because these
   are presentations of one brand and one approved copy deck — not
   independent pages. A new option added to build.mjs picks all of this up
   automatically.
   ======================================================================== */

/* The four alternative designs Empower were choosing between. Three pages are
   excluded because they are not among them:

   current.html    the original wireframe build
   current-2.html  that build with a new header, banner and foundations — it
                   inherits the original's copy, including the sentence-case
                   headline the four options restore
   final.html      the COMBINATION Empower picked, assembled from the sections
                   of three different options

   final.html being outside this list is a temporary state, not a decision.
   It is the page that ships, so it should be the most checked, not the least.
   It is out because it currently fails the roadmap copy assertion below:
   Empower chose "Evolution" for sections 5 and 6, which resolves to the
   ORIGINAL build's partials, and those rewrote seven of the seventeen
   approved strings — the whole Join Us block ("Stay Connected", "Become an
   Ambassador", "Support Our Work" and their descriptions) plus the Latest
   Insights intro. See the open item in the vault: either the roadmap copy is
   restored into final's sections 5 and 6, or Empower sign off the rewrite.
   Whichever way it goes, final.html then joins this list. */
const NOT_OPTIONS = ['dist/current.html', 'dist/current-2.html', 'dist/final.html'];
const OPTIONS = HOMEPAGES.filter(p => !NOT_OPTIONS.includes(p.out));

test('every page in the manifest actually built', () => {
  for (const page of PAGES) {
    assert.ok(existsSync(page.out), `${page.out} is in PAGES but was never written`);
    assert.ok(statSync(page.out).size > 2000, `${page.out} looks truncated`);
  }
  assert.equal(OPTIONS.length, 4, `expected four alternative homepages, found ${OPTIONS.length}`);
});

test('no page ships an unresolved include marker', () => {
  for (const { out, html } of ALLPAGES) {
    assert.ok(!html.includes('@include'), `unresolved @include in ${out}`);
  }
});

/* The copy deck. Every string below is quoted from the Homepage section of
   the Website Refresh Roadmap and must appear verbatim on all five pages —
   this is the test that stops a redesign quietly rewriting the client's
   approved words. */
const ROADMAP_COPY = [
  'Real People. Real Problems. Real Solutions.',
  'You want to build a great life. Raise a family. Find meaningful work. Put down roots in a strong community. We work to expand opportunity so every Mississippian has the chance to achieve the American Dream right here at home.',
  'Explore Our Work',
  'The future you want starts with opportunity.',
  'Every family, worker, and community faces unique challenges, but lasting progress begins with practical solutions. We listen to the people affected, research what works, and partner with communities and leaders to create more opportunity across Mississippi.',
  'Empower Solutions Model',
  'You want to know your child has every opportunity to succeed.',
  'Working hard should open doors, not leave you struggling to get ahead.',
  'You should feel safe in the community you call home.',
  'Behind every solution is a real person.',
  'Stay connected with the latest research, conversations, and stories driving opportunities across Mississippi.',
  'Stay Connected',
  'Sign up for our newsletter to receive the latest stories, research, and updates.',
  'Become an Ambassador',
  'Help bring the conversation about opportunity to your community and inspire others to get involved.',
  'Your support helps advance practical solutions that create more opportunities across Mississippi.',
  'Support Our Work',
];

test('the four options carry the roadmap copy verbatim', () => {
  for (const { out, html } of OPTIONS) {
    for (const line of ROADMAP_COPY) {
      assert.ok(html.includes(line), `${out} is missing roadmap copy: "${line.slice(0, 60)}…"`);
    }
  }
});

test('the options restore the intro sentence the reference build dropped', () => {
  // The roadmap's Section 3 intro ends "We believe lasting change starts with
  // the foundations that shape your everyday life." The original build cut it.
  for (const { out, html } of OPTIONS) {
    assert.ok(html.includes('We believe lasting change starts with the foundations that shape your everyday life.'),
      `${out} drops the closing sentence of the Three Foundations intro`);
  }
});

test('the headline uses the roadmap capitalisation', () => {
  for (const { out, html } of OPTIONS) {
    assert.match(html, /Your American Dream Starts(&nbsp;| )Here\./,
      `${out} does not use the roadmap's "Your American Dream Starts Here."`);
  }
});

test('every page has exactly one h1 and no skipped heading levels', () => {
  for (const { out, html } of ALLPAGES) {
    const h1s = html.match(/<h1[\s>]/g) || [];
    assert.equal(h1s.length, 1, `${out} has ${h1s.length} h1 elements`);
    const levels = [...html.matchAll(/<h([1-5])[\s>]/g)].map(m => Number(m[1]));
    for (let i = 1; i < levels.length; i++) {
      assert.ok(levels[i] - levels[i - 1] <= 1,
        `${out} jumps from h${levels[i - 1]} to h${levels[i]}`);
    }
  }
});

/* The one-action rule is the brand's and applies to every page in the build.
   WHICH action it is is page-specific: the homepages all lead with the
   roadmap's "Explore Our Work", the About pages lead into the team page or
   the solutions. So the count is asserted for everything and the label only
   where the roadmap fixes it.

   THE TWO ALL CONTENT READINGS CARRY NONE, and that is asserted rather than
   waived: an index of everything Empower has published has nothing to ask for
   — the filter is the action — and a filled orange button on it would have to
   point somewhere the page is not about. Naming them here means a page that
   loses its action fails, and so does one of these two if it grows one. */
const NO_PRIMARY = ['dist/content-a.html', 'dist/content-b.html'];

test('one orange filled button per page', () => {
  for (const { out, html } of ALLPAGES) {
    const primaries = html.match(/em-btn--primary/g) || [];
    const expected = NO_PRIMARY.includes(out) ? 0 : 1;
    assert.equal(primaries.length, expected,
      `${out}: brand rule is one orange action per view, expected ${expected}, found ${primaries.length}`);
  }
});

test('every homepage’s orange button is the roadmap hero CTA', () => {
  for (const { out, html } of HOMEPAGES) {
    const at = html.indexOf('em-btn--primary');
    assert.match(html.slice(at, at + 200), /Explore Our Work/, `${out}'s orange button is not the hero CTA`);
  }
});

test('every homepage asks for an email address exactly once', () => {
  for (const { out, html } of HOMEPAGES) {
    const emails = html.match(/type="email"/g) || [];
    assert.equal(emails.length, 1, `${out} has ${emails.length} email inputs`);
    assert.match(html, /<label[^>]*for="join-email"/, `${out}'s email input has no label`);
  }
});

test('every image on every page has alt, dimensions and a loading strategy', () => {
  for (const { out, html } of ALLPAGES) {
    for (const tag of html.match(/<img\b[^>]*>/g) || []) {
      assert.match(tag, /\salt="/, `${out}: img without alt: ${tag.slice(0, 70)}`);
      assert.match(tag, /\swidth="\d+"/, `${out}: img without width: ${tag.slice(0, 70)}`);
      assert.match(tag, /\sheight="\d+"/, `${out}: img without height: ${tag.slice(0, 70)}`);
      assert.ok(/loading="lazy"/.test(tag) || /fetchpriority="high"/.test(tag),
        `${out}: img with no loading strategy: ${tag.slice(0, 70)}`);
    }
  }
});

test('every referenced photograph exists on disk', () => {
  for (const { out, html } of ALLPAGES) {
    for (const m of html.matchAll(/src="\.\.\/(assets\/[^"]+)"/g)) {
      assert.ok(existsSync(m[1]), `${out} references a missing asset: ${m[1]}`);
    }
  }
});

test('no page carries an inline style attribute', () => {
  // Elementor hand-off hygiene: styling belongs in the stylesheets.
  for (const { out, html } of ALLPAGES) {
    assert.ok(!/\sstyle="/.test(html), `${out} has an inline style attribute`);
  }
});

test('every aria-controls points at an id that exists, on every page', () => {
  for (const { out, html } of ALLPAGES) {
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
    for (const m of html.matchAll(/aria-controls="([^"]+)"/g)) {
      assert.ok(ids.has(m[1]), `${out}: aria-controls="${m[1]}" has no matching id`);
    }
  }
});

test('every aria-labelledby points at an id that exists, on every page', () => {
  for (const { out, html } of ALLPAGES) {
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
    for (const m of html.matchAll(/aria-labelledby="([^"]+)"/g)) {
      for (const ref of m[1].split(/\s+/)) {
        assert.ok(ids.has(ref), `${out}: aria-labelledby="${ref}" has no matching id`);
      }
    }
  }
});

test('nothing focusable is buried inside aria-hidden', () => {
  // An aria-hidden subtree containing a link or a button is an ARIA violation
  // even when the element carries tabindex="-1" — it stays programmatically
  // focusable and lands a screen-reader user on an element that is not there.
  for (const { out, html } of ALLPAGES) {
    for (const m of html.matchAll(/<(\w+)([^>]*\saria-hidden="true"[^>]*)>/g)) {
      assert.ok(!/^\s*<?(a|button)\b/.test(m[0]) && m[1] !== 'a' && m[1] !== 'button',
        `${out}: aria-hidden on a focusable ${m[1]}: ${m[0].slice(0, 80)}`);
    }
  }
});

test('every page carries the skip link, and it targets the main landmark', () => {
  for (const { out, html } of ALLPAGES) {
    assert.match(html, /<a class="em-skip" href="#main">/, `${out} has no skip link`);
    assert.match(html, /<main id="main">/, `${out} has no <main id="main"> for the skip link`);
  }
});

test('every page loads the shared chrome before its own stylesheet', () => {
  for (const { out, html, src } of ALLPAGES) {
    const ownSlug = src.split('/')[0] === 'index.html' ? 'homepage' : src.split('/')[0];
    const own = cssFileFor(ownSlug);
    const siteAt = html.indexOf('css/site.css');
    assert.ok(siteAt > -1, `${out} does not load css/site.css`);
    assert.ok(html.indexOf('components/components.css') < siteAt,
      `${out} loads site.css before components.css`);
    assert.ok(html.indexOf(own) > siteAt, `${out} loads ${own} before css/site.css`);
    // megamenu.css overrides .em-mega's base layout and has to come last.
    // current-2.html has no mega menus and does not load it — its dropdown
    // rules live in its own stylesheet instead.
    if (html.includes('css/megamenu.css')) {
      assert.ok(html.indexOf('css/megamenu.css') > html.indexOf(own),
        `${out} loads megamenu.css before its own stylesheet`);
    } else {
      assert.ok(!html.includes('em-mega'), `${out} uses mega markup without loading megamenu.css`);
    }
  }
});

test('every page ships the three behaviour modules and no preview-only script', () => {
  for (const { out, html } of ALLPAGES) {
    for (const js of ['js/nav.js', 'js/reveal.js']) {
      assert.ok(html.includes(js), `${out} does not load ${js}`);
    }
    // Every page carries exactly one desktop-nav module. It is megamenu.js
    // everywhere except current-2.html, whose header uses simple dropdowns
    // — but a page with neither has an inert desktop nav, and a page with
    // both would have two scripts fighting over the same triggers.
    const desktopNav = ['js/megamenu.js', 'js/dropdown.js'].filter(js => html.includes(js));
    assert.equal(desktopNav.length, 1,
      `${out} loads ${desktopNav.length} desktop nav modules: ${desktopNav.join(', ') || 'none'}`);
    assert.ok(!html.includes('controls.js'), `${out} still loads the deleted preview switcher`);
    assert.ok(!html.includes('wireframe.css'), `${out} still links the deleted wireframe skin`);
  }
});

test('every reveal attribute on every page is one of the documented variants', () => {
  const allowed = new Set(['rise', 'fade', 'slide-l', 'slide-r', 'clip']);
  for (const { out, html } of ALLPAGES) {
    for (const m of html.matchAll(/data-reveal="([^"]*)"/g)) {
      assert.ok(allowed.has(m[1]), `${out}: undocumented reveal variant "${m[1]}"`);
    }
  }
});

test('no option stylesheet hides content behind a hover-only rule', () => {
  // A rule that sets display:none or visibility:hidden outside a media query
  // or a reduced-motion block is how a section ends up unreachable on touch,
  // where there is no hover to bring it back.
  for (const opt of ['a', 'b', 'c', 'd']) {
    const css = readFileSync(`css/option-${opt}.css`, 'utf8');
    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
    for (const block of stripped.split('}')) {
      const [selector, body] = block.split('{');
      if (!body || !/display:\s*none|visibility:\s*hidden/.test(body)) continue;
      assert.ok(!/:hover|:focus-within/.test(selector) || /@media/.test(block),
        `option-${opt}.css hides content on a hover state: ${selector.trim().slice(0, 70)}`);
    }
  }
});

test('every option honours prefers-reduced-motion', () => {
  for (const opt of ['a', 'b', 'c', 'd']) {
    const css = readFileSync(`css/option-${opt}.css`, 'utf8');
    assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)/,
      `option-${opt}.css has no reduced-motion block`);
  }
});

test('option stylesheets hold no hard-coded brand colours', () => {
  // Scrims are the deliberate exception: rgba(0,41,53,...) is --em-blue at a
  // measured alpha, and CSS cannot express that through a token without
  // color-mix support this build does not assume.
  for (const opt of ['a', 'b', 'c', 'd']) {
    const css = readFileSync(`css/option-${opt}.css`, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/rgba\(0,\s*41,\s*53[^)]*\)/g, '')
      .replace(/rgba\(255,\s*255,\s*255[^)]*\)/g, '');
    const hex = css.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
    assert.equal(hex.length, 0,
      `option-${opt}.css hard-codes ${hex.join(', ')} instead of using a token`);
  }
});

test('copy in every option uses curly apostrophes and quotes, not ASCII', () => {
  for (const opt of ['a', 'b', 'c', 'd']) {
    const dir = `src/option-${opt}/sections`;
    for (const f of readdirSync(dir)) {
      const s = readFileSync(`${dir}/${f}`, 'utf8');
      const bad = s.match(/[A-Za-z]'[A-Za-z]/g) || [];
      assert.equal(bad.length, 0,
        `option-${opt}/${f} has straight apostrophes: ${bad.join(', ')} — brand copy requires U+2019`);
      const textOnly = s.replace(/<[^>]+>/g, '');
      assert.ok(!textOnly.includes('"'),
        `option-${opt}/${f} has straight double quotes in prose; use U+201C/U+201D`);
    }
  }
});

test('the shared header and footer are shared, not copied per option', () => {
  // Divergent copies of the nav is the failure mode this structure exists to
  // prevent. Every page shell must pull its header from _shared/, never carry
  // its own. There are two headers, both shared: header.html (mega menus) and
  // header-2.html (simple dropdowns), which current-2.html uses.
  for (const page of PAGES) {
    if (page.out === 'dist/index.html') continue;
    const shell = readFileSync(`src/${page.src}`, 'utf8');
    assert.match(shell, /<!--@include _shared\/header(-2)?\.html-->/, `${page.src} does not include a shared header`);
    assert.match(shell, /<!--@include _shared\/footer\.html-->/, `${page.src} does not include the shared footer`);
  }
  assert.ok(!existsSync('src/sections/00-header.html'), 'a stale per-page header partial is back');
});

test('the chooser filters without a script, and every control is a real one', () => {
  /* The review index has loaded no scripts since it was built, and a filter
     rail was not the reason to start. Checkboxes for the facets, a native
     <button type="reset"> to clear them, a <details> to fold the rail away, and
     :has() to do the filtering — all four are the reason the <form> around the
     rail is load-bearing rather than decoration. */
  const chooser = readFileSync('dist/index.html', 'utf8');
  const css = readFileSync('css/chooser.css', 'utf8');

  assert.equal((chooser.match(/<script/g) || []).length, 0,
    'the chooser has grown a script — the rail is meant to be CSS and form controls');
  assert.match(chooser, /<form class="ch__rail">/, 'the rail is not a form, so reset cannot work');
  assert.match(chooser, /<button class="ch__rail__clear" type="reset">/,
    'Clear filters is not a native form reset');
  assert.match(css, /@supports not selector\(body:has\(a\)\)/,
    'the rail is not gated behind an @supports test for :has()');

  /* Every facet is an input with a label bound to it by id. A label that has
     drifted off its input is a filter a keyboard cannot reach. */
  const ids = [...chooser.matchAll(/<input class="ch__check__input[^"]*" type="checkbox" id="([^"]+)"/g)]
    .map(m => m[1]);
  assert.deepEqual(ids,
    ['to-review', 'signed-off', 'archived',
     'set-home', 'set-who', 'set-do', 'set-team', 'set-solutions',
     'set-education', 'set-work', 'set-safety', 'set-podcast', 'set-capitol', 'set-epic',
     'set-mail', 'set-amb', 'set-give', 'set-content', 'set-landing', 'set-contact', 'set-legal'],
    'the facets in the rail are not the three statuses and eighteen sets expected');
  for (const id of ids) {
    assert.ok(chooser.includes(`<label class="ch__check__label" for="${id}">`),
      `the ${id} facet has no label bound to it`);
  }

  /* The Set facet folds, because sixteen rows made the rail taller than the page
     beside it. Three things have to hold. It is a <details> and it is SHUT, which
     is the point. The fieldset and its legend survive inside it, so the grouping
     is still there for a screen reader even though the summary is what is read
     visually. And a set ticked behind a shut panel has to announce itself, or the
     page is filtered for a reason nobody can see. */
  assert.match(chooser, /<details class="ch__facet ch__facet--fold">/,
    'the Set facet is not collapsible, and eighteen rows is longer than the page beside it');
  assert.ok(!/<details class="ch__facet ch__facet--fold" open>/.test(chooser),
    'the Set facet ships open, so folding it buys nothing');
  assert.match(chooser, /<fieldset class="ch__facet__body">\s*\n\s*<legend class="em-visually-hidden">Set<\/legend>/,
    'the Set checkboxes have lost their fieldset or its legend, so they are no longer a named group');
  assert.match(css, /\.ch__facet--fold:has\(\.ch__set:checked\) \.ch__facet__summary::after\{content:"Filtered"/,
    'a set ticked behind the shut Set panel says nothing, so the page is filtered invisibly');
});

test('every build on the chooser is filterable, and every set has exactly one pick', () => {
  /* The Set facet works by hiding everything and revealing what is ticked, so a
     card without a data-set is a card that disappears and never comes back.

     The pick count matters as much: Status filters to .ch__opt--pick, so a set
     with no pick would vanish from the signed-off view and a set with two would
     quietly claim Empower chose twice. */
  const chooser = readFileSync('dist/index.html', 'utf8');
  const css = readFileSync('css/chooser.css', 'utf8');

  const cards = chooser.match(/<li[^>]*class="ch__opt[^"]*"/g) || [];
  const tagged = chooser.match(/<li data-set="[a-z]+" class="ch__opt/g) || [];
  assert.equal(tagged.length, cards.length,
    `${cards.length - tagged.length} cards have no data-set and would vanish when the Set facet is used`);

  /* Empower chose every set on the chooser except Donate. On 2026-08-07 they
     took Streetlight as the single solution template, The Studio for the
     podcast and The Dome for Capitol Chat; on 2026-08-11 they took The Pinned
     Method for EPIC (with the method section swapped for The Instrument's),
     Five Minutes for Email Sign Up and The Network for Ambassador.

     Three sets are still open. Donate is open for a different reason from the
     others: Empower did not pick between A and B, they asked for a different
     direction, and C and D are the two answers to that. All Content went up on
     2026-08-12 with two readings and has not been seen yet. The landing page
     template went up the same day with two readings of its own, which differ in
     one decision: whether the ask waits at the bottom of the page or is held
     beside the argument.

     Moving a key off this list is the commit that records the decision. */
  /* `legal` joined the undecided sets on 2026-09-02. It is undecided in a
     different sense from the other two: nothing is being chosen between, because
     the two cards are a privacy policy and a terms document rather than two
     readings of one brief. What is open is Empower's sign-off on the
     transcription and on the wording questions the move surfaced, so it carries
     no pick for the same reason a set awaiting a decision carries none. */
  const UNDECIDED = ['content', 'landing', 'contact', 'legal'];
  const sections = chooser.match(/<section data-set="[a-z]+" data-state="[a-z]+" aria-labelledby="group-[^"]+"[\s\S]*?<\/section>/g) || [];
  assert.equal(sections.length, 18, `expected eighteen sets on the chooser, found ${sections.length}`);
  for (const section of sections) {
    const key = section.match(/data-set="([a-z]+)"/)[1];
    const picks = (section.match(/ch__opt--pick/g) || []).length;
    const expected = UNDECIDED.includes(key) ? 0 : 1;
    assert.equal(picks, expected,
      `the ${key} set has ${picks} chosen builds, expected ${expected}` +
      (expected === 0 ? ' — it is still awaiting Empower’s decision' : ''));
    assert.ok(css.includes(`#set-${key}:checked`), `no facet rule reveals the ${key} set`);
  }
});

test('every number on the chooser rail counts something real', () => {
  /* The counts beside each facet, and the New badges, are hand-written. This
     build has been bitten twice by hand-maintained lists that stopped matching
     what was built and went on passing: the side-stripe sweep with its typed
     page list, and these badges, which still said "New today" about four sets a
     week after they went up. A number nobody checks is a number that quietly
     becomes wrong, and on a page whose whole job is helping Empower see what
     changed, that is worse than having no number.

     So: each Set count is how many builds exist for that set, and the Signed off
     count is the number of chosen builds across the page. Both derived from the
     markup, not from memory.

     A set's builds are no longer all in its own section: the ones Empower did not
     take are rows in the archive at the foot of the page. The count still means
     "builds for this set", so it counts both, which is also why ticking a set and
     finding fewer things than the number promised is a failure this catches. */
  const chooser = readFileSync('dist/index.html', 'utf8');

  const sections = chooser.match(/<section data-set="[a-z]+" data-state="[a-z]+" aria-labelledby="group-[^"]+"[\s\S]*?<\/section>/g) || [];
  for (const section of sections) {
    const key = section.match(/data-set="([a-z]+)"/)[1];
    const inSection = (section.match(/<li data-set="[a-z]+" class="ch__opt/g) || []).length;
    const archived = (chooser.match(new RegExp(`<li class="ch__arc__item" data-set="${key}"`, 'g')) || []).length;
    const built = inSection + archived;

    const facet = chooser.match(
      new RegExp(`id="set-${key}"[\\s\\S]*?<span class="ch__check__n">(\\d+)</span>`));
    assert.ok(facet, `the ${key} facet has no count beside it`);
    assert.equal(Number(facet[1]), built,
      `the ${key} facet says ${facet[1]} builds, the page shows ${built}`);
  }

  /* The three Status counts, each against the thing it filters to. Signed off is
     the picks, To review is every card that is not one (only the open sets have
     any, because a decided set keeps nothing else), and Archived is the rows in
     the archive. These are the numbers a client reads to know how much is left,
     so they are the last three on this page that should be allowed to drift. */
  const statusCount = id =>
    Number(chooser.match(new RegExp(`id="${id}"[\\s\\S]*?<span class="ch__check__n">(\\d+)</span>`))[1]);
  const cardsIn = sections.join('');
  const picks = (cardsIn.match(/ch__opt--pick/g) || []).length;
  const open = (cardsIn.match(/<li data-set="[a-z]+" class="ch__opt">/g) || []).length;
  const archived = (chooser.match(/<li class="ch__arc__item"/g) || []).length;

  assert.equal(statusCount('signed-off'), picks,
    `the Signed off facet says ${statusCount('signed-off')}, the page marks ${picks} chosen builds`);
  assert.equal(statusCount('to-review'), open,
    `the To review facet says ${statusCount('to-review')}, the page shows ${open} builds without a decision`);
  assert.equal(statusCount('archived'), archived,
    `the Archived facet says ${statusCount('archived')}, the archive holds ${archived}`);
  /* And the three together account for every build the page offers, each exactly
     once: a page listed twice, or a card in neither state, shows up here as a sum
     that does not match. */
  const offered = new Set([
    ...[...cardsIn.matchAll(/<h3><a href="([a-z0-9-]+\.html)"/g)].map(m => m[1]),
    ...[...chooser.matchAll(/<h4 class="ch__arc__name"><a href="([a-z0-9-]+\.html)"/g)].map(m => m[1]),
  ]);
  assert.equal(picks + open + archived, offered.size,
    `the three Status counts add up to ${picks + open + archived}, but the page offers ${offered.size} distinct builds`);

  /* And a New badge only on a set Empower has not chosen from yet. Once a set is
     decided it is not news, it is a record. */
  for (const section of sections) {
    const key = section.match(/data-set="([a-z]+)"/)[1];
    const decided = section.includes('ch__opt--pick');
    const badged = new RegExp(`id="set-${key}"[\\s\\S]{0,240}?ch__new`).test(chooser);
    if (decided) {
      assert.ok(!badged, `the ${key} set is chosen and still carries a New badge`);
    }
  }
});

test('the chooser archives every build Empower did not take, and nothing else', () => {
  /* Sign-off is what this page is for now, so a decided set shows one decision
     and the builds it was chosen over are rows in the archive. Two ways that can
     rot, and both are checked against the page rather than against a list: a
     decided set keeping a second card, and a build that left its section without
     arriving in the archive. The second one is the dangerous one, because the
     page still looks finished and a build has simply vanished from review. */
  const chooser = readFileSync('dist/index.html', 'utf8');
  const sections = chooser.match(/<section data-set="[a-z]+" data-state="[a-z]+" aria-labelledby="group-[^"]+"[\s\S]*?<\/section>/g) || [];
  const archive = chooser.slice(chooser.indexOf('<section class="ch__archive"'));

  const archived = [...archive.matchAll(/<li class="ch__arc__item" data-set="([a-z]+)">[\s\S]*?href="([^"]+)"/g)]
    .map(m => ({ set: m[1], href: m[2] }));

  for (const section of sections) {
    const key = section.match(/data-set="([a-z]+)"/)[1];
    const cards = section.match(/<li data-set="[a-z]+" class="ch__opt[^"]*"/g) || [];
    const mine = archived.filter(a => a.set === key);

    if (!section.includes('ch__opt--pick')) {
      assert.equal(mine.length, 0,
        `the ${key} set is still open and has ${mine.length} builds in the archive — nothing there has been chosen over anything`);
      continue;
    }

    assert.equal(cards.length, 1,
      `the ${key} set is decided and shows ${cards.length} cards; everything but the decision belongs in the archive`);

    if (mine.length) {
      assert.match(section, new RegExp(`<p class="ch__also">[^<]*<a href="#archive-${key}">`),
        `the ${key} set has ${mine.length} builds in the archive and no line pointing at them`);
      assert.ok(archive.includes(`id="archive-${key}"`),
        `the ${key} set points at an archive group that does not exist`);
    }
  }

  /* Every archived row is a page that this build actually produces, and the pick
     of a set is never one of them. */
  const built = new Set(PAGES.map(p => p.out.replace('dist/', '')));
  for (const row of archived) {
    assert.ok(built.has(row.href), `the archive links ${row.href}, which this build does not produce`);
  }
  const picked = [...chooser.matchAll(/class="ch__opt ch__opt--pick">[\s\S]*?<h3><a href="([^"]+)"/g)].map(m => m[1]);
  for (const href of picked) {
    assert.ok(!archived.some(a => a.href === href),
      `${href} is both a chosen build and archived`);
  }

  /* 26 rows today. The number is derived, so this line is only here to make the
     shape of the page visible in the test output. */
  assert.equal(archived.length, 26, `the archive holds ${archived.length} builds, expected 26`);
});

test('the chooser archive filters with the rail, and says so when a set has nothing in it', () => {
  /* The enumeration is the price of filtering without a script, so it is derived
     rather than trusted: every set that HAS an archive group needs a reveal rule,
     every set that does not must not have one, and the selector that shows the
     "nothing archived" line has to name exactly the sets that do. Get the last
     one wrong and either a filter shows an empty heading or the message appears
     over a full list. */
  const chooser = readFileSync('dist/index.html', 'utf8');
  const css = readFileSync('css/chooser.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const withArchive = [...chooser.matchAll(/<div class="ch__arc" id="archive-([a-z]+)"/g)].map(m => m[1]);
  const allSets = [...chooser.matchAll(/<input class="ch__check__input ch__set" type="checkbox" id="set-([a-z]+)"/g)]
    .map(m => m[1]);

  for (const key of allSets) {
    const rule = css.includes(`body:has(#set-${key}:checked) .ch__arc[data-set="${key}"]`);
    if (withArchive.includes(key)) {
      assert.ok(rule, `ticking ${key} in the rail hides its own archive group`);
    } else {
      assert.ok(!rule, `${key} has a rule revealing an archive group it does not have`);
    }
  }

  /* The guarded selector, not the base rule that hides it: the one line that
     mentions the message AND a facet. */
  const none = css.split('\n').find(line => line.includes('.ch__arc__none') && line.includes(':not(:has('));
  assert.ok(none, 'nothing ever shows the "nothing archived" line');
  const guarded = [...none.matchAll(/:not\(:has\(#set-([a-z]+):checked\)\)/g)].map(m => m[1]);
  assert.deepEqual(guarded.sort(), [...withArchive].sort(),
    'the "nothing archived" line is guarded on the wrong set of sets, so it will appear over a full archive or hide behind an empty one');

  /* The archive is hidden by default and there are exactly three ways in. The
     first two matter to a reader: the facet, and any link in the page that asks
     for it, which works through :target because a link cannot tick a checkbox
     without a script. The third is the rule that lets an explicit status choice
     override a stale fragment left in the address bar. */
  assert.match(css, /\.ch__archive\{display:none/,
    'the archive is not hidden by default, and these are the builds that did not make it');
  assert.match(css, /body:has\(#archived:checked\) \.ch__archive\{display:block\}/,
    'ticking Archived does not show the archive');
  assert.match(css, /\.ch__archive:target,\s*\n\.ch__archive:has\(:target\)\{display:block\}/,
    'a link to the archive cannot open it, so every pointer under a decided set is a dead link while it is hidden');
  assert.match(css, /body:has\(\.ch__set:checked\) \.ch__results > section\.ch__archive:target/,
    'a link to the archive stops working as soon as a set filter is on');
  assert.match(css, /body:has\(\.ch__status:checked\):not\(:has\(#archived:checked\)\) \.ch__archive\{display:none\}/,
    'a status other than Archived leaves the archive open if a fragment happens to point into it');

  /* And the statuses themselves: hides, one per status, each naming the state it
     spares. Written as reveals they would fight the Set facet instead of
     composing with it. */
  for (const [id, state] of [['signed-off', 'decided'], ['to-review', 'open']]) {
    assert.match(css, new RegExp(`body:has\\(\\.ch__status:checked\\):not\\(:has\\(#${id}:checked\\)\\) \\.ch__results > section\\[data-state="${state}"\\]`),
      `nothing hides the ${state} sets when a status other than ${id} is ticked`);
  }
});

test('the chooser page is review-only and never links into the hand-off as a homepage', () => {
  const chooser = readFileSync('dist/index.html', 'utf8');
  assert.match(chooser, /<meta name="robots" content="noindex">/, 'the chooser is indexable');
  assert.ok(!chooser.includes('em-header__nav'), 'the chooser is pulling in the site header');

  /* Every page in the manifest has to be reachable from the chooser, so a
     design cannot silently drop out of review. ONE named exemption:
     current.html is the original wireframe build, and Empower are no longer
     being asked to consider it — it was pulled from the grid once the five
     proposals were finished. It still builds, and its URL still resolves for
     anyone who wants to diff against what exists today, but it is not offered
     as a choice. Named explicitly rather than skipped by a rule, so removing
     any OTHER page from the chooser still fails this test. */
  const UNLISTED = ['dist/index.html', 'dist/current.html', 'dist/final.html'];
  for (const page of PAGES) {
    if (UNLISTED.includes(page.out)) continue;
    const file = page.out.replace('dist/', '');
    assert.ok(chooser.includes(`href="${file}"`), `the chooser does not link to ${file}`);
  }
  assert.ok(!chooser.includes('href="current.html"'),
    'current.html is back in the chooser — if that is intended, drop it from UNLISTED above');
});

/* ---------------------------------------------------------------------------
   Comment termination
   ------------------------------------------------------------------------ */

/* This exists because css/final.css was silently inert for its whole life. Its
   header comment described the namespacing as ".fp-" and ".tl-" followed by a
   star — and a star followed by a slash CLOSES a CSS comment. Everything after
   that point stopped being a comment: the remaining prose parsed as garbage
   selectors, the file's one real rule was swallowed with it, and the browser
   reported zero rules for a stylesheet that looks perfectly fine on disk.

   Nothing else catches this. The file is valid text, the build copies it
   unchanged, the server returns 200 with the right MIME type, and the page
   simply renders as though the stylesheet were not linked at all.

   The check: walk each file tracking whether we are inside a comment. A
   terminator found OUTSIDE one means a comment ended somewhere its author did
   not intend, because the prose that followed it is now being read as CSS. */
test('no stylesheet closes a comment by accident', () => {
  const sheets = ['css', 'tokens', 'components']
    .flatMap(dir => readdirSync(dir).filter(f => f.endsWith('.css')).map(f => `${dir}/${f}`));
  assert.ok(sheets.length > 0, 'found no stylesheets to check');

  for (const sheet of sheets) {
    const css = readFileSync(sheet, 'utf8');
    let inComment = false;
    for (let i = 0; i < css.length - 1; i++) {
      if (!inComment && css[i] === '/' && css[i + 1] === '*') { inComment = true; i++; continue; }
      if (css[i] === '*' && css[i + 1] === '/') {
        const line = css.slice(0, i).split('\n').length;
        assert.ok(inComment,
          `${sheet}:${line} closes a comment that was not open — the text before it ` +
          `contains a star-slash pair, so the real comment ended early and the rest ` +
          `of the file is being parsed as CSS`);
        inComment = false;
        i++;
      }
    }
    assert.ok(!inComment, `${sheet} ends inside an unterminated comment`);
  }
});

/* ===========================================================================
   The About Us contract.

   Six pages: three readings of Who We Are and three of What We Do. They share
   the chrome and the tokens with the homepages, and everything in the sweeps
   above applies to them — but their copy comes from two different tabs of the
   roadmap, so the copy deck is asserted here instead.

   The rule this block exists to enforce is the one this build has broken
   before: NO INVENTED SENTENCE MAY READ AS APPROVED COPY. Every sentence of
   prose on these pages is quoted from the roadmap's Who We Are and What We Do
   tabs. Where a variation splits an approved sentence across a heading and a
   paragraph, or sets a list the sentence describes, the words are unchanged —
   which is why the strings below are asserted as fragments in some places and
   whole sentences in others, and why the split points are named.
   ======================================================================== */

const WHO_WE_ARE_COPY = [
  /* Why We Exist — the headline, then all four paragraphs. */
  'Empower exists because we want every Mississippian to have the opportunity to achieve the American Dream right here at home.',
  'Every Mississippian deserves the opportunity to build a good life, raise a family, find meaningful work, and pursue their dreams.',
  'Too often, outdated policies and unnecessary barriers stand in the way. We believe government policy should create opportunity, not limit it.',
  'Empower Mississippi exists to create a path to generational prosperity for Mississippi’s children, workers, and families.',
  'We aren’t interested in politics for politics’ sake. We’re interested in results that improve people’s lives.',

  /* Our Story. "Our Story" is the roadmap's own Headline: for that section —
     NOT one of the internal section labels Empower asked us to drop
     (2026-08-03: "section 3 would just start with Our Story instead of History
     of Empower"). It was briefly stripped from all three variations along with
     the labels, which is the mistake this line exists to prevent. The sentence
     under it is quoted whole, colon included. */
  'Our Story',
  'Empower Mississippi began with a simple question: Why are so many Mississippians struggling to build the life they want right here at home?',
  'In 2013, a small group of Mississippians gathered around a restaurant patio table with a shared love for their state and a belief that Mississippi’s best days were still ahead.',
  'That vision became Empower Mississippi.',
  'Today, we work alongside citizens, community leaders, and policymakers to remove barriers to opportunity',

  /* Our People, and the three legal entities. */
  'Meet the people behind Empower Mississippi.',
  'Empower Mississippi works to Educate, Engage, and Elect Mississippians dedicated to removing barriers to opportunity.',
  'Empower Mississippi Foundation is a 501(c)(3) nonprofit organization working to educate citizens. Contributions are tax deductible for federal income tax purposes.',
  'Empower Mississippi is a 501(c)(4) advocacy organization working to engage citizens in the public policy process. Contributions are not tax deductible for federal income tax purposes.',
  'Empower PAC is a state political action committee working to support candidates for the legislature who are committed to removing barriers to opportunity so all Mississippians can flourish.',
];

const WHAT_WE_DO_COPY = [
  'You want to build a great life.',
  'We’re here to help.',
  'Each of us has been entrusted with the privilege—and the responsibility—of helping to leave Mississippi better than we found it.',
  'Quality Education',
  'Helping every child access the education they need to reach their full potential.',
  'Meaningful Work',
  'Removing barriers so more Mississippians can find meaningful work and build lasting prosperity.',
  'Public Safety',
  'Creating safer communities where families and opportunity can thrive.',
  'View our annual reports:',
  '2025', '2024', '2023', '2022',
];

test('the About Us set is three Who We Are pages and three What We Do pages', () => {
  const who = ABOUTPAGES.filter(p => p.out.includes('who-we-are'));
  const what = ABOUTPAGES.filter(p => p.out.includes('what-we-do'));
  assert.equal(who.length, 3, `expected three Who We Are variations, found ${who.length}`);
  assert.equal(what.length, 3, `expected three What We Do variations, found ${what.length}`);
});

/* The comparison is against the page's TEXT, not its markup. Two of the six
   variations break an approved sentence across an <em> so the last clause can
   take the accent colour, exactly as the homepage does with "Starts Here." —
   the words are identical and the reader sees one sentence, so a raw
   html.includes() would fail on a page that is entirely correct. */
const textOf = html => html
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ');

test('every Who We Are variation carries the roadmap copy verbatim', () => {
  for (const { out, html } of ABOUTPAGES.filter(p => p.out.includes('who-we-are'))) {
    const text = textOf(html);
    for (const line of WHO_WE_ARE_COPY) {
      assert.ok(text.includes(line), `${out} is missing roadmap copy: "${line.slice(0, 60)}…"`);
    }
  }
});

test('every What We Do variation carries the roadmap copy verbatim', () => {
  for (const { out, html } of ABOUTPAGES.filter(p => p.out.includes('what-we-do'))) {
    const text = textOf(html);
    for (const line of WHAT_WE_DO_COPY) {
      assert.ok(text.includes(line), `${out} is missing roadmap copy: "${line.slice(0, 60)}…"`);
    }
  }
});

/* ==========================================================================
   Team, Board & Fellows.

   The roster page is not a variation and has no sibling to be checked against,
   so its whole contract lives here: the roadmap's hero copy, then every name
   and title on the page. A roster is the one page type where a quiet omission
   (a person dropped, a title stale) is invisible in review and unforgivable
   after hand-off, so the lists below are asserted whole rather than sampled.
   ========================================================================== */

const TEAM_COPY = [
  /* Section 1, the hero, in full. */
  'Rooted in Mississippi. Committed to its Future.',
  'We know the promise of Mississippi because we’ve built our lives here. And we know the challenges, because our state only truly thrives when hard work leads to earned success for every family in every neighborhood.',
  'Our staff, board members, and fellows are committed to creating a path to generational prosperity for Mississippi’s children, workers, and families. Together, we’ve built the state’s leading public policy organization by advancing practical solutions that expand opportunity and help Mississippi reach its full potential.',

  /* The roadmap's own group headings, and its own note about the ordering. */
  'Contributing Fellows',
  'Board of Directors',
  'In alphabetical order by last name',

  /* The founder's bio paragraph is NOT asserted here. Empower asked on
     2026-08-05 for every card on The Roster to be the same size, which took the
     bio off that page; it is asserted whole on dist/team-bio.html instead, in
     BIO_COPY below. Variations B and C still carry it, and are welcome to. */
];

/* Name, title, bio-page slug. Order here is the roadmap's alphabetical-by-last-
   name rule applied literally, which moves Richards above Thigpen; the roadmap
   itself lists those two the other way round.

   NINE, NOT TEN, SINCE 2026-08-21, and two of the nine changed title in the
   same edit. Kienna Horn: Wil Ervin "is moving on to another job opportunity at
   the end of the month, so he'll need to be removed from the staff page along
   with his bio and any related information", and "Patrick and Gina have both
   had title and position updates". Gina Metzger's Executive Vice President is
   now Dr. Patrick Miller's; hers is Chief Administrative Officer. All three
   changes are read from Empower's own roadmap table, which they edited the same
   day, not from the SEO sheet that arrived with them. */
const TEAM_STAFF = [
  ['Grant Callen', 'Founder & CEO', 'grant-callen'],
  ['Ashley Green', 'Director of Outreach', 'ashley-green'],
  ['Kienna Horn', 'Director of Communications', 'kienna-horn'],
  ['Elyse Marcellino', 'Director of Embark', 'elyse-marcellino'],
  ['Gina Metzger', 'Chief Administrative Officer', 'gina-metzger'],
  ['Dr. Patrick Miller', 'Executive Vice President', 'patrick-miller'],
  ['Joanna Pevey', 'Executive Assistant & Development Manager', 'joanna-pevey'],
  ['Dr Kristin Vance Richards', 'Director of Research', 'kristin-vance-richards'],
  ['Forest Thigpen', 'Senior Advisor', 'forest-thigpen'],
];

const TEAM_FELLOWS = [
  ['J. Robertson', 'Fellow on Criminal Justice Reform'],
  ['Christopher Koopman', 'Fellow on Regulation & Innovation'],
  ['Conor Norris', 'Fellow on Entrepreneurship'],
  ['Matt Ladner', 'Fellow on Education'],
  ['Rebekah Staples', 'Fellow on Work'],
];

const TEAM_BOARD = [
  'Abb Payne', 'Grant Callen', 'Betsy Dowell', 'Sunny Desai',
  'Gerard Gibert', 'Lex Lindsey', 'Marie Sanderson', 'George Williams',
];

/* The three variations only. dist/team-bio.html shares the prefix but is a
   staff detail screen, not a reading of the roster, and it is asserted on its
   own below. */
const TEAMPAGES = ABOUTPAGES.filter(p => /team-[abc]\.html$/.test(p.out));

test('all three team variations build', () => {
  assert.equal(TEAMPAGES.length, 3, `expected three team variations, found ${TEAMPAGES.length}`);
});

test('every team variation carries the roadmap copy verbatim', () => {
  for (const { out, html } of TEAMPAGES) {
    const text = textOf(html);
    for (const line of TEAM_COPY) {
      assert.ok(text.includes(line), `${out} is missing roadmap copy: "${line.slice(0, 60)}…"`);
    }
  }
});

test('every member of staff appears on every variation, with title and bio link', () => {
  for (const { out, html } of TEAMPAGES) {
    const text = textOf(html);
    for (const [name, title, slug] of TEAM_STAFF) {
      assert.ok(text.includes(name), `${out} is missing ${name}`);
      assert.ok(text.includes(title), `${out} is missing ${name}'s title "${title}"`);
      /* The roadmap's section 2: "Each staff photo links to their full bio
         page." One of those pages exists — the CEO's — so every card points at
         it for review. When the other eight are built this becomes a per-person
         destination, and `slug` below is the name each one will take. */
      assert.ok(html.includes('href="team-bio.html"'),
        `${out} does not link ${name} to the staff detail screen`);
      assert.ok(typeof slug === 'string' && slug.length > 0,
        `${name} has no slug for the bio page still to be built`);
    }
  }
});

test('every fellow and board member appears on every variation', () => {
  for (const { out, html } of TEAMPAGES) {
    const text = textOf(html);
    for (const [name, field] of TEAM_FELLOWS) {
      assert.ok(text.includes(name), `${out} is missing fellow ${name}`);
      assert.ok(text.includes(field), `${out} is missing ${name}'s field "${field}"`);
    }
    for (const name of TEAM_BOARD) {
      assert.ok(text.includes(name), `${out} is missing board member ${name}`);
    }
    for (const role of ['Chairman', 'Treasurer']) {
      assert.ok(text.includes(role), `${out} does not mark the ${role}`);
    }
  }
});

test('every monogram tile on every team variation is marked as a placeholder', () => {
  /* Nothing in assets/photography is a headshot, so every portrait on these
     pages is a monogram tile. HOW MANY differs by variation — A frames all 23,
     B gives discs to the staff only, C plates the staff and sets the fellows
     and board as type — so the assertion is not a count but a rule: every tile
     that exists is marked in the markup, and a page showing tiles says so in
     words. When the last tile on a page is replaced, this is what tells you
     that page's note can go. */
  const TILE = /<span[^>]*class="t[abc]-(?:portrait|disc)(?:--[a-z]+)?(?:\s[^"]*)?"[^>]*>/g;
  for (const { out, html } of TEAMPAGES) {
    const tiles = html.match(TILE) || [];
    for (const tile of tiles) {
      assert.match(tile, /data-placeholder="headshot"/,
        `${out} has an unmarked monogram tile: ${tile.slice(0, 80)}`);
    }
    assert.ok(tiles.length >= TEAM_STAFF.length,
      `${out} shows ${tiles.length} tiles — every variation gives all ${TEAM_STAFF.length} staff a portrait`);
    assert.ok(html.includes('Placeholder portraits'),
      `${out} shows placeholder tiles but no longer says so`);
  }
});

const BIO_COPY = [
  'Grant Callen',
  'Founder & CEO',
  'Grant is a sixth generation Mississippian who grew up in Laurel. He founded Empower Mississippi in 2014 as a solution center, tackling Mississippi’s biggest challenges so everyone can rise. Previously, Grant served as Director of Development for the Mississippi Center for Public Policy. He is an alumnus of The Witherspoon Fellowship in Washington D.C.',
  'Grant graduated with a B.A. in Political Science from Belhaven University and was selected as their “Young Alumnus of the Year” in 2009. Grant earned an M.A in Government from Regent University. Grant has been named to the Top 50 Most Influential Mississippians list by Y’all Politics. Grant currently lives in Madison with his wife Page and their five children. Grant and Page are members of Redeemer Church, PCA, where Grant serves as an elder.',
];

test('the staff detail screen carries the whole bio, both paragraphs', () => {
  /* The roster pages carry the first paragraph; this page is the only place the
     second one appears, and it is the half a reader gets nowhere else. */
  const text = textOf(readFileSync('dist/team-bio.html', 'utf8'));
  for (const line of BIO_COPY) {
    assert.ok(text.includes(line), `dist/team-bio.html is missing "${line.slice(0, 60)}…"`);
  }
});

test('the staff detail screen’s contact block is marked as a placeholder', () => {
  /* Empower have not supplied Grant's own address or handles, so the block
     carries the ORGANISATION accounts. That is a reasonable stand-in and an
     unreasonable thing to ship unnoticed: it is marked in the markup and says
     so in words, exactly like the portrait tiles. */
  const html = readFileSync('dist/team-bio.html', 'utf8');
  assert.match(html, /data-placeholder="contact"/,
    'dist/team-bio.html has an unmarked contact block');
  assert.ok(html.includes('Placeholder: Empower’s organisation inbox and accounts'),
    'dist/team-bio.html no longer says its contact details are stand-ins');
  /* Empower, 2026-08-05: Grant keeps all three rows; every other staff bio gets
     the email row only. This page is Grant's, so all three are asserted — and
     the day one of them disappears from here, it should be because the client
     asked, not because a layout ate it. */
  for (const label of ['info@empowerms.org', 'LinkedIn', 'X']) {
    assert.ok(html.includes(`>\n              ${label}\n`) || html.includes(label),
      `dist/team-bio.html is missing the ${label} contact row`);
  }
});

test('the staff detail screen leads back to the roster', () => {
  /* A page reached from ten different cards needs the way out to be on it, not
     in the browser's back button. */
  const html = readFileSync('dist/team-bio.html', 'utf8');
  const backs = html.match(/href="team-a\.html"/g) || [];
  assert.ok(backs.length >= 2,
    `dist/team-bio.html has ${backs.length} links back to the roster, expected one at the top and one at the foot`);
});

/* ==========================================================================
   The Solutions landing page.

   Quoted from the roadmap's Solutions tab. All three variations carry every
   line; what differs is composition. The three "Explore" labels are asserted
   because they are the page's real actions and the easiest thing to reword by
   accident when a layout gets tight.
   ========================================================================== */

const SOLUTIONS_COPY = [
  /* Section 1, the hero, in full. */
  'Practical Solutions for a Stronger Mississippi',
  'Opportunity is shaped by the things that affect everyday life: the education you receive, the work you can pursue, and the safety of the community you call home.',
  'That’s why Empower Mississippi focuses on three areas where practical solutions can make a meaningful difference. Through research, community engagement, and policy solutions, we work to turn ideas into lasting change for people across our state.',

  /* Section 2, the heading and all three areas: name, promise, description. */
  'Solutions That Expand Opportunity',
  'Quality Education',
  'Every child deserves the opportunity to learn, grow, and reach their full potential.',
  'We work to expand educational opportunity, empower parents, and ensure more Mississippi students have access to an education that meets their needs and prepares them for what comes next.',
  'Explore Quality Education',
  'Meaningful Work',
  'Every Mississippian should have the opportunity to build a meaningful career and create a better future.',
  'We work to connect more people with meaningful work, strengthen Mississippi’s workforce, and advance solutions that help individuals and families build greater stability and opportunity.',
  'Explore Meaningful Work',
  'Public Safety',
  'Opportunity grows when people feel safe in the places they live, work, and raise their families.',
  'We work to advance practical public safety solutions that promote accountability, improve outcomes, and help build safer, stronger communities across Mississippi.',
  'Explore Safe Communities',

  /* Section 3. */
  'Research That Drives Solutions',
  'Effective solutions start with understanding the problem.',
  'Our research examines the challenges facing Mississippi, identifies opportunities for improvement, and provides practical recommendations grounded in data and real-world experience.',
  'Explore Research',

  /* Section 4. The headline here is "Behind every policy is a person." — NOT
     the homepage's "Behind every solution is a real person." Two tabs of the
     same document, two sentences, and the wrong one would be a rewrite. */
  'Behind every policy is a person.',
  'Across Mississippi, students, parents, workers, employers, and community members are experiencing what becomes possible when people have greater opportunity to shape their own futures.',
  'Read Community Stories',
];

const SOLUTIONPAGES = ABOUTPAGES.filter(p => p.out.includes('solutions-'));

test('all three Solutions variations build', () => {
  assert.equal(SOLUTIONPAGES.length, 3,
    `expected three Solutions variations, found ${SOLUTIONPAGES.length}`);
});

test('every Solutions variation carries the roadmap copy verbatim', () => {
  for (const { out, html } of SOLUTIONPAGES) {
    const text = textOf(html);
    for (const line of SOLUTIONS_COPY) {
      assert.ok(text.includes(line), `${out} is missing roadmap copy: "${line.slice(0, 60)}…"`);
    }
  }
});

test('every Solutions variation links all three solution pages and the research page', () => {
  /* The three /solutions/<name> destinations do not exist yet — the same open
     link as the report PDFs on What We Do — but a landing page whose reason to
     exist is routing has to actually route. */
  for (const { out, html } of SOLUTIONPAGES) {
    for (const slug of ['education', 'work', 'safety']) {
      assert.ok(html.includes(`href="/solutions/${slug}"`),
        `${out} does not link /solutions/${slug}`);
    }
    assert.ok(html.includes('href="/latest"'), `${out} does not link the research destination`);
  }
});

test('the Solutions variations do not repeat each other’s composition', () => {
  /* Three readings of one page are only worth showing if they are three. Each
     variation's signature class is the shape its solutions section takes: a
     stack of three equal panels, a vertical track of stations, a lattice of
     columns under one beam. If two pages ever share one, they have converged. */
  const SIGNATURE = {
    'dist/solutions-a.html': 'sa-stack',
    'dist/solutions-b.html': 'sb-stations',
    'dist/solutions-c.html': 'sc-lattice__beam',
  };
  for (const { out, html } of SOLUTIONPAGES) {
    assert.ok(html.includes(SIGNATURE[out]), `${out} has lost its ${SIGNATURE[out]} composition`);
    for (const [other, cls] of Object.entries(SIGNATURE)) {
      if (other === out) continue;
      assert.ok(!html.includes(cls), `${out} is using ${other}'s ${cls} composition`);
    }
  }
});

/* ===========================================================================
   The solution detail pages.

   Two of the three destinations the Solutions landing page routes to, two
   readings each: Meaningful Work and Public Safety. Quality Education is not
   built. Copy is the roadmap's own tabs for those two pages — its "Standard
   Solution Page Flow", all seven sections, in the order the document states
   them.

   Two deliberate transformations of that copy, both here rather than left to be
   noticed:

     1. The roadmap sets the work-area labels in caps (WORKFORCE PARTICIPATION).
        The pages carry them in sentence case and uppercase them in CSS, the same
        call the homepage made for QUALITY EDUCATION. So the strings below are
        the sentence-case form, and text-transform supplies what the document
        shows.
     2. The roadmap's own section titles — "The Vision", "The Problem - Why This
        Work Matters", "What We're Working Toward" as a section name — are its
        internal organisation, which Empower confirmed about the Who We Are side
        labels on 2026-08-03. They are not printed on any of the four pages, and
        the existing internal-labels sweep asserts that.

   What is NOT asserted as copy: the three placeholder feed blocks in sections 6
   and 7. The roadmap ends both with a bracketed instruction to auto-populate, so
   those blocks carry no headlines at all — see the feed test below.
   ======================================================================== */

const WORK_COPY = [
  /* Section 1. The roadmap gives this hero one line and nothing else. */
  'Work Should Open Doors to Opportunity',

  /* Section 2, the vision. */
  'What Does Meaningful Work Look Like?',
  'Every Mississippian should have the opportunity to earn success, provide for their family, and find purpose through meaningful work.',
  'That means creating more pathways to good careers and an environment where people and businesses can thrive.',

  /* Section 3, the problem. "We can do better." is its own paragraph in the
     document and is set as its own line on all four pages. */
  'Too Many Mississippians Are Disconnected From Work',
  'Mississippi has one of the lowest workforce participation rates in the country, while employers struggle to find the workers they need.',
  'The reasons are complex. Limited pathways to good careers, unnecessary requirements, and policies that make returning to work harder can all keep people on the sidelines.',
  'We can do better.',

  /* Section 4, the four approaches. */
  'Practical Solutions for Mississippi Workers',
  'Understand What Keeps People From Work',
  'Identify why Mississippians are disconnected from work and what can help them return.',
  'Remove Obstacles to Opportunity',
  'Ensure unnecessary requirements and outdated policies don’t stand between people and meaningful work.',
  'Build Pathways to Good Careers',
  'Create more ways for Mississippians to gain skills, enter the workforce, and build successful careers.',
  'Create an Environment for Growth',
  'Make Mississippi a place where businesses can grow, jobs are created, and opportunity expands.',

  /* Section 5, the intro and all five work areas: label, claim, description,
     commitment. Five areas here against Public Safety's four. */
  'More Pathways to Meaningful Work',
  'Too many Mississippians remain disconnected from work for different and often complex reasons.',
  'We’re working to understand those challenges and advance practical solutions that help more people enter the workforce, build careers, and move toward greater opportunity.',

  'Workforce Participation',
  'Too Many Mississippians Remain on the Sidelines',
  'Mississippi has one of the nation’s lowest workforce participation rates, leaving people disconnected from opportunity and employers without the workers they need.',
  'Understanding why people aren’t working and advancing solutions that help more Mississippians enter or return to the workforce.',

  'Skills & Career Pathways',
  'There’s More Than One Path to Success',
  'A four-year degree isn’t the only path to a good career. Skills, experience, training, and alternative credentials can all open doors.',
  'Expanding pathways that connect people with the skills and opportunities they need to build meaningful careers.',

  'Requirements to Work',
  'Opportunity Shouldn’t Be Harder Than Necessary',
  'Unnecessary licensing, degree, and other requirements can make it harder for qualified people to enter a profession or put their skills to work.',
  'Ensuring requirements are reasonable and opening more pathways to work.',

  'The Benefits Cliff',
  'Moving Up Should Always Pay',
  'For some families, earning more can mean suddenly losing benefits before they can afford to make up the difference.',
  'Creating a smoother path from public assistance to financial independence so earning more always moves families forward.',

  'Economic Opportunity',
  'Mississippi Should Be a Place Where Opportunity Grows',
  'When businesses and entrepreneurs can grow, they create jobs and more opportunities for Mississippians to succeed.',
  'Creating an environment where businesses can thrive, jobs can grow, and more people can build a better future through work.',

  /* Sections 6 and 7, the two feed headings and their intros. */
  'Voices of Mississippi’s Workforce',
  'Hear from Mississippians navigating careers, building businesses, and pursuing better opportunities—and see what meaningful work can make possible.',
  'The Latest on Meaningful Work',
  'Explore the latest research, ideas, and policies shaping Mississippi’s workforce and creating more opportunities to succeed.',
];

const SAFETY_COPY = [
  /* Section 1. */
  'Every Mississippian Deserves to Feel Safe at Home',

  /* Section 2, the vision. */
  'What Do Safe Communities Look Like?',
  'Every Mississippian should feel safe in the community they call home.',
  'That means preventing crime, supporting effective law enforcement, strengthening families, and ensuring our justice system promotes both safety and fairness.',

  /* Section 3, the problem, closing on its own paragraph. */
  'Safe Communities Are the Foundation for Opportunity',
  'When crime and instability take hold, families suffer, neighborhoods struggle, and opportunity becomes harder to reach.',
  'Creating safer communities requires understanding what drives crime, supporting solutions that work, and ensuring our justice system holds people accountable while creating pathways to a better future.',
  'Mississippi can build safer, stronger communities.',

  /* Section 4, the four approaches. */
  'Practical Solutions for a Safer Mississippi',
  'Understand What Drives Crime',
  'Use research and real-world data to better understand crime and identify solutions that improve public safety.',
  'Support Effective Public Safety',
  'Work alongside law enforcement and community leaders to advance strategies that prevent crime and keep communities safe.',
  'Strengthen Justice and Accountability',
  'Promote a justice system that protects the public, ensures fairness, and holds people accountable.',
  'Create Pathways to a Better Future',
  'Help people successfully reenter their communities, find meaningful work, and build stable lives after serving their sentence.',

  /* Section 5, the intro and all four work areas. */
  'Safety Creates the Foundation for Opportunity',
  'Safe communities don’t happen through one solution alone. They require effective law enforcement, strong families, a fair justice system, and opportunities for people to build stable lives.',
  'We’re advancing research and practical solutions that help make Mississippi communities safer and stronger.',

  'Crime Prevention & Public Safety',
  'Safety Starts With Solutions That Work',
  'Reducing crime requires understanding where and why it happens and focusing resources on strategies that make communities safer.',
  'Using research, data, and partnerships with law enforcement and community leaders to advance effective approaches to crime reduction.',

  'Effective Justice',
  'Safety and Fairness Go Hand in Hand',
  'A strong justice system should protect communities, hold people accountable, and ensure laws are clear, fair, and consistently applied.',
  'Advancing justice policies that strengthen public safety, protect due process, and build confidence in the justice system.',

  'Second Chances & Reentry',
  'A Second Chance Should Lead Somewhere',
  'Most people who enter prison will eventually return home. Successful reentry helps people find work, rebuild their lives, and become contributing members of their communities.',
  'Expanding pathways to employment and successful reentry that reduce repeat crime and help build safer communities.',

  'Strong Families & Communities',
  'Strong Communities Start With Strong Foundations',
  'Stable families and connected communities play an important role in creating environments where people can thrive and neighborhoods can flourish.',
  'Better understanding the connection between family stability, community strength, and public safety—and advancing solutions that help strengthen those foundations.',

  /* Sections 6 and 7. */
  'Voices of Safer Communities',
  'Hear from Mississippians whose experiences with crime, justice, reentry, and community leadership show what it takes to build safer, stronger communities.',
  'The Latest on Public Safety',
  'Explore the latest research, ideas, and policies shaping public safety, effective justice, and stronger communities across Mississippi.',
];

/* Quality Education, from the roadmap's third solution tab. This is the one
   page whose copy has never been through client review, which is the reason it
   most needs the sweep rather than least. Extracted the same way the two lists
   above were: pdftotext -layout, the Quality Education tab, stopping at
   "Current Content". */
const EDUCATION_COPY = [
  /* Section 1. */
  'Every Child Deserves the Opportunity to Succeed',

  /* Section 2, the vision. Note the lowercase "is": the roadmap writes
     "What is Education Freedom?" and the copy rule is verbatim. */
  'What is Education Freedom?',
  'A quality education should open doors to opportunity.',
  'That means empowering parents to make the best decisions for their children, giving educators the freedom to meet students’ needs, and creating more pathways for every child to learn, grow, and succeed.',

  /* Section 3, the problem, closing on its own paragraph. */
  'One Size Doesn’t Fit Every Child',
  'Every child learns differently, but families don’t always have access to the educational opportunities that best meet their child’s needs.',
  'Where a family lives, what they can afford, or the options available in their community can determine the education a child receives.',
  'Parents may find the right school or learning environment for their child, only to discover they can’t access it.',
  'Mississippi can do better.',

  /* Section 4, the four approaches. */
  'Practical Solutions for Mississippi Students',
  'Expand Educational Options',
  'Families should have access to more high-quality options and the freedom to choose the learning environment that works best for their child.',
  'Empower Parents',
  'Parents know their children best. They deserve meaningful choices and a voice in their child’s education.',
  'Support Educators and Innovation',
  'Teachers and school leaders should have the freedom to innovate, meet students’ needs, and focus on helping them succeed.',
  'Prepare Students for Life',
  'Education should prepare students with the knowledge, skills, and confidence to succeed in college, a career, and life.',

  /* Section 5, the intro and all four work areas. */
  'Every Family Deserves Meaningful Choices',
  'Every child is different, and families should have the freedom to choose the educational path that gives their child the best opportunity to succeed.',
  'Mississippi has several education options, but access often depends on where a family lives, what they can afford, or whether their child qualifies for a limited program.',
  'That’s the gap we’re working to close.',

  'Public School Choice',
  'Limited by Where You Live',
  'Most Mississippi students attend a public school based on where they live. Transfers to other districts are restricted, and public charter schools are only available in a small number of communities.',
  'Expanding open enrollment and access to high-quality charter schools so more families can choose the public school that works best for their child.',

  'Private Education & Education Scholarship Accounts',
  'Limited by Cost and Eligibility',
  'Families can choose private education, but cost puts that option out of reach for many. Education Scholarship Accounts (ESAs) can help families pay for educational expenses, but Mississippi’s current program is limited to eligible students with special needs.',
  'Expanding ESAs so more families have the resources and flexibility to choose an education that meets their child’s needs.',

  'Options for Unique Learning Needs',
  'Available to Eligible Students',
  'Mississippi offers programs including the Special Needs ESA, Nate Rogers Scholarship, and Dyslexia Therapy Scholarship to help eligible students access specialized education. However, eligibility and availability remain limited.',
  'Protecting and strengthening these programs while expanding access to educational opportunities that meet students’ individual needs.',

  'Homeschooling & Innovative Education',
  'Available, but Access Varies',
  'Homeschooling gives families flexibility to personalize their child’s education, while growing models like microschools create new ways for students to learn. But these options may not be practical or available for every family.',
  'Supporting educational innovation so more families have access to learning environments that work for their children.',

  /* The closing statement, which only this tab has. */
  'Real Choice for Every Family',
  'Education freedom should mean more than having options on paper.',
  'A family’s choices shouldn’t be determined by their ZIP code, income, or eligibility for a limited program. We’re working to ensure more Mississippi families have meaningful access to an education that works for their child.',
  'We don’t tell families which school to choose. We work to make sure they have a choice.',

  /* Sections 6 and 7. */
  'Voices of Education',
  'Behind every policy are students, parents, and educators with real experiences. Hear from Mississippians about the challenges they’ve faced, the opportunities that made a difference, and what they want for the future of education.',
  'The Latest on Education',
  'Stay up to date on the ideas, policies, and conversations shaping education in Mississippi and the work underway to create more opportunity for every student.',
];

const WORKPAGES = ABOUTPAGES.filter(p => p.out.includes('work-'));
/* dist/safety.html dropped its letter on 2026-08-07, when Empower chose it as
   the shared template for all three solution pages, so it is no longer one of
   the readings under comparison here, the same way dist/work.html and
   dist/education.html never were. 'safety-' catches only the two that are
   still being weighed against each other. */
const SAFETYPAGES = ABOUTPAGES.filter(p => p.out.includes('safety-'));
const DETAILPAGES = [...WORKPAGES, ...SAFETYPAGES];

/* The three pages that actually ship, listed by name rather than caught by a
   substring. They have to be a separate list because they carry no letter, so
   'work-' and 'safety-' miss all three: when dist/safety-b.html was renamed to
   dist/safety.html on 2026-08-07 it silently dropped out of DETAILPAGES and
   took six sweeps with it, including the one that makes an invented feed
   headline impossible to ship. Named explicitly, and the count asserted below,
   so the next rename fails loudly instead of quietly emptying the set. */
const TEMPLATEPAGES = ABOUTPAGES.filter(p =>
  ['dist/education.html', 'dist/work.html', 'dist/safety.html'].includes(p.out));
const templatePage = out => TEMPLATEPAGES.filter(p => p.out === out);
/* Everything with a solution page's copy on it, shipping or still under
   comparison. The sweeps that are about the copy and the feeds run over all of
   them; only the SIGNATURE sweep, which is about the readings being held apart
   from each other, stays on DETAILPAGES. */
const ALLDETAILPAGES = [...DETAILPAGES, ...TEMPLATEPAGES];

/* Meaningful Work lost its A reading (The Open Door) on 2026-08-05, and Public
   Safety B left the readings pool entirely on 2026-08-07 when it became the
   shared template, so the two sets are back to the same size. The counts stay
   asserted rather than derived: a page that stops building should fail here,
   not silently shrink the set the SIGNATURE and copy sweeps run over. */
test('both solution detail pages build in the readings that survived', () => {
  assert.equal(WORKPAGES.length, 2, `expected two Meaningful Work readings, found ${WORKPAGES.length}`);
  assert.equal(SAFETYPAGES.length, 2, `expected two Public Safety readings, found ${SAFETYPAGES.length}`);
  assert.equal(TEMPLATEPAGES.length, 3, `expected three shipping solution pages, found ${TEMPLATEPAGES.length}`);
});

test('every Meaningful Work reading carries the roadmap copy verbatim', () => {
  for (const { out, html } of [...WORKPAGES, ...templatePage('dist/work.html')]) {
    const text = textOf(html);
    for (const line of WORK_COPY) {
      assert.ok(text.includes(line), `${out} is missing roadmap copy: "${line.slice(0, 60)}…"`);
    }
  }
});

test('every Public Safety reading carries the roadmap copy verbatim', () => {
  for (const { out, html } of [...SAFETYPAGES, ...templatePage('dist/safety.html')]) {
    const text = textOf(html);
    for (const line of SAFETY_COPY) {
      assert.ok(text.includes(line), `${out} is missing roadmap copy: "${line.slice(0, 60)}…"`);
    }
  }
});

test('Quality Education carries the roadmap copy verbatim', () => {
  /* One page rather than a set of readings, but the same contract, and the one
     that needs it most: this copy has not been through client review, so the
     roadmap PDF is the only thing it can be checked against. */
  for (const { out, html } of templatePage('dist/education.html')) {
    const text = textOf(html);
    for (const line of EDUCATION_COPY) {
      assert.ok(text.includes(line), `${out} is missing roadmap copy: "${line.slice(0, 60)}…"`);
    }
  }
});

test('no solution page carries another solution page’s copy', () => {
  /* Three pages, one document, seven identically named sections. The failure
     mode is a paragraph copied across while a page was being built and never
     changed, which would read as approved copy on a page it was never written
     for. src/work/ and src/education/ were both created by copying
     src/safety/sections/*.html, so this is the sweep that covers the way they
     were made. Checked on the two sentences that are unmistakably one tab's:
     the hero, and the closing feed heading. */
  const EXCLUSIVE = {
    work: ['Work Should Open Doors to Opportunity', 'The Latest on Meaningful Work'],
    safety: ['Every Mississippian Deserves to Feel Safe at Home', 'The Latest on Public Safety'],
    education: ['Every Child Deserves the Opportunity to Succeed', 'The Latest on Education'],
  };
  const tabOf = out =>
    out.includes('education') ? 'education' : out.includes('safety') ? 'safety' : 'work';

  for (const { out, html } of ALLDETAILPAGES) {
    const text = textOf(html);
    for (const [tab, lines] of Object.entries(EXCLUSIVE)) {
      if (tab === tabOf(out)) continue;
      for (const line of lines) {
        assert.ok(!text.includes(line), `${out} carries ${tab} copy: "${line}"`);
      }
    }
  }
});

test('the four remaining solution detail readings do not repeat each other’s composition', () => {
  /* Paolo chose independently composed pages on 2026-08-05 rather than one
     template filled repeatedly, and reaffirmed it when the C pair was added, so
     the readings still on the table have to stay distinct, not just the
     readings of a given page. Each signature is the shape that page's own
     load-bearing sections take: the four approaches, and the work areas. If
     any two pages share one, the choice they were built to offer is gone.

     Public Safety B is not in this map. Empower chose it on 2026-08-07 and
     made it the shared template for all three solution pages, so its
     composition is deliberately the one the other two now repeat: the
     opposite of what this test checks for. The 'all three solution pages are
     the same template' test further down covers it instead.

     The C pair is the case that needs stating: work-c and safety-c deliberately
     REUSE work-b's mosaic, story columns and article stubs (Paolo picked those
     three sections out), so their signatures are their upper halves — the navy
     quarters and the four rows — and their own namespaced copies of the mosaic.
     That reuse is asserted separately below, so it stays a decision rather than
     drifting into three pages that are accidentally the same page. */
  const SIGNATURE = {
    'dist/work-b.html': ['wrb-track__list', 'wrb-plate--lead'],
    'dist/work-c.html': ['wkc-quarters__grid', 'wkc-rail'],
    'dist/safety-a.html': ['psa-bricks__grid', 'psa-post__label'],
    'dist/safety-c.html': ['sfc-rows__list', 'sfc-rail'],
  };
  assert.equal(Object.keys(SIGNATURE).length, DETAILPAGES.length,
    'a solution detail page was added without a signature composition to hold it apart');
  for (const { out, html } of DETAILPAGES) {
    for (const cls of SIGNATURE[out]) {
      assert.ok(html.includes(cls), `${out} has lost its ${cls} composition`);
    }
    for (const [other, classes] of Object.entries(SIGNATURE)) {
      if (other === out) continue;
      for (const cls of classes) {
        assert.ok(!html.includes(cls), `${out} is using ${other}'s ${cls} composition`);
      }
    }
  }
});

test('the C readings carry the three sections they were built to reuse', () => {
  /* work-c and safety-c exist because Paolo picked three sections out of work-b:
     the work-area mosaic with a double-width navy lead plate and orange chip
     labels, the community-story columns under dashed rules, and the 2x2 of dashed
     article stubs. That is the brief, so it is a contract — a redesign that
     quietly drops one of the three has stopped being the page that was asked for.

     Checked structurally, per namespace, because the whole point is that each page
     owns its own copy of these rules (one stylesheet per variation, so converting
     the winner to Elementor never drags in a rejected design's CSS). */
  const REUSED = {
    'dist/work-c.html': 'wkc',
    'dist/safety-c.html': 'sfc',
  };
  for (const [out, ns] of Object.entries(REUSED)) {
    const html = readFileSync(out, 'utf8');
    const css = readFileSync(`css/${out.replace('dist/', '').replace('.html', '')}.css`, 'utf8');

    assert.ok(html.includes(`${ns}-plate-area--lead`), `${out} has no double-width lead plate`);
    assert.match(css, new RegExp(`\\.${ns}-plate-area--lead\\{[^}]*grid-column:1 / -1`),
      `${out}'s lead plate is no longer double-width`);
    assert.match(css, new RegExp(`\\.${ns}-plate-area--lead\\{[^}]*background:var\\(--surface-navy\\)`),
      `${out}'s lead plate is no longer navy`);

    const chips = (html.match(new RegExp(`class="${ns}-chip"`, 'g')) || []).length;
    assert.ok(chips >= 4, `${out} has ${chips} chip labels, expected one per work area`);
    assert.match(css, new RegExp(`\\.${ns}-chip\\{[^}]*background:var\\(--orange-700\\)`),
      `${out}'s chips are no longer the orange pill (or lost the 5.55:1 fill)`);

    assert.match(css, new RegExp(`\\.${ns}-feed__col\\{[^}]*border-top:2px solid`),
      `${out}'s story columns have lost their 2px rule`);
    assert.match(css, new RegExp(`\\.${ns}-stubs\\{[^}]*grid-template-columns:repeat\\(2,`),
      `${out}'s article stubs are no longer a 2x2`);
  }
});

/* ===========================================================================
   The Empower Podcast.

   Two readings of the roadmap's Podcast tab. Three sections, all three carried
   whole. Two things about this page set are unlike anything else in the build
   and both are asserted below:

     1. The roadmap gives the hero TWO buttons. The brand rule is one orange
        filled action per view and the sweep above enforces the count, so both
        labels ship and only Watch on YouTube takes the fill. A page that drops
        "Listen Now" to satisfy the button rule has lost approved copy, which is
        the more serious of the two failures.
     2. The episode library FILTERS, which the roadmap asks for in a note
        addressed to Paolo. It runs on :has() with no script.
   ======================================================================== */

const PODCAST_COPY = [
  /* Section 1, the hero: the three-sentence headline, the paragraph, both
     buttons. */
  'Mississippi’s Biggest Challenges. Biggest Opportunities. Real Conversations.',
  'Join Grant Callen for thoughtful conversations with lawmakers, policy experts, and community leaders about the ideas and solutions that can help every Mississippian rise.',
  'Watch on YouTube',
  'Listen Now',

  /* Section 2, about the show. The full stop in the heading is the roadmap's. */
  'Go Beyond the Headlines.',
  'Hosted by Empower Mississippi Founder and CEO Grant Callen, The Empower Podcast brings together lawmakers, policy experts, and community leaders to explore Mississippi’s biggest challenges and brightest opportunities.',
  'Through thoughtful, long-form conversations, we look beyond divisive politics to the people impacted by public policy and the ideas that can help create a Mississippi where everyone can rise.',
  'Watch on YouTube or listen wherever you get your podcasts.',

  /* Section 3, the episode library. */
  'Explore More Episodes',
  'Discover more conversations about the people, ideas, and solutions shaping Mississippi’s future.',
];

const PODCASTPAGES = ABOUTPAGES.filter(p => p.out.includes('podcast-'));

test('both Podcast readings build', () => {
  assert.equal(PODCASTPAGES.length, 2, `expected two Podcast readings, found ${PODCASTPAGES.length}`);
});

test('every Podcast reading carries the roadmap copy verbatim', () => {
  for (const { out, html } of PODCASTPAGES) {
    const text = textOf(html);
    for (const line of PODCAST_COPY) {
      assert.ok(text.includes(line), `${out} is missing roadmap copy: "${line.slice(0, 60)}…"`);
    }
  }
});

test('the Podcast hero keeps both roadmap buttons and fills only one', () => {
  /* The failure this guards against is quiet: the one-orange-action sweep passes
     just as happily on a page that deleted "Listen Now" as on one that demoted it
     to an outline. Only the second is correct. */
  for (const { out, html } of PODCASTPAGES) {
    const watch = html.match(/em-btn[^"]*"[^>]*>\s*Watch on YouTube/);
    assert.ok(watch, `${out} has no Watch on YouTube button`);
    assert.match(watch[0], /em-btn--primary/,
      `${out}: the roadmap's first button is not the page's orange action`);

    const listen = html.match(/<a class="em-btn([^"]*)"[^>]*>\s*Listen Now/);
    assert.ok(listen, `${out} has dropped the Listen Now button — that is approved copy`);
    assert.ok(!listen[1].includes('em-btn--primary'),
      `${out}: Listen Now is a second orange action`);
    assert.match(listen[1], /outline/, `${out}: Listen Now should be an outline button`);
  }
});

test('the episode library filters without a script, and every control is real', () => {
  for (const { out, html } of PODCASTPAGES) {
    const slug = out.replace('dist/', '').replace('.html', '');
    const css = readFileSync(`css/${slug}.css`, 'utf8');

    /* Same rule the review index has held to since it was built. */
    assert.equal((html.match(/<script/g) || []).length, 3,
      `${out} has grown a script beyond the three shared modules`);
    assert.match(html, /<form class="[a-z]+-(facets|chips)"/,
      `${out}'s filter is not a form, so Clear cannot be a native reset`);
    assert.match(html, /<button class="[a-z-]+__clear" type="reset">/,
      `${out}'s Clear is not a native form reset`);
    assert.match(css, /@supports not selector\(body:has\(a\)\)/,
      `${slug}.css does not hide the filter where :has() is missing`);

    /* Every facet is an input with a label bound by id: a label that has drifted
       off its input is a filter a keyboard cannot reach.
       podcast-a lost its Topic facet on 2026-08-07, so it has three controls
       (Guest only) where every other reading still has six. */
    const ids = [...html.matchAll(/<input class="[^"]*(?:check|chip)__input[^"]*" type="checkbox" id="([^"]+)"/g)]
      .map(m => m[1]);
    const expected = out === 'dist/podcast-a.html' ? 3 : 6;
    assert.equal(ids.length, expected, `${out} has ${ids.length} facet controls, expected ${expected}`);
    for (const id of ids) {
      assert.ok(html.includes(`for="${id}"`), `${out}: the ${id} facet has no label bound to it`);
    }
  }
});

test('the episode library cannot filter itself empty, and every episode is real', () => {
  /* Nine cards, one per topic-and-guest pair. That is what makes an empty result
     impossible for ANY combination of ticks — with a gap in the matrix, some
     combination shows the reviewer a dead end the real library would not have.
     Asserted as the actual set of pairs, not as a count of nine. */
  const TOPICS = ['education', 'work', 'safety'];
  const GUESTS = ['lawmaker', 'expert', 'leader'];

  for (const { out, html } of PODCASTPAGES) {
    const cards = [...html.matchAll(/data-topic="([a-z]+)" data-guest="([a-z]+)"/g)]
      .map(m => `${m[1]}/${m[2]}`);
    assert.equal(cards.length, 9, `${out} has ${cards.length} episodes, expected nine`);
    for (const t of TOPICS) {
      for (const g of GUESTS) {
        assert.ok(cards.includes(`${t}/${g}`),
          `${out} has no ${t}/${g} episode — that combination of filters would return nothing`);
      }
    }

    /* No stub bars and no invented episodes: every card carries a title that
       links to the published episode on empowerms.org, so a headline nobody at
       Empower wrote cannot reach the page. */
    assert.doesNotMatch(html, /data-placeholder="episode"/,
      `${out} still marks episodes as placeholders`);
    const titles = [...html.matchAll(/class="[a-z]{3}-ep__title" href="(https:\/\/empowerms\.org\/[^"]+)">([^<]+)</g)];
    assert.equal(titles.length, 9, `${out} has ${titles.length} linked episode titles, expected nine`);
    for (const [, href, title] of titles) {
      assert.ok(title.trim().length > 8, `${out} has an episode title too short to be real: "${title}"`);
      assert.match(href, /^https:\/\/empowerms\.org\/[a-z0-9-]+\/$/,
        `${out}: ${title} does not link to a published episode`);
    }
  }
});

test('the podcast library filters by guest only', () => {
  /* Empower removed Filter by Topic on 2026-08-07. Guest stays, and more guest
     categories are coming, so the facet has to remain a list of values rather
     than three hard-coded rules. */
  const html = readFileSync('dist/podcast-a.html', 'utf8');
  const css = readFileSync('css/podcast-a.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

  assert.doesNotMatch(html, /pca-topic/, 'dist/podcast-a.html still has the topic facet');
  assert.doesNotMatch(css, /pca-topic/, 'css/podcast-a.css still has topic hide rules');
  assert.ok(!/<legend>Topic<\/legend>/.test(html), 'dist/podcast-a.html still shows a Topic legend');

  /* Guest survives intact, and every guest value still hides only its own. */
  for (const g of ['lawmaker', 'expert', 'leader']) {
    assert.ok(css.includes(
      `body:has(.pca-guest:checked):not(:has(#pa-g-${g}:checked)) .pca-ep[data-guest="${g}"]`),
      `css/podcast-a.css has no hide rule for the ${g} guest facet`);
  }

  /* No combination of ticks may empty the grid. */
  const guests = [...html.matchAll(/data-guest="([a-z]+)"/g)].map(m => m[1]);
  for (const g of ['lawmaker', 'expert', 'leader']) {
    assert.ok(guests.filter(x => x === g).length >= 1,
      `dist/podcast-a.html has no ${g} episode, so that filter returns nothing`);
  }
});

test('the library filter composes AND across groups, not OR', () => {
  /* The bug this exists to catch is silent and specific: the hide-everything-
     then-reveal shape used on the review index works for one facet group and
     turns into an OR the moment a second group can reveal what the first hid.
     These pages use hide-only rules per value instead, which intersect by
     construction. Checked by reading the rules rather than the rendering: every
     facet value must contribute a rule of the form "group in use AND this value
     unticked -> hide", and no rule may reveal a card. */
  const VALUES = {
    /* podcast-a lost its Topic facet on 2026-08-07; Guest is now its only group. */
    'podcast-a': { ns: 'pca', prefix: 'pa', topics: [],
                   guests: ['lawmaker', 'expert', 'leader'] },
    'podcast-b': { ns: 'pcb', prefix: 'pb', topics: ['education', 'work', 'safety'],
                   guests: ['lawmaker', 'expert', 'leader'] },
  };
  for (const [slug, { ns, prefix, topics, guests }] of Object.entries(VALUES)) {
    const css = readFileSync(`css/${slug}.css`, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const t of topics) {
      assert.ok(css.includes(
        `body:has(.${ns}-topic:checked):not(:has(#${prefix}-t-${t}:checked)) .${ns}-ep[data-topic="${t}"]`),
        `css/${slug}.css has no hide rule for the ${t} topic`);
    }
    for (const g of guests) {
      assert.ok(css.includes(
        `body:has(.${ns}-guest:checked):not(:has(#${prefix}-g-${g}:checked)) .${ns}-ep[data-guest="${g}"]`),
        `css/${slug}.css has no hide rule for the ${g} guest`);
    }
    /* A reveal rule on an episode is the shape that breaks the intersection. */
    for (const block of css.split('}')) {
      const [selector, body] = block.split('{');
      if (!body || !selector.includes(`-ep[data-`)) continue;
      assert.ok(!/display:\s*(flex|grid|block)/.test(body),
        `css/${slug}.css reveals ${selector.trim().slice(0, 60)} — a reveal rule turns the ` +
        `two facet groups from AND into OR`);
    }
  }
});

/* ===========================================================================
   Capitol Chat.

   The sibling show in the same dropdown, two readings. The roadmap's copy for it
   differs from The Empower Podcast's in three ways that are design decisions here
   rather than details, and all three are asserted:

     1. ONE button. Capitol Chat is audio ("listen and subscribe wherever you get
        your podcasts", "audio players"); the podcast page leads on YouTube. So
        neither reading may carry a watch-on-YouTube action.
     2. NO INTRO PARAGRAPH under the library heading. The podcast tab gives its
        library one; this tab does not, so none is invented.
     3. WIL ERVIN IS NOT A LINK. His bio page does not exist, and Empower's note
        on 2026-08-05 was about exactly this: a visitor clicking his name and
        landing on somebody else's bio.
   ======================================================================== */

const CAPITOL_COPY = [
  /* Section 1, the hero, and its single button. */
  'What’s Happening Under the Dome?',
  'Get quick, straightforward updates on the legislation, debates, and decisions shaping Mississippi during the legislative session.',
  'Listen Now',

  /* Section 2, about the show. */
  'The Capitol Moves Fast. We Help You Keep Up.',
  'Capitol Chat is Empower Mississippi’s weekly insider update on what’s happening at the Mississippi State Capitol during the legislative session.',
  'Each week, we break down the biggest developments and highlight the action under the dome, all in under five minutes.',
  'Get the context you need to understand what’s happening, why it matters, and what to watch next.',
  'Listen and subscribe wherever you get your podcasts.',

  /* Section 3. The roadmap gives this one a heading and nothing else. */
  'Catch Up From the Capitol',
];

const CAPITOLPAGES = ABOUTPAGES.filter(p => p.out.includes('capitol-'));

test('both Capitol Chat readings build', () => {
  assert.equal(CAPITOLPAGES.length, 2, `expected two Capitol Chat readings, found ${CAPITOLPAGES.length}`);
});

test('every Capitol Chat reading carries the roadmap copy verbatim', () => {
  for (const { out, html } of CAPITOLPAGES) {
    const text = textOf(html);
    for (const line of CAPITOL_COPY) {
      assert.ok(text.includes(line), `${out} is missing roadmap copy: "${line.slice(0, 60)}…"`);
    }
  }
});

test('Capitol Chat is an audio page with one action', () => {
  /* The roadmap gives this page one button. A watch action here would be a
     feature nobody asked for on a show that does not have video, and it would put
     a second primary action on the page. */
  for (const { out, html } of CAPITOLPAGES) {
    assert.ok(!/Watch on YouTube/.test(textOf(html)),
      `${out} has a Watch on YouTube action — Capitol Chat is an audio show and the roadmap gives it one button`);
    const listen = html.match(/<a class="em-btn([^"]*)"[^>]*>\s*Listen Now/);
    assert.ok(listen, `${out} has no Listen Now button`);
    assert.match(listen[1], /em-btn--primary/,
      `${out}: Listen Now is the page's only action, so it takes the orange fill`);
  }
});

test('no Capitol Chat reading names Wil Ervin anywhere', () => {
  /* This test used to say the opposite half of the time: his name had to be on
     the page and had to NOT be a link, because his bio page did not exist and a
     visitor clicking it would have landed on somebody else's. Empower closed
     that question by deletion on 2026-08-21 — he leaves at the end of the month
     and Kienna Horn rewrote the sentence to be general — so the assertion flips
     from "present but unlinked" to "absent". Kept rather than deleted because
     the failure it guards against has not gone away: the copy lives in four
     places (two static readings, the Elementor module, and this file's own
     CAPITOL_COPY), and reinstating a departed member of staff by restoring one
     of them is exactly the mistake nobody would notice. */
  for (const { out, html } of CAPITOLPAGES) {
    assert.ok(!/Wil Ervin/.test(html),
      `${out} still names Wil Ervin — Empower removed him from the page on 2026-08-21`);
    assert.ok(!html.includes('href="team-bio.html"'),
      `${out} links the CEO's bio from a page hosted by somebody else`);
  }
});

test('the Capitol Chat library filters by session and every row is a real episode', () => {
  const SHAPE = {
    'capitol-a': { ns: 'cca', prefix: 'ca', groups: false, hasTopic: false },
    'capitol-b': { ns: 'ccb', prefix: 'cb', groups: true, hasTopic: true },
  };
  const TOPICS = ['education', 'work', 'safety'];
  const SESSIONS = ['2026', '2025'];

  for (const [slug, { ns, prefix, groups, hasTopic }] of Object.entries(SHAPE)) {
    const html = readFileSync(`dist/${slug}.html`, 'utf8');
    const css = readFileSync(`css/${slug}.css`, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

    if (hasTopic) {
      /* Six rows, one per topic-and-session pair, so no combination of ticks can
         empty the list. */
      const rows = [...html.matchAll(/data-topic="([a-z]+)" data-session="(\d+)"/g)]
        .map(m => `${m[1]}/${m[2]}`);
      assert.equal(rows.length, 6, `${slug} has ${rows.length} episode rows, expected six`);
      for (const t of TOPICS) {
        for (const se of SESSIONS) {
          assert.ok(rows.includes(`${t}/${se}`),
            `${slug} has no ${t}/${se} row — that combination of filters would return nothing`);
        }
      }

      /* Topic hides rows here; capitol-a lost this facet on 2026-08-07 and is
         asserted separately below. */
      for (const t of TOPICS) {
        assert.ok(css.includes(
          `body:has(.${ns}-topic:checked):not(:has(#${prefix}-t-${t}:checked)) .${ns}-ep[data-topic="${t}"]`),
          `css/${slug}.css has no hide rule for the ${t} topic`);
      }
    } else {
      /* capitol-a dropped Filter by Topic on 2026-08-07: six rows, three per
         session, so session alone can never empty the list. */
      const rows = [...html.matchAll(/data-session="(\d+)"/g)].map(m => m[1]);
      assert.equal(rows.length, 6, `${slug} has ${rows.length} episode rows, expected six`);
      for (const se of SESSIONS) {
        const n = rows.filter(x => x === se).length;
        assert.equal(n, 3, `${slug} has ${n} rows for the ${se} session, expected three`);
      }
    }

    /* Session hides ROWS on the flat list and whole GROUPS on the grouped one —
       a hidden group whose heading stayed behind would be a lie about what is in
       the list. */
    const target = groups ? `.${ns}-group[data-session=` : `.${ns}-ep[data-session=`;
    for (const se of SESSIONS) {
      assert.ok(css.includes(
        `body:has(.${ns}-session:checked):not(:has(#${prefix}-s-${se}:checked)) ${target}"${se}"]`),
        `css/${slug}.css has no session hide rule targeting ${target}"${se}"]`);
    }

    /* Titles and dates are the published ones. Nothing on this page is a stub,
       and no headline or date is invented: every row links to the episode it
       names on empowerms.org. */
    assert.doesNotMatch(html, /data-placeholder="(episode|date)"/,
      `${slug} still marks episode rows or date columns as stubs`);
    const titled = [...html.matchAll(
      new RegExp(`class="${ns}-ep__title" href="(https://empowerms\\.org/[^"]+)">([^<]+)<`, 'g'))];
    assert.equal(titled.length, 6, `${slug} has ${titled.length} linked episode titles, expected six`);
    for (const [, href] of titled) {
      assert.match(href, /^https:\/\/empowerms\.org\/[a-z0-9-]+\/$/,
        `${slug} has an episode row that does not link to a published episode`);
    }
    const dates = (html.match(
      /class="[a-z]{3}-ep__date">(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, 20\d\d</g) || []).length;
    assert.equal(dates, 6, `${slug} shows ${dates} episode dates, expected six`);

    /* No script, native reset, gated on :has(). */
    assert.equal((html.match(/<script/g) || []).length, 3,
      `${slug} has grown a script beyond the three shared modules`);
    assert.match(html, new RegExp(`<form class="${ns}-filter"`), `${slug}'s filter is not a form`);
    assert.match(html, new RegExp(`<button class="${ns}-filter__clear" type="reset">`),
      `${slug}'s Clear is not a native form reset`);
    assert.match(css, /@supports not selector\(body:has\(a\)\)/,
      `css/${slug}.css does not hide the filter where :has() is missing`);
  }
});

test('Capitol Chat filters by session only, and shows no invented topic', () => {
  /* The topic labels on these rows were ours: Capitol Chat has no topic
     taxonomy on the live site. With the filter gone they would be unsourced
     decoration on a client's page, so they go too. */
  const html = readFileSync('dist/capitol-a.html', 'utf8');
  const css = readFileSync('css/capitol-a.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

  assert.doesNotMatch(html, /cca-topic/, 'dist/capitol-a.html still has the topic facet');
  assert.doesNotMatch(css, /cca-topic/, 'css/capitol-a.css still has topic hide rules');
  assert.doesNotMatch(html, /cca-ep__tag/, 'dist/capitol-a.html still shows a topic chip');
  /* Scoped to the library section: "Quality Education" etc. are legitimate
     elsewhere on the page as Our Solutions nav links, which are not the
     invented row label this check is guarding against. */
  const library = html.slice(html.indexOf('<section class="cca-library"'), html.indexOf('</section>', html.indexOf('<section class="cca-library"')));
  for (const t of ['Quality Education', 'Meaningful Work', 'Public Safety']) {
    assert.ok(!library.includes(`>${t}<`),
      `dist/capitol-a.html still labels a row "${t}", which Empower never tagged`);
  }

  for (const s of ['2026', '2025']) {
    assert.ok(css.includes(
      `body:has(.cca-session:checked):not(:has(#ca-s-${s}:checked)) .cca-ep[data-session="${s}"]`),
      `css/capitol-a.css has no hide rule for the ${s} session`);
    const rows = (html.match(new RegExp(`data-session="${s}"`, 'g')) || []).length;
    assert.ok(rows >= 1, `dist/capitol-a.html has no ${s} row, so that filter returns nothing`);
  }
});

test('neither Capitol Chat reading invents an intro under the library heading', () => {
  /* The roadmap gives the podcast library an intro paragraph and gives this one
     only a heading. What must not appear between the heading and the filter is a
     sentence dressed as approved copy. */
  for (const { out, html } of CAPITOLPAGES) {
    /* Comments stripped FIRST. Both partials quote the heading in their opening
       comment to explain why there is no intro under it, so a plain indexOf finds
       the explanation rather than the heading and the assertion reads the comment
       prose as page copy. Strip, then search. */
    const markup = html.replace(/<!--[\s\S]*?-->/g, '');
    const at = markup.indexOf('Catch Up From the Capitol');
    assert.ok(at > -1, `${out} has no library heading`);
    const after = textOf(markup.slice(at, at + 400));
    /* capitol-a's first (and, since 2026-08-07, only) legend is Session; the
       other reading still leads with Topic. Either is the filter, not an
       intro. */
    assert.match(after, /Catch Up From the Capitol\s*(Topic|Session)/,
      `${out} has something between the library heading and the filter — ` +
      `the roadmap gives this section no intro paragraph`);
  }
});

/* ---------- EPIC (Research) landing page ---------- */

const EPIC_COPY = [
  /* Section 1, the hero, its button and its secondary link. The headline is
     three sentences set on three lines, so it is asserted against the page's
     normalised text rather than against its markup. */
  'Better Data. Better Ideas. Better Solutions.',
  'The Empower Policy & Innovation Center (EPIC) is the research arm of Empower Mississippi. EPIC identifies Mississippi’s biggest challenges and produces the research to develop innovative public policy solutions.',
  'Dive Into the Research',
  'Why Empower Mississippi created EPIC',

  /* Section 2, What We Do. */
  'We work with real people to understand real problems and craft real solutions.',
  'Mississippi’s biggest challenges require solutions built around our state’s people, data, and realities.',
  'EPIC combines rigorous, credible, Mississippi-specific research with the experiences of the people most affected by public policy. We examine what is happening, why it is happening, and what could work better.',
  'We turn those insights into practical, Mississippi-made policy solutions that help leaders make better decisions and create more opportunity across our state.',

  /* Section 3, How We Work. The roadmap sets the three step names in capitals;
     every page in this build renders roadmap capitals as title case, the same
     way the solution pages render PUBLIC SCHOOL CHOICE. */
  'How EPIC Turns Research Into Solutions',
  'Listen & Define',
  'Hear from Mississippians and use available data to clearly define the problem.',
  'Research',
  /* The roadmap leaves this one without a full stop. The pages add it, so the
     assertion stops one character short rather than asserting a typo. */
  'Produce credible, state-specific research that explains what is happening, why it matters, and what the evidence shows',
  'Design Solutions',
  'Turn those findings into practical policy solutions designed for Mississippi’s needs and realities.',

  /* Section 4, Explore Our Research, and the second button. */
  'Research Designed to Lead Somewhere',
  'Explore reports, data, policy briefs, and practical recommendations on the issues shaping opportunity in Mississippi.',
  'Quality Education',
  'Meaningful Work',
  'Public Safety',
  'View Research & Reports',
];

const EPICPAGES = ABOUTPAGES.filter(p => p.out.includes('epic-'));

test('all three EPIC readings build', () => {
  assert.equal(EPICPAGES.length, 3, `expected three EPIC readings, found ${EPICPAGES.length}`);
});

test('every EPIC reading carries the roadmap copy verbatim', () => {
  for (const { out, html } of EPICPAGES) {
    const text = textOf(html);
    for (const line of EPIC_COPY) {
      assert.ok(text.includes(line), `${out} is missing roadmap copy: "${line.slice(0, 60)}…"`);
    }
  }
});

test('the EPIC hero keeps both roadmap buttons and fills only the first', () => {
  /* The roadmap gives this page two buttons and the brand rule gives it one
     orange action. Demoting the wrong one, or deleting the second outright,
     both pass the one-orange-action sweep; only one of the three is correct. */
  for (const { out, html } of EPICPAGES) {
    const dive = html.match(/<a class="em-btn([^"]*)"[^>]*>\s*Dive Into the Research/);
    assert.ok(dive, `${out} has no Dive Into the Research button`);
    assert.match(dive[1], /em-btn--primary/,
      `${out}: the roadmap's first button is not the page's orange action`);

    const view = html.match(/<a class="em-btn([^"]*)"[^>]*>\s*View Research &amp; Reports/);
    assert.ok(view, `${out} has lost the roadmap's second button`);
    assert.ok(!/em-btn--primary/.test(view[1]),
      `${out}: View Research & Reports is a second orange fill`);
  }
});

test('every EPIC reading names the three focus areas above its research index', () => {
  /* Keri's comms note on this tab asks for the focus areas "more often and
     higher up on the page to make the Center's focus clear". Each reading puts
     them in the hero as real links to the three groups in the last section. */
  for (const { out, html } of EPICPAGES) {
    for (const id of ['area-education', 'area-work', 'area-safety']) {
      assert.ok(html.includes(`id="${id}"`), `${out} has no #${id} target`);
      assert.ok(html.includes(`href="#${id}"`), `${out} never links to #${id}`);
    }
    const hero = html.slice(0, html.indexOf('id="research"'));
    for (const area of ['Quality Education', 'Meaningful Work', 'Public Safety']) {
      assert.ok(hero.includes(area),
        `${out} does not name ${area} before the research section`);
    }
  }
});

test('no EPIC reading invents a statistic to decorate itself', () => {
  /* A research page is the one page where a made-up number would be read as a
     finding. The drawn plot on epic-b has no axis, no scale and no value on it,
     and nothing in this set may grow one. The check is deliberately blunt: no
     percentage, and no bare number set as display type. */
  for (const { out, html } of EPICPAGES) {
    const text = textOf(html.slice(html.indexOf('<main'), html.indexOf('</main>')));
    assert.ok(!/\d+(\.\d+)?\s?%/.test(text), `${out} states a percentage`);
    assert.ok(!/em-stat__value/.test(html), `${out} uses the big-number stat component`);
  }
});

test('every EPIC report link is a real empowerms.org post', () => {
  /* The index on all three readings is real content, not lorem headlines. The
     three posts below were pulled from the WordPress REST API on 2026-08-07 —
     one per focus area, each the most recent report carrying that category. */
  const REPORTS = [
    'https://empowerms.org/charter-schools-outperform-districts-on-3rd-grade-reading-test-initial-results/',
    'https://empowerms.org/new-empower-mississippi-report-highlights-growth-in-labor-force-participation-rate-outlines-recommendations-for-continued-improvement/',
    'https://empowerms.org/empower-releases-report-on-violent-crime-in-mississippi/',
  ];
  for (const { out, html } of EPICPAGES) {
    for (const href of REPORTS) {
      assert.ok(html.includes(href), `${out} is missing the real report at ${href}`);
    }
  }
});

test('EPIC motion is progressive: no page depends on scroll-driven animation', () => {
  /* Every scroll-driven rule in this set sits inside BOTH @supports and
     prefers-reduced-motion:no-preference, and the composition underneath it is
     static. The failure this guards against is the one the motion layer has
     already caused three times in this build: a start state that hides content
     and a trigger that never fires. */
  for (const slug of ['epic-a', 'epic-b', 'epic-c']) {
    /* The @supports condition itself contains the property name, so strip the
       guards before looking for declarations or the guard reads as the thing it
       is guarding. */
    const css = readFileSync(`css/${slug}.css`, 'utf8');
    const guards = [...css.matchAll(/@supports \(animation-timeline[^)]*\)\)?/g)];
    assert.ok(guards.length > 0, `${slug}.css has no @supports guard for scroll-driven motion`);

    const declarations = css.replace(/@supports \(animation-timeline[^)]*\)\)?/g, '@supports (X)');
    const uses = [...declarations.matchAll(/animation-timeline:/g)];
    assert.ok(uses.length > 0, `${slug}.css no longer uses a scroll-driven animation`);

    /* Every animation-timeline declaration must sit after an @supports guard. */
    for (const m of uses) {
      const opened = (declarations.slice(0, m.index).match(/@supports \(X\)/g) || []).length;
      assert.ok(opened > 0,
        `${slug}.css declares animation-timeline outside an @supports guard`);
    }
    assert.match(css, /@media \(prefers-reduced-motion: no-preference\)/,
      `${slug}.css does not gate its motion on prefers-reduced-motion`);
  }
});

test('The Pinned Method carries the method section Empower chose', () => {
  /* Empower picked reading A on 2026-08-11 and asked for one change: the
     "How EPIC Turns Research Into Solutions" section swapped for reading C's.
     That swap is a decision, not a detail, so it is held here. Otherwise a
     later tidy-up that restores the sideways track quietly reverses a client
     instruction and nothing fails.

     The rows are A's OWN copy of the composition, in A's namespace: one
     stylesheet per reading, so converting the winner to Elementor never drags
     in a rejected design's CSS. */
  const html = readFileSync('dist/epic-a.html', 'utf8');
  const css = readFileSync('css/epic-a.css', 'utf8');

  assert.ok(html.includes('epa-method__rows'), 'epic-a has lost the ruled method rows');
  assert.ok(html.includes('epa-method__rail'), 'epic-a has lost the rail the rows are marked against');
  assert.ok(!html.includes('epa-method__track'), 'epic-a is back on the sideways track');
  assert.ok(!css.includes('epa-method__stage'), 'epic-a.css still carries the pinned stage');

  /* The rail is local to this section. In reading C the same marks ran against a
     line down the whole page, which only worked because every section there was
     navy; A is navy in one section, so a page-length line would run through
     white. */
  assert.ok(!html.includes('epc-spine'), 'epic-a is using The Instrument\u2019s page spine');

  /* And the logo Empower asked for, on its plate rather than recoloured. */
  assert.match(html, /<img src="\.\.\/assets\/epic-logo\.png"[^>]*alt=""/,
    'the EPIC lockup is missing from the hero, or is no longer decorative');
  assert.ok(html.includes('epa-hero__mark'), 'the EPIC lockup has lost its plate');
});

test('the EPIC readings add no JavaScript of their own', () => {
  /* The motion on these three pages is the most visible in the build, and it is
     entirely CSS. That matters for the Elementor conversion: custom CSS travels,
     a bespoke scroll library does not. The check is the whole script set — three
     shared chrome files, nothing else, and no inline script. */
  const SHARED = ['../js/nav.js', '../js/reveal.js', '../js/dropdown.js'];
  for (const { out, html } of EPICPAGES) {
    const srcs = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map(m => m[1]);
    assert.deepEqual(srcs, SHARED,
      `${out} links ${srcs.join(', ')} — the EPIC readings ship the shared chrome and nothing else`);
    assert.ok(!/<script(?![^>]*\ssrc=)[^>]*>[\s\S]*?<\/script>/.test(html),
      `${out} has an inline script`);
  }
});

test('every EPIC reading carries photography, and no text sits on a photograph', () => {
  /* Zero imagery on a page about the people most affected by public policy is a
     defect, not restraint.

     These photographs ARE stand-ins — the supplied library was shot for the
     solution pages — but that is recorded on the chooser, in the README and in
     the hand-off notes, not on the page. Paolo took the on-page notices off on
     2026-08-07: the page is what Empower show people, and production caveats do
     not belong in front of their audience. */
  for (const { out, html } of EPICPAGES) {
    const imgs = [...html.matchAll(/<img[^>]*>/g)]
      .map(m => m[0])
      .filter(tag => tag.includes('assets/photography/'));
    assert.ok(imgs.length >= 2,
      `${out} carries ${imgs.length} photographs — imagery is how this page connects`);
    for (const tag of imgs) {
      assert.match(tag, /\salt="[^"]{20,}"/, `${out} has a photograph with thin or missing alt text`);
      assert.match(tag, /\swidth="\d+"[^>]*\sheight="\d+"/, `${out} has a photograph with no intrinsic size`);
      assert.match(tag, /\sloading="lazy"/, `${out} has a photograph that is not lazily loaded`);
    }
    assert.ok(!/stands in here|Stand-in photography|Empower owe/.test(textOf(html)),
      `${out} has a production caveat about its photography in front of the reader`);
  }
});

/* ---------- The two Join Us destinations ---------- */

const MAIL_COPY = [
  /* Section 1, the hero, and the roadmap's one button. */
  'Stay Connected',
  'Get the latest from Empower Mississippi delivered straight to your inbox.',
  'From monthly updates to important news from the Capitol, we’ll help you stay informed in five minutes or less.',
  'Join Our Email List',

  /* Section 2, About. */
  'Stay Informed, Not Overwhelmed',
  'Keeping up with what’s happening shouldn’t feel like another full-time job.',
  'Our emails bring you the highlights—clear, concise, and easy to read in just a few minutes.',
  'No clutter. No inbox overload. Just practical updates when they matter most.',

  /* Section 3, What You'll Receive, and its four items. */
  'What You’ll Receive',
  'Monthly news and updates',
  'Legislative highlights during the session',
  'New articles, research, and podcasts',
  'Opportunities to get involved',
];

const AMB_COPY = [
  /* Section 1, the hero, and the roadmap's one button. */
  'Be Part of the Solution',
  'You’ve seen the challenges. You’ve seen the potential. Now you can be part of the solution.',
  'Whether you’ve experienced these issues firsthand or simply care about Mississippi’s future, your voice matters. Join a community of Mississippians working together to advance practical solutions that expand opportunity through better education, meaningful work, and safer communities.',
  'Join Our Ambassador Network',

  /* Section 2, Who Are Our Ambassadors? */
  'Who Are Our Ambassadors?',
  'Our Ambassadors are parents, educators, business owners, community leaders, and citizens from every corner of Mississippi.',
  'Many have been directly impacted by the issues we work on. Others have seen the challenges facing their communities and want to be part of the solution.',
  'They share one thing in common: a desire to help create more opportunity for Mississippi.',

  /* Section 3, What Do Ambassadors Do?, and the four ways. */
  'What Do Ambassadors Do?',
  'Every Ambassador gets involved in different ways. You might:',
  'Share your story and advocate for practical solutions.',
  'Attend Capitol Days, listening tours, and community events.',
  'Connect others with Empower’s research and resources.',
  'Help grow a network of citizens committed to Mississippi’s future.',

  /* Section 4, Join Our Ambassador Network. */
  'Every great movement begins with people who are willing to take the first step.',
  'Join a growing network of Mississippians committed to creating more opportunity across our state. Whether you share your story, attend an event, or connect others with our work, your voice can make a difference.',
  'Getting started is easy. Complete the short interest form below, and Ashley Green, our Director of Outreach, will reach out to answer your questions and help you get connected.',
];

const MAILPAGES = ABOUTPAGES.filter(p => p.out.includes('mail-'));
const AMBPAGES = ABOUTPAGES.filter(p => p.out.includes('amb-'));
const JOINPAGES = [...MAILPAGES, ...AMBPAGES];

test('both Join Us destinations build in two readings each', () => {
  assert.equal(MAILPAGES.length, 2, `expected two Email Sign Up readings, found ${MAILPAGES.length}`);
  assert.equal(AMBPAGES.length, 2, `expected two Ambassador readings, found ${AMBPAGES.length}`);
});

test('every Email Sign Up reading carries the roadmap copy verbatim', () => {
  for (const { out, html } of MAILPAGES) {
    const text = textOf(html);
    for (const line of MAIL_COPY) {
      assert.ok(text.includes(line), `${out} is missing roadmap copy: "${line.slice(0, 60)}…"`);
    }
  }
});

test('every Ambassador reading carries the roadmap copy verbatim', () => {
  for (const { out, html } of AMBPAGES) {
    const text = textOf(html);
    for (const line of AMB_COPY) {
      assert.ok(text.includes(line), `${out} is missing roadmap copy: "${line.slice(0, 60)}…"`);
    }
  }
});

test('both Join Us tabs are built around a real form, not a picture of one', () => {
  /* These two tabs are the only ones in the roadmap that end on an instruction
     rather than a paragraph: "Insert signup form on webpage" and "Include
     interest form for joining the ambassador program". A page that draws a
     field and a button without a <form> around them satisfies a screenshot and
     nothing else. */
  for (const { out, html } of JOINPAGES) {
    assert.match(html, /<form[^>]*method="post"/, `${out} has no posting form`);

    /* Every control is labelled. A placeholder is not a label and neither is a
       heading that happens to sit above the field. */
    const ids = [...html.matchAll(/<(?:input|textarea)[^>]*\sid="([^"]+)"/g)].map(m => m[1]);
    assert.ok(ids.length >= 4, `${out} has ${ids.length} form controls, expected at least four`);
    for (const id of ids) {
      assert.ok(html.includes(`for="${id}"`), `${out}: the ${id} control has no label bound to it`);
    }

    /* The email field is a real email input, required, and autocompletes. */
    const email = html.match(/<input[^>]*type="email"[^>]*>/);
    assert.ok(email, `${out} has no email input`);
    assert.match(email[0], /\srequired/, `${out}: the email field is not required`);
    assert.match(email[0], /autocomplete="email"/, `${out}: the email field has no autocomplete token`);

    /* And the submit is the page's one orange action. */
    const submit = html.match(/<button[^>]*type="submit"[^>]*>/);
    assert.ok(submit, `${out} has no submit button`);
    assert.match(submit[0], /em-btn--primary/,
      `${out}: the form's submit is not the page's orange action`);
  }
});

test('neither Ambassador reading links Ashley Green’s name', () => {
  /* The rule Capitol Chat used to carry, and the last page still carrying it:
     only the CEO's bio page exists, so a linked name here would open somebody
     else's. And the name must still be present — not-a-link must not quietly
     become not-there. Capitol Chat's copy of this test flipped to plain absence
     on 2026-08-21 when Empower took its host's name out of the page; that is a
     change to who is on the page, not a change to this rule. */
  for (const { out, html } of AMBPAGES) {
    const anchors = [...html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)].map(m => m[1]);
    for (const inner of anchors) {
      assert.ok(!/Ashley Green/.test(inner),
        `${out} links Ashley Green’s name — her bio page does not exist`);
    }
    assert.ok(!html.includes('href="team-bio.html"'),
      `${out} links the CEO’s bio from a page hosted by somebody else`);
    assert.ok(textOf(html).includes('Ashley Green, our Director of Outreach'),
      `${out} has lost the name the roadmap gives this section`);
  }
});

test('the Join Us readings add no JavaScript of their own', () => {
  /* Four pages built around forms and not one line of script: native
     validation, native autocomplete, no framework. That is what converts. */
  const SHARED = ['../js/nav.js', '../js/reveal.js', '../js/dropdown.js'];
  for (const { out, html } of JOINPAGES) {
    const srcs = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map(m => m[1]);
    assert.deepEqual(srcs, SHARED, `${out} links ${srcs.join(', ')}`);
    assert.ok(!/<script(?![^>]*\ssrc=)[^>]*>[\s\S]*?<\/script>/.test(html), `${out} has an inline script`);
    assert.ok(!/\son(click|submit|change|input)=/.test(html), `${out} has an inline event handler`);
  }
});

test('every Join Us reading carries photography with honest alt text', () => {
  for (const { out, html } of JOINPAGES) {
    const imgs = [...html.matchAll(/<img[^>]*>/g)]
      .map(m => m[0])
      .filter(tag => tag.includes('assets/photography/'));
    assert.ok(imgs.length >= 1, `${out} carries no photography`);
    for (const tag of imgs) {
      assert.match(tag, /\salt="[^"]{20,}"/, `${out} has a photograph with thin or missing alt text`);
      assert.match(tag, /\swidth="\d+"[^>]*\sheight="\d+"/, `${out} has a photograph with no intrinsic size`);
    }
  }
});

/* ---------- Donate ---------- */

const GIVE_COPY = [
  /* Section 1, Why care?, and the roadmap's first button. */
  'Help Build a Mississippi Where Opportunity Is Within Reach',
  'You want Mississippi to be a place where children can succeed, families can thrive, and opportunity is within reach.',
  'So do we.',
  'That’s why we’re working every day to advance practical solutions that expand educational opportunity, strengthen our workforce, and build safer communities.',
  'When you give, you become part of creating a path to generational prosperity for Mississippi’s children, workers, and families.',
  'Donate Today',

  /* Section 2, Why Your Gift Matters. */
  'You’re Investing in Mississippi’s Future',
  'A stronger Mississippi isn’t built overnight. It’s built one opportunity, one family, and one generation at a time.',
  'Your generosity helps create the conditions that allow people to flourish: a quality education, meaningful work, strong families, and safe communities.',
  'Together, we’re helping ensure the next generation has even greater opportunities than the one before it.',

  /* Section 3, Donate Today!, including the line that has to survive verbatim
     because it is a legal statement, not marketing copy. */
  'Help Write Mississippi’s Next Chapter',
  'Mississippi’s story is changing, and you can help shape what comes next.',
  'Together, we’re creating a future where more children can succeed, more families can thrive, and more communities can prosper.',
  'Empower Mississippi Foundation is a 501(c)(3) nonprofit organization. Contributions are tax-deductible to the fullest extent allowed by law.',
];

const GIVEPAGES = ABOUTPAGES.filter(p => p.out.includes('give-'));

test('all four Donate readings build', () => {
  assert.equal(GIVEPAGES.length, 4, `expected four Donate readings, found ${GIVEPAGES.length}`);
});

test('every Donate reading carries the roadmap copy verbatim', () => {
  for (const { out, html } of GIVEPAGES) {
    const text = textOf(html);
    for (const line of GIVE_COPY) {
      assert.ok(text.includes(line), `${out} is missing roadmap copy: "${line.slice(0, 60)}…"`);
    }
  }
});

test('no Donate reading collects payment details', () => {
  /* The one place in this build where a design decision is also a safety
     decision. Card numbers, expiry dates, security codes and bank details
     belong to the donation processor and must never be typed into a page we
     hand over as static HTML — a field here would be collecting real card data
     on a page with no endpoint behind it. The amount choices are links. */
  const FORBIDDEN = /\b(card[\s_-]?number|cardnumber|cc[\s_-]?num|cvv|cvc|security[\s_-]?code|expiry|exp[\s_-]?date|sort[\s_-]?code|account[\s_-]?number|iban|routing)\b/i;
  for (const { out, html } of GIVEPAGES) {
    assert.ok(!/<input[^>]*type="(?:password|tel)"[^>]*>/.test(html),
      `${out} has a password or tel input on a donation page`);
    assert.ok(!FORBIDDEN.test(html), `${out} names a payment field`);
    assert.ok(!/autocomplete="cc-/.test(html), `${out} has a credit-card autocomplete token`);

    /* And no form at all: this page hands off, it does not post. */
    assert.ok(!/<form/.test(html.slice(html.indexOf('<main'), html.indexOf('</main>'))),
      `${out} has a form in its main content — the processor owns the transaction`);

    /* Every amount is a link, and every one of them stays on Empower's own
       donate route.

       Two shapes are legitimate. A, B and The Card hand off to /donate/give, a
       placeholder route standing in for wherever the processor lives. One Screen
       does not hand off at all: the live donate page runs Gravity Forms with the
       Stripe Payment Element embedded in it, so its tiles link to /donate/
       itself with the choice in the query string and the form is further down
       the same page. What both shapes share, and what this asserts, is that no
       amount link ever leaves for a third-party payment domain.

       Three of the four readings draw their own ladder. The Card does not, and
       that is the reading rather than an omission: it copies Empower's form,
       where the suggested amounts appear only once a gift type is chosen. So the
       floor is asserted for the readings that offer a ladder, and The Card is
       asserted to offer none at all. */
    const amounts = [...html.matchAll(/<a class="gv[a-z]-amount[^"]*" href="([^"]+)"/g)].map(m => m[1]);
    if (out === 'dist/give-d.html') {
      assert.equal(amounts.length, 0,
        `${out} draws its own amount ladder, and it is a copy of Empower's form, which reveals amounts after the gift type`);
    } else {
      assert.ok(amounts.length >= 5, `${out} offers ${amounts.length} amounts, expected at least five`);
    }
    for (const href of amounts) {
      assert.match(href, /^\/donate\//, `${out} sends an amount to ${href}`);
    }
  }
});

test('every hand-off link on a Donate page stays on Empower\u2019s donate route', () => {
  /* The amount tiles are swept above; this covers everything else that offers to
     take a donor somewhere: frequency choices, and the Donate Today buttons. A
     link here that pointed at a third-party payment domain, or at a route that
     does not exist, would be a giving journey with a hole in the middle of it. */
  for (const { out, html } of GIVEPAGES) {
    const body = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
    const hrefs = [...body.matchAll(/href="(\/donate[^"]*)"/g)].map(m => m[1]);
    /* The Card hands off once, from the button under the form; the others also
       hand off from every tile. */
    const floor = out === 'dist/give-d.html' ? 1 : 5;
    assert.ok(hrefs.length >= floor, `${out} has ${hrefs.length} hand-off links`);
    for (const href of hrefs) {
      assert.match(href, /^\/donate\//, `${out} sends a donor to ${href}`);
    }
  }
});

test('One Screen is the choice, and the choice carries into Empower\u2019s form', () => {
  /* The reason this reading exists, and the thing a later edit could quietly
     undo. Empower asked for fewer clicks with the giving form higher up, and the
     live donate page turned out to be Gravity Forms with the Stripe Payment
     Element embedded in it. So the answer is not a hand-off and not a second
     copy of the form: it is the two decisions that cost the clicks, made once,
     on the first screen, and carried into the form by the URL.

     The form itself is deliberately NOT on this page. The Card is the reading
     that reproduces it field for field; drawing it here as well made the page
     about the form rather than about the choice. */
  const html = readFileSync('dist/give-c.html', 'utf8');
  const body = html.slice(html.indexOf('<main'), html.indexOf('</main>'));

  const choice = body.indexOf('class="gvc-give" id="give"');
  const under = body.indexOf('gvc-hero__under');
  const matters = body.indexOf('gvc-matters');
  assert.ok(choice > -1, 'give-c has lost the choice panel');
  assert.ok(choice < under, 'the choice no longer comes before the copy it was put above');
  assert.ok(choice < matters, 'the choice now sits below Why Your Gift Matters');

  /* No second rendering of the form, in any shape: neither the field-for-field
     drawing nor a slot standing in for it. */
  assert.ok(!body.includes('gvc-drawn') && !body.includes('gvc-slot'),
    'give-c is showing the form again — that is The Card\u2019s reading');
  assert.ok(!/<input|<select|<textarea|<button|<label/.test(body),
    'give-c has grown a real form control');

  /* Every tile carries the choice in the query string. A bare /donate/ link
     would leave the donor to state the same thing twice, which is the click this
     reading exists to remove. */
  const tiles = [...body.matchAll(/<a class="gvc-(?:amount|freq__opt)[^"]*" href="([^"]+)"/g)].map(m => m[1]);
  assert.equal(tiles.length, 9, `give-c offers ${tiles.length} choices, expected three frequencies and six amounts`);
  for (const href of tiles) {
    assert.match(href, /^\/donate\/\?gift_type=/, `${href} carries no gift type`);
  }
  /* &amp; in the source, because these hrefs are read out of the built HTML. The
     five figures carry an amount as well as a type; Other deliberately does not,
     because the donor is going to type it. */
  const withAmount = tiles.filter(h => /(?:\?|&amp;|&)amount=\d+/.test(h));
  assert.equal(withAmount.length, 5, `${withAmount.length} tiles carry an amount, expected five`);

  /* And the panel has to say what the choice does, because the form is not on
     the page to show it. */
  assert.match(body, /gvc-give__hand[^>]*>[^<]*donation form/,
    'the panel no longer says where the choice goes');
});

test('no Donate reading invents a number', () => {
  /* A donation page is where a fabricated total, donor count or progress bar
     would be most tempting and most damaging. The only figures allowed on
     these two are the amounts a visitor might give and the roadmap's own
     501(c)(3) line. */
  for (const { out, html } of GIVEPAGES) {
    const body = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
    const text = textOf(body);
    assert.ok(!/\d+(\.\d+)?\s?%/.test(text), `${out} states a percentage`);
    assert.ok(!/em-stat__value/.test(body), `${out} uses the big-number stat component`);
    /* Money on the page is only ever a suggested gift: $25 through $500. */
    const money = [...text.matchAll(/\$[\d,]+/g)].map(m => m[0]);
    for (const figure of money) {
      assert.ok(['$25', '$50', '$100', '$250', '$500'].includes(figure),
        `${out} shows the figure ${figure}, which is not one of the suggested amounts`);
    }
  }
});

test('The Card is a drawing of Empower\u2019s form, not a form', () => {
  /* The whole point of this reading is that it copies their donation form field
     for field. The line it must not cross is turning that copy into a working
     one: this build is handed over as static HTML with no endpoint, so a real
     name, email and address form here would collect real personal data into
     nothing. Every field is a styled div with its label as text.

     The generic Donate sweep already bans a <form> and a payment field on all
     four. This adds the rest of the controls, and checks the two things that
     make the facsimile honest rather than a trap: a note saying what the card
     is, and the drawing itself hidden from screen readers so nobody is walked
     through a form they cannot fill in. */
  const html = readFileSync('dist/give-d.html', 'utf8');
  const body = html.slice(html.indexOf('<main'), html.indexOf('</main>'));

  assert.ok(!/<input|<select|<textarea|<button|<label/.test(body),
    'give-d has grown a real form control');
  assert.match(body, /<div class="gvd-form" aria-hidden="true">/,
    'the form facsimile is no longer hidden from screen readers');
  assert.ok(body.includes('gvd-card__note'), 'the card no longer says what it is');

  /* Their form's own card row is a notice until the payment condition is met, so
     copying it exactly means copying the notice rather than drawing a card
     field. */
  assert.ok(body.includes('The credit card field will initiate once the payment condition is met.'),
    'the credit card notice from Empower\u2019s form is missing');

  /* Every field group on their form, in their order. A copy that quietly drops
     the address or the gift type is no longer the thing that was asked for. */
  for (const name of ['Name', 'Email', 'Cell', 'Address', 'Select Gift Type', 'Credit Card', 'Total']) {
    assert.ok(body.includes(`>${name}<`) || body.includes(`>${name}<span`),
      `give-d has lost the ${name} group from Empower\u2019s form`);
  }
  for (const sub of ['First', 'Last', 'Street Address', 'Address Line 2', 'City',
                     'State / Province / Region', 'Zip / Postal Code', 'Country']) {
    assert.ok(body.includes(sub), `give-d has lost the ${sub} field from Empower\u2019s form`);
  }
  for (const choice of ['One Time Gift', 'Monthly Gift', 'Annual Gift']) {
    assert.ok(body.includes(choice), `give-d has lost the ${choice} option`);
  }

  /* The banner is the one Paolo asked for, and the card overlaps into the body
     rather than sitting under the banner: a negative top margin, not a guessed
     absolute height. */
  const css = readFileSync('css/give-d.css', 'utf8');
  assert.match(css, /\.gvd-banner\{[^}]*pattern-blue\.png/,
    'the banner has lost the EM pattern');
  assert.match(css, /\.gvd-card\{[^}]*margin-top:clamp\(-/,
    'the card no longer overlaps the banner');
});

test('the Donate readings keep both roadmap buttons and fill only the first', () => {
  for (const { out, html } of GIVEPAGES) {
    const buttons = [...html.matchAll(/<a class="em-btn([^"]*)"[^>]*>\s*Donate Today/g)].map(m => m[1]);
    assert.equal(buttons.length, 2, `${out} has ${buttons.length} Donate Today buttons, the roadmap gives two`);
    assert.match(buttons[0], /em-btn--primary/, `${out}: the hero button is not the orange action`);
    assert.ok(!/em-btn--primary/.test(buttons[1]), `${out}: the closing button is a second orange fill`);
  }
});

test('the Donate readings add no JavaScript of their own', () => {
  const SHARED = ['../js/nav.js', '../js/reveal.js', '../js/dropdown.js'];
  for (const { out, html } of GIVEPAGES) {
    const srcs = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map(m => m[1]);
    assert.deepEqual(srcs, SHARED, `${out} links ${srcs.join(', ')}`);
    assert.ok(!/<script(?![^>]*\ssrc=)[^>]*>[\s\S]*?<\/script>/.test(html), `${out} has an inline script`);
  }
});

test('every Donate reading carries photography with honest alt text', () => {
  for (const { out, html } of GIVEPAGES) {
    const imgs = [...html.matchAll(/<img[^>]*>/g)]
      .map(m => m[0])
      .filter(tag => tag.includes('assets/photography/'));
    assert.ok(imgs.length >= 2, `${out} carries ${imgs.length} photographs`);
    for (const tag of imgs) {
      assert.match(tag, /\salt="[^"]{20,}"/, `${out} has a photograph with thin or missing alt text`);
      assert.match(tag, /\swidth="\d+"[^>]*\sheight="\d+"/, `${out} has a photograph with no intrinsic size`);
    }
  }
});

test('the C readings put a working rail on the work areas', () => {
  /* The one thing the A and B readings lack: five work areas (four on safety) is
     more than anyone will scroll to survey, so the C pair carries a real anchor
     rail. Real anchors, so it works with no JavaScript — and every href has to
     resolve to an id that exists, or the rail is four dead links in a review. */
  for (const out of ['dist/work-c.html', 'dist/safety-c.html']) {
    const html = readFileSync(out, 'utf8');
    const nav = html.match(/<nav class="[a-z]+-rail"[\s\S]*?<\/nav>/);
    assert.ok(nav, `${out} has no rail`);
    assert.match(nav[0], /aria-label="/, `${out}'s rail has no accessible name`);

    const targets = [...nav[0].matchAll(/href="#([^"]+)"/g)].map(m => m[1]);
    assert.ok(targets.length >= 4, `${out}'s rail has ${targets.length} links, expected one per area`);
    for (const id of targets) {
      assert.ok(html.includes(`id="${id}"`), `${out}'s rail links #${id}, which is not on the page`);
    }

    /* A rail that jumps behind the sticky header lands the reader on a heading
       they cannot see. scroll-margin-top on the target is the fix. */
    const slug = out.replace('dist/', '').replace('.html', '');
    const css = readFileSync(`css/${slug}.css`, 'utf8');
    assert.match(css, /scroll-margin-top:/,
      `${slug}.css sets no scroll-margin-top, so the sticky header will cover every rail destination`);
  }
});

test('every auto-populated block shows published posts, not invented headlines', () => {
  /* Sections 6 and 7 of both roadmap tabs end in a bracketed instruction to
     auto-populate. These blocks become live WordPress queries; until then they
     carry real posts from empowerms.org so the client reviews the shape with
     content in it. Nothing here may be written by us: every headline in both
     blocks has to link to the post it names, which is what makes a plausible
     but invented article title impossible to ship. */
  for (const { out, html } of ALLDETAILPAGES) {
    assert.doesNotMatch(html, /data-placeholder="feed"/,
      `${out} still carries grey-bar feed placeholders`);
    assert.doesNotMatch(html, /live feed in WordPress/,
      `${out} still shows a developer note about the feed`);

    const titled = [...html.matchAll(
      /class="[a-z]{3}-(?:feed|row|stub)__title" href="(https:\/\/empowerms\.org\/[^"]+)">([^<]+)</g)];
    assert.ok(titled.length >= 6,
      `${out} has ${titled.length} linked headlines across its two blocks — expected at least six`);
    for (const [, href, title] of titled) {
      assert.match(href, /^https:\/\/empowerms\.org\/[a-z0-9-]+\/$/,
        `${out}: "${title}" does not link to a published post`);
    }

    /* Both blocks keep their kind labels, so a reader still knows which of the
       three post types each row is. */
    for (const kind of ['Community story', 'Article', 'Research']) {
      assert.ok(html.includes(`>${kind}<`), `${out} has lost its "${kind}" labels`);
    }

    /* Every headline carries a date. A feed row without one reads as undated
       evergreen copy rather than as the most recent post. */
    const dates = (html.match(
      /__date">(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, 20\d\d</g) || []).length;
    assert.equal(dates, titled.length,
      `${out} shows ${dates} dates for ${titled.length} headlines`);
  }
});

test('every solution detail reading routes back to the landing page and the feeds', () => {
  for (const { out, html } of ALLDETAILPAGES) {
    assert.ok(html.includes('href="/solutions"'),
      `${out} does not link back to the Solutions landing page`);
    assert.ok(html.includes('href="/latest"'),
      `${out} does not link the destination its two feeds resolve to`);
  }
});

test('the solutions section is capped columns, not numbered rows', () => {
  /* Empower asked on 2026-08-07 for the numbered section to be drawn with the
     capped-column layout from Public Safety A. The numerals go entirely: a
     digit kept in the cap reads as not having made the change. The cap carries
     the solution title, because Practical Solutions has no eyebrow label and
     no "What We're Working Toward" line, so the four-part column from section
     5 collapses to two parts here. */
  for (const out of ['dist/safety.html']) {
    const html = readFileSync(out, 'utf8');
    const markup = html.replace(/<!--[\s\S]*?-->/g, '');

    assert.match(markup, /<section class="sol-caps"/, `${out} has no capped-column solutions section`);
    assert.doesNotMatch(markup, /sol-steps|sol-step__disc/,
      `${out} still carries the numbered-row solutions block`);

    const caps = [...markup.matchAll(/<p class="sol-cap__title">([^<]+)<\/p>/g)].map(m => m[1]);
    assert.equal(caps.length, 4, `${out} has ${caps.length} solution caps, expected four`);
    for (const c of caps) {
      assert.doesNotMatch(c, /^\s*\d/, `${out} has a numeral in a cap: "${c}"`);
    }

    /* Every cap needs a body, or a column is a heading over nothing. */
    const bodies = (markup.match(/<div class="sol-cap__body">/g) || []).length;
    assert.equal(bodies, 4, `${out} has ${bodies} cap bodies for ${caps.length} caps`);
  }

  /* The caps must share a row so their bottoms line up. A column each would
     let the four rag against one another, which is the fault the layout
     exists to avoid. */
  const css = readFileSync('css/solution.css', 'utf8');
  assert.match(css, /\.sol-caps__grid\{[^}]*grid-template-columns:repeat\(4,/,
    'css/solution.css does not lay the caps out as four columns');
  assert.match(css, /\.sol-cap\{[^}]*display:flex[^}]*flex-direction:column/,
    'css/solution.css does not stretch the cap bodies to a common height');
});

test('all three solution pages are the same template', () => {
  /* The point of the 2026-08-07 decision: one set of blocks, three sets of
     copy. Asserted as shared structure, which is the opposite of the
     SIGNATURE check the six independent readings used to carry. */
  const PAGES = ['dist/education.html', 'dist/work.html', 'dist/safety.html'];
  const BLOCKS = ['sol-hero', 'sol-vision', 'sol-problem', 'sol-caps',
                  'sol-grid', 'sol-stories', 'sol-latest'];

  for (const out of PAGES) {
    const html = readFileSync(out, 'utf8');
    for (const b of BLOCKS) {
      assert.match(html, new RegExp(`class="${b}[ "]`), `${out} is missing the ${b} block`);
    }
    assert.match(html, /href="\.\.\/css\/solution\.css"/,
      `${out} does not link the shared solution stylesheet`);
    /* No page may carry a rejected reading's namespace. */
    assert.doesNotMatch(html, /class="(psa|psb|wra|wrb|wkc|sfc)-/,
      `${out} still carries a namespace from a reading Empower did not choose`);
  }
});

test('each solution page carries the right number of work areas', () => {
  /* The one axis the template flexes on. Safety and Education have four work
     areas, Meaningful Work has five, and Education alone closes the section
     with a statement. Counted so a copy-paste between pages cannot silently
     give a page the wrong set. */
  const EXPECTED = {
    'dist/education.html': 4,
    'dist/work.html': 5,
    'dist/safety.html': 4,
  };
  for (const [out, n] of Object.entries(EXPECTED)) {
    const html = readFileSync(out, 'utf8');
    const areas = (html.match(/<li class="sol-lit"/g) || []).length;
    assert.equal(areas, n, `${out} has ${areas} work areas, expected ${n}`);
    const toward = (html.match(/What We’re Working Toward:/g) || []).length;
    assert.equal(toward, n, `${out} has ${toward} commitment lines for ${areas} work areas`);
  }
});

test('every solution page closes on three article stubs', () => {
  /* Section 7 is not an axis the template flexes on. .sol-stubs is a three
     column grid with one breakpoint, at 780px, so a fourth stub sits alone
     across a third of the width at every width above that. Work and Education
     shipped four (carried over from work-b, where they were a 2x2) until
     2026-08-07. Counted so the grid and the content cannot drift apart again. */
  for (const out of ['dist/education.html', 'dist/work.html', 'dist/safety.html']) {
    const html = readFileSync(out, 'utf8');
    const stubs = (html.match(/<li class="sol-stub"/g) || []).length;
    assert.equal(stubs, 3, `${out} has ${stubs} article stubs, expected three to fill the row`);
  }
  const css = readFileSync('css/solution.css', 'utf8');
  assert.match(css, /\.sol-stubs\{[^}]*grid-template-columns:repeat\(3,/,
    'css/solution.css no longer lays the article stubs out three up');
});

test('Quality Education closes its work areas with the roadmap’s statement', () => {
  /* Education's section 5 ends with a statement the other two tabs do not
     have. It is a trailing block, not a fifth work area, so it must not be
     counted as one by the work-area sweep. */
  const html = readFileSync('dist/education.html', 'utf8');
  assert.match(html, /class="sol-grid__closer"/,
    'dist/education.html has no closing block after its work areas');
  assert.ok(html.includes('Real Choice for Every Family'),
    'dist/education.html has lost the closing block’s heading');
  assert.ok(html.includes('We don’t tell families which school to choose. We work to make sure they have a choice.'),
    'dist/education.html has lost the closing block’s final line');

  for (const out of ['dist/work.html', 'dist/safety.html']) {
    assert.doesNotMatch(readFileSync(out, 'utf8'), /class="sol-grid__closer"/,
      `${out} has a closing block, which only Quality Education has`);
  }
});

test('the About pages use the agreed build’s header, not the mega-menu one', () => {
  // The agreed homepage runs header-2 (utility strip + plain dropdowns). An
  // About page on the mega-menu header would put two different navigations in
  // front of the same client in the same review.
  for (const page of PAGES.filter(p => p.kind === 'about')) {
    const shell = readFileSync(`src/${page.src}`, 'utf8');
    assert.match(shell, /<!--@include _shared\/header-2\.html-->/,
      `${page.src} does not use the agreed build's header`);
    assert.ok(!shell.includes('megamenu'), `${page.src} still loads mega-menu code`);
  }
});

test('every About section partial uses curly apostrophes and quotes', () => {
  for (const page of PAGES.filter(p => p.kind === 'about')) {
    const dir = `src/${page.src.replace('/index.html', '')}/sections`;
    for (const f of readdirSync(dir)) {
      const s = readFileSync(`${dir}/${f}`, 'utf8');
      const bad = s.match(/[A-Za-z]'[A-Za-z]/g) || [];
      assert.equal(bad.length, 0,
        `${dir}/${f} has straight apostrophes: ${bad.join(', ')} — brand copy requires U+2019`);
      const textOnly = s.replace(/<[^>]+>/g, '');
      assert.ok(!textOnly.includes('"'),
        `${dir}/${f} has straight double quotes in prose; use U+201C/U+201D`);
    }
  }
});

test('every About variation has its own stylesheet and no other variation’s', () => {
  /* The six independent readings are deliberately not sharing a stylesheet.
     Each one is a candidate for conversion into Elementor blocks on its own,
     and a shared "about.css" would mean converting the winner drags in rules
     written for designs the client rejected. Public Safety is exempted from
     that rule via SHARED_CSS: it is built on the solution template on
     purpose, and Task 3/4 add work and education to the same exemption. */
  for (const page of PAGES.filter(p => p.kind === 'about')) {
    const slug = page.out.replace('dist/', '').replace('.html', '');
    const shell = readFileSync(`src/${page.src}`, 'utf8');
    const cssFile = cssFileFor(slug);
    assert.ok(existsSync(cssFile), `${cssFile} does not exist`);
    assert.ok(shell.includes(cssFile), `${page.src} does not link its stylesheet`);
    for (const other of PAGES.filter(p => p.kind === 'about' && p.out !== page.out)) {
      const otherSlug = other.out.replace('dist/', '').replace('.html', '');
      const otherCssFile = cssFileFor(otherSlug);
      if (otherCssFile === cssFile) continue; // deliberately shared, see SHARED_CSS
      assert.ok(!shell.includes(otherCssFile),
        `${page.src} also links ${otherCssFile}, the variations must stay separable`);
    }
  }
});

test('no About stylesheet reaches into another variation’s namespace', () => {
  /* wa-, wb-, wc-, da-, db-, dc- — one prefix per page. A rule written under
     the wrong prefix is a rule that will not travel with its page when the
     other five are deleted. */
  const PREFIX = {
    'who-we-are-a': 'wa', 'who-we-are-b': 'wb', 'who-we-are-c': 'wc',
    'what-we-do-a': 'da', 'what-we-do-b': 'db', 'what-we-do-c': 'dc',
    'team-a': 'ta', 'team-b': 'tb', 'team-c': 'tc', 'team-bio': 'tp',
    'solutions-a': 'sa', 'solutions-b': 'sb', 'solutions-c': 'sc',
    'work-b': 'wrb', 'work-c': 'wkc', 'work': 'sol',
    'safety-a': 'psa', 'safety': 'sol', 'safety-c': 'sfc',
    'education': 'sol',
    'podcast-a': 'pca', 'podcast-b': 'pcb',
    'capitol-a': 'cca', 'capitol-b': 'ccb',
    'epic-a': 'epa', 'epic-b': 'epb', 'epic-c': 'epc',
    'mail-a': 'mla', 'mail-b': 'mlb', 'amb-a': 'aba', 'amb-b': 'abb',
    'give-a': 'gva', 'give-b': 'gvb', 'give-c': 'gvc', 'give-d': 'gvd',
    'content-a': 'cad', 'content-b': 'cwa', 'landing': 'lnd', 'landing-b': 'lnb',
    'contact': 'ct',
  };

  /* The map has to be written by hand — a slug does not imply a prefix — but its
     COVERAGE does not. Every About page must appear here, and a page added
     without an entry fails loudly instead of quietly opting out of the check.
     This test, the side-stripe sweep and the hang-out-of-section sweep all
     shipped with hand-written page lists that stopped matching the build; the
     other two now derive from PAGES, and this is the same fix in the only shape
     an arbitrary mapping allows. */
  for (const page of PAGES.filter(p => p.kind === 'about')) {
    const slug = page.out.replace('dist/', '').replace('.html', '');
    assert.ok(PREFIX[slug], `${slug} has no namespace prefix registered in this test`);
  }

  const all = Object.values(PREFIX);
  for (const [slug, mine] of Object.entries(PREFIX)) {
    const cssFile = cssFileFor(slug);
    const css = readFileSync(cssFile, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const other of all) {
      if (other === mine) continue;
      assert.ok(!css.includes(`.${other}-`),
        `${cssFile} uses the .${other}- namespace, which belongs to another variation`);
    }
  }
});

/* The one rule in the build that hangs an element out of its own section, and
   the pages it is allowed to reach. .fp-northstar is Front Porch's quote card:
   position:absolute with a negative `bottom`, so it straddles the boundary into
   section 2. It is the cautionary tale the Elementor constraint was written
   from — an escaping element needs a z-index workaround and disappears the
   first time a later section is given `position` — and it survives only on the
   four archived homepage options, which are kept buildable so the decision can
   be re-read and are not being converted. Empower asked for it off the agreed
   build, so final.html does not carry it.

   The allow-list is asserted in both directions below: the rule must still be
   reachable from exactly these pages, and must still be absent from every
   other one. An exemption nobody re-checks is how a sweep goes green over a
   defect it was written to catch. */
const KNOWN_ESCAPES = {
  'fp-northstar': ['dist/homepage-a.html'],
};

test('no page hangs an element out of its own section', () => {
  /* The Elementor constraint: one section maps to one section, and every
     overlap is a negative margin on a child INSIDE the section that owns it.
     A negative `bottom` on an absolutely positioned box is the shape that
     reaches downward out of its own section; absolute positioning inside a
     section is fine and used throughout.

     Swept over every client-facing page through the stylesheets that page
     actually LINKS, not through one file guessed from its slug. Two earlier
     versions of this sweep each covered less than they read as covering: the
     first named thirteen slugs by hand and never grew, and the second filtered
     on kind === 'about', which quietly excluded final.html — the one page that
     ships. Reading the page's own <head> is the only list that cannot go stale,
     because it is the same list the hand-off table tells WordPress to enqueue.

     A rule only counts against a page if that page actually uses it. option-a.css
     is linked by final.html as well as by homepage-a.html, and final.html has the
     north-star figure deleted from its markup, so the rule is inert there. */
  assert.ok(ALLPAGES.length > 40, `only ${ALLPAGES.length} pages swept — is the filter right?`);
  const seen = {};
  for (const { out, html: page } of ALLPAGES) {
    const sheets = [...page.matchAll(/<link rel="stylesheet" href="\.\.\/(css\/[^"]+)"/g)].map(m => m[1]);
    assert.ok(sheets.length > 0, `${out} links no local stylesheet — did the <head> shape change?`);
    for (const cssFile of sheets) {
      const css = readFileSync(cssFile, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      for (const block of css.split('}')) {
        const [selector, body] = block.split('{');
        if (!body || !/position:\s*absolute/.test(body)) continue;
        if (!/bottom:\s*calc\(\s*-|bottom:\s*-/.test(body)) continue;
        for (const one of selector.split(',')) {
          const cls = one.trim().match(/^\.([A-Za-z0-9_-]+)/)?.[1];
          if (!cls || !new RegExp(`class="[^"]*\\b${cls}\\b`).test(page)) continue;
          (seen[cls] ||= []).push(out);
          assert.ok(KNOWN_ESCAPES[cls]?.includes(out),
            `${out} uses .${cls} from ${cssFile}, which hangs below its own box — ` +
            `use a negative margin on a child instead, so the section keeps its height`);
        }
      }
    }
  }
  /* The other direction. Without this, deleting .fp-northstar outright would
     leave a permanent exemption standing over nothing, ready to wave through
     the next element that takes the name. */
  for (const [cls, pages] of Object.entries(KNOWN_ESCAPES)) {
    assert.deepEqual([...new Set(seen[cls] || [])].sort(), [...pages].sort(),
      `.${cls} is exempted for ${pages.join(', ')} but is actually reachable from ` +
      `${(seen[cls] || ['nothing']).join(', ')} — update or retire the exemption`);
  }
});

test('every page using header-2 also links the stylesheet it needs', () => {
  /* The dropdown panels ship OPEN and in flow — that is the no-JS fallback.
     css/header-2.css is what turns them into closed overlays once
     js/dropdown.js sets [data-dropdown="on"]. A page that includes the
     partial without the stylesheet renders five permanently open panels over
     its own hero, which is exactly what the first build of the About pages
     did: the rules lived inside css/current-2.css, a homepage stylesheet no
     About page had any reason to load. */
  for (const page of PAGES) {
    const shell = readFileSync(`src/${page.src}`, 'utf8');
    if (!shell.includes('_shared/header-2.html')) continue;
    assert.ok(shell.includes('css/header-2.css'),
      `${page.src} includes header-2.html but never links css/header-2.css — ` +
      `its dropdown panels will render open over the page`);
    assert.ok(shell.includes('js/dropdown.js'),
      `${page.src} includes header-2.html but never loads js/dropdown.js`);
  }
});

test('the About pages carry none of Empower\u2019s internal section labels', () => {
  /* 2026-08-03: Empower confirmed the side labels on the Who We Are tab —
     "Why We Exist", "History of Empower Mississippi", "Nonprofit Status",
     "Our people" — were for their own organisation, not copy for the page.
     "Our Story" is the exception: the roadmap marks it Headline:, and the
     client asked for the section to start with it.

     "Our Solutions" on the What We Do pages is a deliberate keep. It is the
     only heading that section has, and three solution panels with nothing
     above them lose the thread — the client's rule is to drop the labels
     "unless the context is necessary". */
  const LABELS = ['Why We Exist', 'Why we exist', 'History of Empower', 'Nonprofit Status', 'Nonprofit status'];
  for (const { out, html } of ABOUTPAGES) {
    for (const label of LABELS) {
      assert.ok(!html.includes(label), `${out} still shows the internal section label "${label}"`);
    }
  }
});

test('no About page repeats a kicker above every section', () => {
  /* The first build of these pages put a tiny uppercase tracked label above
     each section — ABOUT EMPOWER, WHY WE EXIST, OUR STORY, OUR PEOPLE,
     NONPROFIT STATUS. That is the scaffold this build already rejected once
     on the homepage: the note on .fp-tagline in css/option-a.css says the
     tagline "appears once. It is not the repeated uppercase eyebrow the page
     used to put above every section."

     One kicker per page, in the hero, naming where the visitor has landed.
     Below it, sections are introduced by their heading and the brand's orange
     mark. Variation B is allowed none at all — its chapter rail is the label
     system. */
  for (const { out, html } of ABOUTPAGES) {
    /* The pattern has to match every namespace in the build, not the two-letter
       ones it was written against, and the label is called a kicker on the older
       pages and an eyebrow on the newer ones. Both are the same object: a small
       label above a heading. */
    const kickers = html.match(/class="[a-z]{2,4}-(kicker|eyebrow|hero__eyebrow)/g) || [];
    assert.ok(kickers.length <= 1,
      `${out} has ${kickers.length} kickers — one per page, in the hero`);
  }
});

test('no About stylesheet uses a coloured side stripe as an accent', () => {
  /* border-left / border-right thicker than a hairline, used as a coloured
     accent on a card or a pull quote, is the callout-bar reflex. Where these
     pages want to mark a block they use the 56x4 orange rule above it, which
     is the brand's own motif. */
  /* Derived from PAGES, never listed by hand. The hand-written list this replaced
     named thirteen slugs because thirteen was all there was when it was written;
     four pages added later were never added to it, and one of them shipped the
     exact defect this sweep exists to catch while the sweep passed green. A list
     that has to be extended by hand stops covering the build the first time
     somebody forgets. */
  for (const page of PAGES.filter(p => p.kind === 'about')) {
    const slug = page.out.replace('dist/', '').replace('.html', '');
    const cssFile = cssFileFor(slug);
    const css = readFileSync(cssFile, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const block of css.split('}')) {
      const [selector, body] = block.split('{');
      if (!body) continue;
      const m = body.match(/border-(left|right):\s*(\d+)px/);
      if (!m || Number(m[2]) <= 1) continue;
      /* A LONE side border is the callout bar. A side border declared together
         with an adjacent top or bottom border is a corner — the two-border
         chevron that draws every caret in this build, including the one in
         components.css. Flagging that would be a false positive, and designing
         around a false positive is worse than the rule it enforces. */
      if (/border-(top|bottom):\s*\d+px/.test(body)) continue;
      assert.fail(`${cssFile} puts a ${m[2]}px ${m[1]} border on ` +
        `${selector.trim().slice(0, 50)} — use the orange mark above the block instead`);
    }
  }
});

/* ===========================================================================
   ALL CONTENT, and the landing page template.

   Added 2026-08-12. The two All Content readings share a copy contract — the
   roadmap's four type sentences and its five topic labels — and diverge on
   everything else, so the mechanism checks are written per reading. The landing
   page is not a reading of anything; it is checked as a template, which means
   checking the properties that make it one.
   ======================================================================== */

/* The roadmap's All Content tab, whole. Four content types, a sentence under
   each, and the topic list under the heading "Filter by Topic:". That is all it
   gives — no hero, no headline — which is why the pages' own words are marked
   as ours in the section files rather than passed off as approved copy. */
const CONTENT_COPY = [
  'Articles',
  'Explore the latest ideas, insights, and updates on the issues shaping opportunity in Mississippi.',
  'Community Stories',
  'Meet the people behind the issues and see how policy and opportunity impact real lives across Mississippi.',
  'Research &amp; Reports',
  'Explore Mississippi-specific research, data, and policy solutions designed to turn ideas into action.',
  'Press Releases',
  'Get the latest news, announcements, and updates from Empower Mississippi.',
  'Quality Education',
  'Meaningful Work',
  'Public Safety',
  'Bill Summaries',
];

const CONTENTPAGES = ABOUTPAGES.filter(p => p.out.includes('content-'));

test('both All Content readings build', () => {
  assert.equal(CONTENTPAGES.length, 2, `expected two All Content readings, found ${CONTENTPAGES.length}`);
});

test('every All Content reading carries the roadmap copy verbatim', () => {
  for (const { out, html } of CONTENTPAGES) {
    for (const line of CONTENT_COPY) {
      /* The type names are matched against the MARKUP rather than the text, so
         "Research & Reports" is checked as the entity the roadmap's ampersand
         has to become. */
      assert.ok(html.includes(line), `${out} is missing roadmap copy: "${line.slice(0, 60)}…"`);
    }
  }

  /* "Filter by Topic:" is the one roadmap string that belongs to reading A only,
     and that is a decision rather than an omission. In A, topic IS a filter and
     the label is carried word for word. In B, topic is the structure of the page
     and type is the filter, so a control labelled "Filter by Topic:" would either
     be a second mechanism nobody needs or a label on links that only scroll.
     Recorded here so the difference stays deliberate and visible. */
  const a = CONTENTPAGES.find(p => p.out.endsWith('content-a.html')).html;
  const b = CONTENTPAGES.find(p => p.out.endsWith('content-b.html')).html;
  assert.ok(a.includes('Filter by Topic:'), 'content-a has lost the roadmap’s topic-filter label');
  assert.ok(!b.replace(/<!--[\s\S]*?-->/g, '').includes('Filter by Topic:'),
    'content-b labels something "Filter by Topic:", and nothing on that reading filters by topic');
});

test('both All Content readings are titled All Content, not Commentary', () => {
  /* The roadmap heads the tab "ALL CONTENT" and then names the page "Empower
     Mississippi Commentary" at /empower-commentary. The header nav shipped on
     every page in this build says All Content, so that is what both readings
     use — and this test is where the decision is recorded. If Empower answer
     the question the other way, this is the line that changes with the h1. */
  for (const { out, html } of CONTENTPAGES) {
    assert.match(html, /<h1[^>]*>All Content<\/h1>/, `${out}'s h1 is not "All Content"`);
    /* Comments first. The section files DISCUSS /empower-commentary at length —
       that is where the decision is written down — and a search over raw markup
       would fail on the explanation rather than on a link. */
    const markup = html.replace(/<!--[\s\S]*?-->/g, '');
    assert.ok(!markup.includes('empower-commentary'),
      `${out} links the roadmap's /empower-commentary URL, which this build has not adopted`);
  }
});

test('neither All Content reading ships a filter that needs a script', () => {
  /* The filtering is :has() over real inputs, and both stylesheets gate the
     controls behind an @supports test so that a browser without :has() gets the
     full unfiltered list rather than a dead panel. */
  for (const { out, html } of CONTENTPAGES) {
    const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m => m[1]);
    assert.deepEqual(scripts, ['../js/nav.js', '../js/reveal.js', '../js/dropdown.js'],
      `${out} loads something beyond the three shared behaviour modules: ${scripts.join(', ')}`);
    assert.match(html, /<form class="c(ad-controls|wa-choose__form)"/,
      `${out}'s filter is not wrapped in a form`);
  }
  for (const file of ['css/content-a.css', 'css/content-b.css']) {
    const css = readFileSync(file, 'utf8');
    assert.match(css, /@supports not selector\(body:has\(a\)\)/,
      `${file} does not gate its filter behind an @supports test for :has()`);
  }
});

test('every item on both All Content readings is a real empowerms.org post', () => {
  /* An invented headline is the placeholder that reads as finished work. Every
     card and row links out to the live site, and both readings carry the same
     twenty-three posts, so the two can be compared without the content being a
     variable. */
  for (const { out, html } of CONTENTPAGES) {
    const links = [...html.matchAll(/href="(https:\/\/empowerms\.org\/[^"]+)"/g)].map(m => m[1]);
    const unique = new Set(links);
    assert.equal(unique.size, 23, `${out} shows ${unique.size} posts, expected 23`);
  }
  const [a, b] = CONTENTPAGES;
  const posts = page => new Set([...page.html.matchAll(/href="(https:\/\/empowerms\.org\/[^"]+)"/g)].map(m => m[1]));
  assert.deepEqual([...posts(a)].sort(), [...posts(b)].sort(),
    'the two All Content readings do not show the same posts, so they cannot be compared');
});

/* One shelf block per subject, so the tests below can ask questions of a shelf
   rather than of the whole page. */
const shelvesOf = html => {
  const parts = html.split(/<section class="cwa-shelf[^"]*" id="shelf-/).slice(1);
  /* Cut each block at its own closing tag. Without that, the last shelf runs on
     into the shared footer, and a question about "what is on this shelf" gets
     answered with the footer's logo. */
  return parts.map(part => ({
    id: part.slice(0, part.indexOf('"')),
    html: part.slice(0, part.indexOf('</section>')),
  }));
};

test('both All Content readings answer their dead ends in words', () => {
  /* Bill Summaries is a topic here and a category in their WordPress, and every
     bill summary is written as an article. So asking for a bill summary as any
     other kind of thing returns nothing, and both pages answer that in words
     rather than with a blank grid. B has a second one for the same reason: the
     two impact reports are both research, so its closing group empties when
     research is filtered out. Every rule that shows an empty state is enumerated
     in CSS — there is no script to count what is left. */
  for (const { out, html } of CONTENTPAGES) {
    assert.match(html, /class="c(ad-empty|wa-shelf__empty)" role="status"/,
      `${out} has no empty state for the Bill Summaries pairing`);
    assert.match(textOf(html), /bill summaries are published as articles/i,
      `${out}'s empty state does not say why nothing matched`);
  }
  const a = readFileSync('css/content-a.css', 'utf8');
  assert.match(a, /#ca-p-bills:checked\)[\s\S]{0,400}\.cad-empty/,
    'content-a never shows its empty state');

  /* B's dead ends, DERIVED from what is on each shelf rather than listed by
     hand. A shelf empties when none of the kinds it holds is ticked, so a shelf
     that holds all four kinds cannot empty and one that holds fewer can. The
     list changed once already: moving both impact reports into the closing group
     left the education shelf with no research of its own, which turned a
     two-dead-end page into a three-dead-end page and made one shelf go silently
     blank. A hand-written list would not have noticed, in the same way the
     chooser's hand-written rail counts did not. */
  const bHtml = CONTENTPAGES.find(p => p.out.endsWith('content-b.html')).html;
  const bCss = readFileSync('css/content-b.css', 'utf8');
  const ALL_KINDS = ['article', 'story', 'research', 'press'];

  for (const shelf of shelvesOf(bHtml)) {
    const holds = new Set([...shelf.html.matchAll(/<li class="cwa-item[^"]*" data-type="([a-z]+)"/g)].map(m => m[1]));
    const canEmpty = ALL_KINDS.some(k => !holds.has(k));

    if (!canEmpty) {
      assert.ok(!shelf.html.includes('cwa-shelf__empty'),
        `content-b’s ${shelf.id} shelf holds all four kinds and cannot empty, so its empty state is dead markup`);
      assert.ok(!bCss.includes(`[data-shelf="${shelf.id}"]`),
        `content-b has a filter rule for its ${shelf.id} shelf, which holds all four kinds and cannot empty`);
      continue;
    }

    assert.ok(shelf.html.includes('class="cwa-shelf__empty" role="status"'),
      `content-b’s ${shelf.id} shelf can be emptied by a filter and has nothing to say when it is`);

    /* The rule's condition must be exactly "none of the kinds this shelf holds
       is ticked". Too few :not()s and the message appears over a shelf that
       still has rows; too many and the shelf goes blank in silence. */
    for (const which of ['.cwa-items', '.cwa-shelf__empty']) {
      const rule = bCss.split('\n').find(line =>
        line.includes(`[data-shelf="${shelf.id}"] ${which}`) && line.includes('body:has(.cwa-type:checked)'));
      assert.ok(rule, `content-b has no rule for ${which} on its ${shelf.id} shelf`);
      const guarded = new Set([...rule.matchAll(/:not\(:has\(#cw-t-([a-z]+):checked\)\)/g)].map(m => m[1]));
      assert.deepEqual([...guarded].sort(), [...holds].sort(),
        `content-b’s ${shelf.id} rule for ${which} guards on ${[...guarded].sort().join('+') || 'nothing'}, but that shelf holds ${[...holds].sort().join('+')}`);
    }
  }
});

test('content-b filters on one facet, so it needs no rule ordering', () => {
  /* The shape of the filter, and the reason this reading is simpler than A's.
     Type is B's only facet, so it can use hide-everything-then-reveal, which is
     an OR inside the facet: nothing here can un-hide a row that another rule hid
     on purpose. A needs its two facets ordered; this one must not grow a second
     facet without that being a deliberate rewrite. */
  const css = readFileSync('css/content-b.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(css, /body:has\(\.cwa-type:checked\) \.cwa-item\{display:none\}/,
    'content-b does not hide the rows when a kind is ticked, so its filter reveals nothing');
  for (const type of ['article', 'story', 'research', 'press']) {
    assert.match(css, new RegExp(`body:has\\(#cw-t-${type}:checked\\) \\.cwa-item\\[data-type="${type}"\\]`),
      `content-b never reveals ${type} rows`);
  }
  assert.ok(!/#cw-p-/.test(css),
    'content-b has grown a topic facet — topic is this reading’s STRUCTURE, and two facets need the ordered shape');
});

test('content-a’s filter bar is one line, and its labels are hidden rather than deleted', () => {
  /* SUPERSEDES "stacks its two facets against one label gutter" (2026-08-26).
     That test defended a two-row bar built around a shared label track, and the
     reasoning it recorded is still true as far as it goes: at full label length
     the five type tabs need 656px and the five topic pills 688px, which is
     1376px against a 1200px container, so the two facets CANNOT share a line
     while the labels read "Community Stories" and "Quality Education".

     What changed is the input, not the arithmetic. The bar was 133px tall and
     stuck under a 113px header, so 246px of a 900px viewport — 27% — was gone
     before a single card. Shortening the control labels (the band headings
     below still carry Empower's full wording) brings the two facets to
     343 + 492 + 48 = 883px, and one line fits with room to spare. Measured in
     the browser at 1400px, not predicted.

     THE LEGENDS ARE HIDDEN, NOT REMOVED, and that is the half worth guarding.
     "Browse" and "Filter by Topic:" stop being drawn, because a one-line bar
     has no gutter to put them in and the two control shapes (underlined tabs
     against outlined pills, split by a rule) carry the distinction visually.
     They must still be in the markup and still name their group: the fieldsets
     carry role="group" and aria-labelledby precisely because display:contents
     dropped implicit semantics, and hiding a legend with display:none would
     take the accessible name with it. */
  const css = readFileSync('css/content-a.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const inner = css.match(/\.cad-controls__inner\{[^}]*\}/)[0];

  assert.match(inner, /display:flex/,
    'content-a’s filter bar is not a flex row, so it cannot be one line');
  assert.match(inner, /flex-wrap:nowrap/,
    'the filter bar may wrap at full width, which is the ragged second row this design exists to remove');

  const label = css.match(/\.cad-group__label\{[^}]*\}/)[0];
  assert.ok(!/display:none/.test(label),
    'the legends are display:none, which removes the accessible name the fieldsets’ '
    + 'aria-labelledby points at; clip them instead');
  assert.match(label, /clip-path:inset\(50%\)|clip:rect/,
    'the legends are not visually hidden, so the one-line bar still draws a label gutter it has no room for');

  /* The markup must still carry both legends and both names. */
  const html = readFileSync('src/content-a/sections/02-browse.html', 'utf8');
  for (const [id, text] of [['cad-type-label', 'Browse'], ['cad-topic-label', 'Filter by Topic:']]) {
    assert.match(html, new RegExp(`<legend class="cad-group__label" id="${id}">${text}</legend>`),
      `the ${id} legend is gone from the markup, so its group has no accessible name`);
    assert.match(html, new RegExp(`aria-labelledby="${id}"`),
      `nothing points at ${id} any more`);
  }
});

/* THE LABELS THAT MAKE ONE LINE POSSIBLE, asserted as an exact set. The design
   only fits because these are short, so a well-meaning edit restoring
   "Community Stories" here silently puts the bar back to two rows at 1400px and
   nothing else would say so. The band headings below the bar are deliberately
   NOT in this list: they keep Empower's full wording. */
/* THE FILTER'S TOPIC SET EXISTS TWICE, AND CSS CANNOT DERIVE THE SECOND FROM
   THE FIRST. css/content-a.css hides the CARD; bridge.css block 73 hides the
   `.e-loop-item` wrapper that is the real grid item on a converted page, and it
   has to restate the same condition because CSS cannot ask whether an element's
   child is currently display:none. Add a topic to one and the other is wrong
   and silent: the new topic would filter correctly on the static build and
   leave holes on the live page, which is precisely the defect this pair was
   written to fix. */
/* THE ARCHIVE TEMPLATE NOW SERVES TWO KINDS OF PAGE, and the head is the only
   thing that differs. A category archive is titled by its term; the posts page
   (/updates/, WordPress's page_for_posts, titled "News") has no term at all, so
   single_term_title() returns nothing there and the head would render empty.

   Both cases go through the same shortcode rather than a second template,
   because two templates differing in one string is two things to keep in step. */
test('the archive head titles a category by its term and the posts page by its own title', () => {
  const php = readFileSync('wp/empowerms-child/inc/archive.php', 'utf8');
  const fn = php.slice(php.indexOf('function empower_archive_title_shortcode'));
  const body = fn.slice(0, fn.indexOf('\n}'));

  assert.match(body, /is_home\(\)/,
    'the title shortcode has no posts-page branch, so /updates/ renders an empty heading');
  /* AND AUTHOR ARCHIVES, which name themselves a third way: not a term, not a
     page title, but the queried user's display_name. Read off the queried
     object rather than get_the_author(), which depends on the loop having
     started and is empty in a head rendered above it. 261 of the 490 posts sit
     under the `empowerms` account, whose display_name is "Empower Mississippi",
     so this is a real byline rather than a login leaking onto the page. */
  assert.match(body, /is_author\(\)/,
    'the title shortcode has no author branch, so /author/<name>/ renders an empty heading');
  assert.match(body, /display_name/,
    'the author branch does not read display_name, so the heading shows a login slug rather than a name');
  assert.match(body, /single_post_title|get_the_title\(\s*(?:\(int\)\s*)?get_option\( 'page_for_posts'/,
    'the posts-page branch does not read the page_for_posts title, so the heading is invented rather '
    + 'than taken from the page Empower named');
  assert.match(body, /single_term_title/,
    'the category branch is gone');

  /* The count shortcode has to follow, or /updates/ shows a heading with no
     count while every category archive shows one. */
  const cnt = php.slice(php.indexOf('function empower_archive_count_shortcode'));
  const cntBody = cnt.slice(0, cnt.indexOf('\n}'));
  assert.match(cntBody, /is_home\(\)/,
    'the count shortcode still refuses anything that is not a category, so /updates/ shows no count');
  assert.match(cntBody, /is_author\(\)/,
    'the count shortcode refuses author archives, so they show a heading with no count while every '
    + 'other archive shows one');
});

/* THE FALLBACK'S HEADING PRINTED ITS OWN MARKUP. get_the_archive_title() returns
   HTML -- on a date archive, `Month: <span>May 2025</span>` -- and archive.php
   passed it straight to esc_html(), so /2025/05/ rendered the tags as visible
   text. Seen on the live install, not deduced. Now that categories, the posts
   page and author archives all have an Elementor template, this fallback serves
   only tag and date archives, which makes it MORE important that it reads
   properly rather than less: it is the only thing a visitor there ever sees. */
test('archive.php\'s fallback heading strips the markup WordPress puts in it', () => {
  const php = readFileSync('wp/empowerms-child/archive.php', 'utf8');
  const title = php.match(/esc_html\([^;]*get_the_archive_title\(\)[^;]*\)/);
  assert.ok(title, 'the fallback no longer escapes its archive title at all');
  assert.match(title[0], /wp_strip_all_tags/,
    'the fallback escapes get_the_archive_title() without stripping it first, so a date archive '
    + 'renders "Month: &lt;span&gt;May 2025&lt;/span&gt;" as visible text');
});

/* THE POSTS PAGE CANONICALS TO /all-content/, for the reason the three topic
   terms do: it lists all 490 posts, which is what the signed-off All Content
   page already is, and two indexable listings of one set compete rather than
   consolidate. Decided 2026-08-27. */
test('the posts page credits /all-content/ rather than competing with it', () => {
  const php = readFileSync('wp/empowerms-child/functions.php', 'utf8');
  const filter = php.slice(php.indexOf("add_filter( 'aioseo_canonical_url'"));
  const body = filter.slice(0, filter.indexOf('\n} );'));

  assert.match(body, /is_home\(\)/,
    'the canonical filter has no posts-page branch, so /updates/ declares itself canonical over the '
    + 'same 490 posts /all-content/ lists');
  assert.match(body, /\/all-content\//,
    'the posts-page branch does not name /all-content/ as its destination');
  assert.match(body, /'publish' !== get_post_status/,
    'the destination is not checked for existence; a canonical pointing at a 404 is worse than the '
    + 'duplicate it replaces');
});

/* And the stylesheet key has to answer the posts page too, or /updates/ gets
   the cards' markup with none of content-a.css to draw them. */
test('empower_style_key answers the posts page as well as category archives', () => {
  const php = readFileSync('wp/empowerms-child/functions.php', 'utf8');
  const fn = php.slice(php.indexOf('function empower_style_key()'));
  /* COMMENTS STRIPPED FIRST. The negative assertion below asks whether the CODE
     uses is_archive(), and the comment beside it explains at length why it must
     not -- so an unstripped read fails on the prose that documents the rule.
     Caught by this test going red against a correct implementation. */
  const body = fn.slice(0, fn.indexOf('\n}'))
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  for (const cond of ['is_category()', 'is_home()', 'is_author()']) {
    assert.ok(body.includes(cond),
      `the archive branch does not answer ${cond}, so that archive loads neither content-a.css nor `
      + 'archive.css and its cards render unstyled');
  }
  /* Still NOT is_archive(). Date and tag archives are not converted and keep
     archive.php's plain fallback; keying them 'archive' would hand them a
     stylesheet for markup that has none of its classes. */
  assert.ok(!/is_archive\(\)/.test(body),
    'the archive branch uses is_archive(), which also catches the date and tag archives that are '
    + 'deliberately left on the plain fallback');
});

test('the topic filter hides the card and its grid cell, for the same set of topics', () => {
  const page = readFileSync('css/content-a.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const bridge = readFileSync('wp/empowerms-child/css/bridge.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

  const topics = (css) => [...new Set(
    [...css.matchAll(/#ca-p-([a-z]+):checked/g)].map((m) => m[1]),
  )].filter((t) => t !== 'all').sort();

  const onCards = topics(page);
  const onCells = topics(bridge);

  assert.ok(onCards.length >= 4, `only ${onCards.length} topic rules in content-a.css; the filter has shrunk`);
  assert.deepEqual(onCells, onCards,
    `css/content-a.css filters on [${onCards.join(', ')}] but bridge.css releases cells for `
    + `[${onCells.join(', ')}]; the difference is a topic that hides its cards and leaves their grid `
    + 'cells occupied on every converted page');
});

/* THE SAME PAIR, ON PODCAST-A. bridge.css block 74 restates podcast-a's guest
   set for the same reason block 73 restates content-a's topics, and carries the
   same hazard: add a guest facet to css/podcast-a.css and the catalogue filters
   correctly on the static build while leaving holes on the converted page. */
test('the guest filter hides the episode and its grid cell, for the same set of guests', () => {
  const page = readFileSync('css/podcast-a.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const bridge = readFileSync('wp/empowerms-child/css/bridge.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

  const guests = (css) => [...new Set(
    [...css.matchAll(/data-guest="([a-z]+)"/g)].map((m) => m[1]),
  )].sort();

  const onEpisodes = guests(page);
  const onCells = guests(bridge);

  assert.ok(onEpisodes.length >= 3, `only ${onEpisodes.length} guest rules in podcast-a.css; the filter has shrunk`);
  assert.deepEqual(onCells, onEpisodes,
    `css/podcast-a.css filters on [${onEpisodes.join(', ')}] but bridge.css releases cells for `
    + `[${onCells.join(', ')}]; the difference is a guest whose episodes hide and leave their grid `
    + 'cells occupied on the converted page');
});

test('content-a’s control labels are the short forms the one-line bar depends on', () => {
  const html = readFileSync('src/content-a/sections/02-browse.html', 'utf8');
  const labels = (cls) => [...html.matchAll(new RegExp(`<label class="${cls}"[^>]*>([^<]*)</label>`, 'g'))]
    .map(m => m[1].trim());

  assert.deepEqual(labels('cad-tab'), ['All', 'Articles', 'Stories', 'Research', 'Press'],
    'the type tabs are not the short forms; at full length they need 656px and the bar returns to two rows');
  assert.deepEqual(labels('cad-chip'), ['All topics', 'Education', 'Work', 'Safety', 'Bills'],
    'the topic pills are not the short forms; at full length they need 688px and will not share a line');

  /* The full wording still has to appear on the page, in the band headings, so
     nothing Empower wrote is lost — only abbreviated in the control. */
  for (const full of ['Community Stories', 'Research &amp; Reports', 'Press Releases']) {
    assert.ok(html.includes(`>${full}</h2>`) || html.includes(full),
      `${full} has disappeared from the page entirely, not just from the filter`);
  }
});

/* A PRE-EXISTING BUG THIS CHANGE MAKES WRONG BY A DIFFERENT AMOUNT.
   css/content-a.css sets no scroll-margin-top at all, so following #band-press
   lands the heading underneath the sticky header and bar; every other page in
   the build that has an in-page anchor sets 100-110px. The offset has to clear
   the header plus the bar, and the bar's height is exactly what this design
   changed, so the number moves with it. */
test('content-a’s band headings clear the sticky bar when linked to', () => {
  const css = readFileSync('css/content-a.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  /* ON THE TITLE, because the id is on the <h2>. The scroll target is the
     element the fragment names, so scroll-margin-top on the section that
     CONTAINS it does nothing; that exact mistake was made first and measured
     (the heading still landed 44px above the viewport top). */
  const band = css.match(/\.cad-band__title\{[^}]*scroll-margin-top:(\d+)px/);
  assert.ok(band, 'no scroll-margin-top on .cad-band__title, which is the element #band-press names, '
    + 'so following that link lands the heading under the sticky bar');

  const top = parseInt(css.match(/\.cad-controls\{[^}]*top:(\d+)px/)[1], 10);
  assert.ok(Number(band[1]) >= top,
    `scroll-margin-top is ${band[1]}px but the bar alone sticks at ${top}px, so a linked heading still lands under it`);
});

test('every card on content-a carries the photograph of the post it links to', () => {
  /* Their archive shows an image on every post, and stripping that in our
     version was the first thing Empower would have noticed. What makes it
     honest is WHICH image: each card carries the featured image of the post it
     links to, pulled from their own media library, so a card beside "How Karl
     Hampton Found Freedom" is a photograph of Karl Hampton rather than a stock
     photograph that reads as one. That is the whole reason this is testable at
     all: the file name has to match the slug in the href. A generic photograph
     put back here would pass an eye and fail this line. */
  const html = CONTENTPAGES.find(p => p.out.endsWith('content-a.html')).html;
  const cards = html.match(/<li class="cad-card[\s\S]*?<\/li>/g) || [];
  assert.equal(cards.length, 23, `content-a has ${cards.length} cards, expected 23`);

  for (const card of cards) {
    const slug = card.match(/href="https:\/\/empowerms\.org\/([^"/]+)\//)[1];
    const img = card.match(/<img class="cad-card__photo[^"]*"[^>]*>/);
    assert.ok(img, `content-a's card for ${slug} carries no photograph`);
    const src = img[0].match(/src="\.\.\/assets\/posts\/([^."]+)\.[a-z]+"/);
    assert.ok(src, `content-a's card for ${slug} does not take its photograph from assets/posts`);
    assert.equal(src[1], slug,
      `content-a shows ${src[1]}'s photograph on the card for ${slug}`);
    const alt = img[0].match(/alt="([^"]*)"/)[1];
    assert.ok(alt.length > 20, `content-a has thin alt text on ${slug}: "${alt}"`);
    /* The filenames in this project have lied before, so alt text that is just
       the filename or the headline read back is the failure mode to catch. */
    assert.ok(!alt.toLowerCase().includes(slug.slice(0, 18).replace(/-/g, ' ')),
      `content-a's alt text for ${slug} is its file name, not a description of the photograph`);
  }
});

test('content-a shows the five card-built graphics whole, and crops only photographs', () => {
  /* Five of the twenty-three are not photographs: they are cards built at
     another ratio with their own type running to the edge. Cropping those into
     the 3:2 plate cuts their words in half. They are marked in the markup and
     letterboxed in CSS, and both halves have to stay in step. */
  const html = CONTENTPAGES.find(p => p.out.endsWith('content-a.html')).html;
  const whole = html.match(/cad-card__photo cad-card__photo--whole/g) || [];
  assert.equal(whole.length, 5,
    `content-a marks ${whole.length} images to be shown whole, expected 5`);
  const css = readFileSync('css/content-a.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(css, /\.cad-card__photo\{[^}]*aspect-ratio:3\/2/,
    'content-a no longer states one ratio for its card photographs, so its rows will not line up');
  assert.match(css, /\.cad-card__photo--whole\{[^}]*object-fit:contain/,
    'content-a crops the images that were built as cards, which cuts their type in half');
});

test('content-a states each type once as a band and filters within it', () => {
  const html = CONTENTPAGES.find(p => p.out.endsWith('content-a.html')).html;
  const bands = [...html.matchAll(/<section class="cad-band" data-type="([a-z]+)"/g)].map(m => m[1]);
  assert.deepEqual(bands, ['article', 'story', 'research', 'press'],
    'content-a does not carry the roadmap’s four types as four bands, in its order');
  const cards = html.match(/class="cad-card[^"]*" data-type=/g) || [];
  assert.equal(cards.length, 23, `content-a shows ${cards.length} cards, expected 23`);
});

test('content-b files every piece under one subject, newest first', () => {
  /* The whole argument of the reading: subject is the structure, so a piece
     filed twice inflates a shelf and a piece out of order makes the shelf not
     what it says it is. Five shelves in the roadmap's order, twenty-three pieces
     filed once each, each shelf newest first. */
  const html = CONTENTPAGES.find(p => p.out.endsWith('content-b.html')).html;
  const shelves = shelvesOf(html);
  assert.deepEqual(shelves.map(s => s.id),
    ['education', 'work', 'safety', 'bills', 'across'],
    'content-b’s shelves are not Empower’s three subjects, then the bills, then the reports that cover all three');

  let filed = 0;
  for (const shelf of shelves) {
    const dates = [...shelf.html.matchAll(/<time datetime="(\d{4}-\d{2}-\d{2})"/g)].map(m => m[1]);
    assert.ok(dates.length > 0, `content-b’s ${shelf.id} shelf is empty`);
    assert.deepEqual(dates, [...dates].sort().reverse(),
      `content-b’s ${shelf.id} shelf is not newest first`);
    filed += dates.length;
  }
  assert.equal(filed, 23, `content-b files ${filed} pieces across its shelves, expected 23`);

  /* The lead is a rule, not a pick: the newest piece on each of the three
     photographed subject shelves, set larger. The two plain shelves are short
     enough to read whole and get none, so three is the number. */
  const leads = html.match(/class="cwa-item cwa-item--lead"/g) || [];
  assert.equal(leads.length, 3, `content-b sets ${leads.length} pieces as a lead, expected 3`);
  for (const shelf of shelves.filter(s => ['bills', 'across'].includes(s.id))) {
    assert.ok(!shelf.html.includes('cwa-item--lead'),
      `content-b’s ${shelf.id} shelf has a lead, and it is short enough not to need one`);
  }
});

test('content-b keeps photography on the subject, never beside a headline', () => {
  /* A decision with a reason, so it is tested rather than trusted. Half of these
     pieces are about a named Mississippian, and a stock photograph next to "How
     Karl Hampton Found Freedom" reads as a photograph OF Karl Hampton. So the
     photographs sit in the shelf head, where they illustrate the subject, and
     the two shelves with no honest subject photograph (a bill, a report) carry
     none at all. */
  const html = CONTENTPAGES.find(p => p.out.endsWith('content-b.html')).html;
  const items = html.match(/<li class="cwa-item[\s\S]*?<\/li>/g) || [];
  assert.equal(items.length, 23, `expected 23 rows, found ${items.length}`);
  for (const item of items) {
    assert.ok(!item.includes('<img'),
      'content-b puts a photograph inside a row, beside a headline that may name a real person');
  }
  const photos = [...html.matchAll(/<img class="cwa-shelf__photo"[^>]*alt="([^"]*)"/g)].map(m => m[1]);
  assert.equal(photos.length, 3, `content-b’s shelf heads carry ${photos.length} photographs, expected 3`);
  for (const alt of photos) {
    assert.ok(alt.length > 20, `a shelf photograph has thin alt text: "${alt}"`);
  }
  for (const shelf of shelvesOf(html).filter(s => ['bills', 'across'].includes(s.id))) {
    assert.ok(!shelf.html.includes('<img'),
      `content-b’s ${shelf.id} shelf carries a photograph, and there is no photograph of a bill`);
  }
});

test('content-b’s four counts match what is on the page, and it states no other number', () => {
  /* Hand-written numbers that nobody checks quietly become wrong, and this build
     has been bitten by that twice. Four counts survive on this reading, and they
     are the four that stay true while the page is being filtered: ticking
     Articles does not change how many articles the page holds. A per-subject
     count would not survive that, which is why the shelf headings carry none,
     and this test holds that line as well as checking the four. */
  const html = CONTENTPAGES.find(p => p.out.endsWith('content-b.html')).html;
  const types = [...html.matchAll(/<li class="cwa-item[^"]*" data-type="([a-z]+)"/g)].map(m => m[1]);
  assert.equal(types.length, 23, `expected 23 rows, found ${types.length}`);

  for (const [id, key] of [['cw-t-article', 'article'], ['cw-t-story', 'story'],
                           ['cw-t-research', 'research'], ['cw-t-press', 'press']]) {
    const shown = Number(html.match(new RegExp(`id="${id}"[\\s\\S]*?<span class="cwa-switch__n">(\\d+)</span>`))[1]);
    const real = types.filter(t => t === key).length;
    assert.equal(shown, real, `the ${key} switch says ${shown}, the page holds ${real}`);
  }

  const counts = html.match(/class="cwa-switch__n">/g) || [];
  assert.equal(counts.length, 4, `content-b shows ${counts.length} counts, expected the four kinds and nothing else`);

  /* And no figure anywhere else in the prose: the shelf heads describe subjects,
     they do not claim sizes. Dates are the one number this page states, and they
     are inside <time>. */
  const body = html.slice(html.indexOf('<main')).replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<time[\s\S]*?<\/time>/g, '').replace(/<span class="cwa-switch__n">\d+<\/span>/g, '');
  const figures = textOf(body).match(/\d+(\.\d+)?\s?%|\$\s?\d|\b\d{1,3}(,\d{3})+\b|\b\d+ pieces\b/g) || [];
  assert.deepEqual(figures, [], `content-b states a figure outside the four counts: ${figures.join(', ')}`);
});

test('the landing template is six independent blocks', () => {
  /* The property that makes it a template rather than a page: every block is a
     section that can be deleted, reordered or repeated without taking anything
     else with it. Six sections, six section files, and no id referenced across
     a boundary except the hero's own link to the action band. */
  const html = readFileSync('dist/landing.html', 'utf8');
  const sections = html.match(/<section class="lnd-[a-z]+"/g) || [];
  assert.equal(sections.length, 6, `expected six blocks on the landing template, found ${sections.length}`);
  const files = readdirSync('src/landing/sections').sort();
  assert.deepEqual(files,
    ['01-hero.html', '02-ask.html', '03-pair.html',
     '04-voice.html', '05-act.html', '06-reading.html'],
    'the landing template’s blocks are not one file each');
});

/* Both templates, so the rules below are asked of the set rather than of one
   page. Derived from PAGES: a third template cannot quietly opt out. */
const LANDINGPAGES = PAGES
  .filter(p => p.out === 'dist/landing.html' || p.out.startsWith('dist/landing-'))
  .map(p => ({ out: p.out, html: readFileSync(p.out, 'utf8') }));

test('both landing templates build, and hold the same campaign', () => {
  assert.equal(LANDINGPAGES.length, 2, `expected two landing templates, found ${LANDINGPAGES.length}`);
  /* Identical sample content is what makes the pair a choice about structure
     rather than about copy, the same reason the two All Content readings share
     one pool of posts. The three campaign posts are the checkable part. */
  const [a, b] = LANDINGPAGES.map(p =>
    [...p.html.matchAll(/href="(https:\/\/empowerms\.org\/[^"]+)"/g)].map(m => m[1]).sort());
  assert.deepEqual(a, b,
    'the two landing templates link different campaign posts, so they cannot be compared');
});

test('the landing template B is four sections and four removable blocks', () => {
  /* Same property as A, one level down. A's unit is the section; B's rail is one
     section with two columns, so B's unit is the block inside the left column.
     Both have to survive a block being deleted, duplicated or reordered, which is
     what makes either of them a template rather than a page. */
  const html = readFileSync('dist/landing-b.html', 'utf8');
  const sections = html.match(/<section class="lnb-[a-z]+"/g) || [];
  assert.equal(sections.length, 3, `expected three sections on landing-b, found ${sections.length}`);
  const files = readdirSync('src/landing-b/sections').sort();
  assert.deepEqual(files,
    ['00-note.html', '01-hero.html', '02-rail.html', '03-outcome.html'],
    'landing-b’s sections are not one file each');

  const blocks = html.match(/<div class="lnb-block"/g) || [];
  assert.equal(blocks.length, 4,
    `expected four removable blocks in landing-b’s story column, found ${blocks.length}`);

  /* Nothing may reach across a block boundary by id. The hero's button pointing
     at the ask panel is the one crossing this page is allowed, because that link
     IS the reading. */
  const ids = [...html.slice(html.indexOf('<main')).matchAll(/href="#([a-z-]+)"/g)].map(m => m[1]);
  assert.deepEqual([...new Set(ids)], ['ask'],
    `landing-b links across its own blocks by id: ${[...new Set(ids)].join(', ')}`);
});

test('the landing template B holds its ask beside the argument, not below it', () => {
  /* The whole argument of the reading, and all three parts of it can be checked.
     One: the panel is written BEFORE the story, because on a phone there is no
     second column and markup order is what a phone reader gets. Two: it is
     placed into the second column on desktop, so the visual order is still
     story-then-panel. Three: it is sticky. Lose any one of them and this is the
     other template with a narrower column. */
  const html = readFileSync('dist/landing-b.html', 'utf8');
  const panel = html.indexOf('class="lnb-panel"');
  const story = html.indexOf('class="lnb-story"');
  assert.ok(panel > 0 && story > 0, 'landing-b has lost either its panel or its story column');
  assert.ok(panel < story,
    'landing-b writes its story before its ask, so on a phone the ask lands at the bottom of the page');

  const css = readFileSync('css/landing-b.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = css.match(/\.lnb-panel\{[^}]*\}/)[0];
  assert.match(rule, /grid-column:2/,
    'landing-b does not place its ask in the second column, so the desktop reading order is inverted');
  assert.match(rule, /position:sticky/, 'landing-b’s ask does not stay on screen, which is the reading');
  assert.match(rule, /top:1\d\dpx/,
    'landing-b’s sticky ask has no offset for the sticky site header, so the header will cover it');

  /* And it collapses before the column gets too narrow to hold a two-line
     heading and an embed. */
  assert.match(css, /@media \(max-width:1040px\)[\s\S]{0,400}\.lnb-panel\{[^}]*position:static/,
    'landing-b never releases its sticky panel, so the narrow layout keeps a cramped second column');
});

test('every landing template collects nothing and invents nothing', () => {
  /* There is no endpoint behind either page, so the campaign form is a marked
     slot rather than a drawn form — the same decision the Donate readings make
     about the processor's fields. And no statistic: a campaign's numbers are
     the first thing to go stale, and this build does not invent them. */
  for (const { out, html } of LANDINGPAGES) {
    for (const tag of ['<input', '<select', '<textarea', '<form']) {
      assert.ok(!html.slice(html.indexOf('<main')).includes(tag),
        `${out}'s body contains ${tag} — it has no endpoint and must collect nothing`);
    }
    assert.match(html, /class="ln[bd][a-z_-]*__slot" data-placeholder="form"/,
      `${out} has no marked slot for the campaign’s own form`);
    assert.match(html, /data-placeholder="quote"/,
      `${out} fills the quotation instead of holding the space for a real one`);

    /* Comments and markup out first, then look for the shapes a claimed statistic
       actually takes: a percentage, a money amount, or a number written with
       thousands separators. Bare four-digit years are not claims — the sample
       campaign is dated, and dates are the one number these pages are allowed. */
    const prose = textOf(html.slice(html.indexOf('<main')).replace(/<!--[\s\S]*?-->/g, ''));
    const figures = prose.match(/\d+(\.\d+)?\s?%|\$\s?\d|\b\d{1,3}(,\d{3})+\b/g) || [];
    assert.deepEqual(figures, [], `${out} states a figure: ${figures.join(', ')}`);
  }
});

test('the handed-off landing template has shed its review strip, and the other has not', () => {
  /* Review-only chrome, and the thing that stops a worked example being read as
     a live campaign or as approved copy. It was required on both until the
     template was handed off; Paolo called that on 2026-08-20 for dist/landing.html,
     which is the reading Kienna duplicates, so it is now required to be ABSENT
     there and still required on dist/landing-b.html, which nobody chose.

     Asserted in both directions rather than simply deleted. A test that only
     stopped checking would let the strip reappear on the handed-off template
     silently, and would stop noticing if landing-b lost the warning that its
     sample Save Our ESA copy is not approved copy. */
  const handedOff = LANDINGPAGES.find((p) => p.out === 'dist/landing.html');
  const other = LANDINGPAGES.find((p) => p.out !== 'dist/landing.html');
  assert.ok(handedOff && other, 'the two landing templates are no longer distinguishable by name');

  assert.doesNotMatch(handedOff.html, /<div class="ln[bd]-note" role="note">/,
    'dist/landing.html has its review strip back; it is deleted at hand-off and Kienna duplicates this file');
  assert.doesNotMatch(textOf(handedOff.html), /This page is a template/,
    'dist/landing.html still carries the review strip’s copy');

  assert.match(other.html, /<div class="ln[bd]-note" role="note">/, `${other.out} has lost its review strip`);
  assert.match(textOf(other.html), /This page is a template/, `${other.out}'s review strip no longer says what it is`);
});

/* ---------------------------------------------------------------------------
   THE TWO LEGAL PAGES.

   These are not About variations and they are not a design. They are two legal
   documents Empower already publishes, moved onto this build's chrome, so the
   contract below is almost entirely about TRANSCRIPTION rather than about
   composition: the words have to survive the move exactly.

   `kind: 'legal'` rather than 'about' for that reason. The About contract asks
   whether a page is one of several readings of the same brief, keeps each
   variation's stylesheet separable and registers a namespace prefix per
   reading. None of that describes a legal document, and there is only one
   reading of each. They ARE in ALLPAGES, so every hygiene sweep in this file
   still covers them.

   docs/legal/*.source.html is the captured original, fetched from
   empowerms.org on 2026-09-02, with third-party furniture stripped and nothing
   else touched. docs/legal/README.md records what was stripped and why. */
const LEGALPAGES = PAGES
  .filter(p => p.kind === 'legal')
  .map(p => ({ ...p, html: readFileSync(p.out, 'utf8') }));

/* Prose, normalised for comparison: tags out, entities in, whitespace
   collapsed. Both sides of every transcription assertion go through this, so a
   difference it reports is a difference in WORDS and never in markup. */
const proseOf = (h) => h
  .replace(/<[^>]+>/g, ' ')
  .replace(/&#8220;|&#8221;/g, '"')
  .replace(/&#8217;/g, '’')
  .replace(/&amp;/g, '&')
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

test('both legal pages are in the build', () => {
  assert.equal(LEGALPAGES.length, 2,
    `expected the privacy and terms pages, found ${LEGALPAGES.length}`);
  const outs = LEGALPAGES.map(p => p.out).sort();
  assert.deepEqual(outs, ['dist/privacy.html', 'dist/terms.html']);
});

test('every word of each legal document survives the move', () => {
  /* THE ONE TEST THAT MATTERS ON THESE PAGES. A dropped clause in a privacy
     policy is not a visual regression, and no other sweep in this file would
     see it: the hygiene tests read structure, and the About copy contracts
     name strings that were chosen for a design. So the whole document is
     compared, both directions, against the captured original.

     Both directions deliberately. Comparing only source-into-page would pass a
     page that had gained a sentence nobody at Empower wrote, which on a legal
     document is the worse of the two failures. */
  const SOURCES = {
    'dist/privacy.html': 'docs/legal/privacy-policy.source.html',
    'dist/terms.html': 'docs/legal/terms.source.html',
  };
  /* THE ONE LINE OF EITHER DOCUMENT THAT IS DELIBERATELY NOT IN THE BODY.
     The terms open on their own dateline, and this build lifts it into the page
     head where a dateline belongs — otherwise .ps-body's lede treatment, which
     sets the first paragraph larger, would land on "Last updated: 01/22/2025"
     instead of on the sentence that tells a reader what they are agreeing to.
     It is dropped from the source side here and asserted in the head by "a
     legal page states a date only when its own document states one", so it is
     still checked, just by the test that knows where it went. */
  const MOVED_TO_HEAD = 'Last updated: 01/22/2025';

  for (const page of LEGALPAGES) {
    const source = proseOf(readFileSync(SOURCES[page.out], 'utf8'))
      .replace(MOVED_TO_HEAD, '').trim();
    const body = page.html.match(/<div class="ps-body">([\s\S]*?)<\/div>\s*<\/div>/);
    assert.ok(body, `${page.out} has no .ps-body block to compare`);
    const built = proseOf(body[1]);

    /* Sentence by sentence rather than one string equality, so a failure names
       the clause that moved instead of printing two 600-word paragraphs. */
    const sentences = s => s.split(/(?<=[.!?])\s+/).map(x => x.trim()).filter(x => x.length > 12);
    for (const sentence of sentences(source)) {
      assert.ok(built.includes(sentence),
        `${page.out} is missing a sentence of the original: "${sentence.slice(0, 90)}…"`);
    }
    for (const sentence of sentences(built)) {
      assert.ok(source.includes(sentence),
        `${page.out} states something the original does not: "${sentence.slice(0, 90)}…"`);
    }
  }
});

test('the legal pages share one stylesheet and reuse the article prose sheet', () => {
  /* css/legal.css is the page frame; the reading column is .ps-body from
     css/prose.css, shared with the 490 single posts so there is one prose
     design rather than two kept in step by hand. Same call css/archive.css made
     when it took content-a's cards.

     AND NOT css/post-single.css, which is where that column lived until
     2026-09-02. That file is install-only, which is what earns it the right to
     carry Elementor selectors; a static page loading it breaks the premise the
     exemption is derived from. Asserted in both directions here, because
     linking it again would be silent. */
  for (const page of LEGALPAGES) {
    const shell = readFileSync(`src/${page.src}`, 'utf8');
    assert.match(shell, /css\/legal\.css/, `${page.src} does not link css/legal.css`);
    assert.match(shell, /css\/prose\.css/, `${page.src} does not link the shared reading column`);
    assert.ok(!shell.includes('css/post-single.css'),
      `${page.src} links css/post-single.css, which is install-only and must not be loaded by a static page`);
    assert.match(shell, /<!--@include _shared\/header-2\.html-->/,
      `${page.src} does not use the agreed build's header`);
    assert.ok(!shell.includes('megamenu'), `${page.src} still loads mega-menu code`);
  }
});

test('a legal page states a date only when its own document states one', () => {
  /* Terms carries "Last updated: 01/22/2025" in Empower's own text, so the page
     shows it, lifted out of the prose into the page head where a dateline
     belongs. The privacy policy states no date anywhere in its text. Its
     WordPress `modified` field says 2025-02-20, and that is a record of when
     somebody saved the post, not of when the policy changed; printing it as
     "Last updated" would be this build asserting something Empower has not.
     So privacy shows no date, and this test holds that open rather than
     letting a future edit quietly invent one. */
  const terms = LEGALPAGES.find(p => p.out === 'dist/terms.html');
  const privacy = LEGALPAGES.find(p => p.out === 'dist/privacy.html');

  assert.match(terms.html, /<p class="lg-date"[^>]*>Last updated: 01\/22\/2025<\/p>/,
    'the terms page has lost the date its own document states');
  assert.ok(!proseOf(terms.html.match(/<div class="ps-body">[\s\S]*?<\/div>\s*<\/div>/)[0])
    .startsWith('Last updated'),
    'the terms dateline is still inside the prose as well as in the head');

  assert.ok(!/lg-date/.test(privacy.html),
    'the privacy page has gained a dateline; its document states no date and none may be invented');
});

test('each legal page is one h1 followed by h2s, with no level skipped', () => {
  /* The privacy policy's own markup on empowerms.org opens its one section with
     an <h3> under an <h1>. That is a skipped level, and it is fixed here rather
     than transcribed: the heading LEVEL is structure, not wording, so changing
     it alters nothing Empower wrote. Recorded in docs/legal/README.md. */
  for (const page of LEGALPAGES) {
    const levels = [...page.html.matchAll(/<h([1-6])[^>]*>/g)]
      .map(m => Number(m[1]));
    const inMain = page.html.slice(page.html.indexOf('<main'), page.html.indexOf('</main>'));
    const mainLevels = [...inMain.matchAll(/<h([1-6])[^>]*>/g)].map(m => Number(m[1]));
    assert.equal(mainLevels.filter(l => l === 1).length, 1, `${page.out} does not have exactly one h1`);
    assert.equal(mainLevels[0], 1, `${page.out} does not open with its h1`);
    for (let i = 1; i < mainLevels.length; i += 1) {
      assert.ok(mainLevels[i] <= mainLevels[i - 1] + 1,
        `${page.out} skips from h${mainLevels[i - 1]} to h${mainLevels[i]}`);
    }
    assert.ok(levels.length > 0);
  }
});

test('the footer links both legal pages, and the combined label is gone', () => {
  /* The footer carried ONE link labelled "Privacy Policy & Terms of Service"
     pointing at /privacy, which is the privacy document alone. The label
     promised two documents and delivered one. Paolo chose two pages on
     2026-09-02, so the label is now two links that each land on the document
     they name.

     Asserted on the shared partial rather than on a built page, because the
     footer is a site-wide theme part: every page gets this or none does. */
  const footer = readFileSync('src/_shared/footer.html', 'utf8');
  assert.match(footer, /<a href="\/privacy">Privacy Policy<\/a>/,
    'the footer has no privacy link');
  assert.match(footer, /<a href="\/terms">Terms of Service<\/a>/,
    'the footer has no terms link');
  assert.ok(!footer.includes('Privacy Policy &amp; Terms of Service'),
    'the footer still carries the combined label, which named two documents and linked one');
});

test('the legal prose is held to the same measure as an article', () => {
  /* The measure is declared twice on purpose and the two must not drift.

     css/prose.css declares it at one class, which is all a static page needs.
     The theme's bridge stylesheet declares it again at the specificity
     Elementor forces, because converted the class lands on a widget wrapper
     that Elementor gives max-width:100% at four classes. Same number both
     times, two different renderings of the same document.

     THIS PAIR REPLACED A WORSE ONE ON 2026-09-02. The measure used to live in
     css/post-single.css in the Elementor-shaped form alone, and the legal pages
     re-declared it in css/legal.css because that selector matches nothing on a
     static page. Both files have since stopped carrying it: the column is
     shared now, and post-single.css keeps only the furniture around it. If this
     test starts reading either of those files again, the split has been undone.

     It pins the NUMBER in both places rather than the presence of a rule in
     either, because the failure it exists to catch is silent: every stylesheet
     loads, every rule parses, and the head and the prose simply sit at
     different widths. */
  const prose = readFileSync('css/prose.css', 'utf8');
  const bridge = readFileSync('wp/empowerms-child/css/bridge.css', 'utf8');
  const legal = readFileSync('css/legal.css', 'utf8');

  const staticMeasure = prose.match(/^\.ps-body\{max-width:min\(100%,(\d+)px\)/m);
  assert.ok(staticMeasure, 'css/prose.css no longer gives the static page a reading measure');

  const convertedMeasure = bridge.match(/\.elementor-widget\.ps-body\{max-width:min\(100%,(\d+)px\)/);
  assert.ok(convertedMeasure, 'the bridge sheet no longer carries the converted measure');

  assert.equal(convertedMeasure[1], staticMeasure[1],
    `the converted measure (${convertedMeasure[1]}px) has drifted from the static one (${staticMeasure[1]}px)`);

  /* The head is held to the same number, or the title sits over the middle of
     nothing instead of over the first word of the text. */
  assert.ok(legal.includes(`.lg-head{max-width:min(100%,${staticMeasure[1]}px)`),
    'the legal page head is no longer on the same measure as its prose');

  /* And the split itself: neither page-specific sheet may take the column back. */
  assert.ok(!/\.ps-body\s*\{/.test(legal),
    'css/legal.css has started declaring prose rules again; the column lives in css/prose.css');
  const article = readFileSync('css/post-single.css', 'utf8');
  assert.ok(!/^\.ps-body[\s,{]/m.test(article),
    'css/post-single.css has taken the reading column back; it is shared with the legal pages');
});

/* ---------------------------------------------------------------------------
   THE CONTACT PAGE.

   Every other form-shaped page in this build is markup wired to nothing, and
   that is safe because none of them replaces a working route. Contact does:
   /contact is linked from the footer of all fourteen converted pages, and the
   page it points at runs Gravity Form 3, which holds 3,116 entries with the
   most recent on 2026-07-28, notifies the site admin and shows its own
   confirmation. elementor/redirects.mjs states the hazard in its own words
   about the ambassador form: pointing a live signup at a form-shaped design
   "would end ambassador signups and report success while doing it".

   So the CONVERTED page carries the real Gravity Forms shortcode, and the
   STATIC build carries a stand-in, because a static page cannot run Gravity
   Forms. The assertions below exist to keep those two honest about each other:
   the stand-in must mirror the real form field for field, and must be marked
   so nobody mistakes it for something that collects anything. */
const CONTACT = () => readFileSync('dist/contact.html', 'utf8');

test('the contact page is in the build', () => {
  const page = PAGES.find(p => p.out === 'dist/contact.html');
  assert.ok(page, 'dist/contact.html is not in the manifest');
  assert.ok(existsSync('dist/contact.html'), 'dist/contact.html was not built');
  assert.ok(existsSync('css/contact.css'), 'css/contact.css does not exist');
});

test('the contact stand-in mirrors Gravity Form 3 field for field', () => {
  /* Read off the install on 2026-09-02, from wp_gf_form_meta for form_id 3:
     four fields, all required, the name split into First and Last with the
     prefix/middle/suffix inputs hidden, the message capped at 1000 characters,
     and the submit reading "Send". A stand-in that promises different fields
     from the form it stands in for is worse than no stand-in: it teaches a
     reviewer the wrong page. */
  const html = CONTACT();
  const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));

  for (const label of ['First', 'Last', 'Email', 'Phone', 'Message']) {
    assert.ok(new RegExp(`>${label}\\b`).test(main), `the stand-in has no ${label} field`);
  }
  assert.match(main, /<textarea[^>]*maxlength="1000"/,
    'the message field does not carry Gravity Forms’ own 1000-character cap');
  assert.match(main, /type="submit"[^>]*>Send<|>Send<\/button>/,
    'the submit does not read “Send”, which is what the live form says');

  /* Every one of the four is required on the live form, so every one is
     required here. Five inputs, because Name is two.

     COUNTED ON THE TAGS, NOT IN THE PROSE. The first version of this matched
     `\srequired\b` anywhere in <main> and read six, because the section's own
     comment says "their required flags". A count that includes the commentary
     about the thing it counts is not a count. */
  const required = (main.match(/<(?:input|textarea)\b[^>]*\srequired[\s>]/g) || []).length;
  assert.equal(required, 5,
    `${required} required fields in the stand-in; Gravity Form 3 requires all four, which is five inputs`);
});

test('the contact form is marked as a stand-in and collects nothing', () => {
  /* The same discipline the bio page uses for contact rows it has no data for:
     a machine-readable mark AND a sentence a human reading the page can see.
     Without both, a form-shaped design in a review reads as a working form. */
  const html = CONTACT();
  assert.match(html, /data-placeholder="form"/, 'the stand-in carries no placeholder mark');
  assert.match(html, /the live Gravity Form/i,
    'nothing on the page tells a reader the form is a stand-in for the live one');
  assert.ok(!/action="(https?:)?\/\//.test(html),
    'the stand-in posts somewhere; it must collect nothing');
});

test('the contact page carries the signed-off address and not the old one', () => {
  /* Two addresses were in circulation on 2026-09-02: the old Contact page said
     1000 Northpark Dr., and the footer this build shipped on all fourteen live
     pages says 741 Avignon Dr., Suite C. Paolo chose the footer's, so the page
     and the footer agree rather than contradicting each other in the same
     scroll. Asserted in both directions: the old address must not come back. */
  const html = CONTACT();
  assert.match(html, /741 Avignon Dr\., Suite C/, 'the contact page has lost the signed-off address');
  assert.match(html, /Ridgeland, MS 39157/, 'the contact page has lost the town and postcode');
  assert.ok(!html.includes('Northpark'),
    'the old 1000 Northpark address is back; the footer on this same page says otherwise');
});

test('the contact page invents no second contact route', () => {
  /* The old page offers a form and nothing else. Paolo's call on 2026-09-02 was
     to match it rather than publish an email address here, because three are in
     circulation (info@empowerms.org in the header strip and footer,
     Mail@empowerms.org twice in the privacy policy) and which is correct is an
     open question in docs/legal/README.md. The header and footer still carry
     theirs; what this asserts is that the PAGE does not add a fourth voice. */
  const html = CONTACT();
  const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
  assert.ok(!main.includes('mailto:'),
    'the contact page body publishes an email address; the old page published none');
  assert.ok(!/\btelephone\b|\bCall us\b/i.test(main),
    'the contact page offers a phone route the old page did not');
});

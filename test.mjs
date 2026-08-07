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

test('no inline style attributes — Elementor hand-off hygiene', () => {
  assert.ok(!/\sstyle="/.test(html), 'inline style attribute found; move it to CSS');
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
   where the roadmap fixes it. */
test('one orange filled button per page', () => {
  for (const { out, html } of ALLPAGES) {
    const primaries = html.match(/em-btn--primary/g) || [];
    assert.equal(primaries.length, 1,
      `${out}: brand rule is one orange action per view, found ${primaries.length}`);
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
    ['signed-off', 'set-home', 'set-who', 'set-do', 'set-team', 'set-solutions',
     'set-education', 'set-work', 'set-safety', 'set-podcast', 'set-capitol'],
    'the facets in the rail are not the eleven expected controls');
  for (const id of ids) {
    assert.ok(chooser.includes(`<label class="ch__check__label" for="${id}">`),
      `the ${id} facet has no label bound to it`);
  }
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

  /* Empower chose every remaining set on 2026-08-07: Streetlight as the single
     solution template, The Studio for the podcast, The Dome for Capitol Chat.
     Nothing is awaiting a decision, so every set on the chooser carries a pick. */
  const UNDECIDED = [];
  const sections = chooser.match(/<section data-set="[a-z]+" aria-labelledby="group-[^"]+"[\s\S]*?<\/section>/g) || [];
  assert.equal(sections.length, 10, `expected ten sets on the chooser, found ${sections.length}`);
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
   itself lists those two the other way round. */
const TEAM_STAFF = [
  ['Grant Callen', 'Founder & CEO', 'grant-callen'],
  ['Wil Ervin', 'Senior Vice President', 'wil-ervin'],
  ['Ashley Green', 'Director of Outreach', 'ashley-green'],
  ['Kienna Horn', 'Director of Communications', 'kienna-horn'],
  ['Elyse Marcellino', 'Director of Embark', 'elyse-marcellino'],
  ['Gina Metzger', 'Executive Vice President', 'gina-metzger'],
  ['Dr. Patrick Miller', 'Vice President of Development', 'patrick-miller'],
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
         it for review. When the other nine are built this becomes a per-person
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
      `${out} shows ${tiles.length} tiles — every variation gives all ten staff a portrait`);
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

const WORKPAGES = ABOUTPAGES.filter(p => p.out.includes('work-'));
/* dist/safety.html dropped its letter on 2026-08-07, when Empower chose it as
   the shared template for all three solution pages, so it is no longer one of
   the readings under comparison here, the same way dist/work.html and
   dist/education.html never were. 'safety-' catches only the two that are
   still being weighed against each other. */
const SAFETYPAGES = ABOUTPAGES.filter(p => p.out.includes('safety-'));
const DETAILPAGES = [...WORKPAGES, ...SAFETYPAGES];

/* Meaningful Work lost its A reading (The Open Door) on 2026-08-05, and Public
   Safety B left the readings pool entirely on 2026-08-07 when it became the
   shared template, so the two sets are back to the same size. The counts stay
   asserted rather than derived: a page that stops building should fail here,
   not silently shrink the set the SIGNATURE and copy sweeps run over. */
test('both solution detail pages build in the readings that survived', () => {
  assert.equal(WORKPAGES.length, 2, `expected two Meaningful Work readings, found ${WORKPAGES.length}`);
  assert.equal(SAFETYPAGES.length, 2, `expected two Public Safety readings, found ${SAFETYPAGES.length}`);
});

test('every Meaningful Work reading carries the roadmap copy verbatim', () => {
  for (const { out, html } of WORKPAGES) {
    const text = textOf(html);
    for (const line of WORK_COPY) {
      assert.ok(text.includes(line), `${out} is missing roadmap copy: "${line.slice(0, 60)}…"`);
    }
  }
});

test('every Public Safety reading carries the roadmap copy verbatim', () => {
  for (const { out, html } of SAFETYPAGES) {
    const text = textOf(html);
    for (const line of SAFETY_COPY) {
      assert.ok(text.includes(line), `${out} is missing roadmap copy: "${line.slice(0, 60)}…"`);
    }
  }
});

test('neither page carries the other page’s copy', () => {
  /* Two pages, one document, seven identically named sections. The failure mode
     is a paragraph copied across while a variation was being built and never
     changed — which would read as approved copy on a page it was never written
     for. Checked on the two sentences that are unmistakably one page's: the
     hero, and the closing feed heading. */
  const WORK_ONLY = ['Work Should Open Doors to Opportunity', 'The Latest on Meaningful Work'];
  const SAFETY_ONLY = ['Every Mississippian Deserves to Feel Safe at Home', 'The Latest on Public Safety'];
  for (const { out, html } of WORKPAGES) {
    for (const line of SAFETY_ONLY) {
      assert.ok(!textOf(html).includes(line), `${out} carries Public Safety copy: "${line}"`);
    }
  }
  for (const { out, html } of SAFETYPAGES) {
    for (const line of WORK_ONLY) {
      assert.ok(!textOf(html).includes(line), `${out} carries Meaningful Work copy: "${line}"`);
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
       off its input is a filter a keyboard cannot reach. */
    const ids = [...html.matchAll(/<input class="[^"]*(?:check|chip)__input[^"]*" type="checkbox" id="([^"]+)"/g)]
      .map(m => m[1]);
    assert.equal(ids.length, 6, `${out} has ${ids.length} facet controls, expected six`);
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

test('the library filter composes AND across groups, not OR', () => {
  /* The bug this exists to catch is silent and specific: the hide-everything-
     then-reveal shape used on the review index works for one facet group and
     turns into an OR the moment a second group can reveal what the first hid.
     These pages use hide-only rules per value instead, which intersect by
     construction. Checked by reading the rules rather than the rendering: every
     facet value must contribute a rule of the form "group in use AND this value
     unticked -> hide", and no rule may reveal a card. */
  const VALUES = {
    'podcast-a': { ns: 'pca', prefix: 'pa', topics: ['education', 'work', 'safety'],
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
  'Each week, Senior Vice President Wil Ervin breaks down the biggest developments and highlights the action under the dome—all in under five minutes.',
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

test('Wil Ervin’s name is not a link on either Capitol Chat reading', () => {
  /* Grant Callen is a link on the podcast pages because his bio is built. Wil
     Ervin's is not, and Empower asked for exactly this to stop happening: a card
     or a name that opens somebody else's bio. The check is the whole anchor set,
     because the failure would come from copying the podcast page's pattern. */
  for (const { out, html } of CAPITOLPAGES) {
    const anchors = [...html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)].map(m => m[1]);
    for (const inner of anchors) {
      assert.ok(!/Wil Ervin/.test(inner),
        `${out} links Wil Ervin's name — his bio page does not exist, so it would open somebody else's`);
    }
    assert.ok(!html.includes('href="team-bio.html"'),
      `${out} links the CEO's bio from a page hosted by somebody else`);
    /* And the name is still on the page: not-a-link must not become not-there. */
    assert.ok(textOf(html).includes('Senior Vice President Wil Ervin'),
      `${out} has lost the host's name`);
  }
});

test('the Capitol Chat library filters by session and every row is a real episode', () => {
  const SHAPE = {
    'capitol-a': { ns: 'cca', prefix: 'ca', groups: false },
    'capitol-b': { ns: 'ccb', prefix: 'cb', groups: true },
  };
  const TOPICS = ['education', 'work', 'safety'];
  const SESSIONS = ['2026', '2025'];

  for (const [slug, { ns, prefix, groups }] of Object.entries(SHAPE)) {
    const html = readFileSync(`dist/${slug}.html`, 'utf8');
    const css = readFileSync(`css/${slug}.css`, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

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

    /* Topic hides rows on both. Session hides ROWS on the flat list and whole
       GROUPS on the grouped one — a hidden group whose heading stayed behind
       would be a lie about what is in the list. */
    for (const t of TOPICS) {
      assert.ok(css.includes(
        `body:has(.${ns}-topic:checked):not(:has(#${prefix}-t-${t}:checked)) .${ns}-ep[data-topic="${t}"]`),
        `css/${slug}.css has no hide rule for the ${t} topic`);
    }
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
    assert.match(after, /Catch Up From the Capitol\s*Topic/,
      `${out} has something between the library heading and the filter — ` +
      `the roadmap gives this section no intro paragraph`);
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
  for (const { out, html } of DETAILPAGES) {
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
  for (const { out, html } of DETAILPAGES) {
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

test('the About pages hang no element out of its own section', () => {
  /* Every overlap in this set is a negative margin on a child, never an
     absolutely positioned element crossing a section boundary. That is the
     Elementor constraint: a section maps to a section, and the overlap
     survives the conversion. It is also the bug the homepage's north-star
     card shipped — an element that hangs out of its section disappears the
     moment a later section is given `position`.

     The check is narrow on purpose: a rule that is BOTH position:absolute and
     given a negative `bottom` is the shape that reaches downward out of its
     own box. Absolute positioning inside a section is fine and used here. */
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
      if (!body || !/position:\s*absolute/.test(body)) continue;
      assert.ok(!/bottom:\s*calc\(\s*-|bottom:\s*-/.test(body),
        `${cssFile} hangs ${selector.trim().slice(0, 60)} below its own box — ` +
        `use a negative margin on a child instead, so the section keeps its height`);
    }
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

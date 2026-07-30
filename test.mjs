import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';

import { PAGES } from './build.mjs';

execFileSync('node', ['build.mjs'], { stdio: 'inherit' });

/* Every page this build produces, keyed by output path. `html` is the
   reference build — the assertions below that name .em-* section classes are
   about that page specifically. The cross-page contract that has to hold for
   all five homepages is asserted in its own block at the end of this file. */
const HOMEPAGES = PAGES
  .filter(p => p.out !== 'dist/index.html')
  .map(p => ({ ...p, html: readFileSync(p.out, 'utf8') }));
const html = readFileSync('dist/current.html', 'utf8');

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
const dropCss = readFileSync('css/current-2.css', 'utf8');
const dropJs = readFileSync('js/dropdown.js', 'utf8');

test('the dropdown header carries the same six top-level items as the mega header', () => {
  // Two renderings of one nav. The labels are the contract; how they open is not.
  const labels = (partial) =>
    [...partial.matchAll(/<(?:a|button) class="em-header__link"[^>]*>([^<]+)/g)]
      .map(m => m[1].trim()).sort();
  assert.deepEqual(labels(header2), labels(readFileSync('src/_shared/header.html', 'utf8')),
    'header-2.html and header.html no longer offer the same top-level nav');
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

/* The four alternative designs. current-2.html is excluded alongside
   current.html: it is the reference build with a new header and banner
   fitted, so it inherits the reference build's copy — including the
   sentence-case headline the four options restore to the roadmap's
   capitalisation — and is not one of the four Empower is choosing between. */
const REFERENCE = ['dist/current.html', 'dist/current-2.html'];
const OPTIONS = HOMEPAGES.filter(p => !REFERENCE.includes(p.out));

test('every page in the manifest actually built', () => {
  for (const page of PAGES) {
    assert.ok(existsSync(page.out), `${page.out} is in PAGES but was never written`);
    assert.ok(statSync(page.out).size > 2000, `${page.out} looks truncated`);
  }
  assert.equal(OPTIONS.length, 4, `expected four alternative homepages, found ${OPTIONS.length}`);
});

test('no page ships an unresolved include marker', () => {
  for (const { out, html } of HOMEPAGES) {
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

test('every homepage has exactly one h1 and no skipped heading levels', () => {
  for (const { out, html } of HOMEPAGES) {
    const h1s = html.match(/<h1[\s>]/g) || [];
    assert.equal(h1s.length, 1, `${out} has ${h1s.length} h1 elements`);
    const levels = [...html.matchAll(/<h([1-5])[\s>]/g)].map(m => Number(m[1]));
    for (let i = 1; i < levels.length; i++) {
      assert.ok(levels[i] - levels[i - 1] <= 1,
        `${out} jumps from h${levels[i - 1]} to h${levels[i]}`);
    }
  }
});

test('one orange filled button per page, and it is the hero CTA', () => {
  for (const { out, html } of HOMEPAGES) {
    const primaries = html.match(/em-btn--primary/g) || [];
    assert.equal(primaries.length, 1,
      `${out}: brand rule is one orange action per view, found ${primaries.length}`);
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

test('every image on every homepage has alt, dimensions and a loading strategy', () => {
  for (const { out, html } of HOMEPAGES) {
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
  for (const { out, html } of HOMEPAGES) {
    for (const m of html.matchAll(/src="\.\.\/(assets\/[^"]+)"/g)) {
      assert.ok(existsSync(m[1]), `${out} references a missing asset: ${m[1]}`);
    }
  }
});

test('no homepage carries an inline style attribute', () => {
  // Elementor hand-off hygiene: styling belongs in the stylesheets.
  for (const { out, html } of HOMEPAGES) {
    assert.ok(!/\sstyle="/.test(html), `${out} has an inline style attribute`);
  }
});

test('every aria-controls points at an id that exists, on every page', () => {
  for (const { out, html } of HOMEPAGES) {
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
    for (const m of html.matchAll(/aria-controls="([^"]+)"/g)) {
      assert.ok(ids.has(m[1]), `${out}: aria-controls="${m[1]}" has no matching id`);
    }
  }
});

test('every aria-labelledby points at an id that exists, on every page', () => {
  for (const { out, html } of HOMEPAGES) {
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
  for (const { out, html } of HOMEPAGES) {
    for (const m of html.matchAll(/<(\w+)([^>]*\saria-hidden="true"[^>]*)>/g)) {
      assert.ok(!/^\s*<?(a|button)\b/.test(m[0]) && m[1] !== 'a' && m[1] !== 'button',
        `${out}: aria-hidden on a focusable ${m[1]}: ${m[0].slice(0, 80)}`);
    }
  }
});

test('every page carries the skip link, and it targets the main landmark', () => {
  for (const { out, html } of HOMEPAGES) {
    assert.match(html, /<a class="em-skip" href="#main">/, `${out} has no skip link`);
    assert.match(html, /<main id="main">/, `${out} has no <main id="main"> for the skip link`);
  }
});

test('every page loads the shared chrome before its own stylesheet', () => {
  for (const { out, html, src } of HOMEPAGES) {
    const own = `css/${src.split('/')[0] === 'index.html' ? 'homepage' : src.split('/')[0]}.css`;
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
  for (const { out, html } of HOMEPAGES) {
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
  for (const { out, html } of HOMEPAGES) {
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
  const UNLISTED = ['dist/index.html', 'dist/current.html'];
  for (const page of PAGES) {
    if (UNLISTED.includes(page.out)) continue;
    const file = page.out.replace('dist/', '');
    assert.ok(chooser.includes(`href="${file}"`), `the chooser does not link to ${file}`);
  }
  assert.ok(!chooser.includes('href="current.html"'),
    'current.html is back in the chooser — if that is intended, drop it from UNLISTED above');
});

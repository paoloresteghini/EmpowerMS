import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';

execFileSync('node', ['build.mjs'], { stdio: 'inherit' });
const html = readFileSync('dist/index.html', 'utf8');

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

test('shell declares default skin and variant state', () => {
  assert.match(html, /<html lang="en"[^>]*data-skin="brand"/);
  assert.match(html, /data-annotations="off"/);
  assert.match(html, /data-foundations="bento"/);
  assert.match(html, /data-stories="feature"/);
});

test('shell links stylesheets in cascade order', () => {
  const order = ['tokens/fonts.css', 'tokens/colors.css', 'tokens/base.css',
                 'components/components.css', 'css/homepage.css', 'css/wireframe.css'];
  let cursor = -1;
  for (const href of order) {
    const at = html.indexOf(href);
    assert.ok(at > cursor, `${href} out of cascade order`);
    cursor = at;
  }
});

test('control bar exists in the shell only', () => {
  assert.match(html, /id="controls"/);
  const partial = readFileSync('src/sections/00-header.html', 'utf8');
  assert.ok(!partial.includes('id="controls"'), 'control bar leaked into a partial');
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

test('both foundations layouts ship in the markup', () => {
  assert.match(html, /class="em-bento"/);
  assert.match(html, /class="em-equal"/);
});

test('foundations names all three pillars in both layouts', () => {
  for (const pillar of ['Quality Education', 'Meaningful Work', 'Public Safety']) {
    const hits = html.split(pillar).length - 1;
    assert.ok(hits >= 2, `${pillar} should appear in both layouts, found ${hits}`);
  }
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

test('both stories layouts ship in the markup', () => {
  assert.match(html, /class="em-stories__feature"/);
  assert.match(html, /class="em-stories__carousel"/);
});

test('stories attributes Jodi Berry with city', () => {
  assert.match(html, /Jodi Berry/);
  assert.match(html, /Sumrall, MS/);
});

test('carousel controls are inert and marked as such', () => {
  assert.match(html, /class="em-stories__nav"[^>]*disabled/);
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

test('join us actions are navy, not orange', () => {
  const s = readFileSync('src/sections/06-joinus.html', 'utf8');
  assert.ok(!s.includes('em-btn--primary'), 'orange button outside the hero');
  assert.ok(s.includes('em-btn--secondary'), 'expected navy actions in join us');
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

test('footer newsletter input is labelled', () => {
  assert.match(html, /<label[^>]*for="footer-email"/);
});

const wire = readFileSync('css/wireframe.css', 'utf8');

// Both tests below split wire on '}' and treat each chunk as one rule. That
// only works because wireframe.css is flat, single-level CSS today — it has
// no @media block. If a future edit wraps any wireframe.css rule in
// @media(...){ ... }, the extra '}' at the end of the media block will chop
// the split in a way that desyncs selector/body pairing for the rest of the
// file. Anyone adding an @media block here needs to rewrite this parsing,
// not just add a rule.
test('wire skin scopes every rule under data-skin="wire"', () => {
  const selectors = wire
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('}')
    .map(b => b.split('{')[0].trim())
    .filter(Boolean);
  for (const sel of selectors) {
    assert.ok(sel.includes('[data-skin="wire"]'), `unscoped wireframe rule: ${sel}`);
  }
});

test('wire skin keeps the focus ring orange', () => {
  assert.match(wire, /--focus-ring:\s*#E65A28/i);
});

// Rules exempted from the geometry ban below, by exact selector, with why:
//  - .em-footer — the documented rounded inset panel; a real, intentional
//    geometry difference between skins (README "The wireframe skin's
//    contract").
//  - .em-header__logo::after / .em-footer__logo::after — each sets
//    position:absolute;inset:0. That anchors the LOGO placeholder overlay to
//    an already-sized ancestor: the real <img> is visibility:hidden (not
//    display:none), so it still occupies the box and fixes its size: the
//    overlay only fills that existing box and cannot move it. Listed
//    individually, not matched by a substring check, so grouping either
//    selector into an unrelated rule can't smuggle that rule past the test.
const GEOMETRY_EXEMPT_SELECTORS = new Set([
  '[data-skin="wire"] .em-footer',
  '[data-skin="wire"] .em-header__logo::after',
  '[data-skin="wire"] .em-footer__logo::after',
]);

test('wire skin does not touch layout geometry', () => {
  const banned = /(^|[;{\s])(width|height|padding|margin|gap|grid|flex|inset|top|right|bottom|left|border-width|min-|max-|aspect-ratio|transform|translate|scale)[-a-z]*\s*:/;
  const blocks = wire.replace(/\/\*[\s\S]*?\*\//g, '').split('}');
  for (const b of blocks) {
    const body = b.split('{')[1];
    if (!body) continue;
    const selectors = b.split('{')[0].split(',').map(s => s.trim()).filter(Boolean);
    if (selectors.length && selectors.every(s => GEOMETRY_EXEMPT_SELECTORS.has(s))) continue;
    assert.ok(!banned.test(body), `geometry in wireframe.css: ${b.trim().slice(0, 80)}`);
  }
});

const homepage = readFileSync('css/homepage.css', 'utf8');

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
  for (const bp of ['1200px', '1150px', '960px', '900px', '600px', '400px']) {
    assert.ok(homepage.includes(`max-width:${bp}`), `no breakpoint at ${bp}`);
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
  const at = homepage.indexOf('max-width:960px');
  assert.ok(at > -1, 'no 960px breakpoint for the header nav');
  assert.match(homepage.slice(at), /em-header__nav\{[^}]*display:none/);

  const at600 = homepage.indexOf('max-width:600px');
  const end600 = homepage.indexOf('\n}', at600);
  assert.ok(at600 > -1 && end600 > -1);
  assert.ok(!/em-header__nav\{/.test(homepage.slice(at600, end600)),
    'header nav hide rule duplicated in the 600px block');
});

test('header bar tightens its gaps before the 320px floor can overflow', () => {
  // .em-header__bar's non-wrapping, non-shrinking children (logo + gap +
  // actions, with .em-header__nav already hidden by the 960px rule) need
  // 299.5px but only 272px is available inside a 320px viewport —
  // measured, not assumed. A max-width:400px rule tightens both the bar
  // gap and the actions gap to buy back the missing width without
  // shrinking the logo or the Donate button itself.
  const at = homepage.indexOf('max-width:400px');
  assert.ok(at > -1, 'no 400px breakpoint for the small header bar fix');
  const block = homepage.slice(at, homepage.indexOf('}', homepage.indexOf('}', at) + 1) + 1);
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
  const partial = readFileSync('src/sections/00-header.html', 'utf8');
  assert.match(partial, /<nav class="em-mobilenav" id="mobile-nav" aria-label="Mobile">/);
  assert.match(partial, /Who We Are/, 'sub-item copy missing from the static partial');

  for (const jsFile of ['js/nav.js', 'js/controls.js']) {
    if (!existsSync(jsFile)) continue;
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

test('both foundations layouts reveal, so the variant switcher never breaks', () => {
  assert.match(html, /<div class="em-bento" data-reveal-group>/);
  assert.match(html, /<div class="em-equal" data-reveal-group>/);
  // Attribute-order-independent: loading/width/height were added to every
  // <img> later, so an assertion anchored on data-reveal being the LAST
  // attribute would fail on a change that has nothing to do with reveals.
  assert.match(html, /<img class="em-bento__media"[^>]*data-reveal="clip"[^>]*>/,
    'bento feature photo does not use the clip reveal');
  const cards = html.match(/<article class="em-solution"[^>]*data-reveal="rise">/g) || [];
  assert.equal(cards.length, 5, `expected 2 bento + 3 equal cards revealing, found ${cards.length}`);
});

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
  assert.match(homepage, /--em-orange-ink:#BA4920/);
  const at = homepage.lastIndexOf('--em-orange-ink)');
  assert.ok(at > -1, 'the ink token is defined but never used');
  for (const sel of ['.em-eyebrow', '.em-article__more', '.em-solution__more', '.em-podcast__show']) {
    const re = new RegExp(`\\${sel}[,{][\\s\\S]{0,400}?var\\(--em-orange-ink\\)`);
    assert.match(homepage, re, `${sel} still resolves to the failing brand orange`);
  }
});

test('standalone links meet the 24px minimum target size', () => {
  // SC 2.5.8. These are card and list links, not links inside a sentence,
  // so the inline exception does not apply. The footer "X" link measured
  // 8x22 before this.
  const at = homepage.indexOf('.em-footer__links a{');
  assert.ok(at > -1, 'no target-size rule for footer links');
  const rule = homepage.slice(at, homepage.indexOf('}', at));
  assert.match(rule, /min-height:24px/);
  assert.match(rule, /min-width:24px/);
});

test('the display scale is fluid, not fixed rem', () => {
  // Fixed rem display steps were the direct cause of a horizontal-scroll
  // failure at 200% text zoom (SC 1.4.4).
  for (const token of ['--fs-hero', '--fs-h1', '--fs-h2']) {
    const re = new RegExp(`${token}:clamp\\(`);
    assert.match(homepage, re, `${token} is not fluid`);
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

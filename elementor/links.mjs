/* Rewrites every internal link in a finished element tree from the static
   build's routes to the converted pages on this install.

   WHY THIS EXISTS. The static build was authored against a route scheme that
   does not exist on empv2. Measured on the install 2026-08-19: /latest,
   /all-content, /ambassadors, /community-stories, /research, /meaningful-work
   and /quality-education all 404, while /solutions, /donate, /join, /contact,
   /privacy, /podcast, /what-we-do and /public-safety 301 to Empower's EXISTING
   live pages rather than to the converted ones. A reviewer clicking through the
   converted set therefore left it, or hit nothing, on the first click. Paolo
   took the decision on 2026-08-20: point at the converted set.

   WHY A LABEL IS PART OF THE KEY, AND NOT AN EMBELLISHMENT. src/_shared/header-2.html
   uses PLACEHOLDER hrefs. `/latest` stands in for seven different destinations
   (Articles, Community Stories, Press Releases, Research, Research (EPIC), The
   Empower Podcast, Capitol Chat), `/join` for two (Newsletter, Ambassador
   Program), `/solutions` for two (Our Solutions, What We Do) and `/` for two
   (Home, Who We Are). An href-keyed rewrite would send all seven of those to one
   page and quietly destroy the mega menu, which is the single most visible piece
   of navigation in the build. The LABELS, by contrast, are unique and are
   already the converted pages' own names, so the label is the reliable key
   exactly where the href is not. Note in particular that "Research (EPIC)" (in
   the Our Solutions menu) and "Research" (in the All Content menu) are different
   destinations sharing one placeholder href; that pair is why this is
   label-aware rather than a lookup table.

   WHY IT RUNS AT deployElements() RATHER THAN IN THE PAGE MODULES. Three
   different producers put links into the tree: the 17 page modules, the header
   and footer (whose markup is extracted VERBATIM out of the frozen
   src/_shared/*.html by elementor/theme-parts/extract.mjs and so cannot be
   edited at source), and the content-a loop item. All three converge on
   deployElements(), which is the one place that sees every tree on its way to
   the install. Rewriting there means no page module changes, no second copy of
   the route scheme, and no possibility of a page being converted later that
   quietly misses the remap.

   WHY THE TARGETS ARE DERIVED. Two hand-maintained lists have already shipped
   wrong in this repository. The slug of every converted page is read here out of
   PAGE_REGISTER/EXCLUDED_PAGES' own exampleUrl, which is the same field the
   fidelity gate uses to find the page, so a slug that changes on the install
   cannot silently diverge from the slug this file links to. `work` is the case
   that makes the point: its slug is `work-2`, not `work`, and nothing here
   spells that out. */

import { PAGE_REGISTER, EXCLUDED_PAGES } from './pages/register.mjs';

/* The install path of every converted page, keyed by the register's own page
   name. Built from exampleUrl rather than from the name, because the two differ
   (`work` lives at /work-2/) and the register is where that fact is already
   recorded and already tested. */
export function convertedPagePaths() {
  const paths = new Map();
  for (const page of [...PAGE_REGISTER, ...EXCLUDED_PAGES]) {
    if (!page.exampleUrl) continue;
    paths.set(page.name, new URL(page.exampleUrl).pathname);
  }
  return paths;
}

/* Destinations that are a converted page, written as the page's register name
   plus an optional fragment, never as a literal path. `content-a` carries four
   band ids (dist/content-a.html: band-article, band-story, band-research,
   band-press) and the four All Content menu items land on them, which is what
   lets one converted page serve four distinct nav destinations honestly. */
const PAGE = (name, fragment = '') => ({ name, fragment });

/* Static href -> destination, for links whose href is already unambiguous.
   Query strings are PRESERVED by the rewriter and deliberately absent here:
   give-c's tiles populate the donation form by URL (?gift_type=, &amount=), and
   dropping those would turn seven working tiles into seven identical ones. */
const BY_HREF = new Map(Object.entries({
  '/': PAGE('final'),
  '/what-we-do': PAGE('what-we-do-a'),
  '/solutions': PAGE('solutions-b'),
  '/solutions/education': PAGE('education'),
  '/solutions/work': PAGE('work'),
  '/solutions/safety': PAGE('safety'),
  '/quality-education': PAGE('education'),
  '/meaningful-work': PAGE('work'),
  '/public-safety': PAGE('safety'),
  '/ambassadors': PAGE('amb-a'),
  '/donate': PAGE('give-c'),
  '/donate/': PAGE('give-c'),
  '/podcast': PAGE('podcast-a'),
  '/all-content': PAGE('content-a'),
  '/community-stories': PAGE('content-a', 'band-story'),
  '/research': PAGE('content-a', 'band-research'),
  '/latest': PAGE('content-a'),
  '/about/team': PAGE('team-a'),
  '/person/grant-callen/': PAGE('team-bio'),
  'team-a.html': PAGE('team-a'),
  'team-bio.html': PAGE('team-bio'),
}));

/* The hrefs the static build uses as PLACEHOLDERS, and the label that
   disambiguates each one. A label here wins over BY_HREF; a label absent here
   falls through to BY_HREF's entry for the same href, which is why /latest and
   /solutions still have sensible entries above.

   Labels are matched after HTML entity decoding and whitespace collapsing, so
   "View Research &amp; Reports" is keyed as the text a reader sees. */
const BY_LABEL = new Map(Object.entries({
  /* /  */
  'Who We Are': PAGE('who-we-are-a'),
  /* /solutions */
  'What We Do': PAGE('what-we-do-a'),
  /* /latest, the seven-way placeholder */
  'Articles': PAGE('content-a', 'band-article'),
  'Community Stories': PAGE('content-a', 'band-story'),
  'Press Releases': PAGE('content-a', 'band-press'),
  'Research': PAGE('content-a', 'band-research'),
  'View Research & Reports': PAGE('content-a', 'band-research'),
  'Research (EPIC)': PAGE('epic-a'),
  'The Empower Podcast': PAGE('podcast-a'),
  'Capitol Chat': PAGE('capitol-a'),
  /* /join */
  'Newsletter': PAGE('mail-a'),
  'Ambassador Program': PAGE('amb-a'),
}));

/* Internal destinations with NO converted page, each with the reason, so that a
   link this file leaves alone is a recorded decision rather than an oversight.
   Anything internal that is neither remapped nor listed here is reported by
   unresolvedInternalLinks() and fails the test that calls it. */
export const NO_CONVERTED_PAGE = new Map(Object.entries({
  '/contact': 'no contact page is in the signed-off set; 301s to Empower\'s live contact page',
  '/privacy': 'no privacy page is in the signed-off set; 301s to Empower\'s live privacy page',
  '/join': 'a bare /join with no disambiguating label; the two Join Us menu items are keyed by label',
  '/reports': 'what-we-do-a\'s four annual report links (/reports/2025 .. /reports/2022); no annual '
    + 'report page exists on the install or in the signed-off set, so these 404 by omission rather '
    + 'than by remap. Raised for Empower.',
}));

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };

export function normaliseLabel(raw) {
  return String(raw ?? '')
    .replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m])
    .replace(/\s+/g, ' ')
    .trim();
}

/* True for a link this build owns, as opposed to an external site, a mail link,
   an in-page anchor, or a template expression left for PHP/JS to fill. */
export function isInternal(href) {
  const value = String(href ?? '');
  if (!value) return false;
  if (value.startsWith('#')) return false;
  if (/^(?:https?:|mailto:|tel:)/i.test(value)) return false;
  if (value.includes('${') || value.includes('<?php')) return false;
  return true;
}

/* Splits an href into the part the map is keyed on and the part carried through
   untouched. `/donate/?gift_type=annual` resolves on `/donate/` and keeps
   `?gift_type=annual`; `/reports/2025` resolves on `/reports`. */
function splitHref(href) {
  const match = /^([^?#]*)(.*)$/.exec(String(href));
  return { path: match[1], tail: match[2] };
}

/* The install path for one static href and its label, or null to leave it
   alone. Exported so a test can drive it directly with the corpus's own pairs
   rather than through a deployed tree. */
export function resolveHref(href, label, paths = convertedPagePaths()) {
  if (!isInternal(href)) return null;

  const { path, tail } = splitHref(href);
  const destination = BY_LABEL.get(normaliseLabel(label)) ?? BY_HREF.get(path);
  if (!destination) return null;

  const target = paths.get(destination.name);
  if (!target) {
    throw new Error(
      `resolveHref: "${href}" resolves to page "${destination.name}", which has no exampleUrl in `
      + 'PAGE_REGISTER or EXCLUDED_PAGES. Add one there rather than writing the path here.',
    );
  }

  const fragment = destination.fragment ? `#${destination.fragment}` : '';
  /* A fragment on the destination replaces any the source carried; none of the
     source's internal links carry one, and a band id plus a page id would be
     two fragments in one href. */
  return fragment ? `${target}${tail.replace(/#.*$/, '')}${fragment}` : `${target}${tail}`;
}

/* Every anchor in a markup string, as { href, label }. The label is the
   anchor's own leading text node, which is what the mega menu's items carry
   before their nested description <span>. */
export function anchorsIn(markup) {
  const found = [];
  const anchor = /<a\s[^>]*href="([^"]*)"[^>]*>([^<]*)/g;
  let hit;
  while ((hit = anchor.exec(String(markup))) !== null) {
    found.push({ href: hit[1], label: hit[2] });
  }
  return found;
}

function remapMarkup(markup, paths) {
  return String(markup).replace(
    /(<a\s[^>]*href=")([^"]*)("[^>]*>)([^<]*)/g,
    (whole, open, href, close, label) => {
      const target = resolveHref(href, label, paths);
      return target === null ? whole : `${open}${target}${close}${label}`;
    },
  );
}

/* Deep-copies `elements`, rewriting every internal link it carries. Returns a
   new tree; the input is not mutated, so a caller that deploys twice from one
   built tree gets the same result both times.

   THE THREE PLACES A LINK CAN SIT, all of them settings on a widget:
     link.url  - link()'s button widget, whose label is settings.text
     editor    - text()'s text-editor widget, markup
     html      - html()'s HTML widget, markup
   image() carries a url too, but it is a media file rather than a route, and it
   is excluded here by name rather than by luck. */
export function remapLinks(elements, paths = convertedPagePaths()) {
  const walk = (node) => {
    if (Array.isArray(node)) return node.map(walk);
    if (node === null || typeof node !== 'object') return node;

    const copy = {};
    for (const [key, value] of Object.entries(node)) copy[key] = walk(value);

    const settings = copy.settings;
    if (settings && typeof settings === 'object') {
      if (settings.link && typeof settings.link === 'object' && 'url' in settings.link) {
        const target = resolveHref(settings.link.url, settings.text, paths);
        if (target !== null) settings.link = { ...settings.link, url: target };
      }
      for (const key of ['editor', 'html']) {
        if (typeof settings[key] === 'string') settings[key] = remapMarkup(settings[key], paths);
      }
    }
    return copy;
  };

  return walk(elements);
}

/* Internal links a remapped tree still carries that point nowhere on this
   install, excluding the ones NO_CONVERTED_PAGE records a reason for. The test
   that calls this is the thing that stops a newly authored link from shipping
   as a 404. */
export function unresolvedInternalLinks(elements, paths = convertedPagePaths()) {
  const known = new Set(paths.values());
  const unresolved = [];

  const check = (href, label) => {
    if (!isInternal(href)) return;
    const { path } = splitHref(href);
    if (known.has(path) || known.has(`${path}/`)) return;
    if (NO_CONVERTED_PAGE.has(path)) return;
    if (NO_CONVERTED_PAGE.has(path.replace(/^(\/[^/]+).*$/, '$1'))) return;
    unresolved.push({ href, label: normaliseLabel(label) });
  };

  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (node === null || typeof node !== 'object') return;
    const settings = node.settings;
    if (settings && typeof settings === 'object') {
      if (settings.link && typeof settings.link === 'object') check(settings.link.url, settings.text);
      for (const key of ['editor', 'html']) {
        if (typeof settings[key] === 'string') {
          for (const a of anchorsIn(settings[key])) check(a.href, a.label);
        }
      }
    }
    Object.values(node).forEach(walk);
  };

  walk(elements);
  return unresolved;
}

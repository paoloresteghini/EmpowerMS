// Scroll reveals + page entrance.
//
// Progressive enhancement, same contract as js/nav.js: the markup ships
// fully visible. Every hidden start-state in css/motion.css is nested
// under [data-reveal="on"], which this script sets below — if the script
// never loads, nothing is ever hidden.

const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

// A CLIPPED ELEMENT NEVER LOADS ITS LAZY IMAGE, AND THE DEADLOCK OUTLIVES THE
// ANIMATION. Found on the live install on 2026-08-20, on /epic/ and
// /newsletter/ at 390px, where a photograph was simply missing from the page.
//
// css/motion.css:23 gives [data-reveal="clip"] a start state of
// clip-path: inset(0 0 14% 0). On these pages, with that start state present
// from the first frame, the image is never requested at all: its <figure>
// collapses to 0px and the section is short by exactly the photograph's
// height. It does not resolve on scroll and it does not resolve on reveal:
// measured with is-revealed set, opacity 1, transform none and clip-path
// inset(0px), the figure was STILL 0 tall with the image still never asked
// for. Isolated to clip-path specifically: killing the transform or the
// opacity start state changes nothing, killing clip-path alone restores the
// image and the section's height to the static build's number to the
// hundredth of a pixel (epic-a 4334.98 -> 4591.48, mail-a 2520.11 -> 2976.11).
//
// THE MECHANISM IS NOT FULLY ISOLATED, AND THIS COMMENT WILL NOT PRETEND IT
// IS. The obvious reading -- "Chromium refuses to fetch a lazy image inside a
// clipped element" -- is WRONG as a general rule, and was written here before
// it was tested. Two synthetic reproductions, one of them replicating this
// page's own structure (flex container > widget div > img with aspect-ratio,
// clip-path and scale on the container, image far below the fold, scrolled
// to), both load the image perfectly. So clip-path alone does not do it;
// something else on these pages is part of the chain and has not been found.
// What IS established, repeatedly and on two pages: with the gate present,
// removing clip-path restores the image, and the repair below restores it.
// Do not build on the general rule. Do trust the two measurements.
//
// WHY IT ONLY BIT NOW, and why it is this file's job to fix. The start state
// used to apply after first paint, because this script set the gate and this
// script is deferred; the image had already been requested during the frames
// before that. Once the gate moved into the server markup (the theme's
// language_attributes filter, which is what makes the entrance animation
// visible at all), the clip is in place from the first frame and the request
// never happens. The motion layer creates the deadlock, so the motion layer
// clears it, rather than pushing loading="eager" into markup that is shared
// with the static build and signed off.
//
// FIRST STATEMENT IN THE FILE, before the gate is touched: this is a network
// fetch, and every millisecond it starts earlier is one the image is not
// missing for.
for (const img of document.querySelectorAll('[data-reveal="clip"] img[loading="lazy"]')) {
  img.loading = 'eager';
}

root.setAttribute('data-reveal', 'on');

// Query from body, not document: <html> now carries data-reveal="on" itself
// (the gate above), and a document-wide query would sweep the root element
// into this collection alongside the content elements it's meant to gate.
const all = [...document.body.querySelectorAll('[data-reveal]')];

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

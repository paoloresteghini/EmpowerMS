// Scroll reveals + page entrance.
//
// Progressive enhancement, same contract as js/nav.js: the markup ships
// fully visible. Every hidden start-state in css/motion.css is nested
// under [data-reveal="on"], which this script sets below — if the script
// never loads, nothing is ever hidden.

const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

root.setAttribute('data-reveal', 'on');

const all = [...document.querySelectorAll('[data-reveal]')];

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

// Pre-selects the All Content filter bar from the query string.
//
// WHY THIS EXISTS. The three solution pages each close on a button reading
// "See all <issue> research". Until 2026-09-17 every one of them resolved to
// /all-content/ with no fragment, so a reader asking for public safety research
// landed at the top of a page holding every article, story, report and press
// release on the site, and had to find the two chips themselves. Empower's
// policy team filed it in their 2026-09-17 round, pointing at the EPIC page's
// own research button as the thing that already worked.
//
// The button now carries `?type=research&topic=safety`. This script reads those
// two values and ticks the matching radios before first paint does anything
// interesting; the filter itself stays exactly what it was, CSS over :checked.
//
// PROGRESSIVE ENHANCEMENT, the same contract js/nav.js and js/dropdown.js keep.
// If this file never loads, the radios keep their authored `checked` state, the
// page renders with "All" selected on both groups, and the reader is where the
// button used to land them. That is a worse page, not a broken one, and nothing
// below is required for the filter bar to work under its own steam.
//
// NO `change` EVENT IS DISPATCHED, and that is deliberate rather than an
// omission. The filter is pure CSS: css/content-a.css keys every rule off
// `:checked` combinators, and setting `.checked` updates that state directly.
// Nothing on this page listens for `change`. A dispatched event here would be
// inventing a contract no other code has asked for.
//
// THE TWO GROUPS AND THEIR IDS come from src/content-a/sections/02-browse.html,
// which authors them verbatim; elementor/pages/content-a/02-browse.mjs carries
// the same strings into the converted page, so these ids are identical on both
// sides and neither Elementor nor the Loop Grid rewrites them.

const GROUPS = [
  // query key, id prefix, the class the real radio carries
  { key: 'type', prefix: 'ca-t-', cls: 'cad-type' },
  { key: 'topic', prefix: 'ca-p-', cls: 'cad-topic' },
];

const params = new URLSearchParams(window.location.search);

for (const { key, prefix, cls } of GROUPS) {
  const value = params.get(key);
  if (!value) continue;

  // AN ID OUT OF THE QUERY STRING IS UNTRUSTED INPUT, so the element it finds
  // is checked for being the thing we meant before anything is set on it.
  // getElementById will happily return a heading, a container, or a named form
  // element that has shadowed something on `document`; `.checked = true` on any
  // of those is silent and does nothing useful. Requiring a radio input that
  // carries the group's own class means a crafted `?type=` can only ever select
  // a different chip in the same bar, which is the whole of what this feature
  // is allowed to do.
  const el = document.getElementById(prefix + value);
  if (!(el instanceof HTMLInputElement)) continue;
  if (el.type !== 'radio' || !el.classList.contains(cls)) continue;

  el.checked = true;
}

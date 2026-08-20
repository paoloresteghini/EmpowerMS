// The header search overlay.
//
// DESTINATION-ONLY, and that is the point. Every other script this theme
// loads lives at the repository root in js/ and is synced here by
// wp/sync.mjs. That directory is the protected static build: functions.php's
// comment at :452 records the site-wide dropdown regression that came from
// three files there competing for a top-level `const root`, and :486 records
// that renaming those declarations is not available as a fix. This file is
// Elementor-only, so it lives where the Elementor-only bridge stylesheet
// lives, and it declares nothing at top level that js/ already claims.
//
// Progressive enhancement, the same contract js/nav.js and js/dropdown.js
// state for themselves: the panel ships OPEN in the markup
// (elementor/theme-parts/header.mjs) and this script sets
// [data-search="on"], which is the gate bridge.css block 71 keys its
// closed-by-default rules off. If this file never loads, the panel is an
// open search form under the header: not the design, still usable, and still
// submits to /?s= because the form is a native GET form and always was.

const doc = document.documentElement;
const button = document.querySelector('.em-header__search');
const panel = document.getElementById('site-search');
const input = document.getElementById('site-search-input');

if (button && panel && input) {
  doc.setAttribute('data-search', 'on');

  // The panel ships OPEN in the markup, with no `hidden` attribute and with
  // the button at aria-expanded="true", because that is this build's
  // no-JavaScript contract and test-elementor.mjs:2684 enforces it. So the
  // script's job at load is to CLOSE it, exactly as js/nav.js:12-13 does for
  // the mobile nav. Setting the attribute here rather than in the markup is
  // what keeps the panel reachable when this file fails to load.
  button.setAttribute('aria-expanded', 'false');

  const isOpen = () => button.getAttribute('aria-expanded') === 'true';

  const open = () => {
    button.setAttribute('aria-expanded', 'true');
    doc.setAttribute('data-search-open', '');
    // focus() after the attribute flip, not before: while the panel is still
    // closed it is display:none and focus() on a hidden element is a no-op
    // that reports no error.
    input.focus();
  };

  const close = ({ restoreFocus = true } = {}) => {
    button.setAttribute('aria-expanded', 'false');
    doc.removeAttribute('data-search-open');
    if (restoreFocus) button.focus();
  };

  button.addEventListener('click', () => {
    if (isOpen()) close(); else open();
  });

  // Escape closes and returns focus to the button, which is where the user
  // was before they opened it.
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) close();
  });

  // A click outside closes WITHOUT pulling focus back to the button: the
  // user is looking somewhere else and moving focus would be a jump they did
  // not ask for.
  document.addEventListener('click', (event) => {
    if (!isOpen()) return;
    if (panel.contains(event.target) || button.contains(event.target)) return;
    close({ restoreFocus: false });
  });
}

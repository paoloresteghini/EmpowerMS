// Mobile header navigation: toggle panel + per-item accordion.
//
// Progressive enhancement: the panel and every sub-list ship expanded in
// the markup (real <a> links, no JS required to reach any of them). This
// script only collapses them and wires up the interactive behaviour once
// it has loaded — if it fails to load, every link stays reachable.

const toggle = document.querySelector('.em-header__toggle');
const panel = document.getElementById('mobile-nav');

if (toggle && panel) {
  toggle.setAttribute('aria-expanded', 'false');
  panel.hidden = true;

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    panel.hidden = open;
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) {
      toggle.setAttribute('aria-expanded', 'false');
      panel.hidden = true;
      toggle.focus();
    }
  });

  for (const trigger of panel.querySelectorAll('.em-mobilenav__trigger')) {
    const sublist = document.getElementById(trigger.getAttribute('aria-controls'));
    if (!sublist) continue;

    trigger.setAttribute('aria-expanded', 'false');
    sublist.hidden = true;

    trigger.addEventListener('click', () => {
      const open = trigger.getAttribute('aria-expanded') === 'true';
      trigger.setAttribute('aria-expanded', String(!open));
      sublist.hidden = open;
    });
  }
}

// Desktop mega menus.
//
// Progressive enhancement, same contract as js/nav.js: the five panels
// ship visible in src/sections/00-header.html as plain stacked link
// lists. This script sets [data-mega="on"], which is what
// css/megamenu.css keys its positioned, closed-by-default styles off —
// if this file never loads, every mega-menu link is still on the page.
//
// Below 960px the mobile nav (js/nav.js) owns navigation and this script
// closes and stands down.

const root = document.documentElement;
const header = document.querySelector('.em-header');

const OPEN_DELAY = 120;
const CLOSE_DELAY = 200;

const desktop = window.matchMedia('(min-width: 961px)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

const menus = header
  ? [...header.querySelectorAll('.em-header__item')]
      .map((item) => {
        const trigger = item.querySelector('[aria-controls]');
        const panel = trigger && document.getElementById(trigger.getAttribute('aria-controls'));
        return panel ? { item, trigger, panel } : null;
      })
      .filter(Boolean)
  : [];

if (menus.length) {
  root.setAttribute('data-mega', 'on');

  let open = null;
  let timer = 0;

  for (const { panel } of menus) {
    panel.hidden = true;
    // Stagger index for the link cascade, mirroring css/motion.css.
    panel.querySelectorAll('.em-mega__link').forEach((link, i) => {
      link.style.setProperty('--reveal-i', String(i));
    });
  }

  function cancel() {
    clearTimeout(timer);
    timer = 0;
  }

  function close() {
    cancel();
    if (!open) return;
    open.item.classList.remove('em-header__item--open');
    open.trigger.setAttribute('aria-expanded', 'false');
    open.panel.classList.remove('is-open');
    open.panel.hidden = true;
    open = null;
  }

  function show(menu) {
    cancel();
    if (open === menu) return;
    close();
    open = menu;
    menu.item.classList.add('em-header__item--open');
    menu.trigger.setAttribute('aria-expanded', 'true');
    menu.panel.hidden = false;
    // Next frame, so the closed start-state paints before the transition.
    requestAnimationFrame(() => {
      if (open === menu) menu.panel.classList.add('is-open');
    });
  }

  function after(ms, fn) {
    cancel();
    timer = setTimeout(fn, ms);
  }

  for (const menu of menus) {
    const { item, trigger, panel } = menu;

    // Click always works — it is the only path on touch, and it pins the
    // panel open for mouse users who prefer not to hover.
    trigger.addEventListener('click', () => {
      if (!desktop.matches) return;
      if (open === menu) close();
      else show(menu);
    });

    if (finePointer.matches) {
      // Intent delays: a pointer crossing the nav on its way somewhere
      // else should not flash five panels. Switching between triggers
      // while one is already open is instant — the user has committed.
      for (const el of [item, panel]) {
        el.addEventListener('mouseenter', () => {
          if (!desktop.matches) return;
          if (open) show(menu);
          else after(OPEN_DELAY, () => show(menu));
        });
        el.addEventListener('mouseleave', () => {
          if (!desktop.matches) return;
          after(CLOSE_DELAY, close);
        });
      }
    }

    trigger.addEventListener('keydown', (event) => {
      if (!desktop.matches) return;
      const index = menus.indexOf(menu);

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        show(menu);
        panel.querySelector('a')?.focus();
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        const step = event.key === 'ArrowRight' ? 1 : -1;
        menus[(index + step + menus.length) % menus.length].trigger.focus();
      }
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !open) return;
    const trigger = open.trigger;
    close();
    trigger.focus();
  });

  // Pointer and focus both leaving the header close it. focusout fires
  // before the new element is focused, so relatedTarget is what to test.
  document.addEventListener('click', (event) => {
    if (open && !header.contains(event.target)) close();
  });

  header.addEventListener('focusout', (event) => {
    if (open && !header.contains(event.relatedTarget)) close();
  });

  // Crossing the breakpoint hands navigation back to the mobile menu.
  desktop.addEventListener('change', close);
}

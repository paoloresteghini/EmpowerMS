import { container, text, html } from '../../factory.mjs';

/* Source of truth: dist/capitol-a.html, the <section class="cca-library">
   block (lines 241-302). Every class, string and attribute below is read
   from that file, not typed from memory.

   Structural decisions:

   1. THREE SIBLINGS DIRECTLY INSIDE `.em-container`: the heading, the
      filter form and the episode list. Source has no wrapping div grouping
      them (unlike podcast-a's own `.pca-catalogue` two-column wrapper);
      css/capitol-a.css has no `.cca-library` sub-wrapper class either, so
      none is invented here.

   2. THE HEADING IS A text() WIDGET CARRYING A BARE <h2>, never heading().
      No `heading()` import above. `data-reveal="rise"` sits directly on
      the <h2> in source (no data-reveal-group wrapper for this section),
      so it goes on this one widget's own `_attributes`.

   3. THE FILTER FORM (`.cca-filter`) IS AN html() WIDGET, verbatim. This is
      exception 2 of the design spec's three named HTML-widget exceptions
      (docs/superpowers/specs/2026-08-12-elementor-conversion-design.md,
      "Native-first, and the four exceptions"): "The filter controls on
      podcast-a/03-library AND capitol-a/03-library. Real radios and
      checkboxes inside a <form>, filtered by CSS with no script. Elementor
      has no widget that emits that markup." Built the same way podcast-a's
      own FACETS_FORM is: no cssClass passed to html(), the real class sits
      on the `<form>` tag directly in the markup string. The checkbox ids
      (ca-s-2026, ca-s-2025) are preserved exactly, because
      css/capitol-a.css's own `:has()` filter rule selects on them by id
      (`body:has(.cca-session:checked):not(:has(#ca-s-2026:checked))
      .cca-ep[data-session="2026"]`, and the 2025 pair).

   4. THE EPISODE LIST (`.cca-eps`) IS ALSO ONE html() WIDGET, an <ol> of
      six <li>, the same choice as this page's own triptych (01-hero.mjs
      note 5) and the same reasoning as what-we-do-a's `.da-years` and
      final's `.tl-line`: nothing inside any row needs to be a widget (no
      photographs anywhere on this page, and each row's content, a play
      icon, a title link, a date, a session tag, is static, not
      per-instance dynamic content this task is authorized to wire up).
      `css/capitol-a.css` carries no structural pseudo-class touching
      `.cca-eps`/`.cca-ep` at all (the brief's own grep found exactly two
      hits in this file, neither here), so container-vs-html() makes no
      difference to bridge cost either way; html() is chosen to keep the
      real `<ol>`/`<li>` list semantics intact rather than needing
      role="list" the way solutions-b's stations did (which had no choice,
      because their photographs forced real image() widgets inside).

   5. `data-cms`, `data-cms-item-attrs` AND `data-cms-note` ARE PRESERVED
      VERBATIM on the `<ol>`, not stripped. They are the source's own
      documented instruction for a LATER task ("In WordPress this is a Loop
      Grid over the show's posts... The loop item template MUST emit the
      attributes in data-cms-item-attrs from the episode's own terms"), not
      this one: this page has no CMS/taxonomy work authorized here, the same
      way this task's own brief rules out building `data-cms`-driven Loop
      Grid infrastructure. They are harmless custom data-* attributes on
      the live page (ignored by browsers and assistive technology alike),
      and stripping them would be an editorial decision beyond "convert
      what is there"; leaving them means the note is still on the page for
      whoever does build the real Loop Grid later, rather than only living
      in a static file this conversion has already moved past.

      THE EM DASH INSIDE `data-cms-note` IS SOURCE COPY, NOT SOMETHING THIS
      BUILD WRITES. `dist/capitol-a.html`'s own attribute reads "...from the
      episode's own terms — the filter above this list is CSS over those
      attributes...", copied verbatim below; this repo's rule against em
      dashes governs what this build writes, the same distinction
      02-about.mjs's own note makes for the approved claim-paragraph copy.

   6. NO cssClass PASSED TO EITHER html() CALL: the real classes
      (`.cca-filter`, `.cca-eps`) sit on their own tags directly in the
      markup strings, the same choice this page's own triptych and every
      earlier `.da-years`/`.tl-line`-shaped html() call makes, so
      css/capitol-a.css's selectors reach the real elements with nothing in
      between. */

const EPISODES = [
  {
    session: '2026', href: 'https://empowerms.org/2026-capitol-chat-week-11/',
    title: '2026 Capitol Chat: Week 11', date: 'March 20, 2026', label: '2026 session',
  },
  {
    session: '2026', href: 'https://empowerms.org/2026-capitol-chat-week-7/',
    title: '2026 Capitol Chat: Week 7', date: 'February 20, 2026', label: '2026 session',
  },
  {
    session: '2026', href: 'https://empowerms.org/2026-capitol-chat-week-2/',
    title: '2026 Capitol Chat: Week 2', date: 'January 16, 2026', label: '2026 session',
  },
  {
    session: '2025', href: 'https://empowerms.org/capitol-chat-week-11/',
    title: 'Capitol Chat: Week 11', date: 'March 21, 2025', label: '2025 session',
  },
  {
    session: '2025', href: 'https://empowerms.org/capitol-chat-week-10/',
    title: 'Capitol Chat: Week 10', date: 'March 14, 2025', label: '2025 session',
  },
  {
    session: '2025', href: 'https://empowerms.org/capitol-chat-week-5/',
    title: 'Capitol Chat: Week 5', date: 'February 7, 2025', label: '2025 session',
  },
];

const PLAY_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';

const episodeRow = (e) => `      <li class="cca-ep" data-session="${e.session}" data-reveal="rise">
        <span class="cca-ep__play" aria-hidden="true">${PLAY_ICON}</span>
        <a class="cca-ep__title" href="${e.href}">${e.title}</a>
        <span class="cca-ep__date">${e.date}</span>
        <span class="cca-ep__session">${e.label}</span>
      </li>`;

const FILTER_FORM = `<form class="cca-filter">
      <fieldset class="cca-filter__group">
        <legend>Session</legend>
        <div class="cca-filter__row">
          <div class="cca-tag">
            <input class="cca-tag__input cca-session" type="checkbox" id="ca-s-2026">
            <label class="cca-tag__label" for="ca-s-2026">2026 session</label>
          </div>
          <div class="cca-tag">
            <input class="cca-tag__input cca-session" type="checkbox" id="ca-s-2025">
            <label class="cca-tag__label" for="ca-s-2025">2025 session</label>
          </div>
        </div>
      </fieldset>

      <button class="cca-filter__clear" type="reset">Clear filters</button>
    </form>`;

const EPS_NOTE = 'Episode library, newest first. In WordPress this is a Loop Grid over the show’s posts. '
  + 'The loop item template MUST emit the attributes in data-cms-item-attrs from the episode’s own terms '
  + '— the filter above this list is CSS over those attributes and silently stops filtering without them.';

const episodeList = () => `<ol class="cca-eps" data-cms="loop" data-cms-item-attrs="data-session" data-cms-note="${EPS_NOTE}" data-reveal-group>
${EPISODES.map(episodeRow).join('\n')}
    </ol>`;

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'cca-library',
      content_width: 'full',
      _attributes: 'aria-labelledby|library-title',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        text({
          markup: '<h2 class="cca-library__head" id="library-title">Catch Up From the Capitol</h2>',
          _attributes: 'data-reveal|rise',
        }),
        html({ markup: FILTER_FORM }),
        html({ markup: episodeList() }),
      ]),
    ],
  );
}

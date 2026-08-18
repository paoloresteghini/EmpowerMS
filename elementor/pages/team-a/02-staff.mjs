import { container, text, html } from '../../factory.mjs';

/* Source of truth: dist/team-a.html, the <section class="ta-staff"> block
   (lines 203-287). Every class, string and attribute below is read from
   that file, not typed from memory.

   Structural decisions:

   1. `#staff` IS SET VIA `_element_id`, NOT `_attributes`. This section is
      the target of this page's own in-page anchor
      (`.ta-jump[href="#staff"]`, 01-hero.mjs). `_attributes: 'id|staff'`
      is silently refused by Elementor's Custom Attributes control, the
      exact failure solutions-b hit (Task 7, fix round 1, I1); `_element_id`
      is the confirmed-working route on a container (measured live there:
      `<section class="... e-con e-parent" id="solutions">`). Verified
      again here after deploy rather than assumed, and verified once more
      by Task 9's review, which read the id off the live section element.
      Recorded in the Task 9 entries of
      `.superpowers/sdd/2026-08-15-class-in-markup/progress.md`.

   2. `.ta-staff__head` AND `.ta-mark` ARE ONE DIV, not two nested ones.
      Source: `<div class="ta-staff__head ta-mark" data-reveal-group>`, a
      single element carrying both classes, the same space-joined-class
      pattern this build already uses for `.ta-hero__grid em-container`
      (01-hero.mjs) and solutions-b's own hero grid.

   3. THE HEADINGS ARE text() WIDGETS CARRYING BARE <h2>/<h3>, never
      heading() widgets. No `heading()` import above.

   4. `.ta-roster` (a <ul> of ten <li>, each holding one .ta-person__link
      wrapper of <span>s and one <h3>, and for exactly one person that
      wrapper is a real <a> rather than a <div>) IS ONE
      html() WIDGET, the same choice this page's own brief makes explicit
      for `.ta-ledger` in 03-fellows.mjs and the established pattern
      capitol-a's triptych and episode list both use: nothing inside any
      card needs to be a widget. The portraits are placeholder monogram
      `<span>`s carrying `data-placeholder="headshot"`, not images (there
      are no staff headshots in assets/photography to import), and no
      per-card content is dynamic. Building the whole list as one markup
      string keeps real `<ul>`/`<li>` list semantics (a screen reader
      announces "list, 10 items") and Grant Callen's own real
      `<a href="team-bio.html">` intact, rather than needing role="list"
      the way solutions-b's stations did (which had no choice, because
      their photographs forced real image() widgets inside). No cssClass
      passed to html(): the real class sits on the `<ul>` tag directly in
      the markup string, so css/team-a.css's `.ta-roster`/`.ta-person`
      rules reach the real elements with nothing in between.

      THE EDITABILITY TRADE THIS ACCEPTS, worth recording because it is a
      genuine cost and not a free lunch the way the triptych's was: unlike
      capitol-a's episode list (explicitly future Loop Grid content) or
      what-we-do-a's report years, the ten names and titles here are real,
      current staff, likely to change (a promotion, a departure, a new
      hire) well before this page's own headshots arrive. Built as one
      html() blob, none of that text is editable through Elementor's
      normal panel; a staff change means editing this file and
      redeploying, not clicking into the page. Accepted here because the
      alternative (a container tree just for panel-editability, with no
      bridge-cost difference either way per the task brief's own pricing)
      would still lose real list semantics without a compensating
      role="list", and because the headshot swap this page is already
      waiting on is the natural point to reconsider the whole section's
      construction, not before.

      `team-bio.html` IS PRESERVED VERBATIM, not remapped to
      `/about/team/grant-callen`. dist/team-a.html's own comment says
      plainly "At hand-off these links become /about/team/<name>", which
      is future work, not this conversion's: the source markup itself
      still reads `href="team-bio.html"`, and `team-bio` is explicitly out
      of this phase's own conversion order (not one of the fourteen
      signed-off pages), so nothing here invents a route that does not
      exist yet. */

const STAFF_HEAD = 'Our Team';
const NOTE = 'In alphabetical order by last name';
const PENDING = 'Placeholder portraits: staff, fellow and board headshots to be supplied by Empower.';

/* The nine without a bio page. Order matches dist/team-a.html exactly
   (the roadmap's own alphabetical-by-last-name rule, already corrected
   there for the one place it slips). */
const STAFF = [
  { initials: 'WE', name: 'Wil Ervin', title: 'Senior Vice President' },
  { initials: 'AG', name: 'Ashley Green', title: 'Director of Outreach' },
  { initials: 'KH', name: 'Kienna Horn', title: 'Director of Communications' },
  { initials: 'EM', name: 'Elyse Marcellino', title: 'Director of Embark' },
  { initials: 'GM', name: 'Gina Metzger', title: 'Executive Vice President' },
  { initials: 'PM', name: 'Dr. Patrick Miller', title: 'Vice President of Development' },
  { initials: 'JP', name: 'Joanna Pevey', title: 'Executive Assistant &amp; Development Manager' },
  { initials: 'KR', name: 'Dr Kristin Vance Richards', title: 'Director of Research' },
  { initials: 'FT', name: 'Forest Thigpen', title: 'Senior Advisor' },
];

const personRow = (p) => `      <li class="ta-person" data-reveal="rise">
        <div class="ta-person__link">
          <span class="ta-portrait" data-placeholder="headshot" aria-hidden="true"><span class="ta-portrait__mono">${p.initials}</span></span>
          <h3 class="ta-person__name">${p.name}</h3>
          <span class="ta-person__title">${p.title}</span>
        </div>
      </li>`;

const ROSTER = `<ul class="ta-roster" data-reveal-group>
      <li class="ta-person" data-reveal="rise">
        <a class="ta-person__link" href="team-bio.html">
          <span class="ta-portrait" data-placeholder="headshot" aria-hidden="true"><span class="ta-portrait__mono">GC</span></span>
          <h3 class="ta-person__name">Grant Callen</h3>
          <span class="ta-person__title">Founder &amp; CEO</span>
          <span class="ta-person__more">Read bio</span>
        </a>
      </li>
${STAFF.map(personRow).join('\n')}
    </ul>`;

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'ta-staff',
      content_width: 'full',
      _element_id: 'staff',
      _attributes: 'aria-labelledby|staff-title',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container(
          { cssClass: 'ta-staff__head ta-mark', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            text({
              markup: `<h2 id="staff-title">${STAFF_HEAD}</h2>`,
              _attributes: 'data-reveal|rise',
            }),
            text({
              markup: `<p class="ta-note">${NOTE}</p>`,
              _attributes: 'data-reveal|rise',
            }),
            text({
              markup: `<p class="ta-pending">${PENDING}</p>`,
              _attributes: 'data-reveal|rise',
            }),
          ],
        ),
        html({ markup: ROSTER }),
      ]),
    ],
  );
}

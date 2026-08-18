import { container, text, html } from '../../factory.mjs';

/* Source of truth: dist/team-a.html, the <section class="ta-board"> block
   (lines 332-375). Every class, string and attribute below is read from
   that file, not typed from memory.

   Structural decisions:

   1. `.ta-board__grid` AND `.em-container` ARE ONE DIV, matching this
      page's own hero grid (01-hero.mjs note 1) and solutions-b's
      precedent: `<div class="ta-board__grid em-container">`, a single
      element carrying both classes.

   2. `.ta-board__head` AND `.ta-mark` ARE ONE DIV, matching this page's
      own staff head (02-staff.mjs note 2): `<div class="ta-board__head
      ta-mark" data-reveal-group>`.

   3. `.ta-roll` (a <ul> of eight <li>, each carrying two or three plain
      <span>s) IS ONE html() WIDGET, the same choice and the same reason
      as this page's own `.ta-ledger` (03-fellows.mjs) and roster
      (02-staff.mjs): nothing inside any item needs to be a widget (no
      images, no dynamic content, no links). css/team-a.css carries no
      structural pseudo-class touching `.ta-roll`/`.ta-roll__item` at all,
      so container-vs-html() makes no difference to bridge cost either
      way, matching the brief's own note; html() is chosen to keep real
      `<ul>`/`<li>` list semantics, the same editability trade
      02-staff.mjs's own note records for the roster, accepted here for
      the same reason. No cssClass passed to html(): the real class sits
      on the `<ul>` tag directly in the markup string.

   4. THE HEADING IS A text() WIDGET CARRYING A BARE <h2>, never heading().
      No `heading()` import above.

   5. GRANT CALLEN APPEARS TWICE ON THIS PAGE, here and in the staff
      roster (02-staff.mjs), because he sits on both the staff and the
      board, matching dist/team-a.html's own comment. His board entry
      carries no `.ta-roll__role` span (he and four others have no officer
      title), matching source exactly: only Abb Payne (Chairman) and
      Gerard Gibert (Treasurer) carry one. */

const HEADLINE = 'Board of Directors';

const BOARD = [
  { initials: 'AP', name: 'Abb Payne', role: 'Chairman' },
  { initials: 'GG', name: 'Gerard Gibert', role: 'Treasurer' },
  { initials: 'GC', name: 'Grant Callen', role: null },
  { initials: 'SD', name: 'Sunny Desai', role: null },
  { initials: 'BD', name: 'Betsy Dowell', role: null },
  { initials: 'LL', name: 'Lex Lindsey', role: null },
  { initials: 'MS', name: 'Marie Sanderson', role: null },
  { initials: 'GW', name: 'George Williams', role: null },
];

const rollItem = (b) => `      <li class="ta-roll__item" data-reveal="rise">
        <span class="ta-disc ta-disc--roll" data-placeholder="headshot" aria-hidden="true">${b.initials}</span>
        <span class="ta-roll__name">${b.name}</span>${b.role ? `
        <span class="ta-roll__role">${b.role}</span>` : ''}
      </li>`;

const ROLL = `<ul class="ta-roll" data-reveal-group>
${BOARD.map(rollItem).join('\n')}
    </ul>`;

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'ta-board',
      content_width: 'full',
      _attributes: 'aria-labelledby|board-title',
    },
    [
      container({ cssClass: 'ta-board__grid em-container', content_width: 'full' }, [
        container(
          { cssClass: 'ta-board__head ta-mark', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            text({
              markup: `<h2 id="board-title">${HEADLINE}</h2>`,
              _attributes: 'data-reveal|rise',
            }),
          ],
        ),
        html({ markup: ROLL }),
      ]),
    ],
  );
}

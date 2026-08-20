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
      Gerard Gibert (Treasurer) carry one.

   6. THE BOARD STAYS HAND-WRITTEN, AND THAT IS THE DATA'S DECISION RATHER
      THAN THIS FILE'S. The staff roster and the fellows ledger became Loop
      Grids over the `person` post type on 2026-08-20. This roll did not,
      because NONE of these eight people has a `person` entry on the install.
      Grant Callen has one, and he is here because he is on the board, not
      because the post type says so; the other seven do not exist as data
      anywhere on empv2. A Loop Grid here would render one name.

      That is reported to Empower rather than repaired by inventing seven
      posts: creating them would put seven headshot-less, bio-less entries
      into a post type whose every existing row carries both, and they would
      immediately appear in the staff roster too, because nothing in the data
      would say they are board members. If Empower want the board driven by
      the CPT, that is eight new People plus the group distinction this build
      currently derives from `position_title`
      (wp/empowerms-child/inc/person-loop.php), and it is their content
      decision to make.

   7. `.ta-pending` LIVES HERE NOW. It was the staff section's third head
      paragraph until 2026-08-20 and 02-staff.mjs's note 5 records the move.
      css/team-a.css:137's own comment sets the rule the move follows: "Build
      scaffolding, not client copy: this line names what is missing so the
      monogram tiles are never mistaken for a design decision... It comes out
      with the last placeholder." Staff and fellows now carry real
      photographs from the media library, so this section holds the last
      placeholders on the page and the line belongs above them.

      THE WORDING CHANGED WITH THE MOVE, because the old line named three
      sections ("staff, fellow and board headshots") of which two are no
      longer true, and a scaffolding note that overstates what is missing is
      the same failure as one that understates it. It now names the board
      alone. It is still build scaffolding and still comes out entirely when
      Empower supply these eight. */

const HEADLINE = 'Board of Directors';
const PENDING = 'Placeholder portraits: board headshots to be supplied by Empower.';

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
            text({
              markup: `<p class="ta-pending">${PENDING}</p>`,
              _attributes: 'data-reveal|rise',
            }),
          ],
        ),
        html({ markup: ROLL }),
      ]),
    ],
  );
}

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

   7. `.ta-pending` IS GONE, 2026-09-10, and that is the line doing exactly what
      it was written to do rather than an omission. It moved here from the staff
      head on 2026-08-20 (02-staff.mjs's note 5), and css/team-a.css:137's own
      comment set the terms: "Build scaffolding, not client copy: this line
      names what is missing so the monogram tiles are never mistaken for a
      design decision... It comes out with the last placeholder."

      The board was the last placeholder. Staff and fellows already carried real
      photographs from the `person` CPT; these eight now carry Empower's own
      board crops, so there is nothing left on the converted page for the line
      to name and it comes out whole.

      IT STAYS IN THE STATIC BUILD, reworded, and the two are not in conflict.
      dist/team-a.html still draws staff and fellows as monogram tiles, because
      the static build has no CPT to read and no photographs for those fourteen
      people; the note there now names staff and fellows alone. The rule is the
      same in both: name what is actually missing, in the build where it is
      actually missing. */

const HEADLINE = 'Board of Directors';

const BOARD = [
  { photo: 'abb-payne', name: 'Abb Payne', role: 'Chairman' },
  { photo: 'gerard-gibert', name: 'Gerard Gibert', role: 'Treasurer' },
  { photo: 'grant-callen', name: 'Grant Callen', role: null },
  { photo: 'sunny-desai', name: 'Sunny Desai', role: null },
  { photo: 'betsy-dowell', name: 'Betsy Dowell', role: null },
  { photo: 'lex-lindsey', name: 'Lex Lindsey', role: null },
  { photo: 'marie-sanderson', name: 'Marie Sanderson', role: null },
  { photo: 'george-williams', name: 'George Williams', role: null },
];

/* THE HEADSHOTS ARE THEME ASSETS, NOT MEDIA LIBRARY ATTACHMENTS, and that is
   the one decision in this file worth arguing.
 *
 * This build's standing rule is that photographs are image() widgets fed from
 * the media library, so Empower can change them in wp-admin (epic-a's
 * 04-research.mjs note 2 states it). That rule does not reach here, because the
 * whole roll is ONE html() widget: the eight names, the two officer roles and
 * the <ul>/<li> semantics are authored markup already. A board member leaving
 * means editing a name in this file and deploying. A photograph that Empower
 * could swap in wp-admin, sitting beside a name they cannot, would be an
 * inconsistency rather than a convenience: the two always change together.
 *
 * So they ship the way the logo does, through wp/sync.mjs's FROM_ROOT, which
 * rsyncs assets/ into the theme. `wp-content/themes/empowerms-child/assets/` is
 * the path elementor/import-photography.mjs already reads from, and a root
 * relative src resolves on empv2 and on production without a per-install id or
 * a cutover step, which is what eight more attachment ids would have cost
 * (docs/staging-to-prod-database.md).
 *
 * THE FILES ARE EMPOWER'S OWN CROPS, lifted from empowerms.org/board/ on
 * 2026-09-10, downscaled to 132px for a 44px box. Their page pairs each
 * photograph with its own name in its own markup, and that pairing is the only
 * thing that identifies them: `Betsy-Acklen-...` sits under "Betsy Dowell" (a
 * former name), `G-Gilbert-...` under "Gerard Gibert" (their misspelling), and
 * Grant Callen's file is called `2`.
 *
 * ALT IS EMPTY AND aria-hidden STAYS, carried over from the monograms these
 * replace. `.ta-roll__name` is the very next element, so a described photograph
 * would have a screen reader announce every board member twice. */
const THEME_ASSETS = '/wp-content/themes/empowerms-child/assets/headshots';

const rollItem = (b) => `      <li class="ta-roll__item" data-reveal="rise">
        <img class="ta-roll__photo" src="${THEME_ASSETS}/${b.photo}.jpg" width="132" height="132" loading="lazy" decoding="async" alt="" aria-hidden="true">
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

import { container, text, html } from '../../factory.mjs';

/* Source of truth: dist/team-a.html, the <section class="ta-board"> block
   (lines 332-375). Every class, string and attribute below is read from
   that file, not typed from memory.

   Structural decisions:

   1. `.em-container` HOLDS THE HEAD AND THE ROSTER DIRECTLY. Until
      2026-09-16 this was one div carrying `.ta-board__grid em-container`,
      a two-column band with the heading in a left rail. The band is gone
      with the roll (note 3), so the wrapper is a plain `.em-container` and
      the section now matches `.ta-staff`'s own shape exactly.

   2. `.ta-board__head` AND `.ta-mark` ARE ONE DIV, matching this page's
      own staff head (02-staff.mjs note 2): `<div class="ta-board__head
      ta-mark" data-reveal-group>`.

   3. CARDS SINCE 2026-09-16, and still ONE html() WIDGET. Grant's round 2:
      "make the Board into cards like the staff and the same size as the
      Staff cards". The pill roll is replaced by a `<ul class="ta-roster">`
      of eight `<li class="ta-person">`, which is the STAFF roster's own
      markup and its own classes, so "the same size" is true by
      construction rather than by a measurement copied into two files.

      IT STAYS html() FOR THE SAME REASON AS BEFORE, and the reason is now
      stronger rather than weaker. Nothing in a card needs to be a widget:
      no dynamic content and no links (note 6 - these eight are not
      `person` posts, so there is no bio to open and no post-url tag to
      bind). Keeping the whole list in one html() blob preserves real
      `<ul>`/`<li>` semantics, and it keeps `.ta-headshot` on the real
      `<img>`: an image() widget would move that class to the wrapper and
      buy this section a bridge rule of exactly the shape block 57 had to
      be written in for the staff tiles. No cssClass passed to html(); the
      real classes sit on the tags in the markup string.

      THE PHOTOGRAPH TAKES `.ta-headshot`, NOT `.ta-portrait`.
      `.ta-portrait` is the staff tile's placeholder treatment and is only
      turned into a picture frame by bridge.css block 57, which the static
      build does not load. `.ta-headshot` (css/team-a.css) is the same box
      by the same three declarations and is a real frame in both builds.

   4. THE HEADING IS A text() WIDGET CARRYING A BARE <h2>, never heading().
      No `heading()` import above.

   5. GRANT CALLEN APPEARS TWICE ON THIS PAGE, here and in the staff
      roster (02-staff.mjs), because he sits on both the staff and the
      board, matching dist/team-a.html's own comment. His card carries no
      `.ta-person__title` (he and five others have no officer title),
      matching source exactly: only Abb Payne (Chairman) and Gerard Gibert
      (Treasurer) carry one.

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
  { photo: 'abb-payne', name: 'Abb Payne', role: 'Chairman', w: 400, h: 500 },
  { photo: 'gerard-gibert', name: 'Gerard Gibert', role: 'Treasurer', w: 387, h: 484 },
  { photo: 'grant-callen', name: 'Grant Callen', role: null, w: 480, h: 600 },
  { photo: 'sunny-desai', name: 'Sunny Desai', role: null, w: 479, h: 600 },
  { photo: 'betsy-dowell', name: 'Betsy Dowell', role: null, w: 479, h: 600 },
  { photo: 'lex-lindsey', name: 'Lex Lindsey', role: null, w: 400, h: 500 },
  { photo: 'marie-sanderson', name: 'Marie Sanderson', role: null, w: 320, h: 400 },
  { photo: 'george-williams', name: 'George Williams', role: null, w: 400, h: 500 },
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
 * THE FILES ARE EMPOWER'S OWN, from empowerms.org/board/. Their page pairs each
 * photograph with its own name in its own markup, and that pairing is the only
 * thing that identifies them: `Betsy-Acklen-...` sits under "Betsy Dowell" (a
 * former name), `G-Gilbert-...` under "Gerard Gibert" (their misspelling), and
 * Grant Callen's file is called `2`. All eight also carry `-circle-`, which
 * names the CSS their page applies and not the file: every one is a plain
 * square photograph.
 *
 * RE-PULLED AT SOURCE SIZE ON 2026-09-16 and cropped to 4:5. The 2026-09-10
 * copies were downscaled to 132px because that was the size the disc rendered
 * at, and that made a card-sized board look as though it needed new assets from
 * Empower. It did not: the same eight were still being served at 400 to 1422px
 * square. The crop takes the full height and trims the sides, so no face moves
 * and nothing is upscaled. Marie Sanderson's is the smallest at 320x400 and is
 * the first to replace if Empower ever send a larger set.
 *
 * THE WIDTH AND HEIGHT ATTRIBUTES DIFFER PER FILE, deliberately: they are each
 * image's real intrinsic size, which is what stops the browser reserving a box
 * the picture does not fill. `.ta-headshot`'s aspect-ratio is what actually
 * sizes the rendered box.
 *
 * ALT IS EMPTY AND aria-hidden STAYS, carried over from the discs these
 * replace. `.ta-person__name` is the very next element, so a described
 * photograph would have a screen reader announce every board member twice. */
const THEME_ASSETS = '/wp-content/themes/empowerms-child/assets/headshots';

const card = (b) => `      <li class="ta-person" data-reveal="rise">
        <div class="ta-person__link">
          <img class="ta-headshot" src="${THEME_ASSETS}/${b.photo}.jpg" width="${b.w}" height="${b.h}" loading="lazy" decoding="async" alt="" aria-hidden="true">
          <h3 class="ta-person__name">${b.name}</h3>${b.role ? `
          <span class="ta-person__title">${b.role}</span>` : ''}
        </div>
      </li>`;

const ROSTER = `<ul class="ta-roster" data-reveal-group>
${BOARD.map(card).join('\n')}
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
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container(
          { cssClass: 'ta-board__head ta-mark', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            text({
              markup: `<h2 id="board-title">${HEADLINE}</h2>`,
              _attributes: 'data-reveal|rise',
            }),
          ],
        ),
        html({ markup: ROSTER }),
      ]),
    ],
  );
}

# Converting the signed-off build into Elementor

**Date:** 2026-08-12
**Status:** design agreed in conversation, awaiting written review
**Trigger:** Paolo, 2026-08-12: the static build is signed off far enough to
convert, and the conversion is to be planned rather than attempted.

## The job

Fifteen signed-off pages become Elementor pages on a WP Engine install that is a
clone of empowerms.org, and that clone becomes the live site. The static build in
this repository stops being the deliverable and becomes the reference the
conversion is measured against.

## Scope

Derived from the chooser's own `data-state` values, not from memory. Fifteen
pages carry `decided`; two sets carry `open` and are excluded.

| Page | Chosen |
| --- | --- |
| `final` | the agreed homepage build |
| `who-we-are-a` | The Table, 2026-08-05 |
| `what-we-do-a` | Three Doors, 2026-08-05 |
| `team-a` | The Roster, 2026-08-05 |
| `team-bio` | the one staff bio, pattern for nine more |
| `solutions-b` | The Through Line Down, 2026-08-05 |
| `education`, `work`, `safety` | The Streetlight, one template, 2026-08-07 |
| `podcast-a` | The Studio, 2026-08-07 |
| `capitol-a` | The Dome, 2026-08-07 |
| `epic-a` | The Pinned Method, 2026-08-11 |
| `mail-a` | Five Minutes, 2026-08-11 |
| `amb-a` | The Network, 2026-08-11 |
| `give-c` | One Screen, 2026-08-12 |

**Excluded, and why.** All Content (`content-a`, `content-b`) and the landing
page template (`landing`, `landing-b`) are still `open` with Empower. The
twenty-six unpicked readings are archive. None of them convert.

### What that is in sections

Sixty-five section slots across the fifteen pages. `education`, `work` and
`safety` are the same seven `sol-*` blocks filled three times, so the build is
**fifty-one distinct compositions** plus two fillings of a saved template, plus
two Theme Builder parts (header, footer).

| Shape | Slots | Treatment |
| --- | --- | --- |
| Plain layout | 43 | Native containers and widgets |
| Loop Grid | 10 | 8 marked `data-cms="loop"`, plus `final`'s stories and insights on the older `auto-populated` marker |
| Dynamic fields | 1 section, 6 fields | `epic-a/04-research`: authored focus areas, live "most recent report" line in each |
| Inline SVG | 11 | Native containers, SVG stays as markup |
| Form controls | 5 | `final/06-joinus`, `mail-a/01-hero`, `amb-a/04-join`, and the two filter bars |

Counts overlap: `podcast-a/03-library` is a Loop Grid, nine inline SVGs and a
`<form>` in one section.

Only 8 of the build's 31 `data-cms="loop"` markers fall inside scope. The rest
belong to All Content and the landing templates.

## Survey of the install, 2026-08-12

Install `empv2`, reached over SSH at `empv2.ssh.wpengine.net`, WordPress root
`/nas/content/live/empv2`. WordPress 7.0.3, PHP 8.4. Site name "Empower
Mississippi", URL `empv2.wpenginepowered.com`.

| Finding | Consequence |
| --- | --- |
| **Elementor 4.2.1, free. No `elementor-pro` among the 69 installed plugins** | Loop Grid, Theme Builder, Form widget, per-element Custom CSS and Custom Attributes are all Pro. Paolo confirmed Pro can be bought, so the design holds. Without it this design does not work at all |
| **Zero pages built in Elementor. 1,738 Beaver Builder records** | The whole site is Beaver Builder. Two useful consequences: configuring Elementor Site Settings cannot disturb anything existing, and the conversion introduces a second builder to a live site |
| **Active theme is `uicore-pro` 2.4.1**, a commercial Elementor theme. `bb-theme` and `bb-theme-child` are inactive | The child theme is a UiCore child, not a Hello Elementor child. UiCore's own global styles have to be reconciled with `tokens/` |
| `bb-plugin` and `bb-theme-builder` active | Beaver Builder still runs the site while its theme is inactive. The site is mid-migration |
| **9 Beaver Builder theme layouts, 0 UiCore theme builder records** | The header and footer are Beaver Builder theme layouts. See the open decision below |
| 52 published pages, 490 published posts | The 15 converted pages join 52 existing ones |
| **`person` custom post type: 18 published records, all 18 with a featured image** | Real headshots already exist in WordPress. Names seen include Ashley Green, Wil Ervin, Kienna Horn, Forest Thigpen, Dr. Patrick Miller. This materially reduces the headshot blocker and may make the nine missing bio pages a single-template job |
| Gravity Forms 2.10.5, Stripe add-on 6.0.3 | Behind the live site, which was verified at 3.0.2 and 7.0.3 on 2026-08-12. **This clone is not current** |
| `advanced-custom-fields-pro` 6.4.3 installed but inactive | Available if the loop item attributes need a field-based route |
| `redirection` 5.9.0 active | The tool for the route map fixes |
| No podcast or guest taxonomy; no session taxonomy | Confirms Gap 1. Podcast episodes are ordinary posts in category 133 |
| `resource` CPT exists | Matches the known trap: `resource` is third-party reference links, not Empower research. Not a source for "Research" |

### The Beaver Builder footprint, measured

The 1,738 figure was `_fl_builder_data` meta rows, which overstates it. The real
footprint, counted by distinct posts:

| What | Count |
| --- | --- |
| Published pages with Beaver Builder enabled | **45** |
| Private pages | 6 |
| Beaver saved templates (`fl-builder-template`) | 112 |
| Beaver theme layouts (`fl-theme-layout`) | 9 |
| Posts | 2 |

**Decision, Paolo 2026-08-12: the header and footer are Elementor Theme Builder
parts applied site-wide, and Beaver Builder is to be retired.** Nothing has to be
preserved for Beaver's sake.

The arithmetic that follows, and why retirement is a second phase: the 15 signed-off
designs replace about 13 of those 45 pages (`home`, `about`, `team` and `board`
merged into one roster, `education-3`, `work`, `justice`, `the-empower-podcast`,
`join`, `become-an-ambassador`, `donate`, plus Capitol Chat, EPIC and the staff
bio, which have no existing equivalent). **About 32 Beaver Builder pages have no
new design.** Removing the plugin before they are converted or retired breaks
them.

The shape of those 32 decides the second phase. They are largely campaign and
petition pages, four thank-you pages, resource and download pages, two
calculators, and content indexes. **That is what the landing page template was
designed for**, and it is one of the two sets still open with Empower. Signing it
off turns fifteen to twenty of those pages into fillings of one template instead
of twenty bespoke conversions, which makes it the practical unlock for retiring
Beaver Builder.

Two open questions elsewhere in this repository now have factual answers from the
install: `commentary` and `empower-commentary` both exist as live pages, which is
the All Content naming disagreement made concrete; and Public Safety is published
at `justice`, so our slug is a redirect decision rather than an open question.

## Decisions taken

| Decision | Chosen | Rejected, and why it matters |
| --- | --- | --- |
| Environment | WP Engine install that is a clone of live, SSH and WP-CLI | Local WordPress (would need an import step); WP Engine's own staging environment of the production install (this is a separate install, so there is no promote button) |
| End state | The clone becomes the live site | Reference-only, or a later migration. This is the strictest bar and it pulls the go-live gate into the plan |
| Undesigned templates | Convert the fifteen now, design single post / archive / search / 404 afterwards | Designing them first. Paolo's call, with the seam accepted and documented |
| Page architecture | **Native-first**, three named exceptions | Hybrid per section, and HTML-widget-first. Native buys editability, at the cost of CSS work and exact-markup fidelity |
| CSS location | Child theme, in git, enqueued in the documented order | Elementor per-widget custom CSS, and a Global Kit. Neither stays diffable or testable |
| Mechanism | Write `_elementor_data` JSON, verify in the editor | Driving the Elementor UI through the browser |
| De-risking | Spike `podcast-a` end to end before planning the other fourteen | Planning straight from the audit |
| Verification | Automated fidelity harness plus a screenshot pass, gating each page | Screenshots alone, or review by eye |

### Native-first, and the three exceptions

Everything is built as real Elementor containers and widgets, except three shapes
that cannot be native and still work. Each is a recorded exception, not a
shortcut:

1. **`mail-a/03-receive`.** The four ticks are inline SVG animated by the page's
   CSS (`animation-timeline: view()` over `stroke-dashoffset`). An icon widget or
   an `<img>` severs the animation. Inline SVG in an HTML widget.
2. **The filter controls** on `podcast-a/03-library` and `capitol-a/03-library`.
   Real radios and checkboxes inside a `<form>`, filtered by CSS with no script.
   Elementor has no widget that emits that markup.
3. **`epic-a/03-method`.** The nested containers go native; the scroll-driven
   animation over them is CSS either way. Elementor's own sticky effect must not
   be added on top.

## Architecture

### How a page is stored

Elementor keeps each page as JSON in the `_elementor_data` postmeta: a tree of
`{id, elType, settings, elements}` where `elType` is `container` or `widget`.
Three sibling metas carry the rest (`_elementor_edit_mode`,
`_elementor_template_type`, `_elementor_version`), and Elementor generates a CSS
file per page. So a page can be written by WP-CLI, diffed, versioned and rebuilt.

### How the JSON gets written

Not hand-authored per page, and not a general HTML to Elementor parser. A small
factory library in this repository (`container()`, `heading()`, `text()`,
`image()`, `button()`, `html()`, `loopGrid()`) plus **one mapping module per
section**, each roughly twenty to forty lines. Fifty-one small modules beat one
clever converter: when a section is wrong, you fix that section.

### The unknown that decides what approach A costs

Elementor's per-element "CSS Classes" field is what lets a native heading widget
carry `.wa-hero__title` so the existing stylesheet still styles it. The open
question is where that class lands.

- **On the element itself:** the stylesheets ship unchanged, exactly as the
  README's enqueue table describes.
- **On a wrapper `<div>`:** selectors that assume the element *is* the `<h1>` or
  the `<ul>` need adapting. Typography mostly survives by inheritance; margins,
  `display`, grid participation and anything structural do not.

If it is the second, the fix is an **additive bridge stylesheet** in the child
theme carrying the Elementor-shaped selectors, with its own tests. The
forty-seven existing stylesheets stay untouched and stay under test.

**Consequence either way:** the converted DOM will not be class-for-class
identical to `dist/`. The 228 existing tests keep proving the static build. The
fidelity harness compares at the level of sections, data attributes, behaviour
and computed styles, not exact markup. That is a weaker guarantee than a
hybrid conversion would have given, and it is the price of editability.

### Where CSS lives

Child theme, in git, enqueued in the order the README's hand-off table sets out:
the eight `tokens/*.css`, then `components/components.css`, then `css/site.css`,
then the page's own stylesheets. Nothing goes in Elementor's custom-CSS fields.

Elementor Site Settings get the token values so native widgets default
correctly: Global Colors from `--em-blue` / `--em-orange` / `--text-body` /
`--blue-400`, Global Fonts from `--font-display` / `--font-body`, content width
from `--container-max`, widget spacing zeroed. **To verify on connecting:** if
the current site already uses Elementor, changing Site Settings restyles
existing pages immediately.

Two cascade traps, both silent:

- `css/site.css` styles bare `h1`, `h2`, `h3` and `p`, and so does Elementor's
  Theme Style, which loads later. Either disable Theme Style typography or set it
  from `tokens/typography.css`. The headings are `clamp()` ramps, so setting it
  by eye will drift.
- The build's roughly thirty breakpoints are not Elementor's. Pasted and enqueued
  CSS is unaffected. A block made responsive through Elementor's own controls
  cannot stay aligned with the rest of the page, so responsive behaviour stays in
  the stylesheets.

### Deploy loop

Write JSON, `wp post meta update` over SSH, flush Elementor's CSS cache, run the
fidelity harness against the live URL, capture screenshots. Repeatable per
section, so any page can be rebuilt from the repository at any point.

### Handover policy

While the conversion runs, this repository is the source of truth and
`_elementor_data` is overwritten freely. The moment Empower begin editing pages
in the builder that stops being true, and a rebuild would destroy their work. The
implementation plan names a handover point after which no more JSON is written.

## The loop and taxonomy contract

Checked against the live WP REST API on 2026-08-12, not assumed.

Known category ids: 9 Community Stories, 28 Work, 29 Justice, 7 Education,
133 Podcast, 135 Capitol Chat, 48 Empower News, 22 Press Releases,
124 Bill Summaries.

### What works today

- **`06-stories` on all three solution pages, and `final/04-stories`.** Community
  Stories mostly carry a topic category as well (7, 28 or 29), so the query is
  category 9 narrowed by area.
- **`capitol-a/03-library`.** Its one facet is Legislative Session, derivable
  from the post date and title (`2026 Capitol Chat: Week 13`). No new taxonomy
  needed.

### Gap 1: the podcast guest taxonomy

`podcast-a` filters by **Guest only**. Empower removed Filter by Topic on
2026-08-07 and a test enforces its absence. Every podcast post carries category
133 and nothing else: no tags, no other categories. So `data-guest`
(lawmaker / expert / leader) has nothing behind it.

Empower already committed on 2026-08-07 that "more guest categories to follow",
so this is an existing open ask rather than a new discovery. It still needs a
taxonomy created and back-filled across the podcast archive before the page can
work.

**`data-topic` does not convert.** It survives on the nine cards as scaffolding
for the static sample, guaranteeing a full topic/guest matrix so no combination
of ticks shows a dead end. The real library makes that guarantee meaningless.
Recorded in the block's `data-cms-note`.

### Gap 2: "Research" is not a category

It is the kind label on `07-latest` across all three solution pages, and it is
what `epic-a/04-research` calls "Most recent report" in each of its three focus
areas. Empower's report posts sit in Press Releases (22) and the area categories
with nothing marking them as reports; the four in the build were gathered by
hand. Either a Reports category is created and applied, or those six dynamic
fields and three loops need a different rule.

This is the same missing-category problem the audit found on All Content. The
scope cut does not remove it: `epic-a` and the three solution pages need it too.

### Gap 3: two stories carry no topic

Two of ten Community Stories carry category 9 alone, so a topic-narrowed query
never surfaces them on any solution page. Either they get a topic, or that is
accepted.

### The item contract

`data-cms-item-attrs` states, per loop, which attributes the loop item template
must emit from the post's real terms. A template that does not emit them produces
a page where every control moves, no card hides, and nothing reports an error.
`test.mjs` holds the contract to the markup in both directions.

Whether Elementor Pro's Custom Attributes field accepts dynamic tags as values is
the **first thing the spike answers**. If it does not, the fallback is a filter in
the child theme that stamps the attributes onto loop items: more code, but
predictable.

## The fidelity harness

Runs from page one, gating each page. A page is not done until its harness run is
green and its screenshots have been looked at.

1. **Copy contract.** `test.mjs` already holds the approved roadmap copy decks
   (`TEAM_COPY`, `SOLUTIONS_COPY`, `WORK_COPY`, `SAFETY_COPY` and the rest) and
   asserts them verbatim against `dist/`. Point the same decks at the live URL.
   Immune to markup change, so it catches a heading dropped, retyped or
   smart-quoted wrong during conversion.
2. **Section inventory.** Every converted container carries the build's own
   section class. Assert the same sections exist in the same order. This is also
   what makes the class-placement question testable rather than a matter of
   opinion.
3. **Data attributes on loop items.** Assert Loop Grid output actually emits
   `data-guest` and `data-session`. Invisible to every other check.
4. **The filters actually filter, in a real browser.** Tick a facet, count
   visible items, assert the count moved and only the right kind remains, untick,
   assert it restores. Proven against `content-b` on 2026-08-12 (23 to 6 to 23).
   Without it a page can pass every static check and still be dead.
5. **Computed-style spot checks** at 1440px: heading size, section background,
   container max-width, the orange action's colour. Catches a stylesheet that did
   not enqueue, and Elementor's Theme Style winning over `css/site.css`.
6. **Content visible without JavaScript.** The build's rule is that nothing is
   hidden waiting for a trigger. Elementor entrance animations break that rule by
   default, and `data-reveal` elements start hidden if `reveal.js` does not ship.
   This build has shipped that defect once already.
7. **Screenshots at four widths**, saved per page.

**What it does not claim.** No exact-markup diff, so visual drift inside
tolerance, image cropping and judgement calls still need looking at. That is what
the screenshots are for, and it is the honest limit of the harness.

## The go-live gate

Blocks cutover, not the build. Scoped to the fifteen pages: the mega menu appears
on **zero** of them, and the Empower Solutions Model's invented five steps affect
`final` only.

| Item | Pages affected |
| --- | --- |
| Gotham and Whitney licences | all 15; Figtree and Source Sans 3 stand in |
| **Licensed photography, 12 distinct files** | 13 of 15. Extracted from the brand guide PDF, explicitly stand-in. A legal exposure once public, not a polish item |
| 23 headshots, **partly solved** | `team-a`, `team-bio`. 18 `person` records exist with featured images. Confirm coverage against the 23 the pages need |
| Nine staff bio pages, **possibly a template job** | `team-a` links all ten staff at the CEO's page. If the `person` records carry bios, one Elementor single-person template generates all ten |
| Host photography | `podcast-a`, `capitol-a`, both marked `data-placeholder="photo"` |
| Grant Callen's real contact details | `team-bio`, currently the organisation's inbox, marked |
| Ambassador photos | `amb-a` |
| EPIC reversed or transparent lockup | `epic-a` |
| The logo in vector | all 15; the header logo is a PNG rendered from a PDF |
| The five real Solutions Model steps | `final` |
| Two brand-colour accessibility decisions | all 15 |
| Gravity Forms: parameter names on form 4, the amount ladder, confirm `/donate/` | `give-c` |
| Form endpoints | `final/06-joinus`, `mail-a`, `amb-a` |
| Podcast guest taxonomy, or dropping the facet | `podcast-a` |
| A Reports category, or a different rule | `epic-a`, `education`, `work`, `safety` |

### The route map, which is ours to fix

The fifteen pages link twenty-five internal routes, and two disagree with
themselves:

- The nav on all fifteen points at `/solutions/education`, `/solutions/work`,
  `/solutions/safety`. Body content on `final` and `what-we-do-a` points at
  `/quality-education`, `/meaningful-work`, `/public-safety`. Same three
  destinations, two URL shapes, on the same page.
- `/donate` on all fifteen, `/donate/` on `give-c`.
- `/latest` on all fifteen and `/all-content` on `final` are undefined
  destinations, and All Content is out of scope, so `final` currently links to a
  page that will not exist.

Fix during conversion, not after. Under native-first these become link settings
on widgets, so changing the shape later means editing widgets across fifteen
pages instead of one find-and-replace in `src/`.

## Sequence

0. ~~**Access and survey.**~~ **Done 2026-08-12**, recorded in the survey section
   above. It moved three items out of "risk" and raised one new decision.
1. **Install Elementor Pro**, and settle the header and footer scope. Both gate
   everything after the spike.
2. **Spike `podcast-a`.** Its `03-library` is a Loop Grid, nine inline SVGs and a
   `<form>` in one section, and it carries the item contract. Nothing left in
   scope is harder. Answer the class-placement question and the Custom Attributes
   question. Throwaway if it fails.
3. **Foundations.** UiCore child theme, tokens, enqueue order, Elementor Site
   Settings, header and footer per the decision at step 1.
4. **The fifteen**, hardest first so surprises land early: `capitol-a`, then
   `epic-a` and `mail-a` for the scroll-driven work, then the three form pages,
   then the solution template and its three fillings, then the plain pages.
5. **Fidelity harness** running from page one, not bolted on at the end.
6. **Go-live gate** as a cutover checklist.

The spike needs Elementor Pro installed. Nothing else is blocked.

## Risks

| Risk | Handling |
| --- | --- |
| CSS Classes land on a wrapper, so selectors need adapting | Additive bridge stylesheet with its own tests; originals untouched. The spike answers it before the plan is written |
| Custom Attributes will not take dynamic tags | Child-theme filter stamps attributes onto loop items |
| Elementor's JSON schema is version-specific and undocumented | Pinned at 4.2.1, recorded. Spike before committing |
| ~~Changing Site Settings restyles existing live pages~~ | **Retired 2026-08-12.** Zero pages are built in Elementor, so Site Settings can be configured freely |
| Two builders on one site: Beaver Builder runs 45 published pages, Elementor runs the 15 new ones | Accepted for this phase, retired in the second. Both load assets on every page unless scoped, which is a performance item on the go-live gate |
| Beaver Builder removed before its 32 undesigned pages are converted or retired | Retirement is gated on the landing template being signed off. The plugin stays installed until page coverage is complete |
| UiCore Pro's own global styles fight `tokens/` | Reconcile during foundations; the child theme's enqueue must win. Add a computed-style check to the harness |
| The clone is behind live on Gravity Forms and Stripe versions | Confirm before the Donate work whether the clone gets re-synced from live, and whether that would destroy converted pages |
| Empower edit pages mid-conversion and a rebuild destroys their work | Named handover point in the plan |
| Gaps 1 and 2 stall four pages | Put both to Empower now, in parallel with the spike |
| The seam to undesigned post and archive templates | Accepted by Paolo. Every crossing link documented for the second phase |

## Open questions

1. ~~The WP Engine install name.~~ **Answered:** `empv2`, access confirmed
   2026-08-12.
2. ~~Elementor licence tier.~~ **Answered:** free today, Pro available. Buying it
   is a prerequisite for step 3 of the sequence.
3. ~~The header and footer scope.~~ **Answered:** site-wide Elementor Theme
   Builder parts, and Beaver Builder retires. Its retirement is a second phase,
   gated on the landing page template being signed off, because 32 Beaver pages
   have no new design and most of them are what that template is for.
4. **Whether the 18 `person` records cover the 23 the team pages need**, and
   whether their bios are complete enough to generate the nine missing staff
   pages from a single template. If so, two go-live blockers shrink to one task.
5. **Whether Ashley Green and Wil Ervin now have somewhere to link to.** Both are
   deliberately unlinked in the build because their bio pages did not exist. Both
   have `person` records. Two tests enforce the unlinked rule and would need
   revising if that changes.
6. **Whether the clone will be re-synced from live before cutover.** It is behind
   on Gravity Forms and Stripe, and a re-sync would overwrite converted pages.
7. Empower's answer on the podcast guest taxonomy.
8. Empower's answer on a Reports category.
9. The decided route map, including what `/latest` is and what happens to
   `/all-content` while All Content stays open.

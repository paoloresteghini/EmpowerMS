> **SUPERSEDED 2026-08-20 by `2026-08-20-CONTINUATION-PROMPT-session-7.md`.**
> Every URL below is wrong: all seventeen pages were renamed to real slugs the
> same day, and the suite is 213 rather than 208. Kept for the record only.

# Continuation prompt, session 7. Paste the block below into a new context window

Everything above the line is for a human. Everything below it is the prompt.

---

Continue the EmpowerMS Elementor conversion. Repo `/Users/paolo/Code/EmpowerMS`,
branch `elementor-phase-2b-class-in-markup`, HEAD `7a3a456`, 64 commits ahead of
`origin/elementor-phase-2b-class-in-markup` and 94 ahead of `origin/master`.
Working tree clean.

**THE CONVERSION ORDER IS EMPTY. Every signed-off page is converted.** What is
left is a link remap, a handful of small measured items, and decisions that
belong to Paolo or to Empower. Do not go looking for another page to convert.

## STATE, all verified 2026-08-19 and 2026-08-20

| Thing | Value |
| --- | --- |
| Pages converted, live, measured | **17** |
| `node --test test.mjs` | 228 pass, 0 fail. The static build is untouched and must stay so |
| `node --test test-elementor.mjs` | **208 pass, 0 fail, 0 skipped** with all seventeen URLs and `FIDELITY_REQUIRE_ALL=1` |
| `PAGE_REGISTER` | 15 gated pages |
| `EXCLUDED_PAGES` | `podcast-a` and `content-a`, both Loop Grid pages whose live content is not the static build's |
| `wp/empowerms-child/css/bridge.css` | 6413 lines, **54 numbered blocks** |
| Cost categories | **FIFTEEN**, up from six when the phase started |
| Pushed | NO. The repo is PUBLIC |

The seventeen: `final`, `podcast-a`, `what-we-do-a`, `solutions-b`, `capitol-a`,
`team-a`, `who-we-are-a`, `mail-a`, `amb-a`, `epic-a`, `give-c`, `team-bio`,
`safety`, `work` (slug `work-2`), `education`, `landing`, `content-a`.

Run the suite like this, or a page with no URL is silently skipped. It takes 11
to 14 minutes and the environment has killed it three times; **a killed run
proves nothing, re-run it**. Use `nohup` so a stopped task cannot take it down.

```
set -a; . ./.env; set +a
FIDELITY_REQUIRE_ALL=1 \
HOME_URL=https://empv2.wpenginepowered.com/final/ \
SPIKE_URL=https://empv2.wpenginepowered.com/podcast-a/ \
WHAT_WE_DO_A_URL=https://empv2.wpenginepowered.com/what-we-do-a/ \
SOLUTIONS_B_URL=https://empv2.wpenginepowered.com/solutions-b/ \
CAPITOL_A_URL=https://empv2.wpenginepowered.com/capitol-a/ \
TEAM_A_URL=https://empv2.wpenginepowered.com/team-a/ \
WHO_WE_ARE_A_URL=https://empv2.wpenginepowered.com/who-we-are-a/ \
MAIL_A_URL=https://empv2.wpenginepowered.com/mail-a/ \
AMB_A_URL=https://empv2.wpenginepowered.com/amb-a/ \
EPIC_A_URL=https://empv2.wpenginepowered.com/epic-a/ \
GIVE_C_URL=https://empv2.wpenginepowered.com/give-c/ \
TEAM_BIO_URL=https://empv2.wpenginepowered.com/team-bio/ \
SAFETY_URL=https://empv2.wpenginepowered.com/safety/ \
WORK_URL=https://empv2.wpenginepowered.com/work-2/ \
EDUCATION_URL=https://empv2.wpenginepowered.com/education/ \
LANDING_URL=https://empv2.wpenginepowered.com/landing/ \
CONTENT_A_URL=https://empv2.wpenginepowered.com/content-a/ \
nohup node --test test-elementor.mjs > /tmp/suite.txt 2>&1 &
```

## READ FIRST, IN THIS ORDER

1. `docs/elementor/phase2b/2026-08-19-phase-2b-complete.md`. The state document:
   price against estimate page by page, the fifteen categories, the rules worth
   keeping, and both directions of open items.
2. `docs/elementor/phase2b/2026-08-17-conversion-recipe.md`, sections 1, 3, 4, 6
   and 7. Step 7 gained the reveal-neutralisation paragraph on 2026-08-19.
3. `wp/empowerms-child/css/bridge.css`'s HEADER, which was corrected on
   2026-08-19 and now tells you how to read every "we load later" claim below
   it.
4. `docs/elementor/phase2b/2026-08-19-item-property-corpus-sweep.md`, for what
   has been swept corpus-wide and what has not.
5. `.superpowers/sdd/2026-08-15-class-in-markup/progress.md`, the ledger, and
   the task-17 to task-21 reports. **`.superpowers/` is gitignored**, so on a
   fresh clone these are absent and the committed substitutes are the documents
   under `docs/elementor/phase2b/`.

## WHAT THIS PHASE ACHIEVED

Seventeen static pages became Elementor pages on `empv2`, each measured against
the static build by three instruments (`census()`, `controlBoxes()`,
`layoutInvariants()` in `fidelity-browser.mjs`), with every difference either
repaired by a NAMED bridge rule or documented as content.

The two fills are the phase's proof of method: `work` and `education` share
`css/solution.css` with `safety`, every repair is keyed on a shared class, and
`education` needed **no line of `bridge.css` at all**.

Along the way the cost model grew from six categories to fifteen, and one of
them was a live WCAG 2.4.7 failure: `link()` puts `.em-btn` on a wrapper while
`:focus-visible` binds to the anchor inside it, so **sixteen buttons across ten
pages had no focus indicator of any kind**. Blocks 40 and 41 repair all sixteen,
verified by real keyboard focus on every one.

## THE FIVE RULES THAT MATTER MOST

1. **A new check must be shown to FAIL on a known defect before its green is
   trusted.** It caught a blind probe twice this week, including one that
   compared computed `grid-column-start` and read 2 against 2 across a defect
   worth 574px.
2. **Key rest and hover on the element that CARRIES the property. Key FOCUS on
   the focused element.** The first half killed seven false positives; the
   missing second half hid the WCAG failure for a fortnight.
3. **A measurement that disagrees with a green gate is a claim about the
   measurement at least as often as about the page.** Two would-be defects died
   at that check on `safety` alone.
4. **A probe must let a state SETTLE, not merely assert it was entered.**
   Transitions produced four false readings on `landing`, one of which read
   exactly like a missing focus ring.
5. **At equal specificity, read the served `<head>` before trusting source
   order.** `bridge.css` is NOT always the last stylesheet: Elementor enqueues
   per-widget CSS after the theme's own.

## MECHANICS SETTLED BY MEASUREMENT, do not rediscover

- **Deploy:** `syncTheme()` is silent on success AND failure. Verify with an md5
  over a DIRECT `ssh`, then verify what the BROWSER gets by comparing the served
  `?ver=` against the file's mtime. Four flushes: `wp cache flush`,
  `wp elementor flush_css`, `wp page-cache flush`, `wp cdn-cache flush`.
- **Cache busting:** use `?nocache=`. `?s=`, `?p=`, `?w=`, `?name=`, `?cat=`,
  `?tag=`, `?paged=`, `?preview=` and `?page_id=` are WordPress query vars and
  change what you are served.
- **The install runs a Mailchimp popup** (`#PopupSignupForm_0`, `.mc-modal-bg`,
  `.mc-modal`) that covers the viewport seconds after load and intercepts
  pointer events. Remove those nodes before every hover probe, and re-remove.
- **Reveal state is not layout.** Neutralise it with the site's own
  `is-revealed` class and then WAIT, because motion.css transitions transform
  and clip-path. An `!important` guess at the properties made a photograph
  measure 0px against 525px.
- **`img.decode()` never settles for a lazy image out of the viewport** and will
  hang a sweep. Force `loading='eager'` and poll `complete` with a ceiling.
- **Elementor's own mobile breakpoint is 767** and has produced two defects more
  than 130px from any breakpoint the build ships. Sweep the middle band; the
  register samples only 1440 and 390.

## WHAT IS LEFT

### The one real piece of engineering: the LINK REMAP

Every converted page's nav and calls to action still point at the static build's
routes. Measured on the install 2026-08-19: `/latest`, `/all-content`,
`/ambassadors`, `/community-stories`, `/research`, `/meaningful-work` and
`/quality-education` all **404**; `/solutions`, `/donate`, `/join`, `/contact`,
`/privacy`, `/podcast`, `/what-we-do` and `/public-safety` **301 to Empower's
existing pages**, not to the converted ones; and `team-a` still carries a
literal `href="team-bio.html"`, which 404s.

So a reviewer clicking through the converted set lands on the old site or on
nothing. **This needs one decision from Paolo before any code**: point at the
converted set, at Empower's live pages, or at a new permalink scheme. Then it is
a few hours of mechanical work, and the list of destinations must be DERIVED
from the built pages rather than hand-maintained, because two hand-maintained
lists have already shipped wrong in this repository.

### Small, measured, and doable without a decision

1. **`podcast-a` is still ungated.** It is in `EXCLUDED_PAGES`. A chrome-only
   register entry, or the filter-test treatment `content-a` now has, would catch
   a dead page.
2. **The item-property sweep covers two widths only** on the nine pages
   converted before the middle-band step existed.
3. **`.tp-portrait` needs re-pricing** when a real headshot arrives, because the
   aspect ratio is on the container.
4. **`css/solution.css:276`'s `.sol-grid__closer-line{margin-bottom:0}` is
   dead**, outranked by `:274` at 0,1,1. The static build is frozen, so this is
   a hand-off question rather than a fix.

### Paolo's

1. **Ten alt-text sentences**, in `docs/elementor/phase2b/2026-08-18-alt-text-decisions.md`.
   Six rows are stale (they say "pending" for pages that are live), and
   `classroom-students` (20587) ships an alt naming one adult where the frame
   shows two, on `education`, `final` and `what-we-do-a`.
2. **Nothing is pushed**, and the repo is public.
3. **Block 41** is the file's one deliberately general rule, flagged in its own
   comment: keep it, or replace it with seven named rules.
4. **Form submissions.** Both form pages ship as blobs that submit nowhere, by
   his ruling, and are expected to ship twice.
5. **The review strip on `landing`** is inside `<main>` and must be deleted
   before Kienna duplicates the template. Task-20's report names the container.

### Empower's, all measured rather than estimated

1. **A post can carry more than one type**, so `content-a` renders nine posts in
   more than one band and all four Research cards are duplicates. This is the
   Knox Academy problem generalised and no new category fixes it alone.
2. **There is no Research and Reports category**, so that band ships as a manual
   selection of the four posts the static build shows.
3. **45 of `content-a`'s cards carry no topic label** and one carries no
   photograph.
4. **`guest_type` EXISTS** (terms `leader`, `lawmaker`, `expert`) but only 9 of
   66 episodes are tagged, so `podcast-a`'s pills are empty. Tag the rest or
   drop the pill. An earlier session recorded this as a missing taxonomy; that
   was wrong.
5. **Knox Academy (post 20354)** carries Education and Empower News but not
   Community Stories, which is why the three solution feeds ship authored.

## CONSTRAINTS, unchanged

- Static build untouched: `src/`, `css/`, `js/`, `tokens/`, `components/`,
  `build.mjs`, `test.mjs`. `test.mjs` stays at 228.
- No new dependencies. NO EM DASHES anywhere, commit messages included.
- Bridge rules NAMED, never general. Block 41 is the one sanctioned exception
  and it already exists.
- Never stage by directory. Stage by file name.
- Open every file reference and line number you write into a comment.
- Do NOT run `wp post meta update` for alt text. Paolo has ruled.
- One dispatch per page, and only one agent touching `bridge.css` at a time.
- If an implementer goes quiet, query the INSTALL, not the workspace. Two agent
  sessions have died mid-task with the page already deployed.

## FIRST ACTION

Ask Paolo the link-remap question, because it blocks the only substantial work
left and everything else in his list is a decision rather than a task. While
waiting, gate `podcast-a`: it is the most useful thing that needs nobody's
permission, and `content-a`'s filter test is the model for how to gate a page
whose content is not the static build's.

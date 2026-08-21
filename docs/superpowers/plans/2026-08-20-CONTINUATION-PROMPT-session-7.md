# Continuation prompt, session 8. Paste the block below into a new context window

Everything above the line is for a human. Everything below it is the prompt.

The session-6 prompt (`2026-08-20-CONTINUATION-PROMPT-session-6.md`) is
SUPERSEDED and its URLs are all wrong: every page was renamed on 2026-08-20.

---

Continue the EmpowerMS Elementor conversion. Repo `/Users/paolo/Code/EmpowerMS`,
branch `elementor-phase-2b-class-in-markup`. Working tree clean.

**THE CONVERSION IS FINISHED, THE LINKS ARE REMAPPED, AND THE SLUGS ARE REAL.**
Do not look for another page to convert. What is left is a short list of measured
items and a longer list of decisions that belong to Paolo or to Empower.

## STATE, all verified 2026-08-20

| Thing | Value |
| --- | --- |
| Pages converted, live, measured | **17** |
| `node --test test.mjs` | 228 pass. The static build is otherwise frozen |
| `node --test test-elementor.mjs` | **213 pass, 0 fail, 0 skipped**, seventeen URLs, `FIDELITY_REQUIRE_ALL=1` |
| `PAGE_REGISTER` | 15 gated pages |
| `EXCLUDED_PAGES` | `podcast-a` and `content-a`, both Loop Grid pages, both now gated BEHAVIOURALLY instead |
| `wp/empowerms-child/css/bridge.css` | 6413 lines, 54 numbered blocks |
| Cost categories | fifteen |
| Pushed | NO. The repo is PUBLIC |

**THE SLUGS CHANGED. Use these, not the session-6 list.**

```
set -a; . ./.env; set +a
FIDELITY_REQUIRE_ALL=1 \
HOME_URL=https://empv2.wpenginepowered.com/ \
SPIKE_URL=https://empv2.wpenginepowered.com/podcast/ \
WHAT_WE_DO_A_URL=https://empv2.wpenginepowered.com/what-we-do/ \
SOLUTIONS_B_URL=https://empv2.wpenginepowered.com/solutions/ \
CAPITOL_A_URL=https://empv2.wpenginepowered.com/capitol-chat/ \
TEAM_A_URL=https://empv2.wpenginepowered.com/team/ \
WHO_WE_ARE_A_URL=https://empv2.wpenginepowered.com/who-we-are/ \
MAIL_A_URL=https://empv2.wpenginepowered.com/newsletter/ \
AMB_A_URL=https://empv2.wpenginepowered.com/ambassadors/ \
EPIC_A_URL=https://empv2.wpenginepowered.com/epic/ \
GIVE_C_URL=https://empv2.wpenginepowered.com/donate/ \
TEAM_BIO_URL=https://empv2.wpenginepowered.com/grant-callen/ \
SAFETY_URL=https://empv2.wpenginepowered.com/public-safety/ \
WORK_URL=https://empv2.wpenginepowered.com/meaningful-work/ \
EDUCATION_URL=https://empv2.wpenginepowered.com/quality-education/ \
LANDING_URL=https://empv2.wpenginepowered.com/landing/ \
CONTENT_A_URL=https://empv2.wpenginepowered.com/all-content/ \
nohup node --test test-elementor.mjs > /tmp/suite.txt 2>&1 &
```

It takes 11 to 14 minutes and the environment has killed it four times. **A
killed run proves nothing, re-run it.** Never pipe a long-running command
through `tail`: it buffers, the output file stays empty, and a watchdog watching
that file reports a false stall. This cost time twice on 2026-08-20.

## READ FIRST, IN THIS ORDER

1. `docs/elementor/phase2b/2026-08-19-phase-2b-complete.md`, the state document.
2. `docs/elementor/phase2b/2026-08-20-link-remap.md`, why the link map is keyed
   on the pair (href, label) rather than on the href.
3. `docs/elementor/phase2b/2026-08-20-slug-rename.md`, what moved, what of
   Empower's moved with it, and the trap that cost a full suite run.
4. `docs/elementor/phase2b/2026-08-17-conversion-recipe.md`, sections 1, 3, 4, 6, 7.
5. `wp/empowerms-child/css/bridge.css`'s HEADER, for how to read every
   "we load later" claim below it.
6. `docs/elementor/phase2b/2026-08-19-item-property-corpus-sweep.md`, both halves:
   the two-width run and the 2026-08-20 middle-band extension.

`.superpowers/` is gitignored, so on a fresh clone the task briefs are absent and
the documents under `docs/elementor/phase2b/` are the committed substitutes.

## THE RULES THAT MATTER MOST

1. **A new check must be shown to FAIL on a known defect before its green is
   trusted.** It caught three blind probes in two days, including a corpus probe
   that reported 53 links clean because the theme parts export `headerPart` and
   `footerPart` and its fallback chain matched neither, so both trees resolved to
   `undefined`. The real number was 89.
2. **A page's slug is not just its URL.** `empower_page_styles()` is keyed by
   slug; renaming the pages orphaned all sixteen rows at once and every page
   rendered with correct markup, correct classes and no stylesheet. It surfaced
   as 46 failures across four kinds of test. **Grep for the old slug before
   renaming anything.**
3. **Derive lists, never hand-maintain them.** Every converted page's install
   path comes from the register's own `exampleUrl`, which is why the slug rename
   needed no edit to the link map at all. The two things that broke that day were
   both hand-written literals.
4. **Key rest and hover on the element that CARRIES the property. Key FOCUS on
   the focused element.** The missing second half hid a WCAG 2.4.7 failure on
   sixteen buttons for a fortnight.
5. **A measurement that disagrees with a green gate is a claim about the
   measurement at least as often as about the page.**
6. **At equal specificity, read the served `<head>` before trusting source
   order.** `bridge.css` is not always last.

## MECHANICS SETTLED BY MEASUREMENT, do not rediscover

- **Deploy:** `syncTheme()` is silent on success AND failure. Verify with an md5
  over a direct `ssh`, then compare the served `?ver=` against the file mtime.
  Four flushes: `wp cache flush`, `wp elementor flush_css`, `wp page-cache
  flush`, `wp cdn-cache flush`.
- **Redeploying pages** is `node <scratch>/redeploy-pages.mjs [names...]`, which
  derives its page list from `convertedPageDirs()`. Theme parts are
  `node elementor/theme-parts/deploy.mjs`.
- **Cache busting:** use `?nocache=`. `?s=`, `?p=`, `?w=`, `?name=`, `?cat=`,
  `?tag=`, `?paged=`, `?preview=`, `?page_id=` are WordPress query vars.
- **A 301 that survives one flush may still be cache.** On 2026-08-20 `/solutions`
  and `/podcast` read 301 after a flush and were serving a cached redirect;
  flushing again cleared them. Check the rule's own `status` before concluding.
- **wp-admin is disguised** by WPS Hide Login: the login path is `/clientlogin`,
  and Redirection is at `/wp-admin/tools.php?page=redirection.php`.
- **The install runs a Mailchimp popup** (`#PopupSignupForm_0`, `.mc-modal-bg`,
  `.mc-modal`) that covers the viewport and intercepts pointer events. Remove it
  before every hover probe, or click with `force: true`.
- **Reveal state is not layout.** Neutralise with the site's own `is-revealed`
  class and then WAIT.
- **`img.decode()` never settles for a lazy image out of the viewport.** Force
  `loading='eager'` and poll `complete` with a ceiling.

## WHAT IS LEFT

### Small, measured, doable without anyone's decision

1. **`css/solution.css:276`'s `.sol-grid__closer-line{margin-bottom:0}` is dead**,
   outranked by `:274` at 0,1,1. The static build is frozen, so this is a
   hand-off question rather than a fix.
2. **`.tp-portrait` needs re-pricing** when a real headshot arrives, because the
   aspect ratio is on the container.
3. **The two Loop Grid pages have behavioural gates but no chrome gate.** Neither
   `podcast-a` nor `content-a` compares its header, footer or authored sections
   against the static build, because census and box keys drown in loop content. A
   register entry restricted to a subtree would close that; nobody has designed one.

### Paolo's

1. **Nothing is pushed.** Seventy-plus commits, public repo.
2. **Ten alt-text sentences**, in `2026-08-18-alt-text-decisions.md`. Six rows are
   stale, and `classroom-students` (20587) ships an alt naming one adult where the
   frame shows two, on three pages.
3. **Block 41** is `bridge.css`'s one deliberately general rule: keep it, or split
   it into seven named ones.
4. **Form submissions.** Both form pages ship as blobs that submit nowhere.
5. **Whether Empower's `donate-old` and `team-old` stay renamed** after they have
   seen the review build. Original values are in the slug-rename document.

### Empower's, all measured rather than estimated

1. **A post can carry more than one type**, so `all-content` renders nine posts in
   more than one band and all four Research cards are duplicates.
2. **There is no Research and Reports category**, so that band ships as a manual
   selection of four posts.
3. **45 of `all-content`'s cards carry no topic label** and one carries no photograph.
4. **`guest_type` exists** (terms `leader`, `lawmaker`, `expert`) but only 9 of 66
   episodes are tagged, so the podcast facets are nearly empty. The mechanism
   works and is gated; the data is the gap.
5. **Knox Academy (post 20354)** carries Education and Empower News but not
   Community Stories, which is why three solution feeds ship authored.
6. **No annual report page exists**, so `what-we-do`'s four `/reports/{year}`
   links 404. Recorded in `NO_CONVERTED_PAGE` so it reads as a decision.
7. **`/solutions` at launch:** the Solutions page, or the 10th-anniversary
   campaign that had 249 recorded hits and is now disabled? Same for `/podcast`.
8. **`/contact` and `/privacy`** have no page in the signed-off set and still
   point at Empower's live ones.

## CONSTRAINTS

- Static build frozen: `src/`, `css/`, `js/`, `tokens/`, `components/`,
  `build.mjs`. `test.mjs` stays at 228. **One exception has been taken**, on
  Paolo's instruction of 2026-08-20: `landing`'s review strip was deleted from
  the source, the built page and the Elementor module together, because removing
  it from one side only would have made the live page differ from the static
  build in a way no instrument could tell from a defect.
- No new dependencies. NO EM DASHES anywhere, commit messages included.
- Bridge rules NAMED, never general. Block 41 is the one sanctioned exception.
- Never stage by directory. Stage by file name.
- Open every file reference and line number you write into a comment.
- Do NOT run `wp post meta update` for alt text. Paolo has ruled.
- If an implementer goes quiet, query the INSTALL, not the workspace.

## FIRST ACTION

Ask Paolo whether to push. Seventy-plus commits sit on a public repo with no
remote copy, and every other item on his list is a decision rather than a task.

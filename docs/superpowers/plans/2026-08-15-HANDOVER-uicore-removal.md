# Handover: finish removing UiCore, then Phase 2B pages 2 to 14

Written 2026-08-15 at the end of a long session, for a fresh context window.
Everything below is verified state, not intention.

## Read these three, in this order

1. `docs/superpowers/specs/2026-08-15-standalone-theme-design.md` — the design
   for removing UiCore, including what is deliberately not done.
2. `docs/elementor/phase2b/homepage-evaluation.md` — what the first converted
   page cost, how close it got, and the evidence behind the UiCore decision.
3. `docs/superpowers/specs/2026-08-14-elementor-phase-2b-design.md` — the
   fourteen-page scope, the per-page recipe, and the conversion order.

`wp/empowerms-child/css/bridge.css` carries its reasoning inline and is worth
skimming; several of its rules are expected to become unnecessary in step 2
below.

## State, verified

- Branch `master`, head `667753b`, tree clean, pushed. No unmerged work.
- `node --test test.mjs` = **228**. `node --test test-elementor.mjs` = **125**
  (8 fail by design without `SPIKE_URL`, so `npm test` needs it).
- Load credentials with `set -a; . ./.env; set +a`.
- Full suite: `SPIKE_URL=https://empv2.wpenginepowered.com/podcast-a/ npm test`

**Live on `empv2`:**

| Thing | Value |
| --- | --- |
| Converted homepage | post **20588**, slug `final`, <https://empv2.wpenginepowered.com/final/> |
| Install front page | still post **11**, the old Beaver homepage, untouched |
| Podcast spike | post **20568** |
| Header / footer parts | `elementor_library` **20573** / **20574** |
| Stories Loop Item template | **20589** |
| Homepage photographs | attachments **20579 to 20587** |
| Theme | `empowerms-child`, **now standalone**, name "Empower Mississippi" |
| UiCore plugins | **still active**, deliberately |

## The immediate next step, and it is the only risky one left

**Deactivate the three UiCore plugins**, then re-measure.

```bash
set -a; . ./.env; set +a
node -e "import('./wpe.mjs').then(m => m.wpe('wp plugin deactivate uicore-framework uicore-elements uicore-animate'))"
```

Then flush BOTH caches (`flushPageCache()` and `wp cdn-cache flush`, they are
independent) and check, in this order:

1. `/final/` and `/podcast-a/` still render `em-header`, `em-footer`,
   `main#main`, one `<h1>`, no fatal.
2. Run the full suite.
3. Re-run the computed-style comparison. **Expect the paragraph line-height
   difference to disappear on its own**, which is the whole reason for doing
   this: UiCore set `line-height` on `p` directly, the build sets it on `body`
   and lets it inherit, and no selector could bridge that.

**Getting back**, if it goes wrong:

```bash
node -e "import('./wpe.mjs').then(m => m.wpe('wp plugin activate uicore-framework uicore-elements uicore-animate'))"
```

and restore `Template: uicore-pro` to `wp/empowerms-child/style.css`, then sync.
Do not delete the plugins; deactivation gives up nothing and keeps the
comparison available.

## Then: remove the bridge rules that only existed to fight UiCore

Six rules in `bridge.css` exist solely because of UiCore, and each says so in
its own comment. Once the plugins are off, **re-measure before deleting each
one**, not after: the point is to prove it is unnecessary, not to assume it.

- form controls (`.elementor input.em-input` and friends)
- native buttons (`.elementor button.em-btn`)
- the Join Us heading colour and the heading sizes
- `.elementor .pca-hero h1.elementor-heading-title`
- the paragraph line-height note at the end of the file, which documents a
  repair that could not be written; delete the note only when the measurement
  says the difference is gone

The rules that must STAY are the Elementor ones: container padding, container
max-width, flex-direction, the widget-wrapper repairs, the skip link, the
`.em-btn` anchor.

## Then: Phase 2B pages 2 to 14

Order and reasoning in the Phase 2B design. Provisionally `who-we-are-a`,
`what-we-do-a`, `solutions-b`, `team-a`, `team-bio`, `safety`, then `work` and
`education` as fills of the same template, `capitol-a`, `mail-a`, `amb-a`,
`give-c`, `epic-a` last as the highest risk. Re-price that order against the
homepage's real cost first.

`elementor/pages/final/` is the worked example: six section modules, a
`media.mjs` attachment map, a `page.mjs` manifest, and one Loop Item template.

## Six things that will cost you a session if you rediscover them

1. **`dist/index.html` is the register of what Empower signed off.** Not the
   memory notes. `data-state="decided"` per set and a `Chosen:` tag on the
   picked card. Fourteen decided, two open (All Content, Landing). I scoped a
   phase from notes instead and got it wrong in both directions.
2. **A bridge rule overriding an Elementor container property needs two classes
   (`.your-class.e-con`); one fighting a widget default needs four.** Elementor
   repeats its own class to reach 0,4,0.
3. **A general CSS rule that beats a third-party rule also beats the build's
   own**, because they sit at the same specificity and load earlier. Two such
   rules were written, deployed, measured worse, and reverted, one of them
   caught only by a test on a page the work never touched. Re-measure the things
   a broad fix was NOT aimed at.
4. **Cloudflare caches static assets by URL independently of the WP page
   cache.** Measuring a CSS change needs `wp cdn-cache flush` as well as
   `flushPageCache()`.
5. **Elementor dynamic tags: the `id` is a unique element id, not the tag
   name**, and the featured image tag is `post-featured-image`, not
   `featured-image`. A wrong name renders nothing, silently.
6. **A loop item container needs `_element_cache: 'yes'`** or every card after
   the first serves the first card's wrapper markup while its title still
   varies, which reads as correct.

## Outstanding, not blocking

- **The Elementor Pro 4.2.1 kit-save bug report is drafted and unsent** at
  `docs/elementor/pro-kit-save-bug-report.md`. Needs Paolo's my.elementor.com
  login. It is why container width and widget spacing live in `bridge.css`.
- **Community Stories posts have no excerpts**, so the homepage's two story
  cards render an image and a title with no pull-quote. Content decision.
- **The hero photograph loses `fetchpriority="high"`** through Elementor's image
  widget and is the page's LCP element. The fallback is named in
  `01-hero.mjs`; measure the LCP before writing it.
- **Alt text is deferred until the design is in**, Paolo's call. The real figure
  is 1,341 of 1,355 in-use images, not the "42" older docs claim.
- Two things to tell Empower: they cannot save Site Settings, and a nav change
  means editing `src/_shared/header-2.html` and redeploying, never the editor.

## Constraints that still bind

The static build does not change: `src/`, `css/`, `js/`, `tokens/`,
`components/`, `build.mjs` and `test.mjs` stay untouched and `test.mjs` stays at
228. A converted page that looks wrong is fixed in `bridge.css`. No new
dependencies. No em dashes anywhere, commit messages included.

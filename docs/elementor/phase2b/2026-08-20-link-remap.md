# The link remap

**Decision taken by Paolo, 2026-08-20: point every internal link at the converted set.**

Phase 2B ended with seventeen pages converted and measured, and with every one of
them still linking at the static build's routes. This document records what was
wrong, what the remap does, the two things about it that were not obvious, and
what it deliberately leaves alone.

## What was wrong

Measured on empv2 on 2026-08-19, the static build's routes fall into three groups:

| Route | Status on the install |
| --- | --- |
| `/latest`, `/all-content`, `/ambassadors`, `/community-stories`, `/research`, `/meaningful-work`, `/quality-education` | **404** |
| `/solutions`, `/donate`, `/join`, `/contact`, `/privacy`, `/podcast`, `/what-we-do`, `/public-safety` | **301 to Empower's existing live pages**, not to the converted ones |
| `team-a.html`, `team-bio.html` | **404**, a literal static filename carried into the conversion |

So a reviewer clicking any nav item either hit nothing or silently left the
converted build for the current live site. The conversion was seventeen islands.

## The finding that shaped the work: the static header uses placeholder hrefs

`src/_shared/header-2.html` does not carry one href per destination. It carries
four placeholders standing in for fourteen destinations:

| Placeholder | Distinct menu items using it |
| --- | --- |
| `/latest` | Articles, Community Stories, Press Releases, Research, Research (EPIC), The Empower Podcast, Capitol Chat |
| `/join` | Newsletter, Ambassador Program |
| `/solutions` | Our Solutions, What We Do |
| `/` | Home, Who We Are |

An href-keyed rewrite, which is the obvious way to build this, would have sent
all seven `/latest` items to one page and destroyed the mega menu, which is the
most visible navigation in the build. The pair that makes the point is **Research
(EPIC)** (in the Our Solutions menu, meaning `epic-a`) and **Research** (in the All
Content menu, meaning the research band of `content-a`): two different
destinations, one href, distinguishable only by label.

The labels, by contrast, are unique and are already the converted pages' own
names. So the remap is keyed on **the pair (href, label)**, with the label
winning where one exists. That is not a refinement; it is the only key that
works.

## Where it runs, and why there

`elementor/deploy.mjs`'s `deployElements()`, which is the single function every
tree passes through on its way to the install. Three different producers put
links into trees:

1. the seventeen page modules,
2. the header and footer, whose markup is extracted **verbatim** out of the frozen
   `src/_shared/*.html` by `elementor/theme-parts/extract.mjs` and therefore cannot
   be fixed at source,
3. `content-a`'s loop item.

Rewriting at the one place they converge means no page module changed, no second
copy of the route scheme exists, and a page converted later cannot miss the
remap. `elementor/links.mjs` holds the map and returns a new tree rather than
mutating the one it is given.

## The targets are derived, not typed

Every converted page's install path is read out of `exampleUrl` in
`PAGE_REGISTER` / `EXCLUDED_PAGES`, the same field the fidelity gate uses to find
the page. Two hand-maintained lists have already shipped wrong in this
repository, and `work` is the case that would have caught a third: its slug is
`work-2`, not `work`, and nothing in `links.mjs` spells that out.

`EXCLUDED_PAGES` gained an `exampleUrl` for this. An excluded page is still a
link **destination** (`podcast-a` is the Podcast menu item, `content-a` is four of
them), so leaving it out would have meant writing its path by hand elsewhere,
which is the failure the field exists to prevent.

## What it did

83 of the 89 internal links in the corpus were rewritten, across seventeen pages
and both theme parts. `content-a` serves four nav destinations honestly by way of
the band ids `dist/content-a.html` already carries (`band-article`, `band-story`,
`band-research`, `band-press`).

Query strings are preserved: `give-c`'s tiles populate the donation form by URL
(`?gift_type=`, `&amount=`), and dropping those would have turned seven working
tiles into seven identical ones.

## What it leaves alone, on purpose

Recorded as `NO_CONVERTED_PAGE` in `elementor/links.mjs`, so that a link this
build does not own is a decision rather than an oversight:

- `/contact` and `/privacy`, which have no page in the signed-off set and 301 to
  Empower's live equivalents, which is the correct behaviour for them.
- `/reports/2025` through `/reports/2022`, `what-we-do-a`'s four annual report
  links. **No annual report page exists on the install or in the signed-off set,
  so these four 404 by omission.** This is the one link defect the remap does not
  fix, and it needs Empower.

## The three tests, and the one that was wrong first

1. **The seven `/latest` menu items resolve to seven different pages.** A property
   of the map rather than a copy of it.
2. **No converted page links to a route that does not exist.** Drives the whole
   corpus, page list derived from `convertedPageDirs()`.
3. **The deploy path rewrites links** rather than only the map being able to.
   Fails if `links.mjs` is ever imported but not called.

Test 1 was written first as a distinctness assertion alone, and **it passed with a
label deliberately deleted**. Losing one label does not collide with another: the
orphan falls through to the bare `/content-a/` fallback, which is distinct from
every band anchor, so distinctness stayed green while a menu item pointed at the
wrong page. Only comparing each label's target against the fallback catches a
single lost label, which is the likelier accident of the two. The test asserts
both now.

This is the same lesson as the corpus probe written the same morning, which
reported a clean 53 links because the header and footer export `headerPart` and
`footerPart` and the probe's fallback chain matched neither, so both trees
resolved to `undefined` and contributed nothing. Both are instances of the rule
the phase already carries: **a new check must be shown to fail on a known defect
before its green is trusted.**

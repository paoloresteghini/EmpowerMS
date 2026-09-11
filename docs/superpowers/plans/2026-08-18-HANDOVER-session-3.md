# Handover, session 3: tasks 5 through 9

> **SUPERSEDED for STATE, still current for METHOD.** Written at the end of
> session 3 (tasks 5 to 9). A document audit on 2026-08-18 found EIGHT of its claims
> wrong (enumerated W1 to W8 in
> `.superpowers/sdd/2026-08-15-class-in-markup/document-audit.md`) and about
> thirty stale. That audit's summary says 31 stale of 83 claims; its enumerated
> entries number thirty and skip S3, and its HOLD claims are not enumerated at
> all, so treat the totals as approximate and the enumerated entries as the
> record. Nearly all the stale ones are descriptions of state that later work
> changed within hours: pages listed as unconverted are converted, suite counts
> have moved, and the four-category pricing model it describes now has six.
> The push-state item below was WRONG rather than stale and has been corrected
> in place, because acting on it could have caused harm.
>
> Read it for the method, the mechanics and the rulings, which hold. Do not
> read any number in it as current. The current state lives in the newest
> handover in this directory and in
> `.superpowers/sdd/2026-08-15-class-in-markup/progress.md`.

Covers the overnight session of 2026-08-17 into 2026-08-18. The previous
handover is `2026-08-18-HANDOVER-class-in-markup.md`, written partway through
this same session and still accurate for tasks 5 to 6b.

## State

| Thing | Value |
| --- | --- |
| Branch | `elementor-phase-2b-class-in-markup`, NOT pushed |
| `master` | Untouched, unpushed |
| `node --test test.mjs` | 228 pass, 0 fail, unchanged all session |
| `node --test test-elementor.mjs` | 159 pass, 0 fail, 0 skipped, all page URLs set plus `FIDELITY_REQUIRE_ALL=1` |
| Pages converted | 5 live and green: `final`, `podcast-a`, `what-we-do-a`, `solutions-b`, `capitol-a` |
| `team-a` | Built, deployed, repaired and VERIFIED LIVE, but UNCOMMITTED at session end. Needs a suite run, a commit staged by file name, and a review. Its one rule is `.ta-hero__media > .elementor-widget-image{height:100%}` and the photograph now measures 453x566 at 1440 and 342x214 at 390, matching static exactly |

## What each page cost

| Page | Repairs | Notes |
| --- | --- | --- |
| `what-we-do-a` | 1 | 4 photographs deferred |
| `solutions-b` | 2 | 0 deferrals; four "deferrals" turned out to be structural |
| `capitol-a` | 4 (5 rule blocks) | 3 structural, 1 native control |
| `team-a` | 1 | predicted 0; the miss was the image category, not a grep |

## The method, which is the session's real output

Three documents, all committed:

- `docs/elementor/phase2b/2026-08-17-conversion-recipe.md`, sections 1, 6 and 7.
- `docs/elementor/phase2b/2026-08-18-repricing-after-four-pages.md`.
- The ledger at `.superpowers/sdd/2026-08-15-class-in-markup/progress.md`, which
  carries 34 rulings with what each costs if wrong.

**The rule.** Class-in-markup fixed WHICH element carries a class. What remains
is position: Elementor wraps every widget in its own div, so a build selector
that depends on where an element sits can still fail.

> A position-dependent selector needs a bridge rule when the widget wrapper
> falls BETWEEN the selector's reference point and its target.

Container targets cost nothing, because a container IS the element. Anything
authored inside a single `html()` or `text()` string costs nothing, because no
wrapper falls inside it. Only a wrapper between reference point and target costs.

**FOUR cost categories, and hits are an upper bound, not a count of rules.**
Child combinators are DONE: zero across every remaining page. Structural
pseudo-classes are the main axis. Native controls are the third and are
invisible to both greps, because they depend on Elementor's kit meeting a real
authored control at render time; they land only on `amb-a` (10) and `mail-a` (5). The fourth is photographs in
fixed-`aspect-ratio` containers, which cost one named rule each and are equally
invisible to a grep: five instances so far. Both of my per-page misses came from
those two categories, never from the greps.

**The cheapest lever is a build decision.** A structural pseudo-class over a
list costs nothing if the whole list is ONE `html()` widget. Only available when
nothing inside needs to be a widget. Proven on `capitol-a`'s triptych, which
cost zero as predicted.

## Two mechanics settled by measurement

- **Section ids.** `_attributes: 'id|x'` is SILENTLY REFUSED; other attributes
  in the same string land, which is what hid it. `_element_id` WORKS on a
  container. Six remaining pages need this.
- **Image wrappers.** `.elementor-widget-image` does not stretch, so a build's
  `height:100%` on the `<img>` resolves against nothing. Fixed by giving the
  WRAPPER the height. The tell that it is not a placeholder-crop difference is
  UNIFORMITY: a set the design sizes identically rendering at different sizes.

## What needs Paolo

1. **The branch IS pushed, but only through `8f64ff6`** (tasks 1 to 4.5), and
   this document said "nothing is pushed" until 2026-08-18, which was wrong in
   the dangerous direction: a reader told no remote copy exists may act as
   though none does. `origin/elementor-phase-2b-class-in-markup` exists and has
   been out of date since task 4.5. Local `master` is also 11 commits ahead of
   `origin/master`. Pushing the rest was blocked by a permission classifier and
   was not routed around. Check what consumes the pushed branch before assuming
   the gap is harmless: this repository is public.
2. **Alt text, one content decision in three parts.** `child-classroom-tablet`
   is used meaningfully by two pages that want different words, and alt is an
   attachment-level property with no per-use control: unresolvable in code.
   `children-running-parent` has NO alt and `team-a` uses it MEANINGFULLY, with
   real alt in the static build and no `aria-hidden`, so this is an
   accessibility gap on a live page rather than a tidiness question. Two attachments gained alt mid-session, leaving two
   `media.mjs` files with a stale reading.
3. **A blocked write.** An implementer's session denied a `wp post meta update`
   setting that alt text. It declined to route it through me and I declined to
   run it, because that would circumvent the permission decision rather than
   satisfy it. Recorded in `media.mjs` with the correct sentence written down.

## Caveat on these documents

Five defects of mine were caught by review this session, every one in a document
rather than in code, four of the five in the re-pricing document: a rule that
overreached, a false claim that `podcast-a` scored zero, `amb-a` called a
zero-cost page, its control count undercounted by four because the inventory
keyed on an attribute rather than the elements, and a specificity miscount. The
code has been in better shape than the prose about it all session. Treat the
numbers in the pricing document as measured where they say measured and as
mine where they do not.

`who-we-are-a` is pre-priced but UNVERIFIED: its ten structural hits classify to
one to three repairs, because nine are containers. If that holds, the estimate
is too high across the board and the table should be corrected rather than left
flagging that page as the hard one.

## Next

`who-we-are-a`, then `mail-a`, `amb-a`, `epic-a`, `give-c`, `safety`, `work`,
`education`, `team-bio`. `safety`, `work` and `education` share one stylesheet,
so their structural cost is paid once.

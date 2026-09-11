# Design: the build's classes travel in the markup, not on the widget

Written 2026-08-15, after the spike on post 20591 (`zz-spike-markup`).
Supersedes the widget-class half of
`docs/superpowers/specs/2026-08-14-elementor-phase-2b-design.md`; everything
else in that document still stands.

## 1. The problem this solves

`text()` and `heading()` put the caller's class on Elementor's widget wrapper
(`_css_classes`, `elementor/factory.mjs`), never on the `<p>` or `<h3>` the
markup produces. Every rule in `css/` and `components/` that styles that class
therefore stops reaching the real element, and the element falls back to
`tokens/base.css`. On the converted homepage that was twenty-one elements, and
repairing it took twenty rules in `bridge.css`, each one a copy of a
declaration that already exists in the static build.

Copies go stale. The cost is also per page: the re-pricing in
`docs/elementor/phase2b/2026-08-15-uicore-removal-and-repricing.md` puts the
remaining thirteen pages at 88 further classes on the same pattern.

## 2. The decision

**A text widget's markup carries the build's class on the real element, and the
widget is given no `cssClass` for that same class.**

```js
// before: the class lands on Elementor's wrapper, css/ stops matching
text({ markup: '<p>You want to build a great life...</p>', cssClass: 'fp-hero__lede' })

// after: the class lands where the stylesheet expects it
text({ markup: '<p class="fp-hero__lede">You want to build a great life...</p>' })
```

**Headings are text widgets carrying real heading markup**, not `heading()`
widgets:

```js
text({ markup: '<h3 class="em-article__title">Article headline</h3>' })
```

Elementor's Heading widget offers no way to put a class on the heading element
at all, and its own stylesheet sets `line-height:1` on
`.elementor-widget-heading .elementor-heading-title` at 0,2,0, which beats
`tokens/base.css`'s 1.08 on the bare elements. Both problems disappear when the
heading is not a heading widget.

**Images stay `image()` widgets.** Empower must be able to change photographs
through the media library, and the Image widget owns its own markup, so the
`display:contents` plus restatement pattern already in `bridge.css` stays.

## 3. The evidence

Spike deployed to post 20591 and measured on the live install. Three classes,
all declared in `tokens/base.css` or `components/components.css` so they load on
every page (a class from `css/homepage.css` would have measured unstyled on both
sides, since the spike's slug is not in `empower_page_styles()`).

| Probe | Class on widget | Class in markup | Build's value |
| --- | --- | --- | --- |
| `.em-eyebrow` margin-bottom | 0px | **12px** | 12px |
| `.em-article__excerpt` margin-bottom | 16px | **0px** | 0px |
| `.em-article__title` size / line-height | 20px / 25px, but only because `bridge.css` repairs it | **20px / 25px unaided** | 20px / 25px |

**Editability, which is the requirement.** Paolo edited every block through the
Elementor editor and saved. All three classes survived, in `_elementor_data` and
on the rendered page:

```
<p class="em-eyebrow">   <p class="em-article__excerpt">   <h3 class="em-article__title">
```

**Belt and braces is wrong.** A third zone carried the class in the markup AND
on the widget. The eyebrow computed 0px, because `bridge.css`'s existing
class-on-wrapper repair (`.elementor .em-eyebrow p{margin:0}`) matched the
wrapper and zeroed the inner paragraph. So the class MOVES, and the matching
bridge rule is deleted in the same change. Keeping both is not a safety net; it
is a conflict.

## 4. What this does not fix

These are structural to Elementor and no markup choice avoids them. All are
already written, shared site-wide, and paid:

- container gap, padding, max-width and flex-direction
- Elementor's Site Settings kit styling every native `button`
- a Loop Grid inserting four wrappers between a container and its items
- margins not collapsing inside a flex container
- images, per section 2

## 5. Constraints that still bind

The static build does not change: `src/`, `css/`, `js/`, `tokens/`,
`components/`, `build.mjs` and `test.mjs` stay untouched and `test.mjs` stays at
228. No new dependencies. No em dashes anywhere, commit messages included.
`dist/index.html` remains the register of what Empower has signed off.

A converted page that looks wrong is still fixed in `bridge.css`, but the first
question is now whether its markup should have carried the class instead.

## 6. Risks

| Risk | Handling |
| --- | --- |
| An editor selects all and retypes, losing the class | Real, and not preventable in CSS. The block degrades to `tokens/base.css` defaults rather than to nothing. Named in the hand-off notes for Empower |
| A module passes both `cssClass` and a markup class | Proven wrong by the spike. Enforced by a factory guard and a test, not by review |
| Migrating the two converted pages regresses something signed off | Both are measured before and after by the two instruments, which become real tests in Task 1 rather than session scripts |
| The instruments stay session scripts and are lost again | Task 1 lands them in `test-elementor.mjs` |

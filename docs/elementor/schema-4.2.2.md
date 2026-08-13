# The Elementor element schema, as captured from install `empv2`

**Elementor:** 4.2.2 (core), **Elementor Pro:** 4.2.1, licence tier `advanced`,
active, expires 2027-08-13. Captured 2026-08-13 from post 20551
(`ZZ Schema Reference`, draft) on `empv2.wpenginepowered.com`.

The plan pinned 4.2.1. Core had moved to 4.2.2 by the time Pro was installed, so
the pin is re-set to what is actually running. Auto-updates are off on both
plugins (`wp plugin list --field=auto_update` reports `off` for each), so this
should hold. Every claim below is backed by an excerpt from
`fixtures/elementor/reference-section.json` or from the rendered preview of that
same post, not from documentation and not from memory.

## How the reference was built

Through Elementor's own editor command API in the browser
(`$e.run('document/elements/create', ...)`), not by hand-writing JSON. The
elements therefore went through Elementor's own models and defaults, and what is
in the fixture is what Elementor itself chose to persist.

## The element wrapper

Every node is `{ id, elType, settings, elements, isInner }`. Widgets add
`widgetType`. `id` is 7 hex characters.

```json
{
  "id": "385d894",
  "elType": "container",
  "settings": { "html_tag": "section", "css_classes": "zz-probe" },
  "elements": [ ... ],
  "isInner": false
}
```

```json
{
  "id": "3ef059a",
  "elType": "widget",
  "widgetType": "heading",
  "settings": { "title": "Probe heading", "_css_classes": "zz-probe__title",
                "_attributes": "data-probe|static-value" },
  "elements": [],
  "isInner": false
}
```

## The finding that matters most: two different CSS class keys

**Containers use `css_classes`. Widgets use `_css_classes`.** The plan's factory
skeleton had a single `CSS_CLASS_KEY = '_css_classes'` constant shared by every
factory, which would have silently lost the class on every container in the
build.

Read straight out of the running editor's control definitions:

| Element | Class key | HTML tag key | Custom attributes key |
| --- | --- | --- | --- |
| `container` | `css_classes` | `html_tag` | `_attributes` |
| any widget | `_css_classes` | n/a | `_attributes` |

`_attributes` is on both, and is dynamic-capable on both. The class key is the
only one that differs, and it differs with no underscore on containers and an
underscore on widgets.

Widgets also carry `_element_id` (the Advanced tab's CSS ID) and `custom_css`
(Pro's per-element CSS field, which this build does not use: all CSS lives in the
child theme).

## Where the classes actually land in the markup

Taken verbatim from the rendered preview of post 20551.

**Container classes land on the container element itself.** `html_tag: "section"`
produced a real `<section>`:

```html
<section class="elementor-element elementor-element-385d894 zz-probe e-flex e-con-boxed e-con e-parent e-lazyloaded"
         data-id="385d894" data-element_type="container" data-e-type="container">
  <div class="e-con-inner">
```

**Widget classes land on a wrapper `<div>`, not on the semantic element.** This
is the answer to the spec's open question, and it is the second of the two
answers, not the first:

```html
<div class="elementor-element elementor-element-3ef059a zz-probe__title elementor-widget elementor-widget-heading"
     data-id="3ef059a" data-element_type="widget" data-e-type="widget"
     data-probe="static-value" data-widget_type="heading.default">
  <h2 class="elementor-heading-title elementor-size-default">Probe heading</h2>
</div>
```

`.zz-probe__title` is on the `DIV`. The `H2` inside carries only
`elementor-heading-title elementor-size-default` and no class of ours.

### What that costs

Per the spec ("The unknown that decides what approach A costs"), this is the
wrapper case, so an **additive bridge stylesheet is needed**. The forty-seven
existing stylesheets stay untouched and stay under test.

Two distinct problems, and they are not the same size:

1. **Selectors that assume the element IS the heading, list or paragraph.**
   `.pca-hero__title { font-size: ... }` still works by inheritance for
   typography, because the wrapper is the parent of the `<h2>`. Anything
   structural does not: `margin`, `display`, grid and flex participation,
   `::before` and `::after` on the semantic element, and any selector combining
   the class with a tag (`h2.pca-hero__title`) or a sibling (`.a + .b`).
2. **The boxed container's extra `div.e-con-inner`.** A parent container renders
   `<section class="...zz-probe..."><div class="e-con-inner">`, so `.zz-probe > *`
   matches only that inner div, never the real children. Child combinators from a
   container class are the specific thing to sweep for. Setting a container to
   full-width instead of boxed removes the inner div: the nested container here
   rendered as `e-con-full` with its children directly inside, no `e-con-inner`.

Measuring how many of the build's selectors are affected is the spike report's
job, and it must be counted rather than estimated.

## Custom attributes reach the markup, and take dynamic tags

Static value: `_attributes: "data-probe|static-value"` rendered as
`data-probe="static-value"` **on the widget wrapper div**, the same element that
carries `_css_classes`. Confirmed in the excerpt above.

The control definition, read from the live editor:

```js
controls._attributes === {
  type: 'textarea',
  label: 'Custom Attributes',
  dynamic: { categories: ['text'], active: true },
}
```

`dynamic.active` is `true`, so **the field accepts a dynamic tag**. So does
`_css_classes`. The spec's fallback (a child-theme filter stamping attributes
onto loop items) is therefore not needed *for the reason it was written*.

It is needed for a different reason, found by testing it rather than inferring
it. See the next section.

## How dynamic values are stored

Not in the setting. A parallel `__dynamic__` object holds a shortcode string,
keyed by the setting it overrides, and the plain setting keeps whatever literal
value it had:

```json
{
  "id": "35c7821",
  "elType": "widget",
  "widgetType": "heading",
  "settings": {
    "_css_classes": "pca-ep__title",
    "header_size": "h3",
    "__dynamic__": {
      "title": "[elementor-tag id=\"6babfb7\" name=\"post-title\" settings=\"%7B%7D\"]"
    },
    "title": "Add Your Heading Text Here"
  }
}
```

The tag's own `settings` are `encodeURIComponent(JSON.stringify(...))` inside the
shortcode. `id` is another 7-hex id. Note `header_size: "h3"` **did** persist
here, where `h2` did not on the reference section: further confirmation that the
rule is "defaults are omitted", not "this key is never written".

Available tag names on this install include `post-title`, `post-date`,
`post-terms`, `post-excerpt`, `post-url`, `post-featured-image`, `post-id`,
`post-custom-field`, `archive-title`, `author-name`, `site-title`, `shortcode`.

## The loop item attribute contract, tested end to end

Built as `fixtures/elementor/loop-item.json`: a `container` with
`css_classes: "pca-ep"` whose `_attributes` is a dynamic `post-terms` tag, with
the tag's own `before` control set to `data-guest|` so the field produces the
`key|value` shape the attributes control requires. `post-terms` exposes
`taxonomy`, `separator`, `link`, `before`, `after` and `fallback`, and `before`
is what makes a dynamic tag able to fill a `key|value` field at all.

That loop item was then rendered through a real `loop-grid` widget
(`template_id` pointing at the loop item, 6 posts, taxonomy `category` because
`guest_type` does not exist yet). The rendered result:

```
items=6 | tag=DIV | withAttr=6
marks=["<span>Podcast</span>", "<span>Empower News</span>", "<span>Podcast</span>",
       "<span>Community Stories</span>", "<span>Education</span> <span>Empower News</span>",
       "<span>Podcast</span>"]
```

**Two facts, and they point opposite ways.**

1. **The mechanism works.** All six items rendered, all six carried the
   attribute, and each carried its own post's terms, correctly differentiated,
   including the two-term case. A dynamic tag in `_attributes` on a loop item
   container really is evaluated per item.
2. **The value is unusable.** `post-terms` emits each term wrapped in `<span>`,
   even with `link` switched off. So the attribute value is markup, not a token
   list. `[data-guest~="lawmaker"]` cannot match `<span>Podcast</span>`, and
   there is no control on the tag to render terms plain. Nothing errors: the
   attribute is present, the filter controls all move, and no card ever hides.
   That is the exact silent failure the spec names.

**So the child-theme filter fallback is still required**, and Task 7 builds it.
The reason has changed and should be recorded as changed: not "Custom Attributes
will not take dynamic tags" (they will), but "the only dynamic tag that can emit
taxonomy terms emits them as HTML". A filter stamping the term slugs onto loop
items is the route, exactly as the spec's fallback describes.

The other possibility, not tested here, is a `post-custom-field` tag reading a
plain-text meta field holding the slugs. That trades the filter for a per-post
meta field Empower would have to maintain, which is worse for the same outcome.

## Elementor omits defaults

`header_size: 'h2'` was set on the heading and is **absent** from the persisted
JSON, because `h2` is the widget's default. The inner container gained a
`content_width` key that was never set.

The consequence for the factories: do not assume a key you set will appear in the
output, and do not assume a key you did not set will be absent. Assertions
against the fixture must be written around this, and a factory that needs a
non-default value (an `h1`, an `h3`) will see it persisted normally.

## Which settings keys actually persisted

Everything else was dropped as default.

| Element | Persisted keys |
| --- | --- |
| outer `container` | `html_tag`, `css_classes` |
| inner `container` | `css_classes`, `content_width` |
| `heading` | `title`, `_css_classes`, `_attributes` |
| `text-editor` | `editor`, `_css_classes` |
| `image` | `image`, `_css_classes` |
| `html` | `html`, `_css_classes` |

The `image` value is an object: `{ id, url }`.

## Both widget generations are installed

The editor panel offers two complete sets side by side:

- **Atomic Elements** (Elementor's v4 system): Div block, Flexbox, Grid, Tabs,
  Loop, Heading, Image, Paragraph, SVG, Button, YouTube, Divider, Video, plus a
  full **Atomic Form** set. The licence carries `atomic-components`,
  `atomic-loop`, `atomic-form`, `atomic-custom-attributes`, `atomic-custom-css`.
  Registered element types include `e-div-block`, `e-flexbox`, `e-grid`,
  `e-form`, `e-collection-loop`, `e-collection-loop-item`, `e-pagination`.
- **Classic**: Layout (Container, Grid), Basic (Heading, Image, Text Editor,
  Button, Divider, Spacer, Icon), and Pro (Loop Grid, Loop Carousel, Form,
  Off-Canvas, Posts, Gallery, Login, Mega Menu, Table of Contents and the rest).

**Everything above, and the whole conversion, uses the classic set**, which is
what the spec and plan were written against and what Loop Grid and the Pro Form
widget live in. The atomic set is newer, its JSON shape is different again
(`elType: 'e-div-block'` rather than `container`), and nothing in the design
needs it. Recorded here because a future reader opening the editor will see the
atomic set first and may assume it is the only one.

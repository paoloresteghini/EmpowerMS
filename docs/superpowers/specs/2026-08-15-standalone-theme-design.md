# Removing UiCore: the standalone Empower theme

Design document, 2026-08-15. Paolo decided to remove UiCore after a settings
save silently restyled a converted page. Breakage on unconverted pages is
explicitly accepted: "it doesn't matter if those pages visually break right now
because we can rebuild them back up", and the same for the Beaver-built pages.

That acceptance is what makes this a small piece of work rather than a large
one, so it is recorded at the top: **this design does not preserve UiCore's
rendering of anything.** It replaces the theme, and whatever looked right only
because UiCore was styling it will look wrong until it is rebuilt.

## 1. The finding that decides the shape

`elementor_theme_do_location()` is called **only by `uicore-framework`**
(`includes/templates/header.php`, `footer.php`, `pages.php`, plus its blog and
portfolio templates). Nothing in the theme calls it, and `uicore-pro` declares
no Elementor theme support.

That function is what puts our Elementor header and footer on the page. So
deactivating UiCore does not degrade the header and footer, it **removes them**.
The new theme has to call it, which is two lines and is exactly a theme's job.

This is also the reason the Phase 2A note in `theme-part-mechanism.md` could not
trace how Elementor's parts reached UiCore's hooks and left it as an open
question. This is the answer: UiCore's own templates call Elementor's location
API directly.

## 2. What the survey says we are actually giving up

Read off the install rather than assumed:

| | |
| --- | --- |
| Elementor documents containing a UiCore widget | **0** |
| Published posts with `uicore` anywhere in `post_content` | **1** |
| Published posts built with Beaver Builder | 166 |
| Published posts / pages / `resource` entries | 490 / 54 / 29 |

Nothing this project has converted depends on `uicore-elements` or
`uicore-animate` at all. The exposure is entirely the 166 Beaver posts and the
unconverted pages, which Paolo has accepted will be rebuilt.

## 3. What we build

**`empowerms-child` becomes standalone.** The directory name does not change,
deliberately: `wp/sync.mjs`, `functions.php`, the `bridge.css` enqueue and every
asset path already point at it, and renaming buys nothing but a tidier folder in
exchange for touching the deploy path. `style.css` loses its `Template:` line
and gains a proper theme name; a comment in the file records why the folder is
still called "child".

The template set is thin, because the conversion has already taken the work
away: Theme Builder supplies header and footer, Elementor supplies converted
page content, and Beaver renders its own content through `the_content()`.

| File | Job |
| --- | --- |
| `header.php` | doctype, `wp_head()`, `wp_body_open()`, the Elementor header location, `<main id="main">` |
| `footer.php` | close `<main>`, the Elementor footer location, `wp_footer()` |
| `index.php` | the fallback every theme must have; a plain loop |
| `page.php` | `the_content()`, which is what both Elementor and Beaver render through |
| `single.php` | the Elementor `single` location if one exists, else a plain post |
| `archive.php` | the Elementor `archive` location if one exists, else a plain list |
| `search.php` | same shape as archive |
| `404.php` | a heading, a sentence, a link home |
| `functions.php` | already exists; gains theme supports and location registration |

**Every template tries Elementor first and falls back.** The pattern is one
line: `if ( ! empower_do_elementor_location( 'single' ) ) { ...plain markup... }`.
That means single posts and archives can become Theme Builder parts later,
built the same way the header and footer already were, without touching the
theme again.

## 4. The four things that must not be missed

1. **`post-thumbnails` support.** Without it `has_post_thumbnail()` is false and
   the Loop Grid's featured-image dynamic tag renders nothing. The homepage's
   Community Stories cards depend on it, and it would fail silently: the cards
   would render with their title and no image, exactly as they did before the
   dynamic tag name was fixed.
2. **`<main id="main">`.** The header part carries the build's skip link, which
   points at `#main`. UiCore currently supplies that wrapper. If the new theme
   does not, the skip link targets nothing and the WCAG 2.4.1 repair made in
   Phase 2A becomes inert again.
3. **`wp_body_open()`.** Plugins hook it, and Elementor uses it.
4. **`register_elementor_locations`.** Elementor Pro's own hook, so the Theme
   Builder UI lists the locations this theme supports. Without it the parts
   still render through the explicit calls, but the editor cannot offer
   `single` or `archive` as somewhere to assign a new part.

## 5. What is deliberately NOT done

- **Beaver Builder's theme-layout hooks are not fired.** Six `fl-theme-layout`
  records are published (Posts Archive, Post Singular, Post Category Archive,
  Post Author Archive, Search Results, Person Singular) and render nothing today
  only because UiCore never calls `do_action('fl_header')` and friends. Adding
  those calls would wake all six at once across 490 posts. Paolo's position is
  that these pages get rebuilt, so waking a set of layouts nobody has looked at
  since they were made is the wrong default. They stay dormant.
- **UiCore is deactivated, not deleted.** Deactivating is reversible in one
  command and gives up nothing; deleting removes the ability to compare against
  what the site used to do. Deletion is a separate decision once the new theme
  has been live for a while.
- **No new dependency, and no starter theme.** The templates are small enough
  to write, and a parent theme is what we are removing.

## 6. Sequencing, and how to get back

1. Write the theme files in `wp/empowerms-child/` alongside the current
   `functions.php`. Nothing changes on the install while this happens.
2. Tests: the theme's own contract is checkable without a browser (the four
   items in section 4 are greps against the files), so they go in
   `test-elementor.mjs` first.
3. Sync, then `wp theme activate empowerms-child` is already the active theme,
   so the switch is really `style.css` losing its parent. Verify against the two
   pages that matter: the converted homepage and `podcast-a`.
4. Deactivate the three UiCore plugins.
5. Re-measure the homepage's probes. Expect the paragraph line-height difference
   to disappear on its own, which is the whole reason for doing this.

**Getting back** is `wp plugin activate uicore-framework uicore-elements
uicore-animate` and restoring the `Template:` line. Both are recorded in the
task report at the time, not left to memory.

## 7. What success looks like

- The converted homepage and `podcast-a` render with their Elementor header and
  footer, one `<h1>` each, and their own stylesheets.
- `test.mjs` still 228, static build untouched.
- The homepage's computed-style probes get closer to the static build, not
  further, and the paragraph line-height difference is gone.
- Nothing in `bridge.css` that exists solely to fight UiCore is still needed.
  Those rules get removed in the same pass that proves they are unnecessary,
  each one re-measured before deletion rather than deleted on faith.

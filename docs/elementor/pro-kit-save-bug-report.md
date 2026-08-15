# Bug report to Elementor: Site Settings cannot be saved (Pro 4.2.1)

**Status: drafted, not sent.** This is ready to paste into an Elementor Pro
support ticket. It has not been sent to anyone, because sending it is an
outward-facing action and Paolo's call. The bug is Elementor's, not this
project's, and it affects Empower's own editors as much as it affects the
conversion, so it is worth reporting rather than only working around.

**Where it goes.** The defect is in Elementor **Pro**, which is a paid product,
so the route is a support ticket at `my.elementor.com` under the licence
attached to this install, not the public `elementor/elementor` GitHub tracker
(that repository is the free plugin only, and a Pro-only file cannot be
reproduced there). If support asks for a public issue as well, the reproduction
below stands on its own.

**Why it matters to this project.** Container width and zero widget spacing are
the two structural values a kit would normally carry. Because no kit can be
saved, they live in `wp/empowerms-child/css/bridge.css` instead, which is the
only reason that file is load-bearing for layout rather than only for
class-shape repairs. Empower need to be told separately that they cannot save
Global Colors or Global Fonts either; that is on the outstanding list and is not
what this report is for.

---

## Draft, from here down

**Subject:** Kit documents cannot be saved: `__beforeSave` in the Components
package reads `elements` on a document that has none (Pro 4.2.1)

### Summary

On this install no Site Settings change can be saved, by any route. Every
attempt throws `Cannot read properties of undefined (reading 'toJSON')` from
Elementor Pro's Components package, and the editor silently reverts the values
on reload. It reproduces on a kit document with no page content involved, so it
does not depend on what any particular page contains.

### Environment

| | |
| --- | --- |
| WordPress | 7.0.4 |
| PHP | 8.4.23 |
| Elementor | 4.2.2 |
| Elementor Pro | 4.2.1 |
| Theme | UiCore Pro, with a child theme |
| Host | WP Engine |
| Available updates | none for either plugin (`wp plugin list` reports `update: none` for both) |

### What happens

`window.elementorCommon.__beforeSave`, installed by the Components package,
calls `.model.get( 'elements' )` on the document being saved and then
`.toJSON()` on the result. The `.toJSON()` call is guarded; the `.get()` that
produces the value it is called on is not. A kit document (Site Settings) has no
`elements` collection at all, so the guarded call receives `undefined` and
throws before the save request is ever made.

The failure is therefore structural to kit documents rather than dependent on
their settings: there is no value that can be entered which makes the save
succeed.

### Steps to reproduce

1. On a site with Elementor 4.2.2 and Elementor Pro 4.2.1, open any page in the
   Elementor editor.
2. Open the hamburger menu, then **Site Settings**, then **Layout**.
3. Change **Content Width** to any value.
4. Press **Save Changes**.

**Expected:** the kit saves and the new content width is in effect.

**Actual:** the save does not complete. The browser console shows
`Cannot read properties of undefined (reading 'toJSON')` raised from the
Components package's `__beforeSave` hook. Reloading the editor shows the
previous value, with no error surfaced in the UI itself.

### Reproduced three independent ways

All three fail identically, which is what rules out a single bad code path in
our own tooling:

1. A full settings write covering several kit values at once.
2. The editor's own **Save Changes** button, with a single field changed. The
   values silently revert to the theme's own defaults on reload.
3. A single `container_width` change issued through the same internal command
   the UI itself dispatches, with no other field touched.

### What we ruled out

- **Not the theme.** The throwing code is Elementor Pro's own, and the same call
  path runs regardless of which document is open.
- **Not our write path.** Route 2 above is Elementor's own UI, with no code of
  ours involved at any point.
- **Not fixable by updating.** `wp plugin list` reports `update: none` for both
  `elementor` and `elementor-pro`, so 4.2.2 / 4.2.1 are the newest versions this
  licence can take.
- **Not disableable.** No experiment flag in **Elementor > Settings >
  Features** turns the Components package off, so there is no supported way to
  take the offending hook out of the save path.

### Suggested fix

Guard the `.get( 'elements' )` call the same way the `.toJSON()` call after it is
already guarded, so a document with no `elements` collection is skipped by the
hook rather than throwing. Kit documents are the case that has no such
collection.

### Impact

Nobody on this install can save Site Settings, including the site's own
editors, so Global Colors, Global Fonts and Layout are all read-only in
practice. On a site being built out, the structural values that belong in a kit
have to be moved into a stylesheet instead, which puts them outside the reach of
anyone editing through the UI. That is a workaround for us and a permanent loss
of a documented feature for the client.

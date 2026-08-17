# The signed-off pages, derived from the chooser rather than read off its labels

Written 2026-08-17, during the class-in-markup work, after Paolo pointed out
that the chooser's "Signed off" control is what defines the set and that
reading the `Chosen:` labels is not the same thing.

## 1. What "signed off" actually means in the markup

`src/chooser.html`, built to `dist/index.html`, carries a Status facet with
three checkboxes: To review, Signed off, Archived. They are not per-page
controls and nothing about them is stored per visitor. They are filters, and
`css/chooser.css:206-210` is where each one is bound to a state in the markup:

```css
body:has(.ch__status:checked):not(:has(#signed-off:checked)) .ch__results .ch__opt--pick,
body:has(.ch__status:checked):not(:has(#signed-off:checked)) .ch__results > section[data-state="decided"]{ ... }
body:has(.ch__status:checked):not(:has(#to-review:checked)) .ch__results .ch__opt:not(.ch__opt--pick),
body:has(.ch__status:checked):not(:has(#to-review:checked)) .ch__results > section[data-state="open"]{ ... }
```

So the signed-off set is exactly **the `.ch__opt--pick` card inside each
`section[data-state="decided"]`**, and the to-review set is every option inside
each `section[data-state="open"]`. The facet's own printed counts are the check:
Signed off says 14, To review says 4, Archived says 26.

This matters because the `Chosen:` tag is a label written into a card, and the
pick class is what the filter selects on. They agree today. Deriving the set
from the thing the page itself filters on means they cannot silently stop
agreeing.

## 2. The fourteen signed-off pages

Derived by walking every `<section data-state=...>` and taking the `href` of its
`.ch__opt--pick`. Fourteen sections are decided, fourteen picks, matching the
facet's own count.

| Section | Signed-off file | Reading |
| --- | --- | --- |
| The homepage | `dist/final.html` | The homepage |
| About Us, Who We Are | `dist/who-we-are-a.html` | The Table |
| About Us, What We Do | `dist/what-we-do-a.html` | Three Doors |
| About Us, Team, Board and Fellows | `dist/team-a.html` | The Roster |
| Solutions | `dist/solutions-b.html` | The Throughline Down |
| Solutions, Quality Education | `dist/education.html` | The Streetlight |
| Solutions, Meaningful Work | `dist/work.html` | The Streetlight |
| Solutions, Public Safety | `dist/safety.html` | The Streetlight |
| The Empower Podcast | `dist/podcast-a.html` | The Studio |
| Capitol Chat | `dist/capitol-a.html` | The Dome |
| EPIC (Research) | `dist/epic-a.html` | The Pinned Method |
| Email Sign Up | `dist/mail-a.html` | Five Minutes |
| Ambassador | `dist/amb-a.html` | The Network |
| Donate | `dist/give-c.html` | One Screen |

`final.html` is confirmed as the signed-off homepage, which was the specific
doubt that prompted this check. Its status line carries one open item of its
own: "Chosen: pending the Join Us copy question".

## 3. The two sections still open, and they are the To review 4

| Section | Options awaiting a choice |
| --- | --- |
| All Content | `content-a.html`, `content-b.html` |
| Landing page template | `landing.html`, `landing-b.html` |

Two sections, two options each, which is the facet's To review count of 4.
Neither section appears in the Phase 2B conversion order, correctly. They are
converted after Empower picks, not before.

## 4. `team-bio` is not a signed-off page, and the conversion order assumed it was

`docs/elementor/phase2b/2026-08-15-uicore-removal-and-repricing.md` section 6
puts `team-bio` second in the re-priced order, ahead of ten pages that are
signed off. It is not one of the fourteen. It carries no `.ch__opt--pick`, it is
not the pick of any section, and it appears in the chooser only inside Team A's
own metadata:

```html
<div><dt>Also</dt><dd><a href="team-bio.html">The individual bio page</a></dd></div>
```

That is a companion page to a signed-off pick, not a choice Empower made. It may
well still need converting, since Team A links to it, but that is a decision
rather than something the register already answers.

**Correction to the order**, pending Paolo saying otherwise: `team-bio` comes
out, and the order proceeds `what-we-do-a`, `solutions-b`, `capitol-a`,
`team-a`, `who-we-are-a`, `mail-a`, `amb-a`, `epic-a`, `safety`, `work`,
`education`, `give-c`. Every one of those twelve is a pick.

The re-pricing's other numbers are unaffected: `team-bio` was priced at 3 new
classes and 8 unclassed paragraphs and headings, so removing it moves the
cumulative column down by 3 from that row onward and changes no page's own cost.

## 5. The method, which is the part worth reusing

The `Chosen:` labels gave the right answer here and would not have surfaced
either finding. `team-bio` reads as part of the Team set in prose and is invisible
as a non-pick until you ask which cards the Signed off filter actually selects.
The general form: when a document has a control that defines a set, derive the
set from what the control selects on, and use the printed count as the check
that you derived it correctly. A label naming the same thing is a second copy,
and a second copy is what goes stale.

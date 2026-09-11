# Alt text decisions, one table

Written 2026-08-18. Consolidates the alt-text problem, which was spread across
five documents and four `media.mjs` files, into one list that can be worked
through in a sitting.

**This document ends at a proposed sentence.** Paolo has ruled that no session
runs these writes, so nothing here is executed. Every row needs a human to say
yes, and then somebody with media-library access to type it.

## Three things already established, so they are not rediscovered

**Alt is a property of the ATTACHMENT, not of the use.** Elementor's Image
widget has no per-use alt control; it renders whatever
`_wp_attachment_image_alt` holds on the attachment. So when two pages use the
same photograph and want different words, that cannot be resolved in code, by
either build. One attachment, one sentence, and it has to serve every meaningful
use. That is why this document proposes ONE sentence per attachment rather than
one per page.

**The photography filenames do NOT describe the photographs.** This was already
recorded with one proof. There are now five, all confirmed by opening the files:

| File | What it actually shows |
| --- | --- |
| `young-man-portrait-bw.jpg` | a classroom seen from the back, in colour. Not a portrait, not a young man as subject, not black and white |
| `girl-writing-bw.jpg` | a young man writing in a notebook at an office desk |
| `family-outdoors-park.jpg` | a boy reading a book at a table in a library |
| `child-classroom-tablet.jpg` | a child writing on paper. There is no tablet in the frame |
| `grandparents-grandchild.jpg` | a young family, and the same photograph as `father-children-field.jpg` |

Never let a filename decide an alt, an import description, or which photograph a
page is using.

**Nobody needs to look at a photograph to finish this.** I opened all thirteen
files in `assets/photography/` while writing this, so every dispute about what a
picture shows is resolved below on the evidence rather than left as a question.
Where a proposed sentence rests on my reading of the image rather than on a
static build, it says so.

## The editorial principle behind the proposals

Two of the existing descriptions assert things a photograph cannot establish: a
relationship ("a mother, a father and their young son") and, arguably, a
child's gender. The proposals below describe what is visible and avoid
asserting identity or relationship. Where an existing sentence makes such a
claim it is noted, so the choice is deliberate rather than silent.

## The table

Verdicts: **SETTLED** the live alt serves every meaningful use, nothing to
decide. **EMPTY** a meaningful use is shipping with no alt, a WCAG 1.1.1
failure. **CONFLICT-WORDING** two pages want different words for the same thing,
both true. **CONFLICT-SUBJECT** the descriptions disagree about what the
photograph shows.

| id | File | Verdict | Proposed sentence |
| --- | --- | --- | --- |
| 20580 | `children-running-parent.jpg` | **EMPTY** | A man playing football with two children in a field at sunset |
| 20581 | `child-classroom-tablet.jpg` | **CONFLICT-SUBJECT** | A child writing at a table in a brightly coloured classroom |
| 20582 | `worker-workshop-bw.jpg` | **CONFLICT-SUBJECT** | A young man standing with his head down, working at a desk in an open-plan office, in black and white |
| 20586 | `esa-email-mockup.jpg` | **CONFLICT-SUBJECT** | An Empower Mississippi campaign email headed Save Our ESA, above a photograph of a classroom |
| 20587 | `classroom-students.jpg` | **CONFLICT-SUBJECT** | Two adults walking a small child along a path, each holding one of her hands |
| 20579 | `father-children-field.jpg` | **CONFLICT-WORDING** | Two adults crouching on the grass in a park, a small child on the man's shoulders, all three smiling |
| 20583 | `grandparents-grandchild.jpg` | **CONFLICT-WORDING** | Two adults crouching on the grass in a park, a small child on the man's shoulders, all three smiling |
| 20584 | `girl-writing-bw.jpg` | **CONFLICT-WORDING** | A young man writing in a spiral notebook at an office desk beside a monitor and keyboard, in black and white |
| 20585 | `young-man-portrait-bw.jpg` | **CONFLICT-WORDING** | A classroom seen from the back, students at their desks facing a teacher at the whiteboard |
| 20597 | `video-still-man-outdoors.jpg` | **CONFLICT-WORDING** | A young man in a dark jacket standing in a field at golden hour, arms folded, smiling |
| 20600 | `student-library.jpg` | **SETTLED** | none needed, empty alt is correct |
| 20604 | `epic-logo.png` | **SETTLED** | none needed, imported 2026-08-18 with empty alt |
| not imported | `family-outdoors-park.jpg` | **SETTLED** | A boy in a school polo shirt reading a book at a table in a library |

20579 and 20583 share a proposed sentence because they are the same photograph.
See their entries.

## What is wrong on the live site TODAY

Four attachments are already deployed with alt that does not serve their use.
This is the part that is not merely pending.

| id | Live alt | Live on | Why it fails |
| --- | --- | --- | --- |
| 20580 | `""` | `team-a` | Meaningful photograph, no text alternative at all. Clear WCAG 1.1.1 failure |
| 20581 | "A child working on a tablet in a classroom" | `final` | There is no tablet. The child is writing on paper |
| 20586 | "Research report cover" | `final` | It is an email template mockup, not a report cover |
| 20587 | "An adult and a child walking hand in hand across grass" | `final`, `what-we-do-a` | There are two adults, not one, and they are on a gravel path |

The phase has been describing this as one live accessibility gap. It is four:
one empty and three that describe something other than the photograph. An alt
that describes the wrong thing does not serve the equivalent purpose any more
than an absent one does.

## Per attachment

Each entry gives the live alt today, read from
`https://empv2.wpenginepowered.com/wp-json/wp/v2/media/<id>` on 2026-08-18
rather than from any `media.mjs`, since several of those carry stale readings.
Uses are marked MEANINGFUL or DECORATIVE by whether the static build gives real
alt and whether the `<img>` or an ancestor carries `aria-hidden="true"`.

### 20580 `children-running-parent.jpg`: EMPTY

**Live alt:** `""`

**What the photograph shows** (opened): a bearded man in a grey t-shirt and tan
shorts playing football with a young boy and a girl on grass in open parkland,
low sun behind them.

| Page | Use | Static alt |
| --- | --- | --- |
| `final` | DECORATIVE (hero aside) | `""`, `aria-hidden` |
| `final` | DECORATIVE (Join Us wash) | `""`, `aria-hidden` |
| `team-a` | MEANINGFUL, **LIVE NOW** | "A parent playing football with two children in a field at sunset" |
| `mail-a` | MEANINGFUL, pending | "A man playing football with two children in a field at sunset." |
| `give-c` | MEANINGFUL, **LIVE NOW** | "A man playing football with two children in a field at sunset." |

**Proposed:** "A man playing football with two children in a field at sunset"

Two of the three static builds already say "a man" and the photograph confirms
an adult man, so this takes the majority wording. `team-a`'s "a parent" asserts
a relationship the photograph does not establish. This is the highest priority
row: it is the only one shipping with no alternative at all.

### 20581 `child-classroom-tablet.jpg`: CONFLICT-SUBJECT

**Live alt:** "A child working on a tablet in a classroom"

**What the photograph shows** (opened): a child with a chin-length bob, in a
dark sleeveless top, seated at a white table, writing on a clipped sheet of
paper. Behind them, brightly coloured classroom furniture in green, blue and
yellow. **There is no tablet in the frame.**

| Page | Use | Static alt |
| --- | --- | --- |
| `final` | DECORATIVE (`.c2-panel`) | `""`, `aria-hidden` |
| `final` | MEANINGFUL, **LIVE NOW** | "A child working on a tablet in a classroom" |
| `what-we-do-a` | DECORATIVE | `""`, `aria-hidden` |
| `solutions-b` | MEANINGFUL, **LIVE NOW** | "A girl writing at a table in a brightly lit classroom" |
| `epic-a` | MEANINGFUL, **LIVE NOW** | "A girl writing at a desk in a brightly furnished classroom." |
| `give-c` | MEANINGFUL, **LIVE NOW** | "A girl writing at a desk in a brightly furnished classroom." |

**Proposed:** "A child writing at a table in a brightly coloured classroom"

The subject dispute is settled: writing, not a tablet, so the live alt and the
filename are both wrong and three static builds are right. The proposal says
"a child" rather than "a girl" deliberately: three builds say girl, but the
photograph shows only a haircut and clothing, and alt text should not assign a
gender it cannot establish. If Empower know the child, "a girl" is fine and
better.

### 20582 `worker-workshop-bw.jpg`: CONFLICT-SUBJECT

**Live alt:** "A young man working at a computer in an open-plan office"

**What the photograph shows** (opened): a young man in a dark t-shirt, head
down, standing at a desk beside a large monitor, in a strip-lit open-plan
interior. Black and white.

**How the dispute was settled:** by cross-reference. This is the same man, the
same dark t-shirt, the same monitor and the same strip-lit room as
`girl-writing-bw.jpg` (20584), which shows him writing beside a keyboard and
monitor at a desk. They are two frames from one session in one office. So "an
open-plan office" is right and "a shop floor" is wrong; the grey shape on the
left is the back of the monitor, not machinery.

| Page | Use | Static alt |
| --- | --- | --- |
| `final` | DECORATIVE (`.c2-panel`) | `""`, `aria-hidden` |
| `final` | DECORATIVE (Join Us way) | `""`, `aria-hidden` |
| `what-we-do-a` | DECORATIVE | `""`, `aria-hidden` |
| `solutions-b` | MEANINGFUL, **LIVE NOW** | "A young man working at a computer in an open-plan office" |
| `work` | MEANINGFUL, pending | "A young man working at a computer in an open-plan office" |
| `epic-a` | MEANINGFUL, **LIVE NOW** | "A young man on a shop floor, head down over the machine he is working at." |
| `amb-a` | MEANINGFUL, pending | "A young man on a shop floor, head down over the machine he is working at." |

**Proposed:** "A young man standing with his head down, working at a desk in an
open-plan office, in black and white"

The live alt is already close to correct and could simply stand. The proposal
adds the posture, which is what `epic-a` and `amb-a` were reaching for, and
drops "shop floor" and "machine", which the photograph does not support. Two
pending pages will need their static alt corrected to match, or they will read
as describing a different picture.

### 20586 `esa-email-mockup.jpg`: CONFLICT-SUBJECT

**Live alt:** "Research report cover"

**What the image shows** (opened): a mockup of an Empower Mississippi email on a
teal background. An orange ribbon reads "SAVE OUR" above large white "ESA"
lettering, then a photograph of a classroom (which is 20585, the same classroom
image), then two paragraphs of lorem ipsum, then the Empower Mississippi
wordmark. It is a template, not a sent email: the body is placeholder Latin.

| Page | Use | Static alt |
| --- | --- | --- |
| `final` | MEANINGFUL, **LIVE NOW** | "Research report cover" |
| `mail-a` | MEANINGFUL, pending | "An Empower Mississippi campaign email, headed Save Our ESA, above a photograph of a classroom." |

**Proposed:** "An Empower Mississippi campaign email headed Save Our ESA, above
a photograph of a classroom"

`mail-a`'s description is accurate and the live one is not: this is an email
template, not a report cover. Note for whoever writes it that the body text is
lorem ipsum, so calling it a real campaign is a small stretch either way, but
"campaign email" is a fair description of what is depicted.

### 20587 `classroom-students.jpg`: CONFLICT-SUBJECT

**Live alt:** "An adult and a child walking hand in hand across grass"

**What the photograph shows** (opened): seen from behind, **two** adults walking
a small girl between them, each holding one of her hands. One adult in a red
floral romper, the other in a teal shirt and navy shorts. All three barefoot on
a gravel path with grass either side. **No classroom.**

| Page | Use | Static alt |
| --- | --- | --- |
| `final` | MEANINGFUL, **LIVE NOW** | "An adult and a child walking hand in hand across grass" |
| `what-we-do-a` | MEANINGFUL, **LIVE NOW** | "An adult and a child walking hand in hand across grass" |
| `education` | MEANINGFUL, pending | "Two adults walking a small child along a path through a park, each holding one of her hands" |
| `amb-a` | MEANINGFUL, pending | "Two adults walking on a path, holding the hands of a small child between them." |

**Proposed:** "Two adults walking a small child along a path, each holding one
of her hands"

The count is settled at two adults, so the live alt is wrong on both the number
of people and the surface. `education`'s wording is accurate; the proposal drops
"through a park" only because the frame shows grass and trees without
establishing a park.

### 20579 `father-children-field.jpg`: CONFLICT-WORDING

**Live alt:** "Two adults and a child smiling together outdoors in a park"

**What the photograph shows** (opened): a man in a denim shirt and a woman in a
grey gilet, both crouching on grass in a park with trees behind, a young boy
resting on the man's shoulders. All three smiling towards the camera.

| Page | Use | Static alt |
| --- | --- | --- |
| `final` | MEANINGFUL, **LIVE NOW** (hero) | "Two adults and a child smiling together outdoors in a park" |
| `final` | MEANINGFUL, **LIVE NOW** (stories mini) | "Two adults and a child smiling together outdoors in a park" |
| `safety` | MEANINGFUL, pending | "A man with a small child on his shoulders and a woman beside them, smiling in a park" |
| `amb-a` | MEANINGFUL, pending | "Two adults crouching on the grass in a park, a small child on the man's shoulders, all three smiling." |

**Proposed:** "Two adults crouching on the grass in a park, a small child on the
man's shoulders, all three smiling"

Every existing sentence is true, so this is a choice of detail rather than a
correction. `amb-a`'s is the most informative and is adopted. The live alt is
not wrong, merely thin, so this row is safe to leave if time runs short.

### 20583 `grandparents-grandchild.jpg`: CONFLICT-WORDING

**Live alt:** "Two adults and a child smiling together outdoors in a park"

**What the photograph shows** (opened): **the same photograph as 20579**, framed
wider. Same man in the denim shirt, same woman in the grey gilet, same boy on
his shoulders, same park, same session.

This corrects something raised in the Task 9 pricing work, where 20579 and 20583
carrying identical live alt was flagged as a probable media-library defect. It
is not a defect: the two attachments genuinely depict the same scene, so the
identical sentence is correct. What IS wrong is the filename, which says
grandparents and grandchild where the photograph shows a young family.

| Page | Use | Static alt |
| --- | --- | --- |
| `final` | DECORATIVE (`.c2-panel`) | `""`, `aria-hidden` |
| `who-we-are-a` | MEANINGFUL, in flight | "Two adults and a child smiling together outdoors in a park" |
| `what-we-do-a` | DECORATIVE | `""`, `aria-hidden` |
| `solutions-b` | MEANINGFUL, **LIVE NOW** | "Two adults and a child smiling together outdoors in a park" |
| `safety` | MEANINGFUL, pending | "A mother, a father and their young son crouched together on the grass in a park, all three smiling" |
| `epic-a` | MEANINGFUL, **LIVE NOW** | "Two adults crouching on the grass in a park, a small child on the man's shoulders, all three smiling." |

**Proposed:** "Two adults crouching on the grass in a park, a small child on the
man's shoulders, all three smiling"

The same sentence as 20579, because it is the same picture.

`safety`'s wording should not be adopted: "a mother, a father and their young
son" asserts a family relationship the photograph cannot establish. That is the
clearest instance in the set of a description claiming more than it can see, and
it is worth correcting in `dist/safety.html` at conversion regardless of what is
written to the attachment.

### 20584 `girl-writing-bw.jpg`: CONFLICT-WORDING

**Live alt:** "An adult writing in a spiral notebook at an office desk, with a
monitor and keyboard visible, black and white"

**What the photograph shows** (opened): a young man in a dark t-shirt standing at
a desk, writing in a spiral notebook with a pen, a large monitor and keyboard
beside him and earbuds on the desk, in a strip-lit open-plan office. Black and
white. Same man and same room as 20582.

| Page | Use | Static alt |
| --- | --- | --- |
| `final` | MEANINGFUL, **LIVE NOW** | "An adult writing in a spiral notebook at an office desk, with a monitor and keyboard visible, black and white" |
| `who-we-are-a` | DECORATIVE, in flight | `""`, `aria-hidden` |
| `work` | MEANINGFUL, pending | "A young man standing at a desk writing in a notebook beside a computer" |

**Proposed:** "A young man writing in a spiral notebook at an office desk beside
a monitor and keyboard, in black and white"

Both existing sentences are accurate. The proposal merges them, taking "young
man" from `work` (the photograph supports it) and the notebook and desk detail
from the live value. Safe to leave as is if time runs short.

### 20585 `young-man-portrait-bw.jpg`: CONFLICT-WORDING

**Live alt:** "Students seated at desks in a classroom, facing an adult standing
near the front"

**What the photograph shows** (opened): a classroom seen from the back. Students
at desks in the foreground, one in a red hoodie with a camouflage backpack on
the chair, facing a man in a checked shirt standing at the front beside a
whiteboard and a projector screen. Alphabet cards along the wall. **In colour,
not black and white, and not a portrait.**

| Page | Use | Static alt |
| --- | --- | --- |
| `final` | MEANINGFUL, **LIVE NOW** | "Students seated at desks in a classroom, facing an adult standing near the front" |
| `who-we-are-a` | DECORATIVE, in flight | `""`, `aria-hidden` |
| `amb-a` | MEANINGFUL, pending | "A classroom seen from the back, students at their desks facing a teacher at the whiteboard." |

**Proposed:** "A classroom seen from the back, students at their desks facing a
teacher at the whiteboard"

Both are accurate. `amb-a`'s is adopted because it establishes the vantage
point, which is the first thing a listener needs. Safe to leave as is if time
runs short.

This is the attachment that proves the filename rule: two independent
descriptions, written by different people at different times, both say classroom,
and the file is called `young-man-portrait-bw`.

### 20597 `video-still-man-outdoors.jpg`: CONFLICT-WORDING

**Live alt:** "A young man standing outdoors in a field, smiling"

**What the photograph shows** (opened): a young man in a dark bomber jacket over
a grey top, arms folded, smiling and looking away from the camera, standing in a
field of dried teasels with trees behind, warm low light.

| Page | Use | Static alt |
| --- | --- | --- |
| `who-we-are-a` | MEANINGFUL, in flight | "A young man standing outdoors in a field, smiling" |
| `solutions-b` | MEANINGFUL, **LIVE NOW** | "A young man standing outdoors in a field, smiling" |
| `epic-a` | MEANINGFUL, **LIVE NOW** | "A young man standing outdoors in a field at golden hour, arms folded, looking away from the camera." |
| `amb-a` | MEANINGFUL, pending | "A young man standing outdoors in a field at golden hour, arms folded." |

**Proposed:** "A young man in a dark jacket standing in a field at golden hour,
arms folded, smiling"

There is no contradiction here at all: he is smiling AND his arms are folded.
The two readings are simply describing different halves of the same frame, and
one sentence carries both. Safe to leave as is if time runs short.

### 20600 `student-library.jpg`: SETTLED

**Live alt:** `""`

Both uses are on `who-we-are-a` and both are decorative (`alt=""` plus
`aria-hidden="true"` in the static build). Empty alt is correct and there is
nothing to decide.

### 20604 `epic-logo.png`: SETTLED, imported 2026-08-18

**Imported by Task 14**, the `epic-a` conversion, with
`wp media import wp-content/themes/empowerms-child/assets/epic-logo.png
--porcelain` from the synced theme. NO `--alt` flag, and the empty alt was read
back afterwards to confirm it. The file is at `assets/epic-logo.png`, not in
`assets/photography/`.

Its only use is `epic-a`'s hero mark, which is decorative in the static build
(`alt=""`, inside an `aria-hidden` ancestor), so empty alt is correct and there
is nothing to decide.

**A near miss worth recording**, because the next person searching for this file
will hit it too. The install already carried attachment 20239, post name `epic`,
title `EPIC`, file `2025/12/EPIC.png`. It is NOT this file: 1280x720 against
1021x399, 163371 bytes against 147323, and a different md5. It is an existing
empowerms.org asset, a padded social-card crop of the same mark, and using it
would have shipped the hero a differently proportioned logo that no instrument
in this project compares. Checked before importing, not after.

### `family-outdoors-park.jpg`: SETTLED, needs importing

**Not on the install.** Confirmed by searching the media endpoint.

**What the photograph shows** (opened): a boy in a purple school polo shirt,
smiling, reading an open book at a round wooden table, library shelves of
children's books behind him, several charity wristbands on his wrist.

Its only use is `education`'s stories band, and that page's static alt, "A boy in
a school polo shirt reading a book at a table in a library", is accurate. No
conflict exists because no other page uses it. Import it with that sentence.

## Summary

**3 attachments are SETTLED** and need no decision: `student-library` (20600),
`epic-logo.png` and `family-outdoors-park.jpg`. Two of those three are not yet on
the install and need importing, one with empty alt and one with the sentence
above.

**10 attachments need one sentence chosen**, all ten proposed above. Four of
those are wrong today rather than merely inconsistent, and one of the four
(20580, empty alt on `team-a`) is a live WCAG 1.1.1 failure. Five of the ten are
wording differences where every existing sentence is true, so they can be left
as they are without anything being incorrect.

**0 attachments need somebody to look at the photograph.** All thirteen files
were opened while writing this, and every dispute about what a picture shows is
resolved above: there is no tablet, there are two adults not one, it is an email
mockup not a report cover, and the office and the workshop are the same room
photographed twice.

So this is Paolo approving ten sentences, not a session with Empower. If time is
short, the four in the "wrong on the live site today" table are the ones that
matter; the other six are improvements to sentences that are already true.

# Photography selection from Empower's Drive folder

Written 2026-09-03, after Kienna's email handing over
`drive.google.com/drive/folders/1qQYdZU4rUVVn1EOfZeRdaB5bkT9XzHDn`.

**Status: shipped.** 41 photographs are in the media library with the alt
sentences below, and eleven converted pages carry them. Two of the three gates
below were closed by Paolo on 2026-09-03 (he approved the alt sentences, and
chose to ship the three soft bands rather than wait for masters). The third,
`safety`, is still open and still not mine to close.

Files live in `assets/photography/`. Never stage anything under that directory:
`syncTheme()` publishes all of it to the live web root, and an earlier version
of this change nearly published its own review page and a second copy of every
crop.

## What the folder actually contains

`*Professional Photos/Highlights` holds 90 JPEGs, and it is the only folder with
loose photographs of the kind the build needs. The other five top-level folders
are headshots, event, podcast and ambassador material, plus a licensed stock set.

The 90 are three separate shoots:

| Shoot | Frames | Content |
| --- | --- | --- |
| School | ~40 | Harper Learning Academy and two other classrooms. School leader portraits, teachers with small groups, students working |
| Small business and workplace | ~30 | A gift shop, a candle and bath goods maker, a warehouse and packing floor, product stills |
| Capitol | ~20 | Mississippi Capitol interior and exterior. Two advocates, portraits and conversation frames |

**There is no public safety photography in the pool at all.** Kienna already
said the public safety folder is slim and invited us to use Work photos instead.
That invitation is gate 2 below.

## Gate 1: resolution, and it is a real gap  [CLOSED: shipping soft]

Every file in the folder is capped at 1024px on the long edge (47 at 1024x768,
30 at 1024x1365, 13 at 1024x683). This is the stored original, not a download
artefact: local byte counts match Drive's own `fileSize` field exactly
(DSCF0460 = 123,265 bytes on both sides, and three more checked the same way).
These are web exports, not masters.

Measured against the real slot geometry (all 14 signed-off pages rendered at a
1440px viewport, every photographic `<img>` measured with
`getBoundingClientRect`), that ceiling is fine almost everywhere:

- 38 of the 41 slots land between 1.5x and 2x device pixels. Good.
- **Three do not.** The full-width story bands render at 1425px CSS wide:

  | Page | Slot | Best available | Device pixel ratio |
  | --- | --- | --- | --- |
  | education | `sol-stories__band` | 1024x439 | 0.72x |
  | work | `sol-stories__band` | 1024x439 | 0.72x |
  | solutions-b | `sb-stories__band` | 1024x268 | 0.72x |

  0.72x means the browser upscales by 39% at 1440px, and more on a larger
  monitor. It will look soft, and it is the biggest photograph on each page.

**Ask Empower for masters of the band images**, or for any three landscape
frames at 2800px or wider. Kienna offered exactly this ("happy to purchase
additional options if there are any gaps"). This is the gap.

## Gate 2: these are identifiable people, and placement makes claims  [OPEN]

Every usable frame in the pool shows identifiable individuals at identifiable,
named organisations: Harper Learning Academy signage and crest, the shop's own
retail branding, a named workplace. There is no anonymous imagery here beyond a
few product stills and two overhead shots of hands.

That is fine, and it is better than stock, on the education, work, capitol and
homepage slots, where the photograph illustrates the activity it depicts.

It is **not** automatically fine on `safety`. Kienna wrote: "feel free to use
some of the Work photos where they fit our rehabilitation and second-chances
work." The Work photos are the warehouse and packing floor: DSCF0323, DSCF0324,
DSCF0339, DSCF0329, DSCF0331, DSCF0332, DSCF0292, DSCF0295. Putting those faces
on a page about rehabilitation and second chances tells every reader that those
specific people have criminal convictions.

If that employer is a second-chance employer and the people photographed knew
that is what the photographs were for, this is straightforward and we should do
it. If Kienna simply meant the workplace imagery is thematically close, it is
not, and we would be publishing an unverifiable claim about named people.

**`safety`'s two slots are therefore left unfilled, and the question goes back
to Kienna.** Everything else is chosen.

## Gate 3: alt text, which is Paolo's standing rule  [CLOSED: approved 2026-09-03]

New photographs need new alt sentences. The rule on this branch is that no
session writes alt text, recorded in `elementor/pages/education/media.mjs` and
in `2026-08-18-alt-text-decisions.md` ("Paolo has ruled that no session runs
these writes, so nothing here is executed").

That rule blocks the whole swap, not just the deploy:

- Alt is a property of the attachment, not the use. It reaches the media library
  through `wp media import --alt` at the moment the attachment is created.
- Importing with an empty alt ships meaningful photographs as `alt=""`, a WCAG
  1.1.1 failure across 41 slots.
- Leaving the existing sentences in `src/` while swapping the files is worse:
  every sentence would then describe a photograph that is no longer there.

So `src/` markup is **not** rewritten either. Proposed sentences are below, in
the same shape the August document uses: proposals, awaiting one human yes.

## The selection

41 slots filled across 13 of the 14 signed-off pages (`podcast-a` and
`capitol-a` carry no photography; `safety` is held). Full machine-readable map:
`assets/photography/proposed-2026-09/crops.json`. Regenerate with `map.py`.

Crops are cut to each slot's exact measured aspect ratio, biased upward where a
face sits high in the frame, never upscaled, saved progressive at quality 82.
Every one was checked by eye against the object-fit trap: no cut faces.

Names describe the photograph, deliberately. The build's standing defect is that
`assets/photography/` filenames do not describe what is in the files, which has
already produced wrong alt text and wrong picks. These do not repeat it.

## Proposed alt sentences

One sentence per attachment, because one attachment serves every use.

| File | Proposed alt |
| --- | --- |
| school-leader-outside | A woman in a purple school blazer standing on a path outside the academy building |
| school-leader-crest | A woman in a purple school blazer standing in front of the academy crest |
| student-hand-raised | A girl in school uniform raising her hand at a classroom table |
| student-writing-overhead | Two children writing on lined paper at a yellow classroom table, seen from above |
| worksheet-overhead | A boy drawing a diagram on a worksheet, seen from above |
| classroom-small-group | A girl raising her hand while classmates write at a shared table |
| teacher-student-desk | A teacher in a purple shirt sitting beside a smiling student at a classroom table |
| teacher-with-student | A teacher and a student standing together in front of a school mission statement |
| teacher-at-whiteboard | A teacher writing a maths diagram on a whiteboard while students work |
| teacher-smartboard | A teacher working through a maths problem on a smartboard with her class |
| teacher-small-group-wide | Two teachers helping several children with written work at a classroom table |
| teacher-yellow-portrait | A teacher in a yellow cardigan standing in a school corridor |
| students-working-quietly | Two students working at laptops and notebooks in a classroom |
| shop-owner-portrait | A shop owner standing at the counter of her gift shop |
| shop-owner-standing | A shop owner standing beside shelves of stock in her shop |
| shop-owner-counter | A shop owner leaning on the counter of her gift shop |
| gift-boxes-detail | Wrapped gift items in tissue paper arranged in a bowl |
| hands-with-product | A worker’s hands fitting a printed label to a product lid |
| maker-with-laptop | A woman holding a laptop in a production room lined with storage crates |
| worker-at-bench | A woman trimming material at a packing bench |
| worker-labelling | A woman winding a roll of printed labels at a work table |
| worker-labelling-wide | A woman winding a roll of printed labels at a work table |
| worker-sorting-table | A woman filling a box at a packing table |
| worker-packing-smiling | A woman cutting material at a packing bench |
| warehouse-worker-pallet | A man standing with a pallet truck in a warehouse aisle |
| warehouse-worker-aisle | A man standing with a pallet truck between warehouse racks |
| two-workers-boxes | Two workers standing beside stacked boxes on a warehouse floor |
| advocate-capitol-portrait | A man standing in the Capitol rotunda |
| advocate-outdoors | A man standing outdoors under trees |
| advocate-portrait-blue | A woman standing at the balustrade inside the Capitol |
| two-advocates-portrait | A woman and a man standing together inside the Capitol |
| advocates-in-conversation | A man and a woman talking beside a rail inside the Capitol |
| advocates-in-conversation-wide | A man and a woman talking beside a rail inside the Capitol |
| advocates-capitol-rail | A man and a woman talking across a rail inside the Capitol |
| advocates-capitol-hall | A man and a woman talking in a Capitol corridor |
| advocates-capitol-steps | A man and a woman talking outside the Capitol |
| advocates-outside-capitol | A man and a woman talking on the Capitol steps |

Two pairs are deliberately identical (`worker-labelling` / `-wide`,
`advocates-in-conversation` / `-wide`): same frame, different crop, so the same
sentence is correct for both.

None of these describe anyone by name, because the folder does not name anyone
and no session should guess.

## What was actually done, and the one trap in it

1. Crops into `assets/photography/`; `src/` rewritten, 43 `<img>` tags across 23
   files. Decorative `aria-hidden` images keep `alt=""`.
2. `elementor/import-photography.mjs --import`: syncs the theme, then imports
   with `--alt`, then reads every id, url and alt back off the install. 41 of 41
   verified. Manifest: `elementor/photography-2026-09.json`.
3. `elementor/deploy-photography.mjs --deploy`: eleven pages, with a preflight
   that refuses to deploy if any attachment is missing from the install.

**THE TRAP, and it cost a second deploy.** A page's photographs are NOT all
reachable by grepping `photo('name')`. Half of them are data-driven:

    const ROWS = [{ modifier: '...', photo: 'child-classroom-tablet' }, ...]
    ...ROWS.map(r => image({ ...photo(r.photo) }))

Twenty-one references are literal and twenty are `photo: 'name'` inside a data
array. The first pass renamed only the literals, so eleven pages deployed with
half their photographs new and half still 2026/08, which every test passed and
which only showed up when the deployed `_elementor_data` was read back off the
install and counted. **Grep for BOTH `photo('` and `photo: '` before believing a
count**, and verify against the deployed data rather than against the source.

## Verifying this from a machine, without a browser

The install sits behind Cloudflare bot protection: `urllib` gets 403 on the
user-agent, and so does `curl`, even with a browser UA. Do not try to get around
it. Read the deployed `_elementor_data` over wp-cli instead, which is what
caught the trap above:

    wp db query "SELECT post_id, meta_value FROM wp_postmeta
                 WHERE meta_key='_elementor_data' AND post_id IN (...)"

Count `uploads/2026/09/` against `uploads/2026/08/` per page. The only pages that
should still hold 2026/08 photographs are `safety` and `landing`.

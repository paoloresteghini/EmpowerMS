import { container, text } from '../../factory.mjs';

/* Source of truth: dist/safety.html, the <section class="sol-grid"> block
   (lines 268-308) and the comment above it (262-267). Every class, string and
   attribute below is read from that file, not typed from memory.

   THIS IS THE SECTION THE UNIT'S TWO EXCEPTIONS LIVE IN, and it is built so
   neither is awkward to add. css/solution.css:16-19 states the contract and
   test.mjs asserts it: `work` carries FIVE `.sol-lit` cards where this page
   carries four, and `education` alone appends `.sol-grid__closer`
   (css/solution.css:268-277) after the list. The four cards below are built
   from a data array mapped over, so the `work` fill adds a fifth entry and
   nothing else; the closer is a sibling of `.sol-grid__list` inside the same
   `.em-container`, so the `education` fill appends one container after the
   list and nothing else.

   Structural decisions:

   1. CONTAINERS ARE 'full' THROUGHOUT, the reason 01-hero.mjs note 1 records.

   2. `.sol-grid__head` IS A GRID AND NEEDS NOTHING, and the reason is the one
      03-problem.mjs note 2 gives rather than the one 02-vision.mjs note 3
      gives. css/solution.css:201-204 makes it a two-column grid, and neither
      of its two children carries a `grid-column`: the <h2> auto-places into
      column 1 and `.sol-grid__intro` into column 2, on both sides, because the
      widget wrapper occupies exactly the position the heading occupied. The
      900px media query at :258-260 collapses it to one column, which is a
      property of the container itself and travels untouched.

   3. `.sol-grid__intro` IS A CONTAINER WITH TWO text() CHILDREN, and it costs
      the second half of this page's prose repair. css/solution.css:212 is
      `.sol-grid__intro p:last-child{margin-bottom:0}`, written for the last of
      two real siblings; converted, each paragraph is the only child of its own
      widget, satisfies `p:last-child` at 0,2,1, beats `.sol-grid__intro p` at
      0,2,0 and takes the zero. `.sol-grid__lede` loses its own 24px the same
      way, because :213 is also 0,2,0. Repaired in bridge.css block 28, the
      grouped prose block give-c opened and this page joins; 03-problem.mjs
      note 3 records the shape and why it is not podcast-a's.

      NO MARGIN-COLLAPSING REPAIR HERE, walked pairwise before the page was
      deployed rather than after it was measured: the lede's 24px bottom margin
      meets a second paragraph whose top margin is 0, so static pays
      max(24,0) = 24 and the converted flex column pays 24 + 0 = 24. That is
      the check 03-problem.mjs's own copy block fails, and this one passes.

   4. THE `<ol>` AND ITS FOUR `<li>` BECOME `<div>`, the semantic loss
      04-caps.mjs note 3 records in full, and the four cards are CONTAINERS
      WITH text() CHILDREN for the reason 04-caps.mjs note 4 gives: sixteen
      pieces of editable prose live in them.

   5. `.sol-lit` NEEDS NOTHING, checked rather than assumed. It is a flex
      column in the static build BY ITS OWN DECLARATION (css/solution.css:230),
      so it is flex on both sides, margins were never collapsing inside it, and
      Elementor's container default agrees with the declared direction. None of
      its four children carries a flex-item property: `.sol-lit__label` (:237),
      `.sol-lit h3` (:242), `.sol-lit__body` (:247) and `.sol-lit__toward`
      (:252) declare margins, padding and a border only, and every one of them
      reaches its real element through a class or a descendant selector that
      the widget wrapper does not break. So the tenth category, which costs
      04-caps.mjs a rule one section earlier on an element that looks the same,
      costs nothing here.

   6. `.sol-lit h3` IS ADDRESSED BY TAG THROUGH A DESCENDANT SELECTOR, not by
      class, so the heading has to stay an <h3> and it does: the markup string
      carries the real tag. The <strong> inside `.sol-lit__toward` is part of
      the same string for the same reason, :256 styling it as a descendant.

   7. `id="issues-title"` is authored in the markup, per 01-hero.mjs note 5.

   8. THE SOURCE COMMENT ABOVE THE SECTION (262-267) is carried at the top of
      the heading's markup, per 01-hero.mjs note 7. */

const NOTE = '<!-- Back to the dark, and the four work areas as four lit cards on it: a soft\n'
  + '     highlight in the top corner of each, an orange rule across the top, the\n'
  + '     commitment in --orange-300 (5.44:1 on navy). Four lights in a dark street.\n'
  + '\n'
  + '     Second half of this variation’s signature. Variation A stands the same four\n'
  + '     up as capped white posts on a light page; nothing here repeats that. -->';

const HEAD = 'Safety Creates the Foundation for Opportunity';
const LEDE = 'Safe communities don’t happen through one solution alone. They require effective law '
  + 'enforcement, strong families, a fair justice system, and opportunities for people to build stable lives.';
const INTRO = 'We’re advancing research and practical solutions that help make Mississippi communities '
  + 'safer and stronger.';

/* Verbatim from dist/safety.html:279-306, in source order. `&amp;` is the
   source's own escaping and is reproduced rather than resolved: census() keys
   on the element's rendered text, which is the same either way, but the
   markup this build writes should be the markup the build wrote. */
const CARDS = [
  {
    label: 'Crime Prevention &amp; Public Safety',
    head: 'Safety Starts With Solutions That Work',
    body: 'Reducing crime requires understanding where and why it happens and focusing resources on strategies that make communities safer.',
    toward: 'Using research, data, and partnerships with law enforcement and community leaders to advance effective approaches to crime reduction.',
  },
  {
    label: 'Effective Justice',
    head: 'Safety and Fairness Go Hand in Hand',
    body: 'A strong justice system should protect communities, hold people accountable, and ensure laws are clear, fair, and consistently applied.',
    toward: 'Advancing justice policies that strengthen public safety, protect due process, and build confidence in the justice system.',
  },
  {
    label: 'Second Chances &amp; Reentry',
    head: 'A Second Chance Should Lead Somewhere',
    body: 'Most people who enter prison will eventually return home. Successful reentry helps people find work, rebuild their lives, and become contributing members of their communities.',
    toward: 'Expanding pathways to employment and successful reentry that reduce repeat crime and help build safer communities.',
  },
  {
    label: 'Strong Families &amp; Communities',
    head: 'Strong Communities Start With Strong Foundations',
    body: 'Stable families and connected communities play an important role in creating environments where people can thrive and neighborhoods can flourish.',
    /* The em dash below is SOURCE COPY, reproduced byte for byte from
       dist/safety.html:304. This repository's rule against em dashes governs
       what this build writes, not what an already approved page says; the same
       distinction capitol-a/03-library.mjs note 5 makes about its own
       data-cms-note. */
    toward: 'Better understanding the connection between family stability, community strength, and public safety—and advancing solutions that help strengthen those foundations.',
  },
];

const TOWARD_LABEL = 'What We’re Working Toward:';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'sol-grid',
      content_width: 'full',
      _attributes: 'aria-labelledby|issues-title',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container(
          { cssClass: 'sol-grid__head', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            text({
              markup: `${NOTE}\n<h2 id="issues-title">${HEAD}</h2>`,
              _attributes: 'data-reveal|rise',
            }),
            container({ cssClass: 'sol-grid__intro', content_width: 'full' }, [
              text({ markup: `<p class="sol-grid__lede">${LEDE}</p>`, _attributes: 'data-reveal|rise' }),
              text({ markup: `<p>${INTRO}</p>` }),
            ]),
          ],
        ),
        container(
          { cssClass: 'sol-grid__list', content_width: 'full', _attributes: 'data-reveal-group|' },
          CARDS.map((card) => container(
            { cssClass: 'sol-lit', content_width: 'full', _attributes: 'data-reveal|rise' },
            [
              text({ markup: `<p class="sol-lit__label">${card.label}</p>` }),
              text({ markup: `<h3>${card.head}</h3>` }),
              text({ markup: `<p class="sol-lit__body">${card.body}</p>` }),
              text({ markup: `<p class="sol-lit__toward"><strong>${TOWARD_LABEL}</strong> ${card.toward}</p>` }),
            ],
          )),
        ),
      ]),
    ],
  );
}

import { container, text, html } from '../../factory.mjs';

/* Source of truth: src/option-d/sections/02-solutions.html. The homepage is a
   per-section combination, so this section comes from option-d's directory
   rather than final's; see page.mjs.

   THE ORDERED LIST IS AN html() WIDGET, AND THIS IS THE FIRST TIME THAT
   EXCEPTION HAS BEEN USED FOR SEMANTICS RATHER THAN FOR INLINE SVG.

   The Empower Solutions Model is an <ol> of five <li>, each carrying a
   decorative dot <span>, a number <span> and a body <div>. Elementor's
   container html_tag control offers div, header, footer, main, article,
   section, aside, nav and a. It offers neither ol nor li. So a native
   conversion of this block produces five divs inside a div, and a screen
   reader that announced "list, 5 items" and "item 2 of 5" announces nothing at
   all. The five steps are a sequence whose order carries meaning (define the
   problem, then research, then craft, then advocate, then implement), which is
   exactly what an ordered list is for and exactly what is lost.

   That puts it squarely in the category the spec reserves html() for: markup
   Elementor cannot express, rather than markup Elementor expresses slightly
   differently. The alternative considered and rejected was a div tree carrying
   role="list" and role="listitem" attributes through Custom Attributes, which
   would restore the announcement but leaves the document semantically wrong for
   anything that reads the markup rather than the accessibility tree, and costs
   two custom attributes per node on six nodes to emulate two HTML tags.

   Checked before choosing: css/option-d.css has no child-combinator rule
   anywhere in this section (its only `>` rule is `.tl-stories__stage>img`,
   which belongs to a different section on a different page), so putting the
   <ol> inside a widget wrapper cannot break a selector that expected it to be a
   direct child of .em-container. That check is the reason this is safe, not an
   assumption that it would be.

   The reveal attributes survive because html() passes markup through unaltered:
   data-reveal-group on the <ol> and data-reveal="rise" on each <li> are in the
   markup string below exactly as authored, so js/reveal.js and css/motion.css
   see what they saw in the static build. */

const HEADLINE = 'The future you want starts with opportunity.';
const LEDE = 'Every family, worker, and community faces unique challenges, but lasting progress begins with practical solutions. We listen to the people affected, research what works, and partner with communities and leaders to create more opportunity across Mississippi.';
const LABEL = 'Empower Solutions Model';

/* The five steps, kept as data so the markup below is generated rather than
   typed five times with three of them subtly different. Copy read from the
   partial verbatim, em dash and all: "here in Mississippi and in states that
   have already moved" is preceded by one in the source, and this build's own
   rule against em dashes governs what we write, not what the approved copy
   already says. Changing approved copy to satisfy a house style would be a
   content edit smuggled in as a conversion. */
const STEPS = [
  ['01', 'Define the problem', 'We start with the people affected, so the problem we set out to solve is the one Mississippians actually face.'],
  ['02', 'Conduct research', 'We research what works — here in Mississippi and in states that have already moved.'],
  ['03', 'Craft policy solution', 'We turn that research into a practical solution that can pass and can work.'],
  ['04', 'Advocate for change', 'We partner with communities and leaders to build support and move the idea forward.'],
  ['05', 'Policy implementation', 'We stay with it through implementation, then measure what changed for families.'],
];

const stepMarkup = ([num, title, body]) =>
  `<li class="tl-node" data-reveal="rise">
        <span class="tl-node__dot" aria-hidden="true"></span>
        <span class="tl-node__num">${num}</span>
        <div class="tl-node__body">
          <h3>${title}</h3>
          <p>${body}</p>
        </div>
      </li>`;

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'tl-change',
      content_width: 'full',
      _attributes: 'aria-labelledby|change-title',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container(
          { cssClass: 'tl-change__head', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            text({
              markup: `<h2 id="change-title">${HEADLINE}</h2>`,
              _attributes: 'data-reveal|rise',
            }),
            text({
              markup: `<p class="tl-lede">${LEDE}</p>`,
              _attributes: 'data-reveal|rise',
            }),
          ],
        ),
        text({
          markup: `<p class="tl-label">${LABEL}</p>`,
          _attributes: 'data-reveal|rise',
        }),
        html({
          markup: `<ol class="tl-line" data-reveal-group>
      ${STEPS.map(stepMarkup).join('\n      ')}
    </ol>`,
        }),
      ]),
    ],
  );
}

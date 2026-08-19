import { container, text, html } from '../../factory.mjs';

/* Source of truth: dist/team-bio.html, the <section class="tp-profile"> block
   (lines 178-232 for the aside, 234-247 for the copy column). Every class,
   string and attribute below is read from that file, not typed from memory.

   Structural decisions:

   1. CONTAINERS ARE 'full' THROUGHOUT, for the reason every prior section
      module records: a boxed container inserts div.e-con-inner between itself
      and its children, and `.tp-profile__grid` (css/team-bio.css:25-26) is a
      two-track CSS grid, so an inserted wrapper would leave one grid item
      holding both columns.

   2. `.tp-profile__grid` AND `.em-container` ARE ONE DIV, matching source
      (`<div class="tp-profile__grid em-container">`), a single element
      carrying both classes in that order. Its two children are CONTAINERS
      rather than widgets, which is what keeps the grid working: they are the
      real grid items, and `@media (max-width:900px)`'s single-column
      restatement (:142) addresses the grid itself.

   3. `.tp-back` IS ONE html() WIDGET, not a link(). The anchor holds an inline
      <svg> which css/team-bio.css:35 sizes and :37 animates on `:hover`, and
      link() has no way to put an element inside the anchor at all. Under
      link() the class would also land on the wrapper div, so :31's
      `display:inline-flex` and :32's `margin-bottom` would describe a div
      rather than the anchor the design wrote them for.

      IT KEEPS `a|Team, Board & Fellows` IN controlBoxes(), which the
      link() route loses to that sweep's own `.elementor-widget-button` skip.
      This page has two anchors with that exact text (this one and
      `.tp-more__link`), and both survive as themselves.

   4. `href="team-a.html"` IS PRESERVED VERBATIM, not remapped to
      `/team-a/`. This is elementor/pages/team-a/02-staff.mjs's own recorded
      policy applied in the opposite direction: that module preserves
      `href="team-bio.html"` because the source markup still reads it and the
      hand-off remap is future work rather than this conversion's. The same
      instruction is written into this page's own source, in the comment
      reproduced below ("At hand-off they become /about/team, and this page
      becomes /about/team/grant-callen"), so nothing here invents a route
      that does not exist yet. Recorded rather than silent, because the link
      does 404 on the install today, exactly as `team-a`'s nine staff cards
      already do.

   5. `.tp-frame` IS ONE html() WIDGET AND IT CANNOT BE A CONTAINER.
      Elementor cannot render a <figure>: `Utils::validate_html_tag`
      (wp-content/plugins/elementor/includes/utils.php:786) falls back to
      'div' for any tag outside ALLOWED_HTML_WRAPPER_TAGS (:28), and that
      list holds a, article, aside, button, form, div, footer, h1 to h6,
      header, main, nav, p, section and span, and no figure. Read off the
      install by who-we-are-a/04-people.mjs on 2026-08-18 and not re-guessed
      here.

      NO image() WIDGET, AND THAT IS A CONTENT FACT RATHER THAN A CSS ONE.
      There is no photograph inside <main> at all: source line 186 is a
      `<span class="tp-portrait" data-placeholder="headshot" aria-hidden="true">`
      holding a two-letter monogram, because Empower have not supplied
      headshots. So the recipe's "every photograph is an image()" rule has
      nothing to bind to here, and the blob puts no photograph beyond
      Empower's reach. THE MOMENT A REAL HEADSHOT ARRIVES THIS PAGE NEEDS
      RE-PRICING: css/team-bio.css:43-46 puts `aspect-ratio:4/5` on the
      CONTAINER, which is the fixed-ratio-container shape that has already
      cost a rule on three pages, and the swap would also want an image()
      widget rather than raw markup.

   6. `.tp-contact` IS ONE html() WIDGET. Its three rows are anchors holding
      an inline <svg> each, and :86-87 restyles those icons on the anchor's
      `:hover`, so the svg has to be a real descendant of the anchor. The
      <ul>/<li> also reach the page as themselves, which Elementor's
      container html_tag control could not produce (no ul, no li in the
      allowed list above). No photographs are inside it, so nothing is put
      beyond the media library's reach.

   7. `data-placeholder` SURVIVES ON BOTH ELEMENTS, authored inside the two
      blobs exactly as source writes it: `headshot` on `.tp-portrait`,
      `contact` on `.tp-contact`. Nothing reads them at runtime; they are the
      build's own marker for content Empower has not supplied, and losing
      them would quietly turn a flagged placeholder into what looks like
      finished work.

   8. THE SOURCE'S HTML COMMENTS ARE CARRIED, VERBATIM, AND THIS MODULE IS
      WHERE THREE OF THE FOUR LIVE. A comment cannot ride on a container:
      containers are assembled from JSON and Elementor renders their markup
      itself. It CAN ride inside an html() widget, because that widget's
      content reaches the page unaltered, so each comment is authored at the
      nearest authorable point to where source puts it:

        dist/team-bio.html:168-177  the portrait placeholder and the review
                                    links note. Source puts it immediately
                                    inside <main>, above <section>, where
                                    nothing is authorable. It goes at the top
                                    of BACK below, which is the first
                                    authorable point on the page.
        dist/team-bio.html:191-198  the instruction to whoever builds the
                                    other nine bios. Source puts it
                                    immediately before `.tp-contact`; it goes
                                    at the top of CONTACT below, one wrapper
                                    div further in and otherwise in place.
        dist/team-bio.html:200-202  the "a <p>, not a heading" note. Already
                                    inside `.tp-contact`, so it is simply
                                    part of CONTACT and does not move at all.

      The fourth (dist/team-bio.html:249-251) belongs to the second section
      and is handled in 02-more.mjs. All four are reproduced byte for byte,
      including their curly quotation marks and the one em dash in the
      2026-08-05 note: these are the build's own bytes, and a comment that
      has been retyped is no longer the instruction it was written as.

   9. THE TWO BIO PARAGRAPHS ARE TWO text() WIDGETS AND THE PAGE PAYS TWO
      BRIDGE REPAIRS FOR IT. Paolo's ruling of 2026-08-18, recorded in
      docs/elementor/phase2b/2026-08-18-repricing-after-four-pages.md under
      "Prose blocks: keep paragraph widgets and pay the repairs": one text()
      per paragraph, because editability is the whole argument for
      class-in-markup and prose is what Empower will edit. This is the page
      the argument is strongest on: the roadmap has ten bios and nine more
      will be cut from this one, so the paragraphs are the part that changes
      every time.

      WHAT IT COSTS, and it is TWO repairs on ONE element failing in opposite
      directions. css/team-bio.css:114 is `.tp-bio p:last-child{margin-bottom:0}`
      and :116 is `.tp-bio p:first-child{font-size:clamp(...);color:var(--text-strong)}`,
      both written for two real siblings. Converted, each paragraph is the
      only child of its own widget wrapper, so BOTH satisfy both selectors at
      0,2,1, beat :112 at 0,2,0, and every paragraph loses its bottom margin
      AND takes the opening paragraph's larger, darker treatment. Repaired in
      bridge.css's `.tp-bio` block, in block 1's and block 28's shape (the
      definite value on the PARAGRAPH, the widget set used only for the
      position test) rather than podcast-a's `:not(:last-child)`-on-the-
      wrappers shape, for the reason block 28 records: MailMunch injects a
      hidden div inside a widget on this install and has changed what a
      selector matches on four occasions now.

  10. `.tp-profile__actions` IS ONE html() WIDGET CARRYING THE WHOLE <div>,
      which is Route A of the two the brief priced. Route B would be a
      container plus a link(). Four reasons, in the order they were weighed,
      and the fourth is what Route A does NOT avoid:

      FIRST, Route B costs a repair and Route A costs none of this kind.
      `.tp-profile__actions` (css/team-bio.css:118) declares only a
      `margin-top`: no `align-items`, so under Route B the link()'s `.em-btn`
      wrapper becomes a flex item of a column container, `align-items`
      resolves to `stretch`, and the pill becomes a full-width bar. That is
      Shape C, and epic-a paid it as bridge.css block 19.

      SECOND, comparison keys. Route A keeps `a|Support Our Work` in
      controlBoxes(), which skips any anchor inside `.elementor-widget-button`
      by design. That loss is the SILENT one: recipe section 7 records the
      census half of the same cost and this is the half nothing prints.

      THIRD, layoutInvariants() keys every element by its own class tokens,
      so under Route B the key `em-btn.em-btn--lg.em-btn--primary` would name
      a <div> live and an <a> static, comparing two elements that are not the
      same element. That is the trap amb-a/01-hero.mjs note 1 records.

      FOURTH, `.tp-profile__actions` contains no prose. It is a bare layout
      wrapper around a single anchor, which is exactly the case where a blob
      loses nothing Empower would want to edit as text.

      WHAT IT COSTS, stated so the trade is legible: the link stops being
      retargetable from Elementor's own panel, the same cost `.gvc-give__act`
      (give-c), `.mla-receive__back` (mail-a), `.wa-jump` (who-we-are-a),
      `.ta-jump` (team-a), `.sb-more` (solutions-b) and `.aba-hero__act`
      (amb-a) already accepted.

      AND WHAT IT DID NOT AVOID, which is the ninth cost category arriving on
      its second page. Route A makes this anchor reach the page as an <a>
      carrying `.em-btn--primary`, and `components/components.css:11` gives
      that class `box-shadow:var(--shadow-sm)` at 0,1,0 where Elementor's
      `.elementor a{box-shadow:none;text-decoration:none}` sits at 0,1,1.
      give-c's CTA was the first converted anchor in the build to be in that
      position and this is the second. Repaired in bridge.css's
      `.tp-profile__actions` block, WITH its mandatory `:focus-visible`
      companion. Route B would have dodged it by accident, by putting the
      class on a div; that is not a reason to prefer it, because the defect
      is in Elementor's reset rather than in this page, and Route B pays a
      real repair to avoid it.

  11. `data-reveal` PLACEMENT. Inside the three blobs it is authored in the
      markup exactly where source puts it (on the `.tp-back` anchor, on the
      `.tp-frame` figure, on the `.tp-contact` div), because those elements
      reach the page as themselves. On the two text() widgets it goes on the
      widget wrapper through `_attributes`, which is the established
      convention: js/reveal.js:23 resolves each element's group with
      `el.closest('[data-reveal-group]')`, and the wrapper is inside the
      container just as the paragraph is. `data-reveal-group` goes on the two
      column containers and `data-reveal-entrance` on the section, both
      through `_attributes`, matching source. The stagger index
      js/reveal.js:24-28 assigns is document order within a group, and the
      order of `[data-reveal]` elements is unchanged by any of this. */

/* Verbatim from dist/team-bio.html:168-177 and :181-184. The comment is the
   build's own instruction to whoever swaps in the real headshot, and this is
   the first authorable point inside <main>. */
const BACK = '<!-- PLACEHOLDER: the portrait is a monogram tile standing in for the headshot.\n'
  + '     Swap span.tp-portrait for a 4:5 image tag (with width, height, alt and\n'
  + '     fetchpriority="high", since it is the page’s main image) and delete its\n'
  + '     data-placeholder attribute.\n'
  + '\n'
  + '     REVIEW LINKS: the back links point at team-a.html so the review site works\n'
  + '     when a card is clicked. At hand-off they become /about/team, and this page\n'
  + '     becomes /about/team/grant-callen.\n'
  + '\n'
  + '     Every word below is the roadmap’s Team tab, both paragraphs, unedited. -->\n'
  + '<a class="tp-back" href="team-a.html" data-reveal="rise">\n'
  + '  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H6M11 6l-6 6 6 6"/></svg>\n'
  + '  Team, Board &amp; Fellows\n'
  + '</a>';

/* Verbatim from dist/team-bio.html:185-189. */
const FRAME = '<figure class="tp-frame" data-reveal="clip">\n'
  + '  <span class="tp-portrait" data-placeholder="headshot" aria-hidden="true">\n'
  + '    <span class="tp-portrait__mono">GC</span>\n'
  + '  </span>\n'
  + '</figure>';

/* Verbatim from dist/team-bio.html:191-231, comments included. The em dash on
   the second line and the curly apostrophes are the source's own bytes. */
const CONTACT = '<!-- 2026-08-05, Empower: Grant keeps email, LinkedIn and X. Every OTHER\n'
  + '     staff bio gets the email row only — copy this block, delete the\n'
  + '     LinkedIn and X list items, and the block sizes itself to what is\n'
  + '     left.\n'
  + '\n'
  + '     PLACEHOLDER: the values below are still Empower’s ORGANISATION inbox\n'
  + '     and accounts, because Grant’s own address and handles have not been\n'
  + '     supplied. Swap the three hrefs and delete the note under them. -->\n'
  + '<div class="tp-contact" data-placeholder="contact" data-reveal="rise">\n'
  + '  <!-- A <p>, not a heading: this block sits ABOVE the h1 in source order,\n'
  + '       and an h2 before the page’s own title is a broken outline for the\n'
  + '       sake of one label. -->\n'
  + '  <p class="tp-contact__title">Get in touch</p>\n'
  + '  <ul class="tp-contact__list">\n'
  + '    <li>\n'
  + '      <a href="mailto:info@empowerms.org">\n'
  + '        <span class="tp-contact__icon" aria-hidden="true">\n'
  + '          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3.5 6.5 8.5 6 8.5-6"/></svg>\n'
  + '        </span>\n'
  + '        info@empowerms.org\n'
  + '      </a>\n'
  + '    </li>\n'
  + '    <li>\n'
  + '      <a href="https://www.linkedin.com/company/empowerms">\n'
  + '        <span class="tp-contact__icon" aria-hidden="true">\n'
  + '          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.94 8.5H4.2V20h2.74V8.5ZM5.57 4a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2ZM20 13.9c0-3.1-1.66-4.55-3.87-4.55-1.79 0-2.59.99-3.03 1.68V8.5H9.36c.04 1 0 11.5 0 11.5h2.74v-6.42c0-.25.02-.5.09-.68.2-.5.65-1.01 1.42-1.01 1 0 1.4.77 1.4 1.9V20H20v-6.1Z"/></svg>\n'
  + '        </span>\n'
  + '        LinkedIn\n'
  + '      </a>\n'
  + '    </li>\n'
  + '    <li>\n'
  + '      <a href="https://x.com/empowerms">\n'
  + '        <span class="tp-contact__icon" aria-hidden="true">\n'
  + '          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.6 4h2.7l-5.9 6.7L21 20h-5.3l-4.1-5.4L6.8 20H4.1l6.3-7.1L3.5 4h5.4l3.8 5 4.9-5Zm-.9 14.3h1.5L8.2 5.6H6.6l10.1 12.7Z"/></svg>\n'
  + '        </span>\n'
  + '        X\n'
  + '      </a>\n'
  + '    </li>\n'
  + '  </ul>\n'
  + '  <p class="tp-contact__pending">Placeholder: Empower’s organisation inbox and accounts, until Grant’s own are supplied.</p>\n'
  + '</div>';

/* Verbatim from dist/team-bio.html:243-245, plus the comment source puts
   between the two sections (:249-251). That comment introduces `.tp-more` and
   source places it after `</section>`, where nothing is authorable; this
   widget is the last authorable point before the second section begins, which
   is the nearest position available to it. */
const ACTIONS = '<div class="tp-profile__actions" data-reveal="rise">\n'
  + '  <a class="em-btn em-btn--primary em-btn--lg" href="/donate">Support Our Work</a>\n'
  + '</div>\n'
  + '<!-- One bio page exists. The other nine staff cards point here too, so this\n'
  + '     strip is the way back out of it; when the remaining nine are built each\n'
  + '     card gets its own destination and this section stays as it is. -->';

/* The curly apostrophes and quotation marks below are the source's, reproduced
   byte for byte rather than normalised: census() keys on the element's own
   text, so a straight quote would take the paragraph out of the shared set. */
const BIO_1 = 'Grant is a sixth generation Mississippian who grew up in Laurel. He founded Empower '
  + 'Mississippi in 2014 as a solution center, tackling Mississippi’s biggest challenges so everyone '
  + 'can rise. Previously, Grant served as Director of Development for the Mississippi Center for '
  + 'Public Policy. He is an alumnus of The Witherspoon Fellowship in Washington D.C.';
const BIO_2 = 'Grant graduated with a B.A. in Political Science from Belhaven University and was '
  + 'selected as their “Young Alumnus of the Year” in 2009. Grant earned an M.A in Government from '
  + 'Regent University. Grant has been named to the Top 50 Most Influential Mississippians list by '
  + 'Y’all Politics. Grant currently lives in Madison with his wife Page and their five children. '
  + 'Grant and Page are members of Redeemer Church, PCA, where Grant serves as an elder.';

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'tp-profile',
      content_width: 'full',
      _attributes: 'aria-labelledby|bio-title\ndata-reveal-entrance|',
    },
    [
      container({ cssClass: 'tp-profile__grid em-container', content_width: 'full' }, [
        container(
          { cssClass: 'tp-profile__aside', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            html({ markup: BACK }),
            html({ markup: FRAME }),
            html({ markup: CONTACT }),
          ],
        ),
        container(
          { cssClass: 'tp-profile__copy', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            text({ markup: '<h1 id="bio-title">Grant Callen</h1>', _attributes: 'data-reveal|rise' }),
            text({ markup: '<p class="tp-role">Founder &amp; CEO</p>', _attributes: 'data-reveal|rise' }),
            container({ cssClass: 'tp-bio', content_width: 'full' }, [
              text({ markup: `<p>${BIO_1}</p>`, _attributes: 'data-reveal|rise' }),
              text({ markup: `<p>${BIO_2}</p>`, _attributes: 'data-reveal|rise' }),
            ]),
            html({ markup: ACTIONS }),
          ],
        ),
      ]),
    ],
  );
}

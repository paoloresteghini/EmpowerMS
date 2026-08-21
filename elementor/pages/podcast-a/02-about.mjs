import { container, text } from '../../factory.mjs';

/* Source of truth: src/podcast-a/sections/02-about.html. Every class, string
   and attribute below is read from that partial, not typed from memory.

   Structural decisions this module makes and why:

   1. Every container is content_width: 'full', for the same reason
      01-hero.mjs gives (see that file's own note 1): a boxed container
      inserts div.e-con-inner between itself and its children, and nothing
      in this section wants Elementor's own boxed max-width, since
      .em-container already supplies the width constraint from
      tokens/base.css.

   2. The section's aria-labelledby="about-title" carries through as
      _attributes on the outer container, same mechanism as 01-hero.mjs's
      note 6: written "key|value" because Elementor's Custom Attributes
      control always quotes every value (Utils::render_html_attributes()),
      and this one has a real value so the empty-value case does not apply.
      data-reveal-group is written "key|" (empty value) for the same reason
      note 6 documents: it renders data-reveal-group="", which every
      presence-only selector in css/motion.css and js/reveal.js matches.

   3. .pca-about__copy was a <div> in source with no data-reveal attribute of
      its own (the three <p> children each carry their own data-reveal), so
      it is built as a plain container with no _attributes.

   4. The middle paragraph carries no class in source (only data-reveal), so
      text() is called with no cssClass for it, matching the source exactly
      rather than inventing one.

   5. The inline link, and the team-bio.html route it pointed at:
      `<a href="team-bio.html">Grant Callen</a>` sits mid-sentence inside
      .pca-lede. It is not a button (no button styling, no button role in
      source), so it stays inside the text-editor widget's own markup rather
      than becoming a link() button widget, keeping the sentence one
      sentence, per the dispatch's instruction.

      team-bio.html is a static-build path (src/team-bio/index.html builds to
      dist/team-bio.html) and 404s under WordPress, which has no file of that
      name. Rather than leave it, or invent a page, the install was queried
      directly for what already exists: `person` is a real custom post type
      on empv2, and Grant Callen already has a published record there.

        $ wp post list --post_type=person --s='Grant Callen' \
            --fields=ID,post_title,post_name,post_status --format=table
        ID   post_title    post_name      post_status
        605  Grant Callen  grant-callen   publish

        $ wp eval "echo get_permalink(605);"
        https://empv2.wpenginepowered.com/person/grant-callen/

      That URL returns a real 200 (curl -I confirms it, no redirect), with
      Grant Callen's real bio and headshot already on it, per the survey
      documented in docs/superpowers/specs/2026-08-12-elementor-conversion-
      design.md ("13 or 14 of 23 [roster tiles] ... all with bios"). So the
      link below is /person/grant-callen/, not an invented slug.

      What genuinely does not exist yet, and this is the correction to the
      dispatch's framing (which says "no staff bio page exists on the
      install yet"): not the destination, which is live and real, but the
      single-person Elementor template that would apply this design's
      chrome to it. Per the spec ("One single-person template renders all
      ten. It becomes a build task"), that template is later work in this
      same conversion project. Until it ships, /person/grant-callen/ renders
      WordPress's default person single view, not this design, but it is a
      real page about the right person, not a 404. This is recorded on the
      route map as: destination exists and is live; styled template still
      to be built.

   6. THE HEADING IS A text() WIDGET CARRYING A BARE <h2>, not a heading()
      widget with _element_id. Class-in-markup migration (2026-08-17): the
      id moves off the widget's wrapper div and onto the <h2> itself, the
      same move 01-hero.mjs's own note 5 records for its <h1>, so
      aria-labelledby="about-title" on the outer container (note 2 above)
      now resolves to the heading element itself rather than to a div that
      merely contains it. The same move also removes Elementor's own
      heading widget from this section, so its frontend.min.css
      line-height:1 default needs no repair here. */

export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'pca-about',
      content_width: 'full',
      _attributes: 'aria-labelledby|about-title',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container(
          { cssClass: 'pca-about__grid', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            text({
              markup: '<h2 id="about-title">Go Beyond the Headlines.</h2>',
              _attributes: 'data-reveal|rise',
            }),
            container({ cssClass: 'pca-about__copy', content_width: 'full' }, [
              text({
                markup: '<p class="pca-lede">Hosted by Empower Mississippi Founder and CEO <a href="/person/grant-callen/">Grant Callen</a>, The Empower Podcast brings together lawmakers, policy experts, and community leaders to explore Mississippi’s biggest challenges and brightest opportunities.</p>',
                _attributes: 'data-reveal|rise',
              }),
              text({
                markup: '<p>Through thoughtful, long-form conversations, we look beyond divisive politics to the people impacted by public policy and the ideas that can help create a Mississippi where everyone can rise.</p>',
                _attributes: 'data-reveal|rise',
              }),
              text({
                markup: '<p class="pca-about__where">Watch on YouTube or listen wherever you get your podcasts.</p>',
                _attributes: 'data-reveal|rise',
              }),
            ]),
          ],
        ),
      ]),
    ],
  );
}

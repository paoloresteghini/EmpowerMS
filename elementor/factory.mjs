import { randomBytes } from 'node:crypto';

/* Elementor identifies every element by a 7-character hex id and will silently
   merge two elements that share one. Generated rather than sequential so that
   two section modules built independently cannot collide. */
export const elementId = () => randomBytes(4).toString('hex').slice(0, 7);

const el = (elType, settings, extra = {}) => ({
  id: elementId(),
  elType,
  settings,
  elements: [],
  isInner: false,
  ...extra,
});

/* Confirmed against fixtures/elementor/reference-section.json: containers and
   widgets persist the CSS class under different keys. The captured outer
   container has settings.css_classes (no underscore); every captured widget
   (heading, text-editor, image, html) has settings._css_classes (leading
   underscore). The brief's skeleton shared one CSS_CLASS_KEY constant between
   every factory, which would have silently lost the class on every container
   in the build. See docs/elementor/schema-4.2.2.md, "The finding that matters
   most: two different CSS class keys". */
const CONTAINER_CSS_CLASS_KEY = 'css_classes';
const WIDGET_CSS_CLASS_KEY = '_css_classes';

export const container = ({ cssClass = '', tag = 'div', ...rest } = {}, children = []) => ({
  ...el('container', { [CONTAINER_CSS_CLASS_KEY]: cssClass, html_tag: tag, ...rest }),
  elements: children,
});

/* widgetType 'heading' and the settings keys title / _css_classes are read
   from the captured heading node. header_size is always written here rather
   than omitted when it equals the default 'h2': the fixture shows Elementor's
   own persistence step drops default values, not that an explicit default is
   rejected, and the two forms are equivalent once Elementor reloads either
   one. A non-default tag (h1, h3, ...) persists normally either way. */
export const heading = ({ text, tag = 'h2', cssClass = '', ...rest } = {}) =>
  el('widget', { title: text, header_size: tag, [WIDGET_CSS_CLASS_KEY]: cssClass, ...rest }, { widgetType: 'heading' });

/* widgetType 'text-editor' and the settings key editor are read from the
   captured text-editor node. */
export const text = ({ markup, cssClass = '', ...rest } = {}) =>
  el('widget', { editor: markup, [WIDGET_CSS_CLASS_KEY]: cssClass, ...rest }, { widgetType: 'text-editor' });

/* widgetType 'image' and the settings.image shape ({ id, url }) are read from
   the captured image node. No alt field: the image widget has no alt control
   at all (elementor.widgetsCache.image.controls on the live install has
   nothing matching alt), and alt text is read from the attachment's own
   _wp_attachment_image_alt in the media library instead. Verified by
   rendering two image widgets against one attachment, one with
   settings.image.alt set to '' and one with no alt key, after giving the
   attachment real alt text: both rendered the attachment's alt text, because
   neither widget setting is consulted. A factory-level alt parameter would
   therefore be accepted and silently discarded, which is worse than not
   offering it: Tasks 6 and 7 map real alt copy off the static build, and a
   parameter that looks like it carries that copy but doesn't would drop it
   without any signal. Alt text is a media-library concern, out of reach for
   a pure JSON factory, and is tracked as a go-live editorial task instead. */
export const image = ({ id, url, cssClass = '', ...rest } = {}) =>
  el('widget', { image: { id, url }, [WIDGET_CSS_CLASS_KEY]: cssClass, ...rest }, { widgetType: 'image' });

/* widgetType 'button' and the settings keys (text, link.url, _css_classes) are
   read from a captured button node at .zz-probe__action. This was flagged
   unverified in an earlier pass, when the fixture had no button widget and
   these were the brief's unread guess; the capture has since confirmed the
   guess was right, keys and shape both. */
export const link = ({ label, href, cssClass = '', ...rest } = {}) =>
  el('widget', { text: label, link: { url: href }, [WIDGET_CSS_CLASS_KEY]: cssClass, ...rest }, { widgetType: 'button' });

/* The escape hatch for the three named exceptions in the spec, and for
   nothing else. Markup goes through unaltered. widgetType 'html' and the
   settings key html are read from the captured html node. */
export const html = ({ markup, cssClass = '', ...rest } = {}) =>
  el('widget', { html: markup, [WIDGET_CSS_CLASS_KEY]: cssClass, ...rest }, { widgetType: 'html' });

/* widgetType 'loop-grid' and the settings key template_id (the elementor_library
   post id of the Loop Item template) are read from the captured loop-grid node
   in docs/elementor/schema-4.2.2.md ("The loop-grid capture is the one to read
   before Task 7"). templateId is required rather than defaulted: a Loop Grid
   with no template renders Elementor's own empty-view placeholder instead of
   failing loudly, so a caller that forgets it would ship a page with a blank
   library and no error to catch it. Query settings (post_query_post_type,
   post_query_include, post_query_include_term_ids, posts_per_page, ...) are
   passed through ...rest rather than named here: they are the one part of
   this widget's shape that is genuinely per-caller (this build only ever
   needs one Loop Grid, filtering podcast-a's episode library to category 133),
   and naming query keys here would just be re-typing Elementor's own prefixed
   control names one level removed from where they are documented. */
export const loopGrid = ({ templateId, cssClass = '', ...rest } = {}) => {
  if (!Number.isInteger(templateId)) {
    throw new Error(`loopGrid: templateId must be an integer post id, got ${JSON.stringify(templateId)}`);
  }
  return el('widget', { template_id: templateId, [WIDGET_CSS_CLASS_KEY]: cssClass, ...rest }, { widgetType: 'loop-grid' });
};

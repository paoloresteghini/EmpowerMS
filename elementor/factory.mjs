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
   the captured image node. alt wasn't in the capture because it was left
   blank on the reference build, the same default-omission behaviour the
   heading's header_size shows; it's included here as a plain field rather
   than chased into that omission convention, since Elementor accepts an
   explicit empty alt exactly as it accepts a missing key. */
export const image = ({ id, url, alt = '', cssClass = '', ...rest } = {}) =>
  el('widget', { image: { id, url, alt }, [WIDGET_CSS_CLASS_KEY]: cssClass, ...rest }, { widgetType: 'image' });

/* UNVERIFIED: the captured fixture has no button widget, so widgetType
   'button' and the label/href settings keys below are the brief's original
   guess, not something read out of a capture. Kept because the "Produces"
   interface requires link(), and the widget-level _css_classes key is
   confirmed for "any widget" in the schema notes, so that part is safe. The
   label/href keys need checking the first time a real button node is
   captured, before Task 6 or 7 relies on them. */
export const link = ({ label, href, cssClass = '', ...rest } = {}) =>
  el('widget', { text: label, link: { url: href }, [WIDGET_CSS_CLASS_KEY]: cssClass, ...rest }, { widgetType: 'button' });

/* The escape hatch for the three named exceptions in the spec, and for
   nothing else. Markup goes through unaltered. widgetType 'html' and the
   settings key html are read from the captured html node. */
export const html = ({ markup, cssClass = '' } = {}) =>
  el('widget', { html: markup, [WIDGET_CSS_CLASS_KEY]: cssClass }, { widgetType: 'html' });

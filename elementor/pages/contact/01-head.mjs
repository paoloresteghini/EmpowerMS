import { container, text } from '../../factory.mjs';

/* Source of truth: dist/contact.html, the <section class="ct-head"> block.
   Every class, string and attribute below is read from that file.

   The classes are in the markup, not on the widget wrappers, for the reason
   the class-in-markup phase records: css/contact.css styles the real <h1> and
   the real <p>, and a class on an Elementor wrapper reaches neither. */
export function section() {
  return container(
    {
      tag: 'section',
      cssClass: 'ct-head',
      content_width: 'full',
      _attributes: 'aria-labelledby|contact-title',
    },
    [
      container({ cssClass: 'em-container', content_width: 'full' }, [
        container(
          { cssClass: 'ct-head__inner', content_width: 'full', _attributes: 'data-reveal-group|' },
          [
            text({ markup: '<h1 id="contact-title">Contact Us</h1>', _attributes: 'data-reveal|rise' }),
            text({
              markup: '<p class="ct-head__lead">We’d love to hear from you! Use the form below to e-mail us.</p>',
              _attributes: 'data-reveal|rise',
            }),
          ],
        ),
      ]),
    ],
  );
}

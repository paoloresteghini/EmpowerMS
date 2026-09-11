import { container, text } from '../factory.mjs';

/* THE FIXTURE FOR THE NATIVE-ANIMATION GATE, and it has to be a real page on
   the install rather than a local fixture.

   WHY. css/bridge.css redefines the @keyframes Elementor ships, so that a
   section Empower add through the editor after hand-off animates like the
   rest of the site (see the block at the end of bridge.css). Whether that
   override actually WINS is a question about the cascade on a rendered page:
   Elementor loads its animation CSS on demand, only when some element on the
   page uses an entrance animation, and if that sheet were to land after
   bridge.css its own @keyframes would win and the override would silently do
   nothing. No page in this build uses a native entrance animation, so without
   this fixture there is nowhere the question can even be asked, and a gate
   written against a local file would be answering a different one.

   Same convention as the install's other ZZ probes (ZZ Schema Reference, ZZ
   Loop Item Probe): published, linked from nothing, prefixed so it is
   obviously not content.

   THREE CONTAINERS, EACH ANSWERING ONE QUESTION:
     fadeInUp  - does the redefined travel (20px, not the element's own
                 height) reach a real page?
     zoomIn    - does the photo reveal mapping (clip-path + scale) survive,
                 given it is the one keyframe with no native counterpart?
     slow      - does Elementor's own Animation Duration control still work?
                 bridge.css sets a duration on `.animated`, and because it
                 loads last a bare selector there would beat .animated-slow
                 and disable the dropdown. This container is what proves the
                 :not() exclusion in that rule is doing its job. */
export const PROBE_POST_ID = 20641;
export const PROBE_SLUG = 'zz-native-animation-probe';

/* EACH PROBE IS 400px TALL ON PURPOSE, and the height is the measurement.
   Elementor's own fadeInUp travels translate3d(0,100%,0) -- 100% of the
   ELEMENT'S OWN height -- against this build's flat 20px. On a short element
   those two are nearly the same number and a gate comparing them proves
   almost nothing; the first version of this fixture was 43px tall, so the
   defended value (20px) and the failure value (43px) were within a factor of
   two. At 400px the two readings are 20 and 400, and no amount of rounding,
   easing or sampling jitter can confuse them.

   The height is inline on a div inside the widget rather than set as a
   container control or a class in bridge.css: it keeps the fixture entirely
   self-describing, and it keeps probe styling out of a stylesheet that ships
   to every page of the real site. */
const TALL = (label) => `<div style="height:400px">${label}</div>`;

export const sections = () => [
  container({ cssClass: 'zzp-fadeinup', content_width: 'full', animation: 'fadeInUp' }, [
    text({ markup: TALL('fadeInUp probe') }),
  ]),
  container({ cssClass: 'zzp-zoomin', content_width: 'full', animation: 'zoomIn' }, [
    text({ markup: TALL('zoomIn probe') }),
  ]),
  container({ cssClass: 'zzp-slow', content_width: 'full', animation: 'fadeInUp', animation_duration: 'slow' }, [
    text({ markup: TALL('slow probe') }),
  ]),
];

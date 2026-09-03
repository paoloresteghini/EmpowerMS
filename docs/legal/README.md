# The two legal documents, captured 2026-09-02

`privacy-policy.source.html` and `terms.source.html` are Empower's own legal
text, fetched from the live site on 2026-09-02 and stored here so the
transcription into this build can be checked by a test rather than by eye.
`test.mjs`'s "every word of each legal document survives the move" compares the
built pages against these files in both directions, so a dropped clause and an
invented one both fail.

## Where each came from, and why they are different shapes

| Document | Live source | What owns it |
|---|---|---|
| Privacy Policy | `/privacy-policy/` | WordPress page 3, and the site's registered `wp_page_for_privacy_policy` |
| Terms and Conditions | `/wpautoterms/terms-and-conditions/` | `wpautoterms_page` 19170, owned by the plugin `auto-terms-of-service-and-privacy-policy` 3.0.5 |

The terms document is not a page at all. It is a custom post type the plugin
maintains, which is why its URL carries the plugin's own prefix.

## What was stripped, and what was not

Stripped, all of it third-party furniture rather than Empower's words:

- MailMunch form anchors (`<div class='mailmunch-forms-…'>`), three of them,
  all `display:none`.
- The Ultimate Social Media Icons share block at the end of the terms document.
- PDF and Outlook paste wrappers WordPress kept when the privacy text was
  pasted in: `<div class="page" title="Page 1">`, `<div class="layoutArea">`,
  `<div class="column">`, an `id="x_x_gmail-…"` and a
  `data-olk-copy-source="MessageBody"`. These carry no meaning and their
  nesting is not even well formed.

Not touched: every word, every comma, every curly apostrophe, and the `&#8220;`
entities the terms document uses for its quotation marks.

## The one structural change, and it is not a wording change

The privacy policy opens its single section with an `<h3>` sitting directly
under the `<h1>`. That skips a level, which is a WCAG 1.3.1 failure and which
this build's own heading sweep would fail. It is rendered as an `<h2>` here.
Heading LEVEL is structure; the words are identical.

## Two dates, and only one of them is real

The terms document states `Last updated: 01/22/2025` in its own text, so the
page shows it, lifted into the page head where a dateline belongs.

The privacy policy states no date anywhere. Its WordPress `modified` field says
2025-02-20, but that records when somebody saved the post, not when the policy
changed. Printing it as "Last updated" would be this build asserting something
Empower has not, so the privacy page carries no date at all. A test holds that
open so a later edit cannot quietly invent one.

## Four things in Empower's own text, transcribed as they are

Reported rather than corrected. Changing the wording of a published legal
document is Empower's call and their counsel's, never this build's.

1. Privacy, final bullet: "You may not use **of** engage with the Platform"
   almost certainly means "use **or** engage".
2. Privacy, third bullet: "as described in our Privacy Policy ." has a space
   before the full stop, and the phrase is not a link, so a reader on the
   privacy policy is pointed at the privacy policy with no way to follow it.
3. Privacy gives `Mail@empowerms.org` as the contact address, twice. Every
   other surface on the new build, including the footer and the utility strip,
   uses `info@empowerms.org`.
4. Terms, "Contact Us": "If you have any questions about these Terms, please
   contact us." No address, no link. The old page offered no route either.
5. The terms document has three different names across Empower's own material.
   The page it lives on is titled "Terms and Conditions", the footer link
   Empower signed off says "Terms of Service", and the first line of the text
   calls it "Terms of Use". This build's page and footer agree with each other
   on "Terms of Service", because a link and its destination disagreeing is the
   one version of this that a reader actually trips over; the body keeps every
   "Terms of Use" the text itself uses. Which name the document should carry is
   Empower's to settle.

## The plugin is a separate decision, and the strip is already handled

`auto-terms-of-service-and-privacy-policy` also appends a `wpautoterms-footer`
block to every page on the install, plus a stylesheet, an inline `<style>` block
and a script.

**That strip is not a defect and must not be reported as one.** It was found on
2026-08-20 and deliberately kept rather than hidden, on Paolo's call, because it
is a compliance link the plugin manages and Empower publish the same one on
their live site. `bridge.css` block 55b restyles it to read as the footer's last
line. Verified live on 2026-09-02: background `rgb(0, 60, 80)`, the footer's own
navy; white link; Source Sans 3 at 13px; sitting flush at the footer's bottom
edge with no gap.

What remains true is that the plugin still owns the terms document and still
loads three assets on every page. See `docs/legal/plugin-proposal.md`.

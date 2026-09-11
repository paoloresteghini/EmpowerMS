# Proposal: retire the auto-terms plugin

**Status: proposed, not done.** Paolo's call on 2026-09-02 was to write this up
rather than change the install. Nothing here has been executed.

## What the plugin is doing to every page

`auto-terms-of-service-and-privacy-policy` 3.0.5 is active on `empv2`. Two
effects, and only the first is intended:

1. It owns the terms document, as `wpautoterms_page` 19170, which is why that
   document's URL is `/wpautoterms/terms-and-conditions/` rather than a path
   anybody would choose.
2. It appends a `wpautoterms-footer` block to **every page on the install**,
   below this build's own footer, plus a stylesheet, an inline `<style>` block
   and a script.

**THE STRIP IS NOT AN ARGUMENT FOR REMOVING THE PLUGIN, and an earlier draft of
this file wrongly said it was.** The strip was found on 2026-08-20 and kept on
purpose, on Paolo's call: it is a compliance link the plugin manages and Empower
publish the same one on their live site. `bridge.css` block 55b already styles it
as the footer's last line, and that is live and working. Verified 2026-09-02:
navy `rgb(0, 60, 80)` matching the footer, white link, the footer's own type at
13px, flush to the footer's bottom edge.

So the case below rests on the two things that are actually true: the URL, and
who owns the words. The only cost still on every page is three loaded assets.

## What retiring it would change

| | Before | After |
|---|---|---|
| Terms document | plugin CPT at `/wpautoterms/terms-and-conditions/` | ordinary page at `/terms/` |
| Terms content | maintained by the plugin's generator | maintained by Empower in Elementor, like every other page |
| Footer | this build's footer, with the plugin's compliance strip styled as its last line (bridge.css block 55b) | this build's footer, and the strip gone — which is a LOSS unless Empower want it gone |
| Per-page assets | one stylesheet, one inline style block, one script | none |

## The order it has to happen in

Each step is reversible and the risky one is last.

1. Create the terms page and deploy the converted build to it. Verify live.
2. Add a 301 from `/wpautoterms/terms-and-conditions/` to `/terms/` in
   Redirection, which is already the tool this build uses for route changes.
   Verify the redirect with a **bare URL**: a `?cb=` cache-buster defeats
   Redirection's exact match and makes a working 301 read as a live 200.
3. Only then deactivate the plugin. Reverse with
   `wp plugin activate auto-terms-of-service-and-privacy-policy`.

## What Empower have to agree to first, and it is not a technical question

The terms text originated in this plugin's generator. Deactivating it means
Empower own that text from then on: nobody regenerates it when the law moves,
and the "Changes" clause in their own terms promises they will maintain it. That
is a decision for Empower and their counsel, not a deployment step, and it is
the reason this file is a proposal rather than a task.

Note the direction of the footer row in the table above: retiring the plugin
REMOVES a compliance link that was deliberately kept on 2026-08-20. Since
2026-09-02 the footer carries "Privacy Policy" and "Terms of Service" as two
separate links, so the route survives either way, but the strip going is a
change to ask Empower about rather than a tidy-up.

If they keep the plugin, nothing needs doing to the strip: bridge.css block 55b
already makes it read as the footer's last line, and that is live and verified.
The only standing cost is three assets loaded on every page.

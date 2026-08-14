/* The WP Engine install's SSH coordinates, read from the environment.

   This repository is public. The coordinates are not a secret in the sense
   that a key is (WP Engine SSH is key-only, and no key is committed here),
   but they name a live install and a path on its server, and neither
   belongs in browsable source. They live in a local `.env` instead, which
   `.gitignore` keeps out of the repository; `.env.example` shows the shape.

   One module rather than a constant in each caller: `wpe.mjs` and
   `wp/sync.mjs` both talk to the same install, and when the same value is
   typed in two files it eventually stops being the same value. */

const VARS = ['WPE_SSH_HOST', 'WPE_SSH_KEY', 'WPE_ROOT'];

function required(name) {
  const value = process.env[name];
  /* An empty or whitespace-only value is the unset case wearing a disguise:
     it survives this check only to fail much further downstream, as an ssh
     error about a missing key or a `cd` to nowhere, with nothing pointing
     back at the configuration. */
  if (value === undefined || value.trim() === '') {
    throw new Error(
      `${name} is not set. wpe.mjs and wp/sync.mjs reach the WP Engine `
      + `install over SSH and read its coordinates (${VARS.join(', ')}) from `
      + 'the environment. Copy .env.example to .env, fill it in, then '
      + '`set -a; . ./.env; set +a` before running. See README.md, "The install".'
    );
  }
  return value.trim();
}

/* ssh -i does no tilde expansion of its own: normally the shell has already
   done it, and a value arriving from the environment has not been through
   one. Left alone, `~/.ssh/key` reaches ssh as a relative path that does not
   exist, and the failure reads as a permissions problem rather than a
   spelling one. */
function expandHome(p) {
  return p.startsWith('~/') ? `${process.env.HOME}/${p.slice(2)}` : p;
}

/* Read at call time, never at import time: `wpe.mjs` exports `stripNotices`
   too, which is pure and is unit-tested without any install to talk to. A
   module-level read would make importing that function fail on a machine
   with no `.env`. */
export function installConfig() {
  return {
    host: required('WPE_SSH_HOST'),
    key: expandHome(required('WPE_SSH_KEY')),
    root: required('WPE_ROOT'),
  };
}

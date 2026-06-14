# Cars24 FM — agent orientation

Single-page web app: a 24/7 lo-fi radio station ("music to build to / drive to").
Deployed via **GitHub Pages** at `https://vikramchopra.in/cars24-fm/`.

## Read this first (ground truth, not vibes)
- **State is `git`, not a previous session's report.** A frozen/disconnected session may
  claim work is "done and live" that was never committed — verify before trusting it.
- On session start, establish the true state:
  - `git log -1 --format='%ci %s'` — last real commit (this is what's live if it == `origin/main`).
  - `git diff --stat origin/main HEAD` — should be empty when HEAD is deployed.
  - Build label: search `index.html` for `build 2026-` (currently `index.html:292`). This is the
    **canonical version string**. `STATUS.json` mirrors it — keep both in sync.
- **Commit incrementally and push.** The repo carries ~356 MB of audio; the container is
  ephemeral. Uncommitted work dies with it. Don't batch a night of work into one unpushed pile.

## Architecture
- Everything lives in **`index.html`** (markup + CSS + JS, no build step).
- Audio has two layers, woven together:
  1. **Real tracks** — `music/playlist.json` is a flat JSON array of filenames (currently 150).
     `USE_REMOTE_TRACKS` (`index.html:1175`) gates this path.
  2. **Generative engine** — zero-latency in-browser synth + DJ/value "station breaks".
- **Track URL resolution** (`index.html:723`):
  `bare-name -> music/<encodeURIComponent(name)>` (self-hosted, relative — **no Cloudflare**,
  Pages sits behind Fastly). Absolute `http(s)` URLs (e.g. archive.org) are used as-is.
  `music/playlist_remote_backup.json` keeps the old all-remote list.
- **DJ voice** — ElevenLabs-prerendered clips in `music/dj/`, indexed by `music/dj/manifest.json`
  (loaded at `index.html:646`).
- **Versioning quirk:** `?v=2` in the `<meta>` tags is only the **preview.png** cache-buster
  (lines 16/23). It is NOT the app version. The build label is the version of record.

## Verify integrity (one command)
```bash
python3 - <<'EOF'
import json, os
t = json.load(open('music/playlist.json'))
miss = [x for x in t if not (x.startswith('http') or os.path.exists('music/'+x))]
print(f"playlist entries: {len(t)}  missing on disk: {len(miss)}")
EOF
```
All non-URL entries must exist under `music/`. Expect `missing on disk: 0`.

## Parked / not done
- **ElevenLabs Music** (generative music API) — pending enterprise terms. Intentionally not wired.

## When you change anything
1. Update the `build 2026-...` label in `index.html` **and** `STATUS.json` together.
2. If you add/remove tracks, run the integrity check above before committing.
3. Commit + push incrementally.

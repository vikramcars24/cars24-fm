# Next tracks — ready-to-fetch checklist

> **Purpose:** a turnkey worklist for the *next* Claude Code session, which will have
> outbound network access to `archive.org` (the current session that wrote this did not).
> Goal: grow the self-hosted lo-fi library beyond the current **129** tracks by pulling
> **more** material from the same Creative-Commons sources already trusted here, plus a
> few new CC0 lo-fi items. Everything self-hosted under `music/` (no streaming), so the
> station stays zero-latency.

## Prerequisites (verify first)

1. Confirm egress is actually open in this session:
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" --max-time 12 https://archive.org/
   ```
   Expect `200` (or `301/302`). If you get `403` with `host_not_allowed`, the network
   change hasn't taken effect — STOP and tell the user the environment still needs
   `archive.org` + `*.archive.org` on its egress allowlist (and a fresh session).

2. Read `CLAUDE.md` for ground rules (build label is the version of record; commit + push
   incrementally; run the integrity check before committing).

## Constraints / taste

- **Vibe:** lo-fi / chillhop / mellow ambient — "music to build to / drive to". No
  chiptune, battle/action cues, metal, spooky/seasonal. (PR #2 just removed those.)
- **License:** prefer **CC0** (no attribution) and **CC BY** (attribution, commercial OK).
  `Jahzzar` is **CC BY-SA** (attribution + share-alike) — fine for a web page, just credit it.
  Avoid **CC BY-NC** if the station is ever monetized/streamed; when unsure, skip it.
- **Self-host only.** Download the mp3 into `music/`, then list the *bare filename* in
  `music/playlist.json`. Do not add `http(s)` URLs (that reintroduces latency).
- **No duplicates.** Only add files whose names aren't already in `playlist.json`.

## The fetch procedure (per source item)

archive.org items expose a metadata endpoint that lists every file + the license.
Use it instead of guessing filenames:

```bash
ITEM=BrokeForFreeLayers           # example
# 1. list mp3s + license for this item
curl -s "https://archive.org/metadata/$ITEM" \
 | python3 -c "import sys,json; d=json.load(sys.stdin); print('LICENSE:', d.get('metadata',{}).get('licenseurl','(none listed)')); [print(f['name']) for f in d['files'] if f['name'].lower().endswith('.mp3')]"

# 2. download one chosen file (URL-encode spaces with %20 or let curl -G handle it)
#    pattern: https://archive.org/download/<ITEM>/<FILE>
curl -L --fail -o "music/Broke For Free - Layers - 01 Example.mp3" \
  "https://archive.org/download/$ITEM/Broke%20For%20Free%20-%20Layers%20-%2001%20Example.mp3"
```

Naming: keep the existing convention `Artist - Album - NN Title.mp3` (truncate long
titles like the current set does). The on-screen track name is derived from the filename.

## Source items (all confirmed present in `music/playlist_remote_backup.json` — proven good)

Pull tracks **not already** in `playlist.json` from these. Expected licenses noted —
**always re-confirm via the metadata `licenseurl`** before keeping a file.

| Artist | archive.org item id(s) | Expected license | Energy band → tag toward |
| --- | --- | --- | --- |
| **Loyalty Freak Music** | `loyalty-freak-music-lofi-ambient-songs`, `LoyaltyFreakMusic-INSTRUMENTALRBBEATSTOSINGORRAPON` | **CC0** (public domain) | morning / day (lo-fi, beat-driven) |
| **Lee Rosevere** | `leerosevere_musicforpodcasts_5`, `leerosevere_musicforpodcasts_6`, `MusicForPodcasts02`, `MusicForPodcasts04`, `lee_rosevere_four_reasons` | **CC BY 4.0** | night / morning (mellow, ambient) |
| **Broke For Free** | `BrokeForFreeLayers`, `DirectionlessEP`, `Directionless_EP-8295` | **CC BY 3.0** | day / evening (brighter, upbeat) |
| **Kai Engel** | `KaiEngelTheRun`, `Dune-13188` | **CC BY 4.0** | night (cinematic, low + slow) |
| **Jahzzar** | `Jahzzar_Sele`, `Jahzzar-Bunk`, `Jahzzar-Message`, `Smoke_Factory-11354` | **CC BY-SA 4.0** | evening (boom-bap-ish, drive) |

### Optional new CC0 lo-fi to broaden the catalogue (verify item exists + license first)

- **Monplaisir** — prolific CC0 artist on archive.org / Free Music Archive; search
  `https://archive.org/advancedsearch.php?q=creator:Monplaisir+AND+mediatype:audio&fl=identifier&rows=20&output=json`.
- **Komiku** — already here (15 tracks), CC0; more albums available the same way.

> Aim for a tasteful **~15–25 new tracks** total, weighted a bit toward the thinner
> bands (night/evening) — don't dump entire discographies.

## Wiring each new track in (after download)

1. **Add filenames** to `music/playlist.json` (bare names, append to the array).
2. **Tag energy** — open `index.html`, find `trackEnergy()` (added in PR #2). It keys off
   artist/album keywords. If a new artist/album isn't recognized, add a keyword so the
   track lands in the right daypart band (night/morning/day/evening). Verify the heuristic
   still returns sane averages (night low ~0.3, evening high ~0.55).
3. **Attribution** — `index.html` footnote (~line 289) already credits
   "Lee Rosevere, Broke For Free, Jahzzar, Kai Engel and others". CC0 needs no credit.
   If you add a genuinely **new CC BY/BY-SA artist** (e.g. Monplaisir is CC0 so skip),
   add their name to that line.
4. **Integrity check** (must print `missing on disk: 0`):
   ```bash
   python3 - <<'EOF'
   import json, os
   t = json.load(open('music/playlist.json'))
   miss = [x for x in t if not (x.startswith('http') or os.path.exists('music/'+x))]
   print(f"playlist entries: {len(t)}  missing on disk: {len(miss)}")
   EOF
   ```
5. **Bump the build label** in BOTH `index.html` (the `build 2026-...` span, ~line 292)
   and `STATUS.json` — keep them in sync. Update the track count in the label text.
6. **Sanity-check JS:** `node --check` the inline script (extract or use existing method).
7. **Commit + push incrementally** (don't batch a whole night into one unpushed pile — the
   container is ephemeral and the audio is large). Then open a PR.

## Done when

- ~15–25 new self-hosted tracks added, integrity check clean, build label + `STATUS.json`
  bumped with the new count, footnote attribution correct, pushed, PR opened.

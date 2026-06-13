# Cars24 FM 🎵 music for thinking and driving

A Cars24 take on Anthropic's [Claude FM](https://www.youtube.com/live/tRsQsTMvPNg)
("music for thinking and building") — a 24/7 lo-fi livestream experience, rebuilt
as a single self-contained web page.

![Scene](preview.png)

## What's inside

- **Hybrid endless audio**: hundreds of hand-picked Creative Commons (CC BY) tracks
  stream from the Internet Archive, shuffled and continuous, *woven with* the
  built-in AI lo-fi engine — every few songs the station hands off to a live
  generated interlude, so the stream never repeats and never stops. If a track
  URL ever fails, it falls straight through to generated music.
  - Real catalogue (`music/playlist.json`): Chris Zabriskie, Kevin MacLeod,
    Lee Rosevere, Broke For Free, Jahzzar, Kai Engel and others — all CC BY
    (commercial-safe with attribution, credited on the page).
  - Generative engine: Web Audio, no files. Swung lo-fi at ~72 BPM, diatonic 7th
    pads, sine bass, pentatonic melody through tape echo, drums, vinyl crackle.
- **Cars24 values v3 idents**: between tracks a classy typographic bumper drifts
  in — the brand line *"Better drives, better lives"* and the five values
  (Customer love, Builder mindset, Seek truth, Whatever we tolerate becomes our
  culture, Better humans), straight from values v3.
- **Pixel-art garage scene** on a 192×108 canvas: a mechanic working on a
  Cars24-blue car (head bobs to the beat), a sleeping cat, shooting stars, a
  flickering **Cars24 FM** neon sign, coffee steam, beat-synced EQ bars, sparks.
- **Livestream-style UI**: LIVE badge, drifting viewer count, like/subscribe
  chips, play overlay, volume, fullscreen, and keyboard shortcuts
  (`space` play/pause, `m` mute, `f` fullscreen).

## Run it

No build step, no dependencies:

```bash
open cars24-fm/index.html        # or just double-click it
# or serve it:
python3 -m http.server -d cars24-fm 8080
```

## Publish as a personal channel

`publish.sh` packages the page into its own repo on your GitHub account and
(if the `gh` CLI is installed) turns on GitHub Pages for you:

```bash
cd cars24-fm
./publish.sh                     # uses vikramcars24 / cars24-fm
```

Your channel then goes live at:

```
https://vikramcars24.github.io/cars24-fm/
```

Without the `gh` CLI the script still pushes the repo, then enable Pages
manually: **Settings → Pages → Source: Deploy from branch → main / root**.

> Unofficial concept. Not affiliated with YouTube or Anthropic.

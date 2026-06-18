# Real music for Cars24 FM

Drop royalty-free audio files (`.mp3`, `.m4a`, `.ogg`) into this folder and list
their filenames in `playlist.json`. When the list has entries, the channel
plays those real tracks (shuffled, continuous) instead of the built-in
generative engine. If the list is empty, the generative engine plays — so the
page always works.

You can also generate original instrumental tracks locally with ElevenLabs:

```bash
cd /Users/vikram/Documents/cars24-fm
node scripts/generate-eleven-music.mjs --count 4 --duration-ms 60000 --add-to-playlist
```

That writes `.mp3` files directly into this folder and logs prompt metadata in
`eleven_manifest.json`. Generated files use the `Cars24 FM Originals - ...`
prefix. The key is only used at build time on your machine.

Celebration-block audio lives under `music/birthday/` and is generated separately
from `data/celebrations.json`:

```bash
node scripts/generate-birthday-block.mjs --date 2026-06-18
```

If there are no celebrations yet, keep `data/celebrations.json` as `[]` and the site
will skip the block cleanly.

Monthly business-update bulletin audio lives under `music/business-update/` and
can be generated from the Slack permalink for the latest `Global Pulse` post:

```bash
node scripts/generate-business-update-block.mjs \
  --slack-link "https://cars24.slack.com/archives/C053XTBJC/p1780752190402179" \
  --days 3
```

## How to add tracks

1. Download royalty-free lo-fi tracks (see sources below) and copy them here,
   e.g. `cars24-fm/music/rainy-drive.mp3`.
2. List the filenames in `playlist.json`:
   ```json
   ["rainy-drive.mp3", "late-night-cruise.mp3", "garage-soul.mp3"]
   ```
3. Commit + deploy (re-run `publish.sh`, or push if auto-deploy is set up).
   The track name shown on screen is derived from the filename.

## Where to get free music — and which is safe for YouTube

If you plan to run the OBS → YouTube livestream, **use the YouTube Audio
Library** — those tracks won't trigger Content ID claims on your stream:

- **YouTube Audio Library** — https://studio.youtube.com → Audio Library
  (filter to "lo-fi" / "ambient"; check the licence note on each track)
- **Pixabay Music** — https://pixabay.com/music/ (free, no attribution)
- **Free Music Archive** — https://freemusicarchive.org (filter to CC0 / CC-BY)
- **Incompetech** — https://incompetech.com (CC-BY, needs attribution)

Always confirm each track's licence allows your use. For a public web page or a
livestream, prefer CC0 / "no attribution required" or the YouTube Audio Library.

# Real music for Cars24 FM

Drop royalty-free audio files (`.mp3`, `.m4a`, `.ogg`) into this folder and list
their filenames in `playlist.json`. When the list has entries, the channel
plays those real tracks (shuffled, continuous) instead of the built-in
generative engine. If the list is empty, the generative engine plays — so the
page always works.

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

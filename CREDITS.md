# Music credits & licensing — Cars24 FM

All real tracks on the station are royalty-free music, self-hosted under `music/`
and sourced from the [Internet Archive](https://archive.org). They fall under
**Creative Commons** licences. This file is the attribution record for the
CC&nbsp;BY / CC&nbsp;BY-SA tracks (which require credit) and a courtesy listing
for the CC0 tracks (which do not).

> The licence shown on each artist's **archive.org item page is authoritative.**
> Track counts below are approximate (derived from filenames) and reflect the
> current `music/playlist.json` (198 tracks). Source links point at the
> archive.org collections the tracks were fetched from.

## Attribution required

### CC BY (Attribution)
- **Chris Zabriskie** — ~13 tracks · *Direct to Video*, *I Am a Man Who Will Fight
  for Your Honor*, *Reappear*, *Thoughtless*. https://chriszabriskie.com ·
  [archive.org](https://archive.org/details/ChrisZabriskieDirectToVideo)
- **Kevin MacLeod** (Incompetech) & FMA samplers — ~24 tracks · *AcidJazz*,
  *Hypnothis*, *DiscoLounge*, jazz/oddities samplers, et al.
  https://incompetech.com ·
  [archive.org](https://archive.org/details/KevinMacLeod_2019-04_Discography)
- **Lee Rosevere** — ~24 tracks · *Music for Podcasts 2/4/5/6*, *Four Reasons*,
  *Love Wins*. https://leerosevere.bandcamp.com ·
  [archive.org](https://archive.org/details/leerosevere_musicforpodcasts_6)
- **Broke For Free** — ~13 tracks · *Layers*, *Directionless EP*.
  https://brokeforfree.com ·
  [archive.org](https://archive.org/details/BrokeForFreeLayers)
- **Kai Engel** — ~6 tracks · *The Run*. https://kai-engel.com ·
  [archive.org](https://archive.org/details/KaiEngelTheRun)
- **Gurdonark** — ~2 tracks · *Harmony* (with Lee Rosevere).
  [archive.org](https://archive.org/details/Gurdonark_LeeRosevere_Harmony)

*Obligation:* keep the artist name + a link to the source, and don't imply the
artist endorses Cars24. Credit is carried in the page footer and here.

### CC BY-SA (Attribution-ShareAlike)
- **Jahzzar** — ~21 tracks · *Message*, *Sele*, *Kuddelmuddel*, *Bunk*.
  https://betterwithmusic.com ·
  [archive.org](https://archive.org/details/Jahzzar-Message)

*Obligation:* attribution **plus** ShareAlike — any redistribution of a Jahzzar
track (or a derivative/remix of it) must itself be CC&nbsp;BY-SA. Playing it
unmodified on a web page is fine; **note this before reusing it in a remix or a
downloadable mix.** This is the one licence in the catalogue with a copyleft
condition.

## No attribution required (credited anyway)

### CC0 (Public Domain Dedication)
- **Loyalty Freak Music** — ~40 tracks · *LOFI AMBIENT SONGS*, *CHILL FOR REAL*,
  *ROBOT DANCE*, *ROLLER DISCO DANCE DANCE*, *GAME JAM*, *INSTRUMENTAL R&B BEATS*,
  and more. https://loyaltyfreakmusic.com ·
  [archive.org](https://archive.org/details/loyalty-freak-music-lofi-ambient-songs)
- **Komiku** — ~25 tracks · *Ultra Person Vol.1*, *Poupis' Incredible Adventures*,
  *Tale on the Late*, et al.
  [archive.org](https://archive.org/details/Komiku-ultra_person_vol1)

## Notes
- ~8 tracks are not cleanly attributable from their filename alone (compilation
  samplers); their archive.org item pages carry the canonical artist + licence.
- The DJ voice is generated with **ElevenLabs** (pre-rendered clips in `music/dj/`).
- Optional build-time AI tracks in `music/` can also be generated with
  **ElevenLabs Music** and tracked in `music/eleven_manifest.json`. Those are
  `Cars24 FM Originals` for this project, not fetched third-party catalogue
  tracks.
- Daily celebration-block audio under `music/birthday/` can be generated locally
  with ElevenLabs from employee birthday and anniversary data for the station’s
  `10:00 AM IST` celebration slot.
- Monthly business-update bulletin audio under `music/business-update/` can be
  generated locally with ElevenLabs from the Slack `Global Pulse` post and its
  attached file summary for the station’s `11:00 AM IST` briefing slot.
- The generative engine (Web Audio synth between tracks) is original to this
  project — no licence obligations.
- **For the OBS → YouTube livestream path:** CC0 and most CC&nbsp;BY tracks are
  safe, but confirm each track's licence on its archive.org page and prefer the
  YouTube Audio Library if you want zero Content-ID risk (see `music/README.md`).

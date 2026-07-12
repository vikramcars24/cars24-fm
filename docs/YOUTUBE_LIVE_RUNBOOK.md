# Cars24 FM on Cars24 YouTube

This runbook is for taking the existing Cars24 FM web station live on the
official Cars24 YouTube channel through an encoder such as OBS.

## Current source

- Source repo: `https://github.com/vikramcars24/cars24-fm`
- Live web page: `https://vikramchopra.in/cars24-fm/`
- Stream-mode page for OBS: `https://vikramchopra.in/cars24-fm/?autoplay=1&stream=1`
- Local repo: `/Users/vikramchopra/Documents/cars24-fm`

The app is already built for browser-source streaming. `?autoplay=1` starts the
station after load for OBS, kiosk displays, and YouTube livestream capture.

## What access is needed

Final publishing needs someone with access to the official Cars24 YouTube
channel in YouTube Studio.

Required from the channel admin:

- Permission to open YouTube Studio for the Cars24 channel.
- A scheduled or immediate livestream in Live Control Room.
- The stream URL and stream key, or direct OBS authorization into the channel.

Do not paste the stream key into chat, docs, Git, Slack, or screenshots. Treat it
as a secret. If it leaks, reset it in Live Control Room.

## Recommended YouTube setup

In YouTube Studio:

1. Click `Create`, then `Go live`.
2. Use the `Stream` tab for an immediate stream, or `Manage`, then `Schedule stream`
   if the launch should be announced first.
3. Title: `Cars24 FM: music for thinking and driving`
4. Description:

```text
Cars24 FM is a lo-fi station for thinking, driving, and building.

Better drives, better lives.

Music and station credits:
https://vikramchopra.in/cars24-fm/
```

5. Category: `Music`, or `People & Blogs` if the channel team prefers a brand
   content category.
6. Visibility for testing: `Unlisted`.
7. Visibility for launch: `Public`.
8. Monetization: off for the first run unless the channel team has cleared music
   rights and Content ID risk.

Google's current encoder flow is: create or schedule a stream, copy the stream
URL and stream key into the encoder, start the encoder, then go live from Live
Control Room when preview is healthy.

Official references:

- `https://support.google.com/youtube/answer/2907883`
- `https://support.google.com/youtube/answer/9854503`
- `https://support.google.com/youtube/answer/2853702`

## OBS setup

Scene:

- Add a `Browser` source.
- URL: `https://vikramchopra.in/cars24-fm/?autoplay=1&stream=1`
- Width: `1920`
- Height: `1080`
- FPS: `30`
- Enable browser source audio if OBS asks.

Output:

- Service: `YouTube`.
- Server: use the stream URL from YouTube if OBS does not authenticate directly.
- Stream key: paste from YouTube Live Control Room.
- Resolution: `1920x1080`.
- Frame rate: `30 fps`.
- Video bitrate: start at `4500 Kbps` to `6000 Kbps`.
- Audio bitrate: `160 Kbps` or higher.

Before going public:

1. Start the stream in OBS.
2. Wait for preview in YouTube Live Control Room.
3. Confirm audio is present and not muted.
4. Confirm the Cars24 FM scene is moving.
5. Confirm the now-playing label updates.
6. Keep the stream `Unlisted` for at least 10 minutes.
7. Watch for Content ID, copyright, or stream health warnings.
8. Switch to `Public` only after the test is clean.

## Music-rights caution

The current station uses self-hosted royalty-free and Creative Commons tracks,
plus project-generated audio. That is suitable for a web page with attribution,
but YouTube Content ID can still flag public livestreams incorrectly or
conservatively.

Lowest-risk launch path:

1. First test as `Unlisted`.
2. Prefer tracks from YouTube Audio Library for a permanent official channel
   stream.
3. Keep the credits page linked in the YouTube description.
4. Keep monetization off until the channel team clears the music policy.

## Operational owner split

Codex can maintain the repo, verify the web page, and prepare the OBS source.
The Cars24 YouTube channel owner or manager must complete the final YouTube
publishing step because it requires live channel access and a stream key.

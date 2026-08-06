# Civ 5 Era Playlist

Made with Grok

Personal music player for Civilization 5 sessions.  
Sidebar switches eras → each era has its own looping playlist.

<img width="1597" height="712" alt="Screenshot_20260806_133835" src="https://github.com/user-attachments/assets/d08a11a7-1769-436d-89c8-49ed8f15b4f2" />

## How to add songs

1. Drop your `.mp3` / `.m4a` / `.ogg` files into the matching folder:

```
audio/
  ancient/
  classical/
  medieval/
  renaissance/
  industrial/
  modern/
  atomic/
  information/
```

2. Run the generator:

```bash
node generate-tracks.js
```

3. Refresh the browser.

Titles are taken from the filenames (cleaned up).  
When a track plays, the player also tries to read real ID3 tags (artist, proper title, album art) if they exist.

## Features

- Era sidebar
- Full track list
- Play / Pause / Next / Prev
- **Shuffle** (current era only) — button or press `S`
- Progress bar + seek
- Volume + mute
- Auto-loops the current era
- Keyboard: `Space` = play/pause, `←` `→` = prev/next, `S` = shuffle
- Album art from ID3 when available

## Project structure

```
civ5-music-player/
├── index.html
├── generate-tracks.js
├── css/styles.css
├── js/
│   ├── app.js
│   └── tracks-data.js
└── audio/
      -ancient/
      -classical/
      -medieval/
      -renaissance/
      -industrial/
      -modern/
      -atomic/
      -information/
```

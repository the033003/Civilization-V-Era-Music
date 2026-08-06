# Civ 5 Era Playlist

Personal music player for Civilization 5 sessions.  
Sidebar switches eras → each era has its own looping playlist.

## How to add songs (no code editing)

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

## Deploy to GitHub Pages (free)

1. Create a public repo and push these files
2. Repo Settings → Pages → Source = Deploy from a branch → `main`
3. Live at `https://yourusername.github.io/repo-name/`

Remember to run `node generate-tracks.js` and commit the updated `js/tracks-data.js` whenever you add/remove songs.

## Project structure

```
civ5-music-player/
├── index.html
├── generate-tracks.js     ← run this after adding songs
├── css/styles.css
├── js/
│   ├── app.js             ← player logic
│   └── tracks-data.js     ← auto-generated, do not edit by hand
└── audio/
    ├── ancient/
    ├── classical/
    └── ...
```

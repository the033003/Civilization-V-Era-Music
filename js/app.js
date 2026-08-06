/**
 * ============================================================
 * Civ 5 Era Playlist - Core App Logic
 * ============================================================
 *
 * HOW IT WORKS NOW:
 * 1. Put .mp3 (or m4a/ogg/wav) files into audio/<era>/ folders
 *    Example: audio/ancient/Ancient - JoJo.mp3
 * 2. Run:  node generate-tracks.js
 *    → this auto-builds js/tracks-data.js from the folders
 * 3. Refresh the page. Titles come from filenames (cleaned).
 * 4. When a track plays, the browser tries to read ID3 tags
 *    (real title, artist, album art) via jsmediatags if available.
 *
 * SHUFFLE:
 * - Toggle the shuffle button. It randomizes the play order
 *   of the *current era only*. Next/prev follow that order.
 * - Turning shuffle off restores original order.
 *
 * PLAN FOR LOCAL AI / FUTURE YOU:
 * - TRACKS comes from window.TRACKS_DATA (generated file)
 * - State: currentEra, currentIndex, isPlaying, shuffleOn, playOrder
 * - playOrder is an array of indices. When shuffle is on it is randomized.
 * - Metadata (artist/cover) is fetched on demand for the current track.
 * - Easy to expand: localStorage for last era/volume, favorites, etc.
 */

/* ------------------------------------------------------------
   STATE
   ------------------------------------------------------------ */
let TRACKS = {};                 // filled from tracks-data.js
let currentEra = "ancient";
let currentIndex = 0;            // index into the *original* songs array
let isPlaying = false;
let shuffleOn = false;
let playOrder = [];              // array of indices into songs[] (shuffled or sequential)

/* ------------------------------------------------------------
   DOM REFS
   ------------------------------------------------------------ */
const audio = document.getElementById("audio");
const eraNav = document.getElementById("era-nav");
const trackListEl = document.getElementById("track-list");
const currentEraName = document.getElementById("current-era-name");
const currentEraDesc = document.getElementById("current-era-desc");
const trackCount = document.getElementById("track-count");
const nowTitle = document.getElementById("now-title");
const nowArtist = document.getElementById("now-artist");
const nowArt = document.getElementById("now-art");
const btnPlay = document.getElementById("btn-play");
const btnPrev = document.getElementById("btn-prev");
const btnNext = document.getElementById("btn-next");
const btnShuffle = document.getElementById("btn-shuffle");
const btnMute = document.getElementById("btn-mute");
const progressBar = document.getElementById("progress-bar");
const progressFill = document.getElementById("progress-fill");
const currentTimeEl = document.getElementById("current-time");
const durationEl = document.getElementById("duration");
const volumeSlider = document.getElementById("volume");

/* ------------------------------------------------------------
   INIT
   ------------------------------------------------------------ */
function init() {
  // Prefer the auto-generated data
  if (window.TRACKS_DATA) {
    TRACKS = window.TRACKS_DATA;
  } else {
    console.warn("tracks-data.js not found. Run: node generate-tracks.js");
    TRACKS = getEmptyTracks();
  }

  buildEraNav();
  switchEra(currentEra);
  setupEventListeners();
  audio.volume = volumeSlider.value;
}

function getEmptyTracks() {
  // Fallback if generate script hasn't been run yet
  const eras = ["ancient","classical","medieval","renaissance","industrial","modern","atomic","information"];
  const empty = {};
  eras.forEach(k => {
    empty[k] = { name: k.charAt(0).toUpperCase() + k.slice(1), icon: "•", description: "", songs: [] };
  });
  return empty;
}

/* ------------------------------------------------------------
   BUILD SIDEBAR
   ------------------------------------------------------------ */
function buildEraNav() {
  eraNav.innerHTML = "";
  Object.keys(TRACKS).forEach(key => {
    const era = TRACKS[key];
    const btn = document.createElement("button");
    btn.className = "era-btn" + (key === currentEra ? " active" : "");
    btn.dataset.era = key;
    btn.innerHTML = `
      <span class="era-icon">${era.icon || "•"}</span>
      <span>${era.name}</span>
    `;
    btn.addEventListener("click", () => switchEra(key));
    eraNav.appendChild(btn);
  });
}

/* ------------------------------------------------------------
   SWITCH ERA
   ------------------------------------------------------------ */
function switchEra(eraKey) {
  if (!TRACKS[eraKey]) return;

  currentEra = eraKey;
  currentIndex = 0;
  isPlaying = false;
  audio.pause();
  btnPlay.textContent = "▶";
  resetArt();

  // Update active button
  document.querySelectorAll(".era-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.era === eraKey);
  });

  const era = TRACKS[eraKey];
  currentEraName.textContent = era.name;
  currentEraDesc.textContent = era.description || "";
  trackCount.textContent = `${era.songs.length} track${era.songs.length !== 1 ? "s" : ""}`;

  rebuildPlayOrder();
  renderTrackList();
  if (era.songs.length) {
    loadTrack(playOrder[0], false);
  } else {
    nowTitle.textContent = "No tracks in this era";
    nowArtist.textContent = "Add files to audio/" + eraKey + "/ then run generate-tracks.js";
  }
}

/* ------------------------------------------------------------
   PLAY ORDER (normal or shuffled)
   ------------------------------------------------------------ */
function rebuildPlayOrder() {
  const songs = TRACKS[currentEra].songs;
  playOrder = songs.map((_, i) => i);

  if (shuffleOn) {
    // Fisher-Yates
    for (let i = playOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [playOrder[i], playOrder[j]] = [playOrder[j], playOrder[i]];
    }
  }
}

function toggleShuffle() {
  shuffleOn = !shuffleOn;
  btnShuffle.classList.toggle("active", shuffleOn);
  btnShuffle.title = shuffleOn ? "Shuffle: ON" : "Shuffle: OFF";

  // Keep the currently playing song as the starting point of the new order
  const currentSongIndex = currentIndex;
  rebuildPlayOrder();

  // Move the current song to the front of the new playOrder so "next" feels natural
  if (shuffleOn && playOrder.length > 1) {
    const pos = playOrder.indexOf(currentSongIndex);
    if (pos > 0) {
      playOrder.splice(pos, 1);
      playOrder.unshift(currentSongIndex);
    }
  }

  renderTrackList(); // optional: could show order numbers, but we keep original list
}

/* ------------------------------------------------------------
   RENDER TRACK LIST
   ------------------------------------------------------------ */
function renderTrackList() {
  const songs = TRACKS[currentEra].songs;
  trackListEl.innerHTML = "";

  if (songs.length === 0) {
    trackListEl.innerHTML = `
      <div class="empty-state">
        <p>No tracks yet for this era.</p>
        <p>1. Drop mp3s into <code>audio/${currentEra}/</code></p>
        <p>2. Run <code>node generate-tracks.js</code></p>
        <p>3. Refresh this page</p>
      </div>
    `;
    return;
  }

  songs.forEach((song, i) => {
    const row = document.createElement("div");
    row.className = "track-row" + (i === currentIndex ? " active" : "");
    row.dataset.index = i;
    row.innerHTML = `
      <div class="track-num">${i + 1}</div>
      <div class="track-info">
        <div class="track-title">${escapeHtml(song.title)}</div>
        <div class="track-artist">${escapeHtml(song.artist || "Unknown artist")}</div>
      </div>
      <div class="track-duration">${song.duration || "--:--"}</div>
    `;
    row.addEventListener("click", () => {
      // Jump to this song and rebuild order around it if shuffled
      currentIndex = i;
      if (shuffleOn) {
        rebuildPlayOrder();
        const pos = playOrder.indexOf(i);
        if (pos > 0) {
          playOrder.splice(pos, 1);
          playOrder.unshift(i);
        }
      }
      loadTrack(i, true);
    });
    trackListEl.appendChild(row);
  });
}

/* ------------------------------------------------------------
   LOAD & PLAY TRACK
   ------------------------------------------------------------ */
function loadTrack(index, autoPlay = true) {
  const songs = TRACKS[currentEra].songs;
  if (!songs.length || index < 0 || index >= songs.length) return;

  currentIndex = index;
  const song = songs[index];

  audio.src = song.file;
  nowTitle.textContent = song.title;
  nowArtist.textContent = song.artist || "…";
  durationEl.textContent = song.duration || "0:00";
  resetArt();

  // Highlight in list
  document.querySelectorAll(".track-row").forEach(row => {
    row.classList.toggle("active", Number(row.dataset.index) === index);
  });

  // Try to pull real ID3 tags (title, artist, picture)
  tryReadMetadata(song);

  if (autoPlay) {
    audio.play().then(() => {
      isPlaying = true;
      btnPlay.textContent = "⏸";
    }).catch(err => {
      console.warn("Playback failed (missing file or autoplay policy):", err);
      isPlaying = false;
      btnPlay.textContent = "▶";
    });
  }
}

/* ------------------------------------------------------------
   METADATA (ID3 tags) – optional, uses jsmediatags if loaded
   ------------------------------------------------------------ */
function tryReadMetadata(song) {
  if (typeof jsmediatags === "undefined") return;

  jsmediatags.read(song.file, {
    onSuccess: function(tag) {
      const tags = tag.tags;

      // Prefer real tags over filename
      if (tags.title) {
        song.title = tags.title;
        nowTitle.textContent = tags.title;
        // also update the list row
        const row = document.querySelector(`.track-row[data-index="${currentIndex}"] .track-title`);
        if (row) row.textContent = tags.title;
      }
      if (tags.artist) {
        song.artist = tags.artist;
        nowArtist.textContent = tags.artist;
        const row = document.querySelector(`.track-row[data-index="${currentIndex}"] .track-artist`);
        if (row) row.textContent = tags.artist;
      }

      // Album art
      if (tags.picture) {
        const { data, format } = tags.picture;
        let base64 = "";
        for (let i = 0; i < data.length; i++) {
          base64 += String.fromCharCode(data[i]);
        }
        const url = `data:${format};base64,${btoa(base64)}`;
        nowArt.innerHTML = `<img src="${url}" alt="cover" />`;
        nowArt.classList.add("has-art");
      }
    },
    onError: function() {
      // silent – filename fallback is fine
    }
  });
}

function resetArt() {
  nowArt.innerHTML = "♪";
  nowArt.classList.remove("has-art");
}

/* ------------------------------------------------------------
   CONTROLS
   ------------------------------------------------------------ */
function togglePlay() {
  if (!TRACKS[currentEra].songs.length) return;

  if (isPlaying) {
    audio.pause();
    isPlaying = false;
    btnPlay.textContent = "▶";
  } else {
    audio.play().then(() => {
      isPlaying = true;
      btnPlay.textContent = "⏸";
    }).catch(err => console.warn(err));
  }
}

function nextTrack() {
  const songs = TRACKS[currentEra].songs;
  if (!songs.length) return;

  // Find current position in playOrder, go to next
  let pos = playOrder.indexOf(currentIndex);
  if (pos === -1) pos = 0;
  const nextPos = (pos + 1) % playOrder.length;
  loadTrack(playOrder[nextPos], true);
}

function prevTrack() {
  const songs = TRACKS[currentEra].songs;
  if (!songs.length) return;

  // If more than 3s in, just restart current
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }

  let pos = playOrder.indexOf(currentIndex);
  if (pos === -1) pos = 0;
  const prevPos = (pos - 1 + playOrder.length) % playOrder.length;
  loadTrack(playOrder[prevPos], true);
}

/* ------------------------------------------------------------
   EVENT LISTENERS
   ------------------------------------------------------------ */
function setupEventListeners() {
  btnPlay.addEventListener("click", togglePlay);
  btnNext.addEventListener("click", nextTrack);
  btnPrev.addEventListener("click", prevTrack);
  btnShuffle.addEventListener("click", toggleShuffle);

  // Progress seek
  progressBar.addEventListener("click", (e) => {
    if (!audio.duration) return;
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * audio.duration;
  });

  // Time update + grab real duration once available
  audio.addEventListener("timeupdate", () => {
    if (!audio.duration) return;
    const percent = (audio.currentTime / audio.duration) * 100;
    progressFill.style.width = percent + "%";
    currentTimeEl.textContent = formatTime(audio.currentTime);
  });

  audio.addEventListener("loadedmetadata", () => {
    const dur = formatTime(audio.duration);
    durationEl.textContent = dur;
    // cache it on the song object so the list can show it later
    const song = TRACKS[currentEra].songs[currentIndex];
    if (song) {
      song.duration = dur;
      const row = document.querySelector(`.track-row[data-index="${currentIndex}"] .track-duration`);
      if (row) row.textContent = dur;
    }
  });

  audio.addEventListener("ended", nextTrack);

  // Volume
  volumeSlider.addEventListener("input", () => {
    audio.volume = volumeSlider.value;
    btnMute.textContent = audio.volume === 0 ? "🔇" : "🔊";
  });

  btnMute.addEventListener("click", () => {
    if (audio.volume > 0) {
      audio.dataset.prevVolume = audio.volume;
      audio.volume = 0;
      volumeSlider.value = 0;
      btnMute.textContent = "🔇";
    } else {
      const prev = parseFloat(audio.dataset.prevVolume || 0.8);
      audio.volume = prev;
      volumeSlider.value = prev;
      btnMute.textContent = "🔊";
    }
  });

  // Keyboard
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;
    if (e.code === "Space") {
      e.preventDefault();
      togglePlay();
    } else if (e.code === "ArrowRight") {
      nextTrack();
    } else if (e.code === "ArrowLeft") {
      prevTrack();
    } else if (e.code === "KeyS") {
      toggleShuffle();
    }
  });
}

/* ------------------------------------------------------------
   HELPERS
   ------------------------------------------------------------ */
function formatTime(seconds) {
  if (isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ------------------------------------------------------------
   START
   ------------------------------------------------------------ */
init();
